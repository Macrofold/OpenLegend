import type { MotionTrack } from './flight.js';
import {
  canWalkSegment,
  distance3D,
  interpolate,
  SPATIAL_LIMITS,
  type SurfacePoint,
} from '@open-legend/spatial';
import { draftWorld, readOnlyDraftView } from './draft.js';
import { entityGet } from './entity-collection.js';
import { foragingProfile } from './native-foraging.js';
import { distance, occupiedBodySweepReader, type occupiedBodySweepQuery } from './spatial.js';
import { bodyProfile, setSpatialPosition, spatialMap, supportedPosition } from './spatial-state.js';
import type { Entity, Position, WorldState } from './types.js';

/** Execute one actor's supported path through the shared placement writer. The
 * simulation coordinator owns phase order; geometry, pursuit limits and partial
 * movement remain here for every caller, including following and animal travel. */
function followPath(
  world: WorldState,
  actor: Entity,
  path: SurfacePoint[],
  distanceBudget: number,
  occupiedBodies = false,
  preview?: { seconds: number; track: MotionTrack },
): boolean {
  const forage = actor.animal?.foraging,
    work = forage?.work,
    forageDefinition =
      work?.kind === 'hunt' || work?.kind === 'regroup' ? foragingProfile(world, actor) : undefined;
  let remaining = Math.min(
    distanceBudget,
    forageDefinition
      ? Math.max(
          0,
          (work!.kind === 'hunt'
            ? forageDefinition.hunt!.pursuit.routeMetres
            : forageDefinition.regroup!.legMetres) - work!.travelledMetres,
        )
      : Infinity,
  );
  const territory =
    actor.threat &&
    ['pursuit', 'search'].includes(actor.threat.mode) &&
    actor.threat.policy.pursuitMetres !== undefined
      ? actor.threat
      : undefined;
  if (territory)
    remaining = Math.min(
      remaining,
      Math.max(0, territory.policy.pursuitMetres! - (territory.travelledMetres ?? 0)),
    );
  let position = supportedPosition(actor),
    heading = actor.spatial.heading,
    steps = 0,
    consumedPoints = 0,
    travelled = 0;
  if (!position) return false;
  const moveTo = (point: Position, support: string) => {
    const from = position!,
      dx = point.x - from.x,
      dz = point.z - from.z;
    if (Math.hypot(dx, dz) > 1e-8) heading = Math.atan2(dx, dz);
    if (
      point.x !== from.x ||
      point.y !== from.y ||
      point.z !== from.z ||
      support !== from.surfaceId
    ) {
      travelled += distance3D(from, point);
      steps++;
    }
    position = { x: point.x, y: point.y, z: point.z, surfaceId: support };
    if (preview && distanceBudget > 0) {
      const at = Math.min(preview.seconds, (travelled / distanceBudget) * preview.seconds);
      if (at > preview.track.at.at(-1)!) {
        preview.track.at.push(at);
        preview.track.pose.push({ ...position });
      } else preview.track.pose[preview.track.pose.length - 1] = { ...position };
    }
  };
  const map = spatialMap(world),
    profile = bodyProfile(actor);
  // Only this actor moves during this operation; the reader ignores its own body.
  // Reuse other bodies' preparation across waypoints and collision-prefix probes.
  const bodySweeps = occupiedBodies ? occupiedBodySweepReader(world, actor) : undefined;
  // A territorial animal cannot take a detour outside its authored pursuit bound.
  const withinTerritory = (point: SurfacePoint) =>
    !actor.threat ||
    !['pursuit', 'search'].includes(actor.threat.mode) ||
    distance(point, actor.threat.policy.home) <= actor.threat.policy.territoryRadius;
  try {
    while (consumedPoints < path.length) {
      const point = readOnlyDraftView(path[consumedPoints]!),
        start = position;
      if (!start) return false;
      const delta = distance(start, point);
      if (delta <= SPATIAL_LIMITS.epsilon) {
        if (!withinTerritory(point) || !canWalkSegment(map, start, point, profile)) return false;
        moveTo(point, point.surfaceId);
        consumedPoints++;
        continue;
      }
      if (remaining <= 0) break;
      const next =
        delta <= remaining
          ? point
          : {
              ...interpolate(start, point, remaining / delta),
              surfaceId: start.surfaceId,
            };
      let bodies: ReturnType<typeof occupiedBodySweepQuery> | undefined;
      const clear = (to: SurfacePoint) =>
        withinTerritory(to) &&
        canWalkSegment(map, start, to, profile) &&
        (!bodySweeps || (bodies ??= bodySweeps(start, next)).clear(to));
      if (!clear(next)) {
        if (occupiedBodies) {
          let low = 0,
            high = 1;
          const subdivisions = 16,
            resolution = 2 ** subdivisions,
            contact = bodies?.firstContactFraction();
          let bracketed = false;
          // A same-support segment proved statically clear has monotone clearance.
          // Use native contact only to propose the existing search's adjacent grid
          // points, then prove both with the unchanged predicate. Numerical edge
          // cases and static obstructions retain the full stopping search.
          // docs/spatial-world.md#movement
          if (contact !== undefined && start.surfaceId === next.surfaceId) {
            const candidate = Math.min(resolution - 1, Math.floor(contact * resolution));
            for (const index of [candidate, candidate - 1]) {
              if (index < 0) continue;
              const lower = index / resolution,
                upper = (index + 1) / resolution;
              if (
                (index === 0 ||
                  clear({ ...interpolate(start, next, lower), surfaceId: start.surfaceId })) &&
                (upper === 1 ||
                  !clear({ ...interpolate(start, next, upper), surfaceId: start.surfaceId }))
              ) {
                low = lower;
                bracketed = true;
                break;
              }
            }
          }
          if (!bracketed)
            for (let i = 0; i < subdivisions; i++) {
              const fraction = (low + high) / 2;
              if (clear({ ...interpolate(start, next, fraction), surfaceId: start.surfaceId }))
                low = fraction;
              else high = fraction;
            }
          if (low > 0) moveTo(interpolate(start, next, low), start.surfaceId);
        }
        return false;
      }

      if (delta <= remaining) {
        moveTo(point, point.surfaceId);
        consumedPoints++;
        remaining -= delta;
      } else {
        moveTo(next, start.surfaceId);
        remaining = 0;
      }
    }
    return true;
  } finally {
    if (!preview && consumedPoints) path.splice(0, consumedPoints);
    if (!preview && steps)
      setSpatialPosition(world, actor, position!, position!.surfaceId, {
        steps,
        heading,
        continuity: 'physical',
      });
    if (!preview && territory && travelled)
      territory.travelledMetres = (territory.travelledMetres ?? 0) + travelled;
    if (!preview && work && steps) {
      work.travelledMetres += travelled;
      work.lastPoint = { ...position! };
    }
  }
}

