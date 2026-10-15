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
  const posts: string[] = [];
  type ObservationPhase = 'entry' | 'reading' | 'cleanup';
  let phase: ObservationPhase = 'entry';
  const postBodies: Array<{ path: string; body: unknown; phase: ObservationPhase }> = [];
  const captures: Array<{
    name: string;
    width: number;
    height: number;
    expectedWidth: number;
    expectedHeight: number;
  }> = [];
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
      'One native Journal place at real Chromium 200% browser zoom and measured 320-CSS-pixel reflow, retained through Hide/reopen with keyboard focus and no gameplay command.',
    limitations: [
      'X11 XTEST key input on an isolated Linux virtual display is not physical keyboard, native IME, assistive-device or uncoached-player evidence.',
      'One normal authored opening and one selected place at two owned window widths, including measured 320-CSS-pixel reflow; not all screens or tasks.',
      'No CSS/font injection, mobile/device emulation, page-scale emulation, application-scale change or direct browser preference edits.',
      'Chromium uses only its own disposable automation profile; no user browser, profile or settings are opened.',
    ],
    posts,
    postBodies,
    captures,
    commands,
    providers,
    errors,
    outsideRequests,
    inspections,
    nativeInput,
    cleanup,
    providerCostUsd: 0,
    cumulativeTaskProviderCostUsd: 0,
    traceOwner: 'Playwright runner automatic retain-on-failure tracing',
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
      postBodies.push({ path: url.pathname, body: request.postDataJSON(), phase });
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
    phase = 'reading';

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
    async function capture(
      name: string,
      viewport: { innerWidth: number; innerHeight: number; dpr: number },
    ) {
      report.captureInProgress = name;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          (async () => {
            // Native page zoom changes DPR after context creation. Omit Playwright's
            // cached viewport clip and capture the actual view without rescaling it.
            const screenshot = await cdp.send('Page.captureScreenshot', {
              format: 'png',
              fromSurface: false,
              captureBeyondViewport: false,
            });
            const png = Buffer.from(screenshot.data, 'base64');
            const width = png.readUInt32BE(16),
              height = png.readUInt32BE(20);
            const expectedWidth = Math.round(viewport.innerWidth * viewport.dpr),
              expectedHeight = Math.round(viewport.innerHeight * viewport.dpr);
            await writeFile(info.outputPath(name), png);
            captures.push({ name, width, height, expectedWidth, expectedHeight });
            expect(Math.abs(width - expectedWidth)).toBeLessThanOrEqual(2);
            expect(Math.abs(height - expectedHeight)).toBeLessThanOrEqual(2);
          })(),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(
              () =>
                reject(
                  new Error(`Native pixel capture exceeded the original 10-second bound: ${name}`),
                ),
              10000,
            );
          }),
        ]);
        delete report.captureInProgress;
      } finally {
        clearTimeout(timeout);
      }
    }
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
      return { dom, windowId: native.windowId, bounds: native.bounds, xGeometry };
    }
    const baseline = await metrics();
    expect(baseline.dom.appScale).toBe('1');
    expect(baseline.dom.visualScale).toBe(1);
    await capture('journal-browser-zoom-100.png', baseline.dom);
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
      await expect(control).toBeInViewport({ ratio: 1 });
      const measure = () =>
        control.evaluate((button) => {
          if (!(button instanceof HTMLButtonElement))
            throw new Error('Expected the exact Journal button.');
          const body = button.closest<HTMLElement>('.ol-panel-body')!;
          const buttonRect = button.getBoundingClientRect(),
            bodyRect = body.getBoundingClientRect();
          const style = getComputedStyle(button);
          const width = Number.parseFloat(style.outlineWidth),
            offset = Number.parseFloat(style.outlineOffset);
          const extent = Math.max(0, width + offset);
          const ringX = (extent * buttonRect.width) / button.offsetWidth;
          const ringY = (extent * buttonRect.height) / button.offsetHeight;
          const bodyX = bodyRect.width / body.offsetWidth,
            bodyY = bodyRect.height / body.offsetHeight;
          const left = bodyRect.left + body.clientLeft * bodyX,
            top = bodyRect.top + body.clientTop * bodyY;
          const ring = {
            left: buttonRect.left - ringX,
            top: buttonRect.top - ringY,
            right: buttonRect.right + ringX,
            bottom: buttonRect.bottom + ringY,
          };
          // Camera hints are visible overlays even when they ignore pointer hits.
          const overlappingHints = [...document.querySelectorAll<HTMLElement>('[role="tooltip"]')]
            .filter((hint) => {
              const rect = hint.getBoundingClientRect(),
                style = getComputedStyle(hint);
              return (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                Number(style.opacity) > 0 &&
                rect.width > 0 &&
                rect.height > 0 &&
                rect.left < ring.right &&
                rect.right > ring.left &&
                rect.top < ring.bottom &&
                rect.bottom > ring.top
              );
            })
            .map((hint) => hint.textContent);
          const inset = Math.min(2, buttonRect.width / 4, buttonRect.height / 4);
          const points = [
            [buttonRect.left + buttonRect.width / 2, buttonRect.top + buttonRect.height / 2],
            [buttonRect.left + inset, buttonRect.top + buttonRect.height / 2],
            [buttonRect.right - inset, buttonRect.top + buttonRect.height / 2],
            [buttonRect.left + buttonRect.width / 2, buttonRect.top + inset],
            [buttonRect.left + buttonRect.width / 2, buttonRect.bottom - inset],
          ] as const;
          return {
            control: button.textContent,
            button: {
              left: buttonRect.left,
              top: buttonRect.top,
              right: buttonRect.right,
              bottom: buttonRect.bottom,
            },
            outline: { width, offset, style: style.outlineStyle },
            ring,
            overlappingHints,
            visibleHitPoints: points.every(([x, y]) =>
              button.contains(document.elementFromPoint(x, y)),
            ),
            clip: {
              left,
              top,
              right: left + body.clientWidth * bodyX,
              bottom: top + body.clientHeight * bodyY,
            },
          };
        });
      await expect
        .poll(async () => {
          const geometry = await measure();
          const { ring, clip, outline, overlappingHints, visibleHitPoints } = geometry;
          report.focusInProgress = geometry;
          return (
            outline.width > 0 &&
            outline.style !== 'none' &&
            overlappingHints.length === 0 &&
            visibleHitPoints &&
            ring.left >= clip.left - 1 &&
            ring.top >= clip.top - 1 &&
            ring.right <= clip.right + 1 &&
            ring.bottom <= clip.bottom + 1
          );
        })
        .toBe(true);
      delete report.focusInProgress;
      return measure();
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
    await capture('journal-browser-zoom-200-keyboard.png', enlarged.dom);

    // Keep the measured native 200% zoom. Only this owned browser window is
    // resized; no viewport/device/page-scale emulation supplies the 320px phase.
    if (typeof enlarged.bounds.width !== 'number')
      throw new Error('Native browser width is unavailable.');
    const reflowWidth = Math.round(enlarged.bounds.width + (320 - enlarged.dom.innerWidth) * 2);
    await cdp.send('Browser.setWindowBounds', {
      windowId: enlarged.windowId,
      bounds: { width: reflowWidth },
    });
    await expect
      .poll(() => page!.evaluate(() => Math.abs(innerWidth - 320)))
      .toBeLessThanOrEqual(1);
    await expect(page.locator('.ol-hud')).toHaveAttribute('data-tight', 'true');
    const reflow = await metrics();
    expect(reflow.windowId).toBe(enlarged.windowId);
    expect(reflow.bounds.width).toBe(reflowWidth);
    expect(reflow.bounds.height).toBe(enlarged.bounds.height);
    expect(Math.abs(reflow.dom.innerWidth - 320)).toBeLessThanOrEqual(1);
    expect(reflow.dom.dpr).toBe(enlarged.dom.dpr);
    expect(reflow.dom.visualScale).toBe(1);
    for (const key of ['appScale', 'fontSize', 'bodyTextToken', 'cssZoom'] as const)
      expect(reflow.dom[key]).toBe(baseline.dom[key]);
    await expect(heading).toHaveText(selected.place.label);
    await expect(detail).toHaveText(retainedText, { useInnerText: true });
    await journal.getByRole('button', { name: 'Hide Journal panel', exact: true }).click();
    await expect(journal).toBeHidden();
    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    await expect(heading).toHaveText(selected.place.label);
    await expect(detail).toHaveText(retainedText, { useInnerText: true });
    expect(inspections).toHaveLength(1);
    await heading.focus();
    await page.keyboard.press('Tab');
    const narrowFocus = await reachable(focus);
    await page.keyboard.press('Tab');
    const narrowMove = await reachable(move);
    const reflowGeometry = () =>
      journal.evaluate((panel) => {
        const rect = panel.getBoundingClientRect();
        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: innerWidth,
          height: innerHeight,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
        };
      });
    await expect
      .poll(async () => {
        const geometry = await reflowGeometry();
        report.reflowInProgress = geometry;
        return (
          geometry.left >= -1 &&
          geometry.top >= -1 &&
          geometry.right <= geometry.width + 1 &&
          geometry.bottom <= geometry.height + 1 &&
          geometry.documentWidth <= geometry.width + 1 &&
          geometry.bodyWidth <= geometry.width + 1
        );
      })
      .toBe(true);
    delete report.reflowInProgress;
    report.reflow320 = {
      metrics: reflow,
      requestedNativeWidth: reflowWidth,
      focus: narrowFocus,
      move: narrowMove,
      geometry: await reflowGeometry(),
      selectedPlaceId: selected.place.id,
      inspectionRequests: inspections.length,
    };
    await capture('journal-browser-zoom-200-reflow-320.png', reflow.dom);
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
            '/api/presence',
            '/api/embodiment',
            '/api/commitments',
            '/api/known-places',
            '/api/known-places/inspect',
          ].includes(path),
      ),
    ).toEqual([]);
    // Entry acquires a native controlling lease; it is not a read. Reading and
    // browser zoom must not acquire, replace or release control again.
    const ownership = postBodies.filter(({ path }) => path === '/api/embodiment');
    expect(ownership).toHaveLength(1);
    expect(ownership[0]!.phase).toBe('entry');
    expect(ownership[0]!.body).toEqual({
      id: expect.any(String),
      operation: 'acquire',
      expectedGeneration: 0,
    });
    for (const request of postBodies.filter(({ path }) => path === '/api/commitments'))
      expect(request.body).toEqual({});
    for (const request of postBodies.filter(({ path }) => path === '/api/known-places'))
      expect(request.body).toEqual({ query: '' });
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
    phase = 'cleanup';
    for (const [owner, close] of [
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
