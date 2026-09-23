import { gatheringYield, BASE_GATHER_QUANTITY } from './gathering.js';
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
  WILDERNESS_NEEDS,
  hasWildernessNeeds,
  nativeNeedBelow,
  setWildernessNeed,
  advanceWildernessNeeds,
} from './wilderness-needs.js';
import {
  attributeDefinition,
  readAttribute,
  setAttribute,
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
import { accountRest, REST_RULES } from './sleep.js';
import { isRecallableExperience } from './mind.js';
import { addItem, NATIVE_PREPARATIONS, nextId, nextRandom } from './data.js';
import { appendMemory, canonicalJson, emit, finish, outcome } from './events.js';
import { getOwn, isSafeRecordId } from './records.js';
import {
  hearsEntity,
  seesEntity,
  visionRadius,
  sensesFor,
  contactViews,
  directProbe,
  PERCEPTION_RULES,
} from './perception.js';
import { distance, findPath, hasLineOfSight, isWalkable } from './spatial.js';
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
  movementTilesPerSecond: 0.11,
  sightRadius: PERCEPTION_RULES.sightRadius,
  interactionRadius: 1.6,
  animalFleeTilesPerSecond: 0.055,
  ...WILDERNESS_NEEDS,
  nativeRestSeconds: 28800,
  gatherQuantity: BASE_GATHER_QUANTITY,
  harvestSeconds: 84,
  cookSeconds: 90,
  shotSeconds: 18,
} as const;

export function inventoryFor(world: WorldState, actorId: string): ItemInstance[] {
  return Object.values(world.items).filter((item) => item.ownerId === actorId && item.quantity > 0);
}
export function quantityOf(world: WorldState, actorId: string, definitionId: string): number {
  return inventoryFor(world, actorId)
    .filter((item) => item.definitionId === definitionId)
    .reduce((sum, item) => sum + item.quantity, 0);
}
function take(world: WorldState, actorId: string, definitionId: string, quantity: number): boolean {
  if (quantityOf(world, actorId, definitionId) < quantity) return false;
  let remaining = quantity;
  for (const item of inventoryFor(world, actorId)
    .filter((item) => item.definitionId === definitionId)
    .sort((a, b) => a.id.localeCompare(b.id))) {
    const amount = Math.min(remaining, item.quantity);
    item.quantity -= amount;
    remaining -= amount;
    if (item.quantity === 0) delete world.items[item.id];
    if (remaining === 0) break;
  }
  return true;
}
function takeItem(world: WorldState, actorId: string, itemId: string): ItemInstance | null {
  const item = getOwn(world.items, itemId);
  if (!item || item.ownerId !== actorId || item.quantity < 1) return null;
  const taken = { ...item, quantity: 1 };
  item.quantity--;
  if (item.quantity === 0) delete world.items[itemId];
  return taken;
}
function validId(value: unknown): value is string {
  return isSafeRecordId(value);
}
function validPosition(value: unknown): value is Position {
  return (
    !!value &&
    typeof value === 'object' &&
    Number.isFinite((value as Position).x) &&
    Number.isFinite((value as Position).z)
  );
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
      world.itemDefinitions[item.definitionId]?.ammunition?.kind === kind,
  );
}
function actionReach(world: WorldState, action: Action): number {
  if (action.type !== 'hunt') return SIMULATION_RULES.interactionRadius;
  const range =
    world.itemDefinitions[world.items[action.weaponItemId ?? '']?.definitionId ?? '']?.launcher
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
    : world.entities[action.targetId ?? action.heatId ?? '']?.position;
}
function approach(world: WorldState, actor: Entity, action: Action): Outcome | null {
  const destination = targetPosition(world, action);
  if (!destination) return outcome(false, 'missing-target', 'That target no longer exists.');
  const reach = action.type === 'move' ? 0.05 : actionReach(world, action);
  if (
    distance(actor.position, destination) <= reach &&
    hasLineOfSight(world, actor.position, destination)
  )
    return null;
  const path =
    visionRadius(world, actor) === 0
      ? directProbe(world, actor.position, destination)
      : findPath(world, actor.position, destination);
  if (!path) return outcome(false, 'unreachable', 'There is no walkable route to that target.');
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
  for (const input of requirements)
    if (quantityOf(world, actor.id, input.definitionId) < input.quantity)
      return outcome(
        false,
        'missing-material',
        `Need ${input.quantity} ${world.itemDefinitions[input.definitionId]?.name ?? input.definitionId}.`,
      );
  if (action.type === 'cook' && !world.entities[action.heatId ?? '']?.heat?.lit)
    return outcome(false, 'no-heat', 'Cooking requires a lit campfire.');
  for (const input of requirements) take(world, actor.id, input.definitionId, input.quantity);
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
  return action;
}

