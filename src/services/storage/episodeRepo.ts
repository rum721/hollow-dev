import { randomUUID } from 'expo-crypto';
import { getDatabase } from './database';
import { encryptText, decryptText } from './encryption';
import type { EpisodicMemory, EmotionTag } from '../../types/memory';

export async function getRecentEpisodes(limit: number = 50): Promise<EpisodicMemory[]> {
  const db = await getDatabase();
  const rows = (await db.getAllAsync(
    'SELECT * FROM episodic_memories ORDER BY created_at DESC LIMIT ?', [limit],
  )) as any[];
  return Promise.all(rows.map(toEpisode));
}

export async function getEpisodesByDateRange(
  start: string,
  end: string,
): Promise<EpisodicMemory[]> {
  const db = await getDatabase();
  const rows = (await db.getAllAsync(
    'SELECT * FROM episodic_memories WHERE event_date >= ? AND event_date <= ? ORDER BY event_date DESC',
    [start, end],
  )) as any[];
  return Promise.all(rows.map(toEpisode));
}

export async function insertEpisode(episode: {
  sessionId: string | null;
  content: string;
  emotion: EmotionTag;
  intensity: number;
  eventDate: string;
  decayWeight: number;
}): Promise<void> {
  const db = await getDatabase();
  const id = randomUUID();
  const encrypted = await encryptText(episode.content);
  await db.runAsync(
    `INSERT INTO episodic_memories (id, session_id, content, emotion, intensity, event_date, decay_weight) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, episode.sessionId, encrypted, episode.emotion, episode.intensity, episode.eventDate, episode.decayWeight],
  );
}

export async function deleteEpisode(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM episodic_memories WHERE id = ?', [id]);
}

/**
 * Check if a similar episode already exists for the given date.
 * Uses keyword overlap to detect semantic duplicates like
 * "想念安安" vs "用户在想念他的朋友安安".
 */
export async function findSimilarEpisode(
  content: string,
  eventDate: string,
  threshold: number = 0.4,
): Promise<boolean> {
  const db = await getDatabase();
  const rows = (await db.getAllAsync(
    'SELECT content FROM episodic_memories WHERE event_date = ?',
    [eventDate],
  )) as { content: string }[];

  if (rows.length === 0) return false;

  const inputTokens = extractTokens(content);
  if (inputTokens.length === 0) return false;

  for (const row of rows) {
    const existingContent = await decryptText(row.content);
    const existingTokens = extractTokens(existingContent);
    if (existingTokens.length === 0) continue;

    // Jaccard-like overlap
    const intersection = inputTokens.filter((t) => existingTokens.includes(t)).length;
    const union = new Set([...inputTokens, ...existingTokens]).size;
    if (union > 0 && intersection / union >= threshold) return true;
  }

  return false;
}

/** Extract comparison tokens (Chinese chars + English words) */
function extractTokens(text: string): string[] {
  const lower = text.toLowerCase();
  const words = lower.match(/[a-z0-9]+/g) || [];
  const chars = lower.match(/[\u4e00-\u9fff]/g) || [];
  return [...new Set([...words, ...chars])].filter((t) => t.length > 0);
}

/**
 * Batch update decay weights for all episodic memories.
 * Formula: decayWeight = e^(-λ * daysSinceCreation)
 * λ = 0.02 (35-day half-life), halved for high-intensity emotions.
 */
export async function updateDecayWeights(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    UPDATE episodic_memories SET decay_weight =
      CASE
        WHEN intensity >= 4
        THEN EXP(-0.01 * (julianday('now') - julianday(COALESCE(event_date, created_at))))
        ELSE EXP(-0.02 * (julianday('now') - julianday(COALESCE(event_date, created_at))))
      END
    WHERE decay_weight > 0.01;
  `);
}

/**
 * Remove very old episodes with negligible decay weight.
 */
export async function pruneDecayedEpisodes(threshold: number = 0.05): Promise<number> {
  const db = await getDatabase();
  await updateDecayWeights();
  const result = await db.runAsync(
    'DELETE FROM episodic_memories WHERE decay_weight < ?', [threshold],
  );
  return result?.changes ?? 0;
}

async function toEpisode(row: any): Promise<EpisodicMemory> {
  return {
    id: row.id,
    sessionId: row.session_id,
    content: await decryptText(row.content),
    emotion: (row.emotion || 'neutral') as EmotionTag,
    intensity: row.intensity ?? 3,
    eventDate: row.event_date || row.created_at,
    decayWeight: row.decay_weight ?? 1.0,
    createdAt: row.created_at,
  };
}
