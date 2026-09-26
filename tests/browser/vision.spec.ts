import { test, expect } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import { readConfig } from '../../apps/server/src/config.js';
import { SqliteStore } from '../../apps/server/src/store.js';

test('broad vision blurs the landscape without tint and old silhouettes have no live actions', async ({
  page,
}, info) => {
  // Native visual fixture; no simulation ticks, provider keys or spending.
  const game = await createGameServer({
    config: readConfig({}),
    store: new SqliteStore(':memory:'),
    production: true,
    tick: false,
  });
  const marker = structuredClone(game.service.world.entities.reeds!);
  marker.id = 'vision-fixture';
  marker.name = 'Vision fixture';
  marker.position = { y: 0, x: 2, z: 2 };
  game.service.world.entities[marker.id] = marker;
  await new Promise<void>((resolve, reject) => {
    game.server.once('error', reject);
    game.server.listen(0, '127.0.0.1', resolve);
  });
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing listener');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${address.port}`);
    const canvas = page.locator('#world');
    const blur = page.locator('.vision-blur');
    await expect(canvas).toHaveAttribute('data-ready', 'true');
    await expect(blur).toBeVisible();
    await expect(blur).toHaveCSS('backdrop-filter', 'blur(14px)');
    await expect(blur).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(blur).toHaveCSS('pointer-events', 'none');
    const original = { ...game.service.world.entities.player!.position };
    const field = await blur.evaluate((element) => {
      const style = getComputedStyle(element);
      return Object.fromEntries(
        ['x', 'y', 'rx', 'ry'].map((key) => [
          key,
          parseFloat(style.getPropertyValue(`--vision-${key}`)),
        ]),
      );
    });
    const point = {
      x: field.x! + ((2 - original.x) * field.rx!) / 28,
      y: field.y! + ((2 - original.z) * field.ry!) / 28 - 12,
    };
    await canvas.click({ button: 'right', position: point });
    await expect(page.locator('#contextTitle')).toHaveText('Vision fixture');
    // The design system names the target in a visible compact header.
    await expect(page.locator('#contextTitle')).toBeVisible();
    await expect(page.locator('.context-heading h2')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('compact-actions.png') });
    await page.keyboard.press('Escape');
    await page.screenshot({ path: info.outputPath('vision-near.png') });

    // Explicit fixture relocation exercises a boundary crossing without waiting
    // on movement, AI or real-time survival. The client receives only its DTO.
    const relocate = async (position: { y: number; x: number; z: number }) =>
      await game.service.transition((previous) => {
        const world = structuredClone(previous);
        world.entities.player!.position = position;
        world.sequence++;
        return {
          world,
          events: [],
          outcome: { ok: true, code: 'fixture', message: 'Fixture relocation.' },
        };
      });
    await expect.poll(() => game.service.paused).toBe(false);
    // Still in the server's broad sight radius, but fully blurred: neither
    // pointer hover nor a right-click may identify the obscured object.
    await page.mouse.move(point.x, point.y);
    await expect(page.locator('.ol-world-hover')).toContainText('Vision fixture');
    expect((await relocate({ y: 0, x: 24, z: 12 })).ok).toBe(true);
    await expect(page.locator('.ol-world-hover')).toBeHidden();
    await canvas.click({ button: 'right', position: point });
    await expect(page.locator('#contextTitle')).toHaveText('The clearing');
    await page.keyboard.press('Escape');
    expect((await relocate({ y: 0, x: 27, z: 23 })).ok).toBe(true);
    await expect(page.locator('[data-entity="vision-fixture"]')).toHaveCount(0);
    await expect
      .poll(() =>
        blur.evaluate((element) => parseFloat(element.style.getPropertyValue('--vision-x'))),
      )
      .toBeGreaterThan(field.x! + 500);
    await page.screenshot({ path: info.outputPath('vision-far.png') });
    await page.mouse.move(point.x, point.y);
    await expect(page.locator('.ol-world-hover')).toBeHidden();
    await canvas.click({ button: 'right', position: point });
    await expect(page.locator('#contextTitle')).toHaveText('The clearing');
    await page.locator('#actionSearch').fill('Vision fixture');
    await expect(page.locator('[data-catalogue-action]')).toHaveCount(0);
    await page.keyboard.press('Escape');

    expect((await relocate(original)).ok).toBe(true);
    await page.getByRole('button', { name: 'In view', exact: true }).click();
    await expect(page.locator('[data-entity="vision-fixture"]')).toBeVisible();
    await page.getByRole('button', { name: 'Hide In view panel' }).click();
    await canvas.click({ button: 'right', position: point });
    await expect(page.locator('#contextTitle')).toHaveText('Vision fixture');
    await page.keyboard.press('Escape');
    for (let index = 0; index < 5; index++)
      await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
    await page.screenshot({ path: info.outputPath('vision-overview.png') });
    expect(errors).toEqual([]);
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    await page.close();
    await game.close();
  }
});
