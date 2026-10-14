import type { RelationshipEdge, RelationshipNode, RelationshipRef } from './relationships.js';

/** Public owner-authoring views. Credentials, provider prompts and mutable domain state stay server-side. */
export interface WorldAgentReply {
  ok: boolean;
  code: string;
  message: string;
  jobId?: string;
}
export type WorldAuthoringKind =
  | 'recipe'
  | 'world-opening'
  | 'attribute'
  | 'attribute-bindings'
  | 'attribute-values'
  | 'status-effect-policy'
  | 'cognition-policy'
  | 'action';
export interface WorldAgentQuestionAnswer {
  id: string;
  answers: Array<
    | { questionId: string; kind: 'options'; optionIds: string[] }
    | { questionId: string; kind: 'text'; text: string }
  >;
  continuationId?: string;
  supersedes?: string;
}
export interface WorldAgentQuestion {
  id: string;
  digest: string;
  turnId: string;
  questions: Array<{
    id: string;
    text: string;
    header: string;
    multiple: boolean;
    custom: boolean;
    options: Array<{ id: string; label: string; description: string }>;
  }>;
  state: 'open' | 'answered' | 'abandoned' | 'invalidated';
  answer?: WorldAgentQuestionAnswer;
}
export interface WorldAgentQuestionStatus {
  question: WorldAgentQuestion;
  canAnswer: boolean;
  /** A saved answer may continue now; an open question may offer Send and continue. */
  canContinue: boolean;
  reason: string;
}
export interface WorldAgentTurnView {
  id: string;
  revision?: number;
  sequence: number;
  text: string | null;
  createdAt: number | null;
  cancelRequested: boolean;
  response: WorldAgentReply | null;
  question?: WorldAgentQuestion;
  progress?: WorldAgentProgress;
}
/** Sanitized owner-only preview. Provider identities/cursors and private carry are never projected. */
export interface WorldAgentProgress {
  revision: number;
  stage: 'investigating' | 'replying';
  text: string;
  completeness: 'live' | 'partial' | 'complete' | 'incomplete';
  omittedBytes?: number;
}
export interface WorldAgentProgressSnapshot {
  sessionId: string;
  /** Changes with committed session work/status, never with a text-only batch. */
  statusRevision?: string;
  /** Complete admitted workspace change signal, including work outside the first page. */
  workRevision?: string;
  turn: WorldAgentTurnView | null;
  activeTurn: string | null;
  questionTurn: string | null;
  recovering: boolean;
  available: boolean;
}
export interface WorldAgentTurnCursor {
  sequence: number;
  id: string;
}
export interface WorldAgentValidation {
  ok: boolean;
  code: string;
  message: string;
  coverage: string;
  semantics: string;
  activationRequiresResume: boolean;
  structuralErrors: string[];
}
export interface WorldAgentDraftView {
  id: string;
  revision: number;
  kind: WorldAuthoringKind;
  intent: string;
  digest: string;
  title?: string;
  summary?: string;
  state?: WorldAgentPreparation['next'];
  preparation?: WorldAgentPreparation;
}
export interface WorldAgentRequirement {
  id: string;
  source: {
    turnId: string;
    text: string;
    answerId?: string;
    questionTurnId?: string;
    questionId?: string;
    question?: string;
  };
  strength: 'request' | 'hard' | 'preference';
  finding: string;
  status: 'human-review' | 'satisfied' | 'unsupported' | 'superseded';
  supersededBy?: string;
}
export interface WorldAgentCandidateGraph {
  snapshot: string;
  candidate: RelationshipRef;
  nodes: RelationshipNode[];
  edges: RelationshipEdge[];
  unresolved: { field: string; message: string }[];
  coverage: {
    projection: 'complete' | 'incomplete';
    scope: string;
    broaderInteractions: 'not-evaluated';
  };
  work: { examined: number; records: number };
}
export interface WorldAgentPreparation {
  version: 1;
  candidateDigest: string;
  graph: WorldAgentCandidateGraph;
  requirements: WorldAgentRequirement[];
  checks: {
    id: string;
    validatorVersion: string;
    requires: string[];
    status: 'passed' | 'failed' | 'pending';
    finding: string;
  }[];
  coverage: 'complete-for-native-admission' | 'pending' | 'blocked';
  presentation: {
    status: 'no-new-asset' | 'existing-fallback-adequate' | 'required-representation-missing';
    description: string;
    optionalArt: 'not-requested';
  };
  /** Source/validator/authority pins make this evidence attributable, never an approval. */
  evidence: { version: string; dependencies: string; generation: string };
  next: 'ready_for_review' | 'needs_revision' | 'pending_analysis' | 'blocked';
}
export interface WorldAgentPlanView {
  id: string;
  draftId: string;
  revision: number;
  digest: string;
  impact: { token: string; affected: number };
  validation: WorldAgentValidation;
  preparation?: WorldAgentPreparation;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  result?: { ok: boolean; code: string; message: string };
  creation?: WorldCreationPlanView;
}
export interface WorldAgentSessionView {
  sessionId: string;
  purpose?: 'conversation' | 'invention' | 'creation';
  workRevision?: string;
  available: boolean;
  closed: boolean;
  activeTurn: string | null;
  /** Reachable human-workspace refusal reason; native writes enforce the same rule. */
  workspaceMutationReason: string | null;
  question?: WorldAgentQuestionStatus;
  budget: {
    limitUsd: number;
    spentUsd: number;
    reservedUsd: number;
    uncertainUsd: number;
    availableUsd: number;
    note: string;
  };
  drafts: WorldAgentDraftView[];
  plans: WorldAgentPlanView[];
  nextDraft: string | null;
  nextPlan: string | null;
}
export interface WorldAgentReviewView {
  plan: WorldAgentPlanView;
  draft: WorldAgentDraftView & {
    payload: unknown;
    actorId: string;
    policyRevision: number;
    base: unknown;
  };
  openingPreview?: WorldCreationPreview;
}

