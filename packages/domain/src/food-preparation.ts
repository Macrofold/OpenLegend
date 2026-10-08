import { itemFor } from './objects.js';
import { accessiblePossession } from './object-access.js';
import {
  availableItemQuantity,
  itemDefinitionPin,
  RESOURCE_GROUP_OPERATION_LIMIT,
  type ResourceOperation,
} from './resource-claims.js';
import { definitionPin, type DefinitionPin } from './world-modules.js';
import { isDefinitionPin, sameDefinitionPin } from './state-owners.js';
import { ACTIVITY_LIMITS } from './action-experience.js';
import { getOwn, hasRecordFields, isSafeRecordId } from './records.js';
import { chargeWork, withWorkMeter, WORK_LIMITS } from './work-budget.js';
import type { Command, ItemInstance, WorldState } from './types.js';

/** Installed data for the existing cooking owner; no executable effect language.
 * docs/food-preparation.md#preparation-definitions-and-exact-choices */
export interface FoodPreparationDefinition {
  id: string;
  version: number;
  name: string;
  description: string;
  inputs: { role: string; definitionId: string; quantity: number }[];
  outputs: { definitionId: string; quantity: number }[];
  workSeconds: number;
  heat: 'lit';
  completedText: string;
}
export interface FoodPreparationBinding {
  definition: DefinitionPin;
  inputs: Record<string, string>;
  items: DefinitionPin[];
}
export interface CookingPreparation {
  definition: FoodPreparationDefinition;
  pin: DefinitionPin;
  inputs: Record<string, string>;
}
export type CookCommand = Extract<Command, { type: 'cook' }>;
export function isCookingInputRole(value: unknown): value is string {
  return isSafeRecordId(value) && /^[a-z][a-z0-9_-]*$/.test(value);
}
/** A reviewed transformation includes the meanings of its referenced materials.
 * Keep cached individual pins; only compose the small dependency vector here.
 * docs/food-preparation.md#preparation-definitions-and-exact-choices */
export function preparationPin(
  world: WorldState,
  definition: FoodPreparationDefinition,
): DefinitionPin | undefined {
  const items: DefinitionPin[] = [];
  for (const id of [
    ...new Set([...definition.inputs, ...definition.outputs].map((item) => item.definitionId)),
  ].sort()) {
    const item = getOwn(world.itemDefinitions, id);
    if (!item) return;
    items.push(itemDefinitionPin(item));
  }
  const meaning = {
    ...definitionPin(definition),
    items,
  };
  return definitionPin(meaning);
}

export function preparationDefinition(
  world: WorldState,
  command: Pick<CookCommand, 'preparationId' | 'preparationVersion' | 'preparationDigest'>,
): FoodPreparationDefinition | undefined {
  const definition = getOwn(world.foodPreparations, command.preparationId);
  const pin = definition && preparationPin(world, definition);
  return pin &&
    sameDefinitionPin(pin, {
      id: command.preparationId,
      version: command.preparationVersion,
      digest: command.preparationDigest,
    })
    ? definition
    : undefined;
}
export function preparationForBinding(
  world: WorldState,
  binding: FoodPreparationBinding,
): FoodPreparationDefinition | undefined {
  const definition = getOwn(world.foodPreparations, binding.definition.id);
  const pin = definition && preparationPin(world, definition);
  const itemIds = definition && [
    ...new Set([...definition.inputs, ...definition.outputs].map((item) => item.definitionId)),
  ];
  return pin &&
    sameDefinitionPin(pin, binding.definition) &&
    Object.keys(binding.inputs).length === definition.inputs.length &&
    definition.inputs.every((input) => isSafeRecordId(getOwn(binding.inputs, input.role))) &&
    binding.items.length === itemIds!.length &&
    new Set(binding.items.map((pin) => pin.id)).size === binding.items.length &&
    binding.items.every((pin) => itemIds!.includes(pin.id)) &&
    binding.items.every((pin) => {
      const item = getOwn(world.itemDefinitions, pin.id);
      return item && sameDefinitionPin(itemDefinitionPin(item), pin);
    })
    ? definition
    : undefined;
}
export function cookingClaims(
  world: WorldState,
  actorId: string,
  definition: FoodPreparationDefinition,
  inputs: Record<string, string>,
): ResourceOperation[] | undefined {
  chargeWork({ tests: definition.inputs.length });
  if (Object.keys(inputs).length !== definition.inputs.length) return;
  const claims: ResourceOperation[] = [];
  const amounts = new Map<string, number>();
  for (const input of definition.inputs) {
    const item = itemFor(world, inputs[input.role] ?? '');
    if (
      !item ||
      item.definitionId !== input.definitionId ||
      !accessiblePossession(world, actorId, item.id)
    )
      return;
    const amount = (amounts.get(item.id) ?? 0) + input.quantity;
    if (availableItemQuantity(world, item.id) < amount) return;
    amounts.set(item.id, amount);
    claims.push({
      source: {
        kind: 'item',
        itemId: item.id,
        definition: itemDefinitionPin(world.itemDefinitions[item.definitionId]!),
      },
      sourceRevision: item.revision ?? 0,
      amount: input.quantity,
    });
  }
  return claims;
}
/** Selection reads only supplied permitted lots. One exact lot per named input role;
 * quantities are authored by the preparation, never inferred from food names. */
