import { createDisposableDatabase } from './disposable-postgres.mjs';
import { initializeCollisionRuntime } from '../packages/spatial/src/rapier.js';
import { mkdtemp, writeFile, stat } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { cpus, loadavg, tmpdir } from 'node:os';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { execFileSync } from 'node:child_process';
import {
  createWorld,
  NPC_ID,
  freezeWorld,
  updateWorld,
  observeActor,
  type MemoryRecord,
  EXPERIENCE_LIMITS,
} from '@open-legend/domain';
import { SqlGameRepository, type SavedWorld } from '../apps/server/src/store.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { candidateSet } from '../apps/server/src/recall.js';
import { MemoryReadCache, type MemoryScope } from '../apps/server/src/memory-repository.js';
import { observeDurations, recordDuration } from '../apps/server/src/performance.js';

// PW09: owned disposable PostgreSQL, deterministic retained evidence and synthetic vectors.
// Exercise real retrieval/body preparation; no provider, production index or test runner.
await initializeCollisionRuntime();
const [output, sizeArgument = '5000', roundsArgument = '30'] = process.argv.slice(2);
const size = Number(sizeArgument),
  rounds = Number(roundsArgument);
if (
  !output ||
  !Number.isSafeInteger(size) ||
  size < 2 ||
  size > 1_000_000 ||
  !Number.isSafeInteger(rounds) ||
  rounds < 1 ||
  rounds > 1000
)
  throw new Error(
    'Usage: AI_BUDGET_USD=0 pnpm exec tsx scripts/stress-data.ts NEW_REPORT.json [SOURCES=5000] [ROUNDS=30]',
  );
