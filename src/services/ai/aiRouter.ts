import { streamAnthropicChat } from './anthropicClient';
import { streamOpenAICompatibleChat } from './openaiCompatibleClient';
import { getModelInfo, PROVIDER_BASE_URLS } from './models';
import { buildSystemPrompt } from './promptBuilder';
import type { ChatMessage, StreamCallbacks } from './types';
import type { ConversationStyle } from '../../types/settings';

interface RouterConfig {
  selectedModel: string;
  apiKeys: Record<string, string>;
  nickname: string;
  conversationStyle: ConversationStyle;
  responseStyleValue: number;
  memoryContext: string;
  locale: string;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  config: RouterConfig,
  callbacks: StreamCallbacks,
): Promise<void> {
  const modelInfo = getModelInfo(config.selectedModel);
  if (!modelInfo) {
    callbacks.onError(new Error(`Unknown model: ${config.selectedModel}`));
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
  );

  if (modelInfo.provider === 'anthropic') {
    return streamAnthropicChat(
      apiKey,
      modelInfo.apiModelId,
      systemPrompt,
      messages,
      callbacks,
    );
  }

  // All other providers use OpenAI-compatible API
  const baseUrl = PROVIDER_BASE_URLS[modelInfo.provider];
  return streamOpenAICompatibleChat(
    baseUrl,
    apiKey,
    modelInfo.apiModelId,
    systemPrompt,
    messages,
    callbacks,
  );
}
