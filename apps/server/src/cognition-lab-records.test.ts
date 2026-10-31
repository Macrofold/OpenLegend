import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createDisposableDatabase } from '../../../scripts/disposable-postgres.mjs';
import { PostgresDatabase } from './postgres.js';
import { AuthorityError } from './authority.js';
import {
  CognitionLabRecords,
  LAB_STORAGE_DEFAULTS,
  type LabEvidenceGuard,
  type LabRecord,
} from './cognition-lab-records.js';

let database: Awaited<ReturnType<typeof createDisposableDatabase>>;
let db: PostgresDatabase;
let directory: string;
let records: CognitionLabRecords;
let guard: LabEvidenceGuard | undefined;
const directories: string[] = [];
const record = (kind: LabRecord['kind'], patch: Partial<LabRecord> = {}): LabRecord => ({
  id: randomUUID(),
  kind,
  name: kind,
  createdAt: '2026-10-24T23:00:00.000Z',
  summary: {},
  data: {},
  ...patch,
});

beforeAll(async () => {
  database = await createDisposableDatabase(process.env['OPENLEGEND_TEST_DATABASE_URL']);
  db = new PostgresDatabase(database.url);
}, 60_000);
beforeEach(async () => {
  await db.exec('DROP SCHEMA IF EXISTS cognition_lab CASCADE');
  directory = await mkdtemp(join(tmpdir(), 'openlegend-lab-records-'));
  directories.push(directory);
  guard = undefined;
  records = new CognitionLabRecords(db, directory, { evidenceGuard: (scope) => guard?.(scope) });
  await records.ready;
});
afterAll(async () => {
  await db?.close();
  await database?.close();
  for (const path of directories) await rm(path, { recursive: true, force: true });
}, 60_000);

