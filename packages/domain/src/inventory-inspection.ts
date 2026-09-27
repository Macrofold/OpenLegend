import { possessionItems } from './object-access.js';
import type { ItemDefinition, ItemInstance, WorldState } from './types.js';

const descriptions = new WeakMap<ItemDefinition, string>();
/** Definition facts are immutable across a committed snapshot; live lot facts are never cached. */
export function describePossession(
  item: ItemInstance,
  definition: ItemDefinition,
  equipped: boolean,
): string {
  let facts = descriptions.get(definition);
  if (!facts) {
    const melee = definition.melee;
    facts = [
      definition.description,
      `Properties: ${definition.properties.join(', ')}.`,
      definition.nutrition ? `Edible now; restores ${definition.nutrition} nourishment.` : '',
      melee ? 'Can be equipped for close-range attacks.' : '',
    ]
      .filter(Boolean)
      .join(' ');
    if (
      Object.isFrozen(definition) &&
      Object.isFrozen(definition.properties) &&
      (!melee || Object.isFrozen(melee))
    )
      descriptions.set(definition, facts);
  }
  return `${item.quantity} × ${definition.name}${equipped ? ', equipped' : ', accessible possession'}. ${facts}`;
}

/** Explicit private read, not an automatic inventory-change trigger. Cursor is bound to
 * the actor's custody revision; each page respects the existing 16-possession allowance.
 * docs/projects/embodied-survival-tech-design.md#required-versus-selected-information */
export function inspectPossessions(
  world: WorldState,
  actorId: string,
  after = '',
  expectedRevision?: number,
) {
  const entity = world.entities[actorId];
  if (!entity?.actor) throw new Error('Actor unavailable.');
  const revision = entity.inventoryRevision ?? 0;
  const prior = entity.actor.inventoryInspection;
  if (
    after &&
    (expectedRevision !== revision ||
      prior?.revision !== revision ||
      prior.after !== after ||
      !prior.more)
  )
    throw new Error('Possessions or continuation changed. Inspect from the beginning.');
  const items = [...possessionItems(world, actorId)].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const page: string[] = [];
  const itemIds: string[] = [];
  let bytes = 0,
    last = after,
    more = false;
  for (const item of items) {
    if (item.id.localeCompare(after, 'en') <= 0) continue;
    const text = describePossession(
      item,
      world.itemDefinitions[item.definitionId]!,
      entity.actor.equippedItemId === item.id,
    );
    const size = new TextEncoder().encode(text).length;
    if (page.length === 16 || bytes + size > 8000) {
      more = true;
      break;
    }
    page.push(text);
    itemIds.push(item.id);
    bytes += size;
    last = item.id;
  }
  if (more && !page.length)
    throw new Error('This possession description exceeds the inspection allowance.');
  return { revision, after: last, more, itemIds, page };
}
