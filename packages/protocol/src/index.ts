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

/** Deliberately smaller than the domain command: the server supplies actor/authority. */
export interface CommandInput {
  type:
    | 'activity'
    | 'activity-request'
    | 'conversation'
    | 'say'
    | 'pickup'
    | 'drop'
    | 'transfer-item'
    | 'split-item'
    | 'merge-item'
    | 'unequip'
    | 'move'
    | 'follow'
    | 'confirm-attempt'
    | 'withdraw-attempt'
    | 'gather'
    | 'prepare'
    | 'craft'
    | 'equip'
    | 'strike'
    | 'hunt'
    | 'harvest'
    | 'cook'
    | 'tend-fire'
    | 'handover'
    | 'eat'
    | 'replenish'
    | 'status-effect'
    | 'inspect-inventory'
    | 'inspect-activities'
    | 'cancel'
    | 'recover'
    | 'teach';
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
  conversationId?: string;
  text?: string;
  generation?: number;
  operation?: 'join' | 'leave';
  effectOperation?: 'activate' | 'deactivate';
  fireOperation?: 'light' | 'fuel' | 'extinguish';
  handoverOperation?: 'offer' | 'accept' | 'decline' | 'withdraw';
  offerId?: string;
  targetId?: string;
  definitionId?: string;
  itemId?: string;
  recipeId?: string;
  attributeId?: string;
  ammunitionId?: string;
  position?: SurfacePoint;
  distance?: number;
  attemptId?: string;
  quantity?: number;
  expectedRevision?: number;
  /** A scoped Stop must not cancel work that replaced the selected action. */
  expectedActionId?: string;
  placementRevision?: number;
  /** The reviewed contents of a container item, independent of its placement. */
  expectedContentsRevision?: number;
  targetRevision?: number;
  preparation?: 'fiber' | 'cord';
}

