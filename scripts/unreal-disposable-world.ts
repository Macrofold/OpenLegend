// SPDX-License-Identifier: AGPL-3.0-only
// The preview uses the production world and export owners with a disposable database.
import { cp, mkdir, realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { AuthorityRepository } from '../apps/server/src/authority.js';
import { prepareWorldForStartup } from '../apps/server/src/initial-world-preparation.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import {
  BASE_NATIVE_PROOF,
  createBaseNativeProofWorld,
} from '../packages/domain/src/worlds/base/native-proof.js';
import { initializeCollisionRuntime } from '../packages/spatial/src/rapier.js';
import { createDisposableDatabase } from './disposable-postgres.mjs';
import { writeRustGameServerStorage } from './rust-game-server-storage.js';
import { writeOpeningRecords } from './rust-opening-records.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [output, languagePath, browserPath, ...rest] = process.argv.slice(2);
if (!output || !languagePath || !browserPath || rest.length)
  throw new Error(
    'Usage: pnpm exec tsx scripts/unreal-disposable-world.ts NEW_DIRECTORY LANGUAGE_DIRECTORY BROWSER_DIST',
  );
const parent = await realpath(dirname(resolve(output)));
const run = join(parent, basename(resolve(output)));
const fromCheckout = relative(await realpath(root), run);
if (!isAbsolute(fromCheckout) && fromCheckout !== '..' && !fromCheckout.startsWith('..' + sep))
  throw new Error('Use an output directory outside the checkout.');
const language = await realpath(languagePath);
const browser = await realpath(browserPath);
const release = join(run, 'release');
const admin = process.env.OPENLEGEND_FIXTURE_ADMIN_URL;
if (!admin)
  throw new Error('Set OPENLEGEND_FIXTURE_ADMIN_URL to a disposable loopback PostgreSQL cluster.');

await mkdir(run);
const database = await createDisposableDatabase(admin);
const worldId = 'ue-preview';
const actor = BASE_NATIVE_PROOF.player.id;
const account = 'local-player';
const commands = createInterface({ input: process.stdin, terminal: false });
const shutdown = () => commands.close();
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

try {
  await initializeCollisionRuntime();
  const world = createBaseNativeProofWorld(
    {
      creatorAccountIds: [account],
      playerAccountId: account,
    },
    worldId,
  );
  const opening = prepareWorldForStartup(
    { world, speed: 1, manuallyPaused: true },
    new Map([[actor, account]]),
    [],
    false,
    [],
  );
  const setup = new PostgresDatabase(database.url);
  try {
    await writeOpeningRecords(setup, opening);
    await new AuthorityRepository(setup).provision(worldId, {
      issuer: 'https://local.openlegend.invalid',
      subject: account,
      accountId: account,
      actorId: actor,
      capabilities: ['play', 'create', 'inspect', 'manage-access', 'save'],
    });
  } finally {
    await setup.close();
  }
  await writeRustGameServerStorage(release, database.url, undefined, true);
  await cp(language, join(release, 'language'), { recursive: true });
  await cp(browser, join(release, 'browser'), { recursive: true });
  console.log(`Prepared world ${worldId} in database ${database.details.database}.`);
  console.log('Serve the release from a second terminal. Stop Rust before entering q here.');
  for await (const command of commands) {
    if (command.trim() === 'q') break;
  }
} finally {
  process.off('SIGINT', shutdown);
  process.off('SIGTERM', shutdown);
  commands.close();
  await database.close();
}
