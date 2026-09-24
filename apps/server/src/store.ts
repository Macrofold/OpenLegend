import { KnowledgeStore } from './knowledge-store.js';
import { validateKnowledge } from '@open-legend/domain';
import { upgradeWorldState } from './upgrade-world.js';
import { validateWorldModules } from '@open-legend/domain';
import { GameSaves, type RestoreSave } from './game-saves.js';
import { timed, timedSync } from './performance.js';
import { HistoryRepository } from './history.js';
import { CommandReceipts, type GameplayReceipt } from './command-receipts.js';
import { VectorStore } from './vector-store.js';
import type { IntelligenceCall } from '@open-legend/protocol';
import { SqliteDatabase } from './sqlite-database.js';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { appendedEventCount as provenAppendCount, type WorldState } from '@open-legend/domain';
import type { AiReceipt } from '@open-legend/ai';
import type { AiJobView, PlayerProfile, PlayerPreferencePatch } from '@open-legend/protocol';

export interface SqlDatabase {
  dialect?: 'postgres';
  transaction<T>(operation: () => Promise<T>): Promise<T>;
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
  diagnosticTrigger?: string;
  diagnosticTriggerType?: string;
  retryOf?: string;
  playerSpeechEventId?: string;
  triggerEvidenceId?: string;
  stimulusEvidenceIds?: string[];
  fingerprint: string;
  createdAt: number;
  request: {
    text: string;
    npcId?: string;
    invention?: {
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
    code: string;
    search?: import('@open-legend/protocol').InventionSearch;
    continuedBy?: string;
    candidateDigest?: string;
    candidate?: import('@open-legend/domain').DeclarationDraft;
    recipeId?: string;
  };
  result?: unknown;
  startedAt?: number;
  completedAt?: number;
  queueLatencyMs?: number;
  totalLatencyMs?: number;
}

const micro = (usd: number): number => Math.ceil(usd * 1_000_000);
export const digest = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

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

/** Replaceable persistence boundary; SQLite is intentionally a single-process MVP adapter. */
export interface WorldStore {
  load(): Promise<{ revision: number; state: SavedWorld } | null>;
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
    },
  ): Promise<number>;
  close(): Promise<void>;
}

export interface GameRepository extends WorldStore {
  readonly ready: Promise<void>;
  history?: HistoryRepository;
  saves?: GameSaves;
  commands?: CommandReceipts;
  vectors?: VectorStore;
  readonly persistence?: 'postgres' | 'sqlite';
  putIntelligenceCall(call: IntelligenceCall): Promise<void>;
  intelligenceCalls(offset: number): Promise<IntelligenceCall[]>;
  intelligenceCall(id: string): Promise<IntelligenceCall | undefined>;
  diagnosticRoots(offset: number, filters: Record<string, string>): Promise<IntelligenceCall[]>;
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
  ): Promise<JobRecord[]>;
  reserve(
    id: string,
    provider: 'jev' | 'openai' | 'macrofold',
    amountUsd: number,
    ceilingUsd: number,
    actorId?: string,
    reuse?: 'compute-allocation',
  ): Promise<boolean>;
  settle(id: string, receipt: AiReceipt): Promise<void>;
  recoverInterruptedWork(): Promise<void>;
  usage(ceilingUsd: number): Promise<{
    budget: { limitUsd: number; spentUsd: number; reservedUsd: number; estimated: boolean };
    usage: {
      jevCalls: number;
      llmCalls: number;
      inputTokens: number;
      outputTokens: number;
      lastLatencyMs: number;
    };
  }>;
}

/**
 * World snapshots and command receipts commit together. Paid attempts live outside the
 * simulated timeline, so reopening a save cannot repeat or erase provider usage.
 */
export class SqliteStore implements GameRepository {
  readonly commands: CommandReceipts;
  readonly db: SqlDatabase;
  private acceptedRows = new Map<string, string>();
  private acceptedRevision = -1;
  private acceptedState: SavedWorld | null = null;
  private intelligenceWrites = 0;
  vectors?: VectorStore;
  get persistence() {
    return this.db.dialect === 'postgres' ? ('postgres' as const) : ('sqlite' as const);
  }

