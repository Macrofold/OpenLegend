import { observerDescription, recognizesSubject } from './worlds/base/knowledge.js';
import { capabilityBlocked } from './status-capabilities.js';
import { appraiseEvent } from './social.js';
import { mutateExperience, type ExperienceMutation } from './experience.js';
import { engageConversation, reconcileConversations } from './conversations.js';
import { hasMemory } from './living.js';
import { finishWorld, cloneValue } from './draft.js';
import { recordSpokenPromise, advanceCommitments } from './commitments.js';
import { nextId } from './data.js';
import { hearsEntity, seesEntity } from './perception.js';
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
    eventAudience(world, type, source, scope),
    source,
    targetId,
    data,
    scope,
  );
}

function eventAudience(
  world: WorldState,
  type: string,
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
              (type === 'speech'
                ? hearsEntity(world, entity, source)
                : seesEntity(world, entity, source)),
          )
          .map((entity) => entity.id);
  if (source && hasMemory(source) && !audience.includes(source.id)) audience.push(source.id);
  return audience;
}

/** Acquiring evidence is private, not an observable act by the observer.
 * Batch only this fixed-position phase through the existing experience owner;
 * external speech/actions still resolve their actual event-time audiences.
 * docs/architecture.md#private-perception-and-evidence-batches
 */
export function encounterEmitter(world: WorldState, events: WorldEvent[]) {
  let owner: string | undefined;
  let pending: ExperienceMutation[] = [];
  const flush = () => {
    if (owner && pending.length && mutateExperience(world, owner, pending) === null)
      throw new Error('Private perception evidence could not be admitted.');
    pending = [];
  };
  const acquire = (
    source: Entity,
    targetId: string,
    meaningful: boolean,
    detail?: string,
  ): WorldEvent => {
    if (owner !== source.id) {
      flush();
      owner = source.id;
    }
    const event = recordEvent(
      world,
      events,
      'encounter',
      detail
        ? `${source.name} noticed ${observerDescription(world, source.id, targetId)}: ${detail}.`
        : `${source.name} saw ${observerDescription(world, source.id, targetId)}.`,
      [source.id],
      source,
      targetId,
      meaningful
        ? {
            importance: 6,
            semanticTrigger: true,
            acquisition: true,
            change: detail ? 'detail' : 'onset',
          }
        : {
            importance: 0,
            urgency: 0,
            semanticTrigger: false,
            acquisition: true,
            change: detail ? 'detail' : 'onset',
          },
      'private',
      pending,
    );
    // Bound temporary memory independently of the number of visible objects.
    if (pending.length >= 128) flush();
    return event;
  };
  return Object.assign(acquire, { flush });
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
  awarenessBatch?: ExperienceMutation[],
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
  const conversationId =
    type === 'speech' && source
      ? engageConversation(world, source.id, targetId)
      : (type === 'expression' || data?.['conversationRelevant'] === true) && source
        ? world.conversations?.active[source.id]
        : undefined;
  const event: WorldEvent = {
    ...(source ? { origin: { ...source.position } } : {}),
    scope,
    ...(conversationId ? { conversationId } : {}),
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
  if (source && conversationId && world.conversations?.records[conversationId])
    world.conversations.records[conversationId]!.lastActivityAt = world.simTime;
  if (audience.length || importance >= (world.socialPolicy?.notableThreshold ?? 8))
    world.events.push(event);
  events.push(event);
  if (world.experience) {
    for (const actorId of audience) {
      const intendedId =
        type === 'speech' && typeof data?.['intendedRecipientId'] === 'string'
          ? data['intendedRecipientId']
          : type === 'speech'
            ? targetId
            : undefined;
      const observer = world.entities[actorId];
      const recipient = intendedId ? world.entities[intendedId] : undefined;
      // Intent is private unless the observer is involved or can see both participants.
      // docs/narration-and-conversations.md#speech-intent-and-audience
      const perceivedRecipient =
        intendedId &&
        (actorId === source?.id ||
          actorId === intendedId ||
          (observer &&
            source &&
            recipient &&
            seesEntity(world, observer, source) &&
            seesEntity(world, observer, recipient)))
          ? intendedId
          : undefined;
      const addition: ExperienceMutation = {
        operation: 'add',
        entry: {
          source: 'awareness',
          value: {
            eventId: event.id,
            actorId,
            text: memoryPerspective(world, actorId, text, type === 'speech', source?.id),
            at: event.at,
            sequence: world.nextId,
            modality:
              scope === 'private' && data?.['acquisition'] !== true
                ? type === 'contact'
                  ? 'felt'
                  : type === 'encounter'
                    ? 'observed'
                    : 'internal'
                : type === 'speech'
                  ? 'heard'
                  : 'observed',
            recognized: type !== 'contact' && !!source && recognizesSubject(world, actorId, source.id),
            intelligible: true,
            entityIds: [source?.id, type === 'speech' ? perceivedRecipient : targetId].filter(
              (id): id is string => !!id,
            ),
            importance: event.importance ?? importance,
            urgency: event.urgency ?? urgency,
            eventType: type,
            ...(source ? { sourceId: source.id } : {}),
            ...(type === 'speech'
              ? perceivedRecipient
                ? {
                    intendedRecipientId: perceivedRecipient,
                    ...(targetId === perceivedRecipient ? { targetId } : {}),
                  }
                : {}
              : targetId
                ? { targetId }
                : {}),
            triggerKind:
              data?.['acquisition'] === true
                ? 'observed_event'
                : source?.id === actorId
                  ? 'self_event'
                  : type === 'speech'
                    ? intendedId === actorId
                      ? 'addressed_speech'
                      : 'overheard_speech'
                    : targetId === actorId
                      ? 'directed_action'
                      : 'observed_event',
            content: typeof data?.['text'] === 'string' ? data['text'] : memoryPerspective(world, actorId, text, false, source?.id),
          },
        },
      };
      if (awarenessBatch) awarenessBatch.push(addition);
      else mutateExperience(world, actorId, addition);
    }
  }
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
