import { z } from 'zod';
import { declarationSchema } from './ai-schemas.js';
import {
  authoringCandidateSchemas,
  statusPolicySchema,
  typedAuthoringPayload,
} from './world-authoring-schemas.js';

const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
const revision = z.number().int().min(1).max(1_000_000);
const draft = { draftId: id, revision };
const mutation = {
  operationId: id.describe(
    'Reuse this ID only for an identical replay. Any changed body, including a new packetRef, needs a new ID.',
  ),
};
const packetRef = id.describe('Use the latest returned packetRef.');
const requirementAnnotations = z
  .array(
    z
      .object({
        sourceTurnId: id,
        quote: z.string().min(1).max(2000),
        strength: z.enum(['hard', 'preference']),
        status: z.enum(['human-review', 'unsupported']),
        finding: z.string().min(1).max(1000),
        supersedes: id
          .describe(
            'Prior finding ID replaced by an explicit change in the current human request. Original wording remains in review.',
          )
          .optional(),
      })
      .strict(),
  )
  .max(16)
  .optional();
const payload = z
  .string()
  .min(2)
  .max(24000)
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 24000, 'Candidate exceeds the UTF-8 byte limit.');
export const authoringKind = z.enum([
  'recipe',
  'attribute',
  'attribute-bindings',
  'attribute-values',
  'status-effect-policy',
  'cognition-policy',
  'action',
]);
export type AuthoringKind = z.infer<typeof authoringKind>;

export const AUTHORING_SUBMIT_TOOLS = {
  'status-effect-policy': 'ol_status_policy_submit',
  'cognition-policy': 'ol_cognition_policy_submit',
  attribute: 'ol_attribute_submit',
  'attribute-bindings': 'ol_attribute_bindings_submit',
  'attribute-values': 'ol_attribute_values_submit',
  action: 'ol_action_submit',
} as const;

/** Bound recursive values before the native schema walks them, including JSON text input. */
function boundedContainers(raw: unknown) {
  const pending = [{ value: raw, depth: 0 }];
  while (pending.length) {
    const { value, depth } = pending.pop()!;
    if (!value || typeof value !== 'object') continue;
    if (depth > 64) return false;
    for (const child of Object.values(value)) pending.push({ value: child, depth: depth + 1 });
  }
  return true;
}
// Recursive JSON Schema is not portable across model providers. Transport text retains
// the complete native expression language; this validator, not the model, admits it.
const statusPolicyText = payload
  .describe(
    'The complete status policy as JSON text. Preserve unchanged fields exactly. The native status-policy validator still checks every field and condition. See the supplied policy example and field guide.',
  )
  .refine((text) => {
    try {
      const value: unknown = JSON.parse(text);
      return boundedContainers(value) && statusPolicySchema.safeParse(value).success;
    } catch {
      return false;
    }
  }, 'Expected bounded JSON text containing a valid native status policy.');

function selectedSubmit<K extends keyof typeof authoringCandidateSchemas>(kind: K) {
  return {
    description:
      `Save a ${kind} candidate for exact human review with native checks and dependencies. ` +
      (kind.endsWith('-policy')
        ? 'Whole policies replace the complete policy; omitted definitions are removals. '
        : '') +
      'No approval or live effect. Finish on ready_for_review. Reuse the same operationId and body to recover a lost response.',
    schema: z
      .object({
        ...mutation,
        packetRef,
        proposal: z
          .object({
            kind: z.literal(kind),
            candidate:
              kind === 'status-effect-policy' ? statusPolicyText : authoringCandidateSchemas[kind],
          })
          .strict(),
        edit: z.object({ draftId: id, expectedRevision: revision }).strict().optional(),
        requirements: requirementAnnotations,
      })
      .strict(),
  };
}

