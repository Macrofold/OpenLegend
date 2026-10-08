import {
  prepareOutingIndex,
  indexOuting,
  actorOutingIds,
  acceptedOutingId,
  affectedOutingIds,
} from './outing-index.js';
export { nextOutingDeadline } from './outing-index.js';
import type { SurfacePoint } from '@open-legend/spatial';
import type { Command, Outcome, WorldEvent, WorldState } from './types.js';
import { outcome, emit, canonicalJson } from './events.js';
import { person } from './narration.js';
import { nextId } from './data.js';
import { cloneValue, changedDraftEntityIds } from './draft.js';
import { isSafeRecordId, getOwn } from './records.js';
import { activelyParticipates } from './participation-state.js';
import { seesEntity } from './perception.js';
import { canReachEntity } from './spatial.js';
import { nativeOperationAvailable } from './kernel.js';
import { cancelPlan, discardSuspended, pauseRefusal, linkPlanResult } from './agency.js';
import { startRequestedActivity } from './activity-execution.js';
import { capabilityBlocked } from './status-capabilities.js';
import { BASE_OUTING } from './worlds/base/outing-policy.js';
import { activityCommandSupported } from './activity-hosts.js';
import { targetApproachPoint } from './action-capabilities.js';
import { countDomainWork } from './diagnostic-counters.js';

export type OutingMode = 'enqueue' | 'replace' | 'interrupt';
export interface OutingDestination {
  point: SurfacePoint;
  label: string;
  /** The fixed place's identity/placement is checked, never followed to a new position. */
  entityId?: string;
  placement?: string;
}
/** Only live consent is retained here. Each participant's existing plan owns all motion.
 * docs/projects/parallel-batch-04-expeditions-and-exchange-tech-design.md#exact-invitation-separate-agency */
export interface Outing {
  id: string;
  revision: number;
  proposerId: string;
  recipientId: string;
  destination: OutingDestination;
  purpose?: string;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'traveling';
  work: Record<string, number>;
  proposerMode: OutingMode;
  plans?: Record<string, string>;
  arrived: string[];
  /** Last perceived company, not the companion's position. */
  company: Record<string, boolean>;
}
export type OutingCommand =
  | {
      type: 'outing';
      operation: 'invite';
      recipientId: string;
      destinationId?: string;
      destination?: SurfacePoint;
      purpose?: string;
      mode: OutingMode;
    }
  | {
      type: 'outing';
      operation: 'accept' | 'decline' | 'leave';
      outingId: string;
      expectedRevision: number;
      mode?: OutingMode;
    };
type OwnedCommand = Extract<Command, { type: 'outing' }>;

