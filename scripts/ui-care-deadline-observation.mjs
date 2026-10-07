// Temporary native UIUX09/J11 observation. Run from the repository cwd with --import tsx.
// Usage: node --import tsx /path/observe-care-deadline.mjs test-results/care-deadline/evidence
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const expectedSource = {
  'apps/server/src/http.ts': '000a7e52fce26595ac4dacef53b23c6dcf1dc2f3c1013dfc4ee863356263232e',
  'apps/server/src/world-service.ts':
    '5ad4f9e65d5d5f32a81d0d1b624f4646cb41372a77bd8450418d842fb23ec06c',
  'apps/server/src/activity-requests.ts':
    '39117264f341c7a34dce19f37c04934dea5d1d73de1eb4eef375d211367055f7',
  'apps/server/src/view.ts': '959cd104b3ac942dda98639fbf406526517ba785baf2d74341ea4965528dd04b',
  'apps/client/src/main.tsx': '08c4e291889452e20d3d94ccd14f5ec66d3fb57322ee850039bc810bcbbd7e62',
  'apps/client/src/ui/camp-activity.tsx':
    'd34320bfb66eb78c3eb12654840bfe95e4994d74ccd452ce93361fc13caaa438',
  'apps/client/src/ui/activity-object-field.tsx':
    'f3d04b26b7f2665e282bb9834550bb923e9d2f608a7696c90cfed2cd2530a3f8',
  'packages/domain/src/kernel.ts':
    '55b21d7ef2796aeb97baaa5f624ddce3292cd8926953d6b8655ad87dc374b3f6',
  'packages/domain/src/activity-execution.ts':
    '47939664362dd2940596721f733e6ee8adbbd1a166eef0a63fd4c7b92189862b',
  'packages/domain/src/worlds/base/camp-activity.ts':
    'abb0c0251261cea2f7bd336d72b62e49ea2e46a2137d8330308d5122f746f3c2',
  'packages/domain/src/worlds/base/fire.ts':
    'deed0892de04002b67f3f8aa08633e066da6143b51ea08202da86f3be0c0c14b',
  'packages/domain/src/worlds/base/fire-rules.ts':
    '6f20cd53fcde0834da78c8e55fc5f895a2f12f1658081ed89d474d1ba3665e02',
  'tests/fixtures/database.ts': '3566c92c90fe0122e01da0177eefa3142836e1ed6c86b845526348c54c16ac92',
  'tests/fixtures/service.ts': 'e5322bfac774e1a952d3bced7569958389525adf271026a18d2512b1a73f21e7',
  'tests/fixtures/browser.ts': '61673a8e30aa3431bc91a4f1149778ef7da26c68cd827541048478b6c59f38b2',
};
const output = resolve(process.argv[2] ?? 'test-results/care-deadline/evidence');
await mkdir(dirname(output), { recursive: true });
await mkdir(output); // A new invocation cannot overwrite an earlier observation.
const report = {
  startedAt: new Date().toISOString(),
  checkout: process.env.GITHUB_SHA ?? 'unrecorded',
  scope:
    'Redesigned fire-care completion and return presentation through the native deadline; reopening and preparation do not restart it. Prior NP04 evidence supplies scheduler qualification.',
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
const nativeImport = (path) => import(pathToFileURL(resolve(path)).href);
try {
  for (const [path, expected] of Object.entries(expectedSource)) {
    const actual = createHash('sha256')
      .update(await readFile(path))
      .digest('hex');
    assert.equal(actual, expected, 'Source pin: ' + path);
  }
  report.sourceSha256 = expectedSource;
  report.runnerSha256 = createHash('sha256')
    .update(await readFile(new URL(import.meta.url)))
    .digest('hex');
  report.builtEntrySha256 = createHash('sha256')
    .update(await readFile('dist/client/index.html'))
    .digest('hex');
  const { chromium, expect: baseExpect } = createRequire(resolve('package.json'))(
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
    assert.ok(report.captures.length < 2);
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
      spatial.canStand(
        spatialState.spatialMap(world),
        stance,
        spatial.BODY_PROFILES[player.spatial.bodyProfileId],
      ),
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
  await capture('01-waiting-one-second-before-deadline.png');
  const completed = await advance(
    'Reach the exact chosen stopping time without Stop or replacement',
    1,
  );
  function terminal() {
    assert.equal(actor().agency.plan.id, planId);
    assert.equal(actor().agency.plan.status, 'completed');
    assert.equal(actor().agency.plan.activity.terminal, true);
    assert.deepEqual(actor().agency.plan.activity.pending, []);
    assert.equal(actor().agency.plan.activity.reason, 'The chosen stopping time was reached.');
    assert.equal(actor().agency.plan.activity.spent, 1);
    assert.equal(actor().agency.plan.activity.attempts, 1);
    assert.equal(actor().action, null);
    assert.equal(actor().agency.suspended ?? null, null);
    assert.equal(wood(), 1);
    assert.equal(fuelEvents().length, 1);
    assert.equal(requests.length, 1);
  }
  terminal();
  assert.equal(completed.player.hasWork, false);
  assert.equal(completed.player.activity.status, 'completed');
  await expect(task.locator('.ol-task-status')).toContainText(
    'The chosen stopping time was reached.',
  );
  await expect(task.getByRole('button', { name: 'Stop all work', exact: true })).toBeHidden();
  report.observations.push({
    label: 'native deadline reached',
    planId,
    completed: completed.player.activity,
    simTime: game.service.world.simTime,
    visibleTaskText: await task.innerText(),
    taskAccessibleName: await task.getAttribute('aria-label'),
    visibleHudCurrentWork: await page.locator('.ol-current-work').isVisible(),
  });
  const terminalPlan = JSON.stringify(actor().agency.plan);
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
  await capture('02-completed-task-after-hide-and-reopen.png');
  await task.getByRole('button', { name: 'Prepare another task', exact: true }).click();
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
