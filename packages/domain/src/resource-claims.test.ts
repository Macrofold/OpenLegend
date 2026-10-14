import { describe, expect, it } from 'vitest';
import { createWorld, PLAYER_ID } from './data.js';
import { cloneValue } from './draft.js';
import { executeCommand } from './kernel.js';
import { createItemLot, itemFor } from './objects.js';
import {
  availableItemQuantity,
  itemDefinitionPin,
  releaseResource,
  reserveResource,
  validateResourceReservations,
} from './resource-claims.js';
import type { WorldState } from './types.js';

// Use admitted work, but assert only the reusable stock/ownership contract, not recipe balance.
function heldStock() {
  const initial = createWorld();
  const itemId = createItemLot(initial, PLAYER_ID, 'wood', 5);
  const started = executeCommand(initial, {
    id: 'reservation-owner',
    actorId: PLAYER_ID,
    type: 'gather',
    targetId: 'branches',
  });
  expect(started.outcome.ok).toBe(true);
  const world = cloneValue(started.world);
  const invocationId = world.entities[PLAYER_ID]!.actor!.action!.id;
  const request = {
    id: 'held-stock',
    invocationId,
    actorId: PLAYER_ID,
    resource: {
      kind: 'item' as const,
      itemId,
      definition: itemDefinitionPin(world.itemDefinitions.wood!),
    },
    amount: 3,
  };
  const revision = itemFor(world, itemId)!.revision ?? 0;
  expect(reserveResource(world, request, revision).status).toBe('applied');
  return { world, itemId, invocationId, request, revision };
}

describe('current resource reservation ownership', () => {
  it('preserves a real hold across JSON and refuses spending the same stock twice', () => {
    const { world, itemId, request, revision } = heldStock();
    const restored = JSON.parse(JSON.stringify(world)) as WorldState;
    expect(() => validateResourceReservations(restored)).not.toThrow();
    expect(availableItemQuantity(restored, itemId)).toBe(2);
    expect(reserveResource(restored, { ...request, id: 'competing-hold' }, revision).status).toBe(
      'unavailable',
    );
    expect(availableItemQuantity(restored, itemId)).toBe(2);
  });

  it('rejects missing or wrong claimants and missing live work', () => {
    const { world } = heldStock();
    const missing = JSON.parse(JSON.stringify(world)) as WorldState;
    Reflect.deleteProperty(missing.resourceReservations!['held-stock']!, 'actorId');
    expect(() => validateResourceReservations(missing)).toThrow('Invalid resource reservation');
    const wrong = cloneValue(world);
    wrong.resourceReservations!['held-stock']!.actorId = 'absent-claimant';
    expect(() => validateResourceReservations(wrong)).toThrow('no live owning process');
    const orphan = cloneValue(world);
    orphan.entities[PLAYER_ID]!.actor!.action = null;
    expect(() => validateResourceReservations(orphan)).toThrow('no live owning process');
  });

  it('releases stock once on real cancellation and preserves the terminal record', () => {
    const { world, itemId, invocationId } = heldStock();
    const stopped = executeCommand(world, {
      id: 'cancel-owner',
      actorId: PLAYER_ID,
      type: 'cancel',
    });
    expect(stopped.outcome.ok).toBe(true);
    expect(availableItemQuantity(stopped.world, itemId)).toBe(5);
    expect(stopped.world.resourceReservations!['held-stock']!.state).toBe('released');
    const retained = cloneValue(stopped.world);
    const revision = retained.resourceReservations!['held-stock']!.revision;
    expect(releaseResource(retained, 'held-stock', invocationId)).toBe(true);
    expect(retained.resourceReservations!['held-stock']!.revision).toBe(revision);
    expect(() => validateResourceReservations(retained)).not.toThrow();
  });
});
