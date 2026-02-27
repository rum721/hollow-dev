import { useCallback, useRef } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useMemoryStore } from '../store/useMemoryStore';
import { sendChatMessage } from '../services/ai/aiRouter';
import { getEffectiveLocale } from '../i18n';
import type { ChatMessage } from '../services/ai/types';

export function useStreaming() {
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (sessionId: string, userText: string) => {
    const { addUserMessage, appendStreamToken, finalizeAssistantMessage, setStreaming } =
      useChatStore.getState();
    const settings = useSettingsStore.getState();
    const { getFormattedContext } = useMemoryStore.getState();

    addUserMessage(sessionId, userText);
    setStreaming(true);

    const allMessages = useChatStore.getState().messages[sessionId] ?? [];
    const chatMessages: ChatMessage[] = allMessages.slice(-20).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    try {
      await sendChatMessage(
        chatMessages,
        {
          selectedModel: settings.selectedModel,
          apiKeys: settings.apiKeys,
          nickname: settings.nickname,
          conversationStyle: settings.conversationStyle,
          responseStyleValue: settings.responseStyleValue,
          memoryContext: getFormattedContext(),
          locale: getEffectiveLocale(settings.language),
        },
        {
          onToken: (token: string) => appendStreamToken(token),
          onComplete: () => finalizeAssistantMessage(sessionId),
          onError: (error: Error) => {
            appendStreamToken(`\n\n${error.message}`);
            finalizeAssistantMessage(sessionId);
          },
        },
      );
    } catch (error) {
      appendStreamToken('\n\nConnection error. Please try again.');
      finalizeAssistantMessage(sessionId);
    }
  }, []);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, cancelStream };
}
