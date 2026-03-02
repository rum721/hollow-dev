import { getDatabase } from './database';
import { encryptText, decryptText } from './encryption';
import { deleteAsync } from 'expo-file-system/legacy';
import { logError } from '../../utils/errorLogger';
import type { Session, Message, SessionStatus, ImageAttachment } from '../../types/chat';

// ─── Sessions ────────────────────────────────────────────

export async function getAllSessions(status: SessionStatus = 'active'): Promise<Session[]> {
  const db = await getDatabase();
  const rows = (await db.getAllAsync(
    'SELECT * FROM sessions WHERE status = ? ORDER BY updated_at DESC',
    [status],
  )) as {
    id: string; title: string; session_number: number; status: string;
    message_count: number; last_message: string | null;
    created_at: string; updated_at: string;
  }[];
  return Promise.all(rows.map(toSession));
}

export async function insertSession(session: Session): Promise<void> {
  const db = await getDatabase();
  const encryptedLastMsg = session.lastMessage ? await encryptText(session.lastMessage) : null;
  await db.runAsync(
    `INSERT INTO sessions (id, title, session_number, status, message_count, last_message, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [session.id, session.title, session.sessionNumber, session.status,
     session.messageCount ?? 0, encryptedLastMsg,
     session.createdAt, session.updatedAt],
  );
}

export async function updateSessionStatus(id: string, status: SessionStatus): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE sessions SET status = ?, updated_at = datetime("now") WHERE id = ?',
    [status, id],
  );
}

export async function updateSessionLastMessage(
  id: string, lastMessage: string, messageCount: number,
): Promise<void> {
  const db = await getDatabase();
  const encrypted = await encryptText(lastMessage);
  await db.runAsync(
    `UPDATE sessions SET last_message = ?, message_count = ?, updated_at = datetime("now"),
     last_message_at = datetime("now") WHERE id = ?`,
    [encrypted, messageCount, id],
  );
}

export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE sessions SET title = ? WHERE id = ?', [title, sessionId]);
}

export async function deleteSessionPermanently(id: string): Promise<void> {
  const db = await getDatabase();
  // Clean up image files before deleting DB records
  await cleanupSessionImages(db, id);
  await db.runAsync('DELETE FROM messages WHERE session_id = ?', [id]);
  await db.runAsync('DELETE FROM sessions WHERE id = ?', [id]);
}

export async function getSessionCount(): Promise<number> {
  const db = await getDatabase();
  const row = (await db.getFirstAsync('SELECT COUNT(*) as cnt FROM sessions')) as { cnt: number } | null;
  return row?.cnt ?? 0;
}

export async function deleteSessionsOlderThan(days: number): Promise<number> {
  const db = await getDatabase();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const rows = (await db.getAllAsync(
    'SELECT id FROM sessions WHERE updated_at < ?',
    [cutoff],
  )) as { id: string }[];
  for (const row of rows) {
    await cleanupSessionImages(db, row.id);
    await db.runAsync('DELETE FROM messages WHERE session_id = ?', [row.id]);
    await db.runAsync('DELETE FROM sessions WHERE id = ?', [row.id]);
  }
  return rows.length;
}

export async function updateManusTaskId(sessionId: string, taskId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE sessions SET manus_task_id = ? WHERE id = ?',
    [taskId, sessionId],
  );
}

// ─── Messages ────────────────────────────────────────────

export async function getMessagesForSession(sessionId: string): Promise<Message[]> {
  const db = await getDatabase();
  const rows = (await db.getAllAsync(
    'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC',
    [sessionId],
  )) as {
    id: string; session_id: string; role: string;
    content: string; model_used: string | null;
    token_count: number | null; created_at: string;
  }[];
  return Promise.all(rows.map(toMessage));
}

export async function insertMessage(msg: Message): Promise<void> {
  const db = await getDatabase();
  const encrypted = await encryptText(msg.content);
  const imageJson = msg.imageAttachments && msg.imageAttachments.length > 0
    ? await encryptText(JSON.stringify(msg.imageAttachments))
    : null;
  await db.runAsync(
    `INSERT INTO messages (id, session_id, role, content, model_used, token_count, image_attachments, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [msg.id, msg.sessionId, msg.role, encrypted,
     msg.metadata?.model ?? null, msg.metadata?.tokensUsed ?? null,
     imageJson, msg.createdAt],
  );
}

// ─── Helpers ─────────────────────────────────────────────

async function toSession(row: any): Promise<Session> {
  return {
    id: row.id,
    title: row.title,
    sessionNumber: row.session_number,
    status: row.status as SessionStatus,
    messageCount: row.message_count,
    lastMessage: row.last_message ? await decryptText(row.last_message) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    manusTaskId: row.manus_task_id ?? undefined,
  };
}

async function toMessage(row: any): Promise<Message> {
  let imageAttachments: ImageAttachment[] | undefined;
  if (row.image_attachments) {
    try {
      // Decrypt then parse (supports both encrypted and legacy plaintext JSON)
      const decrypted = await decryptText(row.image_attachments);
      imageAttachments = JSON.parse(decrypted);
    } catch {
      imageAttachments = undefined;
    }
  }

  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role as Message['role'],
    content: await decryptText(row.content),
    createdAt: row.created_at,
    metadata: row.model_used ? { model: row.model_used, tokensUsed: row.token_count ?? undefined } : undefined,
    imageAttachments,
  };
}

// ─── Image lifecycle cleanup ─────────────────────────────

/**
 * Delete all image files associated with a session.
 * Called before DB records are removed to prevent orphaned files.
 */
async function cleanupSessionImages(db: any, sessionId: string): Promise<void> {
  try {
    const rows = (await db.getAllAsync(
      'SELECT image_attachments FROM messages WHERE session_id = ? AND image_attachments IS NOT NULL',
      [sessionId],
    )) as { image_attachments: string }[];

    for (const row of rows) {
      try {
        const decrypted = await decryptText(row.image_attachments);
        const attachments: ImageAttachment[] = JSON.parse(decrypted);
        for (const img of attachments) {
          await deleteAsync(img.uri, { idempotent: true }).catch(() => {});
        }
      } catch {
        // Skip malformed entries — non-fatal
      }
    }
  } catch (e) {
    logError('storage', 'cleanupSessionImages')(e);
  }
}
