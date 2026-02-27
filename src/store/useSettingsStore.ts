import { create } from 'zustand';
import type { ConversationStyle, LanguageSetting } from '../types/settings';

interface SettingsState {
  nickname: string;
  conversationStyle: ConversationStyle;
  selectedModel: string;
  responseStyleValue: number;
  biometricEnabled: boolean;
  language: LanguageSetting;
  apiKeys: Record<string, string>;

  setNickname: (name: string) => void;
  setConversationStyle: (style: ConversationStyle) => void;
  setSelectedModel: (model: string) => void;
  setResponseStyleValue: (value: number) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setLanguage: (lang: LanguageSetting) => void;
  setApiKey: (field: string, key: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  nickname: '',
  conversationStyle: 'empathetic',
  selectedModel: 'claude-opus-4-6',
  responseStyleValue: 50,
  biometricEnabled: false,
  language: 'auto',
  apiKeys: {},

  setNickname: (nickname) => set({ nickname }),
  setConversationStyle: (conversationStyle) => set({ conversationStyle }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setResponseStyleValue: (responseStyleValue) => set({ responseStyleValue }),
  setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
  setLanguage: (language) => set({ language }),
  setApiKey: (field, key) =>
    set((state) => ({ apiKeys: { ...state.apiKeys, [field]: key } })),
}));
