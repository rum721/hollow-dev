import { create } from 'zustand';

interface AuthState {
  isOnboarded: boolean;
  setOnboarded: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isOnboarded: false,
  setOnboarded: (isOnboarded) => set({ isOnboarded }),
}));
