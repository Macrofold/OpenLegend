import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AiResult, GenerateRequest } from '@open-legend/ai';
import type { GameRepository } from './store.js';
import {
  CognitionRuntimeControl,
  applyGenerationInput,
  type CognitionStageContext,
} from './cognition-runtime-control.js';
import { CognitionExecution } from './cognition-execution.js';
import { DECISION_LIMITS } from './decision-state.js';

const input = { kind: 'judge' as const, request: { state: { text: 'Original' }, questions: {} } };
const context = (signal?: AbortSignal): CognitionStageContext => ({
  id: 'attempt',
  rootId: 'job',
  actorId: 'actor',
  purpose: 'routing',
  generation: 'generation',
  signal,
  current: () => {},
});
function result(): AiResult<null> {
  return {
    outcome: 'value',
    value: null,
    receipt: {
      requestId: 'attempt',
      provider: 'jev',
      requestedModel: 'fixture',
      model: 'fixture',
      modelVersionStatus: 'reported',
      contextDigest: 'fixture',
      startedAt: '',
      completedAt: '',
      latencyMs: 0,
      dispatched: true,
      completionUncertain: false,
      estimatedCostUsd: 0,
    },
  };
}
const turn = () => new Promise<void>((resolve) => setImmediate(resolve));
function repository(
  occupied: { attemptId: string; executionClass: 'primary' | 'background' }[] = [],
) {
  const settlements = new Set<() => void>();
  const store = {
    occupiedDecisionSlots: vi.fn(async () => occupied),
    onSettlement: (listener: () => void) => {
      settlements.add(listener);
      return () => settlements.delete(listener);
    },
  } as unknown as GameRepository;
  return { store, occupied, settlements };
}
const close: (() => void | Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of close.splice(0)) await cleanup();
});

