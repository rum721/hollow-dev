import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { Session, Message } from '../types/chat';

interface ChatState {
  sessions: Session[];
  currentSessionId: string | null;
  messages: Record<string, Message[]>;
  isStreaming: boolean;
  streamingText: string;

  loadSessions: () => void;
  createSession: () => string;
  setCurrentSession: (id: string | null) => void;
  addUserMessage: (sessionId: string, content: string) => void;
  appendStreamToken: (token: string) => void;
  finalizeAssistantMessage: (sessionId: string) => void;
  setStreaming: (val: boolean) => void;
  deleteSession: (id: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: {},
  isStreaming: false,
  streamingText: '',

  loadSessions: () => {},

  createSession: () => {
    const id = uuid();
    const sessionNumber = get().sessions.length + 1;
    const session: Session = {
      id,
      title: `Session ${sessionNumber}`,
      sessionNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isArchived: false,
    };
    set((state) => ({
      sessions: [session, ...state.sessions],
      currentSessionId: id,
      messages: { ...state.messages, [id]: [] },
    }));
    return id;
  },

  setCurrentSession: (id) => set({ currentSessionId: id }),

  addUserMessage: (sessionId, content) => {
    const msg: Message = {
      id: uuid(),
      sessionId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: [...(state.messages[sessionId] ?? []), msg],
      },
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, updatedAt: new Date().toISOString(), lastMessage: content }
          : s,
      ),
    }));
  },

  appendStreamToken: (token) =>
    set((state) => ({ streamingText: state.streamingText + token })),

  finalizeAssistantMessage: (sessionId) => {
    const { streamingText } = get();
    if (!streamingText) return;
    const msg: Message = {
      id: uuid(),
      sessionId,
      role: 'assistant',
      content: streamingText,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: [...(state.messages[sessionId] ?? []), msg],
      },
      streamingText: '',
      isStreaming: false,
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, updatedAt: new Date().toISOString(), lastMessage: streamingText }
          : s,
      ),
    }));
  },

  setStreaming: (isStreaming) => set({ isStreaming, streamingText: isStreaming ? '' : get().streamingText }),

  deleteSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      messages: Object.fromEntries(
        Object.entries(state.messages).filter(([k]) => k !== id),
      ),
      currentSessionId: state.currentSessionId === id ? null : state.currentSessionId,
    })),
}));
