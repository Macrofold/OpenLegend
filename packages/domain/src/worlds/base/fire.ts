import { subjectNarration, person } from '../../narration.js';
import { namePhrase, type Named } from '@open-legend/language';
import { isDraft, original } from 'immer';
import { worldRootEntities } from '../../entity-index.js';
import { emit, outcome } from '../../events.js';
import { accessiblePossession, possessionItems } from '../../object-access.js';
import { itemFor } from '../../objects.js';
import { STOCK_TRANSFER_LIMITS, proveAvailableStock } from '../../stock-transfer.js';
import { sameDefinitionPin, isDefinitionPin } from '../../state-owners.js';
import {
  activityHostForCommand,
  activityHostPin,
  installedActivityHost,
} from '../../activity-hosts.js';
import type { DefinitionPin } from '../../world-modules.js';
import { BASE_FIRE_CARE, BASE_LOW_FUEL_SECONDS } from './fire-rules.js';
export { BASE_FIRE_CARE } from './fire-rules.js';
import { isSafeRecordId } from '../../records.js';
import {
  applyResourceGroup,
  availableItemQuantity,
  itemDefinitionPin,
} from '../../resource-claims.js';
import type {
  Command,
  Entity,
  HeatComponent,
  ItemDefinition,
  ItemInstance,
  Outcome,
  WorldEvent,
  WorldState,
} from '../../types.js';

/** Bundled-world fire care. The campfire's HeatComponent remains the only fuel record;
 * these values are authored balance, not universal combustion laws.
 * docs/worlds/base/survival.md#tending-the-campfire */
export const FIRE_OPERATIONS = ['light', 'fuel', 'extinguish'] as const;
export type FireOperation = (typeof FIRE_OPERATIONS)[number];
export interface FireStockGuard {
  definition: DefinitionPin;
  minimumHeld: number;
  onlyWhenLow: boolean;
}
export function fireStockGuard(
  command: Extract<Command, { type: 'tend-fire' }>,
): FireStockGuard | undefined {
  if (command.definitionId === undefined) return;
  return {
    definition: {
      id: command.definitionId,
      version: command.definitionVersion!,
      digest: command.definitionDigest!,
    },
    minimumHeld: command.minimumHeld!,
    onlyWhenLow: command.onlyWhenLow!,
  };
}

// Only plain portable materials are burned; tools, containers, weapons and food are
// never silently consumed as tinder or fuel. The drill is used, not consumed.
function plainMaterial(definition: ItemDefinition): boolean {
  return (
    definition.portable === true &&
    !definition.container &&
    !definition.launcher &&
    !definition.ammunition &&
    !definition.melee &&
    !definition.gatheringTool &&
    !definition.nutrition
  );
}
export const isTinder = (definition: ItemDefinition): boolean =>
  plainMaterial(definition) && definition.properties.includes('fiber');
export const isFuel = (definition: ItemDefinition): boolean =>
  plainMaterial(definition) && definition.properties.includes('fuel');
export const isFireDrill = (definition: ItemDefinition): boolean =>
  !definition.container &&
  definition.properties.includes('rigid') &&
  definition.properties.includes('shaft');

/** Saved plans and learned records carry only these closed fields. */
export function isFireCareCommand(command: Command): boolean {
  return (
    command?.type === 'tend-fire' &&
    isSafeRecordId(command.targetId) &&
    (FIRE_OPERATIONS as readonly string[]).includes(command.operation) &&
    (command.itemId === undefined ||
      (command.operation === 'fuel' && isSafeRecordId(command.itemId))) &&
    (command.definitionId === undefined
      ? [
          command.definitionVersion,
          command.definitionDigest,
          command.minimumHeld,
          command.onlyWhenLow,
        ].every((value) => value === undefined)
      : command.operation === 'fuel' &&
        isDefinitionPin(fireStockGuard(command)!.definition) &&
        Number.isSafeInteger(command.minimumHeld) &&
        command.minimumHeld! >= 0 &&
        typeof command.onlyWhenLow === 'boolean')
  );
}

