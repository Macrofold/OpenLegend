// Temporary native UIUX09/J11 completion observation; run from the repository root.
// Usage: AI_BUDGET_USD=0 OPENLEGEND_TEST_DATABASE_URL=<loopback admin URL> \
//   node --import tsx scripts/ui-completion-care.mjs /tmp/openlegend-ui-care-evidence
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const expectedSource = {
  'apps/client/src/ui/camp-activity.css':
    '046caa58a4951675f0c72df29e503a6738df817418a1339799a53cfd3f9b6a38',
  'apps/client/src/design-system/layout.css':
    '621f558c3efabdd95355bfb7d36df238031e8880afa1f08124793a1d40c4fec3',
  'apps/server/src/http.ts': 'a9d1250b85eca350e29ae63468a164adb394808fb27f9141c28fbbd589ecb7cf',
  'apps/server/src/world-service.ts':
    'b6f71fb68d46f780299cf910e3a85a30145f16fc32a5f2c7337649382c450cce',
  'apps/server/src/activity-requests.ts':
    '4a97ccf680dccfb4ec3461d637eb8f3ddebfc4a5e4a64481b7b16effb3f8856a',
  'apps/server/src/view.ts': '2e7adf59d54f158b37ec4069b4bb21ba7d7a8c13ffc5502f6432df6d580299a9',
  'apps/client/src/main.tsx': 'fe9761baa102d82aaf54f8a505f24d9739e41a17ca8f02fb24cc91145c55bf44',
  'apps/client/src/ui/camp-activity.tsx':
    '77ccab48f2952bbc245c991ecb1b690ea480c971c2e1e65f140c8ef149b0d446',
  'apps/client/src/ui/activity-object-field.tsx':
    'f3d04b26b7f2665e282bb9834550bb923e9d2f608a7696c90cfed2cd2530a3f8',
  'packages/domain/src/kernel.ts':
    '8c1c6fa3dd6fc0422687ddc2307440a9e3ecf6a25280c4766fc3a9504761e02d',
  'packages/domain/src/activity-execution.ts':
    '5c05040ce17f602d697106c0789caf4addd9df0f80d13b1320e8bb7a2c6c3dd1',
  'packages/domain/src/worlds/base/camp-activity.ts':
    '523be0ea84d2c59f107c3b8abaaf563b965cea30e2a7450fddfa31fd0ab6f8e7',
  'packages/domain/src/worlds/base/fire.ts':
    '650d2cf3969424806b555c8f1b02c0e63bf3e3d4b71231302c0fc263d923e858',
  'packages/domain/src/worlds/base/fire-rules.ts':
    '6f20cd53fcde0834da78c8e55fc5f895a2f12f1658081ed89d474d1ba3665e02',
  'tests/fixtures/database.ts': '3566c92c90fe0122e01da0177eefa3142836e1ed6c86b845526348c54c16ac92',
  'tests/fixtures/service.ts': '5d1e9ee6e7fde39f8d7f8e37daa9561d3ad29f77a67e1feb44796e95593052a1',
  'tests/fixtures/browser.ts': '61673a8e30aa3431bc91a4f1149778ef7da26c68cd827541048478b6c59f38b2',
};
const output = resolve(process.argv[2] ?? '/tmp/openlegend-ui-care-evidence');
await mkdir(dirname(output), { recursive: true });
await mkdir(output); // A new invocation cannot overwrite an earlier observation.
const report = {
  startedAt: new Date().toISOString(),
  checkout: process.env.GITHUB_SHA ?? 'a367c4d1b641d73f5431ff48071076faac571394',
  runtimeSource: 'a367c4d1b641d73f5431ff48071076faac571394',
  scope:
    'Completed native fire-care presentation at desktop, narrow and short sizes. One real short terminal result is followed by explicitly supplied longer display text on the same completed plan; native lifecycle qualification is reused and no work is restarted.',
  limits: {
    workMs: 120000,
    hardMs: 150000,
    actionMs: 10000,
    assertionMs: 5000,
    navigationMs: 20000,
    captureMs: 10000,
  },
  limitations: [
    'Reachable player stance and 600 seconds of fire fuel are supplied fixture setup after real local App entry.',
    'Native time is offered explicitly; this is not wall-clock pacing, walking, multiplayer, provider, assistive-input or human-usability evidence.',
    'The long task name and expanded reason are supplied presentation-fixture prose on the same completed plan, not naturally generated gameplay prose. No alternate-world qualification is attempted.',
  ],
  commands: [],
  clocks: [],
  captures: [],
  observations: [],
  pageErrors: [],
  unexpectedRequests: [],
  cleanup: {},
  passed: false,
  providerCostUsd: 0,
  cumulativeTaskProviderCostUsd: 0,
};
let browser,
  context,
  page,
  game,
  store,
  database,
  headers,
  base,
  traceStarted = false,
  expired = false;
