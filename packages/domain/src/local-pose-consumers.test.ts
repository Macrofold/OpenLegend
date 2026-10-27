import { expect, it } from 'vitest';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import { PLAYER_ID, NPC_ID } from './data.js';
import { entityGet } from './entity-collection.js';
import { createItemLot } from './objects.js';
import {
  bodyProfile,
  effectiveBodyProfile,
  setSpatialPosition,
  validateSpatialWorld,
  worldPosition,
  worldSupport,
} from './spatial-state.js';
import { definitionPin } from './world-modules.js';
import { rangedPolicy } from './ranged-policy.js';
import { materialFootprint } from './material-exposure.js';
import { LandingOccupancy } from './flight.js';
import { movingStrikeInReach } from './strikes.js';
import { settleLocalPoses } from './local-avoidance.js';
import { beginNativeChangeFeed } from './native-change-feed.js';
import { materializeNativeValues } from './native-values.js';
import type { Entity, WorldEvent, WorldState } from './types.js';
function duck(world: WorldState, actor: Entity) {
  const policy = rangedPolicy(world)!;
  actor.spatial.localPose = {
    kind: 'duck',
    profile: definitionPin(policy),
    physicalLife: actor.actor!.physicalLife ?? 0,
    startedAt: world.simTime,
    restoreAt: world.simTime + policy.localAvoidance!.holdSeconds,
    phase: 'holding',
  };
  actor.spatial.localAvoidanceReadyAt = world.simTime + policy.localAvoidance!.cooldownSeconds;
}
it('uses current carried-material height and current landing occupancy after a body contracts', () => {
  const world = stockedCamp(),
    actor = entityGet(world.entities, PLAYER_ID)!;
  const fiber = Object.values(world.itemDefinitions).find(
    (definition) => definition.assemblyMaterial?.role === 'fiber',
  )!;
  expect(fiber).toBeDefined();
  const item = createItemLot(world, PLAYER_ID, fiber.id, 1);
  const before = materialFootprint(world, item)!;
  const ordinary = bodyProfile(actor);
  duck(world, actor);
  const effective = effectiveBodyProfile(world, actor),
    p = worldPosition(actor);
  expect(effective.height).toBeLessThan(ordinary.height);
  const after = materialFootprint(world, item)!;
  expect(after.y).toBe(p.y + effective.interactionHeight);
  expect(after.y).toBeLessThan(before.y);
  const landing = { ...p, y: p.y + effective.height + 0.05 };
  const body = {
    ...ordinary,
    radius: 0.05,
    height: 0.1,
    eyeHeight: 0.05,
    earHeight: 0.05,
    interactionHeight: 0.05,
  };
  const occupied = new LandingOccupancy(world);
  expect(occupied.blocked('landing-body', landing, body)).toBe(false);
  delete actor.spatial.localPose;
  occupied.update(actor);
  expect(occupied.blocked('landing-body', landing, body)).toBe(true);
});
it('moving contact reach uses actual vertical body separation', () => {
  const world = stockedCamp(),
    actor = entityGet(world.entities, PLAYER_ID)!,
    target = entityGet(world.entities, NPC_ID)!;
  const p = worldPosition(actor);
  setSpatialPosition(world, target, { x: p.x + 0.1, y: p.y + 1.2, z: p.z }, null);
  expect(movingStrikeInReach(world, actor, target, 0.05)).toBe(true);
  duck(world, actor);
  expect(movingStrikeInReach(world, actor, target, 0.05)).toBe(false);
});

it('retains a blocked return to standing and wakes it when the old blocker leaves', () => {
  const world = stockedCamp(),
    actor = entityGet(world.entities, PLAYER_ID)!,
    blocker = entityGet(world.entities, NPC_ID)!,
    p = worldPosition(actor),
    events: WorldEvent[] = [];
  duck(world, actor);
  setSpatialPosition(world, blocker, { ...p, y: p.y + 1.2 }, null);
  blocker.spatial.fallVelocity = 0;
  world.simTime = actor.spatial.localPose!.restoreAt;
  // A complete native change feed exercises retained old-neighborhood membership;
  // an unknown feed would conservatively rescan every saved posture instead.
  beginNativeChangeFeed(world);
  expect(settleLocalPoses(world, [PLAYER_ID, NPC_ID], events)).toBe(false);
  expect(actor.spatial.localPose?.phase).toBe('restore-blocked');
  expect(effectiveBodyProfile(world, actor).height).toBeLessThan(bodyProfile(actor).height);
  expect(events).toHaveLength(0);
  expect(settleLocalPoses(world, [PLAYER_ID, NPC_ID], events)).toBe(false);

  const restored = JSON.parse(JSON.stringify(materializeNativeValues(world))) as WorldState;
  expect(entityGet(restored.entities, PLAYER_ID)!.spatial.localPose?.phase).toBe('restore-blocked');
  expect(() => validateSpatialWorld(restored)).not.toThrow();
  setSpatialPosition(world, blocker, { ...p, x: p.x + 8 }, worldSupport(actor));
  delete blocker.spatial.fallVelocity;
  expect(settleLocalPoses(world, [PLAYER_ID, NPC_ID], events)).toBe(true);
  expect(actor.spatial.localPose).toBeUndefined();
  expect(effectiveBodyProfile(world, actor)).toEqual(bodyProfile(actor));
  expect(events.filter((event) => event.type === 'local-pose-ended')).toHaveLength(1);
  expect(settleLocalPoses(world, [PLAYER_ID, NPC_ID], events)).toBe(false);
  expect(events.filter((event) => event.type === 'local-pose-ended')).toHaveLength(1);
});

it('rejects null, extra-field and orphan saved postures before placement skips', () => {
  const world = stockedCamp(),
    actor = entityGet(world.entities, PLAYER_ID)!;
  duck(world, actor);
  expect(() => validateSpatialWorld(world)).not.toThrow();
  const saved = materializeNativeValues(world);
  const malformed = (change: (copy: WorldState) => void) => {
    const copy = JSON.parse(JSON.stringify(saved)) as WorldState;
    change(copy);
    expect(() => validateSpatialWorld(copy)).toThrow('Invalid native local posture');
  };
  malformed((copy) => Reflect.set(entityGet(copy.entities, PLAYER_ID)!.spatial, 'localPose', null));
  malformed((copy) =>
    Reflect.set(entityGet(copy.entities, PLAYER_ID)!.spatial.localPose!, 'height', 0.1),
  );
  malformed((copy) => {
    const itemId = createItemLot(copy, PLAYER_ID, 'prepared_fiber', 1);
    const item = entityGet(copy.entities, itemId)!;
    expect(item.placement?.mode).toBe('contained');
    item.spatial.localPose = structuredClone(
      entityGet(copy.entities, PLAYER_ID)!.spatial.localPose,
    );
  });
});
