import {
  noteTemporalResidency,
  temporalPagePosition,
  temporalPageRecordId,
} from './temporal-page-storage.js';
import { isImmutableData } from '@open-legend/domain';
import {
  DerivedOwnerIndex,
  objectIndexSet,
  objectIndexEntriesAtLeast,
  objectIndexEntriesAfter,
  type ObjectIndexNode,
} from '@open-legend/domain';
import { cloneEntities, entityDelete, entityGet } from '@open-legend/domain';
import {
  appendedRecordCount,
  immutableDataSnapshot,
  selectTemporalPageOperations,
  temporalPageMutation,
  temporalOperationAppendOrder,
  temporalPageSelectionSource,
  EXPERIENCE_LIMITS,
  markPartialAppraisals,
  retiredObjectIds,
  markPartialObjectHistory,
  markPartialContributions,
  terminalContributionOwners,
  updateWorld,
  freezeWorld,
  projectWorldHistory,
  referencedReceivedValues,
  retainedAgreementEvidence,
  type WorldState,
} from '@open-legend/domain';

/** Placement only: all evicted sources remain in their canonical tables.
 * docs/performance.md#inactive-history-residency
 */
export const HISTORY_TABLES = new Set([
  'mind_memories',
  'mind_awareness',
  'mind_summaries',
  'activity_occurrences',
  'mind_temporal_pages',
]);
// Awareness consumers needing more than the presentation tail use SQL source IDs.
// This is placement, not eligibility: important incidents remain fully recallable.
export const HOT_AWARENESS_ROWS = 256;
const HOT_AWARENESS_BYTES = 1024 * 1024;
const recordBytes = new WeakMap<object, number>();
type Positions = { complete?: boolean; positions: Map<string, number>; next: number };
export const historyPositions = new WeakMap<unknown[], Positions>();
export const HISTORY_MAP_TABLES = new Set(['mind_appraisals', 'sim_status_effects']);
export const historyMapPositions = new WeakMap<object, Positions>();
/** Keep canonical order through order-preserving filtering or representation changes.
 * New records append after the canonical tail, not the shorter resident subset. */
export function retainMapPositions(before: object, after: object): void {
  const prior = historyMapPositions.get(before);
  if (prior)
    historyMapPositions.set(after, {
      ...prior,
      positions: new Map(Object.keys(after).map((key) => [key, prior.positions.get(key)!])),
    });
}
export const historyKey = (entry: unknown): string => {
  const value = entry as { id?: string; eventId?: string };
  return value.id ?? value.eventId!;
};
const expiry = new WeakMap<unknown[], number>();
const compactedObjects = new WeakSet<object>();
export function materializedObjectHistory(world: WorldState): void {
  compactedObjects.delete(world.objectState);
}
/** A release that was computed but discarded (its save was refused) must not suppress the
 * next release of the same unchanged maps. */
export function discardedHistoryRelease(world: WorldState): void {
  materializedObjectHistory(world);
  if (!world.appraisals) return;
  compactedAppraisals.delete(world.appraisals);
  for (const records of Object.values(world.appraisals)) compactedAppraisalOwners.delete(records);
}
/** Only call after canonical commit. Eviction changes residency, never physical identity
 * or SQL lifecycle rows; complete capture rehydrates them from the same records. */
export function compactObjectHistory(world: WorldState): WorldState {
  if (compactedObjects.has(world.objectState)) return world;
  compactedObjects.add(world.objectState);
  const retired = retiredObjectIds(world);
  if (!retired.length && !Object.keys(world.objectLineage ?? {}).length) return world;
  const entities = retired.length ? cloneEntities(world.entities) : world.entities;
  for (const id of retired) entityDelete(entities, id);
  if (retired.length) markPartialObjectHistory(entities);
  return { ...world, entities, ...(world.objectLineage ? { objectLineage: {} } : {}) };
}
export function compactContributionHistory(world: WorldState): WorldState {
  const owners = terminalContributionOwners(world);
  if (!owners.size) return world;
  // Keep unrelated physical/source indexes and the SQL write lineage through this
  // residency-only change using the existing immutable publication path.
  const projected = updateWorld(
    world,
    (draft) => {
      for (const id of owners) {
        const entity = entityGet(world.entities, id);
        if (!entity?.statusEffects) continue;
        const statusEffects = Object.fromEntries(
          Object.entries(entity.statusEffects).filter(
            ([, state]) => !state.contribution || state.active,
          ),
        );
        markPartialContributions(statusEffects);
        retainMapPositions(entity.statusEffects, statusEffects);
        entityGet(draft.entities, id)!.statusEffects = statusEffects;
      }
    },
    { retainNativeValues: true },
  );
  return Object.isFrozen(world) ? freezeWorld(projected, { completedTransition: true }) : projected;
}
const compactedAppraisals = new WeakSet<object>();
const compactedAppraisalOwners = new WeakSet<object>();
/** Terminal records remain canonical, while active owner pages and inert current
 * feelings stay resident. Exact creation checks consult cold outcomes before admission. */
