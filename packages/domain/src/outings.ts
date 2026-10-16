import {
  prepareOutingIndex,
  indexOuting,
  actorOutingIds,
  acceptedOutingId,
  affectedOutingIds,
} from './outing-index.js';
export { nextOutingDeadline } from './outing-index.js';
import type { SurfacePoint, WorldPoint } from '@open-legend/spatial';
import type { Command, Outcome, WorldEvent, WorldState } from './types.js';
import { outcome, emit, canonicalJson } from './events.js';
import { person } from './narration.js';
import { nextId } from './data.js';
import { cloneValue, changedDraftEntityIds } from './draft.js';
import { isSafeRecordId, getOwn, hasRecordFields } from './records.js';
import { activelyParticipates } from './participation-state.js';
import { seesEntity } from './perception.js';
import { canReachEntity } from './spatial.js';
import { nativeOperationAvailable } from './kernel.js';
import {
  cancelPlan,
  discardSuspended,
  pauseRefusal,
  linkPlanResult,
  changeGoal,
} from './agency.js';
import { startRequestedActivity } from './activity-execution.js';
import { capabilityBlocked } from './status-capabilities.js';
import { BASE_OUTING, BASE_COMBAT_HELP } from './worlds/base/outing-policy.js';
import { activityCommandSupported } from './activity-hosts.js';
import { targetApproachPoint } from './action-capabilities.js';
import { attackPermissionProblem } from './combat-consent.js';
import { observerDescription } from './worlds/base/knowledge.js';
import { worldPosition } from './spatial-state.js';
import { endActivity } from './action-experience.js';
import { releaseInvocationResources } from './resource-claims.js';
import { countDomainWork } from './diagnostic-counters.js';

export type OutingMode = 'enqueue' | 'replace' | 'interrupt';
export type OutingEndCause =
  | 'declined'
  | 'left'
  | 'expired'
  | 'changed'
  | 'unavailable'
  | 'interrupted'
  | 'finished';
export interface OutingDestination<Point extends WorldPoint = SurfacePoint> {
  point: Point;
  label: string;
  /** The fixed place's identity/placement is checked, never followed to a new position. */
  entityId?: string;
  placement?: string;
}
/** Only live consent is retained here. Each participant's existing plan owns all motion.
 * docs/projects/completed/parallel-batch-04-expeditions-and-exchange-tech-design.md#exact-invitation-separate-agency */
interface CombatHelp {
  opponentId: string;
  opponentLife: number;
  lives: Record<string, number>;
  labels: Record<string, string>;
  humanProposed: boolean;
  goalId?: string;
}
interface OutingTerms {
  id: string;
  revision: number;
  proposerId: string;
  recipientId: string;
  purpose?: string;
  createdAt: number;
  expiresAt: number;
  work: Record<string, number>;
  proposerMode: OutingMode;
  plans?: Record<string, string>;
  arrived: string[];
  /** Last perceived company, not the companion's position. */
  company: Record<string, boolean>;
}
export type Outing = OutingTerms &
  (
    | {
        kind: 'travel';
        combat?: never;
        destination: OutingDestination;
        status: 'pending' | 'traveling';
      }
    | {
        kind: 'combat-help';
        combat: CombatHelp;
        destination: OutingDestination<WorldPoint>;
        status: 'pending' | 'helping';
      }
  );
