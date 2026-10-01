import {
  AuthorityRepository,
  type AuthorityFence,
  type AccountBinding,
  type RequestScope,
  type ControlRequest,
  type ExitAttempt,
  type BindingRequest,
} from './authority.js';
import {
  compactHistory,
  compactObjectHistory,
  compactAppraisalHistory,
  compactContributionHistory,
} from './history-residency.js';
import { MemoryRepository } from './memory-repository.js';
import { WorldRecords } from './world-records.js';
import { isDeepStrictEqual } from 'node:util';
import { randomUUID } from 'node:crypto';
import { readAttemptBudget, type AttemptBudgetSnapshot } from './attempt-budget.js';
import { WorldAgentStore } from './world-agent-store.js';
import { KnowledgeStore } from './knowledge-store.js';
import { upgradeWorldState } from './upgrade-world.js';
import { validateWorldModules } from '@open-legend/domain';
import { GameSaves, type RestoreSave } from './game-saves.js';
import { timed, timedSync } from './performance.js';
import { HistoryRepository } from './history.js';
import { prepareHistory } from './history-preparation.js';
import { insertRows } from './sql-rows.js';
import { IntegrationValues } from './integration-values.js';
import { CommandReceipts, type GameplayReceipt } from './command-receipts.js';
import { VectorStore } from './vector-store.js';
import type { GameView, IntelligenceCall } from '@open-legend/protocol';
import { join } from 'node:path';
import {
  appendedEventCount as provenAppendCount,
  appendedRecordCount,
  updateWorld,
  type WorldState,
} from '@open-legend/domain';
import type { AiReceipt } from '@open-legend/ai';
import type { AiJobView, PlayerProfile, PlayerPreferencePatch } from '@open-legend/protocol';

