import { cloneEntities, entityDelete, entityGet } from '@open-legend/domain';
import {
  appendedRecordCount,
  EXPERIENCE_LIMITS,
  markPartialAppraisals,
  retiredObjectIds,
  markPartialObjectHistory,
  markPartialContributions,
  terminalContributionOwners,
  updateWorld,
  freezeWorld,
  projectWorldHistory,
  selectedTemporalPolicy,
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
  'mind_temporal_chunks',
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
export function compactHistory(
  world: WorldState,
  previous?: WorldState,
  options: { preview?: boolean } = {},
): WorldState {
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
  const memories = { ...world.memories };
  const awareness = { ...world.experience?.awareness };
  const summaries = { ...world.experience?.summaries };
  let changed = false;
  for (const [actorId, entries] of Object.entries(memories)) {
    memories[actorId] = compact(entries, previous?.memories[actorId], (entry) =>
      entry.kind === 'commitment' && !entry.resolved ? Infinity : entry.at,
    );
    changed ||= memories[actorId] !== entries;
  }
  for (const [actorId, entries] of Object.entries(awareness)) {
    // Sensory rows must remain resident until their native absolute expiry; evicting
    // them would strand their expiry in SQL. Native operation admission bounds intake.
    if (entries.some((entry) => entry.retentionClass === 'sensory')) continue;
    awareness[actorId] = compact(
      entries,
      previous?.experience?.awareness[actorId],
      (entry, index, length) => (index >= length - 24 ? Infinity : entry.at),
      24,
      HOT_AWARENESS_ROWS,
      retainedAgreementEvidence(world, actorId),
    );
    changed ||= awareness[actorId] !== entries;
  }
  for (const [actorId, entries] of Object.entries(summaries)) {
    summaries[actorId] = compact(entries, undefined, () => -Infinity);
    changed ||= summaries[actorId] !== entries;
  }
  const occurrences = { ...world.actionExperience.occurrences };
  for (const [actorId, entries] of Object.entries(occurrences)) {
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
    occurrences[actorId] = retained;
    changed = true;
  }
  const projected = changed
    ? projectWorldHistory(
        world,
        {
          memories,
          occurrences,
          ...(world.experience ? { awareness, summaries } : {}),
        },
        options,
      )
    : world;
  return compactTemporalHistory(projected, options);
}

/** Placement only. Canonical chunks survive in SQL until the retention owner
 * explicitly releases them, while native capture keeps only its bounded tail. */
export function compactTemporalHistory(
  world: WorldState,
  options: { preview?: boolean } = {},
): WorldState {
  const temporal = world.experience?.temporal;
  if (!temporal && !world.receivedValues) return world;
  const maximum = selectedTemporalPolicy(world).recent.residentChunks;
  let changed = false;
  const actors = { ...temporal?.actors };
  const placements = new Map<string, Positions>();
  for (const [actorId, actor] of Object.entries(actors)) {
    const chunks = actor.chunks;
    if (chunks.length > maximum) {
      const old = historyPositions.get(chunks);
      const tail = chunks.slice(-maximum);
      placements.set(actorId, {
        positions: new Map(
          tail.map((chunk, index) => [
            chunk.id,
            old?.positions.get(chunk.id) ?? chunks.length - tail.length + index,
          ]),
        ),
        next: old?.next ?? chunks.length,
      });
      actors[actorId] = { ...actor, chunks: tail };
      changed = true;
    }
  }
  const next = temporal && changed ? { ...temporal, actors } : temporal;
  const scope =
    next && next !== temporal
      ? { ...world, experience: { ...world.experience!, temporal: next } }
      : world;
  const received = world.receivedValues;
  const retainedSources = new Set(referencedReceivedValues(scope).keys());
  // The saved append group preserves deterministic comparisons outside actor
  // tails. It does not grant retention ownership or a semantic account.
  for (const id of received?.activeSources ?? []) retainedSources.add(id);
  if (received?.activeSource) retainedSources.add(received.activeSource);
  const entries = Object.entries(received?.sources ?? {});
  const sources = entries.filter(([id]) => retainedSources.has(id));
  const receivedChanged = sources.length !== entries.length;
  if (!changed && !receivedChanged) return world;
  const projected = projectWorldHistory(
    world,
    {
      ...(next && next !== temporal ? { temporal: next } : {}),
      ...(received && receivedChanged
        ? { receivedValues: { ...received, sources: Object.fromEntries(sources) } }
        : {}),
    },
    options,
  );
  // The immutable temporal constructor may replace the newly built tail array.
  // Storage ordinals belong to that actual returned collection, never its input.
  for (const [actorId, placement] of placements)
    historyPositions.set(projected.experience!.temporal!.actors[actorId]!.chunks, placement);
  return projected;
}
