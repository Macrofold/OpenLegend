import { test, expect, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { createGameServer } from '../../apps/server/src/http.js';
import { fixture } from '../fixtures/combat-execution.js';
import { testRepository, closeTestDatabases, readConfig } from '../fixtures/database.js';
import { enterGame, blockExternalBrowserRequests } from '../fixtures/browser.js';
import {
  bodyProfile,
  baseWorldInitialConstructionSeeds,
  createWorld,
  createItemLot,
  effectiveBodyProfile,
  executeCommand,
  advanceWorld,
  entityGet,
  PLAYER_ID,
  NPC_ID,
  rangedPolicy,
  setSpatialPosition,
  spatialShapeChanged,
  worldPosition,
  worldSupport,
  type ConstructionPermission,
  type WorldState,
} from '@open-legend/domain';
import { definitionPin } from '../../packages/domain/src/world-modules.js';
import { bodyCenter, interactionAnchor } from '../../packages/domain/src/spatial.js';
import { draftWorld } from '../../packages/domain/src/draft.js';
import { finish, outcome } from '../../packages/domain/src/events.js';
import { rayHits, type WorldPoint } from '@open-legend/spatial';
import { initialCamera } from '../../apps/client/src/world-camera.js';
import type { AiClient } from '../../packages/ai/src/index.js';

type Game = Awaited<ReturnType<typeof createGameServer>>;
type AimCommand = {
  type: string;
  targetId?: string;
  bodyReference?: string;
  aimPoint?: WorldPoint;
  aimBasis?: unknown;
};
function geometryWorld(kind: 'ground' | 'upper' | 'cover' = 'ground') {
  const { world } = fixture(),
    player = entityGet(world.entities, PLAYER_ID)!,
    target = entityGet(world.entities, NPC_ID)!;
  if (kind === 'upper') {
    setSpatialPosition(world, player, { x: 20, y: 3, z: 6 }, 'lookout-deck');
    setSpatialPosition(world, target, { x: 22, y: 3, z: 6 }, 'lookout-deck');
  } else if (kind === 'cover') {
    const p = worldPosition(player);
    setSpatialPosition(world, target, { ...p, z: p.z - 2 }, worldSupport(player));
    world.map.spatial.blockers.push({
      id: 'fixture:low-aim-screen',
      bounds: {
        min: { x: p.x - 0.8, y: p.y, z: p.z - 1.2 },
        max: { x: p.x + 0.8, y: p.y + 1.4, z: p.z - 1.1 },
      },
      movement: true,
      sight: true,
      acousticTransmission: 1,
      material: 'wood',
    });
    world.map.spatial.revision++;
  }
  player.spatial.heading = kind === 'cover' ? Math.PI : Math.PI / 2;
  return world;
}
async function start(
  page: Page,
  world: WorldState,
  options: {
    config?: ReturnType<typeof readConfig>;
    aiClient?: AiClient;
    tick?: boolean;
    constructionPermissions?: readonly ConstructionPermission[];
  } = {},
) {
  const store = await testRepository(undefined, world);
  for (const permission of options.constructionPermissions ?? [])
    await store.authority!.seedConstruction(permission);
  const game = await createGameServer({
    config: options.config ?? readConfig({ AI_BUDGET_USD: '0' }),
    ...(options.aiClient ? { aiClient: options.aiClient } : {}),
    store,
    production: true,
    tick: options.tick ?? false,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw Error('Missing fixture listener');
  await blockExternalBrowserRequests(page);
  await page.goto(`http://127.0.0.1:${address.port}/?profile=1`);
  await enterGame(page);
  await page.getByRole('button', { name: 'Center on player', exact: true }).click();
  await page.getByRole('button', { name: 'Attack mode off', exact: true }).click();
  return game;
}
async function choose(page: Page) {
  await page
    .locator('.ol-attack-controls')
    .getByRole('button', { name: 'In view', exact: true })
    .click();
  await page.locator(`[data-entity="${NPC_ID}"] button`).click();
  await page.getByRole('button', { name: 'Hide In view panel', exact: true }).click();
  await expect(page.locator('.ol-attack-reticle')).toHaveAttribute('data-aim-available', 'true');
}
async function prepare(page: Page, game: Game, pointer = false) {
  const request = page.waitForRequest(
    (request) =>
      request.url().endsWith('/api/command') && request.postDataJSON()?.command?.type === 'aim',
  );
  const reticle = (await page.locator('.ol-attack-reticle').boundingBox())!;
  if (pointer) {
    await page.mouse.move(reticle.x + reticle.width / 2, reticle.y + reticle.height / 2);
    await page.mouse.down();
  } else {
    await page
      .locator('.ol-attack-controls')
      .getByRole('button', { name: 'Prepare', exact: true })
      .click();
  }
  const command = (await request).postDataJSON().command as AimCommand;
  await expect
    .poll(() => entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action?.type, {
      message: await page.locator('.ol-attack-controls').innerText(),
    })
    .toBe('aim');
  const ranged = entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action!.ranged!;
  if (command.aimPoint) expect(ranged.aimPoint).toEqual(command.aimPoint);
  else expect(ranged.aimTarget?.id).toBe(command.targetId);
  return {
    command,
    screen: { x: reticle.x + reticle.width / 2, y: reticle.y + reticle.height / 2 },
  };
}
async function cancel(page: Page, game: Game) {
  await page
    .locator('.ol-attack-controls')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await expect
    .poll(() => entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action)
    .toBeNull();
}
async function pose(game: Game, id: string, duck: boolean) {
  const result = await game.service.transition((original) => {
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
    return finish(world, [], outcome(true, 'fixture-pose', 'Changed fixture posture.'));
  });
  expect(result.ok, result.message).toBe(true);
}

test('current actor and player shape changes retain their visible geometry and physical picker', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const game = await start(page, geometryWorld()),
    errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await choose(page);
    const standing = await prepare(page, game);
    expect(standing.command.aimPoint).toBeUndefined();
    expect(standing.command.bodyReference).toBeTruthy();
    await page.screenshot({ path: info.outputPath('standing-bodies.png') });
    await cancel(page, game);
    await pose(game, NPC_ID, true);
    await choose(page);
    const ducked = await prepare(page, game);
    expect(ducked.command.targetId).toBe(NPC_ID);
    expect(ducked.command.aimPoint).toBeUndefined();
    expect(ducked.screen.y).toBeGreaterThan(standing.screen.y);
    await page.screenshot({ path: info.outputPath('contracted-observed-body.png') });
    await cancel(page, game);
    await pose(game, NPC_ID, false);
    await choose(page);
    const restored = await prepare(page, game);
    expect(restored.screen.y).toBeCloseTo(standing.screen.y, 3);
    await cancel(page, game);

    // A point in the player's standing torso cannot start a self-attack. After
    // contraction the same displayed pixel clears the body and picks the ground.
    const canvas = page.locator('#world'),
      rect = (await canvas.boundingBox())!,
      ordinary = bodyProfile(entityGet(game.service.world.entities, PLAYER_ID)!);
    const upper = {
      x: rect.x + rect.width / 2,
      y:
        rect.y +
        rect.height / 2 -
        (ordinary.height * 0.7 * rect.height) / (initialCamera().zoom * 2),
    };
    await page.mouse.move(upper.x, upper.y);
    await page.mouse.down();
    await page.mouse.up();
    await expect(page.locator('.ol-attack-controls')).toContainText(
      'Choose a visible place to aim.',
    );
    await pose(game, PLAYER_ID, true);
    await page.screenshot({ path: info.outputPath('contracted-player-body.png') });
    await page.mouse.move(upper.x + 1, upper.y);
    await page.mouse.move(upper.x, upper.y);
    const picked = page.waitForRequest(
        (request) =>
          request.url().endsWith('/api/command') && request.postDataJSON()?.command?.type === 'aim',
      ),
      refused = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/command') &&
          response.request().postDataJSON()?.command?.type === 'aim',
      );
    await page.mouse.down();
    const command = (await picked).postDataJSON().command as AimCommand;
    expect(command.targetId).not.toBe(PLAYER_ID);
    // The native held posture legitimately refuses incompatible work; picking
    // a newly vacated pixel does not authorize ending that posture early.
    expect(await (await refused).json()).toMatchObject({ ok: false, code: 'posture-held' });
    await expect
      .poll(() => entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action)
      .toBeNull();
    await page.mouse.up();
    await pose(game, PLAYER_ID, false);
    expect(
      effectiveBodyProfile(game.service.world, entityGet(game.service.world.entities, PLAYER_ID)!),
    ).toEqual(ordinary);
    await page.screenshot({ path: info.outputPath('restored-player-body.png') });
    expect(errors).toEqual([]);
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    await page.close();
    await game.close();
  }
});

