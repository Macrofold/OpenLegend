import firstPlayable from './config/first-playable.generated.json' with { type: 'json' };
import {
  installBaseOpeningContent,
  installBaseCampSuggestions,
  validateBaseOpeningPlacements,
  resolveOpeningPeople,
} from './opening-content.js';
import { installBaseSupplyOpportunities } from './supply-config.js';
import { installBaseEcology, baseEcologyReservations } from './ecology.js';
import { recipeMechanicalPin } from '../../invention-families.js';
import { BASE_SOCIAL_OFFERS } from './social-offer-config.js';
import { BASE_PERSON_ROLES } from './people-config.js';
import { BASE_WORK_ACTIVITY_HOST } from './work-activity.js';
import { BASE_MEAL_ACTIVITY_HOST } from './meal-activity.js';
import { baseAnimalResponse } from './animal-response-profile.js';
import { entityGet, entitySet, entityValues } from '../../entity-collection.js';
import { emptyEntities } from '../../entity-collection.js';
import { BASE_NATIVE_ACTIVITY_HOSTS } from './native-activities.js';
import { baseSpatial } from './spatial-definitions.js';
import { BASE_TERRAIN } from './spatial-definitions.js';
import { BASE_CANOPY, CANOPY_ATTRIBUTES, BASE_CANOPY_SCENE } from './canopies.js';
import { BASE_BOUNDARY_CONFIGURATION, installBaseBoundary } from './camp-boundaries.js';
import { BASE_SOCIAL_POLICY } from './social.js';
import { baseConstructionProfile } from './canopy-scene.js';
import { assignGivenName, BASE_KNOWLEDGE_POLICY, BASE_SOCIAL_PERCEPTION } from './knowledge.js';
import { BASE_RANGED_POLICY } from './hunting.js';
import {
  STARTER_EXTENT,
  starterTiles,
  starterScenery,
  populateOuterWilderness,
  starterGroundAt,
} from './landscape.js';
import { emptyActionExperience } from '../../action-experience.js';
import { installWatchpost } from './watchpost.js';
import { BASE_PEOPLE } from './characters.js';
import { installKnownShieldMethod } from './shield-family.js';
import { BASE_WOVEN_CONTAINER_METHOD } from './container-method.js';
import { startingRecipeKnowledge } from './knowledge.js';
import { worldPlacement } from '../../spatial-state.js';
import { BASE_PARTICIPATION_POLICY } from './participation.js';
import { NATIVE_STRIKES } from './strikes.js';
import { STAG_CONTACT, installFirstThreat } from './first-threat.js';
import { addItem, nextRandom, reserveEntityId } from '../../data.js';
import { BASE_ITEM_HANDLING } from './item-handling.js';
import { NATIVE_ITEMS, baseItemDefinitions } from './items.js';
import { BASE_FOOD_PREPARATIONS } from './food-preparations.js';
import { BASE_CAST_DEFINITIONS, installRiverReaches, RIVER_LINE_METHOD } from './river-fishing.js';
import { installRecipe, installFixedTransform } from '../../declarations.js';
import { BASE_MATERIAL_METHODS } from './material-methods.js';
import type { PreparedBaseMaterialWorld } from './first-playable-config.js';
import { baseResourceReservations, installBaseMaterialSources } from './material-sources.js';
import { validateSpatialExtent } from '@open-legend/spatial';
import { learnRecipe } from '../../knowledge.js';
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
import { baseCognitionPolicy } from './cognition.js';
import { initializeAttributes, createModuleManifest } from '../../world-modules.js';
import { SLING_TARGET, SLING_HANDLING } from './practical-competence.js';
import { setStartingPractice } from '../../practical-competence.js';
import { activityHostPin, STOCK_ACTIVITY_HOST } from '../../activity-hosts.js';
import { BASE_FIRE_ACTIVITY_HOST } from './fire-activity.js';
import { BASE_CAMP_ACTIVITY_HOST } from './camp-activity.js';
import { BASE_OUTING_HOST } from './outing.js';
import { BASE_CANOPY_ACTIVITY_HOST } from './canopies.js';
import { BASE_WORLD_PRESENTATION } from './presentation.js';
import { initializeIdentity } from '../../identity.js';
import { defaultStoryPolicy } from '../../story-selection.js';
import { BASE_PLACES } from './places.js';
import { installExpeditions } from './expeditions.js';
import {
  installMissingBelonging,
  MARA_ID,
  MARA_STARTING_BELIEFS,
  MISSING_BELONGING_LOCATIONS,
  TAVIN_ID,
  TAVIN_STARTING_BELIEFS,
} from './missing-belonging.js';
import { livingBody, nativeActor, hasMemory } from '../../living.js';
import traitBank from './config/traits.json' with { type: 'json' };
import { migrateCognition } from '../../experience.js';
import type { ActorComponent, CharacterTrait, Entity, WorldState } from '../../types.js';
import type { ConstructionPermission } from '../../assembly-types.js';
import { tracksMaterialOrigins } from '../../material-inventory.js';
import { BASE_RESOURCE_GATHERING_SECONDS, BASE_GATHERING_POLICY } from './resources.js';

