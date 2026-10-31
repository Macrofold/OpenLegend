/** Developer projections for the isolated lab. Native admission remains server owned. */
export type CognitionLabJson =
  | null
  | boolean
  | number
  | string
  | CognitionLabJson[]
  | { [key: string]: CognitionLabJson };

export type CognitionLabCategory =
  | 'overview'
  | 'person'
  | 'body'
  | 'feelings'
  | 'relations'
  | 'work'
  | 'possessions'
  | 'surroundings'
  | 'memories'
  | 'history'
  | 'custom';

export interface CognitionLabPage<T> {
  items: T[];
  nextCursor?: string;
  total?: number;
}

export interface CognitionLabExpected {
  runtimeGeneration: string;
  scenarioRevision: number;
}

export type CognitionLabState = 'ready' | 'running' | 'settling' | 'held' | 'ended';

export interface CognitionLabPolicy {
  mode: 'oneResponse' | 'untilCondition' | 'forDuration' | 'continuous';
  focalActorId?: string;
  autonomousActorIds: string[];
  durationSeconds: number;
  maximumCalls: number;
  activeWallSeconds: number;
  stopCondition?:
    | { kind: 'actionOutcome' | 'nextDecision'; id: string }
    | { kind: 'nextEvent' | 'nextStage'; id?: string };
}

export interface CognitionLabSettings {
  policy: CognitionLabPolicy;
  /** Supported configured purposes, including direct higherDecision; never endpoints or credentials. */
  models: Record<string, string>;
  effort?: string;
  maxOutputTokens?: number;
  storageAllowanceBytes: number;
  runCaptureAllowanceBytes: number;
}

export type CognitionLabSettingsPatch = Omit<
  Partial<CognitionLabSettings>,
  'effort' | 'maxOutputTokens'
> & {
  effort?: string | null;
  maxOutputTokens?: number | null;
};

export interface CognitionLabActor {
  id: string;
  name: string;
  description?: string;
  kind: string;
  participation?: string;
  controlled: boolean;
  canAuthor: boolean;
}

export interface CognitionLabAction {
  id: string;
  label: string;
  description?: string;
  available: boolean;
  reason?: string;
  command: CognitionLabJson;
}

export interface CognitionLabWorkspace extends CognitionLabExpected {
  ok: true;
  workspaceId: string;
  worldId: string;
  timeline: string;
  nativeRevision: number;
  disclosureRevision: string;
  privateDraftScope: string;
  /** Stable account/workspace fence for explicit command reconciliation. */
  operationOwnerScope: string;
  cursor: string;
  name: string;
  state: CognitionLabState;
  gameTime: number;
  nativePaused: boolean;
  participantActorIds: string[];
  characterCreation?: { available: boolean; reason?: string; fields: CognitionLabField[] };
  run?: CognitionLabRun;
  settings: CognitionLabSettings;
  modelChoices: Record<string, string[]>;
  effortChoices: string[];
  defaults: { inspectedActorId?: string; actorId?: string; targetId?: string; volume: string };
  speechVolumes: Array<{ id: string; label: string }>;
  categories: Array<{
    id: CognitionLabCategory;
    label: string;
    available: boolean;
    reason?: string;
  }>;
  capabilities: Array<{ id: string; label: string; available: boolean; reason?: string }>;
  provider: { available: boolean; message?: string };
  storage: { usedBytes: number; reservedBytes: number; allowanceBytes: number };
}

export interface CognitionLabField {
  id: string;
  category?: CognitionLabCategory;
  advanced?: boolean;
  label: string;
  datatype: 'text' | 'number' | 'boolean' | 'meter' | 'choice' | 'json' | 'reference';
  meaning: 'native' | 'derived' | 'narrative' | 'modelOnly';
  value: CognitionLabJson;
  /** Editable template for a source which does not exist until Apply. */
  initialValue?: CognitionLabJson;
  /** Native atomic Apply scope when one broad owner exposes separate operations. */
  applyGroup?: string;
  preview?: string;
  description?: string;
  editable: boolean;
  unavailableReason?: string;
  owner?: CognitionLabEdit['owner'];
  token?: CognitionLabJson;
  unit?: string;
  minimum?: number;
  maximum?: number;
  multiline?: boolean;
  holdable?: boolean;
  holdUnavailableReason?: string;
  held?: boolean;
  options?: Array<{ id: string; label: string }>;
  choiceSource?: string;
  detail?: { kind: 'source' | 'memory' | 'event'; id: string };
}

