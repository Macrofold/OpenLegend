import {
  assertAssetRevisionReference,
  assertArtifactReference,
  isRepositoryAssetPath,
  assetRevisionKey,
  type ArtifactReference,
  type AssetRevisionReference,
} from '@open-legend/assets';

/** Render-only choices. Neither this recipe nor source provenance belongs on an
 * observed Entity/Actor. Physical changes use the separate admitted body owner. */
export interface AppearanceRecipe {
  family: AssetRevisionReference;
  controls: Record<string, number>;
  selections: Record<string, string>;
}

export interface AppearanceControlDefinition {
  id: string;
  label: string;
  group: string;
  kind: 'bipolar' | 'frame' | 'stature' | 'age' | 'styleLength';
  minimum: number;
  maximum: number;
  defaultValue: number;
  unit?: string;
}

export interface AppearanceSelectionDefinition {
  id: string;
  label: string;
  group: string;
  defaultValue: string;
  options: Array<{ id: string; label: string }>;
}

export interface AppearancePreset {
  id: string;
  label: string;
  /** A preset changes only its declared patch; it never resets unrelated choices. */
  group: string;
  controls: Record<string, number>;
  selections: Record<string, string>;
}

export interface AppearanceConstraint {
  id: string;
  label: string;
  terms: Array<{ control: string; coefficient: number }>;
  maximum: number;
}

export interface AppearanceFamilyDefinition {
  reference: AssetRevisionReference;
  label: string;
  /** Exact compiled file; permission and URL resolution remain with asset storage. */
  compiled?: ArtifactReference;
  compiledPath?: string;
  groups: Array<{ id: string; label: string }>;
  controls: AppearanceControlDefinition[];
  selections: AppearanceSelectionDefinition[];
  presets: AppearancePreset[];
  constraints: AppearanceConstraint[];
}

export interface AppearanceRecipeInput {
  family: AssetRevisionReference;
  controls?: Record<string, number>;
  /** Explicit percentages, 0..100. Raw values never guess their unit from magnitude. */
  percentages?: Record<string, number>;
  selections?: Record<string, string>;
}

export type AppearanceResolution =
  | { ok: true; recipe: AppearanceRecipe }
  | { ok: false; code: 'family' | 'control' | 'selection' | 'envelope'; message: string };

export function sameAppearanceFamily(a: AssetRevisionReference, b: AssetRevisionReference) {
  return assetRevisionKey(a) === assetRevisionKey(b) && a.manifestSha256 === b.manifestSha256;
}

export function appearanceControlFraction(control: AppearanceControlDefinition, value: number) {
  return (value - control.minimum) / (control.maximum - control.minimum);
}

/** Intersect one drag axis with the admitted linear envelope while the other
 * coordinates stay fixed. Numeric/offline inputs still reject through resolution. */
export function appearanceControlRange(
  family: AppearanceFamilyDefinition,
  recipe: AppearanceRecipe,
  controlId: string,
): { minimum: number; maximum: number } | undefined {
  const selected = family.controls.find((control) => control.id === controlId);
  if (!selected || !sameAppearanceFamily(family.reference, recipe.family)) return;
  let low = 0,
    high = 1;
  const definitions = new Map(family.controls.map((control) => [control.id, control]));
  for (const constraint of family.constraints) {
    let coefficient = 0,
      remainder = 0;
    for (const term of constraint.terms) {
      if (term.control === controlId) coefficient += term.coefficient;
      else {
        const control = definitions.get(term.control),
          value = recipe.controls[term.control];
        if (!control || value === undefined) return;
        remainder += term.coefficient * appearanceControlFraction(control, value);
      }
    }
    if (coefficient > 0) high = Math.min(high, (constraint.maximum - remainder) / coefficient);
    else if (coefficient < 0) low = Math.max(low, (constraint.maximum - remainder) / coefficient);
    else if (remainder > constraint.maximum + 1e-12) return;
  }
  if (low > high) return;
  const span = selected.maximum - selected.minimum;
  return { minimum: selected.minimum + low * span, maximum: selected.minimum + high * span };
}

/** Shared by offline inputs, server admission and the private creator draft. The
 * family defines order, allowed values and coupled bounds; there is no clamping or
 * nearest-preset substitution. docs/projects/people-from-parts-authoring-contract.md */
export function resolveAppearanceRecipe(
  family: AppearanceFamilyDefinition,
  input: AppearanceRecipeInput,
): AppearanceResolution {
  if (!sameAppearanceFamily(family.reference, input.family))
    return { ok: false, code: 'family', message: 'Choose an available appearance collection.' };
  const known = new Set(family.controls.map((control) => control.id));
  for (const values of [input.controls, input.percentages])
    for (const id of Object.keys(values ?? {}))
      if (!known.has(id))
        return { ok: false, code: 'control', message: 'This appearance control is unavailable.' };
  const controls: Record<string, number> = {};
  for (const control of family.controls) {
    const supplied = input.controls?.[control.id];
    const percentage = input.percentages?.[control.id];
    const converted =
      percentage === undefined
        ? undefined
        : control.minimum + (percentage / 100) * (control.maximum - control.minimum);
    if (
      (percentage !== undefined &&
        (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)) ||
      (supplied !== undefined &&
        converted !== undefined &&
        Math.abs(supplied - converted) / (control.maximum - control.minimum) > 1e-6)
    )
      return { ok: false, code: 'control', message: `Check the value for ${control.label}.` };
    const value = supplied ?? converted ?? control.defaultValue;
    if (!Number.isFinite(value) || value < control.minimum || value > control.maximum)
      return {
        ok: false,
        code: 'control',
        message: `${control.label} must be between ${control.minimum} and ${control.maximum}.`,
      };
    controls[control.id] = value;
  }
  const selections: Record<string, string> = {};
  const roles = new Set(family.selections.map((selection) => selection.id));
  if (Object.keys(input.selections ?? {}).some((id) => !roles.has(id)))
    return { ok: false, code: 'selection', message: 'This appearance choice is unavailable.' };
  for (const selection of family.selections) {
    const selected = input.selections?.[selection.id] ?? selection.defaultValue;
    if (!selection.options.some((option) => option.id === selected))
      return { ok: false, code: 'selection', message: `Choose an available ${selection.label}.` };
    selections[selection.id] = selected;
  }
  const definitions = new Map(family.controls.map((control) => [control.id, control]));
  for (const constraint of family.constraints) {
    let sum = 0;
    for (const term of constraint.terms) {
      const definition = definitions.get(term.control);
      const value = controls[term.control];
      if (!definition || value === undefined)
        return { ok: false, code: 'family', message: 'This appearance collection is incomplete.' };
      sum += term.coefficient * appearanceControlFraction(definition, value);
    }
    if (sum > constraint.maximum + 1e-12)
      return { ok: false, code: 'envelope', message: constraint.label };
  }
  return {
    ok: true,
    recipe: {
      family: { ...family.reference, owner: { ...family.reference.owner } },
      controls,
      selections,
    },
  };
}

