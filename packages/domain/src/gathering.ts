import type { ItemDefinition, WorldState } from './types.js';

import { BASE_GATHER_QUANTITY } from './worlds/base/actions.js';
export { BASE_GATHER_QUANTITY } from './worlds/base/actions.js';

/** Wilderness v1: one carried tool's yield, never stacked multipliers or extra resources.
 * docs/architecture.md#shared-invention-workflow
 */
export function gatheringYield(
  definitions: Array<ItemDefinition | undefined>,
  resourceId: string,
): number {
  let quantity = BASE_GATHER_QUANTITY;
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
    if (!recipe || recipe.outputDefinitionId !== definition.id)
      throw new Error('Invalid saved gathering tool or definition binding.');
  }
}
