import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  JUDGMENT_STATE_QUESTION_CHARACTERS,
  type JudgmentAnswer,
  type TypedQuestionMap,
} from '@open-legend/ai';
import { attentionRequest } from './attention-request.js';
import { JEV_ACTION_THRESHOLD, LEVEL1_POLICY } from './jev-questions.js';
import {
  escalationLevel,
  level1Message,
  offeredForRating,
  resolveLevel1,
  type EscalationBlock,
  type GenerativeLevel,
  type Level1Outcome,
} from './level1-selection.js';

// Pure policy tests: no database and no provider. The guard proves nothing reaches fetch.
let network: ReturnType<typeof vi.fn>;
beforeEach(() => {
  network = vi.fn(async () => {
    throw new Error('network blocked in fixture');
  });
  vi.stubGlobal('fetch', network);
});
afterEach(() => {
  try {
    expect(network).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});

type Escalation = Parameters<typeof resolveLevel1>[0]['escalation'];
const noul = (value: number): JudgmentAnswer => ({ type: 'noul', noul: value });
const choice = (probabilities: Record<string, number>): JudgmentAnswer => {
  const winner = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'native';
  return { type: 'choice', choice: winner, probabilities, confidence: 0.9 };
};
const offer = (...handles: string[]) =>
  handles.map((handle) => ({ handle, description: `Fixture action ${handle}` }));
const rate = (ratings: Record<string, number>) =>
  Object.fromEntries(Object.entries(ratings).map(([handle, value]) => [handle, noul(value)]));
// a1 stands for the offered "continue existing work" binding (command null).
const isContinue = (handle: string) => handle === 'a1';
const escalations: [string, Escalation][] = [
  ['escalation available at level 2', { available: true, level: 2 }],
  ['escalation available at level 4', { available: true, level: 4 }],
  ['generation unavailable', { available: false, blocked: 'generation-unavailable' }],
  ['budget exhausted', { available: false, blocked: 'budget-exhausted' }],
];
const resolve = (
  answers: Record<string, JudgmentAnswer | undefined>,
  escalation: Escalation = { available: true, level: 3 },
  offered = offer('a0', 'a1', 'a2'),
) => resolveLevel1({ offered, answers, isContinue, escalation });

it('uses the shared 0.7 selection and 0.5 uncertainty thresholds', () => {
  expect(LEVEL1_POLICY).toMatchObject({ selectAt: 0.7, uncertainAt: 0.5 });
  // The choose-action filter in selectDecisionActions keeps only handles at or above
  // JEV_ACTION_THRESHOLD; a selected handle must survive that filter to reach admission.
  expect(LEVEL1_POLICY.selectAt).toBe(JEV_ACTION_THRESHOLD);
});

describe('resolveLevel1 selection', () => {
  it.each([
    ['an action at exactly 0.7', { a0: 0.7, a1: 0.2, a2: 0.1 }, 'act', 'a0', 0.7],
    ['continue at exactly 0.7', { a0: 0.3, a1: 0.7, a2: 0.1 }, 'continue', 'a1', 0.7],
    // The highest action is offered last, so "first handle above 0.7" would pick a0 instead.
    ['the highest action above continue', { a0: 0.8, a1: 0.7, a2: 0.95 }, 'act', 'a2', 0.95],
    ['continue above every action', { a0: 0.71, a1: 1, a2: 0 }, 'continue', 'a1', 1],
  ] as const)('selects %s', (_name, ratings, kind, handle, rating) => {
    for (const [, escalation] of escalations) {
      const { outcome, ratings: recorded, ignored } = resolve(rate(ratings), escalation);
      expect(outcome).toStrictEqual({ kind, reason: 'selected', handle, rating });
      expect(ignored).toEqual([]);
      expect(recorded).toStrictEqual(
        ['a0', 'a1', 'a2'].map((h) => ({
          handle: h,
          description: `Fixture action ${h}`,
          rating: ratings[h as keyof typeof ratings],
          status: 'rated',
        })),
      );
    }
  });

  it('keeps offer order when the best ratings tie', () => {
    const tied = rate({ a0: 0.8, a1: 0.8, a2: 0.8 });
    expect(resolve(tied).outcome).toMatchObject({ kind: 'act', handle: 'a0' });
    expect(resolve(tied, undefined, offer('a1', 'a0', 'a2')).outcome).toMatchObject({
      kind: 'continue',
      handle: 'a1',
    });
    expect(resolve(tied, undefined, offer('a2', 'a1', 'a0')).outcome).toMatchObject({
      kind: 'act',
      handle: 'a2',
    });
    // Ties below the selection threshold record the first offered handle as the best.
    const low = rate({ a0: 0.6, a1: 0.2, a2: 0.6 });
    expect(resolve(low, undefined, offer('a2', 'a1', 'a0')).outcome).toMatchObject({
      best: { handle: 'a2', rating: 0.6 },
    });
  });
});

describe('resolveLevel1 without a confident selection', () => {
  const bands = [
    {
      name: 'uncertain band starting at 0.5',
      offered: offer('a0', 'a1', 'a2'),
      answers: rate({ a0: 0.5, a1: 0.1, a2: 0.2 }),
      reason: 'uncertain-selection',
      best: { handle: 'a0', rating: 0.5 },
    },
    {
      name: 'uncertain band just below 0.7',
      offered: offer('a0', 'a1', 'a2'),
      answers: rate({ a0: 0.5, a1: 0.2, a2: 0.6999 }),
      reason: 'uncertain-selection',
      best: { handle: 'a2', rating: 0.6999 },
    },
    {
      name: 'best rating just below 0.5',
      offered: offer('a0', 'a1', 'a2'),
      answers: rate({ a0: 0.49, a1: 0.3, a2: 0 }),
      reason: 'no-suitable-action',
      best: { handle: 'a0', rating: 0.49 },
    },
    {
      name: 'every rating zero',
      offered: offer('a0', 'a1', 'a2'),
      answers: rate({ a0: 0, a1: 0, a2: 0 }),
      reason: 'no-suitable-action',
      best: { handle: 'a0', rating: 0 },
    },
    { name: 'no candidates', offered: [], answers: {}, reason: 'no-candidates', best: undefined },
  ] as const;

  const cases = bands.flatMap((band) =>
    escalations.map(([escalationName, escalation]) => ({ ...band, escalationName, escalation })),
  );
  it.each(cases)('$name with $escalationName', ({ offered, answers, reason, best, escalation }) => {
    const result = resolve(answers, escalation, [...offered]);
    const withBest = best ? { best } : {};
    expect(result.outcome).toStrictEqual(
      escalation.available
        ? { kind: 'escalate', reason, level: escalation.level, ...withBest }
        : { kind: 'defer', reason, ...withBest, escalationBlocked: escalation.blocked },
    );
    expect(result.ratings.every((entry) => entry.status === 'rated')).toBe(true);
    expect(result.ignored).toEqual([]);
  });
});

describe('resolveLevel1 with defective ratings', () => {
  const invalid: [string, JudgmentAnswer][] = [
    ['a Choice answer', choice({ yes: 0.9, no: 0.1 })],
    [
      'a Score answer',
      { type: 'score', score: 1, legend: {}, probabilities: { '1': 1 }, confidence: 1 },
    ],
    ['NaN', noul(Number.NaN)],
    ['Infinity', noul(Number.POSITIVE_INFINITY)],
    ['a rating above 1', noul(1.01)],
    ['a rating below 0', noul(-0.01)],
  ];
  const cases = [
    ...invalid.map(([name, answer]) => ({
      name: `invalid: ${name}`,
      answers: { a0: noul(0.99), a1: answer, a2: noul(0.2) } as Record<string, JudgmentAnswer>,
      reason: 'invalid-answers',
      status: 'invalid',
    })),
    {
      name: 'missing: no answer for an offered handle',
      answers: { a0: noul(0.99), a2: noul(0.2) },
      reason: 'missing-answers',
      status: 'missing',
    },
    {
      name: 'missing: an explicit undefined answer',
      answers: { a0: noul(0.99), a1: undefined, a2: noul(0.2) },
      reason: 'missing-answers',
      status: 'missing',
    },
  ].flatMap((entry) =>
    escalations.map(([escalationName, escalation]) => ({ ...entry, escalationName, escalation })),
  );

  it.each(cases)(
    '$name defers with $escalationName even though a0 is rated 0.99',
    ({ answers, reason, status, escalation }) => {
      const { outcome, ratings, ignored } = resolve(answers, escalation);
      // No best, no escalation level and no escalation block: nothing is selected or bought.
      expect(outcome).toStrictEqual({ kind: 'defer', reason });
      expect(ignored).toEqual([]);
      expect(ratings).toStrictEqual([
        { handle: 'a0', description: 'Fixture action a0', rating: 0.99, status: 'rated' },
        { handle: 'a1', description: 'Fixture action a1', rating: null, status },
        { handle: 'a2', description: 'Fixture action a2', rating: 0.2, status: 'rated' },
      ]);
    },
  );

  it('reports invalid ratings ahead of missing ratings and accepts the 0 and 1 bounds', () => {
    expect(resolve({ a0: noul(2), a2: noul(1) }).outcome).toStrictEqual({
      kind: 'defer',
      reason: 'invalid-answers',
    });
    expect(resolve(rate({ a0: 0, a1: 0.3, a2: 1 })).outcome).toStrictEqual({
      kind: 'act',
      reason: 'selected',
      handle: 'a2',
      rating: 1,
    });
  });
});

describe('resolveLevel1 with answers for unoffered handles', () => {
  it('records them as ignored and never selects them', () => {
    const answers = {
      a9: noul(1),
      a0: noul(0.2),
      'Option 1': noul(1),
      a1: noul(0.1),
      a2: noul(0.3),
    };
    const escalated = resolve(answers);
    expect(escalated.ignored).toEqual(['a9', 'Option 1']);
    expect(escalated.ratings.map((entry) => entry.handle)).toEqual(['a0', 'a1', 'a2']);
    expect(escalated.outcome).toStrictEqual({
      kind: 'escalate',
      reason: 'no-suitable-action',
      level: 3,
      best: { handle: 'a2', rating: 0.3 },
    });

    const selected = resolve({ ...answers, a0: noul(0.8) });
    expect(selected.outcome).toMatchObject({ kind: 'act', handle: 'a0', rating: 0.8 });
    expect(selected.ignored).toEqual(['a9', 'Option 1']);

    // An unoffered answer never stands in for a missing offered rating.
    const missing = resolve({ b0: noul(1), b1: noul(1), b2: noul(1) });
    expect(missing.outcome).toStrictEqual({ kind: 'defer', reason: 'missing-answers' });
    expect(missing.ignored).toEqual(['b0', 'b1', 'b2']);

    // Without any offered candidate, stray answers still resolve to no-candidates.
    const none = resolve({ a0: noul(1) }, { available: false, blocked: 'budget-exhausted' }, []);
    expect(none.outcome).toStrictEqual({
      kind: 'defer',
      reason: 'no-candidates',
      escalationBlocked: 'budget-exhausted',
    });
    expect(none.ignored).toEqual(['a0']);
  });
});

describe('escalationLevel', () => {
  const allRoutes = ['native', 'level1', 'level2', 'level3', 'level4'];
  it.each([
    [
      'the most probable offered level',
      choice({ level1: 0.4, level2: 0.1, level3: 0.3, level4: 0.2 }),
      allRoutes,
      3,
    ],
    [
      'level 4 when it is the most probable',
      choice({ native: 0.5, level2: 0.1, level4: 0.3 }),
      allRoutes,
      4,
    ],
    [
      'an offered level over a more probable unoffered level',
      choice({ level2: 0.1, level3: 0.2, level4: 0.7 }),
      ['native', 'level1', 'level2', 'level3'],
      3,
    ],
    [
      'the cheaper level when probabilities tie',
      choice({ level2: 0.1, level3: 0.3, level4: 0.3 }),
      allRoutes,
      3,
    ],
    // NaN sits on the first level examined: without the finiteness guard it would become the
    // running best and no later comparison against NaN could replace it.
    [
      'a finite level over a NaN probability',
      choice({ level2: Number.NaN, level3: 0.1, level4: 0.05 }),
      allRoutes,
      3,
    ],
    [
      'a finite level over an infinite probability',
      choice({ level2: 0.05, level3: 0.1, level4: Number.POSITIVE_INFINITY }),
      allRoutes,
      3,
    ],
    ['level 2 when generative levels have no probability', choice({ level1: 1 }), allRoutes, 2],
    ['level 2 for a Noul answer', noul(0.9), allRoutes, 2],
    [
      'level 2 for a Score answer',
      {
        type: 'score',
        score: 4,
        legend: {},
        probabilities: { level4: 1 },
        confidence: 1,
      } as JudgmentAnswer,
      allRoutes,
      2,
    ],
    ['level 2 for a missing answer', undefined, allRoutes, 2],
    [
      'level 2 when no generative level was offered',
      choice({ level3: 0.9, level4: 0.1 }),
      ['native', 'level1'],
      2,
    ],
  ] as [string, JudgmentAnswer | undefined, string[], GenerativeLevel][])(
    'chooses %s',
    (_name, answer, offered, expected) => {
      expect(escalationLevel(answer, offered)).toBe(expected);
    },
  );

  it('feeds the chosen level into an escalating resolution', () => {
    const level = escalationLevel(choice({ level1: 0.6, level2: 0.1, level4: 0.3 }), allRoutes);
    const { outcome } = resolve(rate({ a0: 0.55, a1: 0.1, a2: 0.2 }), {
      available: true,
      level,
    });
    expect(outcome).toStrictEqual({
      kind: 'escalate',
      reason: 'uncertain-selection',
      level: 4,
      best: { handle: 'a0', rating: 0.55 },
    });
  });
});

describe('level1Message', () => {
  it('describes selections without mentioning escalation or retries', () => {
    const act = level1Message({ kind: 'act', reason: 'selected', handle: 'a0', rating: 0.8 });
    const cont = level1Message({ kind: 'continue', reason: 'selected', handle: 'a1', rating: 0.8 });
    expect(act).toBe('Jev selected a supplied action for native admission.');
    expect(cont).toBe('Jev chose to continue existing work; no new intervention.');
    for (const message of [act, cont]) expect(message).not.toMatch(/retry|Escalated/);
  });

  const causes = {
    'no-candidates': 'no supplied action was available to rate',
    'uncertain-selection': 'no supplied action was rated confidently enough',
    'no-suitable-action': 'no supplied action fits',
    'missing-answers': 'Jev omitted ratings for offered actions',
    'invalid-answers': 'Jev returned unusable ratings',
  } as const;

  it.each(
    (['no-candidates', 'uncertain-selection', 'no-suitable-action'] as const).flatMap((reason) =>
      ([2, 3, 4] as const).map((level) => ({ reason, level })),
    ),
  )('names level $level for an escalation after $reason', ({ reason, level }) => {
    const message = level1Message({ kind: 'escalate', reason, level });
    expect(message).toBe(`Escalated to level ${level}: ${causes[reason]}.`);
    expect(message).not.toContain('No automatic paid retry');
  });

  const blocks: [EscalationBlock | undefined, string][] = [
    [undefined, ''],
    ['generation-unavailable', ' Escalation is unavailable because generation is disabled.'],
    ['budget-exhausted', ' The escalation allowance could not be reserved.'],
  ];
  it.each(
    (Object.keys(causes) as (keyof typeof causes)[]).flatMap((reason) =>
      blocks.map(([blocked, suffix]) => ({ reason, blocked, suffix })),
    ),
  )(
    'says there is no paid retry for a $reason deferral ($blocked)',
    ({ reason, blocked, suffix }) => {
      const outcome: Level1Outcome = {
        kind: 'defer',
        reason,
        ...(blocked ? { escalationBlocked: blocked } : {}),
      };
      const message = level1Message(outcome);
      expect(message).toBe(
        `Level-1 decision deferred: ${causes[reason]}.${suffix} No automatic paid retry.`,
      );
    },
  );
});

describe('offeredForRating', () => {
  const questions = (...handles: string[]): TypedQuestionMap =>
    Object.fromEntries(
      handles.map((handle) => [handle, { type: 'noul', instructions: `Rate ${handle}` }]),
    );

  it('pairs question keys with candidate descriptions in order when counts match', () => {
    expect(
      offeredForRating({
        state: {
          attentionPolicy: 'fixture',
          candidates: { 'Option 1': 'Eat bread', 'Option 2': 'Keep working', 'Option 3': 'Walk' },
        },
        questions: questions('a0', 'a1', 'a2'),
      }),
    ).toStrictEqual([
      { handle: 'a0', description: 'Eat bread' },
      { handle: 'a1', description: 'Keep working' },
      { handle: 'a2', description: 'Walk' },
    ]);
  });

  it('matches the rating request built for choosing an action', () => {
    const request = attentionRequest(
      { attentionPolicy: 'fixture policy' },
      [
        ['a0', 'Eat the bread you carry.'],
        ['a1', 'Continue the current work.'],
        ['a2', 'Walk to the well.'],
      ],
      'choose-action',
    );
    const offered = offeredForRating(request);
    expect(offered).toStrictEqual([
      { handle: 'a0', description: 'Eat the bread you carry.' },
      { handle: 'a1', description: 'Continue the current work.' },
      { handle: 'a2', description: 'Walk to the well.' },
    ]);
    // Descriptions travel into the diagnostic ratings of the resolution.
    const { ratings } = resolveLevel1({
      offered,
      answers: rate({ a0: 0.9, a1: 0.1, a2: 0.2 }),
      isContinue,
      escalation: { available: true, level: 2 },
    });
    expect(ratings[0]).toStrictEqual({
      handle: 'a0',
      description: 'Eat the bread you carry.',
      rating: 0.9,
      status: 'rated',
    });
  });

  it('keeps descriptions paired when the request drops an oversized middle candidate', () => {
    // attentionRequest skips a candidate that does not fit Jev's state limit and relabels the
    // rest, so question keys and "Option N" labels no longer share an index.
    const request = attentionRequest(
      { attentionPolicy: 'fixture policy' },
      [
        ['a0', 'Eat the bread you carry.'],
        ['a1', 'x'.repeat(JUDGMENT_STATE_QUESTION_CHARACTERS + 1)],
        ['a2', 'Walk to the well.'],
      ],
      'choose-action',
    );
    expect(Object.keys(request.questions)).toEqual(['a0', 'a2']);
    expect(request.state.candidates).toStrictEqual({
      'Option 1': 'Eat the bread you carry.',
      'Option 2': 'Walk to the well.',
    });
    const offered = offeredForRating(request);
    expect(offered).toStrictEqual([
      { handle: 'a0', description: 'Eat the bread you carry.' },
      { handle: 'a2', description: 'Walk to the well.' },
    ]);
    // A rating for the dropped handle is an unoffered answer: recorded, never selected.
    const resolution = resolveLevel1({
      offered,
      answers: rate({ a0: 0.3, a1: 1, a2: 0.9 }),
      isContinue,
      escalation: { available: true, level: 2 },
    });
    expect(resolution).toStrictEqual({
      outcome: { kind: 'act', reason: 'selected', handle: 'a2', rating: 0.9 },
      ratings: [
        { handle: 'a0', description: 'Eat the bread you carry.', rating: 0.3, status: 'rated' },
        { handle: 'a2', description: 'Walk to the well.', rating: 0.9, status: 'rated' },
      ],
      ignored: ['a1'],
    });
  });

  it('records ratings without a description key when none was offered', () => {
    const { ratings } = resolveLevel1({
      offered: offeredForRating({ state: null, questions: questions('a0') }),
      answers: rate({ a0: 0.9 }),
      isContinue,
      escalation: { available: false, blocked: 'generation-unavailable' },
    });
    expect(ratings).toStrictEqual([{ handle: 'a0', rating: 0.9, status: 'rated' }]);
    expect(Object.hasOwn(ratings[0]!, 'description')).toBe(false);
  });

  it.each([
    ['fewer candidates than questions', { candidates: { 'Option 1': 'Eat', 'Option 2': 'Walk' } }],
    [
      'more candidates than questions',
      { candidates: { 'Option 1': 'A', 'Option 2': 'B', 'Option 3': 'C', 'Option 4': 'D' } },
    ],
    ['no candidates field', { attentionPolicy: 'fixture' }],
    ['a string candidates field', { candidates: 'Eat, Keep working, Walk' }],
    ['null state', null],
    ['undefined state', undefined],
    ['a string state', 'candidates'],
  ])('omits descriptions with %s', (_name, state) => {
    expect(offeredForRating({ state, questions: questions('a0', 'a1', 'a2') })).toStrictEqual([
      { handle: 'a0' },
      { handle: 'a1' },
      { handle: 'a2' },
    ]);
  });

  it('omits only non-string descriptions and handles an empty request', () => {
    expect(
      offeredForRating({
        state: { candidates: { 'Option 1': 'Eat', 'Option 2': 42, 'Option 3': null } },
        questions: questions('a0', 'a1', 'a2'),
      }),
    ).toStrictEqual([{ handle: 'a0', description: 'Eat' }, { handle: 'a1' }, { handle: 'a2' }]);
    expect(offeredForRating({ state: { candidates: {} }, questions: {} })).toEqual([]);
  });
});
