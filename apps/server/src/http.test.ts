import { entityGet } from '@open-legend/domain';
import { localHttpClient } from '../../../tests/fixtures/http.js';
import { testRepository } from '../../../tests/fixtures/database.js';
import { editWorld } from '../../../tests/fixtures/service.js';
import { PLAYER_ID, NPC_ID } from '@open-legend/domain';
import { allItems, createItemLot, itemFor } from '@open-legend/domain';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seedDecisionInspection } from '../../../tests/fixtures/decision-inspection.js';
import { createGameServer } from './http.js';
import { readConfig } from '../../../tests/fixtures/database.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});
async function start(godMode = false, tick = false) {
  const game = await createGameServer({
    config: readConfig({ OPEN_LEGEND_GOD_MODE: String(godMode) }),
    store: await testRepository(),
    production: true,
    tick,
  });
  await new Promise<void>((resolve, reject) => {
    game.server.once('error', reject);
    game.server.listen(0, '127.0.0.1', resolve);
  });
  cleanup.push(() => game.close());
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing listener');
  const base = `http://127.0.0.1:${address.port}`;
  const { cookie, post, view } = await localHttpClient(base);
  return { game, base, cookie, post, initial: view };
}

describe('local HTTP boundary', () => {
  it('continues bounded clock work without overlap and cancels its wake on close', async () => {
    const { game, post } = await start(false, true);
    const tick = game.service.tick.bind(game.service);
    let calls = 0,
      active = 0,
      peak = 0;
    const draining: Array<boolean | undefined> = [];
    game.service.tick = async (...args) => {
      active++;
      peak = Math.max(peak, active);
      draining.push(args[2]?.drain);
      try {
        const more = await tick(...args);
        // Force two continuation opportunities without depending on this host's
        // timing or how many native boundaries the opening happens to contain.
        return ++calls < 3 || more;
      } finally {
        active--;
      }
    };
    await post('/api/control', { paused: false, clientId: 'bounded-host-clock' });
    await expect.poll(() => calls).toBeGreaterThanOrEqual(3);
    expect(game.service.world.simTime).toBeGreaterThan(0);
    expect(peak).toBe(1);
    expect(draining.every((value) => value === false)).toBe(true);
    await game.close();
    const atClose = calls;
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    expect(calls).toBe(atClose);
  });
  it('E36 shows paired decision details only while inspection remains authorized', async () => {
    const { game, post } = await start(true),
      id = await seedDecisionInspection(game.service);
    const allowed = await post('/api/god/trigger', { id });
    expect(allowed.status).toBe(200);
    expect((await allowed.json()).details.decision).toMatchObject({
      reason: 'The first model returned an unusable structured answer.',
      final: 'Resolved by the fallback model',
      estimatedCostUsd: 0.001,
      heldUsd: 0,
      attempts: 1,
    });
    const original = game.service.store.getJob.bind(game.service.store);
    let entered!: () => void, release!: () => void;
    const waiting = new Promise<void>((done) => {
        entered = done;
      }),
      gate = new Promise<void>((done) => {
        release = done;
      });
    vi.spyOn(game.service.store, 'getJob').mockImplementationOnce(async (key) => {
      const job = await original(key);
      entered();
      await gate;
      return job;
    });
    const reading = post('/api/god/trigger', { id });
    await waiting;
    try {
      await game.service.store.authority!.revokeSession(
        game.service.localScope.sessionId,
        Date.now(),
      );
    } finally {
      release();
    }
    const denied = await reading;
    expect([401, 403]).toContain(denied.status);
    expect(await denied.text()).not.toContain('Resolved by the fallback model');
  });
  it('gates private mind inspection on god mode, owner session, origin and strict input', async () => {
    const ordinary = await start();
    expect((await ordinary.post('/api/god/mind', { actorId: NPC_ID })).status).toBe(403);
    const god = await start(true);
    expect(
      (await god.post('/api/god/mind', { actorId: NPC_ID }, 'https://unrelated.example')).status,
    ).toBe(403);
    expect((await god.post('/api/god/mind', { actorId: NPC_ID, grant: true })).status).toBe(400);
    const response = await god.post('/api/god/mind', { actorId: NPC_ID });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.mind.documents[0].id).toBe('identity');
    const noCookie = await fetch(god.base + '/api/god/mind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: god.base },
      body: JSON.stringify({ actorId: NPC_ID }),
    });
    expect(noCookie.status).toBe(401);
    expect(JSON.stringify(god.initial)).not.toContain('My beginnings');
  });
  it('denies god world editing to ordinary sessions', async () => {
    const ordinary = await start();
    expect(
      (
        await ordinary.post('/api/god/spawn', {
          id: 'denied-spawn',
          type: 'hare',
          position: { y: 0, surfaceId: 'terrain', x: 24, z: 5 },
        })
      ).status,
    ).toBe(403);
  });
  it('uses the event connection for opted-in background play and pauses after departure exposure', async () => {
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
      expect(game.service.profile.preferences).toMatchObject({
        pauseWhenHidden: false,
        showUnavailableActions: true,
      });
      await post('/api/control', { speed: 0.5 });
      await game.service.tick(1);
      expect(game.service.world.simTime).toBe(30);
      controller.abort();
      await expect
        .poll(() => entityGet(game.service.world.entities, PLAYER_ID)?.actor?.participation?.phase)
        .toBe('exiting');
      const departureAt = game.service.world.exitExposures![PLAYER_ID]!;
      expect(game.service.paused).toBe(false);
      await game.service.tick((departureAt - game.service.world.simTime) / 30, 0);
      expect(game.service.paused).toBe(true);
      await game.service.tick(1);
      expect(game.service.world.simTime).toBe(departureAt);
    } finally {
      controller.abort();
    }
  });

  it('exposes a read-only target catalogue and persists only validated preferences for the local principal', async () => {
    const { post, game, initial } = await start();
    await post('/api/control', { paused: false, clientId: 'catalogue-test' });
    const original = JSON.stringify(game.service.world);
    const campfire = initial.entities.find(
      (entity) => entity.name === entityGet(game.service.world.entities, 'campfire')!.name,
    )!;
    const response = await post('/api/actions', { targetId: campfire.id });
    const report = await response.json();
    expect(response.status, JSON.stringify(report)).toBe(200);

    // Evasive destinations belong to ground/self, not a selected campfire.
    expect(report.catalogue.actions.map((action: { label: string }) => action.label)).toEqual([
      'Walk here',
      'Put out Banked campfire',
      'Add Supple branch to Banked campfire',
      'Cook meat at Banked campfire',
      'Cook river fish at Banked campfire',
    ]);
    expect(
      report.catalogue.actions.every((action: { id: string }) => action.id.startsWith('action-')),
    ).toBe(true);
    expect(JSON.stringify(game.service.world)).toBe(original);
    expect(await game.service.store.recentJobs()).toEqual([]);
    expect((await post('/api/actions', { actorId: NPC_ID })).status).toBe(400);
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
    expect(initial.recipes.length).toBeGreaterThan(0);
    expect(new Set(initial.recipes.map((recipe) => recipe.origin))).toEqual(new Set(['authored']));
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
    await game.service.tick(1);
    expect(game.service.world.simTime).toBe(60);

    await post('/api/presence', { clientId: 'returning-tab', visible: false, sequence: 1 });
    expect(game.service.paused).toBe(false);
    await post('/api/presence', { clientId: 'returning-tab', visible: false, sequence: 3 });
    expect(entityGet(game.service.world.entities, PLAYER_ID)?.actor?.participation?.phase).toBe(
      'exiting',
    );
    const departureAt = game.service.world.exitExposures![PLAYER_ID]!;
    await post('/api/presence', { clientId: 'returning-tab', visible: true, sequence: 2 });
    expect(entityGet(game.service.world.entities, PLAYER_ID)?.actor?.participation?.phase).toBe(
      'exiting',
    );
    expect(game.service.world.exitExposures![PLAYER_ID]).toBe(departureAt);
    await game.service.tick((departureAt - game.service.world.simTime) / 60, 0);
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
    // New starts carry no food; see docs/worlds/base/survival.md.
    await editWorld(game.service, (world) =>
      createItemLot(world, PLAYER_ID, 'berries', 3, 'fixture-food'),
    );
    const food = allItems(game.service.world).find(
      (item) => item.ownerId === PLAYER_ID && item.definitionId === 'berries',
    )!;
    const body = {
      commandId: 'eat-once',
      commandEpoch: game.service.commandEpoch,
      command: { type: 'eat', itemId: food.id },
    };
    expect((await (await post('/api/command', body)).json()).ok).toBe(true);
    await post('/api/command', body);
    expect(itemFor(game.service.world, food.id)?.quantity).toBe(food.quantity - 1);
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
    await post('/api/control', { paused: true, speed: 3 });
    const time = game.service.world.simTime;
    await game.service.tick(1);
    expect(game.service.world.simTime).toBe(time);
    expect(game.service.speed).toBe(3);
  });
  it('rejects extra authority, unbounded text and unsupported controls', async () => {
    const { post } = await start();
    expect(
      (
        await post('/api/command', {
          commandId: 'x',
          actorId: NPC_ID,
          command: {
            type: 'status-effect',
            definitionId: 'wilderness:restorative-rest',
            targetId: PLAYER_ID,
            effectOperation: 'activate',
          },
        })
      ).status,
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
    expect(
      Object.values(game.service.world.recipes).every(
        (recipe) => recipe.provenance.source === 'authored-world',
      ),
    ).toBe(true);
  });
});


