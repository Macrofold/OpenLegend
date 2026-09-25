import { AuthoringRequestError } from './world-authoring-contracts.js';
import { WORLD_READ_TOOLS } from './world-tools.js';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type {
  ApiResult,
  WorldAgentReply,
  WorldAgentAvailability,
  WorldAgentSessionCursor,
  WorldAgentSessionSummary,
  WorldAgentSessionView,
  WorldAgentTurnCursor,
} from '@open-legend/protocol';
import { WorldAgentStore, type AgentSession, type AgentTurnRecord } from './world-agent-store.js';
import {
  WORLD_AUTHORING_TOOLS,
  parseWorldAuthoringCall,
  type WorldAuthoringCall,
} from './world-authoring-contracts.js';
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

export interface WorldAgentTurn {
  /** In-process cancellation only; never serialized into prompts or durable records. */
  signal?: AbortSignal;
  sessionId: string;
  contextHandle: string;
  connectionId: string;
  toolNames: string[];
  budget: { id: string; limitUsd: number };
  runUsd: number;
  timeoutSeconds: number;
}
export type AgentReply = WorldAgentReply;
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
    private available: () => boolean = () => true,
  ) {}
  private serial<T>(id: string, fn: () => Promise<T>): Promise<T> {
    if (this.queued >= 32)
      return Promise.reject(
        new AuthoringRequestError(
          'Authoring is busy; retry after outstanding operations complete.',
        ),
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
  private policy() {
    const c = this.service.config;
    return `owner-review-v1:${fingerprint([c.macrofoldUrl, c.macrofoldHarness, c.macrofoldModel, c.macrofoldWorldConnectionId, Object.keys(WORLD_AUTHORING_TOOLS), Object.keys(WORLD_READ_TOOLS)])}`;
  }
  private permitted(s: AgentSession) {
    return (
      this.available() &&
      !this.service.storageError &&
      this.service.config.godMode &&
      !s.closed &&
      s.expiresAt > Date.now() &&
      s.principal === this.service.profile.id &&
      s.worldId === this.service.world.id &&
      s.timeline === this.service.timelineId &&
      s.credential === this.credential() &&
      s.policy === this.policy()
    );
  }
  async requireSession(id: string): Promise<AgentSession> {
    const s = await this.records.session(id);
    if (!s || !this.permitted(s))
      throw new AuthoringRequestError(
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
  availability(): WorldAgentAvailability {
    const c = this.service.config,
      mcp = c.mcpRead;
    const reason = !c.godMode
      ? 'World-owner mode is required for this authoring surface.'
      : !mcp?.allowWrites || mcp.worldId !== this.service.world.id || mcp.expiresAt <= Date.now()
        ? 'Configure an unexpired writable OpenLegend MCP connector for this world.'
        : !c.macrofoldKey || !/^[a-f0-9-]{36}$/i.test(c.macrofoldWorldConnectionId)
          ? 'Configure the Macrofold API key and an approved World Agent connection.'
          : c.macrofoldComputeUsd <= 0
            ? 'Configure MACROFOLD_COMPUTE_MAX_USD for the native agent worker; native drafts remain available.'
            : c.budgetUsd <= 0
              ? 'Paid execution is disabled by AI_BUDGET_USD; native drafts and approved Apply remain available.'
              : !this.available() || !!this.service.storageError
                ? 'The world is being restored or storage is unavailable.'
                : null;
    return {
      configured: !reason,
      reason:
        reason ??
        'Configured for native Macrofold execution. Connection and provider availability are checked when a turn starts.',
      sessionAllowanceUsd: Math.min(5, c.inventionWorkshopUsd),
    };
  }
  async sessions(before?: WorldAgentSessionCursor) {
    if (!this.service.config.godMode)
      throw new AuthoringRequestError('World-owner authoring is unavailable.');
    const rows = await this.records.sessions(
      this.service.world.id,
      this.service.profile.id,
      before,
    );
    const sessions: WorldAgentSessionSummary[] = rows.slice(0, 20).map((s) => ({
      sessionId: s.id,
      title: s.title ?? 'World conversation',
      createdAt: s.createdAt,
      closed: s.closed,
      available: this.permitted(s),
    }));
    const last = rows.slice(0, 20).at(-1);
    return {
      sessions,
      next: rows.length > 20 && last ? { createdAt: last.createdAt, id: last.id } : null,
    };
  }
  async open(id: string, worldId: string, budgetUsd?: number) {
    if (!this.service.config.godMode || worldId !== this.service.world.id)
      throw new AuthoringRequestError('World-owner authoring is unavailable.');
    return this.serial(id, () =>
      this.records.db.transaction(async () => {
        let s = await this.records.session(id);
        if (s) {
          if (!this.permitted(s) || s.activeTurn)
            throw new AuthoringRequestError(
              'This session cannot be reopened while closed, stale or running.',
            );
          if (budgetUsd !== undefined && budgetUsd !== s.budgetUsd)
            throw new AuthoringRequestError('Reopening does not change the admitted allowance.');
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
            policy: this.policy(),
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
        throw new AuthoringRequestError('Session unavailable.');
      s.closed = true;
      s.contextHash = contextHash(randomBytes(32).toString('hex'));
      await this.records.saveSession(s);
    });
  }
  private async ownedSession(id: string) {
    const s = await this.records.session(id);
    if (
      !s ||
      !this.service.config.godMode ||
      s.principal !== this.service.profile.id ||
      s.worldId !== this.service.world.id
    )
      throw new AuthoringRequestError('Session unavailable.');
    return s;
  }
  async turns(id: string, before?: WorldAgentTurnCursor) {
    await this.ownedSession(id);
    return this.records.turns(id, before);
  }
  async turn(id: string, requestId: string) {
    await this.ownedSession(id);
    const turn = await this.records.get<AgentTurnRecord>(id, 'turn', requestId);
    return turn
      ? {
          id: requestId,
          sequence: turn.sequence ?? 0,
          text: turn.text ?? null,
          createdAt: turn.createdAt ?? null,
          cancelRequested: !!turn.cancelRequested,
          response: turn.response ?? null,
        }
      : null;
  }
  async cancelTurn(id: string, requestId: string) {
    return this.serial(id, () =>
      this.records.db.transaction(async () => {
        const s = await this.ownedSession(id);
        const turn = await this.records.get<AgentTurnRecord>(id, 'turn', requestId);
        if (!turn) throw new AuthoringRequestError('Turn unavailable.');
        if (turn.response || s.activeTurn !== requestId) return false;
        turn.cancelRequested = true;
        // Fence subsequent MCP writes before signalling the remote worker. A committed
        // effect stays committed; cancelling is never a refund or rollback.
        s.contextHash = contextHash(randomBytes(32).toString('hex'));
        await this.records.put(id, 'turn', requestId, turn);
        await this.records.saveSession(s);
        return true;
      }),
    );
  }
  async view(id: string, afterDraft = '', afterPlan = ''): Promise<WorldAgentSessionView> {
    const s = await this.ownedSession(id);
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
  // Invoked once on server startup, never from a model. Old handles cannot remain writable
  // while an interrupted remote worker is being reconciled. Charges stay in the existing ledger.
  async recover() {
    for (;;) {
      const rows = await this.records.activeSessions(this.service.world.id);
      if (!rows.length) break;
      for (const s of rows)
        await this.records.db.transaction(async () => {
          const turn = await this.records.get<AgentTurnRecord>(s.id, 'turn', s.activeTurn!);
          if (turn && !turn.response)
            await this.records.put(s.id, 'turn', s.activeTurn!, {
              ...turn,
              response: {
                ok: false,
                code: 'uncertain',
                jobId: s.activeTurn,
                message:
                  'Server restarted during this turn. Inspect saved drafts and the original remote run; it was not redispatched.',
              },
            });
          delete s.activeTurn;
          s.contextHash = contextHash(randomBytes(32).toString('hex'));
          await this.records.saveSession(s);
        });
    }
  }
  async beginTurn(sessionId: string, requestId: string, text: string) {
    return this.serial(
      sessionId,
      async (): Promise<{ turn?: WorldAgentTurn; response?: AgentReply }> => {
        const s = await this.requireSession(sessionId),
          config = this.service.config;
        const hash = fingerprint({ text, sessionId });
        const prior = await this.records.get<AgentTurnRecord>(sessionId, 'turn', requestId);
        if (prior) {
          if (prior.fingerprint !== hash)
            throw new AuthoringRequestError('Message identity conflicts with prior text.');
          return {
            response: prior.response ?? {
              ok: s.activeTurn === requestId,
              code: s.activeTurn === requestId ? 'running' : 'uncertain',
              message: 'This message is running or uncertain. No duplicate run was dispatched.',
              jobId: requestId,
            },
          };
        }
        if (s.activeTurn)
          throw new AuthoringRequestError('This session already has a running turn.');
        const availability = this.availability();
        if (!availability.configured) throw new AuthoringRequestError(availability.reason);
        if ((await this.records.count(sessionId, 'turn')) >= 256)
          throw new AuthoringRequestError('Session retained-turn limit reached.');
        const exposure = await this.records.exposure(sessionBudgetId(s));
        const remaining = Math.max(
          0,
          this.budget(s).limitUsd - exposure.spentUsd - exposure.reservedUsd,
        );
        if (remaining < 0.000001)
          throw new AuthoringRequestError(
            'Session allowance is exhausted; saved drafts and approved Apply remain available.',
          );
        const contextHandle = randomBytes(32).toString('base64url');
        s.contextHash = contextHash(contextHandle);
        s.activeTurn = requestId;
        s.turnSequence = (s.turnSequence ?? 0) + 1;
        s.title ??= text.slice(0, 60);
        // Commit both identity and handle before any external dispatch.
        await this.records.db.transaction(async () => {
          await this.records.put(sessionId, 'turn', requestId, {
            fingerprint: hash,
            text,
            sequence: s.turnSequence,
            createdAt: Date.now(),
          });
          await this.records.saveSession(s);
        });
        return {
          turn: {
            sessionId,
            contextHandle,
            connectionId: config.macrofoldWorldConnectionId,
            toolNames: [...Object.keys(WORLD_READ_TOOLS), ...Object.keys(WORLD_AUTHORING_TOOLS)],
            budget: this.budget(s),
            runUsd: Math.min(config.macrofoldWorldRunUsd, remaining),
            timeoutSeconds: config.macrofoldWorldTimeoutSeconds,
          },
        };
      },
    );
  }
  async finishTurn(sessionId: string, requestId: string, response: AgentReply) {
    return this.serial(sessionId, async () => {
      const s = await this.records.session(sessionId);
      const record = await this.records.get<AgentTurnRecord>(sessionId, 'turn', requestId);
      if (!s || !record) throw new Error('Missing admitted turn record.');
      if (record.response) return;
      if (record.cancelRequested && !response.ok && response.code !== 'uncertain')
        response = { ...response, code: 'cancelled' };
      await this.records.db.transaction(async () => {
        await this.records.put(sessionId, 'turn', requestId, { ...record, response });
        if (s.activeTurn === requestId) {
          delete s.activeTurn;
          // Terminal or failed runs cannot keep writing through a copied handle.
          s.contextHash = contextHash(randomBytes(32).toString('hex'));
          await this.records.saveSession(s);
        }
      });
    });
  }
  async applyLocal(sessionId: string, planId: string) {
    return this.serial(sessionId, async () =>
      this.dispatch(
        { name: 'ol_change_apply', arguments: { planId } },
        await this.requireSession(sessionId),
      ),
    );
  }
  private async draft(s: AgentSession, id: string, revision: number, current = false) {
    const d = await this.records.get<AuthoringDraft>(s.id, 'revision', `${id}:${revision}`);
    const latest = current ? await this.records.get<AuthoringDraft>(s.id, 'draft', id) : undefined;
    if (!d || (current && latest?.revision !== revision))
      throw new AuthoringRequestError('Draft is unavailable or no longer selected.');
    return d;
  }
  async review(sessionId: string, planId: string) {
    const s = await this.ownedSession(sessionId),
      p = await this.records.get<ChangePlan>(sessionId, 'plan', planId);
    if (!p) throw new AuthoringRequestError('Change plan unavailable.');
    return { plan: p, draft: await this.draft(s, p.draftId, p.revision) };
  }
  async decide(sessionId: string, planId: string, digest: string, decision: 'approve' | 'reject') {
    return this.serial(sessionId, async () => {
      const { plan, draft } = await this.review(sessionId, planId);
      await this.draft(await this.requireSession(sessionId), draft.id, draft.revision, true);
      if (plan.digest !== digest)
        throw new AuthoringRequestError('Review content changed. Refresh the exact plan.');
      if (
        plan.status === 'applied' ||
        plan.status === (decision === 'approve' ? 'approved' : 'rejected')
      )
        return plan;
      if (plan.status !== 'pending')
        throw new AuthoringRequestError(
          'This decision is final; prepare a new plan for another review.',
        );
      if (decision === 'approve') {
        const validation = validateAuthoring(this.service, draft);
        if (
          !validation.ok ||
          authoringImpact(this.service.world, draft).token !== plan.impact.token
        )
          throw new AuthoringRequestError(
            'The reviewed change is no longer ready. Validate and prepare a new review.',
          );
      }
      plan.status = decision === 'approve' ? 'approved' : 'rejected';
      await this.records.put(sessionId, 'plan', plan.id, plan);
      return plan;
    });
  }
  async execute(name: string, raw: unknown, handle: string): Promise<AuthoringResult> {
    const call = parseWorldAuthoringCall(name, raw);
    if (!call) return result('invalid', 'Unknown tool or arguments do not match this tool.');
    if (JSON.stringify(call.arguments).includes(handle))
      return result('invalid', 'Do not place session context in artifact content.');
    try {
      const s = await this.records.byContext(contextHash(handle));
      if (!s || !this.permitted(s))
        return result('forbidden', 'Session context is expired, revoked, or stale.');
      return await this.serial(s.id, async () => {
        const current = await this.requireSession(s.id);
        if (current.contextHash !== contextHash(handle))
          return result('forbidden', 'Session context has been replaced.');
        const args = call.arguments;
        const operationId = 'operationId' in args ? args.operationId : undefined;
        const execute = () => this.dispatch(call, current);
        // Only operational edits use this transaction. Apply enters the world lane first,
        // never with a database lock held (avoids writer/database lock inversion).
        if (!operationId) return execute();
        return this.records.db.transaction(async () => {
          const prior = await this.records.get<{ fingerprint: string; response: AuthoringResult }>(
            s.id,
            'operation',
            operationId,
          );
          const hash = fingerprint({ name, args });
          if (prior)
            return prior.fingerprint === hash
              ? prior.response
              : result('invalid', 'Operation ID already has different content.');
          if ((await this.records.count(s.id, 'operation')) >= 2048)
            return result('capacity', 'This session reached its retained edit limit.');
          const response = await execute();
          await this.records.put(s.id, 'operation', operationId, {
            fingerprint: hash,
            response,
          });
          return response;
        });
      });
    } catch (error) {
      return result(
        error instanceof AuthoringRequestError ? 'blocked' : 'unavailable',
        error instanceof AuthoringRequestError
          ? error.message
          : 'Authoring storage could not confirm the operation. Inspect saved records before retrying.',
      );
    }
  }
  private async dispatch(call: WorldAuthoringCall, s: AgentSession): Promise<AuthoringResult> {
    const { name, arguments: a } = call;
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
        // The world receipt is checked before current-draft admission. A committed Apply
        // remains recoverable if its operational projection failed before a later edit.
        // docs/world-agent-runtime.md#durable-write-sessions
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
