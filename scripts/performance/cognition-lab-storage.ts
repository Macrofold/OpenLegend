import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { createDisposableDatabase } from '../disposable-postgres.mjs';
import { PostgresDatabase } from '../../apps/server/src/postgres.js';
import {
  CognitionLabRecords,
  LAB_STORAGE_DEFAULTS,
  type LabImportEntry,
  type LabRecord,
} from '../../apps/server/src/cognition-lab-records.js';
import type { SqlDatabase } from '../../apps/server/src/store.js';

/** Actual repository callers, no HTTP/render/native-game/provider qualification.
 * Usage: OPENLEGEND_TEST_DATABASE_URL=postgresql://127.0.0.1/postgres AI_BUDGET_USD=0
 * pnpm exec tsx scripts/performance/cognition-lab-storage.ts /tmp/new-report.json
 */
const output = process.argv[2];
if (!output) throw new Error('Choose a new external JSON report path.');
if (process.env['AI_BUDGET_USD'] !== '0')
  throw new Error('This profiler requires AI_BUDGET_USD=0.');
const directory = await mkdtemp(join(tmpdir(), 'openlegend-lab-storage-profile-'));
let database: Awaited<ReturnType<typeof createDisposableDatabase>> | undefined;
let native: PostgresDatabase | undefined;
let current: string | undefined;
const queries = new Map<string, { sql: string; params: unknown[] }>();
const statementCounts = new Map<string, number>();
const observed = (db: PostgresDatabase): SqlDatabase => ({
  writeGroups: db.writeGroups,
  get transactionActive() {
    return db.transactionActive;
  },
  transaction: (operation) => db.transaction(operation),
  readTransaction: (operation) => db.readTransaction(operation),
  exec: (sql) => db.exec(sql),
  close: () => db.close(),
  prepare(sql) {
    const prepared = db.prepare(sql);
    return {
      get(...params: unknown[]) {
        if (current) {
          statementCounts.set(current, (statementCounts.get(current) ?? 0) + 1);
          queries.set(current, { sql, params });
        }
        return prepared.get(...params);
      },
      all(...params: unknown[]) {
        if (current) {
          statementCounts.set(current, (statementCounts.get(current) ?? 0) + 1);
          queries.set(current, { sql, params });
        }
        return prepared.all(...params);
      },
      run(...params: unknown[]) {
        return prepared.run(...params);
      },
    };
  },
});
const quantile = (values: number[], fraction: number) =>
  values[Math.min(values.length - 1, Math.floor(values.length * fraction))] ?? 0;