test('release picks the current body or exact surface across motion and camera angles', async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  const game = await start(page, geometryWorld('upper'));
  const commands: AimCommand[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/command')) commands.push(request.postDataJSON().command);
  });
  const offer = async (seconds: number) => {
    await page.waitForTimeout(seconds * 1000);
    await game.service.tick(seconds, 0, { offeredUntil: performance.now() });
  };
  const flightFor = (actionId: string) =>
    Object.values(game.service.world.projectiles ?? {}).find(
      (flight) => flight.actionId === actionId,
    );
  const expectPointFlight = async (actionId: string, point: WorldPoint) => {
    await expect.poll(() => !!flightFor(actionId)).toBe(true);
    const flight = flightFor(actionId)!,
      from = interactionAnchor(
        game.service.world,
        entityGet(game.service.world.entities, PLAYER_ID)!,
      ),
      delta = { x: point.x - from.x, y: point.y - from.y, z: point.z - from.z },
      length = Math.hypot(delta.x, delta.y, delta.z);
    expect(flight.position).toEqual(from);
    for (const axis of ['x', 'y', 'z'] as const)
      expect(flight.direction[axis]).toBeCloseTo(delta[axis] / length, 8);
  };
  try {
    await choose(page);
    const first = await prepare(page, game);
    expect(first.command.targetId).toBe(NPC_ID);
    expect(first.command.aimPoint).toBeUndefined();
    expect(first.command.aimBasis).toBeUndefined();
    const firstAction = entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action!;
    await offer(0.35);
    const rect = (await page.locator('#world').boundingBox())!;
    const ground = { x: rect.x + rect.width / 2 + 80, y: rect.y + rect.height / 2 + 20 };
    // Prepare selected the person, but this distinct world press chooses its
    // current surface even with no movement between down and up.
    const redirected = page.waitForRequest(
      (request) =>
        request.url().endsWith('/api/command') &&
        request.postDataJSON()?.command?.type === 'release-shot',
    );
    await page.mouse.move(ground.x, ground.y);
    await page.mouse.down();
    await page.mouse.up();
    const groundRelease = (await redirected).postDataJSON().command as AimCommand;
    expect(groundRelease.targetId).toBeUndefined();
    expect(groundRelease.aimPoint).toBeDefined();
    expect(groundRelease.aimPoint!.y).toBeCloseTo(3, 6);
    expect(commands.filter((command) => command.type === 'aim')).toHaveLength(1);
    await expectPointFlight(firstAction.id, groundRelease.aimPoint!);
    await page.screenshot({ path: info.outputPath('prepared-target-fresh-ground-press.png') });
    await offer(0.5);
    for (let i = 0; i < 2; i++)
      await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
    await choose(page);
    const zoomed = await prepare(page, game, true);
    expect(zoomed.command.targetId).toBe(NPC_ID);
    expect(zoomed.command.aimPoint).toBeUndefined();
    await offer(0.35);
    const moved = await game.service.transition((world) => {
      const started = executeCommand(world, {
        id: 'browser-observed-target-motion',
        actorId: NPC_ID,
        type: 'move',
        destination: { x: 22.8, y: 3, z: 6.8, surfaceId: 'lookout-deck' },
      });
      if (!started.outcome.ok) return started;
      // Fix only the fixture's moving interval. Host admission also accounts
      // storage/browser time, which could finish this short walk before release.
      return advanceWorld(started.world, 6);
    });
    expect(moved.ok, moved.message).toBe(true);
    const action = entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action!,
      sample = action.ranged!.observedMotion!;
    expect(sample).toBeDefined();
    expect(sample.to.z).toBeGreaterThan(sample.from.z);
    // The body has moved out from under the stationary pressed pointer. Button-up
    // picks the current surface rather than retaining the original target.
    expect(worldPosition(entityGet(game.service.world.entities, NPC_ID)!).x).toBeGreaterThan(22.4);
    await page.waitForTimeout(200);
    await page.screenshot({ path: info.outputPath('moving-target-stationary-pointer.png') });
    const released = page.waitForRequest(
      (request) =>
        request.url().endsWith('/api/command') &&
        request.postDataJSON()?.command?.type === 'release-shot',
    );
    await page.mouse.up();
    const release = (await released).postDataJSON().command as AimCommand;
    expect(release.targetId).toBeUndefined();
    expect(release.aimPoint).toBeDefined();
    expect(release.aimPoint!.y).toBeCloseTo(3, 6);
    await expectPointFlight(action.id, release.aimPoint!);
    await offer(0.5);

    // A body actually selected at release still uses observed-motion leading.
    await choose(page);
    await prepare(page, game);
    await offer(0.35);
    const movingBack = await game.service.transition((world) => {
      const started = executeCommand(world, {
        id: 'browser-observed-target-return',
        actorId: NPC_ID,
        type: 'move',
        destination: { x: 22, y: 3, z: 6, surfaceId: 'lookout-deck' },
      });
      return started.outcome.ok ? advanceWorld(started.world, 4) : started;
    });
    expect(movingBack.ok, movingBack.message).toBe(true);
    const leadingAction = entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action!;
    expect(leadingAction.ranged!.observedMotion!.to.z).toBeLessThan(
      leadingAction.ranged!.observedMotion!.from.z,
    );
    await choose(page);
    const currentBody = (await page.locator('.ol-attack-reticle').boundingBox())!;
    const bodyRelease = page.waitForRequest(
      (request) =>
        request.url().endsWith('/api/command') &&
        request.postDataJSON()?.command?.type === 'release-shot',
    );
    await page.mouse.click(
      currentBody.x + currentBody.width / 2,
      currentBody.y + currentBody.height / 2,
    );
    const bodyCommand = (await bodyRelease).postDataJSON().command as AimCommand;
    expect(bodyCommand.targetId).toBe(NPC_ID);
    expect(bodyCommand.aimPoint).toBeUndefined();
    await expect.poll(() => !!flightFor(leadingAction.id)).toBe(true);
    const flight = flightFor(leadingAction.id)!,
      target = bodyCenter(game.service.world, entityGet(game.service.world.entities, NPC_ID)!),
      delta = {
        x: target.x - flight.position.x,
        y: target.y - flight.position.y,
        z: target.z - flight.position.z,
      },
      length = Math.hypot(delta.x, delta.y, delta.z);
    // The native projectile leaves the character's anchor with lead beyond the
    // target's current center, using the actually observed returning segment.
    expect(flight.position).toEqual(
      interactionAnchor(game.service.world, entityGet(game.service.world.entities, PLAYER_ID)!),
    );
    expect(flight.direction.z).toBeLessThan(delta.z / length);
    await offer(0.5);

    for (const angle of ['original', 'orbited'] as const) {
      const rect = (await page.locator('#world').boundingBox())!;
      if (angle === 'orbited') {
        await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2 + 90);
        await page.mouse.down({ button: 'right' });
        await page.mouse.move(rect.x + rect.width / 2 - 100, rect.y + rect.height / 2 + 110, {
          steps: 10,
        });
        await page.mouse.up({ button: 'right' });
      }
      const point = { x: rect.x + rect.width / 2 + 100, y: rect.y + rect.height / 2 + 10 };
      const request = page.waitForRequest(
        (request) =>
          request.url().endsWith('/api/command') && request.postDataJSON()?.command?.type === 'aim',
      );
      if (angle === 'orbited')
        await page
          .locator('.ol-attack-controls')
          .getByRole('button', { name: 'Prepare', exact: true })
          .click();
      else {
        await page.mouse.move(point.x, point.y);
        await page.mouse.down();
      }
      const command = (await request).postDataJSON().command as AimCommand;
      expect(command.targetId).toBeUndefined();
      expect(command.aimPoint).toBeDefined();
      expect(command.aimPoint!.y).toBeCloseTo(3, 6);
      await expect
        .poll(() => entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action?.type)
        .toBe('aim');
      const held = entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action!;
      expect(held.ranged!.aimPoint).toEqual(command.aimPoint);
      expect(held.ranged!.aimTarget).toBeUndefined();
      await offer(0.35);
      const releaseRequest = page.waitForRequest(
        (request) =>
          request.url().endsWith('/api/command') &&
          request.postDataJSON()?.command?.type === 'release-shot',
      );
      if (angle === 'orbited')
        await page
          .locator('.ol-attack-controls')
          .getByRole('button', { name: 'Release', exact: true })
          .click();
      else await page.mouse.up();
      const releasedPoint = (await releaseRequest).postDataJSON().command.aimPoint as WorldPoint;
      expect(releasedPoint.y).toBeCloseTo(3, 6);
      if (angle === 'orbited') expect(releasedPoint).not.toEqual(command.aimPoint);
      await expectPointFlight(held.id, releasedPoint);
      await page.screenshot({ path: info.outputPath(`upper-floor-${angle}-point-shot.png`) });
      await offer(0.5);
    }
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    await page.mouse.up().catch(() => {});
    await page.mouse.up({ button: 'right' }).catch(() => {});
    await page.close();
    await game.close();
  }
});

