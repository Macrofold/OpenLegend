import type { GameView } from '@open-legend/protocol';
import { test, expect } from '@playwright/test';
import { blockExternalBrowserRequests, enterGame } from '../fixtures/browser.js';
import { browserTabHeaders, rustBrowserGame } from '../fixtures/rust-browser.js';

test('scoped React action search, contextual facts and known unavailable choices (Rust listener)', async ({
  page,
}, info) => {
  // Cold software-rendered entry, reload and screenshots exceed one minute for
  // this complete journey. Individual interaction deadlines remain unchanged.
  test.setTimeout(120_000);
  await blockExternalBrowserRequests(page);
  const game = await rustBrowserGame();
  async function state(): Promise<GameView> {
    const response = await page.request.get(game.base + '/api/state', {
      headers: await browserTabHeaders(page),
    });
    try {
      expect(response.ok()).toBe(true);
      return (await response.json()) as GameView;
    } finally {
      await response.dispose();
    }
  }
  const gameMenu = page.getByRole('button', { name: 'Game menu (Escape)', exact: true });
  const back = page.getByRole('button', { name: 'Back to the world', exact: true });
  async function openGameMenu() {
    if (!(await back.isVisible())) await gameMenu.click();
  }
  async function setPaused(paused: boolean) {
    await openGameMenu();
    await page
      .getByRole('button', { name: paused ? 'Pause world' : 'Resume world', exact: true })
      .click();
    await back.click();
    await expect.poll(async () => (await state()).clock.paused).toBe(paused);
  }
  const paid: string[] = [],
    errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (/\/api\/(chat|invent|world-agent\/messages)$/.test(r.url())) paid.push(r.url());
  });
  try {
    await page.goto(game.base);
    await enterGame(page);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    const menu = page.locator('#contextMenu'),
      search = page.getByRole('searchbox', { name: 'Find an action' }),
      tip = page.getByRole('tooltip');
    // Global gathering and its known blockers belong to the explicit action browser.
    const openActions = async () => {
      await openGameMenu();
      await page.getByRole('button', { name: 'All actions', exact: true }).click();
    };
    async function closeActions() {
      if (await tip.isVisible()) {
        await page.keyboard.press('Escape');
        await expect(tip).toBeHidden();
      }
      await search.focus();
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      if (await back.isVisible()) await back.click();
    }
    if ((await state()).clock.paused) await setPaused(false);
    const readTarget = async () =>
      (await state()).entities.find(
        (entity) =>
          entity.position.x === 5 && entity.position.z === 11 && entity.name === 'River reeds',
      )?.id;
    await expect.poll(readTarget).toBeTruthy();
    await openActions();
    await expect(search).toBeFocused();
    await search.fill('gather');
    const target = await readTarget();
    if (!target) throw new Error('The ordinary browser did not receive the authored reed patch.');
    const rowId = 'gather-' + target;
    const gatherRow = (id: string) =>
      menu
        .getByRole('button', { name: /Gather reed fibers.*Target: River reeds/ })
        .and(menu.locator(`[data-catalogue-action="${id}"]`));
    const gather = gatherRow(rowId);
    await gather.hover();
    await expect(tip).toBeVisible();
    await expect(tip).toContainText('36 seconds of game time, plus travel');
    await expect(tip).toContainText('Yields');
    await closeActions();
    // Ground context stays scoped; it does not supply the global hunting catalogue.
    await page.locator('#world').click({ button: 'right', position: { x: 480, y: 398 } });
    await search.fill('hunt');
    await expect(menu.locator('[data-catalogue-action]')).toHaveCount(0);
    await closeActions();
    await setPaused(true);
    await openActions();
    await expect(
      menu.getByRole('button', { name: 'Show Unavailable Actions', exact: true }),
    ).toHaveCount(0);
    await search.fill('gather');
    await expect(gather).toHaveAttribute('aria-disabled', 'true');
    // The complete catalogue also contains berry and branch gathering choices.
    await search.press('ArrowDown');
    // Several current resource locations match this wording. Verify both entry
    // edges, then navigate to this exact source without assuming its row order.
    const rows = menu.locator('[data-picker-row]');
    await expect(rows.first()).toBeFocused();
    await search.focus();
    await search.press('ArrowUp');
    await expect(rows.last()).toBeFocused();
    const targetIndex = await rows.evaluateAll(
      (elements, rowId) =>
        elements.findIndex((element) => element.getAttribute('data-catalogue-action') === rowId),
      rowId,
    );
    expect(targetIndex).toBeGreaterThanOrEqual(0);
    for (let index = (await rows.count()) - 1; index > targetIndex; index--)
      await page.keyboard.press('ArrowUp');
    await expect(gather).toBeFocused();
    await expect(tip).toContainText('Resume the world');
    await page.keyboard.press('Enter');
    expect((await state()).player.action).toBeNull();
    await expect(menu).toBeVisible();
    await page.screenshot({ path: info.outputPath('action-menu.png') });
    await closeActions();
    await page.reload();
    await enterGame(page);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    expect((await state()).clock.paused).toBe(true);
    // The old tab's received references are gone. The new tab first needs
    // an active observation before it can browse the same world object.
    await setPaused(false);
    await expect.poll(readTarget).toBeTruthy();
    await setPaused(true);
    const reopenedTarget = await readTarget();
    if (!reopenedTarget) throw new Error('The reopened browser did not receive the reed patch.');
    await openActions();
    await search.fill('gather');
    await expect(gatherRow('gather-' + reopenedTarget)).toHaveAttribute('aria-disabled', 'true');
    await closeActions();
    await page.locator('#world').click({ button: 'right', position: { x: 900, y: 700 } });
    // Bare ground uses the player's current perceived place, not the opening heading.
    const view = await state();
    await expect(menu.locator('.ol-picker-head strong')).toHaveText(view.presentation.locationName);
    await search.fill('walk');
    await expect(menu.getByRole('button', { name: /Walk here/ })).toHaveCount(0);
    // Walking belongs to primary click. Evade remains a native action but is
    // intentionally absent from the player's contextual action browser.
    await search.fill('evade');
    await expect(menu.locator('[data-catalogue-action]')).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(paid).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
});