/** Deterministic choice: the lowest-ID accessible lot with a free unit. */
function carriedLot(
  world: WorldState,
  actorId: string,
  test: (definition: ItemDefinition) => boolean,
  excluded?: string,
): ItemInstance | undefined {
  let chosen: ItemInstance | undefined;
  for (const item of possessionItems(world, actorId)) {
    const definition = world.itemDefinitions[item.definitionId];
    if (
      !definition ||
      !test(definition) ||
      item.id === excluded ||
      availableItemQuantity(world, item.id) < 1
    )
      continue;
    if (!chosen || item.id < chosen.id) chosen = item;
  }
  return chosen;
}
function lightingMaterials(
  world: WorldState,
  actorId: string,
): { tinder: ItemInstance; drill: ItemInstance } | undefined {
  const tinder = carriedLot(world, actorId, isTinder);
  const drill =
    tinder &&
    carriedLot(
      world,
      actorId,
      isFireDrill,
      availableItemQuantity(world, tinder.id) > 1 ? undefined : tinder.id,
    );
  return tinder && drill ? { tinder, drill } : undefined;
}
function fuelLot(world: WorldState, actorId: string, itemId?: string): ItemInstance | undefined {
  if (!itemId) return carriedLot(world, actorId, isFuel);
  const item = itemFor(world, itemId);
  const definition = item && world.itemDefinitions[item.definitionId];
  return item &&
    definition &&
    isFuel(definition) &&
    accessiblePossession(world, actorId, item.id) &&
    availableItemQuantity(world, item.id) >= 1
    ? item
    : undefined;
}
/** A selected definition is bound afresh only at admission. The running attempt
 * keeps that exact lot; completion never substitutes another stack. */
export function bindFireFuel(
  world: WorldState,
  actorId: string,
  guard: FireStockGuard,
  itemId?: string,
): ItemInstance | undefined {
  if (itemId) {
    const item = fuelLot(world, actorId, itemId);
    return item && sameDefinitionPin(world.entities[item.id]!.item!.definitionPin, guard.definition)
      ? item
      : undefined;
  }
  let examined = 0;
  for (const item of possessionItems(world, actorId)) {
    if (++examined > STOCK_TRANSFER_LIMITS.examined) return;
    const definition = world.itemDefinitions[item.definitionId];
    if (
      definition &&
      isFuel(definition) &&
      sameDefinitionPin(world.entities[item.id]!.item!.definitionPin, guard.definition) &&
      fuelLot(world, actorId, item.id)
    )
      return item;
  }
}
export function guardedFireProblem(
  world: WorldState,
  actor: Entity,
  fire: Entity | undefined,
  guard: FireStockGuard,
  itemId?: string,
  actionId?: string,
): { code: string; message: string } | null {
  const host = activityHostForCommand(world, 'tend-fire');
  if (!host || !host.acceptsTarget?.(world, fire?.id ?? ''))
    return {
      code: 'unsupported-fire-care',
      message: 'The chosen fire-care support is unavailable.',
    };
  if (guard.onlyWhenLow) {
    const observation = installedActivityHost(world, activityHostPin(host))?.evaluateCondition?.(
      world,
      actor.id,
      fire!.id,
    );
    if (observation?.value === undefined)
      return {
        code: 'observation-lost',
        message: 'The chosen burning fire can no longer be observed.',
      };
    if (!observation.value)
      return {
        code: 'no-longer-needed',
        message: 'The fire no longer needs fuel. No fuel was used.',
      };
  }
  if (!bindFireFuel(world, actor.id, guard, itemId))
    return { code: 'missing-material', message: 'The selected fuel is no longer available.' };
  const proof = proveAvailableStock(world, actor.id, guard.definition, guard.minimumHeld + 1, {
    ignoreActionId: actionId,
  });
  if (proof.status !== 'proved')
    return {
      code: proof.status === 'incomplete' ? 'stock-inspection-needed' : 'personal-minimum',
      message:
        proof.status === 'incomplete'
          ? 'Inspect or narrow the selected stock before spending fuel.'
          : 'Adding fuel would leave less than the chosen personal minimum available.',
    };
  return null;
}