/** Transport mirror of the installed world's trusted semantic presentation. */
export type ActivityRequestPresentation = {
  target: string;
  material: string;
  reserve: string;
  workMode: string;
} & (
  | { kind: 'resource-care'; supply: string; stop: string; budget: string }
  | { kind: 'gather-store-use'; source: string; destination: string; quantity: string }
);
export interface ActivityEntry {
  familyId: string;
  targetId: string;
  label: string;
  description: string;
}
export interface ActivityRequestsView {
  ok: boolean;
  scope: string;
  simTime: number;
  /** Applicable tasks for the exact permitted target supplied to this read. */
  entries: ActivityEntry[];
  requests: {
    id: string;
    label: string;
    description: string;
    presentation?: ActivityRequestPresentation;
    fields: Record<
      string,
      {
        type: 'entity' | 'definition' | 'integer' | 'time' | 'mode';
        label: string;
        minimum?: number;
        maximum?: number;
        minimumDuration?: number;
        maximumDuration?: number;
        required: true;
        discovery?: { source: 'spatial' | 'storage' | 'materials'; sourceField?: string };
      }
    >;
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
  command: CommandInput;
  enabled: boolean;
  reason?: string;
}

/** A discoverable option is either a native intention, a composer, or a missing prerequisite. */
export interface CatalogueAction {
  id: string;
  label: string;
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
    | { kind: 'compose'; mode: 'chat' | 'invention'; npcId?: string }
    | { kind: 'unavailable' };
}

export interface ActionContext {
  targetId?: string;
  itemId?: string;
  destinationId?: string;
  quantity?: number;
  position?: SurfacePoint;
}

export interface ActionCatalogue {
  revision: number;
  actions: CatalogueAction[];
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
  pose?: 'horizontal';
  particle?: { text: string; anchor: 'head'; motion: 'floatAway' };
}
export interface EntityView {
  /** Native root placement is public; contents revision requires current contents access. */
  storage?: { containerId: string; placementRevision: number; revision?: number };
  contents?: Array<{
    id: string;
    definitionId: string;
    name: string;
    quantity: number;
    portable: boolean;
  }>;
  actionAnimation?: ActionAnimation | null;
  statusEffects?: StatusEffectView[];
  attributes?: AttributeView[];
  id: string;
  kind: 'actor' | 'animal' | 'resource' | 'remains' | 'station' | 'item-pile';
  name: string;
  subtype: string;
  position: Position;
  supportSurfaceId: string | null;
  heading: number;
  appearance: 'sprite' | 'crate-mesh' | 'mercenary-model';
  radius: number;
  status: string;
  description?: string;
  traits?: Array<{ id: string; name: string; description: string }>;
  canTalk?: boolean;
  talkRequiresAi?: boolean;
  talkUnavailableReason?: string;
  speechCapable?: boolean;
  health?: number;
  bodyRevision?: number;
  species?: 'human' | 'hare' | 'deer' | 'construct' | 'bird';
  quantity?: number;
  actions: ActionOption[];
}

export interface InventoryItemView {
  revision: number;
  placementRevision: number;
  individual?: boolean;
  container?: { load: number; capacity: number; revision: number };
  declaredOwner?: { name: string; revision: number };
  id: string;
  definitionId: string;
  name: string;
  quantity: number;
  /** Available free units; omitted when availability has not been inspected. */
  availableQuantity?: number;
  /** The admitted requirement for one unit, including contents for an indivisible bag. */
  packingLoad?: number;
  characteristics?: InventoryCharacteristic[];
  comparison?: { id: string; name: string; characteristics: InventoryCharacteristic[] };
  category: 'material' | 'food' | 'equipment' | 'ammunition';
  description: string;
  equipped: boolean;
  tags: string[];
  actions: ActionOption[];
}

export interface RecipeView {
  npcCreated: boolean;
  id: string;
  name: string;
  description: string;
  family: string;
  output: { name: string; description: string };
  facts: Array<{ id: string; label: string; value: number | string; unit?: string }>;
  limitations: string[];
  ingredients: Array<{ name: string; quantity: number; available: number; role: string }>;
  workSeconds: number;
  provenance: string;
  actions: ActionOption[];
}

export type SpeechVolume = 'whisper' | 'normal' | 'shout';
export interface PerceivedSpeech {
  perception: 'heard' | 'seen' | 'self';
  intelligibility: 'none' | 'partial' | 'clear';
  segments: Array<{ kind: 'heard'; text: string } | { kind: 'unintelligible' }>;
  speaker: { entityId: string; nameAtTime: string } | null;
  delivery: SpeechVolume | null;
  direction: { sector: number; elevation: 'above' | 'level' | 'below' } | null;
  listenerPosition: Position;
}
export interface PerceivedEventsPage {
  events: PublicEvent[];
  nextCursor?: string;
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
  id: string;
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

export interface PublicEvent {
  speech?: PerceivedSpeech;
  modality?: 'heard' | 'observed' | 'felt' | 'internal';
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
  /** User-facing detail revealed from the message-local failure label. */
  replyFailure?: string;
  id: string;
  speakerId?: string;
  speech?: PerceivedSpeech;
  speaker: string;
  text: string;
  time: number;
}

/** Volatile, authenticated direct-conversation presentation; never heard history. */
export interface NpcReplyPreview {
  requestId: string;
  attempt: number;
  generation: string;
  worldId: string;
  timelineId: string;
  conversationId?: string;
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
    traits: Array<{ id: string; name: string; description: string }>;
    spawnOptions: Array<{ id: string; label: string; category: 'Actors' | 'Environment' }>;
    itemOptions: Array<{ id: string; label: string; description: string }>;
  };
  schemaVersion: 2;
  revision: number;
  worldId: string;
  profile: PlayerProfile;
  /** Native sight range/body anchors; presentation bands add no gameplay tier or range. */
  vision: { radius: number; enabled: boolean; eyeHeight: number; targetHeights: number[] };
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
    tiles: Array<Array<'grass' | 'sand' | 'water' | 'rock'>>;
    obstacles: Array<{ y: number; x: number; z: number; radius: number; kind: string }>;
  };
  clock: {
    seconds: number;
    day: number;
    hour: number;
    speed: number;
    baseRatio: number;
    paused: boolean;
    pauseReason: 'manual' | 'away' | 'storage' | 'maintenance' | null;
    /** Technical preparation only; this exposes no other actor's route or intent. */
    preparingNavigation?: boolean;
    /** Stopping-time names this world defines ("dawn"); empty when it names none. */
    namedTimes: string[];
    /** The world's clock offset in hours: day 1 starts at this hour. */
    offsetHours: number;
  };
  player: {
    appearance?: EntityView['appearance'];
    participation?: 'active' | 'exiting' | 'inactive';
    statusEffects?: StatusEffectView[];
    id: string;
    name: string;
    position: Position;
    supportSurfaceId: string | null;
    heading: number;
    /** Permitted applicable values, never a raw module state dump. */
    attributes: AttributeView[];
    actionAnimation?: ActionAnimation | null;
    /** Configured applicable suggestions in authoritative presentation order. */
    suggestedActionIds: string[];
    alive: boolean;
    action: {
      id: string;
      showStatus: boolean;
      label: string;
      progress: number;
      durationSeconds: number;
      elapsedSeconds: number;
      advancing: boolean;
    } | null;
    traits?: Array<{ id: string; name: string; description: string }>;
    memories?: MemoryEntryView[];
    history?: string;
    inventory: InventoryItemView[];
    inventoryRevision: number;
    canUseInventory: boolean;
    actionAttempts: PlayerActionAttempt[];
    /** The controlled actor's plain activity result; detailed steps remain God-only. */
    activity?: ActivityRequestsView['status'];
    /** The controlled character's plan steps and states; projected only in God mode. */
    work?: WorkView | null;
    /** Example typed requests in this world's own words, for the action form. */
    actionWording?: { examples: string[]; placeholder: string };
    actions: ActionOption[];
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

export interface GamePatch {
  scope?: string;
  commandEpoch?: string;
  worldEventsRevision?: string;
  historyRevision?: string;
  historyEpoch?: string;
  schemaVersion: 2;
  baseRevision: number;
  revision: number;
  narrator?: GameView['narrator'];
  profile?: GameView['profile'];
  clock?: Partial<GameView['clock']>;
  player?: Partial<GameView['player']>;
  entities?: { upsert: EntityView[]; remove: string[]; order?: string[] };
  recipes?: GameView['recipes'];
  events?: GameView['events'];
  conversation?: GameView['conversation'];
  ai?: Partial<GameView['ai']>;
  milestones?: GameView['milestones'];
  persistence?: GameView['persistence'];
}

export interface ApiResult {
  ok: boolean;
  code: string;
  message: string;
  jobId?: string;
  itemId?: string;
  recipeId?: string;
  goalId?: string;
  planId?: string;
  /** The exact native action admitted by this command, independently of request identity. */
  actionId?: string;
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
    subjectId: string | null;
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
    subjectId: string | null;
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
export interface MindSubject {
  id: string;
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
      revision: number;
      encounterId: string | null;
      authored: boolean;
    } | null;
  } | null;
}

/** Owner-only debugging payload; never included in GameView or public event streams. */
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
  speech?: PerceivedSpeech;
  id: string;
  kind: 'speech' | 'event' | 'narration';
  text: string;
  time: number;
  order: number;
  conversationId?: string;
  speakerId?: string;
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
  legacy?: boolean;
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

export interface ContainerPage {
  ok: boolean;
  message?: string;
  container: {
    id: string;
    name: string;
    location?: string;
    revision: number;
    load?: number;
    capacity?: number;
    restricted?: boolean;
  };
  breadcrumbs: Array<{ id: string; name: string; revision: number }>;
  items: InventoryItemView[];
  next?: string;
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

/** Operational entry and maintenance DTOs; see docs/projects/multiplayer-entry-maintenance.md. */
export type AccessCapability =
  | 'play'
  | 'spectate'
  | 'create'
  | 'inspect'
  | 'save'
  | 'manage-access';

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
  map: { width: number; height: number; tiles: GameView['map']['tiles'] };
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
  ok: true;
  worldId: string;
  accountId: string;
  capabilities: AccessCapability[];
  /** The account's character in this world, if it has one. */
  actorId?: string;
  scope: string;
  generation: string;
  mode: 'local' | 'oidc';
  clock: Pick<GameView['clock'], 'seconds' | 'day' | 'hour' | 'speed' | 'paused' | 'pauseReason'>;
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