export function compactAppraisalHistory(world: WorldState): WorldState {
  if (!world.appraisals || compactedAppraisals.has(world.appraisals)) return world;
  compactedAppraisals.add(world.appraisals);
  let changed = false;
  const appraisals = { ...world.appraisals };
  for (const [actorId, records] of Object.entries(appraisals)) {
    if (compactedAppraisalOwners.has(records)) continue;
    compactedAppraisalOwners.add(records);
    const active = Object.values(records).filter((record) => record.state === 'active');
    if (active.length === Object.keys(records).length) continue;
    appraisals[actorId] = Object.fromEntries(active.map((record) => [record.id, record]));
    markPartialAppraisals(appraisals[actorId]!);
    retainMapPositions(records, appraisals[actorId]!);
    compactedAppraisalOwners.add(appraisals[actorId]!);
    changed = true;
  }
  if (!changed) return world;
  compactedAppraisals.add(appraisals);
  return { ...world, appraisals };
}
const noOwners: Record<string, never[]> = Object.freeze({});
function dueOwners<T>(deadline: (entries: T[]) => number) {
  return new DerivedOwnerIndex<T[], number, ObjectIndexNode<number> | undefined>(
    deadline,
    () => undefined,
    (tree, id, _before, next) =>
      objectIndexSet(tree, id, next === undefined || next === Infinity ? undefined : -next),
  );
}
const rawDelay = EXPERIENCE_LIMITS.rawHours * 3600 + 60;
const memoryDue = dueOwners<WorldState['memories'][string][number]>((entries) => {
  let at = Infinity;
  for (const entry of entries)
    if (entry.kind !== 'commitment' || entry.resolved) at = Math.min(at, entry.at + rawDelay);
  return at;
});
const awarenessDue = dueOwners<NonNullable<WorldState['experience']>['awareness'][string][number]>(
  (entries) => {
    if (entries.some((entry) => entry.retentionClass === 'sensory')) return Infinity;
    if (entries.length > HOT_AWARENESS_ROWS) return -Infinity;
    let at = Infinity,
      bytes = 0;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      let size = recordBytes.get(entry);
      if (size === undefined) {
        size = Buffer.byteLength(JSON.stringify(entry));
        recordBytes.set(entry, size);
      }
      bytes += size;
      if (i < entries.length - 24) at = Math.min(at, entry.at + rawDelay);
    }
    return bytes > HOT_AWARENESS_BYTES && entries.length > 24 ? -Infinity : at;
  },
);
const summaryDue = dueOwners<NonNullable<WorldState['experience']>['summaries'][string][number]>(
  (entries) => (entries.length ? -Infinity : Infinity),
);
const occurrenceDue = dueOwners<WorldState['actionExperience']['occurrences'][string][number]>(
  (entries) =>
    entries.some((entry, index) => index < entries.length - 128 && entry.status !== 'running')
      ? -Infinity
      : Infinity,
);

type PlacementProjection = Parameters<typeof projectWorldHistory>[1];
type Placement = {
  kind: 'memories' | 'awareness' | 'summaries' | 'occurrences';
  actorId: string;
  source: unknown[];
  selected: unknown[];
};
interface PlacementPlan {
  placements: Placement[];
  at: number;
  awareness: unknown;
  summaries: unknown;
  occurrences: unknown;
  forgotten: unknown;
  corrections: unknown;
  projection: PlacementProjection;
}
/** SQL preparation can assign canonical append ordinals after preview selection.
 * Rebind the selected rows at release, including arrays normalized by publication.
 * Never let a preview's temporary numbering become a later insertion address. */
