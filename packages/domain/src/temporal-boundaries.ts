import { nextItemOfferDeadline } from './handover.js';
import { nextActivityBoundary } from './activity-execution.js';
import { isDraft, original } from 'immer';
import { distance3D } from '@open-legend/spatial';
import { capabilityBlocked } from './status-capabilities.js';
import { worldPosition } from './spatial-state.js';
import { readAttribute } from './world-modules.js';
import { hasMemory } from './living.js';
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
import {
  crossStatusReferences,
  prepareStatusRates,
  type StatusRateInterval,
  type NativeDrain,
} from './status-effects.js';
import type { WorldState } from './types.js';

/** Finite-family composition, not an omniscient scheduler for arbitrary future rules.
 * docs/simulation-time.md and docs/maintainers/simulation-boundaries.md */
/** First clock value at which `time - start >= seconds`, the form an owner that compares
 * elapsed time uses. `start + seconds` can round an ulp short of it (PF13.16). */
function elapsedDeadline(start: number, seconds: number): number {
  let time = start + seconds;
  while (time - start < seconds)
    time += Math.max(Number.MIN_VALUE, Math.abs(time) * Number.EPSILON);
  return time;
}
export function nativeInterval(
  world: WorldState,
  requested: number,
  actorIds: readonly string[],
  ambientIds: readonly string[],
  statusIds: readonly string[],
  status: readonly StatusRateInterval[],
  travelFor: (id: string) => number,
): {
  seconds: number;
  requiresImmediateIntegration: boolean;
  serialClamps: boolean;
  drains: NativeDrain[];
  endsAt?: number;
} {
  let bound = Math.min(requested, BASE_TIME_POLICY.idleHorizonSeconds);
  // Owners compare the clock with stored absolute deadlines. Landing on that exact value,
  // not on a sum of slices, lets them fire at the boundary instead of 1e-6 s or more later.
  let deadline = Infinity;
  const at = (time: number) => {
    if (!(time > world.simTime)) return;
    deadline = Math.min(deadline, time);
    bound = Math.min(bound, time - world.simTime);
  };
  // Serial clamps depend on how an interval is divided; such values integrate every slice.
  // Conserved replenishment against a reservoir drain retains this one-second fallback.
  // Health rates below require immediate integration, but do not select this fallback.
  let serialClamps = false;
  const serialClampFallback = () => {
    bound = Math.min(bound, 1);
    serialClamps = true;
  };
  const rates = statusAttributeRates(status),
    drains: NativeDrain[] = [];
  const requiresImmediateIntegration = status.some((interval) =>
    interval.rates.some((rate) =>
      world.moduleManifest.definitions.some(
        (d) => d.id === rate.attribute && d.implementation === 'native-health-v1',
      ),
    ),
  );
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
    if (plan?.status === 'active' && plan.activity)
      at(nextActivityBoundary(world, id, plan.activity));
    const waiting = plan?.status === 'active' && !action && plan.activity?.pending.at(-1);
    // Bound only what its owner can progress: readyPlanStep ignores a wait while actions are
    // restricted or its goal is inactive, and reviews need memory (PF13.16).
    if (
      waiting &&
      waiting.node.kind === 'wait' &&
      waiting.startedAt !== undefined &&
      !capabilityBlocked(world, entity, 'actions') &&
      (!plan.goalId ||
        actor.agency.goals.some((g) => g.id === plan.goalId && g.status === 'active'))
    )
      at(elapsedDeadline(waiting.startedAt, waiting.node.seconds));
    if (hasMemory(entity)) at(nextConditionReview(entity));
    const reservoirs: NativeDrain[] = [];
    let coupledReservoir = false;
    for (const d of manifest.definitions) {
      const value = readAttribute(actor, d);
      if (typeof value !== 'number' || d.schema.kind !== 'number') continue;
      const statusRate = rates.get(id)?.get(d.id) ?? 0;
      // A status rate on a natively drained value integrates with the drain as one net flow
      // (PF13.12). All of an actor's reservoir drains move together; their owner drains them.
      if (d.reservoir) {
        reservoirs.push({
          targetId: id,
          attribute: d.id,
          rate: -d.reservoir.drainPerSecond,
          kind: 'reservoir',
        });
        coupledReservoir ||= !!statusRate;
        addRate(rates, id, d.id, -d.reservoir.drainPerSecond);
      }
      if (
        action?.type === 'replenish' &&
        action.stage === 'working' &&
        action.attributeId === d.id &&
        d.reservoir
      ) {
        if (d.reservoir.drainPerSecond > 0) serialClampFallback();
        addRate(rates, id, d.id, d.reservoir.replenishPerSecond);
        if (action.targetId)
          supplies.set(
            action.targetId,
            (supplies.get(action.targetId) ?? 0) + d.reservoir.replenishPerSecond,
          );
      }
      const rate = rates.get(id)?.get(d.id) ?? 0;
      for (const t of [
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
    if (coupledReservoir) drains.push(...reservoirs);
    if (!action || action.type === 'status-effect') continue;
    // A follow's chosen stopping time is an exact boundary, like a wait's timeout; its owner
    // compares the clock with this stored value, so the clock lands on it (PF13.16).
    if (action.type === 'follow' && action.follow?.until !== undefined) at(action.follow.until);
    // The kernel advances working actions only when locomotion is free, or pickups.
    if (
      action.stage === 'working' &&
      action.remainingSeconds > 0 &&
      (action.type === 'pickup' || !capabilityBlocked(world, entity, 'locomotion'))
    )
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
  at(nextCommitmentDeadline(world));
  at(nextResourceReservationDeadline(world));
  at(nextAppraisalDeadline(world));
  at(nextItemOfferDeadline(world));
  for (const process of Object.values(world.appraisalProcesses ?? {})) at(process.nextAt);
  if (world.conversations) {
    const timeout = world.socialPolicy?.conversationInactivitySeconds ?? 1800;
    // The owner's own sum, so the clock lands exactly where it compares.
    for (const id of new Set(Object.values(world.conversations.active))) {
      const c = world.conversations.records[id];
      if (c) at((c.lastActivityAt ?? c.startedAt) + timeout);
    }
  }
  bound = Math.min(
    bound,
    attributeBoundary(world, rates),
    statusBoundary(world, statusIds, rates, at),
  );
  const seconds = Math.min(requested, Math.max(TIME_EPSILON, bound));
  return {
    seconds,
    requiresImmediateIntegration,
    serialClamps,
    drains,
    ...(deadline - world.simTime <= seconds ? { endsAt: deadline } : {}),
  };
}

/** Re-predict only entities whose own occurrence changed them, such as a flyer's takeoff or
 * landing changing its grounded/activeWork predicates. Other entities' certified rates and
 * deadlines stay, so the caller keeps its shared interval and never lengthens it. Returns
 * undefined when the change reaches a coupled law or another entity; rebuild globally then.
 * docs/maintainers/simulation-boundaries.md#mechanical-time-and-motion */
export function refineNativeInterval(
  world: WorldState,
  changed: ReadonlySet<string>,
  participants: {
    actors: readonly string[];
    ambient: readonly string[];
    statuses: readonly string[];
  },
  previous: readonly StatusRateInterval[],
  travelFor: (id: string) => number,
): { seconds: number; status: StatusRateInterval[]; endsAt?: number } | undefined {
  const statusIds = participants.statuses.filter((id) => changed.has(id));
  const local = statusIds.flatMap((id) => prepareStatusRates(world, world.entities[id]!));
  if (crossStatusReferences(world, statusIds, local).size) return undefined;
  const interval = nativeInterval(
    world,
    BASE_TIME_POLICY.idleHorizonSeconds,
    participants.actors.filter((id) => changed.has(id)),
    participants.ambient.filter((id) => changed.has(id)),
    statusIds,
    local,
    travelFor,
  );
  if (interval.serialClamps || interval.drains.length || interval.requiresImmediateIntegration)
    return undefined;
  // Integration order follows the participant roster, exactly as a global rebuild orders it.
  const kept = new Map<string, StatusRateInterval[]>();
  for (const entry of [...previous, ...local]) {
    if (changed.has(entry.entityId) !== local.includes(entry)) continue;
    const list = kept.get(entry.entityId);
    if (list) list.push(entry);
    else kept.set(entry.entityId, [entry]);
  }
  return {
    seconds: interval.seconds,
    ...(interval.endsAt === undefined ? {} : { endsAt: interval.endsAt }),
    status: participants.statuses.flatMap((id) => kept.get(id) ?? []),
  };
}
