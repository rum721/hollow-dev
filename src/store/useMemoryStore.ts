import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { MemoryEntry, MemoryCategory } from '../types/memory';

interface MemoryState {
  memories: MemoryEntry[];
  isLoading: boolean;

  loadMemories: () => void;
  addMemory: (category: MemoryCategory, title: string, content: string) => void;
  updateMemory: (id: string, updates: Partial<MemoryEntry>) => void;
  deleteMemory: (id: string) => void;
  getFormattedContext: () => string;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],
  isLoading: false,

  loadMemories: () => {},

  addMemory: (category, title, content) => {
    const now = new Date().toISOString();
    const entry: MemoryEntry = { id: uuid(), category, title, content, createdAt: now, updatedAt: now };
    set((state) => ({ memories: [...state.memories, entry] }));
  },

  updateMemory: (id, updates) =>
    set((state) => ({
      memories: state.memories.map((m) =>
        m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m,
      ),
    })),

  deleteMemory: (id) =>
    set((state) => ({ memories: state.memories.filter((m) => m.id !== id) })),

  getFormattedContext: () => {
    const { memories } = get();
    if (memories.length === 0) return '';
    const grouped: Record<string, MemoryEntry[]> = {};
    memories.forEach((m) => {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push(m);
    });
    let ctx = '';
    for (const [cat, entries] of Object.entries(grouped)) {
      ctx += `\n## ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n`;
      entries.forEach((e) => { ctx += `- ${e.title}: ${e.content}\n`; });
    }
    return ctx.trim();
  },
}));
