import type { ItemDefinition, WorldState } from './types.js';
import { DECLARATION_CONTRACT } from './invention-families.js';

export const BASE_GATHER_QUANTITY = 2;

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
  const [minimum, maximum] = DECLARATION_CONTRACT.gatheringTool.quantity;
  for (const recipe of Object.values(world.recipes))
    if (
      recipe.output.kind === 'gathering-tool' &&
      !world.itemDefinitions[recipe.outputDefinitionId]?.gatheringTool
    )
      throw new Error('Missing saved gathering-tool output.');
  for (const definition of Object.values(world.itemDefinitions)) {
    const recipe = definition.recipeId ? world.recipes[definition.recipeId] : undefined;
    const tool = definition.gatheringTool;
    if (!tool && recipe?.output.kind !== 'gathering-tool') continue;
    if (
      !tool ||
      !Number.isInteger(tool.quantity) ||
      tool.quantity < minimum ||
      tool.quantity > maximum ||
      !world.itemDefinitions[tool.resourceId] ||
      world.itemDefinitions[tool.resourceId]!.recipeId ||
      recipe?.output.kind !== 'gathering-tool' ||
      recipe.output.gatheringTool?.resourceId !== tool.resourceId ||
      recipe.output.gatheringTool?.quantity !== tool.quantity ||
      recipe.outputDefinitionId !== definition.id
    )
      throw new Error('Invalid saved gathering tool or definition binding.');
  }
}
