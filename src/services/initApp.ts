/**
 * Unified app initialization with error handling, retry, and timeout.
 *
 * Orchestrates:
 * 1. Encryption key setup (must complete before any DB read)
 * 2. Database + schema creation
 * 3. Hydrating Zustand stores from SQLite/SecureStore
 *
 * Safe to call multiple times — subsequent calls are no-ops if already initialized.
 */

import { initEncryption, isEncryptionReady } from './storage/encryption';
import { getDatabase } from './storage/database';
import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useChatStore } from '../store/useChatStore';
import { useMemoryStore } from '../store/useMemoryStore';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { logError } from '../utils/errorLogger';

/** Initialization states */
export type InitStatus = 'pending' | 'loading' | 'ready' | 'error';

let initStatus: InitStatus = 'pending';
let initError: string | null = null;

const INIT_TIMEOUT = 15_000; // 15 seconds

/**
 * Initialize all app subsystems in the correct order.
 * Returns true on success, false on failure.
 *
 * @param retries  Number of retry attempts (default: 2)
 */
export async function initializeApp(retries: number = 2): Promise<boolean> {
  if (initStatus === 'ready') return true;
  if (initStatus === 'loading') {
    // Wait for existing init to complete (max 15s)
    return waitForInit();
  }

  initStatus = 'loading';
  initError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await withTimeout(doInit(), INIT_TIMEOUT);
      initStatus = 'ready';
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logError('init', `attempt_${attempt}`)(e);
      initError = msg;

      if (attempt < retries) {
        // Wait briefly before retrying (exponential backoff)
        await sleep(500 * (attempt + 1));
      }
    }
  }

  initStatus = 'error';
  return false;
}

/**
 * Get the current initialization status.
 */
export function getInitStatus(): { status: InitStatus; error: string | null } {
  return { status: initStatus, error: initError };
}

// ── Internal ────────────────────────────────────────────

async function doInit(): Promise<void> {
  // Step 1: Encryption — must complete before DB operations
  if (!isEncryptionReady()) {
    await initEncryption();
  }

  // Step 2: Database — ensure schema is ready
  await getDatabase();

  // Step 3: Hydrate all stores in parallel
  await Promise.all([
    useAuthStore.getState().loadAuth(),
    useSettingsStore.getState().loadSettings(),
    useChatStore.getState().loadSessions(),
    useMemoryStore.getState().loadMemories(),
    useSubscriptionStore.getState().loadSubscription(),
  ]);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Initialization timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForInit(): Promise<boolean> {
  const start = Date.now();
  while (initStatus === 'loading' && Date.now() - start < INIT_TIMEOUT) {
    await sleep(100);
  }
  return initStatus === 'ready';
}
