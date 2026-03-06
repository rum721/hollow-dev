/**
 * 网络环境检测器
 *
 * 检测用户当前的网络环境，决定内置模型的优先级顺序。
 *
 * 策略：
 * 1. 时区快判：Asia/Shanghai 等中国时区 → 判定为大陆网络
 * 2. 首次请求验证：如果判断错了，自动修正并缓存
 *
 * 缓存策略：
 * - 判定结果缓存在内存中（App 生命周期内有效）
 * - 同时持久化到 SecureStore / localStorage（跨启动有效）
 * - 缓存有效期 24 小时，过期后重新检测
 */

import { Platform } from 'react-native';

const NETWORK_CACHE_KEY = 'hollow_network_env';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 小时

export type NetworkEnvironment = 'china' | 'overseas';

interface NetworkCacheData {
  env: NetworkEnvironment;
  timestamp: number;
  source: 'timezone' | 'probe';
}

// ── 内存缓存 ──
let memoryCache: NetworkCacheData | null = null;

// ── 中国大陆时区列表 ──
const CHINA_TIMEZONES = new Set([
  'Asia/Shanghai',
  'Asia/Chongqing',
  'Asia/Chungking',
  'Asia/Urumqi',
  'Asia/Harbin',
  'Asia/Kashgar',
  'PRC',
]);

// ── 平台适配的持久化 ──

async function loadCache(): Promise<NetworkCacheData | null> {
  try {
    if (Platform.OS === 'web') {
      const raw = localStorage.getItem(NETWORK_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    }
    const SecureStore = await import('expo-secure-store');
    const raw = await SecureStore.getItemAsync(NETWORK_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveCache(data: NetworkCacheData): Promise<void> {
  const json = JSON.stringify(data);
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(NETWORK_CACHE_KEY, json);
      return;
    }
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(NETWORK_CACHE_KEY, json);
  } catch {
    // ignore
  }
}

async function removeCache(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(NETWORK_CACHE_KEY);
      return;
    }
    const SecureStore = await import('expo-secure-store');
    await SecureStore.deleteItemAsync(NETWORK_CACHE_KEY);
  } catch {
    // ignore
  }
}

/**
 * 通过时区快速判断网络环境（同步，0ms，无网络请求）
 */
function detectByTimezone(): NetworkEnvironment {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return CHINA_TIMEZONES.has(tz) ? 'china' : 'overseas';
  } catch {
    return 'overseas';
  }
}

/**
 * 获取当前网络环境判定结果
 * 优先级：内存缓存 > 持久化缓存 > 时区检测
 */
export async function getNetworkEnvironment(): Promise<NetworkEnvironment> {
  // 1. 内存缓存
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache.env;
  }

  // 2. 持久化缓存
  const cached = await loadCache();
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    memoryCache = cached;
    return cached.env;
  }

  // 3. 时区快判
  const env = detectByTimezone();
  const cacheData: NetworkCacheData = {
    env,
    timestamp: Date.now(),
    source: 'timezone',
  };

  memoryCache = cacheData;
  saveCache(cacheData).catch(() => {});

  return env;
}

/**
 * 当首选模型请求失败时，更新网络环境判定
 */
export async function correctNetworkEnvironment(
  failedEnv: NetworkEnvironment,
): Promise<void> {
  const correctedEnv: NetworkEnvironment =
    failedEnv === 'china' ? 'overseas' : 'china';

  const cacheData: NetworkCacheData = {
    env: correctedEnv,
    timestamp: Date.now(),
    source: 'probe',
  };

  memoryCache = cacheData;
  await saveCache(cacheData).catch(() => {});
}

/**
 * 强制重新检测
 */
export async function resetNetworkDetection(): Promise<NetworkEnvironment> {
  memoryCache = null;
  await removeCache().catch(() => {});
  return getNetworkEnvironment();
}

/**
 * 获取当前检测信息（用于设置页面显示）
 */
export async function getNetworkDetectionInfo(): Promise<{
  env: NetworkEnvironment;
  source: 'timezone' | 'probe' | 'unknown';
  timezone: string;
}> {
  let tz = 'unknown';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {}

  if (memoryCache) {
    return { env: memoryCache.env, source: memoryCache.source, timezone: tz };
  }

  return { env: detectByTimezone(), source: 'unknown', timezone: tz };
}