describe('retained cognition experiment records', () => {
  it('selects the exact current timeline before paging or disclosing retained headers', async () => {
    const current = Array.from({ length: 3 }, (_, index) =>
      record('timeline', {
        summary: {
          worldId: 'current-world',
          timeline: 'current-timeline',
          gameTime: index,
          nativeOrder: index,
          kind: 'intervention',
          text: `Current intervention ${index}`,
        },
      }),
    );
    await db.transaction(async () => {
      for (let index = 0; index < 100; index++)
        await records.putRecord(
          record('timeline', {
            summary: {
              worldId: index % 2 ? 'other-world' : 'current-world',
              timeline: index % 2 ? 'current-timeline' : 'other-timeline',
              gameTime: 100 + index,
              nativeOrder: index,
              kind: 'intervention',
              text: 'Unrelated retained future',
            },
          }),
        );
      for (const item of current) await records.putRecord(item);
      await records.putRecord(
        record('timeline', {
          summary: {
            worldId: 'current-world',
            timeline: 'current-timeline',
            gameTime: 999,
            nativeOrder: 999,
            kind: 'intervention',
            nativeEvent: true,
            text: 'A world-authored type colliding with a diagnostic category',
          },
        }),
      );
    });
    const disclosed: string[] = [];
    guard = ({ record }) => {
      if (record) disclosed.push(record.id);
    };
    const options = {
      timelineScope: { worldId: 'current-world', timeline: 'current-timeline' },
      categories: ['intervention'],
      nativeEvents: 'exclude' as const,
      limit: 2,
    };
    const first = await records.pageRecords('timeline', options);
    expect(first.items.map((item) => item.id)).toEqual([current[2]!.id, current[1]!.id]);
    const second = await records.pageRecords('timeline', { ...options, cursor: first.nextCursor });
    expect(second.items.map((item) => item.id)).toEqual([current[0]!.id]);
    expect(second.nextCursor).toBeUndefined();
    expect(disclosed).toEqual([current[2]!.id, current[1]!.id, current[0]!.id]);
    const native = await records.pageRecords('timeline', { ...options, nativeEvents: 'only' });
    expect(native.items).toHaveLength(1);
    expect(native.items[0]!.summary).toMatchObject({ nativeEvent: true });
    const plan = await db
      .prepare(
        `EXPLAIN (FORMAT JSON) SELECT id FROM cognition_lab.records WHERE kind='timeline' AND jsonb_typeof(summary::jsonb->'gameTime')='number' AND jsonb_typeof(summary::jsonb->'nativeOrder')='number' AND summary::jsonb->>'worldId'=? AND summary::jsonb->>'timeline'=? ORDER BY (summary::jsonb->>'gameTime')::double precision DESC,(summary::jsonb->>'nativeOrder')::double precision DESC,created_at DESC,id DESC LIMIT 3`,
      )
      .all('current-world', 'current-timeline');
    expect(JSON.stringify(plan)).toContain('cognition_lab_timeline_scope_time');
  });
  it('withholds private captured run bindings while propagating unrelated read failures', async () => {
    const runId = randomUUID();
    await records.configureRun(runId);
    const scope = { worldId: 'binding-world', timeline: 'binding-timeline' };
    const entry = record('timeline', {
      runId,
      sourceId: 'native-source',
      summary: { ...scope, gameTime: 0, nativeOrder: 1, nativeEvent: true },
    });
    await records.putRecord(entry);
    guard = () => {
      throw new AuthorityError('forbidden');
    };
    expect((await records.timelineBindings(['native-source'], scope)).size).toBe(0);
    guard = () => {
      throw new Error('Fixture current disclosure storage read failed.');
    };
    await expect(records.timelineBindings(['native-source'], scope)).rejects.toThrow(
      'storage read failed',
    );
    guard = undefined;
    expect((await records.timelineBindings(['native-source'], scope)).get('native-source')).toEqual(
      { runId },
    );
  });
  it('projects only owner-authorized management tombstones while retaining strict content guards and authority after waits', async () => {
    const a = record('checkpoint', {
      name: 'Private historical name',
      actorId: 'private-actor',
      summary: { ownerAccountId: 'owner', secret: 'private summary' },
      data: { secret: 'private data' },
    });
    const b = record('comparison', { summary: { ownerAccountId: 'owner' } });
    await records.putRecord(a);
    await records.putRecord(b);
    let owned = true;
    const authorize = () => owned;
    guard = ({ record }) => {
      if (record?.id === a.id) throw new Error('Withheld by native correction.');
    };
    await expect(records.getRecord(a.id)).rejects.toThrow('native correction');
    const page = await records.pageManagementRecords(
      ['scenario', 'checkpoint', 'run', 'comparison'],
      { limit: 50 },
      authorize,
    );
    expect(page.items.find((item) => item.id === a.id)).toEqual({
      id: a.id,
      kind: a.kind,
      createdAt: a.createdAt,
      withheld: true,
    });
    expect(page.items.find((item) => item.id === b.id)).toMatchObject({
      id: b.id,
      name: b.name,
      withheld: false,
    });
    expect(JSON.stringify(page)).not.toContain('private summary');
    expect(JSON.stringify(page)).not.toContain('private data');
    owned = false;
    expect(await records.managementHeader(a.id, authorize)).toBeUndefined();
    await expect(
      records.pageManagementRecords('checkpoint', { limit: 1 }, authorize),
    ).rejects.toThrow('saved items are unavailable');
    owned = true;
    guard = () => {
      owned = false;
    };
    expect(await records.managementHeader(b.id, authorize)).toBeUndefined();
  });
  it('searches only disclosed management projections without revealing withheld name or summary membership', async () => {
    const withheld = record('checkpoint', {
      name: 'Secret historical label',
      summary: { secret: 'Hidden source phrase' },
      createdAt: '2026-10-25T00:00:00.000Z',
    });
    const disclosed = record('scenario', {
      name: 'Available scenario',
      summary: { description: 'Visible source phrase' },
    });
    await records.putRecord(withheld);
    await records.putRecord(disclosed);
    guard = ({ record }) => {
      if (record?.id === withheld.id) throw new Error('Withheld by native correction.');
    };
    const kinds = ['scenario', 'checkpoint', 'run', 'comparison'] as const;
    const authorize = () => true;
    const secret = await records.pageManagementRecords(
      kinds,
      { limit: 1, search: 'Secret historical label' },
      authorize,
    );
    const absent = await records.pageManagementRecords(
      kinds,
      { limit: 1, search: 'Definitely absent' },
      authorize,
    );
    const hiddenSummary = await records.pageManagementRecords(
      kinds,
      { limit: 1, search: 'Hidden source phrase' },
      authorize,
    );
    expect(secret).toEqual(absent);
    expect(hiddenSummary).toEqual(absent);
    expect(secret.items).toEqual([]);
    expect(secret.nextCursor).toBeTypeOf('string');
    const visible = await records.pageManagementRecords(
      kinds,
      { limit: 1, search: 'VISIBLE source', cursor: secret.nextCursor },
      authorize,
    );
    expect(visible.items).toHaveLength(1);
    expect(visible.items[0]).toMatchObject({ id: disclosed.id, withheld: false });
    expect(visible.items[0]).not.toHaveProperty('data');
    expect(visible.nextCursor).toBeUndefined();
    expect(
      (
        await records.pageManagementRecords(kinds, { search: 'Available scenario' }, authorize)
      ).items.map((item) => item.id),
    ).toEqual([disclosed.id]);
  });
  it('pages all four saved kinds through one ordered current index and refuses another layout before reuse', async () => {
    const ids = new Set<string>();
    for (const kind of ['scenario', 'checkpoint', 'run', 'comparison'] as const) {
      const value = record(kind);
      ids.add(value.id);
      await records.putRecord(value);
    }
    await records.putRecord(record('timeline'));
    let cursor: string | undefined;
    const received: string[] = [];
    do {
      const page = await records.pageRecords(['scenario', 'checkpoint', 'run', 'comparison'], {
        limit: 2,
        cursor,
      });
      expect(page.items).toHaveLength(2);
      received.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor;
    } while (cursor);
    expect(new Set(received)).toEqual(ids);
    expect(received).toHaveLength(4);
    expect(
      String(
        (
          await db
            .prepare(
              "SELECT indexdef FROM pg_indexes WHERE schemaname='cognition_lab' AND indexname='cognition_lab_records_saved_time'",
            )
            .get()
        )?.['indexdef'],
      ),
    ).toContain('comparison');
    await db
      .prepare('UPDATE cognition_lab.storage SET format=? WHERE singleton=1')
      .run('unsupported-layout');
    const incompatible = new CognitionLabRecords(db, directory);
    await expect(incompatible.ready).rejects.toThrow('Unsupported lab format');
  });
  it('claims cleanup durably at full capacity, preserves its receipt across restart, and replenishes control credit after actual unlink', async () => {
    const payload = await records.putArtifact('x'.repeat(30_000), 'text/plain');
    const saved = record('run');
    saved.runId = saved.id;
    await records.configureRun(saved.id);
    await records.putRecord(saved, { references: [{ kind: 'artifact', id: payload.id }] });
    let usage = await records.usage();
    await records.setAllowance(usage.usedBytes + usage.reservedBytes);
    await expect(records.beginOperation(randomUUID(), { kind: 'capture' })).rejects.toThrow(
      'capacity',
    );
    const commandId = randomUUID();
    expect(
      await records.beginOperation(commandId, { kind: 'remove', id: saved.id }, { recovery: true }),
    ).toMatchObject({ claimed: true, state: 'pending' });
    await expect(
      records.beginOperation(randomUUID(), { kind: 'remove' }, { recovery: true }),
    ).rejects.toThrow('pending');
    const refs = await records.removeRecord(saved.id);
    expect(refs.artifacts).toEqual([payload.id]);
    await records.removeUnreferencedArtifact(payload.id);
    await records.finishOperation(commandId, 'completed', {
      ok: true,
      message: 'Selected saved work removed.',
    });
    usage = await records.usage();
    expect(usage.recoveryReservedBytes).toBe(LAB_STORAGE_DEFAULTS.terminalBytes);
    expect(usage.usedBytes + usage.reservedBytes).toBeLessThanOrEqual(usage.allowanceBytes);
    const reopened = new CognitionLabRecords(db, directory);
    await reopened.recoverInterrupted();
    expect(
      await reopened.beginOperation(
        commandId,
        { kind: 'remove', id: saved.id },
        { recovery: true },
      ),
    ).toMatchObject({ claimed: false, state: 'completed' });
    const next = randomUUID();
    const increased = usage.allowanceBytes + LAB_STORAGE_DEFAULTS.terminalBytes;
    expect(
      await reopened.beginOperation(
        next,
        { kind: 'increase', bytes: increased },
        { recovery: true, allowanceBytes: increased },
      ),
    ).toMatchObject({ claimed: true });
    await reopened.finishOperation(next, 'completed', {
      ok: true,
      message: 'Allowance increased.',
    });
    expect((await reopened.usage()).allowanceBytes).toBe(increased);
  });

  it('rejects oversized individual metadata before retaining it while allowing large streamed artifacts', async () => {
    const before = await records.usage();
    await expect(
      records.putRecord(record('scenario', { data: { text: 'x'.repeat(1024 ** 2) } })),
    ).rejects.toThrow('1 MiB');
    expect(await records.usage()).toEqual(before);
    const payload = await records.putArtifact('x'.repeat(2 * 1024 ** 2), 'text/plain');
    expect(payload.bytes).toBe(2 * 1024 ** 2);
  });
  it('admits native-only metadata, spends down capture reservations, and protects terminal receipts', async () => {
    const runId = randomUUID();
    await records.configureRun(runId, 100_000);
    const reservation = await records.reserve(40_000, runId);
    const request = await records.putArtifact('{"actual":"request"}', 'application/json', {
      runId,
      reservationId: reservation,
    });
    const response = await records.putArtifact('{"actual":"response"}', 'application/json', {
      runId,
      reservationId: reservation,
    });
    await records.putRecord(record('stage', { runId }), {
      reservationId: reservation,
      references: [
        { kind: 'artifact', id: request.id },
        { kind: 'artifact', id: response.id },
      ],
    });
    const occupied = await records.usage();
    expect(occupied.usedBytes + occupied.reservedBytes).toBe(
      40_000 + LAB_STORAGE_DEFAULTS.terminalBytes,
    );
    await records.release(reservation);
    expect((await records.usage()).reservedBytes).toBe(LAB_STORAGE_DEFAULTS.terminalBytes);
    await records.setAllowance(
      (await records.usage()).usedBytes + 2 * LAB_STORAGE_DEFAULTS.terminalBytes + 1000,
    );
    const commandId = randomUUID();
    await records.beginOperation(commandId, { kind: 'nativeOnly' });
    const usage = await records.usage();
    await records.setAllowance(usage.usedBytes + usage.reservedBytes);
    await expect(records.putRecord(record('timeline'))).rejects.toThrow('capacity');
    await records.finishOperation(commandId, 'completed', { accepted: true });
    expect((await records.receipt(commandId))?.result).toEqual({ accepted: true });
    expect((await records.usage()).reservedBytes).toBe(LAB_STORAGE_DEFAULTS.terminalBytes);
  });

  it('uses command identity once, preserves the accepted outcome and refuses a conflicting intention', async () => {
    const id = randomUUID();
    const first = await records.beginOperation(id, { kind: 'hold', generation: 'a' });
    expect(first.claimed).toBe(true);
    expect(await records.beginOperation(id, { kind: 'hold', generation: 'a' })).toEqual({
      ...first,
      claimed: false,
    });
    await records.finishOperation(id, 'completed', { held: true });
    expect((await records.beginOperation(id, { kind: 'hold', generation: 'a' })).state).toBe(
      'completed',
    );
    await expect(records.beginOperation(id, { kind: 'stop', generation: 'a' })).rejects.toThrow(
      'different operation',
    );
    await expect(records.finishOperation(id, 'failed', { held: false })).rejects.toThrow(
      'cannot change',
    );
  });

  it('hydrates one selected ID batch in order and resolves every actual artifact owner', async () => {
    const shared = await records.putArtifact('one shared original input', 'application/json');
    const a = record('stage', { actorId: 'support:actor:a', sourceId: 'source:a' }),
      b = record('stage', { actorId: 'focal:actor:b', sourceId: 'source:b' });
    for (const item of [a, b])
      await records.putRecord(item, { references: [{ kind: 'artifact', id: shared.id }] });
    expect((await records.recordData([b.id, a.id])).map((item) => item.id)).toEqual([b.id, a.id]);
    expect((await records.artifactOwners(shared.id)).map((item) => item.actorId).sort()).toEqual([
      'focal:actor:b',
      'support:actor:a',
    ]);
    await expect(records.recordData(Array.from({ length: 101 }, () => a.id))).rejects.toThrow();
  });

  it('pages saved kinds together and applies actual root/call and event-kind filters in SQL', async () => {
    const runId = randomUUID();
    await records.configureRun(runId);
    const root = record('stage', { runId, summary: { kind: 'stimulus' } }),
      call = record('stage', {
        runId,
        parentId: root.id,
        summary: { rootId: root.id, kind: 'judge' },
      });
    for (const item of [record('scenario'), record('checkpoint'), record('run'), root, call])
      await records.putRecord(item);
    expect((await records.pageRecords(['scenario', 'checkpoint', 'run'])).items).toHaveLength(3);
    expect(
      (await records.pageRecords('stage', { runId, stageRole: 'root' })).items.map(
        (item) => item.id,
      ),
    ).toEqual([root.id]);
    expect(
      (
        await records.pageRecords('stage', { runId, stageRole: 'call', category: 'judge' })
      ).items.map((item) => item.id),
    ).toEqual([call.id]);
    expect(await records.evidenceItem(call.id, 'awareness', 'missing')).toBeUndefined();
  });

  it('scopes search and cursor pages before payload hydration, including model-only recipients', async () => {
    const ids: string[] = [];
    for (let index = 0; index < 7; index++) {
      const item = record('customField', {
        name: index % 2 ? 'target value' : 'other',
        actorId: 'subject:a:b',
        data: { privateValue: 'not a list payload' },
      });
      ids.push(item.id);
      await records.putRecord(item, {
        recipientActorIds: index < 5 ? ['recipient:a', 'recipient:b:c'] : ['recipient:b'],
      });
    }
    const first = await records.pageRecords('customField', {
      recipientActorId: 'recipient:b:c',
      actorId: 'subject:a:b',
      search: 'target',
      limit: 1,
    });
    expect(first.items).toHaveLength(1);
    expect(first.items[0]).not.toHaveProperty('data');
    expect(first.nextCursor).toBeDefined();
    const second = await records.pageRecords('customField', {
      recipientActorId: 'recipient:b:c',
      actorId: 'subject:a:b',
      search: 'target',
      limit: 1,
      cursor: first.nextCursor,
    });
    expect(second.items).toHaveLength(1);
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
    expect(second.nextCursor).toBeUndefined();
    expect(
      (await records.pageRecords('customField', { recipientActorId: 'recipient:b' })).items,
    ).toHaveLength(2);
    await expect(records.pageRecords('customField', { limit: 101 })).rejects.toThrow();
  });

  it('keeps source-kind identities distinct and pages stage evidence without the full captured envelope', async () => {
    const runId = randomUUID();
    await records.configureRun(runId);
    const stage = record('stage', { runId });
    await records.putRecord(stage);
    await records.putEvidence(stage.id, [
      {
        id: 'source:a:b',
        stageId: stage.id,
        kind: 'awareness',
        label: 'Selected memory',
        summary: { selected: true },
        source: { actorId: 'a', worldId: 'world', sourceId: 'source:a:b', kind: 'awareness' },
      },
      {
        id: 'source:a:b',
        stageId: stage.id,
        kind: 'commitment',
        label: 'Excluded promise',
        summary: { selected: false },
      },
    ]);
    const first = await records.pageEvidence(stage.id, { limit: 1 });
    const second = await records.pageEvidence(stage.id, { limit: 1, cursor: first.nextCursor });
    expect(first.items[0]?.id).toBe(second.items[0]?.id);
    expect(first.items[0]?.kind).not.toBe(second.items[0]?.kind);
    expect((await records.pageEvidence(stage.id, { search: 'Selected' })).items).toHaveLength(1);
  });

  it('reads exact byte chunks, pins a streaming reader and detects changed capture content', async () => {
    const text = 'αβ🦉'.repeat(300_000);
    const saved = await records.putArtifact(text, 'text/plain; charset=utf-8');
    const first = await records.readArtifactChunk(saved.id);
    expect(first.bytes.length).toBe(LAB_STORAGE_DEFAULTS.chunkBytes);
    expect(first.nextOffset).toBe(LAB_STORAGE_DEFAULTS.chunkBytes);
    const stream = records.streamArtifact(saved.id);
    const started = await stream.next();
    expect(started.done).toBe(false);
    expect(await records.removeUnreferencedArtifact(saved.id)).toBe(false);
    if (!started.value) throw new Error('Expected the first captured chunk.');
    const chunks = [started.value];
    for await (const chunk of stream) chunks.push(chunk);
    expect(Buffer.concat(chunks).equals(Buffer.from(text))).toBe(true);
    await records.settle();
    expect(await records.artifact(saved.id)).toBeUndefined();
    const corrupted = await records.putArtifact(text, 'text/plain; charset=utf-8');
    await writeFile(join(directory, 'artifacts', corrupted.id), 'x'.repeat(corrupted.bytes));
    await expect(
      (async () => {
        for await (const _ of records.streamArtifact(corrupted.id)) {
          /* checksum */
        }
      })(),
    ).rejects.toThrow('integrity');
    expect(await records.removeUnreferencedArtifact(corrupted.id)).toBe(true);
    expect((await records.usage()).usedBytes).toBe(0);
  });

  it('rechecks source disclosure after asynchronous artifact IO', async () => {
    const saved = await records.putArtifact('private current evidence', 'text/plain');
    let checks = 0;
    guard = () => {
      if (++checks === 2) throw new Error('Source was forgotten.');
    };
    await expect(records.readArtifactChunk(saved.id)).rejects.toThrow('forgotten');
    expect(checks).toBe(2);
  });

  it('retains a shared checkpoint until its last descriptor is removed, and does not refund failed removal', async () => {
    const checkpoint = {
      id: randomUUID(),
      worldId: 'world:a:b',
      bytes: 1000,
      checksum: 'a'.repeat(64),
      createdAt: '2026-10-24T23:00:00.000Z',
      simTime: 5,
    };
    await records.registerCheckpoint(checkpoint);
    const a = record('scenario'),
      b = record('checkpoint');
    for (const item of [a, b])
      await records.putRecord(item, { references: [{ kind: 'checkpoint', id: checkpoint.id }] });
    await records.removeRecord(a.id);
    let removed = 0;
    expect(
      await records.removeUnreferencedCheckpoint(checkpoint.id, async () => {
        removed++;
      }),
    ).toBe(false);
    expect(removed).toBe(0);
    await records.removeRecord(b.id);
    const before = await records.usage();
    await expect(
      records.removeUnreferencedCheckpoint(checkpoint.id, async () => {
        throw new Error('Disk busy');
      }),
    ).rejects.toThrow('Disk busy');
    expect(await records.usage()).toEqual(before);
    expect(
      await records.removeUnreferencedCheckpoint(checkpoint.id, async () => {
        removed++;
      }),
    ).toBe(true);
    expect(removed).toBe(1);
    expect((await records.usage()).usedBytes).toBe(0);
  });

  it('deduplicates actual receipt cost and preserves unknown completion and price separately', async () => {
    const runId = randomUUID();
    await records.configureRun(runId);
    await records.reconcileAttempt(runId, 'attempt:a:b', { requestId: 'remote' }, undefined, true);
    expect(await records.costs(runId)).toEqual({ knownUsd: 0, unknownCount: 1, uncertainCount: 1 });
    await records.reconcileAttempt(
      runId,
      'attempt:a:b',
      { requestId: 'remote', cost: 0.00012345 },
      0.00012345,
      false,
    );
    await records.reconcileAttempt(
      runId,
      'attempt:a:b',
      { requestId: 'remote', cost: 0.00012345 },
      0.00012345,
      false,
    );
    expect(await records.costs(runId)).toEqual({
      knownUsd: 0.00012345,
      unknownCount: 0,
      uncertainCount: 0,
    });
    await records.reconcileAttempt(
      runId,
      'attempt:other',
      { completionUncertain: false },
      undefined,
      false,
    );
    expect(await records.costs(runId)).toEqual({
      knownUsd: 0.00012345,
      unknownCount: 1,
      uncertainCount: 0,
    });
  });

  it('reopens retained evidence and interrupts pending metadata operations without repeating native work', async () => {
    const saved = await records.putArtifact('retained exact request', 'application/json');
    const initial = record('scenario'),
      runId = randomUUID(),
      retained = record('run', { id: runId, runId, data: { retained: true } }),
      workspace = record('workspace', {
        data: { initialOriginId: initial.id, holds: [{ entityId: 'old-person' }] },
      });
    await records.putRecord(initial);
    await records.configureRun(runId);
    await records.putRecord(retained, {
      references: [
        { kind: 'record', id: initial.id },
        { kind: 'artifact', id: saved.id },
      ],
    });
    await records.putRecord(workspace, { references: [{ kind: 'record', id: initial.id }] });
    await records.putRecord(record('customField', { data: { recipientActorIds: ['old-person'] } }));
    await records.reconcileAttempt(
      runId,
      'retained-unknown',
      { requestId: 'remote' },
      undefined,
      true,
    );
    const id = randomUUID();
    await records.beginOperation(id, { kind: 'save' });
    await records.close();
    const reopened = new CognitionLabRecords(db, directory);
    await reopened.recoverInterrupted();
    expect((await reopened.receipt(id))?.state).toBe('interrupted');
    expect((await reopened.readArtifactChunk(saved.id)).bytes.toString()).toBe(
      'retained exact request',
    );
    expect((await reopened.usage()).reservedBytes).toBe(LAB_STORAGE_DEFAULTS.terminalBytes);
    const expected = await reopened.getRecord(workspace.id, 'workspace');
    if (!expected) throw new Error('Expected the retained workspace before offline reset.');
    const costs = await reopened.costs(runId),
      receipt = await reopened.receipt(id),
      usage = await reopened.usage(),
      runUsage = await reopened.runUsage(runId);
    const attempts = await db
      .prepare('SELECT * FROM cognition_lab.attempts ORDER BY attempt_id')
      .all();
    await expect(reopened.resetDevelopmentWorkspace(expected)).rejects.toThrow(/Close the offline/);
    await reopened.close();
    await expect(
      reopened.resetDevelopmentWorkspace({ ...expected, data: { initialOriginId: 'changed' } }),
    ).rejects.toThrow(/changed before reset/);
    expect(await reopened.usage()).toEqual(usage);
    expect(await reopened.resetDevelopmentWorkspace(expected)).toEqual({
      workspaceId: workspace.id,
      customFields: 1,
    });
    expect((await reopened.pageRecords('workspace')).items).toEqual([]);
    expect((await reopened.pageRecords('customField')).items).toEqual([]);
    expect(await reopened.getRecord(initial.id)).toEqual(initial);
    expect(await reopened.getRecord(runId)).toEqual(retained);
    expect(await reopened.references('record', initial.id)).toBe(true);
    expect((await reopened.readArtifactChunk(saved.id)).bytes.toString()).toBe(
      'retained exact request',
    );
    expect(await reopened.costs(runId)).toEqual(costs);
    expect(await reopened.runUsage(runId)).toEqual(runUsage);
    expect(await reopened.receipt(id)).toEqual(receipt);
    expect(
      await db.prepare('SELECT * FROM cognition_lab.attempts ORDER BY attempt_id').all(),
    ).toEqual(attempts);
    expect((await reopened.usage()).reservedBytes).toBe(usage.reservedBytes);
    expect((await reopened.usage()).usedBytes).toBeLessThan(usage.usedBytes);
    const current = new CognitionLabRecords(db, directory);
    expect((await current.pageRecords('workspace')).items).toEqual([]);
    expect((await current.pageRecords('customField')).items).toEqual([]);
    expect(await current.costs(runId)).toEqual(costs);
    await current.close();
  });

  it.each([false, true])(
    'preserves only an explicitly reconciled pending receipt and its terminal credit (recovery=%s)',
    async (recovery) => {
      const owner = randomUUID(),
        interrupted = randomUUID();
      await records.beginOperation(owner, { kind: 'restore' }, { recovery });
      await records.beginOperation(interrupted, { kind: 'other' });
      const capture = await records.reserve(40_000);
      const ownerReservation = String(
        (
          await db
            .prepare('SELECT reservation_id FROM cognition_lab.receipts WHERE command_id=?')
            .get(owner)
        )?.['reservation_id'],
      );
      const before = await records.usage();
      await records.setAllowance(before.usedBytes + before.reservedBytes);
      const reopened = new CognitionLabRecords(db, directory);
      await reopened.recoverInterrupted({ preserveCommandIds: [owner, randomUUID()] });
      expect((await reopened.receipt(owner))?.state).toBe('pending');
      expect((await reopened.receipt(interrupted))?.state).toBe('interrupted');
      expect(
        await db.prepare('SELECT id FROM cognition_lab.reservations WHERE id=?').get(capture),
      ).toBeUndefined();
      expect(
        await db
          .prepare('SELECT id FROM cognition_lab.reservations WHERE id=?')
          .get(ownerReservation),
      ).toBeDefined();
      expect(await reopened.beginOperation(owner, { kind: 'restore' }, { recovery })).toMatchObject(
        { claimed: false, state: 'pending' },
      );
      await reopened.finishOperation(owner, 'completed', { ok: true });
      await reopened.recoverInterrupted();
      expect((await reopened.receipt(owner))?.state).toBe('completed');
      expect((await reopened.usage()).reservedBytes).toBe(LAB_STORAGE_DEFAULTS.terminalBytes);
    },
  );
});
