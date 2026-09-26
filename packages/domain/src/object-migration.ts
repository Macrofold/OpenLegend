import { finitePoint, type WorldPoint } from '@open-legend/spatial';
import { createItemLot, equipLot, ITEM_COUNT_PIN, validateObjects } from './objects.js';
import { worldPlacement } from './spatial-state.js';
import { definitionPin } from './world-modules.js';
import { sameDefinitionPin } from './state-owners.js';
import { NATIVE_ITEMS } from './worlds/base/items.js';
import { BASE_ITEM_HANDLING } from './worlds/base/item-handling.js';
import { canonicalJson } from './events.js';
import type { Entity, ItemInstance, WorldState } from './types.js';

/** A checked, identity-preserving conversion. Run in the existing startup/save-install
 * draft and transaction; any unsupported reference aborts before publication. */
export function upgradeObjects(world: WorldState): void {
  const legacy = world as WorldState & { items?: Record<string, ItemInstance> };
  if (!legacy.items && world.objectState) return;
  const lots = Object.values(legacy.items ?? {});
  for (const item of lots) {
    if (Object.hasOwn(world.entities, item.id))
      throw new Error(`Item/entity identity collision: ${item.id}. Conversion refused.`);
    if (!world.itemDefinitions[item.definitionId] || !world.entities[item.ownerId])
      throw new Error('Legacy item has an unavailable definition or custodian.');
  }
  world.objectState = { revision: 0 };
  for (const entity of Object.values(world.entities)) {
    const old = entity as Entity & {
      position?: WorldPoint;
      spatial: Entity['spatial'] & { supportSurfaceId?: string | null };
    };
    if (!old.placement && !old.retirement) {
      if (!finitePoint(old.position) || old.spatial.supportSurfaceId === undefined)
        throw new Error('Unsupported legacy physical placement; conversion refused.');
      old.placement = worldPlacement(old.position, old.spatial.supportSurfaceId);
    }
    delete old.position;
    delete old.spatial.supportSurfaceId;
  }
  // Legacy definition bytes and pins remain exact. The authored policy supplies newly
  // applicable packing metadata only for exact known native definitions, never all items.
  const packing = (world.itemHandling.packingLoads ??= []);
  const {
    generatedPackingLoad: authoredLoad,
    packingLoads: _bindings,
    ...baseHandling
  } = BASE_ITEM_HANDLING;
  const { packingLoads: _oldBindings, ...oldHandling } = world.itemHandling;
  if (canonicalJson(oldHandling) === canonicalJson(baseHandling))
    world.itemHandling.generatedPackingLoad = authoredLoad;
  for (const definition of Object.values(world.itemDefinitions)) {
    const native = NATIVE_ITEMS[definition.id];
    if (!native || native.packingLoad === undefined || definition.packingLoad !== undefined)
      continue;
    const previous = { ...native };
    delete previous.packingLoad;
    if (sameDefinitionPin(definitionPin(previous), definitionPin(definition)))
      packing.push({ definition: definitionPin(definition), load: native.packingLoad });
  }
  for (const item of lots) {
    createItemLot(world, item.ownerId, item.definitionId, item.quantity, item.id);
    world.entities[item.id]!.item!.revision = item.revision ?? 0;
  }
  for (const entity of Object.values(world.entities)) {
    const actor = entity.actor,
      equipped = actor?.equippedItemId;
    if (!actor || !equipped) continue;
    const lot = world.entities[equipped]?.item;
    if (!lot) throw new Error('Equipped legacy object is unavailable.');
    // Reservations remain on the original bulk lot; unsupported identity rebinding fails.
    const individual = equipLot(world, entity.id, equipped, 'equipped-unit-migration', 'migration');
    if (actor.action?.weaponItemId === equipped) actor.action.weaponItemId = individual;
    if (
      individual !== equipped &&
      (actor.action?.itemId === equipped || actor.action?.ammoItemId === equipped)
    )
      throw new Error('Equipped stack has an unsupported active reference; conversion refused.');
  }
  delete legacy.items;
  if (!world.itemDefinitions['woven_bag'])
    world.itemDefinitions['woven_bag'] = structuredClone(NATIVE_ITEMS['woven_bag']!);
  for (const reservation of Object.values(world.resourceReservations ?? {}))
    if (reservation.resource.kind === 'item' && reservation.state === 'held') {
      const lot = world.entities[reservation.resource.itemId]?.item;
      if (
        !lot ||
        !sameDefinitionPin(lot.definitionPin, reservation.resource.definition) ||
        !sameDefinitionPin(lot.unitPin, ITEM_COUNT_PIN)
      )
        throw new Error('A retained ingredient reservation cannot bind the converted lot.');
    }
  validateObjects(world);
}
