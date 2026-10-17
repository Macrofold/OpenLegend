import { createHash } from 'node:crypto';
import {
  availableItemQuantity,
  canAccessContainer,
  directChildIds,
  entityChangesBetween,
  STOCK_TRANSFER_LIMITS,
  inventoryWorkReason,
  isEquipped,
  itemFor,
  type ExactInventorySource,
  type ItemInstance,
  type WorldState,
} from '@open-legend/domain';
import { openCursor, sealCursor } from './scoped-cursor.js';
import { z } from 'zod';

/** Display grouping never merges objects: construction rights and history retain origins.
 * Preparing the container is full-set work; paging and actions reuse its compact ID groups.
 * docs/projects/player-experience-overhaul-tech-design.md#stable-presentation-and-fresh-authority */
export type InventoryDisplayGroup = { key: string; ids: string[]; quantity: number };
const preparations = new WeakMap<
  object,
  Map<
    string,
    {
      definitions: WorldState['itemDefinitions'];
      entities: WorldState['entities'];
      members: Set<string>;
      revision: number;
      groups: InventoryDisplayGroup[];
    }
  >
>();
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function groupKey(world: WorldState, item: ItemInstance): string {
  const entity = world.entities[item.id]!,
    definition = world.itemDefinitions[item.definitionId]!;
  if (
    item.container ||
    definition.recipeRecord ||
    item.individuality === 'individual' ||
    entity.placement?.mode === 'attached' ||
    entity.item?.assemblyClaim ||
    Object.keys(entity.statusEffects ?? {}).length ||
    Object.keys(entity.mechanismFields ?? {}).length
  )
    return digest(['individual', item.id]);
  return digest([
    entity.item!.definitionPin,
    entity.item!.unitPin,
    Object.entries(entity.attributes ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, value]) => [id, value.value]),
    entity.declaredOwner ? [entity.declaredOwner.holderId, entity.declaredOwner.disclosure] : null,
  ]);
}
export function inventoryDisplayGroups(
  world: WorldState,
  containerId: string,
): InventoryDisplayGroup[] {
  let cache = preparations.get(world.objectState);
  if (!cache) preparations.set(world.objectState, (cache = new Map()));
  const revision = world.entities[containerId]?.inventoryRevision ?? 0;
  const retained = cache.get(containerId);
  if (
    Object.isFrozen(world.entities) &&
    retained?.revision === revision &&
    retained.definitions === world.itemDefinitions
  ) {
    const changed =
      retained.entities === world.entities
        ? new Set<string>()
        : entityChangesBetween(retained.entities, world.entities);
    // Material state can change without moving a lot. Reuse only an exact write-set
    // proof that no displayed member changed; mutable seed builders prepare afresh.
    if (changed && ![...changed].some((id) => retained.members.has(id))) {
      retained.entities = world.entities;
      return retained.groups;
    }
  }
  const groups = new Map<string, InventoryDisplayGroup>();
  for (const id of directChildIds(world, containerId)) {
    const item = itemFor(world, id);
    if (!item) continue;
    let key = groupKey(world, item);
    let group = groups.get(key);
    // The page must not round an exact quantity. An independently valid huge lot
    // remains its own tile when combining it would exceed integer precision.
    if (group && group.quantity > Number.MAX_SAFE_INTEGER - item.quantity) {
      key = digest([key, id]);
      group = undefined;
    }
    if (!group) groups.set(key, (group = { key, ids: [], quantity: 0 }));
    group.ids.push(id);
    group.quantity += item.quantity;
  }
  const result = [...groups.values()];
  cache.set(containerId, {
    definitions: world.itemDefinitions,
    entities: world.entities,
    members: new Set(result.flatMap((group) => group.ids)),
    revision,
    groups: result,
  });
  return result;
}
export function inventoryGroupToken(
  world: WorldState,
  actorId: string,
  containerId: string,
  group: InventoryDisplayGroup,
  timeline: string,
): string {
  return sealCursor({
    kind: 'inventory-group',
    worldId: world.id,
    actorId,
    containerId,
    timeline,
    revision: world.entities[containerId]!.inventoryRevision ?? 0,
    key: group.key,
  });
}
const groupTokenSchema = z
  .object({
    kind: z.literal('inventory-group'),
    worldId: z.string(),
    actorId: z.string(),
    containerId: z.string(),
    timeline: z.string(),
    revision: z.number().int().nonnegative(),
    key: z.string(),
  })
  .strict();
/** Resolve once at current admission. No name matching, unrelated bags or automatic retries. */
export function resolveInventoryGroup(
  world: WorldState,
  actorId: string,
  token: string,
  quantity: number,
  timeline: string,
  requiredMemberId?: string,
): ExactInventorySource[] {
  const reference = groupTokenSchema.parse(openCursor(token));
  if (
    reference.worldId !== world.id ||
    reference.actorId !== actorId ||
    reference.timeline !== timeline ||
    !canAccessContainer(world, actorId, reference.containerId) ||
    (world.entities[reference.containerId]?.inventoryRevision ?? -1) !== reference.revision
  )
    throw new Error('These belongings changed. Refresh before moving them.');
  if (!Number.isSafeInteger(quantity) || quantity < 1)
    throw new Error('Choose an available whole quantity.');
  const group = inventoryDisplayGroups(world, reference.containerId).find(
    (entry) => entry.key === reference.key,
  );
  if (!group || (requiredMemberId && !group.ids.includes(requiredMemberId)))
    throw new Error('This stack changed. Refresh before moving it.');
  const sources: ExactInventorySource[] = [];
  let remaining = quantity;
  for (const id of group.ids) {
    if (!remaining) break;
    const item = itemFor(world, id)!;
    if (isEquipped(world, actorId, id) || inventoryWorkReason(world, actorId, id)) continue;
    const amount = Math.min(remaining, availableItemQuantity(world, id));
    if (!amount) continue;
    // Match the existing native stock operation allowance; reject the whole request.
    if (sources.length === STOCK_TRANSFER_LIMITS.movedLots)
      throw new Error(
        `This move needs more than ${STOCK_TRANSFER_LIMITS.movedLots} separate objects. Choose a smaller amount.`,
      );
    sources.push({
      itemId: id,
      quantity: amount,
      revision: item.revision!,
      placementRevision: item.placementRevision!,
    });
    remaining -= amount;
  }
  if (remaining)
    throw new Error('That many free units are no longer available. Refresh this stack.');
  return sources;
}