// One catalogue owns validation for local tools and MCP. No approval-grant or budget-increase tool.
export const WORLD_AUTHORING_TOOLS = {
  [AUTHORING_SUBMIT_TOOLS['status-effect-policy']]: selectedSubmit('status-effect-policy'),
  [AUTHORING_SUBMIT_TOOLS['cognition-policy']]: selectedSubmit('cognition-policy'),
  [AUTHORING_SUBMIT_TOOLS.attribute]: selectedSubmit('attribute'),
  [AUTHORING_SUBMIT_TOOLS['attribute-bindings']]: selectedSubmit('attribute-bindings'),
  [AUTHORING_SUBMIT_TOOLS['attribute-values']]: selectedSubmit('attribute-values'),
  [AUTHORING_SUBMIT_TOOLS.action]: selectedSubmit('action'),
  ol_authoring_submit: {
    description:
      'Save a typed candidate through the selected native kind, retain requirements/checks/dependencies, and prepare exact human review if ready. Whole policies replace the complete selected policy; omitted definitions are removals. No automatic approval or live effect. Finish on ready_for_review.',
    schema: z
      .object({
        ...mutation,
        packetRef,
        proposal: typedAuthoringPayload,
        edit: z.object({ draftId: id, expectedRevision: revision }).strict().optional(),
        requirements: requirementAnnotations,
      })
      .strict(),
  },
  ol_recipe_submit: {
    description:
      'Save a complete recipe with native checks for human review. On ready_for_review, explain the tradeoff and finish; nothing is installed or crafted. For new recipes omit deriveFrom; never guess a base ID.',
    schema: z
      .object({
        ...mutation,
        packetRef,
        candidate: z.fromJSONSchema(declarationSchema),
        edit: z.object({ draftId: id, expectedRevision: revision }).strict().optional(),
        deriveFrom: z
          .object({ recipeId: id, version: z.string().min(1).max(100) })
          .strict()
          .optional(),
        requirements: requirementAnnotations,
      })
      .strict(),
  },
  ol_authoring_guide: {
    description:
      'Read missing selected-kind field meanings and native mechanics. The context usually already includes this guide; do not read it again unless needed. Guidance never grants a capability or approval.',
    schema: z.object({ kind: authoringKind }).strict(),
  },
  ol_request_capability: {
    description:
      'Select the supported profile for this request, then stop tools and explain the next stage in final text. Selection grants no approval, spending or broader scope. Do not request unsupported engine mechanics.',
    schema: z
      .object({ ...mutation, kind: authoringKind, reason: z.string().min(1).max(500) })
      .strict(),
  },
  ol_session: {
    description:
      'Read the current authorized authoring session, spending and reachable drafts/reviews. Does not create or refill a budget.',
    schema: z.object({ afterDraft: id.optional(), afterPlan: id.optional() }).strict(),
  },
  ol_draft_create: {
    description:
      'Save a supplied candidate without installing it. Native recipes use the controlled inventor; other supported kinds use owner authority. Inspect the current kind schema first. For a new recipe, omit baseRecipeId; supply it only to derive from an existing recipe you inspected.',
    schema: z
      .object({
        ...mutation,
        kind: authoringKind,
        intent: z.string().min(1).max(4000),
        payloadJson: payload,
        baseRecipeId: id
          .describe(
            'Optional existing recipe ID for a derived recipe. Omit for a new invention. Never use a mechanism, material, world or invented ID here.',
          )
          .optional(),
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
  try {
    if (Buffer.byteLength(JSON.stringify(raw) ?? '') > 28000) return null;
    // Bound container depth before recursive Zod parsing. Valid native conditions have
    // at most 12 predicate levels; 64 JSON containers leaves room for their wrappers.
    if (!boundedContainers(raw)) return null;
    const parsed = WORLD_AUTHORING_TOOLS[name as WorldAuthoringToolName].schema.safeParse(raw);
    // The indexed schema has validated this exact name. No unchecked payload reaches dispatch.
    return parsed.success ? ({ name, arguments: parsed.data } as WorldAuthoringCall) : null;
  } catch {
    return null;
  }
}

export const sessionRequest = z.object({ sessionId: id, worldId: id }).strict();
export const sessionOpenRequest = sessionRequest.extend({
  budgetUsd: z.number().finite().min(0).max(5).optional(),
  purpose: z.enum(['conversation', 'invention']).optional(),
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
export class AuthoringRequestError extends Error {
  constructor(
    message: string,
    readonly code: 'blocked' | 'stale' | 'unavailable' | 'capacity' | 'forbidden' = 'blocked',
  ) {
    super(message);
  }
}

export const sessionQuestionContinueRequest = sessionRequest
  .extend({ questionTurnId: id, answerId: id })
  .strict();
export const sessionQuestionAnswerRequest = sessionQuestionContinueRequest
  .extend({
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    answers: z.unknown(),
    supersedes: id.optional(),
    continueIfReady: z.boolean(),
  })
  .strict();
