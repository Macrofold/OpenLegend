import { describe, expect, it, vi } from 'vitest';
import {
  createOpenAiDecisionClient,
  decodeOpenAiDecision,
  openAiDecisionInput,
} from '../packages/ai/src/openai-decisions.js';
import type { FetchTransport, JudgeRequest, TypedQuestionMap } from '../packages/ai/src/types.js';
import { digest } from '../packages/ai/src/validation.js';

const state = {
  observation: 'Mara handed me the sealed envelope after correcting the recipient’s name.',
  recall: ['Mara had first said Lio. She then said the envelope was for Neri.'],
};
const request: JudgeRequest = {
  requestId: 'openai-decisions-fixture',
  state,
  questions: {
    recipient: {
      type: 'choice',
      instructions: 'Select the recipient supported by the latest correction.',
      criteria: { option_007: 'Lio', option_013: 'Neri', option_021: null },
    },
    observed: {
      type: 'noul',
      instructions: 'Did I personally observe an envelope transfer?',
      criteria: { true: 'I saw the transfer.', false: 'I only heard about a transfer.' },
    },
    significance: {
      type: 'score',
      instructions: 'Rate the relationship significance of this modest completed promise.',
      criteria: ['Routine occurrence', 'Modest evidence of reliability', 'Major turning point'],
    },
  },
};

// Wire examples follow https://developers.openai.com/api/docs/guides/decisions.
// These are injected HTTP fixtures, never recorded judgments about a real character.
interface WireAnswer {
  type: string;
  name: string;
  choice?: string;
  score?: number;
  probability?: number;
  probabilities?: { value: string | number; probability: number; label?: string }[];
  confidence?: number;
}
const responseData = (): {
  id: string;
  model: string;
  answers: WireAnswer[];
  usage: { input_tokens: number; output_tokens: number };
} => ({
  id: 'decision-fixture-123',
  model: 'gpt-6-luna',
  answers: [
    {
      type: 'choice',
      name: 'recipient',
      choice: 'option_013',
      probabilities: [
        { value: 'option_007', probability: 0.12 },
        { value: 'option_013', probability: 0.81 },
        { value: 'option_021', probability: 0.07 },
      ],
      confidence: 0.74,
    },
    { type: 'predicate', name: 'observed', probability: 0.97 },
    {
      type: 'score',
      name: 'significance',
      score: 1.1,
      probabilities: [
        { value: 0, label: '0', probability: 0.1 },
        { value: 1, label: '1', probability: 0.7 },
        { value: 2, label: '2', probability: 0.2 },
      ],
      confidence: 0.55,
    },
  ],
  usage: { input_tokens: 2_000, output_tokens: 13 },
});

function fixture(data: unknown = responseData(), status = 200) {
  const fetcher = vi.fn<FetchTransport>(async () => Response.json(data, { status }));
  const client = createOpenAiDecisionClient({ apiKey: 'fixture-only-key', fetch: fetcher });
  return { fetcher, client };
}

