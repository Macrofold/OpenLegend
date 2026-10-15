import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { enterGame } from '../tests/fixtures/browser.js';
import { testRepository, closeTestDatabases, readConfig } from '../tests/fixtures/database.js';
import { createGameServer } from '../apps/server/src/http.js';
import { advanceWorld } from '../packages/domain/src/index.js';
import { digest } from '../apps/server/src/store.js';
import type { ApiResult, GameView, RequestRecoveryResult } from '../packages/protocol/src/index.js';

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

// One cross-owner boundary: the genuine original action and a held native receipt
// belong to the abandoned timeline; the original load receipt remains readable
// under current save authority. This is not a changed-account/grant matrix.
test('loading an earlier checkpoint clears the original action while preserving exact load recovery', async ({
  page,
}, info) => {
  let currentView: GameView | undefined;
  page.on('response', async (response) => {
    if (new URL(response.url()).pathname !== '/api/state' || !response.ok()) return;
    const view = await response.json().catch(() => undefined);
    if (view?.player && view?.entities) currentView = view as GameView;
  });
  const records = (prefix: string) =>
    page.evaluate(
      (prefix) =>
        Object.keys(sessionStorage)
          .filter((key) => key.startsWith(prefix))
          .map((key) => ({ key, value: sessionStorage.getItem(key) })),
      prefix,
    );
  await withGame(page, async (game, store) => {
    await expect.poll(() => currentView?.access?.controlling).toBe(true);
    const originalView = currentView!;
    expect(originalView.player.hasWork).toBe(false);
    const originalTime = game.service.world.simTime;
    const checkpointLabel = 'Before the original action';
    const saves = await checkpoints(page);
    let creates = 0;
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/saves/create') creates++;
    });
    await saves
      .getByRole('textbox', { name: 'Checkpoint name', exact: true })
      .fill(checkpointLabel);
    await saves.getByRole('button', { name: 'Create checkpoint', exact: true }).click();
    const load = saves.getByRole('button', { name: `Load ${checkpointLabel}`, exact: true });
    await expect(load).toBeEnabled();
    expect(creates).toBe(1);

    const actionPanel = await actions(page);
    const words = page.getByRole('textbox', { name: 'Action intention' });
    let actionPosts = 0;
    let originalAction: Record<string, unknown> | undefined;
    let actionAcknowledged: ApiResult | undefined;
    await page.route('**/api/action-attempt', async (route) => {
      actionPosts++;
      originalAction = route.request().postDataJSON() as Record<string, unknown>;
      const response = await route.fetch();
      actionAcknowledged = (await response.json()) as ApiResult;
      await route.abort('failed');
    });
    await words.fill('wait 3 minutes');
    await actionPanel.getByRole('button', { name: 'Attempt action', exact: true }).click();
    await expect(
      actionPanel.getByText('Original action result not confirmed', { exact: true }),
    ).toBeVisible();
    expect(actionAcknowledged).toMatchObject({ ok: true });
    expect(originalAction).toMatchObject({ text: 'wait 3 minutes', mode: 'enqueue' });
    await words.fill('wait 2 minutes');
    const originalActionRecords = await records('open-legend:action-request:');
    const originalDrafts = await records('open-legend:action-draft:');
    expect(originalActionRecords).toHaveLength(1);
    expect(JSON.parse(originalActionRecords[0]!.value!)).toMatchObject({
      ...originalAction,
      timeline: originalView.saveTimeline,
    });
    expect(originalDrafts.some((record) => record.value === 'wait 2 minutes')).toBe(true);

    let releaseActionReceipt!: () => void;
    const heldActionReceipt = new Promise<void>((resolve) => {
      releaseActionReceipt = resolve;
    });
    page.once('close', releaseActionReceipt);
    let actionReceipt: RequestRecoveryResult | undefined;
    let actionReads = 0;
    let lateDelivery: 'waiting' | 'delivered' | 'cancelled' = 'waiting';
    await page.route('**/api/action-attempt/receipt', async (route) => {
      actionReads++;
      expect(route.request().postDataJSON()).toEqual({
        ...originalAction,
        timeline: originalView.saveTimeline,
      });
      const response = await route.fetch();
      actionReceipt = (await response.json()) as RequestRecoveryResult;
      await heldActionReceipt;
      try {
        await route.fulfill({ response });
        lateDelivery = 'delivered';
      } catch {
        lateDelivery = 'cancelled';
      }
    });
    await actionPanel.getByRole('button', { name: 'Check original action', exact: true }).click();
    await expect
      .poll(() => actionReceipt)
      .toMatchObject({
        ok: true,
        status: 'resolved',
        scope: originalView.access!.scope,
        result: { jobId: actionAcknowledged!.jobId },
      });

    await game.service.transition((world) => advanceWorld(world, 17));
    const timeline = game.service.timelineId;
    const protectedTime = game.service.world.simTime;
    const protectedIds: string[] = [];
    const originalCommit = store.commit.bind(store);
    store.commit = async (...args) => {
      const revision = await originalCommit(...args);
      if (args[4]?.restore) protectedIds.push(args[4].restore.recoveryId);
      return revision;
    };
    let loads = 0;
    let loadBody: { id: string; requestId: string } | undefined;
    let loadAcknowledged: ApiResult | undefined;
    await page.route('**/api/saves/load', async (route) => {
      loads++;
      loadBody = route.request().postDataJSON() as { id: string; requestId: string };
      const response = await route.fetch();
      loadAcknowledged = (await response.json()) as ApiResult;
      await route.abort('failed');
    });
    await checkpoints(page);
    await load.click();
    await saves.getByRole('button', { name: 'Confirm load', exact: true }).click();
    await expect.poll(() => game.service.timelineId).not.toBe(timeline);
    await expect.poll(() => loadAcknowledged?.ok).toBe(true);
    expect(protectedIds).toHaveLength(1);
    const protectionId = protectedIds[0]!;
    const protection = await store.saves!.read(game.service.world.id, protectionId);
    expect(protection.state.world.simTime).toBe(protectedTime);
    expect(game.service.world.simTime).toBe(originalTime);
    await enterGame(page);
    await expect.poll(() => currentView?.saveTimeline).toBe(game.service.timelineId);
    expect(currentView!.checkpoint!.recoveryScope).toBe(originalView.checkpoint!.recoveryScope);

    // The native old result is already available before restoration; only its
    // browser delivery is controlled. Cancellation is reported separately.
    releaseActionReceipt();
    await expect.poll(() => lateDelivery).not.toBe('waiting');
    const freshActionPanel = await actions(page);
    await expect(words).toHaveValue('');
    await expect(
      freshActionPanel.getByText('Original action result not confirmed', { exact: true }),
    ).toBeHidden();
    await expect(freshActionPanel.locator('.ol-action-result')).toHaveCount(0);
    expect(currentView!.player.hasWork).toBe(false);
    expect(await records('open-legend:action-request:')).toEqual([]);
    const freshDrafts = await records('open-legend:action-draft:');
    for (const previous of originalDrafts)
      expect(freshDrafts.some((record) => record.key === previous.key)).toBe(false);
    expect(actionPosts).toBe(1);
    expect(actionReads).toBe(1);

    await checkpoints(page);
    await expect(saves.getByText('Checkpoint result not confirmed', { exact: true })).toBeVisible();
    const retainedLoad = await records('open-legend:checkpoint-request:');
    expect(retainedLoad).toHaveLength(1);
    const originalLoadRequest = JSON.parse(retainedLoad[0]!.value!);
    expect(originalLoadRequest).toEqual({
      operation: 'load',
      requestId: loadBody!.requestId,
      saveId: loadBody!.id,
      label: checkpointLabel,
      timeline,
    });
    expect(await store.getIntegration(`load-request:${loadBody!.requestId}`)).toEqual({
      saveId: loadBody!.id,
    });
    await capture(page, info, 'action-cleared-checkpoint-load-retained');
    const currentTimeline = game.service.timelineId;
    const beforeReceipt = digest(game.service.world);
    const beforeCatalog = await store.saves!.list(game.service.world.id, { limit: 100 });
    // Keep this genuine record for the actual logout observation. The server
    // read must still resolve the original load; a local cleanup failure stays explicit.
    await refuseSessionOperation(page, 'removeItem', 'open-legend:checkpoint-request:');
    const receiptRequest = page.waitForRequest(
      (request) => new URL(request.url()).pathname === '/api/saves/receipt',
    );
    const receiptResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/saves/receipt',
    );
    await saves
      .getByRole('button', { name: 'Check original checkpoint result', exact: true })
      .click();
    expect((await receiptRequest).postDataJSON()).toEqual(originalLoadRequest);
    const receipt = (await (await receiptResponse).json()) as RequestRecoveryResult;
    expect(receipt).toMatchObject({
      ok: true,
      status: 'resolved',
      scope: currentView!.checkpoint!.scope,
      result: { ok: true, code: 'loaded' },
    });
    await expect(saves).toContainText('Observation storage failure');
    expect(await records('open-legend:checkpoint-request:')).toEqual(retainedLoad);
    expect(game.service.timelineId).toBe(currentTimeline);
    expect(digest(game.service.world)).toBe(beforeReceipt);
    expect(await store.saves!.read(game.service.world.id, protectionId)).toEqual(protection);
    expect(await store.saves!.list(game.service.world.id, { limit: 100 })).toEqual(beforeCatalog);
    expect(protectedIds).toEqual([protectionId]);
    await restoreSessionOperation(page);

    // A fresh Game menu owns Log Out. Returning from the Checkpoints task does
    // not require selecting a hidden inner section.
    await page.locator('#gameMenuButton').click();
    await page
      .locator('.ol-game-menu')
      .getByRole('button', { name: 'Log Out', exact: true })
      .click();
    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
    expect(await records('open-legend:checkpoint-request:')).toEqual([]);
    currentView = undefined;
    await page.getByRole('link', { name: 'Sign in', exact: true }).click();
    await enterGame(page);
    await expect.poll(() => currentView?.access?.controlling).toBe(true);
    expect(currentView!.player.id).toBe(originalView.player.id);
    expect(currentView!.access!.privateDraftScope).not.toBe(originalView.access!.privateDraftScope);
    expect(currentView!.checkpoint!.recoveryScope).not.toBe(originalView.checkpoint!.recoveryScope);
    await checkpoints(page);
    await expect(saves.getByText('Checkpoint result not confirmed', { exact: true })).toBeHidden();
    await expect(saves.getByRole('textbox', { name: 'Checkpoint name', exact: true })).toHaveValue(
      '',
    );
    await expect(saves.getByText('Observation storage failure', { exact: true })).toBeHidden();
    expect(await records('open-legend:checkpoint-request:')).toEqual([]);
    expect(actionPosts).toBe(1);
    expect(creates).toBe(1);
    expect(loads).toBe(1);
    expect(game.service.timelineId).toBe(currentTimeline);
    expect(protectedIds).toEqual([protectionId]);
    expect(await store.saves!.read(game.service.world.id, protectionId)).toEqual(protection);
    expect((await store.usage(0)).usage.llmCalls).toBe(0);
    expect((await store.usage(0)).usage.jevCalls).toBe(0);
    console.log(
      'ACTION_CHECKPOINT_BOUNDARY=' +
        JSON.stringify({
          actionPosts,
          actionReads,
          creates,
          loads,
          lateDelivery,
          freshSession: true,
        }),
    );
  });
});

test.afterAll(closeTestDatabases);
