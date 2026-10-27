import { NetworkError, networkError, type NetworkPhase } from './errors.js';
import {
  FiniteLifetime,
  LIFETIME_PENDING,
  systemClock,
  systemScheduler,
  type LifetimeBudget,
  type NetworkClock,
  type NetworkScheduler,
} from './lifetime.js';

/** Scalar SDK work only: no response bodies, child operations or subscriptions. */
export interface SdkOperation {
  readonly signal: AbortSignal;
  throwIfStopped(): void;
  wait<T>(phase: NetworkPhase, start: (signal: AbortSignal) => Promise<T>): Promise<T>;
}
class SdkLifetime extends FiniteLifetime implements SdkOperation {
  private __waiting = false;
  constructor(
    budget: LifetimeBudget,
    clock: NetworkClock,
    scheduler: NetworkScheduler,
    private readonly __retain: () => () => void,
  ) {
    super(budget, clock, scheduler);
  }
  wait<T>(phase: NetworkPhase, start: (signal: AbortSignal) => Promise<T>): Promise<T> {
    this.throwIfStopped();
    if (this.__waiting) throw new NetworkError('capacity_unavailable', 'admission');
    this.__waiting = true;
    this.__phase = phase;
    this.__started = true;
    const retire = this.__retain();
    const finish = () => {
      this.__waiting = false;
      retire();
    };
    let raw: Promise<T>;
    try {
      raw = Promise.resolve(start(this.signal));
    } catch (error) {
      finish();
      return Promise.reject(networkError(error, phase, this.__dispatch));
    }
    const observed = raw.then(
      (value) => {
        finish();
        return value;
      },
      (error: unknown) => {
        finish();
        throw networkError(error, phase, this.__dispatch);
      },
    );
    return this.__guard(phase, observed);
  }
  __execute<T>(work: (operation: SdkOperation) => Promise<T>): Promise<T> {
    try {
      this.throwIfStopped();
    } catch (error) {
      return Promise.reject(error);
    }
    const finish = this.__retain();
    let raw: Promise<T>;
    try {
      raw = Promise.resolve(work(this));
    } catch (error) {
      raw = Promise.reject(error);
    }
    return this.__guard('callback', raw.finally(finish), false).then(
      (value) => {
        this.__succeed();
        return value;
      },
      (error: unknown) => {
        if (this.__state === LIFETIME_PENDING)
          this.__stopWith(networkError(error, this.__phase, this.__dispatch));
        throw error;
      },
    );
  }
}

/** The same finite lifetime kernel with only the scalar SDK ownership surface.
 * Small cloud handlers do not bundle browser HTTP or continuous-stream features. */
export function createSdkOwner(options: {
  role: string;
  capacity: number;
  clock?: NetworkClock;
  scheduler?: NetworkScheduler;
}) {
  const { role, capacity } = options;
  if (!role || !Number.isSafeInteger(capacity) || capacity <= 0)
    throw new RangeError('Invalid SDK owner');
  const clock = options.clock ?? systemClock;
  const scheduler = options.scheduler ?? systemScheduler;
  let occupied = 0;
  return {
    run<T>(budget: LifetimeBudget, work: (operation: SdkOperation) => Promise<T>): Promise<T> {
      if (occupied >= capacity)
        return Promise.reject(new NetworkError('capacity_unavailable', 'admission'));
      let pending = 0,
        observed = false,
        retired = false;
      const retire = () => {
        if (!retired && observed && pending === 0) {
          retired = true;
          occupied--;
        }
      };
      const retain = () => {
        pending++;
        let done = false;
        return () => {
          if (!done) {
            done = true;
            pending--;
            retire();
          }
        };
      };
      let scope: SdkLifetime;
      try {
        scope = new SdkLifetime(budget, clock, scheduler, retain);
        scope.throwIfStopped();
      } catch (error) {
        return Promise.reject(error);
      }
      occupied++;
      return scope.__execute(work).finally(() => {
        observed = true;
        retire();
      });
    },
    snapshot: () => ({ role, capacity, occupied }),
  };
}
