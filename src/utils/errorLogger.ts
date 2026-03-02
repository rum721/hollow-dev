/**
 * Centralized error logging for Hollow app.
 *
 * Replaces silent `.catch(() => {})` patterns with structured logging.
 * In development, errors are printed to the console.
 * In production, error messages are sanitized to remove user data
 * before buffering (future: ship to Sentry / Crashlytics).
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
 * Sanitize error messages in production to prevent user data leakage.
 * Strips potential PII: file paths, base64 blobs, API keys, long content.
 */
function sanitizeMessage(message: string): string {
  if (__DEV__) return message; // Full detail in development

  return message
    // Redact base64 blobs (>20 chars of base64-like content)
    .replace(/[A-Za-z0-9+/=]{20,}/g, '[REDACTED_DATA]')
    // Redact file paths
    .replace(/\/[\w./\-]+\.(jpg|jpeg|png|enc|json|md|txt)/gi, '[REDACTED_PATH]')
    // Redact potential API keys (sk-..., key-..., etc.)
    .replace(/\b(sk|key|token|api)[_-][A-Za-z0-9]{8,}/gi, '[REDACTED_KEY]')
    // Truncate remaining long messages (may contain user content in error payloads)
    .slice(0, 200);
}

/**
 * Log an error with a domain/operation tag.
 * Returns a function suitable for use in `.catch()`.
 *
 * @param domain   Module area: 'chat', 'memory', 'settings', 'voice', etc.
 * @param operation  What was being done: 'insertMessage', 'loadProfiles', etc.
 */
export function logError(domain: string, operation: string) {
  return (error: unknown): void => {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const message = sanitizeMessage(rawMessage);
    const entry: ErrorEntry = {
      domain,
      operation,
      message,
      timestamp: new Date().toISOString(),
    };

    // Development: full detail to console
    if (__DEV__) {
      console.warn(`[${domain}/${operation}]`, rawMessage);
    }

    // Buffer sanitized entries for diagnostics
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
