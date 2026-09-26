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
export const HISTORY_TABLES = new Set(['mind_memories', 'mind_awareness', 'mind_summaries']);
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
  ): T[] => {
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
    if (earliest >= cutoff) return entries;
    const keep = (entry: T, index: number) => at(entry, index, entries.length) >= cutoff;
    const retained = entries.filter(keep);
    if (retained.length === entries.length) return entries;
    const old = historyPositions.get(entries);
    const positions = new Map<string, number>();
    for (let i = 0; i < entries.length; i++) {
      const key = historyKey(entries[i]);
      positions.set(key, old?.positions.get(key) ?? i);
    }
    const selected = new Map(
      retained.map((entry) => [historyKey(entry), positions.get(historyKey(entry))!]),
    );
    expiry.set(
      retained,
      retained.reduce(
        (old, entry, index) => Math.min(old, at(entry, index, retained.length)),
        Infinity,
      ),
    );
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
    );
    changed ||= awareness[actorId] !== entries;
  }
  for (const [actorId, entries] of Object.entries(summaries)) {
    summaries[actorId] = compact(entries, undefined, () => -Infinity);
    changed ||= summaries[actorId] !== entries;
  }
  return changed
    ? {
        ...world,
        memories,
        ...(world.experience ? { experience: { ...world.experience, awareness, summaries } } : {}),
      }
    : world;
}
