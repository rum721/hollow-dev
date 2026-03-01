import type { ChatMessage } from './types';

/**
 * Rough token estimation for a string.
 * English: ~4 chars per token. Chinese: ~1.5 chars per token.
 * We use a blend since Hollow supports both.
 */
function estimateTokens(text: string): number {
  // Count Chinese characters
  const chineseChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const otherChars = text.length - chineseChars;

  // Chinese: ~1.5 chars/token; English/other: ~4 chars/token
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

/**
 * Truncate a conversation history to fit within a token budget.
 *
 * Strategy:
 * 1. Always keep the most recent message (user's latest input)
 * 2. Keep as many recent messages as possible within budget
 * 3. If a single message is very long (>2000 tokens), truncate its content
 * 4. Always aim to keep at least the last 4 messages for context
 *
 * @param messages    Full conversation messages
 * @param tokenBudget Maximum tokens for the conversation context (default: 8000)
 * @returns Truncated messages that fit within the budget
 */
export function truncateMessages(
  messages: ChatMessage[],
  tokenBudget: number = 8000,
): ChatMessage[] {
  if (messages.length === 0) return [];

  // Phase 1: Take the most recent messages first (reverse scan)
  const result: ChatMessage[] = [];
  let usedTokens = 0;
  const SINGLE_MSG_MAX = 2000; // Max tokens for a single message before truncation

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    let msgTokens = estimateTokens(msg.content);

    // Truncate overly long individual messages
    if (msgTokens > SINGLE_MSG_MAX) {
      const truncatedContent = truncateContent(msg.content, SINGLE_MSG_MAX);
      const truncated: ChatMessage = { role: msg.role, content: truncatedContent };
      msgTokens = SINGLE_MSG_MAX;

      if (usedTokens + msgTokens > tokenBudget) {
        // Can we fit anything at all? Keep at least latest 4 messages
        if (result.length >= 4) break;
        // Otherwise squeeze it in
      }
      result.unshift(truncated);
      usedTokens += msgTokens;
    } else {
      if (usedTokens + msgTokens > tokenBudget) {
        // Keep at least the latest 4 messages for basic context
        if (result.length >= 4) break;
      }
      result.unshift(msg);
      usedTokens += msgTokens;
    }
  }

  return result;
}

/**
 * Truncate content to approximately `maxTokens` tokens.
 * Keeps the beginning and end of the message for context.
 */
function truncateContent(content: string, maxTokens: number): string {
  // Rough: 2.5 chars per token as average blend
  const maxChars = Math.floor(maxTokens * 2.5);
  if (content.length <= maxChars) return content;

  // Keep 70% from start, 30% from end
  const headChars = Math.floor(maxChars * 0.7);
  const tailChars = maxChars - headChars - 20; // 20 chars for separator

  const head = content.slice(0, headChars);
  const tail = content.slice(-tailChars);

  return `${head}\n\n[... 内容已截断 ...]\n\n${tail}`;
}
