import type { ApiResult } from '@open-legend/protocol';
import { chatNotSent } from './player-interaction.js';

// The HTTP request is still uncommitted throughout this wait. See LA231.
const SHARED_ADMISSION_WAIT_MS = 5_000;
const RESIDENT_ADMISSION_WAIT_MS = 30_000;
export type NpcChatBlocker = 'closed' | 'higher-reasoning' | 'actor-slot' | 'job-capacity';
const waitable = (blocked: NpcChatBlocker) =>
  blocked === 'actor-slot' || blocked === 'job-capacity';

interface NpcChatAttempt {
  assertScope(): void;
  current(): boolean;
  signal?: AbortSignal;
  trySend(
    admit: (actorId?: string) => boolean,
    current: () => boolean,
    expired: () => ApiResult | undefined,
  ): Promise<ApiResult>;
}

/** Waits outside the owning director's serialized admission and world turns.
 * Only the director's synchronous blocker check can grant its own job slot.
 * The HTTP owner supplies cancellation and rechecks scope on every attempt. */
export class NpcChatAdmission {
  private readonly waiters = new Set<() => void>();
  private pendingAtCapacity = 0;
  private readonly pendingActors = new Map<string, number>();

  constructor(
    private readonly blocker: (actorId?: string) => NpcChatBlocker | undefined,
    private readonly serialize: (operation: () => Promise<ApiResult>) => Promise<ApiResult>,
  ) {}

  /** Read-only advice for the composer. Only an explicit Send owns a wait. */
  availability(actorId: string): boolean | 'wait' {
    const blocked = this.blocker(actorId);
    return blocked === undefined ? true : waitable(blocked) && 'wait';
  }

  hasPriorityWaiter(actorId: string): boolean {
    return this.pendingAtCapacity > 0 || this.pendingActors.has(actorId);
  }

  async wait({ assertScope, current, signal, trySend }: NpcChatAttempt): Promise<ApiResult> {
    const started = performance.now();
    let until = started + SHARED_ADMISSION_WAIT_MS;
    let hasPriority = false;
    let waitingActor: string | undefined;
    const setWaitingActor = (actorId?: string) => {
      if (actorId === waitingActor) return;
      if (waitingActor) {
        const count = this.pendingActors.get(waitingActor)!;
        if (count === 1) this.pendingActors.delete(waitingActor);
        else this.pendingActors.set(waitingActor, count - 1);
      }
      waitingActor = actorId;
      if (actorId) this.pendingActors.set(actorId, (this.pendingActors.get(actorId) ?? 0) + 1);
    };
    let refusal: ApiResult | undefined;
    const expired = () => (refusal && performance.now() >= until ? refusal : undefined);
    try {
      for (;;) {
        let dependency: { actorId?: string; blocked: NpcChatBlocker } | undefined;
        const admit = (actorId?: string) => {
          if (expired() || !current()) return false;
          const blocked = this.blocker(actorId);
          if (!blocked) return true;
          if (!waitable(blocked)) return false;
          const sharedSlot = blocked === 'job-capacity';
          dependency = { actorId, blocked };
          until = started + (sharedSlot ? SHARED_ADMISSION_WAIT_MS : RESIDENT_ADMISSION_WAIT_MS);
          setWaitingActor(sharedSlot ? undefined : actorId);
          if (sharedSlot !== hasPriority) {
            this.pendingAtCapacity += sharedSlot ? 1 : -1;
            hasPriority = sharedSlot;
          }
          return false;
        };
        const result = await this.serialize(async () => {
          assertScope();
          if (!current()) return chatNotSent;
          const noSlot = expired();
          if (noSlot) return noSlot;
          return trySend(admit, current, expired);
        });
        if (!dependency) return result;
        refusal = result;
        await this.waitForSlot(dependency, until, current, signal);
        assertScope();
        if (!current()) return chatNotSent;
        if (expired()) return result;
      }
    } finally {
      if (hasPriority) this.pendingAtCapacity--;
      setWaitingActor();
    }
  }

  private waitForSlot(
    { actorId, blocked }: { actorId?: string; blocked: NpcChatBlocker },
    until: number,
    current: () => boolean,
    signal?: AbortSignal,
  ): Promise<void> {
    const remaining = until - performance.now();
    if (remaining <= 0 || !current() || this.blocker(actorId) !== blocked) return Promise.resolve();
    return new Promise((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', finish);
        this.waiters.delete(wake);
        resolve();
      };
      // Another resident finishing does not make this request eligible.
      const wake = () => {
        if (!current() || this.blocker(actorId) !== blocked) finish();
      };
      const timer = setTimeout(finish, remaining);
      signal?.addEventListener('abort', finish, { once: true });
      this.waiters.add(wake);
    });
  }

  slotChanged(): void {
    for (const wake of this.waiters) wake();
  }
}
