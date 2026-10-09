import { BASE_CLOAK_EQUIPMENT } from './equipment.js';
import type { AssemblyFamily } from '../../assembly-types.js';
import type { AttributeDefinition } from '../../world-modules.js';
import type { ItemDefinition } from '../../types.js';

/** One authored source for DG13 content and tuning. docs/worlds/base/editable-shelters.md */
export const BASE_CANOPY: AssemblyFamily = {
  id: 'base:light-canopy',
  version: 2,
  implementation: 'four-corner-flexible-bays',
  name: 'Open canopy',
  description:
    'An open place to rest, keep an exposed belonging dry, or visit. Ties and posts can be reclaimed.',
  materials: { post: 'timber', cover: 'panel' },
  presentation: {
    postColor: '#715438',
    coverColor: '#bdae85',
    bindingSize: 0.08,
    loweredName: 'Reclaimed canopy materials',
    invitationText: 'Come visit me beneath this open canopy.',
    failureText:
      'The light covering lost support and lowered harmlessly. Its actual cloth and cord remain for authorized reclaim.',
    help: 'Posts, cloth and cord stay real objects. Sleep keeps its ordinary eligibility. Rain adds no body or fire penalty.',
    useHelp:
      'Use ordinary inventory Drop after walking here to leave a belonging. Visitors keep ordinary movement, conversation and rest; visiting grants no editing or inventory rights.',
    replacementHelp:
      'Fasten the spare before removing the old cloth. This needs free sockets and no third layer.',
    planLabels: {
      build: 'Build one bay',
      resume: 'Finish remaining work',
      extend: 'Add the adjacent bay',
      replace: 'Replace a covering',
      lower: 'Lower a covering',
      dismantle: 'Dismantle and reclaim all parts',
      reclaim: 'Reclaim lowered material',
    },
  },
  bay: { width: 1.6, length: 2.1, postSection: 0.1 },
  defaultArrangementId: 'flat',
  arrangements: [
    {
      id: 'flat',
      name: 'Flat canopy',
      description: 'One level bay, with an optional adjacent bay sharing its posts.',
      rowHeights: [2.3, 2.3],
      maximumBays: 2,
    },
    {
      id: 'lean-to',
      name: 'Sloping cloak lean-to',
      description:
        'One open bay: two actual 2.30 metre posts at the lower edge and two 2.40 metre posts at the higher edge.',
      rowHeights: [2.3, 2.4],
      maximumBays: 1,
    },
  ],
  binding: { contactBand: 0.05, workDrop: 0.05, stanceOffset: 0.35 },
  cover: { width: 1.8, length: 2.4, thickness: 0.02, edge: 0.1, transmission: 0 },
  limits: { bays: 2, parts: 32, layers: 2, sockets: 2 },
  restMargin: 0.1,
  minimumClearance: 2.2,
  seconds: { post: 120, cover: 240, lower: 120, 'reclaim-post': 60, 'reclaim-lowered': 0 },
  labels: {
    post: 'Install a post',
    cover: 'Fasten the covering',
    lower: 'Untie and lower the covering',
    'reclaim-post': 'Reclaim an unloaded post',
    'reclaim-lowered': 'Reclaim lowered material',
  },
  conditionAttribute: 'base:canopy-material-condition',
  usableCondition: 'intact',
  moistureAttribute: 'base:material-moisture',
  wettingSeconds: 1800,
  dryingSeconds: 5400,
  moistureLabels: {
    dryMaximum: 0,
    wetMinimum: 0.5,
    dry: 'dry',
    damp: 'damp',
    wet: 'wet',
    saturated: 'saturated',
  },
  exposure: {
    folded: { width: 0.3, length: 0.4, height: 0.05 },
    fiber: { width: 0.4, length: 0.4, height: 0.05 },
    worn: { width: 0.56, length: 0.56 },
  },
};
export const CANOPY_ATTRIBUTES: AttributeDefinition[] = [
  {
    id: BASE_CANOPY.conditionAttribute,
    version: 1,
    implementation: 'category-v1',
    name: 'Material condition',
    disclosure: 'owner',
    presentation: { icon: 'meter.health', color: 'meter.health' },
    schema: { kind: 'category', choices: ['intact', 'unusable'], initial: 'intact' },
  },
  {
    id: BASE_CANOPY.moistureAttribute,
    version: 1,
    implementation: 'number-v1',
    name: 'Material moisture',
    disclosure: 'owner',
    presentation: { icon: 'meter.energy', color: 'meter.energy' },
    schema: { kind: 'number', min: 0, max: 1, initial: 0, unit: 'fraction' },
  },
];
export const CANOPY_ITEMS: Record<string, ItemDefinition> = {
  travel_cloak: {
    equipment: BASE_CLOAK_EQUIPMENT,
    id: 'travel_cloak',
    version: 1,
    name: 'Large travel cloak',
    description:
      'One large weather cloak: 1.8 × 2.4 metres unfolded. The same cloth can be worn or tied over four canopy posts.',
    portable: true,
    packingLoad: 2,
    properties: ['fiber', 'flexible'],
    assemblyMaterial: { familyId: BASE_CANOPY.id, role: 'cover' },
  },
  weather_cloth: {
    id: 'weather_cloth',
    version: 1,
    name: 'Spare weather cloth',
    description:
      'An intact 1.8 × 2.4 metre weather covering. It is suitable for a canopy but has no wearing attachment.',
    portable: true,
    packingLoad: 2,
    properties: ['fiber', 'flexible'],
    assemblyMaterial: { familyId: BASE_CANOPY.id, role: 'cover' },
  },
  canopy_tall_post: {
    id: 'canopy_tall_post',
    version: 1,
    name: 'Tall canopy post · 2.40 m',
    description:
      'One actual 2.40 metre upright, with two qualified sockets for a light weather covering.',
    portable: true,
    packingLoad: 2,
    properties: ['rigid', 'shaft'],
    assemblyMaterial: { familyId: BASE_CANOPY.id, role: 'post', postHeight: 2.4 },
  },
  canopy_post: {
    id: 'canopy_post',
    version: 1,
    name: 'Light canopy post · 2.30 m',
    description:
      'A 2.30 metre upright, with two qualified binding sockets for light weather coverings.',
    portable: true,
    packingLoad: 2,
    properties: ['rigid', 'shaft'],
    assemblyMaterial: { familyId: BASE_CANOPY.id, role: 'post', postHeight: 2.3 },
  },
};
export const BASE_CANOPY_SCENE = {
  builderId: 'entity-0001',
  site: { surfaceId: 'terrain', minX: 8, maxX: 18, minZ: 8, maxZ: 18 },
  suggested: { x: 14, y: 0, z: 14, surfaceId: 'terrain' },
  kit: [
    { definitionId: 'travel_cloak', quantity: 1 },
    { definitionId: 'weather_cloth', quantity: 1 },
    { definitionId: 'canopy_post', quantity: 6 },
    { definitionId: 'cord', quantity: 8 },
  ],
  // A finite new-scene grant, separate from and never replenishing the original kit.
  variantStock: [{ definitionId: 'canopy_tall_post', quantity: 2 }],
  rainSeconds: 1200,
  rainDelay: 1800,
};

export const BASE_CANOPY_ACTIVITY_HOST = {
  definition: {
    id: 'base:canopy-work',
    version: 1,
    interface: 'activity-host-v1' as const,
    implementationVersion: 1,
    commands: ['assemble'] as const,
    deadlineSafeCommands: [],
  },
};

export const BASE_CONSTRUCTION_DESCRIPTIONS = {
  construction:
    'Preview a supported canopy and choose its actual posts, cloth and cord before phased construction.',
  'construction-rest':
    'Walk to a clear covered place and attempt the ordinary Sleep action. Existing sleep eligibility still applies.',
};
