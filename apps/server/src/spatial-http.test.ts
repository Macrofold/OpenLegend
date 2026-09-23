import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { advanceWorld } from '@open-legend/domain';
import type { GameView } from '@open-legend/protocol';
import { createGameServer } from './http.js';
import { readConfig } from './config.js';
import { SqliteStore } from './store.js';

it('requires exact 3D surface intentions and preserves the HTTP retry boundary', async () => {
  const game = await createGameServer({
    config: readConfig({ AI_BUDGET_USD: '0' }),
    store: new SqliteStore(':memory:'),
    production: true,
    tick: false,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing server address');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetch(base + '/api/state');
    const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
    const view = (await response.json()) as GameView;
    const post = (path: string, body: unknown, origin = base) =>
      fetch(base + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie, origin },
        body: JSON.stringify(body),
      });
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
    await game.service.transition((world) => advanceWorld(world, 280));
    expect(game.service.world.entities[view.player.id]!.position).toEqual({ x: 24, y: 3, z: 6 });
    const incorrect = await (
      await post('/api/command', {
        ...envelope,
        commandId: 'wrong-floor',
        command: { type: 'move', position: { x: 24, y: 3, z: 6, surfaceId: 'terrain' } },
      })
    ).json();
    expect(incorrect.ok).toBe(false);
    expect(game.service.world.entities[view.player.id]!.spatial.supportSurfaceId).toBe(
      'lookout-deck',
    );
  } finally {
    await game.close();
  }
});

it('restores a saved elevated route and native flight through SQLite and manual slots', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'openlegend-spatial-'));
  const config = readConfig({ AI_BUDGET_USD: '0', OPEN_LEGEND_DATA_DIR: directory });
  let game = await createGameServer({
    config,
    store: new SqliteStore(config.databasePath),
    production: true,
    tick: false,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  try {
    const actorId = game.service.controlledEntityId;
    await game.service.control({ paused: false, clientId: 'save-fixture' });
    await game.service.command('saved-ramp', {
      type: 'move',
      position: { x: 20, y: 3, z: 5.5, surfaceId: 'lookout-deck' },
    });
    for (let n = 0; n < 250 && game.service.world.entities[actorId]!.position.y < 0.1; n++)
      await game.service.transition((world) => advanceWorld(world, 1));
    const snapshot = structuredClone(game.service.world.entities[actorId]);
    expect(snapshot!.spatial.supportSurfaceId).toBe('lookout-ramp');
    const id = randomUUID();
    await game.service.createSave('On the ramp', id);
    const stored = await game.service.store.saves!.read(game.service.world.id, id);
    expect(stored.format).toBe('development-2026-09-22-spatial1');
    await game.close();
    game = await createGameServer({
      config,
      store: new SqliteStore(config.databasePath),
      production: true,
      tick: false,
    });
    await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
    expect(game.service.world.entities[actorId]).toEqual(snapshot);
    await game.service.control({ paused: false, clientId: 'save-fixture' });
    await game.service.transition((world) => advanceWorld(world, 150));
    expect(game.service.world.entities[actorId]!.position.y).toBe(3);
    const epoch = game.service.generation;
    await game.service.restoreSave(
      id,
      randomUUID(),
      await game.service.store.saves!.read(game.service.world.id, id),
    );
    expect(game.service.world.entities[actorId]).toEqual(snapshot);
    expect(game.service.world.paused).toBe(true);
    expect(game.service.generation).not.toBe(epoch);
    expect(game.service.world.entities['bird-1']!.spatial).toEqual(
      stored.state.world.entities['bird-1']!.spatial,
    );
  } finally {
    await game.close();
    await rm(directory, { recursive: true, force: true });
  }
});
