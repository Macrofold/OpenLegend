import {
  entityGet,
  entityHas,
  entitySet,
  entityValues,
  executeCommand,
  setSpatialPosition,
  updateWorld,
  worldSupport,
  activelyParticipates,
} from '../../packages/domain/src/index.js';
import { commitContactImpact } from '../../packages/domain/src/contact-defense.js';
import { emit } from '../../packages/domain/src/events.js';
import { reconcileNativeExposure } from '../../packages/domain/src/native-response-controller.js';
import { bodyProfile } from '../../packages/domain/src/spatial-state.js';
import { occupiedBodySweepClear } from '../../packages/domain/src/spatial.js';
import { NATIVE_STRIKES } from '../../packages/domain/src/worlds/base/strikes.js';
import {
  baseSpatial,
  BASE_BODY_PROFILES,
} from '../../packages/domain/src/worlds/base/spatial-definitions.js';
import { worldPlacement } from '@open-legend/domain';
import { worldPosition } from '@open-legend/domain';
import {
  canStand,
  resolveSupport,
  type SurfacePoint,
  type SpatialBlocker,
} from '@open-legend/spatial';
import { spatialMap } from '../../packages/domain/src/spatial-state.js';
import {
  createWorld,
  freezeWorld,
  spawnWorldEntity,
  type ItemDefinition,
  type WorldState,
} from '../../packages/domain/src/index.js';

const alarmStanceBearings = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [Math.SQRT1_2, Math.SQRT1_2],
  [-Math.SQRT1_2, Math.SQRT1_2],
  [Math.SQRT1_2, -Math.SQRT1_2],
  [-Math.SQRT1_2, -Math.SQRT1_2],
] as const;

export interface Scenario {
  input?: string;
  seed: number;
  people: number;
  animals: number;
  /** Controlled native contact impacts alarm this fraction of the added deer, during fixture setup. */
  nativeAlarmPercent: number;
  nativePressure: 'none' | 'converging-people' | 'geometry-edits';
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
        'nativeAlarmPercent',
        'nativePressure',
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
  if (
    v.layout !== undefined &&
    (typeof v.layout !== 'string' || !['crowded', 'scattered'].includes(v.layout))
  )
    throw new Error('Unknown layout.');
  if (
    v.nativePressure !== undefined &&
    (typeof v.nativePressure !== 'string' ||
      !['none', 'converging-people', 'geometry-edits'].includes(v.nativePressure))
  )
    throw new Error('Unknown native pressure workload.');
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
    nativeAlarmPercent: integer(v.nativeAlarmPercent, 0, 0, 100),
    nativePressure: (v.nativePressure ?? 'none') as Scenario['nativePressure'],
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
      (scenario.nativePressure === 'converging-people' ? 4 : 0) +
      scenario.birds +
      objects.reduce((n, g) => n + g.count, 0)) *
      (scenario.groupDistance ? 2 : 1) >
    10000
  )
    throw new Error('At most 10,000 added entities per run.');
  return scenario;
}

export interface ScenarioPopulation {
  world: WorldState;
  addedAnimalIds: string[];
}

export type NativePressureFixture =
  | {
      kind: 'converging-people';
      walkers: Array<{ id: string; destinations: [SurfacePoint, SurfacePoint] }>;
    }
  | { kind: 'geometry-edits'; screen: SpatialBlocker };

