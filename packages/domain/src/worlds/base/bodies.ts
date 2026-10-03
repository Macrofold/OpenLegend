import { initializeAttributes } from '../../world-modules.js';
import type { AttributeDefinition } from '../../world-modules.js';
import { seedAgency } from '../../agency.js';
import type { ActorComponent } from '../../types.js';
import type { LivingBody } from '../../living.js';

// Authored starting anatomy and animal capabilities; lifecycle integrity remains generic.
// docs/worlds/base/survival.md
/** The bundled world's species; typed requests and bodies read this one list. */
export const BASE_SPECIES = ['human', 'deer', 'hare', 'construct', 'bird'] as const;
export function livingBody(species: (typeof BASE_SPECIES)[number]): LivingBody {
  return {
    plan:
      species === 'human' || species === 'construct'
        ? 'biped'
        : species === 'bird'
          ? 'avian'
          : 'quadruped',
    maxHealth: species === 'human' || species === 'construct' ? 100 : species === 'deer' ? 36 : 18,
    revision: 0,
    conditions: { injury: 0, wetness: 0, burning: 0 },
    susceptibility: { injury: 1, wetness: 1, burning: 1, healing: 1 },
    harvestYield:
      species === 'human' || species === 'construct'
        ? []
        : [
            { definitionId: 'raw_meat', quantity: species === 'deer' ? 4 : 2 },
            { definitionId: 'bone', quantity: species === 'deer' ? 3 : 2 },
          ],
  };
}
export function nativeActor(
  species: 'hare' | 'deer' | 'bird',
  bornAt: number,
  bindings: readonly AttributeDefinition[],
): ActorComponent {
  const actor: ActorComponent = {
    species,
    body: livingBody(species),
    controller: 'native',
    capabilities: {
      cognition: false,
      memory: false,
      innerWorld: false,
      speech: false,
    },
    health: species === 'deer' ? 36 : 18,
    alive: true,
    incapacitated: false,
    bornAt,
    action: null,
    equippedItemId: null,
    agency: seedAgency(),
    planGeneration: 0,
  };
  initializeAttributes(
    actor,
    [...bindings],
    Object.fromEntries(
      bindings
        .filter((definition) => definition.schema.kind === 'number')
        .map((definition) => [
          definition.id,
          definition.schema.kind === 'number' ? definition.schema.max : definition.schema.initial,
        ]),
    ),
  );
  return actor;
}
