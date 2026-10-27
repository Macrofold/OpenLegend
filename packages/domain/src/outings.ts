import type { NativeExecutionPermissions } from './construction-permissions.js';
import {
  movementOutingSnapshot,
  perceivedMovementOutings,
  mutualSocialReception,
  type PerceivedMovementOuting,
} from './personal-social.js';
import { currentInventoryInspection } from './inventory-inspection.js';
import { EXPERIENCE_LIMITS } from './experience.js';
import {
  compileAssemblyActivity,
  assemblyPermission,
  assemblyPhaseLabel,
  assemblyActivityCommand,
} from './assemblies.js';
import { bindActivityCommand } from './activity-execution.js';
import { nativeOperationFields } from './native-command-contracts.js';
import { definitionPin } from './world-modules.js';
import type { ConstructionPermission } from './assembly-types.js';
import { custodian } from './objects.js';
import { recipeMechanicalPin } from './invention-families.js';
import { sameDefinitionPin } from './definition-pins.js';
import { hasMemory, canSpeak, understandsSpeech } from './living.js';
import { rememberedPlace, rememberSighting } from './agency.js';
import {
  cooperationTermsCurrent,
  cooperationTermsLabel,
  personalCooperationTerms,
  perceivedCooperation,
  type PerceivedCooperation,
  type CooperationProposal,
  validateCooperationTerms,
  type CooperationEpisode,
  type CooperationEndCause,
  type CooperationPurposeBinding,
} from './cooperation.js';
import { socialOfferAdmissionProblem } from './social-offers.js';
import { entityGet } from './entity-collection.js';
import {
  prepareOutingIndex,
  indexOuting,
  actorOutingIds,
  acceptedOutingId,
  affectedOutingIds,
  nativeOutingIds,
  prepareFullOutingCheck,
} from './outing-index.js';
export { nextOutingDeadline } from './outing-index.js';
import type { SurfacePoint, WorldPoint } from '@open-legend/spatial';
import type { Command, Outcome, WorldEvent, WorldState } from './types.js';
import { outcome, emit, emitPrivateObservation, canonicalJson } from './events.js';
import { person } from './narration.js';
import { nextId } from './data.js';
import { cloneValue, changedDraftEntityIds } from './draft.js';
import { isSafeRecordId, getOwn, hasRecordFields } from './records.js';
import { activelyParticipates } from './participation-state.js';
import { hearsEntity, seesEntity } from './perception.js';
import { canReachEntity } from './spatial.js';
import { nativeOperationAvailable, prepareNativeChoice } from './kernel.js';
import {
  cancelPlan,
  stopCooperativeWork,
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
import { observerDescription, subjectReferenceCurrent } from './worlds/base/knowledge.js';
import { worldPosition, worldSupport, supportedPosition } from './spatial-state.js';
import { endActivity } from './action-experience.js';
import { releaseInvocationResources } from './resource-claims.js';
import { countDomainWork } from './diagnostic-counters.js';
import { isCompactCommand, executeCompact, type CompactCommand } from './social-compacts.js';

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
export type MovementOuting = OutingTerms &
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
export type Outing = MovementOuting | CooperationEpisode;
export type OutingCommand =
  | CompactCommand
  | ({ type: 'outing'; operation: 'propose'; recipientId: string } & CooperationProposal)
  | ({
      type: 'outing';
      operation: 'revise';
      outingId: string;
      expectedRevision: number;
    } & CooperationProposal)
  | {
      type: 'outing';
      operation: 'work';
      outingId: string;
      expectedRevision: number;
      mode: OutingMode;
    }
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
      operation: 'accept' | 'decline' | 'leave' | 'withdraw' | 'conclude';
      outingId: string;
      expectedRevision: number;
      mode?: OutingMode;
      amendmentRevision?: number;
    };
