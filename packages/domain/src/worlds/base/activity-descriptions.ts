import type { RecipeDefinition, WorldState } from '../../types.js';

/** The same known method has one material/cost meaning in ordinary work and in a
 * proposed agreement. Output selection remains a separately bound role. */
export function recipeRequestDescription(world: WorldState, recipe: RecipeDefinition): string {
  const inputs = recipe.inputs
    .map(
      (input) =>
        `${input.quantity} ${world.itemDefinitions[input.definitionId]!.name}${input.role ? ` for ${input.role}` : ''}`,
    )
    .join(', ');
  const outputs = recipe.outputs
    .map((output) => `${output.quantity} ${world.itemDefinitions[output.definition.id]!.name}`)
    .join(', ');
  const tools = recipe.retainedTools
    .map(
      (tool) =>
        `${tool.quantity} ${tool.allowedDefinitions.map((pin) => world.itemDefinitions[pin.id]!.name).join(' or ')} for ${tool.role}`,
    )
    .join(', ');
  return `${recipe.name}; ${recipe.workSeconds} game seconds per batch; spends ${inputs}; makes ${outputs}${tools ? `; keeps ${tools}` : ''}.`;
}
