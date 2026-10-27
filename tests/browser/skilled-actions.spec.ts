import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { createGameServer } from '../../apps/server/src/http.js';
import { stockedCamp } from '../fixtures/world.js';
import { testRepository, closeTestDatabases, readConfig } from '../fixtures/database.js';
import { enterGame, blockExternalBrowserRequests } from '../fixtures/browser.js';
import { editWorld } from '../fixtures/service.js';
import {
  admitDeclaration,
  createItemLot,
  entityGet,
  entityValues,
  executeCommand,
  freezeWorld,
  PLAYER_ID,
  NPC_ID,
  setSpatialPosition,
  worldPosition,
  worldSupport,
  itemContainerCapacity,
  inventoryFor,
  advanceWorld,
  preferredTargetEquipment,
  type WorldState,
} from '@open-legend/domain';

function executionWorld(center = 0.5, width = 0.06, human = false, timed = true): WorldState {
  let world = stockedCamp();
  const targetId = human ? NPC_ID : 'deer-1';
  for (const body of entityValues(world.entities))
    if (body.actor && body.id !== PLAYER_ID && body.id !== targetId) {
      body.actor.incapacitated = true;
      body.actor.action = null;
      body.actor.agency.plan = null;
    }
  const definition = !timed
    ? 'fixture:ordinary-spear'
    : center === 0.5
      ? 'spear'
      : 'fixture:alternate-spear';
  if (definition !== 'spear') {
    const source = structuredClone(world.itemDefinitions['spear']!);
    source.id = definition;
    source.name = 'Practice spear';
    source.execution = {
      ...source.execution!,
      profile: { ...source.execution!.profile, center, greenWidth: width },
    };
    if (!timed) delete source.execution;
    world.itemDefinitions[definition] = source;
  }
  const itemId = createItemLot(world, PLAYER_ID, definition, 1, 'browser-execution-fixture');
  const player = entityGet(world.entities, PLAYER_ID)!,
    target = entityGet(world.entities, targetId)!;
  const origin = worldPosition(player);
  setSpatialPosition(world, target, { ...origin, x: origin.x + 1.7 }, worldSupport(player));
  target.actor!.action = null;
  target.actor!.incapacitated = !human;
  if (human) target.actor!.health = 1;
  else target.animal!.wander = { remainingSeconds: 36000 };
  const equipped = executeCommand(freezeWorld(world), {
    type: 'equip',
    actorId: PLAYER_ID,
    itemId,
    id: 'fixture-equip',
  });
  expect(equipped.outcome.ok, equipped.outcome.message).toBe(true);
  world = structuredClone(equipped.world);
  createItemLot(world, PLAYER_ID, 'prepared_fiber', 20);
  createItemLot(world, PLAYER_ID, 'cord', 10);
  const recipe = admitDeclaration(
    freezeWorld(world),
    {
      family: { id: 'base:woven-container', version: 1 },
      name: 'Travel pouch',
      description: 'A woven travel pouch.',
      inputs: [
        { role: 'pouch', definitionId: 'prepared_fiber', quantity: 6 },
        { role: 'binding', definitionId: 'cord', quantity: 3 },
      ],
      output: { name: 'Travel pouch', description: 'A portable pouch secured with cord.' },
      parameters: {},
    },
    {
      actorId: PLAYER_ID,
      requestId: 'browser-pouch',
      source: 'test-fixture',
      authority: { origin: 'player', policyRevision: 1 },
    },
  );
  expect(recipe.outcome.ok, recipe.outcome.message).toBe(true);
  return freezeWorld(recipe.world);
}
async function start(page: Page, world: WorldState, tick = false) {
  const game = await createGameServer({
    config: readConfig({ AI_BUDGET_USD: '0' }),
    store: await testRepository(undefined, world),
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
async function chooseDeer(page: Page, id = 'deer-1') {
  await page.getByRole('button', { name: 'Attack mode off', exact: true }).click();
  await page
    .locator('.ol-attack-controls')
    .getByRole('button', { name: 'In view', exact: true })
    .click();
  await page.locator(`[data-entity="${id}"] button`).click();
  await page.getByRole('button', { name: 'Hide In view panel', exact: true }).click();
}
async function frameSample(page: Page, durationMs: number) {
  return page.evaluate(
    (duration) =>
      new Promise<{ frames: number; p50Ms: number; p95Ms: number; maxMs: number }>((resolve) => {
        const samples: number[] = [];
        let start = 0,
          previous = 0;
        const frame = (at: number) => {
          if (!start) start = at;
          if (previous) samples.push(at - previous);
          previous = at;
          if (at - start < duration) requestAnimationFrame(frame);
          else {
            samples.sort((a, b) => a - b);
            resolve({
              frames: samples.length,
              p50Ms: samples[Math.floor(samples.length * 0.5)] ?? 0,
              p95Ms: samples[Math.floor(samples.length * 0.95)] ?? 0,
              maxMs: samples.at(-1) ?? 0,
            });
          }
        };
        requestAnimationFrame(frame);
      }),
    durationMs,
  );
}
async function recordJson(info: TestInfo, name: string, value: unknown) {
  const path = info.outputPath(`${name}.json`);
  await writeFile(path, JSON.stringify(value, null, 2));
  await info.attach(name, { path, contentType: 'application/json' });
}

test('optional held attack uses animated timing and the exact native action', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors: string[] = [],
    paid: string[] = [],
    commands: Array<Record<string, unknown>> = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/\/api\/(chat|invent|world-agent\/messages)$/.test(request.url())) paid.push(request.url());
    if (request.url().endsWith('/api/command')) commands.push(request.postDataJSON());
  });
  const game = await start(page, executionWorld());
  try {
    await chooseDeer(page);
    await page
      .locator('.ol-attack-controls')
      .getByRole('button', { name: 'Prepare', exact: true })
      .click();
    await expect
      .poll(
        () => !!entityGet(game.service.world.entities, PLAYER_ID)?.actor?.action?.attackExecution,
      )
      .toBe(true);
    const ring = page.locator('.ol-timing-ring');
    await expect(ring).toBeVisible();
    const radius = await ring.getAttribute('r');
    await expect.poll(() => ring.getAttribute('r')).not.toBe(radius);
    await expect(page.getByRole('slider', { name: 'Timing position', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Aim\./ })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('animated-timing.png') });
    // This is native work progression, not a claim about real-time frame rate.
    await page.waitForTimeout(350);
    await game.service.tick(0.35, 0, { offeredUntil: performance.now() });
    await expect
      .poll(
        () =>
          entityGet(game.service.world.entities, PLAYER_ID)?.actor?.action?.attackExecution?.ready,
      )
      .toBe(true);
    await page
      .locator('.ol-attack-controls')
      .getByRole('button', { name: 'Release', exact: true })
      .click();
    await expect
      .poll(() => entityGet(game.service.world.entities, PLAYER_ID)?.actor?.action?.strikePhase)
      .toBe('recovery');
    const releases = commands.filter(
      (value) => (value['command'] as { type?: string })?.type === 'release-strike',
    );
    expect(releases).toHaveLength(1);
    const input = (
      releases[0]!['command'] as {
        execution: { input: { kind: string; phase: number } };
      }
    ).execution.input;
    expect(input.kind).toBe('timed-release');
    expect(input.phase).toBeGreaterThanOrEqual(0);
    expect(input.phase).toBeLessThan(1);
    expect(Object.keys(input).sort()).toEqual(['kind', 'phase']);
    const action = entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action!;
    expect(action.attackExecution!.input).toEqual(input);
    // A focused editor cannot steer or reinterpret its closing click as an attack.
    await page.getByRole('button', { name: 'Settings and help', exact: true }).click();
    await page.getByLabel('Forward', { exact: true }).focus();
    const before = commands.length;
    await page.keyboard.press('w');
    await page.keyboard.press('Shift+T');
    expect(commands).toHaveLength(before);
    await page.getByRole('button', { name: 'Hide Settings & help panel', exact: true }).click();
    expect(paid).toEqual([]);
    expect(errors).toEqual([]);
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } catch (error) {
    await page.screenshot({ path: 'test-results/ase-last-failure.png' }).catch(() => {});
    console.error(
      'Attack controls on failure:',
      await page
        .locator('.ol-attack-controls')
        .textContent()
        .catch(() => 'absent'),
    );
    throw error;
  } finally {
    await page.close();
    await game.close();
  }
});

