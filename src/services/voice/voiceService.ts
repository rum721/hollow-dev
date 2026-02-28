import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { apiFetch } from '../ai/apiFetch';

const WHISPER_API = 'https://api.openai.com/v1/audio/transcriptions';
const TTS_API = 'https://api.openai.com/v1/audio/speech';

export interface VoiceServiceConfig {
  openaiApiKey: string;
}

// --- Recording ---
let recording: Audio.Recording | null = null;

export async function startRecording(): Promise<void> {
  await Audio.requestPermissionsAsync();
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording: rec } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY,
  );
  recording = rec;
}

export async function stopRecording(): Promise<string | null> {
  if (!recording) return null;
  await recording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  const uri = recording.getURI();
  recording = null;
  return uri;
}

// --- Whisper ASR (Speech-to-Text) ---
export async function transcribeAudio(
  audioUri: string,
  config: VoiceServiceConfig,
  language?: string,
): Promise<string> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    // On web, fetch the blob from the URI
    const response = await fetch(audioUri);
    const blob = await response.blob();
    formData.append('file', blob, 'audio.webm');
  } else {
    // On native, use the file URI directly
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'audio.m4a',
    } as any);
  }

  formData.append('model', 'whisper-1');
  // Pass language hint if available; otherwise let Whisper auto-detect
  if (language === 'zh' || language === 'en') {
    formData.append('language', language);
  }
  // When language is 'auto' or undefined, omit the param for auto-detection

  const res = await apiFetch(WHISPER_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      // Note: do NOT set Content-Type for FormData — the browser/runtime sets it
      // with the correct boundary automatically.
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
  const res = await apiFetch(TTS_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: 'shimmer', // Warm, friendly voice
      response_format: 'mp3',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS API error: ${res.status} - ${err}`);
  }

  const blob = await res.blob();

  if (Platform.OS === 'web') {
    // On web, create an object URL and play from that
    const url = URL.createObjectURL(blob);
    const { sound } = await Audio.Sound.createAsync({ uri: url });
    return sound;
  } else {
    // On native, write blob to a temp file and play
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const FileSystem = require('expo-file-system');
    const fileUri = FileSystem.cacheDirectory + 'tts_response.mp3';
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
    return sound;
  }
}

// --- Cleanup ---
export function cleanup() {
  if (recording) {
    recording.stopAndUnloadAsync().catch(() => {});
    recording = null;
  }
}
