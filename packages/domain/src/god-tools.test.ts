import { PLAYER_ID } from '@open-legend/domain';
import { worldPosition } from './spatial-state.js';
import { describe, expect, it } from 'vitest';
import {
  createWorld,
  quantityOf,
  reviveActor,
  spawnWorldEntity,
  type GodSpawnRequest,
  type WorldState,
} from './index.js';

describe('god world editing (native fixtures)', () => {
  it('creates a person with saved identity, selected traits and basic possessions', () => {
    const original = createWorld(31);
    const result = spawnWorldEntity(original, {
      id: 'create-mira',
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
    expect(result.outcome.entityId).toBe(person.id);
    expect(person.actor).toMatchObject({
      personality: 'Warm, direct, and difficult to discourage.',
      backstory: 'Mira once mapped the marsh paths north of the clearing.',
      initialGoals: ['Find a safe route home.', 'Learn who lives nearby.'],
      agency: {
        goals: [
          expect.objectContaining({ objective: 'Find a safe route home.' }),
          expect.objectContaining({ objective: 'Learn who lives nearby.' }),
        ],
      },
      alive: true,
    });
    expect(person.actor!.traits!.map((trait) => trait.id)).toEqual(['curious', 'steadfast']);
    expect(result.world.memories[person.id]).toEqual([]);
    expect(quantityOf(result.world, person.id, 'berries')).toBe(3);
    expect(quantityOf(result.world, person.id, 'stone_tool')).toBe(1);
  });

  it('retains random traits and exact creation through replay and restoration, then revives only the dead', () => {
    const request = {
      id: 'create-rowan',
      type: 'person',
      position: { y: 0, surfaceId: 'terrain', x: 24, z: 5 },
      person: {
        name: 'Rowan',
        personality: '',
        backstory: '',
        traitIds: [],
        initialGoals: [],
      },
    } satisfies GodSpawnRequest;
    const result = spawnWorldEntity(createWorld(32), request);
    const spawned = result.world;
    const person = Object.values(spawned.entities).find((entity) => entity.name === 'Rowan')!;
    expect(person.actor!.traits).toHaveLength(3);
    expect(result.outcome.entityId).toBe(person.id);
    const saved = JSON.stringify(spawned);
    // The original position is now occupied. Recovery must precede that mutable check,
    // without rerolling traits or adding possessions, memories, conditions or events.
    const replay = spawnWorldEntity(spawned, request);
    expect(replay.world).toBe(spawned);
    expect(replay.outcome).toEqual(result.outcome);
    expect(replay.events).toEqual([]);
    expect(JSON.stringify(spawned)).toBe(saved);
    const conflict = spawnWorldEntity(spawned, {
      ...request,
      person: { ...request.person, name: 'Someone else' },
    });
    expect(conflict.outcome).toMatchObject({ ok: false, code: 'identity' });
    expect(conflict.world).toBe(spawned);
    expect(conflict.events).toEqual([]);
    expect(JSON.stringify(spawned)).toBe(saved);
    const restored: WorldState = JSON.parse(saved);
    const recovered = spawnWorldEntity(restored, request);
    expect(recovered.world).toBe(restored);
    expect(recovered.outcome).toEqual(result.outcome);
    expect(recovered.events).toEqual([]);
    expect(JSON.stringify(restored)).toBe(saved);
    person.actor!.alive = false;
    person.actor!.incapacitated = true;
    person.actor!.health = 0;
    const revived = reviveActor(spawned, person.id);
    expect(revived.outcome).toMatchObject({ ok: true, code: 'revived' });
    expect(revived.world.entities[person.id]!.actor).toMatchObject({
      alive: true,
      incapacitated: false,
      health: 100,
    });
    expect(reviveActor(revived.world, person.id).outcome.code).toBe('alive');
  });

  it('preserves admission refusals and recovers exact environment creation', () => {
    const world = createWorld(33);
    expect(
      spawnWorldEntity(world, {
        id: 'blocked-hare',
        type: 'hare',
        position: { y: 0, surfaceId: 'terrain', x: 0, z: 0 },
      }).outcome.code,
    ).toBe('blocked');
    expect(
      spawnWorldEntity(world, {
        id: 'occupied-stones',
        type: 'river-stones',
        position: { ...worldPosition(world.entities[PLAYER_ID]!), surfaceId: 'terrain' },
      }).outcome.code,
    ).toBe('occupied');
    const request = {
      id: 'create-stones',
      type: 'river-stones',
      position: { y: 0, surfaceId: 'terrain', x: 24, z: 5 },
    } satisfies GodSpawnRequest;
    const invalid = spawnWorldEntity(world, { ...request, id: '__proto__' });
    expect(invalid.outcome).toMatchObject({ ok: false, code: 'identity' });
    expect(invalid.world).toBe(world);
    expect(JSON.stringify(world)).toBe(JSON.stringify(createWorld(33)));
    const created = spawnWorldEntity(world, request);
    expect(created.outcome).toMatchObject({ ok: true, code: 'spawned' });
    expect(
      Object.values(created.world.entities).find(
        (entity) => entity.id === created.outcome.entityId,
      ),
    ).toMatchObject({
      kind: 'resource',
      resource: { definitionId: 'stone', quantity: 60 },
    });
    const beforeReplay = JSON.stringify(created.world);
    const replay = spawnWorldEntity(created.world, request);
    expect(replay.outcome).toEqual(created.outcome);
    expect(replay.world).toBe(created.world);
    expect(replay.events).toEqual([]);
    expect(JSON.stringify(created.world)).toBe(beforeReplay);
  });
});
