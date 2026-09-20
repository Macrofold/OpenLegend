import { Worker } from 'node:worker_threads';
import type { SqlDatabase } from './store.js';
/** Preserve the existing synchronous commit boundary; one dedicated connection owns all transactions. */
export class PostgresDatabase implements SqlDatabase {
  readonly dialect = 'postgres';
  private worker: Worker;
  private failed = false;
  constructor(connectionString: string) {
    this.worker = new Worker(new URL('./postgres-worker.mjs', import.meta.url), {
      workerData: { connectionString },
      // This plain JS worker must not inherit tsx loaders or stdin/eval flags.
      execArgv: [],
    });
    this.worker.on('error', () => {
      this.failed = true;
    });
  }
  query(sql: string, params: unknown[] = []): { rows: Record<string, unknown>[]; changes: number } {
    if (this.failed) throw new Error('PostgreSQL requires restart after an uncertain operation.');
    let index = 0;
    sql = sql
      .replace(/\?/g, () => `$${++index}`)
      .replace(/BEGIN IMMEDIATE/g, 'BEGIN')
      .replace(/\browid\b/g, 'id')
      .replace(
        /json_extract\(payload, '\$\.([A-Za-z.]+)'\)/g,
        (_, path: string) => `(payload::jsonb #>> '{${path.split('.').join(',')}}')`,
      );
    const shared = new SharedArrayBuffer(16 * 1024 * 1024);
    const header = new Int32Array(shared, 0, 2);
    this.worker.postMessage({ sql, params, shared });
    if (Atomics.wait(header, 0, 0, 10000) === 'timed-out') {
      this.failed = true;
      void this.worker.terminate();
      throw new Error('Database completion uncertain. Stop and reconcile before retrying.');
    }
    const value = JSON.parse(
      Buffer.from(new Uint8Array(shared, 8, Atomics.load(header, 1))).toString(),
    ) as { rows: Record<string, unknown>[]; changes: number; error?: string };
    if (value.error) throw new Error(value.error);
    return value;
  }
  exec(sql: string): void {
    this.query(sql);
  }
  prepare(sql: string) {
    return {
      get: (...params: unknown[]) => this.query(sql, params).rows[0],
      all: (...params: unknown[]) => this.query(sql, params).rows,
      run: (...params: unknown[]) => this.query(sql, params),
    };
  }
  close(): void {
    this.failed = true;
    void this.worker.terminate();
  }
}
