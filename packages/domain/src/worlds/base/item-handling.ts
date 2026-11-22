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
  pickupLabel: 'Pick Up',
  pickupAllLabel: 'Pick Up All',
  pickupAllDescription: 'Pick up all portable contents',
  pickupNarration: '{actor.subject} picked up {items.name} from {source.name:definite}.',
  drop: {
    pileName: 'Items on the ground',
    samePileDistance: 0.01,
    label: 'Drop',
    narration: '{actor.subject} dropped {items.name}.',
    success: 'Items dropped on the ground.',
    unavailable: 'Choose a portable item in this inventory.',
    quantity: 'Choose an available whole quantity.',
    needed: 'This item or its contents are needed by ongoing work.',
    support: 'There is no room to drop this here.',
  },
  actorBodyProfiles: ['person'],
  objectBody: BASE_BODY_PROFILES.object,
};
