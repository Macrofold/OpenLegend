import { arrangePlan } from '../../agency.js';
import { reserveEntityId } from '../../data.js';
import { entitySet, entityValues } from '../../entity-collection.js';
import type { WorldCreationAccounts } from '../../invention-attribution.js';
import { isWalkable } from '../../spatial.js';
import { bodyProfile, worldPlacement } from '../../spatial-state.js';
import { BASE_NATIVE_PROOF } from './native-proof.js';
import { installBaseEcology } from './ecology.js';
import { compileBaseEcologyConfiguration } from './ecology-config.js';
import firstPlayable from './config/first-playable.generated.json' with { type: 'json' };
import { prepareBaseInitialWorldState } from './initial-opening.js';
import { starterGroundAt } from './landscape.js';
import { baseSpatial } from './spatial-definitions.js';
import { spawnedEntity } from './spawn.js';
import { createActor, createFreshBaseWorld } from './world.js';

type Point = [x: number, z: number];

const pastures: Point[] = [
  [26, 36],
  [39, 29],
  [51, 39],
];
const residents = [
  { name: 'Iona', start: [20, 14], turn: [11, 15] },
  { name: 'Tarin', start: [22, 10], turn: [10, 10] },
  { name: 'Rina', start: [26, 19], turn: [36, 20] },
  { name: 'Pavel', start: [27, 22], turn: [38, 22] },
  { name: 'Mira', start: [25, 25], turn: [14, 25] },
  { name: 'Neri', start: [23, 29], turn: [14, 29] },
  { name: 'Fara', start: [34, 31], turn: [45, 31] },
  { name: 'Asha', start: [39, 36], turn: [50, 36] },
  { name: 'Sela', start: [44, 41], turn: [53, 41] },
  { name: 'Oren', start: [37, 44], turn: [47, 44] },
] satisfies { name: string; start: Point; turn: Point }[];
const deer: Point[] = [
  [27, 34],
  [24, 36],
  [26, 38],
  [23, 39],
  [38, 28],
  [40, 28],
  [41, 30],
  [49, 38],
  [52, 37],
  [52, 40],
];
const hares: Point[] = [
  [25, 34],
  [27, 38],
  [24, 34],
  [49, 40],
  [53, 39],
];

/** The RGS comparison uses one authored terrain and the real Base pasture
 * profiles. Fixed scenario intentions enter the same plan owner as other
 * frontier work. The live clock still has to start and finish every step.
 * docs/projects/rust-game-server-tech-design.md#1-freeze-a-playable-workload-rgs01 */
export function createBaseRustServerOpening(accounts: WorldCreationAccounts, worldId: string) {
  const { seed, player } = BASE_NATIVE_PROOF;
  const world = createFreshBaseWorld(seed, accounts, { worldId, playerId: player.id });
  const layout = world.map.spatial;
  if (!layout) throw new Error('The Rust server opening requires the authored terrain.');
  const ground = ([x, z]: Point) => starterGroundAt(layout, x, z);
  const actorAt = (id: string, name: string, point: Point, controller: 'player' | 'npc') => {
    reserveEntityId(world, id);
    const at = ground(point);
    const actor = createActor(world, controller, 85, {}, 92);
    entitySet(world.entities, id, {
      id,
      name,
      nameForm: 'proper',
      kind: controller,
      spatial: baseSpatial('person'),
      placement: worldPlacement(at, at.surfaceId),
      actor,
    });
    world.knowledge[id] = [];
    world.memories[id] = [];
    return actor;
  };
  actorAt(player.id, player.name, [player.x, player.z], 'player');

  const people = residents.map(({ name, start, turn }, index) => {
    const id = `rust-server-person-${index}`;
    const actor = actorAt(id, name, start, 'npc');
    const plan = arrangePlan(
      world,
      actor,
      `${id}-walk`,
      [turn, start, turn, start, turn, start, turn, start].map((point, leg) => ({
        type: 'move',
        actorId: id,
        id: `${id}-leg-${leg}`,
        destination: ground(point),
      })),
      'enqueue',
      0,
      null,
    );
    if (!plan.ok) throw new Error(`The Rust server opening could not queue a walk for ${name}.`);
    return id;
  });

  const ecology = compileBaseEcologyConfiguration(firstPlayable.ecology);
  const addWildlife = (species: 'hare' | 'deer', starts: Point[]) => {
    const assignment = ecology.assignments.find((entry) => entry.species === species);
    if (!assignment) throw new Error(`Missing authored habitat for ${species}.`);
    const ids = starts.map((point) => {
      const entity = spawnedEntity(world, { type: species, position: ground(point) });
      if (!entity) throw new Error(`The Rust server opening could not create ${species}.`);
      entitySet(world.entities, entity.id, entity);
      return entity.id;
    });
    const initial = Object.values(assignment.initialById);
    return {
      ids,
      assignment: {
        ...assignment,
        anchors: pastures,
        initialById: Object.fromEntries(
          ids.map((id, index) => [id, initial[index % initial.length]!]),
        ),
      },
    };
  };
  const introducedDeer = addWildlife('deer', deer);
  const introducedHares = addWildlife('hare', hares);
  const assignments = [introducedDeer.assignment, introducedHares.assignment];
  installBaseEcology(world, {
    ...ecology,
    assignments,
    pasture: { ...ecology.pasture, anchors: pastures },
    profiles: ecology.profiles.filter((profile) =>
      assignments.some((assignment) => assignment.profileId === profile.id),
    ),
    strikes: [],
    territories: [],
  });
  for (const entity of entityValues(world.entities)) {
    const placement = entity.placement;
    if (
      placement?.mode === 'world' &&
      !isWalkable(
        world,
        placement.position,
        placement.supportSurfaceId ?? undefined,
        bodyProfile(entity),
      )
    )
      throw new Error(`The Rust server opening has no clear starting position for ${entity.id}.`);
  }
  prepareBaseInitialWorldState(world);
  return {
    world,
    playerId: player.id,
    people,
    deer: introducedDeer.ids,
    hares: introducedHares.ids,
  };
}
