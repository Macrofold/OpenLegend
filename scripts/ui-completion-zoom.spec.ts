import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import {
  chromium,
  expect,
  test,
  type Browser,
  type BrowserContext,
  type BrowserServer,
  type Locator,
  type Page,
} from '@playwright/test';
import { createGameServer } from '../apps/server/src/http.js';
import { digest } from '../apps/server/src/store.js';
import { worldPosition } from '../packages/domain/src/index.js';
import type { KnownPlaceInspection } from '../packages/protocol/src/index.js';
import { enterGame } from '../tests/fixtures/browser.js';
import { closeTestDatabases, readConfig, testRepository } from '../tests/fixtures/database.js';

// Temporary J09/J47 observation. The caller owns an isolated Xvfb display and
// installs xdotool/xauth only on its disposable Linux runner. No real profile is used.
test.setTimeout(60_000);
const runFile = promisify(execFile);
const sourcePaths = [
  'apps/client/src/main.tsx',
  'apps/client/src/api.ts',
  'apps/client/src/ui/known-places.tsx',
  'apps/client/src/ui/panels.tsx',
  'apps/client/src/design-system/components.tsx',
  'apps/client/src/design-system/layout.css',
  'apps/client/src/design-system/tokens/tokens.css',
  'apps/server/src/http.ts',
  'apps/server/src/known-places.ts',
  'tests/fixtures/browser.ts',
];
const hashFile = async (path: string) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex');

