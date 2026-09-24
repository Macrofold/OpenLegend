import {
  awarenessMemory,
  EXPERIENCE_LIMITS,
  type Awareness,
  type WorldState,
} from '@open-legend/domain';
import { digest } from './store.js';
import type { VectorSource } from './vector-store.js';

/** No-word cues remain ordinary evidence, not verbatim dialogue or background speech vectors.
 * docs/memory-architecture.md#conversation-speech-pool */
export function hasLinguisticSpeech(entry: Pick<Awareness, 'speech'>): boolean {
  return (
    !!entry.speech && entry.speech.perception !== 'seen' && entry.speech.intelligibility !== 'none'
  );
}

/** Shared pool policy keeps consolidation and background indexing on the same evidence. */
export function retainedSpeech(world: WorldState, actorId: string): Awareness[] {
  const forgotten = new Set(world.experience?.forgotten[actorId] ?? []);
  return (world.experience?.awareness[actorId] ?? [])
    .filter((entry) => hasLinguisticSpeech(entry) && !forgotten.has(entry.eventId))
    .sort((a, b) => b.at - a.at || b.sequence - a.sequence)
    .slice(0, EXPERIENCE_LIMITS.conversationSpeech);
}
export function retainedSpeechIds(world: WorldState, actorId: string): Set<string> {
  return new Set(retainedSpeech(world, actorId).map((entry) => entry.eventId));
}

/** Validate only the offered batch against current permitted linguistic evidence. */
export function currentSpeechSources<T extends VectorSource>(
  world: WorldState,
  actorId: string,
  sources: readonly T[],
): T[] {
  const current = new Map(retainedSpeech(world, actorId).map((entry) => [entry.eventId, entry]));
  return sources.filter((source) => {
    const entry = current.get(source.id);
    return entry && digest(awarenessMemory(entry)) === source.revision;
  });
}
