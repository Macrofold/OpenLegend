import { canWalkSegment, type SurfacePoint } from '@open-legend/spatial';
import { reserveEntityId } from '../../packages/domain/src/data.js';
import { entityGet, entitySet, entityValues } from '../../packages/domain/src/entity-collection.js';
import { occupiedBodySweepReader } from '../../packages/domain/src/spatial.js';
import {
  bodyProfile,
  spatialMap,
  supportedPosition,
  worldPlacement,
} from '../../packages/domain/src/spatial-state.js';
import firstPlayable from '../../packages/domain/src/worlds/base/config/first-playable.generated.json' with { type: 'json' };
import { prepareBaseInitialWorldState } from '../../packages/domain/src/worlds/base/initial-opening.js';
import { starterGroundAt } from '../../packages/domain/src/worlds/base/landscape.js';
import { baseSpatial } from '../../packages/domain/src/worlds/base/spatial-definitions.js';
import {
  baseWorldInitialConstructionSeeds,
  createActor,
  createWorld,
  PLAYER_ID,
} from '../../packages/domain/src/worlds/base/world.js';

/** Initialize the exact ordinary Main opening once. The supplemental 25-player
 * variant adds bodies before first perception so existing people see them normally.
 * docs/projects/attention-and-scenes-runtime-design.md#102-measurements-and-pass-conditions
 */
export function createSustainedNormalOpening(playerCount: 1 | 25, accounts: readonly string[]) {
  const account = accounts[0];
  if (!account || accounts.length !== playerCount || new Set(accounts).size !== playerCount)
    throw new Error('Each moving player needs a distinct fixture account.');

  const world = createWorld(undefined, { creatorAccountIds: [account], playerAccountId: account });
  const landscape = world.map.spatial;
  const player = entityGet(world.entities, PLAYER_ID);
  const start = player && supportedPosition(player);
  if (!landscape || !player || !start)
    throw new Error('The ordinary opening needs its supported starting player.');

  const ground = (x: number, z: number) => starterGroundAt(landscape, x, z);
  const map = spatialMap(world);
  const body = bodyProfile(player);
  const occupied = occupiedBodySweepReader(world, player);
  const ensureClear = (from: ReturnType<typeof ground>, to: ReturnType<typeof ground>) => {
    if (!canWalkSegment(map, from, to, body) || !occupied(from, to).clear(to))
      throw new Error(`Fixture walk is blocked: (${from.x}, ${from.z}) to (${to.x}, ${to.z}).`);
  };
  const turn = ground(20, 14);
  ensureClear(start, turn);
  const routes: (readonly [SurfacePoint, SurfacePoint])[] = [[turn, start]];
  const playerIds = [player.id];

  if (playerCount === 25) {
    // The added parallel routes are 1.5 metres apart and stay away from
    // Mike's camp route. Validate against the authored landscape and people
    // before adding any other players.
    const lanes = [
      ...Array.from({ length: 15 }, (_, index) => ground(6, 20 + index * 1.5)),
      ...Array.from({ length: 3 }, (_, index) => ground(9, 44 + index * 1.5)),
      ...Array.from({ length: 6 }, (_, index) => ground(12, 48.5 + index * 1.5)),
    ].map((from) => {
      const to = ground(from.x + 11, from.z);
      ensureClear(from, to);
      return { from, to };
    });
    const { fullness, energy } = firstPlayable.opening.content.conditions.player;
    for (const [index, { from, to }] of lanes.entries()) {
      const id = `witness-normal-visitor-${index + 2}`;
      const owner = accounts[index + 1];
      if (!owner) throw new Error('The supplemental opening needs every account owner.');
      reserveEntityId(world, id);
      entitySet(world.entities, id, {
        id,
        name: `Visitor ${index + 2}`,
        nameForm: 'proper',
        kind: 'player',
        spatial: baseSpatial('person'),
        placement: worldPlacement(from, from.surfaceId),
        actor: createActor(world, 'player', fullness, {}, energy),
      });
      world.authorship.playerAccountIds[id] = owner;
      world.knowledge[id] = [];
      world.memories[id] = [];
      routes.push([to, from]);
      playerIds.push(id);
    }
  }

  prepareBaseInitialWorldState(world);
  const entities = entityValues(world.entities);
  return {
    world,
    constructionSeeds: baseWorldInitialConstructionSeeds(world),
    playerIds,
    routes,
    npcIds: entities
      .filter((entity) => entity.kind === 'npc' && entity.actor?.species === 'human')
      .map((entity) => entity.id),
    animalIds: entities.filter((entity) => entity.kind === 'animal').map((entity) => entity.id),
    rootObjectCount: entities.filter(
      (entity) => !entity.actor && entity.placement?.mode === 'world',
    ).length,
  };
}
