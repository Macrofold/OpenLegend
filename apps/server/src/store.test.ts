import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWorld, executeCommand, inventoryFor } from '@open-legend/domain';
import type { AiReceipt } from '@open-legend/ai';
import { SqliteStore, type JobRecord, type SavedWorld } from './store.js';

const opened = new Set<SqliteStore>();
const directories: string[] = [];
function open(path = ':memory:'): SqliteStore {
  const store = new SqliteStore(path);
  opened.add(store);
  return store;
}
function close(store: SqliteStore): void {
  store.close();
  opened.delete(store);
}
function diskPath(): string {
  const directory = mkdtempSync(join(tmpdir(), 'open-legend-store-test-'));
  directories.push(directory);
  return join(directory, 'world.sqlite');
}
function save(): SavedWorld {
  return { world: createWorld(73), speed: 1, manuallyPaused: false };
}
function receipt(requestId: string, overrides: Partial<AiReceipt> = {}): AiReceipt {
  return {
    requestId,
    provider: 'openai',
    requestedModel: 'fixture-model',
    model: 'fixture-model',
    modelVersionStatus: 'reported',
    contextDigest: 'context-digest',
    startedAt: '2026-09-19T12:00:00.000Z',
    completedAt: '2026-09-19T12:00:00.100Z',
    latencyMs: 100,
    dispatched: true,
    completionUncertain: false,
    estimatedCostUsd: 0.03,
    usage: { inputTokens: 1200, outputTokens: 150 },
    ...overrides,
  };
}
function job(id: string, status: JobRecord['status'] = 'generating'): JobRecord {
  return {
    id,
    kind: 'invention',
    status,
    message: 'Waiting for a candidate.',
    fingerprint: `body-${id}`,
    createdAt: 1000,
    request: { text: 'Make a tool.' },
  };
}
afterEach(() => {
  for (const store of opened) store.close();
  opened.clear();
  for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true });
  vi.useRealTimers();
});

describe('SQLite committed world boundary', () => {
  it('persists state and command receipts together across close/reopen', () => {
    const path = diskPath();
    let store = open(path);
    const initial = save();
    expect(store.load()).toBeNull();
    const revision = store.commit(0, initial);
    const food = inventoryFor(initial.world, 'player').find(
      (item) => item.definitionId === 'berries',
    )!;
    const command = { id: 'eat-once', actorId: 'player', type: 'eat' as const, itemId: food.id };
    const changed = executeCommand(initial.world, command).world;
    const savedRevision = store.commit(revision, { ...initial, world: changed, speed: 3 });
    close(store);
    store = open(path);
    expect(store.load()).toEqual({
      revision: savedRevision,
      state: { ...initial, world: changed, speed: 3 },
    });
    const restored = store.load()!.state.world;
    expect(executeCommand(restored, command).world).toBe(restored);
    expect(
      inventoryFor(restored, 'player').find((item) => item.definitionId === 'berries')!.quantity,
    ).toBe(2);
  });
  it('rejects a stale writer without overwriting the winner and remains usable', () => {
    const path = diskPath();
    const first = open(path);
    const second = open(path);
    const revision = first.commit(0, save());
    const stale = second.load()!;
    const winning = { ...stale.state, speed: 8 };
    const nextRevision = first.commit(revision, winning);
    expect(() => second.commit(stale.revision, { ...stale.state, speed: 3 })).toThrow(/conflict/i);
    expect(second.load()).toEqual({ revision: nextRevision, state: winning });
    expect(second.commit(nextRevision, winning)).toBe(nextRevision + 1);
  });
  it('refuses to reinterpret an unsupported saved world schema', () => {
    const store = open();
    const unsupported = save();
    (unsupported.world as unknown as { schemaVersion: number }).schemaVersion = 2;
    store.commit(0, unsupported);
    expect(() => store.load()).toThrow(/Unsupported world schema/);
  });
});

