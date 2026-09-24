import { randomUUID } from 'node:crypto';
import { digest, type AttemptBudget, type SqlDatabase } from './store.js';
import { WorkshopRepository } from './workshop-repository.js';
import type { WorldService } from './world-service.js';

export interface WorkshopDraft {
  id: string;
  revision: number;
  digest: string;
  intent: string;
  candidate: unknown;
  base?: { recipeId: string; version: number; digest: string };
  errors: string[];
  dependencies: string;
}
export interface WorkshopSession {
  version: 1;
  id: string;
  contextHandle: string;
  conversationId: string;
  accountId: string;
  actorId: string;
  worldId: string;
  timelineId: string;
  connector: string | null;
  limitUsd: number;
  createdAt: number;
  expiresAt: number;
  revision: number;
  closed: boolean;
  selected?: WorkshopDraft;
  approval?: { digest: string; dependencies: string; requested: boolean; approvedBy?: string };
  application?: { operationId: string; requestId: string; state: 'pending' | 'applied' };
}
export class WorkshopError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Operational records survive restart, not as new fictional state or another wallet.
 * docs/world-agent-runtime.md#implemented-session-and-write-boundary
 */
export class WorkshopSessions {
  readonly records: WorkshopRepository;
  constructor(
    readonly service: WorldService,
    db: SqlDatabase,
    private readonly now = Date.now,
  ) {
    this.records = new WorkshopRepository(service.store, db);
  }
  key(handle: string) {
    return `world-workshop:session:${digest(handle)}`;
  }
  receiptKey(id: string, operationId: string) {
    return `world-workshop:operation:${id}:${operationId}`;
  }
  budget(session: WorkshopSession): AttemptBudget {
    return {
      id: `world-workshop:${session.id}`,
      limitUsd: Math.min(session.limitUsd, this.service.config.inventionWorkshopUsd),
    };
  }
  assertCurrent(session: WorkshopSession) {
    const s = this.service;
    if (
      !s.config.godMode ||
      session.closed ||
      this.now() >= session.expiresAt ||
      session.worldId !== s.world.id ||
      session.timelineId !== s.timelineId ||
      session.accountId !== s.profile.id ||
      session.connector !== (s.config.mcpRead?.tokenSha256 ?? null)
    )
      throw new WorkshopError(
        'stale',
        'Workshop session is closed, expired, restored, or no longer authorized. Start a new explicit session.',
      );
  }
  async get(handle: string): Promise<WorkshopSession> {
    const value = (await this.service.store.getIntegration(this.key(handle))) as
      | WorkshopSession
      | undefined;
    if (!value || value.version !== 1 || value.contextHandle !== handle)
      throw new WorkshopError('forbidden', 'Workshop session is unavailable.');
    this.assertCurrent(value);
    return value;
  }
  async begin(conversationId: string): Promise<WorkshopSession> {
    if (!this.service.config.godMode)
      throw new WorkshopError('forbidden', 'World-owner authoring is disabled.');
    const key = `world-workshop:conversation:${this.service.world.id}:${this.service.timelineId}:${this.service.profile.id}:${conversationId}`;
    const retained = (await this.service.store.getIntegration(key)) as
      | { handle: string }
      | undefined;
    if (retained) return this.get(retained.handle);
    const session: WorkshopSession = {
      version: 1,
      id: randomUUID(),
      contextHandle: randomUUID(),
      conversationId,
      accountId: this.service.profile.id,
      actorId: this.service.controlledEntityId,
      worldId: this.service.world.id,
      timelineId: this.service.timelineId,
      connector: this.service.config.mcpRead?.tokenSha256 ?? null,
      limitUsd: this.service.config.inventionWorkshopUsd,
      createdAt: this.now(),
      expiresAt: this.now() + 7 * 86400_000,
      revision: 1,
      closed: false,
    };
    const saved = await this.records.compareAndSet(
      key,
      undefined,
      { handle: session.contextHandle },
      [{ key: this.key(session.contextHandle), value: session }],
    );
    if (!saved) {
      const actual = (await this.service.store.getIntegration(key)) as { handle: string };
      return this.get(actual.handle);
    }
    return session;
  }
  async save(
    previous: WorkshopSession,
    next: WorkshopSession,
    related: { key: string; value: unknown }[] = [],
    check: () => void = () => {},
  ) {
    this.assertCurrent(previous);
    if (
      !(await this.records.compareAndSet(
        this.key(previous.contextHandle),
        previous,
        { ...next, revision: previous.revision + 1 },
        related,
        () => {
          this.assertCurrent(previous);
          check();
        },
      ))
    )
      throw new WorkshopError(
        'conflict',
        'The workshop changed. Read its current state before revising it.',
      );
  }
  async exposure(session: WorkshopSession) {
    return this.records.budgetUsage(this.budget(session));
  }
}
