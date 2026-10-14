import { createItemLot } from '../../objects.js';
import { hasRecordFields, isSafeRecordId } from '../../records.js';
import { installRecipe } from '../../declarations.js';
import { learnRecipe } from '../../knowledge.js';
import { initializeIdentity } from '../../identity.js';
import { migrateCognition } from '../../experience.js';
import { initializePerception } from '../../kernel.js';
import { reconcileConditions } from '../../conditions.js';
import { bodyProfile, worldPlacement, starterSpatialLayout } from '../../spatial-state.js';
import { isWalkable } from '../../spatial.js';
import { definitionPin, validateWorldModules, type DefinitionPin } from '../../world-modules.js';
import { nativeActor } from '../../living.js';
import type { WorldCreationAccounts } from '../../invention-attribution.js';
import type { ConstructionPermission } from '../../assembly-types.js';
import type { CharacterTrait, Entity, RecipeCandidate, WorldState } from '../../types.js';
import { createActor, createFreshBaseWorld } from './world.js';
import { NATIVE_ITEMS } from './items.js';
import { ADA_IDENTITY } from './characters.js';
import { KNOWN_SHIELD_METHOD } from './shield-family.js';
import { RIVER_LINE_METHOD } from './river-fishing.js';
import { STARTER_EXTENT, starterGroundAt } from './landscape.js';
import { BASE_RESOURCE_GATHERING_SECONDS } from './resources.js';
import { reserveEntityId } from '../../data.js';

/** This profile describes authored starting circumstances, not universal world rules.
 * docs/worlds/base/playable-openings.md
 */
export const BASE_OPENING_PROFILE = {
  id: 'base:playable-opening',
  version: 1,
  name: 'Small wilderness opening',
  description:
    'A supported wilderness locality with one controlled person and, when chosen, one independent resident. Gather finite supplies, make useful equipment and continue ordinary play.',
  openings: [
    {
      id: 'inhabited',
      label: 'A small inhabited camp',
      description:
        'One controlled person, one independent resident, finite supplies and a hunting opportunity.',
      activity: 'Invent a useful hunting tool, gather its inputs, make it and obtain food.',
      payoff:
        'A reusable tool and an ordinary food opportunity; the resident chooses independently.',
    },
    {
      id: 'solitary',
      label: 'Solitary gathering and making',
      description:
        'One controlled person in a different locality, with finite fibers and a known container method.',
      activity: 'Gather and prepare fibers, then make a known woven container.',
      payoff: 'A reusable container for gathered supplies, without relying on another person.',
    },
  ],
  limits: {
    scene: 24,
    stock: 32,
    knowledge: 6,
    traits: 8,
    goals: 8,
    nameCharacters: 120,
    textCharacters: 4000,
    resourceQuantity: 10000,
    stockQuantity: 512,
    fireFuelSeconds: 604800,
  },
} as const;

export const BASE_OPENING_METHODS = [
  { id: 'woven-container', name: 'Woven gathering container' },
  { id: 'river-line', name: 'River fishing line' },
  { id: 'wooden-shield', name: 'Wooden shield' },
] as const;
export type BaseOpeningMethod = (typeof BASE_OPENING_METHODS)[number]['id'];
export type BaseOpeningKind = (typeof BASE_OPENING_PROFILE.openings)[number]['id'];
type Position = { x: number; y: number; z: number };

/** The application's allocator supplies these identities once per retained opening. */
export const BASE_OPENING_IDENTITY_KEYS = [
  'fiber',
  'wood',
  'stone',
  'berries',
  'fire',
  'hare',
  'player-tool',
  'player-knife',
  'player-fiber',
  'player-cord',
  'player-wood',
  'player-stone',
  'resident-tool',
  'resident-knife',
  'resident-fiber',
  'resident-cord',
] as const;
export interface BaseOpeningIdentities {
  worldId: string;
  playerId: string;
  residentId?: string;
  objects: Record<string, string>;
}
export interface BaseOpeningActor {
  id: string;
  name: string;
  description: string;
  personality: string;
  backstory: string;
  traits: CharacterTrait[];
  initialGoals: string[];
  fullness: number;
  position: Position;
  supportSurfaceId: string;
}
interface BaseScenePlacement {
  id: string;
  name: string;
  position: Position;
  supportSurfaceId: string;
}
export type BaseOpeningScene = BaseScenePlacement &
  (
    | { kind: 'resource'; definition: DefinitionPin; quantity: number }
    | { kind: 'fire'; fuelSeconds: number }
    | { kind: 'hare' }
  );
