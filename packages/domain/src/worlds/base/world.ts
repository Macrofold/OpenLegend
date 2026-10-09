import {
  STARTER_EXTENT,
  starterTiles,
  starterScenery,
  populateOuterWilderness,
} from './landscape.js';
import { emptyActionExperience } from '../../action-experience.js';
import { ADA_IDENTITY } from './characters.js';
import { installKnownShieldMethod } from './shield-family.js';
import { startingRecipeKnowledge } from './knowledge.js';
import { worldPlacement } from '../../spatial-state.js';
import { BASE_PARTICIPATION_POLICY } from './participation.js';
import { NATIVE_STRIKES } from './strikes.js';
import { STAG_CONTACT, installFirstThreat } from './first-threat.js';
import { addItem, nextRandom, nextId } from '../../data.js';
import { BASE_ITEM_HANDLING } from './item-handling.js';
import { NATIVE_ITEMS } from './items.js';
import { DEFAULT_STATUS_EFFECT_POLICY } from './status-effects.js';
import {
  starterSpatialLayout,
  starterFlightRoutes,
  validateSpatialWorld,
} from '../../spatial-state.js';
import {
  validateInventionAttribution,
  type WorldCreationAccounts,
} from '../../invention-attribution.js';
import { initialInventionPolicy } from '../../invention-policy.js';
import { seedAgency } from '../../agency.js';
import { BASE_RECIPE_FAMILIES } from './recipe-families.js';
import { definitionPin } from '../../world-modules.js';
import { DEFAULT_ATTRIBUTES } from './attributes.js';
import { DEFAULT_SENSES } from '../../perception.js';
import { BASE_BODY_POLICY } from './body-policy.js';
import { DEFAULT_COGNITION_POLICY } from './cognition.js';
import { initializeAttributes, createModuleManifest } from '../../world-modules.js';
import { activityHostPins } from '../../activity-hosts.js';
import { initializeIdentity } from '../../identity.js';
import { defaultStoryPolicy } from '../../story-selection.js';
import { BASE_PLACES } from './places.js';
import { livingBody, nativeActor, hasMemory } from '../../living.js';
import traitBank from './config/traits.json' with { type: 'json' };
import { migrateCognition } from '../../experience.js';
import type { ActorComponent, CharacterTrait, Entity, WorldState } from '../../types.js';

export const PLAYER_ID = 'entity-0001';
export const NPC_ID = 'entity-0002';
const MERCENARY_ID = 'peacock-mercenary';
export const TRAIT_BANK: readonly CharacterTrait[] = traitBank;
export { NATIVE_ITEMS, NATIVE_PREPARATIONS } from './items.js';
export function createActor(
  world: WorldState,
  controller: 'player' | 'npc',
  fullness: number,
  identity: {
    traits?: CharacterTrait[];
    personality?: string;
    backstory?: string;
    initialGoals?: string[];
  } = {},
): ActorComponent {
  const initialGoals = identity.initialGoals?.map((goal) => goal.trim()).filter(Boolean);
  const actor: ActorComponent = {
    traits: identity.traits?.map((trait) => ({ ...trait })) ?? sampleTraits(world),
    ...(identity.personality ? { personality: identity.personality } : {}),
    ...(identity.backstory ? { backstory: identity.backstory } : {}),
    ...(initialGoals !== undefined ? { initialGoals } : {}),
    controller,
    species: 'human',
    body: livingBody('human'),
    capabilities: { cognition: true, memory: true, innerWorld: true, speech: true },
    health: 100,
    alive: true,
    incapacitated: false,
    bornAt: -24 * 365 * 86400,
    action: null,
    agency: seedAgency(
      initialGoals !== undefined
        ? initialGoals
        : [
            controller === 'npc'
              ? 'Stay fed, learn useful techniques, and get to know the newcomer.'
              : 'Make a life in the wild.',
          ],
    ),
    planGeneration: 0,
  };
  const meters = world.moduleManifest.definitions.filter(
    (definition) =>
      definition.id === 'wilderness:fullness' || definition.id === 'wilderness:energy',
  );
  const food = meters.find((definition) => definition.id === 'wilderness:fullness');
  // Starting food is authored as a fraction of this world's installed range.
  const initial: Record<string, number> =
    food?.schema.kind === 'number'
      ? {
          'wilderness:fullness':
            food.schema.min + ((food.schema.max - food.schema.min) * fullness) / 100,
        }
      : {};
  initializeAttributes(actor, meters, initial);
  return actor;
}