test('native Chromium 200% zoom retains a Journal place and reachable keyboard controls', async ({}, info) => {
  expect(process.platform).toBe('linux');
  expect(process.env['DISPLAY']).toBeTruthy();
  const store = await testRepository();
  const config = readConfig({ AI_BUDGET_USD: '0' });
  expect(config.budgetUsd).toBe(0);
  for (const key of [
    'jevKey',
    'llmKey',
    'embeddingKey',
    'macrofoldKey',
    'macrofoldProviderConnectionId',
    'macrofoldJevConnectionId',
    'macrofoldWorldConnectionId',
  ] as const)
    expect(config[key]).toBe('');
  const game = await createGameServer({ config, store, production: true, tick: false });
  let server: BrowserServer | undefined;
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;
  let tracing = false;
  const posts: string[] = [];
  const commands: string[] = [];
  const providers: string[] = [];
  const errors: string[] = [];
  const outsideRequests: string[] = [];
  const inspections: unknown[] = [];
  const nativeInput: Array<{ args: string[]; stdout: string }> = [];
  const cleanup: Array<{ owner: string; closed?: true; failure?: string }> = [];
  const report: Record<string, unknown> = {
    passed: false,
    startedAt: new Date().toISOString(),
    checkout: process.env['GITHUB_SHA'] ?? 'unrecorded-checkout',
    limits: { testMs: 60000, assertionMs: 5000, actionMs: 10000, captureMs: 10000, x11Ms: 5000 },
    scope:
      'One native Journal place at real Chromium 200% browser zoom, retained through Hide/reopen, with keyboard focus and no gameplay command.',
    limitations: [
      'X11 XTEST key input on an isolated Linux virtual display is not physical keyboard, native IME, assistive-device or uncoached-player evidence.',
      'One normal authored opening and one selected place at one physical window size; not all screens or 320-CSS-pixel reflow.',
      'No CSS/font injection, mobile/device emulation, page-scale emulation, application-scale change or direct browser preference edits.',
      'Chromium uses only its own disposable automation profile; no user browser, profile or settings are opened.',
    ],
    posts,
    commands,
    providers,
    errors,
    outsideRequests,
    inspections,
    nativeInput,
    cleanup,
    providerCostUsd: 0,
    cumulativeTaskProviderCostUsd: 0,
  };
  async function x11(...args: string[]) {
    const result = await runFile('xdotool', args, { timeout: 5000, maxBuffer: 65536 });
    expect(result.stderr.trim()).toBe('');
    const stdout = result.stdout.trim();
    nativeInput.push({ args, stdout });
    return stdout;
  }
  try {
    report.sourceSha256 = Object.fromEntries(
      await Promise.all(sourcePaths.map(async (path) => [path, await hashFile(path)])),
    );
    const assets = (await readdir('dist/client/assets')).filter((name) => /\.(js|css)$/.test(name));
    report.assetSha256 = Object.fromEntries(
      await Promise.all(
        ['dist/client/index.html', ...assets.map((name) => `dist/client/assets/${name}`)].map(
          async (path) => [path, await hashFile(path)],
        ),
      ),
    );
    await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
    const address = game.server.address();
    if (!address || typeof address === 'string') throw new Error('Missing listener');
    const base = `http://127.0.0.1:${address.port}`;
    server = await chromium.launchServer({
      host: '127.0.0.1',
      headless: false,
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ozone-platform=x11',
        '--window-size=1440,960',
        '--window-position=0,0',
      ],
    });
    browser = await chromium.connect(server.wsEndpoint());
    context = await browser.newContext({ viewport: null });
    await context.tracing.start({ screenshots: false, snapshots: true, sources: true });
    tracing = true;
    page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(20000);
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.origin !== base && !['blob:', 'data:'].includes(url.protocol))
        outsideRequests.push(url.origin + url.pathname);
      if (request.method() !== 'POST') return;
      posts.push(url.pathname);
      if (
        /^\/api\/(?:command$|action-attempt$|saves\/(?:create|load|delete)$|god\/)/.test(
          url.pathname,
        )
      )
        commands.push(url.pathname);
      if (/^\/api\/(?:chat|invent|inventions|world-agent)(?:\/|$)/.test(url.pathname))
        providers.push(url.pathname);
      if (url.pathname === '/api/known-places/inspect') inspections.push(request.postDataJSON());
    });
    await page.goto(base);
    await enterGame(page);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    const journal = page.locator('#journalPanel');
    await journal.getByText('Places', { exact: true }).click();
    const first = journal
      .locator('.ol-known-place-list')
      .getByRole('button', { name: /^Inspect / })
      .first();
    await expect(first).toBeVisible();
    const inspectionResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/known-places/inspect',
    );
    await first.click();
    const selected = (await (await inspectionResponse).json()) as KnownPlaceInspection;
    expect(selected.ok).toBe(true);
    expect(inspections).toEqual([
      {
        id: selected.place.id,
        sourceId: selected.place.sourceId,
        revision: selected.place.revision,
      },
    ]);
    const detail = journal.locator('.ol-known-place-detail');
    const heading = detail.getByRole('heading');
    const focus = detail.getByRole('button', { name: 'Focus last-known location', exact: true });
    const move = detail.getByRole('button', { name: selected.move.label, exact: true });
    await expect(heading).toHaveText(selected.place.label);
    await expect(heading).toBeFocused();
    await expect(move).toBeEnabled();
    const retainedText = await detail.innerText();
    await game.service.flush();
    const initialDigest = digest(game.service.world);
    const initialPosition = {
      ...worldPosition(game.service.world.entities[game.service.controlledEntityId]!),
    };
    report.selected = selected.place;

    const pid = server.process().pid;
    expect(pid).toBeDefined();
    const windows = (
      await x11(
        'search',
        '--all',
        '--onlyvisible',
        '--pid',
        String(pid),
        '--name',
        '^Open Legend · ',
      )
    ).split(/\s+/);
    expect(windows).toHaveLength(1);
    const ownedWindow = windows[0]!;
    expect(await x11('getwindowpid', ownedWindow)).toBe(String(pid));
    expect(await x11('getwindowname', ownedWindow)).toContain(await page.title());
    await x11('windowfocus', '--sync', ownedWindow);
    expect(await x11('getwindowfocus')).toBe(ownedWindow);
    await x11('key', '--clearmodifiers', 'ctrl+0');

    const cdp = await context.newCDPSession(page);
    async function metrics() {
      const dom = await page!.evaluate(() => {
        const hud = document.querySelector<HTMLElement>('.ol-hud')!;
        const style = getComputedStyle(hud);
        return {
          dpr: window.devicePixelRatio,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          outerWidth: window.outerWidth,
          outerHeight: window.outerHeight,
          visualScale: window.visualViewport?.scale,
          appScale: style.getPropertyValue('--ui-scale').trim(),
          fontSize: style.fontSize,
          bodyTextToken: style.getPropertyValue('--text-body-size').trim(),
          cssZoom: style.zoom,
        };
      });
      const native = await cdp.send('Browser.getWindowForTarget');
      const xGeometry = await x11('getwindowgeometry', '--shell', ownedWindow);
      return { dom, bounds: native.bounds, xGeometry };
    }
    const baseline = await metrics();
    expect(baseline.dom.appScale).toBe('1');
    expect(baseline.dom.visualScale).toBe(1);
    await page.screenshot({
      path: info.outputPath('journal-browser-zoom-100.png'),
      timeout: 10000,
    });
    await x11(
      'key',
      '--clearmodifiers',
      'ctrl+plus',
      'ctrl+plus',
      'ctrl+plus',
      'ctrl+plus',
      'ctrl+plus',
    );
    await expect
      .poll(() => page!.evaluate(() => window.devicePixelRatio))
      .toBeCloseTo(baseline.dom.dpr * 2, 5);
    await expect(page.locator('.ol-hud')).toHaveAttribute('data-narrow', 'true');
    const enlarged = await metrics();
    expect(enlarged.bounds).toEqual(baseline.bounds);
    expect(enlarged.xGeometry).toBe(baseline.xGeometry);
    expect(enlarged.dom.outerWidth).toBe(baseline.dom.outerWidth);
    expect(enlarged.dom.outerHeight).toBe(baseline.dom.outerHeight);
    expect(Math.abs(enlarged.dom.innerWidth * 2 - baseline.dom.innerWidth)).toBeLessThanOrEqual(2);
    expect(enlarged.dom.visualScale).toBe(1);
    for (const key of ['appScale', 'fontSize', 'bodyTextToken', 'cssZoom'] as const)
      expect(enlarged.dom[key]).toBe(baseline.dom[key]);
    report.zoom = { baseline, enlarged, browser: browser.version(), pid, ownedWindow, ratio: 2 };
    await expect(heading).toHaveText(selected.place.label);
    await expect(detail).toHaveText(retainedText, { useInnerText: true });
    await journal.getByRole('button', { name: 'Hide Journal panel', exact: true }).click();
    await expect(journal).toBeHidden();
    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    await expect(heading).toHaveText(selected.place.label);
    await expect(detail).toHaveText(retainedText, { useInnerText: true });
    expect(inspections).toHaveLength(1);

    async function reachable(control: Locator) {
      await expect(control).toBeFocused();
      await expect(control).toBeInViewport();
      const [buttonBounds, bodyBounds] = await Promise.all([
        control.boundingBox(),
        journal.locator('.ol-panel-body').boundingBox(),
      ]);
      expect(buttonBounds).not.toBeNull();
      expect(bodyBounds).not.toBeNull();
      expect(buttonBounds!.y).toBeGreaterThanOrEqual(bodyBounds!.y - 1);
      expect(buttonBounds!.y + buttonBounds!.height).toBeLessThanOrEqual(
        bodyBounds!.y + bodyBounds!.height + 1,
      );
    }
    await heading.focus();
    await page.keyboard.press('Tab');
    await reachable(focus);
    await page.keyboard.press('Enter'); // The actual camera-only control must not move the actor.
    await page.keyboard.press('Tab');
    await reachable(move);
    const bounds = await journal.boundingBox();
    const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(-1);
    expect(bounds!.y).toBeGreaterThanOrEqual(-1);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
    await page.screenshot({
      path: info.outputPath('journal-browser-zoom-200-keyboard.png'),
      timeout: 10000,
    });
    expect(digest(game.service.world)).toBe(initialDigest);
    expect(worldPosition(game.service.world.entities[game.service.controlledEntityId]!)).toEqual(
      initialPosition,
    );
    expect(commands).toEqual([]);
    expect(providers).toEqual([]);
    expect(
      posts.filter(
        (path) =>
          ![
            '/api/control',
            '/api/presence',
            '/api/known-places',
            '/api/known-places/inspect',
          ].includes(path),
      ),
    ).toEqual([]);
    expect(errors).toEqual([]);
    expect(outsideRequests).toEqual([]);
    const usage = await store.usage(0);
    expect(usage.usage.jevCalls).toBe(0);
    expect(usage.usage.llmCalls).toBe(0);
    expect(usage.budget.spentUsd).toBe(0);
    expect(usage.budget.reservedUsd).toBe(0);
    report.usage = usage;
    report.nativeWorldUnchanged = true;
    report.passed = true;
  } catch (error) {
    report.failure = error instanceof Error ? (error.stack ?? error.message) : String(error);
    throw error;
  } finally {
    for (const [owner, close] of [
      [
        'trace',
        async () => {
          if (tracing)
            await context!.tracing.stop({ path: info.outputPath('browser-zoom-trace.zip') });
        },
      ],
      [
        'page',
        async () => {
          await page?.close();
        },
      ],
      [
        'context',
        async () => {
          await context?.close();
        },
      ],
      [
        'browser connection',
        async () => {
          await browser?.close();
        },
      ],
      [
        'owned browser process',
        async () => {
          await server?.close();
        },
      ],
      [
        'owned game/server',
        async () => {
          const result = await game.shutdown();
          expect(result.saved).toBe(true);
          expect(result.problems).toEqual([]);
        },
      ],
    ] as const) {
      try {
        await close();
        cleanup.push({ owner, closed: true });
      } catch (error) {
        report.passed = false;
        cleanup.push({ owner, failure: String(error) });
      }
    }
    report.finishedAt = new Date().toISOString();
    await writeFile(
      info.outputPath('browser-zoom-report.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    expect(cleanup.filter((entry) => entry.failure)).toEqual([]);
  }
});

test.afterAll(closeTestDatabases);
