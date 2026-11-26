import assert from 'node:assert/strict';
import { execFileSync, fork, spawn, type ChildProcess } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createReadStream, readFileSync } from 'node:fs';
import { mkdir, realpath, symlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { digest } from '../../apps/server/src/content-digest.js';
import { AuthorityRepository } from '../../apps/server/src/authority.js';
import { prepareWorldForStartup } from '../../apps/server/src/initial-world-preparation.js';
import { IntegrationValues } from '../../apps/server/src/integration-values.js';
import { PostgresDatabase } from '../../apps/server/src/postgres.js';
import { initializeCollisionRuntime } from '../../packages/spatial/src/rapier.js';
import type { GameView } from '@open-legend/protocol';
import { createDisposableDatabase } from '../disposable-postgres.mjs';
import { writeRustGameServerStorage } from '../rust-game-server-storage.js';
import { writeOpeningRecords } from '../rust-opening-records.js';
import {
  movementIntervalMs,
  movementOffsetMs,
  type SustainedClientMessage,
  type SustainedClientResult,
  type SustainedClientSettings,
  type SustainedPlayer,
} from './witness-sustained-client-contract.js';
import {
  assertWorkerPostgresDatabase,
  readVerifiedWorkerPostgres,
  readVerifiedWorkerSource,
} from './rust-profile/managed-postgres.js';
import { summarizeClock, type HealthProbe } from './witness-sustained-clock.js';
import { actorActivity, observeSaves } from './witness-sustained-saves.js';
import { stageSustainedDriver } from './witness-sustained-driver.js';
import { createSustainedHttp, type SustainedHttpWrite } from './witness-sustained-http.js';
import { createSustainedNormalOpening } from './witness-sustained-normal.js';
import { createSustainedCrowdOpening } from './witness-sustained-opening.js';

const [
  scenario,
  count,
  duration,
  output,
  executable,
  language,
  browser,
  archive,
  layout = 'dense',
  ...extra
] = process.argv.slice(2);
const playerCount = Number(count);
const seconds = Number(duration);
if (
  (scenario !== 'normal' && scenario !== 'crowd') ||
  (playerCount !== 1 && playerCount !== 25) ||
  !Number.isSafeInteger(seconds) ||
  seconds < 8 ||
  seconds > 300 ||
  !output ||
  !executable ||
  !language ||
  !browser ||
  !archive ||
  (layout !== 'dense' && layout !== 'districts') ||
  (layout === 'districts' && scenario !== 'crowd') ||
  extra.length
)
  throw new Error(
    'Usage: witness-sustained.ts normal|crowd 1|25 SECONDS NEW_OUTPUT RUST_EXECUTABLE LANGUAGE_DIR BROWSER_DIR DRIVER_TAR_GZ [dense|districts]',
  );
const admin =
  process.env['OPENLEGEND_BUILD_DATABASE_ADMIN_URL'] ??
  process.env['OPEN_LEGEND_PROFILE_POSTGRES_URL'];
assert(admin, 'Supply the explicit loopback PostgreSQL administrative URL.');
const pgWitness = process.env['OPENLEGEND_JOB_POSTGRES_OWNERSHIP'];
const executionManifest = process.env['OPENLEGEND_VERIFICATION_MANIFEST'];
const managed = executionManifest ? await readVerifiedWorkerSource(executionManifest) : undefined;
const directory = resolve(output);
const driverDirectory = join(directory, 'driver');
await mkdir(directory, { mode: 0o700 });
await mkdir(driverDirectory);
await stageSustainedDriver(archive, driverDirectory, {
  provider: scenario === 'normal',
  resources: Boolean(pgWitness && managed),
});

const root = process.cwd();
const executablePath = await realpath(executable);
const executableHash = createHash('sha256');
for await (const bytes of createReadStream(executablePath)) executableHash.update(bytes);
const warmupSeconds = seconds < 60 ? 5 : 10;

const providerUsd = 0;
const now = () => performance.timeOrigin + performance.now();
function bounded<T>(promise: Promise<T>, message: string, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(Error(message)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  void promise.catch(() => {});
  return { promise, resolve, reject };
}

const accounts = Array.from({ length: playerCount }, (_, i) =>
  i === 0 ? 'local-player' : 'sustained-player-' + (i + 1),
);
await initializeCollisionRuntime();
const opening =
  scenario === 'normal'
    ? createSustainedNormalOpening(playerCount, accounts)
    : { ...createSustainedCrowdOpening(playerCount, accounts, layout), constructionSeeds: [] };

const { world, playerIds, npcIds, animalIds, routes, rootObjectCount } = opening;
assert.equal(playerIds.length, playerCount);
const clockRatio = world.timePolicy?.normalGameSecondsPerSecond;
assert.equal(clockRatio, 60);
const constructionSeeds = opening.constructionSeeds;
const talkAt =
  scenario === 'normal' ? [4, 4.25, 4.5, 60, 120, 180, 240].filter((s) => s < seconds) : [];
const warmupMs = warmupSeconds * 1000;
const measuredMs = seconds * 1000;
function scheduledMovesBefore(index: number, relativeMs: number) {
  return Math.max(0, Math.ceil((relativeMs - movementOffsetMs(index)) / movementIntervalMs));
}
const expectedWarm = playerIds.map((_, index) => scheduledMovesBefore(index, warmupMs));
const expectedMeasured = expectedWarm.map(
  (warm, index) => scheduledMovesBefore(index, warmupMs + measuredMs) - warm,
);
const report: Record<string, unknown> = {
  source:
    managed?.commit ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceCheckoutDirty: managed
    ? undefined
    : Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()),
  executableSha256: executableHash.digest('hex'),
  configuration: {
    scenario,
    layout: scenario === 'crowd' ? layout : undefined,
    seconds,
    warmupSeconds,
    movementMs: movementIntervalMs,
    talkAt,
    providerUsd,
    baseGameSecondsPerRealSecond: clockRatio,
    playerCount,
    npcCount: npcIds.length,
    animalCount: animalIds.length,
    rootObjectCount,
    expectedWarmMoves: expectedWarm.reduce((sum, count) => sum + count, 0),
    expectedMeasuredMoves: expectedMeasured.reduce((sum, count) => sum + count, 0),
    playerIds,
    npcIds,
    animalIds,
    routes,
  },
};
const reportFile = join(directory, 'result.json');
const writeReport = () => writeFile(reportFile, JSON.stringify(report, null, 2));
const owned = await createDisposableDatabase(admin);
report['disposableDatabase'] = { ...owned.details, removed: false };
const database = new URL(owned.url);
database.searchParams.set('sslmode', 'disable');
let server: ChildProcess | undefined;
let client: ChildProcess | undefined;
let serverExit: Promise<unknown[]> | undefined;
let clientExit: Promise<unknown[]> | undefined;
let operatorHttp: ReturnType<typeof createSustainedHttp> | undefined;
let observer: PostgresDatabase | undefined;
let provider:
  | {
      certPath: string;
      close(): Promise<void>;
      summary(): { heldRequests: number; exchanges: unknown[]; problems: unknown[] };
    }
  | undefined;
let stdout = '';
let stderr = '';
let clientStderr = '';
let stoppingFixture = false;
const interrupt = new AbortController();
const stop = () => interrupt.abort(Error('Fixture interrupted'));
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
const interrupted = new Promise<never>((_, reject) =>
  interrupt.signal.addEventListener('abort', () => reject(interrupt.signal.reason), { once: true }),
);
void interrupted.catch(() => {});
const measurement = new AbortController();
const measurementSignal = AbortSignal.any([interrupt.signal, measurement.signal]);
const until = async (at: number) => {
  while (now() < at) await delay(Math.max(1, at - now()), undefined, { signal: measurementSignal });
  measurementSignal.throwIfAborted();
};
const guarded = <T>(promise: Promise<T>) => Promise.race([promise, interrupted]);

try {
  const setupAt = now();
  const bindings = playerIds.map((actorId, index) => ({
    issuer: index === 0 ? 'https://local.openlegend.invalid' : 'https://fixture.openlegend.invalid',
    subject: accounts[index]!,
    accountId: accounts[index]!,
    actorId,
    capabilities:
      index === 0 ? (['play', 'create', 'inspect', 'save'] as const) : (['play'] as const),
  }));
  // The large startup validation is synchronous. Finish it before starting
  // the database adapter's connection deadline.
  const initial = prepareWorldForStartup(
    { world, speed: 1, manuallyPaused: true },
    new Map(bindings.map((binding) => [binding.actorId, binding.accountId])),
    constructionSeeds,
    false,
    [],
  );
  const seed = new PostgresDatabase(database.href);
  const tokens: string[] = [];
  try {
    await writeOpeningRecords(seed, initial);
    await seed.transaction(async () => {
      const authority = new AuthorityRepository(seed);
      for (const binding of bindings) {
        await authority.provision(world.id, {
          ...binding,
          capabilities: [...binding.capabilities],
        });
        tokens.push((await authority.login(binding, Date.now(), 3_600_000)).token);
      }
      for (const permission of constructionSeeds) await authority.seedConstruction(permission);
      await new IntegrationValues(seed).put(
        'world-timeline:' + world.id,
        'eb0b4512-1bb7-431c-85ab-18065251efcd',
      );
    });
  } finally {
    await seed.close();
  }
  const release = join(directory, 'release');
  await writeRustGameServerStorage(release, database.href, undefined, true);
  await symlink(await realpath(language), join(release, 'language'));
  await symlink(await realpath(browser), join(release, 'browser'));
  const providerSettings: { macrofoldUrl?: string; macrofoldKey?: string } = {};
  if (scenario === 'normal') {
    const { startTypedProvider } = await import(
      pathToFileURL(join(driverDirectory, 'typed-provider.mts')).href
    );
    provider = await startTypedProvider({
      caseName: 'Sustained normal speech with held model requests',
      config: providerSettings,
      holdRequests: true,
    });
    assert.equal(new URL(providerSettings.macrofoldUrl!).hostname, '127.0.0.1');
  }
  const listening = deferred<string>();
  const launchAt = now();
  server = spawn(executablePath, ['serve', release], {
    env: {
      PATH: '/usr/bin:/bin',
      LANG: 'C.UTF-8',
      PORT: '0',
      OPEN_LEGEND_DATABASE_URL: database.href,
      OPEN_LEGEND_DATA_DIR: join(directory, 'runtime'),
      OPEN_LEGEND_HOST: '127.0.0.1',
      OPEN_LEGEND_AUTH_MODE: 'local',
      // The plain Speak command checks one interactive allowance even when
      // it has no NPC recipient. Reserve only that allowance for this
      // disposable account. Any hosted inference is held at loopback.
      AI_BUDGET_USD: provider ? '0.525' : '0',
      ...(provider && {
        MACROFOLD_API_KEY: providerSettings.macrofoldKey,
        MACROFOLD_BASE_URL: providerSettings.macrofoldUrl,
        SSL_CERT_FILE: provider.certPath,
        JEV_INPUT_USD_PER_MILLION: '0',
        JEV_CALL_RESERVE_USD: '0.005',
        MACROFOLD_RUN_MAX_USD: '0.25',
        EMBEDDING_CALL_RESERVE_USD: '0.01',
      }),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.on('error', listening.reject);
  server.stdout!.on('data', (bytes: Buffer) => {
    stdout = (stdout + bytes).slice(-64_000);
    const address = /OpenLegend listening on (127\.0\.0\.1:\d+)\n/.exec(stdout)?.[1];
    if (address) listening.resolve('http://' + address);
  });
  server.stderr!.on('data', (bytes: Buffer) => {
    stderr = (stderr + bytes).slice(-64_000);
  });
  serverExit = once(server, 'close');
  void serverExit.then(
    (outcome) => listening.reject(Error('Server exited at startup: ' + JSON.stringify(outcome))),
    listening.reject,
  );
  const base = await guarded(
    bounded(listening.promise, 'Server did not open its listener', 120_000),
  );
  report['setup'] = { fixturePreparationMs: launchAt - setupAt, listenMs: now() - launchAt };
  observer = new PostgresDatabase(database.href, true);
  const saves = observeSaves(observer, world.id, now);
  const actors = [...playerIds, ...npcIds, ...animalIds];
  const initialSave = await saves.activity(actors);

  const http = (operatorHttp = createSustainedHttp(base, 'sustained-workload-operator', 4, 25_000));
  const operatorSession = { cookie: 'ol_session=' + tokens[0], clientId: 'sustained-tab-0' };
  async function operatorRequest<T>(
    path: string,
    write?: SustainedHttpWrite,
    signal = interrupt.signal,
  ): Promise<T> {
    const { status, result } = await http.request<T>(operatorSession, path, write, signal);
    assert(status >= 200 && status < 300, path + ' ' + status + ' ' + JSON.stringify(result));
    return result;
  }
  const resourceSamples: object[] = [];
  const resourceErrors: { scheduledAt: number; error: string }[] = [];
  let resources: { ticksPerSecond: number; sample(scheduledAt: number): void } | undefined;
  let resourceUnavailable: string | undefined = 'No verified managed PostgreSQL ownership receipt.';
  if (pgWitness && managed) {
    try {
      assertWorkerPostgresDatabase(database);
      const { cgroup } = await readVerifiedWorkerPostgres(pgWitness, managed.execution);
      const pgRoot = '/sys/fs/cgroup' + cgroup;
      const accounting = await import(
        pathToFileURL(join(driverDirectory, 'linux-process-accounting.mjs')).href
      );
      const caseGroup: string = accounting.caseCgroup();
      assert(
        pgRoot !== caseGroup &&
          !pgRoot.startsWith(caseGroup + '/') &&
          !caseGroup.startsWith(pgRoot + '/'),
        'PostgreSQL and case resource scopes must be separate.',
      );
      const ticksPerSecond = Number(execFileSync('getconf', ['CLK_TCK']));
      const pageBytes = Number(execFileSync('getconf', ['PAGESIZE']));
      assert(ticksPerSecond > 0 && pageBytes > 0, 'Process accounting units are unavailable.');
      resources = {
        ticksPerSecond,
        sample(scheduledAt) {
          const at = now();
          const owners = accounting.sampleProcessOwners(caseGroup, pageBytes, {
            application: server!.pid,
            browser: client!.pid,
            harness: process.pid,
          });
          assert(
            owners.application?.members.length === 1,
            'The sampled server must remain a standalone process.',
          );
          const cpuMicroseconds = Number(
            /^usage_usec (\d+)$/m.exec(readFileSync(join(pgRoot, 'cpu.stat'), 'utf8'))?.[1],
          );
          const memoryBytes = Number(readFileSync(join(pgRoot, 'memory.current'), 'utf8'));
          assert(Number.isFinite(cpuMicroseconds) && Number.isFinite(memoryBytes));
          resourceSamples.push({
            scheduledAt,
            at,
            ...owners,
            postgres: { cpuMicroseconds, memoryBytes },
            concurrentServerPostgresBytes: owners.application.rss + memoryBytes,
          });
        },
      };
      resourceUnavailable = undefined;
    } catch (error) {
      resourceUnavailable = String(error);
    }
  }
  report['resources'] = {
    available: Boolean(resources),
    unavailableReason: resourceUnavailable,
    ticksPerSecond: resources?.ticksPerSecond,
    samples: resourceSamples,
    errors: resourceErrors,
  };

  const players: SustainedPlayer[] = bindings.map((binding, index) => ({
    accountId: binding.accountId,
    actorId: binding.actorId,
    cookie: 'ol_session=' + tokens[index],
    clientId: 'sustained-tab-' + index,
    destinations: routes[index]!,
  }));
  const booted = deferred<void>();
  const ready = deferred<string[]>();
  const clockStarted = deferred<{ receivedAt: number; gameSeconds: number }>();
  const finished = deferred<SustainedClientResult>();
  const offeredEnd = deferred<{ offeredAtUnixMs: number; observedAtUnixMs: number }>();
  client = fork(fileURLToPath(new URL('./witness-sustained-client.ts', import.meta.url)), [], {
    execArgv: ['--import', 'tsx'],
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    env: { PATH: process.env['PATH'], TSX_TSCONFIG_PATH: join(root, 'tsconfig.json') },
  });
  client.on('message', (message: SustainedClientMessage) => {
    if ('booted' in message) booted.resolve();
    else if ('ready' in message) ready.resolve(message.commandEpochs);
    else if ('clockStarted' in message) clockStarted.resolve(message.clockStarted);
    else if ('result' in message) finished.resolve(message.result);
    else if ('offeredEnd' in message) offeredEnd.resolve(message.offeredEnd);
    else {
      report['firstStreamFailure'] ??= message.streamFailure;
      if (!startedOffering)
        clientFailure(Error('A signed stream closed before the workload started.'));
    }
  });
  function clientFailure(error: unknown) {
    for (const waiter of [booted, ready, clockStarted, finished, offeredEnd]) waiter.reject(error);
  }
  let startedOffering = false;
  void serverExit.then((outcome) => {
    if (stoppingFixture) return;
    if (!startedOffering) {
      clientFailure(
        Error('Rust server exited before the workload started: ' + JSON.stringify(outcome)),
      );
    } else if (client?.connected) {
      report['prematureServerExit'] = outcome;
      client.send({ stop: true });
    }
  }, clientFailure);
  client.on('error', clientFailure);
  client.stderr!.on('data', (bytes: Buffer) => {
    clientStderr = (clientStderr + bytes).slice(-64_000);
  });
  clientExit = once(client, 'close');
  void clientExit.then(([code, signal]) => {
    if (code !== 0) clientFailure(Error('Signed client exited: ' + [code, signal].join('/')));
  }, clientFailure);
  await guarded(bounded(booted.promise, 'Signed client failed to load', 30_000));
  const clientSettings: SustainedClientSettings = {
    root,
    driverDirectory,
    base,
    players,
    measuring: Boolean(resources),
  };
  client.send(clientSettings);
  const commandEpochs = await guarded(
    bounded(ready.promise, 'Signed clients did not all receive their initial views', 180_000),
  );
  assert.equal(commandEpochs.length, playerCount);
  const operator = await operatorRequest<GameView>('/api/state');
  const generation = operator.historyEpoch?.split(':')[0];
  assert(operator.access?.controlling && generation, 'Expected a controlling signed player view.');
  const operatorAuthority = { generation, scope: operator.access.scope };
  report['allStreamsReadyMs'] = now() - launchAt;
  const resumeRequestedAt = now();
  assert(
    (
      await operatorRequest<{ ok: boolean }>('/api/control', {
        authority: operatorAuthority,
        body: {
          paused: false,
          clientId: operatorSession.clientId,
        },
      })
    ).ok,
    'The clock did not resume.',
  );

  report['resumeRequestedAt'] = resumeRequestedAt;
  const firstProgress = await guarded(
    bounded(
      clockStarted.promise,
      'Clock resumed but the primary stream never showed one elapsed game second',
      120_000,
    ),
  );
  report['firstProgress'] = firstProgress;
  const began = Math.ceil(now() + 750);
  const start = began + warmupMs;
  const end = start + measuredMs;
  startedOffering = true;
  client.send({ go: true, began, start, end });
  report['start'] = start;
  report['end'] = end;

  const health: HealthProbe[] = [];
  const speech: {
    scheduledAt: number;
    at: number;
    completedAt: number;
    commandId?: string;
    ok?: boolean;
    error?: string;
  }[] = [];
  const probes = async () => {
    // Only sample completed observations. A delayed probe cannot create
    // an overlapping queue of host status requests.
    const targets = [start];
    for (let target = start + 60_000; target < end; target += 60_000) targets.push(target);
    targets.push(end);
    for (const target of targets) {
      if (now() > end + 100) break;
      await until(target);
      const sample: HealthProbe = { scheduledAt: target, at: now() };
      health.push(sample);
      try {
        const { runtime } = await operatorRequest<{ runtime: object }>(
          '/api/performance',
          undefined,
          measurementSignal,
        );
        Object.assign(sample, runtime, { receivedAt: now() });
      } catch (error) {
        Object.assign(sample, { receivedAt: now(), error: String(error) });
      }
    }
  };
  const speak = async (offset: number) => {
    const scheduledAt = start + offset * 1000;
    await until(scheduledAt);
    const at = now();
    if (at >= end) {
      speech.push({ scheduledAt, at, completedAt: at, error: 'late-skipped' });
      return;
    }
    const commandId = randomUUID();
    try {
      const response = await operatorRequest<{ ok: boolean }>(
        '/api/command',
        {
          authority: operatorAuthority,
          body: {
            commandId,
            commandEpoch: operator.commandEpoch,
            command: { type: 'say', volume: 'normal', text: 'I am walking along the wayside.' },
          },
        },
        measurementSignal,
      );
      speech.push({ scheduledAt, at, completedAt: now(), commandId, ...response });
    } catch (error) {
      speech.push({ scheduledAt, at, completedAt: now(), commandId, error: String(error) });
    }
  };
  const sampleResources = async () => {
    if (!resources) return;
    for (let target = start; target <= end; target += 1000) {
      await until(target);
      // A delayed parent skips expired ticks instead of scanning /proc in
      // a catch-up burst while clients are still offering input.
      if (now() - target >= 1000 || now() >= end + 250) continue;
      try {
        resources.sample(target);
      } catch (error) {
        resourceErrors.push({ scheduledAt: target, error: String(error) });
      }
    }
  };
  const savedMotionCuts: (Awaited<ReturnType<typeof saves.motion>> & { target: number })[] = [];
  const motionObservationErrors: { target: number; error: string }[] = [];
  const motionTask = (async () => {
    const observedIds = [...npcIds, ...animalIds];
    const targets = seconds >= 60 ? [start, end - 30_000] : [start];
    for (const target of targets) {
      try {
        await until(target);
        savedMotionCuts.push({ target, ...(await saves.motion(observedIds)) });
      } catch (error) {
        if (measurementSignal.aborted) return;
        motionObservationErrors.push({ target, error: String(error) });
      }
    }
  })();
  const resourceTask = sampleResources();
  void resourceTask.catch(() => {});
  const probeTask = probes();
  const speechTask = Promise.allSettled(talkAt.map(speak));
  void probeTask.catch(() => {});
  report['health'] = health;
  report['speech'] = speech;
  const observedEnd = await guarded(
    bounded(
      offeredEnd.promise,
      'Signed client did not reach the scheduled end',
      (seconds + warmupSeconds + 30) * 1000,
    ),
  );
  const earlyClientEnd = observedEnd.offeredAtUnixMs < end;
  report['observedEnd'] = observedEnd;
  if (earlyClientEnd) measurement.abort();
  if (resources) {
    try {
      if (!earlyClientEnd) await resourceTask;
    } catch (error) {
      report['resourceObservationError'] = String(error);
    } finally {
      client.send({ finalResourceCutTaken: true });
    }
  }
  const result = await guarded(
    bounded(finished.promise, 'Signed client did not return its observations', 45_000),
  );
  await Promise.allSettled([probeTask, speechTask, motionTask]);

  const keysById = new Map<string, string>();
  function selectReceipt(accountIndex: number, commandId: string) {
    const key =
      'gameplay:' +
      accounts[accountIndex] +
      ':' +
      commandEpochs[accountIndex] +
      ':' +
      digest(commandId);
    keysById.set(key, commandId);
  }
  for (const [index, player] of result.pockets.entries())
    for (const command of player.commands)
      if (command.sent) selectReceipt(index, command.commandId);
  for (const attempt of speech) if (attempt.commandId) selectReceipt(0, attempt.commandId);

  // The read observes one committed prefix after the client drains. The
  // receipt census cannot assign a commit to the nominal cutoff.
  const liveAtFinalRead = server.exitCode === null && server.signalCode === null;
  const final = await saves
    .activity(actors, { receiptKeys: [...keysById.keys()], modelJobs: Boolean(provider) })
    .catch((error: unknown) => {
      report['saveObservationError'] = String(error);
      return undefined;
    });
  const persisted =
    final && new Map(final.savedReceipts.map(({ id, ok }) => [keysById.get(id)!, ok]));
  function savedEvidence(commandId: string | undefined) {
    const savedAccepted = commandId ? persisted?.get(commandId) : undefined;
    return {
      durableBeforeShutdown: commandId && persisted ? savedAccepted !== undefined : undefined,
      savedAccepted,
    };
  }
  report['speech'] = speech.map((attempt) => ({
    ...attempt,
    ...savedEvidence(attempt.commandId),
  }));

  const cutoff = observedEnd.offeredAtUnixMs;
  const progress = summarizeClock(result.clock, health, start, end, cutoff, clockRatio);
  report['progress'] = progress;

  const npcActivity = final && actorActivity(npcIds, initialSave.roster, final.roster);
  const animalActivity = final && actorActivity(animalIds, initialSave.roster, final.roster);
  const lastMotion = savedMotionCuts.at(-1);
  const placementChangesSinceLastCut = (ids: readonly string[]) =>
    ids.filter((id) => {
      const revision = lastMotion?.placementRevisions[id];
      const saved = final?.roster.get(id);
      return revision !== undefined && saved && saved.placementRevision > revision;
    });
  report['activity'] = {
    initialSave: initialSave.save,
    finalSave: final && { ...final.save, liveAtFinalRead },
    savedMotionCuts,
    motionObservationErrors,
    movementAfterLastCut: final &&
      lastMotion && {
        from: lastMotion.save,
        to: final.save,
        npcs: placementChangesSinceLastCut(npcIds),
        animals: placementChangesSinceLastCut(animalIds),
      },
    backgroundJobs: final?.backgroundJobs,
    players: final && actorActivity(playerIds, initialSave.roster, final.roster),
    npcs: npcActivity,
    animals: animalActivity,
  };
  const providerResult = provider?.summary();
  if (providerResult) {
    const { exchanges, heldRequests, problems } = providerResult;
    report['provider'] = { completedExchanges: exchanges.length, heldRequests, problems };
  }

  const defaults = {
    scheduled: 0,
    sent: 0,
    accepted: 0,
    acknowledgedBeforeCutoff: 0,
    warmupDispatches: 0,
    streamedMotion: 0,
    saved: persisted ? 0 : undefined,
  };
  const totals = { sent: 0, accepted: 0, savedBeforeShutdown: persisted ? 0 : undefined };
  const inMeasuredWindow = (at: number) => at >= start && at < cutoff;
  const playerReports = result.pockets.map((player) => {
    const measured = { ...defaults };
    measured.scheduled = player.lateness.filter(
      (slot) => slot.kind === 'movement' && slot.scheduledAt >= start && slot.scheduledAt < end,
    ).length;
    const commands = player.commands.map((command) => {
      const scheduledInWindow = command.scheduledAt >= start && command.scheduledAt < end;
      const dispatchedInWindow = command.sent && inMeasuredWindow(command.at);
      const acknowledgedBeforeCutoff =
        dispatchedInWindow && command.ok && command.completedAt < cutoff;
      const durable = savedEvidence(command.sent ? command.commandId : undefined);
      if (command.sent) totals.sent++;
      if (command.ok) totals.accepted++;
      if (durable.savedAccepted) totals.savedBeforeShutdown!++;
      if (dispatchedInWindow) {
        measured.sent++;
        if (!scheduledInWindow) measured.warmupDispatches++;
        if (command.ok) measured.accepted++;
        if (acknowledgedBeforeCutoff) measured.acknowledgedBeforeCutoff++;
        if (command.firstStreamMovementAt !== undefined) measured.streamedMotion++;
        if (durable.savedAccepted) measured.saved!++;
      }
      return {
        ...command,
        scheduledInWindow,
        measured: dispatchedInWindow,
        acknowledgedBeforeCutoff,
        ...durable,
        firstStreamMovementMs:
          command.firstStreamMovementAt === undefined
            ? undefined
            : command.firstStreamMovementAt - command.at,
        commandResponseMs:
          command.status === undefined ? undefined : command.completedAt - command.at,
      };
    });
    return { ...player, commands, measured };
  });
  report['players'] = playerReports;
  report['commandTotals'] = totals;
  const allPlayers =
    playerReports.length === playerCount &&
    playerReports.every((player, index) => player.actorId === playerIds[index]);
  const coverage = {
    fullMeasurementWindow: !earlyClientEnd,
    oneTimesClockConfirmed:
      progress.samples.length > 0 &&
      progress.samples.every((sample) => sample.speed === 1) &&
      health.every(
        (sample) => sample.configuredSpeed === undefined || sample.configuredSpeed === 1,
      ),
    allMeasuredMovesSent:
      allPlayers &&
      playerReports.every(
        (player, index) =>
          player.measured.sent === expectedMeasured[index] &&
          player.measured.warmupDispatches === 0,
      ),
    allMeasuredMovesAccepted:
      allPlayers &&
      playerReports.every(
        (player, index) =>
          player.measured.accepted === expectedMeasured[index] &&
          player.measured.warmupDispatches === 0,
      ),
    everyPlayerObservedInMotion:
      allPlayers && playerReports.every((player) => player.measured.streamedMotion > 0),
    everyStreamShowedPositionChange:
      allPlayers && playerReports.every((player) => player.streamObservedPositionChange),
    everyStreamDeliveredMeasuredPatches:
      allPlayers && playerReports.every((player) => player.measuredPatchFrames > 0),
    everyStreamClosedNormally:
      allPlayers && playerReports.every((player) => player.stream.close.reason === 'disconnect'),
    crowdWorkDurationQualified: scenario === 'crowd' ? false : undefined,
  };
  report['coverage'] = coverage;

  assert(coverage.fullMeasurementWindow, 'The workload ended before its measured cutoff.');
  assert(
    coverage.oneTimesClockConfirmed,
    'The stream did not confirm the 1× clock in the measured window.',
  );
  assert(
    coverage.everyStreamDeliveredMeasuredPatches && coverage.everyStreamClosedNormally,
    'At least one player did not receive measured update patches or its stream closed early.',
  );
  assert(
    playerReports.every((player) => player.measured.accepted > 0),
    'At least one player did not receive acceptance for a movement sent in the measured window.',
  );
  assert(
    coverage.everyPlayerObservedInMotion,
    'At least one player lacked an action-correlated movement update in the measured window.',
  );
  if (seconds === 300)
    assert(
      coverage.allMeasuredMovesSent && coverage.allMeasuredMovesAccepted,
      'At least one movement slot was missed or refused in the five-minute case.',
    );
  assert(
    final &&
      final.save.revision > initialSave.save.revision &&
      final.save.gameSeconds > initialSave.save.gameSeconds &&
      playerReports.some((player) => (player.measured.saved ?? 0) > 0),
    'Ordinary saves did not show both game progress and acceptance of a measured move.',
  );
  if (scenario === 'crowd')
    assert(npcActivity?.placementAdvanced.length, 'No independent NPC movement became durable.');
  assert(
    animalActivity &&
      (animalActivity.placementAdvanced.length || animalActivity.behaviorChanged.length),
    'No native animal activity became durable.',
  );
  if (providerResult) {
    assert.equal(
      providerResult.exchanges.length,
      0,
      'The held provider unexpectedly completed model work.',
    );
    assert.equal(providerResult.problems.length, 0);
    assert(
      speech.length === talkAt.length &&
        speech.every(
          (attempt) =>
            attempt.ok && attempt.commandId && persisted?.get(attempt.commandId) === true,
        ),
      'At least one scheduled speech request did not reach an ordinary save.',
    );
  }
} catch (error) {
  report['failure'] = error instanceof Error ? error.stack : String(error);
  if (error instanceof Error) {
    const cause = error.cause;
    const leaves = cause instanceof AggregateError ? cause.errors : [cause];
    report['failureCauses'] = leaves.filter(Boolean).map((value: unknown) =>
      String(value)
        .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[PostgreSQL URL]')
        .slice(0, 1000),
    );
  }
  process.exitCode = 1;
} finally {
  stoppingFixture = true;
  interrupt.abort();
  operatorHttp?.stop();
  try {
    // Disconnect held requests after the measurement and before asking the
    // Rust listener to drain and close. Each owner still gets its cleanup.
    const providerCleanup = await Promise.allSettled([provider?.close()]);
    const outcomes = await Promise.allSettled(
      [
        [client, clientExit],
        [server, serverExit],
      ].map(async ([child, exited]) => {
        if (!child || !exited) return;
        const processChild = child as ChildProcess;
        const done = exited as Promise<unknown[]>;
        if (processChild.exitCode === null && processChild.signalCode === null)
          processChild.kill('SIGTERM');
        try {
          return await bounded(done, 'Fixture process failed to stop', 15_000);
        } catch {
          processChild.kill('SIGKILL');
          return await bounded(done, 'Fixture process could not be reaped', 5_000);
        }
      }),
    );
    report['shutdown'] = outcomes;
    const connections = await Promise.allSettled([observer?.close()]);
    const databaseCleanup = await Promise.allSettled([owned.close()]);
    if (databaseCleanup[0]?.status === 'fulfilled')
      report['disposableDatabase'] = { ...owned.details, removed: true };
    const failures = [...providerCleanup, ...outcomes, ...connections, ...databaseCleanup].filter(
      (item) => item.status === 'rejected',
    );
    if (failures.length) throw new Error(failures.map((item) => String(item.reason)).join(' | '));
    const serverOutcome = outcomes[1];
    if (
      serverOutcome?.status === 'fulfilled' &&
      serverOutcome.value &&
      serverOutcome.value[0] !== 0
    )
      throw new Error(
        'Rust server did not shut down cleanly: ' + JSON.stringify(serverOutcome.value),
      );
  } catch (error) {
    report['cleanupFailure'] = String(error);
    process.exitCode = 1;
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    await Promise.all([
      writeReport(),
      writeFile(join(directory, 'server.log'), stdout + stderr),
      writeFile(join(directory, 'client.log'), clientStderr),
    ]);
  }
}
