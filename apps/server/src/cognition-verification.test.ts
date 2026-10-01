import {
  closeTestDatabases,
  testRepository,
  readConfig,
} from '../../../tests/fixtures/database.js';
import { enterLocalWorld } from '../../../tests/fixtures/service.js';
import { applyBodyEffects, DEFAULT_COGNITION_POLICY, NPC_ID } from '@open-legend/domain';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  compileSchema,
  createAiClient,
  type AiClient,
  type AiReceipt,
  type AiResult,
  type FetchTransport,
  type GenerateRequest,
  type JudgeRequest,
  type JudgeValue,
  type JudgmentAnswer,
  type TypedQuestionMap,
} from '@open-legend/ai';
import { AiDirector } from './ai-director.js';
import type { AppConfig } from './config.js';
import { WorldService } from './world-service.js';
import type { IntelligenceLog } from './intelligence-log.js';
import { traceDetails } from './cognition-inspection.js';
import { LEVEL_LIMITS, RESPONSE_INSTRUCTIONS } from './cognition-contracts.js';
import { prepareActorInvention } from './actor-invention.js';
import { decisionAllowance } from './cognition-budget.js';
import type { JobRecord } from './store.js';
import type { Level1Rating } from './level1-selection.js';

// CR02 verification fixtures (docs/maintainers/cognition-redesign.md#cr02--semantic-levels-and-immediate-speech).
// Explicit specimens for orchestration verification, never evidence of model quality. Every
// provider exchange is a fake AiClient or a fake transport behind the real direct adapters.

const JEV_URL = 'https://api.typesafe.ai/v1/systemone';
const OPENAI_URL = 'https://api.openai.com/v1/responses';
const FAILURES = ['refused', 'unavailable', 'invalid', 'uncertain'] as const;

function receipt(
  requestId: string,
  provider: 'jev' | 'openai',
  overrides: Partial<AiReceipt> = {},
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
    estimatedCostUsd: 0.0001,
    ...overrides,
  };
}
function value<T>(requestId: string, provider: 'jev' | 'openai', result: T): AiResult<T> {
  return { outcome: 'value', value: result, receipt: receipt(requestId, provider) };
}
/** A dispatched provider failure; `uncertain` is an adapter `failed` whose completion is unknown,
 * while `failed` is an adapter failure whose completion is known. */
function failure(
  requestId: string,
  provider: 'jev' | 'openai',
  kind: (typeof FAILURES)[number] | 'failed',
): AiResult<never> {
  return kind === 'uncertain'
    ? {
        outcome: 'failed',
        reason: 'fixture_completion_unknown',
        receipt: receipt(requestId, provider, {
          completionUncertain: true,
          estimatedCostUsd: undefined,
        }),
      }
    : {
        outcome: kind,
        reason: `fixture_${kind}`,
        receipt: receipt(requestId, provider, { estimatedCostUsd: 0 }),
      };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** Fixture Jev answers. Choice and Noul questions are answered as Jev would shape them;
 * action ratings are looked up by the candidate label the question names. */
interface JudgePolicy {
  route?: string | Record<string, number>;
  reflection?: 'yes' | 'no';
  possibleAction?: 'yes' | 'no';
  rate?: (description: string) => number;
}
function choiceAnswer(
  criteria: Record<string, unknown>,
  preference: string | Record<string, number>,
): JudgmentAnswer {
  const keys = Object.keys(criteria);
  const weights = Object.fromEntries(
    keys.map((key) => [
      key,
      typeof preference === 'string' ? Number(key === preference) : (preference[key] ?? 0),
    ]),
  );
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  // An unoffered preference is a fixture error, never silently substituted.
  if (!total) throw new Error(`Fixture choice not offered: ${JSON.stringify(preference)}`);
  const probabilities = Object.fromEntries(keys.map((key) => [key, weights[key]! / total]));
  const choice = keys.reduce((best, key) =>
    probabilities[key]! > probabilities[best]! ? key : best,
  );
  return { type: 'choice', choice, probabilities, confidence: 0.95 };
}
function answers(
  request: { state: unknown; questions: TypedQuestionMap },
  policy: JudgePolicy,
): JudgeValue['answers'] {
  const candidates =
    (request.state as { candidates?: Record<string, string> } | null)?.candidates ?? {};
  const result: JudgeValue['answers'] = {};
  for (const [key, question] of Object.entries(request.questions)) {
    if (question.type === 'choice')
      result[key] = choiceAnswer(
        question.criteria,
        key === 'route'
          ? (policy.route ?? 'level2')
          : key === 'reflection'
            ? (policy.reflection ?? 'no')
            : key === 'possibleAction'
              ? (policy.possibleAction ?? 'no')
              : Object.keys(question.criteria)[0]!,
      );
    else if (question.type === 'noul') {
      const label = question.instructions.match(/Option \d+/)?.[0];
      result[key] = {
        type: 'noul',
        noul: /^a\d+$/.test(key) && policy.rate ? policy.rate(candidates[label ?? ''] ?? '') : 0.9,
      };
    } else throw new Error('Unexpected score question in fixture');
  }
  return result;
}
/** The permitted handle of the person whose speech triggered the decision. */
function speaker(context: string): string {
  const handle = context.match(/"speaker":"[^"]*\(ID:([0-9a-f]+)\)"/)?.[1];
  if (!handle) throw new Error('Fixture context has no permitted speaker reference.');
  return handle;
}
function talk(context: string, text: string) {
  return {
    operations: [
      {
        localId: 'reply',
        requiresAccepted: [],
        note: null,
        name: null,
        talk: {
          text,
          addresseeEntityId: speaker(context),
          selfIntroduction: null,
          volume: 'normal',
        },
        act: null,
        goal: null,
        plan: null,
        think: null,
      },
    ],
  };
}

/** Fake HTTP transport behind the real direct adapters: valid Jev and Responses bodies. */
function fixtureTransport(
  policy: () => JudgePolicy,
  reply: (body: Record<string, unknown>) => unknown,
) {
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  const outputs: string[] = [];
  const json = (data: unknown) =>
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  const fetch: FetchTransport = async (url, init) => {
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    requests.push({ url, body });
    if (url === JEV_URL)
      return json({
        model: body['model'],
        answers: answers(
          { state: body['state'], questions: body['questions'] as TypedQuestionMap },
          policy(),
        ),
        usage: { input_tokens: 1000, output_tokens: 0 },
      });
    if (url === OPENAI_URL) {
      // Only NPC responses are under test; any other generation is rejected before a result.
      if ((body['text'] as { format?: { name?: string } }).format?.name !== 'npc_response')
        return new Response('{}', { status: 400 });
      outputs.push(JSON.stringify(reply(body)));
      return json({
        id: `resp_fixture_${outputs.length}`,
        model: body['model'],
        status: 'completed',
        output: [
          { type: 'reasoning', summary: [] },
          {
            type: 'message',
            content: [{ type: 'output_text', text: outputs.at(-1) }],
          },
        ],
        usage: { input_tokens: 1000, output_tokens: 50 },
      });
    }
    throw new Error(`Unexpected fixture request ${url}`);
  };
  return {
    fetch,
    requests,
    outputs,
    /** Responses requests for NPC decisions (other generation tasks are not under test). */
    responses: (from = 0) =>
      requests
        .slice(from)
        .filter(
          (request) =>
            request.url === OPENAI_URL &&
            (request.body['text'] as { format?: { name?: string } }).format?.name ===
              'npc_response',
        )
        .map((request) => request.body),
  };
}
/** The production direct-provider construction with fixture keys and the fake transport. */
function directClient(config: AppConfig, fetch: FetchTransport): AiClient {
  return createAiClient({
    jev: { apiKey: 'fixture', model: config.jevModel, prices: config.jevPrices },
    openai: {
      apiKey: 'fixture',
      model: config.llmModel,
      prices: config.llmPrices,
      reasoningEffort: 'low',
    },
    fetch,
    timeoutMs: config.aiTimeoutMs,
    maxRequestBytes: 500_000,
    maxResponseBytes: 500_000,
    maxOutputTokens: 8192,
  });
}

const cleanup: (() => Promise<void>)[] = [];
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
    // Drop this test's disposable databases now instead of all of them in the shared 10 s
    // teardown hook. A drop that times out stays registered, and that hook retries and reports it.
    await closeTestDatabases().catch(() => {});
    expect(network).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
}, 120_000);

