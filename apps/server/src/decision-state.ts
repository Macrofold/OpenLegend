import { z } from 'zod';
import type { AiReceipt } from '@open-legend/ai';
import { digest } from './content-digest.js';
import type { CognitionLevel, LedgerCategory, LevelLimits } from './cognition-budget.js';

/** Operating policy, not fictional laws. docs/limits/ai-execution.md#decision-escalation-limits */
export const DECISION_LIMITS = {
  immediateMs: 1000,
  lifetimeMs: 30_000,
  queueMs: 2000,
  queued: 16,
  descriptorBytes: 8192,
  inputBytes: 100_000,
  schemaBytes: 65_536,
  outputTokens: 8192,
} as const;
export const DECISION_MODEL = 'gpt-6-luna';
export const DECISION_EFFORT = 'low';
export const DECISION_REASONS = [
  'semantic-escalation',
  'abstained',
  'native-rejection',
  'invalid-output',
  'route-unavailable',
] as const;
export type DecisionReason = (typeof DECISION_REASONS)[number];
export const decisionEscalationConfigSchema = z
  .object({
    mode: z.enum(['off', 'observe', 'apply']),
    origins: z.array(z.string().min(1).max(128)).max(16),
    reasons: z.array(z.enum(DECISION_REASONS)).max(DECISION_REASONS.length),
  })
  .strict();
export type DecisionEscalationConfig = z.infer<typeof decisionEscalationConfigSchema>;
export const defaultDecisionEscalation = (origin: string): DecisionEscalationConfig => ({
  mode: 'apply',
  origins: [origin],
  reasons: [...DECISION_REASONS],
});

export type DecisionTaskKind =
  | 'choice'
  | 'rating'
  | 'likelihood'
  | 'relevance'
  | 'response'
  | 'appraisal';
export type ExecutionClass = 'primary' | 'background';
/** Expected loss of a publication claim rolls back effects without declaring storage broken. */
export class DecisionClaimLost extends Error {
  constructor() {
    super('The decision was superseded before publication.');
  }
}
/** Positive local proof used only before durable dispatch intent is claimed. */
export function undispatchedReceipt(
  id: string,
  provider: AiReceipt['provider'],
  now: number,
): AiReceipt {
  const at = new Date(now).toISOString();
  return {
    requestId: id,
    provider,
    requestedModel: 'not-dispatched',
    model: 'not-dispatched',
    modelVersionStatus: 'unavailable',
    contextDigest: digest({ id }),
    startedAt: at,
    completedAt: at,
    latencyMs: 0,
    dispatched: false,
    completionUncertain: false,
    estimatedCostUsd: 0,
  };
}

export interface DecisionAttemptLink {
  rootJobId: string;
  category: LedgerCategory;
  level?: CognitionLevel;
  stage: string;
  executionClass: ExecutionClass;
}
export interface LinkedDecisionAttempt extends DecisionAttemptLink {
  attemptId: string;
  provider: 'jev' | 'openai' | 'macrofold';
  reservedUsd: number;
  receipt?: import('@open-legend/ai').AiReceipt;
}
export type DecisionEnd =
  | 'expired'
  | 'stale'
  | 'cancelled'
  | 'paused'
  | 'disabled'
  | 'restart'
  | 'capacity'
  | 'budget-exhausted'
  | 'preparation-failed'
  | 'invalid-output'
  | 'abstained'
  | 'native-rejection'
  | 'provider-failed'
  | 'uncertain'
  | 'diagnostic-only'
  | 'unsupported'
  | 'context-exceeded'
  | 'resource-unavailable'
  | 'missing-pricing';
/** Safe service explanations may appear beside the player's unanswered message.
 * Character speech is emitted only by the native response owner, never by these labels. */
