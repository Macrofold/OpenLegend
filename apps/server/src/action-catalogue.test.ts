import { setSpatialPosition, worldSupport, selectedExpressions } from '@open-legend/domain';
import { boundResponseSchema } from './cognition-contracts.js';
import { readableDecisionContext } from './response-context.js';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import { entityGet } from '@open-legend/domain';
import { testRepository, closeTestDatabases } from '../../../tests/fixtures/database.js';
import { enterLocalWorld, editWorld } from '../../../tests/fixtures/service.js';
import { PLAYER_ID, NPC_ID } from '@open-legend/domain';
import { createItemLot, inventoryFor, isEquipped, seedAgency } from '@open-legend/domain';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, expect, it, vi } from 'vitest';
import type { DeclarationDraft } from '@open-legend/domain';
import {
  actionCatalogue,
  operatorActionCatalogue,
  operatorActionCataloguePage,
} from './action-catalogue.js';
import { SqlGameRepository } from './store.js';
import { WorldService } from './world-service.js';
import { readConfig } from '../../../tests/fixtures/database.js';

const stores: SqlGameRepository[] = [];
const services = new Set<WorldService>();
async function setup(operator = false) {
  const store = await testRepository(undefined, stockedCamp());
  stores.push(store);
  const service = new WorldService(
    store,
    readConfig(operator ? { OPEN_LEGEND_GOD_MODE: 'true' } : {}),
  );
  services.add(service);
  await enterLocalWorld(service);
  await service.setPresence('fixture', true);
  return { store, service };
}
afterEach(async () => {
  for (const service of services) service.releaseHostWork();
  services.clear();
  for (const store of stores.splice(0)) await store.close();
});
afterAll(closeTestDatabases);
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
  expect(fire().map((action) => action.id)).toEqual([
    'move',
    ...care(),
    'cook-base:cook-meat',
    'cook-base:cook-river-fish',
  ]);
  expect(fire().find((action) => action.id === 'cook-base:cook-meat')).toMatchObject({
    targetId: 'campfire',
    enabled: false,
    reason: 'Carry the exact ingredients: 1 Raw meat.',
  });
  expect(JSON.stringify(service.world)).toBe(before);
  expect(await service.store.load()).toEqual(saved);
  expect(actionCatalogue(service, {}).actions).toEqual([]);
  const meat = 'fixture-meat';
  await editWorld(service, (world) => createItemLot(world, PLAYER_ID, 'raw_meat', 1, meat));
  expect(fire().map((action) => action.id)).toEqual([
    'move',
    expect.stringMatching(/^cook-[a-f0-9]{64}$/),
    ...care(),
    'cook-base:cook-river-fish',
  ]);
  expect(fire()[1]?.intent).toMatchObject({
    kind: 'command',
    command: {
      type: 'cook',
      preparationId: 'base:cook-meat',
      inputs: { food: meat },
      targetId: 'campfire',
    },
  });
  await editWorld(service, (world) => {
    entityGet(world.entities, 'campfire')!.heat!.lit = false;
  });
  expect(fire().find((action) => action.id.startsWith('cook-'))?.enabled).toBe(false);
  const reeds = actionCatalogue(service, { targetId: 'reeds' }).actions;
  expect(reeds.map((action) => action.id)).toEqual(['move', 'gather-reeds']);
  await editWorld(service, (world) => {
    entityGet(world.entities, 'reeds')!.resource!.quantity = 0;
  });
  expect(
    actionCatalogue(service, { targetId: 'reeds' }).actions.find(
      (action) => action.id === 'gather-reeds',
    )?.enabled,
  ).toBe(false);
  const person = actionCatalogue(service, { targetId: NPC_ID }).actions;
  expect(
    person
      .map((action) => action.id)
      .filter((id) => !id.startsWith('offer:') && !id.startsWith('teach-')),
  ).toEqual([
    `follow:${NPC_ID}`,
    'move',
    `punch-${NPC_ID}`,
    `knife-${NPC_ID}:${inventoryFor(service.world, PLAYER_ID).find((item) => item.definitionId === 'knife')!.id}`,
    `express:tickle:${NPC_ID}`,
    `talk-${NPC_ID}`,
    `invite-help:${NPC_ID}`,
    `invite-travel:${NPC_ID}`,
    `coaching-request:wilderness:sling-handling:${NPC_ID}`,
  ]);
  expect(
    person
      .filter((action) => action.id.startsWith('teach-'))
      .map((action) => action.id)
      .sort(),
  ).toEqual(
    service
      .observe(PLAYER_ID)!
      .knownRecipes.map((recipe) => `teach-${NPC_ID}-${recipe.id}`)
      .sort(),
  );
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
  const existingCrafts = actionCatalogue(service, { targetId: PLAYER_ID }).actions.filter(
    (action) => action.intent.kind === 'command' && action.intent.command.type === 'craft',
  );
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
  ).toHaveLength(existingCrafts.length + 30);
  for (const name of ['Wooden shield', 'Woven gathering container', 'River line']) {
    expect(catalogue.actions.some((action) => action.label === `Craft ${name}`)).toBe(true);
  }
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
    entityGet(world.entities, NPC_ID)!.actor!.agency = seedAgency(['Private fixture objective']);
  });
  const itemId = inventoryFor(service.world, PLAYER_ID).find(
    (item) => item.definitionId === 'berries',
  )!.id;
  const food = actionCatalogue(service, { itemId }).actions.find(
    (action) => action.intent.kind === 'command' && action.intent.command.type === 'eat',
  )!;
  const fullness = entityGet(service.world.entities, PLAYER_ID)!.actor!.attributes![
    'wilderness:fullness'
  ]!.value;
  if (fullness === undefined) throw new Error('Wilderness fixture lacks fullness.');
  expect(food.description).toContain(`Current Food: ${Math.round(Number(fullness))}; range 0–100.`);
  if (food.intent.kind !== 'command') throw new Error('Missing fixture food command');
  expect((await service.command('fixture-eat', food.intent.command)).ok).toBe(true);
  const next = actionCatalogue(service, { itemId }).actions.find(
    (action) => action.id === food.id,
  )!;
  expect(next.description).not.toBe(food.description);
  const nextFullness = entityGet(service.world.entities, PLAYER_ID)!.actor!.attributes![
    'wilderness:fullness'
  ]!.value;
  if (nextFullness === undefined) throw new Error('Wilderness fixture lacks fullness.');
  expect(next.description).toContain(
    `Current Food: ${Math.round(Number(nextFullness))}; range 0–100.`,
  );
  expect(JSON.stringify(actionCatalogue(service, { targetId: PLAYER_ID }))).not.toContain(
    entityGet(service.world.entities, NPC_ID)!.actor!.agency.goals[0]!.objective,
  );
});

