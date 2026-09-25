from pathlib import Path

Path('apps/server/src/sqlite-database.ts').write_text('''import { timed, recordDuration } from './performance.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Worker } from 'node:worker_threads';
import type { SqlDatabase } from './store.js';

type Operation = 'exec' | 'get' | 'all' | 'run' | 'close';
type Reply = { kind: 'ready' } | {
  kind: 'result'; id: number; value?: unknown; elapsedMs: number;
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
  private closeResult?: Promise<void>;
  private readonly pending = new Map<number, {
    resolve(value: unknown): void; reject(error: Error): void;
  }>();
  private resolveReady!: () => void;
  private rejectReady!: (error: Error) => void;
  private readonly ready = new Promise<void>((resolve, reject) => {
    this.resolveReady = resolve;
    this.rejectReady = reject;
  });

  constructor(path: string) {
    // Native .mjs avoids a second TypeScript loader and inherits no profiler/preload arguments.
    this.worker = new Worker(new URL('./sqlite-worker.mjs', import.meta.url), {
      workerData: { path }, execArgv: [],
    });
    this.ready.catch(() => undefined);
    this.worker.on('message', (reply: Reply) => {
      if (reply.kind === 'ready') { this.resolveReady(); return; }
      const call = this.pending.get(reply.id);
      if (!call) return;
      this.pending.delete(reply.id);
      recordDuration('sqlite.workerExecution', reply.elapsedMs);
      if (reply.error) call.reject(Object.assign(new Error(reply.error.message), reply.error));
      else call.resolve(reply.value);
    });
    this.worker.on('error', error => this.fail(error));
    this.worker.on('exit', code => {
      if (!this.closing || this.pending.size)
        this.fail(new Error(`SQLite worker exited (${code}); reconcile durable state before restarting.`));
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
      this.pending.set(id, { resolve: value => resolve(value as T), reject });
      try { this.worker.postMessage({ id, operation, sql, params }); }
      catch (error) { this.pending.delete(id); reject(error); }
    });
  }

  private run<T>(operation: () => T | Promise<T>): Promise<T> {
    if (this.context.getStore()?.active) return Promise.resolve().then(operation);
    if (this.closing) return Promise.reject(new Error('SQLite connection is closing.'));
    const next = this.tail.then(operation);
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
            try { await timed('sqlite.rollback', () => this.request<void>('exec', 'ROLLBACK')); }
            catch (rollbackError) {
              this.fail(new Error('SQLite transaction outcome is unavailable; restart and reconcile.', { cause: rollbackError }));
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
      get: (...params: any[]) => this.run(() => timed('sqlite.statement', () =>
        this.request<Record<string, unknown> | undefined>('get', sql, params))),
      all: (...params: any[]) => this.run(() => timed('sqlite.statement', () =>
        this.request<Record<string, unknown>[]>('all', sql, params))),
      run: (...params: any[]) => this.run(() => timed('sqlite.statement', () =>
        this.request<unknown>('run', sql, params))),
    };
  }
  close(): Promise<void> {
    if (this.closeResult) return this.closeResult;
    this.closing = true;
    return this.closeResult = (async () => {
      try { await this.tail; await this.request<void>('close'); }
      finally { await this.worker.terminate(); }
    })();
  }
}
''')

Path('apps/server/src/sqlite-worker.mjs').write_text('''import { DatabaseSync } from 'node:sqlite';
import { parentPort, workerData } from 'node:worker_threads';

if (!parentPort || typeof workerData?.path !== 'string') throw Error('SQLite worker requires a database path.');
const db = new DatabaseSync(workerData.path);
const statements = new Map();
const MAX_STATEMENTS = 128;

// Bounded exact-SQL cache; parameters are never cached or logged.
function prepare(sql) {
  let statement = statements.get(sql);
  if (statement) statements.delete(sql);
  else statement = db.prepare(sql);
  statements.set(sql, statement);
  if (statements.size > MAX_STATEMENTS) statements.delete(statements.keys().next().value);
  return statement;
}
parentPort.on('message', ({ id, operation, sql, params }) => {
  const started = performance.now();
  let value, error;
  try {
    switch (operation) {
      case 'exec':
        // DDL/PRAGMA can change preparation behavior. Transaction boundaries cannot.
        if (!['BEGIN IMMEDIATE', 'COMMIT', 'ROLLBACK'].includes(sql)) statements.clear();
        db.exec(sql);
        break;
      case 'get': value = prepare(sql).get(...params); break;
      case 'all': value = prepare(sql).all(...params); break;
      case 'run': value = prepare(sql).run(...params); break;
      case 'close': statements.clear(); db.close(); break;
      default: throw Error('Unknown SQLite worker operation.');
    }
  } catch (cause) {
    error = { message: cause instanceof Error ? cause.message : String(cause),
      ...(typeof cause?.code === 'string' ? { code: cause.code } : {}),
      ...(typeof cause?.errcode === 'number' ? { errcode: cause.errcode } : {}),
      ...(typeof cause?.errstr === 'string' ? { errstr: cause.errstr } : {}),
    };
  }
  parentPort.postMessage({ kind: 'result', id, value, error, elapsedMs: performance.now() - started });
  if (operation === 'close') parentPort.close();
});
parentPort.postMessage({ kind: 'ready' });
''')

