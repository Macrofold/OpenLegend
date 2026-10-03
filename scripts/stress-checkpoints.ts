import { isDeepStrictEqual } from 'node:util';
import { createDisposableDatabase } from './disposable-postgres.mjs';
import { initializeCollisionRuntime } from '../packages/spatial/src/rapier.js';
import { mkdtemp, stat, writeFile } from 'node:fs/promises';
import { tmpdir, cpus, totalmem, loadavg } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  createWorld,
  advanceWorld,
  updateWorld,
  worldPosition,
  type WorldState,
} from '@open-legend/domain';
import { SqlGameRepository } from '../apps/server/src/store.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { WorldService } from '../apps/server/src/world-service.js';
import { performanceSnapshot, startRuntimeMonitoring } from '../apps/server/src/performance.js';
import { readConfig } from '../apps/server/src/config.js';

// Native operational benchmark, no provider or test runner. Keep the disposable
// source and report for inspection; the database target must be empty.
// Initialize native geometry before constructing or validating recovered world state.
await initializeCollisionRuntime();

const [output, sizeArgument = '100000', roundsArgument = '3', residency = 'cold'] =
  process.argv.slice(2);
const size = Number(sizeArgument),
  rounds = Number(roundsArgument);
const writeDuringCapture = process.env['OPENLEGEND_STRESS_WRITE_DURING_CAPTURE'] === '1';
const measureRowRetention = process.env['OPENLEGEND_STRESS_MEASURE_ROW_RETENTION'] === '1';
if (
  !output ||
  !['cold', 'active'].includes(residency) ||
  !Number.isSafeInteger(size) ||
  size < 128 ||
  size > 200000 ||
  !Number.isSafeInteger(rounds) ||
  rounds < 1 ||
  rounds > 10 ||
  (measureRowRetention && !writeDuringCapture) ||
  process.env['AI_BUDGET_USD'] !== '0'
)
  throw new Error(
    'Usage: AI_BUDGET_USD=0 pnpm exec tsx scripts/stress-checkpoints.ts NEW_REPORT.json [SOURCES=100000] [ROUNDS=3] [cold|active]; optional OPENLEGEND_STRESS_WRITE_DURING_CAPTURE=1 and OPENLEGEND_STRESS_MEASURE_ROW_RETENTION=1 (requires the PostgreSQL pgstattuple extension)',
  );
