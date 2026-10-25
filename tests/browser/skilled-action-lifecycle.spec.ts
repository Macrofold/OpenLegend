import { test, expect, type Page } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import { stockedCamp } from '../fixtures/world.js';
import { testRepository, closeTestDatabases, readConfig } from '../fixtures/database.js';
import { enterGame, blockExternalBrowserRequests } from '../fixtures/browser.js';
import { editWorld } from '../fixtures/service.js';
import { fixture as rangedFixture } from '../fixtures/combat-execution.js';
import { initialCamera } from '../../apps/client/src/world-camera.js';
import {
  bodyProfile,
  createItemLot,
  entityGet,
  entityValues,
  executeCommand,
  freezeWorld,
  PLAYER_ID,
  setSpatialPosition,
  worldPosition,
  worldSupport,
  occurrenceFor,
  advanceWorld,
  NPC_ID,
  seesEntity,
} from '@open-legend/domain';
import type { CommandInput } from '@open-legend/protocol';

type Request = { commandId: string; commandEpoch: string; command: CommandInput };
async function start(page: Page, tick = false, ranged = false) {
  const world = ranged ? rangedFixture().world : stockedCamp(),
    player = entityGet(world.entities, PLAYER_ID)!,
    target = entityGet(world.entities, 'deer-1')!;
  for (const body of entityValues(world.entities))
    if (body.actor && body.id !== PLAYER_ID) {
      body.actor.incapacitated = true;
      body.actor.action = null;
      body.actor.agency.plan = null;
    }
  setSpatialPosition(
    world,
    target,
    { ...worldPosition(player), x: worldPosition(player).x + 1.7 },
    worldSupport(player),
  );
  target.animal!.wander = { remainingSeconds: 36000 };
  const itemId = ranged
    ? undefined
    : createItemLot(world, PLAYER_ID, 'spear', 1, 'lifecycle-spear');
  const equipped = itemId
    ? executeCommand(freezeWorld(world), {
        id: 'lifecycle-equip',
        actorId: PLAYER_ID,
        type: 'equip',
        itemId,
      })
    : { world: freezeWorld(world), outcome: { ok: true, message: 'Ranged fixture equipped.' } };
  expect(equipped.outcome.ok, equipped.outcome.message).toBe(true);
  const game = await createGameServer({
    config: readConfig({ AI_BUDGET_USD: '0' }),
    store: await testRepository(undefined, equipped.world),
    production: true,
    tick,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing fixture listener');
  await blockExternalBrowserRequests(page);
  await page.goto(`http://127.0.0.1:${address.port}`);
  await enterGame(page);
  return game;
}
async function selectTarget(page: Page) {
  const off = page.getByRole('button', { name: 'Attack mode off', exact: true });
  if (await off.isVisible()) await off.click();
  await page
    .locator('.ol-attack-controls')
    .getByRole('button', { name: 'In view', exact: true })
    .click();
  await page.locator('[data-entity="deer-1"] button').click();
  await page.getByRole('button', { name: 'Hide In view panel', exact: true }).click();
}
async function pointerDown(page: Page, screen?: { x: number; y: number }) {
  const rect = await page.locator('.ol-attack-reticle').boundingBox();
  if (!screen) expect(rect).not.toBeNull();
  const point = screen ?? { x: rect!.x + rect!.width / 2, y: rect!.y + rect!.height / 2 };
  await page.locator('#world').evaluate((element) => {
    element.addEventListener(
      'gotpointercapture',
      () => element.setAttribute('data-test-captured', 'true'),
      { once: true },
    );
    element.setAttribute('data-test-captured', 'false');
    element.addEventListener(
      'pointerdown',
      (event) => {
        element.setAttribute('data-test-pointer', String((event as PointerEvent).pointerId));
        element.addEventListener(
          'pointermove',
          (move) => {
            element.setAttribute('data-test-pointer-x', String((move as PointerEvent).clientX));
            element.setAttribute('data-test-pointer-y', String((move as PointerEvent).clientY));
          },
          { once: true },
        );
      },
      { once: true },
    );
  });
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  // Process pending capture before deliberately testing a later loss of capture.
  await page.mouse.move(point.x + 1, point.y);
  await expect(page.locator('#world')).toHaveAttribute('data-test-captured', 'true');
  await expect(page.locator('.ol-timing-ring')).toBeVisible();
}
const playerAction = (game: Awaited<ReturnType<typeof start>>) =>
  entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action;
const released = (requests: Request[]) =>
  requests.filter((request) => ['release-strike', 'release-shot'].includes(request.command.type));

test('lost pointer capture and pointer cancellation end the exact preparation without releasing', async ({
  page,
}) => {
  test.setTimeout(120000);
  const requests: Request[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/command')) requests.push(request.postDataJSON());
  });
  const game = await start(page);
  try {
    await selectTarget(page);
    for (const cancellation of ['capture', 'cancel'] as const) {
      await pointerDown(page);
      const actionId = playerAction(game)!.id;
      await page.locator('#world').evaluate((element, kind) => {
        const pointerId = Number(element.getAttribute('data-test-pointer'));
        if (kind === 'capture') element.releasePointerCapture(pointerId);
        else element.dispatchEvent(new PointerEvent('pointercancel', { pointerId, bubbles: true }));
      }, cancellation);
      // Chromium processes a requested capture release at the next pointer event.
      const point = await page.locator('.ol-attack-reticle').boundingBox();
      await page.mouse.move(point!.x + point!.width / 2 + 1, point!.y + point!.height / 2);
      await expect.poll(() => playerAction(game)).toBeNull();
      await page.mouse.up();
      await game.service.tick(0.4, 0);
      expect(released(requests)).toHaveLength(0);
      expect(
        occurrenceFor(game.service.world, PLAYER_ID, actionId)?.attackExecution,
      ).toBeUndefined();
      await expect(page.locator('.ol-timing-ring')).toBeHidden();
    }
    // A native replacement ends preparation even while the primary button stays
    // down. The old pointer release must neither attack nor stop the replacement.
    await pointerDown(page);
    const interruptedId = playerAction(game)!.id;
    const position = worldPosition(entityGet(game.service.world.entities, PLAYER_ID)!);
    const replacement = await game.service.transition((world) =>
      executeCommand(world, {
        id: 'lifecycle-native-replacement',
        actorId: PLAYER_ID,
        type: 'move',
        destination: {
          ...position,
          x: position.x - 1,
          surfaceId: worldSupport(entityGet(world.entities, PLAYER_ID)!)!,
        },
      }),
    );
    expect(replacement.ok, replacement.message).toBe(true);
    const replacementId = playerAction(game)!.id;
    expect(replacementId).not.toBe(interruptedId);
    await expect(page.locator('.ol-timing-ring')).toBeHidden();
    await page.mouse.up();
    expect(released(requests)).toHaveLength(0);
    expect(playerAction(game)!.id).toBe(replacementId);
    const stopped = await game.service.transition((world) =>
      executeCommand(world, {
        id: 'lifecycle-stop-replacement',
        actorId: PLAYER_ID,
        type: 'cancel',
        expectedActionId: replacementId,
      }),
    );
    expect(stopped.ok, stopped.message).toBe(true);
    // A secondary press takes over an active primary gesture before camera motion.
    await pointerDown(page);
    const cameraStart = (await page.locator('.ol-attack-reticle').boundingBox())!;
    const cameraPoint = {
      x: cameraStart.x + cameraStart.width / 2,
      y: cameraStart.y + cameraStart.height / 2,
    };
    await page.mouse.down({ button: 'right' });
    await expect.poll(() => playerAction(game)).toBeNull();
    await page.mouse.move(cameraPoint.x + 60, cameraPoint.y + 35, { steps: 8 });
    await expect(page.locator('#world')).toHaveCSS('cursor', 'grabbing');
    await page.mouse.up({ button: 'right' });
    await page.mouse.up();
    await expect(page.locator('#contextMenu')).toBeHidden();
    await page.mouse.click(cameraPoint.x + 60, cameraPoint.y + 35, { button: 'right' });
    await expect(page.locator('#contextMenu')).toBeVisible();
    await page.keyboard.press('Escape');
    expect(released(requests)).toHaveLength(0);
    await selectTarget(page);
    // A genuinely new press still admits work after all terminal cancellations.
    await pointerDown(page);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect.poll(() => playerAction(game)).toBeNull();
    expect(
      requests.filter((request) => request.command.execution?.operation === 'begin'),
    ).toHaveLength(5);
    expect(released(requests)).toHaveLength(0);
    // Pause disables the actual ordinary default. Meta keeps that exact
    // contextual choice instead of substituting the held-attack route.
    const selected = (await page.locator('.ol-attack-reticle').boundingBox())!;
    const point = { x: selected.x + selected.width / 2, y: selected.y + selected.height / 2 };
    await page.getByRole('button', { name: 'Pause world', exact: true }).click();
    await expect.poll(() => game.service.paused).toBe(true);
    await page.locator('#world').focus();
    await page.keyboard.down('Meta');
    await page.mouse.move(point.x, point.y);
    const primary = page.locator('.ol-world-hover[data-primary="true"]');
    await expect(primary).toContainText('Attack deer with Lookout spear');
    await expect(primary).toContainText('Resume the world');
    const beforeUnavailable = requests.length;
    await page.mouse.click(point.x, point.y);
    await page.keyboard.up('Meta');
    await page.waitForTimeout(200);
    expect(requests).toHaveLength(beforeUnavailable);
    expect(playerAction(game)).toBeNull();
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    await page.keyboard.up('Meta').catch(() => {});
    await page.mouse.up({ button: 'right' }).catch(() => {});
    await page.mouse.up().catch(() => {});
    await page.close();
    await game.close();
  }
});

test('body motion beneath a stationary held pointer preserves preparation until self-entry or release', async ({
  page,
}) => {
  test.setTimeout(120000);
  const requests: Request[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/command')) requests.push(request.postDataJSON());
  });
  const game = await start(page, false, true);
  try {
    // The visible health marker supplies evidence that the actual body has
    // repainted at its new position, without inspecting renderer internals.
    await editWorld(game.service, (world) => {
      entityGet(world.entities, PLAYER_ID)!.actor!.health = 95;
    });
    const health = page.locator('.ol-health-bar');
    await expect(health).toHaveCount(1);
    await page.getByRole('button', { name: 'Center on player', exact: true }).click();
    const follow = page.getByRole('button', { name: 'Follow player', exact: true });
    if ((await follow.getAttribute('aria-pressed')) === 'true') await follow.click();
    await expect(follow).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('button', { name: 'Attack mode off', exact: true }).click();
    const player = entityGet(game.service.world.entities, PLAYER_ID)!,
      playerStart = { ...worldPosition(player) },
      playerAway = { ...playerStart, x: playerStart.x - 2 },
      rect = (await page.locator('#world').boundingBox())!,
      upper = {
        x: rect.x + rect.width / 2,
        y:
          rect.y +
          rect.height / 2 -
          (bodyProfile(player).height * 0.7 * rect.height) / (initialCamera().zoom * 2),
      };
    // Establish the pixel through the real self-attack refusal before moving the
    // body away. A deer's painted center need not overlap a human silhouette.
    await page.mouse.click(upper.x + 1, upper.y);
    await expect(page.locator('.ol-attack-controls')).toContainText(
      'Choose a visible place to aim.',
    );
    expect(requests).toHaveLength(0);
    const originalMarker = (await health.boundingBox())!;
    await editWorld(game.service, (world) => {
      const player = entityGet(world.entities, PLAYER_ID)!;
      setSpatialPosition(world, player, playerAway, worldSupport(player));
    });
    await expect
      .poll(async () => {
        const current = await health.boundingBox();
        return current ? Math.hypot(current.x - originalMarker.x, current.y - originalMarker.y) : 0;
      })
      .toBeGreaterThan(10);
    await pointerDown(page, upper);
    const actionId = playerAction(game)!.id,
      marker = (await health.boundingBox())!;
    const point = await page.locator('#world').evaluate((element) => ({
      x: Number(element.getAttribute('data-test-pointer-x')),
      y: Number(element.getAttribute('data-test-pointer-y')),
    }));
    const beforeMovement = requests.length;
    await editWorld(game.service, (world) => {
      const player = entityGet(world.entities, PLAYER_ID)!;
      setSpatialPosition(world, player, playerStart, worldSupport(player));
    });
    await expect
      .poll(async () => {
        const current = await health.boundingBox();
        return current ? Math.hypot(current.x - marker.x, current.y - marker.y) : 0;
      })
      .toBeGreaterThan(10);
    await page.waitForTimeout(500);
    expect(playerAction(game)?.id).toBe(actionId);
    await expect(page.locator('.ol-timing-ring')).toBeVisible();
    expect(requests).toHaveLength(beforeMovement);
    // Explicitly deliver a zero-delta pointer event: merely repainting a body
    // underneath it is not deliberate pointer entry into the cancellation region.
    await page.locator('#world').evaluate((element, point) => {
      element.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: Number(element.getAttribute('data-test-pointer')),
          pointerType: 'mouse',
          clientX: point.x,
          clientY: point.y,
          button: -1,
          buttons: 1,
          bubbles: true,
        }),
      );
    }, point);
    // Give a wrongly queued cancellation time to become observable before the
    // deliberate move, so it cannot be mistaken for that later input's result.
    await page.waitForTimeout(200);
    expect(playerAction(game)?.id).toBe(actionId);
    await expect(page.locator('.ol-timing-ring')).toBeVisible();
    expect(requests).toHaveLength(beforeMovement);
    await page.mouse.move(point.x + 1, point.y);
    await expect.poll(() => playerAction(game)).toBeNull();
    await expect(page.locator('.ol-timing-ring')).toBeHidden();
    await page.mouse.up();
    expect(
      requests.filter(
        (request) =>
          request.command.type === 'cancel' && request.command.expectedActionId === actionId,
      ),
    ).toHaveLength(1);
    expect(released(requests)).toHaveLength(0);
    await editWorld(game.service, (world) => {
      const player = entityGet(world.entities, PLAYER_ID)!;
      setSpatialPosition(world, player, playerAway, worldSupport(player));
    });
    await expect
      .poll(async () => {
        const current = await health.boundingBox();
        return current ? Math.hypot(current.x - originalMarker.x, current.y - originalMarker.y) : 0;
      })
      .toBeGreaterThan(10);
    await pointerDown(page, upper);
    const nextId = playerAction(game)!.id;
    expect(nextId).not.toBe(actionId);
    await editWorld(game.service, (world) => {
      const player = entityGet(world.entities, PLAYER_ID)!;
      setSpatialPosition(world, player, playerStart, worldSupport(player));
    });
    await expect
      .poll(async () => {
        const current = await health.boundingBox();
        return current
          ? Math.hypot(current.x - originalMarker.x, current.y - originalMarker.y)
          : Infinity;
      })
      .toBeLessThan(1);
    expect(playerAction(game)?.id).toBe(nextId);
    // No pointer movement: up itself samples the body now beneath the cursor.
    await page.mouse.up();
    await expect.poll(() => playerAction(game)).toBeNull();
    expect(released(requests)).toHaveLength(0);
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    await page.mouse.up().catch(() => {});
    await page.close();
    await game.close();
  }
});