async function harness(
  options: { env?: Record<string, string>; client?: (config: AppConfig) => AiClient } = {},
) {
  const now = 10_000;
  const config = readConfig({
    TYPESAFE_API_KEY: 'test-fixture-key',
    OPENAI_API_KEY: 'test-fixture-key',
    // Without this, background recall indexing inherits the fixture key and reaches the
    // real embeddings endpoint through the global transport.
    OPENAI_EMBEDDING_API_KEY: '',
    // In-process simulated accounting with fixture receipts, not spending.
    AI_BUDGET_USD: '1',
    NARRATION_BATCH_MS: '10000',
    ...options.env,
  });
  const store = await testRepository();
  const service = new WorldService(store, config, () => now);
  await enterLocalWorld(service);
  await service.setPresence('fixture-browser', true);
  const calls = { judges: [] as JudgeRequest[], generations: [] as GenerateRequest[] };
  const state: {
    policy: JudgePolicy;
    judge?: (request: JudgeRequest) => AiResult<JudgeValue> | Promise<AiResult<JudgeValue>>;
    generate?: (request: GenerateRequest) => AiResult<unknown> | Promise<AiResult<unknown>>;
  } = { policy: {} };
  const fake: AiClient = {
    async judge(request) {
      calls.judges.push(request);
      return state.judge
        ? await state.judge(request)
        : value(request.requestId, 'jev', { answers: answers(request, state.policy) });
    },
    async generate<T>(request: GenerateRequest): Promise<AiResult<T>> {
      calls.generations.push(request);
      // Only NPC decisions are under test; background work (for example private narration)
      // receives no fixture content.
      return (
        request.task !== 'npc_response'
          ? failure(request.requestId, 'openai', 'unavailable')
          : state.generate
            ? await state.generate(request)
            : value(request.requestId, 'openai', { operations: [] })
      ) as AiResult<T>;
    },
  };
  // Injected direct adapters are recorded like the fake so request IDs stay inspectable.
  const direct = options.client?.(config);
  const client: AiClient = direct
    ? {
        judge(request) {
          calls.judges.push(request);
          return direct.judge(request);
        },
        generate<T>(request: GenerateRequest) {
          calls.generations.push(request);
          return direct.generate<T>(request);
        },
      }
    : fake;
  const director = new AiDirector(service, client, () => now);
  const log = (director as unknown as { log: IntelligenceLog }).log;
  cleanup.push(async () => {
    await director.close();
    await store.close();
  });
  const reflectionKey = `reflection-queue:${service.world.id}:${NPC_ID}`;
  return {
    config,
    store,
    service,
    director,
    calls,
    state,
    reflectionKey,
    reflectionRow: `reflection-queued:${service.world.id}:${NPC_ID}`,
    npcResponses: () => calls.generations.filter((request) => request.task === 'npc_response'),
    async chat(id: string, text: string): Promise<JobRecord> {
      const result = await director.submit('chat', id, text, NPC_ID);
      expect(result.ok, result.message).toBe(true);
      await director.idle();
      return (await store.getJob(result.jobId!))!;
    },
    /** Kill a native animal Ada can see through the native body-effect owner. */
    async kill(targetId: string) {
      const revision = service.world.entities[targetId]!.actor!.body!.revision;
      const result = await service.transition((world) =>
        applyBodyEffects(
          world,
          `fixture-death:${targetId}`,
          [{ targetId, kind: 'health', amount: -100 }],
          { [targetId]: revision },
        ),
      );
      expect(result.ok, result.message).toBe(true);
      expect(service.world.entities[targetId]!.actor!.alive).toBe(false);
    },
    /** Admit exactly one autonomous (non-speech) decision for Ada. */
    async think(): Promise<JobRecord> {
      const before = calls.judges.length;
      await director.considerThought();
      await director.idle();
      const ids = [
        ...new Set(
          calls.judges
            .slice(before)
            .map((request) => request.requestId.split(':')[0]!)
            .filter((id) => id.startsWith('thought-')),
        ),
      ];
      expect(ids).toHaveLength(1);
      const job = (await store.getJob(ids[0]!))!;
      expect(job).toMatchObject({ kind: 'thought', request: { npcId: NPC_ID } });
      return job;
    },
    async trace(id: string) {
      await director.idle();
      await log.flush();
      const details = (await traceDetails(store, id, service.world))!;
      return {
        route: details.root.route,
        disposition: details.root.disposition,
        status: details.root.status,
        input: details.root.input as Record<string, unknown>,
        kinds: [...new Set(details.children.map((child) => child.kind))],
        children: details.children,
      };
    },
    async flush() {
      await director.idle();
      await log.flush();
    },
    spent: async () =>
      (await store.usage(config.budgetUsd)).budget.accounts?.[NPC_ID]?.spentUsd ?? 0,
  };
}
type Harness = Awaited<ReturnType<typeof harness>>;
const routeRequest = (h: Harness, jobId: string) =>
  h.calls.judges.find((request) => request.requestId === `${jobId}:attempt:0:route`);
