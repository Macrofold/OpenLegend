import type { WorldState } from '@open-legend/domain';

const RECENT_EVENTS = 512;
const EVICTION_BATCH = 256;

/** Eviction is storage placement, never forgetting (docs/architecture.md#performance-critical-path). */
export function retainHotEvents(world: WorldState): WorldState {
  if (world.events.length <= RECENT_EVENTS + EVICTION_BATCH) return world;
  const retained = new Set(world.events.slice(-RECENT_EVENTS).map((event) => event.id));
  for (const entries of Object.values(world.experience?.awareness ?? {}))
    for (const entry of entries) retained.add(entry.eventId);
  for (const entries of Object.values(world.memories))
    for (const entry of entries) {
      if (entry.eventId) retained.add(entry.eventId);
      if (entry.obligation) {
        retained.add(entry.obligation.evidenceId);
        if (entry.obligation.fulfilledBy) retained.add(entry.obligation.fulfilledBy);
      }
    }
  for (const entries of Object.values(world.knowledge))
    for (const entry of entries) retained.add(entry.evidenceId);
  const events = world.events.filter((event) => retained.has(event.id));
  const removed = world.events.length - events.length;
  if (removed < EVICTION_BATCH) return world;
  return {
    ...world,
    events,
    archivedEventCount: (world.archivedEventCount ?? 0) + removed,
  };
}
