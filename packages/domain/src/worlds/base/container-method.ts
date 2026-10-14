import type { RecipeCandidate } from '../../types.js';

/** Shared authored method for the full camp and selected playable openings. */
export const BASE_WOVEN_CONTAINER_METHOD: RecipeCandidate = {
  family: { id: 'base:woven-container', version: 1 },
  name: 'Woven gathering container',
  description: 'Weave prepared fibers into a small pouch and secure it with cord.',
  inputs: [
    { role: 'pouch', definitionId: 'prepared_fiber', quantity: 2 },
    { role: 'binding', definitionId: 'cord', quantity: 1 },
  ],
  output: {
    name: 'Woven gathering pouch',
    description: 'A small portable woven pouch for carrying gathered materials.',
  },
  parameters: {},
};
