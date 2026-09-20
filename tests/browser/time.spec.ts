import { test, expect } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import { readConfig } from '../../apps/server/src/config.js';
import { SqliteStore } from '../../apps/server/src/store.js';

test('time settings persist and distinguish background play, manual pause and disconnect', async ({
  page,
}, info) => {
  // Native, zero-budget fixture with explicit server ticks, independent of browser speed.
  const clock = { now: Date.now() };
  const game = await createGameServer({
    config: readConfig({}),
    store: new SqliteStore(':memory:'),
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
    await expect(page.locator('#loading')).toBeHidden();
    const settings = page.getByRole('button', { name: 'Time settings', exact: true });
    const checkbox = page.getByRole('checkbox', { name: 'Pause game when hidden', exact: true });
    await settings.click();
    await expect(checkbox).toBeChecked();
    await expect(page.locator('.ol-time-settings .ol-caption')).toHaveText(
      '1×: one real second is one game minute. Manual pause always wins.',
    );
    await expect.poll(() => game.service.paused).toBe(false);
    game.service.tick(1);
    expect(game.service.world.simTime).toBe(60);
    await page
      .locator('.ol-radio')
      .filter({ has: page.getByRole('radio', { name: '0.5×', exact: true }) })
      .click();
    await expect.poll(() => game.service.speed).toBe(0.5);
    await expect(page.getByRole('radio', { name: '0.5×', exact: true })).toBeChecked();
    game.service.tick(1);
    expect(game.service.world.simTime).toBe(90);
    await checkbox.uncheck();
    await expect(checkbox).toBeEnabled();
    await expect.poll(() => game.service.profile.preferences.pauseWhenHidden).toBe(false);
    await page.reload();
    await expect(page.locator('#loading')).toBeHidden();
    await settings.click();
    await expect(checkbox).not.toBeChecked();
    await expect(page.getByRole('radio', { name: '0.5×', exact: true })).toBeChecked();
    await page.screenshot({ path: info.outputPath('time-settings.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.ol-hud')).toHaveAttribute('data-narrow', 'true');
    const panelBounds = await page.locator('.ol-time-settings').boundingBox();
    expect(panelBounds!.x).toBeGreaterThanOrEqual(0);
    expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(390);
    // The dropdown must sit above adjacent panels, not merely within the viewport.
    await checkbox.check();
    await expect(checkbox).toBeEnabled();
    await checkbox.uncheck();
    await expect(checkbox).toBeEnabled();
    await page.screenshot({ path: info.outputPath('time-settings-narrow.png') });
    await page.setViewportSize({ width: 1440, height: 960 });

    await focus(false);
    await expect.poll(() => game.service.present).toBe(false);
    clock.now += 60_000;
    game.service.tick(1);
    expect(game.service.world.simTime).toBe(120);
    expect(game.service.paused).toBe(false);
    await focus(true);
    await expect.poll(() => game.service.present).toBe(true);
    await checkbox.check();
    await expect(checkbox).toBeEnabled();
    await focus(false);
    await expect.poll(() => game.service.pauseReason).toBe('away');
    game.service.tick(1);
    expect(game.service.world.simTime).toBe(120);
    await focus(true);
    await expect.poll(() => game.service.paused).toBe(false);
    await page.getByRole('button', { name: 'Pause world', exact: true }).click();
    await checkbox.uncheck();
    await expect(checkbox).toBeEnabled();
    await focus(false);
    expect(game.service.pauseReason).toBe('manual');
    await focus(true);
    await page.getByRole('button', { name: 'Resume world', exact: true }).click();
    await expect.poll(() => game.service.paused).toBe(false);
    expect(errors).toEqual([]);
    expect(game.service.store.recentJobs()).toEqual([]);
    await page.close();
    clock.now += 12_001;
    await expect.poll(() => game.service.pauseReason).toBe('away');
  } finally {
    await page.close();
    await game.close();
  }
});
