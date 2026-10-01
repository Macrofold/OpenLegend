import { isDraft, original } from 'immer';
import { distance3D } from '@open-legend/spatial';
import { capabilityBlocked } from './status-capabilities.js';
import { worldPosition } from './spatial-state.js';
import { readAttribute } from './world-modules.js';
import { hasWildernessNeeds, WILDERNESS_NEEDS } from './worlds/base/needs.js';
import { BASE_TIME_POLICY } from './worlds/base/time.js';
import { nativeMovementSpeed } from './worlds/base/actions.js';
import { nextCommitmentDeadline } from './commitments.js';
import { nextAppraisalDeadline } from './appraisal-index.js';
import { nextConditionReview } from './conditions.js';
import { nextResourceReservationDeadline } from './resource-claims.js';
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
  travelFor: (id: string) => number,
): { seconds: number; exhausted: Set<string>; starving: Set<string> } {
  let bound = Math.min(requested, BASE_TIME_POLICY.idleHorizonSeconds);
  const rates = statusAttributeRates(status),
    exhausted = new Set<string>(),
    starving = new Set<string>();
  const manifest = isDraft(world.moduleManifest)
    ? original(world.moduleManifest)!
    : world.moduleManifest;
  const supplies = new Map<string, number>();
  for (const id of actorIds) {
    const entity = world.entities[id],
      actor = entity?.actor;
    if (!entity || !actor?.alive || actor.incapacitated) continue;
    const action = actor.action;
    const plan = actor.agency.plan;
    const waiting = plan?.status === 'active' && !action && plan.activity?.pending.at(-1);
    if (waiting && waiting.node.kind === 'wait' && waiting.startedAt !== undefined)
      bound = Math.min(bound, waiting.startedAt + waiting.node.seconds - world.simTime);
    bound = Math.min(bound, nextConditionReview(entity) - world.simTime);
    for (const d of manifest.definitions) {
      const value = readAttribute(actor, d);
      if (typeof value !== 'number' || d.schema.kind !== 'number') continue;
      const statusRate = rates.get(id)?.get(d.id) ?? 0;
      // Serial native/status clamps aren't a general coupled-flow solver. Keep these
      // authored combinations conservative until a net-flow operation owns their semantics.
      if (statusRate && (d.reservoir || d.implementation === 'native-fullness-v1'))
        bound = Math.min(bound, 1);
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
        if (d.reservoir.drainPerSecond > 0) bound = Math.min(bound, 1);
        addRate(rates, id, d.id, d.reservoir.replenishPerSecond);
        if (action.targetId)
          supplies.set(
            action.targetId,
            (supplies.get(action.targetId) ?? 0) + d.reservoir.replenishPerSecond,
          );
      }
      const rate = rates.get(id)?.get(d.id) ?? 0;
      if (d.implementation === 'native-fullness-v1' && value === 0 && rate <= 0) starving.add(id);
      const thresholds =
        d.implementation === 'native-fullness-v1'
          ? BASE_TIME_POLICY.fullnessBoundaries
          : d.implementation === 'native-energy-v1'
            ? BASE_TIME_POLICY.energyBoundaries
            : [];
      for (const t of [
        ...thresholds,
        ...(d.condition?.bands.flatMap((b) => [
          b.below,
          Math.min(
            d.schema.kind === 'number' ? d.schema.max : Infinity,
            b.below + d.condition!.recoveryMargin,
          ),
        ]) ?? []),
      ])
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
        (starving.has(id) ? WILDERNESS_NEEDS.starvationDamagePerSecond : 0) +
        (exhausted.has(id) ? WILDERNESS_NEEDS.exhaustionDamagePerSecond : 0);
      if (damage) {
        bound = Math.min(bound, actor.health / damage);
        for (const d of manifest.definitions)
          if (d.implementation === 'native-health-v1') {
            // Regeneration is clamped before native damage. A net rate alone misses
            // saturation at full health; retain the coupled-law fallback here too.
            if ((rates.get(id)?.get(d.id) ?? 0) > 0) bound = Math.min(bound, 1);
            addRate(rates, id, d.id, (-damage * 100) / (actor.body?.maxHealth ?? 100));
          }
      }
    }
    if (!action || action.type === 'status-effect') continue;
    // A follow's chosen stopping time is an exact boundary, like a wait's timeout.
    if (action.type === 'follow' && action.follow?.until !== undefined)
      bound = Math.min(bound, Math.max(TIME_EPSILON, action.follow.until - world.simTime));
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
        travelFor(id) / speed,
        Math.max(TIME_EPSILON, distance3D(worldPosition(entity), action.path[0]!) / speed),
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
  }
  // Main's independently owned lifetimes participate in elapsed integration. Skipping an
  // internal-source deadline would lose an occurrence; an expired claim cannot block stock.
  // docs/maintainers/simulation-boundaries.md#world-systems-and-infrastructure
  bound = Math.min(
    bound,
    nextCommitmentDeadline(world) - world.simTime,
    nextResourceReservationDeadline(world) - world.simTime,
    nextAppraisalDeadline(world) - world.simTime,
  );
  for (const process of Object.values(world.appraisalProcesses ?? {}))
    bound = Math.min(bound, process.nextAt - world.simTime);
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
      if (r.rate === 0) continue; // A no-op must not erase a preceding nonzero direction.
      const key = `${r.targetId}\0${r.attribute}`,
        sign = Math.sign(r.rate),
        old = signs.get(key);
      if (old !== undefined && old !== sign) bound = Math.min(bound, 1);
      signs.set(key, sign);
    }
  return { seconds: Math.min(requested, Math.max(TIME_EPSILON, bound)), exhausted, starving };
}
