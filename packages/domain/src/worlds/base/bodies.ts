import { seedAgency } from '../../agency.js';
import type { ActorComponent } from '../../types.js';
import type { LivingBody } from '../../living.js';

// Authored starting anatomy and animal capabilities; lifecycle integrity remains generic.
// docs/worlds/base/survival.md
export function livingBody(species: 'human' | 'deer' | 'hare' | 'construct' | 'bird'): LivingBody {
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
export function nativeActor(species: 'hare' | 'deer' | 'bird', bornAt: number): ActorComponent {
  return {
    species,
    body: livingBody(species),
    controller: 'native',
    capabilities: {
      cognition: false,
      memory: false,
      innerWorld: false,
      speech: false,
      needs: false,
    },
    health: species === 'deer' ? 36 : 18,
    alive: true,
    incapacitated: false,
    bornAt,
    fullness: 100,
    energy: 100,
    action: null,
    equippedItemId: null,
    agency: seedAgency(),
    planGeneration: 0,
  };
}
