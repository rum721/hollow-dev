/**
 * Voice Service — real implementation using expo-audio.
 *
 * Recording  → expo-audio AudioRecorder
 * STT        → OpenAI Whisper API
 * TTS        → OpenAI TTS API + expo-audio AudioPlayer playback
 */

import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  createAudioPlayer,
  RecordingPresets,
  AudioModule,
} from 'expo-audio';
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

let currentRecorder: InstanceType<typeof AudioModule.AudioRecorder> | null = null;
let currentPlayer: ReturnType<typeof createAudioPlayer> | null = null;

// --- Recording ---

export async function startRecording(): Promise<void> {
  // Request permissions
  const { status } = await requestRecordingPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Microphone permission denied');
  }

  // Configure audio mode for recording
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
  });

  // Create and prepare recorder
  const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
  await recorder.prepareToRecordAsync();
  recorder.record();
  currentRecorder = recorder;
}

export async function stopRecording(): Promise<string | null> {
  if (!currentRecorder) return null;

  try {
    await currentRecorder.stop();
    const uri = currentRecorder.uri;
    currentRecorder = null;

    // Restore audio mode for playback
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    });

    return uri;
  } catch (e) {
    currentRecorder = null;
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
): Promise<ReturnType<typeof createAudioPlayer>> {
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

  // Convert response to base64 data URI for playback
  const arrayBuffer = await res.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  const dataUri = `data:audio/mp3;base64,${base64}`;

  // Clean up previous player if any
  if (currentPlayer) {
    try { currentPlayer.remove(); } catch {}
    currentPlayer = null;
  }

  const player = createAudioPlayer(dataUri);
  currentPlayer = player;
  return player;
}

// --- Helpers ---

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  return Buffer.from(buffer).toString('base64');
}

// --- Cleanup ---

export function cleanup() {
  if (currentRecorder) {
    try { currentRecorder.stop(); } catch {}
    currentRecorder = null;
  }
  if (currentPlayer) {
    try { currentPlayer.remove(); } catch {}
    currentPlayer = null;
  }
}