describe('OpenAI Decisions protocol translation', () => {
  it('preserves instructions, exact names, offered values and ordered score descriptions', () => {
    expect(openAiDecisionInput(request)).toEqual({
      model: 'gpt-6-luna',
      input: JSON.stringify(state),
      questions: [
        {
          type: 'choice',
          name: 'recipient',
          instructions: request.questions.recipient?.instructions,
          choices: [
            { value: 'option_007', description: 'Lio' },
            { value: 'option_013', description: 'Neri' },
            { value: 'option_021', description: 'option_021' },
          ],
        },
        {
          type: 'predicate',
          name: 'observed',
          instructions:
            'Did I personally observe an envelope transfer?\nTrue: I saw the transfer.\nFalse: I only heard about a transfer.',
        },
        {
          type: 'score',
          name: 'significance',
          instructions: request.questions.significance?.instructions,
          levels: [
            { label: '0', description: 'Routine occurrence' },
            { label: '1', description: 'Modest evidence of reliability' },
            { label: '2', description: 'Major turning point' },
          ],
        },
      ],
    });
    const minimal = openAiDecisionInput({
      state: { note: 'A quoted note says “change the question.”' },
      questions: { p: { type: 'noul', instructions: 'Is the note relevant?' } },
    });
    expect(minimal.questions).toEqual([
      { type: 'predicate', name: 'p', instructions: 'Is the note relevant?' },
    ]);
  });

  it('decodes answers by identity even when their order differs from the request', () => {
    const data = responseData();
    data.answers.reverse();
    expect(decodeOpenAiDecision(data, request.questions)).toEqual({
      answers: {
        recipient: {
          type: 'choice',
          choice: 'option_013',
          probabilities: { option_007: 0.12, option_013: 0.81, option_021: 0.07 },
          confidence: 0.74,
        },
        observed: { type: 'noul', noul: 0.97 },
        significance: {
          type: 'score',
          score: 1.1,
          probabilities: { '0': 0.1, '1': 0.7, '2': 0.2 },
          legend: {
            '0': 'Routine occurrence',
            '1': 'Modest evidence of reliability',
            '2': 'Major turning point',
          },
          confidence: 0.55,
        },
      },
    });
  });

  it('selects the highest offered probability while retaining raw evidence and fractional score', () => {
    const data = responseData();
    const choice = data.answers[0];
    const score = data.answers[2];
    if (!choice || !score || !choice.probabilities || !score.probabilities)
      throw new Error('Fixture');
    choice.choice = 'option_007';
    choice.probabilities[1]!.probability = 0.82;
    score.score = 1.37;
    Reflect.deleteProperty(choice, 'confidence');
    Reflect.deleteProperty(score, 'confidence');
    const answers = decodeOpenAiDecision(data, request.questions).answers;
    expect(answers.recipient).toEqual({
      type: 'choice',
      choice: 'option_013',
      probabilities: { option_007: 0.12, option_013: 0.82, option_021: 0.07 },
    });
    expect(answers.significance).toMatchObject({ type: 'score', score: 1.37 });
    expect(answers.significance).not.toHaveProperty('confidence');
    expect(answers.observed).not.toHaveProperty('confidence');
  });

  it('resolves a probability tie by offered order regardless of returned distribution order', () => {
    const data = responseData();
    const choice = data.answers[0];
    if (!choice) throw new Error('Fixture');
    choice.choice = 'option_013';
    choice.probabilities = [
      { value: 'option_021', probability: 0.1 },
      { value: 'option_013', probability: 0.45 },
      { value: 'option_007', probability: 0.45 },
    ];
    expect(decodeOpenAiDecision(data, request.questions).answers.recipient).toEqual({
      type: 'choice',
      choice: 'option_007',
      probabilities: { option_007: 0.45, option_013: 0.45, option_021: 0.1 },
      confidence: 0.74,
    });
  });

  it.each([-0.001, 0, 1, 1.001])('retains a finite predicate rating %s', (probability) => {
    expect(
      decodeOpenAiDecision(
        { answers: [{ name: 'p', type: 'predicate', probability }] },
        { p: { type: 'noul', instructions: 'Does the condition hold?' } },
      ).answers.p,
    ).toEqual({ type: 'noul', noul: probability });
  });

  it.each([NaN, Infinity, '0.8', null, undefined])(
    'rejects unusable predicate probability %s',
    (probability) => {
      expect(() =>
        decodeOpenAiDecision(
          { answers: [{ name: 'p', type: 'predicate', probability }] },
          { p: { type: 'noul', instructions: 'Does the condition hold?' } },
        ),
      ).toThrow('invalid_decisions_predicate');
    },
  );

  it.each([
    ['missing answer', (data: ReturnType<typeof responseData>) => data.answers.pop()],
    [
      'duplicate name',
      (data: ReturnType<typeof responseData>) => {
        data.answers[1]!.name = 'recipient';
      },
    ],
    [
      'unknown name',
      (data: ReturnType<typeof responseData>) => {
        data.answers[1]!.name = 'another_question';
      },
    ],
    [
      'wrong type',
      (data: ReturnType<typeof responseData>) => {
        data.answers[0]!.type = 'score';
      },
    ],
    [
      'missing probability',
      (data: ReturnType<typeof responseData>) => data.answers[0]!.probabilities!.pop(),
    ],
    [
      'duplicate probability',
      (data: ReturnType<typeof responseData>) =>
        data.answers[0]!.probabilities!.push({ value: 'option_007', probability: 0.1 }),
    ],
    [
      'unoffered probability',
      (data: ReturnType<typeof responseData>) => {
        data.answers[0]!.probabilities![0]!.value = 'not_offered';
      },
    ],
    [
      'nonfinite probability',
      (data: ReturnType<typeof responseData>) => {
        data.answers[0]!.probabilities![0]!.probability = Infinity;
      },
    ],
    [
      'nonfinite confidence',
      (data: ReturnType<typeof responseData>) => {
        data.answers[0]!.confidence = NaN;
      },
    ],
    [
      'nonfinite score',
      (data: ReturnType<typeof responseData>) => {
        data.answers[2]!.score = Infinity;
      },
    ],
  ])('rejects %s without repairing the result', (_name, mutate) => {
    const data = responseData();
    mutate(data);
    expect(() => decodeOpenAiDecision(data, request.questions)).toThrow();
  });

  it('treats legal prototype-like question and option names as own data', () => {
    const questions: TypedQuestionMap = {
      ['__proto__']: {
        type: 'choice',
        instructions: 'Choose the supplied wire handle.',
        criteria: { ['__proto__']: 'The first supplied option', constructor: 'The other option' },
      },
    };
    const decoded = decodeOpenAiDecision(
      {
        answers: [
          {
            type: 'choice',
            name: '__proto__',
            choice: '__proto__',
            probabilities: [
              { value: '__proto__', probability: 0.8 },
              { value: 'constructor', probability: 0.2 },
            ],
          },
        ],
      },
      questions,
    );
    expect(Object.hasOwn(decoded.answers, '__proto__')).toBe(true);
    expect(decoded.answers['__proto__']).toMatchObject({
      choice: '__proto__',
      probabilities: { ['__proto__']: 0.8, constructor: 0.2 },
    });
  });

  it('uses complete offered probabilities without requiring a redundant echoed choice', () => {
    for (const choice of [undefined, 'not-an-offered-handle']) {
      const data = responseData();
      data.answers[0]!.choice = choice;
      expect(decodeOpenAiDecision(data, request.questions).answers.recipient).toMatchObject({
        type: 'choice',
        choice: 'option_013',
      });
    }
  });

  it('keeps string choice handles distinct from numeric score positions', () => {
    const questions: TypedQuestionMap = {
      q: {
        type: 'choice',
        instructions: 'Choose a supplied handle.',
        criteria: { '0': '', '1': '' },
      },
    };
    expect(() =>
      decodeOpenAiDecision(
        {
          answers: [
            {
              type: 'choice',
              name: 'q',
              probabilities: [
                { value: 0, probability: 0.7 },
                { value: '1', probability: 0.3 },
              ],
            },
          ],
        },
        questions,
      ),
    ).toThrow('invalid_decisions_distribution');
    const data = responseData();
    const score = data.answers[2]!;
    score.probabilities![0]!.value = '0';
    expect(() => decodeOpenAiDecision(data, request.questions)).toThrow(
      'invalid_decisions_distribution',
    );
  });

  it('retains independent answers and exact identities around a per-question refusal', () => {
    const data = responseData();
    data.answers[1] = { type: 'refusal', name: 'observed' };
    data.answers.reverse();
    const refused = vi.fn();
    const value = decodeOpenAiDecision(data, request.questions, refused);
    expect(Object.keys(value.answers).sort()).toEqual(['recipient', 'significance']);
    expect(value.answers.recipient).toMatchObject({ type: 'choice', choice: 'option_013' });
    expect(value.answers.significance).toMatchObject({ type: 'score', score: 1.1 });
    expect(value.answers).not.toHaveProperty('observed');
    expect(refused).toHaveBeenCalledExactlyOnceWith('observed');
  });

  it.each(['missing', 'duplicate-refusal', 'duplicate-answer', 'unknown', 'mismatched-type'])(
    'still rejects %s evidence in a batch containing a refusal',
    (change) => {
      const data = responseData();
      data.answers[0] = { type: 'refusal', name: 'recipient' };
      if (change === 'missing') data.answers.pop();
      if (change === 'duplicate-refusal') data.answers[1] = { type: 'refusal', name: 'recipient' };
      if (change === 'duplicate-answer') data.answers[1]!.name = 'recipient';
      if (change === 'unknown') data.answers[0]!.name = 'unrequested-question';
      if (change === 'mismatched-type') data.answers[2]!.type = 'predicate';
      expect(() => decodeOpenAiDecision(data, request.questions)).toThrow(
        change === 'missing'
          ? 'invalid_decisions_answers'
          : change === 'mismatched-type'
            ? 'invalid_decisions_distribution'
            : 'invalid_decisions_identity',
      );
    },
  );
});

