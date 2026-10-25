import { entityGet } from './entity-collection.js';
import { supportsManualWork } from './living.js';
import { equipmentProblem, isEquipped } from './equipment.js';
import { availableStrikes, strikeDefinition } from './strikes.js';
import { availableItemQuantity, type ResourceAvailability } from './resource-claims.js';
import { chargeWork } from './work-budget.js';
import type { ItemDefinition, ItemInstance, RangedWeapon, WorldState } from './types.js';

/** Target-independent physical means from this actor's permitted possessions.
 * This query grants no action: exact targets, work transitions and eventual costs
 * still pass ordinary native admission. Keep ammunition grouped until a caller
 * actually expands offered targets; observers need ranges, not a lot cross product.
 * docs/action-capabilities.md#prepared-choices-and-prospective-work-transitions */
export function prepareCombatMeans(
  world: WorldState,
  actorId: string,
  inventory: readonly ItemInstance[],
  availability?: ResourceAvailability,
) {
  const strikes = availableStrikes(world, actorId);
  const ammunitionByKind = new Map<string, ItemInstance[]>();
  const rangedWeapons: Array<{
    item: ItemInstance;
    definition: ItemDefinition;
    rangedWeapon: RangedWeapon;
    ammunition: readonly ItemInstance[];
  }> = [];
  const shields: ItemInstance[] = [];
  if (!supportsManualWork(entityGet(world.entities, actorId)))
    return { strikes, rangedWeapons, shields, ammunitionByKind };
  for (const item of inventory) {
    chargeWork({ tests: 1 });
    const kind = world.itemDefinitions[item.definitionId]?.ammunition?.kind;
    if (!kind || availableItemQuantity(world, item.id, undefined, availability) < 1) continue;
    let group = ammunitionByKind.get(kind);
    if (!group) ammunitionByKind.set(kind, (group = []));
    group.push(item);
  }
  for (const item of inventory) {
    chargeWork({ tests: 1 });
    const definition = world.itemDefinitions[item.definitionId];
    if (!definition || item.quantity <= 0) continue;
    const rangedWeapon = definition.rangedWeapon;
    const ammunition = rangedWeapon && ammunitionByKind.get(rangedWeapon.ammunitionKind);
    if (
      rangedWeapon &&
      ammunition?.length &&
      !equipmentProblem(world, actorId, item.id, 'ranged', availability) &&
      (isEquipped(world, actorId, item.id) || item.quantity === 1)
    )
      rangedWeapons.push({ item, definition, rangedWeapon, ammunition });
    if (
      !isEquipped(world, actorId, item.id) &&
      item.quantity === 1 &&
      definition.melee &&
      !equipmentProblem(world, actorId, item.id, 'melee', availability)
    ) {
      const strike = strikeDefinition(item.definitionId, world, item.id);
      if (strike) strikes.push(strike);
    }
    if (
      definition.contactDefense &&
      !equipmentProblem(world, actorId, item.id, 'guard', availability)
    )
      shields.push(item);
  }
  return { strikes, rangedWeapons, shields, ammunitionByKind };
}
