import type { GameView } from '@open-legend/protocol';
import { expect, test } from '@playwright/test';
import { blockExternalBrowserRequests, enterGame } from '../fixtures/browser.js';
import { browserTabHeaders, rustBrowserGame } from '../fixtures/rust-browser.js';

test('playable elevated world, mixed artwork, camera controls and exact surface picking', async ({
  page,
}, info) => {
  // Hosted software rendering spends ~18s on the two screenshots alone.
  // Bound the complete journey separately from its unchanged assertion deadlines.
  test.setTimeout(120_000);
  await blockExternalBrowserRequests(page);
  const game = await rustBrowserGame();
  const state = async (): Promise<GameView> => {
    const response = await page.request.get(game.base + '/api/state', {
      headers: await browserTabHeaders(page),
    });
    try {
      expect(response.ok()).toBe(true);
      return (await response.json()) as GameView;
    } finally {
      await response.dispose();
    }
  };
  const gameMenu = page.getByRole('button', { name: 'Game menu (Escape)', exact: true });
  const returnToWorld = page.getByRole('button', { name: 'Back to the world', exact: true });
  async function togglePause(name: 'Resume world' | 'Pause world') {
    if (!(await returnToWorld.isVisible())) await gameMenu.click();
    await page.getByRole('button', { name, exact: true }).click();
    await returnToWorld.click();
  }
  async function openCameraControls() {
    if (!(await returnToWorld.isVisible())) await gameMenu.click();
    await page.getByRole('button', { name: 'Settings & help', exact: true }).click();
    await page.getByRole('tab', { name: 'Camera & graphics', exact: true }).click();
  }
  const errors: string[] = [],
    paid: string[] = [],
    commands: unknown[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/\/api\/(chat|invent|inventions\/submit)$/.test(request.url())) paid.push(request.url());
    if (request.url().endsWith('/api/command')) commands.push(request.postDataJSON());
  });
  try {
    // Keep this exact-picking fixture independent of the ordinary starting zoom/pitch.
    // These are existing camera preferences, followed by the normal recenter control.
    const camera = { zoom: 12, pitch: 0.88, yaw: 0, perspectiveLocked: false };
    await page.addInitScript((camera) => {
      if (localStorage.getItem('open-legend:camera-v1') === null)
        localStorage.setItem('open-legend:camera-v1', JSON.stringify(camera));
    }, camera);
    await page.goto(game.base);
    await enterGame(page);
    const canvas = page.locator('#world');
    await expect(canvas).toHaveAttribute('data-ready', 'true');
    await openCameraControls();
    await page.getByRole('button', { name: 'Center on player', exact: true }).click();
    await expect(canvas).toHaveAttribute('data-camera-pitch', String(camera.pitch));
    await expect(canvas).toHaveAttribute('data-camera-yaw', '0');
    await page
      .getByRole('button', { name: /Hide .* panel/ })
      .filter({ visible: true })
      .click();
    await expect(page.getByLabel('Focus level', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('spatial-clearing.png') });
    if ((await state()).clock.paused) await togglePause('Resume world');
    await expect.poll(async () => (await state()).clock.paused).toBe(false);
    expect((await state()).access?.controlling).toBe(true);
    // Project a known public deck point through the explicitly established orthographic camera.
    // This clicks actual scene geometry, not a hidden test-only move endpoint.
    const rect = (await canvas.boundingBox())!;
    const scale = rect.height / (2 * camera.zoom);
    const focus = (await state()).player.position;
    // Pick the same authored deck away from the minimap overlay.
    const deck = { x: 21, y: 3, z: 6.5 };
    const point = {
      x: rect.width / 2 + (deck.x - focus.x) * scale,
      y:
        rect.height / 2 -
        ((deck.y - focus.y) * Math.cos(camera.pitch) +
          (focus.z - deck.z) * Math.sin(camera.pitch)) *
          scale,
    };
    const pickFallsOnCanvas = await canvas.evaluate((element, at) => {
      const bounds = element.getBoundingClientRect();
      return document.elementFromPoint(bounds.left + at.x, bounds.top + at.y) === element;
    }, point);
    expect(pickFallsOnCanvas).toBe(true);
    const [admitted] = await Promise.all([
      page.waitForResponse(
        (reply) =>
          new URL(reply.url()).pathname === '/api/command' &&
          reply.request().method() === 'POST' &&
          reply.request().postDataJSON()?.command?.type === 'move',
        { timeout: 15_000 },
      ),
      canvas.click({ position: point }),
    ]);
    expect(admitted.ok()).toBe(true);
    const receipt = (await admitted.json()) as { ok: boolean; actionId?: string };
    expect(receipt.ok).toBe(true);
    expect(receipt.actionId).toBeTruthy();
    await expect.poll(() => commands.length).toBe(1);
    expect(commands[0]).toMatchObject({
      command: { type: 'move', position: { surfaceId: 'lookout-deck' } },
    });
    await expect.poll(async () => (await state()).player.action?.id).toBe(receipt.actionId);
    await expect
      .poll(async () => (await state()).clock.preparingNavigation === true, { timeout: 15_000 })
      .toBe(false);
    await expect
      .poll(
        async () => {
          const { player } = await state();
          return (
            player.action === null &&
            player.supportSurfaceId === 'lookout-deck' &&
            Math.abs(player.position.y - deck.y) <= 0.05
          );
        },
        { timeout: 30_000 },
      )
      .toBe(true);
    await togglePause('Pause world');
    await openCameraControls();
    await page.getByRole('button', { name: 'Center on player', exact: true }).click();
    await page.getByRole('button', { name: 'Camera settings', exact: true }).click();
    await page.getByRole('button', { name: 'Rotate right', exact: true }).click();
    await expect(canvas).toHaveAttribute('data-camera-yaw', String(Math.PI / 4));
    await page.getByRole('button', { name: 'Perspective view', exact: true }).click();
    await expect(canvas).toHaveAttribute('data-projection', 'perspective');
    await page.getByRole('button', { name: 'Lock rotation', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Rotate right', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Lock rotation', exact: true }).click();
    await page
      .getByRole('button', { name: /Hide .* panel/ })
      .filter({ visible: true })
      .click();
    await canvas.focus();
    await page.keyboard.down('Alt');
    await expect(canvas).toHaveAttribute('data-revealing', 'true');
    expect(
      (await state()).map.spatial.surfaces.some((surface) => surface.id === 'lookout-deck'),
    ).toBe(true);
    await page.keyboard.up('Alt');
    await expect(canvas).toHaveAttribute('data-revealing', 'false');
    await page.screenshot({ path: info.outputPath('spatial-lookout-perspective.png') });
    const before = (await state()).player.position;
    await page.keyboard.down('Shift');
    await page.mouse.move(rect.x + rect.width * 0.5, rect.y + rect.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width * 0.5 + 80, rect.y + rect.height * 0.5 + 30, {
      steps: 5,
    });
    await page.mouse.up();
    await page.keyboard.up('Shift');
    expect(commands).toHaveLength(1);
    expect((await state()).player.position).toEqual(before);
    await page.reload();
    await enterGame(page);
    await expect(canvas).toHaveAttribute('data-ready', 'true');
    await expect(canvas).toHaveAttribute('data-projection', 'perspective');
    expect(errors).toEqual([]);
    expect(paid).toEqual([]);
  } finally {
    // Stop the browser's SSE/reconnect requests before closing its fixture server.
    await page.close();
    await game.close();
  }
});
