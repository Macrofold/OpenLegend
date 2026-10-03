import { testRepository } from '../../../tests/fixtures/database.js';
import { enterLocalWorld, editWorld } from '../../../tests/fixtures/service.js';
import { PLAYER_ID, NPC_ID } from '@open-legend/domain';
import { createItemLot, inventoryFor, seedAgency } from '@open-legend/domain';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import type { DeclarationDraft } from '@open-legend/domain';
import { actionCatalogue } from './action-catalogue.js';
import { SqlGameRepository } from './store.js';
import { WorldService } from './world-service.js';
import { readConfig } from '../../../tests/fixtures/database.js';

const stores: SqlGameRepository[] = [];
async function setup() {
  const store = await testRepository();
  stores.push(store);
  const service = new WorldService(store, readConfig({}));
  await enterLocalWorld(service);
  await service.setPresence('fixture', true);
  return { store, service };
}
afterEach(async () => {
  for (const store of stores.splice(0)) await store.close();
});
const recipe = (name: string): DeclarationDraft => ({
  family: { id: 'base:swing', version: 1 },
  name,
  description: 'Test fixture, not a live invention.',
  inputs: [
    { definitionId: 'cord', quantity: 1, role: 'binding' },
    { definitionId: 'prepared_fiber', quantity: 2, role: 'pouch' },
  ],
  output: {
    name,
    description: 'Test fixture.',
  },
  parameters: { workSeconds: 60, damage: 18, range: 7, accuracy: 0.9 },
});

it('scopes object menus to their target, including relevant missing prerequisites', async () => {
  const { service } = await setup();
  const before = JSON.stringify(service.world);
  const saved = await service.store.load();
  const fire = () => actionCatalogue(service, { targetId: 'campfire' }).actions;
  // The lit fire also offers putting it out and adding the player's carried fuel.
  const care = () => [
    'fire-extinguish:campfire',
    `fire-fuel:${inventoryFor(service.world, PLAYER_ID).find((item) => item.definitionId === 'wood')!.id}:campfire`,
  ];
  expect(fire().map((action) => action.id)).toEqual(['move', ...care(), 'cook']);
  expect(fire().find((action) => action.id === 'cook')).toMatchObject({
    targetId: 'campfire',
    enabled: false,
    reason: 'Carry raw meat to cook.',
  });
  expect(JSON.stringify(service.world)).toBe(before);
  expect(await service.store.load()).toEqual(saved);
  expect(actionCatalogue(service, {}).actions).toEqual([]);
  const meat = 'fixture-meat';
  await editWorld(service, (world) => createItemLot(world, PLAYER_ID, 'raw_meat', 1, meat));
  expect(fire().map((action) => action.id)).toEqual(['move', `cook-${meat}-campfire`, ...care()]);
  await editWorld(service, (world) => {
    world.entities.campfire!.heat!.lit = false;
  });
  expect(fire().find((action) => action.id.startsWith('cook-'))?.enabled).toBe(false);
  const reeds = actionCatalogue(service, { targetId: 'reeds' }).actions;
  expect(reeds.map((action) => action.id)).toEqual(['move', 'gather-reeds']);
  await editWorld(service, (world) => {
    world.entities.reeds!.resource!.quantity = 0;
  });
  expect(
    actionCatalogue(service, { targetId: 'reeds' }).actions.find(
      (action) => action.id === 'gather-reeds',
    )?.enabled,
  ).toBe(false);
  const person = actionCatalogue(service, { targetId: NPC_ID }).actions;
  expect(person.map((action) => action.id).filter((id) => !id.startsWith('offer:'))).toEqual([
    `follow:${NPC_ID}`,
    'move',
    `punch-${NPC_ID}`,
    `talk-${NPC_ID}`,
    'teach',
  ]);
  // Offers are listed for the selected person and remain unavailable out of arm's reach.
  const offers = person.filter((action) => action.id.startsWith('offer:'));
  expect(offers.length).toBeGreaterThan(0);
  expect(offers.every((action) => action.targetId === NPC_ID)).toBe(true);
  expect(
    actionCatalogue(service, {
      position: { y: 0, x: 11, z: 13, surfaceId: 'terrain' },
    }).actions.map((action) => action.id),
  ).toEqual(['move']);
});

