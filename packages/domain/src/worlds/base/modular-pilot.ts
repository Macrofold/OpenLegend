import { assetRevisionKey } from '@open-legend/assets';
import {
  sameAppearanceFamily,
  validateAppearanceFamily,
  type AppearanceFamilyDefinition,
  type AppearanceRecipe,
} from '../../appearance.js';
import { appearanceFor, setAppearance, validateAppearanceState } from '../../appearance-state.js';
import { addItem, reserveEntityId } from '../../data.js';
import { entityGet, entitySet } from '../../entity-collection.js';
import { rootMembershipChanged, worldRootEntities } from '../../entity-index.js';
import { canonicalJson } from '../../events.js';
import { migrateCognition } from '../../experience.js';
import { equipLot } from '../../objects.js';
import { distance } from '../../spatial.js';
import { worldPlacement, worldPosition } from '../../spatial-state.js';
import type { Entity, GodPersonDraft, ItemDefinition, WorldState } from '../../types.js';
import { MARA_ID, TAVIN_ID } from './missing-belonging.js';
import { starterGroundAt } from './landscape.js';
import { BASE_BODY_PROFILES, baseSpatial } from './spatial-definitions.js';
import { createActor } from './world.js';

/** Private local pilot selection; existing cast and production artwork stay separate.
 * docs/projects/metahuman-foundation-poc-tech-design.md#11-stop-conditions-adoption-and-extension */
export const BASE_MODULAR_PILOT_ASSET = {
  owner: { kind: 'collection', id: 'openlegend-curated' },
  assetId: 'metahuman-vivian-pilot-family',
} as const;
export const BASE_MODULAR_PILOT_PERSON_ID = 'nessa-vale';
export const BASE_MODULAR_PILOT_OUTFIT_ID = 'courier-shirt-and-shorts';

const outfit: ItemDefinition = {
  id: BASE_MODULAR_PILOT_OUTFIT_ID,
  version: 1,
  name: 'Courier shirt and shorts',
  description: 'A green short-sleeved shirt and tan shorts, worn as one outfit.',
  portable: true,
  packingLoad: 1,
  properties: ['fiber'],
  equipment: { ports: ['torso', 'legs'], uses: [] },
};

function selectedPilotFamily(families: readonly AppearanceFamilyDefinition[]) {
  const selected = families.filter(
    (family) =>
      family.reference.owner.kind === BASE_MODULAR_PILOT_ASSET.owner.kind &&
      family.reference.owner.id === BASE_MODULAR_PILOT_ASSET.owner.id &&
      family.reference.assetId === BASE_MODULAR_PILOT_ASSET.assetId,
  );
  if (selected.length > 1) throw new Error('Select one courier appearance collection.');
  return selected[0];
}

/** Installs creator vocabulary only. Selecting artwork never creates a person,
 * changes a body or equips an item in an existing world. */
export function installBaseModularPilotKit(
  world: WorldState,
  families: readonly AppearanceFamilyDefinition[],
): void {
  const family = selectedPilotFamily(families);
  if (!family) return;
  validateAppearanceFamily(family);
  if (!family.compiled || !family.compiledPath)
    throw new Error('The courier appearance collection is not ready to use.');
  const key = assetRevisionKey(family.reference),
    previous = world.appearanceDefinitions;
  if (previous?.families[key] && canonicalJson(previous.families[key]) !== canonicalJson(family))
    throw new Error('An installed appearance release cannot be replaced in place.');
  const wearable = {
    family: family.reference,
    partId: 'nativeDefaultGarment',
    defaultForCreation: true,
  };
  if (
    (world.itemDefinitions[outfit.id] &&
      canonicalJson(world.itemDefinitions[outfit.id]) !== canonicalJson(outfit)) ||
    (previous?.wearables[outfit.id] &&
      canonicalJson(previous.wearables[outfit.id]) !== canonicalJson(wearable))
  )
    throw new Error('The courier outfit conflicts with an installed item.');
  const definitions = {
    families: { ...previous?.families, [key]: family },
    wearables: { ...previous?.wearables, [outfit.id]: wearable },
    stature: {
      ...previous?.stature,
      [key]: { controlId: 'stature', referenceBody: { ...BASE_BODY_PROFILES.person } },
    },
  };
  const itemDefinitions = { ...world.itemDefinitions, [outfit.id]: structuredClone(outfit) };
  validateAppearanceState({ ...world, itemDefinitions, appearanceDefinitions: definitions });
  world.itemDefinitions = itemDefinitions;
  world.appearanceDefinitions = definitions;
}

/** Fresh Main content only. Existing worlds add people through ordinary creation. */
export function populateBaseModularPilot(world: WorldState): void {
  const family = selectedPilotFamily(Object.values(world.appearanceDefinitions?.families ?? {}));
  if (!family) return;
  // Saved openings have no Main/solo discriminator. These existing Main scenario
  // identities keep optional installation out of deliberately solitary/custom starts.
  if (!entityGet(world.entities, MARA_ID) || !entityGet(world.entities, TAVIN_ID)) return;
  const existing = entityGet(world.entities, BASE_MODULAR_PILOT_PERSON_ID);
  if (existing) {
    const appearance = appearanceFor(world, existing);
    if (
      existing.actor &&
      appearance &&
      sameAppearanceFamily(appearance.recipe.family, family.reference)
    )
      return;
    throw new Error('The courier identity is already used by another person or object.');
  }
  const position = starterGroundAt(world.map.spatial!, 10, 14);
  if (worldRootEntities(world).some((entity) => distance(worldPosition(entity), position) < 0.5))
    throw new Error('Clear space beside the camp before adding the courier.');
  const authored = baseModularPilotPerson(family);
  const person: Entity = {
    id: BASE_MODULAR_PILOT_PERSON_ID,
    name: authored.name,
    nameForm: 'proper',
    description: 'An adult travelling courier with an athletic build and a shaved head.',
    kind: 'npc',
    icon: 'person.wayfarer',
    spatial: baseSpatial('person'),
    placement: worldPlacement(position, position.surfaceId),
    actor: createActor(world, 'npc', 75, {
      traits: [],
      personality: authored.personality,
      backstory: authored.backstory,
      initialGoals: authored.initialGoals,
    }),
  };
  reserveEntityId(world, person.id);
  entitySet(world.entities, person.id, person);
  rootMembershipChanged(world, person.id);
  const wearer = entityGet(world.entities, person.id)!;
  setAppearance(world, wearer, authored.appearance, 0, 0);
  world.memories[person.id] = [];
  world.knowledge[person.id] = [];
  equipLot(world, person.id, addItem(world, person.id, outfit.id, 1), 'authored-starting-outfit');
  migrateCognition(world);
}

/** The same world-authored brief can feed the existing Create Person request. */
export function baseModularPilotPerson(family: AppearanceFamilyDefinition) {
  return {
    name: 'Nessa Vale',
    personality: 'Patient and observant; values clear agreements and her independence.',
    backstory:
      'An adult courier who has travelled between small settlements carrying letters and lightweight parcels.',
    traitIds: [],
    initialGoals: [],
    appearance: {
      family: family.reference,
      controls: {
        frame: 0,
        stature: 1.68,
        age: 30,
        muscle: 0.7,
        noseWidth: 0.5,
        jawWidth: 0.5,
      },
      selections: {
        face: 'vivian',
        coverage: 'linenUnderwear',
        hair: 'bald',
        brows: 'natural',
        eyeColor: 'brown',
        accessory: 'none',
      },
    } satisfies AppearanceRecipe,
    initialOutfit: [outfit.id],
  } satisfies GodPersonDraft;
}
