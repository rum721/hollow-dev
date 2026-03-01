/**
 * Strips PII from conversation text before it's stored by the API provider.
 * Used for Free/Lite tiers where data may be used for model training.
 */

import type { ChatMessage, MessageContent, ChatContentBlock } from './types';

// Regex patterns for common PII
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?\d{1,4}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
const URL_REGEX = /https?:\/\/[^\s]+/g;
const IP_REGEX = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
const CREDIT_CARD_REGEX = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
const SSN_REGEX = /\b\d{3}-?\d{2}-?\d{4}\b/g;
const CHINESE_ID_REGEX = /\b\d{17}[\dXx]\b/g;
const CHINESE_PHONE_REGEX = /1[3-9]\d{9}/g;

export function anonymizeText(text: string): string {
  let result = text;

  // Replace emails
  result = result.replace(EMAIL_REGEX, '[EMAIL]');

  // Replace URLs
  result = result.replace(URL_REGEX, '[URL]');

  // Replace credit cards
  result = result.replace(CREDIT_CARD_REGEX, '[CARD]');

  // Replace SSN
  result = result.replace(SSN_REGEX, '[ID_NUMBER]');

  // Replace Chinese ID
  result = result.replace(CHINESE_ID_REGEX, '[ID_NUMBER]');

  // Replace Chinese phone numbers (before general phone)
  result = result.replace(CHINESE_PHONE_REGEX, '[PHONE]');

  // Replace IPs
  result = result.replace(IP_REGEX, '[IP]');

  // Replace remaining phone patterns (be less aggressive to avoid dates)
  result = result.replace(PHONE_REGEX, (match) => {
    // Only replace if it looks like a real phone number (7+ digits)
    const digits = match.replace(/\D/g, '');
    return digits.length >= 7 ? '[PHONE]' : match;
  });

  return result;
}

/**
 * Anonymize multimodal content. Only text blocks are anonymized; images are passed through.
 */
function anonymizeContent(content: MessageContent): MessageContent {
  if (typeof content === 'string') return anonymizeText(content);
  return content.map((block: ChatContentBlock) => {
    if (block.type === 'text') {
      return { ...block, text: anonymizeText(block.text) };
    }
    // Image blocks pass through unchanged
    return block;
  });
}

/**
 * Anonymize an array of chat messages.
 * Only anonymizes text content, preserves role and image blocks.
 */
export function anonymizeMessages(
  messages: ChatMessage[],
): ChatMessage[] {
  return messages.map((m) => ({
    ...m,
    content: anonymizeContent(m.content),
  }));
}

/**
 * Check if data should be anonymized based on subscription tier.
 * Free and Lite tiers have platform data ownership.
 */
export function shouldAnonymize(tier: string): boolean {
  return tier === 'free' || tier === 'lite';
}
