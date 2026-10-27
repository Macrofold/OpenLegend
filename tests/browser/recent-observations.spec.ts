import { expect, test } from '@playwright/test';
import { createGameServer } from '../../apps/server/src/http.js';
import {
  entityGet,
  initializePerception,
  NPC_ID,
  PLAYER_ID,
  setSpatialPosition,
  supportedPosition,
  worldPosition,
  effectiveBodyProfile,
  assemblySpatialMap,
} from '@open-legend/domain';
import { canStand } from '@open-legend/spatial';
import { closeTestDatabases, readConfig, testRepository } from '../fixtures/database.js';
import { editWorld } from '../fixtures/service.js';
import { enterGame } from '../fixtures/browser.js';

test('the player can read and search actual recent observations on desktop and a narrow screen', async ({
  page,
}, info) => {
  const game = await createGameServer({
    config: readConfig({ AI_BUDGET_USD: '0' }),
    store: await testRepository(),
    production: true,
    tick: false,
  });
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  if (!address || typeof address === 'string') throw Error('No listener');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${address.port}`);
    await enterGame(page);
    const point = await editWorld(game.service, (world) => {
      const player = entityGet(world.entities, PLAYER_ID)!,
        other = entityGet(world.entities, NPC_ID)!;
      const here = worldPosition(player),
        origin = supportedPosition(other)!;
      player.spatial.heading = Math.atan2(origin.x - here.x, origin.z - here.z);
      const point = { ...origin, x: origin.x + 1 };
      expect(
        canStand(assemblySpatialMap(world, world.map), point, effectiveBodyProfile(world, other)),
      ).toBe(true);
      other.name = 'Unseen private name';
      initializePerception(world, []);
      world.simTime += 1;
      setSpatialPosition(world, other, point, point.surfaceId, {
        continuity: 'physical',
      });
      initializePerception(world, []);
      return point;
    });
    const positionLabel = `(${point.x}, ${point.y}, ${point.z})`;
    await page.getByRole('button', { name: 'In view', exact: true }).click();
    await page.locator('[data-entity]').first().getByRole('button').click();
    await page.getByRole('button', { name: 'Focus here', exact: true }).focus();
    await page.getByRole('button', { name: 'Focus here', exact: true }).press('Enter');
    await expect(
      page.getByRole('button', { name: 'Stop focusing here', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Stop focusing here', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Focus here', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Character', exact: true }).click();
    await page.getByRole('tab', { name: 'Record', exact: true }).click();
    const reader = page.locator('.ol-memory-history:visible');
    await reader.getByRole('checkbox', { name: 'Recent observations', exact: true }).check();
    await expect(reader).toContainText(positionLabel);
    await expect(reader).not.toContainText('Unseen private name');
    const search = reader.getByRole('searchbox', { name: 'Search recent observations' });
    await search.fill(positionLabel);
    await search.press('Enter');
    await expect(reader).toContainText(positionLabel);
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
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await game.close();
  }
});
test.afterAll(closeTestDatabases);
