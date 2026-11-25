import { findSurfaceRoute, type SurfacePoint } from '@open-legend/spatial';
import {
  arrangePlan,
  bodyProfile,
  entitySet,
  entityValues,
  isWalkable,
  spatialMap,
  worldPlacement,
} from '../../packages/domain/src/index.js';
import { reserveEntityId } from '../../packages/domain/src/data.js';
import { installBaseEcology } from '../../packages/domain/src/worlds/base/ecology.js';
import { compileBaseEcologyConfiguration } from '../../packages/domain/src/worlds/base/ecology-config.js';
import firstPlayable from '../../packages/domain/src/worlds/base/config/first-playable.generated.json' with { type: 'json' };
import { prepareBaseInitialWorldState } from '../../packages/domain/src/worlds/base/initial-opening.js';
import {
  starterGroundAt,
  starterScenery,
  starterTiles,
} from '../../packages/domain/src/worlds/base/landscape.js';
import { baseSpatial } from '../../packages/domain/src/worlds/base/spatial-definitions.js';
import {
  starterFlightRoutes,
  starterSpatialLayout,
} from '../../packages/domain/src/worlds/base/spatial.js';
import { spawnedEntity } from '../../packages/domain/src/worlds/base/spawn.js';
import { createActor, createFreshBaseWorld } from '../../packages/domain/src/worlds/base/world.js';

const people = 100;
const rows = 25;
const legsPerWalk = 8;
type Point = [x: number, z: number];
const denseStarts: Point[] = [
  [8, 15],
  [21, 15],
  [34, 15],
  [47, 15],
];
const densePasture: Point[] = [
  [20, 18],
  [33, 27],
  [46, 38],
  [59, 47],
];
const districtStarts: Point[] = [
  [57, 15],
  [109, 15],
  [57, 75],
  [109, 75],
];

/** Reuse the roster and terrain within a layout so the two controller counts
 * exercise the same places. Each resident gets finite ordinary walking work.
 * docs/projects/attention-and-scenes-runtime-design.md#102-measurements-and-pass-conditions
 */
