import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { enterGame } from '../fixtures/browser.js';
import { testRepository, closeTestDatabases, readConfig } from '../fixtures/database.js';
import { createGameServer } from '../../apps/server/src/http.js';
import { inventoryFor, worldPosition } from '../../packages/domain/src/index.js';
import type { GameView, InventoryDestinationPage } from '../../packages/protocol/src/index.js';

type Game = Awaited<ReturnType<typeof createGameServer>>;
async function play(page: Page, body: (game: Game, view: () => GameView) => Promise<void>) {
  const game = await createGameServer({ config: readConfig({ AI_BUDGET_USD: '0' }), store: await testRepository(), production: true, tick: false });
  let visible: GameView | undefined;
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', async response => {
    if (new URL(response.url()).pathname === '/api/state' && response.ok()) {
      const data = await response.json().catch(() => undefined);
      if (data?.player && data?.entities) visible = data;
    }
  });
  try {
    await new Promise<void>(resolve => game.server.listen(0, '127.0.0.1', resolve));
    const address = game.server.address();
    if (!address || typeof address === 'string') throw new Error('Missing listener');
    await page.goto(`http://127.0.0.1:${address.port}`);
    await enterGame(page);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    await expect.poll(() => !!visible).toBe(true);
    await body(game, () => visible!);
    expect(errors).toEqual([]);
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    await page.close();
    await game.close();
  }
}
async function person(page: Page, id: string) {
  await page.getByRole('button', { name: 'In view', exact: true }).click();
  await page.locator(`#nearbyPanel [data-entity="${id}"] button`).click();
  return page.locator('#nearbyPanel');
}
async function fit(page: Page, selector: string, info: TestInfo, name: string) {
  const area = page.locator(selector);
  await expect(area).toBeVisible();
  const bounds = await area.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(-1);
  expect(bounds!.y).toBeGreaterThanOrEqual(-1);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
  await page.screenshot({ path: info.outputPath(name + '.png') });
}

test('Journal preserves a selected place across layout changes and focus never walks', async ({ page }, info) => {
  await play(page, async game => {
    const commands: unknown[] = [];
    page.on('request', request => { if (new URL(request.url()).pathname === '/api/command') commands.push(request.postDataJSON()); });
    const before = { ...worldPosition(game.service.world.entities[game.service.controlledEntityId]!) };
    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    const journal = page.locator('#journalPanel');
    await journal.getByText('Places', { exact: true }).click();
    const first = journal.locator('.ol-known-place-list').getByRole('button', { name: /^Inspect / }).first();
    await expect(first).toBeVisible();
    await first.click();
    const detail = journal.locator('.ol-known-place-detail');
    const heading = await detail.getByRole('heading').innerText();
    await detail.getByRole('button', { name: 'Focus last-known location', exact: true }).click();
    expect(worldPosition(game.service.world.entities[game.service.controlledEntityId]!)).toEqual(before);
    expect(commands).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(detail.getByRole('heading')).toHaveText(heading);
    await fit(page, '#journalPanel', info, 'journal-place-narrow');
    await page.setViewportSize({ width: 1024, height: 600 });
    await expect(detail.getByRole('heading')).toHaveText(heading);
    await fit(page, '#journalPanel', info, 'journal-place-short');
    const search = journal.getByRole('searchbox', { name: 'Search known places' });
    await search.fill('zz-no-such-observed-place');
    await search.press('Enter');
    await expect(journal.getByText('No matching known places.', { exact: true })).toBeVisible();
    await journal.getByRole('button', { name: 'Clear place search', exact: true }).click();
    await expect(search).toBeFocused();
    await expect(first).toBeVisible();
    expect(commands).toEqual([]);
  });
});

