import type { ActorMind } from './mind.js';
/** All authoritative state is JSON data. The kernel owns no I/O or ambient clock. */
export interface Position {
  x: number;
  z: number;
}
export type Terrain = 'grass' | 'sand' | 'water' | 'rock';
export interface WorldMap {
  width: number;
  height: number;
  tiles: Terrain[][];
}
export type MaterialProperty =
  | 'fiber'
  | 'binding'
  | 'flexible'
  | 'rigid'
  | 'shaft'
  | 'pouch'
  | 'point'
  | 'projectile'
  | 'food'
  | 'fuel';
export interface Launcher {
  mechanism: 'swing' | 'flex';
  ammunitionKind: 'stone' | 'arrow';
  damage: number;
  range: number;
  accuracy: number;
}
export interface Ammunition {
  kind: 'stone' | 'arrow';
  damageBonus: number;
}
export interface ItemDefinition {
  id: string;
  version: number;
  name: string;
  description: string;
  properties: MaterialProperty[];
  nutrition?: number;
  cooked?: boolean;
  launcher?: Launcher;
  ammunition?: Ammunition;
  recipeId?: string;
}
export interface ItemInstance {
  id: string;
  definitionId: string;
  quantity: number;
  ownerId: string;
}
export type InputRole = 'binding' | 'body' | 'pouch' | 'shaft' | 'point' | 'fletching';
export interface RecipeInput {
  definitionId: string;
  quantity: number;
  role: InputRole;
}
export interface DeclarationDraft {
  schemaVersion: 1;
  name: string;
  description: string;
  inputs: RecipeInput[];
  workSeconds: number;
  output: {
    kind: 'launcher' | 'ammunition';
    name: string;
    description: string;
    properties: MaterialProperty[];
    launcher?: Launcher;
    ammunition?: Ammunition;
  };
}
export interface DeclarationProvenance {
  requestId: string;
  actorId: string;
  source: 'live-model' | 'test-fixture';
  model?: string;
  evidence?: string[];
}
export interface RecipeDefinition extends DeclarationDraft {
  id: string;
  version: 1;
  digest: string;
  outputDefinitionId: string;
  admittedAt: number;
  provenance: DeclarationProvenance;
}
export type NativePreparation = 'fiber' | 'cord';
export type ActionType =
  | 'move'
  | 'gather'
  | 'prepare'
  | 'craft'
  | 'hunt'
  | 'harvest'
  | 'cook'
  | 'rest';
export interface Action {
  id: string;
  type: ActionType;
  stage: 'approaching' | 'working';
  targetId?: string;
  destination?: Position;
  path: Position[];
  remainingSeconds: number;
  totalSeconds: number;
  recipeId?: string;
  preparation?: NativePreparation;
  itemId?: string;
  weaponItemId?: string;
  ammoItemId?: string;
  heatId?: string;
  /** Inputs leave inventory at work start, never refunded by cancel or restart. */
  consumed: { definitionId: string; quantity: number }[];
}
export interface CharacterTrait {
  id: string;
  name: string;
  description: string;
}