test('alternate admitted timing is displayed and Release keeps ordinary keyboard activation', async ({
  page,
}) => {
  test.setTimeout(120000);
  const game = await start(page, executionWorld(0.43, 0.01));
  try {
    await chooseDeer(page);
    await page
      .locator('.ol-attack-controls')
      .getByRole('button', { name: 'Prepare', exact: true })
      .click();
    await expect(page.locator('.ol-timing-ring')).toBeVisible();
    await expect(page.locator('.ol-timing-excellent')).toHaveAttribute('r', String(0.43 * 70));
    await page.waitForTimeout(350);
    await game.service.tick(0.35, 0, { offeredUntil: performance.now() });
    await expect
      .poll(
        () =>
          entityGet(game.service.world.entities, PLAYER_ID)?.actor?.action?.attackExecution?.ready,
      )
      .toBe(true);
    const release = page
      .locator('.ol-attack-controls')
      .getByRole('button', { name: 'Release', exact: true });
    await release.focus();
    await release.press('Enter');
    await expect
      .poll(() => entityGet(game.service.world.entities, PLAYER_ID)?.actor?.action?.strikePhase)
      .toBe('recovery');
    const action = entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action!;
    expect(action.attackExecution!.input?.kind).toBe('timed-release');
    expect(Object.keys(action.attackExecution!.input!).sort()).toEqual(['kind', 'phase']);
    await page.keyboard.press('Shift+T');
    await expect(page.getByRole('button', { name: 'Attack mode off', exact: true })).toBeVisible();
  } catch (error) {
    await page.screenshot({ path: 'test-results/ase-last-failure.png' }).catch(() => {});
    console.error(
      'Attack controls on failure:',
      await page
        .locator('.ol-attack-controls')
        .textContent()
        .catch(() => 'absent'),
    );
    throw error;
  } finally {
    await page.close();
    await game.close();
  }
});

