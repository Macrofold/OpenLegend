import { entityGet, type Outcome, type WorldState } from '@open-legend/domain';
import {
  DECISION_LIMITS,
  DecisionClaimLost,
  decisionEndMessage,
  type DecisionState,
  type DecisionEnd,
} from './decision-state.js';
import type { JobRecord, GameRepository } from './store.js';
import type { DecisionAnswer } from './decision-task.js';
import type { WorldService } from './world-service.js';
import type { IntelligenceLog } from './intelligence-log.js';
import type { ApiResult } from '@open-legend/protocol';
import { decisionPolicyDigest } from './decision-task.js';
import { nativeProtectionReason } from './native-protection.js';

export interface DecisionPublication {
  rootJobId: string;
  attemptId: string;
  expectedRevision: number;
  receiptId: string;
  groups: Record<string, { operations: string[]; continued?: boolean }>;
  final: boolean;
  /** Why independent open groups end at this final publication, if no native
   * operation was refused (for example, an unresolved supplied choice). */
  unresolvedReason?: DecisionEnd;
  now: () => number;
  /** Observation only, set after the owning transaction acknowledges durable publication. */
  deliveredAt?: number;
  deliveredElapsedMs?: number;
  startedMonotonic?: number;
  closed?: boolean;
}
/** Existing buffered diagnostics retain actual save acknowledgements without another
 * authoritative write or pretending the pre-COMMIT timestamp was delivery. */
