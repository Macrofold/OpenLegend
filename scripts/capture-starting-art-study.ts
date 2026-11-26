/** Capture permitted replay views by walking an owned, already-running Rust game. */
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { surfaceContains, surfaceHeight } from '@open-legend/spatial';
import type { ApiResult, GameView } from '@open-legend/protocol';
import { externalAssetPath } from '../apps/server/src/asset-directories.js';
import { localGameOrigin, localGameSession } from './assets/local-game.js';
import { toolDelay, toolHttp, toolSequence } from './network.js';

const { values } = parseArgs({
  options: {
    origin: { type: 'string' },
    'camp-only': { type: 'boolean' },
    world: { type: 'string' },
    output: { type: 'string' },
  },
});
const origin = values.origin && localGameOrigin(values.origin);
if (!origin || !values.world || !values.output)
  throw new Error(
    'Choose --origin http://127.0.0.1:PORT --world WORLD_ID --output /absolute/external/starting-world.json. See docs/asset-workflow.md.',
  );
const worldId = values.world;
const destination = await externalAssetPath(values.output);
await mkdir(dirname(destination), { recursive: true });
const exists = await access(destination).then(
  () => true,
  (error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  },
);
if (exists) throw new Error('Choose a new capture output; existing art is never overwritten.');

type SignedView = GameView & {
  access: NonNullable<GameView['access']>;
  saveTimeline: string;
  historyEpoch: string;
  commandEpoch: string;
};

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

