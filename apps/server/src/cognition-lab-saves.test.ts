import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import { testRepository } from '../../../tests/fixtures/database.js';
import {
  CognitionLabRecords,
  LAB_STORAGE_DEFAULTS,
  type LabExperimentSnapshot,
  type LabEvidenceGuard,
} from './cognition-lab-records.js';
import { CognitionLabSaves, type LabSaveRuntime } from './cognition-lab-saves.js';

const directories: string[] = [];
afterEach(async () => {
  for (const path of directories.splice(0)) await rm(path, { recursive: true, force: true });
});

async function fixture(evidenceGuard?: LabEvidenceGuard) {
  const repository = await testRepository(undefined, stockedCamp());
  await repository.ready;
  const directory = await mkdtemp(join(tmpdir(), 'openlegend-lab-saves-'));
  directories.push(directory);
  const records = new CognitionLabRecords(repository.db, directory, { evidenceGuard });
  await records.ready;
  let nativeRevision = (await repository.records.head())!.revision;
  let generation = randomUUID(),
    authoringRevision = 0;
  let experiment: LabExperimentSnapshot = {
    settings: { model: 'fixture' },
    customFields: [],
    holds: [],
    participants: ['actor:a'],
    autonomy: ['actor:b'],
  };
  let captures = 0,
    removes = 0;
  const runtime: LabSaveRuntime = {
    scope: () => ({
      worldId: 'fixture-world',
      runtimeGeneration: generation,
      scenarioRevision: authoringRevision,
      nativeRevision,
    }),
    experiment: () => experiment,
    capture: async (id) => {
      captures++;
      return {
        id,
        worldId: 'fixture-world',
        revision: nativeRevision,
        bytes: 1000,
        checksum: 'a'.repeat(64),
        createdAt: '2026-10-24T23:00:00.000Z',
        simTime: 10,
      };
    },
    restore: async (_checkpoint, savedExperiment) => {
      experiment = savedExperiment;
      generation = randomUUID();
      return { baselineChanged: true, reasons: ['Current privacy overlay removed a source.'] };
    },
    remove: async () => {
      removes++;
    },
  };
  return {
    repository,
    records,
    runtime,
    saves: new CognitionLabSaves(records, runtime),
    changeSettings: () => {
      authoringRevision++;
      experiment = { ...experiment, settings: { model: 'changed' } };
    },
    changeNative: () => {
      nativeRevision++;
    },
    counters: () => ({ captures, removes }),
    experiment: () => experiment,
  };
}