test('a real offline interval disarms held input and reconnect never reconstructs the old keys', async ({
  page,
}) => {
  test.setTimeout(120000);
  const requests: Request[] = [],
    failedInputs: string[] = [],
    inputs: Array<{ kind: string; direction?: { x: number; z: number } }> = [];
  page.on('requestfailed', (request) => {
    if (request.url().endsWith('/api/input')) failedInputs.push(request.url());
  });
  page.on('request', (request) => {
    if (request.url().endsWith('/api/command')) requests.push(request.postDataJSON());
    if (request.url().endsWith('/api/input')) inputs.push(request.postDataJSON());
  });
  const game = await start(page, true);
  try {
    await selectTarget(page);
    await pointerDown(page);
    await page.keyboard.down('w');
    await expect
      .poll(() =>
        inputs.some(
          (input) =>
            input.kind === 'steer' &&
            !!input.direction &&
            (input.direction.x !== 0 || input.direction.z !== 0),
        ),
      )
      .toBe(true);
    await page.context().setOffline(true);
    // An already-open event stream may survive Chrome's offline switch. A failed
    // actual input update is sufficient loss evidence; the native lease still expires.
    await expect.poll(() => failedInputs.length).toBeGreaterThan(0);
    await expect(page.locator('.ol-timing-ring')).toBeHidden();
    await page.keyboard.up('w');
    await page.mouse.up();
    await page.waitForTimeout(600);
    const stopped = { ...worldPosition(entityGet(game.service.world.entities, PLAYER_ID)!) };
    await page.context().setOffline(false);
    await page.waitForFunction(() => navigator.onLine);
    await enterGame(page);
    const atReconnect = inputs.length;
    await page.waitForTimeout(450);
    expect(
      inputs
        .slice(atReconnect)
        .filter(
          (input) =>
            input.kind === 'steer' &&
            input.direction &&
            (input.direction.x !== 0 || input.direction.z !== 0),
        ),
    ).toHaveLength(0);
    expect(worldPosition(entityGet(game.service.world.entities, PLAYER_ID)!)).toEqual(stopped);
    expect(released(requests)).toHaveLength(0);
    expect(
      game.service.world.events.filter(
        (event) => event.type === 'struck' && event.actorId === PLAYER_ID,
      ),
    ).toHaveLength(0);
    // Resolve the surviving preparation deliberately before another independent movement.
    const cancel = page
      .locator('.ol-attack-controls')
      .getByRole('button', { name: 'Cancel', exact: true });
    if (await cancel.isVisible()) await cancel.click();
    await page.locator('#world').focus();
    await page.keyboard.down('d');
    await expect
      .poll(() =>
        inputs
          .slice(atReconnect)
          .some(
            (input) =>
              input.kind === 'steer' &&
              input.direction &&
              (input.direction.x !== 0 || input.direction.z !== 0),
          ),
      )
      .toBe(true);
    await page.keyboard.up('d');
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    await page.context().setOffline(false);
    await page.keyboard.up('w').catch(() => {});
    await page.keyboard.up('d').catch(() => {});
    await page.mouse.up().catch(() => {});
    await page.close();
    await game.close();
  }
});

