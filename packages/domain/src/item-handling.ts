import { itemsForOwner, itemFor, moveLot, validateObjects, declareObjectOwner } from './objects.js';
import { WorkBudgetError } from './work-budget.js';
export { itemsForOwner } from './objects.js';
import { worldPlacement } from './spatial-state.js';
import { rootMembershipChanged, worldRootEntities } from './entity-index.js';
import { worldSupport, worldPosition } from './spatial-state.js';
import {
  BODY_PROFILES,
  canStand,
  type SurfacePoint,
  type BodyProfileId,
} from '@open-legend/spatial';
import { addItem, nextId } from './data.js';
import { availableResource, itemDefinitionPin, itemHasReservations } from './resource-claims.js';
import { draftWorld, finishWorld, changedEntityIds } from './draft.js';
import { canonicalJson, emit, finish, outcome } from './events.js';
import { getOwn, isSafeRecordId } from './records.js';
import { capabilityBlocked } from './status-capabilities.js';
import { groundedSpatial, spatialMap } from './spatial-state.js';
import type { Entity, ItemInstance, Transition, WorldEvent, WorldState } from './types.js';

export interface ItemHandlingPolicy {
  generatedPackingLoad?: number;
  packingLoads?: Array<{ definition: import('./world-modules.js').DefinitionPin; load: number }>;
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
export function portableItems(world: WorldState, ownerId: string): ItemInstance[] {
  return itemsForOwner(world, ownerId).filter(
    (item) => world.itemDefinitions[item.definitionId]?.portable === true,
  );
}
function pileAt(world: WorldState, position: SurfacePoint): Entity {
  // Merge only coincident positions on the same support: nearby floors never share custody.
  // docs/worlds/base/items.md#ground-piles
  const existing = worldRootEntities(world).find(
    (e) =>
      e.kind === 'item-pile' &&
      worldSupport(e) === position.surfaceId &&
      Math.hypot(
        worldPosition(e).x - position.x,
        worldPosition(e).y - position.y,
        worldPosition(e).z - position.z,
      ) < 0.01,
  );
  if (existing) return existing;
  const id = nextId(world, 'pile');
  const pile: Entity = {
    id,
    name: 'Items on the ground',
    kind: 'item-pile',
    placement: worldPlacement({ x: position.x, y: position.y, z: position.z }, position.surfaceId),
    spatial: groundedSpatial('object'),
  };
  world.entities[id] = pile;
  rootMembershipChanged(world, id);
  return pile;
}
/** Compound physical work is planned in an isolated draft before its changed fields are
 * installed. Existing actor/action references stay attached to the caller's draft. */
function atomicObjects<T>(world: WorldState, operation: (candidate: WorldState) => T): T {
  const candidate = draftWorld(world),
    result = operation(candidate),
    committed = finishWorld(candidate);
  for (const id of changedEntityIds(committed) ?? []) {
    const entity = committed.entities[id];
    const current = world.entities[id];
    const wasRoot = current?.placement?.mode === 'world' && !current.retirement;
    const isRoot = entity?.placement?.mode === 'world' && !entity.retirement;
    if (!entity) delete world.entities[id];
    else if (current?.actor && entity.actor) {
      if (current.inventoryRevision !== entity.inventoryRevision)
        current.inventoryRevision = entity.inventoryRevision;
      if (current.actor.equippedItemId !== entity.actor.equippedItemId)
        current.actor.equippedItemId = entity.actor.equippedItemId;
    } else if (current !== entity) world.entities[id] = entity;
    if (wasRoot !== isRoot) rootMembershipChanged(world, id);
  }
  world.objectState = committed.objectState;
  world.objectLineage = committed.objectLineage;
  world.nextId = committed.nextId;
  return result;
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
  if (items.some((item) => itemHasReservations(world, item.id)))
    return 'Some selected items are committed to ongoing work.';
  const description = items
    .map((i) => `${i.quantity} ${world.itemDefinitions[i.definitionId]!.name}`)
    .join(', ');
  try {
    atomicObjects(world, (candidate) => {
      for (const item of items) moveLot(candidate, item.id, actor.id, item.quantity, 'pickup');
    });
  } catch (error) {
    if (error instanceof WorkBudgetError) throw error;
    return error instanceof Error ? error.message : 'Items are unavailable.';
  }
  emit(world, events, 'items-picked-up', `${actor.name} picked up ${description}.`, actor, pile.id);
  if (!itemsForOwner(world, pileId).length) {
    delete world.entities[pileId];
    rootMembershipChanged(world, pileId);
  }
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
  const item = itemFor(world, itemId);
  if (
    !canHandleItems(world, actor) ||
    !item ||
    item.ownerId !== actor.id ||
    world.itemDefinitions[item.definitionId]?.portable !== true
  )
    return 'Choose a portable item in this inventory.';
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > item.quantity)
    return 'Choose an available whole quantity.';
  if (
    quantity >
    (availableResource(world, {
      kind: 'item',
      itemId,
      definition: itemDefinitionPin(world.itemDefinitions[item.definitionId]!),
    }) ?? 0)
  )
    return 'That quantity is committed to ongoing work.';
  const surfaceId = worldSupport(actor);
  if (
    !surfaceId ||
    !canStand(spatialMap(world), { ...worldPosition(actor), surfaceId }, BODY_PROFILES.object)
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
  const item = itemFor(world, itemId)!;
  const surfaceId = worldSupport(actor)!;
  const pile = pileAt(world, { ...worldPosition(actor), surfaceId });
  try {
    atomicObjects(world, (candidate) => moveLot(candidate, item.id, pile.id, quantity, 'drop'));
  } catch (error) {
    if (error instanceof WorkBudgetError) throw error;
    return error instanceof Error ? error.message : 'Item transfer unavailable.';
  }
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
export interface OwnershipRequest {
  id: string;
  itemId: string;
  expectedRevision: number;
  holderId: string | null;
  disclosure: 'custodian' | 'public';
}
export function declareOwnership(original: WorldState, request: OwnershipRequest): Transition {
  const reject = (message: string): Transition => ({
    world: original,
    events: [],
    outcome: outcome(false, 'ownership', message),
  });
  if (
    !isSafeRecordId(request.id) ||
    !isSafeRecordId(request.itemId) ||
    !Number.isSafeInteger(request.expectedRevision) ||
    request.expectedRevision < 0
  )
    return reject('Invalid ownership declaration.');
  const digest = canonicalJson(request),
    prior = getOwn(original.commandReceipts, request.id);
  if (prior)
    return prior.digest === digest
      ? { world: original, events: [], outcome: prior.outcome }
      : reject('Request identity was already used.');
  const world = draftWorld(original);
  try {
    declareObjectOwner(
      world,
      request.itemId,
      request.expectedRevision,
      request.holderId,
      request.disclosure,
      request.id,
    );
  } catch (error) {
    if (error instanceof WorkBudgetError) throw error;
    return reject(error instanceof Error ? error.message : 'Ownership unavailable.');
  }
  const result = outcome(
    true,
    'ownership-declared',
    'Declared ownership updated; physical custody is unchanged.',
  );
  world.commandReceipts[request.id] = { digest, outcome: result };
  return finish(world, [], result);
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
  let itemId: string;
  try {
    itemId = addItem(world, owner.id, request.definitionId, request.quantity);
  } catch (error) {
    if (error instanceof WorkBudgetError) throw error;
    return reject(error instanceof Error ? error.message : 'Item creation unavailable.');
  }
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
  for (const definition of Object.values(world.itemDefinitions)) {
    if (definition.portable !== undefined && typeof definition.portable !== 'boolean')
      throw new Error('Invalid portable item property.');
    if (
      definition.packingLoad !== undefined &&
      (!Number.isSafeInteger(definition.packingLoad) || definition.packingLoad < 0)
    )
      throw new Error('Invalid authored packing load.');
    if (
      definition.container &&
      (!Number.isSafeInteger(definition.container.capacity) ||
        definition.container.capacity < 1 ||
        !Number.isSafeInteger(definition.container.maximumDepth) ||
        definition.container.maximumDepth < 1 ||
        definition.container.maximumDepth > 16 ||
        definition.packingLoad === undefined)
    )
      throw new Error('Invalid finite container capability.');
  }
  for (const binding of policy.packingLoads ?? [])
    if (
      !Number.isSafeInteger(binding.load) ||
      binding.load < 0 ||
      !world.itemDefinitions[binding.definition.id]
    )
      throw new Error('Invalid legacy packing-load binding.');
  if (
    policy.generatedPackingLoad !== undefined &&
    (!Number.isSafeInteger(policy.generatedPackingLoad) || policy.generatedPackingLoad < 0)
  )
    throw new Error('Invalid generated-item packing policy.');
  validateObjects(world);
}
