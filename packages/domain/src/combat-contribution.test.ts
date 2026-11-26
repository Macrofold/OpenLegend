import { describe, expect, it } from 'vitest';
import { fixture, command } from '../../../tests/fixtures/combat-execution.js';
import { entityGet } from './entity-collection.js';
import { advanceWorld, executeCommand } from './index.js';
import { createItemLot } from './objects.js';
import { nextRandom, PLAYER_ID, NPC_ID } from './data.js';
import { setSpatialPosition, worldPosition, worldSupport } from './spatial-state.js';
import { settleProjectiles } from './ranged.js';
import type { TimedReleaseInput } from './execution-input.js';
import type { WorldEvent, WorldState } from './types.js';

const inputs: TimedReleaseInput[] = [
  { kind: 'timed-release', phase: 0 },
  { kind: 'ordinary' },
  { kind: 'timed-release', phase: 0.25 },
];
/** Select saved randomness, never replace the native hit/evasion owner. */
function seedBetween(min: number, max: number): number {
  for (let seed = 1; seed < 100_000; seed++) {
    const probe = { rngState: seed } as WorldState;
    const sample = nextRandom(probe);
    if (sample > min && sample < max) return seed;
  }
  throw new Error('No deterministic sample in the fixture interval.');
}
function preparedStrike(definition: 'spear' | 'hammer', human = false): WorldState {
  let { world } = fixture();
  const actor = entityGet(world.entities, PLAYER_ID)!,
    target = entityGet(world.entities, NPC_ID)!;
  const p = worldPosition(actor);
  setSpatialPosition(world, target, { ...p, x: p.x + 1 }, worldSupport(actor));
  target.actor!.controller = human ? 'player' : 'npc';
  const itemId = createItemLot(world, PLAYER_ID, definition, 1);
  world = command(world, { type: 'equip', itemId });
  world = command(world, {
    type: 'strike',
    targetId: NPC_ID,
    definitionId: definition,
    weaponItemId: itemId,
    manualExecution: true,
  });
  return advanceWorld(world, world.itemDefinitions[definition]!.melee!.windupSeconds!).world;
}
function releaseStrike(base: WorldState, input: TimedReleaseInput, seed: number) {
  let world = structuredClone(base);
  world.rngState = seed;
  const action = entityGet(world.entities, PLAYER_ID)!.actor!.action!;
  expect(action.attackExecution?.ready).toBe(true);
  world = command(world, {
    type: 'release-strike',
    expectedActionId: action.id,
    releaseInput: input,
  });
  const strike = [...world.events].reverse().find((event) => event.type === 'struck')!;
  return {
    world,
    data: strike.data!,
    action: entityGet(world.entities, PLAYER_ID)!.actor!.action!,
  };
}

