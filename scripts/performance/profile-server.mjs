import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir, cpus } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { parseScenario, populateScenario } from './scenario.ts';
import { createGameServer } from '../../apps/server/src/http.ts';
import { readConfig } from '../../apps/server/src/config.ts';
import { performanceSnapshot } from '../../apps/server/src/performance.ts';

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
  const streamAbort = new AbortController();
  const stream = await fetch(base + '/api/events', {
    headers: { cookie },
    signal: streamAbort.signal,
  });
  if (!stream.ok || !stream.body) throw Error('SSE connection failed: ' + stream.status);
  let streamBytes = 0,
    streamChunks = 0;
  const reading = (async () => {
    try {
      for await (const chunk of stream.body) {
        streamBytes += chunk.byteLength;
        streamChunks++;
      }
    } catch (error) {
      if (!streamAbort.signal.aborted) throw error;
    }
  })();
  const go = once(process, 'message');
  process.send({ ready: true });
  await go;
  const start = performance.now(),
    end = start + seconds * 1000;
  const commands = [],
    reads = [],
    late = [],
    errors = [],
    codes = {};
  let skipped = 0;
  const periodic = async (interval, operation) => {
    let due = start,
      index = 0;
    while (performance.now() < end) {
      await delay(Math.max(0, due - performance.now()));
      if (performance.now() >= end) break;
      late.push(Math.max(0, performance.now() - due));
      try {
        await operation(index++);
      } catch (error) {
        if (errors.length < 12) errors.push(String(error));
      }
      due += interval;
      if (due < performance.now()) {
        const missed = Math.floor((performance.now() - due) / interval);
        skipped += missed;
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
      codes[result.code ?? response.status] = (codes[result.code ?? response.status] ?? 0) + 1;
      commands.push({ ms: performance.now() - at, ok: response.ok && result.ok === true });
    }),
    periodic(250, async () => {
      const at = performance.now();
      const response = await fetch(base + '/api/state', {
        headers: { cookie },
        signal: AbortSignal.timeout(15000),
      });
      await response.arrayBuffer();
      if (!response.ok) throw Error('State read ' + response.status);
      reads.push(performance.now() - at);
    }),
  ]);
  streamAbort.abort();
  await reading;
  const result = {
    elapsedSeconds: (performance.now() - start) / 1000,
    commands: distribution(commands.filter((v) => v.ok).map((v) => v.ms)),
    rejectedCommands: distribution(commands.filter((v) => !v.ok).map((v) => v.ms)),
    commandCodes: codes,
    reads: distribution(reads),
    requestTimerLateness: distribution(late),
    skippedIntervals: skipped,
    streamBytes,
    streamChunks,
    errors,
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
    commandIntervalMs = Number(intervalText),
    speeds = speedText.split(',').map(Number);
  if (
    !scenarioPath ||
    !output ||
    !Number.isInteger(seconds) ||
    seconds < 5 ||
    seconds > 60 ||
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
    OPEN_LEGEND_DATABASE_URL: '',
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
      'Real server timer, SQLite, SSE and separate-process HTTP load with presence heartbeats; no browser, PostgreSQL or live model calls. Cold acquisition is included in the first speed phase; later phases reuse this world. Phase metric maxima are cumulative since startup, not per-phase percentiles.',
    node: process.version,
    cpu: cpus()[0]?.model,
    run: process.env.GITHUB_RUN_ID,
    secondsPerPhase: seconds,
    commandIntervalMs,
    scenario,
    paidModelCalls: 0,
    phases: [],
  };
  let game, load;
  try {
    game = await createGameServer({ config, production: true, tick: false });
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
    // Start the actual timer only after scene construction: cold acquisition belongs
    // to the measured first phase, not an incidental setup timer callback.
    game = await createGameServer({ config, production: true, tick: true });
    await new Promise((done) => game.server.listen(0, config.host, done));
    base = 'http://' + config.host + ':' + game.server.address().port;
    response = await fetch(base + '/api/state');
    cookie = response.headers.get('set-cookie')?.split(';')[0];
    await response.arrayBuffer();
    if (!cookie) throw Error('No restarted local session');
    const actor = game.service.world.entities[game.service.controlledEntityId];
    const position = { ...actor.position, surfaceId: actor.spatial.supportSurfaceId };
    for (const speed of speeds) {
      const presenceId = 'profile-' + randomUUID();
      load = await startLoad({
        base,
        cookie,
        epoch: game.service.commandEpoch,
        position,
        seconds,
        presenceId,
        commandIntervalMs,
      });
      const before = performanceSnapshot();
      const sim = game.service.world.simTime;
      const cpu = process.cpuUsage();
      const start = performance.now();
      const loop = monitorEventLoopDelay({ resolution: 10 });
      loop.enable();
      await game.service.control({
        paused: false,
        speed,
        clientId: presenceId,
        presenceSequence: 1,
      });
      load.child.send({ go: true });
      const client = await load.result;
      const end = performance.now(),
        used = process.cpuUsage(cpu),
        after = performanceSnapshot();
      loop.disable();
      const elapsed = (end - start) / 1000,
        advanced = game.service.world.simTime - sim;
      report.phases.push({
        speed,
        startingSimTime: sim,
        elapsedSeconds: elapsed,
        advancedSimSeconds: advanced,
        expectedSimSeconds: elapsed * config.baseRatio * speed,
        achievedSpeed: advanced / elapsed / config.baseRatio,
        serverCpuMs: (used.user + used.system) / 1000,
        eventLoop: {
          p50Ms: loop.percentile(50) / 1e6,
          p95Ms: loop.percentile(95) / 1e6,
          maxMs: loop.max / 1e6,
        },
        heapUsedBytes: process.memoryUsage().heapUsed,
        storageError: game.service.storageError,
        memoryBacklog: game.service.memoryBacklog,
        client,
        ...metricDelta(before, after),
      });
      await game.service.control({ paused: true });
      await game.service.flush();
      load.child.kill();
      load = undefined;
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
    report.error = String(error);
    process.exitCode = 1;
  } finally {
    load?.child.kill();
    await game?.close();
    await rm(dir, { recursive: true, force: true });
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
