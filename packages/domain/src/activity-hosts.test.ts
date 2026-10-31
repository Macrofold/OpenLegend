import { expect, it } from 'vitest';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import {
  activityRequestChoices,
  activityRequestDescriptors,
  observeActor,
  PLAYER_ID,
  NPC_ID,
  createWorld,
  createItemLot,
} from './index.js';

it('narrows meal material choices to their selected own-stock source', () => {
  const world = createWorld();
  const food = Object.values(world.itemDefinitions).find(
    (definition) => (definition.nutrition ?? 0) > 0,
  )!;
  createItemLot(world, PLAYER_ID, food.id, 2, 'fixture-meal-food');
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