/** Jev request IDs a decision sent, excluding context-relevance attention batches. */
const decisionJudges = (h: Harness, jobId: string) =>
  h.calls.judges
    .map((request) => request.requestId)
    .filter((id) => id.startsWith(`${jobId}:`) && !id.includes(':attention:'));
const ratingHandles = (questions: TypedQuestionMap) =>
  Object.keys(questions).filter((key) => /^a\d+$/.test(key));
const selectedHandle = (job: JobRecord) =>
  (job.result as { level1: { handle: string } }).level1.handle;
const CONTINUE = /^(Remain in place|Continue the)/;
/** Every property name anywhere in a JSON schema. */
function propertyNames(schema: unknown, names = new Set<string>()): Set<string> {
  if (Array.isArray(schema)) for (const item of schema) propertyNames(item, names);
  else if (schema && typeof schema === 'object')
    for (const [key, item] of Object.entries(schema)) {
      if (key === 'properties' && item && typeof item === 'object')
        for (const name of Object.keys(item)) names.add(name);
      propertyNames(item, names);
    }
  return names;
}

// Each test creates disposable PostgreSQL databases, which is slow while other suites run.
describe(
  'CR02 cognition verification with explicit fixtures, no live calls',
  { timeout: 480_000 },
  () => {
    it('answers a greeting with one low-effort level-2 mini request, a minimal schema, no reflection and no harness', async () => {
      const h = await harness();
      h.state.policy = { route: 'level2', reflection: 'no', possibleAction: 'no' };
      h.state.generate = (request) =>
        value(request.requestId, 'openai', talk(String(request.context), 'Hello. I am Ada.'));
      const job = await h.chat('greeting', 'Hello');

      // Routing offered generation, selected level 2 and asked reflection separately (answered no).
      const route = routeRequest(h, job.id)!;
      expect(Object.keys(route.questions)).toEqual(['route', 'reflection', 'possibleAction']);
      const routeQuestion = route.questions['route']!;
      expect(routeQuestion.type === 'choice' && routeQuestion.criteria).toEqual(
        expect.objectContaining({ level2: expect.any(String), level4: expect.any(String) }),
      );
      // A certain "no" action gate sends no level-1 rating request on the dependent path.
      expect(decisionJudges(h, job.id)).toEqual([`${job.id}:attempt:0:route`]);

      // Exactly one direct mini-model request with low effort and the level-2 output ceiling.
      const invention = await prepareActorInvention(h.service, NPC_ID);
      expect(invention.enabled).toBe(false); // Bundled world locks autonomous invention.
      const [generation, ...others] = h.npcResponses();
      expect(others).toHaveLength(0);
      expect(generation).toMatchObject({
        requestId: `${job.id}:attempt:0:generate`,
        execution: 'fast',
        reasoningEffort: 'low',
        model: h.config.miniModel,
        maxOutputTokens: invention.enabled
          ? Math.max(1800, LEVEL_LIMITS[2].outputTokens)
          : LEVEL_LIMITS[2].outputTokens,
      });
      expect(generation!.maxOutputTokens).toBe(1024);
      // No harness ('full') run and no high-effort reasoning anywhere in this workflow.
      expect(h.calls.generations.some((request) => request.execution === 'full')).toBe(false);
      expect(h.calls.generations.some((request) => request.reasoningEffort === 'high')).toBe(false);

      // The response schema requires no relationship, mind, document or policy fields; every
      // operation kind is optional and an empty operations list is valid.
      const schema = generation!.schema as {
        properties: Record<string, unknown>;
        required: string[];
      };
      expect(Object.keys(schema.properties)).toEqual(['operations']);
      expect(schema.required).toEqual(['operations']);
      expect(schema.properties['operations']).not.toHaveProperty('minItems');
      expect(
        [...propertyNames(schema)].filter((name) =>
          /relationship|document|record|mind|policy/i.test(name),
        ),
      ).toEqual([]);
      const validate = compileSchema(schema);
      expect(validate({ operations: [] })).toBe(true);
      expect(validate(talk(String(generation!.context), 'Hi.'))).toBe(true);

      // Real effects: Ada's reply is committed as speech, and nothing queued reflection.
      expect(job).toMatchObject({ status: 'completed', result: { disposition: 'responded' } });
      expect(h.service.world.responseReceipts?.[job.id]?.components['reply']?.ok).toBe(true);
      expect(
        h.service.world.events.some(
          (event) =>
            event.type === 'speech' &&
            event.actorId === NPC_ID &&
            event.data?.['text'] === 'Hello. I am Ada.',
        ),
      ).toBe(true);
      expect(await h.store.getIntegration(h.reflectionKey)).toBeFalsy();
      await h.flush();
      expect(await h.store.intelligenceCall(h.reflectionRow)).toBeUndefined();
      const trace = await h.trace(job.id);
      expect(trace).toMatchObject({ route: 'level2', disposition: 'responded' });
      expect(trace.kinds).toContain('LM · fast · npc_response');
      expect(trace.children.find((child) => child.kind === 'Semantic decision')).toMatchObject({
        input: {
          selectionRequest: 'dependent',
          nativeGates: {
            generationAvailable: true,
            addressedSpeech: true,
            speechTrigger: true,
            actionSelection: false,
          },
        },
        output: { selectedRoute: 'level2', route: 'level2' },
      });
      expect(trace.kinds).not.toContain('Action context');
      expect(trace.kinds).not.toContain('Level-1 selection');
      expect(trace.kinds.filter((kind) => kind.startsWith('LM · full'))).toEqual([]);
      expect(network).not.toHaveBeenCalled();
    });

    it('queues reflection for an exceptional event without delaying the decision, conversation or simulation', async () => {
      const h = await harness();
      await h.kill('deer-1');
      h.state.policy = {
        route: 'level1',
        reflection: 'yes',
        rate: (description) => (CONTINUE.test(description) ? 0.9 : 0.1),
      };
      const ada = () => h.service.world.entities[NPC_ID]!.actor!;
      const before = structuredClone({
        action: ada().action ?? null,
        plan: ada().agency.plan ?? null,
      });
      const job = await h.think();

      // One combined Jev request carried route, reflection and the per-action ratings.
      const route = routeRequest(h, job.id)!;
      expect(Object.keys(route.questions)).toEqual(
        expect.arrayContaining(['route', 'reflection', 'a0']),
      );
      expect(
        h.calls.judges
          .map((request) => request.requestId)
          .filter((id) => id.startsWith(`${job.id}:`)),
      ).toEqual([`${job.id}:attempt:0:route`]);
      const stimulus = (route.state as { decisionContext: { stimulus: string } }).decisionContext
        .stimulus;
      expect(stimulus).toContain('a deer died');

      // The decision finished on its own (continuing existing behavior) without waiting for reflection.
      expect(job).toMatchObject({
        status: 'completed',
        result: { disposition: 'continued', level1: { kind: 'continue', reason: 'selected' } },
      });
      expect(job.completedAt).toBeDefined();
      const trace = await h.trace(job.id);
      expect(trace).toMatchObject({ route: 'level1', disposition: 'continued' });
      const decision = trace.children.find((child) => child.kind === 'Semantic decision')!;
      expect(decision.output).toMatchObject({
        answers: { reflection: { choice: 'yes' } },
        route: 'level1',
      });
      expect(decision.input).toMatchObject({ selectionRequest: 'combined' });

      // Continuing is an admitted choice of the offered continue binding, rated in that same
      // request, that commits an empty response and leaves Ada's current work untouched.
      const selection = trace.children.find((child) => child.id === `${job.id}:attempt:0:level1`)!;
      expect(selection).toMatchObject({
        kind: 'Level-1 selection',
        input: { selectionRequest: 'combined', ignoredAnswers: [] },
        output: { outcome: { kind: 'continue', reason: 'selected', rating: 0.9 } },
      });
      const ratings = (selection.input as { ratings: Level1Rating[] }).ratings;
      expect(ratings.map((rating) => rating.handle)).toEqual(ratingHandles(route.questions));
      expect(ratings.every((rating) => rating.status === 'rated')).toBe(true);
      expect(ratings.filter((rating) => rating.rating === 0.9)).toEqual([
        expect.objectContaining({
          handle: selectedHandle(job),
          description: expect.stringMatching(CONTINUE),
        }),
      ]);
      expect(trace.kinds).toContain('Response admission');
      const receipt = h.service.world.responseReceipts?.[job.id];
      expect(receipt?.outcome).toMatchObject({ ok: true, code: 'response-empty' });
      expect(Object.keys(receipt?.components ?? { missing: true })).toEqual([]);
      expect({ action: ada().action ?? null, plan: ada().agency.plan ?? null }).toEqual(before);

      // The reflection answer queued this decision's stimulus for background reflection.
      const queued = await h.store.getIntegration(h.reflectionKey);
      expect(queued).toMatchObject({ actorId: NPC_ID, origin: job.id, reason: stimulus });
      await h.flush();
      // No reflection harness is configured in fixtures, so the opportunity row reports that the
      // queued entry is waiting rather than dispatched.
      expect(await h.store.intelligenceCall(h.reflectionRow)).toMatchObject({
        kind: 'Reflection opportunity',
        actorId: NPC_ID,
        disposition: 'deferred',
        input: { origin: job.id, reason: stimulus },
        output: { reason: 'Reflection harness is not configured.' },
      });
      expect(
        h.calls.generations.filter(
          (request) => request.task === 'background_reflection' || request.execution === 'full',
        ),
      ).toEqual([]);

      // Simulation time advances and conversation continues while the reflection stays queued.
      const simTime = h.service.world.simTime;
      await h.service.tick(1);
      expect(h.service.world.simTime).toBeGreaterThan(simTime);
      h.state.policy = { route: 'level2', reflection: 'no', possibleAction: 'no' };
      h.state.generate = (request) =>
        value(request.requestId, 'openai', talk(String(request.context), 'That deer just fell.'));
      const reply = await h.chat('after-death', 'Did you see that?');
      expect(reply).toMatchObject({ status: 'completed', result: { disposition: 'responded' } });
      expect(await h.store.getIntegration(h.reflectionKey)).toEqual(queued);
      expect(h.calls.generations.some((request) => request.execution === 'full')).toBe(false);
      expect(network).not.toHaveBeenCalled();
    });

    it('starts each decision with fresh provider history and current instructions through the real direct adapters', async () => {
      const replies = ['Welcome to the river camp.'];
      const transport = fixtureTransport(
        () => ({ route: 'level2', reflection: 'no', possibleAction: 'no' }),
        (body) => {
          const text = replies.shift();
          return text ? talk(String(body['input']), text) : { operations: [] };
        },
      );
      const h = await harness({
        env: { AI_BUDGET_USD: '5' },
        client: (config) => directClient(config, transport.fetch),
      });
      expect(h.director.executionSource).toBe('test-fixture');
      const first = await h.chat('fresh-1', 'Hello');
      const second = await h.chat('fresh-2', 'What are you making?');
      expect(first).toMatchObject({ status: 'completed', result: { disposition: 'responded' } });
      expect(second).toMatchObject({
        status: 'completed',
        result: { disposition: 'response-empty' },
      });

      // One route judgment and one separate generation per decision.
      for (const job of [first, second])
        expect(decisionJudges(h, job.id)).toEqual([`${job.id}:attempt:0:route`]);
      expect(h.npcResponses().map((request) => request.requestId)).toEqual([
        `${first.id}:attempt:0:generate`,
        `${second.id}:attempt:0:generate`,
      ]);
      const suffix = (await prepareActorInvention(h.service, NPC_ID)).instructions;
      const bodies = transport.responses();
      expect(bodies).toHaveLength(2);
      for (const body of bodies) {
        // Exact top-level keys: no stored response, previous response, conversation or session.
        expect(Object.keys(body).sort()).toEqual([
          'input',
          'instructions',
          'max_output_tokens',
          'model',
          'reasoning',
          'service_tier',
          'store',
          'text',
        ]);
        expect(body).toMatchObject({
          store: false,
          instructions: `${RESPONSE_INSTRUCTIONS} ${suffix}`,
          text: { format: { type: 'json_schema', name: 'npc_response', strict: true } },
        });
        expect(typeof body['input']).toBe('string');
      }
      const [firstInput, secondInput] = bodies.map((body) => String(body['input'])) as [
        string,
        string,
      ];
      // The first reply reaches the second request only as world-derived conversation evidence:
      // no provider response ID, raw model output or earlier instructions are carried over.
      expect(firstInput).not.toContain('Welcome to the river camp.');
      const section = secondInput.indexOf('## Conversation so far');
      expect(section).toBeGreaterThanOrEqual(0);
      const conversation = secondInput.slice(section, secondInput.indexOf('\n## ', section + 1));
      expect(conversation).toContain('I said to a person (ID:');
      const mentions = secondInput.split('\n').filter((line) => line.includes('river camp'));
      expect(mentions.length).toBeGreaterThan(0);
      for (const line of mentions)
        expect(line).toMatch(/I said to .+: "Welcome to the river camp\."$/);
      expect(transport.outputs[0]).toContain('"text":"Welcome to the river camp."');
      for (const transcript of [
        'resp_fixture_1',
        transport.outputs[0]!,
        '"text":"Welcome to the river camp."',
        RESPONSE_INSTRUCTIONS,
      ])
        expect(secondInput).not.toContain(transcript);

      const jev = transport.requests.filter((request) => request.url === JEV_URL);
      expect(jev.length).toBeGreaterThanOrEqual(2);
      for (const { body } of jev) {
        expect(Object.keys(body).sort()).toEqual(['model', 'questions', 'state']);
        expect(body['model']).toBe(h.config.jevModel);
      }
      expect(network).not.toHaveBeenCalled();
    });

    it('forwards the actual model, effort and output limit per level and never substitutes a missing capability', async () => {
      expect(DEFAULT_COGNITION_POLICY.maxImmediateLevel).toBe(4);
      let policy: JudgePolicy = {};
      const transport = fixtureTransport(
        () => policy,
        () => ({ operations: [] }),
      );
      const h = await harness({
        env: { AI_BUDGET_USD: '5' },
        client: (config) => directClient(config, transport.fetch),
      });
      const expected = {
        level2: { model: h.config.miniModel, effort: 'low', tokens: 1024, stage: 'fast' },
        level3: { model: h.config.complexModel, effort: 'low', tokens: 4096, stage: 'complex' },
        level4: { model: h.config.complexModel, effort: 'high', tokens: 8192, stage: 'complex' },
      } as const;
      for (const [route, want] of Object.entries(expected)) {
        const level = Number(route.slice(-1)) as 2 | 3 | 4;
        expect([want.effort, want.tokens]).toEqual([
          LEVEL_LIMITS[level].effort,
          LEVEL_LIMITS[level].outputTokens,
        ]);
        policy = { route, reflection: 'no', possibleAction: 'no' };
        const before = transport.requests.length;
        const job = await h.chat(`forward-${route}`, `Please consider this carefully (${route}).`);
        expect(job).toMatchObject({
          status: 'completed',
          result: { disposition: 'response-empty' },
        });
        const sent = transport.requests.slice(before);
        const generations = transport.responses(before);
        expect(generations).toHaveLength(1);
        expect(generations[0]).toMatchObject({
          model: want.model,
          reasoning: { effort: want.effort },
          max_output_tokens: want.tokens,
          store: false,
        });
        const judged = sent.filter((request) => request.url === JEV_URL);
        for (const { body } of judged)
          expect(body).toMatchObject({
            model: h.config.jevModel,
            state: expect.anything(),
            questions: expect.any(Object),
          });
        const routing = judged.find(
          (request) => 'route' in (request.body['questions'] as TypedQuestionMap),
        )!;
        const criteria = (routing.body['questions'] as TypedQuestionMap)['route'] as {
          criteria: Record<string, string>;
        };
        expect(Object.keys(criteria.criteria).sort()).toEqual([
          'level1',
          'level2',
          'level3',
          'level4',
          'native',
        ]);
        const trace = await h.trace(job.id);
        expect(trace.route).toBe(route);
        expect(trace.kinds).toContain(`LM · ${want.stage} · npc_response`);
      }

      // Missing generation capability: generative routes are not offered and nothing substitutes.
      const jevOnlyTransport = fixtureTransport(
        () => ({ route: 'level1', reflection: 'no', possibleAction: 'yes', rate: () => 0.3 }),
        () => ({ operations: [] }),
      );
      const jevOnly = await harness({
        env: { AI_JEV_ONLY: 'true' },
        client: (config) => directClient(config, jevOnlyTransport.fetch),
      });
      const job = await jevOnly.chat('jev-only', 'Hello');
      const routing = jevOnlyTransport.requests.find(
        (request) =>
          request.url === JEV_URL && 'route' in (request.body['questions'] as TypedQuestionMap),
      )!;
      expect(
        Object.keys(
          (
            (routing.body['questions'] as TypedQuestionMap)['route'] as {
              criteria: Record<string, string>;
            }
          ).criteria,
        ).sort(),
      ).toEqual(['level1', 'native']);
      expect(jevOnlyTransport.requests.filter((request) => request.url !== JEV_URL)).toEqual([]);
      expect(jevOnly.npcResponses()).toEqual([]);
      // Speech uses the dependent path: routing first, then one separate level-1 rating request.
      expect(decisionJudges(jevOnly, job.id)).toEqual([
        `${job.id}:attempt:0:route`,
        `${job.id}:attempt:0:action-attention`,
      ]);
      expect(Object.keys(routeRequest(jevOnly, job.id)!.questions)).toEqual([
        'route',
        'reflection',
        'possibleAction',
      ]);
      const rating = jevOnly.calls.judges.find(
        (request) => request.requestId === `${job.id}:attempt:0:action-attention`,
      )!;
      const handles = Object.keys(rating.questions);
      expect(handles.length).toBeGreaterThan(0);
      expect(ratingHandles(rating.questions)).toEqual(handles);
      for (const question of Object.values(rating.questions))
        expect(question).toMatchObject({
          type: 'noul',
          instructions: expect.stringContaining('offer concrete progress'),
        });
      expect(job).toMatchObject({
        status: 'completed',
        result: {
          disposition: 'deferred',
          reason: 'no-suitable-action',
          level1: { kind: 'defer', escalationBlocked: 'generation-unavailable' },
        },
      });
      const trace = await jevOnly.trace(job.id);
      expect(trace).toMatchObject({ route: 'level1', disposition: 'deferred' });
      expect(trace.input['offeredRoutes']).toEqual(['native', 'level1']);
      expect(trace.kinds.filter((kind) => kind.startsWith('LM ·'))).toEqual([]);
      const selection = trace.children.find((child) => child.id === `${job.id}:attempt:0:level1`)!;
      expect(selection).toMatchObject({
        kind: 'Level-1 selection',
        input: { selectionRequest: 'dependent', ignoredAnswers: [] },
        output: {
          outcome: {
            kind: 'defer',
            reason: 'no-suitable-action',
            escalationBlocked: 'generation-unavailable',
            best: { rating: 0.3 },
          },
        },
      });
      expect((selection.input as { ratings: Level1Rating[] }).ratings).toEqual(
        handles.map((handle) => expect.objectContaining({ handle, rating: 0.3, status: 'rated' })),
      );
      // Deferral commits nothing.
      expect(jevOnly.service.world.responseReceipts?.[job.id]).toBeUndefined();
      expect(trace.kinds).not.toContain('Response admission');
      expect(network).not.toHaveBeenCalled();
    });

    it('keeps refused, unavailable, invalid and uncertain outcomes distinct, and cancellation cancelled', async () => {
      const h = await harness();
      h.state.policy = { route: 'level2', reflection: 'no', possibleAction: 'no' };
      // A known adapter failure is the control for `uncertain`: only unknown completion maps there.
      const generationOutcomes = [...FAILURES, 'failed'] as const;
      for (const kind of generationOutcomes) {
        h.state.generate = (request) => failure(request.requestId, 'openai', kind);
        const spent = await h.spent();
        const job = await h.chat(`outcome-${kind}`, `Fixture ${kind} request.`);
        expect(job.status).toBe('failed');
        expect(job.result).toEqual({ disposition: kind });
        expect(h.service.world.responseReceipts?.[job.id]).toBeUndefined();
        const trace = await h.trace(job.id);
        expect(trace).toMatchObject({ route: 'level2', status: 'failed', disposition: kind });
        const charged = (await h.spent()) - spent;
        // Unknown completion keeps the generation reservation charged; the others settle their receipts.
        if (kind === 'uncertain')
          expect(charged).toBeGreaterThanOrEqual(decisionAllowance(h.config, 'openai'));
        else expect(charged).toBeLessThan(0.01);
      }
      expect(h.npcResponses()).toHaveLength(generationOutcomes.length);

      // A Jev routing failure is reported with its own outcome and stops before generation.
      for (const kind of ['refused', 'uncertain', 'failed'] as const) {
        h.state.judge = (request) =>
          request.requestId.endsWith(':attempt:0:route')
            ? failure(request.requestId, 'jev', kind)
            : value(request.requestId, 'jev', { answers: answers(request, h.state.policy) });
        const spent = await h.spent();
        const job = await h.chat(`outcome-jev-${kind}`, `Fixture Jev ${kind}.`);
        expect(job.status).toBe('failed');
        expect(job.result).toEqual({ disposition: kind });
        expect(await h.trace(job.id)).toMatchObject({ status: 'failed', disposition: kind });
        const charged = (await h.spent()) - spent;
        if (kind === 'uncertain')
          expect(charged).toBeGreaterThanOrEqual(decisionAllowance(h.config, 'jev'));
        else expect(charged).toBeLessThan(0.01);
      }
      expect(h.npcResponses()).toHaveLength(generationOutcomes.length);
      delete h.state.judge;

      // Cancellation during generation stays cancelled; the late value commits nothing.
      const wait = deferred<AiResult<unknown>>();
      const started = deferred<GenerateRequest>();
      h.state.generate = (request) => {
        started.resolve(request);
        return wait.promise;
      };
      const submitted = await h.director.submit(
        'chat',
        'outcome-cancel',
        'Fixture cancel.',
        NPC_ID,
      );
      const pending = await started.promise;
      expect((await h.director.cancel(submitted.jobId!)).code).toBe('cancelling');
      wait.resolve(value(pending.requestId, 'openai', talk(String(pending.context), 'Too late.')));
      await h.director.idle();
      const cancelled = (await h.store.getJob(submitted.jobId!))!;
      expect(cancelled.status).toBe('cancelled');
      expect(h.service.world.responseReceipts?.[cancelled.id]).toBeUndefined();
      expect(h.service.world.events.some((event) => event.data?.['text'] === 'Too late.')).toBe(
        false,
      );
      expect(await h.trace(cancelled.id)).toMatchObject({
        status: 'failed',
        disposition: 'cancelled',
      });
      expect(network).not.toHaveBeenCalled();
    });

    it('records fixture dispatch traces for every level, speech and failure outcome', async () => {
      const h = await harness();
      const rows: {
        scenario: string;
        route?: string;
        disposition?: string;
        selection?: string;
        kinds: string[];
      }[] = [];
      const record = async (scenario: string, job: JobRecord) => {
        const trace = await h.trace(job.id);
        const decision = trace.children.find((child) => child.kind === 'Semantic decision');
        rows.push({
          scenario,
          route: trace.route,
          disposition: trace.disposition,
          selection: (decision?.input as { selectionRequest?: string } | undefined)
            ?.selectionRequest,
          kinds: trace.kinds,
        });
        return trace;
      };
      const speech = (text: string) => (request: GenerateRequest) =>
        value(request.requestId, 'openai', talk(String(request.context), text));

      // Autonomous event triggers use the combined level-1 request.
      await h.kill('deer-1');
      h.state.policy = { route: 'native', reflection: 'no' };
      const native = await h.think();
      await record('native', native);
      // Control for the reflection test: with reflection answered "no", the significant event
      // alone queues the coalesced event sentence, never the decision's stimulus.
      const nativeStimulus = (
        routeRequest(h, native.id)!.state as { decisionContext: { stimulus: string } }
      ).decisionContext.stimulus;
      expect(nativeStimulus).toContain('a deer died');
      const eventQueued = (await h.store.getIntegration(h.reflectionKey)) as
        | { origin: string; reason: string }
        | undefined;
      expect(eventQueued).toMatchObject({ actorId: NPC_ID, origin: native.id });
      expect(eventQueued!.reason).not.toBe(nativeStimulus);

      await h.kill('hare-1');
      h.state.policy = {
        route: 'level1',
        reflection: 'no',
        rate: (description) => (description.startsWith('Prepare 1 Fiber cord') ? 0.9 : 0.1),
      };
      const cordStep = expect.objectContaining({
        command: expect.objectContaining({ type: 'prepare', preparation: 'cord' }),
      });
      const steps = () => h.service.world.entities[NPC_ID]!.actor!.agency.plan?.steps ?? [];
      expect(steps()).not.toEqual(expect.arrayContaining([cordStep]));
      const act = await h.think();
      const acted = await record('level1 act', act);
      expect(act.result).toMatchObject({
        disposition: 'responded',
        level1: { kind: 'act', reason: 'selected', rating: 0.9 },
      });
      expect(decisionJudges(h, act.id)).toEqual([`${act.id}:attempt:0:route`]);
      expect(
        (
          acted.children.find((child) => child.id === `${act.id}:attempt:0:level1`)!.input as {
            ratings: Level1Rating[];
          }
        ).ratings.find((rating) => rating.handle === selectedHandle(act)),
      ).toMatchObject({ rating: 0.9, description: expect.stringMatching(/^Prepare 1 Fiber cord/) });
      // The selected binding was admitted natively and now drives Ada's plan.
      const actReceipt = h.service.world.responseReceipts?.[act.id];
      expect(Object.values(actReceipt?.components ?? {}).length).toBeGreaterThan(0);
      expect(Object.values(actReceipt!.components).every((part) => part.ok)).toBe(true);
      expect(steps()).toEqual(expect.arrayContaining([cordStep]));

      await h.kill('hare-2');
      h.state.policy = {
        // Level 3 outranks level 2 among the offered generative routes, so the escalation level
        // must come from this distribution rather than the level-2 default.
        route: { level1: 0.6, level3: 0.3, level2: 0.1 },
        reflection: 'no',
        rate: (description) => (CONTINUE.test(description) ? 0.6 : 0.3),
      };
      const generationsBefore = h.npcResponses().length;
      const escalated = await h.think();
      const escalation = await record('level1 escalation', escalated);
      expect(escalated.result).toMatchObject({
        disposition: 'response-empty',
        level1: {
          kind: 'escalate',
          reason: 'uncertain-selection',
          level: 3,
          best: { rating: 0.6 },
        },
      });
      const best = (escalated.result as { level1: { best: { handle: string } } }).level1.best
        .handle;
      const selection = escalation.children.find(
        (child) => child.id === `${escalated.id}:attempt:0:level1`,
      )!;
      expect(selection).toMatchObject({
        kind: 'Level-1 selection',
        input: { policy: { version: 'level1-v1' }, selectionRequest: 'combined' },
        output: { outcome: { kind: 'escalate', level: 3 } },
      });
      expect(
        (selection.input as { ratings: Level1Rating[] }).ratings.find(
          (rating) => rating.handle === best,
        ),
      ).toMatchObject({ rating: 0.6, description: expect.stringMatching(CONTINUE) });
      // One complex level-3 request, offered only the action rated at or above 0.5.
      const [generation, ...extra] = h.npcResponses().slice(generationsBefore);
      expect(extra).toEqual([]);
      expect(generation).toMatchObject({
        requestId: `${escalated.id}:attempt:0:generate`,
        execution: 'complex',
        model: h.config.complexModel,
        reasoningEffort: LEVEL_LIMITS[3].effort,
        maxOutputTokens: LEVEL_LIMITS[3].outputTokens,
      });
      const context = String(generation!.context);
      const section = context.slice(context.indexOf('## Actions\n'));
      const listed = section
        .slice(0, section.indexOf('\n## ') >= 0 ? section.indexOf('\n## ') : undefined)
        .split('\n')
        .filter((line) => /^- a\d+: /.test(line));
      expect(listed).toHaveLength(1);
      expect(listed[0]!.startsWith(`- ${best}: `)).toBe(true);
      expect(listed[0]!.slice(`- ${best}: `.length)).toMatch(CONTINUE);

      // Speech triggers use the dependent request and generation levels 2-4.
      h.state.policy = { route: 'level2', reflection: 'no', possibleAction: 'no' };
      h.state.generate = speech('Good morning.');
      await record('speech level2', await h.chat('coverage-speech', 'Good morning, Ada.'));
      delete h.state.generate;
      for (const route of ['level3', 'level4']) {
        h.state.policy = { route, reflection: 'no', possibleAction: 'no' };
        await record(route, await h.chat(`coverage-${route}`, `A harder question (${route}).`));
      }
      h.state.policy = { route: 'level2', reflection: 'no', possibleAction: 'no' };
      for (const kind of FAILURES) {
        h.state.generate = (request) => failure(request.requestId, 'openai', kind);
        await record(kind, await h.chat(`coverage-${kind}`, `Fixture ${kind}.`));
      }
      const wait = deferred<AiResult<unknown>>();
      const started = deferred<GenerateRequest>();
      h.state.generate = (request) => {
        started.resolve(request);
        return wait.promise;
      };
      const submitted = await h.director.submit('chat', 'coverage-cancel', 'Cancel me.', NPC_ID);
      const pending = await started.promise;
      await h.director.cancel(submitted.jobId!);
      wait.resolve(value(pending.requestId, 'openai', { operations: [] }));
      await h.director.idle();
      await record('cancelled', (await h.store.getJob(submitted.jobId!))!);

      expect(
        rows.map(({ scenario, route, disposition }) => [scenario, route, disposition]),
      ).toEqual([
        ['native', 'native', 'native'],
        ['level1 act', 'level1', 'responded'],
        ['level1 escalation', 'level1→level3', 'response-empty'],
        ['speech level2', 'level2', 'responded'],
        ['level3', 'level3', 'response-empty'],
        ['level4', 'level4', 'response-empty'],
        ['refused', 'level2', 'refused'],
        ['unavailable', 'level2', 'unavailable'],
        ['invalid', 'level2', 'invalid'],
        ['uncertain', 'level2', 'uncertain'],
        ['cancelled', 'level2', 'cancelled'],
      ]);
      // Autonomous events rate actions in the routing request; speech uses the dependent path.
      expect(rows.map((row) => row.selection)).toEqual([
        ...Array(3).fill('combined'),
        ...Array(rows.length - 3).fill('dependent'),
      ]);
      const kinds = Object.fromEntries(rows.map((row) => [row.scenario, row.kinds]));
      const model = (list: string[]) => list.filter((kind) => kind.startsWith('LM ·'));
      const shared = ['Context and retrieval', 'Semantic decision', 'Jev', 'Accounting'];
      for (const row of rows) expect(row.kinds).toEqual(expect.arrayContaining(shared));
      expect(model(kinds['native']!)).toEqual([]);
      expect(kinds['native']).not.toContain('Level-1 selection');
      expect(model(kinds['level1 act']!)).toEqual([]);
      expect(kinds['level1 act']).toEqual(
        expect.arrayContaining(['Action context', 'Level-1 selection', 'Response admission']),
      );
      expect(kinds['level1 escalation']).toEqual(
        expect.arrayContaining(['Level-1 selection', 'Response admission']),
      );
      expect(model(kinds['level1 escalation']!)).toEqual(['LM · complex · npc_response']);
      expect(model(kinds['speech level2']!)).toEqual(['LM · fast · npc_response']);
      expect(model(kinds['level3']!)).toEqual(['LM · complex · npc_response']);
      expect(model(kinds['level4']!)).toEqual(['LM · complex · npc_response']);
      for (const scenario of [...FAILURES, 'cancelled']) {
        expect(kinds[scenario]).toEqual(
          expect.arrayContaining(['LM · fast · npc_response', 'Workflow failure']),
        );
        expect(kinds[scenario]).not.toContain('Response admission');
      }
      // Level 5 dispatch is covered by cognition.test.ts; here only its queued opportunity is traced.
      expect(await h.store.intelligenceCall(h.reflectionRow)).toMatchObject({
        kind: 'Reflection opportunity',
        triggerType: 'Background reflection opportunity',
      });
      expect(h.calls.generations.some((request) => request.execution === 'full')).toBe(false);
      expect(network).not.toHaveBeenCalled();
    });
  },
);