const directory = await mkdtemp(join(tmpdir(), 'openlegend-checkpoint-stress-'));
const disposable = await createDisposableDatabase(process.env['OPENLEGEND_STRESS_DATABASE_URL']);
const url = disposable.url;
const store = new SqlGameRepository(directory, new PostgresDatabase(url));
const observer = writeDuringCapture ? new PostgresDatabase(url, true) : undefined;
const maintenance = measureRowRetention ? new PostgresDatabase(url, true) : undefined;
const deadVersions = async () => {
  if (!maintenance) return undefined;
  await maintenance.exec('VACUUM world_head');
  const row = await maintenance
    .prepare("SELECT dead_tuple_count, dead_tuple_len FROM pgstattuple('world_head')")
    .get();
  return {
    count: Number(row?.['dead_tuple_count'] ?? 0),
    bytes: Number(row?.['dead_tuple_len'] ?? 0),
  };
};
const storageCounters = async () => {
  if (!observer) return undefined;
  const row = await observer
    .prepare(
      `SELECT pg_current_wal_lsn() AS lsn,
      (SELECT COALESCE(SUM(n_dead_tup), 0) FROM pg_stat_user_tables) AS dead_rows`,
    )
    .get();
  return { lsn: String(row?.['lsn']), deadRowsEstimate: Number(row?.['dead_rows'] ?? 0) };
};
const walBytes = async (before?: { lsn: string }, after?: { lsn: string }) => {
  if (!observer || !before || !after) return undefined;
  const row = await observer
    .prepare('SELECT pg_wal_lsn_diff(?::pg_lsn, ?::pg_lsn) AS bytes')
    .get(after.lsn, before.lsn);
  return Number(row?.['bytes'] ?? 0);
};
const samples: Record<string, number[]> = {};
const stopMonitoring = startRuntimeMonitoring();
const measure = async <T>(name: string, run: () => Promise<T>) => {
  const start = performance.now();
  try {
    return await run();
  } finally {
    (samples[name] ??= []).push(performance.now() - start);
  }
};
try {
  await store.ready;
  if (maintenance) {
    // This disposable-only connection skips the repository's single-writer lock;
    // permit maintenance SQL without broadening the production store contract.
    await maintenance.exec('SET default_transaction_read_only=off');
    await maintenance.exec('CREATE EXTENSION IF NOT EXISTS pgstattuple WITH SCHEMA open_legend');
  }
  if (await store.load()) throw new Error('Stress target must be empty.');
  await measure('setup', async () => {
    const world = createWorld(73, {
      creatorAccountIds: ['local-player'],
      playerAccountId: 'local-player',
    });
    const actor = Object.values(world.entities).find((e) => e.kind === 'npc')!;
    world.simTime = 1000000;
    world.memories[actor.id] = Array.from({ length: size }, (_, i) => ({
      id: `stress-${i}`,
      actorId: actor.id,
      kind: 'episode',
      source: 'observed',
      summary: `Observation ${i}. ${'retained evidence '.repeat(24)}`,
      at: residency === 'active' ? world.simTime - (i % 3600) : i % 10000,
      sequence: i,
      entityIds: [],
      importance: i % 10,
    }));
    await store.commit(0, { world, speed: 1, manuallyPaused: false });
  });
  const service = new WorldService(
    store,
    readConfig({
      OPEN_LEGEND_DATABASE_URL: url,
      AI_BUDGET_USD: '0',
      OPEN_LEGEND_DATA_DIR: directory,
      WORLD_SEED: '73',
    }),
  );
  await service.ready;
  await service.setPresence('stress', true);
  await service.control({ paused: false, clientId: 'stress' });
  for (let i = 0; i < 20; i++) await service.tick(0.05, 0);
  await service.flush();
  // Excludes fixture construction garbage when explicitly run with --expose-gc.
  global.gc?.();
  const actor = service.defaultResidentEntityId;
  const commandLatency = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return {
      p50Ms: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
      p95Ms: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
    };
  };
  const issueMove = async (index: number) => {
    const player = service.world.entities[service.controlledEntityId]!;
    const started = performance.now();
    const command = await service.command(
      randomUUID(),
      {
        type: 'move',
        position: {
          ...worldPosition(player),
          x: index % 2 === 0 ? 14 : 11,
          surfaceId: 'terrain',
        },
      },
      undefined,
      service.commandEpoch,
    );
    return { ms: performance.now() - started, ok: command.ok };
  };
  const baselineTimes: number[] = [];
  const baselineStorageBefore = await storageCounters();
  if (writeDuringCapture)
    for (let index = 0; index < 32; index++) {
      const result = await issueMove(index);
      if (!result.ok) throw new Error('Baseline move command was refused.');
      baselineTimes.push(result.ms);
    }
  const baselineStorageAfter = await storageCounters();
  const hostLoad = loadavg();
  const points: {
    id: string;
    bytes: number;
    simTime: number;
    selected: number;
    peakRss: number;
    maxTimerGap: number;
    ticks: number;
    commands?: { accepted: number; refused: number; p50Ms: number; p95Ms: number };
    oldestSnapshotAge?: number;
    storage?: { walBytes: number; deadRowsBefore: number; deadRowsAfter: number };
    retainedRowVersions?: {
      before: { count: number; bytes: number };
      during: { count: number; bytes: number };
      after: { count: number; bytes: number };
    };
  }[] = [];
  for (let round = 0; round < rounds; round++) {
    await service.setPresence('stress', true);
    const resumed = await service.control({ paused: false, clientId: 'stress' });
    if (!resumed.ok) throw new Error(resumed.message);
    const batch = await measure('maintenancePreparation', () =>
      service.maintenanceBatch(actor, 'hourly'),
    );
    const player = service.world.entities[service.controlledEntityId]!;
    const move = await service.command(
      randomUUID(),
      {
        type: 'move',
        position: { ...worldPosition(player), x: round % 2 === 0 ? 14 : 11, surfaceId: 'terrain' },
      },
      undefined,
      service.commandEpoch,
    );
    if (!move.ok) throw new Error(move.message);
    let peakRss = process.memoryUsage().rss,
      last = performance.now(),
      maxTimerGap = 0,
      done = false,
      ticks = 0;
    const commandTimes: number[] = [];
    let commandsAccepted = 0,
      commandsRefused = 0,
      oldestSnapshotAge = 0;
    const timer = setInterval(() => {
      const now = performance.now();
      maxTimerGap = Math.max(maxTimerGap, now - last);
      last = now;
      peakRss = Math.max(peakRss, process.memoryUsage().rss);
    }, 10);
    const id = randomUUID(),
      simTime = service.world.simTime;
    const deadBefore = await deadVersions();
    let deadDuring: Awaited<ReturnType<typeof deadVersions>>;
    const storageBefore = await storageCounters();
    const capture = measure('durableSave', () => service.createSave(`Stress ${round}`, id)).finally(
      () => {
        done = true;
      },
    );
    try {
      while (!done) {
        if (ticks % 100 === 0) await service.setPresence('stress', true);
        await measure('tickDuringSave', () => service.tick(0.05, 0));
        if (writeDuringCapture && ticks % 5 === 0) {
          const command = await issueMove(ticks / 5);
          commandTimes.push(command.ms);
          if (command.ok) commandsAccepted++;
          else commandsRefused++;
        }
        if (observer && ticks % 10 === 0) {
          const row = await observer
            .prepare(
              `SELECT COALESCE(MAX(age(backend_xmin)), 0) AS age
              FROM pg_stat_activity WHERE datname = current_database() AND backend_xmin IS NOT NULL`,
            )
            .get();
          oldestSnapshotAge = Math.max(oldestSnapshotAge, Number(row?.['age'] ?? 0));
        }
        if (maintenance && !deadDuring && commandsAccepted >= 5) deadDuring = await deadVersions();
        ticks++;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      await capture;
    } finally {
      clearInterval(timer);
    }
    const storageAfter = await storageCounters();
    const deadAfter = await deadVersions();
    if (maintenance && (!deadBefore || !deadDuring || !deadAfter))
      throw new Error('Capture ended before the in-snapshot row-version inspection.');
    if (service.world.simTime <= simTime) throw new Error('No native progress during checkpoint.');
    points.push({
      id,
      bytes: (await stat(join(directory, 'saves', id, 'world.jsonl'))).size,
      simTime,
      selected: batch?.sources.length ?? 0,
      peakRss,
      maxTimerGap,
      ticks,
      ...(writeDuringCapture
        ? {
            commands: {
              accepted: commandsAccepted,
              refused: commandsRefused,
              ...commandLatency(commandTimes),
            },
            oldestSnapshotAge,
            storage: {
              walBytes: (await walBytes(storageBefore, storageAfter)) ?? 0,
              deadRowsBefore: storageBefore?.deadRowsEstimate ?? 0,
              deadRowsAfter: storageAfter?.deadRowsEstimate ?? 0,
            },
            ...(deadBefore && deadDuring && deadAfter
              ? {
                  retainedRowVersions: { before: deadBefore, during: deadDuring, after: deadAfter },
                }
              : {}),
          }
        : {}),
    });
  }
  await service.control({ paused: true });
  const last = points.at(-1)!;
  const payload = await measure('readAndValidate', () =>
    store.saves.read(service.world.id, last.id),
  );
  const continuation = (world: WorldState) =>
    advanceWorld(
      updateWorld(world, (draft) => {
        draft.paused = false;
        draft.archivedEventCount ??= 0;
      }),
      0.5,
    ).world;
  const expectedContinuation = continuation(payload.state.world);
  await measure('restore', () => service.restoreSave(last.id, randomUUID(), payload));
  const restored = await store.records.load();
  if (!restored || !isDeepStrictEqual(continuation(restored.state.world), expectedContinuation))
    throw new Error('Native continuation differs after restore.');
  await store.saves.read(service.world.id, 'before-load');
  const distribution = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b),
      at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
    return { count: values.length, p50: at(0.5), p95: at(0.95), p99: at(0.99), max: sorted.at(-1) };
  };
  const report = {
    runtime: process.version,
    platform: `${process.platform}/${process.arch}`,
    cpu: cpus()[0]?.model,
    memory: totalmem(),
    adapter: 'postgres',
    directory,
    sources: size,
    residency,
    rounds,
    ...(writeDuringCapture
      ? {
          baselineCommands: { count: baselineTimes.length, ...commandLatency(baselineTimes) },
          baselineStorage: {
            walBytes: (await walBytes(baselineStorageBefore, baselineStorageAfter)) ?? 0,
            deadRowsBefore: baselineStorageBefore?.deadRowsEstimate ?? 0,
            deadRowsAfter: baselineStorageAfter?.deadRowsEstimate ?? 0,
          },
          hostLoad,
        }
      : {}),
    points,
    attribution: performanceSnapshot(),
    milliseconds: Object.fromEntries(
      Object.entries(samples).map(([name, values]) => [name, distribution(values)]),
    ),
    peakProcessRss: process.resourceUsage().maxRSS * 1024,
    restoredPaused: service.paused,
    nativeContinuation: true,
    limitations:
      'Synthetic cold history and native service only; no browser, network fan-out, live AI or population qualification.',
  };
  await writeFile(output, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(`Checkpoint stress report: ${output}`);
} finally {
  stopMonitoring();
  try {
    await store.close();
  } finally {
    try {
      await observer?.close();
    } finally {
      try {
        await maintenance?.close();
      } finally {
        await disposable.close();
      }
    }
  }
}
