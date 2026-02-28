import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { MemoryEntry, MemoryCategory } from '../types/memory';
import * as memoryRepo from '../services/storage/memoryRepo';

/** Cache TTL: 5 minutes */
const CACHE_TTL = 300_000;

interface MemoryState {
  memories: MemoryEntry[];
  isLoading: boolean;
  lastLoadTime: number;

  loadMemories: () => Promise<void>;
  invalidateCache: () => void;
  addMemory: (category: MemoryCategory, title: string, content: string) => void;
  addMemories: (entries: Array<{ category: MemoryCategory; title: string; content: string }>) => void;
  updateMemory: (id: string, updates: Partial<MemoryEntry>) => void;
  deleteMemory: (id: string) => void;
  getFormattedContext: () => string;
  getRelevantContext: (recentMessages: string[]) => string;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],
  isLoading: false,
  lastLoadTime: 0,

  loadMemories: async () => {
    const now = Date.now();
    if (get().lastLoadTime && now - get().lastLoadTime < CACHE_TTL) return;
    set({ isLoading: true });
    try {
      const memories = await memoryRepo.getAllMemories();
      set({ memories, isLoading: false, lastLoadTime: now });
    } catch {
      set({ isLoading: false });
    }
  },

  invalidateCache: () => set({ lastLoadTime: 0 }),

  addMemory: (category, title, content) => {
    const now = new Date().toISOString();
    const entry: MemoryEntry = { id: uuid(), category, title, content, createdAt: now, updatedAt: now };
    set((state) => ({ memories: [...state.memories, entry] }));
    memoryRepo.insertMemory(entry).catch(() => {});
  },

  addMemories: (entries) => {
    const now = new Date().toISOString();
    const newEntries: MemoryEntry[] = entries.map((e) => ({
      id: uuid(), category: e.category, title: e.title, content: e.content,
      createdAt: now, updatedAt: now,
    }));
    set((state) => ({ memories: [...state.memories, ...newEntries] }));
    memoryRepo.insertMemories(newEntries).catch(() => {});
  },

  updateMemory: (id, updates) => {
    set((state) => ({
      memories: state.memories.map((m) =>
        m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m,
      ),
    }));
    memoryRepo.updateMemory(id, updates).catch(() => {});
  },

  deleteMemory: (id) => {
    set((state) => ({ memories: state.memories.filter((m) => m.id !== id) }));
    memoryRepo.deleteMemory(id).catch(() => {});
  },

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

  getRelevantContext: (recentMessages: string[]) => {
    const { memories, getFormattedContext } = get();
    if (memories.length === 0) return '';
    if (memories.length <= 10) return getFormattedContext();

    // Stop words to filter out
    const chineseStopWords = new Set(
      '的,了,是,在,我,你,他,她,它,们,个,和,与,也,都,就,不,有,这,那,要,会,可以,很,吧,呢,啊,吗'.split(',')
    );
    const englishStopWords = new Set(
      'the,a,an,is,are,was,were,be,been,being,have,has,had,do,does,did,will,would,shall,should,may,might,can,could,i,you,he,she,it,we,they,me,him,her,us,them,my,your,his,its,our,their,this,that,these,those,what,which,who,whom,and,but,or,not,no,so,if,at,by,for,with,about,to,from,in,on,of'.split(',')
    );

    // Extract keywords from recent messages
    const keywords: string[] = [];
    for (const msg of recentMessages.slice(-3)) {
      // Split on whitespace and common Chinese punctuation boundaries
      const tokens = msg.toLowerCase().split(/[\s,，。！？、；：""''（）《》\[\]{}·~!@#$%^&*()+=|\\/<>?;:'"]+/);
      for (const token of tokens) {
        const trimmed = token.trim();
        if (
          trimmed.length > 0 &&
          !chineseStopWords.has(trimmed) &&
          !englishStopWords.has(trimmed)
        ) {
          keywords.push(trimmed);
        }
      }
    }

    // If no meaningful keywords extracted, fall back to all memories
    if (keywords.length === 0) return getFormattedContext();

    // Score each memory by keyword matches in title + content
    const scored = memories.map((m) => {
      const text = `${m.title} ${m.content}`.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (text.includes(kw)) {
          score += 1;
        }
      }
      return { memory: m, score };
    });

    // Sort by score descending, take top 10
    scored.sort((a, b) => b.score - a.score);
    const topMemories = scored.slice(0, 10).filter((s) => s.score > 0);

    // If no memories matched any keywords, fall back to all
    if (topMemories.length === 0) return getFormattedContext();

    // Format the same way as getFormattedContext
    const grouped: Record<string, MemoryEntry[]> = {};
    topMemories.forEach(({ memory: m }) => {
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
