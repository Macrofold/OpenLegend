import type {
  ItemDefinition,
  MaterialProperty,
  RecipeCandidateV2,
  RecipeDefinition,
  RecipeInput,
  WorldState,
} from './types.js';
import { canonicalJson } from './events.js';
import { getOwn } from './records.js';
import { definitionPin, recipeFamily, type DefinitionPin } from './world-modules.js';

/** Standard JSON Schema scalar fields; native family validation uses the same constraints. */
export type RecipeParameterSchema =
  | { type: 'number' | 'integer'; minimum: number; maximum: number }
  | { type: 'string'; minLength: number; maxLength: number; enum?: readonly string[] };
export interface RecipeEditorField {
  /** Input paths name a role rather than an unstable array offset. */
  path: string;
  label: string;
  description?: string;
  unit?: string;
  readOnly?: boolean;
}
export interface RecipeFact {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
}
/** Serializable installed meaning. Callbacks belong to the trusted host, never the manifest. */
export interface RecipeFamilyDefinition {
  id: string;
  version: number;
  interface: 'recipe-family-v1';
  implementationVersion: number;
  name: string;
  description: string;
  inputs: {
    roles: Array<{ id: string; label: string; properties: MaterialProperty[]; required: boolean }>;
    minimumRoles: number;
    maximumRoles: number;
    minimumQuantity: number;
    maximumQuantity: number;
    maximumTotal: number;
    nativeOnly: boolean;
    rejectNutrition: boolean;
    excludedDefinitionIds: string[];
  };
  parameterSchema: {
    type: 'object';
    additionalProperties: false;
    required: string[];
    properties: Record<string, RecipeParameterSchema>;
  };
  /** Check actor-permitted scalar references before semantic validation reads world data. */
  references?: Array<{ parameter: string; kind: 'item-definition' }>;
  editor: { fields: RecipeEditorField[]; derivedFacts: RecipeEditorField[] };
  nativeConsumer: string;
  uses: string[];
  effects: string[];
  reads: string[];
  limitation: string;
  guidance: string[];
  /** Authored compiler choices/formulas are part of the exact content pin. */
  rules: Record<string, unknown>;
}
export interface CompiledRecipe {
  workSeconds: number;
  outputDefinition: Omit<ItemDefinition, 'id' | 'version' | 'name' | 'description' | 'recipeId'>;
  facts: RecipeFact[];
  /** Definitions read beyond material inputs; parameter references also declare their scoped metadata. */
  dependencyIds?: string[];
}
export type RecipeDependencyReference =
  | { kind: 'item-definition'; pin: DefinitionPin }
  | { kind: 'item-handling-policy'; pin: DefinitionPin };
export interface RecipeFamilyDescriptor {
  definition: RecipeFamilyDefinition;
  validate(
    world: WorldState,
    candidate: RecipeCandidateV2,
    purpose: 'admission' | 'restore',
  ): string[];
  compile(world: WorldState, candidate: RecipeCandidateV2): CompiledRecipe;
}
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, allowed: readonly string[]) =>
  Object.keys(value).length === allowed.length && allowed.every((key) => Object.hasOwn(value, key));
