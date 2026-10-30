import type { CartographyView } from './cartography.js';
export type { CartographyView } from './cartography.js';
export { worldClockParts, worldDayText, worldClockText } from './calendar.js';
export type {
  RequestRecoveryResult,
  CheckpointRequest,
  CheckpointContext,
} from './request-recovery.js';
import type {
  ConstructionPlan,
  AssemblyView,
  HearthPlan,
  GateUsePlan,
  BoundaryImpactPlan,
} from './construction.js';
export * from './construction.js';
import type { WorkBatchRequest, WorkBatchSelection } from './work-batches.js';
export * from './work-batches.js';
import type {
  AttackExecutionControl,
  AttackExecutionView,
  AttackModeNotice,
  WorldInputScope,
  TimedReleaseProfile,
} from './execution-input.js';
export * from './execution-input.js';
import type { Named } from '@open-legend/language';
import type { AssetRevisionReference } from '@open-legend/assets';
/** Public wire contract. Never expose the authoritative world or another actor's memory. */
import type { WorldPoint, SurfacePoint, SpatialLayout } from '@open-legend/spatial';
import type { InventoryCharacteristic } from './inventory.js';
export type {
  InventoryAccessView,
  InventoryCharacteristic,
  InventoryTransferSource,
  InventoryDestinationRequest,
  InventoryDestination,
  InventoryDestinationPage,
} from './inventory.js';
export type Position = Readonly<WorldPoint>;
export type { SurfacePoint, SpatialLayout };
export interface PrimaryActionSelection {
  targetId: string;
  actionId: string;
  /** Opaque scope/body/preference/meaning binding, never permission by itself. */
  reference: string;
}

/** Current application admission; it does not promise a listener will respond. */
export interface PlayerInteractionAvailability {
  /** The observer's current chosen name; no hidden body description or position. */
  recipientName?: string;
  available: boolean;
  code: string;
  reason: string | null;
  /** Operational reply routing only; it grants no hearing or promised response. */
  reply: boolean;
}

/** Deliberately smaller than the domain command: the server supplies actor/authority. */
export interface CommandInput {
  execution?: AttackExecutionControl;
  aimPoint?: Position;
  aimBasis?: { bodyReference?: string; surfaceId?: string; shapeId?: string };
  bodyReference?: string;
  /** A contextual shortcut must still select this exact offer at command admission.
   * Omitted for an explicitly chosen menu action. Not native command authority. */
  primaryAction?: PrimaryActionSelection;
  encounterPreference?: { operation: 'speak' | 'stop'; reference: string };
  type:
    | 'encounter-preference'
    | 'construction'
    | 'operate-gate'
    | 'impact-boundary'
    | 'place-hearth'
    | 'repeat-work'
    | 'construction-rest'
    | 'activity'
    | 'activity-request'
    | 'say'
    | 'pickup'
    | 'drop'
    | 'transfer-item'
    | 'split-item'
    | 'merge-item'
    | 'unequip'
    | 'move'
    | 'evade'
    | 'follow'
    | 'confirm-attempt'
    | 'withdraw-attempt'
    | 'gather'
    | 'craft'
    | 'equip'
    | 'guard'
    | 'strike'
    | 'hunt'
    | 'aim'
    | 'shoot-once'
    | 'release-shot'
    | 'release-strike'
    | 'practice-shot'
    | 'coaching'
    | 'harvest'
    | 'cook'
    | 'fish'
    | 'tend-fire'
    | 'handover'
    | 'outing'
    | 'eat'
    | 'replenish'
    | 'status-effect'
    | 'inspect-inventory'
    | 'inspect-activities'
    | 'cancel'
    | 'resume-work'
    | 'recover'
    | 'respawn'
    | 'treat-scar'
    | 'learn-record'
    | 'teach';
  constructionPlan?: ConstructionPlan;
  gateUse?: GateUsePlan;
  boundaryImpact?: BoundaryImpactPlan;
  hearthPlan?: HearthPlan;
  workBatch?: WorkBatchRequest;
  workBatchDigest?: string;
  bay?: number;
  purpose?: string;
  activityFamilyId?: string;
  activityArguments?: Record<string, string | number | boolean>;
  methodId?: string;
  bindings?: Record<string, string | SurfacePoint>;
  resume?: boolean;
  historyAfter?: number;
  methodAfter?: number;
  after?: string;
  containerId?: string;
  expectedScope?: string;
  text?: string;
  volume?: SpeechVolume;
  facing?: number;
  aimId?: string;
  autoEquip?: boolean;
  effectOperation?: 'activate' | 'deactivate';
  fireOperation?: 'light' | 'fuel' | 'extinguish';
  coachingOperation?: 'request' | 'accept' | 'decline' | 'withdraw' | 'feedback';
  episodeId?: string;
  handoverOperation?: 'offer' | 'counter' | 'accept' | 'decline' | 'withdraw' | 'withdraw-use';
  contributionPermissionId?: string;
  constructionUse?: {
    site: { surfaceId: string; minX: number; maxX: number; minZ: number; maxZ: number };
    operation: string;
    expiresAt: number;
  };
  outingOperation?:
    | 'compact-propose'
    | 'compact-revise'
    | 'compact-accept'
    | 'compact-decline'
    | 'compact-withdraw'
    | 'compact-leave'
    | 'help'
    | 'invite'
    | 'propose'
    | 'work'
    | 'revise'
    | 'withdraw'
    | 'conclude'
    | 'accept'
    | 'decline'
    | 'leave';
  cooperationKind?: 'guide' | 'help' | 'hunt';
  compactKind?: 'alliance' | 'ceasefire';
  compactId?: string;
  quarryId?: string;
  cooperationTask?:
    | { kind: 'prepare'; recipeId: string; outputPort: string; quantity: number }
    | { kind: 'carry'; offerId: string; offerRevision: number; destinationId: string }
    | { kind: 'construction'; plan: ConstructionPlan };
  cooperation?: { id: string; revision: number };
  amendmentRevision?: number;
  opponentId?: string;
  /** Offered server-derived purpose; public dispatch rebinds current consent. */
  combatHelpId?: string;
  outingId?: string;
  outingMode?: 'enqueue' | 'replace' | 'interrupt';
  destinationId?: string;
  offerId?: string;
  expectedOfferRevision?: number;
  offeredItems?: {
    itemId: string;
    quantity: number;
    expectedRevision?: number;
    placementRevision?: number;
    expectedContentsRevision?: number;
  }[];
  requestedItems?: {
    itemId: string;
    quantity: number;
    expectedRevision?: number;
    placementRevision?: number;
    expectedContentsRevision?: number;
  }[];
  targetId?: string;
  definitionId?: string;
  itemId?: string;
  recipeId?: string;
  tools?: Record<string, string>;
  recordPin?: { id: string; version: number; digest: string };
  attributeId?: string;
  ammunitionId?: string;
  position?: SurfacePoint;
  /** Resolve the retained observer evidence on the server; the client supplies no location. */
  knownPlace?: { id: string; sourceId: string; revision: string };
  distance?: number;
  completeFollow?: true;
  followUntil?: number;
  attemptId?: string;
  scarId?: string;
  lethalReviewId?: string;
  quantity?: number;
  /** Exact currently displayed inventory group; resolved to native sources before admission. */
  inventoryGroup?: string;
  expectedRevision?: number;
  /** A scoped Stop must not cancel work that replaced the selected action. */
  expectedActionId?: string;
  /** Exact paused frontier selected for return; grants no replacement work. */
  planId?: string;
  placementRevision?: number;
  /** The reviewed contents of a container item, independent of its placement. */
  expectedContentsRevision?: number;
  targetRevision?: number;
  preparationId?: string;
  preparationVersion?: number;
  preparationDigest?: string;
  inputs?: Record<string, string>;
}

