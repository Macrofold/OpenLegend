import { timed, recordDuration, gaugeMetric } from './performance.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Worker } from 'node:worker_threads';
import type { SqlDatabase } from './store.js';

type Operation = 'exec' | 'get' | 'all' | 'run' | 'close';
type Reply =
  | { kind: 'ready' }
  | {
      kind: 'result';
      id: number;
      value?: unknown;
      elapsedMs: number;
      error?: { message: string; code?: string; errcode?: number; errstr?: string };
    };

/** One local writer connection, moved off-thread rather than duplicated. Transaction-scoped
 * calls share the existing lane; unrelated reads wait for COMMIT/ROLLBACK.
 * docs/performance.md#sqlite-worker-isolation
 */
export class SqliteDatabase implements SqlDatabase {
  private readonly worker: Worker;
  private tail: Promise<unknown> = Promise.resolve();
  private readonly context = new AsyncLocalStorage<{ active: boolean }>();
  private serial = 0;
  private fatal?: Error;
  private closing = false;
  private closed = false;
  private queued = 0;
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

  constructor(path: string) {
    // Native .mjs avoids a second TypeScript loader and inherits no profiler/preload arguments.
    this.worker = new Worker(new URL('./sqlite-worker.mjs', import.meta.url), {
      workerData: { path },
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

  private fail(error: Error): void {
    this.fatal ??= error;
    this.rejectReady(this.fatal);
    for (const call of this.pending.values()) call.reject(this.fatal);
    this.pending.clear();
  }

  private async request<T>(operation: Operation, sql = '', params: unknown[] = []): Promise<T> {
    await this.ready;
    if (this.fatal) throw this.fatal;
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

  private run<T>(operation: () => T | Promise<T>): Promise<T> {
    if (this.context.getStore()?.active) return Promise.resolve().then(operation);
    if (this.closing) return Promise.reject(new Error('SQLite connection is closing.'));
    if (this.fatal) return Promise.reject(this.fatal);
    // A slow transaction must not retain an unlimited queue of optional reads/requests.
    if (this.queued >= 256) return Promise.reject(new Error('SQLite admission queue is full.'));
    gaugeMetric('sqlite.queuedOperations', ++this.queued);
    const next = this.tail.then(operation).finally(() => {
      gaugeMetric('sqlite.queuedOperations', --this.queued);
    });
    this.tail = next.catch(() => undefined);
    return next;
  }

  transaction<T>(operation: () => Promise<T>): Promise<T> {
    if (this.context.getStore()?.active) return operation();
    return this.run(() => {
      const scope = { active: true };
      return this.context.run(scope, async () => {
        try {
          await timed('sqlite.begin', () => this.request<void>('exec', 'BEGIN IMMEDIATE'));
          try {
            const result = await operation();
            await timed('sqlite.commit', () => this.request<void>('exec', 'COMMIT'));
            return result;
          } catch (error) {
            try {
              await timed('sqlite.rollback', () => this.request<void>('exec', 'ROLLBACK'));
            } catch (rollbackError) {
              this.fail(
                new Error('SQLite transaction outcome is unavailable; restart and reconcile.', {
                  cause: rollbackError,
                }),
              );
              void this.worker.terminate();
            }
            throw error;
          }
        } finally {
          // Detached asynchronous callbacks cannot retain a past transaction's ownership.
          scope.active = false;
        }
      });
    });
  }

  exec(sql: string): Promise<void> {
    return this.run(() => this.request<void>('exec', sql));
  }
  prepare(sql: string) {
    return {
      get: (...params: any[]) =>
        this.run(() =>
          timed('sqlite.statement', () =>
            this.request<Record<string, unknown> | undefined>('get', sql, params),
          ),
        ),
      all: (...params: any[]) =>
        this.run(() =>
          timed('sqlite.statement', () =>
            this.request<Record<string, unknown>[]>('all', sql, params),
          ),
        ),
      run: (...params: any[]) =>
        this.run(() => timed('sqlite.statement', () => this.request<unknown>('run', sql, params))),
    };
  }
  close(): Promise<void> {
    if (this.context.getStore()?.active)
      return Promise.reject(new Error('Close SQLite after the transaction completes.'));
    if (this.closeResult) return this.closeResult;
    this.closing = true;
    return (this.closeResult = (async () => {
      try {
        await this.tail;
        await this.request<void>('close');
        this.closed = true;
      } finally {
        await this.worker.terminate();
      }
    })());
  }
}