export function decisionEndMessage(reason: DecisionEnd): string {
  const explanations: Record<DecisionEnd, string> = {
    expired: 'The answer was not ready in time.',
    stale: 'The character’s situation changed before the answer could be used.',
    cancelled: 'The reply was cancelled.',
    paused: 'The reply stopped when the world paused.',
    disabled: 'Additional AI reasoning is disabled.',
    restart: 'The reply stopped when the server restarted.',
    capacity: 'The reply could not start while other AI work was running.',
    'budget-exhausted': 'The available AI spending allowance is used up.',
    'preparation-failed': 'The necessary information for this reply was unavailable.',
    'invalid-output': 'The AI answer could not be used.',
    abstained: 'The character could not settle on a supported answer.',
    'native-rejection': 'The proposed response could not be carried out.',
    'provider-failed': 'The AI service could not complete the reply.',
    uncertain: 'The AI request may still be running; no replacement was sent.',
    'diagnostic-only': 'Additional reasoning was recorded for private inspection only.',
    unsupported: 'This kind of reply is not available.',
    'context-exceeded': 'The necessary information was too large for this AI request.',
    'resource-unavailable': 'AI service capacity is unavailable.',
    'missing-pricing': 'AI pricing must be configured before this reply can be completed.',
  };
  return explanations[reason];
}
export interface DecisionGroup {
  kind: DecisionTaskKind;
  state: 'open' | 'resolved' | 'ended-unresolved';
  attemptId: string;
  receiptId?: string;
}
export interface HigherDecision {
  id: string;
  reason: DecisionReason;
  eligibleAt: number;
  dispatchBy: number;
  publishBy: number;
  dispatchByMonotonic: number;
  publishByMonotonic: number;
  policyDigest: string;
  state: 'queued' | 'preparing' | 'reserved' | 'dispatched' | 'finished' | 'ended';
  end?: DecisionEnd;
  attemptId?: string;
  startedAt?: number;
  reservedAt?: number;
  dispatchedAt?: number;
  returnedAt?: number;
  usableAt?: number;
  accountedAt?: number;
  prepared?: {
    inputDigest: string;
    schemaDigest: string;
    bindingDigest: string;
    sourceTime: number;
  };
}
/** Operational record: never rewound by a gameplay save, never supplied to a model. */
export interface DecisionState {
  revision: number;
  worldId: string;
  timelineId: string;
  generation: string;
  actorId: string;
  physicalLife: number;
  cause: { kind: 'event' | 'intent'; id: string };
  originalWatermark: number;
  urgency: number;
  cursor?: { key: string; value: unknown };
  acceptedAt: number;
  fastPublishBy: number;
  usefulUntilWall: number;
  /** Valid only in generation; restart ends the root rather than comparing another process clock. */
  fastPublishByMonotonic: number;
  usefulUntilMonotonic: number;
  usefulUntilSim?: number;
  phase: 'immediate' | 'waiting-primary' | 'higher' | 'closed';
  immediate: {
    kind: 'pending' | 'acted' | 'continued' | 'deferred';
    at?: number;
    receiptId?: string;
  };
  groups: Record<string, DecisionGroup>;
  higherEntitlement: 'available' | 'used-direct' | 'claimed-child';
  higher?: HigherDecision;
  primaryAwait?: { attemptId: string };
  refreshUsed: boolean;
  origin: string;
  policyDigest: string;
  limits: Record<CognitionLevel, LevelLimits>;
  end?: DecisionEnd;
}
/** One original opportunity; handing off never manufactures new clocks or allowances. */
export function decisionRoot(
  input: Pick<
    DecisionState,
    | 'worldId'
    | 'timelineId'
    | 'generation'
    | 'actorId'
    | 'physicalLife'
    | 'cause'
    | 'originalWatermark'
    | 'urgency'
    | 'acceptedAt'
    | 'origin'
    | 'policyDigest'
    | 'limits'
  > & {
    jobId: string;
    groups: Record<string, DecisionTaskKind>;
    cursor?: DecisionState['cursor'];
    usefulness?: 'immediate-only' | 'useful-later';
    usefulUntilSim?: number;
  },
): DecisionState {
  const { jobId, groups, usefulness = 'useful-later', ...scope } = input;
  const monotonic = performance.now();
  return {
    ...scope,
    revision: 0,
    fastPublishBy: input.acceptedAt + DECISION_LIMITS.immediateMs,
    fastPublishByMonotonic: monotonic + DECISION_LIMITS.immediateMs,
    usefulUntilMonotonic:
      monotonic +
      DECISION_LIMITS.immediateMs +
      (usefulness === 'useful-later' ? DECISION_LIMITS.lifetimeMs : 0),
    usefulUntilWall:
      input.acceptedAt +
      DECISION_LIMITS.immediateMs +
      (usefulness === 'useful-later' ? DECISION_LIMITS.lifetimeMs : 0),
    phase: 'immediate',
    immediate: { kind: 'pending' },
    groups: Object.fromEntries(
      Object.entries(groups).map(([id, kind]) => [id, { kind, state: 'open', attemptId: jobId }]),
    ),
    higherEntitlement: 'available',
    refreshUsed: false,
  };
}
export function childLive(state: DecisionState): boolean {
  return !!state.higher && !['finished', 'ended'].includes(state.higher.state);
}
export function endDecision(state: DecisionState, reason: DecisionEnd, at: number): DecisionState {
  return {
    ...state,
    phase: 'closed',
    end: reason,
    immediate: state.immediate.kind === 'pending' ? { kind: 'deferred', at } : state.immediate,
    groups: Object.fromEntries(
      Object.entries(state.groups).map(([id, group]) => [
        id,
        group.state === 'open' ? { ...group, state: 'ended-unresolved' as const } : group,
      ]),
    ),
    ...(state.higher && childLive(state)
      ? { higher: { ...state.higher, state: 'ended', end: reason } }
      : {}),
  };
}

const integer = z.number().int().nonnegative().safe();
const identity = z.string().min(1).max(256);
const end = z.enum([
  'expired',
  'stale',
  'cancelled',
  'paused',
  'disabled',
  'restart',
  'capacity',
  'budget-exhausted',
  'preparation-failed',
  'invalid-output',
  'abstained',
  'native-rejection',
  'provider-failed',
  'uncertain',
  'diagnostic-only',
  'unsupported',
  'context-exceeded',
  'resource-unavailable',
  'missing-pricing',
]);
const level = z
  .object({
    level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    executor: z.enum(['jev', 'mini-llm', 'complex-llm', 'harness']),
    inputSize: integer,
    schemaBytes: integer,
    outputTokens: integer,
    visibleOutputBytes: integer,
    reasoning: z
      .object({
        effort: z.enum(['none', 'low', 'medium', 'high', 'xhigh']),
        allowanceTokens: integer,
      })
      .strict(),
    toolRounds: integer,
    requestsPerDecision: integer,
    decisionUsd: z.number().finite().nonnegative(),
  })
  .strict();
