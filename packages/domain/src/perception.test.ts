import { setSpatialPosition, worldSupport } from './index.js';
import { expect, it } from 'vitest';
import { canSee, createWorld, executeCommand, observeActor } from './index.js';

it('sees distant objects across prototype obstacles without extending speech exposure', () => {
  const world = createWorld();
  setSpatialPosition(
    world,
    world.entities.player!,
    { y: 0, x: 1, z: 2 },
    worldSupport(world.entities.player!),
  );
  setSpatialPosition(
    world,
    world.entities.ada!,
    { y: 0, x: 22, z: 2 },
    worldSupport(world.entities.ada!),
  );
  world.map.tiles[2]!.fill('grass');
  world.map.tiles[2]![10] = 'rock';
  expect(observeActor(world, 'player')!.visibleEntities.some((entity) => entity.id === 'ada')).toBe(
    true,
  );
  const directed = executeCommand(world, {
    id: 'fixture-distant-speech',
    actorId: 'player',
    type: 'say',
    targetId: 'ada',
    text: 'Can you hear me?',
  });
  expect(directed.outcome.code).toBe('not-heard');
  const spoken = executeCommand(world, {
    id: 'fixture-local-speech',
    actorId: 'player',
    type: 'say',
    text: 'A quiet observation.',
  });
  expect(spoken.world.events.at(-1)!.audience).not.toContain('ada');
});

it('keeps an authoritative outer sight boundary even though the renderer can remember old images', () => {
  expect(canSee({ y: 0, x: 0, z: 0 }, { y: 0, x: 28, z: 0 })).toBe(true);
  expect(canSee({ y: 0, x: 0, z: 0 }, { y: 0, x: 28.01, z: 0 })).toBe(false);
  const world = createWorld();
  setSpatialPosition(
    world,
    world.entities.player!,
    { y: 0, x: 1, z: 1 },
    worldSupport(world.entities.player!),
  );
  setSpatialPosition(
    world,
    world.entities.ada!,
    { y: 0, x: 27, z: 23 },
    worldSupport(world.entities.ada!),
  );
  expect(observeActor(world, 'player')!.visibleEntities.some((entity) => entity.id === 'ada')).toBe(
    false,
  );
});