test('a visible target behind low cover is selected while the native shot still meets cover', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const game = await start(page, geometryWorld('cover'));
  const timeline: Array<{
    event: string;
    hostMs: number;
    gameSeconds: number;
    occurrenceAt?: number;
  }> = [];
  const stamp = (event: string, occurrenceAt?: number) =>
    timeline.push({
      event,
      hostMs: performance.now(),
      gameSeconds: game.service.world.simTime,
      ...(occurrenceAt === undefined ? {} : { occurrenceAt }),
    });
  const offer = async (seconds: number) => {
    // The fixture disables automatic host ticks. Offer only an elapsed real
    // window; this is an input-to-effect journey, not frame-rate qualification.
    await page.waitForTimeout(seconds * 1000);
    await game.service.tick(seconds, 0, { offeredUntil: performance.now() });
  };
  page.on('request', (request) => {
    if (request.url().endsWith('/api/command'))
      stamp(`request:${request.postDataJSON()?.command?.type}`);
  });
  await page.route('**/api/command', async (route) => {
    const response = await route.fetch();
    if (route.request().postDataJSON()?.command?.type === 'aim') {
      expect(await response.json()).toMatchObject({ ok: true });
      // This records the completed native admission response before the browser
      // receives it. It is not a timestamp sampled inside the server transaction.
      stamp('server-admission-response-received');
    }
    await route.fulfill({ response });
  });
  try {
    await choose(page);
    await expect(page.locator('.ol-attack-reticle')).toBeVisible();
    stamp('local-reticle-visible');
    const aim = await prepare(page, game),
      source = entityGet(game.service.world.entities, PLAYER_ID)!,
      p = worldPosition(source);
    expect(aim.command.targetId).toBe(NPC_ID);
    expect(aim.command.aimPoint).toBeUndefined();
    const targetPoint = bodyCenter(
      game.service.world,
      entityGet(game.service.world.entities, NPC_ID)!,
    );
    expect(targetPoint.y - p.y).toBeLessThan(1.4);
    const from = {
      ...p,
      y: p.y + effectiveBodyProfile(game.service.world, source).interactionHeight,
    };
    expect(rayHits(game.service.world.map, from, targetPoint, 'movement')[0]?.id).toBe(
      'fixture:low-aim-screen',
    );
    await expect(page.locator('.ol-timing-ring')).toBeVisible();
    stamp('timing-profile-visible');
    await page.screenshot({ path: info.outputPath('visible-target-through-low-cover.png') });
    const action = entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action!,
      actionId = action.id,
      ammunitionId = action.ammoItemId!,
      beforeAmmo = entityGet(game.service.world.entities, ammunitionId)!.item!.quantity,
      beforeHealth = entityGet(game.service.world.entities, NPC_ID)!.actor!.health;
    await offer(0.35);
    await expect
      .poll(
        () =>
          entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action?.attackExecution?.ready,
      )
      .toBe(true);
    await expect(page.locator('.ol-attack-controls')).toContainText('Ready to release.');
    stamp('native-and-visible-ready');
    await page
      .locator('.ol-attack-controls')
      .getByRole('button', { name: 'Release', exact: true })
      .click();
    await expect
      .poll(() =>
        game.service.world.events.some(
          (event) => event.type === 'shot-released' && event.data?.['actionId'] === actionId,
        ),
      )
      .toBe(true);
    const released = game.service.world.events.find(
      (event) => event.type === 'shot-released' && event.data?.['actionId'] === actionId,
    )!;
    stamp('native-shot-released', released.at);
    const flight = Object.values(game.service.world.projectiles ?? {}).find(
      (value) => value.actionId === actionId,
    )!;
    expect(flight).toBeDefined();
    const delta = {
        x: targetPoint.x - from.x,
        y: targetPoint.y - from.y,
        z: targetPoint.z - from.z,
      },
      length = Math.hypot(delta.x, delta.y, delta.z);
    for (const axis of ['x', 'y', 'z'] as const)
      expect(flight.direction[axis]).toBeCloseTo(delta[axis] / length, 8);
    expect(entityGet(game.service.world.entities, ammunitionId)?.item?.quantity ?? 0).toBe(
      beforeAmmo - 1,
    );
    await offer(0.1);
    await expect
      .poll(
        () =>
          game.service.world.events.find(
            (event) => event.type === 'projectile-ended' && event.data?.['actionId'] === actionId,
          )?.data?.['interceptionId'],
      )
      .toBe('fixture:low-aim-screen');
    const stopped = game.service.world.events.find(
      (event) => event.type === 'projectile-ended' && event.data?.['actionId'] === actionId,
    )!;
    stamp('native-first-solid-cover-stop', stopped.at);
    expect(stopped.at).toBeGreaterThan(released.at);
    expect(game.service.world.projectiles?.[flight.id]).toBeUndefined();
    expect(entityGet(game.service.world.entities, NPC_ID)!.actor!.health).toBe(beforeHealth);
    expect(
      game.service.world.events.filter(
        (event) => event.type === 'shot-released' && event.data?.['actionId'] === actionId,
      ),
    ).toHaveLength(1);
    expect(
      game.service.world.events.filter(
        (event) =>
          event.type === 'projectile-contact' && event.data?.['projectileId'] === flight.id,
      ),
    ).toHaveLength(0);
    await page.screenshot({ path: info.outputPath('torso-ray-stopped-by-low-cover.png') });
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    const timelinePath = info.outputPath('ranged-input-to-cover-timeline.json');
    await writeFile(
      timelinePath,
      JSON.stringify(
        {
          host: 'manual ticks with real monotonic offered-until boundaries; automatic host ticking disabled; service also accounts elapsed pre-input debt',
          timeline,
        },
        null,
        2,
      ),
    );
    await info.attach('ranged-input-to-cover-timeline', {
      path: timelinePath,
      contentType: 'application/json',
    });
    await page.close();
    await game.close();
  }
});

