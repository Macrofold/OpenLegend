import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NPC_ID,
  PLAYER_ID,
  commitActorResponse,
  createItemLot,
  itemFor,
  quantityOf,
} from '@open-legend/domain';
import type { ActorResponse } from '@open-legend/domain';
import type {
  AiClient,
  AiReceipt,
  AiResult,
  GenerateRequest,
  JudgeRequest,
  JudgeValue,
  JudgmentAnswer,
} from '@open-legend/ai';
import { readConfig, testRepository } from '../../../tests/fixtures/database.js';
import { editWorld, enterLocalWorld } from '../../../tests/fixtures/service.js';
import { AiDirector } from './ai-director.js';
import { decisionAllowance } from './cognition-budget.js';
import { LEVEL_LIMITS } from './cognition-contracts.js';
import { traceDetails } from './cognition-inspection.js';
import type { AppConfig } from './config.js';
import type { IntelligenceLog } from './intelligence-log.js';
import { LEVEL1_POLICY } from './jev-questions.js';
import type { JobRecord } from './store.js';
import { WorldService } from './world-service.js';

// CR12 level-1 selection fixtures: explicit orchestration specimens with a fake AiClient and a
// blocked global transport. They exercise routing, admission and accounting, never model quality.
// docs/maintainers/cognition-redesign.md#cr12--acceptance-and-tokenlatency-evidence

// Reaching Jev's real size limit only through the combined question set is impractical to stage
// deterministically, so one fixture makes the director's pre-dispatch size check reject exactly a
// map that carries both routing and a* rating questions. Every other check is the real one.
const oversize = vi.hoisted(() => ({ combined: false, rejected: 0 }));
vi.mock('@open-legend/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@open-legend/ai')>();
  return {
    ...actual,
    validateJudgmentSize(
      state: unknown,
      questions: Parameters<typeof actual.validateJudgmentSize>[1],
    ) {
      if (
        oversize.combined &&
        Object.hasOwn(questions, 'route') &&
        Object.keys(questions).some((key) => /^a\d+$/.test(key))
      ) {
        oversize.rejected++;
        throw new actual.InvalidData('judgment_exceeds_55000_estimated_tokens');
      }
      actual.validateJudgmentSize(state, questions);
    },
  };
});

// The duplicate-result fixture replays the director's exact admission arguments. This wrapper
// only records them (without the world) and always delegates to the real domain owner.
type AdmissionArgs =
  Parameters<typeof commitActorResponse> extends [unknown, unknown, ...infer Rest] ? Rest : never;
const admissions = vi.hoisted(() => [] as { id: string; args: AdmissionArgs }[]);
vi.mock('@open-legend/domain', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@open-legend/domain')>();
  return {
    ...actual,
    commitActorResponse(...call: Parameters<typeof actual.commitActorResponse>) {
      const [, id, ...args] = call;
      admissions.push({ id, args: structuredClone(args) });
      return actual.commitActorResponse(...call);
    },
  };
});

let network: ReturnType<typeof vi.fn>;
beforeEach(() => {
  oversize.combined = false;
  oversize.rejected = 0;
  admissions.length = 0;
  network = vi.fn(async () => {
    throw new Error('network blocked in fixture');
  });
  vi.stubGlobal('fetch', network);
});
const cleanup: (() => Promise<void>)[] = [];
// Closing the director flushes diagnostics; shared fixture databases can be slow under load.
afterEach(async () => {
  try {
    for (const close of cleanup.splice(0)) await close();
    expect(network).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
}, 60_000);

function receipt(requestId: string, provider: 'jev' | 'openai'): AiReceipt {
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
    estimatedCostUsd: 0.0001,
  };
}
function value<T>(requestId: string, provider: 'jev' | 'openai', result: T): AiResult<T> {
  return { outcome: 'value', value: result, receipt: receipt(requestId, provider) };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** A Choice answer whose probabilities cover exactly the offered keys and sum to 1.
 * Weights for keys the server did not offer are dropped before normalizing. */
function distribution(keys: string[], weights: Record<string, number>): JudgmentAnswer {
  const specified = keys.filter((key) => weights[key] !== undefined);
  const used = specified.reduce((sum, key) => sum + weights[key]!, 0);
  const rest = keys.length - specified.length;
  const share = rest ? Math.max(0, 1 - used) / rest : 0;
  const raw = Object.fromEntries(keys.map((key) => [key, weights[key] ?? share]));
  const total = Object.values(raw).reduce((sum, probability) => sum + probability, 0);
  const probabilities = Object.fromEntries(keys.map((key) => [key, raw[key]! / total]));
  const choice = keys.reduce((best, key) =>
    probabilities[key]! > probabilities[best]! ? key : best,
  );
  return { type: 'choice', choice, probabilities, confidence: probabilities[choice]! };
}

const isEat = (description: string) =>
  description.startsWith('Eat one. Selected item: the wild berries.');
const isContinue = (description: string) =>
  description.startsWith('Continue the') || description.startsWith('Remain in place');
const noul = (rating: number): JudgmentAnswer => ({ type: 'noul', noul: rating });
const handleKey = (key: string) => /^a\d+$/.test(key);

interface Script {
  /** Route weights; unspecified offered routes share the remainder. */
  route?: Record<string, number>;
  reflection?: 'yes' | 'no';
  possibleAction?: Record<string, number>;
  /** Rating per offered action; `null` omits the answer. */
  rate?: (description: string, handle: string) => JudgmentAnswer | null;
  /** Answers for handles the server never offered. */
  extra?: Record<string, JudgmentAnswer>;
}

/** Answers route/reflection/possibleAction Choice questions and a* Noul ratings; optional
 * recall-attention Noul questions are declined. */
function answer(request: JudgeRequest, script: Script): AiResult<JudgeValue> {
  const answers: Record<string, JudgmentAnswer> = {};
  const state = request.state as { candidates?: Record<string, string> };
  const handles = Object.keys(request.questions).filter(handleKey);
  const descriptions = Object.values(state.candidates ?? {});
  for (const [key, question] of Object.entries(request.questions)) {
    if (question.type === 'choice') {
      const keys = Object.keys(question.criteria);
      if (key === 'route') answers[key] = distribution(keys, script.route ?? { level1: 0.9 });
      else if (key === 'reflection')
        answers[key] = distribution(keys, { [script.reflection ?? 'no']: 0.95 });
      else if (key === 'possibleAction')
        answers[key] = distribution(keys, script.possibleAction ?? { yes: 0.9 });
      else throw new Error(`Unexpected fixture Choice question ${key}`);
    } else if (question.type === 'noul') {
      if (handleKey(key)) {
        if (descriptions.length !== handles.length) throw new Error('Unaligned fixture options');
        const rated = (script.rate ?? defaultRate)(descriptions[handles.indexOf(key)]!, key);
        if (rated) answers[key] = rated;
      } else answers[key] = noul(0.1);
    } else throw new Error('Unexpected fixture Score question');
  }
  if (handles.length) Object.assign(answers, script.extra ?? {});
  return value(request.requestId, 'jev', { answers });
}
const defaultRate = (description: string) =>
  noul(isEat(description) ? 0.9 : isContinue(description) ? 0.2 : 0.1);

/** Find the permitted addressee handles in the provider schema so a fixture reply can speak. */
function addressees(schema: unknown): string[] {
  if (!schema || typeof schema !== 'object') return [];
  const record = schema as Record<string, unknown>;
  const field = record['addresseeEntityId'] as { enum?: string[] } | undefined;
  if (field?.enum) return field.enum;
  for (const child of Object.values(record)) {
    const found = addressees(child);
    if (found.length) return found;
  }
  return [];
}

/** Every action handle a generation schema permits (act and plan-step `actionId` enums). */
function actionHandles(schema: unknown): string[] {
  const found = new Set<string>();
  const collect = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    if (Array.isArray(record['enum']))
      for (const entry of record['enum']) if (typeof entry === 'string') found.add(entry);
    for (const child of Object.values(record)) collect(child);
  };
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    const properties = record['properties'] as Record<string, unknown> | undefined;
    if (properties?.['actionId']) collect(properties['actionId']);
    for (const child of Object.values(record)) visit(child);
  };
  visit(schema);
  return [...found].filter(handleKey).sort();
}

