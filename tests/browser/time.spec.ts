import type { AiUsageView, ApiResult, GameView } from '@open-legend/protocol';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { blockExternalBrowserRequests, enterGame } from '../fixtures/browser.js';
import { browserTabHeaders, rustBrowserGame } from '../fixtures/rust-browser.js';

// Time/control checks need desktop layout, while scene journeys cover larger frames.
const desktopViewport = { width: 1024, height: 720 };
test.use({ viewport: desktopViewport });

function readSignedState(
  base: string,
  request: APIRequestContext,
  headers: Record<string, string>,
): () => Promise<GameView | null> {
  return async () => {
    const result = await request.get(base + '/api/state', { headers });
    try {
      if (result.status() === 409 && ((await result.json()) as ApiResult).code === 'loading')
        return null;
      expect(result.ok(), 'signed game view').toBe(true);
      return (await result.json()) as GameView;
    } finally {
      await result.dispose();
    }
  };
}

async function readTab(base: string, tab: Page) {
  return readSignedState(base, tab.request, await browserTabHeaders(tab));
}

async function currentView(state: () => Promise<GameView | null>) {
  const received: { view: GameView | null } = { view: null };
  await expect
    .poll(async () => {
      received.view = await state();
      return received.view !== null;
    })
    .toBe(true);
  if (!received.view) throw new Error('The tab has no signed game view.');
  return received.view;
}

function signedWriteHeaders(base: string, tab: Record<string, string>, view: GameView) {
  if (!view.access?.scope) throw new Error('The current tab has no signed game scope.');
  return { ...tab, Origin: base, 'X-OL-Scope': view.access.scope };
}

async function openGameMenu(page: Page) {
  if (!(await page.getByRole('button', { name: 'Back to the world', exact: true }).isVisible()))
    await page.getByRole('button', { name: 'Game menu (Escape)', exact: true }).click();
}

async function toggleWorldPause(page: Page, paused: boolean) {
  await openGameMenu(page);
  await page
    .getByRole('button', { name: paused ? 'Pause world' : 'Resume world', exact: true })
    .click();
  await page.getByRole('button', { name: 'Back to the world', exact: true }).click();
}

/** Measure wall-time progress through signed server views. The wide band allows
 * ordinary browser and host scheduling variation and separates adjacent rates. */
async function expectRate(state: () => Promise<GameView | null>, ratio: number) {
  const start = performance.now();
  const from = (await currentView(state)).clock.seconds;
  await new Promise((resolve) => setTimeout(resolve, 1400));
  const to = (await currentView(state)).clock.seconds;
  const received = (to - from) / ((performance.now() - start) / 1000);
  expect(received).toBeGreaterThan(ratio * 0.75);
  expect(received).toBeLessThan(ratio * 1.25);
}

