import { currentContactReference } from './public-contact-references.js';
import type { GameView } from '@open-legend/protocol';
import { afterEach, expect, it } from 'vitest';
import {
  bodyProfile,
  currentBodyGrant,
  initializePerception,
  effectiveBodyProfile,
  entityGet,
  PLAYER_ID,
  NPC_ID,
  rangedPolicy,
  seesEntity,
  setSpatialPosition,
  spatialShapeChanged,
  worldPosition,
  worldSupport,
  type WorldState,
} from '@open-legend/domain';
import { definitionPin } from '../../../packages/domain/src/world-modules.js';
import { draftWorld, finishWorld } from '../../../packages/domain/src/draft.js';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import { enterLocalWorld } from '../../../tests/fixtures/service.js';
import { readConfig, testRepository } from '../../../tests/fixtures/database.js';
import { WorldService } from './world-service.js';
import { projectView } from './view.js';
import type { SqlGameRepository } from './store.js';
const owned: Array<{ service: WorldService; store: SqlGameRepository }> = [];
afterEach(async () => {
  for (const { service, store } of owned.splice(0)) {
    await service.settleBackgroundSaves();
    service.releaseHostWork();
    await store.close();
  }
});
async function start(withWall = false, heightFactor?: number | null) {
  const world = stockedCamp(),
    player = entityGet(world.entities, PLAYER_ID)!,
    target = entityGet(world.entities, NPC_ID)!,
    p = worldPosition(player);
  player.spatial.heading = Math.PI / 2;
  setSpatialPosition(world, target, { ...p, x: p.x + 2 }, worldSupport(player));
  if (heightFactor !== undefined) {
    const policy = { ...rangedPolicy(world)! };
    if (heightFactor === null) delete policy.localAvoidance;
    else policy.localAvoidance = { ...policy.localAvoidance!, heightFactor };
    world.moduleManifest = {
      ...world.moduleManifest,
      revision: world.moduleManifest.revision + 1,
      rangedPolicy: policy,
      rangedPolicyPin: definitionPin(policy),
    };
  }
  if (withWall) {
    world.map.spatial.blockers.push({
      id: 'fixture:low-screen',
      bounds: {
        min: { x: p.x + 0.9, y: p.y, z: p.z - 0.8 },
        max: { x: p.x + 1.1, y: p.y + 1.4, z: p.z + 0.8 },
      },
      movement: true,
      sight: true,
      acousticTransmission: 1,
      material: 'wood',
    });
    world.map.spatial.revision++;
  }
  const store = await testRepository(undefined, world);
  const service = new WorldService(store, readConfig({}));
  owned.push({ service, store });
  await enterLocalWorld(service);
  await service.setPresence('visible-shape-fixture', true);
  return service;
}
async function pose(service: WorldService, id: string, duck: boolean) {
  const result = await service.transition((original) => {
    const world = draftWorld(original),
      entity = entityGet(world.entities, id)!;
    if (duck) {
      const policy = rangedPolicy(world)!;
      entity.spatial.localPose = {
        kind: 'duck',
        profile: definitionPin(policy),
        physicalLife: entity.actor!.physicalLife ?? 0,
        startedAt: world.simTime,
        restoreAt: world.simTime + policy.localAvoidance!.holdSeconds,
        phase: 'holding',
      };
      entity.spatial.localAvoidanceReadyAt = world.simTime + policy.localAvoidance!.cooldownSeconds;
    } else delete entity.spatial.localPose;
    spatialShapeChanged(world, entity);
    initializePerception(world, []);
    return {
      world: finishWorld(world),
      events: [],
      outcome: { ok: true, code: 'fixture', message: 'Fixture posture' },
    };
  });
  expect(result.ok, result.message).toBe(true);
}
function observed(service: WorldService, view: GameView, id: string) {
  if (!currentBodyGrant(service.world, PLAYER_ID, id)) return undefined;
  const reference = currentContactReference(
    service.world,
    service.localScope,
    entityGet(service.world.entities, id)!,
  );
  return view.entities.find((entity) => entity.id === reference);
}
it.each([0.35, 0.6])(
  'projects installed height factor %s for player and observed bodies without leaking saved posture state',
  async (heightFactor) => {
    const service = await start(false, heightFactor),
      before = await projectView(service, 'test-fixture');
    const initial = observed(service, before, NPC_ID)!;
    expect(initial.bodySize).toBeDefined();
    await pose(service, NPC_ID, true);
    await pose(service, PLAYER_ID, true);
    const after = await projectView(service, 'test-fixture');
    for (const [id, projected] of [
      [NPC_ID, observed(service, after, NPC_ID)!],
      [PLAYER_ID, after.player],
    ] as const) {
      const entity = entityGet(service.world.entities, id)!,
        actual = effectiveBodyProfile(service.world, entity);
      expect(projected.bodySize).toEqual({ width: actual.radius * 2, height: actual.height });
      expect(actual.height).toBeLessThan(bodyProfile(entity).height);
      expect(rangedPolicy(service.world)!.localAvoidance!.heightFactor).toBe(heightFactor);
      expect(projected).not.toHaveProperty('localPose');
      expect(projected).not.toHaveProperty('spatial');
      expect(projected.bodySize).toEqual({ width: initial.bodySize!.width, height: actual.height });
    }
    expect(observed(service, await projectView(service, 'test-fixture'), NPC_ID)!.bodySize).toBe(
      observed(service, after, NPC_ID)!.bodySize,
    );
    await pose(service, PLAYER_ID, false);
    await pose(service, NPC_ID, false);
    const restored = await projectView(service, 'test-fixture');
    expect(restored.player.bodySize).toEqual(before.player.bodySize);
    expect(observed(service, restored, NPC_ID)!.bodySize).toEqual(initial.bodySize);
  },
);
it('projects ordinary public extents when the installed world omits local avoidance', async () => {
  const service = await start(false, null),
    view = await projectView(service, 'test-fixture');
  expect(rangedPolicy(service.world)?.localAvoidance).toBeUndefined();
  for (const [id, projected] of [
    [PLAYER_ID, view.player],
    [NPC_ID, observed(service, view, NPC_ID)!],
  ] as const) {
    const entity = entityGet(service.world.entities, id)!,
      ordinary = bodyProfile(entity);
    expect(effectiveBodyProfile(service.world, entity)).toEqual(ordinary);
    expect(projected.bodySize).toEqual({ width: ordinary.radius * 2, height: ordinary.height });
    expect(projected).not.toHaveProperty('localPose');
    expect(projected).not.toHaveProperty('spatial');
  }
});
it('invalidates visible membership for both changed target height and changed observer eye height', async () => {
  const service = await start(true),
    before = await projectView(service, 'test-fixture');
  expect(!!observed(service, before, NPC_ID)).toBe(true);
  const map = service.world.map,
    manifest = service.world.moduleManifest;
  await pose(service, NPC_ID, true);
  expect(service.world.map).toBe(map);
  expect(service.world.moduleManifest).toBe(manifest);
  expect(
    seesEntity(
      service.world,
      entityGet(service.world.entities, PLAYER_ID)!,
      entityGet(service.world.entities, NPC_ID)!,
    ),
  ).toBe(false);
  expect(!!observed(service, await projectView(service, 'test-fixture'), NPC_ID)).toBe(false);
  await pose(service, NPC_ID, false);
  expect(!!observed(service, await projectView(service, 'test-fixture'), NPC_ID)).toBe(true);
  await pose(service, PLAYER_ID, true);
  expect(
    seesEntity(
      service.world,
      entityGet(service.world.entities, PLAYER_ID)!,
      entityGet(service.world.entities, NPC_ID)!,
    ),
  ).toBe(false);
  expect(!!observed(service, await projectView(service, 'test-fixture'), NPC_ID)).toBe(false);
});
