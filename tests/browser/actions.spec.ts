import { testRepository, closeTestDatabases } from '../fixtures/database.js';
import { PLAYER_ID } from '@open-legend/domain';
import { test, expect } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import { readConfig } from '../fixtures/database.js';
test('scoped React action search, contextual facts and saved unavailable preference (native fixture)', async ({
  page,
}, info) => {
  const game = await createGameServer({
    config: readConfig({ AI_BUDGET_USD: '0' }),
    store: await testRepository(),
    production: true,
    tick: false,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw Error('No listener');
  const paid: string[] = [],
    errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (/\/api\/(chat|invent|world-agent\/messages)$/.test(r.url())) paid.push(r.url());
  });
  try {
    await page.goto(`http://127.0.0.1:${address.port}`);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    const menu = page.locator('#contextMenu'),
      search = page.getByRole('searchbox', { name: 'Find an action' }),
      tip = page.getByRole('tooltip');
    await page.locator('#world').click({ button: 'right', position: { x: 480, y: 398 } });
    await expect(search).toBeFocused();
    const gather = menu.getByRole('button', { name: /Gather River reeds/ });
    await gather.hover();
    await expect(tip).toBeVisible();
    await expect(tip).toContainText('36 seconds');
    await expect(tip).toContainText('Yields');
    await search.fill('hunt');
    await expect(menu.locator('[data-catalogue-action]')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Pause world', exact: true }).click();
    await page.locator('#world').click({ button: 'right', position: { x: 480, y: 398 } });
    const toggle = menu.getByRole('button', { name: 'Show Unavailable Actions', exact: true });
    await toggle.click();
    await expect.poll(() => game.service.profile.preferences.showUnavailableActions).toBe(true);
    await expect(gather).toHaveAttribute('aria-disabled', 'true');
    await search.fill('gather');
    await search.press('ArrowDown');
    await expect(gather).toBeFocused();
    await expect(tip).toContainText('Resume the world');
    await page.keyboard.press('Enter');
    expect(game.service.world.entities[PLAYER_ID]!.actor!.action).toBeNull();
    await expect(menu).toBeVisible();
    await page.screenshot({ path: info.outputPath('action-menu.png') });
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    await page.locator('#world').click({ button: 'right', position: { x: 480, y: 398 } });
    await expect(
      menu.getByRole('button', { name: 'Hide Unavailable Actions', exact: true }),
    ).toBeVisible();
    await menu.getByRole('button', { name: 'Hide Unavailable Actions', exact: true }).click();
    await expect.poll(() => game.service.profile.preferences.showUnavailableActions).toBe(false);
    await expect(gather).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.locator('#world').click({ button: 'right', position: { x: 900, y: 700 } });
    await expect(page.locator('#contextTitle')).toHaveText('The clearing');
    await expect(menu.getByRole('button', { name: /Walk here/ })).toHaveCount(0); // paused and unavailable hidden
    await menu.getByRole('button', { name: 'Show Unavailable Actions', exact: true }).click();
    await expect(menu.locator('[data-catalogue-action]')).toHaveCount(1);
    await expect(menu.getByRole('button', { name: /Walk here/ })).toBeVisible();
    expect(errors).toEqual([]);
    expect(paid).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
});

test.afterAll(closeTestDatabases);