async function harness(
  options: {
    judge?: (request: JudgeRequest) => AiResult<JudgeValue> | Promise<AiResult<JudgeValue>>;
    generate?: (request: GenerateRequest) => AiResult<unknown> | Promise<AiResult<unknown>>;
    env?: NodeJS.ProcessEnv;
    config?: Partial<AppConfig>;
  } = {},
) {
  const now = 10_000;
  const config = {
    ...readConfig({
      TYPESAFE_API_KEY: 'test-fixture-key',
      OPENAI_API_KEY: 'test-fixture-key',
      // Background recall indexing otherwise inherits the fixture key and reaches the real
      // embeddings endpoint through the global transport.
      OPENAI_EMBEDDING_API_KEY: '',
      // In-process simulated ceiling for fake receipts; no provider is reachable.
      AI_BUDGET_USD: '1',
      ...options.env,
    }),
    ...options.config,
  };
  const store = await testRepository();
  const service = new WorldService(store, config, () => now);
  await enterLocalWorld(service);
  await service.setConnection('fixture-browser', true);
  await service.setPresence('fixture-browser', true);
  await service.control({ paused: false });
  const calls = { judges: [] as JudgeRequest[], generations: [] as GenerateRequest[] };
  const client: AiClient = {
    async judge(request) {
      calls.judges.push(request);
      if (!options.judge) throw new Error('Unexpected fixture Jev dispatch');
      return await options.judge(request);
    },
    async generate<T>(request: GenerateRequest): Promise<AiResult<T>> {
      calls.generations.push(request);
      return (
        options.generate
          ? await options.generate(request)
          : value(request.requestId, 'openai', { operations: [] })
      ) as AiResult<T>;
    },
  };
  const director = new AiDirector(service, client, () => now);
  cleanup.push(async () => {
    await director.close();
    await store.close();
  });
  // Hungry, conscious Ada with owned edible food: hunger alone does not trigger native protection.
  await editWorld(service, (world) => {
    createItemLot(world, NPC_ID, 'berries', 2, 'fixture-berries');
    world.entities[NPC_ID]!.actor!.attributes!['wilderness:fullness']!.value = 30;
  });
  const ada = () => service.world.entities[NPC_ID]!.actor!;
  const berries = () => quantityOf(service.world, NPC_ID, 'berries');
  const jobCalls = (jobId: string) => ({
    judges: calls.judges.filter((request) => request.requestId.startsWith(`${jobId}:`)),
    generations: calls.generations.filter((request) => request.requestId.startsWith(`${jobId}:`)),
  });
  /** Admit one autonomous decision and wait for it; returns the only thought job. */
  async function thought(): Promise<JobRecord> {
    await director.considerThought();
    await director.idle();
    const jobs = (await store.recentJobs(50)).filter((job) => job.kind === 'thought');
    expect(jobs).toHaveLength(1);
    return jobs[0]!;
  }
  async function chat(id: string, text: string): Promise<JobRecord> {
    const result = await director.submit('chat', id, text, NPC_ID);
    expect(result.ok).toBe(true);
    await director.idle();
    return (await store.getJob(result.jobId!))!;
  }
  async function trace(jobId: string) {
    await (director as unknown as { log: IntelligenceLog }).log.flush();
    const details = await traceDetails(store, jobId);
    if (!details) throw new Error('Missing trace root');
    const stage = (kind: string) => details.children.filter((child) => child.kind === kind);
    return { root: details.root, stage };
  }
  return {
    config,
    store,
    service,
    director,
    calls,
    ada,
    berries,
    jobCalls,
    thought,
    chat,
    trace,
  };
}
type Harness = Awaited<ReturnType<typeof harness>>;

function newEvents(h: Harness, before: Set<string>) {
  return h.service.world.events.filter((event) => !before.has(event.id));
}
async function level1Stage(h: Harness, jobId: string) {
  const { root, stage } = await h.trace(jobId);
  const [selection] = stage('Level-1 selection');
  expect(selection?.id).toBe(`${jobId}:attempt:0:level1`);
  return {
    root,
    stage,
    input: selection!.input as {
      policy: typeof LEVEL1_POLICY;
      selectionRequest: 'combined' | 'dependent';
      ratings: { handle: string; description?: string; rating: number | null; status: string }[];
      ignoredAnswers: string[];
    },
    output: selection!.output as {
      outcome: { kind: string; reason: string; level?: number; escalationBlocked?: string };
      message: string;
    },
  };
}