describe('prepared generation transport', () => {
  const native: Omit<GenerateRequest, 'requestId' | 'signal'> = {
    task: 'npc_response',
    instructions: 'Return a response.',
    context: 'Original',
    schema: { type: 'object' },
    maxOutputTokens: 1024,
    deadlineMs: 12345,
    actorScope: 'actor',
    macrofoldDeployment: {
      workspaceId: '11111111-1111-4111-8111-111111111111',
      modelBinding: {
        deployment_id: '22222222-2222-4222-8222-222222222222',
        deployment_revision_id: '33333333-3333-4333-8333-333333333333',
      },
      chatTemplateKwargs: { enable_thinking: false },
    },
  };
  const model = `deployment:${native.macrofoldDeployment!.modelBinding.deployment_id}`;
  it.each([
    { allowance: undefined, execution: 'fast' as const, expected: 1024 },
    { allowance: 4096, execution: 'fast' as const, expected: 4096 },
    { allowance: 512, execution: 'complex' as const, expected: 512 },
    { allowance: 4096, execution: 'full' as const, expected: 1024 },
  ])(
    'captures the explicit $execution experiment allowance $allowance',
    async ({ allowance, execution, expected }) => {
      const control = new CognitionRuntimeControl();
      close.push(() => control.close());
      control.setSettings({ maxOutputTokens: allowance });
      const pending = control.prepare(
        { ...context(), protectedModel: model },
        { kind: 'generate', request: { ...native, execution } },
      );
      await turn();
      const held = control.prepared[0]!;
      expect(held.original).toMatchObject({
        kind: 'generate',
        request: { maxOutputTokens: expected, execution },
      });
      control.submit(held.handle);
      await pending;
      expect(native.maxOutputTokens).toBe(1024);
    },
  );
  it('reapplies one held edit without losing the trusted deployment, pin or native template options', async () => {
    const control = new CognitionRuntimeControl();
    close.push(() => control.close());
    const pending = control.prepare(
      { ...context(), protectedModel: model },
      { kind: 'generate', request: native },
    );
    await turn();
    const held = control.prepared[0]!;
    expect(held.original.kind).toBe('generate');
    if (held.original.kind !== 'generate') return;
    expect(held.original.request).not.toHaveProperty('macrofoldDeployment');
    control.submit(held.handle, {
      kind: 'generate',
      request: { ...held.original.request, context: 'Edited', reasoningEffort: 'high' },
    });
    const selected = await pending;
    if (selected.input.kind !== 'generate') throw new Error('Expected generation input.');
    const applied = applyGenerationInput(native, selected.input.request);
    expect(applied).toMatchObject({
      context: 'Edited',
      maxOutputTokens: 1024,
      deadlineMs: 12345,
      actorScope: 'actor',
    });
    expect(applied.macrofoldDeployment).toBe(native.macrofoldDeployment);
    expect(applied.macrofoldDeployment?.chatTemplateKwargs).toEqual({ enable_thinking: false });
    expect(applied.model).toBeUndefined();
    expect(applied.reasoningEffort).toBeUndefined();
    expect(native.context).toBe('Original');
  });
  it('rejects a changed native identity and a deployment label without a trusted binding', () => {
    const edited = {
      task: native.task,
      instructions: native.instructions,
      context: 'Edited',
      schema: native.schema,
      model: 'deployment:44444444-4444-4444-8444-444444444444',
    };
    expect(() => applyGenerationInput(native, edited)).toThrow('deployment model changed');
    const { macrofoldDeployment: _target, ...direct } = native;
    expect(() => applyGenerationInput(direct, { ...edited, model })).toThrow(
      'installed model settings',
    );
  });
  it('preserves ordinary direct-model edits and the original execution controls', () => {
    const { macrofoldDeployment: _target, ...direct } = native;
    const applied = applyGenerationInput(
      { ...direct, model: 'direct-original', reasoningEffort: 'low' },
      {
        task: native.task,
        instructions: 'Edited instructions.',
        context: 'Edited',
        schema: native.schema,
        model: 'direct-selected',
        reasoningEffort: 'high',
        maxOutputTokens: 512,
      },
    );
    expect(applied).toMatchObject({
      model: 'direct-selected',
      reasoningEffort: 'high',
      maxOutputTokens: 512,
      instructions: 'Edited instructions.',
      context: 'Edited',
      deadlineMs: 12345,
      actorScope: 'actor',
    });
    expect(applied.macrofoldDeployment).toBeUndefined();
  });
});

