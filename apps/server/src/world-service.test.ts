import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { quantityOf, type DeclarationDraft } from '@open-legend/domain';
import { readConfig } from './config.js';
import { SqliteStore } from './store.js';
import { projectView } from './view.js';
import { WorldService } from './world-service.js';

const stores = new Set<SqliteStore>();
const directories: string[] = [];
function setup(path = ':memory:', existingClock?: { now: number }) {
  const store = new SqliteStore(path);
  stores.add(store);
  const clock = existingClock ?? { now: 1_800_000_000_000 };
  const config = readConfig({
    WORLD_SEED: '73',
    TYPESAFE_API_KEY: 'private-jev-key',
    OPENAI_API_KEY: 'private-llm-key',
  });
  const service = new WorldService(store, config, () => clock.now);
  return { store, clock, service };
}
async function activate(service: WorldService): Promise<void> {
  await service.setPresence('test-client', true);
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
const sling = (): DeclarationDraft => ({
  schemaVersion: 1,
  name: 'Fixture river sling',
  description: 'A test-only mechanical composition.',
  inputs: [
    { definitionId: 'cord', quantity: 1, role: 'binding' },
    { definitionId: 'prepared_fiber', quantity: 2, role: 'pouch' },
  ],
  workSeconds: 60,
  output: {
    kind: 'launcher',
    name: 'Fixture river sling',
    description: 'A cord-supported fiber pouch.',
    properties: ['flexible'],
    launcher: { mechanism: 'swing', ammunitionKind: 'stone', damage: 18, range: 7, accuracy: 0.9 },
  },
});
afterEach(async () => {
  for (const store of stores) await store.close();
  stores.clear();
  for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe('world presence, time and durable commands', () => {
  it('omits new and legacy movement starts before limiting the journal, preserving other events', async () => {
    const { service } = setup();
    await activate(service);
    expect(
      (
        await service.command('fixture-rest', {
          type: 'status-effect',
          definitionId: 'rest',
          targetId: 'player',
          effectOperation: 'activate',
        })
      ).ok,
    ).toBe(true);
    expect(
      (
        await service.command('fixture-move', {
          type: 'move',
          position: { ...service.world.entities.player!.position, surfaceId: 'terrain' },
        })
      ).ok,
    ).toBe(true);
    const movement = service.world.events.at(-1)!;
    expect(movement.data?.['actionType']).toBe('move');
    for (let index = 0; index < 65; index++) {
      const legacy = { ...movement, id: `fixture-legacy-${index}` };
      delete legacy.data;
      service.world.events.push(legacy);
    }
    service.world.events.push({ ...movement, id: 'fixture-speech', type: 'speech' });
    const before = JSON.stringify(service.world);
    const journal = (await projectView(service)).events;
    expect(journal.some((event) => event.text === 'You started rest.')).toBe(true);
    expect(journal.some((event) => event.id === 'fixture-speech')).toBe(true);
    expect(
      journal.some(
        (event) => event.type === 'action-started' && event.text === 'You started move.',
      ),
    ).toBe(false);
    expect(JSON.stringify(service.world)).toBe(before);
  });
  it('runs connected background tabs through heartbeat expiry only when opted in, without overriding manual pause', async () => {
    const { service, clock } = setup();
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
    clock.now += 86400_000;
    await service.setConnection('returned-stream', true);
    expect(service.world.simTime).toBe(60);
    await service.tick(0.5);
    expect(service.world.simTime).toBe(90);
  });

  it('migrates the earlier profile table and preserves independent settings and half speed across restart', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'open-legend-time-migration-'));
    directories.push(directory);
    const path = join(directory, 'world.sqlite');
    const old = new DatabaseSync(path);
    old.exec(`CREATE TABLE player_profiles (id TEXT PRIMARY KEY, revision INTEGER NOT NULL,
      show_unavailable_actions INTEGER NOT NULL CHECK (show_unavailable_actions IN (0, 1)));
      INSERT INTO player_profiles VALUES ('local-player', 7, 1);`);
    old.close();
    const initial = setup(path);
    await initial.service.ready;
    expect(initial.service.profile).toMatchObject({
      revision: 7,
      preferences: { showUnavailableActions: true, pauseWhenHidden: true },
    });
    await initial.service.setPreferences({ pauseWhenHidden: false });
    await initial.service.setPreferences({ showUnavailableActions: false });
    await initial.service.control({ speed: 0.5 });
    await initial.store.close();
    stores.delete(initial.store);
    const restored = setup(path);
    await restored.service.ready;
    expect(restored.service.profile.preferences).toEqual({
      showUnavailableActions: false,
      pauseWhenHidden: false,
    });
    expect(restored.service.speed).toBe(0.5);
    expect(restored.service.paused).toBe(true);
    await restored.service.setConnection('returning-stream', true);
    await restored.service.tick(0.25);
    expect(restored.service.world.simTime).toBe(7);
    // Updating the unrelated menu preference must preserve fractional clock debt.
    await restored.service.setPreferences({ showUnavailableActions: true });
    await restored.service.tick(0.25);
    expect(restored.service.world.simTime).toBe(15);
  });

  it('starts absent and advances all native state consistently at each speed', async () => {
    const resultingWorlds = await Promise.all(
      [0.5, 1, 3, 8].map(async (speed) => {
        const { service, clock } = setup();
        await service.ready;
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
              definitionId: 'rest',
              targetId: 'player',
              effectOperation: 'activate',
            })
          ).ok,
        ).toBe(true);
        await run(service, clock, 6 / speed);
        expect(service.world.simTime).toBe(360);
        return service.world;
      }),
    );
    for (const world of resultingWorlds) expect(world).toEqual(resultingWorlds[0]);
  });
  it('freezes immediately on explicit absence and performs no return catch-up', async () => {
    const { service, clock } = setup();
    await activate(service);
    await run(service, clock, 1);
    await service.setPresence('test-client', false);
    const before = structuredClone(service.world);
    clock.now += 86_400_000;
    await service.tick(86400);
    expect(service.world).toEqual(before);
    await activate(service);
    expect(service.world.simTime).toBe(before.simTime);
    await service.tick(0.25);
    expect(service.world.simTime).toBe(before.simTime + 15);
  });
  it('expires a silent connection after the 12-second grace period', async () => {
    const { service, clock } = setup();
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
    const { service, clock } = setup();
    await activate(service);
    await service.command('rest', {
      type: 'status-effect',
      definitionId: 'rest',
      targetId: 'player',
      effectOperation: 'activate',
    });
    await service.control({ paused: true });
    const state = structuredClone(service.world);
    await run(service, clock, 3);
    await service.setPresence('test-client', false);
    await activate(service);
    expect(service.world).toEqual(state);
    expect(service.pauseReason).toBe('manual');
    expect((await service.say('paused-speech', 'ada', 'This was never spoken.')).code).toBe(
      'paused',
    );
    expect(
      (
        await service.command('paused-eat', {
          type: 'status-effect',
          definitionId: 'rest',
          targetId: 'player',
          effectOperation: 'activate',
        })
      ).code,
    ).toBe('paused');
    expect((await projectView(service)).conversation).toHaveLength(0);
  });
  it('drops a suspended wall-clock interval rather than replaying offline work', async () => {
    const { service } = setup();
    await activate(service);
    await service.tick(0.01);
    expect(service.world.simTime).toBe(0);
    await service.tick(5);
    expect(service.world.simTime).toBe(0);
    await service.tick(0.25);
    expect(service.world.simTime).toBe(15);
  });
  it('preserves short scheduling debt at the highest supported speed', async () => {
    const { service, clock } = setup();
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
    expect(service.world.simTime).toBe(2 * 60 * 8);
  });
  it('restores work and pause preferences without repeating commands or elapsed real time', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'open-legend-world-test-'));
    directories.push(directory);
    const path = join(directory, 'world.sqlite');
    const clock = { now: 1_800_000_000_000 };
    const initial = setup(path, clock);
    await activate(initial.service);
    const berry = (await projectView(initial.service)).player.inventory.find(
      (item) => item.definitionId === 'berries',
    )!;
    expect((await initial.service.command('eat-once', { type: 'eat', itemId: berry.id })).ok).toBe(
      true,
    );
    await initial.service.command('rest', {
      type: 'status-effect',
      definitionId: 'rest',
      targetId: 'player',
      effectOperation: 'activate',
    });
    await run(initial.service, clock, 1);
    await initial.service.control({ speed: 3, paused: true });
    const previous = structuredClone(initial.service.world);
    await initial.store.close();
    stores.delete(initial.store);
    clock.now += 7 * 86400_000;
    const restored = setup(path, clock);
    await activate(restored.service);
    expect(restored.service.world).toEqual(previous);
    expect(restored.service.speed).toBe(3);
    expect(restored.service.pauseReason).toBe('manual');
    await restored.service.control({ paused: false });
    expect(
      (await restored.service.command('eat-once', { type: 'eat', itemId: berry.id })).code,
    ).toBe('duplicate');
    expect(quantityOf(restored.service.world, 'player', 'berries')).toBe(2);
    expect(restored.service.world.simTime).toBe(previous.simTime);
    await run(restored.service, clock, 0.25);
    expect(restored.service.world.simTime).toBe(previous.simTime + 45);
  });
  it('pauses on ambiguous persistence completion and recovers its committed receipt', async () => {
    const { service, store, clock } = setup();
    await activate(service);
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
    expect(quantityOf(service.world, 'player', 'berries')).toBe(3);
    expect(quantityOf((await store.load())!.state.world, 'player', 'berries')).toBe(2);
    await service.tick(1);
    expect(service.world.simTime).toBe(0);
    const restored = new WorldService(store, service.config, () => clock.now);
    await activate(restored);
    expect((await restored.command('ambiguous-eat', { type: 'eat', itemId: berry.id })).code).toBe(
      'duplicate',
    );
    expect(quantityOf(restored.world, 'player', 'berries')).toBe(2);
  });
});

