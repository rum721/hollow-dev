/**
 * Centralized error logging for Hollow app.
 *
 * Replaces silent `.catch(() => {})` patterns with structured logging.
 * In development, errors are printed to the console.
 * In production, errors are buffered in memory and can be retrieved
 * for diagnostics (future: ship to Sentry / Crashlytics).
 *
 * Usage:
 *   someAsyncOp().catch(logError('chat', 'insertMessage'));
 *   // or
 *   try { ... } catch (e) { logError('memory', 'extraction')(e); }
 */

const MAX_BUFFER_SIZE = 100;

interface ErrorEntry {
  domain: string;
  operation: string;
  message: string;
  timestamp: string;
}

const errorBuffer: ErrorEntry[] = [];

/**
 * Log an error with a domain/operation tag.
 * Returns a function suitable for use in `.catch()`.
 *
 * @param domain   Module area: 'chat', 'memory', 'settings', 'voice', etc.
 * @param operation  What was being done: 'insertMessage', 'loadProfiles', etc.
 */
export function logError(domain: string, operation: string) {
  return (error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error);
    const entry: ErrorEntry = {
      domain,
      operation,
      message,
      timestamp: new Date().toISOString(),
    };

    // Development: console
    if (__DEV__) {
      console.warn(`[${domain}/${operation}]`, message);
    }

    // Buffer for diagnostics
    errorBuffer.push(entry);
    if (errorBuffer.length > MAX_BUFFER_SIZE) {
      errorBuffer.shift();
    }
  };
}

/**
 * Get recent errors for diagnostics display.
 */
export function getRecentErrors(): ErrorEntry[] {
  return [...errorBuffer];
}

/**
 * Clear the error buffer.
 */
export function clearErrors(): void {
  errorBuffer.length = 0;
}
