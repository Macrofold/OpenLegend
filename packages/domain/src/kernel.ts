import { namePhrase } from '@open-legend/language';
import {
  ACTIVITY_LIMITS,
  beginActivity,
  endActivity,
  bindActivityAction,
  occurrenceFor,
  type ActivityOutput,
} from './action-experience.js';
import { nativeActivityView } from './worlds/base/action-views.js';
import {
  validateInstalledRecipe,
  recipeVisibleDependencies,
  recipeMechanicalPin,
} from './invention-families.js';
import { rangedApproachRange } from './worlds/base/actions.js';
import {
  executeHandover,
  prepareItemOffer,
  offerRecipientProblem,
  reconcileItemOffers,
} from './handover.js';
import {
  BASE_FIRE_CARE,
  completeFireCare,
  fireCareProblem,
  fireCareStartText,
  fireStockGuard,
  bindFireFuel,
  isFireCareCommand,
} from './worlds/base/fire.js';
import { isRecordedActivityCommand, recordActivityEffect } from './action-experience.js';
import {
  startLearnedActivity,
  startRequestedActivity,
  reconcileActivityControl,
  admitActivityAttempt,
} from './activity-execution.js';
import { transferStock, prepareStockTransfer } from './stock-transfer.js';
import { activityCommandSupported } from './activity-hosts.js';
import { isSpeechVolume } from './acoustics.js';
import { SIGHTING_POLICY } from './worlds/base/senses.js';
import {
  prepareExposure,
  perceptionEpisodeId,
  recentSightings,
  snapshotEncounters,
  type EncounterBaseline,
} from './encounter-cache.js';
import {
  copyCrossings,
  crossingCache,
  forgetCrossings,
  motionTravelBounds,
  nativeMotionInterval,
  reconcileCrossings,
  sensoryCrossingBound,
  type CrossingCache,
} from './motion-boundaries.js';
import { withStableAudience } from './event-audience.js';
import { stateChangeRevision } from './dependencies.js';
import {
  canAccessContainer,
  accessiblePossession,
  possessionItems,
  inventoryWorkReason,
} from './object-access.js';
import { advanceAppraisals } from './appraisals.js';
import {
  WorkBudgetError,
  meteredIterator,
  WORK_LIMITS,
  withWorkMeter,
  chargeWork,
  inWorkGroup,
} from './work-budget.js';
import { worldRootEntities } from './entity-index.js';
import {
  itemFor,
  equipLot,
  unequipLot,
  moveLot,
  splitLot,
  mergeLots,
  custodian,
} from './objects.js';
import { worldPosition, worldSupport } from './spatial-state.js';
import { activelyParticipates } from './participation-state.js';
import { advanceRemains } from './remains.js';
import { advanceAnimal, rememberAttack } from './worlds/base/animal-behavior.js';
import { actionTargetsCurrent } from './action-targets.js';
import { observerDescription, observerName } from './worlds/base/knowledge.js';
import { setBodyHealth } from './body-state.js';
import {
  ResourceReservationError,
  applyResourceGroup,
  availableItemQuantity,
  itemHasReservations,
  reconcileResourceReservations,
  releaseInvocationResources,
  availableResource,
  itemDefinitionPin,
  readResource,
  type ResourceOperation,
} from './resource-claims.js';
import { sameDefinitionPin } from './state-owners.js';
import {
  BASE_ACTION_DEFAULTS,
  BASE_FAMILY_FACTS,
  nativeMovementSpeed,
} from './worlds/base/actions.js';
import { nativeInterval, refineNativeInterval } from './temporal-boundaries.js';
import { TIME_EPSILON } from './simulation-time.js';
import { BASE_TIME_POLICY } from './worlds/base/time.js';
import {
  advanceCommitments,
  COMMITMENT_ADMISSION_LIMIT,
  unresolvedCommitmentCount,
} from './commitments.js';
import {
  canHandleItems,
  portableItems,
  pickUpItems,
  dropItems,
  dropItemReason,
  itemsForOwner,
} from './item-handling.js';
import { strikeDefinition } from './strikes.js';
import { inspectPossessions, inspectedContainer } from './inventory-inspection.js';
import { reconcileConditions } from './conditions.js';
import { gatheringYield } from './gathering.js';
import { FOLLOW_RULES, followState, updateFollowPath, followUnavailable } from './follow.js';
import { updateContactEpisodes } from './contact-acquisition.js';
import { confirmActionRevision } from './agency.js';
import { current, isDraft } from 'immer';
import {
  canWalkSegment,
  finitePoint,
  interpolate,
  MOVEMENT,
  SPATIAL_LIMITS,
  type RoutePlan,
  type NavigationRequest,
  type NavigationResult,
  type SurfacePoint,
} from '@open-legend/spatial';
import { bodyProfile, setSpatialPosition, spatialMap, supportedPosition } from './spatial-state.js';
import { advanceFlight, landingDue, LandingOccupancy } from './flight.js';
import {
  withdrawAttempt,
  replaceGoals,
  seedAgency,
  cancelPlan,
  discardSuspended,
  suspendCurrentWork,
  finishPlanAction,
  readyPlanStep,
  isActivityCommand,
  resolvePlanCommand,
} from './agency.js';
import {
  bodyPolicy,
  bodyNarration,
  applicableConsumption,
  canRecoverAtCamp,
} from './body-policy.js';
import { readState, stateAddress, writeState } from './state-owners.js';
import {
  attributeDefinition,
  definitionPin,
  readAttribute,
  advanceReservoirs,
} from './world-modules.js';
import { spatialCandidates, nearbyEntities } from './spatial.js';
import { reconcileConversations, changeConversation } from './conversations.js';
import {
  canSpeak,
  hasMemory,
  supportsManualWork,
  reconcileBody,
  commitBodyEffects,
} from './living.js';
import { draftWorld, cloneValue } from './draft.js';
import { countDomainWork } from './diagnostic-counters.js';
import { experiences } from './experience.js';
import {
  reconcileStatusEffects,
  prepareStatusRates,
  integrateStatusRates,
  applyBodyRate,
  crossStatusReferences,
  mayAdvanceStatusEffects,
  activateStatusEffect,
  canActivateStatusEffect,
  deactivateStatusEffect,
  interruptStatusEffects,
  capabilityBlocked,
  activeContributionId,
} from './status-effects.js';
import { isRecallableExperience } from './mind.js';
import { addItem, NATIVE_PREPARATIONS, nextId, nextRandom } from './data.js';
import { appendMemory, canonicalJson, emit, encounterEmitter, finish, outcome } from './events.js';
import { getOwn, isSafeRecordId } from './records.js';
import {
  hearsEntity,
  seesEntity,
  entityVisionQuery,
  visionRadius,
  visionQuery,
  sensesFor,
  contactViews,
  directProbe,
} from './perception.js';
import {
  distance,
  findPath,
  hasLineOfEffect,
  canReachEntity,
  findApproachPath,
  sameSurfacePoint,
  isWalkable,
} from './spatial.js';
import type {
  ActorComponent,
  Action,
  ActorObservation,
  Command,
  Entity,
  ItemInstance,
  MemoryRecord,
  Outcome,
  Position,
  Transition,
  WorldEvent,
  WorldState,
} from './types.js';

export const SIMULATION_RULES = {
  version: 3,
  maxAdvanceSeconds: 86400,
  ...BASE_ACTION_DEFAULTS,
} as const;

export function inventoryFor(world: WorldState, actorId: string): ItemInstance[] {
  return [...possessionItems(world, actorId)];
}
export function quantityOf(world: WorldState, actorId: string, definitionId: string): number {
  return inventoryFor(world, actorId)
    .filter((item) => item.definitionId === definitionId)
    .reduce((sum, item) => sum + item.quantity, 0);
}
function itemClaims(
  world: WorldState,
  actorId: string,
  definitionId: string,
  quantity: number,
): ResourceOperation[] | null {
  let remaining = quantity;
  const operations: ResourceOperation[] = [];
  const definition = world.itemDefinitions[definitionId];
  if (!definition || !Number.isSafeInteger(quantity) || quantity <= 0) return null;
  const pin = itemDefinitionPin(definition);
  for (const item of inventoryFor(world, actorId)
    .filter((item) => item.definitionId === definitionId)
    .sort((a, b) => a.id.localeCompare(b.id))) {
    const source = { kind: 'item', itemId: item.id, definition: pin } as const;
    const amount = Math.min(remaining, availableResource(world, source) ?? 0);
    if (amount <= 0) continue;
    operations.push({ source, sourceRevision: item.revision ?? 0, amount });
    remaining -= amount;
    if (remaining === 0) break;
  }
  return remaining === 0 ? operations : null;
}
function takeItem(
  world: WorldState,
  actorId: string,
  itemId: string,
  cause?: string,
): ItemInstance | null {
  const item = itemFor(world, itemId);
  if (!item || !accessiblePossession(world, actorId, item.id) || item.quantity < 1) return null;
  const taken = { ...item, quantity: 1 };
  const definition = world.itemDefinitions[item.definitionId];
  if (
    !definition ||
    applyResourceGroup(
      world,
      {
        invocationId: cause ?? world.entities[actorId]?.actor?.action?.id ?? `native:${actorId}`,
        fulfillment: 'all-or-nothing',
        operations: [
          {
            source: { kind: 'item', itemId, definition: itemDefinitionPin(definition) },
            sourceRevision: item.revision ?? 0,
            amount: 1,
          },
        ],
      },
      [],
    ).status !== 'applied'
  )
    return null;
  return taken;
}
function validId(value: unknown): value is string {
  return isSafeRecordId(value);
}
function validPosition(value: unknown): value is SurfacePoint {
  return finitePoint(value) && isSafeRecordId((value as SurfacePoint).surfaceId);
}
function visible(world: WorldState, actor: Entity, target: Entity): boolean {
  return seesEntity(world, actor, target);
}
function canCut(world: WorldState, actorId: string): boolean {
  return inventoryFor(world, actorId).some((item) =>
    world.itemDefinitions[item.definitionId]?.properties.includes('point'),
  );
}
export function ammoFor(
  world: WorldState,
  actorId: string,
  kind: string,
  requested?: string,
): ItemInstance | undefined {
  return inventoryFor(world, actorId).find(
    (item) =>
      (!requested || item.id === requested) &&
      availableItemQuantity(world, item.id) > 0 &&
      world.itemDefinitions[item.definitionId]?.ammunition?.kind === kind,
  );
}
function actionReach(world: WorldState, action: Action): number {
  if (action.type === 'pickup') return world.itemHandling.reach;
  if (action.type === 'strike') {
    const definition = strikeDefinition(action.definitionId, world, action.weaponItemId);
    return definition?.approachRange ?? definition?.range ?? 0;
  }
  if (action.type !== 'hunt') return SIMULATION_RULES.interactionRadius;
  const range =
    world.itemDefinitions[itemFor(world, action.weaponItemId ?? '')?.definitionId ?? '']?.launcher
      ?.range ?? 0;
  // Approach far enough that even the shortest admitted launcher can finish its
  // wind-up while a fleeing animal moves. Completion still rechecks actual range.
  return rangedApproachRange(range);
}
function targetPosition(world: WorldState, action: Action): Position | undefined {
  return action.type === 'move'
    ? action.destination
    : worldPosition(world.entities[action.targetId ?? action.heatId ?? '']);
}
function actionTarget(world: WorldState, action: Action): Entity | undefined {
  return world.entities[action.targetId ?? action.heatId ?? ''];
}
function actionInReach(
  world: WorldState,
  actor: Entity,
  action: Action,
  origin = worldPosition(actor),
): boolean {
  // A route in progress ends at its last point, not wherever a slice happens to stop inside
  // the tolerance, so arrival does not depend on how elapsed time was divided.
  if (action.type === 'move')
    return (
      !!action.destination &&
      !action.path.length &&
      worldSupport(actor) === action.destination.surfaceId &&
      distance(origin, action.destination) <= MOVEMENT.arrivalTolerance
    );
  const target = actionTarget(world, action);
  return !!target && canReachEntity(world, actor, target, actionReach(world, action), origin);
}
function approachPath(world: WorldState, actor: Entity, action: Action): RoutePlan | null {
  if (!supportedPosition(actor)) return null;
  const destination = targetPosition(world, action);
  if (!destination) return null;
  if (visionRadius(world, actor) === 0) {
    const path = directProbe(
      world,
      worldPosition(actor),
      destination,
      worldSupport(actor)!,
      action.type === 'move'
        ? action.destination!.surfaceId
        : (worldSupport(actionTarget(world, action)) ?? undefined),
    );
    return path ? { status: 'reached', path, length: 0, expanded: 0 } : null;
  }
  return action.type === 'move'
    ? findPath(
        world,
        worldPosition(actor),
        action.destination!,
        worldSupport(actor)!,
        action.destination!.surfaceId,
        bodyProfile(actor),
      )
    : actionTarget(world, action)
      ? findApproachPath(world, actor, actionTarget(world, action)!, actionReach(world, action))
      : null;
}
function approach(world: WorldState, actor: Entity, action: Action): Outcome | null {
  if (!targetPosition(world, action))
    return outcome(false, 'missing-target', 'That target no longer exists.');
  if (actionInReach(world, actor, action)) return null;
  const path = approachPath(world, actor, action);
  if (!path)
    return outcome(false, 'unreachable', 'No supported route to a reachable stance was found.');
  if (path.status !== 'reached' && path.status !== 'pending')
    return outcome(false, path.status, 'No supported route was found.');
  action.stage = 'approaching';
  action.path = path.path;
  action.navigation = path.status === 'pending' ? { request: path.request } : undefined;
  return null;
}
/** Required navigation is a technical barrier, not an in-world wait. Stale requests do not
 * block time: the next native step reconciles them. Never include another actor's destination
 * in the public barrier indicator. docs/architecture.md#navigation-preparation
 */
export function navigationBlocked(world: WorldState, actorIds?: readonly string[]): boolean {
  const actors = actorIds ? actorIds.map((id) => world.entities[id]!) : worldRootEntities(world);
  return actors.some((entity) => {
    const request = entity.actor?.action?.navigation;
    if (
      !entity.actor?.alive ||
      !activelyParticipates(entity) ||
      entity.actor.incapacitated ||
      !request ||
      request.failure
    )
      return false;
    // Lost follow authority must reach native cancellation without waiting for an obsolete route.
    if (
      entity.actor.action?.type === 'follow' &&
      followUnavailable(world, entity, entity.actor.action)
    )
      return false;
    const body = bodyProfile(entity);
    return (
      request.request.geometryRevision === world.map.spatial.revision &&
      request.request.from.surfaceId === worldSupport(entity) &&
      distance(worldPosition(entity), request.request.from) < 1e-7 &&
      body.radius === request.request.body.radius &&
      body.height === request.request.body.height &&
      body.maxSlope === request.request.body.maxSlope
    );
  });
}

/** Route results are untrusted derived data. Only a matching current action may accept them;
 * preparation may finish while paused, but this transition never moves or consumes anything.
 * archive/07-technical-architecture/spatial-world-runtime.md#navigation-preparation
 */
export function completeNavigation(
  original: WorldState,
  actorId: string,
  actionId: string,
  request: NavigationRequest,
  result: NavigationResult,
): Transition {
  const source = original.entities[actorId],
    action = source?.actor?.action;
  const stale = (): Transition => ({
    world: original,
    events: [],
    outcome: outcome(false, 'stale-route', 'The route request is no longer current.'),
  });
  if (
    !source?.actor?.alive ||
    !activelyParticipates(source) ||
    source.actor.incapacitated ||
    !action ||
    action.id !== actionId ||
    !action.navigation ||
    canonicalJson(action.navigation.request) !== canonicalJson(request) ||
    request.geometryRevision !== original.map.spatial.revision ||
    worldSupport(source) !== request.from.surfaceId ||
    distance(worldPosition(source), request.from) > 1e-7
  )
    return stale();
  const profile = bodyProfile(source);
  if (
    profile.radius !== request.body.radius ||
    profile.height !== request.body.height ||
    profile.maxSlope !== request.body.maxSlope
  )
    return stale();
  let failure =
    result.status === 'reached'
      ? undefined
      : result.status === 'no-route'
        ? 'no supported route reaches that destination.'
        : result.status === 'unavailable'
          ? 'navigation preparation is unavailable; retry the action later.'
          : result.status === 'budget-exceeded'
            ? 'the route exceeds the current navigation budget.'
            : 'the proposed route does not fit this body or its supporting surfaces.';
  if (result.status === 'reached') {
    let previous = request.from;
    if (!Array.isArray(result.path) || result.path.length > SPATIAL_LIMITS.maxPathPoints)
      failure = 'navigation returned an invalid route.';
    for (const point of failure ? [] : result.path) {
      if (!finitePoint(point) || !canWalkSegment(spatialMap(original), previous, point, profile)) {
        failure = 'the prepared route became physically blocked.';
        break;
      }
      previous = point;
    }
    if (
      !request.destinations.some(
        (p) => p.surfaceId === previous.surfaceId && distance(p, previous) < 1e-6,
      )
    )
      failure = 'navigation returned only a partial route.';
  }
  const world = draftWorld(original),
    current = world.entities[actorId]!.actor!.action!;
  if (failure) current.navigation!.failure = failure;
  else {
    current.path = result.path.map((p) => ({ ...p }));
    delete current.navigation;
  }
  return finish(
    world,
    [],
    outcome(true, failure ? 'route-blocked' : 'route-ready', failure ?? 'Route ready.'),
  );
}

