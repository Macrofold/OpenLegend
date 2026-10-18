import { entityGet } from '../../packages/domain/src/index.js';
import {
  advanceWorld,
  canReachEntity,
  commitActorResponse,
  executeCommand,
  findApproachPath,
  freezeWorld,
  seesEntity,
  SIMULATION_RULES,
  spawnWorldEntity,
  worldPlacement,
  worldPosition,
  type Entity,
  type WorldState,
} from '@open-legend/domain';
import { canStand, distance3D, type SurfacePoint } from '@open-legend/spatial';
import { spatialMap } from '../../packages/domain/src/spatial-state.js';
import { starterGroundAt } from '../../packages/domain/src/worlds/base/landscape.js';
import { BASE_BODY_PROFILES } from '../../packages/domain/src/worlds/base/spatial-definitions.js';
import type { RoutineResource } from './long-soak.js';
import type { prepareRoutinePlan } from './routine-plan.js';

type Targets = Record<string, { fiber: string; berries: string }>;
type Selection = NonNullable<ReturnType<typeof prepareRoutinePlan>>;

/** A query-only pose for checking a proposed supported work location. */
function at(actor: Entity, point: SurfacePoint): Entity {
  return { ...actor, placement: worldPlacement(point, point.surfaceId) };
}

function directStances(
  world: WorldState,
  actorId: string,
  pair: Targets[string],
  rejected: (reason: string) => void = () => {},
) {
  const refuse = (reason: string) => {
    rejected(reason);
    return undefined;
  };
  const actor = entityGet(world.entities, actorId),
    fiber = entityGet(world.entities, pair.fiber),
    berries = entityGet(world.entities, pair.berries);
  if (!actor || !fiber || !berries) return refuse('missing-person-or-patch');
  const reach = SIMULATION_RULES.interactionRadius;
  if (
    [fiber, berries].some(
      (patch) => !seesEntity(world, actor, patch) || canReachEntity(world, actor, patch, reach),
    )
  )
    return refuse('initial-sight-or-already-in-reach');
  const first = findApproachPath(world, actor, fiber, reach);
  if (first?.status !== 'reached' || !first.path.length)
    return refuse(`initial-fiber-route:${first?.status ?? 'missing'}`);
  const p = first.path.at(-1)!;
  const firstActor = at(actor, p);
  if (!seesEntity(world, firstActor, berries) || canReachEntity(world, firstActor, berries, reach))
    return refuse('fiber-stance-berry-sight-or-reach');
  const second = findApproachPath(world, firstActor, berries, reach);
  if (second?.status !== 'reached' || !second.path.length)
    return refuse(`fiber-berry-route:${second?.status ?? 'missing'}`);
  const q = second.path.at(-1)!;
  const secondActor = at(actor, q);
  if (!seesEntity(world, secondActor, fiber) || canReachEntity(world, secondActor, fiber, reach))
    return refuse('berry-stance-fiber-sight-or-reach');
  const returning = findApproachPath(world, secondActor, fiber, reach);
  if (returning?.status !== 'reached' || !returning.path.length)
    return refuse(`return-route:${returning?.status ?? 'missing'}`);
  if (
    ![firstActor, secondActor].every((stance) =>
      [fiber, berries].every((patch) => seesEntity(world, stance, patch)),
    )
  )
    return refuse('proposed-stance-sight');
  return {
    firstMetres: first.length,
    betweenMetres: second.length,
    returnMetres: returning.length,
  };
}

/** Finite fixture admission, never a route or movement override. */
export function placeTravelResources(input: WorldState, actorIds: readonly string[]) {
  let world = input;
  const resources: RoutineResource[] = [],
    targets: Targets = {};
  const routes: Record<string, NonNullable<ReturnType<typeof directStances>>> = {};
  for (const actorId of actorIds) {
    const origin = worldPosition(entityGet(world.entities, actorId));
    if (!origin) throw new Error(`Travel resident ${actorId} has no physical location.`);
    let accepted = false;
    const rejections: Record<string, number> = {};
    const rejected = (reason: string) => {
      rejections[reason] = (rejections[reason] ?? 0) + 1;
    };
    // Separated normal patches demand an approach and a later return. Candidate
    // search is intentionally bounded; an unavailable pair is a setup failure.
    candidatePairs: for (const radius of [4, 5, 6]) {
      for (let direction = 0; direction < 8; direction++) {
        const angle = (direction * Math.PI) / 4;
        for (const separation of [Math.PI, (2 * Math.PI) / 3]) {
          let trial = world;
          const pair = { fiber: '', berries: '' };
          for (const [key, type, turn] of [
            ['fiber', 'dry-grass-fibers', 0],
            ['berries', 'berry-bush', separation],
          ] as const) {
            const x = origin.x + radius * Math.cos(angle + turn),
              z = origin.z + radius * Math.sin(angle + turn);
            if (x < 0 || z < 0 || x >= trial.map.width - 1 || z >= trial.map.height - 1) {
              rejected('map-edge');
              break;
            }
            const point = starterGroundAt(trial.map.spatial, x, z);
            if (!canStand(spatialMap(trial), point, BASE_BODY_PROFILES.object)) {
              rejected('unsupported-patch');
              break;
            }
            const result = spawnWorldEntity(trial, {
              id: `profile-travel:${actorId}:${key}`,
              type,
              position: point,
            });
            if (!result.outcome.ok || !result.outcome.entityId) {
              rejected(`spawn:${result.outcome.code}`);
              break;
            }
            pair[key] = result.outcome.entityId;
            trial = result.world;
          }
          if (!pair.fiber || !pair.berries) continue;
          const route = directStances(trial, actorId, pair, rejected);
          if (!route) continue;
          world = trial;
          targets[actorId] = pair;
          routes[actorId] = route;
          for (const [key, type] of [
            ['fiber', 'dry-grass-fibers'],
            ['berries', 'berry-bush'],
          ] as const) {
            const id = pair[key];
            resources.push({
              actorId,
              id,
              type,
              quantity: entityGet(world.entities, id)!.resource!.quantity,
            });
          }
          accepted = true;
          break candidatePairs;
        }
      }
    }
    if (!accepted)
      throw new Error(
        `No mutually visible supported travel pair for ${actorId}: ${JSON.stringify({ origin, rejections })}.`,
      );
  }
  for (const actorId of actorIds) {
    const route = directStances(world, actorId, targets[actorId]!);
    if (!route) throw new Error(`Later travel patches invalidated ${actorId}'s direct corridors.`);
    routes[actorId] = route;
  }
  return { world, resources, targets, routes };
}