/** Transport mirror of the installed world's trusted semantic presentation. */
export type ActivityRequestPresentation = {
  target: string;
  workMode: string;
} & (
  | { kind: 'replenish-session' }
  | { kind: 'outing-invitation'; destination: string }
  | {
      kind: 'resource-care';
      supply: string;
      stop: string;
      budget: string;
      material: string;
      reserve: string;
    }
  | {
      kind: 'gather-store-use';
      source: string;
      destination: string;
      quantity: string;
      material: string;
      reserve: string;
    }
);
export interface ActivityEntry {
  familyId: string;
  targetId: string;
  label: string;
  description: string;
}
export interface OutingView {
  id: string;
  revision: number;
  destination: string;
  companion: string;
  distance: number | null;
  kind: 'travel' | 'combat-help' | 'cooperate' | 'alliance' | 'ceasefire' | 'item-offer';
  purpose?: string;
  status: 'pending' | 'traveling' | 'arrived' | 'helping' | 'accepted' | 'ended';
  deadline?: number;
  company: string;
  description: string;
  choices: Array<{ id: string; label: string; description: string; command: CommandInput }>;
}

export type ActivityRequestField = {
  modeLabels?: Record<'enqueue' | 'replace' | 'interrupt', string>;
  label: string;
  minimum?: number;
  maximum?: number;
  minimumDuration?: number;
  maximumDuration?: number;
  required: true;
  discovery?: { source: 'spatial' | 'storage' | 'materials'; sourceField?: string };
} & (
  | { type: 'definition'; definitionKind: 'item' | 'recipe' }
  | { type: 'entity' | 'integer' | 'time' | 'mode'; definitionKind?: never }
);
export interface ActivityRequestsView {
  ok: boolean;
  scope: string;
  simTime: number;
  /** Applicable tasks for the exact permitted target supplied to this read. */
  entries: ActivityEntry[];
  requests: {
    purposeLabel?: string;
    submitLabel?: string;
    id: string;
    label: string;
    description: string;
    presentation?: ActivityRequestPresentation;
    fields: Record<string, ActivityRequestField>;
  }[];
  timeOptions?: {
    minimumDuration: number;
    maximumDuration: number;
    namedDeadlines: { name: string; at: number }[];
  };
  status?: {
    name: string;
    status: string;
    reason?: string;
    spent?: number;
    quantity?: { requested: number; completed: number; unitLabel: string };
    maximumSpent?: number;
    spendingUnit?: string;
    attempts?: number;
    interrupted?: boolean;
    deadline?: number;
  };
}

/** Bounded role discovery and exact refresh; no entry grants execution permission. */
export interface ActivityChoice {
  id: string;
  label: string;
  kind: 'entity' | 'definition';
  roles: string[];
  requestIds?: string[];
  distance?: number;
  accessible: boolean;
  reason?: string;
  witnessId?: string;
  location?: string;
  needsInspection?: boolean;
  canInspect?: boolean;
  needsApproach?: boolean;
}
export interface ActivityChoicePage {
  ok: boolean;
  message?: string;
  scope: string;
  status: 'complete' | 'partial' | 'unavailable' | 'stale';
  choices: ActivityChoice[];
  selected?: ActivityChoice;
  next?: string;
  stance?: SurfacePoint;
  evidence: string;
  inspection?: {
    containerId: string;
    revision: number;
    scope: string;
    after: string;
    more: boolean;
    items: { id: string; name: string; quantity: number }[];
  };
}

export interface ActionOption {
  id: string;
  label: string;
  icon?: string;
  command: CommandInput;
  enabled: boolean;
  reason?: string;
  /** Essential permitted facts beside the choice; optional statistics stay in detail. */
  facts?: Array<[string, string]>;
  detail?: string;
}

/** A discoverable option is either a native intention, a composer, or a missing prerequisite. */
export interface CatalogueAction {
  id: string;
  /** Selected-world presentation order; larger values come first. Never admission. */
  priority?: number;
  label: string;
  icon?: string;
  category: string;
  /** Situation-aware plain text, projected by the server from permitted facts. */
  description: string;
  facts?: Array<[string, string]>;
  keywords: string[];
  targetId?: string;
  enabled: boolean;
  reason?: string;
  intent:
    | { kind: 'command'; command: CommandInput }
    | { kind: 'work-batch'; selection: WorkBatchSelection }
    | { kind: 'activity'; family: string; arguments: Record<string, string> }
    | { kind: 'compose'; mode: 'chat' | 'invention'; npcId?: string; preference?: CommandInput }
    | { kind: 'unavailable' };
}

export interface ActionContext {
  /** Explicit complete permitted discovery, separate from empty-ground context. */
  catalogue?: boolean;
  targetId?: string;
  itemId?: string;
  inventoryGroup?: string;
  destinationId?: string;
  quantity?: number;
  position?: SurfacePoint;
  /** Check this known recipe, rather than expanding every personal choice. */
  recipeId?: string;
  /** Exact held-item gesture; only itemId and targetId accompany this flag. */
  equipped?: true;
}

export interface ActionCatalogue {
  revision: number;
  actions: CatalogueAction[];
  /** Exact preferred offer, including its refusal when temporarily unavailable. */
  defaultActionId?: string;
  primaryAction?: PrimaryActionSelection;
  /** Permitted category labels, including categories with no concrete choices. */
  categories: string[];
}

export interface PlayerProfile {
  id: string;
  revision: number;
  preferences: {
    showUnavailableActions: boolean;
    pauseWhenHidden: boolean;
    narratorVoice?: 'restrained' | 'lyrical' | 'wry';
    revealMode?: 'off' | 'player' | 'nearby';
    revealRadius?: number;
    revealStrength?: number;
  };
}
/** A control changes only its own preference, preserving concurrent UI choices. */
export type PlayerPreferencePatch = Partial<PlayerProfile['preferences']>;

export interface ActionAnimation {
  id: string;
  kind: 'punch' | 'melee';
  phase?: 'windup' | 'recovery';
  tool?: string;
  progress: number;
  direction: { x: number; z: number };
}

