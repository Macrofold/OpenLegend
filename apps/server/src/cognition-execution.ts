import { DECISION_LIMITS, type ExecutionClass } from './decision-state.js';
import type { GameRepository } from './store.js';

export interface ExecutionLease {
  readonly executionClass: ExecutionClass;
  readonly uncertainCompletion: boolean;
  /** Unknown remote execution keeps capacity occupied even after its caller ends. */
  uncertain(): void;
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

/** Two bounded execution lanes shared across director replacement. No world/model policy. */
export class CognitionExecution {
  readonly ready: Promise<void>;
  private occupied = new Set<ExecutionClass>();
  private uncertain = new Set<ExecutionClass>();
  private idleWaiters = new Set<() => void>();
  private waiting = new Map<string, Waiting>();
  private pending = new Set<Promise<void>>();
  private turn: Waiting['kind'] = 'decision';
  private timer?: ReturnType<typeof setTimeout>;
  private pumping = false;
  private closed = false;
  private readonly unsubscribe: () => void;

  constructor(
    store: GameRepository,
    private readonly now = Date.now,
  ) {
    this.ready = store.occupiedDecisionSlots().then((classes) => {
      for (const kind of classes) {
        this.occupied.add(kind);
        this.uncertain.add(kind);
      }
    });
    this.unsubscribe = store.onSettlement(() => {
      void this.ready
        .then(() => (this.uncertain.size ? this.reconcile(store) : undefined))
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
  async primaryAvailable(urgent = false): Promise<boolean> {
    await this.ready;
    return (
      !this.closed &&
      (!this.occupied.has('primary') || (urgent && !this.occupied.has('background')))
    );
  }
  snapshot() {
    return {
      primary: this.uncertain.has('primary')
        ? 'unknown'
        : this.occupied.has('primary')
          ? 'occupied'
          : 'available',
      background: this.uncertain.has('background')
        ? 'unknown'
        : this.occupied.has('background')
          ? 'occupied'
          : 'available',
      queuedDecisions: [...this.waiting.values()].filter((item) => item.kind === 'decision').length,
      queuedMaintenance: [...this.waiting.values()].filter((item) => item.kind === 'maintenance')
        .length,
    };
  }
  private lease(kind: ExecutionClass): ExecutionLease | undefined {
    if (this.closed || this.occupied.has(kind)) return undefined;
    this.occupied.add(kind);
    let held = false,
      released = false;
    return {
      executionClass: kind,
      get uncertainCompletion() {
        return held;
      },
      uncertain: () => {
        held = true;
        this.uncertain.add(kind);
      },
      release: () => {
        if (held || released) return;
        released = true;
        this.occupied.delete(kind);
        this.wake();
      },
    };
  }
  async primary(urgent = false): Promise<ExecutionLease | undefined> {
    await this.ready;
    // Use the existing second execution capacity for urgent work, keeping the
    // primary capacity available to one ordinary pipeline. Maintenance/higher
    // work shares this same lease: no third provider execution is introduced.
    // docs/projects/combat-and-threat-responses-tech-design.md#bounded-urgent-concurrency
    return (urgent && this.lease('background')) || this.lease('primary');
  }
  enqueue(entry: Waiting): boolean {
    if (this.closed) return false;
    if (this.waiting.has(entry.id)) return true;
    if (
      entry.metadataBytes > DECISION_LIMITS.descriptorBytes ||
      (entry.kind === 'maintenance' &&
        [...this.waiting.values()].filter((item) => item.kind === 'maintenance').length >= 2) ||
      (entry.kind === 'decision' &&
        ([...this.waiting.values()].filter((item) => item.kind === 'decision').length >=
          DECISION_LIMITS.queued ||
          [...this.waiting.values()].some(
            (item) => item.kind === 'decision' && item.actorId === entry.actorId,
          )))
    )
      return false;
    this.waiting.set(entry.id, {
      ...entry,
      dispatchByMonotonic:
        entry.dispatchByMonotonic ?? performance.now() + Math.max(0, entry.dispatchBy - this.now()),
    });
    this.wake();
    return true;
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
        if (this.waiting.size && !this.occupied.has('background')) this.wake();
      }),
    );
  }
  private async pump() {
    await this.ready;
    if (this.closed) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    for (const [id, item] of this.waiting) {
      if (this.now() < item.dispatchBy && performance.now() < item.dispatchByMonotonic!) continue;
      this.waiting.delete(id);
      this.track(item.declined('expired'));
    }
    const ordered = [...this.waiting.values()].sort(
      (a, b) =>
        Number(b.kind === this.turn) - Number(a.kind === this.turn) ||
        b.urgency - a.urgency ||
        a.eligibleAt - b.eligibleAt ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
    const item = ordered[0];
    const lease = item && this.lease('background');
    if (item && lease) {
      this.waiting.delete(item.id);
      this.turn = item.kind === 'decision' ? 'maintenance' : 'decision';
      this.track(item.start(lease).finally(() => lease.release()));
    }
    if (this.waiting.size) {
      const remaining = Math.min(
        ...[...this.waiting.values()].map((value) =>
          Math.min(value.dispatchBy - this.now(), value.dispatchByMonotonic! - performance.now()),
        ),
      );
      this.timer = setTimeout(() => this.wake(), Math.max(1, remaining));
      this.timer.unref();
    }
  }
  /** Definitive reconciliation, never a timer, releases a recovered unknown execution. */
  async reconcile(store: GameRepository): Promise<void> {
    const occupied = new Set(await store.occupiedDecisionSlots());
    for (const kind of this.uncertain)
      if (!occupied.has(kind)) {
        this.occupied.delete(kind);
        this.uncertain.delete(kind);
      }
    this.wake();
  }
  async idle(): Promise<void> {
    if (this.pending.size || this.waiting.size)
      await new Promise<void>((resolve) => this.idleWaiters.add(resolve));
  }
  async cancel(ids: ReadonlySet<string>): Promise<void> {
    const removed = [...this.waiting.values()].filter((item) => ids.has(item.id));
    for (const item of removed) this.waiting.delete(item.id);
    await Promise.all(removed.map((item) => item.declined('cancelled')));
    this.wake();
  }
  close(): void {
    this.closed = true;
    this.unsubscribe();
    if (this.timer) clearTimeout(this.timer);
  }
}
