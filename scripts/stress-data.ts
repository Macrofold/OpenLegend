import { createDisposableDatabase } from './disposable-postgres.mjs';
import { initializeCollisionRuntime } from '../packages/spatial/src/rapier.js';
import { mkdtemp, writeFile, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import {
  createWorld,
  NPC_ID,
  freezeWorld,
  updateWorld,
  observeActor,
  type MemoryRecord,
} from '@open-legend/domain';
import { SqlGameRepository, type SavedWorld } from '../apps/server/src/store.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { candidateSet } from '../apps/server/src/recall.js';

// Operational benchmark: disposable storage, native data, no provider calls or test runner.
// Supply an explicit loopback admin URL for an owned disposable database. Keep report/profile output
// outside the repository; this is component evidence, not multiplayer qualification.
// Initialize native geometry before constructing or validating recovered world state.
await initializeCollisionRuntime();

const [output, sizeArgument = '5000', roundsArgument = '30'] = process.argv.slice(2);
const size = Number(sizeArgument),
  rounds = Number(roundsArgument);
if (
  !output ||
  !Number.isSafeInteger(size) ||
  size < 1 ||
  size > 1_000_000 ||
  !Number.isSafeInteger(rounds) ||
  rounds < 1 ||
  rounds > 1000
)
  throw new Error(
    'Usage: AI_BUDGET_USD=0 pnpm exec tsx scripts/stress-data.ts NEW_REPORT.json [SOURCES=5000] [ROUNDS=30]',
  );
if (process.env['AI_BUDGET_USD'] !== '0') throw new Error('Set AI_BUDGET_USD=0.');
const directory = await mkdtemp(join(tmpdir(), 'openlegend-data-stress-'));
const disposable = await createDisposableDatabase(process.env['OPENLEGEND_STRESS_DATABASE_URL']);
const url = disposable.url;
const store = new SqlGameRepository(directory, new PostgresDatabase(url));
const durations: Record<string, number[]> = {};
const measure = async <T>(name: string, run: () => Promise<T>): Promise<T> => {
  const at = performance.now();
  try {
    return await run();
  } finally {
    (durations[name] ??= []).push(performance.now() - at);
  }
};
const source = (index: number): MemoryRecord => ({
  id: `stress-memory-${index}`,
  actorId: NPC_ID,
  kind: 'episode',
  source: 'observed',
  summary: `Synthetic retained observation ${index}; batch ${Math.floor(index / 100)}.`,
  at: index,
  entityIds: [],
  importance: index % 10,
});
try {
  await store.ready;
  if (await store.load()) throw new Error('Refusing to benchmark a nonempty world.');
  const world = createWorld(73);
  world.memories[NPC_ID] = Array.from({ length: size }, (_, index) => source(index));
  let state: SavedWorld = {
    world: freezeWorld(world),
    speed: 1,
    manuallyPaused: true,
  };
  let revision = await measure('initialCommit', () => store.commit(0, state));
  const restored = await measure('recovery', () => store.load());
  const recoveredExactly = isDeepStrictEqual(restored?.state, JSON.parse(JSON.stringify(state)));
  if (!recoveredExactly) throw new Error('Recovery changed canonical source data.');
  const head = await store.records.head();
  if (!head) throw new Error('Missing committed world.');
  const scope = { worldId: world.id, actorId: NPC_ID, generation: head.generation };
  // Rebind the store's accepted working set after the recovery measurement.
  state = restored!.state;
  freezeWorld(state.world);
  const counts = {
    eligible: await store.memories.count(scope),
    foreignActor: await store.memories.count({ ...scope, actorId: 'absent-actor' }),
  };
  const model = { model: 'synthetic-stress-v1', dimensions: 512 };
  const query = Array.from(
    { length: model.dimensions },
    (_, index) => (index + 1) / model.dimensions,
  );
  await measure('syntheticIndexBuild', async () => {
    while (true) {
      const batch = await store.memories.pending(scope, model, 128);
      if (!batch.length) break;
      await store.memories.putVectors(
        scope,
        model,
        batch.map((entry, offset) => ({
          id: entry.memory.id,
          revision: entry.revision,
          vector: query.map((value, index) => value + ((offset + index) % 7) / 10),
        })),
      );
    }
  });
  for (let index = 0; index < rounds; index++) {
    await measure('top100Structured', () => store.memories.select(scope, 100));
    await measure('top100Vector', () => store.memories.select(scope, 100, { ...model, query }));
    await measure('localRetrievalTop100', async () => {
      const observed = observeActor(state.world, NPC_ID, { includeMemories: false })!;
      await store.memories.context(scope, [], false);
      await store.memories.coverage(scope, model);
      const required = await store.memories.required(scope, []);
      const selected = await store.memories.select(scope, 100, { ...model, query });
      return candidateSet(state.world, NPC_ID, observed, [], [], [], [...selected, ...required]);
    });
    state = {
      ...state,
      world: freezeWorld(
        updateWorld(state.world, (draft) => {
          draft.memories[NPC_ID]!.push(source(size + index));
        }),
      ),
    };
    revision = await measure('appendCommit', () => store.commit(revision, state));
  }
  let staleWrite = 'accepted';
  try {
    await store.commit(revision - 1, state);
  } catch {
    staleWrite = 'rejected';
  }
  const checkpointId = randomUUID();
  await measure('checkpointPublication', () =>
    store.saves.create(state, 'Data stress', checkpointId, { expectedRevision: revision }),
  );
  const checkpointBytes = (await stat(join(directory, 'saves', checkpointId, 'world.jsonl'))).size;
  const rows = await store.db.prepare('SELECT COUNT(*) AS count FROM mind_memories').get();
  const summary = Object.fromEntries(
    Object.entries(durations).map(([name, values]) => {
      const sorted = [...values].sort((a, b) => a - b);
      const percentile = (fraction: number) =>
        sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
      return [
        name,
        {
          n: values.length,
          p50: percentile(0.5),
          p95: percentile(0.95),
          p99: percentile(0.99),
          max: sorted.at(-1),
        },
      ];
    }),
  );
  const report = {
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    database: store.persistence,
    directory,
    sources: size,
    rounds,
    counts,
    canonicalRows: Number(rows?.['count']),
    checkpointBytes,
    recoveredExactly,
    staleWrite,
    dimensions: model.dimensions,
    milliseconds: summary,
    memory: process.memoryUsage(),
  };
  await writeFile(output, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify(report, null, 2));
} finally {
  try {
    await store.close();
  } finally {
    await disposable.close();
  }
}