export interface StatusEffectView {
  id: string;
  label: string;
  explanation?: string;
  icon?: string;
  tone?: 'good' | 'bad' | 'neutral' | 'special';
  /** Exact native deadline, absent for qualitative, sustained or untimed statuses. */
  timing?: { expiresAt: number; durationSeconds: number; clock: 'simulation-seconds' };
  pose?: 'horizontal';
  particle?: { text: string; anchor: 'head'; motion: 'floatAway' };
}
/** A permitted subject's authored illustration; no global identity/artwork catalogue. */
export interface PortraitArt {
  path: string;
  headPath?: string;
  figurePath?: string;
}
/** One already-permitted item's artwork; never the installed world's lookup table. */
export interface ItemArt {
  path: string;
  detailPath?: string;
}
export interface EntityView extends Named {
  /** Explicit preference; presence offers prospective attention to this received subject. */
  attentionPreference?: boolean;
  observation:
    | { kind: 'self' }
    | {
        kind: 'current';
        modality: 'sight';
        /** An omitted time equals this view's sightConfirmedThrough, never its clock. */
        measurementAt?: number;
        acquiredAt?: number;
        confirmedThrough?: number;
        sourceReference: string;
      };
  /** Recent movement between compatible received positions; no route or prediction. */
  observedMoving?: boolean;
  observedCarried?: {
    items: Array<{ itemKindAsObserved: string }>;
    /** An omitted time equals this view's sightConfirmedThrough. */
    measurementAt?: number;
    confirmedThrough?: number;
  };
  /** Remembered communication is distinct from the current physical contact. */
  communicationReference?: string;
  /** Only this observer's recognized name and private nickname. */
  identity?: { knownName?: string; nickname?: string; revision: number };
  icon?: string;
  art?: ItemArt;
  /** Native root placement is public; contents revision requires current contents access. */
  storage?: { containerId: string; placementRevision: number; revision?: number };
  trade?: ItemTradeSummary;
  bodySize?: { width: number; height: number };
  assembly?: AssemblyView;
  /** Opaque scoped refresh signal, never permission or an operational grant. */
  actionRevision?: string;
  /** Current consent replies/endings, separate from requested action discovery. */
  controls?: ActionOption[];
  contents?: Array<{
    id: string;
    definitionId: string;
    name: string;
    quantity: number;
    portable: boolean;
    materialCondition?: { label: string; process: 'wetting' | 'drying'; coveredFraction: number };
  }>;
  actionAnimation?: ActionAnimation | null;
  statusEffects?: StatusEffectView[];
  attributes?: AttributeView[];
  id: string;
  kind: 'actor' | 'animal' | 'resource' | 'remains' | 'station' | 'item-pile' | 'practice-target';
  subtype: string;
  position: Position;
  supportSurfaceId: string | null;
  heading: number;
  /** Presentation key resolved by trusted client artwork; it grants no physical capability. */
  appearance: string;
  portrait?: PortraitArt;
  radius: number;
  status: string;
  /** Observed heat state. Renderers must not infer it from status wording. */
  heat?: { lit: boolean };
  description?: string;
  traits?: Array<{ id: string; name: string; description: string }>;
  canTalk?: boolean;
  talkRequiresAi?: boolean;
  talkUnavailableReason?: string;
  speechCapable?: boolean;
  health?: number;
  bodyRevision?: number;
  /** Opaque current-body identity for delayed presentation choices; not action authority. */
  bodyReference?: string;
  /** Cheap opaque contextual-preference freshness, never a complete action list. */
  contextActionRevision?: string;
  bodyState?: 'dead' | 'rotting';
  bodyPlan?: 'biped' | 'quadruped' | 'avian';
  /** Observed fraction of the installed simulated departure exposure. */
  departureProgress?: number;
  species?: string;
  quantity?: number;
}

/** Compact current possession facts for the HUD and exact shortcut bindings. */
export interface InventoryItemBinding extends Named {
  id: string;
  definitionId: string;
  icon?: string;
  art?: ItemArt;
  revision: number;
  placementRevision: number;
  quantity: number;
  availableQuantity?: number;
  equipped: boolean;
  container?: { capacity: number };
  /** Present only for a deliberately selected presentation group. */
  group?: {
    token: string;
    members: number;
    representativeQuantity: number;
    representativeAvailableQuantity: number;
  };
}
/** Deliberately requested item detail; native operations are read explicitly. */
export interface InventoryItemSummary extends InventoryItemBinding {
  materialCondition?: { label: string; process: 'wetting' | 'drying'; coveredFraction: number };
  individual?: boolean;
  container?: { load?: number; capacity: number; revision?: number };
  declaredOwner?: { name: string; revision: number };
  /** The admitted requirement for one unit, including contents for an indivisible bag. */
  packingLoad?: number;
  recipeRecord?: { method?: RecipeDetailsView; message: string };
  characteristics?: InventoryCharacteristic[];
  /** Every currently equipped item this candidate would put away. */
  equipmentConflicts?: Array<Named & { id: string; characteristics: InventoryCharacteristic[] }>;
  category: 'material' | 'food' | 'equipment' | 'ammunition';
  description: string;
  tags: string[];
}
export interface InventoryItemView extends InventoryItemSummary {
  workBatch?: { label: string; selection: WorkBatchSelection };
  actions: ActionOption[];
}

/** Current owned-lot facts for the ten displayed shortcuts; no prepared actions. */
export interface InventoryBindingsView {
  ok: boolean;
  message?: string;
  items: InventoryItemBinding[];
}

export interface TradeLotView {
  icon?: string;
  art?: ItemArt;
  capacity?: number;
  id: string;
  name: string;
  label: string;
  description: string;
  quantity: number;
  revision: number;
  placementRevision: number;
  contentsRevision?: number;
  whole: boolean;
}

/** Paged personally remembered disclosures, with no lookup of another person's stock. */
export interface TradeDisclosuresPage {
  ok: boolean;
  message?: string;
  items: TradeLotView[];
  next?: string;
  scanLimited: boolean;
}
/** Participant-only pending terms and remembered disclosures, never other live stock. */
export interface ItemTradeSummary {
  scope: string;
  personId: string;
  personName: string;
  labels: Pick<ItemTradeView['labels'], 'title'>;
  offers: Array<Pick<ItemTradeView['offers'][number], 'id' | 'revision'>>;
  /** Viewer-scoped changes affecting the deliberately opened trade reader. */
  revision: string;
}
export interface ItemTradeView {
  maximumLots: number;
  scope: string;
  personId: string;
  personName: string;
  labels: {
    title: string;
    newOffer: string;
    review: string;
    refresh: string;
    choose: string;
    whole: string;
    giveQuantity: string;
    receiveQuantity: string;
    selectionHint: string;
    into: string;
    to: string;
    remembered: string;
    noTransfer: string;
    draftChanged: string;
    give: string;
    receive: string;
    offer: string;
    accept: string;
    decline: string;
    withdraw: string;
    counter: string;
    gift: string;
    waiting: string;
    incoming: string;
    changed: string;
    unknown: string;
  };
  contributionChoices?: {
    id: string;
    label: string;
    terms: NonNullable<CommandInput['constructionUse']>;
    durationSeconds: number;
    detail: string;
  }[];
  ownLots: TradeLotView[];
  knownLots: TradeLotView[];
  offers: {
    id: string;
    revision: number;
    incoming: boolean;
    constructionUse?: { terms: NonNullable<CommandInput['constructionUse']>; detail: string };
    give: TradeLotView[];
    receive: TradeLotView[];
    expiresAt: number;
    actions: ActionOption[];
  }[];
}

export interface RecipeDetailsView {
  category?: { id: string; label: string };
  name: string;
  description: string;
  family: string;
  outputs: Array<{
    port: string;
    name: string;
    description: string;
    quantity: number;
    icon?: string;
    equipmentPorts?: string[];
    art?: ItemArt;
  }>;
  facts: Array<{ id: string; label: string; value: number | string; unit?: string }>;
  limitations: string[];
  ingredients: Array<{
    name: string;
    quantity: number;
    available: number;
    icon?: string;
    art?: ItemArt;
  }>;
  retainedTools: Array<{
    role: string;
    quantity: number;
    choices: Array<{ name: string; available: number }>;
  }>;
  workSeconds: number;
}
export interface RecipeView extends RecipeDetailsView {
  id: string;
  origin: 'authored' | 'player' | 'npc';
  provenance: string;
}

