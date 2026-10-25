import { describe, expect, it } from 'vitest';
import { fixture, command, aim } from '../../../tests/fixtures/combat-execution.js';
import {
  advanceWithNavigation,
  prepareWorldNavigation,
} from '../../../tests/fixtures/navigation.js';
import { entityGet } from './entity-collection.js';
import { advanceWorld, executeCommand } from './kernel.js';
import { PLAYER_ID, NPC_ID } from './worlds/base/world.js';
import { bodyProfile, setSpatialPosition, worldPosition, worldSupport } from './spatial-state.js';
import { validateWorldModules } from './world-modules.js';
import { nativeMovementSpeed } from './worlds/base/actions.js';
import { TERMINAL_FALL_SPEED, motionTrackPosition } from './flight.js';
import { movementTrack } from './action-movement.js';
import { SPATIAL_LIMITS } from '@open-legend/spatial';
import type { WorldEvent, WorldState, Command } from './types.js';

function released() {
  let { world } = fixture();
  world = aim(world);
  world = advanceWorld(world, 18).world;
  return command(world, {
    type: 'release-shot',
    aimId: entityGet(world.entities, PLAYER_ID)!.actor!.action!.id,
  });
}
function cut(world: WorldState, total: number, step: number) {
  const events: WorldEvent[] = [];
  for (let left = total; left > 1e-8; left -= Math.min(step, left)) {
    const result = advanceWithNavigation(world, Math.min(step, left));
    expect(result.outcome.ok, result.outcome.message).toBe(true);
    world = result.world;
    events.push(...result.events);
  }
  return { world, events };
}
function facts(events: WorldEvent[]) {
  return events
    .filter((event) =>
      [
        'body-ducked',
        'local-pose-ended',
        'projectile-crossing-cleared',
        'projectile-contact',
        'projectile-ended',
        'incapacitated',
        'landed',
        'takeoff',
        'evasion-ended',
      ].includes(event.type),
    )
    .map((event) => ({
      type: event.type,
      at: event.at,
      actorId: event.actorId,
      targetId: event.targetId,
      data: event.data ?? {},
    }));
}
function compare(world: WorldState, id: string, total: number, step = 0.2) {
  validateWorldModules(world);
  const large = cut(structuredClone(world), total, total),
    sliced = cut(structuredClone(world), total, step);
  const actual = facts(large.events),
    expected = facts(sliced.events);
  expect(actual).toHaveLength(expected.length);
  // Settlement uses the shared spatial skin. Preserve exact semantic ordering and
  // effect values, allowing only its world-distance equivalent in contact roots.
  const timeTolerance =
    (2 * SPATIAL_LIMITS.epsilon) /
    Math.min(...Object.values(world.projectiles!).map((flight) => flight.speed));
  for (let index = 0; index < actual.length; index++) {
    const a = actual[index]!,
      b = expected[index]!;
    expect({ ...a, at: undefined, data: undefined }).toEqual({
      ...b,
      at: undefined,
      data: undefined,
    });
    expect(Math.abs(a.at - b.at)).toBeLessThanOrEqual(timeTolerance);
    expect(Object.keys(a.data)).toEqual(Object.keys(b.data));
    for (const [key, value] of Object.entries(a.data)) {
      if (/^(position|observed)[XYZ]$/.test(key) && typeof value === 'number')
        expect(Math.abs(value - Number(b.data[key]))).toBeLessThanOrEqual(
          2 * SPATIAL_LIMITS.epsilon,
        );
      else expect(value).toEqual(b.data[key]);
    }
  }
  const a = entityGet(large.world.entities, id)!,
    b = entityGet(sliced.world.entities, id)!;
  for (const axis of ['x', 'y', 'z'] as const)
    expect(worldPosition(a)[axis]).toBeCloseTo(worldPosition(b)[axis], 5);
  expect(a.actor!.health).toBe(b.actor!.health);
  expect(a.spatial.localPose).toEqual(b.spatial.localPose);
  expect(large.world.rngState).toBe(sliced.world.rngState);
  validateWorldModules(large.world);
  validateWorldModules(sliced.world);
  return large;
}
describe('native motion producers at projectile boundaries', () => {
  it.each(['move', 'follow', 'evade'] as const)(
    'uses actual %s motion and its saved speed across time cuts',
    (type) => {
      let world = released();
      const target = entityGet(world.entities, NPC_ID)!,
        source = entityGet(world.entities, PLAYER_ID)!,
        p = { ...worldPosition(target) },
        flight = Object.values(world.projectiles!)[0]!;
      // Move the leader aside so the selected crossing can only concern the mover.
      setSpatialPosition(world, source, { ...p, z: p.z + 3 }, worldSupport(target));
      const fields =
        type === 'follow'
          ? { type, targetId: PLAYER_ID, distance: 1.5 }
          : { type, destination: { ...p, z: p.z + 1.8, surfaceId: worldSupport(target)! } };
      const admitted = executeCommand(world, {
        id: `motion-${type}`,
        actorId: NPC_ID,
        ...fields,
      } as Command);
      expect(admitted.outcome.ok, admitted.outcome.message).toBe(true);
      world = prepareWorldNavigation(admitted.world);
      const current = entityGet(world.entities, NPC_ID)!,
        speed = nativeMovementSpeed(world, current);
      if (type === 'evade') expect(speed).toBeCloseTo(1.8 / 12);
      flight.position = { x: p.x - 1.5, y: p.y + 0.2, z: p.z + speed * 3 };
      flight.direction = { x: 1, y: 0, z: 0 };
      flight.speed = 0.5;
      flight.handling = 0;
      flight.sourceExited = true;
      // Resolve the committed flight on the current admitted world, not a prior snapshot.
      Object.assign(Object.values(world.projectiles!)[0]!, flight);
      const result = compare(world, NPC_ID, 8);
      expect(
        result.events.some(
          (event) => event.type === 'projectile-contact' && event.actorId === NPC_ID,
        ),
      ).toBe(true);
    },
  );

  it('preserves a corridor turn and its actual crossing rather than using the endpoint chord', () => {
    const world = released(),
      source = entityGet(world.entities, PLAYER_ID)!,
      bird = entityGet(world.entities, 'bird-1')!,
      p = worldPosition(source),
      flight = Object.values(world.projectiles!)[0]!;
    bird.actor!.incapacitated = false;
    bird.actor!.senses = [];
    const start = { x: p.x + 3, y: p.y + 1.5, z: p.z + 1 };
    const route = {
      id: 'qualification:turned-flight',
      body: { ...bodyProfile(bird) },
      speed: 0.5,
      climbSpeed: 0.5,
      continuation: { kind: 'land' as const },
      points: [
        { position: start, waitSeconds: 0 },
        { position: { ...start, x: start.x + 1 }, waitSeconds: 0 },
        {
          position: { x: start.x + 1, y: p.y, z: p.z - 1 },
          landingSurfaceId: worldSupport(source)!,
          waitSeconds: 0,
        },
      ],
    };
    // Keep the turn horizontal before a separate landing descent.
    route.points.splice(2, 0, {
      position: { x: start.x + 1, y: start.y, z: p.z - 1 },
      waitSeconds: 0,
    });
    world.flightRoutes[route.id] = route;
    setSpatialPosition(world, bird, start, null);
    bird.spatial.flight = { routeId: route.id, next: 1, waitSeconds: 0 };
    flight.position = { x: p.x + 2, y: start.y + 0.1, z: p.z };
    flight.direction = { x: 1, y: 0, z: 0 };
    flight.speed = 0.5;
    flight.handling = 0;
    flight.sourceExited = true;
    const result = compare(world, bird.id, 6, 0.1);
    expect(
      result.events.some(
        (event) => event.type === 'projectile-contact' && event.actorId === bird.id,
      ),
    ).toBe(true);
  });

  it('keeps the ordinary ramp-to-deck support seam and turn at a moving-body crossing', () => {
    let world = released();
    const actor = entityGet(world.entities, NPC_ID)!;
    setSpatialPosition(world, actor, { x: 24, y: 2.8, z: 7.4 }, 'lookout-ramp');
    const admitted = executeCommand(world, {
      id: 'ramp-crossing',
      actorId: NPC_ID,
      type: 'move',
      destination: { x: 22, y: 3, z: 6, surfaceId: 'lookout-deck' },
    });
    expect(admitted.outcome.ok, admitted.outcome.message).toBe(true);
    world = prepareWorldNavigation(admitted.world);
    const current = entityGet(world.entities, NPC_ID)!,
      action = current.actor!.action!,
      seconds = 12;
    expect(action.path.some((point) => point.surfaceId === 'lookout-deck')).toBe(true);
    const track = movementTrack(
      world,
      current,
      action.path,
      nativeMovementSpeed(world, current) * seconds,
      seconds,
    ).track;
    const crossing = motionTrackPosition(track, seconds),
      flight = Object.values(world.projectiles!)[0]!;
    expect(crossing.y).toBe(3);
    flight.position = { x: crossing.x - 2, y: crossing.y + 0.2, z: crossing.z };
    flight.direction = { x: 1, y: 0, z: 0 };
    flight.speed = 2 / seconds;
    flight.handling = 0;
    flight.sourceExited = true;
    const result = compare(world, NPC_ID, 16);
    expect(
      result.events.some(
        (event) => event.type === 'projectile-contact' && event.actorId === NPC_ID,
      ),
    ).toBe(true);
    expect(worldSupport(entityGet(result.world.entities, NPC_ID)!)).toBe('lookout-deck');
  });

  it('preserves terminal-speed falling through an actual crossing and supported landing', () => {
    const world = released(),
      target = entityGet(world.entities, NPC_ID)!,
      p = worldPosition(target),
      flight = Object.values(world.projectiles!)[0]!;
    setSpatialPosition(world, target, { ...p, y: p.y + 8 }, null);
    target.spatial.fallVelocity = -TERMINAL_FALL_SPEED;
    flight.position = { x: p.x - 1.5, y: p.y + 1.5, z: p.z };
    flight.direction = { x: 1, y: 0, z: 0 };
    flight.speed = 0.5;
    flight.handling = 0;
    flight.sourceExited = true;
    const result = compare(world, NPC_ID, 4, 0.1);
    expect(
      result.events.some(
        (event) => event.type === 'projectile-contact' && event.actorId === NPC_ID,
      ),
    ).toBe(true);
    expect(worldSupport(entityGet(result.world.entities, NPC_ID)!)).not.toBeNull();
  });

  it('preserves actual sensed-passage animal escape and saved movement through time cuts', () => {
    const world = released(),
      source = entityGet(world.entities, PLAYER_ID)!,
      animal = entityGet(world.entities, 'hare-1')!,
      p = worldPosition(source),
      flight = Object.values(world.projectiles!)[0]!;
    animal.actor!.incapacitated = false;
    setSpatialPosition(world, animal, { ...p, x: p.x + 4 }, worldSupport(source));
    const start = { ...worldPosition(animal) };
    flight.position = {
      x: start.x - 1.5,
      y: start.y + bodyProfile(animal).height + 0.4,
      z: start.z,
    };
    flight.direction = { x: 1, y: 0, z: 0 };
    flight.speed = 0.5;
    flight.handling = 0;
    flight.sourceExited = true;
    const result = compare(world, animal.id, 18, 0.5);
    expect(
      result.events.some(
        (event) => event.type === 'projectile-passage' && event.targetId === animal.id,
      ),
    ).toBe(true);
    expect(entityGet(result.world.entities, animal.id)!.animal!.episode).toBeDefined();
    expect(worldPosition(entityGet(result.world.entities, animal.id)!)).not.toEqual(start);
    expect(entityGet(result.world.entities, animal.id)!.animal!.episode!.refuge).toBeDefined();
  });

  it.each([false, true])(
    'resolves a finite landing branch before a later ray (occupied: %s)',
    (occupied) => {
      const world = released(),
        source = entityGet(world.entities, PLAYER_ID)!,
        bird = entityGet(world.entities, 'bird-1')!,
        blocker = entityGet(world.entities, NPC_ID)!,
        p = worldPosition(source),
        flight = Object.values(world.projectiles!)[0]!;
      bird.actor!.incapacitated = false;
      bird.actor!.senses = [];
      const start = { x: p.x + 4, y: p.y + 2, z: p.z + 3 },
        landing = { ...start, y: p.y };
      const route = {
        id: 'qualification:finite-landing',
        body: { ...bodyProfile(bird) },
        speed: 1,
        climbSpeed: 1,
        continuation: { kind: 'land' as const },
        points: [
          { position: start, waitSeconds: 0 },
          { position: landing, landingSurfaceId: worldSupport(source)!, waitSeconds: 0 },
        ],
      };
      world.flightRoutes[route.id] = route;
      setSpatialPosition(world, bird, start, null);
      bird.spatial.flight = { routeId: route.id, next: 1, waitSeconds: 0 };
      setSpatialPosition(
        world,
        blocker,
        occupied ? landing : { ...landing, x: landing.x + 3 },
        worldSupport(source),
      );
      blocker.actor!.incapacitated = true;
      flight.position = { x: start.x - 2, y: start.y + 0.1, z: start.z };
      flight.direction = { x: 1, y: 0, z: 0 };
      flight.speed = 0.5;
      flight.handling = 0;
      flight.sourceExited = true;
      const result = compare(world, bird.id, 5, 0.1);
      if (!occupied)
        expect(
          result.events.some((event) => event.type === 'landed' && event.actorId === bird.id),
        ).toBe(true);
    },
  );
});
