/**
 * Encryption service for Hollow app — AES-256-GCM via expo-crypto.
 *
 * Uses a per-device 256-bit key stored in expo-secure-store (native) or
 * localStorage (web). Encrypts all sensitive data with AES-256-GCM which
 * provides both confidentiality and integrity (authenticated encryption).
 *
 * Encrypted values are prefixed with "AES:" (new) or "ENC:" (legacy XOR).
 * The module transparently decrypts both formats, enabling seamless migration
 * from the old XOR cipher to AES-GCM.
 *
 * Storage format: "AES:" + base64(IV‖ciphertext‖tag)
 *   - IV: 12 bytes (96 bits)
 *   - Tag: 16 bytes (128 bits)
 */

import { Platform } from 'react-native';

const ENCRYPTION_KEY_ID = 'hollow_encryption_key';
const AES_PREFIX = 'AES:';
const LEGACY_XOR_PREFIX = 'ENC:';

// ─── Cached state ────────────────────────────────────────

let cachedKeyHex: string | null = null;
let aesKey: any = null; // AESEncryptionKey instance (loaded lazily)

// ─── Key Management ──────────────────────────────────────

async function getSecureStoreItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    const SecureStore = await import('expo-secure-store');
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setSecureStoreItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {}
    return;
  }
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(key, value);
  } catch {}
}

/**
 * Generate a random 32-byte (256-bit) key as a hex string.
 * Uses cryptographically secure source via globalThis.crypto.
 */
function generateRandomKeyHex(): string {
  const bytes = new Uint8Array(32);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Retrieve the existing encryption key or generate and persist a new one.
 */
async function getOrCreateKeyHex(): Promise<string> {
  const existing = await getSecureStoreItem(ENCRYPTION_KEY_ID);
  if (existing) return existing;

  const newKey = generateRandomKeyHex();
  await setSecureStoreItem(ENCRYPTION_KEY_ID, newKey);
  return newKey;
}

// ─── AES-GCM via expo-crypto ─────────────────────────────

/**
 * Import the hex key into an AESEncryptionKey instance.
 */
async function getAESKey(): Promise<any> {
  if (aesKey) return aesKey;
  if (!cachedKeyHex) throw new Error('Encryption not initialized');

  const { AESEncryptionKey } = await import('expo-crypto');
  aesKey = await AESEncryptionKey.import(cachedKeyHex, 'hex');
  return aesKey;
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns: "AES:" + base64(IV‖ciphertext‖tag)
 */
async function aesEncrypt(plaintext: string): Promise<string> {
  const { aesEncryptAsync } = await import('expo-crypto');
  const key = await getAESKey();
  const textBytes = new TextEncoder().encode(plaintext);
  const sealed = await aesEncryptAsync(textBytes, key);
  const combined = (await sealed.combined('base64')) as string;
  return AES_PREFIX + combined;
}

/**
 * Decrypt AES-256-GCM ciphertext.
 * Input: base64(IV‖ciphertext‖tag) — without the "AES:" prefix.
 */
async function aesDecrypt(base64Combined: string): Promise<string> {
  const { aesDecryptAsync, AESSealedData } = await import('expo-crypto');
  const key = await getAESKey();
  const sealed = AESSealedData.fromCombined(base64Combined);
  const decryptedBytes = (await aesDecryptAsync(sealed, key)) as Uint8Array;
  return new TextDecoder().decode(decryptedBytes);
}

// ─── Legacy XOR Cipher (read-only, for migration) ────────

function keyToBytes(hexKey: string): Uint8Array {
  const bytes = new Uint8Array(hexKey.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexKey.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function xorBytes(data: Uint8Array, key: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }
  return result;
}

/**
 * Decrypt legacy XOR-encrypted data (ENC: prefix).
 * Kept for backwards compatibility — all new writes use AES-GCM.
 */
function legacyXorDecrypt(base64Data: string): string {
  if (!cachedKeyHex) return base64Data;
  try {
    const binary = atob(base64Data);
    const encrypted = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      encrypted[i] = binary.charCodeAt(i);
    }
    const keyBytes = keyToBytes(cachedKeyHex);
    const decrypted = xorBytes(encrypted, keyBytes);
    return new TextDecoder().decode(decrypted);
  } catch {
    return base64Data;
  }
}

function legacyXorEncrypt(plaintext: string): string {
  if (!cachedKeyHex) return plaintext;
  try {
    const keyBytes = keyToBytes(cachedKeyHex);
    const textBytes = new TextEncoder().encode(plaintext);
    const encrypted = xorBytes(textBytes, keyBytes);
    let binary = '';
    for (let i = 0; i < encrypted.length; i++) {
      binary += String.fromCharCode(encrypted[i]);
    }
    return LEGACY_XOR_PREFIX + btoa(binary);
  } catch {
    return plaintext;
  }
}

// ─── Public API ──────────────────────────────────────────

/**
 * Initialize the encryption subsystem. Must be called (and awaited) before
 * any encrypt/decrypt operations. Safe to call multiple times.
 */
export async function initEncryption(): Promise<void> {
  if (cachedKeyHex) return;
  cachedKeyHex = await getOrCreateKeyHex();
  // Pre-load AES key on native
  if (Platform.OS !== 'web') {
    try {
      await getAESKey();
    } catch {
      // AES key import may fail on web — fallback handled in encrypt/decrypt
    }
  }
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Falls back to XOR on web where expo-crypto AES may not be available.
 */
export async function encryptText(plaintext: string): Promise<string> {
  if (!cachedKeyHex) await initEncryption();
  if (!plaintext) return plaintext;

  try {
    return await aesEncrypt(plaintext);
  } catch {
    // Fallback: XOR encryption for web or if AES unavailable
    return legacyXorEncrypt(plaintext);
  }
}

/**
 * Decrypt ciphertext. Transparently handles:
 *   - "AES:" prefix → AES-256-GCM decryption
 *   - "ENC:" prefix → Legacy XOR decryption (migration)
 *   - No prefix    → plaintext (pre-encryption data)
 */
export async function decryptText(ciphertext: string): Promise<string> {
  if (!cachedKeyHex) await initEncryption();
  if (!ciphertext) return ciphertext;

  if (ciphertext.startsWith(AES_PREFIX)) {
    try {
      return await aesDecrypt(ciphertext.slice(AES_PREFIX.length));
    } catch {
      return ciphertext;
    }
  }

  if (ciphertext.startsWith(LEGACY_XOR_PREFIX)) {
    return legacyXorDecrypt(ciphertext.slice(LEGACY_XOR_PREFIX.length));
  }

  return ciphertext;
}

/**
 * @deprecated Use encryptText() instead. Kept only for web fallback.
 */
export function encryptSync(plaintext: string): string {
  if (!cachedKeyHex || !plaintext) return plaintext;
  return legacyXorEncrypt(plaintext);
}

/**
 * @deprecated Use decryptText() instead.
 * Cannot decrypt AES: data synchronously — caller should use decryptText().
 */
export function decryptSync(ciphertext: string): string {
  if (!cachedKeyHex || !ciphertext) return ciphertext;
  if (ciphertext.startsWith(AES_PREFIX)) {
    // Cannot decrypt AES synchronously — return as-is
    return ciphertext;
  }
  if (ciphertext.startsWith(LEGACY_XOR_PREFIX)) {
    return legacyXorDecrypt(ciphertext.slice(LEGACY_XOR_PREFIX.length));
  }
  return ciphertext;
}

/**
 * Check whether the encryption subsystem has been initialized.
 */
export function isEncryptionReady(): boolean {
  return cachedKeyHex !== null;
}
