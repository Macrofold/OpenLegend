import { expect, type Page } from '@playwright/test';

/** Network lifecycle qualification stays loopback-only. Missing external art
 * remains a rendering limitation, never permission to contact a live service. */
export async function blockExternalBrowserRequests(page: Page): Promise<void> {
  await page.context().route(/^https?:\/\//, (route) => {
    const host = new URL(route.request().url()).hostname;
    return ['127.0.0.1', 'localhost', '[::1]'].includes(host)
      ? route.fallback()
      : route.abort('blockedbyclient');
  });
}

/** Ordinary entry and reload automatically enter the sole game tab. */
export async function enterGame(page: Page): Promise<void> {
  // These journeys exercise active play. Another browser window can own focus
  // on a local host, legitimately pausing this page before its first assertion.
  await page.bringToFront();
  // Finish cold 3D allocation before checking controls; software rendering can
  // exceed a generic assertion deadline. Interaction deadlines remain unchanged.
  await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Time settings', exact: true })).toBeEnabled();
  await expect(page.locator('.ol-entry')).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Game is paused.', exact: true })).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Game Paused', exact: true })).toBeHidden();
}
