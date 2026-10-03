import { worldPlacement } from '@open-legend/domain';
import { worldPosition } from '@open-legend/domain';
import {
  createWorld,
  freezeWorld,
  isWalkable,
  spawnWorldEntity,
  type ItemDefinition,
  type Position,
  type WorldState,
} from '../../packages/domain/src/index.js';

export interface Scenario {
  input?: string;
  seed: number;
  people: number;
  animals: number;
  /** Synthetic flight bodies beyond the starter bird, in an isolated fixture. */
  birds: number;
  mapSize?: number;
  /** Duplicate added content this far along X/Z, outside the near sensing envelope. */
  groupDistance: number;
  layout: 'crowded' | 'scattered';
  steps: number;
  warmup: number;
  warmupSeconds?: number;
  durationSeconds?: number;
  maxIntervals: number;
  /** Requested game time per diagnostic call, not a mandatory tick. */
  intervalSeconds: number;
  speed: number;
  timeoutSeconds: number;
  objects: Array<{
    count: number;
    definition: ItemDefinition;
    quantity: number;
    workSeconds: number;
  }>;
}
const properties = new Set([
  'fiber',
  'binding',
  'flexible',
  'rigid',
  'shaft',
  'pouch',
  'point',
  'projectile',
  'food',
  'fuel',
]);
function integer(value: unknown, fallback: number, min: number, max: number): number {
  const n = value ?? fallback;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max)
    throw new Error(`Expected an integer between ${min} and ${max}.`);
  return n;
}
export function parseScenario(value: unknown): Scenario {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected a scenario object.');
  const v = value as Record<string, unknown>;
  for (const key of Object.keys(v))
    if (
      ![
        'input',
        'seed',
        'people',
        'animals',
        'birds',
        'mapSize',
        'groupDistance',
        'layout',
        'steps',
        'warmup',
        'warmupSeconds',
        'durationSeconds',
        'maxIntervals',
        'intervalSeconds',
        'speed',
        'timeoutSeconds',
        'objects',
      ].includes(key)
    )
      throw new Error(`Unknown scenario field: ${key}`);
  if (v.input !== undefined && typeof v.input !== 'string')
    throw new Error('input must be a file path.');
  if (v.layout !== undefined && !['crowded', 'scattered'].includes(String(v.layout)))
    throw new Error('Unknown layout.');
  if (v.objects !== undefined && !Array.isArray(v.objects))
    throw new Error('objects must be an array.');
  const objects = ((v.objects ?? []) as Record<string, unknown>[]).map((group, index) => {
    if (!group || typeof group !== 'object') throw new Error('Invalid object group.');
    for (const key of Object.keys(group))
      if (!['count', 'name', 'properties', 'nutrition', 'quantity', 'workSeconds'].includes(key))
        throw new Error(`Unknown object field: ${key}`);
    if (typeof group.name !== 'string' || !group.name.trim() || group.name.length > 80)
      throw new Error('Object name must contain 1–80 characters.');
    const tags = group.properties ?? ['rigid'];
    if (!Array.isArray(tags) || tags.some((p) => typeof p !== 'string' || !properties.has(p)))
      throw new Error('Unsupported material property.');
    return {
      count: integer(group.count, 1, 1, 10000),
      quantity: integer(group.quantity, 1, 1, 10000),
      workSeconds: integer(group.workSeconds, 1, 1, 86400),
      definition: {
        id: `profile-material-${index}`,
        version: 1,
        name: group.name,
        description: 'Synthetic profiling fixture; not an authored game asset.',
        properties: tags as ItemDefinition['properties'],
        ...(group.nutrition === undefined
          ? {}
          : { nutrition: integer(group.nutrition, 0, 0, 100) }),
      } satisfies ItemDefinition,
    };
  });
  const scenario: Scenario = {
    input: v.input as string | undefined,
    seed: integer(v.seed, 73, 1, 0x7fffffff),
    people: integer(v.people, 0, 0, 1000),
    animals: integer(v.animals, 0, 0, 10000),
    birds: integer(v.birds, 0, 0, 1000),
    ...(v.mapSize === undefined ? {} : { mapSize: integer(v.mapSize, 96, 28, 256) }),
    groupDistance: integer(v.groupDistance, 0, 0, 192),
    layout: (v.layout ?? 'scattered') as Scenario['layout'],
    steps: integer(v.steps, 180, 1, 100000),
    warmup: integer(v.warmup, 30, 0, 10000),
    ...(v.warmupSeconds === undefined
      ? {}
      : { warmupSeconds: integer(v.warmupSeconds, 60, 0, 86400) }),
    ...(v.durationSeconds === undefined
      ? {}
      : { durationSeconds: integer(v.durationSeconds, 300, 1, 86400) }),
    maxIntervals: integer(v.maxIntervals, 1, 1, 4096),
    intervalSeconds: integer(v.intervalSeconds, 1, 1, 86400),
    speed: integer(v.speed, 1, 1, 100),
    timeoutSeconds: integer(v.timeoutSeconds, 60, 1, 600),
    objects,
  };
  if (scenario.groupDistance && scenario.layout !== 'crowded')
    throw new Error('Separated groups require crowded placement around their separate anchors.');
  if (
    (scenario.people +
      scenario.animals +
      scenario.birds +
      objects.reduce((n, g) => n + g.count, 0)) *
      (scenario.groupDistance ? 2 : 1) >
    10000
  )
    throw new Error('At most 10,000 added entities per run.');
  return scenario;
}

