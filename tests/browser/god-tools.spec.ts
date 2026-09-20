import { test, expect } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import { readConfig } from '../../apps/server/src/config.js';
import { SqliteStore } from '../../apps/server/src/store.js';

test('god mode adds authored people and revives dead characters without inference', async ({
  page,
}) => {
  const store = new SqliteStore(':memory:');
  const game = await createGameServer({
    config: readConfig({ OPEN_LEGEND_GOD_MODE: 'true' }),
    store,
    production: true,
    tick: false,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw Error('No listener');
  const paid: string[] = [];
  page.on('request', (request) => {
    if (/\/api\/(chat|invent|world-agent\/messages)$/.test(request.url())) paid.push(request.url());
  });
  try {
    await page.goto(`http://127.0.0.1:${address.port}`);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    const add = page.getByRole('button', { name: /Add something/ });
    for (const point of [
      { x: 600, y: 500 },
      { x: 700, y: 500 },
      { x: 800, y: 500 },
      { x: 600, y: 600 },
      { x: 800, y: 600 },
    ]) {
      await page.locator('#world').click({ button: 'right', position: point });
      await page.waitForTimeout(100);
      if (await add.count()) break;
      await page.keyboard.press('Escape');
    }
    await expect(page.locator('#contextTitle')).toHaveText('The clearing');
    await expect(add).toContainText('God mode');
    await add.click();
    const objectSearch = page.locator('.ol-god-spawn-select input');
    await expect(objectSearch).toBeFocused();
    const objects = page.locator('.ol-god-spawn-list');
    if (!(await objects.isVisible()))
      await page.getByRole('button', { name: 'Show objects' }).click();
    await expect(objects.getByRole('option')).toHaveCount(10);
    await expect(objects.getByRole('option').first()).toContainText('Person');
    expect(
      await objects
        .getByRole('option')
        .allTextContents()
        .then((rows) => rows.slice(1).map((row) => row.replace('God mode', '').trim())),
    ).toEqual([
      'Banked campfire',
      'Berry bush',
      'Berry thicket',
      'Deer',
      'Dry grass fibers',
      'Fallen branches',
      'Hare',
      'River reeds',
      'River stones',
    ]);
    const overflow = await objects.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(overflow.scrollHeight).toBeGreaterThan(overflow.clientHeight);
    await objects.getByRole('option', { name: /Person/ }).click();
    const modal = page.getByRole('dialog', { name: 'Create person' });
    await expect(modal).toContainText('God mode');
    await modal.getByLabel('Name').fill('Mira');
    await modal.getByLabel('Personality').fill('Warm, direct, and curious.');
    await modal.getByLabel('Backstory').fill('A traveler who mapped the northern marsh.');
    const traits = modal.getByRole('combobox', { name: 'Traits' });
    await traits.fill('curious');
    const curious = page.getByRole('option', { name: /Curious/ });
    await curious.hover();
    await expect(curious).toContainText('Drawn to unfamiliar things');
    await curious.click();
    await expect(modal.locator('.ol-person-trait-tag')).toHaveText(/Curious/);
    await modal.getByLabel('Initial goals').fill('Find a safe route home.\nMeet the neighbors.');
    await modal.getByRole('button', { name: 'Create person' }).click();
    await expect(modal).toBeHidden();
    const person = await expect
      .poll(() =>
        Object.values(game.service.world.entities).find((entity) => entity.name === 'Mira'),
      )
      .toBeTruthy()
      .then(
        () => Object.values(game.service.world.entities).find((entity) => entity.name === 'Mira')!,
      );
    expect(person.actor?.traits?.map((trait) => trait.id)).toEqual(['curious']);
    person.actor!.alive = false;
    person.actor!.health = 0;
    game.service.notify();
    await page.getByRole('button', { name: 'In view', exact: true }).click();
    const personRow = page.locator(`[data-entity="${person.id}"]`);
    await expect(personRow).toContainText('Dead');
    await personRow.click({ button: 'right' });
    const revive = page.getByRole('button', { name: /Revive/ });
    await expect(revive).toContainText('God mode');
    await revive.click();
    await expect.poll(() => game.service.world.entities[person.id]!.actor!.alive).toBe(true);
    expect(paid).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
});
