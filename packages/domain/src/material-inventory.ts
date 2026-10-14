import type { MaterialInventoryRule } from './assembly-types.js';
import type { ItemDefinition, WorldState } from './types.js';
import { getOwn } from './records.js';

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