function projectPlacement(
  world: WorldState,
  projection: PlacementProjection,
  placements: Placement[],
  options: { preview?: boolean },
) {
  const projected = projectWorldHistory(world, projection, options);
  for (const { kind, actorId, source, selected } of placements) {
    const current =
      kind === 'memories'
        ? projected.memories[actorId]
        : kind === 'occurrences'
          ? projected.actionExperience.occurrences[actorId]
          : projected.experience?.[kind][actorId];
    if (!current) continue;
    const canonical = historyPositions.get(source),
      fallback = historyPositions.get(selected);
    historyPositions.set(current, {
      positions: new Map(
        current.map((entry) => {
          const id = historyKey(entry);
          return [id, canonical?.positions.get(id) ?? fallback?.positions.get(id)!];
        }),
      ),
      next: canonical?.next ?? fallback?.next ?? source.length,
    });
  }
  return projected;
}
const placementPlans = new WeakMap<object, PlacementPlan>();
const emptyTemporalOwners: NonNullable<
  NonNullable<WorldState['experience']>['temporal']
>['actors'] = Object.freeze({});
export function compactHistory(
  world: WorldState,
  previous?: WorldState,
  options: { preview?: boolean } = {},
): WorldState {
  const reusable = isImmutableData(world);
  const cached = reusable ? placementPlans.get(world.memories) : undefined;
  if (
    cached &&
    cached.at === world.simTime &&
    cached.awareness === world.experience?.awareness &&
    cached.summaries === world.experience?.summaries &&
    cached.occurrences === world.actionExperience.occurrences &&
    cached.forgotten === world.experience?.forgotten &&
    cached.corrections === world.experience?.corrections
  )
    return compactTemporalHistory(
      projectPlacement(world, cached.projection, cached.placements, options),
      options,
    );
  const cutoff = world.simTime - EXPERIENCE_LIMITS.rawHours * 3600;
  const compact = <T>(
    entries: T[],
    prior: T[] | undefined,
    at: (entry: T, index: number, length: number) => number,
    tail = 0,
    maximum = Infinity,
    pinned?: ReadonlySet<string>,
  ): T[] => {
    let startIndex = Math.max(0, entries.length - maximum);
    if (Number.isFinite(maximum)) {
      let bytes = 0;
      for (let i = entries.length - 1; i >= startIndex; i--) {
        const record = entries[i] as object;
        let size = recordBytes.get(record);
        if (size === undefined) {
          size = Buffer.byteLength(JSON.stringify(record));
          recordBytes.set(record, size);
        }
        bytes += size;
        if (bytes > HOT_AWARENESS_BYTES && i < entries.length - tail) {
          startIndex = i + 1;
          break;
        }
      }
    }
    let earliest = expiry.get(entries);
    if (earliest === undefined) {
      const appended = prior ? appendedRecordCount(prior, entries) : undefined;
      const oldExpiry = prior ? expiry.get(prior) : undefined;
      earliest = appended !== undefined && oldExpiry !== undefined ? oldExpiry : Infinity;
      const start =
        appended !== undefined && oldExpiry !== undefined ? Math.max(0, prior!.length - tail) : 0;
      for (let i = start; i < entries.length; i++)
        earliest = Math.min(earliest, at(entries[i]!, i, entries.length));
      expiry.set(entries, earliest);
    }
    // Residency can lag semantic expiry by one game minute. Amortize array compaction
    // across commits rather than copying a six-hour window for each expired second.
    if (startIndex === 0 && earliest + 60 >= cutoff) return entries;
    const retained: T[] = [];
    const old = historyPositions.get(entries);
    const selected = new Map<string, number>();
    let nextExpiry = Infinity;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!,
        required = pinned?.has(historyKey(entry)),
        expires = required ? Infinity : at(entry, i, entries.length);
      if (i < startIndex && !required) continue;
      if (expires < cutoff) continue;
      retained.push(entry);
      nextExpiry = Math.min(nextExpiry, expires);
      const key = historyKey(entry);
      selected.set(key, old?.positions.get(key) ?? i);
    }
    if (retained.length === entries.length) return entries;
    expiry.set(retained, nextExpiry);
    historyPositions.set(retained, { positions: selected, next: old?.next ?? entries.length });
    return retained;
  };
  let memories = world.memories;
  let awareness = world.experience?.awareness ?? noOwners;
  let summaries = world.experience?.summaries ?? noOwners;
  let changed = false;
  const placements: Placement[] = [];
  for (const [actorId] of objectIndexEntriesAtLeast(memoryDue.read(memories), -world.simTime)) {
    const entries = memories[actorId]!;
    const retained = compact(entries, previous?.memories[actorId], (entry) =>
      entry.kind === 'commitment' && !entry.resolved ? Infinity : entry.at,
    );
    if (retained !== entries) {
      if (memories === world.memories) memories = { ...memories };
      memories[actorId] = retained;
      placements.push({ kind: 'memories', actorId, source: entries, selected: retained });
      changed = true;
    }
  }
  for (const [actorId] of objectIndexEntriesAtLeast(awarenessDue.read(awareness), -world.simTime)) {
    const entries = awareness[actorId]!;
    // Sensory rows must remain resident until their native absolute expiry; evicting
    // them would strand their expiry in SQL. Native operation admission bounds intake.
    if (entries.some((entry) => entry.retentionClass === 'sensory')) continue;
    const retained = compact(
      entries,
      previous?.experience?.awareness[actorId],
      (entry, index, length) => (index >= length - 24 ? Infinity : entry.at),
      24,
      HOT_AWARENESS_ROWS,
      retainedAgreementEvidence(world, actorId),
    );
    if (retained !== entries) {
      if (awareness === world.experience?.awareness) awareness = { ...awareness };
      awareness[actorId] = retained;
      placements.push({ kind: 'awareness', actorId, source: entries, selected: retained });
      changed = true;
    }
  }
  for (const [actorId] of objectIndexEntriesAtLeast(summaryDue.read(summaries), -world.simTime)) {
    const entries = summaries[actorId]!,
      retained = compact(entries, undefined, () => -Infinity);
    if (retained !== entries) {
      if (summaries === world.experience?.summaries) summaries = { ...summaries };
      summaries[actorId] = retained;
      placements.push({ kind: 'summaries', actorId, source: entries, selected: retained });
      changed = true;
    }
  }
  let occurrences = world.actionExperience.occurrences;
  for (const [actorId] of objectIndexEntriesAtLeast(
    occurrenceDue.read(occurrences),
    -world.simTime,
  )) {
    const entries = occurrences[actorId]!;
    if (entries.length <= 128) continue;
    const prior = historyPositions.get(entries);
    const sourcePositions = new Map(entries.map((entry, index) => [entry.id, index]));
    const retained = entries.filter(
      (entry, index) => entry.status === 'running' || index >= entries.length - 128,
    );
    if (retained.length === entries.length) continue;
    const positions = new Map(
      retained.map((entry) => [
        entry.id,
        prior?.positions.get(entry.id) ?? sourcePositions.get(entry.id)!,
      ]),
    );
    historyPositions.set(retained, { positions, next: prior?.next ?? entries.length });
    if (occurrences === world.actionExperience.occurrences) occurrences = { ...occurrences };
    occurrences[actorId] = retained;
    placements.push({ kind: 'occurrences', actorId, source: entries, selected: retained });
    changed = true;
  }
  const projection: PlacementProjection = changed
    ? {
        memories,
        occurrences,
        ...(world.experience ? { awareness, summaries } : {}),
      }
    : {};
  if (reusable)
    placementPlans.set(world.memories, {
      at: world.simTime,
      awareness: world.experience?.awareness,
      summaries: world.experience?.summaries,
      occurrences: world.actionExperience.occurrences,
      forgotten: world.experience?.forgotten,
      corrections: world.experience?.corrections,
      projection,
      placements,
    });
  const projected = changed ? projectPlacement(world, projection, placements, options) : world;
  return compactTemporalHistory(projected, options);
}

