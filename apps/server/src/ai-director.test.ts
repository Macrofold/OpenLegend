import { allItems, setSpatialPosition, worldSupport } from '@open-legend/domain';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  AiClient,
  AiReceipt,
  AiResult,
  GenerateRequest,
  JudgeRequest,
  JudgeValue,
} from '@open-legend/ai';
import { mindFor, remember, type DeclarationDraft, type WorldState } from '@open-legend/domain';
import { AiDirector } from './ai-director.js';
import { buildContext } from './context.js';
import { declarationSchema } from './ai-schemas.js';
import { readConfig, type AppConfig } from './config.js';
import { SqliteStore } from './store.js';
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
const speechFixture = (speech: string) => ({ speech });
const actionFixture = (actionId: string | null) => ({ actionId });
function offeredAction(request: GenerateRequest, text: string): string | null {
  const actions = (request.context as { actions?: Array<{ id: string; description: string }> })
    .actions;
  return actions?.find((action) => action.description.toLowerCase().includes(text))?.id ?? null;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const cleanup: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});

async function harness(
  options: {
    judge?: (request: JudgeRequest) => AiResult<JudgeValue> | Promise<AiResult<JudgeValue>>;
    generate?: (request: GenerateRequest) => AiResult<unknown> | Promise<AiResult<unknown>>;
    config?: Partial<AppConfig>;
  } = {},
) {
  let now = 10_000;
  const config = {
    ...readConfig({
      TYPESAFE_API_KEY: 'test-fixture-key',
      OPENAI_API_KEY: 'test-fixture-key',
      AI_BUDGET_USD: '1',
    }),
    ...options.config,
  };
  const store = new SqliteStore(':memory:');
  const service = new WorldService(store, config, () => now);
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
    calls,
    change,
    async advanceClock(ms: number) {
      now += ms;
      await service.setPresence('fixture-browser', true);
    },
  };
}

