import { toolHttp } from './network.js';
/** Refresh permitted visual replay views through ordinary native travel.
 * Uses the disposable test database helper; never resets a user's world. */
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { createGameServer } from '../apps/server/src/http';
import { testRepository, closeTestDatabases, readConfig } from '../tests/fixtures/database';
import { localHttpClient } from '../tests/fixtures/http';
import { initializeCollisionRuntime } from '../packages/spatial/src/rapier';
import {
  advanceWorld,
  createWorld,
  prepareBaseInitialWorldState,
  worldPosition,
  navigationBlocked,
  entityGet,
  entityValues,
} from '../packages/domain/src/index';
import { surfaceContains, surfaceHeight } from '../packages/spatial/src/index';
import type { GameView } from '../packages/protocol/src/index';
import { externalAssetPath } from '../apps/server/src/asset-directories.js';

const { values } = parseArgs({
  options: { output: { type: 'string' }, 'camp-only': { type: 'boolean' } },
});
if (!values.output)
  throw new Error(
    'Choose --output /absolute/external/starting-world.json; see docs/asset-workflow.md.',
  );
const destination = await externalAssetPath(values.output);
const parent = dirname(destination);
await mkdir(parent, { recursive: true });
const exists = await access(destination).then(
  () => true,
  (error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  },
);
if (exists) throw new Error('Choose a new capture output; existing art is never overwritten.');

await initializeCollisionRuntime();
const seed = 1086;
try {
  const world = createWorld(seed);
  // Precommit makes the server reopen this world: record fresh Main startup here.
  // The study selects its artwork, so this fixture needs no deployment catalog.
  prepareBaseInitialWorldState(world);
  const game = await createGameServer({
    config: readConfig({ WORLD_SEED: String(seed), AI_BUDGET_USD: '0' }),
    store: await testRepository(undefined, world),
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
        await toolHttp(`${base}/api/state`, { headers: { Cookie: client.cookie } })
      ).json()) as GameView;
    const stops: { id: string; label: string; view: Omit<GameView, 'map'> }[] = [];
    const digest = (value: unknown) =>
      createHash('sha256').update(JSON.stringify(value)).digest('hex');
    const map = game.service.world.map;
    const before = digest(map);
    const capture = async (id: string, label: string) => {
      const { map: unusedMap, ...view } = await read();
      for (const entity of view.entities) {
        const heat = entityGet(game.service.world.entities, entity.id)?.heat;
        assert.deepEqual(entity.heat, heat ? { lit: heat.lit } : undefined);
      }
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
        step < 400 &&
        entityGet(game.service.world.entities, game.service.controlledEntityId)!.actor?.action;
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
      const actual = worldPosition(
        entityGet(game.service.world.entities, game.service.controlledEntityId)!,
      );
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
    if (!values['camp-only']) {
      await move(ground(6, 15));
      await capture('river', 'Riverbank · reeds and stones');
      await move({ x: 21.5, y: 3, z: 6, surfaceId: 'lookout-deck' });
      await capture('lookout', 'Lookout · deck, ramp and supplies');
      await move(ground(11, 18));
      await capture('mending', 'Mending Clearing · Mara and Tavin');
      // Stand beside the existing work surface so this view actually exposes it.
      await move(ground(10, 34));
      await capture('workshop', 'Riverside workshop');
      await move(ground(27, 19));
      await capture('woodland', 'Woodland · animals and overlapping trees');
      await move(ground(42, 16.5));
      await move(ground(47, 16.5));
      await move(ground(47, 19));
      await capture('watchpost', 'Broken Watchpost · Kest, Orin and cover');
    }
    assert.equal(digest(game.service.world.map), before);
    const first = await read();
    await writeFile(
      destination,
      JSON.stringify({
        source:
          `Fresh current Main seed-${seed} world; authenticated permitted views` +
          (values['camp-only'] ? '; camp only' : ' and ordinary native travel') +
          '; disposable database without an installed-artwork binding; no paid calls. The viewer selects exact artwork separately; staged light/motion remains presentation-only.',
        capturedAt: new Date().toISOString(),
        mapSha256: before,
        map: first.map,
        stops,
      }),
      { flag: 'wx', mode: 0o600 },
    );
    console.log(
      JSON.stringify({
        stops: stops.map((s) => ({ id: s.id, entities: s.view.entities.length })),
        mapSha256: before,
        actors: Array.from(entityValues(game.service.world.entities)).filter((e) => e.actor).length,
        output: destination,
      }),
    );
  } finally {
    await game.close();
  }
} finally {
  await closeTestDatabases();
}
