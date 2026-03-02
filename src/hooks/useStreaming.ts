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
import { truncateMessages } from '../services/ai/messageTruncator';
import { modelSupportsVision } from '../services/ai/models';
import { loadImageBase64 } from '../services/image/imageService';
import { textOf } from '../services/ai/contentUtils';
import { logError } from '../utils/errorLogger';
import type { ChatMessage, ChatContentBlock, MessageContent } from '../services/ai/types';
import type { Message, ImageAttachment } from '../types/chat';

/** Maximum number of recent image messages to include base64 data for (memory safety). */
const MAX_IMAGE_MESSAGES = 2;

/**
 * Build a multimodal ChatMessage from a Message with optional imageAttachments.
 * Images are loaded as base64 on demand.
 */
async function buildMultimodalContent(
  msg: Message,
  includeImages: boolean,
): Promise<MessageContent> {
  // No images or not including them → return text (with placeholder if images exist)
  if (!msg.imageAttachments || msg.imageAttachments.length === 0 || !includeImages) {
    if (msg.imageAttachments && msg.imageAttachments.length > 0 && !includeImages) {
      // Image exists but we're degrading it to text
      const textPart = msg.content || '';
      return textPart ? `[图片] ${textPart}` : '[图片]';
    }
    return msg.content;
  }

  // Build content blocks: images first, then text
  const blocks: ChatContentBlock[] = [];

  for (const img of msg.imageAttachments) {
    try {
      const base64 = await loadImageBase64(img.uri);
      blocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mimeType,
          data: base64,
        },
      });
    } catch {
      // If image loading fails, add a text placeholder
      blocks.push({ type: 'text', text: '[图片加载失败]' });
    }
  }

  // Add text content if present
  if (msg.content.trim()) {
    blocks.push({ type: 'text', text: msg.content });
  }

  return blocks;
}

export function useStreaming() {
  const abortRef = useRef<AbortController | null>(null);
  const lastExtractionTimeRef = useRef<number>(0);

  const sendMessage = useCallback(async (
    sessionId: string,
    userText: string,
    images?: ImageAttachment[],
  ) => {
    const { addUserMessage, appendStreamToken, finalizeAssistantMessage, setStreaming } =
      useChatStore.getState();
    const settings = useSettingsStore.getState();
    const { getRelevantContext } = useMemoryStore.getState();
    const subscription = useSubscriptionStore.getState();

    // Check daily limit
    if (!subscription.canSendMessage()) {
      return { limitReached: true };
    }

    addUserMessage(sessionId, userText, images);
    setStreaming(true);

    // Increment usage count
    subscription.incrementUsage();

    const allMessages = useChatStore.getState().messages[sessionId] ?? [];

    // ── Build multimodal ChatMessage[] ──
    // Determine if the selected model supports vision
    const supportsVision = modelSupportsVision(settings.selectedModel);

    // Find which message indices have images (for limiting base64 to recent N)
    const imageMessageIndices: number[] = [];
    if (supportsVision) {
      for (let i = allMessages.length - 1; i >= 0; i--) {
        if (allMessages[i].imageAttachments && allMessages[i].imageAttachments!.length > 0) {
          imageMessageIndices.unshift(i);
          if (imageMessageIndices.length >= MAX_IMAGE_MESSAGES) break;
        }
      }
    }

    // Build ChatMessage[] with multimodal content
    const rawMessages: ChatMessage[] = [];
    for (let i = 0; i < allMessages.length; i++) {
      const msg = allMessages[i];
      const includeImages = supportsVision && imageMessageIndices.includes(i);
      const content = await buildMultimodalContent(msg, includeImages);
      rawMessages.push({
        role: msg.role as 'user' | 'assistant',
        content,
      });
    }

    // Dynamic truncation by token budget instead of fixed slice(-20)
    const chatMessages = truncateMessages(rawMessages, 8000);

    // Extract recent user messages for memory relevance matching (text only)
    const recentUserMessages = chatMessages
      .filter((m) => m.role === 'user')
      .slice(-3)
      .map((m) => textOf(m.content));

    const effectiveLocale = getEffectiveLocale(settings.language);
    const knowledgeContext = getRelevantKnowledge(recentUserMessages, effectiveLocale);

    // Manus multi-turn: retrieve existing taskId for this session
    const manusTaskId = useChatStore.getState().getManusTaskId(sessionId);

    abortRef.current = new AbortController();

    // ── Connection timeout: abort if no first token within 60 seconds ──
    // Once streaming begins (first token), the timer is cleared.
    // This prevents indefinite hangs when API servers are unresponsive.
    let connectionTimedOut = false;
    const CONNECTION_TIMEOUT_MS = 60_000;
    const connectionTimer = setTimeout(() => {
      connectionTimedOut = true;
      abortRef.current?.abort();
    }, CONNECTION_TIMEOUT_MS);

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
          onToken: (token: string) => {
            // Connection alive — clear the timeout on first token
            clearTimeout(connectionTimer);
            appendStreamToken(token);
          },
          onComplete: (fullResponse: string) => {
            clearTimeout(connectionTimer);
            finalizeAssistantMessage(sessionId, fullResponse);

            // ── V2 Smart memory extraction with timing-aware trigger ──
            const chatState = useChatStore.getState();
            const allMsgs = chatState.messages[sessionId] ?? [];
            const lastIdx = chatState.getLastExtractionIndex(sessionId);

            if (shouldExtractMemory(allMsgs, lastIdx, lastExtractionTimeRef.current)) {
              lastExtractionTimeRef.current = Date.now();

              const chatMsgs: ChatMessage[] = allMsgs.slice(lastIdx).map((m) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
              }));
              const existingProfiles = useMemoryStore.getState().profiles;

              extractMemories(chatMsgs, existingProfiles, settings.selectedModel, settings.apiKeys)
                .then((extraction) => {
                  if (extraction.status === 'success') {
                    mergeExtractionResult(extraction.result, sessionId).then(() => {
                      // Refresh memory store after merge
                      useMemoryStore.getState().invalidateCache();
                      useMemoryStore.getState().loadAll();
                    }).catch(logError('memory', 'mergeExtraction'));
                  } else if (extraction.status === 'error') {
                    logError('memory', 'extractMemories')(new Error(extraction.error));
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
            clearTimeout(connectionTimer);
            const msg = connectionTimedOut
              ? '请求超时，AI 服务暂时无响应，请稍后重试'
              : error.message;
            appendStreamToken(`\n\n${msg}`);
            finalizeAssistantMessage(sessionId);
          },
        },
        abortRef.current.signal,
      );
    } catch (error) {
      clearTimeout(connectionTimer);
      const msg = connectionTimedOut
        ? '请求超时，AI 服务暂时无响应，请稍后重试'
        : '网络连接失败，请检查网络后重试';
      appendStreamToken(`\n\n${msg}`);
      finalizeAssistantMessage(sessionId);
    }

    return { limitReached: false };
  }, []);

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, cancelStream };
}
