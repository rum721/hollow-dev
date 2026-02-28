/**
 * Encryption service for Hollow app.
 *
 * Uses a per-device key stored in expo-secure-store (native) or localStorage (web).
 * Applies a repeating-key XOR cipher with Base64 encoding as an MVP encryption layer.
 * Encrypted values are prefixed with "ENC:" so we can distinguish them from plaintext
 * (important for migrating existing unencrypted data).
 *
 * For production, replace the XOR cipher with AES-256-GCM via a native crypto module.
 */

import { Platform } from 'react-native';

const ENCRYPTION_KEY_ID = 'hollow_encryption_key';
const ENCRYPTED_PREFIX = 'ENC:';

// Cached key so that sync encrypt/decrypt is possible after initialization
let cachedKey: string | null = null;

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
 * Uses Math.random as a fallback when crypto APIs are unavailable.
 */
function generateRandomKey(): string {
  const bytes = new Uint8Array(32);

  // Try to use a cryptographically secure source
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    // Fallback for environments without Web Crypto
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
async function getOrCreateKey(): Promise<string> {
  const existing = await getSecureStoreItem(ENCRYPTION_KEY_ID);
  if (existing) return existing;

  const newKey = generateRandomKey();
  await setSecureStoreItem(ENCRYPTION_KEY_ID, newKey);
  return newKey;
}

// ─── Base64 helpers (works in both RN and web) ───────────

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa is available in React Native and modern web
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── XOR Cipher ──────────────────────────────────────────

/**
 * Convert a hex key string into bytes for XOR operations.
 */
function keyToBytes(hexKey: string): Uint8Array {
  const bytes = new Uint8Array(hexKey.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexKey.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * XOR each byte of data with the corresponding byte of the key (cycling).
 */
function xorBytes(data: Uint8Array, key: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }
  return result;
}

/**
 * Encode a string to UTF-8 bytes.
 */
function stringToUtf8Bytes(str: string): Uint8Array {
  // TextEncoder is available in RN and modern browsers
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  // Fallback: only handles ASCII + basic multi-byte via manual encoding
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      // Surrogate pair
      i++;
      const cp = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Decode UTF-8 bytes back to a string.
 */
function utf8BytesToString(bytes: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder().decode(bytes);
  }
  // Fallback
  let result = '';
  let i = 0;
  while (i < bytes.length) {
    const byte = bytes[i];
    if (byte < 0x80) {
      result += String.fromCharCode(byte);
      i++;
    } else if ((byte & 0xe0) === 0xc0) {
      result += String.fromCharCode(((byte & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
      i += 2;
    } else if ((byte & 0xf0) === 0xe0) {
      result += String.fromCharCode(
        ((byte & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f),
      );
      i += 3;
    } else {
      const cp =
        ((byte & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      // Convert code point to surrogate pair
      const adjusted = cp - 0x10000;
      result += String.fromCharCode(0xd800 + (adjusted >> 10), 0xdc00 + (adjusted & 0x3ff));
      i += 4;
    }
  }
  return result;
}

// ─── Public API ──────────────────────────────────────────

/**
 * Initialize the encryption subsystem. Must be called (and awaited) before
 * any sync encrypt/decrypt operations. Safe to call multiple times.
 */
export async function initEncryption(): Promise<void> {
  if (cachedKey) return;
  cachedKey = await getOrCreateKey();
}

/**
 * Encrypt plaintext asynchronously. Initializes the key if needed.
 */
export async function encryptText(plaintext: string): Promise<string> {
  if (!cachedKey) await initEncryption();
  return encryptSync(plaintext);
}

/**
 * Decrypt ciphertext asynchronously. Initializes the key if needed.
 * Returns the original string if the value is not encrypted (no ENC: prefix).
 */
export async function decryptText(ciphertext: string): Promise<string> {
  if (!cachedKey) await initEncryption();
  return decryptSync(ciphertext);
}

/**
 * Encrypt plaintext synchronously. Requires initEncryption() to have been called.
 * Returns the plaintext unchanged if no key is available (graceful degradation).
 */
export function encryptSync(plaintext: string): string {
  if (!cachedKey || !plaintext) return plaintext;
  try {
    const keyBytes = keyToBytes(cachedKey);
    const textBytes = stringToUtf8Bytes(plaintext);
    const encrypted = xorBytes(textBytes, keyBytes);
    return ENCRYPTED_PREFIX + uint8ToBase64(encrypted);
  } catch {
    // If encryption fails for any reason, return plaintext rather than losing data
    return plaintext;
  }
}

/**
 * Decrypt ciphertext synchronously. Requires initEncryption() to have been called.
 * Returns the input unchanged if it does not have the ENC: prefix (handles
 * pre-existing unencrypted data seamlessly).
 */
export function decryptSync(ciphertext: string): string {
  if (!cachedKey || !ciphertext) return ciphertext;
  // If the value was never encrypted, return as-is (migration-friendly)
  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) return ciphertext;
  try {
    const b64 = ciphertext.slice(ENCRYPTED_PREFIX.length);
    const encrypted = base64ToUint8(b64);
    const keyBytes = keyToBytes(cachedKey);
    const decrypted = xorBytes(encrypted, keyBytes);
    return utf8BytesToString(decrypted);
  } catch {
    // If decryption fails, return the raw value so the app doesn't crash
    return ciphertext;
  }
}

/**
 * Check whether the encryption subsystem has been initialized.
 */
export function isEncryptionReady(): boolean {
  return cachedKey !== null;
}
