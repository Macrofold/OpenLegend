import { appendedRecordCount, EXPERIENCE_LIMITS, type WorldState } from '@open-legend/domain';

/** Placement only: all evicted sources remain in their canonical tables.
 * docs/performance.md#inactive-history-residency
 */
export const HISTORY_TABLES = new Set(['mind_memories', 'mind_awareness', 'mind_summaries']);
type Positions = { complete?: boolean; positions: Map<string, number>; next: number };
export const historyPositions = new WeakMap<unknown[], Positions>();
export const historyKey = (entry: unknown): string => {
  const value = entry as { id?: string; eventId?: string };
  return value.id ?? value.eventId!;
};
const expiry = new WeakMap<unknown[], number>();
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
