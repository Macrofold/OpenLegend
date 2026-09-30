import { PLAYER_ID, NPC_ID } from '@open-legend/domain';
import { setSpatialPosition, worldSupport } from './index.js';
import { expect, it } from 'vitest';
import { canSee, createWorld, executeCommand, experienceEntry, observeActor } from './index.js';

it('sees distant objects without extending speech exposure', () => {
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
  expect(
    observeActor(world, PLAYER_ID)!.visibleEntities.some((entity) => entity.id === NPC_ID),
  ).toBe(true);
  // Sight reaches past the partial-word range: the NPC may notice speech, never its words.
  // docs/hearing-and-speech.md#initial-default-world-tuning
  const npcEvidence = (transition: ReturnType<typeof executeCommand>) =>
    experienceEntry(
      transition.world,
      NPC_ID,
      `awareness:${transition.events.find((event) => event.type === 'speech')!.id}`,
    )?.value;
  const directed = executeCommand(world, {
    id: 'fixture-distant-speech',
    actorId: PLAYER_ID,
    type: 'say',
    targetId: NPC_ID,
    text: 'Can you hear me?',
  });
  // Addressing is intention, not delivery: the words are spoken aloud but still unheard.
  // docs/hearing-and-speech.md#4-speech-volume-and-admission
  expect(directed.outcome.code).toBe('spoken');
  expect(npcEvidence(directed)).toMatchObject({
    speech: { intelligibility: 'none', segments: [] },
  });
  const spoken = executeCommand(world, {
    id: 'fixture-local-speech',
    actorId: PLAYER_ID,
    type: 'say',
    text: 'A quiet observation.',
  });
  expect(npcEvidence(spoken)).toMatchObject({ speech: { intelligibility: 'none', segments: [] } });
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
