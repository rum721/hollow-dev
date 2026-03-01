/**
 * Voice Service — real implementation using expo-av.
 *
 * Recording  → expo-av Audio.Recording
 * STT        → OpenAI Whisper API
 * TTS        → OpenAI TTS API + expo-av Audio.Sound playback
 */

import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { apiFetch } from '../ai/apiFetch';

const WHISPER_API = 'https://api.openai.com/v1/audio/transcriptions';
const TTS_API = 'https://api.openai.com/v1/audio/speech';

export interface VoiceServiceConfig {
  openaiApiKey: string;
  conversationStyle?: string;
}

// TTS voice mapping based on conversation style
const VOICE_MAP: Record<string, string> = {
  empathetic: 'shimmer',  // 温暖、友好
  analytical: 'onyx',     // 沉稳、理性
  balanced: 'nova',       // 中性、自然
};

let currentRecording: Audio.Recording | null = null;

// --- Recording ---

export async function startRecording(): Promise<void> {
  // Request permissions
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Microphone permission denied');
  }

  // Configure audio mode for recording
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY,
  );
  currentRecording = recording;
}

export async function stopRecording(): Promise<string | null> {
  if (!currentRecording) return null;

  try {
    await currentRecording.stopAndUnloadAsync();
    const uri = currentRecording.getURI();
    currentRecording = null;

    // Restore audio mode for playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    return uri;
  } catch (e) {
    currentRecording = null;
    throw e;
  }
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

// --- TTS (Text-to-Speech) ---

export async function synthesizeSpeech(
  text: string,
  config: VoiceServiceConfig,
): Promise<Audio.Sound> {
  const voice = config.conversationStyle
    ? (VOICE_MAP[config.conversationStyle] || 'shimmer')
    : 'shimmer';

  const res = await apiFetch(TTS_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice,
      response_format: 'mp3',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS API error: ${res.status} - ${err}`);
  }

  // Convert response to a local file URI for playback
  const arrayBuffer = await res.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  const dataUri = `data:audio/mp3;base64,${base64}`;

  const { sound } = await Audio.Sound.createAsync({ uri: dataUri });
  return sound;
}

// --- Helpers ---

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // React Native global btoa
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  // Fallback for environments without btoa
  return Buffer.from(buffer).toString('base64');
}

// --- Cleanup ---

export function cleanup() {
  if (currentRecording) {
    currentRecording.stopAndUnloadAsync().catch(() => {});
    currentRecording = null;
  }
}