test('ordinary crafting produces one pouch at its authored capacity without a fitting exercise', async ({
  page,
}) => {
  test.setTimeout(120000);
  const commands: Array<Record<string, unknown>> = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/command')) commands.push(request.postDataJSON());
  });
  const game = await start(page, executionWorld());
  try {
    await page.getByRole('button', { name: 'Craft', exact: true }).click();
    await page.getByLabel('Find an output', { exact: true }).fill('Travel pouch');
    await page.getByRole('button', { name: 'Check crafting options', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Finish carefully/ })).toHaveCount(0);
    await page.getByRole('button', { name: /^Craft one batch/ }).click();
    await expect
      .poll(() => entityGet(game.service.world.entities, PLAYER_ID)?.actor?.action?.type)
      .toBe('craft');
    const recipe = Object.values(game.service.world.recipes).find(
      (value) => value.name === 'Travel pouch',
    )!;
    await game.service.tick(recipe.workSeconds / 60, 0);
    const made = inventoryFor(game.service.world, PLAYER_ID).filter(
      (item) => item.definitionId === recipe.outputs[0]!.definition.id,
    );
    expect(made).toHaveLength(1);
    expect(
      itemContainerCapacity(
        game.service.world,
        entityGet(game.service.world.entities, made[0]!.id)!,
      ),
    ).toBe(24);
    const crafts = commands.filter(
      (value) => (value['command'] as { type?: string })?.type === 'craft',
    );
    expect(crafts).toHaveLength(1);
    expect(crafts[0]!['command']).not.toHaveProperty('finish');
    await expect(page.locator('.ol-craft-finish')).toHaveCount(0);
  } finally {
    await page.close();
    await game.close();
  }
});

