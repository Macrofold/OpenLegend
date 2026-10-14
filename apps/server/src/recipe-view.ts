import { recipeFamily, type RecipeDefinition, type WorldState } from '@open-legend/domain';
import type { RecipeDetailsView } from '@open-legend/protocol';

/** Exact method facts, without inventor identity, private history or dependency closure. */
export function recipeDetailsView(
  world: WorldState,
  recipe: RecipeDefinition,
  quantity: (definitionId: string) => number,
): RecipeDetailsView {
  const family = recipeFamily(world, recipe.sourceCandidate.family.id)!;
  return {
    name: recipe.name,
    description: recipe.description,
    output: recipe.output,
    facts: recipe.facts,
    limitations: [family.definition.limitation],
    family: family.definition.name,
    ingredients: recipe.inputs.map((input) => ({
      name: world.itemDefinitions[input.definitionId]!.name,
      quantity: input.quantity,
      available: quantity(input.definitionId),
      role: input.role,
    })),
    workSeconds: recipe.workSeconds,
  };
}