it('persists profile preferences across server restarts and world restoration, independently of another profile', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'open-legend-profile-'));
  const path = directory;
  let store = await testRepository(path, stockedCamp());
  let service: WorldService | undefined;
  try {
    service = new WorldService(store, readConfig({}));
    services.add(service);
    await enterLocalWorld(service);
    const original = (await store.load())!;
    expect(service.profile.preferences.showUnavailableActions).toBe(false);
    await service.setPreferences({ showUnavailableActions: true });
    await store.commit(original.revision, original.state);
    expect((await store.getProfile('someone-else')).preferences.showUnavailableActions).toBe(false);
    service.releaseHostWork();
    services.delete(service);
    await store.close();
    store = await testRepository(path);
    service = new WorldService(store, readConfig({}));
    services.add(service);
    await enterLocalWorld(service);
    expect(service.profile.preferences.showUnavailableActions).toBe(true);
    await service.setPreferences({ showUnavailableActions: false });
    expect(service.profile.preferences.showUnavailableActions).toBe(false);
  } finally {
    service?.releaseHostWork();
    if (service) services.delete(service);
    await store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

it('selects an operator action page before native previews while retaining exact native commands and refusals', async () => {
  const { service } = await setup(true);
  await editWorld(service, (world) => {
    for (let index = 0; index < 36; index++)
      createItemLot(world, PLAYER_ID, 'berries', 1, `fixture-food-${index}`);
  });
  const context = { catalogue: true },
    scope = service.localScope;
  const full = operatorActionCatalogue(service, context, PLAYER_ID, scope).actions.sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  expect(full.length).toBeGreaterThan(100);
  const preview = vi.spyOn(service, 'previewOperatorCommand');
  let previewsAtYield: number | undefined;
  setImmediate(() => {
    previewsAtYield = preview.mock.calls.length;
  });
  const actual: typeof full = [];
  let cursor: string | undefined;
  do {
    preview.mockClear();
    const page = await operatorActionCataloguePage(service, context, PLAYER_ID, scope, {
      limit: 17,
      ...(cursor ? { cursor } : {}),
    });
    expect(page.items.length).toBeLessThanOrEqual(17);
    expect(preview.mock.calls.length).toBeLessThanOrEqual(17);
    actual.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  expect(previewsAtYield).toBe(0);
  // Default-shortcut ordering belongs to the complete native menu. The operator
  // list consumes these exact choices, availability and descriptions instead.
  const choice = ({ priority: _priority, ...value }: (typeof full)[number]) => value;
  expect(actual.map(choice)).toEqual(full.map(choice));
  preview.mockClear();
  const search = await operatorActionCataloguePage(service, context, PLAYER_ID, scope, {
    query: 'fixture-food-35',
    limit: 10,
  });
  expect(search.items.length).toBeGreaterThan(0);
  expect(preview.mock.calls.length).toBeLessThanOrEqual(search.items.length);
  expect(
    search.items.every((action) => JSON.stringify(action.intent).includes('fixture-food-35')),
  ).toBe(true);
});

it.each([PLAYER_ID, NPC_ID])(
  'offers and executes creator inventory actions for uncontrolled %s without granting player control',
  async (actorId) => {
    const { service } = await setup(true);
    await editWorld(service, (world) => {
      createItemLot(world, actorId, 'knife', 1, 'operator-knife');
      createItemLot(world, actorId, 'woven_bag', 1, 'operator-bag');
    });
    const scope = { ...service.localScope, connectionId: 'creator-inspection' };
    expect(service.currentScope(scope, 'create')).toBe(true);
    expect(service.currentScope(scope, 'play', true)).toBe(false);
    const ordinary = actionCatalogue(service, { catalogue: true }, scope).actions.filter(
      (action) =>
        action.intent.kind === 'command' && ['equip', 'drop'].includes(action.intent.command.type),
    );
    expect(ordinary.length).toBeGreaterThan(0);
    expect(ordinary.every((action) => !action.enabled)).toBe(true);

    const equip = operatorActionCatalogue(
      service,
      { itemId: 'operator-knife' },
      actorId,
      scope,
    ).actions.find(
      (action) => action.intent.kind === 'command' && action.intent.command.type === 'equip',
    );
    expect(equip?.enabled).toBe(true);
    if (equip?.intent.kind !== 'command') throw new Error('Missing exact equip command.');
    expect(
      await service.operatorCommand('creator-equip', actorId, equip.intent.command, scope),
    ).toMatchObject({ ok: true });
    expect(isEquipped(service.world, actorId, 'operator-knife')).toBe(true);

    const drops = () =>
      operatorActionCataloguePage(service, { catalogue: true }, actorId, scope, {
        query: 'operator-bag',
        limit: 100,
      });
    await service.control({ paused: true });
    expect(
      (await drops()).items.find(
        (action) => action.intent.kind === 'command' && action.intent.command.type === 'drop',
      )?.enabled,
    ).toBe(false);
    await service.control({ paused: false });
    const drop = (await drops()).items.find(
      (action) => action.intent.kind === 'command' && action.intent.command.type === 'drop',
    );
    expect(drop?.enabled).toBe(true);
    if (drop?.intent.kind !== 'command') throw new Error('Missing exact drop command.');
    expect(
      await service.operatorCommand('creator-drop', actorId, drop.intent.command, scope),
    ).toMatchObject({ ok: true });
    expect(inventoryFor(service.world, actorId).some((item) => item.id === 'operator-bag')).toBe(
      false,
    );
    expect(
      service.world.events.some(
        (event) => event.type === 'items-dropped' && event.actorId === actorId,
      ),
    ).toBe(true);
    expect(service.currentScope(scope, 'play', true)).toBe(false);
  },
);

it('fences operator action cursors after native changes and keeps unavailable windows advancing', async () => {
  const { service } = await setup(true),
    context = { catalogue: true },
    scope = service.localScope;
  await service.control({ paused: true });
  const first = await operatorActionCataloguePage(service, context, PLAYER_ID, scope, {
    limit: 1,
    available: true,
  });
  expect(first.items).toEqual([]);
  expect(first.nextCursor).toBeDefined();
  const next = await operatorActionCataloguePage(service, context, PLAYER_ID, scope, {
    limit: 1,
    available: true,
    cursor: first.nextCursor!,
  });
  expect(next.nextCursor).not.toBe(first.nextCursor);
  await service.control({ paused: false });
  await expect(
    operatorActionCataloguePage(service, context, PLAYER_ID, scope, {
      limit: 1,
      available: true,
      cursor: first.nextCursor!,
    }),
  ).rejects.toThrow('changed');
  await expect(
    operatorActionCataloguePage(service, context, 'not-a-permitted-actor', scope),
  ).rejects.toThrow('unavailable');
  const scanning = operatorActionCataloguePage(service, context, PLAYER_ID, scope);
  service.notify();
  await expect(scanning).rejects.toThrow('changed');
});

it('offers real contact through the ordinary player command and retains its saved occurrence', async () => {
  const { store, service } = await setup();
  await editWorld(service, (world) => {
    for (const [id, z] of [
      [PLAYER_ID, 13],
      [NPC_ID, 14],
    ] as const) {
      const actor = entityGet(world.entities, id)!;
      setSpatialPosition(world, actor, { x: 12, y: 0, z }, worldSupport(actor));
    }
  });
  const offered = actionCatalogue(service, { targetId: NPC_ID }).actions.find(
    (action) => action.id === `express:tickle:${NPC_ID}`,
  );
  expect(offered?.enabled).toBe(true);
  expect(offered?.description).toContain('contact once');
  if (offered?.intent.kind !== 'command') throw new Error('Missing ordinary contact command.');
  const before = entityGet(service.world.entities, NPC_ID)!.actor!.health;
  expect(await service.command('ordinary-contact', offered.intent.command)).toMatchObject({
    ok: true,
  });
  expect(entityGet(service.world.entities, NPC_ID)!.actor!.health).toBe(before);
  const event = service.world.events.find(
    (event) => event.type === 'expression' && event.data?.['contactKind'] === 'tickle',
  );
  expect(event).toBeDefined();
  const reopened = await store.load();
  expect(reopened?.state.world.moduleManifest.expressions).toEqual(
    service.world.moduleManifest.expressions,
  );
  expect(
    reopened?.state.world.events.find((candidate) => candidate.id === event!.id)?.data,
  ).toMatchObject({ mechanical: true, contactKind: 'tickle' });
});

it('omits uninstalled expressions from ordinary menus and the bound NPC response schema', async () => {
  const { service } = await setup();
  await editWorld(service, (world) => {
    delete world.moduleManifest.expressions;
  });
  expect(
    actionCatalogue(service, { targetId: NPC_ID }).actions.some((action) =>
      action.id.startsWith('express:'),
    ),
  ).toBe(false);
  const expressions = selectedExpressions(service.world, entityGet(service.world.entities, NPC_ID));
  const schema = boundResponseSchema(
    [NPC_ID, PLAYER_ID],
    { known: [], plan: [] },
    { speech: true, expressions },
  );
  const prompt = readableDecisionContext(
    { capabilities: { speech: true, expressions: expressions.map((definition) => definition.id) } },
    [],
  );
  expect(prompt).not.toContain('known|expression|proposal|invoke');
  expect(prompt).not.toContain('for expression, fill verb');
  const response = {
    operations: [
      {
        localId: 'touch',
        requiresAccepted: [],
        act: {
          kind: 'expression',
          verb: 'tickle',
          targetEntityId: PLAYER_ID,
        },
      },
    ],
  };
  expect(schema.safeParse(response).success).toBe(false);
  expect(
    await service.command('absent-contact', { type: 'express', verb: 'tickle', targetId: NPC_ID }),
  ).toMatchObject({ ok: false });
});
