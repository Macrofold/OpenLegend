import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir, cpus, loadavg } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { parseScenario, populateScenario } from './scenario.ts';
import { worldPosition, worldSupport, observeDomainCounters } from '@open-legend/domain';
import { initializeCollisionRuntime } from '../../packages/spatial/src/rapier.js';
import { createGameServer } from '../../apps/server/src/http.ts';
import { readConfig } from '../../apps/server/src/config.ts';
import { performanceSnapshot, observeDurations } from '../../apps/server/src/performance.ts';
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
  const stream = await fetch(base + '/api/events', {
    headers: { cookie },
    signal: streamAbort.signal,
  });
  if (!stream.ok || !stream.body) throw Error('SSE connection failed: ' + stream.status);
  const chunks = [];
  const reading = (async () => {
    try {
      for await (const chunk of stream.body) {
        chunks.push({ at: timestamp(), bytes: chunk.byteLength });
      }
    } catch (error) {
      if (!streamAbort.signal.aborted) throw error;
    }
  })();
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
      const response = await fetch(base + '/api/presence', {
        method: 'POST',
        headers: { cookie, origin: base, 'content-type': 'application/json' },
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
      const response = await fetch(base + '/api/command', {
        method: 'POST',
        headers: { cookie, origin: base, 'content-type': 'application/json' },
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
      const response = await fetch(base + '/api/state', {
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
  const [scenarioPath, output, secondsText = '15', speedText = '1,3,8', intervalText = '500'] =
    process.argv.slice(2);
  const seconds = Number(secondsText),
    warmupSeconds = Number(process.env.OPENLEGEND_PROFILE_SERVER_WARMUP_SECONDS ?? '0'),
    commandIntervalMs = Number(intervalText),
    speeds = speedText.split(',').map(Number);
  if (
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
      'Usage: node --import tsx scripts/performance/profile-server.mjs SCENARIO.json NEW_REPORT.json [5..60 seconds per phase] [1,3,8] [25..1000 command interval ms]',
    );
  const scenario = parseScenario(JSON.parse(await readFile(scenarioPath, 'utf8')));
  if (scenario.input)
    throw Error('This disposable server profile takes generated scenarios, not a user save.');
  const dir = await mkdtemp(join(tmpdir(), 'openlegend-server-profile-'));
  const config = readConfig({
    ...process.env,
    OPEN_LEGEND_DATA_DIR: dir,
    OPEN_LEGEND_DATABASE_URL: process.env.OPEN_LEGEND_PROFILE_POSTGRES_URL,
    AI_BUDGET_USD: '0',
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
    warmups: [],
    phases: [],
  };
  let game, load, database, stopPhaseObserving, observedLoop, activePhase;
  // Retain the resource until the factory returns a closeable server. An initialization
  // failure otherwise leaves the database socket/worker alive with no returned handle.
  const startGame = async (tick) => {
    const store = new SqlGameRepository(
      config.dataDirectory,
      new PostgresDatabase(config.databaseUrl),
    );
    try {
      return await createGameServer({ config, production: true, tick, store });
    } catch (error) {
      await store.close().catch(() => {});
      throw error;
    }
  };
  const beginPhase = () => {
    const nativeCounters = {},
      stages = {};
    observeDomainCounters(nativeCounters);
    stopPhaseObserving = observeDurations((stage, milliseconds) => {
      const sample = (stages[stage] ??= { count: 0, totalMs: 0, maxMs: 0, values: [] });
      sample.values[sample.count % 256] = milliseconds;
      sample.count++;
      sample.totalMs += milliseconds;
      sample.maxMs = Math.max(sample.maxMs, milliseconds);
    });
    const loop = (observedLoop = monitorEventLoopDelay({ resolution: 10 }));
    loop.enable();
    return {
      before: performanceSnapshot(),
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
    stopPhaseObserving();
    stopPhaseObserving = undefined;
    observeDomainCounters();
    phase.loop.disable();
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
      serverCpuMs: (used.user + used.system) / 1000,
      startingHostLoad: phase.startingHostLoad,
      endingHostLoad: loadavg(),
      nativeCounters: phase.nativeCounters,
      stageMaximaMs: Object.fromEntries(
        Object.entries(phase.stages).map(([name, s]) => [name, s.maxMs]),
      ),
      stageDistributions: Object.fromEntries(
        Object.entries(phase.stages).map(([name, s]) => [
          name,
          {
            count: s.count,
            totalMs: s.totalMs,
            maxMs: s.maxMs,
            recent: distribution(s.values),
          },
        ]),
      ),
      eventLoop: {
        p50Ms: phase.loop.percentile(50) / 1e6,
        p95Ms: phase.loop.percentile(95) / 1e6,
        maxMs: phase.loop.max / 1e6,
      },
      startingHeapUsedBytes: phase.startingMemory.heapUsed,
      startingRssBytes: phase.startingMemory.rss,
      heapUsedBytes: process.memoryUsage().heapUsed,
      rssBytes: process.memoryUsage().rss,
      storageError: game.service.storageError,
      memoryBacklog: game.service.memoryBacklog,
      ...metricDelta(phase.before, after),
    };
  };
  try {
    await initializeCollisionRuntime();
    database = await createDisposableDatabase(process.env.OPEN_LEGEND_PROFILE_POSTGRES_URL);
    config.databaseUrl = database.url;
    report.database = database.details;
    game = await startGame(false);
    await new Promise((done) => game.server.listen(0, config.host, done));
    let base = 'http://' + config.host + ':' + game.server.address().port;
    let response = await fetch(base + '/api/state');
    let cookie = response.headers.get('set-cookie')?.split(';')[0];
    await response.arrayBuffer();
    if (!cookie) throw Error('No local session');
    await game.service.setConnection('profile-setup', true);
    await game.service.control({ paused: false, clientId: 'profile-setup', presenceSequence: 1 });
    await game.service.transition((world) => ({
      world: populateScenario(structuredClone(world), scenario),
      events: [],
      outcome: { ok: true, code: 'profile-setup', message: 'Disposable profiling scene' },
    }));
    await game.service.control({ paused: true });
    await game.service.flush();
    await game.close();
    game = undefined;
    // Start the actual timer only after scene construction: first acquisition belongs
    // to profiled load (warmup when configured), not an incidental setup timer callback.
    game = await startGame(true);
    await new Promise((done) => game.server.listen(0, config.host, done));
    base = 'http://' + config.host + ':' + game.server.address().port;
    response = await fetch(base + '/api/state');
    cookie = response.headers.get('set-cookie')?.split(';')[0];
    const state = await response.json();
    if (!cookie) throw Error('No restarted local session');
    // The reopened fixture has a new login, while its setup login may still hold
    // control. Take control explicitly through the same endpoint used by a player.
    response = await fetch(base + '/api/embodiment', {
      method: 'POST',
      headers: { cookie, origin: base, 'content-type': 'application/json' },
      body: JSON.stringify({
        id: randomUUID(),
        expectedGeneration: state.access.controlGeneration,
        operation: 'replace',
      }),
    });
    const control = await response.json();
    if (!response.ok || !control.ok) throw Error('Could not take control of profiling fixture');
    const actor = game.service.world.entities[game.service.controlledEntityId];
    const position = { ...worldPosition(actor), surfaceId: worldSupport(actor) };
    // Keep warm-up and measured work continuous: an intervening pause can itself
    // fail the normal busy-admission gate in precisely the overloaded case measured here.
    // docs/maintainers/performance-profiling.md#full-server-workload
    for (const [index, speed] of speeds.entries()) {
      const presenceId = 'profile-' + randomUUID();
      load = await startLoad({
        base,
        cookie,
        epoch: game.service.commandEpoch,
        position,
        seconds,
        warmupSeconds,
        presenceId,
        commandIntervalMs,
      });
      activePhase = beginPhase();
      await game.service.control({
        paused: false,
        speed,
        clientId: presenceId,
        presenceSequence: 1,
      });
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
      if (warmup) report.warmups.push({ speed, ...warmup, client: client.warmup });
      report.phases.push({ speed, ...finishPhase(activePhase), client: client.measured });
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
        await game.service.control({ paused: true });
        await game.service.flush();
      }
    }
    report.finalCounts = {
      entities: Object.keys(game.service.world.entities).length,
      events: game.service.world.events.length,
      awareness: Object.values(game.service.world.experience?.awareness ?? {}).reduce(
        (n, rows) => n + rows.length,
        0,
      ),
    };
  } catch (error) {
    if (activePhase) report.incompletePhase = finishPhase(activePhase);
    report.error = String(error);
    process.exitCode = 1;
  } finally {
    stopPhaseObserving?.();
    observedLoop?.disable();
    observeDomainCounters();
    load?.child.kill();
    const cleanupErrors = [];
    for (const [name, cleanup] of [
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
    await writeFile(resolve(output), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
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
