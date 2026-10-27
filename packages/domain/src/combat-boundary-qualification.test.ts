import { describe, expect, it } from 'vitest';
import { fixture, command, aim } from '../../../tests/fixtures/combat-execution.js';
import { advanceWorld } from './kernel.js';
import { entityGet } from './entity-collection.js';
import { PLAYER_ID, NPC_ID } from './worlds/base/world.js';
import { worldPosition } from './spatial-state.js';
import { nativeMovementSpeed } from './worlds/base/actions.js';
import { settleProjectiles } from './ranged.js';
import { freezeWorld } from './draft.js';
import { validateWorldModules } from './world-modules.js';
import type { WorldEvent, WorldState } from './types.js';
import type { AdmittedWorldInput } from './execution-input.js';

function released(): WorldState {
  let { world } = fixture();
  world = advanceWorld(aim(world), 18).world;
  return command(world, {
    type: 'release-shot',
    aimId: entityGet(world.entities, PLAYER_ID)!.actor!.action!.id,
  });
}
function advance(
  world: WorldState,
  seconds: number,
  step: number,
  inputs?: AdmittedWorldInput[],
): { world: WorldState; events: WorldEvent[] } {
  const end = world.simTime + seconds,
    events: WorldEvent[] = [];
  while (world.simTime < end) {
    const result = advanceWorld(world, Math.min(step, end - world.simTime), {
      playerInputs: inputs,
    });
    expect(result.outcome.ok, result.outcome.message).toBe(true);
    world = result.world;
    events.push(...result.events);
  }
  return { world, events };
}

describe('retained crossings and release at a current contact boundary', () => {
  it('lets the same defender clear and later reenter one retained ray without immunity, across time cuts', () => {
    const initial = released(),
      target = entityGet(initial.entities, NPC_ID)!,
      point = worldPosition(target),
      flight = Object.values(initial.projectiles!)[0]!;
    flight.position = { ...point, y: point.y + 1.2 };
    flight.handling = 0;
    flight.speed = 0.001;
    const initialEvents: WorldEvent[] = [];
    settleProjectiles(initial, initialEvents);
    expect(initialEvents.filter((event) => event.type === 'body-ducked')).toHaveLength(1);
    const duration = 1 / nativeMovementSpeed(initial, target),
      restoreAt = target.spatial.localPose!.restoreAt;
    function exercise(step: number) {
      // Compare time cuts from the same completed publication used by live play.
      let world = freezeWorld(structuredClone(initial));
      const events: WorldEvent[] = [];
      const out = advance(world, duration, step, [
        {
          actorId: NPC_ID,
          steering: {
            direction: { x: 0, z: 1 },
            startsAt: world.simTime,
            endsAt: world.simTime + duration,
          },
        },
      ]);
      world = out.world;
      events.push(...out.events);
      expect(
        events.filter(
          (event) => event.type === 'projectile-crossing-cleared' && event.actorId === NPC_ID,
        ),
      ).toHaveLength(1);
      expect(Object.keys(world.projectiles![flight.id]!.encounters ?? {})).toHaveLength(0);
      expect(worldPosition(entityGet(world.entities, NPC_ID)!).z).toBeCloseTo(point.z + 1, 5);
      const wait = advance(world, restoreAt - world.simTime, step);
      world = wait.world;
      events.push(...wait.events);
      expect(entityGet(world.entities, NPC_ID)!.spatial.localPose).toBeUndefined();
      const health = entityGet(world.entities, NPC_ID)!.actor!.health;
      const back = advance(world, duration, step, [
        {
          actorId: NPC_ID,
          steering: {
            direction: { x: 0, z: -1 },
            startsAt: world.simTime,
            endsAt: world.simTime + duration,
          },
        },
      ]);
      world = back.world;
      events.push(...back.events);
      expect(
        events.filter((event) => event.type === 'projectile-contact' && event.actorId === NPC_ID),
      ).toHaveLength(1);
      expect(events.filter((event) => event.type === 'body-ducked')).toHaveLength(0);
      expect(entityGet(world.entities, NPC_ID)!.actor!.health).toBeLessThan(health);
      expect(world.projectiles![flight.id]).toBeUndefined();
      validateWorldModules(world);
      return { world, events };
    }
    const large = exercise(100),
      small = exercise(0.1);
    const facts = (events: WorldEvent[]) =>
      events
        .filter((event) =>
          ['projectile-crossing-cleared', 'projectile-contact', 'local-pose-ended'].includes(
            event.type,
          ),
        )
        .map((event) => ({ type: event.type, actorId: event.actorId, targetId: event.targetId }));
    expect(facts(large.events)).toEqual(facts(small.events));
    expect(large.world.rngState).toBe(small.world.rngState);
    expect(entityGet(large.world.entities, NPC_ID)!.actor!.health).toBe(
      entityGet(small.world.entities, NPC_ID)!.actor!.health,
    );
  });

  it('retains one explicit release at the current instant without giving its new flight prior travel', () => {
    const template = Object.values(released().projectiles!)[0]!;
    let { world } = fixture();
    world = advanceWorld(aim(world), 18).world;
    const source = entityGet(world.entities, PLAYER_ID)!,
      position = worldPosition(source),
      health = source.actor!.health;
    world.projectiles = {
      older: {
        ...structuredClone(template),
        id: 'older',
        actionId: 'older-release',
        sourceExited: true,
        position: { ...position, y: position.y + 0.2 },
        handling: 0,
      },
    };
    const at = world.simTime;
    world = command(world, { type: 'release-shot', aimId: source.actor!.action!.id });
    const launched = Object.values(world.projectiles!).find((flight) => flight.id !== 'older')!,
      anchor = { ...launched.position },
      range = launched.remainingRange;
    expect(launched).toBeDefined();
    const events: WorldEvent[] = [],
      rng = world.rngState;
    settleProjectiles(world, events);
    expect(world.simTime).toBe(at);
    expect(
      events.filter((event) => event.type === 'projectile-contact' && event.actorId === PLAYER_ID),
    ).toHaveLength(1);
    expect(events.every((event) => event.at === at)).toBe(true);
    expect(entityGet(world.entities, PLAYER_ID)!.actor!.health).toBeLessThan(health);
    expect(world.projectiles!.older).toBeUndefined();
    expect(world.projectiles![launched.id]!.position).toEqual(anchor);
    expect(world.projectiles![launched.id]!.remainingRange).toBe(range);
    expect(world.rngState).toBe(rng);
    validateWorldModules(world);
  });
});
