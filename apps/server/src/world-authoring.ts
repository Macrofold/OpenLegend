import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { ApiResult } from '@open-legend/protocol';
import { WorldAgentStore, type AgentSession } from './world-agent-store.js';
import { WORLD_AUTHORING_TOOLS, type WorldAuthoringToolName } from './world-authoring-contracts.js';
import {
  decodeAuthoringPayload,
  draftBase,
  validateAuthoring,
  authoringImpact,
  authoringTransition,
  type AuthoringDraft,
} from './world-authoring-kinds.js';
import { fingerprint } from './relationship-index.js';
import type { WorldService } from './world-service.js';

export interface ChangePlan {
  id: string;
  draftId: string;
  revision: number;
  digest: string;
  impact: { token: string; affected: number };
  validation: ReturnType<typeof validateAuthoring>;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  result?: ApiResult;
}
export interface AuthoringResult {
  status:
    | 'ok'
    | 'invalid'
    | 'stale'
    | 'unavailable'
    | 'capacity'
    | 'forbidden'
    | 'needs_approval'
    | 'blocked';
  message?: string;
  data?: unknown;
  cost: 'no-paid-work';
}
export const contextHash = (value: string) => createHash('sha256').update(value).digest('hex');
export const sessionBudgetId = (session: AgentSession) =>
  `world-agent:${session.worldId}:${session.id}`;
const result = (
  status: AuthoringResult['status'],
  message?: string,
  data?: unknown,
): AuthoringResult => ({
  status,
  cost: 'no-paid-work',
  ...(message ? { message } : {}),
  ...(data !== undefined ? { data } : {}),
});

/** Coordinates operational drafts and approvals, never a second world writer or wallet.
 * Short per-session queues serialize edits/close/Apply; model work runs outside these queues.
 * docs/world-agent-runtime.md#durable-write-sessions
 */
