import { describe, expect, it } from 'vitest';
import { fixture, command, aim } from '../../../tests/fixtures/combat-execution.js';
import { advanceWorld } from './kernel.js';
import { entityGet } from './entity-collection.js';
import { PLAYER_ID, NPC_ID } from './worlds/base/world.js';
import { setSpatialPosition, worldPosition, worldSupport } from './spatial-state.js';
import { setBodyHealth } from './body-state.js';
import { settleProjectiles } from './ranged.js';
import { validateWorldModules } from './world-modules.js';
import type { WorldEvent, WorldState } from './types.js';
import type { AdmittedWorldInput } from './execution-input.js';

function released(): WorldState {
  let { world } = fixture();
  world = aim(world);
  world = advanceWorld(world, 18).world;
  return command(world, {
    type: 'release-shot',
    aimId: entityGet(world.entities, PLAYER_ID)!.actor!.action!.id,
  });
}
function cut(
  world: WorldState,
  total: number,
  step: number,
  playerInputs?: AdmittedWorldInput[],
): { world: WorldState; events: WorldEvent[] } {
  const events: WorldEvent[] = [];
  for (let left = total; left > 1e-8; left -= Math.min(step, left)) {
    const result = advanceWorld(world, Math.min(step, left), { playerInputs });
    expect(result.outcome.ok, result.outcome.message).toBe(true);
    world = result.world;
    events.push(...result.events);
  }
  return { world, events };
}
function combatFacts(events: WorldEvent[]) {
  return events
    .filter((event) =>
      [
        'body-ducked',
        'projectile-crossing-cleared',
        'projectile-contact',
        'shot-ended',
        'incapacitated',
        'crafted',
      ].includes(event.type),
    )
    .map((event) => ({
      type: event.type,
      at: Math.round(event.at * 1e6) / 1e6,
      actorId: event.actorId,
      targetId: event.targetId,
      data: event.data,
    }));
}

