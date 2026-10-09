import type { FoodPreparationDefinition } from '../../food-preparation.js';

/** World-authored food effects, consumed by the one existing cooking owner.
 * docs/worlds/base/river-fishing.md#cooking-and-useful-food */
export const BASE_FOOD_PREPARATIONS: Record<string, FoodPreparationDefinition> = {
  'base:cook-meat': {
    id: 'base:cook-meat',
    version: 1,
    name: 'Cook meat',
    description: 'Cook one exact raw meat portion over a lit fire.',
    inputs: [{ role: 'food', definitionId: 'raw_meat', quantity: 1 }],
    outputs: [{ definitionId: 'cooked_meat', quantity: 1 }],
    workSeconds: 90,
    heat: 'lit',
    completedText: 'cooked meat over the fire.',
  },
  'base:cook-river-fish': {
    id: 'base:cook-river-fish',
    version: 1,
    name: 'Cook river fish',
    description: 'Cook one exact raw river fish over a lit fire.',
    inputs: [{ role: 'food', definitionId: 'raw_river_fish', quantity: 1 }],
    outputs: [{ definitionId: 'cooked_river_fish', quantity: 1 }],
    workSeconds: 90,
    heat: 'lit',
    completedText: 'cooked river fish over the fire.',
  },
};
