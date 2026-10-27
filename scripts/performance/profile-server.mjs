import { toolHttp, toolStream } from '../network.ts';
import { profilingOptions } from './profiling-options.ts';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir, cpus, loadavg } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { Session } from 'node:inspector/promises';
import { setTimeout as delay } from 'node:timers/promises';
import {
  parseScenario,
  populateScenario,
  prepareNativePressure,
  applyNativePressure,
} from './scenario.ts';
import {
  worldPosition,
  worldSupport,
  observeDomainCounters,
  entityGet,
  entityKeys,
  entityValues,
} from '../../packages/domain/src/index.js';
import { initializeCollisionRuntime } from '../../packages/spatial/src/rapier.js';
import { createGameServer } from '../../apps/server/src/http.ts';
import { readConfig } from '../../apps/server/src/config.ts';
import {
  performanceSnapshot,
  observeDurations,
  startPerformanceCapture,
} from '../../apps/server/src/performance.ts';
import { SqlGameRepository } from '../../apps/server/src/store.ts';
import { PostgresDatabase } from '../../apps/server/src/postgres.ts';
import { createDisposableDatabase } from '../disposable-postgres.mjs';

const percentile = (values, p) =>
  values.length ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1] : null;
const distribution = (values) => ({
  count: values.length,
  p50Ms: percentile(values, 0.5),
  p95Ms: percentile(values, 0.95),
  p99Ms: percentile(values, 0.99),
  maxMs: values.length ? Math.max(...values) : null,
});

/** Required workload census, separate from optional timing/counters. */
function nativePopulation(world, cohortIds) {
  const result = { animals: 0, alarms: 0, cohortAnimals: 0, cohortAlarms: 0 };
  for (const entity of entityValues(world.entities)) {
    if (!entity.animal || !entity.actor?.alive || entity.actor.controller !== 'native') continue;
    result.animals++;
    if (entity.animal.episode) result.alarms++;
    if (cohortIds.has(entity.id)) {
      result.cohortAnimals++;
      if (entity.animal.episode) result.cohortAlarms++;
    }
  }
  return result;
}

/** Workload ownership is independent of optional timing. At most one edit can
 * occupy the writer; cancellation drains it before server/database teardown. */
async function startNativePressure(service, fixture, phase) {
  if (!fixture) return;
  const positions = () =>
    fixture.kind === 'converging-people'
      ? fixture.walkers.map(({ id }) => ({
          id,
          point: { ...worldPosition(entityGet(service.world.entities, id)) },
          action: entityGet(service.world.entities, id)?.actor?.action?.type ?? null,
        }))
      : [];
  const before = positions(),
    stats = {
      kind: fixture.kind,
      scope: 'whole speed including warmup',
      attempts: 0,
      admitted: 0,
      skippedOccupied: 0,
    };
  const controller = new AbortController();
  let failure;
  const apply = async (step) => {
    stats.attempts++;
    let changed = false;
    const result = await service.transition((world) => {
      const next = applyNativePressure(world, fixture, phase, step);
      changed = next !== world;
      return {
        world: next,
        events: next.events.slice(world.events.length),
        outcome: { ok: true, code: 'profile-pressure', message: 'Explicit diagnostic workload' },
      };
    });
    if (!result.ok) throw Error(`Native pressure publication refused: ${result.code}.`);
    if (changed) stats.admitted++;
    else stats.skippedOccupied++;
  };
  if (fixture.kind === 'converging-people') await apply(0);
  const task = (async () => {
    if (fixture.kind !== 'geometry-edits') return;
    for (let step = 0; !controller.signal.aborted; step++) {
      try {
        await delay(500, undefined, { signal: controller.signal });
      } catch (error) {
        if (controller.signal.aborted) return;
        throw error;
      }
      if (!controller.signal.aborted) await apply(step);
    }
  })().catch((error) => {
    failure = error;
  });
  return {
    snapshot: () => ({
      ...stats,
      before,
      after: positions(),
      ...(fixture.kind === 'geometry-edits'
        ? {
            screen: {
              id: fixture.screen.id,
              initialBounds: fixture.screen.bounds,
              finalBounds: service.world.map.spatial.blockers.find(
                (b) => b.id === fixture.screen.id,
              )?.bounds,
              geometryRevision: service.world.map.spatial.revision,
            },
          }
        : {}),
      failure: failure ? String(failure) : null,
    }),
    async stop() {
      controller.abort();
      await task;
      if (failure) throw failure;
    },
  };
}

