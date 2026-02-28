import { Platform } from 'react-native';
import { ENV } from '../../config/env';

/**
 * CORS proxy URL for web development.
 * On web, browsers block cross-origin API calls (CORS).
 * This routes requests through a local proxy that adds CORS headers.
 *
 * Start the proxy: node scripts/cors-proxy.js
 */
const CORS_PROXY = ENV.API_PROXY_URL ? `${ENV.API_PROXY_URL}/` : '';

/**
 * Platform-aware fetch wrapper.
 * - On native (iOS/Android): calls the API directly (no CORS restriction).
 * - On web: routes through the local CORS proxy.
 */
export function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  if (Platform.OS === 'web' && CORS_PROXY) {
    return fetch(`${CORS_PROXY}${encodeURIComponent(url)}`, options);
  }
  return fetch(url, options);
}
