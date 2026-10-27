import { NetworkError } from './errors.js';
import { setExchangeObserver, type NetworkExchangeObserver } from './http.js';
import {
  OperationScope,
  scopeOf,
  systemClock,
  systemScheduler,
  type Activity,
  type FiniteBudget,
  type NetworkClock,
  type NetworkOperation,
  type NetworkFetch,
  type NetworkScheduler,
} from './operation.js';

export interface NetworkOwnerSnapshot {
  role: string;
  capacity: number;
  occupied: number;
  active: number;
  unsettled: number;
  quarantined: number;
}

export interface NetworkOwner {
  run<T>(budget: FiniteBudget, work: (operation: NetworkOperation) => Promise<T>): Promise<T>;
  checkDeadlines(): void;
  stop(reason: 'owner_disposed' | 'shutdown'): void;
  snapshot(): NetworkOwnerSnapshot;
  /** Observe actual free capacity without dispatching or retrying a request. */
  whenAvailable(): Promise<void>;
  /** Actual lease retirement for an already-stopped service's bounded shutdown owner. */
  whenIdle(): Promise<void>;
  shutdown(
    budget: Omit<FiniteBudget, 'parent'>,
    settle?: Promise<unknown>,
  ): Promise<{ unresolved: number }>;
}

export interface NetworkOwnerOptions {
  role: string;
  capacity: number;
  fetch?: NetworkFetch;
  clock?: NetworkClock;
  scheduler?: NetworkScheduler;
  onExchange?: NetworkExchangeObserver;
}

interface Lease {
  scope?: OperationScope;
  activities: number;
  resources: number;
  resourceWaiters: (() => void)[];
  quarantined: number;
  locallySettled: boolean;
  released: boolean;
  finishParent?: () => void;
}

/** One instance per bootstrap role. Admission has no queue and never resets abandoned work. */
export function createNetworkOwner(options: NetworkOwnerOptions): NetworkOwner {
  if (!Number.isSafeInteger(options.capacity) || options.capacity <= 0 || !options.role) {
    throw new RangeError('Network owner requires a role and positive finite capacity');
  }
  const { capacity, role, onExchange } = options;
  const clock = options.clock ?? systemClock;
  const scheduler = options.scheduler ?? systemScheduler;
  const transport: NetworkFetch = options.fetch ?? ((url, init) => globalThis.fetch(url, init));
  const leases = new Set<Lease>();
  let stopped = false;
  let shutdown: Promise<{ unresolved: number }> | undefined;
  let idle: Promise<void> | undefined;
  let resolveIdle: (() => void) | undefined;
  let available: Promise<void> | undefined;
  let resolveAvailable: (() => void) | undefined;
  const signalAvailable = () => {
    resolveAvailable?.();
    available = undefined;
    resolveAvailable = undefined;
  };
  const whenIdle = () => {
    if (leases.size === 0) return Promise.resolve();
    idle ??= new Promise<void>((resolve) => {
      resolveIdle = resolve;
    });
    return idle;
  };
  const finish = (lease: Lease) => {
    if (!lease.released && lease.locallySettled && lease.activities === 0) {
      lease.released = true;
      leases.delete(lease);
      lease.finishParent?.();
      signalAvailable();
      if (leases.size === 0) {
        resolveIdle?.();
        idle = undefined;
        resolveIdle = undefined;
      }
    }
  };
  return {
    run<T>(budget: FiniteBudget, work: (operation: NetworkOperation) => Promise<T>): Promise<T> {
      if (stopped) return Promise.reject(new NetworkError('operation_closed', 'admission'));
      if (leases.size >= capacity) {
        return Promise.reject(new NetworkError('capacity_unavailable', 'admission'));
      }
      const lease: Lease = {
        activities: 0,
        resources: 0,
        resourceWaiters: [],
        quarantined: 0,
        locallySettled: false,
        released: false,
      };
      const activity = (resource = true): Activity => {
        lease.activities++;
        if (resource) lease.resources++;
        let done = false;
        let quarantined = false;
        return {
          finish() {
            if (done) return;
            done = true;
            lease.activities--;
            if (resource) lease.resources--;
            if (quarantined) lease.quarantined--;
            if (lease.resources === 0) {
              for (const resolve of lease.resourceWaiters.splice(0)) resolve();
            }
            finish(lease);
          },
          quarantine() {
            if (!done && !quarantined) {
              quarantined = true;
              lease.quarantined++;
            }
          },
        };
      };
      try {
        if (budget.parent) {
          const parent = scopeOf(budget.parent);
          parent.throwIfStopped();
          lease.finishParent = parent.activity().finish;
        }
        lease.scope = new OperationScope(
          budget,
          {
            activity,
            resourcesClosed: () =>
              lease.resources === 0
                ? Promise.resolve()
                : new Promise<void>((resolve) => lease.resourceWaiters.push(resolve)),
          },
          clock,
          scheduler,
          transport,
        );
        leases.add(lease);
        if (onExchange) setExchangeObserver(lease.scope, onExchange);
        const result = lease.scope.execute(work);
        return result.finally(() => {
          lease.locallySettled = true;
          finish(lease);
        });
      } catch (error) {
        lease.finishParent?.();
        return Promise.reject(error);
      }
    },
    checkDeadlines() {
      for (const lease of leases) lease.scope?.check();
    },
    stop() {
      stopped = true;
      signalAvailable();
      for (const lease of leases) lease.scope?.stop('cancelled');
    },
    whenAvailable() {
      if (stopped) return Promise.reject(new NetworkError('operation_closed', 'admission'));
      if (leases.size < capacity) return Promise.resolve();
      available ??= new Promise<void>((resolve) => {
        resolveAvailable = resolve;
      });
      return available;
    },
    whenIdle,
    shutdown(budget, settle) {
      if (shutdown) return shutdown;
      stopped = true;
      signalAvailable();
      for (const lease of leases) lease.scope?.stop('cancelled');
      if (leases.size === 0 && !settle) return Promise.resolve({ unresolved: 0 });
      // A single service-owned observation is independent of its exhausted admission pool.
      const closed = whenIdle();
      let externalPending = settle !== undefined;
      const external =
        settle?.then(
          () => {
            externalPending = false;
          },
          (error: unknown) => {
            externalPending = false;
            throw error;
          },
        ) ?? Promise.resolve();
      const observation = new OperationScope(
        budget,
        {
          activity: () => ({ finish() {}, quarantine() {} }),
          resourcesClosed: () => Promise.resolve(),
        },
        clock,
        scheduler,
        transport,
      );
      shutdown = observation
        .execute(async () => {
          await Promise.all([closed, external]);
        })
        .then(
          () => ({ unresolved: leases.size }),
          (error: unknown) => {
            if (error instanceof NetworkError)
              return { unresolved: leases.size + Number(externalPending) };
            throw error;
          },
        );
      return shutdown;
    },
    snapshot() {
      let active = 0;
      let unsettled = 0;
      let quarantined = 0;
      for (const lease of leases) {
        if (lease.locallySettled) unsettled++;
        else active++;
        if (lease.quarantined > 0) quarantined++;
      }
      return {
        role,
        capacity,
        occupied: leases.size,
        active,
        unsettled,
        quarantined,
      };
    },
  };
}
