import { canonicalJson } from './events.js';
import { compileRecipeCandidate, recipeDependencyReferences } from './invention-families.js';
import { definitionPin, recipeFamily } from './world-modules.js';
import type { RecipeCandidate, WorldState } from './types.js';

/** New-world authoring, never live invention or a free item. The same trusted family
 * compiler and installed-recipe validation own the technique's mechanical meaning. */
export function installAuthoredTechnique(
  world: WorldState,
  id: string,
  candidate: RecipeCandidate,
  actorIds: readonly string[],
): void {
  const family = recipeFamily(world, candidate.family.id);
  if (!family || world.recipes[id])
    throw new Error('Authored technique must name a new installed-family recipe.');
  const compiled = compileRecipeCandidate(world, candidate);
  const outputDefinitionId = `${id}:output`;
  world.itemDefinitions[outputDefinitionId] = {
    ...structuredClone(compiled.outputDefinition),
    id: outputDefinitionId,
    version: 1,
    recipeId: id,
    ...candidate.output,
  };
  world.recipes[id] = {
    id,
    version: 1,
    name: candidate.name,
    description: candidate.description,
    inputs: structuredClone(candidate.inputs),
    output: structuredClone(candidate.output),
    outputDefinitionId,
    workSeconds: compiled.workSeconds,
    digest: canonicalJson(candidate),
    sourceCandidate: structuredClone(candidate),
    familyPin: definitionPin(family.definition),
    dependencyReferences: recipeDependencyReferences(world, candidate, compiled),
    facts: structuredClone(compiled.facts),
    admittedAt: world.simTime,
    provenance: { source: 'world-authored', requestId: id },
  };
  for (const actorId of actorIds)
    (world.knowledge[actorId] ??= []).push({
      recipeId: id,
      learnedAt: world.simTime,
      source: 'authored',
      evidenceId: id,
    });
}
