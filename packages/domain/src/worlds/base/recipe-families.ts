import type {
  RecipeFamilyDescriptor,
  RecipeFamilyDefinition,
  RecipeParameterSchema,
  CompiledRecipe,
} from '../../invention-families.js';
import type { MaterialProperty, RecipeCandidate, WorldState } from '../../types.js';
import { getOwn } from '../../records.js';
import { CONSTRUCTED_ITEM_STORY_FIELDS } from './items.js';

import { BASE_CAMP_CONTAINER_FAMILY } from './camp-container-family.js';
import { BASE_CORDAGE_FAMILY } from './cordage-family.js';
import { BASE_GATHER_EQUIPMENT, BASE_LAUNCHER_EQUIPMENT } from './equipment.js';
import { BASE_SHIELD_FAMILY } from './shield-family.js';
import { RIVER_LINE_FAMILY } from './river-fishing.js';

const number = (minimum: number, maximum: number): RecipeParameterSchema => ({
  type: 'number',
  minimum,
  maximum,
});
const integer = (minimum: number, maximum: number): RecipeParameterSchema => ({
  type: 'integer',
  minimum,
  maximum,
});
const work = integer(48, 480);
const role = (id: string, label: string, properties: MaterialProperty[]) => ({
  id,
  label,
  properties,
  required: true,
  accepts: { native: true, generatedMaterials: [] },
});
const roles = {
  binding: role('binding', 'Binding', ['binding']),
  body: role('body', 'Body', ['flexible']),
  pouch: role('pouch', 'Pouch', ['pouch']),
  shaft: role('shaft', 'Shaft', ['shaft']),
  point: role('point', 'Point', ['point']),
  fletching: role('fletching', 'Fletching', ['fiber']),
};
/** Native material exclusions are this world's composition policy, not engine authority. */
const materialPolicy = {
  minimumRoles: 2,
  maximumRoles: 6,
  minimumQuantity: 1,
  maximumQuantity: 8,
  maximumTotal: 20,
  rejectNutrition: true,
  excludedDefinitionIds: ['raw_meat'],
};
const commonGuidance = [
  'Choose actual registered materials, quantities and a fitting name for a new method. Installed authored methods require their own permitted learning; they are distinct from live invention.',
  'Inputs are consumed when crafting starts; one output is made on completion; interruption does not refund materials.',
  'An admitted actor invention teaches its inventor and never creates an item. Ordinary work expenditure applies.',
  'No scripts, free sources, nutrition, fuel, sleep/status effects or autonomous machines are supported.',
];
function definition(
  id: string,
  name: string,
  description: string,
  requiredRoles: Array<RecipeFamilyDefinition['inputs']['roles'][number]>,
  parameters: Record<string, RecipeParameterSchema>,
  fields: RecipeFamilyDefinition['editor']['fields'],
  consumer: Pick<
    RecipeFamilyDefinition,
    'nativeConsumer' | 'uses' | 'effects' | 'reads' | 'limitation'
  >,
  rules: Record<string, unknown>,
): RecipeFamilyDefinition {
  return {
    id,
    version: 1,
    interface: 'recipe-family-v1',
    implementationVersion: 1,
    name,
    description,
    inputs: {
      ...materialPolicy,
      roles: Object.values(roles).map((role) => ({
        ...role,
        required: requiredRoles.some((required) => required.id === role.id),
      })),
    },
    parameterSchema: {
      type: 'object',
      additionalProperties: false,
      required: Object.keys(parameters),
      properties: parameters,
    },
    editor: {
      fields: [
        { path: 'name', label: 'Technique name' },
        { path: 'description', label: 'Technique description' },
        { path: 'output.name', label: 'Item name' },
        { path: 'output.description', label: 'Item description' },
        ...Object.values(roles).flatMap((role) => [
          { path: `inputs.${role.id}.definitionId`, label: `${role.label} material` },
          { path: `inputs.${role.id}.quantity`, label: `${role.label} quantity`, unit: 'items' },
        ]),
        ...fields,
      ],
      derivedFacts: [
        { path: 'facts.craft-work', label: 'Crafting time', unit: 'game seconds', readOnly: true },
      ],
    },
    ...consumer,
    guidance: [...commonGuidance],
    rules,
  };
}
function numeric(candidate: RecipeCandidate, key: string): number {
  const value = candidate.parameters[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid ${key}.`);
  return value;
}
function text(candidate: RecipeCandidate, key: string): string {
  const value = candidate.parameters[key];
  if (typeof value !== 'string') throw new Error(`Invalid ${key}.`);
  return value;
}
function inheritedProperties(world: WorldState, candidate: RecipeCandidate): MaterialProperty[] {
  return [
    ...new Set(
      candidate.inputs.flatMap(
        (input) => getOwn(world.itemDefinitions, input.definitionId)?.properties ?? [],
      ),
    ),
  ]
    .filter((property) => property !== 'food' && property !== 'fuel')
    .sort();
}
function baseOutput(
  world: WorldState,
  candidate: RecipeCandidate,
): CompiledRecipe['outputDefinition'] {
  return {
    mechanismFields: structuredClone(CONSTRUCTED_ITEM_STORY_FIELDS),
    portable: world.itemHandling.defaultPortable,
    ...(world.itemHandling.generatedPackingLoad !== undefined
      ? { packingLoad: world.itemHandling.generatedPackingLoad }
      : {}),
    properties: inheritedProperties(world, candidate),
  };
}
const workFact = (candidate: RecipeCandidate) => ({
  id: 'craft-work',
  label: 'Crafting time',
  value: numeric(candidate, 'workSeconds'),
  unit: 'game seconds',
});
const weaponConsumer = {
  nativeConsumer: 'kernel:craft/equip/hunt',
  uses: ['craft', 'equip', 'hunt'],
  effects: ['finite-ammunition-consumption', 'body-injury'],
  reads: ['known-recipe', 'inventory', 'target-body', 'spatial-reach'],
};
function launcherFamily(mechanism: 'swing' | 'flex'): RecipeFamilyDescriptor {
  const swing = mechanism === 'swing';
  const ammunitionKind = swing ? 'stone' : 'arrow';
  const data = definition(
    `base:${mechanism}`,
    swing ? 'Sling-like launcher' : 'Bow-like launcher',
    swing
      ? 'A physical sling-like stone launcher using binding and a flexible pouch.'
      : 'A physical bow-like launcher with a flexible rigid body and binding, using arrows.',
    swing ? [roles.binding, roles.pouch] : [roles.body, roles.binding],
    {
      workSeconds: work,
      damage: swing ? number(10, 20) : number(16, 28),
      range: swing ? number(3, 7) : number(4, 10),
      accuracy: number(0.6, 0.9),
    },
    [
      { path: 'parameters.workSeconds', label: 'Crafting time', unit: 'game seconds' },
      { path: 'parameters.damage', label: 'Damage', unit: 'health points' },
      { path: 'parameters.range', label: 'Range', unit: 'metres' },
      { path: 'parameters.accuracy', label: 'Base accuracy', unit: 'probability' },
    ],
    {
      ...weaponConsumer,
      limitation: swing
        ? 'Native animal hunting and installed inert practice targets; not a general projectile or combat engine.'
        : 'Uses compatible native arrows; no generated trajectory solver.',
    },
    {
      mechanism,
      ammunitionKind,
      ...(swing ? {} : { rigidBody: true }),
      outputProperties: 'inherited-non-food-non-fuel',
    },
  );
  data.guidance.push(
    swing
      ? 'One compatible projectile is consumed per resolved shot, hit or miss. Supported inert targets allow one chosen practice shot without damage or loot. Animal conditions still apply to hunting; no homing or new hit effects.'
      : 'One compatible projectile is consumed per resolved shot, hit or miss. Accuracy is modified by fleeing; animals only, with no homing or new hit effects.',
  );
  data.editor.derivedFacts.push({ path: 'facts.ammunition', label: 'Ammunition', readOnly: true });
  return {
    definition: data,
    validate(world, candidate) {
      if (swing) return [];
      const body = candidate.inputs.find((input) => input.role === 'body');
      return body && getOwn(world.itemDefinitions, body.definitionId)?.properties.includes('rigid')
        ? []
        : ['A flexing body must also have structural rigidity.'];
    },
    compile(world, candidate) {
      return {
        workSeconds: numeric(candidate, 'workSeconds'),
        outputDefinition: {
          ...baseOutput(world, candidate),
          launcher: {
            mechanism,
            ammunitionKind,
            damage: numeric(candidate, 'damage'),
            range: numeric(candidate, 'range'),
            accuracy: numeric(candidate, 'accuracy'),
          },
          equipment: structuredClone(BASE_LAUNCHER_EQUIPMENT),
        },
        facts: [
          workFact(candidate),
          { id: 'ammunition', label: 'Ammunition', value: ammunitionKind },
          {
            id: 'damage',
            label: 'Damage',
            value: numeric(candidate, 'damage'),
            unit: 'health points',
          },
          { id: 'range', label: 'Range', value: numeric(candidate, 'range'), unit: 'metres' },
          {
            id: 'accuracy',
            label: 'Base accuracy',
            value: numeric(candidate, 'accuracy'),
            unit: 'probability',
          },
        ],
      };
    },
  };
}
const arrowDefinition = definition(
  'base:arrow',
  'Arrow ammunition',
  'A physical arrow with shaft, point and fiber fletching, requiring a compatible bow.',
  [roles.shaft, roles.point, roles.fletching],
  { workSeconds: work, damageBonus: number(0, 5) },
  [
    { path: 'parameters.workSeconds', label: 'Crafting time', unit: 'game seconds' },
    { path: 'parameters.damageBonus', label: 'Damage bonus', unit: 'health points' },
  ],
  {
    nativeConsumer: 'kernel:craft/hunt',
    uses: ['craft', 'hunt'],
    effects: ['finite-crafted-item'],
    reads: ['known-recipe', 'inventory'],
    limitation: 'Consumed by a compatible launcher; cannot define new damage operators.',
  },
  {
    ammunitionKind: 'arrow',
    outputProperties: 'inherited-non-food-non-fuel-plus-projectile',
    outputQuantity: 1,
  },
);
arrowDefinition.guidance.push(
  'One projectile is made per completed craft and consumed by a compatible bow.',
);
const arrow: RecipeFamilyDescriptor = {
  definition: arrowDefinition,
  validate: () => [],
  compile(world, candidate) {
    const output = baseOutput(world, candidate);
    return {
      workSeconds: numeric(candidate, 'workSeconds'),
      outputDefinition: {
        ...output,
        properties: [...new Set([...output.properties, 'projectile' as const])].sort(),
        ammunition: { kind: 'arrow', damageBonus: numeric(candidate, 'damageBonus') },
      },
      facts: [
        workFact(candidate),
        {
          id: 'damage-bonus',
          label: 'Damage bonus',
          value: numeric(candidate, 'damageBonus'),
          unit: 'health points',
        },
        { id: 'output-quantity', label: 'Output', value: 'one projectile per craft' },
      ],
    };
  },
};
const gatheringDefinition = definition(
  'base:gathering-tool',
  'Gathering tool',
  'A rigid body bound with cord improves gathering one registered resource; carried tools do not stack.',
  [roles.body, roles.binding],
  {
    workSeconds: work,
    resourceId: { type: 'string', minLength: 1, maxLength: 120 },
    quantity: integer(2, 4),
  },
  [
    { path: 'parameters.workSeconds', label: 'Crafting time', unit: 'game seconds' },
    { path: 'parameters.resourceId', label: 'Gathered resource' },
    { path: 'parameters.quantity', label: 'Maximum batch yield', unit: 'items' },
  ],
  {
    nativeConsumer: 'gathering:gatheringYield',
    uses: ['craft', 'gather'],
    effects: ['finite-resource-transfer'],
    reads: ['known-recipe', 'inventory', 'resource-remaining'],
    limitation: 'Best compatible carried tool only; no stacking, wear, or container state.',
  },
  { rigidBody: true, nativeResourceOnly: true, outputProperties: 'inherited-non-food-non-fuel' },
);
gatheringDefinition.references = [{ parameter: 'resourceId', kind: 'item-definition' }];
gatheringDefinition.guidance.push(
  'Body must be rigid and flexible, plus binding. Yield is capped by remaining supply. The best compatible carried tool applies without stacking or an equip prerequisite.',
);
const gathering: RecipeFamilyDescriptor = {
  definition: gatheringDefinition,
  validate(world, candidate, purpose) {
    const body = candidate.inputs.find((input) => input.role === 'body');
    const resourceId = text(candidate, 'resourceId');
    const resource = getOwn(world.itemDefinitions, resourceId);
    const errors: string[] = [];
    if (!body || !getOwn(world.itemDefinitions, body.definitionId)?.properties.includes('rigid'))
      errors.push('A gathering tool needs a rigid body.');
    // A source's removal affects current gathering opportunities, not the learned recipe's meaning.
    if (
      !resource ||
      resource.recipeId ||
      (purpose === 'admission' &&
        !Object.values(world.entities).some(
          (entity) => entity.resource?.definitionId === resourceId,
        ))
    )
      errors.push('A gathering tool needs an existing native resource.');
    return errors;
  },
  compile(world, candidate) {
    const resourceId = text(candidate, 'resourceId');
    return {
      workSeconds: numeric(candidate, 'workSeconds'),
      outputDefinition: {
        ...baseOutput(world, candidate),
        gatheringTool: { resourceId, quantity: numeric(candidate, 'quantity') },
        equipment: structuredClone(BASE_GATHER_EQUIPMENT),
      },
      facts: [
        workFact(candidate),
        {
          id: 'gathered-resource',
          label: 'Gathered resource',
          value: getOwn(world.itemDefinitions, resourceId)?.name ?? resourceId,
        },
        {
          id: 'batch-yield',
          label: 'Maximum batch yield',
          value: numeric(candidate, 'quantity'),
          unit: 'items, limited by remaining supply',
        },
        {
          id: 'stacking',
          label: 'Tool use',
          value: 'best compatible carried tool only; no stacking',
        },
      ],
      dependencyIds: [resourceId],
    };
  },
};
/** The host catalog contains trusted capabilities; a world's manifest selects which are installed. */
export const BASE_RECIPE_FAMILIES: readonly RecipeFamilyDescriptor[] = [
  launcherFamily('swing'),
  launcherFamily('flex'),
  arrow,
  gathering,
  BASE_CAMP_CONTAINER_FAMILY,
  BASE_CORDAGE_FAMILY,
  BASE_SHIELD_FAMILY,
  RIVER_LINE_FAMILY,
];
