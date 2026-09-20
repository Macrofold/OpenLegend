import { test, expect } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import { readConfig } from '../../apps/server/src/config.js';
import { SqliteStore } from '../../apps/server/src/store.js';

test('complete searchable actions and the player preference survive reopening and reload', async ({
  page,
}, info) => {
  // A stationary native fixture keeps scene coordinates independent of test speed.
  const game = await createGameServer({
    config: readConfig({}),
    store: new SqliteStore(':memory:'),
    production: true,
    tick: false,
  });
  await new Promise<void>((resolve, reject) => {
    game.server.once('error', reject);
    game.server.listen(0, '127.0.0.1', resolve);
  });
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing listener');
  const aiRequests: string[] = [];
  page.on('request', (request) => {
    if (/\/api\/(chat|invent)$/.test(request.url())) aiRequests.push(request.url());
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:' + address.port);
    await expect(page.locator('#loading')).toBeHidden();
    await expect.poll(() => game.service.paused).toBe(false);
    const reedsPoint = { x: 480, y: 398 };
    await page.locator('#world').click({ button: 'right', position: reedsPoint });
    await expect(page.locator('#contextTitle')).toHaveText('River reeds');
    await expect(
      page.locator('#contextMenu').getByRole('button', { name: /^Gather River reeds/ }),
    ).toBeEnabled();
    const search = page.getByRole('searchbox', { name: 'Find an action' });
    const showUnavailable = page.locator('.unavailable-toggle');
    const menu = page.locator('#contextMenu');
    const tooltip = page.getByRole('tooltip');
    const gather = menu.getByRole('button', { name: /^Gather River reeds/ });
    await expect(search).toBeFocused();
    await expect(menu.locator('.action-search-label, .invent-action, .invention-note')).toHaveCount(
      0,
    );
    await expect(menu.locator('.catalogue-status')).toBeHidden();
    expect(await search.evaluate((element) => getComputedStyle(element).fontSize)).toBe(
      await gather.evaluate((element) => getComputedStyle(element).fontSize),
    );
    const labelBounds = await gather.locator('span').boundingBox();
    const tagBounds = await gather.locator('small').boundingBox();
    expect(tagBounds!.x).toBeGreaterThan(labelBounds!.x + labelBounds!.width);
    expect(Math.abs(tagBounds!.y - labelBounds!.y)).toBeLessThan(5);
    await gather.hover();
    await page.waitForTimeout(400);
    await expect(tooltip).toBeHidden();
    await expect(tooltip).toBeVisible({ timeout: 1200 });
    await expect(tooltip).toContainText('River reeds has');
    await expect(gather).toHaveAttribute('aria-describedby', 'actionTooltip');
    await search.hover();
    await expect(tooltip).toBeHidden();
    await expect(showUnavailable).toHaveAttribute('aria-expanded', 'false');
    await expect(showUnavailable).toHaveText('› Show Unavailable Actions');
    // Object menus remain strictly scoped, even with unrelated search terms.
    await search.fill('hunt');
    await expect(page.locator('#contextMenu .catalogue-action')).toHaveCount(0);
    await showUnavailable.click();
    await expect.poll(() => game.service.profile.preferences.showUnavailableActions).toBe(true);
    await expect(showUnavailable).toBeEnabled();
    await expect(showUnavailable).toHaveText('› Hide Unavailable Actions');
    await expect(menu.locator('.catalogue-action')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.locator('#world').click({ button: 'right', position: { x: 800, y: 580 } });
    await search.fill('hunt');
    await expect(
      page.locator('#contextMenu .unavailable-actions .catalogue-action').first(),
    ).toBeDisabled();
    await expect(page.locator('#contextMenu .available-actions .catalogue-action')).toHaveCount(0);
    // Blocked options remain inspectable by keyboard, but Enter cannot execute them.
    await search.focus();
    await search.press('ArrowDown');
    const blocked = menu.locator('.catalogue-action').first();
    await expect(blocked).toBeFocused();
    await expect(tooltip).toBeVisible({ timeout: 3000 });
    await expect(tooltip).toContainText('A shot can miss');
    await expect(tooltip).toContainText('Unavailable: Equip a suitable ranged tool first.');
    await page.keyboard.press('Enter');
    expect(game.service.world.entities.player!.actor!.action).toBeNull();
    await expect(menu).toBeVisible();
    game.service.control({ paused: true });
    await expect(tooltip).toContainText('Unavailable: Resume the world to act.');
    game.service.control({ paused: false });
    await expect(tooltip).toContainText('Unavailable: Equip a suitable ranged tool first.');
    await search.fill('');
    await expect(tooltip).toBeHidden();
    const actionStates = await page
      .locator('#contextMenu .catalogue-action')
      .evaluateAll((buttons) =>
        buttons.map((button) => button.getAttribute('aria-disabled') === 'true'),
      );
    const firstDisabled = actionStates.indexOf(true);
    expect(firstDisabled).toBeGreaterThan(0);
    expect(actionStates.slice(firstDisabled).every(Boolean)).toBe(true);
    await search.fill('weave a new carrying sling');
    await search.press('Enter');
    expect(aiRequests).toEqual([]);
    await expect(menu).toBeVisible();
    await expect(menu.locator('.catalogue-action')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: 'Invent something' }).click();
    await expect(page.getByRole('tab', { name: 'Invent something' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(aiRequests).toEqual([]);
    await page.reload();
    await expect(page.locator('#loading')).toBeHidden();
    await page.locator('#world').click({ button: 'right', position: { x: 800, y: 580 } });
    await expect(showUnavailable).toHaveAttribute('aria-expanded', 'true');
    await expect(
      page.locator('#contextMenu .unavailable-actions .catalogue-action').first(),
    ).toBeDisabled();
    await showUnavailable.click();
    await expect.poll(() => game.service.profile.preferences.showUnavailableActions).toBe(false);
    await expect(showUnavailable).toBeEnabled();
    await expect(showUnavailable).toHaveText('› Show Unavailable Actions');
    await expect(page.locator('#unavailableActions')).toBeHidden();

    await page.keyboard.press('Escape');
    await page.locator('#world').click({ button: 'right', position: { x: 800, y: 580 } });
    await expect(page.locator('#contextTitle')).toHaveText('Actions here');
    await expect(
      page.locator('#contextMenu').getByRole('button', { name: /^Walk here/ }),
    ).toBeEnabled();
    await expect(showUnavailable).toHaveAttribute('aria-expanded', 'false');
    await showUnavailable.click();
    await expect(showUnavailable).toBeEnabled();
    await page.screenshot({ path: info.outputPath('action-menu.png') });
    expect(errors).toEqual([]);
    expect(aiRequests).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
});
