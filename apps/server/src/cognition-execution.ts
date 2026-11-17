import {
  DECISION_LIMITS,
  DEFAULT_NPC_AI_CONCURRENCY,
  type ExecutionClass,
} from './decision-state.js';
import type { GameRepository } from './store.js';

export interface ExecutionLease {
  readonly executionClass: ExecutionClass;
  readonly uncertainCompletion: boolean;
  /** Unknown remote execution keeps capacity occupied even after its caller ends. */
  uncertain(attemptId: string): void;
  release(): void;
}
interface Waiting {
  id: string;
  actorId: string;
  kind: 'decision' | 'maintenance';
  urgency: number;
  eligibleAt: number;
  dispatchBy: number;
  dispatchByMonotonic?: number;
  metadataBytes: number;
  start: (lease: ExecutionLease) => Promise<void>;
  declined: (reason: 'expired' | 'cancelled') => Promise<void>;
}
interface Execution {
  uncertainAttempts: Set<string>;
  released: boolean;
}

/** Bounded process-wide provider execution shared across director replacement.
 * Durable execution classes describe origination for accounting, not separate limits. */
export class CognitionExecution {
  readonly ready: Promise<void>;
  private executions: Record<ExecutionClass, Set<Execution>> = {
    primary: new Set(),
    background: new Set(),
  };
  private readonly uncertainExecutions = new Map<Execution, ExecutionClass>();
  private idleWaiters = new Set<() => void>();
  private waiting = new Map<string, Waiting>();
  private readonly waitingDecisionActors = new Set<string>();
  private pending = new Set<Promise<void>>();
  private turn: Waiting['kind'] = 'decision';
  private timer?: ReturnType<typeof setTimeout>;
  private pumping = false;
  private closed = false;
  private readonly unsubscribe: () => void;

