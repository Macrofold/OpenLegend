import type { ActorMind } from './mind.js';
import type { Named } from '@open-legend/language';
import type { SurfacePoint, SpatialMap, WorldPoint } from '@open-legend/spatial';
/** All authoritative state is JSON data. The kernel owns no I/O or ambient clock. */
export type Position = WorldPoint;
export type Terrain = import('@open-legend/spatial').Terrain;
export interface WorldMap extends SpatialMap {}
export const MATERIAL_PROPERTIES = [
  'fiber',
  'binding',
  'flexible',
  'rigid',
  'shaft',
  'pouch',
  'point',
  'projectile',
  'food',
  'fuel',
] as const;
export type MaterialProperty = (typeof MATERIAL_PROPERTIES)[number];
export interface RangedWeapon {
  mechanism: 'swing' | 'flex';
  ammunitionKind: 'stone' | 'arrow';
  damage: number;
  range: number;
  accuracy: number;
  flightSpeed: number;
  recoverySeconds: number;
}
export interface Ammunition {
  kind: 'stone' | 'arrow';
  damageBonus: number;
}
export interface ItemDefinition extends Named {
  /** Authored semantic key; clients resolve only their trusted icon catalogue. */
  icon?: string;
  /** The installed gathering capability's shortcut label, independent of its identity. */
  gatherLabel?: string;
  mechanismFields?: Record<string, Record<string, number>>;
  assemblyMaterial?: import('./assembly-types.js').AssemblyMaterial;
  /** Exact input provenance can be retained before a material becomes a part. */
  tracksMaterialOrigins?: true;
  /** Authored labels project existing components; they never duplicate component values. */
  characteristics?: import('./item-characteristics.js').ItemCharacteristicDescriptor[];
  melee?: import('./strikes.js').MeleeProfile;
  execution?: import('./combat-execution.js').AttackExecutionProfile;
  equipment?: import('./equipment.js').EquipmentProfile;
  contactDefense?: import('./contact-defense.js').ContactDefenseProfile;
  /** Consumed by the installed item-handling mechanic; absent means not portable. */
  portable?: boolean;
  gatheringTool?: { resourceId: string; quantity: number };
  fishingTool?: { kind: string };
  packingLoad?: number;
  /** Authored finite stock dimensions; no general item physics is inferred. */
  stockShape?: { usableLengthMeters: number };
  container?: {
    capacity: number;
    maximumDepth: number;
  };
  contentsExposure?: { profile: import('./world-modules.js').DefinitionPin };
  id: string;
  version: number;
  description: string;
  properties: MaterialProperty[];
  nutrition?: number;
  cooked?: boolean;
  rangedWeapon?: RangedWeapon;
  ammunition?: Ammunition;
  recipeId?: string;
  /** Trusted disclosure of one exact installed method; prose grants no execution. */
  placeReport?: Extract<import('./places.js').EncounterExposure, { kind: 'place' }>;
  recipeRecord?: {
    method: import('./world-modules.js').DefinitionPin;
    disclosure: 'method';
  };
  /** Authored written text disclosed only when the physical record is inspected. */
  inscription?: string;
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
export interface AuthoredRecipeProvenance {
  source: 'authored-world';
  profile: { id: string; version: number };
}
/** Trusted authored conversion, never an option in player-generated family JSON. */
export interface FixedTransformDefinition {
  id: string;
  version: number;
  name: string;
  description: string;
  workSeconds: number;
  inputs: RecipeInput[];
  retainedTools: Array<{ role: string; quantity: number; allowedDefinitionIds: string[] }>;
  outputs: Array<{ port: string; definitionId: string; quantity: number }>;
}
export interface RecipeDefinition {
  name: string;
  description: string;
  inputs: RecipeInput[];
  workSeconds: number;
  /** Ordered physical results; an output's meaning includes its exact definition. */
  outputs: Array<{
    port: string;
    definition: import('./world-modules.js').DefinitionPin;
    quantity: number;
  }>;
  source:
    | {
        kind: 'family';
        candidate: RecipeCandidate;
        familyPin: import('./world-modules.js').DefinitionPin;
      }
    | {
        kind: 'fixed-transform';
        definition: FixedTransformDefinition;
        implementationPin: import('./world-modules.js').DefinitionPin;
      };
  retainedTools: Array<{
    role: string;
    quantity: number;
    allowedDefinitions: import('./world-modules.js').DefinitionPin[];
  }>;
  dependencyReferences: import('./invention-families.js').RecipeDependencyReference[];
  facts: import('./invention-families.js').RecipeFact[];
  id: string;
  version: 1;
  digest: string;
  admittedAt: number;
  provenance: DeclarationProvenance | AuthoredRecipeProvenance;
}
export type ActionType =
  | 'feed'
  | 'aim'
  | 'shoot-once'
  | 'guard'
  | 'pickup'
  | 'strike'
  | 'follow'
  | 'move'
  | 'evade'
  | 'gather'
  | 'craft'
  | 'hunt'
  | 'practice-shot'
  | 'coaching'
  | 'harvest'
  | 'cook'
  | 'fish'
  | 'status-effect'
  | 'treat-scar'
  | 'replenish'
  | 'tend-fire'
  | 'place-hearth'
  | 'assemble'
  | 'impact-boundary'
  | 'operate-gate';
export interface Action {
  feeding?: import('./native-feeding.js').NativeFeedingBinding;
  gathering?: import('./gathering.js').GatheringBinding;
  nativeLocomotion?: import('./native-response.js').NativeLocomotion;
  /** Exact personal cue receipts for this committed activity, never target authority. */
  attackObservers?: Record<string, import('./combat-encounters.js').AttackObservationReceipt>;
  cooperation?: import('./cooperation.js').CooperationPurposeBinding;
  combatHelpId?: string;
  evasion?: import('./evasion.js').EvasionState;
  ranged?: import('./ranged.js').AimState;
  attackExecution?: import('./combat-execution.js').AttackExecutionState;
  competencePin?: import('./world-modules.js').DefinitionPin;
  rangedPolicyPin?: import('./world-modules.js').DefinitionPin;
  coachingEpisodeId?: string;
  assemblyPhase?: import('./assembly-types.js').AssemblyPhase;
  /** Required host preparation holds this native action; no installed part or
   * parallel movement path is saved. Answers are rebuilt after restoration. */
  assemblyExitPending?: 'admission' | 'commit';
  gateWork?: import('./boundary-types.js').GateWork;
  boundaryImpact?: import('./boundary-types.js').BoundaryImpactWork;
  hearthWork?: import('./hearths.js').HearthWork;
  assemblyCorner?: number;
  constructionGrant?: { id: string; revision: number };
  materialPermission?: import('./construction-permissions.js').MaterialPermissionBinding;
  materialOriginIds?: string[];
  materialContributionIds?: string[];
  requiresLethalReview?: boolean;
  /** The selected physical participant of an attack or follow, independent of continuing identity. */
  targetLife?: number;
  lethalPermission?: import('./combat-consent.js').LethalPermission;
  scarId?: string;
  /** The manufacturing meaning chosen when work started, independent of later authoring. */
  recipePin?: import('./world-modules.js').DefinitionPin;
  manufactureTools?: import('./manufacture.js').ManufactureToolBinding[];
  foodPreparation?: import('./food-preparation.js').FoodPreparationBinding;
  fishing?: import('./finite-casts.js').CastBinding;
  strikePhase?: 'windup' | 'recovery';
  strikeMotion?: {
    locomotion: import('./native-response.js').NativeLocomotion;
    releaseAt: number;
    observed: { point: SurfacePoint; at: number };
  };
  strikeOutcome?: 'hit' | 'miss';
  guard?: import('./contact-defense.js').GuardState;
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
    /** Finite proximity movement ends on actual arrival, rather than holding. */
    complete?: true;
  };
  id: string;
  type: ActionType;
  stage: 'approaching' | 'working';
  targetId?: string;
  destination?: SurfacePoint;
  path: SurfacePoint[];
  /** Remaining bounded travel before the next movement sample; persists across private timer steps. */
  motionSampleRemainingMetres?: number;
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
  /** Owner-only occurrence notice; contains no assailant identity or location. */
  attackModeNotice?: import('./combat-encounters.js').AttackModeNotice;
  /** Personally acquired short-lived danger and own offense; never public actor data. */
  encounters?: import('./combat-encounters.js').PersonalEncounters;
  practice?: Record<string, import('./practical-competence.js').PracticeProgress>;
  coachingEpisodeId?: string;
  /** Authored natural actions for bodies that do not use the manual-work family. */
  naturalStrikeIds?: string[];
  /** Identity/history survive a replacement body; unfinished effects do not. */
  physicalLife?: number;
  pendingDeath?: import('./reincarnation.js').PendingDeath;
  scars?: Record<string, number>;
  conditions?: Record<string, import('./conditions.js').ConditionEpisode>;
  /** Committed strike/defense recovery belongs to this body and survives action cancellation. */
  combatReadyAt?: number;
  evasionReadyAt?: number;
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
  species?: (typeof import('./worlds/base/bodies.js').BASE_SPECIES)[number];
  body?: import('./living.js').LivingBody;
  capabilities?: {
    cognition: boolean;
    memory: boolean;
    innerWorld: boolean;
    speech: boolean;
    language: boolean;
  };
  health: number;
  alive: boolean;
  incapacitated: boolean;
  bornAt: number;
  /** Legacy animals have no recorded birth time; bornAt is only a placeholder then. */
  birthTimeKnown?: boolean;
  action: Action | null;
  planGeneration: number;
}
export type AnimalComponent = import('./native-response.js').NativeResponseState;
export interface ResourceComponent {
  cast?: import('./finite-casts.js').CastSource;
  revision?: number;
  definitionId: string;
  quantity: number;
  workSeconds: number;
}
export interface RemainsComponent {
  diedAt: number;
  rotAt: number | null;
  removeAt: number | null;
  phase: 'fresh' | 'rotting' | 'removed';
  sourceId: string;
  yields: { definitionId: string; quantity: number }[];
  harvested: boolean;
}
export interface HeatComponent {
  fuelSeconds: number;
  lit: boolean;
}
export interface Entity extends Named {
  sensoryProgress?: import('./perception-timing.js').SensoryProgress;
  hearth?: import('./hearths.js').PlacedHearth;
  /** Authored appearance hint only; never evidence of capability or identity. */
  icon?: string;
  practiceTarget?: { attributeId: string };
  /** Authored outward detail, disclosed only with the perceived entity. */
  description?: string;
  threat?: import('./territorial-threat.js').TerritorialThreat;
  statusEffects?: Record<string, import('./status-effects.js').StatusEffectInstance>;
  /** Sparse attributes for non-actor entities; actors retain their existing owner. */
  attributes?: Record<string, import('./world-modules.js').AttributeState>;
  mechanismFields?: Record<string, Record<string, number>>;
  id: string;
  kind:
    | 'player'
    | 'npc'
    | 'animal'
    | 'resource'
    | 'campfire'
    | 'remains'
    | 'item-pile'
    | 'item'
    | 'practice-target'
    | 'assembly';
  assembly?: import('./assembly-types.js').AssemblyComponent;
  inventoryRevision?: number;
  placement?: import('./spatial-state.js').Placement;
  item?: import('./objects.js').ItemLot;
  container?: import('./objects.js').ContainerState;
  declaredOwner?: import('./objects.js').DeclaredOwner;
  retirement?: import('./objects.js').ObjectRetirement;
  /** Appearance is never a source of body dimensions or movement capability. */
  appearance?: string;
  spatial: import('./spatial-state.js').EntitySpatial;
  actor?: ActorComponent;
  replenisher?: { attributeId: string; remaining: number; revision?: number };
  animal?: AnimalComponent;
  resource?: ResourceComponent;
  remains?: RemainsComponent;
  heat?: HeatComponent;
}
export interface MemoryRecord {
  /** Actual native attempt that produced this personal result, not new execution authority. */
  activityId?: string;
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
  source: 'authored' | 'invented' | 'taught' | 'practiced' | 'record';
  evidenceId: string;
}
/** Closed, trusted occurrence scope; only native/server code assigns it.
 * - external: exposed through senses to the audience resolved at occurrence time.
 * - private: owner-only internal change or observer-private acquisition.
 * - system: control or diagnostic notice; never character evidence or a story candidate.
 * docs/events-perception-and-reactions.md#4-scope-and-event-identity */
