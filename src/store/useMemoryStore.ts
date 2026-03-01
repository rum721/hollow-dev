import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import type { MemoryEntry, MemoryCategory, CoreProfile, EpisodicMemory, SessionSummary } from '../types/memory';
import * as memoryRepo from '../services/storage/memoryRepo';
import * as profileRepo from '../services/storage/profileRepo';
import * as episodeRepo from '../services/storage/episodeRepo';
import * as summaryRepo from '../services/storage/summaryRepo';
import { expandWithSynonyms, extractKeywords, EMOTION_LABELS } from '../services/ai/synonymDict';

/** Cache TTL: 5 minutes */
const CACHE_TTL = 300_000;

interface MemoryState {
  // V2 three-layer data
  profiles: CoreProfile[];
  episodes: EpisodicMemory[];
  recentSummaries: SessionSummary[];

  // Legacy (backward-compatible)
  memories: MemoryEntry[];
  isLoading: boolean;
  lastLoadTime: number;

  // Load
  loadAll: () => Promise<void>;
  loadMemories: () => Promise<void>;
  invalidateCache: () => void;

  // Profile operations
  addProfile: (profile: Omit<CoreProfile, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProfile: (id: string, updates: Partial<CoreProfile>) => void;
  deleteProfile: (id: string) => void;

  // Episode operations
  deleteEpisode: (id: string) => void;

  // Legacy operations
  addMemory: (category: MemoryCategory, title: string, content: string) => void;
  addMemories: (entries: Array<{ category: MemoryCategory; title: string; content: string }>) => void;
  updateMemory: (id: string, updates: Partial<MemoryEntry>) => void;
  deleteMemory: (id: string) => void;

  // Context builders
  buildMemoryContext: (recentMessages: string[]) => string;
  getFormattedContext: () => string;
  getRelevantContext: (recentMessages: string[]) => string;
}

// ── Helper: relative time label ──
function daysBetween(d1: Date, d2: Date): number {
  return Math.floor(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function getTimeLabel(dateStr: string): string {
  const days = daysBetween(new Date(dateStr), new Date());
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days <= 7) return `${days}天前`;
  if (days <= 30) return `${Math.floor(days / 7)}周前`;
  return `${Math.floor(days / 30)}个月前`;
}

// ── Helper: retrieve relevant episodes ──
function getRelevantEpisodes(
  recentMessages: string[],
  episodes: EpisodicMemory[],
  maxCount: number = 6,
): EpisodicMemory[] {
  const keywords = extractKeywords(recentMessages);
  const expandedKeywords = expandWithSynonyms(keywords);

  const scored = episodes.map((ep) => {
    const text = ep.content.toLowerCase();
    let keywordScore = 0;
    for (const kw of expandedKeywords) {
      if (text.includes(kw)) keywordScore += 1;
    }

    const days = daysBetween(new Date(ep.eventDate || ep.createdAt), new Date());
    const timeDecay = Math.exp(-0.02 * days);
    const emotionBoost = ep.intensity >= 4 ? 1.5 : 1.0;
    const recencyBonus = days <= 3 ? 0.5 : 0;

    return {
      episode: ep,
      score: (keywordScore + recencyBonus) * timeDecay * emotionBoost,
    };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCount)
    .map((s) => s.episode);
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  profiles: [],
  episodes: [],
  recentSummaries: [],
  memories: [],
  isLoading: false,
  lastLoadTime: 0,

  loadAll: async () => {
    const now = Date.now();
    if (get().lastLoadTime && now - get().lastLoadTime < CACHE_TTL) return;
    set({ isLoading: true });
    try {
      const [profiles, episodes, summaries, memories] = await Promise.all([
        profileRepo.getAllProfiles(),
        episodeRepo.getRecentEpisodes(100),
        summaryRepo.getRecentSummaries(5),
        memoryRepo.getAllMemories(),
      ]);
      set({
        profiles,
        episodes,
        recentSummaries: summaries,
        memories,
        isLoading: false,
        lastLoadTime: now,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  loadMemories: async () => get().loadAll(),

  invalidateCache: () => set({ lastLoadTime: 0 }),

  // ── Profile operations ──
  addProfile: (profile) => {
    profileRepo.upsertProfile(profile).then(() => {
      get().invalidateCache();
      get().loadAll();
    }).catch(() => {});
  },

  updateProfile: (id, updates) => {
    set((state) => ({
      profiles: state.profiles.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p,
      ),
    }));
    profileRepo.updateProfile(id, updates).catch(() => {});
  },

  deleteProfile: (id) => {
    set((state) => ({ profiles: state.profiles.filter((p) => p.id !== id) }));
    profileRepo.deleteProfile(id).catch(() => {});
  },

  // ── Episode operations ──
  deleteEpisode: (id) => {
    set((state) => ({ episodes: state.episodes.filter((e) => e.id !== id) }));
    episodeRepo.deleteEpisode(id).catch(() => {});
  },

  // ── Legacy operations ──
  addMemory: (category, title, content) => {
    const now = new Date().toISOString();
    const entry: MemoryEntry = { id: randomUUID(), category, title, content, createdAt: now, updatedAt: now };
    set((state) => ({ memories: [...state.memories, entry] }));
    memoryRepo.insertMemory(entry).catch(() => {});
  },

  addMemories: (entries) => {
    const now = new Date().toISOString();
    const newEntries: MemoryEntry[] = entries.map((e) => ({
      id: randomUUID(), category: e.category, title: e.title, content: e.content,
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

  // ── V2 context builder (three-layer) ──
  buildMemoryContext: (recentMessages: string[]) => {
    const { profiles, episodes, recentSummaries } = get();
    let context = '';

    // Layer 1: Core profiles (full inject, sorted by confidence)
    if (profiles.length > 0) {
      const sorted = [...profiles]
        .filter((p) => p.confidence > 0.3)
        .sort((a, b) => b.confidence - a.confidence);
      if (sorted.length > 0) {
        context += '\n### 核心画像\n';
        sorted.forEach((p) => {
          context += `- ${p.title}: ${p.content}\n`;
        });
      }
    }

    // Layer 2: Relevant episodic memories (top 6)
    const relevantEpisodes = getRelevantEpisodes(recentMessages, episodes, 6);
    if (relevantEpisodes.length > 0) {
      context += '\n### 最近发生的事\n';
      relevantEpisodes.forEach((ep) => {
        const timeLabel = getTimeLabel(ep.eventDate || ep.createdAt);
        const emotionLabel = EMOTION_LABELS[ep.emotion] || '';
        context += `- [${timeLabel}] ${ep.content}${emotionLabel ? ` (${emotionLabel})` : ''}\n`;
      });
    }

    // Layer 3: Recent session summaries (last 3)
    if (recentSummaries.length > 0) {
      context += '\n### 最近对话脉络\n';
      recentSummaries.slice(0, 3).forEach((s, i) => {
        const label = i === 0 ? '上一次对话' : i === 1 ? '再上一次' : '更早';
        context += `- ${label}: ${s.summary}\n`;
      });
    }

    return context.trim();
  },

  // ── Legacy context builders ──
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
    return get().buildMemoryContext(recentMessages);
  },
}));
