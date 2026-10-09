import { accessiblePossession } from './object-access.js';
import { attachedItemIds, itemFor } from './objects.js';
import { itemHasReservations } from './resource-claims.js';
import { definitionPin } from './world-modules.js';
import { sameDefinitionPin } from './state-owners.js';
import { isSafeRecordId, hasRecordFields } from './records.js';
import type { ItemInstance, WorldState } from './types.js';

/** Trusted finite consumers; port names and permitted combinations are world-authored. */
export type EquipmentUse = 'melee' | 'ranged' | 'gather' | 'guard';
export interface EquipmentProfile {
  /** The first occupied port is the physical attachment's primary port. */
  ports: string[];
  uses: EquipmentUse[];
}
export interface EquipmentPort {
  id: string;
  label: string;
}
export function validEquipmentProfile(profile: EquipmentProfile): boolean {
  return (
    !!profile &&
    hasRecordFields(profile, ['ports', 'uses']) &&
    Array.isArray(profile.ports) &&
    profile.ports.length > 0 &&
    profile.ports.every(isSafeRecordId) &&
    new Set(profile.ports).size === profile.ports.length &&
    Array.isArray(profile.uses) &&
    profile.uses.length > 0 &&
    profile.uses.every((use) => ['melee', 'ranged', 'gather', 'guard'].includes(use)) &&
    new Set(profile.uses).size === profile.uses.length
  );
}

/** Placement is the sole saved equipment authority; the existing object index bounds reads
 * to this body's direct attachments. docs/worlds/base/shield-defense.md#compatible-equipment */
function attachedEquipment(
  world: WorldState,
  actorId: string,
  itemId: string,
  use?: EquipmentUse,
): ItemInstance | undefined {
  const body = world.entities[actorId]?.actor?.body;
  const entity = world.entities[itemId];
  if (
    !body ||
    entity?.placement?.mode !== 'attached' ||
    entity.placement.parentEntityId !== actorId ||
    !entity.item
  )
    return;
  const definition = world.itemDefinitions[entity.item.definitionPin.id];
  const profile = definition?.equipment;
  if (
    profile &&
    (!use || profile.uses.includes(use)) &&
    profile.ports[0] === entity.placement.portId &&
    profile.ports.every((port) => body.equipmentPorts.some((p) => p.id === port)) &&
    sameDefinitionPin(entity.item.definitionPin, definitionPin(definition))
  )
    return itemFor(world, itemId);
}
export function equippedItems(
  world: WorldState,
  actorId: string,
  use?: EquipmentUse,
): ItemInstance[] {
  if (!world.entities[actorId]?.actor?.body) return [];
  const result: ItemInstance[] = [];
  for (const id of attachedItemIds(world, actorId)) {
    const item = attachedEquipment(world, actorId, id, use);
    if (item) result.push(item);
  }
  return result;
}
export function equippedItem(
  world: WorldState,
  actorId: string,
  use: EquipmentUse,
  exactId?: string,
): ItemInstance | undefined {
  if (exactId) return attachedEquipment(world, actorId, exactId, use);
  if (!world.entities[actorId]?.actor?.body) return;
  for (const id of attachedItemIds(world, actorId)) {
    const item = attachedEquipment(world, actorId, id, use);
    if (item) return item;
  }
}
export function isEquipped(world: WorldState, actorId: string, itemId: string): boolean {
  return !!attachedEquipment(world, actorId, itemId);
}
export function equipmentConflicts(
  world: WorldState,
  actorId: string,
  itemId: string,
): ItemInstance[] {
  const item = itemFor(world, itemId);
  const profile = item && world.itemDefinitions[item.definitionId]?.equipment;
  if (!profile) return [];
  return equippedItems(world, actorId).filter(
    (current) =>
      current.id !== itemId &&
      world.itemDefinitions[current.definitionId]!.equipment!.ports.some((port) =>
        profile.ports.includes(port),
      ),
  );
}
/** Shared read-only prerequisites; unavailable conflicts fail before any attachment changes. */
export function equipmentProblem(
  world: WorldState,
  actorId: string,
  itemId: string,
  use?: EquipmentUse,
): string | undefined {
  const actor = world.entities[actorId]?.actor;
  const item = itemFor(world, itemId);
  const definition = item && world.itemDefinitions[item.definitionId];
  const profile = definition?.equipment;
  if (!actor?.body || !item || !profile || !accessiblePossession(world, actorId, itemId))
    return 'Choose accessible equipment in this inventory.';
  if (use && !profile.uses.includes(use)) return 'Choose equipment that supports this action.';
  if (profile.ports.some((port) => !actor.body!.equipmentPorts.some((p) => p.id === port)))
    return 'This body cannot hold this equipment.';
  if (
    itemHasReservations(world, itemId) ||
    equipmentConflicts(world, actorId, itemId).some((conflict) =>
      itemHasReservations(world, conflict.id),
    )
  )
    return 'Finish work or release the reserved equipment before changing these attachments.';
  return undefined;
}
export function validateEquipment(world: WorldState): void {
  for (const definition of Object.values(world.itemDefinitions)) {
    const profile = definition.equipment;
    if (
      profile &&
      (!validEquipmentProfile(profile) ||
        profile.uses.some((use) =>
          use === 'melee'
            ? !definition.melee
            : use === 'ranged'
              ? !definition.launcher
              : use === 'gather'
                ? !definition.gatheringTool
                : !definition.contactDefense,
        ))
    )
      throw new Error('Invalid equipment capability profile.');
    if (
      (definition.melee ||
        definition.launcher ||
        definition.gatheringTool ||
        definition.contactDefense) &&
      !profile
    )
      throw new Error('A held-tool capability requires its admitted equipment profile.');
  }
  for (const entity of Object.values(world.entities)) {
    const ports = entity.actor?.body?.equipmentPorts;
    if (!entity.actor?.body) continue;
    if (
      !Array.isArray(ports) ||
      new Set(ports.map((p) => p?.id)).size !== ports.length ||
      ports.some(
        (p) =>
          !p ||
          !hasRecordFields(p, ['id', 'label']) ||
          !isSafeRecordId(p.id) ||
          typeof p.label !== 'string' ||
          !p.label.trim() ||
          p.label.length > 160,
      )
    )
      throw new Error('Incompatible current body equipment ports.');
  }
}
