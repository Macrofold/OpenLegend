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

/** Admission expires only queued work. Executing mutations always settle normally.
 * docs/performance.md#bounded-admission */
export class WorkLane {
  private pending: {
    start: () => void;
    expire: () => void;
    maintenance: boolean;
    queuedAt: number;
  }[] = [];
  private foregroundBatches = 0;
  private running = false;
  private waiters: (() => void)[] = [];
  constructor(
    private readonly name: string,
    private readonly maximum = 256,
    readonly waitMs = 5000,
  ) {}
  get depth() {
    return this.pending.length;
  }
  idle(): Promise<void> {
    return this.running || this.pending.length
      ? new Promise((resolve) => this.waiters.push(resolve))
      : Promise.resolve();
  }
  /** `waitMs` narrows the admission deadline for a caller that already waited elsewhere. */
  run<T>(operation: () => T | Promise<T>, waitMs = this.waitMs, maintenance = false): Promise<T> {
    if (this.pending.length >= this.maximum || waitMs <= 0)
      return Promise.reject(new OverloadError());
    const queuedAt = performance.now();
    const measured = beginTiming(queuedAt);
    // A queued operation belongs to its submitter, not whoever finishes before it.
    // Preserve request/diagnostic/transaction contexts across the queue boundary.
    const run = AsyncLocalStorage.bind(operation);
    return new Promise<T>((resolve, reject) => {
      const entry = {
        maintenance,
        queuedAt,
        start: () => {
          clearTimeout(timer);
          const admittedAt = performance.now();
          const waited = admittedAt - queuedAt;
          const measuredWait = elapsedTiming(measured, admittedAt);
          if (measuredWait !== undefined) recordDuration(`${this.name}.wait`, measuredWait);
          // Timers cannot fire during synchronous native work; check age on admission too.
          if (waited > waitMs) {
            reject(new OverloadError());
            this.finish();
            return;
          }
          Promise.resolve()
            .then(run)
            .then(resolve, reject)
            .finally(() => this.finish());
        },
        expire: () => {
          const index = this.pending.indexOf(entry);
          if (index < 0) return;
          this.pending.splice(index, 1);
          reject(new OverloadError());
        },
      };
      const timer = setTimeout(entry.expire, waitMs);
      timer.unref();
      this.pending.push(entry);
      this.pump();
    });
  }
  private pump() {
    if (this.running) return;
    const maintenance = this.pending.findIndex((entry) => entry.maintenance);
    const foreground = this.pending.findIndex((entry) => !entry.maintenance);
    const due =
      maintenance >= 0 &&
      (this.foregroundBatches >= 10 ||
        performance.now() - this.pending[maintenance]!.queuedAt >= 1000);
    const index = due ? maintenance : foreground >= 0 ? foreground : maintenance;
    const next = index < 0 ? undefined : this.pending.splice(index, 1)[0];
    if (next) this.foregroundBatches = next.maintenance ? 0 : this.foregroundBatches + 1;
    if (next) {
      this.running = true;
      next.start();
    } else for (const resolve of this.waiters.splice(0)) resolve();
  }
  private finish() {
    this.running = false;
    this.pump();
  }
}
