import { afterEach, describe, expect, it } from 'vitest';
import { createGameServer } from './http.js';
import { readConfig } from './config.js';
import { SqliteStore } from './store.js';
import type { GameView } from '@open-legend/protocol';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});
async function start(godMode = false) {
  const game = await createGameServer({
    config: readConfig({ OPEN_LEGEND_GOD_MODE: String(godMode) }),
    store: new SqliteStore(':memory:'),
    production: true,
    tick: false,
  });
  await new Promise<void>((resolve, reject) => {
    game.server.once('error', reject);
    game.server.listen(0, '127.0.0.1', resolve);
  });
  cleanup.push(() => game.close());
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing listener');
  const base = `http://127.0.0.1:${address.port}`;
  const initial = await fetch(`${base}/api/state`);
  const cookie = initial.headers.get('set-cookie')!.split(';')[0]!;
  const post = (path: string, body: unknown, origin = base) =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie },
      body: JSON.stringify(body),
    });
  return { game, base, cookie, post, initial: (await initial.json()) as GameView };
}

describe('local HTTP boundary', () => {
  it('gates private mind inspection on god mode, owner session, origin and strict input', async () => {
    const ordinary = await start();
    expect((await ordinary.post('/api/god/mind', { actorId: 'ada' })).status).toBe(403);
    const god = await start(true);
    expect(
      (await god.post('/api/god/mind', { actorId: 'ada' }, 'https://unrelated.example')).status,
    ).toBe(403);
    expect((await god.post('/api/god/mind', { actorId: 'ada', grant: true })).status).toBe(400);
    const response = await god.post('/api/god/mind', { actorId: 'ada' });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.mind.documents[0].id).toBe('identity');
    const noCookie = await fetch(god.base + '/api/god/mind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: god.base },
      body: JSON.stringify({ actorId: 'ada' }),
    });
    expect(noCookie.status).toBe(403);
    expect(JSON.stringify(god.initial)).not.toContain('My beginnings');
  });
  it('gates god world editing and persists spawned people and revival while paused', async () => {
    const ordinary = await start();
    expect(
      (await ordinary.post('/api/god/spawn', { type: 'hare', position: { x: 24, z: 5 } })).status,
    ).toBe(403);
    const { post, game, initial } = await start(true);
    expect(initial.godTools?.spawnOptions[0]).toEqual({ id: 'person', label: 'Person' });
    expect(initial.godTools?.spawnOptions.slice(1).map((option) => option.label)).toEqual(
      [...initial.godTools!.spawnOptions.slice(1).map((option) => option.label)].sort(),
    );
    expect(game.service.paused).toBe(true);
    expect(
      (
        await (
          await post('/api/god/spawn', {
            type: 'hare',
            position: { x: 24, z: 5 },
          })
        ).json()
      ).code,
    ).toBe('spawned');
    const created = await (
      await post('/api/god/person', {
        position: { x: 25, z: 5 },
        name: 'Mira',
        personality: 'Warm and direct.',
        backstory: 'A patient traveler.',
        traitIds: ['curious', 'steadfast'],
        initialGoals: ['Find a safe route home.'],
      })
    ).json();
    expect(created).toMatchObject({ ok: true, code: 'spawned' });
    const person = Object.values(game.service.world.entities).find(
      (entity) => entity.name === 'Mira',
    )!;
    expect(person.actor).toMatchObject({
      personality: 'Warm and direct.',
      backstory: 'A patient traveler.',
      initialGoals: ['Find a safe route home.'],
    });
    expect(game.service.world.minds?.[person.id]?.documents[0]?.text).toContain(
      'A patient traveler.',
    );
    person.actor!.alive = false;
    person.actor!.health = 0;
    expect((await (await post('/api/god/revive', { actorId: person.id })).json()).code).toBe(
      'revived',
    );
    expect(person.actor!.alive).toBe(false);
    expect(game.service.world.entities[person.id]!.actor!.alive).toBe(true);
    expect(
      (
        await post('/api/god/person', {
          position: { x: 26, z: 5 },
          name: 'Extra',
          personality: '',
          backstory: '',
          traitIds: [],
          initialGoals: [],
          stats: { health: 1000 },
        })
      ).status,
    ).toBe(400);
  });
  it('uses the event connection for opted-in background play and pauses when it closes', async () => {
    const { game, base, cookie, post } = await start();
    const controller = new AbortController();
    try {
      const stream = await fetch(`${base}/api/events`, {
        headers: { Cookie: cookie },
        signal: controller.signal,
      });
      expect(stream.status).toBe(200);
      expect(game.service.paused).toBe(true);
      expect((await post('/api/profile/preferences', { pauseWhenHidden: 'false' })).status).toBe(
        400,
      );
      expect((await post('/api/profile/preferences', {})).status).toBe(400);
      await post('/api/profile/preferences', { pauseWhenHidden: false });
      await post('/api/profile/preferences', { showUnavailableActions: true });
      expect(game.service.profile.preferences).toEqual({
        pauseWhenHidden: false,
        showUnavailableActions: true,
      });
      await post('/api/control', { speed: 0.5 });
      game.service.tick(1);
      expect(game.service.world.simTime).toBe(30);
      controller.abort();
      await expect.poll(() => game.service.paused).toBe(true);
      game.service.tick(1);
      expect(game.service.world.simTime).toBe(30);
    } finally {
      controller.abort();
    }
  });

  it('exposes a read-only complete catalogue and persists only validated preferences for the local principal', async () => {
    const { post, game } = await start();
    await post('/api/control', { paused: false, clientId: 'catalogue-test' });
    const original = JSON.stringify(game.service.world);
    const response = await post('/api/actions', {});
    expect(response.status).toBe(200);
    const report = await response.json();
    expect(report.catalogue.actions.length).toBeGreaterThan(10);
    expect(JSON.stringify(game.service.world)).toBe(original);
    expect(game.service.store.recentJobs()).toEqual([]);
    expect((await post('/api/actions', { actorId: 'ada' })).status).toBe(400);
    expect(
      (await post('/api/profile/preferences', { showUnavailableActions: 'true' })).status,
    ).toBe(400);
    expect(
      (await post('/api/profile/preferences', { showUnavailableActions: true, profileId: 'other' }))
        .status,
    ).toBe(400);
    expect(
      (
        await post(
          '/api/profile/preferences',
          { showUnavailableActions: true },
          'https://unrelated.example',
        )
      ).status,
    ).toBe(403);
    expect(game.service.profile.preferences.showUnavailableActions).toBe(false);
    expect(
      (await (await post('/api/profile/preferences', { showUnavailableActions: true })).json())
        .profile.preferences.showUnavailableActions,
    ).toBe(true);
  });
  it('boots an absent paused world and publishes only the permitted player projection', async () => {
    const { initial } = await start();
    expect(initial.clock.pauseReason).toBe('away');
    expect(initial.ai.mode).toBe('unconfigured');
    expect(initial.recipes).toEqual([]);
    expect(initial).not.toHaveProperty('memories');
    expect(initial).not.toHaveProperty('items');
    expect(JSON.stringify(initial)).not.toContain('planGeneration');
  });
  it('requires both local session and same origin for mutation', async () => {
    const { base, post, game } = await start();
    expect(
      (await post('/api/control', { paused: false }, 'https://unrelated.example')).status,
    ).toBe(403);
    expect(
      (
        await fetch(`${base}/api/control`, {
          method: 'POST',
          headers: { Origin: base, 'Content-Type': 'application/json' },
          body: '{"paused":false}',
        })
      ).status,
    ).toBe(401);
    expect(game.service.paused).toBe(true);
  });
  it('resumes immediately from away and ignores an older hidden-tab notification', async () => {
    const { post, game } = await start();
    const missingPresence = await (await post('/api/control', { paused: false })).json();
    expect(missingPresence).toMatchObject({ ok: false, code: 'away' });
    expect(game.service.paused).toBe(true);

    const resumed = await (
      await post('/api/control', {
        paused: false,
        clientId: 'returning-tab',
        presenceSequence: 2,
      })
    ).json();
    expect(resumed.ok).toBe(true);
    expect(game.service.paused).toBe(false);
    game.service.tick(1);
    expect(game.service.world.simTime).toBe(60);

    await post('/api/presence', { clientId: 'returning-tab', visible: false, sequence: 1 });
    expect(game.service.paused).toBe(false);
    await post('/api/presence', { clientId: 'returning-tab', visible: false, sequence: 3 });
    expect(game.service.pauseReason).toBe('away');
    await post('/api/presence', { clientId: 'returning-tab', visible: true, sequence: 2 });
    expect(game.service.pauseReason).toBe('away');
  });
  it('does not renew presence from speed changes or while manually pausing', async () => {
    const { post, game } = await start();
    await post('/api/control', { speed: 3, clientId: 'away-tab', presenceSequence: 1 });
    expect(game.service.present).toBe(false);
    await post('/api/control', { paused: true, clientId: 'away-tab', presenceSequence: 2 });
    expect(game.service.present).toBe(false);
    expect(game.service.pauseReason).toBe('manual');
    await post('/api/control', { paused: false, clientId: 'away-tab', presenceSequence: 3 });
    expect(game.service.paused).toBe(false);
    expect(game.service.speed).toBe(3);
  });
  it('supports presence, controls and idempotent native actions without AI', async () => {
    const { post, game } = await start();
    await post('/api/presence', { clientId: 'test-client', visible: true });
    expect(game.service.paused).toBe(false);
    const food = Object.values(game.service.world.items).find(
      (item) => item.ownerId === 'player' && item.definitionId === 'berries',
    )!;
    const body = { commandId: 'eat-once', command: { type: 'eat', itemId: food.id } };
    expect((await (await post('/api/command', body)).json()).ok).toBe(true);
    await post('/api/command', body);
    expect(game.service.world.items[food.id]?.quantity).toBe(food.quantity - 1);
    expect(game.service.store.usage(0).usage.llmCalls).toBe(0);
    await post('/api/control', { paused: true, speed: 3 });
    const time = game.service.world.simTime;
    game.service.tick(1);
    expect(game.service.world.simTime).toBe(time);
    expect(game.service.speed).toBe(3);
  });
  it('rejects extra authority, unbounded text and unsupported controls', async () => {
    const { post } = await start();
    expect(
      (await post('/api/command', { commandId: 'x', actorId: 'ada', command: { type: 'rest' } }))
        .status,
    ).toBe(400);
    expect((await post('/api/control', { speed: 10000 })).status).toBe(400);
    expect((await post('/api/chat', { requestId: 'x', text: 'x'.repeat(1001) })).status).toBe(400);
  });
  it('returns an explicit unavailable result rather than a pretend generated recipe', async () => {
    const { post, game } = await start();
    await post('/api/presence', { clientId: 'test-client', visible: true });
    const result = await (
      await post('/api/invent', { requestId: 'sling', text: 'Invent a sling.' })
    ).json();
    expect(result.code).toBe('unconfigured');
    expect(game.service.world.recipes).toEqual({});
  });
});
