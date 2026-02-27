export interface Session {
  id: string;
  title: string;
  sessionNumber: number;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  lastMessage?: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  model?: string;
  tokensUsed?: number;
}