export const HOT_TEMPORAL_BYTES = 128 * 1024;
const temporalOverflow = new DerivedOwnerIndex<
  NonNullable<NonNullable<WorldState['experience']>['temporal']>['actors'][string],
  number,
  ObjectIndexNode<number> | undefined
>(
  (actor) => actor.pages.reduce((bytes, page) => bytes + page.bytes, 0),
  () => undefined,
  (tree, id, _before, after) => objectIndexSet(tree, id, after),
);
/** Placement only. Canonical pages survive in SQL until the retention owner
 * explicitly releases them, while native capture keeps only its bounded tail. */
const sourcePlacements = new WeakMap<
  object,
  {
    references: ReturnType<typeof referencedReceivedValues>;
    sources: NonNullable<WorldState['receivedValues']>['sources'];
  }
>();
export function compactTemporalHistory(
  world: WorldState,
  options: { preview?: boolean } = {},
): WorldState {
  const temporal = world.experience?.temporal;
  if (!temporal && !world.receivedValues) return world;
  const maximum = HOT_TEMPORAL_BYTES;
  let changed = false;
  let actors = temporal?.actors;
  for (const [actorId] of objectIndexEntriesAfter(
    temporalOverflow.read(actors ?? emptyTemporalOwners),
    maximum,
  )) {
    const actor = actors![actorId]!,
      pages = actor.pages;
    if (pages.reduce((bytes, page) => bytes + page.bytes, 0) > maximum) {
      // Temporal pages carry native ordinals; residency must not assign new SQL positions.
      let bytes = 0;
      const retained: typeof pages = [];
      for (let index = pages.length - 1; index >= 0; index--) {
        const page = pages[index]!;
        const durable = page.appendClosed === true && temporalPageMutation(page) !== 'edit';
        if (!durable || !bytes || bytes + page.bytes <= maximum) {
          retained.push(page);
          if (durable) bytes += page.bytes;
        }
      }
      if (retained.length === pages.length) continue;
      if (actors === temporal?.actors) actors = { ...actors };
      actors![actorId] = { ...actor, pages: retained.reverse() };
      changed = true;
    }
  }
  const next = temporal && changed ? { ...temporal, actors: actors! } : temporal;
  const scope =
    next && next !== temporal
      ? { ...world, experience: { ...world.experience!, temporal: next } }
      : world;
  const received = world.receivedValues;
  const references = referencedReceivedValues(scope);
  const reusable = received && isImmutableData(world);
  const cached = reusable ? sourcePlacements.get(received.sources) : undefined;
  let sources = received?.sources;
  if (received && cached?.references !== references) {
    const entries = Object.entries(received.sources);
    const selected = entries.filter(([id]) => references.has(id));
    sources = selected.length === entries.length ? received.sources : Object.fromEntries(selected);
    if (reusable) sourcePlacements.set(received.sources, { references, sources });
  } else if (cached) sources = cached.sources;
  const receivedChanged = sources !== received?.sources;
  if (!changed && !receivedChanged) return world;
  const projected = projectWorldHistory(
    world,
    {
      ...(next && next !== temporal ? { temporal: next } : {}),
      ...(received && receivedChanged
        ? { receivedValues: { ...received, sources: sources! } }
        : {}),
    },
    options,
  );
  return projected;
}