export type SpeechVolume = 'whisper' | 'normal' | 'shout';
export type SpeechParticipant = Omit<Named, 'name'> & { nameAtTime: string };
interface SpeechAcquisition {
  speaker: SpeechParticipant | null;
  /** Actually understood introduction claim, not canonical identity proof. */
  nameClaim?: string;
  /** Acquired participant continuity, never a physical or communication grant. */
  speakerReference?: string;
  /** Independently admitted live body contact. */
  speakerContact?: string;
  delivery: SpeechVolume | null;
  direction: { sector: number; elevation: 'above' | 'level' | 'below' } | null;
  listenerPosition: Position;
}
export type PerceivedSpeech = SpeechAcquisition &
  (
    | {
        perception: 'seen';
        addressing: null;
        intelligibility: 'none';
        segments: [];
        addressee: null;
      }
    | {
        perception: 'heard' | 'self';
        addressing: 'ambient' | 'directed';
        intelligibility: 'none' | 'partial' | 'clear';
        segments: Array<{ kind: 'heard'; text: string } | { kind: 'unintelligible' }>;
        addressee: SpeechParticipant | null;
      }
  );
export type SpeechDisplayPart =
  | { kind: 'literal'; text: string }
  | {
      kind: 'participant';
      id: string;
      role: 'speaker' | 'addressee';
      text: string;
      contactReference?: string;
    }
  | {
      kind: 'quotation';
      segments: readonly ({ kind: 'heard'; text: string } | { kind: 'unintelligible' })[];
      text: string;
    };
export interface SpeechPresentation {
  acquisition: PerceivedSpeech['perception'];
  speakerLabel: string;
  directionLabel: string | null;
  segments: readonly ({ kind: 'heard'; text: string } | { kind: 'unintelligible' })[];
  personalText: string;
  accessibilityText: string;
  parts: readonly SpeechDisplayPart[];
}
export interface PerceivedEventsPage {
  events: PublicEvent[];
  nextCursor?: string;
  /** Continues toward the present after a historical time jump. */
  newerCursor?: string;
  /** A text search examined its per-request window without filling the page; the cursor
   * continues into older history. */
  scanLimited?: boolean;
}
/** One of the viewer's own spoken promises. Terms and evidence are server-written; raw
 * completion rules and event IDs never reach the client. */
export interface OwnPromise {
  /** The owner's own record identity and revision, for a later amendment slice. */
  id: string;
  revision: number;
  words: string;
  /** The addressed person as the viewer's character knows them, if any. */
  recipient: string | null;
  /** Exact counterpart for scoped person-window filtering; never resolved from a name. */
  recipientId: string | null;
  madeAt: number;
  status: 'open' | 'overdue' | 'kept' | 'cancelled';
  terms: string;
  dueAt: number | null;
  keptAt: number | null;
  evidence: string | null;
}
/** The viewer's promises (`/api/commitments`): open ones first, then paged past ones. */
export interface OwnPromisePage {
  ok: true;
  worldId: string;
  generation: string;
  /** First page only; at most `openLimit`. */
  open: OwnPromise[];
  openLimit: number;
  /** Unresolved commitments counted against `openLimit`; can exceed `open.length` when some
   * are forgotten or were never spoken promises. */
  counted: number;
  past: OwnPromise[];
  next: string | null;
  /** Past promises could only be read from the live world, not history storage. */
  partial: boolean;
}
/** One remembered experience as its owner is shown it. */
export interface MemoryEntryView {
  fidelity: 'exact' | 'impression';
  id: string;
  sourceKind: 'awareness' | 'memory' | 'summary' | 'observation';
  /** Opaque reader-issued address; creator edits still require current authority. */
  editReference?: string;
  text: string;
  time: number;
}
/** Paged, optionally searched memory history (`/api/memories`, god NPC variant). */
export interface MemoryHistoryPage {
  ok: true;
  worldId: string;
  generation: string;
  /** Oldest first within the page. */
  entries: MemoryEntryView[];
  next: string | null;
  /** A search examined its per-request window without filling the page. */
  scanLimited: boolean;
}

export interface KnownPlaceView {
  note?: { text: string; revision: number };
  id: string;
  sourceId: string;
  revision: string;
  label: string;
  description: string;
  locationLabel: string;
  position: SurfacePoint;
  time: number;
  corrected: boolean;
}
export interface KnownPlacesPage {
  ok: true;
  worldId: string;
  generation: string;
  entries: KnownPlaceView[];
  next: string | null;
  scanLimited: boolean;
}
export interface KnownPlaceInspection {
  ok: true;
  place: KnownPlaceView;
  move: ActionOption;
  moveDescription: string;
}

export interface WorldEventSourceReference {
  /** Opaque application-issued token binding world/timeline, actor, record family and sourceId. */
  token: string;
  sourceId: string;
  revision: string;
  family: 'speech' | 'encounter';
}
export type WorldEventSourceAcquisition =
  | 'heard-speech'
  | 'spoken-by-self'
  | 'inspected-document'
  | 'inspected-item'
  | 'observed-place'
  | 'observed-encounter';
export interface WorldEventSourceObservedLocation {
  kind: 'world' | 'possession';
  label: string;
  point?: SurfacePoint;
}
export type WorldEventSourceDetail =
  | {
      status: 'available';
      reference: WorldEventSourceReference;
      time: number;
      order: number;
      acquisition: WorldEventSourceAcquisition;
      acquisitionLabel: string;
      sourceLabel: string;
      text: string;
      inscription?: string;
      speech?: PerceivedSpeech;
      observedLocation?: WorldEventSourceObservedLocation;
      corrected: boolean;
      correctionNote?: string;
    }
  | {
      status: 'unavailable';
      sourceId: string;
      reason: string;
    };
export interface WorldEventSourcesRequest {
  references: WorldEventSourceReference[];
}
export interface WorldEventSourcesView {
  ok: true;
  worldId: string;
  generation: string;
  /** One result for each requested reference, in the same order, including unavailable records. */
  sources: WorldEventSourceDetail[];
}

export interface PublicEvent {
  sound?: {
    kind?: 'voice-like';
    acquisition: 'self' | 'external';
    acquiredAt: number;
    listenerPosition: { x: number; y: number; z: number };
    receivedLevelDbSpl: number;
    clarityMarginDb: number;
    detectThresholdDb: number;
    direction: { sector: number; elevation: 'above' | 'level' | 'below' } | null;
    visibleSource: {
      /** Dated acquired role, never a current physical target. */
      reference: string;
      description: Named;
    } | null;
  };
  presentation?: {
    category: 'speech' | 'actions' | 'conflict' | 'body' | 'observations';
    icon: string;
    displayToPlayer?: boolean;
  };
  /** Only identities and names admitted when this character perceived the occurrence. */
  references?: Array<{
    id: string;
    label: string;
    role: 'actor' | 'target' | 'participant';
    kind: 'historical';
    /** Independent current permission, never inferred from historical identity. */
    contactReference?: string;
    communicationReference?: string;
  }>;
  /** Perceived descriptive expression, with no mechanical effects. */
  descriptive?: true;
  /** Actual committed change, taken only from this observer's permitted evidence. */
  attributeChange?: {
    attributeId: string;
    definitionVersion: number;
    before: number;
    after: number;
    unit: string;
    name?: string;
    meaning?: string;
    cause?: string;
    causeMeaning?: string;
    kind?: 'health';
  };
  speech?: PerceivedSpeech;
  speechPresentation?: SpeechPresentation;
  modality?: 'heard' | 'observed' | 'felt' | 'internal';
  source?: WorldEventSourceReference;
  id: string;
  time: number;
  type: string;
  text: string;
  actorId?: string;
  targetId?: string;
}

export interface ChatMessage {
  replyRequestId?: string;
  retryable?: boolean;
  kind?: 'speech' | 'action';
  mechanical?: boolean;
  replyStatus?: AiJobView['status'];
  /** Permitted explanation of a failed, cancelled or stale reply. */
  replyReason?: string;
  id: string;
  speakerId?: string;
  speech?: PerceivedSpeech;
  speaker: string;
  text: string;
  time: number;
}

