import { captureOutingIndex } from './outing-index.js';
import { captureExposureCache } from './encounter-cache.js';
import { captureAppraisalIndex } from './appraisal-index.js';
import { captureWorkAllocations } from './work-budget.js';
import { captureAppraisalResidency } from './appraisal-residency.js';
import { captureObjectIndex } from './objects.js';
import {
  captureSemanticChanges,
  captureSensoryChanges,
  inheritSensoryChanges,
  MAX_CHANGE_SCOPES,
} from './dependencies.js';
import { captureRootIndex } from './entity-index.js';
import { captureReservationIndex } from './resource-claims.js';
import { captureContributionSources } from './status-capabilities.js';
import { captureContributionResidency } from './contribution-residency.js';
import { Immer, current, isDraft, original, enablePatches, freeze, type Patch } from 'immer';
import type { Entity, WorldEvent, WorldState } from './types.js';
import { countDomainWork } from './diagnostic-counters.js';

// One isolated instance: drafts never cross the domain boundary. Unchanged branches
// retain identity for persistence and projection; legacy seed/migration data stays mutable.
const drafts = new Immer({ autoFreeze: false });
enablePatches();
type EventLineage = { tip: WorldEvent[] };
const eventLineages = new WeakMap<WorldEvent[], EventLineage>();
type RecordLineage = { tip: unknown[] };
const recordLineages = new WeakMap<unknown[], RecordLineage>();
const admittedRecords = new WeakMap<WorldState, object[]>();
const recordArrays = new WeakMap<WorldState, Map<object, Set<string>>>();
/** History owners register changed arrays, not every retained record. At publication we
 * seal one plain snapshot before Immer's generic finalizer/patch generator visits it.
 * Registration does not certify an append: prefix identity is checked after all edits.
 */
export function trackRecordArray(world: WorldState, owner: object, key: string): void {
  if (!isDraft(world)) return;
  let arrays = recordArrays.get(world);
  if (!arrays) recordArrays.set(world, (arrays = new Map()));
  let keys = arrays.get(owner);
  if (!keys) arrays.set(owner, (keys = new Set()));
  keys.add(key);
}
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

