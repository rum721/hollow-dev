import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import { randomUUID } from 'expo-crypto';
import { encryptText, decryptText } from '../storage/encryption';
import { logError } from '../../utils/errorLogger';
import type { ImageAttachment } from '../../types/chat';

const IMAGE_DIR = `${documentDirectory}hollow-images/`;
const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.7;

// ── Directory setup ──

async function ensureImageDir(): Promise<void> {
  const info = await getInfoAsync(IMAGE_DIR);
  if (!info.exists) {
    await makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
}

// ── Pick from library ──

export async function pickImageFromLibrary(): Promise<ImageAttachment | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets[0]) return null;
  return processAndSaveImage(result.assets[0]);
}

// ── Take photo ──

export async function takePhoto(): Promise<ImageAttachment | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    quality: 1,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets[0]) return null;
  return processAndSaveImage(result.assets[0]);
}

// ── Process: resize + compress + encrypt + save to app directory ──

async function processAndSaveImage(
  asset: ImagePicker.ImagePickerAsset,
): Promise<ImageAttachment> {
  const { width, height } = asset;

  // Calculate resize dimensions (scale down to MAX_DIMENSION)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);

  // Resize and compress to JPEG (ImageManipulator strips EXIF metadata on resize)
  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: newWidth, height: newHeight } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );

  // Read the compressed image as base64
  const base64Data = await readAsStringAsync(manipulated.uri, {
    encoding: EncodingType.Base64,
  });

  // Encrypt the base64 content and save as .enc file
  await ensureImageDir();
  const filename = `${randomUUID()}.enc`;
  const destUri = `${IMAGE_DIR}${filename}`;
  const encrypted = await encryptText(base64Data);
  await writeAsStringAsync(destUri, encrypted, {
    encoding: EncodingType.UTF8,
  });

  // Clean up the temp manipulated file
  await deleteAsync(manipulated.uri, { idempotent: true }).catch(() => {});

  return {
    uri: destUri,
    width: newWidth,
    height: newHeight,
    mimeType: 'image/jpeg',
  };
}

// ── Load base64 from encrypted file (on demand for API calls) ──

export async function loadImageBase64(uri: string): Promise<string> {
  // Encrypted files (.enc): read UTF-8 ciphertext → decrypt → raw base64
  if (uri.endsWith('.enc')) {
    const encrypted = await readAsStringAsync(uri, {
      encoding: EncodingType.UTF8,
    });
    return await decryptText(encrypted);
  }
  // Legacy unencrypted files (.jpg): read directly as base64
  return await readAsStringAsync(uri, {
    encoding: EncodingType.Base64,
  });
}

// ── Get displayable data URI (for Image component rendering) ──

export async function getDisplayUri(uri: string, mimeType: string = 'image/jpeg'): Promise<string> {
  const base64 = await loadImageBase64(uri);
  return `data:${mimeType};base64,${base64}`;
}

// ── Delete image file (cleanup) ──

export async function deleteImageFile(uri: string): Promise<void> {
  try {
    await deleteAsync(uri, { idempotent: true });
  } catch (e) {
    logError('image', 'deleteImageFile')(e);
  }
}
