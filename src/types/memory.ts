// ── Legacy types (backward-compatible) ──
export type MemoryCategory = 'people' | 'events' | 'emotions' | 'preferences';

export interface MemoryEntry {
  id: string;
  category: MemoryCategory;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ── V2: Three-layer memory architecture ──

// Layer 1: Core Profile (stable user info, merged on update)
export type ProfileCategory = 'identity' | 'relationship' | 'preference' | 'trait';

export interface CoreProfile {
  id: string;
  key: string;           // Unique identifier, e.g. "pet_momo", "girlfriend_anan"
  category: ProfileCategory;
  title: string;
  content: string;
  confidence: number;    // 0-1
  mentionCount: number;
  createdAt: string;
  updatedAt: string;
}

// Layer 2: Episodic Memory (events/emotions with time decay)
export type EmotionTag =
  | 'happy' | 'sad' | 'anxious' | 'angry'
  | 'excited' | 'calm' | 'frustrated' | 'hopeful'
  | 'neutral';

export interface EpisodicMemory {
  id: string;
  sessionId: string | null;
  content: string;
  emotion: EmotionTag;
  intensity: number;     // 1-5
  eventDate: string;
  decayWeight: number;   // 0-1, initial 1.0
  createdAt: string;
}

// Layer 3: Session Summary (auto-generated when leaving a session)
export interface SessionSummary {
  id: string;
  sessionId: string;
  summary: string;
  keyTopics: string[];
  mood: string;
  createdAt: string;
}
