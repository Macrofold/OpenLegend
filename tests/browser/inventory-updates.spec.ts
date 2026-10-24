import { stockedCamp } from '../fixtures/world.js';
import { test, expect } from '@playwright/test';
import { NPC_ID, entityGet, inventoryFor, executeCommand } from '@open-legend/domain';
import { createGameServer } from '../../apps/server/src/http.js';
import { draftWorld } from '../../packages/domain/src/draft.js';
import { finish, outcome } from '../../packages/domain/src/events.js';
import {
  setSpatialPosition,
  worldPosition,
  worldSupport,
} from '../../packages/domain/src/spatial-state.js';
import { enterGame } from '../fixtures/browser.js';
import { testRepository, readConfig, closeTestDatabases } from '../fixtures/database.js';

test('inventory keeps its search and focus during unrelated motion and refreshes a changed carried lot', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const now = Date.now();
  const game = await createGameServer({
    config: readConfig({ AI_BUDGET_USD: '0' }),
    // This inventory-refresh fixture requires actual carried stock; Main starts empty.
    store: await testRepository(undefined, stockedCamp()),
    production: true,
    tick: false,
    now: () => now,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing listener');
  const errors: string[] = [];
  const queries: string[] = [];
  let reads = 0;
  let receivedRevision = -1;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    const revision = /^fixture-view-revision (\d+)$/.exec(message.text());
    if (revision) receivedRevision = Number(revision[1]);
  });
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/inventory') {
      reads++;
      queries.push(request.postDataJSON().query ?? '');
    }
  });
  await page.addInitScript(() => {
    // Observe real delivered revisions without introducing a presentation store.
    const Original = window.EventSource;
    window.EventSource = class extends Original {
      constructor(url: string | URL, options?: EventSourceInit) {
        super(url, options);
        const record = (event: Event) => {
          console.debug('fixture-view-revision', JSON.parse((event as MessageEvent).data).revision);
        };
        this.addEventListener('patch', record);
        this.addEventListener('reset', record);
      }
    };
  });
  try {
    await page.goto(`http://127.0.0.1:${address.port}`);
    await enterGame(page);
    await page.locator('.ol-rail').getByRole('button', { name: 'Inventory', exact: true }).click();
    const panel = page.locator('#inventoryPanel');
    const search = panel.getByRole('textbox', { name: /^Search / }).first();
    await expect(search).toBeVisible();
    await search.fill('fiber');
    await expect.poll(() => queries).toContain('fiber');
    await expect(panel.locator('.ol-inventory-collection[aria-busy="true"]')).toHaveCount(0);
    const initialReads = reads;
    const position = worldPosition(entityGet(game.service.world.entities, NPC_ID)!);
    for (let index = 0; index < 20; index++) {
      const result = await game.service.transition((current) => {
        const world = draftWorld(current);
        const resident = entityGet(world.entities, NPC_ID)!;
        // Controlled authored fixture motion exercises the real mutation and
        // public delivery owners; no autonomous behavior is claimed here.
        setSpatialPosition(
          world,
          resident,
          { ...position, x: position.x + (index % 2 ? 0.02 : -0.02) },
          worldSupport(resident),
        );
        return finish(world, [], outcome(true, 'fixture-motion', 'Moved the diagnostic resident.'));
      });
      expect(result.ok, result.message).toBe(true);
      const revision = game.service.version;
      await expect
        .poll(() => receivedRevision, {
          message: `Deliver resident update ${index + 1}, revision ${revision}`,
        })
        .toBeGreaterThanOrEqual(revision);
    }
    await expect(search).toHaveValue('fiber');
    await expect(search).toBeFocused();
    expect(reads).toBe(initialReads);
    const item = inventoryFor(game.service.world, game.service.controlledEntityId).find(
      (item) => item.definitionId === 'prepared_fiber' && item.quantity > 1,
    )!;
    expect(item).toBeDefined();
    const changed = await game.service.transition((world) =>
      executeCommand(world, {
        type: 'drop',
        id: 'fixture-external-drop',
        actorId: game.service.controlledEntityId,
        itemId: item.id,
        quantity: 1,
      }),
    );
    expect(changed.ok, changed.message).toBe(true);
    await expect.poll(() => reads).toBeGreaterThan(initialReads);
    await expect(panel.locator(`button[data-item-id="${item.id}"]`)).toHaveAttribute(
      'aria-label',
      new RegExp(`, ${item.quantity - 1}(?:,|$)`),
    );
    await expect(search).toHaveValue('fiber');
    expect(errors).toEqual([]);
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    await page.close();
    await game.close();
  }
});
test.afterAll(closeTestDatabases);
