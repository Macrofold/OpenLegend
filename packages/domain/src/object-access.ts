import { directChildIds, itemFor, objectAncestors, custodian, mergeCompatible } from './objects.js';
import { canReachEntity } from './spatial.js';
import { seesEntity } from './perception.js';
import { itemHasReservations } from './resource-claims.js';
import type { WorldState, ItemInstance } from './types.js';

/** Physical access is separate from declared title and human-private knowledge.
 * docs/projects/immediate-gameplay-limits.md#decisions */
export function canAccessContainer(world: WorldState, actorId: string, id: string): boolean {
  const actor = world.entities[actorId],
    target = world.entities[id];
  if (
    !actor?.actor ||
    !target ||
    !(target.actor || target.container || target.kind === 'item-pile')
  )
    return false;
  const chain = objectAncestors(world, id),
    root = chain.at(-1)!;
  if (
    chain.some(
      (entity) => entity.container?.access && !entity.container.access.actors.includes(actorId),
    )
  )
    return false;
  if (root.id === actorId) return true;
  const grantedBag = chain.at(-2)?.container?.access?.actors.includes(actorId);
  // Another person's carried inventory never opens here; items reach them only through
  // their accepted offer (docs/worlds/base/social.md#offering-and-accepting-possessions).
  if (root.actor && !root.remains && !grantedBag) return false;
  return (
    seesEntity(world, actor, root) && canReachEntity(world, actor, root, world.itemHandling.reach)
  );
}
export function accessiblePossession(world: WorldState, actorId: string, id: string): boolean {
  const item = itemFor(world, id);
  return (
    !!item && custodian(world, id) === actorId && canAccessContainer(world, actorId, item.ownerId)
  );
}
/** Iterate actual indexed descendants, never scan the world's other possessions. */
export function* possessionItems(world: WorldState, actorId: string): Generator<ItemInstance> {
  function* visit(parent: string): Generator<ItemInstance> {
    for (const id of directChildIds(world, parent)) {
      const item = itemFor(world, id);
      if (!item) continue;
      yield item;
      if (item.container && canAccessContainer(world, actorId, id)) yield* visit(id);
    }
  }
  yield* visit(actorId);
}
/** Ancestor movement must preserve references and reservations inside the bag too. */
export function inventoryWorkReason(world: WorldState, actorId: string, id: string): string | null {
  const referenced = new Set<string | undefined>();
  for (const owner of new Set([actorId, custodian(world, id)])) {
    const actor = world.entities[owner]?.actor,
      action = actor?.action;
    for (const reference of [
      action?.itemId,
      action?.weaponItemId,
      action?.ammoItemId,
      action?.targetId,
      action?.heatId,
      ...Object.values(action?.foodPreparation?.inputs ?? {}),
    ])
      if (reference) referenced.add(reference);
  }
  const visit = (itemId: string): boolean => {
    if (referenced.has(itemId) || itemHasReservations(world, itemId)) return true;
    for (const child of directChildIds(world, itemId)) if (visit(child)) return true;
    return false;
  };
  return visit(id) ? 'This item or its contents are needed by ongoing work.' : null;
}
/** Discovery mirror of merge-item admission (the kernel merge case and `mergeLots`): an
 * equivalent free lot in the same container that no ongoing work needs. Merge commands
 * still recheck handling, access and revisions when submitted. The caller checks the
 * source lot's own work reason once. */
export function mergeTargetAvailable(
  world: WorldState,
  actorId: string,
  sourceId: string,
  targetId: string,
): boolean {
  const source = itemFor(world, sourceId),
    target = itemFor(world, targetId);
  return (
    !!source &&
    !!target &&
    sourceId !== targetId &&
    source.ownerId === target.ownerId &&
    source.definitionId === target.definitionId &&
    world.itemDefinitions[source.definitionId]?.portable === true &&
    mergeCompatible(world, sourceId, targetId) &&
    !inventoryWorkReason(world, actorId, targetId)
  );
}
