import { advanceAppraisals } from './appraisals.js';
import { advanceCapabilityContributions } from './state-contributions.js';
import {
  WorkBudgetError,
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
import { observerDescription } from './worlds/base/knowledge.js';
import { setBodyHealth } from './body-state.js';
import {
  ResourceReservationError,
  applyResourceGroup,
  availableItemQuantity,
  applyResourcePhase,
  reconcileResourceReservations,
  releaseInvocationResources,
  availableResource,
  itemDefinitionPin,
  readResource,
  type ResourceOperation,
} from './resource-claims.js';
import { sameDefinitionPin } from './state-owners.js';
import { BASE_ACTION_DEFAULTS } from './worlds/base/actions.js';
import {
  canHandleItems,
  portableItems,
  pickUpItems,
  dropItems,
  itemsForOwner,
} from './item-handling.js';
import { strikeDefinition } from './strikes.js';
import { gatheringYield } from './gathering.js';
import { current, isDraft } from 'immer';
import {
  canWalkSegment,
  finitePoint,
  interpolate,
  SPATIAL_LIMITS,
  type SurfacePoint,
} from '@open-legend/spatial';
import { bodyProfile, setSpatialPosition, spatialMap, supportedPosition } from './spatial-state.js';
import { advanceFlight, LandingOccupancy } from './flight.js';
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
import { changeConversation } from './conversations.js';
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
  advanceStatusEffects,
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
  visionRadius,
  visionQuery,
  sensesFor,
  contactViews,
  bodiesTouch,
  directProbe,
} from './perception.js';
import {
  distance,
  findPath,
  hasLineOfSight,
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
  version: 2,
  fixedStepSeconds: 1,
  maxAdvanceSeconds: 86400,
  ...BASE_ACTION_DEFAULTS,
} as const;

