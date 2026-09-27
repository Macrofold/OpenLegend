import {
  advanceWorld,
  completeNavigation,
  type Transition,
  type WorldState,
} from '../../packages/domain/src/index.js';
import {
  findSurfaceRoute,
  type BodyProfile,
  type SpatialMap,
  type SurfacePoint,
} from '../../packages/spatial/src/index.js';
import {
  initializeNavigationRuntime,
  RecastPlanner,
} from '../../apps/server/src/navigation/backend.js';

await initializeNavigationRuntime();

/** Real backend fixture: pure domain calls do not run the host's worker coordinator. */
export function preparedRoute(
  map: SpatialMap,
  from: SurfacePoint,
  to: SurfacePoint,
  body?: BodyProfile,
) {
  const planned = findSurfaceRoute(map, from, to, body);
  if (planned.status !== 'pending') return planned;
  const planner = new RecastPlanner(map);
  try {
    return planner.route(planned.request);
  } finally {
    planner.destroy();
  }
}

export function prepareWorldNavigation(world: WorldState): WorldState {
  if (
    !Object.values(world.entities).some(
      (actor) => actor.actor?.action?.navigation && !actor.actor.action.navigation.failure,
    )
  )
    return world;
  const planner = new RecastPlanner(world.map);
  try {
    for (const actor of Object.values(world.entities)) {
      const action = actor.actor?.action;
      if (!action?.navigation || action.navigation.failure) continue;
      const request = action.navigation.request;
      world = completeNavigation(world, actor.id, action.id, request, planner.route(request)).world;
    }
    return world;
  } finally {
    planner.destroy();
  }
}

/** Preserve actual elapsed time across technical waits; an offered span is not progress. */
export function advanceWithNavigation(world: WorldState, seconds: number): Transition {
  const target = world.simTime + seconds;
  const events: Transition['events'] = [];
  for (let attempts = 0; attempts < 10_000; attempts++) {
    world = prepareWorldNavigation(world);
    const result = advanceWorld(world, target - world.simTime);
    events.push(...result.events);
    if (!result.outcome.ok || result.world.paused || result.world.simTime >= target)
      return { ...result, events };
    if (result.world.simTime === world.simTime)
      throw new Error('Native navigation fixture made no progress.');
    world = result.world;
  }
  throw new Error('Native navigation fixture exceeded its bounded progress attempts.');
}
