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
    family: { id: 'base:swing', version: 1 },
    name: 'Fixture woven sling',
    description: 'A fixture proposal using a cord and woven pouch.',
    inputs: [
      { definitionId: 'cord', quantity: 1, role: 'binding' },
      { definitionId: 'prepared_fiber', quantity: 2, role: 'pouch' },
    ],
    output: { name: 'Fixture woven sling', description: 'A flexible pouch swings a stone.' },
    parameters: { workSeconds: 60, damage: 18, range: 7, accuracy: 0.8 },
  };
}

function inventedRecipes(world: WorldState) {
  return Object.values(world.recipes).filter(
    (recipe) => recipe.provenance.source !== 'world-authored',
  );
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
      return options.judge ? await options.judge(request) : judgment(request, 'base:swing');
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
  const searchParents = new Map<string, string>();
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
    async inventNew(id: string, text: string) {
      // A starting character now knows a world-authored method. With embeddings disabled,
      // explicitly choose Invent new after the normal search reports it is unavailable.
      let parentId = searchParents.get(id);
      if (!parentId) {
        const search = await director.submit('invention', `${id}:search`, text);
        if (!search.jobId) return search;
        await director.idle();
        expect((await store.getJob(search.jobId))?.invention?.code).toBe('search-unavailable');
        parentId = search.jobId;
        searchParents.set(id, parentId);
      }
      const result = await director.submit('invention', id, text, undefined, undefined, undefined, {
        parentId,
        action: 'new',
      });
      if (result.jobId) jobIds.set(id, result.jobId);
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
      judge: (request) => judgment(request, 'base:swing'),
    });
    expect(inventedRecipes(h.service.world)).toEqual([]);
    expect((await h.inventNew('invent-1', 'Make a cord-and-fiber sling.')).ok).toBe(true);
    await h.director.idle();
    expect((await h.job('invent-1'))?.status).toBe('completed');
    const [recipe] = inventedRecipes(h.service.world);
    expect(recipe?.provenance).toMatchObject({
      source: 'test-fixture',
      authority: { origin: 'player', policyRevision: 1 },
      model: 'openai-fixture',
    });
    expect(h.director.executionSource).toBe('test-fixture');
    expect(
      h.service.world.knowledge[PLAYER_ID]!.filter((record) => record.source === 'invented'),
    ).toHaveLength(1);
    expect(
      h.service.world.knowledge[NPC_ID]!.filter((record) => record.source === 'invented'),
    ).toHaveLength(0);
    expect(
      allItems(h.service.world).some((item) => item.definitionId === recipe?.outputDefinitionId),
    ).toBe(false);
    expect(h.calls.generations).toHaveLength(1);
  });

  it('prevents duplicate IDs from dispatching again and rejects changed input under the same ID', async () => {
    const wait = deferred<AiResult<JudgeValue>>();
    const h = await harness({ judge: () => wait.promise });
    await h.inventNew('same-id', 'A sling.');
    expect((await h.inventNew('same-id', 'A sling.')).ok).toBe(true);
    expect((await h.inventNew('same-id', 'A bow.')).code).toBe('idempotency-conflict');
    await expect.poll(() => h.calls.judges.length).toBe(1);
    wait.resolve(judgment(h.calls.judges[0]!, 'base:swing'));
    await h.director.idle();
    await h.inventNew('same-id', 'A sling.');
    await h.director.idle();
    expect(h.calls.judges).toHaveLength(1);
    expect(h.calls.generations).toHaveLength(1);
    expect(inventedRecipes(h.service.world)).toHaveLength(1);
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
    await h.inventNew('paused-late', 'A sling.');
    await started.promise;
    await h.service.control({ paused: true });
    wait.resolve(value(h.calls.generations[0]!.requestId, 'openai', slingFixture()));
    await Promise.resolve();
    await Promise.resolve();
    expect(inventedRecipes(h.service.world)).toEqual([]);
    await h.service.control({ paused: false });
    await h.director.idle();
    expect((await h.job('paused-late'))?.status).toBe('completed');
    expect(inventedRecipes(h.service.world)).toHaveLength(1);
    expect((await h.store.usage(h.config.budgetUsd)).usage.llmCalls).toBe(1);
    expect((await h.store.usage(h.config.budgetUsd)).budget.spentUsd).toBeGreaterThan(0);
  });

  it.each(['mechanics', 'quantity', 'hidden-material'] as const)(
    'rejects invalid declaration fixture: %s',
    async (fault) => {
      const draft = slingFixture();
      if (fault === 'mechanics') draft.parameters.damage = 999;
      if (fault === 'quantity') draft.inputs[0]!.quantity = 0;
      if (fault === 'hidden-material')
        draft.inputs.push({ definitionId: 'bone', quantity: 1, role: 'point' });
      const h = await harness({ generate: (request) => value(request.requestId, 'openai', draft) });
      const beforeItems = structuredClone(allItems(h.service.world));
      const beforeRecipes = structuredClone(h.service.world.recipes);
      const beforeKnowledge = structuredClone(h.service.world.knowledge[PLAYER_ID]);
      await h.inventNew(`invalid-${fault}`, 'A physical sling.');
      await h.director.idle();
      expect((await h.job(`invalid-${fault}`))?.status).toBe('failed');
      expect(h.service.world.recipes).toEqual(beforeRecipes);
      expect(allItems(h.service.world)).toEqual(beforeItems);
      expect(h.service.world.knowledge[PLAYER_ID]).toEqual(beforeKnowledge);
    },
  );

  it('fails without dispatch when the budget cannot reserve the next call', async () => {
    const h = await harness({ config: { budgetUsd: 0 } });
    await h.inventNew('budget-zero', 'A sling.');
    await h.director.idle();
    expect(h.calls.judges).toHaveLength(0);
    expect(h.calls.generations).toHaveLength(0);
    expect((await h.job('budget-zero'))?.message).toContain('usage allowance is used up');
  });

  it('cannot bypass the minimum reservation by lowering configured per-call reserves', async () => {
    const h = await harness({ config: { budgetUsd: 0.001, jevReserveUsd: 0.000001 } });
    await h.inventNew('budget-small', 'A sling.');
    await h.director.idle();
    expect(h.calls.judges).toHaveLength(0);
    expect((await h.job('budget-small'))?.status).toBe('failed');
  });

  it('stops before LLM when only the Jev call fits the budget', async () => {
    const h = await harness({ config: { budgetUsd: 0.1 } });
    await h.inventNew('budget-between', 'A sling.');
    await h.director.idle();
    expect(h.calls.judges).toHaveLength(1);
    expect(h.calls.generations).toHaveLength(0);
    expect(inventedRecipes(h.service.world)).toEqual([]);
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
    await h.inventNew('unknown-cost', 'A sling.');
    await h.director.idle();
    expect((await h.store.usage(h.config.budgetUsd)).budget.spentUsd).toBeGreaterThanOrEqual(
      h.config.jevReserveUsd,
    );
    expect(h.calls.judges).toHaveLength(1);
    expect(h.calls.generations).toHaveLength(0);
    expect(inventedRecipes(h.service.world)).toEqual([]);
  });

  it('does not call either provider without credentials or while paused', async () => {
    const h = await harness({ config: { jevKey: '', llmKey: '' } });
    expect((await h.inventNew('no-keys', 'A sling.')).code).toBe('unconfigured');
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
    expect((await h.inventNew('incapacitated-submit', 'A sling.')).code).toBe('actor');
    expect(h.calls.judges).toHaveLength(0);
    await h.change((world) => {
      world.entities[PLAYER_ID]!.actor!.incapacitated = false;
    });
    await h.inventNew('incapacitated-result', 'A sling.');
    await started.promise;
    await h.change((world) => {
      world.entities[PLAYER_ID]!.actor!.incapacitated = true;
    });
    wait.resolve(value(h.calls.generations[0]!.requestId, 'openai', slingFixture()));
    await h.director.idle();
    expect((await h.job('incapacitated-result'))?.status).toBe('stale');
    expect(inventedRecipes(h.service.world)).toEqual([]);
  });

  it('retrieves an older relevant recipe from 64 invented entries while bounding the supplied candidates', async () => {
    const h = await harness();
    let oldestId = '';
    for (let index = 0; index < 64; index++) {
      const draft = slingFixture() as unknown as DeclarationDraft;
      draft.name =
        index === 0 ? 'Ancient shellfish pearlweave sling' : `Fixture sling variant ${index}`;
      const admitted = await h.service.admit(draft, {
        requestId: `registry-fixture-${index}`,
        actorId: PLAYER_ID,
        source: 'test-fixture',
        authority: { origin: 'player', policyRevision: 1 },
      });
      expect(admitted.ok).toBe(true);
      if (index === 0) oldestId = inventedRecipes(h.service.world)[0]!.id;
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

  it('accepts only candidate naming for output, leaving real components to native compilation', () => {
    const output = (
      declarationSchema['properties'] as Record<string, { properties: Record<string, unknown> }>
    )['output']!;
    expect(Object.keys(output.properties).sort()).toEqual(['description', 'name']);
  });
});
