import { it, expect } from 'vitest';
import { createWorld, observeActor } from '@open-legend/domain';
import { describeEntity } from './entity-description.js';
import { commandFacts } from './action-descriptions.js';
it('native fixture: look-closer prose and berry facts describe actual resource mechanics', () => {
  const world = createWorld();
  const observation = observeActor(world, 'player')!;
  expect(commandFacts({ type: 'gather', targetId: 'berries-west' }, observation)).toEqual([
    ['Yields', '2 Wild berries'],
    ['Time', '30 seconds of game time, plus travel'],
  ]);
  expect(describeEntity(world.entities['berries-west']!, world.itemDefinitions)).toContain(
    'Familiar edible berries',
  );
  world.memories.ada!.push({
    id: 'secret',
    actorId: 'ada',
    kind: 'belief',
    source: 'inferred',
    summary: 'Private secret',
    at: 0,
    entityIds: [],
    importance: 1,
  });
  expect(describeEntity(world.entities.ada!, world.itemDefinitions)).not.toContain('secret');
});

it('native fixture: preparation facts have material costs and exclude travel', () => {
  const observation = observeActor(createWorld(), 'player')!;
  const facts = commandFacts({ type: 'prepare', preparation: 'cord' }, observation);
  expect(facts.some(([label]) => label === 'Costs')).toBe(true);
  expect(facts.find(([label]) => label === 'Time')?.[1]).not.toContain('travel');
});
