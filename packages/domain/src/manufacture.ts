import { possessionItems, accessiblePossession } from './object-access.js';
import { itemFor } from './objects.js';
import { materialInventoryRule } from './material-inventory.js';
import { definitionPin, type DefinitionPin } from './world-modules.js';
import { sameDefinitionPin } from './state-owners.js';
import { isSafeRecordId, hasRecordFields } from './records.js';
import { chargeWork } from './work-budget.js';
import { MANUFACTURE_LIMITS } from './manufacture-limits.js';
import {
  availableItemQuantity,
  reserveResource,
  ResourceReservationError,
  type ResourceAvailability,
  type ResourceOperation,
} from './resource-claims.js';
import type {
  Action,
  Command,
  ItemInstance,
  Outcome,
  RecipeDefinition,
  WorldState,
} from './types.js';

export interface ManufactureToolBinding {
  role: string;
  itemId: string;
  definition: DefinitionPin;
  quantity: number;
}
interface StockLot {
  item: ItemInstance;
  available: number;
}
export interface ManufactureStock {
  byId: Map<string, StockLot>;
  byDefinition: Map<string, StockLot[]>;
}
/** One actor-scoped preparation can serve every known method in this read. */
export function prepareManufactureStock(
  world: WorldState,
  actorId: string,
  availability?: ResourceAvailability,
): ManufactureStock {
  const byId = new Map<string, StockLot>(),
    byDefinition = new Map<string, StockLot[]>();
  for (const item of possessionItems(world, actorId)) {
    chargeWork({ candidates: 1 });
    const lot = { item, available: availableItemQuantity(world, item.id, undefined, availability) };
    byId.set(item.id, lot);
    const rows = byDefinition.get(item.definitionId) ?? [];
    rows.push(lot);
    byDefinition.set(item.definitionId, rows);
  }
  for (const rows of byDefinition.values()) rows.sort((a, b) => a.item.id.localeCompare(b.item.id));
  return { byId, byDefinition };
}
export function validManufactureTools(value: unknown): value is Record<string, string> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length <= MANUFACTURE_LIMITS.retainedToolRoles &&
    Object.entries(value).every(([role, id]) => isSafeRecordId(role) && isSafeRecordId(id))
  );
}
const missing = (message: string): Outcome => ({ ok: false, code: 'missing-material', message });
/** Different roles may consume the same material. Offers and execution need its
 * complete quantity, not an independent comparison for each role. */
export function manufactureInputQuantities(recipe: Pick<RecipeDefinition, 'inputs'>) {
  const totals = new Map<string, number>();
  for (const input of recipe.inputs)
    totals.set(input.definitionId, (totals.get(input.definitionId) ?? 0) + input.quantity);
  return totals;
}
/** Exact assignments share the same stock and exclusion arithmetic with offers. */
export function prepareManufacture(
  world: WorldState,
  actorId: string,
  recipe: RecipeDefinition,
  selected: Record<string, string> | undefined,
  stock = prepareManufactureStock(world, actorId),
): { tools: ManufactureToolBinding[]; claims: ResourceOperation[] } | Outcome {
  if (
    (selected !== undefined && !validManufactureTools(selected)) ||
    Object.keys(selected ?? {}).some(
      (role) => !recipe.retainedTools.some((tool) => tool.role === role),
    )
  )
    return missing('Choose only the exact retained tools required by this method.');
  const used = new Map<string, number>(),
    tools: ManufactureToolBinding[] = [];
  for (const role of recipe.retainedTools) {
    const id = selected?.[role.role],
      lot = id && stock.byId.get(id);
    const definition = lot && world.itemDefinitions[lot.item.definitionId];
    if (
      !lot ||
      !definition ||
      !role.allowedDefinitions.some((pin) => sameDefinitionPin(pin, definitionPin(definition))) ||
      lot.available - (used.get(lot.item.id) ?? 0) < role.quantity
    )
      return missing(
        `Select an accessible, available tool for ${role.role}; it is kept during this work.`,
      );
    used.set(lot.item.id, (used.get(lot.item.id) ?? 0) + role.quantity);
    tools.push({
      role: role.role,
      itemId: lot.item.id,
      definition: definitionPin(definition),
      quantity: role.quantity,
    });
  }
  const claims: ResourceOperation[] = [];
  for (const [definitionId, quantity] of manufactureInputQuantities(recipe)) {
    let remaining = quantity;
    for (const lot of stock.byDefinition.get(definitionId) ?? []) {
      const amount = Math.min(remaining, lot.available - (used.get(lot.item.id) ?? 0));
      if (amount <= 0) continue;
      claims.push({
        source: {
          kind: 'item',
          itemId: lot.item.id,
          definition: definitionPin(world.itemDefinitions[definitionId]!),
        },
        sourceRevision: lot.item.revision ?? 0,
        amount,
      });
      remaining -= amount;
      if (!remaining) break;
    }
    if (remaining)
      return missing(
        `Need ${quantity} ${world.itemDefinitions[definitionId]!.name} in addition to the retained tools.`,
      );
  }
  return { tools, claims };
}
/** Choose only for a new offer. The returned command binds these exact identities;
 * execution and finite continuation never substitute a later replacement tool. */