const FIRST_PLAYABLE = firstPlayable as unknown as PreparedBaseMaterialWorld;

export const PLAYER_ID = 'entity-0001';
export const NPC_ID = 'entity-0002';
export {
  MARA_ID,
  MARA_STARTING_BELIEFS,
  MISSING_BELONGING_LOCATIONS,
  TAVIN_ID,
  TAVIN_STARTING_BELIEFS,
};
const MERCENARY_ID = 'peacock-mercenary';
export const TRAIT_BANK: readonly CharacterTrait[] = traitBank;
export { NATIVE_ITEMS } from './items.js';

/** The full authored camp supplies this permission for its exact starting builder. */
export function baseWorldInitialConstructionSeeds(
  world: WorldState,
  builderId = PLAYER_ID,
  prepared: PreparedBaseMaterialWorld = FIRST_PLAYABLE,
): ConstructionPermission[] {
  const policy = prepared.opening.construction,
    family = world.assemblyFamilies?.[policy.boundaryFamily];
  if (
    !entityGet(world.entities, builderId)?.actor ||
    family?.implementation !== 'grounded-panel-boundary' ||
    !world.map.spatial?.surfaces.some((surface) => surface.id === policy.site.surfaceId)
  )
    throw new Error(
      'The selected camp policy needs its actual builder, surface and installed boundary family.',
    );
  const eligible = new Set(policy.materialItems);
  for (const id of eligible) {
    const definition = world.itemDefinitions[id];
    if (!definition || !tracksMaterialOrigins(definition))
      throw new Error('Construction sources require exact tracked material definitions.');
  }
  const sources = prepared.sources
    .filter((source) => eligible.has(source.item))
    .map((source) => {
      const actual = entityGet(world.entities, source.id)?.resource,
        definition = world.itemDefinitions[source.item]!;
      if (actual?.definitionId !== source.item)
        throw new Error('A construction source must exist under its exact installed identity.');
      return { entityId: source.id, definition: definitionPin(definition) };
    });
  if (!sources.length)
    throw new Error('The selected camp policy requires actual finite material sources.');
  return [
    {
      id: policy.id,
      worldId: world.id,
      actorId: builderId,
      revision: 1,
      revoked: false,
      site: { ...policy.site },
      operations: [...policy.operations],
      materialIds: [],
      ...(policy.materialContributions ? { materialContributions: true as const } : {}),
      acquisition: { sources, assemblyIds: [] },
      publicGateUse: {
        family: definitionPin(family),
        operations: [...policy.publicGateUseOperations],
      },
      ...(policy.structuralExposure
        ? {
            structuralExposure: {
              family: definitionPin(family),
              operations: ['held-tool-impact'] as ['held-tool-impact'],
            },
          }
        : {}),
    },
  ];
}

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
  energy?: number,
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
    capabilities: { cognition: true, memory: true, innerWorld: true, speech: true, language: true },
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
      definition.id === 'wilderness:fullness' ||
      definition.id === 'wilderness:energy' ||
      definition.implementation === 'finite-practice-v1',
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
  const energyDefinition = meters.find((definition) => definition.id === 'wilderness:energy');
  if (energy !== undefined && energyDefinition?.schema.kind === 'number')
    initial[energyDefinition.id] =
      energyDefinition.schema.min +
      ((energyDefinition.schema.max - energyDefinition.schema.min) * energy) / 100;
  initializeAttributes(actor, meters, initial);
  return actor;
}

/** Shared authored definitions and empty fresh state; callers supply the selected population.
 * docs/worlds/base/playable-openings.md#fresh-construction
 */
