import { useCallback, useRef } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useMemoryStore } from '../store/useMemoryStore';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { sendChatMessage } from '../services/ai/aiRouter';
import { extractMemories } from '../services/ai/memoryExtractor';
import { getEffectiveLocale } from '../i18n';
import type { ChatMessage } from '../services/ai/types';

export function useStreaming() {
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (sessionId: string, userText: string) => {
    const { addUserMessage, appendStreamToken, finalizeAssistantMessage, setStreaming } =
      useChatStore.getState();
    const settings = useSettingsStore.getState();
    const { getRelevantContext } = useMemoryStore.getState();
    const subscription = useSubscriptionStore.getState();

    // Check daily limit
    if (!subscription.canSendMessage()) {
      return { limitReached: true };
    }

    addUserMessage(sessionId, userText);
    setStreaming(true);

    // Increment usage count
    subscription.incrementUsage();

    const allMessages = useChatStore.getState().messages[sessionId] ?? [];
    const chatMessages: ChatMessage[] = allMessages.slice(-20).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Extract recent user messages for memory relevance matching
    const recentUserMessages = chatMessages
      .filter((m) => m.role === 'user')
      .slice(-3)
      .map((m) => m.content);

    abortRef.current = new AbortController();

    try {
      await sendChatMessage(
        chatMessages,
        {
          selectedModel: settings.selectedModel,
          apiKeys: settings.apiKeys,
          nickname: settings.nickname,
          conversationStyle: settings.conversationStyle,
          responseStyleValue: settings.responseStyleValue,
          memoryContext: getRelevantContext(recentUserMessages),
          locale: getEffectiveLocale(settings.language),
          store: true,
        },
        {
          onToken: (token: string) => appendStreamToken(token),
          onComplete: (fullResponse: string) => {
            finalizeAssistantMessage(sessionId, fullResponse);
            // Async memory extraction — runs in background
            const allMsgs = useChatStore.getState().messages[sessionId] ?? [];
            const chatMsgs: ChatMessage[] = allMsgs.slice(-10).map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }));
            extractMemories(chatMsgs, settings.selectedModel, settings.apiKeys).then((memories) => {
              if (memories.length > 0) {
                useMemoryStore.getState().addMemories(memories);
              }
            }).catch(() => {});
          },
          onError: (error: Error) => {
            appendStreamToken(`\n\n${error.message}`);
            finalizeAssistantMessage(sessionId);
          },
        },
        abortRef.current.signal,
      );
    } catch (error) {
      appendStreamToken('\n\nConnection error. Please try again.');
      finalizeAssistantMessage(sessionId);
    }

    return { limitReached: false };
  }, []);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, cancelStream };
}