function materialRequirements(
  world: WorldState,
  action: Action,
): { definitionId: string; quantity: number }[] {
  if (action.type === 'prepare' && action.preparation) {
    const preparation = NATIVE_PREPARATIONS[action.preparation];
    return [{ definitionId: preparation.input, quantity: preparation.inputQuantity }];
  }
  if (action.type === 'craft') {
    const totals = new Map<string, number>();
    for (const input of world.recipes[action.recipeId ?? '']?.inputs ?? [])
      totals.set(input.definitionId, (totals.get(input.definitionId) ?? 0) + input.quantity);
    return [...totals].map(([definitionId, quantity]) => ({ definitionId, quantity }));
  }
  if (action.type === 'cook')
    return [{ definitionId: BASE_FAMILY_FACTS.cooking.input, quantity: 1 }];
  return [];
}
function workMaterials(
  world: WorldState,
  actor: Entity,
  action: Action,
): ResourceOperation[] | Outcome {
  const requirements = materialRequirements(world, action);
  const claims: ResourceOperation[] = [];
  for (const input of requirements) {
    const chosen =
      action.type === 'cook' && action.itemId ? itemFor(world, action.itemId) : undefined;
    const selected =
      action.type === 'cook'
        ? chosen &&
          chosen.definitionId === input.definitionId &&
          accessiblePossession(world, actor.id, chosen.id) &&
          availableItemQuantity(world, chosen.id) >= input.quantity
          ? [
              {
                source: {
                  kind: 'item' as const,
                  itemId: chosen.id,
                  definition: itemDefinitionPin(world.itemDefinitions[chosen.definitionId]!),
                },
                sourceRevision: chosen.revision ?? 0,
                amount: input.quantity,
              },
            ]
          : null
        : itemClaims(world, actor.id, input.definitionId, input.quantity);
    if (!selected)
      return outcome(
        false,
        'missing-material',
        `Need ${input.quantity} ${world.itemDefinitions[input.definitionId]?.name ?? input.definitionId}.`,
      );
    claims.push(...selected);
  }
  if (action.type === 'cook' && !world.entities[action.heatId ?? '']?.heat?.lit)
    return outcome(false, 'no-heat', 'Cooking requires a lit campfire.');
  if (action.type === 'tend-fire') {
    const problem = fireCareProblem(
      world,
      actor,
      world.entities[action.targetId ?? ''],
      action.fireOperation!,
      action.itemId,
      action.fireGuard,
      action.id,
    );
    if (problem) return outcome(false, problem.code, problem.message);
  }
  return claims;
}
function startWork(world: WorldState, actor: Entity, action: Action): Outcome | null {
  const requirements = materialRequirements(world, action);
  const selected = workMaterials(world, actor, action);
  if ('ok' in selected) return selected;
  const claims = selected;
  if (
    claims.length &&
    applyResourceGroup(
      world,
      { invocationId: action.id, fulfillment: 'all-or-nothing', operations: claims },
      [],
    ).status !== 'applied'
  )
    return outcome(false, 'missing-material', 'The required materials are no longer available.');
  const experience = occurrenceFor(world, actor.id, action.id);
  if (experience?.view.children?.[0])
    experience.view.children[0].result = 'Reached the required working distance.';
  if (experience && ['strike', 'hunt'].includes(action.type))
    (experience.view.children ??= []).push({
      name: action.type === 'hunt' ? 'Shoot once' : 'Attack once',
      facts: [],
    });
  action.consumed = requirements;
  action.stage = 'working';
  action.path = [];
  return null;
}

/** Shared admission for player intentions and native reservoir response. */
function prepareReplenishment(
  world: WorldState,
  actor: Entity,
  attributeId: string,
  targetId: string,
): Action | Outcome {
  const definition = attributeDefinition(world, attributeId);
  const target = getOwn(world.entities, targetId);
  const value = definition && readAttribute(actor.actor!, definition);
  if (!definition?.reservoir || definition.schema.kind !== 'number' || typeof value !== 'number')
    return outcome(false, 'not-applicable', 'That reservoir is not installed on this actor.');
  if (
    !target?.replenisher ||
    target.replenisher.attributeId !== definition.id ||
    target.replenisher.remaining <= 0
  )
    return outcome(false, 'depleted', 'No compatible replenishment supply remains.');
  if (!visible(world, actor, target))
    return outcome(false, 'not-visible', 'The source is not perceived.');
  if (value >= definition.schema.max)
    return outcome(false, 'full', 'The reservoir is already full.');
  const action: Action = {
    id: 'replenishment-admission',
    type: 'replenish',
    stage: 'working',
    path: [],
    remainingSeconds: definition.reservoir.workSeconds,
    totalSeconds: definition.reservoir.workSeconds,
    consumed: [],
  };
  action.targetId = target.id;
  action.attributeId = definition.id;
  action.definitionVersion = definition.version;
  action.resourceDefinition = definitionPin(definition);
  return action;
}

/** Read-only lifecycle, body and perception admission shared by execution and queued choices. */
function nativeActorProblem(world: WorldState, command: Command): Outcome | null {
  const reject = (code: string, message: string) => outcome(false, code, message);
  const source = getOwn(world.entities, command.actorId);
  if (!source?.actor) return reject('unknown-actor', 'That actor does not exist.');
  if (!activelyParticipates(source))
    return reject('inactive', 'Return to the world before acting.');
  if (
    source.actor.controller === 'player' &&
    command.type === 'strike' &&
    world.entities[command.targetId]?.actor?.controller === 'player'
  )
    return reject(
      'cooperative',
      'Harmful actions between human-controlled characters require an explicitly supported participation policy.',
    );
  const releaseSelf =
    command.type === 'status-effect' &&
    command.operation === 'deactivate' &&
    command.targetId === source.id;
  if (
    capabilityBlocked(world, source, 'actions') &&
    !releaseSelf &&
    !['cancel', 'recover'].includes(command.type)
  )
    return reject('capability-restricted', 'This actor cannot act in its current state.');
  if (command.type === 'say' && capabilityBlocked(world, source, 'speech'))
    return reject('capability-restricted', 'Speech is unavailable.');
  if (command.type === 'move' && capabilityBlocked(world, source, 'locomotion'))
    return reject('capability-restricted', 'Movement is unavailable.');
  if (world.paused && command.type !== 'cancel') return reject('paused', 'The world is paused.');
  if ((!source.actor.alive || source.actor.incapacitated) && command.type !== 'recover')
    return reject('not-alive', 'This actor cannot act.');
  if (
    (['gather', 'prepare', 'craft', 'equip', 'hunt', 'harvest', 'cook', 'strike'].includes(
      command.type,
    ) ||
      command.type === 'tend-fire') &&
    !supportsManualWork(source)
  )
    return reject(
      'unsupported-body',
      'This native manual-work family requires a supported biped body.',
    );
  if (worldSupport(source) === null && !['say', 'teach', 'goal', 'cancel'].includes(command.type))
    return reject(
      'unsupported-airborne-action',
      'This native action requires a supported ground stance.',
    );
  // Scope comes before live resource/lifecycle diagnostics, including deferred plan dispatch.
  // docs/architecture.md#actor-agency-foundation
  const scopedTargetId =
    command.type === 'cook'
      ? command.heatId
      : (['gather', 'harvest', 'hunt', 'replenish', 'strike', 'pickup', 'follow'].includes(
            command.type,
          ) ||
            command.type === 'tend-fire') &&
          'targetId' in command
        ? command.targetId
        : undefined;
  if (scopedTargetId) {
    const target = getOwn(world.entities, scopedTargetId);
    if (!target || !visible(world, source, target))
      return reject('not-visible', 'The action target is not currently perceived.');
  }
  if (
    isRecordedActivityCommand(command) &&
    world.actionExperience.admitted >= ACTIVITY_LIMITS.retainedRecords
  )
    return reject(
      'experience-capacity',
      'The action-record allowance is full. Existing work and history are preserved; new recorded actions need more storage allowance.',
    );
  return null;
}

/** Current first-step feasibility. It reads authority and resources, and builds only a
 * temporary route/action description; no effects, randomness, receipts or drafts run here.
 * Later typed plan outputs remain future requirements. docs/projects/parallel-batch-01-playable-week-tech-design.md#admission-before-execution
 */
export function nativeOperationAvailable(world: WorldState, command: Command): Outcome {
  const nested = inWorkGroup();
  try {
    return withWorkMeter(WORK_LIMITS.group, () => {
      chargeWork({ inputBytes: (JSON.stringify(command)?.length ?? 0) * 3 });
      const prepared = prepareNativeOperation(world, command);
      return 'ok' in prepared
        ? prepared
        : outcome(
            true,
            'available',
            'Current prerequisites are available; execution rechecks them.',
          );
    });
  } catch (error) {
    if (!(error instanceof WorkBudgetError || error instanceof ResourceReservationError) || nested)
      throw error;
    return outcome(false, error.code, error.message);
  }
}
function prepareNativeOperation(
  world: WorldState,
  command: Command,
  options: { executing?: boolean } = {},
): Action | Outcome {
  const reject = (code: string, message: string) => outcome(false, code, message);
  if (!isActivityCommand(command))
    return reject('invalid-plan', 'Only supported native physical work can be queued.');
  const problem = nativeActorProblem(world, command);
  if (problem) return problem;
  const actor = world.entities[command.actorId]!;
  const source = actor;
  const component = actor.actor!;
  let action: Action | undefined;
  const temporary = (type: Action['type'], seconds: number): Action => ({
    id: command.id,
    type,
    stage: 'working',
    path: [],
    remainingSeconds: seconds,
    totalSeconds: seconds,
    consumed: [],
  });
  switch (command.type) {
    case 'say': {
      if (!canSpeak(actor)) return reject('no-speech', 'This actor cannot speak.');
      if (!isSpeechVolume(command.volume ?? 'normal'))
        return reject('invalid-volume', 'Choose whisper, normal or shout.');
      const recipient = command.targetId ?? command.intendedRecipientId;
      if (recipient && !getOwn(world.entities, recipient))
        return reject('invalid-recipient', 'The intended recipient no longer exists.');
      const target = command.targetId ? getOwn(world.entities, command.targetId) : undefined;
      if (
        command.targetId &&
        (!target?.actor?.alive ||
          !hasMemory(target) ||
          capabilityBlocked(world, target, 'perception') ||
          target.actor.incapacitated)
      )
        return reject('not-heard', 'The intended listener is unavailable.');
      break;
    }
    case 'pickup': {
      const target = getOwn(world.entities, command.targetId);
      if (!canHandleItems(world, source) || target?.kind !== 'item-pile')
        return reject('unavailable', 'Choose a visible pile and an actor able to handle items.');
      const stack = command.itemId
        ? portableItems(world, target.id).find((item) => item.id === command.itemId)
        : undefined;
      if (
        !portableItems(world, target.id).some(
          (item) => !command.itemId || item.id === command.itemId,
        )
      )
        return reject('empty', 'No matching portable items remain.');
      if (command.quantity !== undefined) {
        if (
          !stack ||
          !Number.isSafeInteger(command.quantity) ||
          command.quantity < 1 ||
          command.quantity > stack.quantity
        )
          return reject('unavailable', `Only ${stack?.quantity ?? 0} are in that stack.`);
        if (
          command.quantity < stack.quantity &&
          (world.entities[stack.id]?.container || stack.individuality === 'individual')
        )
          return reject('indivisible', 'That item cannot be divided; pick up the whole of it.');
      }
      if (
        capabilityBlocked(world, source, 'locomotion') &&
        !canReachEntity(world, source, target, world.itemHandling.reach)
      )
        return reject('capability-restricted', 'Movement is required to reach this pile.');

      action = temporary('pickup', world.itemHandling.pickupSeconds);
      action.targetId = command.targetId;
      action.itemId = command.itemId;
      if (command.quantity !== undefined) action.quantity = command.quantity;
      break;
    }
    case 'follow': {
      const desiredDistance = command.distance ?? FOLLOW_RULES.defaultDistance;
      if (
        command.targetId === actor.id ||
        !Number.isFinite(desiredDistance) ||
        desiredDistance < FOLLOW_RULES.minimumDistance ||
        desiredDistance > FOLLOW_RULES.maximumDistance
      )
        return reject(
          'invalid-follow',
          'Choose another perceived actor and a following distance between 1.5 and 12 world units.',
        );
      if (command.until !== undefined && command.until <= world.simTime)
        return reject('invalid-follow', 'That stopping time has already passed.');
      action = temporary('follow', 0);
      action.targetId = command.targetId;
      action.follow = followState(world, actor, command, desiredDistance);
      const error = updateFollowPath(world, actor, action, false);
      if (error) return reject('follow-unavailable', error);
      break;
    }
    case 'move': {
      if (
        visionRadius(world, actor) === 0 &&
        (!validPosition(command.destination) ||
          distance(worldPosition(actor), command.destination) > 1)
      )
        return reject(
          'unsupported-navigation',
          'Only a short direct probe is supported without vision.',
        );
      if (
        !validPosition(command.destination) ||
        !isWalkable(world, command.destination, command.destination.surfaceId, bodyProfile(actor))
      )
        return reject('blocked', 'Choose walkable ground.');
      action = temporary('move', 0);
      action.destination = { ...command.destination };
      break;
    }
    case 'strike': {
      const definition = strikeDefinition(command.definitionId, world, command.weaponItemId);
      const target = getOwn(world.entities, command.targetId);
      if (!definition) return reject('unknown-action', 'Choose a registered strike.');
      if ((component.attackReadyAt ?? 0) > world.simTime)
        return reject(
          'attack-recovery',
          'Finish recovering from the last swing before attacking again.',
        );
      if (
        command.weaponItemId &&
        (component.equippedItemId !== command.weaponItemId ||
          !accessiblePossession(world, actor.id, command.weaponItemId))
      )
        return reject('weapon-unavailable', 'Equip that exact accessible weapon first.');
      if (!target?.actor?.alive || target.id === actor.id)
        return reject('invalid-target', 'Choose another living actor.');
      if (!definition.autoMoveToRange && !canReachEntity(world, actor, target, definition.range))
        return reject('out-of-range', 'Move within strike range first.');
      action = temporary('strike', definition.workSeconds);
      action.definitionId = definition.id;
      action.definitionVersion = definition.version;
      action.targetId = target.id;
      if (command.weaponItemId) {
        action.weaponItemId = command.weaponItemId;
        action.strikePhase = 'windup';
      }
      break;
    }
    case 'gather': {
      const target = getOwn(world.entities, command.targetId);
      if (!target?.resource || target.resource.quantity < 1)
        return reject('depleted', 'There is nothing left to gather here.');
      if (!visible(world, actor, target))
        return reject('not-visible', 'Move close enough to see that resource.');
      if (command.itemId) {
        const tool = itemFor(world, command.itemId);
        if (
          component.equippedItemId !== command.itemId ||
          !accessiblePossession(world, actor.id, command.itemId) ||
          !tool ||
          world.itemDefinitions[tool.definitionId]?.gatheringTool?.resourceId !==
            target.resource.definitionId
        )
          return reject('tool-unavailable', 'Equip that exact compatible gathering tool first.');
      }
      action = temporary('gather', target.resource.workSeconds);
      action.targetId = target.id;
      action.itemId = command.itemId;
      break;
    }
    case 'prepare': {
      if (!getOwn(NATIVE_PREPARATIONS, command.preparation))
        return reject('unsupported', 'Unknown preparation.');
      const preparation = NATIVE_PREPARATIONS[command.preparation];
      if (quantityOf(world, actor.id, preparation.input) < preparation.inputQuantity)
        return reject(
          'missing-material',
          `Need ${preparation.inputQuantity} ${world.itemDefinitions[preparation.input]!.name}.`,
        );
      action = temporary('prepare', preparation.workSeconds);
      action.preparation = command.preparation;
      break;
    }
    case 'craft': {
      const recipe = getOwn(world.recipes, command.recipeId);
      if (!recipe) return reject('unknown-recipe', 'That technique has not been admitted.');
      if (!world.knowledge[actor.id]?.some((record) => record.recipeId === recipe.id))
        return reject('not-learned', 'This actor has not learned that technique.');
      try {
        validateInstalledRecipe(world, recipe);
      } catch {
        return reject(
          'stale-recipe',
          'This technique has changed or missing material prerequisites.',
        );
      }
      action = temporary('craft', recipe.workSeconds);
      action.recipeId = recipe.id;
      action.recipePin = recipeMechanicalPin(recipe);
      break;
    }
    case 'equip': {
      const item = itemFor(world, command.itemId);
      if (
        !item ||
        !accessiblePossession(world, actor.id, item.id) ||
        !(
          world.itemDefinitions[item.definitionId]?.launcher ||
          world.itemDefinitions[item.definitionId]?.melee ||
          world.itemDefinitions[item.definitionId]?.gatheringTool
        )
      )
        return reject('not-equippable', 'Choose a tool in this actor’s inventory.');
      if (itemHasReservations(world, item.id) || (options.executing && component.action))
        return reject('not-equippable', 'Choose a free tool in this inventory.');
      break;
    }
    case 'hunt': {
      if ((component.attackReadyAt ?? 0) > world.simTime)
        return reject(
          'attack-recovery',
          'Finish recovering from the last swing before attacking again.',
        );
      const target = getOwn(world.entities, command.targetId);
      if (!(target?.animal && target.actor?.alive))
        return reject('not-huntable', 'Choose a living animal.');
      if (!visible(world, actor, target))
        return reject('not-visible', 'The animal is out of sight.');
      const weaponItemId = command.weaponItemId ?? component.equippedItemId ?? '';
      const item = itemFor(world, weaponItemId);
      const launcher = item && world.itemDefinitions[item.definitionId]?.launcher;
      if (!item || !accessiblePossession(world, actor.id, item.id) || !launcher)
        return reject('no-weapon', 'Equip a suitable ranged tool first.');
      const ammo = ammoFor(world, actor.id, launcher.ammunitionKind, command.ammoItemId);
      if (!ammo)
        return reject('no-ammunition', `Need compatible ${launcher.ammunitionKind} ammunition.`);
      action = temporary('hunt', SIMULATION_RULES.shotSeconds);
      action.targetId = target.id;
      action.weaponItemId = item.id;
      action.ammoItemId = ammo.id;
      break;
    }
    case 'harvest': {
      const target = getOwn(world.entities, command.targetId);
      if (
        !target?.remains ||
        target.remains.phase !== 'fresh' ||
        target.remains.harvested ||
        !target.remains.yields.length
      )
        return reject('not-harvestable', 'There are no unharvested remains there.');
      if (!visible(world, actor, target))
        return reject('not-visible', 'Move within sight of the remains.');
      if (!canCut(world, actor.id))
        return reject('missing-tool', 'A cutting point is needed to prepare the remains.');
      action = temporary('harvest', SIMULATION_RULES.harvestSeconds);
      action.targetId = target.id;
      break;
    }
    case 'cook': {
      const item = itemFor(world, command.itemId);
      const heat = getOwn(world.entities, command.heatId);
      if (
        !item ||
        !accessiblePossession(world, actor.id, item.id) ||
        item.definitionId !== BASE_FAMILY_FACTS.cooking.input
      )
        return reject(
          'not-cookable',
          `Choose ${world.itemDefinitions[BASE_FAMILY_FACTS.cooking.input]?.name ?? 'something cookable'} in this actor’s inventory.`,
        );
      if (!heat?.heat?.lit || !visible(world, actor, heat))
        return reject('no-heat', 'A visible lit heat source is needed.');
      action = temporary('cook', SIMULATION_RULES.cookSeconds);
      action.itemId = item.id;
      action.heatId = heat.id;
      break;
    }
    case 'eat': {
      const consumption = applicableConsumption(world, actor);
      if (!consumption)
        return reject('not-applicable', 'This body has no applicable consumption service.');
      const item = itemFor(world, command.itemId);
      if (!item || !accessiblePossession(world, actor.id, item.id))
        return reject('not-edible', consumption.unavailableText);
      const definition = world.itemDefinitions[item.definitionId];
      const refusal = consumption.refusals.find((r) => r.itemType === item.definitionId);
      if (refusal) return reject('not-edible', refusal.reason);
      if (!definition || !Number.isFinite(definition.nutrition) || !(definition.nutrition! > 0))
        return reject('not-edible', consumption.unavailableText);
      const meter = attributeDefinition(world, consumption.attributeId)!;
      const address = stateAddress(actor.id, meter),
        before = readState(world, address, 'owner');
      if (
        before.status !== 'known' ||
        typeof before.value !== 'number' ||
        meter.schema.kind !== 'number'
      )
        return reject('not-applicable', consumption.unavailableText);
      if (availableItemQuantity(world, item.id) < 1)
        return reject('unavailable', consumption.unavailableText);
      break;
    }
    case 'transfer-stock': {
      if (!activityCommandSupported(world, command.type))
        return reject('unsupported-command', 'The chosen stock-transfer support is unavailable.');
      const prepared = prepareStockTransfer(world, actor.id, command, command.id);
      if (prepared.status !== 'ready') return reject(prepared.status, prepared.message);
      break;
    }
    case 'drop': {
      const reason = dropItemReason(world, actor, command.itemId, command.quantity);
      if (reason) return reject('cannot-drop', reason);
      break;
    }
    case 'replenish': {
      const prepared = prepareReplenishment(world, actor, command.attributeId, command.targetId);
      if ('ok' in prepared) return prepared;
      action = prepared;
      break;
    }
    case 'tend-fire': {
      if (!isFireCareCommand(command))
        return reject('invalid-command', 'Choose to light, fuel or put out a campfire.');
      const fire = getOwn(world.entities, command.targetId);
      const guard = fireStockGuard(command);
      const fuel = guard ? bindFireFuel(world, actor.id, guard, command.itemId) : undefined;
      const problem = fireCareProblem(
        world,
        actor,
        fire,
        command.operation,
        fuel?.id ?? command.itemId,
        guard,
      );
      if (problem?.code === 'no-longer-needed') {
        return { ...outcome(true, problem.code, problem.message), spent: 0 };
      }
      if (problem) return reject(problem.code, problem.message);
      action = temporary('tend-fire', BASE_FIRE_CARE[command.operation].workSeconds);
      action.targetId = fire!.id;
      action.fireOperation = command.operation;
      if (guard) action.fireGuard = guard;
      if (fuel?.id ?? command.itemId) action.itemId = fuel?.id ?? command.itemId;
      break;
    }
    case 'inspect-inventory': {
      try {
        inspectPossessions(
          world,
          actor.id,
          command.after,
          command.expectedRevision,
          command.containerId,
          command.expectedScope,
        );
      } catch (error) {
        return reject(
          'inspection-unavailable',
          error instanceof Error ? error.message : 'Inspection unavailable.',
        );
      }
      break;
    }
    case 'status-effect': {
      const target = getOwn(world.entities, command.targetId);
      const definition = world.statusEffectPolicy.definitions.find(
        (d) => d.id === command.definitionId,
      );
      if (
        !target ||
        !definition?.actions ||
        !['activate', 'deactivate'].includes(command.operation)
      )
        return reject('invalid-effect', 'Choose an available status effect and target.');
      if (
        target.id !== actor.id &&
        (!definition.actions.allowOther ||
          (command.operation === 'activate' && !definition.actions.activateOther) ||
          !visible(world, actor, target) ||
          !canReachEntity(world, actor, target, SIMULATION_RULES.interactionRadius))
      )
        return reject('out-of-reach', 'The target must be permitted, visible and within reach.');
      if (
        command.operation === 'activate' &&
        !canActivateStatusEffect(
          world,
          { subject: target, source: actor, actionTarget: target },
          definition,
        )
      )
        return reject('not-applicable', 'The status effect activation conditions are not met.');
      if (
        command.operation === 'deactivate' &&
        !(definition.contribution
          ? activeContributionId(target, definition.id, actor.id)
          : target.statusEffects?.[definition.id]?.active)
      )
        return reject('not-active', 'That status effect is not active.');
      break;
    }
    default:
      return reject('unsupported', 'This command is not supported.');
  }
  if (action) {
    if (action.type !== 'follow' && !['prepare', 'craft'].includes(action.type)) {
      const error = approach(world, actor, action);
      if (error) return error;
    }
    const materials = workMaterials(world, actor, action);
    if ('ok' in materials) return materials;
    if (
      component.action?.type === 'status-effect' &&
      !world.statusEffectPolicy.definitions
        .find((d) => d.id === component.action?.definitionId)
        ?.interruptOn.includes('new-action')
    )
      return reject(
        'cannot-interrupt',
        'The current state must end before starting another activity.',
      );
  }
  return (
    action ??
    outcome(true, 'available', 'Current prerequisites are available; execution rechecks them.')
  );
}

