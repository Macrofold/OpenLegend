import { commandFacts } from '../../apps/server/src/action-descriptions.js';
import {
  entityGet,
  NPC_ID,
  setSpatialPosition,
  worldPosition,
  worldSupport,
} from '../../packages/domain/src/index.js';
import { enterGame, blockExternalBrowserRequests, openAllActions } from '../fixtures/browser.js';
import { cooperativeCamp, installFixtureMultiOutputMethod } from '../fixtures/world.js';
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
    const openActions = () => openAllActions(page);
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
    // Several current resource locations match this wording. Verify both entry
    // edges, then navigate to this exact source without assuming its row order.
    const rows = menu.locator('[data-picker-row]');
    await expect(rows.first()).toBeFocused();
    await search.focus();
    await search.press('ArrowUp');
    await expect(rows.last()).toBeFocused();
    const targetIndex = await rows.evaluateAll((elements) =>
      elements.findIndex(
        (element) => element.getAttribute('data-catalogue-action') === 'gather-reeds',
      ),
    );
    expect(targetIndex).toBeGreaterThanOrEqual(0);
    for (let index = (await rows.count()) - 1; index > targetIndex; index--)
      await page.keyboard.press('ArrowUp');
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

test('dependent activity pickers retain independent choices and bind the selected method output', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  // Match the existing desktop control fixtures for this task-panel journey.
  await page.setViewportSize({ width: 1024, height: 720 });
  const world = cooperativeCamp();
  const firstMethod = installFixtureMultiOutputMethod(world, PLAYER_ID);
  const secondMethod = installFixtureMultiOutputMethod(
    world,
    PLAYER_ID,
    'fixture:alternative-input',
    'Alternative fiber method',
  );
  const actor = entityGet(world.entities, PLAYER_ID)!,
    point = worldPosition(actor);
  setSpatialPosition(
    world,
    entityGet(world.entities, NPC_ID)!,
    { ...point, x: point.x + 0.75 },
    worldSupport(actor),
  );
  const game = await createGameServer({
    config: readConfig({ AI_BUDGET_USD: '0' }),
    store: await testRepository(undefined, world),
    production: true,
    tick: false,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('No listener');
  const errors: string[] = [],
    paid: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/\/api\/(chat|invent|world-agent\/messages)$/.test(request.url())) paid.push(request.url());
  });
  await blockExternalBrowserRequests(page);
  try {
    await page.goto(`http://127.0.0.1:${address.port}`);
    try {
      await enterGame(page);
    } catch (error) {
      await info.attach('entry-state', {
        contentType: 'application/json',
        body: JSON.stringify(
          await page.evaluate(() => ({
            visibility: document.visibilityState,
            focused: document.hasFocus(),
            canvas: document.getElementById('world')?.outerHTML,
            entry: document.querySelector('.ol-entry')?.textContent,
          })),
        ),
      });
      throw error;
    }
    await openAllActions(page);
    await page.getByRole('searchbox', { name: 'Find an action' }).fill('practical help');
    await page
      .locator(`[data-catalogue-action="activity:base:cooperation-prepare:${NPC_ID}"]`)
      .click();
    const preparation = page.getByRole('group', { name: 'Task preparation', exact: true });
    await expect(preparation).toBeVisible();
    await preparation.getByRole('button', { name: /^Choose proposed agreement/ }).click();
    await page
      .getByRole('dialog', { name: 'Choose proposed agreement', exact: true })
      .getByRole('button', { name: /^Choose Propose a new agreement/ })
      .click();
    await preparation.getByRole('button', { name: /^Choose known method/ }).click();
    const methodPicker = page.getByRole('dialog', { name: 'Choose known method', exact: true });
    await expect(
      methodPicker.getByRole('textbox', { name: 'Search known method', exact: true }),
    ).toBeFocused();
    await methodPicker
      .getByRole('button', { name: new RegExp(`^Choose ${firstMethod.name};`) })
      .click();
    await expect(preparation.getByRole('button', { name: /^Change known method:/ })).toBeFocused();
    const outputLabel = `${world.itemDefinitions['cord']!.name}; 2 per batch of `;
    await preparation.getByRole('button', { name: /^Choose requested product/ }).click();
    await page
      .getByRole('dialog', { name: 'Choose requested product', exact: true })
      .getByRole('button', { name: `Choose ${outputLabel}${firstMethod.name}`, exact: true })
      .click();
    await preparation.getByRole('textbox', { name: /^Product count/ }).fill('3');
    await preparation.getByRole('button', { name: /^Change known method:/ }).click();
    await page
      .getByRole('dialog', { name: 'Choose known method', exact: true })
      .getByRole('button', { name: new RegExp(`^Choose ${secondMethod.name};`) })
      .click();
    await expect(
      preparation.getByRole('button', { name: /^Choose requested product/ }),
    ).toBeVisible();
    await expect(
      preparation.getByRole('button', { name: /^Change proposed agreement:/ }),
    ).toBeVisible();
    await expect(preparation.getByRole('textbox', { name: /^Product count/ })).toHaveValue('3');
    await preparation.getByRole('button', { name: /^Choose requested product/ }).click();
    await page
      .getByRole('dialog', { name: 'Choose requested product', exact: true })
      .getByRole('button', { name: `Choose ${outputLabel}${secondMethod.name}`, exact: true })
      .click();
    const submit = preparation.getByRole('button', { name: 'Propose agreement', exact: true });
    await expect(submit).toBeEnabled();
    const count = preparation.getByRole('textbox', { name: /^Product count/ });
    await count.scrollIntoViewIfNeeded();
    const countBounds = await count.locator('..').boundingBox(),
      submitBounds = await submit.boundingBox();
    expect(countBounds).not.toBeNull();
    expect(submitBounds).not.toBeNull();
    expect(countBounds!.y + countBounds!.height).toBeLessThanOrEqual(submitBounds!.y);
    await page.screenshot({ path: info.outputPath('dependent-activity-picker.png') });
    await submit.click();
    await expect
      .poll(
        () =>
          Object.values(game.service.world.outings ?? {}).filter(
            (entry) => entry.kind === 'cooperate' && entry.status === 'pending',
          ).length,
      )
      .toBe(1);
    const pending = Object.values(game.service.world.outings ?? {}).find(
      (entry) => entry.kind === 'cooperate' && entry.status === 'pending',
    );
    expect(pending).toMatchObject({
      terms: {
        purpose: 'help',
        task: {
          kind: 'prepare',
          recipe: { id: secondMethod.id },
          output: { port: 'second' },
          quantity: 3,
        },
      },
    });
    await page.getByRole('button', { name: 'Prepare another task', exact: true }).click();
    await preparation.getByRole('button', { name: /^Choose proposed agreement/ }).click();
    await page
      .getByRole('dialog', { name: 'Choose proposed agreement', exact: true })
      .getByRole('button', { name: /^Choose Revise current terms:/ })
      .click();
    await expect(
      preparation.getByRole('button', {
        name: /^Change proposed agreement: Revise current terms:/,
      }),
    ).toBeVisible();
    await page.screenshot({ path: info.outputPath('activity-agreement-revision.png') });
    expect(errors).toEqual([]);
    expect(paid).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
});
