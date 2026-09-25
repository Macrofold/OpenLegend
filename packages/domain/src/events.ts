import { current, isDraft } from 'immer';
import {
  observerDescription,
  recognizesSubject,
  learnSpeechIntroduction,
} from './worlds/base/knowledge.js';
import { capabilityBlocked } from './status-capabilities.js';
import { perceiveSpeech, prepareSpeechWords } from './speech.js';
import { isSpeechVolume } from './acoustics.js';
import type { Awareness } from './experience.js';
import { soundOrigin, speechObservers } from './perception.js';
import { appraiseEvent } from './social.js';
import { mutateExperience, acquireEventAwareness } from './experience.js';
import { engageConversation, reconcileConversations } from './conversations.js';
import { hasMemory } from './living.js';
import { finishWorld, cloneValue, appendEvents } from './draft.js';
import { recordSpokenPromise, advanceCommitments } from './commitments.js';
import { nextId } from './data.js';
import { seesEntity } from './perception.js';
import { memoryPerspective } from './memory-perspective.js';
import { MIND_LIMITS, byteCount } from './mind.js';
import type { Entity, MemoryRecord, Outcome, Transition, WorldEvent, WorldState } from './types.js';

export function outcome(ok: boolean, code: string, message: string): Outcome {
  return { ok, code, message };
}
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
/** Non-security content label; admission/dedup compares complete canonical bodies as well. */
export function contentLabel(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}
export function appendMemory(
  world: WorldState,
  actorId: string,
  memory: Omit<MemoryRecord, 'id' | 'actorId' | 'at'>,
): void {
  if (!hasMemory(world.entities[actorId]) || !memory.summary.trim()) return;
  const records = world.memories[actorId] ?? (world.memories[actorId] = []);
  if (
    memory.eventId &&
    records.some((record) => record.eventId === memory.eventId && record.kind === memory.kind)
  )
    return;
  const record: MemoryRecord = {
    ...memory,
    summary: memoryPerspective(world, actorId, memory.summary, memory.eventType === 'speech'),
    id: nextId(world, 'memory'),
    actorId,
    at: world.simTime,
    sequence: world.nextId,
    entityIds: memory.entityIds.slice(0, 8),
    importance: Math.max(0, Math.min(10, memory.importance)),
  };
  mutateExperience(world, actorId, {
    operation: 'add',
    entry: { source: 'memory', value: record },
  });
}
export function emit(
  world: WorldState,
  events: WorldEvent[],
  type: string,
  text: string,
  source?: Entity,
  targetId?: string,
  data?: WorldEvent['data'],
  scope: 'external' | 'private' = 'external',
): WorldEvent {
  return recordEvent(
    world,
    events,
    type,
    text,
    type === 'speech' ? [] : eventAudience(world, source, scope),
    source,
    targetId,
    data,
    scope,
  );
}

function eventAudience(
  world: WorldState,
  source: Entity | undefined,
  scope: 'external' | 'private',
  candidates?: Entity[],
): string[] {
  const audience =
    scope === 'private' || !source
      ? []
      : (candidates ?? Object.values(world.entities))
          .filter(
            (entity) =>
              hasMemory(entity) &&
              entity.actor?.alive &&
              !capabilityBlocked(world, entity, 'perception') &&
              seesEntity(world, entity, source),
          )
          .map((entity) => entity.id);
  if (source && hasMemory(source) && !audience.includes(source.id)) audience.push(source.id);
  return audience;
}

/** Noticing a source is private evidence, not an outward action others can witness.
 * docs/events-perception-and-reactions.md#perception-acquisition-is-normally-private
 */
export function encounterEmitter(world: WorldState, events: WorldEvent[]) {
  return (source: Entity, targetId: string, meaningful: boolean): WorldEvent =>
    emit(
      world,
      events,
      'encounter',
      `${source.name} encountered ${observerDescription(world, source.id, targetId)}.`,
      source,
      targetId,
      meaningful
        ? { importance: 6, semanticTrigger: true }
        : { importance: 0, urgency: 0, semanticTrigger: false },
      'private',
    );
}

