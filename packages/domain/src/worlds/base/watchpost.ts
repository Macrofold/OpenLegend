import { entitySet, entityValues } from '../../entity-collection.js';
import { baseSpatial } from './spatial-definitions.js';
import { addItem } from '../../data.js';
import { installRecipe } from '../../declarations.js';
import { equipLot } from '../../objects.js';
import { learnRecipe } from '../../knowledge.js';
import { worldPlacement } from '../../spatial-state.js';
import { starterGroundAt } from './landscape.js';
import { KEST_IDENTITY, ORIN_IDENTITY } from './characters.js';
import { assignGivenName } from './knowledge.js';
import type { PlaceDefinition } from '../../places.js';
import type { Entity, RecipeCandidate, WorldState } from '../../types.js';
import type { createActor } from './world.js';
import { BASE_ARROW_ART, bindBaseItemArt } from './presentation.js';

/** One authored placement/loadout source; installation is only part of createWorld. */
export const WATCHPOST = {
  id: 'broken-watchpost',
  cacheId: 'watchpost-cache',
  cache: { x: 48, z: 23 },
  occupants: [
    {
      id: 'kest',
      name: 'Kest',
      position: { x: 47, z: 20 },
      identity: KEST_IDENTITY,
      appearance: 'study:kest-travel-coat',
    },
    {
      id: 'orin',
      name: 'Orin',
      position: { x: 50, z: 21 },
      identity: ORIN_IDENTITY,
      appearance: 'study:orin-field-tunic',
    },
  ],
  // Full-height public solid walls. Both openings and the outer retreat remain ordinary ground.
  walls: [
    { id: 'west-cover', minX: 43, maxX: 43.5, minZ: 17.5, maxZ: 26, height: 2.4 },
    { id: 'front-west', minX: 43.5, maxX: 46, minZ: 17.5, maxZ: 18, height: 2.1 },
    { id: 'front-east', minX: 48.5, maxX: 52, minZ: 17.5, maxZ: 18, height: 2.1 },
    { id: 'east-cover', minX: 51.5, maxX: 52, minZ: 18, maxZ: 22, height: 2.4 },
    { id: 'east-stump', minX: 51.5, maxX: 52, minZ: 24, maxZ: 26, height: 1 },
    { id: 'rear-cover', minX: 43.5, maxX: 49, minZ: 25.5, maxZ: 26, height: 2.4 },
  ],
  description:
    'A roofless ruined store. The open front between the two broken wall ends exposes the interior. A longer approach follows the outside of the long western wall, rounds the rear and reaches the eastern side opening. The taller stone segments provide full-body physical cover. Every opening and the ground outside remain routes for retreat. Inspect the actual occupants and cache; no stock is promised.',
} as const;
/** Translate the whole authored encounter together, before creating any body or record. */
export function watchpostLayout(offset: { x: number; z: number } = { x: 0, z: 0 }) {
  return {
    ...WATCHPOST,
    cache: { x: WATCHPOST.cache.x + offset.x, z: WATCHPOST.cache.z + offset.z },
    occupants: WATCHPOST.occupants.map((person) => ({
      ...person,
      position: { x: person.position.x + offset.x, z: person.position.z + offset.z },
    })),
    walls: WATCHPOST.walls.map((wall) => ({
      ...wall,
      minX: wall.minX + offset.x,
      maxX: wall.maxX + offset.x,
      minZ: wall.minZ + offset.z,
      maxZ: wall.maxZ + offset.z,
    })),
  };
}
export function watchpostReservations(offset: { x: number; z: number }) {
  const layout = watchpostLayout(offset);
  return [
    {
      minX: Math.min(...layout.walls.map((w) => w.minX)) - 2,
      maxX: Math.max(...layout.walls.map((w) => w.maxX)) + 2,
      minZ: Math.min(...layout.walls.map((w) => w.minZ)) - 2,
      maxZ: Math.max(...layout.walls.map((w) => w.maxZ)) + 2,
    },
  ];
}
export const FIELD_BOW_METHOD: RecipeCandidate = {
  family: { id: 'base:flex', version: 1 },
  name: 'Field bow',
  description: 'An authored flexible branch bow with a cord string.',
  inputs: [
    { definitionId: 'wood', quantity: 1, role: 'body' },
    { definitionId: 'cord', quantity: 1, role: 'binding' },
  ],
  output: {
    name: 'Field bow',
    description:
      'A bow held in both hands. It launches compatible finite arrows; a carried knife or shield requires changing equipment.',
  },
  parameters: { workSeconds: 180, damage: 18, range: 24, accuracy: 0.75 },
};
export const FIELD_ARROW_METHOD: RecipeCandidate = {
  family: { id: 'base:arrow', version: 1 },
  name: 'Field arrow',
  description: 'A shaft with a bone point and fiber fletching.',
  inputs: [
    { definitionId: 'wood', quantity: 1, role: 'shaft' },
    { definitionId: 'bone', quantity: 1, role: 'point' },
    { definitionId: 'prepared_fiber', quantity: 1, role: 'fletching' },
  ],
  output: {
    name: 'Field arrow',
    description: 'One ordinary compatible arrow. Its point adds no injury beyond the bow’s shot.',
  },
  parameters: { workSeconds: 72, damageBonus: 0 },
};
export function installWatchpost(
  world: WorldState,
  makeActor: typeof createActor,
  offset?: { x: number; z: number },
  conditions?: Record<'kest' | 'orin', { fullness: number; energy: number }>,
): void {
  const layout = watchpostLayout(offset);
  const ground = (p: { x: number; z: number }) => starterGroundAt(world.map.spatial, p.x, p.z);
  const bow = installRecipe(world, FIELD_BOW_METHOD, {
    source: 'authored-world',
    profile: { ...world.profile },
  }).recipe;
  const arrow = installRecipe(world, FIELD_ARROW_METHOD, {
    source: 'authored-world',
    profile: { ...world.profile },
  }).recipe;
  bindBaseItemArt(world, arrow.outputs[0]!.definition.id, BASE_ARROW_ART);
  const shield = Object.values(world.recipes).find(
    (r) => r.source.kind === 'family' && r.source.familyPin.id === 'base:shield',
  )!;
  for (const wall of layout.walls) {
    const floor = Math.min(
      ground({ x: wall.minX, z: wall.minZ }).y,
      ground({ x: wall.maxX, z: wall.maxZ }).y,
    );
    world.map.spatial.blockers.push({
      id: `watchpost:${wall.id}`,
      material: 'stone',
      movement: true,
      sight: true,
      acousticTransmission: 0.04,
      bounds: {
        min: { x: wall.minX, y: floor - 0.1, z: wall.minZ },
        max: { x: wall.maxX, y: floor + wall.height, z: wall.maxZ },
      },
    });
  }
  world.map.spatial.revision++;
  const point = ground(layout.cache);
  const cache: Entity = {
    id: layout.cacheId,
    name: 'Broken Watchpost cache',
    kind: 'item-pile',
    description: layout.description,
    placement: worldPlacement(point, point.surfaceId),
    spatial: baseSpatial('object'),
    appearance: 'study:chest-plank-cache',
  };
  entitySet(world.entities, cache.id, cache);
  const place: PlaceDefinition = {
    id: layout.id,
    revision: 1,
    label: 'Broken Watchpost',
    description: layout.description,
    point,
    landmarkId: cache.id,
    exposure: { kind: 'arrive-and-see', radius: 9, importance: 8 },
  };
  world.places![place.id] = place;
  for (const resident of layout.occupants) {
    const p = ground(resident.position);
    entitySet(world.entities, resident.id, {
      id: resident.id,
      name: resident.name,
      appearance: resident.appearance,
      nameForm: 'proper',
      kind: 'npc',
      spatial: { ...baseSpatial('person'), heading: Math.PI },
      placement: worldPlacement(p, p.surfaceId),
      actor: makeActor(
        world,
        'npc',
        conditions?.[resident.id].fullness ?? 76,
        resident.identity,
        conditions?.[resident.id].energy,
      ),
    });
    world.memories[resident.id] = [];
    world.knowledge[resident.id] = [];
    addItem(world, resident.id, 'knife', 1);
    addItem(world, resident.id, 'cooked_meat', 2);
  }
  const knife = entityValues(world.entities).find(
    (e) =>
      e.item?.definitionPin.id === 'knife' &&
      e.placement?.mode === 'contained' &&
      e.placement.parentEntityId === 'kest',
  )!;
  // Their authored shared history binds names to these people, not to visitors.
  for (const observer of layout.occupants)
    for (const subject of layout.occupants)
      if (observer.id !== subject.id)
        assignGivenName(
          world,
          observer.id,
          { subjectId: subject.id, expectedRevision: 0, givenName: subject.name },
          [subject.id],
          true,
        );
  equipLot(world, 'kest', knife.id, 'authored-watchpost');
  equipLot(
    world,
    'kest',
    addItem(world, 'kest', shield.outputs[0]!.definition.id, 1),
    'authored-watchpost',
  );
  equipLot(
    world,
    'orin',
    addItem(world, 'orin', bow.outputs[0]!.definition.id, 1),
    'authored-watchpost',
  );
  addItem(world, 'orin', arrow.outputs[0]!.definition.id, 6);
  learnRecipe(world, 'kest', shield.id, 'authored', 'base:watchpost-loadout');
  learnRecipe(world, 'orin', bow.id, 'authored', 'base:watchpost-loadout');
  learnRecipe(world, 'orin', arrow.id, 'authored', 'base:watchpost-loadout');
  for (const [definitionId, quantity] of [
    ['field-sling-record', 1],
    ['cord', 2],
    ['prepared_fiber', 1],
    ['stone', 4],
    [arrow.outputs[0]!.definition.id, 4],
  ] as const)
    addItem(world, cache.id, definitionId, quantity);
  world.itemDefinitions['watchpost-directions'] = {
    id: 'watchpost-directions',
    version: 1,
    portable: true,
    packingLoad: 1,
    properties: [],
    name: 'Watchpost directions',
    description: `A workshop keeper’s note: “Broken Watchpost stands east of the clearing, around (${point.x}, ${point.z}). Two people kept a store there when I wrote this. The front gap is direct. For a longer covered approach, stay outside the long western wall, round the rear, and enter the eastern side gap. Leave by any opening if you wish.” This is an attributed old report, not knowledge of who or what remains now.`,
    placeReport: {
      kind: 'place',
      id: place.id,
      revision: place.revision,
      label: place.label,
      description: place.description,
      point: { ...place.point },
      locationLabel: 'Reported ground location',
      landmarkId: place.landmarkId,
      reportedBy: 'The workshop keeper’s written directions',
    },
  };
  addItem(world, 'riverside-workshop', 'watchpost-directions', 1);
}
