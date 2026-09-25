import { appendedEventCount, type WorldState, type WorldEvent } from '@open-legend/domain';
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
    const audience = new Set<string>();
    for (const event of changed) for (const actorId of event.audience) audience.add(actorId);
    const awarenessIndexes = new Map<string, Map<string, string>>();
    const forgottenIndexes = new Map<string, Set<string>>();
    for (const actorId of audience) {
      const values = new Map<string, string>();
      for (const entry of world.experience?.awareness[actorId] ?? [])
        if (!values.has(entry.eventId)) values.set(entry.eventId, entry.text);
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
      perspectiveText(actorId: string, event: WorldEvent) {
        return awarenessIndexes.get(actorId)?.get(event.id) ?? event.text;
      },
    };
  });
}