export type EventScope = 'external' | 'private' | 'system';
export interface WorldEvent {
  narration?: import('./narration.js').Narration;
  exposure?: import('./places.js').EncounterExposure;
  scope?: EventScope;
  /** Committed occurrence origin, never recomputed from a source's later position. */
  origin?: Position;
  order?: number;
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
  /** The exact entity created by this result, even if it has since moved. */
  entityId?: string;
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
  hearthDefinitions?: Record<string, import('./hearths.js').HearthDefinition>;
  socialOfferPolicy?: import('./social-offer-policy.js').SocialOfferPolicy;
  workBatchPolicy?: import('./work-batches.js').WorkBatchPolicy;
  gatheringPolicy: import('./gathering.js').GatheringPolicy | null;
  /** Optional authored public wording; unnamed worlds use generic interface headings. */
  presentation?: {
    worldName: string;
    locationName: string;
    timeLabel: string;
    /** Names and the finite self-history text for the supported 24-hour clock. */
    calendar?: { dayLabel: string; historyTemplate?: string };
    introduction?: string;
    daylight?: { startTime: string; endTime: string; noonElevationDegrees: number };
    crafting?: import('./craft-catalogue.js').CraftCataloguePolicy;
    mapArt?: import('./cartography.js').MapArtDefinition;
    /** Appearance identities are authored by the installed world, never inferred from names. */
    portraits?: Record<string, import('./presentation-art.js').PortraitArt>;
    /** Exact item-definition identities; only permitted individual rows are projected. */
    itemArt?: Record<string, import('./presentation-art.js').ItemArt>;
  };
  projectiles?: Record<string, import('./ranged.js').ProjectileFlight>;
  places: Record<string, import('./places.js').PlaceDefinition>;
  /** Currently exposed definition revisions; derived perception, never remembered knowledge. */
  visiblePlaces?: Record<string, Record<string, number>>;
  coachingEpisodes?: Record<string, import('./coaching.js').CoachingEpisode>;
  assemblyFamilies?: Record<string, import('./assembly-types.js').AssemblyFamily>;
  assemblyGeometryRevision?: number;
  contentsExposureProfiles?: Record<
    string,
    import('./contents-exposure.js').ContentsExposureProfile
  >;
  dailyRainDefinitions?: Record<string, import('./assembly-types.js').DailyRainDefinition>;
  finiteRain?: import('./assembly-types.js').FiniteRain;
  actionExperience: import('./action-experience.js').ActionExperienceState;
  workState?: import('./work-budget.js').WorkState;
  /** Exact bounded runtime continuation; saves materialize it through its owner. */
  pendingNativeIntegration?: import('./native-values.js').NativeValueWindow;
  participationPolicy?: {
    safeReturnAnchor?: import('@open-legend/spatial').SurfacePoint;
    exitExposureSeconds?: number;
    exitDescription?: string;
  };
  /** Deadline authority is owned by participation, separate from operational presence. */
  exitExposures?: Record<string, number>;
  resourceReservations?: Record<string, import('./resource-claims.js').ResourceReservation>;
  /** Live exact consent, separate from each participant's ordinary movement plan. */
  outings?: Record<string, import('./outings.js').Outing>;
  socialCompacts?: Record<string, import('./social-compacts.js').SocialCompact>;
  /** Pending offers only, bounded per offerer; saved with the world settings record. */
  itemOffers?: Record<string, import('./handover.js').ItemOffer>;
  knowledgeRevisions?: Record<string, number>;
  /** Private annotations owned by each actor's editable knowledge. */
  mapMarkers?: Record<string, Record<string, import('./cartography.js').MapMarker>>;
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
  socialPolicy?: { notableThreshold: number };
  constructionProfile?: import('./assembly-types.js').ConstructionProfile;
  appraisals?: Record<string, Record<string, import('./appraisals.js').Appraisal>>;
  appraisalProcesses?: Record<string, import('./appraisals.js').AppraisalProcess>;
  familyTree?: import('./worlds/base/family.js').FamilyTree;
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
  nativeStrikes?: Record<string, import('./strikes.js').StrikeDefinition>;
  /** Exact installed native-family definitions, including referenced authored revisions. */
  supplyOpportunities?: Record<
    string,
    import('./supply-opportunities.js').SupplyOpportunityProfile
  >;
  nativeForagingProfiles?: Record<string, import('./native-foraging.js').NativeForagingProfile>;
  nativeResponseProfiles?: Record<string, import('./native-response.js').NativeResponseProfile>;
  entities: import('./entity-collection.js').EntityCollection;
  objectState: { revision: number };
  objectLineage?: Record<string, import('./objects.js').ObjectLineage>;
  itemDefinitions: Record<string, ItemDefinition>;
  foodPreparations: Record<string, import('./food-preparation.js').FoodPreparationDefinition>;
  castDefinitions: Record<string, import('./finite-casts.js').CastDefinition>;
  recipes: Record<string, RecipeDefinition>;
  memories: Record<string, MemoryRecord[]>;
  minds?: Record<string, ActorMind>;
  visibleObjects?: Record<string, string[]>;
  visiblePeople?: Record<string, string[]>;
  knowledge: Record<string, KnowledgeRecord[]>;
  events: WorldEvent[];
  /** Durable history rows outside the active event working set; not deleted evidence. */
  archivedEventCount?: number;
  commandReceipts: import('./ordered-record.js').OrderedRecord<CommandReceipt>;
  declarationReceipts: Record<
    string,
    {
      digest: string;
      recipeId: string;
      source: DeclarationProvenance['source'];
      attribution: import('./invention-attribution.js').InventionAttribution;
    }
  >;
  nextId: number;
}
interface Envelope {
  /** Exact revocable purpose; trusted callers bind this from current consent. */
  cooperation?: import('./cooperation.js').CooperationPurposeBinding;
  combatHelpId?: string;
  /** Trusted caller classification; never accepted from a public command body. */
  humanInitiated?: true;
  /** Selected meaning only; never native effect authority. */
  purpose?: string;
  chosenPurpose?: import('./action-capabilities.js').ResponsePurposeBinding;
  id: string;
  actorId: string;
}
export interface ExactInventorySource {
  itemId: string;
  quantity: number;
  revision: number;
  placementRevision: number;
}

