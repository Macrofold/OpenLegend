import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

// Temporary native observation, outside the repository until reviewed. The
// setup preparer owns source/build/tool pins; this runner owns only this scope.
const repository = resolve(process.env.OPENLEGEND_OBSERVATION_ROOT ?? process.cwd());
assert.ok(
  process.argv[2] && process.argv[3],
  'Provide the frozen setup and a new output directory.',
);
const setupPath = resolve(process.argv[2]);
const setupBytes = await readFile(setupPath);
const manifest = JSON.parse(setupBytes);
const output = resolve(process.argv[3]);
assert.ok(output !== repository && !output.startsWith(repository + sep));
assert.equal(manifest.executionReady, true);
assert.equal(manifest.repositoryPath, repository);
assert.equal(manifest.source.commit, '67c01d97b0138c9b2d831c494e7684825d7f3c3e');
assert.equal(manifest.scenario, 'inventory-resize');
assert.deepEqual(manifest.desktop, { width: 1440, height: 960 });
assert.deepEqual(manifest.narrow, { width: 390, height: 844 });
assert.deepEqual(manifest.wideShort, { width: 1440, height: 540 });
assert.equal(manifest.interactionTimeoutMs, 5_000);
assert.equal(manifest.journeyDeadlineMs, 90_000);
assert.equal(manifest.captureTimeoutMs, 15_000);
assert.deepEqual(manifest.bounds, { commands: 0, receipts: 0, captures: 3, providerBudgetUsd: 0 });
assert.ok(manifest.files.length && process.env.OPENLEGEND_TEST_DATABASE_URL);
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function verifyFiles() {
  for (const file of manifest.files) {
    const bytes = await readFile(join(repository, file.path));
    assert.equal(bytes.length, file.bytes, `Input size changed: ${file.path}`);
    assert.equal(digest(bytes), file.sha256, `Input changed: ${file.path}`);
  }
}
await verifyFiles();
await mkdir(output); // Exclusive: preserve the first attempt rather than replacing it.
const started = Date.now();
const report = {
  source: manifest.source,
  scope:
    'One native Inventory amount draft through desktop-to-390px and desktop-to-wide-short sheets. Inventory is opened before Character; the existing item, unsent 3, and input focus must stay active. Six Small stones and their item/placement/inventory revisions stay unchanged. No commands, receipt requests, game-time advance, providers, IME, assistive-device or uncoached-player claim.',
  started: new Date(started).toISOString(),
  setupSha256: digest(setupBytes),
  runnerSha256: digest(await readFile(new URL(import.meta.url))),
  sourceFilesChecked: manifest.files.length,
  tooling: manifest.tooling,
  limits: { journeyMs: 90_000, actionMs: 5_000, captureMs: 15_000, captures: 3 },
  fixture: { tick: false, providerBudgetUsd: 0, stateSeeding: false },
  steps: [],
  captures: [],
  commandRequests: [],
  receiptRequests: [],
  blockedRequests: [],
  guardFailures: [],
  pageErrors: [],
  cleanup: {},
  status: 'incomplete',
};
let browser, context, page, game, closeTestDatabases;
let cancelled = false,
  tracing = false,
  phase = 'native startup';
let appHeaders, observedHeaders, controllingAccess;
let inspect;
const pendingResponses = new Set();
const checkpoint = () =>
  writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
