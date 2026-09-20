/** Public wire contract. Never expose the authoritative world or another actor's memory. */
export type Position = Readonly<{ x: number; z: number }>;

/** Deliberately smaller than the domain command: the server supplies actor/authority. */
export interface CommandInput {
  type:
    | 'move'
    | 'gather'
    | 'prepare'
    | 'craft'
    | 'equip'
    | 'hunt'
    | 'harvest'
    | 'cook'
    | 'eat'
    | 'rest'
    | 'cancel'
    | 'recover'
    | 'teach';
  targetId?: string;
  itemId?: string;
  recipeId?: string;
  ammunitionId?: string;
  position?: Position;
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
  position?: Position;
}

export interface ActionCatalogue {
  revision: number;
  actions: CatalogueAction[];
}

export interface PlayerProfile {
  id: string;
  revision: number;
  preferences: { showUnavailableActions: boolean; pauseWhenHidden: boolean };
}
/** A control changes only its own preference, preserving concurrent UI choices. */
export type PlayerPreferencePatch = Partial<PlayerProfile['preferences']>;

export interface EntityView {
  id: string;
  kind: 'actor' | 'animal' | 'resource' | 'remains' | 'station';
  name: string;
  subtype: string;
  position: Position;
  radius: number;
  status: string;
  description?: string;
  traits?: Array<{ id: string; name: string; description: string }>;
  canTalk?: boolean;
  health?: number;
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
  replyStatus?: AiJobView['status'];
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
  godMode?: boolean;
  schemaVersion: 1;
  revision: number;
  worldId: string;
  profile: PlayerProfile;
  /** Authoritative sight radius; the client may style its boundary, not enlarge it. */
  vision: { radius: number };
  map: {
    width: number;
    height: number;
    seed: number;
    tiles: Array<Array<'grass' | 'sand' | 'water' | 'rock'>>;
    obstacles: Array<{ x: number; z: number; radius: number; kind: string }>;
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
    id: string;
    name: string;
    position: Position;
    /** All meters use 0..100; hunger rises toward starvation, energy/health fall. */
    health: number;
    hunger: number;
    energy: number;
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
    budget: { limitUsd: number; spentUsd: number; reservedUsd: number; estimated: boolean };
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

export interface ApiResult {
  ok: boolean;
  code: string;
  message: string;
  jobId?: string;
}

/** Private inspection DTO: returned only by the separately authorized god endpoint. */
export interface GodMindView {
  corrections?: Record<string, string>;
  legacyThoughts?: Array<{
    decisionId: string;
    at: number;
    text: string;
    kind: string;
    source: string;
  }>;
  acceptedText?: string;
  experiences?: Array<{ id: string; text: string; at: number; kind: string }>;
  commitments?: Array<{ id: string; text: string; resolved: boolean }>;
  skills?: Array<{ name: string; source: string; learnedAt: number }>;
  rest?: { asleep: boolean; sleepingSeconds: number; restedSeconds: number; debtSeconds: number };
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
  id: string;
  kind: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
  input: unknown;
  output?: unknown;
  exchanges: {
    path: string;
    method: string;
    startedAt: string;
    input: unknown;
    output?: unknown;
    httpStatus?: number;
    truncated?: boolean;
  }[];
}
