import { groundedSpatial } from '../../spatial-state.js';
import { nativeActor } from './bodies.js';
import { nextId } from '../../data.js';
import { createActor, TRAIT_BANK } from './world.js';
import type {
  Entity,
  GodPersonDraft,
  GodPersonEditorDraft,
  GodSpawnDraft,
  WorldState,
} from '../../types.js';

export function personTraits(draft: Pick<GodPersonDraft | GodPersonEditorDraft, 'traitIds'>) {
  const ids = [...new Set(draft.traitIds)];
  if (ids.length > 8) return null;
  const traits = ids.map((id) => TRAIT_BANK.find((trait) => trait.id === id));
  return traits.every((trait) => !!trait) ? traits.map((trait) => ({ ...trait! })) : null;
}

export function spawnedEntity(world: WorldState, draft: GodSpawnDraft): Entity | null {
  const id = nextId(world, draft.type === 'person' ? 'person' : draft.type);
  const base = {
    id,
    position: { x: draft.position.x, y: draft.position.y, z: draft.position.z },
    spatial: groundedSpatial(
      draft.type === 'person'
        ? 'person'
        : draft.type === 'hare'
          ? 'hare'
          : draft.type === 'deer'
            ? 'deer'
            : 'object',
      draft.position.surfaceId,
    ),
  };
  switch (draft.type) {
    case 'person': {
      if (!draft.person) return null;
      const traits = personTraits(draft.person);
      if (!traits) return null;
      return {
        ...base,
        name: draft.person.name.trim(),
        kind: 'npc',
        actor: createActor(world, 'npc', 75, {
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
        resource: { definitionId: 'berries', quantity: 36, workSeconds: 30 },
      };
    case 'dry-grass-fibers':
    case 'river-reeds':
      return {
        ...base,
        name: draft.type === 'river-reeds' ? 'River reeds' : 'Dry grass fibers',
        kind: 'resource',
        resource: { definitionId: 'raw_fiber', quantity: 36, workSeconds: 36 },
      };
    case 'fallen-branches':
      return {
        ...base,
        name: 'Fallen branches',
        kind: 'resource',
        resource: { definitionId: 'wood', quantity: 36, workSeconds: 42 },
      };
    case 'river-stones':
      return {
        ...base,
        name: 'River stones',
        kind: 'resource',
        resource: { definitionId: 'stone', quantity: 60, workSeconds: 24 },
      };
    case 'hare':
    case 'deer':
      return {
        ...base,
        name: draft.type === 'hare' ? 'Hare' : 'Deer',
        kind: 'animal',
        actor: nativeActor(draft.type, world.simTime),
        animal: {
          fleeFrom: null,
          fleeSeconds: 0,
          wanderSeconds: draft.type === 'hare' ? 150 : 200,
        },
      };
  }
}