export function cookingChoices(
  world: WorldState,
  inventory: readonly ItemInstance[],
  heatId: string,
  selectedItemId?: string,
): CookCommand[] {
  return cookingPreparations(world, inventory, selectedItemId).map((choice) =>
    cookingCommand(choice, heatId),
  );
}
/** Ingredient assignment is independent of heat: reuse this permitted read within
 * one unchanged request rather than searching again for every visible fire. */
export function cookingPreparations(
  world: WorldState,
  inventory: readonly ItemInstance[],
  selectedItemId?: string,
): CookingPreparation[] {
  // Choice reads can run outside a native transition; retain the same work ceiling
  // when exact ingredient assignment needs to try more than the first set of lots.
  return withWorkMeter(WORK_LIMITS.group, () =>
    cookingPreparationsWithinWork(world, inventory, selectedItemId),
  );
}
export function cookingCommand(choice: CookingPreparation, heatId: string): CookCommand {
  const pin = choice.pin;
  return {
    id: 'cooking-choice',
    actorId: '',
    type: 'cook',
    preparationId: pin.id,
    preparationVersion: pin.version,
    preparationDigest: pin.digest,
    inputs: { ...choice.inputs },
    heatId,
  };
}
function cookingPreparationsWithinWork(
  world: WorldState,
  inventory: readonly ItemInstance[],
  selectedItemId?: string,
): CookingPreparation[] {
  const choices: CookingPreparation[] = [];
  const lotsByDefinition = new Map<string, ItemInstance[]>();
  const free = new Map<string, number>();
  let selected: ItemInstance | undefined;
  chargeWork({ tests: inventory.length });
  for (const item of inventory) {
    free.set(item.id, availableItemQuantity(world, item.id));
    const lots = lotsByDefinition.get(item.definitionId);
    if (item.id === selectedItemId) selected = item;
    if (lots && item.id === selectedItemId) lots.unshift(item);
    else if (lots) lots.push(item);
    else lotsByDefinition.set(item.definitionId, [item]);
  }
  for (const definition of Object.values(world.foodPreparations)) {
    chargeWork({ tests: definition.inputs.length });
    if (
      selectedItemId &&
      (!selected ||
        !definition.inputs.some(
          (input) =>
            input.definitionId === selected.definitionId &&
            (free.get(selected.id) ?? 0) >= input.quantity,
        ))
    )
      continue;
    const inputs: Record<string, string> = {};
    const used = new Map<string, number>();
    const groups = new Map<string, FoodPreparationDefinition['inputs']>();
    for (const input of definition.inputs) {
      const group = groups.get(input.definitionId);
      if (group) group.push(input);
      else groups.set(input.definitionId, [input]);
    }
    let possible = true;
    for (const [definitionId, roles] of groups) {
      const lots = lotsByDefinition.get(definitionId) ?? [];
      chargeWork({ tests: lots.length });
      const minimum = Math.min(...roles.map((role) => role.quantity));
      const needed = roles.reduce((sum, role) => sum + role.quantity, 0);
      const available = lots.reduce((sum, lot) => sum + (free.get(lot.id) ?? 0), 0);
      const slots = lots.reduce(
        (sum, lot) => Math.min(roles.length, sum + Math.floor((free.get(lot.id) ?? 0) / minimum)),
        0,
      );
      if ((Number.isSafeInteger(needed) && available < needed) || slots < roles.length) {
        possible = false;
        break;
      }
      // Different materials cannot compete for one lot. Solve each group separately,
      // larger roles first; equal remaining quantities are interchangeable except
      // for the specifically selected lot. This avoids factorial retries of identical
      // physical assignments without omitting an admissible preparation.
      roles.sort((a, b) => b.quantity - a.quantity);
      const choose = (index: number, selectedUsed: boolean): boolean => {
        const input = roles[index];
        if (!input) return selectedUsed;
        const seen = new Set<string>();
        for (const lot of lots) {
          chargeWork({ tests: 1 });
          const amount = used.get(lot.id) ?? 0;
          const remaining = (free.get(lot.id) ?? 0) - amount;
          const equivalent = `${remaining}:${lot.id === selectedItemId}`;
          if (remaining < input.quantity || seen.has(equivalent)) continue;
          seen.add(equivalent);
          inputs[input.role] = lot.id;
          used.set(lot.id, amount + input.quantity);
          if (choose(index + 1, selectedUsed || lot.id === selectedItemId)) return true;
          used.set(lot.id, amount);
          delete inputs[input.role];
        }
        return false;
      };
      if (!choose(0, !selectedItemId || selected?.definitionId !== definitionId)) {
        possible = false;
        break;
      }
    }
    // Mutable native worlds cannot use the frozen-definition cache. Capture once
    // for every fire in this unchanged read; execution still checks current meaning.
    if (possible) {
      const pin = preparationPin(world, definition);
      if (pin) choices.push({ definition, pin, inputs });
    }
  }
  return choices;
}
export function validCookCommand(value: CookCommand): boolean {
  return (
    validCookReference(value) &&
    isSafeRecordId(value.heatId) &&
    validCookingInputs(value.inputs) &&
    Object.keys(value.inputs).length > 0
  );
}
/** Queued products and direct commands must name the same supported preparation. */
export function validCookReference(value: {
  preparationId?: unknown;
  preparationVersion?: unknown;
  preparationDigest?: unknown;
}): boolean {
  return isDefinitionPin({
    id: value.preparationId,
    version: value.preparationVersion,
    digest: value.preparationDigest,
  });
}
export function validCookingInputs(value: unknown): value is Record<string, string> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.entries(value).every(([role, id]) => isCookingInputRole(role) && isSafeRecordId(id))
  );
}
/** Flatten private input identities only for the existing activity argument language.
 * The original command remains the sole executable representation. */
