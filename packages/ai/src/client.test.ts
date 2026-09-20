import { describe, expect, it, vi } from 'vitest';
import { createAiClient, estimateCostUsd } from './index.js';
import type { FetchTransport, GenerateRequest, JudgeRequest } from './types.js';

const question: JudgeRequest = {
  requestId: 'judge-1',
  state: { observation: 'The helmet is rigid metal.' },
  questions: {
    route: {
      type: 'choice',
      instructions: 'Select a route using the supplied observation.',
      criteria: { native: 'Known capability', unknown: 'Insufficient information' },
    },
  },
};
const judgeResponse = () => ({
  model: 'jev-1.13.0',
  answers: {
    route: {
      type: 'choice',
      choice: 'native',
      probabilities: { native: 0.9, unknown: 0.1 },
      confidence: 0.8,
    },
  },
  usage: { input_tokens: 100, output_tokens: 20 },
});
const generation: GenerateRequest = {
  requestId: 'generate-1',
  task: 'thought',
  instructions: 'Produce a short thought from supplied observations.',
  context: { observations: ['hungry'] },
  schema: {
    type: 'object',
    properties: { text: { type: 'string' } },
    required: ['text'],
    additionalProperties: false,
  },
};
const generateResponse = (text = '{"text":"I should find food."}') => ({
  id: 'resp_123',
  model: 'gpt-5.6-luna',
  status: 'completed',
  output: [
    { type: 'reasoning', summary: [] },
    { type: 'message', content: [{ type: 'output_text', text }] },
  ],
  usage: {
    input_tokens: 100,
    output_tokens: 80,
    input_tokens_details: { cached_tokens: 20, cache_write_tokens: 30 },
    output_tokens_details: { reasoning_tokens: 10 },
  },
});
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const prices = {
  inputUsdPerMillion: 0.2,
  outputUsdPerMillion: 1.2,
  cachedInputUsdPerMillion: 0.02,
  cacheWriteInputUsdPerMillion: 0.25,
};