test('Check result resolves the original uncertain Begin without replay and permits only fresh neutral recovery', async ({
  page,
}) => {
  test.setTimeout(120000);
  const requests: Request[] = [],
    receipts: Request[] = [];
  const game = await start(page, false, true);
  let interrupted = false,
    acceptedMessage = '';
  await page.route('**/api/command', async (route) => {
    const request = route.request().postDataJSON() as Request;
    requests.push(request);
    if (!interrupted && request.command.execution?.operation === 'begin') {
      interrupted = true;
      const accepted = await route.fetch();
      acceptedMessage = (await accepted.json()).message;
      await route.abort('failed');
    } else await route.continue();
  });
  page.on('request', (request) => {
    if (request.url().endsWith('/api/command/receipt')) receipts.push(request.postDataJSON());
  });
  try {
    await selectTarget(page);
    const card = page.locator('.ol-attack-controls');
    await card.getByRole('button', { name: 'Prepare', exact: true }).click();
    const check = card.getByRole('button', { name: 'Check result', exact: true });
    await expect(check).toBeEnabled();
    const original = requests.find((request) => request.command.execution?.operation === 'begin')!;
    const actionId = playerAction(game)!.id;
    await page.waitForTimeout(350);
    expect(
      requests.filter((request) => request.command.execution?.operation === 'begin'),
    ).toHaveLength(1);
    expect(released(requests)).toHaveLength(0);
    await check.click();
    await expect(check).toBeHidden();
    await expect(card).toContainText(acceptedMessage);
    await expect(card).not.toContainText('unconfirmed');
    await expect(card).not.toContainText('Check its result');
    expect(receipts).toEqual([original]);
    expect(playerAction(game)?.id).toBe(actionId);
    await game.service.tick(0.4, 0);
    await expect(card.getByRole('button', { name: 'Release', exact: true })).toBeEnabled();
    await card.getByRole('button', { name: 'Release', exact: true }).click();
    await expect
      .poll(
        () =>
          game.service.world.events.filter(
            (event) => event.type === 'shot-released' && event.data?.['actionId'] === actionId,
          ).length,
      )
      .toBe(1);
    expect(released(requests)).toHaveLength(1);
    expect(released(requests)[0]!.command.execution).toBeUndefined();
    expect(released(requests)[0]!.command.targetId).toBe('deer-1');
    expect(released(requests)[0]!.command.bodyReference).toBeTruthy();
    expect(released(requests)[0]!.command.aimPoint).toBeUndefined();
    expect(released(requests)[0]!.commandId).not.toBe(original.commandId);
    expect(occurrenceFor(game.service.world, PLAYER_ID, actionId)?.attackExecution?.input).toEqual({
      kind: 'ordinary',
    });
  } finally {
    await page.close();
    await game.close();
  }
});