/** Coarse visible fuel: the wood in a fire pit is visible, its exact burn time is not. */
export function fireFuelDescription(heat: HeatComponent): string {
  if (heat.fuelSeconds <= 0) return 'no fuel left';
  const hours = Math.round(heat.fuelSeconds / 3600);
  return heat.fuelSeconds < BASE_LOW_FUEL_SECONDS
    ? 'less than an hour of fuel'
    : `about ${hours} hour${hours === 1 ? '' : 's'} of fuel`;
}

/** Shared by admission, work start and completion so every stage rechecks live state. */
export function fireCareProblem(
  world: WorldState,
  actor: Entity,
  fire: Entity | undefined,
  operation: FireOperation,
  itemId?: string,
  guard?: FireStockGuard,
  actionId?: string,
): { code: string; message: string } | null {
  const heat = fire?.heat;
  if (!fire || !heat || fire.retirement)
    return { code: 'not-a-fire', message: 'Choose a campfire.' };
  if (operation === 'light') {
    if (heat.lit)
      return {
        code: 'already-lit',
        message: `${namePhrase(fire, 'definite', { capitalize: true })} is already burning.`,
      };
    if (heat.fuelSeconds <= 0)
      return {
        code: 'no-fuel',
        message: `Add fuel to ${namePhrase(fire, 'definite')} before lighting it.`,
      };
    if (!lightingMaterials(world, actor.id))
      return {
        code: 'missing-material',
        message:
          'Lighting needs one carried tinder bundle (plain fibers) and a rigid shaft to use as a fire drill.',
      };
    return null;
  }
  if (operation === 'fuel') {
    if (guard) {
      const problem = guardedFireProblem(world, actor, fire, guard, itemId, actionId);
      if (problem) return problem;
    }
    if (!fuelLot(world, actor.id, itemId)) {
      // Name an item only when it is the actor's own; other IDs never reveal what they are.
      const chosen =
        itemId && accessiblePossession(world, actor.id, itemId)
          ? itemFor(world, itemId)
          : undefined;
      const definition = chosen && world.itemDefinitions[chosen.definitionId];
      return {
        code: 'missing-material',
        message: !itemId
          ? 'Carry fuel, such as a Supple branch.'
          : definition && !isFuel(definition)
            ? `${namePhrase(definition, 'indefinite', { capitalize: true })} is not fuel.`
            : 'Choose carried fuel that no other work needs.',
      };
    }
    if (
      heat.fuelSeconds + BASE_FIRE_CARE.fuel.secondsPerUnit >
      BASE_FIRE_CARE.fuel.maximumFuelSeconds
    )
      return {
        code: 'fire-full',
        message: `${namePhrase(fire, 'definite', { capitalize: true })} cannot hold more fuel yet.`,
      };
    return null;
  }
  if (!heat.lit)
    return {
      code: 'not-lit',
      message: `${namePhrase(fire, 'definite', { capitalize: true })} is not burning.`,
    };
  // A working cook's meat was spent when cooking began; putting the fire out under it would
  // destroy that food, so it waits. A cook still walking over has spent nothing yet.
  // The frozen base roster avoids proxying scenery; only actors are read from the live draft.
  // docs/worlds/base/survival.md#tending-the-campfire
  const roster = worldRootEntities(isDraft(world) ? original(world)! : world);
  if (
    roster.some((entry) => {
      const cook = entry.actor && entry.id !== actor.id ? world.entities[entry.id] : undefined;
      const action = cook?.actor?.action;
      return action?.type === 'cook' && action.stage === 'working' && action.heatId === fire.id;
    })
  )
    return { code: 'in-use', message: `Someone is cooking on ${namePhrase(fire, 'definite')}.` };
  return null;
}

/** Readable start of fire work for world events, instead of the internal command name. */
export function fireCareStartText(operation: FireOperation, fire: Named | string): string {
  const fireName = namePhrase(fire, 'definite');
  return operation === 'light'
    ? `started lighting ${fireName}`
    : operation === 'fuel'
      ? `started adding fuel to ${fireName}`
      : `started putting out ${fireName}`;
}

/** Consumed material and the fire change commit together when the work finishes, so
 * cancelling costs nothing and fuel can never be credited without spending a unit. */