export interface BaseOpeningStock {
  id: string;
  ownerId: string;
  definition: DefinitionPin;
  quantity: number;
}
export interface BaseOpeningKnowledge {
  actorId: string;
  method: BaseOpeningMethod;
}
export interface BaseInitialWorldCandidate {
  profile: { id: string; version: number };
  worldId: string;
  seed: number;
  rngState: number;
  title: string;
  premise: string;
  opening: BaseOpeningKind;
  harsh: boolean;
  player: BaseOpeningActor;
  resident: BaseOpeningActor | null;
  scene: BaseOpeningScene[];
  stock: BaseOpeningStock[];
  knowledge: BaseOpeningKnowledge[];
}
export interface BaseInitialWorldPreparation {
  world: WorldState;
  accountRoles: Array<{
    accountId: string;
    actorId: string | null;
    role: 'creator' | 'player';
  }>;
  constructionSeeds: ConstructionPermission[];
}

export interface BaseOpeningEditorField {
  path: string[];
  label: string;
  kind: 'text' | 'number' | 'choice' | 'boolean';
  unit?: string;
  minimum?: number;
  maximum?: number;
  step?: number;
  choices?: Array<{ value: string; label: string }>;
}

/** Authored field meanings belong to the profile; the shared editor owns presentation. */
export function baseOpeningEditorFields(
  candidate: BaseInitialWorldCandidate,
): BaseOpeningEditorField[] {
  const result: BaseOpeningEditorField[] = [
    { path: ['title'], label: 'Opening name', kind: 'text' },
    { path: ['premise'], label: 'What matters in this opening', kind: 'text' },
    { path: ['harsh'], label: 'Deliberately harsh starting conditions', kind: 'boolean' },
  ];
  const position = (path: string[], label: string) => {
    for (const coordinate of ['x', 'y', 'z'])
      result.push({
        path: [...path, 'position', coordinate],
        label: `${label}: ${coordinate === 'y' ? 'height' : coordinate === 'x' ? 'east–west position' : 'north–south position'}`,
        kind: 'number',
        unit: 'metres',
        step: 0.1,
      });
  };
  for (const [key, person] of [
    ['player', candidate.player],
    ['resident', candidate.resident],
  ] as const) {
    if (!person) continue;
    const label = key === 'player' ? 'Controlled person' : 'Independent resident';
    for (const [field, meaning] of [
      ['name', 'name'],
      ['description', 'description'],
      ['personality', 'personality and interests'],
      ['backstory', 'authored personal history'],
    ] as const)
      result.push({ path: [key, field], label: `${label}: ${meaning}`, kind: 'text' });
    result.push({
      path: [key, 'fullness'],
      label: `${label}: starting fullness`,
      kind: 'number',
      minimum: 0,
      maximum: 100,
      unit: '%',
      step: 1,
    });
    position([key], label);
  }
  candidate.scene.forEach((scene, index) => {
    const path = ['scene', String(index)];
    result.push({ path: [...path, 'name'], label: `${scene.name}: displayed name`, kind: 'text' });
    position(path, scene.name);
    if (scene.kind === 'resource')
      result.push({
        path: [...path, 'quantity'],
        label: `${scene.name}: finite starting supply`,
        kind: 'number',
        minimum: 0,
        maximum: BASE_OPENING_PROFILE.limits.resourceQuantity,
        step: 1,
        unit: 'items',
      });
    else if (scene.kind === 'fire')
      result.push({
        path: [...path, 'fuelSeconds'],
        label: `${scene.name}: starting fuel`,
        kind: 'number',
        minimum: 0,
        maximum: BASE_OPENING_PROFILE.limits.fireFuelSeconds,
        step: 1,
        unit: 'game seconds',
      });
  });
  candidate.stock.forEach((stock, index) =>
    result.push({
      path: ['stock', String(index), 'quantity'],
      label: `${stock.ownerId === candidate.player.id ? 'Controlled person' : 'Independent resident'}: ${NATIVE_ITEMS[stock.definition.id]!.name} starting quantity`,
      kind: 'number',
      minimum: 1,
      maximum: BASE_OPENING_PROFILE.limits.stockQuantity,
      step: 1,
      unit: 'items',
    }),
  );
  return result;
}