const text = (error) => (error instanceof Error ? (error.stack ?? error.message) : String(error));
const fail = (error) => {
  report.failure ??= text(error);
  report.passed = false;
};
const workTimer = setTimeout(() => {
  expired = true;
  fail(new Error('Original 120-second observation work bound expired.'));
  void browser?.close().catch(fail);
}, report.limits.workMs);
const hardTimer = setTimeout(() => {
  fail(new Error('Original 150-second hard bound expired; cleanup is incomplete.'));
  report.cleanup.forcedTermination = true;
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  process.exit(1);
}, report.limits.hardMs);
const nativeImport = (path) => import(pathToFileURL(resolve(root, path)).href);
try {
  // The shared fixture owner validates the explicit loopback URL and creates/drops
  // only its own fresh database; do not inherit an application database URL.
  assert.ok(
    process.env.OPENLEGEND_TEST_DATABASE_URL,
    'Set OPENLEGEND_TEST_DATABASE_URL to an explicit loopback PostgreSQL admin URL.',
  );
  for (const [path, expected] of Object.entries(expectedSource)) {
    const actual = createHash('sha256')
      .update(await readFile(resolve(root, path)))
      .digest('hex');
    assert.equal(actual, expected, 'Source pin: ' + path);
  }
  report.sourceSha256 = expectedSource;
  report.runnerSha256 = createHash('sha256')
    .update(await readFile(new URL(import.meta.url)))
    .digest('hex');
  report.builtEntrySha256 = createHash('sha256')
    .update(await readFile(resolve(root, 'dist/client/index.html')))
    .digest('hex');
  const { chromium, expect: baseExpect } = createRequire(resolve(root, 'package.json'))(
    '@playwright/test',
  );
  const expect = baseExpect.configure({ timeout: report.limits.assertionMs });
  const [http, db, fixture, entry, domain, spatialState, spatial, capability, actions] =
    await Promise.all([
      nativeImport('apps/server/src/http.ts'),
      nativeImport('tests/fixtures/database.ts'),
      nativeImport('tests/fixtures/service.ts'),
      nativeImport('tests/fixtures/browser.ts'),
      nativeImport('packages/domain/src/index.ts'),
      nativeImport('packages/domain/src/spatial-state.ts'),
      nativeImport('packages/spatial/src/index.ts'),
      nativeImport('packages/domain/src/action-capabilities.ts'),
      nativeImport('packages/domain/src/worlds/base/actions.ts'),
    ]);
  database = db;
  const { PLAYER_ID, itemsForOwner, BASE_FIRE_CARE, canReachEntity, seesEntity } = domain;
  const config = db.readConfig({
    WORLD_SEED: '73',
    AI_BUDGET_USD: '0',
    OPEN_LEGEND_GOD_MODE: 'false',
    OPEN_LEGEND_AUTH_MODE: 'local',
  });
  assert.equal(config.budgetUsd, 0);
  assert.equal(config.godMode, false);
  for (const key of [
    'jevKey',
    'llmKey',
    'embeddingKey',
    'macrofoldKey',
    'macrofoldProviderConnectionId',
    'macrofoldJevConnectionId',
    'macrofoldWorldConnectionId',
  ])
    assert.equal(config[key], '');
  store = await db.testRepository();
  const fixedNow = Date.now();
  game = await http.createGameServer({
    config,
    store,
    production: true,
    tick: false,
    now: () => fixedNow,
  });
  await new Promise((resolve, reject) => {
    game.server.once('error', reject);
    game.server.listen(0, '127.0.0.1', resolve);
  });
  base = 'http://127.0.0.1:' + game.server.address().port;
  browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  report.browser = browser.version();
  context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await context.tracing.start({ screenshots: false, snapshots: true, sources: true });
  traceStarted = true;
  page = await context.newPage();
  page.setDefaultTimeout(report.limits.actionMs);
  page.setDefaultNavigationTimeout(report.limits.navigationMs);
  page.on('pageerror', (error) => report.pageErrors.push(error.message));
  const requests = [];
  report.sentCommands = requests;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== base && !['data:', 'blob:'].includes(url.protocol))
      report.unexpectedRequests.push(url.origin + url.pathname);
    if (
      /^\/api\/(?:god|chat|invent|inventions|world-agent)(?:\/|$)/.test(url.pathname) &&
      request.method() === 'POST'
    )
      report.unexpectedRequests.push(url.pathname);
    if (url.pathname === '/api/command') requests.push(request.postDataJSON());
    const seen = request.headers();
    if (seen['x-ol-client'] && seen['x-ol-scope'])
      headers = {
        Origin: base,
        'X-OL-Client': seen['x-ol-client'],
        'X-OL-Scope': seen['x-ol-scope'],
      };
  });
  await page.goto(base + '/auth/login');
  await entry.enterGame(page);
  await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
  const actor = () => game.service.world.entities[PLAYER_ID].actor;
  const wood = () =>
    itemsForOwner(game.service.world, PLAYER_ID)
      .filter((item) => item.definitionId === 'wood')
      .reduce((sum, item) => sum + item.quantity, 0);
  const fuel = () => game.service.world.entities.campfire.heat.fuelSeconds;
  const fuelEvents = () =>
    game.service.world.events.filter(
      (event) =>
        event.type === 'fire-fueled' &&
        event.actorId === PLAYER_ID &&
        event.targetId === 'campfire',
    );
  async function read(path, body) {
    assert.equal(expired, false);
    assert.ok(headers, 'Authority must come from this actual App page.');
    const response =
      body === undefined
        ? await page.request.get(base + path, { headers, timeout: 10000 })
        : await page.request.post(base + path, { headers, data: body, timeout: 10000 });
    assert.equal(response.status(), 200, path);
    return response.json();
  }
  async function state() {
    const value = await read('/api/state');
    assert.equal(value.player.id, PLAYER_ID);
    assert.equal(value.worldId, 'wilderness-73');
    assert.equal(value.access.controlling, true);
    assert.equal(value.clock.paused, false);
    assert.equal(value.godMode, false);
    return value;
  }
  async function advance(label, seconds) {
    assert.ok(seconds > 0 && seconds <= 60);
    assert.equal(expired, false);
    await expect.poll(() => domain.navigationBlocked(game.service.world)).toBe(false);
    const before = game.service.world.simTime,
      target = before + seconds;
    await game.service.tick(seconds / (config.baseRatio * game.service.speed), 0);
    await expect
      .poll(async () => {
        await game.service.tick(0, 0);
        return Math.abs(game.service.world.simTime - target) < 1e-6;
      })
      .toBe(true);
    report.clocks.push({ label, seconds, before, after: game.service.world.simTime });
    return state();
  }
  async function capture(name) {
    assert.ok(report.captures.length < 6);
    const started = Date.now();
    report.captureInProgress = name;
    await page.screenshot({ path: join(output, name), timeout: report.limits.captureMs });
    const bytes = await readFile(join(output, name));
    report.captures.push({
      name,
      elapsedMs: Date.now() - started,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
    delete report.captureInProgress;
  }
  // Fixture setup ends here: one supported stance, no gathered/spawned supplies or altered laws.
  assert.equal(wood(), 2);
  assert.equal(game.service.world.simTime, 0);
  assert.equal(actor().action, null);
  assert.equal(fuelEvents().length, 0);
  report.fixture = await fixture.editWorld(game.service, (world) => {
    const player = world.entities[PLAYER_ID],
      fire = world.entities.campfire;
    const beforePosition = spatialState.worldPosition(player),
      firePosition = spatialState.worldPosition(fire);
    const reach = Math.min(
      world.itemHandling.reach,
      actions.BASE_ACTION_DEFAULTS.interactionRadius,
    );
    const stance = capability.targetApproachPoint(world, player, fire, reach);
    assert.ok(stance, 'An existing native fire-handling stance must be available.');
    assert.equal(
      spatial.canStand(spatialState.spatialMap(world), stance, player.spatial.body),
      true,
    );
    spatialState.setSpatialPosition(world, player, stance, stance.surfaceId);
    assert.equal(canReachEntity(world, player, fire, reach), true);
    assert.equal(seesEntity(world, player, fire), true);
    assert.equal(fire.heat.lit, true);
    const priorFuel = fire.heat.fuelSeconds;
    fire.heat.fuelSeconds = 600;
    return {
      beforePosition,
      stance,
      firePosition,
      priorFuel,
      preparedFuel: 600,
      nativeCarriedBranches: 2,
    };
  });
  await state();
  assert.equal(requests.length, 0);
  await page.getByRole('button', { name: 'In view', exact: true }).click();
  const nearby = page.locator('#nearbyPanel');
  await nearby.locator('[data-entity="campfire"]').getByRole('button').click();
  const fireEntry = nearby.getByRole('button', { name: /^Watch this fire for one session/ });
  await fireEntry.click();
  const taskPanel = page.locator('#activityPanel'),
    task = taskPanel.locator('.ol-camp-activities');
  await expect(taskPanel).toBeVisible();
  await task.getByRole('button', { name: 'Change supply', exact: true }).click();
  await task.getByRole('button', { name: 'Choose fuel material…', exact: true }).click();
  const material = page.getByRole('dialog', { name: 'Choose fuel material', exact: true });
  await material.getByRole('button', { name: 'Choose Supple branch', exact: true }).click();
  await expect(material).toBeHidden();
  await task.getByRole('button', { name: 'Done', exact: true }).click();
  await task.getByRole('button', { name: 'Change amount', exact: true }).click();
  await task.getByLabel('Maximum fuel units').fill('1');
  await task.getByLabel('Leave at least this many available to me').fill('1');
  await task.getByRole('button', { name: 'Done', exact: true }).click();
  await task.getByRole('button', { name: 'Change stopping time', exact: true }).click();
  await task.getByLabel('Duration (game minutes)').fill('1');
  await task.getByRole('button', { name: 'Done', exact: true }).click();
  assert.equal(requests.length, 0);
  assert.equal(wood(), 2);
  const deadline = game.service.world.simTime + 60;
  const start = task.getByRole('button', { name: 'Start task', exact: true });
  await expect(start).toBeEnabled();
  await start.focus();
  await expect(start).toBeFocused();
  const [response] = await Promise.all([
    page.waitForResponse((reply) => new URL(reply.url()).pathname === '/api/command'),
    start.press('Enter'),
  ]);
  assert.equal(response.status(), 200);
  assert.equal(requests.length, 1);
  const request = response.request().postDataJSON(),
    result = await response.json();
  assert.deepEqual(request.command, {
    type: 'activity-request',
    activityFamilyId: 'base:fire-watch',
    activityArguments: {
      fireId: 'campfire',
      sourceId: PLAYER_ID,
      definitionId: 'wood',
      minimumHeld: 1,
      mode: 'enqueue',
      deadline,
      maxUnits: 1,
    },
  });
  assert.equal(result.ok, true, result.message);
  assert.equal(result.message, 'Started the task.');
  const receipt = await read('/api/command/receipt', request);
  assert.equal(receipt.status, 'resolved');
  assert.equal(receipt.result.ok, true);
  assert.equal(receipt.result.code, result.code);
  assert.equal(receipt.result.message, result.message);
  report.commands.push({ input: 'Enter on focused Start task', request, result, receipt });
  const planId = actor().agency.plan.id;
  assert.equal(actor().agency.plan.activity.control.deadline, deadline);
  await expect(task).toHaveAttribute('aria-label', 'Current work');
  await expect(start).toBeHidden();
  await expect(task).toBeFocused();
  const partial = await advance(
    'Half of the one admitted native fuel action',
    BASE_FIRE_CARE.fuel.workSeconds / 2,
  );
  // Native advancement sums fractional ticks; allow only floating-point roundoff.
  assert.ok(Math.abs(partial.player.action.progress - 0.5) <= Number.EPSILON);
  assert.equal(wood(), 2);
  assert.equal(fuelEvents().length, 0);
  const fueled = await advance(
    'Complete one native fuel action',
    BASE_FIRE_CARE.fuel.workSeconds / 2,
  );
  assert.equal(actor().action, null);
  assert.equal(fueled.player.activity.status, 'waiting');
  assert.equal(fueled.player.activity.spent, 1);
  assert.equal(wood(), 1);
  assert.equal(fuelEvents().length, 1);
  assert.ok(Math.abs(fuel() - (600 - 20 + BASE_FIRE_CARE.fuel.secondsPerUnit)) < 1e-6);
  const waiting = await advance('Remain attending until one second before the chosen deadline', 39);
  assert.equal(game.service.world.simTime, deadline - 1);
  assert.equal(waiting.player.activity.status, 'waiting');
  assert.equal(actor().agency.plan.status, 'active');
  assert.notEqual(actor().agency.plan.activity.terminal, true);
  await expect(task.locator('.ol-task-status')).toContainText('Used 1 of at most 1');
  await expect(task.getByRole('button', { name: 'Stop all work', exact: true })).toBeEnabled();
  // Prior lifecycle evidence already captured the active watch; this pass captures the result.
  const completed = await advance(
    'Reach the exact chosen stopping time without Stop or replacement',
    1,
  );
  let expectedReason = 'The chosen stopping time was reached.';
  function terminal() {
    assert.equal(actor().agency.plan.id, planId);
    assert.equal(actor().agency.plan.status, 'completed');
    assert.equal(actor().agency.plan.activity.terminal, true);
    assert.deepEqual(actor().agency.plan.activity.pending, []);
    assert.equal(actor().agency.plan.activity.reason, expectedReason);
    assert.equal(actor().agency.plan.activity.spent, 1);
    assert.equal(actor().agency.plan.activity.attempts, 1);
    assert.equal(actor().action, null);
    assert.equal(actor().agency.suspended ?? null, null);
    assert.equal(wood(), 1);
    assert.equal(fuelEvents().length, 1);
    assert.equal(requests.length, 1);
  }
  async function terminalPresentation() {
    await expect(task).toHaveAttribute('aria-label', 'Last task');
    await expect(task.getByRole('heading', { name: 'Last task', exact: true })).toBeVisible();
    await expect(task.locator('.ol-task-status')).toContainText(
      'Chosen stopping time Day 1 · 08:01.',
    );
    await expect(task.locator('.ol-task-status')).not.toContainText('Stops at');
    await expect(start).toBeHidden();
    await expect(page.locator('.ol-current-work')).toBeHidden();
  }
  terminal();
  assert.equal(completed.player.hasWork, false);
  assert.equal(completed.player.activity.status, 'completed');
  await expect(task.locator('.ol-task-status')).toContainText(
    'The chosen stopping time was reached.',
  );
  await expect(task.getByRole('button', { name: 'Stop all work', exact: true })).toBeHidden();
  await terminalPresentation();
  report.observations.push({
    label: 'native deadline reached',
    planId,
    completed: completed.player.activity,
    simTime: game.service.world.simTime,
    visibleTaskText: await task.innerText(),
    taskAccessibleName: await task.getAttribute('aria-label'),
    visibleHudCurrentWork: await page.locator('.ol-current-work').isVisible(),
  });
  let terminalPlan = JSON.stringify(actor().agency.plan);
  await taskPanel.getByRole('button', { name: /^Hide / }).click();
  await fireEntry.click();
  await expect(taskPanel).toBeVisible();
  await expect(
    task.getByRole('button', { name: 'Prepare another task', exact: true }),
  ).toBeVisible();
  await expect(start).toBeHidden();
  await expect(task.locator('.ol-task-status')).toContainText(
    'The chosen stopping time was reached.',
  );
  await expect(task.getByRole('button', { name: 'Stop all work', exact: true })).toBeHidden();
  await terminalPresentation();
  terminal();
  assert.equal(JSON.stringify(actor().agency.plan), terminalPlan);
  report.observations.push({
    label: 'completed task reopened',
    visibleTaskText: await task.innerText(),
    statusText: await task.locator('.ol-task-status').innerText(),
    taskAccessibleName: await task.getAttribute('aria-label'),
    visibleHudCurrentWork: await page.locator('.ol-current-work').isVisible(),
    headingText: await task.getByRole('heading').allTextContents(),
  });
  async function readingCase(kind, viewport) {
    await page.setViewportSize(viewport);
    await expect(task).toHaveAttribute('data-completed', 'true');
    await expect(taskPanel).toBeVisible();
    await terminalPresentation();
    const heading = task.getByRole('heading', { name: 'Last task', exact: true });
    const acknowledgement = task.getByRole('status').filter({ hasText: 'Started the task.' });
    const prepare = task.getByRole('button', { name: 'Prepare another task', exact: true });
    await expect(task.locator('.ol-task-status')).toContainText(expectedReason);
    await expect(acknowledgement).toHaveText('Started the task.');
    await expect(task.locator('.ol-task-status')).toContainText('Chosen stopping time');
    for (const readable of [
      heading,
      task.getByText(expectedReason, { exact: true }),
      task.locator('.ol-task-status > p').filter({ hasText: 'Chosen stopping time' }),
      acknowledgement,
    ]) {
      await readable.scrollIntoViewIfNeeded();
      await expect(readable).toBeInViewport();
    }
    // Starting at the task's ordinary focus stop follows the real Tab route. The
    // browser must scroll the final deliberate action into the same bounded panel.
    await task.focus();
    await page.keyboard.press('Tab');
    await expect(prepare).toBeFocused();
    await expect(prepare).toBeInViewport();
    const geometry = await taskPanel.evaluate((panel) => {
      const task = panel.querySelector('.ol-camp-activities');
      const body = panel.querySelector('.ol-panel-body');
      const header = panel.querySelector('.ol-panel-head');
      const box = (node) => {
        const r = node.getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          bottom: r.bottom,
          right: r.right,
        };
      };
      return {
        panel: box(panel),
        task: box(task),
        body: box(body),
        header: box(header),
        bodyClientHeight: body.clientHeight,
        bodyScrollHeight: body.scrollHeight,
        bodyScrollTop: body.scrollTop,
        horizontalOverflow: body.scrollWidth - body.clientWidth,
        activeText: document.activeElement?.textContent,
        taskText: task.innerText,
        bottomSpace: body.getBoundingClientRect().bottom - task.getBoundingClientRect().bottom,
      };
    });
    assert.ok(geometry.panel.x >= -1 && geometry.panel.right <= viewport.width + 1);
    assert.ok(geometry.panel.y >= -1 && geometry.panel.bottom <= viewport.height + 1);
    assert.ok(geometry.horizontalOverflow <= 1, 'No horizontal reading overflow.');
    if (kind === 'short' && viewport.width === 1440) {
      assert.ok(
        geometry.bottomSpace <= 48,
        'Short completed task must not retain a large blank body.',
      );
      assert.ok(geometry.panel.height < viewport.height / 2, 'Short result uses content height.');
    }
    report.observations.push({ label: kind + ' terminal reading', viewport, geometry });
    await capture(kind + '-' + viewport.width + 'x' + viewport.height + '.png');
    terminal();
    assert.equal(JSON.stringify(actor().agency.plan), terminalPlan);
  }
  for (const viewport of [
    { width: 1440, height: 960 },
    { width: 390, height: 844 },
    { width: 390, height: 420 },
  ])
    await readingCase('short', viewport);

  await page.setViewportSize({ width: 1440, height: 960 });
  const longName =
    'Attend the sheltered campfire beside the fallen cedar while keeping one supple branch in reserve for a later meal, checking the remaining fuel through the chosen morning watch and leaving the completed work available to read before deliberately preparing another task';
  const longReason =
    'The chosen stopping time was reached. The one permitted branch had already been used, and the remaining branch stayed available to the character. The fire was left in its recorded condition. Reading this retained result, changing the window size, hiding the panel or returning to preparation does not repeat the completed fuel action or begin another watch.';
  report.longContentFixture = { name: longName, reason: longReason, supportedNameLimit: 500 };
  assert.ok(longName.length <= 500);
  await fixture.editWorld(game.service, (world) => {
    const execution = world.entities[PLAYER_ID].actor.agency.plan.activity;
    execution.request.name = longName;
    execution.reason = longReason;
  });
  expectedReason = longReason;
  terminalPlan = JSON.stringify(actor().agency.plan);
  await state();
  await expect(task.locator('.ol-task-status')).toContainText(longName);
  for (const viewport of [
    { width: 1440, height: 960 },
    { width: 390, height: 844 },
    { width: 390, height: 420 },
  ])
    await readingCase('long', viewport);

  await page.setViewportSize({ width: 1440, height: 960 });
  const prepareNext = task.getByRole('button', { name: 'Prepare another task', exact: true });
  await prepareNext.focus();
  await prepareNext.press('Enter');
  await expect(task.getByRole('button', { name: 'Change supply', exact: true })).toBeFocused();
  await task.getByRole('button', { name: 'Change amount', exact: true }).click();
  await expect(task.getByLabel('Maximum fuel units')).toHaveValue('1');
  await expect(task.getByLabel('Leave at least this many available to me')).toHaveValue('1');
  await task.getByRole('button', { name: 'Done', exact: true }).click();
  await task.getByRole('button', { name: 'Change stopping time', exact: true }).click();
  await expect(task.getByLabel('Duration (game minutes)')).toHaveValue('1');
  await task.getByRole('button', { name: 'Done', exact: true }).click();
  const final = await advance('No native restart or extra debit after reopen and preparation', 1);
  terminal();
  assert.equal(JSON.stringify(actor().agency.plan), terminalPlan);
  assert.equal(final.player.hasWork, false);
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.unexpectedRequests, []);
  assert.deepEqual(await store.recentJobs(), []);
  assert.equal(final.ai.budget.spentUsd, 0);
  assert.equal(final.ai.budget.reservedUsd, 0);
  assert.equal(final.ai.usage.llmCalls + final.ai.usage.jevCalls, 0);
  report.final = {
    simTime: game.service.world.simTime,
    commands: requests.length,
    planId,
    status: final.player.activity,
    branches: wood(),
    fuelEvents: fuelEvents().map((event) => event.id),
    noRestart: true,
    noPaidJobs: true,
  };
  assert.equal(expired, false);
  assert.equal(report.failure, undefined);
  assert.equal(report.captures.length, 6);
  report.passed = true;
} catch (error) {
  fail(error);
} finally {
  clearTimeout(workTimer);
  async function cleanup(name, action) {
    try {
      await action();
      report.cleanup[name] = true;
    } catch (error) {
      report.cleanup[name] = text(error);
      fail(error);
    }
  }
  if (traceStarted)
    await cleanup('traceSaved', () => context.tracing.stop({ path: join(output, 'trace.zip') }));
  if (context) await cleanup('contextClosed', () => context.close());
  if (game)
    await cleanup('nativeShutdown', async () => {
      const result = await game.shutdown();
      report.cleanup.shutdown = result;
      assert.equal(result.saved, true);
      assert.deepEqual(result.problems, []);
    });
  if (store) await cleanup('repositoryClosed', () => store.close());
  if (browser) await cleanup('browserClosed', () => browser.close());
  if (database) await cleanup('disposableDatabasesDropped', () => database.closeTestDatabases());
  report.finishedAt = new Date().toISOString();
  report.elapsedMs = Date.parse(report.finishedAt) - Date.parse(report.startedAt);
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  // Do not keep a clean process alive; still fail if an owned handle prevents exit.
  hardTimer.unref();
}
console.log(
  JSON.stringify({
    passed: report.passed,
    output,
    failure: report.failure,
    elapsedMs: report.elapsedMs,
  }),
);
process.exitCode = report.passed ? 0 : 1;
