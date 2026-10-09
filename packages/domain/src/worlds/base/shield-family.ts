import type { RecipeFamilyDescriptor } from '../../invention-families.js';
import type { RecipeCandidate, WorldState } from '../../types.js';
import { BASE_BINDING_MATERIAL } from './items.js';
import { BASE_SHIELD_EQUIPMENT } from './equipment.js';
import { BASE_GUARD_PROFILE, guardDescription } from './shield-defense.js';
import { installRecipeDefinition } from '../../declarations.js';
import { definitionPin } from '../../world-modules.js';

const rules = {
  woodQuantity: 3,
  cordQuantity: 2,
  workSeconds: 240,
  packingLoad: 3,
  minimumReduction: 0.25,
  maximumReduction: 0.6,
  minimumCoverage: 90,
  maximumCoverage: 140,
};
export const BASE_SHIELD_FAMILY: RecipeFamilyDescriptor = {
  definition: {
    id: 'base:shield',
    version: 1,
    interface: 'recipe-family-v1',
    implementationVersion: 1,
    name: 'Held contact shield',
    description: 'Bind a rigid body into an off-hand shield for a finite chosen contact guard.',
    inputs: {
      roles: [
        {
          id: 'body',
          label: 'Rigid body',
          properties: ['rigid'],
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
      maximumQuantity: 3,
      maximumTotal: 5,
      rejectNutrition: true,
      excludedDefinitionIds: [],
    },
    parameterSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['reduction', 'coverageDegrees'],
      properties: {
        reduction: {
          type: 'number',
          minimum: rules.minimumReduction,
          maximum: rules.maximumReduction,
        },
        coverageDegrees: {
          type: 'number',
          minimum: rules.minimumCoverage,
          maximum: rules.maximumCoverage,
        },
      },
    },
    editor: {
      fields: [
        { path: 'name', label: 'Technique name' },
        { path: 'description', label: 'Technique description' },
        { path: 'output.name', label: 'Shield name' },
        { path: 'output.description', label: 'Shield description' },
        { path: 'inputs.body.definitionId', label: 'Rigid body material' },
        { path: 'inputs.body.quantity', label: 'Body quantity' },
        { path: 'inputs.binding.definitionId', label: 'Binding material' },
        { path: 'inputs.binding.quantity', label: 'Binding quantity' },
        { path: 'parameters.reduction', label: 'Contact injury reduction', unit: 'fraction' },
        { path: 'parameters.coverageDegrees', label: 'Front coverage', unit: 'degrees' },
      ],
      derivedFacts: [{ path: 'facts.guard', label: 'Chosen guard', readOnly: true }],
    },
    nativeConsumer: 'equipment:attachment; contact-defense:contactImpact',
    uses: ['craft', 'equip', 'guard'],
    effects: ['finite-crafted-item', 'one-contact-injury-reduction'],
    reads: ['known-recipe', 'inventory', 'body-ports', 'chosen-facing', 'contact-phase'],
    limitation:
      'Contact blows only; no passive armor, projectile interception, durability, stamina, automatic retaliation or permission to harm another player.',
    guidance: [
      'Use three rigid body items and two binding items. Guard timing and exclusive physical action rules are fixed by this world.',
      `Choose injury reduction ${rules.minimumReduction}–${rules.maximumReduction} and front coverage ${rules.minimumCoverage}–${rules.maximumCoverage} degrees.`,
      'Crafting spends real inputs at work start and produces one shield. Guard is a separate finite choice.',
    ],
    rules: { ...rules, guard: BASE_GUARD_PROFILE, equipment: BASE_SHIELD_EQUIPMENT },
  },
  validate(_world, candidate) {
    return candidate.inputs.find((i) => i.role === 'body')?.quantity === rules.woodQuantity &&
      candidate.inputs.find((i) => i.role === 'binding')?.quantity === rules.cordQuantity
      ? []
      : ['Use three rigid body items and two binding items.'];
  },
  compile(_world, candidate) {
    const profile = {
      ...BASE_GUARD_PROFILE,
      reduction: Number(candidate.parameters.reduction),
      coverageDegrees: Number(candidate.parameters.coverageDegrees),
    };
    return {
      workSeconds: rules.workSeconds,
      outputDefinition: {
        portable: true,
        packingLoad: rules.packingLoad,
        properties: ['rigid', 'binding'],
        equipment: structuredClone(BASE_SHIELD_EQUIPMENT),
        contactDefense: profile,
      },
      facts: [
        {
          id: 'craft-work',
          label: 'Crafting time',
          value: rules.workSeconds,
          unit: 'game seconds',
        },
        {
          id: 'reduction',
          label: 'Contact injury reduction',
          value: profile.reduction * 100,
          unit: '%',
        },
        {
          id: 'coverage',
          label: 'Front coverage',
          value: profile.coverageDegrees,
          unit: 'degrees',
        },
        { id: 'guard', label: 'Chosen guard', value: guardDescription(profile) },
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
export const KNOWN_SHIELD_METHOD = {
  recipeId: 'wooden-shield-method',
  itemId: 'wooden-shield',
  candidate: {
    family: { id: BASE_SHIELD_FAMILY.definition.id, version: 1 },
    name: 'Wooden shield',
    description: 'Bind three worked branches into a rigid shield using two fiber cords.',
    inputs: [
      { definitionId: 'wood', quantity: rules.woodQuantity, role: 'body' },
      { definitionId: 'cord', quantity: rules.cordQuantity, role: 'binding' },
    ],
    output: {
      name: 'Wooden shield',
      description:
        'A wooden off-hand shield that can share both hands with a knife. Choose Guard to reduce one timely front contact blow.',
    },
    parameters: {
      reduction: BASE_GUARD_PROFILE.reduction,
      coverageDegrees: BASE_GUARD_PROFILE.coverageDegrees,
    },
  } satisfies RecipeCandidate,
};
export function installKnownShieldMethod(world: WorldState): void {
  const method = KNOWN_SHIELD_METHOD;
  installRecipeDefinition(
    world,
    method.candidate,
    {
      source: 'world-authored',
      definition: definitionPin({
        id: 'base:known-shield',
        version: 1,
        candidate: method.candidate,
      }),
    },
    method.recipeId,
    method.itemId,
  );
}
