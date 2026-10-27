import { availableItemQuantity, type ResourceAvailability } from './resource-claims.js';
import type { Action, Entity, ItemDefinition, ItemInstance, WorldState } from './types.js';
import { entityGet } from './entity-collection.js';
import { itemFor } from './objects.js';
import { accessiblePossession, possessionItems } from './object-access.js';
import { equippedItem } from './equipment.js';
import { definitionPin, type DefinitionPin } from './world-modules.js';
import { isDefinitionPin, sameDefinitionPin } from './state-owners.js';

import { hasRecordFields } from './records.js';

/** One selected actor's current possessions, shared by finite controls and native
 * binding. This returns choices only; no future tool is claimed. */
export function carriedGatheringChoices(
  world: WorldState,
  actorId: string,
  resourceId?: string,
  availability?: ResourceAvailability,
  inventory: Iterable<ItemInstance> = possessionItems(world, actorId),
) {
  const choices: Array<{ item: ItemInstance; definition: ItemDefinition; quantity: number }> = [];
  for (const item of inventory) {
    const definition = world.itemDefinitions[item.definitionId],
      tool = definition?.gatheringTool;
    if (
      tool &&
      (!resourceId || tool.resourceId === resourceId) &&
      accessiblePossession(world, actorId, item.id) &&
      availableItemQuantity(world, item.id, undefined, availability) >= 1
    )
      choices.push({ item, definition, quantity: tool.quantity });
  }
  return choices;
}
export interface GatheringBinding {
  mode: 'available-tools' | 'bare-hands' | 'carried-tool' | 'equipped-tool';
  source: DefinitionPin;
  tool?: DefinitionPin;
}
/** The selected batch keeps its tool or hands; ordinary collection retains its
 * existing carried-tool discovery. All modes retain the source's actual meaning. */
export function gatheringBindingProblem(
  world: WorldState,
  actor: Entity,
  action: Action,
): string | undefined {
  const binding = action.gathering,
    source = entityGet(world.entities, action.targetId ?? ''),
    definition = source?.resource && world.itemDefinitions[source.resource.definitionId];
  if (!binding || !definition || !sameDefinitionPin(binding.source, definitionPin(definition)))
    return 'the selected source definition is no longer available.';
  if (binding.mode === 'bare-hands' || binding.mode === 'available-tools') return;
  const tool = action.itemId && itemFor(world, action.itemId),
    toolDefinition = tool && world.itemDefinitions[tool.definitionId];
  if (
    !tool ||
    !toolDefinition ||
    !binding.tool ||
    !sameDefinitionPin(binding.tool, definitionPin(toolDefinition)) ||
    !accessiblePossession(world, actor.id, tool.id) ||
    (binding.mode === 'equipped-tool' && !equippedItem(world, actor.id, 'gather', tool.id)) ||
    toolDefinition.gatheringTool?.resourceId !== definition.id
  )
    return 'the chosen gathering tool is no longer available.';
}
export function validateGatheringBinding(world: WorldState, actor: Entity): void {
  const action = actor.actor?.action,
    binding = action?.gathering;
  if (!action || (action.type !== 'gather' && binding === undefined)) return;
  if (
    action.type !== 'gather' ||
    !binding ||
    !hasRecordFields(binding, ['mode', 'source'], ['tool']) ||
    !['available-tools', 'bare-hands', 'carried-tool', 'equipped-tool'].includes(binding.mode) ||
    !isDefinitionPin(binding.source) ||
    (binding.mode === 'carried-tool' || binding.mode === 'equipped-tool'
      ? !action.itemId || !isDefinitionPin(binding.tool)
      : action.itemId !== undefined || binding.tool !== undefined) ||
    gatheringBindingProblem(world, actor, action)
  )
    throw new Error('Invalid saved gathering binding.');
}

export interface GatheringPolicy {
  bareHandQuantity: number;
}
export function validateGatheringPolicy(value: unknown): asserts value is GatheringPolicy | null {
  if (value === null) return;
  if (
    !hasRecordFields(value, ['bareHandQuantity']) ||
    !Number.isSafeInteger(value.bareHandQuantity) ||
    (value.bareHandQuantity as number) <= 0
  )
    throw new Error(
      'A gathering policy needs a positive whole bare-hand quantity, or explicit absence.',
    );
}

/** Wilderness v1: one carried tool's yield, never stacked multipliers or extra resources.
 * docs/architecture.md#shared-invention-workflow
 */
export function gatheringYield(
  world: Pick<WorldState, 'gatheringPolicy'>,
  definitions: Array<ItemDefinition | undefined>,
  resourceId: string,
): number {
  if (!world.gatheringPolicy) return 0;
  let quantity = world.gatheringPolicy.bareHandQuantity;
  for (const definition of definitions) {
    const tool = definition?.gatheringTool;
    if (tool?.resourceId === resourceId) quantity = Math.max(quantity, tool.quantity);
  }
  return quantity;
}

export function validateGatheringTools(world: WorldState): void {
  for (const definition of Object.values(world.itemDefinitions)) {
    if (!definition.gatheringTool) continue;
    const recipe = definition.recipeId ? world.recipes[definition.recipeId] : undefined;
    if (!recipe || !recipe.outputs.some((output) => output.definition.id === definition.id))
      throw new Error('Invalid saved gathering tool or definition binding.');
  }
}