function record(name, details = {}) {
  const value = { name, elapsedMs: Date.now() - started, ...details };
  report.steps.push(value);
  console.log(JSON.stringify(value));
}
async function bounded(name, operation, milliseconds) {
  let timer;
  const work = Promise.resolve().then(operation);
  work.catch(() => {});
  try {
    return await Promise.race([
      work,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${name} exceeded ${milliseconds}ms`)),
          milliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function capture(name) {
  assert.ok(report.captures.length < 3);
  const file = `${String(report.captures.length + 1).padStart(2, '0')}-${name}.png`;
  const bytes = await page.screenshot({ path: join(output, file), timeout: 15_000 });
  report.captures.push({
    file,
    bytes: bytes.length,
    sha256: digest(bytes),
    viewport: page.viewportSize(),
  });
  await checkpoint();
}

try {
  const [{ chromium, expect }, server, fixtures, entry, domain] = await Promise.all([
    import(pathToFileURL(join(repository, 'node_modules/@playwright/test/index.mjs')).href),
    import(pathToFileURL(join(repository, 'apps/server/src/http.ts')).href),
    import(pathToFileURL(join(repository, 'tests/fixtures/database.ts')).href),
    import(pathToFileURL(join(repository, 'tests/fixtures/browser.ts')).href),
    import(pathToFileURL(join(repository, 'packages/domain/src/index.ts')).href),
  ]);
  closeTestDatabases = fixtures.closeTestDatabases;
  const scenario = async () => {
    const fixtureNow = Date.now();
    const store = await fixtures.testRepository();
    if (cancelled) {
      await store.close();
      await closeTestDatabases();
      throw new Error('Observation deadline passed during database startup.');
    }
    game = await server.createGameServer({
      config: fixtures.readConfig({ AI_BUDGET_USD: '0', OPEN_LEGEND_GOD_MODE: 'false' }),
      store,
      production: true,
      tick: false,
      now: () => fixtureNow,
    });
    if (cancelled) {
      await game.shutdown(30_000);
      await closeTestDatabases();
      throw new Error('Observation deadline passed during native startup.');
    }
    await new Promise((done, reject) => {
      game.server.once('error', reject);
      game.server.listen(0, '127.0.0.1', done);
    });
    const address = game.server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;
    browser = await chromium.launch({
      headless: true,
      timeout: 15_000,
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    if (cancelled) {
      await browser.close();
      throw new Error('Observation deadline passed during browser startup.');
    }
    report.browser = browser.version();
    context = await browser.newContext({ viewport: manifest.desktop });
    await context.tracing.start({ screenshots: false, snapshots: true, sources: false });
    tracing = true;
    await context.route('**/*', async (route) => {
      try {
        const request = route.request(),
          url = new URL(request.url());
        const local = url.origin === base,
          headers = request.headers();
        if (local && ['/api/command', '/api/command/receipt'].includes(url.pathname)) {
          const requests =
            url.pathname === '/api/command' ? report.commandRequests : report.receiptRequests;
          requests.push({
            path: url.pathname,
            method: request.method(),
            elapsedMs: Date.now() - started,
          });
          return await route.abort('blockedbyclient');
        }
        if (cancelled) return await route.abort('aborted');
        if (local && headers['x-ol-client'] && headers['x-ol-scope']) {
          const seen = {
            'x-ol-client': headers['x-ol-client'],
            'x-ol-scope': headers['x-ol-scope'],
          };
          if (appHeaders) assert.deepEqual(seen, appHeaders, 'The controlling App scope changed.');
          observedHeaders = seen;
        }
        const paid =
          /^\/api\/(?:chat(?:\/|$)|invent(?:\/|$)|inventions\/submit|action-attempt|world-agent\/(?:messages|continue))/;
        if (!local || paid.test(url.pathname) || /^\/api\/god(?:\/|$)/.test(url.pathname)) {
          report.blockedRequests.push({
            origin: url.origin,
            path: url.pathname,
            method: request.method(),
          });
          return await route.abort('blockedbyclient');
        }
        await route.continue();
      } catch (error) {
        report.guardFailures.push({ phase, message: String(error) });
        await route.abort('blockedbyclient').catch(() => {});
      }
    });
    page = await context.newPage();
    page.setDefaultTimeout(5_000);
    page.setDefaultNavigationTimeout(30_000);
    page.on('pageerror', (error) => report.pageErrors.push(error.message));
    page.on('response', (response) => {
      if (new URL(response.url()).pathname !== '/api/state' || response.status() !== 200) return;
      const work = response.json().then((body) => {
        if (body.access?.controlling)
          controllingAccess = {
            ...body.access,
            clientId: response.request().headers()['x-ol-client'],
          };
      });
      pendingResponses.add(work);
      work.catch((error) => report.pageErrors.push(`State observation: ${error.message}`));
      work.finally(() => pendingResponses.delete(work)).catch(() => {});
    });
    await page.goto(`${base}/auth/login`);
    await entry.enterGame(page);
    const hud = page.locator('.ol-hud');
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    await expect(hud).toHaveAttribute('data-narrow', 'false');
    await expect(hud).toHaveAttribute('data-reduce-motion', 'false');
    assert.equal(
      await hud.evaluate((element) =>
        getComputedStyle(element).getPropertyValue('--ui-scale').trim(),
      ),
      '1',
    );
    await expect
      .poll(
        () =>
          !!controllingAccess?.clientId &&
          observedHeaders?.['x-ol-client'] === controllingAccess.clientId &&
          observedHeaders?.['x-ol-scope'] === controllingAccess.scope,
      )
      .toBe(true);
    appHeaders = { ...observedHeaders };
    assert.notEqual(appHeaders['x-ol-client'], 'local-internal');
    const authority = { ...controllingAccess };
    report.connection = authority;
    const currentView = async () => {
      assert.equal(cancelled, false);
      const response = await page.request.get(`${base}/api/state`, {
        headers: appHeaders,
        timeout: 5_000,
      });
      assert.equal(response.status(), 200);
      const view = await response.json();
      assert.equal(view.access?.controlling, true);
      assert.equal(view.access.scope, appHeaders['x-ol-scope']);
      for (const key of ['actorId', 'accountId', 'controlGeneration'])
        assert.equal(view.access[key], authority[key]);
      assert.equal(view.player.id, authority.actorId);
      return view;
    };
    const initial = await currentView();
    const stones = initial.player.inventory.filter((item) => item.name === 'Small stone');
    assert.equal(stones.length, 1, 'SETUP LIMIT: one existing Small stone stack is required.');
    const stone = stones[0];
    assert.equal(
      stone.quantity,
      6,
      'SETUP LIMIT: native entry must already provide six Small stones.',
    );
    const possessions = (view) => ({
      inventoryRevision: view.player.inventoryRevision,
      items: domain
        .inventoryFor(game.service.world, view.player.id)
        .map((item) => ({
          id: item.id,
          definitionId: item.definitionId,
          quantity: item.quantity,
          revision: item.revision,
          placementRevision: item.placementRevision,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      stone: view.player.inventory
        .filter((item) => item.id === stone.id)
        .map((item) => ({
          id: item.id,
          quantity: item.quantity,
          revision: item.revision,
          placementRevision: item.placementRevision,
        })),
      simTime: game.service.world.simTime,
    });
    report.initial = possessions(initial);
    const inventory = page.locator('#inventoryPanel'),
      character = page.locator('#characterPanel');
    const rail = page.locator('.ol-rail-left');
    const characterLauncher = rail.getByRole('button', { name: 'Character', exact: true });
    const item = inventory.getByRole('button', { name: `${stone.name}, 6`, exact: true });
    const popup = page.locator('.ol-inventory-popover');
    const quantity = popup.getByRole('textbox', { name: 'Quantity', exact: true });
    inspect = () =>
      page.evaluate(() => {
        const box = (element) => {
          if (!element) return null;
          const value = element.getBoundingClientRect();
          return {
            x: value.x,
            y: value.y,
            width: value.width,
            height: value.height,
            right: value.right,
            bottom: value.bottom,
          };
        };
        const active = document.activeElement;
        return {
          viewport: { width: innerWidth, height: innerHeight },
          narrow: document.querySelector('.ol-hud')?.getAttribute('data-narrow'),
          panels: ['inventoryPanel', 'characterPanel'].map((id) => {
            const element = document.getElementById(id);
            return { id, hidden: !element || !!element.closest('[hidden]'), box: box(element) };
          }),
          focus: {
            tag: active?.tagName,
            id: active?.id,
            value: active instanceof HTMLInputElement ? active.value : null,
            inPopup: !!active?.closest('.ol-inventory-popover'),
            inPanel: active?.closest('.ol-panel')?.id ?? null,
          },
          popup: box(document.querySelector('.ol-inventory-popover')),
          selectedItemId: document
            .querySelector('.ol-inventory-cell[data-selected]')
            ?.getAttribute('data-item-id'),
        };
      });
    const assertSheet = async (label, viewport) => {
      await expect(quantity).toHaveValue('3');
      await expect(quantity).toBeFocused();
      await page.setViewportSize(viewport);
      await expect(hud).toHaveAttribute('data-narrow', 'true');
      await expect(inventory).toBeVisible();
      await expect(character).toBeHidden();
      await expect(popup).toBeVisible();
      await expect(quantity).toHaveValue('3');
      await expect(quantity).toBeFocused();
      await expect(popup).toBeInViewport({ ratio: 1 });
      const state = await inspect();
      assert.equal(state.selectedItemId, stone.id);
      assert.ok(
        state.popup &&
          state.popup.x >= 0 &&
          state.popup.y >= 0 &&
          state.popup.right <= viewport.width &&
          state.popup.bottom <= viewport.height,
        'The entire item popup must fit the viewport.',
      );
      assert.equal(state.focus.value, '3');
      assert.equal(state.focus.inPopup, true);
      record(label, state);
      await capture(label);
    };

    phase = 'desktop Inventory draft with Character opened last';
    await rail.getByRole('button', { name: 'Inventory', exact: true }).click();
    await characterLauncher.click();
    await expect(inventory).toBeVisible();
    await expect(character).toBeVisible();
    await item.click();
    await expect(item).toHaveAttribute('data-item-id', stone.id);
    await popup.getByRole('button', { name: 'Split stack…', exact: true }).click();
    await quantity.fill('3');
    await expect(quantity).toBeFocused();
    const desktop = await inspect();
    assert.equal(desktop.focus.inPanel, null, 'The focused input must be in the real body portal.');
    record('desktop-two-panels-unsent-three', desktop);
    await capture('desktop-two-panels-unsent-three');

    phase = 'desktop-to-narrow resize';
    await assertSheet('narrow-focused-inventory', manifest.narrow);

    phase = 'restore desktop and open Character last for the height breakpoint';
    await page.setViewportSize(manifest.desktop);
    await expect(hud).toHaveAttribute('data-narrow', 'false');
    await expect(inventory).toBeVisible();
    await expect(character).toBeVisible();
    await characterLauncher.click();
    await expect(character).toBeHidden();
    await characterLauncher.click();
    await expect(character).toBeVisible();
    await item.click();
    await expect(quantity).toHaveValue('3'); // Reopening the same item must retain its unsent draft.
    await quantity.click();
    phase = 'desktop-to-wide-short resize';
    await assertSheet('wide-short-focused-inventory', manifest.wideShort);

    phase = 'unchanged native possessions and zero commands';
    await Promise.all([...pendingResponses]);
    report.final = possessions(await currentView());
    assert.deepEqual(report.final, report.initial);
    assert.deepEqual(report.commandRequests, []);
    assert.deepEqual(report.receiptRequests, []);
    assert.deepEqual(report.blockedRequests, []);
    assert.deepEqual(report.guardFailures, []);
    assert.deepEqual(report.pageErrors, []);
    assert.equal(report.captures.length, 3);
    report.usage = (await game.service.store.usage(0)).usage;
    assert.equal(report.usage.llmCalls, 0);
    assert.equal(report.usage.jevCalls, 0);
    report.status = 'passed';
  };
  await bounded('Focused native Inventory observation', scenario, 90_000);
} catch (error) {
  cancelled = true;
  report.status = String(error).includes('SETUP LIMIT:') ? 'setup-limited' : 'failed';
  report.failure = { phase, message: String(error), stack: error?.stack };
  report.journeyDeadlineReached = String(error).includes(
    'Focused native Inventory observation exceeded',
  );
  if (report.journeyDeadlineReached) report.cleanupUncertain = true;
  process.exitCode = 1;
  // Preserve the first failed state before teardown, without attempting recovery.
  if (page && !page.isClosed()) {
    if (inspect) {
      try {
        report.failure.observation = await bounded('Failure observation', inspect, 5_000);
      } catch (failure) {
        report.failure.observationError = String(failure);
      }
    }
    if (report.captures.length < 3) {
      try {
        await capture('first-failed-state');
      } catch (failure) {
        report.failure.captureError = String(failure);
      }
    }
  }
} finally {
  cancelled = true;
  const clean = async (name, operation, milliseconds) => {
    try {
      report.cleanup[name] = (await bounded(name, operation, milliseconds)) ?? true;
    } catch (error) {
      report.cleanup[name] = { error: String(error) };
      report.cleanupUncertain = true;
      report.status = 'failed';
      process.exitCode = 1;
    }
  };
  if (tracing)
    await clean('trace', () => context.tracing.stop({ path: join(output, 'trace.zip') }), 15_000);
  if (context) await clean('context', () => context.close(), 15_000);
  if (browser) await clean('browser', () => browser.close(), 15_000);
  if (game)
    await clean(
      'server',
      async () => {
        const result = await game.shutdown(30_000);
        assert.equal(result.saved, true);
        assert.deepEqual(result.problems, []);
        return result;
      },
      35_000,
    );
  if (closeTestDatabases) await clean('database', closeTestDatabases, 35_000);
  await clean('sourceAndBuildUnchanged', verifyFiles, 15_000);
  if (report.commandRequests.length || report.receiptRequests.length) {
    report.status = 'failed';
    process.exitCode = 1;
  }
  report.finished = new Date().toISOString();
  report.elapsedMs = Date.now() - started;
  report.additionalJevCostUsd = 0;
  report.cumulativeTaskJevCostUsd = 0;
  await checkpoint();
  console.log(
    JSON.stringify({
      status: report.status,
      phase,
      elapsedMs: report.elapsedMs,
      commands: report.commandRequests.length,
      receipts: report.receiptRequests.length,
      captures: report.captures.length,
      cleanup: report.cleanup,
    }),
  );
}