describe('native projectile chronology', () => {
  it('finishes an exact requested clock cut after swept entry without a phantom positive remainder or premature clearance', () => {
    let world = released();
    const flight = Object.values(world.projectiles!)[0]!,
      p = worldPosition(entityGet(world.entities, NPC_ID)!);
    flight.position = { x: p.x - 0.8, y: p.y + 1.2, z: p.z };
    flight.speed = 0.5;
    flight.handling = 0;
    const start = world.simTime;
    const first = cut(world, 2, 1);
    world = first.world;
    expect(world.simTime).toBe(start + 2);
    const duck = first.events.find((event) => event.type === 'body-ducked');
    expect(duck).toBeDefined();
    expect(first.events.some((event) => event.type === 'projectile-crossing-cleared')).toBe(false);
    const next = cut(world, 1, 1),
      cleared = next.events.find((event) => event.type === 'projectile-crossing-cleared');
    expect(cleared).toBeDefined();
    expect(cleared!.at).toBeGreaterThan(duck!.at);
    expect(next.world.simTime).toBe(start + 3);
    validateWorldModules(next.world);
  });
  it('settles a duck then source reentry injury before later manufacture, identically across time cuts', () => {
    let world = released();
    const flight = Object.values(world.projectiles!)[0]!,
      source = entityGet(world.entities, PLAYER_ID)!,
      p = worldPosition(source);
    flight.position = { x: p.x, y: p.y + 1.2, z: p.z };
    flight.direction = { x: 1, y: 0, z: 0 };
    flight.speed = 0.5;
    flight.handling = 0;
    flight.sourceExited = true;
    setSpatialPosition(world, source, { ...p, x: p.x + 4 }, worldSupport(source));
    setBodyHealth(world, source.actor!, 1);
    const selected = Object.values(world.recipes).find((recipe) => recipe.name === 'Test sling')!;
    expect(selected).toBeDefined();
    world = command(world, { type: 'craft', recipeId: selected.id });
    const deadline =
      world.simTime + entityGet(world.entities, PLAYER_ID)!.actor!.action!.remainingSeconds;
    const large = cut(structuredClone(world), 65, 65),
      small = cut(structuredClone(world), 65, 1);
    const duck = large.events.find((e) => e.type === 'body-ducked')!,
      impact = large.events.find(
        (e) => e.type === 'projectile-contact' && e.actorId === PLAYER_ID,
      )!;
    expect(duck).toBeDefined();
    expect(impact).toBeDefined();
    expect(duck.at).toBeLessThan(impact.at);
    expect(impact.at).toBeLessThan(deadline);
    expect(large.events.some((e) => e.type === 'crafted' && e.actorId === PLAYER_ID)).toBe(false);
    expect(entityGet(large.world.entities, PLAYER_ID)!.actor!.action).toBeNull();
    expect(
      large.events.filter((e) => e.type === 'projectile-crossing-cleared' && e.actorId === NPC_ID),
    ).toHaveLength(1);
    expect(combatFacts(large.events)).toEqual(combatFacts(small.events));
    expect(large.world.rngState).toBe(small.world.rngState);
    validateWorldModules(large.world);
  });

  it.each(['unaware', 'recovering', 'low-ray'] as const)(
    'does not roll or become transparent when the response is %s',
    (mode) => {
      const world = released(),
        flight = Object.values(world.projectiles!)[0]!,
        target = entityGet(world.entities, NPC_ID)!,
        point = worldPosition(target),
        events: WorldEvent[] = [];
      flight.handling = 0;
      flight.position = { ...point, y: point.y + (mode === 'low-ray' ? 0.2 : 1.2) };
      if (mode === 'unaware') target.actor!.senses = [];
      if (mode === 'recovering') target.actor!.combatReadyAt = world.simTime + 20;
      const rng = world.rngState,
        health = target.actor!.health;
      settleProjectiles(world, events);
      expect(target.actor!.health).toBeLessThan(health);
      expect(target.spatial.localPose).toBeUndefined();
      expect(target.spatial.localAvoidanceReadyAt).toBeUndefined();
      expect(world.rngState).toBe(rng);
    },
  );

  it('keeps a pending crossing through reload, then the returning body intercepts that same flight', () => {
    let world = released();
    const flight = Object.values(world.projectiles!)[0]!,
      target = entityGet(world.entities, NPC_ID)!,
      p = worldPosition(target),
      events: WorldEvent[] = [];
    flight.position = { ...p, y: p.y + 1.2 };
    flight.speed = 0.001;
    flight.handling = 0;
    const health = target.actor!.health,
      rng = world.rngState;
    settleProjectiles(world, events);
    expect(events.some((e) => e.type === 'projectile-crossing-cleared')).toBe(false);
    expect(Object.keys(flight.encounters ?? {})).toHaveLength(1);
    validateWorldModules(world);
    world = structuredClone(world);
    const advanced = cut(world, 12, 12);
    expect(
      advanced.events.filter((e) => e.type === 'projectile-contact' && e.actorId === NPC_ID),
    ).toHaveLength(1);
    expect(advanced.events.some((e) => e.type === 'projectile-crossing-cleared')).toBe(false);
    expect(entityGet(advanced.world.entities, NPC_ID)!.actor!.health).toBeLessThan(health);
    expect(advanced.world.rngState).toBe(rng);
  });

  it('uses the accelerated falling body before work effects and agrees across time cuts', () => {
    const world = released(),
      flight = Object.values(world.projectiles!)[0]!,
      target = entityGet(world.entities, NPC_ID)!,
      p = worldPosition(target),
      origin = worldPosition(entityGet(world.entities, PLAYER_ID)!);
    setSpatialPosition(world, target, { ...p, y: p.y + 2 }, null);
    target.spatial.fallVelocity = 0;
    flight.position = { ...origin, y: p.y + 2.1 };
    flight.direction = { x: 1, y: 0, z: 0 };
    flight.speed = 1;
    flight.handling = 0;
    flight.sourceExited = true;
    const rng = world.rngState,
      large = cut(structuredClone(world), 4, 4),
      small = cut(structuredClone(world), 4, 0.1);
    expect(large.events.some((e) => e.type === 'projectile-contact' && e.actorId === NPC_ID)).toBe(
      true,
    );
    expect(entityGet(large.world.entities, NPC_ID)!.actor!.health).toBe(
      entityGet(small.world.entities, NPC_ID)!.actor!.health,
    );
    expect(large.world.rngState).toBe(rng);
    expect(small.world.rngState).toBe(rng);
    const a = large.events.find((e) => e.type === 'projectile-contact')!,
      b = small.events.find((e) => e.type === 'projectile-contact')!;
    expect(a.at).toBeCloseTo(b.at, 3);
  });

  it('forecasts steering in actual occupancy order when the first mover frees a follower', () => {
    const world = released(),
      source = entityGet(world.entities, PLAYER_ID)!,
      target = entityGet(world.entities, NPC_ID)!,
      p = worldPosition(source),
      flight = Object.values(world.projectiles!)[0]!;
    setSpatialPosition(world, target, { ...p, x: p.x + 0.5 }, worldSupport(source));
    flight.position = { x: p.x + 0.75, y: p.y + 0.2, z: p.z - 1 };
    flight.direction = { x: 0, y: 0, z: 1 };
    flight.speed = 0.3;
    flight.sourceExited = true;
    flight.handling = 0;
    const inputs = [NPC_ID, PLAYER_ID].map((actorId) => ({
      actorId,
      steering: { direction: { x: 1, z: 0 }, startsAt: world.simTime, endsAt: world.simTime + 4 },
    }));
    const large = cut(structuredClone(world), 4, 4, inputs),
      small = cut(structuredClone(world), 4, 0.1, inputs);
    expect(large.events.some((e) => e.type === 'projectile-contact')).toBe(true);
    expect(combatFacts(large.events)).toEqual(combatFacts(small.events));
    for (const id of [PLAYER_ID, NPC_ID])
      expect(worldPosition(entityGet(large.world.entities, id)!).x).toBeCloseTo(
        worldPosition(entityGet(small.world.entities, id)!).x,
        5,
      );
    expect(large.world.rngState).toBe(small.world.rngState);
  });
});
