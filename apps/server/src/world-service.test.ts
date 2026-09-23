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
function activate(service: WorldService): void {
  service.setPresence('test-client', true);
}
function run(service: WorldService, clock: { now: number }, realSeconds: number): void {
  const frames = Math.round(realSeconds / 0.25);
  for (let frame = 0; frame < frames; frame++) {
    clock.now += 250;
    service.setPresence('test-client', true);
    service.tick(0.25);
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
afterEach(() => {
  for (const store of stores) store.close();
  stores.clear();
  for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe('world presence, time and durable commands', () => {
  it('omits new and legacy movement starts before limiting the journal, preserving other events', () => {
    const { service } = setup();
    activate(service);
    expect(service.command('fixture-rest', { type: 'rest' }).ok).toBe(true);
    expect(
      service.command('fixture-move', {
        type: 'move',
        position: { ...service.world.entities.player!.position, surfaceId: 'terrain' },
      }).ok,
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
    const journal = projectView(service).events;
    expect(journal.some((event) => event.text === 'You started rest.')).toBe(true);
    expect(journal.some((event) => event.id === 'fixture-speech')).toBe(true);
    expect(
      journal.some(
        (event) => event.type === 'action-started' && event.text === 'You started move.',
      ),
    ).toBe(false);
    expect(JSON.stringify(service.world)).toBe(before);
  });
  it('runs connected background tabs through heartbeat expiry only when opted in, without overriding manual pause', () => {
    const { service, clock } = setup();
    service.setConnection('background-stream', true);
    expect(service.paused).toBe(true);
    service.setPreferences({ pauseWhenHidden: false });
    expect(service.paused).toBe(false);
    activate(service);
    service.setPresence('test-client', false);
    clock.now += 60_000;
    service.tick(1);
    expect(service.world.simTime).toBe(60);
    service.setPreferences({ pauseWhenHidden: true });
    expect(service.world.paused).toBe(true);
    service.tick(1);
    expect(service.world.simTime).toBe(60);
    service.control({ paused: true });
    service.setPreferences({ pauseWhenHidden: false });
    expect(service.pauseReason).toBe('manual');
    expect(service.control({ paused: false }).ok).toBe(true);
    service.setConnection('another-stream', true);
    service.setConnection('background-stream', false);
    expect(service.paused).toBe(false);
    service.setConnection('another-stream', false);
    expect(service.pauseReason).toBe('away');
    service.tick(1);
    expect(service.world.simTime).toBe(60);
    clock.now += 86400_000;
    service.setConnection('returned-stream', true);
    expect(service.world.simTime).toBe(60);
    service.tick(0.5);
    expect(service.world.simTime).toBe(90);
  });

  it('migrates the earlier profile table and preserves independent settings and half speed across restart', () => {
    const directory = mkdtempSync(join(tmpdir(), 'open-legend-time-migration-'));
    directories.push(directory);
    const path = join(directory, 'world.sqlite');
    const old = new DatabaseSync(path);
    old.exec(`CREATE TABLE player_profiles (id TEXT PRIMARY KEY, revision INTEGER NOT NULL,
      show_unavailable_actions INTEGER NOT NULL CHECK (show_unavailable_actions IN (0, 1)));
      INSERT INTO player_profiles VALUES ('local-player', 7, 1);`);
    old.close();
    const initial = setup(path);
    expect(initial.service.profile).toMatchObject({
      revision: 7,
      preferences: { showUnavailableActions: true, pauseWhenHidden: true },
    });
    initial.service.setPreferences({ pauseWhenHidden: false });
    initial.service.setPreferences({ showUnavailableActions: false });
    initial.service.control({ speed: 0.5 });
    initial.store.close();
    stores.delete(initial.store);
    const restored = setup(path);
    expect(restored.service.profile.preferences).toEqual({
      showUnavailableActions: false,
      pauseWhenHidden: false,
    });
    expect(restored.service.speed).toBe(0.5);
    expect(restored.service.paused).toBe(true);
    restored.service.setConnection('returning-stream', true);
    restored.service.tick(0.25);
    expect(restored.service.world.simTime).toBe(7);
    // Updating the unrelated menu preference must preserve fractional clock debt.
    restored.service.setPreferences({ showUnavailableActions: true });
    restored.service.tick(0.25);
    expect(restored.service.world.simTime).toBe(15);
  });

  it('starts absent and advances all native state consistently at each speed', () => {
    const resultingWorlds = [0.5, 1, 3, 8].map((speed) => {
      const { service, clock } = setup();
      expect(service.paused).toBe(true);
      expect(service.pauseReason).toBe('away');
      service.tick(1);
      expect(service.world.simTime).toBe(0);
      activate(service);
      expect(service.control({ speed }).ok).toBe(true);
      expect(service.command('rest', { type: 'rest' }).ok).toBe(true);
      run(service, clock, 6 / speed);
      expect(service.world.simTime).toBe(360);
      return service.world;
    });
    for (const world of resultingWorlds) expect(world).toEqual(resultingWorlds[0]);
  });
  it('freezes immediately on explicit absence and performs no return catch-up', () => {
    const { service, clock } = setup();
    activate(service);
    run(service, clock, 1);
    service.setPresence('test-client', false);
    const before = structuredClone(service.world);
    clock.now += 86_400_000;
    service.tick(86400);
    expect(service.world).toEqual(before);
    activate(service);
    expect(service.world.simTime).toBe(before.simTime);
    service.tick(0.25);
    expect(service.world.simTime).toBe(before.simTime + 15);
  });
  it('expires a silent connection after the 12-second grace period', () => {
    const { service, clock } = setup();
    activate(service);
    service.tick(0.25);
    const time = service.world.simTime;
    clock.now += 12_001;
    service.tick(0.25);
    expect(service.paused).toBe(true);
    expect(service.world.paused).toBe(true);
    expect(service.pauseReason).toBe('away');
    expect(service.world.simTime).toBe(time);
  });
  it('keeps manual pause across reconnect and rejects paused speech/actions', () => {
    const { service, clock } = setup();
    activate(service);
    service.command('rest', { type: 'rest' });
    service.control({ paused: true });
    const state = structuredClone(service.world);
    run(service, clock, 3);
    service.setPresence('test-client', false);
    activate(service);
    expect(service.world).toEqual(state);
    expect(service.pauseReason).toBe('manual');
    expect(service.say('paused-speech', 'ada', 'This was never spoken.').code).toBe('paused');
    expect(service.command('paused-eat', { type: 'rest' }).code).toBe('paused');
    expect(projectView(service).conversation).toHaveLength(0);
  });
  it('drops a suspended wall-clock interval rather than replaying offline work', () => {
    const { service } = setup();
    activate(service);
    service.tick(0.01);
    expect(service.world.simTime).toBe(0);
    service.tick(5);
    expect(service.world.simTime).toBe(0);
    service.tick(0.25);
    expect(service.world.simTime).toBe(15);
  });
  it('preserves short scheduling debt at the highest supported speed', () => {
    const { service, clock } = setup();
    activate(service);
    service.control({ speed: 8 });
    clock.now += 1000;
    service.tick(1);
    // Eight smaller frames provide room to drain a bounded backlog while time keeps running.
    for (let frame = 0; frame < 8; frame++) {
      clock.now += 125;
      service.setPresence('test-client', true);
      service.tick(0.125);
    }
    expect(service.world.simTime).toBe(2 * 60 * 8);
  });
  it('restores work and pause preferences without repeating commands or elapsed real time', () => {
    const directory = mkdtempSync(join(tmpdir(), 'open-legend-world-test-'));
    directories.push(directory);
    const path = join(directory, 'world.sqlite');
    const clock = { now: 1_800_000_000_000 };
    const initial = setup(path, clock);
    activate(initial.service);
    const berry = projectView(initial.service).player.inventory.find(
      (item) => item.definitionId === 'berries',
    )!;
    expect(initial.service.command('eat-once', { type: 'eat', itemId: berry.id }).ok).toBe(true);
    initial.service.command('rest', { type: 'rest' });
    run(initial.service, clock, 1);
    initial.service.control({ speed: 3, paused: true });
    const previous = structuredClone(initial.service.world);
    initial.store.close();
    stores.delete(initial.store);
    clock.now += 7 * 86400_000;
    const restored = setup(path, clock);
    activate(restored.service);
    expect(restored.service.world).toEqual(previous);
    expect(restored.service.speed).toBe(3);
    expect(restored.service.pauseReason).toBe('manual');
    restored.service.control({ paused: false });
    expect(restored.service.command('eat-once', { type: 'eat', itemId: berry.id }).code).toBe(
      'duplicate',
    );
    expect(quantityOf(restored.service.world, 'player', 'berries')).toBe(2);
    expect(restored.service.world.simTime).toBe(previous.simTime);
    run(restored.service, clock, 0.25);
    expect(restored.service.world.simTime).toBe(previous.simTime + 45);
  });
  it('pauses on ambiguous persistence completion and recovers its committed receipt', () => {
    const { service, store, clock } = setup();
    activate(service);
    const berry = projectView(service).player.inventory.find(
      (item) => item.definitionId === 'berries',
    )!;
    const realCommit = store.commit.bind(store);
    vi.spyOn(store, 'commit').mockImplementationOnce((revision, saved) => {
      realCommit(revision, saved);
      throw new Error('Connection lost after commit.');
    });
    expect(service.command('ambiguous-eat', { type: 'eat', itemId: berry.id }).code).toBe(
      'storage',
    );
    expect(service.paused).toBe(true);
    expect(service.pauseReason).toBe('storage');
    expect(quantityOf(service.world, 'player', 'berries')).toBe(3);
    expect(quantityOf(store.load()!.state.world, 'player', 'berries')).toBe(2);
    service.tick(1);
    expect(service.world.simTime).toBe(0);
    const restored = new WorldService(store, service.config, () => clock.now);
    activate(restored);
    expect(restored.command('ambiguous-eat', { type: 'eat', itemId: berry.id }).code).toBe(
      'duplicate',
    );
    expect(quantityOf(restored.world, 'player', 'berries')).toBe(2);
  });
});

describe('public projection and a playable native loop', () => {
  it('excludes private minds, receipts, keys and unheard historical speech', () => {
    const { service, store } = setup();
    activate(service);
    service.world.entities.ada!.actor!.goal = 'secret-npc-intention';
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
    expect(service.say('unheard', 'ada', 'secret-unheard-speech').ok).toBe(true);
    service.world.entities.ada!.position = { y: 0, x: 12, z: 13 };
    store.putJob({
      id: 'private-job',
      kind: 'thought',
      status: 'completed',
      message: 'secret-selected-plan-and-unseen-resource',
      fingerprint: 'secret-request-fingerprint',
      createdAt: 1,
      request: { text: 'secret-request-text' },
      result: { reflection: 'secret-result' },
    });
    const view = projectView(service);
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
  it('keeps zero-duration movement progress a finite public number', () => {
    const { service } = setup();
    activate(service);
    service.command('already-there', {
      type: 'move',
      position: { ...service.world.entities.player!.position, surfaceId: 'terrain' },
    });
    const action = projectView(service).player.action;
    expect(action === null || Number.isFinite(action.progress)).toBe(true);
  });
  it('supports craft, hunt, harvest, cook and eat through enabled public affordances', () => {
    const { service, clock } = setup();
    activate(service);
    expect(
      service.admit(sling(), {
        actorId: 'player',
        requestId: 'fixture-authoring',
        source: 'test-fixture',
      }).ok,
    ).toBe(true);
    const recipe = projectView(service).recipes[0]!;
    expect(recipe.actions[0]!.enabled).toBe(true);
    expect(service.command('craft', recipe.actions[0]!.command).ok).toBe(true);
    run(service, clock, 2.5);
    let view = projectView(service);
    const tool = view.player.inventory.find((item) => item.category === 'equipment')!;
    expect(service.command('equip', tool.actions[0]!.command).ok).toBe(true);
    view = projectView(service);
    const hunt = view.entities
      .find((entity) => entity.id === 'hare-1')!
      .actions.find((action) => action.command.type === 'hunt')!;
    expect(hunt.enabled).toBe(true);
    expect(service.command('hunt', hunt.command).ok).toBe(true);
    run(service, clock, 1);
    view = projectView(service);
    const remains = view.entities.find((entity) => entity.id === 'hare-1')!;
    expect(remains.kind).toBe('remains');
    const harvest = remains.actions.find((action) => action.command.type === 'harvest')!;
    expect(harvest.enabled).toBe(true);
    service.command('harvest', harvest.command);
    run(service, clock, 7.5);
    view = projectView(service);
    const meat = view.player.inventory.find((item) => item.definitionId === 'raw_meat')!;
    expect(meat.quantity).toBe(2);
    expect(meat.actions.some((action) => action.command.type === 'eat')).toBe(false);
    service.command('cook', meat.actions.find((action) => action.command.type === 'cook')!.command);
    run(service, clock, 8.5);
    view = projectView(service);
    const meal = view.player.inventory.find((item) => item.definitionId === 'cooked_meat')!;
    service.command('eat', meal.actions.find((action) => action.command.type === 'eat')!.command);
    view = projectView(service);
    expect(
      view.milestones
        .filter((milestone) => ['invent', 'craft', 'hunt', 'eat'].includes(milestone.id))
        .every((milestone) => milestone.done),
    ).toBe(true);
    expect(view.clock.seconds).toBe(1170);
    expect(view.player.health).toBe(100);
  });
});
