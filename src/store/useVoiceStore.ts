import { create } from 'zustand';

type VoiceState = 'idle' | 'recording' | 'processing' | 'speaking';

interface VoiceStoreState {
  voiceState: VoiceState;
  sessionSeconds: number;
  meteringValue: number;

  setVoiceState: (state: VoiceState) => void;
  setSessionSeconds: (seconds: number) => void;
  setMeteringValue: (value: number) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceStoreState>((set) => ({
  voiceState: 'idle',
  sessionSeconds: 0,
  meteringValue: -60,

  setVoiceState: (voiceState) => set({ voiceState }),
  setSessionSeconds: (sessionSeconds) => set({ sessionSeconds }),
  setMeteringValue: (meteringValue) => set({ meteringValue }),
  reset: () => set({ voiceState: 'idle', sessionSeconds: 0, meteringValue: -60 }),
}));