test('a cancelled preparation cannot reopen a lethal review from its delayed acknowledgement', async ({
  page,
}) => {
  test.setTimeout(120000);
  let acknowledge!: () => void;
  const held = new Promise<void>((resolve) => {
    acknowledge = resolve;
  });
  let intercepted = false;
  const commands: Array<Record<string, unknown>> = [];
  const game = await start(page, executionWorld(0.5, 0.06, true));
  await page.route('**/api/command', async (route) => {
    const body = route.request().postDataJSON();
    commands.push(body);
    if (!intercepted && body.command.execution?.operation === 'begin') {
      intercepted = true;
      const response = await route.fetch();
      await held;
      await route.fulfill({ response });
    } else await route.continue();
  });
  try {
    await chooseDeer(page, NPC_ID);
    await page
      .locator('.ol-attack-controls')
      .getByRole('button', { name: 'Prepare', exact: true })
      .click();
    await expect.poll(() => intercepted).toBe(true);
    await page.keyboard.press('Escape');
    acknowledge();
    await expect(page.locator('.ol-attack-controls')).not.toContainText('Requesting preparation');
    await page.waitForTimeout(300);
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(entityGet(game.service.world.entities, PLAYER_ID)?.actor?.action).toBeNull();
    expect(
      commands.filter((body) =>
        ['release-strike', 'release-shot'].includes((body['command'] as { type: string }).type),
      ),
    ).toHaveLength(0);
    // A new deliberate attempt still opens the ordinary exact consequence review.
    await page
      .locator('.ol-attack-controls')
      .getByRole('button', { name: 'Prepare', exact: true })
      .click();
    await expect(page.getByRole('button', { name: 'Prepare attack', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  } finally {
    acknowledge();
    await page.close();
    await game.close();
  }
});

test('pointer tap releases once with neutral input and a cancelled long hold never releases', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const commands: Array<Record<string, unknown>> = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/command')) commands.push(request.postDataJSON());
  });
  const game = await start(page, executionWorld());
  let beginCount = 0;
  let preparedAcknowledgementHeld = false;
  let acknowledgePrepared!: () => void;
  const preparedAcknowledgement = new Promise<void>((resolve) => {
    acknowledgePrepared = resolve;
  });
  await page.route('**/api/command', async (route) => {
    const body = route.request().postDataJSON();
    if (body.command.execution?.operation === 'begin' && ++beginCount <= 2) {
      const response = await route.fetch();
      // Delay only acknowledgements; native admission has already happened.
      if (beginCount === 1) await new Promise((resolve) => setTimeout(resolve, 350));
      else {
        preparedAcknowledgementHeld = true;
        await preparedAcknowledgement;
      }
      await route.fulfill({ response });
    } else await route.continue();
  });
  try {
    const idleFrames = await frameSample(page, 2000);
    await chooseDeer(page);
    const bounds = await page.locator('.ol-attack-reticle').boundingBox();
    expect(bounds).not.toBeNull();
    const aim = { x: bounds!.x + bounds!.width / 2, y: bounds!.y + bounds!.height / 2 };
    await page.mouse.move(aim.x, aim.y);
    await page.mouse.down();
    await page.mouse.up();
    await expect
      .poll(
        () =>
          commands.filter((body) => (body['command'] as { type: string }).type === 'release-strike')
            .length,
      )
      .toBe(1);
    const release = commands.find(
      (body) => (body['command'] as { type: string }).type === 'release-strike',
    )!;
    expect((release['command'] as { execution: { input: unknown } }).execution.input).toEqual({
      kind: 'ordinary',
    });
    await expect(page.locator('.ol-timing-ring')).toBeHidden();
    // Stop the still-unready action explicitly: this fixture has not offered
    // native time, so a release request is not evidence of an actual strike.
    await page
      .locator('.ol-attack-controls')
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();
    await expect
      .poll(() => entityGet(game.service.world.entities, PLAYER_ID)?.actor?.action)
      .toBeNull();
    await page
      .locator('.ol-attack-controls')
      .getByRole('button', { name: 'Prepare', exact: true })
      .click();
    await expect.poll(() => preparedAcknowledgementHeld, { timeout: 5000 }).toBe(true);
    const preparedId = entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action!.id;
    await page.mouse.move(aim.x, aim.y);
    await page.mouse.down();
    acknowledgePrepared();
    await expect(page.locator('.ol-timing-ring')).toBeVisible();
    await page.mouse.up();
    await page.waitForTimeout(200);
    // This press began while its preparation result was unknown. Receiving the
    // acknowledgement before up cannot turn that ignored press into a release.
    expect(
      commands.filter((body) => (body['command'] as { type: string }).type === 'release-strike'),
    ).toHaveLength(1);
    expect(entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action!.id).toBe(preparedId);
    expect(
      entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action!.attackExecution
        ?.pendingRelease,
    ).toBeUndefined();
    // A prepared melee attack stays bound to its opponent. A fresh click on
    // another point must not release that old attack or prepare another one.
    await page.mouse.click(aim.x + 85, aim.y + 25);
    await page.waitForTimeout(200);
    expect(
      commands.filter((body) => (body['command'] as { type: string }).type === 'release-strike'),
    ).toHaveLength(1);
    expect(entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action!.id).toBe(preparedId);
    expect(beginCount).toBe(2);
    await page.mouse.move(aim.x, aim.y);
    await page.mouse.down();
    const animatedFrames = await frameSample(page, 2000);
    await recordJson(info, 'rendered-frame-sample', {
      runtime: await page.evaluate(() => navigator.userAgent),
      viewport: page.viewportSize(),
      nativeHostTick: false,
      idleFrames,
      animatedFrames,
    });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await expect
      .poll(() => entityGet(game.service.world.entities, PLAYER_ID)?.actor?.action)
      .toBeNull();
    expect(
      commands.filter((body) => (body['command'] as { type: string }).type === 'release-strike'),
    ).toHaveLength(1);
  } finally {
    acknowledgePrepared();
    await page.mouse.up().catch(() => {});
    await page.close();
    await game.close();
  }
});

