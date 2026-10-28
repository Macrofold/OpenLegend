import { hasRecordFields, isSafeRecordId } from './records.js';
import type { RecipeDefinition, WorldState } from './types.js';

/** Grouping is presentation selected by a world; it grants no recipe knowledge. */
export interface CraftCataloguePolicy {
  categoryLabel: string;
  allLabel: string;
  defaultCategoryId: string;
  categories: Array<{ id: string; label: string; icon?: string }>;
  rules: Array<{
    categoryId: string;
    kind: 'transform' | 'family' | 'authored-profile';
    id: string;
  }>;
}
export function validateCraftCatalogue(value: unknown): asserts value is CraftCataloguePolicy {
  const text = (value: unknown) =>
    typeof value === 'string' && !!value.trim() && value.length <= 500;
  if (
    !hasRecordFields(value, [
      'categoryLabel',
      'allLabel',
      'defaultCategoryId',
      'categories',
      'rules',
    ]) ||
    !text(value.categoryLabel) ||
    !text(value.allLabel) ||
    !isSafeRecordId(value.defaultCategoryId) ||
    !Array.isArray(value.categories) ||
    !value.categories.length ||
    !Array.isArray(value.rules)
  )
    throw new Error('Invalid known-method catalogue presentation.');
  const categories = new Set<string>(),
    selectors = new Set<string>();
  for (const category of value.categories) {
    if (
      !hasRecordFields(category, ['id', 'label'], ['icon']) ||
      (category.icon !== undefined && !text(category.icon)) ||
      !isSafeRecordId(category.id) ||
      !text(category.label) ||
      categories.has(category.id)
    )
      throw new Error('Invalid known-method category.');
    categories.add(category.id);
  }
  if (!categories.has(value.defaultCategoryId))
    throw new Error('Missing default known-method category.');
  for (const rule of value.rules) {
    if (
      !hasRecordFields(rule, ['categoryId', 'kind', 'id']) ||
      !isSafeRecordId(rule.id) ||
      typeof rule.kind !== 'string' ||
      !['transform', 'family', 'authored-profile'].includes(rule.kind) ||
      !isSafeRecordId(rule.categoryId) ||
      !categories.has(rule.categoryId)
    )
      throw new Error('Invalid known-method category selector.');
    const key = JSON.stringify([rule.kind, rule.id]);
    if (selectors.has(key)) throw new Error('A known-method selector has more than one category.');
    selectors.add(key);
  }
}
/** Callers first establish permitted method disclosure. Ordered authored selectors
 * classify its actual source, never its name, inventory availability or usefulness. */
export function craftCatalogueCategory(world: WorldState, recipe: RecipeDefinition) {
  const policy = world.presentation?.crafting;
  if (!policy) return;
  const selected = policy.rules.find((rule) =>
    rule.kind === 'transform'
      ? recipe.source.kind === 'fixed-transform' && recipe.source.definition.id === rule.id
      : rule.kind === 'family'
        ? recipe.source.kind === 'family' && recipe.source.familyPin.id === rule.id
        : recipe.provenance.source === 'authored-world' && recipe.provenance.profile.id === rule.id,
  );
  return policy.categories.find(
    (category) => category.id === (selected?.categoryId ?? policy.defaultCategoryId),
  )!;
}
