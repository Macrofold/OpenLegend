import { NetworkError, networkError, type NetworkPhase } from './errors.js';
import {
  FiniteLifetime,
  LIFETIME_PENDING,
  systemClock,
  systemScheduler,
  validateDuration,
  type NetworkClock,
  type NetworkScheduler,
} from './lifetime.js';
export { systemClock, systemScheduler, validateDuration };
export type { NetworkClock, NetworkScheduler };

export interface FiniteBudget {
  timeoutMs: number;
  deadlineAtMs?: number;
  signal?: AbortSignal;
  parent?: NetworkOperation;
}

export interface NetworkOperation {
  readonly signal: AbortSignal;
  readonly deadlineAtMs: number;
  remainingMs(): number;
  throwIfStopped(): void;
  wait<T>(phase: NetworkPhase, start: (signal: AbortSignal) => Promise<T>): Promise<T>;
  within<T>(timeoutMs: number, work: (operation: NetworkOperation) => Promise<T>): Promise<T>;
}

export interface ConsumptionContext {
  readonly signal: AbortSignal;
  throwIfStopped(): void;
}

export interface Activity {
  finish(): void;
  quarantine(): void;
}

/** Internal lease shared by short sequential phases; never a public admission bypass. */
export interface OperationLease {
  activity(resource?: boolean): Activity;
  resourcesClosed(): Promise<void>;
}

export type NetworkFetch = (input: string, init: RequestInit) => Promise<Response>;

const internals = new WeakMap<NetworkOperation, OperationScope>();

export function scopeOf(operation: NetworkOperation): OperationScope {
  const scope = internals.get(operation);
  if (!scope) throw new TypeError('Operation must be admitted by a network owner');
  return scope;
}

export class OperationScope extends FiniteLifetime implements NetworkOperation {
  private readonly operationParent?: OperationScope;
  private resources = 0;
  private readonly retainedPhases = new Set<OperationScope>();
  private httpActivities = 0;

  constructor(
    budget: FiniteBudget,
    readonly lease: OperationLease,
    readonly clock: NetworkClock,
    readonly scheduler: NetworkScheduler,
    readonly transport: NetworkFetch,
  ) {
    const parent = budget.parent ? scopeOf(budget.parent) : undefined;
    super(budget, clock, scheduler, parent);
    this.operationParent = parent;
    internals.set(this, this);
    this.__terminal = () => {
      if (this.resources > 0) this.operationParent?.retainedPhases.add(this);
    };
  }

  get deadlineAtMs(): number {
    return this.__deadlineAtMs;
  }
  remainingMs(): number {
    return this.__remainingMs();
  }
  check(): void {
    this.__check();
  }
  get dispatch(): 'not_started' | 'started' {
    return this.__dispatch;
  }
  onStop(listener: (error: NetworkError) => void): () => void {
    return this.__onStop(listener);
  }
  guard<T>(phase: NetworkPhase, promise: Promise<T>, sanitize = true): Promise<T> {
    return this.__guard(phase, promise, sanitize);
  }
  stop(kind: 'cancelled' | 'deadline_exceeded'): void {
    this.__stop(kind);
  }

  /** Internal continuous-subscription window; finite callers never receive this method. */
  renewWindow(timeoutMs: number): void {
    this.throwIfStopped();
    validateDuration(timeoutMs);
    if (this.operationParent)
      throw new TypeError('Only a root subscription may renew its heartbeat window');
    this.__wallExpiry = this.clock.wallNow() + timeoutMs;
    this.__monoExpiry = this.clock.monotonicNow() + timeoutMs;
    this.__cancelTimer?.();
    this.__arm();
  }

  markStarted(phase: NetworkPhase): void {
    this.throwIfStopped();
    if (phase === 'connect' || phase === 'credentials' || phase === 'subprocess') {
      if (this.httpActivities > 0) {
        throw new NetworkError(
          'capacity_unavailable',
          'admission',
          this.dispatch,
          this.__observedStatus,
        );
      }
      for (const child of this.retainedPhases) {
        if (child.resources > 0)
          throw new NetworkError('capacity_unavailable', 'admission', this.dispatch);
        this.retainedPhases.delete(child);
      }
    }
    this.__phase = phase;
    if (phase !== 'admission' && phase !== 'callback' && phase !== 'cleanup') this.__started = true;
  }

