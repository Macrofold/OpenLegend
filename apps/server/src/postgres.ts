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
import type { SqlDatabase } from './sql-database.js';

// The stand-alone writer and stopped backup use this same PostgreSQL key.
const WORLD_WRITER_KEY = '187114, 1';

interface TransactionScope {
  active: boolean;
  client: pg.Client;
  readOnly: boolean;
  committed: (() => void)[];
  rolledBack: (() => void)[];
  rollbackViewActive?: boolean;
  writeFailure?: unknown;
}

export type PostgresTransactionOutcome = 'rolled-back' | 'unknown' | 'committed';
const confirmedRollbacks = new WeakSet<object>();

/** SQL's outcome is independent of the caller receiving its acknowledgement.
 * Protected native settlement must keep its owner across an unknown COMMIT. */
export class PostgresTransactionError extends Error {
  constructor(
    readonly outcome: PostgresTransactionOutcome,
    cause: unknown,
  ) {
    super(
      outcome === 'unknown'
        ? 'PostgreSQL commit outcome is unknown; reconcile its durable result before admitting more work.'
        : outcome === 'committed'
          ? 'PostgreSQL committed, but local publication failed; recover the committed result.'
          : 'PostgreSQL confirmed transaction rollback.',
      { cause },
    );
    this.name = 'PostgresTransactionError';
  }
}

/** Preserve original permission/refusal error identity on a confirmed rollback.
 * An arbitrary error or a successful later ROLLBACK proves nothing about a
 * previously dispatched COMMIT. */
export function postgresTransactionOutcome(error: unknown): PostgresTransactionOutcome | undefined {
  if (error instanceof PostgresTransactionError) return error.outcome;
  return error !== null &&
    (typeof error === 'object' || typeof error === 'function') &&
    confirmedRollbacks.has(error)
    ? 'rolled-back'
    : undefined;
}

function runTransactionCallbacks(callbacks: readonly (() => void)[]): unknown[] {
  const errors: unknown[] = [];
  for (const callback of callbacks) {
    try {
      callback();
    } catch (error) {
      errors.push(error);
    }
  }
  return errors;
}