export function chooseManufactureTools(
  world: WorldState,
  actorId: string,
  recipe: RecipeDefinition,
  stock: ManufactureStock,
): Record<string, string> | undefined {
  if (!recipe.retainedTools.length) return undefined;
  const selected: Record<string, string> = {};
  const visit = (index: number): boolean => {
    if (index === recipe.retainedTools.length)
      return !('ok' in prepareManufacture(world, actorId, recipe, selected, stock));
    const role = recipe.retainedTools[index]!;
    const seen = new Set<string>();
    for (const pin of role.allowedDefinitions)
      for (const lot of stock.byDefinition.get(pin.id) ?? []) {
        chargeWork({ candidates: 1 });
        // Equivalent free units have identical role/material constraints. Keep a
        // specifically selected identity distinct when it is needed by another role.
        const key = JSON.stringify([
          pin.id,
          Math.min(
            lot.available,
            recipe.retainedTools.reduce((sum, tool) => sum + tool.quantity, 0),
          ),
          Object.values(selected).includes(lot.item.id),
        ]);
        if (seen.has(key) || lot.available < role.quantity) continue;
        seen.add(key);
        selected[role.role] = lot.item.id;
        if (visit(index + 1)) return true;
        delete selected[role.role];
      }
    return false;
  };
  return visit(0) ? selected : undefined;
}
/** Existing one-output families need no stock preparation just to bind a command. */
export function prepareManufactureChoices(world: WorldState, actorId: string) {
  let stock: ManufactureStock | undefined;
  return (
    recipe: RecipeDefinition,
  ): Pick<Extract<Command, { type: 'craft' }>, 'type' | 'recipeId' | 'tools'> => {
    const tools = recipe.retainedTools.length
      ? chooseManufactureTools(
          world,
          actorId,
          recipe,
          (stock ??= prepareManufactureStock(world, actorId)),
        )
      : undefined;
    return { type: 'craft', recipeId: recipe.id, ...(tools ? { tools } : {}) };
  };
}
/** The object owner determines whether a port needs separate physical identities. */
export function manufactureOutputLots(
  world: WorldState,
  recipe: Pick<RecipeDefinition, 'outputs'>,
  individualUnits = false,
) {
  return recipe.outputs.flatMap((output) => {
    const definition = world.itemDefinitions[output.definition.id]!;
    const rule = materialInventoryRule(world, definition);
    const individual = individualUnits || !!definition.container || (!!rule && !rule.homogeneous);
    return individual
      ? Array.from({ length: output.quantity }, () => ({
          port: output.port,
          definitionId: definition.id,
          quantity: 1,
        }))
      : [{ port: output.port, definitionId: definition.id, quantity: output.quantity }];
  });
}
/** Native action IDs and bounded numeric role positions are allocated by their
 * existing owners, so this reference has no ambiguous authored-ID separator. */
const toolHoldId = (action: Action, index: number) => `${action.id}:manufacture-tool:${index}`;
export function reserveManufactureTools(world: WorldState, actorId: string, action: Action): void {
  for (const [index, tool] of (action.manufactureTools ?? []).entries()) {
    const item = itemFor(world, tool.itemId);
    if (
      !item ||
      reserveResource(
        world,
        {
          id: toolHoldId(action, index),
          invocationId: action.id,
          actorId,
          resource: { kind: 'item', itemId: tool.itemId, definition: tool.definition },
          amount: tool.quantity,
        },
        item.revision ?? 0,
      ).status !== 'applied'
    )
      throw new ResourceReservationError();
  }
}
export function manufactureToolProblem(
  world: WorldState,
  actorId: string,
  action: Action,
  recipe: RecipeDefinition,
): string | undefined {
  if (
    !Array.isArray(action.manufactureTools) ||
    action.manufactureTools.length !== recipe.retainedTools.length
  )
    return 'The exact retained tool bindings are missing.';
  for (const [index, role] of recipe.retainedTools.entries()) {
    const tool = action.manufactureTools[index]!,
      item = itemFor(world, tool.itemId);
    const hold = world.resourceReservations?.[toolHoldId(action, index)];
    if (
      !hasRecordFields(tool, ['role', 'itemId', 'definition', 'quantity']) ||
      tool.role !== role.role ||
      tool.quantity !== role.quantity ||
      !item ||
      !accessiblePossession(world, actorId, item.id) ||
      !role.allowedDefinitions.some((pin) => sameDefinitionPin(pin, tool.definition)) ||
      !sameDefinitionPin(
        tool.definition,
        definitionPin(world.itemDefinitions[item.definitionId]!),
      ) ||
      !hold ||
      hold.state !== 'held' ||
      hold.actorId !== actorId ||
      hold.invocationId !== action.id ||
      hold.amount !== tool.quantity ||
      hold.resource.kind !== 'item' ||
      hold.resource.itemId !== tool.itemId ||
      !sameDefinitionPin(hold.resource.definition, tool.definition)
    )
      return 'A retained tool or its exact hold is no longer available.';
  }
}
