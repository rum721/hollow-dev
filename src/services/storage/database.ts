import { Platform } from 'react-native';

let db: any = null;

export async function getDatabase(): Promise<any> {
  if (db) return db;

  if (Platform.OS === 'web') {
    // expo-sqlite WASM doesn't work on web — use a no-op shim
    db = createWebShim();
    return db;
  }

  const SQLite = await import('expo-sqlite');
  db = await SQLite.openDatabaseAsync('hollow.db');
  await initSchema(db);
  return db;
}

async function initSchema(database: any): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      session_number INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      message_count INTEGER DEFAULT 0,
      last_message TEXT,
      last_message_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      model_used TEXT,
      token_count INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS memory_entries (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_usage (
      date TEXT PRIMARY KEY,
      message_count INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_memory_category ON memory_entries(category);

    -- V2 Memory Architecture: three-layer tables
    CREATE TABLE IF NOT EXISTS core_profiles (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      confidence REAL DEFAULT 0.5,
      mention_count INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS episodic_memories (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      content TEXT NOT NULL,
      emotion TEXT DEFAULT 'neutral',
      intensity INTEGER DEFAULT 3,
      event_date TEXT,
      decay_weight REAL DEFAULT 1.0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS session_summaries (
      id TEXT PRIMARY KEY,
      session_id TEXT UNIQUE NOT NULL,
      summary TEXT NOT NULL,
      key_topics TEXT,
      mood TEXT DEFAULT 'neutral',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_profile_category ON core_profiles(category);
    CREATE INDEX IF NOT EXISTS idx_profile_key ON core_profiles(key);
    CREATE INDEX IF NOT EXISTS idx_episode_date ON episodic_memories(event_date);
    CREATE INDEX IF NOT EXISTS idx_episode_emotion ON episodic_memories(emotion);
    CREATE INDEX IF NOT EXISTS idx_summary_session ON session_summaries(session_id);
  `);

  // Migration: add manus_task_id column to sessions (for Manus multi-turn)
  try {
    await database.execAsync(`ALTER TABLE sessions ADD COLUMN manus_task_id TEXT`);
  } catch {
    // Column already exists — this is expected after first migration
  }

  // Migration: add image_attachments column to messages (for image support)
  try {
    await database.execAsync(`ALTER TABLE messages ADD COLUMN image_attachments TEXT`);
  } catch {
    // Column already exists — expected after first migration
  }

  // Migration: migrate memory_entries → core_profiles + episodic_memories (idempotent)
  await migrateMemoryEntries(database);
}

async function migrateMemoryEntries(database: any): Promise<void> {
  try {
    // Check if migration already done (core_profiles has data)
    const profileCount = (await database.getFirstAsync(
      'SELECT COUNT(*) as cnt FROM core_profiles',
    )) as { cnt: number } | null;
    if (profileCount && profileCount.cnt > 0) return;

    // Check if there's anything to migrate
    const entryCount = (await database.getFirstAsync(
      'SELECT COUNT(*) as cnt FROM memory_entries',
    )) as { cnt: number } | null;
    if (!entryCount || entryCount.cnt === 0) return;

    // Migrate people + preferences → core_profiles
    await database.execAsync(`
      INSERT OR IGNORE INTO core_profiles (id, key, category, title, content, confidence, mention_count)
      SELECT id,
             LOWER(REPLACE(REPLACE(REPLACE(title, ' ', '_'), '''', ''), '"', '')),
             CASE WHEN category = 'people' THEN 'relationship' ELSE 'preference' END,
             title, content, 0.7, 1
      FROM memory_entries
      WHERE category IN ('people', 'preferences');
    `);

    // Migrate events + emotions → episodic_memories
    await database.execAsync(`
      INSERT OR IGNORE INTO episodic_memories (id, session_id, content, emotion, intensity, event_date, decay_weight)
      SELECT id, NULL, title || ': ' || content,
             CASE WHEN category = 'emotions' THEN 'mixed' ELSE 'neutral' END,
             3, created_at, 1.0
      FROM memory_entries
      WHERE category IN ('events', 'emotions');
    `);
  } catch {
    // Migration failure is non-fatal — old data remains accessible
  }
}

export async function closeDatabase(): Promise<void> {
  if (db && Platform.OS !== 'web') {
    await db.closeAsync();
    db = null;
  }
}

// Web shim: stores data in localStorage as JSON
function createWebShim() {
  function getStore(table: string): any[] {
    try {
      const raw = localStorage.getItem(`hollow_${table}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function setStore(table: string, data: any[]) {
    try { localStorage.setItem(`hollow_${table}`, JSON.stringify(data)); } catch {}
  }

  return {
    getAllAsync: async (sql: string, params?: any[]) => {
      const table = extractTableFromSelect(sql);
      if (!table) return [];
      let rows = getStore(table);

      // Simple WHERE filtering
      if (params && params.length > 0 && sql.includes('WHERE')) {
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
        if (whereMatch) {
          const field = whereMatch[1];
          rows = rows.filter((r: any) => r[field] === params[0]);
        }
      }

      // ORDER BY updated_at DESC or created_at ASC
      if (sql.includes('ORDER BY')) {
        if (sql.includes('DESC')) {
          rows.sort((a: any, b: any) => (b.updated_at || '').localeCompare(a.updated_at || ''));
        } else {
          rows.sort((a: any, b: any) => (a.created_at || '').localeCompare(b.created_at || ''));
        }
      }

      // LIMIT
      const limitMatch = sql.match(/LIMIT\s+(\?|\d+)/i);
      if (limitMatch) {
        const limit = limitMatch[1] === '?' ? (params?.[params.length - 1] ?? 100) : parseInt(limitMatch[1]);
        rows = rows.slice(0, limit);
      }

      return rows;
    },

    getFirstAsync: async (sql: string, params?: any[]) => {
      const table = extractTableFromSelect(sql);
      if (!table) return null;
      const rows = getStore(table);

      if (sql.includes('COUNT(*)')) {
        return { cnt: rows.length };
      }

      if (params && params.length > 0) {
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
        if (whereMatch) {
          return rows.find((r: any) => r[whereMatch[1]] === params[0]) ?? null;
        }
      }
      return rows[0] ?? null;
    },

    runAsync: async (sql: string, params?: any[]) => {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith('INSERT')) {
        const table = sql.match(/INTO\s+(\w+)/i)?.[1];
        if (!table || !params) return;
        const cols = sql.match(/\(([^)]+)\)/)?.[1]?.split(',').map(c => c.trim()) ?? [];
        const row: any = {};
        cols.forEach((col, i) => { row[col] = params[i]; });

        // Handle ON CONFLICT for daily_usage
        if (sql.includes('ON CONFLICT')) {
          const rows = getStore(table);
          const existing = rows.findIndex((r: any) => r.date === params[0]);
          if (existing >= 0) {
            rows[existing].message_count = (rows[existing].message_count || 0) + 1;
            setStore(table, rows);
            return;
          }
        }

        // Handle INSERT OR REPLACE for settings
        if (sql.includes('OR REPLACE')) {
          const rows = getStore(table);
          const idx = rows.findIndex((r: any) => r.key === params[0]);
          if (idx >= 0) {
            rows[idx] = row;
          } else {
            rows.push(row);
          }
          setStore(table, rows);
          return;
        }

        const rows = getStore(table);
        rows.push(row);
        setStore(table, rows);
      } else if (trimmed.startsWith('UPDATE')) {
        const table = sql.match(/UPDATE\s+(\w+)/i)?.[1];
        if (!table || !params) return;
        const rows = getStore(table);
        const idParam = params[params.length - 1];
        const idx = rows.findIndex((r: any) => r.id === idParam || r.key === idParam);
        if (idx >= 0) {
          // Simple SET parsing
          const setMatches = [...sql.matchAll(/(\w+)\s*=\s*\?/g)];
          let paramIdx = 0;
          for (const m of setMatches) {
            if (m[1] !== 'id' && m[1] !== 'key') {
              rows[idx][m[1]] = params[paramIdx];
            }
            paramIdx++;
          }
          setStore(table, rows);
        }
      } else if (trimmed.startsWith('DELETE')) {
        const table = sql.match(/FROM\s+(\w+)/i)?.[1];
        if (!table || !params) return;
        const rows = getStore(table);
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
        if (whereMatch) {
          const filtered = rows.filter((r: any) => r[whereMatch[1]] !== params[0]);
          setStore(table, filtered);
        }
      }
    },

    execAsync: async () => {},
    closeAsync: async () => {},
  };
}

function extractTableFromSelect(sql: string): string | null {
  const match = sql.match(/FROM\s+(\w+)/i);
  return match?.[1] ?? null;
}
