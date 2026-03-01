import { upsertProfile } from '../storage/profileRepo';
import { insertEpisode } from '../storage/episodeRepo';
import type { ExtractionResult } from './memoryExtractor';

export interface MergeStats {
  profilesAdded: number;
  profilesUpdated: number;
  episodesAdded: number;
}

/**
 * Merge extraction results into the database:
 * - Profile updates → upsert by key (new or update existing)
 * - Episodes → append as new entries
 */
export async function mergeExtractionResult(
  result: ExtractionResult,
  sessionId: string,
): Promise<MergeStats> {
  let profilesAdded = 0;
  let profilesUpdated = 0;
  let episodesAdded = 0;

  for (const update of result.profileUpdates) {
    const key =
      update.action === 'update' && update.updateKey
        ? update.updateKey
        : update.key;

    try {
      await upsertProfile({
        key,
        category: update.category,
        title: update.title,
        content: update.content,
        confidence: update.action === 'update' ? 0.7 : 0.5,
        mentionCount: 1,
      });

      if (update.action === 'update') profilesUpdated++;
      else profilesAdded++;
    } catch {
      // Individual upsert failure is non-fatal
    }
  }

  for (const episode of result.episodes) {
    try {
      await insertEpisode({
        sessionId,
        content: episode.content,
        emotion: episode.emotion,
        intensity: episode.intensity,
        eventDate: new Date().toISOString().split('T')[0],
        decayWeight: 1.0,
      });
      episodesAdded++;
    } catch {
      // Individual insert failure is non-fatal
    }
  }

  return { profilesAdded, profilesUpdated, episodesAdded };
}
