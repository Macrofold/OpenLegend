import type { RecipeFamilyDescriptor } from '../../invention-families.js';
import { BASE_BINDING_MATERIAL, BASE_CORDAGE_RULE } from './items.js';

const rules = BASE_CORDAGE_RULE;

/** Names describe a technique; only this trusted compiler supplies material behavior. */
export const BASE_CORDAGE_FAMILY: RecipeFamilyDescriptor = {
  definition: {
    id: 'base:cordage',
    version: 1,
    interface: 'recipe-family-v1',
    implementationVersion: 1,
    name: 'Cordage material',
    description:
      'Twist native prepared flexible fibers into homogeneous cord that can bind a woven container.',
    inputs: {
      roles: [
        {
          id: 'fiber',
          label: 'Prepared fiber',
          properties: ['fiber', 'flexible'],
          required: true,
          accepts: { native: true, generatedMaterials: [] },
        },
      ],
      minimumRoles: 1,
      maximumRoles: 1,
      minimumQuantity: rules.inputQuantity,
      maximumQuantity: rules.inputQuantity,
      maximumTotal: rules.inputQuantity,
      rejectNutrition: true,
      excludedDefinitionIds: [],
    },
    materialOutput: BASE_BINDING_MATERIAL,
    parameterSchema: { type: 'object', additionalProperties: false, required: [], properties: {} },
    editor: {
      fields: [
        { path: 'name', label: 'Technique name' },
        { path: 'description', label: 'Technique description' },
        { path: 'output.name', label: 'Cord name' },
        { path: 'output.description', label: 'Cord description' },
        { path: 'inputs.fiber.definitionId', label: 'Prepared fiber material' },
        { path: 'inputs.fiber.quantity', label: 'Fiber quantity', unit: 'items' },
      ],
      derivedFacts: [
        { path: 'facts.craft-work', label: 'Crafting time', unit: 'game seconds', readOnly: true },
        { path: 'facts.output-quantity', label: 'Output', unit: 'items', readOnly: true },
      ],
    },
    nativeConsumer: 'kernel:craft; recipe-material:binding',
    uses: ['craft', 'bind-woven-container'],
    effects: ['finite-crafted-item'],
    reads: ['known-recipe', 'inventory', 'exact-producer-dependencies'],
    limitation:
      'One binding item per physical cord item, for woven-container binding only. No extra strength, weapon, food, heat, storage or autonomous effects. Invented fiber inputs are unsupported.',
    guidance: [
      `Choose one actual native material with fiber and flexible properties; consume exactly ${rules.inputQuantity} items to make ${rules.outputQuantity} cord item in ${rules.workSeconds} game seconds.`,
      'Choose fitting names and descriptions; differently named cords have the same supported mechanics. No editable strength or yield parameter is available.',
      'Installation teaches only the inventor and creates no supplies. Crafting is a separate chosen action; inputs are spent at work start and interruption does not refund them.',
      'Possessing verified cord permits using it as woven-container binding but never teaches its manufacturing technique.',
    ],
    rules,
  },
  validate: () => [],
  compile() {
    return {
      workSeconds: rules.workSeconds,
      outputDefinition: {
        portable: true,
        packingLoad: rules.packingLoad,
        properties: [...rules.properties],
      },
      facts: [
        {
          id: 'craft-work',
          label: 'Crafting time',
          value: rules.workSeconds,
          unit: 'game seconds',
        },
        { id: 'output-quantity', label: 'Output', value: rules.outputQuantity, unit: 'cord items' },
        {
          id: 'material-use',
          label: 'Use',
          value: 'one binding item per cord item, for woven containers',
        },
        {
          id: 'packing-load',
          label: 'Packing requirement',
          value: rules.packingLoad,
          unit: 'packing-load units',
        },
      ],
    };
  },
};
