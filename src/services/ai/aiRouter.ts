import { streamAnthropicChat } from './anthropicClient';
import { streamOpenAICompatibleChat } from './openaiCompatibleClient';
import { streamManusChat, validateManusApiKey } from './manusClient';
import { getModelInfo, MODEL_LIST, PROVIDER_BASE_URLS } from './models';
import { buildSystemPrompt, getMaxTokensForStyle } from './promptBuilder';
import { anonymizeMessages, shouldAnonymize } from './dataAnonymizer';
import { getPremiumModelId } from './premiumRouter';
import { classifyApiError } from './apiErrorClassifier';
import { textOf } from './contentUtils';
import { getBuiltInModels, type BuiltInModelConfig } from './builtInModels';
import { getNetworkEnvironment, correctNetworkEnvironment } from './networkDetector';
import { checkRateLimit, consumeRateLimit } from './rateLimiter';
import type { ModelInfo } from '../../types/settings';
import type { ChatMessage, StreamCallbacks, RequestOptions } from './types';
import type { ConversationStyle } from '../../types/settings';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { apiFetch } from './apiFetch';

interface RouterConfig {
  selectedModel: string;
  apiKeys: Record<string, string>;
  nickname: string;
  conversationStyle: ConversationStyle;
  responseStyleValue: number;
  memoryContext: string;
  locale: string;
  store?: boolean;
  knowledgeContext?: string;
  manusTaskId?: string;
  onManusTaskId?: (taskId: string) => void;
}

// ── Failover: preferred fallback order (high-quality, diverse providers) ──
const FAILOVER_PRIORITY = [
  'claude-sonnet-4-6',
  'gpt-5.2',
  'deepseek-v3.2',
  'gpt-4o-mini',
  'gemini-2.5-flash',
  'glm-4-flash',
  'qwen3-max',
  'kimi-k2.5',
];

/** Max fallback attempts (including primary). */
const MAX_FAILOVER_ATTEMPTS = 3;

/**
 * Check if an error is retryable with a different provider.
 * These are errors where the issue is provider-specific, not user-caused.
 */
function isRetryableError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes('配额') ||         // quota exhausted
    msg.includes('余额') ||         // insufficient balance (402)
    msg.includes('支付') ||         // payment issue (402)
    msg.includes('充值') ||         // needs top-up (402)
    msg.includes('频繁') ||         // rate limited
    msg.includes('不可用') ||       // service unavailable
    msg.includes('超时') ||         // timeout (Chinese)
    msg.includes('取消') ||         // cancelled (Chinese classified, includes timeout-abort)
    msg.includes('timed out') ||
    msg.includes('overloaded') ||
    msg.includes('abort') ||        // AbortError from timeout
    msg.includes('billing') ||      // billing issue (raw English)
    msg.includes('insufficient') || // insufficient quota/balance (raw English)
    msg.includes('402') ||          // HTTP 402 Payment Required
    msg.includes('429') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('服务器错误') ||    // server error
    msg.includes('网络') ||         // network error (Chinese classified)
    msg.includes('连接失败') ||     // connection failed (Chinese classified)
    msg.includes('network') ||      // raw "Network request failed"
    msg.includes('failed to fetch') || // raw fetch error
    msg.includes('dns') ||          // DNS resolution failure
    msg.includes('econnrefused') || // connection refused
    msg.includes('enotfound')       // host not found
  );
}

/**
 * Build a failover chain: primary model + available alternatives from different providers.
 * Skips Manus (non-standard protocol, not suitable for automatic failover).
 */
function buildFailoverChain(
  primaryModelId: string,
  apiKeys: Record<string, string>,
): ModelInfo[] {
  const primary = getModelInfo(primaryModelId);
  if (!primary) return [];

  const chain: ModelInfo[] = [primary];

  // Don't build failovers for Manus (special protocol)
  if (primary.provider === 'manus') return chain;

  for (const fallbackId of FAILOVER_PRIORITY) {
    if (chain.length >= MAX_FAILOVER_ATTEMPTS) break;
    if (fallbackId === primaryModelId) continue;

    const info = getModelInfo(fallbackId);
    if (!info) continue;

    // Must use a DIFFERENT API key (different provider account)
    // Same apiKeyField means same provider → same rate limit applies
    if (info.apiKeyField === primary.apiKeyField) continue;

    // Must have the API key configured
    if (!apiKeys[info.apiKeyField]) continue;

    // Don't failover to Manus
    if (info.provider === 'manus') continue;

    chain.push(info);
  }

  return chain;
}

/**
 * Dispatch a request to a specific model's provider.
 */
