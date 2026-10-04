import { resumeGame } from '../fixtures/browser.js';
import { testRepository, closeTestDatabases } from '../fixtures/database.js';
import { test, expect } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import { readConfig } from '../fixtures/database.js';
test('scaled themes, reduced motion and responsive controls persist across reload', async ({
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
  try {
    await page.goto(`http://127.0.0.1:${address.port}`);
    await resumeGame(page);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    await expect.poll(() => game.service.paused).toBe(false);
    await page.getByRole('button', { name: 'Settings and help', exact: true }).click();
    await page.getByLabel('World theme', { exact: true }).selectOption('fantasy');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'fantasy');
    await page.screenshot({ path: info.outputPath('fantasy.png') });
    await page.getByLabel('World theme', { exact: true }).selectOption('scifi');
    await page
      .locator('.ol-radio')
      .filter({ has: page.getByRole('radio', { name: '130%', exact: true }) })
      .click();
    await page.getByRole('checkbox', { name: 'Reduce motion', exact: true }).check();
    await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole('button', { name: 'World agent', exact: true }).click();
    await page.getByRole('button', { name: 'New conversation', exact: true }).first().click();
    await page.screenshot({ path: info.outputPath('scifi-scaled.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: info.outputPath('mobile-scaled.png') });
    for (const locator of [
      page.locator('.ol-timebar'),
      page.locator('#agentPanel'),
      page.locator('#agentPanel').getByRole('button', { name: 'Send', exact: true }),
    ]) {
      const bounds = await locator.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(845);
    }
    for (const name of ['Inventory', 'Crafting', 'Character', 'Journal', 'World agent', 'In view'])
      await page
        .locator('.ol-rail')
        .getByRole('button', { name, exact: true })
        .click({ trial: true });
    await page.reload();
    await resumeGame(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'scifi');
    await expect(page.locator('.ol-hud')).toHaveCSS('zoom', '1.3');
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    await page.close();
    await game.close();
  }
});

test.afterAll(closeTestDatabases);
