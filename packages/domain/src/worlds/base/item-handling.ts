import { BASE_BODY_PROFILES } from './spatial-definitions.js';
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
  objectBody: BASE_BODY_PROFILES.object,
};

export const BASE_PICKUP_NARRATION =
  '{actor.subject} picked up {items.name} from {source.name:definite}.';
