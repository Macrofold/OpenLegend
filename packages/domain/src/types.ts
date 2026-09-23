import type { ActorMind } from './mind.js';
import type { SurfacePoint, SpatialMap, WorldPoint } from '@open-legend/spatial';
/** All authoritative state is JSON data. The kernel owns no I/O or ambient clock. */
export type Position = WorldPoint;
export type Terrain = 'grass' | 'sand' | 'water' | 'rock';
export interface WorldMap extends SpatialMap {}
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
  /** Consumed by the installed item-handling mechanic; absent means not portable. */
  portable?: boolean;
  gatheringTool?: { resourceId: string; quantity: number };
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
    kind: 'launcher' | 'ammunition' | 'gathering-tool';
    gatheringTool?: { resourceId: string; quantity: number };
    name: string;
    description: string;
    properties: MaterialProperty[];
    launcher?: Launcher;
    ammunition?: Ammunition;
  };
}
export interface DeclarationProvenance {
  derivedFrom?: { recipeId: string; version: number; digest: string };
  authority: import('./invention-policy.js').InventionAuthority;
  requestId: string;
  actorId: string;
  source: 'live-model' | 'test-fixture' | 'supplied-proposal';
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
  | 'pickup'
  | 'strike'
  | 'move'
  | 'gather'
  | 'prepare'
  | 'craft'
  | 'hunt'
  | 'harvest'
  | 'cook'
  | 'status-effect'
  | 'replenish';
export interface Action {
  id: string;
  type: ActionType;
  stage: 'approaching' | 'working';
  targetId?: string;
  destination?: SurfacePoint;
  path: SurfacePoint[];
  /** Admitted work awaiting derived data; no positions, costs or effects are supplied by a client. */
  navigation?: { request: import('@open-legend/spatial').NavigationRequest; failure?: string };
  replans?: number;
  remainingSeconds: number;
  totalSeconds: number;
  attributeId?: string;
  definitionId?: string;
  definitionVersion?: number;
  transferred?: number;
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
  senses?: string[];
  /** Receiver-private provenance, never part of a contact projection. */
  contacts?: Record<string, import('./perception.js').ContactEpisode>;
  attributes?: Record<string, import('./world-modules.js').AttributeState>;
  /** Descriptive starting traits, not mechanical bonuses. Saved with the actor. */
  traits?: CharacterTrait[];
  /** God-authored identity seeds are descriptive context, never mechanical authority. */
  description?: string;
  personality?: string;
  backstory?: string;
  initialGoals?: string[];
  agency: import('./agency.js').ActorAgency;
  controller: 'player' | 'npc' | 'native';
  species?: 'human' | 'hare' | 'deer' | 'construct' | 'bird';
  body?: import('./living.js').LivingBody;
  capabilities?: {
    cognition: boolean;
    memory: boolean;
    innerWorld: boolean;
    speech: boolean;
    needs: boolean;
  };
  health: number;
  fullness?: number;
  energy?: number;
  alive: boolean;
  incapacitated: boolean;
  bornAt: number;
  /** Legacy animals have no recorded birth time; bornAt is only a placeholder then. */
  birthTimeKnown?: boolean;
  action: Action | null;
  equippedItemId: string | null;
  planGeneration: number;
}
export interface AnimalComponent {
  /** Legacy import fields only. Migration removes these; actor owns physical state. */
  species?: 'hare' | 'deer';
  health?: number;
  alive?: boolean;
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
  statusEffects?: Record<string, import('./status-effects.js').StatusEffectInstance>;
  /** Sparse attributes for non-actor entities; actors retain their existing owner. */
  attributes?: Record<string, import('./world-modules.js').AttributeState>;
  mechanismFields?: Record<string, Record<string, number>>;
  id: string;
  name: string;
  kind: 'player' | 'npc' | 'animal' | 'resource' | 'campfire' | 'remains' | 'item-pile';
  position: Position;
  /** Appearance is never a source of body dimensions or movement capability. */
  appearance?: 'sprite' | 'crate-mesh';
  spatial: import('./spatial-state.js').EntitySpatial;
  actor?: ActorComponent;
  replenisher?: { attributeId: string; remaining: number };
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
  source: 'observed' | 'heard' | 'felt' | 'internal' | 'inferred' | 'self_thought';
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
  scope?: 'external' | 'private';
  /** Committed occurrence origin, never recomputed from a source's later position. */
  origin?: Position;
  order?: number;
  conversationId?: string;
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
  goalId?: string;
  planId?: string;
}
export interface CommandReceipt {
  digest: string;
  outcome: Outcome;
}
export interface WorldState {
  knowledgeRevisions?: Record<string, number>;
  knowledgePolicy?: import('./knowledge.js').KnowledgePolicy;
  actorKnowledge?: Record<string, import('./knowledge.js').ActorKnowledge>;
  observerIdentities?: Record<
    string,
    Record<string, import('./worlds/base/knowledge.js').ObserverIdentity>
  >;
  perceptionEpisodes?: Record<string, Record<string, string>>;
  itemHandling: import('./item-handling.js').ItemHandlingPolicy;
  statusEffectPolicy: import('./status-effects.js').StatusEffectPolicy;
  authorship: import('./invention-attribution.js').WorldAuthorship;
  inventionPolicy: import('./invention-policy.js').InventionPolicy;
  moduleManifest: import('./world-modules.js').WorldModuleManifest;
  storyPolicy?: import('./story-selection.js').StoryPolicy;
  storyPolicyRevision?: number;
  socialPolicy?: { conversationInactivitySeconds: number; notableThreshold: number };
  appraisals?: Record<string, import('./social.js').Appraisal[]>;
  kinships?: Record<string, import('./social.js').Kinship>;
  conversations?: import('./conversations.js').ConversationState;
  responseReceipts?: Record<string, import('./response.js').ResponseReceipt>;
  experience?: import('./experience.js').ExperienceState;
  innerWorlds?: Record<string, import('./experience.js').InnerWorld>;
  cognitionPolicy?: import('./cognition-policy.js').CognitionPolicy;
  identity?: { controlledEntityId: string; defaultResidentEntityId: string | null };
  schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  id: string;
  seed: number;
  rngState: number;
  sequence: number;
  simTime: number;
  paused: boolean;
  profile: { id: 'grounded-wilderness'; version: 1 };
  map: WorldMap;
  flightRoutes: Record<string, import('./spatial-state.js').FlightRoute>;
  entities: Record<string, Entity>;
  items: Record<string, ItemInstance>;
  itemDefinitions: Record<string, ItemDefinition>;
  recipes: Record<string, RecipeDefinition>;
  memories: Record<string, MemoryRecord[]>;
  minds?: Record<string, ActorMind>;
  visibleObjects?: Record<string, string[]>;
  visiblePeople?: Record<string, string[]>;
  knowledge: Record<string, KnowledgeRecord[]>;
  events: WorldEvent[];
  /** Durable history rows outside the active event working set; not deleted evidence. */
  archivedEventCount?: number;
  commandReceipts: Record<string, CommandReceipt>;
  declarationReceipts: Record<
    string,
    {
      digest: string;
      recipeId: string;
      attribution: import('./invention-attribution.js').InventionAttribution;
    }
  >;
  nextId: number;
}
interface Envelope {
  id: string;
  actorId: string;
}
export type Command = Envelope &
  (
    | {
        type: 'conversation';
        operation: 'join' | 'leave';
        conversationId: string;
        generation: number;
      }
    | { type: 'pickup'; targetId: string; itemId?: string }
    | { type: 'drop'; itemId: string; quantity: number }
    | { type: 'move'; destination: SurfacePoint }
    | { type: 'gather' | 'harvest'; targetId: string }
    | { type: 'prepare'; preparation: NativePreparation }
    | { type: 'craft'; recipeId: string }
    | { type: 'replenish'; targetId: string; attributeId: string }
    | { type: 'equip' | 'eat'; itemId: string }
    | { type: 'strike'; definitionId: string; targetId: string }
    | { type: 'hunt'; targetId: string; weaponItemId?: string; ammoItemId?: string }
    | { type: 'cook'; itemId: string; heatId: string }
    | {
        type: 'status-effect';
        targetId: string;
        definitionId: string;
        operation: 'activate' | 'deactivate';
      }
    | { type: 'cancel' | 'recover' }
    | {
        type: 'say';
        text: string;
        targetId?: string;
        intendedRecipientId?: string;
        selfIntroduction?: string;
      }
    | { type: 'goal'; text: string }
    | { type: 'withdraw-attempt'; attemptId: string }
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

export interface GodPersonEditorDraft {
  inventory?: Array<{ definitionId: string; quantity: number }>;
  name: string;
  description: string;
  personality: string;
  backstory: string;
  traitIds: string[];
  goals: string[];
  stats: {
    health: number;
    fullness?: number;
    energy?: number;
  };
}

export interface GodSpawnDraft {
  type: GodSpawnType;
  position: SurfacePoint;
  person?: GodPersonDraft;
}

export type ExperienceEntry =
  | { source: 'awareness'; value: import('./experience.js').Awareness }
  | { source: 'memory'; value: MemoryRecord }
  | { source: 'summary'; value: import('./experience.js').ExperienceSummary };
export type GodMemoryEdit = ExperienceEntry;

export interface GodPersonEdit {
  actorId: string;
  person: GodPersonEditorDraft;
  memoryChanges: Array<{ entryId: string; replacement: GodMemoryEdit | null }>;
}
export interface ActorObservation {
  worldId: string;
  at: number;
  actor: Entity;
  visibleEntities: Entity[];
  contacts: import('./perception.js').ContactView[];
  groundItems: ItemInstance[];
  inventory: ItemInstance[];
  itemDefinitions: ItemDefinition[];
  knownRecipes: RecipeDefinition[];
  memories: MemoryRecord[];
  recentEvents: WorldEvent[];
}
