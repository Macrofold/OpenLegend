import { canStand, type SpatialLayout } from '@open-legend/spatial';
import {
  bodyProfile,
  spatialMap,
  supportedPosition,
  validateSpatialWorld,
} from './spatial-state.js';
import { draftWorld, cloneValue } from './draft.js';
import { finish, outcome } from './events.js';
import type { WorldState, Transition } from './types.js';

/** V1 geometry replacement is atomic and refuses unsafe occupant/support changes. Destruction
 * and moving supports require their own native recovery family, not optimistic visual edits. */
export function replaceSpatialLayout(
  input: WorldState,
  layout: SpatialLayout,
  expectedRevision: number,
): Transition {
  const reject = (message: string) => ({
    world: input,
    events: [],
    outcome: outcome(false, 'spatial-rejected', message),
  });
  if (input.map.spatial.revision !== expectedRevision) return reject('The geometry changed.');
  const world = draftWorld(input);
  world.map = { ...world.map, spatial: cloneValue(layout) };
  world.map.spatial.revision = expectedRevision + 1;
  try {
    validateSpatialWorld(world);
    const map = spatialMap(world);
    for (const entity of Object.values(world.entities)) {
      const p = supportedPosition(entity);
      if (p && !canStand(map, p, bodyProfile(entity)))
        return reject('This change would remove support or obstruct an occupant.');
      if (!p) return reject('Wait for airborne actors to land before structural editing.');
    }
  } catch (error) {
    return reject(error instanceof Error ? error.message : 'Invalid spatial geometry.');
  }
  return finish(world, [], outcome(true, 'spatial-updated', 'Spatial geometry updated.'));
}
