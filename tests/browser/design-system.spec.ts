import { worldPosition } from '@open-legend/domain';
import { test, expect } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import { readConfig } from '../../apps/server/src/config.js';
import { SqliteStore } from '../../apps/server/src/store.js';
test('React design system preserves native play, readable inspection, drafts and responsive controls (no paid calls)', async ({
  page,
}, info) => {
  const game = await createGameServer({
    config: readConfig({}),
    store: new SqliteStore(':memory:'),
    production: true,
    tick: false,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw Error('No listener');
  const errors: string[] = [],
    paid: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (/\/api\/(chat|invent|world-agent\/messages)$/.test(r.url())) paid.push(r.url());
  });
  try {
    await page.goto(`http://127.0.0.1:${address.port}`);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    await expect(page.getByRole('meter')).toHaveCount(3);
    const clock = page.locator('.ol-timebar');
    const before = await clock.boundingBox();
    await page.getByRole('button', { name: 'Pause world', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Resume world', exact: true })).toBeVisible();
    expect((await clock.boundingBox())!.width).toBe(before!.width);
    await page.getByRole('button', { name: 'Time settings', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Pause game when hidden' }).uncheck();
    await expect.poll(() => game.service.profile.preferences.pauseWhenHidden).toBe(false);
    await page.getByRole('button', { name: 'Time settings', exact: true }).click();
    await page.getByRole('button', { name: 'Character', exact: true }).click();
    await expect(page.locator('.ol-trait')).toHaveCount(3);
    await page.locator('.ol-trait').first().hover();
    await expect(page.getByRole('tooltip')).toBeVisible();
    await page.screenshot({ path: info.outputPath('character.png') });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'In view', exact: true }).click();
    await page.getByRole('button', { name: /Berry bush/ }).click();
    await expect(page.getByRole('heading', { name: 'Berry bush', exact: true })).toBeVisible();
    await expect(page.locator('#nearbyPanel')).toContainText('Familiar edible berries');
    await page.getByRole('button', { name: 'Back', exact: false }).click();
    await page.locator('[data-entity="berries-west"]').click({ button: 'right' });
    await expect(page.locator('#contextTitle')).toHaveText('Berry bush');
    await expect(page.getByRole('button', { name: /Look closer/ })).toBeVisible();
    await page.getByRole('button', { name: 'Show Unavailable Actions', exact: true }).click();
    const gather = page.locator('#contextMenu').getByRole('button', { name: /Gather Berry bush/ });
    await gather.hover();
    await expect(page.getByRole('tooltip')).toContainText('30 seconds');
    await expect(page.getByRole('tooltip')).not.toContainText('energy');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Hide In view panel' }).click();
    await page.getByRole('button', { name: 'Resume world', exact: true }).click();
    await page.locator('#world').click({ button: 'right', position: { x: 480, y: 398 } });
    await expect(page.locator('#contextTitle')).toHaveText('River reeds');
    const position = { ...worldPosition(game.service.world.entities.player!) };
    await page.locator('#world').click({ position: { x: 900, y: 700 } });
    expect(game.service.world.entities.player!.actor!.action).toBeNull();
    expect(worldPosition(game.service.world.entities.player!)).toEqual(position);
    await page.locator('#world').click({ button: 'right', position: { x: 480, y: 398 } });
    await page.getByRole('searchbox', { name: 'Find an action' }).fill('make a woven sling');
    await page.getByRole('searchbox', { name: 'Find an action' }).press('Enter');
    await expect(page.locator('#message')).toHaveValue('make a woven sling');
    expect(paid).toEqual([]);
    await page.locator('#sendMessage').click();
    await expect(page.getByRole('heading', { name: 'AI & allowance' })).toBeVisible();
    expect(paid).toEqual([]);
    await page.reload();
    await page.getByRole('button', { name: 'Crafting', exact: true }).click();
    await page.getByRole('button', { name: 'Invent a tool', exact: true }).click();
    await page.locator('#message').fill('saved draft');
    await page.reload();
    await page.getByRole('button', { name: 'World agent', exact: true }).click();
    await page.getByRole('button', { name: 'New conversation', exact: true }).first().click();
    const agentInput = page.getByRole('textbox', { name: 'Message to world agent' });
    const send = page.locator('#agentPanel').getByRole('button', { name: 'Send', exact: true });
    const oneLine = await agentInput.boundingBox();
    await agentInput.fill(
      'A question kept while hidden that is deliberately long enough to wrap onto another line in the conversation composer.',
    );
    const wrapped = await agentInput.boundingBox();
    const sendBounds = await send.boundingBox();
    expect(wrapped!.height).toBeGreaterThan(oneLine!.height);
    expect(wrapped!.x + wrapped!.width).toBeLessThanOrEqual(sendBounds!.x);
    await agentInput.fill('A question kept while hidden');
    await page.getByRole('button', { name: 'Hide World agent panel' }).click();
    await page.getByRole('button', { name: 'World agent', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Message to world agent' })).toHaveValue(
      'A question kept while hidden',
    );
    await page.screenshot({ path: info.outputPath('world-agent.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: info.outputPath('mobile.png') });
    const panel = await page.locator('#agentPanel').boundingBox();
    expect(panel!.x).toBeGreaterThanOrEqual(0);
    expect(panel!.x + panel!.width).toBeLessThanOrEqual(390);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    expect(errors).toEqual([]);
    expect(paid).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
});

test('native work stays continuous and paused, with usable scaled themes and no false cooldowns', async ({
  page,
}, info) => {
  const game = await createGameServer({
    config: readConfig({}),
    store: new SqliteStore(':memory:'),
    production: true,
    tick: false,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw Error('No listener');
  try {
    await page.goto(`http://127.0.0.1:${address.port}`);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    await expect.poll(() => game.service.paused).toBe(false);
    expect(
      (
        await game.service.command('fixture-rest', {
          type: 'status-effect',
          definitionId: 'rest',
          targetId: 'player',
          effectOperation: 'activate',
        })
      ).ok,
    ).toBe(true);
    const progress = page.locator('.ol-status-progress > span');
    await expect(progress).toBeVisible();
    const amount = () => progress.evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a);
    const first = await amount();
    await expect.poll(amount).toBeGreaterThan(first);
    await page.getByRole('button', { name: 'Pause world', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Resume world', exact: true })).toBeVisible();
    await page.waitForTimeout(100);
    const frozen = await amount();
    await page.waitForTimeout(250);
    expect(await amount()).toBe(frozen);
    await expect(page.locator('.ol-qa-ring')).toHaveCount(0);
    await page.getByRole('button', { name: 'Resume world', exact: true }).click();
    await expect.poll(amount).toBeGreaterThan(frozen);
    expect((await game.service.command('fixture-cancel', { type: 'cancel' })).ok).toBe(true);
    await expect(progress).toHaveCount(0);
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
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'scifi');
    await expect(page.locator('.ol-hud')).toHaveCSS('zoom', '1.3');
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    await page.close();
    await game.close();
  }
});
