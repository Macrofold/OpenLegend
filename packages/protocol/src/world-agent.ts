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
  sequence: number;
  text: string | null;
  createdAt: number | null;
  cancelRequested: boolean;
  response: WorldAgentReply | null;
  question?: WorldAgentQuestion;
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
}
export interface WorldAgentSessionView {
  sessionId: string;
  available: boolean;
  closed: boolean;
  activeTurn: string | null;
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
