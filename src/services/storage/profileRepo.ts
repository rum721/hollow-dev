import { randomUUID } from 'expo-crypto';
import { getDatabase } from './database';
import { encryptSync, decryptSync } from './encryption';
import type { CoreProfile, ProfileCategory } from '../../types/memory';

export async function getAllProfiles(): Promise<CoreProfile[]> {
  const db = await getDatabase();
  const rows = (await db.getAllAsync(
    'SELECT * FROM core_profiles ORDER BY confidence DESC, updated_at DESC',
  )) as any[];
  return rows.map(toProfile);
}

export async function getProfileByKey(key: string): Promise<CoreProfile | null> {
  const db = await getDatabase();
  const row = (await db.getFirstAsync(
    'SELECT * FROM core_profiles WHERE key = ?', [key],
  )) as any | null;
  return row ? toProfile(row) : null;
}

export async function upsertProfile(profile: {
  key: string;
  category: ProfileCategory;
  title: string;
  content: string;
  confidence: number;
  mentionCount: number;
}): Promise<void> {
  const db = await getDatabase();
  const existing = await getProfileByKey(profile.key);

  if (existing) {
    // Update existing profile: merge content, bump confidence & mention count
    const newConfidence = Math.min(1, existing.confidence + 0.1);
    const newMentionCount = existing.mentionCount + 1;
    await db.runAsync(
      `UPDATE core_profiles SET content = ?, title = ?, confidence = ?, mention_count = ?, updated_at = datetime('now') WHERE key = ?`,
      [encryptSync(profile.content), profile.title, newConfidence, newMentionCount, profile.key],
    );
  } else {
    // Insert new profile
    const id = randomUUID();
    await db.runAsync(
      `INSERT INTO core_profiles (id, key, category, title, content, confidence, mention_count) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, profile.key, profile.category, profile.title, encryptSync(profile.content), profile.confidence, profile.mentionCount],
    );
  }
}

export async function deleteProfile(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM core_profiles WHERE id = ?', [id]);
}

export async function updateProfile(id: string, updates: Partial<CoreProfile>): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.content !== undefined) { fields.push('content = ?'); values.push(encryptSync(updates.content)); }
  if (updates.confidence !== undefined) { fields.push('confidence = ?'); values.push(updates.confidence); }
  if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
  fields.push("updated_at = datetime('now')");

  if (fields.length > 1) {
    values.push(id);
    await db.runAsync(`UPDATE core_profiles SET ${fields.join(', ')} WHERE id = ?`, values);
  }
}

function toProfile(row: any): CoreProfile {
  return {
    id: row.id,
    key: row.key,
    category: row.category as ProfileCategory,
    title: row.title,
    content: decryptSync(row.content),
    confidence: row.confidence ?? 0.5,
    mentionCount: row.mention_count ?? 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