describe('provider boundary with injected HTTP fixtures (no live calls)', () => {
  it('sends the Jev contract and returns typed answers, digest, model, and explicit estimated usage cost', async () => {
    const fetcher = vi.fn<FetchTransport>(async () => response(judgeResponse()));
    const client = createAiClient({
      jev: {
        apiKey: 'fixture-secret',
        prices: { inputUsdPerMillion: 0.042, outputUsdPerMillion: 0 },
      },
      fetch: fetcher,
    });
    const result = await client.judge(question);
    expect(result.outcome).toBe('value');
    if (result.outcome !== 'value') throw new Error('Expected value');
    expect(result.value.answers.route).toMatchObject({ type: 'choice', choice: 'native' });
    expect(result.receipt).toMatchObject({
      requestedModel: 'jev-1.13.0',
      model: 'jev-1.13.0',
      modelVersionStatus: 'reported',
      dispatched: true,
      completionUncertain: false,
    });
    expect(result.receipt.estimatedCostUsd).toBeCloseTo(0.0000042, 12);
    expect(result.receipt.contextDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.typesafe.ai/v1/systemone');
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'jev-1.13.0',
      state: question.state,
      questions: question.questions,
    });
    expect(init.redirect).toBe('error');
    expect(JSON.stringify(result)).not.toContain('fixture-secret');
  });

  it('preserves an explicit unknown option for caller-specific abstention policy', async () => {
    const fixture = judgeResponse();
    fixture.answers.route.choice = 'unknown';
    fixture.answers.route.probabilities = { native: 0.1, unknown: 0.9 };
    const result = await createAiClient({
      jev: { apiKey: 'fixture' },
      fetch: async () => response(fixture),
    }).judge(question);
    expect(result.outcome).toBe('value');
    if (result.outcome === 'value')
      expect(result.value.answers.route).toMatchObject({ choice: 'unknown' });
  });

  it('supports score and noul without inventing Noul confidence or treating score as a physical value', async () => {
    const result = await createAiClient({
      jev: { apiKey: 'fixture' },
      fetch: async () =>
        response({
          model: 'jev-1.13.0',
          answers: {
            relevance: {
              type: 'score',
              score: 0.75,
              legend: { '0': 'Irrelevant', '1': 'Relevant' },
              probabilities: { '0': 0.25, '1': 0.75 },
              confidence: 0.3,
            },
            urgency: { type: 'noul', noul: 0.8 },
          },
        }),
    }).judge({
      ...question,
      questions: {
        relevance: {
          type: 'score',
          instructions: 'How relevant is this?',
          criteria: ['Irrelevant', 'Relevant'],
        },
        urgency: { type: 'noul', instructions: 'Is action urgent?' },
      },
    });
    expect(result.outcome).toBe('value');
    if (result.outcome === 'value')
      expect(result.value.answers.urgency).toEqual({ type: 'noul', noul: 0.8 });
    expect(result.receipt.usage).toBeUndefined();
    expect(result.receipt.estimatedCostUsd).toBeUndefined();
  });

  it.each(['missing', 'unexpected', 'out-of-range', 'distribution', 'contradictory'] as const)(
    'rejects malformed Jev answer: %s',
    async (defect) => {
      const fixture: Record<string, unknown> = judgeResponse();
      if (defect === 'missing') fixture.answers = {};
      else if (defect === 'unexpected')
        fixture.answers = {
          route: {
            type: 'choice',
            choice: 'invented',
            confidence: 1,
            probabilities: { native: 1, unknown: 0 },
          },
        };
      else if (defect === 'out-of-range')
        fixture.answers = {
          route: {
            type: 'choice',
            choice: 'native',
            confidence: 3,
            probabilities: { native: 1, unknown: 0 },
          },
        };
      else if (defect === 'contradictory')
        fixture.answers = {
          route: {
            type: 'choice',
            choice: 'native',
            confidence: 1,
            probabilities: { native: 0, unknown: 1 },
          },
        };
      else
        fixture.answers = {
          route: {
            type: 'choice',
            choice: 'native',
            confidence: 1,
            probabilities: { native: 0.2, unknown: 0.2 },
          },
        };
      const result = await createAiClient({
        jev: { apiKey: 'fixture' },
        fetch: async () => response(fixture),
      }).judge(question);
      expect(result.outcome).toBe('invalid');
    },
  );

  it('uses Responses strict JSON Schema, scans beyond reasoning output, and validates locally', async () => {
    const fetcher = vi.fn<FetchTransport>(async () => response(generateResponse()));
    const result = await createAiClient({
      openai: { apiKey: 'fixture', prices, reasoningEffort: 'low' },
      fetch: fetcher,
    }).generate<{ text: string }>(generation);
    expect(result.outcome).toBe('value');
    if (result.outcome === 'value') expect(result.value.text).toBe('I should find food.');
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: 'gpt-5.6-luna',
      store: false,
      service_tier: 'default',
      max_output_tokens: 2048,
      reasoning: { effort: 'low' },
      text: {
        format: { type: 'json_schema', strict: true, name: 'thought', schema: generation.schema },
      },
    });
    expect(result.receipt).toMatchObject({
      providerRequestId: 'resp_123',
      usage: {
        inputTokens: 100,
        outputTokens: 80,
        cachedInputTokens: 20,
        cacheWriteInputTokens: 30,
        reasoningOutputTokens: 10,
      },
    });
    expect(result.receipt.estimatedCostUsd).toBeCloseTo(0.0001139, 12);
  });

  it.each(['{"text":12}', '{"text":"hi","extra":true}', '```json\n{}\n```'])(
    'rejects invalid generated data: %s',
    async (text) => {
      const result = await createAiClient({
        openai: { apiKey: 'fixture' },
        fetch: async () => response(generateResponse(text)),
      }).generate(generation);
      expect(result.outcome).toBe('invalid');
      expect(result.receipt.usage?.outputTokens).toBe(80);
    },
  );

  it('permits explicit nulls and nullable branches without coercion or defaults', async () => {
    const nullable: GenerateRequest = {
      ...generation,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['launcher', 'ammo'],
        properties: {
          launcher: { type: ['string', 'null'] },
          ammo: {
            anyOf: [
              { type: 'null' },
              {
                type: 'object',
                additionalProperties: false,
                required: ['count'],
                properties: { count: { type: 'integer' } },
              },
            ],
          },
        },
      },
    };
    const result = await createAiClient({
      openai: { apiKey: 'fixture' },
      fetch: async () => response(generateResponse('{"launcher":null,"ammo":null}')),
    }).generate(nullable);
    expect(result).toMatchObject({ outcome: 'value', value: { launcher: null, ammo: null } });
  });

  it('returns refusals without exposing raw refusal text, and rejects incomplete output', async () => {
    const fixture: Record<string, unknown> = generateResponse();
    fixture.output = [
      { type: 'message', content: [{ type: 'refusal', refusal: 'private provider explanation' }] },
    ];
    const refusal = await createAiClient({
      openai: { apiKey: 'fixture' },
      fetch: async () => response(fixture),
    }).generate(generation);
    expect(refusal.outcome).toBe('refused');
    expect(JSON.stringify(refusal)).not.toContain('private provider');
    const incomplete = await createAiClient({
      openai: { apiKey: 'fixture' },
      fetch: async () => response({ ...generateResponse(), status: 'incomplete' }),
    }).generate(generation);
    expect(incomplete.outcome).toBe('invalid');
  });

  it('does not call HTTP when unconfigured, cancelled, expired, oversized, or schema invalid', async () => {
    const fetcher = vi.fn<FetchTransport>();
    expect((await createAiClient({ fetch: fetcher }).judge(question)).outcome).toBe('unavailable');
    const client = createAiClient({
      openai: { apiKey: 'fixture' },
      jev: { apiKey: 'fixture' },
      fetch: fetcher,
      maxRequestBytes: 1000,
    });
    const aborted = new AbortController();
    aborted.abort();
    expect((await client.judge({ ...question, signal: aborted.signal })).outcome).toBe('cancelled');
    expect((await client.judge({ ...question, deadlineMs: Date.now() - 1 })).outcome).toBe(
      'failed',
    );
    expect((await client.judge({ ...question, state: 'x'.repeat(1001) })).outcome).toBe('invalid');
    expect(
      (
        await client.generate({
          ...generation,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: { text: { $ref: 'https://example.com/schema' } },
            required: ['text'],
          },
        })
      ).outcome,
    ).toBe('invalid');
    expect((await client.generate({ ...generation, maxOutputTokens: 1_000_000 })).outcome).toBe(
      'invalid',
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('never retries ambiguous transport errors and sanitizes error details', async () => {
    const fetcher = vi.fn<FetchTransport>(async () => {
      throw new Error('Authorization: Bearer fixture-secret');
    });
    const result = await createAiClient({
      jev: { apiKey: 'fixture-secret' },
      fetch: fetcher,
    }).judge(question);
    expect(result.outcome).toBe('uncertain');
    expect(result.receipt.completionUncertain).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(JSON.stringify(result)).not.toContain('fixture-secret');
  });

  it.each([
    [401, 'unavailable'],
    [429, 'unavailable'],
    [422, 'invalid'],
    [503, 'uncertain'],
  ] as const)('classifies HTTP %s as %s without retries', async (status, outcome) => {
    const fetcher = vi.fn<FetchTransport>(async () =>
      response({ error: 'private details' }, status),
    );
    const result = await createAiClient({ jev: { apiKey: 'fixture' }, fetch: fetcher }).judge(
      question,
    );
    expect(result.outcome).toBe(outcome);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(JSON.stringify(result)).not.toContain('private details');
  });

  it('times out even when the transport ignores AbortSignal', async () => {
    const result = await createAiClient({
      jev: { apiKey: 'fixture' },
      timeoutMs: 15,
      fetch: () => new Promise(() => undefined),
    }).judge(question);
    expect(result.outcome).toBe('uncertain');
    expect(result.receipt.completionUncertain).toBe(true);
  });

  it('includes body reading in the deadline and cancels a stalled stream', async () => {
    const cancel = vi.fn();
    const result = await createAiClient({
      jev: { apiKey: 'fixture' },
      timeoutMs: 15,
      fetch: async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('{'));
            },
            cancel,
          }),
        ),
    }).judge(question);
    expect(result.outcome).toBe('uncertain');
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('caller cancellation after dispatch remains completion-uncertain', async () => {
    const controller = new AbortController();
    const client = createAiClient({
      jev: { apiKey: 'fixture' },
      fetch: async () => {
        controller.abort();
        return new Promise(() => undefined);
      },
    });
    const result = await client.judge({ ...question, signal: controller.signal });
    expect(result.outcome).toBe('cancelled');
    expect(result.receipt).toMatchObject({ dispatched: true, completionUncertain: true });
  });

  it('counts streamed bytes without trusting Content-Length', async () => {
    const result = await createAiClient({
      jev: { apiKey: 'fixture' },
      maxResponseBytes: 100,
      fetch: async () => new Response('x'.repeat(101), { headers: { 'content-length': '1' } }),
    }).judge(question);
    expect(result).toMatchObject({ outcome: 'invalid', reason: 'response_too_large' });
  });

  it('uses canonical context digests and different request digests when questions change', async () => {
    const client = createAiClient({
      jev: { apiKey: 'fixture' },
      fetch: async () => response(judgeResponse()),
    });
    const first = await client.judge({ ...question, state: { a: 1, b: 2 } });
    const second = await client.judge({
      ...question,
      state: { b: 2, a: 1 },
      questions: {
        route: {
          type: 'choice',
          instructions: 'A different routing rule.',
          criteria: { native: 'Known', unknown: 'Unknown' },
        },
      },
    });
    expect(first.receipt.contextDigest).toBe(second.receipt.contextDigest);
    expect(first.receipt.providerRequestDigest).not.toBe(second.receipt.providerRequestDigest);
  });
});

describe('explicit cost estimates', () => {
  it('does not turn absent prices, missing write rates, or malformed counters into free usage', () => {
    expect(estimateCostUsd({ inputTokens: 100, outputTokens: 50 }, undefined)).toBeUndefined();
    expect(
      estimateCostUsd(
        { inputTokens: 100, outputTokens: 50, cacheWriteInputTokens: 20 },
        { inputUsdPerMillion: 0.2, outputUsdPerMillion: 1.2 },
      ),
    ).toBeUndefined();
    expect(
      estimateCostUsd({ inputTokens: 100, outputTokens: 50, cachedInputTokens: 101 }, prices),
    ).toBeUndefined();
    expect(estimateCostUsd({ inputTokens: -1, outputTokens: 50 }, prices)).toBeUndefined();
    expect(
      estimateCostUsd(
        { inputTokens: 100, outputTokens: 50 },
        { inputUsdPerMillion: 0.042, outputUsdPerMillion: 0 },
      ),
    ).toBeCloseTo(0.0000042, 12);
  });
});