  async intelligenceCall(id: string): Promise<IntelligenceCall | undefined> {
    await this.ready;

    const row = await this.db
      .prepare('SELECT payload FROM intelligence_calls WHERE id = ?')
      .get(id);
    return row ? (JSON.parse(String(row['payload'])) as IntelligenceCall) : undefined;
  }
  async putIntelligenceCall(call: IntelligenceCall): Promise<void> {
    await this.ready;

    await this.db
      .prepare(
        'INSERT INTO intelligence_calls (id, started_at, payload) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload',
      )
      .run(call.id, call.startedAt, JSON.stringify(call));
    // Diagnostic retention is approximate between periodic pruning passes.
    if (++this.intelligenceWrites % 25 === 0)
      await this.db.exec(
        'DELETE FROM intelligence_calls WHERE id IN (SELECT id FROM intelligence_calls ORDER BY started_at DESC, id DESC LIMIT 1000000 OFFSET 1000)',
      );
  }
  async intelligenceCalls(offset: number): Promise<IntelligenceCall[]> {
    await this.ready;

    return (
      await this.db
        .prepare(
          'SELECT payload FROM intelligence_calls ORDER BY started_at DESC, id DESC LIMIT 25 OFFSET ?',
        )
        .all(offset)
    ).map((row) => JSON.parse(String(row['payload'])) as IntelligenceCall);
  }