export interface CognitionLabCurrent extends CognitionLabExpected {
  ok: true;
  workspaceId: string;
  worldId: string;
  timeline: string;
  nativeRevision: number;
  actorId: string;
  category: CognitionLabCategory;
  fields: CognitionLabPage<CognitionLabField>;
  create?: CognitionLabField[];
}

export interface CognitionLabEdit {
  actorId?: string;
  fieldId: string;
  owner: 'person' | 'memory' | 'worldEvent' | 'attribute' | 'appraisal' | 'knowledge' | 'custom';
  value: CognitionLabJson;
  baseValue: CognitionLabJson;
  token?: CognitionLabJson;
  hold?: boolean;
}

export interface CognitionLabCustomField {
  id: string;
  label: string;
  datatype: 'text' | 'number' | 'boolean' | 'meter';
  description: string;
  value: string | number | boolean;
  subject:
    | { kind: 'person'; actorId: string }
    | { kind: 'relation'; fromActorId: string; toActorId: string }
    | { kind: 'object'; objectId: string }
    | { kind: 'scene' };
  enabled: boolean;
  recipientActorIds: string[];
  placement: 'experimentalContext';
  minimum?: number;
  maximum?: number;
  unit?: string;
}

export type CognitionLabStimulus =
  | { kind: 'say'; actorId: string; targetId?: string; text: string; volume: string }
  | { kind: 'act'; actorId: string; text: string; command?: CognitionLabJson }
  | { kind: 'event'; actorId?: string; event: CognitionLabJson };

export interface CognitionLabEvent {
  id: string;
  runId?: string;
  rootId?: string;
  stageId?: string;
  actorId?: string;
  actorName?: string;
  targetId?: string;
  gameTime: number;
  recordedAt: number;
  kind: string;
  status: string;
  text: string;
  sourceId?: string;
  operatorAuthored?: boolean;
}

/** Facts captured for this interval/call, independent of later workspace settings. */
export interface CognitionLabConfiguration {
  models?: Record<string, string>;
  model?: string;
  effort?: string;
  maxOutputTokens?: number;
  customInputCount?: number;
  heldValueCount?: number;
  requestOverride?: boolean;
  policy?: CognitionLabPolicy;
}

export interface CognitionLabRun {
  id: string;
  name: string;
  state: CognitionLabState;
  status: string;
  reason?: string;
  startedAt: number;
  endedAt?: number;
  originId: string;
  worldId: string;
  timeline: string;
  focalActorId?: string;
  policy: CognitionLabPolicy;
  counts: { intervals: number; roots: number; stages: number; annotations: number; calls: number };
  accounting: { knownCostUsd: number; uncertainAttempts: number; capturedBytes: number };
  completeness: 'complete' | 'partial' | 'unavailable';
  retained: boolean;
  latestRootId?: string;
  prepared?: CognitionLabPrepared;
  /** Current native owner reports an eligible retry of this accepted source. */
  responseRetry?: { sourceId: string; actorId: string };
  configuration?: CognitionLabConfiguration;
  comparison?: { originId: string; variantName: string; comparisonId: string };
  timing?: { processingMs: number; captureMs: number; operatorHoldMs: number };
}

export interface CognitionLabPrepared {
  id: string;
  stageId: string;
  actorId: string;
  purpose: string;
  kind: 'judge' | 'generate' | 'embed' | 'reflection';
  editable: boolean;
  reason?: string;
  originalArtifactId?: string;
  request?: CognitionLabJson;
  status: 'held' | 'submitted' | 'cancelled' | 'stale';
}

export interface CognitionLabStage {
  id: string;
  runId: string;
  rootId?: string;
  actorId?: string;
  actorName?: string;
  gameTime?: number;
  resultText?: string;
  primaryStageId?: string;
  rerunAvailable?: boolean;
  rerunReason?: string;
  continuationCheckpointId?: string;
  purpose: string;
  kind: string;
  status: string;
  summary: string;
  recordedAt: number;
  completeness: 'complete' | 'partial' | 'unavailable';
  sections: Array<{
    id: string;
    label: string;
    available: boolean;
    count?: number;
    reason?: string;
  }>;
  artifacts: Array<{ id: string; kind: string; length: number; contentType: string }>;
  items?: CognitionLabPage<CognitionLabField>;
  prepared?: CognitionLabPrepared;
  configuration?: CognitionLabConfiguration;
  timing?: {
    captureMs: number;
    operatorHoldMs: number;
    providerMs?: number;
    processingMs?: number;
  };
  /** Exact retained native evidence owner for a section shared by this call. */
  sectionSources?: Record<string, string>;
}