export type OutingCommand =
  | { type: 'outing'; operation: 'help'; recipientId: string; opponentId: string }
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
/** Ending consent requires the exact current outing terms, not physical ability. */
export function endsOutingConsent(command: Command): boolean {
  return (
    command.type === 'outing' && (command.operation === 'leave' || command.operation === 'decline')
  );
}

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
  kind: Outing['kind'] = 'travel',
): Outcome | undefined {
  const unavailable = outingRecipientProblem(world, actorId, otherId);
  if (unavailable) return unavailable;
  const current = actorOutings(world, actorId).filter((trip) => trip.kind === kind);
  if (current.some((trip) => participants(trip).includes(otherId)))
    return outcome(false, 'outing-pending', BASE_OUTING.messages.pending);
  if (
    acceptedOutingId(world, actorId, kind) ||
    acceptedOutingId(world, otherId, kind) ||
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
  if (trip.kind === 'combat-help') return combatCurrent(world, trip);
  const destination = trip.destination;
  if (!destination.entityId) return true;
  const entity = world.entities[destination.entityId];
  return (
    !!entity && !entity.retirement && canonicalJson(entity.placement) === destination.placement
  );
}
function travelCommand(
  trip: Extract<Outing, { kind: 'travel' }>,
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
  trip: Extract<Outing, { kind: 'travel' }>,
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
        // Help adds a purpose without replacing work; fighting while awaiting a
        // reply must not revoke it. Travel acceptance still replaces exact work.
        // docs/worlds/base/social.md#voluntary-combat-help
        (trip.kind === 'travel' && world.entities[id]!.actor!.planGeneration !== trip.work[id]) ||
        acceptedOutingId(world, id, trip.kind) !== undefined,
    )
  )
    return outcome(false, 'outing-changed', BASE_OUTING.messages.changed);
}
export function prepareOuting(
  world: WorldState,
  command: OwnedCommand,
): Outcome | { trip: Outing } {
  if (
    (command.operation === 'invite' ||
      command.operation === 'help' ||
      command.operation === 'accept') &&
    !activityCommandSupported(world, 'outing')
  )
    return outcome(false, 'unsupported-command', BASE_OUTING.messages.unavailable);
  if (command.operation === 'help') {
    if (!isSafeRecordId(command.recipientId) || !isSafeRecordId(command.opponentId))
      return outcome(false, 'invalid-command', BASE_COMBAT_HELP.opponent);
    const problem = outingInvitationProblem(
      world,
      command.actorId,
      command.recipientId,
      'combat-help',
    );
    if (problem) return problem;
    const opponent = world.entities[command.opponentId];
    const humanProposed =
      !!command.humanInitiated || world.entities[command.actorId]!.actor!.controller === 'player';
    const ids = [command.actorId, command.recipientId];
    if (
      !opponent ||
      ids.some(
        (id) =>
          id === opponent.id ||
          !seesEntity(world, world.entities[id]!, opponent) ||
          attackPermissionProblem(world, world.entities[id]!, opponent, {
            requiresLethalReview: humanProposed,
          }),
      )
    )
      return outcome(false, 'help-opponent', BASE_COMBAT_HELP.opponent);
    return {
      trip: {
        id: command.id,
        kind: 'combat-help',
        revision: 1,
        proposerId: command.actorId,
        recipientId: command.recipientId,
        destination: {
          point: { ...worldPosition(opponent) },
          label: BASE_COMBAT_HELP.purpose,
        },
        purpose: BASE_COMBAT_HELP.purpose,
        createdAt: world.simTime,
        expiresAt: world.simTime + BASE_OUTING.offerSeconds,
        status: 'pending',
        proposerMode: 'enqueue',
        work: Object.fromEntries(ids.map((id) => [id, world.entities[id]!.actor!.planGeneration])),
        arrived: [],
        company: {},
        combat: {
          opponentId: opponent.id,
          opponentLife: opponent.actor!.physicalLife ?? 0,
          humanProposed,
          lives: Object.fromEntries(
            ids.map((id) => [id, world.entities[id]!.actor!.physicalLife ?? 0]),
          ),
          labels: Object.fromEntries(
            ids.map((id) => [id, observerDescription(world, id, opponent.id, 'definite')]),
          ),
        },
      },
    };
  }
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
      kind: 'travel',
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
    (trip.kind === 'travel' &&
      (!command.mode || !['enqueue', 'replace', 'interrupt'].includes(command.mode)))
  )
    return outcome(false, 'invalid-command', BASE_OUTING.messages.terms);
  const held = heldProblem(world, trip);
  if (held) return held;
  const nearby = outingRecipientProblem(world, command.actorId, trip.proposerId);
  if (nearby) return nearby;
  if (trip.kind === 'combat-help')
    return combatCurrent(world, trip, true)
      ? { trip }
      : outcome(false, 'help-unavailable', BASE_COMBAT_HELP.unavailable);
  for (const id of participants(trip)) {
    const refused = workProblem(
      world,
      trip,
      id,
      id === command.actorId ? command.mode! : trip.proposerMode,
    );
    if (refused) return refused;
  }
  return { trip };
}
function combatCurrent(world: WorldState, trip: Outing, requireSight = false): boolean {
  const combat = trip.combat;
  if (!combat) return false;
  const opponent = world.entities[combat.opponentId];
  return (
    !!opponent &&
    participants(trip).every((id) => {
      const actor = world.entities[id];
      return (
        !!actor?.actor &&
        able(world, id) &&
        (actor.actor.physicalLife ?? 0) === combat.lives[id] &&
        !attackPermissionProblem(world, actor, opponent, {
          targetLife: combat.opponentLife,
          requiresLethalReview: combat.humanProposed,
        }) &&
        (!requireSight || seesEntity(world, actor, opponent))
      );
    })
  );
}
/** Exact live consent is checked at admission and while unfinished work continues.
 * Released projectiles deliberately do not retain this revocable link. */