type AnyOutingCommand = Extract<Command, { type: 'outing' }>;
type OwnedCommand = Exclude<AnyOutingCommand, CompactCommand>;
/** Ending consent requires the exact current outing terms, not physical ability. */
export function endsOutingConsent(command: Command): boolean {
  return (
    command.type === 'outing' &&
    [
      'leave',
      'decline',
      'withdraw',
      'conclude',
      'compact-leave',
      'compact-decline',
      'compact-withdraw',
    ].includes(command.operation)
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
  const actor = entityGet(world.entities, actorId),
    other = entityGet(world.entities, otherId);
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
  const admission = socialOfferAdmissionProblem(world, actorId, otherId);
  if (admission) return admission;
  const current = actorOutings(world, actorId).filter((trip) => trip.kind === kind);
  if (current.some((trip) => participants(trip).includes(otherId)))
    return outcome(false, 'outing-pending', BASE_OUTING.messages.pending);
  if (acceptedOutingId(world, actorId, kind) || acceptedOutingId(world, otherId, kind))
    return outcome(false, 'outing-limit', BASE_OUTING.messages.limit);
}
function able(world: WorldState, id: string): boolean {
  const entity = entityGet(world.entities, id);
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
  const actor = entityGet(world.entities, actorId),
    target = entityGet(world.entities, entityId);
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
function destinationCurrent(world: WorldState, trip: MovementOuting): boolean {
  if (trip.kind === 'combat-help') return combatCurrent(world, trip);
  const destination = trip.destination;
  if (!destination.entityId) return true;
  const entity = entityGet(world.entities, destination.entityId);
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
  const actor = entityGet(world.entities, actorId)?.actor;
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
function heldProblem(world: WorldState, trip: MovementOuting): Outcome | undefined {
  if (world.socialOfferPolicy?.cooperation) {
    const occupied = cooperationSlotProblem(world, participants(trip), trip.id);
    if (occupied) return occupied;
  }
  if (
    world.simTime >= trip.expiresAt ||
    !destinationCurrent(world, trip) ||
    participants(trip).some(
      (id) =>
        !able(world, id) ||
        // Help adds a purpose without replacing work; fighting while awaiting a
        // reply must not revoke it. Travel acceptance still replaces exact work.
        // docs/worlds/base/social.md#voluntary-combat-help
        (trip.kind === 'travel' &&
          entityGet(world.entities, id)!.actor!.planGeneration !== trip.work[id]) ||
        acceptedOutingId(world, id, trip.kind) !== undefined,
    )
  )
    return outcome(false, 'outing-changed', BASE_OUTING.messages.changed);
}
export function prepareOuting(
  world: WorldState,
  command: OwnedCommand,
  permissions: NativeExecutionPermissions = {},
):
  | Outcome
  | { trip: Outing }
  | { endingKnown: PerceivedCooperation }
  | { endingMovement: PerceivedMovementOuting } {
  if (
    'outingId' in command &&
    !world.outings?.[command.outingId] &&
    ['leave', 'conclude', 'decline', 'withdraw'].includes(command.operation)
  ) {
    const known = perceivedCooperation(world, command.actorId).find(
      (value) =>
        value.id === command.outingId &&
        value.status !== 'ended' &&
        (value.status === 'accepted'
          ? ['leave', 'conclude'].includes(command.operation) &&
            value.acceptedRevision === command.expectedRevision
          : value.revision === command.expectedRevision &&
            (command.operation === 'decline'
              ? value.recipientId === command.actorId
              : command.operation === 'withdraw' && value.proposerId === command.actorId)),
    );
    if (known) return { endingKnown: known };
    const movement = perceivedMovementOutings(world, command.actorId).find(
      (known) =>
        known.id === command.outingId &&
        known.revision === command.expectedRevision &&
        known.status !== 'ended' &&
        (command.operation === 'leave' ||
          (command.operation === 'decline' &&
            known.status === 'pending' &&
            known.recipientId === command.actorId)),
    );
    if (movement) return { endingMovement: movement };
  }
  if (
    command.operation === 'propose' ||
    command.operation === 'revise' ||
    command.operation === 'withdraw' ||
    command.operation === 'conclude' ||
    ('outingId' in command && world.outings?.[command.outingId]?.kind === 'cooperate')
  )
    return prepareCooperation(world, command, permissions);
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
    const opponent = entityGet(world.entities, command.opponentId);
    const humanProposed =
      !!command.humanInitiated ||
      entityGet(world.entities, command.actorId)!.actor!.controller === 'player';
    const ids = [command.actorId, command.recipientId];
    if (
      !opponent ||
      ids.some(
        (id) =>
          id === opponent.id ||
          !seesEntity(world, entityGet(world.entities, id)!, opponent) ||
          attackPermissionProblem(world, entityGet(world.entities, id)!, opponent, {
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
        expiresAt: world.simTime + world.socialOfferPolicy!.pendingSeconds,
        status: 'pending',
        proposerMode: 'enqueue',
        work: Object.fromEntries(
          ids.map((id) => [id, entityGet(world.entities, id)!.actor!.planGeneration]),
        ),
        arrived: [],
        company: {},
        combat: {
          opponentId: opponent.id,
          opponentLife: opponent.actor!.physicalLife ?? 0,
          humanProposed,
          lives: Object.fromEntries(
            ids.map((id) => [id, entityGet(world.entities, id)!.actor!.physicalLife ?? 0]),
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
      expiresAt: world.simTime + world.socialOfferPolicy!.pendingSeconds,
      proposerMode: command.mode,
      work: Object.fromEntries(
        [command.actorId, command.recipientId].map((id) => [
          id,
          entityGet(world.entities, id)!.actor!.planGeneration,
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
  if (trip.kind === 'cooperate')
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
      id === command.actorId && 'mode' in command ? command.mode! : trip.proposerMode,
    );
    if (refused) return refused;
  }
  return { trip };
}
function combatCurrent(world: WorldState, trip: MovementOuting, requireSight = false): boolean {
  const combat = trip.kind === 'combat-help' ? trip.combat : undefined;
  if (!combat) return false;
  const opponent = entityGet(world.entities, combat.opponentId);
  return (
    !!opponent &&
    participants(trip).every((id) => {
      const actor = entityGet(world.entities, id);
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
    !seesEntity(
      world,
      entityGet(world.entities, actorId)!,
      entityGet(world.entities, trip.combat!.opponentId)!,
    )
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
  const helper = entityGet(world.entities, actorId)?.actor;
  const combat = trip?.kind === 'combat-help' ? trip.combat : undefined;
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
export function combatHelpFor(
  world: WorldState,
  actorId: string,
): Extract<MovementOuting, { kind: 'combat-help' }> | undefined {
  const id = acceptedOutingId(world, actorId, 'combat-help');
  const trip = id ? world.outings?.[id] : undefined;
  return trip?.kind === 'combat-help' ? trip : undefined;
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
    help.work[actorId] = entityGet(world.entities, actorId)!.actor!.planGeneration;
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
  const helper = entityGet(world.entities, actorId)!.actor!;
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
  trip: MovementOuting,
  actorId: string,
  text: string,
  ending?: { cause: OutingEndCause; actorId?: string },
): void {
  const actor = entityGet(world.entities, actorId);
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
      personalAgreement: true,
      agreement: canonicalJson(movementOutingSnapshot(trip, actorId, ending?.cause)),
      ...(ending
        ? {
            endingCause: ending.cause,
            ...(ending.actorId ? { endingActorId: ending.actorId } : {}),
          }
        : {}),
      ...(trip.combat ? { opponentLife: trip.combat.opponentLife } : {}),
      ...(trip.kind === 'travel'
        ? {
            destinationX: trip.destination.point.x,
            destinationY: trip.destination.point.y,
            destinationZ: trip.destination.point.z,
            destinationSurface: trip.destination.point.surfaceId,
          }
        : {}),
      semanticTrigger: true,
      importance: EXPERIENCE_LIMITS.protectedImportance,
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
  trip: MovementOuting,
  cause: OutingEndCause,
  endingActorId?: string,
): void {
  // Remove consent first. A cancellation cannot rediscover or resurrect its own trip.
  prepareOutingIndex(world);
  delete world.outings![trip.id];
  indexOuting(world, trip.id);
  for (const actorId of participants(trip)) {
    const actor = entityGet(world.entities, actorId)?.actor;
    if (!actor) continue;
    const otherId = actorId === trip.proposerId ? trip.recipientId : trip.proposerId,
      received =
        endingActorId === actorId ||
        cause === 'expired' ||
        mutualSocialReception(world, actorId, otherId),
      reason = received
        ? BASE_OUTING.messages[cause]
        : 'The previously chosen work is no longer available. The other person’s current choices are unknown.';
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
    if (
      !received ||
      !perceivedMovementOutings(world, actorId).some(
        (known) => known.id === trip.id && known.revision === trip.revision,
      )
    )
      continue;
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
  command: AnyOutingCommand,
  events: WorldEvent[],
  context: NativeExecutionPermissions = {},
): Outcome {
  if (isCompactCommand(command)) return executeCompact(world, command, events);
  const prepared = prepareOuting(world, command, context);
  if ('ok' in prepared) return prepared;
  if ('endingKnown' in prepared) {
    const { amendment: _amendment, ...known } = prepared.endingKnown;
    const actor = entityGet(world.entities, command.actorId)!;
    const snapshot = {
      ...cloneValue(known),
      status: 'ended',
      cause:
        command.operation === 'decline'
          ? 'declined'
          : command.operation === 'conclude'
            ? 'concluded'
            : 'withdrawn',
    };
    emit(
      world,
      events,
      'cooperation',
      "You ended your own participation in these last received terms. This does not report the other person's current choices.",
      actor,
      undefined,
      {
        cooperationId: known.id,
        agreement: canonicalJson(snapshot),
        semanticTrigger: true,
        importance: EXPERIENCE_LIMITS.protectedImportance,
      },
      'private',
    );
    return outcome(
      true,
      'cooperation-ended',
      'You ended your own remembered participation. Completed effects remain.',
    );
  }
  if ('endingMovement' in prepared) {
    const known = prepared.endingMovement,
      actor = entityGet(world.entities, command.actorId)!;
    emit(
      world,
      events,
      'outing',
      'You ended your own participation in the last received travel or help terms. The other person’s current choices remain unknown.',
      actor,
      undefined,
      {
        outingId: known.id,
        personalAgreement: true,
        agreement: canonicalJson({ ...known, status: 'ended', cause: 'own-ending' }),
        importance: EXPERIENCE_LIMITS.protectedImportance,
      },
      'private',
    );
    return outcome(
      true,
      'outing-ended',
      'Your remembered participation ended; completed effects remain.',
    );
  }
  const trip = prepared.trip;
  if (trip.kind === 'cooperate') return executeCooperation(world, command, trip, events, context);
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
    const helper = entityGet(world.entities, trip.recipientId)!.actor!;
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
      id === command.actorId && 'mode' in command ? command.mode! : trip.proposerMode,
    );
    const admitted = startRequestedActivity(world, id, selected.id, selected, context);
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
/** Select changed participants/destinations, affected observers and due deadlines.
 * Unknown builders or changed shared rules retain complete checks. Neither path
 * visits terminal history, grants remote tracking or starts model work. */
export function reconcileOutings(
  world: WorldState,
  events: WorldEvent[],
  options: {
    changedOnly?: boolean;
    companyObserved?: boolean;
    observedActors?: Iterable<string>;
    baseline?: WorldState;
  } = {},
): void {
  if (!world.outings) return;
  const entities = options.changedOnly ? changedDraftEntityIds(world) : undefined;
  let ids = options.changedOnly
    ? entities && affectedOutingIds(world, entities)
    : nativeOutingIds(world, options.baseline, options.observedActors);
  if (!ids) {
    prepareFullOutingCheck(world);
    ids = new Set(Object.keys(world.outings));
  }
  for (const tripId of ids) {
    const trip = world.outings[tripId];
    if (!trip) continue;
    if (trip.kind === 'cooperate') {
      reconcileCooperation(world, events, trip);
      if (!world.outings[tripId])
        for (const actorId of participants(trip))
          for (const id of actorOutingIds(world, actorId)) {
            ids.delete(id);
            ids.add(id);
          }
      continue;
    }
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
      const helper = entityGet(world.entities, trip.recipientId)!.actor!;
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
          entityGet(world.entities, trip.recipientId)!,
          entityGet(world.entities, trip.combat!.opponentId)!,
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
          : seesEntity(world, entityGet(world.entities, id)!, entityGet(world.entities, otherId)!);
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
      const actor = entityGet(world.entities, id)!,
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
      const company =
        observedCompany ?? seesEntity(world, actor, entityGet(world.entities, otherId)!);
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
    if (world.socialOfferPolicy?.cooperation && trip.status !== 'pending')
      for (const actorId of participants(trip)) {
        const key = JSON.stringify(['physical-cooperation', actorId]);
        if (active.has(key)) throw new Error('Duplicate accepted physical cooperation.');
        active.add(key);
      }
    if (trip.kind === 'cooperate') {
      validateCooperation(world, id, trip, active);
      continue;
    }
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
      !world.socialOfferPolicy ||
      trip.expiresAt > trip.createdAt + world.socialOfferPolicy.pendingSeconds ||
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
        (id) => !entityGet(world.entities, id)?.actor || !Number.isSafeInteger(trip.work[id]),
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
        !entityGet(world.entities, combat.opponentId)?.actor ||
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
          : !entityGet(world.entities, trip.recipientId)!.actor!.agency.goals.some(
              (goal) => goal.id === combat.goalId && goal.status === 'active',
            )) ||
        !combatCurrent(world, trip)
      )
        throw new Error('Invalid combat help consent.');
      if (trip.status === 'helping')
        for (const actorId of participants(trip)) {
          const key = JSON.stringify([trip.kind, actorId]);
          if (active.has(key)) throw new Error('Invalid combat help participation.');
          active.add(key);
        }
    }
    if (trip.status === 'traveling')
      for (const actorId of participants(trip)) {
        if (
          active.has(JSON.stringify([trip.kind, actorId])) ||
          !isSafeRecordId(trip.plans?.[actorId]) ||
          entityGet(world.entities, actorId)!.actor!.agency.plan?.id !== trip.plans?.[actorId]
        )
          throw new Error('Invalid outing participation.');
        active.add(JSON.stringify([trip.kind, actorId]));
      }
  }
}

/** Cooperation uses this outing owner for consent; ordinary work owners alone move bodies. */
export function cooperationReceptionProblem(
  world: WorldState,
  actorId: string,
  otherId: string,
): Outcome | undefined {
  const actor = entityGet(world.entities, actorId),
    other = entityGet(world.entities, otherId);
  if (
    !actor ||
    !other ||
    actorId === otherId ||
    !hasMemory(actor) ||
    !hasMemory(other) ||
    !canSpeak(actor) ||
    !canSpeak(other) ||
    !understandsSpeech(actor) ||
    !understandsSpeech(other) ||
    !able(world, actorId) ||
    !able(world, otherId) ||
    !seesEntity(world, actor, other) ||
    !seesEntity(world, other, actor) ||
    !hearsEntity(world, actor, other) ||
    !hearsEntity(world, other, actor)
  )
    return outcome(
      false,
      'cooperation-reception',
      'Both people must perceive and hear one another to review these terms.',
    );
}
function chosenGuideTerms(
  world: WorldState,
  actorId: string,
  destinationId: string,
): CooperationEpisode['terms'] | undefined {
  if (!isSafeRecordId(destinationId)) return;
  const actor = entityGet(world.entities, actorId);
  if (!actor?.actor) return;
  const exposure = personallyKnownPlaceReports(world, actorId).find(
    (entry) => entry.exposure.id === destinationId,
  );
  if (exposure?.exposure?.kind === 'place')
    return {
      purpose: 'guide',
      destination: {
        point: cloneValue(exposure.exposure.point),
        label: exposure.exposure.label,
        source: {
          subjectId: destinationId,
          observedAt: exposure.at,
          episode: null,
          evidenceId: exposure.eventId,
          placeRevision: exposure.exposure.revision,
        },
      },
    };
  const target = entityGet(world.entities, destinationId);
  const inspected = currentInventoryInspection(world, actorId);
  if (target?.container && inspected?.containerId === target.id) {
    const root = entityGet(world.entities, custodian(world, target.id));
    const point = root && !root.actor && !root.retirement ? supportedPosition(root) : undefined;
    if (point)
      return {
        purpose: 'guide',
        destination: {
          point: cloneValue(point),
          label: observerDescription(world, actorId, target.id, 'definite'),
          entityId: target.id,
          placement: canonicalJson(target.placement),
          anchor: { entityId: root!.id, placement: canonicalJson(root!.placement) },
          source: {
            subjectId: target.id,
            observedAt: world.simTime,
            episode: world.perceptionEpisodes?.[actorId]?.[target.id] ?? null,
          },
        },
      };
  }
  const current =
    target && worldSupport(target) !== null
      ? outingDestination(world, actorId, destinationId)
      : undefined;
  if (current)
    return {
      purpose: 'guide',
      destination: {
        ...current,
        source: {
          subjectId: destinationId,
          observedAt: world.simTime,
          episode: world.perceptionEpisodes?.[actorId]?.[destinationId] ?? null,
        },
      },
    };
  const remembered = rememberedPlace(actor.actor, destinationId);
  // A remembered point is disclosed as testimony. Do not query the subject's hidden position.
  const fixed = entityGet(world.entities, destinationId);
  if (remembered && fixed && !fixed.actor)
    return {
      purpose: 'guide',
      destination: {
        point: cloneValue(remembered.point),
        label: remembered.label,
        source: {
          subjectId: destinationId,
          observedAt: remembered.at,
          episode: remembered.episode,
        },
      },
    };
}
function cooperationSlotProblem(
  world: WorldState,
  ids: string[],
  excluding?: string,
): Outcome | undefined {
  for (const id of ids)
    for (const trip of actorOutings(world, id))
      if (trip.id !== excluding && trip.status !== 'pending')
        return outcome(
          false,
          'cooperation-limit',
          'A person already has accepted physical cooperation; leave it before accepting another.',
        );
}
function cooperationCurrent(world: WorldState, trip: CooperationEpisode): boolean {
  const policy = world.socialOfferPolicy,
    terms = trip.terms,
    method =
      terms.purpose === 'help' && terms.task.kind === 'prepare' ? terms.task.recipe : undefined;
  return (
    !!policy?.cooperation &&
    policy.id === trip.definition.id &&
    policy.version === trip.definition.version &&
    policy.cooperation.families.includes(trip.terms.purpose) &&
    (!method || !!policy.cooperation.helpMethods?.some((pin) => sameDefinitionPin(pin, method))) &&
    cooperationTermsCurrent(world, trip.terms) &&
    participants(trip).every((id) => {
      const actor = entityGet(world.entities, id)?.actor;
      return !!actor && able(world, id) && (actor.physicalLife ?? 0) === trip.lives[id];
    })
  );
}
function prepareCooperation(
  world: WorldState,
  command: OwnedCommand,
  context: NativeExecutionPermissions = {},
): Outcome | { trip: CooperationEpisode; terms?: CooperationEpisode['terms'] } {
  const permissions = context.constructionPermissions ?? [];
  const policy = world.socialOfferPolicy;
  if (!policy?.cooperation || !activityCommandSupported(world, 'outing'))
    return outcome(
      false,
      'cooperation-unavailable',
      'This world does not install this cooperative activity.',
    );
  if (command.operation === 'propose') {
    if (!policy.cooperation.families.includes(command.cooperationKind))
      return outcome(false, 'cooperation-terms', 'Choose a supported cooperative activity.');
    const problem =
      cooperationReceptionProblem(world, command.actorId, command.recipientId) ??
      socialOfferAdmissionProblem(world, command.actorId, command.recipientId);
    if (problem) return problem;
    if (
      actorOutings(world, command.actorId).some(
        (t) => t.kind === 'cooperate' && participants(t).includes(command.recipientId),
      )
    )
      return outcome(false, 'cooperation-pending', policy.messages.pair);
    const terms = chosenCooperationTerms(
      world,
      command.actorId,
      command.recipientId,
      command,
      permissions,
      command.id,
    );
    if (!terms)
      return outcome(false, 'cooperation-place', 'Choose a fixed place you personally know.');
    return {
      trip: {
        kind: 'cooperate',
        id: command.id,
        revision: 1,
        proposerId: command.actorId,
        recipientId: command.recipientId,
        definition: { id: policy.id, version: policy.version },
        terms,
        status: 'pending',
        createdAt: world.simTime,
        expiresAt: world.simTime + policy.pendingSeconds,
        lives: Object.fromEntries(
          [command.actorId, command.recipientId].map((id) => [
            id,
            entityGet(world.entities, id)!.actor!.physicalLife ?? 0,
          ]),
        ),
        ownedWork: {},
        arrived: [],
      },
    };
  }
  if (!('outingId' in command))
    return outcome(false, 'invalid-command', 'Choose an exact cooperative agreement.');
  const trip = getOwn(world.outings ?? {}, command.outingId);
  if (
    trip?.kind !== 'cooperate' ||
    !participants(trip).includes(command.actorId) ||
    (trip.revision !== command.expectedRevision &&
      !(
        trip.status === 'accepted' &&
        (command.operation === 'leave' ||
          command.operation === 'conclude' ||
          command.operation === 'work') &&
        trip.acceptedRevision === command.expectedRevision
      ))
  )
    return outcome(
      false,
      'cooperation-changed',
      'These cooperative terms are no longer available.',
    );
  const amendment = trip.pendingAmendment;
  if (
    'amendmentRevision' in command &&
    command.amendmentRevision !== undefined &&
    amendment?.revision !== command.amendmentRevision
  )
    return outcome(false, 'cooperation-changed', 'The proposed amendment changed.');
  if (['leave', 'conclude'].includes(command.operation)) return { trip };
  if (command.operation === 'withdraw') {
    if (
      amendment &&
      command.amendmentRevision === amendment.revision &&
      amendment.proposedBy === command.actorId
    )
      return { trip };
    if (trip.status === 'pending' && trip.proposerId === command.actorId) return { trip };
    return outcome(false, 'cooperation-changed', 'Choose your current proposal to withdraw.');
  }
  if (command.operation === 'decline') {
    if (
      amendment &&
      command.amendmentRevision === amendment.revision &&
      amendment.proposedBy !== command.actorId
    )
      return { trip };
    return trip.status === 'pending' && trip.recipientId === command.actorId
      ? { trip }
      : outcome(false, 'cooperation-changed', 'Choose the current proposal to decline.');
  }
  if (
    !cooperationCurrent(world, trip) ||
    (trip.status === 'pending' ? world.simTime >= trip.expiresAt : world.simTime >= trip.endAt!)
  )
    return outcome(
      false,
      'cooperation-unavailable',
      'This cooperative activity is no longer available.',
    );
  if (command.operation === 'work') {
    if (
      trip.status !== 'accepted' ||
      trip.terms.purpose !== 'help' ||
      trip.terms.task.kind !== 'construction' ||
      trip.terms.task.helperId !== command.actorId ||
      !['enqueue', 'replace', 'interrupt'].includes(command.mode)
    )
      return outcome(
        false,
        'cooperation-work',
        'Choose the exact agreed construction work and handling of current work.',
      );
    const native = cooperationConstructionCommand(world, trip, command.actorId, command.id);
    const prepared = prepareNativeChoice(
      world,
      command.actorId,
      native,
      command.mode,
      permissions,
      undefined,
      context.campAssetPermissions,
    );
    const available = 'ok' in prepared ? prepared : prepared.outcome;
    return available.ok ? { trip } : available;
  }
  const nearby = cooperationReceptionProblem(
    world,
    command.actorId,
    command.actorId === trip.proposerId ? trip.recipientId : trip.proposerId,
  );
  if (nearby) return nearby;
  if (command.operation === 'revise') {
    const terms = chosenCooperationTerms(
      world,
      command.actorId,
      participants(trip).find((id) => id !== command.actorId)!,
      command,
      permissions,
      command.id,
    );
    if (!terms)
      return outcome(false, 'cooperation-place', 'Choose a fixed place you personally know.');
    const admission = socialOfferAdmissionProblem(
      world,
      command.actorId,
      command.actorId === trip.proposerId ? trip.recipientId : trip.proposerId,
      { family: 'outing', id: trip.id },
    );
    return admission ?? { trip, terms };
  }
  if (command.operation !== 'accept')
    return outcome(false, 'invalid-command', 'Choose a current cooperative reply.');
  const receiving = amendment
    ? amendment.proposedBy !== command.actorId &&
      command.amendmentRevision === amendment.revision &&
      world.simTime < amendment.expiresAt
    : trip.status === 'pending' && trip.recipientId === command.actorId;
  if (!receiving || (amendment && !cooperationTermsCurrent(world, amendment.terms)))
    return outcome(false, 'cooperation-changed', 'Choose the exact current proposal to accept.');
  const acceptedTerms = amendment?.terms ?? trip.terms;
  const acceptedTask = acceptedTerms.purpose === 'help' ? acceptedTerms.task : undefined;
  if (
    acceptedTask?.kind === 'prepare' &&
    !world.knowledge[acceptedTask.helperId]?.some(
      (record) =>
        record.recipeId === (acceptedTask.kind === 'prepare' ? acceptedTask.recipe.id : undefined),
    )
  )
    return outcome(
      false,
      'cooperation-unavailable',
      'This preparation cannot be accepted with the current method knowledge.',
    );
  if (
    acceptedTask?.kind === 'carry' &&
    !carryOfferCurrent(
      world,
      acceptedTask,
      participants(trip).find((id) => id !== acceptedTask.helperId)!,
      acceptedTask.helperId,
    )
  )
    return outcome(
      false,
      'cooperation-unavailable',
      'The exact offered object is no longer available for this proposal.',
    );
  if (acceptedTask?.kind === 'construction') {
    const grant = permissions.find(
      (p) => p.id === acceptedTask.grant.id && p.revision === acceptedTask.grant.revision,
    );
    if (!grant || !assemblyPermission(world, acceptedTask.helperId, acceptedTask.phase, [grant]))
      return outcome(
        false,
        'cooperation-unavailable',
        'The exact reviewed construction permission is no longer available.',
      );
  }
  return cooperationSlotProblem(world, participants(trip), trip.id) ?? { trip };
}
function cooperationNotice(
  world: WorldState,
  events: WorldEvent[],
  trip: CooperationEpisode,
  actorId: string,
  text: string,
  cause?: CooperationEndCause,
  sourceId?: string,
): void {
  const actor = entityGet(world.entities, actorId);
  if (!actor?.actor) return;
  const snapshot = {
    id: trip.id,
    revision: trip.revision,
    proposerId: trip.proposerId,
    recipientId: trip.recipientId,
    terms: personalCooperationTerms(trip.terms, actorId),
    status: cause ? 'ended' : trip.status,
    expiresAt: trip.expiresAt,
    ...(trip.endAt === undefined
      ? {}
      : { endAt: trip.endAt, acceptedRevision: trip.acceptedRevision }),
    ...(trip.pendingAmendment
      ? {
          amendment: {
            ...trip.pendingAmendment,
            terms: personalCooperationTerms(trip.pendingAmendment.terms, actorId),
          },
        }
      : {}),
    ...(cause ? { cause } : {}),
  };
  const data = {
    cooperationId: trip.id,
    agreement: canonicalJson(snapshot),
    semanticTrigger: true,
    importance: EXPERIENCE_LIMITS.protectedImportance,
  };
  const source = sourceId ? entityGet(world.entities, sourceId) : undefined;
  if (source && source.id !== actorId)
    emitPrivateObservation(world, events, 'cooperation', actor, text, source, actorId, data);
  else emit(world, events, 'cooperation', text, actor, undefined, data, 'private');
}
function closeCooperation(
  world: WorldState,
  events: WorldEvent[],
  trip: CooperationEpisode,
  cause: CooperationEndCause,
  actorId?: string,
): void {
  // Cancellation/detachment of chosen physical work is performed before deleting its consent.
  stopCooperationWork(world, trip);
  prepareOutingIndex(world);
  delete world.outings![trip.id];
  indexOuting(world, trip.id);
  for (const id of participants(trip)) {
    const inherent = cause === 'deadline-reached' || cause === 'expired-unanswered';
    const local =
      actorId &&
      !cooperationReceptionProblem(
        world,
        actorId,
        id === actorId ? (id === trip.proposerId ? trip.recipientId : trip.proposerId) : id,
      );
    if (id === actorId || inherent || local)
      cooperationNotice(
        world,
        events,
        trip,
        id,
        `Cooperative activity ended: ${cause}. Completed effects remain; no further work is promised.`,
        cause,
        actorId,
      );
  }
}
function executeCooperation(
  world: WorldState,
  command: OwnedCommand,
  trip: CooperationEpisode,
  events: WorldEvent[],
  permissions: NativeExecutionPermissions,
): Outcome {
  if (command.operation === 'work') {
    if (trip.terms.purpose !== 'help' || trip.terms.task.kind !== 'construction')
      return outcome(false, 'cooperation-work', 'Choose the agreed physical operation.');
    const id = nextId(world, 'cooperative-work'),
      phase = trip.terms.task.phase;
    const root = assemblyActivityCommand(
      command.actorId,
      id,
      trip.terms.task.label,
      phase.destination,
      [phase],
      () =>
        trip.terms.purpose === 'help' && trip.terms.task.kind === 'construction'
          ? trip.terms.task.label
          : 'Agreed work',
    );
    root.mode = command.mode;
    if (command.humanInitiated) root.humanInitiated = command.humanInitiated;
    if (command.chosenPurpose) root.chosenPurpose = cloneValue(command.chosenPurpose);
    root.cooperation = { id: trip.id, revision: trip.acceptedRevision! };
    const result = startRequestedActivity(world, command.actorId, id, root, permissions);
    if (result.ok)
      trip.ownedWork[command.actorId] = {
        planId: entityGet(world.entities, command.actorId)!.actor!.agency.plan!.id,
      };
    return result;
  }
  if (command.operation === 'propose') {
    trip.id = nextId(world, 'cooperation');
    prepareOutingIndex(world);
    (world.outings ??= {})[trip.id] = trip;
    indexOuting(world, trip.id, trip);
  } else if (command.operation === 'revise') {
    const prepared = prepareCooperation(world, command, permissions);
    if ('ok' in prepared) return prepared;
    trip.revision++;
    if (trip.status === 'pending') {
      trip.terms = prepared.terms!;
      const otherId = participants(trip).find((id) => id !== command.actorId)!;
      trip.proposerId = command.actorId;
      trip.recipientId = otherId;
      trip.createdAt = world.simTime;
      trip.expiresAt = world.simTime + world.socialOfferPolicy!.pendingSeconds;
    } else
      trip.pendingAmendment = {
        revision: trip.revision,
        proposedBy: command.actorId,
        terms: prepared.terms!,
        createdAt: world.simTime,
        expiresAt: world.simTime + world.socialOfferPolicy!.pendingSeconds,
      };
    prepareOutingIndex(world);
    indexOuting(world, trip.id, trip);
  } else if (command.operation === 'accept') {
    prepareOutingIndex(world);
    if (trip.pendingAmendment) {
      stopCooperationWork(world, trip);
      trip.terms = trip.pendingAmendment.terms;
      delete trip.pendingAmendment;
      trip.arrived = [];
    }
    if (trip.terms.purpose === 'help' && trip.terms.task.kind === 'prepare') {
      trip.prepared = 0;
      trip.reportedPrepared = 0;
    } else {
      delete trip.prepared;
      delete trip.reportedPrepared;
    }
    delete trip.carried;
    delete trip.constructionResult;
    trip.status = 'accepted';
    trip.acceptedAt = world.simTime;
    trip.acceptedRevision = trip.revision + 1;
    trip.endAt = world.simTime + world.socialOfferPolicy!.cooperation!.episodeSeconds;
    trip.revision++;
    indexOuting(world, trip.id, trip);
  } else if (['decline', 'withdraw', 'leave', 'conclude'].includes(command.operation)) {
    if (
      'amendmentRevision' in command &&
      command.amendmentRevision !== undefined &&
      trip.pendingAmendment?.revision === command.amendmentRevision &&
      ['decline', 'withdraw'].includes(command.operation)
    ) {
      prepareOutingIndex(world);
      delete trip.pendingAmendment;
      trip.revision++;
      indexOuting(world, trip.id, trip);
    } else {
      closeCooperation(
        world,
        events,
        trip,
        command.operation === 'decline'
          ? 'declined'
          : command.operation === 'conclude'
            ? 'concluded'
            : 'withdrawn',
        command.actorId,
      );
      return outcome(
        true,
        'cooperation-ended',
        'Your cooperative consent ended. Completed effects remain.',
      );
    }
  } else return outcome(false, 'invalid-command', 'Choose a cooperative command.');
  const announced =
    command.operation === 'revise' ? (trip.pendingAmendment?.terms ?? trip.terms) : trip.terms;
  if (
    (command.operation === 'propose' || command.operation === 'revise') &&
    announced.purpose === 'hunt'
  ) {
    const quarry = entityGet(world.entities, announced.quarry.id),
      point = quarry && supportedPosition(quarry);
    if (quarry && point)
      for (const id of participants(trip))
        if (
          seesEntity(world, entityGet(world.entities, id)!, quarry) &&
          subjectReferenceCurrent(
            world,
            id,
            quarry.id,
            trip.terms.purpose === 'hunt' ? trip.terms.quarry.encounters[id] : undefined,
          )
        )
          rememberSighting(world, id, quarry.id, point);
  }
  for (const id of participants(trip)) {
    if (
      (command.operation === 'withdraw' || command.operation === 'decline') &&
      id !== command.actorId &&
      cooperationReceptionProblem(world, command.actorId, id)
    )
      continue;
    cooperationNotice(
      world,
      events,
      trip,
      id,
      `${command.operation}: ${cooperationTermsLabel(world, trip.terms)}. ${world.socialOfferPolicy!.cooperation!.description}`,
      undefined,
      command.actorId,
    );
  }
  return outcome(
    true,
    'cooperation-recorded',
    'The exact cooperative terms were recorded. Each person chooses their own work.',
  );
}
function stopCooperationWork(world: WorldState, trip: CooperationEpisode): void {
  if (trip.acceptedRevision !== undefined)
    for (const actorId of participants(trip))
      stopCooperativeWork(world, actorId, { id: trip.id, revision: trip.acceptedRevision });
  trip.ownedWork = {};
}
function reconcileCooperation(
  world: WorldState,
  events: WorldEvent[],
  trip: CooperationEpisode,
): void {
  countDomainWork('outingChecked');
  if (!cooperationCurrent(world, trip)) {
    closeCooperation(world, events, trip, 'unavailable');
    return;
  }
  if (trip.status === 'pending') {
    if (world.simTime >= trip.expiresAt)
      closeCooperation(world, events, trip, 'expired-unanswered');
    return;
  }
  if (world.simTime >= trip.endAt!) {
    closeCooperation(world, events, trip, 'deadline-reached');
    return;
  }
  if (trip.pendingAmendment && world.simTime >= trip.pendingAmendment.expiresAt) {
    prepareOutingIndex(world);
    delete trip.pendingAmendment;
    trip.revision++;
    indexOuting(world, trip.id, trip);
    for (const id of participants(trip))
      cooperationNotice(
        world,
        events,
        trip,
        id,
        'The unanswered amendment expired. The accepted activity is unchanged.',
      );
  }
  for (const [id, owned] of Object.entries(trip.ownedWork)) {
    const actor = entityGet(world.entities, id)?.actor;
    if (
      owned.activityId !== undefined &&
      actor?.action &&
      actor.action.id !== owned.activityId &&
      actor.action.cooperation?.id !== trip.id
    ) {
      closeCooperation(world, events, trip, 'work-replaced', id);
      return;
    }
  }
  if (trip.terms.purpose === 'hunt') {
    const quarry = entityGet(world.entities, trip.terms.quarry.id)!;
    const point = supportedPosition(quarry);
    if (point)
      for (const id of participants(trip))
        if (
          seesEntity(world, entityGet(world.entities, id)!, quarry) &&
          subjectReferenceCurrent(
            world,
            id,
            quarry.id,
            trip.terms.purpose === 'hunt' ? trip.terms.quarry.encounters[id] : undefined,
          )
        )
          rememberSighting(world, id, quarry.id, point);
    return;
  }
  const terms = trip.terms;
  if (terms.purpose === 'help') {
    const task = terms.task;
    if (task.kind === 'construction') {
      if (trip.constructionResult)
        closeCooperation(world, events, trip, 'task-completed', task.helperId);
      return;
    }
    if (task.kind === 'carry') {
      if (trip.carried?.placed)
        closeCooperation(world, events, trip, 'task-completed', task.helperId);
      return;
    }
    if ((trip.prepared ?? 0) > (trip.reportedPrepared ?? 0) && (trip.prepared ?? 0) < task.quantity)
      cooperationNotice(
        world,
        events,
        trip,
        task.helperId,
        `You actually made ${trip.prepared} of the agreed ${task.quantity} ${task.outputLabel}.`,
      );
    trip.reportedPrepared = trip.prepared;
    if ((trip.prepared ?? 0) >= task.quantity)
      closeCooperation(world, events, trip, 'task-completed', task.helperId);
    return;
  }
  for (const id of participants(trip)) {
    if (trip.arrived.includes(id)) continue;
    const actor = entityGet(world.entities, id)!,
      p = worldPosition(actor),
      destination = terms.destination.point;
    if (
      worldSupport(actor) === destination.surfaceId &&
      Math.hypot(p.x - destination.x, p.y - destination.y, p.z - destination.z) <=
        world.socialOfferPolicy!.cooperation!.arrivalMetres
    ) {
      trip.arrived.push(id);
      cooperationNotice(
        world,
        events,
        trip,
        id,
        `You reached ${terms.destination.label}. This records only your own arrival.`,
      );
    }
  }
  if (trip.arrived.length === 2)
    closeCooperation(
      world,
      events,
      trip,
      'task-completed',
      cooperationReceptionProblem(world, trip.proposerId, trip.recipientId)
        ? undefined
        : trip.proposerId,
    );
}
function validateCooperation(
  world: WorldState,
  id: string,
  trip: CooperationEpisode,
  active: Set<string>,
): void {
  validateCooperationTerms(trip.terms);
  const actors = participants(trip),
    policy = world.socialOfferPolicy;
  const hunt = trip.terms.purpose === 'hunt' ? trip.terms.quarry : undefined;
  if (
    !hasRecordFields(
      trip,
      [
        'id',
        'revision',
        'kind',
        'proposerId',
        'recipientId',
        'definition',
        'lives',
        'terms',
        'status',
        'createdAt',
        'expiresAt',
        'ownedWork',
        'arrived',
      ],
      [
        'acceptedAt',
        'acceptedRevision',
        'endAt',
        'pendingAmendment',
        'prepared',
        'reportedPrepared',
        'carried',
        'constructionResult',
      ],
    ) ||
    id !== trip.id ||
    !isSafeRecordId(id) ||
    !Number.isSafeInteger(trip.revision) ||
    trip.revision < 1 ||
    trip.proposerId === trip.recipientId ||
    actors.some((id) => !isSafeRecordId(id) || !entityGet(world.entities, id)?.actor) ||
    !hasRecordFields(trip.definition, ['id', 'version']) ||
    !cooperationCurrent(world, trip) ||
    !trip.lives ||
    Object.keys(trip.lives).length !== 2 ||
    actors.some((id) => !Number.isSafeInteger(trip.lives[id]) || trip.lives[id]! < 0) ||
    !Number.isFinite(trip.createdAt) ||
    trip.createdAt < 0 ||
    !Number.isFinite(trip.expiresAt) ||
    trip.expiresAt !== trip.createdAt + policy!.pendingSeconds ||
    !['pending', 'accepted'].includes(trip.status) ||
    !trip.ownedWork ||
    Array.isArray(trip.ownedWork) ||
    Object.entries(trip.ownedWork).some(
      ([id, work]) =>
        !actors.includes(id) ||
        !hasRecordFields(work, [], ['planId', 'activityId']) ||
        (work.planId === undefined && work.activityId === undefined) ||
        (work.planId !== undefined && !isSafeRecordId(work.planId)) ||
        (work.activityId !== undefined && !isSafeRecordId(work.activityId)),
    ) ||
    (trip.terms.purpose === 'help' &&
      (!actors.includes(trip.terms.task.helperId) ||
        (trip.status === 'pending' &&
          trip.terms.task.helperId !==
            (trip.terms.task.kind === 'construction' ? trip.proposerId : trip.recipientId)))) ||
    (trip.status === 'accepted' &&
    trip.terms.purpose === 'help' &&
    trip.terms.task.kind === 'prepare'
      ? !Number.isSafeInteger(trip.prepared) ||
        trip.prepared! < 0 ||
        !Number.isSafeInteger(trip.reportedPrepared) ||
        trip.reportedPrepared! < 0 ||
        trip.reportedPrepared! > trip.prepared!
      : trip.prepared !== undefined || trip.reportedPrepared !== undefined) ||
    (trip.carried !== undefined &&
      (trip.status !== 'accepted' ||
        trip.terms.purpose !== 'help' ||
        trip.terms.task.kind !== 'carry' ||
        !hasRecordFields(trip.carried, ['itemId', 'revision', 'at', 'eventId'], ['placed']) ||
        trip.carried.itemId !== trip.terms.task.itemId ||
        !Number.isSafeInteger(trip.carried.revision) ||
        trip.carried.revision < trip.terms.task.itemRevision ||
        !Number.isFinite(trip.carried.at) ||
        trip.carried.at < trip.acceptedAt! ||
        !isSafeRecordId(trip.carried.eventId) ||
        (trip.carried.placed !== undefined && trip.carried.placed !== true))) ||
    (trip.constructionResult !== undefined &&
      (trip.status !== 'accepted' ||
        trip.terms.purpose !== 'help' ||
        trip.terms.task.kind !== 'construction' ||
        !hasRecordFields(trip.constructionResult, ['actorId', 'occurrenceId']) ||
        trip.constructionResult.actorId !== trip.terms.task.helperId ||
        !isSafeRecordId(trip.constructionResult.occurrenceId))) ||
    (hunt !== undefined &&
      (Object.keys(hunt.labels).length !== 2 ||
        Object.keys(hunt.encounters).length !== 2 ||
        actors.some(
          (id) => !Object.hasOwn(hunt.labels, id) || !Object.hasOwn(hunt.encounters, id),
        ))) ||
    !Array.isArray(trip.arrived) ||
    new Set(trip.arrived).size !== trip.arrived.length ||
    trip.arrived.some((id) => !actors.includes(id)) ||
    (trip.status === 'pending'
      ? trip.acceptedAt !== undefined ||
        trip.acceptedRevision !== undefined ||
        trip.endAt !== undefined ||
        trip.arrived.length > 0 ||
        Object.keys(trip.ownedWork).length > 0 ||
        trip.pendingAmendment !== undefined
      : !Number.isSafeInteger(trip.acceptedRevision) ||
        trip.acceptedRevision! > trip.revision ||
        trip.acceptedRevision! < 2 ||
        !Number.isFinite(trip.acceptedAt) ||
        trip.acceptedAt! < trip.createdAt ||
        trip.endAt !== trip.acceptedAt! + policy!.cooperation!.episodeSeconds)
  )
    throw new Error('Invalid current cooperative agreement.');
  if (trip.status === 'accepted')
    for (const actorId of actors) {
      const key = JSON.stringify(['cooperate', actorId]);
      if (active.has(key)) throw new Error('Duplicate accepted physical cooperation.');
      active.add(key);
    }
  const amendment = trip.pendingAmendment;
  if (amendment) {
    validateCooperationTerms(amendment.terms);
    if (
      !hasRecordFields(amendment, ['revision', 'proposedBy', 'terms', 'createdAt', 'expiresAt']) ||
      amendment.revision !== trip.revision ||
      !actors.includes(amendment.proposedBy) ||
      !Number.isFinite(amendment.createdAt) ||
      amendment.createdAt < trip.acceptedAt! ||
      amendment.expiresAt !== amendment.createdAt + policy!.pendingSeconds
    )
      throw new Error('Invalid cooperative amendment.');
  }
}

export function cooperationWorkProblem(
  world: WorldState,
  actorId: string,
  binding: CooperationPurposeBinding,
  command: {
    type: string;
    destination?: SurfacePoint;
    recipeId?: string;
    targetId?: string;
    itemId?: string;
    quantity?: number;
  },
): Outcome | undefined {
  const trip = world.outings?.[binding.id];
  if (
    trip?.kind !== 'cooperate' ||
    trip.status !== 'accepted' ||
    trip.acceptedRevision !== binding.revision ||
    !participants(trip).includes(actorId) ||
    world.simTime >= trip.endAt! ||
    !cooperationCurrent(world, trip)
  )
    return outcome(
      false,
      'cooperation-unavailable',
      'This chosen cooperative purpose is no longer available. Review it or choose separate work.',
    );
  if (
    command.type === 'compose' &&
    (trip.terms.purpose !== 'help' || trip.terms.task.helperId === actorId)
  )
    return;
  if (trip.terms.purpose === 'hunt') {
    if (['move', 'guard', 'evade'].includes(command.type)) return;
    if (
      ['strike', 'hunt', 'aim', 'shoot-once', 'follow'].includes(command.type) &&
      command.targetId === trip.terms.quarry.id &&
      subjectReferenceCurrent(
        world,
        actorId,
        trip.terms.quarry.id,
        trip.terms.quarry.encounters[actorId],
      )
    )
      return;
    return outcome(
      false,
      'cooperation-work',
      'Choose an ordinary action for the exact quarry or a personally chosen position.',
    );
  }
  if (trip.terms.purpose === 'help') {
    const task = trip.terms.task;
    if (task.helperId !== actorId)
      return outcome(
        false,
        'cooperation-work',
        'Only the named helper can choose this contribution.',
      );
    if (
      task.kind === 'construction' &&
      command.type === 'assemble' &&
      canonicalJson(nativeOperationFields(command as Command)) === canonicalJson(task.phase)
    )
      return;
    if (
      task.kind === 'prepare' &&
      ['craft', 'gather', 'move', 'equip', 'pickup'].includes(command.type)
    )
      // Chosen preparation may include supplies or tools. Only actual results of
      // the exact agreed method count toward the requested output quantity.
      return;
    if (task.kind === 'carry') {
      if (command.type === 'move') return;
      if (
        ['drop', 'transfer-item'].includes(command.type) &&
        command.itemId === task.itemId &&
        command.quantity === task.quantity &&
        trip.carried
      ) {
        const actor = entityGet(world.entities, actorId)!,
          point = worldPosition(actor),
          destination = task.destination.point;
        if (command.type === 'transfer-item' && command.targetId === task.destination.entityId)
          return;
        if (
          command.type === 'drop' &&
          worldSupport(actor) === destination.surfaceId &&
          Math.hypot(point.x - destination.x, point.y - destination.y, point.z - destination.z) <=
            world.socialOfferPolicy!.cooperation!.arrivalMetres
        )
          return;
        return outcome(
          false,
          'cooperation-place',
          'Reach the agreed destination before placing this object.',
        );
      }
    }
    return outcome(
      false,
      'cooperation-work',
      'Choose an ordinary supported action for these exact help terms.',
    );
  }
  if (
    command.type !== 'move' ||
    canonicalJson(command.destination) !== canonicalJson(trip.terms.destination.point)
  )
    return outcome(
      false,
      'cooperation-work',
      'Choose an ordinary supported action for the exact accepted purpose.',
    );
}
export function bindCooperationWork(
  world: WorldState,
  actorId: string,
  binding: CooperationPurposeBinding,
  activityId: string,
  commandId: string,
): void {
  const trip = world.outings?.[binding.id];
  if (trip?.kind !== 'cooperate') throw new Error('Missing admitted cooperative purpose.');
  const actor = entityGet(world.entities, actorId)!.actor!,
    plan = actor.agency.plan;
  const ownsPlan =
    !!plan &&
    (plan.activity?.cooperation?.id === binding.id ||
      plan.steps.some((step) => step.actionId === activityId || step.command.id === commandId));
  trip.ownedWork[actorId] = { activityId, ...(ownsPlan ? { planId: plan!.id } : {}) };
}
export function validateCooperationReference(
  world: WorldState,
  actorId: string,
  action: { cooperation?: CooperationPurposeBinding; type?: string; destination?: SurfacePoint },
): void {
  if (!action.cooperation) return;
  const trip = world.outings?.[action.cooperation.id];
  if (
    trip?.kind !== 'cooperate' ||
    trip.status !== 'accepted' ||
    trip.acceptedRevision !== action.cooperation.revision ||
    !participants(trip).includes(actorId)
  )
    throw new Error('Invalid live cooperative work reference.');
}

/** Latest exact personally received place reports; no live position or inventory read. */
export function personallyKnownPlaceReports(world: WorldState, actorId: string) {
  type Report = import('./experience.js').Awareness & {
    exposure: Extract<import('./places.js').EncounterExposure, { kind: 'place' }>;
  };
  const omitted = new Set(world.experience?.forgotten[actorId] ?? []),
    corrected = world.experience?.corrections?.[actorId],
    reports = new Map<string, Report>();
  for (const entry of world.experience?.awareness[actorId] ?? [])
    if (
      entry.exposure?.kind === 'place' &&
      !omitted.has(entry.eventId) &&
      !corrected?.[entry.eventId]
    )
      reports.set(entry.exposure.id, entry as Report);
  return [...reports.values()];
}

/** Only personally remembered stationary subjects are offered; live positions are never read. */
export function knownGuideDestinations(
  world: WorldState,
  actorId: string,
): Array<{ id: string; label: string }> {
  const actor = entityGet(world.entities, actorId)?.actor;
  const known = new Map<string, { id: string; label: string }>();
  for (const entry of personallyKnownPlaceReports(world, actorId))
    known.set(entry.exposure.id, { id: entry.exposure.id, label: entry.exposure.label });
  const inspection = currentInventoryInspection(world, actorId);
  if (inspection?.containerId) {
    const target = entityGet(world.entities, inspection.containerId),
      root = target && entityGet(world.entities, custodian(world, target.id));
    if (target?.container && root && !root.actor && supportedPosition(root))
      known.set(target.id, {
        id: target.id,
        label: observerDescription(world, actorId, target.id, 'definite'),
      });
  }
  for (const id of world.visibleObjects?.[actorId] ?? []) {
    const target = entityGet(world.entities, id);
    if (target && !target.actor && !target.retirement)
      known.set(id, { id, label: observerDescription(world, actorId, id, 'definite') });
  }
  for (const place of (actor?.agency.places ?? []).flatMap((place) => {
    const subject = entityGet(world.entities, place.subjectId);
    return subject && !subject.actor && !subject.retirement
      ? [{ id: place.subjectId, label: place.label }]
      : [];
  }))
    known.set(place.id, place);
  return [...known.values()];
}

function chosenCooperationTerms(
  world: WorldState,
  actorId: string,
  recipientId: string,
  proposal: CooperationProposal,
  permissions: readonly ConstructionPermission[],
  proposalId: string,
): CooperationEpisode['terms'] | undefined {
  if (!world.socialOfferPolicy?.cooperation?.families.includes(proposal.cooperationKind)) return;
  if (proposal.cooperationKind === 'guide')
    return chosenGuideTerms(world, actorId, proposal.destinationId);
  if (proposal.cooperationKind === 'hunt') {
    const quarry = entityGet(world.entities, proposal.quarryId),
      destination = chosenGuideTerms(world, actorId, proposal.destinationId);
    if (
      !quarry?.animal ||
      !quarry.actor?.alive ||
      destination?.purpose !== 'guide' ||
      [actorId, recipientId].some(
        (id) => !seesEntity(world, entityGet(world.entities, id)!, quarry),
      )
    )
      return;
    return {
      purpose: 'hunt',
      quarry: {
        id: quarry.id,
        life: quarry.actor.physicalLife ?? 0,
        labels: Object.fromEntries(
          [actorId, recipientId].map((id) => [
            id,
            observerDescription(world, id, quarry.id, 'definite'),
          ]),
        ),
        encounters: Object.fromEntries(
          [actorId, recipientId].map((id) => [
            id,
            world.perceptionEpisodes?.[id]?.[quarry.id] ?? null,
          ]),
        ),
      },
      meetingPlace: destination.destination,
    };
  }
  if (proposal.cooperationKind !== 'help') return;
  const task = proposal.task;
  if (task.kind === 'construction') {
    const compiled = compileAssemblyActivity(world, actorId, proposalId, task.plan, permissions);
    if ('ok' in compiled || compiled.type !== 'compose' || compiled.root.kind !== 'sequence')
      return;
    const node = compiled.root.children[0];
    if (node?.kind !== 'invoke') return;
    const bound = bindActivityCommand(
      node,
      { bindings: compiled.bindings, outputs: {} },
      actorId,
      'cooperation-phase',
    );
    if (bound?.type !== 'assemble') return;
    const phase = nativeOperationFields(bound),
      grant = assemblyPermission(world, actorId, phase, permissions),
      family = world.assemblyFamilies?.[phase.familyId];
    if (!grant || !family) return;
    return {
      purpose: 'help',
      task: {
        kind: 'construction',
        helperId: actorId,
        phase,
        family: definitionPin(family),
        grant: { id: grant.id, revision: grant.revision },
        label: assemblyPhaseLabel(world, phase),
      },
    };
  }

  if (task.kind === 'carry') {
    const offer = getOwn(world.itemOffers ?? {}, task.offerId);
    if (
      !offer ||
      offer.revision !== task.offerRevision ||
      offer.offererId !== actorId ||
      offer.recipientId !== recipientId ||
      offer.requested ||
      world.simTime >= offer.expiresAt
    )
      return;
    const destination = chosenGuideTerms(world, actorId, task.destinationId);
    if (destination?.purpose !== 'guide') return;
    const item = entityGet(world.entities, offer.offered.itemId)?.item;
    if (
      !item ||
      item.revision !== offer.offered.revision ||
      item.quantity !== offer.offered.quantity
    )
      return;
    return {
      purpose: 'help',
      task: {
        kind: 'carry',
        helperId: recipientId,
        offerId: offer.id,
        offerRevision: offer.revision,
        itemId: offer.offered.itemId,
        itemRevision: offer.offered.revision,
        definition: { ...offer.offered.definitionPin },
        quantity: offer.offered.quantity,
        itemLabel: observerDescription(world, actorId, offer.offered.itemId, 'definite'),
        destination: destination.destination,
      },
    };
  }
  const recipe = world.recipes[task.recipeId];
  if (
    !recipe ||
    !Number.isSafeInteger(task.quantity) ||
    task.quantity < 1 ||
    !world.knowledge[actorId]?.some((record) => record.recipeId === recipe.id)
  )
    return;
  const pin = recipeMechanicalPin(recipe);
  if (
    !world.socialOfferPolicy?.cooperation?.helpMethods?.some((allowed) =>
      sameDefinitionPin(allowed, pin),
    )
  )
    return;
  const output = recipe.outputs.find((output) => output.port === task.outputPort);
  if (!output) return;
  return {
    purpose: 'help',
    task: {
      kind: 'prepare',
      helperId: recipientId,
      recipe: pin,
      recipeLabel: recipe.name,
      outputLabel: world.itemDefinitions[output.definition.id]!.name,
      output: { port: output.port, definition: { ...output.definition } },
      quantity: task.quantity,
      unit: 'item-count',
    },
  };
}
export function recordCooperationOutcome(
  world: WorldState,
  actorId: string,
  occurrence: import('./action-experience.js').ActivityOccurrence,
): void {
  const binding = occurrence.cooperation;
  const trip = binding && world.outings?.[binding.id];
  if (
    trip?.kind === 'cooperate' &&
    trip.status === 'accepted' &&
    trip.acceptedRevision === binding!.revision &&
    trip.terms.purpose === 'help' &&
    trip.terms.task.kind === 'construction' &&
    trip.terms.task.helperId === actorId &&
    occurrence.command.type === 'assemble' &&
    occurrence.outcome?.ok &&
    canonicalJson(nativeOperationFields(occurrence.command)) ===
      canonicalJson(trip.terms.task.phase)
  ) {
    trip.constructionResult = { actorId, occurrenceId: occurrence.id };
    return;
  }
  if (
    trip?.kind !== 'cooperate' ||
    trip.status !== 'accepted' ||
    trip.acceptedRevision !== binding!.revision ||
    trip.terms.purpose !== 'help' ||
    trip.terms.task.kind !== 'prepare' ||
    trip.terms.task.helperId !== actorId ||
    !occurrence.outcome?.ok
  )
    return;
  const task = trip.terms.task;
  if (occurrence.command.type !== 'craft' || occurrence.command.recipeId !== task.recipe.id) return;
  const amount = occurrence.outputs
    .filter(
      (output) =>
        output.port === task.output.port && output.definitionId === task.output.definition.id,
    )
    .reduce((sum, output) => sum + output.quantity, 0);
  const prepared = (trip.prepared ?? 0) + amount;
  if (!Number.isSafeInteger(prepared))
    throw new Error('The actual cooperative output count exceeds exact numeric representation.');
  trip.prepared = prepared;
}

function carryOfferCurrent(
  world: WorldState,
  task: import('./cooperation.js').CarryTask,
  proposerId: string,
  recipientId: string,
): boolean {
  const offer = world.itemOffers?.[task.offerId];
  return (
    !!offer &&
    offer.revision === task.offerRevision &&
    offer.offererId === proposerId &&
    offer.recipientId === recipientId &&
    !offer.requested &&
    offer.expiresAt > world.simTime &&
    offer.offered.itemId === task.itemId &&
    offer.offered.revision === task.itemRevision &&
    offer.offered.quantity === task.quantity &&
    sameDefinitionPin(offer.offered.definitionPin, task.definition)
  );
}
/** Preserve the identity explicitly named by accepted carrying terms; this grants no custody. */
export function carryingOffer(
  world: WorldState,
  offer: import('./handover.js').ItemOffer,
): CooperationEpisode | undefined {
  const id = acceptedOutingId(world, offer.recipientId, 'cooperate'),
    trip = id && world.outings?.[id];
  if (
    !trip ||
    trip.kind !== 'cooperate' ||
    trip.status !== 'accepted' ||
    world.simTime >= trip.endAt! ||
    trip.terms.purpose !== 'help' ||
    trip.terms.task.kind !== 'carry' ||
    trip.carried ||
    !carryOfferCurrent(world, trip.terms.task, offer.offererId, offer.recipientId)
  )
    return;
  return trip;
}
export function recordCarryingCustody(
  world: WorldState,
  tripId: string,
  itemId: string,
  eventId: string,
): void {
  const trip = world.outings?.[tripId],
    item = entityGet(world.entities, itemId)?.item;
  if (
    trip?.kind !== 'cooperate' ||
    trip.terms.purpose !== 'help' ||
    trip.terms.task.kind !== 'carry' ||
    !item ||
    itemId !== trip.terms.task.itemId
  )
    throw new Error('The accepted carrying transfer lost its exact object.');
  trip.carried = { itemId, revision: item.revision, at: world.simTime, eventId };
}
export function recordCooperationPlacement(
  world: WorldState,
  command: Command,
  result: Outcome,
): void {
  const binding = command.cooperation,
    trip = binding && world.outings?.[binding.id];
  if (
    !result.ok ||
    !binding ||
    trip?.kind !== 'cooperate' ||
    trip.acceptedRevision !== binding.revision ||
    trip.terms.purpose !== 'help' ||
    trip.terms.task.kind !== 'carry' ||
    !trip.carried ||
    !['drop', 'transfer-item'].includes(command.type)
  )
    return;
  const task = trip.terms.task,
    item = entityGet(world.entities, task.itemId);
  if (!item?.item || item.item.quantity !== task.quantity) return;
  const destination = task.destination;
  const inContainer =
    item.placement?.mode === 'contained' && item.placement.parentEntityId === destination.entityId;
  const root = entityGet(world.entities, custodian(world, item.id));
  let atPoint = false;
  if (
    root &&
    !root.actor &&
    root.placement?.mode === 'world' &&
    worldSupport(root) === destination.point.surfaceId
  ) {
    const p = worldPosition(root);
    atPoint =
      Math.hypot(p.x - destination.point.x, p.y - destination.point.y, p.z - destination.point.z) <=
      world.socialOfferPolicy!.cooperation!.arrivalMetres;
  }
  if (inContainer || atPoint) trip.carried.placed = true;
}

export function cooperationConstructionGrant(
  world: WorldState,
  command: Command,
): { id: string; revision: number } | undefined {
  if (!command.cooperation) return;
  const trip = world.outings?.[command.cooperation.id];
  return trip?.kind === 'cooperate' &&
    trip.terms.purpose === 'help' &&
    trip.terms.task.kind === 'construction'
    ? trip.terms.task.grant
    : undefined;
}

function cooperationConstructionCommand(
  world: WorldState,
  trip: CooperationEpisode,
  actorId: string,
  id: string,
): Command {
  if (trip.terms.purpose !== 'help' || trip.terms.task.kind !== 'construction')
    throw new Error('Missing accepted construction phase.');
  return {
    id,
    actorId,
    type: 'assemble',
    ...cloneValue(trip.terms.task.phase),
    cooperation: { id: trip.id, revision: trip.acceptedRevision! },
  };
}
