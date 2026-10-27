import { entityGet } from '../../packages/domain/src/index.js';
import { enterGame, blockExternalBrowserRequests } from '../fixtures/browser.js';
import { testRepository, closeTestDatabases } from '../fixtures/database.js';
import { test, expect } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import { readConfig } from '../fixtures/database.js';

// Time/control checks need desktop layout, while scene journeys cover larger frames.
const desktopViewport = { width: 1024, height: 720 };
test.use({ viewport: desktopViewport });

test('time settings persist with sole-tab entry, explicit transfer, logout and manual world pause', async ({
  page,
}, info) => {
  // Three pages, a reload and a fresh sign-in each allocate a software-rendered
  // scene. Allow the complete journey; individual readiness/input limits remain.
  test.setTimeout(120_000);
  await blockExternalBrowserRequests(page);
  // Native, zero-budget fixture with explicit server ticks, independent of browser speed.
  const clock = { now: Date.now() };
  const game = await createGameServer({
    // One-player clock/control checks need the authored solo start, not unrelated character art.
    config: readConfig({ AI_BUDGET_USD: '0', OPEN_LEGEND_WORLD_PRESET: 'solo' }),
    store: await testRepository(),
    production: true,
    tick: false,
    now: () => clock.now,
  });
  await new Promise<void>((resolve, reject) => {
    game.server.once('error', reject);
    game.server.listen(0, '127.0.0.1', resolve);
  });
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing listener');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Headless Chromium reports each page as focused. Match that document fact to
  // the synthetic event; this remains an event fixture, not OS tab-switch evidence.
  const focus = (focused: boolean) =>
    page.evaluate((active) => {
      Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => active });
      window.dispatchEvent(new Event(active ? 'focus' : 'blur'));
    }, focused);
  const finishDeparture = async () => {
    const actorId = game.service.controlledEntityId;
    const deadline = game.service.world.exitExposures?.[actorId];
    if (deadline === undefined) throw new Error('Missing simulated departure deadline');
    // Explicit unsuspended time exercises normal mechanics, not wall-clock catch-up.
    await game.service.tick(
      (deadline - game.service.world.simTime) /
        (game.service.config.baseRatio * game.service.speed),
      0,
    );
    expect(game.service.world.simTime).toBeCloseTo(deadline);
    expect(entityGet(game.service.world.entities, actorId)?.actor?.participation?.phase).toBe(
      'inactive',
    );
    expect(game.service.world.exitExposures?.[actorId]).toBeUndefined();
  };
  try {
    await page.goto('http://127.0.0.1:' + address.port);
    await focus(true);
    await enterGame(page);
    const identity = await page.evaluate(() => sessionStorage.getItem('open-legend:tab-id'));
    const settings = page.getByRole('button', { name: 'Time settings', exact: true });
    await settings.click();
    await expect(page.locator('.ol-time-settings .ol-caption')).toHaveText(
      '1×: one real second is 60 game seconds. Manual pause always wins. P pauses or resumes; Shift + ] speeds up; Shift + [ slows down.',
    );
    await expect.poll(() => game.service.paused).toBe(false);
    await game.service.tick(1);
    expect(game.service.world.simTime).toBe(60);
    await page
      .locator('.ol-radio')
      .filter({ has: page.getByRole('radio', { name: '0.5×', exact: true }) })
      .click();
    await expect.poll(() => game.service.speed).toBe(0.5);
    await expect(page.getByRole('radio', { name: '0.5×', exact: true })).toBeChecked();
    await game.service.tick(1);
    expect(game.service.world.simTime).toBe(90);
    await page.reload();
    await enterGame(page);
    expect(await page.evaluate(() => sessionStorage.getItem('open-legend:tab-id'))).toBe(identity);
    await settings.click();
    await expect(page.getByRole('radio', { name: '0.5×', exact: true })).toBeChecked();
    // These images document time controls; full WebGL viewport readbacks can
    // consume the journey budget without testing more controls.
    const desktopTimeBounds = await page.locator('.ol-time-settings').boundingBox();
    expect(desktopTimeBounds).not.toBeNull();
    await page.screenshot({ path: info.outputPath('time-settings.png'), clip: desktopTimeBounds! });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.ol-hud')).toHaveAttribute('data-narrow', 'true');
    const panelBounds = await page.locator('.ol-time-settings').boundingBox();
    expect(panelBounds!.x).toBeGreaterThanOrEqual(0);
    expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(390);
    await expect(
      page.getByText('Leaving this tab pauses your play.', { exact: false }),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath('time-settings-narrow.png'),
      clip: panelBounds!,
    });
    await page.setViewportSize(desktopViewport);

    const actorId = game.service.controlledEntityId;
    const exposure = game.service.world.participationPolicy!.exitExposureSeconds!;
    await focus(false);
    await expect(page.getByRole('dialog', { name: 'Game is paused.', exact: true })).toBeVisible();
    await expect.poll(() => game.service.present).toBe(false);
    const departureStartedAt = game.service.world.simTime;
    const gameSecondsPerRealSecond = game.service.config.baseRatio * game.service.speed;
    await expect
      .poll(() => game.service.world.exitExposures?.[game.service.controlledEntityId])
      .toBeGreaterThan(departureStartedAt + gameSecondsPerRealSecond);
    const departureDeadline = game.service.world.exitExposures?.[game.service.controlledEntityId];
    expect(departureDeadline).toBe(departureStartedAt + exposure);
    clock.now += 60_000;
    expect(game.service.world.simTime).toBe(departureStartedAt);
    await game.service.tick(1);
    expect(game.service.world.simTime).toBe(departureStartedAt + gameSecondsPerRealSecond);
    expect(entityGet(game.service.world.entities, actorId)!.actor!.participation?.phase).toBe(
      'exiting',
    );
    expect(game.service.world.exitExposures?.[game.service.controlledEntityId]).toBe(
      departureDeadline,
    );
    expect(game.service.paused).toBe(false);
    await finishDeparture();
    expect(game.service.pauseReason).toBe('away');
    expect(game.service.paused).toBe(true);
    await game.service.tick(1);
    expect(game.service.world.simTime).toBe(departureDeadline);
    await focus(true);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Game is paused.', exact: true })).toBeHidden();
    await enterGame(page);
    await expect.poll(() => game.service.paused).toBe(false);
    expect(entityGet(game.service.world.entities, actorId)!.actor!.participation?.phase).toBe(
      'active',
    );
    const resumedAt = game.service.world.simTime;
    await game.service.tick(1);
    expect(game.service.world.simTime).toBe(resumedAt + gameSecondsPerRealSecond);
    await page.getByRole('button', { name: 'Pause world', exact: true }).click();
    await expect.poll(() => game.service.pauseReason).toBe('manual');
    await focus(false);
    await focus(true);
    await enterGame(page);
    await expect.poll(() => game.service.pauseReason).toBe('manual');
    const manuallyPausedAt = game.service.world.simTime;
    await game.service.tick(1);
    expect(game.service.world.simTime).toBe(manuallyPausedAt);
    await page.getByRole('button', { name: 'Resume world', exact: true }).click();
    await expect.poll(() => game.service.paused).toBe(false);

    // Both headless pages report focus. Replacement must still fence the old page.
    const other = await page.context().newPage();
    // Fixture for a duplicated tab's copied session storage; identity must split
    // before it can send commands as the original page.
    await other.addInitScript((id) => {
      if (id) sessionStorage.setItem('open-legend:tab-id', id);
    }, identity);
    try {
      await other.goto('http://127.0.0.1:' + address.port);
      await expect(other.getByRole('dialog', { name: 'Game Paused', exact: true })).toBeVisible();
      await expect(
        other.getByText('OpenLegend is open in another tab.', { exact: true }),
      ).toBeVisible();
      expect(await other.evaluate(() => sessionStorage.getItem('open-legend:tab-id'))).not.toBe(
        identity,
      );
      await other.getByRole('button', { name: 'Resume Here', exact: true }).click();
      await expect(other.getByRole('dialog')).toBeHidden();
      await expect(page.getByRole('dialog', { name: 'Game Paused', exact: true })).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator('.ol-hud')).toHaveAttribute('data-narrow', 'true');
      const bounds = await page.getByRole('dialog').boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
      await page.screenshot({ path: info.outputPath('tab-resume-narrow.png'), clip: bounds! });
      await page.getByRole('button', { name: 'Resume Here', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
      await expect(other.getByRole('dialog', { name: 'Game Paused', exact: true })).toBeVisible();
      await other.getByRole('button', { name: 'Resume Here', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Game Paused', exact: true })).toBeVisible();
      await enterGame(other);
      const otherControls = () =>
        game.service.controlsElsewhere({
          ...game.service.localScope,
          connectionId: identity!,
        });
      expect(otherControls()).toBe(true);
      // Ordinary close runs pagehide/release. Default Playwright close skips unload;
      // abrupt loss and subsequent elapsed-time reconciliation are checked below.
      await Promise.all([
        other.waitForEvent('close', { timeout: 5000 }),
        other.close({ runBeforeUnload: true }),
      ]);
      // Closing the document is not an acknowledgement of queued server cleanup.
      await expect.poll(otherControls).toBe(false);
      // Restore the foreground tab before evaluating its synthetic focus event;
      // background page scheduling can otherwise delay that evaluation.
      await page.bringToFront();
      await focus(true);
      await enterGame(page); // The selected page is gone; one surviving tab needs no Resume.
      const logoutTab = await page.context().newPage();
      try {
        await logoutTab.goto('http://127.0.0.1:' + address.port);
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
        await page.getByRole('link', { name: 'Sign in', exact: true }).click();
        await enterGame(page);
      } finally {
        await logoutTab.close();
      }
    } finally {
      await other.close();
    }
    expect(errors).toEqual([]);
    expect(await game.service.store.recentJobs()).toEqual([]);
    const beforeClose = game.service.world.simTime;
    await page.close();
    await expect
      .poll(() => entityGet(game.service.world.entities, actorId)?.actor?.participation?.phase)
      .toBe('exiting');
    clock.now += 12_001;
    // Advance only after native disconnect has begun departure. Elapsed real time
    // must not renew its original game-time deadline or skip the authored exposure.
    await game.service.tick(0);
    await expect
      .poll(() => game.service.world.exitExposures?.[actorId])
      .toBe(beforeClose + exposure);
    expect(game.service.present).toBe(false);
    expect(game.service.paused).toBe(false);
    expect(entityGet(game.service.world.entities, actorId)!.actor!.participation?.phase).toBe(
      'exiting',
    );
    await finishDeparture();
    expect(game.service.world.simTime).toBe(beforeClose + exposure);
    expect(entityGet(game.service.world.entities, actorId)!.actor!.participation?.phase).toBe(
      'inactive',
    );
    expect(game.service.world.exitExposures?.[actorId]).toBeUndefined();
    await expect.poll(() => game.service.pauseReason).toBe('away');
    await game.service.tick(1);
    expect(game.service.world.simTime).toBe(beforeClose + exposure);
  } finally {
    await page.close();
    await game.close();
  }
});

test.afterAll(closeTestDatabases);
