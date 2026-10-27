import {
  MOVEMENT,
  findOutsideSurfaceRoute,
  findSurfaceRoute,
  type Bounds3,
  type NavigationRequest,
  type NavigationResult,
  type RoutePlan,
  type SpatialMap,
  type SurfacePoint,
} from '@open-legend/spatial';
import { assemblyShapes, boundarySolidFromBoxes } from './assembly-geometry.js';
import { applyGateMechanism } from './assemblies.js';
import { prospectiveWork } from './action-capabilities.js';
import { nativeCommandSupported } from './activity-hosts.js';
import { gateUsePermission, type CampAssetPermission } from './camp-asset-permissions.js';
import { draftWorld, finishWorld } from './draft.js';
import { entityGet } from './entity-collection.js';
import { canonicalJson, outcome } from './events.js';
import { gateMovementProblem, gateWorkCandidates } from './gate-operations.js';
import { canHandleItems } from './item-handling.js';
import { navigationResultProblem } from './navigation-result.js';
import { nearbyBodyEntities, physicalWorkPointAvailable } from './spatial.js';
import {
  bodyProfile,
  bodySpace,
  spatialMap,
  worldPosition,
  worldSupport,
} from './spatial-state.js';
import type { GateUseIntent } from './boundary-types.js';
import type { Outcome, WorldState } from './types.js';

export interface BoundaryExitTask {
  id: string;
  map: SpatialMap;
  request: NavigationRequest;
}
interface ExitRoute {
  id: string;
  plan: RoutePlan;
  map: SpatialMap;
}
interface OccupantExit {
  actorId: string;
  physicalLife: number;
  from: SurfacePoint;
  direct: ExitRoute;
  gates: Array<{ itemId: string; reach: ExitRoute; exit: ExitRoute }>;
}
export interface BoundaryExitBatch {
  key: string;
  sourceMap: SpatialMap;
  tasks: BoundaryExitTask[];
  before: OccupantExit[];
  after: OccupantExit[];
}
/** Host-owned answers are disposable and carry no authority or movement intent. */
export interface PreparedBoundaryExits {
  key: string;
  sourceMap: SpatialMap;
  results: ReadonlyMap<string, { request: NavigationRequest; result: NavigationResult }>;
}
export type BoundaryExitPreparations = ReadonlyMap<string, PreparedBoundaryExits>;

function physicalBounds(world: WorldState, rootId: string | undefined): Bounds3 | undefined {
  const root = rootId ? entityGet(world.entities, rootId) : undefined;
  if (!root?.assembly || root.assembly.implementation !== 'grounded-panel-boundary') return;
  const shapes = assemblyShapes(world, root).posts;
  return shapes.length
    ? boundarySolidFromBoxes(shapes.flatMap((shape) => shape.boxes ?? [shape.bounds])).bounds
    : undefined;
}
function overlaps(a: Bounds3, b: Bounds3): boolean {
  return (['x', 'y', 'z'] as const).every(
    (axis) => a.min[axis] <= b.max[axis] && a.max[axis] >= b.min[axis],
  );
}

/** Compare real physical cuts only. Callers supply the assembly owner's private
 * proposed cut, never client geometry. Neither this projection nor its route
 * answers execute an occupant's choice, grant permission or publish a gate move.
 */
