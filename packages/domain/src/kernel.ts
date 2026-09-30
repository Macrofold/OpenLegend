import {
  ACTIVITY_LIMITS,
  beginActivity,
  endActivity,
  bindActivityAction,
  occurrenceFor,
  type ActivityOutput,
} from './action-experience.js';
import { nativeActivityView } from './worlds/base/action-views.js';
import { rangedApproachRange } from './worlds/base/actions.js';
import { isRecordedActivityCommand, recordActivityEffect } from './action-experience.js';
import { startLearnedActivity } from './activity-execution.js';
import { isSpeechVolume } from './acoustics.js';
import { SIGHTING_POLICY } from './worlds/base/senses.js';
import { exposureChanges, snapshotEncounters, type EncounterBaseline } from './encounter-cache.js';
import { motionTravelBounds, nativeMotionInterval } from './motion-boundaries.js';
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
import { objectExposureQuery } from './object-exposure.js';
import { actionTargetsCurrent } from './action-targets.js';
import { observerDescription } from './worlds/base/knowledge.js';
import { setBodyHealth } from './body-state.js';
import {
  ResourceReservationError,
  applyResourceGroup,
  availableItemQuantity,
  reconcileResourceReservations,
  releaseInvocationResources,
  availableResource,
  itemDefinitionPin,
  readResource,
  type ResourceOperation,
} from './resource-claims.js';
import { sameDefinitionPin } from './state-owners.js';
import { BASE_ACTION_DEFAULTS, nativeMovementSpeed } from './worlds/base/actions.js';
import { nativeInterval } from './temporal-boundaries.js';
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
  itemsForOwner,
} from './item-handling.js';
import { strikeDefinition } from './strikes.js';
import { inspectPossessions } from './inventory-inspection.js';
import { reconcileConditions } from './conditions.js';
import { gatheringYield } from './gathering.js';
import { visibleFeature } from './perception-frame.js';
import { FOLLOW_RULES, updateFollowPath, followUnavailable } from './follow.js';
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
  finishPlanAction,
  readyPlanStep,
  resolvePlanCommand,
} from './agency.js';
import {
  hasWildernessNeeds,
  nativeNeedBelow,
  setWildernessNeed,
  advanceWildernessNeeds,
} from './worlds/base/needs.js';
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
import { experiences } from './experience.js';
import {
  reconcileStatusEffects,
  prepareStatusRates,
  integrateStatusRates,
  mayAdvanceStatusEffects,
  activateStatusEffect,
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
function createAction(world: WorldState, type: Action['type'], seconds: number): Action {
  return {
    id: nextId(world, 'action'),
    type,
    stage: 'working',
    path: [],
    remainingSeconds: seconds,
    totalSeconds: seconds,
    consumed: [],
  };
}
function ammoFor(
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
  if (action.type === 'move')
    return (
      !!action.destination &&
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
  if (action.type === 'cook') return [{ definitionId: 'raw_meat', quantity: 1 }];
  return [];
}
function startWork(world: WorldState, actor: Entity, action: Action): Outcome | null {
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
  const action = createAction(world, 'replenish', definition.reservoir.workSeconds);
  action.targetId = target.id;
  action.attributeId = definition.id;
  action.definitionVersion = definition.version;
  action.resourceDefinition = definitionPin(definition);
  return action;
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
      return executeCommandNative(original, command, options);
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
  options: { preview?: boolean } = {},
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
  const source = getOwn(original.entities, command.actorId);
  if (!source?.actor) return reject('unknown-actor', 'That actor does not exist.');
  if (!activelyParticipates(source))
    return reject('inactive', 'Return to the world before acting.');
  if (
    source.actor.controller === 'player' &&
    command.type === 'strike' &&
    original.entities[command.targetId]?.actor?.controller === 'player'
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
    capabilityBlocked(original, source, 'actions') &&
    !releaseSelf &&
    !['cancel', 'recover'].includes(command.type)
  )
    return reject('capability-restricted', 'This actor cannot act in its current state.');
  if (command.type === 'say' && capabilityBlocked(original, source, 'speech'))
    return reject('capability-restricted', 'Speech is unavailable.');
  if (command.type === 'move' && capabilityBlocked(original, source, 'locomotion'))
    return reject('capability-restricted', 'Movement is unavailable.');
  if (original.paused && command.type !== 'cancel') return reject('paused', 'The world is paused.');
  if ((!source.actor.alive || source.actor.incapacitated) && command.type !== 'recover')
    return reject('not-alive', 'This actor cannot act.');
  if (
    ['gather', 'prepare', 'craft', 'equip', 'hunt', 'harvest', 'cook', 'strike'].includes(
      command.type,
    ) &&
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
      : ['gather', 'harvest', 'hunt', 'replenish', 'strike', 'pickup', 'follow'].includes(
            command.type,
          ) && 'targetId' in command
        ? command.targetId
        : undefined;
  if (scopedTargetId) {
    const target = getOwn(original.entities, scopedTargetId);
    if (!target || !visible(original, source, target))
      return reject('not-visible', 'The action target is not currently perceived.');
  }
  if (command.type === 'pickup') {
    const target = getOwn(original.entities, command.targetId);
    if (!canHandleItems(original, source) || target?.kind !== 'item-pile')
      return reject('unavailable', 'Choose a visible pile and an actor able to handle items.');
    if (
      !portableItems(original, target.id).some(
        (item) => !command.itemId || item.id === command.itemId,
      )
    )
      return reject('empty', 'No matching portable items remain.');
    if (
      capabilityBlocked(original, source, 'locomotion') &&
      !canReachEntity(original, source, target, original.itemHandling.reach)
    )
      return reject('capability-restricted', 'Movement is required to reach this pile.');
  }
  if (
    isRecordedActivityCommand(command) &&
    original.actionExperience.admitted >= ACTIVITY_LIMITS.retainedRecords
  )
    return reject(
      'experience-capacity',
      'The action-record allowance is full. Existing work and history are preserved; new recorded actions need more storage allowance.',
    );
  const world = draftWorld(original);
  const actor = world.entities[command.actorId]!;
  const component = actor.actor!;
  const events: WorldEvent[] = [];
  let result = outcome(true, 'accepted', 'Action started.');
  let action: Action | undefined;
  const experience = isRecordedActivityCommand(command)
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
  switch (command.type) {
    case 'activity':
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
    case 'pickup': {
      action = createAction(world, 'pickup', world.itemHandling.pickupSeconds);
      action.targetId = command.targetId;
      action.itemId = command.itemId;
      break;
    }
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
        if (
          !canAccessContainer(world, actor.id, item.ownerId) ||
          !canAccessContainer(
            world,
            actor.id,
            command.type === 'merge-item'
              ? (itemFor(world, destination.id)?.ownerId ?? '')
              : destination.id,
            command.type === 'transfer-item',
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
          `${actor.name} arranged some belongings.`,
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
    case 'drop': {
      const reason = dropItems(world, actor, command.itemId, command.quantity, events);
      if (reason) return reject('cannot-drop', reason);
      result = outcome(true, 'dropped', 'Items dropped on the ground.');
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
      action = createAction(world, 'follow', 0);
      action.targetId = command.targetId;
      action.follow = { distance: desiredDistance, nextRepathAt: 0 };
      const error = updateFollowPath(world, actor, action);
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
      action = createAction(world, 'move', 0);
      action.destination = { ...command.destination };
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
        );
        component.inventoryInspection = cursor;
        emit(
          world,
          events,
          'inventory-inspected',
          `I inspect my accessible possessions: ${page.join(' ')}${cursor.more ? ' More possessions remain; I can explicitly inspect the next page.' : ' This is the last page.'}`,
          actor,
          undefined,
          { semanticTrigger: true, importance: 6 },
          'private',
        );
        result = outcome(true, 'inventory-inspected', 'Accessible possessions inspected.');
      } catch (error) {
        return reject(
          'inspection-unavailable',
          error instanceof Error ? error.message : 'Inspection unavailable.',
        );
      }
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
      action = createAction(world, 'strike', definition.workSeconds);
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
      action = createAction(world, 'gather', target.resource.workSeconds);
      action.targetId = target.id;
      break;
    }
    case 'replenish': {
      const prepared = prepareReplenishment(world, actor, command.attributeId, command.targetId);
      if ('ok' in prepared) return { world: original, events: [], outcome: prepared };
      action = prepared;
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
      action = createAction(world, 'prepare', preparation.workSeconds);
      action.preparation = command.preparation;
      break;
    }
    case 'craft': {
      const recipe = getOwn(world.recipes, command.recipeId);
      if (!recipe) return reject('unknown-recipe', 'That technique has not been admitted.');
      if (!world.knowledge[actor.id]?.some((record) => record.recipeId === recipe.id))
        return reject('not-learned', 'This actor has not learned that technique.');
      action = createAction(world, 'craft', recipe.workSeconds);
      action.recipeId = recipe.id;
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
        message: `Equipped ${world.itemDefinitions[item.definitionId]!.name}.`,
        itemId: equippedId,
      };
      emit(
        world,
        events,
        'equipped',
        `${actor.name} equipped ${world.itemDefinitions[item.definitionId]!.name}.`,
        actor,
      );
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
      action = createAction(world, 'hunt', SIMULATION_RULES.shotSeconds);
      action.targetId = target.id;
      action.weaponItemId = item.id;
      action.ammoItemId = ammo.id;
      break;
    }
    case 'harvest': {
      const target = getOwn(world.entities, command.targetId);
      if (!target?.remains || target.remains.harvested)
        return reject('not-harvestable', 'There are no unharvested remains there.');
      if (!visible(world, actor, target))
        return reject('not-visible', 'Move within sight of the remains.');
      if (!canCut(world, actor.id))
        return reject('missing-tool', 'A cutting point is needed to prepare the remains.');
      if (experience)
        experience.connections.push(
          ...(world.actionExperience.changes[target.id] ?? [])
            .filter((link) => link.actorId === actor.id)
            .slice(-1)
            .map((link) => ({
              from: link.occurrenceId,
              relation: 'material' as const,
              port: 'remains',
            })),
        );
      action = createAction(world, 'harvest', SIMULATION_RULES.harvestSeconds);
      action.targetId = target.id;
      break;
    }
    case 'cook': {
      const item = itemFor(world, command.itemId);
      const heat = getOwn(world.entities, command.heatId);
      if (
        !item ||
        !accessiblePossession(world, actor.id, item.id) ||
        item.definitionId !== 'raw_meat'
      )
        return reject('not-cookable', 'Choose raw meat in this actor’s inventory.');
      if (!heat?.heat?.lit || !visible(world, actor, heat))
        return reject('no-heat', 'A visible lit campfire is needed.');
      action = createAction(world, 'cook', SIMULATION_RULES.cookSeconds);
      action.itemId = item.id;
      action.heatId = heat.id;
      break;
    }
    case 'eat': {
      if (!hasWildernessNeeds(component))
        return reject('not-applicable', 'This body does not consume food.');
      const item = itemFor(world, command.itemId);
      const definition = item && world.itemDefinitions[item.definitionId];
      if (!item || !accessiblePossession(world, actor.id, item.id) || !definition?.nutrition)
        return reject(
          'not-edible',
          definition?.id === 'raw_meat'
            ? 'Cook raw meat before eating.'
            : 'Choose prepared edible food.',
        );
      if (!takeItem(world, actor.id, item.id, command.id))
        return reject('unavailable', 'That food is no longer available.');
      const beforeFullness = component.fullness!;
      setWildernessNeed(component, 'fullness', component.fullness! + definition.nutrition);
      recordActivityEffect(world, command.id, {
        subjectId: actor.id,
        label: 'Me',
        property: 'fullness',
        before: beforeFullness,
        after: component.fullness!,
      });
      emit(
        world,
        events,
        'ate',
        `${actor.name} ate ${definition.name.toLowerCase()}.`,
        actor,
        undefined,
        { definitionId: definition.id },
      );
      result = outcome(true, 'ate', 'Food restored fullness.');
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
      if (first && alternative?.mode === 'replace') {
        // Disposable native admission, just like menu preview: no effects or RNG are published.
        const preview = executeCommand(original, {
          ...first,
          actorId: actor.id,
          id: `${command.id}:preview`,
        });
        if (!preview.outcome.ok) return reject(preview.outcome.code, preview.outcome.message);
      }
      result = confirmActionRevision(world, actor.id, command.attemptId, command.id);
      break;
    }
    case 'withdraw-attempt': {
      result = withdrawAttempt(component, command.attemptId);
      break;
    }
    case 'cancel': {
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
      if (!canRecoverAtCamp(actor))
        return reject(
          'cannot-recover',
          'Camp recovery is available when health or food is critically low.',
        );
      const recovery = world.participationPolicy?.safeReturnAnchor;
      if (!recovery || !isWalkable(world, recovery, recovery.surfaceId, bodyProfile(actor)))
        return reject('return-unavailable', 'The configured recovery location is unavailable.');
      setSpatialPosition(world, actor, recovery, recovery.surfaceId);
      delete actor.spatial.flight;
      delete actor.spatial.fallVelocity;
      setBodyHealth(component, Math.max(component.health, 65));
      if (hasWildernessNeeds(component)) {
        setWildernessNeed(component, 'fullness', Math.max(component.fullness, 45));
        setWildernessNeed(component, 'energy', Math.max(component.energy, 65));
      }
      component.incapacitated = false;
      component.alive = true;
      interruptStatusEffects(world, actor, events, 'recovery');
      if (component.action) releaseInvocationResources(world, component.action.id);
      component.action = null;
      component.planGeneration++;
      reconcileBody(world, actor, events, 'camp-recovery');
      emit(world, events, 'recovered', `${actor.name} recovered at camp.`, actor);
      result = outcome(true, 'recovered', 'Recovered at camp.');
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
        `${actor.name}: ${command.text.trim()}`,
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
        `${actor.name} taught ${target.name} how to make ${recipe.name.toLowerCase()}.`,
        actor,
        target.id,
        { recipeId: recipe.id },
      );
      result = outcome(true, 'taught', 'The listener learned this specific technique.');
      break;
    }
    default:
      return reject('unsupported', 'This command is not supported.');
  }
  if (action) {
    if (experience) bindActivityAction(world, experience, action.id);
    if (
      ['move', 'gather', 'hunt', 'harvest', 'cook', 'replenish', 'strike', 'pickup'].includes(
        action.type,
      )
    ) {
      const error = approach(world, actor, action);
      if (error) return { world: original, events: [], outcome: error };
    }
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
        ? `${actor.name} started moving to ${Number(action.destination.x.toFixed(1))}, ${Number(action.destination.z.toFixed(1))}.`
        : `${actor.name} started ${action.type === 'prepare' ? `preparing ${action.preparation}` : action.type === 'craft' ? `crafting ${world.recipes[action.recipeId!]!.name}` : action.type}.`,
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
  if (actor.actor!.action)
    finishPlanAction(
      world,
      actor.id,
      actor.actor!.action!.id,
      outcome(false, 'action-failed', reason),
    );
  actor.actor!.action = null;
  emit(world, events, 'action-stopped', `${actor.name} stopped: ${reason}`, actor);
}
function completeAction(
  world: WorldState,
  actor: Entity,
  action: Action,
  events: WorldEvent[],
): void {
  const component = actor.actor!;
  let outputItemId: string | undefined;
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
      const reason = pickUpItems(world, actor, target.id, action.itemId, events);
      if (reason) {
        failAction(world, actor, events, reason);
        return;
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
        `${actor.name} moved to ${Number(worldPosition(actor).x.toFixed(1))}, ${Number(worldPosition(actor).z.toFixed(1))}.`,
        actor,
      );
      break;
    case 'replenish':
      emit(
        world,
        events,
        'replenished',
        `${actor.name} finished replenishing.`,
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
      // Carried compatible tools select one bounded yield; they never multiply finite supply.
      // docs/architecture.md#shared-invention-workflow
      const toolYield = gatheringYield(
        inventoryFor(world, actor.id).map((item) => world.itemDefinitions[item.definitionId]),
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
        `${actor.name} gathered ${quantity} ${world.itemDefinitions[target.resource.definitionId]!.name.toLowerCase()}.`,
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
        `${actor.name} prepared ${preparation.outputQuantity} ${world.itemDefinitions[preparation.output]!.name.toLowerCase()}.`,
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
      const itemId = produce(recipe.outputDefinitionId, 1);
      outputItemId = itemId;
      emit(
        world,
        events,
        'crafted',
        `${actor.name} made ${recipe.output.name.toLowerCase()}.`,
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
        target.animal.fleeFrom = { ...worldPosition(actor) };
        target.animal.fleeSeconds = 110;
      }
      emit(
        world,
        events,
        'struck',
        `${actor.name} ${definition.pastTense} ${target.name} for ${damage} damage.`,
        actor,
        target.id,
        { definitionId: definition.id, damage, actionId: action.id },
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
      const accuracy = launcher.accuracy * (target.animal.fleeSeconds > 0 ? 0.85 : 1);
      const hit = nextRandom(world) < accuracy;
      action.strikeOutcome = hit ? 'hit' : 'miss';
      const damage = hit ? launcher.damage + bonus : 0;
      const actualDamage = Math.min(target.actor!.health, damage);
      target.animal.fleeFrom = { ...worldPosition(actor) };
      target.animal.fleeSeconds = 110;
      emit(
        world,
        events,
        'shot',
        `${actor.name} ${hit ? `hit the ${target.actor!.species} for ${actualDamage} damage` : `missed the ${target.actor!.species}`}. One projectile was used.`,
        actor,
        target.id,
        { hit, damage: actualDamage, ammunitionKind: launcher.ammunitionKind, actionId: action.id },
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
      if (!target?.remains || target.remains.harvested || !canCut(world, actor.id)) {
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
        `${actor.name} harvested meat and bone from the remains.`,
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
      outputItemId = produce('cooked_meat', 1);
      emit(
        world,
        events,
        'cooked',
        `${actor.name} cooked meat over the campfire.`,
        actor,
        action.heatId,
      );
      break;
    }
  }
  finishPlanAction(world, actor.id, action.id, {
    ...outcome(
      true,
      action.strikeOutcome ?? 'completed',
      action.strikeOutcome
        ? `The ${action.type === 'hunt' ? 'shot' : 'strike'} ${action.strikeOutcome === 'hit' ? 'hit' : 'missed'}; this one attempt has ended.`
        : `${action.type} completed.`,
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
  if (action.targetId && !activelyParticipates(world.entities[action.targetId])) {
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
  if (action.type === 'follow') {
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
      failAction(world, actor, events, error.message);
      return;
    }
    // A moving target may enter reach during this phase. Work begins at that
    // endpoint, never retroactively over the preceding approach interval.
    seconds = 0;
  }
  if (
    ['gather', 'harvest', 'cook', 'pickup'].includes(action.type) &&
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
      target.animal.fleeFrom = { ...worldPosition(actor) };
      target.animal.fleeSeconds = 110;
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
      `${actor.name} ${hit ? 'hit' : 'missed'} ${target.name} with ${world.itemDefinitions[definition.id]!.name}.${hit ? ` ${damage} damage.` : inRange ? '' : ' The target moved out of reach.'}`,
      actor,
      target.id,
      {
        definitionId: definition.id,
        weaponItemId: action.weaponItemId,
        actionId: action.id,
        hit,
        damage,
        reason: hit ? 'hit' : inRange ? 'accuracy' : 'out-of-range',
        semanticTrigger: true,
      },
    );
    return;
  }
  if (action.remainingSeconds === 0) completeAction(world, actor, action, events);
}
function advanceAnimal(world: WorldState, entity: Entity, seconds: number): void {
  const animal = entity.animal;
  if (
    !animal ||
    !entity.actor?.alive ||
    entity.actor.incapacitated ||
    entity.actor.action ||
    entity.spatial.flight ||
    entity.spatial.fallVelocity !== undefined
  )
    return;
  if (animal.fleeSeconds > 0 && animal.fleeFrom) {
    animal.fleeSeconds = Math.max(0, animal.fleeSeconds - seconds);
    let dx = worldPosition(entity).x - animal.fleeFrom.x;
    let dz = worldPosition(entity).z - animal.fleeFrom.z;
    const length = Math.hypot(dx, dz) || 1;
    dx /= length;
    dz /= length;
    for (const vector of [
      { y: 0, x: dx, z: dz },
      { y: 0, x: -dz, z: dx },
      { y: 0, x: dz, z: -dx },
    ]) {
      const destination = {
        y: 0,
        x: worldPosition(entity).x + vector.x * nativeMovementSpeed(entity, true) * seconds,
        z: worldPosition(entity).z + vector.z * nativeMovementSpeed(entity, true) * seconds,
      };
      const point = sameSurfacePoint(world, entity, destination.x, destination.z),
        start = supportedPosition(entity);
      if (point && start && canWalkSegment(spatialMap(world), start, point, bodyProfile(entity))) {
        setSpatialPosition(world, entity, point, point.surfaceId);
        break;
      }
    }
  } else {
    animal.wanderSeconds -= seconds;
    if (animal.wanderSeconds <= 0) {
      const angle = nextRandom(world) * Math.PI * 2;
      const destination = {
        y: 0,
        x: worldPosition(entity).x + Math.cos(angle) * 0.4,
        z: worldPosition(entity).z + Math.sin(angle) * 0.4,
      };
      const point = sameSurfacePoint(world, entity, destination.x, destination.z),
        start = supportedPosition(entity);
      if (point && start && canWalkSegment(spatialMap(world), start, point, bodyProfile(entity)))
        setSpatialPosition(world, entity, point, point.surfaceId);
      // Retain overshoot. The base horizon is shorter than this minimum wait.
      animal.wanderSeconds += 120 + Math.floor(nextRandom(world) * 120);
    }
  }
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
};
const nativeContinuations = new WeakMap<
  WorldState,
  {
    mechanics: NativeMechanics;
    participants: ReturnType<typeof nativeParticipants>;
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
    stateChangeRevision(world, 'participation');
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
  while (
    remaining > 0 &&
    intervals < maxIntervals &&
    motionSlices < 4096 &&
    !navigationBlocked(world, participants.actors)
  ) {
    // A tiny retained remainder is a forecast, not authority to advance the clock.
    // Recompute from current state; only a real predicate may require a micro-interval.
    if (mechanics && mechanics.remainingSeconds <= TIME_EPSILON) mechanics = undefined;
    const beforeState = mechanicalRevision(world);
    let statusIds = participants.statuses;
    if (!mechanics) {
      reconcileResourceReservations(world);
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
      if (!component.alive || component.incapacitated) continue;
      reconcileConditions(world, actor, events);
      if (!capabilityBlocked(world, actor, 'actions')) nativeReservoirResponse(world, actor);
      const step = readyPlanStep(world, actorId);
      if (step) {
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
        mechanics = undefined;
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
        mechanics = undefined;
    }
    if (world.nextId !== beforeDecisions) mechanics = undefined;
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
      withStableAudience(world, () => {
        occurrences.sort((a, b) => (a[4]?.id ?? '').localeCompare(b[4]?.id ?? ''));
        for (const occurrence of occurrences) emit(...occurrence);
      });
      occurrences.length = 0;
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
    flushFlight();
    // Grounding predicates may change even without changing an active status episode.
    if (events.length !== beforeStartEvents || mechanicalRevision(world) !== beforeState)
      mechanics = undefined;
    // Nested commands can replace entities or status attributes. Reuse the speech branch's
    // conservative roster helper; never retain revoked draft references across that boundary.
    statusIds = participants.statuses;
    for (const id of statusIds) reconcileStatusEffects(world, world.entities[id]!, events);
    if (events.length !== beforeStartEvents || mechanicalRevision(world) !== beforeState)
      mechanics = undefined;
    if (navigationBlocked(world, participants.actors)) break;
    const intervalState = mechanicalRevision(world);
    if (!mechanics) {
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
      mechanics = {
        remainingSeconds: interval.seconds,
        interval,
        status,
        travelFor,
        reactiveActors,
      };
    }
    const { interval, status, travelFor } = mechanics;
    const seconds = nativeMotionInterval(
      world,
      Math.min(remaining, mechanics.remainingSeconds),
      participants.ambient,
      travelFor,
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
    world.simTime += seconds;
    remaining = Math.max(0, remaining - seconds);
    mechanics.remainingSeconds = Math.max(0, mechanics.remainingSeconds - seconds);
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
          !(e.animal.fleeSeconds > 0 && e.animal.fleeFrom) &&
          !movementRestricted.has(id)
        );
      })
      .sort(
        (a, b) =>
          world.entities[a]!.animal!.wanderSeconds - world.entities[b]!.animal!.wanderSeconds ||
          a.localeCompare(b),
      );
    const wandered = new Set(wanderers);
    for (const id of wanderers) advanceAnimal(world, world.entities[id]!, seconds);
    occupancy = undefined;
    const landings = new Set(
      participants.ambient.filter((id) => landingDue(world, world.entities[id]!, seconds)),
    );
    const movementOrder = [...participants.ambient.filter((id) => !landings.has(id)), ...landings];
    for (const id of movementOrder) {
      yield;
      const entity = world.entities[id];
      if (!entity) continue;
      if (!movementRestricted.has(id)) {
        const flightOwned = !!entity.spatial.flight || entity.spatial.fallVelocity !== undefined;
        advanceFlight(world, entity, seconds, events, landingOccupancy, deferFlight);
        // Landing grants future animal movement, never the flight interval just consumed.
        if (!flightOwned && !wandered.has(id)) advanceAnimal(world, entity, seconds);
      }
      trackOccupancy(entity);
    }
    const movedWithOccurrences = occurrences.length > 0;
    flushFlight();
    const beforeEffects = events.length;
    integrateStatusRates(world, status, seconds, events);
    for (const id of participants.actors) {
      const actor = world.entities[id],
        component = actor?.actor;
      if (!actor || !component?.alive || component.incapacitated) continue;
      if (
        hasWildernessNeeds(component) &&
        advanceWildernessNeeds(
          actor,
          seconds,
          interval.exhausted.has(id) ? seconds : 0,
          interval.starving.has(id) ? seconds : 0,
        )
      )
        reconcileBody(world, actor, events, 'needs');
      reconcileConditions(world, actor, events);
      if (!component.alive || component.incapacitated) continue;
      advanceReservoirs(world, actor, seconds, events);
      if (working.get(id) === component.action?.id) {
        const following = component.action?.type === 'follow';
        const stage = component.action?.stage;
        advanceAction(world, actor, following ? 0 : seconds, events);
        if (following && component.action?.stage !== stage) mechanics.remainingSeconds = 0;
      }
    }
    for (const id of participants.ambient) {
      const entity = world.entities[id];
      if (entity?.heat?.lit) {
        entity.heat.fuelSeconds = Math.max(0, entity.heat.fuelSeconds - seconds);
        if (entity.heat.fuelSeconds === 0) {
          entity.heat.lit = false;
          emit(world, events, 'fire-out', 'The campfire ran out of fuel.', entity);
        }
      }
      yield;
    }
    for (const id of statusIds) {
      const entity = world.entities[id];
      if (entity) reconcileStatusEffects(world, entity, events);
    }
    // Arrival starts new work now; only work already active at the start receives elapsed time.
    for (const id of participants.actors) {
      const actor = world.entities[id];
      if (
        actor?.actor?.alive &&
        !actor.actor.incapacitated &&
        actor.actor.action?.stage === 'approaching' &&
        !capabilityBlocked(world, actor, 'locomotion')
      )
        advanceAction(world, actor, 0, events);
    }
    reconcileResourceReservations(world);
    advanceAppraisals(world, events);
    const sharedBoundary =
      mechanics.remainingSeconds === 0 ||
      movementEffects ||
      events.length !== beforeEffects ||
      mechanicalRevision(world) !== intervalState;
    if (sharedBoundary || slicesSinceBoundary === 32) {
      intervals++;
      slicesSinceBoundary = 0;
    }
    if (sharedBoundary || movedWithOccurrences) mechanics = undefined;
    yield* updateEncounters(world, before, events, participants.actors);
    advanceCommitments(world, events);
    reconcileConversations(world);
    // Control-only waits must observe endpoint changes even when this advance
    // ends exactly at the deadline. Queue future work without granting it time.
    for (const id of participants.actors) {
      const plan = world.entities[id]?.actor?.agency.plan;
      if (plan?.status === 'active' && plan.activity?.pending.at(-1)?.node.kind === 'wait') {
        const revision = plan.revision;
        readyPlanStep(world, id);
        if (plan.revision !== revision) mechanics = undefined;
      }
    }
    if (remaining > 0 && intervals < maxIntervals && motionSlices < 4096) {
      if (yield 'boundary') break;
      before = snapshotEncounters(world);
    }
  }
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
    nativeContinuations.set(result.world, { mechanics, participants });
  return result;
}

const episodeMembership = new WeakMap<object, { people: string[]; objects: string[] }>();
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
    if (Object.keys(world.perceptionEpisodes?.[id] ?? {}).length)
      world.perceptionEpisodes![id] = {};
    if (observer?.actor && Object.keys(observer.actor.contacts ?? {}).length)
      observer.actor.contacts = {};
  }
  // Read-only perception captures transforms once after movement, avoiding repeated proxy walks.
  // Snapshot identity, transforms and body height; event mutations still use the authoritative draft.
  const entities = worldRootEntities(world, true)
    .filter(activelyParticipates)
    .map((entity) => {
      const position = worldPosition(entity),
        profile = bodyProfile(entity);
      return {
        entity,
        id: entity.id,
        position: isDraft(position) ? current(position) : position,
        height: profile.height,
        radius: profile.radius,
        alive: !!entity.actor?.alive,
        memory: hasMemory(entity),
        object: !entity.actor && !entity.animal,
        ...visibleFeature(entity),
      };
    });
  const nearby = spatialCandidates(entities.filter((e) => e.alive));
  let nearbyAll: ReturnType<typeof spatialCandidates<(typeof entities)[number]>> | undefined;
  const maximumBodyHeight = entities.reduce(
    (largest, entity) => Math.max(largest, entity.height),
    0,
  );
  const maximumBodyRadius = entities.reduce(
    (largest, entity) => Math.max(largest, entity.radius),
    0,
  );
  const featureState = world.perceptionFeatures;
  const previousFeatures = isDraft(featureState) ? current(featureState) : featureState;
  const changedFeatures = new Map(
    entities
      .filter(
        (source) =>
          previousFeatures[source.id] !== undefined &&
          previousFeatures[source.id] !== source.feature,
      )
      .map((source) => [source.id, source.detail]),
  );
  const changedExposure = exposureChanges(world, original, spatialMap(world), entities);
  const objectsFor = objectExposureQuery(
    world,
    entities.filter((e) => e.object),
  );
  // A blocked observer still reconciles the loss of its visual episodes. Skipping the
  // observer here would let waking reuse an episode from before perception was lost.
  for (const actor of entities.filter((e) => e.alive && e.memory)) {
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
    const signature = `${radius}:${bodyProfile(actor.entity).eyeHeight}:${touch?.id ?? ''}:${touchRadius}:${movingContacts}:${blocked}:${world.moduleManifest.revision}`;
    if (
      !changedExposure(actor, Math.max(radius + 2, touch ? touchRadius : 0), signature) &&
      !movingContacts
    )
      continue;
    // Captured entities are read-only phase snapshots; contact writes belong to the live draft.
    if (touch || contacts.length)
      yield* updateContactEpisodes(
        world,
        original.positions,
        world.entities[actor.id]!,
        events,
        () => {
          // Size the optional contact grid from physical extents, never visual range.
          nearbyAll ??= spatialCandidates(
            entities,
            Math.max(maximumBodyRadius * 2, maximumBodyHeight) + SPATIAL_LIMITS.epsilon,
          );
          return nearbyAll(actor.position, touchRadius);
        },
      );
    if (radius === 0 || blocked) {
      if (world.visiblePeople?.[actor.id]?.length) world.visiblePeople[actor.id] = [];
      if (world.visibleObjects?.[actor.id]?.length) world.visibleObjects[actor.id] = [];
      if (Object.keys(world.perceptionEpisodes?.[actor.id] ?? {}).length)
        world.perceptionEpisodes![actor.id] = {};
      continue;
    }
    const previous = original.visiblePeople?.[actor.id] ?? [];
    let seen = nearby(actor.position, radius + 2)
      .filter((e) => e.id !== actor.id && e.alive && sees(e))
      .map((e) => e.id);
    let objectIds = objectsFor(actor.entity);
    const previousObjects = original.visibleObjects?.[actor.id];
    const samePeople = seen.length === previous.length && seen.every((id, i) => id === previous[i]);
    const sameObjects =
      !!previousObjects &&
      (objectIds === previousObjects ||
        (objectIds.length === previousObjects.length &&
          objectIds.every((id, i) => id === previousObjects[i])));
    if (samePeople) seen = previous;
    if (sameObjects) objectIds = previousObjects!;
    // Persistent exposure episodes do not imply identity recognition across a disappearance.
    // docs/knowledge.md#subject-binding
    const priorEpisodes = original.perceptionEpisodes?.[actor.id] ?? {};
    const certified = Object.isFrozen(priorEpisodes)
      ? episodeMembership.get(priorEpisodes)
      : undefined;
    if (certified?.people !== seen || certified.objects !== objectIds) {
      const exposed = [...seen, ...objectIds];
      if (
        exposed.length !== Object.keys(priorEpisodes).length ||
        exposed.some((id) => !priorEpisodes[id])
      )
        (world.perceptionEpisodes ??= {})[actor.id] = Object.fromEntries(
          exposed.map((id) => [
            id,
            priorEpisodes[id] ?? `${world.sequence}:${world.simTime}:${id}`,
          ]),
        );
      else if (Object.isFrozen(priorEpisodes))
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
      // Encounter emission adds awareness, not memories. Read the current immutable
      // memory snapshot once instead of rescanning/proxying it for every new contact.
      const entries = world.memories[actor.id] ?? [];
      const records = isDraft(entries) ? current(entries) : entries;
      const recent = new Set<string>();
      for (const memory of records)
        if (
          memory.kind === 'episode' &&
          (memory.summary.startsWith('I saw ') || memory.eventType === 'encounter') &&
          world.simTime - memory.at < 3600
        )
          for (const id of memory.entityIds) recent.add(id);
      for (const id of newlySeen) {
        if (!recent.has(id))
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
        if (detail && (samePeople || previouslySeen!.has(id)))
          encounter(actor.entity, id, SIGHTING_POLICY.changedBeing, detail);
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
        if (detail && (sameObjects || priorObjects!.has(id)))
          encounter(actor.entity, id, SIGHTING_POLICY.routine, detail);
      }
    }
    encounter.flush();
  }
  encounter.flush();
  if (
    entities.length !== Object.keys(previousFeatures).length ||
    entities.some((source) => previousFeatures[source.id] !== source.feature)
  )
    world.perceptionFeatures = Object.fromEntries(
      entities.map((source) => [source.id, source.feature]),
    );
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
    .filter((recipe) => !!recipe);
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
        name: observerDescription(world, actorId, entity.id),
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
    itemDefinitions: [...definitionIds].map((id) => world.itemDefinitions[id]!).filter(Boolean),
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

/** Personal playtest assistance, shared by admission and public affordances. */
export function canRecoverAtCamp(entity: Entity): boolean {
  const actor = entity.actor;
  return (
    !!actor &&
    actor.controller === 'player' &&
    (actor.incapacitated || actor.health < 30 || nativeNeedBelow(actor, 'fullness', 20))
  );
}