describe('scoped cognition holds', () => {
  it('holds before execution, preserves original inputs and consumes a replacement exactly once', async () => {
    const control = new CognitionRuntimeControl();
    close.push(() => control.close());
    const restoreTiming = vi.fn();
    const holdTiming = vi.fn(() => restoreTiming);
    const preparation = control.prepare({ ...context(), holdTiming }, input);
    await turn();
    expect(control.activeCalls).toBe(0);
    expect(control.prepared).toHaveLength(1);
    const held = control.prepared[0]!;
    expect(holdTiming).toHaveBeenCalledOnce();
    const edited = {
      kind: 'judge' as const,
      request: { state: { text: 'Edited' }, questions: {} },
    };
    control.submit(held.handle, edited);
    const prepared = await preparation;
    expect(prepared.input).toEqual(edited);
    expect(held.original).toEqual(input);
    expect(restoreTiming).toHaveBeenCalledOnce();
    const provider = vi.fn(async () => result());
    await control.dispatch(prepared.stage, provider);
    expect(control.submit(held.handle)).toBe(held);
    expect(provider).toHaveBeenCalledOnce();
    expect(control.activeCalls).toBe(0);
  });

  it('rejects already aborted and invalidated waits, so close never depends on a UI Continue', async () => {
    const control = new CognitionRuntimeControl();
    close.push(() => control.close());
    const abort = new AbortController();
    abort.abort();
    await expect(control.prepare(context(abort.signal), input)).rejects.toThrow('cancelled');
    const waiting = control.prepare(context(), input);
    const rejected = expect(waiting).rejects.toThrow('scenario changed');
    await turn();
    control.invalidate();
    await rejected;
    expect(control.prepared).toHaveLength(0);
    const pending = control.prepare(context(), input);
    const closed = expect(pending).rejects.toThrow('closed');
    await turn();
    control.close();
    await closed;
  });

  it('does not expose protected execution controls in editable generation input', async () => {
    const control = new CognitionRuntimeControl();
    close.push(() => control.close());
    control.resume();
    const request = {
      requestId: 'private-attempt',
      signal: new AbortController().signal,
      actorScope: 'private-body',
      deadlineMs: 999,
      onProgress: () => {},
      task: 'fixture',
      instructions: 'Instructions',
      context: { text: 'Context' },
      schema: {},
    };
    const prepared = await control.prepare(context(), { kind: 'generate', request });
    expect(prepared.stage.original.request).toEqual({
      task: 'fixture',
      instructions: 'Instructions',
      context: { text: 'Context' },
      schema: {},
    });
  });

  it('settles dispatched work while retaining an undispatched continuation', async () => {
    const control = new CognitionRuntimeControl();
    close.push(() => control.close());
    control.resume();
    const prepared = await control.prepare(context(), input);
    let finish!: () => void;
    const provider = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const call = control.dispatch(prepared.stage, async () => {
      await provider;
      return result();
    });
    await turn();
    control.hold();
    const continuation = control.prepare({ ...context(), id: 'later' }, input);
    const cancelled = expect(continuation).rejects.toThrow('stopped');
    let settled = false;
    const settling = control.settle().then(() => {
      settled = true;
    });
    await turn();
    expect(settled).toBe(false);
    finish();
    await call;
    await settling;
    expect(control.prepared).toHaveLength(1);
    control.stop();
    await cancelled;
  });
});

