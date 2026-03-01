import { streamAnthropicChat } from './anthropicClient';
import { streamOpenAICompatibleChat } from './openaiCompatibleClient';
import { streamManusChat, validateManusApiKey } from './manusClient';
import { getModelInfo, PROVIDER_BASE_URLS } from './models';
import { buildSystemPrompt, getMaxTokensForStyle } from './promptBuilder';
import { anonymizeMessages, shouldAnonymize } from './dataAnonymizer';
import { getPremiumModelId } from './premiumRouter';
import { classifyApiError } from './apiErrorClassifier';
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

export async function sendChatMessage(
  messages: ChatMessage[],
  config: RouterConfig,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  // Determine subscription tier (used for routing and anonymization)
  const tier = useSubscriptionStore.getState().tier;

  // ── Premium smart routing ──────────────────────────────────────────
  // For premium users, pick the model based on conversation topic.
  // Falls back gracefully if the routed model's API key is unavailable.
  let effectiveModelId = config.selectedModel;

  if (tier === 'premium') {
    const lastUserMsg =
      messages.filter((m) => m.role === 'user').pop()?.content || '';
    const routedModelId = getPremiumModelId(lastUserMsg);
    const routedModelInfo = getModelInfo(routedModelId);

    if (routedModelInfo) {
      const routedApiKey = config.apiKeys[routedModelInfo.apiKeyField];
      if (routedApiKey) {
        // Key exists for the routed model, use it
        effectiveModelId = routedModelId;
      }
      // else: key missing for routed model, keep the user's originally selected model
    }
  }

  // ── Resolve model info ─────────────────────────────────────────────
  const modelInfo = getModelInfo(effectiveModelId);
  if (!modelInfo) {
    callbacks.onError(new Error(`Unknown model: ${effectiveModelId}`));
    return;
  }

  const apiKey = config.apiKeys[modelInfo.apiKeyField];
  if (!apiKey) {
    callbacks.onError(
      new Error(`API key not set for ${modelInfo.label}. Please add it in Settings.`),
    );
    return;
  }

  const systemPrompt = buildSystemPrompt(
    config.nickname,
    config.conversationStyle,
    config.responseStyleValue,
    config.memoryContext,
    config.locale,
    config.knowledgeContext,
  );

  // Compute max_tokens from the response style slider
  const maxTokens = getMaxTokensForStyle(config.responseStyleValue);

  // Determine store flag and anonymization based on subscription tier
  const storeData = shouldAnonymize(tier); // Free/Lite: store=true, VIP/Premium: store=false
  const requestOptions: RequestOptions = { store: storeData, maxTokens };

  // For tiers where data is stored (Free/Lite), strip PII before sending to API
  const outboundMessages = storeData ? anonymizeMessages(messages) : messages;

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
    // GPT-5.x and o-series both require max_completion_tokens (not max_tokens).
    // Only GPT-4o/4o-mini still accept the legacy max_tokens parameter.
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
