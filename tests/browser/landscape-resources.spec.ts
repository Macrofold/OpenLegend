import { test, expect } from '@playwright/test';
import { enterGame, lookoutDeckPoint } from '../fixtures/browser.js';
import { stockedCamp } from '../fixtures/world.js';
import { entityGet, worldPosition } from '@open-legend/domain';
import { testRepository, closeTestDatabases, readConfig } from '../fixtures/database.js';
import { createGameServer } from '../../apps/server/src/http.js';
import { draftWorld } from '../../packages/domain/src/draft.js';
import { finish, outcome } from '../../packages/domain/src/events.js';
import type { SpatialLayout } from '@open-legend/spatial';

test('local landscape edits retain terrain and release replaced structural and scenery resources', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const now = Date.now();
  const game = await createGameServer({
    config: readConfig({ AI_BUDGET_USD: '0' }),
    store: await testRepository(),
    production: true,
    tick: false,
    now: () => now,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing listener');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const canvas = page.locator('#world');
  const edit = async (change: (layout: SpatialLayout) => void) => {
    const result = await game.service.transition((current) => {
      const world = draftWorld(current);
      change(world.map.spatial);
      world.map.spatial.revision++;
      return finish(world, [], outcome(true, 'fixture-layout', 'Changed diagnostic layout.'));
    });
    expect(result.ok, result.message).toBe(true);
  };
  try {
    // Resource-count attributes are capture diagnostics, so this fixture explicitly opts in.
    await page.goto(`http://127.0.0.1:${address.port}/?profile=1`);
    await enterGame(page);
    await expect(canvas).toHaveAttribute('data-ready', 'true');
    // The fixture has no host ticks. Keep command admission active while making
    // exact layout transitions; pausing would correctly refuse these writes.
    const builds = await canvas.getAttribute('data-landscape-build-count');
    const resources = Number(await canvas.getAttribute('data-landscape-resource-count'));
    let previousBuilds = Number(await canvas.getAttribute('data-landscape-resource-build-count'));
    const support = structuredClone(
      game.service.world.map.spatial.surfaces.find((surface) => !surface.terrain)!,
    );
    support.id = 'fixture:local-deck';
    support.minX += 1;
    support.maxX += 1;
    const added = async () => {
      await expect(canvas).toHaveAttribute('data-landscape-resource-count', String(resources + 1));
      await expect(canvas).toHaveAttribute('data-landscape-build-count', builds!);
    };
    await edit((layout) => layout.surfaces.push(support));
    await added();
    await edit((layout) => {
      layout.surfaces.find((surface) => surface.id === support.id)!.maxX += 0.25;
    });
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-landscape-resource-build-count')))
      .toBeGreaterThan(previousBuilds + 1);
    await added();
    const scenery = game.service.world.map.spatial.scenery?.[0];
    if (!scenery) throw new Error('Fixture requires static scenery');
    await edit((layout) => {
      layout.scenery![0]!.width += 0.1;
    });
    await expect(canvas).toHaveAttribute('data-landscape-build-count', builds!);
    await page.screenshot({ path: info.outputPath('local-deck-and-scenery.png') });
    await edit((layout) => {
      layout.surfaces = layout.surfaces.filter((surface) => surface.id !== support.id);
    });
    await expect(canvas).toHaveAttribute('data-landscape-resource-count', String(resources));
    // Repeated construction/removal must return to the same retained resource count.
    previousBuilds = Number(await canvas.getAttribute('data-landscape-resource-build-count'));
    for (let i = 0; i < 10; i++) {
      await edit((layout) => layout.surfaces.push(support));
      await added();
      await edit((layout) => {
        layout.surfaces = layout.surfaces.filter((surface) => surface.id !== support.id);
      });
      await expect(canvas).toHaveAttribute('data-landscape-resource-count', String(resources));
    }
    expect(Number(await canvas.getAttribute('data-landscape-resource-build-count'))).toBe(
      previousBuilds + 10,
    );
    await expect(canvas).toHaveAttribute('data-landscape-build-count', builds!);
    expect(errors).toEqual([]);
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    await page.close();
    await game.close();
  }
});

test('edited landscape recovers its graphics context, drawing, picking and camera', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const now = Date.now();
  const game = await createGameServer({
    config: readConfig({ AI_BUDGET_USD: '0' }),
    store: await testRepository(undefined, stockedCamp()),
    production: true,
    tick: false,
    now: () => now,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing listener');
  const errors: string[] = [],
    commands: unknown[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().endsWith('/api/command')) commands.push(request.postDataJSON());
  });
  const canvas = page.locator('#world');
  const edit = async () => {
    const result = await game.service.transition((current) => {
      const world = draftWorld(current);
      world.map.spatial.scenery![0]!.width += 0.1;
      world.map.spatial.revision++;
      return finish(world, [], outcome(true, 'fixture-layout', 'Changed diagnostic scenery.'));
    });
    expect(result.ok, result.message).toBe(true);
  };
  try {
    // The existing profile hook proves post-render submissions resume; no timed
    // capacity workload or FPS claim is made by this functional scenario.
    await page.goto(`http://127.0.0.1:${address.port}/?profile=1`);
    await enterGame(page);
    const resources = await canvas.getAttribute('data-landscape-resource-count');
    const terrainBuilds = await canvas.getAttribute('data-landscape-build-count');
    let builds = Number(await canvas.getAttribute('data-landscape-resource-build-count'));
    await edit();
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-landscape-resource-build-count')))
      .toBe(builds + 1);
    const recovery = await page.evaluateHandle(() => {
      const element = document.querySelector<HTMLCanvasElement>('#world')!;
      const extension = element.getContext('webgl2')!.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('WebGL context recovery extension unavailable');
      const lost = new Promise<void>((resolve) =>
        element.addEventListener(
          'webglcontextlost',
          (event) => {
            event.preventDefault();
            resolve();
          },
          { once: true },
        ),
      );
      const restored = new Promise<void>((resolve) =>
        element.addEventListener('webglcontextrestored', () => resolve(), { once: true }),
      );
      return {
        lost,
        restored,
        lose: () => extension.loseContext(),
        restore: () => extension.restoreContext(),
      };
    });
    await recovery.evaluate(async (owner) => {
      owner.lose();
      await owner.lost;
    });
    await recovery.evaluate(async (owner) => {
      owner.restore();
      await owner.restored;
    });
    await recovery.dispose();
    const beforeDraw = await page.evaluate(
      () => window.__openLegendSceneProfile!.snapshot().renderedFrames.count,
    );
    await expect
      .poll(() =>
        page.evaluate(() => window.__openLegendSceneProfile!.snapshot().renderedFrames.count),
      )
      .toBeGreaterThan(beforeDraw + 1);
    await expect(canvas).toHaveAttribute('data-landscape-resource-count', resources!);
    await expect(canvas).toHaveAttribute('data-landscape-build-count', terrainBuilds!);
    builds = Number(await canvas.getAttribute('data-landscape-resource-build-count'));
    await edit();
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-landscape-resource-build-count')))
      .toBe(builds + 1);
    await canvas.click({
      position: await lookoutDeckPoint(
        page,
        worldPosition(entityGet(game.service.world.entities, game.service.controlledEntityId)!),
      ),
    });
    await expect.poll(() => commands.length).toBe(1);
    expect(commands[0]).toMatchObject({
      command: { type: 'move', position: { surfaceId: 'lookout-deck' } },
    });
    await page.getByRole('button', { name: 'Camera settings', exact: true }).click();
    await page.getByRole('button', { name: 'Rotate right', exact: true }).click();
    await expect(canvas).toHaveAttribute('data-camera-yaw', String(Math.PI / 4));
    await page.screenshot({ path: info.outputPath('edited-landscape-after-context-recovery.png') });
    expect(errors).toEqual([]);
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    await page.close();
    await game.close();
  }
});
test.afterAll(closeTestDatabases);
