import type { JudgmentAnswer, TypedQuestionMap } from '@open-legend/ai';
import { LEVEL1_POLICY } from './jev-questions.js';

/** Why a level-1 decision acted, continued, escalated or deferred. Reasons come from policy
 * results and Jev answers, never from invented explanations.
 * archive/07-technical-architecture/agent-agency-runtime.md#24-level-1-selection-without-generative-escalation */
export type Level1Reason =
  | 'selected'
  | 'no-suitable-action'
  | 'uncertain-selection'
  | 'no-candidates'
  | 'missing-answers'
  | 'invalid-answers';

/** Why an otherwise warranted escalation could not run. */
export type EscalationBlock = 'generation-unavailable' | 'budget-exhausted';

export type GenerativeLevel = 2 | 3 | 4;

export interface Level1Rating {
  handle: string;
  /** Actor-permitted description Jev rated; diagnostic only. */
  description?: string;
  rating: number | null;
  status: 'rated' | 'missing' | 'invalid';
}

export type Level1Outcome =
  | { kind: 'act'; reason: 'selected'; handle: string; rating: number }
  | { kind: 'continue'; reason: 'selected'; handle: string; rating: number }
  | {
      kind: 'escalate';
      reason: 'no-suitable-action' | 'uncertain-selection' | 'no-candidates';
      level: GenerativeLevel;
      best?: { handle: string; rating: number };
    }
  | {
      kind: 'defer';
      reason: Exclude<Level1Reason, 'selected'>;
      best?: { handle: string; rating: number };
      /** Present when the selection warranted escalation but it could not run. */
      escalationBlocked?: EscalationBlock;
    };

export interface Level1Resolution {
  outcome: Level1Outcome;
  ratings: Level1Rating[];
  /** Answers for handles that were never offered; recorded and never executed. */
  ignored: string[];
}

/** Offered generative routes in the same route answer choose the escalation level.
 * No usable distribution falls back to the least expensive generative level. */
export function escalationLevel(
  routeAnswer: JudgmentAnswer | undefined,
  offeredRoutes: readonly string[],
): GenerativeLevel {
  const probabilities = routeAnswer?.type === 'choice' ? routeAnswer.probabilities : {};
  let best: { level: GenerativeLevel; probability: number } | undefined;
  for (const level of [2, 3, 4] as const) {
    if (!offeredRoutes.includes(`level${level}`)) continue;
    const probability = probabilities[`level${level}`] ?? 0;
    if (Number.isFinite(probability) && (!best || probability > best.probability))
      best = { level, probability };
  }
  return best?.level ?? 2;
}

/** Resolve independent Noul ratings to exactly one outcome.
 * `offered` lists the handles actually submitted for rating, in offer order.
 * `isContinue` identifies the deliberate no-new-intervention binding. */
export function resolveLevel1(input: {
  offered: readonly { handle: string; description?: string }[];
  answers: Record<string, JudgmentAnswer | undefined>;
  isContinue: (handle: string) => boolean;
  escalation:
    | { available: true; level: GenerativeLevel }
    | { available: false; blocked: EscalationBlock };
}): Level1Resolution {
  const offered = new Set(input.offered.map((entry) => entry.handle));
  const ratings: Level1Rating[] = input.offered.map(({ handle, description }) => {
    const answer = input.answers[handle];
    const status: Level1Rating['status'] =
      answer === undefined
        ? 'missing'
        : answer.type === 'noul' &&
            Number.isFinite(answer.noul) &&
            answer.noul >= 0 &&
            answer.noul <= 1
          ? 'rated'
          : 'invalid';
    return {
      handle,
      ...(description === undefined ? {} : { description }),
      rating: status === 'rated' && answer?.type === 'noul' ? answer.noul : null,
      status,
    };
  });
  const ignored = Object.keys(input.answers).filter((handle) => !offered.has(handle));
  const finish = (outcome: Level1Outcome): Level1Resolution => ({ outcome, ratings, ignored });
  // A defective judgment is not evidence that nothing fits; buying a larger model to repair
  // it would be an automatic paid repair. Defer instead.
  if (ratings.some((entry) => entry.status === 'invalid'))
    return finish({ kind: 'defer', reason: 'invalid-answers' });
  if (ratings.some((entry) => entry.status === 'missing'))
    return finish({ kind: 'defer', reason: 'missing-answers' });
  let best: { handle: string; rating: number } | undefined;
  for (const entry of ratings)
    if (entry.rating !== null && (!best || entry.rating > best.rating))
      best = { handle: entry.handle, rating: entry.rating };
  if (best && best.rating >= LEVEL1_POLICY.selectAt)
    return finish({
      kind: input.isContinue(best.handle) ? ('continue' as const) : ('act' as const),
      reason: 'selected',
      handle: best.handle,
      rating: best.rating,
    });
  const reason = !best
    ? 'no-candidates'
    : best.rating >= LEVEL1_POLICY.uncertainAt
      ? 'uncertain-selection'
      : 'no-suitable-action';
  return finish(
    input.escalation.available
      ? { kind: 'escalate', reason, level: input.escalation.level, ...(best ? { best } : {}) }
      : {
          kind: 'defer',
          reason,
          ...(best ? { best } : {}),
          escalationBlocked: input.escalation.blocked,
        },
  );
}

/** Actor-facing explanation stored with the job; the reason code stays machine-readable. */
export function level1Message(outcome: Level1Outcome): string {
  if (outcome.kind === 'act' || outcome.kind === 'continue')
    return outcome.kind === 'act'
      ? 'Jev selected a supplied action for native admission.'
      : 'Jev chose to continue existing work; no new intervention.';
  const cause =
    outcome.reason === 'no-candidates'
      ? 'no supplied action was available to rate'
      : outcome.reason === 'uncertain-selection'
        ? 'no supplied action was rated confidently enough'
        : outcome.reason === 'no-suitable-action'
          ? 'no supplied action fits'
          : outcome.reason === 'missing-answers'
            ? 'Jev omitted ratings for offered actions'
            : 'Jev returned unusable ratings';
  if (outcome.kind === 'escalate') return `Escalated to level ${outcome.level}: ${cause}.`;
  const blocked =
    outcome.escalationBlocked === 'generation-unavailable'
      ? ' Escalation is unavailable because generation is disabled.'
      : outcome.escalationBlocked === 'budget-exhausted'
        ? ' The escalation allowance could not be reserved.'
        : '';
  return `Level-1 decision deferred: ${cause}.${blocked} No automatic paid retry.`;
}

/** Offered handles in the rating request, with their permitted descriptions when the request
 * states them in the same order as its questions. */
export function offeredForRating(request: {
  state: unknown;
  questions: TypedQuestionMap;
}): { handle: string; description?: string }[] {
  const handles = Object.keys(request.questions);
  const state = request.state;
  const candidates =
    state && typeof state === 'object' && 'candidates' in state
      ? (state as { candidates?: unknown }).candidates
      : undefined;
  const descriptions =
    candidates && typeof candidates === 'object'
      ? Object.values(candidates as Record<string, unknown>)
      : [];
  return handles.map((handle, index) => {
    const description = descriptions.length === handles.length ? descriptions[index] : undefined;
    return typeof description === 'string' ? { handle, description } : { handle };
  });
}