/** Accepted commands are idempotent by id+body. Rejections cause no physical effects. */
export function executeCommand(original: WorldState, command: Command): Transition {
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
  if (original.paused && command.type !== 'cancel') return reject('paused', 'The world is paused.');
  if ((!source.actor.alive || source.actor.incapacitated) && command.type !== 'recover')
    return reject('not-alive', 'This actor cannot act.');
  if (
    ['gather', 'prepare', 'craft', 'equip', 'hunt', 'harvest', 'cook'].includes(command.type) &&
    !supportsManualWork(source)
  )
    return reject(
      'unsupported-body',
      'This native manual-work family requires a supported biped body.',
    );
  const world = draftWorld(original);
  const actor = world.entities[command.actorId]!;
  const component = actor.actor!;
  // Scope comes before live resource/lifecycle diagnostics, including deferred plan dispatch.
  // docs/architecture.md#actor-agency-foundation
  const scopedTargetId =
    command.type === 'cook'
      ? command.heatId
      : ['gather', 'harvest', 'hunt', 'replenish'].includes(command.type) && 'targetId' in command
        ? command.targetId
        : undefined;
  if (scopedTargetId) {
    const target = getOwn(world.entities, scopedTargetId);
    if (!target || !visible(world, actor, target))
      return reject('not-visible', 'The action target is not currently perceived.');
  }
  const events: WorldEvent[] = [];
  let result = outcome(true, 'accepted', 'Action started.');
  let action: Action | undefined;
  switch (command.type) {
    case 'move': {
      if (
        visionRadius(world, actor) === 0 &&
        (!validPosition(command.destination) || distance(actor.position, command.destination) > 1)
      )
        return reject(
          'unsupported-navigation',
          'Only a short direct probe is supported without vision.',
        );
      if (!validPosition(command.destination) || !isWalkable(world, command.destination))
        return reject('blocked', 'Choose walkable ground.');
      action = createAction(world, 'move', 0);
      action.destination = { ...command.destination };
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
      const item = getOwn(world.items, command.itemId);
      if (!item || item.ownerId !== actor.id || !world.itemDefinitions[item.definitionId]?.launcher)
        return reject('not-equippable', 'Choose a ranged tool in this actor’s inventory.');
      component.equippedItemId = item.id;
      result = {
        ok: true,
        code: 'equipped',
        message: `Equipped ${world.itemDefinitions[item.definitionId]!.name}.`,
        itemId: item.id,
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
      const item = getOwn(world.items, weaponItemId);
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
      const item = getOwn(world.items, command.itemId);
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
      const item = getOwn(world.items, command.itemId);
      const definition = item && world.itemDefinitions[item.definitionId];
      if (!item || item.ownerId !== actor.id || !definition?.nutrition)
        return reject(
          'not-edible',
          definition?.id === 'raw_meat'
            ? 'Cook raw meat before eating.'
            : 'Choose prepared edible food.',
        );
      takeItem(world, actor.id, item.id);
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
    case 'rest':
      if (!hasWildernessNeeds(component))
        return reject('not-applicable', 'This body does not use wilderness rest.');
      action = createAction(world, 'rest', SIMULATION_RULES.nativeRestSeconds);
      break;
    case 'withdraw-attempt': {
      result = withdrawAttempt(component, command.attemptId);
      break;
    }
    case 'cancel': {
      cancelPlan(component);
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
      actor.position = { x: 11, z: 13 };
      component.health = Math.max(component.health, 65);
      if (hasWildernessNeeds(component)) {
        setWildernessNeed(component, 'fullness', Math.max(component.fullness, 45));
        setWildernessNeed(component, 'energy', Math.max(component.energy, 65));
      }
      component.incapacitated = false;
      component.alive = true;
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
      if (
        command.targetId &&
        (!target?.actor?.alive || !hasMemory(target) || !hearsEntity(world, target, actor))
      )
        return reject('not-heard', 'The listener is not within hearing range.');
      if (target?.actor?.rest?.asleep) {
        target.actor.action = null;
        target.actor.planGeneration++;
        target.actor.rest.asleep = false;
        target.actor.rest.episode = null;
        target.actor.rest.sleepingSeconds = 0;
      }
      emit(
        world,
        events,
        'speech',
        `${actor.name}: ${command.text.trim()}`,
        actor,
        command.targetId,
        { text: command.text.trim() },
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
    if (['move', 'gather', 'hunt', 'harvest', 'cook', 'replenish'].includes(action.type)) {
      const error = approach(world, actor, action);
      if (error) return { world: original, events: [], outcome: error };
    }
    if (action.stage === 'working') {
      const error = startWork(world, actor, action);
      if (error) return { world: original, events: [], outcome: error };
    }
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
    case 'move':
      if (action.destination) actor.position = { ...action.destination };
      emit(
        world,
        events,
        'moved',
        `${actor.name} moved to ${Number(actor.position.x.toFixed(1))}, ${Number(actor.position.z.toFixed(1))}.`,
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
      const quantity = Math.min(target.resource.quantity, toolYield);
      target.resource.quantity -= quantity;
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
    case 'hunt': {
      const target = world.entities[action.targetId ?? ''];
      const weapon = world.items[action.weaponItemId ?? ''];
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
      if (
        distance(actor.position, target.position) > launcher.range ||
        !hasLineOfSight(world, actor.position, target.position)
      ) {
        failAction(world, actor, events, 'the animal moved out of range.');
        return;
      }
      const bonus = world.itemDefinitions[ammunition.definitionId]!.ammunition!.damageBonus;
      takeItem(world, actor.id, ammunition.id);
      const accuracy = launcher.accuracy * (target.animal.fleeSeconds > 0 ? 0.85 : 1);
      const hit = nextRandom(world) < accuracy;
      const damage = hit ? launcher.damage + bonus : 0;
      const actualDamage = Math.min(target.actor!.health, damage);
      target.animal.fleeFrom = { ...actor.position };
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
    case 'rest':
      emit(world, events, 'rested', `${actor.name} finished resting.`, actor);
      break;
  }
  finishPlanAction(world, actor.id, action.id, {
    ...outcome(true, 'completed', `${action.type} completed.`),
    ...(outputItemId ? { itemId: outputItemId } : {}),
  });
  component.action = null;
}

function moveAlongPath(actor: Entity, path: Position[], distanceBudget: number): void {
  let remaining = distanceBudget;
  while (path.length && remaining > 0) {
    const point = path[0]!;
    const delta = distance(actor.position, point);
    if (delta <= remaining) {
      actor.position = { ...point };
      path.shift();
      remaining -= delta;
    } else {
      actor.position.x += ((point.x - actor.position.x) * remaining) / delta;
      actor.position.z += ((point.z - actor.position.z) * remaining) / delta;
      remaining = 0;
    }
  }
}
function advanceAction(
  world: WorldState,
  actor: Entity,
  seconds: number,
  events: WorldEvent[],
): void {
  const action = actor.actor!.action;
  if (!action) return;
  if (action.stage === 'approaching') {
    const destination = targetPosition(world, action);
    if (!destination) {
      failAction(world, actor, events, 'the target disappeared.');
      return;
    }
    if (action.type === 'hunt' && !world.entities[action.targetId ?? '']?.actor?.alive) {
      failAction(world, actor, events, 'the animal is no longer alive.');
      return;
    }
    const reach = action.type === 'move' ? 0.05 : actionReach(world, action);
    if (
      distance(actor.position, destination) > reach ||
      !hasLineOfSight(world, actor.position, destination)
    ) {
      const last = action.path[action.path.length - 1];
      if (!last || distance(last, destination) > 0.6) {
        const path =
          visionRadius(world, actor) === 0
            ? directProbe(world, actor.position, destination)
            : findPath(world, actor.position, destination);
        if (!path) {
          failAction(world, actor, events, 'the route became blocked.');
          return;
        }
        action.path = path;
      }
      moveAlongPath(
        actor,
        action.path,
        SIMULATION_RULES.movementTilesPerSecond *
          seconds *
          (1 - (actor.actor?.body?.conditions.injury ?? 0) / 200),
      );
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
  if (action.type === 'replenish') {
    const definition = attributeDefinition(world, action.attributeId ?? '');
    const target = world.entities[action.targetId ?? ''];
    const value = definition && readAttribute(actor.actor!, definition);
    if (
      !definition?.reservoir ||
      definition.version !== action.definitionVersion ||
      definition.schema.kind !== 'number' ||
      typeof value !== 'number' ||
      !target?.replenisher ||
      target.replenisher.attributeId !== definition.id ||
      distance(actor.position, target.position) > SIMULATION_RULES.interactionRadius ||
      target.replenisher.remaining <= 0 ||
      !hasLineOfSight(world, actor.position, target.position)
    ) {
      failAction(
        world,
        actor,
        events,
        'the replenishment binding or supply is no longer available.',
      );
      return;
    }
    // Debit and credit share one native transition; cancellation never refunds transferred supply.
    const amount = Math.min(
      target.replenisher.remaining,
      definition.schema.max - value,
      definition.reservoir.replenishPerSecond * Math.min(seconds, action.remainingSeconds),
    );
    setAttribute(world, actor, definition, value + amount, events);
    target.replenisher.remaining -= amount;
    action.transferred = (action.transferred ?? 0) + amount;
    if (value + amount === definition.schema.max || target.replenisher.remaining === 0)
      action.remainingSeconds = 0;
  }
  if (action.type === 'rest' && hasWildernessNeeds(actor.actor!))
    setWildernessNeed(
      actor.actor!,
      'energy',
      actor.actor!.energy! + SIMULATION_RULES.restEnergyPerSecond * seconds,
    );
  action.remainingSeconds = Math.max(0, action.remainingSeconds - seconds);
  if (action.remainingSeconds === 0) completeAction(world, actor, action, events);
}
function advanceAnimal(world: WorldState, entity: Entity, seconds: number): void {
  const animal = entity.animal;
  if (!animal || !entity.actor?.alive || entity.actor.action) return;
  if (animal.fleeSeconds > 0 && animal.fleeFrom) {
    animal.fleeSeconds = Math.max(0, animal.fleeSeconds - seconds);
    let dx = entity.position.x - animal.fleeFrom.x;
    let dz = entity.position.z - animal.fleeFrom.z;
    const length = Math.hypot(dx, dz) || 1;
    dx /= length;
    dz /= length;
    for (const vector of [
      { x: dx, z: dz },
      { x: -dz, z: dx },
      { x: dz, z: -dx },
    ]) {
      const destination = {
        x:
          entity.position.x +
          vector.x *
            SIMULATION_RULES.animalFleeTilesPerSecond *
            seconds *
            (1 - (entity.actor?.body?.conditions.injury ?? 0) / 200),
        z:
          entity.position.z +
          vector.z *
            SIMULATION_RULES.animalFleeTilesPerSecond *
            seconds *
            (1 - (entity.actor?.body?.conditions.injury ?? 0) / 200),
      };
      if (isWalkable(world, destination)) {
        entity.position = destination;
        break;
      }
    }
  } else {
    animal.wanderSeconds -= seconds;
    if (animal.wanderSeconds <= 0) {
      const angle = nextRandom(world) * Math.PI * 2;
      const destination = {
        x: entity.position.x + Math.cos(angle) * 0.4,
        z: entity.position.z + Math.sin(angle) * 0.4,
      };
      if (isWalkable(world, destination)) entity.position = destination;
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
      (item) => !!world.itemDefinitions[item.definitionId]?.nutrition,
    );
    if (food) {
      if (component.rest?.asleep) {
        component.action = null;
        component.planGeneration++;
        component.rest.asleep = false;
        component.rest.sleepingSeconds = 0;
      }
      const definition = world.itemDefinitions[food.definitionId]!;
      takeItem(world, actor.id, food.id);
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
    const resource = Object.values(world.entities)
      .filter(
        (entity) =>
          entity.resource?.definitionId === 'berries' &&
          entity.resource.quantity > 0 &&
          visible(world, actor, entity),
      )
      .sort(
        (a, b) => distance(actor.position, a.position) - distance(actor.position, b.position),
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
        component.action = action;
        component.planGeneration++;
      }
      return;
    }
  }
  if (
    (component.energy < 22 ||
      (world.simTime % 86400 >= 57600 &&
        (component.rest?.restedSeconds ?? 0) < REST_RULES.requiredSeconds)) &&
    component.action?.type !== 'rest'
  ) {
    component.action = createAction(world, 'rest', SIMULATION_RULES.nativeRestSeconds);
    component.planGeneration++;
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
    const sources = Object.values(world.entities)
      .filter(
        (target) =>
          target.replenisher?.attributeId === id &&
          target.replenisher.remaining > 0 &&
          visible(world, actor, target),
      )
      .sort(
        (a, b) =>
          distance(actor.position, a.position) - distance(actor.position, b.position) ||
          a.id.localeCompare(b.id),
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

/** Advance bounded one-second native steps. Paused time and absent-player catch-up are never inferred. */
export function advanceWorld(original: WorldState, elapsedSimSeconds: number): Transition {
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
  let world = draftWorld(original);
  const events: WorldEvent[] = [];
  let remaining = elapsedSimSeconds;
  while (remaining > 0) {
    const seconds = Math.min(1, remaining);
    remaining -= seconds;
    world.simTime += seconds;
    // Stable actor order resolves finite-resource claims; no asynchronous writer mutates a step.
    for (const actorId of Object.values(world.entities)
      .filter((entity) => entity.actor)
      .map((entity) => entity.id)
      .sort((a, b) => a.localeCompare(b))) {
      let actor = world.entities[actorId]!;
      let component = actor.actor!;
      if (!component.alive || component.incapacitated) continue;
      if (hasWildernessNeeds(component)) {
        if (advanceWildernessNeeds(actor, seconds)) reconcileBody(world, actor, events, 'needs');
        if (component.health === 0) continue;
        nativeSurvival(world, actor, events);
      }
      advanceReservoirs(world, actor, seconds, events);
      nativeReservoirResponse(world, actor);
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
      if (hasWildernessNeeds(component)) accountRest(component, world.simTime, seconds);
      advanceAction(world, actor, seconds, events);
    }
    for (const entity of Object.values(world.entities).sort((a, b) => a.id.localeCompare(b.id))) {
      advanceAnimal(world, entity, seconds);
      if (entity.heat?.lit) {
        entity.heat.fuelSeconds = Math.max(0, entity.heat.fuelSeconds - seconds);
        if (entity.heat.fuelSeconds === 0) {
          entity.heat.lit = false;
          emit(world, events, 'fire-out', 'The campfire ran out of fuel.', entity);
        }
      }
    }
  }
  updateEncounters(world, original, events);
  return finish(
    world,
    events,
    outcome(true, 'advanced', `Advanced ${elapsedSimSeconds} simulation seconds.`),
  );
}

/** Positions stay fixed during this phase; preserve event-time audiences and actor order. */
function updateEncounters(world: WorldState, original: WorldState, events: WorldEvent[]): void {
  const hadObjectExposures = original.visibleObjects !== undefined;

  // Read-only perception captures position scalars once after movement, avoiding repeated proxy walks.
  // Only positions/identity are read here; event mutations still use the authoritative draft.
  const entities = Object.values(world.entities).map((entity) => ({
    entity,
    id: entity.id,
    position: { x: entity.position.x, z: entity.position.z },
    alive: !!entity.actor?.alive,
    memory: hasMemory(entity),
    object: !entity.actor && !entity.animal,
  }));
  const nearby = spatialCandidates(entities.filter((e) => e.alive));
  let nearbyAll: ReturnType<typeof spatialCandidates<(typeof entities)[number]>> | undefined;
  const nearbyObjects = spatialCandidates(entities.filter((e) => e.object));
  for (const actor of entities.filter((e) => e.alive && e.memory)) {
    const radius = visionRadius(world, actor.entity);
    const touch = sensesFor(world, actor.entity).find(
      (s) => s.implementation === 'contact-proximity-v1',
    );
    if (touch) {
      nearbyAll ??= spatialCandidates(entities);
      const prior = actor.entity.actor!.contacts ?? {};
      const contacts: NonNullable<ActorComponent['contacts']> = {};
      // Source IDs stay in private state; acquisition is owner-scoped, never a public encounter.
      // docs/events-perception-and-reactions.md#9-reaction-intake-and-scheduling owns intake.
      for (const source of nearbyAll(actor.position, touch.radius)
        .filter((e) => e.id !== actor.id && distance(actor.position, e.position) <= touch.radius)
        .slice(0, 32)) {
        const oldPosition = original.entities[source.id]?.position;
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
    if (radius === 0) continue;
    const previous = original.visiblePeople?.[actor.id] ?? [];
    const previouslySeen = new Set(previous);
    const seen = nearby(actor.position, radius + 2)
      .filter(
        (e) =>
          e.id !== actor.id &&
          e.alive &&
          (distance(actor.position, e.position) <= radius ||
            (previouslySeen.has(e.id) && distance(actor.position, e.position) <= radius + 2)),
      )
      .map((e) => e.id);
    for (const id of seen.filter((id) => !previouslySeen.has(id))) {
      const recent = (world.memories[actor.id] ?? []).some(
        (m) =>
          m.kind === 'episode' &&
          m.entityIds.includes(id) &&
          (m.summary.startsWith('I saw ') || m.eventType === 'encounter') &&
          world.simTime - m.at < 3600,
      );
      if (!recent) {
        const encountered = world.entities[id]!;
        emit(
          world,
          events,
          'encounter',
          `${actor.entity.name} encountered ${encountered.name}.`,
          actor.entity,
          id,
          { importance: 6, semanticTrigger: true },
        );
      }
    }
    if (
      !original.visiblePeople?.[actor.id] ||
      seen.length !== previous.length ||
      seen.some((id, index) => id !== previous[index])
    )
      (world.visiblePeople ??= {})[actor.id] = seen;
    // Object exposures use the same committed awareness path without a cognition trigger.
    const objects = nearbyObjects(actor.position, radius).filter(
      (entity) => distance(actor.position, entity.position) <= radius,
    );
    const priorObjects = new Set(
      original.visibleObjects?.[actor.id] ??
        (hadObjectExposures ? [] : objects.map((entity) => entity.id)),
    );
    for (const entity of objects)
      if (!priorObjects.has(entity.id))
        emit(
          world,
          events,
          'encounter',
          `${actor.entity.name} encountered ${entity.entity.name}.`,
          actor.entity,
          entity.id,
          { importance: 0, urgency: 0, semanticTrigger: false },
        );
    const objectIds = objects.map((entity) => entity.id);
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
export function observeActor(world: WorldState, actorId: string): ActorObservation | null {
  const actor = getOwn(world.entities, actorId);
  if (!actor?.actor) return null;
  const inventory = inventoryFor(world, actorId);
  const knownRecipes = (world.knowledge[actorId] ?? [])
    .map((record) => world.recipes[record.recipeId])
    .filter((recipe) => !!recipe);
  const definitionIds = new Set(inventory.map((item) => item.definitionId));
  const visibleEntities = nearbyEntities(world, actor.position, visionRadius(world, actor))
    .filter((entity) => entity.id !== actorId && visible(world, actor, entity))
    .map((entity) => {
      const copy = cloneValue(entity);
      if (copy.actor) {
        // Sparse state is owner-private; explicit permitted projections carry public values.
        delete copy.actor.attributes;
        delete copy.actor.contacts;
        copy.actor.agency = seedAgency();
        delete copy.actor.initialGoals;
        copy.actor.planGeneration = 0;
      }
      if (copy.resource) definitionIds.add(copy.resource.definitionId);
      return copy;
    });
  for (const recipe of knownRecipes) {
    definitionIds.add(recipe.outputDefinitionId);
    for (const input of recipe.inputs) definitionIds.add(input.definitionId);
  }
  const self = cloneValue(actor);
  if (self.actor) delete self.actor.contacts;
  return cloneValue({
    worldId: world.id,
    at: world.simTime,
    actor: self,
    contacts: contactViews(actor),
    visibleEntities,
    inventory,
    itemDefinitions: [...definitionIds].map((id) => world.itemDefinitions[id]!).filter(Boolean),
    knownRecipes,
    memories: queryMemories(world, actorId),
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
          ...(aware.content !== undefined ? { data: { text: aware.content } } : {}),
        }))
      : world.events.filter((event) => event.audience.includes(actorId)).slice(-24),
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