describe('AI director with explicit fixtures, no live calls', () => {
  it('admits a generated sling, labels fixture provenance, and reuses its paraphrase without a second generation', async () => {
    const h = await harness({
      judge: (request) => {
        const question = request.questions['route'];
        if (!question || question.type !== 'choice') throw new Error('Expected choice');
        const reuse = Object.keys(question.criteria).find((key) => key.startsWith('reuse:'));
        return judgment(request, reuse ?? 'swing');
      },
    });
    expect(h.service.world.recipes).toEqual({});
    expect(
      (await h.director.submit('invention', 'invent-1', 'Make a cord-and-fiber sling.')).ok,
    ).toBe(true);
    await h.director.idle();
    expect((await h.store.getJob('invent-1'))?.status).toBe('completed');
    const [recipe] = Object.values(h.service.world.recipes);
    expect(recipe?.provenance).toMatchObject({
      source: 'test-fixture',
      authority: { origin: 'player', policyRevision: 1 },
      model: 'openai-fixture',
    });
    expect(h.director.executionSource).toBe('test-fixture');
    expect(h.service.world.knowledge['player']).toHaveLength(1);
    expect(h.service.world.knowledge['ada']).toHaveLength(0);
    expect(
      allItems(h.service.world).some((item) => item.definitionId === recipe?.outputDefinitionId),
    ).toBe(false);
    expect(
      (
        await h.director.submit(
          'invention',
          'invent-2',
          'Use that same woven pouch and cord to throw a pebble.',
        )
      ).ok,
    ).toBe(true);
    await h.director.idle();
    expect((await h.store.getJob('invent-2'))?.result).toEqual({ reusedRecipeId: recipe!.id });
    expect(h.calls.judges).toHaveLength(2);
    expect(h.calls.generations).toHaveLength(1);
    expect(Object.keys(h.service.world.recipes)).toHaveLength(1);
  });

  it('uses relevant private memory in scoped conversation and refreshes observations after judging', async () => {
    const wait = deferred<AiResult<JudgeValue>>();
    const h = await harness({
      judge: (request) => (request.questions['route'] ? judgment(request, 'level2') : wait.promise),
      generate: (request) =>
        value(request.requestId, 'openai', speechFixture('I remember your offer of berries.')),
    });
    await h.change((world) => {
      const inner = world.innerWorlds!.ada!;
      inner.files.push({
        path: 'berries.md',
        text: 'Berries\n\nBerries would help me trust the newcomer.',
      });
      inner.text += '\n\n# berries.md\nBerries\n\nBerries would help me trust the newcomer.';
      inner.revision++;
    });
    await h.service.transition((world) =>
      remember(world, 'player', {
        kind: 'reflection',
        source: 'inferred',
        summary: 'PLAYER_PRIVATE_SECRET_724',
        importance: 10,
        entityIds: [],
      }),
    );
    await h.change((world) => {
      world.entities['player']!.actor!.agency.goals[0]!.objective = 'PLAYER_PRIVATE_GOAL_839';
    });
    await h.director.submit('chat', 'chat-1', 'Do you remember the berries?');
    await h.change((world) => {
      world.entities['ada']!.actor!.fullness = 25;
    });
    wait.resolve(judgment(h.calls.judges[0]!, 'yes'));
    await h.director.idle();
    const context = h.calls.generations[0]!.context as Record<string, unknown>;
    expect(context['body']).toContain('very hungry');
    expect(JSON.stringify(context)).toContain('Berries would help');
    expect(JSON.stringify(context)).not.toContain('PLAYER_PRIVATE_SECRET_724');
    expect(JSON.stringify(context)).not.toContain('PLAYER_PRIVATE_GOAL_839');
    expect(mindFor(h.service.world, 'ada').thoughts).toHaveLength(0);
    expect(
      h.service.world.memories['player']!.some((memory) =>
        memory.summary.includes('may keep their berry promise'),
      ),
    ).toBe(false);
    expect(
      h.service.world.events.some((event) => event.type === 'speech' && event.actorId === 'ada'),
    ).toBe(true);
  });

  it('executes known player actions with zero AI and admits a generated NPC action from offered IDs', async () => {
    const h = await harness({
      judge: (request) => judgment(request, 'level2'),
      generate: (request) =>
        value(
          request.requestId,
          'openai',
          actionFixture(offeredAction(request, 'rest to recover')),
        ),
    });
    expect(
      (
        await h.service.command('native-rest', {
          type: 'status-effect',
          definitionId: 'rest',
          targetId: 'player',
          effectOperation: 'activate',
        })
      ).ok,
    ).toBe(true);
    expect(h.calls.judges).toHaveLength(0);
    h.director.considerThought();
    await h.director.idle();
    expect(h.service.world.entities['ada']!.actor!.action?.type).toBe('rest');
    expect(h.calls.judges.length).toBeGreaterThan(0);
    expect(h.calls.generations).toHaveLength(1);
  });

  it('uses generation for a routed semantic action without writing an immediate reflection', async () => {
    const h = await harness({
      judge: (request) => judgment(request, 'level2'),
      generate: (request) =>
        value(
          request.requestId,
          'openai',
          actionFixture(offeredAction(request, 'rest to recover')),
        ),
    });
    h.director.considerThought();
    await h.director.idle();
    expect(h.calls.generations).toHaveLength(1);
    expect(mindFor(h.service.world, 'ada').thoughts).toHaveLength(0);
    expect(h.service.world.entities['ada']!.actor!.action?.type).toBe('rest');
    expect(h.service.world.memories['ada']!.some((memory) => memory.source === 'inferred')).toBe(
      false,
    ); // Thoughts are presentation, not recalled experiences.
  });

  it('does not let an invented action identifier execute a command', async () => {
    const h = await harness({
      judge: (request) => judgment(request, 'level2'),
      generate: (request) => value(request.requestId, 'openai', actionFixture('grant-all-items')),
    });
    const before = structuredClone(h.service.world);
    h.director.considerThought();
    await h.director.idle();
    expect(h.service.world).toEqual(before);
  });

  it('prevents duplicate IDs from dispatching again and rejects changed input under the same ID', async () => {
    const wait = deferred<AiResult<JudgeValue>>();
    const h = await harness({ judge: () => wait.promise });
    await h.director.submit('invention', 'same-id', 'A sling.');
    expect((await h.director.submit('invention', 'same-id', 'A sling.')).ok).toBe(true);
    expect((await h.director.submit('invention', 'same-id', 'A bow.')).code).toBe(
      'idempotency-conflict',
    );
    expect(h.calls.judges).toHaveLength(1);
    wait.resolve(judgment(h.calls.judges[0]!, 'swing'));
    await h.director.idle();
    await h.director.submit('invention', 'same-id', 'A sling.');
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
    await h.director.submit('invention', 'paused-late', 'A sling.');
    await started.promise;
    await h.service.control({ paused: true });
    wait.resolve(value(h.calls.generations[0]!.requestId, 'openai', slingFixture()));
    await Promise.resolve();
    await Promise.resolve();
    expect(h.service.world.recipes).toEqual({});
    await h.service.control({ paused: false });
    await h.director.idle();
    expect((await h.store.getJob('paused-late'))?.status).toBe('completed');
    expect(Object.keys(h.service.world.recipes)).toHaveLength(1);
    expect((await h.store.usage(h.config.budgetUsd)).usage.llmCalls).toBe(1);
    expect((await h.store.usage(h.config.budgetUsd)).budget.spentUsd).toBeGreaterThan(0);
  });

  it('cancels work across expired presence even when a reconnect arrives before the next tick', async () => {
    const wait = deferred<AiResult<JudgeValue>>();
    const h = await harness({ judge: () => wait.promise });
    h.director.considerThought();
    // Renew presence after expiry without calling tick: the reconnect must expose
    // the intervening absence before restoring a running world.
    await h.advanceClock(13_001);
    expect(h.service.paused).toBe(false);
    expect(h.calls.judges[0]!.signal?.aborted).toBe(true);
    wait.resolve(judgment(h.calls.judges[0]!, 'rest'));
    await h.director.idle();
    const job = (await h.store.recentJobs())[0];
    expect(job?.status, job?.message).toBe('cancelled');
    expect(h.service.world.entities['ada']!.actor!.action).toBeNull();
  });

  it('rejects stale native plans and avoids generation when the plan changed during Jev', async () => {
    const wait = deferred<AiResult<JudgeValue>>();
    const started = deferred<void>();
    const h = await harness({
      judge: (request) => {
        if (!request.questions['route']) return judgment(request, 'yes');
        started.resolve();
        return wait.promise;
      },
    });
    h.director.considerThought();
    await started.promise;
    expect((await h.service.setGoal('new-plan', 'Attend to the camp instead.')).ok).toBe(true);
    wait.resolve(judgment(h.calls.judges.at(-1)!, 'level2'));
    await h.director.idle();
    expect(h.calls.generations).toHaveLength(0);
    expect((await h.store.recentJobs())[0]?.status).toBe('stale');
    expect(h.service.world.entities['ada']!.actor!.agency.goals[0]!.objective).toBe(
      'Attend to the camp instead.',
    );
  });

  it('rejects a stale generated plan without changing goal, reflection, or action', async () => {
    const wait = deferred<AiResult<unknown>>();
    const started = deferred<void>();
    const h = await harness({
      judge: (request) => judgment(request, 'level2'),
      generate: () => {
        started.resolve();
        return wait.promise;
      },
    });
    h.director.considerThought();
    await started.promise;
    await h.service.setGoal('new-plan', 'New deliberate plan.');
    const before = structuredClone(h.service.world);
    wait.resolve(
      value(
        h.calls.generations[0]!.requestId,
        'openai',
        actionFixture(offeredAction(h.calls.generations[0]!, 'rest')),
      ),
    );
    await h.director.idle();
    expect(h.service.world).toEqual(before);
    expect((await h.store.recentJobs())[0]?.status).toBe('stale');
  });

  it('revalidates a native candidate whose food was consumed while Jev was deciding', async () => {
    const wait = deferred<AiResult<JudgeValue>>();
    const started = deferred<void>();
    const h = await harness({
      judge: (request) => {
        if (!request.questions['route']) return judgment(request, 'yes');
        started.resolve();
        return wait.promise;
      },
    });
    const berries = allItems(h.service.world).find(
      (item) => item.ownerId === 'ada' && item.definitionId === 'berries',
    )!;
    await h.change((world) => {
      world.entities[berries.id]!.item!.quantity = 1;
    });
    h.director.considerThought();
    await started.promise;
    expect(
      (await h.service.command('eat-before-answer', { type: 'eat', itemId: berries.id }, 'ada')).ok,
    ).toBe(true);
    const before = structuredClone(h.service.world);
    wait.resolve(judgment(h.calls.judges.at(-1)!, 'level2'));
    await h.director.idle();
    expect(allItems(h.service.world)).toEqual(allItems(before));
    expect(h.service.world.entities['ada']!.actor!.fullness).toBe(
      before.entities['ada']!.actor!.fullness,
    );
    expect((await h.store.recentJobs())[0]?.status).toBe('stale');
    expect(h.calls.generations).toHaveLength(0);
  });

  it('does not deliver a late reply or private reflection when the listener has left hearing range', async () => {
    const wait = deferred<AiResult<unknown>>();
    const started = deferred<void>();
    const h = await harness({
      judge: (request) => judgment(request, 'level2'),
      generate: () => {
        started.resolve();
        return wait.promise;
      },
    });
    await h.director.submit('chat', 'far-reply', 'Hello Ada.');
    await started.promise;
    await h.change((world) => {
      setSpatialPosition(
        world,
        world.entities['player']!,
        { y: 0, x: 26, z: 22 },
        worldSupport(world.entities['player']!),
      );
    });
    wait.resolve(value(h.calls.generations[0]!.requestId, 'openai', speechFixture('Hello there.')));
    await h.director.idle();
    expect((await h.store.getJob('far-reply'))?.status).toBe('stale');
    expect(
      h.service.world.events.some((event) => event.type === 'speech' && event.actorId === 'ada'),
    ).toBe(false);
    expect(
      h.service.world.memories['ada']!.some(
        (memory) => memory.summary === 'PRIVATE_LATE_REFLECTION',
      ),
    ).toBe(false);
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
      await h.director.submit('invention', `invalid-${fault}`, 'A physical sling.');
      await h.director.idle();
      expect((await h.store.getJob(`invalid-${fault}`))?.status).toBe('failed');
      expect(h.service.world.recipes).toEqual({});
      expect(allItems(h.service.world)).toEqual(beforeItems);
      expect(h.service.world.knowledge['player']).toEqual([]);
    },
  );

  it('fails without dispatch when the budget cannot reserve the next call', async () => {
    const h = await harness({ config: { budgetUsd: 0 } });
    await h.director.submit('invention', 'budget-zero', 'A sling.');
    await h.director.idle();
    expect(h.calls.judges).toHaveLength(0);
    expect(h.calls.generations).toHaveLength(0);
    expect((await h.store.getJob('budget-zero'))?.message).toContain('spending cap');
  });

  it('cannot bypass the minimum reservation by lowering configured per-call reserves', async () => {
    const h = await harness({ config: { budgetUsd: 0.001, jevReserveUsd: 0.000001 } });
    await h.director.submit('invention', 'budget-small', 'A sling.');
    await h.director.idle();
    expect(h.calls.judges).toHaveLength(0);
    expect((await h.store.getJob('budget-small'))?.status).toBe('failed');
  });

  it('stops before LLM when only the Jev call fits the budget', async () => {
    const h = await harness({ config: { budgetUsd: 0.01 } });
    await h.director.submit('invention', 'budget-between', 'A sling.');
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
    await h.director.submit('invention', 'unknown-cost', 'A sling.');
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
    expect((await h.director.submit('invention', 'no-keys', 'A sling.')).code).toBe('unconfigured');
    h.director.considerThought();
    await h.service.control({ paused: true });
    expect((await h.director.submit('chat', 'pause', 'Hello.')).code).toBe('paused');
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
      world.entities['player']!.actor!.incapacitated = true;
    });
    expect((await h.director.submit('invention', 'incapacitated-submit', 'A sling.')).code).toBe(
      'actor',
    );
    expect(h.calls.judges).toHaveLength(0);
    await h.change((world) => {
      world.entities['player']!.actor!.incapacitated = false;
    });
    await h.director.submit('invention', 'incapacitated-result', 'A sling.');
    await started.promise;
    await h.change((world) => {
      world.entities['player']!.actor!.incapacitated = true;
    });
    wait.resolve(value(h.calls.generations[0]!.requestId, 'openai', slingFixture()));
    await h.director.idle();
    expect((await h.store.getJob('incapacitated-result'))?.status).toBe('stale');
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
        actorId: 'player',
        source: 'test-fixture',
        authority: { origin: 'player', policyRevision: 1 },
      });
      expect(admitted.ok).toBe(true);
      if (index === 0) oldestId = Object.keys(h.service.world.recipes)[0]!;
    }
    const context = buildContext(
      h.service,
      'player',
      'Please reuse the ancient shellfish pearlweave technique.',
    );
    expect(context.knownRecipes).toHaveLength(24);
    expect(context.knownRecipes[0]!.id).toBe(oldestId);
    expect(h.calls.judges).toHaveLength(0);
    expect(h.calls.generations).toHaveLength(0);
  });

  it('commits immediate conversation without coupling it to private reflection', async () => {
    const h = await harness({
      judge: (r) => judgment(r, 'level2'),
      generate: (r) =>
        value(r.requestId, 'openai', speechFixture('I promise to help you gather food.')),
    });
    await h.director.submit('chat', 'coherent-chat', 'Can we work together?');
    await h.director.idle();
    expect((await h.store.getJob('coherent-chat'))?.status).toBe('completed');
    expect(mindFor(h.service.world, 'ada').thoughts).toHaveLength(0);
    expect(h.service.world.memories.ada!.some((m) => m.kind === 'reflection')).toBe(false);
    expect(
      h.service.world.memories.ada!.some(
        (m) => m.speakerId === 'ada' && m.summary.includes('I promise to help'),
      ),
    ).toBe(true);
  });
  it('rejects unsupported legacy extraction fields without committing a partial speech', async () => {
    const h = await harness({
      judge: (r) => judgment(r, 'level2'),
      generate: (r) =>
        value(r.requestId, 'openai', {
          ...speechFixture('Hello.'),
          commitment: { quote: 'Fabricated promise' },
        }),
    });
    await h.director.submit('chat', 'invalid-bundle', 'Hello.');
    await h.director.idle();
    expect((await h.store.getJob('invalid-bundle'))?.status).toBe('failed');
    expect(h.service.world.events.some((e) => e.type === 'speech' && e.actorId === 'ada')).toBe(
      false,
    );
    expect(mindFor(h.service.world, 'ada').thoughts).toHaveLength(0);
  });
  it('routes difficult immediate work to the configured complex level without a mind write', async () => {
    const h = await harness({
      judge: (r) => judgment(r, 'level4'),
      generate: (r) => value(r.requestId, 'openai', actionFixture(null)),
    });
    h.director.considerThought();
    await h.director.idle();
    expect(h.calls.generations.map((r) => [r.execution, r.reasoningEffort])).toEqual([
      ['complex', 'high'],
    ]);
    expect(mindFor(h.service.world, 'ada').thoughts).toHaveLength(0);
    expect(h.service.world.entities.ada!.actor!.action).toBeNull();
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
