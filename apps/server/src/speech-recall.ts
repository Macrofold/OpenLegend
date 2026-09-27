import { EXPERIENCE_LIMITS, type Awareness, type WorldState } from '@open-legend/domain';

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