// Drive presence/control with the measured login's current lease. The process-local
// setup lease can become stale when HTTP entry or a restart replaces control.
async function controlWorld(base, cookie, input) {
  const view = await (await toolHttp(base + '/api/state', { headers: { cookie } })).json();
  const response = await toolHttp(base + '/api/control', {
    method: 'POST',
    headers: {
      cookie,
      origin: base,
      'content-type': 'application/json',
      'x-ol-scope': view.access.scope,
    },
    body: JSON.stringify(input),
  });
  const result = await response.json();
  if (!response.ok || !result.ok)
    throw Error(result.message ?? 'Could not control profiling world');
}
async function resumeWorld(base, cookie) {
  const view = await (await toolHttp(base + '/api/state', { headers: { cookie } })).json();
  const response = await toolHttp(base + '/api/embodiment', {
    method: 'POST',
    headers: {
      cookie,
      origin: base,
      'content-type': 'application/json',
      'x-ol-scope': view.access.scope,
    },
    body: JSON.stringify({
      id: randomUUID(),
      expectedGeneration: view.access.controlGeneration,
      operation: 'replace',
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok)
    throw Error(result.message ?? 'Could not take control of profiling fixture');
  return (await toolHttp(base + '/api/state', { headers: { cookie } })).json();
}

// A separate process keeps a busy server event loop from silently delaying the load generator.
// This is a bounded profiling workload, not a browser or live-cognition acceptance suite.
async function clientLoad() {
  const settingsReady = once(process, 'message');
  process.send({ booted: true });
  const [settings] = await settingsReady;
  const { base, cookie, epoch, position, seconds, presenceId } = settings;
  const timestamp = () => performance.timeOrigin + performance.now();
  let measuredAt,
    end = Infinity;
  const beginMeasurement = (at) => {
    measuredAt = at;
    end = at - performance.timeOrigin + seconds * 1000;
  };
  const measurementMessage = (message) => {
    if (message.measureAt !== undefined) beginMeasurement(message.measureAt);
  };
  process.on('message', measurementMessage);
  const streamAbort = new AbortController();
  const chunks = [];
  const stream = toolStream(
    base + '/api/events',
    { headers: { cookie }, signal: streamAbort.signal },
    (chunk) => chunks.push({ at: timestamp(), bytes: chunk.byteLength }),
    Math.ceil((seconds + 180) * 1000),
  );
  await stream.ready;
  const reading = stream.done.catch((error) => {
    if (!streamAbort.signal.aborted) throw error;
  });
  const go = once(process, 'message');
  process.send({ ready: true });
  const [begin] = await go;
  const start = performance.now();
  if (begin.measureAt !== undefined) beginMeasurement(begin.measureAt);
  const commands = [],
    reads = [],
    late = [],
    errors = [],
    skipped = [];
  const periodic = async (interval, operation) => {
    let due = start,
      index = 0;
    while (performance.now() < end) {
      await delay(Math.max(0, due - performance.now()));
      if (performance.now() >= end) break;
      const at = timestamp();
      late.push({ at, ms: Math.max(0, performance.now() - due) });
      try {
        await operation(index++);
      } catch (error) {
        errors.push({ at, error: String(error) });
      }
      due += interval;
      if (due < performance.now()) {
        const missed = Math.floor((performance.now() - due) / interval);
        skipped.push({ at: timestamp(), count: missed });
        due += missed * interval;
      }
    }
  };
  await Promise.all([
    periodic(3000, async (i) => {
      const response = await toolHttp(base + '/api/presence', {
        method: 'POST',
        headers: {
          cookie,
          origin: base,
          'content-type': 'application/json',
          'x-ol-scope': settings.scope,
        },
        body: JSON.stringify({ clientId: presenceId, visible: true, sequence: i + 2 }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw Error('Presence heartbeat failed');
    }),
    periodic(settings.commandIntervalMs ?? 500, async (i) => {
      const at = performance.now();
      const command =
        i % 3 === 2
          ? { type: 'cancel' }
          : { type: 'move', position: { ...position, x: position.x + (i % 2 ? 0 : 0.5) } };
      const response = await toolHttp(base + '/api/command', {
        method: 'POST',
        headers: {
          cookie,
          origin: base,
          'content-type': 'application/json',
          'x-ol-scope': settings.scope,
        },
        body: JSON.stringify({ commandId: randomUUID(), commandEpoch: epoch, command }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      commands.push({
        at: performance.timeOrigin + at,
        completedAt: timestamp(),
        ms: performance.now() - at,
        ok: response.ok && result.ok === true,
        code: result.code ?? response.status,
      });
    }),
    periodic(250, async () => {
      const at = performance.now();
      const response = await toolHttp(base + '/api/state', {
        headers: { cookie },
        signal: AbortSignal.timeout(15000),
      });
      await response.arrayBuffer();
      if (!response.ok) throw Error('State read ' + response.status);
      reads.push({
        at: performance.timeOrigin + at,
        completedAt: timestamp(),
        ms: performance.now() - at,
      });
    }),
  ]);
  streamAbort.abort();
  await reading;
  process.off('message', measurementMessage);
  const completedAt = timestamp();
  const summary = (from, until) => {
    const during = (observations) => observations.filter((v) => v.at >= from && v.at < until);
    const commandSamples = during(commands),
      streamSamples = during(chunks),
      errorSamples = during(errors);
    const codes = {};
    for (const command of commandSamples) codes[command.code] = (codes[command.code] ?? 0) + 1;
    return {
      elapsedSeconds: (until - from) / 1000,
      commands: distribution(commandSamples.filter((v) => v.ok).map((v) => v.ms)),
      rejectedCommands: distribution(commandSamples.filter((v) => !v.ok).map((v) => v.ms)),
      commandCodes: codes,
      reads: distribution(during(reads).map((v) => v.ms)),
      requestTimerLateness: distribution(during(late).map((v) => v.ms)),
      skippedIntervals: during(skipped).reduce((n, v) => n + v.count, 0),
      streamBytes: streamSamples.reduce((n, v) => n + v.bytes, 0),
      streamChunks: streamSamples.length,
      errorCount: errorSamples.length,
      errors: errorSamples.slice(0, 12).map((v) => v.error),
    };
  };
  const result = {
    measurementStartsAtUnixMs: measuredAt,
    measured: {
      ...summary(measuredAt, completedAt),
      offeredSeconds: seconds,
      requestDrainSeconds: Math.max(0, (completedAt - measuredAt) / 1000 - seconds),
      requestsStartedBeforeMeasurementAndCompletedAfter: [...commands, ...reads].filter(
        (v) => v.at < measuredAt && v.completedAt >= measuredAt,
      ).length,
    },
    ...(settings.warmupSeconds
      ? { warmup: summary(performance.timeOrigin + start, measuredAt) }
      : {}),
  };
  await new Promise((done) => process.send({ result }, done));
  process.disconnect();
}

async function startLoad(settings) {
  const child = fork(fileURLToPath(import.meta.url), ['--client'], {
    execArgv: ['--import', 'tsx'],
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
  });
  let readyResolve, resultResolve, reject;
  const ready = new Promise((resolve, fail) => {
    readyResolve = resolve;
    reject = fail;
  });
  const result = new Promise((resolve, fail) => {
    resultResolve = resolve;
    child.on('error', fail);
    child.on('exit', (code) => {
      if (code !== 0) fail(Error('Load generator exited ' + code));
    });
  });
  result.catch(() => {}); // The startup path can fail before the caller awaits the result.
  child.on('message', (message) => {
    if (message.booted) child.send(settings);
    if (message.ready) readyResolve();
    if (message.result) resultResolve(message.result);
  });
  child.on('error', reject);
  child.on('exit', (code) => {
    if (code !== 0) reject(Error('Load generator exited ' + code));
  });
  const timeout = setTimeout(() => {
    reject(Error('Load generator startup timeout'));
    child.kill();
  }, 30000);
  try {
    await ready;
  } finally {
    clearTimeout(timeout);
  }
  return { child, result };
}

function metricDelta(before, after) {
  const metrics = {};
  for (const [name, value] of Object.entries(after)) {
    if (name === 'runtime' || typeof value !== 'object' || value === null || !('count' in value))
      continue;
    const count = value.count - (before[name]?.count ?? 0);
    if (!count) continue;
    metrics[name] = {
      count,
      totalMs: value.totalMs - (before[name]?.totalMs ?? 0),
      cumulativeMaxMs: value.maxMs,
    };
  }
  const counters = {};
  for (const [name, value] of Object.entries(after.runtime?.counters ?? {}))
    counters[name] = value - (before.runtime?.counters?.[name] ?? 0);
  return { counters, gauges: after.runtime?.gauges, metrics };
}

async function main() {
  const toolOptions = profilingOptions(process.argv.slice(2));
  const appProfiling = toolOptions.enabled;
  const collectCpu = process.env.OPENLEGEND_CPU_PROFILE === '1';
  if (collectCpu && !appProfiling) throw Error('CPU capture requires application profiling.');
  const [scenarioPath, output, secondsText = '15', speedText = '1,3,8', intervalText = '500'] =
    toolOptions.arguments;
  const seconds = Number(secondsText),
    warmupSeconds = Number(process.env.OPENLEGEND_PROFILE_SERVER_WARMUP_SECONDS ?? '0'),
    commandIntervalMs = Number(intervalText),
    speeds = speedText.split(',').map(Number);
  if (
    toolOptions.arguments.length > 5 ||
    !scenarioPath ||
    !output ||
    !Number.isInteger(seconds) ||
    seconds < 5 ||
    seconds > 60 ||
    !Number.isInteger(warmupSeconds) ||
    warmupSeconds < 0 ||
    warmupSeconds > 60 ||
    !Number.isInteger(commandIntervalMs) ||
    commandIntervalMs < 25 ||
    commandIntervalMs > 1000 ||
    !speeds.length ||
    speeds.length > 3 ||
    speeds.some((n) => ![1, 3, 8].includes(n))
  )
    throw Error(
      'Usage: node --import tsx scripts/performance/profile-server.mjs SCENARIO.json NEW_REPORT.json [5..60 seconds per phase] [1,3,8] [25..1000 command interval ms] [--app-profiling=on|off]',
    );
  const scenario = parseScenario(JSON.parse(await readFile(scenarioPath, 'utf8')));
  if (scenario.input)
    throw Error('This disposable server profile takes generated scenarios, not a user save.');
  const dir = await mkdtemp(join(tmpdir(), 'openlegend-server-profile-'));
  const config = readConfig({
    ...process.env,
    OPEN_LEGEND_DATA_DIR: dir,
    OPEN_LEGEND_PROFILING: appProfiling ? 'on' : 'off',
    OPEN_LEGEND_DATABASE_URL: process.env.OPEN_LEGEND_PROFILE_POSTGRES_URL,
    AI_BUDGET_USD: '0',
    DECISION_ESCALATION_JSON: '{"mode":"off","origins":[],"reasons":[]}',
    OPENAI_API_KEY: '',
    JEV_API_KEY: '',
    MACROFOLD_API_KEY: '',
  });
  config.budgetUsd = 0;
  config.llmKey = '';
  config.jevKey = '';
  config.macrofoldKey = '';
  config.embeddingKey = '';
  const report = {
    scope:
      'Real server timer, explicit database adapter, SSE and separate-process HTTP load with presence heartbeats; no browser or live model calls. Warm-up and measurement use continuous load without an intervening pause. The warm-up ends at the next server event-loop opportunity; client metrics are attributed by request-start timestamps. Measurement includes outstanding-request drain and can overlap a request started during warm-up. Later speeds reuse the world. Metric cumulative maxima are since startup; stageMaximaMs, stageDistributions and eventLoop belong to the reported phase.',
    node: process.version,
    cpu: cpus()[0]?.model,
    run: process.env.GITHUB_RUN_ID,
    secondsPerPhase: seconds,
    warmupSecondsPerSpeed: warmupSeconds,
    commandIntervalMs,
    requestedSpeeds: speeds,
    scenario,
    paidModelCalls: 0,
    instrumentation: {
      appProfiling: appProfiling ? 'on' : 'off',
      cpuSampling: collectCpu,
      runtimeMonitoring: appProfiling,
      domainCounters: appProfiling,
      externalProcessCuts: true,
      externalEventLoop: appProfiling,
    },
    warmups: [],
    phases: [],
  };
  let game, load, database, stopPhaseObserving, observedLoop, activePhase, capture, cpuProfiler;
  let pressureFixture, pressureRun;
  let cohortIds = new Set();
  // Retain the resource until the factory returns a closeable server. An initialization
  // failure otherwise leaves the database socket/worker alive with no returned handle.
  const startGame = async (tick) => {
    const store = new SqlGameRepository(
      config.dataDirectory,
      new PostgresDatabase(config.databaseUrl, false, config.sqlWriteGroups),
    );
    try {
      return await createGameServer({ config, production: true, tick, store });
    } catch (error) {
      await store.close().catch(() => {});
      throw error;
    }
  };
  const beginPhase = () => {
    const nativeStart = nativePopulation(game.service.world, cohortIds);
    const nativeCounters = {},
      stages = {};
    if (appProfiling) observeDomainCounters(nativeCounters);
    if (appProfiling)
      stopPhaseObserving = observeDurations((stage, milliseconds) => {
        const sample = (stages[stage] ??= { count: 0, totalMs: 0, maxMs: 0, values: [] });
        sample.values[sample.count % 256] = milliseconds;
        sample.count++;
        sample.totalMs += milliseconds;
        sample.maxMs = Math.max(sample.maxMs, milliseconds);
      });
    const loop = appProfiling
      ? (observedLoop = monitorEventLoopDelay({ resolution: 10 }))
      : undefined;
    loop?.enable();
    return {
      before: performanceSnapshot(),
      nativeStart,
      nativeCounters,
      stages,
      loop,
      startingHostLoad: loadavg(),
      startingMemory: process.memoryUsage(),
      sim: game.service.world.simTime,
      cpu: process.cpuUsage(),
      start: performance.now(),
      startedAtUnixMs: performance.timeOrigin + performance.now(),
    };
  };
  const finishPhase = (phase) => {
    stopPhaseObserving?.();
    stopPhaseObserving = undefined;
    observeDomainCounters();
    phase.loop?.disable();
    observedLoop = undefined;
    const end = performance.now(),
      used = process.cpuUsage(phase.cpu),
      after = performanceSnapshot();
    const elapsed = (end - phase.start) / 1000,
      advanced = game.service.world.simTime - phase.sim;
    return {
      startingSimTime: phase.sim,
      elapsedSeconds: elapsed,
      advancedSimSeconds: advanced,
      expectedSimSeconds: elapsed * config.baseRatio * game.service.speed,
      achievedSpeed: advanced / elapsed / config.baseRatio,
      nativeStart: phase.nativeStart,
      nativeEnd: nativePopulation(game.service.world, cohortIds),
      geometry: game.service.geometryStatistics,
      ...(pressureRun ? { nativePressure: pressureRun.snapshot() } : {}),
      serverCpuMs: (used.user + used.system) / 1000,
      startingHostLoad: phase.startingHostLoad,
      endingHostLoad: loadavg(),
      nativeCounters: appProfiling ? phase.nativeCounters : null,
      stageMaximaMs: appProfiling
        ? Object.fromEntries(Object.entries(phase.stages).map(([name, s]) => [name, s.maxMs]))
        : null,
      stageDistributions: appProfiling
        ? Object.fromEntries(
            Object.entries(phase.stages).map(([name, s]) => [
              name,
              {
                count: s.count,
                totalMs: s.totalMs,
                maxMs: s.maxMs,
                recent: distribution(s.values),
              },
            ]),
          )
        : null,
      eventLoop: phase.loop
        ? {
            p50Ms: phase.loop.percentile(50) / 1e6,
            p95Ms: phase.loop.percentile(95) / 1e6,
            maxMs: phase.loop.max / 1e6,
          }
        : null,
      startingHeapUsedBytes: phase.startingMemory.heapUsed,
      startingRssBytes: phase.startingMemory.rss,
      heapUsedBytes: process.memoryUsage().heapUsed,
      rssBytes: process.memoryUsage().rss,
      storageError: game.service.storageError,
      backgroundFailures: after.runtime.backgroundFailures,
      memoryBacklog: game.service.memoryBacklog,
      attribution: appProfiling
        ? { status: 'collected', ...metricDelta(phase.before, after) }
        : { status: 'disabled' },
    };
  };
  try {
    capture = appProfiling ? startPerformanceCapture({ runtimeMonitoring: true }) : undefined;
    await initializeCollisionRuntime();
    database = await createDisposableDatabase(process.env.OPEN_LEGEND_PROFILE_POSTGRES_URL);
    config.databaseUrl = database.url;
    report.database = database.details;
    game = await startGame(false);
    await new Promise((done) => game.server.listen(0, config.host, done));
    let base = 'http://' + config.host + ':' + game.server.address().port;
    let response = await toolHttp(base + '/api/state');
    let cookie = response.headers.get('set-cookie')?.split(';')[0];
    await response.arrayBuffer();
    if (!cookie) throw Error('No local session');
    await resumeWorld(base, cookie);
    await controlWorld(base, cookie, {
      paused: false,
      clientId: 'profile-setup',
      presenceSequence: 1,
    });
    const setup = await game.service.transition((world) => {
      const population = populateScenario(structuredClone(world), scenario);
      const pressure = prepareNativePressure(population.world, scenario, population.addedAnimalIds);
      pressureFixture = pressure.fixture;
      cohortIds = new Set(population.addedAnimalIds);
      return {
        world: pressure.world,
        events: [],
        outcome: { ok: true, code: 'profile-setup', message: 'Disposable profiling scene' },
      };
    });
    if (!setup.ok || cohortIds.size !== scenario.animals * (scenario.groupDistance ? 2 : 1))
      throw Error('Generated native cohort did not match the requested workload.');
    await controlWorld(base, cookie, { paused: true });
    await game.service.flush();
    await game.close();
    game = undefined;
    // Start the actual timer only after scene construction: first acquisition belongs
    // to profiled load (warmup when configured), not an incidental setup timer callback.
    game = await startGame(true);
    await new Promise((done) => game.server.listen(0, config.host, done));
    base = 'http://' + config.host + ':' + game.server.address().port;
    response = await toolHttp(base + '/api/state');
    cookie = response.headers.get('set-cookie')?.split(';')[0];
    await response.arrayBuffer();
    if (!cookie) throw Error('No restarted local session');
    // The reopened fixture has a new login, while its setup login may still hold
    // control. Take control explicitly through the same endpoint used by a player.
    const state = await resumeWorld(base, cookie);
    report.effectiveSettings = {
      worldPreset: config.worldPreset,
      worldSeed: game.service.world.seed,
      baseRatio: config.baseRatio,
    };
    const actor = entityGet(game.service.world.entities, game.service.controlledEntityId);
    const position = { ...worldPosition(actor), surfaceId: worldSupport(actor) };
    if (collectCpu) {
      cpuProfiler = new Session();
      cpuProfiler.connect();
      await cpuProfiler.post('Profiler.enable');
      report.cpuProfileWindow = { startBeforeUs: Number(process.hrtime.bigint() / 1000n) };
      await cpuProfiler.post('Profiler.start');
      report.cpuProfileWindow.startAfterUs = Number(process.hrtime.bigint() / 1000n);
    }
    // Keep warm-up and measured work continuous: an intervening pause can itself
    // fail the normal busy-admission gate in precisely the overloaded case measured here.
    // docs/maintainers/performance-profiling.md#full-server-workload
    for (const [index, speed] of speeds.entries()) {
      const presenceId = 'profile-' + randomUUID();
      load = await startLoad({
        base,
        cookie,
        epoch: game.service.commandEpoch,
        scope: state.access.scope,
        position,
        seconds,
        warmupSeconds,
        presenceId,
        commandIntervalMs,
      });
      activePhase = beginPhase();
      await controlWorld(base, cookie, {
        paused: false,
        speed,
        clientId: presenceId,
        presenceSequence: 1,
      });
      pressureRun = await startNativePressure(game.service, pressureFixture, index);
      load.child.send({
        go: true,
        ...(warmupSeconds ? {} : { measureAt: activePhase.startedAtUnixMs }),
      });
      let warmup;
      if (warmupSeconds) {
        await delay(warmupSeconds * 1000);
        warmup = finishPhase(activePhase);
        activePhase = beginPhase();
        load.child.send({ measureAt: activePhase.startedAtUnixMs });
      }
      const client = await load.result;
      await pressureRun?.stop();
      if (warmup) report.warmups.push({ speed, ...warmup, client: client.warmup });
      report.phases.push({ speed, ...finishPhase(activePhase), client: client.measured });
      pressureRun = undefined;
      activePhase = undefined;
      load.child.kill();
      load = undefined;
      if (client.measured.errorCount || client.warmup?.errorCount) {
        report.error = 'Load generator reported failed requests; see retained phase evidence.';
        process.exitCode = 1;
        break;
      }
      // Between speeds retain ordinary pause admission; final shutdown already stops
      // the server's own timer before draining and saving, so no last pause is needed.
      if (index + 1 < speeds.length) {
        await controlWorld(base, cookie, { paused: true });
        await game.service.flush();
      }
    }
    if (cpuProfiler) {
      report.cpuProfileWindow.stopBeforeUs = Number(process.hrtime.bigint() / 1000n);
      const { profile } = await cpuProfiler.post('Profiler.stop');
      report.cpuProfileWindow.stopAfterUs = Number(process.hrtime.bigint() / 1000n);
      await writeFile(resolve(output) + '.cpuprofile', JSON.stringify(profile), {
        flag: 'wx',
        mode: 0o600,
      });
    }
    report.finalCounts = {
      entities: entityKeys(game.service.world.entities).length,
      events: game.service.world.events.length,
      awareness: Object.values(game.service.world.experience?.awareness ?? {}).reduce(
        (n, rows) => n + rows.length,
        0,
      ),
    };
    // Explicit --expose-gc opts into a post-measurement retained-heap sample.
    // Keep the server/world alive; do not confuse cleanup or a phase-end heap with
    // retained runtime memory. Collection is outside every measured workload window.
    if (typeof globalThis.gc === 'function') {
      const started = performance.now();
      globalThis.gc();
      globalThis.gc();
      report.retainedMemory = {
        status: 'collected',
        scope:
          'Main isolate after two requested full collections, before server shutdown; includes resident world, in-flight work and profiling records. RSS includes worker memory and is not a retained-heap or peak measurement.',
        collectionMs: performance.now() - started,
        simTime: game.service.world.simTime,
        ...process.memoryUsage(),
      };
    } else report.retainedMemory = { status: 'unavailable', reason: 'Run Node with --expose-gc.' };
  } catch (error) {
    if (activePhase) report.incompletePhase = finishPhase(activePhase);
    report.error = String(error);
    process.exitCode = 1;
  } finally {
    cpuProfiler?.disconnect();
    stopPhaseObserving?.();
    observedLoop?.disable();
    observeDomainCounters();
    load?.child.kill();
    const cleanupErrors = [];
    for (const [name, cleanup] of [
      ['native pressure', () => pressureRun?.stop()],
      ['server', () => game?.close()],
      ['database', () => database?.close()],
      ['directory', () => rm(dir, { recursive: true, force: true })],
    ]) {
      try {
        await cleanup();
      } catch {
        cleanupErrors.push(`${name} cleanup failed`);
      }
    }
    if (cleanupErrors.length) {
      report.cleanupErrors = cleanupErrors;
      process.exitCode = 1;
    }
    try {
      await writeFile(resolve(output), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    } finally {
      capture?.stop();
    }
  }
  console.log(
    JSON.stringify({
      output,
      phases: report.phases.map((p) => ({
        speed: p.speed,
        achievedSpeed: p.achievedSpeed,
        commands: p.client.commands,
        eventLoop: p.eventLoop,
        storageError: p.storageError,
        memoryBacklog: p.memoryBacklog,
      })),
      error: report.error,
    }),
  );
}
if (process.argv[2] === '--client') await clientLoad();
else await main();
