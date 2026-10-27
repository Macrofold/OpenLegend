import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  createItemLot,
  entityGet,
  entityValues,
  PLAYER_ID,
  NPC_ID,
  worldPosition,
  setSpatialPosition,
  worldSupport,
  type WorldState,
  itemFor,
  occurrenceFor,
  validateWorldModules,
  definitionPin,
  possessionItems,
  setItemQuantity,
  bodyPolicy,
  executeCommand,
  navigationBlocked,
  spatialMap,
  initializePerception,
} from '@open-legend/domain';
import type { CommandInput, GameView, WorldInputScope } from '@open-legend/protocol';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import { testRepository, readConfig } from '../../../tests/fixtures/database.js';
import { enterLocalWorld, editWorld } from '../../../tests/fixtures/service.js';
import { WorldService } from './world-service.js';
import { projectView } from './view.js';
import { commandInputSchema } from './command-input-schema.js';
import { worldInputSchema } from './world-input-schema.js';
import { fixture as rangedFixture } from '../../../tests/fixtures/combat-execution.js';
import { initializeNavigationRuntime, RecastPlanner } from './navigation/backend.js';
import { currentContactReference } from './public-contact-references.js';

const services: WorldService[] = [];
afterEach(async () => {
  for (const service of services.splice(0)) {
    await service.settleBackgroundSaves();
    service.releaseHostWork();
    await service.store.close();
  }
});
async function setup(opening: WorldState = stockedCamp(), wallClock?: () => number) {
  const store = await testRepository(undefined, opening);
  const service = new WorldService(store, readConfig(), wallClock);
  services.push(service);
  await enterLocalWorld(service);
  await service.setPresence('test-client', true);
  let itemId = '';
  await editWorld(service, (world) => {
    itemId = createItemLot(world, PLAYER_ID, 'spear', 1, 'execution-fixture');
    const player = entityGet(world.entities, PLAYER_ID)!,
      target = entityGet(world.entities, NPC_ID)!;
    const point = worldPosition(player);
    setSpatialPosition(
      world,
      target,
      { x: point.x + 1.5, y: point.y, z: point.z },
      worldSupport(player)!,
    );
    initializePerception(world, [], [PLAYER_ID]);
  });
  const send = (id: string, input: CommandInput, publicReferences = false) =>
    service.command(
      id,
      commandInputSchema.parse(input),
      undefined,
      service.commandEpoch,
      service.localScope,
      publicReferences,
    );
  const equipped = await send('equip-fixture', { type: 'equip', itemId });
  expect(equipped.ok, equipped.message).toBe(true);
  await service.tick(0, 0);
  let now = performance.now();
  service.clockStartedAt = now;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  return {
    service,
    send,
    itemId,
    now: () => now,
    setNow: (value: number) => {
      now = value;
    },
    advance: async (ms: number) => {
      now += ms;
      await service.tick(ms / 1000, 0, { offeredUntil: now });
    },
  };
}
function observedTarget(service: WorldService, view: GameView, id = NPC_ID) {
  const reference = currentContactReference(
    service.world,
    service.localScope,
    entityGet(service.world.entities, id)!,
  );
  return view.entities.find((entity) => entity.id === reference)!;
}
const identity = (scope: WorldInputScope, sequence = 1) => ({
  inputEpoch: scope.inputEpoch,
  attackInputToken: scope.attackInputToken,
  gestureSequence: sequence,
});
const begin = (scope: WorldInputScope, itemId: string, sequence = 1): CommandInput => ({
  type: 'strike',
  definitionId: 'spear',
  itemId,
  targetId: NPC_ID,
  execution: { operation: 'begin', ...identity(scope, sequence) },
});