test('child popup Escape and text composition stay with their visible UI owner', async ({
  page,
}) => {
  test.setTimeout(120000);
  const requests: Request[] = [],
    inputs: unknown[] = [],
    paid: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/command')) requests.push(request.postDataJSON());
    if (request.url().endsWith('/api/input')) inputs.push(request.postDataJSON());
    if (/\/api\/(chat|act|invent|world-agent\/messages)$/.test(request.url()))
      paid.push(request.url());
  });
  const game = await start(page);
  try {
    await selectTarget(page);
    await page
      .locator('.ol-attack-controls')
      .getByRole('button', { name: 'Prepare', exact: true })
      .click();
    await expect.poll(() => !!playerAction(game)?.attackExecution).toBe(true);
    await page.getByRole('button', { name: 'Build', exact: true }).click();
    const choice = page.getByRole('combobox', { name: 'Build', exact: true });
    await choice.focus();
    await expect(page.getByRole('listbox')).toBeVisible();
    await expect.poll(() => playerAction(game)).toBeNull();
    const beforeEscape = requests.length;
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Hide Build panel', exact: true })).toBeVisible();
    expect(requests).toHaveLength(beforeEscape);
    await page.getByRole('button', { name: 'Hide Build panel', exact: true }).click();
    await page.locator('#world').focus();
    await page.keyboard.press('Shift+A');
    const editor = page.getByRole('textbox', { name: 'Describe your action', exact: true });
    await expect(editor).toBeFocused();
    const beforeInput = inputs.length,
      beforeCommands = requests.length;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: 'wasd', selectionStart: 4, selectionEnd: 4 });
    await page.keyboard.press('Shift+T');
    await page.keyboard.press('w');
    await page.waitForTimeout(200);
    await expect(page.getByRole('button', { name: 'Attack mode on', exact: true })).toBeVisible();
    expect(inputs).toHaveLength(beforeInput);
    expect(requests).toHaveLength(beforeCommands);
    expect(released(requests)).toHaveLength(0);
    expect(paid).toEqual([]);
    await cdp.send('Input.imeSetComposition', { text: '', selectionStart: 0, selectionEnd: 0 });
    await cdp.detach();
  } finally {
    await page.close();
    await game.close();
  }
});

