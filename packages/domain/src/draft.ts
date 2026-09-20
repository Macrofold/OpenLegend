import { Immer, current, isDraft } from 'immer';
import type { WorldState } from './types.js';

// One isolated instance: drafts never cross the domain boundary. Unchanged branches
// retain identity for persistence and projection; legacy seed/migration data stays mutable.
const drafts = new Immer({ autoFreeze: false });
export function draftWorld(world: WorldState): WorldState {
  return drafts.createDraft(isDraft(world) ? current(world) : world);
}
export function finishWorld(world: WorldState): WorldState {
  return isDraft(world) ? drafts.finishDraft(world) : world;
}
export function updateWorld(world: WorldState, change: (draft: WorldState) => void): WorldState {
  return drafts.produce(world, change);
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
