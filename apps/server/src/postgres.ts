import { WorkLane } from './work-lane.js';
import { timed, recordDuration } from './performance.js';
import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { SqlDatabase } from './store.js';

/** Independent bounded read and write lanes; a large recall cannot occupy the writer. */
export class PostgresDatabase implements SqlDatabase {
  readonly dialect = 'postgres';
  get checkpointSource() {
    return { kind: 'postgres' as const, url: this.connectionString };
  }
  private client: pg.Client;
  private ready: Promise<void>;
  private reader: pg.Client;
  private readReady?: Promise<void>;
  private readonly readLane = new WorkLane('postgres.read', 512);
  private readonly writeLane = new WorkLane('postgres', 512);
  private transactionContext = new AsyncLocalStorage<{
    active: boolean;
    client: pg.Client;
    readOnly: boolean;
    committed: (() => void)[];
    rolledBack: (() => void)[];
  }>();
  private failed = false;
  constructor(
    private readonly connectionString: string,
    private readonly readOnly = false,
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
      this.failed = true;
    });
    this.ready = this.connect();
    this.ready.catch(() => {
      this.failed = true;
    });
    this.client.on('error', () => {
      this.failed = true;
    });
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
  }
  private serial<T>(operation: () => Promise<T>): Promise<T> {
    return this.writeLane.run(operation);
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
  readTransaction<T>(operation: () => Promise<T>): Promise<T> {
    if (this.transactionContext.getStore()?.active) return operation();
    return this.read(operation, true);
  }
  private read<T>(operation: () => Promise<T>, snapshot: boolean): Promise<T> {
    const queuedAt = performance.now();
    return this.readLane.run(async () => {
      recordDuration('postgres.readWait', performance.now() - queuedAt);
      this.readReady ??= this.ready.then(async () => {
        await this.reader.connect();
        await this.reader.query(
          'SET search_path TO open_legend; SET default_transaction_read_only=on',
        );
      });
      await this.readReady;
      if (snapshot) return this.inTransaction(this.reader, true, operation);
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
  ): Promise<T> {
    const scope = {
      active: true,
      client,
      readOnly,
      committed: [] as (() => void)[],
      rolledBack: [] as (() => void)[],
    };
    return this.transactionContext.run(scope, async () => {
      await this.query(readOnly ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN');
      let result: T;
      try {
        // Cold extraction/restore can update an entire retained source set. Keep
        // interactive read deadlines separate from these atomic write operations.
        if (!readOnly) await this.query("SET LOCAL statement_timeout = '30s'");
        result = await operation();
        await this.query('COMMIT');
      } catch (error) {
        await this.query('ROLLBACK').catch(() => {
          this.failed = true;
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
  async query(sql: string, params: unknown[] = []) {
    const execute = async () => {
      await this.ready;
      if (this.failed)
        throw new Error('PostgreSQL unavailable; restart and reconcile pending writes.');
      let index = 0;
      const translated = sql
        .replace(/\?/g, () => `$${++index}`)
        .replace(/BEGIN IMMEDIATE/g, 'BEGIN')
        .replace(/\browid\b/g, 'id')
        .replace(
          /json_extract\(payload, '\$\.([A-Za-z.]+)'\)/g,
          (_, path: string) => `(payload::jsonb #>> '{${path.split('.').join(',')}}')`,
        );
      try {
        const result = await timed('postgres.statement', () =>
          (this.transactionContext.getStore()?.active
            ? this.transactionContext.getStore()!.client
            : this.client
          ).query(translated, params),
        );
        return { rows: result.rows ?? [], changes: result.rowCount ?? 0 };
      } catch (error) {
        const code = (error as { code?: string }).code;
        // Do not leak SQL parameters or connection credentials in diagnostics.
        throw new Error(
          `PostgreSQL operation failed${code ? ` (${code})` : ''}. No automatic retry.`,
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
      /^\s*SELECT\b/i.test(sql) &&
      !/\bFOR\s+(UPDATE|NO\s+KEY\s+UPDATE|SHARE|KEY\s+SHARE)\b/i.test(sql)
        ? this.read(() => this.query(sql, params), false)
        : this.query(sql, params);
    return {
      get: async (...params: unknown[]) => (await select(...params)).rows[0],
      all: async (...params: unknown[]) => (await select(...params)).rows,
      run: (...params: unknown[]) => this.query(sql, params),
    };
  }
  async close(): Promise<void> {
    await Promise.all([this.writeLane.idle(), this.readLane.idle()]);
    await this.ready.catch(() => undefined);
    this.failed = true;
    await this.client.end();
    if (this.readReady) {
      await this.readReady.catch(() => undefined);
      await this.reader.end();
    }
  }
}
