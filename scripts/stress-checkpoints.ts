import { mkdtemp, stat, writeFile } from 'node:fs/promises';
import { tmpdir, cpus, totalmem } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  createWorld,
  advanceWorld,
  updateWorld,
  worldPosition,
  type WorldState,
} from '@open-legend/domain';
import { SqliteStore, digest } from '../apps/server/src/store.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { WorldService } from '../apps/server/src/world-service.js';
import { performanceSnapshot, startRuntimeMonitoring } from '../apps/server/src/performance.js';
import { readConfig } from '../apps/server/src/config.js';

// Native operational benchmark, no provider or test runner. Keep the disposable
// source and report for inspection; the database target must be empty.
const [output, sizeArgument = '100000', roundsArgument = '3', residency = 'cold'] =
  process.argv.slice(2);
const size = Number(sizeArgument),
  rounds = Number(roundsArgument);
if (
  !output ||
  !['cold', 'active'].includes(residency) ||
  !Number.isSafeInteger(size) ||
  size < 128 ||
  size > 200000 ||
  !Number.isSafeInteger(rounds) ||
  rounds < 1 ||
  rounds > 10 ||
  process.env['AI_BUDGET_USD'] !== '0'
)
  throw new Error(
    'Usage: AI_BUDGET_USD=0 pnpm exec tsx scripts/stress-checkpoints.ts NEW_REPORT.json [SOURCES=100000] [ROUNDS=3] [cold|active]',
  );
const directory = await mkdtemp(join(tmpdir(), 'openlegend-checkpoint-stress-'));
const url = process.env['OPENLEGEND_STRESS_DATABASE_URL'];
const store = new SqliteStore(
  join(directory, 'world.sqlite'),
  url ? new PostgresDatabase(url) : undefined,
);
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
    readConfig({ AI_BUDGET_USD: '0', OPEN_LEGEND_DATA_DIR: directory, WORLD_SEED: '73' }),
  );
  await service.ready;
  await service.setPresence('stress', true);
  await service.control({ paused: false, clientId: 'stress' });
  for (let i = 0; i < 20; i++) await service.tick(0.05, 0);
  await service.flush();
  // Excludes fixture construction garbage when explicitly run with --expose-gc.
  global.gc?.();
  const actor = service.defaultResidentEntityId;
  const points: {
    id: string;
    bytes: number;
    simTime: number;
    selected: number;
    peakRss: number;
    maxTimerGap: number;
    ticks: number;
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
    const timer = setInterval(() => {
      const now = performance.now();
      maxTimerGap = Math.max(maxTimerGap, now - last);
      last = now;
      peakRss = Math.max(peakRss, process.memoryUsage().rss);
    }, 10);
    const id = randomUUID(),
      simTime = service.world.simTime;
    const capture = measure('durableSave', () => service.createSave(`Stress ${round}`, id)).finally(
      () => {
        done = true;
      },
    );
    try {
      while (!done) {
        if (ticks % 100 === 0) await service.setPresence('stress', true);
        await measure('tickDuringSave', () => service.tick(0.05, 0));
        ticks++;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      await capture;
    } finally {
      clearInterval(timer);
    }
    if (service.world.simTime <= simTime) throw new Error('No native progress during checkpoint.');
    points.push({
      id,
      bytes: (await stat(join(directory, 'saves', id, 'world.jsonl'))).size,
      simTime,
      selected: batch?.sources.length ?? 0,
      peakRss,
      maxTimerGap,
      ticks,
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
  const expectedContinuation = digest(continuation(payload.state.world));
  await measure('restore', () => service.restoreSave(last.id, randomUUID(), payload));
  const restored = await store.records.load();
  if (!restored || digest(continuation(restored.state.world)) !== expectedContinuation)
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
    adapter: url ? 'postgres' : 'sqlite',
    directory,
    sources: size,
    residency,
    rounds,
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
  await store.close();
}