it('changes player attention through current contacts without speech, AI or body movement', async () => {
  const { game, post, initial } = await start();
  expect((await (await post('/api/control', {paused:false,clientId:'attention-preference-test'})).json()).ok).toBe(true);
  const subject = initial.entities.find((entry) => entry.attentionPreference !== undefined)!;
  expect(subject).toBeDefined();
  const before = game.service.world;
  const focused = await post('/api/attention', {targetId: subject.id});
  expect(focused.status).toBe(200);
  expect((await focused.json()).ok).toBe(true);
  const attention = game.service.world.perceptionEvidence![PLAYER_ID]!.attention!;
  expect(attention.explicit).toHaveLength(1);
  expect(attention.entries.some((entry) => entry.key === attention.explicit[0])).toBe(true);
  expect(game.service.world.simTime).toBe(before.simTime);
  expect(game.service.world.events).toBe(before.events);
  expect(game.service.world.memories[PLAYER_ID]).toBe(before.memories[PLAYER_ID]);
  expect((await post('/api/attention', {targetId: null, actorId: NPC_ID})).status).toBe(400);
  expect((await post('/api/attention', {targetId: NPC_ID})).status).toBe(409);
  expect((await (await post('/api/attention', {targetId: null})).json()).ok).toBe(true);
  expect(game.service.world.perceptionEvidence![PLAYER_ID]!.attention!.explicit).toEqual([]);
});
