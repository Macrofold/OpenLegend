import { STOCK_TRANSFER_LIMITS } from './stock-transfer.js';
import { canAccessContainer, inventoryWorkReason } from './object-access.js';
import { canHandleItems, dropSelectedItems, atomicObjects } from './item-handling.js';
import { itemFor, moveLotsTogether } from './objects.js';
import { availableItemQuantity } from './resource-claims.js';
import type { Entity, ExactInventorySource, WorldEvent, WorldState } from './types.js';

/** Exact members are bound by the permitted inventory reader. This checks every member
 * again; grouping grants no custody, permission, reservation release or provenance merge. */
export function inventoryGroupReason(
  world: WorldState,
  actor: Entity,
  sources: ExactInventorySource[],
  total: number,
): string | undefined {
  if (
    !canHandleItems(world, actor) ||
    !sources.length ||
    sources.length > STOCK_TRANSFER_LIMITS.movedLots
  )
    return `Choose up to ${STOCK_TRANSFER_LIMITS.movedLots} accessible source objects.`;
  const selected = new Set<string>();
  let quantity = 0;
  for (const source of sources) {
    const item = itemFor(world, source.itemId);
    if (
      !item ||
      selected.has(source.itemId) ||
      !canAccessContainer(world, actor.id, item.ownerId) ||
      world.itemDefinitions[item.definitionId]?.portable !== true
    )
      return 'Choose accessible portable belongings.';
    selected.add(source.itemId);
    if (item.revision !== source.revision || item.placementRevision !== source.placementRevision)
      return 'The selected belongings changed. Refresh before moving them.';
    if (
      !Number.isSafeInteger(source.quantity) ||
      source.quantity < 1 ||
      source.quantity > availableItemQuantity(world, source.itemId)
    )
      return 'That quantity is no longer available.';
    const problem = inventoryWorkReason(world, actor.id, source.itemId);
    if (problem) return problem;
    quantity += source.quantity;
  }
  if (!Number.isSafeInteger(quantity) || quantity !== total)
    return 'Choose an exact available quantity.';
}
export function moveInventoryGroup(
  world: WorldState,
  actor: Entity,
  sources: ExactInventorySource[],
  quantity: number,
  destinationId: string,
  destinationRevision: number,
  cause: string,
): string[] {
  const problem = inventoryGroupReason(world, actor, sources, quantity);
  if (problem) throw new Error(problem);
  const destination = world.entities[destinationId];
  // The access owner distinguishes a living person's private inventory from
  // accessible remains; the grouped path must preserve ordinary transfer rules.
  if (!destination || !canAccessContainer(world, actor.id, destinationId))
    throw new Error('Choose an accessible container. Offer belongings to another person instead.');
  if ((destination.inventoryRevision ?? 0) !== destinationRevision)
    throw new Error('The destination changed. Refresh before moving these belongings.');
  return atomicObjects(world, (candidate) =>
    moveLotsTogether(
      candidate,
      sources.map((source) => ({
        itemId: source.itemId,
        quantity: source.quantity,
        destinationId,
      })),
      cause,
    ),
  );
}
export function dropInventoryGroup(
  world: WorldState,
  actor: Entity,
  sources: ExactInventorySource[],
  quantity: number,
  events: WorldEvent[],
): string | undefined {
  const problem = inventoryGroupReason(world, actor, sources, quantity);
  if (problem) return problem;
  return dropSelectedItems(world, actor, sources, events) ?? undefined;
}
