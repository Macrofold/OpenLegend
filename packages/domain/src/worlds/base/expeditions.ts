import { addItem } from '../../data.js';
import { installRecipe } from '../../declarations.js';
import { recipeMechanicalPin } from '../../invention-families.js';
import { worldPlacement } from '../../spatial-state.js';
import { starterGroundAt } from './landscape.js';
import type { Entity, RecipeCandidate, WorldState } from '../../types.js';

/** One authored source for positions, stock and readable clues. New starts only.
 * docs/worlds/base/rewarding-expeditions.md */
export const EXPEDITION_LOCATIONS = {
  marker: { x: 13, y: 0, z: 10 },
  lookout: { x: 21.5, y: 3, z: 6, surfaceId: 'lookout-deck' },
  workshop: { x: 8, z: 33 },
} as const;

export const FIELD_SLING_METHOD: RecipeCandidate = {
  family: { id: 'base:swing', version: 1 },
  name: 'Field sling',
  description: 'An authored field method: bind a flexible fiber pouch between two lengths of cord.',
  inputs: [
    { definitionId: 'cord', quantity: 2, role: 'binding' },
    { definitionId: 'prepared_fiber', quantity: 1, role: 'pouch' },
  ],
  output: {
    name: 'Field sling',
    description: 'A flexible pouch and two cords for launching a small stone.',
  },
  parameters: { workSeconds: 180, damage: 14, range: 6, accuracy: 0.75 },
};

export function installExpeditions(world: WorldState): void {
  const { recipe } = installRecipe(world, FIELD_SLING_METHOD, {
    source: 'authored-world',
    profile: { ...world.profile },
  });
  world.itemDefinitions['workshop-directions'] = {
    id: 'workshop-directions',
    version: 1,
    portable: true,
    packingLoad: 1,
    name: 'Workshop directions',
    properties: [],
    description:
      'A weathered note: “For the riverside workshop, return down the lookout ramp. Walk back toward camp, then follow the river away from the lookout into the outer meadow, staying on the same bank as camp. A low workbench stands beside the water before the far river reeds. Keep near the bank for a longer route around the hoof-churned woodland; no animal needs to be defeated. The workshop has a written production method, if its record remains.”',
    mechanismFields: { story_importance: { story_importance: 8 } },
  };
  world.itemDefinitions['field-sling-record'] = {
    id: 'field-sling-record',
    version: 1,
    portable: true,
    packingLoad: 1,
    name: 'Field sling recipe record',
    properties: [],
    description:
      'A folded workshop record for a known authored field-sling method. Inspect it to read the exact output, ingredients and work, then explicitly choose Learn this method. Reading it makes no item and is separate from inventing a new method with live AI.',
    recipeRecord: { method: recipeMechanicalPin(recipe), disclosure: 'method' },
    mechanismFields: { story_importance: { story_importance: 8 } },
  };
  for (const [id, name, description] of [
    [
      'lookout-equipment-case',
      'Lookout equipment case',
      'A portable weathered equipment case. Inspect its contents to find what actually remains.',
    ],
    [
      'workshop-supply-satchel',
      'Workshop supply satchel',
      'A portable workshop satchel. Its exterior does not reveal the supplies or records inside; explicitly inspect its contents.',
    ],
  ] as const) {
    world.itemDefinitions[id] = {
      ...structuredClone(world.itemDefinitions['woven_bag']!),
      id,
      name,
      description,
      mechanismFields: { story_importance: { story_importance: 8 } },
    };
  }
  const workshop = starterGroundAt(
    world.map.spatial!,
    EXPEDITION_LOCATIONS.workshop.x,
    EXPEDITION_LOCATIONS.workshop.z,
  );
  const entities: Entity[] = [
    {
      id: 'camp-route-marker',
      name: 'Camp route marker',
      kind: 'resource',
      description:
        'A weathered arrow points toward the raised timber lookout beyond the camp rocks. Its stone ramp rises on the far side: walk around the rocks to reach the foot, then up the ramp. An abandoned equipment bundle and a written clue were left on the deck; their contents may have been taken. This is a direction, not a quest to accept.',
      placement: worldPlacement(EXPEDITION_LOCATIONS.marker, 'terrain'),
      spatial: { bodyProfileId: 'object', heading: 0 },
      appearance: 'crate-mesh',
    },
    {
      id: 'lookout-equipment',
      name: 'Lookout equipment bundle',
      kind: 'item-pile',
      description:
        'A weathered ground bundle rests on the abandoned lookout deck. Reach it and inspect its actual remaining contents.',
      placement: worldPlacement(
        EXPEDITION_LOCATIONS.lookout,
        EXPEDITION_LOCATIONS.lookout.surfaceId,
      ),
      spatial: { bodyProfileId: 'object', heading: 0 },
    },
    {
      id: 'riverside-workshop',
      name: 'Riverside workshop',
      kind: 'item-pile',
      description:
        'An abandoned open workbench stands on the riverbank before the distant reeds. Reach it and inspect the supplies and physical records that actually remain. Nothing here replenishes when opened.',
      placement: worldPlacement(workshop, workshop.surfaceId),
      spatial: { bodyProfileId: 'object', heading: 0 },
      appearance: 'crate-mesh',
    },
  ];
  for (const entity of entities) world.entities[entity.id] = entity;
  const lookoutCase = addItem(world, 'lookout-equipment', 'lookout-equipment-case', 1);
  const workshopSatchel = addItem(world, 'riverside-workshop', 'workshop-supply-satchel', 1);
  addItem(world, lookoutCase, 'spear', 1);
  addItem(world, lookoutCase, 'workshop-directions', 1);
  addItem(world, workshopSatchel, 'field-sling-record', 1);
  addItem(world, workshopSatchel, 'cord', 2);
  // Exposed shelter-process fiber uses ordinary ground custody; nested moisture is unsupported.
  // docs/worlds/base/editable-shelters.md#initial-exposed-forms-and-condition-labels
  addItem(world, 'riverside-workshop', 'prepared_fiber', 1);
  addItem(world, workshopSatchel, 'stone', 4);
  world.places!['abandoned-lookout'] = {
    id: 'abandoned-lookout',
    revision: 1,
    label: 'Abandoned lookout',
    description:
      'A raised timber lookout reached by its stone ramp. The old wood source remains; a ground bundle can hold useful equipment and a physical workshop clue. Inspect its current stock rather than assuming it remains.',
    landmarkId: 'lookout-equipment',
    point: { ...EXPEDITION_LOCATIONS.lookout },
    exposure: { kind: 'arrive-and-see', radius: 2, importance: 8 },
    mechanismFields: { story_importance: { story_importance: 8 } },
  };
  world.places!['riverside-workshop'] = {
    id: 'riverside-workshop',
    revision: 1,
    label: 'Riverside workshop',
    description:
      'An abandoned open riverbank workbench, reached without crossing the water. Inspect the real remaining supplies and readable method record before choosing to learn or take anything.',
    landmarkId: 'riverside-workshop',
    point: { ...workshop },
    exposure: { kind: 'arrive-and-see', radius: 2, importance: 8 },
    mechanismFields: { story_importance: { story_importance: 8 } },
  };
}
