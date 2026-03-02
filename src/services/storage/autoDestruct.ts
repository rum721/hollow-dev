import * as settingsRepo from './settingsRepo';
import { deleteSessionsOlderThan } from './conversationRepo';
import { logError } from '../../utils/errorLogger';

export async function runAutoDestruct(): Promise<void> {
  try {
    const raw = await settingsRepo.getSetting('autoDestructDays');
    if (!raw) return;
    const days = Number(raw);
    if (!days || isNaN(days)) return;
    await deleteSessionsOlderThan(days);
  } catch (e) {
    // Auto-destruct is best-effort on launch, but log for diagnostics
    logError('storage', 'runAutoDestruct')(e);
  }
}