function recordAppend(before: unknown[], after: unknown[]): void {
  let lineage = recordLineages.get(before);
  if (!lineage || lineage.tip !== before) {
    // Forks start a distinct proof; losing an old optimization never certifies a false prefix.
    lineage = { tip: before };
    recordLineages.set(before, lineage);
  }
  lineage.tip = after;
  recordLineages.set(after, lineage);
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
  if (buffer) buffer.values.push(...owned.map(frozenRecord));
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
type SnapshotBuffer = { before: unknown[]; values: unknown[] };
const snapshotBuffers = new WeakMap<WorldState, Map<unknown[], SnapshotBuffer>>();
const ownedSnapshots = new WeakSet<object>();
/** Only an append owner may mutate these arrays until the next draft boundary. */
export function isAppendBuffer(entries: object): boolean {
  return ownedSnapshots.has(entries);
}
export function sealAppends(world: WorldState): void {
  sealEvents(world);
  const buffers = snapshotBuffers.get(world);
  if (!buffers) return;
  snapshotBuffers.delete(world);
  for (const { before, values } of buffers.values()) {
    ownedSnapshots.delete(values);
    Object.freeze(values);
    recordAppend(before, values);
  }
}
/** Owned additions freeze immediately; retained prefixes copy only once per native turn.
 * Seal before a fork, edit or publication so no mutable buffer escapes to another world.
 * Unowned builders and callers without a turn retain the simple snapshot path.
 * docs/hearing-and-speech.md#performance-and-invalidation
 */
export function appendSnapshot<T>(entries: T[], owned: T[], world?: WorldState): T[] | undefined {
  const before = isDraft(entries) ? current(entries) : entries;
  let buffers = world && isDraft(world) ? snapshotBuffers.get(world) : undefined;
  const existing = buffers?.get(before);
  if (existing) {
    existing.values.push(...owned.map(frozenRecord));
    return existing.values as T[];
  }
  if (!Object.isFrozen(before)) return undefined;
  const after = [...before, ...owned.map(frozenRecord)];
  if (world && isDraft(world)) {
    if (!buffers) snapshotBuffers.set(world, (buffers = new Map()));
    buffers.set(after, { before, values: after });
    ownedSnapshots.add(after);
  } else {
    Object.freeze(after);
    recordAppend(before, after);
  }
  return after;
}

/** Only draft-proven appends may skip retained history; unknown/forked arrays use a diff. */
export function appendedEventCount(previous: WorldEvent[], next: WorldEvent[]): number | undefined {
  if (previous === next) return 0;
  const appended = appendedRecordCount(previous, next);
  if (appended !== undefined) return appended;
  const lineage = eventLineages.get(previous);
  return lineage && lineage === eventLineages.get(next) && next.length >= previous.length
    ? next.length - previous.length
    : undefined;
}
const IMMER_STATE = Symbol.for('immer-state');
/** Latest value of a draft container without creating a child draft for every property
 * later read from it. Unread children are their immutable base records; children already
 * drafted in this transition are returned as those live drafts. Callers must only read.
 * Immer 10 exposes its latest copy through this registered state symbol; any other shape
 * falls back to the ordinary proxied container, which is correct but creates child drafts.
 * PF03/09: one proxy per unread root was later finalized again at every publication.
 */
export function readOnlyDraftView<T extends object>(value: T): T {
  if (!isDraft(value)) return value;
  const state = (value as Record<symbol, { copy_?: T | null; base_?: T } | undefined>)[IMMER_STATE];
  const latest = state?.copy_ ?? state?.base_;
  return latest && typeof latest === 'object' ? latest : value;
}
/** Server ownership boundary; builders remain mutable until explicitly handed off.
 * Frozen unchanged branches skip Immer traversal (docs/architecture.md#state-and-transitions).
 */
export function freezeWorld(world: WorldState): WorldState {
  const known = frozenPredecessor.get(world);
  if (!known || known.entities !== world.entities || Object.isFrozen(world)) {
    freezeData(world);
    return world;
  }
  // Every other entity is the deep-frozen predecessor's own value. Only the patch write set
  // and the copies Immer published (including ones whose writes cancelled out and left no
  // patch) need a deep walk; touching every key was O(all entities) per publication (PF08).
  Object.freeze(world);
  for (const key of Object.keys(world))
    if (key !== 'entities') freezeData((world as unknown as Record<string, unknown>)[key]);
  Object.freeze(world.entities);
  for (const id of known.changed) freezeData(world.entities[id]);
  for (const copy of known.copies) freezeData(copy);
  frozenPredecessor.delete(world);
  return world;
}
/** Published transitions whose predecessor entity map was already deep-frozen. */
const frozenPredecessor = new WeakMap<
  WorldState,
  { entities: WorldState['entities']; changed: ReadonlySet<string>; copies: readonly object[] }
>();
type ImmerState = {
  assigned_?: Record<string, boolean>;
  copy_?: unknown;
  parent_?: ImmerState;
  modified_?: unknown;
  scope_?: { drafts_?: unknown };
};
/** Certify sensory coverage from the same Immer scope used by finalization. Only modified
 * entity drafts are inspected, never the distant static entity table. Cumulative assigned
 * fields conservatively revisit a touched sensory branch until this draft finishes.
 * Unknown replacements/builders cannot supply this proof and rebuild instead.
 * docs/projects/completed/parallel-batch-02-foundations-and-usability-tech-design.md#phase-specific-contract */
export function sensoryDraftWrites(world: WorldState) {
  const sources = new Set<string>(),
    observers = new Set<string>();
  const proof = { sources, observers, complete: true, overflow: false };
  if (!isDraft(world)) return { ...proof, complete: false };
  const entities = readOnlyDraftView(world).entities;
  if (!isDraft(entities)) {
    // An unchanged immutable table is safe; a directly installed table is unclassified.
    return {
      ...proof,
      complete: entities === original(world)!.entities && Object.isFrozen(entities),
    };
  }
  const state = (entities as unknown as Record<symbol, ImmerState>)[IMMER_STATE];
  const scope = state?.scope_?.drafts_;
  if (!state || !state.assigned_ || typeof state.assigned_ !== 'object' || !Array.isArray(scope))
    return { ...proof, complete: false };
  // Whole-record insertion/replacement may contain unproxied mutable descendants.
  if (Object.keys(state.assigned_).length) proof.complete = false;
  const changed = (value: object | undefined, keys: readonly string[]): boolean => {
    if (!value || !isDraft(value)) return false;
    const child = (value as Record<symbol, ImmerState>)[IMMER_STATE];
    if (!child || !child.assigned_ || typeof child.assigned_ !== 'object') {
      proof.complete = false;
      return true;
    }
    const latest = readOnlyDraftView(value) as Record<string, unknown>;
    return keys.some(
      (key) =>
        Object.hasOwn(child.assigned_!, key) ||
        (isDraft(latest[key]) &&
          (latest[key] as Record<symbol, ImmerState>)[IMMER_STATE]?.modified_ === true),
    );
  };
  for (const value of scope) {
    countDomainWork('sensoryDraftsVisited');
    const child = (value as Record<symbol, ImmerState>)[IMMER_STATE];
    if (child?.parent_ !== state || child.modified_ !== true) continue;
    const entity = readOnlyDraftView(value) as WorldState['entities'][string];
    const source =
      changed(value, ['name', 'kind', 'appearance', 'placement', 'retirement']) ||
      changed(entity.spatial, ['bodyProfileId']) ||
      changed(entity.heat, ['lit']) ||
      changed(entity.resource, ['quantity']) ||
      changed(entity.remains, ['harvested']) ||
      changed(entity.actor, [
        'alive',
        'incapacitated',
        'capabilities',
        'controller',
        'participation',
      ]) ||
      // Component installation/removal also changes participation and outward facts.
      (changed(value, ['actor', 'animal', 'spatial', 'heat', 'resource', 'remains']) &&
        ['actor', 'animal', 'spatial', 'heat', 'resource', 'remains'].some(
          (key) => !!child.assigned_ && Object.hasOwn(child.assigned_, key),
        ));
    const observer = source || changed(entity.actor, ['senses']);
    // Capability restrictions are recomputed in each observer's scalar signature;
    // elapsed status time and needs alone do not invalidate an unchanged view.
    if (!proof.overflow) {
      const extra =
        Number(source && !sources.has(entity.id)) + Number(observer && !observers.has(entity.id));
      if (sources.size + observers.size + extra > MAX_CHANGE_SCOPES) {
        sources.clear();
        observers.clear();
        proof.overflow = true;
      } else {
        if (source) sources.add(entity.id);
        if (observer) observers.add(entity.id);
      }
    }
  }
  return proof;
}
/** Entity copies this draft will publish, read from Immer 10's draft scope before finishing
 * revokes it. Undefined when that internal shape is absent, so callers keep the full walk. */
function publishedEntityCopies(world: WorldState): object[] | undefined {
  const entities = readOnlyDraftView(world).entities;
  if (!isDraft(entities)) return [];
  const state = (entities as unknown as Record<symbol, ImmerState | undefined>)[IMMER_STATE];
  const drafts = state?.scope_?.drafts_;
  if (!state || !Array.isArray(drafts) || typeof state.modified_ !== 'boolean') return undefined;
  const copies: object[] = [];
  for (const draft of drafts) {
    const child =
      draft && typeof draft === 'object'
        ? (draft as Record<symbol, ImmerState | undefined>)[IMMER_STATE]
        : undefined;
    if (child?.parent_ === state && child.modified_ === true && child.copy_)
      copies.push(child.copy_ as object);
  }
  return copies;
}
/** Conservative entity write set for consumers inside an unpublished transition. Reuse
 * the publication audit; unknown builders/replacements fall back to a full check. */
export function changedDraftEntityIds(world: WorldState): ReadonlySet<string> | undefined {
  if (!isDraft(world)) return;
  const entities = readOnlyDraftView(world).entities;
  if (!isDraft(entities)) return entities === original(world)!.entities ? new Set() : undefined;
  const state = (entities as unknown as Record<symbol, ImmerState | undefined>)[IMMER_STATE];
  if (!state?.assigned_ || typeof state.assigned_ !== 'object') return;
  const copies = publishedEntityCopies(world);
  if (!copies) return;
  return new Set([
    ...Object.keys(state.assigned_),
    ...copies.map((copy) => (copy as WorldState['entities'][string]).id),
  ]);
}
/** Deep-freeze one owned history record without per-key entry allocation. */
function frozenRecord<T>(value: T): T {
  freezeData(value);
  return value;
}
/** Immer's deep freeze for plain JSON data without allocating an entry pair per key of every
 * new container (the copied entity map is walked on every published step). Frozen subtrees
 * stop the walk exactly as in Immer; any other object type keeps Immer's own semantics. */
function freezeData(value: unknown): void {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value) || isDraft(value))
    return;
  if (Array.isArray(value)) {
    Object.freeze(value);
    for (let i = 0; i < value.length; i++) if (i in value) freezeData(value[i]);
    return;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    freeze(value, true);
    return;
  }
  Object.freeze(value);
  for (const key of Object.keys(value)) freezeData((value as Record<string, unknown>)[key]);
}
export function draftWorld(world: WorldState): WorldState {
  sealAppends(world);
  const result = drafts.createDraft(isDraft(world) ? current(world) : world);
  inheritSensoryChanges(result, world);
  return result;
}
export function finishWorld(
  world: WorldState,
  capturePatches?: (patches: readonly Patch[]) => void,
): WorldState {
  sealAppends(world);
  if (!isDraft(world)) return world;
  for (const value of admittedRecords.get(world) ?? []) freezeData(value);
  admittedRecords.delete(world);
  const sealedAppends: Array<{ before: unknown[]; after: unknown[] }> = [];
  for (const [owner, keys] of recordArrays.get(world) ?? []) {
    const properties = owner as Record<string, unknown>;
    for (const key of keys) {
      const value = properties[key];
      if (!Array.isArray(value) || !isDraft(value)) continue;
      const before = original(value)!;
      if (!Object.isFrozen(before)) continue;
      const after = current(value);
      if (after === before) continue;
      // current() resolves every nested edit; the original array stays immutable even
      // for append-then-edit/delete and branching histories in the same transition.
      properties[key] = frozenRecord(after);
      if (after.length >= before.length && before.every((entry, i) => entry === after[i]))
        sealedAppends.push({ before, after });
    }
  }
  recordArrays.delete(world);
  const publishExposure = captureExposureCache(world);
  const publishObjects = captureObjectIndex(world);
  const publishAppraisals = captureAppraisalIndex(world);
  const publishOutings = captureOutingIndex(world);
  const publishAllocations = captureWorkAllocations(world);
  const publishAppraisalResidency = captureAppraisalResidency(world);
  const publishChanges = captureSemanticChanges(world);
  const publishSensory = captureSensoryChanges(world);
  const publishRoots = captureRootIndex(world);
  const publishReservations = captureReservationIndex(world);
  const publishContributionSources = captureContributionSources(world);
  const publishContributionResidency = captureContributionResidency(world);
  const base = original(world)!;
  const before = base.events;
  let appendOnly = true;
  const arrays = new Map<unknown[], { path: (string | number)[]; appendOnly: boolean }>();
  const entityIds = new Set<string>();
  // Read before finishing: finishing revokes the drafts that identify published entity copies.
  const copies = publishedEntityCopies(world);
  const result = drafts.finishDraft(world, (patches) => {
    capturePatches?.(patches);
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
  // A semantic mutation cannot inherit a native prediction's sampling progress. A no-op
  // (including load validation) preserves it; native advance publishes a new owned value.
  // docs/simulation-time.md#native-interval-contract
  if (result !== base && result.nativeInterval === base.nativeInterval)
    delete result.nativeInterval;
  changedEntities.set(result, entityIds);
  // Entity maps are frozen only by the deep boundary freeze; a frozen predecessor lets that
  // freeze skip every entity it still shares.
  if (copies && base.entities !== result.entities && Object.isFrozen(base.entities))
    frozenPredecessor.set(result, {
      entities: result.entities,
      changed: entityIds,
      // A compound custody transition can replace an already modified entity. Its
      // discarded draft copy is never finalized and contains revoked child proxies.
      // Freeze only copies actually published; cancelled writes still retain theirs.
      copies: copies.filter((copy) => result.entities[(copy as Entity).id] === copy),
    });
  if (base.entities !== result.entities && Object.isFrozen(base.entities))
    entitySuccessors.set(base.entities, { next: new WeakRef(result.entities), changed: entityIds });
  publishChanges(result, result !== base);
  publishSensory(result);
  publishRoots(result, entityIds);
  publishReservations(result);
  publishContributionSources(result, entityIds);
  publishContributionResidency(result, entityIds);
  publishObjects(result, entityIds);
  publishExposure(result);
  publishAppraisals(result);
  publishOutings(result);
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
  for (const { before: previous, after: next } of sealedAppends) {
    let lineage = recordLineages.get(previous);
    if (!lineage) {
      lineage = { tip: previous };
      recordLineages.set(previous, lineage);
    }
    if (lineage.tip === previous) {
      lineage.tip = next;
      recordLineages.set(next, lineage);
    }
    if (previous === before && next === result.events) appendOnly = true;
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
