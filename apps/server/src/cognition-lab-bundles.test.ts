import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import { testRepository } from '../../../tests/fixtures/database.js';
import {
  CognitionLabRecords,
  LAB_STORAGE_DEFAULTS,
  labJson,
  type LabRecord,
} from './cognition-lab-records.js';
import { CognitionLabSaves } from './cognition-lab-saves.js';
import { CognitionLabBundles } from './cognition-lab-bundles.js';

const directories: string[] = [];
let source: Awaited<ReturnType<typeof testRepository>>;
let records: CognitionLabRecords;
let bundles: CognitionLabBundles;
let originId: string, runId: string, artifactId: string, stageId: string, artifactText: string;
const makeRecord = (kind: LabRecord['kind'], patch: Partial<LabRecord> = {}): LabRecord => ({
  id: randomUUID(),
  kind,
  name: 'Fixture ' + kind,
  createdAt: '2026-10-24T23:00:00.000Z',
  summary: {},
  data: {},
  ...patch,
});
async function directory() {
  const path = await mkdtemp(join(tmpdir(), 'openlegend-lab-bundle-'));
  directories.push(path);
  return path;
}
async function* chunks(bytes: Buffer, size = 60_037) {
  for (let offset = 0; offset < bytes.length; offset += size)
    yield bytes.subarray(offset, offset + size);
}
async function collect(stream: AsyncIterable<Uint8Array>) {
  const values: Buffer[] = [];
  for await (const part of stream) values.push(Buffer.from(part));
  return Buffer.concat(values);
}
async function target() {
  const repository = await testRepository();
  await repository.ready;
  const path = await directory();
  const store = new CognitionLabRecords(repository.db, path);
  await store.ready;
  return {
    repository,
    records: store,
    bundles: new CognitionLabBundles(store, repository.saves, path),
  };
}

beforeAll(async () => {
  source = await testRepository(undefined, stockedCamp());
  await source.ready;
  const path = await directory();
  records = new CognitionLabRecords(source.db, path);
  await records.ready;
  const loaded = await source.load();
  if (!loaded) throw new Error('Expected source world.');
  const experiment = {
    settings: { model: 'fixture-only' },
    customFields: [
      { id: 'fictional-premise', value: 'The cup matters to me.' },
      ...Array.from({ length: 400 }, (_, index) => ({
        id: `large-context-${index}`,
        value: '🌿'.repeat(2048),
      })),
    ],
    holds: [],
    participants: ['fixture-human'],
    autonomy: ['fixture-resident'],
  };
  const saves = new CognitionLabSaves(records, {
    scope: () => ({
      worldId: loaded.state.world.id,
      runtimeGeneration: 'fixture-generation',
      scenarioRevision: 0,
      nativeRevision: loaded.revision,
    }),
    experiment: () => experiment,
    capture: async (id, name) => {
      await source.saves.create(loaded.state, name, id, { expectedRevision: loaded.revision });
      return source.saves.metadata(loaded.state.world.id, id);
    },
    restore: async () => {
      throw new Error('Bundle checks never install a world.');
    },
    remove: async (checkpoint) => source.saves.delete(checkpoint.worldId, checkpoint.id),
  });
  const origin = await saves.origin('A complete native origin');
  originId = origin.record.id;
  const run = makeRecord('run', {
    summary: { completeness: 'complete', response: 'A fixture reply' },
    data: { originId },
    status: 'ended',
  });
  run.runId = run.id;
  runId = run.id;
  await records.configureRun(runId);
  await records.putRecord(run, { references: [{ kind: 'record', id: originId }] });
  artifactText = JSON.stringify({
    context: 'Α🦉'.repeat(300_000),
    instructions: 'Fixture input, no model call.',
  });
  const artifact = await records.putArtifact(artifactText, 'application/json', { runId });
  artifactId = artifact.id;
  const stage = makeRecord('stage', {
    runId,
    parentId: runId,
    actorId: 'actor:a:b',
    sourceId: 'native:source:a:b',
    data: { inputArtifactId: artifactId },
  });
  stageId = stage.id;
  await records.putRecord(stage, { references: [{ kind: 'artifact', id: artifactId }] });
  await records.putEvidence(
    stage.id,
    Array.from({ length: 75 }, (_, index) => ({
      id: 'source:' + index,
      stageId: stage.id,
      kind: 'awareness',
      label: 'Memory ' + index,
      summary: { selected: index < 3 },
    })),
  );
  await records.reconcileAttempt(
    runId,
    'native:attempt:a:b',
    { requestId: 'fixture-only', completionUncertain: true },
    undefined,
    true,
  );
  bundles = new CognitionLabBundles(records, source.saves, path);
}, 60_000);
afterAll(async () => {
  for (const path of directories) await rm(path, { recursive: true, force: true });
}, 60_000);

