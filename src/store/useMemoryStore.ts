import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import type { MemoryEntry, MemoryCategory, CoreProfile, EpisodicMemory, SessionSummary } from '../types/memory';
import * as memoryRepo from '../services/storage/memoryRepo';
import * as profileRepo from '../services/storage/profileRepo';
import * as episodeRepo from '../services/storage/episodeRepo';
import * as summaryRepo from '../services/storage/summaryRepo';
import { expandWithSynonyms, extractKeywords, EMOTION_LABELS } from '../services/ai/synonymDict';
import { logError } from '../utils/errorLogger';

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
    }).catch(logError('memory', 'upsertProfile'));
  },

  updateProfile: (id, updates) => {
    set((state) => ({
      profiles: state.profiles.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p,
      ),
    }));
    profileRepo.updateProfile(id, updates).catch(logError('memory', 'updateProfile'));
  },

  deleteProfile: (id) => {
    set((state) => ({ profiles: state.profiles.filter((p) => p.id !== id) }));
    profileRepo.deleteProfile(id).catch(logError('memory', 'deleteProfile'));
  },

  // ── Episode operations ──
  deleteEpisode: (id) => {
    set((state) => ({ episodes: state.episodes.filter((e) => e.id !== id) }));
    episodeRepo.deleteEpisode(id).catch(logError('memory', 'deleteEpisode'));
  },

  // ── Legacy operations ──
  addMemory: (category, title, content) => {
    const now = new Date().toISOString();
    const entry: MemoryEntry = { id: randomUUID(), category, title, content, createdAt: now, updatedAt: now };
    set((state) => ({ memories: [...state.memories, entry] }));
    memoryRepo.insertMemory(entry).catch(logError('memory', 'insertLegacyMemory'));
  },

  addMemories: (entries) => {
    const now = new Date().toISOString();
    const newEntries: MemoryEntry[] = entries.map((e) => ({
      id: randomUUID(), category: e.category, title: e.title, content: e.content,
      createdAt: now, updatedAt: now,
    }));
    set((state) => ({ memories: [...state.memories, ...newEntries] }));
    memoryRepo.insertMemories(newEntries).catch(logError('memory', 'insertLegacyMemories'));
  },

  updateMemory: (id, updates) => {
    set((state) => ({
      memories: state.memories.map((m) =>
        m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m,
      ),
    }));
    memoryRepo.updateMemory(id, updates).catch(logError('memory', 'updateLegacyMemory'));
  },

  deleteMemory: (id) => {
    set((state) => ({ memories: state.memories.filter((m) => m.id !== id) }));
    memoryRepo.deleteMemory(id).catch(logError('memory', 'deleteLegacyMemory'));
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

  // ── Formatted context builders (optimized for AI comprehension) ──
  getFormattedContext: () => {
    const { profiles, memories } = get();

    // Common entry shape for formatting
    type FormattedEntry = { category: string; title: string; content: string; importance: number; mentionCount: number };

    // Prefer V2 profiles if available, fall back to legacy
    const allEntries: FormattedEntry[] = profiles.length > 0
      ? profiles.map((p) => ({ category: p.category, title: p.title, content: p.content, importance: 3, mentionCount: p.mentionCount }))
      : memories.map((m) => ({ category: m.category, title: m.title, content: m.content, importance: 3, mentionCount: 1 }));

    if (allEntries.length === 0) return '';

    // Category labels for display (Chinese, ordered)
    const CATEGORY_LABELS: Record<string, string> = {
      identity: '\u57FA\u672C\u4FE1\u606F',      // 基本信息
      relationship: '\u91CD\u8981\u7684\u4EBA',    // 重要的人
      preference: '\u504F\u597D\u4E60\u60EF',      // 偏好习惯
      trait: '\u6027\u683C\u7279\u70B9',           // 性格特点
      event: '\u8FD1\u671F\u4E8B\u4EF6',          // 近期事件
      // Legacy category mappings
      people: '\u91CD\u8981\u7684\u4EBA',
      events: '\u8FD1\u671F\u4E8B\u4EF6',
      emotions: '\u60C5\u7EEA\u4F53\u9A8C',       // 情绪体验
      preferences: '\u504F\u597D\u4E60\u60EF',
    };

    // Fixed display order
    const ORDER = ['\u57FA\u672C\u4FE1\u606F', '\u6027\u683C\u7279\u70B9', '\u91CD\u8981\u7684\u4EBA', '\u504F\u597D\u4E60\u60EF', '\u8FD1\u671F\u4E8B\u4EF6', '\u60C5\u7EEA\u4F53\u9A8C'];

    const grouped: Record<string, typeof allEntries> = {};
    allEntries.forEach((e) => {
      const label = CATEGORY_LABELS[e.category] || e.category;
      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(e);
    });

    let ctx = '';
    for (const label of ORDER) {
      const entries = grouped[label];
      if (!entries || entries.length === 0) continue;
      ctx += `\n### ${label}\n`;
      // Sort by importance desc, then mention count desc
      entries.sort((a, b) => (b.importance || 3) - (a.importance || 3) || (b.mentionCount || 1) - (a.mentionCount || 1));
      entries.forEach((e) => {
        ctx += `- ${e.title}: ${e.content}\n`;
      });
    }

    return ctx.trim();
  },

  getRelevantContext: (recentMessages: string[]) => {
    return get().buildMemoryContext(recentMessages);
  },
}));