export type Command = Envelope &
  (
    | import('./outings.js').OutingCommand
    | {
        type: 'encounter-preference';
        operation: 'speak' | 'stop';
        binding: import('./combat-encounters.js').EncounterPreferenceBinding;
      }
    | { type: 'practice-shot'; targetId: string; weaponItemId?: string; ammoItemId?: string }
    | {
        type: 'coaching';
        targetId: string;
        attributeId: string;
        operation: 'request' | 'accept' | 'decline' | 'withdraw' | 'feedback';
        episodeId?: string;
      }
    | ({ type: 'assemble' } & import('./assembly-types.js').AssemblyPhase)
    | ({ type: 'operate-gate' } & import('./boundary-types.js').GateUseIntent)
    | ({ type: 'impact-boundary' } & import('./boundary-types.js').BoundaryImpactIntent)
    | {
        type: 'place-hearth';
        definitionId: string;
        definitionVersion: number;
        definitionDigest: string;
        destination: SurfacePoint;
      }
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
        selectionQuantity?: import('./action-experience.js').ActivityQuantity;
        /** Things the request is about that no step names (e.g. where a walk goes). Used
         * only for target matching and encounter pins; grants nothing. */
        subjects?: string[];
      }
    /** quantity picks up exactly that many from one divisible stack (itemId required). */
    | { type: 'pickup'; targetId: string; itemId?: string; quantity?: number }
    | { type: 'drop'; itemId: string; quantity: number; sources?: ExactInventorySource[] }
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
        sources?: ExactInventorySource[];
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
    | (({ type: 'move' } | { type: 'evade' }) & { destination: SurfacePoint })
    | {
        type: 'follow';
        targetId: string;
        distance?: number;
        /** Beside picks the side the follower starts on; left/right fix it. */
        relation?: 'behind' | 'beside' | 'left' | 'right';
        onLost?: 'last-seen';
        until?: number;
        complete?: true;
      }
    | {
        type: 'gather';
        targetId: string;
        itemId?: string;
        gatheringMode?: 'bare-hands' | 'carried-tool';
      }
    | { type: 'harvest'; targetId: string }
    | { type: 'craft'; recipeId: string; tools?: Record<string, string> }
    | {
        type: 'learn-record';
        itemId: string;
        expectedRevision: number;
        placementRevision: number;
        recordPin: import('./world-modules.js').DefinitionPin;
      }
    | { type: 'feed'; targetId: string; itemId?: string }
    | { type: 'replenish'; targetId: string; attributeId: string }
    | { type: 'equip'; itemId: string }
    | ({ type: 'eat' } & (
        | {
            itemId: string;
            sourceId?: never;
            definitionId?: never;
            definitionVersion?: never;
            definitionDigest?: never;
            bodyPolicyId?: never;
            bodyPolicyVersion?: never;
            bodyPolicyDigest?: never;
          }
        | {
            itemId?: never;
            sourceId: string;
            definitionId: string;
            definitionVersion: number;
            definitionDigest: string;
            bodyPolicyId: string;
            bodyPolicyVersion: number;
            bodyPolicyDigest: string;
          }
      ))
    | { type: 'guard'; itemId: string; targetId?: string; facing?: number; autoEquip?: boolean }
    | {
        type: 'strike';
        manualExecution?: true;
        autoEquip?: boolean;
        definitionId: string;
        targetId: string;
        weaponItemId?: string;
        lethalPermission?: import('./combat-consent.js').LethalPermission;
      }
    | {
        type: 'hunt';
        autoEquip?: boolean;
        targetId: string;
        weaponItemId?: string;
        ammoItemId?: string;
        lethalPermission?: import('./combat-consent.js').LethalPermission;
      }
    | {
        type: 'shoot-once';
        autoEquip?: boolean;
        targetId?: string;
        aimPoint?: WorldPoint;
        aimPointSubject?: import('./combat-execution.js').AimPointSubject;
        weaponItemId?: string;
        ammoItemId?: string;
        lethalPermission?: import('./combat-consent.js').LethalPermission;
      }
    | {
        type: 'aim';
        autoEquip?: boolean;
        targetId?: string;
        aimPoint?: WorldPoint;
        aimPointSubject?: import('./combat-execution.js').AimPointSubject;
        manualExecution?: true;
        weaponItemId?: string;
        ammoItemId?: string;
        lethalPermission?: import('./combat-consent.js').LethalPermission;
      }
    | {
        type: 'release-strike';
        recoveredRelease?: true;
        expectedActionId: string;
        releaseInput?: import('./execution-input.js').TimedReleaseInput;
        lethalPermission?: import('./combat-consent.js').LethalPermission;
      }
    | {
        type: 'release-shot';
        recoveredRelease?: true;
        aimId: string;
        aimTarget?: import('./combat-execution.js').AimPointSubject;
        aimPoint?: WorldPoint;
        aimPointSubject?: import('./combat-execution.js').AimPointSubject;
        releaseInput?: import('./execution-input.js').TimedReleaseInput;
        lethalPermission?: import('./combat-consent.js').LethalPermission;
      }
    | { type: 'treat-scar'; scarId: string; targetId: string }
    | {
        type: 'cook';
        preparationId: string;
        preparationVersion: number;
        preparationDigest: string;
        inputs: Record<string, string>;
        heatId: string;
      }
    | { type: 'fish'; targetId: string; itemId: string }
    | {
        type: 'handover';
        operation: 'offer' | 'counter';
        targetId: string;
        /** Every offered and requested lot belongs to the same atomic proposal. */
        offered: import('./handover.js').RequestedLot[];
        requested: import('./handover.js').RequestedLot[];
        constructionUse?: import('./construction-contributions.js').ConstructionContributionTerms;
        offerId?: string;
        expectedOfferRevision?: number;
      }
    | {
        type: 'handover';
        operation: 'accept' | 'decline' | 'withdraw';
        targetId: string;
        offerId: string;
        expectedOfferRevision: number;
      }
    | {
        type: 'handover';
        operation: 'withdraw-use';
        targetId: string;
        permissionId: string;
        expectedRevision: number;
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
        facingHeading?: number;
        restingPlaceId?: string;
        restingBay?: number;
      }
    | {
        type: 'inspect-inventory';
        itemId?: string;
        containerId?: string;
        after?: string;
        expectedRevision?: number;
        expectedScope?: string;
      }
    | { type: 'inspect-activities'; after: number; methodAfter?: number }
    | { type: 'cancel'; expectedActionId?: string }
    | { type: 'resume-work'; planId: string; expectedRevision: number }
    | { type: 'recover' }
    | { type: 'respawn' }
    | {
        type: 'say';
        text: string;
        targetId?: string;
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
  /** Private candidate facts for same-transaction operational authority. These
   * propose no permission and never enter player/model projections. */
  materialAcquisitions?: MaterialAcquisitionFact[];
  constructionEffects?: import('./construction-permissions.js').ConstructionPermissionEffect[];
  constructionUpdates?: import('./construction-permissions.js').ConstructionPermissionUpdate[];
  constructionCreations?: import('./assembly-types.js').ConstructionPermission[];
}

export interface MaterialAcquisitionFact {
  actionId: string;
  actorId: string;
  physicalLife: number;
  at: number;
  operation: 'gather' | 'craft';
  sourceId?: string;
  outputs: Array<{
    port: string;
    itemId: string;
    definition: import('./world-modules.js').DefinitionPin;
    quantity: number;
    originIds: string[];
  }>;
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

export interface GodSpawnRequest extends GodSpawnDraft {
  id: string;
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
  gatheringPolicy: import('./gathering.js').GatheringPolicy | null;
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
