import { entityGet } from './entity-collection.js';
import { PLAYER_ID, NPC_ID } from '@open-legend/domain';
import { setSpatialPosition, worldSupport } from './index.js';
import { expect, it } from 'vitest';
import {
  canSee,
  createWorld,
  executeCommand,
  experienceEntry,
  observeActor,
  initializePerception,
  advanceWorld,
} from './index.js';
import { captureEvidenceCut } from './perception-evidence.js';

it('sees distant objects without extending speech exposure', () => {
  const world = createWorld();
  setSpatialPosition(
    world,
    entityGet(world.entities, PLAYER_ID)!,
    { y: 0, x: 1, z: 2 },
    worldSupport(entityGet(world.entities, PLAYER_ID)!),
  );
  setSpatialPosition(
    world,
    entityGet(world.entities, NPC_ID)!,
    { y: 0, x: 22, z: 2 },
    worldSupport(entityGet(world.entities, NPC_ID)!),
  );
  initializePerception(world, []);
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
    volume: 'whisper',
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
    volume: 'whisper',
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
    entityGet(world.entities, PLAYER_ID)!,
    { y: 0, x: 1, z: 1 },
    worldSupport(entityGet(world.entities, PLAYER_ID)!),
  );
  setSpatialPosition(
    world,
    entityGet(world.entities, NPC_ID)!,
    { y: 0, x: 27, z: 23 },
    worldSupport(entityGet(world.entities, NPC_ID)!),
  );
  initializePerception(world, []);
  expect(
    observeActor(world, PLAYER_ID)!.visibleEntities.some((entity) => entity.id === NPC_ID),
  ).toBe(false);
});

it("ends a memoryless listener's transient sound at the next later native perception phase", () => {
  const world = createWorld();
  const player = entityGet(world.entities, PLAYER_ID)!,
    npc = entityGet(world.entities, NPC_ID)!;
  player.actor!.capabilities = {
    cognition: true,
    innerWorld: true,
    speech: true,
    memory: false,
    language: true,
  };
  setSpatialPosition(world, player, { x: 1, y: 0, z: 2 }, worldSupport(player));
  setSpatialPosition(world, npc, { x: 2, y: 0, z: 2 }, worldSupport(npc));
  initializePerception(world, []);
  expect(captureEvidenceCut(world, PLAYER_ID).current).toHaveLength(0);
  const spoken = executeCommand(world, {
    id: 'transient-sound',
    actorId: NPC_ID,
    type: 'say',
    targetId: PLAYER_ID,
    text: 'Actually spoken words.',
  });
  expect(spoken.outcome.ok).toBe(true);
  const heard = captureEvidenceCut(spoken.world, PLAYER_ID).acquired;
  expect(
    heard.some((observation) => observation.facets.some((facet) => facet.value.kind === 'sound')),
  ).toBe(true);
  expect(
    heard.some((observation) => observation.facets.some((facet) => facet.value.kind === 'speech')),
  ).toBe(false);
  const later = advanceWorld(spoken.world, 0.01).world;
  expect(
    captureEvidenceCut(later, PLAYER_ID).acquired.some((observation) =>
      observation.facets.some((facet) => facet.value.kind === 'sound'),
    ),
  ).toBe(false);
  const again = executeCommand(later, {
    id: 'new-transient-sound',
    actorId: NPC_ID,
    type: 'say',
    targetId: PLAYER_ID,
    text: 'A new actual sound.',
  });
  expect(again.outcome.ok).toBe(true);
  expect(
    captureEvidenceCut(again.world, PLAYER_ID).acquired.some((observation) =>
      observation.facets.some((facet) => facet.value.kind === 'sound'),
    ),
  ).toBe(true);
});
