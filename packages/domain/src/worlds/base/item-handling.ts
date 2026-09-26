import type { ItemHandlingPolicy } from '../../item-handling.js';

// Authored base-world rules, not universal properties of an engine actor.
// docs/worlds/base/items.md#portability
export const BASE_ITEM_HANDLING: ItemHandlingPolicy = {
  enabled: true,
  defaultPortable: true,
  generatedPackingLoad: 1,
  reach: 1.6,
  pickupSeconds: 1,
  actorBodyProfiles: ['person'],
};
