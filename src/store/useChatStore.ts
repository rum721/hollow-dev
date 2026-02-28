import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { Session, Message, SessionStatus } from '../types/chat';
import * as conversationRepo from '../services/storage/conversationRepo';

interface ChatState {
  sessions: Session[];
  currentSessionId: string | null;
  messages: Record<string, Message[]>;
  isStreaming: boolean;
  streamingText: string;
  isLoaded: boolean;

  loadSessions: () => Promise<void>;
  loadMessages: (sessionId: string) => Promise<void>;
  createSession: () => Promise<string>;
  setCurrentSession: (id: string | null) => void;
  addUserMessage: (sessionId: string, content: string) => void;
  appendStreamToken: (token: string) => void;
  finalizeAssistantMessage: (sessionId: string, overrideText?: string) => void;
  setStreaming: (val: boolean) => void;
  deleteSession: (id: string) => void;
  archiveSession: (id: string) => void;
  destroySession: (id: string) => void;
  restoreSession: (id: string) => void;
  getManusTaskId: (sessionId: string) => string | undefined;
  setManusTaskId: (sessionId: string, taskId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: {},
  isStreaming: false,
  streamingText: '',
  isLoaded: false,

  loadSessions: async () => {
    try {
      const sessions = await conversationRepo.getAllSessions('active');
      set({ sessions, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  loadMessages: async (sessionId: string) => {
    try {
      const msgs = await conversationRepo.getMessagesForSession(sessionId);
      set((state) => ({
        messages: { ...state.messages, [sessionId]: msgs },
      }));
    } catch {}
  },

  createSession: async () => {
    const count = await conversationRepo.getSessionCount().catch(() => get().sessions.length);
    const id = uuid();
    const session: Session = {
      id,
      title: `Session ${count + 1}`,
      sessionNumber: count + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      messageCount: 0,
    };
    set((state) => ({
      sessions: [session, ...state.sessions],
      currentSessionId: id,
      messages: { ...state.messages, [id]: [] },
    }));
    conversationRepo.insertSession(session).catch(() => {});
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
    const msgs = [...(get().messages[sessionId] ?? []), msg];
    set((state) => ({
      messages: { ...state.messages, [sessionId]: msgs },
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, updatedAt: new Date().toISOString(), lastMessage: content, messageCount: msgs.length }
          : s,
      ),
    }));
    conversationRepo.insertMessage(msg).catch(() => {});
    conversationRepo.updateSessionLastMessage(sessionId, content, msgs.length).catch(() => {});
  },

  appendStreamToken: (token) =>
    set((state) => ({ streamingText: state.streamingText + token })),

  finalizeAssistantMessage: (sessionId, overrideText?) => {
    const content = overrideText || get().streamingText;
    if (!content) return;
    const msg: Message = {
      id: uuid(),
      sessionId,
      role: 'assistant',
      content,
      createdAt: new Date().toISOString(),
    };
    const msgs = [...(get().messages[sessionId] ?? []), msg];

    // Auto-generate title from first user message
    const session = get().sessions.find((s) => s.id === sessionId);
    const existingMsgs = get().messages[sessionId] ?? [];
    const isFirstReply = existingMsgs.filter((m) => m.role === 'assistant').length === 0;
    let newTitle = session?.title ?? 'Session';
    if (isFirstReply) {
      const firstUserMsg = existingMsgs.find((m) => m.role === 'user');
      if (firstUserMsg) {
        newTitle = firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '');
      }
    }

    set((state) => ({
      messages: { ...state.messages, [sessionId]: msgs },
      streamingText: '',
      isStreaming: false,
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, title: isFirstReply ? newTitle : s.title, updatedAt: new Date().toISOString(), lastMessage: content, messageCount: msgs.length }
          : s,
      ),
    }));
    conversationRepo.insertMessage(msg).catch(() => {});
    conversationRepo.updateSessionLastMessage(sessionId, content, msgs.length).catch(() => {});
    if (isFirstReply && newTitle !== session?.title) {
      conversationRepo.updateSessionTitle(sessionId, newTitle).catch(() => {});
    }
  },

  setStreaming: (isStreaming) => set({ isStreaming, streamingText: isStreaming ? '' : get().streamingText }),

  deleteSession: (id) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      messages: Object.fromEntries(
        Object.entries(state.messages).filter(([k]) => k !== id),
      ),
      currentSessionId: state.currentSessionId === id ? null : state.currentSessionId,
    }));
    conversationRepo.deleteSessionPermanently(id).catch(() => {});
  },

  archiveSession: (id) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      currentSessionId: state.currentSessionId === id ? null : state.currentSessionId,
    }));
    conversationRepo.updateSessionStatus(id, 'archived').catch(() => {});
  },

  destroySession: (id) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      messages: Object.fromEntries(
        Object.entries(state.messages).filter(([k]) => k !== id),
      ),
      currentSessionId: state.currentSessionId === id ? null : state.currentSessionId,
    }));
    conversationRepo.deleteSessionPermanently(id).catch(() => {});
  },

  restoreSession: (id) => {
    conversationRepo.updateSessionStatus(id, 'active').then(() => {
      get().loadSessions();
    }).catch(() => {});
  },

  getManusTaskId: (sessionId) => {
    return get().sessions.find((s) => s.id === sessionId)?.manusTaskId;
  },

  setManusTaskId: (sessionId, taskId) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, manusTaskId: taskId } : s,
      ),
    }));
    // Persist to database
    conversationRepo.updateManusTaskId(sessionId, taskId).catch(() => {});
  },
}));
