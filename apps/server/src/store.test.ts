import { stockedCamp } from '../../../tests/fixtures/world.js';
import { readConfig, testRepository } from '../../../tests/fixtures/database.js';
import { PLAYER_ID } from '@open-legend/domain';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createItemLot,
  createWorld,
  executeCommand,
  inventoryFor,
  entityGet,
  freezeWorld,
  updateWorld,
  defaultStoryPolicy,
  advanceWorld,
  setSpatialPosition,
  worldPosition,
  worldSupport,
} from '@open-legend/domain';
import { appendMemory } from '../../../packages/domain/src/events.js';
import { journalTableFamily } from './journal-admission.js';
import { RECORD_NODES } from './world-record-schema.js';
import { WorldJournal } from './world-journal.js';
import type { SqlDatabase } from './store.js';
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
  return { world: stockedCamp(73), speed: 1, manuallyPaused: false };
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
  it('defers current native movement and personal-source arrays, rejects malformed metadata, and recovers their exact bytes', async () => {
    const path = diskPath();
    let store = await open(path);
    const initial = save();
    // Story nomination deliberately keeps its synchronous transaction. This
    // storage fixture selects silent storytelling so only record admission varies.
    initial.world.storyPolicy = {
      ...(initial.world.storyPolicy ?? defaultStoryPolicy()),
      enabled: false,
    };
    initial.world.paused = false;
    const player = entityGet(initial.world.entities, PLAYER_ID)!;
    setSpatialPosition(
      initial.world,
      player,
      { ...worldPosition(player), x: worldPosition(player).x + 0.1 },
      worldSupport(player),
    );
    const from = { ...worldPosition(player) };
    createItemLot(initial.world, PLAYER_ID, 'berries', 1, 'journal-array-fixture');
    // First-use sensing belongs to the initial save; the deferred change then
    // exercises an ordinary already-running world rather than activation.
    initial.world = advanceWorld(initial.world, 0.25).world;
    freezeWorld(initial.world);
    const revision = await store.commit(0, initial);
    const inspected = executeCommand(initial.world, {
      id: 'array-journal-inspection',
      actorId: PLAYER_ID,
      type: 'inspect-inventory',
    });
    expect(inspected.outcome.ok).toBe(true);
    const walking = executeCommand(inspected.world, {
      id: 'placement-journal-walk',
      actorId: PLAYER_ID,
      type: 'move',
      destination: { ...from, x: from.x + 1, surfaceId: worldSupport(player)! },
    });
    expect(walking.outcome.ok).toBe(true);
    const moved = advanceWorld(walking.world, 0.25);
    expect(moved.outcome.ok).toBe(true);
    expect(worldPosition(entityGet(moved.world.entities, PLAYER_ID)!)).not.toEqual(from);
    const world = updateWorld(moved.world, (candidate) => {
      appendMemory(candidate, PLAYER_ID, {
        kind: 'episode',
        source: 'felt',
        summary: 'I noticed the changed view — a useful detail.',
        entityIds: [],
        importance: 4,
      });
    });
    freezeWorld(world);
    const candidate = { ...initial, world };
    const prepared = store.prepareCommit(revision, candidate, { after: world });
    const history = prepared.history!;
    expect(history).toBeDefined();
    const placement = entityGet(world.entities, PLAYER_ID)!.placement!;
    expect(placement.mode).toBe('world');
    if (placement.mode !== 'world') throw new Error('Expected a world-root placement.');
    expect(placement.motionContinuityRevision).toBeGreaterThanOrEqual(0);
    expect(placement.revision).toBeGreaterThan(placement.motionContinuityRevision!);
    for (const table of [
      'sim_placements',
      'mind_temporal_chunks',
      'mind_awareness',
      'mind_memories',
    ])
      expect(prepared.changes.writes.get(table)?.length).toBeGreaterThan(0);
    expect(
      journalTableFamily(initial.world, world, prepared.changes, history.changed),
      JSON.stringify({
        rows: prepared.changes.rows,
        writes: [...prepared.changes.writes].map(([table, rows]) => [table, rows.length]),
      }),
    ).toBe(true);
    for (const invalid of [
      -1,
      0.5,
      NaN,
      Number.MAX_SAFE_INTEGER + 1,
      placement.revision + 1,
      null,
    ]) {
      const malformed = structuredClone(world);
      Reflect.set(
        entityGet(malformed.entities, PLAYER_ID)!.placement!,
        'motionContinuityRevision',
        invalid,
      );
      expect(journalTableFamily(initial.world, malformed, prepared.changes, history.changed)).toBe(
        false,
      );
    }
    expect(store.history.canDeferAppend(world, history)).toBe(true);
    const columnIndex = (name: string) =>
      Object.keys(RECORD_NODES.get('mind_temporal_segments')!.columns!).indexOf(name);
    for (const [column, invalid] of [
      ['subjects', 'not-an-array'],
      ['subjects', [42]],
      ['subjects', ['forbidden\0text']],
      ['subjects', ['unpaired\ud800']],
      ['subjects', new Array(1)],
      ['receipt_ordinals', [1.5]],
      ['receipt_ordinals', [Number.MAX_SAFE_INTEGER + 1]],
      ['receipt_ordinals', ['1']],
      ['receipt_ordinals', new Array(1)],
      ['lookup_buckets', 'not-an-array'],
      ['lookup_buckets', [1.5]],
      ['lookup_buckets', [32768]],
      ['lookup_buckets', [-32769]],
      ['lookup_buckets', ['1']],
      ['lookup_buckets', new Array(1)],
    ] as const) {
      const changed = structuredClone(prepared.changes);
      changed.writes.get('mind_temporal_segments')![0]!.extra[columnIndex(column)] = invalid;
      expect(journalTableFamily(initial.world, world, changed, history.changed)).toBe(false);
    }
    const raw = Reflect.get(store, 'rawDb') as SqlDatabase;
    const journal = Reflect.get(store, 'journal') as WorldJournal<unknown>;
    // Hold application only, preserving the actual durable append and admission.
    const scheduling = vi.spyOn(journal, 'schedule').mockImplementation(() => undefined);
    try {
      const nextRevision = await store.commit(revision, candidate, undefined, undefined, {
        after: world,
        prepared,
      });
      const head = await raw
        .prepare('SELECT revision,applied_revision FROM world_head WHERE id=1')
        .get();
      expect(Number(head!['revision'])).toBe(nextRevision);
      expect(Number(head!['applied_revision'])).toBe(revision);
      expect(
        Number(
          (await raw.prepare('SELECT COUNT(*)AS count FROM world_change_journal').get())!['count'],
        ),
      ).toBe(1);
      // Losing transient preparation exercises the same decoded reconstruction used
      // at restart; it cannot rely on a retained world or prepared source objects.
      (Reflect.get(journal, 'online') as Map<number, unknown>).clear();
      await journal.flush();
      for (const table of [
        'sim_placements',
        'mind_temporal_chunks',
        'mind_awareness',
        'mind_memories',
      ])
        for (const row of prepared.changes.writes.get(table)!)
          expect(
            (await raw
              .prepare(`SELECT payload FROM ${table} WHERE world_id=? AND id=?`)
              .get(world.id, row.id))!['payload'],
          ).toBe(row.payload);
      expect(
        Number(
          (await raw.prepare('SELECT COUNT(*)AS count FROM world_change_journal').get())!['count'],
        ),
      ).toBe(0);
      await close(store);
      store = await open(path);
      expect(await store.load()).toEqual({ revision: nextRevision, state: candidate });
    } finally {
      scheduling.mockRestore();
    }
  });

  it('prepares exact frozen leaf bodies without mutating owners or hiding mutable edits', async () => {
    const store = await open();
    await store.ready;
    const initial = save();
    const original = JSON.stringify(initial);
    const reference = store.records.prepare(undefined, JSON.parse(original));
    freezeWorld(initial.world);
    expect(store.records.prepare(undefined, initial)).toEqual(reference);
    expect(JSON.stringify(initial)).toBe(original);

    const builder: SavedWorld = JSON.parse(original);
    const attributes = entityGet(builder.world.entities, PLAYER_ID)!.actor!.attributes!;
    const [name, attribute] = Object.entries(attributes).find(
      ([, value]) => typeof value.value === 'number',
    )!;
    if (typeof attribute.value !== 'number') throw new Error('Expected a numeric fixture meter.');
    const source = JSON.stringify(['world', 'entities', PLAYER_ID, 'actor', 'attributes', name]);
    const payload = () => {
      const before = JSON.stringify(builder);
      const changed = store.records.prepare(initial, builder);
      expect(JSON.stringify(builder)).toBe(before);
      return changed.writes.get('sim_actor_attributes')!.find((row) => row.id === source)!.payload;
    };
    attribute.value++;
    attribute.revision++;
    expect(JSON.parse(payload())).toEqual(attribute);
    attribute.value++;
    attribute.revision++;
    const mutablePayload = payload();
    expect(JSON.parse(mutablePayload)).toEqual(attribute);
    freezeWorld(builder.world);
    expect(payload()).toBe(mutablePayload);
    expect(payload()).toBe(mutablePayload);
  });
  it('persists state and command receipts together across close/reopen', async () => {
    const path = diskPath();
    let store = await open(path);
    const initial = save();
    entityGet(initial.world.entities, PLAYER_ID)!.actor!.body!.conditions = {
      wetness: 12.5,
      burning: 3,
    };
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