const stateSchema = z
  .object({
    revision: integer,
    worldId: identity,
    timelineId: identity,
    generation: identity,
    actorId: identity,
    physicalLife: integer,
    cause: z.object({ kind: z.enum(['event', 'intent']), id: identity }).strict(),
    originalWatermark: integer,
    urgency: z.number().finite(),
    cursor: z
      .object({
        key: identity,
        value: z
          .object({
            fingerprint: identity,
            at: integer,
            watermark: integer,
            attemptedOpportunity: z.string().max(2000).optional(),
            skippedOpportunity: z.string().max(2000).optional(),
            reviewKey: z.string().max(2000).optional(),
          })
          .strict(),
      })
      .strict()
      .optional(),
    acceptedAt: integer,
    fastPublishBy: integer,
    usefulUntilWall: integer,
    fastPublishByMonotonic: z.number().finite().nonnegative(),
    usefulUntilMonotonic: z.number().finite().nonnegative(),
    usefulUntilSim: z.number().finite().nonnegative().optional(),
    phase: z.enum(['immediate', 'waiting-primary', 'higher', 'closed']),
    immediate: z
      .object({
        kind: z.enum(['pending', 'acted', 'continued', 'deferred']),
        at: integer.optional(),
        receiptId: identity.optional(),
      })
      .strict(),
    groups: z.record(
      z.string().regex(/^q\d+$/),
      z
        .object({
          kind: z.enum(['choice', 'rating', 'likelihood', 'relevance', 'response', 'appraisal']),
          state: z.enum(['open', 'resolved', 'ended-unresolved']),
          attemptId: identity,
          receiptId: identity.optional(),
        })
        .strict(),
    ),
    higherEntitlement: z.enum(['available', 'used-direct', 'claimed-child']),
    higher: z
      .object({
        id: identity,
        reason: z.enum(DECISION_REASONS),
        eligibleAt: integer,
        dispatchBy: integer,
        publishBy: integer,
        dispatchByMonotonic: z.number().finite().nonnegative(),
        publishByMonotonic: z.number().finite().nonnegative(),
        policyDigest: identity,
        state: z.enum(['queued', 'preparing', 'reserved', 'dispatched', 'finished', 'ended']),
        end: end.optional(),
        attemptId: identity.optional(),
        startedAt: integer.optional(),
        reservedAt: integer.optional(),
        dispatchedAt: integer.optional(),
        returnedAt: integer.optional(),
        usableAt: integer.optional(),
        accountedAt: integer.optional(),
        prepared: z
          .object({
            inputDigest: identity,
            schemaDigest: identity,
            bindingDigest: identity,
            sourceTime: z.number().finite().nonnegative(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    primaryAwait: z.object({ attemptId: identity }).strict().optional(),
    refreshUsed: z.boolean(),
    origin: identity,
    policyDigest: identity,
    limits: z.object({ 1: level, 2: level, 3: level, 4: level, 5: level }).strict(),
    end: end.optional(),
  })
  .strict()
  .superRefine((state, context) => {
    if (
      state.fastPublishBy <= state.acceptedAt ||
      state.usefulUntilWall < state.fastPublishBy ||
      state.fastPublishBy !== state.acceptedAt + DECISION_LIMITS.immediateMs ||
      state.usefulUntilWall > state.fastPublishBy + DECISION_LIMITS.lifetimeMs ||
      state.usefulUntilMonotonic < state.fastPublishByMonotonic ||
      state.usefulUntilMonotonic > state.fastPublishByMonotonic + DECISION_LIMITS.lifetimeMs ||
      !Object.keys(state.groups).length ||
      Object.keys(state.groups).length > 64 ||
      Object.entries(state.limits).some(([key, value]) => Number(key) !== value.level) ||
      (state.higher &&
        (state.higherEntitlement !== 'claimed-child' ||
          state.higher.dispatchBy > state.higher.publishBy ||
          state.higher.publishBy > state.usefulUntilWall ||
          state.higher.dispatchByMonotonic > state.higher.publishByMonotonic ||
          state.higher.publishByMonotonic > state.usefulUntilMonotonic ||
          state.higher.dispatchBy < state.higher.eligibleAt ||
          state.higher.eligibleAt < state.acceptedAt ||
          state.higher.policyDigest !== state.policyDigest))
    )
      context.addIssue({
        code: 'custom',
        message: 'Invalid current decision ownership or deadlines.',
      });
  });

/** Serialized operational data can authorize spending; reject unusable current records at read. */
export function readDecisionState(value: unknown): DecisionState {
  return stateSchema.parse(value);
}
