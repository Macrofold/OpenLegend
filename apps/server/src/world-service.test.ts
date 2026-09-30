import { testRepository } from '../../../tests/fixtures/database.js';
import { enterLocalWorld, editWorld } from '../../../tests/fixtures/service.js';
import { PLAYER_ID, NPC_ID } from '@open-legend/domain';
import { setSpatialPosition, worldSupport } from '@open-legend/domain';
import { worldPosition } from '@open-legend/domain';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createItemLot, quantityOf, seedAgency } from '@open-legend/domain';
import { readConfig } from '../../../tests/fixtures/database.js';
import { SqlGameRepository } from './store.js';
import { projectView } from './view.js';
import { WorldService } from './world-service.js';

const stores = new Set<SqlGameRepository>();
const directories: string[] = [];
async function setup(path: string | undefined = undefined, existingClock?: { now: number }) {
  const store = await testRepository(path);
  stores.add(store);
  const clock = existingClock ?? { now: 1_800_000_000_000 };
  const config = readConfig({
    WORLD_SEED: '73',
    TYPESAFE_API_KEY: 'private-jev-key',
    OPENAI_API_KEY: 'private-llm-key',
  });
  const service = new WorldService(store, config, () => clock.now);
  await enterLocalWorld(service);
  return { store, clock, service };
}
async function activate(service: WorldService): Promise<void> {
  await service.setPresence('test-client', true);
}
/** New starts carry no food; see docs/worlds/base/survival.md. */
async function withFixtureFood(service: WorldService): Promise<void> {
  await editWorld(service, (world) =>
    createItemLot(world, PLAYER_ID, 'berries', 3, 'fixture-food'),
  );
}
async function run(
  service: WorldService,
  clock: { now: number },
  realSeconds: number,
): Promise<void> {
  const frames = Math.round(realSeconds / 0.25);
  for (let frame = 0; frame < frames; frame++) {
    clock.now += 250;
    await service.setPresence('test-client', true);
    await service.tick(0.25);
  }
}
afterEach(async () => {
  for (const store of stores) await store.close();
  stores.clear();
  for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe('world presence, time and durable commands', () => {
  it('runs connected background tabs through heartbeat expiry only when opted in, without overriding manual pause', async () => {
    const { service, clock } = await setup();
    await service.setConnection('background-stream', true);
    expect(service.paused).toBe(true);
    await service.setPreferences({ pauseWhenHidden: false });
    expect(service.paused).toBe(false);
    await activate(service);
    await service.setPresence('test-client', false);
    clock.now += 60_000;
    await service.tick(1);
    expect(service.world.simTime).toBe(60);
    await service.setPreferences({ pauseWhenHidden: true });
    expect(service.world.paused).toBe(true);
    await service.tick(1);
    expect(service.world.simTime).toBe(60);
    await service.control({ paused: true });
    await service.setPreferences({ pauseWhenHidden: false });
    expect(service.pauseReason).toBe('manual');
    expect((await service.control({ paused: false })).ok).toBe(true);
    await service.setConnection('another-stream', true);
    await service.setConnection('background-stream', false);
    expect(service.paused).toBe(false);
    await service.setConnection('another-stream', false);
    expect(service.pauseReason).toBe('away');
    await service.tick(1);
    expect(service.world.simTime).toBe(60);
    clock.now += 60_000;
    await service.setConnection('returned-stream', true);
    expect(service.world.simTime).toBe(60);
    await service.tick(0.5);
    expect(service.world.simTime).toBe(90);
  });

  it('preserves independent settings and half speed across PostgreSQL restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'open-legend-time-migration-'));
    directories.push(directory);
    const path = directory;
    const initial = await setup(path);
    await initial.service.ready;
    await initial.service.setPreferences({ showUnavailableActions: true });
    await initial.service.setPreferences({ pauseWhenHidden: false });
    await initial.service.setPreferences({ showUnavailableActions: false });
    await initial.service.control({ speed: 0.5 });
    await initial.store.close();
    stores.delete(initial.store);
    const restored = await setup(path);
    await restored.service.ready;
    expect(restored.service.profile.preferences).toMatchObject({
      showUnavailableActions: false,
      pauseWhenHidden: false,
    });
    expect(restored.service.speed).toBe(0.5);
    expect(restored.service.paused).toBe(true);
    await restored.service.setConnection('returning-stream', true);
    await restored.service.tick(0.25);
    expect(restored.service.world.simTime).toBe(7.5);
    // Updating the unrelated menu preference must preserve fractional game time.
    await restored.service.setPreferences({ showUnavailableActions: true });
    await restored.service.tick(0.25);
    expect(restored.service.world.simTime).toBe(15);
  });

  it('starts absent and advances the requested game time at each speed', async () => {
    await Promise.all(
      [0.5, 1, 3, 8].map(async (speed) => {
        const { service, clock } = await setup();
        expect(service.paused).toBe(true);
        expect(service.pauseReason).toBe('away');
        await service.tick(1);
        expect(service.world.simTime).toBe(0);
        await activate(service);
        expect((await service.control({ speed })).ok).toBe(true);
        expect(
          (
            await service.command('rest', {
              type: 'status-effect',
              definitionId: 'wilderness:restorative-rest',
              targetId: PLAYER_ID,
              effectOperation: 'activate',
            })
          ).ok,
        ).toBe(true);
        await run(service, clock, 6 / speed);
        expect(service.world.simTime).toBeCloseTo(360, 9);
      }),
    );
  });
  it('freezes immediately on explicit absence and performs no return catch-up', async () => {
    const { service, clock } = await setup();
    await activate(service);
    await run(service, clock, 1);
    await service.setPresence('test-client', false);
    const before = structuredClone(service.world);
    clock.now += 60_000;
    await service.tick(60);
    expect(service.world).toEqual(before);
    await activate(service);
    expect(service.world.simTime).toBe(before.simTime);
    await service.tick(0.25);
    expect(service.world.simTime).toBe(before.simTime + 15);
  });
  it('refreshes the local composition scope while fencing already captured control scopes', async () => {
    const { service } = await setup();
    const captured = service.localScope;
    expect(service.currentScope(captured, 'play', true)).toBe(true);
    expect(
      (
        await service.changeEmbodiment(captured, {
          id: 'replace-control',
          expectedGeneration: captured.controlGeneration,
          operation: 'replace',
        })
      ).ok,
    ).toBe(true);
    expect(service.currentScope(captured, 'play', true)).toBe(false);
    expect(service.currentScope(service.localScope, 'play', true)).toBe(true);
  });
  it('expires a silent connection after the 12-second grace period', async () => {
    const { service, clock } = await setup();
    await activate(service);
    await service.tick(0.25);
    const time = service.world.simTime;
    clock.now += 12_001;
    await service.tick(0.25);
    expect(service.paused).toBe(true);
    expect(service.world.paused).toBe(true);
    expect(service.pauseReason).toBe('away');
    expect(service.world.simTime).toBe(time);
  });
  it('keeps manual pause across reconnect and rejects paused speech/actions', async () => {
    const { service, clock } = await setup();
    await activate(service);
    await service.command('rest', {
      type: 'status-effect',
      definitionId: 'wilderness:restorative-rest',
      targetId: PLAYER_ID,
      effectOperation: 'activate',
    });
    await service.control({ paused: true });
    const state = structuredClone(service.world);
    await run(service, clock, 3);
    await service.setPresence('test-client', false);
    await activate(service);
    expect(service.world).toEqual(state);
    expect(service.pauseReason).toBe('manual');
    expect((await service.say('paused-speech', NPC_ID, 'This was never spoken.')).code).toBe(
      'paused',
    );
    expect(
      (
        await service.command('paused-eat', {
          type: 'status-effect',
          definitionId: 'wilderness:restorative-rest',
          targetId: PLAYER_ID,
          effectOperation: 'activate',
        })
      ).code,
    ).toBe('paused');
    expect(JSON.stringify((await projectView(service)).conversation)).not.toContain(
      'This was never spoken.',
    );
  });
  it('drops a suspended wall-clock interval rather than replaying offline work', async () => {
    const { service } = await setup();
    await activate(service);
    await service.tick(0.01);
    expect(service.world.simTime).toBe(0.6);
    await service.tick(5);
    expect(service.world.simTime).toBe(0.6);
    await service.tick(0.25);
    expect(service.world.simTime).toBe(15.6);
  });
  it('preserves short scheduling debt at the highest supported speed', async () => {
    const { service, clock } = await setup();
    await activate(service);
    await service.control({ speed: 8 });
    clock.now += 1000;
    await service.tick(1);
    // Eight smaller frames provide room to drain a bounded backlog while time keeps running.
    for (let frame = 0; frame < 8; frame++) {
      clock.now += 125;
      await service.setPresence('test-client', true);
      await service.tick(0.125);
    }
    expect(service.world.simTime).toBeCloseTo(2 * 60 * 8, 9);
  });
  it('restores work and pause preferences without repeating commands or elapsed real time', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'open-legend-world-test-'));
    directories.push(directory);
    const path = directory;
    const clock = { now: 1_800_000_000_000 };
    const initial = await setup(path, clock);
    await activate(initial.service);
    await withFixtureFood(initial.service);
    const berry = (await projectView(initial.service)).player.inventory.find(
      (item) => item.definitionId === 'berries',
    )!;
    expect((await initial.service.command('eat-once', { type: 'eat', itemId: berry.id })).ok).toBe(
      true,
    );
    await initial.service.command('rest', {
      type: 'status-effect',
      definitionId: 'wilderness:restorative-rest',
      targetId: PLAYER_ID,
      effectOperation: 'activate',
    });
    await run(initial.service, clock, 1);
    await initial.service.control({ speed: 3, paused: true });
    const previous = structuredClone(initial.service.world);
    await initial.store.close();
    stores.delete(initial.store);
    clock.now += 7 * 86400_000;
    const restored = await setup(path, clock);
    await activate(restored.service);
    expect(restored.service.world.simTime).toBe(previous.simTime);
    expect(restored.service.world.entities[PLAYER_ID]!.actor!.action).toEqual(
      previous.entities[PLAYER_ID]!.actor!.action,
    );
    expect(restored.service.speed).toBe(3);
    expect(restored.service.pauseReason).toBe('manual');
    await restored.service.control({ paused: false });
    expect(
      (await restored.service.command('eat-once', { type: 'eat', itemId: berry.id })).code,
    ).toBe('duplicate');
    expect(quantityOf(restored.service.world, PLAYER_ID, 'berries')).toBe(2);
    expect(restored.service.world.simTime).toBe(previous.simTime);
    await run(restored.service, clock, 0.25);
    expect(restored.service.world.simTime).toBe(previous.simTime + 45);
  });
  it('pauses on ambiguous persistence completion and recovers its committed receipt', async () => {
    const { service, store, clock } = await setup();
    await activate(service);
    await withFixtureFood(service);
    const berry = (await projectView(service)).player.inventory.find(
      (item) => item.definitionId === 'berries',
    )!;
    const realCommit = store.commit.bind(store);
    vi.spyOn(store, 'commit').mockImplementationOnce(async (revision, saved) => {
      await realCommit(revision, saved);
      throw new Error('Connection lost after commit.');
    });
    expect((await service.command('ambiguous-eat', { type: 'eat', itemId: berry.id })).code).toBe(
      'storage',
    );
    expect(service.paused).toBe(true);
    expect(service.pauseReason).toBe('storage');
    expect(quantityOf(service.world, PLAYER_ID, 'berries')).toBe(3);
    expect(quantityOf((await store.load())!.state.world, PLAYER_ID, 'berries')).toBe(2);
    await service.tick(1);
    expect(service.world.simTime).toBe(0);
    const restored = new WorldService(store, service.config, () => clock.now);
    await enterLocalWorld(restored);
    await activate(restored);
    expect((await restored.command('ambiguous-eat', { type: 'eat', itemId: berry.id })).code).toBe(
      'duplicate',
    );
    expect(quantityOf(restored.world, PLAYER_ID, 'berries')).toBe(2);
  });
});