export function completeFireCare(
  world: WorldState,
  actor: Entity,
  fire: Entity | undefined,
  operation: FireOperation,
  actionId: string,
  events: WorldEvent[],
  itemId?: string,
  guard?: FireStockGuard,
): Outcome {
  if (guard) {
    const problem = guardedFireProblem(world, actor, fire, guard, itemId, actionId);
    if (problem)
      return {
        ...outcome(problem.code === 'no-longer-needed', problem.code, problem.message),
        ...(problem.code === 'no-longer-needed' ? { spent: 0 } : {}),
      };
  }
  const problem = fireCareProblem(world, actor, fire, operation, itemId);
  if (problem) return outcome(false, problem.code, problem.message);
  const heat = fire!.heat!;
  if (operation === 'extinguish') {
    heat.lit = false;
    emit(
      world,
      events,
      'fire-extinguished',
      subjectNarration(actor, ['put out ', person(fire!, 'object', 'definite'), '.']),
      actor,
      fire!.id,
      {
        actionId,
      },
    );
    return outcome(
      true,
      'completed',
      `${namePhrase(fire!, 'definite', { capitalize: true })} is out; ${fireFuelDescription(heat)} remains for relighting.`,
    );
  }
  const lot =
    operation === 'fuel'
      ? fuelLot(world, actor.id, itemId)!
      : lightingMaterials(world, actor.id)!.tinder;
  const definition = world.itemDefinitions[lot.definitionId]!;
  if (
    applyResourceGroup(
      world,
      {
        invocationId: actionId,
        fulfillment: 'all-or-nothing',
        operations: [
          {
            source: { kind: 'item', itemId: lot.id, definition: itemDefinitionPin(definition) },
            sourceRevision: lot.revision ?? 0,
            amount: 1,
          },
        ],
      },
      [],
    ).status !== 'applied'
  )
    return outcome(
      false,
      'missing-material',
      `${namePhrase(definition, 'definite', { capitalize: true })} is no longer available.`,
    );
  if (operation === 'fuel') {
    heat.fuelSeconds += BASE_FIRE_CARE.fuel.secondsPerUnit;
    emit(
      world,
      events,
      'fire-fueled',
      subjectNarration(actor, [
        `added ${namePhrase(definition, 'definite')} to `,
        person(fire!, 'object', 'definite'),
        '.',
      ]),
      actor,
      fire!.id,
      { actionId },
    );
    return {
      ...outcome(
        true,
        'completed',
        `Added one unit of ${namePhrase(definition)}; ${namePhrase(fire!, 'definite')} has ${fireFuelDescription(heat)}.`,
      ),
      spent: 1,
    };
  }
  heat.lit = true;
  emit(
    world,
    events,
    'fire-lit',
    subjectNarration(actor, ['lit ', person(fire!, 'object', 'definite'), '.']),
    actor,
    fire!.id,
    {
      actionId,
    },
  );
  return outcome(
    true,
    'completed',
    `${namePhrase(fire!, 'definite', { capitalize: true })} is burning, with ${fireFuelDescription(heat)}; one unit of ${namePhrase(definition)} was used as tinder.`,
  );
}

/** Action-record facts for the bundled wording owner. */
export function fireCareFacts(
  operation: FireOperation,
): { name: string; value: string; critical: true }[] {
  const seconds = BASE_FIRE_CARE[operation].workSeconds;
  const cost =
    operation === 'light'
      ? `Needs laid fuel, one carried tinder bundle (used up) and a rigid shaft as a drill (kept); ${seconds} game seconds`
      : operation === 'fuel'
        ? `Uses one carried fuel item when the work finishes; adds ${BASE_FIRE_CARE.fuel.secondsPerUnit / 3600} hour of burning, up to ${BASE_FIRE_CARE.fuel.maximumFuelSeconds / 3600} hours; ${seconds} game seconds`
        : `Unburnt fuel stays for relighting; waits while someone else is cooking there; ${seconds} game seconds`;
  return [
    { name: 'cost', value: `${cost}; cancelling before it finishes uses nothing`, critical: true },
  ];
}