/** Saved physical tails are the existing residency projection, never evidence
 * authority. Keeping their exact IDs prevents a native append container from
 * masquerading as one durable page during later correction or retirement. */
const savedTemporalEdits = new WeakSet<object>();
interface SavedTemporalPlacement {
  tails: ReadonlyMap<string, readonly import('@open-legend/domain').TemporalPage[]>;
  actors: ReadonlySet<string>;
  acknowledgedBefore: number;
}
const savedTemporalPlacement = new WeakMap<WorldState, SavedTemporalPlacement>();
export function acknowledgedTemporalOrder(world: WorldState): number | undefined {
  return savedTemporalPlacement.get(world)?.acknowledgedBefore;
}
export function recordSavedTemporalPages(
  world: WorldState,
  previous: WorldState | undefined,
  pages: readonly import('@open-legend/domain').TemporalPage[],
  deleted: readonly string[] = [],
  actors: readonly string[] = [],
): void {
  const changedActors = new Set<string>(actors);
  for (const page of pages) {
    changedActors.add(page.actorId);
    const source = temporalPageSelectionSource(page);
    if (source && temporalPageMutation(source) === 'edit')
      savedTemporalEdits.add(source.operations);
  }
  for (const id of deleted) {
    const path = JSON.parse(id) as string[];
    if (path[4]) changedActors.add(path[4]);
  }
  const prior =
    savedTemporalPlacement.get(previous!)?.tails ??
    new Map(
      Object.entries(previous?.experience?.temporal?.actors ?? {}).map(([actorId, actor]) => [
        actorId,
        actor.pages,
      ]),
    );
  const removed = new Set(deleted),
    grouped = new Map<string, Map<string, import('@open-legend/domain').TemporalPage>>();
  for (const actorId of Object.keys(world.experience?.temporal?.actors ?? {}))
    grouped.set(
      actorId,
      new Map(
        (prior.get(actorId) ?? [])
          .filter((page) => !removed.has(temporalPageRecordId(actorId, page.id)))
          .map((page) => [page.id, page]),
      ),
    );
  for (const page of pages) {
    let actor = grouped.get(page.actorId);
    if (!actor) grouped.set(page.actorId, (actor = new Map()));
    actor.set(page.id, page);
  }
  const tails = new Map<string, readonly import('@open-legend/domain').TemporalPage[]>();
  for (const [actorId, entries] of grouped) {
    const ordered = [...entries.values()].sort(
      (a, b) => temporalPagePosition(b) - temporalPagePosition(a) || b.id.localeCompare(a.id),
    );
    const selected: import('@open-legend/domain').TemporalPage[] = [];
    let bytes = 0;
    for (const page of ordered) {
      if (bytes && bytes + page.bytes > HOT_TEMPORAL_BYTES) break;
      selected.push(page);
      bytes += page.bytes;
    }
    tails.set(actorId, selected.reverse());
  }
  savedTemporalPlacement.set(world, {
    tails,
    actors: changedActors,
    acknowledgedBefore: world.nextId,
  });
}
/** A save may finish while newer native changes already exist. Remove only the
 * committed append prefix, retain every newer/edited operation, and
 * install the bounded canonical tail without altering any personal charge. */