export interface CognitionLabChanges {
  ok: true;
  cursor: string;
  changed: boolean;
  workspace?: CognitionLabWorkspace;
}

export interface CognitionLabSaved {
  id: string;
  kind: 'scenario' | 'checkpoint' | 'run' | 'comparison';
  name: string;
  /** Creator's searchable note about a reusable starting or continuation context. */
  description?: string;
  createdAt: number;
  worldId?: string;
  timeline?: string;
  gameTime?: number;
  runId?: string;
  comparisonRunIds?: string[];
  completeness: 'complete' | 'partial' | 'unavailable';
  compatible: boolean;
  reason?: string;
  bytes?: number;
  withheld?: boolean;
}

export interface CognitionLabArtifact {
  id: string;
  contentType: string;
  length: number;
  offset: number;
  text: string;
  nextOffset?: number;
  downloadUrl: string;
}

export interface CognitionLabSource {
  id: string;
  label: string;
  scope: 'captured' | 'current';
  actorId?: string;
  gameTime?: number;
  content: CognitionLabJson;
}

export interface CognitionLabRecipe {
  id: string;
  name: string;
  description: string;
  setup: string;
  changedFactor: string;
  observe: string;
  prerequisites: string[];
}

type CurrentOperation = { expected: CognitionLabExpected } & (
  | { kind: 'createCharacter'; values: Record<string, CognitionLabJson> }
  | { kind: 'setParticipants'; actorIds: string[] }
  | { kind: 'requestMaintenance'; actorId: string; policy: CognitionLabPolicy }
  | { kind: 'applyEdits'; edits: CognitionLabEdit[] }
  | { kind: 'applySettings'; settings: CognitionLabSettingsPatch }
  | { kind: 'setCustomField'; field: CognitionLabCustomField }
  | { kind: 'removeCustomField'; fieldId: string }
  | {
      kind: 'submitStimulus' | 'prepareAndHold';
      stimulus: CognitionLabStimulus;
      policy: CognitionLabPolicy;
      stagePurpose?: string;
    }
  | { kind: 'newScenario'; name?: string; preset?: string }
  | { kind: 'saveScenario' | 'saveCheckpoint'; name: string; description?: string }
  | {
      kind: 'loadScenario' | 'restoreCheckpoint';
      savedId: string;
      keepCurrentModels?: boolean;
    }
  | { kind: 'importGameSnapshot'; saveId?: string }
  | { kind: 'submitPrepared'; handleId: string; request: CognitionLabJson }
  | { kind: 'continueOriginal'; handleId: string }
  | { kind: 'retryResponse'; sourceId: string; policy: CognitionLabPolicy }
  | { kind: 'continueCheckpoint'; savedId: string; stageId: string; policy: CognitionLabPolicy }
  | {
      kind: 'runComparison';
      originId: string;
      variants: Array<{
        name: string;
        settings?: CognitionLabSettingsPatch;
        edits?: CognitionLabEdit[];
        stimulus: CognitionLabStimulus;
      }>;
      policy: CognitionLabPolicy;
      recipeId?: string;
    }
);

export type CognitionLabOperation = { commandId: string } & (
  | CurrentOperation
  | {
      kind: 'controlRun';
      expected: { runtimeGeneration: string; scenarioRevision?: number };
      runId?: string;
      action:
        | 'continue'
        | 'hold'
        | 'step'
        | 'run'
        | 'advanceTime'
        | 'advanceToOutcome'
        | 'pause'
        | 'resume'
        | 'cancelAttempt'
        | 'stop';
      durationSeconds?: number;
      attemptId?: string;
    }
  | { kind: 'retainRun'; runId: string; name?: string }
  | { kind: 'annotateRun'; runId: string; recordId?: string; text: string; tags?: string[] }
  | { kind: 'removeSaved'; savedIds: string[] }
  | {
      kind: 'rerunRequest';
      runId: string;
      stageId: string;
      request?: CognitionLabJson;
      settings?: CognitionLabSettingsPatch;
    }
);

export interface CognitionLabReceipt {
  ok: boolean;
  /** An admitted operation still lacks a confirmed native outcome; retain its identity. */
  unconfirmed?: boolean;
  commandId: string;
  code?: string;
  message: string;
  field?: string;
  sourceAccepted?: boolean;
  sourceId?: string;
  runId?: string;
  savedId?: string;
  actorId?: string;
  comparisonRunIds?: string[];
  workspace?: CognitionLabWorkspace;
  nextActions?: string[];
}
/** Comparison receipts keep every admitted run identity within their terminal envelope. */
export const COGNITION_LAB_MAX_COMPARISON_VARIANTS = 100;