export function populateScenario(input: WorldState | undefined, scenario: Scenario): WorldState {
  let world = input ?? createWorld(scenario.seed);
  world = structuredClone(world);
  if (scenario.mapSize) {
    const size = scenario.mapSize;
    world.map.tiles = Array.from({ length: size }, (_, z) =>
      Array.from({ length: size }, (_, x) => world.map.tiles[z]?.[x] ?? 'grass'),
    );
    world.map.width = world.map.height = size;
    const terrain = world.map.spatial.surfaces.find((s) => s.id === 'terrain')!;
    terrain.maxX = terrain.maxZ = size - 1;
    world.map.spatial.revision++;
  }
  world = populateGroup(world, scenario, 0, 'near');
  return scenario.groupDistance
    ? populateGroup(world, scenario, scenario.groupDistance, 'far')
    : world;
}

function populateGroup(
  world: WorldState,
  scenario: Scenario,
  offset: number,
  groupId: string,
): WorldState {
  world.paused = false;
  const player = worldPosition(Object.values(world.entities).find((e) => e.kind === 'player')) ?? {
    y: 0,
    x: 0,
    z: 0,
  };
  const anchor = { ...player, x: player.x + offset, z: player.z + offset };
  if (offset && (anchor.x + 16 >= world.map.width || anchor.z + 16 >= world.map.height))
    throw new Error('The separated group does not fit within the fixture map.');
  const positions: Position[] = [];
  for (let z = 0; z < world.map.height; z++)
    for (let x = 0; x < world.map.width; x++)
      if (isWalkable(world, { y: 0, x, z })) positions.push({ y: 0, x, z });
  if (!positions.length) throw new Error('No walkable fixture positions.');
  if (scenario.layout === 'crowded')
    positions.sort(
      (a, b) =>
        Math.hypot(a.x - anchor.x, a.z - anchor.z) - Math.hypot(b.x - anchor.x, b.z - anchor.z),
    );
  else {
    // Local fixture RNG does not consume the saved world's gameplay randomness.
    let rng = scenario.seed;
    for (let i = positions.length - 1; i > 0; i--) {
      rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
      const j = rng % (i + 1);
      [positions[i], positions[j]] = [positions[j]!, positions[i]!];
    }
  }
  let cursor = 0;
  for (let index = 0; index < scenario.people + scenario.animals; index++) {
    let accepted = false;
    while (cursor < positions.length) {
      const result = spawnWorldEntity(world, {
        type: index < scenario.people ? 'person' : 'deer',
        position: { ...positions[cursor++]!, surfaceId: 'terrain' },
        ...(index < scenario.people
          ? {
              person: {
                name: `Profile person ${index}`,
                personality: '',
                backstory: 'Synthetic profiling fixture.',
                traitIds: [],
                initialGoals: [],
              },
            }
          : {}),
      });
      if (result.outcome.ok) {
        world = freezeWorld(result.world);
        accepted = true;
        break;
      }
      if (result.outcome.code !== 'occupied') throw new Error(result.outcome.message);
    }
    if (!accepted)
      throw new Error('Not enough unoccupied walkable tiles. Use a larger input world.');
  }
  // Custom objects exist only in this disposable fixture. No production admission rule is changed.
  world = structuredClone(world);
  // Fixture-only ordinary flight loops have staggered departure times and copied native bodies.
  // The manifest records their exact routes; gameplay randomness is not consumed here.
  const bird = world.entities['bird-1']!;
  if (scenario.birds && (!bird?.actor || bird.spatial.bodyProfileId !== 'bird'))
    throw new Error('Synthetic flight fixtures require the starter native bird body.');
  for (let index = 0; index < scenario.birds; index++) {
    const id = `profile-${groupId}-bird-${index}`;
    const x = anchor.x + (index % 6) * 0.5,
      z = anchor.z + Math.floor(index / 6) * 0.5,
      y = 5 + (index % 4) * 0.1;
    if (x + 12 > world.map.width - 1 || z + 12 > world.map.height - 1)
      throw new Error('The synthetic flight loop does not fit within the fixture map.');
    const routeId = `${id}-loop`;
    world.flightRoutes[routeId] = {
      id: routeId,
      speed: 0.6,
      climbSpeed: 0.3,
      points: [
        { position: { x, y, z }, waitSeconds: 0 },
        { position: { x: x + 12, y, z }, waitSeconds: 0 },
        { position: { x: x + 12, y, z: z + 12 }, waitSeconds: 0 },
        { position: { x, y, z: z + 12 }, waitSeconds: 0 },
      ],
    };
    world.entities[id] = {
      ...structuredClone(bird),
      id,
      name: `Synthetic profile bird ${groupId} ${index}`,
      placement: worldPlacement({ x, y, z }, null),
      spatial: {
        bodyProfileId: 'bird',
        heading: 0,
        flight: { routeId, next: 1, waitSeconds: (index * 7) % 53 },
      },
    };
  }
  let objectIndex = 0;
  for (const group of scenario.objects) {
    const definition = { ...group.definition, id: `${group.definition.id}-${groupId}` };
    if (Object.hasOwn(world.itemDefinitions, definition.id))
      throw new Error('Fixture material ID collision.');
    world.itemDefinitions[definition.id] = definition;
    for (let i = 0; i < group.count; i++) {
      const id = `profile-${groupId}-object-${objectIndex++}`;
      if (Object.hasOwn(world.entities, id)) throw new Error('Fixture entity ID collision.');
      // Ground objects may share tiles; quantity=500 is distinct from 500 visible entities.
      const position =
        positions[
          (scenario.layout === 'crowded' ? i % Math.min(9, positions.length) : objectIndex - 1) %
            positions.length
        ]!;
      world.entities[id] = {
        id,
        name: group.definition.name,
        kind: 'resource',
        spatial: { bodyProfileId: 'object', heading: 0 },
        placement: worldPlacement({ ...position }, 'terrain'),
        resource: {
          definitionId: definition.id,
          quantity: group.quantity,
          workSeconds: group.workSeconds,
        },
      };
    }
  }
  return world;
}
