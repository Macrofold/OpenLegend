import type { CastDefinition } from '../../finite-casts.js';
import type { RecipeFamilyDescriptor } from '../../invention-families.js';
import type { RecipeCandidate, WorldState } from '../../types.js';
import { starterGroundAt } from './landscape.js';
import { worldPlacement } from '../../spatial-state.js';

const TOOL_RULES = {
  kind: 'base:river-line',
  workSeconds: 240,
  packingLoad: 2,
  roles: [
    { id: 'shaft', label: 'Shaft', properties: ['shaft'] as const, quantity: 1 },
    { id: 'line', label: 'Line', properties: ['binding'] as const, quantity: 2 },
    { id: 'hook', label: 'Hook', properties: ['point'] as const, quantity: 1 },
  ],
};
export const RIVER_LINE_FAMILY: RecipeFamilyDescriptor = {
  definition: {
    id: 'base:fishing-line',
    version: 1,
    interface: 'recipe-family-v1',
    implementationVersion: 1,
    name: 'Fishing line tool',
    description: 'A reusable shaft, line and hook for one chosen river cast.',
    inputs: {
      roles: TOOL_RULES.roles.map((role) => ({
        id: role.id,
        label: role.label,
        properties: [...role.properties],
        required: true,
        accepts: { native: true, generatedMaterials: [] },
      })),
      minimumRoles: 3,
      maximumRoles: 3,
      minimumQuantity: 1,
      maximumQuantity: 2,
      maximumTotal: 4,
      rejectNutrition: true,
      excludedDefinitionIds: [],
    },
    parameterSchema: { type: 'object', additionalProperties: false, required: [], properties: {} },
    editor: {
      fields: [
        { path: 'name', label: 'Technique name' },
        { path: 'description', label: 'Technique description' },
        { path: 'output.name', label: 'Tool name' },
        { path: 'output.description', label: 'Tool description' },
        ...TOOL_RULES.roles.map((role) => ({
          path: `inputs.${role.id}.definitionId`,
          label: `${role.label} material`,
        })),
      ],
      derivedFacts: [
        { path: 'facts.craft-work', label: 'Crafting time', unit: 'game seconds', readOnly: true },
      ],
    },
    nativeConsumer: 'kernel:craft/fish',
    uses: ['craft', 'fish'],
    effects: ['finite-crafted-item'],
    reads: ['known-recipe', 'inventory', 'perceived-finite-source'],
    limitation:
      'One bounded cast at a compatible authored reach. No bait, wear, repair, automatic recast or new catch effects.',
    guidance: [
      'Use one shaft material, two line materials and one hook material. Material and names may vary; all admitted tools use the same finite cast contract.',
    ],
    rules: TOOL_RULES,
  },
  validate(_world, candidate) {
    return TOOL_RULES.roles.every(
      (role) =>
        candidate.inputs.find((input) => input.role === role.id)?.quantity === role.quantity,
    )
      ? []
      : ['A line tool needs one shaft, two line materials and one hook.'];
  },
  compile() {
    return {
      workSeconds: TOOL_RULES.workSeconds,
      outputDefinition: {
        portable: true,
        packingLoad: TOOL_RULES.packingLoad,
        properties: [],
        fishingTool: { kind: TOOL_RULES.kind },
      },
      facts: [
        {
          id: 'craft-work',
          label: 'Crafting time',
          value: TOOL_RULES.workSeconds,
          unit: 'game seconds',
        },
        { id: 'fishing', label: 'Use', value: 'One chosen cast at a compatible river reach' },
      ],
    };
  },
};
export const RIVER_LINE_METHOD: RecipeCandidate = {
  family: { id: RIVER_LINE_FAMILY.definition.id, version: RIVER_LINE_FAMILY.definition.version },
  name: 'River line',
  description:
    'An ordinary known method: fit a shaft, cord line and bone hook into a reusable fishing tool.',
  inputs: [
    { role: 'shaft', definitionId: 'wood', quantity: 1 },
    { role: 'line', definitionId: 'cord', quantity: 2 },
    { role: 'hook', definitionId: 'bone', quantity: 1 },
  ],
  output: {
    name: 'River line',
    description: 'A reusable wooden shaft with a cord line and a bone hook for river fishing.',
  },
  parameters: {},
};
const profile = (
  id: string,
  name: string,
  workSeconds: number,
  chance: number,
): CastDefinition => ({
  id,
  version: 1,
  name,
  toolKind: TOOL_RULES.kind,
  workSeconds,
  chance,
  maximumLineMetres: 3,
  stanceTolerance: 0.2,
  description: `One chosen cast takes ${workSeconds} game seconds, with an ordinary ${Math.round(chance * 100)}% chance of a catch while supply remains. No bait is spent.`,
  actionLabel: 'Fish here with',
  availableText: 'River reach · choose one cast',
  toolRequiredText: 'Carry a compatible fishing tool, such as a River line.',
  supplyUnknownText: 'Finite local supply; its remaining quantity is not known',
  caughtText: 'caught one raw river fish.',
  emptyText: 'finished one cast with no catch.',
  exhaustedText: 'This inspected reach offers no more catches.',
});
export const BASE_CAST_DEFINITIONS: Record<string, CastDefinition> = {
  'base:camp-reach': profile('base:camp-reach', 'Camp river reach', 180, 0.65),
  'base:far-bend': profile('base:far-bend', 'Far river bend', 240, 0.8),
};
export function installRiverReaches(world: WorldState): void {
  const reaches = [
    {
      id: 'camp-river-reach',
      profile: 'base:camp-reach',
      quantity: 4,
      x: 4,
      z: 16,
      waterX: 2,
      description:
        'The familiar river bank west of camp; a dry sandy stance overlooks the near current.',
    },
    {
      id: 'far-river-bend',
      profile: 'base:far-bend',
      quantity: 6,
      x: 7,
      z: 34,
      waterX: 5,
      description:
        'The river bends south past the reeds; a dry bank gives a clear line into the farther current.',
    },
  ];
  for (const reach of reaches) {
    const stance = starterGroundAt(world.map.spatial!, reach.x, reach.z);
    world.entities[reach.id] = {
      id: reach.id,
      name: BASE_CAST_DEFINITIONS[reach.profile]!.name,
      kind: 'resource',
      description: reach.description,
      spatial: { bodyProfileId: 'object', heading: 0 },
      placement: worldPlacement(stance, stance.surfaceId),
      resource: {
        definitionId: 'raw_river_fish',
        quantity: reach.quantity,
        revision: 0,
        workSeconds: BASE_CAST_DEFINITIONS[reach.profile]!.workSeconds,
        cast: {
          definitionId: reach.profile,
          stance,
          endpoint: { x: reach.waterX, y: stance.y + 0.1, z: reach.z },
          water: {
            minX: reach.waterX - 0.4,
            maxX: reach.waterX + 0.4,
            minZ: reach.z - 0.4,
            maxZ: reach.z + 0.4,
          },
        },
      },
    };
  }
}
