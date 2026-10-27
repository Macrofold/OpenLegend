import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNetworkOwner } from '@open-legend/network';
import { MacrofoldTransport, type TypedQuestionMap } from '@open-legend/ai';
import { testRepository, readConfig } from '../../../tests/fixtures/database.js';
import { enterLocalWorld } from '../../../tests/fixtures/service.js';
import { readModelTargetsConfig } from './generation-config.js';
import { readConfig as readApplicationConfig } from './config.js';
import { describeMacrofoldDeployment, ModelTargetPreparation } from './generation-targets.js';
import { decisionOrigin, decisionPolicyDigest } from './decision-task.js';
import { MacrofoldBackend } from './macrofold.js';
import { WorldService } from './world-service.js';

const workspace = '11111111-1111-4111-8111-111111111111';
const deployment = '22222222-2222-4222-8222-222222222222';
const revision = '33333333-3333-4333-8333-333333333333';
const target = { workspaceId: workspace, modelBinding: { deployment_id: deployment } };
const nativeCapabilities = {
  protocol: 'systemone',
  input_modalities: ['text'],
  chat_completions: false,
  json_object: false,
  json_schema: false,
  tools: false,
  streaming: false,
  stream_usage: false,
  schema_keywords: [],
  accepted_parameters: ['state', 'questions'],
  schema_dialect: null,
  context_window_tokens: 8192,
  max_output_tokens: 2048,
  max_concurrent_requests: 4,
};
const descriptor = {
  deployment_id: deployment,
  serving_revision_id: revision,
  state: 'ready',
  admission_open: true,
  ready_replicas: 1,
  capabilities: nativeCapabilities,
};
const targets = (judgment: unknown) =>
  JSON.stringify({ schema_version: 1, workspace_id: workspace, purposes: { judgment } });
const questions: TypedQuestionMap = {
  useful: { type: 'noul', instructions: 'Is shelter useful in rain?' },
  urgency: { type: 'score', instructions: 'Rate urgency.', criteria: ['Low', 'Moderate', 'High'] },
  action: {
    type: 'choice',
    instructions: 'Choose an offered action.',
    criteria: { enter: 'Enter shelter.', wait: 'Wait outside.' },
  },
};

afterEach(() => vi.unstubAllGlobals());

