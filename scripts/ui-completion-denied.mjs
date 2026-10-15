import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Temporary finite observation; the existing disposable helper validates the supplied
// loopback administrative database URL. Chromium uses its installed runner location.
const root = process.cwd();
assert.ok(
  process.env.OPENLEGEND_TEST_DATABASE_URL,
  'Supply OPENLEGEND_TEST_DATABASE_URL explicitly for an owned disposable database.',
);
const output = resolve(process.argv[2] ?? '/tmp/openlegend-denied-container-observation');
assert.ok(output.startsWith('/tmp/'), 'Evidence stays outside the repository.');
await mkdir(output); // A new directory preserves each distinct invocation.
const sha = async (path) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
const report = {
  startedAt: new Date().toISOString(),
  source: execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim(),
  workingChanges: execFileSync('git', ['status', '--porcelain'], {
    cwd: root,
    encoding: 'utf8',
  }).trim(),
  buildProvenance:
    'The workflow builds this checkout before the observation; exact entry and bundle hashes follow.',
  scope:
    'One real external nested-container access withdrawal and the previously missing Inventory-workspace image, beginning when Inventory is enabled and native character control is current. This does not qualify startup or first graphics draw. The earlier two-account contention/receipt/conservation and canceled-old-read evidence is reused, not rerun.',
  preservedEarlierFailure: {
    report: '/tmp/openlegend-denied-external-01/report.json',
    result:
      'Failed before Inventory while #world lacked data-ready=true within its original five-second assertion. No permission or screenshot observation ran; all cleanup passed. The narrower case does not convert that startup assertion into a pass.',
  },
  limits: {
    workMs: 180000,
    hardMs: 210000,
    actionMs: 10000,
    assertionMs: 5000,
    navigationMs: 20000,
    captureMs: 10000,
  },
  viewport: { width: 1440, height: 960 },
  capture: {
    selector: '.ol-inventory-workspace',
    name: '01-denied-external-container.png',
    animationOverride: false,
  },
  limitations: [
    'Inventory is intentionally usable before the first graphics draw. Enabled Inventory plus current native control is the sole entry precondition here; no startup or scene-rendering qualification follows.',
    'The native bag, its marker and ground placement are disposable fixture setup, not gameplay creation or walking qualification.',
    'Access is changed by the same native setContainerAccess owner as the historical observation; this does not qualify the administrative grant UI.',
    'One local account is used. No contention, old-response delivery, second-account authentication, IME, assistive-device or uncoached-player case is rerun.',
  ],
  pageErrors: [],
  unexpectedRequests: [],
  inventoryReads: [],
  commands: [],
  cleanup: {},
  providerCostUsd: 0,
  cumulativeTaskProviderCostUsd: 0,
  passed: false,
};
const errorText = (error) =>
  error instanceof Error ? (error.stack ?? error.message) : String(error);
let browser,
  context,
  page,
  game,
  store,
  database,
  base,
  headers,
  expired = false;