/** Finite, explicit diagnostic interventions, never autonomous game behavior. */
export function prepareNativePressure(
  input: WorldState,
  scenario: Scenario,
  animalIds: readonly string[],
): { world: WorldState; fixture?: NativePressureFixture } {
  if (scenario.nativePressure === 'none') return { world: input };
  if (scenario.groupDistance) throw new Error('Native pressure uses one exact cohort.');
  for (const animalId of animalIds) {
    const origin = worldPosition(entityGet(input.entities, animalId)!);
    if (scenario.nativePressure === 'geometry-edits') {
      const screen: SpatialBlocker = {
        id: 'profile-pressure-screen',
        bounds: {
          min: { x: origin.x + 2.8, y: origin.y - 0.05, z: origin.z - 3 },
          max: { x: origin.x + 3, y: origin.y + 0.45, z: origin.z + 3 },
        },
        nonWalkable: true,
        movement: true,
        sight: false,
        acousticTransmission: 1,
        material: 'wood',
      };
      if (!pressureScreenFits(input, screen)) continue;
      const world = updateWorld(input, (draft) => {
        draft.map.spatial.blockers.push(screen);
        draft.map.spatial.revision++;
      });
      return { world, fixture: { kind: 'geometry-edits', screen } };
    }
    let world = input;
    const walkers: Extract<NativePressureFixture, { kind: 'converging-people' }>['walkers'] = [];
    for (const side of [-1, 1])
      for (const lateral of [-1.2, 1.2]) {
        const map = spatialMap(world),
          point = (x: number) => resolveSupport(map, { x, y: origin.y, z: origin.z + lateral });
        const from = point(origin.x + side * 8),
          near = point(origin.x + side * 2),
          far = point(origin.x - side * 2);
        if (!from || !near || !far) break;
        const spawned = spawnWorldEntity(world, {
          id: `profile-pressure-person:${walkers.length}`,
          type: 'person',
          position: from,
          person: {
            name: `Pressure walker ${walkers.length + 1}`,
            personality: '',
            backstory: 'Controlled two-group movement workload.',
            traitIds: [],
            initialGoals: [],
          },
        });
        if (!spawned.outcome.ok) break;
        const id = spawned.outcome.entityId!,
          body = entityGet(spawned.world.entities, id)!;
        if (
          ![near, far].every(
            (p) =>
              canStand(spatialMap(spawned.world), p, bodyProfile(body)) &&
              occupiedBodySweepClear(spawned.world, body, p, p),
          )
        )
          break;
        world = freezeWorld(spawned.world);
        walkers.push({ id, destinations: [near, far] });
      }
    if (walkers.length === 4) return { world, fixture: { kind: 'converging-people', walkers } };
  }
  throw new Error('The exact native pressure workload has no valid admitted layout.');
}

function pressureScreenFits(world: WorldState, screen: SpatialBlocker): boolean {
  if (
    screen.bounds.min.x < 0 ||
    screen.bounds.max.x > world.map.width - 1 ||
    screen.bounds.min.z < 0 ||
    screen.bounds.max.z > world.map.height - 1
  )
    return false;
  const map = spatialMap(world),
    spatial = {
      ...map.spatial,
      blockers: [...map.spatial.blockers.filter((b) => b.id !== screen.id), screen],
    };
  return entityValues(world.entities).every((entity) => {
    if (!entity.actor || !activelyParticipates(entity)) return true;
    const support = worldSupport(entity),
      point = worldPosition(entity),
      body = bodyProfile(entity);
    if (
      !support ||
      point.x + body.radius < screen.bounds.min.x ||
      point.x - body.radius > screen.bounds.max.x ||
      point.z + body.radius < screen.bounds.min.z ||
      point.z - body.radius > screen.bounds.max.z
    )
      return true;
    return canStand({ ...map, spatial }, { ...point, surfaceId: support }, body);
  });
}

export function applyNativePressure(
  world: WorldState,
  fixture: NativePressureFixture,
  phase: number,
  step = 0,
): WorldState {
  if (fixture.kind === 'converging-people') {
    for (const walker of fixture.walkers) {
      const result = executeCommand(world, {
        id: `profile-pressure-move:${phase}:${walker.id}`,
        actorId: walker.id,
        type: 'move',
        destination: walker.destinations[phase % 2]!,
      });
      if (!result.outcome.ok)
        throw new Error(`Native pressure movement refused: ${result.outcome.code}.`);
      world = freezeWorld(result.world);
    }
    return world;
  }
  const screen = structuredClone(fixture.screen),
    offset = step % 2 ? 0 : 0.2;
  screen.bounds.min.x += offset;
  screen.bounds.max.x += offset;
  if (!pressureScreenFits(world, screen)) return world;
  return updateWorld(world, (draft) => {
    const index = draft.map.spatial.blockers.findIndex((b) => b.id === screen.id);
    if (index < 0) throw new Error('The pressure screen was removed.');
    draft.map.spatial.blockers[index] = screen;
    draft.map.spatial.revision++;
  });
}

/** Supported long routes keep one-second command streams doing native work at
 * the selected world's compressed clock. This prepares endpoints, not movement
 * authority: every runtime command still uses ordinary admission/pathfinding. */
