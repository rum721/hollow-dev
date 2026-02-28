export const ENV = {
  APP_ENV: process.env.EXPO_PUBLIC_APP_ENV || 'development',
  API_PROXY_URL: process.env.EXPO_PUBLIC_API_PROXY_URL || '',
  LOG_LEVEL: process.env.EXPO_PUBLIC_LOG_LEVEL || 'debug',
  IS_DEV: __DEV__,
} as const;
