import { Immer, current, isDraft, original, enablePatches, freeze } from 'immer';
import type { WorldEvent, WorldState } from './types.js';

// One isolated instance: drafts never cross the domain boundary. Unchanged branches
// retain identity for persistence and projection; legacy seed/migration data stays mutable.
const drafts = new Immer({ autoFreeze: false });
enablePatches();
type EventLineage = { tip: WorldEvent[] };
const eventLineages = new WeakMap<WorldEvent[], EventLineage>();
type RecordLineage = { tip: unknown[] };
const recordLineages = new WeakMap<unknown[], RecordLineage>();

/** Persistence can skip old records only when the mutation owner proves an append. */
export function appendedRecordCount(previous: unknown[], next: unknown[]): number | undefined {
  if (previous === next) return 0;
  const lineage = recordLineages.get(previous);
  return lineage && lineage === recordLineages.get(next) && next.length >= previous.length
    ? next.length - previous.length
    : undefined;
}

/** Only draft-proven appends may skip retained history; unknown/forked arrays use a diff. */
export function appendedEventCount(previous: WorldEvent[], next: WorldEvent[]): number | undefined {
  if (previous === next) return 0;
  const lineage = eventLineages.get(previous);
  return lineage && lineage === eventLineages.get(next) && next.length >= previous.length
    ? next.length - previous.length
    : undefined;
}
/** Server ownership boundary; builders remain mutable until explicitly handed off.
 * Frozen unchanged branches skip Immer traversal (docs/architecture.md#state-and-transitions).
 */
export function freezeWorld(world: WorldState): WorldState {
  return freeze(world, true);
}
export function draftWorld(world: WorldState): WorldState {
  return drafts.createDraft(isDraft(world) ? current(world) : world);
}
export function finishWorld(world: WorldState): WorldState {
  if (!isDraft(world)) return world;
  const base = original(world)!;
  const before = base.events;
  let appendOnly = true;
  const arrays = new Map<unknown[], { path: (string | number)[]; appendOnly: boolean }>();
  const result = drafts.finishDraft(world, (patches) => {
    for (const { op, path } of patches) {
      let value: unknown = base;
      for (let depth = 0; depth < path.length; depth++) {
        if (Array.isArray(value)) {
          const index = path[depth];
          const appended =
            op === 'add' &&
            depth === path.length - 1 &&
            typeof index === 'number' &&
            index >= value.length;
          const prior = arrays.get(value);
          arrays.set(value, {
            path: path.slice(0, depth),
            appendOnly: appended && (prior?.appendOnly ?? true),
          });
        }
        if (!value || typeof value !== 'object') break;
        value = (value as Record<string | number, unknown>)[path[depth]!];
      }
    }
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
  for (const [previous, change] of arrays) {
    if (!change.appendOnly) continue;
    let next: unknown = result;
    for (const key of change.path) next = (next as Record<string | number, unknown>)[key];
    if (!Array.isArray(next) || next.length < previous.length) continue;
    let lineage = recordLineages.get(previous);
    if (!lineage) {
      lineage = { tip: previous };
      recordLineages.set(previous, lineage);
    }
    if (lineage.tip === previous) {
      lineage.tip = next;
      recordLineages.set(next, lineage);
    }
  }
  if (result.events !== before && appendOnly && result.events.length >= before.length) {
    let lineage = eventLineages.get(before);
    if (!lineage) {
      lineage = { tip: before };
      eventLineages.set(before, lineage);
    }
    // A fork must not certify two incompatible append histories as the same prefix.
    if (lineage.tip === before) {
      lineage.tip = result.events;
      eventLineages.set(result.events, lineage);
    }
  }
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