export function inventoryFor(world: WorldState, actorId: string): ItemInstance[] {
  return itemsForOwner(world, actorId).filter((item) => item.quantity > 0);
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
function takeItem(world: WorldState, actorId: string, itemId: string): ItemInstance | null {
  const item = itemFor(world, itemId);
  if (!item || item.ownerId !== actorId || item.quantity < 1) return null;
  const taken = { ...item, quantity: 1 };
  const definition = world.itemDefinitions[item.definitionId];
  if (
    !definition ||
    applyResourceGroup(
      world,
      {
        invocationId: world.entities[actorId]?.actor?.action?.id ?? `native:${actorId}`,
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
  if (action.type === 'strike') return strikeDefinition(action.definitionId)?.range ?? 0;
  if (action.type !== 'hunt') return SIMULATION_RULES.interactionRadius;
  const range =
    world.itemDefinitions[itemFor(world, action.weaponItemId ?? '')?.definitionId ?? '']?.launcher
      ?.range ?? 0;
  // Approach far enough that even the shortest admitted launcher can finish its
  // wind-up while a fleeing animal moves. Completion still rechecks actual range.
  return Math.max(
    0.5,
    range - SIMULATION_RULES.animalFleeTilesPerSecond * SIMULATION_RULES.shotSeconds - 0.25,
  );
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
      distance(origin, action.destination) <= 0.015
    );
  const target = actionTarget(world, action);
  return !!target && canReachEntity(world, actor, target, actionReach(world, action), origin);
}
function approachPath(world: WorldState, actor: Entity, action: Action): SurfacePoint[] | null {
  if (!supportedPosition(actor)) return null;
  const destination = targetPosition(world, action);
  if (!destination) return null;
  if (visionRadius(world, actor) === 0)
    return directProbe(
      world,
      worldPosition(actor),
      destination,
      worldSupport(actor)!,
      action.type === 'move'
        ? action.destination!.surfaceId
        : (worldSupport(actionTarget(world, action)) ?? undefined),
    );
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
  action.stage = 'approaching';
  action.path = path;
  return null;
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
    const selected = itemClaims(world, actor.id, input.definitionId, input.quantity);
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
    applyResourcePhase(
      world,
      {
        id: 'native-action-inputs-v1',
        groups: [
          {
            invocationId: action.id,
            fulfillment: 'all-or-nothing',
            operations: claims,
          },
        ],
      },
      [],
    )[0]?.status !== 'applied'
  )
    return outcome(false, 'missing-material', 'The required materials are no longer available.');
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
  if (!command || !validId(command.id) || !validId(command.actorId))
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
      : ['gather', 'harvest', 'hunt', 'replenish', 'strike', 'pickup'].includes(command.type) &&
          'targetId' in command
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
  const world = draftWorld(original);
  const actor = world.entities[command.actorId]!;
  const component = actor.actor!;
  const events: WorldEvent[] = [];
  let result = outcome(true, 'accepted', 'Action started.');
  let action: Action | undefined;
  switch (command.type) {
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
      const item = itemFor(world, command.itemId),
        destination = getOwn(world.entities, command.targetId);
      if (!canHandleItems(world, actor) || component.action || !item || !destination)
        return reject('unavailable', 'Stop current work and choose an accessible possession.');
      try {
        if (custodian(world, item.id) !== actor.id || custodian(world, destination.id) !== actor.id)
          return reject('unavailable', 'Choose an accessible possession and destination.');
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
    case 'strike': {
      const definition = strikeDefinition(command.definitionId);
      const target = getOwn(world.entities, command.targetId);
      if (!definition) return reject('unknown-action', 'Choose a registered strike.');
      if (!target?.actor?.alive || target.id === actor.id)
        return reject('invalid-target', 'Choose another living actor.');
      if (!definition.autoMoveToRange && !canReachEntity(world, actor, target, definition.range))
        return reject('out-of-range', 'Move within strike range first.');
      action = createAction(world, 'strike', definition.workSeconds);
      action.definitionId = definition.id;
      action.definitionVersion = definition.version;
      action.targetId = target.id;
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
        item.ownerId !== actor.id ||
        !(
          world.itemDefinitions[item.definitionId]?.launcher ||
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
      const target = getOwn(world.entities, command.targetId);
      if (!(target?.animal && target.actor?.alive))
        return reject('not-huntable', 'Choose a living animal.');
      if (!visible(world, actor, target))
        return reject('not-visible', 'The animal is out of sight.');
      const weaponItemId = command.weaponItemId ?? component.equippedItemId ?? '';
      const item = itemFor(world, weaponItemId);
      const launcher = item && world.itemDefinitions[item.definitionId]?.launcher;
      if (!item || item.ownerId !== actor.id || !launcher)
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
      action = createAction(world, 'harvest', SIMULATION_RULES.harvestSeconds);
      action.targetId = target.id;
      break;
    }
    case 'cook': {
      const item = itemFor(world, command.itemId);
      const heat = getOwn(world.entities, command.heatId);
      if (!item || item.ownerId !== actor.id || item.definitionId !== 'raw_meat')
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
      if (!item || item.ownerId !== actor.id || !definition?.nutrition)
        return reject(
          'not-edible',
          definition?.id === 'raw_meat'
            ? 'Cook raw meat before eating.'
            : 'Choose prepared edible food.',
        );
      if (!takeItem(world, actor.id, item.id))
        return reject('unavailable', 'That food is no longer available.');
      setWildernessNeed(component, 'fullness', component.fullness! + definition.nutrition);
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
      if (component.action) releaseInvocationResources(world, component.action.id);
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
      const target = command.targetId ? getOwn(world.entities, command.targetId) : undefined;
      const intendedRecipientId = command.targetId ?? command.intendedRecipientId;
      if (intendedRecipientId && !getOwn(world.entities, intendedRecipientId))
        return reject('invalid-recipient', 'The intended recipient no longer exists.');
      if (
        command.targetId &&
        (!target?.actor?.alive || !hasMemory(target) || !hearsEntity(world, target, actor))
      )
        return reject('not-heard', 'The listener is not within hearing range.');
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
        },
      );
      result = outcome(true, 'spoken', 'Speech delivered to nearby listeners.');
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
      if (!target?.actor?.alive || !hasMemory(target) || !hearsEntity(world, target, actor))
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
    if (
      ['move', 'gather', 'hunt', 'harvest', 'cook', 'replenish', 'strike', 'pickup'].includes(
        action.type,
      )
    ) {
      const error = approach(world, actor, action);
      if (error) return { world: original, events: [], outcome: error };
    }
    if (action.stage === 'working') {
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
    component.action = action;
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
  world.commandReceipts[command.id] = { digest, outcome: result };
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
      outputItemId = addItem(world, actor.id, target.resource.definitionId, quantity);
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
      outputItemId = addItem(world, actor.id, preparation.output, preparation.outputQuantity);
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
      const itemId = addItem(world, actor.id, recipe.outputDefinitionId, 1);
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
      const definition = strikeDefinition(action.definitionId);
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
        weapon.ownerId !== actor.id ||
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
      if (!takeItem(world, actor.id, ammunition.id)) {
        failAction(world, actor, events, 'compatible ammunition is no longer available.');
        return;
      }
      const accuracy = launcher.accuracy * (target.animal.fleeSeconds > 0 ? 0.85 : 1);
      const hit = nextRandom(world) < accuracy;
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
        { hit, damage: actualDamage, ammunitionKind: launcher.ammunitionKind },
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
        addItem(world, actor.id, yieldItem.definitionId, yieldItem.quantity);
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
      outputItemId = addItem(world, actor.id, 'cooked_meat', 1);
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
    ...outcome(true, 'completed', `${action.type} completed.`),
    ...(outputItemId ? { itemId: outputItemId } : {}),
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
  while (path.length && remaining > 0) {
    const point = path[0]!,
      start = supportedPosition(actor);
    if (!start || !canWalkSegment(map, start, point, profile)) return false;
    const delta = distance(start, point);
    if (delta <= remaining) {
      setSpatialPosition(world, actor, point, point.surfaceId);
      path.shift();
      remaining -= delta;
    } else {
      setSpatialPosition(
        world,
        actor,
        interpolate(start, point, remaining / delta),
        start.surfaceId,
      );
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
    strikeDefinition(action.definitionId)?.version !== action.definitionVersion
  ) {
    failAction(world, actor, events, 'the strike definition is unavailable or changed.');
    return;
  }
  if (action.stage === 'approaching') {
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
    if (!actionInReach(world, actor, action)) {
      const last = action.path.at(-1);
      const endpointUseful =
        last &&
        (action.type === 'move'
          ? last.surfaceId === action.destination!.surfaceId &&
            distance(last, action.destination!) <= 0.015
          : canReachEntity(
              world,
              actor,
              actionTarget(world, action)!,
              actionReach(world, action),
              last,
            ));
      if (!endpointUseful) {
        const path = approachPath(world, actor, action);
        if (!path) {
          failAction(world, actor, events, 'no supported route remains.');
          return;
        }
        action.path = path;
      }
      if (
        !moveAlongPath(
          world,
          actor,
          action.path,
          SIMULATION_RULES.movementTilesPerSecond *
            seconds *
            (1 - (actor.actor?.body?.conditions.injury ?? 0) / 200),
        )
      )
        failAction(world, actor, events, 'the route became physically blocked.');
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
  if (action.remainingSeconds === 0) completeAction(world, actor, action, events);
}
function advanceAnimal(world: WorldState, entity: Entity, seconds: number): void {
  const animal = entity.animal;
  if (
    !animal ||
    !entity.actor?.alive ||
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
        x:
          worldPosition(entity).x +
          vector.x *
            SIMULATION_RULES.animalFleeTilesPerSecond *
            seconds *
            (1 - (entity.actor?.body?.conditions.injury ?? 0) / 200),
        z:
          worldPosition(entity).z +
          vector.z *
            SIMULATION_RULES.animalFleeTilesPerSecond *
            seconds *
            (1 - (entity.actor?.body?.conditions.injury ?? 0) / 200),
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
      animal.wanderSeconds = 120 + Math.floor(nextRandom(world) * 120);
    }
  }
}

/** Native urgency uses only carried food and currently visible resources; it is not an AI impersonation. */
function nativeSurvival(world: WorldState, actor: Entity, events: WorldEvent[]): void {
  const component = actor.actor!;
  if (
    !hasWildernessNeeds(component) ||
    component.controller !== 'npc' ||
    !component.alive ||
    component.incapacitated
  )
    return;
  if (component.fullness < 38) {
    const food = inventoryFor(world, actor.id).find(
      (item) =>
        !!world.itemDefinitions[item.definitionId]?.nutrition &&
        availableItemQuantity(world, item.id) > 0,
    );
    if (food) {
      interruptStatusEffects(world, actor, events, 'hunger');
      if (capabilityBlocked(world, actor, 'actions')) return;
      const definition = world.itemDefinitions[food.definitionId]!;
      if (!takeItem(world, actor.id, food.id)) return;
      setWildernessNeed(component, 'fullness', component.fullness + definition.nutrition!);
      emit(
        world,
        events,
        'ate',
        `${actor.name} ate ${definition.name.toLowerCase()} to stave off hunger.`,
        actor,
      );
      return;
    }
  }
  if (component.action && component.fullness > 10 && component.energy > 5) return;
  if (component.fullness < 42) {
    const resource = worldRootEntities(world)
      .filter(
        (entity) =>
          entity.resource?.definitionId === 'berries' &&
          entity.resource.quantity > 0 &&
          visible(world, actor, entity),
      )
      .sort(
        (a, b) =>
          distance(worldPosition(actor), worldPosition(a)) -
          distance(worldPosition(actor), worldPosition(b)),
      )[0];
    if (
      resource &&
      component.action?.type === 'gather' &&
      world.entities[component.action.targetId ?? '']?.resource?.definitionId === 'berries'
    )
      return;
    if (resource) {
      const action = createAction(world, 'gather', resource.resource!.workSeconds);
      action.targetId = resource.id;
      if (!approach(world, actor, action)) {
        interruptStatusEffects(world, actor, events, 'hunger');
        if (
          capabilityBlocked(world, actor, 'actions') ||
          component.action?.type === 'status-effect'
        )
          return;
        component.action = action;
        component.planGeneration++;
      }
      return;
    }
  }
}

/** A low reservoir can use finite nearby supply without model calls or a goal record. */
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
 * Compile IDs outside the draft so inert scenery is not proxied/sorted every second. A nested
 * command can install a new world; refresh there before the next native phase. Future native
 * spawning/component mutations must also refresh this roster, never retain revoked draft entities.
 * docs/performance.md#simulation-cpu-and-growing-history
 */
function nativeParticipants(world: WorldState): { actors: string[]; ambient: string[] } {
  const active = worldRootEntities(world)
    .filter((e) => activelyParticipates(e) && (e.actor || e.animal || e.heat))
    .sort((a, b) => a.id.localeCompare(b.id));
  return {
    actors: active.filter((e) => e.actor).map((e) => e.id),
    ambient: active.map((e) => e.id),
  };
}

/** Advance bounded one-second native steps. Paused time and absent-player catch-up are never inferred. */
export function advanceWorld(original: WorldState, elapsedSimSeconds: number): Transition {
  const nested = inWorkGroup();
  try {
    return withWorkMeter(WORK_LIMITS.group, () => advanceWorldNative(original, elapsedSimSeconds));
  } catch (error) {
    if (!(error instanceof WorkBudgetError || error instanceof ResourceReservationError) || nested)
      throw error;
    return { world: original, events: [], outcome: outcome(false, error.code, error.message) };
  }
}

function advanceWorldNative(original: WorldState, elapsedSimSeconds: number): Transition {
  if (
    !Number.isFinite(elapsedSimSeconds) ||
    elapsedSimSeconds < 0 ||
    elapsedSimSeconds > SIMULATION_RULES.maxAdvanceSeconds
  )
    return {
      world: original,
      events: [],
      outcome: outcome(
        false,
        'invalid-duration',
        'Advance duration must be between zero and one simulated day.',
      ),
    };
  if (original.paused || elapsedSimSeconds === 0)
    return {
      world: original,
      events: [],
      outcome: outcome(
        true,
        original.paused ? 'paused' : 'unchanged',
        original.paused ? 'World time is paused.' : 'No time elapsed.',
      ),
    };
  let participants = nativeParticipants(original);
  let world = draftWorld(original);
  const events: WorldEvent[] = [];
  let remaining = elapsedSimSeconds;
  while (remaining > 0) {
    const seconds = Math.min(1, remaining);
    remaining -= seconds;
    world.simTime += seconds;
    reconcileResourceReservations(world);
    advanceAppraisals(world, events);
    // Status operations also apply to non-actor entities, in saved entity/definition order.
    for (const entity of worldRootEntities(world))
      if (activelyParticipates(entity)) advanceStatusEffects(world, entity, seconds, events);
      else advanceCapabilityContributions(world, entity, events);
    // Stable actor order resolves finite-resource claims; no asynchronous writer mutates a step.
    for (const actorId of participants.actors) {
      let actor = world.entities[actorId]!;
      let component = actor.actor!;
      if (!component.alive || component.incapacitated) continue;
      if (hasWildernessNeeds(component)) {
        if (advanceWildernessNeeds(actor, seconds)) reconcileBody(world, actor, events, 'needs');
        if (component.health === 0) continue;
        if (!capabilityBlocked(world, actor, 'actions') || component.fullness < 10)
          nativeSurvival(world, actor, events);
      }
      advanceReservoirs(world, actor, seconds, events);
      if (!capabilityBlocked(world, actor, 'actions')) nativeReservoirResponse(world, actor);
      const step = readyPlanStep(world, actorId);
      if (step) {
        const stepId = step.id;
        const command = resolvePlanCommand(component.agency.plan!, step);
        const transition = command
          ? executeCommand(world, command)
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
      if (
        !capabilityBlocked(world, actor, 'locomotion') ||
        component.action?.type === 'status-effect' ||
        component.action?.type === 'pickup'
      )
        advanceAction(world, actor, seconds, events);
    }
    // Only landing needs this index; rebuild once at that phase, then track subsequent moves.
    let occupancy: LandingOccupancy | undefined;
    const landingOccupancy = () => (occupancy ??= new LandingOccupancy(world));
    for (const id of participants.ambient) {
      const entity = world.entities[id]!;
      if (!capabilityBlocked(world, entity, 'locomotion')) {
        advanceFlight(world, entity, seconds, events, landingOccupancy);
        advanceAnimal(world, entity, seconds);
      }
      occupancy?.update(entity);
      if (entity.heat?.lit) {
        entity.heat.fuelSeconds = Math.max(0, entity.heat.fuelSeconds - seconds);
        if (entity.heat.fuelSeconds === 0) {
          entity.heat.lit = false;
          emit(world, events, 'fire-out', 'The campfire ran out of fuel.', entity);
        }
      }
    }
  }
  updateEncounters(world, original, events, participants.actors);
  return finish(
    world,
    events,
    outcome(true, 'advanced', `Advanced ${elapsedSimSeconds} simulation seconds.`),
  );
}

/** Positions stay fixed during this phase; preserve event-time audiences and actor order. */
function updateEncounters(
  world: WorldState,
  original: WorldState,
  events: WorldEvent[],
  actorIds: readonly string[],
): void {
  if (!actorIds.some((id) => world.entities[id]?.actor?.alive && hasMemory(world.entities[id])))
    return;
  const hadObjectExposures = original.visibleObjects !== undefined;
  const encounter = encounterEmitter(world, events);

  // Read-only perception captures transforms once after movement, avoiding repeated proxy walks.
  // Snapshot identity, transforms and body height; event mutations still use the authoritative draft.
  const entities = worldRootEntities(world)
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
  const nearbyObjects = spatialCandidates(entities.filter((e) => e.object));
  for (const actor of entities.filter((e) => e.alive && e.memory)) {
    const radius = visionRadius(world, actor.entity);
    const sees = visionQuery(world, actor.entity);
    const touch = sensesFor(world, actor.entity).find(
      (s) => s.implementation === 'body-contact-v1',
    );
    if (touch) {
      nearbyAll ??= spatialCandidates(entities);
      const prior = actor.entity.actor!.contacts ?? {};
      const contacts: NonNullable<ActorComponent['contacts']> = {};
      // Source IDs stay in private state; acquisition is owner-scoped, never a public encounter.
      // docs/events-perception-and-reactions.md#9-reaction-intake-and-scheduling owns intake.
      for (const source of nearbyAll(
        actor.position,
        Math.max(actor.radius + maximumBodyRadius, actor.height, maximumBodyHeight) +
          SPATIAL_LIMITS.epsilon,
      ).filter(
        (e) =>
          e.id !== actor.id &&
          bodiesTouch(actor.entity, e.entity) &&
          hasLineOfEffect(world, actor.entity, e.entity),
      )) {
        const oldPosition = worldPosition(original.entities[source.id]);
        const detail =
          oldPosition && distance(oldPosition, source.position) > 0.001 ? 'moving' : 'present';
        const previous = prior[source.id];
        contacts[source.id] =
          previous && previous.detail === detail
            ? previous
            : {
                id: previous?.id ?? nextId(world, 'contact'),
                senseId: touch.id,
                detail,
                enteredAt: previous?.enteredAt ?? world.simTime,
                changedAt: world.simTime,
              };
        if (!previous || previous.detail !== detail)
          emit(
            world,
            events,
            'contact',
            detail === 'moving'
              ? 'I feel an unidentified moving contact.'
              : 'I feel an unidentified contact.',
            actor.entity,
            undefined,
            {
              contactId: contacts[source.id]!.id,
              senseId: touch.id,
              detail,
              change: previous ? 'detail' : 'onset',
              semanticTrigger: true,
              importance: 6,
            },
            'private',
          );
      }
      for (const [id, episode] of Object.entries(prior))
        if (!contacts[id])
          emit(
            world,
            events,
            'contact',
            'A contact is no longer present.',
            actor.entity,
            undefined,
            {
              contactId: episode.id,
              senseId: episode.senseId,
              change: 'end',
              semanticTrigger: true,
              importance: 6,
            },
            'private',
          );
      if (
        Object.keys(contacts).length !== Object.keys(prior).length ||
        Object.entries(contacts).some(([id, c]) => c !== prior[id])
      )
        actor.entity.actor!.contacts = contacts;
    }
    if (radius === 0) {
      if (
        world.perceptionEpisodes?.[actor.id] &&
        Object.keys(world.perceptionEpisodes[actor.id]!).length
      )
        world.perceptionEpisodes[actor.id] = {};
      continue;
    }
    const previous = original.visiblePeople?.[actor.id] ?? [];
    const previouslySeen = new Set(previous);
    const seen = nearby(actor.position, radius + 2)
      .filter((e) => e.id !== actor.id && e.alive && sees(e))
      .map((e) => e.id);
    const objects = nearbyObjects(actor.position, radius).filter((entity) => sees(entity));
    const objectIds = objects.map((entity) => entity.id);
    // Persistent exposure episodes do not imply identity recognition across a disappearance.
    // docs/knowledge.md#subject-binding
    const priorEpisodes = original.perceptionEpisodes?.[actor.id] ?? {};
    const exposed = [...seen, ...objectIds];
    if (
      exposed.length !== Object.keys(priorEpisodes).length ||
      exposed.some((id) => !priorEpisodes[id])
    )
      (world.perceptionEpisodes ??= {})[actor.id] = Object.fromEntries(
        exposed.map((id) => [id, priorEpisodes[id] ?? `${world.sequence}:${world.simTime}:${id}`]),
      );
    const newlySeen = seen.filter((id) => !previouslySeen.has(id));
    if (newlySeen.length) {
      // Encounter emission adds awareness, not memories. Read the current immutable
      // memory snapshot once instead of rescanning/proxying it for every new contact.
      const entries = world.memories[actor.id] ?? [];
      const records = isDraft(entries) ? current(entries) : entries;
      const recent = new Set(
        records
          .filter(
            (m) =>
              m.kind === 'episode' &&
              (m.summary.startsWith('I saw ') || m.eventType === 'encounter') &&
              world.simTime - m.at < 3600,
          )
          .flatMap((m) => m.entityIds),
      );
      for (const id of newlySeen) if (!recent.has(id)) encounter(actor.entity, id, true);
    }
    if (
      !original.visiblePeople?.[actor.id] ||
      seen.length !== previous.length ||
      seen.some((id, index) => id !== previous[index])
    )
      (world.visiblePeople ??= {})[actor.id] = seen;
    // Object exposures use the same committed awareness path without a cognition trigger.
    const priorObjects = new Set(
      original.visibleObjects?.[actor.id] ??
        (hadObjectExposures ? [] : objects.map((entity) => entity.id)),
    );
    for (const entity of objects)
      if (!priorObjects.has(entity.id)) encounter(actor.entity, entity.id, false);
    const previousObjects = original.visibleObjects?.[actor.id];
    // Retain identity when membership is unchanged (docs/performance.md#simulation-cpu-and-growing-history).
    if (
      !previousObjects ||
      objectIds.length !== previousObjects.length ||
      objectIds.some((id, index) => id !== previousObjects[index])
    )
      (world.visibleObjects ??= {})[actor.id] = objectIds;
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
  const visibleEntities = nearbyEntities(world, worldPosition(actor), visionRadius(world, actor))
    .filter((entity) => entity.id !== actorId && visible(world, actor, entity))
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
      delete copy.inventoryRevision;
      if (copy.actor) {
        // Sparse state is owner-private; explicit permitted projections carry public values.
        delete copy.actor.attributes;
        delete copy.actor.contacts;
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
          ...(aware.intelligible && aware.content !== undefined
            ? { data: { text: aware.content } }
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
    (original.memories[actorId] ?? []).filter(
      (record) => record.kind === 'commitment' && !record.resolved,
    ).length >= 16
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
