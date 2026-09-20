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
    id: 'fixture-stage',
    parentId: 'fixture-root-26',
    kind: 'speech',
    status: 'completed',
    startedAt: root(26).startedAt,
    input: { private: 'private-fixture-evidence' },
    output: {
      receipt: {
        requestId: 'fixture-no-request',
        latencyMs: 802,
        estimatedCostUsd: 0.001,
        usage: { inputTokens: 351, outputTokens: 46 },
      },
    },
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
    await panel.locator('.ol-trace > summary').first().click();
    await expect(panel).toContainText('351 in / 46 out');
    await expect(panel).toContainText('802 ms');
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
    expect(store.usage(0).usage.llmCalls).toBe(0);
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
});
