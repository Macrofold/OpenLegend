import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Session } from 'node:inspector/promises';
import { performanceSnapshot } from '../apps/server/src/performance.js';
import { createGameServer } from '../apps/server/src/http.js';
import { readConfig } from '../apps/server/src/config.js';
import { SqliteStore } from '../apps/server/src/store.js';
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
const directory = await mkdtemp(join(tmpdir(), 'openlegend-scene-profile-'));
const config = readConfig({
  OPEN_LEGEND_DATA_DIR: directory,
  OPEN_LEGEND_DATABASE_URL: process.env['OPENLEGEND_STRESS_DATABASE_URL'],
  AI_BUDGET_USD: cognitionFixture ? '0.1' : '0',
  OPENAI_EMBEDDING_API_KEY: '',
  // Exercise cognition scheduling with a transport that cannot dispatch paid work.
  TYPESAFE_API_KEY: 'local-fixture',
  OPENAI_API_KEY: 'local-fixture',
  WORLD_SEED: '73',
  OPEN_LEGEND_GOD_MODE: 'true',
});
const database = config.databaseUrl ? new PostgresDatabase(config.databaseUrl) : undefined;
const sql = new Map<string, { count: number; ms: number }>();
const slowSql: Array<{ sql: string; ms: number }> = [];
if (database) {
  const query = database.query.bind(database);
  database.query = async (statement, params) => {
    const at = performance.now();
    try {
      return await query(statement, params);
    } finally {
      const key = statement.replace(/\s+/g, ' ').slice(0, 120);
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
  };
}
if (database) {
  const row = await database
    .prepare(
      "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema='open_legend'",
    )
    .get();
  if (Number(row?.['count'])) {
    await database.close();
    throw new Error(
      'Use a new disposable database; existing schemas are never migrated by this profiler.',
    );
  }
}
const store = new SqliteStore(config.databasePath, database);
await store.ready;
if (await store.load()) {
  await store.close();
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
await new Promise<void>((done) => game.server.listen(0, '127.0.0.1', done));
const address = game.server.address();
if (!address || typeof address === 'string') throw new Error('Missing server address.');
const base = `http://127.0.0.1:${address.port}`;
const profiler = new Session();
const streamAbort = new AbortController();
let streamTask: Promise<void> | undefined;
let commandTimer: ReturnType<typeof setInterval> | undefined;
let commandTask: Promise<void> | undefined;
let commandBusy = false;
const commands: Array<{ atMs: number; ms: number; ok: boolean; code?: string }> = [];
const gaps: number[] = [];
const warmGaps: number[] = [];
let measureStart = 0;
let bytes = 0,
  updates = 0;
try {
  const client = 'scene-profile';
  const response = await fetch(base + '/api/state', { headers: { 'X-OL-Client': client } });
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  if (!cookie) throw new Error('Missing local session.');
  const view = (await response.json()) as GameView;
  globalThis.gc?.();
  const initialHeapBytes = process.memoryUsage().heapUsed;
  const post = async (path: string, body: unknown) => {
    const r = await fetch(base + path, {
      method: 'POST',
      headers: { cookie, origin: base, 'content-type': 'application/json', 'X-OL-Client': client },
      body: JSON.stringify(body),
    });
    return (await r.json()) as { ok: boolean; code?: string; message?: string };
  };
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
        bytes += read.value.length;
        pending += decoder.decode(read.value, { stream: true });
        const messages = pending.split('\n\n');
        pending = messages.pop()!;
        for (const message of messages)
          if (/event: (patch|snapshot)/.test(message)) {
            const at = performance.now();
            gaps.push(at - lastUpdate);
            if (lastUpdate - measureStart >= 5000) warmGaps.push(at - lastUpdate);
            lastUpdate = at;
            updates++;
          }
      }
    } catch (error) {
      if (!streamAbort.signal.aborted) throw error;
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
    })().finally(() => {
      commandBusy = false;
    });
  }, 1000);
  const start = performance.now(),
    simStart = game.service.world.simTime;
  measureStart = start;
  const before = performanceSnapshot();
  sql.clear();
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
  console.error(
    `profile server ready: ${base}; ${database ? 'PostgreSQL' : 'SQLite'}, ${seconds}s at 3x`,
  );
  await new Promise<void>((done) => setTimeout(done, seconds * 1000));
  clearInterval(commandTimer);
  await commandTask;
  const elapsedMs = performance.now() - start;
  const simulatedSeconds = game.service.world.simTime - simStart;
  const after = performanceSnapshot();
  await post('/api/control', { paused: true });
  if (process.env['OPENLEGEND_CPU_PROFILE'] === '1') {
    const { profile } = await profiler.post('Profiler.stop');
    await writeFile(resolve(output) + '.cpuprofile', JSON.stringify(profile), {
      flag: 'wx',
      mode: 0o600,
    });
  }
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
    cognition: cognitionFixture ? 'native-route-fixture' : 'spending-disabled',
    adapter: database ? 'postgres' : 'sqlite',
    setupMs,
    elapsedMs,
    simulatedSeconds,
    achievedSpeed: simulatedSeconds / (elapsedMs / 1000) / 60,
    providerCalls,
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
      maxGapMs: Math.max(0, ...gaps),
      warmP95GapMs: percentile(warmGaps, 0.95),
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
  };
  await writeFile(resolve(output), JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(
    JSON.stringify({
      output,
      ...report,
      commands: undefined,
      before: undefined,
      after: undefined,
      sql: undefined,
      slowSql: undefined,
    }),
  );
} finally {
  if (commandTimer) clearInterval(commandTimer);
  streamAbort.abort();
  try {
    await Promise.all([commandTask, streamTask]);
  } finally {
    profiler.disconnect();
    await game.close();
  }
}
