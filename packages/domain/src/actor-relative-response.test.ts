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
  bindNativeChoice,
  createItemLot,
  inventoryFor,
  currentInventoryInspection,
  commitActorResponse,
  currentWorkIdentity,
  entityGet,
  executeCommand,
  PLAYER_ID,
  NPC_ID,
  setSpatialPosition,
  worldPosition,
  worldSupport,
  type ActionInvocation,
  type ActorResponse,
  type ActionChoice,
  type Command,
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
function walking(prepare?: (world: WorldState) => void) {
  const world = stockedCamp();
  prepare?.(world);
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
    for (const operation of ['inspection', 'busy-equipment', 'durative-move'] as const) {
      const outcomes: Array<{ ok: boolean; code: string }> = [];
      for (const kind of ['known', 'invoke'] as const) {
        let tool = '';
        const native = walking((world) => {
          const definition = Object.values(world.itemDefinitions).find((entry) => entry.equipment)!;
          tool = createItemLot(world, PLAYER_ID, definition.id, 1, 'parity-equipment');
        });
        const before = currentWorkIdentity(native, PLAYER_ID);
        const command: Command =
          operation === 'inspection'
            ? { type: 'inspect-inventory', actorId: PLAYER_ID, id: 'selected-inspection' }
            : operation === 'busy-equipment'
              ? { type: 'equip', actorId: PLAYER_ID, id: 'selected-equipment', itemId: tool }
              : {
                  type: 'move',
                  actorId: PLAYER_ID,
                  id: 'selected-move',
                  destination: { x: 19, y: 0, z: 13, surfaceId: 'terrain' },
                };
        const invocation: ActionInvocation =
          operation === 'durative-move'
            ? { ...relative, frame: 'world', x: 19, z: 13 }
            : {
                ...relative,
                family:
                  operation === 'inspection' ? 'base:inspect-possessions' : 'base:equip-possession',
                parameters: operation === 'inspection' ? {} : { itemId: tool },
                x: null,
                z: null,
                frame: null,
              };
        const reply = structuredClone(response);
        reply.operations[1]!.act = {
          ...reply.operations[1]!.act!,
          kind,
          invocation: kind === 'invoke' ? invocation : null,
          actionId: kind === 'known' ? 'selected' : null,
        };
        const actions: Record<string, ActionChoice> =
          kind === 'known'
            ? {
                selected: bindNativeChoice(
                  native,
                  PLAYER_ID,
                  command,
                  operation === 'durative-move' ? 'enqueue' : 'continue',
                ),
              }
            : {};
        const refs = [PLAYER_ID, ...inventoryFor(native, PLAYER_ID).map((item) => item.id)];
        const responseId = `parity-${operation}-${kind}`;
        const apply = (world: WorldState) =>
          commitActorResponse(
            world,
            responseId,
            PLAYER_ID,
            reply,
            actions,
            refs,
            before.generation,
          );
        const selected = apply(native);
        const receipt = selected.world.responseReceipts![responseId]!;
        expect(receipt.components.voice!.ok).toBe(true);
        expect(entityGet(selected.world.entities, PLAYER_ID)!.actor!.action?.id).toBe(
          before.actionId,
        );
        if (operation === 'inspection') {
          expect(receipt.components.step!.ok).toBe(true);
          expect(currentInventoryInspection(selected.world, PLAYER_ID)).toBeDefined();
        } else if (operation === 'busy-equipment')
          expect(receipt.components.step).toMatchObject({ ok: false, code: 'not-equippable' });
        else {
          expect(receipt.components.step!.ok).toBe(true);
          expect(
            entityGet(selected.world.entities, PLAYER_ID)!.actor!.agency.plan?.steps.length,
          ).toBe(1);
        }
        const replay = apply(selected.world);
        expect(replay.outcome.code).toBe('duplicate');
        expect(replay.events).toEqual([]);
        outcomes.push({ ok: receipt.components.step!.ok, code: receipt.components.step!.code });
        if (kind === 'known') {
          const stopped = executeCommand(native, {
            id: 'stop-before-response',
            actorId: PLAYER_ID,
            type: 'cancel',
          });
          const stale = apply(stopped.world);
          expect(stale.world.responseReceipts![responseId]!.components.voice!.ok).toBe(true);
          expect(stale.world.responseReceipts![responseId]!.components.step).toMatchObject({
            ok: false,
            code: 'stale-plan',
          });
        }
      }
      expect(outcomes[0]).toEqual(outcomes[1]);
    }
    // A trusted selection or exact prose binding cannot hide replacement inside
    // a command when the response explicitly chose to enqueue it.
    for (const kind of ['known', 'proposal'] as const) {
      const selected: Command = {
        type: 'outing',
        actorId: PLAYER_ID,
        id: 'mismatched-outing',
        operation: 'invite',
        recipientId: NPC_ID,
        destination: { x: 19, y: 0, z: 13, surfaceId: 'terrain' },
        mode: 'replace',
      };
      const reply = structuredClone(response);
      reply.operations[1]!.act = {
        ...reply.operations[1]!.act!,
        kind,
        invocation: null,
        actionId: kind === 'known' ? 'selected' : null,
        description: kind === 'proposal' ? 'Invite them for a walk.' : null,
      };
      const responseId = `mode-agreement-${kind}`;
      const guarded = commitActorResponse(
        world,
        responseId,
        PLAYER_ID,
        reply,
        kind === 'known'
          ? { selected: bindNativeChoice(world, PLAYER_ID, selected, 'continue') }
          : {},
        [PLAYER_ID, NPC_ID],
        entityGet(world.entities, PLAYER_ID)!.actor!.planGeneration,
        kind === 'proposal'
          ? [
              {
                operationId: 'step',
                manifestRevision: world.moduleManifest.revision,
                targetEpisodes: {},
                description: 'Invite them for a walk.',
                commands: [selected],
                fulfillment: {
                  requested: 'Invite them for a walk.',
                  executableDescription: 'Invite them for a walk.',
                  verdict: 'exact',
                  supported: ['Invite them for a walk.'],
                  omitted: [],
                  reason: 'The native invitation expresses the requested walk.',
                },
              },
            ]
          : [],
      );
      expect(guarded.world.responseReceipts![responseId]!.components).toMatchObject({
        voice: { ok: true },
        step: { ok: false, code: 'activity-choices' },
      });
      expect(currentWorkIdentity(guarded.world, PLAYER_ID)).toEqual(
        currentWorkIdentity(world, PLAYER_ID),
      );
    }
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
