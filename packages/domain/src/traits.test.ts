import { describe, it, expect } from 'vitest';
import { createActor, createWorld, initializeActorTraits } from './data.js';
describe('saved character traits (native fixtures)', () => {
  it('draws three distinct described traits for every new actor from saved RNG', () => {
    const world = createWorld(19),
      same = createWorld(19);
    expect(world).toEqual(same);
    for (const e of Object.values(world.entities)) {
      if (!e.actor) continue;
      expect(new Set(e.actor.traits!.map((t) => t.id)).size).toBe(3);
      expect(e.actor.traits!.every((t) => !!t.name && !!t.description)).toBe(true);
    }
    const before = world.rngState;
    const actor = createActor(world, 'npc', 70);
    expect(actor.traits).toHaveLength(3);
    expect(world.rngState).not.toBe(before);
    expect(actor.traits).toEqual(createActor(same, 'npc', 70).traits);
  });
  it('migrates missing traits once, preserves saved descriptions and consumes no RNG on reload', () => {
    const world = createWorld(3);
    const original = world.entities.player!.actor!.traits!;
    original[0]!.description = 'Saved description remains authoritative.';
    delete world.entities.ada!.actor!.traits;
    initializeActorTraits(world);
    const saved = JSON.stringify(world),
      reloaded = JSON.parse(saved);
    initializeActorTraits(reloaded);
    expect(JSON.stringify(reloaded)).toBe(saved);
    expect(reloaded.entities.player.actor.traits[0].description).toBe(
      'Saved description remains authoritative.',
    );
  });
});
