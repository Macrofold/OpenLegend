import { bodyPolicy, bodyNarration } from './body-policy.js';
import { rootMembershipChanged } from './entity-index.js';
import { emit } from './events.js';
import { releaseBodyPossessions } from './item-handling.js';
import { reconcileBody } from './living.js';
import type { WorldEvent, WorldState } from './types.js';

export function nextRemainsDeadline(world: WorldState, ids: readonly string[]): number {
  let deadline = Infinity;
  for (const id of ids) {
    const remains = world.entities[id]?.remains;
    if (!remains || remains.phase === 'removed') continue;
    if (remains.phase === 'fresh' && remains.rotAt !== null)
      deadline = Math.min(deadline, remains.rotAt);
    if (remains.removeAt !== null && remains.removeAt > world.simTime)
      deadline = Math.min(deadline, remains.removeAt);
  }
  return deadline;
}

/** Saved deadlines use simulation time. Removal retires physical presence, never identity.
 * docs/worlds/base/survival.md#death-and-remains */
export function advanceRemains(
  world: WorldState,
  ids: readonly string[],
  events: WorldEvent[],
): boolean {
  const policy = bodyPolicy(world)?.remains;
  if (!policy) return false;
  let removed = false;
  for (const id of ids) {
    const entity = world.entities[id],
      remains = entity?.remains;
    if (!entity || !remains || remains.phase === 'removed') continue;
    if (remains.phase === 'fresh' && remains.rotAt !== null && world.simTime >= remains.rotAt) {
      remains.phase = 'rotting';
      remains.yields = [];
      reconcileBody(world, entity, events, 'body-decay');
      emit(world, events, 'body-rotting', bodyNarration(policy.rotNarration, entity), entity);
    }
    if (
      remains.removeAt !== null &&
      world.simTime >= remains.removeAt &&
      releaseBodyPossessions(world, entity)
    ) {
      emit(world, events, 'body-removed', bodyNarration(policy.removalNarration, entity), entity);
      remains.phase = 'removed';
      reconcileBody(world, entity, events, 'body-decay');
      rootMembershipChanged(world, id);
      removed = true;
    }
  }
  return removed;
}
