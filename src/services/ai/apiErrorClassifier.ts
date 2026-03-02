/**
 * API Error Classifier — parses HTTP error responses from AI providers
 * into specific, user-facing error codes and messages.
 */

export type ApiErrorCode =
  | 'AUTH_INVALID'       // 401: API key is invalid
  | 'AUTH_EXPIRED'       // 401: API key expired
  | 'BILLING_ISSUE'      // 402/payment: billing or credits exhausted
  | 'ACCESS_DENIED'      // 403: model or endpoint access denied
  | 'MODEL_NOT_FOUND'    // 404: model ID doesn't exist
  | 'RATE_LIMITED'       // 429: too many requests
  | 'QUOTA_EXCEEDED'     // 429 + quota context: daily/monthly quota hit
  | 'CONTEXT_TOO_LONG'   // 400 + context_length: input too long
  | 'CONTENT_FILTER'     // 400 + content filter: message rejected by safety filter
  | 'SERVER_ERROR'       // 500+: provider server error
  | 'SERVER_OVERLOADED'  // 503: service temporarily unavailable
  | 'NETWORK_ERROR'      // fetch failed
  | 'UNKNOWN';           // catch-all

export interface ClassifiedError {
  code: ApiErrorCode;
  /** Localized, user-friendly message (Chinese with English fallback) */
  message: string;
  /** Raw status code if available */
  status?: number;
}

/**
 * Classify an HTTP error response from an AI API.
 *
 * @param status  HTTP status code
 * @param body    Response body text (may be JSON string)
 */
export function classifyApiError(status: number, body: string): ClassifiedError {
  const lower = body.toLowerCase();

  // ── 401 Unauthorized ──
  if (status === 401) {
    if (lower.includes('expired')) {
      return { code: 'AUTH_EXPIRED', message: 'API 密钥已过期，请更新密钥', status };
    }
    return { code: 'AUTH_INVALID', message: 'API 密钥无效，请在设置中检查', status };
  }

  // ── 402 Payment Required ──
  if (status === 402 || (status === 400 && lower.includes('billing'))) {
    return { code: 'BILLING_ISSUE', message: '账户余额不足或未绑定支付方式', status };
  }

  // ── 403 Forbidden ──
  if (status === 403) {
    return { code: 'ACCESS_DENIED', message: '无权访问该模型，请检查 API 密钥权限', status };
  }

  // ── 404 Not Found ──
  if (status === 404) {
    if (lower.includes('model') || lower.includes('not found')) {
      return { code: 'MODEL_NOT_FOUND', message: '所选模型不可用，请切换其他模型', status };
    }
    return { code: 'MODEL_NOT_FOUND', message: '请求的 API 端点不存在', status };
  }

  // ── 429 Rate Limit / Quota ──
  if (status === 429) {
    if (lower.includes('quota') || lower.includes('exceeded') || lower.includes('limit')) {
      return { code: 'QUOTA_EXCEEDED', message: 'API 配额已用尽，请稍后再试或升级计划', status };
    }
    return { code: 'RATE_LIMITED', message: '请求过于频繁，请稍等片刻再试', status };
  }

  // ── 400 Bad Request (sub-classify) ──
  if (status === 400) {
    // Unsupported parameter (e.g., max_tokens on GPT-5.x) — specific check first
    if (lower.includes('unsupported parameter') || lower.includes('unrecognized request argument')) {
      return { code: 'UNKNOWN', message: '请求参数不兼容，请更新应用或切换模型', status };
    }
    // Context length exceeded — use specific keywords, NOT broad "token" match
    if (lower.includes('context_length') || lower.includes('maximum context length') || lower.includes('too many tokens') || lower.includes('reduce the length')) {
      return { code: 'CONTEXT_TOO_LONG', message: '对话内容过长，请尝试开始新对话', status };
    }
    if (lower.includes('content_filter') || lower.includes('safety') || lower.includes('content_policy')) {
      return { code: 'CONTENT_FILTER', message: '消息被内容安全过滤器拦截', status };
    }
    if (lower.includes('billing') || lower.includes('insufficient_quota')) {
      return { code: 'BILLING_ISSUE', message: '账户余额不足，请充值后再试', status };
    }
    // Generic 400
    return { code: 'UNKNOWN', message: `请求格式错误 (${status})`, status };
  }

  // ── 5xx Server Errors ──
  if (status === 503 || status === 502) {
    return { code: 'SERVER_OVERLOADED', message: 'AI 服务暂时不可用，请稍后重试', status };
  }
  if (status >= 500) {
    return { code: 'SERVER_ERROR', message: 'AI 服务器错误，请稍后重试', status };
  }

  // ── Catch-all ──
  return { code: 'UNKNOWN', message: `API 错误 (${status})`, status };
}

/**
 * Classify a network/fetch error (no HTTP status).
 */
export function classifyNetworkError(error: unknown): ClassifiedError {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes('abort') || lower.includes('cancel')) {
    return { code: 'UNKNOWN', message: '请求已取消' };
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return { code: 'NETWORK_ERROR', message: '请求超时，AI 服务暂时无响应，请稍后重试' };
  }
  if (lower.includes('network') || lower.includes('internet') || lower.includes('offline')) {
    return { code: 'NETWORK_ERROR', message: '网络连接失败，请检查网络设置' };
  }
  if (lower.includes('dns') || lower.includes('resolve') || lower.includes('hostname')) {
    return { code: 'NETWORK_ERROR', message: 'DNS 解析失败，请检查网络连接' };
  }
  if (lower.includes('ssl') || lower.includes('certificate') || lower.includes('tls')) {
    return { code: 'NETWORK_ERROR', message: '安全连接失败，请检查网络环境' };
  }
  return { code: 'NETWORK_ERROR', message: '网络连接失败，请检查网络设置' };
}