async function dispatchToProvider(
  modelInfo: ModelInfo,
  apiKey: string,
  systemPrompt: string,
  outboundMessages: ChatMessage[],
  callbacks: StreamCallbacks,
  requestOptions: RequestOptions,
  config: RouterConfig,
  signal?: AbortSignal,
): Promise<void> {
  if (modelInfo.provider === 'anthropic') {
    return streamAnthropicChat(
      apiKey,
      modelInfo.apiModelId,
      systemPrompt,
      outboundMessages,
      callbacks,
      requestOptions,
      signal,
    );
  }

  if (modelInfo.provider === 'manus') {
    const newTaskId = await streamManusChat(
      apiKey,
      modelInfo.apiModelId,
      systemPrompt,
      outboundMessages,
      callbacks,
      { ...requestOptions, manusTaskId: config.manusTaskId },
      signal,
    );
    if (newTaskId && config.onManusTaskId) {
      config.onManusTaskId(newTaskId);
    }
    return;
  }

  // All other providers use OpenAI-compatible API
  const baseUrl = PROVIDER_BASE_URLS[modelInfo.provider];
  return streamOpenAICompatibleChat(
    baseUrl,
    apiKey,
    modelInfo.apiModelId,
    systemPrompt,
    outboundMessages,
    callbacks,
    requestOptions,
    signal,
  );
}

export async function sendChatMessage(
  messages: ChatMessage[],
  config: RouterConfig,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  // Determine subscription tier (used for routing and anonymization)
  const tier = useSubscriptionStore.getState().tier;

  // ── Premium smart routing ──────────────────────────────────────────
  let effectiveModelId = config.selectedModel;

  if (tier === 'premium') {
    const lastUserContent = messages.filter((m) => m.role === 'user').pop()?.content;
    const lastUserMsg = lastUserContent ? textOf(lastUserContent) : '';
    const routedModelId = getPremiumModelId(lastUserMsg);
    const routedModelInfo = getModelInfo(routedModelId);

    if (routedModelInfo) {
      const routedApiKey = config.apiKeys[routedModelInfo.apiKeyField];
      if (routedApiKey) {
        effectiveModelId = routedModelId;
      }
    }
  }

  // ── Build common parameters ────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(
    config.nickname,
    config.conversationStyle,
    config.responseStyleValue,
    config.memoryContext,
    config.locale,
    config.knowledgeContext,
  );

  const maxTokens = getMaxTokensForStyle(config.responseStyleValue);
  const storeData = shouldAnonymize(tier);
  const requestOptions: RequestOptions = { store: storeData, maxTokens };
  const outboundMessages = storeData ? anonymizeMessages(messages) : messages;

  // ── Check if user has any API key for the selected model ──────────
  const primaryModel = getModelInfo(effectiveModelId);
  const hasUserKey = primaryModel ? Boolean(config.apiKeys[primaryModel.apiKeyField]) : false;

  // If no user key configured, use built-in model
  if (!hasUserKey) {
    return sendWithBuiltInModel(
      outboundMessages, systemPrompt, requestOptions, callbacks, signal,
    );
  }

  // ── Build failover chain ───────────────────────────────────────────
  const failoverChain = buildFailoverChain(effectiveModelId, config.apiKeys);

  // ── Try each model in chain ────────────────────────────────────────
  for (let attempt = 0; attempt < failoverChain.length; attempt++) {
    const candidate = failoverChain[attempt];
    const isLastAttempt = attempt === failoverChain.length - 1;
    const apiKey = config.apiKeys[candidate.apiKeyField];

    if (!apiKey) {
      // No API key for this candidate — skip (shouldn't happen, but safety)
      if (isLastAttempt) {
        callbacks.onError(new Error(`API key not set for ${candidate.label}. Please add it in Settings.`));
      }
      continue;
    }

    // Track whether any tokens have been received
    let tokensReceived = false;
    let shouldRetry = false;

    // Wrap callbacks to intercept retryable errors
    const wrappedCallbacks: StreamCallbacks = {
      onToken: (token: string) => {
        tokensReceived = true;
        callbacks.onToken(token);
      },
      onComplete: (fullResponse: string) => {
        callbacks.onComplete(fullResponse);
      },
      onError: (error: Error) => {
        // Only retry if: not last attempt, no tokens received yet, and error is retryable
        if (!isLastAttempt && !tokensReceived && isRetryableError(error)) {
          shouldRetry = true;
        } else {
          callbacks.onError(error);
        }
      },
    };

    await dispatchToProvider(
      candidate,
      apiKey,
      systemPrompt,
      outboundMessages,
      wrappedCallbacks,
      requestOptions,
      config,
      signal,
    );

    if (!shouldRetry) return; // Success or non-retryable error — done

    // Notify user of failover
    const nextCandidate = failoverChain[attempt + 1];
    if (nextCandidate) {
      callbacks.onToken(`[${candidate.label} 暂不可用，正在切换到 ${nextCandidate.label}…]\n\n`);
    }
  }
}

/**
 * 使用内置模型发送消息，带网络感知 fallback 链
 *
 * 流程：
 * 1. 检查每日限额
 * 2. 检测网络环境 → 决定模型优先级
 * 3. 尝试首选模型（8s 超时）
 * 4. 首选失败 → 自动切 fallback → 修正网络缓存
 * 5. 全部失败 → 友好错误提示
 */
