import { finishWorld, cloneValue } from './draft.js';
import { recordSpokenPromise, advanceCommitments } from './commitments.js';
import { nextId } from './data.js';
import { canHear, canSee } from './perception.js';
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
  if (!world.entities[actorId]?.actor || !memory.summary.trim()) return;
  const records = world.memories[actorId] ?? (world.memories[actorId] = []);
  if (
    memory.eventId &&
    records.some((record) => record.eventId === memory.eventId && record.kind === memory.kind)
  )
    return;
  records.push({
    ...memory,
    summary: memoryPerspective(world, actorId, memory.summary, memory.eventType === 'speech'),
    id: nextId(world, 'memory'),
    actorId,
    at: world.simTime,
    sequence: world.nextId,
    entityIds: memory.entityIds.slice(0, 8),
    importance: Math.max(0, Math.min(10, memory.importance)),
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
            ['crafted', 'declaration-admitted', 'shot', 'fire-out', 'rested'].includes(type)
          ? 6
          : 3,
  );
  const urgency = boundedMetric(
    data?.['urgency'],
    ['death', 'incapacitated'].includes(type) ? 10 : type === 'speech' ? 4 : 2,
  );
  const audience = Object.values(world.entities)
    .filter(
      (entity) =>
        entity.actor?.alive &&
        !entity.actor.rest?.asleep &&
        !!source &&
        (type === 'speech'
          ? canHear(world, entity.position, source.position)
          : canSee(entity.position, source.position)),
    )
    .map((entity) => entity.id);
  if (source?.actor && !audience.includes(source.id)) audience.push(source.id);
  const event: WorldEvent = {
    id: nextId(world, 'event'),
    sequence: world.sequence + 1,
    at: world.simTime,
    type,
    text,
    audience,
    importance,
    urgency,
  };
  if (source) event.actorId = source.id;
  if (targetId) event.targetId = targetId;
  if (data) event.data = data;
  if (audience.length) world.events.push(event);
  events.push(event);
  if (world.experience) {
    for (const actorId of audience) {
      const awareness = (world.experience.awareness[actorId] ??= []);
      awareness.push({
        eventId: event.id,
        actorId,
        text: memoryPerspective(world, actorId, text, type === 'speech'),
        at: event.at,
        sequence: world.nextId,
        modality: type === 'speech' ? 'heard' : 'observed',
        recognized: true,
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
            : type === 'speech'
              ? targetId === actorId
                ? 'addressed_speech'
                : 'overheard_speech'
              : targetId === actorId
                ? 'directed_action'
                : 'observed_event',
        content: typeof data?.['text'] === 'string' ? data['text'] : text,
      });
    }
  }
  recordSpokenPromise(world, event);
  advanceCommitments(world, [event]);
  return event;
}
export function finish(world: WorldState, events: WorldEvent[], result: Outcome): Transition {
  advanceCommitments(world, events);
  world.sequence++;
  const committedEvents = cloneValue(events);
  return { world: finishWorld(world), events: committedEvents, outcome: result };
}
