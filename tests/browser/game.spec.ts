import { allItems } from '@open-legend/domain';
import { worldPosition } from '@open-legend/domain';
import { test, expect } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import { readConfig } from '../../apps/server/src/config.js';
import { SqliteStore } from '../../apps/server/src/store.js';

test('native wilderness is visible, playable, saved and honestly reports absent AI', async ({
  page,
}, info) => {
  // Independent world, no credentials and a zero spending cap: this is a UI/native test.
  const game = await createGameServer({
    config: readConfig({}),
    store: new SqliteStore(':memory:'),
    production: true,
  });
  await new Promise<void>((resolve, reject) => {
    game.server.once('error', reject);
    game.server.listen(0, '127.0.0.1', resolve);
  });
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing listener');
  const errors: string[] = [];
  const aiRequests: string[] = [];
  const commandRequests: unknown[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/\/api\/(chat|invent)$/.test(request.url())) aiRequests.push(request.url());
    if (/\/api\/command$/.test(request.url())) commandRequests.push(request.postDataJSON());
  });
  try {
    // Reproduce a disconnected tab whose heartbeat has not reached the server.
    // Resume must reconnect immediately, without waiting for the next heartbeat.
    await page.route('**/api/presence', (route) => route.fulfill({ json: { ok: true } }));
    await page.goto(`http://127.0.0.1:${address.port}`);
    await expect(page.getByRole('heading', { name: 'OPEN LEGEND', exact: true })).toBeVisible();
    await expect(page.locator('#loading')).toBeHidden();
    await expect(page.locator('#world')).toBeVisible();
    expect(
      await page
        .locator('#world')
        .evaluate((canvas) => !!(canvas as HTMLCanvasElement).getContext('webgl2')),
    ).toBe(true);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('#toast')).not.toContainText('scene could not start');
    await expect(page.getByRole('button', { name: 'Resume world', exact: true })).toBeEnabled();
    const absentTime = game.service.world.simTime;
    await page.getByRole('button', { name: 'Resume world', exact: true }).click();
    await expect.poll(() => game.service.world.simTime).toBeGreaterThan(absentTime);
    await page.unroute('**/api/presence');
    await expect(page.getByRole('button', { name: 'Pause world', exact: true })).toBeEnabled();
    await expect(page.locator('#aiLabel')).toHaveText('AI needs setup');
    await page.getByRole('button', { name: 'Talk to Ada', exact: true }).click();
    await expect(page.locator('#sendMessage')).toBeEnabled();
    await expect(page.locator('#composerReadiness')).toContainText('Talk and invention need Jev');
    await page.getByRole('button', { name: 'Hide Conversation panel' }).click();
    await page.screenshot({ path: info.outputPath('wilderness.png') });

    // These points are on the visible sprites in the seeded 1440×960 scene.
    // The reeds point is above the old head/foot approximation's hit region.
    const reedsPoint = { x: 480, y: 398 };
    await page.locator('#world').click({ button: 'right', position: reedsPoint });
    await expect(page.locator('#contextTitle')).toHaveText('River reeds');
    await expect(
      page.locator('#contextMenu').getByRole('button', { name: /^Gather River reeds/ }),
    ).toBeEnabled();
    expect(commandRequests).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.locator('#contextMenu')).toBeHidden();

    // macOS/webviews can report a native context gesture without a secondary
    // pointerup. Primary Control-click must not send a move, either.
    await page.locator('#world').click({ position: reedsPoint, modifiers: ['Control'] });
    // Construct a MouseEvent explicitly: some browser transports dispatch an
    // untyped Event for contextmenu and drop its client coordinates.
    await page.locator('#world').evaluate((canvas, point) => {
      canvas.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: point.x,
          clientY: point.y,
          button: 0,
          ctrlKey: true,
        }),
      );
    }, reedsPoint);
    await expect(page.locator('#contextTitle')).toHaveText('River reeds');
    expect(commandRequests).toEqual([]);
    await page.keyboard.press('Escape');

    await page.locator('#world').click({ button: 'right', position: { x: 720, y: 378 } });
    await expect(page.locator('#contextTitle')).toHaveText('Banked campfire');
    await expect(
      page.locator('#contextMenu').getByRole('button', { name: /^Walk here/ }),
    ).toBeEnabled();
    await expect(
      page
        .locator('#contextMenu')
        .getByRole('button', { name: /^Talk to Ada|^Twist cord|^Gather/ }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');

    // An explicit native fixture move puts Ada in front of the grass sprite.
    // Her upper body overlaps the grass's center: foreground depth must win.
    expect(
      (
        await game.service.command(
          'fixture-overlapping-sprites',
          {
            type: 'move',
            position: { y: 0, surfaceId: 'terrain', x: 19, z: 13 },
          },
          'ada',
        )
      ).ok,
    ).toBe(true);
    await expect
      .poll(() => {
        const position = worldPosition(game.service.world.entities['ada']!);
        return Math.hypot(position.x - 19, position.z - 13);
      })
      .toBeLessThan(0.1);
    await page.getByRole('button', { name: 'Pause world', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Resume world', exact: true })).toBeVisible();
    await page.locator('#world').click({ button: 'right', position: { x: 1040, y: 450 } });
    await expect(page.locator('#contextTitle')).toHaveText('Ada');
    await page
      .locator('#contextMenu')
      .getByRole('button', { name: /^Talk to Ada/ })
      .click();
    await expect(page.locator('#message')).toBeFocused();
    await expect(page.locator('#contextMenu')).toBeHidden();
    await page.getByRole('button', { name: 'Resume world', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause world', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Hide Conversation panel' }).click();
    const initialPosition = { ...worldPosition(game.service.world.entities['player']!) };
    await page.locator('#world').click({ position: { x: 800, y: 580 } });
    await expect
      .poll(() => {
        const current = worldPosition(game.service.world.entities['player']!);
        return Math.hypot(current.x - initialPosition.x, current.z - initialPosition.z);
      })
      .toBeGreaterThan(0.25);
    // At 60:1, the short walk can finish between checking Stop and clicking it.
    // Wait for arrival instead of racing a control that correctly becomes disabled.
    await expect.poll(() => game.service.world.entities['player']!.actor!.action).toBeNull();

    await page.getByRole('button', { name: 'Inventory', exact: true }).click();
    await page.locator('#world').click({ button: 'right', position: reedsPoint });
    await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
    await expect(page.locator('#contextTitle')).toHaveText('River reeds');
    const gather = page
      .locator('#contextMenu')
      .getByRole('button', { name: /^Gather River reeds/ });
    // A state update between press and release must not replace the button and
    // swallow the click. This also exercises a real native action from the menu.
    const gatherBounds = await gather.boundingBox();
    if (!gatherBounds) throw new Error('Missing context action');
    await page.mouse.move(
      gatherBounds.x + gatherBounds.width / 2,
      gatherBounds.y + gatherBounds.height / 2,
    );
    await page.mouse.down();
    await page.waitForTimeout(500);
    await page.mouse.up();
    await expect(page.locator('#contextMenu')).toBeHidden();
    await expect
      .poll(
        () =>
          allItems(game.service.world).some(
            (item) => item.ownerId === 'player' && item.definitionId === 'raw_fiber',
          ),
        { timeout: 10_000 },
      )
      .toBe(true);
    await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
    await expect(page.getByText('Reed fibers', { exact: true })).toBeVisible();
    await expect(
      page
        .locator('#inventoryPanel .ol-row')
        .filter({ hasText: 'Reed fibers' })
        .locator('.ol-row-count'),
    ).toHaveText('2');
    await page.getByRole('button', { name: 'Pause world', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Resume world', exact: true })).toBeVisible();
    const pausedTime = game.service.world.simTime;
    await page.waitForTimeout(500);
    expect(game.service.world.simTime).toBe(pausedTime);
    await page
      .locator('.ol-radio')
      .filter({ has: page.getByRole('radio', { name: '3×', exact: true }) })
      .click();
    await expect.poll(() => game.service.speed).toBe(3);
    // Ada was moved beyond hearing earlier; reopen the saved composer through Crafting.
    await page.getByRole('button', { name: 'Crafting', exact: true }).click();
    await page.getByRole('button', { name: 'Invent a tool', exact: true }).click();
    await page
      .locator('.ol-radio')
      .filter({ has: page.getByRole('radio', { name: 'Talk', exact: true }) })
      .click();
    await page.locator('#message').fill('Ada, what do you remember about this clearing?');
    await page.locator('#message').press('Enter');
    await expect(page.getByRole('heading', { name: 'AI & allowance' })).toBeVisible();
    await expect(page.locator('#message')).toHaveValue(
      'Ada, what do you remember about this clearing?',
    );
    expect(aiRequests).toEqual([]);
    await page.getByRole('button', { name: 'Hide AI & allowance panel' }).click();
    await page
      .locator('.ol-radio')
      .filter({ has: page.getByRole('radio', { name: 'Invent something' }) })
      .click();
    await page.locator('#message').fill('Weave a sling from the cord and prepared fibers.');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Resume world', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Crafting', exact: true }).click();
    await page.getByRole('button', { name: 'Invent a tool', exact: true }).click();
    await expect(page.locator('#message')).toHaveValue(
      'Weave a sling from the cord and prepared fibers.',
    );
    await expect(page.getByRole('radio', { name: 'Invent something' })).toBeChecked();
    await expect(page.locator('#aiPanel')).toBeHidden();
    expect(game.service.world.simTime).toBe(pausedTime);
    await page.getByRole('button', { name: 'Resume world', exact: true }).click();
    await expect.poll(() => game.service.world.simTime).toBeGreaterThan(pausedTime);
    await page.locator('#aiLabel').click();
    await expect(page.getByText('unconfigured', { exact: true })).toBeVisible();
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
    expect(aiRequests).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
});