describe('durable AI allowances outside simulated time', () => {
  it('counts outstanding reservations against one ceiling and settles only once', () => {
    const store = open();
    expect(store.reserve('jev-route', 'jev', 0.02, 0.1)).toBe(true);
    expect(store.reserve('generation', 'openai', 0.08, 0.1)).toBe(true);
    expect(store.reserve('over-ceiling', 'openai', 0.000001, 0.1)).toBe(false);
    expect(store.usage(0.1).budget).toEqual({
      limitUsd: 0.1,
      spentUsd: 0,
      reservedUsd: 0.1,
      estimated: true,
    });
    expect(() => store.reserve('generation', 'openai', 0.08, 0.1)).toThrow(/already admitted/i);
    store.settle('generation', receipt('generation'));
    store.settle('generation', receipt('generation'));
    expect(store.usage(0.1).budget.spentUsd).toBe(0.03);
    expect(store.usage(0.1).budget.reservedUsd).toBe(0.02);
    expect(store.usage(0.1).usage.llmCalls).toBe(1);
    expect(store.reserve('fits-after-release', 'openai', 0.05, 0.1)).toBe(true);
  });
  it('releases an undispatched attempt and conservatively charges missing usage', () => {
    const store = open();
    store.reserve('local-rejection', 'openai', 0.08, 1);
    store.settle(
      'local-rejection',
      receipt('local-rejection', {
        dispatched: false,
        estimatedCostUsd: undefined,
        usage: undefined,
      }),
    );
    expect(store.usage(1).budget.spentUsd).toBe(0);
    expect(store.usage(1).usage.llmCalls).toBe(0);
    store.reserve('missing-usage', 'openai', 0.08, 1);
    store.settle(
      'missing-usage',
      receipt('missing-usage', { estimatedCostUsd: undefined, usage: undefined }),
    );
    expect(store.usage(1).budget.spentUsd).toBe(0.08);
    expect(store.usage(1).budget.reservedUsd).toBe(0);
  });
  it('does not erase paid usage when a world snapshot is restored', () => {
    const store = open();
    const original = save();
    let revision = store.commit(0, original);
    store.reserve('paid', 'openai', 0.08, 1);
    store.settle('paid', receipt('paid'));
    revision = store.commit(revision, { ...original, world: { ...original.world, simTime: 4000 } });
    store.commit(revision, original);
    expect(store.load()!.state.world.simTime).toBe(0);
    expect(store.usage(1).budget.spentUsd).toBe(0.03);
    expect(() => store.reserve('paid', 'openai', 0.08, 1)).toThrow(/already admitted/);
  });
  it('persists uncertain work after restart and fences duplicate dispatch', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-19T12:00:00Z'));
    const path = diskPath();
    let store = open(path);
    store.reserve('in-flight', 'openai', 0.08, 0.1);
    store.putJob(job('in-flight'));
    store.putJob(job('already-complete', 'completed'));
    close(store);
    vi.setSystemTime(new Date('2026-09-20T12:00:00Z'));
    store = open(path);
    store.recoverInterruptedWork();
    store.recoverInterruptedWork();
    expect(store.getJob('in-flight')!.status).toBe('stale');
    expect(store.getJob('already-complete')!.status).toBe('completed');
    expect(store.usage(0.1).budget).toEqual({
      limitUsd: 0.1,
      spentUsd: 0.08,
      reservedUsd: 0,
      estimated: true,
    });
    expect(() => store.reserve('in-flight', 'openai', 0.08, 0.1)).toThrow(/already admitted/);
    expect(store.reserve('too-much', 'openai', 0.03, 0.1)).toBe(false);
  });
  it('reconciles a late definitive receipt after restart without spending twice', () => {
    const store = open();
    store.reserve('late', 'openai', 0.08, 0.1);
    store.recoverInterruptedWork();
    store.settle('late', receipt('late', { estimatedCostUsd: 0.09 }));
    store.settle('late', receipt('late', { estimatedCostUsd: 0.09 }));
    expect(store.usage(0.1).budget.spentUsd).toBe(0.09);
    expect(store.usage(0.1).usage.llmCalls).toBe(1);
    expect(store.usage(0.1).usage.inputTokens).toBe(1200);
    expect(store.reserve('overspend', 'openai', 0.02, 0.1)).toBe(false);
  });
  it('retains immutable job request identity across status updates', () => {
    const store = open();
    const original = job('same-id', 'queued');
    store.putJob(original);
    store.putJob({ ...original, status: 'generating' });
    expect(store.getJob(original.id)!.status).toBe('generating');
    expect(() => store.putJob({ ...original, fingerprint: 'different-body' })).toThrow(
      /different input/,
    );
    expect(store.getJob(original.id)!.fingerprint).toBe(original.fingerprint);
  });
});
