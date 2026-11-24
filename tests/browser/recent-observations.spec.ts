import type { ApiResult, EntityView, GameView } from '@open-legend/protocol';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { blockExternalBrowserRequests, enterGame } from '../fixtures/browser.js';
import { browserTabHeaders, rustBrowserGame } from '../fixtures/rust-browser.js';

interface ObservationOpening {
  worldId: string;
  start: EntityView['position'];
  end: EntityView['position'];
  privateName: string;
}

async function observationOpening(): Promise<ObservationOpening> {
  const path = process.env.OPENLEGEND_TEST_RUST_OBSERVATION;
  if (!path || !isAbsolute(path))
    throw new Error('Supply the reviewed observation fixture manifest.');
  const witness: Partial<ObservationOpening> = JSON.parse(await readFile(path, 'utf8'));
  const { worldId, start, end, privateName } = witness;
  if (
    typeof worldId !== 'string' ||
    typeof privateName !== 'string' ||
    !start ||
    !end ||
    ![start.x, start.y, start.z, end.x, end.y, end.z].every(Number.isFinite)
  )
    throw new Error(
      'The observation fixture needs a world, its two positions and the private name.',
    );
  return { worldId, start, end, privateName };
}

function samePosition(view: EntityView, expected: EntityView['position']) {
  return (
    Math.abs(view.position.x - expected.x) < 0.01 &&
    Math.abs(view.position.y - expected.y) < 0.01 &&
    Math.abs(view.position.z - expected.z) < 0.01
  );
}

function observationReply(page: Page, query?: string) {
  return page.waitForResponse((response) => {
    if (new URL(response.url()).pathname !== '/api/memories') return false;
    const request = response.request().postDataJSON() as { recent?: boolean; query?: string };
    return request.recent === true && request.query === query;
  });
}

test('the player can read and search actual recent observations on desktop and a narrow screen', async ({
  page,
}, info) => {
  const witness = await observationOpening();
  await blockExternalBrowserRequests(page);
  const game = await rustBrowserGame();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(game.base);
    await enterGame(page);
    const headers = await browserTabHeaders(page);
    const state = async () => {
      const response = await page.request.get(game.base + '/api/state', { headers });
      try {
        expect(response.ok()).toBe(true);
        return (await response.json()) as GameView;
      } finally {
        await response.dispose();
      }
    };
    // The fresh, paused opening holds a real walk waiting for elapsed time.
    // Resuming the Rust world is the only operation that moves this resident.
    const initial = await state();
    expect(initial.worldId).toBe(witness.worldId);
    expect(initial.clock).toMatchObject({ seconds: 0, pauseReason: 'manual' });
    const subject = initial.entities.find(
      (entity) => entity.kind === 'actor' && samePosition(entity, witness.start),
    );
    if (!subject) throw new Error('The resident is outside the opening’s permitted view.');
    expect(subject.name).not.toBe(witness.privateName);

    await page.getByRole('button', { name: 'Game menu (Escape)', exact: true }).click();
    await page.getByRole('button', { name: 'Resume world', exact: true }).click();
    await page.getByRole('button', { name: 'Back to the world', exact: true }).click();
    const arrival: { view?: GameView } = {};
    await expect
      .poll(async () => {
        const view = await state();
        const moved = view.entities.find((entity) => entity.id === subject.id);
        if (!moved || !samePosition(moved, witness.end)) return false;
        arrival.view = view;
        return true;
      })
      .toBe(true);
    if (!arrival.view?.access) throw new Error('The observing tab has no current play scope.');
    expect(arrival.view.clock.seconds).toBeGreaterThan(0);
    // Keep the accepted walk's real receipt on the recent page while testing
    // the reader. An ordinary signed pause stops later wildlife observations.
    const pause = await page.request.post(game.base + '/api/control', {
      headers: { ...headers, Origin: game.base, 'X-OL-Scope': arrival.view.access.scope },
      data: { paused: true },
    });
    try {
      expect(pause.ok()).toBe(true);
      expect(((await pause.json()) as ApiResult).ok).toBe(true);
    } finally {
      await pause.dispose();
    }
    expect((await state()).clock.pauseReason).toBe('manual');

    await page.getByRole('button', { name: 'Journal (J)', exact: true }).click();
    await page.getByRole('tab', { name: 'Memories', exact: true }).click();
    const reader = page.locator('.ol-memory-history:visible');
    const initialObservation = observationReply(page);
    await reader.getByRole('checkbox', { name: 'Recent observations', exact: true }).check();
    expect((await initialObservation).ok()).toBe(true);
    const positionLabel = `(${witness.end.x}, ${witness.end.y}, ${witness.end.z})`;
    await expect(reader).toContainText(positionLabel);
    await expect(reader).not.toContainText(witness.privateName);
    const search = reader.getByRole('searchbox', { name: 'Search recent observations' });
    await search.fill(positionLabel);
    const matchingObservation = observationReply(page, positionLabel);
    await search.press('Enter');
    expect((await matchingObservation).ok()).toBe(true);
    await expect(reader).toContainText(positionLabel);
    await expect(reader).not.toContainText(witness.privateName);
    const desktop = page.viewportSize();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(search).toBeVisible();
    const size = await reader.evaluate((element) => ({
      width: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(size.scrollWidth).toBeLessThanOrEqual(size.width + 1);
    await page.screenshot({ path: info.outputPath('recent-observations-narrow.png') });
    await reader.getByRole('checkbox', { name: 'Recent observations', exact: true }).uncheck();
    await expect(
      reader.getByRole('searchbox', { name: 'Search memories', exact: true }),
    ).toBeVisible();
    if (desktop) await page.setViewportSize(desktop);
    await page.getByRole('button', { name: 'Game menu (Escape)', exact: true }).click();
    await page.getByRole('button', { name: 'Resume world', exact: true }).click();
    await page.getByRole('button', { name: 'Back to the world', exact: true }).click();

    await page.keyboard.press('v');
    await page
      .locator(`[data-entity=${JSON.stringify(subject.id)}]`)
      .getByRole('button')
      .click({ button: 'right' });
    await page.getByRole('button', { name: 'Focus here', exact: true }).focus();
    await page.getByRole('button', { name: 'Focus here', exact: true }).press('Enter');
    await expect(
      page.getByRole('button', { name: 'Stop focusing here', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Stop focusing here', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Focus here', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close action picker', exact: true }).click();
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
});
