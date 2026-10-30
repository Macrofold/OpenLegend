import { nativeDangerExpiresAt } from './native-response-danger.js';
import { nextSensoryExpiry } from './experience.js';
import { nativeResponseProfile } from './native-response.js';
import { entityGet } from './entity-collection.js';
import { nextOutingDeadline } from './outings.js';
import { nextCompactDeadline } from './social-compact-index.js';
import { nextItemOfferDeadline } from './handover.js';
import { nextRemainsDeadline } from './remains.js';
import { activeActivityControl, nextActivityBoundary } from './activity-execution.js';
import { distance3D } from '@open-legend/spatial';
import { capabilityBlocked } from './status-capabilities.js';
import { worldPosition, worldSupport } from './spatial-state.js';
import { prepareAttributeForecast, readAttribute } from './world-modules.js';
import { hasMemory } from './living.js';
import { BASE_TIME_POLICY } from './worlds/base/time.js';
import { nativeMovementSpeed } from './worlds/base/actions.js';
import { nextCommitmentDeadline } from './commitments.js';
import { nextAppraisalDeadline, nextAppraisalProcessDeadline } from './appraisal-index.js';
import { nextConditionReview } from './conditions.js';
import { nextResourceReservationDeadline } from './resource-claims.js';
import {
  addRate,
  attributeBoundary,
  statusAttributeRates,
  statusBoundary,
  TIME_EPSILON,
  untilThreshold,
  elapsedDeadline,
  type AttributeRates,
} from './simulation-time.js';
import {
  crossStatusReferences,
  prepareStatusRates,
  type StatusRateInterval,
  type NativeDrain,
} from './status-effects.js';
import type { WorldState } from './types.js';

export type NativeDeadlineReason =
  | 'lifetime'
  | 'animal-pattern'
  | 'threat'
  | 'foraging-review'
  | 'foraging-work'
  | 'response-review'
  | 'danger-expiry'
  | 'response-settling'
  | 'wander'
  | 'serial-clamp'
  | 'guard'
  | 'evasion'
  | 'encounter'
  | 'activity'
  | 'condition'
  | 'attribute'
  | 'follow'
  | 'work'
  | 'move-arrival'
  | 'approach-sample'
  | 'supply'
  | 'fuel'
  | 'status';