export function activityCommandFields(command: Command): Record<string, unknown> {
  if (command.type !== 'cook') return command as unknown as Record<string, unknown>;
  const { inputs, ...fields } = command;
  return {
    ...fields,
    ...Object.fromEntries(Object.entries(inputs).map(([role, id]) => [`input:${role}`, id])),
  };
}
export const isCookingInputField = (field: string): boolean =>
  field.startsWith('input:') && isCookingInputRole(field.slice(6));

export function validateFoodPreparations(world: WorldState): void {
  if (
    !world.foodPreparations ||
    typeof world.foodPreparations !== 'object' ||
    Array.isArray(world.foodPreparations)
  )
    throw new Error(
      'Incompatible development food preparation data. Existing saves were not replaced.',
    );
  for (const [id, definition] of Object.entries(world.foodPreparations)) {
    if (
      !hasRecordFields(definition, [
        'id',
        'version',
        'name',
        'description',
        'inputs',
        'outputs',
        'workSeconds',
        'heat',
        'completedText',
      ]) ||
      id !== definition.id ||
      !isSafeRecordId(id) ||
      !Number.isSafeInteger(definition.version) ||
      definition.version < 1 ||
      [definition.name, definition.description, definition.completedText].some(
        (text) => typeof text !== 'string' || !text.trim() || text.length > ACTIVITY_LIMITS.text,
      ) ||
      !Number.isFinite(definition.workSeconds) ||
      definition.workSeconds <= 0 ||
      definition.heat !== 'lit' ||
      !Array.isArray(definition.inputs) ||
      !definition.inputs.length ||
      definition.inputs.length > RESOURCE_GROUP_OPERATION_LIMIT ||
      !Array.isArray(definition.outputs) ||
      !definition.outputs.length ||
      definition.outputs.length > ACTIVITY_LIMITS.outputs ||
      definition.inputs.some(
        (input) =>
          !hasRecordFields(input, ['role', 'definitionId', 'quantity']) ||
          !isCookingInputRole(input.role),
      ) ||
      definition.outputs.some((output) => !hasRecordFields(output, ['definitionId', 'quantity'])) ||
      definition.outputs.some(
        (output) => world.itemDefinitions[output.definitionId]?.container && output.quantity !== 1,
      ) ||
      new Set(definition.outputs.map((output) => output.definitionId)).size !==
        definition.outputs.length ||
      new Set(definition.inputs.map((input) => input.role)).size !== definition.inputs.length ||
      [...definition.inputs, ...definition.outputs].some(
        (lot) =>
          !getOwn(world.itemDefinitions, lot.definitionId) ||
          !Number.isSafeInteger(lot.quantity) ||
          lot.quantity <= 0,
      )
    )
      throw new Error('Invalid installed food preparation.');
  }
  for (const entity of Object.values(world.entities)) {
    const action = entity.actor?.action;
    if (action?.type !== 'cook') continue;
    const binding = action.foodPreparation;
    const definition = binding && getOwn(world.foodPreparations, binding.definition?.id);
    if (
      !binding ||
      !definition ||
      !isDefinitionPin(binding.definition) ||
      !Array.isArray(binding.items) ||
      !binding.items.every(isDefinitionPin) ||
      !binding.inputs ||
      typeof binding.inputs !== 'object' ||
      Array.isArray(binding.inputs) ||
      !preparationForBinding(world, binding) ||
      action.totalSeconds !== definition.workSeconds ||
      !Number.isFinite(action.remainingSeconds) ||
      action.remainingSeconds <= 0 ||
      action.remainingSeconds > action.totalSeconds ||
      !['approaching', 'working'].includes(action.stage) ||
      JSON.stringify(action.consumed) !==
        JSON.stringify(
          action.stage === 'working'
            ? definition.inputs.map(({ definitionId, quantity }) => ({ definitionId, quantity }))
            : [],
        ) ||
      Object.keys(binding.inputs).length !==
        world.foodPreparations[binding.definition.id]!.inputs.length ||
      Object.values(binding.inputs).some((id) => !isSafeRecordId(id)) ||
      !world.entities[action.heatId ?? '']?.heat
    )
      throw new Error('Invalid saved cooking binding.');
  }
}
