import { equippedItem } from '../../equipment.js';
import type { WorldEvent, WorldState } from '../../types.js';

/** Bundled playtest goals, not universal world progression. External-world composition
 * must supply its own presentation; this local seam avoids another writable progress owner. */
export function basePlaytestMilestones(
  world: WorldState,
  actorId: string,
  events: readonly WorldEvent[],
) {
  const known = (world.knowledge[actorId] ?? []).flatMap(({ recipeId }) => {
    const recipe = world.recipes[recipeId];
    return recipe ? [world.itemDefinitions[recipe.outputDefinitionId]] : [];
  });
  const equipped = equippedItem(world, actorId, 'ranged');
  const launcher = equipped && world.itemDefinitions[equipped.definitionId]?.launcher;
  return [
    {
      id: 'talk',
      label: 'Talk with Ada',
      done: events.some(
        (event) =>
          event.type === 'speech' && event.actorId !== actorId && event.audience.includes(actorId),
      ),
    },
    {
      id: 'invent',
      label: 'Invent a sling',
      done: known.some((item) => item?.launcher?.mechanism === 'swing'),
    },
    {
      id: 'craft',
      label: 'Craft and equip a launcher',
      done: !!launcher,
    },
    {
      id: 'hunt',
      label: 'Hunt and harvest',
      done: events.some((event) => event.type === 'harvested' && event.actorId === actorId),
    },
    {
      id: 'eat',
      label: 'Cook and eat a meal',
      done: events.some(
        (event) => event.type === 'ate' && event.actorId === actorId && /meat/i.test(event.text),
      ),
    },
    {
      id: 'bow',
      label: 'Discover bow and arrow',
      done:
        known.some((item) => item?.launcher?.mechanism === 'flex') &&
        known.some((item) => item?.ammunition?.kind === 'arrow'),
    },
  ];
}
