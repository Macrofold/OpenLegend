import { describe, expect, it, vi } from 'vitest';
import { createNetworkOwner } from '@open-legend/network';
import {
  createMacrofoldDecisionClient,
  createMacrofoldGenerationClient,
  decodeJudge,
} from './index.js';
import type { FetchTransport, GenerateRequest, JudgeRequest } from './types.js';
import type { MacrofoldDecisionModel } from './macrofold-decision.js';

const request: JudgeRequest = {
  requestId: 'native-decision-fixture',
  state: { observation: 'I heard Mara promise one berry, then saw her hand it to me.' },
  questions: {
    noticed: { type: 'noul', instructions: 'Did I observe the promised berry transfer?' },
    status: {
      type: 'choice',
      instructions: 'Classify Mara’s promise.',
      criteria: { kept: 'The promised transfer happened.', unknown: 'Not enough evidence.' },
    },
    significance: {
      type: 'score',
      instructions: 'Rate this modest kept promise.',
      criteria: ['Routine event', 'Modest relationship evidence', 'Life-changing event'],
    },
  },
};
const raw = () => ({
  answers: {
    noticed: { type: 'noul', noul: 0.97 },
    status: {
      type: 'choice',
      choice: 'unknown',
      probabilities: { kept: 0.95, unknown: 0.05 },
      confidence: 0.9,
    },
    significance: {
      type: 'score',
      score: 1.05,
      probabilities: { '0': 0.1, '1': 0.75, '2': 0.15 },
      confidence: 0.75,
    },
  },
  usage: { input_tokens: 100, output_tokens: 3 },
});

function fixture(
  options: {
    value?: unknown;
    providerOutcome?: string;
    runId?: string;
    kind?: string;
    cost?: string;
    billingMode?: 'managed' | 'byok';
    missingUsage?: boolean;
    provisional?: boolean;
    providerReportedCostUsd?: number;
    recovery?: boolean;
    admitStatus?: number;
    admitCode?: string;
  } = {},
) {
  const paths: string[] = [];
  const bodies: unknown[] = [];
  const status = options.providerOutcome === 'uncertain' ? 'failed' : 'succeeded';
  const cost = options.cost ?? (options.billingMode === 'byok' ? '0' : '5');
  const result = {
    run_id: options.runId ?? 'run-fixture',
    final: true,
    execution_outcome: 'pending',
    persistence_status: 'not_required',
    inference: {
      outcome: options.providerOutcome === 'uncertain' ? 'uncertain' : 'value',
      provider_outcome: options.providerOutcome ?? 'responded',
      model_revision: 'microsoft/microsoft-decision-1-20261009',
      value: options.value ?? raw(),
      usage: {
        completeness: options.missingUsage ? 'missing' : 'complete',
        input_tokens: options.missingUsage ? null : '100',
        output_tokens: options.missingUsage ? null : '3',
        cached_input_tokens: options.missingUsage ? null : '0',
        cache_write_input_tokens: options.missingUsage ? null : '0',
      },
      billing: {
        billing_mode: options.billingMode ?? 'managed',
        charged_micro_usd: cost,
        budget_cost_micro_usd: options.missingUsage ? null : '5',
        reserved_micro_usd: '20000',
        reported_micro_usd: options.missingUsage ? null : '5',
        provisional: options.provisional ?? options.missingUsage ?? false,
        bound_breached: false,
        provider_cost_micro_usd: null,
        provider_cost_status: 'unavailable',
        provider_reported_cost_usd: options.providerReportedCostUsd ?? null,
        provider_reported_cost_status:
          options.providerReportedCostUsd === undefined ? 'unavailable' : 'reported',
        upstream_inference_cost_usd: null,
      },
      timings_ms: { provider: 87.25 },
    },
  };
  const accepted = {
    run_id: 'run-fixture',
    kind: options.kind ?? 'inference',
    status: 'running',
    session_id: null,
    worktree_id: null,
    wait_seconds: 0.025,
    urls: {
      status: '/v1/runs/run-fixture',
      result: '/v1/runs/run-fixture/result',
      events: '/v1/runs/run-fixture/events',
      stream: '/v1/runs/run-fixture/stream',
      cancel: '/v1/runs/run-fixture/cancel',
    },
  };
  const terminalReceipt = { ...accepted, status, result };
  const fetcher: FetchTransport = vi.fn(async (url, init) => {
    const path = new URL(url).pathname;
    paths.push(path);
    if (path === '/v1/inferences') {
      expect(new Headers(init.headers).has('Prefer')).toBe(false);
      bodies.push(JSON.parse(String(init.body)));
      if (options.admitStatus)
        return new Response(
          JSON.stringify({ error: { code: options.admitCode ?? 'invalid_request' } }),
          { status: options.admitStatus },
        );
      return options.recovery
        ? Response.json({ ...accepted, recovery_reason: 'in_progress' }, { status: 202 })
        : Response.json(terminalReceipt);
    }
    if (path === '/v1/runs/run-fixture')
      return Response.json({
        id: 'run-fixture',
        kind: options.kind ?? 'inference',
        status,
        cost_micro_usd: cost,
        started_at: '2026-10-15T10:00:00.000Z',
        completed_at: '2026-10-15T10:00:00.125Z',
        wait_seconds: 0.025,
      });
    if (path === '/v1/runs/run-fixture/result') return Response.json(result);
    throw new Error(`Unexpected fixture path ${path}`);
  });
  return { fetcher, paths, bodies, accepted, terminalReceipt };
}

