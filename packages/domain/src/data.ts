import type { ActorComponent, Entity, ItemDefinition, WorldState } from './types.js';

export const PLAYER_ID = 'player';
export const NPC_ID = 'ada';
export const NATIVE_ITEMS: Readonly<Record<string, ItemDefinition>> = {
  raw_fiber: {
    id: 'raw_fiber',
    version: 1,
    name: 'Reed fibers',
    description: 'Unprepared plant fibers stripped from reeds.',
    properties: ['fiber'],
  },
  prepared_fiber: {
    id: 'prepared_fiber',
    version: 1,
    name: 'Prepared fibers',
    description: 'Cleaned flexible fibers, suitable for weaving a pouch or fletching.',
    properties: ['fiber', 'flexible', 'pouch'],
  },
  cord: {
    id: 'cord',
    version: 1,
    name: 'Fiber cord',
    description: 'Twisted fibers suitable for fastening and transmitting tension.',
    properties: ['binding', 'flexible'],
  },
  wood: {
    id: 'wood',
    version: 1,
    name: 'Supple branch',
    description: 'A workable branch: rigid as a short shaft, flexible over its length.',
    properties: ['rigid', 'flexible', 'shaft', 'fuel'],
  },
  stone: {
    id: 'stone',
    version: 1,
    name: 'Small stone',
    description: 'A rounded stone that can serve as sling ammunition.',
    properties: ['rigid', 'projectile'],
    ammunition: { kind: 'stone', damageBonus: 0 },
  },
  bone: {
    id: 'bone',
    version: 1,
    name: 'Bone fragment',
    description: 'A workable hard fragment suitable for a simple point.',
    properties: ['rigid', 'point'],
  },
  stone_tool: {
    id: 'stone_tool',
    version: 1,
    name: 'Flaked cutting stone',
    description: 'A modest existing possession, used to prepare animal remains.',
    properties: ['rigid', 'point'],
  },
  berries: {
    id: 'berries',
    version: 1,
    name: 'Wild berries',
    description: 'Familiar edible berries.',
    properties: ['food'],
    nutrition: 18,
  },
  raw_meat: {
    id: 'raw_meat',
    version: 1,
    name: 'Raw meat',
    description: 'Fresh meat. Cook it at a lit campfire before eating.',
    properties: ['food'],
    cooked: false,
  },
  cooked_meat: {
    id: 'cooked_meat',
    version: 1,
    name: 'Cooked meat',
    description: 'Meat cooked through over a dependable fire.',
    properties: ['food'],
    nutrition: 38,
    cooked: true,
  },
};

export const NATIVE_PREPARATIONS = {
  fiber: {
    input: 'raw_fiber',
    inputQuantity: 2,
    output: 'prepared_fiber',
    outputQuantity: 2,
    workSeconds: 48,
  },
  cord: {
    input: 'prepared_fiber',
    inputQuantity: 2,
    output: 'cord',
    outputQuantity: 1,
    workSeconds: 60,
  },
} as const;

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
function actor(controller: 'player' | 'npc', fullness: number): ActorComponent {
  return {
    controller,
    health: 100,
    fullness,
    energy: 85,
    alive: true,
    incapacitated: false,
    bornAt: -24 * 365 * 86400,
    action: null,
    equippedItemId: null,
    goal:
      controller === 'npc'
        ? 'Stay fed, learn useful techniques, and get to know the newcomer.'
        : 'Make a life in the wild.',
    planGeneration: 0,
  };
}

