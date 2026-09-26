import { worldPlacement } from './spatial-state.js';
import type { WorldCreationAccounts } from './invention-attribution.js';
import { seedAgency } from './agency.js';
import { DEFAULT_SENSES, COARSE_TOUCH } from './perception.js';
import { createWorld } from './data.js';
import { controlledEntityId, defaultResidentEntityId } from './identity.js';
import {
  createModuleManifest,
  DEFAULT_ATTRIBUTES,
  initializeAttributes,
  validateWorldModules,
  type AttributeDefinition,
} from './world-modules.js';
import { livingBody } from './living.js';
import type { WorldState } from './types.js';

/** Reviewed native demonstration data, not a generated invention or electrical solver. */
export const RESERVOIR_DEMO_ATTRIBUTES: AttributeDefinition[] = [
  {
    id: 'clockwork:charge',
    version: 1,
    implementation: 'reservoir-v1',
    name: 'Charge',
    disclosure: 'owner',
    presentation: 'neutral',
    schema: { kind: 'number', min: 0, max: 240, initial: 48, unit: 'units' },
    concern: {
      below: 60,
      text: 'My charge is low. I can replenish from a perceived compatible supply.',
    },
    reservoir: {
      drainPerSecond: 0.02,
      replenishPerSecond: 2,
      workSeconds: 120,
      actionLabel: 'Recharge',
    },
  },
  {
    id: 'clockwork:disposition',
    version: 1,
    implementation: 'category-v1',
    name: 'Disposition',
    disclosure: 'owner',
    presentation: 'neutral',
    schema: { kind: 'category', choices: ['cautious', 'curious'], initial: 'cautious' },
  },
];
export function createReservoirDemo(seed = 73, accounts?: WorldCreationAccounts): WorldState {
  const world = createWorld(seed, accounts);
  world.id = `reservoir-demo-${seed}`;
  world.moduleManifest = createModuleManifest([
    ...DEFAULT_ATTRIBUTES,
    ...RESERVOIR_DEMO_ATTRIBUTES,
  ]);
  for (const id of [controlledEntityId(world), defaultResidentEntityId(world)]) {
    if (!id) continue;
    const entity = world.entities[id]!;
    const actor = entity.actor!;
    actor.species = 'construct';
    actor.body = livingBody('construct');
    actor.capabilities!.needs = false;
    delete actor.fullness;
    delete actor.energy;
    delete entity.statusEffects;
    initializeAttributes(actor, RESERVOIR_DEMO_ATTRIBUTES);
    actor.agency = seedAgency(['Stay charged and explore the clearing.']);
  }
  world.entities['charge-bank'] = {
    spatial: { bodyProfileId: 'object', heading: 0 },
    id: 'charge-bank',
    name: 'Charged capacitor',
    kind: 'resource',
    placement: worldPlacement({ y: 0, x: 12, z: 13 }, 'terrain'),
    replenisher: { attributeId: 'clockwork:charge', remaining: 2400 },
  };
  validateWorldModules(world);
  return world;
}

/** The player retains normal sight; the resident has only coarse, unidentified contact. */
export function createTouchDemo(seed = 73, accounts?: WorldCreationAccounts): WorldState {
  const world = createReservoirDemo(seed, accounts);
  world.id = `touch-demo-${seed}`;
  world.moduleManifest = createModuleManifest(world.moduleManifest!.definitions, [
    ...DEFAULT_SENSES,
    COARSE_TOUCH,
  ]);
  const resident = world.entities[defaultResidentEntityId(world)]!;
  resident.actor!.senses = [COARSE_TOUCH.id];
  resident.actor!.contacts = {};
  resident.actor!.agency = seedAgency([
    'Explore by short direct probes; only contact is available.',
  ]);
  validateWorldModules(world);
  return world;
}
