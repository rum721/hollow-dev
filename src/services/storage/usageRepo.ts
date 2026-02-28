import { getDatabase } from './database';

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getTodayUsage(): Promise<number> {
  const db = await getDatabase();
  const row = (await db.getFirstAsync(
    'SELECT message_count FROM daily_usage WHERE date = ?',
    [getTodayDate()],
  )) as { message_count: number } | null;
  return row?.message_count ?? 0;
}

export async function incrementTodayUsage(): Promise<number> {
  const db = await getDatabase();
  const today = getTodayDate();
  await db.runAsync(
    `INSERT INTO daily_usage (date, message_count) VALUES (?, 1)
     ON CONFLICT(date) DO UPDATE SET message_count = message_count + 1`,
    [today],
  );
  return getTodayUsage();
}

export async function getUsageHistory(days: number = 30): Promise<Array<{ date: string; count: number }>> {
  const db = await getDatabase();
  const rows = (await db.getAllAsync(
    'SELECT date, message_count FROM daily_usage ORDER BY date DESC LIMIT ?',
    [days],
  )) as { date: string; message_count: number }[];
  return rows.map((r: any) => ({ date: r.date, count: r.message_count }));
}