export function boundaryExitBatch(
  before: WorldState,
  after: WorldState,
  beforeRootId: string | undefined,
  afterRootId: string,
  beforePermissions: readonly CampAssetPermission[],
  afterPermissions: readonly CampAssetPermission[],
  builder?: { actorId: string; after: SurfacePoint },
): BoundaryExitBatch | undefined {
  const oldBounds = physicalBounds(before, beforeRootId),
    newBounds = physicalBounds(after, afterRootId);
  if (!newBounds) return;
  const bounds = oldBounds ? boundarySolidFromBoxes([oldBounds, newBounds]).bounds : newBounds,
    root = entityGet(after.entities, afterRootId)!,
    family = after.assemblyFamilies![root.assembly!.family.id]!;
  if (family.implementation !== 'grounded-panel-boundary') return;
  const spacing = family.geometry.section.spacing,
    affected = {
      min: { x: bounds.min.x - spacing, y: bounds.min.y - spacing, z: bounds.min.z - spacing },
      max: { x: bounds.max.x + spacing, y: bounds.max.y + spacing, z: bounds.max.z + spacing },
    },
    centre = {
      x: (affected.min.x + affected.max.x) / 2,
      y: (affected.min.y + affected.max.y) / 2,
      z: (affected.min.z + affected.max.z) / 2,
    },
    radius = Math.hypot(
      affected.max.x - centre.x,
      affected.max.y - centre.y,
      affected.max.z - centre.z,
    ),
    occupants = nearbyBodyEntities(before, centre, radius, true).filter(
      (actor) => worldSupport(actor) !== null && overlaps(bodySpace(before, actor), affected),
    ),
    tasks: BoundaryExitTask[] = [];
  const route = (id: string, map: SpatialMap, plan: RoutePlan): ExitRoute => {
    if (plan.status === 'pending') tasks.push({ id, map, request: plan.request });
    return { id, map, plan };
  };
  const cut = (
    world: WorldState,
    rootId: string | undefined,
    permissions: readonly CampAssetPermission[],
    side: 'before' | 'after',
  ): OccupantExit[] => {
    const map = spatialMap(world),
      structure = rootId ? entityGet(world.entities, rootId) : undefined,
      component = structure?.assembly,
      grants = permissions.filter((permission) => permission.assemblyId === rootId),
      opened = new Map<string, WorldState>();
    return occupants.map((original) => {
      const actor = entityGet(world.entities, original.id)!,
        profile = bodyProfile(actor),
        support = worldSupport(actor)!,
        from =
          side === 'after' && builder?.actorId === actor.id
            ? builder.after
            : { ...worldPosition(actor), surfaceId: support },
        outside = {
          min: {
            x: bounds.min.x - profile.radius - MOVEMENT.skin,
            y: bounds.min.y - profile.height,
            z: bounds.min.z - profile.radius - MOVEMENT.skin,
          },
          max: {
            x: bounds.max.x + profile.radius + MOVEMENT.skin,
            y: bounds.max.y,
            z: bounds.max.z + profile.radius + MOVEMENT.skin,
          },
        },
        direct = route(
          JSON.stringify([side, actor.id, 'direct']),
          map,
          findOutsideSurfaceRoute(map, from, outside, profile),
        ),
        gates: OccupantExit['gates'] = [];
      const work = canHandleItems(world, actor) && prospectiveWork(world, actor.id, 'replace');
      if (
        direct.plan.status !== 'reached' &&
        component?.implementation === 'grounded-panel-boundary' &&
        nativeCommandSupported(world, 'operate-gate') &&
        work &&
        !('ok' in work) &&
        work.outcome.ok
      ) {
        for (const [itemId, gate] of Object.entries(component.gates)) {
          if (
            gate.position !== 'closed' ||
            !gateUsePermission(world, rootId!, itemId, 'open', grants) ||
            (gate.barred && !gateUsePermission(world, rootId!, itemId, 'unbar', grants))
          )
            continue;
          const intent: GateUseIntent = {
            assemblyId: rootId!,
            itemId,
            operation: 'open',
            side: 'inside',
            familyId: component.family.id,
            familyVersion: component.family.version,
            familyDigest: component.family.digest,
            expectedRevision: component.revision,
          };
          const stance = gateWorkCandidates(world, actor.id, intent).find((candidate) =>
            physicalWorkPointAvailable(world, actor, candidate, world.itemHandling.reach),
          );
          if (!stance || gateMovementProblem(world, intent, actor.id)) continue;
          let open = opened.get(itemId);
          if (!open) {
            const candidate = draftWorld(world, { retainNativeValues: true });
            let problem: Outcome | undefined;
            if (gate.barred)
              problem = applyGateMechanism(candidate, { ...intent, operation: 'unbar' });
            if (!problem)
              problem = applyGateMechanism(candidate, {
                ...intent,
                expectedRevision: entityGet(candidate.entities, rootId!)!.assembly!.revision,
              });
            open = finishWorld(candidate);
            if (problem) continue;
            opened.set(itemId, open);
          }
          const openMap = spatialMap(open);
          gates.push({
            itemId,
            reach: route(
              JSON.stringify([side, actor.id, itemId, 'reach']),
              map,
              findSurfaceRoute(map, from, stance.stance, profile),
            ),
            exit: route(
              JSON.stringify([side, actor.id, itemId, 'exit']),
              openMap,
              findOutsideSurfaceRoute(openMap, stance.stance, outside, profile),
            ),
          });
        }
      }
      return {
        actorId: actor.id,
        physicalLife: actor.actor!.physicalLife ?? 0,
        from,
        direct,
        gates,
      };
    });
  };
  const prior = cut(before, beforeRootId, beforePermissions, 'before'),
    next = cut(after, afterRootId, afterPermissions, 'after');
  // Map/attachment revisions own geometry. Route plans include exact poses,
  // profiles and goals; gate eligibility is recomputed before this key is used.
  const facts = (cases: OccupantExit[]) =>
    cases.map((entry) => [
      entry.actorId,
      entry.physicalLife,
      entry.from,
      entry.direct.plan,
      entry.gates.map((gate) => [gate.itemId, gate.reach.plan, gate.exit.plan]),
    ]);
  return {
    key: canonicalJson([
      before.id,
      beforeRootId,
      afterRootId,
      spatialMap(before).spatial.revision,
      spatialMap(after).spatial.revision,
      facts(prior),
      facts(next),
      beforePermissions.filter((p) => p.assemblyId === beforeRootId).map((p) => [p.id, p.revision]),
      afterPermissions.filter((p) => p.assemblyId === afterRootId).map((p) => [p.id, p.revision]),
    ]),
    sourceMap: spatialMap(before),
    tasks,
    before: prior,
    after: next,
  };
}

