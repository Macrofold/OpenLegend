import { NetworkError, networkError, type NetworkPhase } from './errors.js';

export interface NetworkClock {
  wallNow(): number;
  monotonicNow(): number;
}
export interface NetworkScheduler {
  schedule(delayMs: number, callback: () => void): () => void;
}
export interface LifetimeBudget {
  timeoutMs: number;
  deadlineAtMs?: number;
  signal?: AbortSignal;
}
export const systemClock: NetworkClock = {
  wallNow: () => Date.now(),
  monotonicNow: () => performance.now(),
};
export const systemScheduler: NetworkScheduler = {
  schedule(delayMs, callback) {
    const timer = globalThis.setTimeout(callback, delayMs);
    return () => globalThis.clearTimeout(timer);
  },
};
export function validateDuration(duration: number): void {
  if (!Number.isSafeInteger(duration) || duration <= 0)
    throw new RangeError('Network duration must be a positive safe integer');
}

/** The shared deadline, cancellation and exactly-once settlement kernel. HTTP,
 * streams and scalar SDK owners build ownership on this same implementation. */
export const LIFETIME_PENDING = 0;
const LIFETIME_SUCCEEDED = 1,
  LIFETIME_STOPPED = 2;
// The reserved __ names are internal, including adapter-facing methods. The
// small cloud artifact can shorten them without changing any SDK, error, event
// or public operation property. OperationScope preserves its reviewed adapter
// API through delegations; both owners execute this one cancellation/race kernel.
export class FiniteLifetime {
  readonly __controller = new AbortController();
  readonly signal = this.__controller.signal;
  protected __wallExpiry: number;
  protected __monoExpiry: number;
  protected __state: 0 | 1 | 2 = LIFETIME_PENDING;
  protected __phase: NetworkPhase = 'admission';
  protected __started = false;
  protected __observedStatus?: number;
  protected __cancelTimer?: () => void;
  protected __terminal?: () => void;
  private __cause?: NetworkError;
  private readonly __externalSignals: AbortSignal[];
  private readonly __stopListeners = new Set<(error: NetworkError) => void>();
  private readonly __removeListeners: (() => void)[] = [];
  constructor(
    budget: LifetimeBudget,
    readonly __clock: NetworkClock,
    readonly __scheduler: NetworkScheduler,
    private readonly __parent?: FiniteLifetime,
  ) {
    validateDuration(budget.timeoutMs);
    if (budget.deadlineAtMs !== undefined && !Number.isFinite(budget.deadlineAtMs))
      throw new RangeError('Network absolute deadline must be finite');
    const wall = __clock.wallNow();
    const duration = Math.min(
      budget.timeoutMs,
      budget.deadlineAtMs === undefined ? budget.timeoutMs : budget.deadlineAtMs - wall,
      __parent?.__remainingMs() ?? budget.timeoutMs,
    );
    this.__wallExpiry = wall + duration;
    this.__monoExpiry = __clock.monotonicNow() + duration;
    if (
      Math.abs(this.__wallExpiry) > Number.MAX_SAFE_INTEGER ||
      Math.abs(this.__monoExpiry) > Number.MAX_SAFE_INTEGER
    )
      throw new RangeError('Network deadline exceeds the representable clock range');
    this.__externalSignals = [budget.signal, __parent?.signal].filter(
      (signal): signal is AbortSignal => signal !== undefined,
    );
    for (const signal of this.__externalSignals) {
      const listener = () => {
        this.__check();
        if (this.__state === LIFETIME_PENDING) this.__stop('cancelled');
      };
      signal.addEventListener('abort', listener, { once: true });
      this.__removeListeners.push(() => signal.removeEventListener('abort', listener));
    }
    this.__check();
    if (this.__state === LIFETIME_PENDING) this.__arm();
  }
  get __deadlineAtMs(): number {
    return this.__wallExpiry;
  }
  __remainingMs(): number {
    return this.__state !== LIFETIME_PENDING
      ? 0
      : Math.max(
          0,
          Math.min(
            this.__wallExpiry - this.__clock.wallNow(),
            this.__monoExpiry - this.__clock.monotonicNow(),
            this.__parent?.__remainingMs() ?? Number.MAX_SAFE_INTEGER,
          ),
        );
  }
  __check(): void {
    if (this.__state !== LIFETIME_PENDING) return;
    if (this.__parent) {
      try {
        this.__parent.throwIfStopped();
      } catch (error) {
        this.__stopWith(networkError(error, this.__phase, this.__dispatch));
        return;
      }
    }
    if (
      this.__clock.wallNow() >= this.__wallExpiry ||
      this.__clock.monotonicNow() >= this.__monoExpiry
    )
      this.__stop('deadline_exceeded');
    else if (this.__externalSignals.some((signal) => signal.aborted)) this.__stop('cancelled');
  }
  throwIfStopped(): void {
    this.__check();
    if (this.__state === LIFETIME_STOPPED) throw this.__cause;
    if (this.__state === LIFETIME_SUCCEEDED)
      throw new NetworkError('operation_closed', this.__phase, this.__dispatch);
  }
  get __dispatch(): 'not_started' | 'started' {
    return this.__started ? 'started' : 'not_started';
  }
  __onStop(listener: (error: NetworkError) => void): () => void {
    this.__check();
    if (this.__state === LIFETIME_STOPPED && this.__cause) listener(this.__cause);
    else if (this.__state === LIFETIME_PENDING) this.__stopListeners.add(listener);
    return () => this.__stopListeners.delete(listener);
  }
  __guard<T>(__phase: NetworkPhase, promise: Promise<T>, sanitize = true): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const removeStop = this.__onStop((error) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      });
      promise.then(
        (value) => {
          if (settled) return;
          try {
            this.throwIfStopped();
            settled = true;
            removeStop();
            resolve(value);
          } catch (error) {
            settled = true;
            removeStop();
            reject(error);
          }
        },
        (error: unknown) => {
          if (settled) return;
          settled = true;
          removeStop();
          try {
            this.throwIfStopped();
            reject(sanitize ? networkError(error, __phase, this.__dispatch) : error);
          } catch (stopped) {
            reject(stopped);
          }
        },
      );
    });
  }
  __stop(kind: 'cancelled' | 'deadline_exceeded'): void {
    this.__stopWith(new NetworkError(kind, this.__phase, this.__dispatch, this.__observedStatus));
  }
  protected __stopWith(error: NetworkError): void {
    if (this.__state !== LIFETIME_PENDING) return;
    this.__state = LIFETIME_STOPPED;
    this.__cause = error;
    this.__finish(error);
  }
  protected __succeed(): void {
    this.throwIfStopped();
    this.__state = LIFETIME_SUCCEEDED;
    this.__finish(
      new NetworkError('operation_closed', this.__phase, this.__dispatch, this.__observedStatus),
    );
  }
  private __finish(error: NetworkError): void {
    this.__terminal?.();
    this.__disposeObservers();
    this.__controller.abort(error);
    for (const listener of this.__stopListeners) listener(error);
    this.__stopListeners.clear();
  }
  private __disposeObservers(): void {
    this.__cancelTimer?.();
    this.__cancelTimer = undefined;
    for (const remove of this.__removeListeners.splice(0)) remove();
  }
  protected __arm(): void {
    this.__cancelTimer = this.__scheduler.schedule(
      Math.min(2_147_483_647, Math.ceil(this.__remainingMs())),
      () => {
        this.__cancelTimer = undefined;
        this.__check();
        if (this.__state === LIFETIME_PENDING) this.__arm();
      },
    );
  }
}
