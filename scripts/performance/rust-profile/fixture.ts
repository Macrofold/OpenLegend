import { copyFile, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { hashFile } from './contract.js';
import type { CasePlan } from './contract.js';
import type { RunnerInput } from './inputs.js';

function replace(source: string, old: string, replacement: string) {
  const index = source.indexOf(old);
  if (index < 0 || source.indexOf(old, index + old.length) >= 0)
    throw new Error(`Frozen fixture anchor missing or ambiguous: ${old.slice(0, 100)}`);
  return source.slice(0, index) + replacement + source.slice(index + old.length);
}

/** Check the staged TypeScript before paying for a release build. The
 * fixture still executes the original source through its pinned launcher.
 */
async function stageScript(file: string, source: string) {
  // The managed runner mounts this tool outside the source tree. Use the
  // checkout's parser, from the same lockfile as the fixture's TSX loader.
  const require = createRequire(join(process.cwd(), 'package.json'));
  const { transformSync }: typeof import('esbuild') = require('esbuild');
  transformSync(source, { sourcefile: file, loader: 'ts', format: 'esm' });
  await writeFile(file, source, { flag: 'wx', mode: 0o600 });
}

/** Stage the frozen driver with the current stopped seed and selected observations.
 * The gameplay schedule, outcomes and assertions stay with the pinned driver.
 */
export async function stageFixture(
  plan: CasePlan,
  work: string,
  inputs: RunnerInput[],
  cargoLockSha256: string,
) {
  const input = (id: string) => {
    const found = inputs.find((entry) => entry.id === id);
    if (!found) throw new Error(`Missing verified case input ${id}.`);
    return found;
  };
  const driver = join(work, 'driver');
  const tools = join(work, 'tools');
  await mkdir(driver);
  await mkdir(tools);
  const sourceDriver = input('driver');
  const workload = join(driver, 'workload.mts');
  const client = join(driver, 'player-client.mts');
  // The supervisor mounts these verified originals read-only. Adapt the
  // bytes into new private files so no write targets a copied read-only inode.
  await stageScript(
    workload,
    adaptWorkload(await readFile(join(sourceDriver.root, 'workload.mts'), 'utf8')),
  );
  await stageScript(
    client,
    adaptClient(await readFile(join(sourceDriver.root, 'player-client.mts'), 'utf8')),
  );
  // A failed stage must leave no copy still writing into the workspace when
  // the case owner removes it. The source files are small and outside timing.
  for (const file of sourceDriver.paths) {
    if (file !== 'workload.mts' && file !== 'player-client.mts')
      await copyFile(join(sourceDriver.root, file), join(driver, file));
  }
  await copyFile(
    fileURLToPath(new URL('./fixture-observer.mjs', import.meta.url)),
    join(driver, 'fixture-observer.mjs'),
  );
  if (plan.mode === 'sql') {
    const name = 'postgres-wire-observation.mjs';
    await copyFile(join(input('sql').root, name), join(driver, name));
  }
  const build = join(tools, 'build.mjs');
  const sourceTools = input('tools');
  for (const path of sourceTools.paths) {
    if (path !== 'build.mjs') await symlink(join(sourceTools.root, path), join(tools, path));
  }
  let builder = await readFile(join(sourceTools.root, 'build.mjs'), 'utf8');
  // Bind the builder to the supervisor's exact source lock. The verified vendor
  // archive and locked offline Cargo still enforce the dependency pins.
  builder = replace(
    builder,
    "assert.equal(await sha(join(root, 'native/Cargo.lock')), manifest.cargoLockSha256);",
    `const caseLockSha256 = ${JSON.stringify(cargoLockSha256)};
assert.equal(await sha(join(root, 'native/Cargo.lock')), caseLockSha256);`,
  );
  builder = replace(
    builder,
    '  cargoLockSha256: manifest.cargoLockSha256,',
    '  cargoLockSha256: caseLockSha256,',
  );
  // A disabled and enabled run use the same build configuration. Frame
  // pointers change the build independently from attaching the sampler.
  if (plan.mode === 'disabled' || plan.mode === 'enabled') {
    builder = replace(
      builder,
      "'--bin', 'openlegend-game-server'], env, true);",
      "'--bin', 'openlegend-game-server', '--features', 'profile-campaign'], env, true);",
    );
  }
  await writeFile(build, builder, { flag: 'wx', mode: 0o600 });
  return {
    build,
    launch: join(driver, 'launch.mjs'),
    hashes: {
      build: await hashFile(build),
      workload: await hashFile(workload),
      inputSchedule: await hashFile(client),
      observer: await hashFile(join(driver, 'fixture-observer.mjs')),
    },
  };
}

function adaptWorkload(source: string) {
  // Reuse the release comparison's first-save owner while the database is
  // still stopped. This never launches the archived TypeScript game.
  source = replace(
    source,
    `const [{ digest }, { PostgresDatabase }, { SqlGameRepository }, { WorldService }, { readConfig },
  { entityGet }, { bodyProfile, spatialMap },
  { starterGroundAt }, { writeRustNavigationRelease }] = await Promise.all([
  import(root + '/apps/server/src/content-digest.ts'), import(root + '/apps/server/src/postgres.ts'), import(root + '/apps/server/src/store.ts'),
  import(root + '/apps/server/src/world-service.ts'), import(root + '/apps/server/src/config.ts'),
  import(root + '/packages/domain/src/entity-collection.ts'),
  import(root + '/packages/domain/src/spatial-state.ts'), import(root + '/packages/domain/src/worlds/base/landscape.ts'),
  import(root + '/scripts/rust-game-server-navigation.ts'),
]);`,
    `const [{ digest }, { PostgresDatabase }, { writeOpeningRecords }, { prepareWorldForStartup },
  { AuthorityRepository }, { IntegrationValues },
  { entityGet }, { bodyProfile, spatialMap },
  { starterGroundAt }, { writeRustNavigationRelease }, { basePlaytestMilestones }] = await Promise.all([
  import(root + '/apps/server/src/content-digest.ts'), import(root + '/apps/server/src/postgres.ts'), import(root + '/scripts/rust-opening-records.ts'),
  import(root + '/apps/server/src/initial-world-preparation.ts'), import(root + '/apps/server/src/authority.ts'),
  import(root + '/apps/server/src/integration-values.ts'),
  import(root + '/packages/domain/src/entity-collection.ts'),
  import(root + '/packages/domain/src/spatial-state.ts'), import(root + '/packages/domain/src/worlds/base/landscape.ts'),
  import(root + '/scripts/rust-game-server-navigation.ts'),
  import(root + '/packages/domain/src/worlds/base/playtest.ts'),
]);`,
  );
  source = replace(
    source,
    `  const setup = new SqlGameRepository(dir, new PostgresDatabase(database));
  try {
    await setup.ready;
    await setup.commit(0, { world, speed: 1, manuallyPaused: true });
    await setup.putIntegration('world-timeline:' + world.id, 'eb0b4512-1bb7-431c-85ab-18065251efcd');
    const source = new WorldService(setup, readConfig({ OPEN_LEGEND_DATABASE_URL: database,
      OPEN_LEGEND_DATA_DIR: dir, AI_BUDGET_USD: '0' }));
    try { await source.ready; await source.flush(); } finally { source.releaseHostWork(); }
  } finally { await setup.close(); }`,
    `  const setup = new PostgresDatabase(database);
  try {
    const initial = { world, speed: 1, manuallyPaused: true };
    const binding = { issuer: 'https://local.openlegend.invalid', subject: site.accountId,
      accountId: site.accountId, actorId: site.actorId, capabilities: ['play', 'save'] as const };
    const owners = new Map(Object.entries(world.authorship.playerAccountIds));
    assert.equal(owners.get(site.actorId), site.accountId);
    const prepared = prepareWorldForStartup(initial, owners, [], false, []);
    assert(prepared.world.events.length === 0 && prepared.world.simTime === world.simTime);
    assert(!basePlaytestMilestones(prepared.world, site.actorId, prepared.world.events).some(({ done }) => done));
    // Seed the authored opening before the measurement window. Only this
    // fixture owns the fresh database; the Rust listener opens it afterward.
    await writeOpeningRecords(setup, prepared);
    await setup.transaction(async () => {
      await new AuthorityRepository(setup).provision(world.id, binding);
      await new IntegrationValues(setup).put('world-timeline:' + world.id, 'eb0b4512-1bb7-431c-85ab-18065251efcd');
    });
  } finally { await setup.close(); }`,
  );
  source = replace(
    source,
    "join(root, 'scripts/rust-game-server-storage.ts'), admin, release, database",
    "join(root, 'scripts/rust-game-server-storage.ts'), release, database",
  );
  source = replace(
    source,
    "import assert from 'node:assert/strict';",
    `import assert from 'node:assert/strict';
import { captureAddressMap, coldContinuation, connectObserver } from './fixture-observer.mjs';
const profile = JSON.parse(process.env.OPEN_LEGEND_PROFILE_CASE);
`,
  );
  source = replace(
    source,
    "const release = join(measuring ? process.env.HOME : dir, 'release');",
    "const release = join(profile.workDirectory, 'release');",
  );
  source = replace(
    source,
    "let provider, server, serverExit, client, clientExit, sampling, output = '';",
    "let provider, server, serverExit, client, clientExit, sampling, output = '';\nlet recorder, continuation, sqlWire;",
  );
  source = replace(
    source,
    '  const listener = Promise.withResolvers();',
    `  const listener = Promise.withResolvers();
  if (profile.mode === 'sql') {
    const { observeLocalPostgres } = await import('./postgres-wire-observation.mjs');
    sqlWire = await observeLocalPostgres(database);
    env.OPEN_LEGEND_DATABASE_URL = sqlWire.url;
  }`,
  );
  source = replace(
    source,
    "  server = arm === 'direct'\n    ? spawn(build.executable.path, ['serve', release], { env, stdio: ['ignore', 'pipe', 'pipe'] })",
    `  const startDirect = (runtimeEnv, controller = false) => spawn(build.executable.path, ['serve', release], {
    env: runtimeEnv, stdio: [controller ? 'pipe' : 'ignore', 'pipe', 'pipe'],
  });
  // Install an observer only in the warm Rust server. The base environment is
  // also used by the Node-free preflight shell and the cold reopen.
  const recording = profile.mode === 'enabled';
  const serverEnv = recording ? {
    ...env, OPEN_LEGEND_PROFILE_CONTROL: 'stdin', OPEN_LEGEND_PROFILE_OUTPUT: join(dir, 'metrics.json'),
  } : profile.mode === 'sampled' ? {
    ...env, LD_PRELOAD: profile.sampler, OL_PROFILE_RAW: join(dir, 'stacks.bin'),
  } : env;
  server = arm === 'direct'
    ? startDirect(serverEnv, recording)`,
  );
  source = replace(
    source,
    "  server.on('error', error => {",
    `  if (profile.mode === 'enabled') recorder = connectObserver(server);
  const reopenEnv = { ...env, OPEN_LEGEND_DATABASE_URL: database };
  server.on('error', error => {`,
  );
  source = replace(
    source,
    "  if (measuring) {\n    const executable = await realpath('/proc/' + server.pid + '/exe');",
    `  if (profile.mode === 'sampled') await captureAddressMap(server, dir);
  if (measuring) {
    const executable = await realpath('/proc/' + server.pid + '/exe');`,
  );
  source = replace(
    source,
    '  assert(controlled.access.controlling && controlled.access.actorId === site.actorId);',
    `  assert(controlled.access.controlling && controlled.access.actorId === site.actorId);
  continuation = () => coldContinuation({
    start: () => startDirect(reopenEnv),
    cookie, clientId: site.clientId, actorId: site.actorId, acceptedGameSecond: report.steady.end.clock.seconds,
    commandEpoch: controlled.commandEpoch, lastCommand: report.commandLatencyWitnesses.at(-1),
  });`,
  );
  source = replace(
    source,
    '  await sendChild(client, { go: true });',
    `  const window = await recorder?.arm(profile);
  const began = window?.began ?? Math.ceil(at()) + 1000;
  report.captureWindow = window;
  await sendChild(client, { go: true, began });`,
  );
  source = replace(
    source,
    `    const [sql, exactNodeStatus] = await Promise.all([databaseResource(), nodeStatus(label)]);
    return { at: operationAt, resource, observedAt: at(), sql, exactNodeStatus };`,
    `    // Take the wire cut before the independent PostgreSQL statistics query can delay it.
    const wire = sqlWire?.snapshot();
    const [sql, exactNodeStatus] = await Promise.all([databaseResource(), nodeStatus(label)]);
    return { at: operationAt, resource, observedAt: at(), sql, exactNodeStatus, wire };`,
  );
  source = replace(
    source,
    '  report.completedEquivalentWork = true;\n} catch (error) {',
    `  if (recorder) {
    report.captureStop = await recorder.stop(window, join(dir, 'metrics.json'));
  } else if (report.offered) {
    await delay(Math.max(0, report.offered.offeredAtUnixMs + profile.drainSeconds * 1000 - at()));
  }
  report.completedEquivalentWork = true;
} catch (error) {`,
  );
  source = replace(
    source,
    '  await pendingReceiptRead;\n  if (report.completedEquivalentWork) {',
    `  await pendingReceiptRead;
  if (report.completedEquivalentWork) {
    try { report.coldContinuation = await continuation(); }
    catch (error) {
      report.completedEquivalentWork = false;
      report.coldContinuationFailure = failure(error);
    }
  }
  if (report.completedEquivalentWork) {`,
  );
  return replace(
    source,
    "    ['database', () => db.close()],",
    "    ['database', () => db.close()],\n    ['postgres-wire', () => sqlWire?.close()],",
  );
}

function adaptClient(source: string) {
  return replace(
    source,
    'assert(go.go);\nbegan = at();',
    `assert(go.go);
assert(Number.isSafeInteger(go.began));
began = go.began;
assert(at() < began, 'The client missed the armed workload start.');
while (at() < began) await delay(Math.max(1, began - at()));`,
  );
}
