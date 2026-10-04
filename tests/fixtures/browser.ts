import { expect, type Page } from '@playwright/test';

/** Exercise the same explicit entry as a player; opening or reloading never resumes. */
export async function resumeGame(page: Page): Promise<void> {
  const resume = page.getByRole('button', { name: 'Resume here', exact: true });
  await resume.click();
  await expect(page.getByRole('dialog', { name: 'Game paused', exact: true })).toBeHidden();
}