async function sendWithBuiltInModel(
  outboundMessages: ChatMessage[],
  systemPrompt: string,
  requestOptions: RequestOptions,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  // Step 1: 检查限流
  const rateCheck = await checkRateLimit();
  if (!rateCheck.allowed) {
    callbacks.onError(
      new Error(
        `今日免费额度已用完（50条/天），${rateCheck.resetTime}重置。\n\n` +
        `如需继续使用，请在「设置 → AI 设置」中配置自己的 API Key。`,
      ),
    );
    return;
  }

  // Step 2: 检测网络环境
  const networkEnv = await getNetworkEnvironment();
  const builtInModels = getBuiltInModels(networkEnv);

  let lastError: Error | null = null;
  let isFirstAttempt = true;

  // Step 3: 按优先级尝试内置模型
  const hasFallback = builtInModels.length > 1;

  for (const builtIn of builtInModels) {
    try {
      // 只在有 fallback 模型时使用 8s 超时（防止被墙时无限等待）
      // 只有一个模型时不加额外超时，依赖 useStreaming 的 60s 连接超时
      const BUILTIN_TIMEOUT_MS = 8000;
      let timeoutController: AbortController | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      if (hasFallback) {
        timeoutController = new AbortController();
        timeoutId = setTimeout(
          () => timeoutController!.abort(),
          BUILTIN_TIMEOUT_MS,
        );
      }

      // 合并用户取消 signal 和超时 signal（如有）
      let combinedSignal: AbortSignal;
      if (timeoutController && signal) {
        if (typeof AbortSignal.any === 'function') {
          combinedSignal = AbortSignal.any([signal, timeoutController.signal]);
        } else {
          const merged = new AbortController();
          const onAbort = () => merged.abort();
          signal.addEventListener('abort', onAbort, { once: true });
          timeoutController.signal.addEventListener('abort', onAbort, { once: true });
          combinedSignal = merged.signal;
        }
      } else if (timeoutController) {
        combinedSignal = timeoutController.signal;
      } else if (signal) {
        combinedSignal = signal;
      } else {
        combinedSignal = new AbortController().signal; // never aborts
      }

      // 用 throw-on-retryable 模式让 fallback 链捕获错误
      let streamError: Error | null = null;
      let tokensReceived = false;

      try {
        await streamOpenAICompatibleChat(
          builtIn.baseUrl,
          builtIn.apiKey,
          builtIn.apiModelId,
          systemPrompt,
          outboundMessages,
          {
            onToken: (token: string) => {
              tokensReceived = true;
              callbacks.onToken(token);
            },
            onComplete: (fullResponse: string) => {
              callbacks.onComplete(fullResponse);
            },
            onError: (error: Error) => {
              streamError = error;
            },
          },
          requestOptions,
          combinedSignal,
        );
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      // 如果有可重试的流错误且还没收到 token → 尝试下一个
      if (streamError && !tokensReceived && isRetryableError(streamError)) {
        throw streamError;
      }
      // 不可重试的错误 → 直接传给用户
      if (streamError) {
        callbacks.onError(streamError);
        return;
      }

      // 成功
      await consumeRateLimit();

      // 如果 fallback 成功，修正网络环境缓存
      if (!isFirstAttempt) {
        await correctNetworkEnvironment(networkEnv);
      }

      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      isFirstAttempt = false;
      // 继续尝试下一个
    }
  }

  // Step 5: 所有内置模型失败
  callbacks.onError(
    new Error(
      '当前网络环境无法连接 AI 服务，请稍后重试。\n\n' +
      '如果问题持续，请在「设置 → AI 设置」中配置自己的 API Key。',
    ),
  );
}

export async function validateApiKey(modelId: string, apiKey: string): Promise<{ valid: boolean; error?: string }> {
  const modelInfo = getModelInfo(modelId);
  if (!modelInfo) return { valid: false, error: '未知模型' };

  try {
    if (modelInfo.provider === 'anthropic') {
      const response = await apiFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: modelInfo.apiModelId,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });
      if (response.ok || response.status === 200) return { valid: true };
      const errBody = await response.text().catch(() => '');
      const classified = classifyApiError(response.status, errBody);
      return { valid: false, error: classified.message };
    }

    if (modelInfo.provider === 'manus') {
      return validateManusApiKey(apiKey);
    }

    const baseUrl = PROVIDER_BASE_URLS[modelInfo.provider];
    const isOpenAI = modelInfo.provider === 'openai';
    const isNewOpenAIModel = isOpenAI && (/^gpt-5/.test(modelInfo.apiModelId) || /^o[1-9]/.test(modelInfo.apiModelId));
    const tokenLimitKey = isNewOpenAIModel ? 'max_completion_tokens' : 'max_tokens';
    const response = await apiFetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelInfo.apiModelId,
        [tokenLimitKey]: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });

    if (response.ok || response.status === 200) return { valid: true };
    const errBody = await response.text().catch(() => '');
    const classified = classifyApiError(response.status, errBody);
    const detail = errBody.length > 200 ? errBody.slice(0, 200) : errBody;
    return { valid: false, error: `${classified.message}${detail ? `\n${detail}` : ''}` };
  } catch (e) {
    return { valid: false, error: '网络连接失败，请检查网络设置' };
  }
}
