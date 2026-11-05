import { DECISION_LIMITS, type ExecutionClass } from './decision-state.js';
import type { GameRepository } from './store.js';
import type {
  CognitionRuntimeControl,
  PreparedCognitionStage,
} from './cognition-runtime-control.js';

export interface ExecutionLease {
  readonly executionClass: ExecutionClass;
  readonly uncertainCompletion: boolean;
  uncertain(attemptId: string): void;
  /** Only an undispatched Lab request can yield its slot during a deliberate hold. */
  suspend(): void;
  /** Reacquire the same accounting class without queuing or reopening released work. */
  resume(): boolean;
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
  /** Native deadline owner shifts its own undispatched timers after a scoped human hold. */
  resumeTiming?: (wallMs: number, monotonicMs: number) => Promise<void>;
}
interface Queued extends Waiting {
  scope: CognitionExecution;
  heldAt?: number;
  heldMonotonic?: number;
  resuming?: boolean;
}
interface Execution {
  scope: CognitionExecution;
  uncertainAttempts: Set<string>;
  released: boolean;
}

/** One process-wide capacity owner, with repository-scoped registrations. Native attempt
 * IDs can coincide across imported worlds; capacity and recovery retain their full scope.
 * docs/projects/cognition-lab-tech-design.md#143-shared-runtime-fairness
 */
export class CognitionExecution {
  private executions: Record<ExecutionClass, Set<Execution>> = {
    primary: new Set(),
    background: new Set(),
  };
  private waiting = new Map<string, Queued>();
  private pending = new Map<Promise<void>, CognitionExecution>();
  private readonly registrations = new Set<CognitionExecution>();
  private readonly recoveries = new Set<Promise<void>>();
  private primaryBorrower?: Execution;
  private idleWaiters = new Set<() => void>();
  private turn: Waiting['kind'] = 'decision';
  private timer?: ReturnType<typeof setTimeout>;
  private pumping = false;
  private closed = false;
  private closing?: Promise<void>;
  private readonly unsubscribe: () => void;
  private readonly unsubscribeControl?: () => void;