p=Path('docs/performance.md');p.write_text(p.read_text().rstrip()+'''\n\n## SQLite worker isolation\n\nMeasured dense SQLite preparation/commit stalls justify a long-lived worker owning the existing single local database connection. `SqliteDatabase` preserves the `SqlDatabase` interface and serialized transaction lane. Only SQL and bounded parameter batches cross the worker boundary; no live world, provider credentials or second authoritative store is introduced. The worker executes calls in order, caches at most 128 exact prepared statements, and clears preparation on non-transaction `exec`. The adapter bounds transaction-local pending requests to 128. This is not a new actor/world limit.\n\nUnrelated database reads queue behind an open transaction; in-memory HTTP/SSE reads use the previous complete snapshot. No request may observe a half-written history. COMMIT acknowledgement still gates confirmed commands. Worker failure rejects pending work and requires existing durable-state reconciliation; it never automatically restarts/replays a write. Native transition state and SQL remain single-writer, and shutdown drains admitted work before closing the connection. The PostgreSQL adapter and durability/crash-loss policy are unchanged.\n\n`sqlite.statement` includes transport/wait time; `sqlite.workerExecution` measures worker-side execution separately. Worker isolation is not itself a throughput claim. SQL preparation, callback construction, candidate finalization, large result transfer and JSON encoding still require measurement. A readonly auxiliary connection and journal-first asynchronous projections remain separately gated.\n''')
p=Path('docs/architecture.md');p.write_text(p.read_text().rstrip()+'''\n\n## Local SQLite execution\n\nThe local SQLite adapter now owns its one connection in `sqlite-worker.mjs`. The existing transaction lane gates both writes and unrelated reads, and detached asynchronous callbacks lose transaction authority after completion. Bounded parameter batches and result messages cross the boundary; no world snapshot is sent per statement. COMMIT acknowledgement precedes command success. Worker exit/error fences further work without automatic replay; shutdown drains admitted work. The worker's 128-entry statement cache stores no bound values and is cleared on non-transaction `exec`. PostgreSQL retains its existing adapter. Remaining encoding/native CPU and large-result transfer are not solved merely by off-thread SQLite execution.\n''')
p=Path('docs/maintainers/performance.md');s=p.read_text().replace('- [ ] DP04 — Qualify residual blocking and introduce database/CPU isolation only at PF10\'s measured gate. Do not create a second writer or acknowledge uncommitted actions.', '- [x] DP04 — Introduce single-connection SQLite worker isolation at the measured dense-commit gate. Preserve serialized reads, COMMIT acknowledgement and fail-closed reconciliation; broader CPU-worker/auxiliary-reader work remains PF10/PF04-gated.');p.write_text(s)
p=Path('docs/maintainers/TODO.md');p.write_text(p.read_text().rstrip()+'''\n- [ ] DP-R06 — Cover SQLite worker initialization/query/BEGIN/COMMIT/ROLLBACK failures, lost replies, process/thread exit, bounded pending requests, statement cache eviction/DDL invalidation, nested transactions, detached callbacks and concurrent shutdown. No retry may duplicate an uncertain durable write.\n- [ ] DP-R07 — Cover unrelated reads waiting for complete commit/rollback, actual SQL state after failure, no partial HTTP/SSE world, long-result backpressure, portable SQLite/PG semantics and exact close/drain behavior.\n''')
