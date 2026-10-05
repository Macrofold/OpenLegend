import { enterGame } from '../fixtures/browser.js';
import { testRepository, closeTestDatabases } from '../fixtures/database.js';
import { expect, test } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import { readConfig } from '../fixtures/database.js';
import type { WorldAgentSessionStatus, WorldAgentTurnView } from '@open-legend/protocol';

test('owner conversation grows from one line and shows message-local pending and failure details', async ({
  page,
}) => {
  const game = await createGameServer({
    config: readConfig({ OPEN_LEGEND_GOD_MODE: 'true', AI_BUDGET_USD: '0' }),
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
  // Native owner access, session creation and history reads still run through the
  // server. Only model availability and generated turns are controlled responses;
  // every message is intercepted and the real server retains a zero spending cap.
  await page.route('**/api/world-agent/session/status', async (route) => {
    const nativeResponse = await route.fetch();
    const status = (await nativeResponse.json()) as WorldAgentSessionStatus & { ok: boolean };
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
      history.data.turns = [...history.data.turns, ...turns];
    await route.fulfill({ response: nativeResponse, json: history });
  });
  await page.route('**/api/world-agent/messages', async (route) => {
    const request = route.request().postDataJSON();
    expect(request).toMatchObject({ worldId: game.service.world.id, sessionId });
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
    await route.fulfill({
      json: { ok: true, code: 'pending', message: 'The controlled turn was accepted.' },
    });
  });
  try {
    await page.goto(`http://127.0.0.1:${address.port}`);
    await enterGame(page);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    await page.locator('.ol-rail').getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByRole('button', { name: 'New conversation', exact: true }).first().click();
    await page.getByRole('button', { name: 'Start conversation', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Message to World Agent', exact: true });
    await expect(input).toBeVisible();
    await page.getByText('Session details and owner spending', { exact: true }).click();
    const refresh = page.getByRole('button', { name: 'Refresh this session', exact: true });
    const initial = await input.boundingBox();
    await input.fill('First line\nSecond line');
    expect((await input.boundingBox())!.height).toBeGreaterThan(initial!.height);
    await input.fill('What should change here?');
    await input.press('Enter');
    await expect(page.getByRole('status', { name: 'Waiting for a reply' })).toBeVisible();
    await expect(page.getByText(/considering|queueing|generating|thinking/i)).toHaveCount(0);
    await expect.poll(() => typeof gate.release).toBe('function');
    ((value: { release?: () => void }) => value.release?.())(gate);
    await refresh.click();
    await expect(page.getByText('The clearing feels ready for change.')).toBeVisible();
    await expect(page.getByRole('status', { name: 'Waiting for a reply' })).toBeHidden();
    // Hidden retained Work can describe completed proposals; visible completion text is forbidden.
    await expect(page.getByText(/completed/i).filter({ visible: true })).toHaveCount(0);

    response = { ok: false, code: 'failed', message: 'Technical failure details.' };
    delete gate.release;
    await input.fill('And now?');
    await input.press('Enter');
    await expect(page.getByRole('status', { name: 'Waiting for a reply' })).toBeVisible();
    await expect.poll(() => typeof gate.release).toBe('function');
    ((value: { release?: () => void }) => value.release?.())(gate);
    await refresh.click();
    await expect(page.getByText('Technical failure details.', { exact: true })).toBeVisible();
    const failed = page.getByRole('button', { name: 'Failed: failed', exact: true });
    const failureDetail = page.getByRole('tooltip');
    await expect(failed).toBeVisible();
    await expect(failureDetail).toBeHidden();
    await failed.hover();
    await expect(failureDetail).toBeVisible();
    await expect(failureDetail).toContainText('failed');
    expect(turns).toHaveLength(2);
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    await page.close();
    await game.close();
  }
});

test.afterAll(closeTestDatabases);
