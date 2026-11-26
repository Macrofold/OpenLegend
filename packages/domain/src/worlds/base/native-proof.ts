import type { SurfacePoint } from '@open-legend/spatial';
import { reserveEntityId } from '../../data.js';
import { entityGet, entitySet, entityValues } from '../../entity-collection.js';
import type { WorldCreationAccounts } from '../../invention-attribution.js';
import { nativeActor } from '../../living.js';
import { isWalkable } from '../../spatial.js';
import { bodyProfile, worldPlacement } from '../../spatial-state.js';
import type { Entity, WorldState } from '../../types.js';
import { baseAnimalResponse } from './animal-response-profile.js';
import { BASE_PEOPLE } from './characters.js';
import { prepareBaseInitialWorldState } from './initial-opening.js';
import { starterGroundAt } from './landscape.js';
import { baseSpatial } from './spatial-definitions.js';
import { createActor, createFreshBaseWorld } from './world.js';

/** The declared NSC comparison population uses the ordinary authored body,
 * terrain, status and receiving owners. It is deliberately separate from Main;
 * building it is not evidence that a native installer supports its closure.
 * docs/projects/native-simulation-core-tech-design.md#91-freeze-the-comparison-contract */
export const BASE_NATIVE_PROOF = {
  seed: 73,
  player: { id: 'native-proof-player', name: 'Traveler', x: 24, z: 14 },
  observers: [
    { id: 'native-proof-ground-observer', person: 'ada', x: 22, z: 14 },
    {
      id: 'native-proof-deck-observer',
      person: 'mercenary',
      point: { x: 20, y: 3, z: 6, surfaceId: 'lookout-deck' },
    },
  ],
  animals: [
    { id: 'native-proof-hare-0', x: 26, z: 14 },
    { id: 'native-proof-hare-1', x: 21, z: 10 },
    { id: 'native-proof-hare-2', x: 16, z: 12 },
  ],
} as const;

export function createBaseNativeProofWorld(
  accounts: WorldCreationAccounts,
  worldId: string,
  seed: number = BASE_NATIVE_PROOF.seed,
  options: { readonly actorSenses?: Readonly<Record<string, readonly string[]>> } = {},
): WorldState {
  const world = createFreshBaseWorld(seed, accounts, {
    worldId,
    playerId: BASE_NATIVE_PROOF.player.id,
  });
  const layout = world.map.spatial;
  if (!layout) throw new Error('The native proof requires the authored starter geometry.');
  const ground = (x: number, z: number) => starterGroundAt(layout, x, z);
  const person = (
    id: string,
    name: string,
    point: SurfacePoint,
    controller: 'player' | 'npc',
    identity: Parameters<typeof createActor>[3],
  ) => {
    reserveEntityId(world, id);
    entitySet(world.entities, id, {
      id,
      name,
      nameForm: 'proper',
      kind: controller === 'player' ? 'player' : 'npc',
      spatial: baseSpatial('person'),
      placement: worldPlacement({ x: point.x, y: point.y, z: point.z }, point.surfaceId),
      actor: createActor(world, controller, 76, identity, 76),
    });
    // These are fresh authored owners, prepared before the common first sight
    // cut. Creating an empty owner does not reconstruct a remembered event.
    world.memories[id] = [];
    world.knowledge[id] = [];
  };
  const player = BASE_NATIVE_PROOF.player;
  person(player.id, player.name, ground(player.x, player.z), 'player', {});
  for (const observer of BASE_NATIVE_PROOF.observers) {
    const authored = BASE_PEOPLE[observer.person];
    person(
      observer.id,
      authored.name,
      'point' in observer ? { ...observer.point } : ground(observer.x, observer.z),
      'npc',
      authored.identity,
    );
  }
  for (const animal of BASE_NATIVE_PROOF.animals) {
    reserveEntityId(world, animal.id);
    const point = ground(animal.x, animal.z);
    const entity: Entity = {
      id: animal.id,
      name: 'hare',
      nameForm: 'count',
      kind: 'animal',
      spatial: baseSpatial('hare'),
      placement: worldPlacement({ x: point.x, y: point.y, z: point.z }, point.surfaceId),
      actor: nativeActor(
        'hare',
        world.simTime,
        world.moduleManifest.definitions.filter(
          (definition) => definition.id === 'wilderness:energy',
        ),
      ),
      animal: baseAnimalResponse(world, 'hare', 150),
    };
    entitySet(world.entities, entity.id, entity);
  }
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
      throw new Error(
        `The native proof has no supported clear starting position for ${entity.id}.`,
      );
  }
  // Profiles belong to this authored opening and precede its first receiving
  // cut. A hearing-only comparison must not inherit an earlier sight grant.
  if (options.actorSenses)
    for (const [id, senses] of Object.entries(options.actorSenses)) {
      const actor = entityGet(world.entities, id)?.actor;
      if (!actor) throw new Error('A native proof sense profile needs an existing actor.');
      actor.senses = [...senses];
    }
  prepareBaseInitialWorldState(world);
  return world;
}
