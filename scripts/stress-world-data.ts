import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createWorld,
  executeCommand,
  advanceWorld,
  freezeWorld,
  type WorldState,
} from '@open-legend/domain';
import { populateScenario, parseScenario } from './performance/scenario.js';
import { SqliteStore, type SavedWorld } from '../apps/server/src/store.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { retainHotEvents } from '../apps/server/src/hot-events.js';
import { isDeepStrictEqual } from 'node:util';

const [output, layout = 'world', stepsArgument = '20'] = process.argv.slice(2);
const steps = Number(stepsArgument);
if (
  !output ||
  !['world', 'scene'].includes(layout) ||
  !Number.isSafeInteger(steps) ||
  steps < 1 ||
  steps > 1000 ||
  process.env['AI_BUDGET_USD'] !== '0'
)
  throw new Error(
    'Usage: AI_BUDGET_USD=0 pnpm exec tsx scripts/stress-world-data.ts NEW_REPORT.json [world|scene] [STEPS=20]',
  );
const directory = await mkdtemp(join(tmpdir(), 'openlegend-world-data-stress-'));
const url = process.env['OPENLEGEND_STRESS_DATABASE_URL'];
const store = new SqliteStore(
  join(directory, 'world.sqlite'),
  url ? new PostgresDatabase(url) : undefined,
);
const timings: Record<string, number[]> = {};
const statements = new Map<string, { calls: number; milliseconds: number }>();
const prepare = store.db.prepare.bind(store.db);
store.db.prepare = (sql: string) => {
  const statement = prepare(sql);
  const measured =
    <T>(original: (...args: unknown[]) => Promise<T>) =>
    async (...args: unknown[]): Promise<T> => {
      const at = performance.now();
      try {
        return await original(...args);
      } finally {
        const key = sql.replace(/\s+/g, ' ').slice(0, 100),
          metric = statements.get(key) ?? { calls: 0, milliseconds: 0 };
        metric.calls++;
        metric.milliseconds += performance.now() - at;
        statements.set(key, metric);
      }
    };
  statement.get = measured(statement.get);
  statement.all = measured(statement.all);
  statement.run = measured(statement.run);
  return statement;
};
const measure = async <T>(name: string, action: () => T | Promise<T>) => {
  const at = performance.now();
  try {
    return await action();
  } finally {
    (timings[name] ??= []).push(performance.now() - at);
  }
};
try {
  await store.ready;
  if (await store.load()) throw new Error('The PostgreSQL stress target must be empty.');
  const half = layout === 'scene';
  const targets = {
    humans: half ? 50 : 100,
    agents: half ? 50 : 100,
    animals: half ? 50 : 100,
    objects: half ? 500 : 1000,
  };
  const seed = createWorld(73);
  const base = Object.values(seed.entities);
  let world = await measure('setup', () =>
    populateScenario(
      seed,
      parseScenario({
        seed: 73,
        layout: half ? 'crowded' : 'scattered',
        people:
          targets.humans +
          targets.agents -
          base.filter((entry) => entry.actor && entry.kind !== 'animal').length,
        animals: targets.animals - base.filter((entry) => entry.kind === 'animal').length,
        objects: [
          {
            count: targets.objects - base.filter((entry) => !entry.actor).length,
            name: 'Benchmark material',
            properties: ['rigid'],
            quantity: 3,
            workSeconds: 1,
          },
        ],
      }),
    ),
  );
  const people = Object.values(world.entities).filter(
    (entry) => entry.actor && entry.kind !== 'animal',
  );
  people.forEach((entity, index) => {
    entity.actor!.controller = index < targets.humans ? 'player' : 'npc';
    entity.kind = index < targets.humans ? 'player' : 'npc';
    if (index < targets.humans)
      world.authorship.playerAccountIds[entity.id] = `stress-player-${index}`;
  });
  world = freezeWorld(world);
  let revision = 0,
    committed: WorldState | undefined;
  const commit = async () => {
    const history = world;
    const state: SavedWorld = { world: retainHotEvents(world), speed: 1, manuallyPaused: false };
    revision = await store.commit(revision, state, undefined, undefined, {
      before: committed,
      after: history,
    });
    world = freezeWorld(state.world);
    committed = world;
  };
  await measure('initialCommit', commit);
  const outcomes: Record<string, number> = {};
  let offered = 0,
    admitted = 0;
  const commandsPerStep = Math.ceil(people.length / 20);
  const targetsByActor = new Map(
    people.map((entity) => [
      entity.id,
      Object.values(world.entities)
        .filter((target) => target.resource)
        .sort(
          (a, b) =>
            Math.hypot(a.position.x - entity.position.x, a.position.z - entity.position.z) -
            Math.hypot(b.position.x - entity.position.x, b.position.z - entity.position.z),
        )[0]?.id,
    ]),
  );
  for (let step = 0; step < steps; step++) {
    for (let index = 0; index < commandsPerStep; index++) {
      const entity = people[(step * commandsPerStep + index) % people.length]!;
      const targetId = targetsByActor.get(entity.id);
      if (!targetId) continue;
      const transition = await measure('commandAndCommit', async () => {
        const result = executeCommand(world, {
          id: `stress-gather-${step}-${index}`,
          actorId: entity.id,
          type: 'gather',
          targetId,
        });
        world = freezeWorld(result.world);
        await commit();
        return result;
      });
      outcomes[transition.outcome.code] = (outcomes[transition.outcome.code] ?? 0) + 1;
      offered++;
      if (transition.outcome.ok) admitted++;
    }
    await measure('nativeStep', () => {
      world = freezeWorld(advanceWorld(world, 1).world);
    });
    await measure('routineCommit', commit);
    const head = await store.records.head();
    if (head)
      await measure('concurrentReadAndCommit', async () => {
        // Independent callers share the actual repository lanes; no HTTP/LLM fixture claim.
        await Promise.all([
          store.memories.select(
            { worldId: world.id, actorId: people[0]!.id, generation: head.generation },
            100,
          ),
          commit(),
        ]);
      });
  }
  const recovered = await measure('recovery', () => store.load());
  const recoveredExactly = isDeepStrictEqual(
    recovered?.state.world,
    JSON.parse(JSON.stringify(world)),
  );
  if (!recoveredExactly) throw new Error('Native workload recovery changed world records.');
  const elapsed = Object.fromEntries(
    Object.entries(timings).map(([name, times]) => {
      const sorted = [...times].sort((a, b) => a - b);
      const q = (value: number) =>
        sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * value) - 1)];
      return [
        name,
        { n: times.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: sorted.at(-1) },
      ];
    }),
  );
  const entities = Object.values(world.entities);
  const report = {
    directory,
    node: process.version,
    database: store.persistence,
    layout,
    targets,
    population: {
      humans: entities.filter((e) => e.actor?.controller === 'player').length,
      agents: entities.filter((e) => e.actor?.controller === 'npc').length,
      animals: entities.filter((e) => e.kind === 'animal').length,
      objects: entities.filter((e) => !e.actor).length,
    },
    outcomes,
    offered,
    admitted,
    simTime: world.simTime,
    eventCount: await store.history.eventCount(world.id),
    memories: Number(
      (await store.db.prepare('SELECT count(*) AS count FROM recall_sources').get())?.['count'],
    ),
    recoveredExactly,
    milliseconds: elapsed,
    memory: process.memoryUsage(),
    slowStatements: [...statements]
      .sort((a, b) => b[1].milliseconds - a[1].milliseconds)
      .slice(0, 12),
    qualification:
      'Native scripted actions, persistence and scoped retrieval; excludes browser/network fan-out and live AI.',
  };
  await writeFile(output, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify(report, null, 2));
} finally {
  await store.close();
}
