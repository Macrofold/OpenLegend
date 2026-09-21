import { timed } from './performance.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { DatabaseSync } from 'node:sqlite';
import type { SqlDatabase } from './store.js';
/** SQLite remains local-only; async transaction ownership matches the PostgreSQL port. */
export class SqliteDatabase implements SqlDatabase {
  private db: DatabaseSync;
  private tail: Promise<unknown> = Promise.resolve();
  private context = new AsyncLocalStorage<boolean>();
  constructor(path: string) {
    this.db = new DatabaseSync(path);
  }
  private run<T>(operation: () => T | Promise<T>): Promise<T> {
    if (this.context.getStore()) return Promise.resolve().then(operation);
    const next = this.tail.then(operation);
    this.tail = next.catch(() => undefined);
    return next;
  }
  transaction<T>(operation: () => Promise<T>): Promise<T> {
    if (this.context.getStore()) return operation();
    return this.run(() =>
      this.context.run(true, async () => {
        this.db.exec('BEGIN IMMEDIATE');
        try {
          const result = await operation();
          this.db.exec('COMMIT');
          return result;
        } catch (error) {
          this.db.exec('ROLLBACK');
          throw error;
        }
      }),
    );
  }
  exec(sql: string) {
    return this.run(() => this.db.exec(sql));
  }
  prepare(sql: string) {
    return {
      get: (...params: any[]) =>
        this.run(() => timed('sqlite.statement', async () => this.db.prepare(sql).get(...params))),
      all: (...params: any[]) =>
        this.run(() => timed('sqlite.statement', async () => this.db.prepare(sql).all(...params))),
      run: (...params: any[]) =>
        this.run(() => timed('sqlite.statement', async () => this.db.prepare(sql).run(...params))),
    };
  }
  async close() {
    await this.tail;
    this.db.close();
  }
}