test('WASD steers native movement with bounded renewals and stops on key release and editor focus', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const inputs: Array<{
    kind: string;
    movementInputToken?: string;
    direction?: { x: number; z: number };
  }> = [];
  const acknowledgements: Array<{
    ok: boolean;
    code: string;
    inputScope?: { movementInputToken: string };
  }> = [];
  const unavailableAcknowledgements: Array<{
    request: string | null;
    status: number;
    error: string;
  }> = [];
  const acknowledgementReads: Promise<void>[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/input')) inputs.push(request.postDataJSON());
  });
  page.on('response', (response) => {
    if (!response.url().endsWith('/api/input')) return;
    // Chromium can deliver headers without retaining a readable response body.
    // This optional trace must report that gap, not abort native behavior checks.
    acknowledgementReads.push(
      response.json().then(
        (body) => {
          acknowledgements.push(body);
        },
        (error: unknown) => {
          unavailableAcknowledgements.push({
            request: response.request().postData(),
            status: response.status(),
            error: String(error),
          });
        },
      ),
    );
  });
  const game = await start(page, executionWorld(), true);
  try {
    await page.locator('#world').focus();
    await page.waitForTimeout(200);
    const idle = inputs.length;
    const initial = worldPosition(entityGet(game.service.world.entities, PLAYER_ID)!);
    const heldAt = performance.now();
    await page.keyboard.down('w');
    await page.keyboard.down('d');
    await expect
      .poll(
        () =>
          inputs.filter(
            (input) =>
              input.kind === 'steer' &&
              input.direction &&
              input.direction.x !== 0 &&
              input.direction.z !== 0,
          ).length,
      )
      .toBeGreaterThan(0);
    await expect
      .poll(() => {
        const p = worldPosition(entityGet(game.service.world.entities, PLAYER_ID)!);
        return Math.hypot(p.x - initial.x, p.z - initial.z);
      })
      .toBeGreaterThan(0.1);
    await page.waitForTimeout(350);
    await page.keyboard.up('w');
    await page.keyboard.up('d');
    const heldMs = performance.now() - heldAt;
    // Expiry may already have stopped this lane before keyup. Both outcomes
    // must stop actual motion; neither may revive the old held keys.
    await page.waitForTimeout(500);
    const stoppedAt = { ...worldPosition(entityGet(game.service.world.entities, PLAYER_ID)!) };
    await page.waitForTimeout(250);
    const afterStop = worldPosition(entityGet(game.service.world.entities, PLAYER_ID)!);
    expect(Math.hypot(afterStop.x - stoppedAt.x, afterStop.z - stoppedAt.z)).toBeLessThan(0.001);
    const moving = inputs.slice(idle);
    for (const input of moving.filter((input) => input.kind === 'steer' && input.direction)) {
      const size = Math.hypot(input.direction!.x, input.direction!.z);
      expect(size === 0 || Math.abs(size - 1) < 1e-9).toBe(true);
    }
    expect(moving.length).toBeLessThanOrEqual(Math.ceil(heldMs / 100) * 2 + 8);
    const firstToken = inputs.find((input) => input.movementInputToken)?.movementInputToken;
    await Promise.all(acknowledgementReads);
    await recordJson(info, 'movement-input', {
      heldMs,
      inputs,
      acknowledgements,
      unavailableAcknowledgements,
      scopeRotated: acknowledgements.some(
        (result) => result.inputScope && result.inputScope.movementInputToken !== firstToken,
      ),
    });
    await page.getByRole('button', { name: 'Settings and help', exact: true }).click();
    await page.getByRole('tab', { name: 'Controls & help', exact: true }).click();
    await page.getByLabel('Forward', { exact: true }).focus();
    await page.waitForTimeout(150);
    const stopped = inputs.length;
    await page.keyboard.press('w');
    await page.waitForTimeout(250);
    expect(inputs).toHaveLength(stopped);
  } finally {
    await page.keyboard.up('w').catch(() => {});
    await page.keyboard.up('d').catch(() => {});
    await page.close();
    await game.close();
  }
});

