import { baseAnimalResponse } from './animal-response-profile.js';
import { BASE_RESOURCE_GATHERING_SECONDS } from './resources.js';
import { worldPlacement } from '../../spatial-state.js';
import { baseSpatial } from './spatial-definitions.js';
import { nativeActor } from './bodies.js';
import { nextEntityId } from '../../data.js';
import {
  createActor,
  MAX_SELECTED_PERSON_TRAITS,
  TRAIT_BANK,
  PERSON_VOICE_STEPS,
  RANDOM_PERSON_TRAITS,
} from './world.js';
import type {
  Entity,
  CharacterTrait,
  GodPersonDraft,
  GodPersonEditorDraft,
  GodSpawnDraft,
  WorldState,
} from '../../types.js';

export function personTraits(
  draft: Pick<GodPersonDraft | GodPersonEditorDraft, 'traitIds'>,
  existing: readonly CharacterTrait[] = [],
) {
  const ids = [...new Set(draft.traitIds)];
  if (ids.length > MAX_SELECTED_PERSON_TRAITS) return null;
  // Editing may retain a character's authored starting traits; creation can only select
  // catalogue traits. The current actor, not request JSON, supplies that extra vocabulary.
  const traits = ids.map(
    (id) =>
      TRAIT_BANK.find((trait) => trait.id === id) ?? existing.find((trait) => trait.id === id),
  );
  return traits.every((trait) => !!trait) ? traits.map((trait) => ({ ...trait! })) : null;
}

export function spawnSpatial(type: GodSpawnDraft['type']) {
  return baseSpatial(
    type === 'person' ? 'person' : type === 'hare' ? 'hare' : type === 'deer' ? 'deer' : 'object',
  );
}

/** Fresh selected-world inputs for a person. Release compilation uses its own RNG
 * copy and the same blank actor constructor as ordinary creator placement. */
export const PERSON_STARTING_STOCK = { stone_tool: 1, berries: 3 } as const;
export const PERSON_CREATION_CLEARANCE = 0.5;
const personActor = (world: WorldState, identity: Parameters<typeof createActor>[3]) =>
  createActor(world, 'npc', 75, identity);
export const PERSON_APPEARANCE = { event: 'god-spawned', text: 'appeared in the clearing.' };
export function personCreationTemplate(world: WorldState) {
  if (world.profile?.id !== 'grounded-wilderness') return null;
  const sample = { ...world, rngState: 1 };
  return {
    entity: {
      id: 'person-template',
      kind: 'npc',
      name: 'Person',
      nameForm: 'proper',
      placement: worldPlacement({ x: 0, y: 0, z: 0 }, 'template'),
      spatial: spawnSpatial('person'),
      actor: personActor(sample, { traits: [], initialGoals: [] }),
    },
    startingStock: PERSON_STARTING_STOCK,
    voice: PERSON_VOICE_STEPS,
    randomTraits: RANDOM_PERSON_TRAITS,
    appearance: PERSON_APPEARANCE,
    clearance: PERSON_CREATION_CLEARANCE,
  };
}

export function spawnedEntity(world: WorldState, draft: GodSpawnDraft): Entity | null {
  const id = nextEntityId(world, draft.type === 'person' ? 'person' : draft.type);
  const base = {
    id,
    placement: worldPlacement(
      { x: draft.position.x, y: draft.position.y, z: draft.position.z },
      draft.position.surfaceId,
    ),
    spatial: spawnSpatial(draft.type),
  };
  switch (draft.type) {
    case 'person': {
      if (!draft.person) return null;
      const traits = personTraits(draft.person);
      if (!traits) return null;
      return {
        ...base,
        name: draft.person.name.trim(),
        nameForm: 'proper',
        kind: 'npc',
        actor: personActor(world, {
          ...(traits.length ? { traits } : {}),
          personality: draft.person.personality.trim(),
          backstory: draft.person.backstory.trim(),
          initialGoals: draft.person.initialGoals,
        }),
      };
    }
    case 'banked-campfire':
      return {
        ...base,
        name: 'Banked campfire',
        kind: 'campfire',
        heat: { lit: true, fuelSeconds: 172800 },
      };
    case 'berry-bush':
    case 'berry-thicket':
      return {
        ...base,
        name: draft.type === 'berry-bush' ? 'Berry bush' : 'Berry thicket',
        kind: 'resource',
        resource: {
          definitionId: 'berries',
          quantity: 36,
          workSeconds: BASE_RESOURCE_GATHERING_SECONDS.berries,
        },
      };
    case 'dry-grass-fibers':
    case 'river-reeds':
      return {
        ...base,
        name: draft.type === 'river-reeds' ? 'River reeds' : 'Dry grass fibers',
        nameForm: 'plural',
        kind: 'resource',
        resource: {
          definitionId: 'raw_fiber',
          quantity: 36,
          workSeconds: BASE_RESOURCE_GATHERING_SECONDS.raw_fiber,
        },
      };
    case 'fallen-branches':
      return {
        ...base,
        name: 'Fallen branches',
        nameForm: 'plural',
        kind: 'resource',
        resource: {
          definitionId: 'wood',
          quantity: 36,
          workSeconds: BASE_RESOURCE_GATHERING_SECONDS.wood,
        },
      };
    case 'river-stones':
      return {
        ...base,
        name: 'River stones',
        nameForm: 'plural',
        kind: 'resource',
        resource: {
          definitionId: 'stone',
          quantity: 60,
          workSeconds: BASE_RESOURCE_GATHERING_SECONDS.stone,
        },
      };
    case 'hare':
    case 'deer':
      return {
        ...base,
        name: draft.type === 'hare' ? 'Hare' : 'Deer',
        kind: 'animal',
        actor: nativeActor(
          draft.type,
          world.simTime,
          world.moduleManifest.definitions.filter(
            (definition) => definition.id === 'wilderness:energy',
          ),
        ),
        animal: baseAnimalResponse(world, draft.type, draft.type === 'hare' ? 150 : 200),
      };
  }
}