test('time settings persist with sole-tab entry, explicit transfer, logout and manual world pause', async ({
  page,
}, info) => {
  // Three pages, a reload and a fresh sign-in each allocate a software-rendered
  // scene. Allow the complete journey; individual readiness/input limits remain.
  test.setTimeout(120_000);
  await blockExternalBrowserRequests(page);
  const game = await rustBrowserGame({ godMode: true });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Headless Chromium reports each page as focused. Match that document fact to
  // the synthetic event so the browser's real focus handler can run.
  const focus = (focused: boolean) =>
    page.evaluate((active) => {
      Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => active });
      window.dispatchEvent(new Event(active ? 'focus' : 'blur'));
    }, focused);
  try {
    await page.goto(game.base);
    await focus(true);
    await enterGame(page);
    const identity = await page.evaluate(() => sessionStorage.getItem('open-legend:tab-id'));
    expect(identity).toBeTruthy();
    const tabHeaders = await browserTabHeaders(page);
    const state = readSignedState(game.base, page.context().request, tabHeaders);
    const initial = await currentView(state);
    if (initial.clock.pauseReason === 'manual') await toggleWorldPause(page, false);
    await expect.poll(state).toMatchObject({ clock: { paused: false, speed: 1 } });
    expect(initial.access?.timeSpeeds).toEqual([0.5, 1, 3, 8]);
    await expectRate(state, initial.clock.baseRatio);
    await openGameMenu(page);
    await page.getByRole('button', { name: 'Time', exact: true }).click();
    const half = page.getByRole('radio', { name: '0.5×', exact: true });
    await page.locator('.ol-radio').filter({ has: half }).click();
    await expect.poll(state).toMatchObject({ clock: { speed: 0.5, paused: false } });
    await expect(half).toBeChecked();
    await expectRate(state, initial.clock.baseRatio * 0.5);

    await page.reload();
    await enterGame(page);
    expect(await page.evaluate(() => sessionStorage.getItem('open-legend:tab-id'))).toBe(identity);
    await expect
      .poll(state)
      .toMatchObject({ clock: { speed: 0.5 }, access: { controlling: true } });
    await openGameMenu(page);
    await page.getByRole('button', { name: 'Time', exact: true }).click();
    await expect(half).toBeChecked();
    await openGameMenu(page);
    await page.getByRole('button', { name: 'Controls', exact: true }).click();
    const controls = page.getByRole('tabpanel', { name: 'Controls & help', exact: true });
    await expect(
      page.getByText('Leaving this tab pauses your play.', { exact: false }),
    ).toBeVisible();
    const desktopTimeBounds = await controls.boundingBox();
    expect(desktopTimeBounds).not.toBeNull();
    await page.screenshot({ path: info.outputPath('time-settings.png'), clip: desktopTimeBounds! });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.ol-hud')).toHaveAttribute('data-narrow', 'true');
    const panelBounds = await controls.boundingBox();
    expect(panelBounds!.x).toBeGreaterThanOrEqual(0);
    expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(390);
    await page.screenshot({
      path: info.outputPath('time-settings-narrow.png'),
      clip: panelBounds!,
    });
    await page.setViewportSize(desktopViewport);

    // The bundled fixture installs 300 game seconds of departure exposure.
    // Let the real clock spend it and observe both sides of the boundary.
    const beforeDeparture = (await currentView(state)).clock.seconds;
    await focus(false);
    await expect(page.getByRole('dialog', { name: 'Game is paused.', exact: true })).toBeVisible();
    await expect
      .poll(state)
      .toMatchObject({ player: { participation: 'exiting' }, clock: { paused: false } });
    const exitingAt = (await currentView(state)).clock.seconds;
    await expect
      .poll(state, { timeout: 15_000 })
      .toMatchObject({ player: { participation: 'inactive' }, clock: { pauseReason: 'away' } });
    const departedAt = (await currentView(state)).clock.seconds;
    expect(departedAt - beforeDeparture).toBeGreaterThanOrEqual(295);
    expect(departedAt - exitingAt).toBeLessThanOrEqual(305);
    await new Promise((resolve) => setTimeout(resolve, 550));
    expect((await currentView(state)).clock.seconds).toBe(departedAt);
    await focus(true);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Game is paused.', exact: true })).toBeHidden();
    await enterGame(page);
    await expect
      .poll(state)
      .toMatchObject({ player: { participation: 'active' }, clock: { paused: false } });
    await expect
      .poll(async () => (await currentView(state)).clock.seconds)
      .toBeGreaterThan(departedAt);
    await toggleWorldPause(page, true);
    await expect.poll(state).toMatchObject({ clock: { pauseReason: 'manual' } });
    await focus(false);
    await expect(page.getByRole('dialog', { name: 'Game is paused.', exact: true })).toBeVisible();
    await focus(true);
    await enterGame(page);
    const manuallyPausedAt = (await currentView(state)).clock.seconds;
    await expect.poll(state).toMatchObject({ clock: { pauseReason: 'manual' } });
    await new Promise((resolve) => setTimeout(resolve, 550));
    expect((await currentView(state)).clock.seconds).toBe(manuallyPausedAt);
    await toggleWorldPause(page, false);
    await expect.poll(state).toMatchObject({ clock: { paused: false } });

    // A duplicated tab's copied identity must split before it can send commands.
    const other = await page.context().newPage();
    await other.addInitScript((id) => {
      if (id) sessionStorage.setItem('open-legend:tab-id', id);
    }, identity);
    try {
      await other.goto(game.base);
      const otherDialog = other.getByRole('dialog', { name: 'Game Paused', exact: true });
      const firstDialog = page.getByRole('dialog', { name: 'Game Paused', exact: true });
      await expect(otherDialog).toBeVisible();
      await expect(
        other.getByText('Open Legend is open in another tab.', { exact: true }),
      ).toBeVisible();
      expect(await other.evaluate(() => sessionStorage.getItem('open-legend:tab-id'))).not.toBe(
        identity,
      );
      const otherState = await readTab(game.base, other);
      await other.getByRole('button', { name: 'Resume Here', exact: true }).click();
      await expect(otherDialog).toBeHidden();
      await expect(firstDialog).toBeVisible();
      await expect
        .poll(state)
        .toMatchObject({ access: { controlling: false, controlledElsewhere: true } });
      await expect.poll(otherState).toMatchObject({ access: { controlling: true } });
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator('.ol-hud')).toHaveAttribute('data-narrow', 'true');
      const bounds = await firstDialog.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
      await page.screenshot({ path: info.outputPath('tab-resume-narrow.png'), clip: bounds! });
      await page.getByRole('button', { name: 'Resume Here', exact: true }).click();
      await expect(firstDialog).toBeHidden();
      await expect(otherDialog).toBeVisible();
      const current = await currentView(state);
      expect(current.access?.controlling).toBe(true);
      const displaced = await currentView(otherState);
      expect(displaced.access?.controlling).toBe(false);
      const stale = await other.request.post(game.base + '/api/control', {
        headers: signedWriteHeaders(game.base, await browserTabHeaders(other), displaced),
        data: { paused: true },
      });
      try {
        expect((await stale.json()) as ApiResult).toMatchObject({ ok: false, code: 'stale-scope' });
      } finally {
        await stale.dispose();
      }
      expect((await currentView(state)).clock.paused).toBe(false);
      await other.getByRole('button', { name: 'Resume Here', exact: true }).click();
      await expect(firstDialog).toBeVisible();
      await enterGame(other);
      await expect.poll(otherState).toMatchObject({ access: { controlling: true } });
      await Promise.all([
        other.waitForEvent('close', { timeout: 5000 }),
        other.close({ runBeforeUnload: true }),
      ]);
      await expect.poll(state).toMatchObject({ access: { controlledElsewhere: false } });
      await page.bringToFront();
      await focus(true);
      await enterGame(page);
      await expect.poll(state).toMatchObject({ access: { controlling: true } });
      const logoutTab = await page.context().newPage();
      try {
        await logoutTab.goto(game.base);
        let finishLogout!: () => void;
        const heldLogout = new Promise<void>((resolve) => {
          finishLogout = resolve;
        });
        await logoutTab.route('**/api/session/logout', async (route) => {
          await heldLogout;
          await route.continue();
        });
        try {
          await logoutTab.getByRole('button', { name: 'Log Out', exact: true }).click();
          await logoutTab.evaluate(() => {
            window.dispatchEvent(new Event('blur'));
            window.dispatchEvent(new Event('focus'));
          });
          await expect(
            logoutTab.getByRole('button', { name: 'Resume Here', exact: true }),
          ).toBeDisabled();
        } finally {
          finishLogout();
        }

        await expect(logoutTab.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
        const loggedOut = await page.request.get(game.base + '/api/session', {
          headers: tabHeaders,
        });
        expect(loggedOut.status()).toBe(401);
        await loggedOut.dispose();
        await page.getByRole('link', { name: 'Sign in', exact: true }).click();
        await enterGame(page);
      } finally {
        await logoutTab.close();
      }
    } finally {
      await other.close();
    }
    expect(errors).toEqual([]);
    const postLogoutHeaders = await browserTabHeaders(page);
    const usage = await page.request.get(game.base + '/api/ai/usage', {
      headers: postLogoutHeaders,
    });
    expect(usage.ok()).toBe(true);
    expect(((await usage.json()) as AiUsageView).usage.llmCalls).toBe(0);
    await usage.dispose();

    // Dropping the final transport also runs a full ordinary departure.
    const finalState = readSignedState(game.base, page.context().request, postLogoutHeaders);
    const beforeClose = (await currentView(finalState)).clock.seconds;
    await page.close();
    await expect
      .poll(finalState)
      .toMatchObject({ player: { participation: 'exiting' }, clock: { paused: false } });
    const closingAt = (await currentView(finalState)).clock.seconds;
    await expect
      .poll(finalState, { timeout: 15_000 })
      .toMatchObject({ player: { participation: 'inactive' }, clock: { pauseReason: 'away' } });
    const closedAt = (await currentView(finalState)).clock.seconds;
    expect(closedAt - beforeClose).toBeGreaterThanOrEqual(295);
    expect(closedAt - closingAt).toBeLessThanOrEqual(305);
    await new Promise((resolve) => setTimeout(resolve, 550));
    expect((await currentView(finalState)).clock.seconds).toBe(closedAt);
  } finally {
    await page.close();
    await game.close();
  }
});
