import { timed, recordDuration, gaugeMetric } from './performance.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Worker } from 'node:worker_threads';
import { WorkLane } from './work-lane.js';
import type { SqlDatabase } from './store.js';

type Operation = 'exec' | 'get' | 'all' | 'run' | 'close';
type Reply =
  | { kind: 'ready' }
  | {
      kind: 'result';
      id: number;
      value?: unknown;
      elapsedMs: number;
      heapUsedBytes?: number;
      error?: { message: string; code?: string; errcode?: number; errstr?: string };
    };

class SqliteConnection {
  private readonly worker: Worker;
  private serial = 0;
  private fatal?: Error;
  private closing = false;
  private closed = false;
  private closeResult?: Promise<void>;
  private readonly pending = new Map<
    number,
    {
      resolve(value: unknown): void;
      reject(error: Error): void;
    }
  >();
  private resolveReady!: () => void;
  private rejectReady!: (error: Error) => void;
  private readonly ready = new Promise<void>((resolve, reject) => {
    this.resolveReady = resolve;
    this.rejectReady = reject;
  });

  constructor(path: string, readOnly: boolean) {
    // Native .mjs avoids a second TypeScript loader and inherits no profiler/preload arguments.
    this.worker = new Worker(new URL('./sqlite-worker.mjs', import.meta.url), {
      workerData: { path, readOnly },
      execArgv: [],
      env: process.env.TZ ? { TZ: process.env.TZ } : {},
    });
    this.ready.catch(() => undefined);
    this.worker.on('message', (reply: Reply) => {
      if (reply.kind === 'ready') {
        this.resolveReady();
        return;
      }
      const call = this.pending.get(reply.id);
      if (!call) return;
      this.pending.delete(reply.id);
      recordDuration('sqlite.workerExecution', reply.elapsedMs);
      if (reply.heapUsedBytes !== undefined)
        gaugeMetric('sqlite.workerHeapUsedBytes', reply.heapUsedBytes);
      if (reply.error) call.reject(Object.assign(new Error(reply.error.message), reply.error));
      else call.resolve(reply.value);
    });
    this.worker.on('error', (error) => this.fail(error));
    this.worker.on('messageerror', (error) => this.fail(error));
    this.worker.on('exit', (code) => {
      if (!this.closed || this.pending.size)
        this.fail(
          new Error(`SQLite worker exited (${code}); reconcile durable state before restarting.`),
        );
    });
  }

  fail(error: Error): void {
    this.fatal ??= error;
    this.rejectReady(this.fatal);
    for (const call of this.pending.values()) call.reject(this.fatal);
    this.pending.clear();
  }

  async request<T>(operation: Operation, sql = '', params: unknown[] = []): Promise<T> {
    await this.ready;
    if (this.fatal) throw this.fatal;
    if (this.closing && operation !== 'close') throw new Error('SQLite connection is closing.');
    // External operations are already serialized; bound exceptional transaction-local fan-out.
    if (this.pending.size >= 128) throw new Error('SQLite transaction request capacity exceeded.');
    const id = ++this.serial;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: (value) => resolve(value as T), reject });
      try {
        this.worker.postMessage({ id, operation, sql, params });
      } catch (error) {
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  close(): Promise<void> {
    if (this.closeResult) return this.closeResult;
    this.closing = true;
    return (this.closeResult = (async () => {
      try {
        await this.request<void>('close');
        this.closed = true;
      } finally {
        await this.worker.terminate();
      }
    })());
  }
}

interface TransactionScope {
  active: boolean;
  readOnly: boolean;
  connection: SqliteConnection;
  committed: (() => void)[];
  rolledBack: (() => void)[];
}

/** Keep native SQLite work off the host thread while retaining the canonical SQL port's
 * WAL snapshots, publication hooks and bounded admission. A snapshot has its own read-only
 * connection; ordinary reads still serialize with the writer's complete transactions.
 * docs/performance.md#sqlite-worker-isolation
 */
export class SqliteDatabase implements SqlDatabase {
  private readonly writer: SqliteConnection;
  private reader?: SqliteConnection;
  private readonly writeLane = new WorkLane('sqlite', 512);
  private readonly readLane = new WorkLane('sqlite.read', 512);
  private readonly context = new AsyncLocalStorage<TransactionScope>();
  private closing = false;
  private closeResult?: Promise<void>;