describe('native held attack service and control authority', () => {
  it('invalidates expired reviews and old life/control input even with a higher sequence', async () => {
    let wallTime = Date.now();
    const f = await setup(stockedCamp(), () => wallTime);
    await editWorld(f.service, (world) => {
      entityGet(world.entities, NPC_ID)!.actor!.health = 1;
    });
    const scope = f.service.inputScope(f.service.localScope),
      input = begin(scope, f.itemId);
    const review = await f.send('expiring-review', input);
    expect(review.lethalReview).toBeDefined();
    for (let renewal = 0; renewal < 6; renewal++) {
      wallTime += 10000;
      await f.service.setPresence('test-client', true);
    }
    wallTime += 1001;
    const expired = await f.send('expired-confirm', {
      ...input,
      lethalReviewId: review.lethalReview!.id,
      execution: { operation: 'confirm-review', ...identity(scope, 99) },
    });
    expect(expired.code).toBe('lethal-review-stale');
    expect(entityGet(f.service.world.entities, PLAYER_ID)!.actor!.action).toBeNull();
    await editWorld(f.service, (world) => {
      const actor = entityGet(world.entities, PLAYER_ID)!.actor!;
      actor.physicalLife = (actor.physicalLife ?? 0) + 1;
    });
    expect(
      (
        await f.service.updateWorldInput(
          { kind: 'steer', ...scope, movementSequence: 999, direction: { x: 1, z: 0 } },
          f.service.localScope,
        )
      ).ok,
    ).toBe(false);
    const lifeScope = f.service.inputScope(f.service.localScope);
    expect(lifeScope.inputEpoch).not.toBe(scope.inputEpoch);
    expect(
      (
        await f.service.updateWorldInput(
          { kind: 'steer', ...lifeScope, movementSequence: 1, direction: { x: 1, z: 0 } },
          f.service.localScope,
        )
      ).ok,
    ).toBe(true);
    const control = f.service.localScope;
    expect(
      (
        await f.service.changeEmbodiment(control, {
          id: 'replace-input-controller',
          expectedGeneration: control.controlGeneration,
          operation: 'replace',
        })
      ).ok,
    ).toBe(true);
    expect(
      (
        await f.service.updateWorldInput(
          { kind: 'steer', ...lifeScope, movementSequence: 999, direction: { x: 1, z: 0 } },
          f.service.localScope,
        )
      ).ok,
    ).toBe(false);
    expect(f.service.inputScope(f.service.localScope).inputEpoch).not.toBe(lifeScope.inputEpoch);
  }, 30000);

  it('loads a current-format pending action without restoring movement or automatic release', async () => {
    const f = await setup(),
      scope = f.service.inputScope(f.service.localScope);
    const begun = await f.send('save-begin', begin(scope, f.itemId));
    expect(begun.ok, begun.message).toBe(true);
    expect(
      (
        await f.send('save-release', {
          type: 'release-strike',
          expectedActionId: begun.actionId,
          execution: {
            operation: 'release',
            ...identity(scope),
            beginCommandId: 'save-begin',
            input: { kind: 'timed-release', phase: 0.25 },
          },
        })
      ).ok,
    ).toBe(true);
    await f.service.updateWorldInput(
      { kind: 'steer', ...scope, movementSequence: 1, direction: { x: 1, z: 0 } },
      f.service.localScope,
    );
    const saveId = randomUUID();
    await f.service.createSave('Pending execution', saveId);
    const payload = await f.service.store.saves!.read(f.service.world.id, saveId);
    expect(
      (await f.send('cancel-before-load', { type: 'cancel', expectedActionId: begun.actionId })).ok,
    ).toBe(true);
    await f.service.restoreSave(saveId, randomUUID(), payload);
    expect(f.service.paused).toBe(true);
    await enterLocalWorld(f.service);
    await f.service.setPresence('loaded-client', true);
    await f.service.control({ paused: false });
    const fresh = f.service.inputScope(f.service.localScope);
    expect(fresh.inputEpoch).not.toBe(scope.inputEpoch);
    expect(
      (
        await f.service.updateWorldInput(
          { kind: 'steer', ...scope, movementSequence: 999, direction: { x: 1, z: 0 } },
          f.service.localScope,
        )
      ).ok,
    ).toBe(false);
    const before = { ...worldPosition(entityGet(f.service.world.entities, PLAYER_ID)!) };
    await f.service.tick(0.5);
    const action = entityGet(f.service.world.entities, PLAYER_ID)!.actor!.action!;
    expect(action.id).toBe(begun.actionId);
    expect(action.attackExecution?.ready).toBe(true);
    expect(action.attackExecution?.pendingRelease?.input).toEqual({
      kind: 'timed-release',
      phase: 0.25,
    });
    expect(worldPosition(entityGet(f.service.world.entities, PLAYER_ID)!)).toEqual(before);
    expect(occurrenceFor(f.service.world, PLAYER_ID, action.id)?.attackExecution).toBeUndefined();
    expect(
      (await f.send('loaded-neutral', { type: 'release-strike', expectedActionId: action.id })).ok,
    ).toBe(true);
    expect(occurrenceFor(f.service.world, PLAYER_ID, action.id)?.attackExecution?.input).toEqual({
      kind: 'ordinary',
    });
  }, 60000);

  it('retains the selected ranged weapon with reasons for reserved ammo, recovery, missing ammo and absent support', async () => {
    const ranged = rangedFixture(),
      f = await setup(ranged.world);
    expect((await f.send('availability-equip', { type: 'equip', itemId: ranged.toolId })).ok).toBe(
      true,
    );
    let ammunitionId = '';
    await editWorld(f.service, (world) => {
      const kind =
        world.itemDefinitions[itemFor(world, ranged.toolId)!.definitionId]!.rangedWeapon!
          .ammunitionKind;
      const ammunition = [...possessionItems(world, PLAYER_ID)].filter(
        (item) => world.itemDefinitions[item.definitionId]?.ammunition?.kind === kind,
      );
      ammunitionId = ammunition[0]!.id;
      for (const item of ammunition)
        setItemQuantity(world, item.id, item.id === ammunitionId ? 1 : 0, 'availability-fixture');
    });
    const source = (await projectView(f.service)).player.attackSource!;
    expect(source).toMatchObject({
      kind: 'ranged',
      enabled: true,
      command: { itemId: ranged.toolId, ammunitionId },
    });
    const p = worldPosition(entityGet(f.service.world.entities, PLAYER_ID)!);
    const held = await f.send('availability-aim', {
      ...source.command,
      aimPoint: { ...p, z: p.z + 3 },
      aimBasis: { surfaceId: worldSupport(entityGet(f.service.world.entities, PLAYER_ID)!)! },
      execution: {
        operation: 'begin',
        ...identity(f.service.inputScope(f.service.localScope)),
      },
    });
    expect(held.ok, held.message).toBe(true);
    expect((await projectView(f.service)).player.attackSource).toMatchObject({
      enabled: false,
      reason: 'The selected ammunition is unavailable.',
      command: { itemId: ranged.toolId },
    });
    expect(
      (await f.send('availability-cancel', { type: 'cancel', expectedActionId: held.actionId })).ok,
    ).toBe(true);
    expect((await projectView(f.service)).player.attackSource?.enabled).toBe(true);
    await editWorld(f.service, (world) => {
      entityGet(world.entities, PLAYER_ID)!.actor!.combatReadyAt = world.simTime + 18;
    });
    expect((await projectView(f.service)).player.attackSource).toMatchObject({
      enabled: false,
      reason: expect.stringContaining('recovering'),
      command: { itemId: ranged.toolId },
    });
    await editWorld(f.service, (world) => {
      delete entityGet(world.entities, PLAYER_ID)!.actor!.combatReadyAt;
      setItemQuantity(world, ammunitionId, 0, 'availability-empty');
    });
    expect((await projectView(f.service)).player.attackSource).toMatchObject({
      enabled: false,
      reason: 'The selected ammunition is unavailable.',
      command: { itemId: ranged.toolId },
    });
    await editWorld(f.service, (world) => {
      world.moduleManifest = {
        ...world.moduleManifest,
        revision: world.moduleManifest.revision + 1,
        rangedPolicy: null,
        rangedPolicyPin: null,
      };
    });
    expect((await projectView(f.service)).player.attackSource).toMatchObject({
      enabled: false,
      reason: 'This attack is unavailable in the current world or body.',
      command: { itemId: ranged.toolId },
    });
  }, 30000);

  it('reopens committed pending work with fresh input scope and only explicit neutral recovery', async () => {
    const f = await setup(),
      scope = f.service.inputScope(f.service.localScope),
      input = begin(scope, f.itemId);
    const started = await f.send('restart-begin', input);
    expect(started.ok, started.message).toBe(true);
    const release: CommandInput = {
      type: 'release-strike',
      expectedActionId: started.actionId,
      execution: {
        operation: 'release',
        ...identity(scope),
        beginCommandId: 'restart-begin',
        input: { kind: 'timed-release', phase: 0.25 },
      },
    };
    const pending = await f.send('restart-release', release);
    expect(pending.execution?.releaseRequested).toBe(true);
    const originalScope = f.service.localScope;
    await f.service.updateWorldInput(
      { kind: 'steer', ...scope, movementSequence: 1, direction: { x: 1, z: 0 } },
      f.service.localScope,
    );
    await f.service.settleBackgroundSaves();
    f.service.releaseHostWork();
    const restored = new WorldService(f.service.store, readConfig());
    services.push(restored);
    await enterLocalWorld(restored);
    await restored.setPresence('restored-client', true);
    const fresh = restored.inputScope(restored.localScope);
    expect(fresh.inputEpoch).not.toBe(scope.inputEpoch);
    const position = { ...worldPosition(entityGet(restored.world.entities, PLAYER_ID)!) };
    const oldRenewal = await restored.updateWorldInput(
      {
        kind: 'renew',
        inputEpoch: scope.inputEpoch,
        renewalSequence: 2,
        movement: { movementInputToken: scope.movementInputToken, movementSequence: 1 },
        pendingRelease: {
          attackInputToken: scope.attackInputToken,
          gestureSequence: 1,
          beginCommandId: 'restart-begin',
          actionId: started.actionId!,
        },
      },
      restored.localScope,
    );
    expect(oldRenewal.ok).toBe(false);
    expect(oldRenewal.movementAccepted).not.toBe(true);
    expect(oldRenewal.releaseAccepted).not.toBe(true);
    expect(
      await restored.commandReceipt(
        'restart-release',
        commandInputSchema.parse(release),
        restored.commandEpoch,
        originalScope,
      ),
    ).toMatchObject({ status: 'resolved', result: pending });
    await restored.tick(0.5);
    expect(worldPosition(entityGet(restored.world.entities, PLAYER_ID)!)).toEqual(position);
    const action = entityGet(restored.world.entities, PLAYER_ID)!.actor!.action!;
    expect(action.id).toBe(started.actionId);
    expect(action.attackExecution?.ready).toBe(true);
    expect(action.attackExecution?.pendingRelease?.input.kind).toBe('timed-release');
    expect(occurrenceFor(restored.world, PLAYER_ID, action.id)?.attackExecution).toBeUndefined();
    const neutral = await restored.command(
      'restart-neutral',
      { type: 'release-strike', expectedActionId: action.id },
      undefined,
      restored.commandEpoch,
      restored.localScope,
    );
    expect(neutral.ok, neutral.message).toBe(true);
    expect(occurrenceFor(restored.world, PLAYER_ID, action.id)?.attackExecution?.input).toEqual({
      kind: 'ordinary',
    });
  }, 30000);

  it('describes a reviewed held strike with its exact tool and melee consequences', async () => {
    const f = await setup(),
      scope = f.service.inputScope(f.service.localScope);
    const begun = await f.send('describe-begin', begin(scope, f.itemId));
    expect(begun.ok, begun.message).toBe(true);
    await editWorld(f.service, (world) => {
      entityGet(world.entities, NPC_ID)!.actor!.health = 1;
    });
    const result = await f.send('describe-release', {
      type: 'release-strike',
      expectedActionId: begun.actionId,
      execution: {
        operation: 'release',
        ...identity(scope),
        beginCommandId: 'describe-begin',
        input: { kind: 'timed-release', phase: 0.25 },
      },
    });
    expect(result.code, result.message).toBe('lethal-review-required');
    expect(result.lethalReview?.description).toBe(
      bodyPolicy(f.service.world)!.lethalAttackReview!.description,
    );
    expect(result.lethalReview?.attack).toMatchObject({
      name: 'Release attack',
      tool: expect.stringContaining('spear'),
    });
    expect(result.lethalReview?.confirmLabel).toBe('Release attack');
    expect(
      result.lethalReview?.attack.facts.some(
        (fact) => fact.name === 'attack' && fact.value.includes('reach'),
      ),
    ).toBe(true);
    expect(
      result.lethalReview?.attack.facts.some(
        (fact) => fact.name === 'preparation' && fact.value.includes('You control movement'),
      ),
    ).toBe(true);
    expect(
      result.lethalReview?.attack.facts.some((fact) =>
        fact.value.includes('approach is automatic'),
      ),
    ).toBe(false);
  }, 30000);
  it('offers one ordinary point shot when the selected ranged weapon has no timing profile', async () => {
    const ranged = rangedFixture();
    const original = entityGet(ranged.world.entities, ranged.toolId)!.item!;
    const definition = {
      ...ranged.world.itemDefinitions[original.definitionPin.id]!,
      id: 'ordinary-fixture-sling',
    };
    delete definition.execution;
    delete definition.recipeId;
    ranged.world.itemDefinitions[definition.id] = definition;
    const toolId = createItemLot(
      ranged.world,
      PLAYER_ID,
      definition.id,
      1,
      'ordinary-fixture-sling-item',
    );
    validateWorldModules(ranged.world);
    const f = await setup(ranged.world);
    expect((await f.send('ordinary-equip', { type: 'equip', itemId: toolId })).ok).toBe(true);
    const view = await projectView(f.service),
      source = view.player.attackSource!;
    expect(source.command.type).toBe('shoot-once');
    expect(source.profile).toBeUndefined();
    const player = entityGet(f.service.world.entities, PLAYER_ID)!;
    const aimPoint = { ...worldPosition(player), z: worldPosition(player).z + 3 };
    const input: CommandInput = {
      ...source.command,
      aimPoint,
      aimBasis: { surfaceId: worldSupport(player)! },
    };
    const begun = await f.send('ordinary-point', input);
    expect(begun.ok, begun.message).toBe(true);
    const held = entityGet(f.service.world.entities, PLAYER_ID)!.actor!.action!;
    expect(held.type).toBe('shoot-once');
    expect(held.attackExecution).toBeUndefined();
    expect(held.ranged?.manual).toBe(false);
    expect(held.ranged?.aimPoint).toEqual(aimPoint);
    const before = itemFor(f.service.world, held.ammoItemId!)!.quantity;
    await f.advance(400);
    expect(
      f.service.world.events.filter(
        (event) => event.type === 'shot-released' && event.actorId === PLAYER_ID,
      ),
    ).toHaveLength(1);
    expect(itemFor(f.service.world, held.ammoItemId!)!.quantity).toBe(before - 1);
    expect(entityGet(f.service.world.entities, PLAYER_ID)!.actor!.action).toBeNull();
    const evidence = occurrenceFor(f.service.world, PLAYER_ID, held.id)!;
    expect(evidence.noLearningControl).toBe(true);
    expect(evidence.attackExecution).toBeUndefined();
    expect(evidence.command).toMatchObject({ type: 'shoot-once', aimPoint });
    const duplicate = await f.send('ordinary-point', input);
    expect(duplicate).toEqual(begun);
    expect(itemFor(f.service.world, held.ammoItemId!)!.quantity).toBe(before - 1);
    await f.advance(300);
    const targetView = await projectView(f.service),
      target = observedTarget(f.service, targetView);
    const aimed = await f.send(
      'ordinary-target',
      {
        ...targetView.player.attackSource!.command,
        targetId: target.id,
        bodyReference: target.bodyReference,
      },
      true,
    );
    expect(aimed.ok, aimed.message).toBe(true);
    const targetAction = entityGet(f.service.world.entities, PLAYER_ID)!.actor!.action!;
    expect(targetAction.ranged?.aimTarget).toEqual({ id: NPC_ID, life: 0 });
    expect(targetAction.ranged?.aimPoint).toBeUndefined();
    await f.advance(400);
    expect(occurrenceFor(f.service.world, PLAYER_ID, targetAction.id)!.release?.aimTarget?.id).toBe(
      NPC_ID,
    );
    validateWorldModules(f.service.world);
  }, 30000);
  it('offers the subject route when the installed ranged law disallows point fire', async () => {
    const ranged = rangedFixture(),
      f = await setup(ranged.world);
    await editWorld(f.service, (world) => {
      const policy = { ...world.moduleManifest.rangedPolicy!, pointFire: false };
      world.moduleManifest = {
        ...world.moduleManifest,
        revision: world.moduleManifest.revision + 1,
        rangedPolicy: policy,
        rangedPolicyPin: definitionPin(policy),
      };
    });
    expect((await f.send('subject-equip', { type: 'equip', itemId: ranged.toolId })).ok).toBe(true);
    const view = await projectView(f.service),
      source = view.player.attackSource!,
      scope = f.service.inputScope(f.service.localScope);
    expect(source).toMatchObject({ kind: 'ranged', pointFire: false });
    const target = observedTarget(f.service, view);
    const input: CommandInput = {
      ...source.command,
      targetId: target.id,
      bodyReference: target.bodyReference,
      execution: { operation: 'begin', ...identity(scope) },
    };
    const begun = await f.send('subject-only', input, true);
    expect(begun.ok, begun.message).toBe(true);
    expect(
      entityGet(f.service.world.entities, PLAYER_ID)!.actor!.action?.ranged?.aimPoint,
    ).toBeUndefined();
    expect(
      (await f.send('cancel-subject', { type: 'cancel', expectedActionId: begun.actionId })).ok,
    ).toBe(true);
    const p = worldPosition(entityGet(f.service.world.entities, NPC_ID)!);
    const refused = await f.send(
      'no-point-law',
      {
        ...input,
        aimPoint: { ...p, y: p.y + 0.85 },
        aimBasis: { bodyReference: target.bodyReference },
        execution: {
          operation: 'begin',
          ...identity(f.service.inputScope(f.service.localScope)),
        },
      },
      true,
    );
    expect(refused.ok).toBe(false);
    expect(refused.code).toBe('point-fire-unavailable');
  }, 30000);

  it('admits a displayed covered body point without granting an arbitrary hidden point', async () => {
    const ranged = rangedFixture(),
      f = await setup(ranged.world);
    await editWorld(f.service, (world) => {
      const player = entityGet(world.entities, PLAYER_ID)!,
        target = entityGet(world.entities, NPC_ID)!,
        p = worldPosition(player);
      setSpatialPosition(world, target, { ...p, z: p.z - 2 }, worldSupport(player)!);
      world.map.spatial.blockers.push({
        id: 'fixture:low-input-screen',
        bounds: {
          min: { x: p.x - 0.8, y: p.y, z: p.z - 1.85 },
          max: { x: p.x + 0.8, y: p.y + 1.4, z: p.z - 1.75 },
        },
        movement: true,
        sight: true,
        acousticTransmission: 1,
        material: 'wood',
      });
      world.map.spatial.revision++;
      initializePerception(world, [], [PLAYER_ID]);
    });
    expect((await f.send('cover-equip', { type: 'equip', itemId: ranged.toolId })).ok).toBe(true);
    const view = await projectView(f.service),
      scope = f.service.inputScope(f.service.localScope),
      target = observedTarget(f.service, view);
    expect(target.bodyReference).toBeTruthy();
    const p = worldPosition(entityGet(f.service.world.entities, NPC_ID)!),
      aimPoint = { ...p, y: p.y + 0.85 };
    const input: CommandInput = {
      ...view.player.attackSource!.command,
      targetId: target.id,
      bodyReference: target.bodyReference,
      aimPoint,
      aimBasis: { bodyReference: target.bodyReference },
      execution: { operation: 'begin', ...identity(scope) },
    };
    const denied = await f.send(
      'hidden-outside-body',
      {
        ...input,
        aimPoint: { ...aimPoint, x: aimPoint.x + 0.7 },
      },
      true,
    );
    expect(denied.ok).toBe(false);
    expect(denied.code).toBe('not-visible');
    const begun = await f.send(
      'covered-body',
      {
        ...input,
        execution: { operation: 'begin', ...identity(scope, 2) },
      },
      true,
    );
    expect(begun.ok, begun.message).toBe(true);
    const action = entityGet(f.service.world.entities, PLAYER_ID)!.actor!.action!;
    expect(action.ranged?.aimPointSubject).toEqual({ id: NPC_ID, life: 0 });
    expect(action.ranged?.aimPoint).toEqual(aimPoint);
    validateWorldModules(f.service.world);
  }, 30000);

  it('admits one preparation, freezes one early release, advances it only under renewal, and recovers exact original receipts', async () => {
    const f = await setup(),
      scope = f.service.inputScope(f.service.localScope);
    const visible = await projectView(f.service),
      target = observedTarget(f.service, visible);
    const input = {
        ...begin(scope, f.itemId),
        targetId: target.id,
        bodyReference: target.bodyReference,
      },
      started = await f.send('begin', input, true);
    expect(started.ok, started.message).toBe(true);
    expect(started.actionId).toBeTruthy();
    expect(started.execution?.profile.kind).toBe('timed-release');
    const release: CommandInput = {
      type: 'release-strike',
      expectedActionId: started.actionId,
      execution: {
        operation: 'release',
        ...identity(scope),
        beginCommandId: 'begin',
        input: { kind: 'timed-release', phase: 0.25 },
      },
    };
    const requested = await f.send('release', release);
    expect(requested.ok, requested.message).toBe(true);
    expect(requested.execution?.releaseRequested).toBe(true);
    expect(
      entityGet(f.service.world.entities, PLAYER_ID)?.actor?.action?.attackExecution?.pendingRelease
        ?.input,
    ).toEqual({ kind: 'timed-release', phase: 0.25 });
    for (let step = 1; step <= 3; step++) {
      await f.advance(100);
      if (step < 3) {
        const renewal = await f.service.updateWorldInput(
          {
            kind: 'renew',
            inputEpoch: scope.inputEpoch,
            renewalSequence: step,
            pendingRelease: {
              attackInputToken: scope.attackInputToken,
              gestureSequence: 1,
              beginCommandId: 'begin',
              actionId: started.actionId!,
            },
          },
          f.service.localScope,
        );
        expect(
          renewal.releaseAccepted,
          JSON.stringify({
            renewal,
            action: entityGet(f.service.world.entities, PLAYER_ID)?.actor?.action,
            time: f.service.world.simTime,
          }),
        ).toBe(true);
      }
    }
    expect(
      entityGet(f.service.world.entities, PLAYER_ID)?.actor?.action?.attackExecution
        ?.pendingRelease,
    ).toBeUndefined();
    const tooLate = await f.send('late-cancel', {
      type: 'cancel',
      expectedActionId: started.actionId,
      execution: { operation: 'cancel', ...identity(scope), beginCommandId: 'begin' },
    });
    expect(tooLate.code, tooLate.message).toBe('released');
    await f.service.control({ paused: true });
    expect(await f.send('release', release)).toEqual(requested);
    expect(await f.send('begin', input, true)).toEqual(started);
  }, 30000);
  it('cancellation before acknowledgement is terminal and cannot stop unrelated later work', async () => {
    const f = await setup(),
      scope = f.service.inputScope(f.service.localScope);
    const cancelled = await f.send('cancel', {
      type: 'cancel',
      execution: { operation: 'cancel', ...identity(scope), beginCommandId: 'late-begin' },
    });
    expect(cancelled.ok, cancelled.message).toBe(true);
    expect((await f.send('late-begin', begin(scope, f.itemId))).code).toBe('input-stale');
    const next = await f.send('next', begin(scope, f.itemId, 2));
    expect(next.ok, next.message).toBe(true);
    expect(
      (
        await f.send('late-cancel', {
          type: 'cancel',
          execution: { operation: 'cancel', ...identity(scope), beginCommandId: 'late-begin' },
        })
      ).ok,
    ).toBe(false);
    expect(entityGet(f.service.world.entities, PLAYER_ID)?.actor?.action?.id).toBe(next.actionId);
  }, 30000);
  it('retires interrupted native preparation without revoking concurrent movement or replaying its receipt', async () => {
    const f = await setup(),
      scope = f.service.inputScope(f.service.localScope),
      input = begin(scope, f.itemId);
    const started = await f.send('interrupted-begin', input);
    expect(started.ok, started.message).toBe(true);
    expect(
      (
        await f.service.updateWorldInput(
          { kind: 'steer', ...scope, movementSequence: 1, direction: { x: 0, z: 1 } },
          f.service.localScope,
        )
      ).ok,
    ).toBe(true);
    const interrupted = await f.service.transition((world) =>
      executeCommand(world, {
        id: 'native-interruption',
        actorId: PLAYER_ID,
        type: 'cancel',
        expectedActionId: started.actionId,
      }),
    );
    expect(interrupted.ok, interrupted.message).toBe(true);
    const fresh = f.service.inputScope(f.service.localScope);
    expect(fresh.attackInputToken).not.toBe(scope.attackInputToken);
    expect(fresh.movementInputToken).toBe(scope.movementInputToken);
    expect(fresh.inputEpoch).toBe(scope.inputEpoch);
    expect(f.service.inputScope(f.service.localScope)).toEqual(fresh);
    expect(await f.send('interrupted-begin', input)).toEqual(started);
    expect(entityGet(f.service.world.entities, PLAYER_ID)!.actor!.action).toBeNull();
    expect((await f.send('obsolete-high-begin', begin(scope, f.itemId, 999))).code).toBe(
      'input-stale',
    );
    expect(
      (
        await f.send('obsolete-release', {
          type: 'release-strike',
          expectedActionId: started.actionId,
          execution: {
            operation: 'release',
            ...identity(scope),
            beginCommandId: 'interrupted-begin',
            input: { kind: 'ordinary' },
          },
        })
      ).code,
    ).toBe('input-stale');
    expect(
      (
        await f.service.updateWorldInput(
          {
            kind: 'renew',
            inputEpoch: scope.inputEpoch,
            renewalSequence: 1,
            movement: { movementInputToken: scope.movementInputToken, movementSequence: 1 },
          },
          f.service.localScope,
        )
      ).movementAccepted,
    ).toBe(true);
    const next = await f.send('fresh-after-interruption', begin(fresh, f.itemId));
    expect(next.ok, next.message).toBe(true);
    expect(next.actionId).not.toBe(started.actionId);
  }, 30000);
  it('expires pending release before catch-up and restores only explicit neutral controls', async () => {
    const f = await setup(),
      scope = f.service.inputScope(f.service.localScope);
    const started = await f.send('begin', begin(scope, f.itemId));
    expect(started.ok, started.message).toBe(true);
    await f.send('release', {
      type: 'release-strike',
      expectedActionId: started.actionId,
      execution: {
        operation: 'release',
        ...identity(scope),
        beginCommandId: 'begin',
        input: { kind: 'timed-release', phase: 0.25 },
      },
    });
    await f.advance(500);
    const action = entityGet(f.service.world.entities, PLAYER_ID)?.actor?.action;
    expect(action?.id).toBe(started.actionId);
    expect(action?.attackExecution?.ready).toBe(true);
    expect(action?.attackExecution?.pendingRelease).toBeDefined();
    const current = f.service.inputScope(f.service.localScope);
    expect(current.attackInputToken).not.toBe(scope.attackInputToken);
    expect(current.revision).toBeGreaterThan(scope.revision);
    expect(
      (
        await f.service.updateWorldInput(
          {
            kind: 'renew',
            inputEpoch: scope.inputEpoch,
            renewalSequence: 99,
            pendingRelease: {
              attackInputToken: scope.attackInputToken,
              gestureSequence: 1,
              beginCommandId: 'begin',
              actionId: started.actionId!,
            },
          },
          f.service.localScope,
        )
      ).releaseAccepted,
    ).toBe(false);
    const view = await projectView(f.service);
    expect(
      view.player.action?.controls?.some(
        (control) => control.command.type === 'release-strike' && !control.command.execution,
      ),
    ).toBe(true);
    const neutral = await f.send('recover', {
      type: 'release-strike',
      expectedActionId: started.actionId,
    });
    expect(neutral.ok, neutral.message).toBe(true);
  }, 30000);
  it('preserves a frozen lethal review across deliberate confirmation and exact cancellation races', async () => {
    const f = await setup();
    await editWorld(f.service, (world) => {
      entityGet(world.entities, NPC_ID)!.actor!.health = 1;
    });
    const scope = f.service.inputScope(f.service.localScope),
      input = begin(scope, f.itemId);
    const proposed = await f.send('review-begin', input);
    expect(proposed.code, proposed.message).toBe('lethal-review-required');
    expect(proposed.lethalReview).toBeDefined();
    expect(proposed.lethalReview!.confirmLabel).toBe('Prepare attack');
    expect(entityGet(f.service.world.entities, PLAYER_ID)?.actor?.action).toBeFalsy();
    const confirmed = await f.send('confirm', {
      ...input,
      lethalReviewId: proposed.lethalReview!.id,
      execution: { operation: 'confirm-review', ...identity(scope, 2) },
    });
    expect(confirmed.ok, confirmed.message).toBe(true);
    expect(confirmed.execution?.releaseRequested).toBe(false);
    const declined = await f.send('late-decline', {
      type: 'cancel',
      expectedActionId: confirmed.actionId,
      lethalReviewId: proposed.lethalReview!.id,
    });
    expect(declined.ok, declined.message).toBe(true);
    expect(entityGet(f.service.world.entities, PLAYER_ID)?.actor?.action).toBeFalsy();
    expect(
      (
        await f.send('confirm-again', {
          ...input,
          lethalReviewId: proposed.lethalReview!.id,
          execution: { operation: 'confirm-review', ...identity(scope, 3) },
        })
      ).ok,
    ).toBe(false);
  }, 30000);
  it('declines an ordinary review after a held attempt without cancelling unrelated later work', async () => {
    const f = await setup(),
      scope = f.service.inputScope(f.service.localScope);
    const held = await f.send('prior-held', begin(scope, f.itemId));
    expect(held.ok, held.message).toBe(true);
    expect(
      (await f.send('end-prior-held', { type: 'cancel', expectedActionId: held.actionId })).ok,
    ).toBe(true);
    await editWorld(f.service, (world) => {
      entityGet(world.entities, NPC_ID)!.actor!.health = 1;
    });
    const ordinary: CommandInput = {
      type: 'strike',
      definitionId: 'spear',
      itemId: f.itemId,
      targetId: NPC_ID,
    };
    const proposed = await f.send('ordinary-review', ordinary);
    expect(proposed.lethalReview, proposed.message).toBeDefined();
    const position = worldPosition(entityGet(f.service.world.entities, PLAYER_ID)!);
    const move = await f.send('unrelated-walk', {
      type: 'move',
      position: {
        ...position,
        x: position.x - 1,
        surfaceId: worldSupport(entityGet(f.service.world.entities, PLAYER_ID)!)!,
      },
    });
    expect(move.ok, move.message).toBe(true);
    const laterAction = entityGet(f.service.world.entities, PLAYER_ID)!.actor!.action!.id;
    const declined = await f.send('decline-ordinary', {
      type: 'cancel',
      lethalReviewId: proposed.lethalReview!.id,
    });
    expect(declined.code, declined.message).toBe('cancelled');
    expect(entityGet(f.service.world.entities, PLAYER_ID)!.actor!.action!.id).toBe(laterAction);
    expect(
      (
        await f.send('late-ordinary-confirm', {
          ...ordinary,
          lethalReviewId: proposed.lethalReview!.id,
        })
      ).code,
    ).toBe('lethal-review-stale');
  }, 30000);
  it('declines an ordinary release review using its exact native aim identity', async () => {
    const ranged = rangedFixture(),
      f = await setup(ranged.world);
    expect(
      (await f.send('equip-ordinary-ranged', { type: 'equip', itemId: ranged.toolId })).ok,
    ).toBe(true);
    const started = await f.send('ordinary-aim', { type: 'aim', targetId: NPC_ID });
    expect(started.ok, started.message).toBe(true);
    const aimId = entityGet(f.service.world.entities, PLAYER_ID)!.actor!.action!.id;
    await f.advance(500);
    expect(entityGet(f.service.world.entities, PLAYER_ID)!.actor!.action?.ranged?.ready).toBe(true);
    const missing = await f.send('ordinary-missing-release-target', {
      type: 'release-shot',
      aimId,
      targetId: 'missing-aim-subject',
    });
    expect(missing.ok).toBe(false);
    expect(entityGet(f.service.world.entities, PLAYER_ID)!.actor!.action?.id).toBe(aimId);
    await editWorld(f.service, (world) => {
      entityGet(world.entities, NPC_ID)!.actor!.health = 1;
    });
    const release: CommandInput = { type: 'release-shot', aimId };
    const proposed = await f.send('ordinary-release-review', release);
    expect(proposed.lethalReview, proposed.message).toBeDefined();
    expect(
      (
        await f.send('decline-wrong-aim', {
          type: 'cancel',
          expectedActionId: 'unrelated-aim',
          lethalReviewId: proposed.lethalReview!.id,
        })
      ).code,
    ).toBe('lethal-review-stale');
    expect(entityGet(f.service.world.entities, PLAYER_ID)!.actor!.action!.id).toBe(aimId);
    const declined = await f.send('decline-exact-aim', {
      type: 'cancel',
      expectedActionId: aimId,
      lethalReviewId: proposed.lethalReview!.id,
    });
    expect(declined.ok, declined.message).toBe(true);
    expect(entityGet(f.service.world.entities, PLAYER_ID)!.actor!.action).toBeNull();
    expect(
      (
        await f.send('late-ordinary-release-confirm', {
          ...release,
          lethalReviewId: proposed.lethalReview!.id,
        })
      ).code,
    ).toBe('lethal-review-stale');
    expect(
      f.service.world.events.some(
        (event) => event.type === 'shot-released' && event.actorId === PLAYER_ID,
      ),
    ).toBe(false);
  }, 30000);
  it('moves only in a credited live input interval, with cheap renewal and immediate lane-specific stop', async () => {
    const f = await setup(),
      scope = f.service.inputScope(f.service.localScope),
      from = { ...worldPosition(entityGet(f.service.world.entities, PLAYER_ID)!) };
    const commit = vi.spyOn(f.service.store, 'commit');
    commit.mockClear();
    expect(
      (
        await f.service.updateWorldInput(
          { kind: 'steer', ...scope, movementSequence: 1, direction: { x: 1, z: 0 } },
          f.service.localScope,
        )
      ).ok,
    ).toBe(true);
    for (let i = 1; i <= 4; i++)
      expect(
        (
          await f.service.updateWorldInput(
            {
              kind: 'renew',
              inputEpoch: scope.inputEpoch,
              renewalSequence: i,
              movement: { movementInputToken: scope.movementInputToken, movementSequence: 1 },
            },
            f.service.localScope,
          )
        ).ok,
      ).toBe(true);
    expect(commit).not.toHaveBeenCalled();
    expect(worldPosition(entityGet(f.service.world.entities, PLAYER_ID)!)).toEqual(from);
    await f.advance(100);
    const moved = { ...worldPosition(entityGet(f.service.world.entities, PLAYER_ID)!) };
    expect(moved.x).toBeGreaterThan(from.x);
    await f.service.updateWorldInput(
      { kind: 'steer', ...scope, movementSequence: 2, direction: { x: 0, z: 0 } },
      f.service.localScope,
    );
    await f.advance(100);
    expect(worldPosition(entityGet(f.service.world.entities, PLAYER_ID)!)).toEqual(moved);
  }, 30000);
  it('discards a whole computed candidate when its input expires before acceptance and retains its clock debt', async () => {
    const f = await setup(),
      scope = f.service.inputScope(f.service.localScope);
    await f.service.updateWorldInput(
      { kind: 'steer', ...scope, movementSequence: 1, direction: { x: 0, z: 1 } },
      f.service.localScope,
    );
    const before = f.service.world;
    const owner = Reflect.get(
      f.service,
      'worldInputs',
    ) as import('./world-input.js').WorldInputOwner;
    const authorized = owner.authorized.bind(owner);
    vi.spyOn(owner, 'authorized').mockImplementation((inputs) => {
      f.setNow(f.now() + 300);
      return authorized(inputs, f.now());
    });
    f.setNow(f.now() + 100);
    await f.service.tick(0.1, 0, { offeredUntil: f.now(), drain: false });
    expect(f.service.world).toBe(before);
    expect(f.service.storageError).toBeNull();
    await f.service.tick(0, 0);
    expect(f.service.world.simTime).toBeCloseTo(before.simTime + 6, 8);
    expect(worldPosition(entityGet(f.service.world.entities, PLAYER_ID)!)).toEqual(
      worldPosition(entityGet(before.entities, PLAYER_ID)!),
    );
  }, 30000);
  it('recovers an exact review response and keeps declining it terminal before confirmation', async () => {
    const f = await setup();
    await editWorld(f.service, (world) => {
      entityGet(world.entities, NPC_ID)!.actor!.health = 1;
    });
    const scope = f.service.inputScope(f.service.localScope),
      input = begin(scope, f.itemId);
    const proposed = await f.send('proposal', input);
    expect(proposed.lethalReview).toBeDefined();
    expect(await f.send('proposal', input)).toEqual(proposed);
    const declined = await f.send('decline', {
      type: 'cancel',
      lethalReviewId: proposed.lethalReview!.id,
    });
    expect(declined.ok, declined.message).toBe(true);
    expect(
      (
        await f.send('confirm', {
          ...input,
          lethalReviewId: proposed.lethalReview!.id,
          execution: { operation: 'confirm-review', ...identity(scope, 2) },
        })
      ).ok,
    ).toBe(false);
    expect(entityGet(f.service.world.entities, PLAYER_ID)?.actor?.action).toBeFalsy();
  }, 30000);
  it('reviews a frozen release sample and cannot substitute another point or sample on confirmation', async () => {
    const f = await setup(),
      scope = f.service.inputScope(f.service.localScope);
    const started = await f.send('begin', begin(scope, f.itemId));
    expect(started.ok, started.message).toBe(true);
    await editWorld(f.service, (world) => {
      entityGet(world.entities, NPC_ID)!.actor!.health = 1;
    });
    const release: CommandInput = {
      type: 'release-strike',
      expectedActionId: started.actionId,
      execution: {
        operation: 'release',
        ...identity(scope),
        beginCommandId: 'begin',
        input: { kind: 'timed-release', phase: 0.25 },
      },
    };
    const proposed = await f.send('release', release);
    expect(proposed.lethalReview, proposed.message).toBeDefined();
    const confirmed = await f.send('confirm-release', {
      type: 'release-strike',
      expectedActionId: started.actionId,
      lethalReviewId: proposed.lethalReview!.id,
      execution: { operation: 'confirm-review', ...identity(scope, 2) },
    });
    expect(confirmed.ok, confirmed.message).toBe(true);
    expect(confirmed.execution?.assessment?.score).toBe(1);
    expect(confirmed.execution?.assessment?.mode).toBe('manual');
    expect(
      entityGet(f.service.world.entities, PLAYER_ID)?.actor?.action?.attackExecution?.pendingRelease
        ?.input,
    ).toEqual(release.execution?.operation === 'release' ? release.execution.input : undefined);
  }, 30000);
  it('rejects fabricated evidence, effects, malformed phase and unrelated command fields at the wire boundary', () => {
    const control = {
      operation: 'release',
      inputEpoch: 'e',
      attackInputToken: 't',
      gestureSequence: 1,
      beginCommandId: 'b',
      input: { kind: 'timed-release', phase: 0.25 },
    };
    expect(
      commandInputSchema.safeParse({
        type: 'release-strike',
        expectedActionId: 'a',
        execution: control,
      }).success,
    ).toBe(true);
    for (const changed of [
      { ...control, input: { ...control.input, score: 1 } },
      { ...control, input: { ...control.input, phase: 1 } },
      { ...control, input: { ...control.input, phase: NaN } },
    ])
      expect(
        commandInputSchema.safeParse({
          type: 'release-strike',
          expectedActionId: 'a',
          execution: changed,
        }).success,
      ).toBe(false);
    expect(
      commandInputSchema.safeParse({
        type: 'release-strike',
        expectedActionId: 'a',
        quantity: 100,
        execution: control,
      }).success,
    ).toBe(false);
    expect(
      commandInputSchema.safeParse({
        type: 'release-strike',
        expectedActionId: 'a',
        aimId: 'another-action',
        execution: control,
      }).success,
    ).toBe(false);
    expect(
      worldInputSchema.safeParse({
        kind: 'steer',
        inputEpoch: 'e',
        movementInputToken: 't',
        movementSequence: 1,
        direction: { x: 3, z: 0 },
      }).success,
    ).toBe(false);
  });
  it('accounts pre-input elapsed time once and gives fresh steering no authority over that old debt', async () => {
    const f = await setup(),
      scope = f.service.inputScope(f.service.localScope),
      before = f.service.world.simTime;
    const position = { ...worldPosition(entityGet(f.service.world.entities, PLAYER_ID)!) };
    f.setNow(f.now() + 100);
    expect(
      (
        await f.service.updateWorldInput(
          {
            kind: 'steer',
            inputEpoch: scope.inputEpoch,
            movementInputToken: scope.movementInputToken,
            movementSequence: 1,
            direction: { x: 0, z: 1 },
          },
          f.service.localScope,
        )
      ).ok,
    ).toBe(true);
    await f.service.tick(0.1, 0, { offeredUntil: f.now() });
    expect(f.service.world.simTime).toBeCloseTo(before + 6, 8);
    expect(worldPosition(entityGet(f.service.world.entities, PLAYER_ID)!)).toEqual(position);
    await f.advance(100);
    expect(f.service.world.simTime).toBeCloseTo(before + 12, 8);
    expect(worldPosition(entityGet(f.service.world.entities, PLAYER_ID)!)).not.toEqual(position);
  }, 30000);
  it('retains real pending-navigation debt without lending it to fresh or expired input windows', async () => {
    await initializeNavigationRuntime();
    const f = await setup();
    let walkerId = '';
    await editWorld(f.service, (world) => {
      walkerId = entityValues(world.entities).find(
        (entity) =>
          entity.actor?.body?.plan === 'biped' && entity.id !== PLAYER_ID && entity.id !== NPC_ID,
      )!.id;
      for (const entity of entityValues(world.entities))
        if (
          entity.actor &&
          entity.id !== PLAYER_ID &&
          entity.id !== NPC_ID &&
          entity.id !== walkerId
        ) {
          entity.actor.incapacitated = true;
          entity.actor.action = null;
          entity.actor.agency.plan = null;
        }
    });
    const queueRoute = async (id: string) => {
      await editWorld(f.service, (world) => {
        const walker = entityGet(world.entities, walkerId)!;
        walker.actor!.action = null;
        walker.actor!.agency.plan = null;
        setSpatialPosition(world, walker, { x: 15, y: 0, z: 7 }, 'terrain');
      });
      const result = await f.service.transition((world) =>
        executeCommand(world, {
          id,
          actorId: walkerId,
          type: 'move',
          destination: { x: 20, y: 0, z: 7, surfaceId: 'terrain' },
        }),
      );
      expect(result.ok, result.message).toBe(true);
      expect(
        entityGet(f.service.world.entities, walkerId)!.actor!.action?.navigation,
      ).toBeDefined();
      expect(navigationBlocked(f.service.world)).toBe(true);
    };
    const publishRoute = async () => {
      const map = spatialMap(f.service.world),
        action = entityGet(f.service.world.entities, walkerId)!.actor!.action!,
        request = action.navigation!.request;
      const planner = new RecastPlanner(map);
      try {
        const result = planner.route(request);
        expect(result.status).toBe('reached');
        await f.service.preparedNavigationBatch(
          [{ kind: 'action', actorId: walkerId, actionId: action.id, request, result }],
          map,
          f.service.timelineId,
        );
      } finally {
        planner.destroy();
      }
      expect(navigationBlocked(f.service.world)).toBe(false);
    };
    await queueRoute('input-debt-route-1');
    const before = f.service.world.simTime,
      position = { ...worldPosition(entityGet(f.service.world.entities, PLAYER_ID)!) };
    await f.advance(400);
    expect(f.service.world.simTime).toBe(before);
    const scope = f.service.inputScope(f.service.localScope),
      started = await f.send('navigation-begin', begin(scope, f.itemId));
    expect(started.ok, started.message).toBe(true);
    const requested = await f.send('navigation-release', {
      type: 'release-strike',
      expectedActionId: started.actionId,
      execution: {
        operation: 'release',
        ...identity(scope),
        beginCommandId: 'navigation-begin',
        input: { kind: 'timed-release', phase: 0.25 },
      },
    });
    expect(requested.execution?.releaseRequested).toBe(true);
    const steer = (sequence: number, x: number, z: number) =>
      f.service.updateWorldInput(
        { kind: 'steer', ...scope, movementSequence: sequence, direction: { x, z } },
        f.service.localScope,
      );
    expect((await steer(1, 0, 1)).ok).toBe(true);
    const renew = (sequence: number, movement = true) =>
      f.service.updateWorldInput(
        {
          kind: 'renew',
          inputEpoch: scope.inputEpoch,
          renewalSequence: sequence,
          ...(movement
            ? { movement: { movementInputToken: scope.movementInputToken, movementSequence: 1 } }
            : {}),
          pendingRelease: {
            attackInputToken: scope.attackInputToken,
            gestureSequence: 1,
            beginCommandId: 'navigation-begin',
            actionId: started.actionId!,
          },
        },
        f.service.localScope,
      );
    expect((await renew(1)).releaseAccepted).toBe(true);
    await publishRoute();
    await f.service.tick(0, 0, { offeredUntil: f.now() });
    expect(f.service.world.simTime).toBeCloseTo(before + 24, 8);
    expect(worldPosition(entityGet(f.service.world.entities, PLAYER_ID)!)).toEqual(position);
    expect(
      entityGet(f.service.world.entities, PLAYER_ID)!.actor!.action?.attackExecution
        ?.pendingRelease,
    ).toBeDefined();
    expect(
      f.service.world.events.some(
        (event) => event.type === 'struck' && event.actorId === PLAYER_ID,
      ),
    ).toBe(false);

    await queueRoute('input-debt-route-2');
    await f.advance(100);
    expect(f.service.world.simTime).toBeCloseTo(before + 24, 8);
    expect((await renew(2)).releaseAccepted).toBe(true);
    expect((await steer(2, 0, -1)).ok).toBe(true);
    f.setNow(f.now() + 100);
    expect((await f.service.control({ speed: 3 })).ok).toBe(true);
    expect((await renew(3, false)).releaseAccepted).toBe(true);
    f.setNow(f.now() + 300);
    await publishRoute();
    await f.service.tick(0.3, 0, { offeredUntil: f.now() });
    expect(f.service.world.simTime).toBeCloseTo(before + 90, 8);
    expect(worldPosition(entityGet(f.service.world.entities, PLAYER_ID)!)).toEqual(position);
    expect(
      f.service.world.events.some(
        (event) => event.type === 'struck' && event.actorId === PLAYER_ID,
      ),
    ).toBe(false);
    expect((await steer(999, 1, 0)).ok).toBe(false);
    expect((await renew(999)).releaseAccepted).not.toBe(true);
    expect(f.service.storageError).toBeNull();
    expect(
      entityGet(f.service.world.entities, PLAYER_ID)!.actor!.action?.attackExecution?.ready,
    ).toBe(true);
    const recovered = await f.send('navigation-neutral-recovery', {
      type: 'release-strike',
      expectedActionId: started.actionId,
    });
    expect(recovered.ok, recovered.message).toBe(true);
    expect(
      occurrenceFor(f.service.world, PLAYER_ID, started.actionId!)?.attackExecution?.input,
    ).toEqual({ kind: 'ordinary' });
  }, 30000);
  it('lets a distant held weapon prepare without pursuit while deliberate steering uses the same movement owner', async () => {
    const f = await setup();
    await editWorld(f.service, (world) => {
      const player = entityGet(world.entities, PLAYER_ID)!,
        target = entityGet(world.entities, NPC_ID)!,
        point = worldPosition(player);
      setSpatialPosition(
        world,
        target,
        { x: point.x + 8, y: point.y, z: point.z },
        worldSupport(player)!,
      );
    });
    const scope = f.service.inputScope(f.service.localScope),
      position = { ...worldPosition(entityGet(f.service.world.entities, PLAYER_ID)!) };
    const started = await f.send('distant', begin(scope, f.itemId));
    expect(started.ok, started.message).toBe(true);
    await f.advance(100);
    expect(worldPosition(entityGet(f.service.world.entities, PLAYER_ID)!)).toEqual(position);
    await f.service.updateWorldInput(
      {
        kind: 'steer',
        inputEpoch: scope.inputEpoch,
        movementInputToken: scope.movementInputToken,
        movementSequence: 1,
        direction: { x: 1, z: 0 },
      },
      f.service.localScope,
    );
    await f.advance(100);
    expect(worldPosition(entityGet(f.service.world.entities, PLAYER_ID)!).x).toBeGreaterThan(
      position.x,
    );
    expect(entityGet(f.service.world.entities, PLAYER_ID)?.actor?.action?.id).toBe(
      started.actionId,
    );
  }, 30000);
  it('revokes old movement on incompatible native work and both lanes on pause before accepting higher sequence packets', async () => {
    const f = await setup(),
      scope = f.service.inputScope(f.service.localScope);
    await f.service.updateWorldInput(
      {
        kind: 'steer',
        inputEpoch: scope.inputEpoch,
        movementInputToken: scope.movementInputToken,
        movementSequence: 1,
        direction: { x: 0, z: 1 },
      },
      f.service.localScope,
    );
    const actor = entityGet(f.service.world.entities, PLAYER_ID)!,
      point = worldPosition(actor);
    const walk = await f.send('ordinary-walk', {
      type: 'move',
      position: { x: point.x, y: point.y, z: point.z + 8, surfaceId: worldSupport(actor)! },
    });
    expect(walk.ok, walk.message).toBe(true);
    const renewed = await f.service.updateWorldInput(
      {
        kind: 'renew',
        inputEpoch: scope.inputEpoch,
        renewalSequence: 100,
        movement: { movementInputToken: scope.movementInputToken, movementSequence: 1 },
      },
      f.service.localScope,
    );
    expect(renewed.movementAccepted).toBe(false);
    expect(renewed.inputScope.movementInputToken).not.toBe(scope.movementInputToken);
    expect(renewed.inputScope.attackInputToken).toBe(scope.attackInputToken);
    await f.service.control({ paused: true });
    await f.service.control({ paused: false });
    const fresh = f.service.inputScope(f.service.localScope);
    expect(fresh.inputEpoch).not.toBe(scope.inputEpoch);
    expect((await f.send('obsolete', begin(scope, f.itemId, 999))).code).toBe('input-stale');
  }, 30000);
  it('binds a displayed ranged body at the actual wire boundary and reports release after its action ends', async () => {
    const ranged = rangedFixture(),
      f = await setup(ranged.world);
    expect((await f.send('equip-ranged', { type: 'equip', itemId: ranged.toolId })).ok).toBe(true);
    const view = await projectView(f.service),
      target = observedTarget(f.service, view);
    const point = worldPosition(entityGet(f.service.world.entities, NPC_ID)!);
    const aimPoint = { x: point.x, y: point.y + 0.85, z: point.z },
      scope = f.service.inputScope(f.service.localScope);
    const started = await f.send(
      'ranged-begin',
      {
        ...view.player.attackSource!.command,
        targetId: target.id,
        bodyReference: target.bodyReference,
        aimPoint,
        aimBasis: { bodyReference: target.bodyReference },
        execution: { operation: 'begin', ...identity(scope) },
      },
      true,
    );
    expect(started.ok, started.message).toBe(true);
    const requested = await f.send(
      'ranged-release',
      {
        type: 'release-shot',
        aimId: started.actionId,
        targetId: target.id,
        aimPoint,
        aimBasis: { bodyReference: target.bodyReference },
        execution: {
          operation: 'release',
          ...identity(scope),
          beginCommandId: 'ranged-begin',
          input: { kind: 'ordinary' },
        },
      },
      true,
    );
    expect(requested.ok, requested.message).toBe(true);
    for (let step = 1; step <= 4; step++) {
      await f.advance(100);
      if (entityGet(f.service.world.entities, PLAYER_ID)?.actor?.action?.id !== started.actionId)
        break;
      await f.service.updateWorldInput(
        {
          kind: 'renew',
          inputEpoch: scope.inputEpoch,
          renewalSequence: step,
          pendingRelease: {
            attackInputToken: scope.attackInputToken,
            gestureSequence: 1,
            beginCommandId: 'ranged-begin',
            actionId: started.actionId!,
          },
        },
        f.service.localScope,
      );
    }
    expect(entityGet(f.service.world.entities, PLAYER_ID)?.actor?.action?.id).not.toBe(
      started.actionId,
    );
    expect(
      (await f.send('late-ranged-cancel', { type: 'cancel', expectedActionId: started.actionId }))
        .code,
    ).toBe('released');
  }, 30000);
  it('does not revive a transient lethal choice after pause even with fresh input authority', async () => {
    const f = await setup();
    await editWorld(f.service, (world) => {
      entityGet(world.entities, NPC_ID)!.actor!.health = 1;
    });
    const scope = f.service.inputScope(f.service.localScope),
      input = begin(scope, f.itemId);
    const proposed = await f.send('paused-proposal', input);
    expect(proposed.lethalReview).toBeDefined();
    await f.service.control({ paused: true });
    await f.service.control({ paused: false });
    const fresh = f.service.inputScope(f.service.localScope);
    expect(
      (
        await f.send('after-pause', {
          ...input,
          lethalReviewId: proposed.lethalReview!.id,
          execution: { operation: 'confirm-review', ...identity(fresh, 1) },
        })
      ).code,
    ).toBe('lethal-review-stale');
    expect(await f.send('paused-proposal', input)).toEqual(proposed);
  }, 30000);
  it('reviews the original and redirected human together while preserving the selected target and sample', async () => {
    const ranged = rangedFixture(),
      f = await setup(ranged.world);
    let redirectedId = '';
    await editWorld(f.service, (world) => {
      const player = entityGet(world.entities, PLAYER_ID)!,
        point = worldPosition(player);
      const redirected = entityValues(world.entities).find(
        (entity) =>
          entity.actor && !entity.animal && entity.id !== PLAYER_ID && entity.id !== NPC_ID,
      )!;
      redirectedId = redirected.id;
      redirected.actor!.health = 1;
      redirected.actor!.incapacitated = false;
      entityGet(world.entities, NPC_ID)!.actor!.health = 1;
      setSpatialPosition(
        world,
        redirected,
        { x: point.x, y: point.y, z: point.z + 2 },
        worldSupport(player)!,
      );
      initializePerception(world, [], [PLAYER_ID]);
    });
    expect((await f.send('redirect-equip', { type: 'equip', itemId: ranged.toolId })).ok).toBe(
      true,
    );
    const view = await projectView(f.service),
      scope = f.service.inputScope(f.service.localScope);
    const original = observedTarget(f.service, view),
      redirected = observedTarget(f.service, view, redirectedId);
    expect(redirected?.bodyReference).toBeTruthy();
    const point = (id: string) => {
      const position = worldPosition(entityGet(f.service.world.entities, id)!);
      return { ...position, y: position.y + 0.85 };
    };
    const input: CommandInput = {
      ...view.player.attackSource!.command,
      targetId: original.id,
      bodyReference: original.bodyReference,
      execution: { operation: 'begin', ...identity(scope) },
    };
    const proposed = await f.send('redirect-begin', input, true);
    expect(proposed.lethalReview, proposed.message).toBeDefined();
    const started = await f.send(
      'redirect-prepare',
      {
        ...input,
        lethalReviewId: proposed.lethalReview!.id,
        execution: { operation: 'confirm-review', ...identity(scope, 2) },
      },
      true,
    );
    expect(started.ok, started.message).toBe(true);
    const aimPoint = point(redirectedId),
      release: CommandInput = {
        type: 'release-shot',
        aimId: started.actionId,
        targetId: redirected.id,
        bodyReference: redirected.bodyReference,
        execution: {
          operation: 'release',
          ...identity(scope, 2),
          beginCommandId: 'redirect-begin',
          input: { kind: 'timed-release', phase: 0.25 },
        },
      };
    const reviewed = await f.send('redirect-release', release, true);
    expect(reviewed.lethalReview, reviewed.message).toBeDefined();
    const changed = await f.send(
      'redirect-changed',
      {
        ...release,
        aimPoint: { ...aimPoint, z: aimPoint.z + 1 },
        lethalReviewId: reviewed.lethalReview!.id,
        execution: { operation: 'confirm-review', ...identity(scope, 3) },
      },
      true,
    );
    expect(changed.ok).toBe(false);
    const confirmed = await f.send(
      'redirect-confirm',
      {
        ...release,
        lethalReviewId: reviewed.lethalReview!.id,
        execution: { operation: 'confirm-review', ...identity(scope, 3) },
      },
      true,
    );
    expect(confirmed.ok, confirmed.message).toBe(true);
    expect(confirmed.execution?.assessment?.score).toBe(1);
    const action = entityGet(f.service.world.entities, PLAYER_ID)!.actor!.action!;
    expect(action.targetId).toBe(NPC_ID);
    expect(action.attackExecution?.pendingRelease?.aimTarget).toEqual({
      id: redirectedId,
      life: 0,
    });
    expect(action.ranged?.aimTarget?.id).toBe(redirectedId);
    expect(action.ranged?.aimPoint).toBeUndefined();
    expect(
      action.attackExecution?.pendingRelease?.lethalPermission?.additionalTargets,
    ).toHaveLength(1);
    expect(action.attackExecution?.pendingRelease?.input).toEqual({
      kind: 'timed-release',
      phase: 0.25,
    });
    for (let step = 1; step <= 4; step++) {
      await f.advance(100);
      if (entityGet(f.service.world.entities, PLAYER_ID)?.actor?.action?.id !== started.actionId)
        break;
      await f.service.updateWorldInput(
        {
          kind: 'renew',
          inputEpoch: scope.inputEpoch,
          renewalSequence: step,
          pendingRelease: {
            attackInputToken: scope.attackInputToken,
            gestureSequence: 3,
            beginCommandId: 'redirect-begin',
            actionId: started.actionId!,
          },
        },
        f.service.localScope,
      );
    }
    const released = f.service.world.events.find(
      (event) => event.type === 'shot-released' && event.data?.['actionId'] === started.actionId,
    );
    expect(released?.targetId).toBe(redirectedId);
    expect(
      occurrenceFor(f.service.world, PLAYER_ID, started.actionId!)!.release?.aimTarget?.id,
    ).toBe(redirectedId);
    validateWorldModules(f.service.world);
  }, 30000);
  it('excludes paused commit time and settles admitted input time at the old speed before changing it', async () => {
    const f = await setup();
    await f.service.control({ paused: true });
    const original = f.service.store.commit.bind(f.service.store);
    const commit = vi.spyOn(f.service.store, 'commit').mockImplementation((...args) => {
      f.setNow(f.now() + 200);
      return original(...args);
    });
    await f.service.control({ paused: false });
    commit.mockRestore();
    const scope = f.service.inputScope(f.service.localScope),
      before = f.service.world.simTime;
    await f.service.updateWorldInput(
      {
        kind: 'steer',
        inputEpoch: scope.inputEpoch,
        movementInputToken: scope.movementInputToken,
        movementSequence: 1,
        direction: { x: 0, z: 0 },
      },
      f.service.localScope,
    );
    f.setNow(f.now() + 100);
    await f.service.control({ speed: 3 });
    f.setNow(f.now() + 100);
    await f.service.tick(0.2, 0, { offeredUntil: f.now() });
    expect(f.service.world.simTime).toBeCloseTo(before + 6 + 18, 8);
  }, 30000);
  it('keeps reviewed agent commands outside live human input authority', async () => {
    const f = await setup(),
      scope = f.service.inputScope(f.service.localScope);
    const result = f.service.reviewedCommandTransition(
      f.service.world,
      'agent',
      begin(scope, f.itemId),
      f.service.localScope,
    );
    expect(result.outcome.code).toBe('input-route');
    expect(result.world).toBe(f.service.world);
    expect(f.service.previewCommand(begin(scope, f.itemId), NPC_ID, false).code).toBe(
      'input-route',
    );
  }, 30000);
});