describe('native optional contribution independent of target controller', () => {
  it.each(['spear', 'hammer'] as const)(
    'applies poor, ordinary and excellent %s impact once without changing work or recovery',
    (definition) => {
      const base = preparedStrike(definition),
        seed = seedBetween(0.1, 0.11);
      const results = inputs.map((input) => releaseStrike(base, input, seed));
      const injury = results.map((result) => Number(result.data['rawInjury']));
      expect(results.map((result) => result.data['hit'])).toEqual([true, true, true]);
      expect(injury[0]).toBeLessThan(injury[1]!);
      expect(injury[2]).toBeGreaterThan(injury[1]!);
      expect(injury[0]).toBeCloseTo(injury[1]! * 0.9);
      expect(injury[2]).toBeCloseTo(injury[1]! * (definition === 'spear' ? 1.1 : 1.25));
      for (const result of results) {
        expect(result.action.strikePhase).toBe('recovery');
        expect(result.action.remainingSeconds).toBe(
          base.itemDefinitions[definition]!.melee!.recoverySeconds,
        );
        expect(result.world.simTime).toBe(base.simTime);
        expect(result.world.events.filter((event) => event.type === 'struck')).toHaveLength(1);
        expect(entityGet(result.world.entities, NPC_ID)!.actor!.health).toBeLessThan(
          entityGet(base.entities, NPC_ID)!.actor!.health,
        );
      }
    },
  );

  it('applies both spear score tails equally to player and NPC intended defenders', () => {
    const ordinary = preparedStrike('spear'),
      human = preparedStrike('spear', true);
    for (const [min, max, expected] of [
      [0.74, 0.75, [false, true, true]],
      [0.85, 0.86, [false, false, true]],
    ] as const) {
      const seed = seedBetween(min, max);
      expect(inputs.map((input) => releaseStrike(ordinary, input, seed).data['hit'])).toEqual(
        expected,
      );
      const results = inputs.map((input) => releaseStrike(human, input, seed));
      expect(results.map((result) => result.data['hit'])).toEqual(expected);
      expect(
        results.map((result) => entityGet(result.world.entities, NPC_ID)!.actor!.health),
      ).toEqual(
        inputs.map(
          (input) =>
            entityGet(releaseStrike(ordinary, input, seed).world.entities, NPC_ID)!.actor!.health,
        ),
      );
      expect(results.map((result) => result.world.rngState)).toEqual(
        Array(3).fill(results[1]!.world.rngState),
      );
    }
  });

  it('keeps Punch and knife ordinary and refuses unsupported manual preparation', () => {
    for (const definition of ['punch', 'knife']) {
      let { world } = fixture();
      const actor = entityGet(world.entities, PLAYER_ID)!,
        target = entityGet(world.entities, NPC_ID)!,
        p = worldPosition(actor);
      setSpatialPosition(world, target, { ...p, x: p.x + 0.7 }, worldSupport(actor));
      const itemId =
        definition === 'knife' ? createItemLot(world, PLAYER_ID, definition, 1) : undefined;
      if (itemId) world = command(world, { type: 'equip', itemId });
      const fields = {
        type: 'strike' as const,
        targetId: NPC_ID,
        definitionId: definition,
        ...(itemId ? { weaponItemId: itemId } : {}),
      };
      const unsupported = executeCommand(world, {
        ...fields,
        actorId: PLAYER_ID,
        id: `manual-${definition}`,
        manualExecution: true,
      });
      expect(unsupported.outcome.ok).toBe(false);
      expect(entityGet(unsupported.world.entities, PLAYER_ID)!.actor!.action).toBeNull();
      world = command(world, fields);
      const action = entityGet(world.entities, PLAYER_ID)!.actor!.action!;
      expect(action.attackExecution).toBeUndefined();
      world = advanceWorld(world, action.remainingSeconds).world;
      expect(world.events.filter((event) => event.type === 'struck')).toHaveLength(1);
      expect(entityGet(world.entities, PLAYER_ID)!.actor!.action?.attackExecution).toBeUndefined();
      world = advanceWorld(world, 60).world;
      expect(world.events.filter((event) => event.type === 'struck')).toHaveLength(1);
    }
  });

  it.each([true, false])(
    'applies positive and negative flight contact scores equally to player and NPC defenders (intended: %s)',
    (intended) => {
      let { world } = fixture();
      const target = entityGet(world.entities, NPC_ID)!,
        p = worldPosition(target);
      world = command(world, {
        type: 'aim',
        manualExecution: true,
        ...(intended ? { targetId: NPC_ID } : { aimPoint: { x: p.x, y: p.y + 1.2, z: p.z } }),
      });
      world = advanceWorld(world, 18).world;
      const base = world;
      const actionId = entityGet(base.entities, PLAYER_ID)!.actor!.action!.id;
      const flights = inputs.map((input) => {
        const released = command(structuredClone(base), {
          type: 'release-shot',
          aimId: actionId,
          releaseInput: input,
        });
        const flight = Object.values(released.projectiles!)[0]!;
        expect(!!flight.targetId).toBe(intended);
        expect(flight.execution?.score).toBe(
          input.kind === 'ordinary' ? 0 : input.phase === 0 ? -1 : 1,
        );
        return released;
      });
      const handling = Object.values(flights[0]!.projectiles!)[0]!.handling;
      expect(handling).toBeGreaterThan(0);
      expect(handling).toBeLessThan(0.95);
      for (const [min, max] of [
        [handling * 0.93, handling * 0.95],
        [handling + (1 - handling) * 0.1, handling + (1 - handling) * 0.2],
      ]) {
        const cross = (released: WorldState, controller: 'player' | 'npc') => {
          const copy = structuredClone(released),
            flight = Object.values(copy.projectiles!)[0]!;
          // Place the real released flight at one observed ordinary-body crossing.
          // This isolates contact classification from the separately covered chronology.
          flight.position = { x: p.x, y: p.y + 1.2, z: p.z };
          entityGet(copy.entities, NPC_ID)!.actor!.controller = controller;
          copy.rngState = seedBetween(min!, max!);
          const events: WorldEvent[] = [];
          settleProjectiles(copy, events);
          return {
            health: entityGet(copy.entities, NPC_ID)!.actor!.health,
            ducked: !!entityGet(copy.entities, NPC_ID)!.spatial.localPose,
            rng: copy.rngState,
            hits: events.filter((event) => event.type === 'projectile-contact').length,
          };
        };
        const npcResults = flights.map((released) => cross(released, 'npc'));
        const playerResults = flights.map((released) => cross(released, 'player'));
        expect(playerResults).toEqual(npcResults);
        expect(npcResults.some((result) => result.ducked !== npcResults[1]!.ducked)).toBe(true);
      }
    },
  );
});
