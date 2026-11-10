import { BASE_PLAYTEST_AUDIENCE_MILESTONE } from './playtest-event-rule.js';
import { equippedItem } from '../../equipment.js';
import { nativeText } from '../../narration.js';
import type { WorldEvent, WorldState } from '../../types.js';

export const BASE_PLAYTEST_MILESTONES = [
  { id: BASE_PLAYTEST_AUDIENCE_MILESTONE.id, label: 'Talk with Ada' },
  { id: 'invent', label: 'Invent a sling with live AI' },
  { id: 'craft', label: 'Craft and equip a ranged weapon' },
  { id: 'hunt', label: 'Hunt and harvest' },
  { id: 'eat', label: 'Cook and eat a meal' },
  { id: 'bow', label: 'Discover bow and arrow' },
] as const;

/** Bundled playtest goals, not universal world progression. External-world composition
 * must supply its own presentation; this local seam avoids another writable progress owner. */
export function basePlaytestMilestones(
  world: WorldState,
  actorId: string,
  events: readonly WorldEvent[],
) {
  const known = (world.knowledge[actorId] ?? []).flatMap(({ recipeId }) => {
    const recipe = world.recipes[recipeId];
    return recipe ? [world.itemDefinitions[recipe.outputs[0]!.definition.id]] : [];
  });
  const equipped = equippedItem(world, actorId, 'ranged');
  const rangedWeapon = equipped && world.itemDefinitions[equipped.definitionId]?.rangedWeapon;
  return [
    {
      id: BASE_PLAYTEST_AUDIENCE_MILESTONE.id,
      done: events.some(
        (event) =>
          event.type === BASE_PLAYTEST_AUDIENCE_MILESTONE.eventType &&
          event.actorId !== actorId &&
          event.audience.includes(actorId),
      ),
    },
    {
      id: 'invent',
      // An independent live proposal can reuse a method the actor previously read.
      // Keep its original knowledge evidence; the admitted event credits this experience.
      done:
        events.some(
          (event) =>
            event.type === 'declaration-admitted' &&
            event.actorId === actorId &&
            event.data?.source === 'live-model' &&
            world.itemDefinitions[
              world.recipes[String(event.data.recipeId)]?.outputs[0]!.definition.id ?? ''
            ]?.rangedWeapon?.mechanism === 'swing',
        ) ||
        (world.knowledge[actorId] ?? []).some(
          (knowledge) =>
            knowledge.source === 'invented' &&
            world.declarationReceipts[knowledge.evidenceId]?.source === 'live-model' &&
            world.itemDefinitions[
              world.recipes[knowledge.recipeId]?.outputs[0]!.definition.id ?? ''
            ]?.rangedWeapon?.mechanism === 'swing',
        ),
    },
    {
      id: 'craft',
      done: !!rangedWeapon,
    },
    {
      id: 'hunt',
      done: events.some((event) => event.type === 'harvested' && event.actorId === actorId),
    },
    {
      id: 'eat',
      done: events.some(
        (event) =>
          event.type === 'ate' && event.actorId === actorId && /meat/i.test(nativeText(event.text)),
      ),
    },
    {
      id: 'bow',
      done:
        known.some((item) => item?.rangedWeapon?.mechanism === 'flex') &&
        known.some((item) => item?.ammunition?.kind === 'arrow'),
    },
  ].map((milestone, index) => ({ ...BASE_PLAYTEST_MILESTONES[index]!, done: milestone.done }));
}