export interface WorldAgentAvailability {
  configured: boolean;
  reason: string;
  sessionAllowanceUsd: number;
}
export interface WorldAgentSessionSummary {
  sessionId: string;
  title: string;
  createdAt: number;
  closed: boolean;
  available: boolean;
}
export interface WorldAgentSessionCursor {
  createdAt: number;
  id: string;
}
export interface WorldAgentSessionStatus {
  data: WorldAgentSessionView | null;
  availability: WorldAgentAvailability;
}

/** Authenticated human workspace operations use no model context handle or paid run. */
export interface WorldAgentWorkResult<T> {
  ok: boolean;
  status:
    | 'ok'
    | 'invalid'
    | 'stale'
    | 'unavailable'
    | 'capacity'
    | 'forbidden'
    | 'needs_approval'
    | 'blocked'
    | 'ready_for_review'
    | 'needs_revision'
    | 'pending_analysis';
  message?: string;
  data?: T;
  cost: 'no-paid-work';
}
export interface WorldAgentDraftRevisionView extends WorldAgentDraftView {
  title: string;
  summary: string;
}
export interface WorldAgentDraftFact {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
}
export interface WorldAgentDraftEditorView {
  family: { id: string; version: number };
  fields: Array<{
    path: string[];
    label: string;
    kind: 'text' | 'number' | 'choice' | 'boolean';
    unit?: string;
    minimum?: number;
    maximum?: number;
    step?: number;
    choices?: Array<{ value: string; label: string }>;
  }>;
  facts: WorldAgentDraftFact[];
}
export interface WorldAgentExactDraftView extends WorldAgentDraftRevisionView {
  payload: unknown;
  latestRevision: number;
  validation: WorldAgentValidation;
  plans: WorldAgentPlanView[];
  nextPlan: string | null;
  editor?: WorldAgentDraftEditorView;
  openingPreview?: WorldCreationPreview;
}
export interface WorldAgentDraftHistoryView {
  draftId: string;
  latestRevision: number;
  revisions: WorldAgentDraftRevisionView[];
  next: number | null;
}
export interface WorldAgentDraftComparisonView {
  before: WorldAgentExactDraftView;
  after: WorldAgentExactDraftView;
  changed: Array<{
    field: string;
    path?: string[];
    beforePresent: boolean;
    afterPresent: boolean;
    before?: unknown;
    after?: unknown;
  }>;
  coverage: 'structural-only';
}
export interface WorldAgentDraftPreviewView {
  revision: number;
  candidateDigest: string;
  validation: WorldAgentValidation;
  preparation: WorldAgentPreparation;
  facts?: WorldAgentDraftFact[];
  openingPreview?: WorldCreationPreview;
}

/** A permitted target projection contains no intake address, credential or database configuration. */
export interface WorldCreationTargetView {
  id: string;
  generation: number | null;
  profileDigest: string | null;
  label: string;
  entryUrl: string;
  operatingProfile: string;
  controlAccountId: string | null;
  controlCapabilities?: string[];
  operatingSettings?: Array<{ label: string; value: string | number | boolean }>;
  status: 'unchecked' | 'available' | 'occupied' | 'unavailable' | 'forbidden';
  reason?: string;
}

/** Inspection of authored initial circumstances; these entries are never live command targets. */
export interface WorldCreationPreview {
  worldId: string;
  title: string;
  activity: string;
  payoff: string;
  harsh: boolean;
  entries: Array<{
    id: string;
    label: string;
    kind: string;
    position: { x: number; y: number; z: number };
    description: string;
    quantity?: number;
  }>;
  findings: Array<{
    id: string;
    status: 'passed' | 'failed' | 'pending';
    message: string;
  }>;
}

/** Human approval binds one opening, configured destination and durable Start identity. */
export interface WorldCreationPlanView {
  target: WorldCreationTargetView & {
    generation: number;
    profileDigest: string;
    controlAccountId: string;
    status: 'available';
  };
  operationId: string;
  candidateDigest: string;
  worldDigest: string;
  worldId: string;
  expiresAt: number;
}

export interface WorldCreationOperationView {
  operationId: string;
  planId: string;
  targetId: string;
  status:
    | 'prepared'
    | 'dispatching'
    | 'uncertain'
    | 'created'
    | 'host-unavailable'
    | 'ready'
    | 'refused'
    | 'cancelled';
  message: string;
  worldId?: string;
  entryUrl?: string;
  committedAt?: number;
}

export interface WorldCreationOpeningChoice {
  id: string;
  label: string;
  description: string;
}

export interface WorldCreationHostStatus {
  status: 'awaiting-creation' | 'host-unavailable';
  message: string;
  worldId?: string;
}
