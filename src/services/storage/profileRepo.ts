import { randomUUID } from 'expo-crypto';
import { getDatabase } from './database';
import { encryptText, decryptText } from './encryption';
import type { CoreProfile, ProfileCategory } from '../../types/memory';

export async function getAllProfiles(): Promise<CoreProfile[]> {
  const db = await getDatabase();
  const rows = (await db.getAllAsync(
    'SELECT * FROM core_profiles ORDER BY confidence DESC, updated_at DESC',
  )) as any[];
  return Promise.all(rows.map(toProfile));
}

export async function getProfileByKey(key: string): Promise<CoreProfile | null> {
  const db = await getDatabase();
  const row = (await db.getFirstAsync(
    'SELECT * FROM core_profiles WHERE key = ?', [key],
  )) as any | null;
  return row ? toProfile(row) : null;
}

/**
 * Upsert a profile with dedup and conflict detection:
 * 1. Exact key match → update existing (boost confidence + merge content)
 * 2. Same-category fuzzy title match → merge into existing (prevent duplicates like "pet_momo" vs "pet_name")
 * 3. No match → insert new
 */
export async function upsertProfile(profile: {
  key: string;
  category: ProfileCategory;
  title: string;
  content: string;
  confidence: number;
  mentionCount: number;
}): Promise<void> {
  const db = await getDatabase();

  // 1. Exact key match
  const existing = await getProfileByKey(profile.key);
  if (existing) {
    const newConfidence = Math.min(1, existing.confidence + 0.1);
    const newMentionCount = existing.mentionCount + 1;
    // If content changed, append diff; if same, just boost confidence
    const contentChanged = existing.content.trim() !== profile.content.trim();
    const mergedContent = contentChanged ? profile.content : existing.content;
    const encrypted = await encryptText(mergedContent);
    await db.runAsync(
      `UPDATE core_profiles SET content = ?, title = ?, confidence = ?, mention_count = ?, updated_at = datetime('now') WHERE key = ?`,
      [encrypted, profile.title, newConfidence, newMentionCount, profile.key],
    );
    return;
  }

  // 2. Fuzzy dedup: check for same-category profiles with similar title
  const duplicate = await findSimilarProfile(profile.category, profile.title, profile.content);
  if (duplicate) {
    const newConfidence = Math.min(1, duplicate.confidence + 0.15);
    const newMentionCount = duplicate.mentionCount + 1;
    // New info supersedes old content
    const encrypted = await encryptText(profile.content);
    await db.runAsync(
      `UPDATE core_profiles SET content = ?, title = ?, confidence = ?, mention_count = ?, updated_at = datetime('now') WHERE id = ?`,
      [encrypted, profile.title, newConfidence, newMentionCount, duplicate.id],
    );
    return;
  }

  // 3. No match — insert new
  const id = randomUUID();
  const encrypted = await encryptText(profile.content);
  await db.runAsync(
    `INSERT INTO core_profiles (id, key, category, title, content, confidence, mention_count) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, profile.key, profile.category, profile.title, encrypted, profile.confidence, profile.mentionCount],
  );
}

/**
 * Find a similar profile in the same category using keyword overlap.
 * Prevents duplicates like "工作_字节" and "工作_bytedance" or "宠物_momo" and "pet_momo".
 */
async function findSimilarProfile(
  category: ProfileCategory,
  title: string,
  content: string,
): Promise<CoreProfile | null> {
  const db = await getDatabase();
  const rows = (await db.getAllAsync(
    'SELECT * FROM core_profiles WHERE category = ?',
    [category],
  )) as any[];

  if (rows.length === 0) return null;

  const inputWords = extractComparisonTokens(title + ' ' + content);
  if (inputWords.length === 0) return null;

  let bestMatch: { row: any; score: number } | null = null;

  for (const row of rows) {
    const existingContent = await decryptText(row.content);
    const existingWords = extractComparisonTokens(row.title + ' ' + existingContent);
    if (existingWords.length === 0) continue;

    // Compute Jaccard-like overlap
    const intersection = inputWords.filter((w) => existingWords.includes(w)).length;
    const union = new Set([...inputWords, ...existingWords]).size;
    const score = intersection / union;

    // Threshold: 40% overlap in the same category = likely duplicate
    if (score >= 0.4 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { row, score };
    }
  }

  return bestMatch ? toProfile(bestMatch.row) : null;
}

/**
 * Extract comparison tokens from a string (Chinese chars + English words + numbers).
 */
function extractComparisonTokens(text: string): string[] {
  const lower = text.toLowerCase();
  // Split on non-word characters, then add individual Chinese characters
  const words = lower.match(/[a-z0-9]+/g) || [];
  const chars = lower.match(/[\u4e00-\u9fff]/g) || [];
  return [...new Set([...words, ...chars])].filter((t) => t.length > 0);
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
  if (updates.content !== undefined) { fields.push('content = ?'); values.push(await encryptText(updates.content)); }
  if (updates.confidence !== undefined) { fields.push('confidence = ?'); values.push(updates.confidence); }
  if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
  fields.push("updated_at = datetime('now')");

  if (fields.length > 1) {
    values.push(id);
    await db.runAsync(`UPDATE core_profiles SET ${fields.join(', ')} WHERE id = ?`, values);
  }
}

async function toProfile(row: any): Promise<CoreProfile> {
  return {
    id: row.id,
    key: row.key,
    category: row.category as ProfileCategory,
    title: row.title,
    content: await decryptText(row.content),
    confidence: row.confidence ?? 0.5,
    mentionCount: row.mention_count ?? 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
