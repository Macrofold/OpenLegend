import {
  appendedEventCount,
  appendedRecordCount,
  type WorldState,
  type Awareness,
} from '@open-legend/domain';
import { timedSync } from './performance.js';

/** Derived indexes for one exact immutable candidate, not another history store.
 * Prepare before acquiring the database when readiness is already committed.
 * docs/performance.md#compact-transactional-persistence
 */
export function prepareHistory(
  previous: WorldState | undefined,
  world: WorldState,
  appendCount?: number,
) {
  return timedSync('history.prepare', () => {
    // Only the domain proof authorizes appending; an application hint is insufficient.
    const fastAppend =
      !!previous &&
      appendCount !== undefined &&
      appendedEventCount(previous.events, world.events) === appendCount;
    const old = fastAppend
      ? undefined
      : new Map(previous?.events.map((event) => [event.id, event]));
    const current = fastAppend ? undefined : new Set(world.events.map((event) => event.id));
    const removed = old ? [...old.keys()].filter((id) => !current!.has(id)) : [];
    const changed = fastAppend
      ? world.events.slice(previous!.events.length)
      : world.events.filter((event) => old!.get(event.id) !== event);
    const previousIds = old ? new Set(old.keys()) : undefined;
    const changedIds = new Set<string>();
    for (const event of changed) {
      if (changedIds.has(event.id)) throw new Error('Duplicate changed history event identity.');
      changedIds.add(event.id);
    }
    const wanted = new Map<string, Set<string>>();
    for (const event of changed)
      for (const actorId of event.audience) {
        let ids = wanted.get(actorId);
        if (!ids) wanted.set(actorId, (ids = new Set()));
        ids.add(event.id);
      }
    const awarenessIndexes = new Map<string, Map<string, Awareness>>();
    const forgottenIndexes = new Map<string, Set<string>>();
    for (const [actorId, ids] of wanted) {
      const values = new Map<string, Awareness>();
      const entries = world.experience?.awareness[actorId] ?? [];
      const prior = previous?.experience?.awareness[actorId] ?? [];
      const count = fastAppend ? appendedRecordCount(prior, entries) : undefined;
      // Preserve append-proven preparation and resolve only the changed events' evidence.
      // Edits search from recent awareness; cold evidence remains owned by stored perspectives.
      // docs/hearing-and-speech.md#performance-and-invalidation
      const start = count === undefined ? 0 : prior.length;
      for (let i = entries.length - 1; i >= start && ids.size; i--) {
        const entry = entries[i]!;
        if (ids.delete(entry.eventId)) values.set(entry.eventId, entry);
      }
      awarenessIndexes.set(actorId, values);
      forgottenIndexes.set(actorId, new Set(world.experience?.forgotten[actorId] ?? []));
    }
    return {
      previous,
      world,
      fastAppend,
      changed,
      removed,
      previousIds,
      forgotten(actorId: string) {
        let ids = forgottenIndexes.get(actorId);
        if (!ids) {
          ids = new Set(world.experience?.forgotten[actorId] ?? []);
          forgottenIndexes.set(actorId, ids);
        }
        return ids;
      },
      perspective(actorId: string, eventId: string) {
        return awarenessIndexes.get(actorId)?.get(eventId);
      },
    };
  });
}
