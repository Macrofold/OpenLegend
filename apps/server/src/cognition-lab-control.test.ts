import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  arrangePlan,
  entityGet,
  NPC_ID,
  PLAYER_ID,
  setSpatialPosition,
  worldPosition,
  worldSupport,
} from '@open-legend/domain';
import { createAiClient } from '@open-legend/ai';
import { requestText } from '@open-legend/network';
import type {
  AiClient,
  AiReceipt,
  AiResult,
  GenerateRequest,
  JudgeRequest,
  JudgeValue,
  JudgmentAnswer,
} from '@open-legend/ai';
import type { CognitionLabSettings } from '@open-legend/protocol';
import {
  readConfig,
  testRepository,
  closeTestDatabases,
} from '../../../tests/fixtures/database.js';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import { editWorld, enterLocalWorld, useNearCampSight } from '../../../tests/fixtures/service.js';
import { createWorldRuntime } from './world-runtime.js';
import { CognitionRuntimeControl } from './cognition-runtime-control.js';
import { CognitionLabRecords, labJson } from './cognition-lab-records.js';
import { CognitionLabSaves } from './cognition-lab-saves.js';
import { CognitionLabRunController } from './cognition-lab-control.js';
import { IntelligenceLog } from './intelligence-log.js';
import { captureDiagnosticValue } from './diagnostic-capture.js';
import { RecallService } from './recall.js';
import { stageAllowance } from './cognition-stage-budget.js';
import type { WorldService } from './world-service.js';

