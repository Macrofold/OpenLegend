import { enterGame } from '../tests/fixtures/browser.js';
import { testRepository, closeTestDatabases } from '../tests/fixtures/database.js';
import { expect, test } from '@playwright/test';
import { createGameServer } from '../apps/server/src/http.js';
import { readConfig } from '../tests/fixtures/database.js';
import type { WorldAgentSessionStatus, WorldAgentTurnView } from '@open-legend/protocol';

test('owner conversation refuses unretained requests and recovers its exact original after unreadable storage and reload', async ({
  page,
}, info) => {
  const game = await createGameServer({
    config: readConfig({
      OPEN_LEGEND_GOD_MODE: 'true',
      AI_BUDGET_USD: '0',
      OPEN_LEGEND_WORLD_PRESET: 'solo',
    }),
    store: await testRepository(),
    production: true,
    tick: false,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('No listener');
  const gate: { release?: () => void } = {};
  let response: { ok: boolean; code: string; message: string } = {
    ok: true,
    code: 'completed',
    message: 'The clearing feels ready for change.',
  };
  const turns: WorldAgentTurnView[] = [];
  let sessionId: string | undefined;
  let hideRecoveredTurn = false;
  let loseAcknowledgement = false;
  let messagePosts = 0;
  // Native owner access, session creation and history reads still run through the
  // server. Only model availability and generated turns are controlled responses;
  // every message is intercepted and the real server retains a zero spending cap.
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem,
      set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (this: Storage, key: string) {
      if (
        this === localStorage &&
        key.endsWith(',\"pending\"]') &&
        get.call(sessionStorage, 'owner-pending-read-block') === 'true'
      )
        throw new DOMException('Controlled pending read denial', 'SecurityError');
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
      if (
        this === localStorage &&
        key.endsWith(',\"pending\"]') &&
        get.call(sessionStorage, 'owner-pending-write-block') === 'true'
      )
        throw new DOMException('Controlled pending quota denial', 'QuotaExceededError');
      return set.call(this, key, value);
    };
  });
  await page.route('**/api/world-agent/session/status', async (route) => {
    const nativeResponse = await route.fetch();
    const status = (await nativeResponse.json()) as WorldAgentSessionStatus & {
      ok: boolean;
    };
    if (status.ok && status.data?.available) {
      sessionId = status.data.sessionId;
      status.availability = {
        ...status.availability,
        configured: true,
        reason: 'Controlled browser response fixture; no provider is called.',
      };
      status.data.activeTurn = turns.find((turn) => !turn.response)?.id ?? null;
    }
    await route.fulfill({ response: nativeResponse, json: status });
  });
  await page.route('**/api/world-agent/session/turns', async (route) => {
    const nativeResponse = await route.fetch();
    const history = (await nativeResponse.json()) as {
      ok: boolean;
      data: { turns: WorldAgentTurnView[]; next: unknown };
    };
    if (history.ok && route.request().postDataJSON().sessionId === sessionId)
      history.data.turns = [...history.data.turns, ...(hideRecoveredTurn ? [] : turns)];
    await route.fulfill({ response: nativeResponse, json: history });
  });
  await page.route('**/api/world-agent/messages', async (route) => {
    messagePosts++;
    const request = route.request().postDataJSON();
    expect(request).toMatchObject({
      worldId: game.service.world.id,
      sessionId,
    });
    const turn: WorldAgentTurnView = {
      id: request.requestId,
      revision: 1,
      sequence: turns.length + 1,
      text: request.text,
      createdAt: Date.now(),
      cancelRequested: false,
      response: null,
    };
    turns.push(turn);
    const result = { ...response };
    gate.release = () => {
      turn.response = result;
      turn.revision = 2;
    };
    if (loseAcknowledgement) {
      turn.response = result;
      turn.revision = 2;
      await route.abort('failed');
    } else
      await route.fulfill({
        json: {
          ok: true,
          code: 'pending',
          message: 'The controlled turn was accepted.',
        },
      });
  });
  try {
    await page.goto(`http://127.0.0.1:${address.port}`);
    await enterGame(page);
    // This narrow observation qualifies owner storage, independently of the unchanged
    // ordinary test's first-world-image gate. The real native owner must have control.
    const ownerAccess = await page.evaluate(async () => {
      const response = await fetch('/api/state', {
        headers: {
          'X-OL-Client': sessionStorage.getItem('open-legend:tab-id') ?? '',
        },
      });
      const view = await response.json();
      return {
        ok: response.ok,
        godMode: view.godMode,
        controlling: view.access?.controlling,
        firstWorldReady: document.getElementById('world')?.getAttribute('data-ready'),
      };
    });
    expect(ownerAccess).toMatchObject({
      ok: true,
      godMode: true,
      controlling: true,
    });
    console.log(JSON.stringify({ ownerStoragePrecondition: ownerAccess }));
    const create = page.locator('.ol-rail').getByRole('button', { name: 'Create', exact: true });
    await expect(create).toBeEnabled();
    await create.click();
    await page.getByRole('button', { name: 'New conversation', exact: true }).first().click();
    await page.getByRole('button', { name: 'Start conversation', exact: true }).click();
    const input = page.getByRole('textbox', {
      name: 'Message to World Agent',
      exact: true,
    });
    await expect(input).toBeVisible();
    const sessionDetails = page.getByLabel('Session details and owner spending', { exact: true });
    const refresh = page.getByRole('button', {
      name: 'Refresh this session',
      exact: true,
    });
    const initial = await input.boundingBox();
    await input.fill('First line\nSecond line');
    expect((await input.boundingBox())!.height).toBeGreaterThan(initial!.height);
    await input.fill('What should change here?');
    await page.evaluate(() => sessionStorage.setItem('owner-pending-write-block', 'true'));
    await input.press('Enter');
    await expect(
      page.getByText('This browser could not retain the exact request. Nothing new was sent.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(input).toHaveValue('What should change here?');
    expect(messagePosts).toBe(0);
    expect(turns).toHaveLength(0);
    await page.evaluate(() => sessionStorage.removeItem('owner-pending-write-block'));
    loseAcknowledgement = true;
    hideRecoveredTurn = true;
    await expect(
      page.locator('.ol-world-agent-compose').getByRole('button', { name: 'Send', exact: true }),
    ).toBeEnabled();
    await input.press('Enter');
    await expect(
      page.getByText('Checking acknowledgement for: What should change here?', {
        exact: true,
      }),
    ).toBeVisible();
    expect(messagePosts).toBe(1);
    expect(turns).toHaveLength(1);
    const originalId = turns[0]!.id;
    await input.fill('A newer unsent owner note.');
    await page.evaluate(() => sessionStorage.setItem('owner-pending-read-block', 'true'));
    await page.reload();
    await enterGame(page);
    if (!(await input.isVisible()))
      await page.locator('.ol-rail').getByRole('button', { name: 'Create', exact: true }).click();
    await expect(input).toBeVisible();
    await expect(
      page.getByText(/This browser could not read or update the original request/),
    ).toBeVisible();
    await expect(input).toHaveValue('A newer unsent owner note.');
    await expect(
      page.locator('.ol-world-agent-compose').getByRole('button', { name: 'Send', exact: true }),
    ).toBeDisabled();
    await input.press('Enter');
    expect(messagePosts).toBe(1);
    await page.screenshot({
      path: info.outputPath('owner-blocked-recovery.png'),
    });
    await page.evaluate(() => sessionStorage.removeItem('owner-pending-read-block'));
    hideRecoveredTurn = false;
    loseAcknowledgement = false;
    await page.getByRole('button', { name: 'Check saved result', exact: true }).click();
    await expect(
      page.getByText(/This browser could not read or update the original request/),
    ).toBeHidden();
    await expect(
      page.getByText('Checking acknowledgement for: What should change here?', {
        exact: true,
      }),
    ).toBeHidden();
    await expect(input).toHaveValue('A newer unsent owner note.');
    expect(messagePosts).toBe(1);
    expect(turns[0]!.id).toBe(originalId);
    console.log(
      JSON.stringify({
        ownerStorage: {
          refusedBeforeDispatch: true,
          recoveredOriginalId: originalId,
          messagePosts,
          reloadedDraft: await input.inputValue(),
        },
      }),
    );
    await expect(page.getByText('The clearing feels ready for change.')).toBeVisible();
    await expect(page.getByRole('status', { name: 'Waiting for a reply' })).toBeHidden();
    // Hidden retained Work can describe completed proposals; visible completion text is forbidden.
    await expect(page.getByText(/completed/i).filter({ visible: true })).toHaveCount(0);

    response = {
      ok: false,
      code: 'failed',
      message: 'Technical failure details.',
    };
    delete gate.release;
    await input.fill('And now?');
    await input.press('Enter');
    await expect(page.getByRole('status', { name: 'Waiting for a reply' })).toBeVisible();
    await expect.poll(() => typeof gate.release).toBe('function');
    ((value: { release?: () => void }) => value.release?.())(gate);
    await sessionDetails.click();
    await refresh.click();
    await sessionDetails.click();
    await expect(page.getByText('Technical failure details.', { exact: true })).toBeVisible();
    const failed = page.getByRole('button', {
      name: 'Failed: failed',
      exact: true,
    });
    const failureDetail = page.getByRole('tooltip');
    await expect(failed).toBeVisible();
    await expect(failureDetail).toBeHidden();
    await failed.hover();
    await expect(failureDetail).toBeVisible();
    await expect(failureDetail).toContainText('failed');
    expect(turns).toHaveLength(2);
    expect(messagePosts).toBe(2);
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    await page.close();
    await game.close();
  }
});

test.afterAll(closeTestDatabases);
