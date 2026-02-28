import { create } from 'zustand';

export type VoiceState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'processing'
  | 'speaking';

interface VoiceStoreState {
  voiceState: VoiceState;
  sessionSeconds: number;
  meteringValue: number;
  transcript: string;
  aiResponse: string;
  error: string | null;

  setVoiceState: (state: VoiceState) => void;
  setSessionSeconds: (seconds: number) => void;
  setMeteringValue: (value: number) => void;
  setTranscript: (text: string) => void;
  setAiResponse: (text: string) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceStoreState>((set) => ({
  voiceState: 'idle',
  sessionSeconds: 0,
  meteringValue: -60,
  transcript: '',
  aiResponse: '',
  error: null,

  setVoiceState: (voiceState) => set({ voiceState }),
  setSessionSeconds: (sessionSeconds) => set({ sessionSeconds }),
  setMeteringValue: (meteringValue) => set({ meteringValue }),
  setTranscript: (transcript) => set({ transcript }),
  setAiResponse: (aiResponse) => set({ aiResponse }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      voiceState: 'idle',
      sessionSeconds: 0,
      meteringValue: -60,
      transcript: '',
      aiResponse: '',
      error: null,
    }),
}));
