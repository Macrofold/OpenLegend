import { createRequire } from 'node:module';
import { mkdir, open, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { attemptDirectory, buildManifest, profileDirectory, repository } from './paths.mjs';
import { hash, listBuild, verifiedSource, verifyFiles } from './inputs.mjs';

// Preflight is read-only until every approved input and explicit prerequisite
// exists. A missing build manifest must never fall through to an old dist folder.
const { source, bytes: sourceBytes } = await verifiedSource();
const build = JSON.parse(await readFile(buildManifest));
if (
  build.commit !== source.commit ||
  build.sourceManifestSha256 !== hash(sourceBytes) ||
  !build.files?.length
)
  throw new Error('The compiled build has not been qualified against this source manifest.');
await verifyFiles(build.files);
if (
  JSON.stringify(await listBuild()) !==
  JSON.stringify(build.files.map((entry) => entry.path).sort())
)
  throw new Error('Compiled file set differs from the approved build.');
if (process.env.OPENLEGEND_PLAYWRIGHT_CHANNEL)
  throw new Error(
    'This observation uses CI-installed default Chromium, without a channel override.',
  );
let database;
try {
  database = new URL(process.env.OPENLEGEND_TEST_DATABASE_URL);
} catch {
  throw new Error('Explicit disposable-only loopback PostgreSQL admin URL required.');
}
if (
  !['postgres:', 'postgresql:'].includes(database.protocol) ||
  !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
  database.search ||
  database.hash
)
  throw new Error('The database fixture accepts only the explicit loopback PostgreSQL admin URL.');
const require = createRequire(repository + '/package.json');
const cli = require.resolve('@playwright/test/cli');
const testPackage = JSON.parse(
  await readFile(require.resolve('@playwright/test/package.json'), 'utf8'),
);
if (testPackage.version !== '1.58.2') throw new Error('Pinned Playwright 1.58.2 required.');
await mkdir(repository + '/test-results', { recursive: true });
await mkdir(attemptDirectory); // Exclusive: a previous attempt is never replaced or retried.

const started = performance.now();
const report = {
  status: 'running',
  startedUtc: new Date().toISOString(),
  repository,
  commit: source.commit,
  workflowCommit: process.env.GITHUB_SHA || null,
  workflowRunId: process.env.GITHUB_RUN_ID || null,
  sourceManifestSha256: hash(sourceBytes),
  buildManifestSha256: hash(await readFile(buildManifest)),
  node: { executable: process.execPath, version: process.version },
  playwright: { cli, version: testPackage.version },
  browser: {
    selection:
      'Repository default: pinned Playwright headless Chromium and original software-rendering arguments',
  },
  database: { topology: 'loopback', host: database.hostname, port: database.port || '5432' },
  testTimeoutMs: 60_000,
  defaultAssertionTimeoutMs: 5_000,
  retries: 0,
  outerProcessLimitMs: 180_000,
  additionalJevUsd: 0,
  cumulativeJevUsd: 0,
  inheritedProviderCredentials: false,
};
const args = [
  cli,
  'test',
  '--config',
  profileDirectory + 'playwright.config.mjs',
  '--workers=1',
  '--retries=0',
];
report.command = { executable: process.execPath, args, cwd: repository };
await writeFile(attemptDirectory + '/launch.json', JSON.stringify(report, null, 2) + '\n', {
  flag: 'wx',
});
// Preserve only runtime/path settings. No .env file or inherited provider secret
// reaches the test worker; its native config also explicitly sets AI budget zero.
const env = {};
for (const key of [
  'PATH',
  'HOME',
  'TMPDIR',
  'TMP',
  'TEMP',
  'LD_LIBRARY_PATH',
  'XDG_CACHE_HOME',
  'PLAYWRIGHT_BROWSERS_PATH',
  'RUNNER_TRACKING_ID',
])
  if (process.env[key] !== undefined) env[key] = process.env[key];
Object.assign(env, {
  AI_BUDGET_USD: '0',
  OPENLEGEND_TEST_DATABASE_URL: database.toString(),
  CI: '1',
  FORCE_COLOR: '0',
});
// Preserve GitHub's non-secret process-ownership marker so its normal job
// cleanup can identify descendants even if the bounded launcher is interrupted.
const output = await open(attemptDirectory + '/playwright.log', 'wx');
const child = spawn(process.execPath, args, {
  cwd: repository,
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
});
const outcomePromise = new Promise((resolve) => {
  child.once('error', (error) => resolve({ spawnError: String(error) }));
  child.once('close', (code, signal) => resolve({ exitCode: code, signal }));
});
const logLimit = 4 * 1024 * 1024;
let logBytes = 0;
let logChain = Promise.resolve();
const receive = (chunk) => {
  const available = Math.max(0, logLimit - logBytes);
  const bytes = chunk.subarray(0, available);
  logBytes += bytes.length;
  if (chunk.length > bytes.length) report.logTruncated = true;
  if (bytes.length)
    logChain = logChain
      .then(() => output.writeFile(bytes))
      .catch((error) => {
        report.logWriteError = String(error);
      });
};
child.stdout.on('data', receive);
child.stderr.on('data', receive);
const stopOwnedGroup = (signal) => {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== 'ESRCH') report.processStopError = String(error);
  }
};
let killTimer;
const deadline = setTimeout(() => {
  report.outerDeadlineReached = true;
  report.cleanupUncertain = true;
  stopOwnedGroup('SIGTERM');
  killTimer = setTimeout(() => stopOwnedGroup('SIGKILL'), 5_000);
}, 180_000);
const outcome = await outcomePromise;
clearTimeout(deadline);
clearTimeout(killTimer);
await logChain;
await output.close();
Object.assign(report, outcome, {
  status: 'finished',
  elapsedMs: performance.now() - started,
  finishedUtc: new Date().toISOString(),
  logBytes,
});
try {
  await verifyFiles(source.files);
  await verifyFiles(build.files);
  if (
    JSON.stringify(await listBuild()) !==
    JSON.stringify(build.files.map((entry) => entry.path).sort())
  )
    throw new Error('Compiled file set changed during observation.');
  report.sourceAndBuildUnchanged = true;
} catch (error) {
  report.sourceAndBuildUnchanged = false;
  report.inputVerificationError = String(error);
}
await writeFile(attemptDirectory + '/result.json', JSON.stringify(report, null, 2) + '\n', {
  flag: 'wx',
});
console.log(
  JSON.stringify({
    exitCode: outcome.exitCode,
    signal: outcome.signal,
    outerDeadlineReached: report.outerDeadlineReached || false,
    sourceAndBuildUnchanged: report.sourceAndBuildUnchanged,
    output: attemptDirectory,
  }),
);
process.exitCode =
  outcome.exitCode === 0 && report.sourceAndBuildUnchanged && !report.outerDeadlineReached ? 0 : 1;