test('long pointer tracking releases at the current point after its original deer leaves view', async ({
  page,
}) => {
  test.setTimeout(120000);
  const requests: Request[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/command')) requests.push(request.postDataJSON());
  });
  const game = await start(page, true, true);
  try {
    await selectTarget(page);
    await pointerDown(page);
    const initial = requests.find((request) => request.command.execution?.operation === 'begin')!;
    expect(initial.command.type).toBe('aim');
    expect(initial.command.targetId).toBe('deer-1');
    expect(initial.command.aimPoint).toBeUndefined();
    const actionId = playerAction(game)!.id;
    const rect = (await page.locator('.ol-attack-reticle').boundingBox())!;
    const originalScreen = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    await page.mouse.move(originalScreen.x + 80, originalScreen.y + 30, { steps: 12 });
    await page.mouse.move(originalScreen.x, originalScreen.y, { steps: 12 });
    await editWorld(game.service, (world) => {
      const deer = entityGet(world.entities, 'deer-1')!;
      setSpatialPosition(
        world,
        deer,
        { ...worldPosition(deer), x: world.map.width - 2, z: world.map.height - 2 },
        worldSupport(deer),
      );
    });
    expect(
      seesEntity(
        game.service.world,
        entityGet(game.service.world.entities, PLAYER_ID)!,
        entityGet(game.service.world.entities, 'deer-1')!,
      ),
    ).toBe(false);
    await page.waitForTimeout(200);
    await expect(page.locator('.ol-attack-reticle')).toHaveAttribute('data-aim-available', 'true');
    await expect.poll(() => playerAction(game)?.attackExecution?.ready).toBe(true);
    expect(playerAction(game)?.id).toBe(actionId);
    expect(released(requests)).toHaveLength(0);
    await page.mouse.up();
    await expect.poll(() => released(requests).length).toBe(1);
    const final = released(requests)[0]!.command;
    expect(final.type).toBe('release-shot');
    expect(final.targetId).not.toBe('deer-1');
    expect(final.aimPoint).toBeDefined();
    await expect
      .poll(
        () =>
          game.service.world.events.filter(
            (event) => event.type === 'shot-released' && event.actorId === PLAYER_ID,
          ).length,
      )
      .toBe(1);
    expect(final.execution?.operation).toBe('release');
    expect(occurrenceFor(game.service.world, PLAYER_ID, actionId)?.attackExecution?.input).toEqual(
      final.execution?.operation === 'release' ? final.execution.input : undefined,
    );
    expect(
      requests.filter((request) => request.command.execution?.operation === 'begin'),
    ).toHaveLength(1);
    expect(requests.some((request) => request.command.type === 'move')).toBe(false);
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    await page.keyboard.press('Escape').catch(() => {});
    await page.mouse.up().catch(() => {});
    await page.close();
    await game.close();
  }
});