describe('coherent lab scenario and checkpoint descriptors', () => {
  it('removes authorized unavailable saved work without reading its protected context and preserves shared native dependencies', async () => {
    let withheld = false;
    const h = await fixture(() => {
      if (withheld) throw new Error('Current native correction withholds historical content.');
    });
    const a = await h.saves.origin();
    h.changeSettings();
    const b = await h.saves.capture('scenario', 'Private historical label');
    withheld = true;
    await expect(h.records.getRecord(b.record.id)).rejects.toThrow('withholds');
    expect(await h.records.managementHeader(b.record.id, () => true)).toEqual({
      id: b.record.id,
      kind: 'scenario',
      createdAt: b.record.createdAt,
      withheld: true,
    });
    await h.saves.remove(b.record.id);
    expect(h.counters().removes).toBe(0);
    await expect(h.records.getRecord(a.record.id)).rejects.toThrow('withholds');
    await h.saves.remove(a.record.id);
    expect(h.counters().removes).toBe(1);
    expect((await h.records.usage()).usedBytes).toBe(0);
  });
  it('keeps native overlay restoration inside the host-only access context without opening evidence reads', async () => {
    let changed = false,
      restoring = false;
    const h = await fixture(() => {
      if (changed && !restoring) throw new Error('Historical payload was corrected.');
    });
    const origin = await h.saves.origin();
    changed = true;
    await expect(h.records.getRecord(origin.record.id)).rejects.toThrow('corrected');
    h.runtime.restoreAccess = async (work) => {
      restoring = true;
      try {
        return await work();
      } finally {
        restoring = false;
      }
    };
    expect(await h.saves.restore(origin.record.id, randomUUID())).toMatchObject({
      baselineChanged: true,
    });
    expect(restoring).toBe(false);
    await expect(h.records.getRecord(origin.record.id)).rejects.toThrow('corrected');
  });
  it('captures applied inputs once, reuses matching native bytes, and restores saved settings with native state', async () => {
    const h = await fixture();
    const a = await h.saves.origin();
    h.changeSettings();
    const b = await h.saves.capture('scenario', 'Changed settings');
    expect(h.counters().captures).toBe(1);
    expect(a.checkpoint.id).toBe(b.checkpoint.id);
    expect(a.experiment.settings).toEqual({ model: 'fixture' });
    expect(b.experiment.settings).toEqual({ model: 'changed' });
    const restored = await h.saves.restore(a.record.id, randomUUID());
    expect(h.experiment().settings).toEqual({ model: 'fixture' });
    expect(restored.baselineChanged).toBe(true);
    expect(restored.reasons).toHaveLength(1);
    await h.saves.remove(b.record.id);
    expect(h.counters().removes).toBe(0);
    await h.saves.remove(a.record.id);
    expect(h.counters().removes).toBe(1);
    expect((await h.records.usage()).usedBytes).toBe(0);
  });

  it('rejects changed authoring during native capture and removes its unused package', async () => {
    const h = await fixture();
    const nativeCapture = h.runtime.capture;
    h.runtime.capture = async (...args) => {
      const result = await nativeCapture(...args);
      h.changeSettings();
      return result;
    };
    await expect(h.saves.origin()).rejects.toThrow('changed during capture');
    expect(h.counters()).toEqual({ captures: 1, removes: 1 });
    expect((await h.records.pageRecords('checkpoint')).items).toEqual([]);
    expect(await h.records.usage()).toMatchObject({
      usedBytes: 0,
      reservedBytes: LAB_STORAGE_DEFAULTS.terminalBytes,
    });
  });

  it('preserves complete experiment context above the metadata bound through streamed artifact capture and restore', async () => {
    const h = await fixture();
    const snapshot: LabExperimentSnapshot = {
      settings: { model: 'fixture', text: ('🌿\n"\\' + '\ud800').repeat(160_000) },
      customFields: Array.from({ length: 400 }, (_, index) => ({
        id: String(index),
        value: 'x'.repeat(4096),
      })),
      holds: [],
      participants: ['actor:a'],
      autonomy: ['actor:b'],
    };
    h.runtime.experiment = () => snapshot;
    const saved = await h.saves.capture('scenario', 'Complete large context');
    expect(Buffer.byteLength(JSON.stringify(saved.record))).toBeLessThan(4096);
    expect(saved.record.data).toHaveProperty('experimentArtifactId');
    expect(saved.record.data).not.toHaveProperty('experiment');
    await h.saves.restore(saved.record.id, randomUUID());
    expect(h.experiment()).toEqual(snapshot);
    await h.saves.remove(saved.record.id);
    expect((await h.records.usage()).usedBytes).toBe(0);
  }, 60_000);

  it('copies an actual native checkpoint through the shared package owner without installing or changing either world', async () => {
    const source = await testRepository(undefined, stockedCamp());
    const target = await testRepository();
    await Promise.all([source.ready, target.ready]);
    const loaded = await source.load();
    const saved = loaded?.state;
    if (!saved) throw new Error('Expected the source fixture world.');
    const id = randomUUID();
    await source.saves.create(saved, 'Point in time', id, {
      expectedRevision: (await source.records.head())!.revision,
    });
    const manifest = await source.saves.metadata(saved.world.id, id);
    const copied = await target.saves.importLines(
      manifest,
      source.saves.exportLines(saved.world.id, id),
    );
    expect(copied.created).toBe(true);
    expect(copied.metadata.checksum).toBe(manifest.checksum);
    expect(copied.metadata.bytes).toBe(manifest.bytes);
    const reopened = await target.saves.read(saved.world.id, id);
    expect(reopened.state.world.id).toBe(saved.world.id);
    expect(reopened.state.world.rngState).toEqual(saved.world.rngState);
    expect(reopened.history.history_events).toHaveLength(
      saved.world.events.length + (saved.world.archivedEventCount ?? 0),
    );
    expect(await target.records.head()).toBeNull();
    expect((await source.load())?.state.world.simTime).toBe(saved.world.simTime);
    const corrupt = { ...manifest, id: randomUUID(), checksum: '0'.repeat(64) };
    await expect(
      target.saves.importLines(corrupt, source.saves.exportLines(saved.world.id, id)),
    ).rejects.toThrow('integrity');
    await expect(target.saves.metadata(saved.world.id, corrupt.id)).rejects.toThrow('unavailable');
  }, 60_000);
});
