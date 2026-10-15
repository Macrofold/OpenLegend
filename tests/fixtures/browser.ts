import { expect, type Page } from '@playwright/test';

/** Ordinary entry and reload automatically enter the sole game tab. */
export async function enterGame(page: Page): Promise<void> {
  // These journeys exercise active play. Another browser window can own focus
  // on a local host, legitimately pausing this page before its first assertion.
  await page.bringToFront();
  await expect(page.getByRole('button', { name: 'Time settings', exact: true })).toBeEnabled();
  await expect(page.locator('.ol-entry')).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Game is paused.', exact: true })).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Game Paused', exact: true })).toBeHidden();
}
