import { randomUUID } from 'expo-crypto';
import { getDatabase } from './database';
import { encryptSync, decryptSync } from './encryption';
import type { EpisodicMemory, EmotionTag } from '../../types/memory';

export async function getRecentEpisodes(limit: number = 50): Promise<EpisodicMemory[]> {
  const db = await getDatabase();
  const rows = (await db.getAllAsync(
    'SELECT * FROM episodic_memories ORDER BY created_at DESC LIMIT ?', [limit],
  )) as any[];
  return rows.map(toEpisode);
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
  return rows.map(toEpisode);
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
  await db.runAsync(
    `INSERT INTO episodic_memories (id, session_id, content, emotion, intensity, event_date, decay_weight) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, episode.sessionId, encryptSync(episode.content), episode.emotion, episode.intensity, episode.eventDate, episode.decayWeight],
  );
}

export async function deleteEpisode(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM episodic_memories WHERE id = ?', [id]);
}

/**
 * Batch update decay weights for all episodic memories.
 * Formula: decayWeight = e^(-λ * daysSinceCreation)
 * λ = 0.02 (35-day half-life), halved for high-intensity emotions.
 */
export async function updateDecayWeights(): Promise<void> {
  const db = await getDatabase();
  // Use SQLite's julianday for date math
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

function toEpisode(row: any): EpisodicMemory {
  return {
    id: row.id,
    sessionId: row.session_id,
    content: decryptSync(row.content),
    emotion: (row.emotion || 'neutral') as EmotionTag,
    intensity: row.intensity ?? 3,
    eventDate: row.event_date || row.created_at,
    decayWeight: row.decay_weight ?? 1.0,
    createdAt: row.created_at,
  };
}
