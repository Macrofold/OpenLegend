import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { createGameServer } from '../apps/server/src/http.js';
import { worldPosition } from '../packages/domain/src/index.js';
import { enterGame } from '../tests/fixtures/browser.js';
import { closeTestDatabases, readConfig, testRepository } from '../tests/fixtures/database.js';

test.setTimeout(60_000);

type Bounds = { x: number; y: number; width: number; height: number };
async function bounds(editor: Locator) {
  const value = await editor.boundingBox();
  expect(value).not.toBeNull();
  return value!;
}
async function fits(page: Page, editor: Locator, scale: number) {
  await expect(async () => {
    const box = await bounds(editor);
    const viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(7);
    expect(box.y).toBeGreaterThanOrEqual(7);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 7);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 7);
    expect(Math.abs(box.width - Math.min(860 * scale, viewport.width - 24))).toBeLessThanOrEqual(2);
    expect(Math.abs(box.height - Math.min(700 * scale, viewport.height - 24))).toBeLessThanOrEqual(
      2,
    );
  }).toPass({ timeout: 5_000 });
}
async function drag(page: Page, editor: Locator, dx: number, dy: number) {
  const heading = await editor.locator('.ol-editor-head h2').boundingBox();
  expect(heading).not.toBeNull();
  const x = heading!.x + Math.min(40, heading!.width / 2);
  const y = heading!.y + heading!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 3 });
  await page.mouse.up();
}
async function centered(page: Page, editor: Locator) {
  const control = editor.getByRole('button', { name: 'Center window', exact: true });
  await control.focus();
  await control.press('Enter');
  await expect(async () => {
    const box = await bounds(editor);
    const viewport = page.viewportSize()!;
    expect(Math.abs(box.x - (viewport.width - box.width) / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(box.y - (viewport.height - box.height) / 2)).toBeLessThanOrEqual(2);
  }).toPass({ timeout: 5_000 });
}

// One native person draft exercises the shared editor window used by person,
// World Events and reload views. It does not submit an edit or qualify OS input.
test('editor viewport constraints preserve dragging, Center and the draft at 100% and 130%', async ({
  page,
}, info) => {
  page.setDefaultTimeout(10_000);
  page.setDefaultNavigationTimeout(20_000);
  const store = await testRepository();
  const config = readConfig({ OPEN_LEGEND_GOD_MODE: 'true', AI_BUDGET_USD: '0' });
  expect(config.budgetUsd).toBe(0);
  const game = await createGameServer({ config, store, production: true, tick: false });
  const errors: string[] = [];
  const mutations: string[] = [];
  const providerRequests: string[] = [];
  const observed: Array<{ scale: number; desktop: Bounds; narrow: Bounds; returned: Bounds }> = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.method() !== 'POST') return;
    const path = new URL(request.url()).pathname;
    if (/^\/api\/(?:command$|action-attempt$|god\/editor\/.*\/save$)/.test(path))
      mutations.push(path);
    if (/^\/api\/(?:chat|invent|inventions|world-agent)(?:\/|$)/.test(path))
      providerRequests.push(path);
  });
  try {
    await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
    const address = game.server.address();
    if (!address || typeof address === 'string') throw new Error('Missing listener');
    await page.goto(`http://127.0.0.1:${address.port}`);
    await enterGame(page);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    await page.getByRole('button', { name: 'Character', exact: true }).click();
    await page.getByText('God mode · Character controls', { exact: true }).click();
    await page.getByRole('button', { name: 'Edit Person', exact: true }).click();
    const editor = page.getByRole('dialog', { name: /^Edit / });
    await expect(editor).toBeVisible();
    await editor.getByRole('button', { name: 'Identity', exact: true }).click();
    const name = editor.getByLabel('Name', { exact: true });
    const originalName = await name.inputValue();
    const draft = `${originalName} retained editor draft`;
    await name.fill(draft);
    await expect(editor).toContainText('Unsaved changes');
    const actor = game.service.world.entities[game.service.controlledEntityId]!;
    const initialPosition = { ...worldPosition(actor) };

    for (const scale of [1, 1.3]) {
      if (scale === 1.3) {
        // Leave the right-side Settings controls uncovered while retaining this
        // modeless editor and its dirty draft; change scale through the actual UI.
        const box = await bounds(editor);
        await drag(page, editor, 8 - box.x, 0);
        await page.locator('#gameMenuButton').click();
        await page
          .locator('.ol-game-menu')
          .getByRole('button', { name: 'Settings & help', exact: true })
          .click();
        await page
          .locator('.ol-radio')
          .filter({ has: page.getByRole('radio', { name: '130%', exact: true }) })
          .click();
        await expect(page.locator('.ol-hud')).toHaveCSS('zoom', '1.3');
        await page.getByRole('button', { name: 'Hide Settings & help panel', exact: true }).click();
      }
      await fits(page, editor, scale);
      await centered(page, editor);
      const center = await bounds(editor);
      await drag(page, editor, 48, 8);
      await expect(async () => {
        const moved = await bounds(editor);
        expect(Math.abs(moved.x - center.x - 48)).toBeLessThanOrEqual(2);
        expect(Math.abs(moved.y - center.y - 8)).toBeLessThanOrEqual(2);
      }).toPass({ timeout: 5_000 });
      const desktop = await bounds(editor);
      await expect(name).toHaveValue(draft);
      await page.setViewportSize({ width: 390, height: 844 });
      await fits(page, editor, scale);
      await expect(name).toHaveValue(draft);
      await name.focus();
      await expect(name).toBeFocused();
      await expect(name).toBeInViewport();
      await expect(editor.locator('.ol-editor-tab .ol-icon-wrap').first()).toBeVisible();
      const narrow = await bounds(editor);
      await page.screenshot({
        path: info.outputPath(`editor-narrow-${Math.round(scale * 100)}.png`),
        timeout: 10_000,
      });
      await page.setViewportSize({ width: 1440, height: 960 });
      await fits(page, editor, scale);
      await expect(async () => {
        const returned = await bounds(editor);
        expect(Math.abs(returned.x - desktop.x)).toBeLessThanOrEqual(2);
        expect(Math.abs(returned.y - desktop.y)).toBeLessThanOrEqual(2);
      }).toPass({ timeout: 5_000 });
      observed.push({ scale, desktop, narrow, returned: await bounds(editor) });
      await centered(page, editor);
      await expect(name).toHaveValue(draft);
      await expect(editor).toContainText('Unsaved changes');
    }
    await page.screenshot({ path: info.outputPath('editor-desktop-130.png'), timeout: 10_000 });
    expect(game.service.world.entities[game.service.controlledEntityId]!.name).toBe(originalName);
    expect(worldPosition(game.service.world.entities[game.service.controlledEntityId]!)).toEqual(
      initialPosition,
    );
    expect(mutations).toEqual([]);
    expect(providerRequests).toEqual([]);
    expect(errors).toEqual([]);
    expect((await store.usage(0)).usage.llmCalls).toBe(0);
    expect((await store.usage(0)).usage.jevCalls).toBe(0);
    const paths = [
      'apps/client/src/ui/editor.tsx',
      'apps/client/src/design-system/layout.css',
      'scripts/ui-completion-editor.spec.ts',
    ];
    const sourceSha256 = Object.fromEntries(
      await Promise.all(
        paths.map(async (path) => [
          path,
          createHash('sha256')
            .update(await readFile(path))
            .digest('hex'),
        ]),
      ),
    );
    await info.attach('editor-viewport-observation.json', {
      body: JSON.stringify(
        { observed, sourceSha256, mutations, providerRequests, errors },
        null,
        2,
      ),
      contentType: 'application/json',
    });
  } finally {
    await page.close();
    await game.close();
  }
});

test.afterAll(closeTestDatabases);