describe('current-format streamed cognition bundles', () => {
  it('round trips native origin, exact inputs, multi-page evidence and unknown receipt facts without installing a world', async () => {
    const encoded = await collect(bundles.export('run', runId));
    for (const line of encoded.toString('utf8').trimEnd().split('\n'))
      expect(Buffer.byteLength(line) + 1).toBeLessThanOrEqual(1024 ** 2);
    const h = await target();
    const result = await h.bundles.import(chunks(encoded));
    expect(result).toMatchObject({
      ok: true,
      kind: 'run',
      recordId: runId,
      importId: runId,
      completeness: 'complete',
    });
    expect(await h.repository.records.head()).toBeNull();
    expect(await h.records.getRecord(runId)).toEqual(await records.getRecord(runId));
    expect((await h.records.getRecord(originId))?.data).toEqual(
      (await records.getRecord(originId))?.data,
    );
    const bytes: Buffer[] = [];
    for await (const part of h.records.streamArtifact(artifactId)) bytes.push(part);
    expect(Buffer.concat(bytes).toString('utf8')).toBe(artifactText);
    const first = await h.records.pageEvidence(stageId),
      second = await h.records.pageEvidence(stageId, { cursor: first.nextCursor });
    expect(first.items.length + second.items.length).toBe(75);
    expect(await h.records.costs(runId)).toEqual({
      knownUsd: 0,
      unknownCount: 1,
      uncertainCount: 1,
    });
    const usage = await h.records.usage();
    await h.bundles.import(chunks(encoded, 1_000_003));
    expect(await h.records.usage()).toEqual(usage);
    expect((await h.records.pageEvidence(stageId, { limit: 100 })).items).toHaveLength(75);
    await h.records.reconcileAttempt(runId, 'native:attempt:a:b', { settled: true }, 0.025, false);
    await h.bundles.import(chunks(encoded));
    expect(await h.records.costs(runId)).toEqual({
      knownUsd: 0.025,
      unknownCount: 0,
      uncertainCount: 0,
    });
  }, 120_000);

  it('returns the exact saved experiment snapshot for explicit later installation', async () => {
    const h = await target();
    const result = await h.bundles.import(bundles.export('checkpoint', originId));
    expect(result.kind).toBe('checkpoint');
    expect(result.checkpoint?.worldId).toBe((await source.load())?.state.world.id);
    expect(result.experiment?.settings).toEqual({ model: 'fixture-only' });
    expect(result.experiment?.customFields).toHaveLength(401);
    expect(result.experiment?.customFields[0]).toEqual({
      id: 'fictional-premise',
      value: 'The cup matters to me.',
    });
    expect(result.experiment?.customFields[400]).toEqual({
      id: 'large-context-399',
      value: '🌿'.repeat(2048),
    });
    expect(await h.repository.records.head()).toBeNull();
  }, 120_000);

  it('rejects truncation, incompatible format and arbitrary path fields before publishing descriptors', async () => {
    const exported = await collect(bundles.export('checkpoint', originId));
    for (const data of [
      exported.subarray(0, exported.length - 35),
      Buffer.from(exported.toString('utf8').replace('cognition-lab-jsonl', 'old-lab-jsonl')),
    ]) {
      const h = await target();
      await expect(h.bundles.import(chunks(data))).rejects.toThrow();
      expect((await h.records.pageRecords('checkpoint')).items).toEqual([]);
      expect(await h.records.usage()).toMatchObject({
        usedBytes: 0,
        reservedBytes: LAB_STORAGE_DEFAULTS.terminalBytes,
      });
      expect(await h.repository.records.head()).toBeNull();
    }
    const header = exported.indexOf(10);
    const first = JSON.parse(exported.subarray(0, header).toString('utf8')) as object;
    const invalid = Buffer.concat([
      Buffer.from(JSON.stringify({ ...first, path: '/outside/storage' }) + '\n'),
      exported.subarray(header + 1),
    ]);
    const h = await target();
    await expect(h.bundles.import(chunks(invalid))).rejects.toThrow();
    expect((await h.records.usage()).usedBytes).toBe(0);
  }, 120_000);

  it('requires exact dependency closure instead of guessing references from prose', async () => {
    const missing = makeRecord('run', {
      name: 'Unfinished fixture',
      data: labJson({ originId: 'descriptive-only' }),
    });
    missing.runId = missing.id;
    await records.configureRun(missing.id);
    await records.putRecord(missing, { references: [{ kind: 'record', id: randomUUID() }] });
    await expect(collect(bundles.export('run', missing.id))).rejects.toThrow('dependency');
  });
});
