import { create } from 'zustand';
import { Platform } from 'react-native';
import type { ConversationStyle, LanguageSetting, AutoDestructDays } from '../types/settings';
import * as settingsRepo from '../services/storage/settingsRepo';

interface SettingsState {
  nickname: string;
  conversationStyle: ConversationStyle;
  selectedModel: string;
  responseStyleValue: number;
  biometricEnabled: boolean;
  language: LanguageSetting;
  autoDestructDays: AutoDestructDays;
  apiKeys: Record<string, string>;
  isLoaded: boolean;

  loadSettings: () => Promise<void>;
  setNickname: (name: string) => void;
  setConversationStyle: (style: ConversationStyle) => void;
  setSelectedModel: (model: string) => void;
  setResponseStyleValue: (value: number) => void;
  setBiometricEnabled: (enabled: boolean) => void;
  setLanguage: (lang: LanguageSetting) => void;
  setAutoDestructDays: (days: AutoDestructDays) => void;
  setApiKey: (field: string, key: string) => void;
}

async function loadApiKeys(): Promise<Record<string, string>> {
  if (Platform.OS === 'web') {
    try {
      const raw = localStorage.getItem('hollow_api_keys');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }
  try {
    const SecureStore = await import('expo-secure-store');
    const raw = await SecureStore.getItemAsync('hollow_api_keys');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveApiKeys(keys: Record<string, string>): Promise<void> {
  const json = JSON.stringify(keys);
  if (Platform.OS === 'web') {
    try { localStorage.setItem('hollow_api_keys', json); } catch {}
    return;
  }
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync('hollow_api_keys', json);
  } catch {}
}

function persist(key: string, value: string) {
  settingsRepo.setSetting(key, value).catch(() => {});
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  nickname: '',
  conversationStyle: 'empathetic',
  selectedModel: 'claude-opus-4-6',
  responseStyleValue: 50,
  biometricEnabled: false,
  language: 'auto',
  autoDestructDays: null,
  apiKeys: {},
  isLoaded: false,

  loadSettings: async () => {
    try {
      const all = await settingsRepo.getAllSettings();
      const apiKeys = await loadApiKeys();
      const parsedAutoDestruct = all.autoDestructDays ? Number(all.autoDestructDays) as AutoDestructDays : null;
      set({
        nickname: all.nickname ?? '',
        conversationStyle: (all.conversationStyle as ConversationStyle) ?? 'empathetic',
        selectedModel: all.selectedModel ?? 'claude-opus-4-6',
        responseStyleValue: all.responseStyleValue ? Number(all.responseStyleValue) : 50,
        biometricEnabled: all.biometricEnabled === 'true',
        language: (all.language as LanguageSetting) ?? 'auto',
        autoDestructDays: parsedAutoDestruct,
        apiKeys,
        isLoaded: true,
      });
    } catch {
      set({ isLoaded: true });
    }
  },

  setNickname: (nickname) => { set({ nickname }); persist('nickname', nickname); },
  setConversationStyle: (conversationStyle) => { set({ conversationStyle }); persist('conversationStyle', conversationStyle); },
  setSelectedModel: (selectedModel) => { set({ selectedModel }); persist('selectedModel', selectedModel); },
  setResponseStyleValue: (responseStyleValue) => { set({ responseStyleValue }); persist('responseStyleValue', String(responseStyleValue)); },
  setBiometricEnabled: (biometricEnabled) => { set({ biometricEnabled }); persist('biometricEnabled', String(biometricEnabled)); },
  setLanguage: (language) => { set({ language }); persist('language', language); },
  setAutoDestructDays: (autoDestructDays) => {
    set({ autoDestructDays });
    if (autoDestructDays === null) {
      settingsRepo.deleteSetting('autoDestructDays').catch(() => {});
    } else {
      persist('autoDestructDays', String(autoDestructDays));
    }
  },
  setApiKey: (field, key) => {
    const apiKeys = { ...get().apiKeys, [field]: key };
    set({ apiKeys });
    saveApiKeys(apiKeys);
  },
}));