test('Inventory and person share exact barter draft without transferring or moving while preparing', async ({ page }, info) => {
  await play(page, async (game, view) => {
    // The recorded native recipient page offers Mara at this starting position.
    // Ada being visible does not make her reachable for this item handover.
    const recipientId = 'mara';
    const npc = view().entities.find(entity => entity.id === recipientId);
    expect(npc?.trade).toBeDefined();
    const labels = npc!.trade!.labels;
    const give = npc!.trade!.ownLots.find(lot => !lot.whole && lot.quantity > 1) ?? npc!.trade!.ownLots[0];
    expect(give).toBeDefined();
    const actorId = game.service.controlledEntityId;
    const before = { ...worldPosition(game.service.world.entities[actorId]!) };
    const holdings = () => inventoryFor(game.service.world, actorId).map(item => ({ id: item.id, quantity: item.quantity }));
    const beforeHoldings = holdings();
    const sends: { command?: { type?: string } }[] = [];
    page.on('request', request => { if (new URL(request.url()).pathname === '/api/command') sends.push(request.postDataJSON()); });
    const nearby = await person(page, recipientId);
    const fromPerson = nearby.locator('.ol-item-trade');
    await fromPerson.getByRole('button', { name: labels.newOffer, exact: true }).click();
    await fromPerson.locator('.ol-trade-draft select').first().selectOption(give!.id);
    await fromPerson.getByRole('textbox', { name: labels.giveQuantity, exact: true }).fill('1');
    await page.getByRole('button', { name: 'Inventory', exact: true }).click();
    await page.locator(`#inventoryPanel [data-item-id="${give!.id}"]`).click();
    const detail = page.locator('.ol-inventory-detail');
    const recipients = page.waitForResponse(response => new URL(response.url()).pathname === '/api/inventory/destinations');
    await detail.getByRole('button', { name: 'Offer to a person…', exact: true }).click();
    const destinations = await (await recipients).json() as InventoryDestinationPage;
    const people = destinations.destinations.filter(entry => entry.kind === 'recipient');
    const index = people.findIndex(entry => entry.id === recipientId);
    expect(index).toBeGreaterThanOrEqual(0);
    await detail.getByRole('button', { name: /^Trade with / }).nth(index).click();
    const fromInventory = detail.locator('.ol-item-trade');
    await expect(fromInventory.locator('.ol-trade-draft select').first()).toHaveValue(give!.id);
    await expect(fromInventory.getByRole('textbox', { name: labels.giveQuantity, exact: true })).toHaveValue('1');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(fromInventory.locator('.ol-trade-draft select').first()).toHaveValue(give!.id);
    await fit(page, '.ol-inventory-popover', info, 'inventory-trade-narrow');
    await detail.getByRole('button', { name: 'Close', exact: true }).click();
    // Opening Inventory records legitimate inspection knowledge. It must not
    // send an offer, transfer possessions or move the character while preparing.
    expect(sends.filter(send => /handover|trade|offer|transfer|^move$|^drop$/.test(send.command?.type ?? ''))).toEqual([]);
    expect(holdings()).toEqual(beforeHoldings);
    expect(worldPosition(game.service.world.entities[actorId]!)).toEqual(before);
  });
});

test('a denied collection refresh removes previously rendered contents and keeps recovery reachable', async ({ page }, info) => {
  await play(page, async (_game, view) => {
    const containerId = view().player.id;
    await page.getByRole('button', { name: 'Inventory', exact: true }).click();
    const collection = page.locator('#inventoryPanel .ol-inventory-collection[data-side="belongings"]');
    await expect(collection.locator('.ol-inventory-cell').first()).toBeVisible();
    await page.route('**/api/inventory', async route => {
      if (route.request().postDataJSON()?.containerId !== containerId) return route.continue();
      // Reuse the real populated collection, then control only its denied reread.
      // This qualifies shared collection rendering, not actual grant revocation.
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: false, message: 'Container access withdrawn for this interface check.' }) });
    });
    await collection.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(collection.getByRole('alert')).toContainText('Container access withdrawn');
    await expect(collection.locator('.ol-inventory-cell')).toHaveCount(0);
    await expect(page.locator('.ol-inventory-popover')).toBeHidden();
    await expect(collection.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
    await fit(page, '#inventoryPanel', info, 'collection-denied-desktop');
  });
});

test.afterAll(closeTestDatabases);