/** A primitive camp and generic material families; there is deliberately no seeded sling or bow recipe. */
export function createWorld(seed = 73): WorldState {
  const normalizedSeed = Number.isInteger(seed) ? seed >>> 0 : 73;
  const world: WorldState = {
    schemaVersion: 1,
    id: `wilderness-${normalizedSeed}`,
    seed: normalizedSeed,
    rngState: normalizedSeed || 0x6d2b79f5,
    sequence: 0,
    simTime: 0,
    paused: false,
    profile: { id: 'grounded-wilderness', version: 1 },
    map: { width: 28, height: 24, tiles: [] },
    entities: {},
    items: {},
    itemDefinitions: structuredClone(NATIVE_ITEMS),
    recipes: {},
    memories: { player: [], ada: [] },
    knowledge: { player: [], ada: [] },
    events: [],
    commandReceipts: {},
    declarationReceipts: {},
    nextId: 1,
  };
  for (let z = 0; z < world.map.height; z++) {
    const row: ('grass' | 'sand' | 'water' | 'rock')[] = [];
    for (let x = 0; x < world.map.width; x++) {
      const water = x < 3 && !(z >= 11 && z <= 12);
      row.push(water ? 'water' : x < 4 ? 'sand' : 'grass');
    }
    world.map.tiles.push(row);
  }
  for (const [x, z] of [
    [17, 6],
    [17, 7],
    [17, 8],
    [18, 8],
    [7, 18],
    [8, 18],
    [21, 17],
    [22, 17],
  ]) {
    world.map.tiles[z!]![x!] = 'rock';
  }
  const entities: Entity[] = [
    {
      id: PLAYER_ID,
      name: 'You',
      kind: 'player',
      position: { x: 11, z: 13 },
      actor: actor('player', 76),
    },
    { id: NPC_ID, name: 'Ada', kind: 'npc', position: { x: 13, z: 12 }, actor: actor('npc', 66) },
    {
      id: 'campfire',
      name: 'Banked campfire',
      kind: 'campfire',
      position: { x: 11, z: 10 },
      heat: { lit: true, fuelSeconds: 172800 },
    },
    {
      id: 'reeds',
      name: 'River reeds',
      kind: 'resource',
      position: { x: 5, z: 11 },
      resource: { definitionId: 'raw_fiber', quantity: 48, workSeconds: 36 },
    },
    {
      id: 'reeds-east',
      name: 'Dry grass fibers',
      kind: 'resource',
      position: { x: 19, z: 12 },
      resource: { definitionId: 'raw_fiber', quantity: 30, workSeconds: 36 },
    },
    {
      id: 'branches',
      name: 'Fallen branches',
      kind: 'resource',
      position: { x: 8, z: 8 },
      resource: { definitionId: 'wood', quantity: 36, workSeconds: 42 },
    },
    {
      id: 'stones',
      name: 'River stones',
      kind: 'resource',
      position: { x: 5, z: 15 },
      resource: { definitionId: 'stone', quantity: 60, workSeconds: 24 },
    },
    {
      id: 'berries-west',
      name: 'Berry bush',
      kind: 'resource',
      position: { x: 8, z: 13 },
      resource: { definitionId: 'berries', quantity: 36, workSeconds: 30 },
    },
    {
      id: 'berries-east',
      name: 'Berry thicket',
      kind: 'resource',
      position: { x: 19, z: 15 },
      resource: { definitionId: 'berries', quantity: 30, workSeconds: 30 },
    },
    {
      id: 'hare-1',
      name: 'Hare',
      kind: 'animal',
      position: { x: 16, z: 13 },
      animal: {
        species: 'hare',
        health: 18,
        alive: true,
        fleeFrom: null,
        fleeSeconds: 0,
        wanderSeconds: 150,
      },
    },
    {
      id: 'hare-2',
      name: 'Hare',
      kind: 'animal',
      position: { x: 21, z: 11 },
      animal: {
        species: 'hare',
        health: 18,
        alive: true,
        fleeFrom: null,
        fleeSeconds: 0,
        wanderSeconds: 100,
      },
    },
    {
      id: 'deer-1',
      name: 'Deer',
      kind: 'animal',
      position: { x: 21, z: 19 },
      animal: {
        species: 'deer',
        health: 36,
        alive: true,
        fleeFrom: null,
        fleeSeconds: 0,
        wanderSeconds: 200,
      },
    },
  ];
  for (const entity of entities) world.entities[entity.id] = entity;
  for (const id of [PLAYER_ID, NPC_ID]) {
    addItem(world, id, 'stone_tool', 1);
    addItem(world, id, 'berries', 3);
    addItem(world, id, 'prepared_fiber', id === PLAYER_ID ? 4 : 2);
    addItem(world, id, 'cord', id === PLAYER_ID ? 3 : 1);
    addItem(world, id, 'wood', 2);
    addItem(world, id, 'stone', 6);
  }
  world.memories.ada!.push({
    id: nextId(world, 'memory'),
    actorId: 'ada',
    kind: 'belief',
    source: 'observed',
    summary:
      'I arrived here with basic gathering, cord-making, cooking and survival knowledge. I have no village, only a small camp and a few possessions.',
    at: 0,
    entityIds: ['campfire'],
    importance: 8,
  });
  return world;
}