function client(
  fetcher: FetchTransport,
  model: MacrofoldDecisionModel = 'microsoft/microsoft-decision-1',
  billingMode: 'managed' | 'byok' = 'managed',
) {
  return createMacrofoldDecisionClient({
    baseUrl: 'https://fixture.macrofold.invalid',
    apiKey: 'fixture-only-key',
    model,
    billingMode,
    maxCostUsd: 0.02,
    ...(billingMode === 'byok' ? { providerConnectionId: 'exact-openrouter-connection' } : {}),
    fetch: fetcher,
  });
}

describe('standalone Macrofold native decisions', () => {
  it('retains submitted offered order on tied scores while the caller changes its pending rubric', async () => {
    const mutable = structuredClone(request);
    const question = mutable.questions.status;
    if (!question || question.type !== 'choice') throw new Error('Fixture');
    question.criteria = { unknown: 'First offered', kept: 'Second offered' };
    const value = raw();
    value.answers.status.probabilities = { kept: 0.5, unknown: 0.5 };
    const f = fixture({ value });
    const fetcher: FetchTransport = async (url, init) => {
      await Promise.resolve();
      question.criteria = { kept: 'Changed pending rubric', unknown: 'Changed pending rubric' };
      return f.fetcher(url, init);
    };
    const result = await client(fetcher).judge(mutable);
    expect(result.outcome).toBe('value');
    if (result.outcome === 'value')
      expect(result.value.answers.status).toMatchObject({ choice: 'unknown' });
  });

  it('accepts native Microsoft choice and score without fabricating omitted confidence', async () => {
    const value = raw();
    const { confidence: choiceConfidence, ...status } = value.answers.status;
    const { confidence: scoreConfidence, ...significance } = value.answers.significance;
    const f = fixture({ value: { ...value, answers: { ...value.answers, status, significance } } });
    const result = await client(f.fetcher).judge(request);
    expect(result.outcome).toBe('value');
    if (result.outcome !== 'value') return;
    expect(result.value.answers['status']).toMatchObject({
      type: 'choice',
      choice: 'kept',
      probabilities: { kept: 0.95, unknown: 0.05 },
    });
    expect(result.value.answers['significance']).toMatchObject({ type: 'score', score: 1.05 });
    expect(result.value.answers['status']).not.toHaveProperty('confidence');
    expect(result.value.answers['significance']).not.toHaveProperty('confidence');
    expect(result.receipt.estimatedCostUsd).toBe(0.000005);
  });

  it('rejects provided nonnumeric or nonfinite confidence while allowing only omission', () => {
    for (const question of ['status', 'significance'] as const) {
      for (const confidence of [null, undefined, '0.9', NaN, Infinity]) {
        const value = raw();
        Object.defineProperty(value.answers[question], 'confidence', {
          value: confidence,
          enumerable: true,
        });
        expect(() => decodeJudge(value, request.questions)).toThrow();
      }
    }
  });

  it.each<MacrofoldDecisionModel>(['typesafe/jev-1.13', 'microsoft/microsoft-decision-1'])(
    'retains native question maps and score evidence for %s',
    async (model) => {
      const f = fixture();
      let finishAcceptance: (() => void) | undefined;
      const acceptance = new Promise<void>((resolve) => {
        finishAcceptance = resolve;
      });
      const accepted = vi.fn(() => acceptance);
      let returned = false;
      const pending = client(f.fetcher, model)
        .judge({ ...request, onAccepted: accepted })
        .then((result) => {
          returned = true;
          return result;
        });
      await vi.waitFor(() => expect(accepted).toHaveBeenCalledOnce());
      expect(returned).toBe(false);
      finishAcceptance?.();
      const result = await pending;
      expect(result.outcome).toBe('value');
      if (result.outcome !== 'value') return;
      expect(result.value.answers['status']).toMatchObject({
        choice: 'kept',
        probabilities: { kept: 0.95, unknown: 0.05 },
      });
      expect(result.value.answers['significance']).toMatchObject({
        score: 1.05,
        legend: { '1': 'Modest relationship evidence' },
      });
      expect(result.receipt).toMatchObject({
        estimatedCostUsd: 0.000005,
        completionUncertain: false,
        providerLatencyMs: 87.25,
        intermediaryQueueLatencyMs: 25,
        usage: { inputTokens: 100, outputTokens: 3 },
      });
      expect(result.receipt.intermediaryRunLatencyMs).toBeUndefined();
      expect(result.receipt.providerQueueLatencyMs).toBeUndefined();
      expect(accepted).toHaveBeenCalledExactlyOnceWith('run-fixture');
      expect(f.bodies).toEqual([
        expect.objectContaining({
          model_binding: { provider: 'openrouter', model, billing_mode: 'managed' },
          input: { state: request.state, questions: request.questions },
          limits: expect.objectContaining({ max_cost_micro_usd: '20000' }),
        }),
      ]);
      expect(f.paths).toEqual(['/v1/inferences']);
    },
  );

  it.each([false, true])(
    'binds exact BYOK credentials and retains its cost estimate (recovery: %s)',
    async (recovery) => {
      const f = fixture({ billingMode: 'byok', recovery });
      const result = await client(f.fetcher, undefined, 'byok').judge(request);
      expect(result.outcome).toBe('value');
      expect(result.receipt.estimatedCostUsd).toBe(0.000005);
      expect(result.receipt.providerReportedCostUsd).toBeUndefined();
      expect(f.paths).toEqual(
        recovery
          ? ['/v1/inferences', '/v1/runs/run-fixture', '/v1/runs/run-fixture/result']
          : ['/v1/inferences'],
      );
      expect(result.receipt.providerLatencyMs).toBe(87.25);
      expect(result.receipt.intermediaryRunLatencyMs).toBe(recovery ? 125 : undefined);
      expect(result.receipt.intermediaryQueueLatencyMs).toBe(25);
      expect(result.receipt.providerQueueLatencyMs).toBeUndefined();
      expect(f.bodies[0]).toMatchObject({
        model_binding: {
          provider_connection_id: 'exact-openrouter-connection',
          billing_mode: 'byok',
        },
      });
    },
  );

  it.each([
    { missingUsage: true },
    { provisional: true },
    { usagePatch: { input_tokens: '-1' } },
    { usagePatch: { cached_input_tokens: 'invalid' } },
    { usagePatch: { cached_input_tokens: '101' } },
    { omitUsage: true },
  ])('retains missing or unconfirmed BYOK billing as unknown: %j', async (options) => {
    const f = fixture({ ...options, billingMode: 'byok', providerReportedCostUsd: 0.03 });
    if ('usagePatch' in options)
      Object.assign(f.terminalReceipt.result.inference.usage, options.usagePatch);
    if ('omitUsage' in options) Reflect.deleteProperty(f.terminalReceipt.result.inference, 'usage');
    const result = await client(f.fetcher, undefined, 'byok').judge(request);
    expect(result.outcome).toBe('value');
    expect(result.receipt.estimatedCostUsd).toBeUndefined();
    expect(result.receipt.providerReportedCostUsd).toBe(0.03);
    if (!('provisional' in options)) expect(result.receipt.usage).toBeUndefined();
    expect(f.paths).toEqual(['/v1/inferences']);
  });

  it('records the charge before rejecting a malformed completed answer', async () => {
    const f = fixture({ value: { answers: {} } });
    const result = await client(f.fetcher).judge(request);
    expect(result.outcome).toBe('invalid');
    expect(result.receipt).toMatchObject({
      estimatedCostUsd: 0.000005,
      dispatched: true,
      completionUncertain: false,
    });
    expect(f.paths.filter((path) => path === '/v1/inferences')).toHaveLength(1);
  });

  it.each([{ runId: 'another-run' }, { kind: 'native_agent' }, { providerOutcome: 'uncertain' }])(
    'preserves an uncertain commitment for contradictory completion evidence: %j',
    async (options) => {
      const f = fixture(options);
      const result = await client(f.fetcher).judge(request);
      expect(result.outcome).toBe('uncertain');
      expect(result.receipt).toMatchObject({ dispatched: true, completionUncertain: true });
      expect(f.paths.filter((path) => path === '/v1/inferences')).toHaveLength(1);
    },
  );

  it('refuses streaming before any provider request', async () => {
    const f = fixture();
    const result = await client(f.fetcher).judge({ ...request, ...JSON.parse('{"stream":true}') });
    expect(result.outcome).toBe('invalid');
    expect(result.receipt.dispatched).toBe(false);
    expect(f.fetcher).not.toHaveBeenCalled();
  });

  it('marks definitive admission rejection as undispatched without retry', async () => {
    const f = fixture({ admitStatus: 402, admitCode: 'insufficient_credit' });
    const result = await client(f.fetcher).judge(request);
    expect(result.outcome).toBe('unavailable');
    expect(result).toMatchObject({ reason: 'insufficient_credit' });
    expect(result.receipt).toMatchObject({
      dispatched: false,
      completionUncertain: false,
      httpStatus: 402,
    });
    expect(f.fetcher).toHaveBeenCalledOnce();
  });

  it('does not repeat admission when the accepted-Run journal callback fails', async () => {
    const f = fixture();
    const result = await client(f.fetcher).judge({
      ...request,
      onAccepted: async () => {
        throw new Error('Fixture journal unavailable');
      },
    });
    expect(result.outcome).toBe('uncertain');
    expect(result.receipt.providerRequestId).toBe('run-fixture');
    expect(f.fetcher).toHaveBeenCalledOnce();
  });

  it('cancels the accepted Run when its journal callback cannot finish before the deadline', async () => {
    const f = fixture({ recovery: true });
    const paths: string[] = [];
    const fetcher: FetchTransport = async (url, init) => {
      const path = new URL(url).pathname;
      paths.push(path);
      return path.endsWith('/cancel') ? Response.json({}) : f.fetcher(url, init);
    };
    const result = await createMacrofoldDecisionClient({
      baseUrl: 'https://fixture.invalid',
      apiKey: 'fixture',
      model: 'typesafe/jev-1.13',
      billingMode: 'managed',
      maxCostUsd: 0.02,
      timeoutMs: 15,
      fetch: fetcher,
    }).judge({ ...request, onAccepted: async () => new Promise(() => {}) });
    expect(result).toMatchObject({
      outcome: 'uncertain',
      reason: 'deadline_exceeded',
      receipt: { providerRequestId: 'run-fixture', dispatched: true, completionUncertain: true },
    });
    expect(paths).toEqual(['/v1/inferences', '/v1/runs/run-fixture/cancel']);
  });

  it('cancels only the accepted Run and retains uncertainty after caller cancellation', async () => {
    const f = fixture();
    const controller = new AbortController();
    const fetcher: FetchTransport = vi.fn(async (url, init) => {
      if (new URL(url).pathname === '/v1/runs/run-fixture/cancel') return Response.json({});
      return f.fetcher(url, init);
    });
    const result = await client(fetcher).judge({
      ...request,
      signal: controller.signal,
      onAccepted: async () => controller.abort(),
    });
    expect(result.outcome).toBe('cancelled');
    expect(result.receipt).toMatchObject({ dispatched: true, completionUncertain: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(f.paths).toEqual(['/v1/inferences']);
  });

  it.each(['charge', 'usage', 'billing'] as const)(
    'preserves independently usable managed accounting when %s is malformed',
    async (malformed) => {
      const f = fixture({ cost: malformed === 'charge' ? '-1' : '30000' });
      if (malformed === 'usage') f.terminalReceipt.result.inference.usage.input_tokens = '-1';
      if (malformed === 'billing')
        Reflect.deleteProperty(f.terminalReceipt.result.inference, 'billing');
      const result = await client(f.fetcher).judge(request);
      expect(result.outcome).toBe('value');
      expect(result.receipt.estimatedCostUsd).toBe(malformed === 'usage' ? 0.03 : undefined);
      if (malformed === 'usage') expect(result.receipt.usage).toBeUndefined();
      else expect(result.receipt.usage).toMatchObject({ inputTokens: 100, outputTokens: 3 });
      expect(f.paths).toEqual(['/v1/inferences']);
    },
  );

  it('honors cancellation while observing the same accepted BYOK Run during recovery', async () => {
    const f = fixture({ billingMode: 'byok', recovery: true });
    const controller = new AbortController();
    const fetcher: FetchTransport = vi.fn(async (url, init) => {
      const path = new URL(url).pathname;
      if (path.endsWith('/cancel')) return Response.json({});
      if (path === '/v1/runs/run-fixture') controller.abort();
      return f.fetcher(url, init);
    });
    const result = await client(fetcher, undefined, 'byok').judge({
      ...request,
      signal: controller.signal,
    });
    expect(result.outcome).toBe('cancelled');
    expect(result.receipt.estimatedCostUsd).toBeUndefined();
    expect(f.paths).toEqual(['/v1/inferences', '/v1/runs/run-fixture']);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});

const generationRequest: GenerateRequest = {
  requestId: 'native-generation-fixture',
  task: 'synthetic-reaction',
  instructions: 'Choose a bounded response to the supplied fictional encounter.',
  context: { encounter: 'A friend thanked me for returning the borrowed basket.' },
  schema: {
    type: 'object',
    properties: { action: { type: 'string', enum: ['rest', 'speak'] } },
    required: ['action'],
    additionalProperties: false,
  },
  maxOutputTokens: 2048,
  reasoningEffort: 'medium',
};

function generationRaw(content = '{"action":"rest"}', finishReason = 'stop') {
  return {
    model: 'meta/muse-spark-1.3-contributor',
    choices: [{ finish_reason: finishReason, message: { content } }],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 3,
      completion_tokens_details: { reasoning_tokens: 2 },
      cost: 0.0000106,
    },
  };
}

function generationClient(fetcher: FetchTransport, billingMode: 'managed' | 'byok' = 'managed') {
  return createMacrofoldGenerationClient({
    baseUrl: 'https://fixture.macrofold.invalid',
    apiKey: 'fixture-only-key',
    model: 'meta/muse-spark-1.3-contributor',
    billingMode,
    ...(billingMode === 'byok' ? { providerConnectionId: 'exact-openrouter-connection' } : {}),
    maxCostUsd: 0.02,
    fetch: fetcher,
  });
}

function streamedGenerationFixture(interrupted = false) {
  const value = generationRaw();
  const f = fixture({ value, providerReportedCostUsd: 0.0000106 });
  const fetcher: FetchTransport = async (url, init) => {
    const response = await f.fetcher(url, init);
    if (new URL(url).pathname !== '/v1/inferences') return response;
    expect(new Headers(init.headers).has('Prefer')).toBe(false);
    const frame = (type: string, data: unknown) =>
      `data: ${JSON.stringify({ schema_version: 1, run_id: 'run-fixture', type, data })}\n\n`;
    return new Response(
      frame('run.accepted', { ...f.accepted, delivery: 'live' }) +
        (interrupted
          ? ''
          : frame('output.delta', { choice_index: 0, text: value.choices[0]!.message.content }) +
            frame('run.succeeded', f.terminalReceipt)),
      { headers: { 'content-type': 'text/event-stream' } },
    );
  };
  return { ...f, fetcher };
}

describe('standalone Macrofold schema generation', () => {
  it('awaits acceptance then delivers a terminal stream result while its original cancellation is pending', async () => {
    const f = streamedGenerationFixture();
    let finishAcceptance: () => void = () => {};
    let finishCleanup: () => void = () => {};
    const acceptance = new Promise<void>((resolve) => {
      finishAcceptance = resolve;
    });
    let noteAcceptance: () => void = () => {};
    const acceptanceStarted = new Promise<void>((resolve) => {
      noteAcceptance = resolve;
    });
    const cleanup = new Promise<void>((resolve) => {
      finishCleanup = resolve;
    });
    let cancellations = 0;
    const network = createNetworkOwner({
      role: 'fixture-terminal-stream',
      capacity: 1,
      fetch: async (url, init) => {
        const response = await f.fetcher(url, init);
        const text = await response.text();
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(text));
            },
            cancel() {
              cancellations++;
              return cleanup;
            },
          }),
          { headers: { 'content-type': 'text/event-stream' } },
        );
      },
    });
    const accepted = vi.fn(() => {
      noteAcceptance();
      return acceptance;
    });
    const api = createMacrofoldGenerationClient({
      baseUrl: 'https://fixture.macrofold.invalid',
      apiKey: 'fixture-only',
      model: 'meta/muse-spark-1.3-contributor',
      billingMode: 'managed',
      maxCostUsd: 0.02,
      network,
    });
    let completed = false;
    const pending = api
      .generate({ ...generationRequest, stream: true, onAccepted: accepted })
      .then((value) => {
        completed = true;
        return value;
      });
    await acceptanceStarted;
    expect(accepted).toHaveBeenCalledTimes(1);
    expect(completed).toBe(false);
    finishAcceptance();
    await expect(pending).resolves.toMatchObject({
      outcome: 'value',
      value: { action: 'rest' },
      receipt: { providerRequestId: 'run-fixture', completionUncertain: false },
    });
    expect(cancellations).toBe(1);
    expect(network.snapshot().occupied).toBe(1);
    finishCleanup();
    for (let index = 0; index < 15; index++) await Promise.resolve();
    expect(network.snapshot().occupied).toBe(0);
    expect(f.paths).toEqual(['/v1/inferences']);
  });

  it('records streamed acceptance once before observing output and validates the final value', async () => {
    const f = streamedGenerationFixture();
    const accepted = vi.fn(async () => {});
    const observedAcceptanceCounts: number[] = [];
    const result = await generationClient(f.fetcher).generate({
      ...generationRequest,
      stream: true,
      onAccepted: accepted,
      onProgress: () => observedAcceptanceCounts.push(accepted.mock.calls.length),
    });
    expect(result).toMatchObject({
      outcome: 'value',
      value: { action: 'rest' },
      receipt: {
        providerRequestId: 'run-fixture',
        completionUncertain: false,
        estimatedCostUsd: 0.000005,
        providerReportedCostUsd: 0.0000106,
      },
    });
    expect(accepted).toHaveBeenCalledExactlyOnceWith('run-fixture');
    expect(observedAcceptanceCounts.length).toBeGreaterThan(0);
    expect(observedAcceptanceCounts.every((count) => count === 1)).toBe(true);
    expect(f.bodies[0]).toMatchObject({ stream: true });
    expect(f.paths).toEqual(['/v1/inferences']);
  });

  it('observes the same accepted Run after a broken stream without another admission', async () => {
    const f = streamedGenerationFixture(true);
    const accepted = vi.fn(async () => {});
    const result = await generationClient(f.fetcher).generate({
      ...generationRequest,
      stream: true,
      onAccepted: accepted,
    });
    expect(result).toMatchObject({
      outcome: 'value',
      value: { action: 'rest' },
      receipt: { providerRequestId: 'run-fixture', completionUncertain: false },
    });
    expect(accepted).toHaveBeenCalledExactlyOnceWith('run-fixture');
    expect(f.paths).toEqual([
      '/v1/inferences',
      '/v1/runs/run-fixture',
      '/v1/runs/run-fixture/result',
    ]);
  });

  it('submits native OpenRouter chat and retains provider-reported cost separately', async () => {
    const f = fixture({ value: generationRaw(), providerReportedCostUsd: 0.0000106 });
    const accepted = vi.fn(async () => {});
    const result = await generationClient(f.fetcher).generate<{ action: string }>({
      ...generationRequest,
      onAccepted: accepted,
    });
    expect(result.outcome).toBe('value');
    if (result.outcome !== 'value') return;
    expect(result.value).toEqual({ action: 'rest' });
    expect(result.receipt).toMatchObject({
      providerRequestId: 'run-fixture',
      estimatedCostUsd: 0.000005,
      providerReportedCostUsd: 0.0000106,
      usage: { inputTokens: 100, outputTokens: 3, reasoningOutputTokens: 2 },
    });
    expect(accepted).toHaveBeenCalledExactlyOnceWith('run-fixture');
    expect(f.bodies).toEqual([
      expect.objectContaining({
        model_binding: {
          provider: 'openrouter',
          model: 'meta/muse-spark-1.3-contributor',
          billing_mode: 'managed',
        },
        input: {
          messages: [
            { role: 'system', content: generationRequest.instructions },
            { role: 'user', content: JSON.stringify(generationRequest.context) },
          ],
          max_tokens: 2048,
          reasoning: { effort: 'medium' },
          provider: { require_parameters: true },
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'synthetic-reaction',
              strict: true,
              schema: generationRequest.schema,
            },
          },
        },
        limits: expect.objectContaining({ max_output_tokens: 2048 }),
      }),
    ]);
    expect(f.paths).toEqual(['/v1/inferences']);
  });

  it.each([
    { schema: { type: 'object', properties: { action: { type: 'string' } } } },
    { model: 'another/model' },
    { maxOutputTokens: 0 },
    JSON.parse('{"stream":"invalid"}') as Record<string, unknown>,
    JSON.parse('{"reasoningEffort":"invented"}') as Record<string, unknown>,
  ])('rejects invalid generation configuration before admission: %j', async (change) => {
    const f = fixture({ value: generationRaw(), providerReportedCostUsd: 0.0000106 });
    const result = await generationClient(f.fetcher).generate({ ...generationRequest, ...change });
    expect(result.outcome).toBe('invalid');
    expect(result.receipt.dispatched).toBe(false);
    expect(f.fetcher).not.toHaveBeenCalled();
  });

  it.each([
    { content: 'unfinished {', finish: 'stop', reason: 'invalid_generation_json' },
    { content: '{"action":"invented"}', finish: 'stop', reason: 'generation_schema_mismatch' },
    { content: '{"action":"rest"}', finish: 'length', reason: 'generation_incomplete' },
  ])('records costs when generation cannot be used: %j', async ({ content, finish, reason }) => {
    const f = fixture({
      value: generationRaw(content, finish),
      providerReportedCostUsd: 0.0000106,
    });
    const result = await generationClient(f.fetcher).generate(generationRequest);
    expect(result).toMatchObject({ outcome: 'invalid', reason });
    expect(result.receipt).toMatchObject({
      estimatedCostUsd: 0.000005,
      providerReportedCostUsd: 0.0000106,
      completionUncertain: false,
    });
    expect(f.paths.filter((path) => path === '/v1/inferences')).toHaveLength(1);
  });

  it('preserves refusal and exact BYOK accounting through the shared lifecycle', async () => {
    const f = fixture({
      value: generationRaw('', 'content_filter'),
      billingMode: 'byok',
      providerReportedCostUsd: 0.0000106,
    });
    const result = await generationClient(f.fetcher, 'byok').generate(generationRequest);
    expect(result).toMatchObject({ outcome: 'refused', reason: 'provider_refused' });
    expect(result.receipt).toMatchObject({
      estimatedCostUsd: 0.000005,
      providerReportedCostUsd: 0.0000106,
      usage: { inputTokens: 100, outputTokens: 3, reasoningOutputTokens: 2 },
    });
    expect(f.bodies[0]).toMatchObject({
      model_binding: {
        provider_connection_id: 'exact-openrouter-connection',
        billing_mode: 'byok',
      },
    });
    expect(f.paths.filter((path) => path === '/v1/inferences')).toHaveLength(1);
  });

  it.each([false, true])(
    'does not repeat admission or failed acceptance recording (stream: %s)',
    async (stream) => {
      const f = stream
        ? streamedGenerationFixture()
        : fixture({ value: generationRaw(), providerReportedCostUsd: 0.0000106 });
      const accepted = vi.fn(async () => {
        throw new Error('Fixture journal unavailable');
      });
      const result = await generationClient(f.fetcher).generate({
        ...generationRequest,
        stream,
        onAccepted: accepted,
      });
      expect(result).toMatchObject({ outcome: 'uncertain' });
      expect(result.receipt.providerRequestId).toBe('run-fixture');
      expect(accepted).toHaveBeenCalledExactlyOnceWith('run-fixture');
      expect(f.paths).toEqual(['/v1/inferences']);
    },
  );
});