export interface DiagnosticAccess {
  accountId: string;
  actorIds: string[];
  allowUnscoped: boolean;
}
function diagnosticPredicate(access: DiagnosticAccess): { sql: string; params: string[] } {
  const ids = access.actorIds;
  return {
    sql: `((payload::jsonb #>> '{ownerAccountId}')=? OR ((payload::jsonb #>> '{ownerAccountId}') IS NULL AND (${ids.length ? `(payload::jsonb #>> '{actorId}') IN (${ids.map(() => '?').join(',')})` : '1=0'}${access.allowUnscoped ? " OR (payload::jsonb #>> '{actorId}') IS NULL" : ''})))`,
    params: [access.accountId, ...ids],
  };
}
import { digest } from './content-digest.js';
export { digest } from './content-digest.js';

export interface AttemptBudget {
  id: string;
  limitUsd: number;
}
export interface SqlDatabase {
  /** Undefined adapters cannot prove whether shared committed reads are safe. */
  readonly transactionActive?: boolean;
  checkpointSource?: import('./checkpoint-worker-client.js').CheckpointSource;
  transaction<T>(operation: () => Promise<T>): Promise<T>;
  readTransaction?<T>(operation: () => Promise<T>): Promise<T>;
  afterCommit?(callback: () => void): void;
  afterRollback?(callback: () => void): void;
  exec(sql: string): Promise<void>;
  prepare(sql: string): {
    get(...params: any[]): Promise<Record<string, unknown> | undefined>;
    all(...params: any[]): Promise<Record<string, unknown>[]>;
    run(...params: any[]): Promise<unknown>;
  };
  close(): Promise<void>;
}

export interface SavedWorld {
  world: WorldState;
  speed: number;
  manuallyPaused: boolean;
  milestones?: Record<string, boolean>;
  actorMilestones?: Record<string, Record<string, boolean>>;
}

export type WorldChange =
  | { op: 'set'; path: Array<string | number>; value: unknown }
  | {
      op: 'splice';
      path: Array<string | number>;
      index: number;
      deleteCount: number;
      values: unknown[];
    }
  | { op: 'remove'; path: Array<string | number> };
export interface WorldChanges {
  operations: WorldChange[];
}
export interface JobRecord extends AiJobView {
  authority?: RequestScope;
  responseReady?: boolean;
  diagnosticTrigger?: string;
  diagnosticTriggerType?: string;
  retryOf?: string;
  playerSpeechEventId?: string;
  triggerEvidenceId?: string;
  stimulusEvidenceIds?: string[];
  fingerprint: string;
  createdAt: number;
  request: {
    volume?: import('@open-legend/domain').SpeechVolume;
    text: string;
    action?: {
      mode: 'enqueue' | 'replace' | 'interrupt';
      targetId?: string;
      slots?: import('@open-legend/domain').IntentSlots;
      expectedPlan: number;
      targetEpisodes?: import('@open-legend/domain').ActionTargetEpisodes;
      timelineId: string;
    };
    npcId?: string;
    invention?: {
      mode?: 'workshop';
      episodeBudgetUsd?: number;
      candidate?: unknown;
      actorId: string;
      worldId: string;
      timelineId: string;
      conversationId?: string;
      authority: import('@open-legend/domain').InventionAuthority;
      rootId: string;
      depth: number;
      continuation?: import('@open-legend/protocol').InventionContinuation;
      previous?: {
        intent: string;
        feedback: string;
        candidate?: unknown;
      };
      base?: { recipeId: string; version: number; digest: string };
    };
  };
  invention?: {
    validation?: import('@open-legend/protocol').InventionValidationView;
    code: string;
    search?: import('@open-legend/protocol').InventionSearch;
    continuedBy?: string;
    candidateDigest?: string;
    candidate?: unknown;
    recipeId?: string;
  };
  result?: unknown;
  startedAt?: number;
  completedAt?: number;
  queueLatencyMs?: number;
  totalLatencyMs?: number;
}

const micro = (usd: number): number => Math.ceil(usd * 1_000_000);

function samePrimitive(left: unknown, right: unknown): boolean {
  return left === right || (Number.isNaN(left) && Number.isNaN(right));
}

function collectChanges(
  previous: unknown,
  next: unknown,
  path: Array<string | number>,
  operations: WorldChange[],
  appendEventCount?: number,
): void {
  if (samePrimitive(previous, next)) return;
  if (
    appendEventCount !== undefined &&
    path.length === 2 &&
    path[0] === 'world' &&
    path[1] === 'events' &&
    Array.isArray(previous) &&
    Array.isArray(next) &&
    next.length === previous.length + appendEventCount
  ) {
    // Draft-proven appends skip retained history; unknown or edited arrays use the diff.
    if (appendEventCount)
      operations.push({
        op: 'splice',
        path,
        index: previous.length,
        deleteCount: 0,
        values: next.slice(previous.length),
      });
    return;
  }
  if (
    previous === null ||
    next === null ||
    typeof previous !== 'object' ||
    typeof next !== 'object' ||
    Array.isArray(previous) !== Array.isArray(next)
  ) {
    operations.push({ op: 'set', path, value: structuredClone(next) });
    return;
  }
  if (Array.isArray(previous) && Array.isArray(next)) {
    const appended = appendedRecordCount(previous, next);
    if (appended !== undefined) {
      if (appended)
        operations.push({
          op: 'splice',
          path,
          index: previous.length,
          deleteCount: 0,
          values: next.slice(previous.length),
        });
      return;
    }

    if (previous.length !== next.length) {
      let start = 0;
      while (start < Math.min(previous.length, next.length) && previous[start] === next[start])
        start++;
      let end = 0;
      while (
        end < Math.min(previous.length, next.length) - start &&
        previous[previous.length - 1 - end] === next[next.length - 1 - end]
      )
        end++;
      operations.push({
        op: 'splice',
        path,
        index: start,
        deleteCount: previous.length - start - end,
        values: next.slice(start, next.length - end),
      });
      return;
    }
    const shared = Math.min(previous.length, next.length);
    for (let index = 0; index < shared; index++)
      collectChanges(previous[index], next[index], [...path, index], operations, appendEventCount);
    for (let index = shared; index < next.length; index++)
      operations.push({ op: 'set', path: [...path, index], value: structuredClone(next[index]) });
    if (previous.length !== next.length)
      operations.push({ op: 'set', path: [...path, 'length'], value: next.length });
    return;
  }
  const before = previous as Record<string, unknown>;
  const after = next as Record<string, unknown>;
  for (const key of Object.keys(before))
    if (!Object.hasOwn(after, key)) operations.push({ op: 'remove', path: [...path, key] });
  for (const [key, value] of Object.entries(after))
    if (value === undefined) {
      if (before[key] !== undefined) operations.push({ op: 'remove', path: [...path, key] });
    } else if (!Object.hasOwn(before, key))
      operations.push({ op: 'set', path: [...path, key], value: structuredClone(value) });
    else collectChanges(before[key], value, [...path, key], operations, appendEventCount);
}

export function diffSavedWorld(
  previous: SavedWorld | null,
  next: SavedWorld,
  _legacyAppendEventCount?: number,
): WorldChanges {
  if (!previous) return { operations: [{ op: 'set', path: [], value: structuredClone(next) }] };
  const operations: WorldChange[] = [];
  // A caller hint cannot certify an unchanged prefix; domain draft lineage can.
  collectChanges(
    previous,
    next,
    [],
    operations,
    provenAppendCount(previous.world.events, next.world.events),
  );
  return { operations };
}

export function applyWorldChanges(state: SavedWorld, changes: WorldChanges): SavedWorld {
  let result: unknown = structuredClone(state);
  if (!Array.isArray(changes.operations)) throw new Error('Invalid world journal operations.');
  for (const change of changes.operations) {
    if (
      !['set', 'remove', 'splice'].includes(change.op) ||
      !Array.isArray(change.path) ||
      change.path.some(
        (key) =>
          (typeof key !== 'string' && (!Number.isSafeInteger(key) || key < 0)) ||
          ['__proto__', 'prototype', 'constructor'].includes(String(key)),
      )
    )
      throw new Error('Invalid world journal operation/path.');
    if (change.op === 'splice') {
      let target: any = result;
      for (const key of change.path) {
        if (!target || typeof target !== 'object' || !Object.hasOwn(target, key))
          throw new Error('Missing journal splice parent.');
        target = target[key];
      }
      if (!Array.isArray(target)) throw new Error('Journal splice requires an array.');
      if (
        !Number.isSafeInteger(change.index) ||
        !Number.isSafeInteger(change.deleteCount) ||
        change.index < 0 ||
        change.deleteCount < 0 ||
        change.index > target.length ||
        change.index + change.deleteCount > target.length ||
        !Array.isArray(change.values)
      )
        throw new Error('Invalid journal splice bounds.');
      target.splice(change.index, change.deleteCount, ...structuredClone(change.values));
      continue;
    }
    if (!change.path.length) {
      if (change.op === 'remove') throw new Error('A world journal cannot remove its root.');
      result = structuredClone(change.value);
      continue;
    }
    let parent = result as Record<string | number, unknown>;
    for (const key of change.path.slice(0, -1)) {
      const child = parent[key];
      if (!child || typeof child !== 'object')
        throw new Error('World journal references a missing parent.');
      parent = child as Record<string | number, unknown>;
    }
    const key = change.path.at(-1)!;
    if (change.op === 'remove') delete parent[key];
    else parent[key] = structuredClone(change.value);
  }
  return result as SavedWorld;
}

/** Record changes prepared for one exact baseline and expected revision. Preparation assigns
 * canonical list/map positions that history release then reuses, so it must precede release.
 * docs/projects/ordered-async-saves.md#ordering-rules */
export interface PreparedCommit {
  readonly baseline: SavedWorld | null;
  readonly revision: number;
  readonly state: SavedWorld;
  readonly changes: ReturnType<WorldRecords['prepare']>;
  readonly history?: ReturnType<typeof prepareHistory>;
}

/** Replaceable persistence boundary for committed world state. */
export interface WorldStore {
  load(active?: boolean): Promise<{ revision: number; state: SavedWorld } | null>;
  commit(
    expectedRevision: number,
    state: SavedWorld,
    invalidatedMemoryIds?: Record<string, string[]>,
    appendEventCount?: number,
    historyProjection?: {
      before?: WorldState;
      after: WorldState;
      receipt?: GameplayReceipt;
      restore?: RestoreSave;
      authority?: AuthorityFence;
      authorityBindings?: readonly AccountBinding[];
      authorityOwners?: ReadonlyMap<string, string>;
      bindingChange?: { scope: RequestScope; request: BindingRequest; now: () => number };
      controlChange?: { scope: RequestScope; request: ControlRequest; now: () => number };
      participationChange?: { actorId: string; attempt: ExitAttempt | null };
      prepared?: PreparedCommit;
    },
  ): Promise<number>;
  close(): Promise<void>;
}

export interface GameRepository extends WorldStore {
  readonly ready: Promise<void>;
  releaseHistory?(state: SavedWorld): SavedWorld;
  /** Same residency compaction as releaseHistory, without changing the durable baseline. */
  releasedHistory?(state: SavedWorld): SavedWorld;
  prepareCommit?(
    expectedRevision: number,
    state: SavedWorld,
    history: { before?: WorldState; after: WorldState },
  ): PreparedCommit;
  adoptHistory?(original: SavedWorld, prepared: SavedWorld): void;
  hydrateHistory?(
    state: SavedWorld,
    actorIds?: string[],
    sourceIds?: string[],
  ): Promise<SavedWorld>;
  history?: HistoryRepository;
  saves?: GameSaves;
  commands?: CommandReceipts;
  authority?: AuthorityRepository;
  vectors?: VectorStore;
  records?: WorldRecords;
  memories?: MemoryRepository;
  readonly persistence?: 'postgres';
  putIntelligenceCall(call: IntelligenceCall): Promise<void>;
  putIntelligenceCalls?(calls: IntelligenceCall[]): Promise<void>;
  intelligenceCalls(offset: number, access?: DiagnosticAccess): Promise<IntelligenceCall[]>;
  intelligenceCall(id: string): Promise<IntelligenceCall | undefined>;
  diagnosticRoots(
    offset: number,
    filters: Record<string, string>,
    access?: DiagnosticAccess,
  ): Promise<IntelligenceCall[]>;
  diagnosticStages(parentIds: string[], details?: boolean): Promise<IntelligenceCall[]>;
  getIntegration(key: string): Promise<unknown>;
  putIntegration(key: string, value: unknown): Promise<void>;
  getProfile(id: string): Promise<PlayerProfile>;
  setPreferences(id: string, preferences: PlayerPreferencePatch): Promise<PlayerProfile>;
  getJob(id: string): Promise<JobRecord | undefined>;
  getSpeechJob(eventId: string): Promise<JobRecord | undefined>;
  getSpeechJobs(eventIds: string[]): Promise<Map<string, JobRecord>>;
  putJob(job: JobRecord): Promise<void>;
  claimInventionContinuation(job: JobRecord, parentId: string): Promise<boolean>;
  recentJobs(limit?: number): Promise<JobRecord[]>;
  inventionJobs(
    worldId: string,
    actorId: string,
    before?: { createdAt: number; id: string },
    selection?: { timelineId: string; limit?: number },
  ): Promise<JobRecord[]>;
  reserve(
    id: string,
    provider: 'jev' | 'openai' | 'macrofold',
    amountUsd: number,
    ceilingUsd: number,
    actorId?: string,
    reuse?: 'compute-allocation',
    budget?: AttemptBudget,
  ): Promise<boolean>;
  attemptBudget(budgetId: string): Promise<AttemptBudgetSnapshot>;
  attemptReceipt(id: string): Promise<AiReceipt | undefined>;
  settle(id: string, receipt: AiReceipt): Promise<void>;
  recoverInterruptedWork(): Promise<void>;
  usage(ceilingUsd: number, actorId?: string): Promise<Pick<GameView['ai'], 'budget' | 'usage'>>;
}

/**
 * PostgreSQL game repository.
 * World snapshots and command receipts commit together. Paid attempts live outside the
 * simulated timeline, so reopening a save cannot repeat or erase provider usage.
 */
export class SqlGameRepository implements GameRepository {
  readonly commands: CommandReceipts;
  readonly authority: AuthorityRepository;
  readonly db: SqlDatabase;
  readonly records: WorldRecords;
  readonly memories: MemoryRepository;
  private readonly integrationValues: IntegrationValues;
  private acceptedRevision = -1;
  private acceptedState: SavedWorld | null = null;
  /** Set when a commit rolled back after replacing the baseline. The live world may have
   * released history since, so reloading a complete baseline and diffing against it could
   * delete evicted rows; only an explicit load (restart) may continue. */
  private baselineLost = false;
  private intelligenceWrites = 0;
  vectors?: VectorStore;
  get persistence() {
    return 'postgres' as const;
  }

  async intelligenceCall(id: string): Promise<IntelligenceCall | undefined> {
    await this.ready;

    const row = await this.db
      .prepare('SELECT payload FROM intelligence_calls WHERE id = ?')
      .get(id);
    return row ? (JSON.parse(String(row['payload'])) as IntelligenceCall) : undefined;
  }
  async putIntelligenceCall(call: IntelligenceCall): Promise<void> {
    await this.putIntelligenceCalls([call]);
  }
  async putIntelligenceCalls(calls: IntelligenceCall[]): Promise<void> {
    await this.ready;
    if (!calls.length) return;
    await insertRows(
      this.db,
      'intelligence_calls (id, started_at, payload)',
      calls.map((call) => [call.id, call.startedAt, JSON.stringify(call)]),
      'ON CONFLICT(id) DO UPDATE SET payload = excluded.payload',
    );
    // Diagnostic retention is approximate between periodic pruning passes.
    const previous = this.intelligenceWrites;
    this.intelligenceWrites += calls.length;
    if (Math.floor(previous / 25) !== Math.floor(this.intelligenceWrites / 25))
      await this.db.exec(
        'DELETE FROM intelligence_calls WHERE id IN (SELECT id FROM intelligence_calls ORDER BY started_at DESC, id DESC LIMIT 1000000 OFFSET 1000)',
      );
  }
  async intelligenceCalls(offset: number, access?: DiagnosticAccess): Promise<IntelligenceCall[]> {
    await this.ready;
    const permitted = access ? diagnosticPredicate(access) : undefined;
    const roots = permitted
      ? `SELECT id FROM intelligence_calls WHERE (payload::jsonb #>> '{parentId}') IS NULL AND ${permitted.sql}`
      : '';
    const filter = permitted
      ? ` WHERE id IN (${roots}) OR (payload::jsonb #>> '{parentId}') IN (${roots})`
      : '';
    const rows = await this.db
      .prepare(
        `SELECT payload FROM intelligence_calls${filter} ORDER BY started_at DESC,id DESC LIMIT 25 OFFSET ?`,
      )
      .all(...(permitted ? [...permitted.params, ...permitted.params] : []), offset);
    return rows.map((row) => JSON.parse(String(row['payload'])) as IntelligenceCall);
  }

  async diagnosticRoots(
    offset: number,
    filters: Record<string, string>,
    access?: DiagnosticAccess,
  ): Promise<IntelligenceCall[]> {
    await this.ready;

    const clauses = ["(payload::jsonb #>> '{parentId}') IS NULL"];
    const params: unknown[] = [];
    if (access) {
      const permitted = diagnosticPredicate(access);
      clauses.push(permitted.sql);
      params.push(...permitted.params);
    }
    const fields: Record<string, string> = {
      actor: 'actorName',
      route: 'route',
    };
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      if (key === 'search') {
        clauses.push('LOWER(payload) LIKE LOWER(?)');
        params.push(`%${value}%`);
      } else if (key === 'from' || key === 'to') {
        clauses.push(`started_at ${key === 'from' ? '>=' : '<='} ?`);
        params.push(value);
      } else if (key === 'stage') {
        clauses.push(
          "id IN (SELECT (payload::jsonb #>> '{parentId}') FROM intelligence_calls WHERE LOWER((payload::jsonb #>> '{kind}')) LIKE LOWER(?))",
        );
        params.push(`%${value}%`);
      } else if (key === 'outcome') {
        // Panel outcome labels (Failed, Canceled) cover both the root status and its finer
        // disposition, such as `refused` or `cancelled`.
        const term = `%${value.replace(/canceled/i, 'cancel')}%`;
        clauses.push(
          "(LOWER((payload::jsonb ->> 'disposition')) LIKE LOWER(?) OR LOWER((payload::jsonb ->> 'status')) LIKE LOWER(?))",
        );
        params.push(term, term);
      } else if (fields[key]) {
        clauses.push(`LOWER((payload::jsonb ->> '${fields[key]}')) LIKE LOWER(?)`);
        params.push(`%${value}%`);
      }
    }
    return (
      await this.db
        .prepare(
          `SELECT payload FROM intelligence_calls WHERE ${clauses.join(' AND ')} ORDER BY started_at DESC,id DESC LIMIT 26 OFFSET ?`,
        )
        .all(...params, offset)
    ).map((row) => JSON.parse(String(row['payload'])) as IntelligenceCall);
  }
  async diagnosticStages(parentIds: string[], details = false): Promise<IntelligenceCall[]> {
    await this.ready;

    if (!parentIds.length) return [];
    const fields = details
      ? 'payload'
      : `id,started_at,(payload::jsonb #>> '{parentId}') AS parent_id,(payload::jsonb #>> '{kind}') AS kind,(payload::jsonb #>> '{status}') AS status,(payload::jsonb #>> '{output,receipt}') AS receipt,(payload::jsonb #>> '{input,proposed,operations}') AS proposed_operations,(payload::jsonb #>> '{output,value,operations}') AS response_operations,CASE WHEN (payload::jsonb #>> '{kind}') = 'Action context' THEN (payload::jsonb #>> '{output}') END AS action_options,(payload::jsonb #>> '{output,reason}') AS reason,(payload::jsonb #>> '{output,error}') AS error,(payload::jsonb #>> '{output,message}') AS message`;
    const rows = await this.db
      .prepare(
        `SELECT ${fields} FROM intelligence_calls WHERE (payload::jsonb #>> '{parentId}') IN (${parentIds.map(() => '?').join(',')}) ORDER BY started_at,id LIMIT 1000`,
      )
      .all(...parentIds);
    return rows.map((row) =>
      details
        ? (JSON.parse(String(row['payload'])) as IntelligenceCall)
        : {
            id: String(row['id']),
            parentId: String(row['parent_id']),
            kind: String(row['kind']),
            startedAt: String(row['started_at']),
            status: String(row['status']) as IntelligenceCall['status'],
            input: row['proposed_operations']
              ? { proposed: { operations: JSON.parse(String(row['proposed_operations'])) } }
              : null,
            output: row['action_options']
              ? JSON.parse(String(row['action_options']))
              : {
                  ...(row['receipt'] ? { receipt: JSON.parse(String(row['receipt'])) } : {}),
                  ...(row['response_operations']
                    ? { value: { operations: JSON.parse(String(row['response_operations'])) } }
                    : {}),
                  reason: row['reason'],
                  error: row['error'],
                  message: row['message'],
                },
            exchanges: [],
          },
    );
  }

  readonly history: HistoryRepository;
  readonly saves: GameSaves;
  constructor(dataDirectory: string, database: SqlDatabase) {
    this.db = database;
    this.integrationValues = new IntegrationValues(this.db);
    this.records = new WorldRecords(this.db);
    this.memories = new MemoryRepository(this.db);
    this.history = new HistoryRepository(this.db);
    this.saves = new GameSaves(this.db, join(dataDirectory, 'saves'), database.checkpointSource);
    this.commands = new CommandReceipts(this.db);
    this.authority = new AuthorityRepository(this.db);
    this.ready = this.initialize();
  }

  readonly ready: Promise<void>;
  private async initialize() {
    await this.db.transaction(async () => {
      // Reject old layouts before any table/index initialization can modify them.
      // AGENTS.md#development-save-policy: no conversion, reset or deletion.
      const existing = await this.db
        .prepare("SELECT to_regclass('open_legend.meta') AS relation")
        .get();
      if (existing?.['relation']) {
        const version = await this.db.prepare('SELECT value FROM meta WHERE key=?').get('schema');
        if (version?.['value'] !== '2')
          throw new Error(
            'Unsupported database schema. Existing data was not converted or deleted.',
          );
      }
      if (
        !existing?.['relation'] &&
        (await this.db
          .prepare(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='open_legend' LIMIT 1",
          )
          .get())
      )
        throw new Error('Database schema marker is missing. Existing data was not changed.');
      const schema = `
      CREATE TABLE IF NOT EXISTS world (
        id BIGINT PRIMARY KEY CHECK (id = 1), revision BIGINT NOT NULL, payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS world_journal (
        revision BIGINT PRIMARY KEY, payload TEXT NOT NULL, created_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, payload TEXT NOT NULL, created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS jobs_inventor ON jobs ((payload::jsonb #>> '{request,invention,worldId}'), (payload::jsonb #>> '{request,invention,actorId}'), created_at, id);
      CREATE INDEX IF NOT EXISTS jobs_speech_event ON jobs ((payload::jsonb #>> '{playerSpeechEventId}')) WHERE (payload::jsonb #>> '{kind}') = 'chat';
      CREATE INDEX IF NOT EXISTS jobs_inventor_timeline ON jobs ((payload::jsonb #>> '{request,invention,worldId}'), (payload::jsonb #>> '{request,invention,actorId}'), (payload::jsonb #>> '{request,invention,timelineId}'), created_at, id);
      CREATE INDEX IF NOT EXISTS jobs_unfinished ON jobs(id) WHERE (payload::jsonb #>> '{status}') IN ('queued','judging','generating');
      CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY, provider TEXT NOT NULL, status TEXT NOT NULL,
        reserved BIGINT NOT NULL CHECK (reserved >= 0), spent BIGINT NOT NULL DEFAULT 0 CHECK (spent >= 0),
        receipt TEXT, created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS attempts_created ON attempts(created_at,id);
      CREATE TABLE IF NOT EXISTS attempt_scopes (attempt_id TEXT PRIMARY KEY, actor_id TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS attempt_budgets (attempt_id TEXT PRIMARY KEY, budget_id TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS attempt_budget_scope ON attempt_budgets(budget_id, attempt_id);
      CREATE INDEX IF NOT EXISTS attempt_actor ON attempt_scopes(actor_id,attempt_id);
      CREATE TABLE IF NOT EXISTS intelligence_calls (id TEXT PRIMARY KEY, started_at TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS intelligence_calls_time ON intelligence_calls(started_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS intelligence_calls_parent_time ON intelligence_calls((payload::jsonb #>> '{parentId}'), started_at DESC, id DESC);
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS player_profiles (
        id TEXT PRIMARY KEY, revision BIGINT NOT NULL,
        show_unavailable_actions BIGINT NOT NULL CHECK (show_unavailable_actions IN (0, 1)),
        pause_when_hidden BIGINT NOT NULL DEFAULT 1 CHECK (pause_when_hidden IN (0, 1))
      );
    `;
      await this.db.exec(schema);
      await this.db.exec(
        `CREATE TABLE IF NOT EXISTS mind.inner_world (world_id TEXT NOT NULL, actor_id TEXT NOT NULL, revision BIGINT NOT NULL, text TEXT NOT NULL, source_snapshot TEXT NOT NULL, publication_job_id TEXT NOT NULL, PRIMARY KEY(world_id,actor_id))`,
      );

      this.vectors = new VectorStore(this.db);
      await this.vectors.initialize();

      await new KnowledgeStore(this.db).initialize();
      await this.records.initialize();
      await this.memories.initialize();
      await new WorldAgentStore(this.db).initialize();
      await this.history.initialize();
      await this.saves.initialize();
      await this.commands.initialize();
      await this.authority.initialize();
      await this.db
        .prepare('INSERT INTO meta VALUES (?, ?) ON CONFLICT(key) DO NOTHING')
        .run('schema', '2');
    });
  }

  releaseHistory(state: SavedWorld): SavedWorld {
    if (state !== this.acceptedState)
      throw new Error('Only committed history may leave the working set.');
    const released = this.releasedHistory(state);
    this.acceptedState = released;
    return released;
  }
  releasedHistory(state: SavedWorld): SavedWorld {
    return {
      ...state,
      world: compactContributionHistory(
        compactAppraisalHistory(compactObjectHistory(compactHistory(state.world))),
      ),
    };
  }
  /** Preparation half of a snapshot's commit, computed immediately inside the mutation queue
   * (no I/O); the transaction consumes it later, for example in a background save. */
  prepareCommit(
    expectedRevision: number,
    state: SavedWorld,
    history: { before?: WorldState; after: WorldState },
  ): PreparedCommit {
    if (this.acceptedRevision !== expectedRevision)
      throw new Error('Save conflict: the committed baseline changed before preparation.');
    const baseline = this.acceptedState;
    return {
      baseline,
      revision: expectedRevision,
      state,
      changes: timedSync('persistence.prepareRecords', () =>
        this.records.prepare(baseline ?? undefined, state),
      ),
      history: this.prepareHistoryWrite(state, history.before ?? baseline?.world, history.after),
    };
  }
  // The world writer owns this immutable candidate. Do not eagerly encode a second full burst;
  // prepare lookup inputs here, then stream bounded rows within the atomic transaction.
  private prepareHistoryWrite(
    state: SavedWorld,
    historyBefore: WorldState | undefined,
    historyAfter: WorldState,
    restore = false,
  ) {
    return this.readyHistoryWorlds.has(state.world.id) &&
      !restore &&
      Object.isFrozen(historyAfter) &&
      (!historyBefore || Object.isFrozen(historyBefore))
      ? prepareHistory(
          historyBefore,
          historyAfter,
          historyBefore ? provenAppendCount(historyBefore.events, historyAfter.events) : undefined,
        )
      : undefined;
  }
  adoptHistory(original: SavedWorld, prepared: SavedWorld): void {
    if (original !== this.acceptedState || original.world.id !== prepared.world.id)
      throw new Error('Prepared history no longer matches the committed world.');
    this.acceptedState = prepared;
  }
  async hydrateHistory(
    state: SavedWorld,
    actorIds?: string[],
    sourceIds?: string[],
  ): Promise<SavedWorld> {
    if (state !== this.acceptedState) throw new Error('Flush before materializing history.');
    const full = await this.records.withHistory(state, actorIds, sourceIds);
    this.acceptedState = full;
    return full;
  }
  async load(active = false): Promise<{ revision: number; state: SavedWorld } | null> {
    await this.ready;
    // An explicit load re-derives its caller's world from SQL; a lost baseline no longer matters.
    this.baselineLost = false;

    const canonical = await this.records.load(active);
    if (canonical) {
      const state = {
        ...canonical.state,
        world: updateWorld(canonical.state.world, upgradeWorldState),
      };
      validateWorldModules(state.world);
      if (
        (await (active
          ? this.history.retainedEventCount(state.world.id)
          : this.history.auditEventCount(state.world.id))) !==
        (state.world.archivedEventCount ?? 0) + state.world.events.length
      )
        throw new Error(
          'Archived history coverage disagrees with the records; restore the complete database.',
        );
      this.acceptedState = canonical.state;
      this.acceptedRevision = canonical.revision;
      return { revision: canonical.revision, state };
    }
    const row = await this.db.prepare('SELECT revision, payload FROM world WHERE id = 1').get();
    if (!row) {
      this.acceptedState = null;
      this.acceptedRevision = 0;
      return null;
    }
    let state = JSON.parse(String(row['payload'])) as SavedWorld;
    let revision = Number(row['revision']);
    const journal = await this.db
      .prepare('SELECT revision,payload FROM world_journal WHERE revision > ? ORDER BY revision')
      .all(revision);
    for (const entry of journal) {
      const next = Number(entry['revision']);
      if (next !== revision + 1)
        throw new Error('World journal is incomplete; refusing partial recovery.');
      state = applyWorldChanges(state, JSON.parse(String(entry['payload'])) as WorldChanges);
      revision = next;
    }
    const head = await this.getIntegration('world-journal-head');
    if (head !== undefined && head !== null && Number(head) !== revision)
      throw new Error('World journal head mismatch; refusing incomplete recovery.');
    // Diff against the persisted shape so startup commits the upgrade, not just its later edits.
    // docs/save-and-load.md#active-development-policy
    const acceptedState = structuredClone(state);
    upgradeWorldState(state.world);
    validateWorldModules(state.world);
    if (
      (await (active
        ? this.history.retainedEventCount(state.world.id)
        : this.history.auditEventCount(state.world.id))) !==
      (state.world.archivedEventCount ?? 0) + state.world.events.length
    )
      throw new Error(
        'Archived history coverage disagrees with the save; restore the complete database.',
      );
    if (state.world.schemaVersion >= 2) {
      const rows = await this.db
        .prepare('SELECT actor_id,revision,text FROM mind.inner_world WHERE world_id=?')
        .all(state.world.id);
      for (const [actorId, inner] of Object.entries(state.world.innerWorlds ?? {})) {
        const accepted = rows.find((row) => row['actor_id'] === actorId);
        if (
          !accepted ||
          Number(accepted['revision']) !== inner.revision ||
          accepted['text'] !== inner.text
        )
          throw new Error(
            'Accepted inner-world snapshot disagrees with its world commit; restore/reconcile before starting.',
          );
      }
    }
    if (state.world.actorKnowledge) await new KnowledgeStore(this.db).verify(acceptedState.world);
    // Extract in place and compare the complete reconstructed value before retiring
    // the old writable document. A failure rolls back every record and keeps the save.
    await this.db.transaction(async () => {
      await this.db
        .prepare('INSERT INTO world_head VALUES (1,?,?,?)')
        .run(acceptedState.world.id, revision, randomUUID());
      const records = this.records.prepare(undefined, acceptedState);
      await this.history.project(undefined, acceptedState.world);
      const memoryChanges = await this.memories.project(acceptedState.world.id, revision, records);
      await this.records.write(acceptedState.world.id, revision, records);
      await this.memories.reconcile(acceptedState.world.id, memoryChanges);
      const recovered = await this.records.load();
      if (
        !recovered ||
        !isDeepStrictEqual(recovered.state, JSON.parse(JSON.stringify(acceptedState)))
      )
        throw new Error(
          'Record migration did not preserve the complete world; migration rolled back.',
        );
      await this.db.exec(
        'DELETE FROM world_journal; DELETE FROM world; DELETE FROM knowledge_documents',
      );
      await this.db.exec('DELETE FROM mind.inner_world');
      await this.db.prepare('DELETE FROM meta WHERE key=?').run('integration:world-journal-head');
    });
    this.acceptedState = acceptedState;
    this.acceptedRevision = revision;
    return { revision, state };
  }

  private readonly readyHistoryWorlds = new Set<string>();
  async commit(
    expectedRevision: number,
    state: SavedWorld,
    invalidatedMemoryIds?: Record<string, string[]>,
    appendEventCount?: number,
    historyProjection?: {
      before?: WorldState;
      after: WorldState;
      receipt?: GameplayReceipt;
      restore?: RestoreSave;
      authority?: AuthorityFence;
      authorityBindings?: readonly AccountBinding[];
      authorityOwners?: ReadonlyMap<string, string>;
      bindingChange?: { scope: RequestScope; request: BindingRequest; now: () => number };
      controlChange?: { scope: RequestScope; request: ControlRequest; now: () => number };
      participationChange?: { actorId: string; attempt: ExitAttempt | null };
      prepared?: PreparedCommit;
    },
  ): Promise<number> {
    await this.ready;

    if (this.acceptedRevision !== expectedRevision) {
      if (this.baselineLost)
        throw new Error(
          'The committed baseline is unknown after a failed save; restart to reload it.',
        );
      const persisted = await this.load();
      if ((persisted?.revision ?? 0) !== expectedRevision)
        throw new Error('Save conflict: another writer changed this world.');
    }
    // A restore diffs against the complete stored world. If it fails before its rollback hook
    // runs (refused admission, a fence failure), the released baseline must come back: a later
    // commit diffing the released live world against the complete one would delete cold rows.
    const releasedBaseline = this.acceptedState;
    const restoreBaseline = historyProjection?.restore
      ? ((await this.records.load())?.state ?? null)
      : undefined;
    if (historyProjection?.restore) this.acceptedState = restoreBaseline ?? null;
    const prepared = historyProjection?.prepared;
    // A prepared change set is valid only against the exact baseline it was diffed from.
    if (
      prepared &&
      (prepared.state !== state ||
        prepared.revision !== expectedRevision ||
        prepared.baseline !== this.acceptedState ||
        this.acceptedRevision !== expectedRevision ||
        historyProjection?.restore)
    )
      throw new Error('Prepared world changes no longer match the committed baseline.');
    appendEventCount = this.acceptedState
      ? provenAppendCount(this.acceptedState.world.events, state.world.events)
      : undefined;
    const changes =
      prepared?.changes ??
      timedSync('persistence.prepareRecords', () =>
        this.records.prepare(this.acceptedState ?? undefined, state),
      );
    const publish = () => {
      this.readyHistoryWorlds.add(state.world.id);
      this.records.needsHotPrune = false;
      this.history.committed();
      this.memories.committed(changes, !!historyProjection?.restore);
    };
    let publicationDeferred = false;
    const preparedHistory = prepared
      ? prepared.history
      : this.prepareHistoryWrite(
          state,
          historyProjection?.before ?? this.acceptedState?.world,
          historyProjection?.after ?? state.world,
          !!historyProjection?.restore,
        );
    const transaction = timed('persistence.transaction', () =>
      this.db.transaction(async () => {
        for (const binding of historyProjection?.authorityBindings ?? [])
          await this.authority.provision(state.world.id, binding);
        for (const [actorId, accountId] of historyProjection?.authorityOwners ?? [])
          await this.authority.retainActorOwner(state.world.id, actorId, accountId);
        if (historyProjection?.authority)
          await this.authority.assertFence(historyProjection.authority);
        if (historyProjection?.bindingChange) {
          const { scope, request, now } = historyProjection.bindingChange;
          await this.authority.rebind(scope, request, now);
        }
        if (historyProjection?.controlChange) {
          const { scope, request, now } = historyProjection.controlChange;
          await this.authority.changeControl(scope, request, now);
        }
        if (historyProjection?.participationChange) {
          const { actorId, attempt } = historyProjection.participationChange;
          await this.authority.saveExit(state.world.id, actorId, attempt);
        }
        const revision = await this.records.advance(
          state.world.id,
          expectedRevision,
          !!historyProjection?.restore,
        );
        if (historyProjection?.restore) {
          if (!this.acceptedState) throw new Error('No active world to replace.');
          this.integrationValues.clear();
          this.db.afterCommit?.(() => this.integrationValues.clear());
          this.db.afterRollback?.(() => this.integrationValues.clear());
          await this.saves.install(this.acceptedState, historyProjection.restore);
          await this.memories.invalidateConversationCompactions(state.world.id);
        }
        if (historyProjection?.receipt)
          await this.commands.save(state.world.id, historyProjection.receipt);
        const ledgerKey = `forget-ledger:${state.world.id}`;
        const forgettingChanged =
          this.acceptedRevision !== expectedRevision ||
          this.acceptedState?.world.experience?.forgotten !== state.world.experience?.forgotten;
        const ledger = (
          forgettingChanged ? ((await this.getIntegration(ledgerKey)) ?? {}) : {}
        ) as Record<string, string[]>;
        for (const [actorId, ids] of Object.entries(ledger))
          if (ids.some((id) => !state.world.experience?.forgotten[actorId]?.includes(id)))
            throw new Error(
              'Restore would resurrect forgotten evidence; reapply the current forgetting ledger first.',
            );
        if (
          state.world.experience &&
          this.acceptedState?.world.experience?.forgotten !== state.world.experience.forgotten
        )
          await this.putIntegration(ledgerKey, state.world.experience.forgotten);
        const invalidations: Record<string, string[]> = structuredClone(invalidatedMemoryIds ?? {});
        for (const [actorId, records] of Object.entries(state.world.memories)) {
          const prior = this.acceptedState?.world.memories[actorId];
          if (!prior || appendedRecordCount(prior, records) !== undefined) continue;
          const current = new Map(records.map((m) => [m.id, m]));
          const ids = prior
            .filter(
              (m) =>
                !current.has(m.id) ||
                (current.get(m.id) !== m &&
                  JSON.stringify(current.get(m.id)) !== JSON.stringify(m)),
            )
            .map((m) => m.id);
          if (ids.length)
            invalidations[actorId] = [...new Set([...(invalidations[actorId] ?? []), ...ids])];
        }
        for (const [actorId, ids] of Object.entries(invalidations)) {
          await this.vectors?.invalidate(`vectors:${state.world.id}:${actorId}`, ids);
          await this.putIntegration(`vectors:${state.world.id}:${actorId}`, null);
          await this.putIntegration(`interests:${state.world.id}:${actorId}`, null);
        }
        const historyKey = `history-schema:${state.world.id}`;
        const historyReady =
          this.readyHistoryWorlds.has(state.world.id) || (await this.getIntegration(historyKey));
        await timed('history.project', () =>
          this.history.project(
            historyReady ? (historyProjection?.before ?? this.acceptedState?.world) : undefined,
            historyProjection?.after ?? state.world,
            historyReady
              ? provenAppendCount(
                  (historyProjection?.before ?? this.acceptedState?.world)?.events ?? [],
                  (historyProjection?.after ?? state.world).events,
                )
              : undefined,
            !!historyProjection?.restore,
            preparedHistory,
          ),
        );
        if (!historyReady) await this.putIntegration(historyKey, 1);
        const outcomes = new Map<
          string,
          { ok: boolean; message: string; code: string; recipeId?: string }
        >();
        for (const [id, receipt] of Object.entries(state.world.responseReceipts ?? {}))
          if (receipt !== this.acceptedState?.world.responseReceipts?.[id] && receipt.outcome)
            outcomes.set(id, receipt.outcome);
        for (const [id, receipt] of Object.entries(state.world.declarationReceipts))
          if (receipt !== this.acceptedState?.world.declarationReceipts[id])
            outcomes.set(id, {
              ok: true,
              code: 'admitted',
              message: 'Definition admitted.',
              recipeId: receipt.recipeId,
            });
        for (const [actorId, inner] of Object.entries(state.world.innerWorlds ?? {}))
          if (
            inner.publicationJobId &&
            inner.publicationJobId !==
              this.acceptedState?.world.innerWorlds?.[actorId]?.publicationJobId
          )
            outcomes.set(inner.publicationJobId, {
              ok: true,
              code: 'snapshot-published',
              message: 'Inner world published.',
            });
        for (const [id, result] of historyProjection?.restore ? [] : outcomes) {
          const job = await this.getJob(id);
          if (job)
            await this.putJob({
              ...job,
              status: result.ok ? 'completed' : 'failed',
              message: result.message,
              result,
              ...(job.invention && result.recipeId
                ? { invention: { ...job.invention, code: 'admitted', recipeId: result.recipeId } }
                : {}),
              completedAt: Date.now(),
            });
        }
        const memoryChanges = await this.memories.project(
          state.world.id,
          revision,
          changes,
          !historyProjection?.restore,
        );
        await this.records.write(state.world.id, revision, changes);
        if (Object.values(this.acceptedState?.world.appraisals ?? {}).some(Array.isArray))
          await this.putIntegration(`appraisal-identity-conversion:${state.world.id}`, {
            sourceRevision: expectedRevision,
            revision,
            sourceChecksum: digest(this.acceptedState!.world.appraisals),
            resultChecksum: digest(state.world.appraisals),
            coverage:
              'Only retained legacy appraisals; strongest-16 losses cannot be reconstructed.',
          });
        if (this.records.needsHotPrune) await this.records.pruneActiveEvents(state);
        await this.memories.reconcile(state.world.id, memoryChanges);
        if (historyProjection?.restore || !this.acceptedState)
          await this.memories.reuseVectors(state.world.id);
        else {
          const revisedSources = new Map<string, Set<string>>();
          for (const table of ['mind_memories', 'mind_awareness', 'mind_summaries'])
            for (const row of changes.writes.get(table) ?? []) {
              if (row.create) continue;
              const path = JSON.parse(row.id) as string[],
                actor = path[table === 'mind_memories' ? 2 : 3]!;
              const ids = revisedSources.get(actor) ?? new Set<string>();
              const source = JSON.parse(row.payload) as Record<string, unknown>;
              ids.add(String(source[table === 'mind_awareness' ? 'eventId' : 'id']));
              revisedSources.set(actor, ids);
            }
          if (revisedSources.size) await this.memories.reuseVectors(state.world.id, revisedSources);
        }
        // Nested importer/restore transactions may still roll back after this call.
        // Keep their tentative baseline, but publish only after the outer COMMIT.
        this.db.afterRollback?.(() => {
          this.acceptedRevision = -1;
          this.acceptedState = null;
          this.baselineLost = true;
          this.readyHistoryWorlds.clear();
        });
        this.acceptedRevision = revision;
        this.acceptedState = state;
        if (this.db.afterCommit) {
          this.db.afterCommit(publish);
          publicationDeferred = true;
        }
        return revision;
      }),
    );
    let revision: number;
    try {
      revision = await transaction;
    } catch (error) {
      if (historyProjection?.restore && this.acceptedState === restoreBaseline)
        this.acceptedState = releasedBaseline;
      throw error;
    }
    if (!publicationDeferred) publish();
    return revision;
  }

  /** UI preferences live outside world snapshots, so restoring a world cannot rewind them. */
  async getProfile(id: string): Promise<PlayerProfile> {
    await this.ready;

    const row = await this.db.prepare('SELECT * FROM player_profiles WHERE id = ?').get(id);
    const reveal = (await this.getIntegration(`world-reveal:${id}`)) as Partial<
      PlayerProfile['preferences']
    > | null;
    return {
      id,
      revision: row ? Number(row['revision']) : 0,
      preferences: {
        revealMode: reveal?.revealMode ?? 'nearby',
        revealRadius: reveal?.revealRadius ?? 6,
        revealStrength: reveal?.revealStrength ?? 0.7,
        showUnavailableActions: Number(row?.['show_unavailable_actions']) === 1,
        pauseWhenHidden: row ? Number(row['pause_when_hidden']) === 1 : true,
        narratorVoice: ((await this.getIntegration(`narrator-voice:${id}`)) ?? 'restrained') as
          | 'restrained'
          | 'lyrical'
          | 'wry',
      },
    };
  }

  async setPreferences(id: string, preferences: PlayerPreferencePatch): Promise<PlayerProfile> {
    await this.ready;
    return this.db.transaction(async () => {
      const unavailable =
        preferences.showUnavailableActions === undefined
          ? null
          : Number(preferences.showUnavailableActions);
      const pause =
        preferences.pauseWhenHidden === undefined ? null : Number(preferences.pauseWhenHidden);
      await this.db
        .prepare(
          `INSERT INTO player_profiles (id, revision, show_unavailable_actions, pause_when_hidden)
      VALUES (?, 1, COALESCE(?, 0), COALESCE(?, 1))
      ON CONFLICT(id) DO UPDATE SET revision=player_profiles.revision+1,
      show_unavailable_actions=COALESCE(?, player_profiles.show_unavailable_actions),
      pause_when_hidden=COALESCE(?, player_profiles.pause_when_hidden)`,
        )
        .run(id, unavailable, pause, unavailable, pause);
      if (
        preferences.revealMode !== undefined ||
        preferences.revealRadius !== undefined ||
        preferences.revealStrength !== undefined
      ) {
        const existing = ((await this.getIntegration(`world-reveal:${id}`)) ?? {}) as Record<
          string,
          unknown
        >;
        // Merge only this UI control's fields inside the profile transaction; world restores cannot rewind them.
        for (const key of ['revealMode', 'revealRadius', 'revealStrength'] as const)
          if (preferences[key] !== undefined) existing[key] = preferences[key];
        await this.putIntegration(`world-reveal:${id}`, existing);
      }
      if (preferences.narratorVoice)
        await this.putIntegration(`narrator-voice:${id}`, preferences.narratorVoice);
      return await this.getProfile(id);
    });
  }

  async getJob(id: string): Promise<JobRecord | undefined> {
    await this.ready;

    const row = await this.db.prepare('SELECT payload FROM jobs WHERE id = ?').get(id);
    return row ? (JSON.parse(String(row['payload'])) as JobRecord) : undefined;
  }

  async getSpeechJob(eventId: string): Promise<JobRecord | undefined> {
    return (await this.getSpeechJobs([eventId])).get(eventId);
  }

  async getSpeechJobs(eventIds: string[]): Promise<Map<string, JobRecord>> {
    await this.ready;
    const ids = [...new Set(eventIds)];
    const jobs = new Map<string, JobRecord>();
    if (!ids.length) return jobs;
    const rows = await this.db
      .prepare(
        `SELECT payload FROM jobs WHERE (payload::jsonb #>> '{playerSpeechEventId}') IN (${ids.map(() => '?').join(',')}) AND (payload::jsonb #>> '{kind}') = 'chat' ORDER BY created_at DESC, id DESC`,
      )
      .all(...ids);
    for (const row of rows) {
      const job = JSON.parse(String(row['payload'])) as JobRecord;
      if (job.playerSpeechEventId && !jobs.has(job.playerSpeechEventId))
        jobs.set(job.playerSpeechEventId, job);
    }
    return jobs;
  }

  async putJob(job: JobRecord): Promise<void> {
    await this.ready;
    const status = "jobs.payload::jsonb ->> 'status'";
    // Check identity and preserve completed work in the same statement that writes it;
    // a separate read costs a round trip and races concurrent completions.
    const written = await this.db
      .prepare(
        `INSERT INTO jobs VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload=
          CASE WHEN ${status}='completed' AND ?<>'completed' THEN jobs.payload ELSE excluded.payload END
          WHERE jobs.fingerprint=excluded.fingerprint RETURNING fingerprint`,
      )
      .get(job.id, job.fingerprint, JSON.stringify(job), job.createdAt, job.status);
    if (!written) throw new Error('A request ID cannot be reused with different input.');
  }

  async claimInventionContinuation(job: JobRecord, parentId: string): Promise<boolean> {
    await this.ready;
    // Claim and child are one durable write; a lost response cannot buy two follow-ups.
    // docs/architecture.md#shared-invention-workflow
    return this.db.transaction(async () => {
      const parent = await this.getJob(parentId);
      if (!parent?.invention || parent.invention.continuedBy) return false;
      parent.invention.continuedBy = job.id;
      await this.putJob(parent);
      await this.putJob(job);
      return true;
    });
  }

  async inventionJobs(
    worldId: string,
    actorId: string,
    before = { createdAt: Number.MAX_SAFE_INTEGER, id: '\uffff' },
    selection?: { timelineId: string; limit?: number },
  ): Promise<JobRecord[]> {
    await this.ready;
    const limit = selection?.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50)
      throw new Error('Invention history limit must be between 1 and 50.');
    // Filter before paging: abandoned timelines must not hide current actor feedback.
    // docs/architecture.md#bounded-invention-history-and-recovery
    const timeline = selection
      ? " AND (payload::jsonb #>> '{request,invention,timelineId}') = ?"
      : '';
    return (
      await this.db
        .prepare(
          `SELECT payload FROM jobs WHERE (payload::jsonb #>> '{request,invention,worldId}') = ? AND (payload::jsonb #>> '{request,invention,actorId}') = ?${timeline} AND (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT ?`,
        )
        .all(
          worldId,
          actorId,
          ...(selection ? [selection.timelineId] : []),
          before.createdAt,
          before.id,
          limit,
        )
    ).map((row) => JSON.parse(String(row['payload'])) as JobRecord);
  }

  async recentJobs(limit = 12): Promise<JobRecord[]> {
    await this.ready;

    return (
      await this.db
        .prepare('SELECT payload FROM jobs ORDER BY created_at DESC, id DESC LIMIT ?')
        .all(limit)
    ).map((row) => JSON.parse(String(row['payload'])) as JobRecord);
  }

  async getIntegration(key: string): Promise<unknown> {
    await this.ready;
    return this.integrationValues.get(key);
  }
  async putIntegration(key: string, value: unknown): Promise<void> {
    await this.ready;

    await this.integrationValues.put(key, value);
  }

  async attemptBudget(budgetId: string): Promise<AttemptBudgetSnapshot> {
    await this.ready;
    return readAttemptBudget(this.db, budgetId);
  }

  async reserve(
    id: string,
    provider: 'jev' | 'openai' | 'macrofold',
    amountUsd: number,
    ceilingUsd: number,
    actorId = 'world-agent',
    reuse?: 'compute-allocation',
    budget?: AttemptBudget,
  ): Promise<boolean> {
    await this.ready;

    if (
      !Number.isFinite(amountUsd) ||
      amountUsd <= 0 ||
      !Number.isFinite(ceilingUsd) ||
      ceilingUsd < 0 ||
      !actorId ||
      actorId.length > 160
    )
      throw new Error('Invalid spending reservation.');
    const monthStart = new Date();
    const start = Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), 1);
    const accepted = await this.db.transaction(async () => {
      const existing = await this.db
        .prepare('SELECT provider,reserved FROM attempts WHERE id = ?')
        .get(id);
      // Resume the same allocation after a crash, never authorize another model dispatch.
      // docs/architecture.md#macrofold-worker-ownership
      if (
        existing &&
        reuse === 'compute-allocation' &&
        provider === 'macrofold' &&
        id.startsWith('macrofold-worker:') &&
        id.endsWith(':compute') &&
        existing['provider'] === provider &&
        Number(existing['reserved']) === micro(amountUsd)
      )
        return true;
      if (existing) throw new Error('Attempt already admitted; do not dispatch it again.');
      const row = await this.db
        .prepare(
          "SELECT COALESCE(SUM(spent + CASE WHEN status = 'reserved' THEN reserved ELSE 0 END), 0) AS total FROM attempts a LEFT JOIN attempt_scopes s ON s.attempt_id=a.id WHERE a.created_at>=? AND (s.actor_id=? OR s.actor_id IS NULL)",
        )
        .get(start, actorId);
      const amount = micro(amountUsd);
      // This is an additional cap over the same attempt ledger, not another wallet.
      // docs/architecture.md#invention-workshop-tools
      if (budget) {
        if (
          !budget.id ||
          budget.id.length > 500 ||
          !Number.isFinite(budget.limitUsd) ||
          budget.limitUsd < 0
        )
          throw new Error('Invalid episode spending scope.');
        const exposure = await this.db
          .prepare(
            "SELECT COALESCE(SUM(a.spent + CASE WHEN a.status = 'reserved' THEN a.reserved ELSE 0 END), 0) AS total FROM attempt_budgets b JOIN attempts a ON a.id=b.attempt_id WHERE b.budget_id=?",
          )
          .get(budget.id);
        if (Number(exposure?.['total'] ?? 0) + amount > micro(budget.limitUsd)) return false;
      }
      if (Number(row?.['total'] ?? 0) + amount > micro(Math.min(50, ceilingUsd))) {
        return false;
      }
      await this.db
        .prepare(
          "INSERT INTO attempts (id,provider,status,reserved,created_at) VALUES (?,?,'reserved',?,?)",
        )
        .run(id, provider, amount, Date.now());
      await this.db.prepare('INSERT INTO attempt_scopes VALUES (?,?)').run(id, actorId);
      if (budget)
        await this.db.prepare('INSERT INTO attempt_budgets VALUES (?,?)').run(id, budget.id);
      return true;
    });
    if (accepted) this.usageCache = undefined;
    return accepted;
  }

  async attemptReceipt(id: string): Promise<AiReceipt | undefined> {
    await this.ready;
    const row = await this.db.prepare('SELECT receipt FROM attempts WHERE id = ?').get(id);
    return row?.['receipt'] ? (JSON.parse(String(row['receipt'])) as AiReceipt) : undefined;
  }

  async settle(id: string, receipt: AiReceipt): Promise<void> {
    await this.ready;
    await this.db.transaction(async () => {
      const row = await this.db
        .prepare('SELECT status,reserved,receipt FROM attempts WHERE id = ?')
        .get(id);
      if (!row) return;
      if (row['status'] === 'settled') {
        // Older saves marked unpriced successful calls settled. Their conservative
        // reserve may still be replaced by a definitive late billing receipt.
        const prior = row['receipt']
          ? (JSON.parse(String(row['receipt'])) as AiReceipt)
          : undefined;
        if (!prior?.dispatched || prior.estimatedCostUsd !== undefined) return;
      }
      if (row['status'] === 'uncertain' && receipt.completionUncertain) return;
      const reserve = Number(row['reserved']);
      const estimated = receipt.estimatedCostUsd;
      // Missing/ambiguous provider evidence conservatively consumes the reservation.
      const spent = !receipt.dispatched
        ? 0
        : receipt.completionUncertain || estimated === undefined
          ? reserve
          : micro(estimated);
      await this.db
        .prepare(
          "UPDATE attempts SET status=?,spent=?,receipt=? WHERE id=? AND status IN ('reserved','uncertain','settled')",
        )
        .run(
          receipt.dispatched && (receipt.completionUncertain || estimated === undefined)
            ? 'uncertain'
            : 'settled',
          spent,
          JSON.stringify(receipt),
          id,
        );
    });
    this.usageCache = undefined;
  }

  /** A restart never resends an admitted call whose external outcome is unknown. */
  async recoverInterruptedWork(): Promise<void> {
    await this.ready;

    await this.db.exec(
      "UPDATE attempts SET status='uncertain', spent=reserved WHERE status='reserved'",
    );
    this.usageCache = undefined;
    // The partial index contains only unfinished work; retained history never enters memory.
    // docs/architecture.md#bounded-invention-history-and-recovery
    for (;;) {
      const rows = await this.db
        .prepare(
          "SELECT payload FROM jobs WHERE (payload::jsonb #>> '{status}') IN ('queued','judging','generating') ORDER BY id LIMIT 50",
        )
        .all();
      if (!rows.length) break;
      for (const row of rows) {
        const job = JSON.parse(String(row['payload'])) as JobRecord;
        if (['queued', 'judging', 'generating'].includes(job.status)) {
          const uncertain =
            job.invention &&
            (await this.db
              .prepare(
                "SELECT id FROM attempts WHERE status='uncertain' AND (id IN (?, ?) OR substr(id, 1, ?) = ? OR substr(id, 1, ?) = ?) LIMIT 1",
              )
              .get(
                `${job.id}:route`,
                `${job.id}:generate`,
                `${job.id}:invention-search:`.length,
                `${job.id}:invention-search:`,
                `${job.id}:workshop:`.length,
                `${job.id}:workshop:`,
              ));
          await this.putJob({
            ...job,
            status: 'stale',
            ...(job.invention
              ? { invention: { ...job.invention, code: uncertain ? 'uncertain' : 'interrupted' } }
              : {}),
            message: uncertain
              ? 'Interrupted with uncertain provider completion; spending remains reserved and no request was replayed.'
              : 'Interrupted by restart; no paid request or world effect was repeated.',
          });
        }
      }
    }
  }

  private usageCache?: {
    period: string;
    ceiling: number;
    value: ReturnType<SqlGameRepository['readUsage']>;
  };

  async usage(ceilingUsd: number, actorId?: string) {
    if (actorId) return this.readUsage(ceilingUsd, actorId);
    const period = new Date().toISOString().slice(0, 7);
    let cached = this.usageCache;
    if (!cached || cached.period !== period || cached.ceiling !== ceilingUsd) {
      // Display-only totals change with accounting writes, not movement or job progress.
      // Budget admission still queries the ledger: docs/performance.md#browser-and-provider-polling.
      cached = { period, ceiling: ceilingUsd, value: this.readUsage(ceilingUsd) };
      this.usageCache = cached;
    }
    try {
      return structuredClone(await cached.value);
    } catch (error) {
      if (this.usageCache === cached) this.usageCache = undefined;
      throw error;
    }
  }

  private async readUsage(ceilingUsd: number, actorId?: string) {
    await this.ready;

    const rows = await this.db
      .prepare(
        "SELECT a.provider,a.status,a.reserved,a.spent,a.receipt,COALESCE(s.actor_id,'legacy') AS actor_id FROM attempts a LEFT JOIN attempt_scopes s ON s.attempt_id=a.id WHERE a.created_at>=?" +
          (actorId ? ' AND s.actor_id=?' : ''),
      )
      .all(
        Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
        ...(actorId ? [actorId] : []),
      );
    const accounts: Record<string, { spentUsd: number; reservedUsd: number }> = {};
    let spent = 0,
      reserved = 0,
      jevCalls = 0,
      llmCalls = 0,
      inputTokens = 0,
      outputTokens = 0,
      lastLatencyMs = 0;
    for (const row of rows) {
      const account = (accounts[String(row['actor_id'])] ??= { spentUsd: 0, reservedUsd: 0 });
      account.spentUsd += Number(row['spent']) / 1e6;
      if (row['status'] === 'reserved') account.reservedUsd += Number(row['reserved']) / 1e6;
      spent += Number(row['spent']);
      if (row['status'] === 'reserved') reserved += Number(row['reserved']);
      if (row['receipt']) {
        const receipt = JSON.parse(String(row['receipt'])) as AiReceipt;
        if (receipt.dispatched) {
          if (row['provider'] === 'jev') jevCalls++;
          else if (row['provider'] === 'openai') llmCalls++;
        }
        inputTokens += receipt.usage?.inputTokens ?? 0;
        outputTokens += receipt.usage?.outputTokens ?? 0;
        lastLatencyMs = receipt.latencyMs;
      }
    }
    return {
      budget: {
        limitUsd: ceilingUsd,
        period: new Date().toISOString().slice(0, 7),
        perAgent: true,
        accounts,
        spentUsd: spent / 1e6,
        reservedUsd: reserved / 1e6,
        estimated: true,
      },
      usage: { jevCalls, llmCalls, inputTokens, outputTokens, lastLatencyMs },
    };
  }

  async close(): Promise<void> {
    await this.ready.catch(() => undefined);
    try {
      await this.saves.close();
    } finally {
      await this.db.close();
    }
  }
}
