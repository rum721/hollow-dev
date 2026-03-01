import { useCallback, useRef } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useMemoryStore } from '../store/useMemoryStore';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { sendChatMessage } from '../services/ai/aiRouter';
import { shouldExtractMemory, extractMemories } from '../services/ai/memoryExtractor';
import { mergeExtractionResult } from '../services/ai/profileMerger';
import { getRelevantKnowledge } from '../services/knowledge/knowledgeRetriever';
import { getEffectiveLocale } from '../i18n';
import { logError } from '../utils/errorLogger';
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

    const effectiveLocale = getEffectiveLocale(settings.language);
    const knowledgeContext = getRelevantKnowledge(recentUserMessages, effectiveLocale);

    // Manus multi-turn: retrieve existing taskId for this session
    const manusTaskId = useChatStore.getState().getManusTaskId(sessionId);

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
          locale: effectiveLocale,
          store: true,
          knowledgeContext,
          manusTaskId,
          onManusTaskId: (taskId: string) => {
            useChatStore.getState().setManusTaskId(sessionId, taskId);
          },
        },
        {
          onToken: (token: string) => appendStreamToken(token),
          onComplete: (fullResponse: string) => {
            finalizeAssistantMessage(sessionId, fullResponse);

            // ── V2 Smart memory extraction ──
            const chatState = useChatStore.getState();
            const allMsgs = chatState.messages[sessionId] ?? [];
            const lastIdx = chatState.getLastExtractionIndex(sessionId);

            if (shouldExtractMemory(allMsgs, lastIdx)) {
              const chatMsgs: ChatMessage[] = allMsgs.slice(lastIdx).map((m) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
              }));
              const existingProfiles = useMemoryStore.getState().profiles;

              extractMemories(chatMsgs, existingProfiles, settings.selectedModel, settings.apiKeys)
                .then((result) => {
                  if (result) {
                    mergeExtractionResult(result, sessionId).then(() => {
                      // Refresh memory store after merge
                      useMemoryStore.getState().invalidateCache();
                      useMemoryStore.getState().loadAll();
                    }).catch(logError('memory', 'mergeExtraction'));
                  }
                  // Update extraction index regardless of result
                  useChatStore.getState().setLastExtractionIndex(sessionId, allMsgs.length);
                })
                .catch((e: unknown) => {
                  logError('memory', 'extractMemories')(e);
                  // Still update index to prevent retrying the same messages
                  useChatStore.getState().setLastExtractionIndex(sessionId, allMsgs.length);
                });
            }
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