/** Independent bounded read and write lanes; a large recall cannot occupy the writer. */
export class PostgresDatabase implements SqlDatabase {
  private client: pg.Client;
  private ready: Promise<void>;
  private reader: pg.Client;
  private readReady?: Promise<void>;
  private readonly readLane = new WorkLane('postgres.read', 512);
  private readonly writeLane = new WorkLane('postgres', 512);
  private transactionContext = new AsyncLocalStorage<TransactionScope>();
  private readonly transferAdmission = new AsyncLocalStorage<
    (bytes: number, rows: number) => void
  >();
  withReadTransferAdmission<T>(
    admit: (bytes: number, rows: number) => void,
    operation: () => Promise<T>,
  ): Promise<T> {
    return this.transferAdmission.run(admit, operation);
  }
  withoutReadTransferAdmission<T>(operation: () => T): T {
    return this.transferAdmission.exit(operation);
  }
  protected get inReadScope(): boolean {
    return this.transactionContext.getStore()?.readOnly === true;
  }
  protected readonly rewriteRead?: (
    sql: string,
    params: unknown[],
  ) => Promise<{ sql: string; params: unknown[] }> | undefined;
  protected readonly readColumnDecoder?: () =>
    | {
        types: pg.CustomTypesConfig;
        refusal: () => unknown;
      }
    | undefined;
  private failed = false;
  private writeOwnershipReady = false;
  private closing = false;
  private fail(): void {
    this.failed = true;
  }
  constructor(
    protected readonly connectionString: string,
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
    const lock = await this.client.query(
      `SELECT pg_try_advisory_lock(${WORLD_WRITER_KEY}) AS acquired`,
    );
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
  /** Hold the stopped source stable across an operator catalog read and a
   * child Rust backup. Their read-only snapshots share this writer fence.
   * Return only after releasing the dedicated session's share. Uploads and
   * later retries of a published capture must run outside this callback.
   */
  withStoppedWorld<T>(capture: () => Promise<T>): Promise<T> {
    if (!this.readOnly || this.transactionActive)
      throw new Error('A stopped world capture needs its own read-only database owner.');
    return this.serial(async () => {
      await this.ready;
      const lock = await this.client.query(
        `SELECT pg_try_advisory_lock_shared(${WORLD_WRITER_KEY}) AS acquired`,
      );
      if (!lock.rows[0].acquired)
        throw new Error('Stop the Open Legend writer before capturing recovery data.');
      try {
        return await capture();
      } finally {
        const release = await this.client.query(
          `SELECT pg_advisory_unlock_shared(${WORLD_WRITER_KEY}) AS released`,
        );
        if (!release.rows[0].released)
          throw new Error('The stopped world capture lost its writer fence.');
      }
    });
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
  async rollbackView<T>(operation: () => Promise<T>): Promise<T> {
    const parent = this.transactionContext.getStore();
    if (!parent?.active || parent.readOnly || parent.rollbackViewActive)
      throw new Error('A tentative SQL projection requires its exclusive write transaction.');
    parent.rollbackViewActive = true;
    const child: TransactionScope = {
      active: true,
      client: parent.client,
      readOnly: false,
      committed: [],
      rolledBack: [],
      rollbackViewActive: true,
    };
    let saved = false;
    let result: T | undefined;
    let failed = false;
    let failure: unknown;
    try {
      await this.query('SAVEPOINT openlegend_rollback_view');
      saved = true;
      try {
        result = await this.transactionContext.run(child, operation);
      } catch (error) {
        failed = true;
        failure = error;
      }
      // These statements run in the parent context. No tentative row or
      // afterCommit callback may escape a successful or failed projection.
      await this.query('ROLLBACK TO SAVEPOINT openlegend_rollback_view');
      await this.query('RELEASE SAVEPOINT openlegend_rollback_view');
      saved = false;
      child.active = false;
      const failures = runTransactionCallbacks(child.rolledBack);
      if (failures.length) {
        const error = new AggregateError(failed ? [failure, ...failures] : failures);
        parent.writeFailure = error;
        throw error;
      }
      if (failed) throw failure;
      return result as T;
    } catch (error) {
      // An unusable savepoint must abort the enclosing transaction. Its real
      // owner determines rollback/unknown outcome; this view never commits it.
      if (saved) parent.writeFailure = error;
      throw error;
    } finally {
      child.active = false;
      if (!saved) parent.rollbackViewActive = false;
    }
  }
  protected read<T>(
    operation: () => Promise<T>,
    snapshot: boolean,
    _sql?: string,
    queuedAt = beginTiming(),
  ): Promise<T> {
    const admitted = this.transferAdmission.getStore() !== undefined;
    return this.readLane.run(async () => {
      endTiming('postgres.readWait', queuedAt);
      this.readReady ??= this.ready.then(async () => {
        await this.reader.connect();
        await this.reader.query(
          'SET search_path TO open_legend; SET default_transaction_read_only=on',
        );
      });
      await this.readReady;
      if (snapshot || admitted) return this.inTransaction(this.reader, true, operation);
      // One ordinary SELECT already has an atomic PostgreSQL snapshot. An
      // admitted read needs a fixed snapshot across its sizing and body queries.
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
  ): Promise<T> {
    const scope: TransactionScope = {
      active: true,
      client,
      readOnly,
      committed: [] as (() => void)[],
      rolledBack: [] as (() => void)[],
    };
    return this.transactionContext.run(scope, async () => {
      const rollback = async (error: unknown): Promise<never> => {
        try {
          await this.query('ROLLBACK');
        } catch (failure) {
          this.fail();
          scope.active = false;
          throw new PostgresTransactionError('unknown', new AggregateError([error, failure]));
        }
        scope.active = false;
        if (scope.writeFailure !== undefined) this.fail();
        const failures = runTransactionCallbacks(scope.rolledBack);
        if (failures.length) {
          this.fail();
          throw new PostgresTransactionError(
            'rolled-back',
            new AggregateError([error, ...failures]),
          );
        }
        if (error !== null && (typeof error === 'object' || typeof error === 'function')) {
          confirmedRollbacks.add(error);
          throw error;
        }
        throw new PostgresTransactionError('rolled-back', error);
      };
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
        if (scope.writeFailure !== undefined) throw scope.writeFailure;
      } catch (error) {
        return rollback(error);
      }
      let dispatched = false;
      let completion;
      try {
        completion = await this.queryWithDispatch('COMMIT', [], () => {
          dispatched = true;
        });
      } catch (error) {
        if (!dispatched) return rollback(error);
        // A later ROLLBACK can succeed after COMMIT already completed. It must
        // not run rollback callbacks or authorize rejecting durable gameplay.
        this.fail();
        scope.active = false;
        throw new PostgresTransactionError('unknown', error);
      }
      scope.active = false;
      if (completion.command === 'ROLLBACK') {
        const failures = runTransactionCallbacks(scope.rolledBack);
        if (failures.length) this.fail();
        throw new PostgresTransactionError(
          'rolled-back',
          new AggregateError(
            failures,
            'PostgreSQL ended the failed transaction without committing.',
          ),
        );
      }
      if (completion.command !== 'COMMIT') {
        this.fail();
        throw new PostgresTransactionError(
          'unknown',
          new Error('No COMMIT completion was received.'),
        );
      }
      const failures = runTransactionCallbacks(scope.committed);
      if (failures.length) {
        this.fail();
        throw new PostgresTransactionError('committed', new AggregateError(failures));
      }
      return result;
    });
  }

  async query(sql: string, params: unknown[] = []) {
    return this.queryWithDispatch(sql, params);
  }
  private async queryWithDispatch(sql: string, params: unknown[], onDispatch?: () => void) {
    const template = sql;
    const execute = async () => {
      await this.ready;
      if (this.failed)
        throw new Error('PostgreSQL unavailable; restart and reconcile pending writes.');
      const scope = this.transactionContext.getStore();
      const rewrite = this.inReadScope ? this.rewriteRead?.(sql, params) : undefined;
      if (rewrite) ({ sql, params } = await rewrite);
      let index = 0;
      const translated = sql.replace(/\?/g, () => `$${++index}`);
      const admit = this.transferAdmission.getStore();
      if (admit && /^\s*(SELECT|WITH)\b/i.test(sql) && !/\b(?:INSERT|UPDATE|DELETE)\b/i.test(sql)) {
        if (!scope?.active)
          throw new Error('SQL transfer admission requires its fixed read transaction.');
        // Use this exact rewritten selection and snapshot. The preflight is
        // real measured SQL; it must finish before the body query dispatches.
        const statement = `SELECT count(*) AS rows,COALESCE(sum(octet_length(row_to_json(t)::text)),0) AS bytes FROM (${translated}) t`;
        const preflight = beginDatabaseQuery(statement);
        let size: pg.QueryResult;
        try {
          size = await timed('postgres.statement', () => scope.client.query(statement, params));
          finishDatabaseQuery(preflight, {
            rows: size.rows,
            changes: size.rowCount ?? 0,
          });
        } catch (error) {
          finishDatabaseQuery(preflight);
          const code = (error as { code?: unknown }).code;
          throw Object.assign(
            new Error('PostgreSQL transfer preflight failed. No automatic retry.'),
            typeof code === 'string' && /^[A-Z0-9]{5}$/.test(code) ? { code } : {},
          );
        }
        const bytes = Number(size.rows[0]?.['bytes']),
          rows = Number(size.rows[0]?.['rows']);
        if (!Number.isSafeInteger(bytes) || bytes < 0 || !Number.isSafeInteger(rows) || rows < 0)
          throw new Error('SQL transfer preflight returned an invalid allocation shape.');
        admit(bytes, rows);
      }
      const diagnostic = beginDatabaseQuery(template);
      const decoder = this.readColumnDecoder?.();
      const types = decoder?.types;
      try {
        const result = await timed('postgres.statement', () => {
          onDispatch?.();
          return (
            this.transactionContext.getStore()?.active
              ? this.transactionContext.getStore()!.client
              : this.client
          ).query(
            types
              ? { text: translated, values: params, types }
              : { text: translated, values: params },
          );
        });
        const value = {
          rows: result.rows ?? [],
          changes: result.rowCount ?? 0,
          command: result.command,
        };
        finishDatabaseQuery(diagnostic, value);
        return value;
      } catch (error) {
        finishDatabaseQuery(diagnostic);
        // A native admission refusal inside pg's row decoder is a host error,
        // not a driver/SQL detail. Preserve it after the real query settles so
        // the caller can refuse before Ready and explicitly retry unchanged.
        const columnRefusal = decoder?.refusal();
        if (columnRefusal !== undefined) throw columnRefusal;
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
        ? this.read(() => this.query(sql, params), false, sql)
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