export function createSustainedCrowdOpening(
  playerCount: 1 | 25,
  accounts: readonly string[],
  layout: 'dense' | 'districts' = 'dense',
) {
  const primaryAccount = accounts[0];
  if (
    !primaryAccount ||
    accounts.length !== playerCount ||
    accounts.some((account) => !account) ||
    new Set(accounts).size !== playerCount
  )
    throw new Error('The crowd opening needs a distinct account for each controlled person.');

  const personId = (index: number) => `witness-crowd-person-${index}`;
  const world = createFreshBaseWorld(
    73,
    { creatorAccountIds: [primaryAccount], playerAccountId: primaryAccount },
    { worldId: 'witness-sustained-crowd', playerId: personId(0) },
  );
  if (layout === 'districts') {
    const { width, depth } = firstPlayable.opening.extentMetres;
    const spatial = starterSpatialLayout(width, depth);
    const tiles = starterTiles(world.seed, width, depth);
    world.map = { ...world.map, width, height: depth, spatial, tiles };
    world.flightRoutes = starterFlightRoutes(world.map);
    spatial.scenery = starterScenery(world.seed, width, depth, tiles, spatial);
  }
  const landscape = world.map.spatial;
  if (!landscape) throw new Error('The crowd opening needs supported terrain.');
  const ground = (x: number, z: number) => starterGroundAt(landscape, x, z);
  const starts = layout === 'dense' ? denseStarts : districtStarts;
  const pasture =
    layout === 'dense' ? densePasture : districtStarts.map(([x, z]): Point => [x + 8, z + 17.4]);
  if (layout === 'dense') {
    // Keep the authored slopes and lookout. The central meadow has wide
    // walking lanes and gaps with short, solid rock outcrops that interrupt sight.
    for (let z = 14; z <= 51; z++) world.map.tiles[z]?.fill('grass', 7, 60);
    for (const [column, x] of [19, 32, 45].entries())
      for (let z = 17 + column; z <= 46; z += 9) {
        const row = world.map.tiles[z];
        const next = world.map.tiles[z + 1];
        if (row && next) row[x] = next[x] = 'rock';
      }
  } else {
    // A distinct locality diagnostic. Each district has 25 people, 25
    // animals and one pasture; few of the regular 28 m sight ranges overlap
    // another district. Broken stone screens affect sight within a district.
    for (const [district, [x, z]] of districtStarts.entries()) {
      for (let row = z - 1; row <= z + 36; row++)
        world.map.tiles[row]?.fill('grass', x - 1, x + 12);
      for (const gap of [5, 11, 17]) {
        const between = z + (gap + 0.5) * 1.45;
        const y = ground(x + 3, between).y;
        landscape.blockers.push({
          id: `crowd-district-${district}-stone-${gap}`,
          bounds: {
            min: { x: x + 3, y: y - 0.2, z: between - 0.12 },
            max: { x: x + 4.5, y: y + 2, z: between + 0.12 },
          },
          movement: true,
          sight: true,
          acousticTransmission: 0.15,
          material: 'stone',
        });
      }
    }
  }

  const playerIds: string[] = [];
  const routes: (readonly [SurfacePoint, SurfacePoint])[] = [];
  const npcIds: string[] = [];
  const animalIds: string[] = [];
  const wildlife: Record<'hare' | 'deer', string[]> = { hare: [], deer: [] };
  const map = spatialMap(world);
  for (let index = 0; index < people; index++) {
    const row = index % rows;
    const column = (Math.floor(index / rows) + row) % starts.length;
    const [x, baseZ] = starts[column]!;
    const z = baseZ + row * 1.45;
    const start = ground(x, z);
    const turn = ground(x + 10, z);
    const actorId = personId(index);
    const account = accounts[index];
    const controller = account ? 'player' : 'npc';
    const actor = createActor(world, controller, 100, {}, 100);
    const spatial = baseSpatial('person');
    // Terrain is complete and fixed here. Check both directions through the
    // ordinary static route finder, including walks across support boundaries.
    if (
      findSurfaceRoute(map, start, turn, spatial.body).status !== 'reached' ||
      findSurfaceRoute(map, turn, start, spatial.body).status !== 'reached'
    )
      throw new Error(`No complete terrain walk for ${actorId}.`);
    reserveEntityId(world, actorId);
    entitySet(world.entities, actorId, {
      id: actorId,
      name: `Meadow resident ${index + 1}`,
      nameForm: 'proper',
      kind: controller,
      spatial,
      placement: worldPlacement(start, start.surfaceId),
      actor,
    });
    world.knowledge[actorId] = [];
    world.memories[actorId] = [];

    const species = index % 2 ? 'hare' : 'deer';
    const animal = spawnedEntity(world, { type: species, position: ground(x + 5, z + 0.73) });
    const patch = spawnedEntity(world, {
      type: index % 2 ? 'dry-grass-fibers' : 'fallen-branches',
      position: ground(x + 9.6, z + 0.4),
    });
    if (!animal || !patch?.resource)
      throw new Error('Could not place the crowd wildlife and plants.');
    entitySet(world.entities, animal.id, animal);
    animalIds.push(animal.id);
    wildlife[species].push(animal.id);
    entitySet(world.entities, patch.id, patch);
    if (index < people - pasture.length) {
      const spare = spawnedEntity(world, {
        type: index % 2 ? 'berry-bush' : 'river-stones',
        position: ground(x + 2, z + 0.4),
      });
      if (!spare) throw new Error('Could not place a secondary crowd resource.');
      entitySet(world.entities, spare.id, spare);
    }

    if (account) {
      world.authorship.playerAccountIds[actorId] = account;
      playerIds.push(actorId);
      routes.push([turn, start]);
      continue;
    }
    npcIds.push(actorId);
    const outcome = arrangePlan(
      world,
      actor,
      `${actorId}-meadow-walk`,
      Array.from({ length: legsPerWalk }, (_, index) => ({
        actorId,
        id: `${actorId}-walk-${index}`,
        type: 'move',
        destination: index % 2 === 0 ? turn : start,
      })),
      'enqueue',
      0,
      null,
    );
    if (!outcome.ok) throw new Error(`${actorId} could not plan its walk: ${outcome.message}`);
  }

  const ecology = compileBaseEcologyConfiguration(firstPlayable.ecology);
  const assignments = ecology.assignments.flatMap((assignment) => {
    const species = assignment.species;
    if (species !== 'hare' && species !== 'deer') return [];
    const initial = Object.values(assignment.initialById);
    return [
      {
        ...assignment,
        anchors: pasture,
        initialById: Object.fromEntries(
          wildlife[species].map((id, index) => {
            const fullness = initial[index % initial.length];
            if (fullness === undefined) throw new Error('Missing authored starting fullness.');
            return [id, fullness];
          }),
        ),
      },
    ];
  });
  installBaseEcology(world, {
    ...ecology,
    assignments,
    pasture: { ...ecology.pasture, anchors: pasture },
    profiles: ecology.profiles.filter((profile) =>
      assignments.some((a) => a.profileId === profile.id),
    ),
    strikes: [],
    territories: [],
  });

  let rootObjectCount = 0;
  for (const entity of entityValues(world.entities)) {
    const placement = entity.placement;
    if (placement?.mode !== 'world') continue;
    if (!entity.actor) rootObjectCount++;
    if (
      !isWalkable(
        world,
        placement.position,
        placement.supportSurfaceId ?? undefined,
        bodyProfile(entity),
      )
    )
      throw new Error(`No clear crowd opening position for ${entity.id}.`);
  }
  // The local opening fallback is one person. The runner grants every
  // connected account its own explicit character through ordinary authority.
  world.identity = {
    controlledEntityId: personId(0),
    defaultResidentEntityId: npcIds[0] ?? null,
  };
  prepareBaseInitialWorldState(world);
  return { world, playerIds, routes, npcIds, animalIds, rootObjectCount };
}
