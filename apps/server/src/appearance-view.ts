import {
  appearanceFor,
  appearanceFamily,
  appearanceOutfit,
  type Entity,
  type WorldState,
} from '@open-legend/domain';
import type { AppearanceView } from '@open-legend/protocol';

/** Call only after selecting the permitted wearer. No global recipe catalogue or
 * private authoring provenance reaches ordinary observers or cognition. */
export function projectAppearance(world: WorldState, entity: Entity): AppearanceView | undefined {
  const state = appearanceFor(world, entity);
  const family = state && appearanceFamily(world, state.recipe.family);
  if (!state || !family?.compiled || !family.compiledPath) return;
  return {
    revision: state.revision,
    recipe: state.recipe,
    compiled: family.compiled,
    compiledPath: family.compiledPath,
    outfit: appearanceOutfit(world, entity.id),
  };
}