describe('configured native and chat model targets', () => {
  it('uses the existing configuration owner and labels native escalation with its selected model', () => {
    const raw = targets({ model_binding: target.modelBinding, max_output_tokens: 512 });
    const parsed = readModelTargetsConfig(raw)!;
    expect(Object.isFrozen(parsed.purposes.judgment?.model_binding)).toBe(true);
    const config = readConfig({ MACROFOLD_API_KEY: 'fixture', OPENLEGEND_MODEL_TARGETS_JSON: raw });
    expect(decisionOrigin(config)).toBe(`macrofold/deployment:${deployment}`);
    const ordinary = readApplicationConfig({
      OPEN_LEGEND_DATABASE_URL: 'postgresql://localhost/fixture_injected_repository',
      MACROFOLD_API_KEY: 'fixture',
      OPENLEGEND_MODEL_TARGETS_JSON: raw,
    });
    expect(ordinary.decisionEscalation.origins).toEqual([decisionOrigin(ordinary)]);
    const digest = decisionPolicyDigest(ordinary);
    ordinary.modelTargets = readModelTargetsConfig(
      targets({
        model_binding: { ...target.modelBinding, deployment_revision_id: revision },
        max_output_tokens: 512,
      }),
    );
    expect(decisionPolicyDigest(ordinary)).not.toBe(digest);
  });

  it('rejects chat output policy on a native target and refuses invalid supplied configuration', () => {
    expect(() =>
      readModelTargetsConfig(
        targets({ model_binding: target.modelBinding, structured_output: 'prompted_json' }),
      ),
    ).toThrow('structured_output');
    expect(() =>
      readModelTargetsConfig(targets({ model_binding: { deployment_id: 'missing' } })),
    ).toThrow();
    expect(() => readModelTargetsConfig(targets(undefined))).toThrow();
  });

  it('coalesces native preparation, reuses warm metadata and keeps chat/native protocols distinct', async () => {
    const fetcher = vi.fn(async () => Response.json(descriptor));
    vi.stubGlobal('fetch', fetcher);
    const api = new MacrofoldTransport('https://macrofold.fixture.invalid', 'fixture');
    const preparation = new ModelTargetPreparation((selected, operation) =>
      describeMacrofoldDeployment(api, selected, operation),
    );
    const owner = createNetworkOwner({ role: 'native-preparation-fixture', capacity: 4 });
    const prepare = () =>
      owner.run({ timeoutMs: 1000 }, (operation) =>
        preparation.prepareJudgment({ target, maxOutputTokens: 3000, operation }),
      );
    const results = await Promise.all([prepare(), prepare()]);
    expect(results[0]?.maxOutputTokens).toBe(2048);
    await prepare();
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(
      owner.run({ timeoutMs: 1000 }, (operation) =>
        preparation.prepare({
          target,
          schema: { type: 'object' },
          outputPolicy: 'auto',
          maxOutputTokens: 512,
          operation,
        }),
      ),
    ).rejects.toMatchObject({ code: 'unsupported_model_capability' });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each([{ admission_open: false }, { state: 'stopping' }, { ready_replicas: 0 }])(
    'does not prepare unavailable service metadata: %j',
    async (unavailable) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => Response.json({ ...descriptor, ...unavailable })),
      );
      const api = new MacrofoldTransport('https://macrofold.fixture.invalid', 'fixture');
      await expect(
        api.run({ timeoutMs: 1000 }, (operation) =>
          describeMacrofoldDeployment(api, target, operation),
        ),
      ).rejects.toMatchObject({ code: 'deployment_not_ready' });
    },
  );

  it.each([
    { retryAfter: '5', cooldownMs: 30_000 },
    { retryAfter: '60', cooldownMs: 60_000 },
  ])('honors the greater of the metadata cooldown and Retry-After: %j', async (timing) => {
    let now = 0;
    let available = false;
    const fetcher = vi.fn(async () =>
      available
        ? Response.json(descriptor)
        : Response.json(
            { error: { code: 'rate_limited' } },
            { status: 429, headers: { 'Retry-After': timing.retryAfter } },
          ),
    );
    vi.stubGlobal('fetch', fetcher);
    const api = new MacrofoldTransport('https://macrofold.fixture.invalid', 'fixture');
    const preparation = new ModelTargetPreparation(
      (selected, operation) => describeMacrofoldDeployment(api, selected, operation),
      () => now,
    );
    const prepare = () =>
      api.run({ timeoutMs: 1000 }, (operation) =>
        preparation.prepareJudgment({ target, maxOutputTokens: 512, operation }),
      );
    await expect(prepare()).rejects.toMatchObject({
      code: 'rate_limited',
      httpStatus: 429,
      retryAfterMs: Number(timing.retryAfter) * 1000,
    });
    available = true;
    for (const elapsed of [29_999, timing.cooldownMs - 1]) {
      now = elapsed;
      await expect(prepare()).rejects.toMatchObject({ code: 'rate_limited' });
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
    now = timing.cooldownMs;
    await expect(prepare()).resolves.toMatchObject({ maxOutputTokens: 512 });
    await prepare();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('retains a metadata Retry-After when an earlier inference reports a new revision', async () => {
    let now = 0;
    let throttled = false;
    let servingRevision = revision;
    const fetcher = vi.fn(async () =>
      throttled
        ? Response.json(
            { error: { code: 'rate_limited' } },
            { status: 429, headers: { 'Retry-After': '60' } },
          )
        : Response.json({ ...descriptor, serving_revision_id: servingRevision }),
    );
    vi.stubGlobal('fetch', fetcher);
    const api = new MacrofoldTransport('https://macrofold.fixture.invalid', 'fixture');
    const preparation = new ModelTargetPreparation(
      (selected, operation) => describeMacrofoldDeployment(api, selected, operation),
      () => now,
    );
    const prepare = () =>
      api.run({ timeoutMs: 1000 }, (operation) =>
        preparation.prepareJudgment({ target, maxOutputTokens: 512, operation }),
      );
    await prepare();
    preparation.invalidate(target);
    now = 30_000;
    throttled = true;
    await expect(prepare()).rejects.toMatchObject({ code: 'rate_limited' });
    now = 45_000;
    servingRevision = workspace;
    preparation.observeReceipt(target, {
      requestId: 'in-flight-native-fixture',
      provider: 'macrofold',
      requestedModel: `deployment:${deployment}`,
      model: `deployment:${deployment}`,
      modelVersionStatus: 'reported',
      macrofoldDeployment: { deploymentId: deployment, deploymentRevisionId: servingRevision },
      contextDigest: 'fixture',
      startedAt: '2026-10-24T00:00:00.000Z',
      completedAt: '2026-10-24T00:00:45.000Z',
      latencyMs: 45_000,
      dispatched: true,
      completionUncertain: false,
    });
    throttled = false;
    for (const elapsed of [45_000, 89_999]) {
      now = elapsed;
      await expect(prepare()).resolves.toMatchObject({ maxOutputTokens: 512 });
      expect(fetcher).toHaveBeenCalledTimes(2);
    }
    now = 90_000;
    await prepare();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});

describe('native decisions through the actual server adapter and durable journal', () => {
  it.each([false, true])(
    'preserves all named answers, binding and same-key replay (recovery=%s)',
    async (recovery) => {
      const config = readConfig({
        AI_BUDGET_USD: '1',
        MACROFOLD_API_KEY: 'fixture',
        MACROFOLD_BASE_URL: 'https://macrofold.fixture.invalid',
        OPENLEGEND_MODEL_TARGETS_JSON: targets({
          model_binding: { deployment_id: deployment, deployment_revision_id: revision },
          max_output_tokens: 512,
        }),
      });
      const store = await testRepository();
      const service = new WorldService(store, config);
      await enterLocalWorld(service);
      const bodies: Record<string, unknown>[] = [];
      const paths: string[] = [];
      let resultReads = 0;
      let serviceAvailable = true;
      const result = {
        run_id: 'native-fixture-run',
        final: true,
        execution_outcome: 'success',
        inference: {
          outcome: 'value',
          provider_outcome: 'responded',
          deployment: { deployment_id: deployment, deployment_revision_id: revision },
          cost_attribution: {
            basis: 'deployment',
            deployment_id: deployment,
            infrastructure_cost_included: false,
          },
          billing: {
            billing_mode: 'byok',
            charged_micro_usd: '0',
            budget_cost_micro_usd: '0',
            reported_micro_usd: '0',
            provisional: false,
          },
          usage: { completeness: 'missing', input_tokens: null, output_tokens: null },
          value: {
            latency_ms: 28.55,
            truncated: false,
            answers: {
              useful: { type: 'noul', noul: 0.83, confidence: 0.72 },
              urgency: {
                type: 'score',
                score: 1.4,
                probabilities: { '0': 0.1, '1': 0.4, '2': 0.5 },
              },
              action: {
                type: 'choice',
                choice: 'enter',
                probabilities: { enter: 0.8, wait: 0.2 },
                confidence: 0.6,
              },
            },
          },
        },
      };
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, init: RequestInit) => {
          const path = new URL(url).pathname;
          paths.push(path);
          if (path === `/v1/model-deployments/${deployment}`) {
            if (!serviceAvailable)
              throw new Error('An accepted Run must not rediscover its stopped deployment.');
            expect(new URL(url).searchParams.get('workspace_id')).toBe(workspace);
            return Response.json(descriptor);
          }
          if (path === '/v1/inferences') {
            bodies.push(JSON.parse(String(init.body)));
            return Response.json(
              {
                run_id: 'native-fixture-run',
                kind: 'inference',
                status: recovery ? 'running' : 'succeeded',
                ...(recovery ? {} : { result }),
                urls: {
                  status: '/v1/runs/native-fixture-run',
                  result: '/v1/runs/native-fixture-run/result',
                },
              },
              { status: recovery ? 202 : 200, headers: { 'Retry-After': '0.001' } },
            );
          }
          if (path === '/v1/runs/native-fixture-run')
            return Response.json({
              id: 'native-fixture-run',
              kind: 'inference',
              status: 'succeeded',
            });
          if (path === '/v1/runs/native-fixture-run/result') {
            if (++resultReads === 1)
              return Response.json({ run_id: 'native-fixture-run', final: false });
            return Response.json(result);
          }
          throw new Error(`Unexpected native fixture request: ${path}`);
        }),
      );
      try {
        const backend = new MacrofoldBackend(service);
        const request = { requestId: 'native-fixture', state: { weather: 'rain' }, questions };
        const observed = await backend.judge(request);
        expect(observed.outcome).toBe('value');
        if (observed.outcome !== 'value') return;
        expect(observed.value.answers).toMatchObject({
          useful: { noul: 0.83, confidence: 0.72 },
          urgency: { score: 1.4 },
          action: { choice: 'enter', confidence: 0.6 },
        });
        expect(observed.receipt).toMatchObject({
          requestedModel: `deployment:${deployment}`,
          macrofoldRequestedDeployment: {
            workspaceId: workspace,
            modelBinding: { deployment_id: deployment, deployment_revision_id: revision },
          },
          macrofoldDeployment: { deploymentId: deployment, deploymentRevisionId: revision },
          nativeLatencyMs: 28.55,
          nativeTruncated: false,
          estimatedCostUsd: 0,
          completionUncertain: false,
        });
        expect(bodies[0]).toEqual({
          workspace_id: workspace,
          model_binding: { deployment_id: deployment, deployment_revision_id: revision },
          input: { state: request.state, questions },
          limits: { max_cost_micro_usd: '0', max_output_tokens: 512, timeout_seconds: 35 },
          stream: false,
        });
        serviceAvailable = false;
        expect(await new MacrofoldBackend(service).judge(request)).toMatchObject({
          outcome: 'value',
        });
        expect(
          await new MacrofoldBackend(service).judge({ ...request, state: { weather: 'sun' } }),
        ).toMatchObject({ outcome: 'failed', receipt: { dispatched: false } });
        expect(bodies).toHaveLength(1);
        if (!recovery)
          expect(paths).toEqual([`/v1/model-deployments/${deployment}`, '/v1/inferences']);
        else expect(resultReads).toBeGreaterThanOrEqual(2);
      } finally {
        await store.close();
      }
    },
  );

  it.each(['disabled', 'denied', 'denied-inference', 'wrong-protocol', 'wrong-pin'])(
    'never submits native inference after %s',
    async (failure) => {
      const store = await testRepository();
      const config = readConfig({
        AI_BUDGET_USD: failure === 'disabled' ? '0' : '1',
        MACROFOLD_API_KEY: 'fixture',
        MACROFOLD_BASE_URL: 'https://macrofold.fixture.invalid',
        OPENLEGEND_MODEL_TARGETS_JSON: targets({
          model_binding: { deployment_id: deployment, deployment_revision_id: revision },
        }),
      });
      const service = new WorldService(store, config);
      await enterLocalWorld(service);
      const fetcher = vi.fn(async (url: string, init: RequestInit) => {
        expect(new Headers(init.headers).get('authorization')).toBe('Bearer fixture');
        if (failure === 'denied-inference' && new URL(url).pathname === '/v1/inferences') {
          expect(JSON.parse(String(init.body))).toMatchObject({
            workspace_id: workspace,
            model_binding: { deployment_id: deployment, deployment_revision_id: revision },
          });
          return Response.json({ error: { code: 'permission_denied' } }, { status: 403 });
        }
        expect(new URL(url).pathname).toBe(`/v1/model-deployments/${deployment}`);
        if (failure === 'denied')
          return Response.json({ error: { code: 'permission_denied' } }, { status: 403 });
        return Response.json({
          ...descriptor,
          ...(failure === 'wrong-pin' ? { serving_revision_id: workspace } : {}),
          ...(failure === 'wrong-protocol'
            ? { capabilities: { ...nativeCapabilities, protocol: 'openai_chat' } }
            : {}),
        });
      });
      vi.stubGlobal('fetch', fetcher);
      try {
        expect(
          await new MacrofoldBackend(service).judge({
            requestId: 'refused-fixture',
            state: {},
            questions,
          }),
        ).toMatchObject({
          outcome: 'unavailable',
          receipt: { dispatched: false, completionUncertain: false },
        });
        expect(fetcher).toHaveBeenCalledTimes(
          failure === 'disabled' ? 0 : failure === 'denied-inference' ? 2 : 1,
        );
      } finally {
        await store.close();
      }
    },
  );

  it('rechecks the gameplay owner after metadata before marking or submitting inference', async () => {
    const store = await testRepository();
    const config = readConfig({
      AI_BUDGET_USD: '1',
      MACROFOLD_API_KEY: 'fixture',
      MACROFOLD_BASE_URL: 'https://macrofold.fixture.invalid',
      OPENLEGEND_MODEL_TARGETS_JSON: targets({ model_binding: target.modelBinding }),
    });
    const service = new WorldService(store, config);
    await enterLocalWorld(service);
    let permitted = true;
    const current = service.privateReadFence('fixture-actor', () => permitted);
    const fetcher = vi.fn(async (url: string) => {
      expect(new URL(url).pathname).toBe(`/v1/model-deployments/${deployment}`);
      permitted = false;
      return Response.json(descriptor);
    });
    vi.stubGlobal('fetch', fetcher);
    try {
      const backend = new MacrofoldBackend(service);
      const request = { requestId: 'source-fenced-fixture', state: { weather: 'rain' }, questions };
      const observed = await backend.withSourceValidation(
        async () => {
          if (!current())
            throw new Error('The original gameplay permission ended during metadata.');
        },
        () => backend.judge(request),
      );
      expect(observed).toMatchObject({
        outcome: 'cancelled',
        receipt: { dispatched: false, completionUncertain: false },
      });
      expect(await new MacrofoldBackend(service).judge(request)).toMatchObject({
        outcome: 'cancelled',
        receipt: { dispatched: false },
      });
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally {
      await store.close();
    }
  });

  it('gives native inference only the original deadline left after cold metadata preparation', async () => {
    const store = await testRepository();
    const config = readConfig({
      AI_BUDGET_USD: '1',
      MACROFOLD_API_KEY: 'fixture',
      MACROFOLD_BASE_URL: 'https://macrofold.fixture.invalid',
      OPENLEGEND_MODEL_TARGETS_JSON: targets({ model_binding: target.modelBinding }),
    });
    const service = new WorldService(store, config);
    await enterLocalWorld(service);
    let wallNow = Date.now();
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => wallNow);
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      const path = new URL(url).pathname;
      if (path === `/v1/model-deployments/${deployment}`) {
        wallNow += 1000;
        return Response.json(descriptor);
      }
      expect(path).toBe('/v1/inferences');
      expect(JSON.parse(String(init.body))).toMatchObject({ limits: { timeout_seconds: 1 } });
      return Response.json({ error: { code: 'permission_denied' } }, { status: 403 });
    });
    vi.stubGlobal('fetch', fetcher);
    try {
      expect(
        await new MacrofoldBackend(service).judge({
          requestId: 'deadline-fixture',
          state: { weather: 'rain' },
          questions,
          deadlineMs: wallNow + 1500,
        }),
      ).toMatchObject({
        outcome: 'unavailable',
        receipt: { dispatched: false, completionUncertain: false },
      });
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      clock.mockRestore();
      await store.close();
    }
  });

  it('blocks unknown admission before rediscovering capacity or submitting another inference', async () => {
    const store = await testRepository();
    const config = readConfig({
      AI_BUDGET_USD: '1',
      MACROFOLD_API_KEY: 'fixture',
      MACROFOLD_BASE_URL: 'https://macrofold.fixture.invalid',
      OPENLEGEND_MODEL_TARGETS_JSON: targets({ model_binding: target.modelBinding }),
    });
    const service = new WorldService(store, config);
    await enterLocalWorld(service);
    const paths: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const path = new URL(url).pathname;
        paths.push(path);
        if (path === `/v1/model-deployments/${deployment}`) return Response.json(descriptor);
        if (path === '/v1/inferences') throw new TypeError('Synthetic admission response loss.');
        throw new Error(`Unexpected native fixture request ${path}`);
      }),
    );
    try {
      const request = { requestId: 'unknown-fixture', state: { weather: 'rain' }, questions };
      expect(await new MacrofoldBackend(service).judge(request)).toMatchObject({
        outcome: 'uncertain',
      });
      expect(await new MacrofoldBackend(service).judge(request)).toMatchObject({
        outcome: 'uncertain',
      });
      expect(paths).toEqual([`/v1/model-deployments/${deployment}`, '/v1/inferences']);
    } finally {
      await store.close();
    }
  });
});
