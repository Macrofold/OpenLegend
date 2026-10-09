import { accessiblePossession, canAccessContainer, possessionItems } from './object-access.js';
import { acquireExposure } from './events.js';
import { cloneValue } from './draft.js';
import { isEquipped } from './equipment.js';
import { itemFor, objectAncestors } from './objects.js';
import { contentsQuery } from './queries.js';
import { worldPosition } from './spatial-state.js';
import { observerName } from './worlds/base/knowledge.js';
import type { ItemDefinition, ItemInstance, WorldState, WorldEvent } from './types.js';

export interface InventoryInspection {
  revision: number;
  /** Exact actor/access/ancestor/placement scope, never authority supplied by a model. */
  scope: string;
  /** Absent selects the actor's accessible possessions, including admitted nested bags. */
  containerId?: string;
  after: string;
  more: boolean;
  itemIds: string[];
}

const descriptions = new WeakMap<ItemDefinition, string>();
/** Definition facts are immutable across a committed snapshot; live lot facts are never cached. */
export function describePossession(
  item: ItemInstance,
  definition: ItemDefinition,
  equipped: boolean,
  location = 'accessible possession',
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
  return `${item.quantity} × ${definition.name}${equipped ? ', equipped' : `, ${location}`}. ${facts}`;
}

/** Rechecking access precedes reading any contents or private packing facts. Movement
 * revisions fence even leaving and returning to the same point. Restore also clears the
 * actor's inspection under the server's timeline owner.
 * docs/projects/parallel-batch-01-playable-week-tech-design.md#discovery-and-character-context */
export function inventoryInspectionScope(world: WorldState, actorId: string, containerId?: string) {
  const actor = world.entities[actorId];
  if (!actor?.actor) throw new Error('Actor unavailable.');
  const selected = containerId ?? actorId;
  if (!canAccessContainer(world, actorId, selected))
    throw new Error('This container is no longer accessible. Inspect again after reaching it.');
  return JSON.stringify([
    world.id,
    actorId,
    containerId ? actor.placement?.revision : null,
    containerId ? worldPosition(actor) : null,
    containerId ?? null,
    objectAncestors(world, selected).map((entity) => [
      entity.id,
      entity.inventoryRevision ?? 0,
      containerId ? entity.placement?.revision : null,
      entity.item?.revision ?? 0,
      entity.container?.subtreeRevision ?? 0,
      entity.container?.definitionPin ?? null,
      entity.container?.access ? entity.container.access.actors.includes(actorId) : null,
    ]),
  ]);
}

/** A stale page supplies neither transfer choices nor learned-method object bindings. */
export function currentInventoryInspection(world: WorldState, actorId: string) {
  const prior = world.entities[actorId]?.actor?.inventoryInspection;
  if (!prior) return undefined;
  try {
    return prior.revision ===
      (world.entities[prior.containerId ?? actorId]?.inventoryRevision ?? 0) &&
      prior.scope === inventoryInspectionScope(world, actorId, prior.containerId)
      ? prior
      : undefined;
  } catch {
    return undefined;
  }
}

/** Prepared permitted facts shared by decision options and finite-method rebinding.
 * This reads only the exact page the actor chose; `more` never means complete stock. */
export function inspectedContainer(world: WorldState, actorId: string) {
  const inspection = currentInventoryInspection(world, actorId);
  if (!inspection?.containerId) return undefined;
  const container = world.entities[inspection.containerId]!;
  const definition = container.container
    ? world.itemDefinitions[container.container.definitionPin.id]
    : undefined;
  return {
    id: container.id,
    ...observerName(world, actorId, container.id),
    revision: container.inventoryRevision ?? 0,
    placementRevision: container.placement?.revision ?? 0,
    ...(container.container
      ? {
          definitionPin: container.container.definitionPin,
          load: container.container.load,
          capacity: definition?.container?.capacity,
        }
      : {}),
    inspection,
    items: inspection.itemIds.flatMap((id) => {
      const item = itemFor(world, id);
      if (item?.ownerId !== container.id) return [];
      // Opening this container does not inspect a nested bag's private contents/load.
      const { container: nestedContents, ...permittedItem } = item;
      return [permittedItem];
    }),
  };
}

