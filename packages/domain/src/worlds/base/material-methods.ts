import bundle from './config/first-playable.generated.json' with { type: 'json' };
import type { FixedTransformDefinition, ItemDefinition } from '../../types.js';

/** Build-time validated authored selections; native installation returns the actual
 * recipe identities used for knowledge and execution. */
export const BASE_MATERIAL_METHODS: readonly FixedTransformDefinition[] = bundle.methods.flatMap(
  (row) => (row.definition ? [row.definition] : []),
);
/** The generator checks source syntax, then the initializer's native validators
 * check these complete definitions before a candidate can be published. */
export const BASE_MATERIAL_ITEMS: readonly ItemDefinition[] = bundle.items.map(
  (row) => row.definition as ItemDefinition,
);
export function baseMaterialMethod(id: string): FixedTransformDefinition {
  const definition = BASE_MATERIAL_METHODS.find((method) => method.id === id);
  if (!definition) throw new Error(`Missing authored material method: ${id}`);
  return definition;
}

// These actual consumers make omission of either bootstrap method a build error.
export const BASE_FIBER_CLEANING = baseMaterialMethod('base:clean-fibers');
export const BASE_CORD_TWISTING = baseMaterialMethod('base:twist-cord');
