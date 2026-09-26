import { timed } from './performance.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { DatabaseSync } from 'node:sqlite';
import type { SqlDatabase } from './store.js';
/** SQLite remains local-only; async transaction ownership matches the PostgreSQL port. */
export class SqliteDatabase implements SqlDatabase {
  private db: DatabaseSync;
  private reader?: DatabaseSync;
  private readTail: Promise<unknown> = Promise.resolve();
  private tail: Promise<unknown> = Promise.resolve();
  private context = new AsyncLocalStorage<{
    active: boolean;
    committed: (() => void)[];
    rolledBack: (() => void)[];
    connection?: DatabaseSync;
    readOnly?: boolean;
  }>();
  constructor(
    private readonly path: string,
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
  private get connection() {
    const scope = this.context.getStore();
    // Async callbacks can outlive their originating snapshot. Once it closes,
    // they must rejoin the writer lane instead of reusing that read connection.
    return scope?.active ? (scope.connection ?? this.db) : this.db;
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
    if (this.context.getStore()?.active) {
      if (this.context.getStore()?.readOnly)
        throw new Error('A read snapshot cannot admit writes.');
      return operation();
    }
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
  readTransaction<T>(operation: () => Promise<T>): Promise<T> {
    if (this.context.getStore()?.active) return operation();
    // An in-memory adapter has no second connection; persistent worlds use WAL readers.
    if (this.path === ':memory:') return this.transaction(operation);
    const next = this.readTail.then(async () => {
      const connection = (this.reader ??= new DatabaseSync(this.path, { readOnly: true }));
      const scope = { active: true, connection, readOnly: true, committed: [], rolledBack: [] };
      return this.context.run(scope, async () => {
        connection.exec('BEGIN');
        try {
          const result = await operation();
          connection.exec('COMMIT');
          return result;
        } catch (error) {
          connection.exec('ROLLBACK');
          throw error;
        } finally {
          scope.active = false;
        }
      });
    });
    this.readTail = next.catch(() => undefined);
    return next;
  }
  exec(sql: string) {
    return this.run(() => this.connection.exec(sql));
  }
  prepare(sql: string) {
    return {
      get: (...params: any[]) =>
        this.run(() =>
          timed('sqlite.statement', async () => this.connection.prepare(sql).get(...params)),
        ),
      all: (...params: any[]) =>
        this.run(() =>
          timed('sqlite.statement', async () => this.connection.prepare(sql).all(...params)),
        ),
      run: (...params: any[]) =>
        this.run(() =>
          timed('sqlite.statement', async () => this.connection.prepare(sql).run(...params)),
        ),
    };
  }
  async close() {
    await this.tail;
    await this.readTail;
    this.reader?.close();
    this.db.close();
  }
}
