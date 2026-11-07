import { WorkLane } from './work-lane.js';
import {
  timed,
  beginTiming,
  endTiming,
  beginDatabaseQuery,
  finishDatabaseQuery,
} from './performance.js';
import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { SqlDatabase } from './store.js';
import {
  LiveReadOverlay,
  LiveReadRevisionError,
  mayReadLiveTables,
  readsPersonalHistory,
  type LiveReadCuts,
  type LiveReadCutsProvider,
  type MetadataBaseline,
} from './live-read-overlay.js';

interface TransactionScope {
  active: boolean;
  client: pg.Client;
  readOnly: boolean;
  committed: (() => void)[];
  rolledBack: (() => void)[];
  liveCuts?: LiveReadCuts;
  liveHead?: Record<string, unknown>;
  liveOverlays?: Map<string, LiveReadOverlay>;
  exactCut?: boolean;
  actor?: { worldId: string; actorId: string };
}

/** Independent bounded read and write lanes; a large recall cannot occupy the writer. */
export class PostgresDatabase implements SqlDatabase {
  get checkpointSource() {
    return { url: this.connectionString };
  }
  private client: pg.Client;
  private ready: Promise<void>;
  private reader: pg.Client;
  private readReady?: Promise<void>;
  private readonly readLane = new WorkLane('postgres.read', 512);
  private readonly writeLane = new WorkLane('postgres', 512);
  private transactionContext = new AsyncLocalStorage<TransactionScope>();
  private readonly metadataBaselineRead = new AsyncLocalStorage<boolean>();
  readMetadataBaseline<T>(
    actorIds: readonly string[],
    operation: (baseline: MetadataBaseline) => Promise<T>,
  ): Promise<T> {
    const read = async () => {
      const scope = this.transactionContext.getStore();
      const actor = this.actorReadScope.getStore() ?? scope?.actor;
      if (scope?.readOnly && actor && actorIds.some((id) => id !== actor.actorId))
        throw new LiveReadRevisionError();
      const overlay =
        scope?.readOnly && scope.liveCuts ? await this.resolveLiveOverlay(scope) : undefined;
      const head = overlay
        ? overlay.metadataBaseline(actorIds)
        : await this.query('SELECT world_id,revision FROM world_head WHERE id=1').then(
            ({ rows }) => ({
              worldId: String(rows[0]?.['world_id']),
              revision: Number(rows[0]?.['revision']),
            }),
          );
      // This consumer merges its selected pending metadata itself. Expanding the
      // same pending bodies into SQL duplicates that work and can exceed the read
      // allowance before SQL filters them. Body/source reads outside this callback
      // retain normal live semantics. The captured cut was validated above.
      // docs/projects/bookkeeping-simplification-runtime-design.md#63-reads-while-progress-is-unsaved
      return this.metadataBaselineRead.run(true, () => operation(head));
    };
    return this.transactionContext.getStore()?.active ? read() : this.readTransaction(read);
  }
  private readonly actorReadScope = new AsyncLocalStorage<{ worldId: string; actorId: string }>();
  readForActor<T>(worldId: string, actorId: string, operation: () => Promise<T>): Promise<T> {
    return this.actorReadScope.run({ worldId, actorId }, operation);
  }
  private readonly explicitReadCut = new AsyncLocalStorage<LiveReadCuts>();
  readAtCut<T>(cut: LiveReadCuts, operation: () => Promise<T>): Promise<T> {
    return this.explicitReadCut.run(cut, operation);
  }
  private liveReadCuts?: LiveReadCutsProvider;
  setLiveReadCuts(provider: LiveReadCutsProvider): void {
    this.liveReadCuts = provider;
  }
  private failed = false;
  private writeOwnershipReady = false;
  private closing = false;
  private fail(): void {
    this.failed = true;
  }
  constructor(
    private readonly connectionString: string,
    private readonly readOnly = false,
    readonly writeGroups = true,
  ) {
    this.client = new pg.Client({
      connectionString,
      connectionTimeoutMillis: 5000,
      statement_timeout: 5000,
    });
    this.reader = new pg.Client({
      connectionString,
      connectionTimeoutMillis: 5000,
      statement_timeout: 5000,
    });
    this.reader.on('error', () => {
      this.fail();
    });
    this.ready = this.connect();
    this.ready.catch(() => {
      this.fail();
    });
    this.client.on('error', () => {
      this.fail();
    });
    // An ended session loses its advisory writer lock even without an error event.
    this.client.on('end', () => this.fail());
  }
  private async connect() {
    await this.client.connect();
    if (this.readOnly) {
      await this.client.query(
        'SET search_path TO open_legend; SET default_transaction_read_only=on',
      );
      return;
    }
    const lock = await this.client.query('SELECT pg_try_advisory_lock(187114, 1) AS acquired');
    if (!lock.rows[0].acquired) throw new Error('Another Open Legend writer owns this database.');
    await this.client.query(
      'CREATE SCHEMA IF NOT EXISTS open_legend; SET search_path TO open_legend; CREATE SCHEMA IF NOT EXISTS mind',
    );
    this.writeOwnershipReady = true;
  }
  /** Live effects rely on the same exclusive session that owns durable writes.
   * No query or second lease is needed at ordinary in-memory admission. */
  assertWriteAdmission(): void {
    if (!this.writeOwnershipReady || this.failed || this.closing || this.readOnly)
      throw new Error('The database writer is unavailable for new gameplay.');
  }
  private serial<T>(operation: () => Promise<T>): Promise<T> {
    return this.writeLane.run(operation);
  }

