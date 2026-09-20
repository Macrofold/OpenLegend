import { test, expect } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import { readConfig } from '../../apps/server/src/config.js';
import { SqliteStore } from '../../apps/server/src/store.js';

test('React god diagnostics retain private stage detail, paging and new-activity controls without inference', async ({
  page,
}, info) => {
  const store = new SqliteStore(':memory:');
  const game = await createGameServer({
    config: readConfig({ OPEN_LEGEND_GOD_MODE: 'true' }),
    store,
    production: true,
    tick: false,
  });
  const root = (n: number) => ({
    id: `fixture-root-${n}`,
    worldId: game.service.world.id,
    actorId: 'ada',
    actorName: 'Ada',
    trigger: `Fixture trigger ${n}`,
    kind: 'trigger',
    route: 'level2',
    startedAt: new Date(Date.UTC(2026, 8, 20, 12, 0, n)).toISOString(),
    status: 'completed' as const,
    input: { evidence: 'private-fixture-evidence' },
    exchanges: [],
  });
  for (let n = 1; n <= 26; n++) store.putIntelligenceCall(root(n));
  store.putIntelligenceCall({
    id: 'fixture-context',
    parentId: 'fixture-root-26',
    kind: 'Context and retrieval',
    status: 'completed',
    startedAt: root(26).startedAt,
    input: {
      selection: {
        query: 'trap nearby\nMy current goal: Stay safe',
        embedding: {
          model: 'text-embedding-3-small',
          storage: 'pgvector',
          table: 'recall_vectors',
          search: 'database exact top-24',
        },
        candidates: [
          {
            id: 'memory-warning',
            kind: 'memory',
            text: 'Mike warned me that the path may be trapped.',
            score: 0.91,
            selected: true,
          },
          {
            id: 'memory-rabbit',
            kind: 'memory',
            text: 'I saw a rabbit near the river.',
            score: 0.42,
            selected: false,
          },
        ],
      },
    },
    output: { stimulus: 'The nearby speaker said to me: “It seems like a trap.”' },
    exchanges: [],
  });
  store.putIntelligenceCall({
    id: 'fixture-embedding',
    parentId: 'fixture-root-26',
    kind: 'Embeddings',
    status: 'completed',
    startedAt: root(26).startedAt,
    input: { texts: ['trap nearby\nMy current goal: Stay safe'] },
    output: {
      receipt: {
        requestId: 'fixture-no-request',
        latencyMs: 802,
        estimatedCostUsd: 0.001,
        usage: { inputTokens: 351, outputTokens: 46 },
      },
    },
    exchanges: [
      {
        path: '/v1/embeddings',
        method: 'POST',
        startedAt: root(26).startedAt,
        input: { private: 'private-fixture-evidence' },
        output: { data: [{ embedding: { dimensions: 512 } }] },
        httpStatus: 200,
      },
    ],
  });
  store.putIntelligenceCall({
    id: 'fixture-jev',
    parentId: 'fixture-root-26',
    kind: 'Jev',
    status: 'completed',
    startedAt: root(26).startedAt,
    input: {
      state: { stimulus: 'The nearby speaker said to me: “It seems like a trap.”' },
      questions: {
        route: {
          type: 'choice',
          instructions: 'Choose how deeply Ada should consider the warning.',
          criteria: { native: 'Use native behavior.', level2: 'Give a short informed response.' },
        },
      },
    },
    output: {
      outcome: 'value',
      value: {
        answers: {
          route: {
            type: 'choice',
            choice: 'level2',
            probabilities: { native: 0.08, level2: 0.92 },
            confidence: 0.88,
          },
        },
      },
    },
    exchanges: [],
  });
  store.putIntelligenceCall({
    id: 'fixture-speech',
    parentId: 'fixture-root-26',
    kind: 'Speech admission',
    status: 'completed',
    startedAt: root(26).startedAt,
    input: { proposed: { speech: 'I agree. Let’s keep our distance and look for another way.' } },
    output: { ok: true, message: 'Ada replied to Mike.' },
    exchanges: [],
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw Error('No listener');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(`http://127.0.0.1:${address.port}`);
    await page.getByRole('button', { name: 'Intelligence', exact: true }).click();
    const panel = page.locator('#intelligencePanel');
    await expect(panel.locator('.ol-trace')).toHaveCount(25);
    await panel.locator('.ol-trace').first().getByRole('button').click();
    await expect(panel.getByRole('heading', { name: 'Ada request', exact: true })).toBeVisible();
    await expect(
      panel.getByRole('button', { name: 'Back to Intelligence', exact: true }),
    ).toBeVisible();
    await expect(panel).toContainText('351 in / 46 out');
    await expect(panel).toContainText('802 ms');
    await expect(panel).toContainText('I agree. Let’s keep our distance');
    await expect(panel).toContainText('Choose how deeply Ada should consider the warning.');
    await expect(panel).toContainText('level2');
    await expect(panel).toContainText('trap nearby');
    await expect(panel).toContainText('recall_vectors');
    await expect(panel).toContainText('Mike warned me that the path may be trapped.');
    await expect(panel.locator('pre')).toHaveCount(0);
    const embedding = panel.locator('.ol-diagnostic-stage').filter({ hasText: 'Embeddings' });
    await expect(embedding).not.toContainText('Show provider request / response');
    await embedding
      .getByRole('button', { name: 'Show Embeddings request and response JSON', exact: true })
      .click();
    const raw = page.getByRole('complementary', {
      name: 'Embeddings · request and response JSON',
    });
    await expect(raw).toBeVisible();
    await expect(raw.getByRole('button', { name: 'Copy JSON', exact: true })).toBeVisible();
    await expect(raw.locator('pre')).toContainText('fixture-no-request');
    await expect(raw.locator('pre')).toContainText('/v1/embeddings');
    await raw.getByRole('button', { name: 'Close JSON panel', exact: true }).click();
    await panel.getByRole('button', { name: 'Back to Intelligence', exact: true }).click();
    await expect(panel.getByRole('heading', { name: 'Intelligence', exact: true })).toBeVisible();
    await panel.getByText('Filter triggers', { exact: true }).click();
    await expect(panel.locator('.ol-filter-grid input')).toHaveCount(7);
    await panel.getByLabel('search', { exact: true }).fill('Fixture trigger 26');
    await expect(panel.locator('.ol-trace')).toHaveCount(1);
    await panel.getByLabel('search', { exact: true }).fill('');
    await expect(panel.locator('.ol-trace')).toHaveCount(25);
    await panel.getByRole('button', { name: 'Older', exact: true }).click();
    await expect(panel.locator('.ol-trace')).toHaveCount(1);
    await panel.getByRole('button', { name: 'Newer', exact: true }).click();
    await expect(panel.locator('.ol-trace')).toHaveCount(25);
    store.putIntelligenceCall(root(27));
    await panel.getByRole('button', { name: 'New activity · show newest', exact: true }).click();
    await expect(panel.locator('.ol-trace').first()).toContainText('Fixture trigger 27');
    await page.screenshot({ path: info.outputPath('diagnostics.png') });
    const publicState = await page.request.get(`http://127.0.0.1:${address.port}/api/state`);
    expect(await publicState.text()).not.toContain('private-fixture-evidence');
    expect((await store.usage(0)).usage.llmCalls).toBe(0);
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
});
