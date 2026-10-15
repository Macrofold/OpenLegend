import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { enterGame } from '../tests/fixtures/browser.js';
import { testRepository, closeTestDatabases, readConfig } from '../tests/fixtures/database.js';
import { createGameServer } from '../apps/server/src/http.js';
import { worldPosition } from '../packages/domain/src/index.js';
import type { GameView, KnownPlaceInspection } from '../packages/protocol/src/index.js';

type Game = Awaited<ReturnType<typeof createGameServer>>;

test.setTimeout(60_000);
async function play(page: Page, body: (game: Game, view: () => GameView) => Promise<void>) {
  const game = await createGameServer({
    config: readConfig({ AI_BUDGET_USD: '0' }),
    store: await testRepository(),
    production: true,
    tick: false,
  });
  let visible: GameView | undefined;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', async (response) => {
    if (new URL(response.url()).pathname === '/api/state' && response.ok()) {
      const data = await response.json().catch(() => undefined);
      if (data?.player && data?.entities) visible = data;
    }
  });
  try {
    await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
    const address = game.server.address();
    if (!address || typeof address === 'string') throw new Error('Missing listener');
    await page.goto(`http://127.0.0.1:${address.port}`);
    await enterGame(page);
    await expect(page.locator('#world')).toHaveAttribute('data-ready', 'true');
    await expect.poll(() => !!visible).toBe(true);
    await body(game, () => visible!);
    expect(errors).toEqual([]);
    expect((await game.service.store.usage(0)).usage.llmCalls).toBe(0);
  } finally {
    await page.close();
    await game.close();
  }
}
async function fit(page: Page, selector: string, info: TestInfo, name: string) {
  const area = page.locator(selector);
  await expect(area).toBeVisible();
  const bounds = await area.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(-1);
  expect(bounds!.y).toBeGreaterThanOrEqual(-1);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
  await page.screenshot({ path: info.outputPath(name + '.png') });
}

test('Journal preserves a selected place across layout changes and focus never walks', async ({
  page,
}, info) => {
  await play(page, async (game) => {
    const commands: unknown[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/command') commands.push(request.postDataJSON());
    });
    const before = {
      ...worldPosition(game.service.world.entities[game.service.controlledEntityId]!),
    };
    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    const journal = page.locator('#journalPanel');
    await journal.getByText('Places', { exact: true }).click();
    const first = journal
      .locator('.ol-known-place-list')
      .getByRole('button', { name: /^Inspect / })
      .first();
    await expect(first).toBeVisible();
    const initialInspectionResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/known-places/inspect',
    );
    await first.click();
    const initialInspection = (await (
      await initialInspectionResponse
    ).json()) as KnownPlaceInspection;
    const detail = journal.locator('.ol-known-place-detail');
    const heading = await detail.getByRole('heading').innerText();
    expect(initialInspection.ok).toBe(true);
    expect(heading).toBe(initialInspection.place.label);
    await journal.getByText('Promises', { exact: true }).click();
    await expect(detail).toBeHidden();
    await journal.getByText('Places', { exact: true }).click();
    await expect(detail.getByRole('heading')).toHaveText(heading);
    await journal.getByRole('button', { name: 'Hide Journal panel', exact: true }).click();
    await expect(journal).toBeHidden();
    await page.getByRole('button', { name: 'Journal', exact: true }).click();
    await expect(detail.getByRole('heading')).toHaveText(heading);
    await detail.getByRole('button', { name: 'Focus last-known location', exact: true }).click();
    expect(worldPosition(game.service.world.entities[game.service.controlledEntityId]!)).toEqual(
      before,
    );
    expect(commands).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(detail.getByRole('heading')).toHaveText(heading);
    await fit(page, '#journalPanel', info, 'journal-place-narrow');
    await page.setViewportSize({ width: 1024, height: 600 });
    await expect(detail.getByRole('heading')).toHaveText(heading);
    await detail.getByRole('heading').focus();
    await page.keyboard.press('Tab');
    await expect(
      detail.getByRole('button', {
        name: 'Focus last-known location',
        exact: true,
      }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    const move = detail.getByRole('button', {
      name: 'Move to last-known location',
      exact: true,
    });
    await expect(move).toBeFocused();
    const moveBounds = await move.boundingBox();
    const bodyBounds = await journal.locator('.ol-panel-body').boundingBox();
    expect(moveBounds).not.toBeNull();
    expect(bodyBounds).not.toBeNull();
    expect(moveBounds!.y).toBeGreaterThanOrEqual(bodyBounds!.y);
    expect(moveBounds!.y + moveBounds!.height).toBeLessThanOrEqual(
      bodyBounds!.y + bodyBounds!.height + 1,
    );
    await fit(page, '#journalPanel', info, 'journal-place-short-keyboard');

    // Hold a real permitted inspection, then supersede it with a native empty search.
    // The browser may cancel delivery; record that separately from consuming old data.
    let releaseInspection!: () => void;
    const heldInspection = new Promise<void>((resolve) => {
      releaseInspection = resolve;
    });
    page.once('close', () => releaseInspection());
    let fetched = false,
      finished = false,
      canceled = false;
    let heldRequest: import('@playwright/test').Request | undefined;
    page.on('requestfailed', (request) => {
      if (request === heldRequest && request.failure()?.errorText === 'net::ERR_ABORTED')
        canceled = true;
    });
    await page.route('**/api/known-places/inspect', async (route) => {
      heldRequest = route.request();
      const native = await route.fetch();
      expect(native.ok()).toBe(true);
      fetched = true;
      await heldInspection;
      try {
        await route.fulfill({ response: native });
      } catch (error) {
        if (!canceled) throw error;
      } finally {
        finished = true;
      }
    });
    await detail.getByRole('button', { name: 'Recheck movement', exact: true }).click();
    await expect.poll(() => fetched).toBe(true);
    const search = journal.getByRole('searchbox', {
      name: 'Search known places',
    });
    await search.fill('zz-no-such-observed-place');
    await search.press('Enter');
    await expect(journal.getByText('No matching known places.', { exact: true })).toBeVisible();
    releaseInspection();
    await expect.poll(() => finished).toBe(true);
    await expect(detail).toHaveCount(0);
    await expect(
      journal.getByText('Loading the remembered observation…', { exact: true }),
    ).toBeHidden();
    console.log(
      'LATE_INSPECTION=' + JSON.stringify({ fetched, finished, browserCanceled: canceled }),
    );
    await page.unroute('**/api/known-places/inspect');
    await journal.getByRole('button', { name: 'Clear place search', exact: true }).click();
    await expect(search).toBeFocused();
    await expect(first).toBeVisible();
    expect(commands).toEqual([]);
    const currentInspectionResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/known-places/inspect',
    );
    await first.focus();
    await first.press('Enter');
    const selected = (await (await currentInspectionResponse).json()) as KnownPlaceInspection;
    await expect(detail.getByRole('heading')).toBeFocused();
    await expect(move).toBeEnabled();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(move).toBeFocused();
    const admittedResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/command',
    );
    await move.press('Enter');
    const admitted = await admittedResponse;
    expect((await admitted.json()).ok).toBe(true);
    expect(commands).toHaveLength(1);
    expect(admitted.request().postDataJSON()).toMatchObject({
      command: {
        type: 'move',
        knownPlace: {
          id: selected.place.id,
          sourceId: selected.place.sourceId,
          revision: selected.place.revision,
        },
      },
    });
  });
});

test.afterAll(closeTestDatabases);