const text = (value: unknown, maximum: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;
const integer = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
const objectSchema = (properties: Record<string, unknown>) => ({
  type: 'object',
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const textSchema = (maxLength: number) => ({ type: 'string', minLength: 1, maxLength });

/** A request carries only its selected family's parameters, never every family's blocks. */
export function selectedRecipeCandidateSchema(
  family: RecipeFamilyDescriptor,
): Record<string, unknown> {
  const definition = family.definition;
  return objectSchema({
    schemaVersion: { type: 'integer', const: 2 },
    family: objectSchema({
      id: { type: 'string', const: definition.id },
      version: { type: 'integer', const: definition.version },
    }),
    name: textSchema(80),
    description: textSchema(700),
    inputs: {
      type: 'array',
      minItems: definition.inputs.minimumRoles,
      maxItems: definition.inputs.maximumRoles,
      items: objectSchema({
        role: { type: 'string', enum: definition.inputs.roles.map((role) => role.id) },
        definitionId: textSchema(120),
        quantity: {
          type: 'integer',
          minimum: definition.inputs.minimumQuantity,
          maximum: definition.inputs.maximumQuantity,
        },
      }),
    },
    output: objectSchema({ name: textSchema(80), description: textSchema(700) }),
    parameters: definition.parameterSchema,
  });
}

/** Transport shape only. Provider generation must use the selected strict family schema. */
export const recipeCandidateEnvelopeSchema: Record<string, unknown> = objectSchema({
  schemaVersion: { type: 'integer', const: 2 },
  family: objectSchema({ id: textSchema(120), version: { type: 'integer', minimum: 1 } }),
  name: textSchema(80),
  description: textSchema(700),
  inputs: {
    type: 'array',
    items: objectSchema({
      role: textSchema(120),
      definitionId: textSchema(120),
      quantity: { type: 'integer', minimum: 1 },
    }),
  },
  output: objectSchema({ name: textSchema(80), description: textSchema(700) }),
  parameters: { type: 'object' },
});

export function familyMaterialEligible(
  family: RecipeFamilyDescriptor,
  definition: ItemDefinition,
  roleId?: string,
): boolean {
  const policy = family.definition.inputs;
  if (
    (policy.nativeOnly && definition.recipeId) ||
    (policy.rejectNutrition && definition.nutrition !== undefined) ||
    policy.excludedDefinitionIds.includes(definition.id)
  )
    return false;
  return policy.roles.some(
    (role) =>
      (roleId === undefined || role.id === roleId) &&
      role.properties.every((property) => definition.properties.includes(property)),
  );
}

export function describeRecipeCandidate(world: WorldState, candidate: RecipeCandidateV2): string {
  const compiled = compileRecipeCandidate(world, candidate);
  return compiled.facts
    .map((fact) => `${fact.label}: ${fact.value}${fact.unit ? ` ${fact.unit}` : ''}`)
    .join('; ');
}

/** Structural constraints and material eligibility come from the installed authored data. */
export function validateRecipeCandidate(
  world: WorldState,
  value: unknown,
  purpose: 'admission' | 'restore' = 'admission',
): string[] {
  if (!record(value)) return ['Recipe candidate must be an object.'];
  const errors: string[] = [];
  if (
    !exactKeys(value, [
      'schemaVersion',
      'family',
      'name',
      'description',
      'inputs',
      'output',
      'parameters',
    ])
  )
    errors.push('Unsupported recipe fields or operations.');
  if (value.schemaVersion !== 2) errors.push('Unsupported recipe candidate schema version.');
  if (!text(value.name, 80) || !text(value.description, 700))
    errors.push('A bounded recipe name and description are required.');
  if (
    !record(value.output) ||
    !exactKeys(value.output, ['name', 'description']) ||
    !text(value.output.name, 80) ||
    !text(value.output.description, 700)
  )
    errors.push('Output supports only a bounded name and description.');
  if (
    !record(value.family) ||
    !exactKeys(value.family, ['id', 'version']) ||
    !text(value.family.id, 120) ||
    !integer(value.family.version, 1, Number.MAX_SAFE_INTEGER)
  )
    return [...errors, 'An exact installed recipe family and version are required.'];
  const family = recipeFamily(world, value.family.id);
  if (!family || family.definition.version !== value.family.version)
    return [...errors, 'The selected recipe family/version is not installed in this world.'];
  const inputPolicy = family.definition.inputs;
  if (
    !Array.isArray(value.inputs) ||
    value.inputs.length < inputPolicy.minimumRoles ||
    value.inputs.length > inputPolicy.maximumRoles
  )
    return [
      ...errors,
      `Use ${inputPolicy.minimumRoles}–${inputPolicy.maximumRoles} material roles.`,
    ];
  const roles = new Set<string>();
  const decodedInputs: RecipeInput[] = [];
  let total = 0;
  for (const input of value.inputs) {
    if (!record(input) || !exactKeys(input, ['role', 'definitionId', 'quantity'])) {
      errors.push('Invalid material input.');
      continue;
    }
    const role = inputPolicy.roles.find((role) => role.id === input.role);
    const definition = getOwn(world.itemDefinitions, input.definitionId);
    if (!role) errors.push('Unsupported material role.');
    else if (roles.has(role.id))
      errors.push(`Role ${role.id} must occur once; combine its quantity.`);
    else roles.add(role.id);
    if (
      !definition ||
      (inputPolicy.nativeOnly && definition.recipeId) ||
      (inputPolicy.rejectNutrition && definition.nutrition !== undefined) ||
      inputPolicy.excludedDefinitionIds.includes(definition.id)
    )
      errors.push('Inputs must use an available material supported by this family.');
    else if (role && !role.properties.every((property) => definition.properties.includes(property)))
      errors.push(`Material ${definition.id} cannot fill role ${role.id}.`);
    if (!integer(input.quantity, inputPolicy.minimumQuantity, inputPolicy.maximumQuantity))
      errors.push(
        `Material quantities must be integers from ${inputPolicy.minimumQuantity} to ${inputPolicy.maximumQuantity}.`,
      );
    else total += input.quantity;
    if (
      role &&
      definition &&
      integer(input.quantity, inputPolicy.minimumQuantity, inputPolicy.maximumQuantity)
    )
      decodedInputs.push({ role: role.id, definitionId: definition.id, quantity: input.quantity });
  }
  for (const role of inputPolicy.roles)
    if (role.required && !roles.has(role.id))
      errors.push(`Missing mechanically required role: ${role.id}.`);
  if (total > inputPolicy.maximumTotal) errors.push('Recipe exceeds its material budget.');
  const schema = family.definition.parameterSchema;
  if (!record(value.parameters) || !exactKeys(value.parameters, schema.required))
    errors.push('The selected family needs exactly its declared parameters.');
  else
    for (const [name, constraint] of Object.entries(schema.properties)) {
      const parameter = value.parameters[name];
      if (constraint.type === 'string') {
        if (
          !text(parameter, constraint.maxLength) ||
          parameter.length < constraint.minLength ||
          (constraint.enum && !constraint.enum.includes(parameter))
        )
          errors.push(`Parameter ${name} is outside the supported choices.`);
      } else if (
        typeof parameter !== 'number' ||
        !Number.isFinite(parameter) ||
        parameter < constraint.minimum ||
        parameter > constraint.maximum ||
        (constraint.type === 'integer' && !Number.isSafeInteger(parameter))
      )
        errors.push(
          `Parameter ${name} must be ${constraint.type} from ${constraint.minimum} to ${constraint.maximum}.`,
        );
    }
  if (errors.length) return errors;
  if (
    !text(value.name, 80) ||
    !text(value.description, 700) ||
    !record(value.output) ||
    !text(value.output.name, 80) ||
    !text(value.output.description, 700) ||
    !record(value.parameters)
  )
    return ['Invalid recipe candidate.'];
  return family.validate(
    world,
    {
      schemaVersion: 2,
      family: { id: family.definition.id, version: family.definition.version },
      name: value.name,
      description: value.description,
      inputs: decodedInputs,
      output: { name: value.output.name, description: value.output.description },
      parameters: value.parameters,
    },
    purpose,
  );
}

export function compileRecipeCandidate(
  world: WorldState,
  candidate: RecipeCandidateV2,
  purpose: 'admission' | 'restore' = 'admission',
): CompiledRecipe {
  const errors = validateRecipeCandidate(world, candidate, purpose);
  if (errors.length) throw new Error(errors.join(' '));
  const family = recipeFamily(world, candidate.family.id);
  if (!family) throw new Error('The selected recipe family is not installed.');
  const compiled = family.compile(world, candidate);
  for (const reference of family.definition.references ?? []) {
    const id = candidate.parameters[reference.parameter];
    if (
      typeof id !== 'string' ||
      (!compiled.dependencyIds?.includes(id) &&
        !candidate.inputs.some((input) => input.definitionId === id))
    )
      throw new Error('Recipe compiler did not capture its declared definition reference.');
  }
  return compiled;
}
export function recipeDependencyPins(
  world: WorldState,
  candidate: RecipeCandidateV2,
  compiled: CompiledRecipe,
): DefinitionPin[] {
  return recipeDependencyReferences(world, candidate, compiled).map((reference) => reference.pin);
}

/** This is an immutable read identity for existing policy, never another writable copy. */
export function recipeItemHandlingPin(world: WorldState): DefinitionPin {
  return definitionPin({ id: 'engine:item-handling-policy', version: 1, ...world.itemHandling });
}

export function recipeDependencyReferences(
  world: WorldState,
  candidate: RecipeCandidateV2,
  compiled: CompiledRecipe,
): RecipeDependencyReference[] {
  const materials: RecipeDependencyReference[] = [
    ...new Set(
      candidate.inputs.map((input) => input.definitionId).concat(compiled.dependencyIds ?? []),
    ),
  ]
    .sort()
    .map((id) => {
      const definition = getOwn(world.itemDefinitions, id);
      if (!definition) throw new Error('Missing recipe definition dependency.');
      return { kind: 'item-definition', pin: definitionPin(definition) };
    });
  return materials
    .concat({ kind: 'item-handling-policy', pin: recipeItemHandlingPin(world) })
    .sort((left, right) => (left.pin.id < right.pin.id ? -1 : left.pin.id > right.pin.id ? 1 : 0));
}
export function inventionFamily(value: RecipeCandidateV2 | RecipeDefinition): string {
  return 'sourceCandidate' in value ? value.sourceCandidate.family.id : value.family.id;
}
export function describeInvention(value: RecipeDefinition): string {
  return value.facts
    .map((fact) => `${fact.label}: ${fact.value}${fact.unit ? ` ${fact.unit}` : ''}`)
    .join('; ');
}

/** Restore recomputes meaning under exact trusted pins; incompatible saves never get a fallback. */
export function validateInstalledRecipes(world: WorldState): void {
  for (const recipe of Object.values(world.recipes)) {
    if (
      !recipe.sourceCandidate ||
      !recipe.familyPin ||
      !Array.isArray(recipe.dependencyPins) ||
      !Array.isArray(recipe.facts)
    )
      throw new Error('Incompatible saved recipe format.');
    const family = recipeFamily(world, recipe.sourceCandidate.family.id);
    if (
      !family ||
      canonicalJson(recipe.familyPin) !== canonicalJson(definitionPin(family.definition))
    )
      throw new Error('Missing exact saved recipe family dependency.');
    const compiled = compileRecipeCandidate(world, recipe.sourceCandidate, 'restore');
    const { id, version, recipeId, name, description, ...output } =
      world.itemDefinitions[recipe.outputDefinitionId] ?? {};
    if (
      !id ||
      id !== recipe.outputDefinitionId ||
      recipeId !== recipe.id ||
      version !== 1 ||
      name !== recipe.sourceCandidate.output.name ||
      description !== recipe.sourceCandidate.output.description ||
      recipe.digest !== canonicalJson(recipe.sourceCandidate) ||
      recipe.name !== recipe.sourceCandidate.name ||
      recipe.description !== recipe.sourceCandidate.description ||
      canonicalJson(recipe.output) !== canonicalJson(recipe.sourceCandidate.output) ||
      canonicalJson(recipe.inputs) !== canonicalJson(recipe.sourceCandidate.inputs) ||
      recipe.workSeconds !== compiled.workSeconds ||
      canonicalJson(output) !== canonicalJson(compiled.outputDefinition) ||
      canonicalJson(recipe.facts) !== canonicalJson(compiled.facts) ||
      canonicalJson(recipe.dependencyPins) !==
        canonicalJson(recipeDependencyPins(world, recipe.sourceCandidate, compiled))
    )
      throw new Error('Saved recipe does not reproduce its exact compiled meaning.');
  }
}