export function releaseSavedTemporalHistory(
  world: WorldState,
  durable: WorldState | undefined,
): WorldState {
  if (!durable || durable.id !== world.id) return world;
  const saved = savedTemporalPlacement.get(durable);
  if (!saved) return world;
  const { tails, acknowledgedBefore } = saved;
  const temporal = world.experience?.temporal;
  if (!temporal) return world;
  const actors = { ...temporal.actors };
  let changed = false;
  for (const actorId of saved.actors) {
    const actor = temporal.actors[actorId];
    if (!actor) continue;
    const pending: import('@open-legend/domain').TemporalPage[] = [];
    const present = new Set(actor.pages.map((page) => page.id));
    const acknowledgedNative = new Set<string>();
    const operationKey = (
      page: import('@open-legend/domain').TemporalPage,
      operation: import('@open-legend/domain').TemporalHistoryOperation,
    ) => JSON.stringify([page.physicalLife, page.epoch, operation.ordinal]);
    for (const page of actor.pages) {
      // A removal-only correction can retain exclusively old operations. Only
      // acknowledgement of this exact edited selection makes it durable.
      if (temporalPageMutation(page) === 'edit') {
        if (!savedTemporalEdits.has(page.operations)) pending.push(page);
        continue;
      }
      const kept = page.operations.filter((operation) => {
        const acknowledged = temporalOperationAppendOrder(operation) < acknowledgedBefore;
        if (acknowledged && page.appendClosed !== true)
          acknowledgedNative.add(operationKey(page, operation));
        return !acknowledged;
      });
      if (!kept.length) continue;
      if (kept.length === page.operations.length) pending.push(page);
      else {
        const selected = immutableDataSnapshot(
          selectTemporalPageOperations(page, kept, page.id, world),
        );
        noteTemporalResidency(selected, page);
        pending.push(selected);
      }
    }
    // An absent older tail may have been retired while this save was running.
    // New physical pages may enter only while their exact acknowledged operations
    // are still represented by the current native container being relocated.
    const byId = new Map(
      (tails.get(actorId) ?? [])
        .filter(
          (page) =>
            present.has(page.id) ||
            page.operations.every((operation) =>
              acknowledgedNative.has(operationKey(page, operation)),
            ),
        )
        .map((page) => [page.id, page]),
    );
    for (const page of pending) byId.set(page.id, page);
    const pages = [...byId.values()].sort(
      (a, b) => temporalPagePosition(a) - temporalPagePosition(b) || a.id.localeCompare(b.id),
    );
    if (
      pages.length !== actor.pages.length ||
      pages.some((page, index) => page !== actor.pages[index])
    ) {
      actors[actorId] = { ...actor, pages };
      changed = true;
    }
  }
  if (!changed) return world;
  const projected = projectWorldHistory(
    world,
    { temporal: { ...temporal, actors } },
    { temporalSavedPages: tails },
  );
  if (world === durable) {
    savedTemporalPlacement.set(projected, saved);
  }
  return projected;
}

export function inheritSavedTemporalTails(from: WorldState | undefined, to: WorldState): void {
  const saved = from && savedTemporalPlacement.get(from);
  if (saved) savedTemporalPlacement.set(to, saved);
}