export class WorldAuthoringService {
  private tails = new Map<string, Promise<unknown>>();
  private queued = 0;
  constructor(
    readonly records: WorldAgentStore,
    private service: WorldService,
  ) {}
  private serial<T>(id: string, fn: () => Promise<T>): Promise<T> {
    if (this.queued >= 32)
      return Promise.reject(
        new Error('Authoring is busy; retry after outstanding operations complete.'),
      );
    this.queued++;
    const previous = this.tails.get(id) ?? Promise.resolve();
    const work = previous.catch(() => {}).then(fn);
    this.tails.set(id, work);
    return work.finally(() => {
      this.queued--;
      if (this.tails.get(id) === work) this.tails.delete(id);
    });
  }
  private credential() {
    return this.service.config.mcpRead?.tokenSha256 ?? 'local-owner';
  }
  private permitted(s: AgentSession) {
    return (
      this.service.config.godMode &&
      !s.closed &&
      s.expiresAt > Date.now() &&
      s.principal === this.service.profile.id &&
      s.worldId === this.service.world.id &&
      s.timeline === this.service.timelineId &&
      s.credential === this.credential()
    );
  }
  async requireSession(id: string): Promise<AgentSession> {
    const s = await this.records.session(id);
    if (!s || !this.permitted(s))
      throw new Error(
        'Authoring session expired, closed, or belongs to an obsolete world or grant.',
      );
    return s;
  }
  budget(s: AgentSession) {
    return {
      id: sessionBudgetId(s),
      limitUsd: Math.min(s.budgetUsd, this.service.config.inventionWorkshopUsd),
    };
  }
  async open(id: string, worldId: string, budgetUsd?: number) {
    if (!this.service.config.godMode || worldId !== this.service.world.id)
      throw new Error('World-owner authoring is unavailable.');
    return this.serial(id, () =>
      this.records.db.transaction(async () => {
        let s = await this.records.session(id);
        if (s) {
          if (!this.permitted(s) || s.activeTurn)
            throw new Error('This session cannot be reopened while closed, stale or running.');
          if (budgetUsd !== undefined && budgetUsd !== s.budgetUsd)
            throw new Error('Reopening does not change the admitted allowance.');
        } else {
          s = {
            id,
            worldId,
            timeline: this.service.timelineId,
            principal: this.service.profile.id,
            credential: this.credential(),
            contextHash: '',
            createdAt: Date.now(),
            expiresAt: Date.now() + 7 * 86400_000,
            closed: false,
            budgetUsd: Math.min(budgetUsd ?? 5, this.service.config.inventionWorkshopUsd),
            policy: 'owner-review-v1',
            actorId: this.service.controlledEntityId,
          };
        }
        const contextHandle = randomBytes(32).toString('base64url');
        s.contextHash = contextHash(contextHandle);
        await this.records.saveSession(s);
        return { sessionId: s.id, contextHandle, budgetUsd: s.budgetUsd };
      }),
    );
  }
  async close(id: string) {
    return this.serial(id, async () => {
      const s = await this.records.session(id);
      if (!s || s.principal !== this.service.profile.id || s.worldId !== this.service.world.id)
        throw new Error('Session unavailable.');
      s.closed = true;
      s.contextHash = contextHash(randomBytes(32).toString('hex'));
      await this.records.saveSession(s);
    });
  }
  async view(id: string, afterDraft = '', afterPlan = '') {
    const s = await this.records.session(id);
    if (
      !s ||
      !this.service.config.godMode ||
      s.principal !== this.service.profile.id ||
      s.worldId !== this.service.world.id
    )
      throw new Error('Session unavailable.');
    const [drafts, plans, exposure] = await Promise.all([
      this.records.list<AuthoringDraft>(id, 'draft', afterDraft, 21),
      this.records.list<ChangePlan>(id, 'plan', afterPlan, 21),
      this.records.exposure(sessionBudgetId(s)),
    ]);
    return {
      sessionId: id,
      available: this.permitted(s),
      closed: s.closed,
      activeTurn: s.activeTurn ?? null,
      budget: {
        limitUsd: this.budget(s).limitUsd,
        ...exposure,
        availableUsd: Math.max(
          0,
          this.budget(s).limitUsd - exposure.spentUsd - exposure.reservedUsd,
        ),
        note: 'Uncertain cost is included in spent, not an additional charge. Image generation is not implemented yet.',
      },
      drafts: drafts
        .slice(0, 20)
        .map(({ id, revision, kind, intent, digest }) => ({ id, revision, kind, intent, digest })),
      plans: plans.slice(0, 20),
      nextDraft: drafts.length > 20 ? drafts[19]!.id : null,
      nextPlan: plans.length > 20 ? plans[19]!.id : null,
    };
  }
  private async draft(s: AgentSession, id: string, revision: number, current = false) {
    const d = await this.records.get<AuthoringDraft>(s.id, 'revision', `${id}:${revision}`);
    const latest = current ? await this.records.get<AuthoringDraft>(s.id, 'draft', id) : undefined;
    if (!d || (current && latest?.revision !== revision))
      throw new Error('Draft is unavailable or no longer selected.');
    return d;
  }
  async review(sessionId: string, planId: string) {
    const s = await this.requireSession(sessionId),
      p = await this.records.get<ChangePlan>(sessionId, 'plan', planId);
    if (!p) throw new Error('Change plan unavailable.');
    return { plan: p, draft: await this.draft(s, p.draftId, p.revision) };
  }
  async decide(sessionId: string, planId: string, digest: string, decision: 'approve' | 'reject') {
    return this.serial(sessionId, async () => {
      const { plan, draft } = await this.review(sessionId, planId);
      await this.draft(await this.requireSession(sessionId), draft.id, draft.revision, true);
      if (plan.digest !== digest)
        throw new Error('Review content changed. Refresh the exact plan.');
      if (
        plan.status === 'applied' ||
        plan.status === (decision === 'approve' ? 'approved' : 'rejected')
      )
        return plan;
      if (plan.status !== 'pending')
        throw new Error('This decision is final; prepare a new plan for another review.');
      plan.status = decision === 'approve' ? 'approved' : 'rejected';
      await this.records.put(sessionId, 'plan', plan.id, plan);
      return plan;
    });
  }
  async execute(name: string, raw: unknown, handle: string): Promise<AuthoringResult> {
    if (!Object.hasOwn(WORLD_AUTHORING_TOOLS, name))
      return result('invalid', 'Unknown authoring tool.');
    const tool = WORLD_AUTHORING_TOOLS[name as WorldAuthoringToolName],
      parsed = tool.schema.safeParse(raw);
    if (!parsed.success) return result('invalid', 'Arguments do not match this tool.');
    const s = await this.records.byContext(contextHash(handle));
    if (!s || !this.permitted(s))
      return result('forbidden', 'Session context is expired, revoked, or stale.');
    try {
      return await this.serial(s.id, async () => {
        const current = await this.requireSession(s.id);
        if (current.contextHash !== contextHash(handle))
          return result('forbidden', 'Session context has been replaced.');
        const args = parsed.data as Record<string, any>;
        const execute = () => this.dispatch(name as WorldAuthoringToolName, args, current);
        // Only operational edits use this transaction. Apply enters the world lane first,
        // never with a database lock held (avoids writer/database lock inversion).
        if (!args.operationId) return execute();
        return this.records.db.transaction(async () => {
          const prior = await this.records.get<{ fingerprint: string; response: AuthoringResult }>(
            s.id,
            'operation',
            args.operationId,
          );
          const hash = fingerprint({ name, args });
          if (prior)
            return prior.fingerprint === hash
              ? prior.response
              : result('invalid', 'Operation ID already has different content.');
          if ((await this.records.count(s.id, 'operation')) >= 2048)
            return result('capacity', 'This session reached its retained edit limit.');
          const response = await execute();
          await this.records.put(s.id, 'operation', args.operationId, {
            fingerprint: hash,
            response,
          });
          return response;
        });
      });
    } catch (error) {
      return result(
        'blocked',
        error instanceof Error ? error.message : 'Authoring operation failed.',
      );
    }
  }
  private async dispatch(
    name: WorldAuthoringToolName,
    a: Record<string, any>,
    s: AgentSession,
  ): Promise<AuthoringResult> {
    switch (name) {
      case 'ol_session':
        return result('ok', undefined, await this.view(s.id, a.afterDraft, a.afterPlan));
      case 'ol_draft_create': {
        if ((await this.records.count(s.id, 'draft')) >= 64)
          return result('capacity', 'This session already has 64 drafts.');
        if (a.baseRecipeId && a.kind !== 'recipe')
          return result('invalid', 'Only a recipe uses baseRecipeId.');
        const payload = decodeAuthoringPayload(a.kind, a.payloadJson);
        const d: AuthoringDraft = {
          id: randomUUID(),
          revision: 1,
          kind: a.kind,
          intent: a.intent,
          payload,
          actorId: s.actorId,
          policyRevision: this.service.world.inventionPolicy.revision,
          base: draftBase(this.service.world, a.kind, payload, undefined, a.baseRecipeId),
          digest: '',
        };
        d.digest = fingerprint({ ...d, digest: '' });
        await this.records.put(s.id, 'revision', `${d.id}:1`, d);
        await this.records.put(s.id, 'draft', d.id, d);
        return result('ok', 'Draft saved, not installed.', d);
      }
      case 'ol_draft_update': {
        const old = await this.draft(s, a.draftId, a.expectedRevision, true);
        if (old.revision >= 256)
          return result('capacity', 'This draft reached its retained revision limit.');
        const payload = decodeAuthoringPayload(old.kind, a.payloadJson);
        const d: AuthoringDraft = {
          ...old,
          revision: old.revision + 1,
          payload,
          intent: a.intent ?? old.intent,
          base: draftBase(this.service.world, old.kind, payload, old.base),
        };
        d.digest = fingerprint({ ...d, digest: '' });
        await this.records.put(s.id, 'revision', `${d.id}:${d.revision}`, d);
        await this.records.put(s.id, 'draft', d.id, d);
        return result('ok', 'New revision saved; older reviews cannot apply to it.', d);
      }
      case 'ol_draft_read':
        return result('ok', undefined, await this.draft(s, a.draftId, a.revision));
      case 'ol_compare': {
        const before = await this.draft(s, a.draftId, a.fromRevision),
          after = await this.draft(s, a.draftId, a.toRevision);
        return result('ok', undefined, {
          before,
          after,
          changed: Object.keys({
            ...(before.payload as object),
            ...(after.payload as object),
          }).filter(
            (k) =>
              fingerprint((before.payload as Record<string, unknown>)[k] ?? null) !==
              fingerprint((after.payload as Record<string, unknown>)[k] ?? null),
          ),
        });
      }
      case 'ol_validate':
        return result(
          'ok',
          undefined,
          validateAuthoring(this.service, await this.draft(s, a.draftId, a.revision, true)),
        );
      case 'ol_change_prepare': {
        if ((await this.records.count(s.id, 'plan')) >= 512)
          return result('capacity', 'This session reached its review-plan limit.');
        const d = await this.draft(s, a.draftId, a.revision, true),
          validation = validateAuthoring(this.service, d);
        if (!validation.ok) return result('blocked', validation.message, validation);
        const impact = authoringImpact(this.service.world, d);
        const plan: ChangePlan = {
          id: randomUUID(),
          draftId: d.id,
          revision: d.revision,
          digest: fingerprint({ draft: d.digest, impact, session: s.id, timeline: s.timeline }),
          impact,
          validation,
          status: 'pending',
        };
        await this.records.put(s.id, 'plan', plan.id, plan);
        return result(
          'needs_approval',
          'Review prepared. The human must approve this exact plan.',
          plan,
        );
      }
      case 'ol_approval_request':
        return result(
          'needs_approval',
          'Use the application review card; no agent approval tool exists.',
          await this.review(s.id, a.planId),
        );
      case 'ol_change_apply': {
        const { plan, draft } = await this.review(s.id, a.planId);
        if (plan.status === 'applied') return result('ok', plan.result?.message, plan);
        if (plan.status !== 'approved')
          return result('needs_approval', 'This exact plan is not approved.', plan);
        await this.draft(s, draft.id, draft.revision, true);
        const id = `wa-${plan.id}`;
        const applied = await this.service.reviewedTransition(
          id,
          plan.digest,
          s.timeline,
          async (world) => {
            const fresh = await this.requireSession(s.id);
            const latest = await this.records.get<ChangePlan>(s.id, 'plan', plan.id);
            await this.draft(fresh, draft.id, draft.revision, true);
            if (
              fresh.contextHash !== s.contextHash ||
              latest?.status !== 'approved' ||
              authoringImpact(world, draft).token !== plan.impact.token
            )
              return {
                world,
                events: [],
                outcome: {
                  ok: false,
                  code: 'stale-review',
                  message: 'Authority or affected instances changed; prepare another review.',
                },
              };
            return authoringTransition(this.service, world, draft, id);
          },
        );
        if (!applied.ok) return result('blocked', applied.message, applied);
        plan.status = 'applied';
        plan.result = applied;
        // The world and permanent receipt committed together. A crash before this projection
        // is saved returns that receipt on retry rather than applying effects again.
        await this.records.put(s.id, 'plan', plan.id, plan);
        return result('ok', applied.message, plan);
      }
    }
  }
}