  async diagnosticRoots(
    offset: number,
    filters: Record<string, string>,
  ): Promise<IntelligenceCall[]> {
    await this.ready;

    const clauses = ["json_extract(payload, '$.parentId') IS NULL"];
    const params: unknown[] = [];
    const fields: Record<string, string> = {
      actor: 'actorName',
      route: 'route',
      outcome: 'disposition',
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
          "id IN (SELECT json_extract(payload, '$.parentId') FROM intelligence_calls WHERE LOWER(json_extract(payload, '$.kind')) LIKE LOWER(?))",
        );
        params.push(`%${value}%`);
      } else if (fields[key]) {
        clauses.push(`LOWER(json_extract(payload, '$.${fields[key]}')) LIKE LOWER(?)`);
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
      : `id,started_at,json_extract(payload, '$.parentId') AS parent_id,json_extract(payload, '$.kind') AS kind,json_extract(payload, '$.status') AS status,json_extract(payload, '$.output.receipt') AS receipt,json_extract(payload, '$.input.proposed.operations') AS proposed_operations,json_extract(payload, '$.output.value.operations') AS response_operations,CASE WHEN json_extract(payload, '$.kind') = 'Action context' THEN json_extract(payload, '$.output') END AS action_options,json_extract(payload, '$.output.reason') AS reason,json_extract(payload, '$.output.error') AS error,json_extract(payload, '$.output.message') AS message`;
    const rows = await this.db
      .prepare(
        `SELECT ${fields} FROM intelligence_calls WHERE json_extract(payload, '$.parentId') IN (${parentIds.map(() => '?').join(',')}) ORDER BY started_at,id LIMIT 1000`,
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
  constructor(path: string, database?: SqlDatabase) {
    if (!database && path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = database ?? new SqliteDatabase(path);
    this.history = new HistoryRepository(this.db);
    this.saves = new GameSaves(this.db, join(dirname(path), 'saves'));
    this.commands = new CommandReceipts(this.db);
    this.ready = this.initialize(!!database);
  }

  readonly ready: Promise<void>;
  private async initialize(database: boolean) {
    const schema = `
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 3000;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS world (
        id INTEGER PRIMARY KEY CHECK (id = 1), revision INTEGER NOT NULL, payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS world_journal (
        revision INTEGER PRIMARY KEY, payload TEXT NOT NULL, created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS jobs_inventor ON jobs (json_extract(payload, '$.request.invention.worldId'), json_extract(payload, '$.request.invention.actorId'), created_at, id);
      CREATE INDEX IF NOT EXISTS jobs_speech_event ON jobs (json_extract(payload, '$.playerSpeechEventId')) WHERE json_extract(payload, '$.kind') = 'chat';
      CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY, provider TEXT NOT NULL, status TEXT NOT NULL,
        reserved INTEGER NOT NULL CHECK (reserved >= 0), spent INTEGER NOT NULL DEFAULT 0 CHECK (spent >= 0),
        receipt TEXT, created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS attempts_created ON attempts(created_at,id);
      CREATE TABLE IF NOT EXISTS attempt_scopes (attempt_id TEXT PRIMARY KEY, actor_id TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS attempt_actor ON attempt_scopes(actor_id,attempt_id);
      CREATE TABLE IF NOT EXISTS intelligence_calls (id TEXT PRIMARY KEY, started_at TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS intelligence_calls_time ON intelligence_calls(started_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS intelligence_calls_parent_time ON intelligence_calls(json_extract(payload, '$.parentId'), started_at DESC, id DESC);
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS player_profiles (
        id TEXT PRIMARY KEY, revision INTEGER NOT NULL,
        show_unavailable_actions INTEGER NOT NULL CHECK (show_unavailable_actions IN (0, 1)),
        pause_when_hidden INTEGER NOT NULL DEFAULT 1 CHECK (pause_when_hidden IN (0, 1))
      );
    `;
    await this.db.exec(
      database ? schema.replace(/PRAGMA[^;]+;/g, '').replace(/\bINTEGER\b/g, 'BIGINT') : schema,
    );
    if (database)
      await this.db.exec(
        `CREATE TABLE IF NOT EXISTS mind.inner_world (world_id TEXT NOT NULL, actor_id TEXT NOT NULL, revision BIGINT NOT NULL, text TEXT NOT NULL, source_snapshot TEXT NOT NULL, publication_job_id TEXT NOT NULL, PRIMARY KEY(world_id,actor_id))`,
      );
    if (this.db.dialect === 'postgres') {
      this.vectors = new VectorStore(this.db);
      await this.vectors.initialize();
    }
    await new KnowledgeStore(this.db).initialize();
    await this.history.initialize();
    await this.saves.initialize();
    await this.commands.initialize();
    const version = await this.db.prepare('SELECT value FROM meta WHERE key = ?').get('schema');
    if (version && version['value'] !== '1')
      throw new Error('Unsupported save schema. Keep this save and use a compatible version.');
    await this.db
      .prepare('INSERT INTO meta VALUES (?, ?) ON CONFLICT(key) DO NOTHING')
      .run('schema', '1');
    // Additive migration preserves old profiles and their unavailable-action choice.
    if (
      !database &&
      !(await this.db.prepare('PRAGMA table_info(player_profiles)').all()).some(
        (column) => column['name'] === 'pause_when_hidden',
      )
    )
      await this.db.exec(
        'ALTER TABLE player_profiles ADD COLUMN pause_when_hidden INTEGER NOT NULL DEFAULT 1 CHECK (pause_when_hidden IN (0, 1))',
      );
  }

  async load(): Promise<{ revision: number; state: SavedWorld } | null> {
    await this.ready;

    const row = await this.db.prepare('SELECT revision, payload FROM world WHERE id = 1').get();
    if (!row) return null;
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
      state.world.archivedEventCount &&
      (await this.history.eventCount(state.world.id)) !==
        state.world.archivedEventCount + state.world.events.length
    )
      throw new Error(
        'Archived history coverage disagrees with the save; restore the complete database.',
      );
    if (this.db.dialect === 'postgres' && state.world.schemaVersion >= 2) {
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
    validateKnowledge(state.world);
    if (state.world.actorKnowledge) await new KnowledgeStore(this.db).verify(acceptedState.world);
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
    },
  ): Promise<number> {
    await this.ready;

    appendEventCount = this.acceptedState
      ? provenAppendCount(this.acceptedState.world.events, state.world.events)
      : undefined;
    const changes = timedSync('persistence.diff', () =>
      this.acceptedState
        ? diffSavedWorld(this.acceptedState, state, appendEventCount)
        : { operations: [] },
    );
    const changesPayload = timedSync('persistence.journalEncode', () => JSON.stringify(changes));
    // Prepare the fixed candidate revision before acquiring the database transaction.
    const snapshot =
      !this.acceptedState ||
      (expectedRevision + 1) % 120 === 0 ||
      Buffer.byteLength(changesPayload) >= 1_048_576;
    const snapshotPayload = snapshot
      ? timedSync('persistence.snapshotEncode', () => JSON.stringify(state))
      : undefined;
    const changedRows = Object.entries(state.world.innerWorlds ?? {})
      .filter(
        ([actorId, inner]) =>
          !!historyProjection?.restore ||
          this.acceptedRevision !== expectedRevision ||
          inner !== this.acceptedState?.world.innerWorlds?.[actorId],
      )
      .map(([actorId, inner]) => ({
        key: `${state.world.id}:${actorId}`,
        values: [
          state.world.id,
          actorId,
          inner.revision,
          inner.text,
          inner.sourceSnapshot,
          inner.publicationJobId,
        ],
      }))
      .filter(
        (row) =>
          !!historyProjection?.restore ||
          this.acceptedRevision !== expectedRevision ||
          this.acceptedRows.get(row.key) !== JSON.stringify(row.values),
      );
    const revision = await timed('persistence.transaction', () =>
      this.db.transaction(async () => {
        const row = await this.db
          .prepare(
            'SELECT MAX(revision) AS revision FROM (SELECT revision FROM world WHERE id = 1 UNION ALL SELECT revision FROM world_journal) AS revisions',
          )
          .get();
        const current =
          row?.['revision'] === null || row?.['revision'] === undefined
            ? 0
            : Number(row['revision']);
        if (current !== expectedRevision)
          throw new Error('Save conflict: another writer changed this world.');
        if (historyProjection?.restore) {
          if (!this.acceptedState) throw new Error('No active world to replace.');
          await this.saves.install(this.acceptedState, historyProjection.restore);
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
          if (!prior || prior === records) continue;
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
        await this.history.project(
          historyReady ? (historyProjection?.before ?? this.acceptedState?.world) : undefined,
          historyProjection?.after ?? state.world,
          historyReady
            ? provenAppendCount(
                (historyProjection?.before ?? this.acceptedState?.world)?.events ?? [],
                (historyProjection?.after ?? state.world).events,
              )
            : undefined,
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
        const revision = current + 1;
        await this.putIntegration('world-journal-head', revision);
        if (snapshot) {
          await this.db
            .prepare(
              'INSERT INTO world VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision, payload=excluded.payload',
            )
            .run(revision, snapshotPayload!);
          await this.db.prepare('DELETE FROM world_journal WHERE revision <= ?').run(revision);
        } else {
          await this.db
            .prepare('INSERT INTO world_journal (revision,payload,created_at) VALUES (?,?,?)')
            .run(revision, changesPayload, Date.now());
        }
        await new KnowledgeStore(this.db).project(this.acceptedState?.world, state.world, !!historyProjection?.restore);
        if (this.db.dialect === 'postgres')
          for (const row of changedRows) {
            await this.db
              .prepare(
                `INSERT INTO mind.inner_world VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(world_id,actor_id) DO UPDATE SET revision=excluded.revision,text=excluded.text,source_snapshot=excluded.source_snapshot,publication_job_id=excluded.publication_job_id WHERE (inner_world.revision,inner_world.text,inner_world.source_snapshot,inner_world.publication_job_id) IS DISTINCT FROM (excluded.revision,excluded.text,excluded.source_snapshot,excluded.publication_job_id)`,
              )
              .run(...row.values);
          }
        return revision;
      }),
    );
    // Cache only after COMMIT acknowledgement; failed writes never certify a row.
    if (historyProjection?.restore) this.acceptedRows.clear();
    for (const row of changedRows) this.acceptedRows.set(row.key, JSON.stringify(row.values));
    this.acceptedRevision = revision;
    this.acceptedState = state;
    this.readyHistoryWorlds.add(state.world.id);
    this.history.committed();
    return revision;
  }

  /** UI preferences live outside world snapshots, so restoring a world cannot rewind them. */
  async getProfile(id: string): Promise<PlayerProfile> {
    await this.ready;

    const row = await this.db.prepare('SELECT * FROM player_profiles WHERE id = ?').get(id);
    return {
      id,
      revision: row ? Number(row['revision']) : 0,
      preferences: {
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
        `SELECT payload FROM jobs WHERE json_extract(payload, '$.playerSpeechEventId') IN (${ids.map(() => '?').join(',')}) AND json_extract(payload, '$.kind') = 'chat' ORDER BY created_at DESC, id DESC`,
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

    const previous = await this.getJob(job.id);
    if (previous && previous.fingerprint !== job.fingerprint)
      throw new Error('A request ID cannot be reused with different input.');
    if (previous?.status === 'completed' && job.status !== 'completed') return;
    await this.db
      .prepare(
        'INSERT INTO jobs VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',
      )
      .run(job.id, job.fingerprint, JSON.stringify(job), job.createdAt);
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
  ): Promise<JobRecord[]> {
    await this.ready;
    return (
      await this.db
        .prepare(
          "SELECT payload FROM jobs WHERE json_extract(payload, '$.request.invention.worldId') = ? AND json_extract(payload, '$.request.invention.actorId') = ? AND (created_at < ? OR (created_at = ? AND id < ?)) ORDER BY created_at DESC, id DESC LIMIT 50",
        )
        .all(worldId, actorId, before.createdAt, before.createdAt, before.id)
    ).map((row) => JSON.parse(String(row['payload'])) as JobRecord);
  }

  async recentJobs(limit = 12): Promise<JobRecord[]> {
    await this.ready;

    return (
      await this.db
        .prepare('SELECT payload FROM jobs ORDER BY created_at DESC, rowid DESC LIMIT ?')
        .all(limit)
    ).map((row) => JSON.parse(String(row['payload'])) as JobRecord);
  }

  async getIntegration(key: string): Promise<unknown> {
    await this.ready;

    const row = await this.db
      .prepare('SELECT value FROM meta WHERE key = ?')
      .get(`integration:${key}`);
    return row ? JSON.parse(String(row['value'])) : undefined;
  }
  async putIntegration(key: string, value: unknown): Promise<void> {
    await this.ready;

    await this.db
      .prepare(
        'INSERT INTO meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE meta.value IS DISTINCT FROM excluded.value',
      )
      .run(`integration:${key}`, JSON.stringify(value));
  }

  async reserve(
    id: string,
    provider: 'jev' | 'openai' | 'macrofold',
    amountUsd: number,
    ceilingUsd: number,
    actorId = 'world-agent',
    reuse?: 'compute-allocation',
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
    return this.db.transaction(async () => {
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
      if (Number(row?.['total'] ?? 0) + amount > micro(Math.min(50, ceilingUsd))) {
        return false;
      }
      await this.db
        .prepare(
          "INSERT INTO attempts (id,provider,status,reserved,created_at) VALUES (?,?,'reserved',?,?)",
        )
        .run(id, provider, amount, Date.now());
      await this.db.prepare('INSERT INTO attempt_scopes VALUES (?,?)').run(id, actorId);
      return true;
    });
  }

  async settle(id: string, receipt: AiReceipt): Promise<void> {
    await this.ready;
    return this.db.transaction(async () => {
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
  }

  /** A restart never resends an admitted call whose external outcome is unknown. */
  async recoverInterruptedWork(): Promise<void> {
    await this.ready;

    await this.db.exec(
      "UPDATE attempts SET status='uncertain', spent=reserved WHERE status='reserved'",
    );
    for (const row of await this.db.prepare('SELECT payload FROM jobs').all()) {
      const job = JSON.parse(String(row['payload'])) as JobRecord;
      if (['queued', 'judging', 'generating'].includes(job.status)) {
        const uncertain =
          job.invention &&
          (await this.db
            .prepare(
              "SELECT id FROM attempts WHERE status='uncertain' AND (id IN (?, ?) OR substr(id, 1, ?) = ?) LIMIT 1",
            )
            .get(
              `${job.id}:route`,
              `${job.id}:generate`,
              `${job.id}:invention-search:`.length,
              `${job.id}:invention-search:`,
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

  async usage(ceilingUsd: number) {
    await this.ready;

    const rows = await this.db
      .prepare(
        "SELECT a.provider,a.status,a.reserved,a.spent,a.receipt,COALESCE(s.actor_id,'legacy') AS actor_id FROM attempts a LEFT JOIN attempt_scopes s ON s.attempt_id=a.id WHERE a.created_at>=?",
      )
      .all(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
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
    await this.db.close();
  }
}