it('refreshes availability after pause and never previews a hidden target', async () => {
  const { service } = await setup();
  expect(
    actionCatalogue(service, { targetId: PLAYER_ID }).actions.find(
      (action) =>
        action.intent.kind === 'command' &&
        action.intent.command.type === 'status-effect' &&
        action.intent.command.definitionId === 'wilderness:restorative-rest',
    )?.enabled,
  ).toBe(true);
  await service.control({ paused: true });
  expect(
    actionCatalogue(service, { targetId: PLAYER_ID }).actions.find(
      (action) =>
        action.intent.kind === 'command' &&
        action.intent.command.type === 'status-effect' &&
        action.intent.command.definitionId === 'wilderness:restorative-rest',
    ),
  ).toMatchObject({ enabled: false, reason: 'Resume the world to act.' });
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
          actorId: PLAYER_ID,
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
        actorId: NPC_ID,
        requestId: 'fixture-private',
      })
    ).ok,
  ).toBe(true);
  const catalogue = actionCatalogue(service, { targetId: PLAYER_ID });
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
  await editWorld(service, (world) => {
    createItemLot(world, PLAYER_ID, 'berries', 3, 'fixture-food');
    world.entities[NPC_ID]!.actor!.agency = seedAgency(['Private fixture objective']);
  });
  const itemId = inventoryFor(service.world, PLAYER_ID).find(
    (item) => item.definitionId === 'berries',
  )!.id;
  const food = actionCatalogue(service, { itemId }).actions.find(
    (action) => action.intent.kind === 'command' && action.intent.command.type === 'eat',
  )!;
  const fullness =
    service.world.entities[PLAYER_ID]!.actor!.attributes!['wilderness:fullness']!.value;
  if (fullness === undefined) throw new Error('Wilderness fixture lacks fullness.');
  expect(food.description).toContain(
    `Current Food: ${Math.round(Number(fullness))} %; range 0–100.`,
  );
  if (food.intent.kind !== 'command') throw new Error('Missing fixture food command');
  expect((await service.command('fixture-eat', food.intent.command)).ok).toBe(true);
  const next = actionCatalogue(service, { itemId }).actions.find(
    (action) => action.id === food.id,
  )!;
  expect(next.description).not.toBe(food.description);
  const nextFullness =
    service.world.entities[PLAYER_ID]!.actor!.attributes!['wilderness:fullness']!.value;
  if (nextFullness === undefined) throw new Error('Wilderness fixture lacks fullness.');
  expect(next.description).toContain(
    `Current Food: ${Math.round(Number(nextFullness))} %; range 0–100.`,
  );
  expect(JSON.stringify(actionCatalogue(service, { targetId: PLAYER_ID }))).not.toContain(
    service.world.entities[NPC_ID]!.actor!.agency.goals[0]!.objective,
  );
});

it('persists profile preferences across server restarts and world restoration, independently of another profile', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'open-legend-profile-'));
  const path = directory;
  let store = await testRepository(path);
  try {
    const service = new WorldService(store, readConfig({}));
    await enterLocalWorld(service);
    const original = (await store.load())!;
    expect(service.profile.preferences.showUnavailableActions).toBe(false);
    await service.setPreferences({ showUnavailableActions: true });
    await store.commit(original.revision, original.state);
    expect((await store.getProfile('someone-else')).preferences.showUnavailableActions).toBe(false);
    await store.close();
    store = await testRepository(path);
    const restarted = new WorldService(store, readConfig({}));
    await enterLocalWorld(restarted);
    expect(restarted.profile.preferences.showUnavailableActions).toBe(true);
    await restarted.setPreferences({ showUnavailableActions: false });
    expect(restarted.profile.preferences.showUnavailableActions).toBe(false);
  } finally {
    await store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
