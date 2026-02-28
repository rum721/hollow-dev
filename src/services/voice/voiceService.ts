/**
 * Voice Service — stubbed for v1.0 TestFlight.
 *
 * expo-av has a known EXEventEmitter.h incompatibility with Expo SDK 55's
 * ExpoModulesCore. All functions throw a "not available" error until the
 * upstream fix lands, at which point we reinstall expo-av and restore the
 * real implementation.
 */

import { Platform } from 'react-native';
import { apiFetch } from '../ai/apiFetch';

const WHISPER_API = 'https://api.openai.com/v1/audio/transcriptions';
const TTS_API = 'https://api.openai.com/v1/audio/speech';

export interface VoiceServiceConfig {
  openaiApiKey: string;
}

const UNAVAILABLE_MSG =
  'Voice mode is not available in this build. It will be enabled in a future update.';

// --- Recording (stubbed) ---
export async function startRecording(): Promise<void> {
  throw new Error(UNAVAILABLE_MSG);
}

export async function stopRecording(): Promise<string | null> {
  throw new Error(UNAVAILABLE_MSG);
}

// --- Whisper ASR (Speech-to-Text) ---
export async function transcribeAudio(
  audioUri: string,
  config: VoiceServiceConfig,
  language?: string,
): Promise<string> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const response = await fetch(audioUri);
    const blob = await response.blob();
    formData.append('file', blob, 'audio.webm');
  } else {
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'audio.m4a',
    } as any);
  }

  formData.append('model', 'whisper-1');
  if (language === 'zh' || language === 'en') {
    formData.append('language', language);
  }

  const res = await apiFetch(WHISPER_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.text || '';
}

// --- TTS (Text-to-Speech) (stubbed) ---
export async function synthesizeSpeech(
  _text: string,
  _config: VoiceServiceConfig,
): Promise<any> {
  throw new Error(UNAVAILABLE_MSG);
}

// --- Cleanup ---
export function cleanup() {
  // no-op while stubbed
}