export const BASE_OPENING_RESOURCES = [
  {
    definitionId: 'raw_fiber',
    name: 'Gatherable plant fibers',
    workSeconds: BASE_RESOURCE_GATHERING_SECONDS.raw_fiber,
  },
  {
    definitionId: 'wood',
    name: 'Fallen branches',
    workSeconds: BASE_RESOURCE_GATHERING_SECONDS.wood,
  },
  {
    definitionId: 'stone',
    name: 'Loose stones',
    workSeconds: BASE_RESOURCE_GATHERING_SECONDS.stone,
  },
  {
    definitionId: 'berries',
    name: 'Berry bush',
    workSeconds: BASE_RESOURCE_GATHERING_SECONDS.berries,
  },
] as const;
export const BASE_OPENING_STOCK_DEFINITIONS = [
  'stone_tool',
  'knife',
  'raw_fiber',
  'prepared_fiber',
  'cord',
  'wood',
  'stone',
  'berries',
  'cooked_meat',
  'bone',
] as const;

const containerMethod: RecipeCandidate = {
  family: { id: 'base:woven-container', version: 1 },
  name: 'Woven gathering container',
  description: 'Weave prepared fibers into a small pouch and secure it with cord.',
  inputs: [
    { role: 'pouch', definitionId: 'prepared_fiber', quantity: 2 },
    { role: 'binding', definitionId: 'cord', quantity: 1 },
  ],
  output: {
    name: 'Woven gathering pouch',
    description: 'A small portable woven pouch for carrying gathered materials.',
  },
  parameters: {},
};
const methods: Record<BaseOpeningMethod, RecipeCandidate> = {
  'woven-container': containerMethod,
  'river-line': RIVER_LINE_METHOD,
  'wooden-shield': KNOWN_SHIELD_METHOD.candidate,
};
const text = (
  value: unknown,
  maximum: number = BASE_OPENING_PROFILE.limits.textCharacters,
): value is string => typeof value === 'string' && Array.from(value).length <= maximum;
const integer = (value: unknown, maximum: number, minimum = 0): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
function fields(value: unknown, required: readonly string[], meaning: string) {
  if (!hasRecordFields(value, required)) throw new Error(`Invalid ${meaning} fields.`);
  return value;
}
function point(value: unknown): value is Position {
  return (
    hasRecordFields(value, ['x', 'y', 'z']) &&
    [value.x, value.y, value.z].every(
      (number) => typeof number === 'number' && Number.isFinite(number),
    )
  );
}
function name(value: unknown): value is string {
  return text(value, BASE_OPENING_PROFILE.limits.nameCharacters) && !!value.trim();
}
function pin(value: unknown, allowed: readonly string[]): value is DefinitionPin {
  return (
    hasRecordFields(value, ['id', 'version', 'digest']) &&
    typeof value.id === 'string' &&
    allowed.includes(value.id) &&
    NATIVE_ITEMS[value.id]?.version === value.version &&
    definitionPin(NATIVE_ITEMS[value.id]!).digest === value.digest
  );
}
function actor(value: unknown): asserts value is BaseOpeningActor {
  const record = fields(
    value,
    [
      'id',
      'name',
      'description',
      'personality',
      'backstory',
      'traits',
      'initialGoals',
      'fullness',
      'position',
      'supportSurfaceId',
    ],
    'opening person',
  );
  if (
    !isSafeRecordId(record.id) ||
    !name(record.name) ||
    ![record.description, record.personality, record.backstory].every((value) => text(value)) ||
    !point(record.position) ||
    !isSafeRecordId(record.supportSurfaceId) ||
    typeof record.fullness !== 'number' ||
    !Number.isFinite(record.fullness) ||
    record.fullness < 0 ||
    record.fullness > 100 ||
    !Array.isArray(record.traits) ||
    record.traits.length > BASE_OPENING_PROFILE.limits.traits ||
    !Array.isArray(record.initialGoals) ||
    record.initialGoals.length > BASE_OPENING_PROFILE.limits.goals ||
    record.initialGoals.some((value) => !text(value, 1000) || !value.trim())
  )
    throw new Error('Invalid opening person, placement or authored intention.');
  const traits = new Set<string>();
  for (const value of record.traits) {
    const trait = fields(value, ['id', 'name', 'description'], 'opening personality trait');
    if (
      !isSafeRecordId(trait.id) ||
      traits.has(trait.id) ||
      !name(trait.name) ||
      !text(trait.description)
    )
      throw new Error('Invalid or repeated opening personality trait.');
    traits.add(trait.id);
  }
}

