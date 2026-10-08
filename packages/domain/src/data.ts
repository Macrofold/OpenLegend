import type { WorldState } from './types.js';
import {
  createItemLot,
  directChildIds,
  itemFor,
  setItemQuantity,
  canReceiveSource,
} from './objects.js';

// Stable composition exports while the bundled world moves toward an external package.
// docs/worlds/base/README.md#code-boundary
export {
  createWorld,
  createActor,
  initializeActorTraits,
  PLAYER_ID,
  NPC_ID,
  TRAIT_BANK,
  NATIVE_ITEMS,
  NATIVE_PREPARATIONS,
} from './worlds/base/world.js';

export function nextRandom(world: WorldState): number {
  // State, including every random draw, is part of the committed snapshot.
  let x = world.rngState | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  world.rngState = x >>> 0;
  return world.rngState / 4294967296;
}
export function nextId(world: WorldState, prefix: string): string {
  if (
    !Number.isSafeInteger(world.nextId) ||
    world.nextId < 0 ||
    world.nextId >= Number.MAX_SAFE_INTEGER
  )
    throw new Error('World identity sequence is exhausted or invalid.');
  return `${prefix}-${world.nextId++}`;
}
export function addItem(
  world: WorldState,
  ownerId: string,
  definitionId: string,
  quantity: number,
): string {
  if (
    !Number.isSafeInteger(quantity) ||
    quantity <= 0 ||
    !Object.hasOwn(world.itemDefinitions, definitionId)
  )
    throw new Error('Invalid item source quantity or definition.');
  const definition = world.itemDefinitions[definitionId]!;
  if (definition.container && quantity !== 1) throw new Error('Create one bag at a time.');
  const id = sourceItemId(world, ownerId, definitionId, quantity);
  if (id) {
    const existing = itemFor(world, id)!;
    setItemQuantity(world, id, existing.quantity + quantity, 'native-source');
    return id;
  }
  return createItemLot(world, ownerId, definitionId, quantity);
}
/** Read the physical source's stacking choice; a full integer lot needs a
 * separate real lot rather than an overflowing combined quantity. */
export function sourceItemId(
  world: WorldState,
  ownerId: string,
  definitionId: string,
  quantity: number,
) {
  for (const id of directChildIds(world, ownerId))
    if (
      canReceiveSource(world, id, definitionId) &&
      itemFor(world, id)!.quantity <= Number.MAX_SAFE_INTEGER - quantity
    )
      return id;
}
