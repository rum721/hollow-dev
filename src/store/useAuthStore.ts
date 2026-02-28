import { create } from 'zustand';
import { Platform } from 'react-native';

interface AuthState {
  isOnboarded: boolean;
  isLoaded: boolean;
  loadAuth: () => Promise<void>;
  setOnboarded: (val: boolean) => void;
}

async function loadOnboarded(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return localStorage.getItem('hollow_onboarded') === 'true';
  }
  try {
    const SecureStore = await import('expo-secure-store');
    const val = await SecureStore.getItemAsync('hollow_onboarded');
    return val === 'true';
  } catch { return false; }
}

async function saveOnboarded(val: boolean): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem('hollow_onboarded', String(val));
    return;
  }
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync('hollow_onboarded', String(val));
  } catch {}
}

export const useAuthStore = create<AuthState>((set) => ({
  isOnboarded: false,
  isLoaded: false,

  loadAuth: async () => {
    const isOnboarded = await loadOnboarded();
    set({ isOnboarded, isLoaded: true });
  },

  setOnboarded: (isOnboarded) => {
    set({ isOnboarded });
    saveOnboarded(isOnboarded);
  },
}));
