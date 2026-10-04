import { enterGame } from '../fixtures/browser.js';
import { testRepository, closeTestDatabases } from '../fixtures/database.js';
import { test, expect } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import { readConfig } from '../fixtures/database.js';

test('time settings persist with sole-tab entry, explicit transfer, logout and manual world pause', async ({
  page,
}, info) => {
  // Native, zero-budget fixture with explicit server ticks, independent of browser speed.
  const clock = { now: Date.now() };
  const game = await createGameServer({
    config: readConfig({ AI_BUDGET_USD: '0' }),
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
  // Headless Chromium reports each page as focused, so exercise the native event
  // handlers explicitly; these are event fixtures, not OS tab-switch evidence.
  const focus = (focused: boolean) =>
    page.evaluate((active) => {
      window.dispatchEvent(new Event(active ? 'focus' : 'blur'));
    }, focused);
  try {
    await page.goto('http://127.0.0.1:' + address.port);
    await focus(true);
    await enterGame(page);
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
    await settings.click();
    await expect(page.getByRole('radio', { name: '0.5×', exact: true })).toBeChecked();
    await page.screenshot({ path: info.outputPath('time-settings.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.ol-hud')).toHaveAttribute('data-narrow', 'true');
    const panelBounds = await page.locator('.ol-time-settings').boundingBox();
    expect(panelBounds!.x).toBeGreaterThanOrEqual(0);
    expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(390);
    await expect(
      page.getByText('Leaving this tab pauses your play.', { exact: false }),
    ).toBeVisible();
    await page.screenshot({ path: info.outputPath('time-settings-narrow.png') });
    await page.setViewportSize({ width: 1440, height: 960 });

    await focus(false);
    await expect(page.getByRole('dialog', { name: 'Game Paused', exact: true })).toBeHidden();
    await expect.poll(() => game.service.present).toBe(false);
    clock.now += 60_000;
    await game.service.tick(1);
    expect(game.service.world.simTime).toBe(90);
    expect(game.service.paused).toBe(true);
    await focus(true);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Game Paused', exact: true })).toBeHidden();
    await enterGame(page);
    await expect.poll(() => game.service.paused).toBe(false);
    await game.service.tick(1);
    expect(game.service.world.simTime).toBe(120);
    await page.getByRole('button', { name: 'Pause world', exact: true }).click();
    await expect.poll(() => game.service.pauseReason).toBe('manual');
    await focus(false);
    await focus(true);
    await enterGame(page);
    await expect.poll(() => game.service.pauseReason).toBe('manual');
    await page.getByRole('button', { name: 'Resume world', exact: true }).click();
    await expect.poll(() => game.service.paused).toBe(false);

    // Both headless pages report focus. Replacement must still fence the old page.
    const identity = await page.evaluate(() => sessionStorage.getItem('open-legend:tab-id'));
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
      await page.screenshot({ path: info.outputPath('tab-resume-narrow.png') });
      const bounds = await page.getByRole('dialog').boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
      await page.getByRole('button', { name: 'Resume Here', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
      await expect(other.getByRole('dialog', { name: 'Game Paused', exact: true })).toBeVisible();
      await other.getByRole('button', { name: 'Resume Here', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Game Paused', exact: true })).toBeVisible();
      await other.close();
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
    await page.close();
    clock.now += 12_001;
    await expect.poll(() => game.service.pauseReason).toBe('away');
  } finally {
    await page.close();
    await game.close();
  }
});

test.afterAll(closeTestDatabases);