const rows: {
  size: number;
  setupMs: number;
  calls: Record<string, unknown>;
  plans: Record<string, unknown>;
  storage: unknown;
  memory: unknown;
  eventLoop: unknown;
}[] = [];
try {
  database = await createDisposableDatabase(process.env['OPENLEGEND_TEST_DATABASE_URL']);
  native = new PostgresDatabase(database.url);
  const db = observed(native),
    records = new CognitionLabRecords(db, directory);
  await records.ready;
  const runId = randomUUID(),
    stageId = randomUUID();
  await records.configureRun(runId);
  const makeRecord = (kind: LabRecord['kind'], index: number, scope?: string): LabRecord => ({
    id: randomUUID(),
    kind,
    createdAt: new Date(1_800_000_000_000 + index).toISOString(),
    name: `Fixture ${kind} ${index}`,
    summary: { label: `Recorded fixture ${index}`, disposition: 'native-only' },
    data: { fixture: true },
    ...(scope ? { runId: scope } : {}),
  });
  await records.putRecord({ ...makeRecord('run', 0), id: runId, runId, status: 'ended' });
  await records.putRecord({
    ...makeRecord('stage', 0, runId),
    id: stageId,
    parentId: runId,
    actorId: 'fixture-selected',
  });
  const selected = Array.from({ length: 100 }, (_, index) => ({
    ...makeRecord('timeline', index),
    actorId: 'fixture-selected',
  }));
  for (const record of selected) await records.putRecord(record);
  const artifact = await records.putArtifact('α🦉'.repeat(600_000), 'text/plain; charset=utf-8', {
    runId,
  });
  let previous = 0;
  for (const size of [100, 10_000]) {
    const setupStart = performance.now();
    await records.publishImport(
      (async function* (): AsyncGenerator<LabImportEntry> {
        for (let index = previous; index < size; index++) {
          yield {
            kind: 'record',
            record: { ...makeRecord('timeline', index + 100), actorId: 'fixture-unrelated' },
            links: [],
          };
          yield { kind: 'record', record: makeRecord('interval', index, runId), links: [] };
          yield {
            kind: 'record',
            record: makeRecord(
              (['scenario', 'checkpoint', 'run', 'comparison'] as const)[index % 4]!,
              index,
            ),
            links: [],
          };
        }
      })(),
    );
    for (let index = previous; index < size; index += 100)
      await records.putEvidence(
        stageId,
        Array.from({ length: Math.min(100, size - index) }, (_, offset) => ({
          id: `fixture:${String(index + offset).padStart(8, '0')}`,
          stageId,
          kind: 'memory',
          label: `Fixture remembered source ${index + offset}`,
          summary: { selected: (index + offset) % 10 === 0, text: 'Fixture remembered evidence.' },
        })),
      );
    const setupMs = performance.now() - setupStart;
    previous = size;
    const monitor = monitorEventLoopDelay({ resolution: 10 });
    monitor.enable();
    const calls: Record<string, unknown> = {};
    const measure = async (name: string, operation: () => Promise<unknown>) => {
      const samples: number[] = [];
      statementCounts.set(name, 0);
      current = name;
      for (let index = 0; index < 30; index++) {
        const start = performance.now();
        await operation();
        samples.push(performance.now() - start);
      }
      current = undefined;
      const sorted = [...samples].sort((a, b) => a - b);
      calls[name] = {
        samples: 30,
        firstMs: samples[0],
        medianMs: quantile(sorted, 0.5),
        p95Ms: quantile(sorted, 0.95),
        maxMs: sorted.at(-1),
        sqlStatements: statementCounts.get(name),
        rowsPerPage: 50,
      };
    };
    await measure('actorPage', async () => {
      const page = await records.pageRecords('timeline', { actorId: 'fixture-selected' });
      if (page.items.length !== 50) throw new Error('Selected actor workload was not exercised.');
    });
    await measure('intervalPage', async () => {
      const page = await records.pageRecords('interval', { runId });
      if (page.items.length !== 50) throw new Error('Run interval workload was not exercised.');
    });
    await measure('savedPage', async () => {
      const page = await records.pageManagementRecords(
        ['scenario', 'checkpoint', 'run', 'comparison'],
        {},
        () => true,
      );
      if (page.items.length !== 50)
        throw new Error('The four-kind saved-work page was not exercised.');
    });
    await measure('evidencePage', async () => {
      const page = await records.pageEvidence(stageId);
      if (page.items.length !== 50) throw new Error('Stage evidence workload was not exercised.');
    });
    await measure('header', () => records.getHeader(runId, 'run'));
    await measure('absentHeader', () =>
      records.getHeader('00000000-0000-4000-8000-000000000000', 'run'),
    );
    await measure('payloadChunk', async () => {
      const chunk = await records.readArtifactChunk(artifact.id, 1024 ** 2);
      if (chunk.bytes.length !== LAB_STORAGE_DEFAULTS.chunkBytes)
        throw new Error('Exact chunk workload was not exercised.');
    });
    const plans: Record<string, unknown> = {};
    for (const [name, query] of queries) {
      if (!query.sql.startsWith('SELECT')) continue;
      const selectedQuery = query;
      plans[name] = await native.readTransaction(async () => {
        const plan = await native!
          .prepare(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${selectedQuery.sql}`)
          .get(...selectedQuery.params);
        return plan?.['QUERY PLAN'];
      });
    }
    monitor.disable();
    rows.push({
      size,
      setupMs,
      calls,
      plans,
      storage: await records.usage(),
      memory: { ...process.memoryUsage(), processMaximumRssKiB: process.resourceUsage().maxRSS },
      eventLoop: {
        samples: monitor.count,
        meanMs: monitor.count ? monitor.mean / 1e6 : null,
        maxMs: monitor.count ? monitor.max / 1e6 : null,
        p95Ms: monitor.count ? monitor.percentile(95) / 1e6 : null,
      },
    });
  }
  const report = {
    at: new Date().toISOString(),
    baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    modifiedSources: true,
    environment: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      database: database.details,
    },
    scope:
      'Actual storage repository API; PostgreSQL freshly seeded, no manual ANALYZE/cache eviction; repeated calls warm data; no HTTP, browser, live provider or full-game latency claim.',
    workload: {
      sizes: [100, 10000],
      fixedSelectedActorRecords: 100,
      unrelatedRecords: '100 then 10000',
      sameRunIntervals: '100 then 10000',
      savedRecords: '100 then 10000 across scenario/checkpoint/run/comparison',
      sameStageEvidence: '100 then 10000',
      artifactBytes: artifact.bytes,
      pageSize: 50,
      samplesPerCaller: 30,
      providers: 0,
      additionalJevUsd: 0,
      cumulativeTaskJevUsd:
        'Parent owns cumulative task accounting; this profiler dispatches no provider work.',
    },
    phases: rows,
  };
  await writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  process.stdout.write(
    JSON.stringify(
      {
        output,
        phases: rows.map(({ size, setupMs, calls, eventLoop, storage }) => ({
          size,
          setupMs,
          calls,
          eventLoop,
          storage,
        })),
      },
      null,
      2,
    ) + '\n',
  );
} finally {
  await native?.close();
  await database?.close();
  await rm(directory, { recursive: true, force: true });
}
