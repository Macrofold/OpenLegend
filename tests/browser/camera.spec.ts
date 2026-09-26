import { test, expect } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import { readConfig } from '../../apps/server/src/config.js';
import { SqliteStore } from '../../apps/server/src/store.js';

test('right drag pans without actions, while right click and canceled gestures stay distinct', async ({
  page,
}) => {
  // Native UI fixture: independent save, no provider keys, zero spending allowance.
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
  const commands: unknown[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/\/api\/command$/.test(request.url())) commands.push(request.postDataJSON());
  });
  const canvas = page.locator('#world');
  const menu = page.locator('#contextMenu');
  const reeds = { x: 480, y: 398 };
  const pannedReeds = { x: 570, y: 458 };
  const contextEvent = (point: { x: number; y: number }) =>
    canvas.evaluate((element, point) => {
      element.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: point.x,
          clientY: point.y,
          button: 2,
        }),
      );
    }, point);
  try {
    await page.goto(`http://127.0.0.1:${address.port}`);
    await expect(canvas).toHaveAttribute('data-ready', 'true');
    if (await page.getByRole('button', { name: 'Pause world', exact: true }).isVisible())
      await page.getByRole('button', { name: 'Pause world', exact: true }).click();

    await page.mouse.move(reeds.x, reeds.y);
    await page.mouse.down({ button: 'right' });
    // Explicit event-order fixture for platforms that open context menus on press.
    await contextEvent(reeds);
    await expect(menu).toBeHidden();
    await page.mouse.move(pannedReeds.x, pannedReeds.y, { steps: 12 });
    await expect(canvas).toHaveCSS('cursor', 'grabbing');
    await page.mouse.up({ button: 'right' });
    // Also exercise a release-time contextmenu, independent of Chromium's ordering.
    await contextEvent(pannedReeds);
    await expect(menu).toBeHidden();
    await expect(canvas).not.toHaveCSS('cursor', 'grabbing');

    // The actual rendered/picked resource follows the pan in both axes. Merely
    // toggling a cursor or suppressing the menu cannot satisfy this assertion.
    await canvas.click({ button: 'right', position: pannedReeds });
    await expect(page.locator('#contextTitle')).toHaveText('River reeds');
    await page.keyboard.press('Escape');

    // Small hand jitter is a click, and a stationary press waits for release.
    await page.mouse.move(pannedReeds.x, pannedReeds.y);
    await page.mouse.down({ button: 'right' });
    await expect(menu).toBeHidden();
    await page.mouse.move(pannedReeds.x + 2, pannedReeds.y + 1);
    await page.mouse.up({ button: 'right' });
    await expect(page.locator('#contextTitle')).toHaveText('River reeds');
    await page.keyboard.press('Escape');

    // Losing capture, canceling a pointer or losing focus must release the pan,
    // swallow its late contextmenu, and leave the next ordinary right-click usable.
    for (const reason of ['pointercancel', 'lostpointercapture', 'blur'] as const) {
      await canvas.evaluate((element) => {
        element.addEventListener(
          'pointerdown',
          (event) => {
            element.setAttribute('data-test-pointer', String((event as PointerEvent).pointerId));
          },
          { once: true },
        );
      });
      await page.mouse.move(pannedReeds.x, pannedReeds.y);
      await page.mouse.down({ button: 'right' });
      // Activate pending pointer capture without exceeding the drag threshold.
      await page.mouse.move(pannedReeds.x + 1, pannedReeds.y);
      await canvas.evaluate((element, reason) => {
        const pointerId = Number(element.getAttribute('data-test-pointer'));
        element.removeAttribute('data-test-pointer');
        if (reason === 'blur') window.dispatchEvent(new Event('blur'));
        else if (reason === 'lostpointercapture') element.releasePointerCapture(pointerId);
        else element.dispatchEvent(new PointerEvent('pointercancel', { pointerId }));
      }, reason);
      await page.mouse.move(pannedReeds.x + 80, pannedReeds.y, { steps: 4 });
      await page.mouse.up({ button: 'right' });
      await contextEvent({ x: pannedReeds.x + 80, y: pannedReeds.y });
      await expect(menu).toBeHidden();
      await expect(canvas).not.toHaveCSS('cursor', 'grabbing');
      await canvas.click({ button: 'right', position: pannedReeds });
      await expect(page.locator('#contextTitle')).toHaveText('River reeds');
      await page.keyboard.press('Escape');
    }

    // Capture keeps panning over the notebook overlay. Returning to the press
    // point is still a drag, for both the new gesture and existing alternatives.
    for (const gesture of ['right', 'middle', 'space'] as const) {
      await page.mouse.move(pannedReeds.x, pannedReeds.y);
      if (gesture === 'space') await page.keyboard.down('Space');
      const button = gesture === 'space' ? 'left' : gesture;
      await page.mouse.down({ button });
      await page.mouse.move(180, pannedReeds.y, { steps: 6 });
      await expect(canvas).toHaveCSS('cursor', 'grabbing');
      await page.mouse.move(pannedReeds.x, pannedReeds.y, { steps: 6 });
      await page.mouse.up({ button });
      if (gesture === 'space') await page.keyboard.up('Space');
      await expect(menu).toBeHidden();
      await expect(canvas).not.toHaveCSS('cursor', 'grabbing');
      await canvas.click({ button: 'right', position: pannedReeds });
      await expect(page.locator('#contextTitle')).toHaveText('River reeds');
      await page.keyboard.press('Escape');
    }

    expect(commands).toEqual([]);
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
});