const participants = (trip: Outing) => [trip.proposerId, trip.recipientId];
export function actorOutings(world: WorldState, actorId: string): Outing[] {
  return [...actorOutingIds(world, actorId)].flatMap((id) => world.outings?.[id] ?? []);
}
export function outingRecipientProblem(
  world: WorldState,
  actorId: string,
  otherId: string,
): Outcome | undefined {
  const actor = world.entities[actorId],
    other = world.entities[otherId];
  if (!actor || !other || actorId === otherId || !seesEntity(world, actor, other))
    return outcome(false, 'not-visible', BASE_OUTING.messages.person);
  if (!able(world, otherId) || !canReachEntity(world, actor, other, world.itemHandling.reach))
    return outcome(false, 'outing-unavailable', BASE_OUTING.messages.nearby);
}
/** A new offer cannot duplicate the same pair's unanswered or accepted agreement. */
export function outingInvitationProblem(
  world: WorldState,
  actorId: string,
  otherId: string,
): Outcome | undefined {
  const unavailable = outingRecipientProblem(world, actorId, otherId);
  if (unavailable) return unavailable;
  const current = actorOutings(world, actorId);
  if (current.some((trip) => participants(trip).includes(otherId)))
    return outcome(false, 'outing-pending', BASE_OUTING.messages.pending);
  if (
    acceptedOutingId(world, actorId) ||
    acceptedOutingId(world, otherId) ||
    current.filter((trip) => trip.proposerId === actorId).length >= BASE_OUTING.pendingPerProposer
  )
    return outcome(false, 'outing-limit', BASE_OUTING.messages.limit);
}
function able(world: WorldState, id: string): boolean {
  const entity = world.entities[id];
  return (
    !!entity?.actor?.alive &&
    BASE_OUTING.participant(entity) &&
    !entity.actor.incapacitated &&
    activelyParticipates(entity) &&
    entity.actor.participation?.phase !== 'exiting' &&
    !capabilityBlocked(world, entity, 'actions') &&
    !capabilityBlocked(world, entity, 'locomotion')
  );
}
export function outingDestination(
  world: WorldState,
  actorId: string,
  entityId: string,
): OutingDestination | undefined {
  const actor = world.entities[actorId],
    target = world.entities[entityId];
  // The first authored family names stationary physical places, not a moving person's body.
  if (!actor || !target || target.actor || target.retirement || !seesEntity(world, actor, target))
    return;
  const point = targetApproachPoint(world, actor, target, world.itemHandling.reach);
  if (!point) return;
  return {
    point: cloneValue(point),
    label: target.name,
    entityId,
    placement: canonicalJson(target.placement),
  };
}
function destinationCurrent(world: WorldState, trip: Outing): boolean {
  const destination = trip.destination;
  if (!destination.entityId) return true;
  const entity = world.entities[destination.entityId];
  return (
    !!entity && !entity.retirement && canonicalJson(entity.placement) === destination.placement
  );
}
function travelCommand(
  trip: Outing,
  actorId: string,
  mode: OutingMode,
): Extract<Command, { type: 'compose' }> {
  return {
    type: 'compose',
    // Authored actor identities can already occupy the full record-ID allowance.
    id: `${trip.id}:${actorId === trip.proposerId ? 'proposer' : 'recipient'}`,
    actorId,
    name: BASE_OUTING.travelName(trip.destination.label),
    mode,
    root: {
      kind: 'invoke',
      key: 'travel',
      name: BASE_OUTING.travelName(trip.destination.label),
      command: 'move',
      args: { destination: { role: 'destination' } },
    },
    bindings: { destination: cloneValue(trip.destination.point) },
  };
}
function workProblem(
  world: WorldState,
  trip: Outing,
  actorId: string,
  mode: OutingMode,
): Outcome | undefined {
  const actor = world.entities[actorId]?.actor;
  if (!actor || !able(world, actorId) || actor.planGeneration !== trip.work[actorId])
    return outcome(false, 'outing-changed', BASE_OUTING.messages.changed);
  const plan = actor.agency.plan;
  if (
    mode === 'enqueue' &&
    (actor.action ||
      plan?.status === 'active' ||
      plan?.status === 'blocked' ||
      actor.agency.suspended)
  )
    return outcome(false, 'outing-busy', BASE_OUTING.messages.busy);
  if (
    mode === 'interrupt' &&
    (actor.agency.suspended ||
      pauseRefusal(actor.action) ||
      (actor.action &&
        !plan?.steps.some(
          (step) => step.status === 'running' && step.actionId === actor.action!.id,
        )))
  )
    return outcome(false, 'outing-busy', BASE_OUTING.messages.busy);
  const available = nativeOperationAvailable(world, {
    id: 'outing-preview',
    actorId,
    type: 'move',
    destination: trip.destination.point,
  });
  if (!available.ok) return outcome(false, 'outing-route', BASE_OUTING.messages.route);
}
function heldProblem(world: WorldState, trip: Outing): Outcome | undefined {
  if (
    world.simTime >= trip.expiresAt ||
    !destinationCurrent(world, trip) ||
    participants(trip).some(
      (id) =>
        !able(world, id) ||
        world.entities[id]!.actor!.planGeneration !== trip.work[id] ||
        acceptedOutingId(world, id) !== undefined,
    )
  )
    return outcome(false, 'outing-changed', BASE_OUTING.messages.changed);
}
export function prepareOuting(
  world: WorldState,
  command: OwnedCommand,
): Outcome | { trip: Outing } {
  if (
    (command.operation === 'invite' || command.operation === 'accept') &&
    !activityCommandSupported(world, 'outing')
  )
    return outcome(false, 'unsupported-command', BASE_OUTING.messages.unavailable);
  if (command.operation === 'invite') {
    if (
      !['enqueue', 'replace', 'interrupt'].includes(command.mode) ||
      !isSafeRecordId(command.recipientId) ||
      (command.destination !== undefined &&
        (!command.destination ||
          ![command.destination.x, command.destination.y, command.destination.z].every(
            Number.isFinite,
          ) ||
          !isSafeRecordId(command.destination.surfaceId))) ||
      (command.destinationId !== undefined &&
        (!isSafeRecordId(command.destinationId) || command.destination !== undefined)) ||
      (command.purpose !== undefined &&
        (typeof command.purpose !== 'string' || command.purpose.length > 120))
    )
      return outcome(false, 'invalid-command', BASE_OUTING.messages.terms);
    const problem = outingInvitationProblem(world, command.actorId, command.recipientId);
    if (problem) return problem;
    const destination = command.destinationId
      ? outingDestination(world, command.actorId, command.destinationId)
      : command.destination
        ? {
            point: cloneValue(command.destination),
            label: BASE_OUTING.pointName(command.destination),
          }
        : undefined;
    if (!destination) return outcome(false, 'outing-destination', BASE_OUTING.messages.destination);
    const trip: Outing = {
      id: command.id,
      revision: 1,
      proposerId: command.actorId,
      recipientId: command.recipientId,
      destination,
      ...(command.purpose?.trim() ? { purpose: command.purpose.trim() } : {}),
      status: 'pending',
      createdAt: world.simTime,
      expiresAt: world.simTime + BASE_OUTING.offerSeconds,
      proposerMode: command.mode,
      work: Object.fromEntries(
        [command.actorId, command.recipientId].map((id) => [
          id,
          world.entities[id]!.actor!.planGeneration,
        ]),
      ),
      arrived: [],
      company: {},
    };
    const refused = workProblem(world, trip, command.actorId, command.mode);
    return refused ?? { trip };
  }
  const trip = getOwn(world.outings ?? {}, command.outingId);
  if (
    !trip ||
    !participants(trip).includes(command.actorId) ||
    trip.revision !== command.expectedRevision
  )
    return outcome(false, 'outing-unavailable', BASE_OUTING.messages.unavailable);
  if (command.operation === 'leave') return { trip };
  if (trip.status !== 'pending' || trip.recipientId !== command.actorId)
    return outcome(false, 'outing-unavailable', BASE_OUTING.messages.unavailable);
  if (command.operation === 'decline') return { trip };
  if (
    command.operation !== 'accept' ||
    !command.mode ||
    !['enqueue', 'replace', 'interrupt'].includes(command.mode)
  )
    return outcome(false, 'invalid-command', BASE_OUTING.messages.terms);
  const held = heldProblem(world, trip);
  if (held) return held;
  const nearby = outingRecipientProblem(world, command.actorId, trip.proposerId);
  if (nearby) return nearby;
  for (const id of participants(trip)) {
    const refused = workProblem(
      world,
      trip,
      id,
      id === command.actorId ? command.mode : trip.proposerMode,
    );
    if (refused) return refused;
  }
  return { trip };
}
function notice(
  world: WorldState,
  events: WorldEvent[],
  trip: Outing,
  actorId: string,
  text: string,
): void {
  const actor = world.entities[actorId];
  if (!actor?.actor) return;
  const event = emit(
    world,
    events,
    'outing',
    {
      parts: [
        person(actorId),
        ` ${text}${BASE_OUTING.companionPrefix}`,
        person(actorId === trip.proposerId ? trip.recipientId : trip.proposerId),
        '.',
      ],
    },
    actor,
    undefined,
    {
      outingId: trip.id,
      destinationX: trip.destination.point.x,
      destinationY: trip.destination.point.y,
      destinationZ: trip.destination.point.z,
      destinationSurface: trip.destination.point.surfaceId,
      semanticTrigger: true,
      importance: 6,
    },
    'private',
  );
  // Ordinary required personal evidence and event intake own reconsideration.
  const plan = actor.actor.agency.plan;
  if (plan && plan.id === trip.plans?.[actorId]) linkPlanResult(world, actorId, plan, event.id);
}
function closeOuting(world: WorldState, events: WorldEvent[], trip: Outing, reason: string): void {
  // Remove consent first. A cancellation cannot rediscover or resurrect its own trip.
  prepareOutingIndex(world);
  delete world.outings![trip.id];
  indexOuting(world, trip.id);
  for (const actorId of participants(trip)) {
    const actor = world.entities[actorId]?.actor;
    if (!actor) continue;
    const planId = trip.plans?.[actorId];
    if (planId && actor.agency.suspended?.id === planId) discardSuspended(world, actor, actorId);
    if (planId && actor.agency.plan?.id === planId) {
      cancelPlan(world, actor, actorId, false);
      if (actor.agency.plan.activity) actor.agency.plan.activity.reason = reason;
    }
    // No remote position, private work, health or unseen arrival is disclosed.
    notice(world, events, trip, actorId, BASE_OUTING.ended(trip.destination.label, reason));
  }
}
export function executeOuting(
  world: WorldState,
  command: OwnedCommand,
  events: WorldEvent[],
): Outcome {
  const prepared = prepareOuting(world, command);
  if ('ok' in prepared) return prepared;
  const trip = prepared.trip;
  if (command.operation === 'invite') {
    trip.id = nextId(world, 'outing');
    prepareOutingIndex(world);
    (world.outings ??= {})[trip.id] = trip;
    indexOuting(world, trip.id, trip);
    for (const id of participants(trip))
      notice(
        world,
        events,
        trip,
        id,
        BASE_OUTING.invited(trip.destination.label, trip.purpose, id === trip.proposerId),
      );
    return outcome(true, 'outing-invited', BASE_OUTING.messages.invited);
  }
  if (command.operation === 'decline' || command.operation === 'leave') {
    closeOuting(
      world,
      events,
      trip,
      command.operation === 'decline' ? BASE_OUTING.messages.declined : BASE_OUTING.messages.left,
    );
    return outcome(
      true,
      'outing-ended',
      command.operation === 'decline' ? BASE_OUTING.messages.declined : BASE_OUTING.messages.left,
    );
  }
  // The caller's draft is discarded on any refusal, so both plan admissions are atomic.
  const plans: Record<string, string> = {};
  for (const id of participants(trip)) {
    const selected = travelCommand(
      trip,
      id,
      id === command.actorId ? command.mode! : trip.proposerMode,
    );
    const admitted = startRequestedActivity(world, id, selected.id, selected);
    if (!admitted.ok) return admitted;
    plans[id] = selected.id;
  }
  prepareOutingIndex(world);
  trip.status = 'traveling';
  indexOuting(world, trip.id, trip);
  trip.revision++;
  trip.plans = plans;
  for (const id of participants(trip)) {
    trip.company[id] = true;
    notice(world, events, trip, id, BASE_OUTING.accepted(trip.destination.label));
  }
  return outcome(true, 'outing-accepted', BASE_OUTING.messages.accepted);
}
/** Command publication checks only changed participants/destinations when the draft owner
 * can prove coverage. Native time/perception boundaries and unknown builders check all live
 * pairs. No terminal history, remote tracking or model work is visited here. */