const ROUTE = ':attempt:0:route';
const RATINGS = ':attempt:0:action-attention';
const reflectionKey = (h: Harness) => `reflection-queue:${h.service.world.id}:${NPC_ID}`;
const disposition = (job: JobRecord | undefined) =>
  (job?.result as { disposition?: string } | undefined)?.disposition;

// Disposable PostgreSQL creation and world startup dominate; allow slower shared databases.
describe('level-1 selection with fixture Jev and no external requests', { timeout: 60_000 }, () => {
  it('eats owned food from one combined Jev request with no generation or fabricated agency', async () => {
    const h = await harness({ judge: (request) => answer(request, {}) });
    const events = new Set(h.service.world.events.map((event) => event.id));
    const before = structuredClone(h.ada());
    const inner = structuredClone(h.service.world.innerWorlds?.[NPC_ID]);
    expect(h.berries()).toBe(2);

    const job = await h.thought();
    // Exactly one Jev request carries the route/reflection Choices and every a* rating.
    const dispatched = h.jobCalls(job.id);
    expect(dispatched.judges).toHaveLength(1);
    const keys = Object.keys(dispatched.judges[0]!.questions);
    expect(dispatched.judges[0]!.requestId).toBe(`${job.id}${ROUTE}`);
    expect(keys).toEqual(expect.arrayContaining(['route', 'reflection']));
    expect(keys.filter(handleKey).length).toBeGreaterThan(1);
    expect(keys).not.toContain('possibleAction');
    expect(h.calls.judges).toHaveLength(1);
    expect(h.calls.generations).toHaveLength(0);

    expect(job.status).toBe('completed');
    expect(job.result).toMatchObject({
      disposition: 'responded',
      components: { action: { ok: true, code: 'queued' } },
      level1: { kind: 'act', reason: 'selected', rating: 0.9 },
    });
    // Admission queues the one selected native command; the next simulation step executes it.
    expect(h.berries()).toBe(2);
    await h.service.tick(0.1);
    expect(h.berries()).toBe(1);
    expect(h.ada().attributes!['wilderness:fullness']!.value).toBeGreaterThan(
      Number(before.attributes!['wilderness:fullness']!.value) + 10,
    );
    expect(h.ada().agency.plan?.steps.map((step) => step.command)).toEqual([
      expect.objectContaining({ type: 'eat', itemId: 'fixture-berries' }),
    ]);
    expect(h.ada().agency.plan?.steps[0]?.outcome).toMatchObject({ ok: true, code: 'ate' });
    const receipt = h.service.world.responseReceipts?.[job.id];
    expect(receipt?.outcome).toMatchObject({ ok: true, code: 'responded' });
    expect(Object.keys(receipt?.components ?? {})).toEqual(['action']);
    // No fabricated thought, goal, speech or reflection accompanies the selected action.
    expect(h.ada().agency.goals).toEqual(before.agency.goals);
    expect(h.service.world.innerWorlds?.[NPC_ID]).toEqual(inner);
    const own = newEvents(h, events).filter((event) => event.actorId === NPC_ID);
    expect(own.map((event) => event.type)).toContain('ate');
    expect(own.map((event) => event.type)).not.toContain('speech');
    expect(await h.store.getIntegration(reflectionKey(h))).toBeFalsy();
    expect((await h.store.usage(h.config.budgetUsd)).usage).toMatchObject({
      jevCalls: 1,
      llmCalls: 0,
    });

    const { root, input, output, stage } = await level1Stage(h, job.id);
    expect(root).toMatchObject({ kind: 'Semantic trigger', route: 'level1' });
    expect(root.disposition).toBe('responded');
    // The trace names the routes actually offered in the dispatched route question.
    const offeredRoutes = Object.keys(
      (dispatched.judges[0]!.questions['route'] as { criteria: object }).criteria,
    );
    expect(offeredRoutes).toEqual(expect.arrayContaining(['native', 'level1', 'level2']));
    expect((root.input as { offeredRoutes: string[] }).offeredRoutes).toEqual(offeredRoutes);
    expect(input.selectionRequest).toBe('combined');
    expect(input.policy).toEqual(LEVEL1_POLICY);
    expect(input.ignoredAnswers).toEqual([]);
    // Every dispatched rating question is resolved, in offer order, and only eating qualifies.
    expect(input.ratings.map((entry) => entry.handle)).toEqual(keys.filter(handleKey));
    expect(input.ratings.every((entry) => entry.status === 'rated')).toBe(true);
    expect(input.ratings.filter((entry) => (entry.rating ?? 0) >= LEVEL1_POLICY.selectAt)).toEqual([
      expect.objectContaining({
        rating: 0.9,
        description: expect.stringMatching(/^Eat one\. Selected item: the wild berries\./),
      }),
    ]);
    const eat = input.ratings.find((entry) => isEat(entry.description ?? ''))!;
    expect(output.outcome).toEqual({
      kind: 'act',
      reason: 'selected',
      handle: eat.handle,
      rating: 0.9,
    });
    expect(job.result).toMatchObject({ level1: { handle: eat.handle } });
    expect(stage('Semantic decision')[0]!.input).toMatchObject({
      selectionRequest: 'combined',
      nativeGates: { generationAvailable: true, speechTrigger: false },
    });
    expect(stage('Jev')).toHaveLength(1);
    expect(stage('Response admission')).toHaveLength(1);
    expect(stage('LM · fast · npc_response')).toHaveLength(0);
  });

  it('deliberately continues ongoing native work; an unchanged opportunity buys nothing', async () => {
    // Only the offered continue-the-follow binding qualifies; "Remain in place" does not.
    const h = await harness({
      judge: (request) =>
        answer(request, {
          rate: (description) => noul(description.startsWith('Continue the follow') ? 0.9 : 0.1),
        }),
    });
    // This fixture measures Ada's repeated opportunity, with other residents outside its scope.
    await editWorld(h.service, (world) => {
      for (const entity of Object.values(world.entities))
        if (entity.actor?.controller === 'npc' && entity.id !== NPC_ID)
          entity.actor.controller = 'native';
    });
    expect(
      (await h.service.command('fixture-follow', { type: 'follow', targetId: PLAYER_ID }, NPC_ID))
        .ok,
    ).toBe(true);
    expect(h.ada().action?.type).toBe('follow');
    const before = structuredClone(h.ada());

    const job = await h.thought();
    expect(job.status).toBe('completed');
    expect(job.message).toBe('Jev chose to continue existing work; no new intervention.');
    expect(job.result).toMatchObject({
      disposition: 'continued',
      level1: { kind: 'continue', reason: 'selected', rating: 0.9 },
    });
    expect(h.ada().action).toEqual(before.action);
    expect(h.ada().agency).toEqual(before.agency);
    expect(h.ada().planGeneration).toBe(before.planGeneration);
    expect(h.service.world.responseReceipts?.[job.id]?.outcome.ok).toBe(true);
    expect(h.service.world.responseReceipts?.[job.id]?.components).toEqual({});
    expect(h.jobCalls(job.id).judges).toHaveLength(1);
    expect(h.calls.generations).toHaveLength(0);
    const { input, output } = await level1Stage(h, job.id);
    const chosen = input.ratings.filter((entry) => entry.rating === 0.9);
    expect(chosen).toHaveLength(1);
    expect(chosen[0]!.description).toBe('Continue the follow already in progress.');
    expect(output.outcome).toEqual({
      kind: 'continue',
      reason: 'selected',
      handle: chosen[0]!.handle,
      rating: 0.9,
    });

    // Ada has no new opportunity; other characters may receive their first decision.
    await h.director.considerThought();
    await h.director.idle();
    expect(
      (await h.store.recentJobs(50)).filter(
        (entry) => entry.kind === 'thought' && entry.request.npcId === NPC_ID,
      ),
    ).toHaveLength(1);
    expect(h.jobCalls(job.id).judges).toHaveLength(1);
    expect(h.jobCalls(job.id).generations).toHaveLength(0);
    expect(h.ada().action).toEqual(before.action);
  });

  it.each([
    [
      'missing-answers',
      'continue rating omitted',
      (description: string) => (isContinue(description) ? null : defaultRate(description)),
      'missing',
    ],
    [
      'invalid-answers',
      'continue rated 1.5',
      (description: string) => (isContinue(description) ? noul(1.5) : defaultRate(description)),
      'invalid',
    ],
    [
      'invalid-answers',
      'continue answered as a Choice',
      (description: string): JudgmentAnswer =>
        isContinue(description)
          ? { type: 'choice', choice: 'yes', probabilities: { yes: 1 }, confidence: 1 }
          : defaultRate(description),
      'invalid',
    ],
  ] as const)(
    'defers %s (%s) without escalation or effect even when generation is available',
    async (reason, _, rate, status) => {
      const h = await harness({ judge: (request) => answer(request, { rate }) });
      const job = await h.thought();
      expect(job.status).toBe('completed');
      expect(job.result).toMatchObject({ disposition: 'deferred', reason });
      expect((job.result as { level1: object }).level1).not.toHaveProperty('escalationBlocked');
      expect(job.message).toContain('No automatic paid retry.');
      expect(h.calls.judges).toHaveLength(1);
      expect(h.calls.generations).toHaveLength(0);
      await h.service.tick(0.1);
      expect(h.berries()).toBe(2);
      expect(h.ada().agency.plan ?? null).toBeNull();
      expect(h.service.world.responseReceipts?.[job.id]).toBeUndefined();
      const { root, input, output } = await level1Stage(h, job.id);
      expect(root).toMatchObject({ route: 'level1', disposition: 'deferred' });
      expect(output.outcome).toEqual({ kind: 'defer', reason });
      expect(input.ratings.filter((entry) => entry.status === status)).toEqual([
        expect.objectContaining({ rating: null, description: expect.stringMatching(/^Remain/) }),
      ]);
      // One defective answer defers even though a valid 0.9 rating would otherwise act.
      expect(input.ratings.filter((entry) => entry.status !== 'rated')).toHaveLength(1);
      expect(input.ratings.find((entry) => isEat(entry.description ?? ''))).toMatchObject({
        rating: 0.9,
        status: 'rated',
      });
    },
  );

  it('escalates an uncertain 0.6 selection to level 2 with only relevant actions offered', async () => {
    const h = await harness({
      judge: (request) =>
        answer(request, { rate: (description) => noul(isEat(description) ? 0.6 : 0.1) }),
    });
    const job = await h.thought();
    expect(job.status).toBe('completed');
    expect(job.result).toMatchObject({
      level1: { kind: 'escalate', reason: 'uncertain-selection', level: 2 },
    });
    expect(h.calls.judges).toHaveLength(1);
    expect(h.calls.generations).toHaveLength(1);
    const [generation] = h.calls.generations;
    expect(generation).toMatchObject({
      requestId: `${job.id}:attempt:0:generate`,
      execution: 'fast',
      task: 'npc_response',
    });
    // Generation reuses the ratings at the 0.5 relevance line instead of buying another request.
    expect(String(generation!.context)).toContain(
      'Eat one. Selected item: the wild berries. Restores up to 18',
    );
    expect(String(generation!.context)).not.toContain('Drop 2 Wild berries on the ground.');
    const { root, input, output } = await level1Stage(h, job.id);
    expect(root.route).toBe('level1→level2');
    expect(output.outcome).toMatchObject({ kind: 'escalate', reason: 'uncertain-selection' });
    const eat = input.ratings.find((entry) => isEat(entry.description ?? ''))!;
    expect(eat).toMatchObject({ rating: 0.6, status: 'rated' });
    expect(output.outcome).toMatchObject({ best: { handle: eat.handle, rating: 0.6 } });
    // The dropped option was really rated (0.1), so its absence from generation is meaningful.
    expect(
      input.ratings.find((entry) => entry.description?.startsWith('Drop 2 Wild berries')),
    ).toMatchObject({ rating: 0.1, status: 'rated' });
    expect(actionHandles(generation!.schema)).toEqual([eat.handle]);
  });

  it.each([
    ['Jev-only operation', { AI_JEV_ONLY: 'true' }],
    ['no OpenAI key', { OPENAI_API_KEY: '' }],
  ] as const)(
    'defers an uncertain selection when generation is unavailable: %s',
    async (_, env) => {
      const h = await harness({
        env,
        judge: (request) =>
          answer(request, { rate: (description) => noul(isEat(description) ? 0.6 : 0.1) }),
      });
      const job = await h.thought();
      expect(job.status).toBe('completed');
      expect(job.result).toMatchObject({
        disposition: 'deferred',
        reason: 'uncertain-selection',
        level1: {
          kind: 'defer',
          reason: 'uncertain-selection',
          escalationBlocked: 'generation-unavailable',
          best: { rating: 0.6 },
        },
      });
      expect(
        Object.keys((h.calls.judges[0]!.questions['route'] as { criteria: object }).criteria),
      ).toEqual(['native', 'level1', 'request_1']);
      expect(h.calls.judges).toHaveLength(1);
      expect(h.calls.generations).toHaveLength(0);
      await h.service.tick(0.1);
      expect(h.berries()).toBe(2);
      const { root } = await level1Stage(h, job.id);
      expect(root).toMatchObject({ route: 'level1', disposition: 'deferred' });
      expect((root.input as { offeredRoutes: string[] }).offeredRoutes).toEqual([
        'native',
        'level1',
        'request_1',
      ]);
    },
  );

  it('escalates when no supplied action fits, at the most probable generative level', async () => {
    const low = (request: JudgeRequest, route?: Record<string, number>) =>
      answer(request, { route, rate: () => noul(0.1) });
    const h = await harness({ judge: (request) => low(request) });
    const job = await h.thought();
    expect(job.status).toBe('completed');
    expect(job.result).toMatchObject({
      level1: { kind: 'escalate', reason: 'no-suitable-action', level: 2 },
    });
    expect(h.calls.judges).toHaveLength(1);
    expect(h.calls.generations).toHaveLength(1);
    const [generation] = h.calls.generations;
    const invention = JSON.stringify(generation!.schema).includes('"invention"');
    expect(generation).toMatchObject({
      execution: 'fast',
      model: h.config.miniModel,
      reasoningEffort: LEVEL_LIMITS[2].effort,
      maxOutputTokens: invention ? 1800 : LEVEL_LIMITS[2].outputTokens,
    });
    const { root, stage } = await level1Stage(h, job.id);
    expect(root.route).toBe('level1→level2');
    expect(stage('LM · fast · npc_response')).toHaveLength(1);
    await h.service.tick(0.1);
    expect(h.berries()).toBe(2);

    // Same selection, but the route answer ranks level 3 above the other generative levels.
    const complex = await harness({
      judge: (request) =>
        low(request, { level1: 0.6, level3: 0.25, level2: 0.1, level4: 0.03, native: 0.02 }),
    });
    const escalated = await complex.thought();
    expect(escalated.result).toMatchObject({
      level1: { kind: 'escalate', reason: 'no-suitable-action', level: 3 },
    });
    expect(complex.calls.generations).toHaveLength(1);
    expect(complex.calls.generations[0]).toMatchObject({
      execution: 'complex',
      model: complex.config.complexModel,
      reasoningEffort: LEVEL_LIMITS[3].effort,
      maxOutputTokens: LEVEL_LIMITS[3].outputTokens,
    });
    const traced = await level1Stage(complex, escalated.id);
    expect(traced.root.route).toBe('level1→level3');
    expect(traced.stage('LM · complex · npc_response')).toHaveLength(1);
  });

  it('defers an escalation whose generation allowance cannot be reserved', async () => {
    // Enough simulated ceiling for the Jev reservation, not for the generation reservation.
    const h = await harness({
      config: { budgetUsd: 0.1 },
      judge: (request) => answer(request, { rate: () => noul(0.1) }),
    });
    expect(decisionAllowance(h.config, 'jev')).toBeLessThan(0.1);
    expect(decisionAllowance(h.config, 'openai')).toBeGreaterThan(0.1);
    const job = await h.thought();
    expect(job.status).toBe('completed');
    expect(job.result).toMatchObject({
      disposition: 'deferred',
      reason: 'no-suitable-action',
      level1: {
        kind: 'defer',
        reason: 'no-suitable-action',
        escalationBlocked: 'budget-exhausted',
      },
    });
    expect(job.message).toContain('The escalation allowance could not be reserved.');
    expect(h.calls.judges).toHaveLength(1);
    expect(h.calls.generations).toHaveLength(0);
    const usage = await h.store.usage(h.config.budgetUsd);
    expect(usage.usage).toMatchObject({ jevCalls: 1, llmCalls: 0 });
    expect(usage.budget.reservedUsd).toBe(0);
    await h.service.tick(0.1);
    expect(h.berries()).toBe(2);
    const { root, stage } = await level1Stage(h, job.id);
    expect(root.disposition).toBe('deferred');
    // No generative request ran, so the trace keeps level 1 and records the blocked escalation.
    expect(root.route).toBe('level1');
    const blocked = stage('Level-1 selection').find((entry) =>
      entry.id.endsWith(':level1:blocked'),
    );
    expect(blocked?.output).toMatchObject({
      outcome: { kind: 'defer', escalationBlocked: 'budget-exhausted' },
    });
  });

  it('still generates an addressed conversational reply although actions exist', async () => {
    const h = await harness({
      judge: (request) => answer(request, { route: { level2: 0.9 } }),
      generate: (request) =>
        value(request.requestId, 'openai', {
          operations: [
            {
              localId: 'reply',
              requiresAccepted: [],
              talk: {
                text: 'Fixture reply from Ada.',
                addresseeEntityId: addressees(request.schema)[0],
                selfIntroduction: null,
                volume: 'normal',
              },
              act: null,
              think: null,
              goal: null,
              plan: null,
              note: null,
              name: null,
            },
          ],
        }),
    });
    const events = new Set(h.service.world.events.map((event) => event.id));
    const job = await h.chat('greeting', 'Hello Ada, how are you today?');
    expect(job.status).toBe('completed');
    expect(disposition(job)).toBe('responded');
    const dispatched = h.jobCalls(job.id);
    const ratings = dispatched.judges.find((request) => request.requestId.endsWith(RATINGS));
    // Actions were available and rated for relevance, yet the conversational route still generated.
    expect(Object.keys(ratings?.questions ?? {}).length).toBeGreaterThan(1);
    expect(Object.keys(ratings!.questions).every(handleKey)).toBe(true);
    expect(Object.values(ratings!.questions).every((question) => !('criteria' in question))).toBe(
      true,
    );
    expect(dispatched.generations).toHaveLength(1);
    expect(dispatched.generations[0]).toMatchObject({ execution: 'fast', task: 'npc_response' });
    expect(
      newEvents(h, events).some(
        (event) =>
          event.actorId === NPC_ID &&
          event.type === 'speech' &&
          event.data?.['text'] === 'Fixture reply from Ada.',
      ),
    ).toBe(true);
    const { root, stage } = await h.trace(job.id);
    expect(root.route).toBe('level2');
    expect(stage('Level-1 selection')).toHaveLength(0);
    // The fixture rated eating 0.9 for relevance only; that answer never executes an action.
    await h.service.tick(0.1);
    expect(h.berries()).toBe(2);
    expect(h.ada().agency.plan ?? null).toBeNull();
  });

  it('schedules reflection only from the independent reflection answer', async () => {
    const quiet = await harness({ judge: (request) => answer(request, { reflection: 'no' }) });
    const selected = await quiet.thought();
    expect(selected.result).toMatchObject({ level1: { kind: 'act' } });
    expect(await quiet.store.getIntegration(reflectionKey(quiet))).toBeFalsy();

    const reflective = await harness({
      judge: (request) => answer(request, { reflection: 'yes' }),
    });
    const job = await reflective.thought();
    expect(job.result).toMatchObject({ level1: { kind: 'act' } });
    expect(await reflective.store.getIntegration(reflectionKey(reflective))).toMatchObject({
      actorId: NPC_ID,
      origin: job.id,
    });
    expect(reflective.calls.generations).toHaveLength(0);
  });

  it('keeps dependent speech questions in a separate second request', async () => {
    const h = await harness({ judge: (request) => answer(request, {}) });
    const job = await h.chat('dependent', 'Ada, you look hungry.');
    expect(job.status).toBe('completed');
    expect(job.result).toMatchObject({
      disposition: 'responded',
      level1: { kind: 'act', reason: 'selected', rating: 0.9 },
    });
    const dispatched = h.jobCalls(job.id);
    const decisions = dispatched.judges.filter(
      (request) => request.requestId.endsWith(ROUTE) || request.requestId.endsWith(RATINGS),
    );
    expect(decisions.map((request) => request.requestId)).toEqual([
      `${job.id}${ROUTE}`,
      `${job.id}${RATINGS}`,
    ]);
    const [route, ratings] = decisions.map((request) => Object.keys(request.questions));
    expect(route).toEqual(expect.arrayContaining(['route', 'reflection', 'possibleAction']));
    expect(route!.some(handleKey)).toBe(false);
    expect(ratings!.length).toBeGreaterThan(1);
    expect(ratings!.every(handleKey)).toBe(true);
    // The dependent request asks the level-1 selection question, not generic relevance.
    expect(
      Object.values(decisions[1]!.questions).every(
        (question) => question.type === 'noul' && question.criteria,
      ),
    ).toBe(true);
    expect(h.calls.generations).toHaveLength(0);
    await h.service.tick(0.1);
    expect(h.berries()).toBe(1);
    const { input, output } = await level1Stage(h, job.id);
    expect(input.selectionRequest).toBe('dependent');
    // The selection resolves exactly the second request's questions, not the routing request.
    expect(input.ratings.map((entry) => entry.handle)).toEqual(ratings);
    const eat = input.ratings.find((entry) => isEat(entry.description ?? ''))!;
    expect(output.outcome).toEqual({
      kind: 'act',
      reason: 'selected',
      handle: eat.handle,
      rating: 0.9,
    });
  });

  it('falls back to the dependent request before dispatch when a combined request is oversized', async () => {
    const h = await harness({ judge: (request) => answer(request, {}) });
    oversize.combined = true;
    const job = await h.thought();
    // The size check ran once and rejected the combined question set before any dispatch.
    expect(oversize.rejected).toBe(1);
    const dispatched = h.jobCalls(job.id).judges;
    expect(dispatched.map((request) => request.requestId)).toEqual([
      `${job.id}${ROUTE}`,
      `${job.id}${RATINGS}`,
    ]);
    expect(h.calls.judges).toHaveLength(2);
    const [route, ratings] = dispatched.map((request) => Object.keys(request.questions));
    expect(route).toEqual(expect.arrayContaining(['route', 'reflection']));
    expect(route).not.toContain('possibleAction');
    expect(route!.some(handleKey)).toBe(false);
    expect(ratings!.length).toBeGreaterThan(1);
    expect(ratings!.every(handleKey)).toBe(true);
    expect(
      Object.values(dispatched[1]!.questions).every(
        (question) => question.type === 'noul' && question.criteria,
      ),
    ).toBe(true);
    expect(job.status).toBe('completed');
    expect(job.result).toMatchObject({
      disposition: 'responded',
      level1: { kind: 'act', reason: 'selected', rating: 0.9 },
    });
    expect(h.calls.generations).toHaveLength(0);
    await h.service.tick(0.1);
    expect(h.berries()).toBe(1);
    expect((await h.store.usage(h.config.budgetUsd)).usage).toMatchObject({
      jevCalls: 2,
      llmCalls: 0,
    });
    const { input, stage } = await level1Stage(h, job.id);
    expect(input.selectionRequest).toBe('dependent');
    expect(input.ratings.map((entry) => entry.handle)).toEqual(ratings);
    expect(stage('Semantic decision')[0]!.input).toMatchObject({
      selectionRequest: 'dependent',
      nativeGates: { speechTrigger: false },
    });
  });

  it('escalates addressed speech with no-candidates when actions are clearly irrelevant', async () => {
    const h = await harness({
      judge: (request) => answer(request, { possibleAction: { no: 0.9 } }),
    });
    const job = await h.chat('no-actions', 'Ada, what do you think of the weather?');
    expect(job.status).toBe('completed');
    expect(job.result).toMatchObject({
      level1: { kind: 'escalate', reason: 'no-candidates', level: 2 },
    });
    const decisions = h
      .jobCalls(job.id)
      .judges.filter(
        (request) => request.requestId.endsWith(ROUTE) || request.requestId.endsWith(RATINGS),
      );
    expect(decisions.map((request) => request.requestId)).toEqual([`${job.id}${ROUTE}`]);
    expect(h.jobCalls(job.id).generations).toHaveLength(1);
    const { root, input, output } = await level1Stage(h, job.id);
    expect(root.route).toBe('level1→level2');
    expect(input).toMatchObject({ selectionRequest: 'dependent', ratings: [] });
    expect(output.outcome).toMatchObject({ kind: 'escalate', reason: 'no-candidates' });
  });

  it('never eats food that left the inventory while the rating request was held', async () => {
    const held = deferred<AiResult<JudgeValue>>();
    const started = deferred<JudgeRequest>();
    const h = await harness({
      judge: (request) => {
        if (!request.requestId.endsWith(ROUTE)) return answer(request, {});
        started.resolve(request);
        return held.promise;
      },
    });
    await h.director.considerThought();
    const request = await started.promise;
    // Bindings were prepared before dispatch; Ada then drops the food through native admission.
    expect(
      (
        await h.service.command(
          'fixture-drop',
          { type: 'drop', itemId: 'fixture-berries', quantity: 2 },
          NPC_ID,
        )
      ).ok,
    ).toBe(true);
    expect(h.berries()).toBe(0);
    const fullness = h.ada().attributes!['wilderness:fullness']!.value;
    held.resolve(answer(request, {}));
    await h.director.idle();
    const jobs = (await h.store.recentJobs(50)).filter((entry) => entry.kind === 'thought');
    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(request.requestId).toBe(`${job!.id}${ROUTE}`);
    expect(job?.result).toMatchObject({ level1: { kind: 'act', rating: 0.9 } });
    // The current native prerequisites reject the stale choice before it joins a plan.
    expect(h.service.world.responseReceipts?.[job!.id]?.components['action']).toMatchObject({
      ok: false,
      code: 'not-edible',
    });
    await h.service.tick(0.1);
    await h.director.idle();
    expect(h.ada().agency.plan).toBeNull();
    expect(h.ada().attributes!['wilderness:fullness']!.value).toBeLessThanOrEqual(Number(fullness));
    expect(h.berries()).toBe(0);
    const dropped = itemFor(h.service.world, 'fixture-berries');
    expect(dropped?.quantity).toBe(2);
    expect(dropped?.ownerId).not.toBe(NPC_ID);
    // No automatic repair or retry after the rejection.
    expect(h.calls.judges).toHaveLength(1);
    expect(h.calls.generations).toHaveLength(0);
  });

  it('records but never executes an answer for an unoffered handle', async () => {
    const h = await harness({
      judge: (request) => answer(request, { rate: () => noul(0.1), extra: { a99: noul(0.99) } }),
    });
    const job = await h.thought();
    const [combined] = h.calls.judges;
    expect(Object.keys(combined!.questions)).not.toContain('a99');
    expect(job.result).toMatchObject({
      level1: { kind: 'escalate', reason: 'no-suitable-action', best: { rating: 0.1 } },
    });
    const { input } = await level1Stage(h, job.id);
    expect(input.ignoredAnswers).toEqual(['a99']);
    expect(input.ratings.map((entry) => entry.handle)).not.toContain('a99');
    expect(input.ratings.every((entry) => entry.status === 'rated' && entry.rating === 0.1)).toBe(
      true,
    );
    // The escalated generation cannot reference the unoffered handle either, and nothing
    // rated below the 0.5 relevance line is offered to it.
    expect(JSON.stringify(h.calls.generations[0]!.schema)).not.toContain('"a99"');
    expect(actionHandles(h.calls.generations[0]!.schema)).toEqual([]);
    await h.service.tick(0.1);
    expect(h.berries()).toBe(2);
    expect(h.ada().agency.plan ?? null).toBeNull();
  });

  it('cancels background selection paused mid-request; late answers change nothing', async () => {
    const held = deferred<AiResult<JudgeValue>>();
    const started = deferred<JudgeRequest>();
    const h = await harness({
      judge: (request) => {
        started.resolve(request);
        return held.promise;
      },
    });
    await h.director.considerThought();
    const request = await started.promise;
    await h.service.control({ paused: true });
    held.resolve(answer(request, {}));
    await h.director.idle();
    const jobs = (await h.store.recentJobs(50)).filter((entry) => entry.kind === 'thought');
    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(request.requestId).toBe(`${job!.id}${ROUTE}`);
    expect(Object.keys(request.questions).some(handleKey)).toBe(true);
    expect(job?.status).toBe('cancelled');
    expect(job?.message).toBe('This request was cancelled when the game paused.');
    expect(h.service.world.responseReceipts?.[job!.id]).toBeUndefined();
    await h.service.control({ paused: false });
    await h.service.tick(0.1);
    await h.director.idle();
    expect(h.berries()).toBe(2);
    expect(h.ada().agency.plan ?? null).toBeNull();
    expect(h.calls.judges).toHaveLength(1);
    expect(h.calls.generations).toHaveLength(0);
  });

  it('dispatches nothing when the budget is exhausted', async () => {
    const h = await harness({ config: { budgetUsd: 0 }, judge: (request) => answer(request, {}) });
    const job = await h.thought();
    expect(job.status).toBe('failed');
    expect(disposition(job)).toBe('budget-exhausted');
    expect(h.calls.judges).toHaveLength(0);
    expect(h.calls.generations).toHaveLength(0);
    expect((await h.store.usage(h.config.budgetUsd)).usage).toMatchObject({
      jevCalls: 0,
      llmCalls: 0,
    });
    expect(h.berries()).toBe(2);
    const { root } = await h.trace(job.id);
    expect(root.disposition).toBe('budget-exhausted');
  });

  it.each(['refused', 'unavailable', 'invalid'] as const)(
    'fails a dependent speech rating request that returns %s without escalation',
    async (outcome) => {
      const h = await harness({
        judge: (request) =>
          request.requestId.endsWith(RATINGS)
            ? { outcome, reason: 'fixture outcome', receipt: receipt(request.requestId, 'jev') }
            : answer(request, {}),
      });
      const job = await h.chat(`rating-${outcome}`, 'Ada, you look hungry.');
      expect(job.status).toBe('failed');
      expect(disposition(job)).toBe(outcome);
      expect(job.message).toContain(`Jev returned ${outcome}`);
      // The failing request is the level-1 selection itself (choose-action criteria), dispatched
      // after routing chose level 1; nothing follows it.
      const judges = h.jobCalls(job.id).judges;
      expect(judges.map((request) => request.requestId)).toContain(`${job.id}${ROUTE}`);
      expect(judges.at(-1)!.requestId).toBe(`${job.id}${RATINGS}`);
      expect(
        Object.values(judges.at(-1)!.questions).every(
          (question) => question.type === 'noul' && question.criteria,
        ),
      ).toBe(true);
      expect(h.jobCalls(job.id).generations).toHaveLength(0);
      await h.service.tick(0.1);
      expect(h.berries()).toBe(2);
      expect(h.ada().agency.plan ?? null).toBeNull();
      const { root, stage } = await h.trace(job.id);
      expect(root.disposition).toBe(outcome);
      expect(root.route).toBe('level1');
      expect(stage('Level-1 selection')).toHaveLength(0);
    },
  );

  it('fails an uncertain combined request as uncertain and keeps its reservation spent', async () => {
    const h = await harness({
      judge: (request) => ({
        outcome: 'failed',
        reason: 'fixture timeout after dispatch',
        receipt: {
          ...receipt(request.requestId, 'jev'),
          estimatedCostUsd: undefined,
          completionUncertain: true,
        },
      }),
    });
    const job = await h.thought();
    expect(job.status).toBe('failed');
    expect(disposition(job)).toBe('uncertain');
    expect(h.calls.judges).toHaveLength(1);
    expect(h.calls.judges[0]!.requestId).toBe(`${job.id}${ROUTE}`);
    expect(Object.keys(h.calls.judges[0]!.questions).some(handleKey)).toBe(true);
    expect(h.calls.generations).toHaveLength(0);
    const usage = await h.store.usage(h.config.budgetUsd);
    expect(usage.usage.jevCalls).toBe(1);
    expect(usage.budget.spentUsd).toBeGreaterThanOrEqual(decisionAllowance(h.config, 'jev'));
    expect(h.berries()).toBe(2);
    const { root } = await h.trace(job.id);
    expect(root.disposition).toBe('uncertain');
  });

  it('Duplicate results cause no duplicate effect', async () => {
    const h = await harness({ judge: (request) => answer(request, {}) });
    const job = await h.thought();
    expect(job.result).toMatchObject({
      disposition: 'responded',
      level1: { kind: 'act', reason: 'selected', rating: 0.9 },
    });
    await h.service.tick(0.1);
    expect(h.berries()).toBe(1);
    expect(h.ada().agency.plan?.steps).toHaveLength(1);
    // The director admitted the selected action exactly once. Replay its exact arguments through
    // the same durable admission path and job identity.
    const recorded = admissions.filter((entry) => entry.id === job.id);
    expect(recorded).toHaveLength(1);
    const [actorId, response, ...binding] = recorded[0]!.args;
    expect(actorId).toBe(NPC_ID);
    expect(response.operations).toHaveLength(1);
    const replay = (content: ActorResponse) =>
      h.service.transition(
        (world) => commitActorResponse(world, job.id, actorId, content, ...binding),
        undefined,
        job.id,
      );
    const receipt = structuredClone(h.service.world.responseReceipts?.[job.id]);
    const ada = structuredClone(h.ada());
    const events = new Set(h.service.world.events.map((event) => event.id));
    const stored = await h.store.getJob(job.id);

    expect(await replay(response)).toMatchObject({ ok: true, code: 'duplicate' });
    // The same identity with different content (the eat operation twice) is refused outright.
    const changed = {
      operations: [...response.operations, { ...response.operations[0]!, localId: 'again' }],
    };
    expect(await replay(changed)).toEqual({
      ok: false,
      code: 'response-rejected',
      message: 'Response identity was reused with different content.',
    });
    await h.director.idle();
    expect(h.berries()).toBe(1);
    expect(h.ada()).toEqual(ada);
    expect(newEvents(h, events)).toEqual([]);
    expect(h.service.world.responseReceipts?.[job.id]).toEqual(receipt);
    expect(await h.store.getJob(job.id)).toEqual(stored);
    // Later simulation finds only the one completed eat step; nothing was queued twice.
    await h.service.tick(0.1);
    await h.director.idle();
    expect(h.berries()).toBe(1);
    expect(h.ada().agency.plan?.steps).toEqual(ada.agency.plan?.steps);
    expect(h.calls.judges).toHaveLength(1);
    expect(h.calls.generations).toHaveLength(0);
    expect((await h.store.usage(h.config.budgetUsd)).usage).toMatchObject({
      jevCalls: 1,
      llmCalls: 0,
    });
  });

  it('A load race cancels a held level-1 selection', async () => {
    const held = deferred<AiResult<JudgeValue>>();
    const started = deferred<JudgeRequest>();
    const h = await harness({
      judge: (request) => {
        started.resolve(request);
        return held.promise;
      },
    });
    const saveId = randomUUID();
    await h.service.createSave('Hungry Ada', saveId);
    const payload = await h.store.saves.read(h.service.world.id, saveId);
    await h.director.considerThought();
    const request = await started.promise;
    // The held request is the combined routing-and-selection request.
    expect(Object.keys(request.questions)).toEqual(expect.arrayContaining(['route', 'reflection']));
    expect(Object.keys(request.questions).some(handleKey)).toBe(true);
    const { generation, timelineId } = h.service;
    await h.service.restoreSave(saveId, randomUUID(), payload);
    expect(h.service.generation).not.toBe(generation);
    expect(h.service.timelineId).not.toBe(timelineId);
    expect(h.service.paused).toBe(true);
    // The player resumes the loaded timeline before the held answer arrives.
    await h.service.setConnection('fixture-browser', true);
    await h.service.setPresence('fixture-browser', true);
    expect((await h.service.control({ paused: false })).ok).toBe(true);
    expect(h.service.paused).toBe(false);
    expect(h.berries()).toBe(2);
    expect(h.calls.judges).toHaveLength(1);

    held.resolve(answer(request, {}));
    await h.director.idle();
    const jobs = (await h.store.recentJobs(50)).filter((entry) => entry.kind === 'thought');
    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(request.requestId).toBe(`${job!.id}${ROUTE}`);
    // Loading pauses the world, and a pause aborts background cognition before the separate
    // generation check in AiDirector.current() is reached; resuming does not revive it.
    expect(job?.status).toBe('cancelled');
    expect(job?.message).toBe('This request was cancelled before completion.');
    expect(admissions.filter((entry) => entry.id === job!.id)).toEqual([]);
    expect(h.service.world.responseReceipts?.[job!.id]).toBeUndefined();
    await h.service.tick(0.1);
    await h.director.idle();
    expect(h.berries()).toBe(2);
    expect(h.ada().agency.plan ?? null).toBeNull();
    // No automatic retry: the one held request is the only dispatch.
    expect(h.calls.judges).toHaveLength(1);
    expect(h.calls.generations).toHaveLength(0);
    expect((await h.store.usage(h.config.budgetUsd)).usage).toMatchObject({
      jevCalls: 1,
      llmCalls: 0,
    });
  });
});
