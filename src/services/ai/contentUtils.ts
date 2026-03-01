import type { ChatContentBlock, ChatTextBlock, MessageContent } from './types';

/**
 * Extract plain text from multimodal content.
 * Returns the string directly if content is already a string,
 * or concatenates all text blocks if content is a ContentBlock[].
 */
export function textOf(content: MessageContent): string {
  if (typeof content === 'string') return content;
  return content
    .filter((b): b is ChatTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

/**
 * Check if multimodal content contains any image blocks.
 */
export function hasImageBlocks(content: MessageContent): boolean {
  if (typeof content === 'string') return false;
  return content.some((b) => b.type === 'image');
}

/**
 * Convert multimodal content to Anthropic wire format.
 * Anthropic natively uses our internal format, so this is a passthrough.
 */
export function toAnthropicContent(content: MessageContent): MessageContent {
  return content;
}

/**
 * Convert internal (Anthropic) format to OpenAI wire format.
 * - TextBlocks → pass through
 * - ImageBlocks → convert to image_url with data URI
 * - String → pass through
 */
export function toOpenAIContent(content: MessageContent): string | any[] {
  if (typeof content === 'string') return content;

  // If all blocks are text, collapse to a single string for max compatibility
  const hasImages = content.some((b) => b.type === 'image');
  if (!hasImages) {
    return content
      .filter((b): b is ChatTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
  }

  return content.map((block) => {
    if (block.type === 'text') {
      return { type: 'text', text: block.text };
    }
    if (block.type === 'image') {
      return {
        type: 'image_url',
        image_url: {
          url: `data:${block.source.media_type};base64,${block.source.data}`,
          detail: 'low', // 'low' reduces token cost (~85 tokens vs ~765)
        },
      };
    }
    return { type: 'text', text: '' };
  });
}