export function reconcileOutings(
  world: WorldState,
  events: WorldEvent[],
  options: {
    changedOnly?: boolean;
    companyObserved?: boolean;
  } = {},
): void {
  if (!world.outings) return;
  const entities = options.changedOnly ? changedDraftEntityIds(world) : undefined;
  const ids = entities ? affectedOutingIds(world, entities) : new Set(Object.keys(world.outings));
  for (const tripId of ids) {
    const trip = world.outings[tripId];
    if (!trip) continue;
    const close = (reason: string) => {
      closeOuting(world, events, trip, reason);
      if (trip.status !== 'traveling') return;
      // Cancelling the partner's owned walk can invalidate their other pending invitations,
      // including one checked earlier in this transition. Visit those dependents once more.
      for (const actorId of participants(trip))
        for (const id of actorOutingIds(world, actorId)) {
          ids.delete(id);
          ids.add(id);
        }
    };
    countDomainWork('outingChecked');
    if (trip.status === 'pending') {
      if (heldProblem(world, trip))
        close(
          world.simTime >= trip.expiresAt
            ? BASE_OUTING.messages.expired
            : BASE_OUTING.messages.changed,
        );
      continue;
    }
    const actors = participants(trip);
    if (!destinationCurrent(world, trip) || actors.some((id) => !able(world, id))) {
      close(BASE_OUTING.messages.unavailable);
      continue;
    }
    let ended = false;
    for (const id of actors) {
      const actor = world.entities[id]!,
        plan = actor.actor!.agency.plan;
      if (
        !plan ||
        plan.id !== trip.plans?.[id] ||
        plan.status === 'cancelled' ||
        plan.status === 'blocked' ||
        (actor.actor!.action &&
          !plan.steps.some(
            (step) => step.status === 'running' && step.actionId === actor.actor!.action!.id,
          ))
      ) {
        close(BASE_OUTING.messages.interrupted);
        ended = true;
        break;
      }
      if (!trip.arrived.includes(id) && plan?.status === 'completed') {
        trip.arrived.push(id);
        notice(world, events, trip, id, BASE_OUTING.arrived(trip.destination.label));
      }
      const otherId = id === trip.proposerId ? trip.recipientId : trip.proposerId;
      const observedCompany = options.companyObserved
        ? world.visiblePeople?.[id]?.includes(otherId)
        : undefined;
      const company = observedCompany ?? seesEntity(world, actor, world.entities[otherId]!);
      if (trip.company[id] !== company) {
        trip.company[id] = company;
        notice(
          world,
          events,
          trip,
          id,
          company ? BASE_OUTING.messages.company : BASE_OUTING.messages.separated,
        );
      }
    }
    if (!ended && trip.arrived.length === 2) close(BASE_OUTING.messages.finished);
  }
}
export function validateOutings(world: WorldState): void {
  if (world.outings === undefined) return;
  if (!world.outings || typeof world.outings !== 'object' || Array.isArray(world.outings))
    throw new Error('Invalid outing records.');
  const active = new Set<string>();
  for (const [id, trip] of Object.entries(world.outings)) {
    if (
      !trip ||
      id !== trip.id ||
      !isSafeRecordId(id) ||
      trip.revision !== (trip.status === 'pending' ? 1 : 2) ||
      !isSafeRecordId(trip.proposerId) ||
      !isSafeRecordId(trip.recipientId) ||
      trip.proposerId === trip.recipientId ||
      !['pending', 'traveling'].includes(trip.status) ||
      !['enqueue', 'replace', 'interrupt'].includes(trip.proposerMode) ||
      !Number.isFinite(trip.createdAt) ||
      !Number.isFinite(trip.expiresAt) ||
      trip.expiresAt <= trip.createdAt ||
      !trip.destination ||
      typeof trip.destination.label !== 'string' ||
      !trip.destination.label.trim() ||
      !trip.destination.point ||
      ![trip.destination.point.x, trip.destination.point.y, trip.destination.point.z].every(
        Number.isFinite,
      ) ||
      !isSafeRecordId(trip.destination.point.surfaceId) ||
      (trip.purpose !== undefined &&
        (typeof trip.purpose !== 'string' || trip.purpose.length > 120)) ||
      (trip.destination.entityId !== undefined &&
        (!isSafeRecordId(trip.destination.entityId) ||
          typeof trip.destination.placement !== 'string')) ||
      !trip.work ||
      !trip.company ||
      Object.entries(trip.company).some(
        ([id, visible]) => !participants(trip).includes(id) || typeof visible !== 'boolean',
      ) ||
      !Array.isArray(trip.arrived) ||
      new Set(trip.arrived).size !== trip.arrived.length ||
      trip.arrived.some((id) => !participants(trip).includes(id)) ||
      participants(trip).some(
        (id) => !world.entities[id]?.actor || !Number.isSafeInteger(trip.work[id]),
      )
    )
      throw new Error('Invalid outing consent.');
    if (trip.status === 'pending' && (trip.plans !== undefined || trip.arrived.length))
      throw new Error('Invalid pending outing.');
    if (trip.status === 'traveling')
      for (const actorId of participants(trip)) {
        if (
          active.has(actorId) ||
          !isSafeRecordId(trip.plans?.[actorId]) ||
          world.entities[actorId]!.actor!.agency.plan?.id !== trip.plans?.[actorId]
        )
          throw new Error('Invalid outing participation.');
        active.add(actorId);
      }
  }
}
