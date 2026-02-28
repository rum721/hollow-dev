export type SubscriptionTier = 'free' | 'lite' | 'vip' | 'premium';

export interface TierConfig {
  dailyLimit: number;
  model: string;
  dataOwnership: 'platform' | 'user';
  price: number;
  annualPrice?: number;
}

export const TIER_CONFIG: Record<SubscriptionTier, TierConfig> = {
  free: {
    dailyLimit: 5,
    model: 'gpt-4o-mini',
    dataOwnership: 'platform',
    price: 0,
  },
  lite: {
    dailyLimit: 15,
    model: 'gpt-4o-mini',
    dataOwnership: 'platform',
    price: 0.99,
    annualPrice: 9.99,
  },
  vip: {
    dailyLimit: Infinity,
    model: 'user-provided',
    dataOwnership: 'user',
    price: 9.99,
    annualPrice: 99.99,
  },
  premium: {
    dailyLimit: Infinity,
    model: 'gpt-4o+claude-opus-4-6',
    dataOwnership: 'user',
    price: 99.99,
    annualPrice: 999,
  },
};

export const TIER_LABELS: Record<SubscriptionTier, { en: string; zh: string }> = {
  free: { en: 'Free', zh: '免费版' },
  lite: { en: 'Lite', zh: '轻享版' },
  vip: { en: 'VIP (BYOK)', zh: 'VIP (自带密钥)' },
  premium: { en: 'Premium', zh: '尊享版' },
};