/** One closed current model, reusable at source preparation and destination intake. */
export function validateBaseOpeningCandidate(
  value: unknown,
): asserts value is BaseInitialWorldCandidate {
  const candidate = fields(
    value,
    [
      'profile',
      'worldId',
      'seed',
      'rngState',
      'title',
      'premise',
      'opening',
      'harsh',
      'player',
      'resident',
      'scene',
      'stock',
      'knowledge',
    ],
    'initial-world candidate',
  );
  const profile = fields(candidate.profile, ['id', 'version'], 'creation profile');
  if (
    profile.id !== BASE_OPENING_PROFILE.id ||
    profile.version !== BASE_OPENING_PROFILE.version ||
    !isSafeRecordId(candidate.worldId) ||
    !integer(candidate.seed, 0xffffffff) ||
    !integer(candidate.rngState, 0xffffffff, 1) ||
    !name(candidate.title) ||
    !text(candidate.premise) ||
    !BASE_OPENING_PROFILE.openings.some((opening) => opening.id === candidate.opening) ||
    typeof candidate.harsh !== 'boolean' ||
    !Array.isArray(candidate.scene) ||
    candidate.scene.length > BASE_OPENING_PROFILE.limits.scene ||
    !Array.isArray(candidate.stock) ||
    candidate.stock.length > BASE_OPENING_PROFILE.limits.stock ||
    !Array.isArray(candidate.knowledge) ||
    candidate.knowledge.length > BASE_OPENING_PROFILE.limits.knowledge
  )
    throw new Error(
      'Unsupported initial-world profile or candidate exceeds its supported envelope.',
    );
  actor(candidate.player);
  if (candidate.resident !== null) actor(candidate.resident);
  if (candidate.opening === 'solitary' && candidate.resident !== null)
    throw new Error('A solitary opening cannot contain a resident.');
  if (candidate.opening === 'inhabited' && candidate.resident === null)
    throw new Error('Select the solitary opening when no resident is included.');
  const people = [candidate.player, ...(candidate.resident === null ? [] : [candidate.resident])];
  const peopleIds = new Set(people.map((person) => person.id));
  const ids = new Set<string>();
  const claim = (id: unknown) => {
    if (!isSafeRecordId(id) || ids.has(id))
      throw new Error('Invalid or repeated opening object identity.');
    ids.add(id);
  };
  for (const person of people) claim(person.id);
  for (const raw of candidate.scene) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
      throw new Error('Invalid opening scene element.');
    const kind = Object.getOwnPropertyDescriptor(raw, 'kind')?.value as unknown;
    const shared = ['id', 'kind', 'name', 'position', 'supportSurfaceId'];
    const scene = fields(
      raw,
      [
        ...shared,
        ...(kind === 'resource'
          ? ['definition', 'quantity']
          : kind === 'fire'
            ? ['fuelSeconds']
            : []),
      ],
      'opening scene element',
    );
    claim(scene.id);
    if (!name(scene.name) || !point(scene.position) || !isSafeRecordId(scene.supportSurfaceId))
      throw new Error('Invalid opening scene name or placement.');
    if (kind === 'resource') {
      if (
        !pin(
          scene.definition,
          BASE_OPENING_RESOURCES.map((resource) => resource.definitionId),
        ) ||
        !integer(scene.quantity, BASE_OPENING_PROFILE.limits.resourceQuantity)
      )
        throw new Error('Unsupported gathering definition or invalid finite resource quantity.');
    } else if (kind === 'fire') {
      if (!integer(scene.fuelSeconds, BASE_OPENING_PROFILE.limits.fireFuelSeconds))
        throw new Error('Invalid finite campfire fuel.');
    } else if (kind !== 'hare') throw new Error('The selected scene element is not supported.');
  }
  for (const raw of candidate.stock) {
    const stock = fields(raw, ['id', 'ownerId', 'definition', 'quantity'], 'opening stock lot');
    claim(stock.id);
    if (
      !isSafeRecordId(stock.ownerId) ||
      !peopleIds.has(stock.ownerId) ||
      !pin(stock.definition, BASE_OPENING_STOCK_DEFINITIONS) ||
      !integer(stock.quantity, BASE_OPENING_PROFILE.limits.stockQuantity, 1)
    )
      throw new Error('Invalid opening stock owner, exact definition or quantity.');
  }
  const learned = new Map<string, Set<string>>();
  for (const raw of candidate.knowledge) {
    const knowledge = fields(raw, ['actorId', 'method'], 'opening learned method');
    if (
      !isSafeRecordId(knowledge.actorId) ||
      !peopleIds.has(knowledge.actorId) ||
      !BASE_OPENING_METHODS.some((method) => method.id === knowledge.method)
    )
      throw new Error('Unsupported opening method or absent learning recipient.');
    const known = learned.get(knowledge.actorId) ?? new Set<string>();
    if (typeof knowledge.method !== 'string' || known.has(knowledge.method))
      throw new Error('Repeated opening learned method.');
    known.add(knowledge.method);
    learned.set(knowledge.actorId, known);
  }
}