export function prepareWalkingRoute(
  world: WorldState,
  actorId: string,
): [SurfacePoint, SurfacePoint] {
  const actor = entityGet(world.entities, actorId);
  if (!actor?.actor) throw new Error('A walking workload needs an actual actor.');
  const point = worldPosition(actor),
    support = worldSupport(actor);
  if (!support) throw new Error('A walking workload needs supported ground.');
  const origin = { ...point, surfaceId: support };
  const map = spatialMap(world),
    body = bodyProfile(actor);
  for (const distance of [32, 24, 16, 8])
    for (const [dx, dz] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
      [Math.SQRT1_2, Math.SQRT1_2],
      [-Math.SQRT1_2, Math.SQRT1_2],
    ]) {
      const target = resolveSupport(map, {
        x: origin.x + dx! * distance,
        y: origin.y,
        z: origin.z + dz! * distance,
      });
      if (
        target &&
        canStand(map, target, body) &&
        occupiedBodySweepClear(world, actor, target, target)
      )
        return [target, origin];
    }
  throw new Error('The fixture has no supported continuing route for an actor.');
}

export function populateScenario(
  input: WorldState | undefined,
  scenario: Scenario,
): ScenarioPopulation {
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
  const near = populateGroup(world, scenario, 0, 'near');
  if (!scenario.groupDistance) return near;
  const far = populateGroup(near.world, scenario, scenario.groupDistance, 'far');
  return { world: far.world, addedAnimalIds: [...near.addedAnimalIds, ...far.addedAnimalIds] };
}

