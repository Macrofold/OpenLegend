import { isDraft, original } from 'immer';
import { supportBelow, distance3D } from '@open-legend/spatial';
import { capabilityBlocked } from './status-capabilities.js';
import { hasMemory } from './living.js';
import { sensesFor } from './perception.js';
import { spatialMap } from './spatial-state.js';
import { readAttribute } from './world-modules.js';
import { hasWildernessNeeds, WILDERNESS_NEEDS } from './worlds/base/needs.js';
import { BASE_TIME_POLICY } from './worlds/base/time.js';
import { nativeMovementSpeed } from './worlds/base/actions.js';
import { flightSpeed, fallingDuration } from './flight.js';
import { nextCommitmentDeadline } from './commitments.js';
import {
  addRate,
  attributeBoundary,
  statusAttributeRates,
  statusBoundary,
  TIME_EPSILON,
  untilThreshold,
} from './simulation-time.js';
import type { StatusRateInterval } from './status-effects.js';
import type { WorldState } from './types.js';

/** Finite-family composition, not an omniscient scheduler for arbitrary future rules.
 * docs/simulation-time.md and docs/maintainers/simulation-boundaries.md */
export function nativeInterval(
  world: WorldState,
  requested: number,
  actorIds: readonly string[],
  ambientIds: readonly string[],
  statusIds: readonly string[],
  status: readonly StatusRateInterval[],
): { seconds: number; exhausted: Set<string> } {
  let bound = Math.min(requested, BASE_TIME_POLICY.idleHorizonSeconds);
  const rates = statusAttributeRates(status),
    exhausted = new Set<string>();
  const manifest = isDraft(world.moduleManifest)
    ? original(world.moduleManifest)!
    : world.moduleManifest;
  let travel: number = BASE_TIME_POLICY.perceptionTravelMetres;
  for (const id of actorIds) {
    const entity = world.entities[id];
    if (!entity || !hasMemory(entity) || !entity.actor?.alive || entity.actor.incapacitated)
      continue;
    for (const sense of sensesFor(world, entity))
      if (sense.implementation !== 'hearing-transmission-v1' && sense.radius > 0)
        travel = Math.min(travel, sense.radius / 4);
  }
  const supplies = new Map<string, number>();
  for (const id of actorIds) {
    const entity = world.entities[id],
      actor = entity?.actor;
    if (!entity || !actor?.alive || actor.incapacitated) continue;
    const action = actor.action;
    for (const d of manifest.definitions) {
      const value = readAttribute(actor, d);
      if (typeof value !== 'number' || d.schema.kind !== 'number') continue;
      if (d.implementation === 'native-fullness-v1' && hasWildernessNeeds(actor))
        addRate(rates, id, d.id, -WILDERNESS_NEEDS.fullnessPerSecond);
      if (d.reservoir) addRate(rates, id, d.id, -d.reservoir.drainPerSecond);
      if (
        d.implementation === 'native-energy-v1' &&
        value === 0 &&
        (rates.get(id)?.get(d.id) ?? 0) <= 0
      )
        exhausted.add(id);
      if (
        action?.type === 'replenish' &&
        action.stage === 'working' &&
        action.attributeId === d.id &&
        d.reservoir
      ) {
        addRate(rates, id, d.id, d.reservoir.replenishPerSecond);
        if (action.targetId)
          supplies.set(
            action.targetId,
            (supplies.get(action.targetId) ?? 0) + d.reservoir.replenishPerSecond,
          );
      }
      const rate = rates.get(id)?.get(d.id) ?? 0;
      const thresholds =
        d.implementation === 'native-fullness-v1'
          ? BASE_TIME_POLICY.fullnessBoundaries
          : d.implementation === 'native-energy-v1'
            ? BASE_TIME_POLICY.energyBoundaries
            : [];
      for (const t of thresholds)
        if (
          !(
            value === t &&
            ((value === d.schema.min && rate < 0) || (value === d.schema.max && rate > 0))
          )
        )
          bound = Math.min(bound, untilThreshold(value, rate, t));
    }
    if (hasWildernessNeeds(actor)) {
      const damage =
        (actor.fullness === 0 ? WILDERNESS_NEEDS.starvationDamagePerSecond : 0) +
        (exhausted.has(id) ? WILDERNESS_NEEDS.exhaustionDamagePerSecond : 0);
      if (damage) {
        bound = Math.min(bound, actor.health / damage);
        for (const d of manifest.definitions)
          if (d.implementation === 'native-health-v1') addRate(rates, id, d.id, -damage);
      }
    }
    if (!action || action.type === 'status-effect') continue;
    if (action.stage === 'working' && action.remainingSeconds > 0)
      bound = Math.min(bound, action.remainingSeconds);
    if (
      action.stage === 'approaching' &&
      action.path.length &&
      !capabilityBlocked(world, entity, 'locomotion')
    ) {
      const speed = nativeMovementSpeed(entity);
      bound = Math.min(
        bound,
        travel / speed,
        Math.max(TIME_EPSILON, distance3D(entity.position, action.path[0]!) / speed),
      );
    }
  }
  for (const [id, demand] of supplies) {
    const remaining = world.entities[id]?.replenisher?.remaining;
    if (remaining !== undefined && remaining > 0) bound = Math.min(bound, remaining / demand);
  }
  for (const id of ambientIds) {
    const entity = world.entities[id];
    if (!entity) continue;
    if (entity.heat?.lit && entity.heat.fuelSeconds > 0)
      bound = Math.min(bound, entity.heat.fuelSeconds);
    if (capabilityBlocked(world, entity, 'locomotion')) continue;
    if (entity.spatial.fallVelocity !== undefined) {
      const support = supportBelow(spatialMap(world), entity.position);
      bound = Math.min(
        bound,
        fallingDuration(
          entity.spatial.fallVelocity,
          Math.min(travel, support ? Math.max(0, entity.position.y - support.y) : travel),
        ),
      );
      continue;
    }
    const flight = entity.spatial.flight;
    if (flight && entity.actor?.alive && !entity.actor.incapacitated && !entity.actor.action) {
      if (flight.waitSeconds > 0) bound = Math.min(bound, flight.waitSeconds);
      else {
        const route = world.flightRoutes[flight.routeId]!;
        const target = route.points[flight.next]!.position;
        const speed = flightSpeed(entity.position, target, route);
        bound = Math.min(
          bound,
          travel / speed,
          distance3D(entity.position, target) > TIME_EPSILON
            ? distance3D(entity.position, target) / speed
            : Infinity,
        );
      }
    } else if (
      entity.animal &&
      entity.actor?.alive &&
      !entity.actor.incapacitated &&
      !entity.actor.action
    ) {
      const animal = entity.animal;
      if (animal.fleeSeconds > 0 && animal.fleeFrom)
        bound = Math.min(bound, animal.fleeSeconds, travel / nativeMovementSpeed(entity, true));
      else if (travel < 0.4 && animal.wanderSeconds > 0)
        bound = Math.min(bound, animal.wanderSeconds);
      // Bounded 0.4 m non-emitting wander impulses retain their own timer remainder;
      // they don't require a whole-world interval at each animal's random deadline.
    }
  }
  bound = Math.min(bound, nextCommitmentDeadline(world) - world.simTime);
  if (world.conversations) {
    const timeout = world.socialPolicy?.conversationInactivitySeconds ?? 1800;
    for (const id of new Set(Object.values(world.conversations.active))) {
      const c = world.conversations.records[id];
      if (c) {
        const remaining = (c.lastActivityAt ?? c.startedAt) + timeout - world.simTime;
        if (remaining > TIME_EPSILON) bound = Math.min(bound, remaining);
      }
    }
  }
  bound = Math.min(bound, attributeBoundary(world, rates), statusBoundary(world, statusIds, rates));
  // Opposing separately clamped operations need a richer integrator at saturation.
  // This explicit fallback is not a promise of analytical integration for coupled laws.
  const signs = new Map<string, number>();
  for (const interval of status)
    for (const r of interval.rates) {
      const key = `${r.targetId}\0${r.attribute}`,
        sign = Math.sign(r.rate),
        old = signs.get(key);
      if (old !== undefined && old !== sign && old !== 0 && sign !== 0) bound = Math.min(bound, 1);
      signs.set(key, sign);
    }
  return { seconds: Math.min(requested, Math.max(TIME_EPSILON, bound)), exhausted };
}
