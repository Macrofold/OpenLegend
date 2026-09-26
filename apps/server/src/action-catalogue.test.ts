import { createItemLot } from '@open-legend/domain';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import type { DeclarationDraft } from '@open-legend/domain';
import { actionCatalogue } from './action-catalogue.js';
import { SqliteStore } from './store.js';
import { WorldService } from './world-service.js';
import { readConfig } from './config.js';

const stores: SqliteStore[] = [];
async function setup() {
  const store = new SqliteStore(':memory:');
  stores.push(store);
  const service = new WorldService(store, readConfig({}));
  await service.setPresence('fixture', true);
  return { store, service };
}
afterEach(async () => {
  for (const store of stores.splice(0)) await store.close();
});
const recipe = (name: string): DeclarationDraft => ({
  schemaVersion: 1,
  name,
  description: 'Test fixture, not a live invention.',
  inputs: [
    { definitionId: 'cord', quantity: 1, role: 'binding' },
    { definitionId: 'prepared_fiber', quantity: 2, role: 'pouch' },
  ],
  workSeconds: 60,
  output: {
    kind: 'launcher',
    name,
    description: 'Test fixture.',
    properties: ['flexible'],
    launcher: { mechanism: 'swing', ammunitionKind: 'stone', damage: 18, range: 7, accuracy: 0.9 },
  },
});

it('previews every native family without consuming food, materials, RNG, receipts or save revisions', async () => {
  const { service, store } = await setup();
  const before = JSON.stringify(service.world),
    saved = await store.load();
  const catalogue = actionCatalogue(service, {});
  expect(catalogue.actions.every((action) => action.description.length > 20)).toBe(true);
  expect(catalogue.actions.some((action) => action.id === 'invent')).toBe(false);
  expect(catalogue.actions.map((action) => action.id.split('-')[0])).toEqual(
    expect.arrayContaining([
      'move',
      'gather',
      'prepare',
      'craft',
      'equip',
      'hunt',
      'harvest',
      'cook',
      'eat',
      'rest',
      'cancel',
      'recover',
      'teach',
      'talk',
    ]),
  );
  expect(catalogue.actions.find((action) => action.id === 'prepare-fiber')).toMatchObject({
    enabled: false,
  });
  expect(catalogue.actions.find((action) => action.id === 'prepare-cord')).toMatchObject({
    enabled: true,
  });
  expect(catalogue.actions.find((action) => action.id === 'cook')).toMatchObject({
    enabled: false,
  });
  expect(JSON.stringify(service.world)).toBe(before);
  expect(await store.load()).toEqual(saved);
  expect(await store.recentJobs()).toEqual([]);
});

it('scopes object menus to their target, including relevant missing prerequisites', async () => {
  const { service } = await setup();
  const fire = () => actionCatalogue(service, { targetId: 'campfire' }).actions;
  expect(fire().map((action) => action.id)).toEqual(['move', 'cook']);
  expect(fire().find((action) => action.id === 'cook')).toMatchObject({
    targetId: 'campfire',
    enabled: false,
    reason: 'Carry raw meat to cook.',
  });
  const meat = 'fixture-meat';
  createItemLot(service.world, 'player', 'raw_meat', 1, meat);
  expect(fire().map((action) => action.id)).toEqual(['move', `cook-${meat}-campfire`]);
  service.world.entities.campfire!.heat!.lit = false;
  expect(fire().find((action) => action.id.startsWith('cook-'))?.enabled).toBe(false);
  const reeds = actionCatalogue(service, { targetId: 'reeds' }).actions;
  expect(reeds.map((action) => action.id)).toEqual(['move', 'gather-reeds']);
  service.world.entities.reeds!.resource!.quantity = 0;
  expect(
    actionCatalogue(service, { targetId: 'reeds' }).actions.find(
      (action) => action.id === 'gather-reeds',
    )?.enabled,
  ).toBe(false);
  expect(actionCatalogue(service, { targetId: 'ada' }).actions.map((action) => action.id)).toEqual([
    'move',
    'talk-ada',
    'teach',
  ]);
  expect(
    actionCatalogue(service, {
      position: { y: 0, x: 11, z: 13, surfaceId: 'terrain' },
    }).actions.map((action) => action.id),
  ).toEqual(expect.arrayContaining(['prepare-cord', 'talk-ada', 'gather-reeds']));
});

