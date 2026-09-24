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
  | 'status-effect-policy'
  | 'cognition-policy'
  | 'action';
export interface WorldAgentTurnView {
  id: string;
  sequence: number;
  text: string | null;
  createdAt: number | null;
  cancelRequested: boolean;
  response: WorldAgentReply | null;
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
}
export interface WorldAgentPlanView {
  id: string;
  draftId: string;
  revision: number;
  digest: string;
  impact: { token: string; affected: number };
  validation: WorldAgentValidation;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  result?: { ok: boolean; code: string; message: string };
}
export interface WorldAgentSessionView {
  sessionId: string;
  available: boolean;
  closed: boolean;
  activeTurn: string | null;
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
