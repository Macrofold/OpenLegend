import { PLAYER_ID, NPC_ID } from '@open-legend/domain';
import { describe, it, expect } from 'vitest';
import { createActor, createWorld, initializeActorTraits } from './data.js';
describe('saved character traits (native fixtures)', () => {
  it('preserves starting traits and samples three distinct described traits from saved RNG', () => {
    const world = createWorld(19),
      same = createWorld(19);
    expect(world).toEqual(same);
    for (const id of [PLAYER_ID, NPC_ID]) {
      const traits = world.entities[id]!.actor!.traits!;
      expect(new Set(traits.map((t) => t.id)).size).toBe(3);
      expect(traits.every((t) => !!t.name && !!t.description)).toBe(true);
    }
    // This authored character deliberately supplies an empty list instead of sampling.
    expect(world.entities['peacock-mercenary']!.actor!.traits).toEqual([]);
    const before = world.rngState;
    const actor = createActor(world, 'npc', 70);
    expect(actor.traits).toHaveLength(3);
    expect(new Set(actor.traits!.map((t) => t.id)).size).toBe(3);
    expect(actor.traits!.every((t) => !!t.name && !!t.description)).toBe(true);
    expect(world.rngState).not.toBe(before);
    expect(actor.traits).toEqual(createActor(same, 'npc', 70).traits);
  });
  it('migrates missing traits once, preserves saved descriptions and consumes no RNG on reload', () => {
    const world = createWorld(3);
    const original = world.entities[PLAYER_ID]!.actor!.traits!;
    original[0]!.description = 'Saved description remains authoritative.';
    delete world.entities[NPC_ID]!.actor!.traits;
    initializeActorTraits(world);
    const saved = JSON.stringify(world),
      reloaded = JSON.parse(saved);
    initializeActorTraits(reloaded);
    expect(JSON.stringify(reloaded)).toBe(saved);
    expect(reloaded.entities[PLAYER_ID].actor.traits[0].description).toBe(
      'Saved description remains authoritative.',
    );
  });
});