  constructor(
    private readonly store: GameRepository,
    private readonly now = Date.now,
    private readonly host?: CognitionExecution,
    private readonly control?: CognitionRuntimeControl,
  ) {
    const owner = this.owner;
    owner.registrations.add(this);
    const recovery = store.occupiedDecisionSlots().then((attempts) => {
      for (const { attemptId, executionClass } of attempts)
        owner.executions[executionClass].add({
          scope: this,
          uncertainAttempts: new Set([attemptId]),
          released: true,
        });
    });
    owner.recoveries.add(recovery);
    void recovery.catch(() => {
      // Unknown occupied capacity is fail-closed for the entire host.
      owner.track(owner.close(), this);
    });
    this.unsubscribe = store.onSettlement(() => {
      void this.ready.then(() => this.reconcile(store)).catch(() => undefined);
    });
    this.unsubscribeControl = control?.subscribe(() => {
      const wall = this.now(),
        monotonic = performance.now();
      for (const item of owner.waiting.values()) {
        if (item.scope !== this) continue;
        if (control.held && item.heldAt === undefined) {
          item.heldAt = wall;
          item.heldMonotonic = monotonic;
        } else if (!control.held && item.heldAt !== undefined) {
          const elapsed = wall - item.heldAt,
            elapsedMonotonic = monotonic - item.heldMonotonic!;
          item.dispatchBy += elapsed;
          item.dispatchByMonotonic! += elapsedMonotonic;
          delete item.heldAt;
          delete item.heldMonotonic;
          if (item.resumeTiming) {
            item.resuming = true;
            owner.track(
              item
                .resumeTiming(elapsed, elapsedMonotonic)
                .then(() => {
                  item.resuming = false;
                  owner.wake();
                })
                .catch(async () => {
                  owner.waiting.delete(this.queueKey(item.id));
                  await item.declined('cancelled');
                }),
              this,
            );
          }
        }
      }
      owner.wake();
    });
  }
  private get owner(): CognitionExecution {
    return this.host ?? this;
  }
  get ready(): Promise<void> {
    return Promise.all([...this.owner.recoveries]).then(() => undefined);
  }
  /** Register every configured store before starting either runtime's provider admission. */
  register(store: GameRepository, control?: CognitionRuntimeControl): CognitionExecution {
    const previous = [...this.owner.registrations].find((scope) => scope.store === store);
    if (previous) {
      if (previous.control !== control)
        throw new Error('A repository already has a different execution registration.');
      return previous;
    }
    return new CognitionExecution(store, this.now, this.owner, control);
  }
  timestamp(): number {
    return this.now();
  }
  private eligible(): boolean {
    return !this.closed && !this.owner.closed && !this.control?.held;
  }
  private available(kind: ExecutionClass): boolean {
    return (
      this.owner.executions[kind].size <
      (kind === 'primary' ? 1 : DECISION_LIMITS.backgroundExecutions)
    );
  }
  private primaryClass(urgent = false): ExecutionClass | undefined {
    if (urgent)
      return this.available('background')
        ? 'background'
        : this.available('primary')
          ? 'primary'
          : undefined;
    const owner = this.owner;
    if (owner.primaryBorrower) return;
    if (this.available('primary')) return 'primary';
    // Keep every unknown execution occupied, but let one independent ordinary
    // request use existing background capacity after the original local work ends.
    // docs/ai-providers.md#decision-escalation
    if (
      this.available('background') &&
      [...owner.executions.primary].every(
        (entry) => entry.released && entry.uncertainAttempts.size > 0,
      )
    )
      return 'background';
    return;
  }
  async primaryAvailable(urgent = false): Promise<boolean> {
    await this.ready;
    return this.eligible() && this.primaryClass(urgent) !== undefined;
  }
  snapshot() {
    const owner = this.owner;
    const status = (kind: ExecutionClass) =>
      [...owner.executions[kind]].some((entry) => entry.uncertainAttempts.size)
        ? 'unknown'
        : owner.executions[kind].size
          ? 'occupied'
          : 'available';
    return {
      primary: status('primary'),
      background: status('background'),
      queuedDecisions: [...owner.waiting.values()].filter((item) => item.kind === 'decision')
        .length,
      queuedMaintenance: [...owner.waiting.values()].filter((item) => item.kind === 'maintenance')
        .length,
    };
  }
  /** Explain current capacity without treating an unconfirmed request as still running.
   * This is diagnostic only; the existing admission and receipt owners release work. */
  primaryCapacityReason(urgent = false): string | undefined {
    if (this.primaryClass(urgent) !== undefined) return;
    if (!urgent && this.owner.primaryBorrower)
      return 'Model capacity is occupied by an earlier request.';
    const status = this.snapshot();
    return status.primary === 'unknown' || (urgent && status.background === 'unknown')
      ? 'Model capacity is blocked by an earlier request whose completion is unconfirmed. Inspect its original receipt to reconcile it.'
      : 'Model capacity is occupied by an earlier request.';
  }
  private lease(
    kind: ExecutionClass,
    requestOnly = false,
    borrowedPrimary = false,
  ): ExecutionLease | undefined {
    if (
      (requestOnly ? this.closed || this.owner.closed : !this.eligible()) ||
      !this.available(kind)
    )
      return undefined;
    const owner = this.owner;
    const entry: Execution = { scope: this, uncertainAttempts: new Set(), released: false };
    owner.executions[kind].add(entry);
    if (borrowedPrimary) owner.primaryBorrower = entry;
    let suspended = false;
    return {
      executionClass: kind,
      get uncertainCompletion() {
        return entry.uncertainAttempts.size > 0;
      },
      uncertain: (attemptId) => {
        entry.uncertainAttempts.add(attemptId);
        // A failed local refund can become uncertain while human wait has
        // yielded the slot. Preserve that accounting fence until reconciliation.
        if (suspended) {
          suspended = false;
          owner.executions[kind].add(entry);
          if (borrowedPrimary && !owner.primaryBorrower) owner.primaryBorrower = entry;
        }
      },
      suspend: () => {
        if (entry.released || suspended) return;
        if (entry.uncertainAttempts.size)
          throw new Error('Unconfirmed provider work cannot release execution capacity.');
        suspended = true;
        if (owner.primaryBorrower === entry) owner.primaryBorrower = undefined;
        owner.executions[kind].delete(entry);
        owner.wake();
      },
      resume: () => {
        if (entry.released || (requestOnly ? this.closed || owner.closed : !this.eligible()))
          return false;
        if (!suspended) return true;
        if (!this.available(kind) || (borrowedPrimary && owner.primaryBorrower)) return false;
        suspended = false;
        owner.executions[kind].add(entry);
        if (borrowedPrimary) owner.primaryBorrower = entry;
        return true;
      },
      release: () => {
        if (entry.released) return;
        entry.released = true;
        if (owner.primaryBorrower === entry) owner.primaryBorrower = undefined;
        if (!entry.uncertainAttempts.size) owner.executions[kind].delete(entry);
        owner.wake();
      },
    };
  }
  async primary(urgent = false): Promise<ExecutionLease | undefined> {
    await this.ready;
    const kind = this.primaryClass(urgent);
    return kind && this.lease(kind, false, !urgent && kind === 'background');
  }
  async background(): Promise<ExecutionLease | undefined> {
    await this.ready;
    return this.lease('background');
  }
  /** Resume prepared native work after human wait, retaining ordinary capacity
   * refusal. A hold racing the awaited check must release its acquired slot. */
  async acquirePrepared(
    stage: PreparedCognitionStage,
    kind: 'primary' | 'background',
    urgent = false,
  ): Promise<ExecutionLease | undefined> {
    for (;;) {
      await this.control?.waitForStage(stage);
      const lease = kind === 'primary' ? await this.primary(urgent) : await this.background();
      if (!this.control?.held) return lease;
      lease?.release();
    }
  }
  /** An explicitly admitted pure comparison uses host capacity without reopening native
   * simulation/queued work. It still cannot bypass occupied or uncertain executions. */
  async requestOnly(): Promise<ExecutionLease | undefined> {
    await this.ready;
    const kind = this.primaryClass();
    return kind && this.lease(kind, true, kind === 'background');
  }
  private queueKey(id: string): string {
    // Map identity is scoped by the registration object, never actor text or a delimiter.
    const index = [...this.owner.registrations].indexOf(this);
    return JSON.stringify([index, id]);
  }
  enqueue(entry: Waiting): boolean {
    const owner = this.owner;
    if (this.closed || owner.closed) return false;
    const key = this.queueKey(entry.id);
    if (owner.waiting.has(key)) return true;
    const own = [...owner.waiting.values()].filter((item) => item.scope === this);
    if (
      entry.metadataBytes > DECISION_LIMITS.descriptorBytes ||
      (entry.kind === 'maintenance' &&
        own.filter((item) => item.kind === 'maintenance').length >= 2) ||
      (entry.kind === 'decision' &&
        (own.filter((item) => item.kind === 'decision').length >= DECISION_LIMITS.queued ||
          own.some((item) => item.kind === 'decision' && item.actorId === entry.actorId)))
    )
      return false;
    owner.waiting.set(key, {
      ...entry,
      scope: this,
      dispatchByMonotonic:
        entry.dispatchByMonotonic ?? performance.now() + Math.max(0, entry.dispatchBy - this.now()),
      ...(this.control?.held ? { heldAt: this.now(), heldMonotonic: performance.now() } : {}),
    });
    owner.wake();
    return true;
  }
  private signalIdle(): void {
    for (const resolve of this.owner.idleWaiters) resolve();
    this.owner.idleWaiters.clear();
  }
  private track(work: Promise<void>, scope: CognitionExecution): void {
    const owner = this.owner;
    owner.pending.set(work, scope);
    void work
      .finally(() => {
        owner.pending.delete(work);
        owner.signalIdle();
      })
      .catch(() => undefined);
  }
  private wake(): void {
    const owner = this.owner;
    if (owner.closed || owner.pumping) return;
    owner.pumping = true;
    owner.track(
      owner.pump().finally(() => {
        owner.pumping = false;
        if (
          owner.available('background') &&
          [...owner.waiting.values()].some((item) => item.scope.eligible() && !item.resuming)
        )
          owner.wake();
      }),
      owner,
    );
  }
  private async pump(): Promise<void> {
    await this.ready;
    if (this.closed) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    for (const [key, item] of this.waiting) {
      if (!item.scope.eligible() || item.resuming) continue;
      if (this.now() < item.dispatchBy && performance.now() < item.dispatchByMonotonic!) continue;
      this.waiting.delete(key);
      this.track(item.declined('expired'), item.scope);
    }
    const ordered = [...this.waiting.values()]
      .filter((item) => item.scope.eligible() && !item.resuming)
      .sort(
        (a, b) =>
          Number(b.kind === this.turn) - Number(a.kind === this.turn) ||
          b.urgency - a.urgency ||
          a.eligibleAt - b.eligibleAt ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      );
    const item = ordered[0];
    const lease = item?.scope.lease('background');
    if (item && lease) {
      this.waiting.delete(item.scope.queueKey(item.id));
      this.turn = item.kind === 'decision' ? 'maintenance' : 'decision';
      this.track(
        item.start(lease).finally(() => lease.release()),
        item.scope,
      );
    }
    const eligible = [...this.waiting.values()].filter(
      (value) => value.scope.eligible() && !value.resuming,
    );
    if (eligible.length) {
      const remaining = Math.min(
        ...eligible.map((value) =>
          Math.min(value.dispatchBy - this.now(), value.dispatchByMonotonic! - performance.now()),
        ),
      );
      this.timer = setTimeout(() => this.wake(), Math.max(1, remaining));
      this.timer.unref();
    }
    this.signalIdle();
  }
  async reconcile(store: GameRepository): Promise<void> {
    const owner = this.owner;
    const scopes = new Set([...owner.registrations].filter((scope) => scope.store === store));
    const pending = Object.entries(owner.executions).flatMap(([kind, entries]) =>
      [...entries]
        .filter((entry) => scopes.has(entry.scope) && entry.uncertainAttempts.size)
        .map((entry) => ({
          kind: kind as ExecutionClass,
          entry,
          ids: [...entry.uncertainAttempts],
        })),
    );
    if (!pending.length) return;
    const occupied = new Set(
      (await store.occupiedDecisionSlots()).map(({ attemptId }) => attemptId),
    );
    for (const { kind, entry, ids } of pending) {
      for (const id of ids) if (!occupied.has(id)) entry.uncertainAttempts.delete(id);
      if (entry.released && !entry.uncertainAttempts.size) owner.executions[kind].delete(entry);
    }
    owner.wake();
  }
  async idle(signal?: AbortSignal): Promise<void> {
    const owner = this.owner;
    const busy = () =>
      [...owner.pending.values()].some((scope) => scope === this) ||
      [...owner.waiting.values()].some((item) => item.scope === this);
    while (busy()) {
      signal?.throwIfAborted();
      await new Promise<void>((resolve, reject) => {
        const done = () => {
          signal?.removeEventListener('abort', aborted);
          resolve();
        };
        const aborted = () => {
          owner.idleWaiters.delete(done);
          reject(signal!.reason);
        };
        owner.idleWaiters.add(done);
        signal?.addEventListener('abort', aborted, { once: true });
        if (signal?.aborted) aborted();
      });
    }
    signal?.throwIfAborted();
  }
  async cancel(ids: ReadonlySet<string>): Promise<void> {
    const owner = this.owner;
    const removed = [...owner.waiting.values()].filter(
      (item) => item.scope === this && ids.has(item.id),
    );
    for (const item of removed) owner.waiting.delete(this.queueKey(item.id));
    try {
      const results = await Promise.allSettled(
        removed.map(async (item) => item.declined('cancelled')),
      );
      const failure = results.find((result) => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
    } finally {
      owner.signalIdle();
      owner.wake();
    }
  }
  close(): Promise<void> {
    if (this.closing) return this.closing;
    this.closed = true;
    this.unsubscribeControl?.();
    return (this.closing = (async () => {
      try {
        // Keep registration identity and settlement observation for a closed
        // child until the host closes; its unknown paid attempts still occupy capacity.
        const results = await Promise.allSettled([
          this.cancel(
            new Set(
              [...this.owner.waiting.values()]
                .filter((item) => item.scope === this)
                .map((item) => item.id),
            ),
          ),
          ...(!this.host
            ? [...this.registrations]
                .filter((scope) => scope !== this)
                .map((scope) => scope.close())
            : []),
        ]);
        const failure = results.find((result) => result.status === 'rejected');
        if (failure?.status === 'rejected') throw failure.reason;
      } finally {
        if (!this.host) {
          for (const scope of this.registrations) scope.unsubscribe();
          if (this.timer) clearTimeout(this.timer);
        }
      }
    })());
  }
}
