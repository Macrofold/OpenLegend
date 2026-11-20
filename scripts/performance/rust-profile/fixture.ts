import { copyFile, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

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
  transformSync(source, { sourcefile: file, loader: 'ts', format: 'esm' });
  await writeFile(file, source, { flag: 'wx', mode: 0o600 });
}

/** Copies the immutable driver into a private case workspace and adds only
 * lifecycle observations. The gameplay calls, offered inputs and assertions
 * are shared with the frozen release comparison.
 */
export async function stageFixture(plan: CasePlan, work: string, inputs: RunnerInput[]) {
  const input = (id: string) => {
    const found = inputs.find((entry) => entry.id === id);
    if (!found) throw new Error(`Missing verified case input ${id}.`);
    return found;
  };
  const driver = join(work, 'driver');
  const tools = join(work, 'tools');
  await Promise.all([mkdir(driver), mkdir(tools)]);
  const sourceDriver = input('driver');
  const workload = join(driver, 'workload.mts');
  const client = join(driver, 'player-client.mts');
  // The supervisor mounts these verified originals read-only. Adapt the
  // bytes into new private files so no write targets a copied read-only inode.
  await Promise.all([
    ...sourceDriver.paths
      .filter((file) => file !== 'workload.mts' && file !== 'player-client.mts')
      .map((file) => copyFile(join(sourceDriver.root, file), join(driver, file))),
    readFile(join(sourceDriver.root, 'workload.mts'), 'utf8').then((source) =>
      stageScript(workload, adaptWorkload(source)),
    ),
    readFile(join(sourceDriver.root, 'player-client.mts'), 'utf8').then((source) =>
      stageScript(client, adaptClient(source)),
    ),
  ]);
  await copyFile(
    fileURLToPath(new URL('./fixture-observer.mjs', import.meta.url)),
    join(driver, 'fixture-observer.mjs'),
  );
  if (plan.mode === 'sql') {
    const name = 'postgres-wire-observation.mjs';
    await copyFile(join(input('sql').root, name), join(driver, name));
  }
  const build = join(tools, 'build.mjs');
  await Promise.all(
    input('tools')
      .paths.filter((path) => path !== 'build.mjs')
      .map((path) => symlink(join(input('tools').root, path), join(tools, path))),
  );
  let builder = await readFile(join(input('tools').root, 'build.mjs'), 'utf8');
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
    '    return { at: operationAt, resource, observedAt: at(), sql, exactNodeStatus };',
    '    return { at: operationAt, resource, observedAt: at(), sql, exactNodeStatus, wire: sqlWire?.snapshot() };',
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