/** Explicit private read, not an automatic inventory-change trigger. Cursor is bound to
 * the actor's custody revision; each page respects the existing 16-possession allowance.
 * docs/projects/embodied-survival-tech-design.md#required-versus-selected-information */
export function inspectPossessions(
  world: WorldState,
  actorId: string,
  after = '',
  expectedRevision?: number,
  containerId?: string,
  expectedScope?: string,
  selectedItemId?: string,
) {
  const entity = world.entities[actorId];
  if (!entity?.actor) throw new Error('Actor unavailable.');
  const selected = world.entities[containerId ?? actorId]!;
  const scope = inventoryInspectionScope(world, actorId, containerId);
  const revision = selected.inventoryRevision ?? 0;
  if (selectedItemId) {
    const item = itemFor(world, selectedItemId);
    if (
      !item ||
      (containerId
        ? item.ownerId !== containerId
        : !accessiblePossession(world, actorId, item.id)) ||
      (expectedRevision !== undefined && expectedRevision !== revision)
    )
      throw new Error(
        'This item or its access changed. Refresh the contents before inspecting it.',
      );
    const description = describePossession(
      item,
      world.itemDefinitions[item.definitionId]!,
      isEquipped(world, actorId, item.id),
      containerId ? 'in the selected accessible container' : 'accessible possession',
    );
    if (new TextEncoder().encode(description).length > 8000)
      throw new Error('This possession description exceeds the inspection allowance.');
    return {
      revision,
      scope,
      ...(containerId ? { containerId } : {}),
      after: item.id,
      more: false,
      itemIds: [item.id],
      page: [description],
    };
  }
  const prior = entity.actor.inventoryInspection;
  if (
    after &&
    (expectedRevision !== revision ||
      prior?.revision !== revision ||
      prior.scope !== scope ||
      expectedScope !== scope ||
      prior.containerId !== containerId ||
      prior.after !== after ||
      !prior.more)
  )
    throw new Error(
      'Contents, position, access or continuation changed. Inspect from the beginning.',
    );
  // The indexed query includes one lookahead and is explicitly complete or unavailable;
  // a failed bounded read cannot masquerade as an empty cache.
  const contents = containerId ? contentsQuery(world, containerId, scope, after, 17) : undefined;
  if (contents && contents.status !== 'complete')
    throw new Error('Contents are temporarily unavailable. Inspect again before continuing.');
  const items =
    contents?.status === 'complete'
      ? contents.values.flatMap((id) => {
          const item = itemFor(world, id);
          return item ? [item] : [];
        })
      : [...possessionItems(world, actorId)].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const page: string[] = [];
  const itemIds: string[] = [];
  let bytes = 0,
    last = after,
    more = false;
  for (const item of items) {
    if (!containerId && item.id.localeCompare(after, 'en') <= 0) continue;
    const text = describePossession(
      item,
      world.itemDefinitions[item.definitionId]!,
      isEquipped(world, actorId, item.id),
      containerId ? 'in the selected accessible container' : 'accessible possession',
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
  return {
    revision,
    scope,
    ...(containerId ? { containerId } : {}),
    after: last,
    more,
    itemIds,
    page,
  };
}

/** Only the exact admitted inspection page becomes evidence. Opening the outer bag
 * alone never traverses or introduces its contents. */
export function recordInspectedItems(
  world: WorldState,
  events: WorldEvent[],
  actorId: string,
  inspection: Pick<InventoryInspection, 'itemIds'> & { page: string[] },
): void {
  const observer = world.entities[actorId]!;
  for (const [index, id] of inspection.itemIds.entries()) {
    const item = itemFor(world, id)!;
    const definition = world.itemDefinitions[item.definitionId]!;
    acquireExposure(world, events, observer, id, {
      kind: 'inventory-item',
      id,
      definition: { id: definition.id, version: definition.version },
      label: definition.name,
      description: inspection.page[index]!,
      introductionKey:
        item.individuality === 'individual'
          ? `inventory-item:${id}`
          : `inventory-definition:${definition.id}`,
      ...(definition.mechanismFields
        ? { mechanismFields: cloneValue(definition.mechanismFields) }
        : {}),
    });
  }
}
