import { createDisposableDatabase } from './disposable-postgres.mjs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir, availableParallelism, loadavg } from 'node:os';
import { join, resolve } from 'node:path';
import { Session } from 'node:inspector/promises';
import { AsyncLocalStorage } from 'node:async_hooks';
import { observeDurations, performanceSnapshot } from '../apps/server/src/performance.js';
import { createGameServer } from '../apps/server/src/http.js';
import { readConfig } from '../apps/server/src/config.js';
import { SqlGameRepository } from '../apps/server/src/store.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { createWorld, worldPosition, worldRootEntities } from '@open-legend/domain';
import { initializeCollisionRuntime } from '../packages/spatial/src/rapier.js';
import { parseScenario, populateScenario } from './performance/scenario.js';
import type { AiClient, AiReceipt, JudgmentAnswer } from '@open-legend/ai';
import type { GameView } from '@open-legend/protocol';

// Disposable full-server experiment, not a correctness suite. Never load .env or call providers.
const [output, durationArgument = '15'] = process.argv.slice(2);
const seconds = Number(durationArgument);
if (!output || !Number.isFinite(seconds) || seconds < 3 || seconds > 120)
  throw new Error(
    'Usage: node --import tsx scripts/profile-server.ts NEW_REPORT.json [SECONDS=15]',
  );
const cognitionFixture = process.env['OPENLEGEND_PROFILE_COGNITION'] === '1';
const speechFixture = process.env['OPENLEGEND_PROFILE_SPEECH'] === '1';
// PF00 storage-latency case: added after lane admission, per statement on this fixture's
// connections only (docs/maintainers/performance-profiling.md#full-server-scene-profiler).
const sqlDelayMs = Number(process.env['OPENLEGEND_PROFILE_SQL_DELAY_MS'] ?? '0');
if (!Number.isInteger(sqlDelayMs) || sqlDelayMs < 0 || sqlDelayMs > 1000)
  throw new Error('OPENLEGEND_PROFILE_SQL_DELAY_MS must be an integer from 0 to 1000.');
