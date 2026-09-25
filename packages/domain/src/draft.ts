import { Immer, current, isDraft, original, enablePatches, freeze } from 'immer';
import type { WorldEvent, WorldState } from './types.js';

// One isolated instance: drafts never cross the domain boundary. Unchanged branches
// retain identity for persistence and projection; legacy seed/migration data stays mutable.
const drafts = new Immer({ autoFreeze: false });
enablePatches();
type AppendLineage = { tip: readonly unknown[] };
const appendLineages = new WeakMap<readonly unknown[], AppendLineage>();
function recordAppend(before: readonly unknown[], after: readonly unknown[]): void {
  let lineage = appendLineages.get(before);
  if (!lineage || lineage.tip !== before) {
    // Forks start a distinct proof; losing an old optimization never certifies a false prefix.
    lineage = { tip: before };
    appendLineages.set(before, lineage);
  }
  lineage.tip = after;
  appendLineages.set(after, lineage);
}
type EventBuffer = { before: WorldEvent[]; values: WorldEvent[] };
const eventBuffers = new WeakMap<WorldState, EventBuffer>();
/** A native transition can emit many occurrences. Copy its retained prefix once, not once
 * per occurrence. Only this helper appends to the owned buffer; edits enter a new draft.
 * A nested draft seals its parent first, so forks never share a mutable buffer.
 * docs/hearing-and-speech.md#performance-and-invalidation
 */
export function appendEvents(world: WorldState, owned: WorldEvent[]): void {
  const entries = isDraft(world.events) ? current(world.events) : world.events;
  let buffer = eventBuffers.get(world);
  if (buffer && entries !== buffer.values) {
    sealEvents(world);
    buffer = undefined;
  }
  if (!buffer && isDraft(world) && Object.isFrozen(entries)) {
    buffer = { before: entries, values: [...entries] };
    eventBuffers.set(world, buffer);
    world.events = buffer.values;
  }
  if (buffer) buffer.values.push(...owned.map((event) => freeze(event, true)));
  else world.events.push(...owned);
}
function sealEvents(world: WorldState): void {
  const buffer = eventBuffers.get(world);
  if (!buffer) return;
  eventBuffers.delete(world);
  Object.freeze(buffer.values);
  const entries = isDraft(world.events) ? current(world.events) : world.events;
  if (entries === buffer.values) recordAppend(buffer.before, buffer.values);
}
/** Frozen prefix plus owned new values avoids Immer traversing each historical row again.
 * New values must belong to the caller; never freeze a model/client-owned object in place.
 * Plain mutable builders take their existing mutation path. This proves append, not authority.
 * docs/hearing-and-speech.md#performance-and-invalidation
 */
export function appendSnapshot<T>(entries: T[], owned: T[]): T[] | undefined {
  const before = isDraft(entries) ? current(entries) : entries;
  if (!Object.isFrozen(before)) return undefined;
  const after = Object.freeze([...before, ...owned.map((value) => freeze(value, true))]) as T[];
  recordAppend(before, after);
  return after;
}
export function appendedCount(
  previous: readonly unknown[],
  next: readonly unknown[],
): number | undefined {
  if (previous === next) return 0;
  const lineage = appendLineages.get(previous);
  return lineage && lineage === appendLineages.get(next) && next.length >= previous.length
    ? next.length - previous.length
    : undefined;
}

/** Only draft-proven appends may skip retained history; unknown/forked arrays use a diff. */
export function appendedEventCount(previous: WorldEvent[], next: WorldEvent[]): number | undefined {
  return appendedCount(previous, next);
}
/** Server ownership boundary; builders remain mutable until explicitly handed off.
 * Frozen unchanged branches skip Immer traversal (docs/architecture.md#state-and-transitions).
 */
export function freezeWorld(world: WorldState): WorldState {
  return freeze(world, true);
}
export function draftWorld(world: WorldState): WorldState {
  sealEvents(world);
  return drafts.createDraft(isDraft(world) ? current(world) : world);
}
export function finishWorld(world: WorldState): WorldState {
  sealEvents(world);
  if (!isDraft(world)) return world;
  const before = original(world)!.events;
  let appendOnly = true;
  const result = drafts.finishDraft(world, (patches) => {
    // Inspect changed paths, not every historical record (docs/architecture.md#state-and-transitions).
    appendOnly = patches.every(
      ({ op, path }) =>
        path[0] !== 'events' ||
        (op === 'add' &&
          path.length === 2 &&
          typeof path[1] === 'number' &&
          path[1] >= before.length),
    );
  });
  if (result.events !== before && appendOnly && result.events.length >= before.length)
    recordAppend(before, result.events);
  return result;
}
export function updateWorld(world: WorldState, change: (draft: WorldState) => void): WorldState {
  const draft = draftWorld(world);
  change(draft);
  return finishWorld(draft);
}
export function cloneValue<T>(value: T): T {
  if (!value || typeof value !== 'object') return value;
  // Containers can contain nested Immer proxies. Keep this JSON-data copy independent,
  // but avoid an entries/map/fromEntries allocation chain for every awareness/event field.
  // docs/performance.md#simulation-cpu-and-growing-history
  if (isDraft(value)) return structuredClone(current(value as object)) as T;
  if (Array.isArray(value)) {
    const copy = new Array(value.length);
    for (let i = 0; i < value.length; i++) if (i in value) copy[i] = cloneValue(value[i]);
    return copy as T;
  }
  const copy: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    const item = cloneValue((value as Record<string, unknown>)[key]);
    // Match Object.fromEntries: a JSON __proto__ key is data, never a prototype setter.
    if (key === '__proto__')
      Object.defineProperty(copy, key, {
        value: item,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    else copy[key] = item;
  }
  return copy as T;
}