export interface ActorComponent {
  /** Descriptive starting traits, not mechanical bonuses. Saved with the actor. */
  traits?: CharacterTrait[];
  /** God-authored identity seeds are descriptive context, never mechanical authority. */
  personality?: string;
  backstory?: string;
  initialGoals?: string[];
  rest?: import('./sleep.js').RestState;
  controller: 'player' | 'npc';
  health: number;
  fullness: number;
  energy: number;
  alive: boolean;
  incapacitated: boolean;
  bornAt: number;
  action: Action | null;
  equippedItemId: string | null;
  goal: string;
  planGeneration: number;
}
export interface AnimalComponent {
  species: 'hare' | 'deer';
  health: number;
  alive: boolean;
  fleeFrom: Position | null;
  fleeSeconds: number;
  wanderSeconds: number;
}
export interface ResourceComponent {
  definitionId: string;
  quantity: number;
  workSeconds: number;
}
export interface RemainsComponent {
  sourceId: string;
  yields: { definitionId: string; quantity: number }[];
  harvested: boolean;
}
export interface HeatComponent {
  fuelSeconds: number;
  lit: boolean;
}
export interface Entity {
  id: string;
  name: string;
  kind: 'player' | 'npc' | 'animal' | 'resource' | 'campfire' | 'remains';
  position: Position;
  actor?: ActorComponent;
  animal?: AnimalComponent;
  resource?: ResourceComponent;
  remains?: RemainsComponent;
  heat?: HeatComponent;
}
export interface MemoryRecord {
  obligation?: import('./commitments.js').Obligation;
  /** Native attribution survives event-log rotation; never supplied by model proposals. */
  eventType?: string;
  speakerId?: string;
  sequence?: number;
  id: string;
  actorId: string;
  kind: 'episode' | 'belief' | 'commitment' | 'reflection';
  source: 'observed' | 'heard' | 'inferred' | 'self_thought';
  responseId?: string;
  summary: string;
  at: number;
  entityIds: string[];
  eventId?: string;
  importance: number;
  resolved?: boolean;
}
export interface KnowledgeRecord {
  recipeId: string;
  learnedAt: number;
  source: 'invented' | 'taught' | 'practiced';
  evidenceId: string;
}
export interface WorldEvent {
  id: string;
  sequence: number;
  at: number;
  type: string;
  text: string;
  actorId?: string;
  targetId?: string;
  audience: string[];
  importance?: number;
  urgency?: number;
  data?: Record<string, string | number | boolean | null>;
}
export interface Outcome {
  ok: boolean;
  code: string;
  message: string;
  recipeId?: string;
  itemId?: string;
}
export interface CommandReceipt {
  digest: string;
  outcome: Outcome;
}
export interface WorldState {
  responseReceipts?: Record<string, import('./response.js').ResponseReceipt>;
  experience?: import('./experience.js').ExperienceState;
  innerWorlds?: Record<string, import('./experience.js').InnerWorld>;
  cognitionPolicy?: import('./cognition-policy.js').CognitionPolicy;
  schemaVersion: 1 | 2;
  id: string;
  seed: number;
  rngState: number;
  sequence: number;
  simTime: number;
  paused: boolean;
  profile: { id: 'grounded-wilderness'; version: 1 };
  map: WorldMap;
  entities: Record<string, Entity>;
  items: Record<string, ItemInstance>;
  itemDefinitions: Record<string, ItemDefinition>;
  recipes: Record<string, RecipeDefinition>;
  memories: Record<string, MemoryRecord[]>;
  minds?: Record<string, ActorMind>;
  visiblePeople?: Record<string, string[]>;
  knowledge: Record<string, KnowledgeRecord[]>;
  events: WorldEvent[];
  commandReceipts: Record<string, CommandReceipt>;
  declarationReceipts: Record<string, { digest: string; recipeId: string }>;
  nextId: number;
}
interface Envelope {
  id: string;
  actorId: string;
}
export type Command = Envelope &
  (
    | { type: 'move'; destination: Position }
    | { type: 'gather' | 'harvest'; targetId: string }
    | { type: 'prepare'; preparation: NativePreparation }
    | { type: 'craft'; recipeId: string }
    | { type: 'equip' | 'eat'; itemId: string }
    | { type: 'hunt'; targetId: string; weaponItemId?: string; ammoItemId?: string }
    | { type: 'cook'; itemId: string; heatId: string }
    | { type: 'rest' | 'cancel' | 'recover' }
    | { type: 'say'; text: string; targetId?: string }
    | { type: 'goal'; text: string }
    | { type: 'teach'; targetId: string; recipeId: string }
  );
export interface Transition {
  world: WorldState;
  events: WorldEvent[];
  outcome: Outcome;
  invalidatedMemoryIds?: Record<string, string[]>;
}

export type GodSpawnType =
  | 'person'
  | 'banked-campfire'
  | 'berry-bush'
  | 'berry-thicket'
  | 'deer'
  | 'dry-grass-fibers'
  | 'fallen-branches'
  | 'hare'
  | 'river-reeds'
  | 'river-stones';

export interface GodPersonDraft {
  name: string;
  personality: string;
  backstory: string;
  traitIds: string[];
  initialGoals: string[];
}

export interface GodSpawnDraft {
  type: GodSpawnType;
  position: Position;
  person?: GodPersonDraft;
}

export type ExperienceEntry =
  | { source: 'awareness'; value: import('./experience.js').Awareness }
  | { source: 'memory'; value: MemoryRecord }
  | { source: 'summary'; value: import('./experience.js').ExperienceSummary };
export type GodMemoryEdit = ExperienceEntry;

export interface GodPersonEdit {
  actorId: string;
  person: GodPersonDraft;
  memoryChanges: Array<{ entryId: string; replacement: GodMemoryEdit | null }>;
}
export interface ActorObservation {
  worldId: string;
  at: number;
  actor: Entity;
  visibleEntities: Entity[];
  inventory: ItemInstance[];
  itemDefinitions: ItemDefinition[];
  knownRecipes: RecipeDefinition[];
  memories: MemoryRecord[];
  recentEvents: WorldEvent[];
}