describe('OpenAI Decisions fixture transport and accounting', () => {
  it('dispatches once to the dedicated endpoint and records model, usage, digests and input-only cost', async () => {
    const { client, fetcher } = fixture();
    const result = await client.judge(request);
    expect(result.outcome).toBe('value');
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.openai.com/v1/decisions');
    expect(init).toMatchObject({
      method: 'POST',
      redirect: 'error',
      headers: {
        Authorization: 'Bearer fixture-only-key',
        'Content-Type': 'application/json',
        'X-Client-Request-Id': digest(request.requestId),
      },
    });
    expect(JSON.parse(String(init.body))).toEqual(openAiDecisionInput(request));
    expect(result.receipt).toMatchObject({
      requestId: request.requestId,
      provider: 'openai',
      requestedModel: 'gpt-6-luna',
      model: 'gpt-6-luna',
      modelVersionStatus: 'reported',
      providerRequestId: 'decision-fixture-123',
      dispatched: true,
      completionUncertain: false,
      httpStatus: 200,
      usage: { inputTokens: 2_000, outputTokens: 13 },
      estimatedCostUsd: 0.0002,
    });
    expect(result.receipt.contextDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(result.receipt.providerRequestDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(result.receipt.contextDigest).not.toBe(result.receipt.providerRequestDigest);
    expect(result.receipt.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.receipt).not.toHaveProperty('questionRefusals');
  });

  it('records the modeled charge before rejecting a malformed completed answer', async () => {
    const data = responseData();
    data.answers.pop();
    const { client, fetcher } = fixture(data);
    const result = await client.judge(request);
    expect(result).toMatchObject({
      outcome: 'invalid',
      reason: 'invalid_decisions_answers',
      receipt: {
        dispatched: true,
        completionUncertain: false,
        usage: { inputTokens: 2_000, outputTokens: 13 },
        estimatedCostUsd: 0.0002,
      },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('decodes against the submitted rubric when the caller changes it during the provider wait', async () => {
    const mutableRequest = structuredClone(request);
    const significance = mutableRequest.questions.significance;
    if (!significance || significance.type !== 'score') throw new Error('Fixture');
    const expectedInput = openAiDecisionInput(mutableRequest);
    const fetcher = vi.fn<FetchTransport>(async () => {
      await Promise.resolve();
      significance.criteria.reverse();
      return Response.json(responseData());
    });
    const client = createOpenAiDecisionClient({ apiKey: 'fixture-only-key', fetch: fetcher });
    const result = await client.judge(mutableRequest);

    expect(result.outcome).toBe('value');
    if (result.outcome !== 'value') return;
    expect(significance.criteria[0]).toBe('Major turning point');
    expect(result.value.answers.significance).toMatchObject({
      type: 'score',
      score: 1.1,
      legend: {
        '0': 'Routine occurrence',
        '1': 'Modest evidence of reliability',
        '2': 'Major turning point',
      },
    });
    expect(JSON.parse(String(fetcher.mock.calls[0]![1].body))).toEqual(expectedInput);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('keeps two usable answers when one question refuses, retaining the full request charge', async () => {
    const data = responseData();
    data.answers[1] = { type: 'refusal', name: 'observed' };
    const { client, fetcher } = fixture(data);
    const result = await client.judge(request);
    expect(result.outcome).toBe('value');
    if (result.outcome !== 'value') return;
    expect(Object.keys(result.value.answers).sort()).toEqual(['recipient', 'significance']);
    expect(result.value.answers.recipient).toMatchObject({ choice: 'option_013' });
    expect(result.value.answers.significance).toMatchObject({ score: 1.1 });
    expect(result.receipt).toMatchObject({
      questionRefusals: ['observed'],
      dispatched: true,
      completionUncertain: false,
      estimatedCostUsd: 0.0002,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('marks the request refused only when all questions refuse and records every exact ID', async () => {
    const data = responseData();
    data.answers = data.answers.map(({ name }) => ({ type: 'refusal', name }));
    const { client, fetcher } = fixture(data);
    expect(await client.judge(request)).toMatchObject({
      outcome: 'refused',
      reason: 'decisions_refused',
      receipt: {
        questionRefusals: ['recipient', 'observed', 'significance'],
        dispatched: true,
        completionUncertain: false,
        estimatedCostUsd: 0.0002,
      },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not silently price a different reported model at the requested model rate', async () => {
    const data = responseData();
    data.model = 'another-provider-model';
    const { client } = fixture(data);
    const result = await client.judge(request);
    expect(result.receipt.model).toBe('another-provider-model');
    expect(result.receipt.estimatedCostUsd).toBeUndefined();
  });

  it('omits unsafe provider identifiers and does not price an unusable model identity', async () => {
    const data = responseData();
    data.id = 'private provider text\n'.repeat(20);
    data.model = 'private provider model text';
    const { client } = fixture(data);
    const result = await client.judge(request);
    expect(result.outcome).toBe('value');
    expect(result.receipt.providerRequestId).toBeUndefined();
    expect(result.receipt.modelVersionStatus).toBe('unavailable');
    expect(result.receipt.estimatedCostUsd).toBeUndefined();
    expect(JSON.stringify(result.receipt)).not.toContain('private provider');
  });

  it('retains missing usage as unknown cost rather than claiming free execution', async () => {
    const data = responseData();
    Reflect.deleteProperty(data, 'usage');
    const { client } = fixture(data);
    const result = await client.judge(request);
    expect(result.outcome).toBe('value');
    expect(result.receipt).toMatchObject({ dispatched: true, completionUncertain: false });
    expect(result.receipt.usage).toBeUndefined();
    expect(result.receipt.estimatedCostUsd).toBeUndefined();
  });

  it('accounts for explicit input-only usage without requiring unused output counters', async () => {
    const data = responseData();
    Reflect.deleteProperty(data.usage, 'output_tokens');
    const { client } = fixture(data);
    const result = await client.judge(request);
    expect(result.outcome).toBe('value');
    expect(result.receipt.usage).toEqual({ inputTokens: 2_000, outputTokens: 0 });
    expect(result.receipt.estimatedCostUsd).toBe(0.0002);
  });

  it.each([undefined, -1, '2000', null])(
    'does not invent billable input usage from %s',
    async (inputTokens) => {
      const data = { ...responseData(), usage: { input_tokens: inputTokens } };
      const { client } = fixture(data);
      const result = await client.judge(request);
      expect(result.outcome).toBe('value');
      expect(result.receipt.usage).toBeUndefined();
      expect(result.receipt.estimatedCostUsd).toBeUndefined();
    },
  );

  it.each([
    [272_000, 0.0272],
    [272_001, 0.0544002],
  ])('applies the modeled long-context rate at %i input tokens', async (tokens, cost) => {
    const data = responseData();
    data.usage.input_tokens = tokens;
    const { client } = fixture(data);
    expect((await client.judge(request)).receipt.estimatedCostUsd).toBeCloseTo(cost, 10);
  });

  it('reports HTTP 429 as unadmitted without retrying even when Retry-After is present', async () => {
    const fetcher = vi.fn<FetchTransport>(
      async () =>
        new Response('', {
          status: 429,
          headers: { 'Retry-After': '1' },
        }),
    );
    const client = createOpenAiDecisionClient({ apiKey: 'fixture-only-key', fetch: fetcher });
    expect(await client.judge(request)).toMatchObject({
      outcome: 'unavailable',
      reason: 'openai_http_429',
      receipt: { dispatched: false, completionUncertain: false, httpStatus: 429 },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('retains bounded native HTTP error and cooldown metadata without replacing its outcome', async () => {
    const fetcher = vi.fn<FetchTransport>(async () =>
      Response.json(
        {
          error: {
            code: 'project_spend_limit_exceeded',
            type: 'insufficient_quota',
            message: 'Private diagnostic text must not be retained.',
          },
        },
        {
          status: 429,
          headers: {
            'x-request-id': 'req_native_decision_fixture',
            'Retry-After': '60',
            'x-ratelimit-remaining-requests': '0',
            'x-ratelimit-remaining-tokens': '12',
            'x-ratelimit-reset-requests': '1s',
            'x-ratelimit-reset-tokens': '1m30s',
          },
        },
      ),
    );
    const client = createOpenAiDecisionClient({ apiKey: 'fixture-only-key', fetch: fetcher });
    const result = await client.judge(request);
    expect(result).toMatchObject({
      outcome: 'unavailable',
      reason: 'openai_http_429',
      receipt: {
        dispatched: false,
        completionUncertain: false,
        providerRequestId: 'req_native_decision_fixture',
        providerErrorCode: 'project_spend_limit_exceeded',
        providerErrorType: 'insufficient_quota',
        retryAfterMs: 60_000,
        providerRateLimit: {
          remainingRequests: 0,
          remainingTokens: 12,
          resetRequestsMs: 1000,
          resetTokensMs: 90_000,
        },
      },
    });
    expect(JSON.stringify(result.receipt)).not.toContain('Private diagnostic text');
    expect(result.receipt.usage).toBeUndefined();
    expect(result.receipt.estimatedCostUsd).toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('retains rate-limit evidence from successful native responses for the caller’s pacing', async () => {
    const fetcher = vi.fn<FetchTransport>(async () =>
      Response.json(responseData(), {
        headers: {
          'x-ratelimit-remaining-requests': '2',
          'x-ratelimit-remaining-tokens': '60000',
          'x-ratelimit-reset-requests': '1s',
          'x-ratelimit-reset-tokens': '6m0s',
        },
      }),
    );
    const client = createOpenAiDecisionClient({ apiKey: 'fixture-only-key', fetch: fetcher });
    const result = await client.judge(request);
    expect(result.outcome).toBe('value');
    expect(result.receipt.providerRateLimit).toEqual({
      remainingRequests: 2,
      remainingTokens: 60000,
      resetRequestsMs: 1000,
      resetTokensMs: 360000,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([
    [400, 'invalid', false],
    [401, 'unavailable', false],
    [403, 'unavailable', false],
    [404, 'unavailable', false],
    [413, 'invalid', false],
    [422, 'invalid', false],
    [503, 'uncertain', true],
  ])(
    'classifies HTTP %i without retrying or inventing a charge',
    async (status, outcome, uncertain) => {
      const { client, fetcher } = fixture({ error: 'fixture provider failure' }, Number(status));
      const result = await client.judge(request);
      expect(result.outcome).toBe(outcome);
      expect(result.receipt).toMatchObject({
        dispatched: uncertain,
        completionUncertain: uncertain,
        httpStatus: status,
      });
      expect(result.receipt.estimatedCostUsd).toBeUndefined();
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );

  it('keeps timeout after dispatch uncertain and never automatically retries', async () => {
    // Isolate the post-dispatch timeout from host-load delays in preparation.
    // AbortSignal.timeout still uses its real timer; only the preparation clock is fixed.
    const now = vi.spyOn(Date, 'now').mockReturnValue(Date.now());
    try {
      const fetcher = vi.fn<FetchTransport>(
        async (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            const signal = init.signal;
            if (!signal) throw new Error('Expected a bounded request signal.');
            signal.addEventListener('abort', () => reject(signal.reason), { once: true });
          }),
      );
      const client = createOpenAiDecisionClient({
        apiKey: 'fixture-only-key',
        timeoutMs: 5,
        fetch: fetcher,
      });
      const result = await client.judge(request);
      expect(result).toMatchObject({
        outcome: 'uncertain',
        receipt: { dispatched: true, completionUncertain: true },
      });
      expect(result.receipt.estimatedCostUsd).toBeUndefined();
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally {
      now.mockRestore();
    }
  });

  it('stops waiting when an injected transport ignores cancellation and discards its late body', async () => {
    const cancel = vi.fn();
    let finish: ((response: Response) => void) | undefined;
    const controller = new AbortController();
    const fetcher = vi.fn<FetchTransport>(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const client = createOpenAiDecisionClient({ apiKey: 'fixture-only-key', fetch: fetcher });
    const pending = client.judge({ ...request, signal: controller.signal });
    controller.abort();
    const result = await pending;
    expect(result).toMatchObject({
      outcome: 'cancelled',
      receipt: { dispatched: true, completionUncertain: true },
    });
    if (!finish) throw new Error('Fixture transport was not dispatched.');
    finish(new Response(new ReadableStream({ cancel })));
    await Promise.resolve();
    expect(cancel).toHaveBeenCalledOnce();
    expect(result.receipt.httpStatus).toBeUndefined();
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('reports caller cancellation after dispatch without releasing uncertain completion', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<FetchTransport>(
      async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init.signal;
          if (!signal) throw new Error('Expected a bounded request signal.');
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
          controller.abort();
        }),
    );
    const client = createOpenAiDecisionClient({ apiKey: 'fixture-only-key', fetch: fetcher });
    const result = await client.judge({ ...request, signal: controller.signal });

    expect(result).toMatchObject({
      outcome: 'cancelled',
      reason: 'caller_cancelled',
      receipt: { dispatched: true, completionUncertain: true },
    });
    expect(result.receipt.usage).toBeUndefined();
    expect(result.receipt.estimatedCostUsd).toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('keeps the same deadline active while waiting for the response body', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(Date.now());
    try {
      const cancel = vi.fn();
      const fetcher = vi.fn<FetchTransport>(async () => {
        return new Response(
          new ReadableStream<Uint8Array>({
            cancel,
          }),
        );
      });
      const client = createOpenAiDecisionClient({
        apiKey: 'fixture-only-key',
        timeoutMs: 5,
        fetch: fetcher,
      });
      expect(await client.judge(request)).toMatchObject({
        outcome: 'uncertain',
        receipt: { dispatched: true, completionUncertain: true, httpStatus: 200 },
      });
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(cancel).toHaveBeenCalledOnce();
    } finally {
      now.mockRestore();
    }
  });

  it('rejects expired, cancelled, unconfigured and malformed requests before dispatch', async () => {
    const { client, fetcher } = fixture();
    expect(await client.judge({ ...request, deadlineMs: Date.now() - 1 })).toMatchObject({
      outcome: 'unavailable',
      reason: 'deadline_expired',
      receipt: { dispatched: false },
    });
    const controller = new AbortController();
    controller.abort();
    expect(await client.judge({ ...request, signal: controller.signal })).toMatchObject({
      outcome: 'cancelled',
      receipt: { dispatched: false, completionUncertain: false },
    });
    expect(await client.judge({ ...request, questions: {} })).toMatchObject({
      outcome: 'invalid',
      reason: 'invalid_questions',
      receipt: { dispatched: false },
    });
    for (const requestId of ['', 'x'.repeat(257)])
      expect(await client.judge({ ...request, requestId })).toMatchObject({
        outcome: 'invalid',
        reason: 'invalid_request_id',
        receipt: { dispatched: false },
      });
    for (const deadlineMs of [NaN, Infinity])
      expect(await client.judge({ ...request, deadlineMs })).toMatchObject({
        outcome: 'unavailable',
        reason: 'deadline_expired',
        receipt: { dispatched: false },
      });
    const questions: TypedQuestionMap = Object.fromEntries(
      Array.from({ length: 201 }, (_, i) => [`q_${i}`, { type: 'noul', instructions: 'Fixture?' }]),
    );
    expect(await client.judge({ ...request, questions })).toMatchObject({
      outcome: 'invalid',
      reason: 'decisions_question_limit',
      receipt: { dispatched: false },
    });
    const unconfigured = createOpenAiDecisionClient({ apiKey: '', fetch: fetcher });
    expect(await unconfigured.judge(request)).toMatchObject({
      outcome: 'unavailable',
      reason: 'provider_not_configured',
      receipt: { dispatched: false },
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
