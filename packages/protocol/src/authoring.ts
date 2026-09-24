/** Public authoring records. Credentials, grants and native execution state stay server-side. */
export type AuthoringKind = 'recipe' | 'attribute' | 'action';
export interface AuthoringDraftView {
  id: string;
  revision: number;
  kind: AuthoringKind;
  intent: string;
  candidate: unknown;
  base?: { kind: 'recipe'; id: string; version: string };
}
export interface AuthoringPlanView {
  id: string;
  draftId: string;
  draftRevision: number;
  digest: string;
  kind: AuthoringKind;
  intent: string;
  candidate: unknown;
  base?: { kind: 'recipe'; id: string; version: string };
  status: 'pending' | 'approved' | 'applying' | 'applied' | 'rejected';
  preview: { ok: boolean; code: string; message: string };
  receipt?: { ok: boolean; code: string; message: string; recipeId?: string };
}
export interface AuthoringSessionView {
  id: string;
  mode: 'player' | 'creator';
  closed: boolean;
  budget: {
    limitUsd: number;
    spentUsd: number;
    reservedUsd: number;
    uncertainUsd: number;
    availableUsd: number;
  };
  drafts: AuthoringDraftView[];
  plans: AuthoringPlanView[];
}
