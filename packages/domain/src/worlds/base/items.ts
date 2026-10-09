import type { ItemDefinition } from '../../types.js';
import type { MaterialInterface } from '../../invention-families.js';
import { BASE_KNIFE_EQUIPMENT, BASE_SPEAR_EQUIPMENT } from './equipment.js';

/** Native preparation and invented cord share these authored costs and output semantics.
 * docs/worlds/base/items.md#cordage-manufacture-and-reuse */
export const BASE_CORDAGE_RULE = {
  input: 'prepared_fiber',
  inputQuantity: 2,
  output: 'cord',
  outputQuantity: 1,
  workSeconds: 60,
  properties: ['binding', 'flexible'] as const,
  packingLoad: 1,
};
export const BASE_BINDING_MATERIAL: MaterialInterface = {
  id: 'base:binding-material',
  version: 1,
  unitsPerItem: 1,
};
const CONTACT_CHARACTERISTICS: ItemDefinition['characteristics'] = [
  { key: 'damage', label: 'Damage', path: 'melee.damage', unit: 'health points' },
  { key: 'range', label: 'Reach', path: 'melee.range', unit: 'metres' },
  { key: 'accuracy', label: 'Base accuracy', path: 'melee.accuracy', unit: 'probability' },
  { key: 'preparation', label: 'Preparation', path: 'melee.windupSeconds', unit: 'game seconds' },
  { key: 'recovery', label: 'Recovery', path: 'melee.recoverySeconds', unit: 'game seconds' },
];

/** Unfamiliar constructed objects can earn an introduction; ordinary materials
 * remain quiet. The story selector still owns all admission. */
export const CONSTRUCTED_ITEM_STORY_FIELDS = { story_importance: { story_importance: 8 } };

export const NATIVE_ITEMS: Readonly<Record<string, ItemDefinition>> = {
  knife: {
    mechanismFields: { story_importance: { story_importance: 7 } },
    equipment: BASE_KNIFE_EQUIPMENT,
    id: 'knife',
    version: 1,
    portable: true,
    packingLoad: 1,
    name: 'Knife',
    description: 'A small sharp blade for close-range cutting and stabbing.',
    properties: ['rigid', 'point'],
    characteristics: CONTACT_CHARACTERISTICS,
    melee: {
      damage: 8,
      accuracy: 0.75,
      range: 1.3,
      approachRange: 0.8,
      windupSeconds: 6,
      recoverySeconds: 18,
    },
  },
  spear: {
    id: 'spear',
    version: 1,
    portable: true,
    packingLoad: 2,
    name: 'Lookout spear',
    equipment: BASE_SPEAR_EQUIPMENT,
    description:
      'A long wooden spear left at the lookout. It reaches farther than the knife but prepares and recovers more slowly. Equip it for an ordinary contact attack.',
    properties: ['rigid', 'shaft', 'point'],
    characteristics: CONTACT_CHARACTERISTICS,
    melee: {
      damage: 10,
      accuracy: 0.8,
      range: 2.2,
      approachRange: 1.8,
      windupSeconds: 18,
      recoverySeconds: 36,
    },
    mechanismFields: { story_importance: { story_importance: 8 } },
  },
  woven_bag: {
    id: 'woven_bag',
    version: 1,
    portable: true,
    packingLoad: 2,
    name: 'Woven bag',
    description:
      'A portable woven bag with 24 packing-load units of capacity. Nested contents count toward the limit.',
    properties: ['fiber', 'pouch'],
    characteristics: [
      {
        key: 'capacity',
        label: 'Capacity',
        path: 'container.capacity',
        unit: 'packing-load units',
      },
      {
        key: 'packing-load',
        label: 'Packing requirement',
        path: 'packingLoad',
        unit: 'packing-load units',
      },
    ],
    container: { capacity: 24, maximumDepth: 16 },
  },
  raw_fiber: {
    id: 'raw_fiber',
    version: 1,
    portable: true,
    packingLoad: 1,
    name: 'Reed fibers',
    nameForm: 'plural',
    description: 'Unprepared plant fibers stripped from reeds.',
    properties: ['fiber'],
  },
  prepared_fiber: {
    id: 'prepared_fiber',
    version: 1,
    portable: true,
    packingLoad: 1,
    name: 'Prepared fibers',
    nameForm: 'plural',
    description: 'Cleaned flexible fibers, suitable for weaving a pouch or fletching.',
    properties: ['fiber', 'flexible', 'pouch'],
  },
  cord: {
    id: 'cord',
    version: 1,
    portable: true,
    packingLoad: BASE_CORDAGE_RULE.packingLoad,
    name: 'Fiber cord',
    nameForm: 'mass',
    description: 'Twisted fibers suitable for fastening and transmitting tension.',
    properties: [...BASE_CORDAGE_RULE.properties],
  },
  wood: {
    id: 'wood',
    version: 1,
    portable: true,
    packingLoad: 1,
    name: 'Supple branch',
    description: 'A workable branch: rigid as a short shaft, flexible over its length.',
    properties: ['rigid', 'flexible', 'shaft', 'fuel'],
  },
  stone: {
    id: 'stone',
    version: 1,
    portable: true,
    packingLoad: 1,
    name: 'Small stone',
    description: 'A rounded stone that can serve as sling ammunition.',
    properties: ['rigid', 'projectile'],
    ammunition: { kind: 'stone', damageBonus: 0 },
    characteristics: [
      {
        key: 'damage-bonus',
        label: 'Damage bonus',
        path: 'ammunition.damageBonus',
        unit: 'health points',
      },
    ],
  },
  bone: {
    id: 'bone',
    version: 1,
    portable: true,
    packingLoad: 1,
    name: 'Bone fragment',
    description: 'A workable hard fragment suitable for a simple point.',
    properties: ['rigid', 'point'],
  },
  stone_tool: {
    id: 'stone_tool',
    version: 1,
    portable: true,
    packingLoad: 1,
    name: 'Flaked cutting stone',
    description: 'A modest existing possession, used to prepare animal remains.',
    properties: ['rigid', 'point'],
  },
  berries: {
    id: 'berries',
    version: 1,
    portable: true,
    packingLoad: 1,
    name: 'Wild berries',
    nameForm: 'plural',
    description: 'Familiar edible berries.',
    properties: ['food'],
    nutrition: 18,
  },
  raw_meat: {
    id: 'raw_meat',
    version: 1,
    portable: true,
    packingLoad: 1,
    name: 'Raw meat',
    nameForm: 'mass',
    description: 'Fresh meat. Cook it at a lit campfire before eating.',
    properties: ['food'],
    cooked: false,
  },
  cooked_meat: {
    id: 'cooked_meat',
    version: 1,
    portable: true,
    packingLoad: 1,
    name: 'Cooked meat',
    nameForm: 'mass',
    description: 'Meat cooked through over a dependable fire.',
    properties: ['food'],
    nutrition: 38,
    cooked: true,
  },
};

export const NATIVE_PREPARATIONS = {
  fiber: {
    input: 'raw_fiber',
    inputQuantity: 2,
    output: 'prepared_fiber',
    outputQuantity: 2,
    workSeconds: 48,
  },
  cord: BASE_CORDAGE_RULE,
} as const;
