import { baseSpatial } from './spatial-definitions.js';
import { addItem } from '../../data.js';
import { worldPlacement } from '../../spatial-state.js';
import { MARA_IDENTITY, TAVIN_IDENTITY } from './characters.js';
import { assignGivenName } from './knowledge.js';
import { starterGroundAt } from './landscape.js';
import { createActor, PLAYER_ID } from './world.js';
import type { Entity, WorldState } from '../../types.js';

/** Authored starting state for the missing-belonging investigation. New starts only.
 * docs/worlds/base/missing-belonging.md
 */
export const MARA_ID = 'mara';
export const TAVIN_ID = 'tavin';

export const MISSING_BELONGING_LOCATIONS = {
  mara: { x: 9.5, z: 13.5 },
  clearingMarker: { x: 11, z: 16.5 },
  mendingClearing: { x: 11, z: 18 },
  tavin: { x: 9.5, z: 18 },
  reedSideStore: { x: 11, z: 22.5 },
} as const;

export const MARA_STARTING_BELIEFS =
  '# Beliefs\nI left my red-stitched satchel at the Mending Clearing work spot beside the rough stone before a walk; when I returned, the bag was gone and a torn red fastening strap with blue cross-stitching remained. The satchel has “Mara Reed” stitched on the exterior flap and held two lengths of cord when I left it. I saw Tavin carrying a bundle earlier, though I did not see him take my satchel, and I suspect a connection.';

export const TAVIN_STARTING_BELIEFS =
  '# Beliefs\nEarlier today I moved an unattended red-stitched bag from the Mending Clearing work spot beside the rough stone to the Reed-side Store beside the split stone while clearing room for my work, assuming it was shared equipment. Its red fastening strap snagged on the rough stone edge as I lifted it, and I left a sorting note at the work spot. I neither inspected the bag’s contents nor identified its owner.';

export function installMissingBelonging(world: WorldState, playerId = PLAYER_ID): void {
  const layout = world.map.spatial!;
  const maraPoint = starterGroundAt(
    layout,
    MISSING_BELONGING_LOCATIONS.mara.x,
    MISSING_BELONGING_LOCATIONS.mara.z,
  );
  const clearingMarker = starterGroundAt(
    layout,
    MISSING_BELONGING_LOCATIONS.clearingMarker.x,
    MISSING_BELONGING_LOCATIONS.clearingMarker.z,
  );
  const mendingSpot = starterGroundAt(
    layout,
    MISSING_BELONGING_LOCATIONS.mendingClearing.x,
    MISSING_BELONGING_LOCATIONS.mendingClearing.z,
  );
  const tavinPoint = starterGroundAt(
    layout,
    MISSING_BELONGING_LOCATIONS.tavin.x,
    MISSING_BELONGING_LOCATIONS.tavin.z,
  );
  const reedStore = starterGroundAt(
    layout,
    MISSING_BELONGING_LOCATIONS.reedSideStore.x,
    MISSING_BELONGING_LOCATIONS.reedSideStore.z,
  );

  const entities: Entity[] = [
    {
      id: MARA_ID,
      name: 'Mara Reed',
      appearance: 'study:mara-travel-coat',
      nameForm: 'proper',
      description: MARA_IDENTITY.description,
      kind: 'npc',
      spatial: baseSpatial('person'),
      placement: worldPlacement(maraPoint, maraPoint.surfaceId),
      actor: createActor(world, 'npc', 72, MARA_IDENTITY),
    },
    {
      id: TAVIN_ID,
      name: 'Tavin Vale',
      appearance: 'study:tavin-work-vest',
      nameForm: 'proper',
      description: TAVIN_IDENTITY.description,
      kind: 'npc',
      spatial: baseSpatial('person'),
      placement: worldPlacement(tavinPoint, tavinPoint.surfaceId),
      actor: createActor(world, 'npc', 74, TAVIN_IDENTITY),
    },
    {
      id: 'mending-clearing-marker',
      name: 'Mending Clearing marker',
      kind: 'resource',
      description:
        'A carved wooden marker identifies the Mending Clearing work area beside the rough stone and points south along the reed edge toward the Reed-side Store beside the split stone. Inspect what actually remains at each spot.',
      placement: worldPlacement(clearingMarker, clearingMarker.surfaceId),
      spatial: baseSpatial('object'),
      appearance: 'study:marker-single-board',
    },
    {
      id: 'mending-clearing-spot',
      name: 'Mending Clearing work spot',
      kind: 'item-pile',
      description:
        'A ground work spot beside a rough mending stone in the Mending Clearing. Reach it and inspect what actually rests here.',
      placement: worldPlacement(mendingSpot, mendingSpot.surfaceId),
      spatial: baseSpatial('object'),
    },
    {
      id: 'reed-side-store-pile',
      name: 'Reed-side Store',
      kind: 'item-pile',
      description:
        'A dry storage spot beside a split stone near the river reeds. Reach it and inspect what actually rests here.',
      placement: worldPlacement(reedStore, reedStore.surfaceId),
      spatial: baseSpatial('object'),
      appearance: 'study:supplies-open-box',
    },
  ];
  for (const entity of entities) world.entities[entity.id] = entity;

  for (const id of [MARA_ID, TAVIN_ID]) {
    world.memories[id] = [];
    world.knowledge[id] = [];
    addItem(world, id, 'stone_tool', 1);
    addItem(world, id, 'knife', 1);
  }

  addItem(world, 'mending-clearing-spot', 'torn_red_fastening', 1);
  addItem(world, 'mending-clearing-spot', 'tavins_sorting_note', 1);
  const satchelId = addItem(world, 'reed-side-store-pile', 'red_stitched_satchel', 1);
  addItem(world, satchelId, 'cord', 2);
  // Exposed shelter-process fiber uses ordinary ground custody; nested moisture is unsupported.
  // docs/worlds/base/editable-shelters.md#initial-exposed-forms-and-condition-labels
  addItem(world, 'reed-side-store-pile', 'prepared_fiber', 1);

  world.places!['mending-clearing'] = {
    ...world.places!['mending-clearing']!,
    point: { ...mendingSpot },
  };
  world.places!['reed-side-store'] = {
    ...world.places!['reed-side-store']!,
    point: { ...reedStore },
  };

  world.actorKnowledge ??= {};
  world.actorKnowledge[MARA_ID] = {
    general: {
      origin: 'authored-starting',
      subjectId: null,
      text: MARA_STARTING_BELIEFS,
      revision: 1,
      evidenceIds: [],
    },
  };
  world.actorKnowledge[TAVIN_ID] = {
    general: {
      origin: 'authored-starting',
      subjectId: null,
      text: TAVIN_STARTING_BELIEFS,
      revision: 1,
      evidenceIds: [],
    },
  };

  assignGivenName(
    world,
    playerId,
    { subjectId: MARA_ID, expectedRevision: 0, givenName: 'Mara Reed' },
    [MARA_ID],
    true,
  );
  assignGivenName(
    world,
    playerId,
    { subjectId: TAVIN_ID, expectedRevision: 0, givenName: 'Tavin Vale' },
    [TAVIN_ID],
    true,
  );
  assignGivenName(
    world,
    MARA_ID,
    { subjectId: TAVIN_ID, expectedRevision: 0, givenName: 'Tavin Vale' },
    [TAVIN_ID],
    true,
  );
  assignGivenName(
    world,
    TAVIN_ID,
    { subjectId: MARA_ID, expectedRevision: 0, givenName: 'Mara Reed' },
    [MARA_ID],
    true,
  );
}