/** Volatile, authenticated source-bound reply presentation; never heard history. */
export interface NpcReplyPreview {
  requestId: string;
  attempt: number;
  generation: string;
  worldId: string;
  timelineId: string;
  playerSpeechEventId: string;
  npcId: string;
  providerRequestId?: string;
  sequence: number;
  state: 'forming' | 'withdrawn' | 'settled';
  speaker: string;
  volume?: SpeechVolume;
  text: string;
  historyIds: string[];
}

export interface AiJobView {
  queueLatencyMs?: number;
  totalLatencyMs?: number;
  id: string;
  kind: 'chat' | 'invention' | 'thought' | 'action';
  status: 'queued' | 'judging' | 'generating' | 'completed' | 'failed' | 'cancelled' | 'stale';
  message: string;
}

export interface GameView {
  /** Native simulation time through which this acquired projection is complete. */
  evaluationCut: number;
  /** Last completed sight phase for the controlled person's current life; null if absent.
   * Only exactly equal per-detail times may be omitted in favor of this value. */
  sightConfirmedThrough: number | null;
  /** Remembered communication roles; no current body, location or state is implied. */
  communicationReferences: Array<{ id: string; label: string }>;
  cartography?: CartographyView;
  /** Exact installed asset release; absent authorizes only bootstrap depiction. */
  presentationRelease?: AssetRevisionReference;
  presentationReleaseRevision?: number;
  checkpoint?: import('./request-recovery.js').CheckpointContext;
  access?: {
    scope: string;
    /** Native private-draft namespace; not a request token or permission. */
    privateDraftScope: string;
    /** Retained command identity across reconnect/control changes; never request authority. */
    commandRecoveryScope: string;
    accountId: string;
    actorId: string;
    controlGeneration: number;
    controlling: boolean;
    /** Another page holds current control, including while its stream is starting. */
    controlledElsewhere: boolean;
    canManageSaves: boolean;
    /** Creator or access manager: may open the separate World operations console. */
    canOperate?: boolean;
    mode: 'local' | 'oidc';
  };
  /** Latest operational maintenance window for this world, if any. */
  maintenance?: MaintenanceWindowView | null;
  inventionPolicy: { revision: number; playerLocked: boolean; agentLocked: boolean };
  saveTimeline?: string;
  commandEpoch?: string;
  worldEventsRevision?: string;
  historyRevision?: string;
  historyEpoch?: string;
  narrator?: TranscriptItem | null;
  godMode?: boolean;
  godTools?: {
    familyLabel: string;
    traits: Array<{ id: string; name: string; description: string }>;
    spawnOptions: Array<{
      id: string;
      label: string;
      category: 'Actors' | 'Environment';
      icon?: string;
    }>;
    itemOptions: Array<{ id: string; label: string; icon?: string; description: string }>;
  };
  schemaVersion: 3;
  revision: number;
  worldId: string;
  profile: PlayerProfile;
  /** Public authored location/clock wording; application control names stay in the client. */
  presentation: {
    worldName: string;
    locationName: string;
    timeLabel: string;
    introduction?: string;
    crafting?: {
      categoryLabel: string;
      allLabel: string;
      categories: Array<{ id: string; label: string; icon?: string }>;
    };
  };
  /** Native sight range/body anchors; presentation bands add no gameplay tier or range. */
  vision: {
    radius: number;
    enabled: boolean;
    eyeHeight: number;
    targetHeights: number[];
    fieldOfViewRadians?: number;
    heading?: number;
  };
  hearing: {
    referenceRadius: number;
    partialRadius: number;
    detectionRadius: number;
    enabled: boolean;
    earHeight: number;
  };
  map: {
    width: number;
    height: number;
    seed: number;
    spatial: SpatialLayout;
    tiles: string[][];
    terrain: import('@open-legend/spatial').SpatialMap['terrain'];
  };
  clock: {
    weather?: { label: string; intensity: number };
    daylight?: { startHour: number; endHour: number; noonElevationDegrees: number };
    seconds: number;
    day: number;
    /** Optional authored name; absence displays the calendar counter numerically. */
    dayLabel?: string;
    hour: number;
    speed: number;
    baseRatio: number;
    paused: boolean;
    pauseReason: 'manual' | 'away' | 'storage' | 'maintenance' | null;
    /** Technical preparation only; this exposes no other actor's route or intent. */
    preparingNavigation?: boolean;
    /** Stopping-time names this world defines ("dawn"); empty when it names none. */
    namedTimes: string[];
    /** Local-clock offset in hours; calendar labels advance at local midnight. */
    offsetHours: number;
  };
  player: Named & {
    inputScope?: WorldInputScope;
    attackModeNotice?: AttackModeNotice;
    attackSource?: {
      label: string;
      enabled: boolean;
      reason?: string;
      command: CommandInput;
      profile?: TimedReleaseProfile;
    } & (
      | { kind: 'ranged'; pointFire: boolean; targetRule?: 'living-actor' | 'living-animal' }
      | { kind: 'melee' }
    );
    knowledgeRevision: number;
    evasion?: { label: string; readyIn: number };
    life?: number;
    death?: {
      message: string;
      freshWorldReview: boolean;
      at: number;
      corpseId: string;
      retainedLabel: string;
      lostLabel: string;
      retained: Array<{ name: string; quantity: number }>;
      left: Array<{ name: string; quantity: number }>;
    } | null;
    departureNotice?: string;
    scars?: Array<{ id: string; name: string; description: string; treatmentsRemaining: number }>;
    bodyState?: 'dead' | 'rotting' | 'removed';
    appearance?: EntityView['appearance'];
    portrait?: PortraitArt;
    participation?: 'active' | 'exiting' | 'inactive';
    statusEffects?: StatusEffectView[];
    id: string;
    position: Position;
    supportSurfaceId: string | null;
    heading: number;
    /** Current visible body extent, without private pose state or definition pins. */
    bodySize: { width: number; height: number };
    /** Permitted applicable values, never a raw module state dump. */
    attributes: AttributeView[];
    practice: PracticeProgressView[];
    actionAnimation?: ActionAnimation | null;
    /** World-selected held item for the explicit targeting gesture, without admission work. */
    equippedTargetItem?: { id: string; name: string };
    alive: boolean;
    /** Public work presence, including queued or paused work, independent of action availability. */
    hasWork: boolean;
    action: {
      id: string;
      showStatus: boolean;
      label: string;
      progress: number;
      durationSeconds: number;
      elapsedSeconds: number;
      advancing: boolean;
      execution?: AttackExecutionView;
      controls?: ActionOption[];
      detail?: string;
    } | null;
    traits?: Array<{ id: string; name: string; description: string }>;
    /** Personal history is fetched only by its visible reader; this marks committed changes. */
    memoryRevision: string;
    history?: string;
    inventory: InventoryItemBinding[];
    /** Scoped refresh hints, never custody, disclosure or action authority. */
    inventoryReadRevision: { bindings: number; details: number; disclosure: string };
    /** The current body's installed places and actual attachments, including empty places. */
    equipmentPorts: Array<{
      id: string;
      label: string;
      icon?: string;
      item?: { id: string; name: string; icon?: string; art?: ItemArt };
    }>;
    inventoryRevision: number;
    /** Opaque own construction-choice invalidation; contains no material/grant identity. */
    constructionRevision?: string;
    workBatchRevision?: string;
    canUseInventory: boolean;
    actionAttempts: PlayerActionAttempt[];
    /** The controlled actor's plain activity result; detailed steps remain God-only. */
    activity?: ActivityRequestsView['status'];
    outings: OutingView[];
    /** The controlled character's plan steps and states; projected only in God mode. */
    work?: WorkView | null;
    /** Example typed requests in this world's own words, for the action form. */
    actionWording?: { examples: string[]; placeholder: string };
    /** Cheap current-work, recovery and death controls; discovery uses /api/actions. */
    controls: ActionOption[];
  };
  entities: EntityView[];
  recipes: RecipeView[];
  events: PublicEvent[];
  conversation: ChatMessage[];
  ai: {
    mode: 'live' | 'unconfigured' | 'degraded' | 'fixture';
    jevConfigured: boolean;
    llmConfigured: boolean;
    message: string;
    jobs: AiJobView[];
    budget: {
      limitUsd: number;
      spentUsd: number;
      reservedUsd: number;
      estimated: boolean;
      perAgent?: boolean;
      period?: string;
      accounts?: Record<string, { spentUsd: number; reservedUsd: number }>;
    };
    usage: {
      jevCalls: number;
      llmCalls: number;
      inputTokens: number;
      outputTokens: number;
      lastLatencyMs: number;
    };
  };
  milestones: Array<{ id: string; label: string; done: boolean }>;
  persistence: { status: 'saved' | 'error'; message: string };
}