describe('public projection and a playable native loop', () => {
  it('excludes private minds, receipts, keys and unheard historical speech', async () => {
    const { service, store } = setup();
    await activate(service);
    service.world.entities.ada!.actor!.agency.goals[0]!.objective = 'secret-npc-intention';
    service.world.memories.ada!.push({
      id: 'private-memory',
      actorId: 'ada',
      kind: 'reflection',
      source: 'inferred',
      summary: 'secret-inner-history',
      at: 0,
      entityIds: [],
      importance: 10,
    });
    service.world.entities.ada!.position = { y: 0, x: 26, z: 22 };
    expect((await service.say('unheard', 'ada', 'secret-unheard-speech')).ok).toBe(true);
    service.world.entities.ada!.position = { y: 0, x: 12, z: 13 };
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
    expect(view.conversation).toHaveLength(0);
    expect(
      service.observe('ada')!.memories.some((memory) => memory.summary === 'secret-inner-history'),
    ).toBe(false); // Legacy unbounded authored notes are audit-only.
  });
  it('keeps zero-duration movement progress a finite public number', async () => {
    const { service } = setup();
    await activate(service);
    await service.command('already-there', {
      type: 'move',
      position: { ...service.world.entities.player!.position, surfaceId: 'terrain' },
    });
    const action = (await projectView(service)).player.action;
    expect(action === null || Number.isFinite(action.progress)).toBe(true);
  });
  it('supports craft, hunt, harvest, cook and eat through enabled public affordances', async () => {
    const { service, clock } = setup();
    await activate(service);
    expect(
      (
        await service.admit(sling(), {
          actorId: 'player',
          requestId: 'fixture-authoring',
          source: 'test-fixture',
          authority: { origin: 'player', policyRevision: 1 },
        })
      ).ok,
    ).toBe(true);
    const recipe = (await projectView(service)).recipes[0]!;
    expect(recipe.actions[0]!.enabled).toBe(true);
    expect((await service.command('craft', recipe.actions[0]!.command)).ok).toBe(true);
    await run(service, clock, 2.5);
    let view = await projectView(service);
    const tool = view.player.inventory.find((item) => item.category === 'equipment')!;
    expect((await service.command('equip', tool.actions[0]!.command)).ok).toBe(true);
    view = await projectView(service);
    const hunt = view.entities
      .find((entity) => entity.id === 'hare-1')!
      .actions.find((action) => action.command.type === 'hunt')!;
    expect(hunt.enabled).toBe(true);
    expect((await service.command('hunt', hunt.command)).ok).toBe(true);
    await run(service, clock, 1);
    view = await projectView(service);
    const remains = view.entities.find((entity) => entity.id === 'hare-1')!;
    expect(remains.kind).toBe('remains');
    const harvest = remains.actions.find((action) => action.command.type === 'harvest')!;
    expect(harvest.enabled).toBe(true);
    await service.command('harvest', harvest.command);
    await run(service, clock, 7.5);
    view = await projectView(service);
    const meat = view.player.inventory.find((item) => item.definitionId === 'raw_meat')!;
    expect(meat.quantity).toBe(2);
    expect(meat.actions.some((action) => action.command.type === 'eat')).toBe(false);
    await service.command(
      'cook',
      meat.actions.find((action) => action.command.type === 'cook')!.command,
    );
    await run(service, clock, 8.5);
    view = await projectView(service);
    const meal = view.player.inventory.find((item) => item.definitionId === 'cooked_meat')!;
    await service.command(
      'eat',
      meal.actions.find((action) => action.command.type === 'eat')!.command,
    );
    view = await projectView(service);
    expect(
      view.milestones
        .filter((milestone) => ['invent', 'craft', 'hunt', 'eat'].includes(milestone.id))
        .every((milestone) => milestone.done),
    ).toBe(true);
    expect(view.clock.seconds).toBe(1170);
    expect(view.player.health).toBe(100);
  });
});
