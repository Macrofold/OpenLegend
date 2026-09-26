import { worldPosition } from './spatial-state.js';
import { describe, expect, it } from 'vitest';
import { createWorld, quantityOf, reviveActor, spawnWorldEntity } from './index.js';

describe('god world editing (native fixtures)', () => {
  it('creates a person with saved identity, selected traits and basic possessions', () => {
    const original = createWorld(31);
    const result = spawnWorldEntity(original, {
      type: 'person',
      position: { y: 0, surfaceId: 'terrain', x: 24, z: 5 },
      person: {
        name: 'Mira',
        personality: 'Warm, direct, and difficult to discourage.',
        backstory: 'Mira once mapped the marsh paths north of the clearing.',
        traitIds: ['curious', 'steadfast'],
        initialGoals: ['Find a safe route home.', 'Learn who lives nearby.'],
      },
    });
    expect(result.outcome).toMatchObject({ ok: true, code: 'spawned' });
    expect(original.entities).not.toHaveProperty('person-20');
    const person = Object.values(result.world.entities).find((entity) => entity.name === 'Mira')!;
    expect(person.actor).toMatchObject({
      personality: 'Warm, direct, and difficult to discourage.',
      backstory: 'Mira once mapped the marsh paths north of the clearing.',
      initialGoals: ['Find a safe route home.', 'Learn who lives nearby.'],
      goal: 'Find a safe route home.',
      alive: true,
    });
    expect(person.actor!.traits!.map((trait) => trait.id)).toEqual(['curious', 'steadfast']);
    expect(result.world.memories[person.id]).toEqual([]);
    expect(quantityOf(result.world, person.id, 'berries')).toBe(3);
    expect(quantityOf(result.world, person.id, 'stone_tool')).toBe(1);
  });

  it('assigns three saved random traits when omitted and revives only dead characters', () => {
    const spawned = spawnWorldEntity(createWorld(32), {
      type: 'person',
      position: { y: 0, surfaceId: 'terrain', x: 24, z: 5 },
      person: {
        name: 'Rowan',
        personality: '',
        backstory: '',
        traitIds: [],
        initialGoals: [],
      },
    }).world;
    const person = Object.values(spawned.entities).find((entity) => entity.name === 'Rowan')!;
    expect(person.actor!.traits).toHaveLength(3);
    person.actor!.alive = false;
    person.actor!.incapacitated = true;
    person.actor!.health = 0;
    const revived = reviveActor(spawned, person.id);
    expect(revived.outcome).toMatchObject({ ok: true, code: 'revived' });
    expect(revived.world.entities[person.id]!.actor).toMatchObject({
      alive: true,
      incapacitated: false,
      health: 25,
    });
    expect(reviveActor(revived.world, person.id).outcome.code).toBe('alive');
  });

  it('rejects blocked, occupied and unsupported spawn data without changing the world', () => {
    const world = createWorld(33);
    expect(
      spawnWorldEntity(world, {
        type: 'hare',
        position: { y: 0, surfaceId: 'terrain', x: 0, z: 0 },
      }).outcome.code,
    ).toBe('blocked');
    expect(
      spawnWorldEntity(world, {
        type: 'river-stones',
        position: { ...worldPosition(world.entities.player!), surfaceId: 'terrain' },
      }).outcome.code,
    ).toBe('occupied');
    expect(JSON.stringify(world)).toBe(JSON.stringify(createWorld(33)));
  });
});
