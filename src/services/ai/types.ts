// ── Multimodal content block types ──

export interface ChatTextBlock {
  type: 'text';
  text: string;
}

/** Anthropic-style image block (internal standard format) */
export interface ChatImageBlock {
  type: 'image';
  source: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export type ChatContentBlock = ChatTextBlock | ChatImageBlock;

/** Message content: string (text-only, backward compatible) or ContentBlock[] (multimodal) */
export type MessageContent = string | ChatContentBlock[];

// ── Chat message (transport type for AI APIs) ──

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'developer';
  content: MessageContent;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: Error) => void;
}

export interface RequestOptions {
  store?: boolean;
  maxTokens?: number;
}
