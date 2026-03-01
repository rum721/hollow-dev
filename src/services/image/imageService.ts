import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  copyAsync,
  readAsStringAsync,
  deleteAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import { randomUUID } from 'expo-crypto';
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

// ── Process: resize + compress + save to app directory ──

async function processAndSaveImage(
  asset: ImagePicker.ImagePickerAsset,
): Promise<ImageAttachment> {
  const { width, height } = asset;

  // Calculate resize dimensions (scale down to MAX_DIMENSION)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);

  // Resize and compress to JPEG
  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: newWidth, height: newHeight } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );

  // Save to persistent app directory
  await ensureImageDir();
  const filename = `${randomUUID()}.jpg`;
  const destUri = `${IMAGE_DIR}${filename}`;
  await copyAsync({ from: manipulated.uri, to: destUri });

  return {
    uri: destUri,
    width: newWidth,
    height: newHeight,
    mimeType: 'image/jpeg',
  };
}

// ── Load base64 from URI (on demand for API calls — NOT persisted) ──

export async function loadImageBase64(uri: string): Promise<string> {
  return await readAsStringAsync(uri, {
    encoding: EncodingType.Base64,
  });
}

// ── Delete image file (cleanup) ──

export async function deleteImageFile(uri: string): Promise<void> {
  try {
    await deleteAsync(uri, { idempotent: true });
  } catch {
    // Non-fatal
  }
}
