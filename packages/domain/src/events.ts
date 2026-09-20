import { nextId } from './data.js';
import { canHear } from './perception.js';
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
    summary: [...memory.summary].slice(0, 240).join(''),
    id: nextId(world, 'memory'),
    actorId,
    at: world.simTime,
    sequence: world.nextId,
    entityIds: memory.entityIds.slice(0, 8),
    importance: Math.max(0, Math.min(10, memory.importance)),
  });
  // Active commitments have a separate allowance and are not silently consolidated away.
  const ordinary = records.filter((record) => record.kind !== 'commitment' || record.resolved);
  const remove = new Set<string>();
  let bytes = ordinary.reduce((sum, memory) => sum + byteCount(memory) + 1, 2);
  let count = ordinary.length;
  for (const record of ordinary) {
    if (count <= MIND_LIMITS.experiences && bytes <= MIND_LIMITS.experienceBytes) break;
    remove.add(record.id);
    count--;
    bytes -= byteCount(record) + 1;
  }
  if (remove.size) world.memories[actorId] = records.filter((record) => !remove.has(record.id));
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
  const audience = Object.values(world.entities)
    .filter(
      (entity) =>
        entity.actor?.alive && (!source || canHear(world, entity.position, source.position)),
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
  };
  if (source) event.actorId = source.id;
  if (targetId) event.targetId = targetId;
  if (data) event.data = data;
  world.events.push(event);
  events.push(event);
  if (world.events.length > 300) world.events.splice(0, world.events.length - 300);
  const important = [
    'speech',
    'death',
    'animal-died',
    'crafted',
    'declaration-admitted',
    'taught',
    'shot',
    'harvested',
    'cooked',
    'ate',
    'gathered',
  ].includes(type);
  if (important)
    for (const actorId of audience)
      appendMemory(world, actorId, {
        kind: 'episode',
        source: type === 'speech' && actorId !== source?.id ? 'heard' : 'observed',
        summary: text,
        entityIds: [source?.id, targetId].filter((id): id is string => !!id),
        eventId: event.id,
        eventType: type,
        ...(type === 'speech' && source ? { speakerId: source.id } : {}),
        importance:
          type === 'death' || type === 'taught'
            ? 9
            : type === 'speech' || type === 'crafted'
              ? 7
              : 3,
      });
  return event;
}
export function finish(world: WorldState, events: WorldEvent[], result: Outcome): Transition {
  world.sequence++;
  return { world, events, outcome: result };
}
