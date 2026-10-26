import { captureKnownPlaceEvidence } from './known-place-evidence.js';
import {
  entityDraftAudit,
  entityDraftChanges,
  entityGet,
  entityKeys,
} from './entity-collection.js';
import { captureOutingIndex } from './outing-index.js';
import { captureExposureCache } from './encounter-cache.js';
import { captureAppraisalIndex } from './appraisal-index.js';
import { captureWorkAllocations } from './work-budget.js';
import { captureAppraisalResidency } from './appraisal-residency.js';
import { captureObjectIndex, completeObjectHistory, markPartialObjectHistory } from './objects.js';
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
import { reconcileSemanticInterval } from './semantic-opportunities.js';
import type { Entity, WorldEvent, WorldState } from './types.js';
import { countDomainWork } from './diagnostic-counters.js';
import { materializeNativeValuesInPlace } from './native-values.js';

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
const recordMapSuccessors = new WeakMap<
  object,
  { next: WeakRef<object>; changed: ReadonlySet<string> }
>();
/** Exact changed keys for key-only record maps, certified by publication rather than a caller hint.
 * Replaced maps, forks and collected/long lineages deliberately use the full codec. */
export function recordMapChangesBetween(
  before: object,
  after: object,
): ReadonlySet<string> | undefined {
  if (!Object.isFrozen(before) || !Object.isFrozen(after)) return;
  const changed = new Set<string>();
  let cursor = before;
  for (let steps = 0; cursor !== after && steps < 1024; steps++) {
    const link = recordMapSuccessors.get(cursor),
      next = link?.next.deref();
    if (!link || !next) return;
    for (const id of link.changed) changed.add(id);
    cursor = next;
  }
  return cursor === after ? changed : undefined;
}
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
  if (!buffer && isDraft(world)) {
    // An unfrozen development builder has no certified immutable prefix. Own a
    // copied snapshot once; never freeze its caller-owned records in place.
    buffer = {
      before: entries,
      values: Object.isFrozen(entries)
        ? [...entries]
        : entries.map((entry) => frozenRecord(cloneValue(entry))),
    };
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
  if (entries === buffer.values && Object.isFrozen(buffer.before))
    recordAppend(buffer.before, buffer.values);
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
    if (Object.isFrozen(before)) recordAppend(before, values);
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
  if (!Object.isFrozen(before) && (!world || !isDraft(world))) return undefined;
  const prefix = Object.isFrozen(before)
    ? before
    : before.map((entry) => frozenRecord(cloneValue(entry)));
  const after = [...prefix, ...owned.map(frozenRecord)];
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
  // Entity storage now has persistent tree branches. Ordinary freezing visits the
  // changed logarithmic paths and stops at unchanged frozen nodes, without a flat
  // directory walk or a second published-copy special case.
  freezeData(world);
  return world;
}
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
export function sensoryDraftWrites(
  world: WorldState,
  previous?: { ids: ReadonlySet<string>; complete: boolean },
) {
  const sources = new Set<string>(),
    observers = new Set<string>();
  const coverage = { ids: new Set(previous?.ids), complete: previous?.complete ?? true };
  const proof = {
    sources,
    observers,
    complete: coverage.complete,
    overflow: false,
    orderChanged: false,
    coverage,
  };
  const unknown = () => {
    coverage.complete = proof.complete = false;
    return proof;
  };
  if (!isDraft(world)) return unknown();
  const entities = readOnlyDraftView(world).entities;
  if (!isDraft(entities)) {
    return entities === original(world)!.entities && Object.isFrozen(entities) && !coverage.ids.size
      ? proof
      : unknown();
  }
  if (original(entities) !== original(world)!.entities) return unknown();
  const audit = entityDraftAudit(entities);
  if (!audit) return unknown();
  const include = (id: string, source: boolean, observer: boolean) => {
    if (proof.overflow) return;
    const extra = Number(source && !sources.has(id)) + Number(observer && !observers.has(id));
    if (sources.size + observers.size + extra > MAX_CHANGE_SCOPES) {
      sources.clear();
      observers.clear();
      proof.overflow = true;
      unknown();
    } else {
      if (source) sources.add(id);
      if (observer) observers.add(id);
    }
  };
  // Assigned IDs cover insertions, replacements and removals exactly. Revisit each on
  // every phase: a newly installed record can have unproxied descendants mutated later.
  // Physical records can also change JS root order (including numeric keys/reinsertion).
  const currentEntities = readOnlyDraftView(entities);
  for (const id of audit.assigned) {
    if (!coverage.ids.has(id) && coverage.ids.size === MAX_CHANGE_SCOPES) {
      unknown();
      break;
    }
    coverage.ids.add(id);
  }
  // Immer removes an inserted-then-deleted key from assigned_. A preceding phase
  // may already have indexed it, so coverage lasts until this working draft ends.
  for (const id of coverage.ids) {
    include(id, true, true);
    proof.orderChanged ||=
      entityGet(original(world)!.entities, id)?.placement?.mode === 'world' ||
      entityGet(currentEntities, id)?.placement?.mode === 'world';
  }
  const changed = (value: object | undefined, keys: readonly string[]): boolean => {
    if (!value || !isDraft(value)) return false;
    const child = (value as Record<symbol, ImmerState>)[IMMER_STATE];
    if (!child || !child.assigned_ || typeof child.assigned_ !== 'object') {
      unknown();
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
  const publicAttributes = world.moduleManifest.definitions
    .filter((definition) => definition.disclosure === 'public')
    .map((definition) => definition.id);
  const publicHealth = world.moduleManifest.definitions.some(
    (definition) =>
      definition.disclosure === 'public' && definition.implementation === 'native-health-v1',
  );
  for (const value of audit.values.values()) {
    countDomainWork('sensoryDraftsVisited');
    if (!isDraft(value)) continue;
    const child = (value as unknown as Record<symbol, ImmerState>)[IMMER_STATE];
    if (child?.modified_ !== true) continue;
    const entity = readOnlyDraftView(value) as Entity;
    const source =
      changed(value, [
        'name',
        'description',
        'nameForm',
        'indefiniteArticle',
        'kind',
        'appearance',
        'placement',
        'retirement',
        'inventoryRevision',
        'container',
      ]) ||
      changed(entity.spatial, ['body', 'inactiveBody', 'softFootprint', 'heading']) ||
      changed(entity.heat, ['lit']) ||
      changed(entity.resource, ['quantity']) ||
      changed(entity.remains, ['harvested', 'phase']) ||
      changed(entity.actor?.attributes, publicAttributes) ||
      (publicHealth && changed(entity.actor, ['health'])) ||
      changed(entity.actor, [
        'alive',
        'incapacitated',
        'capabilities',
        'controller',
        'participation',
        'physicalLife',
        'species',
        'action',
      ]) ||
      // Component installation/removal also changes participation and outward facts.
      (changed(value, ['actor', 'animal', 'spatial', 'heat', 'resource', 'remains']) &&
        ['actor', 'animal', 'spatial', 'heat', 'resource', 'remains'].some(
          (key) => !!child.assigned_ && Object.hasOwn(child.assigned_, key),
        ));
    const observer = source || changed(entity.actor, ['senses']);
    // Capability restrictions are recomputed in each observer's scalar signature;
    // elapsed status time and needs alone do not invalidate an unchanged view.
    include(entity.id, source, observer);
  }
  return proof;
}
/** Exact collection-owned writes, including inserted-then-deleted identities. Unknown
 * direct collection replacement cannot certify completeness and retains the full fallback. */
export function changedDraftEntityIds(world: WorldState): ReadonlySet<string> | undefined {
  if (!isDraft(world)) return;
  const entities = readOnlyDraftView(world).entities;
  if (!isDraft(entities)) return entities === original(world)!.entities ? new Set() : undefined;
  if (original(entities) !== original(world)!.entities) return;
  return entityDraftChanges(entities);
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
/** Native evidence is a bounded working reduction with immutable originals. Seal its
 * changed snapshot before a nested native preview/transition, rather than asking
 * Immer to copy the same thousands of latest facets for every candidate command.
 * This changes representation only; the next actual evidence edit drafts it again. */
function sealNativeEvidence(world: WorldState): void {
  if (!isDraft(world)) return;
  const value = world.perceptionEvidence;
  if (value && !Object.isFrozen(readOnlyDraftView(value)))
    world.perceptionEvidence = immutableDraftSnapshot(value);
  // Automatic movement can prepare a nested command after recent observations
  // were appended. Seal that same owned history once: otherwise current(world)
  // recursively copies every earlier receipt for each moving animal.
  const temporal = world.experience?.temporal;
  if (temporal && !Object.isFrozen(readOnlyDraftView(temporal)))
    world.experience!.temporal = immutableDraftSnapshot(temporal);
}

/** Resolve a JSON DAG once, rather than Immer.current's repeated copying of a shared
 * observation through every lease/motion/support path. The latest draft view avoids
 * creating unread child proxies; frozen originals are already immutable authority.
 * Keep this at the existing publication boundary, never as a second writable store. */
function immutableDraftSnapshot<T>(value: T, memo = new WeakMap<object, object>()): T {
  if (!value || typeof value !== 'object') return value;
  const draft = isDraft(value);
  const latest = draft ? readOnlyDraftView(value) : value;
  if (Object.isFrozen(latest)) return latest;
  const known = memo.get(latest);
  if (known) return known as T;
  const prototype = Object.getPrototypeOf(latest);
  if (prototype !== Object.prototype && prototype !== null && !Array.isArray(latest))
    return frozenRecord(isDraft(value) ? current(value) : value);
  const result = Array.isArray(latest) ? new Array(latest.length) : Object.create(prototype);
  memo.set(latest, result);
  for (const key of Object.keys(latest)) {
    const child = immutableDraftSnapshot((latest as Record<string, unknown>)[key], memo);
    if (key === '__proto__')
      Object.defineProperty(result, key, {
        value: child,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    else result[key] = child;
  }
  return Object.freeze(result) as T;
}
export function draftWorld(
  world: WorldState,
  options: { retainNativeValues?: boolean } = {},
): WorldState {
  sealAppends(world);
  sealNativeEvidence(world);
  const base = isDraft(world) ? current(world) : world;
  // A compound command may copy an already modified entity dictionary. Carry its
  // trusted residency metadata through that snapshot, never through serialized JSON.
  // docs/save-and-load.md#continuation-and-identity
  if (!completeObjectHistory(world.entities)) markPartialObjectHistory(base.entities);
  const result = drafts.createDraft(base);
  captureKnownPlaceEvidence(world)(result);
  inheritSensoryChanges(result, world);
  if (!options.retainNativeValues) materializeNativeValuesInPlace(result);
  return result;
}
export function finishWorld(
  world: WorldState,
  capturePatches?: (patches: readonly Patch[]) => void,
): WorldState {
  if (isDraft(world)) {
    const changed = changedDraftEntityIds(world);
    for (const id of changed ?? entityKeys(world.entities)) reconcileSemanticInterval(world, id);
  }
  sealAppends(world);
  sealNativeEvidence(world);
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
  const publishKnownPlaces = captureKnownPlaceEvidence(world);
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
  const knownEntityIds = changedDraftEntityIds(world);
  const entityIds = new Set(knownEntityIds ?? entityKeys(base.entities));
  const perceptionIds = new Map<string, Set<string> | null>();
  let perceptionRootReplaced = false;
  const correctionIds = new Map<string, Set<string> | null>();
  let correctionRootReplaced = false;
  const result = drafts.finishDraft(world, (patches) => {
    capturePatches?.(patches);
    for (const { op, path, value: patchValue } of patches) {
      if (path[0] === 'perceptionEpisodes') {
        const observer = path[1];
        if (typeof observer !== 'string') perceptionRootReplaced = true;
        else if (path.length !== 3 || typeof path[2] !== 'string')
          perceptionIds.set(observer, null);
        else if (perceptionIds.get(observer) !== null) {
          const ids = perceptionIds.get(observer) ?? new Set<string>();
          ids.add(path[2]);
          perceptionIds.set(observer, ids);
        }
      }
      if (path[0] === 'experience' && (path.length === 1 || path[1] === 'corrections')) {
        const actorId = path[2];
        if (typeof actorId !== 'string') correctionRootReplaced = true;
        else if (path.length !== 4 || typeof path[3] !== 'string') correctionIds.set(actorId, null);
        else if (correctionIds.get(actorId) !== null) {
          const ids = correctionIds.get(actorId) ?? new Set<string>();
          ids.add(path[3]);
          correctionIds.set(actorId, ids);
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
  publishKnownPlaces(result);
  // A semantic mutation cannot inherit a native prediction's sampling progress. A no-op
  // (including load validation) preserves it; native advance publishes a new owned value.
  // docs/simulation-time.md#native-interval-contract
  if (result !== base && result.nativeInterval === base.nativeInterval)
    delete result.nativeInterval;
  if (!knownEntityIds) for (const id of entityKeys(result.entities)) entityIds.add(id);
  changedEntities.set(result, entityIds);
  if (base.entities !== result.entities && Object.isFrozen(base.entities))
    entitySuccessors.set(base.entities, { next: new WeakRef(result.entities), changed: entityIds });
  // Only these key-addressed relationships opt in. Ordered maps cannot use a
  // changed-key proof: deleting and reinserting a key can change order without
  // changing its final value. docs/performance.md#storage-execution
  const publishMap = (
    before: object | undefined,
    after: object | undefined,
    changed: ReadonlySet<string>,
  ) => {
    if (before && after && before !== after && Object.isFrozen(before))
      recordMapSuccessors.set(before, { next: new WeakRef(after), changed });
  };
  if (!perceptionRootReplaced) {
    if (perceptionIds.size)
      publishMap(base.perceptionEpisodes, result.perceptionEpisodes, new Set(perceptionIds.keys()));
    for (const [observer, changed] of perceptionIds)
      if (changed)
        publishMap(
          base.perceptionEpisodes?.[observer],
          result.perceptionEpisodes?.[observer],
          changed,
        );
  }
  if (!correctionRootReplaced) {
    if (correctionIds.size)
      publishMap(
        base.experience?.corrections,
        result.experience?.corrections,
        new Set(correctionIds.keys()),
      );
    for (const [actorId, changed] of correctionIds)
      if (changed)
        publishMap(
          base.experience?.corrections?.[actorId],
          result.experience?.corrections?.[actorId],
          changed,
        );
  }
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
