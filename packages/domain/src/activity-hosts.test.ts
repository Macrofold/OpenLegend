import { expect, it } from 'vitest';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import {
  activityRequestChoices,
  activityRequestDescriptors,
  prepareActivityRequestCoverage,
  observeActor,
  PLAYER_ID,
  NPC_ID,
  createWorld,
  createItemLot,
  bindActivityRequest,
  executeCommand,
  entityGet,
  setSpatialPosition,
  custodian,
} from './index.js';

it('narrows meal material choices to their selected own-stock source', () => {
  const world = createWorld();
  const food = Object.values(world.itemDefinitions).find(
    (definition) => (definition.nutrition ?? 0) > 0,
  )!;
  const ownFood = createItemLot(world, PLAYER_ID, food.id, 2, 'fixture-meal-food');
  const family = world.workBatchPolicy!.presentation!.meal.id;
  const descriptor = activityRequestDescriptors(world, PLAYER_ID).find(
    (entry) => entry.id === family,
  )!;
  expect(descriptor.fields.definitionId!.dependencies).toContain('sourceId');
  const selected = activityRequestChoices(world, PLAYER_ID, undefined, {
    family,
    field: 'definitionId',
    arguments: { sourceId: PLAYER_ID },
  }).choices;
  expect(selected.length).toBeGreaterThan(0);
  expect(selected.every((choice) => choice.requires?.sourceId === PLAYER_ID)).toBe(true);
  const other = activityRequestChoices(world, PLAYER_ID, undefined, {
    family,
    field: 'definitionId',
    arguments: { sourceId: NPC_ID },
  }).choices;
  expect(other).toEqual([]);

  // The direct form reaches ordinary handover admission without a concrete
  // recipient × lot × quantity catalogue. Possession is still not consent.
  setSpatialPosition(world, entityGet(world.entities, NPC_ID)!, { x: 17, y: 0, z: 16 }, 'terrain');
  setSpatialPosition(
    world,
    entityGet(world.entities, PLAYER_ID)!,
    { x: 16, y: 0, z: 16 },
    'terrain',
  );
  const gift = 'base:offer-possession';
  const form = activityRequestDescriptors(world, PLAYER_ID).find((entry) => entry.id === gift)!;
  expect(form.fields.quantity!.maximum).toBe(2);
  expect(form.fields.quantity!.dependencies).toEqual(['itemId']);
  const stock = activityRequestDescriptors(world, PLAYER_ID).find(
    (entry) => entry.id === 'base:transfer-stock',
  )!;
  expect(stock.fields.quantity!.dependencies).toEqual(['sourceId', 'definitionId']);
  expect(stock.fields.minimumHeld!.dependencies).toEqual(['definitionId']);
  const material = activityRequestChoices(world, PLAYER_ID, undefined, {
    family: gift,
    field: 'itemId',
    arguments: { targetId: NPC_ID },
  }).choices;
  expect(material.some((choice) => choice.id === ownFood)).toBe(true);
  const foreign = createItemLot(world, NPC_ID, food.id, 3, 'fixture-private-food');
  const ranged = Object.values(world.itemDefinitions).find(
    (definition) => definition.rangedWeapon,
  )!;
  const ammo = Object.values(world.itemDefinitions).find(
    (definition) => definition.ammunition?.kind === ranged.rangedWeapon!.ammunitionKind,
  )!;
  createItemLot(world, PLAYER_ID, ammo.id, 2, 'fixture-own-ammo');
  const foreignWeapon = createItemLot(world, NPC_ID, ranged.id, 1, 'fixture-private-tool');
  expect(
    activityRequestChoices(world, PLAYER_ID, undefined, {
      family: 'base:aim',
      field: 'ammoItemId',
      arguments: { targetId: NPC_ID, weaponItemId: foreignWeapon },
    }).choices,
  ).toEqual([]);
  expect(
    activityRequestChoices(world, PLAYER_ID, undefined, {
      family: 'base:transfer-stock',
      field: 'definitionId',
      arguments: { sourceId: NPC_ID },
    }).choices,
  ).toEqual([]);
  const offer = (itemId: string, quantity: number) =>
    bindActivityRequest(
      world,
      PLAYER_ID,
      `offer-${itemId}-${quantity}`,
      {
        family: gift,
        arguments: { targetId: NPC_ID, itemId, quantity },
      },
      [PLAYER_ID, NPC_ID, ownFood, foreign],
    );
  expect(offer(foreign, 1)).toMatchObject({ ok: false });
  expect(offer(ownFood, 3)).toMatchObject({ ok: false });
  const selectedOffer = offer(ownFood, 1);
  expect('type' in selectedOffer && selectedOffer.type).toBe('handover');
  if ('ok' in selectedOffer) throw new Error(selectedOffer.message);
  const offered = executeCommand(world, selectedOffer);
  expect(offered.outcome.ok).toBe(true);
  expect(custodian(offered.world, ownFood)).toBe(PLAYER_ID);
});

it('shares exact source/material associations for existing camp requests', () => {
  const world = stockedCamp();
  const observed = observeActor(world, PLAYER_ID, { includeMemories: false })!;
  const source = observed.visibleEntities.find(
    (entry) =>
      entry.resource &&
      world.itemDefinitions[entry.resource.definitionId]?.properties.includes('fuel'),
  )!;
  expect(source).toBeDefined();
  const request = activityRequestDescriptors(world, PLAYER_ID).find(
    (entry) => entry.id === 'base:camp-supply-method',
  )!;
  // Dependencies of a compound request are not complete direct-action coverage.
  expect(prepareActivityRequestCoverage([request])({ type: 'gather' })).toBe(false);
  const covered = prepareActivityRequestCoverage([
    { ...request, covers: [{ type: 'tend-fire', equals: { operation: 'fuel' } }] },
  ]);
  expect(covered({ type: 'tend-fire', operation: 'fuel' })).toBe(true);
  expect(covered({ type: 'tend-fire', operation: 'light' })).toBe(false);
  expect(covered({ type: 'gather' })).toBe(false);
  const material = activityRequestChoices(world, PLAYER_ID, observed, {
    family: 'base:camp-supply-method',
    field: 'definitionId',
    arguments: { sourceId: source.id },
  }).choices;
  expect(material).toEqual([
    expect.objectContaining({
      id: source.resource!.definitionId,
      kind: 'definition',
      requires: { sourceId: source.id },
    }),
  ]);
  const own = activityRequestChoices(world, PLAYER_ID, observed, {
    family: 'base:fire-watch',
    field: 'definitionId',
    arguments: { sourceId: PLAYER_ID },
  }).choices;
  expect(own.length).toBeGreaterThan(0);
  expect(own.every((choice) => choice.requires?.sourceId === PLAYER_ID)).toBe(true);
});
