import { expect, test, type Page } from '@playwright/test';
import { createGameServer } from '../apps/server/src/http.js';
import { digest } from '../apps/server/src/store.js';
import { itemFor, itemsForOwner } from '../packages/domain/src/index.js';
import type { ApiResult, GameView } from '../packages/protocol/src/index.js';
import { enterGame } from '../tests/fixtures/browser.js';
import { closeTestDatabases, readConfig, testRepository } from '../tests/fixtures/database.js';

test.setTimeout(60_000);

type CreationBody = {
  id: string;
  definitionId: string;
  quantity: number;
  destination: { actorId: string };
};
type CreationRecord = {
  kind: 'item';
  body: CreationBody;
  label: string;
  destinationLabel: string;
  outcome?: ApiResult;
};
async function retainedCreation(page: Page) {
  return page.evaluate(() =>
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('open-legend:creation-request:'))
      .map((key) => ({ key, value: JSON.parse(sessionStorage.getItem(key)!) as CreationRecord })),
  );
}
async function openItemEntry(page: Page) {
  const inventory = page.locator('#inventoryPanel');
  if (!(await inventory.isVisible()))
    await page.getByRole('button', { name: 'Inventory', exact: true }).click();
  await inventory.getByRole('button', { name: 'God mode · Add item', exact: true }).click();
}
async function refuseCreationStorage(page: Page, operation: 'getItem' | 'removeItem') {
  await page.evaluate((operation) => {
    const session = window.sessionStorage;
    const descriptor = Object.getOwnPropertyDescriptor(Storage.prototype, operation)!;
    const original = descriptor.value as (this: Storage, key: string) => string | null | void;
    const host = window as unknown as { restoreCreationStorage?: () => void };
    host.restoreCreationStorage = () =>
      Object.defineProperty(Storage.prototype, operation, descriptor);
    Object.defineProperty(Storage.prototype, operation, {
      ...descriptor,
      value(this: Storage, key: string) {
        if (this === session && key.startsWith('open-legend:creation-request:'))
          throw new DOMException('Observation creation storage failure', 'QuotaExceededError');
        return original.call(this, key);
      },
    });
  }, operation);
}
async function restoreCreationStorage(page: Page) {
  await page.evaluate(() => {
    const host = window as unknown as { restoreCreationStorage?: () => void };
    host.restoreCreationStorage?.();
    delete host.restoreCreationStorage;
  });
}