const cleanup: (() => Promise<void>)[] = [];
let fixtureTransport = false;
beforeEach(
  () => (
    (fixtureTransport = false),
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('External network is blocked in this fixture.');
      }),
    )
  ),
);
afterEach(async () => {
  try {
    for (const close of cleanup.splice(0)) await close();
    await closeTestDatabases();
    if (!fixtureTransport) expect(fetch).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
}, 120_000);
function receipt(requestId: string, provider: 'jev' | 'openai'): AiReceipt {
  return {
    requestId,
    provider,
    requestedModel: 'fixture',
    model: 'fixture',
    modelVersionStatus: 'reported',
    contextDigest: 'fixture',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    latencyMs: 0,
    dispatched: true,
    completionUncertain: false,
    estimatedCostUsd: 0,
  };
}
async function harness(
  options: {
    generateGate?: () => Promise<void>;
    privacy?: () => import('./cognition-lab-records.js').LabJson;
    decisionEscalation?: boolean;
  } = {},
) {
  const store = await testRepository(undefined, stockedCamp());
  const directory = await mkdtemp(join(tmpdir(), 'openlegend-lab-controller-'));
  const config = readConfig({
    OPEN_LEGEND_GOD_MODE: 'true',
    TYPESAFE_API_KEY: 'fixture',
    OPENAI_API_KEY: 'fixture',
    AI_BUDGET_USD: '1',
    ...(options.decisionEscalation ? { DECISION_ESCALATION_JSON: undefined } : {}),
  });
  const calls: Array<JudgeRequest | GenerateRequest> = [];
  const client: AiClient = {
    async judge(request): Promise<AiResult<JudgeValue>> {
      calls.push(request);
      const answers: Record<string, JudgmentAnswer> = {};
      for (const [id, question] of Object.entries(request.questions)) {
        if (question.type === 'choice') {
          const keys = Object.keys(question.criteria);
          const selected = id === 'route' && keys.includes('level2') ? 'level2' : keys[0]!;
          answers[id] = {
            type: 'choice',
            choice: selected,
            probabilities: Object.fromEntries(keys.map((key) => [key, Number(key === selected)])),
          };
        } else if (question.type === 'noul') answers[id] = { type: 'noul', noul: 0.9 };
        else answers[id] = { type: 'score', score: 0.9, legend: {}, probabilities: {} };
      }
      return { outcome: 'value', value: { answers }, receipt: receipt(request.requestId, 'jev') };
    },
    async generate<T>(request: GenerateRequest): Promise<AiResult<T>> {
      calls.push(request);
      await options.generateGate?.();
      return {
        outcome: 'value',
        value: { operations: [] } as T,
        receipt: receipt(request.requestId, 'openai'),
      };
    },
  };
  const control = new CognitionRuntimeControl();
  const runtime = await createWorldRuntime({
    store,
    config,
    aiClient: client,
    labControl: control,
  });
  cleanup.push(async () => {
    await runtime.close();
    await store.close();
    await rm(directory, { recursive: true, force: true });
  });
  await enterLocalWorld(runtime.service);
  await runtime.service.control({ paused: false });
  await useNearCampSight(runtime.service);
  const records = new CognitionLabRecords(store.db, directory);
  await records.ready;
  const settings: CognitionLabSettings = {
    policy: {
      mode: 'oneResponse',
      focalActorId: NPC_ID,
      autonomousActorIds: [NPC_ID],
      durationSeconds: 60,
      maximumCalls: 20,
      activeWallSeconds: 180,
    },
    models: {
      judgment: config.jevModel,
      responseFast: config.miniModel,
      responseComplex: config.complexModel,
      summary: config.llmModel,
      reflection: config.macrofoldModel,
    },
    storageAllowanceBytes: 2 * 1024 ** 3,
    runCaptureAllowanceBytes: 64 * 1024 ** 2,
  };
  const experiment = () => ({
    settings: labJson(settings),
    customFields: [],
    holds: [],
    participants: [...runtime.service.runtimeParticipants],
    autonomy: [NPC_ID],
  });
  const saves = new CognitionLabSaves(records, {
    scope: () => ({
      worldId: runtime.service.world.id,
      runtimeGeneration: runtime.service.generation,
      scenarioRevision: 0,
      nativeRevision: runtime.service.durable.revision,
    }),
    experiment,
    capture: async (id, name) => {
      await runtime.service.createSave(name, id);
      return store.saves.metadata(runtime.service.world.id, id);
    },
    restore: async (checkpoint, experiment, commandId) => {
      await controller.finalize('Loading an explicit checkpoint.');
      await runtime.director.close();
      const payload = await store.saves.read(checkpoint.worldId, checkpoint.id);
      await runtime.service.restoreSave(
        checkpoint.id,
        commandId,
        payload,
        runtime.service.localScope,
      );
      runtime.service.setRuntimeParticipants(experiment.participants);
      await runtime.service.control({ paused: payload.state.manuallyPaused });
      await runtime.replaceDirector();
      await controller.reset();
      return { baselineChanged: false, reasons: [] };
    },
    remove: (checkpoint) => store.saves.delete(checkpoint.worldId, checkpoint.id),
  });
  const controller = new CognitionLabRunController(runtime, records, saves, {
    settings: () => settings,
    privacy: options.privacy,
    enabledCustomInputCount: () => 0,
    changed: () => {},
    scopeAfterRestore: () => runtime.service.localScope,
  });
  cleanup.unshift(async () => controller.close());
  const stimulus = {
    kind: 'say' as const,
    actorId: PLAYER_ID,
    targetId: NPC_ID,
    text: 'How is your day?',
    volume: 'normal',
  };
  return {
    store,
    runtime,
    records,
    controller,
    baselineReservedBytes: (await records.usage()).reservedBytes,
    settings,
    stimulus,
    calls,
    get scope() {
      return runtime.service.localScope;
    },
    saves,
  };
}

async function queueShortGathering(service: WorldService) {
  await editWorld(service, (world) => {
    const source = entityGet(world.entities, 'branches')!;
    source.resource!.workSeconds = 30; // Explicit short native-work specimen.
    const person = entityGet(world.entities, NPC_ID)!;
    setSpatialPosition(
      world,
      person,
      { ...worldPosition(source), x: worldPosition(source).x - 0.8 },
      worldSupport(source),
    );
    expect(
      arrangePlan(
        world,
        person.actor!,
        'finite-gather-plan',
        [{ id: 'finite-gather-step', actorId: NPC_ID, type: 'gather', targetId: source.id }],
        'replace',
        person.actor!.agency.plan?.revision ?? 0,
        null,
      ).ok,
    ).toBe(true);
  });
}

describe('ordinary native cognition experiments', () => {
  it('captures a known unsent cancellation completely while keeping an entered operation failure partial', async () => {
    const h = await harness();
    h.settings.policy.autonomousActorIds = [];
    await h.controller.controlRun({ commandId: randomUUID(), action: 'run' }, h.scope);
    const control = h.runtime.service.cognitionControl!;
    let checks = 0;
    const cancelledId = `unsent-embedding-${randomUUID()}`;
    await expect(
      control.prepare(
        {
          id: cancelledId,
          rootId: cancelledId,
          actorId: NPC_ID,
          purpose: 'embedding',
          generation: h.runtime.service.generation,
          responseBoundBytes: 500_000,
          current: () => {
            if (++checks > 1) throw new Error('Embedding evidence changed before dispatch.');
          },
        },
        { kind: 'embedding', request: { texts: ['Original permitted observation.'] } },
      ),
    ).rejects.toThrow('Embedding evidence changed before dispatch.');
    const cancelled = (
      await h.records.pageRecords('stage', {
        runId: h.controller.current!.id,
        sourceId: cancelledId,
      })
    ).items[0]!;
    expect(cancelled.summary).toMatchObject({ status: 'cancelled', completeness: 'complete' });
    const input = (await h.controller.stage(cancelled.id))!.artifacts.find(
      (artifact) => artifact.kind === 'input',
    )!;
    expect(
      JSON.parse((await h.records.readArtifactChunk(input.id)).bytes.toString('utf8')),
    ).toEqual({
      kind: 'embedding',
      request: { texts: ['Original permitted observation.'] },
    });
    expect(await h.runtime.service.store.decisionAttempts(cancelledId)).toEqual([]);
    expect(h.calls).toHaveLength(0);

    const failedId = `entered-operation-${randomUUID()}`;
    const prepared = await control.prepare(
      {
        id: failedId,
        rootId: failedId,
        actorId: NPC_ID,
        purpose: 'Entered operation failure fixture',
        generation: h.runtime.service.generation,
        responseBoundBytes: 500_000,
        current: () => {},
      },
      { kind: 'embedding', request: { texts: ['Second permitted observation.'] } },
    );
    const operation = vi.fn(async () => {
      throw new Error('Injected failure after native operation entry.');
    });
    await expect(control.dispatch(prepared.stage, prepared.input, operation)).rejects.toThrow(
      'Injected failure after native operation entry.',
    );
    expect(operation).toHaveBeenCalledOnce();
    const failed = (
      await h.records.pageRecords('stage', {
        runId: h.controller.current!.id,
        sourceId: failedId,
      })
    ).items[0]!;
    expect(failed.summary).toMatchObject({ status: 'failed', completeness: 'partial' });
    await h.controller.safeHold('The capture disposition fixtures settled.');
    expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
  }, 60_000);

  it('keeps an isolated request comparison bound to the captured source disclosure proof', async () => {
    const sourcePrivacy = {
      ownerAccountId: 'fixture-owner',
      sourceWorldId: 'captured-source-world',
      privateActorIds: [],
      forgottenDigest: 'captured-native-restrictions',
      correctionDigest: 'captured-native-corrections',
    };
    let currentPrivacy = sourcePrivacy;
    const h = await harness({ privacy: () => currentPrivacy });
    const source = await h.controller.submitStimulus(
      { commandId: randomUUID(), stimulus: h.stimulus, policy: h.settings.policy },
      h.scope,
    );
    await h.controller.waitHeld();
    const stage = (
      await h.records.pageRecords('stage', { runId: source.runId, limit: 100 })
    ).items.find((record) => record.name === 'attempt:0:generate');
    expect(stage).toBeDefined();
    await h.controller.reset();
    currentPrivacy = {
      ...sourcePrivacy,
      sourceWorldId: 'different-current-world',
      forgottenDigest: 'different-native-restrictions',
    };
    const compared = await h.controller.rerunRequest(
      { kind: 'rerunRequest', commandId: randomUUID(), runId: source.runId!, stageId: stage!.id },
      h.scope,
    );
    expect(compared).toMatchObject({ ok: true });
    const comparison = await h.records.getRecord(compared.runId!, 'run');
    expect(comparison?.summary).toMatchObject({ privacy: sourcePrivacy });
    const comparisonStages = await h.records.pageRecords('stage', { runId: compared.runId });
    expect(comparisonStages.items).toHaveLength(1);
    expect(comparisonStages.items[0]!.summary).toMatchObject({ privacy: sourcePrivacy });
    await h.controller.retain(compared.runId!, 'Retained request comparison');
    await h.controller.bindComparison(compared.runId!, {
      originId: randomUUID(),
      comparisonId: randomUUID(),
      variantName: 'Declared request variant',
    });
    expect((await h.records.getRecord(compared.runId!, 'run'))?.summary).toMatchObject({
      privacy: sourcePrivacy,
    });
  }, 60_000);

  it('re-arms Next stage on Continue and records a new continuous interval when Run releases the held input', async () => {
    const h = await harness();
    await h.controller.submitStimulus(
      {
        commandId: randomUUID(),
        stimulus: h.stimulus,
        policy: {
          ...h.settings.policy,
          mode: 'untilCondition',
          stopCondition: { kind: 'nextStage' },
        },
      },
      h.scope,
    );
    await h.controller.waitHeld();
    const first = h.controller.current?.prepared?.id;
    await h.controller.controlRun({ commandId: randomUUID(), action: 'continue' }, h.scope);
    await h.controller.waitHeld();
    expect(h.controller.current?.prepared?.id).not.toBe(first);
    expect(h.calls).toHaveLength(1);
    await h.controller.controlRun({ commandId: randomUUID(), action: 'run' }, h.scope);
    await h.runtime.director.idle();
    expect(h.controller.current?.policy.mode).toBe('continuous');
    expect(h.controller.current?.counts.intervals).toBe(2);
    expect(h.controller.current?.prepared).toBeUndefined();
    expect(h.calls.some((request) => 'task' in request)).toBe(true);
    expect(h.controller.state).toBe('running');
    await h.controller.controlRun({ commandId: randomUUID(), action: 'hold' }, h.scope);
    await h.controller.waitHeld();
  }, 60_000);

  it.each(['stimulus', 'continue', 'native Act'] as const)(
    'holds each One response stage and its terminal boundary after %s',
    async (origin) => {
      const h = await harness();
      h.settings.policy.stopCondition = { kind: 'nextStage' };
      if (origin === 'continue') {
        h.runtime.service.cognitionControl!.hold();
        h.runtime.service.cognitionControl!.setAutonomousActors([]);
        await editWorld(h.runtime.service, (world) => {
          for (const [id, z] of [
            [PLAYER_ID, 13],
            [NPC_ID, 14],
          ] as const) {
            const person = entityGet(world.entities, id)!;
            setSpatialPosition(world, person, { x: 12, y: 0, z }, worldSupport(person));
          }
        });
        expect(
          await h.runtime.service.command(randomUUID(), {
            type: 'express',
            verb: 'tickle',
            targetId: NPC_ID,
          }),
        ).toMatchObject({ ok: true, code: 'contacted' });
        expect(
          h.runtime.service.world.experience?.awareness[NPC_ID]?.some(
            (entry) => entry.eventType === 'expression' && entry.modality === 'felt',
          ),
        ).toBe(true);
      }
      if (origin === 'stimulus' || origin === 'native Act')
        await h.controller.submitStimulus(
          {
            commandId: randomUUID(),
            stimulus:
              origin === 'stimulus'
                ? h.stimulus
                : {
                    kind: 'act',
                    actorId: PLAYER_ID,
                    text: '',
                    command: {
                      type: 'move',
                      position: {
                        ...worldPosition(entityGet(h.runtime.service.world.entities, PLAYER_ID)!),
                        x:
                          worldPosition(entityGet(h.runtime.service.world.entities, PLAYER_ID)!).x +
                          0.5,
                        surfaceId: worldSupport(
                          entityGet(h.runtime.service.world.entities, PLAYER_ID)!,
                        ),
                      },
                    },
                  },
            policy: h.settings.policy,
          },
          h.scope,
        );
      else await h.controller.controlRun({ commandId: randomUUID(), action: 'continue' }, h.scope);
      await h.controller.waitHeld();
      expect(
        h.controller.current?.prepared,
        JSON.stringify({ reason: h.controller.current?.reason, calls: h.calls.length }),
      ).toBeDefined();
      expect(h.calls).toHaveLength(0);
      // Initial native eligibility is outside this stage/terminal hold specimen.
      h.runtime.clock.start();
      const handles = new Set<string>();
      while (h.controller.current?.prepared) {
        const held = h.controller.current.prepared;
        expect(handles.has(held.id)).toBe(false);
        handles.add(held.id);
        expect(handles.size).toBeLessThanOrEqual(h.settings.policy.maximumCalls);
        const native = h.runtime.service.cognitionControl!.prepared.find(
          (stage) => stage.handle === held.id,
        )!;
        expect(native).toBeDefined();
        const before = h.runtime.service.world.simTime;
        await h.records.pageRecords('stage', { runId: h.controller.current.id, limit: 100 });
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(h.runtime.service.world.simTime).toBe(before);
        const count = h.calls.length;
        await h.controller.submitPrepared(randomUUID(), held.id, undefined, h.scope);
        await h.controller.waitHeld();
        expect(h.calls).toHaveLength(count + 1);
        expect(h.calls.at(-1)).toMatchObject(native.original.request);
      }
      await h.runtime.director.idle();
      await h.controller.waitHeld();
      expect(h.calls.some((call) => 'task' in call)).toBe(true);
      expect(h.controller.state).toBe('held');
      expect(h.controller.current?.reason).not.toContain('limit reached');
      const terminalTime = h.runtime.service.world.simTime;
      await h.records.pageRecords('stage', { runId: h.controller.current!.id, limit: 100 });
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(h.runtime.service.world.simTime).toBe(terminalTime);
      expect(h.runtime.service.world.paused).toBe(false);
    },
    60_000,
  );

  it('keeps finite-duration response work automatic despite an unrelated Next stage condition', async () => {
    const h = await harness();
    await h.controller.submitStimulus(
      {
        commandId: randomUUID(),
        stimulus: h.stimulus,
        policy: {
          ...h.settings.policy,
          mode: 'forDuration',
          stopCondition: { kind: 'nextStage' },
        },
      },
      h.scope,
    );
    await h.runtime.director.idle();
    expect(h.calls.some((call) => 'task' in call)).toBe(true);
    expect(h.controller.current?.prepared).toBeUndefined();
    expect(h.controller.state).toBe('running');
    await h.controller.controlRun({ commandId: randomUUID(), action: 'hold' }, h.scope);
    await h.controller.waitHeld();
  }, 60_000);

  it('uses current settings after passive setup stops while preserving live prepared policy', async () => {
    const h = await harness();
    h.settings.policy = {
      ...h.settings.policy,
      autonomousActorIds: [],
      mode: 'untilCondition',
      stopCondition: { kind: 'nextStage' },
    };
    await h.controller.controlRun({ commandId: randomUUID(), action: 'continue' }, h.scope);
    expect(h.controller.current?.policy.autonomousActorIds).toEqual([]);
    expect(h.calls).toHaveLength(0);
    await h.controller.controlRun({ commandId: randomUUID(), action: 'stop' }, h.scope);
    h.settings.policy = {
      ...h.settings.policy,
      autonomousActorIds: [NPC_ID],
      durationSeconds: 37,
      maximumCalls: 7,
    };
    await h.controller.controlRun({ commandId: randomUUID(), action: 'continue' }, h.scope);
    await h.controller.waitHeld();
    expect(h.controller.current?.policy).toMatchObject({
      autonomousActorIds: [NPC_ID],
      durationSeconds: 37,
      maximumCalls: 7,
      mode: 'untilCondition',
      stopCondition: { kind: 'nextStage' },
    });
    expect(h.controller.current?.prepared).toBeDefined();
    expect(h.calls).toHaveLength(0);
    const original = h.controller.current?.prepared?.id;
    h.settings.policy = {
      ...h.settings.policy,
      autonomousActorIds: [],
      durationSeconds: 19,
      maximumCalls: 3,
    };
    await h.controller.controlRun({ commandId: randomUUID(), action: 'continue' }, h.scope);
    await h.controller.waitHeld();
    expect(h.controller.current?.prepared?.id).not.toBe(original);
    expect(h.controller.current?.policy).toMatchObject({
      autonomousActorIds: [NPC_ID],
      durationSeconds: 37,
      maximumCalls: 7,
    });
    expect(h.calls).toHaveLength(1);
    await h.controller.controlRun({ commandId: randomUUID(), action: 'stop' }, h.scope);
    await h.controller.controlRun({ commandId: randomUUID(), action: 'continue' }, h.scope);
    expect(h.controller.current?.policy).toMatchObject({
      autonomousActorIds: [],
      durationSeconds: 19,
      maximumCalls: 3,
    });
    expect(h.controller.current?.prepared).toBeUndefined();
    expect(h.calls).toHaveLength(1);
  }, 60_000);

  it('a Stop during retry source lookup prevents a later interval or inference admission', async () => {
    const h = await harness();
    const source = await h.controller.submitStimulus(
      { commandId: randomUUID(), stimulus: h.stimulus, policy: h.settings.policy },
      h.scope,
    );
    await h.controller.waitHeld();
    const original = await h.runtime.service.store.getSpeechJob(source.sourceId!),
      before = h.calls.length,
      read = h.runtime.service.store.getJob.bind(h.runtime.service.store);
    let enter!: () => void, release!: () => void;
    const entered = new Promise<void>((resolve) => (enter = resolve)),
      released = new Promise<void>((resolve) => (release = resolve));
    const get = vi.spyOn(h.runtime.service.store, 'getJob').mockImplementation(async (id) => {
      if (id === original!.id) {
        enter();
        await released;
      }
      return read(id);
    });
    const retry = h.controller.retryResponse(
      {
        kind: 'retryResponse',
        commandId: randomUUID(),
        sourceId: original!.id,
        policy: h.settings.policy,
        expected: { runtimeGeneration: h.runtime.service.generation, scenarioRevision: 0 },
      },
      h.scope,
    );
    const rejected = expect(retry).rejects.toThrow('stopped before source admission');
    await entered;
    await h.controller.controlRun({ commandId: randomUUID(), action: 'stop' }, h.scope);
    release();
    await rejected;
    get.mockRestore();
    expect(h.controller.state).toBe('ended');
    expect(h.calls).toHaveLength(before);
  }, 60_000);

  it('Stop aborts an entered isolated comparison and waits for its native and capture settlement', async () => {
    let enter!: () => void,
      release!: () => void,
      hold = false;
    const entered = new Promise<void>((resolve) => (enter = resolve)),
      released = new Promise<void>((resolve) => (release = resolve)),
      h = await harness({ generateGate: () => (hold ? (enter(), released) : Promise.resolve()) });
    const source = await h.controller.submitStimulus(
      { commandId: randomUUID(), stimulus: h.stimulus, policy: h.settings.policy },
      h.scope,
    );
    await h.controller.waitHeld();
    const stage = (
      await h.records.pageRecords('stage', { runId: source.runId, limit: 100 })
    ).items.find((record) => record.name === 'attempt:0:generate');
    expect(stage).toBeDefined();
    hold = true;
    const comparison = h.controller.rerunRequest(
      { kind: 'rerunRequest', commandId: randomUUID(), runId: source.runId!, stageId: stage!.id },
      h.scope,
    );
    await entered;
    let stopped = false;
    const stop = h.controller
      .controlRun({ commandId: randomUUID(), action: 'stop' }, h.scope)
      .then(() => {
        stopped = true;
      });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(stopped).toBe(false);
    expect(h.calls.at(-1)?.signal?.aborted).toBe(true);
    release();
    await stop;
    const result = await comparison;
    expect(result).toMatchObject({ ok: false, code: 'comparison-failed' });
    expect(h.controller.state).toBe('ended');
    expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
    expect((await h.records.getRecord(result.runId!, 'run'))?.summary).toMatchObject({
      completeness: 'partial',
    });
  }, 60_000);

  it('advances the requested simulation duration through the native clock rate without multiplying game time', async () => {
    const h = await harness(),
      before = h.runtime.service.world.simTime;
    h.settings.policy.autonomousActorIds = [];
    expect(await h.runtime.service.control({ speed: 3 })).toMatchObject({ ok: true });
    expect(h.runtime.service.speed).toBe(3);
    await h.controller.controlRun(
      { commandId: randomUUID(), action: 'advanceTime', durationSeconds: 1 },
      h.scope,
    );
    await h.controller.waitHeld();
    expect(h.runtime.service.world.simTime - before).toBeCloseTo(1, 6);
    expect(h.controller.current?.reason).toBe('The requested simulation duration elapsed.');
    expect(h.calls).toHaveLength(0);
  }, 60_000);

  it('advances an autonomous queued native gathering plan with the automatic clock running', async () => {
    const h = await harness();
    await queueShortGathering(h.runtime.service);
    const before = h.runtime.service.world.simTime;
    expect(h.settings.policy.autonomousActorIds).toEqual([NPC_ID]);
    expect(entityGet(h.runtime.service.world.entities, NPC_ID)!.actor!.action).toBeNull();
    h.runtime.clock.start();
    expect(
      await h.controller.controlRun(
        { commandId: randomUUID(), action: 'advanceTime', durationSeconds: 10 },
        h.scope,
      ),
    ).toMatchObject({ ok: true });
    await h.controller.waitHeld();
    const action = entityGet(h.runtime.service.world.entities, NPC_ID)!.actor!.action!;
    expect(h.runtime.service.world.simTime - before).toBeCloseTo(10, 6);
    expect(action).toMatchObject({ type: 'gather', stage: 'working', totalSeconds: 30 });
    expect(action.remainingSeconds).toBeCloseTo(20, 5);
    expect(h.controller.current?.reason).toBe('The requested simulation duration elapsed.');
    expect(h.calls).toHaveLength(0);
  }, 60_000);

  it.each(['settle', 'stop', 'prepare', 'captureFailure', 'captureReleaseFailure'] as const)(
    '%s resumes checkpoint background preparation before offering native time',
    async (disposition) => {
      const h = await harness();
      await queueShortGathering(h.runtime.service);
      await editWorld(h.runtime.service, (world) => {
        world.memories[NPC_ID]!.push({
          id: 'checkpoint-unindexed-memory',
          actorId: NPC_ID,
          kind: 'episode',
          source: 'observed',
          summary: 'A retained checkpoint account awaiting native indexing.',
          at: world.simTime,
          entityIds: [],
          importance: 1,
        });
      });
      const checkpoint = await h.saves.capture('checkpoint', 'Queued native work and memory');
      await h.saves.restore(checkpoint.record.id, randomUUID());
      // The injected embedding client uses the actual restored Recall resume
      // subscriber and execution registration; no synthetic clock hold is added.
      await h.runtime.director.close();
      const service = h.runtime.service;
      service.config.embeddingKey = 'fixture';
      let enter!: () => void, release!: () => void;
      const entered = new Promise<void>((resolve) => (enter = resolve)),
        gate = new Promise<void>((resolve) => (release = resolve));
      const embed = vi.fn(async (request: import('@open-legend/ai').EmbeddingRequest) => {
        enter();
        await gate;
        return {
          outcome: 'value' as const,
          value: request.texts.map(() =>
            Array.from({ length: service.config.embeddingDimensions }, (_, index) =>
              Number(index === 0),
            ),
          ),
          receipt: receipt(request.requestId, 'openai'),
        };
      });
      const log = new IntelligenceLog(service.store);
      const indexer = new RecallService(service, log, { embed }, h.runtime.execution);
      cleanup.unshift(async () => {
        release();
        await indexer.close();
        await log.close();
      });
      const before = service.world.simTime;
      const control = service.cognitionControl!;
      let held!: () => void;
      const heldAtStage = new Promise<void>((resolve) => (held = resolve));
      let opened = false;
      const unsubscribe = control.subscribe(() => {
        if (!control.held) opened = true;
        else if (opened) held();
      });
      cleanup.unshift(async () => unsubscribe());
      if (disposition === 'prepare' || disposition === 'captureFailure') {
        const resume = control.resume.bind(control);
        vi.spyOn(control, 'resume').mockImplementationOnce(() => resume(() => true));
      }
      let captureRefused = false;
      let unreleasedCapture: string | undefined;
      const releaseCapture = h.records.release.bind(h.records);
      if (disposition === 'captureFailure' || disposition === 'captureReleaseFailure') {
        const put = h.records.putArtifact.bind(h.records);
        vi.spyOn(h.records, 'putArtifact').mockImplementation(async (data, type, options) => {
          if (
            !captureRefused &&
            typeof data === 'string' &&
            (disposition === 'captureFailure'
              ? JSON.parse(data).kind === 'embedding'
              : JSON.parse(data).receipt)
          ) {
            captureRefused = true;
            throw new Error(
              `Fixture restored background ${disposition === 'captureFailure' ? 'input' : 'output'} capture failed.`,
            );
          }
          return put(data, type, options);
        });
      }
      if (disposition === 'captureReleaseFailure') {
        vi.spyOn(h.records, 'release').mockImplementation(async (id) => {
          if (captureRefused && (!unreleasedCapture || unreleasedCapture === id)) {
            unreleasedCapture = id;
            throw new Error('Fixture capture credit release failed.');
          }
          return releaseCapture(id);
        });
        cleanup.unshift(async () => {
          if (unreleasedCapture) await releaseCapture(unreleasedCapture);
        });
      }
      h.runtime.clock.start();
      const advance = h.controller.controlRun(
        { commandId: randomUUID(), action: 'advanceTime', durationSeconds: 10 },
        h.scope,
      );
      const stopped =
        disposition === 'stop' ||
        disposition === 'captureFailure' ||
        disposition === 'captureReleaseFailure'
          ? expect(advance).rejects.toThrow('The runtime clock is held.')
          : undefined;
      if (disposition === 'captureFailure') {
        await stopped;
        await h.controller.waitHeld();
        expect(captureRefused).toBe(true);
        expect(h.controller.state).toBe('held');
        expect(h.controller.current?.reason).toBe(
          'Fixture restored background input capture failed.',
        );
        expect(h.controller.current?.completeness).toBe('partial');
        expect(h.controller.current?.prepared).toBeUndefined();
        expect(control.prepared).toHaveLength(0);
        expect(control.activeCalls).toBe(0);
        expect(service.world.simTime).toBe(before);
        expect(embed).not.toHaveBeenCalled();
        expect(h.calls).toHaveLength(0);
        expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
        return;
      }
      if (disposition === 'prepare') {
        await heldAtStage;
        expect(await advance).toMatchObject({ ok: true });
        await h.controller.waitHeld();
        const prepared = h.controller.current?.prepared;
        expect(prepared).toMatchObject({ kind: 'embed', status: 'held' });
        expect(h.controller.current?.status).toBe('Held before stage');
        expect(h.controller.current?.reason).toBe(
          'Inspect the prepared input, then explicitly continue or stop.',
        );
        expect(control.prepared[0]?.handle).toBe(prepared!.id);
        expect(service.world.simTime).toBe(before);
        expect(embed).not.toHaveBeenCalled();
        const intervals = h.controller.current!.counts.intervals;
        expect(
          await h.controller.controlRun({ commandId: randomUUID(), action: 'continue' }, h.scope),
        ).toMatchObject({ ok: true, message: 'The prepared input was submitted once.' });
        await entered;
        const hold = h.controller.controlRun({ commandId: randomUUID(), action: 'hold' }, h.scope);
        release();
        await hold;
        expect(h.controller.current!.counts.intervals).toBe(intervals);
        expect(
          await h.controller.submitPrepared(randomUUID(), prepared!.id, undefined, h.scope),
        ).toMatchObject({ message: 'This input was already submitted.' });
        expect(embed).toHaveBeenCalledTimes(1);
        expect(h.calls).toHaveLength(0);
        return;
      }
      await entered;
      expect(service.cognitionControl!.processing).toBe(true);
      expect(service.world.simTime).toBe(before);
      if (disposition === 'captureReleaseFailure') {
        release();
        await stopped;
        await h.controller.waitHeld();
        expect(captureRefused).toBe(true);
        expect(unreleasedCapture).toBeDefined();
        expect(h.controller.state).toBe('held');
        expect(h.controller.current?.reason).toBe(
          'Fixture restored background output capture failed.',
        );
        expect(h.controller.current?.completeness).toBe('partial');
        expect(h.controller.current?.prepared).toBeUndefined();
        expect(control.activeCalls).toBe(0);
        expect(service.world.simTime).toBe(before);
        expect(embed).toHaveBeenCalledTimes(1);
        expect(h.calls).toHaveLength(0);
        const attempts = await h.records.pageAttempts(h.controller.current!.id);
        expect(attempts.items).toHaveLength(1);
        expect(attempts.items[0]).toMatchObject({
          receipt: { dispatched: true, estimatedCostUsd: 0 },
          costUsd: 0,
          completionUncertain: false,
        });
        expect((await h.records.usage()).reservedBytes).toBeGreaterThan(h.baselineReservedBytes);
        await releaseCapture(unreleasedCapture!);
        expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
        return;
      }
      if (disposition === 'stop') {
        const stop = h.controller.controlRun({ commandId: randomUUID(), action: 'stop' }, h.scope);
        release();
        await stopped;
        await stop;
        expect(service.world.simTime).toBe(before);
        expect(h.controller.state).toBe('ended');
      } else {
        release();
        expect(await advance).toMatchObject({ ok: true });
        await h.controller.waitHeld();
        expect(service.world.simTime - before).toBeCloseTo(10, 6);
        const action = entityGet(service.world.entities, NPC_ID)!.actor!.action!;
        expect(action).toMatchObject({ type: 'gather', totalSeconds: 30 });
        expect(action.remainingSeconds).toBeCloseTo(20, 5);
      }
      expect(embed).toHaveBeenCalled();
      expect(h.calls).toHaveLength(0);
    },
    60_000,
  );

  it('waits for an internal capture boundary before completing its actual finite time', async () => {
    const h = await harness();
    const before = h.runtime.service.world.simTime;
    h.settings.policy.autonomousActorIds = [];
    h.runtime.clock.start();
    const tick = h.runtime.service.tick.bind(h.runtime.service);
    vi.spyOn(h.runtime.service, 'tick').mockImplementationOnce(async (...args) => {
      const release = h.runtime.clock.holdBoundary();
      try {
        return await tick(...args);
      } finally {
        release();
      }
    });
    expect(
      await h.controller.controlRun(
        { commandId: randomUUID(), action: 'advanceTime', durationSeconds: 10 },
        h.scope,
      ),
    ).toMatchObject({ ok: true });
    await h.controller.waitHeld();
    expect(h.runtime.service.world.simTime - before).toBeCloseTo(10, 6);
    expect(h.controller.state).toBe('held');
    expect(h.controller.current?.reason).toBe('The requested simulation duration elapsed.');
    expect(h.calls).toHaveLength(0);
  }, 60_000);

  it('does not reopen an explicit time offer after Stop wins its native tick boundary', async () => {
    const h = await harness();
    const before = h.runtime.service.world.simTime;
    h.runtime.clock.start();
    let enter!: () => void, release!: () => void;
    const entered = new Promise<void>((resolve) => (enter = resolve)),
      gate = new Promise<void>((resolve) => (release = resolve));
    const tick = h.runtime.service.tick.bind(h.runtime.service);
    vi.spyOn(h.runtime.service, 'tick').mockImplementationOnce(async (...args) => {
      enter();
      await gate;
      return tick(...args);
    });
    const advancing = h.controller.controlRun(
      { commandId: randomUUID(), action: 'advanceTime', durationSeconds: 10 },
      h.scope,
    );
    const rejected = expect(advancing).rejects.toThrow('The runtime clock is held.');
    await entered;
    try {
      await h.controller.controlRun({ commandId: randomUUID(), action: 'stop' }, h.scope);
    } finally {
      release();
    }
    await rejected;
    await h.controller.waitHeld();
    expect(h.runtime.service.world.simTime).toBe(before);
    expect(h.controller.state).toBe('ended');
    expect(h.controller.current?.reason).toBe('Stopped by the operator.');
    expect(h.calls).toHaveLength(0);
  }, 60_000);

  it('discards the remaining elapsed debt when a real hold wins between coherent native batches', async () => {
    const h = await harness();
    const control = h.runtime.service.cognitionControl!;
    const before = h.runtime.service.world.simTime;
    const current = () => !control.held;
    let hostTime = performance.now();
    // Represent a busy host reaching its existing publication budget; native
    // simulation still chooses the coherent boundary and retains actual progress.
    const hostClock = vi.spyOn(performance, 'now').mockImplementation(() => (hostTime += 40));
    let partial = 0;
    try {
      control.resume();
      await h.runtime.service.tick(1000 / h.runtime.service.config.baseRatio, 0, {
        drain: false,
        offerCurrent: current,
      });
      partial = h.runtime.service.world.simTime - before;
      expect(partial).toBeGreaterThan(0);
      expect(partial).toBeLessThan(1000);
      control.hold();
      await h.runtime.service.tick(0, 0, { offerCurrent: current });
      expect(h.runtime.service.world.simTime - before).toBe(partial);
    } finally {
      hostClock.mockRestore();
    }
    control.resume();
    await h.runtime.service.tick(1 / h.runtime.service.config.baseRatio, 0, {
      offerCurrent: current,
    });
    control.hold();
    expect(h.runtime.service.world.simTime - before - partial).toBeCloseTo(1, 6);
    expect(h.calls).toHaveLength(0);
  }, 60_000);

  it('steps from a held native request to the next actual stage before sending that stage', async () => {
    const h = await harness();
    await h.controller.submitStimulus(
      {
        commandId: randomUUID(),
        stimulus: h.stimulus,
        policy: h.settings.policy,
        stagePurpose: 'nextDecision',
      },
      h.scope,
    );
    await h.controller.waitHeld();
    const first = h.controller.current?.prepared;
    expect(first).toBeDefined();
    expect(h.calls).toHaveLength(0);
    await h.controller.controlRun({ commandId: randomUUID(), action: 'step' }, h.scope);
    await h.controller.waitHeld();
    const next = h.controller.current?.prepared;
    expect(next?.id).not.toBe(first?.id);
    expect(next?.purpose).not.toBe(first?.purpose);
    expect(h.calls).toHaveLength(1);
    expect('questions' in h.calls[0]!).toBe(true);
    await h.controller.submitPrepared(randomUUID(), next!.id, undefined, h.scope);
    await h.controller.waitHeld();
    expect(h.calls.some((call) => 'task' in call)).toBe(true);
    expect(h.controller.current?.prepared).toBeUndefined();
  }, 60_000);

  it('holds at the exact committed native event boundary before an admitted response is sent', async () => {
    const h = await harness();
    const source = await h.controller.submitStimulus(
      {
        commandId: randomUUID(),
        stimulus: h.stimulus,
        policy: {
          ...h.settings.policy,
          mode: 'untilCondition',
          stopCondition: { kind: 'nextEvent' },
        },
      },
      h.scope,
    );
    await h.controller.waitHeld();
    expect(source.sourceAccepted).toBe(true);
    expect(h.runtime.service.world.events.some((event) => event.id === source.sourceId)).toBe(true);
    expect(h.controller.current?.reason).toContain('committed native event');
    expect(h.controller.state).toBe('held');
    expect(h.calls).toHaveLength(0);
  }, 60_000);

  it.each(['stop', 'load'] as const)(
    '%s settles a held native request without renewing its stopped timing budget',
    async (operation) => {
      const h = await harness({ decisionEscalation: true });
      const checkpoint = await h.saves.capture('checkpoint', 'Before the held request');
      const timeline = h.runtime.service.timelineId;
      const source = await h.controller.submitStimulus(
        {
          commandId: randomUUID(),
          stimulus: h.stimulus,
          policy: h.settings.policy,
          stagePurpose: 'nextDecision',
        },
        h.scope,
      );
      await h.controller.waitHeld();
      expect(h.controller.current?.prepared).toBeDefined();
      expect(h.calls).toHaveLength(0);
      const job = await h.runtime.service.store.getSpeechJob(source.sourceId!);
      expect(job?.decision?.immediate.kind).toBe('pending');
      if (operation === 'stop') {
        await h.controller.controlRun({ commandId: randomUUID(), action: 'stop' }, h.scope);
        expect(h.controller.state).toBe('ended');
      } else {
        await h.saves.restore(checkpoint.record.id, randomUUID());
        expect(h.controller.state).toBe('ready');
        expect(h.runtime.service.timelineId).not.toBe(timeline);
      }
      expect((await h.runtime.service.store.getJob(job!.id))?.status).toBe('cancelled');
      expect(h.controller.current?.prepared).toBeUndefined();
      expect(h.runtime.service.cognitionControl?.activeCalls).toBe(0);
      expect(h.calls).toHaveLength(0);
      expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
    },
    60_000,
  );

  it('cancels the native request even if its cancellation progress record cannot be saved', async () => {
    let enter!: () => void, release!: () => void;
    const entered = new Promise<void>((resolve) => (enter = resolve)),
      released = new Promise<void>((resolve) => (release = resolve)),
      h = await harness({ generateGate: () => (enter(), released) });
    const source = await h.controller.submitStimulus(
      { commandId: randomUUID(), stimulus: h.stimulus, policy: h.settings.policy },
      h.scope,
    );
    await entered;
    const request = h.calls.at(-1)! as GenerateRequest,
      job = await h.runtime.service.store.getSpeechJob(source.sourceId!),
      write = h.runtime.service.store.putJob.bind(h.runtime.service.store);
    const put = vi.spyOn(h.runtime.service.store, 'putJob').mockImplementation(async (record) => {
      if (record.message === 'Cancelling request…')
        throw new Error('Fixture cancellation progress failure.');
      return write(record);
    });
    try {
      await expect(h.runtime.director.cancel(job!.id)).rejects.toThrow(
        'cancellation progress failure',
      );
      expect(request.signal?.aborted).toBe(true);
    } finally {
      put.mockRestore();
      release();
    }
    await h.controller.waitHeld();
    expect((await h.runtime.service.store.getJob(job!.id))?.status).toBe('cancelled');
    expect(h.runtime.service.cognitionControl?.activeCalls).toBe(0);
    expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
  }, 60_000);

  it('blocks response admission immediately while cancellation progress awaits storage', async () => {
    const h = await harness();
    let enterAdmission!: () => void, releaseAdmission!: () => void;
    let enterCancellation!: () => void, releaseCancellation!: () => void;
    const admissionEntered = new Promise<void>((resolve) => (enterAdmission = resolve));
    const admissionReleased = new Promise<void>((resolve) => (releaseAdmission = resolve));
    const cancellationEntered = new Promise<void>((resolve) => (enterCancellation = resolve));
    const cancellationReleased = new Promise<void>((resolve) => (releaseCancellation = resolve));
    const write = h.runtime.service.store.putJob.bind(h.runtime.service.store);
    let admissionHeld = false;
    const put = vi.spyOn(h.runtime.service.store, 'putJob').mockImplementation(async (record) => {
      if (record.message === 'Cancelling request…') {
        enterCancellation();
        await cancellationReleased;
      } else if (record.responseReady && !admissionHeld) {
        admissionHeld = true;
        enterAdmission();
        await admissionReleased;
      }
      return write(record);
    });
    let cancellation: Promise<unknown> | undefined;
    try {
      const source = await h.controller.submitStimulus(
        { commandId: randomUUID(), stimulus: h.stimulus, policy: h.settings.policy },
        h.scope,
      );
      await admissionEntered;
      const job = await h.runtime.service.store.getSpeechJob(source.sourceId!);
      cancellation = h.runtime.director.cancel(job!.id);
      await cancellationEntered;
      expect(h.calls.at(-1)?.signal?.aborted).toBe(true);
      releaseAdmission();
      let settled = false;
      const settlement = h.runtime.director.settleDispatched().then(() => (settled = true));
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(settled).toBe(false);
      expect(h.runtime.service.world.responseReceipts?.[job!.id]).toBeUndefined();
      releaseCancellation();
      await cancellation;
      await settlement;
      await h.controller.waitHeld();
      expect((await h.runtime.service.store.getJob(job!.id))?.status).toBe('cancelled');
      expect(h.runtime.service.world.responseReceipts?.[job!.id]).toBeUndefined();
      expect(h.runtime.service.cognitionControl?.activeCalls).toBe(0);
    } finally {
      releaseAdmission();
      releaseCancellation();
      await cancellation;
      put.mockRestore();
    }
  }, 60_000);

  it('releases interval credit when setup fails before source admission and can admit a later interval', async () => {
    const h = await harness(),
      before = h.runtime.service.world.events.length,
      write = h.records.putRecord.bind(h.records);
    let fail = true;
    const put = vi.spyOn(h.records, 'putRecord').mockImplementation(async (record, options) => {
      if (fail && record.kind === 'interval') {
        fail = false;
        throw new Error('Fixture interval write failure.');
      }
      return write(record, options);
    });
    await expect(
      h.controller.submitStimulus(
        { commandId: randomUUID(), stimulus: h.stimulus, policy: h.settings.policy },
        h.scope,
      ),
    ).rejects.toThrow('Fixture interval write failure.');
    await h.controller.waitHeld();
    expect(h.controller.state).toBe('held');
    expect(h.controller.current?.completeness).toBe('partial');
    expect(h.runtime.service.world.events).toHaveLength(before);
    expect(h.calls).toHaveLength(0);
    expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
    put.mockRestore();
    const admitted = await h.controller.submitStimulus(
      { commandId: randomUUID(), stimulus: h.stimulus, policy: h.settings.policy },
      h.scope,
    );
    expect(admitted.sourceAccepted).toBe(true);
    await h.controller.waitHeld();
    expect(h.calls.length).toBeGreaterThan(0);
  }, 60_000);

  it('finishes native settlement and releases interval credit even when terminal metadata cannot be saved', async () => {
    const h = await harness();
    await h.controller.submitStimulus(
      {
        commandId: randomUUID(),
        stimulus: h.stimulus,
        policy: { ...h.settings.policy, mode: 'continuous' },
      },
      h.scope,
    );
    await h.runtime.director.idle();
    const control = h.runtime.service.cognitionControl!;
    control.hold();
    const interval = h.controller['interval']!,
      originalReservation = interval.reservation;
    const persist = h.controller['persistRun'].bind(h.controller);
    const recording = h.controller as unknown as {
      persistRun: (typeof h.controller)['persistRun'];
    };
    let entered!: () => void, releaseCapture!: () => void, nativeSettled!: () => void;
    const capturing = new Promise<void>((resolve) => (entered = resolve)),
      captureGate = new Promise<void>((resolve) => (releaseCapture = resolve)),
      settled = new Promise<void>((resolve) => (nativeSettled = resolve));
    let delayed = false;
    const recordingSpy = vi.spyOn(recording, 'persistRun').mockImplementation(async (...args) => {
      if (!delayed && h.controller.current?.prepared?.purpose === 'credit-race' && !args[1]) {
        delayed = true;
        entered();
        await captureGate;
      }
      return persist(...args);
    });
    const settleNative = h.runtime.director.settleDispatched.bind(h.runtime.director);
    const settleSpy = vi
      .spyOn(h.runtime.director, 'settleDispatched')
      .mockImplementation(async () => {
        await settleNative();
        nativeSettled();
      });
    const read = vi.spyOn(h.records, 'getRecord');
    const rootId = randomUUID(),
      releaseNative = control.registerNative(rootId);
    const pending = control
      .prepare(
        {
          id: randomUUID(),
          rootId,
          actorId: NPC_ID,
          purpose: 'credit-race',
          generation: h.runtime.service.generation,
          responseBoundBytes: 1000,
          current: () => {},
        },
        { kind: 'judge', request: { state: {}, questions: {} } },
      )
      .finally(releaseNative);
    void pending.catch(() => {});
    await capturing;
    const handle = h.controller.current!.prepared!.id;
    const held = h.controller.controlRun({ commandId: randomUUID(), action: 'hold' }, h.scope);
    await settled;
    await new Promise<void>((resolve) => setImmediate(resolve));
    try {
      expect(read).not.toHaveBeenCalledWith(interval.rootId, 'stage');
      expect(interval.reservation).toBe(originalReservation);
    } finally {
      releaseCapture();
    }
    await held;
    expect(h.controller.current?.completeness).toBe('complete');
    expect(h.controller.current?.prepared?.id).toBe(handle);
    expect(interval.reservation).toBe('');
    recordingSpy.mockRestore();
    settleSpy.mockRestore();
    read.mockRestore();
    await h.controller.submitPrepared(randomUUID(), handle, undefined, h.scope);
    await control.decline((await pending).stage, 'The diagnostic source made no provider request.');
    const write = h.records.putRecord.bind(h.records);
    let fail = true;
    const put = vi.spyOn(h.records, 'putRecord').mockImplementation(async (record, options) => {
      if (fail && record.kind === 'run' && record.status === 'held') {
        fail = false;
        throw new Error('Fixture terminal write failure.');
      }
      return write(record, options);
    });
    await expect(
      h.controller.controlRun({ commandId: randomUUID(), action: 'hold' }, h.scope),
    ).rejects.toThrow('Fixture terminal write failure.');
    await h.controller.waitHeld();
    expect(h.controller.state).toBe('held');
    expect(h.controller.current?.completeness).toBe('partial');
    expect(h.runtime.service.cognitionControl?.activeCalls).toBe(0);
    expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
    put.mockRestore();
  }, 60_000);

  it('indexes only selected autonomous people after release and funds the actual edited embedding texts', async () => {
    const h = await harness();
    await h.runtime.director.close();
    const service = h.runtime.service,
      control = service.cognitionControl!,
      log = new IntelligenceLog(service.store),
      texts = ['Experimental embedding content. '.repeat(200)],
      calls: string[][] = [];
    service.config.embeddingReserveUsd = 0.000001;
    service.config.embeddingKey = 'fixture';
    await editWorld(service, (world) => {
      world.memories[NPC_ID]!.push({
        id: 'selected-memory-index-fixture',
        actorId: NPC_ID,
        kind: 'episode',
        source: 'observed',
        summary: 'A selected-autonomy indexing fixture.',
        at: world.simTime,
        entityIds: [],
        importance: 1,
      });
    });
    const reserve = vi.spyOn(service.store, 'reserve');
    control.setInputTransform((stage, input) =>
      input.kind === 'embedding' ? { kind: 'embedding', request: { texts } } : input,
    );
    control.setAutonomousActors([]);
    const indexer = new RecallService(service, log, {
      async embed(request) {
        calls.push(request.texts);
        return {
          outcome: 'value',
          value: request.texts.map(() =>
            Array.from({ length: service.config.embeddingDimensions }, (_, i) => Number(i === 0)),
          ),
          receipt: receipt(request.requestId, 'openai'),
        };
      },
    });
    cleanup.unshift(async () => {
      control.hold();
      await indexer.close();
      await log.close();
    });
    control.resume();
    await indexer['indexWork'];
    expect(calls).toHaveLength(0);
    control.hold();
    control.setAutonomousActors([NPC_ID]);
    control.resume();
    await indexer['indexWork'];
    expect(calls, indexer['indexFailure']).toEqual([texts]);
    const admission = reserve.mock.calls.find(([id]) => id.startsWith('memory-index:'));
    expect(admission?.[2]).toBe(
      stageAllowance(service.config, { kind: 'embedding', request: { texts } }),
    );
    expect(admission?.[2]).toBeGreaterThan(service.config.embeddingReserveUsd);
    expect(admission?.[4]).toBe(NPC_ID);
  }, 60_000);

  it('records an indexing hold before admission without claiming spending was refused', async () => {
    const h = await harness();
    await h.runtime.director.close();
    const service = h.runtime.service,
      control = service.cognitionControl!,
      log = new IntelligenceLog(service.store);
    service.config.embeddingKey = 'fixture';
    await editWorld(service, (world) => {
      world.memories[NPC_ID]!.push({
        id: 'held-memory-index-fixture',
        actorId: NPC_ID,
        kind: 'episode',
        source: 'observed',
        summary: 'A memory whose indexing is held before admission.',
        at: world.simTime,
        entityIds: [],
        importance: 1,
      });
    });
    const repository = service.store.memories!,
      markAttempt = repository.markAttempt.bind(repository),
      reserve = vi.spyOn(service.store, 'reserve'),
      decline = vi.spyOn(control, 'decline'),
      embed = vi.fn(async () => {
        throw new Error('Held indexing must not enter its provider.');
      });
    vi.spyOn(repository, 'markAttempt').mockImplementation(async (...args) => {
      control.hold();
      return markAttempt(...args);
    });
    control.setAutonomousActors([NPC_ID]);
    const indexer = new RecallService(service, log, { embed });
    cleanup.unshift(async () => {
      control.hold();
      await indexer.close();
      await log.close();
    });
    control.resume();
    await indexer['indexWork'];
    expect(repository.markAttempt).toHaveBeenCalled();
    expect(reserve).not.toHaveBeenCalled();
    expect(embed).not.toHaveBeenCalled();
    expect(decline.mock.calls.map(([, reason]) => reason)).toContain(
      'Embedding source or run eligibility changed before dispatch.',
    );
    expect(decline.mock.calls.some(([, reason]) => reason.includes('spending'))).toBe(false);
    expect(indexer['indexFailure']).toBeUndefined();
  }, 60_000);

  it('retains bounded sanitized provider exchanges even when the rolling combined diagnostic omits them', async () => {
    const h = await harness();
    fixtureTransport = true;
    const text = 'provider fixture '.repeat(16_000);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ text })),
    );
    let captured: { exchanges: Array<{ output?: unknown }>; partial: boolean } | undefined;
    const log = new IntelligenceLog(h.runtime.service.store, async (_id, value) => {
      captured = value;
    });
    try {
      await log.run(
        'Bounded capture fixture',
        { requestId: 'bounded-wire', text: 'i'.repeat(450_000) },
        async () => {
          await log.network.run({ timeoutMs: 5000 }, (operation) =>
            requestText(operation, {
              url: new URL('https://provider.fixture.invalid/inference'),
              init: {
                method: 'POST',
                headers: { authorization: 'Bearer fixture-secret' },
                body: '{}',
              },
              bodyPolicy: { kind: 'bounded', maxBytes: 500_000 },
            }),
          );
          return { text: 'o'.repeat(450_000) };
        },
        { id: 'bounded-wire' },
      );
      expect(log.get('bounded-wire')?.exchanges).toEqual([]);
      expect(log.captureSnapshot().omitted.content).toBeGreaterThan(0);
      expect(captured?.exchanges).toHaveLength(1);
      expect(captured?.exchanges[0]?.output).toEqual({ text });
      expect(captured?.partial).toBe(false);
      expect(JSON.stringify(captured)).not.toContain('fixture-secret');
      expect(fetch).toHaveBeenCalledOnce();
      vi.mocked(fetch).mockResolvedValueOnce(Response.json({ text: 'x'.repeat(1_100_000) }));
      await log.run('Omitted exchange fixture', { requestId: 'omitted-wire' }, () =>
        log.network.run({ timeoutMs: 5000 }, (operation) =>
          requestText(operation, {
            url: new URL('https://provider.fixture.invalid/inference'),
            bodyPolicy: { kind: 'bounded', maxBytes: 1_500_000 },
          }),
        ),
      );
      expect(captured?.partial).toBe(true);
      expect(captured?.exchanges).toHaveLength(1);
      expect(JSON.stringify(captured)).not.toContain('x'.repeat(100));
    } finally {
      await log.close();
    }
  }, 60_000);

  it('settles native setup after queued decision evidence fails before the pipeline starts', async () => {
    const h = await harness(),
      put = h.records.putRecord.bind(h.records);
    let refused = false;
    vi.spyOn(h.records, 'putRecord').mockImplementation(async (record, options) => {
      if (!refused && record.kind === 'timeline' && record.status === 'queued') {
        refused = true;
        throw new Error('Fixture queued decision capture failed.');
      }
      return put(record, options);
    });
    await expect(
      h.controller.submitStimulus(
        { commandId: randomUUID(), stimulus: h.stimulus, policy: h.settings.policy },
        h.scope,
      ),
    ).rejects.toThrow('Fixture queued decision capture failed.');
    await h.controller.waitHeld();
    expect(refused).toBe(true);
    expect(h.calls).toHaveLength(0);
    expect(h.runtime.service.cognitionControl!.processing).toBe(false);
    expect(h.controller.current?.completeness).toBe('partial');
    expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
  }, 60_000);

  it('keeps a completed native receipt and releases capture credit when output evidence fails', async () => {
    const h = await harness(),
      put = h.records.putArtifact.bind(h.records);
    let refused = false;
    vi.spyOn(h.records, 'putArtifact').mockImplementation(async (data, type, options) => {
      if (!refused && typeof data === 'string' && JSON.parse(data).receipt) {
        refused = true;
        throw new Error('Fixture output evidence capture failed.');
      }
      return put(data, type, options);
    });
    const source = await h.controller.submitStimulus(
      { commandId: randomUUID(), stimulus: h.stimulus, policy: h.settings.policy },
      h.scope,
    );
    await h.controller.waitHeld();
    expect(refused).toBe(true);
    expect(h.calls).toHaveLength(1);
    const nativeJob = await h.runtime.service.store.getSpeechJob(source.sourceId!);
    expect(
      (await h.runtime.service.store.decisionAttempts(nativeJob!.id)).some(
        (attempt) => attempt.receipt?.dispatched && !attempt.receipt.completionUncertain,
      ),
    ).toBe(true);
    expect(h.controller.current?.completeness).toBe('partial');
    expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
  }, 60_000);

  it('releases prepaid capture credit when an original input cannot be stored and dispatches no inference', async () => {
    const h = await harness(),
      put = h.records.putArtifact.bind(h.records);
    let refused = false;
    vi.spyOn(h.records, 'putArtifact').mockImplementation(async (data, type, options) => {
      if (!refused && typeof data === 'string' && JSON.parse(data).kind === 'judge') {
        refused = true;
        throw new Error('Fixture original input capture failed.');
      }
      return put(data, type, options);
    });
    const source = await h.controller.submitStimulus(
      { commandId: randomUUID(), stimulus: h.stimulus, policy: h.settings.policy },
      h.scope,
    );
    await h.controller.waitHeld();
    expect(refused).toBe(true);
    expect(h.calls).toHaveLength(0);
    expect(h.controller.current?.completeness).toBe('partial');
    expect(
      h.runtime.service.world.events.filter((event) => event.id === source.sourceId),
    ).toHaveLength(1);
    expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
  }, 60_000);

  it('declines a prepared stage without leaking capture credit when shared native capacity is occupied', async () => {
    const h = await harness();
    await h.controller.submitStimulus(
      {
        commandId: randomUUID(),
        stimulus: h.stimulus,
        policy: h.settings.policy,
        stagePurpose: 'nextDecision',
      },
      h.scope,
    );
    await h.controller.waitHeld();
    const prepared = h.controller.current!.prepared!;
    const occupied = await h.runtime.execution.requestOnly();
    expect(occupied).toBeDefined();
    try {
      await h.controller.submitPrepared(randomUUID(), prepared.id, undefined, h.scope);
      await h.controller.waitHeld();
      expect(h.calls).toHaveLength(0);
      expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
    } finally {
      occupied?.release();
    }
  }, 60_000);

  it('compares a captured generation through native spending without changing the scenario or its active run', async () => {
    const h = await harness();
    const source = await h.controller.submitStimulus(
      { commandId: randomUUID(), stimulus: h.stimulus, policy: h.settings.policy },
      h.scope,
    );
    await h.controller.waitHeld();
    const stages = await h.records.pageRecords('stage', { runId: source.runId, limit: 100 });
    const generation = stages.items.find((stage) => stage.name === 'attempt:0:generate');
    expect(generation).toBeDefined();
    const before = JSON.stringify(h.runtime.service.world),
      nativeRevision = h.runtime.service.durable.revision,
      current = h.controller.current!.id,
      calls = h.calls.length;
    const original = h.calls.find((call): call is GenerateRequest => 'schema' in call)!;
    const attemptsBefore = await h.store.db.prepare('SELECT count(*) AS count FROM attempts').get();
    await expect(
      h.controller.rerunRequest(
        {
          kind: 'rerunRequest',
          commandId: randomUUID(),
          runId: source.runId!,
          stageId: generation!.id,
          settings: { maxOutputTokens: (original.maxOutputTokens ?? 8192) + 1 },
        },
        h.scope,
      ),
    ).rejects.toThrow('The edited output allowance exceeds this native stage limit.');
    expect(h.calls).toHaveLength(calls);
    expect(await h.store.db.prepare('SELECT count(*) AS count FROM attempts').get()).toEqual(
      attemptsBefore,
    );
    const comparison = await h.controller.rerunRequest(
      {
        kind: 'rerunRequest',
        commandId: randomUUID(),
        runId: source.runId!,
        stageId: generation!.id,
        settings: { effort: 'high', maxOutputTokens: 128 },
      },
      h.scope,
    );
    expect(comparison.ok, comparison.message).toBe(true);
    expect(h.calls.length - calls).toBe(1);
    expect(h.calls.at(-1)).toMatchObject({ reasoningEffort: 'high', maxOutputTokens: 128 });
    expect(JSON.stringify(h.runtime.service.world)).toBe(before);
    expect(h.runtime.service.durable.revision).toBe(nativeRevision);
    expect(h.controller.current!.id).toBe(current);
    expect(h.controller.state).toBe('held');
    const attempts = await h.runtime.service.store.decisionAttempts(h.calls.at(-1)!.requestId);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      stage: 'request-comparison',
      receipt: { dispatched: true, completionUncertain: false },
    });
    const saved = await h.records.getRecord(comparison.runId!, 'run');
    expect(saved?.summary).toMatchObject({
      retained: true,
      counts: { calls: 1 },
      configuration: { effort: 'high', maxOutputTokens: 128, requestOverride: true },
    });
    const comparisonStages = await h.records.pageRecords('stage', {
      runId: comparison.runId,
      limit: 10,
    });
    expect(comparisonStages.items[0]?.summary).toMatchObject({
      sections: expect.arrayContaining([
        {
          id: 'changes',
          label: 'Changes',
          available: false,
          reason: 'Request comparisons do not apply scenario effects.',
        },
      ]),
    });
    const replayOrigin = h.controller.current!.originId;
    const metadata = {
      originId: randomUUID(),
      variantName: 'Changed factor',
      comparisonId: randomUUID(),
    };
    await h.controller.bindComparison(current, metadata);
    await h.controller.retain(current, 'Retained variant');
    expect(h.controller.current).toMatchObject({
      originId: replayOrigin,
      comparison: metadata,
      retained: true,
      name: 'Retained variant',
    });
    expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
  }, 60_000);

  it('retains an inspectable uncertain comparison after an entered adapter loses completion', async () => {
    let fail = false;
    const h = await harness({
      generateGate: async () => {
        if (fail) throw new Error('Fixture adapter completion was lost.');
      },
    });
    const source = await h.controller.submitStimulus(
      { commandId: randomUUID(), stimulus: h.stimulus, policy: h.settings.policy },
      h.scope,
    );
    await h.controller.waitHeld();
    const generation = (
      await h.records.pageRecords('stage', { runId: source.runId, limit: 100 })
    ).items.find((stage) => stage.name === 'attempt:0:generate');
    fail = true;
    const before = JSON.stringify(h.runtime.service.world);
    const result = await h.controller.rerunRequest(
      {
        kind: 'rerunRequest',
        commandId: randomUUID(),
        runId: source.runId!,
        stageId: generation!.id,
      },
      h.scope,
    );
    expect(result).toMatchObject({ ok: false, code: 'comparison-failed' });
    expect(JSON.stringify(h.runtime.service.world)).toBe(before);
    const run = await h.records.getRecord(result.runId!, 'run');
    expect(run?.summary).toMatchObject({
      completeness: 'partial',
      accounting: { uncertainAttempts: 1 },
    });
    const captured = (await h.records.pageRecords('stage', { runId: result.runId, limit: 10 }))
      .items;
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({ status: 'failed' });
    expect(
      (captured[0]!.summary as { artifacts: Array<{ kind: string }> }).artifacts.some(
        (item) => item.kind === 'input',
      ),
    ).toBe(true);
    expect(
      (await h.runtime.service.store.occupiedDecisionSlots()).some(
        (slot) => slot.attemptId === h.calls.at(-1)!.requestId,
      ),
    ).toBe(true);
    expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
  }, 60_000);

  it.each(['occupied', 'unknown'] as const)(
    'explains %s model capacity while preserving accepted speech/contact and normal time limits',
    async (capacity) => {
      const h = await harness();
      await editWorld(h.runtime.service, (world) => {
        for (const [id, z] of [
          [PLAYER_ID, 13],
          [NPC_ID, 14],
        ] as const) {
          const person = entityGet(world.entities, id)!;
          setSpatialPosition(world, person, { x: 12, y: 0, z }, worldSupport(person));
        }
      });
      const occupied = await h.runtime.execution.requestOnly();
      expect(occupied).toBeDefined();
      if (capacity === 'unknown') occupied!.uncertain('fixture-unconfirmed-request');
      const explanation =
        capacity === 'unknown'
          ? 'completion is unconfirmed'
          : 'Model capacity is occupied by an earlier request.';
      const contact = {
        kind: 'act' as const,
        actorId: PLAYER_ID,
        text: '',
        command: { type: 'express' as const, verb: 'tickle', targetId: NPC_ID },
      };
      try {
        for (const stimulus of [h.stimulus, contact]) {
          const accepted = await h.controller.submitStimulus(
            { commandId: randomUUID(), stimulus, policy: h.settings.policy },
            h.scope,
          );
          expect(accepted).toMatchObject({ ok: true, sourceAccepted: true });
          expect(accepted.sourceId).toBeTruthy();
          await h.controller.waitHeld();
          expect(h.calls).toHaveLength(0);
          expect(h.controller.current?.reason).toContain(explanation);
          expect(h.controller.current?.reason).not.toContain('still executing');
          if (capacity === 'occupied')
            expect(h.controller.current?.reason).not.toContain('unconfirmed');
          const acquired = h.runtime.service.world.experience?.awareness[NPC_ID]?.find(
            (entry) => entry.eventId === accepted.sourceId,
          );
          expect(acquired).toBeDefined();
          if (stimulus.kind === 'act') {
            expect(accepted.code).toBe('contacted');
            expect(acquired?.modality).toBe('felt');
            expect(h.controller.current?.reason).toContain('No model call was made');
          }
        }
        const start = h.runtime.service.world.simTime;
        const accepted = await h.controller.submitStimulus(
          {
            commandId: randomUUID(),
            stimulus: contact,
            policy: { ...h.settings.policy, mode: 'continuous', durationSeconds: 1 },
          },
          h.scope,
        );
        expect(accepted).toMatchObject({ ok: true, code: 'contacted', sourceAccepted: true });
        expect(h.controller.state).toBe('running');
        await h.runtime.clock.advance(1, false);
        await h.controller.waitHeld();
        expect(h.runtime.service.world.simTime - start).toBeCloseTo(1, 6);
        expect(h.controller.current?.reason).toContain('Run limit reached: simulation time.');
        expect(h.controller.current?.reason).toContain(explanation);
        expect(h.controller.current?.reason).toContain('No model call was made');
        expect(h.calls).toHaveLength(0);
        expect(h.runtime.execution.snapshot().primary).toBe(capacity);
      } finally {
        occupied?.release();
        await h.runtime.execution.reconcile(h.runtime.service.store);
      }
    },
    60_000,
  );

  it('keeps renderer-free participation active and submits directed speech once through the native chat job', async () => {
    const h = await harness();
    h.settings.policy.autonomousActorIds = [];
    expect(h.runtime.service.runtimeParticipants.has(PLAYER_ID)).toBe(true);
    h.runtime.service.cognitionControl!.resume();
    await h.runtime.clock.advance(15, false);
    h.runtime.service.cognitionControl!.hold();
    expect(
      entityGet(h.runtime.service.world.entities, PLAYER_ID)?.actor?.participation?.phase ??
        'active',
    ).toBe('active');
    // Another root can hold the Lab while this admitted speech job awaits its
    // queued-event capture. A later hold can also win the awaited lease lookup.
    const control = h.runtime.service.cognitionControl!;
    const emit = control.emit.bind(control);
    let heldBeforePreparation = false;
    let speechJobId: string | undefined,
      terminalSeen = false;
    const speechCalls = () =>
      h.calls.filter((request) => request.requestId.startsWith(`${speechJobId}:`));
    let hold: Promise<unknown> | undefined;
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const operatorHold = () => {
      control.hold();
      // Do not await settle inside the native observer that must reach the hold.
      hold = h.controller.controlRun({ commandId: randomUUID(), action: 'hold' }, h.scope);
    };
    vi.spyOn(control, 'emit').mockImplementation(async (event) => {
      await emit(event);
      if (
        event.kind === 'job' &&
        event.actorId === NPC_ID &&
        event.status === 'queued' &&
        !heldBeforePreparation
      ) {
        heldBeforePreparation = true;
        speechJobId = event.jobId;
        operatorHold();
      } else if (
        event.kind === 'job' &&
        event.jobId === speechJobId &&
        ['completed', 'failed', 'cancelled'].includes(event.status)
      ) {
        terminalSeen = true;
        operatorHold();
        finish();
      }
    });
    const execution = h.runtime.director['execution'];
    const primary = execution.primary.bind(execution);
    vi.spyOn(execution, 'primary').mockImplementationOnce(async (urgent) => {
      operatorHold();
      return primary(urgent);
    });
    const commandId = randomUUID();
    const first = await h.controller.submitStimulus(
      { commandId, stimulus: h.stimulus, policy: h.settings.policy },
      h.scope,
    );
    expect(first, first.message).toMatchObject({ sourceAccepted: true });
    expect(first.sourceId).toBeTruthy();
    await h.controller.waitHeld();
    await hold;
    expect(h.controller.state).toBe('held');
    expect(heldBeforePreparation).toBe(true);
    expect(speechCalls()).toHaveLength(0);
    expect((await h.runtime.service.store.getSpeechJob(first.sourceId!))?.status).not.toBe(
      'failed',
    );
    const continueUntil = async (done: () => boolean) => {
      // Background narration may expose another real prepared input. Drive the
      // actual inspector until this exact speech job reaches its next boundary.
      for (let step = 0; !done() && step < 8; step++) {
        await h.controller.controlRun({ commandId: randomUUID(), action: 'run' }, h.scope);
        await h.controller.waitHeld();
        await hold;
      }
      expect(done(), JSON.stringify(h.controller.current)).toBe(true);
    };
    await continueUntil(() => vi.mocked(execution.primary).mock.calls.length > 0);
    expect(execution.primary).toHaveBeenCalledOnce();
    expect(speechCalls()).toHaveLength(0);
    expect((await h.runtime.service.store.getSpeechJob(first.sourceId!))?.status).not.toBe(
      'failed',
    );
    await continueUntil(() => terminalSeen);
    await finished;
    await hold;
    await h.controller.waitHeld();
    expect(speechCalls().length, JSON.stringify(h.controller.current)).toBeGreaterThan(0);
    const repeated = await h.controller.submitStimulus(
      { commandId, stimulus: h.stimulus, policy: h.settings.policy },
      h.scope,
    );
    expect(repeated).toEqual(first);
    expect(
      h.runtime.service.world.events.filter((event) => event.id === first.sourceId),
    ).toHaveLength(1);
    const nativeJob = await h.runtime.service.store.getSpeechJob(first.sourceId!);
    expect(nativeJob?.id).toBe(speechJobId);
    expect(nativeJob?.playerSpeechEventId).toBe(first.sourceId);
    expect(['completed', 'failed']).toContain(nativeJob?.status);
    const stages = await h.records.pageRecords('stage', { runId: first.runId, limit: 100 });
    expect(stages.items.some((stage) => stage.sourceId?.startsWith(nativeJob!.id))).toBe(true);
    const context = stages.items.find(
      (stage) => (stage.summary as { kind?: string }).kind === 'retrieval',
    );
    expect(context).toBeDefined();
    const evidence = await h.records.pageEvidence(context!.id, { kind: 'memories' });
    expect(evidence.items.length).toBeGreaterThan(0);
    expect(evidence.items.some((item) => (item.summary as { selected?: boolean }).selected)).toBe(
      true,
    );
    expect(
      (await h.records.pageEvidence(h.controller.current!.latestRootId!, { kind: 'changes' })).items
        .length,
      JSON.stringify(h.controller.current),
    ).toBeGreaterThan(0);
    expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
  }, 60_000);

  it('holds the actual input before provider dispatch, applies one replacement, and leaves later input ordinary', async () => {
    const h = await harness();
    const accepted = await h.controller.submitStimulus(
      {
        commandId: randomUUID(),
        stimulus: h.stimulus,
        policy: h.settings.policy,
        stagePurpose: 'nextDecision',
      },
      h.scope,
    );
    await h.controller.waitHeld();
    const prepared = h.controller.current?.prepared;
    expect(prepared, JSON.stringify(h.controller.current)).toBeTruthy();
    expect(h.calls).toHaveLength(0);
    const original = JSON.parse(
      (await h.records.readArtifactChunk(prepared!.originalArtifactId!)).bytes.toString('utf8'),
    ) as {
      kind: 'judge';
      request: { state: unknown; questions: unknown };
    };
    const replacement = labJson({
      ...original,
      request: {
        ...original.request,
        state: { original: original.request.state, experimentalMarker: 'one-shot' },
      },
    });
    await h.controller.submitPrepared(randomUUID(), prepared!.id, replacement, h.scope);
    await h.controller.waitHeld();
    expect(h.calls[0] && 'state' in h.calls[0] ? h.calls[0].state : undefined).toHaveProperty(
      'experimentalMarker',
      'one-shot',
    );
    const originalBytes = await h.records.readArtifactChunk(prepared!.originalArtifactId!);
    expect(originalBytes.bytes.toString('utf8')).not.toContain('experimentalMarker');
    expect(
      h.runtime.service.world.events.filter((event) => event.id === accepted.sourceId),
    ).toHaveLength(1);
    const next = await h.controller.submitStimulus(
      {
        commandId: randomUUID(),
        stimulus: { ...h.stimulus, text: 'Anything else?' },
        policy: h.settings.policy,
      },
      h.scope,
    );
    await h.controller.waitHeld();
    expect(next.sourceId).not.toBe(accepted.sourceId);
    const lastJudgment = [...h.calls]
      .reverse()
      .find((call): call is JudgeRequest => 'questions' in call);
    expect(JSON.stringify(lastJudgment?.state)).not.toContain('experimentalMarker');

    // Two actual native preparation roots can finish capture while the operator
    // still holds an older inspector handle. Continuing either must retain the other.
    const control = h.runtime.service.cognitionControl!;
    const emit = control.emit.bind(control);
    const captures = new Map<string, (handle: string) => void>();
    const captureOrder: string[] = [];
    vi.spyOn(control, 'emit').mockImplementation(async (event) => {
      await emit(event);
      if (event.kind === 'prepared') {
        captureOrder.push(event.stage.handle);
        captures.get(event.stage.rootId)?.(event.stage.handle);
      }
    });
    h.settings.policy.autonomousActorIds = [];
    const calls = h.calls.length;
    for (const first of [0, 1] as const) {
      await h.controller.controlRun({ commandId: randomUUID(), action: 'step' }, h.scope);
      control.hold();
      captureOrder.length = 0;
      const pair = [0, 1].map(() => {
        const rootId = randomUUID(),
          id = randomUUID(),
          release = control.registerNative(rootId);
        const captured = new Promise<string>((resolve) => captures.set(rootId, resolve));
        const work = control
          .prepare(
            {
              id,
              rootId,
              actorId: NPC_ID,
              purpose: 'concurrent-preparation',
              generation: h.runtime.service.generation,
              responseBoundBytes: 1000,
              current: () => {},
            },
            { kind: 'judge', request: { state: { rootId }, questions: {} } },
          )
          .finally(release);
        return { id, captured, work };
      });
      const handles = await Promise.all(pair.map((entry) => entry.captured));
      expect(captureOrder).toEqual(handles);
      expect(h.controller.current?.prepared?.id).toBe(handles[0]);
      await h.controller.submitPrepared(randomUUID(), handles[first]!, undefined, h.scope);
      const other = first === 0 ? 1 : 0;
      expect(h.controller.current?.prepared?.id).toBe(handles[other]);
      expect(control.held).toBe(true);
      expect(h.calls).toHaveLength(calls);
      const selected = await pair[first]!.work;
      await h.controller.submitPrepared(randomUUID(), handles[first]!, undefined, h.scope);
      expect(h.controller.current?.prepared?.id).toBe(handles[other]);
      await control.decline(selected.stage, 'The diagnostic source made no provider request.');
      if (first === 0) {
        await h.controller.submitPrepared(randomUUID(), handles[other]!, undefined, h.scope);
        await control.decline(
          (await pair[other]!.work).stage,
          'The diagnostic source made no provider request.',
        );
        await h.controller.controlRun({ commandId: randomUUID(), action: 'hold' }, h.scope);
      } else {
        const cancelled = expect(pair[other]!.work).rejects.toThrow('stopped');
        await h.controller.controlRun({ commandId: randomUUID(), action: 'stop' }, h.scope);
        await cancelled;
      }
      expect(control.prepared).toHaveLength(0);
      expect(h.controller.current?.prepared).toBeUndefined();
      for (const entry of pair) {
        const retained = await h.records.pageRecords('stage', {
          runId: h.controller.current!.id,
          sourceId: entry.id,
          limit: 1,
        });
        expect(retained.items[0]?.status).toBe('cancelled');
      }
      expect(h.calls).toHaveLength(calls);
    }
  }, 60_000);
  it('continues a real saved decision boundary with fresh native bindings and no duplicate speech or prerequisite purchase', async () => {
    const h = await harness();
    const source = await h.controller.submitStimulus(
      {
        commandId: randomUUID(),
        stimulus: h.stimulus,
        policy: h.settings.policy,
        stagePurpose: 'attempt:0:generate',
      },
      h.scope,
    );
    await h.controller.waitHeld();
    const prepared = h.controller.current?.prepared;
    expect(prepared?.purpose).toBe('attempt:0:generate');
    expect(prepared?.request).toBeUndefined();
    const descriptor = await h.controller.continuationDescriptor();
    expect(descriptor).toBeTruthy();
    const checkpoint = await h.saves.capture('checkpoint', 'Held decision', {
      continuation: descriptor!.descriptor,
      references: descriptor!.references,
    });
    await h.controller.bindContinuationCheckpoint(checkpoint.record.id, descriptor!.stageId);
    const oldJob = await h.runtime.service.store.getSpeechJob(source.sourceId!);
    const count = h.calls.length;
    const resumed = await h.controller.continueCheckpoint(
      {
        kind: 'continueCheckpoint',
        commandId: randomUUID(),
        expected: { runtimeGeneration: h.runtime.service.generation, scenarioRevision: 0 },
        savedId: checkpoint.record.id,
        stageId: descriptor!.stageId,
        policy: h.settings.policy,
      },
      h.scope,
    );
    expect(resumed, resumed.message).toMatchObject({
      ok: true,
      sourceAccepted: false,
      sourceId: source.sourceId,
    });
    await h.controller.waitHeld();
    const newJob = await h.runtime.service.store.getSpeechJob(source.sourceId!);
    expect(newJob?.id).not.toBe(oldJob?.id);
    expect(newJob?.status, newJob?.message).toBe('completed');
    expect(h.calls.length - count).toBe(1);
    expect(
      h.runtime.service.world.events.filter((event) => event.id === source.sourceId),
    ).toHaveLength(1);
    const stages = await h.records.pageRecords('stage', { runId: resumed.runId, limit: 100 });
    expect(stages.items.some((stage) => stage.status === 'checkpointPrerequisite')).toBe(true);
    expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
  }, 60_000);

  it('a Stop during automatic origin capture fences the pending source admission', async () => {
    const h = await harness();
    const origin = h.saves.origin.bind(h.saves);
    let entered!: () => void, release!: () => void;
    const reached = new Promise<void>((resolve) => (entered = resolve)),
      gate = new Promise<void>((resolve) => (release = resolve));
    vi.spyOn(h.saves, 'origin').mockImplementationOnce(async () => {
      const saved = await origin();
      entered();
      await gate;
      return saved;
    });
    const submit = h.controller.submitStimulus(
      { commandId: randomUUID(), stimulus: h.stimulus, policy: h.settings.policy },
      h.scope,
    );
    const stopped = expect(submit).rejects.toThrow('stopped before source admission');
    await reached;
    await h.controller.controlRun({ commandId: randomUUID(), action: 'stop' }, h.scope);
    release();
    await stopped;
    expect(h.calls).toHaveLength(0);
    expect(
      h.runtime.service.world.events.some((event) => event.text.includes(h.stimulus.text)),
    ).toBe(false);
    expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
  }, 60_000);

  it('keeps native time at an explicit processing boundary while an admitted provider operation waits', async () => {
    let entered!: () => void, release!: () => void;
    const reached = new Promise<void>((resolve) => (entered = resolve)),
      gate = new Promise<void>((resolve) => (release = resolve));
    const h = await harness({
      generateGate: async () => {
        entered();
        await gate;
      },
    });
    h.runtime.clock.start();
    try {
      await h.controller.submitStimulus(
        {
          commandId: randomUUID(),
          stimulus: { ...h.stimulus, text: 'Shall we share the berries while we talk?' },
          policy: h.settings.policy,
        },
        h.scope,
      );
      await reached;
      const before = h.runtime.service.world.simTime;
      expect(h.runtime.service.cognitionControl!.activeCalls).toBe(1);
      await new Promise((resolve) => setTimeout(resolve, 1250));
      expect(h.runtime.service.world.simTime).toBe(before);
      expect(h.controller.state).toBe('running');
      release();
      await h.controller.waitHeld();
      expect(h.controller.current?.reason).not.toContain('limit reached');
      expect(h.controller.current?.timing?.processingMs).toBeGreaterThan(1250);
      expect(h.runtime.service.world.paused).toBe(false);
    } finally {
      release();
    }
  }, 60_000);

  it('does not report Held before final evidence credit and metadata settle', async () => {
    const h = await harness();
    let entered!: () => void, release!: () => void;
    const reached = new Promise<void>((resolve) => (entered = resolve)),
      gate = new Promise<void>((resolve) => (release = resolve));
    const nativeRelease = h.records.release.bind(h.records);
    let held = false;
    vi.spyOn(h.records, 'release').mockImplementation(async (id) => {
      if (!held && h.controller.state === 'settling') {
        held = true;
        entered();
        await gate;
      }
      return nativeRelease(id);
    });
    try {
      await h.controller.submitStimulus(
        { commandId: randomUUID(), stimulus: h.stimulus, policy: h.settings.policy },
        h.scope,
      );
      await reached;
      let resolved = false;
      const settled = h.controller.waitHeld().then(() => {
        resolved = true;
      });
      await new Promise((resolve) => setImmediate(resolve));
      expect(h.controller.state).toBe('settling');
      expect(resolved).toBe(false);
      release();
      await settled;
      expect(h.controller.state).toBe('held');
      expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
    } finally {
      release();
    }
  }, 60_000);

  it('rechecks a queued elapsed offer at its native lane boundary', async () => {
    const h = await harness();
    let entered!: () => void, release!: () => void;
    const reached = new Promise<void>((resolve) => (entered = resolve)),
      gate = new Promise<void>((resolve) => (release = resolve));
    const busy = h.runtime.service.publishRecall(async () => {
      entered();
      await gate;
    });
    await reached;
    const before = h.runtime.service.world.simTime;
    let current = true;
    const tick = h.runtime.service.tick(1, 0, { offerCurrent: () => current });
    current = false;
    release();
    await busy;
    await tick;
    expect(h.runtime.service.world.simTime).toBe(before);
  }, 60_000);

  it('returns an explicitly selected living participant through the native return owner', async () => {
    const h = await harness();
    const actor = entityGet(h.runtime.service.world.entities, PLAYER_ID)!.actor!;
    const life = actor.physicalLife;
    h.runtime.service.setRuntimeParticipants([]);
    await h.runtime.service.tick(2, 0);
    await h.runtime.service.tick(10, 0);
    expect(
      entityGet(h.runtime.service.world.entities, PLAYER_ID)!.actor!.participation?.phase,
    ).toBe('inactive');
    h.runtime.service.setRuntimeParticipants([PLAYER_ID, NPC_ID, 'missing']);
    await h.runtime.service.tick(0, 0);
    const returned = entityGet(h.runtime.service.world.entities, PLAYER_ID)!.actor!;
    expect(returned.participation?.phase).toBe('active');
    expect(returned.physicalLife).toBe(life);
    expect(returned.alive).toBe(true);
    expect([...h.runtime.service.runtimeParticipants]).toEqual([PLAYER_ID]);
    expect(
      h.runtime.service.world.events.some(
        (event) => event.type === 'returned' && event.actorId === PLAYER_ID,
      ),
    ).toBe(true);
  }, 60_000);

  it('retains actual bounded native HTTP exchanges while excluding credentials', async () => {
    const omitted = vi.fn();
    expect(
      captureDiagnosticValue(
        { prose: '[note] "Hello" password=fixture-prose-secret Bearer fixture-bearer-secret' },
        500_000,
        omitted,
      ),
    ).toEqual({ prose: '[note] "Hello" password=[redacted] Bearer [redacted]' });
    expect(omitted).not.toHaveBeenCalled();
    for (const prose of [
      '{"password":"fixture-secret"',
      '["fixture", {"password":"fixture-secret"',
      '[note] {"password":"fixture-secret"}',
      '[note] "password": "fixture-secret"',
      '[note] "password"="fixture-secret"',
      '[note] {"password" /* comment */: "fixture-secret"}',
      String.raw`[note] {\"api_key\":\"fixture-secret\"}`,
      String.raw`[note] "\u0070assword": "fixture-secret"`,
    ]) {
      expect(captureDiagnosticValue({ prose }, 500_000, omitted)).toEqual({
        unavailable: 'Diagnostic content exceeded capture limits or could not be safely decoded.',
      });
    }
    expect(omitted).toHaveBeenCalledTimes(8);
    const h = await harness();
    h.settings.policy.autonomousActorIds = [];
    fixtureTransport = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        expect(url).toBe('https://api.typesafe.ai/v1/systemone');
        expect(new Headers(init.headers).get('authorization')).toBe('Bearer fixture-private-key');
        return Response.json({
          model: 'jev-1.13.0',
          answers: {
            route: { type: 'choice', choice: 'native', probabilities: { native: 1, unknown: 0 } },
          },
          usage: { input_tokens: 100, output_tokens: 1 },
        });
      }),
    );
    const control = h.runtime.service.cognitionControl!;
    const log = new IntelligenceLog(h.runtime.service.store, (attemptId, call) =>
      control.emit({ kind: 'wire', attemptId, exchanges: call?.exchanges }),
    );
    cleanup.unshift(() => log.close());
    const client = log.wrap(
      createAiClient({ jev: { apiKey: 'fixture-private-key' }, network: log.network }),
    );
    await h.controller.controlRun({ commandId: randomUUID(), action: 'run' }, h.scope);
    const id = `wire-${randomUUID()}`;
    const request = {
      state: { observation: '[observation] Only the selected fixture source.' },
      questions: {
        route: {
          type: 'choice' as const,
          instructions: 'Choose the supplied native option.',
          criteria: { native: 'Supported fixture option', unknown: 'Unknown fixture option' },
        },
      },
    };
    const prepared = await control.prepare(
      {
        id,
        rootId: id,
        actorId: NPC_ID,
        purpose: 'Wire capture fixture',
        generation: h.runtime.service.generation,
        responseBoundBytes: 500_000,
        wireBoundBytes: 1_000_000,
        current: () => h.runtime.service.assertScope(h.scope, 'create'),
      },
      { kind: 'judge', request },
    );
    const result = await control.dispatch(prepared.stage, prepared.input, () =>
      client.judge({ ...prepared.input.request, requestId: id }),
    );
    expect(result.outcome, JSON.stringify(result)).toBe('value');
    await h.controller.safeHold('Fixture exchange settled.');
    const stage = (
      await h.records.pageRecords('stage', {
        runId: h.controller.current!.id,
        sourceId: id,
        limit: 1,
      })
    ).items[0]!;
    const view = await h.controller.stage(stage.id);
    const wire = view!.artifacts.find((artifact) => artifact.kind === 'wire');
    expect(wire).toBeDefined();
    const text = Buffer.from((await h.records.readArtifactChunk(wire!.id)).bytes).toString('utf8');
    expect(text).toContain('[observation] Only the selected fixture source.');
    expect(text).toContain('"httpStatus":200');
    expect(text).not.toContain('fixture-private-key');
    expect(text).not.toContain('authorization');
    expect((await h.records.usage()).reservedBytes).toBe(h.baselineReservedBytes);
  }, 60_000);
});
