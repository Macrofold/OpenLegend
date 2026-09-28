import { testRepository } from '../../../tests/fixtures/database.js';
import { PLAYER_ID } from '@open-legend/domain';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createItemLot, createWorld, executeCommand, inventoryFor } from '@open-legend/domain';
import type { AiReceipt } from '@open-legend/ai';
import { SqlGameRepository, type JobRecord, type SavedWorld } from './store.js';

const opened = new Set<SqlGameRepository>();
const directories: string[] = [];
async function open(path?: string): Promise<SqlGameRepository> {
  const store = await testRepository(path);
  opened.add(store);
  return store;
}
async function close(store: SqlGameRepository): Promise<void> {
  await store.close();
  opened.delete(store);
}
function diskPath(): string {
  const directory = mkdtempSync(join(tmpdir(), 'open-legend-store-test-'));
  directories.push(directory);
  return directory;
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
afterEach(async () => {
  for (const store of opened) await store.close();
  opened.clear();
  for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true });
  vi.useRealTimers();
});

describe('PostgreSQL committed world boundary', () => {
  it('persists state and command receipts together across close/reopen', async () => {
    const path = diskPath();
    let store = await open(path);
    const initial = save();
    // Persistence coverage must not depend on the bundled world's starting inventory.
    const foodId = createItemLot(initial.world, PLAYER_ID, 'berries', 3, 'fixture-food');
    expect(await store.load()).toBeNull();
    const revision = await store.commit(0, initial);
    const command = { id: 'eat-once', actorId: PLAYER_ID, type: 'eat' as const, itemId: foodId };
    const changed = executeCommand(initial.world, command).world;
    const savedRevision = await store.commit(revision, { ...initial, world: changed, speed: 3 });
    await close(store);
    store = await open(path);
    expect(await store.load()).toEqual({
      revision: savedRevision,
      state: { ...initial, world: changed, speed: 3 },
    });
    const restored = (await store.load())!.state.world;
    expect(executeCommand(restored, command).world).toBe(restored);
    expect(inventoryFor(restored, PLAYER_ID).find((item) => item.id === foodId)!.quantity).toBe(2);
  });
  it('rejects a second writer and rejects stale revisions on the active writer', async () => {
    const path = diskPath();
    const first = await open(path);
    await first.ready;
    const second = await open(path);
    await expect(second.ready).rejects.toThrow(/writer|owns/i);
    await close(second);
    const revision = await first.commit(0, save());
    const winning = { ...save(), speed: 8 };
    const nextRevision = await first.commit(revision, winning);
    await expect(first.commit(revision, { ...winning, speed: 3 })).rejects.toThrow(/conflict/i);
    expect(await first.load()).toEqual({ revision: nextRevision, state: winning });
    expect(await first.commit(nextRevision, winning)).toBe(nextRevision + 1);
  });
});

