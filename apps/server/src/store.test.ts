import { stockedCamp } from '../../../tests/fixtures/world.js';
import { readConfig, testRepository } from '../../../tests/fixtures/database.js';
import { entityGet, freezeWorld, updateWorld, PLAYER_ID } from '@open-legend/domain';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { createDisposableDatabase } from '../../../scripts/disposable-postgres.mjs';
import { PostgresDatabase } from './postgres.js';
import { CognitionLabRecords } from './cognition-lab-records.js';
import { JournalWorker } from './journal-worker-client.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createItemLot, executeCommand, inventoryFor } from '@open-legend/domain';
import type { AiReceipt } from '@open-legend/ai';
import { SqlGameRepository, type JobRecord, type SavedWorld } from './store.js';
import { DecisionLedger, levelLimits } from './cognition-budget.js';
import { validateCurrentWorldState } from './upgrade-world.js';

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
  return { world: freezeWorld(stockedCamp(73)), speed: 1, manuallyPaused: false };
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
  it('retains operational Lab receipts while pending world materialization still fences canonical and mixed work', async () => {
    const database = await createDisposableDatabase(process.env['OPENLEGEND_TEST_DATABASE_URL']);
    const raw = new PostgresDatabase(database.url);
    const directory = diskPath();
    const store = new SqlGameRepository(directory, raw);
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const apply = JournalWorker.prototype.apply;
    let application: ReturnType<typeof vi.spyOn> | undefined;
    try {
      await store.ready;
      const initial = save();
      const revision = await store.commit(0, initial);
      const records = new CognitionLabRecords(store.operationalDatabase, directory);
      await records.ready;
      application = vi.spyOn(JournalWorker.prototype, 'apply').mockImplementation(async function (
        this: JournalWorker,
        ...args
      ) {
        await held;
        return apply.apply(this, args);
      });
      const next = {
        ...initial,
        world: freezeWorld({ ...initial.world, simTime: initial.world.simTime + 1 }),
      };
      const committed = await store.commit(revision, next);
      await expect.poll(() => application!.mock.calls.length).toBe(1);
      const head = await raw
        .prepare('SELECT revision,applied_revision FROM world_head WHERE id=1')
        .get();
      expect(Number(head!['revision'])).toBe(committed);
      expect(Number(head!['applied_revision'])).toBe(revision);

      // A provider-acceptance callback must durably retain the same operation
      // identity without waiting for unrelated world-table application.
      const commandId = randomUUID();
      const intention = { kind: 'retain-original-provider-identity' };
      const receipt = await records.beginOperation(commandId, intention);
      expect(receipt.claimed).toBe(true);
      await records.finishOperation(commandId, 'completed', { providerRunId: randomUUID() });
      expect((await records.receipt(commandId))?.state).toBe('completed');
      expect((await records.beginOperation(commandId, intention)).claimed).toBe(false);
      expect(
        Number(
          (await raw.prepare('SELECT applied_revision FROM world_head WHERE id=1').get())![
            'applied_revision'
          ],
        ),
      ).toBe(revision);

      const captured = {
        id: randomUUID(),
        kind: 'timeline' as const,
        name: 'Accepted provider identity',
        createdAt: new Date().toISOString(),
        summary: {},
        data: {},
      };
      await records.putRecord(captured);
      await records.putRecord({ ...captured, name: 'Retained original identity' });
      expect((await records.getRecord(captured.id))?.name).toBe('Retained original identity');

      let canonicalRead = false;
      const canonical = store.db
        .prepare('SELECT revision FROM world_head WHERE id=1')
        .get()
        .then((value) => {
          canonicalRead = true;
          return value;
        });
      let mixedRead = false;
      const joined = store.db
        .prepare(
          'SELECT h.revision FROM cognition_lab.receipts r CROSS JOIN world_head h WHERE r.command_id=? AND h.id=1',
        )
        .get(commandId)
        .then((value) => {
          mixedRead = true;
          return value;
        });
      let unknownRead = false;
      const unknown = store.db
        .prepare('SELECT 1 AS answer')
        .get()
        .then((value) => {
          unknownRead = true;
          return value;
        });
      let mixedEntered = false;
      const rollbackKey = 'operational-mixed-rollback';
      const mixed = store.db.transaction(async () => {
        mixedEntered = true;
        await store.operationalDatabase
          .prepare('INSERT INTO meta VALUES (?,?)')
          .run(rollbackKey, 'must roll back');
        await store.db.prepare('SELECT revision FROM world_head WHERE id=1').get();
        throw new Error('roll back mixed transaction');
      });
      const mixedResult = mixed.catch((error: unknown) => error);
      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(canonicalRead).toBe(false);
      expect(mixedEntered).toBe(false);
      expect(mixedRead).toBe(false);
      expect(unknownRead).toBe(false);
      release();
      expect(Number((await canonical)!['revision'])).toBe(committed);
      expect(Number((await joined)!['revision'])).toBe(committed);
      expect((await unknown)!['answer']).toBe(1);
      expect(await mixedResult).toEqual(new Error('roll back mixed transaction'));
      expect(mixedEntered).toBe(true);
      expect(
        await raw.prepare('SELECT value FROM meta WHERE key=?').get(rollbackKey),
      ).toBeUndefined();
    } finally {
      release();
      application?.mockRestore();
      await store.close();
      await database.close();
    }
  }, 30_000);

  it('persists state and command receipts together across close/reopen', async () => {
    const path = diskPath();
    let store = await open(path);
    const initial = save();
    const foodId = 'fixture-food';
    initial.world = freezeWorld(
      updateWorld(initial.world, (world) => {
        entityGet(world.entities, PLAYER_ID)!.actor!.body!.conditions = {
          wetness: 12.5,
          burning: 3,
        };
        // Persistence coverage must not depend on the bundled world's starting inventory.
        createItemLot(world, PLAYER_ID, 'berries', 3, foodId);
      }),
    );
    expect(await store.load()).toBeNull();
    const revision = await store.commit(0, initial);
    const command = { id: 'eat-once', actorId: PLAYER_ID, type: 'eat' as const, itemId: foodId };
    const changed = freezeWorld(executeCommand(initial.world, command).world);
    const savedRevision = await store.commit(revision, { ...initial, world: changed, speed: 3 });
    await close(store);
    store = await open(path);
    expect(await store.load()).toEqual({
      revision: savedRevision,
      state: { ...initial, world: changed, speed: 3 },
    });
    const restored = (await store.load())!.state.world;
    expect(entityGet(restored.entities, PLAYER_ID)!.actor!.body!.conditions).toEqual({
      wetness: 12.5,
      burning: 3,
    });
    for (const conditions of [
      { wetness: 0 },
      { burning: 0 },
      { wetness: 0, burning: 0, unsupported: 1 },
      { wetness: -1, burning: 0 },
      { wetness: 0, burning: 101 },
      { wetness: NaN, burning: 0 },
    ]) {
      const malformed = structuredClone(restored);
      Reflect.set(entityGet(malformed.entities, PLAYER_ID)!.actor!.body!, 'conditions', conditions);
      expect(() => validateCurrentWorldState(malformed)).toThrow('Invalid body conditions.');
    }
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
  it('admits an exact zero-fee attempt once and settles its zero charge without accepting negatives', async () => {
    const store = await open();
    await expect(store.reserve('negative-fee', 'openai', -0.000001, 0)).rejects.toThrow();
    expect(await store.reserve('zero-fee', 'openai', 0, 0)).toBe(true);
    await expect(store.reserve('zero-fee', 'openai', 0, 0)).rejects.toThrow(
      'Attempt already admitted',
    );
    const observed = receipt('zero-fee', { estimatedCostUsd: 0 });
    await store.settle('zero-fee', observed);
    await store.settle('zero-fee', observed);
    expect(await store.attemptReceipt('zero-fee')).toMatchObject(observed);
    expect((await store.usage(0)).budget).toMatchObject({
      limitUsd: 0,
      spentUsd: 0,
      reservedUsd: 0,
    });
    expect((await store.usage(0)).usage.llmCalls).toBe(1);
  });
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
    const path = diskPath();
    let store = await open(path);
    const original = save();
    let revision = await store.commit(0, original);
    await store.reserve('paid', 'openai', 0.08, 1);
    await store.settle('paid', receipt('paid'));
    revision = await store.commit(revision, {
      ...original,
      world: freezeWorld(
        updateWorld(original.world, (world) => {
          world.simTime = 4000;
        }),
      ),
    });
    revision = await store.commit(revision, original);
    expect((await store.load())!.state.world.simTime).toBe(0);
    expect((await store.usage(1)).budget.spentUsd).toBe(0.03);
    await expect(async () => await store.reserve('paid', 'openai', 0.08, 1)).rejects.toThrow(
      /already admitted/,
    );
    expect(
      await store.reserve('uncertain-paid', 'openai', 0.08, 1, PLAYER_ID, undefined, undefined, {
        rootJobId: 'original-uncertain-root',
        category: 'level',
        level: 1,
        stage: 'primary',
        executionClass: 'primary',
      }),
    ).toBe(true);
    await store.markDecisionDispatch('uncertain-paid');
    await store.settle(
      'uncertain-paid',
      receipt('uncertain-paid', {
        completionUncertain: true,
        providerRequestId: 'original-external-run',
        estimatedCostUsd: undefined,
        usage: undefined,
      }),
    );
    const journal = { body: { input: 'original native input' }, idempotencyKey: 'original-key' };
    await store.putIntegration('macrofold:original-admission', journal);
    await store.putJob(job('original-operational-job'));
    const finance = await store.attemptReceipt('uncertain-paid');
    const slots = await store.occupiedDecisionSlots();
    const operationalJob = await store.getJob('original-operational-job');
    const fresh: SavedWorld = {
      world: freezeWorld(stockedCamp(74)),
      speed: 1,
      manuallyPaused: false,
    };
    const adopted = (await store.records.head())!;
    await expect(store.replaceDevelopmentWorld(adopted, fresh)).rejects.toThrow(/unopened/);

    // Model an incompatible development definition without loading it as current.
    // Replacement must never decode or repair the old native host pin.
    const incompatible = structuredClone(original);
    incompatible.world.moduleManifest.activityHosts[0] = {
      ...incompatible.world.moduleManifest.activityHosts[0]!,
      digest: 'incompatible-development-host',
    };
    freezeWorld(incompatible.world);
    await store.commit(revision, incompatible);
    await close(store);
    store = await open(path);
    await expect(store.load()).rejects.toThrow(/trusted activity host/);
    const head = (await store.records.head())!;
    await expect(
      store.replaceDevelopmentWorld({ ...head, revision: head.revision + 1 }, fresh),
    ).rejects.toThrow(/Save conflict/);
    const invalidFresh = structuredClone(fresh);
    invalidFresh.world.moduleManifest.activityHosts[0] = {
      ...invalidFresh.world.moduleManifest.activityHosts[0]!,
      digest: 'invalid-new-host',
    };
    freezeWorld(invalidFresh.world);
    await expect(store.replaceDevelopmentWorld(head, invalidFresh)).rejects.toThrow(
      /trusted activity host/,
    );
    expect(await store.records.head()).toEqual(head);
    await store.replaceDevelopmentWorld(head, fresh);
    expect((await store.load())!.state.world.id).toBe(fresh.world.id);
    await close(store);
    store = await open(path);
    validateCurrentWorldState((await store.load())!.state.world);
    expect((await store.records.head())!.worldId).toBe(fresh.world.id);
    expect(await store.attemptReceipt('uncertain-paid')).toEqual(finance);
    expect(await store.occupiedDecisionSlots()).toEqual(slots);
    expect(await store.getIntegration('macrofold:original-admission')).toEqual(journal);
    expect(await store.getJob('original-operational-job')).toEqual(operationalJob);
    expect((await store.usage(1)).budget.spentUsd).toBe(0.11);
    await expect(store.reserve('paid', 'openai', 0.08, 1)).rejects.toThrow(/already admitted/);
    await expect(store.reserve('uncertain-paid', 'openai', 0.08, 1)).rejects.toThrow(
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
  it('retains larger uncertain charges across restart and both spending caps', async () => {
    const path = diskPath();
    let store = await open(path);
    const episode = { id: 'authoring-episode', limitUsd: 0.04 };
    expect(
      await store.reserve('known-charge', 'openai', 0.02, 0.04, 'actor', undefined, episode),
    ).toBe(true);
    const observed = receipt('known-charge', {
      providerRequestId: 'same-run',
      macrofoldBillingMode: 'managed',
      completionUncertain: true,
      estimatedCostUsd: 0.0300001,
    });
    await store.settle('known-charge', {
      ...observed,
      estimatedCostUsd: undefined,
      providerRequestId: undefined,
      macrofoldBillingMode: undefined,
    });
    await store.settle('known-charge', { ...observed, estimatedCostUsd: undefined });
    expect((await store.attemptReceipt('known-charge'))?.providerRequestId).toBe('same-run');
    for (const estimatedCostUsd of [0.01, 0.015]) {
      await store.settle('known-charge', { ...observed, estimatedCostUsd });
      expect((await store.attemptReceipt('known-charge'))?.estimatedCostUsd).toBe(estimatedCostUsd);
    }
    await store.settle('known-charge', observed);
    await close(store);
    store = await open(path);
    await store.recoverInterruptedWork();
    for (const estimatedCostUsd of [undefined, 0.01, NaN]) {
      await store.settle('known-charge', { ...observed, estimatedCostUsd });
      expect((await store.usage(0.04)).budget.spentUsd).toBe(0.030001);
      expect(await store.attemptBudget(episode.id)).toMatchObject({
        spentUsd: 0.030001,
        uncertainUsd: 0.030001,
      });
    }
    expect(await store.attemptReceipt('known-charge')).toMatchObject({
      completionUncertain: true,
      estimatedCostUsd: 0.0300001,
    });
    // Isolate the monthly actor cap from the episode cap: each uses this same hold.
    expect(await store.reserve('monthly-over', 'openai', 0.01, 0.04, 'actor')).toBe(false);
    expect(
      await store.reserve('episode-over', 'openai', 0.01, 1, 'actor', undefined, episode),
    ).toBe(false);
    expect(await store.reserve('fits', 'openai', 0.009999, 0.04, 'actor', undefined, episode)).toBe(
      true,
    );
    await expect(
      store.settle('known-charge', { ...observed, providerRequestId: 'other-run' }),
    ).rejects.toThrow(/external request identity/);
    await expect(store.settle('known-charge', { ...observed, dispatched: false })).rejects.toThrow(
      /retract dispatch/,
    );
    for (const macrofoldBillingMode of [undefined, 'byok'] as const)
      await expect(
        store.settle('known-charge', { ...observed, macrofoldBillingMode }),
      ).rejects.toThrow(/original billing mode/);
    // Definitive billing still replaces the conservative hold and is immutable.
    await store.settle('known-charge', {
      ...observed,
      completionUncertain: false,
      estimatedCostUsd: 0.025,
    });
    await store.settle('known-charge', { ...observed, estimatedCostUsd: 0.09 });
    expect(await store.attemptBudget(episode.id)).toMatchObject({
      spentUsd: 0.025,
      reservedUsd: 0.009999,
      uncertainUsd: 0,
    });

    const confirmed = { id: 'confirmed-episode', limitUsd: 0.04 };
    expect(
      await store.reserve('known-completion', 'openai', 0.04, 1, 'other', undefined, confirmed),
    ).toBe(true);
    await store.settle(
      'known-completion',
      receipt('known-completion', {
        providerRequestId: 'other-run',
        completionUncertain: true,
        estimatedCostUsd: 0.03,
      }),
    );
    // Later completion proof combines with the known price, not with its larger reserve.
    await store.settle(
      'known-completion',
      receipt('known-completion', {
        providerRequestId: 'other-run',
        estimatedCostUsd: undefined,
      }),
    );
    expect(await store.attemptReceipt('known-completion')).toMatchObject({
      completionUncertain: false,
      estimatedCostUsd: 0.03,
    });
    expect(await store.attemptBudget(confirmed.id)).toMatchObject({
      spentUsd: 0.03,
      reservedUsd: 0,
      uncertainUsd: 0,
    });
  });
  it('keeps completed unpriced execution closed when stale uncertain billing arrives', async () => {
    const path = diskPath();
    let store = await open(path);
    const attemptId = 'completed-unpriced';
    const episode = { id: 'completed-unpriced-episode', limitUsd: 0.04 };
    expect(
      await store.reserve(attemptId, 'openai', 0.02, 0.04, 'actor', undefined, episode, {
        rootJobId: 'completed-unpriced-root',
        category: 'level',
        level: 1,
        stage: 'primary',
        executionClass: 'primary',
      }),
    ).toBe(true);
    expect(await store.markDecisionDispatch(attemptId)).toBe(true);
    expect(await store.occupiedDecisionSlots()).toEqual([{ attemptId, executionClass: 'primary' }]);
    const completed = receipt(attemptId, {
      providerRequestId: 'completed-run',
      estimatedCostUsd: undefined,
    });
    await store.settle(attemptId, completed);
    expect(await store.occupiedDecisionSlots()).toEqual([]);
    for (const estimatedCostUsd of [undefined, 0.01, 0.0300001]) {
      await store.settle(attemptId, {
        ...completed,
        completionUncertain: true,
        estimatedCostUsd,
      });
      expect(await store.attemptReceipt(attemptId)).toEqual(completed);
      expect(await store.occupiedDecisionSlots()).toEqual([]);
      expect(await store.attemptBudget(episode.id)).toMatchObject({
        spentUsd: estimatedCostUsd === 0.0300001 ? 0.030001 : 0.02,
        uncertainUsd: estimatedCostUsd === 0.0300001 ? 0.030001 : 0.02,
      });
    }
    await close(store);
    store = await open(path);
    await store.recoverInterruptedWork();
    for (const estimatedCostUsd of [undefined, 0.01, NaN]) {
      await store.settle(attemptId, {
        ...completed,
        completionUncertain: true,
        estimatedCostUsd,
      });
      expect(await store.attemptReceipt(attemptId)).toEqual(completed);
      expect(await store.occupiedDecisionSlots()).toEqual([]);
      expect(await store.attemptBudget(episode.id)).toMatchObject({
        spentUsd: 0.030001,
        reservedUsd: 0,
        uncertainUsd: 0.030001,
      });
    }
    expect((await store.usage(0.04)).budget.spentUsd).toBe(0.030001);
    expect(await store.reserve('monthly-over', 'openai', 0.01, 0.04, 'actor')).toBe(false);
    expect(
      await store.reserve('episode-over', 'openai', 0.01, 1, 'actor', undefined, episode),
    ).toBe(false);
    await expect(
      store.reserve(attemptId, 'openai', 0, 1, 'actor', undefined, episode),
    ).rejects.toThrow(/already admitted/);
    // Another completion-only result must not promote the stale provisional charge.
    await store.settle(attemptId, completed);
    expect(await store.attemptReceipt(attemptId)).toEqual(completed);
    expect(await store.attemptBudget(episode.id)).toMatchObject({
      spentUsd: 0.030001,
      uncertainUsd: 0.030001,
    });
    // Definitive billing replaces the conservative hold and remains immutable.
    await store.settle(attemptId, { ...completed, estimatedCostUsd: 0.025 });
    await store.settle(attemptId, {
      ...completed,
      completionUncertain: true,
      estimatedCostUsd: 0.09,
    });
    expect(await store.attemptReceipt(attemptId)).toEqual({
      ...completed,
      estimatedCostUsd: 0.025,
    });
    expect(await store.occupiedDecisionSlots()).toEqual([]);
    expect(await store.attemptBudget(episode.id)).toMatchObject({
      spentUsd: 0.025,
      reservedUsd: 0,
      uncertainUsd: 0,
    });
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

describe('decision spending summary', () => {
  it('retains a larger uncertain charge without changing per-level request admission', () => {
    const limits = levelLimits(readConfig());
    limits[1] = { ...limits[1], requestsPerDecision: 2, decisionUsd: 0.04 };
    const ledger = new DecisionLedger(limits);
    ledger.record({
      requestId: 'decision-charge',
      stage: 'selection',
      category: 'level',
      level: 1,
      provider: 'jev',
      size: { instructions: 0, context: 0, schema: 0 },
      reservedUsd: 0.02,
    });
    const observed = receipt('decision-charge', {
      providerRequestId: 'same-run',
      macrofoldBillingMode: 'managed',
      completionUncertain: true,
      estimatedCostUsd: 0.0300001,
    });
    ledger.settle('decision-charge', { ...observed, estimatedCostUsd: undefined });
    ledger.settle('decision-charge', observed);
    for (const estimatedCostUsd of [undefined, 0.01, NaN]) {
      ledger.settle('decision-charge', { ...observed, estimatedCostUsd });
      expect(ledger.summary().total).toMatchObject({ settledUsd: 0.030001, uncertain: true });
    }
    expect(ledger.admit('level', 1, 0.02)).toEqual({ ok: true });
    expect(() =>
      ledger.settle('decision-charge', { ...observed, requestId: 'other-attempt' }),
    ).toThrow(/identity mismatch/);
    expect(() =>
      ledger.settle('decision-charge', { ...observed, providerRequestId: 'other-run' }),
    ).toThrow(/external request identity/);
    expect(() => ledger.settle('decision-charge', { ...observed, dispatched: false })).toThrow(
      /retract dispatch/,
    );
    for (const macrofoldBillingMode of [undefined, 'byok'] as const)
      expect(() => ledger.settle('decision-charge', { ...observed, macrofoldBillingMode })).toThrow(
        /original billing mode/,
      );
    ledger.settle('decision-charge', {
      ...observed,
      completionUncertain: false,
      estimatedCostUsd: 0.025,
    });
    ledger.settle('decision-charge', { ...observed, estimatedCostUsd: 0.09 });
    expect(ledger.summary().total).toMatchObject({ settledUsd: 0.025, uncertain: false });
    ledger.record({
      requestId: 'known-completion',
      stage: 'selection',
      category: 'preparation',
      provider: 'jev',
      size: { instructions: 0, context: 0, schema: 0 },
      reservedUsd: 0.02,
    });
    ledger.settle(
      'known-completion',
      receipt('known-completion', {
        providerRequestId: 'other-run',
        completionUncertain: true,
        estimatedCostUsd: 0.01,
      }),
    );
    ledger.settle(
      'known-completion',
      receipt('known-completion', {
        providerRequestId: 'other-run',
        estimatedCostUsd: undefined,
      }),
    );
    expect(ledger.summary().total).toMatchObject({ settledUsd: 0.035, uncertain: false });
  });
});
