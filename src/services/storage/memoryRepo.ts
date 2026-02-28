import { getDatabase } from './database';
import type { MemoryEntry, MemoryCategory } from '../../types/memory';

export async function getAllMemories(): Promise<MemoryEntry[]> {
  const db = await getDatabase();
  const rows = (await db.getAllAsync(
    'SELECT * FROM memory_entries ORDER BY updated_at DESC',
  )) as {
    id: string; category: string; title: string;
    content: string; created_at: string; updated_at: string;
  }[];
  return rows.map(toMemoryEntry);
}

export async function insertMemory(entry: MemoryEntry): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO memory_entries (id, category, title, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [entry.id, entry.category, entry.title, entry.content, entry.createdAt, entry.updatedAt],
  );
}

export async function updateMemory(id: string, updates: Partial<MemoryEntry>): Promise<void> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.content !== undefined) { fields.push('content = ?'); values.push(updates.content); }
  fields.push('updated_at = datetime("now")');

  if (fields.length > 1) {
    values.push(id);
    await db.runAsync(`UPDATE memory_entries SET ${fields.join(', ')} WHERE id = ?`, values);
  }
}

export async function deleteMemory(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM memory_entries WHERE id = ?', [id]);
}

export async function insertMemories(entries: MemoryEntry[]): Promise<void> {
  const db = await getDatabase();
  for (const entry of entries) {
    await insertMemory(entry);
  }
}

function toMemoryEntry(row: any): MemoryEntry {
  return {
    id: row.id,
    category: row.category as MemoryCategory,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
