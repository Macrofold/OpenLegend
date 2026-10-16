/** Refresh permitted visual replay views through ordinary native travel.
 * Uses the disposable test database helper; never resets a user's world. */
import { writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { createGameServer } from '../apps/server/src/http';
import { testRepository, closeTestDatabases, readConfig } from '../tests/fixtures/database';
import { localHttpClient } from '../tests/fixtures/http';
import { initializeCollisionRuntime } from '../packages/spatial/src/rapier';
import { advanceWorld, worldPosition, navigationBlocked } from '../packages/domain/src/index';
import { surfaceContains, surfaceHeight } from '../packages/spatial/src/index';
import type { GameView } from '../packages/protocol/src/index';

await initializeCollisionRuntime();
const game = await createGameServer({
  config: readConfig({ WORLD_SEED: '1086', AI_BUDGET_USD: '0' }),
  store: await testRepository(),
  production: true,
  tick: false,
  now: () => 10_000,
});
try {
  await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
  const address = game.server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const client = await localHttpClient(base);
  const read = async () =>
    (await (
      await fetch(`${base}/api/state`, { headers: { Cookie: client.cookie } })
    ).json()) as GameView;
  const stops: { id: string; label: string; view: Omit<GameView, 'map'> }[] = [];
  const digest = (value: unknown) =>
    createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const map = game.service.world.map;
  const before = digest(map);
  const capture = async (id: string, label: string) => {
    const { map: unusedMap, ...view } = await read();
    // Runtime authority fields are not needed by this read-only presentation.
    const publicView = view as typeof view & { access?: unknown; commandEpoch?: unknown };
    delete publicView.access;
    delete publicView.commandEpoch;
    stops.push({ id, label, view: publicView });
  };
  const command = async (command: unknown) => {
    const response = await client.post('/api/command', {
      commandId: randomUUID(),
      commandEpoch: game.service.commandEpoch,
      command,
    });
    const result = await response.json();
    assert(response.ok && result.ok, JSON.stringify(result));
  };
  const ground = (x: number, z: number) => {
    const surface = map.spatial.surfaces.find((s) => s.terrain && surfaceContains(s, { x, z }));
    assert(surface);
    return { x, y: surfaceHeight(surface, x, z), z, surfaceId: surface.id };
  };
  const move = async (position: ReturnType<typeof ground>) => {
    await command({ type: 'move', position });
    for (
      let step = 0;
      step < 400 && game.service.world.entities[game.service.controlledEntityId]!.actor?.action;
      step++
    ) {
      const start = performance.now();
      while (navigationBlocked(game.service.world)) {
        if (performance.now() - start > 20_000)
          throw new Error('Native navigation preparation timed out');
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      const result = await game.service.transition((world) => advanceWorld(world, 10));
      if (!result.ok && !navigationBlocked(game.service.world)) throw new Error(result.message);
    }
    const actual = worldPosition(game.service.world.entities[game.service.controlledEntityId]!);
    assert(
      Math.hypot(actual.x - position.x, actual.y - position.y, actual.z - position.z) < 0.05,
      'Native travel reached requested support',
    );
  };
  await client.post('/api/control', {
    paused: false,
    clientId: 'starting-art-capture',
    presenceSequence: 1,
  });
  await capture('camp', 'Camp · people, fire and shelter');
  await move(ground(6, 15));
  await capture('river', 'Riverbank · reeds and stones');
  await move({ x: 21.5, y: 3, z: 6, surfaceId: 'lookout-deck' });
  await capture('lookout', 'Lookout · deck, ramp and supplies');
  await move(ground(11, 18));
  await capture('mending', 'Mending Clearing · Mara and Tavin');
  await move(ground(8, 33));
  await capture('workshop', 'Riverside workshop');
  await move(ground(27, 19));
  await capture('woodland', 'Woodland · animals and overlapping trees');
  await move(ground(42, 16.5));
  await move(ground(47, 16.5));
  await move(ground(47, 19));
  await capture('watchpost', 'Broken Watchpost · Kest, Orin and cover');
  assert.equal(digest(game.service.world.map), before);
  const first = await read();
  const destination = new URL(
    '../apps/client/src/props/art-study/starting-world.json',
    import.meta.url,
  );
  await writeFile(
    destination,
    JSON.stringify({
      source:
        'Fresh standard seed-1086 world; ordinary authenticated commands and native travel; disposable database; no paid calls. These are permitted player views, with staged light/motion only in the viewer.',
      capturedAt: new Date().toISOString(),
      mapSha256: before,
      map: first.map,
      stops,
    }),
  );
  console.log(
    JSON.stringify({
      stops: stops.map((s) => ({ id: s.id, entities: s.view.entities.length })),
      mapSha256: before,
      actors: Object.values(game.service.world.entities).filter((e) => e.actor).length,
    }),
  );
} finally {
  await game.close();
  await closeTestDatabases();
}