type ExitResult = 'reached' | 'no-route' | 'pending' | 'unavailable';
export function boundaryExitResult(
  batch: BoundaryExitBatch,
  prepared?: PreparedBoundaryExits,
): Outcome {
  const current =
    prepared?.key === batch.key && prepared.sourceMap === batch.sourceMap ? prepared : undefined;
  const read = (route: ExitRoute): ExitResult => {
    if (route.plan.status === 'reached') return 'reached';
    if (route.plan.status === 'invalid-endpoint' || route.plan.status === 'no-route')
      return 'no-route';
    if (route.plan.status !== 'pending') return 'unavailable';
    const answer = current?.results.get(route.id);
    if (!answer || canonicalJson(answer.request) !== canonicalJson(route.plan.request))
      return 'pending';
    if (answer.result.status === 'no-route') return 'no-route';
    return answer.result.status === 'reached' &&
      !navigationResultProblem(
        route.map,
        route.plan.request,
        answer.result,
        route.plan.request.body,
      )
      ? 'reached'
      : 'unavailable';
  };
  const exit = (person: OccupantExit): ExitResult => {
    const paths = [
      read(person.direct),
      ...person.gates.map((gate): ExitResult => {
        const reach = read(gate.reach),
          escape = read(gate.exit);
        if (reach === 'no-route' || escape === 'no-route') return 'no-route';
        if (reach === 'unavailable' || escape === 'unavailable') return 'unavailable';
        return reach === 'reached' && escape === 'reached' ? 'reached' : 'pending';
      }),
    ];
    return paths.includes('reached')
      ? 'reached'
      : paths.includes('pending')
        ? 'pending'
        : paths.includes('unavailable')
          ? 'unavailable'
          : 'no-route';
  };
  for (let i = 0; i < batch.after.length; i++) {
    const after = exit(batch.after[i]!);
    if (after === 'reached') continue;
    const before = exit(batch.before[i]!);
    if (before === 'no-route') continue;
    if (after === 'unavailable' || before === 'unavailable')
      return outcome(
        false,
        'construction-exit-unavailable',
        'The required exit check could not finish. No materials were installed.',
      );
    if (after === 'pending' || before === 'pending')
      return outcome(
        false,
        'construction-exit-pending',
        'The required exit check is still being prepared. No materials were installed.',
      );
    return outcome(
      false,
      'occupied-exit',
      'This change would remove an occupant’s supported way out. Leave a usable entrance or gap.',
    );
  }
  return outcome(true, 'available', 'The change preserves the occupants’ supported exits.');
}