const specimen = await toolSequence(180_000, async () => {
  const cookie = await localGameSession(origin);
  if (!cookie) throw new Error('Start the owned Rust listener with local authentication.');
  const tab = 'starting-art-' + randomUUID();
  const tabHeaders = { Cookie: cookie, 'X-OL-Client': tab };

  const read = async (): Promise<SignedView> => {
    const response = await toolHttp(new URL('/api/state', origin), {
      redirect: 'error',
      headers: tabHeaders,
    });
    if (!response.ok) throw new Error('The game refused the player view.');
    const view = await response.json<GameView>();
    const { access, saveTimeline, historyEpoch, commandEpoch } = view;
    if (
      access?.mode !== 'local' ||
      !saveTimeline ||
      !historyEpoch ||
      !commandEpoch ||
      view.worldId !== worldId ||
      view.map.seed !== 1086 ||
      view.ai.allowanceLimitUsd !== 0 ||
      view.ai.jevConfigured ||
      view.ai.llmConfigured
    )
      throw new Error(
        'Use the selected local Main opening with AI unconfigured and a zero budget.',
      );
    return { ...view, access, saveTimeline, historyEpoch, commandEpoch };
  };
  const post = async (path: string, body: unknown, view: SignedView) => {
    const response = await toolHttp(new URL(path, origin), {
      method: 'POST',
      redirect: 'error',
      headers: {
        ...tabHeaders,
        Origin: origin.origin,
        'Content-Type': 'application/json',
        'X-OL-Scope': view.access.scope,
        'X-OL-Generation': view.historyEpoch.split(':')[0]!,
      },
      body: JSON.stringify(body),
    });
    const result = await response.json<ApiResult>();
    if (!response.ok || !result.ok)
      throw new Error(result.message || 'The game refused ' + path + '.');
  };

  const opening = await read();
  if (
    opening.clock.seconds !== 0 ||
    opening.clock.pauseReason !== 'manual' ||
    opening.player.hasWork ||
    opening.access.controlledElsewhere
  )
    throw new Error('Capture requires an untouched, paused opening with no other controlling tab.');
  const { map } = opening;
  const mapSha256 = digest(map);
  const stops: { id: string; label: string; view: Omit<GameView, 'map'> }[] = [];
  const record = (id: string, label: string, state: SignedView) => {
    assert.equal(digest(state.map), mapSha256, 'The installed map changed during capture.');
    // The replay uses one unchanged opening. Request and recovery identities
    // remain with the signed reader and do not belong in the exported views.
    const { map, access, checkpoint, commandEpoch, saveTimeline, historyEpoch, ...view } = state;
    const { inputScope, attackReview, attackSource, ...player } = view.player;
    stops.push({ id, label, view: { ...view, player } });
  };
  const ground = (x: number, z: number) => {
    const surface = map.spatial.surfaces.find((s) => s.terrain && surfaceContains(s, { x, z }));
    assert(surface);
    return { x, y: surfaceHeight(surface, x, z), z, surfaceId: surface.id };
  };

  await post(
    '/api/embodiment',
    {
      id: randomUUID(),
      expectedGeneration: opening.access.controlGeneration,
      operation: 'acquire',
    },
    opening,
  );
  const seat = await read();
  if (!seat.access.controlling || seat.saveTimeline !== opening.saveTimeline)
    throw new Error('This capture tab did not acquire the selected character.');

  const current = async () => {
    const view = await read();
    if (
      !view.access.controlling ||
      view.access.scope !== seat.access.scope ||
      view.saveTimeline !== seat.saveTimeline
    )
      throw new Error('The game changed the capture tab’s scope or timeline.');
    return view;
  };
  let sequence = 1;
  let lastPresence = performance.now();
  const move = async (position: ReturnType<typeof ground>) => {
    let view = await current();
    await post(
      '/api/command',
      {
        commandId: randomUUID(),
        commandEpoch: view.commandEpoch,
        command: { type: 'move', position },
      },
      view,
    );
    do {
      await toolDelay(500);
      view = await current();
      const actual = view.player.position;
      if (
        view.player.supportSurfaceId === position.surfaceId &&
        Math.hypot(actual.x - position.x, actual.y - position.y, actual.z - position.z) < 0.05 &&
        !view.player.action
      )
        return view;
      if (view.clock.paused || (!view.player.action && !view.clock.preparingNavigation))
        throw new Error('The walk stopped before reaching the requested support.');
      if (performance.now() - lastPresence >= 5000) {
        await post('/api/presence', { clientId: tab, visible: true, sequence: ++sequence }, view);
        lastPresence = performance.now();
      }
    } while (true);
  };

  try {
    record('camp', 'Camp · people, fire and shelter', seat);
    if (!values['camp-only']) {
      await post('/api/control', { paused: false, clientId: tab, presenceSequence: sequence }, seat);
      record('river', 'Riverbank · reeds and stones', await move(ground(6, 15)));
      record(
        'lookout',
        'Lookout · deck, ramp and supplies',
        await move({ x: 21.5, y: 3, z: 6, surfaceId: 'lookout-deck' }),
      );
      record('mending', 'Mending Clearing · Mara and Tavin', await move(ground(11, 18)));
      // Stand beside the actual work surface so the view exposes it.
      record('workshop', 'Riverside workshop', await move(ground(10, 34)));
      record('woodland', 'Woodland · animals and overlapping trees', await move(ground(27, 19)));
      await move(ground(42, 16.5));
      await move(ground(47, 16.5));
      record('watchpost', 'Broken Watchpost · Kest, Orin and cover', await move(ground(47, 19)));
    }
  } finally {
    // Release only this still-authorized tab. Never retake or replace control
    // when the running world has changed or the command outcome is uncertain.
    const view = await current();
    await post('/api/control', { paused: true }, view);
    await post(
      '/api/embodiment',
      { id: randomUUID(), operation: 'release', expectedGeneration: view.access.controlGeneration },
      view,
    );
  }
  return { mapSha256, map, stops };
});

await writeFile(
  destination,
  JSON.stringify({
    source:
      'Fresh Main opening, seed 1086. The selected local Rust game supplied these permitted player views after ordinary travel. The study viewer stages lighting and motion.',
    capturedAt: new Date().toISOString(),
    ...specimen,
  }),
  { flag: 'wx', mode: 0o600 },
);
console.log(
  JSON.stringify({
    stops: specimen.stops.map((s) => ({ id: s.id, entities: s.view.entities.length })),
    mapSha256: specimen.mapSha256,
    output: destination,
  }),
);