export function createFreshBaseWorld(
  seed: number,
  accounts: WorldCreationAccounts,
  identity: { worldId: string; playerId: string },
  prepared?: PreparedBaseMaterialWorld,
): WorldState {
  const normalizedSeed = Number.isInteger(seed) ? seed >>> 0 : 73;
  const extent = prepared?.opening.extentMetres ?? STARTER_EXTENT;
  validateSpatialExtent(extent.width, extent.depth);
  const canopy = prepared
    ? { ...BASE_CANOPY, coverProfiles: prepared.coverProfiles, defaultCover: prepared.defaultCover }
    : BASE_CANOPY;
  const boundary = prepared?.boundary ?? BASE_BOUNDARY_CONFIGURATION;
  const world: WorldState = {
    gatheringPolicy: { ...(prepared ? prepared.opening.gathering : BASE_GATHERING_POLICY) },
    presentation: {
      ...BASE_WORLD_PRESENTATION,
      ...(prepared
        ? {
            crafting: structuredClone(prepared.catalogue),
            introduction: prepared.opening.content.introduction,
          }
        : {}),
    },
    perceptionFeatures: {},
    schemaVersion: 10,
    actionExperience: emptyActionExperience(),
    participationPolicy: structuredClone(BASE_PARTICIPATION_POLICY),
    itemHandling: structuredClone(BASE_ITEM_HANDLING),
    statusEffectPolicy: {
      ...structuredClone(DEFAULT_STATUS_EFFECT_POLICY),
      ...(prepared ? { clockOffsetHours: prepared.opening.content.clockOffsetHours } : {}),
    },
    authorship: {
      creatorAccountIds: [...accounts.creatorAccountIds],
      playerAccountIds: { [identity.playerId]: accounts.playerAccountId },
    },
    inventionPolicy: initialInventionPolicy(),
    moduleManifest: createModuleManifest(
      [...DEFAULT_ATTRIBUTES, ...CANOPY_ATTRIBUTES, ...boundary.attributes],
      DEFAULT_SENSES,
      prepared
        ? {
            ...structuredClone(BASE_BODY_POLICY),
            consumption: {
              ...structuredClone(BASE_BODY_POLICY.consumption!),
              meal: structuredClone(prepared.meal),
            },
          }
        : BASE_BODY_POLICY,
      BASE_RECIPE_FAMILIES.map((family) => definitionPin(family.definition)),
      [
        STOCK_ACTIVITY_HOST,
        ...BASE_NATIVE_ACTIVITY_HOSTS,
        BASE_FIRE_ACTIVITY_HOST,
        ...(prepared ? [BASE_MEAL_ACTIVITY_HOST, BASE_WORK_ACTIVITY_HOST] : []),
        BASE_CAMP_ACTIVITY_HOST,
        BASE_OUTING_HOST,
        BASE_CANOPY_ACTIVITY_HOST,
      ].map(activityHostPin),
      BASE_RANGED_POLICY,
      BASE_SOCIAL_PERCEPTION,
    ),
    cognitionPolicy: baseCognitionPolicy(),
    storyPolicy: defaultStoryPolicy(),
    socialPolicy: structuredClone(BASE_SOCIAL_POLICY),
    socialOfferPolicy: structuredClone(prepared ? prepared.socialOfferPolicy : BASE_SOCIAL_OFFERS),
    knowledgePolicy: structuredClone(BASE_KNOWLEDGE_POLICY),
    actorKnowledge: {},
    observerIdentities: {},
    visibleObjects: {},
    places: structuredClone(BASE_PLACES),
    visiblePlaces: {},
    id: identity.worldId,
    seed: normalizedSeed,
    rngState: normalizedSeed || 0x6d2b79f5,
    sequence: 0,
    simTime: 0,
    paused: false,
    profile: { id: 'grounded-wilderness', version: 1 },
    map: {
      width: extent.width,
      height: extent.depth,
      tiles: [],
      terrain: structuredClone(BASE_TERRAIN),
      spatial: starterSpatialLayout(extent.width, extent.depth),
    },
    flightRoutes: {},
    nativeStrikes: structuredClone({ ...NATIVE_STRIKES, [STAG_CONTACT.id]: STAG_CONTACT }),
    entities: emptyEntities(),
    objectState: { revision: 0 },
    assemblyFamilies: { [BASE_CANOPY.id]: structuredClone(canopy) },
    assemblyGeometryRevision: 0,
    itemDefinitions: structuredClone(
      prepared
        ? baseItemDefinitions(
            prepared.items.map((row) => row.definition),
            prepared.defaultCover,
          )
        : NATIVE_ITEMS,
    ),
    foodPreparations: structuredClone(BASE_FOOD_PREPARATIONS),
    castDefinitions: structuredClone(BASE_CAST_DEFINITIONS),
    recipes: {},
    memories: {},
    knowledge: {},
    events: [],
    commandReceipts: { size: 0 },
    declarationReceipts: {},
    nextId: 1,
  };
  if (prepared)
    world.workBatchPolicy = {
      ...structuredClone(prepared.workBatches),
      presentation: structuredClone(prepared.workRequests),
    };
  const installedBoundary = installBaseBoundary(world, boundary);
  world.constructionProfile = baseConstructionProfile(
    prepared
      ? starterGroundAt(
          world.map.spatial!,
          (prepared.opening.campReservations[0]!.minX +
            prepared.opening.campReservations[0]!.maxX) /
            2 -
            installedBoundary.geometry.section.spacing,
          (prepared.opening.campReservations[0]!.minZ +
            prepared.opening.campReservations[0]!.maxZ) /
            2 -
            installedBoundary.geometry.section.spacing,
        )
      : BASE_CANOPY_SCENE.suggested,
    canopy,
    installedBoundary,
  );
  if (prepared?.materialContributions)
    world.constructionProfile.materialContributions = structuredClone(
      prepared.materialContributions,
    );
  if (prepared?.contentsExposureProfiles)
    world.contentsExposureProfiles = Object.fromEntries(
      prepared.contentsExposureProfiles.map((profile) => [profile.id, structuredClone(profile)]),
    );
  if (prepared?.dailyRain) {
    const source = prepared.dailyRain;
    if (source.region.openingBoundsRef !== prepared.opening.id)
      throw new Error('Daily rain requires the selected opening bounds.');
    const bounds = {
      id: source.region.openingBoundsRef + ':bounds',
      version: prepared.opening.revision,
      minX: 0,
      maxX: extent.width - 1,
      minZ: 0,
      maxZ: extent.depth - 1,
    };
    const daily = {
      ...structuredClone(source),
      clock: {
        clock: 'localTime' as const,
        offsetHours: world.statusEffectPolicy.clockOffsetHours,
      },
      region: {
        opening: definitionPin(bounds),
        bounds,
      },
    };
    world.dailyRainDefinitions = { [daily.id]: daily };
    world.constructionProfile.dailyRain = definitionPin(daily);
  }
  if (prepared?.hearths.length) {
    world.hearthDefinitions = Object.fromEntries(
      prepared.hearths.map(({ input, ...definition }) => {
        const material = world.itemDefinitions[input.definitionId];
        if (!material)
          throw new Error('A placed-fire input requires its actual installed material.');
        return [
          definition.id,
          {
            ...definition,
            input: { definition: definitionPin(material), quantity: input.quantity },
          },
        ];
      }),
    );
  }
  world.map.tiles = starterTiles(
    normalizedSeed,
    world.map.width,
    world.map.height,
    prepared
      ? [
          ...baseResourceReservations(prepared.opening, prepared.sources),
          ...baseEcologyReservations(prepared.ecology),
        ]
      : [],
  );
  world.flightRoutes = starterFlightRoutes(world.map);
  world.map.spatial!.scenery = starterScenery(
    normalizedSeed,
    world.map.width,
    world.map.height,
    world.map.tiles,
    world.map.spatial!,
  );
  return world;
}