const hardTimer = setTimeout(() => {
  report.failure ??= 'Original 210-second hard bound expired; cleanup is incomplete.';
  report.cleanup.forcedTermination = true;
  void writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n').finally(() =>
    process.exit(1),
  );
}, report.limits.hardMs);
const workTimer = setTimeout(() => {
  expired = true;
  report.failure ??= 'Original 180-second work bound expired.';
  void page?.close().catch(() => {});
}, report.limits.workMs);
try {
  const sourceFiles = [
    'apps/client/src/ui/inventory.tsx',
    'apps/client/src/ui/use-inventory-collection.ts',
    'apps/client/src/ui/inventory-collection.tsx',
    'apps/client/src/ui/inventory-details.tsx',
    'apps/client/src/ui/inventory.css',
    'apps/client/src/ui/container-opening.tsx',
    'apps/client/src/ui/world-agent-session.tsx',
    'apps/server/src/inventory-view.ts',
    'packages/domain/src/object-access.ts',
    'packages/domain/src/item-handling.ts',
  ];
  report.sourceSha256 = Object.fromEntries(
    await Promise.all(sourceFiles.map(async (path) => [path, await sha(join(root, path))])),
  );
  report.runnerSha256 = await sha(new URL(import.meta.url));
  report.builtEntrySha256 = await sha(join(root, 'dist/client/index.html'));
  const builtEntry = await readFile(join(root, 'dist/client/index.html'), 'utf8');
  const bundle = builtEntry.match(/<script[^>]*src="([^"]+)"/);
  if (bundle)
    report.builtScript = {
      path: bundle[1],
      sha256: await sha(join(root, 'dist/client', bundle[1].replace(/^\//, ''))),
    };
  const require = createRequire(join(root, 'package.json'));
  const { chromium, expect: baseExpect } = require('@playwright/test');
  const expect = baseExpect.configure({ timeout: report.limits.assertionMs });
  const nativeImport = (path) => import(pathToFileURL(join(root, path)).href);
  const [http, db, fixture, domain, handling] = await Promise.all([
    nativeImport('apps/server/src/http.ts'),
    nativeImport('tests/fixtures/database.ts'),
    nativeImport('tests/fixtures/service.ts'),
    nativeImport('packages/domain/src/index.ts'),
    nativeImport('packages/domain/src/item-handling.ts'),
  ]);
  database = db;
  const { PLAYER_ID, NPC_ID, createItemLot, itemFor, itemsForOwner, canAccessContainer } = domain;
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
  context = await browser.newContext({ viewport: report.viewport });
  await context.tracing.start({
    screenshots: false,
    snapshots: true,
    sources: true,
  });
  page = await context.newPage();
  page.setDefaultTimeout(report.limits.actionMs);
  page.setDefaultNavigationTimeout(report.limits.navigationMs);
  page.on('pageerror', (error) => report.pageErrors.push(error.message));
  page.on('request', (request) => {
    const url = new URL(request.url());
    const incoming = request.headers();
    if (url.origin !== base && !['data:', 'blob:'].includes(url.protocol))
      report.unexpectedRequests.push(url.origin + url.pathname);
    if (
      /^\/api\/(?:god|chat|invent|inventions|world-agent)(?:\/|$)/.test(url.pathname) &&
      request.method() === 'POST'
    )
      report.unexpectedRequests.push(url.pathname);
    if (url.pathname === '/api/inventory') report.inventoryReads.push(request.postDataJSON());
    if (url.pathname === '/api/command') report.commands.push(request.postDataJSON());
    if (incoming['x-ol-client'] && incoming['x-ol-scope'])
      headers = {
        Origin: base,
        'X-OL-Client': incoming['x-ol-client'],
        'X-OL-Scope': incoming['x-ol-scope'],
      };
  });
  const nativeRead = async (path, body, expectedStatus = 200) => {
    assert.equal(expired, false);
    assert.ok(headers, 'Use the authority observed from the actual App.');
    const options = { headers: { ...headers }, timeout: 10000 };
    const response =
      body === undefined
        ? await page.request.get(base + path, options)
        : await page.request.post(base + path, { ...options, data: body });
    assert.equal(response.status(), expectedStatus, path);
    return response.json();
  };
  await page.goto(base + '/auth/login');
  await expect(page.getByRole('button', { name: 'Inventory', exact: true })).toBeEnabled();
  assert.equal((await nativeRead('/api/session')).accountId, 'local-player');
  const initial = await nativeRead('/api/state');
  assert.equal(initial.player.id, PLAYER_ID);
  assert.equal(initial.access.controlling, true);
  report.entryPrecondition = {
    inventoryEnabled: true,
    nativeControlledActorId: initial.player.id,
    nativeControlling: initial.access.controlling,
    firstGraphicsDrawRequired: false,
    observedCanvasReady: await page.locator('#world').getAttribute('data-ready'),
  };
  const bagId = 'uiux08-denied-bag',
    markerId = 'uiux08-denied-marker';
  report.fixture = await fixture.editWorld(game.service, (world) => {
    createItemLot(world, PLAYER_ID, 'woven_bag', 1, bagId);
    createItemLot(world, bagId, 'stone', 1, markerId);
    assert.equal(handling.dropItems(world, world.entities[PLAYER_ID], bagId, 1, []), null);
    const pileId = itemFor(world, bagId).ownerId;
    assert.equal(world.entities[pileId].kind, 'item-pile');
    assert.equal(canAccessContainer(world, PLAYER_ID, bagId), true);
    return {
      bagId,
      markerId,
      pileId,
      actorId: PLAYER_ID,
      retainedActorId: NPC_ID,
    };
  });
  const grant = async (id, actors) => {
    const result = await game.service.transition((world) =>
      handling.setContainerAccess(world, {
        id,
        itemId: bagId,
        expectedRevision: world.entities[bagId].inventoryRevision ?? 0,
        actors,
      }),
    );
    assert.equal(result.ok, true, result.message);
    return result;
  };
  report.initialGrant = await grant('uiux08-denied-initial-grant', [PLAYER_ID, NPC_ID]);
  await page.getByRole('button', { name: 'In view', exact: true }).click();
  const nearby = page.locator('#nearbyPanel');
  await nearby
    .locator('[data-entity="' + report.fixture.pileId + '"]')
    .getByRole('button')
    .click();
  await nearby.getByRole('button', { name: 'Open Items on the ground', exact: true }).click();
  const right = page.locator('.ol-inventory-collection[data-side="container"]');
  await right.locator('[data-item-id="' + bagId + '"]').click();
  await page
    .getByRole('dialog', { name: 'Woven bag actions and details', exact: true })
    .getByRole('button', { name: /^Open / })
    .click();
  await expect(right).toHaveAccessibleName('Woven bag');
  await expect(right.getByRole('heading', { level: 3 })).toHaveText('Woven bag');
  await expect(right.getByRole('textbox', { name: 'Search Woven bag', exact: true })).toBeVisible();
  await expect(right.locator('[data-item-id="' + markerId + '"]')).toBeVisible();
  await expect(right).toHaveAttribute('aria-busy', 'false');
  const permitted = await nativeRead('/api/inventory', { containerId: bagId });
  assert.deepEqual(
    permitted.items.map((item) => item.id),
    [markerId],
  );
  assert.equal(canAccessContainer(game.service.world, PLAYER_ID, bagId), true);
  const beforeCustody = {
    bagOwnerId: itemFor(game.service.world, bagId).ownerId,
    markerOwnerId: itemFor(game.service.world, markerId).ownerId,
    itemIds: itemsForOwner(game.service.world, bagId).map((item) => item.id),
    simTime: game.service.world.simTime,
  };
  const uiCommandsBeforeRevoke = report.commands.length;
  report.withdrawal = await grant('uiux08-denied-withdrawal', [NPC_ID]);
  assert.equal(canAccessContainer(game.service.world, PLAYER_ID, bagId), false);
  await expect(right.getByRole('alert')).toHaveText('This container is unavailable.');
  await expect(right.locator('[data-item-id]')).toHaveCount(0);
  await expect(right).toHaveAttribute('aria-busy', 'false');
  const current = await nativeRead('/api/state');
  const expectedTitle =
    current.entities.find((entity) => entity.id === bagId)?.name ??
    current.player.inventory.find((item) => item.id === bagId)?.name ??
    'Container';
  await expect(right).toHaveAccessibleName(expectedTitle);
  await expect(right.getByRole('heading', { level: 3 })).toHaveText(expectedTitle);
  await expect(
    right.getByRole('textbox', {
      name: 'Search ' + expectedTitle,
      exact: true,
    }),
  ).toBeVisible();
  await expect(right.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  await expect(page.getByRole('dialog', { name: /actions and details/ })).toHaveCount(0);
  const exactReads = report.inventoryReads.filter((read) => read.containerId !== PLAYER_ID);
  assert.equal(
    exactReads.at(-1).containerId,
    bagId,
    'The right collection retains the exact selected external bag.',
  );
  const refusal = await nativeRead('/api/inventory', { containerId: bagId }, 400);
  assert.equal(refusal.ok, false);
  assert.equal(refusal.items, undefined);
  const subject = page.locator(report.capture.selector);
  const bounds = await subject.boundingBox();
  assert.ok(bounds);
  assert.ok(
    bounds.x >= -1 &&
      bounds.y >= -1 &&
      bounds.x + bounds.width <= report.viewport.width + 1 &&
      bounds.y + bounds.height <= report.viewport.height + 1,
  );
  report.observation = {
    selectedContainerId: bagId,
    expectedTitle,
    visibleHeading: await right.getByRole('heading', { level: 3 }).innerText(),
    deniedPane: await right.innerText(),
    refusal,
    bounds,
  };
  const captureStart = Date.now();
  try {
    await subject.screenshot({
      path: join(output, report.capture.name),
      timeout: report.limits.captureMs,
    });
    report.capture.elapsedMs = Date.now() - captureStart;
    report.capture.sha256 = await sha(join(output, report.capture.name));
  } catch (error) {
    report.captureFailure = errorText(error);
    throw error;
  } finally {
    const afterCustody = {
      bagOwnerId: itemFor(game.service.world, bagId).ownerId,
      markerOwnerId: itemFor(game.service.world, markerId).ownerId,
      itemIds: itemsForOwner(game.service.world, bagId).map((item) => item.id),
      simTime: game.service.world.simTime,
    };
    assert.deepEqual(afterCustody, beforeCustody);
    assert.equal(report.commands.length, uiCommandsBeforeRevoke);
    assert.equal(current.player.id, PLAYER_ID);
    assert.equal(current.access.controlling, true);
    assert.equal(current.ai.budget.spentUsd, 0);
    assert.equal(current.ai.budget.reservedUsd, 0);
    assert.equal(current.ai.usage.llmCalls + current.ai.usage.jevCalls, 0);
    assert.deepEqual(await store.recentJobs(), []);
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.unexpectedRequests, []);
    report.final = {
      exactContentsAndCustodyUnchanged: true,
      noUiCommandAfterWithdrawal: true,
      noProviderUsageOrJobs: true,
      simTime: afterCustody.simTime,
    };
  }
  assert.equal(expired, false);
  report.passed = true;
} catch (error) {
  report.failure ??= errorText(error);
  report.passed = false;
} finally {
  clearTimeout(workTimer);
  for (const [name, close] of [
    ['trace', () => context?.tracing.stop({ path: join(output, 'trace.zip') })],
    ['page', () => page?.close()],
    ['context', () => context?.close()],
    ['browser', () => browser?.close()],
    ['server', () => game?.close()],
    ['databases', () => database?.closeTestDatabases()],
  ]) {
    try {
      await close();
      report.cleanup[name] = true;
    } catch (error) {
      report.cleanup[name] = errorText(error);
      report.passed = false;
    }
  }
  clearTimeout(hardTimer);
  report.finishedAt = new Date().toISOString();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(
  JSON.stringify({
    output,
    passed: report.passed,
    failure: report.failure,
    captureFailure: report.captureFailure,
    capture: report.capture,
    cleanup: report.cleanup,
  }),
);
if (!report.passed) process.exitCode = 1;