/** Read the exact same admitted/truncated path without effects or saved randomness. */
export function movementTrack(
  world: WorldState,
  actor: Entity,
  path: readonly SurfacePoint[],
  distanceBudget: number,
  seconds: number,
  occupiedBodies = false,
): { track: MotionTrack; complete: boolean } {
  const point = supportedPosition(actor)!;
  const track: MotionTrack = { at: [0], pose: [{ ...point }] };
  const complete = followPath(world, actor, [...path], distanceBudget, occupiedBodies, {
    seconds,
    track,
  });
  if (track.at.at(-1)! < seconds || track.at.length === 1) {
    track.at.push(seconds);
    track.pose.push({ ...track.pose.at(-1)! });
  }
  return { track, complete };
}
export function moveAlongPath(
  world: WorldState,
  actor: Entity,
  path: SurfacePoint[],
  distanceBudget: number,
  occupiedBodies = false,
): boolean {
  return followPath(world, actor, path, distanceBudget, occupiedBodies);
}

/** Movement collisions are sequential native operations. Forecast each supported
 * path against the endpoints of earlier movers in an isolated copy-on-write view;
 * the real world retains all action, RNG, evidence and placement authority. */
export function orderedMovementTracks(
  world: WorldState,
  seconds: number,
  prepare: (
    shadow: WorldState,
    move: (
      actorId: string,
      path: readonly SurfacePoint[],
      distance: number,
      occupiedBodies: boolean,
    ) => void,
  ) => void,
): Map<string, MotionTrack[]> {
  const shadow = draftWorld(world, { retainNativeValues: true }),
    tracks = new Map<string, MotionTrack[]>();
  prepare(shadow, (actorId, path, distance, occupiedBodies) => {
    const actor = entityGet(shadow.entities, actorId);
    if (!actor || !supportedPosition(actor)) return;
    const predicted = movementTrack(shadow, actor, path, distance, seconds, occupiedBodies).track;
    tracks.set(actorId, [predicted]);
    const last = predicted.pose.at(-1)!;
    // These are placement writes only on the disposable forecast, so a later
    // mover sees a blocker leave or stop at its real prefix. No event is emitted.
    const support = (last as SurfacePoint).surfaceId ?? supportedPosition(actor)!.surfaceId;
    const before = supportedPosition(actor)!;
    if (distance3D(before, last) > 0 || before.surfaceId !== support)
      setSpatialPosition(shadow, actor, last, support);
  });
  return tracks;
}
