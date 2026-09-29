import {
  appendedRecordCount,
  EXPERIENCE_LIMITS,
  markPartialAppraisals,
  retiredObjectIds,
  markPartialContributions,
  terminalContributionOwners,
  updateWorld,
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
/** Keep canonical order when a hot map omits earlier terminal records. New records
 * append after the canonical tail, not after the much shorter resident subset. */
function retainMapPositions(before: object, after: object): void {
  const prior = historyMapPositions.get(before);
  if (prior)
    historyMapPositions.set(after, {
      positions: new Map(Object.keys(after).map((key) => [key, prior.positions.get(key)!])),
      next: prior.next,
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
/** Only call after canonical commit. Eviction changes residency, never physical identity
 * or SQL lifecycle rows; complete capture rehydrates them from the same records. */
export function compactObjectHistory(world: WorldState): WorldState {
  if (compactedObjects.has(world.objectState)) return world;
  compactedObjects.add(world.objectState);
  const retired = retiredObjectIds(world);
  if (!retired.length && !Object.keys(world.objectLineage ?? {}).length) return world;
  const entities = retired.length ? { ...world.entities } : world.entities;
  for (const id of retired) delete entities[id];
  return { ...world, entities, ...(world.objectLineage ? { objectLineage: {} } : {}) };
}
export function compactContributionHistory(world: WorldState): WorldState {
  const owners = terminalContributionOwners(world);
  if (!owners.size) return world;
  // Keep unrelated physical/source indexes and the SQL write lineage through this
  // residency-only change using the existing immutable publication path.
  return updateWorld(world, (draft) => {
    for (const id of owners) {
      const entity = world.entities[id];
      if (!entity?.statusEffects) continue;
      const statusEffects = Object.fromEntries(
        Object.entries(entity.statusEffects).filter(
          ([, state]) => !state.contribution || state.active,
        ),
      );
      markPartialContributions(statusEffects);
      retainMapPositions(entity.statusEffects, statusEffects);
      draft.entities[id]!.statusEffects = statusEffects;
    }
  });
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
export function compactHistory(world: WorldState, previous?: WorldState): WorldState {
  const cutoff = world.simTime - EXPERIENCE_LIMITS.rawHours * 3600;
  const compact = <T>(
    entries: T[],
    prior: T[] | undefined,
    at: (entry: T, index: number, length: number) => number,
    tail = 0,
    maximum = Infinity,
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
    for (let i = startIndex; i < entries.length; i++) {
      const entry = entries[i]!,
        expires = at(entry, i, entries.length);
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
    awareness[actorId] = compact(
      entries,
      previous?.experience?.awareness[actorId],
      (entry, index, length) => (index >= length - 24 ? Infinity : entry.at),
      24,
      HOT_AWARENESS_ROWS,
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
  return changed
    ? updateWorld(world, (draft) => {
        draft.memories = memories;
        draft.actionExperience.occurrences = occurrences;
        if (draft.experience) {
          draft.experience.awareness = awareness;
          draft.experience.summaries = summaries;
        }
      })
    : world;
}
