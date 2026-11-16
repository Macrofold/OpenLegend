import { recordDuration, beginTiming, elapsedTiming } from './performance.js';
import { AsyncLocalStorage } from 'node:async_hooks';

export class OverloadError extends Error {
  readonly code = 'busy';
  constructor() {
    super(
      'The server is busy. No automatic retry was submitted. Check the action status before retrying.',
    );
  }
}

/** The native pool refuses before enqueueing. QueueFull alone also describes
 * unrelated NAPI callback queues, whose failures must not become safe retries. */
export function isOverloadError(
  error: unknown,
): error is
  | OverloadError
  | (Error & { code: 'QueueFull'; message: 'native host compute capacity is busy' }) {
  return (
    error instanceof OverloadError ||
    (error instanceof Error &&
      'code' in error &&
      error.code === 'QueueFull' &&
      error.message === 'native host compute capacity is busy')
  );
}

interface PendingWork {
  start(): void;
  rejectQueued(error: unknown): void;
  maintenance: boolean;
  progress: boolean;
  queuedAt: number;
  scope?: string;
}

/** Admission expires only queued work. Executing mutations always settle normally.
 * docs/performance.md#bounded-admission */
export class WorkLane {
  private pending: PendingWork[] = [];
  private foregroundBatches = 0;
  private running = 0;
  private readonly activeScopes?: Set<string>;
  private waiters: (() => void)[] = [];
  constructor(
    private readonly name: string,
    private readonly maximum = 256,
    readonly waitMs = 5000,
    private readonly width = 1,
  ) {
    if (width > 1) this.activeScopes = new Set();
  }
  get depth() {
    return this.pending.length;
  }
  /** Save acknowledgements and routine progress do not interrupt an elapsed
   * batch. This classification never changes queue order or admission. */
  get waitingForeground(): boolean {
    return this.pending.some((entry) => !entry.maintenance && !entry.progress);
  }
  idle(): Promise<void> {
    return this.running || this.pending.length
      ? new Promise((resolve) => this.waiters.push(resolve))
      : Promise.resolve();
  }
  /** `waitMs` narrows the admission deadline for a caller that already waited elsewhere. */
  run<T>(
    operation: () => T | Promise<T>,
    waitMs = this.waitMs,
    maintenance = false,
    progress = false,
  ): Promise<T> {
    return this.enqueue(operation, waitMs, maintenance, progress);
  }

  /** The player projection lane holds one slot per exact request scope through
   * completion. A canceled waiter leaves the queue without starting; once
   * admitted the operation owns its slot through settlement and cleanup. */
  runScoped<T>(
    scope: string,
    signal: AbortSignal | undefined,
    operation: () => T | Promise<T>,
  ): Promise<T> {
    return this.enqueue(operation, this.waitMs, false, false, scope, signal);
  }

  private enqueue<T>(
    operation: () => T | Promise<T>,
    waitMs: number,
    maintenance: boolean,
    progress: boolean,
    scope?: string,
    signal?: AbortSignal,
  ): Promise<T> {
    if (signal?.aborted) return Promise.reject(signal.reason);
    if (this.pending.length >= this.maximum || waitMs <= 0)
      return Promise.reject(new OverloadError());
    const queuedAt = performance.now();
    const measured = beginTiming(queuedAt);
    // A queued operation belongs to its submitter, not whoever finishes before it.
    // Preserve request/diagnostic/transaction contexts across the queue boundary.
    const run = AsyncLocalStorage.bind(operation);
    return new Promise<T>((resolve, reject) => {
      const canceled = () => entry.rejectQueued(signal?.reason);
      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', canceled);
      };
      const entry: PendingWork = {
        maintenance,
        progress,
        queuedAt,
        scope,
        start: () => {
          cleanup();
          const admittedAt = performance.now();
          const waited = admittedAt - queuedAt;
          const measuredWait = elapsedTiming(measured, admittedAt);
          if (measuredWait !== undefined) recordDuration(`${this.name}.wait`, measuredWait);
          // Timers cannot fire during synchronous native work; check age on admission too.
          if (waited > waitMs) {
            reject(new OverloadError());
            this.finish(scope);
            return;
          }
          Promise.resolve()
            .then(
              signal
                ? () => {
                    signal.throwIfAborted();
                    return run();
                  }
                : run,
            )
            .then(resolve, reject)
            .finally(() => this.finish(scope));
        },
        rejectQueued: (error) => {
          const index = this.pending.indexOf(entry);
          if (index < 0) return;
          this.pending.splice(index, 1);
          cleanup();
          reject(error);
          if (this.activeScopes) this.pump();
        },
      };
      const timer = setTimeout(() => entry.rejectQueued(new OverloadError()), waitMs);
      timer.unref();
      signal?.addEventListener('abort', canceled, { once: true });
      this.pending.push(entry);
      this.pump();
    });
  }
  private pump() {
    if (this.activeScopes) {
      while (this.running < this.width && this.startNext()) {
        // Retain the active scope until its complete operation settles.
      }
    } else if (!this.running) this.startNext();
    if (!this.running && !this.pending.length)
      for (const resolve of this.waiters.splice(0)) resolve();
  }
  private startNext(): boolean {
    const activeScopes = this.activeScopes;
    const eligible = (entry: PendingWork) =>
      entry.scope === undefined || !activeScopes?.has(entry.scope);
    const maintenance = activeScopes
      ? this.pending.findIndex((entry) => entry.maintenance && eligible(entry))
      : this.pending.findIndex((entry) => entry.maintenance);
    const foreground = activeScopes
      ? this.pending.findIndex((entry) => !entry.maintenance && eligible(entry))
      : this.pending.findIndex((entry) => !entry.maintenance);
    const due =
      maintenance >= 0 &&
      (this.foregroundBatches >= 10 ||
        performance.now() - this.pending[maintenance]!.queuedAt >= 1000);
    const index = due ? maintenance : foreground >= 0 ? foreground : maintenance;
    const next = index < 0 ? undefined : this.pending.splice(index, 1)[0];
    if (!next) return false;
    this.foregroundBatches = next.maintenance ? 0 : this.foregroundBatches + 1;
    this.running++;
    if (next.scope !== undefined) activeScopes?.add(next.scope);
    next.start();
    return true;
  }
  private finish(scope?: string) {
    this.running--;
    if (scope !== undefined) this.activeScopes?.delete(scope);
    this.pump();
  }
}
