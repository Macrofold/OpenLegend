import { Immer, current, isDraft, original, enablePatches, freeze } from 'immer';
import type { WorldEvent, WorldState } from './types.js';

// One isolated instance: drafts never cross the domain boundary. Unchanged branches
// retain identity for persistence and projection; legacy seed/migration data stays mutable.
const drafts = new Immer({ autoFreeze: false });
enablePatches();
type EventLineage = { tip: WorldEvent[] };
const eventLineages = new WeakMap<WorldEvent[], EventLineage>();

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
  // Also handles containers whose children are drafts (for observation DTOs).
  if (isDraft(value)) return structuredClone(current(value as object)) as T;
  if (Array.isArray(value)) return value.map(cloneValue) as T;
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
    ) as T;
  return value;
}