/** A primitive camp and generic material families; there is deliberately no seeded sling or bow recipe. */
export function createWorld(
  seed = 73,
  accounts: WorldCreationAccounts = {
    creatorAccountIds: ['local-player'],
    playerAccountId: 'local-player',
  },
): WorldState {
  const normalizedSeed = Number.isInteger(seed) ? seed >>> 0 : 73;
  const world: WorldState = {
    perceptionFeatures: {},
    schemaVersion: 10,
    actionExperience: emptyActionExperience(),
    participationPolicy: structuredClone(BASE_PARTICIPATION_POLICY),
    itemHandling: structuredClone(BASE_ITEM_HANDLING),
    statusEffectPolicy: structuredClone(DEFAULT_STATUS_EFFECT_POLICY),
    authorship: {
      creatorAccountIds: [...accounts.creatorAccountIds],
      playerAccountIds: { [PLAYER_ID]: accounts.playerAccountId },
    },
    inventionPolicy: initialInventionPolicy(),
    moduleManifest: createModuleManifest(
      DEFAULT_ATTRIBUTES,
      DEFAULT_SENSES,
      BASE_BODY_POLICY,
      BASE_RECIPE_FAMILIES.map((family) => definitionPin(family.definition)),
      activityHostPins(),
    ),
    cognitionPolicy: structuredClone(DEFAULT_COGNITION_POLICY),
    storyPolicy: defaultStoryPolicy(),
    visibleObjects: {},
    places: structuredClone(BASE_PLACES),
    visiblePlaces: {},
    id: `wilderness-${normalizedSeed}`,
    seed: normalizedSeed,
    rngState: normalizedSeed || 0x6d2b79f5,
    sequence: 0,
    simTime: 0,
    paused: false,
    profile: { id: 'grounded-wilderness', version: 1 },
    map: {
      width: STARTER_EXTENT.width,
      height: STARTER_EXTENT.depth,
      tiles: [],
      spatial: starterSpatialLayout(STARTER_EXTENT.width, STARTER_EXTENT.depth),
    },
    flightRoutes: starterFlightRoutes(),
    nativeStrikes: structuredClone({ ...NATIVE_STRIKES, [STAG_CONTACT.id]: STAG_CONTACT }),
    entities: {},
    objectState: { revision: 0 },
    itemDefinitions: structuredClone(NATIVE_ITEMS),
    recipes: {},
    memories: { [PLAYER_ID]: [], [NPC_ID]: [], [MERCENARY_ID]: [] },
    knowledge: { [PLAYER_ID]: [], [NPC_ID]: [], [MERCENARY_ID]: [] },
    events: [],
    commandReceipts: {},
    declarationReceipts: {},
    nextId: 1,
  };
  world.map.tiles = starterTiles(normalizedSeed, world.map.width, world.map.height);
  world.map.spatial!.scenery = starterScenery(
    normalizedSeed,
    world.map.width,
    world.map.height,
    world.map.tiles,
    world.map.spatial!,
  );
  const entities: Entity[] = [
    {
      spatial: { bodyProfileId: 'person', heading: 0 },
      id: PLAYER_ID,
      name: 'Mike',
      nameForm: 'proper',
      kind: 'player',
      placement: worldPlacement({ y: 0, x: 11, z: 13 }, 'terrain'),
      actor: createActor(world, 'player', 76),
    },
    {
      spatial: { bodyProfileId: 'person', heading: 0 },
      id: NPC_ID,
      name: 'Ada',
      nameForm: 'proper',
      kind: 'npc',
      placement: worldPlacement({ y: 0, x: 13, z: 12 }, 'terrain'),
      actor: createActor(world, 'npc', 35, ADA_IDENTITY),
    },
    {
      spatial: { bodyProfileId: 'person', heading: 0 },
      id: MERCENARY_ID,
      name: 'Peacock Mercenary',
      nameForm: 'proper',
      kind: 'npc',
      appearance: 'mercenary-model',
      placement: worldPlacement({ y: 0, x: 12, z: 11 }, 'terrain'),
      actor: createActor(world, 'npc', 76, {
        initialGoals: [],
        traits: [],
        personality: 'Reserved and practical.',
        backstory:
          'I am a travelling mercenary. I make my living through travel and practical work.',
      }),
    },
    {
      spatial: { bodyProfileId: 'object', heading: 0 },
      id: 'campfire',
      name: 'Banked campfire',
      kind: 'campfire',
      placement: worldPlacement({ y: 0, x: 11, z: 10 }, 'terrain'),
      heat: { lit: true, fuelSeconds: 172800 },
    },
    {
      spatial: { bodyProfileId: 'object', heading: 0 },
      id: 'reeds',
      name: 'River reeds',
      nameForm: 'plural',
      kind: 'resource',
      placement: worldPlacement({ y: 0, x: 5, z: 11 }, 'terrain'),
      resource: { definitionId: 'raw_fiber', quantity: 48, workSeconds: 36 },
    },
    {
      spatial: { bodyProfileId: 'object', heading: 0 },
      id: 'reeds-east',
      name: 'Dry grass fibers',
      nameForm: 'plural',
      kind: 'resource',
      placement: worldPlacement({ y: 0, x: 19, z: 12 }, 'terrain'),
      resource: { definitionId: 'raw_fiber', quantity: 30, workSeconds: 36 },
    },
    {
      spatial: { bodyProfileId: 'object', heading: 0 },
      id: 'branches',
      name: 'Fallen branches',
      nameForm: 'plural',
      kind: 'resource',
      placement: worldPlacement({ y: 0, x: 8, z: 8 }, 'terrain'),
      resource: { definitionId: 'wood', quantity: 36, workSeconds: 42 },
    },
    {
      spatial: { bodyProfileId: 'object', heading: 0 },
      id: 'stones',
      name: 'River stones',
      nameForm: 'plural',
      kind: 'resource',
      placement: worldPlacement({ y: 0, x: 5, z: 15 }, 'terrain'),
      resource: { definitionId: 'stone', quantity: 60, workSeconds: 24 },
    },
    {
      spatial: { bodyProfileId: 'object', heading: 0 },
      id: 'berries-west',
      name: 'Berry bush',
      kind: 'resource',
      placement: worldPlacement({ y: 0, x: 8, z: 13 }, 'terrain'),
      resource: { definitionId: 'berries', quantity: 0, workSeconds: 30 },
    },
    {
      spatial: { bodyProfileId: 'object', heading: 0 },
      id: 'berries-east',
      name: 'Berry thicket',
      kind: 'resource',
      placement: worldPlacement({ y: 0, x: 19, z: 15 }, 'terrain'),
      resource: { definitionId: 'berries', quantity: 0, workSeconds: 30 },
    },
    {
      spatial: { bodyProfileId: 'hare', heading: 0 },
      id: 'hare-1',
      name: 'Hare',
      kind: 'animal',
      actor: nativeActor(
        'hare',
        world.simTime,
        world.moduleManifest.definitions.filter(
          (definition) => definition.id === 'wilderness:energy',
        ),
      ),
      placement: worldPlacement({ y: 0, x: 16, z: 13 }, 'terrain'),
      animal: {
        threatPosition: null,
        threatId: null,
        escapeHeading: null,
        calmRate: 0,
        reviewAt: 0,
        danger: 0,
        wanderSeconds: 150,
      },
    },
    {
      spatial: { bodyProfileId: 'hare', heading: 0 },
      id: 'hare-2',
      name: 'Hare',
      kind: 'animal',
      actor: nativeActor(
        'hare',
        world.simTime,
        world.moduleManifest.definitions.filter(
          (definition) => definition.id === 'wilderness:energy',
        ),
      ),
      placement: worldPlacement({ y: 0, x: 21, z: 11 }, 'terrain'),
      animal: {
        threatPosition: null,
        threatId: null,
        escapeHeading: null,
        calmRate: 0,
        reviewAt: 0,
        danger: 0,
        wanderSeconds: 100,
      },
    },
    {
      spatial: { bodyProfileId: 'deer', heading: 0 },
      id: 'deer-1',
      name: 'Deer',
      kind: 'animal',
      actor: nativeActor(
        'deer',
        world.simTime,
        world.moduleManifest.definitions.filter(
          (definition) => definition.id === 'wilderness:energy',
        ),
      ),
      placement: worldPlacement({ y: 0, x: 21, z: 19 }, 'terrain'),
      animal: {
        threatPosition: null,
        threatId: null,
        escapeHeading: null,
        calmRate: 0,
        reviewAt: 0,
        danger: 0,
        wanderSeconds: 200,
      },
    },
    {
      id: 'lookout-cache',
      name: 'Lookout supply crate',
      kind: 'resource',
      placement: worldPlacement({ x: 20, y: 3, z: 5.5 }, 'lookout-deck'),
      spatial: { bodyProfileId: 'object', heading: 0 },
      appearance: 'crate-mesh',
      resource: { definitionId: 'wood', quantity: 24, workSeconds: 42 },
    },
    {
      id: 'bird-1',
      name: 'Woodland bird',
      kind: 'animal',
      placement: worldPlacement({ x: 22, y: 3, z: 5.5 }, 'lookout-deck'),
      spatial: {
        bodyProfileId: 'bird',
        heading: 0,
        flight: { routeId: 'clearing-bird-loop', next: 1, waitSeconds: 180 },
      },
      actor: nativeActor(
        'bird',
        world.simTime,
        world.moduleManifest.definitions.filter(
          (definition) => definition.id === 'wilderness:energy',
        ),
      ),
      animal: {
        threatPosition: null,
        threatId: null,
        escapeHeading: null,
        calmRate: 0,
        reviewAt: 0,
        danger: 0,
        wanderSeconds: 0,
      },
    },
  ];
  for (const entity of entities) world.entities[entity.id] = entity;
  installKnownShieldMethod(world);
  for (const id of [PLAYER_ID, NPC_ID, MERCENARY_ID]) {
    startingRecipeKnowledge(world, id);
    addItem(world, id, 'stone_tool', 1);
    addItem(world, id, 'knife', 1);
    addItem(world, id, 'prepared_fiber', id === PLAYER_ID ? 4 : 2);
    addItem(world, id, 'cord', id === PLAYER_ID ? 3 : 1);
    addItem(world, id, 'wood', 2);
    addItem(world, id, 'stone', 6);
  }
  world.memories[NPC_ID]!.push({
    id: nextId(world, 'memory'),
    actorId: NPC_ID,
    kind: 'belief',
    source: 'observed',
    summary:
      'I arrived here with basic gathering, cord-making, cooking and survival knowledge. I have no village, only a small camp and a few possessions.',
    at: 0,
    entityIds: ['campfire'],
    importance: 8,
  });
  populateOuterWilderness(world);
  installFirstThreat(world);
  initializeIdentity(world);
  validateInventionAttribution(world);
  migrateCognition(world);
  validateSpatialWorld(world);
  return world;
}

/** Sample without replacement using committed RNG; copy definitions so bank edits
 * affect new actors without rewriting existing personalities. */
function sampleTraits(world: WorldState) {
  if (
    traitBank.length < 3 ||
    new Set(traitBank.map((t) => t.id)).size !== traitBank.length ||
    traitBank.some((t) => !t.id || !t.name || !t.description)
  )
    throw new Error('Trait bank needs at least three unique, described traits.');
  const available = [...traitBank];
  return Array.from({ length: 3 }, () => ({
    ...available.splice(Math.floor(nextRandom(world) * available.length), 1)[0]!,
  }));
}
export function initializeActorTraits(world: WorldState): void {
  for (const entity of Object.values(world.entities))
    if (hasMemory(entity) && entity.actor && entity.actor.traits === undefined) {
      const savedRng = world.rngState;
      for (const character of entity.id)
        world.rngState = Math.imul(world.rngState ^ character.charCodeAt(0), 16777619) >>> 0;
      entity.actor.traits = sampleTraits(world);
      world.rngState = savedRng;
    }
}
