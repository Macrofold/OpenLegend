import { localHttpClient } from '../../../tests/fixtures/http.js';
import { enterLocalWorld } from '../../../tests/fixtures/service.js';
import { testRepository } from '../../../tests/fixtures/database.js';
import { worldPosition, worldSupport } from '@open-legend/domain';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import { advanceWorld } from '@open-legend/domain';
import type { GameView } from '@open-legend/protocol';
import { createGameServer } from './http.js';
import { SAVE_FORMAT } from './game-saves.js';
import { readConfig } from '../../../tests/fixtures/database.js';

it('requires exact 3D surface intentions and preserves the HTTP retry boundary', async () => {
  const game = await createGameServer({
    config: readConfig({ AI_BUDGET_USD: '0' }),
    store: await testRepository(),
    production: true,
    tick: false,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing server address');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const { post, view } = await localHttpClient(base);
    expect(view.schemaVersion).toBe(2);
    expect(view.player.position.y).toBe(0);
    expect(JSON.stringify(view)).not.toContain('clearing-bird-loop'); // Private future route is not smoothing data.
    await post('/api/control', { paused: false, clientId: 'spatial-test', presenceSequence: 1 });
    const envelope = {
      commandId: '3d-http-move',
      commandEpoch: view.commandEpoch,
      command: { type: 'move', position: { x: 24, y: 3, z: 6, surfaceId: 'lookout-deck' } },
    };
    expect((await post('/api/command', envelope, 'https://unrelated.invalid')).status).toBe(403);
    expect(
      (
        await post('/api/command', {
          ...envelope,
          command: { type: 'move', position: { x: 24, z: 6 } },
        })
      ).status,
    ).toBe(400);
    expect((await (await post('/api/command', envelope)).json()).ok).toBe(true);
    const first = game.service.world.entities[view.player.id]!.actor!.action!.id;
    expect((await (await post('/api/command', envelope)).json()).ok).toBe(true);
    expect(game.service.world.entities[view.player.id]!.actor!.action!.id).toBe(first);
    await expect
      .poll(() => game.service.world.entities[view.player.id]!.actor!.action?.navigation, {
        timeout: 10_000,
      })
      .toBeUndefined();
    await game.service.transition((world) => advanceWorld(world, 280));
    expect(worldPosition(game.service.world.entities[view.player.id]!)).toEqual({
      x: 24,
      y: 3,
      z: 6,
    });
    const incorrect = await (
      await post('/api/command', {
        ...envelope,
        commandId: 'wrong-floor',
        command: { type: 'move', position: { x: 24, y: 3, z: 6, surfaceId: 'terrain' } },
      })
    ).json();
    expect(incorrect.ok).toBe(false);
    expect(worldSupport(game.service.world.entities[view.player.id]!)).toBe('lookout-deck');
  } finally {
    await game.close();
  }
});

it('restores elevated position and native flight while departure stops unfinished routes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'openlegend-spatial-'));
  const config = readConfig({ AI_BUDGET_USD: '0', OPEN_LEGEND_DATA_DIR: directory });
  let game = await createGameServer({
    config,
    store: await testRepository(config.dataDirectory),
    production: true,
    tick: false,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  try {
    const actorId = game.service.controlledEntityId;
    await enterLocalWorld(game.service);
    await game.service.control({ paused: false, clientId: 'save-fixture' });
    await game.service.command('saved-ramp', {
      type: 'move',
      position: { x: 20, y: 3, z: 5.5, surfaceId: 'lookout-deck' },
    });
    await expect
      .poll(() => game.service.world.entities[actorId]!.actor!.action?.navigation, {
        timeout: 10_000,
      })
      .toBeUndefined();
    for (let n = 0; n < 250 && worldPosition(game.service.world.entities[actorId]!).y < 0.1; n++)
      await game.service.transition((world) => advanceWorld(world, 1));
    const snapshot = structuredClone(game.service.world.entities[actorId]);
    expect(worldSupport(snapshot!)).toBe('lookout-ramp');
    const id = randomUUID();
    await game.service.createSave('On the ramp', id);
    const stored = await game.service.store.saves!.read(game.service.world.id, id);
    expect(stored.format).toBe(SAVE_FORMAT);
    expect(stored.state.world.entities[actorId]).toEqual(snapshot);
    await game.close();
    game = await createGameServer({
      config,
      store: await testRepository(config.dataDirectory),
      production: true,
      tick: false,
    });
    await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
    await enterLocalWorld(game.service);
    expect(game.service.world.entities[actorId]).toEqual({
      ...snapshot,
      actor: {
        ...snapshot!.actor,
        action: null,
        planGeneration: snapshot!.actor!.planGeneration + 1,
        participation: expect.objectContaining({ phase: 'active' }),
      },
    });
    // The slot retains the exact route, but returning does not restart a departed
    // player's unfinished walk: docs/worlds/base/player-danger.md.
    await game.service.control({ paused: false, clientId: 'save-fixture' });
    expect(
      (
        await game.service.command('resume-saved-ramp', {
          type: 'move',
          position: { x: 20, y: 3, z: 5.5, surfaceId: 'lookout-deck' },
        })
      ).ok,
    ).toBe(true);
    await expect
      .poll(() => game.service.world.entities[actorId]!.actor!.action?.navigation, {
        timeout: 10_000,
      })
      .toBeUndefined();
    await game.service.transition((world) => advanceWorld(world, 150));
    expect(worldPosition(game.service.world.entities[actorId]!).y).toBe(3);
    const epoch = game.service.generation;
    await game.service.restoreSave(
      id,
      randomUUID(),
      await game.service.store.saves!.read(game.service.world.id, id),
    );
    expect(game.service.world.entities[actorId]).toEqual({
      ...snapshot,
      actor: {
        ...snapshot!.actor,
        action: null,
        planGeneration: snapshot!.actor!.planGeneration + 1,
        participation: expect.objectContaining({ phase: 'exiting' }),
      },
    });
    expect(game.service.world.paused).toBe(true);
    expect(game.service.generation).not.toBe(epoch);
    expect(game.service.world.entities['bird-1']!.spatial).toEqual(
      stored.state.world.entities['bird-1']!.spatial,
    );
    expect(game.service.storageError).toBeNull();
    expect(game.service.pauseReason).toBe('manual');

    // A completed install cannot hide a failure saving its following departure state.
    const timeline = game.service.timelineId;
    const protectedActor = structuredClone(game.service.world.entities[actorId]);
    const requestId = randomUUID();
    const store = game.service.store;
    const realCommit = store.commit.bind(store);
    let installedRevision: number | undefined;
    let refusedParticipation = 0;
    const commit = vi.spyOn(store, 'commit').mockImplementation(async (...args) => {
      if (
        installedRevision !== undefined &&
        args[4]?.participationChange &&
        !refusedParticipation
      ) {
        refusedParticipation++;
        throw new Error('Fixture refused the participation write before commit.');
      }
      const revision = await realCommit(...args);
      if (args[4]?.restore) installedRevision = revision;
      return revision;
    });
    try {
      await expect(game.service.restoreSave(id, requestId, stored)).rejects.toThrow(
        'The save could not be committed.',
      );
    } finally {
      commit.mockRestore();
    }
    expect(refusedParticipation).toBe(1);
    expect(installedRevision).toBeDefined();
    expect(game.service.storageError).not.toBeNull();
    expect(game.service.pauseReason).toBe('storage');
    expect(game.service.world.paused).toBe(true);
    expect(game.service.timelineId).not.toBe(timeline);
    expect(game.service.world.entities[actorId]!.actor!.action).toEqual(snapshot!.actor!.action);
    expect(await store.records?.head()).toMatchObject({ revision: installedRevision });
    expect(await store.getIntegration(`load-request:${requestId}`)).toEqual({ saveId: id });
    const protection = await store.saves!.read(game.service.world.id, 'before-load');
    expect(protection.state.world.entities[actorId]).toEqual(protectedActor);
    const speed = game.service.speed;
    expect(await game.service.control({ speed: speed === 3 ? 1 : 3 })).toMatchObject({
      ok: false,
      code: 'storage',
    });
    expect(game.service.speed).toBe(speed);
    expect(await store.records?.head()).toMatchObject({ revision: installedRevision });
  } finally {
    await game.close();
    await rm(directory, { recursive: true, force: true });
  }
});