export function combatHelpProblem(
  world: WorldState,
  actorId: string,
  helpId: string,
  targetId?: string,
): Outcome | undefined {
  const trip = world.outings?.[helpId];
  if (
    !trip ||
    trip.kind !== 'combat-help' ||
    trip.status !== 'helping' ||
    trip.recipientId !== actorId ||
    !combatCurrent(world, trip) ||
    (targetId && targetId !== trip.combat!.opponentId) ||
    !seesEntity(world, world.entities[actorId]!, world.entities[trip.combat!.opponentId]!)
  )
    return outcome(false, 'help-ended', BASE_COMBAT_HELP.unavailable);
}
/** Current work must name its recipient's live agreement. History is checked by its
 * own owner, without demanding consent that has since ended.
 * docs/save-and-load.md#continuation-and-identity */
export function validateCombatHelpReference(
  world: WorldState,
  actorId: string,
  reference: { combatHelpId?: string; type?: string; targetId?: string; targetLife?: number },
): void {
  if (reference.combatHelpId === undefined) return;
  const trip = world.outings?.[reference.combatHelpId];
  const helper = world.entities[actorId]?.actor;
  const combat = trip?.combat;
  const opponentBound = ['strike', 'aim', 'shoot-once', 'hunt', 'follow'].includes(
    reference.type ?? '',
  );
  if (
    !isSafeRecordId(reference.combatHelpId) ||
    trip?.kind !== 'combat-help' ||
    trip.status !== 'helping' ||
    trip.recipientId !== actorId ||
    !helper ||
    !combat ||
    (helper.physicalLife ?? 0) !== combat.lives?.[actorId] ||
    !helper.agency.goals.some((goal) => goal.id === combat.goalId && goal.status === 'active') ||
    (opponentBound && reference.targetId !== combat.opponentId) ||
    (opponentBound &&
      reference.targetLife !== undefined &&
      reference.targetLife !== combat.opponentLife)
  )
    throw new Error('Invalid saved combat help reference.');
}
export function combatHelpFor(world: WorldState, actorId: string): Outing | undefined {
  const id = acceptedOutingId(world, actorId, 'combat-help');
  return id ? world.outings?.[id] : undefined;
}
/** Cancelling an owned trip's work does not choose a competing combat priority.
 * Preserve consent only when no earlier independent work already invalidated its baseline.
 * docs/worlds/base/social.md#voluntary-combat-help */
