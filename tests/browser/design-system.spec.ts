import type { AiUsageView } from '@open-legend/protocol';
import { expect, test, type Locator } from '@playwright/test';
import { blockExternalBrowserRequests, enterGame } from '../fixtures/browser.js';
import { browserTabHeaders, rustBrowserGame } from '../fixtures/rust-browser.js';
test('scaled themes, reduced motion and responsive controls persist across reload', async ({
  page,
}, info) => {
  // Three full-canvas readbacks plus reload need a separate whole-journey
  // allowance on software rendering. Individual control assertions stay at 5s.
  test.setTimeout(120_000);
  await blockExternalBrowserRequests(page);
  const game = await rustBrowserGame();
  const gameMenu = page.getByRole('button', { name: 'Game menu (Escape)', exact: true });
  const character = page.getByRole('button', { name: 'Character (C)', exact: true });
  const hud = page.locator('.ol-hud');
  const fitsMobile = async (locator: Locator) => {
    const bounds = await locator.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(845);
  };
  try {
    await page.goto(game.base);
    await enterGame(page);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    await gameMenu.click();
    await page.getByRole('button', { name: 'Resume world', exact: true }).click();
    await expect
      .poll(async () => {
        const state = await page.request.get(game.base + '/api/state', {
          headers: await browserTabHeaders(page),
        });
        expect(state.ok()).toBe(true);
        return state.json();
      })
      .toMatchObject({ clock: { paused: false } });
    await page.getByRole('button', { name: 'Settings & help', exact: true }).click();
    await page.getByRole('tab', { name: 'Appearance & reading', exact: true }).click();
    await page.getByLabel('Interface theme', { exact: true }).selectOption('fantasy');
    await expect(hud).toHaveAttribute('data-theme', 'fantasy');
    await page.screenshot({ path: info.outputPath('fantasy.png') });
    await page.getByLabel('Interface theme', { exact: true }).selectOption('scifi');
    await page
      .locator('.ol-radio')
      .filter({ has: page.getByRole('radio', { name: '130%', exact: true }) })
      .click();
    await page.getByRole('checkbox', { name: 'Reduce motion', exact: true }).check();
    await expect(hud).toHaveAttribute('data-reduce-motion', 'true');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.keyboard.press('Escape');
    await character.click();
    const characterPanel = page.locator('#characterPanel');
    await expect(characterPanel.locator('#inventoryPanel')).toBeVisible();
    await page.screenshot({ path: info.outputPath('scifi-scaled.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: info.outputPath('mobile-scaled.png') });
    await fitsMobile(characterPanel);
    await fitsMobile(characterPanel.getByRole('button', { name: 'Hide Character panel' }));
    await characterPanel.getByRole('button', { name: 'Hide Character panel' }).click();
    const playControls = page.getByRole('navigation', { name: 'Play controls', exact: true });
    for (const name of ['Character (C)', 'Journal (J)', 'Crafting (K)', 'Game menu (Escape)'])
      await playControls.getByRole('button', { name, exact: true }).click({ trial: true });
    await gameMenu.click();
    await fitsMobile(page.getByRole('button', { name: 'Pause world', exact: true }));
    await page.reload();
    await enterGame(page);
    await expect(hud).toHaveAttribute('data-theme', 'scifi');
    await expect(page.locator('.ol-hud')).toHaveCSS('zoom', '1.3');
    await expect(hud).toHaveAttribute('data-reduce-motion', 'true');
    const usage = await page.request.get(game.base + '/api/ai/usage', {
      headers: await browserTabHeaders(page),
    });
    expect(usage.ok()).toBe(true);
    expect(((await usage.json()) as AiUsageView).usage.llmCalls).toBe(0);
  } finally {
    await page.close();
    await game.close();
  }
});