function snapshot(world: WorldState, actorId: string) {
  const entity = entityGet(world.entities, actorId)!,
    action = entity.actor?.action;
  return {
    position: { ...worldPosition(entity) },
    actionId: action?.id,
    stage: action?.stage,
    replans: action?.replans ?? 0,
    path: action?.path.map((point) => ({ ...point })) ?? [],
  };
}

/** Locate the reached point on the actual old remaining polyline. A discarded
 * unused tail contributes no distance, including when work starts before its end. */
function reachedPrefix(
  previous: ReturnType<typeof snapshot>,
  point: { x: number; y: number; z: number },
) {
  let from = previous.position,
    distance = 0;
  for (const to of previous.path) {
    const length = distance3D(from, to),
      travelled = distance3D(from, point);
    if (Math.abs(travelled + distance3D(point, to) - length) < 1e-7) return distance + travelled;
    distance += length;
    from = to;
  }
  return;
}

/** Uses existing publication notifications, with one retained small route per person. */
export function travelProgress(initial: WorldState, actorIds: readonly string[]) {
  const prior = new Map(actorIds.map((id) => [id, snapshot(initial, id)]));
  const actors = Object.fromEntries(
    actorIds.map((id) => [
      id,
      {
        verifiedRouteMetres: 0,
        displacementLowerBoundMetres: 0,
        unknownMovingTransitions: 0,
        approachStarts: 0,
        arrivals: 0,
        navigationPendingPublications: 0,
        routeFailurePublications: 0,
      },
    ]),
  );
  return {
    actors,
    observe(world: WorldState) {
      for (const actorId of actorIds) {
        const before = prior.get(actorId)!,
          after = snapshot(world, actorId),
          totals = actors[actorId]!;
        const moved = distance3D(before.position, after.position);
        totals.displacementLowerBoundMetres += moved;
        if (
          after.stage === 'approaching' &&
          (before.actionId !== after.actionId || before.stage !== 'approaching')
        )
          totals.approachStarts++;
        if (
          before.stage === 'approaching' &&
          before.actionId === after.actionId &&
          after.stage === 'working'
        )
          totals.arrivals++;
        if (moved > 1e-8) {
          const prefix =
            before.actionId === after.actionId &&
            before.stage === 'approaching' &&
            before.replans === after.replans
              ? reachedPrefix(before, after.position)
              : undefined;
          if (prefix === undefined) totals.unknownMovingTransitions++;
          else totals.verifiedRouteMetres += prefix;
        }
        const navigation = entityGet(world.entities, actorId)?.actor?.action?.navigation;
        if (navigation) totals.navigationPendingPublications++;
        if (navigation?.failure) totals.routeFailurePublications++;
        prior.set(actorId, after);
      }
    },
  };
}

/** Disposable native rehearsal only. The measured service/world is never advanced
 * or edited here; all selection, item binding, movement and effects remain native. */
