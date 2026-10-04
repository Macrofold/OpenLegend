import { namePhrase } from '@open-legend/language';
import {
  BASE_FIRE_CARE,
  fireFuelDescription,
  isFuel,
  type Entity,
  type ItemInstance,
  type WorldState,
} from '@open-legend/domain';
import type { CommandInput } from '@open-legend/protocol';

export interface FireCareOption {
  id: string;
  /** Menu wording naming the fire. */
  label: string;
  /** Short wording for the selected fire's own panel. */
  shortLabel: string;
  /** Actor-facing consequence summary for character decisions. */
  description: string;
  command: CommandInput;
}

/** One builder for fire care on every surface; native admission still decides eligibility.
 * Light or put out follows the fire's current state; fuel is offered per carried fuel kind. */
export function fireCareOptions(
  world: WorldState,
  inventory: readonly ItemInstance[],
  fire: Entity,
): FireCareOption[] {
  const heat = fire.heat;
  if (!heat) return [];
  const state = `${namePhrase(fire, 'definite', { capitalize: true })} is ${heat.lit ? 'burning' : 'cold'}, with ${fireFuelDescription(heat)}`;
  const options: FireCareOption[] = [
    heat.lit
      ? {
          id: `fire-extinguish:${fire.id}`,
          label: `Put out ${fire.name}`,
          shortLabel: 'Put out',
          description: `Put out ${namePhrase(fire, 'definite')}. ${state}; the unburnt fuel stays for relighting, and it cannot cook until lit again. Not while someone else is cooking there. ${BASE_FIRE_CARE.extinguish.workSeconds} work seconds after approach.`,
          command: { type: 'tend-fire', fireOperation: 'extinguish', targetId: fire.id },
        }
      : {
          id: `fire-light:${fire.id}`,
          label: `Light ${fire.name}`,
          shortLabel: 'Light',
          description: `Light ${namePhrase(fire, 'definite')} so it can cook food. ${state}. Uses one carried bundle of plain fibers as tinder (used up) and a carried rigid shaft as a fire drill (kept); ${BASE_FIRE_CARE.light.workSeconds} work seconds after approach.`,
          command: { type: 'tend-fire', fireOperation: 'light', targetId: fire.id },
        },
  ];
  const fuels = new Map<string, ItemInstance>();
  for (const item of inventory) {
    const definition = world.itemDefinitions[item.definitionId];
    if (definition && isFuel(definition) && !fuels.has(definition.id))
      fuels.set(definition.id, item);
  }
  const fuelEffect = `each piece burns about ${BASE_FIRE_CARE.fuel.secondsPerUnit / 3600} hour, up to ${BASE_FIRE_CARE.fuel.maximumFuelSeconds / 3600} hours in the fire`;
  for (const item of fuels.values()) {
    const definition = world.itemDefinitions[item.definitionId]!;
    const name = namePhrase(definition);
    options.push({
      id: `fire-fuel:${item.id}:${fire.id}`,
      label: `Add ${name} to ${fire.name}`,
      shortLabel: `Add ${name}`,
      description: `Add one unit of ${name} to ${namePhrase(fire, 'definite')}. ${state}; ${fuelEffect}. The piece is used up when the ${BASE_FIRE_CARE.fuel.workSeconds}-second work finishes.`,
      command: { type: 'tend-fire', fireOperation: 'fuel', targetId: fire.id, itemId: item.id },
    });
  }
  // Without carried fuel the option stays visible with its native refusal reason.
  if (!fuels.size)
    options.push({
      id: `fire-fuel:${fire.id}`,
      label: `Add fuel to ${fire.name}`,
      shortLabel: 'Add fuel',
      description: `Add one piece of carried fuel to ${namePhrase(fire, 'definite')}. ${state}; ${fuelEffect}.`,
      command: { type: 'tend-fire', fireOperation: 'fuel', targetId: fire.id },
    });
  return options;
}