function preserveCombatHelpWork(
  world: WorldState,
  actorId: string,
  previousGeneration: number,
): void {
  const help = combatHelpFor(world, actorId);
  if (help?.recipientId === actorId && help.work[actorId] === previousGeneration)
    help.work[actorId] = world.entities[actorId]!.actor!.planGeneration;
}
export function combatHelpBinding(
  world: WorldState,
  actorId: string,
  command: { type: string; targetId?: string; purpose?: string },
): string | undefined {
  const trip = combatHelpFor(world, actorId);
  if (
    !trip ||
    trip.recipientId !== actorId ||
    !['strike', 'aim', 'shoot-once', 'hunt', 'guard', 'evade', 'move', 'follow'].includes(
      command.type,
    )
  )
    return;
  const helper = world.entities[actorId]!.actor!;
  const purpose = BASE_COMBAT_HELP.purpose;
  // A compatible physical action is not evidence that the helper chose this purpose.
  // Explicit candidates or the existing goal owner establish it; independent work survives.
  // docs/worlds/base/social.md#voluntary-combat-help
  if (
    command.purpose !== purpose &&
    !(
      (helper.agency.plan?.status === 'active' || helper.agency.plan?.status === 'blocked') &&
      helper.agency.plan.goalId === trip.combat!.goalId
    )
  )
    return;
  if (
    ['strike', 'aim', 'shoot-once', 'hunt', 'follow'].includes(command.type) &&
    command.targetId !== trip.combat!.opponentId
  )
    return;
  return trip.id;
}
function notice(
  world: WorldState,
  events: WorldEvent[],
  trip: Outing,
  actorId: string,
  text: string,
  ending?: { cause: OutingEndCause; actorId?: string },
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
        ` ${text}${trip.kind === 'combat-help' ? BASE_COMBAT_HELP.companionPrefix : BASE_OUTING.companionPrefix}`,
        person(actorId === trip.proposerId ? trip.recipientId : trip.proposerId),
        '.',
      ],
    },
    actor,
    trip.combat?.opponentId,
    {
      outingId: trip.id,
      ...(ending
        ? {
            endingCause: ending.cause,
            ...(ending.actorId ? { endingActorId: ending.actorId } : {}),
          }
        : {}),
      ...(trip.combat ? { opponentLife: trip.combat.opponentLife } : {}),
      destinationX: trip.destination.point.x,
      destinationY: trip.destination.point.y,
      destinationZ: trip.destination.point.z,
      ...(trip.kind === 'travel' ? { destinationSurface: trip.destination.point.surfaceId } : {}),
      semanticTrigger: true,
      importance: 6,
    },
    'private',
  );
  // Ordinary required personal evidence and event intake own reconsideration.
  const plan = actor.actor.agency.plan;
  if (plan && plan.id === trip.plans?.[actorId]) linkPlanResult(world, actorId, plan, event.id);
}
function closeOuting(
  world: WorldState,
  events: WorldEvent[],
  trip: Outing,
  cause: OutingEndCause,
  endingActorId?: string,
): void {
  const reason = BASE_OUTING.messages[cause];
  // Remove consent first. A cancellation cannot rediscover or resurrect its own trip.
  prepareOutingIndex(world);
  delete world.outings![trip.id];
  indexOuting(world, trip.id);
  for (const actorId of participants(trip)) {
    const actor = world.entities[actorId]?.actor;
    if (!actor) continue;
    const previousGeneration = actor.planGeneration;
    const planId = trip.plans?.[actorId];
    if (planId && actor.agency.suspended?.id === planId) discardSuspended(world, actor, actorId);
    if (planId && actor.agency.plan?.id === planId) {
      cancelPlan(world, actor, actorId, false);
      if (actor.agency.plan.activity) actor.agency.plan.activity.reason = reason;
    }
    if (trip.kind === 'travel' && actor.planGeneration !== previousGeneration) {
      // Cancelling this exact walk is not choosing a competing combat priority.
      // Preserve separate consent only if no earlier independent replacement invalidated it.
      // docs/worlds/base/social.md#voluntary-combat-help
      preserveCombatHelpWork(world, actorId, previousGeneration);
    }
    if (trip.kind === 'combat-help') {
      const owned = (plan: typeof actor.agency.plan | undefined) =>
        plan &&
        (plan.activity?.combatHelpId === trip.id ||
          plan.goalId === trip.combat!.goalId ||
          plan.steps.some(
            (step) => 'combatHelpId' in step.command && step.command.combatHelpId === trip.id,
          ));
      if (owned(actor.agency.suspended)) discardSuspended(world, actor, actorId);
      if (owned(actor.agency.plan)) cancelPlan(world, actor, actorId, false);
      if (actor.action?.combatHelpId === trip.id) {
        endActivity(
          world,
          actorId,
          actor.action.id,
          outcome(false, 'help-ended', BASE_COMBAT_HELP.ended),
        );
        releaseInvocationResources(world, actor.action.id);
        actor.action = null;
        actor.planGeneration++;
      }
      const goal = actor.agency.goals.find((goal) => goal.id === trip.combat!.goalId);
      if (goal && (goal.status === 'active' || goal.status === 'paused'))
        changeGoal(
          actor,
          {
            operation: 'abandon',
            goalId: goal.id,
            expectedRevision: goal.revision,
            objective: null,
            parentId: null,
          },
          nextId(world, 'help-ended'),
          'actor',
        );
    }
    // No remote position, private work, health or unseen arrival is disclosed.
    notice(
      world,
      events,
      trip,
      actorId,
      trip.kind === 'combat-help'
        ? BASE_COMBAT_HELP.closed(
            cause,
            trip.status === 'pending',
            endingActorId === undefined ? undefined : endingActorId === actorId,
          )
        : BASE_OUTING.ended(trip.destination.label, reason),
      { cause, ...(endingActorId ? { actorId: endingActorId } : {}) },
    );
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
  if (command.operation === 'invite' || command.operation === 'help') {
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
        trip.kind === 'combat-help'
          ? BASE_COMBAT_HELP.invited(id === trip.proposerId)
          : BASE_OUTING.invited(trip.destination.label, trip.purpose, id === trip.proposerId),
      );
    return outcome(
      true,
      'outing-invited',
      trip.kind === 'combat-help' ? BASE_COMBAT_HELP.sent : BASE_OUTING.messages.invited,
    );
  }
  if (command.operation === 'decline' || command.operation === 'leave') {
    const message =
      trip.kind === 'combat-help'
        ? command.operation === 'decline'
          ? BASE_COMBAT_HELP.declined
          : BASE_COMBAT_HELP.ended
        : command.operation === 'decline'
          ? BASE_OUTING.messages.declined
          : BASE_OUTING.messages.left;
    closeOuting(
      world,
      events,
      trip,
      command.operation === 'decline' ? 'declined' : 'left',
      command.actorId,
    );
    return outcome(true, 'outing-ended', message);
  }
  if (trip.kind === 'combat-help') {
    const helper = world.entities[trip.recipientId]!.actor!;
    const goalId = nextId(world, 'help-goal');
    const result = changeGoal(
      helper,
      {
        operation: 'create',
        goalId: null,
        expectedRevision: null,
        parentId: null,
        objective: BASE_COMBAT_HELP.objective(
          observerDescription(world, trip.recipientId, trip.proposerId, 'definite'),
          trip.combat!.labels[trip.recipientId]!,
        ),
      },
      goalId,
      'actor',
    );
    if (!result.ok) return result;
    prepareOutingIndex(world);
    trip.combat!.goalId = goalId;
    trip.work[trip.recipientId] = helper.planGeneration;
    trip.status = 'helping';
    trip.revision++;
    indexOuting(world, trip.id, trip);
    for (const id of participants(trip)) {
      trip.company[id] = true;
      notice(world, events, trip, id, BASE_COMBAT_HELP.accepted(id === trip.recipientId));
    }
    return outcome(true, 'help-accepted', BASE_COMBAT_HELP.accepted(true));
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
    const close = (cause: OutingEndCause) => {
      closeOuting(world, events, trip, cause);
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
      if (heldProblem(world, trip)) close(world.simTime >= trip.expiresAt ? 'expired' : 'changed');
      continue;
    }
    const actors = participants(trip);
    if (!destinationCurrent(world, trip) || actors.some((id) => !able(world, id))) {
      close('unavailable');
      continue;
    }
    if (trip.kind === 'combat-help') {
      const helper = world.entities[trip.recipientId]!.actor!;
      const goal = helper.agency.goals.find((goal) => goal.id === trip.combat!.goalId);
      const plan = helper.agency.plan;
      const ownsWork =
        helper.action?.combatHelpId === trip.id ||
        ((plan?.status === 'active' || plan?.status === 'blocked') &&
          (plan.activity?.combatHelpId === trip.id ||
            plan.goalId === goal?.id ||
            plan.steps.some(
              (step) =>
                'combatHelpId' in step.command &&
                step.command.combatHelpId === trip.id &&
                (step.status === 'running' ||
                  step.status === 'queued' ||
                  step.status === 'blocked'),
            )));
      if (
        !combatCurrent(world, trip) ||
        !goal ||
        goal.status !== 'active' ||
        (helper.planGeneration !== trip.work[trip.recipientId] && !ownsWork) ||
        !seesEntity(
          world,
          world.entities[trip.recipientId]!,
          world.entities[trip.combat!.opponentId]!,
        )
      ) {
        close('unavailable');
        continue;
      }
      if (ownsWork) trip.work[trip.recipientId] = helper.planGeneration;
      for (const id of actors) {
        const otherId = id === trip.proposerId ? trip.recipientId : trip.proposerId;
        const company = options.companyObserved
          ? (world.visiblePeople?.[id]?.includes(otherId) ?? false)
          : seesEntity(world, world.entities[id]!, world.entities[otherId]!);
        if (trip.company[id] !== company) {
          trip.company[id] = company;
          notice(
            world,
            events,
            trip,
            id,
            company ? BASE_COMBAT_HELP.company : BASE_COMBAT_HELP.separated,
          );
        }
      }
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
        close('interrupted');
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
    if (!ended && trip.arrived.length === 2) close('finished');
  }
}
export function validateOutings(world: WorldState): void {
  if (world.outings === undefined) return;
  if (!world.outings || typeof world.outings !== 'object' || Array.isArray(world.outings))
    throw new Error('Invalid outing records.');
  const active = new Set<string>();
  for (const [id, trip] of Object.entries(world.outings)) {
    const status: string = trip?.status;
    if (
      !trip ||
      id !== trip.id ||
      !isSafeRecordId(id) ||
      trip.revision !== (trip.status === 'pending' ? 1 : 2) ||
      !isSafeRecordId(trip.proposerId) ||
      !isSafeRecordId(trip.recipientId) ||
      trip.proposerId === trip.recipientId ||
      !['pending', 'traveling', 'helping'].includes(trip.status) ||
      !['travel', 'combat-help'].includes(trip.kind) ||
      (trip.kind === 'travel' && (trip.combat !== undefined || status === 'helping')) ||
      (trip.kind === 'combat-help' && (status === 'traveling' || !trip.combat)) ||
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
      (trip.kind === 'travel' && !isSafeRecordId(trip.destination.point.surfaceId)) ||
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
    if (trip.kind === 'combat-help') {
      const combat = trip.combat!;
      if (
        !hasRecordFields(
          combat,
          ['opponentId', 'opponentLife', 'humanProposed', 'lives', 'labels'],
          ['goalId'],
        ) ||
        Object.keys(combat.lives ?? {}).length !== 2 ||
        Object.keys(combat.labels ?? {}).length !== 2 ||
        !isSafeRecordId(combat.opponentId) ||
        !world.entities[combat.opponentId]?.actor ||
        !Number.isSafeInteger(combat.opponentLife) ||
        combat.opponentLife < 0 ||
        typeof combat.humanProposed !== 'boolean' ||
        !combat.lives ||
        !combat.labels ||
        participants(trip).some(
          (id) =>
            !Number.isSafeInteger(combat.lives[id]) ||
            combat.lives[id]! < 0 ||
            typeof combat.labels[id] !== 'string' ||
            !combat.labels[id]!.trim(),
        ) ||
        (trip.status === 'pending'
          ? combat.goalId !== undefined
          : !world.entities[trip.recipientId]!.actor!.agency.goals.some(
              (goal) => goal.id === combat.goalId && goal.status === 'active',
            )) ||
        !combatCurrent(world, trip)
      )
        throw new Error('Invalid combat help consent.');
      if (trip.status === 'helping')
        for (const actorId of participants(trip)) {
          const key = `${trip.kind}\0${actorId}`;
          if (active.has(key)) throw new Error('Invalid combat help participation.');
          active.add(key);
        }
    }
    if (trip.status === 'traveling')
      for (const actorId of participants(trip)) {
        if (
          active.has(`${trip.kind}\0${actorId}`) ||
          !isSafeRecordId(trip.plans?.[actorId]) ||
          world.entities[actorId]!.actor!.agency.plan?.id !== trip.plans?.[actorId]
        )
          throw new Error('Invalid outing participation.');
        active.add(`${trip.kind}\0${actorId}`);
      }
  }
}