// Item/person/environment share useCreationRequest's persistence, cleanup and private
// scope owner. Earlier J40 native sessions cover each distinct output owner; one supported
// item exercises this missing browser-storage boundary without regenerating all kinds.
test('creation survives failed local markers and safely refuses unavailable recovery', async ({
  page,
}, info) => {
  const store = await testRepository();
  const config = readConfig({ AI_BUDGET_USD: '0', OPEN_LEGEND_GOD_MODE: 'true' });
  expect(config.budgetUsd).toBe(0);
  for (const key of [
    'jevKey',
    'llmKey',
    'embeddingKey',
    'macrofoldKey',
    'macrofoldProviderConnectionId',
    'macrofoldJevConnectionId',
    'macrofoldWorldConnectionId',
  ] as const)
    expect(config[key]).toBe('');
  const game = await createGameServer({ config, store, production: true, tick: false });
  let currentView: GameView | undefined;
  const errors: string[] = [];
  const providerRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (
      request.method() === 'POST' &&
      /^\/api\/(?:chat|invent|inventions|world-agent)(?:\/|$)/.test(path)
    )
      providerRequests.push(path);
  });
  page.on('response', async (response) => {
    if (new URL(response.url()).pathname !== '/api/state' || !response.ok()) return;
    const view = await response.json().catch(() => undefined);
    if (view?.player && view?.entities) currentView = view as GameView;
  });
  try {
    await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
    const address = game.server.address();
    if (!address || typeof address === 'string') throw new Error('Missing listener');
    await page.goto(`http://127.0.0.1:${address.port}`);
    await enterGame(page);
    await expect.poll(() => currentView?.access?.controlling).toBe(true);
    const originalView = currentView!;
    expect(originalView.godMode).toBe(true);
    const actorId = originalView.player.id;
    const definitionId = 'woven_bag';
    const option = originalView.godTools!.itemOptions.find((item) => item.id === definitionId);
    expect(option).toBeDefined();
    const bagIds = () =>
      itemsForOwner(game.service.world, actorId)
        .filter((item) => item.definitionId === definitionId)
        .map((item) => item.id)
        .sort();
    const beforeBags = bagIds();
    const requests: CreationBody[] = [];
    let acknowledged: ApiResult | undefined;
    let replayUnchanged = false;
    await page.route('**/api/god/items', async (route) => {
      const body = route.request().postDataJSON() as CreationBody;
      requests.push(body);
      const before = digest(game.service.world);
      const native = await route.fetch();
      const result = (await native.json()) as ApiResult;
      expect(result).toMatchObject({ ok: true, code: 'item-created' });
      if (requests.length === 1) {
        acknowledged = result;
        await route.abort('failed');
      } else {
        expect(requests).toHaveLength(2);
        expect(body).toEqual(requests[0]);
        expect(result).toEqual(acknowledged);
        expect(digest(game.service.world)).toBe(before);
        replayUnchanged = true;
        await route.fulfill({ response: native });
      }
    });
    await openItemEntry(page);
    const create = page.getByRole('dialog', { name: 'Create item', exact: true });
    await create.getByRole('combobox', { name: 'Item', exact: true }).fill(option!.label);
    const choice = page.getByRole('option').filter({ hasText: option!.label });
    await expect(choice).toHaveCount(1);
    await choice.click();
    await create.getByRole('button', { name: 'Create 1 item', exact: true }).click();
    const recovery = page.getByRole('dialog', { name: 'Original creation', exact: true });
    await expect(recovery).toBeVisible();
    await expect(recovery).toContainText('The original result is not confirmed.');
    expect(requests).toHaveLength(1);
    const originalBody = requests[0]!;
    expect(originalBody).toMatchObject({
      definitionId,
      quantity: 1,
      destination: { actorId },
    });
    const originalRecords = await retainedCreation(page);
    expect(originalRecords).toHaveLength(1);
    expect(originalRecords[0]!.value).toMatchObject({ kind: 'item', body: originalBody });
    const originalReceipt = structuredClone(game.service.world.commandReceipts[originalBody.id]);
    expect(originalReceipt?.outcome).toEqual(acknowledged);
    const createdId = acknowledged!.itemId!;
    expect(bagIds()).toEqual([...beforeBags, createdId].sort());
    expect(itemFor(game.service.world, createdId)?.ownerId).toBe(actorId);

    // Remove only optional local markers, then make their writes fail across reload.
    // The genuine unresolved session record and native output are left untouched.
    await page.evaluate(() => {
      localStorage.removeItem('open-legend:private-owner');
      for (const key of Object.keys(localStorage))
        if (key.startsWith('open-legend:save-timeline:')) localStorage.removeItem(key);
    });
    await page.addInitScript(() => {
      const local = window.localStorage;
      const descriptor = Object.getOwnPropertyDescriptor(Storage.prototype, 'setItem')!;
      const original = descriptor.value as (this: Storage, key: string, value: string) => void;
      const host = window as unknown as { refusedLocalMarkers?: number };
      Object.defineProperty(Storage.prototype, 'setItem', {
        ...descriptor,
        value(this: Storage, key: string, value: string) {
          if (
            this === local &&
            (key === 'open-legend:private-owner' || key.startsWith('open-legend:save-timeline:'))
          ) {
            host.refusedLocalMarkers = (host.refusedLocalMarkers ?? 0) + 1;
            throw new DOMException('Observation local marker failure', 'QuotaExceededError');
          }
          return original.call(this, key, value);
        },
      });
    });
    currentView = undefined;
    await page.reload();
    await enterGame(page);
    await expect.poll(() => currentView?.access?.controlling).toBe(true);
    expect(currentView!.access!.privateDraftScope).toBe(originalView.access!.privateDraftScope);
    expect(currentView!.saveTimeline).toBe(originalView.saveTimeline);
    expect(
      await page.evaluate(
        () => (window as unknown as { refusedLocalMarkers?: number }).refusedLocalMarkers ?? 0,
      ),
    ).toBeGreaterThan(0);
    expect(await retainedCreation(page)).toEqual(originalRecords);
    await openItemEntry(page);
    await expect(recovery).toBeVisible();
    await expect(create).toHaveCount(0);
    expect(requests).toHaveLength(1);

    await refuseCreationStorage(page, 'getItem');
    await recovery.getByRole('button', { name: 'Retry original creation', exact: true }).click();
    await expect(recovery).toContainText(
      'This browser could not read the original creation. Nothing was sent.',
    );
    expect(requests).toHaveLength(1);
    await restoreCreationStorage(page);
    expect(await retainedCreation(page)).toEqual(originalRecords);
    await page.screenshot({
      path: info.outputPath('creation-storage-recovery.png'),
      timeout: 10_000,
    });

    // Real native replay returns the original result. A failed removal must retain
    // that confirmed result and block another creation until cleanup or scope change.
    await refuseCreationStorage(page, 'removeItem');
    await recovery.getByRole('button', { name: 'Retry original creation', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(
      recovery.getByRole('button', { name: 'Retry local cleanup', exact: true }),
    ).toBeEnabled();
    await expect(recovery).toContainText('This browser could not clear the retained request.');
    expect(replayUnchanged).toBe(true);
    expect(requests).toHaveLength(2);
    const resolvedRecords = await retainedCreation(page);
    expect(resolvedRecords).toHaveLength(1);
    expect(resolvedRecords[0]!.key).toBe(originalRecords[0]!.key);
    expect(resolvedRecords[0]!.value).toMatchObject({ body: originalBody, outcome: acknowledged });
    expect(game.service.world.commandReceipts[originalBody.id]).toEqual(originalReceipt);
    expect(bagIds()).toEqual([...beforeBags, createdId].sort());
    await restoreCreationStorage(page);
    await recovery.getByRole('button', { name: 'Close', exact: true }).click();
    await openItemEntry(page);
    await expect(
      recovery.getByRole('button', { name: 'Retry local cleanup', exact: true }),
    ).toBeEnabled();
    expect(requests).toHaveLength(2);
    await recovery.getByRole('button', { name: 'Close', exact: true }).click();

    await page.locator('#gameMenuButton').click();
    await page
      .locator('.ol-game-menu')
      .getByRole('button', { name: 'Log Out', exact: true })
      .click();
    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
    expect(await retainedCreation(page)).toEqual([]);
    currentView = undefined;
    await page.getByRole('link', { name: 'Sign in', exact: true }).click();
    await enterGame(page);
    await expect.poll(() => currentView?.access?.controlling).toBe(true);
    expect(currentView!.player.id).toBe(actorId);
    expect(currentView!.access!.privateDraftScope).not.toBe(originalView.access!.privateDraftScope);
    await openItemEntry(page);
    await expect(create).toBeVisible();
    await expect(recovery).toHaveCount(0);
    expect(requests).toHaveLength(2);
    expect(bagIds()).toEqual([...beforeBags, createdId].sort());
    expect(game.service.world.commandReceipts[originalBody.id]).toEqual(originalReceipt);
    expect(errors).toEqual([]);
    expect(providerRequests).toEqual([]);
    expect((await store.usage(0)).usage.llmCalls).toBe(0);
    expect((await store.usage(0)).usage.jevCalls).toBe(0);
    expect(await store.recentJobs()).toEqual([]);
    console.log(
      'CREATION_STORAGE=' +
        JSON.stringify({
          kind: 'item',
          nativePosts: requests.length,
          oneOutput: true,
          freshPrivateScope: true,
        }),
    );
  } finally {
    await page.close();
    await game.close();
  }
});

test.afterAll(closeTestDatabases);
