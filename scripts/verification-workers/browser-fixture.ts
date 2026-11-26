// A managed browser opens the ordinary Rust game. The supervisor owns the
// source, inputs, capture signals and outer job deadline.
import { randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createNetworkOwner, requestText } from '@open-legend/network';
import { integer } from '../performance/rust-profile/contract.js';
import { openWorkerGame } from './native-game.js';
import { json } from './files.mjs';

function configured(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`The worker did not supply ${name}.`);
  return value;
}

async function awaitMarker(path: string, deadline: number) {
  for (;;) {
    try {
      await stat(path);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    if (Date.now() >= deadline) throw new Error('Browser capture signal did not arrive in time.');
    await delay(100);
  }
}

interface CaptureSource {
  ready: { head: string; archiveSha256: unknown; executableSha256: string };
}

/// Keep the signed observer read-only while the browser owns the normal
/// player session. The caller owns the disposable world through collection.
export async function captureRustBrowser(
  game: { base: string },
  seconds: number,
  readyPath: string,
  start: string,
  sourceProvenance: CaptureSource,
) {
  const output = join(dirname(readyPath), 'server.json');
  const owner = createNetworkOwner({ role: 'verification-browser-fixture', capacity: 1 });
  const observer = randomUUID();
  const request = (path: string, headers: Record<string, string>) =>
    owner.run({ timeoutMs: 10000 }, (op) =>
      requestText(op, {
        url: new URL(path, game.base),
        init: { headers, redirect: 'manual' },
        diagnostics: 'omit',
        bodyPolicy: { kind: 'bounded', maxBytes: 2 * 1024 * 1024 },
      }),
    );
  const login = await request('/auth/login', {});
  const cookie = login.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .find((value) => value?.startsWith('ol_session='));
  if (login.status !== 303 || !cookie) throw new Error('Native fixture sign-in failed.');
  const state = async () => {
    const res = await request('/api/state', { Cookie: cookie, 'X-OL-Client': observer });
    if (res.status !== 200) throw new Error('The signed native fixture view is unavailable.');
    const view = JSON.parse(res.text);
    if (!view.access?.scope || !Number.isFinite(view.clock?.seconds) || !(view.clock.speed > 0))
      throw new Error('The native fixture lacks a signed player or an active clock.');
    return view;
  };
  const first = await state();
  if (!first.clock.paused) throw new Error('Browser capture needs a paused starting world.');
  await json(
    readyPath,
    {
      url: game.base,
      playerId: first.player.id,
      outputPath: output,
      seconds,
      databaseAdapter: 'postgres',
      nativeSpeed: first.clock.speed,
      sourceProvenance,
      startMarkerPath: start,
      captureAckPath: start + '.ack',
      captureCompletePath: start + '.complete',
    },
    { exclusive: true },
  );
  await awaitMarker(start, Date.now() + 120000);
  const begin = await state();
  if (
    begin.clock.paused ||
    begin.saveTimeline !== first.saveTimeline ||
    begin.clock.speed !== first.clock.speed
  )
    throw new Error('The browser has not resumed the selected native world at its admitted speed.');
  const ack = { measurementStartedAtUnixMs: Date.now(), simTime: begin.clock.seconds };
  await json(start + '.ack', ack, { exclusive: true });
  await awaitMarker(start + '.complete', Date.now() + (seconds + 120) * 1000);
  const end = await state();
  if (end.saveTimeline !== begin.saveTimeline || end.clock.seconds <= begin.clock.seconds)
    throw new Error('The observed native world did not advance through this capture.');
  await json(
    output,
    {
      sourceProvenance,
      seconds,
      nativeSpeed: begin.clock.speed,
      ...ack,
      measurementEndedAtUnixMs: Date.now(),
      endingSimTime: end.clock.seconds,
    },
    { exclusive: true },
  );
}
async function managed() {
  const seconds = integer(Number(process.argv[2]), 'browser capture seconds', 5, 1800);
  const readyPath = configured('OPENLEGEND_PROFILE_READY_PATH');
  const start = configured('OPENLEGEND_PROFILE_BROWSER_START_PATH');
  const game = await openWorkerGame();
  try {
    await captureRustBrowser(game, seconds, readyPath, start, game.sourceProvenance);
  } finally {
    await game.close();
  }
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await managed();
