import type { ActorMind } from './mind.js';
import type { Named } from '@open-legend/language';
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
export interface ItemDefinition extends Named {
  /** Authored labels project existing components; they never duplicate component values. */
  characteristics?: import('./item-characteristics.js').ItemCharacteristicDescriptor[];
  melee?: import('./strikes.js').MeleeProfile;
  /** Consumed by the installed item-handling mechanic; absent means not portable. */
  portable?: boolean;
  gatheringTool?: { resourceId: string; quantity: number };
  packingLoad?: number;
  container?: { capacity: number; maximumDepth: number };
  id: string;
  version: number;
  description: string;
  properties: MaterialProperty[];
  nutrition?: number;
  cooked?: boolean;
  launcher?: Launcher;
  ammunition?: Ammunition;
  recipeId?: string;
  /** Trusted compiler output, never independent proof of reusable material eligibility. */
  material?: import('./invention-families.js').MaterialInterface;
}
/** Read-only custody projection; ItemLot and Placement are the mutation owners. */
export interface ItemInstance {
  individuality?: 'homogeneous' | 'individual';
  placementRevision?: number;
  container?: import('./objects.js').ContainerState;
  revision?: number;
  id: string;
  definitionId: string;
  quantity: number;
  ownerId: string;
}
/** Roles belong to the selected installed recipe family, not to the engine. */
export type InputRole = string;
export interface RecipeInput {
  definitionId: string;
  quantity: number;
  role: InputRole;
}
export interface RecipeCandidate {
  family: { id: string; version: number };
  name: string;
  description: string;
  inputs: RecipeInput[];
  output: {
    name: string;
    description: string;
  };
  /** Untrusted until the selected installed family's native validator accepts it. */
  parameters: Record<string, unknown>;
}
export type DeclarationDraft = RecipeCandidate;
export interface DeclarationProvenance {
  derivedFrom?: { recipeId: string; version: number; digest: string };
  authority: import('./invention-policy.js').InventionAuthority;
  requestId: string;
  actorId: string;
  source: 'live-model' | 'test-fixture' | 'supplied-proposal';
  model?: string;
  evidence?: string[];
}
export interface RecipeDefinition {
  name: string;
  description: string;
  inputs: RecipeInput[];
  workSeconds: number;
  output: { name: string; description: string };
  sourceCandidate: RecipeCandidate;
  familyPin: import('./world-modules.js').DefinitionPin;
  dependencyReferences: import('./invention-families.js').RecipeDependencyReference[];
  facts: import('./invention-families.js').RecipeFact[];
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
  | 'follow'
  | 'move'
  | 'gather'
  | 'prepare'
  | 'craft'
  | 'hunt'
  | 'harvest'
  | 'cook'
  | 'status-effect'
  | 'replenish'
  | 'tend-fire';
export interface Action {
  /** The manufacturing meaning chosen when work started, independent of later authoring. */
  recipePin?: import('./world-modules.js').DefinitionPin;
  strikePhase?: 'windup' | 'recovery';
  strikeOutcome?: 'hit' | 'miss';
  follow?: {
    distance: number;
    nextRepathAt: number;
    lastObservedPosition?: Position;
    /** Where the follower last saw the target, and its observed direction of travel. */
    lastSeen?: { point: SurfacePoint; at: number };
    /** The encounter being followed; a later sighting must be the same one or recognized. */
    episode?: string;
    travelHeading?: number;
    relation?: 'behind' | 'beside';
    /** Beside: +1 is the target's right, -1 its left, fixed when the relation starts. */
    side?: 1 | -1;
    onLost?: 'last-seen';
    /** Moving to the last-seen point after losing sight; never the hidden live position. */
    pursuing?: boolean;
    /** Absolute simulation deadline; reaching it completes the activity. */
    until?: number;
  };
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
  resourceDefinition?: import('./world-modules.js').DefinitionPin;
  transferred?: number;
  /** Exact units a pickup moves from its one selected stack. */
  quantity?: number;
  recipeId?: string;
  preparation?: NativePreparation;
  itemId?: string;
  weaponItemId?: string;
  ammoItemId?: string;
  heatId?: string;
  fireOperation?: import('./worlds/base/fire.js').FireOperation;
  fireGuard?: import('./worlds/base/fire.js').FireStockGuard;
  /** Inputs leave inventory at work start, never refunded by cancel or restart. */
  consumed: { definitionId: string; quantity: number }[];
}
export interface CharacterTrait {
  id: string;
  name: string;
  description: string;
}

export interface ActorComponent {
  conditions?: Record<string, import('./conditions.js').ConditionEpisode>;
  /** Attack recovery survives cancelling an already committed swing. */
  attackReadyAt?: number;
  inventoryInspection?: import('./inventory-inspection.js').InventoryInspection;
  participation?: import('./participation-state.js').ParticipationState;
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
  };
  health: number;
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
  revision?: number;
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
export interface Entity extends Named {
  statusEffects?: Record<string, import('./status-effects.js').StatusEffectInstance>;
  /** Sparse attributes for non-actor entities; actors retain their existing owner. */
  attributes?: Record<string, import('./world-modules.js').AttributeState>;
  mechanismFields?: Record<string, Record<string, number>>;
  id: string;
  kind: 'player' | 'npc' | 'animal' | 'resource' | 'campfire' | 'remains' | 'item-pile' | 'item';
  inventoryRevision?: number;
  placement?: import('./spatial-state.js').Placement;
  item?: import('./objects.js').ItemLot;
  container?: import('./objects.js').ContainerState;
  declaredOwner?: import('./objects.js').DeclaredOwner;
  retirement?: import('./objects.js').ObjectRetirement;
  /** Appearance is never a source of body dimensions or movement capability. */
  appearance?: 'sprite' | 'crate-mesh' | 'mercenary-model';
  spatial: import('./spatial-state.js').EntitySpatial;
  actor?: ActorComponent;
  replenisher?: { attributeId: string; remaining: number; revision?: number };
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
/** Closed, trusted occurrence scope; only native/server code assigns it.
 * - external: exposed through senses to the audience resolved at occurrence time.
 * - private: owner-only internal change or observer-private acquisition.
 * - system: control or diagnostic notice; never character evidence or a story candidate.
 * docs/events-perception-and-reactions.md#4-scope-and-event-identity */
export type EventScope = 'external' | 'private' | 'system';
export interface WorldEvent {
  scope?: EventScope;
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
  /** Actual committed homogeneous units; absent is not evidence of spending. */
  spent?: number;
  outputs?: import('./action-experience.js').ActivityOutput[];
  ok: boolean;
  code: string;
  message: string;
  recipeId?: string;
  itemId?: string;
  goalId?: string;
  planId?: string;
  /** Exact action started by this result; command identity is a separate receipt key. */
  actionId?: string;
}
export interface CommandReceipt {
  digest: string;
  outcome: Outcome;
}
export interface WorldState {
  actionExperience: import('./action-experience.js').ActionExperienceState;
  workState?: import('./work-budget.js').WorkState;
  participationPolicy?: { safeReturnAnchor?: import('@open-legend/spatial').SurfacePoint };
  resourceReservations?: Record<string, import('./resource-claims.js').ResourceReservation>;
  /** Pending offers only, bounded per offerer; saved with the world settings record. */
  itemOffers?: Record<string, import('./handover.js').ItemOffer>;
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
  /** Shared outward-feature baseline for the completed perception phase, not private knowledge. */
  perceptionFeatures: Record<string, string>;
  authorship: import('./invention-attribution.js').WorldAuthorship;
  inventionPolicy: import('./invention-policy.js').InventionPolicy;
  moduleManifest: import('./world-modules.js').WorldModuleManifest;
  storyPolicy?: import('./story-selection.js').StoryPolicy;
  storyPolicyRevision?: number;
  socialPolicy?: { conversationInactivitySeconds: number; notableThreshold: number };
  appraisals?: Record<string, Record<string, import('./appraisals.js').Appraisal>>;
  appraisalProcesses?: Record<string, import('./appraisals.js').AppraisalProcess>;
  kinships?: Record<string, import('./social.js').Kinship>;
  conversations?: import('./conversations.js').ConversationState;
  responseReceipts?: Record<string, import('./response.js').ResponseReceipt>;
  experience?: import('./experience.js').ExperienceState;
  innerWorlds?: Record<string, import('./experience.js').InnerWorld>;
  cognitionPolicy: import('./cognition-policy.js').CognitionPolicy;
  identity?: { controlledEntityId: string; defaultResidentEntityId: string | null };
  schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
  id: string;
  seed: number;
  rngState: number;
  sequence: number;
  simTime: number;
  /** Sampling progress affects evidence times; rates and perception caches are rebuilt. */
  nativeInterval?: { remainingSeconds: number; endsAt?: number };
  paused: boolean;
  profile: { id: 'grounded-wilderness'; version: 1 };
  map: WorldMap;
  flightRoutes: Record<string, import('./spatial-state.js').FlightRoute>;
  entities: Record<string, Entity>;
  objectState: { revision: number };
  objectLineage?: Record<string, import('./objects.js').ObjectLineage>;
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
  /** Selected meaning only; never native effect authority. */
  purpose?: string;
  id: string;
  actorId: string;
}
export type Command = Envelope &
  (
    | {
        type: 'activity';
        methodId: string;
        bindings: Record<string, import('./action-experience.js').ActivityBinding>;
        resume?: boolean;
        /** Pause current work first; a refused start rolls the pause back too. */
        interrupt?: boolean;
      }
    | {
        /** A requested bounded composition run by the activity executor; no new effects. */
        type: 'compose';
        name: string;
        root: import('./action-experience.js').ActivityNode;
        bindings: Record<string, import('./action-experience.js').ActivityBinding>;
        mode: 'enqueue' | 'replace' | 'interrupt';
        control?: import('./activity-execution.js').ChosenActivityControl;
        /** Things the request is about that no step names (e.g. where a walk goes). Used
         * only for target matching and encounter pins; grants nothing. */
        subjects?: string[];
      }
    | {
        type: 'conversation';
        operation: 'join' | 'leave';
        conversationId: string;
        generation: number;
      }
    /** quantity picks up exactly that many from one divisible stack (itemId required). */
    | { type: 'pickup'; targetId: string; itemId?: string; quantity?: number }
    | { type: 'drop'; itemId: string; quantity: number }
    | {
        type: 'transfer-stock';
        sourceId: string;
        destinationId: string;
        definitionId: string;
        definitionVersion: number;
        definitionDigest: string;
        quantity: number;
        minimumHeld: number;
      }
    | {
        type: 'transfer-item' | 'split-item' | 'merge-item';
        itemId: string;
        quantity: number;
        targetId: string;
        expectedRevision: number;
        placementRevision: number;
        /** A container's children can change without changing its item or placement. */
        expectedContentsRevision?: number;
        targetRevision: number;
      }
    | { type: 'unequip'; itemId: string; expectedRevision: number; placementRevision: number }
    | { type: 'move'; destination: SurfacePoint }
    | {
        type: 'follow';
        targetId: string;
        distance?: number;
        /** Beside picks the side the follower starts on; left/right fix it. */
        relation?: 'behind' | 'beside' | 'left' | 'right';
        onLost?: 'last-seen';
        until?: number;
      }
    | { type: 'gather' | 'harvest'; targetId: string }
    | { type: 'prepare'; preparation: NativePreparation }
    | { type: 'craft'; recipeId: string }
    | { type: 'replenish'; targetId: string; attributeId: string }
    | { type: 'equip' | 'eat'; itemId: string }
    | { type: 'strike'; definitionId: string; targetId: string; weaponItemId?: string }
    | { type: 'hunt'; targetId: string; weaponItemId?: string; ammoItemId?: string }
    | { type: 'cook'; itemId: string; heatId: string }
    | {
        type: 'handover';
        operation: 'offer';
        targetId: string;
        itemId: string;
        quantity: number;
        /** Human-held selections may pin current items and recipient possessions. */
        expectedRevision?: number;
        placementRevision?: number;
        expectedContentsRevision?: number;
        targetRevision?: number;
      }
    | {
        type: 'handover';
        operation: 'accept' | 'decline' | 'withdraw';
        targetId: string;
        offerId: string;
      }
    | {
        type: 'tend-fire';
        operation: import('./worlds/base/fire.js').FireOperation;
        targetId: string;
        itemId?: string;
        definitionId?: string;
        definitionVersion?: number;
        definitionDigest?: string;
        minimumHeld?: number;
        onlyWhenLow?: boolean;
      }
    | {
        type: 'status-effect';
        targetId: string;
        definitionId: string;
        operation: 'activate' | 'deactivate';
      }
    | {
        type: 'inspect-inventory';
        containerId?: string;
        after?: string;
        expectedRevision?: number;
        expectedScope?: string;
      }
    | { type: 'inspect-activities'; after: number; methodAfter?: number }
    | { type: 'cancel'; expectedActionId?: string }
    | { type: 'recover' }
    | {
        type: 'say';
        text: string;
        targetId?: string;
        intendedRecipientId?: string;
        selfIntroduction?: string;
        volume?: import('./acoustics.js').SpeechVolume;
      }
    | { type: 'goal'; text: string }
    | { type: 'withdraw-attempt' | 'confirm-attempt'; attemptId: string }
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
  meters: Record<string, number>;
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