describe('one host inference pool', () => {
  it('recovers both configured repositories before any dispatch and preserves matching-store uncertainty', async () => {
    const game = repository([{ attemptId: 'same', executionClass: 'primary' }]);
    const lab = repository([{ attemptId: 'same', executionClass: 'background' }]);
    let recovered!: (value: typeof lab.occupied) => void;
    const recovering = new Promise<typeof lab.occupied>((resolve) => {
      recovered = resolve;
    });
    lab.store.occupiedDecisionSlots = vi.fn(() => recovering);
    const host = new CognitionExecution(game.store);
    close.push(() => host.close());
    const labScope = host.register(lab.store);
    let ready = false;
    const admission = host.primaryAvailable(true).then((value) => {
      ready = true;
      return value;
    });
    await turn();
    expect(ready).toBe(false);
    recovered(lab.occupied);
    await admission;
    expect(host.snapshot().primary).toBe('unknown');
    expect(host.primaryCapacityReason()).toBeUndefined();
    // One occupied background position does not exhaust urgent capacity.
    expect(host.primaryCapacityReason(true)).toBeUndefined();
    game.occupied.splice(0);
    await host.reconcile(game.store);
    expect(host.snapshot().primary).toBe('available');
    expect(host.primaryCapacityReason()).toBeUndefined();
    expect(host.snapshot().background).toBe('unknown');
    await labScope.close();
    expect(host.snapshot().background).toBe('unknown');
  });

  it('borrows one existing background position only after uncertain primary work releases locally', async () => {
    const game = repository(),
      lab = repository();
    const control = new CognitionRuntimeControl();
    const host = new CognitionExecution(game.store);
    const labScope = host.register(lab.store, control);
    close.push(async () => {
      control.close();
      await host.close();
    });
    const original = (await host.primary())!;
    expect(await host.requestOnly()).toBeUndefined();
    original.uncertain('original');
    game.occupied.push({ attemptId: 'original', executionClass: 'primary' });
    expect(await host.primaryAvailable()).toBe(false);
    expect(await host.primary()).toBeUndefined();
    original.release();
    expect(await host.primaryAvailable()).toBe(true);
    expect(await labScope.primary()).toBeUndefined(); // Native lab gate is held.
    const borrowed = (await labScope.requestOnly())!;
    expect(borrowed.executionClass).toBe('background');
    expect(host.snapshot().primary).toBe('unknown');
    expect(await host.primaryAvailable()).toBe(false);
    expect(await host.requestOnly()).toBeUndefined();
    expect(host.primaryCapacityReason()).toBe('Model capacity is occupied by an earlier request.');
    game.occupied.splice(0);
    await host.reconcile(game.store);
    expect(host.snapshot().primary).toBe('available');
    expect(await host.primary()).toBeUndefined(); // Settlement cannot multiply ordinary work.
    borrowed.uncertain('borrowed');
    lab.occupied.push({ attemptId: 'borrowed', executionClass: 'background' });
    borrowed.release();
    const next = (await host.primary())!;
    expect(next.executionClass).toBe('primary');
    next.release();
    expect(host.snapshot().background).toBe('unknown');
    await labScope.close();
    expect(host.snapshot().background).toBe('unknown');
  });

  it('counts recovered and newly uncertain borrowed work against the unchanged background bound', async () => {
    const game = repository([{ attemptId: 'original', executionClass: 'primary' }]);
    const host = new CognitionExecution(game.store);
    close.push(() => host.close());
    for (let index = 0; index < DECISION_LIMITS.backgroundExecutions; index++) {
      const borrowed = (await host.requestOnly())!;
      expect(borrowed.executionClass).toBe('background');
      const attemptId = `borrowed-${index}`;
      borrowed.uncertain(attemptId);
      game.occupied.push({ attemptId, executionClass: 'background' });
      borrowed.release();
    }
    expect(await host.primaryAvailable()).toBe(false);
    expect(await host.primary()).toBeUndefined();
    expect(await host.primary(true)).toBeUndefined();
    expect(await host.requestOnly()).toBeUndefined();
    expect(host.primaryCapacityReason()).toContain('completion is unconfirmed');
    const recovered = new CognitionExecution(game.store);
    close.push(() => recovered.close());
    expect(await recovered.requestOnly()).toBeUndefined();
    game.occupied.splice(1, 1);
    await recovered.reconcile(game.store);
    const freed = (await recovered.primary())!;
    expect(freed.executionClass).toBe('background');
    expect(await recovered.requestOnly()).toBeUndefined();
    freed.release();
    expect(game.occupied[0]).toEqual({ attemptId: 'original', executionClass: 'primary' });
  });

  it('held queue entries with identical native IDs do not block eligible game work or expire during human wait', async () => {
    let now = 10_000;
    const game = repository(),
      lab = repository();
    const control = new CognitionRuntimeControl(() => now);
    const host = new CognitionExecution(game.store, () => now);
    const labScope = host.register(lab.store, control);
    close.push(async () => {
      control.close();
      await host.close();
    });
    await host.ready;
    const labStart = vi.fn(async () => {}),
      gameStart = vi.fn(async () => {}),
      decline = vi.fn(async () => {});
    const entry = {
      id: 'shared:id',
      actorId: 'same:actor',
      kind: 'decision' as const,
      urgency: 1,
      eligibleAt: now,
      dispatchBy: now + 100,
      metadataBytes: 32,
      start: labStart,
      declined: decline,
    };
    expect(labScope.enqueue(entry)).toBe(true);
    expect(host.enqueue({ ...entry, start: gameStart })).toBe(true);
    await turn();
    expect(gameStart).toHaveBeenCalledOnce();
    expect(labStart).not.toHaveBeenCalled();
    now += 60_000;
    await turn();
    expect(decline).not.toHaveBeenCalled();
    control.resume();
    await turn();
    await labScope.idle();
    expect(labStart).toHaveBeenCalledOnce();
    expect(decline).not.toHaveBeenCalled();
  });
});