  observeStatus(status: number | undefined): void {
    this.__observedStatus = status;
    this.operationParent?.observeStatus(status);
  }

  activity(): Activity {
    const underlying = this.lease.activity();
    this.resources++;
    let done = false;
    return {
      finish: () => {
        if (done) return;
        done = true;
        this.resources--;
        underlying.finish();
      },
      quarantine: () => underlying.quarantine(),
    };
  }

  httpActivity(): Activity {
    const underlying = this.activity();
    this.httpActivities++;
    let done = false;
    return {
      finish: () => {
        if (done) return;
        done = true;
        this.httpActivities--;
        underlying.finish();
      },
      quarantine: () => underlying.quarantine(),
    };
  }

  async wait<T>(phase: NetworkPhase, start: (signal: AbortSignal) => Promise<T>): Promise<T> {
    return this.observe(phase, start, true);
  }

  observe<T>(
    phase: NetworkPhase,
    start: (signal: AbortSignal) => Promise<T>,
    sanitize: boolean,
  ): Promise<T> {
    this.markStarted(phase);
    const activity = this.activity();
    let raw: Promise<T>;
    try {
      raw = start(this.signal);
    } catch (error) {
      activity.finish();
      return Promise.reject(sanitize ? networkError(error, phase, this.dispatch) : error);
    }
    // Register settlement before exposing the race. Losing rejections stay handled.
    const observed = Promise.resolve(raw).then(
      (value) => {
        activity.finish();
        return value;
      },
      (error: unknown) => {
        activity.finish();
        throw sanitize ? networkError(error, phase, this.dispatch) : error;
      },
    );
    return this.guard(phase, observed, sanitize);
  }

  async within<T>(
    timeoutMs: number,
    work: (operation: NetworkOperation) => Promise<T>,
  ): Promise<T> {
    this.throwIfStopped();
    return this.withBudget({ timeoutMs }, work);
  }

  withBudget<T>(
    budget: Omit<FiniteBudget, 'parent'>,
    work: (operation: NetworkOperation) => Promise<T>,
  ): Promise<T> {
    this.throwIfStopped();
    const child = new OperationScope(
      { ...budget, parent: this },
      this.lease,
      this.clock,
      this.scheduler,
      this.transport,
    );
    return child.execute(work);
  }

  execute<T>(work: (operation: NetworkOperation) => Promise<T>): Promise<T> {
    try {
      this.throwIfStopped();
    } catch (error) {
      return Promise.reject(error);
    }
    const workActivity = this.lease.activity(false);
    let raw: Promise<T>;
    try {
      raw = Promise.resolve(work(this));
    } catch (error) {
      raw = Promise.reject(error);
    }
    const observed = raw.then(
      (value) => {
        workActivity.finish();
        return value;
      },
      (error: unknown) => {
        workActivity.finish();
        throw error;
      },
    );
    return this.guard('callback', observed, false).then(
      (value) => {
        this.__succeed();
        return value;
      },
      (error: unknown) => {
        if (this.__state === LIFETIME_PENDING)
          this.__stopWith(networkError(error, this.__phase, this.dispatch));
        throw error;
      },
    );
  }
}

/** A callback's permission to publish expires when its returned promise settles. */
export async function callConsumer<T>(
  operation: NetworkOperation,
  callback: (context: ConsumptionContext) => T | Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let open = true;
  const stop = () => controller.abort(operation.signal.reason);
  operation.signal.addEventListener('abort', stop, { once: true });
  const context: ConsumptionContext = {
    signal: controller.signal,
    throwIfStopped() {
      operation.throwIfStopped();
      if (!open) throw new NetworkError('operation_closed', 'callback', 'started');
    },
  };
  try {
    return await scopeOf(operation).observe(
      'callback',
      async () => {
        context.throwIfStopped();
        return callback(context);
      },
      false,
    );
  } finally {
    open = false;
    controller.abort();
    operation.signal.removeEventListener('abort', stop);
  }
}
