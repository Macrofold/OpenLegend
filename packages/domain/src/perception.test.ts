import { PLAYER_ID, NPC_ID } from '@open-legend/domain';
import { setSpatialPosition, worldSupport } from './index.js';
import { expect, it } from 'vitest';
import { canSee, createWorld, executeCommand, observeActor } from './index.js';

it('sees distant objects across prototype obstacles without extending speech exposure', () => {
  const world = createWorld();
  setSpatialPosition(
    world,
    world.entities[PLAYER_ID]!,
    { y: 0, x: 1, z: 2 },
    worldSupport(world.entities[PLAYER_ID]!),
  );
  setSpatialPosition(
    world,
    world.entities[NPC_ID]!,
    { y: 0, x: 22, z: 2 },
    worldSupport(world.entities[NPC_ID]!),
  );
  world.map.tiles[2]!.fill('grass');
  world.map.tiles[2]![10] = 'rock';
  expect(
    observeActor(world, PLAYER_ID)!.visibleEntities.some((entity) => entity.id === NPC_ID),
  ).toBe(true);
  const directed = executeCommand(world, {
    id: 'fixture-distant-speech',
    actorId: PLAYER_ID,
    type: 'say',
    volume: 'whisper',
    targetId: NPC_ID,
    text: 'Can you hear me?',
  });
  // Addressing someone does not deliver words at a distance; speech itself still occurs.
  expect(directed.outcome.code).toBe('spoken');
  const directedEvidence = directed.world.experience?.awareness[NPC_ID]?.find(
    (entry) => entry.eventId === directed.events.find((event) => event.type === 'speech')?.id,
  );
  expect(directedEvidence?.speech?.intelligibility).toBe('none');
  const spoken = executeCommand(world, {
    id: 'fixture-local-speech',
    actorId: PLAYER_ID,
    type: 'say',
    volume: 'whisper',
    text: 'A quiet observation.',
  });
  // Visual speech evidence may exist at this distance, but no whispered words are granted.
  const seen = spoken.world.experience?.awareness[NPC_ID]?.find(
    (entry) => entry.eventId === spoken.events.find((event) => event.type === 'speech')?.id,
  );
  expect(seen?.speech?.intelligibility).toBe('none');
  expect(seen?.speech?.segments.some((segment) => segment.kind === 'heard')).toBe(false);
});

it('keeps an authoritative outer sight boundary even though the renderer can remember old images', () => {
  expect(canSee({ y: 0, x: 0, z: 0 }, { y: 0, x: 28, z: 0 })).toBe(true);
  expect(canSee({ y: 0, x: 0, z: 0 }, { y: 0, x: 28.01, z: 0 })).toBe(false);
  const world = createWorld();
  setSpatialPosition(
    world,
    world.entities[PLAYER_ID]!,
    { y: 0, x: 1, z: 1 },
    worldSupport(world.entities[PLAYER_ID]!),
  );
  setSpatialPosition(
    world,
    world.entities[NPC_ID]!,
    { y: 0, x: 27, z: 23 },
    worldSupport(world.entities[NPC_ID]!),
  );
  expect(
    observeActor(world, PLAYER_ID)!.visibleEntities.some((entity) => entity.id === NPC_ID),
  ).toBe(false);
});