/** One public entity's top-level change. Nested values replace their complete field. */
export interface EntityFieldPatch {
  id: string;
  set?: Partial<Omit<EntityView, 'id'>>;
  remove?: Array<keyof Omit<EntityView, 'id'>>;
}
export interface GamePatch {
  evaluationCut: number;
  sightConfirmedThrough?: GameView['sightConfirmedThrough'];
  communicationReferences?: GameView['communicationReferences'];
  /** JSON omits undefined. Removed fields are explicit; null remains a meaningful value. */
  remove?: {
    view?: Array<
      | 'commandEpoch'
      | 'worldEventsRevision'
      | 'historyRevision'
      | 'historyEpoch'
      | 'narrator'
      | 'cartography'
    >;
    clock?: Array<keyof GameView['clock']>;
    player?: Array<keyof GameView['player']>;
    ai?: Array<keyof GameView['ai']>;
  };
  scope?: string;
  commandEpoch?: string;
  worldEventsRevision?: string;
  historyRevision?: string;
  historyEpoch?: string;
  schemaVersion: 3;
  baseRevision: number;
  revision: number;
  narrator?: GameView['narrator'];
  cartography?: GameView['cartography'];
  profile?: GameView['profile'];
  clock?: Partial<GameView['clock']>;
  player?: Partial<GameView['player']>;
  entities?: {
    add: EntityView[];
    update: EntityFieldPatch[];
    remove: string[];
    order?: string[];
  };
  recipes?: GameView['recipes'];
  events?: {
    upsert: PublicEvent[];
    remove: string[];
    order?: string[];
  };
  conversation?: GameView['conversation'];
  ai?: Partial<GameView['ai']>;
  milestones?: GameView['milestones'];
  persistence?: GameView['persistence'];
}

/** Use the detail's own captured view: a newer header cannot refresh a retained old detail. */
export function sightDetailTime(
  view: Pick<GameView, 'sightConfirmedThrough'>,
  time: number | undefined,
): number | null {
  return time ?? view.sightConfirmedThrough;
}

export interface ApiResult {
  inputScope?: WorldInputScope;
  execution?: AttackExecutionView;
  ok: boolean;
  code: string;
  message: string;
  jobId?: string;
  /** Exact retained workflow status on a duplicate-request receipt. */
  jobStatus?: AiJobView['status'];
  itemId?: string;
  /** The exact entity created by this result, even if it has since moved. */
  entityId?: string;
  recipeId?: string;
  goalId?: string;
  planId?: string;
  /** The exact native action admitted by this command, independently of request identity. */
  actionId?: string;
  lethalReview?: {
    id: string;
    title: string;
    description: string;
    targetLabel: string;
    attack: {
      name: string;
      tool?: string;
      facts: Array<{ name: string; value: string; critical: boolean }>;
    };
    confirmLabel: string;
    cancelLabel: string;
  };
}

/** Looking up a command never repeats it. An absent or expired receipt proves no outcome. */
export type CommandReceiptResult =
  | { ok: true; scope: string; status: 'resolved'; result: ApiResult }
  | {
      ok: false;
      scope: string;
      status: 'unknown' | 'expired' | 'unavailable';
      message: string;
    };

export interface GodPersonFields {
  inventory?: Array<{ definitionId: string; quantity: number }>;
  name: string;
  description: string;
  personality: string;
  backstory: string;
  traitIds: string[];
  goals: string[];
  meters: Record<string, number>;
}

export interface GodMemoryEditorEntry {
  id: string;
  source: 'awareness' | 'memory' | 'summary';
  label: 'Raw' | 'Consolidated';
  text: string;
  time: number;
  tags: string[];
  hash: string;
  eventType?: string;
  json?: string;
}

export interface GodPersonEditorView {
  /** Applicable editable numeric attributes in their declared units. */
  meters: AttributeView[];
  manifestRevision: number;
  bodyPolicyPin: { id: string; version: number; digest: string } | null;
  generation: string;
  statuses: string[];
  itemOptions: Array<{ id: string; name: string }>;
  traitOptions: Array<{ id: string; name: string; description: string }>;
  before?: string;
  ok: true;
  revision: number;
  actorId: string;
  person: GodPersonFields;
  memories: GodMemoryEditorEntry[];
}

export interface GodWorldEventEditorEntry {
  id: string;
  type: string;
  text: string;
  time: number;
  actors: string[];
  hash: string;
  json?: string;
}

export interface GodWorldEventsEditorView {
  before?: number;
  ok: true;
  revision: number;
  events: GodWorldEventEditorEntry[];
}

/** A creator can author supported fictional NPC feelings; this grants no human mind access. */
export interface AuthoredAppraisalRequest {
  id: string;
  worldId: string;
  generation: string;
  epoch: string;
  actorId: string;
  change:
    | {
        kind: 'create';
        definitionPin: { id: string; version: number; digest: string };
        targetId: string | null;
      }
    | { kind: 'resolve'; id: string; expectedRevision: number };
}

/** Private continuity DTO: owner access or separately authorized NPC inspection. */
export interface ActivityHistoryPage {
  worldId: string;
  generation: string;
  learningStatus: string;
  entries: { at: number; text: string; status: string }[];
  next: number | null;
  methods: { name: string; status: string; text: string }[];
  methodNext: number | null;
}

export interface GodMindView {
  continuity?: {
    authoring?: {
      epoch: string;
      policies: { label: string; pin: { id: string; version: number; digest: string } }[];
    };
    cursor: string | null;
    appraisals: {
      id: string;
      revision: number;
      label: string;
      subject: string | null;
      value: number | null;
      lifetime: string;
      coverage: string;
    }[];
  };
  knowledgeLimits?: { general: number; subject: number };
  worldId?: string;
  generation?: string;
  notepads?: {
    subjectId: KnowledgeSubject | null;
    origin: 'authored-starting' | 'actor-edit';
    label: string;
    text: string;
    revision: number;
    characters: number;
    maxCharacters: number;
  }[];
  corrections?: Record<string, string>;
  legacyThoughts?: Array<{
    decisionId: string;
    at: number;
    text: string;
    kind: string;
    source: string;
  }>;
  acceptedText?: string;
  experiences?: Array<{ id: string; text: string; at: number; kind: string; source: string }>;
  commitments?: Array<{ id: string; text: string; resolved: boolean }>;
  skills?: Array<{ name: string; source: string; learnedAt: number }>;
  statusEffects?: Array<{ id: string; label: string; elapsedSeconds: number }>;
  actorId: string;
  name: string;
  revision: number;
  documents: Array<{
    id: string;
    title: string;
    text: string;
    revision: number;
    protected: boolean;
    evidence: Array<{ id: string; relation: string }>;
  }>;
  records: Array<{
    id: string;
    revision: number;
    documentId: string;
    kind: string;
    subjectId: ObserverSubject | null;
    source: string;
    confidence: number;
    trust: number | null;
    status: string;
    evidence: Array<{ id: string; relation: string }>;
  }>;
  thoughts: Array<{ decisionId: string; at: number; text: string; kind: string; source: string }>;
}