  constructor(
    private readonly path: string,
    private readonly readOnly = false,
  ) {
    this.writer = new SqliteConnection(path, readOnly);
  }

  private get connection(): SqliteConnection {
    const scope = this.context.getStore();
    // Detached callbacks must rejoin admission after their transaction ends.
    return scope?.active ? scope.connection : this.writer;
  }

  private run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.context.getStore()?.active) return Promise.resolve().then(operation);
    if (this.closing) return Promise.reject(new Error('SQLite connection is closing.'));
    return this.writeLane.run(operation);
  }

  afterCommit(callback: () => void): void {
    const scope = this.context.getStore();
    if (scope?.active) scope.committed.push(callback);
    else callback();
  }

  afterRollback(callback: () => void): void {
    const scope = this.context.getStore();
    if (scope?.active) scope.rolledBack.push(callback);
  }

  transaction<T>(operation: () => Promise<T>): Promise<T> {
    const scope = this.context.getStore();
    if (scope?.active) {
      if (scope.readOnly) return Promise.reject(new Error('A read snapshot cannot admit writes.'));
      return operation();
    }
    return this.run(() => this.withTransaction(this.writer, this.readOnly, operation));
  }

  readTransaction<T>(operation: () => Promise<T>): Promise<T> {
    if (this.context.getStore()?.active) return operation();
    if (this.closing) return Promise.reject(new Error('SQLite connection is closing.'));
    // Independent :memory: connections are different databases.
    if (this.path === ':memory:')
      return this.run(() => this.withTransaction(this.writer, true, operation));
    return this.readLane.run(() => {
      this.reader ??= new SqliteConnection(this.path, true);
      return this.withTransaction(this.reader, true, operation);
    });
  }

  private withTransaction<T>(
    connection: SqliteConnection,
    readOnly: boolean,
    operation: () => Promise<T>,
  ): Promise<T> {
    const scope: TransactionScope = {
      active: true,
      readOnly,
      connection,
      committed: [],
      rolledBack: [],
    };
    return this.context.run(scope, async () => {
      let result: T;
      try {
        await timed('sqlite.begin', () =>
          connection.request<void>('exec', readOnly ? 'BEGIN' : 'BEGIN IMMEDIATE'),
        );
        try {
          result = await operation();
          await timed('sqlite.commit', () => connection.request<void>('exec', 'COMMIT'));
        } catch (error) {
          try {
            await timed('sqlite.rollback', () => connection.request<void>('exec', 'ROLLBACK'));
          } catch (rollbackError) {
            connection.fail(
              new Error('SQLite transaction outcome is unavailable; restart and reconcile.', {
                cause: rollbackError,
              }),
            );
          }
          scope.active = false;
          for (const callback of scope.rolledBack) callback();
          throw error;
        }
      } finally {
        scope.active = false;
      }
      // Publication callbacks run only after successful COMMIT, outside its rollback path.
      for (const callback of scope.committed) callback();
      return result;
    });
  }

  exec(sql: string): Promise<void> {
    return this.run(() => this.connection.request<void>('exec', sql));
  }

  prepare(sql: string) {
    return {
      get: (...params: unknown[]) =>
        this.run(() =>
          timed('sqlite.statement', () =>
            this.connection.request<Record<string, unknown> | undefined>('get', sql, params),
          ),
        ),
      all: (...params: unknown[]) =>
        this.run(() =>
          timed('sqlite.statement', () =>
            this.connection.request<Record<string, unknown>[]>('all', sql, params),
          ),
        ),
      run: (...params: unknown[]) =>
        this.run(() =>
          timed('sqlite.statement', () => this.connection.request<unknown>('run', sql, params)),
        ),
    };
  }

  close(): Promise<void> {
    if (this.context.getStore()?.active)
      return Promise.reject(new Error('Close SQLite after the transaction completes.'));
    if (this.closeResult) return this.closeResult;
    this.closing = true;
    return (this.closeResult = (async () => {
      await Promise.all([this.writeLane.idle(), this.readLane.idle()]);
      const results = await Promise.allSettled([this.writer.close(), this.reader?.close()]);
      for (const result of results) if (result.status === 'rejected') throw result.reason;
    })());
  }
}