describe('durable AI allowances outside simulated time', () => {
  it('counts outstanding reservations against one ceiling and settles only once', async () => {
    const store = await open();
    expect(await store.reserve('jev-route', 'jev', 0.02, 0.1)).toBe(true);
    expect(await store.reserve('generation', 'openai', 0.08, 0.1)).toBe(true);
    expect(await store.reserve('over-ceiling', 'openai', 0.000001, 0.1)).toBe(false);
    expect((await store.usage(0.1)).budget).toMatchObject({
      limitUsd: 0.1,
      spentUsd: 0,
      reservedUsd: 0.1,
      estimated: true,
    });
    await expect(
      async () => await store.reserve('generation', 'openai', 0.08, 0.1),
    ).rejects.toThrow(/already admitted/i);
    await store.settle('generation', receipt('generation'));
    await store.settle('generation', receipt('generation'));
    expect((await store.usage(0.1)).budget.spentUsd).toBe(0.03);
    expect((await store.usage(0.1)).budget.reservedUsd).toBe(0.02);
    expect((await store.usage(0.1)).usage.llmCalls).toBe(1);
    expect(await store.reserve('fits-after-release', 'openai', 0.05, 0.1)).toBe(true);
  });
  it('releases an undispatched attempt and conservatively charges missing usage', async () => {
    const store = await open();
    await store.reserve('local-rejection', 'openai', 0.08, 1);
    await store.settle(
      'local-rejection',
      receipt('local-rejection', {
        dispatched: false,
        estimatedCostUsd: undefined,
        usage: undefined,
      }),
    );
    expect((await store.usage(1)).budget.spentUsd).toBe(0);
    expect((await store.usage(1)).usage.llmCalls).toBe(0);
    await store.reserve('missing-usage', 'openai', 0.08, 1);
    await store.settle(
      'missing-usage',
      receipt('missing-usage', { estimatedCostUsd: undefined, usage: undefined }),
    );
    expect((await store.usage(1)).budget.spentUsd).toBe(0.08);
    expect((await store.usage(1)).budget.reservedUsd).toBe(0);
  });
  it('does not erase paid usage when a world snapshot is restored', async () => {
    const store = await open();
    const original = save();
    let revision = await store.commit(0, original);
    await store.reserve('paid', 'openai', 0.08, 1);
    await store.settle('paid', receipt('paid'));
    revision = await store.commit(revision, {
      ...original,
      world: { ...original.world, simTime: 4000 },
    });
    await store.commit(revision, original);
    expect((await store.load())!.state.world.simTime).toBe(0);
    expect((await store.usage(1)).budget.spentUsd).toBe(0.03);
    await expect(async () => await store.reserve('paid', 'openai', 0.08, 1)).rejects.toThrow(
      /already admitted/,
    );
  });
  it('persists uncertain work after restart and fences duplicate dispatch', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-19T12:00:00Z'));
    const path = diskPath();
    let store = await open(path);
    await store.reserve('in-flight', 'openai', 0.08, 0.1);
    await store.putJob(job('in-flight'));
    await store.putJob(job('already-complete', 'completed'));
    await close(store);
    vi.setSystemTime(new Date('2026-09-20T12:00:00Z'));
    store = await open(path);
    await store.recoverInterruptedWork();
    await store.recoverInterruptedWork();
    expect((await store.getJob('in-flight'))!.status).toBe('stale');
    expect((await store.getJob('already-complete'))!.status).toBe('completed');
    expect((await store.usage(0.1)).budget).toMatchObject({
      limitUsd: 0.1,
      spentUsd: 0.08,
      reservedUsd: 0,
      estimated: true,
    });
    await expect(async () => await store.reserve('in-flight', 'openai', 0.08, 0.1)).rejects.toThrow(
      /already admitted/,
    );
    expect(await store.reserve('too-much', 'openai', 0.03, 0.1)).toBe(false);
  });
  it('reconciles a late definitive receipt after restart without spending twice', async () => {
    const store = await open();
    await store.reserve('late', 'openai', 0.08, 0.1);
    await store.recoverInterruptedWork();
    await store.settle('late', receipt('late', { estimatedCostUsd: 0.09 }));
    await store.settle('late', receipt('late', { estimatedCostUsd: 0.09 }));
    expect((await store.usage(0.1)).budget.spentUsd).toBe(0.09);
    expect((await store.usage(0.1)).usage.llmCalls).toBe(1);
    expect((await store.usage(0.1)).usage.inputTokens).toBe(1200);
    expect(await store.reserve('overspend', 'openai', 0.02, 0.1)).toBe(false);
  });
  it('retains immutable job request identity across status updates', async () => {
    const store = await open();
    const original = job('same-id', 'queued');
    await store.putJob(original);
    await store.putJob({ ...original, status: 'generating' });
    expect((await store.getJob(original.id))!.status).toBe('generating');
    await expect(
      async () => await store.putJob({ ...original, fingerprint: 'different-body' }),
    ).rejects.toThrow(/different input/);
    expect((await store.getJob(original.id))!.fingerprint).toBe(original.fingerprint);
  });
});
