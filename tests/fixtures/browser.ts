import { expect, type Page } from '@playwright/test';

/** Ordinary entry and reload automatically enter the sole game tab. */
export async function enterGame(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: 'Time settings', exact: true })).toBeEnabled();
  await expect(page.locator('.ol-entry')).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Game Paused', exact: true })).toBeHidden();
}
