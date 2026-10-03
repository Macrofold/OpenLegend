import type { RecipeFamilyDescriptor } from '../../invention-families.js';
import type { RecipeCandidate } from '../../types.js';
import { BASE_BINDING_MATERIAL } from './items.js';

/** Authored tradeoffs, included in the trusted family pin. Descriptions, validation
 * and output compilation share these rules; names never grant container effects.
 * docs/worlds/base/camp-containers.md#first-family-rules */
const rules = {
  minimumPouchQuantity: 2,
  maximumPouchQuantity: 8,
  bindingDivisor: 2,
  capacityPerPouchUnit: 4,
  emptyPackingLoadDivisor: 3,
  workSecondsPerMaterial: 24,
  outputQuantity: 1,
  maximumDepth: 16,
};

function pouchQuantity(candidate: RecipeCandidate): number {
  const pouch = candidate.inputs.find((input) => input.role === 'pouch');
  if (!pouch) throw new Error('A woven container needs its pouch material.');
  return pouch.quantity;
}

export const BASE_CAMP_CONTAINER_FAMILY: RecipeFamilyDescriptor = {
  definition: {
    id: 'base:woven-container',
    version: 1,
    interface: 'recipe-family-v1',
    implementationVersion: 1,
    name: 'Woven camp container',
    description:
      'A portable woven container made from prepared flexible pouch fibers and binding. Larger designs cost more materials and work and hold more packing load.',
    inputs: {
      roles: [
        {
          id: 'pouch',
          label: 'Pouch',
          properties: ['fiber', 'flexible', 'pouch'],
          required: true,
          accepts: { native: true, generatedMaterials: [] },
        },
        {
          id: 'binding',
          label: 'Binding',
          properties: ['binding'],
          required: true,
          accepts: { native: true, generatedMaterials: [BASE_BINDING_MATERIAL] },
        },
      ],
      minimumRoles: 2,
      maximumRoles: 2,
      minimumQuantity: 1,
      maximumQuantity: rules.maximumPouchQuantity,
      maximumTotal:
        rules.maximumPouchQuantity + Math.ceil(rules.maximumPouchQuantity / rules.bindingDivisor),
      rejectNutrition: true,
      excludedDefinitionIds: [],
    },
    parameterSchema: {
      type: 'object',
      additionalProperties: false,
      required: [],
      properties: {},
    },
    editor: {
      fields: [
        { path: 'name', label: 'Technique name' },
        { path: 'description', label: 'Technique description' },
        { path: 'output.name', label: 'Container name' },
        { path: 'output.description', label: 'Container description' },
        { path: 'inputs.pouch.definitionId', label: 'Pouch material' },
        { path: 'inputs.pouch.quantity', label: 'Pouch quantity', unit: 'items' },
        { path: 'inputs.binding.definitionId', label: 'Binding material' },
        { path: 'inputs.binding.quantity', label: 'Binding quantity', unit: 'items' },
      ],
      derivedFacts: [
        {
          path: 'facts.craft-work',
          label: 'Crafting time',
          unit: 'game seconds',
          readOnly: true,
        },
        {
          path: 'facts.container-capacity',
          label: 'Container capacity',
          unit: 'packing-load units',
          readOnly: true,
        },
        {
          path: 'facts.empty-packing-load',
          label: 'Empty packing requirement',
          unit: 'packing-load units',
          readOnly: true,
        },
      ],
    },
    nativeConsumer: 'kernel:craft/transfer-item; objects:container',
    uses: ['craft', 'carry', 'pack', 'unpack', 'drop', 'inspect'],
    effects: ['finite-crafted-item', 'native-container-storage'],
    reads: ['known-recipe', 'inventory', 'container-access', 'container-capacity', 'spatial-reach'],
    limitation:
      'Organizes possessions under ordinary capacity, reach, access and nesting rules. No extra carrying strength, ownership lock, reservation, preservation, waterproofing, warmth or shelter; only verified manufactured binding is supported as an invented input.',
    guidance: [
      `Choose ${rules.minimumPouchQuantity}–${rules.maximumPouchQuantity} actual native pouch units with fiber, flexible and pouch properties, plus exactly ceil(pouch quantity / ${rules.bindingDivisor}) native or verified manufactured binding items. Each cord item supplies one binding item.`,
      `Capacity is ${rules.capacityPerPouchUnit} times pouch quantity; empty packing load is ceil(pouch quantity / ${rules.emptyPackingLoadDivisor}); work is ${rules.workSecondsPerMaterial} game seconds per total input unit. These are derived facts, not editable effects.`,
      'Choose your own fitting names and descriptions. Installation teaches the technique; ordinary crafting consumes inputs when work starts and makes one individual container on completion. Interruption does not refund materials.',
      'Raw unprepared fiber alone does not qualify. Nested contents count toward capacity, and ground access is not an ownership lock.',
    ],
    rules,
  },
  validate(_world, candidate) {
    const quantity = pouchQuantity(candidate);
    const errors: string[] = [];
    if (quantity < rules.minimumPouchQuantity || quantity > rules.maximumPouchQuantity)
      errors.push(
        `Choose ${rules.minimumPouchQuantity}–${rules.maximumPouchQuantity} pouch units.`,
      );
    if (
      candidate.inputs.find((input) => input.role === 'binding')?.quantity !==
      Math.ceil(quantity / rules.bindingDivisor)
    )
      errors.push(`Binding quantity must be ceil(pouch quantity / ${rules.bindingDivisor}).`);
    return errors;
  },
  compile(_world, candidate) {
    const quantity = pouchQuantity(candidate);
    const capacity = rules.capacityPerPouchUnit * quantity;
    const packingLoad = Math.ceil(quantity / rules.emptyPackingLoadDivisor);
    const workSeconds =
      rules.workSecondsPerMaterial * (quantity + Math.ceil(quantity / rules.bindingDivisor));
    return {
      workSeconds,
      outputDefinition: {
        portable: true,
        packingLoad,
        properties: ['fiber', 'pouch'],
        container: { capacity, maximumDepth: rules.maximumDepth },
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
      },
      facts: [
        { id: 'craft-work', label: 'Crafting time', value: workSeconds, unit: 'game seconds' },
        {
          id: 'container-capacity',
          label: 'Container capacity',
          value: capacity,
          unit: 'packing-load units',
        },
        {
          id: 'empty-packing-load',
          label: 'Empty packing requirement',
          value: packingLoad,
          unit: 'packing-load units',
        },
        { id: 'output-quantity', label: 'Output', value: 'one individual portable container' },
        {
          id: 'nested-load',
          label: 'Nested contents',
          value: 'count toward capacity; ordinary admitted containment-depth limit applies',
        },
      ],
    };
  },
};
