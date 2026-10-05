import { worldPlacement } from './spatial-state.js';
import type { WorldCreationAccounts } from './invention-attribution.js';
import { seedAgency } from './agency.js';
import { DEFAULT_SENSES, COARSE_TOUCH } from './perception.js';
import { createWorld } from './data.js';
import { controlledEntityId, defaultResidentEntityId } from './identity.js';
import {
  createModuleManifest,
  initializeAttributes,
  validateWorldModules,
  type AttributeDefinition,
} from './world-modules.js';
import { DEFAULT_SENSES as BASE_SENSES } from './perception.js';
import type { BodyPolicy } from './body-policy.js';
import { livingBody } from './living.js';
import type { WorldState } from './types.js';
import { activityHostPin } from './activity-hosts.js';
import { RESERVOIR_ACTIVITY_HOST } from './worlds/reservoir-demo/activity.js';

/** Reviewed native demonstration data, not a generated invention or electrical solver. */
export const RESERVOIR_DEMO_ATTRIBUTES: AttributeDefinition[] = [
  {
    id: 'clockwork:charge',
    version: 1,
    implementation: 'reservoir-v1',
    name: 'Charge',
    disclosure: 'owner',
    presentation: { icon: 'meter.neutral', color: 'meter.neutral' },
    schema: { kind: 'number', min: 0, max: 240, initial: 48, unit: 'units' },
    concern: {
      below: 60,
      mode: 'latched',
      notify: true,
      reconsider: true,
      recoveryMargin: 12,
      text: 'My charge is low. I can replenish from a perceived compatible supply.',
    },
    critical: { concernActive: true },
    editorCritical: { concernActive: true },
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
    presentation: { icon: 'meter.neutral', color: 'meter.neutral' },
    schema: { kind: 'category', choices: ['cautious', 'curious'], initial: 'cautious' },
  },
];
export function createReservoirDemo(seed = 73, accounts?: WorldCreationAccounts): WorldState {
  const world = createWorld(seed, accounts);
  world.id = `reservoir-demo-${seed}`;
  world.presentation = {
    worldName: 'Clockwork inhabitants',
    locationName: 'The clockwork camp',
    timeLabel: 'Time in this world',
  };
  const integrity: AttributeDefinition = {
    id: 'clockwork:integrity',
    version: 1,
    implementation: 'native-health-v1',
    name: 'Integrity',
    disclosure: 'owner',
    presentation: { icon: 'meter.health', color: 'meter.health' },
    schema: { kind: 'number', min: 0, max: 100, initial: 100, unit: '%' },
    meaning: 'Integrity measures the condition of this constructed body.',
  };
  const policy: BodyPolicy = {
    id: 'clockwork:body-policy',
    version: 1,
    zeroHealth: {
      player: 'incapacitate',
      npc: 'die',
      native: 'die',
      incapacitateNarration: '{subject.name:definite} stopped moving.',
      deathNarration: '{subject.name:definite} broke down.',
    },
    remains: null,
    recovery: null,
    revival: { fillToMaximum: ['clockwork:charge'] },
    consumption: null,
    carryingConcern: null,
    backgroundThinking: {
      maintenanceBlockedWhen: null,
      commitBlockedWhen: null,
      reflectionBlockedWhen: null,
      reconsiderationInputs: [],
    },
  };
  world.moduleManifest = createModuleManifest(
    [integrity, ...RESERVOIR_DEMO_ATTRIBUTES],
    BASE_SENSES,
    policy,
    world.moduleManifest.recipeFamilies,
    [activityHostPin(RESERVOIR_ACTIVITY_HOST)],
  );
  world.statusEffectPolicy = { revision: 1, clockOffsetHours: 0, namedTimes: {}, definitions: [] };
  world.cognitionPolicy = { ...world.cognitionPolicy, dream: null };
  for (const entity of Object.values(world.entities)) {
    const actor = entity.actor;
    if (!actor) continue;
    // This is new-world composition, not conversion of an existing saved world.
    actor.attributes = {};
    delete actor.conditions;
    delete entity.statusEffects;
    if (actor.action?.type === 'status-effect') actor.action = null;
    initializeAttributes(actor, RESERVOIR_DEMO_ATTRIBUTES);
    if (actor.controller !== 'native') {
      actor.species = 'construct';
      actor.body = livingBody('construct');
      actor.agency = seedAgency(['Stay charged and explore the clearing.']);
      const identity = world.minds?.[entity.id]?.documents.find(
        (document) => document.id === 'identity',
      );
      if (identity) identity.text = `I am ${entity.name}, a clockwork inhabitant of this clearing.`;
    }
  }
  world.entities['charge-bank'] = {
    icon: 'meter.energy',
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
  const manifest = world.moduleManifest;
  world.moduleManifest = createModuleManifest(
    manifest.definitions,
    [...DEFAULT_SENSES, COARSE_TOUCH],
    manifest.bodyPolicy,
    manifest.recipeFamilies,
    manifest.activityHosts,
  );
  const resident = world.entities[defaultResidentEntityId(world)]!;
  resident.actor!.senses = [COARSE_TOUCH.id];
  resident.actor!.contacts = {};
  resident.actor!.agency = seedAgency([
    'Explore by short direct probes; only contact is available.',
  ]);
  validateWorldModules(world);
  return world;
}
