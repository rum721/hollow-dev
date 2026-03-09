import { upsertProfile } from '../storage/profileRepo';
import { insertEpisode, findSimilarEpisode } from '../storage/episodeRepo';
import { normalizeEntityKey, cleanContent, stripYearFromContent } from './memoryExtractor';
import type { ExtractionResult, MemoryOperation } from './memoryExtractor';
import type { ProfileCategory } from '../../types/memory';

export interface MergeStats {
  profilesAdded: number;
  profilesUpdated: number;
  episodesAdded: number;
  skipped: number;
}

/**
 * Merge extraction results into the database using entity_key-based operations:
 * - INSERT → upsert by entity_key (creates new or updates if key exists)
 * - UPDATE → upsert by entity_key (always updates existing)
 * - SKIP → ignored (counted for stats)
 * - event category → episodic_memories (with dedup)
 * - other categories → core_profiles
 */
export async function mergeExtractionResult(
  result: ExtractionResult,
  sessionId: string,
): Promise<MergeStats> {
  let profilesAdded = 0;
  let profilesUpdated = 0;
  let episodesAdded = 0;
  let skipped = 0;

  // Process profile operations (non-event categories)
  for (const op of result.profileUpdates) {
    if (op.action === 'SKIP') {
      skipped++;
      continue;
    }

    if (!op.content || !op.entityKey) continue;

    // Map category, default to 'identity' for safety
    const category: ProfileCategory =
      op.category && op.category !== 'event'
        ? (op.category as ProfileCategory)
        : 'identity';

    // Double-normalize key, clean content, and strip years at merge time (defense in depth)
    const normalizedKey = normalizeEntityKey(op.entityKey);
    const cleanedContent = stripYearFromContent(cleanContent(op.content));

    try {
      await upsertProfile({
        key: normalizedKey,
        category,
        title: op.title || normalizedKey,
        content: cleanedContent,
        confidence: op.action === 'UPDATE' ? 0.7 : 0.5,
        mentionCount: 1,
      });

      if (op.action === 'UPDATE') profilesUpdated++;
      else profilesAdded++;
    } catch {
      // Individual upsert failure is non-fatal
    }
  }

  // Process event/episode operations
  for (const op of result.episodes) {
    if (op.action === 'SKIP' || !op.content) {
      skipped++;
      continue;
    }

    try {
      // Dedup: check if a similar episode already exists today
      const isDuplicate = await findSimilarEpisode(
        op.content,
        new Date().toISOString().split('T')[0],
      );

      if (isDuplicate) {
        skipped++;
        continue;
      }

      await insertEpisode({
        sessionId,
        content: stripYearFromContent(op.content),
        emotion: op.emotion || 'neutral',
        intensity: op.importance || 3,
        eventDate: new Date().toISOString().split('T')[0],
        decayWeight: 1.0,
      });
      episodesAdded++;
    } catch {
      // Individual insert failure is non-fatal
    }
  }

  return { profilesAdded, profilesUpdated, episodesAdded, skipped };
}
