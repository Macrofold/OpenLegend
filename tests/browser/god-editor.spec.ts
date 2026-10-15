import { test, expect } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import { closeTestDatabases, readConfig, testRepository } from '../fixtures/database.js';

test('a discarded person draft can refresh immediately and stays readable at narrow width', async ({
  page,
}, info) => {
  const game = await createGameServer({
    config: readConfig({ OPEN_LEGEND_GOD_MODE: 'true', AI_BUDGET_USD: '0' }),
    store: await testRepository(),
    production: true,
    tick: false,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw Error('No listener');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${address.port}`);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true', { timeout: 20_000 });
    await page.getByRole('button', { name: 'Character', exact: true }).click();
    await page.getByText('God mode · Character controls', { exact: true }).click();
    await page.getByRole('button', { name: 'Edit Person', exact: true }).click();
    const editor = page.getByRole('dialog', { name: /^Edit / });
    await expect(editor).toBeVisible();
    await editor.getByRole('button', { name: 'Identity', exact: true }).click();
    const name = editor.getByLabel('Name', { exact: true });
    const original = await name.inputValue();
    await name.fill('Temporary edit');
    await expect(editor).toContainText('Unsaved changes');
    await editor.getByRole('button', { name: 'Discard changes' }).click();
    await expect(name).toHaveValue(original);
    await editor.getByRole('button', { name: 'Memories', exact: true }).click();
    await editor.getByRole('button', { name: 'Refresh latest saved entries' }).click();
    await expect(editor).not.toContainText('Save or discard your changes before refreshing.');
    await expect(editor).toContainText('Queried');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(async () => {
      const bounds = await editor.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(845);
    }).toPass({ timeout: 5_000 });
    await expect(editor.locator('.ol-editor-tab .ol-icon-wrap').first()).toBeVisible();
    await page.screenshot({ path: info.outputPath('god-editor-narrow.png') });
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
});

test.afterAll(closeTestDatabases);
