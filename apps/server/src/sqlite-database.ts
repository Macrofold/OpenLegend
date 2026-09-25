import { timed } from './performance.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { DatabaseSync } from 'node:sqlite';
import type { SqlDatabase } from './store.js';
/** SQLite remains local-only; async transaction ownership matches the PostgreSQL port. */
export class SqliteDatabase implements SqlDatabase {
  private db: DatabaseSync;
  private tail: Promise<unknown> = Promise.resolve();
  private context = new AsyncLocalStorage<{
    active: boolean;
    committed: (() => void)[];
    rolledBack: (() => void)[];
  }>();
  constructor(
    path: string,
    private readonly readOnly = false,
  ) {
    this.db = new DatabaseSync(path, { readOnly });
  }
  private run<T>(operation: () => T | Promise<T>): Promise<T> {
    if (this.context.getStore()?.active) return Promise.resolve().then(operation);
    const next = this.tail.then(operation);
    this.tail = next.catch(() => undefined);
    return next;
  }
  afterCommit(callback: () => void) {
    const scope = this.context.getStore();
    if (scope?.active) scope.committed.push(callback);
    else callback();
  }
  afterRollback(callback: () => void) {
    const scope = this.context.getStore();
    if (scope?.active) scope.rolledBack.push(callback);
  }
  transaction<T>(operation: () => Promise<T>): Promise<T> {
    if (this.context.getStore()?.active) return operation();
    return this.run(() => {
      const scope = {
        active: true,
        committed: [] as (() => void)[],
        rolledBack: [] as (() => void)[],
      };
      return this.context.run(scope, async () => {
        this.db.exec(this.readOnly ? 'BEGIN' : 'BEGIN IMMEDIATE');
        let result: T;
        try {
          result = await operation();
          this.db.exec('COMMIT');
        } catch (error) {
          try {
            this.db.exec('ROLLBACK');
          } finally {
            scope.active = false;
            for (const callback of scope.rolledBack) callback();
          }
          throw error;
        }
        scope.active = false;
        for (const callback of scope.committed) callback();
        return result;
      });
    });
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
