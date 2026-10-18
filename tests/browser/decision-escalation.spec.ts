import { expect, test } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import { readConfig, testRepository, closeTestDatabases } from '../fixtures/database.js';
import { enterGame, blockExternalBrowserRequests } from '../fixtures/browser.js';
import type { AiClient, GenerateRequest } from '../../packages/ai/src/index.js';
import { undispatchedReceipt } from '../../apps/server/src/decision-state.js';
import { DECISION_MODEL, DECISION_REASONS } from '../../apps/server/src/decision-state.js';
import { useNearCampSight } from '../fixtures/service.js';
import { seedDecisionInspection } from '../fixtures/decision-inspection.js';

test('E36 explains one reconsideration and total cost in the authorized inspector', async ({
  page,
}, info) => {
  const game = await createGameServer({
    config: readConfig({ OPEN_LEGEND_GOD_MODE: 'true' }),
    store: await testRepository(),
    production: true,
    tick: false,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing listener.');
  try {
    await seedDecisionInspection(game.service);
    await blockExternalBrowserRequests(page);
    await page.goto(`http://127.0.0.1:${address.port}`);
    await enterGame(page);
    await page.getByRole('button', { name: 'Game', exact: true }).click();
    await page.getByRole('button', { name: 'Intelligence diagnostics', exact: true }).click();
    await page
      .locator('.ol-trace-row')
      .filter({ hasText: 'A difficult reply needed reconsideration.' })
      .click();
    await expect(
      page.getByText('The first model returned an unusable structured answer.', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Resolved by the fallback model', { exact: false })).toBeVisible();
    await expect(page.getByText('Cost of the whole decision', { exact: true })).toBeVisible();
    await expect(page.getByText('<$0.01 estimated charges;', { exact: false })).toBeVisible();
    const timingStage = page
      .locator('.ol-diagnostic-stage')
      .filter({ hasText: 'Stage ID: fixture-decision-inspection:provider-timing' });
    const heading = timingStage.locator(':scope > details > summary');
    // Enter the ordinary tab order, then return to the actual native summary.
    // The preview must follow that focus owner without an extra nested tab stop.
    await page.bringToFront();
    await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(true);
    await heading.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(heading).toBeFocused();
    await expect(page.getByRole('tooltip')).toContainText('Input');
    await expect(heading).toHaveAttribute('aria-describedby', /.+/);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toBeHidden();
    await heading.press('Enter');
    await expect(timingStage.locator(':scope > details')).toHaveAttribute('open', '');
    await heading.press('Space');
    await expect(timingStage.locator(':scope > details')).not.toHaveAttribute('open', '');
    await page.mouse.move(0, 0);
    await heading.hover();
    await expect(page.getByRole('tooltip')).toContainText('Input');
    await heading.click();
    await timingStage.locator('.ol-stage-technical > summary').click();
    for (const [label, value] of [
      ['Provider request', '40 ms'],
      ['Macrofold wait', '10 ms'],
      ['Macrofold execution', '90 ms'],
    ]) {
      await expect(timingStage.locator('dt').filter({ hasText: label }).first()).toBeVisible();
      await expect(timingStage.locator('dd').filter({ hasText: value }).first()).toBeVisible();
    }
    await page.screenshot({ path: info.outputPath('decision-inspector.png') });
  } finally {
    await page.close();
    await game.close();
  }
});
test('E36 keeps NPC waiting dots, failure details and a newer draft during reconsideration', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  let release: (() => void) | undefined;
  const requests: GenerateRequest[] = [];
  const fixtureReceipt = (id: string, provider: 'jev' | 'openai') => ({
    ...undispatchedReceipt(id, provider, Date.now()),
    dispatched: true,
    estimatedCostUsd: 0,
  });
  const client: AiClient = {
    judge: async (request) => ({
      outcome: 'invalid',
      reason: 'invalid_completed_answer',
      receipt: fixtureReceipt(request.requestId, 'jev'),
    }),
    generate: async <T>(request: GenerateRequest) => {
      requests.push(request);
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return {
        outcome: 'invalid' as const,
        reason: 'invalid_completed_answer',
        receipt: fixtureReceipt(request.requestId, 'openai'),
      };
    },
  };
  const game = await createGameServer({
    config: readConfig({
      TYPESAFE_API_KEY: 'fixture',
      OPENAI_API_KEY: 'fixture',
      AI_BUDGET_USD: '10',
      OPENAI_EMBEDDING_API_KEY: '',
      OPENAI_MODEL_PRICES_JSON: JSON.stringify([
        { model: DECISION_MODEL, prices: { inputUsdPerMillion: 0.1, outputUsdPerMillion: 0.5 } },
      ]),
      DECISION_ESCALATION_JSON: JSON.stringify({
        mode: 'apply',
        origins: ['jev/jev-1.13.0'],
        reasons: [...DECISION_REASONS],
      }),
    }),
    store: await testRepository(),
    production: true,
    aiClient: client,
    tick: false,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing listener.');
  try {
    await useNearCampSight(game.service);
    await page.goto(`http://127.0.0.1:${address.port}`);
    await enterGame(page);
    await page.getByRole('button', { name: 'Conversation', exact: true }).click();
    await page
      .getByRole('button', { name: /^Talk to / })
      .first()
      .click();
    const input = page.getByRole('textbox', { name: 'Your message', exact: true });
    await input.fill('Could we talk about the plan?');
    await input.press('Enter');
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]!.task).toBe('decision-escalation');
    await expect(page.getByRole('status', { name: 'Waiting for a reply' })).toBeVisible();
    await input.fill('Keep this newer unsent message.');
    release!();
    await expect(page.getByRole('status', { name: 'Waiting for a reply' })).toBeHidden();
    const failed = page.getByRole('button', {
      name: 'Failed: The AI answer could not be used.',
      exact: true,
    });
    await expect(failed).toBeVisible();
    await failed.hover();
    await expect(page.getByRole('tooltip')).toContainText('The AI answer could not be used.');
    await expect(input).toHaveValue('Keep this newer unsent message.');
    expect(requests).toHaveLength(1);
    await page.screenshot({ path: info.outputPath('npc-fallback-failure.png') });
  } finally {
    release?.();
    await page.close();
    await game.close();
  }
});
test.afterAll(closeTestDatabases);