it('refreshes availability after pause and never previews a hidden target', async () => {
  const { service } = await setup();
  expect(actionCatalogue(service, {}).actions.find((action) => action.id === 'rest')?.enabled).toBe(
    true,
  );
  await service.control({ paused: true });
  expect(actionCatalogue(service, {}).actions.find((action) => action.id === 'rest')).toMatchObject(
    { enabled: false, reason: 'Resume the world to act.' },
  );
  expect(() => actionCatalogue(service, { targetId: 'foreign-or-hidden' })).toThrow(
    'no longer in view',
  );
});

it('includes learned recipes beyond an AI retrieval limit while excluding another actor’s private knowledge', async () => {
  const { service } = await setup();
  for (let index = 0; index < 30; index++) {
    expect(
      (
        await service.admit(recipe(`Fixture sling ${index}`), {
          source: 'test-fixture',
          authority: { origin: 'player', policyRevision: 1 },
          actorId: 'player',
          requestId: `fixture-${index}`,
        })
      ).ok,
    ).toBe(true);
  }
  expect(
    (
      await service.admit(recipe('Private fixture sling'), {
        source: 'test-fixture',
        authority: { origin: 'player', policyRevision: 1 },
        actorId: 'ada',
        requestId: 'fixture-private',
      })
    ).ok,
  ).toBe(true);
  const catalogue = actionCatalogue(service, {});
  expect(
    catalogue.actions.filter(
      (action) => action.intent.kind === 'command' && action.intent.command.type === 'craft',
    ),
  ).toHaveLength(30);
  expect(JSON.stringify(catalogue)).not.toContain('Private fixture sling');
  expect(catalogue.actions.some((action) => action.label === 'Craft Fixture sling 29')).toBe(true);
  const craft = catalogue.actions.find((action) => action.label === 'Craft Fixture sling 29')!;
  expect(craft.description).toContain('Test fixture, not a live invention.');
  expect(craft.description).toContain('Requires: 1 fiber cord, 2 prepared fibers.');
});

it('updates contextual food descriptions from the player’s current state without leaking private memories', async () => {
  const { service } = await setup();
  const food = actionCatalogue(service, {}).actions.find(
    (action) => action.intent.kind === 'command' && action.intent.command.type === 'eat',
  )!;
  const fullness = service.world.entities.player!.actor!.fullness;
  if (fullness === undefined) throw new Error('Wilderness fixture lacks fullness.');
  expect(food.description).toContain(`You currently have ${Math.round(fullness)} / 100 fullness.`);
  if (food.intent.kind !== 'command') throw new Error('Missing fixture food command');
  expect((await service.command('fixture-eat', food.intent.command)).ok).toBe(true);
  const next = actionCatalogue(service, {}).actions.find((action) => action.id === food.id)!;
  expect(next.description).not.toBe(food.description);
  const nextFullness = service.world.entities.player!.actor!.fullness;
  if (nextFullness === undefined) throw new Error('Wilderness fixture lacks fullness.');
  expect(next.description).toContain(
    `You currently have ${Math.round(nextFullness)} / 100 fullness.`,
  );
  expect(JSON.stringify(actionCatalogue(service, {}))).not.toContain(
    service.world.entities.ada!.actor!.agency.goals[0]!.objective,
  );
});

it('persists profile preferences across server restarts and world restoration, independently of another profile', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'open-legend-profile-'));
  const path = join(directory, 'world.sqlite');
  let store = new SqliteStore(path);
  try {
    const service = new WorldService(store, readConfig({}));
    await service.ready;
    const original = (await store.load())!;
    expect(service.profile.preferences.showUnavailableActions).toBe(false);
    await service.setPreferences({ showUnavailableActions: true });
    await store.commit(original.revision, original.state);
    expect((await store.getProfile('someone-else')).preferences.showUnavailableActions).toBe(false);
    await store.close();
    store = new SqliteStore(path);
    const restarted = new WorldService(store, readConfig({}));
    await restarted.ready;
    expect(restarted.profile.preferences.showUnavailableActions).toBe(true);
    await restarted.setPreferences({ showUnavailableActions: false });
    await restarted.ready;
    expect(restarted.profile.preferences.showUnavailableActions).toBe(false);
  } finally {
    await store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