export function recordDecisionTiming(
  log: IntelligenceLog,
  job: Pick<JobRecord, 'id' | 'decision'>,
  phase: 'immediate' | 'final',
  at: number,
  elapsedMs?: number,
) {
  if (!job.decision) return Promise.resolve();
  const elapsed =
    elapsedMs ??
    Math.max(
      0,
      performance.now() - (job.decision.fastPublishByMonotonic - DECISION_LIMITS.immediateMs),
    );
  return log.withTrigger(job.id, () =>
    log.record(
      `${job.id}:delivered:${phase}`,
      'Decision delivery timing',
      { phase },
      { at, elapsedMs: elapsed },
    ),
  );
}
export function decisionClaimCurrent(
  job: JobRecord | undefined,
  claim: DecisionPublication,
  world: WorldState,
  timeline: string,
  generation: string,
  policyDigest: string,
): job is JobRecord & { decision: DecisionState } {
  const state = job?.decision;
  const actor = state && entityGet(world.entities, state.actorId)?.actor;
  if (
    !state ||
    state.revision !== claim.expectedRevision ||
    state.phase === 'closed' ||
    state.policyDigest !== policyDigest ||
    !actor?.alive ||
    actor.incapacitated ||
    actor.controller !== 'npc' ||
    actor.capabilities?.cognition === false ||
    (actor.physicalLife ?? 0) !== state.physicalLife ||
    nativeProtectionReason(world, state.actorId) ||
    state.worldId !== world.id ||
    state.timelineId !== timeline ||
    state.generation !== generation ||
    claim.now() >= (state.higher?.publishBy ?? state.usefulUntilWall) ||
    performance.now() >= (state.higher?.publishByMonotonic ?? state.usefulUntilMonotonic) ||
    (state.usefulUntilSim !== undefined && world.simTime >= state.usefulUntilSim)
  )
    return false;
  return (
    Object.keys(claim.groups).length > 0 &&
    Object.keys(claim.groups).every((key) => {
      const group = state.groups[key];
      return group?.state === 'open' && group.attemptId === claim.attemptId;
    })
  );
}
/** Called only from the world commit's operationalChange transaction. */
export async function finishDecisionPublication(
  store: GameRepository,
  claim: DecisionPublication,
  world: WorldState,
  admissionWorld: WorldState,
  timeline: string,
  generation: string,
  outcome: Outcome,
  currentPolicyDigest: () => string,
): Promise<void> {
  const written = await store.mutateDecision(claim.rootJobId, async (job) => {
    // The proposal may itself start sleep or otherwise change eligibility. Validate
    // its pre-effect admission snapshot, while reading receipts from the committed result.
    if (
      !decisionClaimCurrent(job, claim, admissionWorld, timeline, generation, currentPolicyDigest())
    )
      throw new DecisionClaimLost();
    const receipt = world.responseReceipts?.[claim.receiptId];
    const state = job.decision;
    let accepted = false;
    const groups = { ...state.groups };
    for (const [key, proposed] of Object.entries(claim.groups)) {
      const outcomes = proposed.operations.map((id) => receipt?.components[id]);
      const complete = outcomes.length ? outcomes.every((part) => part?.ok) : outcome.ok;
      const partial = outcomes.some((part) => part?.ok);
      accepted ||= complete || partial;
      groups[key] = {
        ...groups[key]!,
        state: complete ? 'resolved' : partial || claim.final ? 'ended-unresolved' : 'open',
        receiptId: claim.receiptId,
      };
    }
    if (claim.final)
      for (const group of Object.values(groups))
        if (group.state === 'open' && group.attemptId === claim.attemptId)
          group.state = 'ended-unresolved';
    const pending = Object.values(groups).some((group) => group.state === 'open');
    const resolved = Object.values(groups).every((group) => group.state === 'resolved');
    // Inspect only this bounded decision's exact receipts. A failed independent
    // component cannot erase speech already delivered or be relabeled abstention.
    const components = [
      ...new Set(Object.values(groups).flatMap((group) => group.receiptId ?? [])),
    ].flatMap((id) => Object.values(world.responseReceipts?.[id]?.components ?? {}));
    const partlyResolved =
      Object.values(groups).some((group) => group.state === 'resolved') ||
      components.some((part) => part.ok);
    const refusals = components.filter((part) => !part.ok);
    const unresolvedReason = refusals.length
      ? 'native-rejection'
      : (claim.unresolvedReason ?? 'native-rejection');
    const unresolvedGroups = Object.values(groups).filter(
      (group) => group.state === 'ended-unresolved',
    );
    const unresolvedMessage = refusals.length
      ? [...new Set(refusals.map((part) => part.message))].join(' ')
      : !outcome.ok
        ? outcome.message
        : unresolvedReason === 'abstained' &&
            unresolvedGroups.every((group) => group.kind === 'choice')
          ? unresolvedGroups.length === 1
            ? 'A separate choice remains unresolved.'
            : 'Other choices remain unresolved.'
          : decisionEndMessage(unresolvedReason);
    const completedMessage = components.some((part) => part.ok && part.code === 'spoken')
      ? 'Speech completed.'
      : 'Some parts of the response completed.';
    const now = claim.now();
    const immediate =
      state.immediate.kind !== 'pending'
        ? state.immediate
        : {
            kind:
              now < state.fastPublishBy &&
              performance.now() < state.fastPublishByMonotonic &&
              accepted
                ? Object.values(claim.groups).some((group) => group.continued)
                  ? ('continued' as const)
                  : ('acted' as const)
                : ('deferred' as const),
            at: now,
            ...(accepted ? { receiptId: claim.receiptId } : {}),
          };
    if (state.cursor) await store.consumeDecisionCursor(state.cursor);
    return {
      ...job,
      status: pending ? job.status : resolved ? 'completed' : 'failed',
      message: pending
        ? job.message
        : !resolved && partlyResolved
          ? `${completedMessage} ${unresolvedMessage}`
          : resolved || !outcome.ok
            ? outcome.message
            : decisionEndMessage(unresolvedReason),
      decision: {
        ...state,
        groups,
        immediate,
        phase: pending ? state.phase : 'closed',
        ...(state.higher && claim.final
          ? {
              higher: {
                ...state.higher,
                state: 'finished',
                ...(resolved ? {} : { end: unresolvedReason }),
              },
            }
          : {}),
        ...(!pending && !resolved ? { end: unresolvedReason } : {}),
      },
      ...(!pending ? { completedAt: now, totalLatencyMs: Math.max(0, now - job.createdAt) } : {}),
      result: {
        disposition: resolved ? 'resolved' : pending ? 'native-rejection' : 'partially-resolved',
        outcome,
        ...(claim.attemptId === job.id &&
        (now >= state.fastPublishBy || performance.now() >= state.fastPublishByMonotonic)
          ? { source: 'late-primary' }
          : {}),
      },
    };
  });
  if (!written) throw new DecisionClaimLost();
  claim.closed = written.decision?.phase === 'closed';
  claim.startedMonotonic = written.decision!.fastPublishByMonotonic - DECISION_LIMITS.immediateMs;
}

