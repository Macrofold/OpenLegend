import { commandFacts } from '../../apps/server/src/action-descriptions.js';
import { entityGet } from '../../packages/domain/src/index.js';
import { enterGame } from '../fixtures/browser.js';
import { testRepository, closeTestDatabases } from '../fixtures/database.js';
import { PLAYER_ID } from '@open-legend/domain';
import { test, expect } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import { projectView } from '../../apps/server/src/view.js';
import { readConfig } from '../fixtures/database.js';
test('scoped React action search, contextual facts and known unavailable choices (native fixture)', async ({
  page,
}, info) => {
  // Cold software-rendered entry, reload and screenshots exceed one minute for
  // this complete journey. Individual interaction deadlines remain unchanged.
  test.setTimeout(120_000);
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
    await enterGame(page);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    const menu = page.locator('#contextMenu'),
      search = page.getByRole('searchbox', { name: 'Find an action' }),
      tip = page.getByRole('tooltip');
    // Global gathering and its known blockers belong to the explicit action browser.
    const openActions = () => page.getByRole('button', { name: /\bActions$/ }).click();
    await openActions();
    await expect(search).toBeFocused();
    await search.fill('gather');
    const gather = menu
      .getByRole('button', { name: /Gather reed fibers.*Target: River reeds/ })
      .and(menu.locator('[data-catalogue-action="gather-reeds"]'));
    await gather.hover();
    await expect(tip).toBeVisible();
    const gatheringSeconds = entityGet(game.service.world.entities, 'reeds')?.resource?.workSeconds;
    expect(gatheringSeconds).toBeDefined();
    const time = commandFacts(
      { type: 'gather', targetId: 'reeds' },
      game.service.observe(PLAYER_ID)!,
    ).find(([label]) => label === 'Time')?.[1];
    expect(time).toBeDefined();
    await expect(tip).toContainText(time!);
    await expect(tip).toContainText('Yields');
    await page.keyboard.press('Escape');
    // Ground context stays scoped; it does not supply the global hunting catalogue.
    await page.locator('#world').click({ button: 'right', position: { x: 480, y: 398 } });
    await search.fill('hunt');
    await expect(menu.locator('[data-catalogue-action]')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Pause world', exact: true }).click();
    await openActions();
    await expect(
      menu.getByRole('button', { name: 'Show Unavailable Actions', exact: true }),
    ).toHaveCount(0);
    await search.fill('gather');
    await expect(gather).toHaveAttribute('aria-disabled', 'true');
    // The complete catalogue also contains berry and branch gathering choices.
    await search.fill('gather river reeds');
    await search.press('ArrowDown');
    // Finite gathering is another matching choice; enter at the first row,
    // then use the opposite edge to reach the known blocked native action.
    await expect(menu.locator('[data-picker-row]').first()).toBeFocused();
    await search.focus();
    await search.press('ArrowUp');
    await expect(gather).toBeFocused();
    await expect(tip).toContainText('Resume the world');
    await page.keyboard.press('Enter');
    expect(entityGet(game.service.world.entities, PLAYER_ID)!.actor!.action).toBeNull();
    await expect(menu).toBeVisible();
    await page.screenshot({ path: info.outputPath('action-menu.png') });
    await page.keyboard.press('Escape');
    await page.reload();
    await enterGame(page);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    await openActions();
    await search.fill('gather');
    await expect(gather).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Escape');
    await page.locator('#world').click({ button: 'right', position: { x: 900, y: 700 } });
    // Bare ground uses the player's current perceived place, not the opening heading.
    const view = await projectView(game.service);
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

test.afterAll(closeTestDatabases);
