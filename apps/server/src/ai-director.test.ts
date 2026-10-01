import { testRepository } from '../../../tests/fixtures/database.js';
import { enterLocalWorld } from '../../../tests/fixtures/service.js';
import { PLAYER_ID, NPC_ID } from '@open-legend/domain';
import { allItems } from '@open-legend/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AiClient,
  AiReceipt,
  AiResult,
  GenerateRequest,
  JudgeRequest,
  JudgeValue,
} from '@open-legend/ai';
import { type DeclarationDraft, type WorldState } from '@open-legend/domain';
import { AiDirector } from './ai-director.js';
import { buildContext } from './context.js';
import { declarationSchema } from './ai-schemas.js';
import type { AppConfig } from './config.js';
import { readConfig } from '../../../tests/fixtures/database.js';
import { WorldService } from './world-service.js';

// Explicit specimens for orchestration verification, never production seeds or evidence of model quality.
function slingFixture() {
  return {
    schemaVersion: 1,
    name: 'Fixture woven sling',
    description: 'A fixture proposal using a cord and woven pouch.',
    inputs: [
      { definitionId: 'cord', quantity: 1, role: 'binding' },
      { definitionId: 'prepared_fiber', quantity: 2, role: 'pouch' },
    ],
    workSeconds: 60,
    output: {
      kind: 'launcher',
      name: 'Fixture woven sling',
      description: 'A flexible pouch swings a stone.',
      properties: ['flexible'],
      launcher: {
        mechanism: 'swing',
        ammunitionKind: 'stone',
        damage: 18,
        range: 7,
        accuracy: 0.8,
      },
      ammunition: null,
    },
  };
}
function receipt(
  requestId: string,
  provider: 'jev' | 'openai',
  cost: number | undefined = 0.0001,
): AiReceipt {
  return {
    requestId,
    provider,
    requestedModel: `${provider}-fixture`,
    model: `${provider}-fixture`,
    modelVersionStatus: 'reported',
    contextDigest: 'fixture-context',
    startedAt: new Date(0).toISOString(),
    completedAt: new Date(1).toISOString(),
    latencyMs: 1,
    dispatched: true,
    completionUncertain: false,
    ...(cost === undefined ? {} : { estimatedCostUsd: cost }),
  };
}
function value<T>(requestId: string, provider: 'jev' | 'openai', result: T): AiResult<T> {
  return { outcome: 'value', value: result, receipt: receipt(requestId, provider) };
}
function judgment(request: JudgeRequest, selected: string): AiResult<JudgeValue> {
  const answers: JudgeValue['answers'] = {};
  for (const [name, question] of Object.entries(request.questions)) {
    if (question.type !== 'choice') throw new Error('Expected fixture Choice question');
    const legacyRoute = ['reply', 'deliberate', 'fast'].includes(selected) ? 'level2' : selected;
    const choice =
      name === 'admissibility'
        ? 'supported'
        : name === 'reflection'
          ? 'no'
          : name === 'route'
            ? Object.hasOwn(question.criteria, legacyRoute)
              ? legacyRoute
              : Object.hasOwn(question.criteria, 'level2')
                ? 'level2'
                : Object.keys(question.criteria)[0]!
            : Object.hasOwn(question.criteria, selected)
              ? selected
              : Object.hasOwn(question.criteria, 'yes')
                ? 'yes'
                : Object.keys(question.criteria)[0]!;
    answers[name] = {
      type: 'choice',
      choice,
      confidence: 0.95,
      probabilities: Object.fromEntries(
        Object.keys(question.criteria).map((key) => [key, key === choice ? 1 : 0]),
      ),
    };
  }
  return value(request.requestId, 'jev', {
    answers,
  });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const cleanup: (() => Promise<void>)[] = [];
// Fixtures must never reach a real provider through the global transport.
let network: ReturnType<typeof vi.fn>;
beforeEach(() => {
  network = vi.fn(async () => {
    throw new Error('network blocked in fixture');
  });
  vi.stubGlobal('fetch', network);
});
afterEach(async () => {
  try {
    for (const close of cleanup.splice(0)) await close();
    expect(network).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});

async function harness(
  options: {
    judge?: (request: JudgeRequest) => AiResult<JudgeValue> | Promise<AiResult<JudgeValue>>;
    generate?: (request: GenerateRequest) => AiResult<unknown> | Promise<AiResult<unknown>>;
    config?: Partial<AppConfig>;
  } = {},
) {
  const now = 10_000;
  const config = {
    ...readConfig({
      TYPESAFE_API_KEY: 'test-fixture-key',
      OPENAI_API_KEY: 'test-fixture-key',
      // The fixture client does not replace memory-recall embeddings, which otherwise inherit
      // OPENAI_API_KEY and send live background requests that race usage assertions.
      OPENAI_EMBEDDING_API_KEY: '',
      AI_BUDGET_USD: '1',
    }),
    ...options.config,
  };
  const store = await testRepository();
  const service = new WorldService(store, config, () => now);
  await enterLocalWorld(service);
  await service.setPresence('fixture-browser', true);
  const calls = { judges: [] as JudgeRequest[], generations: [] as GenerateRequest[] };
  const client: AiClient = {
    async judge(request) {
      calls.judges.push(request);
      return options.judge ? await options.judge(request) : judgment(request, 'swing');
    },
    async generate<T>(request: GenerateRequest): Promise<AiResult<T>> {
      calls.generations.push(request);
      return (
        options.generate
          ? await options.generate(request)
          : value(request.requestId, 'openai', slingFixture())
      ) as AiResult<T>;
    },
  };
  const director = new AiDirector(service, client, () => now);
  const jobIds = new Map<string, string>();
  cleanup.push(async () => {
    await director.close();
    await store.close();
  });
  async function change(edit: (world: WorldState) => void) {
    expect(
      (
        await service.transition((world) => {
          const next = structuredClone(world);
          edit(next);
          return {
            world: next,
            events: [],
            outcome: { ok: true, code: 'fixture', message: 'Fixture setup' },
          };
        })
      ).ok,
    ).toBe(true);
  }
  return {
    config,
    store,
    service,
    director,
    async submit(...args: Parameters<AiDirector['submit']>) {
      const result = await director.submit(...args);
      if (result.jobId) jobIds.set(args[1], result.jobId);
      return result;
    },
    job: (id: string) => store.getJob(jobIds.get(id) ?? id),
    calls,
    change,
  };
}

describe('AI director with explicit fixtures, no live calls', () => {
  it('admits a generated declaration with fixture provenance and private ownership', async () => {
    const h = await harness({
      judge: (request) => {
        const question = request.questions['route'];
        if (!question || question.type !== 'choice') throw new Error('Expected choice');
        const reuse = Object.keys(question.criteria).find((key) => key.startsWith('reuse:'));
        return judgment(request, reuse ?? 'swing');
      },
    });
    expect(h.service.world.recipes).toEqual({});
    expect((await h.submit('invention', 'invent-1', 'Make a cord-and-fiber sling.')).ok).toBe(true);
    await h.director.idle();
    expect((await h.job('invent-1'))?.status).toBe('completed');
    const [recipe] = Object.values(h.service.world.recipes);
    expect(recipe?.provenance).toMatchObject({
      source: 'test-fixture',
      authority: { origin: 'player', policyRevision: 1 },
      model: 'openai-fixture',
    });
    expect(h.director.executionSource).toBe('test-fixture');
    expect(h.service.world.knowledge[PLAYER_ID]).toHaveLength(1);
    expect(h.service.world.knowledge[NPC_ID]).toHaveLength(0);
    expect(
      allItems(h.service.world).some((item) => item.definitionId === recipe?.outputDefinitionId),
    ).toBe(false);
    expect(h.calls.generations).toHaveLength(1);
  });

  it('prevents duplicate IDs from dispatching again and rejects changed input under the same ID', async () => {
    const wait = deferred<AiResult<JudgeValue>>();
    const h = await harness({ judge: () => wait.promise });
    await h.submit('invention', 'same-id', 'A sling.');
    expect((await h.submit('invention', 'same-id', 'A sling.')).ok).toBe(true);
    expect((await h.submit('invention', 'same-id', 'A bow.')).code).toBe('idempotency-conflict');
    await expect.poll(() => h.calls.judges.length).toBe(1);
    wait.resolve(judgment(h.calls.judges[0]!, 'swing'));
    await h.director.idle();
    await h.submit('invention', 'same-id', 'A sling.');
    await h.director.idle();
    expect(h.calls.judges).toHaveLength(1);
    expect(h.calls.generations).toHaveLength(1);
    expect(Object.keys(h.service.world.recipes)).toHaveLength(1);
  });

  it('holds a late explicit result while paused and admits it only after resume', async () => {
    const wait = deferred<AiResult<unknown>>();
    const started = deferred<void>();
    const h = await harness({
      generate: () => {
        started.resolve();
        return wait.promise;
      },
    });
    await h.submit('invention', 'paused-late', 'A sling.');
    await started.promise;
    await h.service.control({ paused: true });
    wait.resolve(value(h.calls.generations[0]!.requestId, 'openai', slingFixture()));
    await Promise.resolve();
    await Promise.resolve();
    expect(h.service.world.recipes).toEqual({});
    await h.service.control({ paused: false });
    await h.director.idle();
    expect((await h.job('paused-late'))?.status).toBe('completed');
    expect(Object.keys(h.service.world.recipes)).toHaveLength(1);
    expect((await h.store.usage(h.config.budgetUsd)).usage.llmCalls).toBe(1);
    expect((await h.store.usage(h.config.budgetUsd)).budget.spentUsd).toBeGreaterThan(0);
  });

  it.each(['mechanics', 'quantity', 'hidden-material'] as const)(
    'rejects invalid declaration fixture: %s',
    async (fault) => {
      const draft = slingFixture();
      if (fault === 'mechanics') draft.output.launcher.damage = 999;
      if (fault === 'quantity') draft.inputs[0]!.quantity = 0;
      if (fault === 'hidden-material')
        draft.inputs.push({ definitionId: 'bone', quantity: 1, role: 'point' });
      const h = await harness({ generate: (request) => value(request.requestId, 'openai', draft) });
      const beforeItems = structuredClone(allItems(h.service.world));
      await h.submit('invention', `invalid-${fault}`, 'A physical sling.');
      await h.director.idle();
      expect((await h.job(`invalid-${fault}`))?.status).toBe('failed');
      expect(h.service.world.recipes).toEqual({});
      expect(allItems(h.service.world)).toEqual(beforeItems);
      expect(h.service.world.knowledge[PLAYER_ID]).toEqual([]);
    },
  );

  it('fails without dispatch when the budget cannot reserve the next call', async () => {
    const h = await harness({ config: { budgetUsd: 0 } });
    await h.submit('invention', 'budget-zero', 'A sling.');
    await h.director.idle();
    expect(h.calls.judges).toHaveLength(0);
    expect(h.calls.generations).toHaveLength(0);
    expect((await h.job('budget-zero'))?.message).toContain('usage allowance is used up');
  });

  it('cannot bypass the minimum reservation by lowering configured per-call reserves', async () => {
    const h = await harness({ config: { budgetUsd: 0.001, jevReserveUsd: 0.000001 } });
    await h.submit('invention', 'budget-small', 'A sling.');
    await h.director.idle();
    expect(h.calls.judges).toHaveLength(0);
    expect((await h.job('budget-small'))?.status).toBe('failed');
  });

  it('stops before LLM when only the Jev call fits the budget', async () => {
    const h = await harness({ config: { budgetUsd: 0.1 } });
    await h.submit('invention', 'budget-between', 'A sling.');
    await h.director.idle();
    expect(h.calls.judges).toHaveLength(1);
    expect(h.calls.generations).toHaveLength(0);
    expect(h.service.world.recipes).toEqual({});
  });

  it('consumes the reservation for unknown completion and sends no automatic retries', async () => {
    const h = await harness({
      judge: (request) => ({
        outcome: 'uncertain',
        reason: 'fixture_timeout',
        receipt: {
          ...receipt(request.requestId, 'jev'),
          estimatedCostUsd: undefined,
          completionUncertain: true,
        },
      }),
    });
    await h.submit('invention', 'unknown-cost', 'A sling.');
    await h.director.idle();
    expect((await h.store.usage(h.config.budgetUsd)).budget.spentUsd).toBeGreaterThanOrEqual(
      h.config.jevReserveUsd,
    );
    expect(h.calls.judges).toHaveLength(1);
    expect(h.calls.generations).toHaveLength(0);
    expect(h.service.world.recipes).toEqual({});
  });

  it('does not call either provider without credentials or while paused', async () => {
    const h = await harness({ config: { jevKey: '', llmKey: '' } });
    expect((await h.submit('invention', 'no-keys', 'A sling.')).code).toBe('unconfigured');
    h.director.considerThought();
    await h.service.control({ paused: true });
    expect((await h.submit('chat', 'pause', 'Hello.')).code).toBe('paused');
    await h.director.idle();
    expect(h.calls.judges).toHaveLength(0);
    expect(h.calls.generations).toHaveLength(0);
  });

  it('rejects an incapacitated inventor before dispatch and again on a late result', async () => {
    const wait = deferred<AiResult<unknown>>();
    const started = deferred<void>();
    const h = await harness({
      generate: () => {
        started.resolve();
        return wait.promise;
      },
    });
    await h.change((world) => {
      world.entities[PLAYER_ID]!.actor!.incapacitated = true;
    });
    expect((await h.submit('invention', 'incapacitated-submit', 'A sling.')).code).toBe('actor');
    expect(h.calls.judges).toHaveLength(0);
    await h.change((world) => {
      world.entities[PLAYER_ID]!.actor!.incapacitated = false;
    });
    await h.submit('invention', 'incapacitated-result', 'A sling.');
    await started.promise;
    await h.change((world) => {
      world.entities[PLAYER_ID]!.actor!.incapacitated = true;
    });
    wait.resolve(value(h.calls.generations[0]!.requestId, 'openai', slingFixture()));
    await h.director.idle();
    expect((await h.job('incapacitated-result'))?.status).toBe('stale');
    expect(h.service.world.recipes).toEqual({});
  });

  it('retrieves an older relevant recipe from all 64 known entries while bounding the supplied candidates', async () => {
    const h = await harness();
    let oldestId = '';
    for (let index = 0; index < 64; index++) {
      const draft = slingFixture() as unknown as DeclarationDraft;
      delete draft.output.ammunition;
      draft.name =
        index === 0 ? 'Ancient shellfish pearlweave sling' : `Fixture sling variant ${index}`;
      const admitted = await h.service.admit(draft, {
        requestId: `registry-fixture-${index}`,
        actorId: PLAYER_ID,
        source: 'test-fixture',
        authority: { origin: 'player', policyRevision: 1 },
      });
      expect(admitted.ok).toBe(true);
      if (index === 0) oldestId = Object.keys(h.service.world.recipes)[0]!;
    }
    const context = buildContext(
      h.service,
      PLAYER_ID,
      'Please reuse the ancient shellfish pearlweave technique.',
    );
    expect(context.knownRecipes).toHaveLength(24);
    expect(context.knownRecipes[0]!.id).toBe(oldestId);
    expect(h.calls.judges).toHaveLength(0);
    expect(h.calls.generations).toHaveLength(0);
  });

  it('permits shaft as a declared material property while preserving the finite contract', () => {
    const properties = declarationSchema['properties'] as Record<
      string,
      { properties: Record<string, { items: { enum: string[] } }> }
    >;
    expect(properties['output']!.properties['properties']!.items.enum).toContain('shaft');
    expect(properties['output']!.properties['properties']!.items.enum).not.toContain('food');
  });
});
