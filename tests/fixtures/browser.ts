import { initialCamera, updateCamera } from '../../apps/client/src/world-camera.js';
import { expect, type Page } from '@playwright/test';

/** Network lifecycle qualification stays loopback-only. Missing external art
 * remains a rendering limitation, never permission to contact a live service. */
export async function blockExternalBrowserRequests(page: Page): Promise<void> {
  // A RegExp is matched in Playwright's driver. A function matcher or catch-all
  // route sends even permitted unload/keepalive traffic back through test code.
  await page
    .context()
    .route(
      /^https?:\/\/(?!(?:[^/?#]*@)?(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?(?:[/?#]|$))/i,
      (route) => route.abort('blockedbyclient'),
    );
}

/** Ordinary entry and reload automatically enter the sole game tab. */
export async function enterGame(page: Page): Promise<void> {
  // These journeys exercise active play. Another browser window can own focus
  // on a local host, legitimately pausing this page before its first assertion.
  await page.bringToFront();
  // Local fixtures use the ordinary session boundary too; initial entry may
  // finish its authentication read after page.goto has returned.
  const signIn = page.getByRole('link', { name: 'Sign in', exact: true });
  await page
    .locator('#world:visible')
    .or(signIn)
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 });
  if (await signIn.isVisible()) await signIn.click();
  // Finish cold 3D allocation before checking controls; software rendering can
  // exceed a generic assertion deadline. Interaction deadlines remain unchanged.
  await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  // A native button can be enabled beneath an inert paused workspace. Wait for
  // accepted play itself before a journey sends input or closes the selected tab.
  await expect(page.locator('#world')).not.toHaveAttribute('inert', '');
  await expect(page.getByRole('button', { name: 'Game menu (Escape)', exact: true })).toBeEnabled();
  await expect(page.locator('.ol-entry')).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Game is paused.', exact: true })).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Game Paused', exact: true })).toBeHidden();
}

/** Pick the real public deck after framing it with ordinary camera controls.
 * Read the renderer's pitch and reuse its zoom owner instead of old default numbers.
 */
export async function lookoutDeckPoint(page: Page, player: { x: number; y: number; z: number }) {
  await page.getByRole('button', { name: 'Center on player', exact: true }).click();
  let camera = initialCamera();
  for (let n = 0; n < 4; n++) {
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
    camera = updateCamera(camera, { type: 'zoom', delta: 2 });
  }
  const canvas = page.locator('#world');
  await expect(canvas).toHaveAttribute('data-camera-yaw', '0');
  const pitch = Number(await canvas.getAttribute('data-camera-pitch'));
  const rect = (await canvas.boundingBox())!;
  const scale = rect.height / (camera.zoom * 2);
  return {
    x: rect.width / 2 + (24 - player.x) * scale,
    y:
      rect.height / 2 -
      ((3 - player.y) * Math.cos(pitch) + (player.z - 6) * Math.sin(pitch)) * scale,
  };
}
