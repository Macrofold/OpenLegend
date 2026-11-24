import type { GameView } from '@open-legend/protocol';
import type { SpatialLayout } from '@open-legend/spatial';
import { test, expect, type Page } from '@playwright/test';
import { blockExternalBrowserRequests, enterGame } from '../fixtures/browser.js';
import { browserTabHeaders, rustBrowserGame } from '../fixtures/rust-browser.js';

declare global {
  interface Window {
    publishLandscape?: (view: GameView) => void;
  }
}

/** Only this renderer diagnostic substitutes layouts. The real native stream
 * still holds the signed play session and supplies all of the normal input. */
async function openLandscape(page: Page) {
  await blockExternalBrowserRequests(page);
  await page.addInitScript(() => {
    if (localStorage.getItem('open-legend:camera-v1') === null) {
      localStorage.setItem(
        'open-legend:camera-v1',
        JSON.stringify({
          zoom: 12,
          pitch: 0.88,
          yaw: 0,
          perspectiveLocked: false,
        }),
      );
    }
    const original = window.fetch.bind(window);
    const encoder = new TextEncoder();
    window.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      const response = await original(input, init);
      if (!response.ok || !response.body || new URL(url, location.href).pathname !== '/api/events')
        return response;
      const reader = response.body.getReader();
      let diagnostic = false;
      const wrapped = new ReadableStream<Uint8Array>({
        start(controller) {
          Object.assign(window, {
            publishLandscape(view: GameView) {
              diagnostic = true;
              controller.enqueue(
                encoder.encode('event: reset\ndata: ' + JSON.stringify(view) + '\n\n'),
              );
            },
          });
        },
        async pull(controller) {
          const received = await reader.read();
          if (received.done) controller.close();
          else
            controller.enqueue(
              diagnostic ? encoder.encode(': diagnostic heartbeat\n\n') : received.value,
            );
        },
        cancel() {
          return reader.cancel();
        },
      });
      return new Response(wrapped, { headers: response.headers, status: response.status });
    };
  });
  const game = await rustBrowserGame();
  try {
    const login = await page.request.get(game.base + '/auth/login');
    expect(login.ok()).toBe(true);
    await login.dispose();
    await page.goto(game.base + '/?profile=1');
    await enterGame(page);
    await expect(page.locator('#world')).toHaveAttribute('data-landscape-resource-count', /\d+/);
    const state = async () => {
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
    const back = page.getByRole('button', { name: 'Back to the world', exact: true });
    if ((await state()).clock.paused) {
      await gameMenu.click();
      await page.getByRole('button', { name: 'Resume world', exact: true }).click();
      await back.click();
      await expect.poll(async () => (await state()).clock.paused).toBe(false);
    }
    await expect
      .poll(() => page.evaluate(() => Object.hasOwn(window, 'publishLandscape')))
      .toBe(true);
    const view = await state();
    expect(view.access?.controlling).toBe(true);
    const edit = async (change: (layout: SpatialLayout) => void) => {
      change(view.map.spatial);
      view.map.spatial.revision++;
      view.revision++;
      await page.evaluate((next) => {
        if (!window.publishLandscape) throw new Error('The test layout stream is not attached.');
        window.publishLandscape(next);
      }, view);
    };
    return { game, view, edit, gameMenu };
  } catch (error) {
    await page.close();
    await game.close();
    throw error;
  }
}

test('local landscape edits retain terrain and release replaced structural and scenery resources', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [],
    paid: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/\/api\/(chat|invent|world-agent\/messages)$/.test(request.url())) paid.push(request.url());
  });
  const { game, view, edit } = await openLandscape(page);
  const canvas = page.locator('#world');
  try {
    const builds = await canvas.getAttribute('data-landscape-build-count');
    const resources = Number(await canvas.getAttribute('data-landscape-resource-count'));
    let previousBuilds = Number(await canvas.getAttribute('data-landscape-resource-build-count'));
    const support = structuredClone(view.map.spatial.surfaces.find((surface) => !surface.terrain)!);
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
    const scenery = view.map.spatial.scenery?.[0];
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
    expect(paid).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
});

test('edited landscape recovers its graphics context, drawing, picking and camera', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [],
    commands: unknown[] = [],
    paid: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().endsWith('/api/command')) commands.push(request.postDataJSON());
    if (/\/api\/(chat|invent|world-agent\/messages)$/.test(request.url())) paid.push(request.url());
  });
  const { game, view, edit, gameMenu } = await openLandscape(page);
  const canvas = page.locator('#world');
  const changeScenery = () =>
    edit((layout) => {
      if (!layout.scenery?.length) throw new Error('Fixture requires static scenery');
      layout.scenery[0]!.width += 0.1;
    });
  try {
    const resources = await canvas.getAttribute('data-landscape-resource-count');
    const terrainBuilds = await canvas.getAttribute('data-landscape-build-count');
    let builds = Number(await canvas.getAttribute('data-landscape-resource-build-count'));
    await changeScenery();
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
    await changeScenery();
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-landscape-resource-build-count')))
      .toBe(builds + 1);
    // Pick the retained deck away from the HUD, using the actual camera.
    const rect = (await canvas.boundingBox())!;
    const focus = view.player.position;
    const scale = rect.height / 24;
    const point = {
      x: rect.width / 2 + (21 - focus.x) * scale,
      y:
        rect.height / 2 -
        ((3 - focus.y) * Math.cos(0.88) + (focus.z - 6.5) * Math.sin(0.88)) * scale,
    };
    expect(
      await canvas.evaluate((element, at) => {
        const bounds = element.getBoundingClientRect();
        return document.elementFromPoint(bounds.left + at.x, bounds.top + at.y) === element;
      }, point),
    ).toBe(true);
    await canvas.click({ position: point });
    await expect.poll(() => commands.length).toBe(1);
    expect(commands[0]).toMatchObject({
      command: { type: 'move', position: { surfaceId: 'lookout-deck' } },
    });
    await gameMenu.click();
    await page.getByRole('button', { name: 'Settings & help', exact: true }).click();
    await page.getByRole('tab', { name: 'Camera & graphics', exact: true }).click();
    await page.getByRole('button', { name: 'Camera settings', exact: true }).click();
    await page.getByRole('button', { name: 'Rotate right', exact: true }).click();
    await expect(canvas).toHaveAttribute('data-camera-yaw', String(Math.PI / 4));
    await page.screenshot({ path: info.outputPath('edited-landscape-after-context-recovery.png') });
    expect(errors).toEqual([]);
    expect(paid).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
});
