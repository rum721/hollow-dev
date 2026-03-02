import { streamAnthropicChat } from './anthropicClient';
import { streamOpenAICompatibleChat } from './openaiCompatibleClient';
import { streamManusChat, validateManusApiKey } from './manusClient';
import { getModelInfo, MODEL_LIST, PROVIDER_BASE_URLS } from './models';
import { buildSystemPrompt, getMaxTokensForStyle } from './promptBuilder';
import { anonymizeMessages, shouldAnonymize } from './dataAnonymizer';
import { getPremiumModelId } from './premiumRouter';
import { classifyApiError } from './apiErrorClassifier';
import { textOf } from './contentUtils';
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
    msg.includes('频繁') ||         // rate limited
    msg.includes('不可用') ||       // service unavailable
    msg.includes('超时') ||         // timeout
    msg.includes('timed out') ||
    msg.includes('overloaded') ||
    msg.includes('429') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('服务器错误')       // server error
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