  constructor(
    store: GameRepository,
    private readonly now = Date.now,
    readonly concurrency = DEFAULT_NPC_AI_CONCURRENCY,
  ) {
    if (!Number.isSafeInteger(concurrency) || concurrency < 1)
      throw new Error('NPC AI concurrency must be a positive safe integer.');
    this.ready = store.occupiedDecisionSlots().then((attempts) => {
      for (const { attemptId, executionClass } of attempts) {
        const entry: Execution = {
          uncertainAttempts: new Set([attemptId]),
          released: true,
        };
        this.executions[executionClass].add(entry);
        this.uncertainExecutions.set(entry, executionClass);
      }
    });
    this.unsubscribe = store.onSettlement(() => {
      void this.ready
        .then(() => (this.uncertainExecutions.size ? this.reconcile(store) : undefined))
        .catch(() => undefined);
    });
    // Reconstruction is a spending prerequisite. Observe failure immediately,
    // even before the first caller awaits ready, and stop queued dispatch rather
    // than repeatedly pumping the same rejected prerequisite.
    void this.ready.catch(() => {
      this.close();
      this.track(this.cancel(new Set(this.waiting.keys())));
    });
  }
  timestamp(): number {
    return this.now();
  }
  private available(): boolean {
    return this.executions.primary.size + this.executions.background.size < this.concurrency;
  }
  async primaryAvailable(): Promise<boolean> {
    await this.ready;
    return !this.closed && this.available();
  }
  snapshot() {
    const status = (kind: ExecutionClass) =>
      [...this.executions[kind]].some((entry) => entry.uncertainAttempts.size)
        ? 'unknown'
        : this.executions[kind].size
          ? 'occupied'
          : 'available';
    return {
      primary: status('primary'),
      background: status('background'),
      queuedDecisions: [...this.waiting.values()].filter((item) => item.kind === 'decision').length,
      queuedMaintenance: [...this.waiting.values()].filter((item) => item.kind === 'maintenance')
        .length,
    };
  }
  private lease(kind: ExecutionClass): ExecutionLease | undefined {
    if (this.closed || !this.available()) return undefined;
    const entry: Execution = { uncertainAttempts: new Set(), released: false };
    this.executions[kind].add(entry);
    return {
      executionClass: kind,
      get uncertainCompletion() {
        return entry.uncertainAttempts.size > 0;
      },
      uncertain: (attemptId) => {
        entry.uncertainAttempts.add(attemptId);
        this.uncertainExecutions.set(entry, kind);
      },
      release: () => {
        if (entry.released) return;
        entry.released = true;
        if (!entry.uncertainAttempts.size) this.executions[kind].delete(entry);
        this.wake();
      },
    };
  }
  async primary(urgent = false): Promise<ExecutionLease | undefined> {
    await this.ready;
    return this.lease(urgent ? 'background' : 'primary');
  }
  async background(): Promise<ExecutionLease | undefined> {
    await this.ready;
    return this.lease('background');
  }
  enqueue(entry: Waiting): boolean {
    if (this.closed) return false;
    if (this.waiting.has(entry.id)) return true;
    if (
      entry.metadataBytes > DECISION_LIMITS.descriptorBytes ||
      this.waiting.size >= this.concurrency ||
      (entry.kind === 'decision' && this.waitingDecisionActors.has(entry.actorId))
    )
      return false;
    this.waiting.set(entry.id, {
      ...entry,
      dispatchByMonotonic:
        entry.dispatchByMonotonic ?? performance.now() + Math.max(0, entry.dispatchBy - this.now()),
    });
    if (entry.kind === 'decision') this.waitingDecisionActors.add(entry.actorId);
    this.wake();
    return true;
  }
  private removeWaiting(item: Waiting) {
    this.waiting.delete(item.id);
    if (item.kind === 'decision') this.waitingDecisionActors.delete(item.actorId);
  }
  private track(work: Promise<void>) {
    this.pending.add(work);
    void work
      .finally(() => {
        this.pending.delete(work);
        if (!this.pending.size && !this.waiting.size) {
          for (const resolve of this.idleWaiters) resolve();
          this.idleWaiters.clear();
        }
      })
      .catch(() => undefined);
  }
  private wake() {
    if (this.closed || this.pumping) return;
    this.pumping = true;
    this.track(
      this.pump().finally(() => {
        this.pumping = false;
        if (this.waiting.size && this.available()) this.wake();
      }),
    );
  }
  private async pump() {
    await this.ready;
    if (this.closed) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    for (const item of this.waiting.values()) {
      if (this.now() < item.dispatchBy && performance.now() < item.dispatchByMonotonic!) continue;
      this.removeWaiting(item);
      this.track(item.declined('expired'));
    }
    // Sort the current batch once, then alternate kinds at each admitted
    // position without revisiting the rest of the queue.
    const ordered: Record<Waiting['kind'], Waiting[]> = { decision: [], maintenance: [] };
    if (this.waiting.size && this.available()) {
      for (const item of this.waiting.values()) ordered[item.kind].push(item);
      for (const items of Object.values(ordered))
        items.sort(
          (a, b) =>
            a.urgency - b.urgency ||
            b.eligibleAt - a.eligibleAt ||
            (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
        );
    }
    while (this.available()) {
      const other = this.turn === 'decision' ? 'maintenance' : 'decision';
      const item = ordered[this.turn].pop() ?? ordered[other].pop();
      if (!item) break;
      if (this.now() >= item.dispatchBy || performance.now() >= item.dispatchByMonotonic!) {
        this.removeWaiting(item);
        this.track(item.declined('expired'));
        continue;
      }
      const lease = this.lease('background');
      if (!lease) break;
      this.removeWaiting(item);
      this.turn = item.kind === 'decision' ? 'maintenance' : 'decision';
      this.track(
        Promise.resolve()
          .then(() => item.start(lease))
          .finally(() => lease.release()),
      );
    }
    if (this.waiting.size) {
      const now = this.now(),
        monotonic = performance.now();
      let remaining = Infinity;
      for (const item of this.waiting.values())
        remaining = Math.min(
          remaining,
          item.dispatchBy - now,
          item.dispatchByMonotonic! - monotonic,
        );
      this.timer = setTimeout(() => this.wake(), Math.max(1, remaining));
      this.timer.unref();
    }
  }
  /** Definitive reconciliation, never a timer, releases a recovered unknown execution. */
  async reconcile(store: GameRepository): Promise<void> {
    // Snapshot identities before awaiting SQL: a later uncertain attempt must not
    // be released using an older read, nor may one completion free its neighbours.
    const pending = [...this.uncertainExecutions].map(([entry, kind]) => ({
      kind,
      entry,
      ids: [...entry.uncertainAttempts],
    }));
    const occupied = new Set(
      (await store.occupiedDecisionSlots()).map(({ attemptId }) => attemptId),
    );
    for (const { kind, entry, ids } of pending) {
      for (const id of ids) if (!occupied.has(id)) entry.uncertainAttempts.delete(id);
      if (!entry.uncertainAttempts.size) {
        this.uncertainExecutions.delete(entry);
        if (entry.released) this.executions[kind].delete(entry);
      }
    }
    this.wake();
  }
  async idle(): Promise<void> {
    if (this.pending.size || this.waiting.size)
      await new Promise<void>((resolve) => this.idleWaiters.add(resolve));
  }
  async cancel(ids: ReadonlySet<string>): Promise<void> {
    const removed = [...this.waiting.values()].filter((item) => ids.has(item.id));
    for (const item of removed) this.removeWaiting(item);
    await Promise.all(removed.map((item) => item.declined('cancelled')));
    this.wake();
  }
  close(): void {
    this.closed = true;
    this.unsubscribe();
    if (this.timer) clearTimeout(this.timer);
  }
}