test('unarmed retained release evidence permits a deliberate neutral recovery through the visible controls', async ({
  page,
}) => {
  test.setTimeout(120000);
  const commands: Array<Record<string, unknown>> = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/command')) commands.push(request.postDataJSON());
  });
  const game = await start(page, executionWorld());
  try {
    await chooseDeer(page);
    await game.service.transition((original) => {
      const weapon = preferredTargetEquipment(original, PLAYER_ID)!;
      const begun = executeCommand(original, {
        id: 'restored-begin',
        actorId: PLAYER_ID,
        type: 'strike',
        definitionId: 'spear',
        weaponItemId: weapon.id,
        targetId: 'deer-1',
        manualExecution: true,
      });
      expect(begun.outcome.ok, begun.outcome.message).toBe(true);
      const held = entityGet(begun.world.entities, PLAYER_ID)!.actor!.action!;
      const released = executeCommand(begun.world, {
        id: 'retained-release',
        actorId: PLAYER_ID,
        type: 'release-strike',
        expectedActionId: held.id,
        releaseInput: { kind: 'timed-release', phase: 0.25 },
      });
      expect(released.outcome.ok, released.outcome.message).toBe(true);
      const ready = advanceWorld(released.world, 18);
      expect(
        entityGet(ready.world.entities, PLAYER_ID)!.actor!.action?.attackExecution?.pendingRelease,
      ).toBeDefined();
      return {
        ...ready,
        outcome: { ok: true, code: 'fixture', message: 'Retained unarmed preparation.' },
      };
    });
    const card = page.locator('.ol-attack-controls');
    await expect(card).toContainText('Ready to release');
    await expect(card.getByRole('button', { name: 'Release', exact: true })).toBeEnabled();
    await card.getByRole('button', { name: 'Release', exact: true }).click();
    await expect
      .poll(() => entityGet(game.service.world.entities, PLAYER_ID)?.actor?.action?.strikePhase)
      .toBe('recovery');
    const recovered = commands.filter(
      (body) => (body['command'] as { type: string }).type === 'release-strike',
    );
    expect(recovered).toHaveLength(1);
    expect((recovered[0]!['command'] as { execution?: unknown }).execution).toBeUndefined();
    expect(
      entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action!.attackExecution?.input,
    ).toEqual({ kind: 'ordinary' });
  } finally {
    await page.close();
    await game.close();
  }
});