export function validAppearanceRecipeShape(value: unknown): value is AppearanceRecipe {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !['family', 'controls', 'selections'].includes(key)))
    return false;
  try {
    assertAssetRevisionReference(record['family']);
  } catch {
    return false;
  }
  for (const [key, type] of [
    ['controls', 'number'],
    ['selections', 'string'],
  ] as const) {
    const values = record[key];
    if (typeof values !== 'object' || values === null || Array.isArray(values)) return false;
    if (
      Object.values(values).some(
        (item) => typeof item !== type || (type === 'number' && !Number.isFinite(item)),
      )
    )
      return false;
  }
  return true;
}

/** Current-format definition admission. Runtime resolution relies on these named
 * fields and complete identifiers, rather than treating malformed metadata as defaults. */
export function validateAppearanceFamily(family: AppearanceFamilyDefinition): void {
  assertAssetRevisionReference(family.reference);
  const id = (value: unknown): value is string =>
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 200 &&
    !['__proto__', 'constructor', 'prototype'].includes(value);
  const text = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
  const unique = (values: readonly { id: string }[]) =>
    values.every((value) => id(value.id)) &&
    new Set(values.map((value) => value.id)).size === values.length;
  if (
    !text(family.label) ||
    !Array.isArray(family.groups) ||
    !unique(family.groups) ||
    !Array.isArray(family.controls) ||
    !unique(family.controls) ||
    !Array.isArray(family.selections) ||
    !unique(family.selections) ||
    !Array.isArray(family.presets) ||
    !unique(family.presets) ||
    !Array.isArray(family.constraints) ||
    !unique(family.constraints)
  )
    throw new Error('Invalid appearance collection.');
  const groups = new Set(family.groups.map((group) => group.id));
  if (family.groups.some((group) => !text(group.label)))
    throw new Error('Invalid appearance group.');
  for (const control of family.controls)
    if (
      !text(control.label) ||
      !groups.has(control.group) ||
      !['bipolar', 'frame', 'stature', 'age', 'styleLength'].includes(control.kind) ||
      ![control.minimum, control.maximum, control.defaultValue].every(Number.isFinite) ||
      control.minimum >= control.maximum ||
      control.defaultValue < control.minimum ||
      control.defaultValue > control.maximum
    )
      throw new Error('Invalid appearance control.');
  for (const selection of family.selections)
    if (
      !text(selection.label) ||
      !groups.has(selection.group) ||
      !Array.isArray(selection.options) ||
      !unique(selection.options) ||
      selection.options.some((option) => !text(option.label)) ||
      !selection.options.some((option) => option.id === selection.defaultValue)
    )
      throw new Error('Invalid appearance choice.');
  const controls = new Set(family.controls.map((control) => control.id));
  for (const constraint of family.constraints)
    if (
      !text(constraint.label) ||
      !Number.isFinite(constraint.maximum) ||
      !Array.isArray(constraint.terms) ||
      !constraint.terms.length ||
      constraint.terms.some(
        (term) => !controls.has(term.control) || !Number.isFinite(term.coefficient),
      )
    )
      throw new Error('Invalid appearance fit constraint.');
  if ((family.compiled === undefined) !== (family.compiledPath === undefined))
    throw new Error('Incomplete compiled appearance asset.');
  if (family.compiled) {
    assertArtifactReference(family.compiled);
    if (!isRepositoryAssetPath(family.compiledPath))
      throw new Error('Invalid compiled appearance path.');
  }
  if (!resolveAppearanceRecipe(family, { family: family.reference }).ok)
    throw new Error('The default appearance does not fit its collection.');
  for (const preset of family.presets)
    if (
      !text(preset.label) ||
      !groups.has(preset.group) ||
      !validAppearanceRecipeShape({
        family: family.reference,
        controls: preset.controls,
        selections: preset.selections,
      }) ||
      Object.keys(preset.controls).some(
        (id) => family.controls.find((control) => control.id === id)?.group !== preset.group,
      ) ||
      Object.keys(preset.selections).some(
        (id) => family.selections.find((selection) => selection.id === id)?.group !== preset.group,
      ) ||
      !resolveAppearanceRecipe(family, {
        family: family.reference,
        controls: preset.controls,
        selections: preset.selections,
      }).ok
    )
      throw new Error('Invalid appearance preset.');
}
