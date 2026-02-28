import * as settingsRepo from './settingsRepo';
import { deleteSessionsOlderThan } from './conversationRepo';

export async function runAutoDestruct(): Promise<void> {
  try {
    const raw = await settingsRepo.getSetting('autoDestructDays');
    if (!raw) return;
    const days = Number(raw);
    if (!days || isNaN(days)) return;
    await deleteSessionsOlderThan(days);
  } catch {
    // Silently fail — auto-destruct is best-effort on launch
  }
}