function recordEvent(
  world: WorldState,
  events: WorldEvent[],
  type: string,
  text: string,
  audience: string[],
  source: Entity | undefined,
  targetId: string | undefined,
  data: WorldEvent['data'],
  scope: 'external' | 'private',
): WorldEvent {
  const boundedMetric = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.min(10, value))
      : fallback;
  const importance = boundedMetric(
    data?.['importance'],
    data?.['significant'] === true || ['death', 'taught', 'incapacitated'].includes(type)
      ? 9
      : type === 'speech'
        ? 7
        : data?.['semanticTrigger'] === true ||
            ['crafted', 'declaration-admitted', 'shot', 'struck', 'fire-out', 'rested'].includes(
              type,
            )
          ? 6
          : 3,
  );
  const urgency = boundedMetric(
    data?.['urgency'],
    ['death', 'incapacitated'].includes(type) ? 10 : type === 'speech' ? 4 : 2,
  );
  const event: WorldEvent = {
    ...(source ? { origin: type === 'speech' ? soundOrigin(source) : { ...source.position } } : {}),
    scope,
    id: nextId(world, 'event'),
    order: world.nextId,
    sequence: world.sequence + 1,
    at: world.simTime,
    type,
    text,
    audience: [...audience],
    importance,
    urgency,
  };
  if (source) event.actorId = source.id;
  if (targetId) event.targetId = targetId;
  event.data = {
    ...data,
    importancePolicy: 'native-v1',
    importanceReason: data?.['significant'] ? 'significant' : type,
  };
  const speechAwareness = new Map<string, Awareness>();
  if (type === 'speech' && source) {
    const volume = isSpeechVolume(data?.['volume']) ? data['volume'] : 'normal';
    const origin = isDraft(source) ? current(source) : source;
    // The shared source is parsed once; masking and recognition remain listener-local.
    const words = prepareSpeechWords(String(data?.['text'] ?? ''));
    for (const observer of scope === 'private'
      ? [origin]
      : speechObservers(world, origin, volume)) {
      const entry = perceiveSpeech(world, observer, origin, event, volume, words);
      if (entry) {
        audience.push(observer.id);
        speechAwareness.set(observer.id, entry);
      }
    }
    event.audience = [...audience];
  }
  // Being addressed is not permission to join a conversation one could not perceive.
  const conversationId =
    type === 'speech' && source
      ? engageConversation(
          world,
          source.id,
          targetId && speechAwareness.get(targetId)?.triggerKind === 'addressed_speech'
            ? targetId
            : undefined,
        )
      : (type === 'expression' || data?.['conversationRelevant'] === true) && source
        ? world.conversations?.active[source.id]
        : undefined;
  if (conversationId) {
    event.conversationId = conversationId;
    const conversation = world.conversations?.records[conversationId];
    if (conversation) conversation.lastActivityAt = world.simTime;
  }
  events.push(event);
  if (world.experience) {
    const acquired: Awareness[] = [];
    for (const actorId of audience) {
      const speech = speechAwareness.get(actorId);
      if (speech) {
        acquired.push(speech);
        continue;
      }
      const perceivedText = memoryPerspective(world, actorId, text, type === 'speech', source?.id);
      acquired.push({
        eventId: event.id,
        actorId,
        text: perceivedText,
        at: event.at,
        sequence: world.nextId,
        modality:
          scope === 'private'
            ? type === 'contact'
              ? 'felt'
              : type === 'encounter'
                ? 'observed'
                : 'internal'
            : type === 'speech'
              ? 'heard'
              : 'observed',
        entityEpisodes: Object.fromEntries(
          [source?.id, targetId].flatMap((id) => {
            const episode = id && world.perceptionEpisodes?.[actorId]?.[id];
            return id && episode ? [[id, episode]] : [];
          }),
        ),
        recognized: type !== 'contact' && !!source && recognizesSubject(world, actorId, source.id),
        intelligible: true,
        entityIds: [source?.id, targetId].filter((id): id is string => !!id),
        importance: event.importance ?? importance,
        urgency: event.urgency ?? urgency,
        eventType: type,
        ...(source ? { sourceId: source.id } : {}),
        ...(targetId ? { targetId } : {}),
        triggerKind:
          source?.id === actorId
            ? 'self_event'
            : targetId === actorId
              ? 'directed_action'
              : 'observed_event',
        content: typeof data?.['text'] === 'string' ? data['text'] : perceivedText,
      });
    }
    acquireEventAwareness(world, acquired);
  }
  learnSpeechIntroduction(world, event);
  // Finalize optional native metadata before handing an immutable record to persistence.
  if (audience.length || importance >= (world.socialPolicy?.notableThreshold ?? 8))
    appendEvents(world, [cloneValue(event)]);
  appraiseEvent(world, event);
  recordSpokenPromise(world, event);
  advanceCommitments(world, [event]);
  return event;
}
export function finish(world: WorldState, events: WorldEvent[], result: Outcome): Transition {
  advanceCommitments(world, events);
  reconcileConversations(world);
  world.sequence++;
  const committedEvents = cloneValue(events);
  return { world: finishWorld(world), events: committedEvents, outcome: result };
}

/** Observed conversation events may be native state narration, not an actor reply. */
export function isConversationEvent(event: WorldEvent): boolean {
  return (
    event.type === 'speech' ||
    typeof event.data?.['responseId'] === 'string' ||
    event.data?.['conversationRelevant'] === true
  );
}
