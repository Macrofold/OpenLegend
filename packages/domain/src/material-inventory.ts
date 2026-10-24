import type { MaterialInventoryRule } from './assembly-types.js';
import type { ItemDefinition, WorldState } from './types.js';
import { getOwn, hasRecordFields, isSafeRecordId } from './records.js';

export function tracksMaterialOrigins(definition: ItemDefinition): boolean {
  return !!definition.assemblyMaterial || definition.tracksMaterialOrigins === true;
}

/** Material behavior comes from the exact installed family, while the object owner
 * retains custody/quantity authority. docs/worlds/base/editable-shelters.md */
export function materialInventoryRule(
  world: WorldState,
  definition: ItemDefinition,
): MaterialInventoryRule | undefined {
  const material = definition.assemblyMaterial;
  if (!material) return;
  const family = world.assemblyFamilies && getOwn(world.assemblyFamilies, material.familyId);
  const rule = family?.inventory && getOwn(family.inventory, material.role);
  if (!rule) throw new Error('This material needs its installed inventory rule.');
  return rule;
}

/** One definition boundary validates the material state that splitting, packing and
 * restoration actually consume. Family-specific exposure restrictions follow it. */
export function validateMaterialInventoryRule(
  world: WorldState,
  value: unknown,
): asserts value is MaterialInventoryRule {
  if (
    !hasRecordFields(value, [
      'initialAttributes',
      'stateAttributes',
      'homogeneous',
      'bagRefusal',
    ]) ||
    !Array.isArray(value.initialAttributes) ||
    !Array.isArray(value.stateAttributes) ||
    new Set(value.initialAttributes).size !== value.initialAttributes.length ||
    new Set(value.stateAttributes).size !== value.stateAttributes.length ||
    value.stateAttributes.some(
      (id) =>
        !isSafeRecordId(id) ||
        !world.moduleManifest.definitions.some((definition) => definition.id === id),
    ) ||
    typeof value.homogeneous !== 'boolean' ||
    !(
      value.bagRefusal === null ||
      (typeof value.bagRefusal === 'string' && value.bagRefusal.trim().length > 0)
    )
  )
    throw new Error('Invalid installed material inventory rule.');
  const states = value.stateAttributes;
  if (value.initialAttributes.some((id) => !states.includes(id)))
    throw new Error('Invalid installed material initial state.');
}