describe('public projection', () => {
  it('excludes private minds, receipts, keys and unheard historical speech', async () => {
    const { service, store } = await setup();
    await activate(service);
    await editWorld(service, (world) => {
      world.entities[NPC_ID]!.actor!.agency = seedAgency(['secret-npc-intention']);
      world.memories[NPC_ID]!.push({
        id: 'private-memory',
        actorId: NPC_ID,
        kind: 'reflection',
        source: 'inferred',
        summary: 'secret-inner-history',
        at: 0,
        entityIds: [],
        importance: 10,
      });
      setSpatialPosition(
        world,
        world.entities[NPC_ID]!,
        { y: 0, x: 26, z: 22 },
        worldSupport(world.entities[NPC_ID]!),
      );
    });
    expect(
      (await service.say('unheard', NPC_ID, 'secret-unheard-speech', undefined, 'whisper')).ok,
    ).toBe(true);
    await editWorld(service, (world) => {
      setSpatialPosition(
        world,
        world.entities[NPC_ID]!,
        { y: 0, x: 12, z: 13 },
        worldSupport(world.entities[NPC_ID]!),
      );
    });
    await store.putJob({
      id: 'private-job',
      kind: 'thought',
      status: 'completed',
      message: 'secret-selected-plan-and-unseen-resource',
      fingerprint: 'secret-request-fingerprint',
      createdAt: 1,
      request: { text: 'secret-request-text' },
      result: { reflection: 'secret-result' },
    });
    await expect
      .poll(async () =>
        (await projectView(service)).ai.jobs.some((job) => job.id === 'private-job'),
      )
      .toBe(true);
    const view = await projectView(service);
    const serialized = JSON.stringify(view);
    for (const secret of [
      'secret-npc-intention',
      'secret-inner-history',
      'secret-unheard-speech',
      'secret-request-fingerprint',
      'secret-request-text',
      'secret-result',
      'secret-selected-plan-and-unseen-resource',
      'private-jev-key',
      'private-llm-key',
    ])
      expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain('commandReceipts');
    // Sight of speaking is public; the unheard words remain absent.
    expect(view.conversation).toMatchObject([
      { speech: { perception: 'seen', intelligibility: 'none', segments: [] } },
    ]);
    expect(
      service.observe(NPC_ID)!.memories.some((memory) => memory.summary === 'secret-inner-history'),
    ).toBe(false); // Legacy unbounded authored notes are audit-only.
  });
  it('keeps zero-duration movement progress a finite public number', async () => {
    const { service } = await setup();
    await activate(service);
    await service.command('already-there', {
      type: 'move',
      position: { ...worldPosition(service.world.entities[PLAYER_ID]!), surfaceId: 'terrain' },
    });
    const action = (await projectView(service)).player.action;
    expect(action === null || Number.isFinite(action.progress)).toBe(true);
  });
});
