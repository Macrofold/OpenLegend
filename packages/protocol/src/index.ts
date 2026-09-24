/** Public wire contract. Never expose the authoritative world or another actor's memory. */
import type { WorldPoint, SurfacePoint, SpatialLayout } from '@open-legend/spatial';
export type Position = Readonly<WorldPoint>;
export type { SurfacePoint, SpatialLayout };

/** Deliberately smaller than the domain command: the server supplies actor/authority. */
export interface CommandInput {
  type:
    | 'conversation'
    | 'pickup'
    | 'drop'
    | 'move'
    | 'gather'
    | 'prepare'
    | 'craft'
    | 'equip'
    | 'strike'
    | 'hunt'
    | 'harvest'
    | 'cook'
    | 'eat'
    | 'replenish'
    | 'status-effect'
    | 'cancel'
    | 'recover'
    | 'teach';
  conversationId?: string;
  generation?: number;
  operation?: 'join' | 'leave';
  effectOperation?: 'activate' | 'deactivate';
  targetId?: string;
  definitionId?: string;
  itemId?: string;
  recipeId?: string;
  attributeId?: string;
  ammunitionId?: string;
  position?: SurfacePoint;
  quantity?: number;
  preparation?: 'fiber' | 'cord';
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
  };
}
/** A control changes only its own preference, preserving concurrent UI choices. */
export type PlayerPreferencePatch = Partial<PlayerProfile['preferences']>;

export interface ActionAnimation {
  id: string;
  kind: 'punch';
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
  appearance: 'sprite' | 'crate-mesh';
  radius: number;
  status: string;
  description?: string;
  traits?: Array<{ id: string; name: string; description: string }>;
  canTalk?: boolean;
  talkUnavailableReason?: string;
  speechCapable?: boolean;
  health?: number;
  bodyRevision?: number;
  species?: 'human' | 'hare' | 'deer' | 'construct' | 'bird';
  quantity?: number;
  actions: ActionOption[];
}

export interface InventoryItemView {
  id: string;
  definitionId: string;
  name: string;
  quantity: number;
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
  ingredients: Array<{ name: string; quantity: number; available: number; role: string }>;
  workSeconds: number;
  provenance: string;
  actions: ActionOption[];
}

export interface PublicEvent {
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
  speakerId: string;
  speaker: string;
  text: string;
  time: number;
}

export interface AiJobView {
  queueLatencyMs?: number;
  totalLatencyMs?: number;
  id: string;
  kind: 'chat' | 'invention' | 'thought';
  status: 'queued' | 'judging' | 'generating' | 'completed' | 'failed' | 'cancelled' | 'stale';
  message: string;
}

export interface GameView {
  inventionPolicy: { revision: number; playerLocked: boolean; agentLocked: boolean };
  saveTimeline?: string;
  commandEpoch?: string;
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
  /** Authoritative sight radius; the client may style its boundary, not enlarge it. */
  vision: { radius: number };
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
    pauseReason: 'manual' | 'away' | 'storage' | null;
  };
  player: {
    statusEffects?: StatusEffectView[];
    id: string;
    name: string;
    position: Position;
    supportSurfaceId: string | null;
    heading: number;
    /** Permitted applicable values, never a raw module state dump. */
    attributes: AttributeView[];
    /** Default-world convenience values; generic presentation uses attributes. */
    actionAnimation?: ActionAnimation | null;
    health: number;
    hunger?: number;
    energy?: number;
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
    memories?: Array<{ id: string; text: string; time: number }>;
    history?: string;
    inventory: InventoryItemView[];
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
  commandEpoch?: string;
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
}

export interface GodPersonFields {
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

/** Private inspection DTO: returned only by the separately authorized god endpoint. */
export interface GodMindView {
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
  identities?: Record<
    string,
    { givenName: string; revision: number; encounterId: string | null; authored: boolean }
  >;
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

/** Owner-only debugging payload; never included in GameView or public event streams. */
export interface IntelligenceCall {
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
  status?: 'pending' | 'fallback' | 'completed';
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
  createdAt: string;
  simTime: number;
  compatible: boolean;
}

/** Bounded attribute presentation projected by the server. */
export interface AttributeView {
  id: string;
  version: number;
  name: string;
  display: 'meter' | 'category';
  presentation: 'health' | 'food' | 'energy' | 'neutral';
  value: number | string | null;
  status: 'known' | 'unknown';
  min?: number;
  max?: number;
  unit?: string;
  concern?: string;
  critical?: boolean;
  revision: number;
}

export interface InventionContinuation {
  parentId: string;
  action: 'clarify' | 'revise' | 'search' | 'new' | 'modify' | 'reuse';
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
export interface InventionRequestView {
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
