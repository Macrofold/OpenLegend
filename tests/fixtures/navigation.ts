import { entityValues } from '../../packages/domain/src/index.js';
import { BASE_BODY_PROFILES } from '../../packages/domain/src/worlds/base/spatial-definitions.js';
import {
  advanceWorld,
  completeNavigation,
  nativeRefugeBatch,
  nativeRefugePreparationReady,
  type PreparedNativeRefuges,
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
  body: BodyProfile = BASE_BODY_PROFILES.person,
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

export function prepareWorldNavigation(
  world: WorldState,
  nativeRefuges = new Map<string, PreparedNativeRefuges>(),
): WorldState {
  if (
    !entityValues(world.entities).some(
      (actor) =>
        (actor.actor?.action?.navigation && !actor.actor.action.navigation.failure) ||
        (actor.animal?.episode?.proposal &&
          !nativeRefugePreparationReady(world, actor, nativeRefuges)),
    )
  )
    return world;
  const planner = new RecastPlanner(world.map);
  try {
    for (const actor of entityValues(world.entities)) {
      const batch = actor.animal?.episode?.proposal ? nativeRefugeBatch(world, actor) : undefined;
      if (batch?.requests.length && !nativeRefugePreparationReady(world, actor, nativeRefuges))
        nativeRefuges.set(actor.id, {
          key: batch.key,
          results: batch.requests.map((entry) => ({
            ...entry,
            result: planner.route(entry.request),
          })),
        });
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
  const nativeRefuges = new Map<string, PreparedNativeRefuges>();
  for (let attempts = 0; attempts < 10_000; attempts++) {
    world = prepareWorldNavigation(world, nativeRefuges);
    const result = advanceWorld(world, target - world.simTime, { nativeRefuges });
    events.push(...result.events);
    if (!result.outcome.ok || result.world.paused || result.world.simTime >= target)
      return { ...result, events };
    // Starting queued work can request a route before any game time passes.
    // Resolve that new request on the next iteration, as the host coordinator does.
    if (
      result.world.simTime === world.simTime &&
      (result.outcome.code !== 'navigation-pending' || result.world === world)
    )
      throw new Error('Native navigation fixture made no progress.');
    world = result.world;
  }
  throw new Error('Native navigation fixture exceeded its bounded progress attempts.');
}
