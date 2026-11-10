import { sourceMacrofoldHost } from './source-macrofold-host.js';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import { entityGet } from '@open-legend/domain';
import { testRepository } from '../../../tests/fixtures/database.js';
import { enterLocalWorld, editWorld } from '../../../tests/fixtures/service.js';
import { PLAYER_ID, NPC_ID } from '@open-legend/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  acceptedMindFiles,
  publishInnerWorld,
  dreamStatus,
  dreamPolicy,
  currentBodySubject,
  mindFor,
  initializePerception,
  setAttentionFocus,
  setSpatialPosition,
  worldSupport,
  worldPosition,
} from '@open-legend/domain';
import { validateMacrofoldValue, prepareSchema, type AiReceipt } from '@open-legend/ai';
import { readConfig } from '../../../tests/fixtures/database.js';
import { SqlGameRepository } from './store.js';
import { WorldService } from './world-service.js';
import {
  responseSchema,
  boundResponseJsonSchema,
  RESPONSE_INSTRUCTIONS,
  reflectionSchema,
} from './cognition-contracts.js';
import { prepareDecision } from './decision-context.js';
import { RecallService } from './recall.js';
import { IntelligenceLog } from './intelligence-log.js';
import { offerInterpretationRecords } from './reflection-records.js';
import { prepareReflectionPublication, reflectionTimeDue } from './reflection-publication.js';
import { bindReflectionAppraisals } from './appraisal-context.js';
import { MacrofoldBackend } from './macrofold.js';
import { inspectGodMind } from './god-mind.js';
import { projectView } from './view.js';
import { entityHandle } from './entity-references.js';
import { starterGroundAt } from '../../../packages/domain/src/worlds/base/landscape.js';
const opened: SqlGameRepository[] = [];
const dirs: string[] = [];
const releases: Array<() => void | Promise<void>> = [];
afterEach(async () => {
  for (const release of releases.splice(0).reverse()) await release();
  for (const s of opened.splice(0))
    try {
      await s.close();
    } catch {}
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  vi.unstubAllGlobals();
});
async function service(path: string | undefined = undefined, god = true) {
  const store = await testRepository(path);
  await store.ready;
  if (!(await store.records.head()))
    await store.commit(0, { world: stockedCamp(), speed: 1, manuallyPaused: false });
  opened.push(store);
  const config = readConfig({
    AI_BUDGET_USD: '100',
    MACROFOLD_API_KEY: 'fixture-only-key',
    MACROFOLD_WORKER_ID: 'fixture-worker',
    OPEN_LEGEND_GOD_MODE: String(god),
  });
  const service = new WorldService(store, config, () => 10000);
  releases.push(() => service.releaseHostWork());
  await enterLocalWorld(service);
  await service.setPresence('fixture', true, 1);
  await service.control({ paused: false });
  await service.say('fixture-encounter', PLAYER_ID, 'I would like to share berries.', NPC_ID);
  return service;
}
async function proposal(s: WorldService, id = 'fixture-decision') {
  const log = new IntelligenceLog(s.store);
  const recall = new RecallService(s, log);
  releases.push(
    () => log.close(),
    () => recall.close(),
  );
  const evidenceId = [...s.world.events].reverse().find((e) => e.type === 'speech')!.id;
  const prepared = await prepareDecision(
    s,
    recall,
    NPC_ID,
    id,
    'Consider the actual encounter.',
    [evidenceId],
    async () => {
      throw new Error('Native fixture must not call a model.');
    },
    new AbortController().signal,
    0,
    false,
    0,
    evidenceId,
    undefined,
    'native-only',
  );
  releases.push(prepared.dispose);
  const subject = currentBodySubject(s.world, NPC_ID, PLAYER_ID)!;
  offerInterpretationRecords(s.world, NPC_ID, prepared.context, prepared.binding, [subject]);
  const handle = Object.entries(prepared.binding.identityReferences!).find(
    ([, value]) => JSON.stringify(value) === JSON.stringify(subject),
  )![0];
  const e = Object.entries(prepared.binding.evidenceReferences!).find(
    ([, value]) => value === evidenceId,
  )![0];
  const appraisals = await bindReflectionAppraisals(
    s,
    NPC_ID,
    id,
    prepared.binding.evidenceIds,
    prepared.entityReferences,
    { sharedExperiences: prepared.sharedExperiences, frame: prepared.situation.frame },
  );
  const p = {
    revision: 'fixture-workspace',
    files: [
      ...acceptedMindFiles(s.world, NPC_ID),
      { path: 'newcomer.md', text: 'A possible ally\nI think the newcomer may be helpful.' },
    ],
    thoughts: ['I am cautiously interested.'],
    goalChanges: [],
    knowledgeChanges: [],
    nameChanges: [],
    appraisalChanges: [],
    recordChanges: [
      {
        operation: 'upsert' as const,
        id: 'relationship',
        expectedRevision: 0,
        documentId: 'newcomer',
        kind: 'relationship' as const,
        subjectId: handle,
        source: 'inferred' as const,
        confidence: 0.6,
        trust: 0.2,
        status: 'active' as const,
        evidence: [{ id: e, relation: 'derived-from' as const }],
      },
      {
        operation: 'upsert' as const,
        id: 'belief',
        expectedRevision: 0,
        documentId: 'newcomer',
        kind: 'belief' as const,
        subjectId: handle,
        source: 'inferred' as const,
        confidence: 0.5,
        trust: null,
        status: 'active' as const,
        evidence: [{ id: e, relation: 'supports' as const }],
      },
    ],
  };
  const publish = () =>
    prepareReflectionPublication(
      prepared,
      appraisals,
      p,
      NPC_ID,
      id,
      s.world.innerWorlds![NPC_ID]!.revision,
    );
  return { prepared, p, publish };
}
describe('fixture: cognition vertical slice', () => {
  it('accepts schema-valid bundles, survives PostgreSQL restart, and supplies accepted mind to later decisions', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ol-mind-'));
    dirs.push(dir);
    const path = dir;
    const s = await service(path);
    const { p, publish } = await proposal(s);
    const { revision: _revision, files: _files, ...response } = p;
    const schema = (await import('zod')).z.toJSONSchema(reflectionSchema, { target: 'draft-7' });
    expect(validateMacrofoldValue(prepareSchema(schema, 500_000), response)).toEqual(response);
    expect((await s.transition(publish())).ok).toBe(true);
    await s.store.close();
    const reopened = await service(path);
    const next = await proposal(reopened, 'next');
    expect(
      mindFor(reopened.world, NPC_ID).records.find((r) => r.kind === 'belief')?.documentId,
    ).toBe('newcomer');
    expect(String(next.prepared.context.aboutMe)).toContain('helpful');
    expect(JSON.stringify(next.prepared.context)).not.toContain('I am cautiously interested.');
  }, 60_000);

  it('keeps a remembered local person separate from a silently reacquired body in full model input', async () => {
    const s = await service();
    const { prepared, publish } = await proposal(s, 'local-relationship');
    expect(Object.keys(prepared.entityReferences)).not.toContain(PLAYER_ID);
    expect((await s.transition(publish())).ok).toBe(true);
    const record = mindFor(s.world, NPC_ID).records.find((entry) => entry.kind === 'relationship')!;
    expect(record.subjectId?.kind).toBe('individual');
    const oldBody = entityHandle(s.world, NPC_ID, PLAYER_ID);
    const player = entityGet(s.world.entities, PLAYER_ID)!;
    const origin = { ...worldPosition(player) };
    await editWorld(s, (world) => {
      world.simTime += 1;
      const moved = entityGet(world.entities, PLAYER_ID)!;
      const away = starterGroundAt(world.map.spatial!, 60, 50);
      setSpatialPosition(world, moved, away, away.surfaceId, { continuity: 'physical' });
      initializePerception(world, []);
    });
    await editWorld(s, (world) => {
      world.simTime += 40;
      const moved = entityGet(world.entities, PLAYER_ID)!;
      setSpatialPosition(world, moved, origin, worldSupport(moved), { continuity: 'physical' });
      initializePerception(world, []);
      const key = Object.entries(world.perceptionEvidence![NPC_ID]!.attention!.annotations).find(
        ([, candidate]) => candidate.sourceId === PLAYER_ID,
      )![0];
      expect(setAttentionFocus(world, NPC_ID, [key])).toBe(true);
    });
    const next = await proposal(s, 'reacquired-person');
    const newBody = entityHandle(s.world, NPC_ID, PLAYER_ID);
    expect(newBody).not.toBe(oldBody);
    const remembered = mindFor(s.world, NPC_ID).records.find(
      (entry) => entry.kind === 'relationship',
    )!;
    expect(remembered.subjectId).not.toBe(newBody);
    expect(Object.values(next.prepared.entityReferences)).toContain(PLAYER_ID);
    expect(JSON.stringify(next.prepared.context)).not.toContain(`"entityId":"${PLAYER_ID}"`);
  });

  it('offers reflection after evidence and suppresses it after accepted consolidation', async () => {
    const s = await service();
    expect(reflectionTimeDue(s.world, NPC_ID, true)).toBe(true);
    const { publish } = await proposal(s);
    expect((await s.transition(publish())).ok).toBe(true);
    expect(reflectionTimeDue(s.world, NPC_ID, true)).toBe(false);
  });
  it('offers dream consolidation once and lets rest continue', async () => {
    const s = await service();
    await s.command(
      'rest',
      {
        type: 'status-effect',
        definitionId: 'wilderness:restorative-rest',
        targetId: NPC_ID,
        effectOperation: 'activate',
      },
      NPC_ID,
    );
    const policy = dreamPolicy(s.world)!;
    await editWorld(s, (world) => {
      world.simTime += policy.afterSeconds;
      entityGet(world.entities, NPC_ID)!.statusEffects![policy.statusEffectId]!.elapsedSeconds =
        policy.afterSeconds;
    });
    const episode = dreamStatus(s.world, entityGet(s.world.entities, NPC_ID))!.episode;
    const result = await s.transition((world) =>
      publishInnerWorld(
        world,
        NPC_ID,
        world.innerWorlds![NPC_ID]!.revision,
        'fixture-dream',
        'workspace',
        acceptedMindFiles(world, NPC_ID),
        ['An imagined river carries the conversation.'],
        [],
        episode,
      ),
    );
    expect(result.ok).toBe(true);
    expect(entityGet(s.world.entities, NPC_ID)!.actor!.action?.type).toBe('status-effect');
    expect(mindFor(s.world, NPC_ID).lastDreamEpisode).toBe(episode);
    const repeated = await s.transition((world) =>
      publishInnerWorld(
        world,
        NPC_ID,
        world.innerWorlds![NPC_ID]!.revision,
        'fixture-dream-again',
        'workspace',
        acceptedMindFiles(world, NPC_ID),
        ['Another imagined river.'],
        [],
        episode,
      ),
    );
    expect(repeated.ok).toBe(false);
    expect(mindFor(s.world, NPC_ID).thoughts.at(-1)?.source).toBe('imagined');
  });
  it('enforces backend god access and excludes thoughts from ordinary state', async () => {
    const s = await service();
    const { p, publish } = await proposal(s);
    await s.transition(publish());
    expect((await inspectGodMind(s, NPC_ID)).thoughts?.at(-1)?.text).toBe(p.thoughts[0]);
    expect(JSON.stringify(await projectView(s, 'test-fixture'))).not.toContain(p.thoughts[0]);
    const disabled = await service(undefined, false);
    await expect(inspectGodMind(disabled, NPC_ID)).rejects.toThrow('disabled');
  }, 60_000);
  it('rejects covert mind changes in fast schemas', () => {
    expect(
      responseSchema.safeParse({
        operations: [],
        documents: [],
      }).success,
    ).toBe(false);
  });
  it('fresh full harness sessions reuse an actor worktree on the selected Worker and inject current instructions', async () => {
    const s = await service();
    s.config.macrofoldBillingMode = 'managed';
    const requests: Array<{ path: string; body: Record<string, unknown>; key: string | null }> = [];
    let run = 0;
    const currentProposal = { operations: [] };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, init: RequestInit) => {
        const path = new URL(input).pathname;
        const body = init.body ? JSON.parse(String(init.body)) : {};
        requests.push({ path, body, key: new Headers(init.headers).get('Idempotency-Key') });
        let data: unknown;
        if (path === '/v1/models')
          data = {
            data: [
              {
                id: 'meta/muse-spark-1.3-contributor',
                enabled: true,
                harnesses: ['opencode'],
                billing_modes: ['byok', 'managed'],
              },
            ],
          };
        else if (path === '/v1/billing/usage')
          data = {
            data: [
              {
                run_id: `fixture-run-${run}`,
                kind: 'model',
                model_usage: {
                  completeness: 'complete',
                  provisional: false,
                  input_tokens: '10',
                  output_tokens: '1',
                  reported_micro_usd: '100',
                },
              },
            ],
            next_cursor: null,
          };
        else if (path === '/v1/workspaces')
          data = { id: 'fixture-workspace', default_worktree_id: 'fixture-worktree' };
        else if (path === '/v1/runs') {
          run++;
          const prompt = JSON.parse(body.prompt);
          expect(prompt.instructions).toContain(RESPONSE_INSTRUCTIONS);
          expect(body.permissions.files.read.include).toEqual([]);
          data = {
            run_id: `fixture-run-${run}`,
            session_id: `fixture-session-${run}`,
            worker_id: 'fixture-worker',
            worktree_id: 'fixture-worktree',
            urls: {
              status: `http://localhost:3210/v1/runs/fixture-run-${run}`,
              result: `http://localhost:3210/v1/runs/fixture-run-${run}/result`,
            },
          };
        } else if (path.endsWith('/result'))
          data = {
            run_id: `fixture-run-${run}`,
            final: true,
            execution_outcome: 'success',
            persistence_status: 'verified',
            artifact_ids: [],
            output_text: JSON.stringify(currentProposal),
          };
        else if (path.startsWith('/v1/runs/'))
          data = {
            id: `fixture-run-${run}`,
            status: 'succeeded',
            cost_micro_usd: '100',
            persistence_status: 'verified',
          };
        else throw new Error(`Unexpected fixture request ${path}`);
        return new Response(JSON.stringify(data), { status: 200 });
      }),
    );
    const backend = new MacrofoldBackend(sourceMacrofoldHost(s));
    for (let i = 0; i < 2; i++) {
      const result = await backend.generate({
        requestId: `fixture-${i}`,
        actorScope: NPC_ID,
        execution: 'full',
        task: 'npc_cognition',
        instructions: RESPONSE_INSTRUCTIONS,
        context: { aboutMe: acceptedMindFiles(s.world, NPC_ID) },
        schema: boundResponseJsonSchema(['myself'], [], {
          speech: false,
          expressions: false,
          expressionVerbs: [],
          proposals: false,
        }),
      });
      expect(result.outcome, result.outcome === 'value' ? '' : JSON.stringify(result)).toBe(
        'value',
      );
      if (result.outcome === 'value')
        expect(responseSchema.parse(result.value)).toEqual(currentProposal);
    }
    const native = requests.filter((r) => r.path === '/v1/runs');
    expect(native).toHaveLength(2);
    expect(
      native.every(
        (r) =>
          r.body.session_id === undefined &&
          r.body.worker_id === 'fixture-worker' &&
          r.body.worktree_id === 'fixture-worktree',
      ),
    ).toBe(true);
    expect(requests.filter((r) => /^\/v1\/(workers|sandboxes)/.test(r.path))).toHaveLength(0);
    expect(requests.filter((r) => r.path === '/v1/workspaces')).toHaveLength(1);
    expect(native[0]!.key).not.toBe(native[1]!.key);
  });

  it.each(['judgment', 'generation'])(
    'retains the original %s receipt after cancellation without delivering its value',
    async (kind) => {
      const s = await service();
      s.config.macrofoldBillingMode = 'managed';
      const controller = new AbortController();
      let entered!: () => void, release!: () => void;
      const dispatched = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const returned = new Promise<void>((resolve) => {
        release = resolve;
      });
      const paths: string[] = [];
      let transportSignal: AbortSignal | undefined;
      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: string, init: RequestInit) => {
          const path = new URL(input).pathname;
          paths.push(path);
          if (path === '/v1/inferences') {
            transportSignal = init.signal!;
            entered();
            await returned;
            transportSignal.throwIfAborted();
            return Response.json({
              run_id: 'cancelled-original',
              kind: 'inference',
              status: 'succeeded',
              result: {
                run_id: 'cancelled-original',
                final: true,
                execution_outcome: 'success',
                inference: {
                  outcome: 'value',
                  provider_outcome: 'responded',
                  billing: {
                    billing_mode: 'managed',
                    charged_micro_usd: '5',
                    provisional: false,
                  },
                  value: {},
                },
              },
            });
          }
          if (path === '/v1/runs/cancelled-original')
            return Response.json({
              id: 'cancelled-original',
              kind: 'inference',
              status: 'succeeded',
              cost_micro_usd: '5',
            });
          if (path === '/v1/billing/usage') return Response.json({ data: [], next_cursor: null });
          throw new Error(`Unexpected cancelled receipt request ${path}`);
        }),
      );
      const backend = new MacrofoldBackend(sourceMacrofoldHost(s));
      const pending =
        kind === 'judgment'
          ? backend.judge({
              requestId: 'cancelled-judgment',
              signal: controller.signal,
              state: {},
              questions: { notice: { type: 'noul', instructions: 'Did I notice it?' } },
            })
          : backend.generate({
              requestId: 'cancelled-generation',
              signal: controller.signal,
              execution: 'fast',
              task: 'npc_response',
              instructions: 'Return a proposal.',
              context: {},
              schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
            });
      await Promise.race([
        dispatched,
        pending.then((result) => {
          throw new Error(`Request ended before dispatch: ${result.outcome}`);
        }),
      ]);
      controller.abort();
      expect(transportSignal!.aborted).toBe(false);
      release();
      const result = await pending;
      expect(result.outcome).toBe('cancelled');
      expect(result.receipt).toMatchObject({
        dispatched: true,
        completionUncertain: false,
        providerRequestId: 'cancelled-original',
        estimatedCostUsd: 0.000005,
      });
      expect(paths.filter((path) => path === '/v1/inferences')).toHaveLength(1);
      expect(paths.some((path) => path.endsWith('/cancel'))).toBe(false);
    },
  );

  it('keeps cancelled receipt observation inside the original request deadline', async () => {
    const s = await service(),
      controller = new AbortController();
    let entered!: () => void;
    const dispatched = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let transportSignal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: string, init: RequestInit) => {
        transportSignal = init.signal!;
        entered();
        return new Promise<Response>((_resolve, reject) => {
          transportSignal!.addEventListener('abort', () => reject(transportSignal!.reason), {
            once: true,
          });
        });
      }),
    );
    // Admission journals real SQL before HTTP. Give that phase room, then cancel
    // near the original deadline so the one-second receipt grace cannot win.
    const deadlineMs = Date.now() + 2000;
    const pending = new MacrofoldBackend(sourceMacrofoldHost(s)).judge({
      requestId: 'cancelled-original-deadline',
      signal: controller.signal,
      deadlineMs,
      state: {},
      questions: { notice: { type: 'noul', instructions: 'Did I notice it?' } },
    });
    await Promise.race([
      dispatched,
      pending.then((result) => {
        throw new Error(`Request ended before dispatch: ${result.outcome}`);
      }),
    ]);
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, deadlineMs - Date.now() - 500)));
    expect(Date.now()).toBeLessThan(deadlineMs);
    controller.abort();
    const result = await pending;
    expect(result.outcome).toBe('cancelled');
    expect(transportSignal!.reason).toMatchObject({ kind: 'deadline_exceeded' });
    expect(result.receipt).toMatchObject({ dispatched: true, completionUncertain: true });
  });

  it.each(['managed', 'byok'] as const)(
    'retains %s billing when a conversation continues after configuration changes',
    async (billingMode) => {
      const s = await service();
      s.config.macrofoldBillingMode = billingMode;
      const model = s.config.macrofoldModel;
      const saved = vi.spyOn(s.store, 'putIntegration');
      const settled = vi.spyOn(s.store, 'settle');
      const admissions: Record<string, unknown>[] = [];
      let modelReads = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: string, init: RequestInit) => {
          const url = new URL(input);
          if (url.pathname === '/v1/models') {
            modelReads++;
            return Response.json({
              data: [
                {
                  id: s.config.macrofoldModel,
                  enabled: true,
                  harnesses: [s.config.macrofoldHarness],
                  billing_modes: [billingMode],
                },
              ],
            });
          }
          if (url.pathname === '/v1/workspaces')
            return Response.json({
              id: 'continued-workspace',
              default_worktree_id: 'continued-worktree',
            });
          if (url.pathname === '/v1/runs') {
            admissions.push(JSON.parse(String(init.body)));
            return Response.json({
              run_id: `continued-run-${admissions.length}`,
              session_id: 'continued-session',
              worker_id: 'fixture-worker',
              worktree_id: 'continued-worktree',
              urls: {
                status: `${url.origin}/v1/runs/continued-run-${admissions.length}`,
                result: `${url.origin}/v1/runs/continued-run-${admissions.length}/result`,
              },
            });
          }
          if (url.pathname === '/v1/billing/usage')
            return Response.json({
              data: [
                {
                  run_id: url.searchParams.get('run_id'),
                  kind: 'model',
                  model_usage: {
                    completeness: 'complete',
                    provisional: false,
                    input_tokens: '10',
                    output_tokens: '1',
                    reported_micro_usd: '7',
                  },
                },
              ],
              next_cursor: null,
            });
          const run = `continued-run-${admissions.length}`;
          if (url.pathname === `/v1/runs/${run}/result`)
            return Response.json({
              run_id: run,
              final: true,
              execution_outcome: 'success',
              persistence_status: 'verified',
              output_text: 'A synthetic conversation reply.',
            });
          if (url.pathname === `/v1/runs/${run}`)
            return Response.json({
              id: run,
              status: 'succeeded',
              persistence_status: 'verified',
              cost_micro_usd: billingMode === 'managed' ? '30000' : '0',
            });
          throw new Error(`Unexpected continued conversation fixture path ${url.pathname}`);
        }),
      );
      const message = (requestId: string) => ({
        requestId,
        conversationId: 'continued-conversation',
        worldId: s.world.id,
        text: 'A synthetic conversation request.',
      });
      for (let turn = 0; turn < 2; turn++) {
        if (turn) {
          s.config.macrofoldBillingMode = billingMode === 'managed' ? 'byok' : 'managed';
          s.config.macrofoldModel = 'fixture-changed-model';
        }
        const reply = await new MacrofoldBackend(sourceMacrofoldHost(s)).message(
          message(`continued-request-${turn}`),
        );
        expect(reply).toMatchObject({ ok: true, code: 'completed' });
        const receipt = settled.mock.calls.at(-1)![1];
        expect(await s.store.attemptReceipt(receipt.requestId)).toMatchObject({
          macrofoldBillingMode: billingMode,
          requestedModel: model,
          model,
          modelVersionStatus: 'unavailable',
          completionUncertain: false,
          estimatedCostUsd: billingMode === 'managed' ? 0.03 : 0.000007,
        });
      }
      expect(admissions).toHaveLength(2);
      expect(admissions[0]).toMatchObject({
        worktree_id: 'continued-worktree',
        billing_mode: billingMode,
        model,
      });
      expect(admissions[1]).toMatchObject({ session_id: 'continued-session' });
      expect(admissions[1]).not.toHaveProperty('billing_mode');
      expect(admissions[1]).not.toHaveProperty('model');
      expect(modelReads).toBe(1);
      const laneKey = saved.mock.calls.find(([key]) => key.includes(':lane:conversation:'))![0];
      const lane = (await s.store.getIntegration(laneKey)) as Record<string, unknown>;
      expect(lane.session).toEqual({ id: 'continued-session', billingMode, model });
      for (const [field, session] of [
        ['billing', { id: 'continued-session', model }],
        ['model', { id: 'continued-session', billingMode }],
      ] as const) {
        await s.store.putIntegration(laneKey, { ...lane, session });
        const refused = await new MacrofoldBackend(sourceMacrofoldHost(s)).message(
          message(`missing-session-${field}`),
        );
        expect(refused).toMatchObject({ ok: false, code: 'invalid' });
        expect(settled.mock.calls.at(-1)![1]).toMatchObject({ dispatched: false });
      }
      expect(admissions).toHaveLength(2);
      expect(modelReads).toBe(1);
    },
  );

  it.each([
    { kind: 'inference', execution: 'judge' },
    { kind: 'native_agent', execution: 'judge' },
    { kind: 'inference', execution: 'judge', recovery: true },
    { kind: 'inference', execution: 'judge', recovery: true, missingBilling: true },
    { kind: 'inference', execution: 'judge', recovery: true, invalidBilling: true },
    { kind: 'inference', execution: 'fast' },
    { kind: 'inference', execution: 'complex', missingUsage: true },
    { kind: 'inference', execution: 'judge', byok: true, missingUsage: true },
    {
      kind: 'inference',
      execution: 'judge',
      recovery: true,
      changedConfig: true,
      known: 0.03,
    },
    {
      kind: 'inference',
      execution: 'judge',
      recovery: true,
      byok: true,
      missingUsage: true,
      changedConfig: true,
    },
    { kind: 'inference', execution: 'judge', conflictingBilling: true },
  ] as const)(
    'consumes exact inference receipts through the game backend: %j',
    async (scenario) => {
      const { kind, execution } = scenario;
      const recovery = 'recovery' in scenario;
      const missingUsage = 'missingUsage' in scenario;
      const missingBilling = 'missingBilling' in scenario;
      const changedBilling = missingBilling || 'invalidBilling' in scenario;
      const billingMode = 'byok' in scenario ? 'byok' : 'managed';
      const runCharge = billingMode === 'byok' ? '0' : changedBilling ? '30000' : '5';
      const conflictingBilling = 'conflictingBilling' in scenario;
      const s = await service();
      s.config.macrofoldJevModel = 'microsoft/microsoft-decision-1';
      s.config.macrofoldBillingMode = billingMode;
      const bodies: unknown[] = [],
        paths: string[] = [];
      const state = { observation: 'I watched Mara give me the promised berry.' };
      const questions = {
        noticed: { type: 'noul' as const, instructions: 'Did I observe the berry transfer?' },
        status: {
          type: 'choice' as const,
          instructions: 'Choose between the offered interpretations.',
          criteria: { later: 'First offered', earlier: 'Second offered' },
        },
      };
      const schema = {
        type: 'object',
        properties: { noticed: { type: 'boolean' } },
        required: ['noticed'],
        additionalProperties: false,
      };
      const submittedState = structuredClone(state),
        submittedSchema = structuredClone(schema),
        submittedQuestions = structuredClone(questions);
      const getIntegration = s.store.getIntegration.bind(s.store);
      vi.spyOn(s.store, 'getIntegration').mockImplementation(async (key) => {
        // Caller mutation during the durable journal wait cannot alter the exact
        // bytes admitted or the schema used to validate their eventual answer.
        state.observation = 'Caller changed its object while the request was pending.';
        schema.properties.noticed.type = 'number';
        questions.status.criteria = { earlier: 'Changed first', later: 'Changed second' };
        questions.noticed.instructions = 'Changed pending question.';
        return getIntegration(key);
      });
      const completed = {
        run_id: 'judgment-run',
        final: true,
        execution_outcome: 'success',
        inference: {
          outcome: 'value',
          provider_outcome: 'responded',
          model_revision: 'microsoft/microsoft-decision-1-20261009',
          value:
            execution === 'judge'
              ? {
                  answers: {
                    noticed: { type: 'noul', noul: 0.95 },
                    status: { type: 'choice', probabilities: { earlier: 0.5, later: 0.5 } },
                  },
                  usage: { input_tokens: 100, output_tokens: 1 },
                }
              : { choices: [{ finish_reason: 'stop', message: { content: '{"noticed":true}' } }] },
          usage: {
            completeness: missingUsage ? 'missing' : 'complete',
            input_tokens: missingUsage ? null : '200',
            output_tokens: missingUsage ? null : '1',
            cached_input_tokens: null,
            cache_write_input_tokens: null,
          },
          billing: {
            billing_mode: conflictingBilling ? 'byok' : billingMode,
            charged_micro_usd:
              'invalidBilling' in scenario ? '-1' : billingMode === 'managed' ? '5' : '0',
            reported_micro_usd: '7',
            provisional: missingUsage,
            provider_reported_cost_status: 'reported',
            provider_reported_cost_usd: 0.0000106,
          },
          timings_ms: { provider: 87.25 },
        },
      };
      if (missingBilling) Reflect.deleteProperty(completed.inference, 'billing');
      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: string, init: RequestInit) => {
          const path = new URL(input).pathname;
          paths.push(path);
          if (path === '/v1/inferences') {
            bodies.push(JSON.parse(String(init.body)));
            return Response.json({
              run_id: 'judgment-run',
              kind,
              status: recovery ? 'running' : 'succeeded',
              wait_seconds: 0.025,
              ...(recovery ? {} : { result: completed }),
              urls: {
                status: '/v1/runs/judgment-run',
                result: '/v1/runs/judgment-run/result',
              },
            });
          }
          if (path === '/v1/runs/judgment-run')
            return Response.json({
              id: 'judgment-run',
              kind,
              status: 'succeeded',
              cost_micro_usd: runCharge,
              started_at: '2026-10-15T10:00:00.000Z',
              completed_at: '2026-10-15T10:00:00.125Z',
              wait_seconds: 0.025,
            });
          if (path === '/v1/runs/judgment-run/result') return Response.json(completed);
          if (path === '/v1/runs/judgment-run/events' || path === '/v1/billing/usage')
            return Response.json({ data: [], next_cursor: null });
          throw new Error(`Unexpected inference fixture path ${path}`);
        }),
      );
      const backend = new MacrofoldBackend(sourceMacrofoldHost(s));
      const result =
        execution === 'judge'
          ? await backend.judge({ requestId: 'fixture-judgment', state, questions })
          : await backend.generate({
              requestId: 'fixture-generation',
              execution,
              task: 'synthetic-reaction',
              instructions: 'Return whether the supplied fictional observation happened.',
              context: state,
              schema,
            });
      expect(paths).toEqual(
        recovery
          ? ['/v1/inferences', '/v1/runs/judgment-run', '/v1/runs/judgment-run/result']
          : ['/v1/inferences'],
      );
      expect(bodies).toHaveLength(1);
      if (execution === 'judge')
        expect(bodies[0]).toMatchObject({
          model_binding: {
            provider: 'openrouter',
            model: 'microsoft/microsoft-decision-1',
            billing_mode: billingMode,
          },
          input: { state: submittedState, questions: submittedQuestions },
          limits: { max_output_tokens: 1024 },
        });
      else
        expect(bodies[0]).toMatchObject({
          input: {
            messages: expect.arrayContaining([
              { role: 'user', content: JSON.stringify(submittedState) },
            ]),
            response_format: { json_schema: { schema: submittedSchema } },
          },
        });
      expect(result.outcome).toBe(kind === 'inference' ? 'value' : 'uncertain');
      if (kind === 'inference') {
        expect(result.receipt).toMatchObject({
          completionUncertain: false,
          macrofoldBillingMode: billingMode,
          providerLatencyMs: 87.25,
          intermediaryQueueLatencyMs: 25,
        });
        expect(result.receipt.estimatedCostUsd).toBe(
          billingMode === 'managed' && !conflictingBilling
            ? changedBilling
              ? 0.03
              : 0.000005
            : undefined,
        );
        expect(result.receipt.usage).toEqual(
          missingUsage ? undefined : { inputTokens: 200, outputTokens: 1 },
        );
        expect(result.receipt.intermediaryRunLatencyMs).toBe(recovery ? 125 : undefined);
        expect(result.receipt.providerQueueLatencyMs).toBeUndefined();
        expect(result.receipt.providerReportedCostUsd).toBe(
          missingBilling || conflictingBilling ? undefined : 0.0000106,
        );
        if (execution === 'judge')
          expect(result).toMatchObject({ value: { answers: { status: { choice: 'later' } } } });
      } else expect(result.receipt).toMatchObject({ completionUncertain: true });
      if (recovery) {
        const pendingReceipt = {
          ...result.receipt,
          completionUncertain: true,
          estimatedCostUsd: 'known' in scenario ? scenario.known : undefined,
          providerReportedCostUsd: 0.0000106,
        };
        await s.store.reserve(pendingReceipt.requestId, 'jev', 0.02, 1, NPC_ID);
        await s.store.settle(pendingReceipt.requestId, pendingReceipt);
        vi.spyOn(s.store, 'intelligenceCall').mockResolvedValue({
          id: 'fixture-inspection',
          kind: 'Native decision',
          startedAt: pendingReceipt.startedAt,
          status: 'completed',
          input: submittedState,
          output: { receipt: pendingReceipt },
          exchanges: [],
        });
        if (!missingBilling)
          completed.inference.billing.provider_reported_cost_status = 'unavailable';
        if ('changedConfig' in scenario)
          s.config.macrofoldBillingMode = billingMode === 'byok' ? 'managed' : 'byok';
        await new MacrofoldBackend(sourceMacrofoldHost(s)).inspectCall('fixture-inspection');
        const reconciled = await s.store.attemptReceipt(pendingReceipt.requestId);
        if (billingMode === 'byok' && missingUsage) expect(reconciled).toEqual(pendingReceipt);
        else
          expect(reconciled).toMatchObject({
            completionUncertain: false,
            macrofoldBillingMode: billingMode,
            estimatedCostUsd:
              'known' in scenario ? scenario.known : changedBilling ? 0.03 : 0.000005,
            providerReportedCostUsd: 0.0000106,
            usage: { inputTokens: 200, outputTokens: 1 },
          });
        expect(paths.slice(3).sort()).toEqual([
          '/v1/billing/usage',
          '/v1/runs/judgment-run',
          '/v1/runs/judgment-run/events',
          '/v1/runs/judgment-run/result',
        ]);
        expect(bodies).toHaveLength(1);
      }
    },
  );

  it.each([
    { mode: 'managed', charge: undefined, expected: 0.03, usageReads: 2 },
    { mode: 'managed', charge: '-1', expected: 0.03, usageReads: 2 },
    { mode: 'byok', charge: '0', expected: 0.000007, usageReads: 2 },
    { mode: 'byok', charge: '0', known: 0.03, expected: 0.03, usageReads: 2 },
    { mode: undefined, charge: '0', expected: undefined, usageReads: 1 },
    { mode: 'managed', charge: '0', expected: undefined, usageReads: 1, uncertain: true },
  ] as const)(
    'reconciles native receipts under their admitted billing mode: %j',
    async (scenario) => {
      const s = await service();
      s.config.macrofoldBillingMode = scenario.mode === 'managed' ? 'byok' : 'managed';
      const receipt: AiReceipt = {
        requestId: 'retained-native-request',
        providerRequestId: 'retained-native-run',
        provider: 'macrofold',
        requestedModel: 'fixture-model',
        model: 'fixture-model',
        modelVersionStatus: 'unavailable',
        macrofoldBillingMode: scenario.mode,
        contextDigest: 'fixture',
        startedAt: '2026-10-18T10:00:00.000Z',
        completedAt: '2026-10-18T10:00:01.000Z',
        latencyMs: 1000,
        dispatched: true,
        completionUncertain: true,
        ...('known' in scenario
          ? { estimatedCostUsd: scenario.known }
          : scenario.mode === 'managed'
            ? { estimatedCostUsd: 0.03 }
            : {}),
      };
      await s.store.reserve(receipt.requestId, 'macrofold', 0.02, 1, NPC_ID);
      await s.store.settle(receipt.requestId, receipt);
      vi.spyOn(s.store, 'intelligenceCall').mockResolvedValue({
        id: 'native-inspection',
        kind: 'Reflection',
        startedAt: receipt.startedAt,
        status: 'failed',
        input: null,
        output: { receipt },
        exchanges: [],
      });
      let usageReads = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: string) => {
          const path = new URL(input).pathname;
          if (path.endsWith('/events')) return Response.json({ data: [], next_cursor: null });
          if (path === '/v1/billing/usage') {
            usageReads++;
            return Response.json({
              data:
                scenario.mode === 'byok'
                  ? [
                      {
                        run_id: receipt.providerRequestId,
                        kind: 'model',
                        model_usage: {
                          completeness: 'complete',
                          provisional: false,
                          input_tokens: '10',
                          output_tokens: '1',
                          reported_micro_usd: '7',
                        },
                      },
                    ]
                  : [],
              next_cursor: null,
            });
          }
          if (path.endsWith('/result'))
            return Response.json({
              run_id: receipt.providerRequestId,
              final: true,
              execution_outcome: 'uncertain' in scenario ? 'pending' : 'success',
            });
          if (path === `/v1/runs/${receipt.providerRequestId}`)
            return Response.json({
              id: receipt.providerRequestId,
              kind: 'native_agent',
              status: 'succeeded',
              cost_micro_usd: scenario.charge,
            });
          throw new Error(`Unexpected native receipt fixture path ${path}`);
        }),
      );
      await new MacrofoldBackend(sourceMacrofoldHost(s)).inspectCall('native-inspection');
      const reconciled = await s.store.attemptReceipt(receipt.requestId);
      if (scenario.expected === undefined) expect(reconciled).toEqual(receipt);
      else
        expect(reconciled).toMatchObject({
          completionUncertain: false,
          macrofoldBillingMode: scenario.mode,
          estimatedCostUsd: scenario.expected,
        });
      expect(usageReads).toBe(scenario.usageReads);
    },
  );
});
