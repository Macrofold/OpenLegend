import { timed, recordDuration } from './performance.js';
import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { SqlDatabase } from './store.js';

/** One asynchronous connection and a transaction lane; no main-thread waits or paid retries. */
export class PostgresDatabase implements SqlDatabase {
  readonly dialect = 'postgres';
  private client: pg.Client;
  private ready: Promise<void>;
  private tail: Promise<unknown> = Promise.resolve();
  private transactionContext = new AsyncLocalStorage<boolean>();
  private failed = false;
  constructor(connectionString: string) {
    this.client = new pg.Client({
      connectionString,
      connectionTimeoutMillis: 5000,
      statement_timeout: 5000,
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
    const lock = await this.client.query('SELECT pg_try_advisory_lock(187114, 1) AS acquired');
    if (!lock.rows[0].acquired) throw new Error('Another Open Legend writer owns this database.');
    await this.client.query(
      'CREATE SCHEMA IF NOT EXISTS open_legend; SET search_path TO open_legend; CREATE SCHEMA IF NOT EXISTS mind',
    );
  }
  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const queuedAt = performance.now();
    const next = this.tail.then(() => {
      recordDuration('postgres.wait', performance.now() - queuedAt);
      return operation();
    });
    this.tail = next.catch(() => undefined);
    return next;
  }
  async transaction<T>(operation: () => Promise<T>): Promise<T> {
    if (this.transactionContext.getStore()) return operation();
    return this.serial(() =>
      this.transactionContext.run(true, async () => {
        await this.query('BEGIN');
        try {
          const result = await operation();
          await this.query('COMMIT');
          return result;
        } catch (error) {
          await this.query('ROLLBACK').catch(() => {
            this.failed = true;
          });
          throw error;
        }
      }),
    );
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
          this.client.query(translated, params),
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
    return this.transactionContext.getStore() ? execute() : this.serial(execute);
  }
  async exec(sql: string): Promise<void> {
    await this.query(sql);
  }
  prepare(sql: string) {
    return {
      get: async (...params: unknown[]) => (await this.query(sql, params)).rows[0],
      all: async (...params: unknown[]) => (await this.query(sql, params)).rows,
      run: (...params: unknown[]) => this.query(sql, params),
    };
  }
  async close(): Promise<void> {
    await this.tail;
    await this.ready.catch(() => undefined);
    this.failed = true;
    await this.client.end();
  }
}