function populateGroup(
  world: WorldState,
  scenario: Scenario,
  offset: number,
  groupId: string,
): ScenarioPopulation {
  const addedAnimalIds: string[] = [];
  world.paused = false;
  const player = worldPosition(entityValues(world.entities).find((e) => e.kind === 'player')) ?? {
    y: 0,
    x: 0,
    z: 0,
  };
  const anchor = { ...player, x: player.x + offset, z: player.z + offset };
  if (offset && (anchor.x + 16 >= world.map.width || anchor.z + 16 >= world.map.height))
    throw new Error('The separated group does not fit within the fixture map.');
  const positions: SurfacePoint[] = [];
  const map = spatialMap(world);
  for (let z = 0; z < world.map.height; z++)
    for (let x = 0; x < world.map.width; x++) {
      const point = resolveSupport(map, { y: 0, x, z });
      // Retain the exact support: integrated maps contain more than one terrain patch.
      // Each living body is checked separately before ordinary spawn admission below.
      if (point && canStand(map, point, BASE_BODY_PROFILES.object)) positions.push(point);
    }
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
    const type = index < scenario.people ? 'person' : 'deer';
    let accepted = false;
    while (cursor < positions.length) {
      const position = positions[cursor++]!;
      if (!canStand(map, position, BASE_BODY_PROFILES[type])) continue;
      const result = spawnWorldEntity(world, {
        id: `profile-spawn:${groupId}:${index}`,
        type,
        position: { ...position },
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
        if (index >= scenario.people) addedAnimalIds.push(result.outcome.entityId!);
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
  const bird = entityGet(world.entities, 'bird-1')!;
  if (scenario.birds && (!bird?.actor || bird.spatial.body.id !== 'bird'))
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
      body: { ...bird!.spatial.body },
      speed: 0.6,
      climbSpeed: 0.3,
      continuation: { kind: 'loop' },
      points: [
        { position: { x, y, z }, waitSeconds: 0 },
        { position: { x: x + 12, y, z }, waitSeconds: 0 },
        { position: { x: x + 12, y, z: z + 12 }, waitSeconds: 0 },
        { position: { x, y, z: z + 12 }, waitSeconds: 0 },
      ],
    };
    entitySet(world.entities, id, {
      ...structuredClone(bird),
      id,
      name: `Synthetic profile bird ${groupId} ${index}`,
      placement: worldPlacement({ x, y, z }, null),
      spatial: {
        ...baseSpatial('bird'),
        heading: 0,
        flight: { routeId, next: 1, waitSeconds: (index * 7) % 53 },
      },
    });
  }
  let objectIndex = 0;
  for (const group of scenario.objects) {
    const definition = { ...group.definition, id: `${group.definition.id}-${groupId}` };
    if (Object.hasOwn(world.itemDefinitions, definition.id))
      throw new Error('Fixture material ID collision.');
    world.itemDefinitions[definition.id] = definition;
    for (let i = 0; i < group.count; i++) {
      const id = `profile-${groupId}-object-${objectIndex++}`;
      if (entityHas(world.entities, id)) throw new Error('Fixture entity ID collision.');
      // Ground objects may share tiles; quantity=500 is distinct from 500 visible entities.
      const position =
        positions[
          (scenario.layout === 'crowded' ? i % Math.min(9, positions.length) : objectIndex - 1) %
            positions.length
        ]!;
      entitySet(world.entities, id, {
        id,
        name: group.definition.name,
        kind: 'resource',
        spatial: baseSpatial('object'),
        placement: worldPlacement(position, position.surfaceId),
        resource: {
          definitionId: definition.id,
          quantity: group.quantity,
          workSeconds: group.workSeconds,
        },
      });
    }
  }
  return {
    world: prepareAnimalAlarms(world, scenario, groupId, addedAnimalIds),
    addedAnimalIds,
  };
}

/** Explicit generated-workload construction, not travel or an ordinary world opening.
 * Every alarm uses the native contact-impact owner at a supported in-range stance.
 * This controlled stress setup is not an ordinary hunting or attack-duration test.
 * docs/projects/combat-and-threat-responses-tech-design.md#active-alarm-density-workload */
function prepareAnimalAlarms(
  world: WorldState,
  scenario: Scenario,
  groupId: string,
  addedAnimalIds: readonly string[],
): WorldState {
  const count = Math.ceil((addedAnimalIds.length * scenario.nativeAlarmPercent) / 100);
  if (!count) return world;
  const performer = entityValues(world.entities).find((entity) => entity.kind === 'player');
  if (!performer?.actor || performer.actor.action)
    throw new Error('Alarm fixtures require an idle player performer.');
  const performerId = performer.id,
    original = { ...worldPosition(performer) },
    originalSupport =
      performer.placement?.mode === 'world' ? performer.placement.supportSurfaceId : null;
  for (let index = 0; index < count; index++) {
    const targetId = addedAnimalIds[index]!;
    const actor = entityGet(world.entities, performerId)!,
      target = entityGet(world.entities, targetId)!,
      origin = worldPosition(target),
      performerBody = bodyProfile(actor),
      clearance = performerBody.radius + bodyProfile(target).radius + 0.2,
      map = spatialMap(world);
    const strike = world.nativeStrikes?.[NATIVE_STRIKES.punch!.id];
    if (!strike)
      throw new Error('The generated alarm fixture requires its installed unarmed method.');
    let stance: SurfacePoint | undefined;
    // Nearby bodies can close the inner ring while a real in-range stance remains clear.
    for (const distance of [clearance, strike.range * 0.95]) {
      for (const [dx, dz] of alarmStanceBearings) {
        const point = resolveSupport(map, {
          x: origin.x + dx * distance,
          y: origin.y,
          z: origin.z + dz * distance,
        });
        if (
          point &&
          canStand(map, point, performerBody) &&
          occupiedBodySweepClear(world, actor, point, point)
        ) {
          stance = point;
          break;
        }
      }
      if (stance) break;
    }
    if (!stance) throw new Error(`No clear alarm-fixture stance for added animal ${index}.`);
    world = updateWorld(world, (draft) => {
      setSpatialPosition(draft, entityGet(draft.entities, performerId)!, stance, stance.surfaceId);
    });
    world = updateWorld(world, (draft) => {
      const source = entityGet(draft.entities, performerId)!,
        target = entityGet(draft.entities, targetId)!;
      const events: import('../../packages/domain/src/types.js').WorldEvent[] = [];
      const impact = commitContactImpact(
        draft,
        source,
        target,
        strike.damage,
        `profile-alarm:${groupId}:${index}`,
        events,
      );
      emit(draft, events, 'struck', 'The controlled contact blow connected.', source, targetId, {
        definitionId: strike.id,
        damage: impact.damage,
        contactInjury: true,
        targetReference: true,
      });
      reconcileNativeExposure(draft, target);
    });
    if (!entityGet(world.entities, targetId)?.animal?.episode)
      throw new Error(`Native contact did not alarm added animal ${index}.`);
  }
  return updateWorld(world, (draft) => {
    setSpatialPosition(draft, entityGet(draft.entities, performerId)!, original, originalSupport);
    for (let index = 0; index < count; index++)
      reconcileNativeExposure(draft, entityGet(draft.entities, addedAnimalIds[index]!)!);
  });
}
