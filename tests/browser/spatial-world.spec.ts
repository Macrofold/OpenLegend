import { test, expect } from '@playwright/test';
import { advanceWorld } from '../../packages/domain/src/index.js';
import { createGameServer } from '../../apps/server/src/http.js';
import { readConfig } from '../../apps/server/src/config.js';
import { SqliteStore } from '../../apps/server/src/store.js';

test('playable elevated world, mixed artwork, camera controls and exact surface picking', async ({
  page,
}, info) => {
  const game = await createGameServer({
    config: readConfig({ AI_BUDGET_USD: '0' }),
    store: new SqliteStore(':memory:'),
    production: true,
    tick: false,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing address');
  const errors: string[] = [],
    paid: string[] = [],
    commands: unknown[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/\/api\/(chat|invent|inventions\/submit)$/.test(request.url())) paid.push(request.url());
    if (request.url().endsWith('/api/command')) commands.push(request.postDataJSON());
  });
  try {
    await page.goto(`http://127.0.0.1:${address.port}`);
    const canvas = page.locator('#world');
    await expect(canvas).toHaveAttribute('data-ready', 'true');
    await expect(canvas).toHaveAttribute('data-floor', 'all');
    await page.screenshot({ path: info.outputPath('spatial-clearing.png') });
    await page.getByRole('button', { name: 'Resume world', exact: true }).click();
    // Project a known public deck point through the default orthographic camera.
    // This clicks actual scene geometry, not a hidden test-only move endpoint.
    const rect = (await canvas.boundingBox())!;
    const scale = rect.height / 24;
    const point = {
      x: rect.width / 2 + (24 - 11) * scale,
      y: rect.height / 2 - (3 * Math.cos(0.88) + 6 * Math.sin(0.88)) * scale,
    };
    await canvas.click({ position: point });
    await expect.poll(() => commands.length).toBe(1);
    expect(commands[0]).toMatchObject({
      command: { type: 'move', position: { surfaceId: 'lookout-deck' } },
    });
    await expect
      .poll(() => game.service.world.entities[game.service.controlledEntityId]!.actor!.action?.type)
      .toBe('move');
    await game.service.transition((world) => advanceWorld(world, 280));
    await expect
      .poll(() => game.service.world.entities[game.service.controlledEntityId]!.position.y)
      .toBeCloseTo(3);
    await page.getByRole('button', { name: 'Pause world', exact: true }).click();
    await page.getByRole('button', { name: 'Recenter camera', exact: true }).click();
    await page.getByLabel('Camera options', { exact: true }).click();
    await page.getByRole('button', { name: 'Rotate camera right', exact: true }).click();
    await expect(canvas).toHaveAttribute('data-camera-yaw', String(Math.PI / 4));
    await page.getByRole('button', { name: 'Toggle camera projection', exact: true }).click();
    await expect(canvas).toHaveAttribute('data-projection', 'perspective');
    await page.getByLabel('Focus level', { exact: true }).selectOption('ground');
    await expect(canvas).toHaveAttribute('data-floor', 'ground');
    expect(
      game.service.world.map.spatial.surfaces.some((surface) => surface.id === 'lookout-deck'),
    ).toBe(true);
    await page.getByLabel('Focus level', { exact: true }).selectOption('');
    await page.getByRole('button', { name: 'Toggle camera rotation lock', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Rotate camera right', exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: 'Toggle camera rotation lock', exact: true }).click();
    await page.getByLabel('Camera options', { exact: true }).click();
    await page.screenshot({ path: info.outputPath('spatial-lookout-perspective.png') });
    const before = JSON.stringify(
      game.service.world.entities[game.service.controlledEntityId]!.position,
    );
    await page.keyboard.down('Shift');
    await page.mouse.move(rect.x + rect.width * 0.5, rect.y + rect.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width * 0.5 + 80, rect.y + rect.height * 0.5 + 30, {
      steps: 5,
    });
    await page.mouse.up();
    await page.keyboard.up('Shift');
    expect(commands).toHaveLength(1);
    expect(
      JSON.stringify(game.service.world.entities[game.service.controlledEntityId]!.position),
    ).toBe(before);
    await page.reload();
    await expect(canvas).toHaveAttribute('data-ready', 'true');
    await expect(canvas).toHaveAttribute('data-projection', 'perspective');
    expect(errors).toEqual([]);
    expect(paid).toEqual([]);
  } finally {
    await game.close();
  }
});
