import { describe, expect, it } from 'vitest';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import {
  advanceWithNavigation,
  prepareWorldNavigation,
} from '../../../tests/fixtures/navigation.js';
import { headingFrame } from './follow.js';
import {
  bindActionInvocation,
  captureActorFrame,
  commitActorResponse,
  currentWorkIdentity,
  entityGet,
  executeCommand,
  PLAYER_ID,
  setSpatialPosition,
  worldPosition,
  worldSupport,
  type ActionInvocation,
  type ActorResponse,
  type WorldState,
} from './index.js';

const relative: ActionInvocation = {
  family: 'move',
  frame: 'actor',
  x: 1,
  z: 0,
  surfaceId: null,
  place: null,
  targetEntityId: null,
  distance: null,
  relation: null,
  onLost: null,
  until: null,
  itemId: null,
  quantity: null,
};
const response: ActorResponse = {
  operations: [
    {
      localId: 'voice',
      requiresAccepted: [],
      talk: { text: 'Still walking.', addresseeEntityId: null, volume: 'normal' },
    },
    {
      localId: 'step',
      requiresAccepted: [],
      act: {
        kind: 'invoke',
        invocation: relative,
        mode: 'enqueue',
        actionId: null,
        verb: null,
        targetEntityId: null,
        description: null,
      },
    },
  ],
};
function walking() {
  const world = stockedCamp();
  world.paused = false;
  const actor = entityGet(world.entities, PLAYER_ID)!;
  setSpatialPosition(world, actor, { x: 12, y: 0, z: 13 }, worldSupport(actor));
  actor.spatial.heading = 0;
  const started = executeCommand(world, {
    id: 'start-walk',
    actorId: PLAYER_ID,
    type: 'move',
    destination: { x: 18, y: 0, z: 13, surfaceId: 'terrain' },
  });
  expect(started.outcome.ok, started.outcome.message).toBe(true);
  return prepareWorldNavigation(started.world);
}
function commit(world: WorldState, capturedActorFrame?: string, reply = response) {
  return commitActorResponse(
    world,
    'relative-answer',
    PLAYER_ID,
    reply,
    {},
    [PLAYER_ID],
    entityGet(world.entities, PLAYER_ID)!.actor!.planGeneration,
    [],
    undefined,
    [],
    {},
    undefined,
    {},
    capturedActorFrame,
  );
}
function components(world: WorldState) {
  return world.responseReceipts!['relative-answer']!.components;
}

describe('generated actor-relative movement binding', () => {
  it('admits an unchanged captured frame and retains independent speech', () => {
    const world = walking();
    const result = commit(world, captureActorFrame(world, PLAYER_ID));
    expect(components(result.world).voice!.ok).toBe(true);
    expect(components(result.world).step!.ok).toBe(true);
  });
  it('refuses changed position/facing while the same native work continues, without dropping speech', () => {
    const world = walking();
    const captured = captureActorFrame(world, PLAYER_ID)!;
    const work = currentWorkIdentity(world, PLAYER_ID);
    const moved = advanceWithNavigation(world, 0.1).world;
    expect(currentWorkIdentity(moved, PLAYER_ID)).toEqual(work);
    expect(captureActorFrame(moved, PLAYER_ID)).not.toBe(captured);
    const result = commit(moved, captured);
    expect(components(result.world).voice!.ok).toBe(true);
    expect(components(result.world).step).toMatchObject({ ok: false, code: 'stale-actor-frame' });
    expect(currentWorkIdentity(result.world, PLAYER_ID)).toEqual(work);
    const immediate = bindActionInvocation(moved, PLAYER_ID, 'immediate-relative', relative, [
      PLAYER_ID,
    ]);
    const actor = entityGet(moved.entities, PLAYER_ID)!,
      here = worldPosition(actor);
    const { right } = headingFrame(actor.spatial.heading);
    expect(immediate).toMatchObject({
      type: 'move',
      destination: { x: here.x + right.x, z: here.z + right.z },
    });
  });
  it('keeps absolute movement independent of the captured relative frame', () => {
    const world = walking();
    const here = worldPosition(entityGet(world.entities, PLAYER_ID)!);
    const reply = structuredClone(response);
    reply.operations[1]!.act!.invocation = {
      ...relative,
      frame: 'world',
      x: here.x + 1,
      z: here.z,
    };
    const result = commit(world, undefined, reply);
    expect(components(result.world).step!.ok).toBe(true);
    expect(components(result.world).voice!.ok).toBe(true);
  });
  it('requires captured server binding and checks heading/support independently', () => {
    const world = walking();
    const captured = captureActorFrame(world, PLAYER_ID)!;
    const missing = commit(world);
    expect(components(missing.world).step).toMatchObject({ ok: false, code: 'stale-actor-frame' });
    expect(components(missing.world).voice!.ok).toBe(true);
    const turned = structuredClone(world);
    entityGet(turned.entities, PLAYER_ID)!.spatial.heading += Math.PI / 2;
    expect(components(commit(turned, captured).world).step).toMatchObject({
      ok: false,
      code: 'stale-actor-frame',
    });
    const supported = structuredClone(world);
    const actor = entityGet(supported.entities, PLAYER_ID)!;
    setSpatialPosition(supported, actor, worldPosition(actor), null);
    expect(components(commit(supported, captured).world).step).toMatchObject({
      ok: false,
      code: 'stale-actor-frame',
    });
  });
});