type NativeDeadlineCause = {
  at: number;
  entityId?: string;
  kind: 'participant' | 'shared';
  reason: NativeDeadlineReason;
};

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
  statusDeadline?: (id: string, rates: AttributeRates) => number,
  remainsIds: readonly string[] = ambientIds,
): {
  seconds: number;
  requiresImmediateIntegration: boolean;
  serialClamps: boolean;
  drains: NativeDrain[];
  privateWalkers: ReadonlySet<string>;
  endsAt?: number;
  endingCauses: NativeDeadlineCause[];
} {
  let ownerId: string | undefined;
  let causes: NativeDeadlineCause[] = [];
  const recordCause = (time: number, reason: NativeDeadlineReason, id = ownerId) => {
    if (!Number.isFinite(time)) return;
    const first = causes[0]?.at ?? Infinity;
    if (time < first - TIME_EPSILON) causes = [];
    if (time <= first + TIME_EPSILON)
      causes.push({
        at: time,
        ...(id ? { entityId: id } : {}),
        kind: id ? 'participant' : 'shared',
        reason,
      });
  };
  const limit = (seconds: number, reason: NativeDeadlineReason = 'attribute') => {
    recordCause(world.simTime + seconds, reason);
    bound = Math.min(bound, seconds);
  };
  let bound = Math.min(requested, BASE_TIME_POLICY.idleHorizonSeconds);
  // Owners compare the clock with stored absolute deadlines. Landing on that exact value,
  // not on a sum of slices, lets them fire at the boundary instead of 1e-6 s or more later.
  let deadline = Infinity;
  const at = (time: number, reason: NativeDeadlineReason = 'lifetime') => {
    if (!(time > world.simTime)) return;
    recordCause(time, reason);
    deadline = Math.min(deadline, time);
    bound = Math.min(bound, time - world.simTime);
  };
  at(nextRemainsDeadline(world, remainsIds));
  at(nextSensoryExpiry(world));
  for (const deadline of Object.values(world.exitExposures ?? {})) at(deadline);
  for (const id of ambientIds) {
    ownerId = id;
    const entity = entityGet(world.entities, id),
      animal = entity?.animal;
    if (animal)
      for (const pattern of Object.values(animal.acousticPatterns))
        at(pattern.idleExpiresAt, 'animal-pattern');
    const threat = entity?.threat;
    if (threat && !(threat.relinquished && threat.mode === 'idle')) {
      // Ordinary reviews are private wake-ups. The owner certifies deadline-only
      // idle renewals; every real pursuit/action change still rebuilds preparation.
      if (['pursuit', 'search'].includes(threat.mode) && threat.episodeUntil !== undefined)
        at(threat.episodeUntil, 'threat');
      if (threat.mode === 'search' && threat.searchUntil !== undefined)
        at(threat.searchUntil, 'threat');
    }
    if (animal?.foraging && !animal.episode) {
      at(animal.foraging.reviewAt, 'foraging-review');
      if (animal.foraging.work) at(animal.foraging.work.endsAt, 'foraging-work');
    }
    if (animal?.episode) {
      // Review is bounded by the native private slice. Its owner may retain the
      // same movement; only actual effects end the shared mechanical forecast.
      const definition = nativeResponseProfile(world, animal.episode.profilePin);
      if (definition)
        for (const danger of Object.values(animal.episode.dangers)) {
          at(nativeDangerExpiresAt(definition, danger), 'danger-expiry');
          if (definition.uncertaintyPerSecond > 0 && (danger.kind !== 'body' || !danger.visible))
            at(
              (danger.kind === 'body' ? danger.lostAt! : danger.observedAt) +
                definition.maximumUncertainty / definition.uncertaintyPerSecond,
              'danger-expiry',
            );
        }
      if (animal.episode.clearSince !== undefined) {
        const profile = nativeResponseProfile(world, animal.episode.profilePin);
        if (profile) at(animal.episode.clearSince + profile.settlingSeconds, 'response-settling');
      }
    }
    if (animal?.wander && 'dueAt' in animal.wander) at(animal.wander.dueAt, 'wander');
  }
  ownerId = undefined;
  // Serial clamps depend on how an interval is divided; such values integrate every slice.
  // Conserved replenishment against a reservoir drain retains this one-second fallback.
  // Health rates below require immediate integration, but do not select this fallback.
  let serialClamps = false;
  const serialClampFallback = () => {
    limit(1, 'serial-clamp');
    serialClamps = true;
  };
  const rates = statusAttributeRates(status),
    drains: NativeDrain[] = [];
  const attributes = prepareAttributeForecast(world);
  const requiresImmediateIntegration = status.some(
    (interval) =>
      interval.periodic.length > 0 ||
      interval.rates.some((rate) => attributes.healthIds.has(rate.attribute)),
  );
  const supplies = new Map<string, number>();
  const references = crossStatusReferences(world, statusIds, status);
  const privateWalkers = new Set<string>();
  for (const id of actorIds) {
    ownerId = id;
    const entity = entityGet(world.entities, id),
      actor = entity?.actor;
    if (!entity || !actor?.alive || actor.incapacitated) continue;
    const action = actor.action;
    if (action?.guard) {
      const g = action.guard;
      at(
        g.phase === 'preparing' ? g.readyAt : g.phase === 'ready' ? g.expiresAt : g.recoveryUntil!,
        'guard',
      );
    }
    if (action?.evasion) at(action.evasion.endsAt, 'evasion');
    const plan = actor.agency.plan;
    if (actor.encounters?.nextAt !== undefined) at(actor.encounters.nextAt, 'encounter');
    if (plan?.status === 'active' && plan.activity)
      at(nextActivityBoundary(world, id, plan.activity), 'activity');
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
      at(elapsedDeadline(waiting.startedAt, waiting.node.seconds), 'activity');
    if (hasMemory(entity)) at(nextConditionReview(entity), 'condition');
    const reservoirs: NativeDrain[] = [];
    let coupledReservoir = false;
    for (const { definition: d, thresholds } of attributes.native) {
      const value = readAttribute(world, entity, d);
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
      for (const t of thresholds)
        if (
          !(
            value === t &&
            ((value === d.schema.min && rate < 0) || (value === d.schema.max && rate > 0))
          )
        )
          limit(untilThreshold(value, rate, t));
    }
    if (coupledReservoir) drains.push(...reservoirs);
    if (!action || action.type === 'status-effect') continue;
    // A follow's chosen stopping time is an exact boundary, like a wait's timeout; its owner
    // compares the clock with this stored value, so the clock lands on it (PF13.16).
    if (action.type === 'follow' && action.follow?.until !== undefined)
      at(action.follow.until, 'follow');
    // The kernel advances working actions only when locomotion is free, or pickups.
    if (
      action.stage === 'working' &&
      action.remainingSeconds > 0 &&
      (action.type === 'pickup' || !capabilityBlocked(world, entity, 'locomotion'))
    )
      limit(action.remainingSeconds, 'work');
    if (
      action.stage === 'approaching' &&
      action.path.length &&
      !capabilityBlocked(world, entity, 'locomotion')
    ) {
      const speed = nativeMovementSpeed(world, entity);
      if (
        action.type === 'move' &&
        !action.navigation &&
        !action.evasion &&
        !activeActivityControl(plan) &&
        !entity.threat &&
        !references.has(id)
      ) {
        // Intermediate same-support movement changes pose, not captured bodily rules.
        // Arrival and a support seam remain shared boundaries; private slices still
        // retain the original displacement/waypoint sampling.
        privateWalkers.add(id);
        let from = worldPosition(entity),
          support = worldSupport(entity),
          length = 0;
        for (const point of action.path) {
          length += distance3D(from, point);
          from = point;
          if (point.surfaceId !== support) break;
          support = point.surfaceId;
        }
        limit(Math.max(TIME_EPSILON, length / speed), 'move-arrival');
      } else
        limit(
          Math.min(
            travelFor(id) / speed,
            Math.max(TIME_EPSILON, distance3D(worldPosition(entity), action.path[0]!) / speed),
          ),
          'approach-sample',
        );
    }
  }
  ownerId = undefined;
  for (const [id, demand] of supplies) {
    const remaining = entityGet(world.entities, id)?.replenisher?.remaining;
    if (remaining !== undefined && remaining > 0) limit(remaining / demand, 'supply');
  }
  for (const id of ambientIds) {
    const entity = entityGet(world.entities, id);
    if (!entity) continue;
    if (entity.heat?.lit && entity.heat.fuelSeconds > 0) limit(entity.heat.fuelSeconds, 'fuel');
  }
  // Main's independently owned lifetimes participate in elapsed integration. Skipping an
  // internal-source deadline would lose an occurrence; an expired claim cannot block stock.
  // docs/maintainers/simulation-boundaries.md#world-systems-and-infrastructure
  at(nextCommitmentDeadline(world));
  at(nextResourceReservationDeadline(world));
  at(nextAppraisalDeadline(world));
  at(nextItemOfferDeadline(world));
  at(nextOutingDeadline(world));
  at(nextCompactDeadline(world));
  at(nextAppraisalProcessDeadline(world));
  limit(attributeBoundary(world, rates, attributes.numeric));
  if (statusDeadline) {
    for (const id of statusIds) {
      ownerId = id;
      at(statusDeadline(id, rates), 'status');
    }
    ownerId = undefined;
  } else
    limit(
      statusBoundary(world, statusIds, rates, attributes.byId, (time) => at(time, 'status')),
      'status',
    );
  const seconds = Math.min(requested, Math.max(TIME_EPSILON, bound));
  return {
    seconds,
    requiresImmediateIntegration,
    serialClamps,
    drains,
    privateWalkers,
    endingCauses: causes.filter(
      (cause) => Math.abs(cause.at - world.simTime - seconds) <= TIME_EPSILON,
    ),
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
  prepareParticipant: (id: string) => StatusRateInterval[] = (id) =>
    prepareStatusRates(world, entityGet(world.entities, id)!),
):
  | {
      seconds: number;
      status: StatusRateInterval[];
      privateWalkers: ReadonlySet<string>;
      endsAt?: number;
    }
  | undefined {
  const statusIds = participants.statuses.filter((id) => changed.has(id));
  const local = statusIds.flatMap(prepareParticipant);
  if (
    crossStatusReferences(world, statusIds, local).size ||
    crossStatusReferences(
      world,
      statusIds,
      previous.filter((entry) => changed.has(entry.entityId)),
    ).size
  )
    return undefined;
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
  // A refreshed interval may reuse the exact previous object. Select by the owning
  // participant, not object membership, so each active episode is integrated once.
  for (const entry of [...previous.filter((entry) => !changed.has(entry.entityId)), ...local]) {
    const list = kept.get(entry.entityId);
    if (list) list.push(entry);
    else kept.set(entry.entityId, [entry]);
  }
  return {
    seconds: interval.seconds,
    ...(interval.endsAt === undefined ? {} : { endsAt: interval.endsAt }),
    status: participants.statuses.flatMap((id) => kept.get(id) ?? []),
    privateWalkers: interval.privateWalkers,
  };
}
