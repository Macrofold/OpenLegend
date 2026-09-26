import { z } from 'zod';

const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const revision = z.number().int().min(1).max(1_000_000);
const draft = { draftId: id, revision };
const mutation = { operationId: id };
const payload = z
  .string()
  .min(2)
  .max(24000)
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 24000, 'Candidate exceeds the UTF-8 byte limit.');
export const authoringKind = z.enum([
  'recipe',
  'attribute',
  'status-effect-policy',
  'cognition-policy',
  'action',
]);
export type AuthoringKind = z.infer<typeof authoringKind>;

// One catalogue owns validation for local tools and MCP. No approval-grant or budget-increase tool.
export const WORLD_AUTHORING_TOOLS = {
  ol_session: {
    description:
      'Read the current authorized authoring session, spending and reachable drafts/reviews. Does not create or refill a budget.',
    schema: z.object({ afterDraft: id.optional(), afterPlan: id.optional() }).strict(),
  },
  ol_draft_create: {
    description:
      'Save a supplied candidate without installing it. Native recipes use the controlled inventor; other supported kinds use owner authority. Inspect the current kind schema and base first.',
    schema: z
      .object({
        ...mutation,
        kind: authoringKind,
        intent: z.string().min(1).max(4000),
        payloadJson: payload,
        baseRecipeId: id.optional(),
      })
      .strict(),
  },
  ol_draft_read: {
    description:
      'Read exact saved candidate bytes, base pins, original intent and validation. A draft is not installed.',
    schema: z.object(draft).strict(),
  },
  ol_draft_update: {
    description:
      'Submit a full revised payload for the same kind after reading the draft. Creates an immutable revision and retires old unexecuted reviews. Preserve the player intent; change it only when requested.',
    schema: z
      .object({
        ...mutation,
        draftId: id,
        expectedRevision: revision,
        payloadJson: payload,
        intent: z.string().min(1).max(4000).optional(),
      })
      .strict(),
  },
  ol_compare: {
    description:
      'Compare two exact saved revisions, including full changed top-level values. This is a structural diff, not proof of semantic fidelity.',
    schema: z.object({ draftId: id, fromRevision: revision, toRevision: revision }).strict(),
  },
  ol_validate: {
    description:
      'Run the owning native validator on the selected candidate without committing effects or making paid calls. Reports actual finite coverage, blockers and unsupported behavior.',
    schema: z.object(draft).strict(),
  },
  ol_change_prepare: {
    description:
      'Validate and retain an exact change plan for human review. Does not install. Changed dependencies or selected revisions require a new review.',
    schema: z.object({ ...mutation, ...draft }).strict(),
  },
  ol_approval_request: {
    description:
      'Show an existing exact change plan in the human review panel. The agent cannot approve it. The human must use the application Approve control.',
    schema: z.object({ planId: id }).strict(),
  },
  ol_change_apply: {
    description:
      'Apply an approved, current exact plan through native admission. Rechecks authority, dependencies and current state. Retries return the committed receipt; no extra provider cost.',
    schema: z.object({ planId: id }).strict(),
  },
} as const;
export type WorldAuthoringToolName = keyof typeof WORLD_AUTHORING_TOOLS;
export type WorldAuthoringCall = {
  [Name in WorldAuthoringToolName]: {
    name: Name;
    arguments: z.infer<(typeof WORLD_AUTHORING_TOOLS)[Name]['schema']>;
  };
}[WorldAuthoringToolName];

/** Keep each tool name correlated with its validated arguments in both transports. */
export function parseWorldAuthoringCall(name: string, raw: unknown): WorldAuthoringCall | null {
  if (!Object.hasOwn(WORLD_AUTHORING_TOOLS, name)) return null;
  const parsed = WORLD_AUTHORING_TOOLS[name as WorldAuthoringToolName].schema.safeParse(raw);
  // The indexed schema has validated this exact name. No unchecked payload reaches dispatch.
  return parsed.success ? ({ name, arguments: parsed.data } as WorldAuthoringCall) : null;
}

export const sessionRequest = z.object({ sessionId: id, worldId: id }).strict();
export const sessionOpenRequest = sessionRequest.extend({
  budgetUsd: z.number().finite().min(0).max(5).optional(),
});
export const sessionDecisionRequest = sessionRequest.extend({
  planId: id,
  decision: z.enum(['approve', 'reject']),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
});
export const authoringToolRequest = z
  .object({
    contextHandle: z.string().min(32).max(256),
    name: z.string().max(100),
    arguments: z.unknown(),
  })
  .strict();

export const sessionTurnsRequest = sessionRequest
  .extend({
    before: z
      .object({ sequence: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), id })
      .strict()
      .optional(),
  })
  .strict();
export const sessionTurnRequest = sessionRequest.extend({ requestId: id }).strict();

export const sessionStatusRequest = sessionRequest
  .extend({
    afterDraft: id.optional(),
    afterPlan: id.optional(),
  })
  .strict();
export const sessionListRequest = z
  .object({
    worldId: id,
    before: z
      .object({ createdAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), id })
      .strict()
      .optional(),
  })
  .strict();

/** Expected owner-facing request failure; infrastructure exceptions stay private. */
export class AuthoringRequestError extends Error {}