if (process.env['AI_BUDGET_USD'] !== '0') throw new Error('Set AI_BUDGET_USD=0.');
type SqlSample = {
  sql: string;
  params: unknown[];
  milliseconds: number;
  rows: number;
  bodyRows: number;
  bodyBytes: number;
};
class MeasuredDatabase extends PostgresDatabase {
  samples: SqlSample[] = [];
  collecting = false;
  override async query(sql: string, params: unknown[] = []) {
    const at = performance.now();
    let rows = 0,
      bodyRows = 0,
      bodyBytes = 0;
    try {
      const result = await super.query(sql, params);
      rows = result.rows.length;
      if (/^\s*SELECT id,payload FROM mind_(memories|awareness|summaries)\b/.test(sql)) {
        for (const row of result.rows)
          if (typeof row['payload'] === 'string') {
            bodyRows++;
            bodyBytes += Buffer.byteLength(row['payload']);
          }
      }
      return result;
    } finally {
      if (this.collecting)
        this.samples.push({
          sql,
          params: [
            'lexicalRerank',
            'exactVector',
            'indexedCount',
            'eligibleCount',
            'hydrate',
            'byteAdmission',
          ].includes(sqlKind(sql))
            ? params
            : [],
          milliseconds: performance.now() - at,
          rows,
          bodyRows,
          bodyBytes,
        });
    }
  }
}
const summarize = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p: number) => sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] ?? 0;
  return { n: sorted.length, p50: percentile(0.5), p95: percentile(0.95), max: sorted.at(-1) ?? 0 };
};
const sqlKind = (sql: string) =>
  /ts_rank\(/.test(sql)
    ? 'lexicalRerank'
    : /^\s*SELECT COUNT\(\*\) AS count FROM memory_vectors/.test(sql)
      ? 'indexedCount'
      : /^\s*SELECT COUNT\(\*\).*FROM recall_sources/s.test(sql)
        ? 'eligibleCount'
        : /WITH matches AS MATERIALIZED/.test(sql)
          ? 'exactVector'
          : /^\s*SELECT id,payload FROM mind_/.test(sql)
            ? 'hydrate'
            : /SUM\(octet_length\(payload\)\)/.test(sql)
              ? 'byteAdmission'
              : 'other';
const sqlSummary = (samples: SqlSample[]) => ({
  count: samples.length,
  milliseconds: samples.reduce((n, row) => n + row.milliseconds, 0),
  returnedRows: samples.reduce((n, row) => n + row.rows, 0),
  hydratedBodies: samples.reduce((n, row) => n + row.bodyRows, 0),
  hydratedBytes: samples.reduce((n, row) => n + row.bodyBytes, 0),
  byKind: Object.fromEntries(
    [...new Set(samples.map((row) => sqlKind(row.sql)))].map((kind) => {
      const rows = samples.filter((row) => sqlKind(row.sql) === kind);
      return [
        kind,
        {
          count: rows.length,
          milliseconds: rows.reduce((n, row) => n + row.milliseconds, 0),
          returnedRows: rows.reduce((n, row) => n + row.rows, 0),
        },
      ];
    }),
  ),
});
const directory = await mkdtemp(join(tmpdir(), 'openlegend-data-stress-'));
const disposable = await createDisposableDatabase(process.env['OPENLEGEND_STRESS_DATABASE_URL']);
console.log(JSON.stringify({ fixture: disposable.details.database, directory }));
let db = new MeasuredDatabase(disposable.url),
  store = new SqlGameRepository(directory, db);
const measurements: Record<
  string,
  {
    milliseconds: number[];
    sql: ReturnType<typeof sqlSummary>[];
    readWaitMs: number[];
    cpuMs: number[];
    stages: Record<string, number>[];
  }
> = {};
const plans: Record<string, unknown> = {},
  representative = new Map<string, Pick<SqlSample, 'sql' | 'params'>>();
const attachProjectionTiming = () => {
  const project = store.memories.project.bind(store.memories);
  store.memories.project = async (...args: Parameters<typeof project>) => {
    const at = performance.now();
    try {
      return await project(...args);
    } finally {
      recordDuration('benchmark.memoryProjection', performance.now() - at);
    }
  };
};
attachProjectionTiming();
let stages: Record<string, number> = {};
let readWait = 0;
const stopObserving = observeDurations((name, ms) => {
  if (name === 'postgres.readWait') readWait += ms;
  stages[name] = (stages[name] ?? 0) + ms;
});
const memorySamples: {
  atMs: number;
  heapUsed: number;
  rss: number;
  cpuUserUs: number;
  cpuSystemUs: number;
  load: number[];
}[] = [];
const started = performance.now();
const sampleMemory = () => {
  const m = process.memoryUsage(),
    cpu = process.cpuUsage();
  memorySamples.push({
    atMs: performance.now() - started,
    heapUsed: m.heapUsed,
    rss: m.rss,
    cpuUserUs: cpu.user,
    cpuSystemUs: cpu.system,
    load: loadavg(),
  });
};
const sampler = setInterval(sampleMemory, 50);
sampler.unref();
const measure = async <T>(name: string, run: () => Promise<T>): Promise<T> => {
  db.samples = [];
  db.collecting = true;
  readWait = 0;
  stages = {};
  const at = performance.now(),
    cpu = process.cpuUsage();
  try {
    return await run();
  } finally {
    sampleMemory();
    const usage = process.cpuUsage(cpu),
      value = (measurements[name] ??= {
        milliseconds: [],
        sql: [],
        readWaitMs: [],
        cpuMs: [],
        stages: [],
      });
    value.milliseconds.push(performance.now() - at);
    value.cpuMs.push((usage.user + usage.system) / 1000);
    value.sql.push(sqlSummary(db.samples));
    value.readWaitMs.push(readWait);
    value.stages.push(stages);
    for (const row of db.samples) {
      const kind = sqlKind(row.sql);
      if (
        [
          'lexicalRerank',
          'exactVector',
          'indexedCount',
          'eligibleCount',
          'hydrate',
          'byteAdmission',
        ].includes(kind)
      )
        representative.set(kind, { sql: row.sql, params: row.params });
    }
    db.samples = [];
    db.collecting = false;
    if (measurements[name]?.milliseconds.length === 1)
      console.log(JSON.stringify({ phase: name, milliseconds: performance.now() - at }));
  }
};
const source = (actorId: string, index: number, summary?: string): MemoryRecord => ({
  id: `stress-${actorId}-${index.toString().padStart(7, '0')}`,
  actorId,
  kind: index === 1 ? 'commitment' : 'episode',
  source: 'observed',
  summary:
    summary ??
    (index === 0
      ? 'An old archiverare observation survives newer history.'
      : `Synthetic retained observation ${index}; batch ${Math.floor(index / 100)}.`),
  at: index,
  entityIds: [],
  importance: index === 0 ? 9 : index % 10,
});
const model = { model: 'synthetic-stress-v1', dimensions: 512 },
  otherModel = { model: 'synthetic-stress-v2', dimensions: 256 };
const vector = (id: string, dimensions: number) => {
  const seed = [...id].reduce((n, c) => (Math.imul(n, 33) + c.charCodeAt(0)) >>> 0, 73);
  return Array.from(
    { length: dimensions },
    (_, i) => (((Math.imul(seed ^ i, 48271) >>> 0) % 1009) + 1) / 1009,
  );
};
const query = vector('fixed-query-seed-73', model.dimensions),
  selectiveQuery = 'archiverare',
  broadQuery = 'syn';
const digestSelection = (value: { memory: { id: string }; score?: number }[]) =>
  createHash('sha256')
    .update(JSON.stringify(value.map((row) => [row.memory.id, row.score])))
    .digest('hex');
try {
  await store.ready;
  if (await store.load()) throw new Error('Refusing to benchmark a nonempty world.');
  const environment = {
    postgres: await db
      .prepare(
        "SELECT version() AS version,current_setting('lc_ctype') AS ctype,current_setting('lc_collate') AS collate",
      )
      .get(),
    vector: await db.prepare("SELECT extversion FROM pg_extension WHERE extname='vector'").get(),
    hnswSettings: await db
      .prepare("SELECT name,setting FROM pg_settings WHERE name LIKE 'hnsw.%'")
      .all(),
    hnsw: await db.prepare("SELECT amname FROM pg_am WHERE amname='hnsw'").all(),
    indexes: await db
      .prepare(
        "SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='open_legend' AND tablename IN ('memory_vectors','recall_sources')",
      )
      .all(),
  };
  const fixtureAt = performance.now();
  const world = createWorld(73),
    unrelated = Object.keys(world.memories)
      .filter((id) => id !== NPC_ID)
      .slice(0, 2);
  if (unrelated.length !== 2) throw new Error('Fixture requires two unrelated actors.');
  world.simTime = size + (EXPERIENCE_LIMITS.rawHours + 1) * 3600;
  world.memories[NPC_ID] = Array.from({ length: size }, (_, i) => source(NPC_ID, i));
  for (const actor of unrelated)
    world.memories[actor] = Array.from({ length: 1000 }, (_, i) => source(actor, i));
  let state: SavedWorld = { world: freezeWorld(world), speed: 1, manuallyPaused: true };
  const fixtureSetupMs = performance.now() - fixtureAt;
  let revision = await measure('initialCommit', () => store.commit(0, state));
  const restored = await measure('initialRecovery', () => store.load());
  const recoveredExactly = isDeepStrictEqual(restored?.state, JSON.parse(JSON.stringify(state)));
  if (!restored || !recoveredExactly) throw new Error('Recovery changed canonical source data.');
  const active = await measure('activeRecovery', () => store.load(true));
  if (!active) throw new Error('Missing active world.');
  state = active.state;
  freezeWorld(state.world);
  const oldOutsideWorkingSet = !state.world.memories[NPC_ID]?.some(
    (row) => row.id === source(NPC_ID, 0).id,
  );
  if (!oldOutsideWorkingSet)
    throw new Error('Old relevant evidence must remain outside the active working set.');
  let head = await store.records.head();
  if (!head) throw new Error('Missing committed world.');
  let scope: MemoryScope = { worldId: world.id, actorId: NPC_ID, generation: head.generation };
  await measure('projectionStatisticsPreparation', () =>
    db.exec('ANALYZE recall_sources; ANALYZE mind_memories'),
  );
  await measure('syntheticIndexBuild', async () => {
    for (const actorScope of [scope, ...unrelated.map((actorId) => ({ ...scope, actorId }))])
      while (true) {
        const batch = await store.memories.pending(actorScope, model, 1000);
        if (!batch.length) break;
        await store.memories.putVectors(
          actorScope,
          model,
          batch.map((row) => ({
            id: row.memory.id,
            revision: row.revision,
            vector: vector(row.memory.id, model.dimensions),
          })),
        );
      }
  });
  const excludedIds = [source(NPC_ID, size - 1).id],
    requiredIds = [source(NPC_ID, 1).id];
  const retrieval = async () => {
    const bodies = new MemoryReadCache(),
      observed = observeActor(state.world, NPC_ID, { includeMemories: false });
    if (!observed) throw new Error('Actor observation unavailable.');
    const conversation = await store.memories.context(scope, requiredIds, false),
      coverage = await store.memories.coverage(scope, model);
    const required = await store.memories.required(scope, requiredIds, bodies);
    const selected = await store.memories.select(
      scope,
      300,
      { ...model, query },
      excludedIds,
      bodies,
    );
    if ((await store.records.head())?.generation !== scope.generation)
      throw new Error('World restored during memory retrieval.');
    const sources = [
      ...new Map([...selected, ...required].map((row) => [row.memory.id, row])).values(),
    ];
    const candidates = candidateSet(
      state.world,
      NPC_ID,
      observed,
      requiredIds,
      [],
      excludedIds,
      sources,
    );
    if (
      sources.some((row) => row.memory.actorId !== NPC_ID) ||
      selected.some((row) => excludedIds.includes(row.memory.id))
    )
      throw new Error('Actor scope or conversation exclusion failed.');
    if (!candidates.some((row) => row.id === requiredIds[0] && row.required))
      throw new Error('Required evidence lost.');
    return {
      selectedDigest: digestSelection(selected),
      orderedSelection: selected.map((row) => [row.memory.id, row.score]),
      selected: selected.length,
      sources: sources.length,
      candidates: candidates.length,
      coverage,
      conversationSources: conversation.sources.length,
    };
  };
  const lexical = async (text: string | null) => {
    const rows = await store.memories.selectContext(scope, text, 30);
    if (rows.some((row) => row.memory.actorId !== NPC_ID))
      throw new Error('Lexical actor scope failed.');
    if (text === selectiveQuery && !rows.some((row) => row.memory.id === source(NPC_ID, 0).id))
      throw new Error('Old relevant evidence was not selected.');
    return {
      digest: digestSelection(rows),
      ids: rows.map((row) => row.memory.id),
      scores: rows.map((row) => row.score),
    };
  };
  const failures: Record<string, string> = {};
  const cold = async <T>(name: string, run: () => Promise<T>): Promise<T | null> => {
    try {
      return await measure(name, run);
    } catch (error) {
      failures[name] = error instanceof Error ? error.message : 'Unknown failure';
      return null;
    }
  };
  const first = {
    selective: await measure('coldLexicalSelective', () => lexical(selectiveQuery)),
    broad: await measure('coldLexicalBroad', () => lexical(broadQuery)),
    recent: await measure('coldRecent', () => lexical(null)),
    vector: await cold('coldExactTop300', async () =>
      digestSelection(await store.memories.select(scope, 300, { ...model, query }, excludedIds)),
    ),
    caller: await cold('coldCompleteCaller', retrieval),
  };
  for (const [kind, row] of representative)
    plans['beforeStatistics.' + kind] = await db
      .prepare(`EXPLAIN (FORMAT JSON) ${row.sql}`)
      .all(...row.params);
  // Fix PostgreSQL statistics as part of fixture setup for repeatable matched comparisons.
  // Preserve the first unanalyzed request and its failures above; analysis is not a pass for it.
  await measure('statisticsPreparation', () =>
    db.exec('ANALYZE recall_sources; ANALYZE memory_vectors; ANALYZE mind_memories'),
  );
  const reference = await measure('analyzedColdCompleteCaller', retrieval);
  const warmEvidence: {
    selective: Awaited<ReturnType<typeof lexical>>;
    broad: Awaited<ReturnType<typeof lexical>>;
    semanticDigest: string;
  }[] = [];
  for (let i = 0; i < rounds; i++) {
    const selective = await measure('warmLexicalSelective', () => lexical(selectiveQuery));
    const broad = await measure('warmLexicalBroad', () => lexical(broadQuery));
    if (!isDeepStrictEqual(selective, first.selective) || !isDeepStrictEqual(broad, first.broad))
      throw new Error('Unchanged ordered lexical IDs or scores drifted.');
    const value = await measure('warmCompleteCaller', retrieval);
    if (value.selectedDigest !== reference.selectedDigest)
      throw new Error('Unchanged exact selection drifted.');
    warmEvidence.push({ selective, broad, semanticDigest: value.selectedDigest });
  }
  const mutations: Record<string, unknown> = {};
  const unchangedLexical = async () => {
    const value = await lexical(selectiveQuery);
    if (!isDeepStrictEqual(value, first.selective))
      throw new Error('Unrelated change altered ordered lexical IDs or scores.');
    return value;
  };
  const unchangedRetrieval = async () => {
    const value = await retrieval();
    if (
      value.selectedDigest !== reference.selectedDigest ||
      !isDeepStrictEqual(value.coverage, reference.coverage)
    )
      throw new Error('Unrelated change altered semantic selection or target coverage.');
    return value;
  };
  for (const [index, actor] of unrelated.entries()) {
    state = {
      ...state,
      world: freezeWorld(
        updateWorld(state.world, (draft) => {
          draft.memories[actor]!.push({ ...source(actor, 1000 + index), at: draft.simTime });
        }),
      ),
    };
    revision = await measure(`unrelated${index}Commit`, () => store.commit(revision, state));
    mutations[`unrelated${index}Source`] = await measure(
      `afterUnrelated${index}SourceLexical`,
      unchangedLexical,
    );
    mutations[`unrelated${index}SourceCaller`] = await measure(
      `afterUnrelated${index}SourceCaller`,
      unchangedRetrieval,
    );
    const actorScope = { ...scope, actorId: actor },
      pending = await store.memories.pending(actorScope, model, 1);
    await measure(`unrelated${index}VectorPublish`, () =>
      store.memories.putVectors(
        actorScope,
        model,
        pending.map((row) => ({
          id: row.memory.id,
          revision: row.revision,
          vector: vector(row.memory.id, model.dimensions),
        })),
      ),
    );
    mutations[`unrelated${index}Vector`] = await measure(
      `afterUnrelated${index}VectorLexical`,
      unchangedLexical,
    );
    mutations[`unrelated${index}VectorCaller`] = await measure(
      `afterUnrelated${index}VectorCaller`,
      unchangedRetrieval,
    );
    await measure(`unrelated${index}VectorReuse`, () =>
      store.memories.reuseVectors(
        scope.worldId,
        new Map([[actor, new Set(pending.map((row) => row.memory.id))]]),
      ),
    );
    mutations[`unrelated${index}ReuseCaller`] = await measure(
      `afterUnrelated${index}ReuseCaller`,
      unchangedRetrieval,
    );
  }
  const known = await store.memories.select(scope, 1);
  await measure('otherModelVectorPublish', () =>
    store.memories.putVectors(
      scope,
      otherModel,
      known.map((row) => ({
        id: row.memory.id,
        revision: row.revision,
        vector: vector(row.memory.id, otherModel.dimensions),
      })),
    ),
  );
  mutations['otherModelLexical'] = await measure('afterOtherModelLexical', unchangedLexical);
  mutations['otherModelCaller'] = await measure('afterOtherModelCaller', unchangedRetrieval);
  state = {
    ...state,
    world: freezeWorld(
      updateWorld(state.world, (draft) => {
        draft.memories[NPC_ID]!.push({
          ...source(NPC_ID, size, 'archiverare archiverare archiverare newly relevant evidence.'),
          at: draft.simTime,
        });
      }),
    ),
  };
  revision = await measure('targetCommit', () => store.commit(revision, state));
  const targetLexical = await measure('afterTargetLexical', () => lexical(selectiveQuery));
  const newRank = targetLexical.ids.indexOf(source(NPC_ID, size).id),
    oldRank = targetLexical.ids.indexOf(source(NPC_ID, 0).id);
  if (
    first.selective.ids.includes(source(NPC_ID, size).id) ||
    targetLexical.ids[0] !== requiredIds[0] ||
    newRank < 0 ||
    oldRank <= newRank ||
    !(targetLexical.scores[newRank]! > targetLexical.scores[oldRank]!)
  )
    throw new Error('Newly relevant target evidence did not outrank the old matching memory.');
  mutations['target'] = targetLexical;
  mutations['targetCaller'] = await measure('afterTargetCaller', retrieval);
  const checkpointId = randomUUID();
  await measure('checkpointPublication', () =>
    store.saves.create(state, 'Data stress', checkpointId, { expectedRevision: revision }),
  );
  const checkpointBytes = (await stat(join(directory, 'saves', checkpointId, 'world.jsonl'))).size,
    beforeReopen = await lexical(selectiveQuery);
  await measure('close', () => store.close());
  db = new MeasuredDatabase(disposable.url);
  store = new SqlGameRepository(directory, db);
  attachProjectionTiming();
  const reopened = await measure('reopen', async () => {
    await store.ready;
    return store.load(true);
  });
  if (!reopened) throw new Error('Missing reopened world.');
  state = reopened.state;
  freezeWorld(state.world);
  revision = reopened.revision;
  head = await store.records.head();
  if (!head) throw new Error('Missing reopened head.');
  scope = { ...scope, generation: head.generation };
  const afterReopen = await measure('reopenLexical', () => lexical(selectiveQuery));
  if (afterReopen.digest !== beforeReopen.digest)
    throw new Error('Reopen changed lexical evidence.');
  const reopenedCaller = await measure('reopenCaller', retrieval);
  const payload = await measure('checkpointRead', () =>
      store.saves.read(scope.worldId, checkpointId),
    ),
    recoveryId = randomUUID();
  await measure('recoveryCheckpoint', () =>
    store.saves.create(state, 'Before data stress restore', recoveryId, {
      expectedRevision: revision,
      kind: 'recovery',
    }),
  );
  const restore = {
    id: checkpointId,
    requestId: randomUUID(),
    payload,
    epoch: { generation: 1, openedAt: 1, token: randomUUID() },
    timeline: randomUUID(),
    recoveryId,
  };
  const restoreRevision = await cold('restore', () =>
    store.commit(revision, payload.state, undefined, undefined, {
      before: state.world,
      after: payload.state.world,
      restore,
    }),
  );
  let afterRestore: Awaited<ReturnType<typeof lexical>> | null = null,
    restoredCaller: Awaited<ReturnType<typeof retrieval>> | null = null;
  if (restoreRevision !== null) {
    revision = restoreRevision;
    const restoredActive = await measure('restoreActiveRecovery', () => store.load(true));
    if (!restoredActive) throw new Error('Missing restored active world.');
    state = restoredActive.state;
    freezeWorld(state.world);
    head = await store.records.head();
    if (!head || head.generation === scope.generation)
      throw new Error('Restore did not fence old generation.');
    scope = { ...scope, generation: head.generation };
    afterRestore = await measure('restoreLexical', () => lexical(selectiveQuery));
    if (afterRestore.digest !== beforeReopen.digest)
      throw new Error('Restore changed lexical evidence.');
    restoredCaller = await measure('restoreCaller', retrieval);
  } else {
    const unchangedHead = await store.records.head();
    if (
      !unchangedHead ||
      unchangedHead.generation !== scope.generation ||
      (await lexical(selectiveQuery)).digest !== beforeReopen.digest
    )
      throw new Error('Failed restore changed committed generation or lexical evidence.');
  }
  const counts = {
    eligible: await store.memories.count(scope),
    foreignActor: await store.memories.count({ ...scope, actorId: 'absent-actor' }),
  };
  const matched = await db
    .prepare(
      'SELECT COUNT(*) AS count FROM recall_sources WHERE world_id=? AND actor_id=? AND eligible=1 AND search_vector @@ ?::tsquery',
    )
    .get(scope.worldId, scope.actorId, "'syn':*");
  // Actual bound production queries, explained after measurements. No index is installed.
  for (const [kind, row] of representative)
    plans[kind] = await db
      .prepare(`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${row.sql}`)
      .all(...row.params);
  environment.hnswSettings = await db
    .prepare("SELECT name,setting FROM pg_settings WHERE name LIKE 'hnsw.%'")
    .all();
  const databaseBytes = await db
    .prepare('SELECT pg_database_size(current_database()) AS bytes')
    .get();
  const privateCaches = store.memories as unknown as Record<string, unknown>;
  const cacheSizes = Object.fromEntries(
    Object.entries(privateCaches)
      .filter(([, v]) => v instanceof Map)
      .map(([k, v]) => [k, (v as Map<unknown, unknown>).size]),
  );
  let revisionLabel = 'unavailable';
  try {
    revisionLabel = execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    /* Archived baseline has no Git metadata. */
  }
  const report = {
    label: process.env['OPENLEGEND_BENCHMARK_LABEL'] ?? revisionLabel,
    implementationRevision: revisionLabel,
    command: `AI_BUDGET_USD=0 node --expose-gc --import tsx scripts/stress-data.ts NEW_REPORT.json ${size} ${rounds}`,
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    cpu: cpus()[0]?.model,
    cpuCount: cpus().length,
    seed: 73,
    concurrency: 1,
    database: disposable.details,
    environment,
    directory,
    sources: size,
    unrelatedActors: unrelated.map((actorId) => ({ actorId, initialSources: 1000 })),
    rounds,
    dimensions: model.dimensions,
    otherModel,
    query: {
      selective: selectiveQuery,
      broad: broadQuery,
      vectorDigest: createHash('sha256').update(JSON.stringify(query)).digest('hex'),
    },
    fixtureSetupMs,
    failures,
    first,
    analyzedReference: reference,
    warmEvidence,
    mutations,
    reopenedCaller,
    restoredCaller,
    counts,
    broadMatched: Number(matched?.['count']),
    checkpointBytes,
    databaseBytes: Number(databaseBytes?.['bytes']),
    recoveredExactly,
    oldOutsideWorkingSet,
    activeMemoryRows: state.world.memories[NPC_ID]?.length,
    reopenedExactly: beforeReopen.digest === afterReopen.digest,
    restoredExactly: afterRestore !== null && beforeReopen.digest === afterRestore.digest,
    failedRestorePreservedCommittedEvidence: restoreRevision === null,
    cacheSizes,
    plans,
    phases: Object.fromEntries(
      Object.entries(measurements).map(([name, v]) => [
        name,
        {
          milliseconds: summarize(v.milliseconds),
          rawMilliseconds: v.milliseconds,
          sql: v.sql,
          cpuMs: summarize(v.cpuMs),
          readWaitMs: summarize(v.readWaitMs),
          stages: v.stages,
        },
      ]),
    ),
    memory: {
      samplingIntervalMs: 50,
      sampledMaximumHeap: Math.max(...memorySamples.map((v) => v.heapUsed)),
      sampledMaximumRss: Math.max(...memorySamples.map((v) => v.rss)),
      samples: memorySamples,
      limitation:
        '50ms samples and phase boundaries are observed samples, not an exact process peak.',
    },
    elapsedMs: performance.now() - started,
    providerCostUsd: 0,
  };
  await writeFile(output, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(
    JSON.stringify({
      output,
      label: report.label,
      sources: size,
      elapsedMs: report.elapsedMs,
      caller: report.phases['warmCompleteCaller']?.milliseconds,
      providerCostUsd: 0,
    }),
  );
} finally {
  clearInterval(sampler);
  stopObserving();
  try {
    await store.close();
  } finally {
    await disposable.close();
  }
}