export function rehearseTravel(
  initial: WorldState,
  selections: readonly Selection[],
  targets: Targets,
  cycleSeconds: number,
) {
  let world = structuredClone(initial);
  world.paused = false;
  freezeWorld(world);
  const actorIds = selections.map((selection) => selection.actorId),
    progress = travelProgress(world, actorIds),
    initialApproaches = new Set<string>();
  const observeFirstApproaches = () => {
    for (const actorId of actorIds) {
      const action = entityGet(world.entities, actorId)?.actor?.action;
      if (
        action?.type === 'gather' &&
        action.targetId === targets[actorId]?.fiber &&
        action.stage === 'approaching'
      )
        initialApproaches.add(actorId);
    }
  };
  for (const selection of selections) {
    const result = commitActorResponse(
      world,
      selection.id,
      selection.actorId,
      selection.response,
      selection.actions,
      selection.entityIds,
      selection.expectedPlan,
      selection.attemptBindings,
    );
    const accepted = result.world.responseReceipts?.[selection.id]?.components['routine'];
    if (!result.outcome.ok || !accepted?.ok)
      throw new Error(
        `Travel rehearsal refused ${selection.actorId}: ${accepted?.message ?? result.outcome.message}`,
      );
    world = result.world;
    freezeWorld(world);
  }
  // Enqueue admission records chosen work; ordinary native advancement starts it.
  // Observe actual motion rather than requiring the queue receipt to start walking.
  observeFirstApproaches();
  progress.observe(world);
  const completed = new Set<string>(),
    returned = new Set<string>(),
    stances = new Map<string, Set<string>>();
  const started = performance.now(),
    // Preserve the former 660-second travel allowance around the actual authored
    // cycle, rather than failing setup when a pacing experiment lengthens work.
    deadline = initial.simTime + cycleSeconds + 660;
  let calls = 0;
  while (returned.size < actorIds.length) {
    if (++calls > 2000 || world.simTime >= deadline || performance.now() - started > 30000)
      throw new Error(
        `Travel rehearsal exceeded its finite setup bound: ${calls} calls, ${world.simTime - initial.simTime}/${deadline - initial.simTime} game seconds, ${performance.now() - started} ms.`,
      );
    const transition = advanceWorld(world, Math.min(30, deadline - world.simTime), {
      maxIntervals: 1,
    });
    if (!transition.outcome.ok || transition.world.simTime <= world.simTime)
      throw new Error(`Travel rehearsal made no progress: ${transition.outcome.message}`);
    world = transition.world;
    freezeWorld(world);
    observeFirstApproaches();
    progress.observe(world);
    for (const selection of selections) {
      const actorId = selection.actorId,
        actor = entityGet(world.entities, actorId)!,
        state = actor.actor!,
        action = state.action,
        pair = targets[actorId]!;
      if (action?.type === 'gather' && action.stage === 'working') {
        if (!initialApproaches.has(actorId))
          throw new Error(`Travel rehearsal did not observe ${actorId}'s first fiber approach.`);
        for (const targetId of [pair.fiber, pair.berries])
          if (!seesEntity(world, actor, entityGet(world.entities, targetId)!))
            throw new Error(`Travel rehearsal lost sight from ${actorId}'s actual work stance.`);
        if (
          !action.targetId ||
          !canReachEntity(
            world,
            actor,
            entityGet(world.entities, action.targetId)!,
            SIMULATION_RULES.interactionRadius,
          )
        )
          throw new Error(`Travel rehearsal work stance is out of reach for ${actorId}.`);
        const seen = stances.get(actorId) ?? new Set<string>();
        seen.add(action.targetId);
        stances.set(actorId, seen);
        if (completed.has(actorId) && action.targetId === pair.fiber) returned.add(actorId);
      }
      const plan = state.agency.plan;
      if (!completed.has(actorId) && plan?.status === 'blocked')
        throw new Error(`Travel rehearsal plan blocked for ${actorId}.`);
      if (
        !completed.has(actorId) &&
        plan?.id === `${selection.id}:routine` &&
        plan.status === 'completed'
      ) {
        const producer = plan.steps[3],
          eater = plan.steps[4];
        const occurrence = world.actionExperience.occurrences[actorId]?.find(
          (entry) => entry.actionId === eater?.actionId,
        );
        if (
          !producer?.outcome?.itemId ||
          occurrence?.command.type !== 'eat' ||
          occurrence.command.itemId !== producer.outcome.itemId ||
          occurrence.status !== 'completed'
        )
          throw new Error(`Travel rehearsal food binding failed for ${actorId}.`);
        completed.add(actorId);
        const returning = executeCommand(world, {
          id: `profile-return:${actorId}`,
          actorId,
          type: 'gather',
          targetId: pair.fiber,
        });
        if (
          !returning.outcome.ok ||
          entityGet(returning.world.entities, actorId)?.actor?.action?.stage !== 'approaching'
        )
          throw new Error(`Travel rehearsal could not return ${actorId} to fibers.`);
        world = returning.world;
        freezeWorld(world);
        progress.observe(world);
      }
    }
  }
  for (const actorId of actorIds)
    if (!initialApproaches.has(actorId) || !progress.actors[actorId]!.displacementLowerBoundMetres)
      throw new Error(`Travel rehearsal did not observe actual travel for ${actorId}.`);
  return {
    scope:
      'Discarded clone: actual first work/meal cycle and return approach; no measured state edits.',
    gameSeconds: world.simTime - initial.simTime,
    maximumGameSeconds: deadline - initial.simTime,
    setupMs: performance.now() - started,
    calls,
    mealsBoundToProducedFood: completed.size,
    residentsReturnedToFiberWork: returned.size,
    observedResourceStances: Object.fromEntries([...stances].map(([id, seen]) => [id, [...seen]])),
    actors: progress.actors,
  };
}
