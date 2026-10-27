import { spatialMap } from '../../packages/domain/src/spatial-state.js';
import { entityValues } from '../../packages/domain/src/index.js';
import { BASE_BODY_PROFILES } from '../../packages/domain/src/worlds/base/spatial-definitions.js';
import {
  advanceWorld,
  freezeWorld,
  constructionPermissionBatch,
  absorbConstructionPermissionBatch,
  finishConstructionPermissionBatch,
  completeNavigationBatch,
  type NavigationCompletion,
  nativeRefugeBatch,
  nativeRefugePreparationReady,
  pendingBoundaryExitPreparation,
  type PreparedBoundaryExits,
  type PreparedNativeRefuges,
  type Transition,
  type WorldState,
} from '../../packages/domain/src/index.js';
import {
  findSurfaceRoute,
  type BodyProfile,
  type NavigationRequest,
  type NavigationResult,
  type SpatialMap,
  type SurfacePoint,
} from '../../packages/spatial/src/index.js';
import {
  initializeNavigationRuntime,
  RecastPlanner,
} from '../../apps/server/src/navigation/backend.js';

await initializeNavigationRuntime();

// Match the ordinary navigation worker's derived-map lifetime. Rebuilding every
// native interval dominated the complete-world journey (91.72% of the CPU sample).
// One map is retained; replacing geometry destroys its WASM resources first.
let nativePlanner: RecastPlanner | undefined;
function worldPlanner(world: WorldState): RecastPlanner {
  const map = spatialMap(world);
  if (nativePlanner?.map !== map) {
    nativePlanner?.destroy();
    nativePlanner = new RecastPlanner(map);
  }
  return nativePlanner;
}
export function releasePreparedNavigation(): void {
  nativePlanner?.destroy();
  nativePlanner = undefined;
}

if (process.env['VITEST']) {
  const { afterAll } = await import('vitest');
  afterAll(releasePreparedNavigation);
}

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
        ((actor.animal?.episode?.proposal || actor.animal?.foraging?.proposal) &&
          !nativeRefugePreparationReady(world, actor, nativeRefuges)),
    )
  )
    return world;
  const planner = worldPlanner(world);
  try {
    const routes: NavigationCompletion[] = [];
    const completeRoutes = () => {
      world = completeNavigationBatch(world, routes);
      routes.length = 0;
    };
    for (const actor of entityValues(world.entities)) {
      // Keep native proposal preparation interleaved exactly as before.
      if (actor.animal?.episode?.proposal || actor.animal?.foraging?.proposal) completeRoutes();
      const batch =
        actor.animal?.episode?.proposal || actor.animal?.foraging?.proposal
          ? nativeRefugeBatch(world, actor)
          : undefined;
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
      routes.push({
        actorId: actor.id,
        actionId: action.id,
        request,
        result: planner.route(request),
      });
    }
    completeRoutes();
    return world;
  } catch (error) {
    releasePreparedNavigation();
    throw error;
  }
}

/** Preserve actual elapsed time across technical waits; an offered span is not progress. */
export function advanceWithNavigation(
  world: WorldState,
  seconds: number,
  options: Parameters<typeof advanceWorld>[2] = {},
): Transition {
  const target = world.simTime + seconds;
  const immutablePublication = Object.isFrozen(world);
  const events: Transition['events'] = [];
  const permissions = constructionPermissionBatch(
    world.id,
    options.constructionPermissions ?? [],
    options.campAssetPermissions ?? [],
  );
  const nativeRefuges = new Map<string, PreparedNativeRefuges>(options.nativeRefuges ?? []);
  const boundaryExits = new Map(options.boundaryExits ?? []) as Map<string, PreparedBoundaryExits>;
  for (let attempts = 0; attempts < 10_000; attempts++) {
    // Preserve the caller's ownership boundary: published server snapshots stay
    // immutable across route completion; explicitly mutable scenario builders stay
    // editable. A mutable route result must not disable the server's physical caches.
    world = prepareWorldNavigation(world, nativeRefuges);
    if (immutablePublication) world = freezeWorld(world);
    for (const actor of entityValues(world.entities)) {
      if (!actor.actor?.action?.assemblyExitPending) continue;
      const pending = pendingBoundaryExitPreparation(
        world,
        actor.id,
        permissions.permissions,
        permissions.campAssets,
        boundaryExits,
      );
      if (pending?.outcome.code !== 'construction-exit-pending' || !pending.batch) continue;
      const batch = pending.batch,
        results = new Map<string, { request: NavigationRequest; result: NavigationResult }>();
      const groups = new Map<SpatialMap, typeof batch.tasks>();
      for (const task of batch.tasks) {
        let group = groups.get(task.map);
        if (!group) groups.set(task.map, (group = []));
        group.push(task);
      }
      for (const [map, tasks] of groups) {
        const planner = new RecastPlanner(map);
        try {
          for (const task of tasks)
            results.set(task.id, { request: task.request, result: planner.route(task.request) });
        } finally {
          planner.destroy();
        }
      }
      boundaryExits.set(actor.id, { key: batch.key, sourceMap: batch.sourceMap, results });
    }
    const result = advanceWorld(world, target - world.simTime, {
      ...options,
      nativeRefuges,
      boundaryExits,
      constructionPermissions: permissions.permissions,
      campAssetPermissions: permissions.campAssets,
    });
    events.push(...result.events);
    absorbConstructionPermissionBatch(permissions, result);
    if (!result.outcome.ok || result.world.paused || result.world.simTime >= target)
      return finishConstructionPermissionBatch({ ...result, events }, permissions);
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