test('automatic production host carries visible aiming through a real first-solid cover contact', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  let modelCalls = 0;
  const denyModel = async (): Promise<never> => {
    modelCalls++;
    throw new Error('The automatic native timing fixture cannot execute a model.');
  };
  const game = await start(page, geometryWorld('cover'), {
    tick: true,
    aiClient: { judge: denyModel, generate: denyModel },
  });
  const timeline: Array<{
    event: string;
    hostMs: number;
    gameSeconds: number;
    occurrenceAt?: number;
  }> = [];
  const stamp = (event: string, occurrenceAt?: number) =>
    timeline.push({
      event,
      hostMs: performance.now(),
      gameSeconds: game.service.world.simTime,
      ...(occurrenceAt === undefined ? {} : { occurrenceAt }),
    });
  page.on('request', (request) => {
    if (request.url().endsWith('/api/command'))
      stamp(`request:${request.postDataJSON()?.command?.type}`);
  });
  await page.route('**/api/command', async (route) => {
    const response = await route.fetch();
    if (route.request().postDataJSON()?.command?.type === 'aim') {
      expect(await response.json()).toMatchObject({ ok: true });
      stamp('server-admission-response-received');
    }
    await route.fulfill({ response });
  });
  try {
    await choose(page);
    await expect(page.locator('.ol-attack-reticle')).toBeVisible();
    stamp('local-reticle-visible');
    const aim = await prepare(page, game);
    expect(aim.command.targetId).toBe(NPC_ID);
    const action = entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action!,
      actionId = action.id,
      ammunitionId = action.ammoItemId!,
      beforeAmmo = entityGet(game.service.world.entities, ammunitionId)!.item!.quantity,
      beforeHealth = entityGet(game.service.world.entities, NPC_ID)!.actor!.health;
    await expect(page.locator('.ol-timing-ring')).toBeVisible();
    stamp('timing-profile-visible');
    await expect(page.locator('.ol-attack-controls')).toContainText('Ready to release.');
    expect(
      entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action!.attackExecution?.ready,
    ).toBe(true);
    stamp('native-and-visible-ready');
    await page
      .locator('.ol-attack-controls')
      .getByRole('button', { name: 'Attack normally', exact: true })
      .click();
    await expect
      .poll(() =>
        game.service.world.events.some(
          (event) => event.type === 'projectile-ended' && event.data?.['actionId'] === actionId,
        ),
      )
      .toBe(true);
    const shot = game.service.world.events.find(
      (event) => event.type === 'shot-released' && event.data?.['actionId'] === actionId,
    )!;
    const stopped = game.service.world.events.find(
      (event) => event.type === 'projectile-ended' && event.data?.['actionId'] === actionId,
    )!;
    // Automatic time can finish this short flight before its HTTP response is
    // observed. Occurrence times retain the actual native release/contact order.
    stamp('observed-native-shot-released', shot.at);
    stamp('observed-native-first-solid-cover-stop', stopped.at);
    expect(stopped.data?.['interceptionId']).toBe('fixture:low-aim-screen');
    expect(stopped.at).toBeGreaterThan(shot.at);
    expect(entityGet(game.service.world.entities, ammunitionId)?.item?.quantity ?? 0).toBe(
      beforeAmmo - 1,
    );
    expect(entityGet(game.service.world.entities, NPC_ID)!.actor!.health).toBe(beforeHealth);
    expect(
      game.service.world.events.filter(
        (event) => event.type === 'shot-released' && event.data?.['actionId'] === actionId,
      ),
    ).toHaveLength(1);
    expect(modelCalls).toBe(0);
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
    await page.screenshot({ path: info.outputPath('automatic-cover-contact.png') });
  } finally {
    const path = info.outputPath('automatic-input-to-cover-timeline.json');
    await writeFile(
      path,
      JSON.stringify(
        {
          host: 'actual automatic production host ticks; no manual advance or tick calls',
          limits:
            'Chrome headless SwiftShader, external artwork blocked; task-owned workloads isolated, shared machine; admission timestamp observes the completed server response before browser delivery',
          runtime: await page.evaluate(() => navigator.userAgent).catch(() => 'unavailable'),
          viewport: page.viewportSize(),
          timeline,
        },
        null,
        2,
      ),
    );
    await info.attach('automatic-input-to-cover-timeline', {
      path,
      contentType: 'application/json',
    });
    await page.close();
    await game.close();
  }
});

