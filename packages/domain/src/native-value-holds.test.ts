import { describe, expect, it } from 'vitest';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import { PLAYER_ID, NPC_ID } from './data.js';
import { entityGet } from './entity-collection.js';
import { advanceWorld, executeCommand, inventoryFor, quantityOf } from './kernel.js';
import { freezeWorld } from './draft.js';
import { createItemLot } from './objects.js';
import {
  attributeDefinition,
  definitionPin,
  readAttribute,
  setAttribute,
} from './world-modules.js';
import {
  nativeValueHoldSupported,
  validateNativeValueHolds,
  type NativeValueHold,
} from './native-value-holds.js';

const field = 'wilderness:fullness';
function fixture() {
  const world = stockedCamp();
  world.paused = false;
  const actor = entityGet(world.entities, PLAYER_ID)!;
  const definition = attributeDefinition(world, field)!;
  setAttribute(world, actor, definition, 60, []);
  const hold: NativeValueHold = {
    entityId: PLAYER_ID,
    definition: definitionPin(definition),
    physicalLife: actor.actor!.physicalLife ?? 0,
    value: 60,
  };
  return { world, hold };
}
const value = (world: ReturnType<typeof stockedCamp>, id = PLAYER_ID) =>
  readAttribute(world, entityGet(world.entities, id)!, attributeDefinition(world, field)!);

describe('transient native value holds', () => {
  it('suppresses native drift and threshold prediction, preserves other bodies, and releases without replaying missed drift', () => {
    const { world, hold } = fixture();
    validateNativeValueHolds(world, [hold]);
    const initial = freezeWorld(world);
    const held = advanceWorld(initial, 120, { nativeValueHolds: [hold] });
    expect(held.outcome.ok, held.outcome.message).toBe(true);
    expect(held.world.simTime).toBeGreaterThan(initial.simTime);
    expect(value(held.world)).toBe(60);
    expect(value(held.world, NPC_ID)).toBeLessThan(value(initial, NPC_ID) as number);
    const longer = advanceWorld(held.world, 120, { nativeValueHolds: [hold] });
    expect(value(longer.world)).toBe(60);
    const released = advanceWorld(longer.world, 120);
    const ordinary = advanceWorld(initial, 120);
    expect(value(released.world)).toBeCloseTo(value(ordinary.world) as number, 9);
  });
  it('keeps the native value during a real food debit and records no invented nutrition change', () => {
    const { world, hold } = fixture();
    createItemLot(world, PLAYER_ID, 'berries', 2, 'held-food');
    const item = inventoryFor(world, PLAYER_ID).find((entry) => entry.definitionId === 'berries')!;
    const eaten = executeCommand(
      freezeWorld(world),
      { id: 'held-eat', actorId: PLAYER_ID, type: 'eat', itemId: item.id },
      { nativeValueHolds: [hold] },
    );
    expect(eaten.outcome.ok, eaten.outcome.message).toBe(true);
    expect(value(eaten.world)).toBe(60);
    expect(quantityOf(eaten.world, PLAYER_ID, 'berries')).toBe(1);
    expect(eaten.events.some((event) => event.type === 'ate')).toBe(true);
    const occurrence = eaten.world.actionExperience.occurrences[PLAYER_ID]?.find(
      (entry) => entry.commandId === 'held-eat',
    );
    expect(occurrence).toBeDefined();
    expect(
      (occurrence!.effects ?? [])
        .filter((effect) => effect.property === field)
        .every((effect) => effect.before === effect.after),
    ).toBe(true);
    const normal = executeCommand(eaten.world, {
      id: 'released-eat',
      actorId: PLAYER_ID,
      type: 'eat',
      itemId: item.id,
    });
    expect(normal.outcome.ok, normal.outcome.message).toBe(true);
    expect(value(normal.world)).toBeGreaterThan(60);
  });
  it('rejects body-backed or stale declarations instead of granting general body protection', () => {
    const { world, hold } = fixture();
    expect(nativeValueHoldSupported(world, PLAYER_ID, 'wilderness:health')).toBe(false);
    expect(() =>
      validateNativeValueHolds(world, [{ ...hold, physicalLife: hold.physicalLife + 1 }]),
    ).toThrow('compatible');
    expect(() => validateNativeValueHolds(world, [{ ...hold, value: 59 }])).toThrow('Apply');
    expect(() => validateNativeValueHolds(world, [hold, hold])).toThrow('one active');
  });
});
