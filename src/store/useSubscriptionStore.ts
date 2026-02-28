import { create } from 'zustand';
import type { SubscriptionTier } from '../types/subscription';
import { TIER_CONFIG } from '../types/subscription';
import * as usageRepo from '../services/storage/usageRepo';
import * as settingsRepo from '../services/storage/settingsRepo';

// In dev mode, default to premium with no limits
const IS_DEV = __DEV__;
const DEV_DEFAULT_TIER: SubscriptionTier = 'premium';

interface SubscriptionState {
  tier: SubscriptionTier;
  todayUsage: number;
  isLoaded: boolean;

  loadSubscription: () => Promise<void>;
  setTier: (tier: SubscriptionTier) => void;
  canSendMessage: () => boolean;
  getRemainingMessages: () => number;
  incrementUsage: () => Promise<void>;
  refreshUsage: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: IS_DEV ? DEV_DEFAULT_TIER : 'free',
  todayUsage: 0,
  isLoaded: false,

  loadSubscription: async () => {
    try {
      const savedTier = await settingsRepo.getSetting('subscription_tier');
      const todayUsage = IS_DEV ? 0 : await usageRepo.getTodayUsage();
      set({
        tier: IS_DEV ? DEV_DEFAULT_TIER : ((savedTier as SubscriptionTier) ?? 'free'),
        todayUsage,
        isLoaded: true,
      });
    } catch {
      set({ isLoaded: true });
    }
  },

  setTier: (tier) => {
    set({ tier });
    settingsRepo.setSetting('subscription_tier', tier).catch(() => {});
  },

  canSendMessage: () => {
    if (IS_DEV) return true; // No limits in dev mode
    const { tier, todayUsage } = get();
    const config = TIER_CONFIG[tier];
    return todayUsage < config.dailyLimit;
  },

  getRemainingMessages: () => {
    if (IS_DEV) return Infinity; // Unlimited in dev mode
    const { tier, todayUsage } = get();
    const config = TIER_CONFIG[tier];
    if (config.dailyLimit === Infinity) return Infinity;
    return Math.max(0, config.dailyLimit - todayUsage);
  },

  incrementUsage: async () => {
    try {
      const newCount = await usageRepo.incrementTodayUsage();
      set({ todayUsage: newCount });
    } catch {}
  },

  refreshUsage: async () => {
    try {
      const todayUsage = await usageRepo.getTodayUsage();
      set({ todayUsage });
    } catch {}
  },
}));
