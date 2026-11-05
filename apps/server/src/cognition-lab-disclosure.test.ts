import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { entityGet, NPC_ID } from '@open-legend/domain';
import { appendMemory } from '../../../packages/domain/src/events.js';
import { createDisposableDatabase } from '../../../scripts/disposable-postgres.mjs';
import { readConfig } from '../../../tests/fixtures/database.js';
import { editWorld } from '../../../tests/fixtures/service.js';
import { CognitionLab, type LabAuthority } from './cognition-lab.js';
import { labJson } from './cognition-lab-records.js';
import { PostgresDatabase } from './postgres.js';
import { SqlGameRepository, digest } from './store.js';
import { createWorldRuntime, type WorldRuntime } from './world-runtime.js';

const cleanup: Array<() => Promise<void>> = [];
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('External network is blocked in the disclosure fixture.');
    }),
  );
});
afterEach(async () => {
  try {
    for (const close of cleanup.splice(0)) await close();
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
}, 120_000);

async function harness() {
  const databases: Array<Awaited<ReturnType<typeof createDisposableDatabase>>> = [];
  let directory: string | undefined;
  let store: SqlGameRepository | undefined;
  let game: WorldRuntime | undefined;
  let lab: CognitionLab | undefined;
  cleanup.push(async () => {
    const failures: unknown[] = [];
    for (const close of [
      () => lab?.close(),
      () => game?.close(),
      () => store?.close(),
      ...databases.map((database) => () => database.close()),
      () => (directory ? rm(directory, { recursive: true, force: true }) : undefined),
    ]) {
      try {
        await close();
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length) throw new AggregateError(failures, 'Disclosure fixture cleanup failed.');
  });
  for (let index = 0; index < 2; index++)
    databases.push(await createDisposableDatabase(process.env['OPENLEGEND_TEST_DATABASE_URL']));
  directory = await mkdtemp(join(tmpdir(), 'openlegend-lab-disclosure-'));
  const config = readConfig({
    OPEN_LEGEND_DATABASE_URL: databases[0]!.url,
    OPEN_LEGEND_DATA_DIR: join(directory, 'game'),
    OPEN_LEGEND_LAB_DATABASE_URL: databases[1]!.url,
    OPEN_LEGEND_LAB_DATA_DIR: join(directory, 'lab'),
    OPEN_LEGEND_GOD_MODE: 'true',
    OPEN_LEGEND_LAB_BUDGET_USD: '0',
  });
  store = new SqlGameRepository(config.dataDirectory, new PostgresDatabase(databases[0]!.url));
  game = await createWorldRuntime({ store, config, automaticAutosaves: false });
  lab = new CognitionLab(game, config, { store });
  const session = await store.authority.authenticate(game.service.localSessionToken, Date.now());
  const ownedGame = game,
    ownedLab = lab;
  const authorized = <T>(work: (authority: LabAuthority) => Promise<T>) =>
    ownedLab.withAuthority(ownedGame.service.localScope, session, 'lab-disclosure-fixture', work);
  await authorized(async () => {
    await ownedLab.workspace();
    ownedLab.runtime.clock.setBlocked(true);
    await ownedLab.runtime.clock.idle();
  });
  return { game: ownedGame, lab: ownedLab, authorized };
}

async function advanceNativeInterval(h: Awaited<ReturnType<typeof harness>>) {
  return h.authorized(async () => {
    h.lab.runtime.clock.setBlocked(false);
    try {
      return await h.lab.operation({
        kind: 'controlRun',
        commandId: randomUUID(),
        action: 'advanceTime',
        durationSeconds: 1,
        expected: h.lab.expected,
      });
    } finally {
      h.lab.runtime.clock.setBlocked(true);
      await h.lab.runtime.clock.idle();
    }
  });
}

describe('Cognition Lab captured disclosure across native worlds', () => {
  it('confirms an ordinary restore after forgetting without reopening its protected evidence', async () => {
    const h = await harness();
    const memoryId = await editWorld(h.lab.runtime.service, (world) =>
      appendMemory(world, NPC_ID, {
        kind: 'episode',
        source: 'observed',
        summary: 'A saved observation that will be forgotten.',
        entityIds: [],
        importance: 6,
      }),
    );
    await h.authorized(async (authority) => {
      const workspace = await h.lab.workspace();
      expect(
        await h.lab.operation({
          kind: 'applySettings',
          commandId: randomUUID(),
          expected: h.lab.expected,
          settings: { policy: { ...workspace.settings.policy, autonomousActorIds: [] } },
        }),
      ).toMatchObject({ ok: true });
      const saved = await h.lab.operation({
        kind: 'saveScenario',
        commandId: randomUUID(),
        expected: h.lab.expected,
        name: 'Before the observation was forgotten',
      });
      expect(saved).toMatchObject({ ok: true });
      expect(
        await h.lab.runtime.service.forgetMemory(NPC_ID, memoryId!, authority.scope),
      ).toMatchObject({ ok: true, code: 'forgotten' });
      const read = () => h.lab.records.getHeader(saved.savedId!);
      await expect(read()).rejects.toThrow(/restriction|protected|forgetting/i);
      const operation = {
        kind: 'loadScenario',
        commandId: randomUUID(),
        expected: h.lab.expected,
        savedId: saved.savedId!,
      };
      const restored = await h.lab.operation(operation);
      expect(restored, JSON.stringify(restored)).toMatchObject({ ok: true });
      expect(restored.unconfirmed).not.toBe(true);
      expect(restored.message).toContain('current native protections');
      expect((await h.lab.workspace()).name).toBe('Before the observation was forgotten');
      expect(h.lab.runtime.service.world.experience?.forgotten[NPC_ID]).toContain(memoryId);
      expect(
        await h.lab.runtime.service.personMemoryJson(NPC_ID, `memory:${memoryId}`, authority.scope),
      ).toMatchObject({ ok: false });
      await expect(read()).rejects.toThrow(/restriction|protected|forgetting/i);
      const generation = h.lab.expected.runtimeGeneration;
      const replay = await h.lab.operation(operation);
      expect(replay).toMatchObject({ ok: true, savedId: saved.savedId });
      expect(replay.unconfirmed).not.toBe(true);
      expect(h.lab.expected.runtimeGeneration).toBe(generation);
      // A completed receipt releases replacement admission, without restoring the
      // forgotten source or requiring a second native load identity.
      expect(
        await h.lab.operation({
          kind: 'saveScenario',
          commandId: randomUUID(),
          expected: h.lab.expected,
          name: 'Current protected baseline',
        }),
      ).toMatchObject({ ok: true });
    });
  }, 120_000);

  it('exports retained NPC evidence after restore removes that person without granting foreign private access', async () => {
    const h = await harness();
    const initial = await h.authorized(async () => {
      const workspace = await h.lab.workspace();
      expect(
        await h.lab.operation({
          kind: 'applySettings',
          commandId: randomUUID(),
          expected: h.lab.expected,
          settings: { policy: { ...workspace.settings.policy, autonomousActorIds: [] } },
        }),
      ).toMatchObject({ ok: true });
      return h.lab.operation({
        kind: 'saveCheckpoint',
        commandId: randomUUID(),
        expected: h.lab.expected,
        name: 'Before the visitor arrived',
      });
    });
    expect(initial).toMatchObject({ ok: true });
    const created = await h.authorized(async () => {
      const workspace = await h.lab.workspace();
      const values = Object.fromEntries(
        workspace.characterCreation!.fields.map((field) => [field.id, field.value]),
      );
      values['name'] = 'Retained visitor';
      return h.lab.operation({
        kind: 'createCharacter',
        commandId: randomUUID(),
        expected: h.lab.expected,
        values: labJson(values) as Record<string, import('./cognition-lab-records.js').LabJson>,
      });
    });
    expect(created, JSON.stringify(created)).toMatchObject({ ok: true });
    const actorId = created.actorId!;
    await h.authorized(async () => {
      expect(
        await h.lab.operation({
          kind: 'submitStimulus',
          commandId: randomUUID(),
          expected: h.lab.expected,
          policy: { ...h.lab.settings.policy, autonomousActorIds: [] },
          stimulus: {
            kind: 'say',
            actorId,
            targetId: NPC_ID,
            volume: 'normal',
            text: 'I was here before the scene was restored.',
          },
        }),
      ).toMatchObject({ ok: true });
      await h.lab.runs.waitHeld();
    });
    const runId = h.lab.runs.current!.id;
    const captured = await h.authorized(async () => {
      const row = (await h.lab.records.pageRecords('timeline', { runId })).items.find(
        (entry) => entry.actorId === actorId,
      )!;
      expect(row).toBeDefined();
      await h.lab.runs.retain(runId, 'Retained visitor speech');
      return h.lab.records.getRecord(row.id);
    });
    expect(
      await h.authorized(() =>
        h.lab.operation({
          kind: 'restoreCheckpoint',
          commandId: randomUUID(),
          expected: h.lab.expected,
          savedId: initial.savedId!,
        }),
      ),
    ).toMatchObject({ ok: true });
    expect(entityGet(h.lab.runtime.service.world.entities, actorId)).toBeUndefined();
    await h.authorized(async () => {
      const bytes: Buffer[] = [];
      for await (const chunk of h.lab.bundles.export('run', runId)) bytes.push(Buffer.from(chunk));
      const rows = Buffer.concat(bytes).toString('utf8').trimEnd().split('\n');
      expect(JSON.parse(rows.at(-1)!)).toMatchObject({ type: 'footer' });
      expect((await h.lab.records.getRecord(captured!.id))?.data).toEqual(captured!.data);
      const summary = captured!.summary as Record<
        string,
        import('./cognition-lab-records.js').LabJson
      >;
      const privacy = summary['privacy'] as Record<
        string,
        import('./cognition-lab-records.js').LabJson
      >;
      for (const restricted of [
        { ...privacy, ownerAccountId: 'another-account' },
        { ...privacy, privateActorIds: [actorId] },
      ]) {
        const id = randomUUID();
        await h.lab.records.putRecord({
          ...captured!,
          id,
          summary: labJson({ ...summary, privacy: restricted }),
        });
        await expect(h.lab.records.getRecord(id)).rejects.toMatchObject({ code: 'forbidden' });
      }
    });
  }, 120_000);

  it('keeps notes within their exact run and exports valid same-run references', async () => {
    const h = await harness();
    await h.authorized(async () => {
      const workspace = await h.lab.workspace();
      expect(
        await h.lab.operation({
          kind: 'applySettings',
          commandId: randomUUID(),
          settings: { policy: { ...workspace.settings.policy, autonomousActorIds: [] } },
          expected: h.lab.expected,
        }),
      ).toMatchObject({ ok: true });
    });
    expect(await advanceNativeInterval(h)).toMatchObject({ ok: true });
    const runId = h.lab.runs.current!.id;
    const parent = await h.authorized(async () => {
      const interval = (await h.lab.records.pageRecords('interval', { runId })).items[0]!;
      await h.lab.runs.reset();
      return interval;
    });
    expect(await advanceNativeInterval(h)).toMatchObject({ ok: true });
    const otherRunId = h.lab.runs.current!.id;
    expect(otherRunId).not.toBe(runId);
    const otherParent = await h.authorized(
      async () => (await h.lab.records.pageRecords('interval', { runId: otherRunId })).items[0]!,
    );
    await h.authorized(async () => {
      const annotate = (recordId?: string) =>
        h.lab.operation({
          kind: 'annotateRun',
          commandId: randomUUID(),
          runId,
          recordId,
          text: 'This note belongs to the selected run.',
        });
      for (const recordId of [randomUUID(), otherParent.id])
        expect(await annotate(recordId)).toMatchObject({ ok: false, code: 'invalid' });
      expect((await h.lab.records.pageRecords('annotation', { runId })).items).toEqual([]);
      expect((await h.lab.records.getRecord(runId, 'run'))?.data).toMatchObject({
        counts: { annotations: 0 },
      });
      expect(await annotate(parent.id)).toMatchObject({ ok: true });
      expect(await annotate()).toMatchObject({ ok: true });
      const notes = (await h.lab.records.pageRecords('annotation', { runId })).items;
      expect(notes).toHaveLength(2);
      expect(notes.map((note) => note.parentId)).toContain(parent.id);
      expect(notes.map((note) => note.parentId)).toContain(undefined);
      expect((await h.lab.records.pageRecords('annotation', { runId: otherRunId })).items).toEqual(
        [],
      );
      let final = '';
      for await (const chunk of h.lab.bundles.export('run', runId))
        final = Buffer.from(chunk).toString('utf8');
      expect(JSON.parse(final)).toMatchObject({ type: 'footer' });
    });
  }, 120_000);

  it('rolls back a provisional note and leaves its in-memory count unchanged when counter persistence fails', async () => {
    const h = await harness();
    await h.authorized(async () => {
      const workspace = await h.lab.workspace();
      expect(
        await h.lab.operation({
          kind: 'applySettings',
          commandId: randomUUID(),
          settings: { policy: { ...workspace.settings.policy, autonomousActorIds: [] } },
          expected: h.lab.expected,
        }),
      ).toMatchObject({ ok: true });
    });
    expect(await advanceNativeInterval(h)).toMatchObject({ ok: true });
    const runId = h.lab.runs.current!.id;
    const command = {
      kind: 'annotateRun' as const,
      commandId: randomUUID(),
      runId,
      text: 'A note must be committed together with its run counter.',
    };
    const put = h.lab.records.putRecord.bind(h.lab.records);
    let provisionalNoteId: string | undefined;
    const failure = vi
      .spyOn(h.lab.records, 'putRecord')
      .mockImplementation(async (record, options) => {
        if (record.kind === 'annotation') {
          await put(record, options);
          provisionalNoteId = record.id;
          return;
        }
        if (record.kind === 'run' && record.id === runId && provisionalNoteId) {
          expect(h.lab.records.db.transactionActive).toBe(true);
          expect(await h.lab.records.getRecord(provisionalNoteId, 'annotation')).toBeDefined();
          expect(h.lab.runs.current?.counts.annotations).toBe(0);
          throw new Error('Injected annotation counter persistence failure.');
        }
        await put(record, options);
      });
    const rejected = await h.authorized(() => h.lab.operation(command));
    failure.mockRestore();
    expect(rejected).toMatchObject({
      ok: false,
      message: 'Injected annotation counter persistence failure.',
    });
    expect(provisionalNoteId).toBeDefined();
    await h.authorized(async () => {
      expect(await h.lab.records.getRecord(provisionalNoteId!)).toBeUndefined();
      expect((await h.lab.records.pageRecords('annotation', { runId })).items).toEqual([]);
      expect((await h.lab.records.getRecord(runId, 'run'))?.data).toMatchObject({
        counts: { annotations: 0 },
      });
      expect((await h.lab.workspace()).run?.counts.annotations).toBe(0);
      expect(await h.lab.operation(command)).toMatchObject({ ok: false });
      expect(await h.lab.operation({ ...command, commandId: randomUUID() })).toMatchObject({
        ok: true,
      });
      expect((await h.lab.records.pageRecords('annotation', { runId })).items).toHaveLength(1);
      expect((await h.lab.records.getRecord(runId, 'run'))?.data).toMatchObject({
        counts: { annotations: 1 },
      });
      expect((await h.lab.workspace()).run?.counts.annotations).toBe(1);
    });
  }, 120_000);

  it('keeps run names, interval context and notes bound to their original native disclosure proof', async () => {
    const h = await harness();
    const [memoryId] = await editWorld(h.lab.runtime.service, (world) => [
      appendMemory(world, NPC_ID, {
        kind: 'episode',
        source: 'observed',
        summary: 'A private observation quoted in retained operator notes.',
        entityIds: [],
        importance: 6,
      })!,
    ]);
    const advance = () => advanceNativeInterval(h);
    await h.authorized(async () => {
      const workspace = await h.lab.workspace();
      expect(
        await h.lab.operation({
          kind: 'applySettings',
          commandId: randomUUID(),
          settings: { policy: { ...workspace.settings.policy, autonomousActorIds: [] } },
          expected: h.lab.expected,
        }),
      ).toMatchObject({ ok: true });
    });
    const firstInterval = await advance();
    expect(firstInterval, JSON.stringify(firstInterval)).toMatchObject({ ok: true });
    const originalRunId = h.lab.runs.current!.id;
    const original = await h.authorized(() => h.lab.records.getRecord(originalRunId, 'run'));
    const originalPrivacy = (original!.summary as { privacy: unknown }).privacy;
    await h.authorized(async (authority) => {
      const world = h.lab.runtime.service.world;
      expect(originalPrivacy).toEqual({
        ownerAccountId: authority.scope.accountId,
        sourceWorldId: world.id,
        privateActorIds: [],
        forgottenDigest: digest(world.experience?.forgotten ?? {}),
        correctionDigest: digest(world.experience?.corrections ?? {}),
      });
    });

    const annotate = (runId: string) =>
      h.authorized(() =>
        h.lab.operation({
          kind: 'annotateRun',
          commandId: randomUUID(),
          runId,
          text: 'A private observation quoted in retained operator notes.',
          tags: ['native-disclosure-fixture'],
        }),
      );
    expect(await annotate(originalRunId)).toMatchObject({ ok: true });
    await h.authorized(async () => {
      await h.lab.runs.retain(originalRunId, 'Private retained run name');
      await h.lab.runs.reset();
      // Exercise past-record updates as well as the current in-memory run owner.
      await h.lab.runs.retain(originalRunId, 'Private renamed run');
      await h.lab.runs.bindComparison(originalRunId, {
        originId: randomUUID(),
        variantName: 'Declared comparison variant',
        comparisonId: randomUUID(),
      });
    });
    expect(await annotate(originalRunId)).toMatchObject({ ok: true });
    const children = await h.authorized(async () => [
      ...(await h.lab.records.pageRecords('interval', { runId: originalRunId })).items,
      ...(await h.lab.records.pageRecords('annotation', { runId: originalRunId })).items,
    ]);
    expect(children.map((record) => record.kind).sort()).toEqual([
      'annotation',
      'annotation',
      'interval',
    ]);
    for (const record of children)
      expect((record.summary as { privacy: unknown }).privacy).toEqual(originalPrivacy);
    const rewritten = await h.authorized(() => h.lab.records.getRecord(originalRunId, 'run'));
    expect((rewritten!.summary as { privacy: unknown }).privacy).toEqual(originalPrivacy);
    expect(rewritten!.data).toMatchObject({
      name: 'Private renamed run',
      counts: { annotations: 2 },
      comparison: { variantName: 'Declared comparison variant' },
    });
    expect(await advance()).toMatchObject({ ok: true });
    const currentBeforeForget = h.lab.runs.current!.id;
    expect(currentBeforeForget).not.toBe(originalRunId);
    expect((await h.authorized(() => h.lab.workspace())).run?.id).toBe(currentBeforeForget);

    await h.authorized(async (authority) => {
      expect(
        await h.lab.runtime.service.forgetMemory(NPC_ID, memoryId!, authority.scope),
      ).toMatchObject({ ok: true, code: 'forgotten' });
    });
    const read = (id: string) => h.authorized(() => h.lab.records.getRecord(id));
    for (const id of [originalRunId, ...children.map((record) => record.id)])
      await expect(read(id)).rejects.toThrow(/restriction|protected|forgetting/i);
    expect((await h.authorized(() => h.lab.workspace())).run).toBeUndefined();
    await h.authorized(() => h.lab.runs.reset());

    // A new run captured after forgetting remains available. Rewrites must never
    // substitute this later proof into the older run or any of its child rows.
    expect(await advance()).toMatchObject({ ok: true });
    const permittedRunId = h.lab.runs.current!.id;
    expect(permittedRunId).not.toBe(originalRunId);
    expect(await annotate(permittedRunId)).toMatchObject({ ok: true });
    const permittedNote = await h.authorized(
      async () =>
        (await h.lab.records.pageRecords('annotation', { runId: permittedRunId })).items[0]!,
    );
    const imported = await h.authorized(() =>
      h.lab.operation({
        kind: 'importGameSnapshot',
        commandId: randomUUID(),
        expected: h.lab.expected,
      }),
    );
    expect(imported, JSON.stringify(imported)).toMatchObject({ ok: true });
    h.lab.runtime.clock.setBlocked(true);
    await h.lab.runtime.clock.idle();
    expect(h.lab.runtime.service.world.id).toBe(h.game.service.world.id);
    expect(h.lab.runtime.service.world.experience?.forgotten[NPC_ID] ?? []).toEqual([]);
    for (const id of [originalRunId, ...children.map((record) => record.id)])
      await expect(read(id)).rejects.toThrow(/restriction|protected|forgetting/i);
    expect((await read(permittedRunId))?.id).toBe(permittedRunId);
    expect((await read(permittedNote.id))?.id).toBe(permittedNote.id);
  }, 120_000);

  it('keeps a forgotten source unavailable after an imported world reuses its NPC identity', async () => {
    const h = await harness();
    const sourceWorldId = h.lab.runtime.service.world.id;
    expect(sourceWorldId).not.toBe(h.game.service.world.id);
    expect(entityGet(h.game.service.world.entities, NPC_ID)?.actor).toBeDefined();

    const [forgottenId, retainedId] = await editWorld(h.lab.runtime.service, (world) =>
      ['An observation that will be forgotten.', 'A separate observation still permitted.'].map(
        (summary) =>
          appendMemory(world, NPC_ID, {
            kind: 'episode',
            source: 'observed',
            summary,
            entityIds: [],
            importance: 6,
          })!,
      ),
    );
    const capture = (memoryId: string) =>
      h.authorized(async (authority) => {
        const service = h.lab.runtime.service;
        const source = await service.personMemoryJson(
          NPC_ID,
          `memory:${memoryId}`,
          authority.scope,
        );
        if (!source.ok || !('json' in source))
          throw new Error('The native source was not readable.');
        const world = service.world;
        const artifact = await h.lab.records.putArtifact(source.json, 'application/json');
        // Only the retained evidence metadata is synthesized. The source, forget,
        // import, disclosure owner and byte consumer are native; no AI call is claimed.
        await h.lab.records.putRecord(
          {
            id: randomUUID(),
            kind: 'stage',
            actorId: NPC_ID,
            name: 'Native source disclosure specimen',
            createdAt: new Date().toISOString(),
            summary: labJson({
              worldId: world.id,
              ownerAccountId: world.authorship?.playerAccountIds[NPC_ID] ?? null,
              forgottenDigest: digest(world.experience?.forgotten[NPC_ID] ?? []),
              correctionDigest: digest(world.experience?.corrections?.[NPC_ID] ?? {}),
              privacy: {
                ownerAccountId: authority.scope.accountId,
                sourceWorldId: world.id,
                privateActorIds: [],
                forgottenDigest: digest(world.experience?.forgotten ?? {}),
                correctionDigest: digest(world.experience?.corrections ?? {}),
              },
            }),
            data: { kind: 'native-source-disclosure-fixture' },
          },
          { references: [{ kind: 'artifact', id: artifact.id }] },
        );
        return { id: artifact.id, text: source.json };
      });
    const read = (id: string) => h.authorized(() => h.lab.records.readArtifactChunk(id));
    const forgotten = await capture(forgottenId!);
    expect((await read(forgotten.id)).bytes.toString('utf8')).toBe(forgotten.text);
    await h.authorized(async (authority) => {
      expect(
        await h.lab.runtime.service.forgetMemory(NPC_ID, forgottenId!, authority.scope),
      ).toMatchObject({ ok: true, code: 'forgotten' });
    });
    expect(h.lab.runtime.service.world.experience?.forgotten[NPC_ID]).toContain(forgottenId);
    await expect(read(forgotten.id)).rejects.toThrow(/restriction|protected|forgetting/i);
    const retained = await capture(retainedId!);
    expect(retained.text).toContain('A separate observation still permitted.');
    expect((await read(retained.id)).bytes.toString('utf8')).toBe(retained.text);

    const imported = await h.authorized(() =>
      h.lab.operation({
        kind: 'importGameSnapshot',
        commandId: randomUUID(),
        expected: h.lab.expected,
      }),
    );
    expect(imported, JSON.stringify(imported)).toMatchObject({ ok: true });
    h.lab.runtime.clock.setBlocked(true);
    await h.lab.runtime.clock.idle();
    const worldB = h.lab.runtime.service.world;
    expect(worldB.id).toBe(h.game.service.world.id);
    expect(worldB.id).not.toBe(sourceWorldId);
    expect(entityGet(worldB.entities, NPC_ID)?.actor).toBeDefined();
    expect(worldB.experience?.forgotten[NPC_ID] ?? []).toEqual([]);
    await expect(read(forgotten.id)).rejects.toThrow(/restriction|protected|forgetting/i);
    expect((await read(retained.id)).bytes.toString('utf8')).toBe(retained.text);
  }, 120_000);
});
