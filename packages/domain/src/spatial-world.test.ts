import { describe, expect, it } from 'vitest';
import {
  PLAYER_ID,
  NPC_ID,
  advanceWorld,
  canReachEntity,
  createWorld,
  executeCommand,
  hearsEntity,
  quantityOf,
  replaceSpatialLayout,
  seesEntity,
  setSpatialPosition,
  validateSpatialWorld,
  type WorldState,
} from './index.js';
import { commitBodyEffects } from './living.js';
import { validateWorldModules } from './world-modules.js';

function active() {
  const world = createWorld();
  world.paused = false;
  return world;
}
function advance(world: WorldState, seconds: number) {
  return advanceWorld(world, seconds).world;
}

describe('native spatial-world integration without providers', () => {
  it('moves onto the lookout, gathers its actual resource, and returns below', () => {
    let world = active();
    let t = executeCommand(world, {
      id: 'up',
      actorId: PLAYER_ID,
      type: 'move',
      destination: { x: 20, y: 3, z: 5.5, surfaceId: 'lookout-deck' },
    });
    expect(t.outcome.ok).toBe(true);
    world = advance(t.world, 280);
    expect(world.entities[PLAYER_ID]!.position).toEqual({ x: 20, y: 3, z: 5.5 });
    expect(world.entities[PLAYER_ID]!.spatial.supportSurfaceId).toBe('lookout-deck');
    expect(world.entities[PLAYER_ID]!.actor!.action).toBeNull();
    const before = quantityOf(world, PLAYER_ID, 'wood');
    t = executeCommand(world, {
      id: 'deck-gather',
      actorId: PLAYER_ID,
      type: 'gather',
      targetId: 'lookout-cache',
    });
    expect(t.outcome.ok).toBe(true);
    world = advance(t.world, 80);
    expect(quantityOf(world, PLAYER_ID, 'wood')).toBeGreaterThan(before);
    t = executeCommand(world, {
      id: 'down',
      actorId: PLAYER_ID,
      type: 'move',
      destination: { x: 20, y: 0, z: 5.5, surfaceId: 'terrain' },
    });
    expect(t.outcome.ok).toBe(true);
    world = advance(t.world, 350);
    expect(world.entities[PLAYER_ID]!.position).toEqual({ x: 20, y: 0, z: 5.5 });
    validateSpatialWorld(world);
  });
  it('enforces floor and airborne reach and protects private speech through slabs', () => {
    const world = active(),
      a = world.entities[PLAYER_ID]!,
      b = world.entities[NPC_ID]!;
    setSpatialPosition(a, { x: 20, y: 0, z: 5.5 }, 'terrain');
    setSpatialPosition(b, { x: 20, y: 3, z: 5.5 }, 'lookout-deck');
    expect(canReachEntity(world, a, b, 1.6)).toBe(false);
    expect(seesEntity(world, a, b)).toBe(false);
    expect(hearsEntity(world, a, b)).toBe(false);
    const speech = executeCommand(world, {
      id: 'above-speech',
      actorId: b.id,
      type: 'say',
      text: 'Private words above the floor',
    });
    expect(speech.events.find((event) => event.type === 'speech')?.audience).not.toContain(a.id);
    expect(speech.events.find((event) => event.type === 'speech')?.origin).toEqual(b.position);
    const bird = world.entities['bird-1']!;
    setSpatialPosition(bird, { x: 20, y: 6, z: 5.5 }, null);
    expect(canReachEntity(world, a, bird, 1.6)).toBe(false);
  });
  it('rejects wrong-floor commands, missing coordinates and stale geometry without effects', () => {
    const world = active();
    for (const destination of [
      { x: 20, y: 3, z: 5.5, surfaceId: 'terrain' },
      { x: 20, z: 5.5, surfaceId: 'terrain' },
      { x: 20, y: Infinity, z: 5.5, surfaceId: 'lookout-deck' },
    ]) {
      const result = executeCommand(world, {
        id: 'invalid',
        actorId: PLAYER_ID,
        type: 'move',
        destination,
      } as Parameters<typeof executeCommand>[1]);
      expect(result.outcome.ok).toBe(false);
      expect(result.world).toBe(world);
      expect(result.events).toEqual([]);
    }
    expect(replaceSpatialLayout(world, world.map.spatial, 99).outcome.ok).toBe(false);
    const next = structuredClone(world.map.spatial);
    next.surfaces = next.surfaces.filter((s) => s.id !== 'lookout-deck');
    expect(replaceSpatialLayout(world, next, world.map.spatial.revision).outcome.ok).toBe(false);
  });
  it('preserves a mid-ramp route through same-version JSON restoration', () => {
    let world = executeCommand(active(), {
      id: 'restore-up',
      actorId: PLAYER_ID,
      type: 'move',
      destination: { x: 20, y: 3, z: 5.5, surfaceId: 'lookout-deck' },
    }).world;
    for (
      let i = 0;
      i < 250 &&
      !(world.entities[PLAYER_ID]!.position.y > 0.1 && world.entities[PLAYER_ID]!.position.y < 2.9);
      i++
    )
      world = advance(world, 1);
    expect(world.entities[PLAYER_ID]!.spatial.supportSurfaceId).toBe('lookout-ramp');
    const restored = JSON.parse(JSON.stringify(world)) as WorldState;
    validateWorldModules(restored);
    expect(advance(restored, 120)).toEqual(advance(world, 120));
  });
  it('executes native flight and grounded landing without an AI job', () => {
    let world = active();
    const ids = Object.keys(world.entities);
    world = advance(world, 240);
    expect(world.entities['bird-1']!.position.y).toBeGreaterThan(3);
    expect(world.entities['bird-1']!.spatial.supportSurfaceId).toBeNull();
    const restored = JSON.parse(JSON.stringify(world)) as WorldState;
    expect(advance(world, 20)).toEqual(advance(restored, 20));
    const trip = advanceWorld(world, 650);
    world = trip.world;
    expect(trip.events.some((event) => event.type === 'landed' && event.actorId === 'bird-1')).toBe(
      true,
    );
    expect(Object.keys(world.entities)).toEqual(ids);
    validateSpatialWorld(world);
  });
  it('lands a dead flyer once without duplicating its identity or finite remains', () => {
    let world = structuredClone(advance(active(), 240));
    const bird = world.entities['bird-1']!;
    commitBodyEffects(
      world,
      bird,
      [{ kind: 'health', amount: -100, targetId: bird.id }],
      'fixture',
      [],
    );
    expect(bird.actor!.alive).toBe(false);
    world = advance(world, 80);
    expect(world.entities['bird-1']!.spatial.supportSurfaceId).not.toBeNull();
    expect(world.entities['bird-1']!.spatial.flight).toBeUndefined();
    expect(world.entities['bird-1']!.spatial.fallVelocity).toBeUndefined();
    expect(Object.values(world.entities).filter((e) => e.id === 'bird-1')).toHaveLength(1);
  });
  it('lands a fallen bird on real rock support and keeps the result restorable', () => {
    let world = active();
    const z = world.map.tiles.findIndex((row) => row.includes('rock'));
    const x = world.map.tiles[z]!.indexOf('rock');
    const bird = world.entities['bird-1']!;
    setSpatialPosition(bird, { x, y: 6, z }, null);
    delete bird.spatial.flight;
    bird.spatial.fallVelocity = 0;
    bird.actor!.alive = false;
    world = advance(world, 80);
    expect(world.entities['bird-1']!.position.y).toBe(2);
    expect(world.entities['bird-1']!.spatial.supportSurfaceId).toBe(`terrain-rock:${x}:${z}`);
    validateSpatialWorld(JSON.parse(JSON.stringify(world)) as WorldState);
  });
  it('rejects a saved route whose waypoint silently changes floor', () => {
    const world = executeCommand(active(), {
      id: 'bad-save-route',
      actorId: PLAYER_ID,
      type: 'move',
      destination: { x: 20, y: 3, z: 5.5, surfaceId: 'lookout-deck' },
    }).world;
    const bad = structuredClone(world);
    bad.entities[PLAYER_ID]!.actor!.action!.path[0]!.y += 3;
    expect(() => validateSpatialWorld(bad)).toThrow('Invalid saved spatial route');
  });
  it('refuses a second airborne physical executor and invalid flight corridors', () => {
    const world = advance(active(), 240);
    expect(
      executeCommand(world, {
        id: 'air-rest',
        actorId: 'bird-1',
        type: 'status-effect',
        definitionId: 'rest',
        targetId: 'bird-1',
        operation: 'activate',
      }).outcome.code,
    ).toBe('unsupported-airborne-action');
    const broken = structuredClone(world);
    broken.flightRoutes['clearing-bird-loop']!.points[1]!.position.x += 1;
    expect(() => validateSpatialWorld(broken)).toThrow('vertical');
  });
  it('rejects old formats explicitly instead of silently upgrading a save', () => {
    const old = active();
    old.schemaVersion = 8;
    expect(() => validateWorldModules(old)).toThrow('3D format 9');
  });
});
