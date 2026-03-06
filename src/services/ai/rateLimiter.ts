/**
 * 本地限流器
 *
 * 限制使用内置模型的用户每天的消息数量，防止 API 成本失控。
 * 使用 SecureStore / localStorage 持久化，按日期重置。
 */

import { Platform } from 'react-native';

const RATE_LIMIT_KEY = 'hollow_builtin_rate_limit';
const DAILY_LIMIT = 50;

interface RateLimitData {
  date: string;   // YYYY-MM-DD
  count: number;
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// ── 平台适配存储 ──

async function loadData(): Promise<RateLimitData | null> {
  try {
    if (Platform.OS === 'web') {
      const raw = localStorage.getItem(RATE_LIMIT_KEY);
      return raw ? JSON.parse(raw) : null;
    }
    const SecureStore = await import('expo-secure-store');
    const raw = await SecureStore.getItemAsync(RATE_LIMIT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveData(data: RateLimitData): Promise<void> {
  const json = JSON.stringify(data);
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(RATE_LIMIT_KEY, json);
      return;
    }
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(RATE_LIMIT_KEY, json);
  } catch {
    // ignore
  }
}

/**
 * 检查是否还有剩余额度
 */
export async function checkRateLimit(): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: string;
}> {
  const today = getTodayString();
  const data = await loadData();

  if (!data || data.date !== today) {
    return { allowed: true, remaining: DAILY_LIMIT, resetTime: '明天 00:00' };
  }

  const remaining = Math.max(0, DAILY_LIMIT - data.count);
  return {
    allowed: remaining > 0,
    remaining,
    resetTime: '明天 00:00',
  };
}

/**
 * 消耗一次额度
 */
export async function consumeRateLimit(): Promise<void> {
  const today = getTodayString();
  const data = await loadData();

  let newData: RateLimitData;
  if (!data || data.date !== today) {
    newData = { date: today, count: 1 };
  } else {
    newData = { date: today, count: data.count + 1 };
  }

  await saveData(newData);
}

/**
 * 获取当天已使用次数（用于 UI 显示）
 */
export async function getDailyUsage(): Promise<{ used: number; limit: number }> {
  const today = getTodayString();
  const data = await loadData();

  if (!data || data.date !== today) return { used: 0, limit: DAILY_LIMIT };
  return { used: data.count, limit: DAILY_LIMIT };
}