/** Accepted commands are idempotent by id+body. Rejections cause no physical effects. */
export function executeCommand(
  original: WorldState,
  command: Command,
  options: { preview?: boolean } = {},
): Transition {
  const nested = inWorkGroup();
  try {
    return withWorkMeter(WORK_LIMITS.group, () => {
      chargeWork({ inputBytes: (JSON.stringify(command)?.length ?? 0) * 3 });
      return executeCommandNative(original, command, options, !nested);
    });
  } catch (error) {
    if (!(error instanceof WorkBudgetError || error instanceof ResourceReservationError) || nested)
      throw error;
    return { world: original, events: [], outcome: outcome(false, error.code, error.message) };
  }
}

function executeCommandNative(
  original: WorldState,
  command: Command,
  options: { preview?: boolean },
  standalone: boolean,
): Transition {
  const reject = (code: string, message: string): Transition => ({
    world: original,
    events: [],
    outcome: outcome(false, code, message),
  });
  if (
    !command ||
    !validId(command.id) ||
    !validId(command.actorId) ||
    (command.purpose !== undefined &&
      (typeof command.purpose !== 'string' ||
        !command.purpose.trim() ||
        command.purpose.length > 120))
  )
    return reject('invalid-command', 'A command needs bounded actor and command IDs.');
  if (command.type === 'conversation')
    return changeConversation(
      original,
      command.id,
      command.actorId,
      command.operation,
      command.conversationId,
      command.generation,
    );
  const digest = canonicalJson(command);
  const receipt = getOwn(original.commandReceipts, command.id);
  if (receipt)
    return receipt.digest === digest
      ? { world: original, events: [], outcome: { ...receipt.outcome, code: 'duplicate' } }
      : reject('idempotency-conflict', 'This command ID was already used with another body.');
  const prepared = isActivityCommand(command)
    ? prepareNativeOperation(original, command, { executing: true })
    : nativeActorProblem(original, command);
  if (prepared && 'ok' in prepared && !prepared.ok)
    return { world: original, events: [], outcome: prepared };
  const action = prepared && !('ok' in prepared) ? prepared : undefined;
  let result = outcome(true, 'accepted', 'Action started.');
  // These scheduled families have no material admission after prepareNativeOperation.
  // Replenishment checks its source/meter/reach here; following prepares its route without
  // recording a sighting. Their remaining setup adds effects, not starting refusals.
  // Standalone previews reuse those exact current checks
  // before allocating IDs, recording experience or interrupting work in a throwaway draft.
  // Nested callers retain disposable execution: interruption events must still spend
  // their caller's work allowance. Other families retain later checks or remain unqualified.
  // docs/action-capabilities.md#action-availability-and-temporary-execution
  if (
    options.preview &&
    standalone &&
    action &&
    ['move', 'strike', 'gather', 'hunt', 'harvest', 'pickup', 'replenish', 'follow'].includes(
      action.type,
    )
  )
    return {
      world: original,
      events: [],
      outcome: result,
    };
  const source = getOwn(original.entities, command.actorId)!;
  if (options.preview && command.type === 'handover' && command.operation === 'offer') {
    const offer = prepareItemOffer(original, source, command);
    if ('ok' in offer) return { world: original, events: [], outcome: offer };
  }
  const world = draftWorld(original);
  const actor = world.entities[command.actorId]!;
  const component = actor.actor!;
  const events: WorldEvent[] = [];
  // A drop preview still checks the structural transfer, but never installs its action
  // record. Capacity admission above remains identical; other families retain bookkeeping.
  // docs/projects/parallel-batch-03-personal-game-tech-design.md#algorithm-boundary
  const experience =
    !(options.preview && command.type === 'drop') && isRecordedActivityCommand(command)
      ? beginActivity(
          world,
          command,
          command.id,
          nativeActivityView(original, command),
          component.agency.plan?.steps.some((step) => step.id === command.id)
            ? component.agency.plan.id
            : undefined,
        )
      : undefined;
  if (action) action.id = nextId(world, 'action');
  if (action?.type === 'follow') updateFollowPath(world, actor, action);
  if (
    experience &&
    (command.type === 'strike' || command.type === 'hunt') &&
    component.equippedItemId
  ) {
    const prior = [...(world.actionExperience.occurrences[actor.id] ?? [])]
      .reverse()
      .find(
        (entry) =>
          entry.command.type === 'equip' &&
          entry.command.itemId === component.equippedItemId &&
          entry.status === 'completed',
      );
    if (prior) experience.connections.push({ from: prior.id, relation: 'support' });
  }
  if (experience && command.type === 'harvest')
    experience.connections.push(
      ...(world.actionExperience.changes[command.targetId] ?? [])
        .filter((link) => link.actorId === actor.id)
        .slice(-1)
        .map((link) => ({
          from: link.occurrenceId,
          relation: 'material' as const,
          port: 'remains',
        })),
    );
  if (!action)
    switch (command.type) {
      case 'activity':
        if (command.interrupt && !command.resume) {
          const refused = suspendCurrentWork(world, actor.id);
          if (refused) return { world: original, events: [], outcome: refused };
        }
        result = startLearnedActivity(
          world,
          actor.id,
          command.id,
          command.methodId,
          command.bindings,
          command.resume,
        );
        if (!result.ok) return { world: original, events: [], outcome: result };
        break;
      case 'compose':
        result = startRequestedActivity(world, actor.id, command.id, command);
        if (!result.ok) return { world: original, events: [], outcome: result };
        break;
      case 'transfer-item':
      case 'split-item':
      case 'merge-item': {
        // Scope checks precede all hidden-item/capacity diagnostics. Fictional ownership
        // grants neither physical access nor another human's private contents.
        // Merge-target discovery mirrors these checks in object-access mergeTargetAvailable.
        const item = itemFor(world, command.itemId),
          destination = getOwn(world.entities, command.targetId);
        if (!canHandleItems(world, actor) || !item || !destination)
          return reject('unavailable', 'Choose an accessible item and destination.');
        try {
          // Another person's carried inventory changes hands only through their acceptance.
          // Scope checks run first, so the refusal cannot probe hidden items or people.
          // docs/worlds/base/items.md#shared-containers-and-active-work
          if (
            destination.actor &&
            destination.id !== actor.id &&
            canAccessContainer(world, actor.id, item.ownerId) &&
            !offerRecipientProblem(world, actor, destination)
          )
            return reject(
              'needs-acceptance',
              'Offer it to that person instead; it moves only if they accept.',
            );
          if (
            !canAccessContainer(world, actor.id, item.ownerId) ||
            !canAccessContainer(
              world,
              actor.id,
              command.type === 'merge-item'
                ? (itemFor(world, destination.id)?.ownerId ?? '')
                : destination.id,
            )
          )
            return reject('unavailable', 'Choose an accessible possession and destination.');
          const blocked =
            inventoryWorkReason(world, actor.id, item.id) ??
            (command.type === 'merge-item'
              ? inventoryWorkReason(world, actor.id, destination.id)
              : null);
          if (blocked) return reject('in-use', blocked);
          const targetRevision =
            command.type === 'merge-item'
              ? destination.item?.revision
              : (destination.inventoryRevision ?? 0);
          if (
            item.revision !== command.expectedRevision ||
            item.placementRevision !== command.placementRevision ||
            // Moving a bag retains the contents the player reviewed.
            (command.expectedContentsRevision !== undefined &&
              (world.entities[item.id]!.inventoryRevision ?? 0) !==
                command.expectedContentsRevision) ||
            targetRevision !== command.targetRevision
          )
            return reject('stale', 'The item or destination changed. Refresh before moving it.');
          if (world.itemDefinitions[item.definitionId]?.portable !== true)
            return reject('not-portable', 'This object cannot be moved by this action.');
          if (command.type === 'split-item' && destination.id !== item.ownerId)
            return reject('stale', 'Split into the current container.');
          if (command.type === 'merge-item' && command.quantity !== item.quantity)
            return reject('stale', 'Merge the complete selected lot.');
          const resultId =
            command.type === 'split-item'
              ? splitLot(world, item.id, command.quantity, command.id)
              : command.type === 'merge-item'
                ? mergeLots(world, item.id, destination.id, command.id)
                : moveLot(world, item.id, destination.id, command.quantity, command.id);
          result = { ...outcome(true, 'items-arranged', 'Possessions updated.'), itemId: resultId };
          emit(
            world,
            events,
            'items-arranged',
            `${namePhrase(actor, 'definite', { capitalize: true })} arranged some belongings.`,
            actor,
            undefined,
            undefined,
            'private',
          );
        } catch (error) {
          if (error instanceof WorkBudgetError) throw error;
          return reject(
            'item-unavailable',
            error instanceof Error ? error.message : 'Item transfer unavailable.',
          );
        }
        break;
      }
      case 'unequip': {
        const equipped = itemFor(world, command.itemId);
        if (
          !equipped ||
          component.equippedItemId !== equipped.id ||
          equipped.revision !== command.expectedRevision ||
          equipped.placementRevision !== command.placementRevision
        )
          return reject('stale', 'The selected equipment changed. Refresh before releasing it.');
        try {
          unequipLot(world, actor.id);
        } catch (error) {
          if (error instanceof WorkBudgetError) throw error;
          return reject(
            'item-unavailable',
            error instanceof Error ? error.message : 'Equipment unavailable.',
          );
        }
        result = outcome(true, 'unequipped', 'Equipment released.');
        break;
      }
      case 'transfer-stock': {
        if (!activityCommandSupported(world, command.type))
          return reject('unsupported-command', 'The chosen stock-transfer support is unavailable.');
        const moved = transferStock(world, actor.id, command, command.id);
        if (moved.status !== 'moved') return reject(moved.status, moved.message);
        const record = occurrenceFor(world, actor.id, command.id);
        if (record) record.stockResolution = moved.admitted;
        result = {
          ...outcome(
            true,
            'transferred',
            `Moved ${command.quantity} ${world.itemDefinitions[command.definitionId]!.name}; the chosen personal minimum was respected.`,
          ),
          outputs: moved.outputs.map(({ itemId, definitionId, quantity }) => ({
            port: definitionId,
            itemId,
            definitionId,
            quantity,
          })),
        };
        emit(
          world,
          events,
          'items-transferred',
          `${namePhrase(actor, 'definite', { capitalize: true })} moved selected supplies.`,
          actor,
          command.destinationId,
        );
        break;
      }
      case 'drop': {
        const reason = dropItems(world, actor, command.itemId, command.quantity, events);
        if (reason) return reject('cannot-drop', reason);
        result = outcome(true, 'dropped', 'Items dropped on the ground.');
        break;
      }
      case 'inspect-activities': {
        if (
          !Number.isSafeInteger(command.after) ||
          command.after < -1 ||
          (command.methodAfter !== undefined &&
            (!Number.isSafeInteger(command.methodAfter) ||
              command.methodAfter < 0 ||
              command.methodAfter > ACTIVITY_LIMITS.acquisitions))
        )
          return reject('invalid-page', 'Choose a valid action-history page.');
        const event = emit(
          world,
          events,
          'activity-history-requested',
          'I chose to inspect my own recorded actions and their results.',
          actor,
          undefined,
          { semanticTrigger: true, importance: 6 },
          'private',
        );
        const cursor = (world.actionExperience.learning[actor.id] ??= {
          after: null,
          pending: [],
          assessed: [],
        });
        cursor.inspection = {
          eventId: event.id,
          after: command.after,
          methodAfter: command.methodAfter ?? 0,
        };
        result = outcome(
          true,
          'history-requested',
          'Own action history selected for the next decision context.',
        );
        break;
      }
      case 'inspect-inventory': {
        try {
          const { page, ...cursor } = inspectPossessions(
            world,
            actor.id,
            command.after,
            command.expectedRevision,
            command.containerId,
            command.expectedScope,
          );
          component.inventoryInspection = cursor;
          const container = inspectedContainer(world, actor.id);
          const packing =
            container?.load !== undefined && container.capacity !== undefined
              ? ` Packing space: ${container.load} of ${container.capacity} units used; ${container.capacity - container.load} units free.`
              : '';
          emit(
            world,
            events,
            'inventory-inspected',
            `I inspect ${command.containerId ? `the accessible contents of ${observerDescription(world, actor.id, command.containerId, 'definite')}` : 'my accessible possessions'}:${packing} ${page.join(' ')}${cursor.more ? ' More items remain; I can explicitly inspect the next page.' : ' This is the last page.'}`,
            actor,
            undefined,
            { semanticTrigger: true, importance: 6 },
            'private',
          );
          result = outcome(true, 'inventory-inspected', 'Accessible contents inspected.');
        } catch (error) {
          return reject(
            'inspection-unavailable',
            error instanceof Error ? error.message : 'Inspection unavailable.',
          );
        }
        break;
      }
      case 'equip': {
        const item = itemFor(world, command.itemId);
        if (!item) return reject('not-equippable', 'Choose a tool in this actor’s inventory.');
        let equippedId: string;
        try {
          equippedId = equipLot(world, actor.id, item.id, command.id);
        } catch (error) {
          if (error instanceof WorkBudgetError) throw error;
          return reject(
            'not-equippable',
            error instanceof Error ? error.message : 'Equipment unavailable.',
          );
        }
        result = {
          ok: true,
          code: 'equipped',
          message: `Equipped ${namePhrase(world.itemDefinitions[item.definitionId]!, 'definite')}.`,
          itemId: equippedId,
        };
        emit(
          world,
          events,
          'equipped',
          `${namePhrase(actor, 'definite', { capitalize: true })} equipped ${namePhrase(world.itemDefinitions[item.definitionId]!, 'definite')}.`,
          actor,
        );
        break;
      }
      case 'handover': {
        const done = executeHandover(world, actor, command, events);
        if (!done.ok) return reject(done.code, done.message);
        result = done;
        break;
      }
      case 'eat': {
        const consumption = applicableConsumption(world, actor);
        if (!consumption)
          return reject('not-applicable', 'This body has no applicable consumption service.');
        const item = itemFor(world, command.itemId);
        if (!item || !accessiblePossession(world, actor.id, item.id))
          return reject('not-edible', consumption.unavailableText);
        const definition = world.itemDefinitions[item.definitionId];
        const refusal = consumption.refusals.find((r) => r.itemType === item.definitionId);
        if (refusal) return reject('not-edible', refusal.reason);
        if (!definition || !Number.isFinite(definition.nutrition) || !(definition.nutrition! > 0))
          return reject('not-edible', consumption.unavailableText);
        const meter = attributeDefinition(world, consumption.attributeId)!;
        const address = stateAddress(actor.id, meter),
          before = readState(world, address, 'owner');
        if (
          before.status !== 'known' ||
          typeof before.value !== 'number' ||
          meter.schema.kind !== 'number'
        )
          return reject('not-applicable', consumption.unavailableText);
        if (!takeItem(world, actor.id, item.id, command.id))
          return reject('unavailable', consumption.unavailableText);
        const after = Math.min(meter.schema.max, before.value + definition.nutrition!);
        const written = writeState(
          world,
          address,
          before.revision,
          { kind: 'replace', value: after },
          events,
          'consumption',
          'transition',
        );
        if (written.status !== 'applied' && written.status !== 'unchanged')
          return reject('not-applicable', consumption.unavailableText);
        recordActivityEffect(world, command.id, {
          subjectId: actor.id,
          label: 'Me',
          property: meter.id,
          before: before.value,
          after,
        });
        emit(
          world,
          events,
          'ate',
          bodyNarration(consumption.narration, actor, definition),
          actor,
          undefined,
          { definitionId: definition.id },
        );
        result = outcome(true, 'ate', consumption.successText);
        break;
      }
      case 'status-effect': {
        const target = getOwn(world.entities, command.targetId);
        const definition = world.statusEffectPolicy.definitions.find(
          (d) => d.id === command.definitionId,
        );
        if (
          !target ||
          !definition?.actions ||
          !['activate', 'deactivate'].includes(command.operation)
        )
          return reject('invalid-effect', 'Choose an available status effect and target.');
        if (
          target.id !== actor.id &&
          (!definition.actions.allowOther ||
            (command.operation === 'activate' && !definition.actions.activateOther) ||
            !visible(world, actor, target) ||
            !canReachEntity(world, actor, target, SIMULATION_RULES.interactionRadius))
        )
          return reject('out-of-reach', 'The target must be permitted, visible and within reach.');
        const effectActive = () =>
          !!(definition.contribution
            ? activeContributionId(target, definition.id, actor.id)
            : target.statusEffects?.[definition.id]?.active);
        const wasActive = effectActive();
        if (command.operation === 'activate') {
          if (
            !activateStatusEffect(
              world,
              definition,
              { subject: target, source: actor, actionTarget: target },
              events,
              'voluntary',
            )
          )
            return reject('not-applicable', 'The status effect activation conditions are not met.');
        } else {
          if (
            !(definition.contribution
              ? activeContributionId(target, definition.id, actor.id)
              : target.statusEffects?.[definition.id]?.active)
          )
            return reject('not-active', 'That status effect is not active.');
          deactivateStatusEffect(world, target, definition, events, 'voluntary', actor.id);
        }
        result = outcome(
          true,
          'status-effect',
          `${definition.label}: ${command.operation === 'activate' ? 'activated' : 'deactivated'}.`,
        );
        recordActivityEffect(world, command.id, {
          subjectId: target.id,
          label: observerDescription(world, actor.id, target.id),
          property: definition.label,
          before: wasActive,
          after: effectActive(),
        });
        break;
      }
      case 'confirm-attempt': {
        const alternative = component.agency.attempts.find(
          (attempt) => attempt.id === command.attemptId,
        )?.alternative;
        const first = alternative?.commands[0];
        if (first && alternative && alternative.mode !== 'enqueue') {
          // Disposable native admission, just like menu preview: no effects or RNG are published.
          const preview = executeCommand(original, {
            ...first,
            actorId: actor.id,
            id: `${command.id}:preview`,
          });
          if (!preview.outcome.ok) return reject(preview.outcome.code, preview.outcome.message);
        }
        result = confirmActionRevision(world, actor.id, command.attemptId, command.id);
        // A refused acceptance leaves no partially installed plan behind.
        if (!result.ok) return { world: original, events: [], outcome: result };
        break;
      }
      case 'withdraw-attempt': {
        result = withdrawAttempt(component, command.attemptId);
        break;
      }
      case 'tend-fire': {
        // Only an admitted observation skip reaches here; timed work uses the prepared action.
        if (!prepared || !('ok' in prepared) || prepared.code !== 'no-longer-needed')
          return reject('unsupported', 'This command is not supported.');
        result = { ...prepared, spent: 0 };
        break;
      }
      case 'cancel': {
        if (
          command.expectedActionId !== undefined &&
          component.action?.id !== command.expectedActionId
        )
          return reject('stale-action', 'That action has ended or been replaced.');
        interruptStatusEffects(world, actor, events, 'voluntary');
        if (component.action?.type === 'status-effect')
          return reject('cannot-interrupt', 'This state does not allow voluntary interruption.');
        if (component.action) {
          endActivity(
            world,
            actor.id,
            component.action.id,
            outcome(false, 'cancelled', 'Stopped by choice; already committed effects remain.'),
          );
          releaseInvocationResources(world, component.action.id);
        }
        cancelPlan(world, component);
        discardSuspended(world, component, actor.id);
        component.action = null;
        component.planGeneration++;
        result = outcome(
          true,
          'cancelled',
          'Stopped. Materials already used in work remain consumed.',
        );
        break;
      }
      case 'recover': {
        if (!canRecoverAtCamp(world, actor))
          return reject(
            'cannot-recover',
            bodyPolicy(world)?.recovery?.refusalText ??
              'This body has no available recovery service.',
          );
        const recovery = world.participationPolicy?.safeReturnAnchor;
        if (!recovery || !isWalkable(world, recovery, recovery.surfaceId, bodyProfile(actor)))
          return reject('return-unavailable', 'The configured recovery location is unavailable.');
        setSpatialPosition(world, actor, recovery, recovery.surfaceId);
        delete actor.spatial.flight;
        delete actor.spatial.fallVelocity;
        for (const floor of bodyPolicy(world)!.recovery!.floors) {
          const definition = attributeDefinition(world, floor.attributeId)!;
          const prior = readAttribute(component, definition);
          if (typeof prior !== 'number' || definition.schema.kind !== 'number')
            return reject('cannot-recover', bodyPolicy(world)!.recovery!.refusalText);
          const value = Math.max(prior, floor.value);
          if (definition.implementation === 'native-health-v1')
            setBodyHealth(
              component,
              (value - definition.schema.min) *
                (component.body!.maxHealth / (definition.schema.max - definition.schema.min)),
            );
          else {
            const read = readState(world, stateAddress(actor.id, definition), 'owner');
            if (read.status !== 'known')
              return reject('cannot-recover', bodyPolicy(world)!.recovery!.refusalText);
            const written = writeState(
              world,
              stateAddress(actor.id, definition),
              read.revision,
              { kind: 'replace', value },
              events,
              'recovery',
            );
            if (written.status !== 'applied' && written.status !== 'unchanged')
              return reject('cannot-recover', bodyPolicy(world)!.recovery!.refusalText);
          }
        }
        component.incapacitated = false;
        component.alive = true;
        interruptStatusEffects(world, actor, events, 'recovery');
        if (component.action) releaseInvocationResources(world, component.action.id);
        component.action = null;
        component.planGeneration++;
        reconcileBody(world, actor, events, 'camp-recovery');
        emit(
          world,
          events,
          'recovered',
          bodyNarration(bodyPolicy(world)!.recovery!.narration, actor),
          actor,
        );
        result = outcome(true, 'recovered', bodyPolicy(world)!.recovery!.successText);
        break;
      }
      case 'say': {
        if (!canSpeak(actor)) return reject('no-speech', 'This actor cannot speak.');
        if (
          typeof command.text !== 'string' ||
          command.text.trim().length < 1 ||
          command.text.length > 1500
        )
          return reject('invalid-speech', 'Speech must contain 1–1500 characters.');
        const volume = command.volume ?? 'normal';
        if (!isSpeechVolume(volume))
          return reject('invalid-volume', 'Choose whisper, normal or shout.');
        const target = command.targetId ? getOwn(world.entities, command.targetId) : undefined;
        const intendedRecipientId = command.targetId ?? command.intendedRecipientId;
        if (intendedRecipientId && !getOwn(world.entities, intendedRecipientId))
          return reject('invalid-recipient', 'The intended recipient no longer exists.');
        if (
          command.targetId &&
          (!target?.actor?.alive ||
            !hasMemory(target) ||
            capabilityBlocked(world, target, 'perception') ||
            target.actor.incapacitated)
        )
          return reject('not-heard', 'The intended listener is unavailable.');
        // Intention is not delivery: a quiet utterance can miss its target and still be overheard.
        // docs/hearing-and-speech.md#4-speech-volume-and-admission
        emit(
          world,
          events,
          'speech',
          `${namePhrase(actor, 'definite', { capitalize: true })}: ${command.text.trim()}`,
          actor,
          command.targetId,
          {
            text: command.text.trim(),
            ...(intendedRecipientId ? { intendedRecipientId } : {}),
            ...(command.selfIntroduction ? { selfIntroduction: command.selfIntroduction } : {}),
            utteranceId: command.id,
            volume,
            acousticPolicyId: world.moduleManifest.acoustics.id,
            acousticPolicyVersion: world.moduleManifest.acoustics.version,
            sourceLevelDbSplAt1m: world.moduleManifest.acoustics.sourceLevelDbSplAt1m[volume],
          },
        );
        result = outcome(true, 'spoken', 'Spoken.');
        break;
      }
      case 'goal': {
        if (typeof command.text !== 'string' || !command.text.trim() || command.text.length > 350)
          return reject('invalid-goal', 'Goal must contain 1–350 characters.');
        result = replaceGoals(
          component,
          [command.text.trim()],
          command.id,
          component.controller === 'player' ? 'player' : 'god',
        );
        if (!result.ok) return reject(result.code, result.message);
        break;
      }
      case 'teach': {
        if (!canSpeak(actor)) return reject('no-speech', 'This actor cannot teach through speech.');
        const target = getOwn(world.entities, command.targetId);
        const recipe = getOwn(world.recipes, command.recipeId);
        if (
          !target?.actor?.alive ||
          !hasMemory(target) ||
          target.actor.incapacitated ||
          !hearsEntity(world, target, actor)
        )
          return reject('not-heard', 'Teaching needs a nearby listener.');
        if (!recipe || !world.knowledge[actor.id]?.some((record) => record.recipeId === recipe.id))
          return reject('not-learned', 'You cannot teach a technique you do not know.');
        const knowledge = world.knowledge[target.id] ?? (world.knowledge[target.id] = []);
        if (!knowledge.some((record) => record.recipeId === recipe.id))
          knowledge.push({
            recipeId: recipe.id,
            learnedAt: world.simTime,
            source: 'taught',
            evidenceId: command.id,
          });
        emit(
          world,
          events,
          'taught',
          `${namePhrase(actor, 'definite', { capitalize: true })} taught the target how to make ${recipe.name.toLowerCase()}.`,
          actor,
          target.id,
          { recipeId: recipe.id, targetReference: true },
        );
        result = outcome(true, 'taught', 'The listener learned this specific technique.');
        break;
      }
      default:
        return reject('unsupported', 'This command is not supported.');
    }
  if (action) {
    if (experience) bindActivityAction(world, experience, action.id);
    if (action.stage === 'working' && action.type !== 'follow') {
      const error = startWork(world, actor, action);
      if (error) return { world: original, events: [], outcome: error };
    }
    interruptStatusEffects(world, actor, events, 'new-action');
    if (component.action?.type === 'status-effect')
      return reject(
        'cannot-interrupt',
        'The current state must end before starting another activity.',
      );
    // Scheduled-work previews stop after identical admission, before action-start events/receipts.
    // docs/architecture.md#bundled-world-and-item-custody
    if (options.preview) return { world: original, events: [], outcome: result };
    if (component.action && component.action.id !== action.id)
      endActivity(
        world,
        actor.id,
        component.action.id,
        outcome(false, 'cancelled', 'Replaced by newly chosen work; committed effects remain.'),
      );
    component.action = action;
    result = { ...result, actionId: action.id };
    if (experience && action.stage === 'approaching')
      experience.view.children = [
        {
          name: 'Move into reach',
          facts: experience.view.facts.filter(
            (fact) => fact.name === 'distance' || fact.name === 'approach',
          ),
        },
      ];
    component.planGeneration++;
    emit(
      world,
      events,
      'action-started',
      action.type === 'move' && action.destination
        ? `${namePhrase(actor, 'definite', { capitalize: true })} started moving to ${Number(action.destination.x.toFixed(1))}, ${Number(action.destination.z.toFixed(1))}.`
        : action.type === 'tend-fire'
          ? `${namePhrase(actor, 'definite', { capitalize: true })} ${fireCareStartText(action.fireOperation!, world.entities[action.targetId!] ?? 'fire')}.`
          : `${namePhrase(actor, 'definite', { capitalize: true })} started ${action.type === 'prepare' ? `preparing ${action.preparation}` : action.type === 'craft' ? `crafting ${world.recipes[action.recipeId!]!.name}` : action.type}.`,
      actor,
      action.targetId,
      { actionType: action.type },
    );
  }
  if (options.preview) return { world: original, events: [], outcome: result };
  if (!action && experience) endActivity(world, actor.id, command.id, result);
  world.commandReceipts[command.id] = { digest, outcome: result };
  reconcileConditions(world, actor, events);
  return finish(world, events, result);
}