test('construction placement and nearby native speech keep their owners while attack mode is on', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const world = createWorld();
  const materialId = createItemLot(world, PLAYER_ID, 'stone', 4);
  // The explicit supplied-world repository is already initialized. Install the
  // ordinary starting grant through its authority owner and include the exact
  // material origin of this fixture's actual stones in that permission.
  const constructionPermissions = baseWorldInitialConstructionSeeds(world).map((permission) => ({
    ...permission,
    materialIds: [...entityGet(world.entities, materialId)!.item!.materialOriginIds!],
  }));
  const commands: Array<{ command: { type: string; text?: string; execution?: unknown } }> = [];
  const paid: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/command')) commands.push(request.postDataJSON());
    if (/\/api\/(chat|act|invent|world-agent\/messages)$/.test(request.url()))
      paid.push(request.url());
  });
  // Broadcast speech still checks the application's configured-AI allowance.
  // Literal fixture keys and simulated allowance exercise that actual gate;
  // the injected client forbids external dispatch, and no model call is expected.
  let modelCalls = 0;
  const unexpectedModelCall = async (): Promise<never> => {
    modelCalls++;
    throw new Error('The native speech fixture must not call a model.');
  };
  await page.addInitScript(() => localStorage.setItem('open-legend:ui-scale', '1.3'));
  const game = await start(page, world, {
    constructionPermissions,
    config: readConfig({
      TYPESAFE_API_KEY: 'fixture',
      OPENAI_API_KEY: 'fixture',
      AI_BUDGET_USD: '1',
    }),
    aiClient: { judge: unexpectedModelCall, generate: unexpectedModelCall },
  });
  try {
    await expect(page.locator('.ol-hud')).toHaveCSS('zoom', '1.3');
    const mode = page.getByRole('button', { name: 'Attack mode on', exact: true });
    await expect(mode).toBeVisible();
    await page.getByRole('button', { name: 'Build', exact: true }).click();
    await page.getByRole('combobox', { name: 'Build', exact: true }).click();
    await page.getByRole('option', { name: 'Place a fire', exact: true }).click();
    const choosePlace = page.getByRole('button', { name: 'Choose a place', exact: true });
    await expect(choosePlace).toBeEnabled();
    await choosePlace.click();
    await expect(page.getByRole('button', { name: 'Cancel placement', exact: true })).toBeVisible();
    const canvas = page.locator('#world'),
      rect = (await canvas.boundingBox())!,
      camera = initialCamera(),
      player = worldPosition(entityGet(game.service.world.entities, PLAYER_ID)!),
      // Keep the selected ground outside both panels at the tested 130% UI scale.
      site = { x: player.x + 3, y: player.y, z: player.z },
      scale = rect.height / (camera.zoom * 2),
      pixel = {
        x: rect.x + rect.width / 2 + (site.x - player.x) * scale,
        y: rect.y + rect.height / 2 + (site.z - player.z) * Math.sin(camera.pitch) * scale,
      };
    const placement = page.waitForResponse(
      (response) => {
        if (!response.url().endsWith('/api/construction/hearth-preview')) return false;
        const point = response.request().postDataJSON()?.site;
        return !!point && Math.abs(point.x - site.x) < 0.02 && Math.abs(point.z - site.z) < 0.02;
      },
      { timeout: 10_000 },
    );
    await page.mouse.move(pixel.x, pixel.y);
    await page.mouse.click(pixel.x, pixel.y);
    const checked = await placement;
    expect(checked.status()).toBe(200);
    expect(checked.request().postDataJSON()).toMatchObject({
      definition: { id: 'base:stone-ring-hearth' },
      site: { surfaceId: 'terrain' },
    });
    // The owned browser reader can release a completed response before CDP can
    // retrieve its body. Start proves the client consumed an accepted check for
    // the current complete placement key; an older preview cannot enable it.
    await expect(
      page.locator('#buildingPanel').getByRole('button', { name: 'Start', exact: true }),
    ).toBeEnabled();
    expect(commands).toEqual([]);
    expect(entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action).toBeNull();
    await page.screenshot({ path: info.outputPath('construction-before-attack.png') });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Cancel placement', exact: true })).toBeHidden();
    await expect(mode).toBeVisible();
    await page.getByRole('button', { name: 'Hide Build panel', exact: true }).click();
    await canvas.focus();
    await page.keyboard.press('Shift+S');
    const speech = page.getByRole('textbox', { name: 'Words to say out loud', exact: true });
    await expect(speech).toBeFocused();
    const words = 'I will place the hearth here. We can speak while I keep watch.';
    await speech.fill(words);
    await page
      .getByRole('region', { name: 'Speak out loud', exact: true })
      .getByRole('button', { name: 'Speak', exact: true })
      .click();
    await expect
      .poll(() =>
        game.service.world.events.some(
          (event) => event.type === 'speech' && event.data?.['text'] === words,
        ),
      )
      .toBe(true);
    const spoken = game.service.world.events.find(
      (event) => event.type === 'speech' && event.data?.['text'] === words,
    )!;
    expect(spoken.audience).toContain(NPC_ID);
    expect(commands.map((request) => request.command.type)).toEqual(['say']);
    expect(commands[0]!.command.execution).toBeUndefined();
    await expect(mode).toBeVisible();
    expect(paid).toEqual([]);
    expect(modelCalls).toBe(0);
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    await page.close();
    await game.close();
  }
});
test.afterAll(closeTestDatabases);
