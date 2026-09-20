import { expect, test } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import { readConfig } from '../../apps/server/src/config.js';
import { SqliteStore } from '../../apps/server/src/store.js';

test('conversation UI grows from one line and uses message-local dots and failure only', async ({
  page,
}) => {
  const game = await createGameServer({
    config: readConfig({}),
    store: new SqliteStore(':memory:'),
    production: true,
    tick: false,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('No listener');
  let release: (() => void) | undefined;
  let response: { ok: boolean; code: string; message: string } = {
    ok: true,
    code: 'completed',
    message: 'The clearing feels ready for change.',
  };
  await page.route('**/api/world-agent/messages', async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({ json: response });
  });
  try {
    await page.goto(`http://127.0.0.1:${address.port}`);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    await page.getByRole('button', { name: 'World agent', exact: true }).click();
    await page.getByRole('button', { name: 'New conversation', exact: true }).first().click();
    const input = page.getByRole('textbox', { name: 'Message to world agent' });
    const initial = await input.boundingBox();
    await input.fill('First line\nSecond line');
    expect((await input.boundingBox())!.height).toBeGreaterThan(initial!.height);
    await input.fill('What should change here?');
    await input.press('Enter');
    await expect(page.getByRole('status', { name: 'Waiting for a reply' })).toBeVisible();
    await expect(page.getByText(/considering|queueing|generating|thinking/i)).toHaveCount(0);
    await expect.poll(() => typeof release).toBe('function');
    release?.();
    await expect(page.getByText('The clearing feels ready for change.')).toBeVisible();
    await expect(page.getByText(/completed/i)).toHaveCount(0);

    response = { ok: false, code: 'failed', message: 'Technical failure details.' };
    release = undefined;
    await input.fill('And now?');
    await input.press('Enter');
    await expect(page.getByRole('status', { name: 'Waiting for a reply' })).toBeVisible();
    await expect.poll(() => typeof release).toBe('function');
    release?.();
    const failed = page.getByRole('button', { name: 'Failed: Technical failure details.' });
    const failureDetail = page.getByRole('tooltip');
    await expect(failed).toBeVisible();
    await expect(failureDetail).toBeHidden();
    await failed.hover();
    await expect(failureDetail).toBeVisible();
    await expect(failureDetail).toContainText('Technical failure details.');
  } finally {
    await page.close();
    await game.close();
  }
});