/** Native preset selection performs no generation and reads no source-world instance. */
export function createBaseOpeningCandidate(
  identities: BaseOpeningIdentities,
  opening: BaseOpeningKind = 'inhabited',
  seed = 73,
): BaseInitialWorldCandidate {
  const id = (key: (typeof BASE_OPENING_IDENTITY_KEYS)[number]): string => {
    const value = identities.objects[key];
    if (!isSafeRecordId(value))
      throw new Error(`The application must allocate the ${key} identity.`);
    return value;
  };
  const position = (x: number, z: number): Position => ({ x, y: 0, z });
  const solitary = opening === 'solitary';
  const person = (personId: string, resident: boolean): BaseOpeningActor => ({
    id: personId,
    name: resident ? 'Ada' : 'Newcomer',
    description: resident
      ? 'An independent resident of the locality.'
      : 'The person controlled by the arriving player.',
    personality: resident ? ADA_IDENTITY.personality : '',
    // The profile allows a separate current name. Keep this reusable authored
    // history from asserting the original resident's present self-name.
    backstory: resident
      ? ADA_IDENTITY.backstory.replace('I am Ada, twenty-four.', 'I am twenty-four.')
      : '',
    traits: resident ? structuredClone(ADA_IDENTITY.traits) : [],
    initialGoals: [],
    fullness: resident ? 55 : 76,
    position: resident ? position(13, 12) : solitary ? position(13, 28) : position(11, 13),
    supportSurfaceId: 'terrain',
  });
  if (!solitary && !isSafeRecordId(identities.residentId))
    throw new Error('Allocate the selected resident identity.');
  const player = person(identities.playerId, false);
  const resident = solitary ? null : person(identities.residentId!, true);
  const quantities = { raw_fiber: 48, wood: 36, stone: 60, berries: 18 };
  const resourcePositions = solitary
    ? [
        [10, 28],
        [14, 26],
        [10, 31],
        [15, 30],
      ]
    : [
        [5, 11],
        [8, 8],
        [5, 15],
        [8, 13],
      ];
  const resourceKeys = ['fiber', 'wood', 'stone', 'berries'] as const;
  const scene: BaseOpeningScene[] = BASE_OPENING_RESOURCES.map((resource, index) => ({
    id: id(resourceKeys[index]!),
    name: resource.name,
    kind: 'resource',
    position: position(resourcePositions[index]![0]!, resourcePositions[index]![1]!),
    supportSurfaceId: 'terrain',
    definition: definitionPin(NATIVE_ITEMS[resource.definitionId]!),
    quantity: quantities[resource.definitionId],
  }));
  scene.push({
    id: id('fire'),
    kind: 'fire',
    name: 'Banked campfire',
    position: solitary ? position(13, 25) : position(11, 10),
    supportSurfaceId: 'terrain',
    fuelSeconds: 172800,
  });
  if (!solitary)
    scene.push({
      id: id('hare'),
      kind: 'hare',
      name: 'Hare',
      position: position(16, 13),
      supportSurfaceId: 'terrain',
    });
  const stock: BaseOpeningStock[] = [];
  const give = (
    key: (typeof BASE_OPENING_IDENTITY_KEYS)[number],
    ownerId: string,
    definitionId: string,
    quantity: number,
  ) => {
    stock.push({
      id: id(key),
      ownerId,
      definition: definitionPin(NATIVE_ITEMS[definitionId]!),
      quantity,
    });
  };
  give('player-tool', player.id, 'stone_tool', 1);
  give('player-knife', player.id, 'knife', 1);
  give('player-fiber', player.id, 'prepared_fiber', solitary ? 1 : 4);
  give('player-cord', player.id, 'cord', solitary ? 1 : 3);
  give('player-wood', player.id, 'wood', 2);
  give('player-stone', player.id, 'stone', 6);
  if (resident) {
    give('resident-tool', resident.id, 'stone_tool', 1);
    give('resident-knife', resident.id, 'knife', 1);
    give('resident-fiber', resident.id, 'prepared_fiber', 2);
    give('resident-cord', resident.id, 'cord', 1);
  }
  const candidate: BaseInitialWorldCandidate = {
    profile: { id: BASE_OPENING_PROFILE.id, version: BASE_OPENING_PROFILE.version },
    worldId: identities.worldId,
    seed,
    rngState: seed || 0x6d2b79f5,
    title: solitary ? 'A solitary riverside camp' : 'A small inhabited camp',
    premise: solitary
      ? 'Gather finite fibers, learn the locality and make a useful container on your own.'
      : 'Make a useful hunting tool, explore the locality and obtain food alongside an independent resident.',
    opening,
    harsh: false,
    player,
    resident,
    scene,
    stock,
    knowledge: [
      { actorId: player.id, method: 'woven-container' },
      ...(resident ? [{ actorId: resident.id, method: 'woven-container' as const }] : []),
    ],
  };
  // The solitary locality crosses an authored ground-patch seam. Retain actual
  // foot height and support together rather than giving it the camp's flat anchor.
  const layout = starterSpatialLayout(STARTER_EXTENT.width, STARTER_EXTENT.depth);
  for (const placement of [
    candidate.player,
    ...(candidate.resident ? [candidate.resident] : []),
    ...candidate.scene,
  ]) {
    const point = starterGroundAt(layout, placement.position.x, placement.position.z);
    placement.position = { x: point.x, y: point.y, z: point.z };
    placement.supportSurfaceId = point.surfaceId;
  }
  validateBaseOpeningCandidate(candidate);
  return candidate;
}