test('personal assault enters attack mode once and the selected modifier shortcuts retain their owners', async ({
  page,
}) => {
  test.setTimeout(120000);
  const requests: Request[] = [],
    inputs: unknown[] = [],
    paid: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/command')) requests.push(request.postDataJSON());
    if (request.url().endsWith('/api/input')) inputs.push(request.postDataJSON());
    if (/\/api\/(chat|act|invent|world-agent\/messages)$/.test(request.url()))
      paid.push(request.url());
  });
  // The deer's existing contextual primary is Hunt, so give this route its
  // required ranged weapon rather than expecting a disabled default to be replaced.
  const game = await start(page, false, true);
  try {
    const on = page.getByRole('button', { name: 'Attack mode on', exact: true });
    const off = page.getByRole('button', { name: 'Attack mode off', exact: true });
    await expect(off).toBeVisible();
    await editWorld(game.service, (world) => {
      const player = entityGet(world.entities, PLAYER_ID)!,
        attacker = entityGet(world.entities, NPC_ID)!;
      attacker.actor!.incapacitated = false;
      setSpatialPosition(
        world,
        attacker,
        { ...worldPosition(player), x: worldPosition(player).x - 0.8 },
        worldSupport(player),
      );
    });
    const admitted = await game.service.transition((world) =>
      executeCommand(world, {
        id: 'lifecycle-personal-assault',
        actorId: NPC_ID,
        type: 'strike',
        targetId: PLAYER_ID,
        definitionId: 'punch',
      }),
    );
    expect(admitted.ok, admitted.message).toBe(true);
    // Seeing preparation alone does not constitute an assault notice.
    await expect(off).toBeVisible();
    const impact = await game.service.transition((world) =>
      advanceWorld(world, world.nativeStrikes!['punch']!.workSeconds),
    );
    expect(impact.ok, impact.message).toBe(true);
    await expect(on).toBeVisible();
    const notice = entityGet(game.service.world.entities, PLAYER_ID)!.actor!.attackModeNotice!;
    expect(notice.kind).toBe('personally-experienced-assault');
    await on.click();
    await editWorld(game.service, () => {});
    await expect(off).toBeVisible();
    expect(
      entityGet(game.service.world.entities, PLAYER_ID)!.actor!.attackModeNotice?.noticeSequence,
    ).toBe(notice.noticeSequence);

    const canvas = page.locator('#world');
    await canvas.focus();
    await page.keyboard.press('Shift+T');
    await expect(on).toBeVisible();
    await page.keyboard.press('t');
    await expect(page.locator('.ol-targeting-hint')).toBeVisible();
    await expect(on).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.ol-targeting-hint')).toBeHidden();
    await page.keyboard.press('Shift+W');
    await expect(
      page.getByRole('button', { name: 'Hide Create panel', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Hide Create panel', exact: true }).click();
    await canvas.focus();
    await page.keyboard.press('Shift+A');
    await expect(
      page.getByRole('textbox', { name: 'Describe your action', exact: true }),
    ).toBeFocused();
    await page.getByRole('button', { name: 'Close text bar', exact: true }).click();
    await canvas.focus();
    await page.keyboard.press('Shift+S');
    await expect(
      page.getByRole('textbox', { name: 'Words to say out loud', exact: true }),
    ).toBeFocused();
    await page.getByRole('button', { name: 'Close text bar', exact: true }).click();
    expect(inputs).toHaveLength(0);
    expect(requests).toHaveLength(0);

    await selectTarget(page);
    const rect = (await page.locator('.ol-attack-reticle').boundingBox())!;
    const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    await page.keyboard.down('Control');
    await page.mouse.click(point.x, point.y);
    await page.keyboard.up('Control');
    await expect(page.locator('#contextMenu')).toBeVisible();
    expect(requests).toHaveLength(0);
    await page.keyboard.press('Escape');
    await page.keyboard.down('Meta');
    await page.mouse.move(point.x, point.y);
    await expect(page.locator('.ol-world-hover[data-primary="true"] strong')).toContainText(
      'Command-click:',
    );
    await page.mouse.click(point.x, point.y);
    await page.keyboard.up('Meta');
    await expect.poll(() => requests.length).toBeGreaterThan(0);
    expect(requests.some((request) => request.command.execution !== undefined)).toBe(false);
    expect(requests.some((request) => request.command.primaryAction !== undefined)).toBe(true);
    expect(released(requests)).toHaveLength(0);
    expect(paid).toEqual([]);
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    await page.keyboard.up('Control').catch(() => {});
    await page.keyboard.up('Meta').catch(() => {});
    await page.close();
    await game.close();
  }
});

test.afterAll(closeTestDatabases);
