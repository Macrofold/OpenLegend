import { isDraft } from 'immer';
import {
  BODY_PROFILES,
  canStand,
  type SurfacePoint,
  type BodyProfileId,
} from '@open-legend/spatial';
import { addItem, nextId } from './data.js';
import { draftWorld } from './draft.js';
import { canonicalJson, emit, finish, outcome } from './events.js';
import { getOwn, isSafeRecordId } from './records.js';
import { capabilityBlocked } from './status-capabilities.js';
import { groundedSpatial, spatialMap } from './spatial-state.js';
import type { Entity, ItemInstance, Transition, WorldEvent, WorldState } from './types.js';

export interface ItemHandlingPolicy {
  enabled: boolean;
  defaultPortable: boolean;
  reach: number;
  pickupSeconds: number;
  actorBodyProfiles: BodyProfileId[];
}
export function canHandleItems(world: WorldState, actor: Entity): boolean {
  return (
    world.itemHandling.enabled &&
    world.itemHandling.actorBodyProfiles.includes(actor.spatial.bodyProfileId)
  );
}
const custodyIndexes = new WeakMap<
  WorldState['items'],
  ReadonlyMap<string, readonly ItemInstance[]>
>();
/** Index only immutable snapshots. Drafts and mutable builders must observe every transfer.
 * docs/architecture.md#bundled-world-and-item-custody
 */
export function itemsForOwner(world: WorldState, ownerId: string): readonly ItemInstance[] {
  const items = world.items;
  if (isDraft(items) || !Object.isFrozen(items))
    return Object.values(items).filter((item) => item.ownerId === ownerId);
  let index = custodyIndexes.get(items);
  if (!index) {
    const byOwner = new Map<string, ItemInstance[]>();
    for (const item of Object.values(items)) {
      const owned = byOwner.get(item.ownerId);
      if (owned) owned.push(item);
      else byOwner.set(item.ownerId, [item]);
    }
    index = byOwner;
    custodyIndexes.set(items, index);
  }
  return index.get(ownerId) ?? [];
}
export function portableItems(world: WorldState, ownerId: string): ItemInstance[] {
  return itemsForOwner(world, ownerId).filter(
    (item) => world.itemDefinitions[item.definitionId]?.portable === true,
  );
}
function pileAt(world: WorldState, position: SurfacePoint): Entity {
  // Merge only coincident positions on the same support: nearby floors never share custody.
  // docs/worlds/base/items.md#ground-piles
  const existing = Object.values(world.entities).find(
    (e) =>
      e.kind === 'item-pile' &&
      e.spatial.supportSurfaceId === position.surfaceId &&
      Math.hypot(e.position.x - position.x, e.position.y - position.y, e.position.z - position.z) <
        0.01,
  );
  if (existing) return existing;
  const id = nextId(world, 'pile');
  return (world.entities[id] = {
    id,
    name: 'Items on the ground',
    kind: 'item-pile',
    position: { x: position.x, y: position.y, z: position.z },
    spatial: groundedSpatial('object', position.surfaceId),
  });
}
/** Quantity and custody mutate together; callers supply an already admitted domain draft. */
function transfer(
  world: WorldState,
  item: ItemInstance,
  destination: string,
  quantity: number,
  match: ItemInstance | undefined,
): void {
  if (match && !Number.isSafeInteger(match.quantity + quantity))
    throw new Error('Item quantity exceeds the safe integer range.');
  if (world.entities[item.ownerId]?.actor?.equippedItemId === item.id && quantity === item.quantity)
    world.entities[item.ownerId]!.actor!.equippedItemId = null;
  if (!match && quantity === item.quantity) item.ownerId = destination;
  else {
    if (match) match.quantity += quantity;
    else {
      const id = nextId(world, 'item');
      world.items[id] = { id, ownerId: destination, definitionId: item.definitionId, quantity };
    }
    item.quantity -= quantity;
    if (item.quantity === 0) delete world.items[item.id];
  }
}
export function pickUpItems(
  world: WorldState,
  actor: Entity,
  pileId: string,
  itemId: string | undefined,
  events: WorldEvent[],
): string | null {
  const pile = getOwn(world.entities, pileId);
  if (pile?.kind !== 'item-pile' || !canHandleItems(world, actor))
    return 'The pile or item-handling capability is unavailable.';
  const items = portableItems(world, pileId).filter((i) => !itemId || i.id === itemId);
  if (!items.length) return 'Those portable items are no longer in the pile.';
  const heldByDefinition = new Map(
    Object.values(world.items)
      .filter((i) => i.ownerId === actor.id)
      .map((i) => [i.definitionId, i]),
  );
  const totals = new Map([...heldByDefinition].map(([id, item]) => [id, item.quantity]));
  // Check the whole selection before transferring any of it (including Pick Up All).
  for (const item of items) {
    const total = (totals.get(item.definitionId) ?? 0) + item.quantity;
    totals.set(item.definitionId, total);
    if (!Number.isSafeInteger(total))
      return 'The inventory quantity would exceed the supported range.';
  }
  const description = items
    .map((i) => `${i.quantity} ${world.itemDefinitions[i.definitionId]!.name}`)
    .join(', ');
  for (const item of items) {
    const held = heldByDefinition.get(item.definitionId);
    transfer(world, item, actor.id, item.quantity, held);
    if (!held) heldByDefinition.set(item.definitionId, item);
  }
  emit(world, events, 'items-picked-up', `${actor.name} picked up ${description}.`, actor, pile.id);
  if (!Object.values(world.items).some((i) => i.ownerId === pileId)) delete world.entities[pileId];
  return null;
}
/** Shared read-only eligibility keeps inventory menus cheap without simulating a transfer.
 * docs/worlds/base/items.md#pickup-and-drop
 */