/** Fresh startup effects are actual initial observations, never invented earlier work.
 * Kept callable by the application before its reviewed initial-state digest is published.
 */
export function prepareBaseInitialWorldState(world: WorldState): void {
  initializeIdentity(world);
  migrateCognition(world);
  initializePerception(world, []);
  for (const entity of Object.values(world.entities)) reconcileConditions(world, entity, []);
  world.paused = true;
  validateWorldModules(world);
}

/** Build only selected people and objects. Account and control authority are separate inputs. */
export function buildBaseInitialWorld(
  candidate: BaseInitialWorldCandidate,
  accounts: WorldCreationAccounts,
): BaseInitialWorldPreparation {
  validateBaseOpeningCandidate(candidate);
  const world = createFreshBaseWorld(candidate.seed, accounts, {
    worldId: candidate.worldId,
    playerId: candidate.player.id,
  });
  world.rngState = candidate.rngState;
  world.places = {};
  const people = [candidate.player, ...(candidate.resident ? [candidate.resident] : [])];
  for (const person of people) {
    reserveEntityId(world, person.id);
    world.entities[person.id] = {
      id: person.id,
      name: person.name,
      nameForm: 'proper',
      description: person.description,
      kind: person === candidate.player ? 'player' : 'npc',
      spatial: { bodyProfileId: 'person', heading: 0 },
      placement: worldPlacement(structuredClone(person.position), person.supportSurfaceId),
      actor: createActor(world, person === candidate.player ? 'player' : 'npc', person.fullness, {
        personality: person.personality,
        backstory: person.backstory,
        traits: person.traits,
        initialGoals: person.initialGoals,
      }),
    };
    world.memories[person.id] = [];
    world.knowledge[person.id] = [];
  }
  for (const scene of candidate.scene) {
    reserveEntityId(world, scene.id);
    const entity: Entity = {
      id: scene.id,
      name: scene.name,
      kind: scene.kind === 'fire' ? 'campfire' : scene.kind === 'hare' ? 'animal' : 'resource',
      spatial: { bodyProfileId: scene.kind === 'hare' ? 'hare' : 'object', heading: 0 },
      placement: worldPlacement(structuredClone(scene.position), scene.supportSurfaceId),
    };
    if (scene.kind === 'resource') {
      const resource = BASE_OPENING_RESOURCES.find(
        (resource) => resource.definitionId === scene.definition.id,
      )!;
      entity.resource = {
        definitionId: resource.definitionId,
        quantity: scene.quantity,
        workSeconds: resource.workSeconds,
      };
    } else if (scene.kind === 'fire')
      entity.heat = { lit: scene.fuelSeconds > 0, fuelSeconds: scene.fuelSeconds };
    else {
      entity.actor = nativeActor(
        'hare',
        world.simTime,
        world.moduleManifest.definitions.filter(
          (definition) => definition.id === 'wilderness:energy',
        ),
      );
      entity.animal = {
        threatPosition: null,
        threatId: null,
        escapeHeading: null,
        calmRate: 0,
        reviewAt: 0,
        danger: 0,
        wanderSeconds: 150,
      };
    }
    world.entities[entity.id] = entity;
  }
  for (const stock of candidate.stock)
    createItemLot(world, stock.ownerId, stock.definition.id, stock.quantity, stock.id);
  const installed = new Map<BaseOpeningMethod, string>();
  for (const knowledge of candidate.knowledge) {
    let recipeId = installed.get(knowledge.method);
    if (!recipeId) {
      recipeId = installRecipe(world, methods[knowledge.method], {
        source: 'authored-world',
        profile: { ...world.profile },
      }).recipe.id;
      installed.set(knowledge.method, recipeId);
    }
    learnRecipe(world, knowledge.actorId, recipeId, 'authored', `opening:${knowledge.method}`);
  }
  // Exact support validity alone does not establish body clearance at an authored spawn.
  for (const entity of Object.values(world.entities))
    if (
      entity.placement?.mode === 'world' &&
      !isWalkable(
        world,
        entity.placement.position,
        entity.placement.supportSurfaceId ?? undefined,
        bodyProfile(entity),
      )
    )
      throw new Error(
        `The selected starting position for ${entity.name} has no valid body clearance and support.`,
      );
  prepareBaseInitialWorldState(world);
  return {
    world,
    accountRoles: [
      ...accounts.creatorAccountIds.map((accountId) => ({
        accountId,
        actorId: null,
        role: 'creator' as const,
      })),
      { accountId: accounts.playerAccountId, actorId: candidate.player.id, role: 'player' },
    ],
    constructionSeeds: [],
  };
}