  get transactionActive(): boolean {
    return this.transactionContext.getStore()?.active ?? false;
  }
  afterCommit(callback: () => void) {
    const scope = this.transactionContext.getStore();
    if (scope?.active) scope.committed.push(callback);
    else callback();
  }
  afterRollback(callback: () => void) {
    const scope = this.transactionContext.getStore();
    if (scope?.active) scope.rolledBack.push(callback);
  }
  async transaction<T>(operation: () => Promise<T>): Promise<T> {
    const existing = this.transactionContext.getStore();
    if (existing?.active) {
      if (existing.readOnly) throw new Error('A read snapshot cannot admit writes.');
      return operation();
    }
    return this.serial(() => this.inTransaction(this.client, false, operation));
  }
  maintenanceTransaction<T>(operation: () => Promise<T>): Promise<T> {
    if (this.transactionContext.getStore()?.active) return this.transaction(operation);
    return this.writeLane.run(
      () => this.inTransaction(this.client, false, operation),
      this.writeLane.waitMs,
      true,
    );
  }
  readTransaction<T>(operation: () => Promise<T>): Promise<T> {
    if (this.transactionContext.getStore()?.active) return operation();
    return this.read(operation, true);
  }
  private read<T>(
    operation: () => Promise<T>,
    snapshot: boolean,
    liveTables = false,
    personalHistory = false,
  ): Promise<T> {
    const queuedAt = beginTiming();
    const explicitCut = this.explicitReadCut.getStore();
    const actor = this.actorReadScope.getStore();
    const liveCuts =
      explicitCut ?? (snapshot || liveTables ? this.liveReadCuts?.(actor) : undefined);
    return this.readLane.run(async () => {
      endTiming('postgres.readWait', queuedAt);
      this.readReady ??= this.ready.then(async () => {
        await this.reader.connect();
        await this.reader.query(
          'SET search_path TO open_legend; SET default_transaction_read_only=on',
        );
      });
      await this.readReady;
      if (
        snapshot ||
        explicitCut ||
        (liveTables &&
          (liveCuts?.cuts.length || (personalHistory && liveCuts?.historyEligibility?.size)))
      )
        return this.inTransaction(this.reader, true, operation, liveCuts, !!explicitCut, actor);
      // A single SELECT already has an atomic PostgreSQL snapshot. It needs neither
      // a writer slot nor BEGIN/COMMIT; explicit multi-query reads still use both.
      const scope = {
        active: true,
        client: this.reader,
        readOnly: true,
        committed: [] as (() => void)[],
        rolledBack: [] as (() => void)[],
      };
      try {
        return await this.transactionContext.run(scope, operation);
      } finally {
        scope.active = false;
      }
    });
  }
  private inTransaction<T>(
    client: pg.Client,
    readOnly: boolean,
    operation: () => Promise<T>,
    liveCuts?: LiveReadCuts,
    exactCut = false,
    actor?: { worldId: string; actorId: string },
  ): Promise<T> {
    const scope = {
      active: true,
      client,
      readOnly,
      committed: [] as (() => void)[],
      rolledBack: [] as (() => void)[],
      liveCuts,
      exactCut,
      actor,
    };
    return this.transactionContext.run(scope, async () => {
      let result: T;
      try {
        // Cold extraction/restore can update an entire retained source set. Keep
        // interactive read deadlines separate from these atomic write operations.
        await this.query(
          readOnly
            ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'
            : this.writeGroups
              ? "BEGIN; SET LOCAL statement_timeout = '30s'"
              : 'BEGIN',
        );
        if (!readOnly && !this.writeGroups) await this.query("SET LOCAL statement_timeout = '30s'");
        result = await operation();
        await this.query('COMMIT');
      } catch (error) {
        await this.query('ROLLBACK').catch(() => {
          this.fail();
        });
        scope.active = false;
        for (const callback of scope.rolledBack) callback();
        throw error;
      }
      scope.active = false;
      for (const callback of scope.committed) callback();
      return result;
    });
  }
  private async resolveLiveOverlay(scope: TransactionScope): Promise<LiveReadOverlay> {
    if (!scope.liveCuts) throw new LiveReadRevisionError();
    const requested = this.actorReadScope.getStore(),
      actor = requested ?? scope.actor;
    if (
      scope.actor &&
      requested &&
      (scope.actor.worldId !== requested.worldId || scope.actor.actorId !== requested.actorId)
    )
      throw new LiveReadRevisionError();
    const key = actor ? JSON.stringify([actor.worldId, actor.actorId]) : '';
    const cached = scope.liveOverlays?.get(key);
    if (cached) return cached;
    // Every selected durable row and the header use the same repeatable-read
    // snapshot, whether the consumer merges bodies or only canonical metadata.
    const value = (scope.liveHead ??=
      (await this.query('SELECT world_id,generation,revision FROM world_head WHERE id=1'))
        .rows[0] ?? {});
    const prepare = (cut: LiveReadCuts) =>
      new LiveReadOverlay(
        cut,
        Number(value?.['revision']),
        String(value?.['generation']),
        String(value?.['world_id']),
        actor,
      );
    let overlay: LiveReadOverlay;
    try {
      overlay = prepare(scope.liveCuts);
    } catch (error) {
      const latest =
        !scope.exactCut && error instanceof LiveReadRevisionError
          ? this.liveReadCuts?.(scope.actor)
          : undefined;
      if (
        !latest ||
        latest.generation !== scope.liveCuts.generation ||
        latest.timeline !== scope.liveCuts.timeline
      )
        throw error;
      overlay = prepare(latest);
      scope.liveCuts = latest;
    }
    scope.liveOverlays ??= new Map();
    scope.liveOverlays.set(key, overlay);
    return overlay;
  }
  async query(sql: string, params: unknown[] = []) {
    const template = sql;
    const execute = async () => {
      await this.ready;
      if (this.failed)
        throw new Error('PostgreSQL unavailable; restart and reconcile pending writes.');
      const scope = this.transactionContext.getStore();
      if (
        !this.metadataBaselineRead.getStore() &&
        scope?.readOnly &&
        scope.liveCuts &&
        (scope.liveCuts.cuts.length ||
          scope.exactCut ||
          (scope.liveCuts.historyEligibility?.size && readsPersonalHistory(sql))) &&
        mayReadLiveTables(sql)
      ) {
        const overlay = await this.resolveLiveOverlay(scope);
        const rewritten = overlay.rewrite(sql, params);
        sql = rewritten.sql;
        params = rewritten.params;
      }
      let index = 0;
      const translated = sql.replace(/\?/g, () => `$${++index}`);
      const diagnostic = beginDatabaseQuery(template);
      try {
        const result = await timed('postgres.statement', () =>
          (this.transactionContext.getStore()?.active
            ? this.transactionContext.getStore()!.client
            : this.client
          ).query(translated, params),
        );
        const value = { rows: result.rows ?? [], changes: result.rowCount ?? 0 };
        finishDatabaseQuery(diagnostic, value);
        return value;
      } catch (error) {
        finishDatabaseQuery(diagnostic);
        const reported = (error as { code?: unknown }).code;
        const code =
          typeof reported === 'string' && /^[A-Z0-9]{5}$/.test(reported) ? reported : undefined;
        // SQLSTATE is safe operational metadata. Keep driver details, SQL values
        // and credentials behind this boundary while preserving failure class.
        throw Object.assign(
          new Error(`PostgreSQL operation failed${code ? ` (${code})` : ''}. No automatic retry.`),
          code ? { code } : {},
        );
      }
    };
    return this.transactionContext.getStore()?.active ? execute() : this.serial(execute);
  }
  async exec(sql: string): Promise<void> {
    await this.query(sql);
  }
  prepare(sql: string) {
    const select = (...params: unknown[]) =>
      !this.transactionContext.getStore()?.active &&
      /^\s*(SELECT|WITH)\b/i.test(sql) &&
      !/\b(?:INSERT|UPDATE|DELETE)\b/i.test(sql) &&
      !/\bFOR\s+(UPDATE|NO\s+KEY\s+UPDATE|SHARE|KEY\s+SHARE)\b/i.test(sql)
        ? this.read(
            () => this.query(sql, params),
            false,
            mayReadLiveTables(sql),
            readsPersonalHistory(sql),
          )
        : this.query(sql, params);
    return {
      get: async (...params: unknown[]) => (await select(...params)).rows[0],
      all: async (...params: unknown[]) => (await select(...params)).rows,
      run: (...params: unknown[]) => this.query(sql, params),
    };
  }
  async close(): Promise<void> {
    this.closing = true;
    await Promise.all([this.writeLane.idle(), this.readLane.idle()]);
    await this.ready.catch(() => undefined);
    this.fail();
    await this.client.end();
    if (this.readReady) {
      await this.readReady.catch(() => undefined);
      await this.reader.end();
    }
  }
}
