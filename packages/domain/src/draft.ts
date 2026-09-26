import { captureAppraisalIndex } from './appraisal-index.js';
import { captureWorkAllocations } from './work-budget.js';
import { captureAppraisalResidency } from './appraisal-residency.js';
import { captureObjectIndex } from './objects.js';
import { captureSemanticChanges } from './dependencies.js';
import { captureRootIndex } from './entity-index.js';
import { captureReservationIndex } from './resource-claims.js';
import { captureContributionSources } from './status-capabilities.js';
import { captureContributionResidency } from './contribution-residency.js';
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
const admittedRecords = new WeakMap<WorldState, object[]>();
const changedEntities = new WeakMap<WorldState, ReadonlySet<string>>();
const entitySuccessors = new WeakMap<
  WorldState['entities'],
  { next: WeakRef<WorldState['entities']>; changed: ReadonlySet<string> }
>();
/** Exact immutable write lineage, bounded to one routine persistence window. Forks,
 * mutable builders, collected links and long gaps deliberately use the complete diff. */
export function entityChangesBetween(
  before: WorldState['entities'],
  after: WorldState['entities'],
): ReadonlySet<string> | undefined {
  if (!Object.isFrozen(before) || !Object.isFrozen(after)) return;
  const changed = new Set<string>();
  let cursor = before;
  for (let steps = 0; cursor !== after && steps < 1024; steps++) {
    const link = entitySuccessors.get(cursor),
      next = link?.next.deref();
    if (!link || !next) return;
    for (const id of link.changed) changed.add(id);
    cursor = next;
  }
  return cursor === after ? changed : undefined;
}
/** Exact write set from the most recent transition; no retained base-world reference. */
export function changedEntityIds(world: WorldState): ReadonlySet<string> | undefined {
  return changedEntities.get(world);
}
/** Newly copied event/experience values are sealed only when the transition has finished
 * all mutations. Sealing earlier could freeze data still owned by a caller.
 */
export function trackDetachedRecord(world: WorldState, value: object): void {
  if (!isDraft(world)) return;
  const records = admittedRecords.get(world) ?? [];
  records.push(value);
  admittedRecords.set(world, records);
}

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
  for (const value of admittedRecords.get(world) ?? []) freeze(value, true);
  admittedRecords.delete(world);
  const publishObjects = captureObjectIndex(world);
  const publishAppraisals = captureAppraisalIndex(world);
  const publishAllocations = captureWorkAllocations(world);
  const publishAppraisalResidency = captureAppraisalResidency(world);
  const publishChanges = captureSemanticChanges(world);
  const publishRoots = captureRootIndex(world);
  const publishReservations = captureReservationIndex(world);
  const publishContributionSources = captureContributionSources(world);
  const publishContributionResidency = captureContributionResidency(world);
  const base = original(world)!;
  const before = base.events;
  let appendOnly = true;
  const arrays = new Map<unknown[], { path: (string | number)[]; appendOnly: boolean }>();
  const entityIds = new Set<string>();
  const result = drafts.finishDraft(world, (patches) => {
    for (const { op, path, value: patchValue } of patches) {
      if (path[0] === 'entities') {
        if (typeof path[1] === 'string') entityIds.add(path[1]);
        else {
          for (const id of Object.keys(base.entities)) entityIds.add(id);
          if (patchValue && typeof patchValue === 'object')
            for (const id of Object.keys(patchValue)) entityIds.add(id);
        }
      }
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
  changedEntities.set(result, entityIds);
  if (base.entities !== result.entities && Object.isFrozen(base.entities))
    entitySuccessors.set(base.entities, { next: new WeakRef(result.entities), changed: entityIds });
  publishChanges(result, result !== base);
  publishRoots(result, entityIds);
  publishReservations(result);
  publishContributionSources(result, entityIds);
  publishContributionResidency(result, entityIds);
  publishObjects(result, entityIds);
  publishAppraisals(result);
  publishAllocations(result);
  publishAppraisalResidency(result);
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