test('mode off cancels the exact early release armed by consequence review confirmation', async ({
  page,
}) => {
  test.setTimeout(120000);
  const opening = structuredClone(executionWorld(0.5, 0.06, true));
  entityGet(opening.entities, NPC_ID)!.actor!.health = 100;
  const game = await start(page, freezeWorld(opening));
  try {
    await chooseDeer(page, NPC_ID);
    const card = page.locator('.ol-attack-controls');
    await card.getByRole('button', { name: 'Prepare', exact: true }).click();
    await expect
      .poll(
        () => !!entityGet(game.service.world.entities, PLAYER_ID)?.actor?.action?.attackExecution,
      )
      .toBe(true);
    // Controlled changed consequence: the current target becomes vulnerable
    // after preparation, so final release needs its own exact review.
    await editWorld(game.service, (world) => {
      entityGet(world.entities, NPC_ID)!.actor!.health = 1;
    });
    await card.getByRole('button', { name: 'Attack normally', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const confirm = dialog.getByRole('button', { name: 'Release attack', exact: true });
    await expect(confirm).toBeVisible();
    await confirm.click();
    await expect(dialog).toBeHidden();
    await expect
      .poll(
        () =>
          !!entityGet(game.service.world.entities, PLAYER_ID)?.actor?.action?.attackExecution
            ?.pendingRelease,
      )
      .toBe(true);
    await page.getByRole('button', { name: 'Attack mode on', exact: true }).click();
    await expect
      .poll(() => entityGet(game.service.world.entities, PLAYER_ID)?.actor?.action)
      .toBeNull();
    await game.service.tick(0.35, 0);
    expect(
      game.service.world.events.filter(
        (event) => event.type === 'struck' && event.actorId === PLAYER_ID,
      ),
    ).toHaveLength(0);
  } finally {
    await page.close();
    await game.close();
  }
});

test('initial consequence confirmation admits only a fresh preparation and drops the old pointer up', async ({
  page,
}) => {
  test.setTimeout(120000);
  const game = await start(page, executionWorld(0.5, 0.06, true));
  try {
    await chooseDeer(page, NPC_ID);
    const bounds = await page.locator('.ol-attack-reticle').boundingBox();
    await page.mouse.click(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
    const confirm = page
      .getByRole('dialog')
      .getByRole('button', { name: 'Prepare attack', exact: true });
    await expect(confirm).toBeVisible();
    expect(entityGet(game.service.world.entities, PLAYER_ID)?.actor?.action).toBeNull();
    await confirm.click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('.ol-timing-ring')).toBeVisible();
    await page.waitForTimeout(350);
    await game.service.tick(0.35, 0, { offeredUntil: performance.now() });
    await expect
      .poll(
        () =>
          entityGet(game.service.world.entities, PLAYER_ID)?.actor?.action?.attackExecution?.ready,
      )
      .toBe(true);
    expect(
      entityGet(game.service.world.entities, PLAYER_ID)?.actor?.action?.attackExecution
        ?.pendingRelease,
    ).toBeUndefined();
    expect(
      game.service.world.events.filter(
        (event) => event.type === 'struck' && event.actorId === PLAYER_ID,
      ),
    ).toHaveLength(0);
    await page
      .locator('.ol-attack-controls')
      .getByRole('button', { name: 'Cancel', exact: true })
      .click();
    await expect
      .poll(() => entityGet(game.service.world.entities, PLAYER_ID)?.actor?.action)
      .toBeNull();
  } finally {
    await page.close();
    await game.close();
  }
});

test('attack buttons remain keyboard usable in a narrow forced-color reduced-motion view', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  const game = await start(page, executionWorld());
  try {
    await chooseDeer(page);
    const card = page.locator('.ol-attack-controls');
    await card.getByRole('button', { name: 'Prepare', exact: true }).click();
    await expect(page.locator('.ol-timing-ring')).toBeVisible();
    await expect(card.getByRole('slider')).toHaveCount(0);
    await expect(card.getByRole('button', { name: 'Release', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath('narrow-forced-color-buttons.png') });
    await card.getByRole('button', { name: 'Cancel', exact: true }).focus();
    await card.getByRole('button', { name: 'Cancel', exact: true }).press('Enter');
    await expect
      .poll(() => entityGet(game.service.world.entities, PLAYER_ID)?.actor?.action)
      .toBeNull();
    await expect(card.getByRole('button', { name: 'In view', exact: true })).toBeFocused();
  } finally {
    await page.close();
    await game.close();
  }
});

test.afterAll(closeTestDatabases);

test('a no-profile held gesture follows the pointer and cancellation never invokes the ordinary attack', async ({
  page,
}) => {
  test.setTimeout(120000);
  const commands: Array<Record<string, unknown>> = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/command')) commands.push(request.postDataJSON());
  });
  const game = await start(page, executionWorld(0.5, 0.06, false, false));
  try {
    await chooseDeer(page);
    const reticle = page.locator('.ol-attack-reticle');
    const before = await reticle.boundingBox();
    expect(before).not.toBeNull();
    const origin = { x: before!.x + before!.width / 2, y: before!.y + before!.height / 2 };
    await page.mouse.move(origin.x, origin.y);
    await page.mouse.down();
    await page.mouse.move(origin.x + 85, origin.y + 25, { steps: 10 });
    await expect
      .poll(async () => {
        const actual = await reticle.boundingBox();
        return actual ? Math.round(actual.x - before!.x) : 0;
      })
      .toBe(85);
    await expect(page.locator('.ol-timing-ring')).toBeHidden();
    await page.keyboard.press('Escape');
    await page.mouse.up();
    expect(
      commands.filter((body) => (body['command'] as { type: string }).type === 'strike'),
    ).toHaveLength(0);
    expect(entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action).toBeNull();
    // Releasing an ordinary melee gesture elsewhere must neither strike the old
    // subject nor leave local preparation blocking the next deliberate press.
    await page.mouse.move(origin.x, origin.y);
    await page.mouse.down();
    await page.mouse.move(origin.x + 85, origin.y + 25, { steps: 10 });
    await page.mouse.up();
    expect(
      commands.filter((body) => (body['command'] as { type: string }).type === 'strike'),
    ).toHaveLength(0);
    await page.mouse.move(origin.x, origin.y);
    await page.mouse.down();
    await page.mouse.up();
    await expect
      .poll(
        () =>
          commands.filter((body) => (body['command'] as { type: string }).type === 'strike').length,
      )
      .toBe(1);
    const attack = commands.find(
      (body) => (body['command'] as { type: string }).type === 'strike',
    )!;
    expect((attack['command'] as { execution?: unknown }).execution).toBeUndefined();
  } finally {
    await page.close();
    await game.close();
  }
});