/** Non-mutating semantic consumers receive typed answers, not manufactured probabilities.
 * The owning reader supplies its exact proposition/query/source proof. Mechanical quantities
 * are not supported here: they stay with native calculations and action admission. */
export async function publishQuestionAnswers(
  service: WorldService,
  claim: DecisionPublication,
  answers: Record<string, DecisionAnswer>,
  sourcesCurrent: () => Promise<boolean>,
): Promise<ApiResult> {
  const deliveredMessage = 'The scoped reader received the structured judgments.';
  return service.publishRecall(async () => {
    if (service.paused || !(await sourcesCurrent()))
      return { ok: false, code: 'stale', message: 'The question’s permitted evidence changed.' };
    claim.groups = Object.fromEntries(Object.keys(answers).map((id) => [id, { operations: [] }]));
    const written = await service.store.mutateDecision(claim.rootJobId, async (job) => {
      if (
        service.paused ||
        !decisionClaimCurrent(
          job,
          claim,
          service.world,
          service.timelineId,
          service.generation,
          decisionPolicyDigest(service.config),
        ) ||
        (job.authority && !service.currentScope(job.authority, 'play', true))
      )
        return undefined;
      // Whole-envelope decoding happened before this point. These families return data to
      // their reader; only the existing world transition may execute response/appraisal values.
      if (
        Object.keys(answers).some(
          (id) =>
            !['choice', 'rating', 'likelihood', 'relevance'].includes(
              job.decision.groups[id]!.kind,
            ),
        )
      )
        return undefined;
      const groups = { ...job.decision.groups };
      for (const [id, answer] of Object.entries(answers))
        groups[id] = {
          ...groups[id]!,
          state: answer.status === 'answered' ? 'resolved' : 'ended-unresolved',
          receiptId: claim.receiptId,
        };
      if (claim.final)
        for (const group of Object.values(groups))
          if (group.state === 'open' && group.attemptId === claim.attemptId)
            group.state = 'ended-unresolved';
      const pending = Object.values(groups).some((group) => group.state === 'open');
      const resolved = Object.values(groups).every((group) => group.state === 'resolved');
      const at = claim.now();
      const immediate =
        job.decision.immediate.kind !== 'pending'
          ? job.decision.immediate
          : {
              kind:
                resolved &&
                at < job.decision.fastPublishBy &&
                performance.now() < job.decision.fastPublishByMonotonic
                  ? ('acted' as const)
                  : ('deferred' as const),
              at,
            };
      if (job.decision.cursor) await service.store.consumeDecisionCursor(job.decision.cursor);
      const priorAnswers =
        job.result &&
        typeof job.result === 'object' &&
        'answers' in job.result &&
        job.result.answers &&
        typeof job.result.answers === 'object'
          ? job.result.answers
          : {};
      return {
        ...job,
        status: pending ? job.status : resolved ? 'completed' : 'failed',
        message: pending
          ? job.message
          : resolved
            ? deliveredMessage
            : decisionEndMessage('abstained'),
        ...(!pending ? { completedAt: at, totalLatencyMs: Math.max(0, at - job.createdAt) } : {}),
        decision: {
          ...job.decision,
          groups,
          immediate,
          phase: pending ? job.decision.phase : 'closed',
          ...(job.decision.higher && claim.final
            ? { higher: { ...job.decision.higher, state: 'finished' } }
            : {}),
          ...(resolved || pending ? {} : { end: 'abstained' }),
        },
        result: {
          answers: { ...priorAnswers, ...answers },
          disposition: pending ? 'pending' : resolved ? 'resolved' : 'abstained',
        },
      };
    });
    if (written) {
      claim.deliveredAt = claim.now();
      claim.closed = written.decision?.phase === 'closed';
      claim.deliveredElapsedMs = Math.max(
        0,
        performance.now() -
          (written.decision!.fastPublishByMonotonic - DECISION_LIMITS.immediateMs),
      );
    }
    return written
      ? {
          ok: true,
          code: 'answered',
          message: deliveredMessage,
        }
      : {
          ok: false,
          code: 'stale',
          message: 'The question already ended or its ownership changed.',
        };
  });
}
