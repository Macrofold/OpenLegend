import { toolHttp, toolStream } from './network.js';
import { SSEFramer } from '@open-legend/network';
import { learnRecipe } from '../packages/domain/src/knowledge.js';
import { profilingOptions } from './performance/profiling-options.js';
import { workspaceBindings } from './performance/workspace-bindings.js';
import {
  entityDelete,
  entityGet,
  entityHas,
  entityValues,
  materializeNativeValues,
} from '../packages/domain/src/index.js';
import { createDisposableDatabase } from './disposable-postgres.mjs';
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir, availableParallelism, loadavg } from 'node:os';
import { join, resolve } from 'node:path';
import { Session } from 'node:inspector/promises';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  observeDurations,
  performanceSnapshot,
  startPerformanceCapture,
} from '../apps/server/src/performance.js';
import { createGameServer } from '../apps/server/src/http.js';
import { readConfig } from '../apps/server/src/config.js';
import { SqlGameRepository } from '../apps/server/src/store.js';
import { SaveFiles } from '../apps/server/src/save-files.js';
import { SAVE_FORMAT } from '../apps/server/src/game-saves.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { CognitionMaintenance } from '../apps/server/src/cognition-maintenance.js';
import { WorkLane, OverloadError } from '../apps/server/src/work-lane.js';
import {
  createWorld,
  worldPosition,
  worldSupport,
  worldRootEntities,
  spawnWorldEntity,
  seesEntity,
  observeDomainCounters,
  PLAYER_ID,
  NPC_ID,
  gatheringYield,
  canReachEntity,
  SIMULATION_RULES,
  navigationBlocked,
} from '@open-legend/domain';
import { appendMemory } from '../packages/domain/src/events.js';
import { initializeCollisionRuntime } from '../packages/spatial/src/rapier.js';
import { canStand } from '@open-legend/spatial';
import { spatialMap, validateSpatialWorld } from '../packages/domain/src/spatial-state.js';
import { starterGroundAt } from '../packages/domain/src/worlds/base/landscape.js';
import { BASE_BODY_PROFILES } from '../packages/domain/src/worlds/base/spatial-definitions.js';
import { prepareBaseInitialWorldState } from '../packages/domain/src/worlds/base/initial-opening.js';
import { parseScenario, populateScenario } from './performance/scenario.js';
import { prepareRoutinePlan, selectRoutinePlan } from './performance/routine-plan.js';
import { prepareLongSoak, soakInventory } from './performance/long-soak.js';
import {
  placeTravelResources,
  rehearseTravel,
  travelProgress,
} from './performance/routine-travel.js';
import { decisionObservation } from '../apps/server/src/decision-observation.js';
import { validateCurrentWorldState } from '../apps/server/src/upgrade-world.js';
import { ACTIVITY_LIMITS } from '../packages/domain/src/action-experience.js';
import type { AiClient, AiReceipt, JudgmentAnswer } from '@open-legend/ai';
import type { CommandInput, GameView } from '@open-legend/protocol';

// Disposable full-server experiment, not a correctness suite. Never load .env or call providers.
const runtimeBindings = await workspaceBindings(fileURLToPath(new URL('..', import.meta.url)));
async function sourceFingerprint() {
  const capturedAt = new Date().toISOString();
  try {
    const root = fileURLToPath(new URL('..', import.meta.url));
    const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
    const paths = [
      ...new Set(
        git(
          'ls-files',
          '-z',
          '--cached',
          '--others',
          '--exclude-standard',
          '--',
          'apps/server/src',
          'apps/client/src',
          'packages/domain/src',
          'packages/spatial/src',
          'packages/protocol/src',
          'packages/ai/src',
          'packages/language/src',
          'package.json',
          'pnpm-lock.yaml',
          'apps/server/package.json',
          'apps/client/package.json',
          'scripts/profile-server.ts',
          'scripts/performance',
        )
          .split('\0')
          .filter(
            (path) =>
              /\.(?:ts|tsx|js|mjs|json|wasm|yaml)$/.test(path) && !/\.test\.[^.]+$/.test(path),
          ),
      ),
    ].sort();
    const hash = createHash('sha256');
    for (const path of paths)
      hash
        .update(path)
        .update('\0')
        .update(
          createHash('sha256')
            .update(await readFile(join(root, path)))
            .digest(),
        );
    return {
      status: 'captured' as const,
      capturedAt,
      head: git('rev-parse', 'HEAD').trim(),
      branch: git('branch', '--show-current').trim(),
      files: paths.length,
      workspaceBindings: runtimeBindings,
      sha256: hash.digest('hex'),
    };
  } catch (error) {
    return { status: 'failed' as const, capturedAt, error: String(error) };
  }
}
const toolOptions = profilingOptions(process.argv.slice(2));
const appProfiling = toolOptions.enabled;
const [output, durationArgument = '15'] = toolOptions.arguments;
const seconds = Number(durationArgument);
const profileSpeed = Number(process.env['OPENLEGEND_PROFILE_SPEED'] ?? '3');
if (![1, 3, 8].includes(profileSpeed))
  throw new Error('OPENLEGEND_PROFILE_SPEED must be 1, 3 or 8.');
if (
  toolOptions.arguments.length > 2 ||
  !output ||
  !Number.isFinite(seconds) ||
  seconds < 3 ||
  seconds > 1800
)
  throw new Error(
    'Usage: node --import tsx scripts/profile-server.ts NEW_REPORT.json [SECONDS=15] [--app-profiling=on|off]',
  );
// Imports have settled; capture before creating the disposable database/server. A
// readiness comparison exposes edits during setup rather than inventing loaded code.
const startupSource = await sourceFingerprint();
const collectAllocations = process.env['OPENLEGEND_ALLOCATION_PROFILE'] === '1';
const collectCpu = process.env['OPENLEGEND_CPU_PROFILE'] === '1';
if (collectAllocations && collectCpu)
  throw new Error('Allocation and CPU profiles require separate diagnostic runs.');
const allocationSampling = {
  samplingInterval: 32_768,
  includeObjectsCollectedByMajorGC: true,
  includeObjectsCollectedByMinorGC: true,
};
const cognitionFixture = process.env['OPENLEGEND_PROFILE_COGNITION'] === '1';
const speechFixture = process.env['OPENLEGEND_PROFILE_SPEECH'] === '1';
const layer = process.env['OPENLEGEND_PROFILE_LAYER'];
if (layer && !['viewer', 'no-view', 'pump'].includes(layer))
  throw new Error('OPENLEGEND_PROFILE_LAYER must be viewer, no-view or pump.');
const browserFixture = process.env['OPENLEGEND_PROFILE_BROWSER'] === '1' && !layer;
const expandedFixture = process.env['OPENLEGEND_PROFILE_EXPANDED'] === '1';
// Keep the actual authored opening available alongside the historical crowded
// comparison. Removing diagnostic additions must not remove starting-world content.
const standardFixture = process.env['OPENLEGEND_PROFILE_STANDARD'] === '1';
const routineFixture = process.env['OPENLEGEND_PROFILE_ROUTINES'] === '1';
const routinePlanFixture = process.env['OPENLEGEND_PROFILE_ROUTINE_PLANS'] === '1';
const longSoakFixture = process.env['OPENLEGEND_PROFILE_LONG_SOAK'] === '1';
const travelFixture = process.env['OPENLEGEND_PROFILE_TRAVEL_ROUTINES'] === '1';
const composedRoutines = process.env['OPENLEGEND_PROFILE_COMPOSED_ROUTINES'] === '1';
const memoryHistoryFixture = process.env['OPENLEGEND_PROFILE_MEMORY_HISTORY'] === '1';
const collectNativeCounters = process.env['OPENLEGEND_PROFILE_NATIVE_COUNTS'] === '1';
const snapshotPath = process.env['OPENLEGEND_PROFILE_SNAPSHOT_PATH'];
const collectRecallPlans = process.env['OPENLEGEND_PROFILE_RECALL_PLANS'] === '1';
const collectRejections = process.env['OPENLEGEND_PROFILE_REJECTIONS'] === '1';
const collectLostTime = process.env['OPENLEGEND_PROFILE_LOST_TIME'] === '1';
if (
  !appProfiling &&
  (collectAllocations ||
    collectCpu ||
    collectNativeCounters ||
    collectLostTime ||
    collectRecallPlans ||
    collectRejections)
)
  throw new Error(
    'Application profiling off cannot be combined with CPU/allocation/native/SQL-plan/rejection/lost-time capture.',
  );
const instrumentation = {
  appProfiling: appProfiling ? 'on' : 'off',
  runtimeMonitoring: appProfiling,
  domainCounters: collectNativeCounters,
  cpuSampling: collectCpu,
  allocationSampling: collectAllocations,
  lostTime: collectLostTime,
  internalOperationTraces: appProfiling,
  workloadAndProgressObservation: true,
  hostSqlProbe: true,
  processBoundarySamples: true,
  httpReceipts: true,
} as const;
if (routineFixture && !expandedFixture)
  throw new Error('Scripted resident routines require the expanded profiling fixture.');
if (standardFixture && expandedFixture)
  throw new Error('Standard opening and expanded profiling fixtures are separate workloads.');
if (routinePlanFixture && !routineFixture)
  throw new Error('Native resident plans require the expanded scripted routine fixture.');
if (longSoakFixture && ((!browserFixture && !layer) || !routinePlanFixture))
  throw new Error('The finite long soak requires browser control and native resident plans.');
if (travelFixture && (!longSoakFixture || composedRoutines))
  throw new Error('Resident travel requires the finite five-step routine fixture.');
if (composedRoutines && !longSoakFixture)
  throw new Error('Eight-cycle commitments require the finite long-soak fixture.');
if (longSoakFixture && memoryHistoryFixture)
  throw new Error(
    'The finite long soak and paused memory correctness fixture are distinct workloads.',
  );
if (snapshotPath && !routineFixture)
  throw new Error('A busy-world snapshot requires the scripted resident routine fixture.');
const readyPath = process.env['OPENLEGEND_PROFILE_READY_PATH'];
const browserStartPath = process.env['OPENLEGEND_PROFILE_BROWSER_START_PATH'];
if (browserFixture && (!readyPath || !browserStartPath))
  throw new Error('Browser profiling requires fresh ready and start-marker paths.');
