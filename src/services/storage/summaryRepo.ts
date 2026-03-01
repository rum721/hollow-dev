import { randomUUID } from 'expo-crypto';
import { getDatabase } from './database';
import { encryptSync, decryptSync } from './encryption';
import type { SessionSummary } from '../../types/memory';

export async function getRecentSummaries(limit: number = 5): Promise<SessionSummary[]> {
  const db = await getDatabase();
  const rows = (await db.getAllAsync(
    'SELECT * FROM session_summaries ORDER BY created_at DESC LIMIT ?', [limit],
  )) as any[];
  return rows.map(toSummary);
}

export async function getSummaryBySessionId(sessionId: string): Promise<SessionSummary | null> {
  const db = await getDatabase();
  const row = (await db.getFirstAsync(
    'SELECT * FROM session_summaries WHERE session_id = ?', [sessionId],
  )) as any | null;
  return row ? toSummary(row) : null;
}

export async function insertSummary(summary: {
  sessionId: string;
  summary: string;
  keyTopics: string[];
  mood: string;
}): Promise<void> {
  const db = await getDatabase();
  const id = randomUUID();
  await db.runAsync(
    `INSERT OR IGNORE INTO session_summaries (id, session_id, summary, key_topics, mood) VALUES (?, ?, ?, ?, ?)`,
    [id, summary.sessionId, encryptSync(summary.summary), JSON.stringify(summary.keyTopics), summary.mood],
  );
}

function toSummary(row: any): SessionSummary {
  let keyTopics: string[] = [];
  try {
    keyTopics = row.key_topics ? JSON.parse(row.key_topics) : [];
  } catch {
    keyTopics = [];
  }

  return {
    id: row.id,
    sessionId: row.session_id,
    summary: decryptSync(row.summary),
    keyTopics,
    mood: row.mood || 'neutral',
    createdAt: row.created_at,
  };
}