/** Ordinary startup and interactive Main creation share this exact initializer. */
export function createWorld(
  seed = FIRST_PLAYABLE.opening.seed,
  accounts?: WorldCreationAccounts,
  identity?: { worldId: string; playerId: string; residentId: string },
  prepared: PreparedBaseMaterialWorld = FIRST_PLAYABLE,
): WorldState {
  return buildBaseWorld(seed, accounts, identity, prepared);
}

/** Charge/contact presets deliberately keep their small supplied camp and no ecology. */
export function createBaseDiagnosticWorld(
  seed: number,
  accounts?: WorldCreationAccounts,
): WorldState {
  return buildBaseWorld(seed, accounts);
}

/** One composition owner; the diagnostic scope omits the selected Main bundle. */
function buildBaseWorld(
  seed = 73,
  accounts: WorldCreationAccounts = {
    creatorAccountIds: ['local-player'],
    playerAccountId: 'local-player',
  },
  identity?: { worldId: string; playerId: string; residentId: string },
  prepared?: PreparedBaseMaterialWorld,
): WorldState {
  const normalizedSeed = Number.isInteger(seed) ? seed >>> 0 : 73;
  const { worldId, playerId, residentId } = identity ?? {
    worldId: `wilderness-${normalizedSeed}`,
    playerId: PLAYER_ID,
    residentId: NPC_ID,
  };
  const people = prepared ? prepared.people : BASE_PEOPLE;
  const resolvedPeople = prepared
    ? resolveOpeningPeople(prepared.opening.content, playerId, residentId)
    : undefined;
  const personBindings = {
    ada: residentId,
    mercenary: MERCENARY_ID,
    mara: MARA_ID,
    tavin: TAVIN_ID,
  };
  // Scenario owners retain their stable identities; bindings reject collisions rather
  // than installing a second copy under an alternate role.
  if (
    resolvedPeople &&
    (Object.entries(personBindings).some(
      ([role, id]) => resolvedPeople[role as keyof typeof personBindings] !== id,
    ) ||
      resolvedPeople.kest !== 'kest' ||
      resolvedPeople.orin !== 'orin')
  )
    throw new Error('Opening bindings disagree with their scenario owners.');
  if (new Set([playerId, ...Object.values(personBindings)]).size !== 5)
    throw new Error('Starting people require distinct actual identities.');
  const world = createFreshBaseWorld(normalizedSeed, accounts, { worldId, playerId }, prepared);
  // Reserve application-assigned numbers before starting stock uses the shared sequence.
  // docs/identity-and-references.md#contract
  for (const id of [
    playerId,
    residentId,
    ...(resolvedPeople ? Object.values(resolvedPeople) : []),
    ...(prepared?.opening.content.wildlife.map((row) => row.id) ?? []),
    ...(prepared?.opening.content.hearths.map((row) => row.id) ?? []),
    ...(prepared
      ? [
          prepared.opening.content.repairStock.id,
          ...prepared.opening.content.repairStock.lots.flatMap((row) =>
            row.positions.flatMap((_, index) => [
              `${row.id}:ground:${index}`,
              `${row.id}:lot:${index}`,
            ]),
          ),
        ]
      : []),
  ])
    reserveEntityId(world, id);
  for (const source of prepared?.sources ?? []) reserveEntityId(world, source.id);
  world.memories = { [playerId]: [], [residentId]: [], [MERCENARY_ID]: [] };
  world.knowledge = { [playerId]: [], [residentId]: [], [MERCENARY_ID]: [] };
  const entities: Entity[] = [
    {
      id: SLING_TARGET.id,
      name: SLING_TARGET.name,
      description: SLING_TARGET.description,
      kind: 'practice-target',
      spatial: baseSpatial('object'),
      placement: worldPlacement(SLING_TARGET.position, 'terrain'),
      practiceTarget: { attributeId: SLING_TARGET.attributeId },
    },
    {
      spatial: baseSpatial('person'),
      id: playerId,
      name: 'Mike',
      appearance: 'study:mike-field-tunic',
      nameForm: 'proper',
      kind: 'player',
      placement: worldPlacement({ y: 0, x: 11, z: 13 }, 'terrain'),
      actor: createActor(
        world,
        'player',
        prepared?.opening.content.conditions.player.fullness ?? 76,
        {},
        prepared?.opening.content.conditions.player.energy,
      ),
    },
    {
      spatial: baseSpatial('person'),
      id: residentId,
      name: people.ada.name,
      appearance: 'study:ada-field-tunic',
      nameForm: 'proper',
      kind: 'npc',
      placement: worldPlacement({ y: 0, x: 13, z: 12 }, 'terrain'),
      actor: createActor(
        world,
        'npc',
        prepared?.opening.content.conditions.ada.fullness ?? 35,
        people.ada.identity,
        prepared?.opening.content.conditions.ada.energy,
      ),
    },
    {
      spatial: baseSpatial('person'),
      id: MERCENARY_ID,
      name: people.mercenary.name,
      nameForm: 'proper',
      kind: 'npc',
      appearance: 'mercenary-model',
      placement: worldPlacement({ y: 0, x: 12, z: 11 }, 'terrain'),
      actor: createActor(
        world,
        'npc',
        prepared?.opening.content.conditions.mercenary.fullness ?? 76,
        people.mercenary.identity,
        prepared?.opening.content.conditions.mercenary.energy,
      ),
    },
    {
      spatial: baseSpatial('object'),
      id: 'campfire',
      name: 'Banked campfire',
      kind: 'campfire',
      placement: worldPlacement({ y: 0, x: 11, z: 10 }, 'terrain'),
      heat: { lit: true, fuelSeconds: 172800 },
    },
    {
      spatial: baseSpatial('object'),
      id: 'reeds',
      name: 'River reeds',
      appearance: 'study:reeds-river-fan',
      nameForm: 'plural',
      kind: 'resource',
      placement: worldPlacement({ y: 0, x: 5, z: 11 }, 'terrain'),
      resource: {
        definitionId: 'raw_fiber',
        quantity: 48,
        workSeconds: BASE_RESOURCE_GATHERING_SECONDS.raw_fiber,
      },
    },
    {
      spatial: baseSpatial('object'),
      id: 'reeds-east',
      name: 'Dry grass fibers',
      appearance: 'study:dry-fiber-standing-stems',
      nameForm: 'plural',
      kind: 'resource',
      placement: worldPlacement({ y: 0, x: 19, z: 12 }, 'terrain'),
      resource: {
        definitionId: 'raw_fiber',
        quantity: 30,
        workSeconds: BASE_RESOURCE_GATHERING_SECONDS.raw_fiber,
      },
    },
    {
      spatial: baseSpatial('object'),
      id: 'branches',
      name: 'Fallen branches',
      appearance: 'study:fallen-wood-loose-branches',
      nameForm: 'plural',
      kind: 'resource',
      placement: worldPlacement({ y: 0, x: 8, z: 8 }, 'terrain'),
      resource: {
        definitionId: 'wood',
        quantity: 36,
        workSeconds: BASE_RESOURCE_GATHERING_SECONDS.wood,
      },
    },
    {
      spatial: baseSpatial('object'),
      id: 'stones',
      name: 'River stones',
      appearance: 'study:river-stones-loose-stones',
      nameForm: 'plural',
      kind: 'resource',
      placement: worldPlacement({ y: 0, x: 5, z: 15 }, 'terrain'),
      resource: {
        definitionId: 'stone',
        quantity: 60,
        workSeconds: BASE_RESOURCE_GATHERING_SECONDS.stone,
      },
    },
    {
      spatial: baseSpatial('object'),
      id: 'berries-west',
      name: 'Berry bush',
      appearance: 'study:berry-bush-fruit-groups',
      kind: 'resource',
      placement: worldPlacement({ y: 0, x: 8, z: 13 }, 'terrain'),
      resource: {
        definitionId: 'berries',
        quantity: 0,
        workSeconds: BASE_RESOURCE_GATHERING_SECONDS.berries,
      },
    },
    {
      spatial: baseSpatial('object'),
      id: 'berries-east',
      name: 'Berry thicket',
      appearance: 'study:berry-bush-low-thicket',
      kind: 'resource',
      placement: worldPlacement({ y: 0, x: 19, z: 15 }, 'terrain'),
      resource: {
        definitionId: 'berries',
        quantity: 0,
        workSeconds: BASE_RESOURCE_GATHERING_SECONDS.berries,
      },
    },
    {
      spatial: baseSpatial('hare'),
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
      animal: baseAnimalResponse(world, 'hare', 150),
    },
    {
      spatial: baseSpatial('hare'),
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
      animal: baseAnimalResponse(world, 'hare', 100),
    },
    {
      spatial: baseSpatial('deer'),
      id: 'deer-1',
      name: 'Deer',
      appearance: 'study:deer-woodland-doe',
      kind: 'animal',
      actor: nativeActor(
        'deer',
        world.simTime,
        world.moduleManifest.definitions.filter(
          (definition) => definition.id === 'wilderness:energy',
        ),
      ),
      placement: worldPlacement({ y: 0, x: 21, z: 19 }, 'terrain'),
      animal: baseAnimalResponse(world, 'deer', 200),
    },
    {
      id: 'lookout-cache',
      name: 'Lookout supply crate',
      kind: 'resource',
      placement: worldPlacement({ x: 20, y: 3, z: 5.5 }, 'lookout-deck'),
      spatial: baseSpatial('object'),
      appearance: 'crate-mesh',
      resource: {
        definitionId: 'wood',
        quantity: 24,
        workSeconds: BASE_RESOURCE_GATHERING_SECONDS.wood,
      },
    },
    {
      id: 'bird-1',
      name: 'Woodland bird',
      appearance: 'study:bird-grey-wing',
      kind: 'animal',
      placement: worldPlacement({ x: 22, y: 3, z: 5.5 }, 'lookout-deck'),
      spatial: {
        ...baseSpatial('bird'),
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
      animal: baseAnimalResponse(world, 'bird', 0, 'clearing-bird-loop'),
    },
  ];
  for (const entity of entities) {
    // These are authored base-world appearances; shared UI never recognizes these identities.
    entity.icon = entity.resource
      ? world.itemDefinitions[entity.resource.definitionId]?.icon
      : entity.kind === 'campfire'
        ? 'action.fire'
        : entity.actor?.species === 'hare'
          ? 'creature.hare'
          : entity.actor?.species === 'deer'
            ? 'creature.deer'
            : entity.actor?.species === 'human'
              ? 'person.wayfarer'
              : undefined;
    // Prospective primary identities must not erase fixed authored starting content.
    if (entityGet(world.entities, entity.id))
      throw new Error('A starting person identity collides with an authored scene object.');
    entitySet(world.entities, entity.id, entity);
  }
  for (const material of prepared
    ? []
    : [...BASE_CANOPY_SCENE.kit, ...BASE_CANOPY_SCENE.variantStock])
    for (let n = 0; n < material.quantity; n++) {
      const id = addItem(world, playerId, material.definitionId, 1);
      if (material.quantity > 1) entityGet(world.entities, id)!.name += ` ${n + 1}`;
    }
  const shieldRecipe = installKnownShieldMethod(world);
  const installMaterialMethods = () => {
    const installedMethods = new Map<string, string>();
    const methods = prepared
      ? prepared.methods
      : BASE_MATERIAL_METHODS.map((definition) => ({
          definition,
          learning: 'authored-elementary' as const,
        }));
    for (const method of methods) {
      const provenance = {
        source: 'authored-world',
        profile: { ...world.profile },
      } as const;
      const { recipe } =
        'definition' in method
          ? installFixedTransform(world, method.definition, provenance)
          : installRecipe(world, method.candidate, provenance);
      const sourceId = 'definition' in method ? method.definition.id : method.id;
      installedMethods.set(sourceId, recipe.id);
      for (const id of prepared ? [playerId] : [playerId, residentId, MERCENARY_ID])
        learnRecipe(
          world,
          id,
          recipe.id,
          'authored',
          'definition' in method ? method.definition.id : method.id,
        );
    }
    if (prepared) {
      const cooperation = world.socialOfferPolicy?.cooperation;
      if (cooperation?.families.includes('help')) {
        cooperation.helpMethods = prepared.cooperationHelpMethodRefs.map((sourceId) => {
          const id = installedMethods.get(sourceId);
          if (!id) throw new Error('A cooperative method is not installed.');
          return recipeMechanicalPin(world.recipes[id]!);
        });
      }
      const bindings = personBindings,
        knownBindings = new Map(Object.entries(bindings));
      for (const role of BASE_PERSON_ROLES) {
        const actorId = bindings[role],
          person = people[role];
        if (!entityGet(world.entities, actorId)?.actor)
          throw new Error('The authored starting person is absent.');
        for (const [recipe, evidence] of [
          [shieldRecipe, 'base:known-shield'],
          [containerRecipe, 'base:known-woven-container'],
          [riverMethod, 'base:river-line'],
        ] as const)
          learnRecipe(world, actorId, recipe.id, 'authored', evidence);
        for (const methodId of person.startingKnowledge.methodRefs) {
          const recipeId = installedMethods.get(methodId);
          if (!recipeId) throw new Error('The starting person references an uninstalled method.');
          learnRecipe(world, actorId, recipeId, 'authored', methodId);
        }
        for (const known of person.startingKnowledge.knownPeople) {
          const targetId = knownBindings.get(known.personRole);
          if (!targetId) throw new Error('The starting acquaintance role is not installed.');
          const result = assignGivenName(
            world,
            actorId,
            {
              subjectId: targetId,
              expectedRevision: world.observerIdentities?.[actorId]?.[targetId]?.revision ?? 0,
              givenName: known.givenName,
            },
            [targetId],
            true,
          );
          if (!result.ok) throw new Error(result.message);
        }
        if (person.startingKnowledge.knownPeople.length) {
          const priorKnowledge = world.actorKnowledge?.[actorId];
          const text =
            (priorKnowledge?.general?.text ? priorKnowledge.general.text + '\n\n' : '') +
            '# Acquaintances\n' +
            person.startingKnowledge.knownPeople
              .map((known) => 'I know ' + known.givenName + ' from spending time at this camp.')
              .join('\n');
          (world.actorKnowledge ??= {})[actorId] = {
            ...priorKnowledge,
            general: {
              origin: 'authored-starting',
              subjectId: null,
              text,
              revision: (priorKnowledge?.general?.revision ?? 0) + 1,
              evidenceIds: [],
            },
          };
        }
      }
      installBaseSupplyOpportunities(world, prepared.opportunities, installedMethods);
    }
  };
  if (!prepared) installMaterialMethods();
  const containerRecipe = installRecipe(world, BASE_WOVEN_CONTAINER_METHOD, {
    source: 'authored-world',
    profile: { ...world.profile },
  }).recipe;
  // Explicit authored starting support; Ada's biography does not grant mechanics.
  setStartingPractice(world, entityGet(world.entities, residentId)!, SLING_HANDLING, 1);
  for (const id of [playerId, residentId, MERCENARY_ID]) {
    startingRecipeKnowledge(world, id, shieldRecipe.id);
    learnRecipe(world, id, containerRecipe.id, 'authored', 'base:known-woven-container');
    if (prepared && id === playerId) continue;
    addItem(world, id, 'stone_tool', 1);
    addItem(world, id, 'knife', 1);
    addItem(world, id, 'prepared_fiber', id === playerId ? 4 : 2);
    addItem(world, id, 'cord', id === playerId ? 3 : 1);
    addItem(world, id, 'wood', 2);
    addItem(world, id, 'stone', 6);
  }
  // Authored background is required starting understanding, never a witnessed event.
  world.actorKnowledge![residentId] = {
    general: {
      origin: 'authored-starting',
      subjectId: null,
      revision: 1,
      evidenceIds: [],
      text: 'I arrived here with basic gathering, cord-making, cooking and survival knowledge. I have no village, only a small camp and a few possessions.',
    },
  };
  installRiverReaches(world);
  const riverMethod = installRecipe(world, RIVER_LINE_METHOD, {
    source: 'authored-world',
    profile: { id: world.profile.id, version: world.profile.version },
  }).recipe;
  for (const actorId of [playerId, residentId, MERCENARY_ID])
    (world.knowledge[actorId] ??= []).push({
      recipeId: riverMethod.id,
      learnedAt: world.simTime,
      source: 'authored',
      evidenceId: riverMethod.id,
    });
  populateOuterWilderness(world);
  installFirstThreat(world);
  installExpeditions(world);
  installMissingBelonging(world, playerId, people, prepared?.opening.content.conditions);
  installWatchpost(
    world,
    createActor,
    prepared?.opening.content.watchpostOffset,
    prepared?.opening.content.conditions,
  );
  // Resolve the complete existing scene first: a new source cannot overwrite a
  // person, item or later-installed encounter. Families then see actual sources.
  if (prepared) {
    installBaseOpeningContent(world, prepared.opening.content, resolvedPeople!);
    installBaseCampSuggestions(world, prepared.opening.campReservations);
    installBaseEcology(world, prepared.ecology);
    installBaseMaterialSources(world, prepared.opening, prepared.sources);
    installMaterialMethods();
  }
  initializeIdentity(world);
  validateInventionAttribution(world);
  migrateCognition(world);
  validateSpatialWorld(world);
  if (prepared) validateBaseOpeningPlacements(world);
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
  for (const entity of entityValues(world.entities))
    if (hasMemory(entity) && entity.actor && entity.actor.traits === undefined) {
      const savedRng = world.rngState;
      for (const character of entity.id)
        world.rngState = Math.imul(world.rngState ^ character.charCodeAt(0), 16777619) >>> 0;
      entity.actor.traits = sampleTraits(world);
      world.rngState = savedRng;
    }
}
