import type { Page } from '@playwright/test';
export { openDisposableRustGame as rustBrowserGame } from '../../scripts/disposable-rust-game.js';

/** A signed read belongs to the actual browser tab, using its current session
 * cookie and client identity. It never refreshes or replaces control. */
export async function browserTabHeaders(page: Page): Promise<Record<string, string>> {
  const client = await page.evaluate(() => sessionStorage.getItem('open-legend:tab-id'));
  if (!client) throw new Error('The game tab has not established its browser identity.');
  return { 'X-OL-Client': client };
}