/** One subject for private notes/feelings, as the inspected character knows them.
 * Labels are that character's own given names or species descriptions, never global names. */
export type ObserverSubject =
  | { kind: 'entity'; entityId: string }
  | { kind: 'individual'; individualId: string };
/** Personal understanding may concern a known person, acquired place or own map marker. */
export type KnowledgeSubject =
  | ObserverSubject
  | { kind: 'place'; placeId: string }
  | { kind: 'map-marker'; markerId: string };
export interface MindSubject {
  id: string;
  subject: ObserverSubject;
  label: string;
  status: 'in-view' | 'known' | 'notes-only';
  detail: string;
}
/** Searchable private subject choices (`/api/mind/subjects`, god NPC variant). */
export interface MindSubjectPage {
  ok: true;
  worldId: string;
  generation: string;
  subjects: MindSubject[];
  next: string | null;
  /** Exact-subject lookup only (no search page); null when it is not a permitted subject. */
  selected?: {
    subject: MindSubject;
    notepad: NonNullable<GodMindView['notepads']>[number] | null;
    identity: {
      givenName: string;
      nickname?: string;
      revision: number;
    } | null;
  } | null;
}

/** Owner-only debugging payload; never included in GameView or public event streams. */
export interface DecisionInspection {
  reason?: string;
  immediate: string;
  final: string;
  immediateMs: number | null;
  totalMs: number | null;
  queueMs: number | null;
  preparationMs: number | null;
  providerMs: number | null;
  accountingMs: number | null;
  estimatedCostUsd: number;
  heldUsd: number;
  unpricedAttempts: number;
  attempts: number;
}
export interface IntelligenceCall {
  ownerAccountId?: string;
  parentId?: string;
  worldId?: string;
  actorId?: string;
  disposition?: string;
  route?: string;
  gameTime?: number;
  actorName?: string;
  trigger?: string;
  /** Concise owner-facing classification of what initiated this request. */
  triggerType?: string;
  id: string;
  kind: string;
  startedAt: string;
  completedAt?: string;
  timings?: Record<string, { startedAt: string; completedAt?: string; durationMs?: number }>;
  status: 'running' | 'completed' | 'failed';
  input: unknown;
  output?: unknown;
  exchanges: {
    path: string;
    method: string;
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
    input: unknown;
    output?: unknown;
    httpStatus?: number;
    truncated?: boolean;
  }[];
}

export interface TranscriptItem {
  /** Committed observation wording used when optional generation is unavailable. */
  authoredFallback?: boolean;
  speech?: PerceivedSpeech;
  id: string;
  kind: 'speech' | 'event' | 'narration';
  text: string;
  time: number;
  order: number;
  speakerId?: string;
  /** Name captured in this observer's original event evidence. */
  speaker?: string;
  sourceIds: string[];
  impacts: Array<{
    entityId: string;
    entityName?: string;
    field: string;
    delta: number;
    sourceId: string;
  }>;
  status?: 'pending' | 'failed' | 'fallback' | 'completed';
  voice?: 'restrained' | 'lyrical' | 'wry';
  sourceStatus?: 'available' | 'unavailable';
  revision?: number;
}
export interface TranscriptPage {
  items: TranscriptItem[];
  watermark: number;
  before?: number;
}

/** Public slot metadata only; private world payloads never cross this boundary. */
export interface GameSaveSummary {
  id: string;
  label: string;
  /** Server wall-clock time, for display only. */
  createdAt: string;
  simTime: number;
  compatible: boolean;
  kind?: 'manual' | 'auto' | 'recovery';
  /** Durable capture order; retention and paging use it instead of wall-clock time. */
  sequence?: number;
}
/** Operator autosave policy for this world, outside gameplay rewind. */
export interface AutosaveSettings {
  enabled: boolean;
  intervalMinutes: number;
  retain: number;
  revision: number;
}
/** Latest checkpoint failure until an operator acknowledges it; survives restart. */
export interface CheckpointFailure {
  id: string;
  at: string;
  kind: 'auto' | 'manual' | 'recovery';
  message: string;
}
export interface AutosaveStatus {
  /** Any checkpoint capture (automatic, manual or recovery) is running. */
  saving: boolean;
  /** A manual save is waiting for the capture in progress. */
  pendingManual: boolean;
  lastCompletedAt?: string;
  failure?: CheckpointFailure;
  unavailableSaves: number;
  /** Bytes currently in the save directory, including damaged or interrupted entries. */
  storageBytes?: number;
  settings: AutosaveSettings;
  /** Stored settings are unreadable; automatic saves are off until settings are saved again. */
  settingsError?: string;
}
export interface GameSaveCatalog {
  ok: boolean;
  message?: string;
  saves: GameSaveSummary[];
  autosaves: AutosaveStatus;
  next?: Pick<GameSaveSummary, 'id' | 'createdAt' | 'sequence'>;
}

/** Bounded attribute presentation projected by the server. */
export interface AttributeView {
  /** Numeric notices come from committed effects rather than changes between snapshots. */
  changeFeedback?: 'effects';
  /** Identifies the installed body's health meter independently of its authored name. */
  bodyHealth?: boolean;
  id: string;
  version: number;
  name: string;
  display: 'meter' | 'category';
  /** Symbolic references only; resolved through the trusted client asset/token catalogue. */
  presentation: { icon: string; color: string };
  value: number | string | null;
  status: 'known' | 'unknown';
  min?: number;
  max?: number;
  unit?: string;
  meaning?: string;
  condition?: string;
  concern?: string;
  critical?: boolean;
  editorCritical?: boolean;
  editorCriticalComparison?: {
    operator: 'lessThan' | 'lessThanOrEqual';
    value: number;
    rounding: 'none' | 'nearest-integer';
  };
  revision: number;
}

export interface InventionContinuation {
  parentId: string;
  action: 'clarify' | 'revise' | 'search' | 'new' | 'modify' | 'reuse' | 'apply';
  candidateDigest?: string;
  recipeId?: string;
}
export interface SimilarInvention {
  recipeId: string;
  version: number;
  digest: string;
  name: string;
  description: string;
  materials: string;
  behavior: string;
  score?: number;
}
export interface InventionSearch {
  status: 'complete' | 'unavailable';
  message: string;
  matches: SimilarInvention[];
}
/** Creator-scoped durable records; candidate JSON is inspectable data, never executable. */
export interface InventionValidationView {
  valid: boolean;
  family?: string;
  summary?: string;
  errors: string[];
  dependencies: Array<{ id: string; version: number; role: string }>;
  limits: string[];
}