const directory = await mkdtemp(join(tmpdir(), 'openlegend-scene-profile-'));
const disposable = await createDisposableDatabase(process.env['OPENLEGEND_STRESS_DATABASE_URL']);
// Named so an interrupted run's leftover fixture can be attributed and removed.
console.error(`fixture database: ${disposable.details.database}`);
let closeResources: () => Promise<void> = () => disposable.close();
// `pg` resolves from the server package; scripts see only this narrow driver surface.
interface PgClientLike {
  database?: string;
  connect(): Promise<unknown>;
  end(): Promise<unknown>;
  on(event: 'error', listener: () => void): unknown;
  query(text: string): Promise<unknown>;
}
const { Client: PgClient } = createRequire(new URL('../apps/server/package.json', import.meta.url))(
  'pg',
) as {
  Client: (new (config: {
    connectionString: string;
    connectionTimeoutMillis: number;
  }) => PgClientLike) & {
    prototype: { query: (...args: unknown[]) => unknown };
  };
};
// Host-scheduling reference: an idle SELECT 1 on its own undelayed connection. Its round
// trip includes PostgreSQL/OS scheduling on this host but none of the game's statement work.
const probe = new PgClient({ connectionString: disposable.url, connectionTimeoutMillis: 5000 });
if (sqlDelayMs) {
  const query = PgClient.prototype.query;
  PgClient.prototype.query = function (this: PgClientLike, ...args: unknown[]) {
    // Promise-form queries only; the admin client, probe and callback forms are not delayed.
    if (
      this === probe ||
      this.database !== disposable.details.database ||
      typeof args.at(-1) === 'function'
    )
      return query.apply(this, args);
    return new Promise((resolveDelay) => setTimeout(resolveDelay, sqlDelayMs)).then(() =>
      query.apply(this, args),
    );
  };
}
try {
  const config = readConfig({
    OPEN_LEGEND_DATA_DIR: directory,
    OPEN_LEGEND_DATABASE_URL: disposable.url,
    AI_BUDGET_USD: cognitionFixture ? '0.1' : '0',
    OPENAI_EMBEDDING_API_KEY: '',
    // Exercise cognition scheduling with a transport that cannot dispatch paid work.
    TYPESAFE_API_KEY: 'local-fixture',
    OPENAI_API_KEY: 'local-fixture',
    WORLD_SEED: '73',
    OPEN_LEGEND_GOD_MODE: 'true',
  });
  const database = new PostgresDatabase(config.databaseUrl);
  closeResources = async () => {
    try {
      await database.close();
    } finally {
      await disposable.close();
    }
  };
  let measuring = false;
  const previews = new Map<string, { count: number; ms: number }>();
  const sql = new Map<string, { count: number; ms: number }>();
  const slowSql: Array<{ sql: string; ms: number }> = [];
  type CommitTrace = {
    count: number;
    statements: string[];
    firstAt?: number;
    lastAt?: number;
    statementMs: number;
  };
  const commitTrace = new AsyncLocalStorage<CommitTrace>();
  const commits = { count: 0, ms: 0, statements: 0, maxStatements: 0 };
  const slowCommits: Array<{
    ms: number;
    count: number;
    preMs: number;
    statementMs: number;
    betweenMs: number;
    statements: string[];
  }> = [];
  // Attribution per world commit: preparation plus writer-lane wait before the first
  // statement, statement round trips (storage, including any injected delay), and time
  // between statements (main-thread work, GC and event-loop contention on this host).
  const commitSamples: Array<{
    ms: number;
    preMs: number;
    statementMs: number;
    betweenMs: number;
  }> = [];
  const query = database.query.bind(database);
  database.query = async (statement, params) => {
    const at = performance.now();
    const trace = commitTrace.getStore();
    if (trace) trace.firstAt ??= at;
    try {
      return await query(statement, params);
    } finally {
      if (trace) {
        trace.lastAt = performance.now();
        trace.statementMs += trace.lastAt - at;
      }
      if (measuring) {
        const metadataKind =
          /\bmeta\b/.test(statement) &&
          typeof params?.[0] === 'string' &&
          params[0].startsWith('integration:')
            ? ` [${params[0].split(':').slice(0, 2).join(':')}]`
            : '';
        const key = statement.replace(/\s+/g, ' ').slice(0, 120) + metadataKind;
        const commit = commitTrace.getStore();
        if (commit) {
          commit.count++;
          if (commit.statements.length < 128) commit.statements.push(key);
        }
        const entry = sql.get(key) ?? { count: 0, ms: 0 };
        if (performance.now() - at > 100) {
          slowSql.push({ sql: key, ms: performance.now() - at });
          slowSql.sort((a, b) => b.ms - a.ms);
          slowSql.length = Math.min(slowSql.length, 30);
        }
        entry.count++;
        entry.ms += performance.now() - at;
        sql.set(key, entry);
      }
    }
  };
  const row = await database
    .prepare(
      "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema='open_legend'",
    )
    .get();
  if (Number(row?.['count'])) {
    throw new Error(
      'Use a new disposable database; existing schemas are never migrated by this profiler.',
    );
  }
  const store = new SqlGameRepository(config.dataDirectory, database);
  closeResources = async () => {
    try {
      await store.close();
    } finally {
      await disposable.close();
    }
  };
  const commit = store.commit.bind(store);
  store.commit = async (...args) => {
    if (!measuring) return commit(...args);
    const trace: CommitTrace = { count: 0, statements: [], statementMs: 0 };
    const at = performance.now();
    try {
      return await commitTrace.run(trace, () => commit(...args));
    } finally {
      if (measuring) {
        const ms = performance.now() - at;
        commits.count++;
        commits.ms += ms;
        commits.statements += trace.count;
        commits.maxStatements = Math.max(commits.maxStatements, trace.count);
        const preMs = (trace.firstAt ?? at + ms) - at;
        const betweenMs = Math.max(
          0,
          (trace.lastAt ?? at) - (trace.firstAt ?? at) - trace.statementMs,
        );
        const sample = { ms, preMs, statementMs: trace.statementMs, betweenMs };
        if (commitSamples.length < 4000) commitSamples.push(sample);
        slowCommits.push({ ...sample, count: trace.count, statements: trace.statements });
        slowCommits.sort((a, b) => b.ms - a.ms);
        slowCommits.length = Math.min(slowCommits.length, 10);
      }
    }
  };
  await store.ready;
  if (await store.load()) {
    throw new Error('The stress database must be empty; existing data is never replaced.');
  }
  const setupAt = performance.now();
  await initializeCollisionRuntime();
  const seed = createWorld(73);
  const seedRoots = worldRootEntities(seed);
  const seeded = populateScenario(
    seed,
    parseScenario({
      seed: 73,
      layout: 'crowded',
      people: 20 - seedRoots.filter((e) => e.actor?.controller === 'npc').length,
      // One seeded animal starts outside the player's view; add enough for 20 visible.
      animals: 21 - seedRoots.filter((e) => e.kind === 'animal').length,
      objects: [
        {
          count: 100 - seedRoots.filter((e) => !e.actor).length,
          name: 'Scene material',
          properties: ['rigid'],
          quantity: 3,
          workSeconds: 2,
        },
      ],
    }),
  );
  seeded.paused = true;
  await store.commit(0, { world: seeded, speed: 3, manuallyPaused: true });
  const setupMs = performance.now() - setupAt;
  let providerCalls = 0;
  const unavailable = async (): Promise<never> => {
    providerCalls++;
    throw new Error('No external provider is available in this experiment.');
  };
  const fixture: AiClient = {
    async judge(request) {
      providerCalls++;
      const answers: Record<string, JudgmentAnswer> = {};
      for (const [id, question] of Object.entries(request.questions)) {
        if (question.type === 'noul') answers[id] = { type: 'noul', noul: 0 };
        else if (question.type === 'choice' && Object.hasOwn(question.criteria, 'native'))
          answers[id] = {
            type: 'choice',
            choice: 'native',
            probabilities: { native: 1 },
            confidence: 1,
          };
        else if (question.type === 'choice' && Object.hasOwn(question.criteria, 'no'))
          answers[id] = { type: 'choice', choice: 'no', probabilities: { no: 1 }, confidence: 1 };
        else throw new Error('Unsupported fixture question.');
      }
      const receipt: AiReceipt = {
        requestId: request.requestId,
        provider: 'jev',
        model: 'local-fixture',
        requestedModel: 'local-fixture',
        modelVersionStatus: 'reported',
        contextDigest: 'local-fixture',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        latencyMs: 0,
        dispatched: false,
        completionUncertain: false,
        estimatedCostUsd: 0,
        usage: { inputTokens: 0, outputTokens: 0 },
      };
      return { outcome: 'value', value: { answers }, receipt };
    },
    generate: unavailable,
  };
  const game = await createGameServer({
    config,
    store,
    production: true,
    aiClient: cognitionFixture ? fixture : { judge: unavailable, generate: unavailable },
  });
  // Fixture-only attribution; no instrumentation runs in the normal game server.
  const preview = game.service.previewCommand.bind(game.service);
  game.service.previewCommand = (input, actorId) => {
    const at = performance.now();
    try {
      return preview(input, actorId);
    } finally {
      if (measuring) {
        const entry = previews.get(input.type) ?? { count: 0, ms: 0 };
        entry.count++;
        entry.ms += performance.now() - at;
        previews.set(input.type, entry);
      }
    }
  };
  closeResources = async () => {
    try {
      await game.close();
    } finally {
      await disposable.close();
    }
  };
  await new Promise<void>((done) => game.server.listen(0, '127.0.0.1', done));
  probe.on('error', () => {});
  await probe.connect();
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing server address.');
  const base = `http://127.0.0.1:${address.port}`;
  const profiler = new Session();
  const streamAbort = new AbortController();
  let streamTask: Promise<void> | undefined;
  let commandTimer: ReturnType<typeof setInterval> | undefined;
  let commandTask: Promise<void> | undefined;
  let commandBusy = false;
  let speechTimer: ReturnType<typeof setInterval> | undefined;
  let speechTask: Promise<void> | undefined;
  let speechBusy = false;
  let speechOffered = 0,
    speechAccepted = 0,
    speechSkipped = 0;
  const probeSamples: number[] = [];
  let probeTimer: ReturnType<typeof setInterval> | undefined;
  let probeTask: Promise<void> | undefined;
  let probeBusy = false;
  let failureCount = 0;
  const failures: Array<{ source: string; message: string }> = [];
  const failed = (source: string, error: unknown) => {
    failureCount++;
    if (failures.length < 10) failures.push({ source, message: String(error) });
  };
  const commands: Array<{ atMs: number; ms: number; ok: boolean; code?: string }> = [];
  const gaps: number[] = [];
  const warmGaps: number[] = [];
  const spans: Array<{ stage: string; ms: number; endedAt: number }> = [];
  const longGaps: Array<{ atMs: number; ms: number; spans: typeof spans }> = [];
  const stopTrace = observeDurations((stage, ms, endedAt) => {
    if (ms < 3 || stage === 'native.intervalSimMs') return;
    spans.push({ stage, ms, endedAt });
    if (spans.length > 2000) spans.splice(0, 1000);
  });
  let measureStart = 0;
  let bytes = 0,
    updates = 0;
  try {
    const client = 'scene-profile';
    const response = await fetch(base + '/api/state', { headers: { 'X-OL-Client': client } });
    const cookie = response.headers.get('set-cookie')?.split(';')[0];
    if (!cookie) throw new Error('Missing local session.');
    let view = (await response.json()) as GameView;
    const post = async (path: string, body: unknown) => {
      const r = await fetch(base + path, {
        method: 'POST',
        headers: {
          cookie,
          origin: base,
          'content-type': 'application/json',
          'X-OL-Client': client,
          'X-OL-Scope': view.access!.scope,
          'X-OL-Generation': view.historyEpoch?.split(':')[0] ?? '',
        },
        body: JSON.stringify(body),
      });
      return (await r.json()) as { ok: boolean; code?: string; message?: string };
    };
    // The setup commit can leave another login holding the fixture's character.
    // Take control through the player endpoint, then use its new scope/command epoch.
    const entered = await post('/api/embodiment', {
      id: 'scene-profile-control',
      expectedGeneration: view.access!.controlGeneration,
      operation: 'replace',
    });
    if (!entered.ok) throw new Error(entered.message ?? 'Could not take fixture control.');
    const refreshed = await fetch(base + '/api/state', {
      headers: { cookie, 'X-OL-Client': client },
    });
    if (!refreshed.ok) throw new Error('Controlled scene inspection failed.');
    view = (await refreshed.json()) as GameView;
    globalThis.gc?.();
    const initialHeapBytes = process.memoryUsage().heapUsed;
    const stream = await fetch(
      `${base}/api/events?client=${client}&scope=${view.access!.scope}&revision=${view.revision}`,
      {
        headers: { cookie },
        signal: streamAbort.signal,
      },
    );
    if (!stream.ok || !stream.body) throw new Error('SSE connection failed.');
    let lastUpdate = performance.now();
    streamTask = (async () => {
      const reader = stream.body!.getReader();
      const decoder = new TextDecoder();
      let pending = '';
      try {
        for (;;) {
          const read = await reader.read();
          if (read.done) break;
          if (measuring) bytes += read.value.length;
          pending += decoder.decode(read.value, { stream: true });
          const messages = pending.split('\n\n');
          pending = messages.pop()!;
          for (const message of messages)
            if (measuring && /event: (patch|snapshot)/.test(message)) {
              const at = performance.now();
              gaps.push(at - lastUpdate);
              if (at - lastUpdate > 150) {
                longGaps.push({
                  atMs: at - measureStart,
                  ms: at - lastUpdate,
                  spans: spans
                    .filter((span) => span.endedAt >= lastUpdate)
                    .map((span) => ({
                      ...span,
                      endedAt: span.endedAt - measureStart,
                    })),
                });
                longGaps.sort((a, b) => b.ms - a.ms);
                longGaps.length = Math.min(20, longGaps.length);
              }
              if (lastUpdate - measureStart >= 5000) warmGaps.push(at - lastUpdate);
              lastUpdate = at;
              updates++;
            }
        }
        if (!streamAbort.signal.aborted) failed('stream', 'The update stream ended early.');
      } catch (error) {
        if (!streamAbort.signal.aborted) failed('stream', error);
      }
    })();
    const anchor = worldPosition(game.service.world.entities[view.player.id]);
    if (!anchor) throw new Error('Player has no world position.');
    let serial = 0;
    let presenceSequence = 1;
    const targets = [
      { ...anchor, x: anchor.x + 1, surfaceId: 'terrain' },
      { ...anchor, surfaceId: 'terrain' },
    ];
    commandTimer = setInterval(() => {
      if (commandBusy) return;
      commandBusy = true;
      commandTask = (async () => {
        const index = serial++;
        if (index % 4 === 0)
          await post('/api/presence', {
            clientId: client,
            visible: true,
            sequence: ++presenceSequence,
          });
        const at = performance.now();
        const result = await post('/api/command', {
          commandId: `profile-move-${index}`,
          commandEpoch: view.commandEpoch,
          command: { type: 'move', position: targets[index % targets.length] },
        });
        commands.push({
          atMs: at - measureStart,
          ms: performance.now() - at,
          ok: result.ok,
          code: result.code,
        });
      })()
        .catch((error: unknown) => failed('command', error))
        .finally(() => {
          commandBusy = false;
        });
    }, 1000);
    if (speechFixture) {
      const speakers = worldRootEntities(game.service.world).filter(
        (e) => e.actor?.controller === 'npc',
      );
      speechTimer = setInterval(() => {
        if (speechBusy) {
          speechSkipped++;
          return;
        }
        speechBusy = true;
        const index = speechOffered++;
        speechTask = game.service
          .say(
            `profile-speech-${index}`,
            speakers[index % speakers.length]!.id,
            'The deer are moving near the trees. I will keep watching this path.',
            undefined,
            (['whisper', 'normal', 'shout'] as const)[index % 3],
          )
          .then((result) => {
            if (result.ok) speechAccepted++;
          })
          .catch((error: unknown) => failed('speech', error))
          .finally(() => {
            speechBusy = false;
          });
      }, 500);
    }
    const start = performance.now(),
      simStart = game.service.world.simTime;
    const startingLoad = loadavg();
    measureStart = start;
    // Initial connection/setup is not a measured publication interval.
    lastUpdate = start;
    gaps.length = warmGaps.length = spans.length = longGaps.length = 0;
    bytes = updates = 0;
    measuring = true;
    const before = performanceSnapshot();
    probeTimer = setInterval(() => {
      if (probeBusy) return;
      probeBusy = true;
      const at = performance.now();
      probeTask = probe
        .query('SELECT 1')
        .then(() => {
          if (measuring && probeSamples.length < 4000) probeSamples.push(performance.now() - at);
        })
        .catch((error: unknown) => failed('probe', error))
        .finally(() => {
          probeBusy = false;
        });
    }, 200);
    sql.clear();
    Object.assign(commits, { count: 0, ms: 0, statements: 0, maxStatements: 0 });
    slowCommits.length = 0;
    commitSamples.length = 0;
    slowSql.length = 0;
    profiler.connect();
    await profiler.post('Profiler.enable');
    if (process.env['OPENLEGEND_CPU_PROFILE'] === '1') await profiler.post('Profiler.start');
    const control = await post('/api/control', {
      paused: false,
      speed: 3,
      clientId: client,
      presenceSequence: 1,
    });
    if (!control.ok) throw new Error(control.message);
    console.error(`profile server ready: ${base}; PostgreSQL, ${seconds}s at 3x`);
    await new Promise<void>((done) => setTimeout(done, seconds * 1000));
    clearInterval(commandTimer);
    clearInterval(speechTimer);
    clearInterval(probeTimer);
    await Promise.all([commandTask, speechTask]);
    const elapsedMs = performance.now() - start;
    const simulatedSeconds = game.service.world.simTime - simStart;
    const after = performanceSnapshot();
    // Pause, GC and final inspection are cleanup, not gameplay publication stalls.
    measuring = false;
    await post('/api/control', { paused: true });
    if (process.env['OPENLEGEND_CPU_PROFILE'] === '1') {
      const { profile } = await profiler.post('Profiler.stop');
      await writeFile(resolve(output) + '.cpuprofile', JSON.stringify(profile), {
        flag: 'wx',
        mode: 0o600,
      });
    }
    // Include late diagnostic failures without extending measured gameplay time.
    await probeTask;
    // Profile serialization and the final HTTP inspection allocate temporary data.
    // Sample resident heap after profile output and before constructing the report/view.
    globalThis.gc?.();
    const finalHeapBytes = process.memoryUsage().heapUsed;
    const percentile = (values: number[], p: number) => {
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] ?? 0;
    };
    const roots = worldRootEntities(game.service.world);
    const finalResponse = await fetch(base + '/api/state', {
      headers: { cookie, 'X-OL-Client': client },
    });
    if (!finalResponse.ok) throw new Error('Final scene inspection failed.');
    const finalView = (await finalResponse.json()) as GameView;
    const report = {
      node: process.version,
      host: { logicalCpus: availableParallelism(), startingLoad, endingLoad: loadavg() },
      cognition: cognitionFixture ? 'native-route-fixture' : 'spending-disabled',
      adapter: 'postgres',
      sqlDelayMs,
      hostProbe: {
        count: probeSamples.length,
        p50Ms: percentile(probeSamples, 0.5),
        p95Ms: percentile(probeSamples, 0.95),
        maxMs: Math.max(0, ...probeSamples),
      },
      setupMs,
      elapsedMs,
      simulatedSeconds,
      achievedSpeed: simulatedSeconds / (elapsedMs / 1000) / 60,
      providerCalls,
      previews: Object.fromEntries([...previews].sort(([, a], [, b]) => b.ms - a.ms)),
      speech: { offered: speechOffered, accepted: speechAccepted, skipped: speechSkipped },
      failureCount,
      failures,
      storageError: game.service.storageError,
      heap: {
        collected: !!globalThis.gc,
        initialBytes: initialHeapBytes,
        finalBytes: finalHeapBytes,
      },
      visiblePopulation: {
        people: view.entities.filter((e) => e.kind === 'actor').length,
        animals: view.entities.filter((e) => e.kind === 'animal').length,
        objects: view.entities.filter((e) => !['actor', 'animal'].includes(e.kind)).length,
      },
      finalVisiblePopulation: {
        people: finalView.entities.filter((e) => e.kind === 'actor').length,
        animals: finalView.entities.filter((e) => e.kind === 'animal').length,
        objects: finalView.entities.filter((e) => !['actor', 'animal'].includes(e.kind)).length,
      },
      residentHistory: {
        events: game.service.world.events.length,
        awareness: Object.values(game.service.world.experience?.awareness ?? {}).reduce(
          (count, entries) => count + entries.length,
          0,
        ),
        memories: Object.values(game.service.world.memories).reduce(
          (count, entries) => count + entries.length,
          0,
        ),
      },
      population: {
        people: roots.filter((e) => e.actor && e.kind !== 'animal').length,
        animals: roots.filter((e) => e.kind === 'animal').length,
        objects: roots.filter((e) => !e.actor).length,
      },
      commands,
      commandP95Ms: percentile(
        commands.map((c) => c.ms),
        0.95,
      ),
      publication: {
        updates,
        bytes,
        p95GapMs: percentile(gaps, 0.95),
        p99GapMs: percentile(gaps, 0.99),
        maxGapMs: Math.max(0, ...gaps),
        warmP95GapMs: percentile(warmGaps, 0.95),
        warmP99GapMs: percentile(warmGaps, 0.99),
        warmMaxGapMs: Math.max(0, ...warmGaps),
      },
      warmCommandP95Ms: percentile(
        commands.filter((c) => c.atMs >= 5000).map((c) => c.ms),
        0.95,
      ),
      before,
      after,
      sql: [...sql].sort((a, b) => b[1].ms - a[1].ms).slice(0, 30),
      slowSql,
      commits,
      commitAttribution: Object.fromEntries(
        (['ms', 'preMs', 'statementMs', 'betweenMs'] as const).map((field) => {
          const values = commitSamples.map((sample) => sample[field]);
          return [
            field,
            {
              p50: percentile(values, 0.5),
              p95: percentile(values, 0.95),
              max: Math.max(0, ...values),
              total: values.reduce((sum, value) => sum + value, 0),
            },
          ];
        }),
      ),
      slowCommits,
      longGaps,
    };
    await writeFile(resolve(output), JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
    if (failureCount) process.exitCode = 1;
    console.log(
      JSON.stringify({
        output,
        ...report,
        commands: undefined,
        before: undefined,
        after: undefined,
        sql: undefined,
        slowSql: undefined,
        commits: undefined,
        commitAttribution: undefined,
        slowCommits: undefined,
        longGaps: undefined,
      }),
    );
  } finally {
    stopTrace();
    if (commandTimer) clearInterval(commandTimer);
    if (speechTimer) clearInterval(speechTimer);
    if (probeTimer) clearInterval(probeTimer);
    streamAbort.abort();
    try {
      await Promise.all([commandTask, speechTask, probeTask, streamTask]);
    } finally {
      profiler.disconnect();
    }
  }
} finally {
  await probe.end().catch(() => {});
  await closeResources();
}
