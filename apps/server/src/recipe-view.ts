import {
  craftCatalogueCategory,
  itemIllustration,
  manufactureInputQuantities,
  recipeFamily,
  type RecipeDefinition,
  type WorldState,
} from '@open-legend/domain';
import type { RecipeDetailsView, RecipeView } from '@open-legend/protocol';

export function authoredRecipeView(
  world: WorldState,
  recipe: RecipeDefinition,
  quantity: (definitionId: string) => number,
): RecipeView {
  return {
    id: recipe.id,
    ...recipeDetailsView(world, recipe, quantity),
    origin: 'authored',
    provenance: 'Known authored method; learned through an admitted disclosure.',
  };
}

/** Exact method facts, without inventor identity, private history or dependency closure. */
export function recipeDetailsView(
  world: WorldState,
  recipe: RecipeDefinition,
  quantity: (definitionId: string) => number,
): RecipeDetailsView {
  const family =
    recipe.source.kind === 'family'
      ? recipeFamily(world, recipe.source.candidate.family.id)
      : undefined;
  return {
    name: recipe.name,
    category: craftCatalogueCategory(world, recipe),
    description: recipe.description,
    outputs: recipe.outputs.map(({ port, definition, quantity }) => ({
      port,
      quantity,
      name: world.itemDefinitions[definition.id]!.name,
      icon: world.itemDefinitions[definition.id]!.icon,
      art: itemIllustration(world, definition.id),
      ...(world.itemDefinitions[definition.id]!.equipment
        ? { equipmentPorts: [...world.itemDefinitions[definition.id]!.equipment!.ports] }
        : {}),
      description: world.itemDefinitions[definition.id]!.description,
    })),
    facts: recipe.facts,
    limitations: family ? [family.definition.limitation] : [],
    family: family?.definition.name ?? 'Material transformation',
    ingredients: [...manufactureInputQuantities(recipe)].map(([definitionId, required]) => ({
      name: world.itemDefinitions[definitionId]!.name,
      icon: world.itemDefinitions[definitionId]!.icon,
      art: itemIllustration(world, definitionId),
      quantity: required,
      available: quantity(definitionId),
    })),
    retainedTools: recipe.retainedTools.map((tool) => ({
      role: tool.role,
      quantity: tool.quantity,
      choices: tool.allowedDefinitions.map((pin) => ({
        name: world.itemDefinitions[pin.id]!.name,
        available: quantity(pin.id),
      })),
    })),
    workSeconds: recipe.workSeconds,
  };
}