export function dropItemReason(
  world: WorldState,
  actor: Entity,
  itemId: string,
  quantity: number,
): string | null {
  if (world.paused) return 'Resume the world to act.';
  if (
    !actor.actor?.alive ||
    actor.actor.incapacitated ||
    capabilityBlocked(world, actor, 'actions')
  )
    return 'This actor cannot act in its current state.';
  const item = getOwn(world.items, itemId);
  if (
    !canHandleItems(world, actor) ||
    !item ||
    item.ownerId !== actor.id ||
    world.itemDefinitions[item.definitionId]?.portable !== true
  )
    return 'Choose a portable item in this inventory.';
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > item.quantity)
    return 'Choose an available whole quantity.';
  const surfaceId = actor.spatial.supportSurfaceId;
  if (
    !surfaceId ||
    !canStand(spatialMap(world), { ...actor.position, surfaceId }, BODY_PROFILES.object)
  )
    return 'Dropping requires space for a pile on a supported surface.';
  if (actor.actor.action) return 'Stop current work before dropping items.';
  return null;
}
export function dropItems(
  world: WorldState,
  actor: Entity,
  itemId: string,
  quantity: number,
  events: WorldEvent[],
): string | null {
  const reason = dropItemReason(world, actor, itemId, quantity);
  if (reason) return reason;
  const item = world.items[itemId]!;
  const surfaceId = actor.spatial.supportSurfaceId!;
  const pile = pileAt(world, { ...actor.position, surfaceId });
  const held = Object.values(world.items).find(
    (i) => i.ownerId === pile.id && i.definitionId === item.definitionId,
  );
  if (held && !Number.isSafeInteger(held.quantity + quantity))
    return 'The pile quantity would exceed the supported range.';
  transfer(world, item, pile.id, quantity, held);
  emit(
    world,
    events,
    'items-dropped',
    `${actor.name} dropped ${quantity} ${world.itemDefinitions[item.definitionId]!.name}.`,
    actor,
    pile.id,
  );
  return null;
}
export interface GodItemRequest {
  id: string;
  definitionId: string;
  quantity: number;
  destination: { actorId: string } | { position: SurfacePoint };
}
export function createGodItem(original: WorldState, request: GodItemRequest): Transition {
  const reject = (message: string): Transition => ({
    world: original,
    events: [],
    outcome: outcome(false, 'invalid-item', message),
  });
  if (
    !isSafeRecordId(request.id) ||
    !getOwn(original.itemDefinitions, request.definitionId) ||
    !Number.isSafeInteger(request.quantity) ||
    request.quantity < 1
  )
    return reject('Choose a known item type and a positive whole quantity.');
  const digest = canonicalJson(request),
    previous = getOwn(original.commandReceipts, request.id);
  if (previous)
    return previous.digest === digest
      ? { world: original, events: [], outcome: previous.outcome }
      : reject('Request identity was already used.');
  const destination = request.destination;
  if (
    'actorId' in destination
      ? !getOwn(original.entities, destination.actorId)?.actor
      : !canStand(spatialMap(original), destination.position, BODY_PROFILES.object)
  )
    return reject('Choose an existing actor or a supported ground position.');
  const world = draftWorld(original);
  const owner =
    'actorId' in destination
      ? world.entities[destination.actorId]!
      : pileAt(world, destination.position);
  const held = Object.values(world.items).find(
    (i) => i.ownerId === owner.id && i.definitionId === request.definitionId,
  );
  if (held && !Number.isSafeInteger(held.quantity + request.quantity))
    return reject('The quantity would exceed the supported range.');
  const itemId = addItem(world, owner.id, request.definitionId, request.quantity);
  const events: WorldEvent[] = [];
  const message = `God mode added ${request.quantity} ${world.itemDefinitions[request.definitionId]!.name} to ${owner.name}.`;
  emit(world, events, 'god-item-created', message, owner);
  const result = { ...outcome(true, 'item-created', message), itemId };
  world.commandReceipts[request.id] = { digest, outcome: result };
  return finish(world, events, result);
}
export function validateItemHandling(world: WorldState): void {
  const policy = world.itemHandling;
  if (
    !policy ||
    typeof policy.defaultPortable !== 'boolean' ||
    typeof policy.enabled !== 'boolean' ||
    !Number.isFinite(policy.reach) ||
    policy.reach <= 0 ||
    policy.reach > 10 ||
    !Number.isFinite(policy.pickupSeconds) ||
    policy.pickupSeconds < 0 ||
    policy.pickupSeconds > 3600 ||
    !Array.isArray(policy.actorBodyProfiles) ||
    policy.actorBodyProfiles.some((id) => !Object.hasOwn(BODY_PROFILES, id))
  )
    throw new Error('Invalid item-handling policy.');
  for (const definition of Object.values(world.itemDefinitions))
    if (definition.portable !== undefined && typeof definition.portable !== 'boolean')
      throw new Error('Invalid portable item property.');
  for (const item of Object.values(world.items))
    if (
      !getOwn(world.itemDefinitions, item.definitionId) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      !(
        getOwn(world.entities, item.ownerId)?.actor ||
        getOwn(world.entities, item.ownerId)?.kind === 'item-pile'
      )
    )
      throw new Error('Invalid item custody or quantity.');
}
