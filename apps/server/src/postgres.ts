import { timed, recordDuration, gaugeMetric } from './performance.js';
import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { SqlDatabase } from './store.js';

/** One asynchronous connection and a transaction lane; no main-thread waits or paid retries. */
export class PostgresDatabase implements SqlDatabase {
  readonly dialect = 'postgres';
  private client: pg.Client;
  private ready: Promise<void>;
  private tail: Promise<unknown> = Promise.resolve();
  private transactionContext = new AsyncLocalStorage<{ active: boolean }>();
  private failed = false;
  private closing = false;
  private queued = 0;
  private closeResult?: Promise<void>;
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
    if (this.closing) return Promise.reject(new Error('PostgreSQL connection is closing.'));
    if (this.failed) return Promise.reject(new Error('PostgreSQL unavailable; restart and reconcile.'));
    // Bound retained callbacks during a slow database operation; do not replay rejected work.
    // docs/performance.md#preserve-order-without-one-global-database-bottleneck
    if (this.queued >= 256) return Promise.reject(new Error('PostgreSQL admission queue is full.'));
    gaugeMetric('postgres.queuedOperations', ++this.queued);
    const queuedAt = performance.now();
    const next = this.tail.then(() => {
      recordDuration('postgres.wait', performance.now() - queuedAt);
      return operation();
    }).finally(() => {
      gaugeMetric('postgres.queuedOperations', --this.queued);
    });
    this.tail = next.catch(() => undefined);
    return next;
  }
  async transaction<T>(operation: () => Promise<T>): Promise<T> {
    if (this.transactionContext.getStore()?.active) return operation();
    return this.serial(() => {
      const scope = { active: true };
      return this.transactionContext.run(scope, async () => {
        try {
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
        } finally {
          // A detached callback cannot join a later transaction using an expired context.
          scope.active = false;
        }
      });
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
    return this.transactionContext.getStore()?.active ? execute() : this.serial(execute);
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
  close(): Promise<void> {
    if (this.transactionContext.getStore()?.active)
      return Promise.reject(new Error('Close PostgreSQL after the transaction completes.'));
    if (this.closeResult) return this.closeResult;
    this.closing = true;
    return (this.closeResult = (async () => {
      await this.tail;
      await this.ready.catch(() => undefined);
      this.failed = true;
      await this.client.end();
    })());
  }
}
