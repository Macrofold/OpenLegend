import { distance3D, supportBelow } from '@open-legend/spatial';
import { fallingDuration, flightSpeed, TERMINAL_FALL_SPEED } from './flight.js';
import { hasMemory } from './living.js';
import { sensesFor } from './perception.js';
import { spatialCandidates } from './spatial.js';
import { bodyProfile, spatialMap, worldPosition } from './spatial-state.js';
import { capabilityBlocked } from './status-capabilities.js';
import { TIME_EPSILON } from './simulation-time.js';
import { BASE_ACTION_DEFAULTS, nativeMovementSpeed } from './worlds/base/actions.js';
import { BASE_TIME_POLICY } from './worlds/base/time.js';
import type { Entity, WorldState } from './types.js';

/** Conservative reach over one shared interval. Native decisions/actions are reconsidered
 * before a new interval; unsupported future movers must add their own bound here.
 */
function motionReach(world: WorldState, entity: Entity, seconds: number): number {
  if (capabilityBlocked(world, entity, 'locomotion')) return 0;
  if (entity.spatial.fallVelocity !== undefined) return TERMINAL_FALL_SPEED * seconds;
  if (!entity.actor?.alive || entity.actor.incapacitated) return 0;
  if (entity.actor.action)
    return entity.actor.action.stage === 'approaching'
      ? BASE_ACTION_DEFAULTS.movementTilesPerSecond * seconds
      : 0;
  if (entity.spatial.flight)
    return world.flightRoutes[entity.spatial.flight.routeId]!.speed * seconds;
  return entity.animal
    ? entity.animal.fleeSeconds > 0 && entity.animal.fleeFrom
      ? BASE_ACTION_DEFAULTS.animalFleeTilesPerSecond * seconds + 0.4
      : 0.4
    : 0;
}
/** A distant tiny sense must not split every flyer's travel. Reachable envelopes include
 * both moving participants and their extents; false positives only shorten a slice.
 * docs/worlds/base/time.md#spatial-fidelity */
export function motionTravelBounds(
  world: WorldState,
  seconds: number,
  actorIds: readonly string[],
  moverIds: readonly string[],
) {
  const observers = actorIds.flatMap((id) => {
    const entity = world.entities[id];
    if (!entity?.actor?.alive || entity.actor.incapacitated || !hasMemory(entity)) return [];
    const senses = sensesFor(world, entity).filter(
      (s): s is Extract<typeof s, { radius: number }> =>
        'radius' in s && s.radius > 0 && s.radius / 4 < BASE_TIME_POLICY.perceptionTravelMetres,
    );
    if (!senses.length) return [];
    const radius = Math.max(...senses.map((s) => s.radius));
    return [
      {
        position: { ...worldPosition(entity) },
        radius,
        reach: motionReach(world, entity, seconds) + bodyProfile(entity).height,
        travel: Math.min(
          BASE_TIME_POLICY.perceptionTravelMetres,
          ...senses.map((s) => s.radius / 4),
        ),
      },
    ];
  });
  if (!observers.length) return () => BASE_TIME_POLICY.perceptionTravelMetres;
  const near = spatialCandidates(observers);
  const maximum = observers.reduce(
    (max, observer) => Math.max(max, observer.radius + observer.reach),
    0,
  );
  const bounds = new Map<string, number>();
  for (const id of moverIds) {
    const entity = world.entities[id]!;
    const position = worldPosition(entity);
    const reach = motionReach(world, entity, seconds) + bodyProfile(entity).height;
    let travel: number = BASE_TIME_POLICY.perceptionTravelMetres;
    for (const observer of near(position, reach + maximum))
      if (distance3D(position, observer.position) <= reach + observer.reach + observer.radius)
        travel = Math.min(travel, observer.travel);
    bounds.set(id, travel);
  }
  return travelLookup(bounds, Math.min(...observers.map((observer) => observer.travel)));
}

/** The continuation holds only scalar bounds, never the draft used to derive them. */
function travelLookup(bounds: ReadonlyMap<string, number>, fallback: number) {
  return (id: string) => bounds.get(id) ?? fallback;
}

/** Private motion/sensing boundary; it does not require restarting unrelated native work. */
export function nativeMotionInterval(
  world: WorldState,
  requested: number,
  ambientIds: readonly string[],
  travelFor: (id: string) => number,
): number {
  let bound = requested;
  for (const id of ambientIds) {
    const entity = world.entities[id];
    if (!entity || capabilityBlocked(world, entity, 'locomotion')) continue;
    if (entity.spatial.fallVelocity !== undefined) {
      const travel = travelFor(id);
      const support = supportBelow(spatialMap(world), worldPosition(entity));
      bound = Math.min(
        bound,
        fallingDuration(
          entity.spatial.fallVelocity,
          Math.min(travel, support ? Math.max(0, worldPosition(entity).y - support.y) : travel),
        ),
      );
      continue;
    }
    if (!entity.actor?.alive || entity.actor.incapacitated || entity.actor.action) continue;
    const flight = entity.spatial.flight;
    if (flight) {
      if (flight.waitSeconds > 0) bound = Math.min(bound, flight.waitSeconds);
      else {
        const route = world.flightRoutes[flight.routeId]!;
        const target = route.points[flight.next]!.position;
        const speed = flightSpeed(worldPosition(entity), target, route);
        const distance = distance3D(worldPosition(entity), target);
        bound = Math.min(
          bound,
          travelFor(id) / speed,
          distance > TIME_EPSILON ? distance / speed : Infinity,
        );
      }
    } else if (entity.animal) {
      const travel = travelFor(id);
      const animal = entity.animal;
      if (animal.fleeSeconds > 0 && animal.fleeFrom)
        bound = Math.min(bound, animal.fleeSeconds, travel / nativeMovementSpeed(entity, true));
      else if (travel < 0.4 && animal.wanderSeconds > 0)
        bound = Math.min(bound, animal.wanderSeconds);
    }
  }
  return Math.min(requested, Math.max(TIME_EPSILON, bound));
}