function failAction(world: WorldState, actor: Entity, events: WorldEvent[], reason: string): void {
  // Selected stock guards contain private supply/minimum facts. Witnesses can
  // observe the stop, while only the actor receives its detailed reason.
  // docs/worlds/base/camp-routines.md#plain-descriptions
  const privateReason = !!actor.actor!.action?.fireGuard;
  if (actor.actor!.action)
    finishPlanAction(
      world,
      actor.id,
      actor.actor!.action!.id,
      outcome(false, 'action-failed', reason),
    );
  actor.actor!.action = null;
  if (privateReason) {
    emit(
      world,
      events,
      'action-stopped',
      `${namePhrase(actor, 'definite', { capitalize: true })} stopped the action.`,
      actor,
    );
    emit(
      world,
      events,
      'action-stopped-detail',
      `${namePhrase(actor, 'definite', { capitalize: true })} stopped: ${reason}`,
      actor,
      undefined,
      undefined,
      'private',
    );
  } else
    emit(
      world,
      events,
      'action-stopped',
      `${namePhrase(actor, 'definite', { capitalize: true })} stopped: ${reason}`,
      actor,
    );
}
function completeAction(
  world: WorldState,
  actor: Entity,
  action: Action,
  events: WorldEvent[],
): void {
  const component = actor.actor!;
  let outputItemId: string | undefined;
  let completion: string | undefined;
  const outputs: ActivityOutput[] = [];
  const produce = (definitionId: string, quantity: number): string => {
    const itemId = addItem(world, actor.id, definitionId, quantity);
    outputs.push({ port: definitionId, itemId, definitionId, quantity });
    return itemId;
  };
  switch (action.type) {
    case 'pickup': {
      const target = world.entities[action.targetId ?? ''];
      if (!target || !visible(world, actor, target) || !actionInReach(world, actor, action)) {
        failAction(world, actor, events, 'the pile is no longer visible or within reach.');
        return;
      }
      const moved = pickUpItems(world, actor, target.id, action.itemId, events, action.quantity);
      if (typeof moved === 'string') {
        failAction(world, actor, events, moved);
        return;
      }
      // One selected stack is a typed output a later step may bind (equip, eat, drop).
      if (moved.length === 1) {
        const [lot] = moved;
        outputItemId = lot!.itemId;
        outputs.push({ port: lot!.definitionId, ...lot! });
      }
      break;
    }
    case 'move':
      if (!action.destination || !actionInReach(world, actor, action)) {
        failAction(world, actor, events, 'the destination was not reached.');
        return;
      }
      emit(
        world,
        events,
        'moved',
        `${namePhrase(actor, 'definite', { capitalize: true })} moved to ${Number(worldPosition(actor).x.toFixed(1))}, ${Number(worldPosition(actor).z.toFixed(1))}.`,
        actor,
      );
      break;
    case 'replenish':
      emit(
        world,
        events,
        'replenished',
        `${namePhrase(actor, 'definite', { capitalize: true })} finished replenishing.`,
        actor,
        action.targetId,
        {
          attributeId: action.attributeId!,
          definitionVersion: action.definitionVersion!,
          transferred: action.transferred ?? 0,
        },
      );
      break;
    case 'gather': {
      const target = world.entities[action.targetId ?? ''];
      if (!target?.resource || target.resource.quantity <= 0) {
        failAction(world, actor, events, 'the resource is depleted.');
        return;
      }
      // Direct tool targeting binds one equipped lot; ordinary gathering uses carried tools.
      // Neither path multiplies finite supply.
      // docs/architecture.md#shared-invention-workflow
      const toolYield = gatheringYield(
        (action.itemId ? [itemFor(world, action.itemId)!] : inventoryFor(world, actor.id)).map(
          (item) => world.itemDefinitions[item.definitionId],
        ),
        target.resource.definitionId,
      );
      const source = {
        kind: 'gathering',
        entityId: target.id,
        definition: itemDefinitionPin(world.itemDefinitions[target.resource.definitionId]!),
      } as const;
      const quantity = Math.min(availableResource(world, source) ?? 0, toolYield);
      if (
        quantity <= 0 ||
        applyResourceGroup(
          world,
          {
            invocationId: action.id,
            fulfillment: 'all-or-nothing',
            operations: [
              {
                source,
                sourceRevision: target.resource.revision ?? 0,
                amount: quantity,
              },
            ],
          },
          events,
        ).status !== 'applied'
      ) {
        failAction(world, actor, events, 'the resource is no longer available.');
        return;
      }
      outputItemId = produce(target.resource.definitionId, quantity);
      emit(
        world,
        events,
        'gathered',
        `${namePhrase(actor, 'definite', { capitalize: true })} gathered ${quantity} ${world.itemDefinitions[target.resource.definitionId]!.name.toLowerCase()}.`,
        actor,
        target.id,
        { definitionId: target.resource.definitionId, quantity },
      );
      break;
    }
    case 'prepare': {
      const preparation = NATIVE_PREPARATIONS[action.preparation!];
      outputItemId = produce(preparation.output, preparation.outputQuantity);
      emit(
        world,
        events,
        'prepared',
        `${namePhrase(actor, 'definite', { capitalize: true })} prepared ${preparation.outputQuantity} ${world.itemDefinitions[preparation.output]!.name.toLowerCase()}.`,
        actor,
      );
      break;
    }
    case 'craft': {
      const recipe = world.recipes[action.recipeId!];
      if (!recipe) {
        failAction(world, actor, events, 'the pinned recipe is missing.');
        return;
      }
      try {
        validateInstalledRecipe(world, recipe);
        if (!action.recipePin || !sameDefinitionPin(action.recipePin, recipeMechanicalPin(recipe)))
          throw new Error('The manufacturing technique changed during work.');
      } catch {
        failAction(
          world,
          actor,
          events,
          'the technique has changed or missing material prerequisites.',
        );
        return;
      }
      const itemId = produce(recipe.outputDefinitionId, 1);
      outputItemId = itemId;
      emit(
        world,
        events,
        'crafted',
        `${namePhrase(actor, 'definite', { capitalize: true })} made ${namePhrase(world.itemDefinitions[recipe.outputDefinitionId]!, 'indefinite')}.`,
        actor,
        undefined,
        { recipeId: recipe.id, itemId },
      );
      break;
    }
    case 'strike': {
      if (action.weaponItemId) break; // Impact already committed; recovery completes the attempt.
      const definition = strikeDefinition(action.definitionId, world, action.weaponItemId);
      const target = world.entities[action.targetId ?? ''];
      // Admission is not a hit: recheck the pinned definition and live physical target.
      // docs/targeted-actions.md#targeted-strikes
      if (
        !definition ||
        definition.version !== action.definitionVersion ||
        !target?.actor?.alive ||
        target.id === actor.id ||
        !canReachEntity(world, actor, target, definition.range)
      ) {
        failAction(
          world,
          actor,
          events,
          'the strike target or definition is no longer valid/in range.',
        );
        return;
      }
      const before = target.actor.health;
      commitBodyEffects(
        world,
        target,
        [{ targetId: target.id, kind: 'injury', amount: definition.damage }],
        action.id,
        events,
      );
      const damage = before - target.actor.health;
      if (target.animal && target.actor.alive) {
        rememberAttack(world, target, actor);
      }
      emit(
        world,
        events,
        'struck',
        `${namePhrase(actor, 'definite', { capitalize: true })} ${definition.pastTense} the target for ${damage} damage.`,
        actor,
        target.id,
        { definitionId: definition.id, damage, actionId: action.id, targetReference: true },
      );
      break;
    }
    case 'hunt': {
      const target = world.entities[action.targetId ?? ''];
      const weapon = itemFor(world, action.weaponItemId ?? '');
      const launcher = weapon && world.itemDefinitions[weapon.definitionId]?.launcher;
      if (
        !(target?.animal && target.actor?.alive) ||
        !weapon ||
        !accessiblePossession(world, actor.id, weapon.id) ||
        !launcher
      ) {
        failAction(world, actor, events, 'the animal or ranged tool is no longer available.');
        return;
      }
      const ammunition = ammoFor(world, actor.id, launcher.ammunitionKind, action.ammoItemId);
      if (!ammunition) {
        failAction(world, actor, events, 'compatible ammunition is no longer available.');
        return;
      }
      if (!canReachEntity(world, actor, target, launcher.range)) {
        failAction(world, actor, events, 'the animal moved out of range.');
        return;
      }
      const bonus = world.itemDefinitions[ammunition.definitionId]!.ammunition!.damageBonus;
      if (!takeItem(world, actor.id, ammunition.id, action.id)) {
        failAction(world, actor, events, 'compatible ammunition is no longer available.');
        return;
      }
      const accuracy = launcher.accuracy * (target.animal.danger > 0 ? 0.85 : 1);
      const hit = nextRandom(world) < accuracy;
      action.strikeOutcome = hit ? 'hit' : 'miss';
      const damage = hit ? launcher.damage + bonus : 0;
      const actualDamage = Math.min(target.actor!.health, damage);
      rememberAttack(world, target, actor);
      emit(
        world,
        events,
        'shot',
        `${namePhrase(actor, 'definite', { capitalize: true })} ${hit ? `hit the target for ${actualDamage} damage` : 'missed the target'}. One projectile was used.`,
        actor,
        target.id,
        {
          hit,
          damage: actualDamage,
          ammunitionKind: launcher.ammunitionKind,
          actionId: action.id,
          targetReference: true,
        },
      );
      if (actualDamage > 0)
        commitBodyEffects(
          world,
          target,
          [{ targetId: target.id, kind: 'injury', amount: actualDamage }],
          action.id,
          events,
        );
      break;
    }
    case 'harvest': {
      const target = world.entities[action.targetId ?? ''];
      if (
        !target?.remains ||
        target.remains.phase !== 'fresh' ||
        target.remains.harvested ||
        !target.remains.yields.length ||
        !canCut(world, actor.id)
      ) {
        failAction(
          world,
          actor,
          events,
          'the remains were already harvested or the cutting tool is missing.',
        );
        return;
      }
      for (const yieldItem of target.remains.yields)
        produce(yieldItem.definitionId, yieldItem.quantity);
      target.remains.harvested = true;
      emit(
        world,
        events,
        'harvested',
        `${namePhrase(actor, 'definite', { capitalize: true })} harvested meat and bone from the remains.`,
        actor,
        target.id,
      );
      break;
    }
    case 'cook': {
      if (!world.entities[action.heatId ?? '']?.heat?.lit) {
        failAction(world, actor, events, 'the fire went out before cooking finished.');
        return;
      }
      outputItemId = produce(BASE_FAMILY_FACTS.cooking.output, 1);
      emit(
        world,
        events,
        'cooked',
        `${namePhrase(actor, 'definite', { capitalize: true })} cooked meat over the campfire.`,
        actor,
        action.heatId,
      );
      break;
    }
    case 'tend-fire': {
      const done = completeFireCare(
        world,
        actor,
        world.entities[action.targetId ?? ''],
        action.fireOperation!,
        action.id,
        events,
        action.itemId,
        action.fireGuard,
      );
      if (!done.ok) {
        failAction(world, actor, events, done.message);
        return;
      }
      finishPlanAction(world, actor.id, action.id, done);
      component.action = null;
      return;
    }
  }
  finishPlanAction(world, actor.id, action.id, {
    ...outcome(
      true,
      action.strikeOutcome ?? 'completed',
      action.strikeOutcome
        ? `The ${action.type === 'hunt' ? 'shot' : 'strike'} ${action.strikeOutcome === 'hit' ? 'hit' : 'missed'}; this one attempt has ended.`
        : (completion ?? `${action.type} completed.`),
    ),
    ...(outputItemId ? { itemId: outputItemId } : {}),
    ...(outputs.length ? { outputs } : {}),
  });
  component.action = null;
}

