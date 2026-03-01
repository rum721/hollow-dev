/**
 * Voice Service — real implementation using expo-audio.
 *
 * Recording  → expo-audio AudioRecorder
 * STT        → OpenAI Whisper API
 * TTS        → OpenAI TTS API + expo-audio AudioPlayer playback
 */

import {
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
  createAudioPlayer,
  RecordingPresets,
  AudioModule,
} from 'expo-audio';
import { Platform, Linking } from 'react-native';
import { apiFetch } from '../ai/apiFetch';
import { classifyApiError } from '../ai/apiErrorClassifier';

const WHISPER_API = 'https://api.openai.com/v1/audio/transcriptions';
const TTS_API = 'https://api.openai.com/v1/audio/speech';

/** Typed error codes for voice permission issues */
export type VoiceErrorCode =
  | 'PERMISSION_DENIED'       // User denied mic permission
  | 'PERMISSION_RESTRICTED'   // System-level restriction (e.g., parental controls)
  | 'DEVICE_UNSUPPORTED'      // Device has no microphone
  | 'API_KEY_MISSING'         // No OpenAI API key
  | 'API_ERROR'               // Whisper/TTS API error
  | 'RECORDING_ERROR';        // Generic recording failure

export class VoiceError extends Error {
  code: VoiceErrorCode;
  constructor(code: VoiceErrorCode, message: string) {
    super(message);
    this.name = 'VoiceError';
    this.code = code;
  }
}

export interface VoiceServiceConfig {
  openaiApiKey: string;
  conversationStyle?: string;
}

/**
 * Check microphone permission status without requesting it.
 * Returns 'granted', 'denied', or 'undetermined'.
 */
export async function checkMicrophonePermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  try {
    const { status, canAskAgain } = await getRecordingPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (!canAskAgain) return 'denied'; // permanently denied
    return 'undetermined';
  } catch {
    return 'undetermined';
  }
}

/**
 * Open system settings so user can re-enable microphone permission.
 */
export function openMicrophoneSettings(): void {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else if (Platform.OS === 'android') {
    Linking.openSettings();
  }
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
  // Request permissions with structured error
  const { status, canAskAgain } = await requestRecordingPermissionsAsync();
  if (status !== 'granted') {
    if (!canAskAgain) {
      throw new VoiceError(
        'PERMISSION_DENIED',
        '麦克风权限已被拒绝，请在系统设置中手动开启',
      );
    }
    throw new VoiceError(
      'PERMISSION_DENIED',
      '需要麦克风权限才能使用语音功能',
    );
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
    const errBody = await res.text().catch(() => '');
    const classified = classifyApiError(res.status, errBody);
    throw new VoiceError('API_ERROR', classified.message);
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
    const errBody = await res.text().catch(() => '');
    const classified = classifyApiError(res.status, errBody);
    throw new VoiceError('API_ERROR', classified.message);
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
