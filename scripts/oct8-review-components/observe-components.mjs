import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(process.env.OPENLEGEND_REPO ?? process.cwd());
const output = resolve(process.env.OPENLEGEND_OBSERVATION_OUTPUT ?? join(here, 'results'));
const require = createRequire(join(repo, 'package.json'));
const { build } = createRequire(require.resolve('tsx'))('esbuild');
const { chromium, expect } = require('@playwright/test');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pins = JSON.parse(await readFile(join(here, 'source-pins.json'), 'utf8'));
for (const [path, expected] of Object.entries(pins))
  assert.equal(sha(await readFile(join(repo, path))), expected, `Source changed: ${path}`);
const temporary = await mkdtemp(join(tmpdir(), 'openlegend-components-'));
const report = {
  sourcePins: pins,
  providerCalls: 0,
  nativeCommands: 0,
  limits:
    'Actual React components with controlled transport and parent props; no App, world renderer, PostgreSQL, native admission or provider qualification.',
  scenarios: [],
  unexpected: [],
  cleanup: {},
};
async function bounded(promise, label, milliseconds = 10000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(Error(label + ' exceeded ' + milliseconds + 'ms')),
          milliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
let server, browser;
try {
  const fixture = (await readFile(join(here, 'components.tsx.txt'), 'utf8')).replaceAll(
    '__REPO__',
    repo,
  );
  await writeFile(join(temporary, 'entry.tsx'), fixture);
  await build({
    entryPoints: [join(temporary, 'entry.tsx')],
    outfile: join(temporary, 'bundle.js'),
    bundle: true,
    platform: 'browser',
    format: 'esm',
    jsx: 'automatic',
    nodePaths: [join(repo, 'apps/client/node_modules')],
    loader: {
      '.woff2': 'file',
      '.woff': 'file',
      '.svg': 'file',
      '.png': 'file',
    },
    define: { 'process.env.NODE_ENV': '"development"' },
    logLevel: 'warning',
  });
  if (process.argv.includes('--prepare-only')) {
    console.log('Pins and actual-component bundle passed; no browser or server started.');
    process.exitCode = 0;
  } else {
    await mkdir(output, { recursive: true });
    server = createServer(async (request, response) => {
      const name = new URL(request.url, 'http://localhost').pathname;
      if (name === '/') {
        response.setHeader('Content-Type', 'text/html');
        response.end(
          '<!doctype html><html><head><link rel="stylesheet" href="/bundle.css"></head><body><div id="app" class="ol-root" style="padding:24px;box-sizing:border-box;overflow:auto"></div><script type="module" src="/bundle.js"></script></body></html>',
        );
        return;
      }
      if (!/^\/[a-zA-Z0-9._-]+$/.test(name)) {
        response.writeHead(404).end();
        return;
      }
      try {
        const bytes = await readFile(join(temporary, name.slice(1)));
        response.setHeader(
          'Content-Type',
          name.endsWith('.js')
            ? 'text/javascript'
            : name.endsWith('.css')
              ? 'text/css'
              : 'application/octet-stream',
        );
        response.end(bytes);
      } catch {
        response.writeHead(404).end();
      }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({
      headless: true,
      timeout: 10000,
      ...(process.env.OPENLEGEND_PLAYWRIGHT_CHANNEL === 'chrome' ? { channel: 'chrome' } : {}),
    });
    async function scenario(name, run) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 960 },
      });
      const page = await context.newPage();
      page.setDefaultTimeout(5000);
      page.setDefaultNavigationTimeout(10000);
      await context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: true,
      });
      const result = {
        name,
        boundMs: 25000,
        startedAt: new Date().toISOString(),
        requests: [],
        errors: [],
      };
      page.on('pageerror', (error) => result.errors.push(error.message));
      let timer;
      try {
        await page.route('**/*', (route) => {
          if (
            !route
              .request()
              .url()
              .startsWith(origin + '/')
          ) {
            report.unexpected.push(route.request().url());
            return route.abort('blockedbyclient');
          }
          return route.fallback();
        });
        await Promise.race([
          run(page, result, origin),
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(Error(`${name} exceeded its original 25000ms observation bound`)),
              25000,
            );
          }),
        ]);
        assert.deepEqual(result.errors, []);
        result.passed = true;
      } catch (error) {
        result.passed = false;
        result.error = String(error?.stack ?? error);
        await page
          .screenshot({
            path: join(output, name + '-failure.png'),
            timeout: 10000,
          })
          .catch((failure) => {
            result.captureFailure = String(failure);
          });
      } finally {
        clearTimeout(timer);
        result.finishedAt = new Date().toISOString();
        try {
          await bounded(
            context.tracing.stop({ path: join(output, name + '-trace.zip') }),
            'Trace finalization',
          );
        } catch (error) {
          result.traceFailure = String(error);
          result.passed = false;
        }
        try {
          await bounded(context.close(), 'Context close');
          result.contextClosed = true;
        } catch (error) {
          result.closeFailure = String(error);
          result.passed = false;
        }
        report.scenarios.push(result);
      }
    }
    await scenario('chat-stale-retry', async (page, result, origin) => {
      let heldRetry;
      await page.route('**/api/**', async (route) => {
        const url = new URL(route.request().url());
        result.requests.push(url.pathname + url.search);
        if (url.pathname === '/api/history') {
          const person = url.searchParams.get('participantId');
          assert.ok(person === 'A' || person === 'B');
          return route.fulfill({
            json: {
              messages: [
                {
                  id: person + '-message',
                  speakerId: person,
                  speaker: person === 'A' ? 'Ada' : 'Bea',
                  text: person === 'A' ? 'Ada original failed message' : 'Bea history must remain',
                  time: 1,
                  ...(person === 'A'
                    ? {
                        replyRequestId: 'A-original-attempt',
                        replyStatus: 'failed',
                        replyFailure: 'Controlled reply failure',
                        retryable: true,
                      }
                    : {}),
                },
              ],
              watermark: 1,
            },
          });
        }
        if (url.pathname === '/api/chat/preview')
          return route.fulfill({
            contentType: 'text/event-stream',
            body: 'event: unavailable\ndata: {}\n\n',
          });
        if (url.pathname === '/api/chat/retry') {
          assert.equal(route.request().postDataJSON().originalRequestId, 'A-original-attempt');
          heldRetry = route;
          return;
        }
        report.unexpected.push(url.pathname);
        return route.abort();
      });
      await page.goto(origin + '/?scenario=chat');
      await expect(page.getByText('Ada original failed message', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await expect.poll(() => !!heldRetry, { timeout: 5000 }).toBe(true);
      await page.getByRole('button', { name: 'Fixture: select Bea' }).click();
      await expect(page.getByText('Bea history must remain', { exact: true })).toBeVisible();
      const before = result.requests.filter((path) => path.startsWith('/api/history')).length;
      const retryFinished = page.waitForResponse(
        (response) => response.url().endsWith('/api/chat/retry'),
        { timeout: 5000 },
      );
      await heldRetry.fulfill({
        json: {
          ok: true,
          code: 'queued',
          message: 'Controlled retry accepted',
          jobId: 'A-retried-attempt',
        },
      });
      await bounded((await retryFinished).finished(), 'Retry response body', 5000);
      await expect
        .poll(() => page.evaluate(() => window.observation.retryBodyConsumed ?? 0), {
          timeout: 5000,
        })
        .toBe(1);
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      await expect(page.getByText('Bea history must remain', { exact: true })).toBeVisible();
      assert.equal(
        result.requests.filter((path) => path.startsWith('/api/history')).length,
        before,
        'Old Retry completion must not request A again',
      );
      assert.equal(result.requests.filter((path) => path.startsWith('/api/chat/retry')).length, 1);
      result.visibleText = await page.locator('#composer').innerText();
      await page.screenshot({
        path: join(output, 'chat-bea-after-late-retry.png'),
        timeout: 10000,
      });
    });
    await scenario('editor-pending-save', async (page, result, origin) => {
      await page.route('**/api/**', (route) => {
        report.unexpected.push(route.request().url());
        return route.abort();
      });
      await page.goto(origin + '/?scenario=editor');
      await page.getByRole('button', { name: 'Close Edit fixture', exact: true }).click();
      const dialog = page.getByRole('alertdialog', {
        name: 'Unsaved changes in Edit fixture',
      });
      await dialog.getByRole('button', { name: 'Save and Close', exact: true }).click();
      await expect(
        dialog.getByRole('button', { name: 'Keep editing', exact: true }),
      ).toBeDisabled();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeVisible();
      assert.deepEqual(
        await page.evaluate(() => [window.observation.saveCalls, window.observation.closes]),
        [1, 0],
      );
      result.pendingText = await dialog.innerText();
      await page.screenshot({
        path: join(output, 'editor-save-pending.png'),
        timeout: 10000,
      });
      await page.evaluate(() => window.observation.releaseSave());
      await expect(dialog.getByRole('button', { name: 'Keep editing', exact: true })).toBeEnabled();
      await dialog.getByRole('button', { name: 'Keep editing', exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByLabel('Fixture draft')).toHaveValue('Unsaved original draft');
      assert.deepEqual(
        await page.evaluate(() => [window.observation.saveCalls, window.observation.closes]),
        [1, 0],
      );
    });
    await scenario('merge-selected-target-lost', async (page, result, origin) => {
      let reads = 0;
      await page.route('**/api/**', (route) => {
        const url = new URL(route.request().url());
        result.requests.push(url.pathname);
        if (url.pathname !== '/api/inventory') {
          report.unexpected.push(url.pathname);
          return route.abort();
        }
        assert.equal(route.request().postDataJSON().mergeSourceId, 'A');
        const ids = ++reads === 1 ? ['B', 'C'] : ['B'];
        return route.fulfill({
          json: {
            ok: true,
            container: { id: 'player', name: 'Mike', revision: reads },
            breadcrumbs: [],
            items: ids.map((id) => ({
              id,
              name: 'Wood ' + id,
              definitionId: 'wood',
              quantity: 2,
              revision: 1,
              placementRevision: 1,
              category: 'material',
              description: 'Matching lot',
              equipped: false,
              tags: [],
              actions: [],
            })),
          },
        });
      });
      await page.goto(origin + '/?scenario=merge');
      await page.getByText('Merge matching stacks', { exact: true }).click();
      const select = page.getByLabel('Merge into', { exact: false });
      await expect(select).toHaveValue('B');
      await select.selectOption('C');
      await expect(select).toHaveValue('C');
      await page.getByRole('button', { name: 'Fixture: publish C removed' }).click();
      await expect(select).toHaveValue('');
      await expect(select).toContainText('Selected stack unavailable');
      await expect(page.getByRole('button', { name: 'Merge lots', exact: true })).toBeDisabled();
      assert.deepEqual(await page.evaluate(() => window.observation.merges), []);
      result.unavailableText = await page
        .getByRole('region', { name: 'Actual matching lots' })
        .innerText();
      await page.screenshot({
        path: join(output, 'merge-C-lost-B-retained.png'),
        timeout: 10000,
      });
      await select.selectOption('B');
      await page.getByRole('button', { name: 'Merge lots', exact: true }).click();
      assert.deepEqual(await page.evaluate(() => window.observation.merges), ['B']);
      result.explicitFinalTarget = 'B';
    });
    await scenario('person-first-original-receipt', async (page, result, origin) => {
      const original = {
        commandId: 'original-trade',
        commandEpoch: 'epoch',
        label: 'Accept original trade',
        tradeScope: 'person-trade-scope',
        command: {
          type: 'handover',
          handoverOperation: 'accept',
          offerId: 'original-offer',
          expectedRevision: 1,
        },
      };
      let receiptReads = 0;
      await page.route('**/api/**', (route) => {
        const path = new URL(route.request().url()).pathname;
        result.requests.push(path);
        if (path !== '/api/command/receipt') {
          report.unexpected.push(path);
          return route.abort();
        }
        assert.deepEqual(route.request().postDataJSON(), {
          commandId: original.commandId,
          commandEpoch: original.commandEpoch,
          command: original.command,
        });
        receiptReads++;
        return route.fulfill({
          json: {
            ok: true,
            scope: 'component-scope',
            status: 'resolved',
            result: { ok: true, code: 'fixture-resolved', message: 'Original result confirmed' },
          },
        });
      });
      await page.goto(origin + '/?scenario=trade');
      await page.evaluate((value) => {
        sessionStorage.setItem(window.observation.inventoryKey, JSON.stringify(value));
        sessionStorage.removeItem(window.observation.tradeKey);
      }, original);
      await page.reload();
      await expect(
        page.getByText('Original receipt: original-trade', { exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Try person trade', exact: true }).click();
      await expect(page.getByLabel('Person trade start result')).toHaveText('false');
      assert.equal(receiptReads, 0);
      assert.equal(
        await page.getByRole('region', { name: 'Actual inventory receipt owner' }).count(),
        0,
      );
      assert.equal(
        await page.evaluate(() => sessionStorage.getItem(window.observation.inventoryKey)),
        JSON.stringify(original),
      );
      result.personFirstBlockedBeforeInventoryMounted = true;
      await page.evaluate(() => sessionStorage.setItem('fixture:unreadable', 'yes'));
      await page.reload();
      await expect(page.getByText('Original read blocked: true', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Try person trade', exact: true }).click();
      await expect(page.getByLabel('Person trade start result')).toHaveText('false');
      assert.equal(receiptReads, 0);
      result.unreadableOriginalBlocked = true;
      await page.evaluate(() => sessionStorage.removeItem('fixture:unreadable'));
      await page.reload();
      await page.evaluate(() => sessionStorage.setItem('fixture:remove-fails', 'yes'));
      await page.reload();
      await page.getByRole('button', { name: 'Mount original receipt owner', exact: true }).click();
      await page.getByRole('button', { name: 'Check original receipt', exact: true }).click();
      await expect(
        page.getByRole('region', { name: 'Actual inventory receipt owner' }),
      ).toContainText('could not be cleared');
      assert.equal(
        await page.evaluate(() => sessionStorage.getItem(window.observation.inventoryKey)),
        JSON.stringify(original),
      );
      await page.reload();
      await page.getByRole('button', { name: 'Try person trade', exact: true }).click();
      await expect(page.getByLabel('Person trade start result')).toHaveText('false');
      assert.equal(
        await page.getByRole('region', { name: 'Actual inventory receipt owner' }).count(),
        0,
      );
      result.failedOriginalRemovalStayedGuardedAfterPersonFirstReload = true;
      await page.evaluate(() => sessionStorage.removeItem('fixture:remove-fails'));
      await page.reload();
      await page.getByRole('button', { name: 'Mount original receipt owner', exact: true }).click();
      await page.getByRole('button', { name: 'Check original receipt', exact: true }).click();
      await expect(
        page.getByRole('region', { name: 'Actual inventory receipt owner' }),
      ).toContainText('Original result confirmed');
      assert.equal(
        await page.evaluate(() => sessionStorage.getItem(window.observation.inventoryKey)),
        null,
      );
      await expect(page.getByText('Original receipt: none', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Try person trade', exact: true }).click();
      await expect(page.getByLabel('Person trade start result')).toHaveText('true');
      assert.equal(receiptReads, 2);
      assert.equal(await page.evaluate(() => window.observation.receiptsResolved), 1);
      result.exactReceiptReads = receiptReads;
      await page.screenshot({
        path: join(output, 'person-first-guard-resolved.png'),
        timeout: 10000,
      });
    });
    assert.deepEqual(report.unexpected, []);
    if (report.scenarios.some((result) => !result.passed)) process.exitCode = 1;
  }
} catch (error) {
  report.setupFailure = String(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  if (browser) {
    try {
      await bounded(browser.close(), 'Browser close');
      report.cleanup.browserClosed = true;
    } catch (error) {
      report.cleanup.browserFailure = String(error);
      process.exitCode = 1;
    }
  }
  if (server) {
    try {
      await bounded(new Promise((resolve) => server.close(resolve)), 'Server close');
      report.cleanup.serverClosed = true;
    } catch (error) {
      report.cleanup.serverFailure = String(error);
      process.exitCode = 1;
    }
  }
  await rm(temporary, { recursive: true, force: true });
  report.cleanup.temporaryBuildRemoved = true;
  if (!process.argv.includes('--prepare-only')) {
    await mkdir(output, { recursive: true });
    await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  }
  console.log(
    JSON.stringify({
      scenarios: report.scenarios.map(({ name, passed, error }) => ({
        name,
        passed,
        error,
      })),
      setupFailure: report.setupFailure,
      cleanup: report.cleanup,
    }),
  );
}