function moveAlongPath(
  world: WorldState,
  actor: Entity,
  path: SurfacePoint[],
  distanceBudget: number,
): boolean {
  let remaining = distanceBudget;
  const map = spatialMap(world),
    profile = bodyProfile(actor);
  while (path.length) {
    const point = path[0]!,
      start = supportedPosition(actor);
    if (!start) return false;
    const delta = distance(start, point);
    if (delta <= SPATIAL_LIMITS.epsilon) {
      if (!canWalkSegment(map, start, point, profile)) return false;
      setSpatialPosition(world, actor, point, point.surfaceId);
      path.shift();
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
    if (!canWalkSegment(map, start, next, profile)) return false;
    if (delta <= remaining) {
      setSpatialPosition(world, actor, point, point.surfaceId);
      path.shift();
      remaining -= delta;
    } else {
      setSpatialPosition(world, actor, next, start.surfaceId);
      remaining = 0;
    }
  }
  return true;
}
function advanceAction(
  world: WorldState,
  actor: Entity,
  seconds: number,
  events: WorldEvent[],
): void {
  const action = actor.actor!.action;
  if (!action) return;
  if (action.strikePhase === 'recovery') {
    action.remainingSeconds = Math.max(
      0,
      (actor.actor!.attackReadyAt ?? world.simTime) - world.simTime,
    );
    if (action.remainingSeconds === 0) completeAction(world, actor, action, events);
    return;
  }
  if (
    action.type === 'strike' &&
    actor.actor!.controller === 'player' &&
    world.entities[action.targetId ?? '']?.actor?.controller === 'player'
  ) {
    failAction(world, actor, events, 'human conflict is not enabled.');
    return;
  }
  // Follow judges its target only through perception and its loss policy; an unseen
  // target's participation must not leak through a different stop reason.
  if (
    action.targetId &&
    action.type !== 'follow' &&
    !activelyParticipates(world.entities[action.targetId])
  ) {
    failAction(world, actor, events, 'the target is no longer participating.');
    return;
  }
  // A changed body/policy must cancel pending pickup, not strand work or grant a transfer.
  // docs/worlds/base/items.md#pickup-and-drop
  if (
    action.type === 'pickup' &&
    (!canHandleItems(world, actor) ||
      !supportedPosition(actor) ||
      capabilityBlocked(world, actor, 'actions') ||
      (action.stage === 'approaching' && capabilityBlocked(world, actor, 'locomotion')))
  ) {
    failAction(world, actor, events, 'item handling or required movement is no longer available.');
    return;
  }
  if (
    action.type === 'strike' &&
    strikeDefinition(action.definitionId, world, action.weaponItemId)?.version !==
      action.definitionVersion
  ) {
    failAction(world, actor, events, 'the strike definition is unavailable or changed.');
    return;
  }
  if (
    action.weaponItemId &&
    action.type === 'strike' &&
    (actor.actor!.equippedItemId !== action.weaponItemId ||
      !accessiblePossession(world, actor.id, action.weaponItemId) ||
      capabilityBlocked(world, actor, 'actions') ||
      !world.entities[action.targetId!]?.actor?.alive ||
      !visible(world, actor, world.entities[action.targetId!]!))
  ) {
    failAction(
      world,
      actor,
      events,
      'the weapon, capability or perceived target is no longer available.',
    );
    return;
  }
  if (action.type === 'gather' && action.itemId) {
    const tool = itemFor(world, action.itemId);
    if (
      actor.actor!.equippedItemId !== action.itemId ||
      !accessiblePossession(world, actor.id, action.itemId) ||
      !tool ||
      world.itemDefinitions[tool.definitionId]?.gatheringTool?.resourceId !==
        world.entities[action.targetId!]?.resource?.definitionId
    ) {
      failAction(world, actor, events, 'the equipped gathering tool is no longer available.');
      return;
    }
  }
  if (action.type === 'follow') {
    if (action.follow?.until !== undefined && world.simTime >= action.follow.until) {
      completeAction(world, actor, action, events);
      return;
    }
    if (
      capabilityBlocked(world, actor, 'actions') ||
      capabilityBlocked(world, actor, 'locomotion')
    ) {
      failAction(world, actor, events, 'following is no longer available to this body.');
      return;
    }
    const wasApproaching = action.stage === 'approaching';
    const error = updateFollowPath(world, actor, action);
    if (error) {
      failAction(world, actor, events, error);
      return;
    }
    if (
      wasApproaching &&
      action.stage === 'approaching' &&
      !action.navigation &&
      !moveAlongPath(world, actor, action.path, nativeMovementSpeed(actor) * seconds)
    )
      failAction(world, actor, events, 'the following route became physically blocked.');
    return; // Holding is still an active activity, never a completed arrival.
  }
  if (action.stage === 'approaching') {
    if (action.navigation?.failure) {
      failAction(world, actor, events, action.navigation.failure);
      return;
    }
    if (action.navigation) {
      const requested = action.navigation.request;
      const profile = bodyProfile(actor);
      if (
        requested.geometryRevision === world.map.spatial.revision &&
        requested.body.radius === profile.radius &&
        requested.body.height === profile.height &&
        requested.body.maxSlope === profile.maxSlope &&
        requested.from.surfaceId === worldSupport(actor) &&
        distance(requested.from, worldPosition(actor)) < 1e-7
      )
        return;
      delete action.navigation;
    }
    const destination = targetPosition(world, action);
    if (!destination) {
      failAction(world, actor, events, 'the target disappeared.');
      return;
    }
    if (
      ['hunt', 'strike'].includes(action.type) &&
      !world.entities[action.targetId ?? '']?.actor?.alive
    ) {
      failAction(world, actor, events, 'the target is no longer alive.');
      return;
    }
    if (seconds === 0 && !moveAlongPath(world, actor, action.path, 0)) action.path = [];
    if (!actionInReach(world, actor, action)) {
      const last = action.path.at(-1);
      const endpointUseful =
        last &&
        (action.type === 'move'
          ? last.surfaceId === action.destination!.surfaceId &&
            distance(last, action.destination!) <= MOVEMENT.arrivalTolerance
          : canReachEntity(
              world,
              actor,
              actionTarget(world, action)!,
              actionReach(world, action),
              last,
            ));
      if (!endpointUseful) {
        if ((action.replans ?? 0) >= MOVEMENT.maxReplans) {
          failAction(
            world,
            actor,
            events,
            'the target or route keeps changing; choose a new action.',
          );
          return;
        }
        action.replans = (action.replans ?? 0) + 1;
        const error = approach(world, actor, action);
        if (error) {
          failAction(world, actor, events, error.message);
          return;
        }
        if (action.navigation) return;
      }
      if (!moveAlongPath(world, actor, action.path, nativeMovementSpeed(actor) * seconds)) {
        action.path = [];
        if ((action.replans ?? 0) >= MOVEMENT.maxReplans)
          failAction(world, actor, events, 'the route became physically blocked.');
      }
      return;
    }
    if (action.type === 'move') {
      completeAction(world, actor, action, events);
      return;
    }
    const error = startWork(world, actor, action);
    if (error) {
      // This supported observation skip ends the admitted fuel attempt without
      // spending. Other failures still stop the selected activity.
      if (action.fireGuard?.onlyWhenLow && error.code === 'no-longer-needed') {
        finishPlanAction(world, actor.id, action.id, { ...error, ok: true, spent: 0 });
        actor.actor!.action = null;
        return;
      }
      failAction(world, actor, events, error.message);
      return;
    }
    // A moving target may enter reach during this phase. Work begins at that
    // endpoint, never retroactively over the preceding approach interval.
    seconds = 0;
  }
  if (
    ['gather', 'harvest', 'cook', 'pickup', 'tend-fire'].includes(action.type) &&
    !actionInReach(world, actor, action)
  ) {
    failAction(
      world,
      actor,
      events,
      action.type === 'pickup' && !world.entities[action.targetId ?? '']
        ? 'the pile is no longer available.'
        : 'the target moved out of reach.',
    );
    return;
  }
  if (action.type === 'replenish') {
    const definition = attributeDefinition(world, action.attributeId ?? '');
    const target = world.entities[action.targetId ?? ''];
    const value = definition && readAttribute(actor.actor!, definition);
    if (
      !definition?.reservoir ||
      definition.version !== action.definitionVersion ||
      !action.resourceDefinition ||
      !sameDefinitionPin(definitionPin(definition), action.resourceDefinition) ||
      definition.schema.kind !== 'number' ||
      typeof value !== 'number' ||
      !target?.replenisher ||
      target.replenisher.attributeId !== definition.id ||
      distance(worldPosition(actor), worldPosition(target)) > SIMULATION_RULES.interactionRadius ||
      target.replenisher.remaining <= 0 ||
      !hasLineOfEffect(world, actor, target)
    ) {
      failAction(
        world,
        actor,
        events,
        'the replenishment binding or supply is no longer available.',
      );
      return;
    }
    const pin = definitionPin(definition);
    const source = { kind: 'replenisher', entityId: target.id, definition: pin } as const;
    const destination = { kind: 'attribute', entityId: actor.id, definition: pin } as const;
    const stock = readResource(world, source)!;
    const recipient = readResource(world, destination)!;
    if (value >= definition.schema.max) {
      action.remainingSeconds = 0;
      completeAction(world, actor, action, events);
      return;
    }
    // The pre-step action pass advances no time. Resource transfers require a
    // positive amount; attempting one here would incorrectly stop valid work.
    if (seconds === 0) return;
    const transfer = applyResourceGroup(
      world,
      {
        invocationId: action.id,
        fulfillment: 'bounded-partial',
        operations: [
          {
            source,
            sourceRevision: stock.revision,
            destination,
            destinationRevision: recipient.revision,
            amount:
              definition.reservoir.replenishPerSecond * Math.min(seconds, action.remainingSeconds),
          },
        ],
      },
      events,
    );
    if (transfer.status !== 'applied') {
      failAction(world, actor, events, 'the replenishment supply is no longer available.');
      return;
    }
    const amount = transfer.amounts[0]!;
    action.transferred = (action.transferred ?? 0) + amount;
    if (value + amount === definition.schema.max || target.replenisher.remaining === 0)
      action.remainingSeconds = 0;
  }
  if (action.type === 'status-effect') return; // Effect conditions own completion; docs/status-effects.md#transitions.
  action.remainingSeconds = Math.max(0, action.remainingSeconds - seconds);
  if (
    action.remainingSeconds === 0 &&
    action.type === 'strike' &&
    action.weaponItemId &&
    action.strikePhase === 'windup'
  ) {
    const definition = strikeDefinition(action.definitionId, world, action.weaponItemId)!;
    const target = world.entities[action.targetId!]!;
    const inRange = target.actor!.alive && canReachEntity(world, actor, target, definition.range);
    const hit = inRange && nextRandom(world) < definition.accuracy!;
    const before = target.actor!.health;
    if (hit)
      commitBodyEffects(
        world,
        target,
        [{ targetId: target.id, kind: 'injury', amount: definition.damage }],
        action.id,
        events,
      );
    const damage = before - target.actor!.health;
    if (target.animal && target.actor!.alive) {
      rememberAttack(world, target, actor);
    }
    action.strikeOutcome = hit ? 'hit' : 'miss';
    action.strikePhase = 'recovery';
    action.totalSeconds = definition.recoverySeconds!;
    action.remainingSeconds = definition.recoverySeconds!;
    actor.actor!.attackReadyAt = world.simTime + definition.recoverySeconds!;
    // The shared event owner records the world outcome and the actor's own awareness.
    // A completed miss is evidence for another choice, never an automatic retry.
    emit(
      world,
      events,
      'struck',
      `${namePhrase(actor, 'definite', { capitalize: true })} ${hit ? 'hit' : 'missed'} the target with ${namePhrase(world.itemDefinitions[definition.id]!, 'definite')}.${hit ? ` ${damage} damage.` : inRange ? '' : ' The target moved out of reach.'}`,
      actor,
      target.id,
      {
        definitionId: definition.id,
        weaponItemId: action.weaponItemId,
        actionId: action.id,
        hit,
        damage,
        reason: hit ? 'hit' : inRange ? 'accuracy' : 'out-of-range',
        targetReference: true,
        semanticTrigger: true,
      },
    );
    return;
  }
  if (action.remainingSeconds === 0) completeAction(world, actor, action, events);
}
/** An installed reservoir can opt into its existing native replenishment controller. */

function nativeReservoirResponse(world: WorldState, actor: Entity): void {
  const component = actor.actor!;
  if (component.controller !== 'npc' || component.action || !component.attributes) return;
  for (const [id, state] of Object.entries(component.attributes ?? {})) {
    const definition = attributeDefinition(world, id)!;
    if (
      !definition.reservoir ||
      !definition.concern ||
      typeof state.value !== 'number' ||
      state.value >= definition.concern.below
    )
      continue;
    const sources = worldRootEntities(world)
      .filter(
        (target) =>
          target.replenisher?.attributeId === id &&
          target.replenisher.remaining > 0 &&
          visible(world, actor, target),
      )
      .sort(
        (a, b) =>
          distance(worldPosition(actor), worldPosition(a)) -
            distance(worldPosition(actor), worldPosition(b)) || a.id.localeCompare(b.id),
      );
    for (const target of sources) {
      const action = prepareReplenishment(world, actor, id, target.id);
      if ('ok' in action) continue;
      action.id = nextId(world, 'action');
      if (approach(world, actor, action)) continue;
      component.action = action;
      component.planGeneration++;
      return;
    }
  }
}

/** This finite native step changes entity state, not participant components/membership.
 * Compile IDs outside the draft so inert scenery is not proxied/sorted every interval. A nested
 * command can install a new world; refresh there before the next native phase. Future native
 * spawning/component mutations must also refresh this roster, never retain revoked draft entities.
 * docs/performance.md#simulation-cpu-and-growing-history
 */
function nativeParticipants(world: WorldState): {
  actors: string[];
  ambient: string[];
  statuses: string[];
} {
  const roots = worldRootEntities(world);
  const active = roots
    .filter((e) => activelyParticipates(e) && (e.actor || e.animal || e.heat))
    .sort((a, b) => a.id.localeCompare(b.id));
  return {
    actors: active.filter((e) => e.actor).map((e) => e.id),
    ambient: active.map((e) => e.id),
    statuses: roots.filter((e) => mayAdvanceStatusEffects(world, e)).map((e) => e.id),
  };
}

type NativeMechanics = {
  remainingSeconds: number;
  interval: ReturnType<typeof nativeInterval>;
  status: ReturnType<typeof prepareStatusRates>;
  travelFor: (id: string) => number;
  reactiveActors: string[];
  /** Captured rates may wait for a boundary: no serial clamps, per-slice damage or transfer. */
  deferRates: boolean;
  /** Entities other participants' statuses depend on; their changes re-predict globally. */
  referenced: ReadonlySet<string>;
  /** A stored absolute deadline ends this interval; the clock lands on it exactly. */
  endsAt?: number;
};
/** Apply the interval's captured rates over `rateSeconds` in the existing operator order;
 * work in progress advances by its own slice. Deferred rate time is applied here before any
 * magnitude reader, prediction or publication (docs/simulation-time.md#native-interval-contract). */
function* integrateEndpoint(
  world: WorldState,
  participants: ReturnType<typeof nativeParticipants>,
  mechanics: NativeMechanics,
  rateSeconds: number,
  events: WorldEvent[],
  work?: {
    seconds: number;
    working: ReadonlyMap<string, string>;
    /** Fires lit when this slice began; postponed time uses the unchanged current state. */
    burning: ReadonlySet<string>;
  },
): Generator<void> {
  const { interval } = mechanics;
  const bodyRates = rateSeconds
    ? integrateStatusRates(world, mechanics.status, rateSeconds, events, interval.drains, true)
    : [];
  const bodyRatesByTarget = new Map(bodyRates.map((rate) => [rate.targetId, rate]));
  // Drains folded into a status net flow were applied there (PF13.12).
  const folded = (id: string, kind: 'reservoir') =>
    interval.drains.some((drain) => drain.targetId === id && drain.kind === kind);
  for (const id of participants.actors) {
    const actor = world.entities[id],
      component = actor?.actor;
    if (!actor || !component?.alive || component.incapacitated) continue;
    if (rateSeconds) {
      const bodyRate = bodyRatesByTarget.get(id);
      if (bodyRate) applyBodyRate(world, bodyRate, events);
      reconcileConditions(world, actor, events);
      if (!component.alive || component.incapacitated) continue;
      if (!folded(id, 'reservoir')) advanceReservoirs(world, actor, rateSeconds, events);
    }
    if (work && work.working.get(id) === component.action?.id) {
      const following = component.action?.type === 'follow';
      const stage = component.action?.stage;
      advanceAction(world, actor, following ? 0 : work.seconds, events);
      if (following && component.action?.stage !== stage) mechanics.remainingSeconds = 0;
    }
  }
  if (!rateSeconds) return;
  for (const id of participants.ambient) {
    const entity = world.entities[id];
    // Fires burn for the state they had when the slice began: one lit by work finishing at
    // the endpoint gained no burn, and one put out at the endpoint burned throughout.
    if (entity?.heat && (work ? work.burning.has(id) : entity.heat.lit)) {
      entity.heat.fuelSeconds = Math.max(0, entity.heat.fuelSeconds - rateSeconds);
      if (entity.heat.fuelSeconds === 0 && entity.heat.lit) {
        entity.heat.lit = false;
        emit(world, events, 'fire-out', 'The campfire ran out of fuel.', entity);
      }
    }
    yield;
  }
}
const nativeContinuations = new WeakMap<
  WorldState,
  {
    mechanics: NativeMechanics;
    participants: ReturnType<typeof nativeParticipants>;
    crossings: CrossingCache;
    /** Flyers whose takeoff/landing awaits local re-prediction at the next start boundary. */
    localChanges?: ReadonlySet<string>;
  }
>();

/** Advance a bounded prefix at meaningful/fidelity boundaries.
 * docs/simulation-time.md#native-interval-contract */
export function advanceWorld(
  original: WorldState,
  elapsedSimSeconds: number,
  options: { maxIntervals?: number } = {},
): Transition {
  const steps = advanceWorldSlices(original, elapsedSimSeconds, options);
  let result = steps.next();
  while (!result.done) result = steps.next();
  return result.value;
}
/** Yields private progress only. At a coherent boundary the caller can request publication
 * by resuming with true. The domain reads no wall clock and never exposes a partial draft. */
export function* advanceWorldSlices(
  original: WorldState,
  elapsedSimSeconds: number,
  options: { maxIntervals?: number } = {},
): Generator<void | 'boundary', Transition, boolean | undefined> {
  const nested = inWorkGroup();
  try {
    return yield* meteredIterator(
      WORK_LIMITS.group,
      advanceWorldNative(original, elapsedSimSeconds, options),
    );
  } catch (error) {
    if (!(error instanceof WorkBudgetError || error instanceof ResourceReservationError) || nested)
      throw error;
    return { world: original, events: [], outcome: outcome(false, error.code, error.message) };
  }
}

function* advanceWorldNative(
  original: WorldState,
  elapsedSimSeconds: number,
  options: { maxIntervals?: number } = {},
): Generator<void | 'boundary', Transition, boolean | undefined> {
  const maxIntervals = options.maxIntervals ?? 4096;
  if (
    !Number.isFinite(elapsedSimSeconds) ||
    elapsedSimSeconds < 0 ||
    elapsedSimSeconds > SIMULATION_RULES.maxAdvanceSeconds ||
    !Number.isSafeInteger(maxIntervals) ||
    maxIntervals < 1 ||
    maxIntervals > 4096
  )
    return {
      world: original,
      events: [],
      outcome: outcome(
        false,
        'invalid-duration',
        'Supply zero to one game day and a bounded positive interval count.',
      ),
    };
  if (original.paused || elapsedSimSeconds === 0 || navigationBlocked(original))
    return {
      world: original,
      events: [],
      outcome: outcome(
        true,
        original.paused
          ? 'paused'
          : navigationBlocked(original)
            ? 'navigation-pending'
            : 'unchanged',
        'No game time advanced.',
      ),
    };
  // Only the exact immutable native successor can reuse this prediction. Commands,
  // edits and recovery create another identity and rebuild; forks copy the countdown.
  const continuation = Object.isFrozen(original) ? nativeContinuations.get(original) : undefined;
  let participants = continuation?.participants ?? nativeParticipants(original);
  const mechanicalRevision = (world: WorldState) =>
    stateChangeRevision(world, 'contribution') +
    stateChangeRevision(world, 'body') +
    stateChangeRevision(world, 'behavior') +
    stateChangeRevision(world, 'participation') +
    stateChangeRevision(world, 'attribute') +
    world.moduleManifest.revision;
  let world = draftWorld(original);
  let before = snapshotEncounters(original);
  const events: WorldEvent[] = [];
  let remaining = elapsedSimSeconds,
    intervals = 0,
    motionSlices = 0,
    slicesSinceBoundary = 0;
  let mechanics: NativeMechanics | undefined = continuation
    ? { ...continuation.mechanics }
    : undefined;
  let crossings = continuation ? copyCrossings(continuation.crossings) : crossingCache();
  const discardMechanics = () => {
    mechanics = undefined;
    delete world.nativeInterval;
  };
  // Regional rate integration (PF13.11): a slice that only moves bodies leaves unrelated
  // entities' captured linear rates pending. The shared prediction already stops at every
  // threshold, so no transition can fall due before the pending time is applied at the next
  // boundary, command, prediction or publication, always at the current clock.
  let pendingSeconds = 0,
    pendingMechanics: NativeMechanics | undefined;
  const materialize = function* (): Generator<void> {
    if (!pendingSeconds) return;
    const seconds = pendingSeconds;
    pendingSeconds = 0;
    yield* integrateEndpoint(world, participants, pendingMechanics!, seconds, events);
  };
  // A flyer's own takeoff or landing changes only its grounded/activeWork predicates. Unless
  // another entity's status or plan depends on it, re-predict it alone before the next slice.
  let localChanges: Set<string> | undefined = continuation?.localChanges
    ? new Set(continuation.localChanges)
    : undefined;
  const localize = (ids: readonly string[]) => {
    const current = mechanics;
    if (!current || !ids.length) return;
    if (ids.some((id) => current.referenced.has(id) || current.reactiveActors.includes(id)))
      discardMechanics();
    else for (const id of ids) (localChanges ??= new Set()).add(id);
  };
  while (
    remaining > 0 &&
    intervals < maxIntervals &&
    motionSlices < 4096 &&
    !navigationBlocked(world, participants.actors)
  ) {
    // A tiny retained remainder is a forecast, not authority to advance the clock.
    // Recompute from current state; only a real predicate may require a micro-interval.
    if (mechanics && mechanics.remainingSeconds <= TIME_EPSILON) discardMechanics();
    if (!mechanics) yield* materialize();
    // Observers able to perceive before this start boundary's reconciliation and commands.
    // A change retires or resumes evidence at this instant, not at the slice end (PF13.16).
    let perceiving: string | undefined;
    const perceivers = () =>
      participants.actors
        .filter((id) => {
          const e = world.entities[id];
          return (
            !!e?.actor?.alive &&
            hasMemory(e) &&
            activelyParticipates(e) &&
            !capabilityBlocked(world, e, 'perception')
          );
        })
        .join('\0');
    if (!mechanics) perceiving = perceivers();
    const beforeState = mechanicalRevision(world);
    let statusIds = participants.statuses;
    if (!mechanics) {
      reconcileResourceReservations(world);
      if (advanceRemains(world, participants.ambient, events))
        participants = nativeParticipants(world);
      reconcileItemOffers(world, events);
      advanceAppraisals(world, events);
      for (const id of statusIds) reconcileStatusEffects(world, world.entities[id]!, events);
      advanceCommitments(world, []);
      reconcileConversations(world);
    }
    const beforeDecisions = world.nextId;
    for (const actorId of mechanics?.reactiveActors ?? participants.actors) {
      yield;
      let actor = world.entities[actorId];
      if (!actor?.actor) continue;
      let component = actor.actor;
      reconcileActivityControl(world, actorId, component.agency.plan);
      if (!component.alive || component.incapacitated) continue;
      reconcileConditions(world, actor, events);
      if (!capabilityBlocked(world, actor, 'actions')) nativeReservoirResponse(world, actor);
      const step = readyPlanStep(world, actorId);
      if (step && admitActivityAttempt(world, actorId, component.agency.plan!, step)) {
        yield* materialize();
        perceiving ??= perceivers();
        const stepId = step.id;
        const command = resolvePlanCommand(component.agency.plan!, step);
        const transition = command
          ? actionTargetsCurrent(world, actorId, [command], step.targetEpisodes)
            ? executeCommand(world, command)
            : {
                world,
                events: [],
                outcome: outcome(
                  false,
                  'stale-encounter',
                  'The queued target encounter changed. Revise the plan.',
                ),
              }
          : {
              world,
              events: [],
              outcome: outcome(
                false,
                'missing-plan-output',
                'The earlier step has no completed item output. Revise the plan.',
              ),
            };
        participants = nativeParticipants(transition.world);
        world = draftWorld(transition.world);
        discardMechanics();
        events.push(...transition.events);
        actor = world.entities[actorId]!;
        component = actor.actor!;
        const started = component.agency.plan!.steps.find((entry) => entry.id === stepId)!;
        started.status = 'running';
        started.actionId = component.action?.id ?? stepId;
        started.outcome = transition.outcome;
        component.agency.plan!.revision++;
        component.agency.revision++;
        if (!transition.outcome.ok || !component.action)
          finishPlanAction(world, actorId, started.actionId, transition.outcome);
      }

      const priorFollowStage =
        component.action?.type === 'follow' ? component.action.stage : undefined;
      const priorFollowPath =
        component.action?.type === 'follow' ? component.action.path : undefined;
      const priorStage = component.action?.stage;
      if (
        !capabilityBlocked(world, actor, 'locomotion') ||
        component.action?.type === 'status-effect' ||
        component.action?.type === 'pickup' ||
        component.action?.type === 'follow'
      )
        advanceAction(world, actor, 0, events);
      if (
        priorFollowStage &&
        (component.action?.stage !== priorFollowStage || component.action.path !== priorFollowPath)
      )
        discardMechanics();
      // Work begun here starts silently; the next prediction must bound its completion.
      if (priorStage === 'approaching' && component.action?.stage === 'working') discardMechanics();
    }
    if (world.nextId !== beforeDecisions) discardMechanics();
    let occupancy: LandingOccupancy | undefined;
    const landingOccupancy = () => (occupancy ??= new LandingOccupancy(world));
    const trackOccupancy = (e: Entity) => occupancy?.update(e);
    // Flight events read one occurrence-time pose for every receiver, after movement.
    const occurrences: Array<Parameters<typeof emit>> = [];
    const deferFlight = (...args: Parameters<typeof emit>): void => {
      const source = args[4];
      if (source?.placement?.mode === 'world')
        args[4] = {
          ...source,
          placement: { ...source.placement, position: { ...source.placement.position } },
        };
      occurrences.push(args);
    };
    const flushFlight = () => {
      const sources = occurrences.map((occurrence) => occurrence[4]?.id ?? '');
      withStableAudience(world, () => {
        occurrences.sort((a, b) => (a[4]?.id ?? '').localeCompare(b[4]?.id ?? ''));
        for (const occurrence of occurrences) emit(...occurrence);
      });
      occurrences.length = 0;
      return sources;
    };
    const beforeStartEvents = events.length;
    for (const id of participants.ambient) {
      yield;
      const entity = world.entities[id];
      if (!entity || capabilityBlocked(world, entity, 'locomotion')) continue;
      advanceFlight(world, entity, 0, events, landingOccupancy, deferFlight);
      advanceAnimal(world, entity, 0);
      trackOccupancy(entity);
    }
    const takeoffs = flushFlight();
    const afterFlight = events.length;
    // Grounding predicates may change even without changing an active status episode.
    if (
      mechanicalRevision(world) !== beforeState ||
      afterFlight - beforeStartEvents !== takeoffs.length
    )
      discardMechanics();
    else localize(takeoffs);
    // Nested commands can replace entities or status attributes. Reuse the speech branch's
    // conservative roster helper; never retain revoked draft references across that boundary.
    statusIds = participants.statuses;
    // A retained prediction certifies that no status condition changed since its endpoint
    // reconciliation: thresholds bound it and every other change above discards it.
    if (!mechanics || localChanges) {
      yield* materialize();
      for (const id of statusIds)
        if (!mechanics || localChanges!.has(id))
          reconcileStatusEffects(world, world.entities[id]!, events);
    }
    if (events.length !== afterFlight || mechanicalRevision(world) !== beforeState)
      discardMechanics();
    if (perceiving !== undefined && perceivers() !== perceiving) {
      yield* updateEncounters(world, before, events, participants.actors);
      before = snapshotEncounters(world);
    }
    if (navigationBlocked(world, participants.actors)) break;
    const intervalState = mechanicalRevision(world);
    if (mechanics && localChanges) {
      const refined = refineNativeInterval(
        world,
        localChanges,
        participants,
        mechanics.status,
        mechanics.travelFor,
      );
      mechanics = refined && {
        ...mechanics,
        status: refined.status,
        ...(refined.seconds < mechanics.remainingSeconds
          ? { remainingSeconds: refined.seconds, endsAt: refined.endsAt }
          : {}),
      };
      forgetCrossings(crossings, localChanges);
    }
    localChanges = undefined;
    if (!mechanics) {
      yield* materialize();
      reconcileCrossings(world, participants.actors, participants.ambient, crossings);
      const status = statusIds.flatMap((id) => prepareStatusRates(world, world.entities[id]!));
      const travelFor = motionTravelBounds(
        world,
        BASE_TIME_POLICY.idleHorizonSeconds,
        participants.actors,
        participants.ambient,
      );
      const interval = nativeInterval(
        world,
        BASE_TIME_POLICY.idleHorizonSeconds,
        participants.actors,
        participants.ambient,
        statusIds,
        status,
        travelFor,
      );
      // Only already-urgent native responders and plans can reconsider between known
      // thresholds. Others keep integrating values without repeating decision work.
      const reactiveActors = participants.actors.filter((id) => {
        const actor = world.entities[id]?.actor;
        return (
          actor &&
          (actor.action?.type === 'follow' ||
            actor.agency.plan ||
            (actor.controller === 'npc' &&
              Object.entries(actor.attributes ?? {}).some(([id, state]) => {
                const definition = attributeDefinition(world, id)!;
                return (
                  definition.reservoir &&
                  definition.concern &&
                  typeof state.value === 'number' &&
                  state.value < definition.concern.below
                );
              })))
        );
      });
      // Restore sampling progress, not stale rates. A newly derived earlier bound wins;
      // only the retained remainder can carry its own exact ending clock value.
      // docs/simulation-time.md#native-interval-contract
      const savedInterval = world.nativeInterval;
      const retainEnd = savedInterval && savedInterval.remainingSeconds < interval.seconds;
      mechanics = {
        remainingSeconds: Math.min(interval.seconds, savedInterval?.remainingSeconds ?? Infinity),
        endsAt: retainEnd ? savedInterval.endsAt : interval.endsAt,
        interval,
        status,
        travelFor,
        reactiveActors,
        deferRates:
          !interval.serialClamps &&
          !interval.requiresImmediateIntegration &&
          participants.actors.every(
            (id) => world.entities[id]?.actor?.action?.type !== 'replenish',
          ),
        referenced: crossStatusReferences(world, statusIds, status),
      };
      delete world.nativeInterval;
    }
    const { travelFor } = mechanics;
    let seconds = sensoryCrossingBound(
      world,
      nativeMotionInterval(
        world,
        Math.min(remaining, mechanics.remainingSeconds),
        participants.ambient,
        travelFor,
      ),
      participants.actors,
      participants.ambient,
      crossings,
    );
    // Fixed contributions become ineffective at the endpoint. Their release grants only
    // future movement, never movement over the interval they restricted.
    // docs/simulation-time.md#native-interval-contract
    const movementRestricted = new Set(
      statusIds.filter((id) => capabilityBlocked(world, world.entities[id], 'locomotion')),
    );
    const working = new Map(
      participants.actors.flatMap((id) => {
        const e = world.entities[id],
          a = e?.actor?.action;
        return e?.actor?.alive &&
          !e.actor.incapacitated &&
          a?.stage === 'working' &&
          (!capabilityBlocked(world, e, 'locomotion') ||
            a.type === 'status-effect' ||
            a.type === 'pickup')
          ? [[id, a.id] as const]
          : [];
      }),
    );
    // Fires burn for the state they had when this slice began: one lit by work finishing
    // at the endpoint gained no burn, and one put out at the endpoint burned throughout.
    const burning = new Set(participants.ambient.filter((id) => world.entities[id]?.heat?.lit));
    // Reaching the interval's stored deadline lands on it exactly (PF13.16).
    const landing = mechanics.endsAt !== undefined && seconds >= mechanics.remainingSeconds;
    if (landing) seconds = mechanics.endsAt! - world.simTime;
    world.simTime = landing ? mechanics.endsAt! : world.simTime + seconds;
    remaining = Math.max(0, remaining - seconds);
    mechanics.remainingSeconds = landing ? 0 : Math.max(0, mechanics.remainingSeconds - seconds);
    motionSlices++;
    slicesSinceBoundary++;
    const beforeMovementEffects = events.length;
    // Move before endpoint effects: a shot/death at the end cannot cause earlier fleeing.
    for (const id of participants.actors) {
      yield;
      const actor = world.entities[id];
      if (
        actor?.actor?.alive &&
        !actor.actor.incapacitated &&
        actor.actor.action?.stage === 'approaching' &&
        !movementRestricted.has(id)
      )
        advanceAction(world, actor, seconds, events);
    }
    const movementEffects = events.length !== beforeMovementEffects;
    // Non-emitting, bounded 0.4 m wander impulses retain their local timer remainder.
    // Order due RNG draws by deadline then identity, independently of callback chunk size.
    // Whole-second timers often fall due together; compare them at TIME_EPSILON resolution so
    // the floating-point residue of how elapsed time was sliced cannot reorder their draws.
    const wanderDeadline = (id: string) =>
      Math.round(world.entities[id]!.animal!.wanderSeconds / TIME_EPSILON);
    const wanderers = participants.ambient
      .filter((id) => {
        const e = world.entities[id];
        return (
          e?.animal &&
          e.actor?.alive &&
          !e.actor.incapacitated &&
          !e.actor.action &&
          !e.spatial.flight &&
          e.spatial.fallVelocity === undefined &&
          !(e.animal.danger > 0 && e.animal.threatPosition) &&
          !movementRestricted.has(id)
        );
      })
      .sort((a, b) => wanderDeadline(a) - wanderDeadline(b) || a.localeCompare(b));
    const wandered = new Set(wanderers);
    for (const id of wanderers) advanceAnimal(world, world.entities[id]!, seconds);
    occupancy = undefined;
    const landings = new Set(
      participants.ambient.filter((id) => landingDue(world, world.entities[id]!, seconds)),
    );
    const movementOrder = [...participants.ambient.filter((id) => !landings.has(id)), ...landings];
    let fleeEnded = false;
    for (const id of movementOrder) {
      yield;
      const entity = world.entities[id];
      if (!entity) continue;
      if (!movementRestricted.has(id)) {
        const flightOwned = !!entity.spatial.flight || entity.spatial.fallVelocity !== undefined;
        const fleeing = !!entity.animal?.danger;
        advanceFlight(world, entity, seconds, events, landingOccupancy, deferFlight);
        // Landing grants future animal movement, never the flight interval just consumed.
        if (!flightOwned && !wandered.has(id)) advanceAnimal(world, entity, seconds);
        // A flee end silently changes activeWork, so its captured energy rate ends here.
        fleeEnded ||= fleeing && !entity.animal?.danger;
      }
      trackOccupancy(entity);
    }
    const flightSources = flushFlight();
    const movedWithOccurrences = flightSources.length > 0;
    const beforeEffects = events.length;
    // Work that ends or changes phase in this slice has effects (a hit, a meal, a completion);
    // pending rates must reach every entity before them. Status-effect work such as sleep is
    // open-ended: its conditions end it at a predicted boundary. A remainder the loop would
    // discard as floating-point residue is the interval's end, not a reason to defer.
    const workEnds = [...working].some(([id, actionId]) => {
      const action = world.entities[id]?.actor?.action;
      return (
        action?.id === actionId &&
        action.type !== 'follow' &&
        action.type !== 'status-effect' &&
        action.remainingSeconds <= seconds + TIME_EPSILON
      );
    });
    const deferred =
      mechanics.deferRates &&
      mechanics.remainingSeconds > TIME_EPSILON &&
      !workEnds &&
      !movementEffects &&
      !movedWithOccurrences &&
      !fleeEnded &&
      mechanicalRevision(world) === intervalState;
    // Time deferred from earlier slices is applied for everyone before this endpoint's work, so
    // a death or other effect there cannot erase it. (This slice keeps main's per-actor order.)
    if (!deferred) yield* materialize();
    else pendingSeconds += seconds;
    pendingMechanics = mechanics;
    for (const id of participants.actors)
      reconcileActivityControl(world, id, world.entities[id]?.actor?.agency.plan, seconds);
    yield* integrateEndpoint(world, participants, mechanics, deferred ? 0 : seconds, events, {
      seconds,
      working,
      burning,
    });
    if (!deferred)
      for (const id of statusIds) {
        const entity = world.entities[id];
        if (entity) reconcileStatusEffects(world, entity, events);
      }
    // Arrival starts new work now; only work already active at the start receives elapsed time.
    // That work starts silently, so the next prediction must bound its completion (PF13.16).
    let startedWork = false;
    for (const id of participants.actors) {
      const actor = world.entities[id];
      if (
        actor?.actor?.alive &&
        !actor.actor.incapacitated &&
        actor.actor.action?.stage === 'approaching' &&
        !capabilityBlocked(world, actor, 'locomotion')
      ) {
        advanceAction(world, actor, 0, events);
        // advanceAction mutates the action; read its stage afresh.
        const stage: string | undefined = world.entities[id]?.actor?.action?.stage;
        startedWork ||= stage === 'working';
      }
    }
    reconcileResourceReservations(world);
    reconcileItemOffers(world, events);
    advanceAppraisals(world, events);
    if (advanceRemains(world, participants.ambient, events))
      participants = nativeParticipants(world);
    const sharedBoundary =
      mechanics.remainingSeconds === 0 ||
      movementEffects ||
      events.length !== beforeEffects ||
      mechanicalRevision(world) !== intervalState;
    if (sharedBoundary || slicesSinceBoundary === 32) {
      intervals++;
      slicesSinceBoundary = 0;
    }
    if (sharedBoundary || fleeEnded || startedWork) discardMechanics();
    else localize(flightSources);
    yield* updateEncounters(world, before, events, participants.actors);
    advanceCommitments(world, events);
    reconcileConversations(world);
    // Control-only waits must observe endpoint changes even when this advance
    // ends exactly at the deadline. Queue future work without granting it time.
    for (const id of participants.actors) {
      const plan = world.entities[id]?.actor?.agency.plan;
      reconcileActivityControl(world, id, plan);
      if (plan?.status === 'active' && plan.activity?.pending.at(-1)?.node.kind === 'wait') {
        const revision = plan.revision;
        readyPlanStep(world, id);
        if (plan.revision !== revision) discardMechanics();
      }
    }
    if (remaining > 0 && intervals < maxIntervals && motionSlices < 4096) {
      if (yield 'boundary') break;
      before = snapshotEncounters(world);
    }
  }
  // Every publication, including a coherent early stop, holds materialized values. A pending
  // local re-prediction travels with the continuation, so where a call ends cannot move
  // later interval ends.
  yield* materialize();
  if (mechanics && mechanics.remainingSeconds > TIME_EPSILON)
    world.nativeInterval = {
      remainingSeconds: mechanics.remainingSeconds,
      ...(mechanics.endsAt === undefined ? {} : { endsAt: mechanics.endsAt }),
    };
  else delete world.nativeInterval;
  const result = finish(
    world,
    events,
    outcome(
      true,
      navigationBlocked(world, participants.actors)
        ? 'navigation-pending'
        : remaining > 0
          ? 'advance-budget'
          : 'advanced',
      `Advanced ${world.simTime - original.simTime} simulation seconds in ${intervals + (slicesSinceBoundary ? 1 : 0)} intervals (${motionSlices} motion slices).`,
    ),
  );
  if (mechanics && Object.isFrozen(original))
    nativeContinuations.set(result.world, { mechanics, participants, crossings, localChanges });
  return result;
}

const episodeMembership = new WeakMap<object, { people: string[]; objects: string[] }>();
/** Loss retires exactly the active bindings; the empty mapping keeps its existing meaning. */
function retirePerceptionEpisodes(world: WorldState, actorId: string): void {
  const ids = Object.keys(world.perceptionEpisodes?.[actorId] ?? {});
  if (!ids.length) return;
  const episodes = world.perceptionEpisodes![actorId]!;
  for (const id of ids) delete episodes[id];
  countDomainWork('episodeBindingsDeleted', ids.length);
}
/** Positions stay fixed during this phase; preserve event-time audiences and actor order. */
function* updateEncounters(
  world: WorldState,
  original: EncounterBaseline,
  events: WorldEvent[],
  actorIds: readonly string[],
): Generator<void> {
  const encounter = encounterEmitter(world, events);
  // Loss of sensory/memory participation cannot retain a recognition grant.
  for (const id of actorIds) {
    const observer = world.entities[id];
    if (observer?.actor?.alive && hasMemory(observer) && activelyParticipates(observer)) continue;
    if (world.visiblePeople?.[id]?.length) world.visiblePeople[id] = [];
    if (world.visibleObjects?.[id]?.length) world.visibleObjects[id] = [];
    retirePerceptionEpisodes(world, id);
    if (observer?.actor && Object.keys(observer.actor.contacts ?? {}).length)
      observer.actor.contacts = {};
  }
  const frame = yield* prepareExposure(world, original);
  const { changedFeatures, maximumBodyHeight, maximumBodyRadius } = frame;
  // A blocked observer still reconciles the loss of its visual episodes. Skipping the
  // observer here would let waking reuse an episode from before perception was lost.
  for (const actor of frame.observers) {
    yield;
    const radius = visionRadius(world, actor.entity);
    const sees = visionQuery(world, actor.entity);
    const touch = sensesFor(world, actor.entity).find(
      (s) => s.implementation === 'body-contact-v1',
    );
    const touchRadius =
      Math.max(actor.radius + maximumBodyRadius, actor.height, maximumBodyHeight) +
      SPATIAL_LIMITS.epsilon;
    const contacts = Object.values(actor.entity.actor!.contacts ?? {});
    const movingContacts = contacts.some((contact) => contact.detail === 'moving');
    const blocked = capabilityBlocked(world, actor.entity, 'perception');
    if (!frame.affected.has(actor.id) && !movingContacts) {
      countDomainWork('observersSkipped');
      continue;
    }
    countDomainWork('observersExamined');
    // Captured entities are read-only phase views; contact writes belong to the live draft.
    if (touch || contacts.length)
      yield* updateContactEpisodes(
        world,
        original.positions,
        world.entities[actor.id]!,
        events,
        () => frame.nearby(actor.position, touchRadius, 'contact'),
      );
    if (radius === 0 || blocked) {
      if (world.visiblePeople?.[actor.id]?.length) world.visiblePeople[actor.id] = [];
      if (world.visibleObjects?.[actor.id]?.length) world.visibleObjects[actor.id] = [];
      retirePerceptionEpisodes(world, actor.id);
      continue;
    }
    const previous = original.visiblePeople?.[actor.id] ?? [];
    let seen = frame
      .nearby(actor.position, radius + 2, 'people')
      .filter((e) => e.id !== actor.id && e.alive && sees(e))
      .map((e) => e.id);
    let objectIds =
      !frame.objectsChanged(actor.id) && original.visibleObjects?.[actor.id]
        ? original.visibleObjects[actor.id]!
        : frame
            .nearby(actor.position, radius, 'objects')
            .filter(sees)
            .map((e) => e.id);
    const previousObjects = original.visibleObjects?.[actor.id];
    const samePeople = seen.length === previous.length && seen.every((id, i) => id === previous[i]);
    const sameObjects =
      !!previousObjects &&
      (objectIds === previousObjects ||
        (objectIds.length === previousObjects.length &&
          objectIds.every((id, i) => id === previousObjects[i])));
    if (samePeople) seen = previous;
    if (sameObjects) objectIds = previousObjects!;
    // Arrivals, departures and brief returns (EPR03) read this observer's latest private
    // sighting records once, and only when its visible people changed.
    const sightings = samePeople
      ? undefined
      : recentSightings(world, actor.id, world.simTime - SIGHTING_POLICY.recordWindowSeconds);
    if (!samePeople) {
      const stillSeen = new Set(seen);
      for (const id of previous) {
        if (stillSeen.has(id)) continue;
        countDomainWork('exposureExits');
        const source = world.entities[id];
        // Death and removal have their own occurrences; one departure per record window.
        if (
          source?.actor?.alive &&
          (hasMemory(source) || SIGHTING_POLICY.retainRoutineOnset) &&
          sightings!.get(id)?.present !== false
        )
          encounter(actor.entity, id, SIGHTING_POLICY.departure, undefined, true);
        yield;
      }
    }
    // Persistent exposure episodes do not imply identity recognition across a disappearance;
    // a return within the linger window is the same episode. docs/knowledge.md#subject-binding
    const lingering = (id: string) => {
      const record = sightings?.get(id);
      return record &&
        !record.present &&
        world.simTime - record.at <= SIGHTING_POLICY.episodeLingerSeconds
        ? record.episode
        : undefined;
    };
    const priorEpisodes = original.perceptionEpisodes?.[actor.id] ?? {};
    const certified = Object.isFrozen(priorEpisodes)
      ? episodeMembership.get(priorEpisodes)
      : undefined;
    if (certified?.people !== seen || certified.objects !== objectIds) {
      const exposed = [...seen, ...objectIds];
      const membership = new Set(exposed);
      const removed = Object.keys(priorEpisodes).filter((id) => !membership.has(id));
      const added = exposed.filter((id) => !priorEpisodes[id]);
      if (removed.length || added.length) {
        // Compare immutable membership before obtaining the draft. Continuing bindings are
        // neither reconstructed nor reassigned. New identities retain exposed-array order.
        // docs/projects/parallel-batch-01-playable-week/simulation-performance.md#2-update-sighting-identity-mappings-by-difference--6-hours
        const episodes = ((world.perceptionEpisodes ??= {})[actor.id] ??= {});
        for (const id of removed) delete episodes[id];
        for (const id of added)
          episodes[id] = priorEpisodes[id] ?? lingering(id) ?? perceptionEpisodeId(world, id);
        countDomainWork('episodeBindingsAssigned', added.length);
        countDomainWork('episodeBindingsInserted', added.length);
        countDomainWork('episodeBindingsDeleted', removed.length);
      } else if (Object.isFrozen(priorEpisodes))
        episodeMembership.set(priorEpisodes, { people: seen, objects: objectIds });
    }
    const previouslySeen = samePeople ? null : new Set(previous);
    const newlySeen = samePeople
      ? []
      : seen.filter(
          (id) =>
            !previouslySeen!.has(id) &&
            (hasMemory(world.entities[id]) || SIGHTING_POLICY.retainRoutineOnset),
        );
    if (newlySeen.length) {
      for (const id of newlySeen) {
        countDomainWork('exposureEntries');
        // Sightings are awareness, not memories: one record per subject per window.
        if (!sightings!.has(id))
          // Seeing someone is evidence, not an obligation to reason. Ordinary animals
          // remain visible and interest-matchable without a stored entry on each return.
          // docs/memory-architecture.md#encounters-sensory-detail-and-reminder-continuity
          encounter(
            actor.entity,
            id,
            hasMemory(world.entities[id]) ? SIGHTING_POLICY.social : SIGHTING_POLICY.routine,
          );
        yield;
      }
    }
    if (changedFeatures.size)
      for (const id of seen) {
        const detail = changedFeatures.get(id);
        if (detail && (samePeople || previouslySeen!.has(id))) {
          countDomainWork('exposureDetails');
          encounter(actor.entity, id, SIGHTING_POLICY.changedBeing, detail);
        }
      }
    if (!original.visiblePeople?.[actor.id] || !samePeople)
      (world.visiblePeople ??= {})[actor.id] = seen;
    if (!sameObjects) {
      // Unchanged frozen membership needs neither a set rebuild nor another exposure scan.
      // Captions/speech still resolve event-time evidence independently of this visual cache.
      if (SIGHTING_POLICY.retainRoutineOnset) {
        const priorObjects = new Set(previousObjects ?? []);
        for (const id of objectIds) {
          if (!priorObjects.has(id)) encounter(actor.entity, id, SIGHTING_POLICY.routine);
          yield;
        }
      }
      (world.visibleObjects ??= {})[actor.id] = objectIds;
    }
    if (changedFeatures.size) {
      const priorObjects = sameObjects ? undefined : new Set(previousObjects);
      for (const id of objectIds) {
        const detail = changedFeatures.get(id);
        if (detail && (sameObjects || priorObjects!.has(id))) {
          countDomainWork('exposureDetails');
          encounter(actor.entity, id, SIGHTING_POLICY.routine, detail);
        }
      }
    }
    encounter.flush();
  }
  encounter.flush();
}

/** Establish real encounter episodes before a fresh world's first decision. Otherwise
 * an equip-then-target plan binds a null episode and becomes stale on the first tick.
 * Startup already owns this mutation; no clock advance or recognition is fabricated. */
export function initializePerception(world: WorldState, events: WorldEvent[]): void {
  for (const _ of updateEncounters(
    world,
    snapshotEncounters(world),
    events,
    nativeParticipants(world).actors,
  )) {
    // Startup consumes the finite initial roster; ordinary ticks use bounded slices.
  }
}

/** Private records are returned only for the supplied actor; bind this ID to authorization in the application. */
export function queryMemories(
  world: WorldState,
  actorId: string,
  options: { text?: string; entityId?: string; limit?: number } = {},
): MemoryRecord[] {
  const words = (options.text ?? '').toLowerCase().split(/\W+/).filter(Boolean);
  return cloneValue(
    (world.experience
      ? experiences(world, actorId)
      : (getOwn(world.memories, actorId) ?? []).filter(isRecallableExperience)
    )
      .filter((memory) => !options.entityId || memory.entityIds.includes(options.entityId))
      .map((memory) => ({
        memory,
        score:
          memory.importance +
          words.reduce(
            (sum, word) => sum + (memory.summary.toLowerCase().includes(word) ? 5 : 0),
            0,
          ) +
          (memory.kind === 'commitment' && !memory.resolved ? 20 : 0),
      }))
      .sort((a, b) => b.score - a.score || b.memory.at - a.memory.at)
      .slice(0, Math.min(300, Math.max(1, options.limit ?? 30)))
      .map((result) => result.memory),
  );
}
export function observeActor(
  world: WorldState,
  actorId: string,
  options: { includeMemories?: boolean } = {},
): ActorObservation | null {
  const actor = getOwn(world.entities, actorId);
  if (!actor?.actor) return null;
  const inventory = inventoryFor(world, actorId);
  const knownRecipes = (world.knowledge[actorId] ?? [])
    .map((record) => world.recipes[record.recipeId])
    .filter((recipe) => !!recipe)
    .map((recipe) => ({
      ...recipe,
      dependencyReferences: recipeVisibleDependencies(world, recipe),
    }));
  const knownRecipeIds = new Set(knownRecipes.map((recipe) => recipe.id));
  const definitionIds = new Set(inventory.map((item) => item.definitionId));
  const sees = entityVisionQuery(world, actor);
  const visibleEntities = nearbyEntities(world, worldPosition(actor), visionRadius(world, actor))
    .filter((entity) => entity.id !== actorId && sees(entity))
    .map((entity) => {
      // Shape the permitted view before its one final deep copy. Cloning a private plan or
      // long future route just to erase it wastes work proportional to invisible state.
      // docs/architecture.md#dependencies-and-authority
      const copy: Entity = {
        ...entity,
        ...observerName(world, actorId, entity.id),
        spatial: { ...entity.spatial },
        ...(entity.actor
          ? {
              actor: {
                ...entity.actor,
                action: entity.actor.action
                  ? {
                      id: entity.actor.action.id,
                      type: entity.actor.action.type,
                      stage: entity.actor.action.stage,
                      remainingSeconds: entity.actor.action.remainingSeconds,
                      totalSeconds: entity.actor.action.totalSeconds,
                      path: [],
                      consumed: [],
                    }
                  : null,
              },
            }
          : {}),
      };
      // A visible body is evidence of its current activity, not access to its future route.
      delete copy.spatial.flight;
      delete copy.statusEffects;
      delete copy.attributes;
      delete copy.mechanismFields;
      delete copy.declaredOwner;
      // Seeing a bag does not disclose its private contents or packing load.
      delete copy.container;
      delete copy.inventoryRevision;
      if (copy.actor?.action) {
        delete copy.actor.action.destination;
        delete copy.actor.action.navigation;
        delete copy.actor.action.follow;
      }
      if (copy.actor) {
        // Sparse state is owner-private; explicit permitted projections carry public values.
        delete copy.actor.attributes;
        delete copy.actor.contacts;
        delete copy.actor.conditions;
        delete copy.actor.inventoryInspection;
        delete copy.actor.attackReadyAt;
        copy.actor.agency = seedAgency();
        delete copy.actor.initialGoals;
        delete copy.actor.personality;
        delete copy.actor.backstory;
        delete copy.actor.participation;
        copy.actor.equippedItemId = null;
        copy.actor.planGeneration = 0;
      }
      if (copy.resource) definitionIds.add(copy.resource.definitionId);
      return copy;
    });
  const pileIds = new Set(visibleEntities.filter((e) => e.kind === 'item-pile').map((e) => e.id));
  const groundItems = [...pileIds].flatMap((id) => itemsForOwner(world, id));
  for (const item of groundItems) definitionIds.add(item.definitionId);
  for (const recipe of knownRecipes) {
    definitionIds.add(recipe.outputDefinitionId);
    for (const input of recipe.inputs) definitionIds.add(input.definitionId);
  }
  const self = { ...actor, actor: { ...actor.actor } };
  delete self.actor.contacts;
  return cloneValue({
    worldId: world.id,
    at: world.simTime,
    actor: self,
    contacts: contactViews(actor),
    visibleEntities,
    groundItems,
    inventory,
    itemDefinitions: [...definitionIds].flatMap((id) => {
      const definition = world.itemDefinitions[id];
      if (!definition) return [];
      if (!definition.recipeId || knownRecipeIds.has(definition.recipeId)) return [definition];
      const { recipeId, ...visible } = definition;
      return [visible];
    }),
    knownRecipes,
    // SQL-backed cognition supplies recall separately; physical observation must
    // not prepare that entire history only for its caller to discard it.
    memories: options.includeMemories === false ? [] : queryMemories(world, actorId),
    recentEvents: world.experience
      ? (world.experience.awareness[actorId] ?? []).slice(-24).map((aware) => ({
          id: aware.eventId,
          sequence: aware.sequence,
          at: aware.at,
          type: aware.eventType ?? aware.modality,
          text: aware.text,
          audience: [actorId],
          ...(aware.sourceId ? { actorId: aware.sourceId } : {}),
          ...(aware.targetId ? { targetId: aware.targetId } : {}),
          // Actor context is prose-first. Structured event fields stay authoritative in
          // world state; only the event's authored context text crosses this boundary.
          ...(aware.content !== undefined
            ? { data: { text: aware.speech ? aware.text : aware.content } }
            : {}),
        }))
      : [],
  });
}

/** Application-validated appraisal is separate from committed observations and cannot alter physical state. */
export function remember(
  original: WorldState,
  actorId: string,
  proposal: Omit<MemoryRecord, 'id' | 'actorId' | 'at'>,
): Transition {
  if (!getOwn(original.entities, actorId)?.actor?.alive || original.paused)
    return {
      world: original,
      events: [],
      outcome: outcome(false, 'unavailable', 'A live, unpaused actor is required.'),
    };
  if (
    !proposal ||
    typeof proposal.summary !== 'string' ||
    proposal.summary.length > 700 ||
    !Array.isArray(proposal.entityIds) ||
    !['episode', 'belief', 'commitment', 'reflection'].includes(proposal.kind) ||
    !['observed', 'heard', 'inferred'].includes(proposal.source) ||
    !Number.isFinite(proposal.importance)
  )
    return {
      world: original,
      events: [],
      outcome: outcome(false, 'invalid-memory', 'Memory does not match the bounded schema.'),
    };
  if (
    proposal.kind === 'commitment' &&
    !proposal.resolved &&
    unresolvedCommitmentCount(original, actorId) >= COMMITMENT_ADMISSION_LIMIT
  )
    return {
      world: original,
      events: [],
      outcome: outcome(
        false,
        'commitment-capacity',
        'Resolve an existing commitment before adding another.',
      ),
    };
  if (
    proposal.source !== 'inferred' &&
    (!proposal.eventId ||
      !original.events.some(
        (event) => event.id === proposal.eventId && event.audience.includes(actorId),
      ))
  )
    return {
      world: original,
      events: [],
      outcome: outcome(
        false,
        'missing-evidence',
        'Observed or heard memories need an event this actor actually perceived.',
      ),
    };
  const world = draftWorld(original);
  appendMemory(world, actorId, proposal);
  return finish(world, [], outcome(true, 'remembered', 'Private memory recorded.'));
}

export { canRecoverAtCamp } from './body-policy.js';