export interface InventionRequestView {
  mode?: 'workshop';
  candidateDigest?: string;
  validation?: InventionValidationView;
  id: string;
  createdAt: number;
  conversationId?: string;
  intent: string;
  status: AiJobView['status'];
  code: string;
  message: string;
  candidate?: unknown;
  parentId?: string;
  rootId?: string;
  continuedBy?: string;
  search?: InventionSearch;
  recipeId?: string;
  installed: boolean;
  currentTimeline: boolean;
}
export interface InventionHistory {
  ok: boolean;
  message?: string;
  requests: InventionRequestView[];
  next?: { createdAt: number; id: string };
}

export interface ObjectHistoryPage {
  ok: boolean;
  message?: string;
  entries: {
    id: string;
    at: number;
    type: 'split' | 'merge' | 'consume';
    quantity: number;
    name: string;
    sourceId: string;
    targetId?: string;
  }[];
  next?: string;
}

export const INVENTORY_SORTS = ['native', 'name-asc', 'name-desc', 'quantity-desc'] as const;
export type InventorySort = (typeof INVENTORY_SORTS)[number];
export const DEFAULT_INVENTORY_SORT: InventorySort = 'native';
export const INVENTORY_FILTERS = ['all', 'equipped', 'containers'] as const;
export type InventoryFilter = (typeof INVENTORY_FILTERS)[number];
export const DEFAULT_INVENTORY_FILTER: InventoryFilter = 'all';

export interface ContainerPageRequest {
  containerId?: string;
  query?: string;
  cursor?: string;
  mergeSourceId?: string;
  sort?: InventorySort;
  filter?: InventoryFilter;
}

export interface ContainerPage {
  ok: boolean;
  message?: string;
  container: Named & {
    id: string;
    location?: string;
    revision: number;
    load?: number;
    capacity?: number;
    restricted?: boolean;
  };
  breadcrumbs: Array<Named & { id: string; revision: number }>;
  items: InventoryItemView[];
  next?: string;
  /** World-container rows are only the page deliberately inspected. Further rows
   * require this native command; a read/search never records more experience. */
  inspection?: { next?: CommandInput };
}

/** Actor-safe state of chosen work; "understood" requests are PlayerActionAttempt cards. */
export type WorkState =
  | 'queued'
  | 'running'
  | 'waiting'
  | 'blocked'
  | 'completed'
  | 'cancelled'
  | 'paused';
export interface WorkStepView {
  id: string;
  label: string;
  state: WorkState;
  reason?: string;
}
export interface WorkView {
  /** Identity of the shown work (plan, paused plan, direct action); a retried Stop reuses
   * its command only while this is unchanged. */
  id: string;
  label: string;
  state: WorkState;
  reason?: string;
  steps: WorkStepView[];
  /** Work paused for the current work; it resumes after rechecking when this ends. */
  paused: { label: string; steps: WorkStepView[] } | null;
}
export interface PlayerActionAttempt {
  mode: 'enqueue' | 'replace' | 'interrupt';
  id: string;
  description: string;
  status: 'needs-interpretation' | 'awaiting-confirmation';
  /** Why an unresolved request did not bind, in words safe for this actor. */
  reason?: string;
  category?: string;
  fulfillment?: {
    requested: string;
    executableDescription: string;
    verdict: 'exact' | 'partial' | 'confirm';
    supported: string[];
    omitted: { requirement: string; reason: string }[];
    reason: string;
  };
}
export * from './relationships.js';

export * from './world-agent.js';

/** Operational entry and maintenance DTOs; see docs/projects/completed/multiplayer-entry-maintenance.md. */
export type AccessCapability =
  | 'play'
  | 'spectate'
  | 'create'
  | 'inspect'
  | 'save'
  | 'manage-access';

/** Public descriptions shared by account management and exact destination review. */
export const ACCESS_CAPABILITY_TEXT: Record<AccessCapability, string> = {
  play: 'Play a character',
  spectate: 'Watch the world overview',
  create: 'Creator tools and maintenance',
  inspect: 'Inspect characters and diagnostics',
  save: 'Save and load the world',
  'manage-access': 'Invite people and manage access',
};

/** Real-world instants are UTC epoch milliseconds; `timeZone` is the creator's IANA display zone. */
export interface MaintenanceWindowView {
  id: string;
  revision: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  startsAt: number;
  /** Announced estimate only. An active window stays paused until marked ready. */
  endsAt: number;
  timeZone: string;
  message: string;
  lastChange: 'scheduled' | 'rescheduled' | 'extended' | 'started' | 'cancelled' | 'completed';
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
}

/** Public physical overview for spectators: no names, identities, possessions or speech. */
export interface WorldOverview {
  map: {
    width: number;
    height: number;
    tiles: GameView['map']['tiles'];
    terrain: GameView['map']['terrain'];
  };
  bodies: Array<{
    category: 'person' | 'animal' | 'resource' | 'fire' | 'object';
    x: number;
    z: number;
  }>;
  omitted: number;
}

export interface AccessGrantView {
  accountId: string;
  actorId?: string;
  capabilities: AccessCapability[];
  revision: number;
  label?: string;
  self: boolean;
}

export interface InviteView {
  id: string;
  role: 'player' | 'spectator' | 'operator';
  capabilities: AccessCapability[];
  actorId?: string;
  label: string;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'redeemed' | 'revoked' | 'expired';
  redeemedAt?: number;
  accountId?: string;
}

export interface OperationsView {
  checkpoint?: import('./request-recovery.js').CheckpointContext;
  presentationRelease?: AssetRevisionReference;
  presentationReleaseRevision?: number;
  ok: true;
  worldId: string;
  accountId: string;
  capabilities: AccessCapability[];
  /** The account's character in this world, if it has one. */
  actorId?: string;
  scope: string;
  generation: string;
  mode: 'local' | 'oidc';
  clock: Pick<
    GameView['clock'],
    'seconds' | 'day' | 'dayLabel' | 'hour' | 'offsetHours' | 'speed' | 'paused' | 'pauseReason'
  >;
  maintenance: MaintenanceWindowView | null;
  overview?: WorldOverview;
  access?: {
    grants: AccessGrantView[];
    invites: InviteView[];
    /** Living people without a current or historical human owner. */
    candidates: Array<{ actorId: string; name: string }>;
  };
  maintenanceHistory?: MaintenanceWindowView[];
}

/** Creator-only projection. Wording comes from the installed world owner. */
export interface FamilyPerson {
  id: string;
  label: string;
  detail?: string;
}
export interface FamilyLink {
  id: string;
  parentId: string;
  childId: string;
}
export interface FamilyEdit {
  id: string;
  generation: string;
  revision: number;
  change: { kind: 'add' | 'remove'; link: FamilyLink };
}
export interface FamilyPeoplePage {
  ok: true;
  people: FamilyPerson[];
  next: string | null;
}
export interface FamilyView {
  ok: true;
  generation: string;
  revision: number;
  actor: FamilyPerson;
  policy: {
    title: string;
    parentLabel: string;
    childLabel: string;
    recordLabel: string;
    guidance: string;
  };
  relations: Array<{
    actorId: string;
    label: string;
    description: string;
    link?: FamilyLink;
    deletion?: string;
  }>;
  next: string | null;
  preview?: string;
}

export interface PracticeProgressView {
  rankLabel: string;
  progressText: string;
  authoredStartingText: string;
  evidenceHeading: string;
  evidenceItemTemplate: string;
  id: string;
  name: string;
  value: 0 | 1;
  starting: boolean;
  releases: number;
  independentRequired: number;
  coachedRequired: number;
  coached: boolean;
  scope: string;
  effect: string;
  evidence: { occurrenceId: string; eventId: string; description: string }[];
}