if (browserStartPath) {
  try {
    await readFile(browserStartPath);
    throw new Error('The browser start marker must not already exist.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
// PF00 storage-latency case: added after lane admission, per statement on this fixture's
// connections only (docs/maintainers/performance-profiling.md#full-server-scene-profiler).
const sqlDelayMs = Number(process.env['OPENLEGEND_PROFILE_SQL_DELAY_MS'] ?? '0');
if (!Number.isInteger(sqlDelayMs) || sqlDelayMs < 0 || sqlDelayMs > 1000)
  throw new Error('OPENLEGEND_PROFILE_SQL_DELAY_MS must be an integer from 0 to 1000.');
const checkpointDirectory = process.env['OPENLEGEND_PROFILE_CHECKPOINT_DIRECTORY'];
const checkpointExport = checkpointDirectory ? resolve(checkpointDirectory) : undefined;
if (checkpointExport) await mkdir(checkpointExport, { mode: 0o700 });
const directory = await mkdtemp(join(tmpdir(), 'openlegend-scene-profile-'));
const disposable = await createDisposableDatabase(
  process.env['OPENLEGEND_STRESS_DATABASE_URL'],
).catch(async (error: unknown) => {
  await rm(directory, { recursive: true, force: true });
  throw error;
});
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
let profilingStage = 'database setup';
let lossStart = 0,
  lossMeasuring = false;
const lossOwner = appProfiling ? new AsyncLocalStorage<string>() : undefined;
// Slow SQL/save examples also need ownership when the optional detailed trace is off.
const withLossOwner = <T>(owner: string, operation: () => T): T =>
  lossOwner ? lossOwner.run(owner, operation) : operation();
const lostTime = {
  limit: 20000,
  observed: 0,
  events: [] as Array<Record<string, unknown>>,
};
const lossEvent = (event: Record<string, unknown>) => {
  if (!collectLostTime || !lossMeasuring) return;
  lostTime.observed++;
  if (lostTime.events.length < lostTime.limit) lostTime.events.push(event);
};
const laneRun = WorkLane.prototype.run;
if (collectLostTime)
  WorkLane.prototype.run = function <T>(operation: () => T | Promise<T>, waitMs?: number) {
    if (!lossMeasuring) return laneRun.call(this, operation, waitMs) as Promise<T>;
    const event = {
      kind: 'lane',
      lane: (this as unknown as { name: string }).name,
      owner: lossOwner?.getStore() ?? 'other',
      atMs: performance.now() - lossStart,
      queued: this.depth,
      startedAtMs: null as number | null,
      endedAtMs: null as number | null,
      errorClass: null as string | null,
      errorCode: null as string | null,
    };
    lossEvent(event);
    return (
      laneRun.call(
        this,
        async () => {
          event.startedAtMs = performance.now() - lossStart;
          return await operation();
        },
        waitMs,
      ) as Promise<T>
    )
      .catch((error: unknown) => {
        try {
          event.errorClass =
            error instanceof Error ? error.constructor.name.slice(0, 64) : typeof error;
          const code = (error as { code?: unknown })?.code;
          if (typeof code === 'string' && /^[a-z0-9_-]{1,64}$/i.test(code)) event.errorCode = code;
        } catch {
          event.errorClass = 'unreadable diagnostic';
        }
        throw error;
      })
      .finally(() => {
        event.endedAtMs = performance.now() - lossStart;
      });
  };
const rejections = {
  counts: { sql: 0, maintenance: 0 },
  observationFailures: 0,
  examples: [] as Array<{
    owner: 'sql' | 'maintenance';
    startedAtUnixMs: number;
    endedAtUnixMs: number;
    startedStage: string;
    endedStage: string;
    sql?: string;
    error: { name: string; message: string; code?: string; cause?: string };
  }>,
};
const rejected = (
  owner: 'sql' | 'maintenance',
  at: number,
  stage: string,
  error: unknown,
  sql?: string,
) => {
  if (!collectRejections) return;
  rejections.counts[owner]++;
  if (rejections.examples.length >= 10) return;
  try {
    const sanitize = (value: string) =>
      value.replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, '[redacted URL]').slice(0, 512);
    const entry = {
      owner,
      startedAtUnixMs: performance.timeOrigin + at,
      endedAtUnixMs: performance.timeOrigin + performance.now(),
      startedStage: stage,
      endedStage: profilingStage,
      ...(sql ? { sql: sanitize(sql.replace(/\s+/g, ' ')).slice(0, 120) } : {}),
      error: {
        name: error instanceof Error ? error.name.slice(0, 64) : typeof error,
        message: sanitize(error instanceof Error ? error.message : String(error)),
        ...(typeof (error as { code?: unknown })?.code === 'string'
          ? { code: (error as { code: string }).code.slice(0, 64) }
          : {}),
        ...(error instanceof Error && error.cause instanceof Error
          ? { cause: sanitize(`${error.cause.name}: ${error.cause.message}`) }
          : {}),
      },
    };
    rejections.examples.push(entry);
    console.error(JSON.stringify({ profileRejection: entry }));
  } catch {
    // Diagnostic formatting must never replace the authoritative rejection.
    rejections.observationFailures++;
  }
};
const maintenanceTick = CognitionMaintenance.prototype.tick;
if (collectRejections)
  CognitionMaintenance.prototype.tick = async function (interactiveBusy) {
    const at = performance.now(),
      stage = profilingStage;
    try {
      return await maintenanceTick.call(this, interactiveBusy);
    } catch (error) {
      rejected('maintenance', at, stage, error);
      throw error;
    }
  };
let reportWritten = false;
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
let capture: ReturnType<typeof startPerformanceCapture> | undefined;
try {
  capture = appProfiling ? startPerformanceCapture({ runtimeMonitoring: true }) : undefined;
  const config = readConfig({
    OPEN_LEGEND_DATA_DIR: directory,
    OPEN_LEGEND_PROFILING: appProfiling ? 'on' : 'off',
    OPEN_LEGEND_DATABASE_URL: disposable.url,
    AI_BUDGET_USD: cognitionFixture ? '0.1' : '0',
    DECISION_ESCALATION_JSON: '{"mode":"off","origins":[],"reasons":[]}',
    OPENAI_EMBEDDING_API_KEY: '',
    // Exercise cognition scheduling with a transport that cannot dispatch paid work.
    TYPESAFE_API_KEY: 'local-fixture',
    OPENAI_API_KEY: 'local-fixture',
    WORLD_SEED: '73',
    OPEN_LEGEND_GOD_MODE: 'true',
    OPEN_LEGEND_SQL_WRITE_GROUPS: process.env['OPEN_LEGEND_SQL_WRITE_GROUPS'],
  });
  const database = new PostgresDatabase(config.databaseUrl, false, config.sqlWriteGroups);
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
  type TimedOwner = {
    atMs: number;
    endedAtMs: number;
    owner: string;
    revision?: number;
  };
  const slowSql: Array<TimedOwner & { sql: string; ms: number; parameters: number }> = [];
  const httpCommands: Array<
    TimedOwner & {
      commandId?: string;
      dispatchAtMs: number;
      errorClass?: string;
      errorCode?: string;
    }
  > = [];
  let httpCommandsObserved = 0;
  type RecallStatement = { text: string; params: unknown[]; originalWallMs: number };
  let firstRecall: RecallStatement | undefined;
  let slowestRecall: RecallStatement | undefined;
  type CommitTrace = {
    closed: boolean;
    count: number;
    statements: string[];
    firstAt?: number;
    lastAt?: number;
    statementMs: number;
    revision: number;
  };
  const commitTrace = appProfiling ? new AsyncLocalStorage<CommitTrace>() : undefined;
  const commits = { count: 0, ms: 0, statements: 0, maxStatements: 0 };
  const slowCommits: Array<
    TimedOwner & {
      ms: number;
      count: number;
      preMs: number;
      statementMs: number;
      betweenMs: number;
      statements: string[];
    }
  > = [];
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
  if (appProfiling)
    database.query = async (statement, params) => {
      const at = performance.now();
      const beganMeasuring = measuring;
      const stage = profilingStage;
      const scope = commitTrace?.getStore();
      const trace = scope?.closed ? undefined : scope;
      if (trace) trace.firstAt ??= at;
      try {
        return await query(statement, params);
      } catch (error) {
        rejected('sql', at, stage, error, statement);
        throw error;
      } finally {
        if (
          collectRecallPlans &&
          statement.startsWith('WITH changed(actor_id,id) AS') &&
          statement.includes('desired AS MATERIALIZED')
        ) {
          const sample = {
            text: statement,
            params: [...(params ?? [])],
            originalWallMs: performance.now() - at,
          };
          firstRecall ??= sample;
          if (measuring && (!slowestRecall || sample.originalWallMs > slowestRecall.originalWallMs))
            slowestRecall = sample;
        }
        if (trace && !trace.closed) {
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
          const groupedTables = statement.startsWith('WITH write_')
            ? [...statement.matchAll(/\bINSERT INTO\s+([a-z_]+)/g)].map((match) => match[1])
            : [];
          const key = groupedTables.length
            ? `Grouped writes: ${groupedTables.join(', ')}`
            : statement.replace(/\s+/g, ' ').slice(0, 120) + metadataKind;
          if (trace && !trace.closed) {
            trace.count++;
            if (trace.statements.length < 128) trace.statements.push(key);
          }
          const entry = sql.get(key) ?? { count: 0, ms: 0 };
          if (beganMeasuring && performance.now() - at > 100) {
            slowSql.push({
              sql: key,
              ms: performance.now() - at,
              parameters: params?.length ?? 0,
              atMs: at - measureStart,
              endedAtMs: performance.now() - measureStart,
              owner: lossOwner?.getStore() ?? 'other',
              ...(trace && !trace.closed ? { revision: trace.revision } : {}),
            });
            slowSql.sort((a, b) => b.ms - a.ms);
            slowSql.length = Math.min(slowSql.length, 30);
          }
          entry.count++;
          entry.ms += performance.now() - at;
          sql.set(key, entry);
        }
      }
    };
  const captureRecallPlan = async (
    phase: 'fresh' | 'grown' | 'grown-analyzed',
    worldId: string,
    sample: RecallStatement | undefined,
  ) => {
    const path = resolve(output) + `.recall-plan-${phase}.json`;
    if (!sample) {
      await writeFile(path, JSON.stringify({ phase, status: 'not-observed' }), {
        flag: 'wx',
        mode: 0o600,
      });
      return { path, status: 'not-observed' };
    }
    const at = performance.now();
    const rollback = new Error('Roll back diagnostic query-plan execution.');
    let counts: Record<string, unknown> | undefined;
    let plan: unknown;
    let explainTiming:
      | { startedAtUnixMs: number; endedAtUnixMs: number; wallMs: number }
      | undefined;
    let failure: string | undefined;
    try {
      // Compare the same private fixture before and after statistics refresh;
      // never alter a player's database or hide this work in measured gameplay.
      if (phase === 'grown-analyzed')
        await database.exec(`ANALYZE recall_sources, mind_source_dependencies, memory_vectors,
          memory_index_queue, memory_index_models, memory_index_attempts,
          mind_forgotten, mind_corrections`);
      await database.transaction(async () => {
        await database.query("SET LOCAL statement_timeout = '5s'");
        counts = await database
          .prepare(
            `SELECT
          (SELECT COUNT(*) FROM recall_sources WHERE world_id=?) AS recall_sources,
          (SELECT COUNT(*) FROM mind_source_dependencies WHERE world_id=?) AS summary_sources,
          (SELECT COUNT(*) FROM memory_vectors WHERE world_id=?) AS vectors,
          (SELECT COUNT(*) FROM memory_index_queue WHERE world_id=?) AS queued_sources`,
          )
          .get(worldId, worldId, worldId, worldId);
        const explainAt = performance.now();
        try {
          plan = (
            await database.query(
              'EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ' + sample.text,
              sample.params,
            )
          ).rows;
        } finally {
          explainTiming = {
            startedAtUnixMs: performance.timeOrigin + explainAt,
            endedAtUnixMs: performance.timeOrigin + performance.now(),
            wallMs: performance.now() - explainAt,
          };
        }
        // EXPLAIN ANALYZE executes this write. The existing writer transaction
        // always rolls it back, preserving eligibility, vectors and indexing work.
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) failure = String(error);
    }
    const report = {
      phase,
      status: failure ? 'failed' : 'captured',
      worldId,
      counts,
      statement: sample.text,
      parameters: sample.params,
      originalWallMs: sample.originalWallMs,
      explainTiming,
      captureWallMs: performance.now() - at,
      hostLoad: loadavg(),
      plan,
      ...(failure ? { error: failure } : {}),
      scope:
        'Exact bound statement replayed against this phase snapshot inside rollback; not its original execution snapshot.',
    };
    await writeFile(path, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
    return { path, status: report.status };
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
  if (appProfiling)
    store.commit = async (...args) => {
      if (!measuring) return commit(...args);
      const trace: CommitTrace = {
        closed: false,
        count: 0,
        statements: [],
        statementMs: 0,
        revision: args[0] + 1,
      };
      const at = performance.now();
      try {
        return await commitTrace!.run(trace, () => commit(...args));
      } finally {
        // Delayed indexing inherits this async scope but does not belong to the
        // completed save. Keep its SQL in global totals, never retroactive attribution.
        trace.closed = true;
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
          slowCommits.push({
            ...sample,
            count: trace.count,
            statements: [...trace.statements],
            atMs: at - measureStart,
            endedAtMs: performance.now() - measureStart,
            owner: lossOwner?.getStore() ?? 'other',
            revision: trace.revision,
          });
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
  profilingStage = 'fixture construction';
  await initializeCollisionRuntime();
  const seed = createWorld(73);
  const seedRoots = worldRootEntities(seed);
  // Fixture-only public solids use the normal geometry validation; no gameplay building
  // family, support rule or standard opening is changed by this load experiment.
  const buildings: Array<{ id: string; minX: number; minZ: number; maxX: number; maxZ: number }> =
    [];
  if (expandedFixture) {
    const player = worldPosition(
      entityGet(seed.entities, seedRoots.find((e) => e.kind === 'player')!.id),
    )!;
    const candidates: Array<{ x: number; z: number }> = [];
    for (let z = 2; z < seed.map.height - 5; z++)
      for (let x = 2; x < seed.map.width - 5; x++) candidates.push({ x, z });
    candidates.sort(
      (a, b) =>
        Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z),
    );
    for (const { x, z } of candidates) {
      if (buildings.length === 3) break;
      const bounds = { minX: x, minZ: z, maxX: x + 3, maxZ: z + 3 };
      if (
        seedRoots.some((entity) => {
          const p = worldPosition(entity);
          return p && p.x > x - 1 && p.x < x + 4 && p.z > z - 1 && p.z < z + 4;
        }) ||
        buildings.some((b) => b.minX < x + 4 && b.maxX > x - 1 && b.minZ < z + 4 && b.maxZ > z - 1)
      )
        continue;
      const map = spatialMap(seed);
      const samples = [];
      for (let dz = 0; dz <= 3; dz++)
        for (let dx = 0; dx <= 3; dx++)
          samples.push(starterGroundAt(seed.map.spatial, x + dx, z + dz));
      if (samples.some((p) => !canStand(map, p, BASE_BODY_PROFILES.person))) continue;
      const y = Math.min(...samples.map((p) => p.y));
      const id = `profile-shed-${buildings.length}`;
      for (const [side, minX, maxX, minZ, maxZ] of [
        ['west', x, x + 0.2, z, z + 3],
        ['east', x + 2.8, x + 3, z, z + 3],
        ['back', x + 0.2, x + 2.8, z, z + 0.2],
      ] as const)
        seed.map.spatial.blockers.push({
          id: `${id}-${side}`,
          material: 'timber',
          movement: true,
          sight: true,
          acousticTransmission: 0.4,
          bounds: { min: { x: minX, y: y - 0.1, z: minZ }, max: { x: maxX, y: y + 2.4, z: maxZ } },
        });
      seed.map.spatial.revision++;
      buildings.push({ id, ...bounds });
    }
    if (buildings.length !== 3) throw new Error('Could not place all three clear profiling sheds.');
    validateSpatialWorld(seed);
  }
  const addedPopulation = standardFixture
    ? { people: 0, animals: 0, objects: 0, buildings: 0 }
    : expandedFixture
      ? { people: 10, animals: 20, objects: 100, buildings: buildings.length }
      : {
          people: 20 - seedRoots.filter((e) => e.actor?.controller === 'npc').length,
          animals: 21 - seedRoots.filter((e) => e.kind === 'animal').length,
          objects: 100 - seedRoots.filter((e) => !e.actor).length,
          buildings: 0,
        };
  let seeded = populateScenario(
    seed,
    parseScenario({
      seed: 73,
      layout: 'crowded',
      people: addedPopulation.people,
      // Historical totals and explicit additions are separate fixtures. Actual visibility
      // depends on the current integrated opening and is measured at both endpoints.
      animals: addedPopulation.animals,
      objects: addedPopulation.objects
        ? [
            {
              count: addedPopulation.objects,
              name: 'Scene material',
              properties: ['rigid'],
              quantity: 3,
              workSeconds: 2,
            },
          ]
        : [],
    }),
  ).world;
  const seedIds = new Set(seedRoots.map((entity) => entity.id));
  const routineActorIds = routineFixture
    ? worldRootEntities(seeded)
        .filter(
          (entity) =>
            entity.actor?.controller === 'npc' && (longSoakFixture || !seedIds.has(entity.id)),
        )
        .map((entity) => entity.id)
    : [];
  // The diagnostic supplies method knowledge explicitly; it does not infer it
  // from body shape or manufacture an autonomous goal.
  for (const actorId of routineActorIds)
    for (const recipe of Object.values(seeded.recipes))
      if (
        recipe.source.kind === 'fixed-transform' &&
        ['base:clean-fibers', 'base:twist-cord'].includes(recipe.source.definition.id)
      )
        learnRecipe(seeded, actorId, recipe.id, 'authored', 'diagnostic:routine-material-methods');
  const routineResources: Array<{
    actorId: string;
    id: string;
    type: string;
    quantity: number;
  }> = [];
  let travelRoutes: ReturnType<typeof placeTravelResources>['routes'] | undefined;
  if (routineFixture) {
    // Replace synthetic inert roots, preserving the declared 100 added roots. These finite
    // ordinary patches make the scripted work possible without granting unseen inputs.
    for (const entity of worldRootEntities(seeded)
      .filter((entity) => entity.id.startsWith('profile-near-object-'))
      .slice(0, routineActorIds.length * 2))
      entityDelete(seeded.entities, entity.id);
    if (travelFixture) {
      const placed = placeTravelResources(seeded, routineActorIds);
      seeded = placed.world;
      routineResources.push(...placed.resources);
      travelRoutes = placed.routes;
    } else {
      const offsets: Array<{ dx: number; dz: number }> = [];
      const placementRange = longSoakFixture ? 2 : 8;
      const placementStep = longSoakFixture ? 0.5 : 1;
      for (let dz = -placementRange; dz <= placementRange; dz += placementStep)
        for (let dx = -placementRange; dx <= placementRange; dx += placementStep)
          if (dx || dz) offsets.push({ dx, dz });
      offsets.sort((a, b) => Math.hypot(a.dx, a.dz) - Math.hypot(b.dx, b.dz));
      for (const actorId of routineActorIds) {
        for (const type of ['dry-grass-fibers', 'berry-bush'] as const) {
          const origin = worldPosition(entityGet(seeded.entities, actorId))!;
          let placed = false;
          for (const { dx, dz } of offsets) {
            const x = origin.x + dx,
              z = origin.z + dz;
            if (x < 0 || z < 0 || x >= seeded.map.width - 1 || z >= seeded.map.height - 1) continue;
            const point = starterGroundAt(seeded.map.spatial, x, z);
            if (!canStand(spatialMap(seeded), point, BASE_BODY_PROFILES.object)) continue;
            const result = spawnWorldEntity(seeded, {
              id: `profile-routine:${actorId}:${type}`,
              type,
              position: point,
            });
            if (!result.outcome.ok) continue;
            const patch = worldRootEntities(result.world).find(
              (entity) => !entityHas(seeded.entities, entity.id),
            );
            if (
              !patch ||
              !seesEntity(result.world, entityGet(result.world.entities, actorId)!, patch)
            )
              continue;
            // Long standing-work fixtures keep both resources at the unchanged work
            // stance. This proves no approach is needed; initial sight alone cannot
            // certify later sight after the ordinary travel fixture changes stance.
            if (
              longSoakFixture &&
              !canReachEntity(
                result.world,
                entityGet(result.world.entities, actorId)!,
                patch,
                SIMULATION_RULES.interactionRadius,
              )
            )
              continue;
            seeded = result.world;
            routineResources.push({
              actorId,
              id: patch.id,
              type,
              quantity: patch.resource!.quantity,
            });
            placed = true;
            break;
          }
          if (!placed)
            throw new Error(`Could not place a visible finite ${type} patch for ${actorId}.`);
        }
      }
    }
    // The ordinary spawn transition freezes its result; the final pause is fixture setup.
    seeded = structuredClone(seeded);
    validateSpatialWorld(seeded);
    if (
      worldRootEntities(seeded).length - seedRoots.length !==
      addedPopulation.people + addedPopulation.animals + addedPopulation.objects
    )
      throw new Error('The expanded routine fixture must add exactly 130 physical roots.');
  }
  const memoryHistory = memoryHistoryFixture
    ? {
        synthetic: true,
        people: [] as Array<{
          actorId: string;
          prefix: string;
          ids: string[];
          searchWord?: string;
          searchCount?: number;
        }>,
      }
    : undefined;
  if (memoryHistory) {
    seeded = structuredClone(seeded);
    for (const [actorId, count, prefix] of [
      [PLAYER_ID, 60, 'Profiler player observation'],
      [NPC_ID, 25, 'Profiler resident observation'],
    ] as const) {
      const ids: string[] = [];
      for (let i = 1; i <= count; i++) {
        const id = appendMemory(seeded, actorId, {
          kind: 'episode',
          source: 'internal',
          importance: 1,
          entityIds: [actorId],
          summary: `${prefix} ${String(i).padStart(3, '0')}: I observed a synthetic diagnostic marker${actorId === PLAYER_ID && i % 5 === 0 ? ' colored saffron' : ''}.`,
        });
        if (!id) throw new Error(`Could not seed personal fixture history for ${actorId}.`);
        ids.push(id);
      }
      memoryHistory.people.push({
        actorId,
        prefix,
        ids,
        ...(actorId === PLAYER_ID ? { searchWord: 'saffron', searchCount: 12 } : {}),
      });
    }
  }
  const longSoak = longSoakFixture
    ? prepareLongSoak(seeded, routineResources, seconds, config.baseRatio)
    : undefined;
  if (longSoak && travelFixture)
    longSoak.resourceSchedule =
      'Finite assigned separated patches, with actual supported approach travel and ordinary return between cycles. No retargeting or replenishment.';
  if (longSoak) validateCurrentWorldState(seeded);
  // A saved fixture restores without first-creation effects, just like real saves.
  // Include the world's actual initial sensing/conditions in setup, before timing play.
  profilingStage = 'initial fixture preparation';
  const startupAt = performance.now();
  prepareBaseInitialWorldState(seeded);
  const startupPreparationMs = performance.now() - startupAt;
  profilingStage = 'initial fixture save';
  await store.commit(0, { world: seeded, speed: profileSpeed, manuallyPaused: true });
  const setupMs = performance.now() - setupAt;
  const recallPlans = collectRecallPlans
    ? { fresh: await captureRecallPlan('fresh', seeded.id, firstRecall) }
    : undefined;
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
  profilingStage = 'server startup';
  const game = await createGameServer({
    config,
    store,
    production: true,
    ...(layer === 'pump' ? { tick: false } : {}),
    aiClient: cognitionFixture ? fixture : { judge: unavailable, generate: unavailable },
    profileCommand: appProfiling
      ? (commandId, arrivedAt, operation) => {
          const owner = commandId ? `player command ${commandId}` : 'player command';
          const sample = {
            commandId,
            owner,
            atMs: arrivedAt - measureStart,
            dispatchAtMs: performance.now() - measureStart,
            endedAtMs: 0,
            errorClass: undefined as string | undefined,
            errorCode: undefined as string | undefined,
          };
          const captured = measuring && arrivedAt >= measureStart;
          return withLossOwner(owner, async () => {
            try {
              return await operation();
            } catch (error) {
              sample.errorClass = error instanceof Error ? error.constructor.name : typeof error;
              const code =
                error && typeof error === 'object' && 'code' in error ? error.code : undefined;
              if (typeof code === 'string') sample.errorCode = code.slice(0, 64);
              throw error;
            } finally {
              sample.endedAtMs = performance.now() - measureStart;
              if (captured) {
                httpCommandsObserved++;
                if (httpCommands.length < 4000) httpCommands.push(sample);
              }
            }
          });
        }
      : undefined,
  });
  const tick = game.service.tick.bind(game.service);
  if (collectLostTime)
    game.service.tick = async (elapsed, suspended, options) => {
      const snapshot = () => ({
        simTime: game.service.world.simTime,
        debt: (game.service as unknown as { debtSeconds: number }).debtSeconds,
        paused: game.service.paused,
        pauseReason: game.service.pauseReason,
        navigation: navigationBlocked(game.service.world),
      });
      const event = {
        kind: 'tick',
        atMs: performance.now() - lossStart,
        elapsed,
        suspended,
        before: snapshot(),
        endedAtMs: null as number | null,
        after: null as ReturnType<typeof snapshot> | null,
      };
      lossEvent(event);
      try {
        return await lossOwner!.run('tick', () => tick(elapsed, suspended, options));
      } finally {
        event.endedAtMs = performance.now() - lossStart;
        event.after = snapshot();
      }
    };
  // Fixture-only attribution; no instrumentation runs in the normal game server.
  const preview = game.service.previewCommand.bind(game.service);
  if (appProfiling)
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
  if (travelFixture) profilingStage = 'travel rehearsal';
  const travelRehearsal =
    travelFixture && longSoak
      ? rehearseTravel(
          game.service.world,
          routineActorIds.map((actorId) => {
            const selection = prepareRoutinePlan(
              game.service,
              actorId,
              `travel-rehearsal:${actorId}`,
              'work',
              longSoak.targets[actorId],
            );
            if (!selection)
              throw new Error(`No ordinary initial travel routine offered for ${actorId}.`);
            return selection;
          }),
          longSoak.targets,
          longSoak.maximumCycleSeconds,
        )
      : undefined;
  profilingStage = 'server startup';
  await new Promise<void>((done) => game.server.listen(0, '127.0.0.1', done));
  probe.on('error', () => {});
  await probe.connect();
  const address = game.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing server address.');
  const base = `http://127.0.0.1:${address.port}`;
  const profiler = collectCpu || collectAllocations ? new Session() : undefined;
  const streamAbort = new AbortController();
  let streamTask: Promise<void> | undefined;
  let commandTimer: ReturnType<typeof setInterval> | undefined;
  let commandTask: Promise<void> | undefined;
  let commandBusy = false;
  let presenceTimer: ReturnType<typeof setInterval> | undefined;
  let presenceTask: Promise<void> | undefined;
  let presenceBusy = false,
    presenceSkipped = 0;
  let speechTimer: ReturnType<typeof setInterval> | undefined;
  let speechTask: Promise<void> | undefined;
  let speechBusy = false;
  let speechOffered = 0,
    speechAccepted = 0,
    speechSkipped = 0;
  const probeSamples: number[] = [];
  const probeTotals = { count: 0, totalMs: 0, maxMs: 0 };
  let probeTimer: ReturnType<typeof setInterval> | undefined;
  let probeTask: Promise<void> | undefined;
  let probeBusy = false;
  let pumpTask: Promise<void> | undefined;
  let pumpThinking: Promise<void> | undefined;
  let failureCount = 0;
  const failures: Array<{ source: string; message: string; atUnixMs: number }> = [];
  const failed = (source: string, error: unknown) => {
    failureCount++;
    if (failures.length < 10) {
      const failure = { source, message: String(error), atUnixMs: Date.now() };
      failures.push(failure);
      console.error(
        JSON.stringify({
          profileFailure: failure,
          stage: profilingStage,
          atUnixMs: failure.atUnixMs,
        }),
      );
    }
  };
  const commands: Array<{ atMs: number; ms: number; ok: boolean; code?: string }> = [];
  const gaps: number[] = [];
  const warmGaps: number[] = [];
  const spans: Array<{ stage: string; ms: number; endedAt: number }> = [];
  const slowStages: Array<TimedOwner & { stage: string; ms: number }> = [];
  const longGaps: Array<{ atMs: number; ms: number; spans: typeof spans }> = [];
  const stageSamples = new Map<
    string,
    { count: number; totalMs: number; maxMs: number; values: number[] }
  >();
  const stopTrace = appProfiling
    ? observeDurations((stage, ms, endedAt) => {
        if (
          ms >= 1 &&
          /^(native\.iteratorCall|public\.projection|world\.commit|persistence\.|postgres\.statement|navigation\.|tick\.yieldWait)/.test(
            stage,
          )
        )
          lossEvent({
            kind: 'stage',
            stage,
            atMs: endedAt - ms - lossStart,
            endedAtMs: endedAt - lossStart,
          });
        if (measuring) {
          let samples = stageSamples.get(stage);
          if (!samples) {
            samples = { count: 0, totalMs: 0, maxMs: 0, values: [] };
            stageSamples.set(stage, samples);
          }
          samples.values[samples.count % 2048] = ms;
          samples.count++;
          samples.totalMs += ms;
          samples.maxMs = Math.max(samples.maxMs, ms);
          if (ms >= 150 && endedAt - ms >= measureStart && stage !== 'native.intervalSimMs') {
            slowStages.push({
              stage,
              ms,
              atMs: endedAt - ms - measureStart,
              endedAtMs: endedAt - measureStart,
              owner: lossOwner?.getStore() ?? 'other',
            });
            slowStages.sort((a, b) => b.ms - a.ms);
            slowStages.length = Math.min(slowStages.length, 20);
          }
        }
        if (ms < 3 || stage === 'native.intervalSimMs') return;
        spans.push({ stage, ms, endedAt });
        if (spans.length > 2000) spans.splice(0, 1000);
      })
    : undefined;
  let measureStart = 0;
  let bytes = 0,
    updates = 0;
  const publicationFrames = { patch: 0, reset: 0 };
  const publicationSectionBytes: Record<string, number> = {};
  let stopActivity: (() => void) | undefined;
  let routineTask: Promise<void> | undefined;
  let routineScheduled = false;
  let routinesActive = false;
  let startRoutines: (() => void) | undefined;
  const nativeCounters: Record<string, number> = {};
  const routines = {
    scripted: routineFixture,
    mode: composedRoutines
      ? 'native-eight-cycle-compositions'
      : routinePlanFixture
        ? 'native-five-step-plans'
        : 'separate-commands',
    admissionUnit: routinePlanFixture ? 'plans' : 'commands',
    ...(composedRoutines
      ? {
          commitmentCycles: 8,
          choiceScope:
            'Forced diagnostic interpretation through ordinary composition admission, with an initial durable job and terminal write per commitment. Rest/reconsideration waits until up to eight cycles finish, seven cycles later than the default. No voluntary choice or production policy is qualified.',
        }
      : {}),
    actors: routineActorIds,
    ...(longSoakFixture
      ? {
          groups: {
            existing: routineActorIds.filter((id) => seedIds.has(id)),
            added: routineActorIds.filter((id) => !seedIds.has(id)),
          },
        }
      : {}),
    accepted: {} as Record<string, number>,
    refused: [] as Array<{ actorId: string; phase: number; code: string; message?: string }>,
  };
  const routinePlans = {
    detailLimit: 4000,
    selected: {} as Record<string, number>,
    completed: {} as Record<string, number>,
    commitmentsCompleted: {} as Record<string, number>,
    stoppedCount: 0,
    outputBindingsChecked: 0,
    outputBindingsMatched: 0,
    stopped: [] as Array<{
      actorId: string;
      planId: string;
      status: string;
      code?: string;
      message?: string;
    }>,
    outputBindings: [] as Array<{
      actorId: string;
      planId: string;
      producedFoodId?: string;
      eatenFoodId?: string;
      matched: boolean;
    }>,
  };
  let busySnapshot:
    | { path: string; atMs: number; simTime: number; actorsWorking: number }
    | undefined;
  const presenceSamples: Array<{
    atMs: number;
    completedAtMs: number;
    visible: boolean;
    sequence?: number;
    pauseReasonBefore: string | null;
    pauseReasonAfter: string | null;
    error?: string;
  }> = [];
  const presence = game.service.reportPresence.bind(game.service);
  if (appProfiling)
    game.service.reportPresence = async (...args) => {
      const at = performance.now();
      const pauseReasonBefore = game.service.pauseReason;
      let error: string | undefined;
      try {
        await withLossOwner('presence', () => presence(...args));
      } catch (failure) {
        error = String(failure);
        throw failure;
      } finally {
        if (measuring && presenceSamples.length < 4000)
          presenceSamples.push({
            atMs: at - measureStart,
            completedAtMs: performance.now() - measureStart,
            visible: args[1],
            sequence: args[2],
            pauseReasonBefore,
            pauseReasonAfter: game.service.pauseReason,
            ...(error ? { error } : {}),
          });
      }
    };
  const commandSamples: Array<{
    commandId: string;
    atMs: number;
    completedAtMs: number;
    type: string;
    ok?: boolean;
    code?: string;
    pauseReasonBefore: string | null;
    pauseReasonAfter: string | null;
  }> = [];
  const submitCommand = game.service.command.bind(game.service);
  if (appProfiling)
    game.service.command = async (...args) => {
      const at = performance.now();
      const pauseReasonBefore = game.service.pauseReason;
      let result: Awaited<ReturnType<typeof submitCommand>> | undefined;
      try {
        result = await withLossOwner(lossOwner?.getStore() ?? `player command ${args[0]}`, () =>
          submitCommand(...args),
        );
        return result;
      } finally {
        if (measuring && commandSamples.length < 4000)
          commandSamples.push({
            commandId: args[0],
            atMs: at - measureStart,
            completedAtMs: performance.now() - measureStart,
            type: args[1].type,
            ...(result ? { ok: result.ok, code: result.code } : {}),
            pauseReasonBefore,
            pauseReasonAfter: game.service.pauseReason,
          });
      }
    };
  try {
    profilingStage = 'controller setup';
    const client = 'scene-profile';
    const response = await toolHttp(base + '/api/state', { headers: { 'X-OL-Client': client } });
    const cookie = response.headers.get('set-cookie')?.split(';')[0];
    if (!cookie) throw new Error('Missing local session.');
    let view = (await response.json()) as GameView;
    const post = async (path: string, body: unknown) => {
      const r = await toolHttp(base + path, {
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
    const refreshed = await toolHttp(base + '/api/state', {
      headers: { cookie, 'X-OL-Client': client },
    });
    if (!refreshed.ok) throw new Error('Controlled scene inspection failed.');
    view = (await refreshed.json()) as GameView;
    globalThis.gc?.();
    const initialHeapBytes = process.memoryUsage().heapUsed;
    let lastUpdate = performance.now();
    let commandSkipped = 0;
    if (!browserFixture && (!layer || layer === 'viewer')) {
      const framer = new SSEFramer({ kind: 'complete-projection', owner: 'game-events' });
      const stream = toolStream(
        `${base}/api/events?client=${client}&scope=${view.access!.scope}&revision=${view.revision}`,
        { headers: { cookie }, signal: streamAbort.signal },
        (read) => {
          if (measuring) bytes += read.byteLength;
          for (const message of framer.push(read))
            if (
              measuring &&
              message.kind === 'event' &&
              ['patch', 'reset'].includes(message.event)
            ) {
              publicationFrames[message.event as 'patch' | 'reset']++;
              if (appProfiling) {
                // Diagnostic JSON value bytes exclude property names and SSE framing;
                // total wire bytes above remain the actual transfer measurement.
                const fields = JSON.parse(message.data) as Record<string, unknown>;
                for (const [field, value] of Object.entries(fields))
                  publicationSectionBytes[field] =
                    (publicationSectionBytes[field] ?? 0) +
                    Buffer.byteLength(JSON.stringify(value));
              }
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
        },
        Math.ceil((seconds + 180) * 1000),
      );
      await stream.ready;
      streamTask = stream.done
        .then(() => {
          if (!streamAbort.signal.aborted) failed('stream', 'The update stream ended early.');
        })
        .catch((error) => {
          if (!streamAbort.signal.aborted) failed('stream', error);
        });
    }
    let startPlayerDrivers: (() => void) | undefined;
    if (!browserFixture) {
      const anchor = worldPosition(entityGet(game.service.world.entities, view.player.id));
      if (!anchor) throw new Error('Player has no world position.');
      let serial = 0;
      let presenceSequence = 1;
      const targets = [
        {
          ...anchor,
          x: anchor.x + (layer ? 0.5 : 1),
          surfaceId: layer
            ? worldSupport(entityGet(game.service.world.entities, view.player.id)!)
            : 'terrain',
        },
        {
          ...anchor,
          surfaceId: layer
            ? worldSupport(entityGet(game.service.world.entities, view.player.id)!)
            : 'terrain',
        },
      ];
      // Scene preparation must finish before player requests enter the measured game.
      startPlayerDrivers = () => {
        // Foreground presence follows the browser's cadence, even while a walk is pending.
        // A slow command must not make the test player appear to have left the game.
        const sendPresence = () => {
          if (presenceBusy) {
            presenceSkipped++;
            return;
          }
          presenceBusy = true;
          presenceTask = post('/api/presence', {
            clientId: client,
            visible: true,
            sequence: ++presenceSequence,
          })
            .then((result) => {
              if (!result.ok) throw new Error(result.message ?? 'Presence report refused.');
            })
            .catch((error: unknown) => failed('presence', error))
            .finally(() => {
              presenceBusy = false;
            });
        };
        presenceTimer = setInterval(sendPresence, 5000);
        sendPresence();
        commandTimer = setInterval(() => {
          if (commandBusy) {
            commandSkipped++;
            return;
          }
          commandBusy = true;
          commandTask = (async () => {
            const index = serial++;
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
      };
    }
    const soakInitialOffers: Array<{
      actorId: string;
      offered: boolean;
      currentAction: string | null;
      planStatus: string | null;
    }> = [];
    const soakValidationStarted = performance.now();
    if (longSoak) {
      for (const actorId of routineActorIds) {
        const observed = decisionObservation(game.service.world, actorId);
        const offered = !!prepareRoutinePlan(
          game.service,
          actorId,
          `soak-preflight-${actorId}`,
          'work',
          longSoak.targets[actorId],
          composedRoutines ? 8 : 1,
        );
        const actor = entityGet(game.service.world.entities, actorId)?.actor;
        soakInitialOffers.push({
          actorId,
          offered,
          currentAction: actor?.action?.type ?? null,
          planStatus: actor?.agency.plan?.status ?? null,
        });
        if (!observed) continue;
        for (const definitionId of ['raw_fiber', 'berries'])
          if (
            gatheringYield(
              game.service.world,
              observed.inventory.map(
                (item) => game.service.world.itemDefinitions[item.definitionId],
              ),
              definitionId,
            ) !== gatheringYield(game.service.world, [], definitionId)
          )
            throw new Error(
              `Long-soak resident ${actorId} has a tool outside the finite no-tool stock bound.`,
            );
      }
    }
    const soakValidation = {
      ms: performance.now() - soakValidationStarted,
      simTime: game.service.world.simTime,
      offers: soakInitialOffers,
    };
    const readySource = await sourceFingerprint();
    const sourceProvenance = {
      startup: startupSource,
      ready: readySource,
      unchangedThroughReady:
        startupSource.status === 'captured' && readySource.status === 'captured'
          ? startupSource.sha256 === readySource.sha256
          : null,
      scope:
        'Runtime source fingerprint after static imports and before server creation, checked again before readiness; later workspace edits do not change already-loaded modules. No source bodies or environment values are retained.',
    };
    if (browserFixture) {
      profilingStage = 'browser startup';
      await writeFile(
        resolve(readyPath!),
        JSON.stringify({
          url: base,
          playerId: view.player.id,
          outputPath: resolve(output),
          databaseAdapter: 'postgres',
          nativeSpeed: 3,
          startMarkerPath: resolve(browserStartPath!),
          seconds,
          expanded: expandedFixture,
          addedPopulation,
          buildings,
          routineResources,
          temporaryDataDirectory: directory,
          routineMode: routines.mode,
          ...(travelFixture
            ? { travel: { routes: travelRoutes, rehearsal: travelRehearsal } }
            : {}),
          ...(longSoak ? { longSoak, playerSurvival: longSoak.playerSurvival } : {}),
          purpose: memoryHistoryFixture
            ? 'memory-ui-correctness'
            : profileSpeed === 3
              ? 'three-times-capacity'
              : profileSpeed === 1
                ? 'normal-speed-capacity'
                : 'eight-times-capacity',
          ...(memoryHistory ? { memoryHistory } : {}),
          sourceProvenance,
          instrumentation,
        }),
        { flag: 'wx', mode: 0o600 },
      );
      console.error(`profile browser ready: ${base}; waiting for browser start marker`);
      const deadline = performance.now() + 120_000;
      for (;;) {
        try {
          await readFile(browserStartPath!);
          break;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
        if (performance.now() >= deadline)
          throw new Error('Browser profiler did not start within 120 seconds.');
        await new Promise<void>((done) => setTimeout(done, 50));
      }
      if (!memoryHistoryFixture && (game.service.paused || game.service.speed !== profileSpeed))
        throw new Error(
          `The browser must resume the fixture at ${profileSpeed}× before measurement.`,
        );
    }
    const start = performance.now(),
      simStart = game.service.world.simTime;
    const startingCpu = process.cpuUsage();
    const cpuProfileWindow: Record<string, number> | undefined = collectCpu
      ? {
          measurementStartedUs: Number(process.hrtime.bigint() / 1000n),
        }
      : undefined;
    const allocationProfileWindow: Record<string, number> | undefined = collectAllocations
      ? {}
      : undefined;
    const measurementStartedAtUnixMs = performance.timeOrigin + start;
    profilingStage = 'measurement';
    const travel = travelFixture ? travelProgress(game.service.world, routineActorIds) : undefined;
    const activity = {
      eventsByType: {} as Record<string, number>,
      startedActionsByType: {} as Record<string, number>,
      startedActionsByActor: {} as Record<string, number>,
    };
    const routinePhases = new Map(routineActorIds.map((id) => [id, 0]));
    const priorActions = new Map(
      routineActorIds.map((id) => [
        id,
        entityGet(game.service.world.entities, id)?.actor?.action?.id,
      ]),
    );
    const queuedRoutines = new Set<string>();
    let routineSerial = 0;
    let routineActorInFlight: string | undefined;
    let routineActorStage: string | undefined;
    let routineSelectionInFlight: string | undefined;
    let routineRetryAt = 0;
    const pendingPlans = new Map<
      string,
      { id: string; kind: 'work' | 'rest'; cycles: number; checkedCycles: Set<string> }
    >();
    const soakActors = Object.fromEntries(
      (longSoak ? [PLAYER_ID, ...routineActorIds] : []).map((actorId) => [
        actorId,
        {
          activeRealMs: 0,
          idleRealMs: 0,
          restRealMs: 0,
          activeGameSeconds: 0,
          idleGameSeconds: 0,
          restGameSeconds: 0,
          restSelections: 0,
          restPlansCompleted: 0,
          restStarts: 0,
          wakes: 0,
          refused: 0,
          stopped: 0,
          errors: 0,
          initialInventory: longSoak ? soakInventory(game.service.world, actorId) : undefined,
        },
      ]),
    );
    const restState = new Map<string, boolean>();
    const priorPlanStatuses = new Map(
      routineActorIds.map((id) => [
        id,
        entityGet(game.service.world.entities, id)?.actor?.agency.plan?.status,
      ]),
    );
    const resourceVisits: Record<string, Record<string, number>> = {};
    const startingActionRecords = game.service.world.actionExperience.admitted;
    let soakLastReal = start,
      soakLastSim = simStart;
    const observeSoak = () => {
      if (!longSoak) return;
      const now = performance.now(),
        world = game.service.world;
      for (const [actorId, totals] of Object.entries(soakActors)) {
        const actor = entityGet(world.entities, actorId);
        const resting = !!actor?.statusEffects?.[longSoak.playerSurvival.sleepEffectId]?.active;
        const mode = resting ? 'rest' : actor?.actor?.action ? 'active' : 'idle';
        totals[`${mode}RealMs`] += now - soakLastReal;
        totals[`${mode}GameSeconds`] += world.simTime - soakLastSim;
        if (restState.has(actorId) && resting !== restState.get(actorId)) {
          if (resting) totals.restStarts++;
          else {
            totals.wakes++;
            if (routineActorIds.includes(actorId)) queuedRoutines.add(actorId);
          }
        }
        restState.set(actorId, resting);
      }
      soakLastReal = now;
      soakLastSim = world.simTime;
    };
    const routineCommand = (actorId: string, phase: number): CommandInput | undefined => {
      const observed = game.service.observe(actorId, { includeMemories: false });
      if (!observed) return;
      if (phase === 1 || phase === 2) {
        const method = observed.knownRecipes.find(
          (recipe) =>
            recipe.source.kind === 'fixed-transform' &&
            recipe.source.definition.id === (phase === 1 ? 'base:clean-fibers' : 'base:twist-cord'),
        );
        if (!method) throw new Error('Routine actor lacks the required material method.');
        return { type: 'craft', recipeId: method.id };
      }
      if (phase === 4) {
        const food = observed.inventory.find((item) =>
          observed.itemDefinitions.some((d) => d.id === item.definitionId && d.nutrition),
        );
        return food ? { type: 'eat', itemId: food.id } : undefined;
      }
      const origin = worldPosition(observed.actor)!;
      const resources = observed.visibleEntities.filter(
        (entity) =>
          entity.resource?.definitionId === (phase === 0 ? 'raw_fiber' : 'berries') &&
          entity.resource.quantity > 0,
      );
      resources.sort((a, b) => {
        const p = worldPosition(a)!,
          q = worldPosition(b)!;
        return (
          Math.hypot(p.x - origin.x, p.z - origin.z) - Math.hypot(q.x - origin.x, q.z - origin.z)
        );
      });
      return resources[0] ? { type: 'gather', targetId: resources[0].id } : undefined;
    };
    const scheduleRoutines = () => {
      if (!measuring || !routinesActive || routineTask || routineScheduled || !queuedRoutines.size)
        return;
      routineScheduled = true;
      const run = () => {
        routineScheduled = false;
        if (!measuring || !routinesActive) return;
        routineTask = (async () => {
          while (measuring && routinesActive && queuedRoutines.size) {
            const actorId = queuedRoutines.values().next().value!;
            queuedRoutines.delete(actorId);
            routineActorInFlight = actorId;
            routineSelectionInFlight = undefined;
            routineActorStage = routinePlanFixture
              ? 'prepare current plan offers'
              : 'ordinary command';
            if (entityGet(game.service.world.entities, actorId)?.actor?.action) continue;
            if (
              routinePlanFixture &&
              entityGet(game.service.world.entities, actorId)?.actor?.agency.plan?.status ===
                'active'
            )
              continue;
            const phase = routinePhases.get(actorId)!;
            const energy = longSoak
              ? entityGet(game.service.world.entities, actorId)?.actor?.attributes?.[
                  longSoak.playerSurvival.energyAttributeId
                ]?.value
              : undefined;
            const planKind =
              longSoak && typeof energy === 'number' && energy < longSoak.energyConcernBelow
                ? 'rest'
                : 'work';
            const planSelection = routinePlanFixture
              ? prepareRoutinePlan(
                  game.service,
                  actorId,
                  `profile-plan-${routineSerial++}`,
                  planKind,
                  longSoak?.targets[actorId],
                  composedRoutines ? 8 : 1,
                )
              : undefined;
            const input = routinePlanFixture ? undefined : routineCommand(actorId, phase);
            routineSelectionInFlight = planSelection?.id;
            if (!input && !planSelection) {
              routines.refused.push({ actorId, phase, code: 'no-visible-input' });
              if (longSoak) soakActors[actorId]!.refused++;
              continue;
            }
            const result = planSelection
              ? await withLossOwner('resident plan', () =>
                  selectRoutinePlan(game.service, planSelection, (stage) => {
                    routineActorStage = stage;
                  }),
                )
              : await game.service.command(`profile-routine-${routineSerial++}`, input!, actorId);
            if (!result.ok) {
              routines.refused.push({ actorId, phase, code: result.code, message: result.message });
              if (longSoak) soakActors[actorId]!.refused++;
              if ('retryUnstarted' in result && result.retryUnstarted === true) {
                queuedRoutines.add(actorId);
                routineRetryAt = performance.now() + 250;
                if (longSoak) soakActors[actorId]!.errors++;
                failed(
                  `routine actor ${actorId} selection ${routineSelectionInFlight} (unstarted plan admission)`,
                  new OverloadError(),
                );
                break;
              }
              continue;
            }
            routines.accepted[actorId] = (routines.accepted[actorId] ?? 0) + 1;
            if (planSelection) {
              pendingPlans.set(actorId, {
                id: `${planSelection.id}:routine`,
                kind: planKind,
                cycles: planSelection.cycles,
                checkedCycles: new Set(),
              });
              if (planKind === 'rest') soakActors[actorId]!.restSelections++;
              else routinePlans.selected[actorId] = (routinePlans.selected[actorId] ?? 0) + 1;
            } else routinePhases.set(actorId, (phase + 1) % 5);
            if (
              snapshotPath &&
              !busySnapshot &&
              routineActorIds.every((id) => routines.accepted[id])
            ) {
              // A private synthetic snapshot supports exact native replay. This optional
              // diagnostic serialization is included in the run's wall time, not hidden.
              const world = game.service.world;
              busySnapshot = {
                path: resolve(snapshotPath),
                atMs: performance.now() - measureStart,
                simTime: world.simTime,
                actorsWorking: routineActorIds.filter(
                  (id) => entityGet(world.entities, id)?.actor?.action,
                ).length,
              };
              await writeFile(
                busySnapshot.path,
                JSON.stringify({
                  world: materializeNativeValues(world),
                  speed: game.service.speed,
                  manuallyPaused: false,
                }),
                { flag: 'wx', mode: 0o600 },
              );
            }
            if (!planSelection && !entityGet(game.service.world.entities, actorId)?.actor?.action)
              queuedRoutines.add(actorId);
          }
        })()
          .catch((error: unknown) => {
            if (longSoak && routineActorInFlight) soakActors[routineActorInFlight]!.errors++;
            failed(
              `routine${routineActorInFlight ? ` actor ${routineActorInFlight}` : ''}${routineSelectionInFlight ? ` selection ${routineSelectionInFlight}` : ''} (${routineActorStage ?? 'ordinary command'})`,
              error,
            );
          })
          .finally(() => {
            routineTask = undefined;
            scheduleRoutines();
          });
      };
      const delay = Math.max(0, routineRetryAt - performance.now());
      if (delay) setTimeout(run, delay).unref();
      else setImmediate(run);
    };
    startRoutines = () => {
      routinesActive = routineFixture;
      for (const id of routineActorIds) queuedRoutines.add(id);
      scheduleRoutines();
    };
    const clockChanges: Array<{
      atMs: number;
      simTime: number;
      paused: boolean;
      pauseReason: string | null;
    }> = [];
    let lastPause = '';
    let lastEventSequence = game.service.world.events.at(-1)?.sequence ?? 0;
    stopActivity = game.service.subscribe(() => {
      if (!measuring) return;
      const paused = game.service.world.paused;
      const pauseReason = game.service.pauseReason;
      const key = `${paused}:${pauseReason}`;
      if (key !== lastPause && clockChanges.length < 4000) {
        clockChanges.push({
          atMs: performance.now() - measureStart,
          simTime: game.service.world.simTime,
          paused,
          pauseReason,
        });
        lastPause = key;
      }
      const events = game.service.world.events;
      for (let i = events.length - 1; i >= 0; i--) {
        const event = events[i]!;
        if (event.sequence <= lastEventSequence) break;
        activity.eventsByType[event.type] = (activity.eventsByType[event.type] ?? 0) + 1;
        if (event.type === 'action-started') {
          const type = String(event.data?.['actionType'] ?? 'unknown');
          activity.startedActionsByType[type] = (activity.startedActionsByType[type] ?? 0) + 1;
          if (event.actorId)
            activity.startedActionsByActor[event.actorId] =
              (activity.startedActionsByActor[event.actorId] ?? 0) + 1;
          if (longSoak && type === 'gather' && event.targetId && event.actorId) {
            const visits = (resourceVisits[event.targetId] ??= {});
            visits[event.actorId] = (visits[event.actorId] ?? 0) + 1;
          }
        }
      }
      lastEventSequence = events.at(-1)?.sequence ?? lastEventSequence;
      observeSoak();
      travel?.observe(game.service.world);
      for (const actorId of routineActorIds) {
        if (routinePlanFixture) {
          const pending = pendingPlans.get(actorId);
          const expected = pending?.id;
          const actor = entityGet(game.service.world.entities, actorId)?.actor;
          const plan = actor?.agency.plan;
          if (
            longSoak &&
            !pending &&
            ((!actor?.action && priorActions.get(actorId)) ||
              (priorPlanStatuses.get(actorId) === 'active' && plan?.status !== 'active'))
          )
            queuedRoutines.add(actorId);
          priorActions.set(actorId, actor?.action?.id);
          priorPlanStatuses.set(actorId, plan?.status);
          if (pending?.cycles === 8 && plan && plan.id === expected && plan.activity) {
            // Read the bounded current/history frontier, counting actual meals even when
            // the longer commitment remains active or later stops. Never infer eight cycles.
            for (const step of [...(actor?.agency.history ?? []), ...plan.steps]) {
              const key = step.activityKey;
              if (
                !key ||
                !/^eat_[0-7]$/.test(key) ||
                step.status !== 'completed' ||
                !step.id.startsWith(`${expected}:step:`) ||
                pending.checkedCycles.has(key)
              )
                continue;
              pending.checkedCycles.add(key);
              const producedFoodId = plan.activity.outputs[key.replace('eat_', 'berries_')]?.find(
                (entry) => entry.port === 'berries',
              )?.itemId;
              const occurrence = game.service.world.actionExperience.occurrences[actorId]?.find(
                (entry) => entry.actionId === step.actionId,
              );
              const eatenFoodId =
                occurrence?.command.type === 'eat' ? occurrence.command.itemId : undefined;
              const matched =
                !!producedFoodId &&
                producedFoodId === eatenFoodId &&
                occurrence?.status === 'completed' &&
                !!step.outcome?.ok;
              routinePlans.completed[actorId] = (routinePlans.completed[actorId] ?? 0) + 1;
              routinePlans.outputBindingsChecked++;
              routinePlans.outputBindingsMatched += Number(matched);
              if (routinePlans.outputBindings.length < routinePlans.detailLimit)
                routinePlans.outputBindings.push({
                  actorId,
                  planId: expected!,
                  producedFoodId,
                  eatenFoodId,
                  matched,
                });
            }
          }
          if (!expected || (plan?.id === expected && plan.status === 'active')) continue;
          pendingPlans.delete(actorId);
          if (plan?.id === expected && plan.status === 'completed') {
            if (pending!.kind === 'rest') {
              soakActors[actorId]!.restPlansCompleted++;
              if (
                !entityGet(game.service.world.entities, actorId)?.statusEffects?.[
                  longSoak!.playerSurvival.sleepEffectId
                ]?.active
              )
                queuedRoutines.add(actorId);
              continue;
            }
            routinePlans.commitmentsCompleted[actorId] =
              (routinePlans.commitmentsCompleted[actorId] ?? 0) + 1;
            if (pending!.cycles === 1) {
              routinePlans.completed[actorId] = (routinePlans.completed[actorId] ?? 0) + 1;
              const producer = plan.steps[3],
                eater = plan.steps[4];
              const occurrence = game.service.world.actionExperience.occurrences[actorId]?.find(
                (entry) => entry.actionId === eater?.actionId,
              );
              const producedFoodId = producer?.outcome?.itemId;
              const eatenFoodId =
                occurrence?.command.type === 'eat' ? occurrence.command.itemId : undefined;
              const matched =
                !!producedFoodId &&
                producedFoodId === eatenFoodId &&
                occurrence?.status === 'completed' &&
                plan.steps.every((step) => step.status === 'completed' && step.outcome?.ok);
              routinePlans.outputBindingsChecked++;
              routinePlans.outputBindingsMatched += Number(matched);
              if (routinePlans.outputBindings.length < routinePlans.detailLimit)
                routinePlans.outputBindings.push({
                  actorId,
                  planId: expected,
                  producedFoodId,
                  eatenFoodId,
                  matched,
                });
            }
            queuedRoutines.add(actorId);
          } else {
            routinePlans.stoppedCount++;
            if (longSoak) soakActors[actorId]!.stopped++;
            if (routinePlans.stopped.length < routinePlans.detailLimit)
              routinePlans.stopped.push({
                actorId,
                planId: expected,
                status: plan?.status ?? 'missing',
                code: plan?.steps.find((step) => step.status === 'blocked')?.outcome?.code,
                message: plan?.steps.find((step) => step.status === 'blocked')?.outcome?.message,
              });
          }
          continue;
        }
        const action = entityGet(game.service.world.entities, actorId)?.actor?.action?.id;
        if (priorActions.get(actorId) && !action) queuedRoutines.add(actorId);
        priorActions.set(actorId, action);
      }
      scheduleRoutines();
    });
    observeSoak();
    const startingLoad = loadavg();
    measureStart = start;
    // Initial connection/setup is not a measured publication interval.
    lastUpdate = start;
    gaps.length = warmGaps.length = spans.length = longGaps.length = 0;
    bytes = updates = 0;
    measuring = true;
    lossStart = start;
    lossMeasuring = true;
    if (collectNativeCounters) observeDomainCounters(nativeCounters);
    const before = performanceSnapshot();
    const applicationBefore = store.applicationStatistics;
    const growthSamples: ReturnType<typeof readGrowthSample>[] = [];
    let growthSamplesOmitted = 0,
      previousGrowthCpu = startingCpu,
      previousGrowthAt = start;
    function readGrowthSample(phase: 'start' | 'minute' | 'end') {
      const began = performance.now(),
        world = game.service.world;
      const entities = entityValues(world.entities);
      let liveItemLots = 0,
        retiredEntities = 0;
      for (const entity of entities) {
        if (entity.retirement) retiredEntities++;
        else if (entity.item) liveItemLots++;
      }
      const receiptKeys = world.commandReceipts.size;
      const cpu = process.cpuUsage(),
        memory = process.memoryUsage(),
        at = performance.now();
      const sample = {
        phase,
        atUnixMs: performance.timeOrigin + at,
        elapsedSeconds: (at - start) / 1000,
        gameSeconds: world.simTime - simStart,
        intervalSeconds: (at - previousGrowthAt) / 1000,
        cpuUserMs: (cpu.user - startingCpu.user) / 1000,
        cpuSystemMs: (cpu.system - startingCpu.system) / 1000,
        intervalCpuUserMs: (cpu.user - previousGrowthCpu.user) / 1000,
        intervalCpuSystemMs: (cpu.system - previousGrowthCpu.system) / 1000,
        heapUsedBytes: memory.heapUsed,
        rssBytes: memory.rss,
        residentEntities: entities.length,
        liveItemLots,
        retiredEntities,
        commandReceipts: receiptKeys,
        responseReceipts: Object.keys(world.responseReceipts ?? {}).length,
        residentOccurrences: Object.values(world.actionExperience.occurrences).reduce(
          (n, rows) => n + rows.length,
          0,
        ),
        admittedActionRecords: world.actionExperience.admitted,
        residentEvents: world.events.length,
        residentAwareness: Object.values(world.experience?.awareness ?? {}).reduce(
          (n, rows) => n + rows.length,
          0,
        ),
        residentMemories: Object.values(world.memories).reduce((n, rows) => n + rows.length, 0),
        pendingSimSeconds: (game.service as unknown as { debtSeconds: number }).debtSeconds,
        navigationBlocked: navigationBlocked(world),
        memoryPressure: !!game.service.memoryBacklog,
        queuedRoutineSelections: queuedRoutines.size,
        pendingRoutinePlans: pendingPlans.size,
        // Completion-accounted spans overlap; absent collection is not measured zero.
        operationTotals: appProfiling
          ? Object.fromEntries(
              [
                'native.step',
                'world.commit',
                'postgres.statement',
                'mutation.wait',
                'public.projection',
              ].map((stage) => {
                const sample = stageSamples.get(stage);
                return [stage, { count: sample?.count ?? 0, totalMs: sample?.totalMs ?? 0 }];
              }),
            )
          : null,
        residentPlansAccepted: Object.values(routines.accepted).reduce((n, count) => n + count, 0),
        matchedResidentMeals: routinePlans.outputBindingsMatched,
        sleepingResidents: longSoak
          ? routineActorIds.filter(
              (id) =>
                entityGet(world.entities, id)?.statusEffects?.[
                  longSoak.playerSurvival.sleepEffectId
                ]?.active,
            ).length
          : 0,
        entityEntriesVisited: entities.length,
        receiptKeysCounted: receiptKeys,
        samplingMs: 0,
      };
      previousGrowthCpu = cpu;
      previousGrowthAt = at;
      sample.samplingMs = performance.now() - began;
      return sample;
    }
    function captureGrowth(phase: 'start' | 'minute' | 'end') {
      const sample = readGrowthSample(phase);
      if (growthSamples.length < 32) growthSamples.push(sample);
      else {
        growthSamplesOmitted++;
        if (phase === 'end') growthSamples[31] = sample;
      }
      return sample;
    }
    if (longSoak) captureGrowth('start');
    let nextProgressAt = start + 60_000;
    probeTimer = setInterval(() => {
      if (probeBusy) return;
      probeBusy = true;
      const at = performance.now();
      probeTask = probe
        .query('SELECT 1')
        .then(() => {
          if (measuring) {
            const ms = performance.now() - at;
            probeTotals.count++;
            probeTotals.totalMs += ms;
            probeTotals.maxMs = Math.max(probeTotals.maxMs, ms);
            if (probeSamples.length < 4000) probeSamples.push(ms);
            if (longSoak && performance.now() >= nextProgressAt) {
              const elapsedSeconds = (performance.now() - start) / 1000;
              const gameSeconds = game.service.world.simTime - simStart;
              console.error(
                JSON.stringify({
                  progress: 'finite-long-soak',
                  growth: captureGrowth('minute'),
                  elapsedSeconds,
                  gameSeconds,
                  achievedSpeed: gameSeconds / elapsedSeconds / config.baseRatio,
                  npcPlansSelected: Object.values(routines.accepted).reduce(
                    (sum, count) => sum + count,
                    0,
                  ),
                  completedWorkCycles: Object.values(routinePlans.completed).reduce(
                    (sum, count) => sum + count,
                    0,
                  ),
                  participantsWithCompletedCycle: Object.keys(routinePlans.completed).length,
                  livingNpcPeople: routineActorIds.filter(
                    (id) => entityGet(game.service.world.entities, id)?.actor?.alive,
                  ).length,
                  sleepingNpcPeople: routineActorIds.filter(
                    (id) =>
                      entityGet(game.service.world.entities, id)?.statusEffects?.[
                        longSoak.playerSurvival.sleepEffectId
                      ]?.active,
                  ).length,
                  serviceAcceptedPlayerCommands: appProfiling
                    ? commandSamples.filter((sample) => sample.ok).length
                    : null,
                  refusals: routines.refused.length,
                  stoppedPlans: routinePlans.stoppedCount,
                  failures: failureCount,
                  admittedActionRecords: game.service.world.actionExperience.admitted,
                  paused: game.service.paused,
                  pauseReason: game.service.pauseReason,
                  probeCount: probeTotals.count,
                  probeMaximumMs: probeTotals.maxMs,
                }),
              );
              nextProgressAt = performance.now() + 60_000;
            }
          }
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
    if (profiler) {
      profiler.connect();
      if (collectCpu && cpuProfileWindow) {
        await profiler.post('Profiler.enable');
        cpuProfileWindow.startBeforeUs = Number(process.hrtime.bigint() / 1000n);
        await profiler.post('Profiler.start');
        cpuProfileWindow.startAfterUs = Number(process.hrtime.bigint() / 1000n);
      }
      if (collectAllocations && allocationProfileWindow) {
        await profiler.post('HeapProfiler.enable');
        allocationProfileWindow.startBeforeUs = Number(process.hrtime.bigint() / 1000n);
        await profiler.post('HeapProfiler.startSampling', allocationSampling);
        allocationProfileWindow.startAfterUs = Number(process.hrtime.bigint() / 1000n);
      }
    }
    const control = browserFixture
      ? { ok: true }
      : await post('/api/control', {
          paused: false,
          speed: profileSpeed,
          clientId: client,
          presenceSequence: 1,
        });
    if (!control.ok)
      throw new Error(
        'message' in control ? control.message : 'Could not resume profiling fixture.',
      );
    startPlayerDrivers?.();
    startRoutines();
    if (layer === 'pump')
      pumpTask = (async () => {
        let consideredAt = 0;
        while (measuring && performance.now() - start < seconds * 1000) {
          await game.service.tick(0.05, 0);
          if (!pumpThinking && performance.now() - consideredAt >= 50) {
            consideredAt = performance.now();
            pumpThinking = game.director
              .considerThought()
              .catch((error: unknown) => {
                if (error instanceof OverloadError) return;
                game.service.storageError =
                  'Background admission failed; simulation paused. Restart and reconcile storage.';
                game.service.notify();
              })
              .finally(() => {
                pumpThinking = undefined;
              });
          }
          await new Promise<void>((done) => setImmediate(done));
        }
      })().catch((error: unknown) => failed('explicit tick pump', error));
    console.error(`profile server ready: ${base}; PostgreSQL, ${seconds}s at ${profileSpeed}x`);
    await new Promise<void>((done) => setTimeout(done, seconds * 1000));
    clearInterval(commandTimer);
    clearInterval(presenceTimer);
    clearInterval(speechTimer);
    clearInterval(probeTimer);
    routinesActive = false;
    await Promise.all([commandTask, presenceTask, speechTask, routineTask, pumpTask]);
    await pumpThinking;
    observeSoak();
    if (longSoak) captureGrowth('end');
    const elapsedMs = performance.now() - start;
    const measurementEndedAtUnixMs = performance.timeOrigin + performance.now();
    if (cpuProfileWindow)
      cpuProfileWindow.measurementEndedUs = Number(process.hrtime.bigint() / 1000n);
    const usedCpu = process.cpuUsage(startingCpu);
    const simulatedSeconds = game.service.world.simTime - simStart;
    const after = performanceSnapshot();
    const applicationAfter = store.applicationStatistics;
    // Pause, GC and final inspection are cleanup, not gameplay publication stalls.
    measuring = false;
    lossMeasuring = false;
    profilingStage = 'reporting';
    if (collectNativeCounters) observeDomainCounters();
    if (collectCpu && profiler && cpuProfileWindow) {
      cpuProfileWindow.stopBeforeUs = Number(process.hrtime.bigint() / 1000n);
      const { profile } = await profiler.post('Profiler.stop');
      cpuProfileWindow.stopAfterUs = Number(process.hrtime.bigint() / 1000n);
      // V8 and process.hrtime can have different origins. The profile is wholly
      // inside measurement; sample attribution must use its own timestamp basis.
      cpuProfileWindow.profileStartedUs = profile.startTime;
      cpuProfileWindow.profileEndedUs = profile.endTime;
      await writeFile(resolve(output) + '.cpuprofile', JSON.stringify(profile), {
        flag: 'wx',
        mode: 0o600,
      });
    }
    if (collectAllocations && profiler && allocationProfileWindow) {
      allocationProfileWindow.stopBeforeUs = Number(process.hrtime.bigint() / 1000n);
      const { profile } = await profiler.post('HeapProfiler.stopSampling');
      allocationProfileWindow.stopAfterUs = Number(process.hrtime.bigint() / 1000n);
      await writeFile(resolve(output) + '.heapprofile', JSON.stringify(profile), {
        flag: 'wx',
        mode: 0o600,
      });
    }
    if (!browserFixture) await post('/api/control', { paused: true });
    if (recallPlans) {
      // Only the disposable fixture is paused for this postmeasurement diagnosis.
      if (browserFixture) await game.service.control({ paused: true });
      Object.assign(recallPlans, {
        grown: await captureRecallPlan('grown', game.service.world.id, slowestRecall),
        grownAnalyzed: await captureRecallPlan(
          'grown-analyzed',
          game.service.world.id,
          slowestRecall,
        ),
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
    const finalResponse = await toolHttp(base + '/api/state', {
      headers: { cookie, 'X-OL-Client': client },
    });
    if (!finalResponse.ok) throw new Error('Final scene inspection failed.');
    const finalView = (await finalResponse.json()) as GameView;
    const report = {
      node: process.version,
      sourceProvenance,
      host: { logicalCpus: availableParallelism(), startingLoad, endingLoad: loadavg() },
      cognition: cognitionFixture ? 'native-route-fixture' : 'spending-disabled',
      controller: browserFixture ? 'browser' : 'same-process-http',
      ...(layer
        ? {
            diagnosticLayer: layer,
            diagnosticScope:
              'Same candidate pattern of 1Hz alternating half-metre HTTP intentions; in-flight work skips offers, so accepted timelines can differ. Commands/skips report actual counts. Real SQL and authority. ' +
              (layer === 'pump'
                ? 'Pump submits fixed 0.05-real-second quanta without host suspension inference, changes background-admission frequency as small ticks finish, and omits host autosave scheduling. '
                : 'The ordinary host timer and autosave scheduling remain enabled. ') +
              'Removed consumers are diagnostic lower bounds, not capacity passes.',
          }
        : {}),
      purpose: layer
        ? 'layered-server-diagnostic'
        : memoryHistoryFixture
          ? 'memory-ui-correctness'
          : profileSpeed === 3
            ? 'three-times-capacity'
            : profileSpeed === 1
              ? 'normal-speed-capacity'
              : 'eight-times-capacity',
      fixture: {
        startupPreparationMs,
        standardOpening: standardFixture,
        ...(travelFixture ? { travel: { routes: travelRoutes, rehearsal: travelRehearsal } } : {}),
        expanded: expandedFixture,
        addedPopulation,
        buildings,
        routineResources,
        temporaryDataDirectory: directory,
        ...(longSoak ? { longSoak } : {}),
        ...(memoryHistory ? { memoryHistory } : {}),
      },
      measurementStartedAtUnixMs,
      measurementEndedAtUnixMs,
      startingSimTime: simStart,
      endingSimTime: simStart + simulatedSeconds,
      cpu: { userMs: usedCpu.user / 1000, systemMs: usedCpu.system / 1000 },
      cpuProfileWindow: cpuProfileWindow ?? null,
      ...(collectAllocations
        ? {
            allocationProfile: {
              options: allocationSampling,
              window: allocationProfileWindow,
              scope:
                'Sampled allocation in the main V8 isolate, including collected minor/major-GC objects; excludes native/WASM and other threads. Separate diagnostic run, not retained heap, leak or capacity evidence.',
            },
          }
        : {}),
      activity,
      ...(collectLostTime
        ? {
            lostTime: {
              ...lostTime,
              omitted: lostTime.observed - lostTime.events.length,
              scope:
                'First 20000 selected lane/tick/stage events requested within measurement; completion timestamps can cross cutoff. Stage spans overlap; native duration events below 1ms are omitted. Optional instrumentation adds overhead.',
            },
          }
        : {}),
      ...(collectNativeCounters ? { nativeCounters } : {}),
      ...(snapshotPath ? { busySnapshot: busySnapshot ?? null } : {}),
      ...(recallPlans ? { recallPlans } : {}),
      routines: {
        ...routines,
        ...(travel
          ? {
              travel: {
                scope:
                  'Verified old-route prefixes where the same native approach and replan count remain; displacement is a lower bound and unmatched moving transitions remain unknown. Arrival counts require an observed approach-to-work transition. Other routine/rest/output reporting remains below.',
                actors: travel.actors,
              },
            }
          : {}),
        ...(longSoak
          ? {
              soak: {
                growth: {
                  sampleLimit: 32,
                  samples: growthSamples,
                  samplesOmitted: growthSamplesOmitted,
                  scope:
                    'Start, completed-probe minute callbacks and cutoff; actual timestamps, no catch-up. Resident counts exclude cold canonical SQL history. Entity/receipt visit counts describe counting scans; samplingMs includes all synchronous sample readers but excludes console/report serialization. CPU is whole-process cumulative and since prior sample; natural heap/RSS, no forced collection. Debt/navigation are current host/domain reads; memory pressure and routine queues are not database indexing backlog. Background-save gauges remain in existing before/after metrics.',
                },
                sampling:
                  'Mode at each existing coherent publication; the interval since the preceding publication is attributed to that observed mode. Gather visits count starts observed in retained event publications; resource endpoints are authoritative. Inventory counts direct carried lots only. No extra sampling timer.',
                initialOfferValidation: soakValidation,
                actors: Object.fromEntries(
                  Object.entries(soakActors).map(([actorId, totals]) => [
                    actorId,
                    {
                      ...totals,
                      alive: entityGet(game.service.world.entities, actorId)?.actor?.alive === true,
                      participation:
                        entityGet(game.service.world.entities, actorId)?.actor?.participation
                          ?.phase ?? null,
                      finalInventory: soakInventory(game.service.world, actorId),
                    },
                  ]),
                ),
                resources: routineResources.map((resource) => ({
                  ...resource,
                  finalQuantity:
                    entityGet(game.service.world.entities, resource.id)?.resource?.quantity ?? null,
                  visits: Object.values(resourceVisits[resource.id] ?? {}).reduce(
                    (sum, count) => sum + count,
                    0,
                  ),
                  visitsByActor: resourceVisits[resource.id] ?? {},
                })),
                actionRecords: {
                  initialAdmitted: startingActionRecords,
                  admitted: game.service.world.actionExperience.admitted,
                  limit: ACTIVITY_LIMITS.retainedRecords,
                },
              },
            }
          : {}),
        ...(routinePlanFixture
          ? {
              plans: {
                ...routinePlans,
                outputExamplesOmitted:
                  routinePlans.outputBindingsChecked - routinePlans.outputBindings.length,
                stopExamplesOmitted: routinePlans.stoppedCount - routinePlans.stopped.length,
              },
            }
          : {}),
        finalActors: routineActorIds.map((actorId) => ({
          actorId,
          alive: entityGet(game.service.world.entities, actorId)?.actor?.alive === true,
          currentAction:
            entityGet(game.service.world.entities, actorId)?.actor?.action?.type ?? null,
          ...(routinePlanFixture
            ? {
                planStatus:
                  entityGet(game.service.world.entities, actorId)?.actor?.agency.plan?.status ??
                  null,
              }
            : {}),
          ...(!routinePlanFixture ? { nextPhase: routinePhases.get(actorId) } : {}),
        })),
      },
      clockChanges,
      adapter: 'postgres',
      sqlDelayMs,
      sqlWriteGroups: config.sqlWriteGroups,
      hostProbe: {
        ...probeTotals,
        retained: probeSamples.length,
        samplesOmitted: probeTotals.count - probeSamples.length,
        percentileScope:
          'First 4000 completed probes in the measured phase; count, total and maximum cover the whole phase.',
        p50Ms: percentile(probeSamples, 0.5),
        p95Ms: percentile(probeSamples, 0.95),
      },
      setupMs,
      elapsedMs,
      simulatedSeconds,
      achievedSpeed: simulatedSeconds / (elapsedMs / 1000) / 60,
      providerCalls,
      paidModelCalls: 0,
      previews: appProfiling
        ? Object.fromEntries([...previews].sort(([, a], [, b]) => b.ms - a.ms))
        : null,
      speech: { offered: speechOffered, accepted: speechAccepted, skipped: speechSkipped },
      failureCount,
      failures,
      ...(collectRejections ? { rejections } : {}),
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
      commandSkipped,
      serverCommands: appProfiling ? commandSamples : null,
      httpCommands: appProfiling ? httpCommands : null,
      httpCommandCapture: appProfiling
        ? {
            observed: httpCommandsObserved,
            omitted: httpCommandsObserved - httpCommands.length,
            scope:
              'First 4000 command dispatches begun within measurement, including queued refusals. Arrival precedes authentication/body reads; ownership begins at dispatch before the world queue. End precedes any outer HTTP error reply. Completion can cross cutoff.',
          }
        : null,
      presence: appProfiling ? presenceSamples : null,
      presenceSkipped,
      presenceDriver: browserFixture ? 'browser' : 'independent-five-second-http',
      presenceObservation: appProfiling
        ? 'HTTP-specific presence owner including fresh authority and any admission/reconciliation wait; excludes earlier HTTP authentication. Historical pre-PF16.40 reports began only at full setPresence reconciliation.'
        : 'Internal presence timing is disabled. The ordinary external presence heartbeat remains active.',
      commandP95Ms: percentile(
        commands.map((c) => c.ms),
        0.95,
      ),
      publication: {
        measured: !browserFixture && (!layer || layer === 'viewer'),
        updates,
        bytes,
        frames: publicationFrames,
        ...(appProfiling ? { sectionValueBytes: publicationSectionBytes } : {}),
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
      stages: appProfiling
        ? Object.fromEntries(
            [...stageSamples].map(([stage, sample]) => [
              stage,
              {
                count: sample.count,
                totalMs: sample.totalMs,
                maxMs: sample.maxMs,
                retained: sample.values.length,
                percentileScope: 'Last 2048 completions within this measured phase; spans overlap.',
                p50Ms: percentile(sample.values, 0.5),
                p95Ms: percentile(sample.values, 0.95),
                p99Ms: percentile(sample.values, 0.99),
              },
            ]),
          )
        : null,
      instrumentation,
      sqlScope:
        'Main-thread adapter statements only; accepted-batch worker SQL is reported separately.',
      journalApplication: {
        status: !appProfiling
          ? 'disabled'
          : applicationBefore === undefined && applicationAfter === undefined
            ? 'unavailable'
            : applicationBefore === undefined || applicationAfter === undefined
              ? 'missing'
              : 'collected',
        before: applicationBefore ?? null,
        after: applicationAfter ?? null,
        scope:
          'Cumulative completed worker-batch counters at measurement boundaries; batches can cross those boundaries. Unobserved batches leave SQL/time coverage incomplete. Whole-process CPU already includes worker threads.',
      },
      sql: appProfiling ? [...sql].sort((a, b) => b[1].ms - a[1].ms).slice(0, 30) : null,
      slowSql: appProfiling ? slowSql : null,
      commits: appProfiling ? commits : null,
      commitAttribution: appProfiling
        ? Object.fromEntries(
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
          )
        : null,
      commitAttributionSample: appProfiling
        ? {
            retained: commitSamples.length,
            scope:
              'First 4000 completed commits within this phase; commit totals include all commits.',
          }
        : null,
      slowCommits: appProfiling ? slowCommits : null,
      slowStages: appProfiling ? slowStages : null,
      longGaps,
    };
    await writeFile(resolve(output), JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
    reportWritten = true;
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
        serverCommands: undefined,
        httpCommands: undefined,
        slowStages: undefined,
        presence: undefined,
        stages: undefined,
      }),
    );
    if (checkpointExport) {
      profilingStage = 'checkpoint preservation';
      let pausedWorld: { id: string; simTime: number } | undefined;
      const began = performance.now(),
        sidecar = join(checkpointExport, 'preservation.json');
      const context = {
        startedAtUnixMs: performance.timeOrigin + began,
        measuredReport: resolve(output),
        measurementStartedAtUnixMs: report.measurementStartedAtUnixMs,
        measurementEndedAtUnixMs: report.measurementEndedAtUnixMs,
        measuredEndingSimTime: report.endingSimTime,
        sourceProvenance: report.sourceProvenance,
        scope:
          'Postmeasurement ordinary pause and full canonical checkpoint; excluded from performance results. Complete means integrity-verified export, not current-model restoration.',
      };
      try {
        await writeFile(sidecar, JSON.stringify({ ...context, status: 'incomplete' }, null, 2), {
          flag: 'wx',
          mode: 0o600,
        });
        const paused = await game.service.control({ paused: true });
        if (!paused.ok) throw new Error(`Checkpoint pause failed: ${paused.code}`);
        pausedWorld = { id: game.service.world.id, simTime: game.service.world.simTime };
        const worldId = pausedWorld.id,
          id = randomUUID(),
          target = join(checkpointExport, id);
        // Manual admission waits outside the world queue for an earlier autosave.
        await game.service.createSave('Performance checkpoint', id);
        await mkdir(target, { mode: 0o700 });
        for (const name of ['metadata.json', 'world.jsonl']) {
          const destination = join(target, name);
          await copyFile(
            join(config.dataDirectory, 'saves', id, name),
            destination,
            constants.COPYFILE_EXCL,
          );
          await chmod(destination, 0o600);
        }
        const copied = new SaveFiles(checkpointExport),
          metadata = await copied.metadata(id);
        if (!metadata) throw new Error('The copied checkpoint metadata is missing.');
        if (
          metadata.worldId !== pausedWorld.id ||
          metadata.kind !== 'manual' ||
          metadata.simTime !== pausedWorld.simTime ||
          metadata.revision === undefined ||
          metadata.format !== SAVE_FORMAT
        )
          throw new Error('The copied checkpoint does not identify the paused current world.');
        await copied.verify(metadata);
        await writeFile(
          sidecar,
          JSON.stringify(
            {
              ...context,
              status: 'complete',
              verification:
                'Checkpoint metadata/checksum/row counts verified; current-model restoration not run.',
              pausedWorld,
              endedAtUnixMs: Date.now(),
              elapsedMs: performance.now() - began,
              metadata,
              // Offline native checks must use the actual external grants; the
              // world checkpoint intentionally does not restore authorization.
              constructionPermissions: store.authority.constructionPermissions(worldId),
              checkpointExtraGameSeconds: metadata.simTime - report.endingSimTime,
            },
            null,
            2,
          ),
          { mode: 0o600 },
        );
      } catch (error) {
        process.exitCode = 1;
        await writeFile(
          sidecar,
          JSON.stringify(
            {
              ...context,
              status: 'incomplete',
              pausedWorld,
              endedAtUnixMs: Date.now(),
              elapsedMs: performance.now() - began,
              error: String(error).slice(0, 4000),
            },
            null,
            2,
          ),
          { mode: 0o600 },
        ).catch(() =>
          console.error('Checkpoint preservation failure metadata could not be written.'),
        );
        console.error(
          'Postmeasurement checkpoint preservation failed; original performance report retained.',
        );
      }
    }
  } finally {
    stopTrace?.();
    stopActivity?.();
    if (collectNativeCounters) observeDomainCounters();
    routinesActive = false;
    if (commandTimer) clearInterval(commandTimer);
    if (presenceTimer) clearInterval(presenceTimer);
    if (speechTimer) clearInterval(speechTimer);
    if (probeTimer) clearInterval(probeTimer);
    streamAbort.abort();
    try {
      await Promise.all([
        commandTask,
        presenceTask,
        speechTask,
        probeTask,
        streamTask,
        routineTask,
      ]);
    } finally {
      profiler?.disconnect();
    }
  }
} catch (error) {
  if (!reportWritten)
    await writeFile(
      resolve(output),
      JSON.stringify(
        {
          status: 'failed',
          stage: profilingStage,
          error: String(error),
          node: process.version,
          sourceProvenance: { startup: startupSource },
          database: disposable.details,
          temporaryDataDirectory: directory,
          controller: browserFixture ? 'browser' : 'same-process-http',
          expanded: expandedFixture,
          scriptedRoutines: routineFixture,
          memoryHistoryFixture,
          routineMode: routinePlanFixture ? 'native-five-step-plans' : 'separate-commands',
          ...(collectRejections ? { rejections } : {}),
          ...(collectLostTime ? { lostTime } : {}),
          paidModelCalls: 0,
          instrumentation,
        },
        null,
        2,
      ),
      { flag: 'wx', mode: 0o600 },
    ).catch(() => console.error('The failed profiling report could not be written.'));
  throw error;
} finally {
  lossMeasuring = false;
  if (collectLostTime) WorkLane.prototype.run = laneRun;
  if (collectRejections) CognitionMaintenance.prototype.tick = maintenanceTick;
  await probe.end().catch(() => {});
  try {
    await closeResources();
  } finally {
    try {
      await rm(directory, { recursive: true, force: true });
    } finally {
      capture?.stop();
    }
  }
}
