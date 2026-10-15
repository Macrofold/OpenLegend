import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { enterGame } from '../tests/fixtures/browser.js';
import { testRepository, closeTestDatabases, readConfig } from '../tests/fixtures/database.js';
import { createGameServer } from '../apps/server/src/http.js';
import { advanceWorld } from '../packages/domain/src/index.js';
import { digest } from '../apps/server/src/store.js';
import type { ApiResult } from '../packages/protocol/src/index.js';

type Game = Awaited<ReturnType<typeof createGameServer>>;
type Store = Awaited<ReturnType<typeof testRepository>>;

test.setTimeout(60_000);
async function withGame(page: Page, body: (game: Game, store: Store) => Promise<void>) {
  const store = await testRepository();
  const game = await createGameServer({
    config: readConfig({ AI_BUDGET_USD: '0' }),
    store,
    production: true,
    tick: false,
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
    const address = game.server.address();
    if (!address || typeof address === 'string') throw new Error('Missing listener');
    await page.goto(`http://127.0.0.1:${address.port}`);
    await enterGame(page);
    await body(game, store);
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
}
async function actions(page: Page) {
  if (!(await page.locator('.ol-character').isVisible()))
    await page.getByRole('button', { name: /^Character/ }).click();
  await page.getByRole('tab', { name: 'Capabilities', exact: true }).click();
  if (!(await page.getByRole('textbox', { name: 'Action intention' }).isVisible()))
    await page.getByRole('button', { name: 'Describe an action', exact: true }).click();
  return page.locator('.ol-character-actions');
}
async function checkpoints(page: Page) {
  if (!(await page.locator('.ol-checkpoints').isVisible())) {
    if (!(await page.locator('.ol-game-menu').isVisible()))
      await page.locator('#gameMenuButton').click();
    await page
      .locator('.ol-game-menu')
      .getByRole('button', { name: 'Checkpoints', exact: true })
      .click();
  }
  return page.locator('.ol-checkpoints');
}
async function capture(page: Page, info: TestInfo, name: string) {
  await page.screenshot({
    path: info.outputPath(name + '.png'),
    timeout: 10_000,
  });
  console.log('CAPTURED=' + name);
}

// Deliberate browser-storage failure for one consequential request family. Optional
// drafts/preferences and the server's actual admission/receipt owners stay unchanged.
async function refuseSessionOperation(
  page: Page,
  operation: 'setItem' | 'removeItem',
  prefix: string,
) {
  await page.evaluate(
    ({ operation, prefix }) => {
      const session = window.sessionStorage;
      const descriptor = Object.getOwnPropertyDescriptor(Storage.prototype, operation)!;
      const original = descriptor.value as (this: Storage, key: string, value?: string) => void;
      const host = window as unknown as { restoreObservedStorage?: () => void };
      host.restoreObservedStorage = () =>
        Object.defineProperty(Storage.prototype, operation, descriptor);
      Object.defineProperty(Storage.prototype, operation, {
        ...descriptor,
        value(this: Storage, key: string, value?: string) {
          if (this === session && key.startsWith(prefix))
            throw new DOMException('Observation storage failure', 'QuotaExceededError');
          return original.call(this, key, value);
        },
      });
    },
    { operation, prefix },
  );
}
async function restoreSessionOperation(page: Page) {
  await page.evaluate(() => {
    const host = window as unknown as { restoreObservedStorage?: () => void };
    host.restoreObservedStorage?.();
    delete host.restoreObservedStorage;
  });
}

test('original action survives edited words, finished current work and reload without resubmission', async ({
  page,
}, info) => {
  await withGame(page, async (game) => {
    const panel = await actions(page);
    const words = page.getByRole('textbox', { name: 'Action intention' });
    const observedActionPosts: unknown[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/action-attempt')
        observedActionPosts.push(request.postDataJSON());
    });
    await words.fill('wait 3 minutes');
    const beforeStorageFailure = digest(game.service.world);
    await refuseSessionOperation(page, 'setItem', 'open-legend:action-request:');
    await panel.getByRole('button', { name: 'Attempt action', exact: true }).click();
    await expect(panel).toContainText('Observation storage failure');
    await expect(words).toHaveValue('wait 3 minutes');
    expect(observedActionPosts).toEqual([]);
    expect(digest(game.service.world)).toBe(beforeStorageFailure);
    await restoreSessionOperation(page);
    await panel.getByRole('button', { name: 'Attempt action', exact: true }).click();
    await expect(
      panel.getByRole('radio', { name: 'Replace current work', exact: true }),
    ).toBeVisible();
    let submissions = 0;
    let acknowledged: ApiResult | undefined;
    let original: Record<string, unknown> | undefined;
    await page.route('**/api/action-attempt', async (route) => {
      submissions++;
      original = route.request().postDataJSON() as Record<string, unknown>;
      const response = await route.fetch();
      acknowledged = (await response.json()) as ApiResult;
      await route.abort('failed');
    });
    await words.fill('wait 1 minutes');
    await panel.getByText('Replace current work', { exact: true }).click();
    await expect(
      panel.getByRole('radio', { name: 'Replace current work', exact: true }),
    ).toBeChecked();
    await panel.getByRole('button', { name: 'Replace work', exact: true }).click();
    await expect(
      panel.getByText('Original action result not confirmed', { exact: true }),
    ).toBeVisible();
    expect(acknowledged).toMatchObject({ ok: true });
    await words.fill('wait 2 minutes');
    await game.service.transition((world) => advanceWorld(world, 61));
    await expect(panel.getByRole('button', { name: 'Attempt action', exact: true })).toBeDisabled();
    expect(original).toMatchObject({ text: 'wait 1 minutes', mode: 'replace' });
    expect(submissions).toBe(1);
    await page.reload();
    await enterGame(page);
    await actions(page);
    await expect(
      panel.getByText('Original action result not confirmed', { exact: true }),
    ).toBeVisible();
    await expect(words).toHaveValue('wait 2 minutes');
    await expect(panel.locator('.ol-notice')).toContainText('wait 1 minutes');
    await expect(panel.locator('.ol-notice')).toContainText('Replace current work');
    await capture(page, info, 'action-recovery-desktop');
    const before = digest(game.service.world);
    await refuseSessionOperation(page, 'removeItem', 'open-legend:action-request:');
    await panel.getByRole('button', { name: 'Check original action', exact: true }).click();
    await expect(panel).toContainText('Observation storage failure');
    await expect(
      panel.getByText('Original action result not confirmed', { exact: true }),
    ).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Attempt action', exact: true })).toBeDisabled();
    expect(digest(game.service.world)).toBe(before);
    expect(submissions).toBe(1);
    expect(observedActionPosts).toHaveLength(2); // Initial work and original replaced work only.
    await restoreSessionOperation(page);
    await panel.getByRole('button', { name: 'Check original action', exact: true }).click();
    await expect(
      panel.getByText('Original action result not confirmed', { exact: true }),
    ).toBeHidden();
    expect(digest(game.service.world)).toBe(before);
    expect(submissions).toBe(1);
    await expect(panel.getByRole('button', { name: 'Attempt action', exact: true })).toBeEnabled();
  });
});

test('checkpoint creation recovers after acknowledgement loss and reload without another capture', async ({
  page,
}, info) => {
  await withGame(page, async (game, store) => {
    const panel = await checkpoints(page);
    let submissions = 0;
    let acknowledged: ApiResult | undefined;
    await page.route('**/api/saves/create', async (route) => {
      submissions++;
      const response = await route.fetch();
      acknowledged = (await response.json()) as ApiResult;
      await route.abort('failed');
    });
    await panel
      .getByRole('textbox', { name: 'Checkpoint name', exact: true })
      .fill('Original create recovery');
    const beforeStorageFailure = await store.saves!.list(game.service.world.id, { limit: 100 });
    await refuseSessionOperation(page, 'setItem', 'open-legend:checkpoint-request:');
    await panel.getByRole('button', { name: 'Create checkpoint', exact: true }).click();
    await expect(panel).toContainText('Observation storage failure');
    await expect(panel.getByRole('textbox', { name: 'Checkpoint name', exact: true })).toHaveValue(
      'Original create recovery',
    );
    expect(submissions).toBe(0);
    expect(await store.saves!.list(game.service.world.id, { limit: 100 })).toEqual(
      beforeStorageFailure,
    );
    await restoreSessionOperation(page);
    await panel.getByRole('button', { name: 'Create checkpoint', exact: true }).click();
    await expect(panel.getByText('Checkpoint result not confirmed', { exact: true })).toBeVisible();
    expect(acknowledged).toMatchObject({ ok: true });
    expect(submissions).toBe(1);
    await page.reload();
    await enterGame(page);
    await checkpoints(page);
    await expect(panel.getByText('Checkpoint result not confirmed', { exact: true })).toBeVisible();
    await expect(
      panel.getByRole('button', { name: 'Create checkpoint', exact: true }),
    ).toBeDisabled();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(panel).toBeVisible();
    await expect(page.locator('.ol-game-menu')).toBeHidden();
    await capture(page, info, 'checkpoint-create-recovery-phone');
    const before = await store.saves!.list(game.service.world.id, {
      limit: 100,
    });
    await panel
      .getByRole('button', {
        name: 'Check original checkpoint result',
        exact: true,
      })
      .click();
    await expect(panel.getByText('Checkpoint result not confirmed', { exact: true })).toBeHidden();
    expect(await store.saves!.list(game.service.world.id, { limit: 100 })).toEqual(before);
    expect(submissions).toBe(1);
  });
});

test.afterAll(closeTestDatabases);
