export type SessionStatus = 'active' | 'archived' | 'destroyed';

export interface Session {
  id: string;
  title: string;
  sessionNumber: number;
  createdAt: string;
  updatedAt: string;
  status: SessionStatus;
  lastMessage?: string;
  messageCount?: number;
  manusTaskId?: string;
}

// ── Image attachment (stored with Message, not base64) ──
export interface ImageAttachment {
  uri: string;           // local file:// path to compressed image
  width: number;
  height: number;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  metadata?: MessageMetadata;
  imageAttachments?: ImageAttachment[];  // optional image data
}

export interface MessageMetadata {
  model?: string;
  tokensUsed?: number;
}
