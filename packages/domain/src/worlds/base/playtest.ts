import { itemFor } from '../../objects.js';
import type { WorldEvent, WorldState } from '../../types.js';

/** Bundled playtest goals, not universal world progression. External-world composition
 * must supply its own presentation; this local seam avoids another writable progress owner. */
export function basePlaytestMilestones(
  world: WorldState,
  actorId: string,
  events: readonly WorldEvent[],
  purpose: 'projection' | 'recording' = 'projection',
) {
  const known = (world.knowledge[actorId] ?? []).flatMap(({ recipeId }) => {
    const recipe = world.recipes[recipeId];
    return recipe ? [world.itemDefinitions[recipe.outputDefinitionId]] : [];
  });
  const actor = world.entities[actorId]?.actor;
  const equipped = actor?.equippedItemId && itemFor(world, actor.equippedItemId);
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
      label: 'Invent a sling with live AI',
      // An independent live proposal can reuse a method the actor previously read.
      // Keep its original knowledge evidence; the admitted event credits this experience.
      done:
        events.some(
          (event) =>
            event.type === 'declaration-admitted' &&
            event.actorId === actorId &&
            event.data?.source === 'live-model' &&
            world.itemDefinitions[
              world.recipes[String(event.data.recipeId)]?.outputDefinitionId ?? ''
            ]?.launcher?.mechanism === 'swing',
        ) ||
        (world.knowledge[actorId] ?? []).some(
          (knowledge) =>
            knowledge.source === 'invented' &&
            world.declarationReceipts[knowledge.evidenceId]?.source === 'live-model' &&
            world.itemDefinitions[world.recipes[knowledge.recipeId]?.outputDefinitionId ?? '']
              ?.launcher?.mechanism === 'swing',
        ),
    },
    // Preserve the earlier saved flag's broader equipped-item completion while the live card
    // asks for a launcher. Narrowing historical playtest progress is unrelated to extraction.
    {
      id: 'craft',
      label: 'Craft and equip a launcher',
      done: purpose === 'recording' ? !!actor?.equippedItemId : !!launcher,
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
