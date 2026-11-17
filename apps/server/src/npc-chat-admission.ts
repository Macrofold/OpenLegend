import type { ApiResult } from '@open-legend/protocol';
import { chatNotSent } from './player-interaction.js';

// The HTTP request is still uncommitted throughout this wait. See LA231.
const CHAT_ADMISSION_WAIT_MS = 5_000;
export type NpcChatBlocker = 'closed' | 'higher-reasoning' | 'actor-slot' | 'job-capacity';

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
  private revision = 0;
  private readonly waiters = new Set<() => void>();
  private pendingAtCapacity = 0;

  constructor(
    private readonly blocker: (actorId?: string) => NpcChatBlocker | undefined,
    private readonly serialize: (operation: () => Promise<ApiResult>) => Promise<ApiResult>,
  ) {}

  get hasCapacityWaiter(): boolean {
    return this.pendingAtCapacity > 0;
  }

  async wait({ assertScope, current, signal, trySend }: NpcChatAttempt): Promise<ApiResult> {
    const until = performance.now() + CHAT_ADMISSION_WAIT_MS;
    let hasPriority = false;
    let refusal: ApiResult | undefined;
    const expired = () => (refusal && performance.now() >= until ? refusal : undefined);
    try {
      for (;;) {
        let blockedAt: number | undefined;
        const admit = (actorId?: string) => {
          if (expired() || !current()) return false;
          const blocked = this.blocker(actorId);
          if (!blocked) return true;
          if (blocked === 'closed' || blocked === 'higher-reasoning') return false;
          blockedAt = this.revision;
          const sharedSlot = blocked === 'job-capacity';
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
        if (blockedAt === undefined) return result;
        refusal = result;
        await this.waitForSlot(blockedAt, until, current, signal);
        assertScope();
        if (!current()) return chatNotSent;
        if (expired()) return result;
      }
    } finally {
      if (hasPriority) this.pendingAtCapacity--;
    }
  }

  private waitForSlot(
    revision: number,
    until: number,
    current: () => boolean,
    signal?: AbortSignal,
  ): Promise<void> {
    const remaining = until - performance.now();
    if (revision !== this.revision || remaining <= 0 || !current()) return Promise.resolve();
    return new Promise((resolve) => {
      const wake = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', wake);
        this.waiters.delete(wake);
        resolve();
      };
      const timer = setTimeout(wake, remaining);
      signal?.addEventListener('abort', wake, { once: true });
      this.waiters.add(wake);
    });
  }

  slotChanged(): void {
    this.revision++;
    for (const wake of this.waiters) wake();
  }
}
