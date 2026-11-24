import type { ApiResult, GameView, OperationsView } from '@open-legend/protocol';
import { expect, test } from '@playwright/test';
import { blockExternalBrowserRequests, enterGame } from '../fixtures/browser.js';
import { browserTabHeaders, rustBrowserGame } from '../fixtures/rust-browser.js';

test('a discarded person draft can refresh immediately and stays readable at narrow width', async ({
  page,
}, info) => {
  const memory = 'Revisit the alder bridge tomorrow.';
  await blockExternalBrowserRequests(page);
  const game = await rustBrowserGame({ godMode: true });
  const errors: string[] = [];
  let saveRequests = 0;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/god/editor/person/save') saveRequests++;
  });
  try {
    await page.goto(game.base);
    await enterGame(page);
    const tab = await browserTabHeaders(page);
    const readState = async () => {
      const response = await page.request.get(game.base + '/api/state', { headers: tab });
      try {
        expect(response.ok()).toBe(true);
        return (await response.json()) as GameView;
      } finally {
        await response.dispose();
      }
    };
    const initial = await readState();
    expect(initial.access).toMatchObject({
      controlling: true,
      canEditPersonMemory: true,
      canInspectMind: true,
    });
    const resident = initial.entities.find(
      (entity) => entity.kind === 'actor' && entity.position.x === 13 && entity.position.z === 12,
    );
    if (!resident) throw new Error('The recorded resident must be visible to this creator.');
    const menu = page.getByRole('button', { name: 'Game menu (Escape)', exact: true });
    await menu.click();
    await page.getByRole('button', { name: 'In view', exact: true }).click();
    await page
      .locator(`[data-entity=${JSON.stringify(resident.id)}]`)
      .getByRole('button')
      .click();
    await page
      .locator('summary')
      .filter({ hasText: /^God mode$/ })
      .last()
      .click();
    const listPath = '/api/god/editor/person';
    const listResponse = () =>
      page.waitForResponse((response) => new URL(response.url()).pathname === listPath);
    const opened = listResponse();
    await page.getByRole('button', { name: 'Edit Person', exact: true }).click();
    const initialList = await opened;
    expect(initialList.ok()).toBe(true);
    expect(initialList.request().postDataJSON()).toMatchObject({ actorId: resident.id });

    const editor = page.getByRole('dialog', { name: /^Edit / });
    await expect(editor).toBeVisible();
    await expect(editor).not.toContainText('Separate player-only fixture memory.');
    await editor.getByRole('button', { name: 'Memories', exact: true }).click();
    const entry = editor.getByRole('button', { name: /Revisit the alder bridge tomorrow/ });
    await entry.click();
    const text = editor.getByRole('textbox', { name: 'Memory text', exact: true });
    await expect(text).toHaveValue(memory);
    await text.fill('Temporary edit');
    await expect(editor).toContainText('Unsaved changes');
    await editor.getByRole('button', { name: 'Discard changes' }).click();
    await expect(text).toHaveValue(memory);
    const refreshed = listResponse();
    await editor.getByRole('button', { name: 'Refresh latest saved entries' }).click();
    expect((await refreshed).ok()).toBe(true);
    await expect(editor).not.toContainText('Save or discard your changes before refreshing.');
    await expect(editor).toContainText('Queried');
    await expect(entry).toBeVisible();
    await entry.click();
    await expect(text).toHaveValue(memory);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(async () => {
      const bounds = await editor.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(845);
    }).toPass({ timeout: 5_000 });
    await expect(editor.locator('.ol-editor-tab .ol-icon-wrap').first()).toBeVisible();
    const importance = editor.getByRole('spinbutton', { name: 'Memory importance' });
    await expect(importance).toBeInViewport();
    const importanceBounds = await importance.locator('..').boundingBox();
    const textBounds = await text.locator('..').boundingBox();
    expect(importanceBounds).not.toBeNull();
    expect(textBounds).not.toBeNull();
    expect(importanceBounds!.y + importanceBounds!.height).toBeLessThanOrEqual(textBounds!.y);
    await page.screenshot({ path: info.outputPath('god-editor-narrow.png') });

    await text.fill('Private unsaved draft after refresh.');
    await expect(editor).toContainText('Unsaved changes');
    const current = await readState();
    const scope = current.access?.scope;
    if (!scope) throw new Error('The editor needs its current signed creator scope.');
    const headers = { ...tab, Origin: game.base, 'X-OL-Scope': scope };
    const operations = await page.request.get(game.base + '/api/operations', { headers });
    const view = (await operations.json()) as OperationsView;
    expect(operations.ok()).toBe(true);
    await operations.dispose();
    const grant = view.access?.grants.find((row) => row.self);
    if (!grant?.capabilities.includes('create')) throw new Error('The creator grant is missing.');
    const changed = await page.request.post(game.base + '/api/access', {
      headers,
      data: {
        accountId: grant.accountId,
        expectedRevision: grant.revision,
        capabilities: grant.capabilities.filter((permission) => permission !== 'create'),
      },
    });
    expect(changed.ok()).toBe(true);
    expect(((await changed.json()) as ApiResult).ok).toBe(true);
    await changed.dispose();
    await expect(editor).toBeHidden({ timeout: 15_000 });
    await enterGame(page);
    const after = await readState();
    expect(after.access).toMatchObject({ controlling: true, canInspectMind: true });
    expect(after.access?.canEditPersonMemory).toBeUndefined();
    if (!after.access?.scope) throw new Error('The player needs a current signed scope.');
    // The reconnect may retire the earlier contact. The current own actor
    // also requires Create, so this refusal cannot be caused by an old contact.
    for (const actorId of [after.access.actorId, resident.id]) {
      const refused = await page.request.post(game.base + listPath, {
        headers: { ...headers, 'X-OL-Scope': after.access.scope },
        data: { actorId },
      });
      expect(refused.status()).toBe(403);
      expect(await refused.text()).not.toContain(memory);
      await refused.dispose();
    }
    expect(saveRequests).toBe(0);
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
});
