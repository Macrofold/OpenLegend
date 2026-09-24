import type { WorldState } from './types.js';

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
  return `${prefix}-${world.nextId++}`;
}
export function addItem(
  world: WorldState,
  ownerId: string,
  definitionId: string,
  quantity: number,
): string {
  const existing = Object.values(world.items).find(
    (item) => item.ownerId === ownerId && item.definitionId === definitionId,
  );
  if (existing) {
    existing.quantity += quantity;
    return existing.id;
  }
  const id = nextId(world, 'item');
  world.items[id] = { id, ownerId, definitionId, quantity };
  return id;
}
