import type { RequestScope } from './authority.js';
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
  WorldAgentPreparation,
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
import {
  CONTEXT_WORK,
  prepareAuthoring,
  authoringEvidenceDependencies,
} from './world-authoring-analysis.js';
import {
  authoringGuide,
  buildAuthoringPacket,
  contextMembership,
  packetCurrent,
  profileTools,
  renderAuthoringPacket,
  type AuthoringPacket,
} from './world-authoring-context.js';
import { readDefinition } from './world-graph.js';
import { normalizeInventionProposal } from './invention-service.js';
import type { WorldToolService, WorldToolResult } from './world-tools.js';

export interface WorldAgentTurn {
  /** In-process cancellation only; never serialized into prompts or durable records. */
  signal?: AbortSignal;
  authority: RequestScope;
  sessionId: string;
  contextHandle: string;
  connectionId: string;
  toolNames: string[];
  budget: { id: string; limitUsd: number };
  runUsd: number;
  timeoutSeconds: number;
  prompt: string;
  profile: AuthoringPacket['profile'];
}
export type AgentReply = WorldAgentReply;
export interface ChangePlan {
  id: string;
  draftId: string;
  revision: number;
  digest: string;
  impact: { token: string; affected: number };
  validation: ReturnType<typeof validateAuthoring>;
  preparation?: WorldAgentPreparation;
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
    | 'blocked'
    | 'ready_for_review'
    | 'needs_revision'
    | 'pending_analysis';
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
  private permitted(s: AgentSession, scope = s.authority) {
    return (
      this.available() &&
      !this.service.storageError &&
      this.service.config.godMode &&
      !s.closed &&
      s.expiresAt > Date.now() &&
      !!scope &&
      s.principal === scope.accountId &&
      s.actorId === scope.actorId &&
      s.authority.grantRevision === scope.grantRevision &&
      this.service.currentScope(scope, 'create') &&
      this.service.currentScope(scope, 'inspect') &&
      s.worldId === this.service.world.id &&
      s.timeline === this.service.timelineId &&
      s.credential === this.credential() &&
      s.policy === this.policy()
    );
  }
  async requireSession(id: string, scope?: RequestScope): Promise<AgentSession> {
    const s = await this.records.session(id);
    if (!s || !this.permitted(s, scope))
      throw new AuthoringRequestError(
        'Authoring session expired, closed, or belongs to an obsolete world or grant.',
      );
    return scope ? { ...s, authority: scope } : s;
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
          : !c.macrofoldWorkerId
            ? 'The world owner must configure an execution Worker; native drafts remain available.'
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
  async sessions(before?: WorldAgentSessionCursor, scope = this.service.localScope) {
    this.service.assertScope(scope, 'create');
    this.service.assertScope(scope, 'inspect');
    if (!this.service.config.godMode)
      throw new AuthoringRequestError('World-owner authoring is unavailable.');
    const rows = await this.records.sessions(this.service.world.id, scope.accountId, before);
    const sessions: WorldAgentSessionSummary[] = rows.slice(0, 20).map((s) => ({
      sessionId: s.id,
      title: s.title ?? 'World conversation',
      createdAt: s.createdAt,
      closed: s.closed,
      available: this.permitted(s, scope),
    }));
    const last = rows.slice(0, 20).at(-1);
    return {
      sessions,
      next: rows.length > 20 && last ? { createdAt: last.createdAt, id: last.id } : null,
    };
  }
  async open(id: string, worldId: string, budgetUsd?: number, scope = this.service.localScope) {
    this.service.assertScope(scope, 'create');
    this.service.assertScope(scope, 'inspect');
    if (!this.service.config.godMode || worldId !== this.service.world.id)
      throw new AuthoringRequestError('World-owner authoring is unavailable.');
    return this.serial(id, () =>
      this.records.db.transaction(async () => {
        let s = await this.records.session(id);
        if (s) {
          if (!this.permitted(s, scope) || s.activeTurn)
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
            principal: scope.accountId,
            authority: scope,
            credential: this.credential(),
            contextHash: '',
            createdAt: Date.now(),
            expiresAt: Date.now() + 7 * 86400_000,
            closed: false,
            budgetUsd: Math.min(budgetUsd ?? 5, this.service.config.inventionWorkshopUsd),
            policy: this.policy(),
            actorId: scope.actorId,
          };
        }
        const contextHandle = randomBytes(32).toString('base64url');
        s.authority = scope;
        s.contextHash = contextHash(contextHandle);
        await this.records.saveSession(s);
        return { sessionId: s.id, contextHandle, budgetUsd: s.budgetUsd };
      }),
    );
  }
  async close(id: string, scope = this.service.localScope) {
    return this.serial(id, async () => {
      const s = await this.records.session(id);
      this.service.assertScope(scope, 'create');
      if (!s || s.principal !== scope.accountId || s.worldId !== this.service.world.id)
        throw new AuthoringRequestError('Session unavailable.');
      s.closed = true;
      s.contextHash = contextHash(randomBytes(32).toString('hex'));
      await this.records.saveSession(s);
    });
  }
  private async ownedSession(id: string, scope: RequestScope) {
    const s = await this.records.session(id);
    if (
      !s ||
      !this.service.config.godMode ||
      s.principal !== scope.accountId ||
      s.actorId !== scope.actorId ||
      !this.service.currentScope(scope, 'create') ||
      !this.service.currentScope(scope, 'inspect') ||
      s.worldId !== this.service.world.id
    )
      throw new AuthoringRequestError('Session unavailable.');
    return s;
  }
  async turns(id: string, before?: WorldAgentTurnCursor, scope = this.service.localScope) {
    await this.ownedSession(id, scope);
    return this.records.turns(id, before);
  }
  async turn(id: string, requestId: string, scope = this.service.localScope) {
    await this.ownedSession(id, scope);
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
  async cancelTurn(id: string, requestId: string, scope = this.service.localScope) {
    return this.serial(id, () =>
      this.records.db.transaction(async () => {
        const s = await this.ownedSession(id, scope);
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
  async view(
    id: string,
    afterDraft = '',
    afterPlan = '',
    scope = this.service.localScope,
  ): Promise<WorldAgentSessionView> {
    const s = await this.ownedSession(id, scope);
    const [drafts, plans, exposure] = await Promise.all([
      this.records.list<AuthoringDraft>(id, 'draft', afterDraft, 21),
      this.records.list<ChangePlan>(id, 'plan', afterPlan, 21),
      this.records.exposure(sessionBudgetId(s)),
    ]);
    return {
      sessionId: id,
      available: this.permitted(s, scope),
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
      plans: plans.slice(0, 20).map(({ preparation: _preparation, ...plan }) => plan),
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
          await this.records.clearPackets(s.id);
        });
    }
  }
  async beginTurn(sessionId: string, requestId: string, text: string, scope: RequestScope) {
    return this.serial(
      sessionId,
      async (): Promise<{ turn?: WorldAgentTurn; response?: AgentReply }> => {
        const s = await this.requireSession(sessionId, scope),
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
        s.toolCalls = 0;
        let selected = s.selectedDraft
          ? await this.records.get<AuthoringDraft>(
              s.id,
              'revision',
              `${s.selectedDraft.id}:${s.selectedDraft.revision}`,
            )
          : undefined;
        const profile = s.pendingProfile?.kind ?? selected?.kind ?? s.profile ?? 'discovery';
        if (s.pendingProfile && s.profile !== profile) {
          // A different kind starts from the request that selected it, not the previous
          // invention's requirements. Its prior drafts/turns remain immutable and readable.
          s.requirements = s.requirements?.filter(
            (r) => r.source.turnId === s.pendingProfile?.turnId,
          );
          selected = undefined;
          delete s.selectedDraft;
        }
        s.profile = profile;
        delete s.pendingProfile;
        const packet = buildAuthoringPacket(
          this.service.world,
          s,
          randomUUID(),
          text,
          profile,
          selected,
        );
        const prompt = renderAuthoringPacket(packet, contextHandle);
        s.packetRef = packet.id;
        s.requirements = packet.requirements;
        // Commit both identity and handle before any external dispatch.
        await this.records.db.transaction(async () => {
          await this.records.put(sessionId, 'turn', requestId, {
            fingerprint: hash,
            text,
            sequence: s.turnSequence,
            createdAt: Date.now(),
          });
          await this.records.saveSession(s);
          await this.records.clearPackets(s.id);
          await this.records.put(s.id, 'packet', packet.id, packet);
        });
        return {
          turn: {
            authority: scope,
            sessionId,
            contextHandle,
            connectionId: config.macrofoldWorldConnectionId,
            toolNames: profileTools(profile),
            prompt,
            profile,
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
          await this.records.clearPackets(s.id);
        }
      });
    });
  }
  async nextRecipeStage(
    sessionId: string,
    requestId: string,
    handle: string,
    scope: RequestScope,
  ): Promise<WorldAgentTurn | undefined> {
    return this.serial(sessionId, async () => {
      const s = await this.requireSession(sessionId, scope);
      if (
        s.activeTurn !== requestId ||
        s.contextHash !== contextHash(handle) ||
        s.profile !== 'discovery' ||
        s.pendingProfile?.kind !== 'recipe' ||
        s.pendingProfile.turnId !== requestId
      )
        return;
      const turn = await this.records.get<AgentTurnRecord>(s.id, 'turn', requestId);
      const exposure = await this.records.exposure(sessionBudgetId(s));
      if (!turn || turn.cancelRequested || exposure.uncertainUsd > 0) return;
      const remaining = this.budget(s).limitUsd - exposure.spentUsd - exposure.reservedUsd;
      if (remaining < 0.000001) return;
      const contextHandle = randomBytes(32).toString('base64url');
      s.contextHash = contextHash(contextHandle);
      s.profile = 'recipe';
      delete s.pendingProfile;
      // One admitted turn keeps its aggregate tool-work budget across this planned stage.
      const packet = buildAuthoringPacket(
        this.service.world,
        s,
        randomUUID(),
        turn.text ?? '',
        'recipe',
      );
      const prompt = renderAuthoringPacket(packet, contextHandle);
      s.packetRef = packet.id;
      await this.records.db.transaction(async () => {
        await this.records.put(s.id, 'packet', packet.id, packet);
        await this.records.saveSession(s);
      });
      return {
        authority: scope,
        sessionId,
        contextHandle,
        connectionId: this.service.config.macrofoldWorldConnectionId,
        toolNames: profileTools('recipe'),
        profile: 'recipe',
        prompt,
        budget: this.budget(s),
        runUsd: Math.min(this.service.config.macrofoldWorldRunUsd, remaining),
        timeoutSeconds: this.service.config.macrofoldWorldTimeoutSeconds,
      };
    });
  }
  async applyLocal(sessionId: string, planId: string, scope = this.service.localScope) {
    return this.serial(sessionId, async () =>
      this.dispatch(
        { name: 'ol_change_apply', arguments: { planId } },
        await this.requireSession(sessionId, scope),
      ),
    );
  }
  private async draft(s: AgentSession, id: string, revision: number, current = false) {
    const d = await this.records.get<AuthoringDraft>(s.id, 'revision', `${id}:${revision}`);
    const latest = current ? await this.records.get<AuthoringDraft>(s.id, 'draft', id) : undefined;
    if (!d) throw new AuthoringRequestError('Draft is unavailable.', 'unavailable');
    if (current && latest?.revision !== revision)
      throw new AuthoringRequestError('Draft is no longer the selected revision.', 'stale');
    return d;
  }
  async review(sessionId: string, planId: string, scope = this.service.localScope) {
    const s = await this.ownedSession(sessionId, scope),
      p = await this.records.get<ChangePlan>(sessionId, 'plan', planId);
    if (!p) throw new AuthoringRequestError('Change plan unavailable.');
    return { plan: p, draft: await this.draft(s, p.draftId, p.revision) };
  }
  async decide(
    sessionId: string,
    planId: string,
    digest: string,
    decision: 'approve' | 'reject',
    scope = this.service.localScope,
  ) {
    return this.serial(sessionId, async () => {
      const { plan, draft } = await this.review(sessionId, planId, scope);
      await this.draft(await this.requireSession(sessionId, scope), draft.id, draft.revision, true);
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
        const validation = validateAuthoring(this.service, draft, scope);
        if (
          !validation.ok ||
          authoringImpact(this.service.world, draft).token !== plan.impact.token ||
          (plan.preparation &&
            plan.preparation.evidence.dependencies !==
              authoringEvidenceDependencies(this.service.world, draft, scope))
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
  async readContext(handle: string): Promise<RequestScope | undefined> {
    const session = await this.records.byContext(contextHash(handle));
    return session && this.permitted(session) ? session.authority : undefined;
  }
  /** The same turn budget and packet binding covers reads as well as writes. The shared
   * read owner still performs disclosure and source validation; this adds only continuity. */
  async executeRead(
    name: string,
    raw: unknown,
    handle: string,
    tools: WorldToolService,
    scope?: RequestScope,
  ): Promise<AuthoringResult | WorldToolResult> {
    try {
      const session = await this.records.byContext(contextHash(handle));
      if (!session || !this.permitted(session, scope))
        return result('forbidden', 'Context is unavailable.');
      return await this.serial(session.id, async () => {
        const s = await this.requireSession(session.id, scope);
        if (s.contextHash !== contextHash(handle))
          return result('forbidden', 'Context was replaced.');
        const parsed =
          name === 'ol_inspect' ? WORLD_READ_TOOLS.ol_inspect.schema.safeParse(raw) : undefined;
        const recovering = parsed?.success && parsed.data.kind === 'authoring-operation';
        if (s.activeTurn) {
          if (!profileTools(s.profile ?? 'discovery').includes(name))
            return result('forbidden', 'Tool is outside this turn’s profile.');
          if (!recovering && (s.toolCalls ?? 0) >= CONTEXT_WORK.tools)
            return result('capacity', 'Turn tool-work limit reached. Finish; do not repeat calls.');
          if (!recovering) {
            s.toolCalls = (s.toolCalls ?? 0) + 1;
            await this.records.saveSession(s);
          }
        }
        const readWorld = this.service.world;
        let response: AuthoringResult | WorldToolResult;
        let selected: AuthoringDraft | undefined;
        if (parsed?.success && parsed.data.kind === 'authoring-operation') {
          const saved = await this.records.get<{ response: AuthoringResult }>(
            s.id,
            'operation',
            parsed.data.id,
          );
          response = saved
            ? result('ok', 'Retained exact operation outcome.', saved.response)
            : result(
                'unavailable',
                'No committed operation outcome is available under this identity. Do not guess another write ID.',
              );
          // Recovery reads retained receipts, not current-world facts. Quotas and changed
          // definition pins must not hide an already committed outcome from its owner.
          if (!this.permitted(s, scope)) return result('forbidden', 'Inspection scope changed.');
          return response.status === 'ok' && s.activeTurn && s.packetRef
            ? result('ok', response.message, { result: response.data, packetRef: s.packetRef })
            : response;
        } else if (parsed?.success && parsed.data.kind === 'authoring-draft') {
          selected = await this.records.get<AuthoringDraft>(s.id, 'draft', parsed.data.id);
          response = !selected
            ? result('unavailable', 'Draft unavailable.')
            : parsed.data.version && parsed.data.version !== selected.digest
              ? result('stale', 'Draft changed.')
              : result('ok', undefined, selected);
        } else
          response = await tools.execute(name, raw, {
            worldId: s.worldId,
            principal: s.principal,
            scope: s.authority,
          });
        if (!this.permitted(s, scope)) return result('forbidden', 'Inspection scope changed.');
        if (contextMembership(readWorld) !== contextMembership(this.service.world))
          return result(
            'stale',
            'Definitions changed during inspection. Read current facts before submitting.',
          );
        if (response.status !== 'ok' || !s.activeTurn || !s.packetRef) return response;
        const prior = await this.records.get<AuthoringPacket>(s.id, 'packet', s.packetRef);
        if (!prior) return result('stale', 'Packet unavailable; start a fresh context.');
        if (selected) {
          if (selected.kind !== s.profile)
            return result('blocked', 'Select this draft’s kind before inspecting it in this turn.');
          s.selectedDraft = { id: selected.id, revision: selected.revision };
          s.requirements = selected.preparation?.requirements;
        }
        selected ??= s.selectedDraft
          ? await this.records.get<AuthoringDraft>(s.id, 'draft', s.selectedDraft.id)
          : undefined;
        const packet = buildAuthoringPacket(
          readWorld,
          s,
          randomUUID(),
          prior.requirements.find((r) => r.source.turnId === s.activeTurn)?.source.text ?? '',
          s.profile ?? 'discovery',
          selected,
        );
        if (packetCurrent(prior, readWorld, s)) packet.pins = [...prior.pins];
        if (parsed?.success) {
          const ref = readDefinition(readWorld, parsed.data.kind, parsed.data.id)?.node.ref;
          if (
            ref &&
            !packet.pins.some(
              (p) => p.kind === ref.kind && p.id === ref.id && p.version === ref.version,
            )
          )
            packet.pins.push(ref);
        }
        if (packet.pins.length > CONTEXT_WORK.records)
          return result('capacity', 'Required references exceed one packet slice.');
        await this.records.put(s.id, 'packet', packet.id, packet);
        s.packetRef = packet.id;
        await this.records.saveSession(s);
        if (!this.permitted(s, scope)) return result('forbidden', 'Inspection scope changed.');
        return result('ok', response.message, {
          result: response.data,
          packetRef: packet.id,
          ...(!packetCurrent(prior, readWorld, s) ? { refreshedContext: packet.facts } : {}),
        });
      });
    } catch (error) {
      return result(
        error instanceof AuthoringRequestError ? error.code : 'unavailable',
        error instanceof AuthoringRequestError
          ? error.message
          : 'Inspection could not be confirmed. Saved records remain available.',
      );
    }
  }
  async execute(
    name: string,
    raw: unknown,
    handle: string,
    scope?: RequestScope,
  ): Promise<AuthoringResult> {
    const call = parseWorldAuthoringCall(name, raw);
    if (!call) return result('invalid', 'Unknown tool or arguments do not match this tool.');
    if (JSON.stringify(call.arguments).includes(handle))
      return result('invalid', 'Do not place session context in artifact content.');
    try {
      const s = await this.records.byContext(contextHash(handle));
      if (!s || !this.permitted(s, scope))
        return result('forbidden', 'Session context is expired, revoked, or stale.');
      const response = await this.serial(s.id, async () => {
        const current = await this.requireSession(s.id, scope);
        if (current.contextHash !== contextHash(handle))
          return result('forbidden', 'Session context has been replaced.');
        const args = call.arguments;
        if (current.activeTurn && !profileTools(current.profile ?? 'discovery').includes(name))
          return result('forbidden', 'This operation is outside the admitted tool profile.');
        const operationId = 'operationId' in args ? args.operationId : undefined;
        // Lost replies remain recoverable even after the new-work allowance is exhausted.
        if (operationId) {
          const prior = await this.records.get<{ fingerprint: string; response: AuthoringResult }>(
            s.id,
            'operation',
            operationId,
          );
          if (prior)
            return prior.fingerprint === fingerprint({ name, args })
              ? prior.response
              : result('invalid', 'Operation ID already has different content.');
        }
        if (current.activeTurn) {
          if ((current.toolCalls ?? 0) >= CONTEXT_WORK.tools)
            return result(
              'capacity',
              'This turn reached its tool-work limit. Finish and retain the current work; do not keep calling tools.',
            );
          current.toolCalls = (current.toolCalls ?? 0) + 1;
          await this.records.saveSession(current);
        }
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
      // A revocation while a repository read was pending must fence its outgoing contents too.
      return this.permitted(s, scope)
        ? response
        : result(
            'forbidden',
            'Current session access is unavailable. Any committed receipt is retained.',
          );
    } catch (error) {
      return result(
        error instanceof AuthoringRequestError ? error.code : 'unavailable',
        error instanceof AuthoringRequestError
          ? error.message
          : 'Authoring storage could not confirm the operation. Inspect saved records before retrying.',
      );
    }
  }
  private assertDraftTarget(kind: AuthoringDraft['kind'], payload: unknown, scope: RequestScope) {
    if (kind !== 'attribute-bindings' && kind !== 'attribute-values') return;
    const entityId =
      payload && typeof payload === 'object' && 'entityId' in payload
        ? payload.entityId
        : undefined;
    // Even a base fingerprint can disclose private state; check before constructing a draft.
    if (typeof entityId !== 'string' || !this.service.mayInspectPrivate(entityId, scope))
      throw new AuthoringRequestError('This body is unavailable to the current account.');
  }
  private async draftRequirements(s: AgentSession, d: AuthoringDraft) {
    const packet = s.packetRef
      ? await this.records.get<AuthoringPacket>(s.id, 'packet', s.packetRef)
      : undefined;
    return (
      packet?.requirements ??
      d.preparation?.requirements ?? [
        {
          id: `request-${d.id}`,
          source: { turnId: s.activeTurn ?? `local-${d.id}`, text: d.intent },
          strength: 'request' as const,
          status: 'human-review' as const,
          finding:
            'Supplied intent; exact human review establishes acceptance, not a mechanical shape check.',
        },
      ]
    );
  }
  private async dispatch(call: WorldAuthoringCall, s: AgentSession): Promise<AuthoringResult> {
    const { name, arguments: a } = call;
    switch (name) {
      case 'ol_authoring_guide':
        return result('ok', undefined, authoringGuide(this.service.world, a.kind));
      case 'ol_request_capability': {
        if (!s.activeTurn || s.profile === a.kind)
          return result(
            'blocked',
            'Request a different supported profile only when the current human task needs it.',
          );
        s.pendingProfile = { kind: a.kind, reason: a.reason, turnId: s.activeTurn };
        await this.records.saveSession(s);
        return result(
          'ok',
          a.kind === 'recipe'
            ? 'Recipe preparation is selected. Finish this discovery stage; native coordination admits the next stage only after this run completes and accounting is known.'
            : 'This kind is selected for the next human turn. Explain its scope and ask the person to continue; no broader-scope run is automatically started.',
        );
      }
      case 'ol_authoring_submit':
      case 'ol_status_policy_submit':
      case 'ol_cognition_policy_submit':
      case 'ol_attribute_submit':
      case 'ol_attribute_bindings_submit':
      case 'ol_attribute_values_submit':
      case 'ol_action_submit':
      case 'ol_recipe_submit': {
        const kind = name === 'ol_recipe_submit' ? 'recipe' : a.proposal.kind;
        const deriveFrom = name === 'ol_recipe_submit' ? a.deriveFrom : undefined;
        const packet = await this.records.get<AuthoringPacket>(s.id, 'packet', a.packetRef);
        const world = this.service.world;
        if (
          !packet ||
          packet.id !== s.packetRef ||
          packet.profile !== kind ||
          !packetCurrent(packet, world, s)
        )
          return result(
            'stale',
            'Required context changed or is unavailable. Inspect current facts to obtain a fresh packet; no draft was written.',
          );
        const old = a.edit
          ? await this.draft(s, a.edit.draftId, a.edit.expectedRevision, true)
          : undefined;
        if (old && old.kind !== kind)
          return result('invalid', 'The selected draft has a different kind.');
        if (a.edit && deriveFrom)
          return result('invalid', 'Choose an edit or a new derived recipe, not both.');
        if (old && (packet.selected?.id !== old.id || packet.selected.revision !== old.revision))
          return result('stale', 'Inspect the exact current draft before revising it.');
        if (deriveFrom) {
          const base = readDefinition(world, 'recipe', deriveFrom.recipeId);
          if (
            !base ||
            base.node.ref.version !== deriveFrom.version ||
            !packet.pins.some(
              (pin) =>
                pin.kind === 'recipe' &&
                pin.id === base.node.ref.id &&
                pin.version === base.node.ref.version,
            )
          )
            return result(
              'stale',
              'Derivation requires an inspected exact recipe reference in this packet.',
            );
        }
        if (old && old.revision >= 256)
          return result('capacity', 'This draft reached its retained revision limit.');
        if (!old && (await this.records.count(s.id, 'draft')) >= 64)
          return result('capacity', 'This session reached its retained draft limit.');
        if ((await this.records.count(s.id, 'plan')) >= 512)
          return result('capacity', 'This session reached its retained review limit.');
        // Capture after repository waits. The synchronous native pass uses this exact snapshot.
        const snapshot = this.service.world;
        if (!packetCurrent(packet, snapshot, s))
          return result('stale', 'Context changed while preparing the submission.');
        const payload =
          name === 'ol_recipe_submit'
            ? normalizeInventionProposal(a.candidate)
            : a.proposal.candidate;
        if (Buffer.byteLength(JSON.stringify(payload)) > 24000)
          return result('capacity', 'Candidate exceeds the authoring byte limit.');
        this.assertDraftTarget(kind, payload, s.authority);
        const requirements = structuredClone(packet.requirements);
        for (const [i, requirement] of (a.requirements ?? []).entries()) {
          const source = packet.requirements.find(
            (r) =>
              r.source.turnId === requirement.sourceTurnId &&
              r.source.text.includes(requirement.quote),
          );
          if (!source)
            return result(
              'invalid',
              'Requirement quotes must come from the retained human request.',
            );
          const findingId = `finding-${a.operationId}-${i}`;
          if (requirement.supersedes) {
            const previous = requirements.find((r) => r.id === requirement.supersedes);
            if (
              !previous ||
              source.source.turnId !== s.activeTurn ||
              previous.source.turnId === s.activeTurn
            )
              return result(
                'invalid',
                'Replacing a prior requirement needs a quote from a newer human turn.',
              );
            previous.status = 'superseded';
            previous.supersededBy = findingId;
          }
          requirements.push({
            id: findingId,
            source: { turnId: source.source.turnId, text: requirement.quote },
            strength: requirement.strength,
            status: requirement.status,
            finding: requirement.finding,
          });
        }
        if (requirements.length > CONTEXT_WORK.records)
          return result('capacity', 'Retained requirements exceed the current record envelope.');
        const d: AuthoringDraft = {
          id: old?.id ?? randomUUID(),
          revision: (old?.revision ?? 0) + 1,
          kind,
          intent: [...new Set(packet.requirements.map((r) => r.source.text))].join('\n'),
          payload,
          actorId: s.actorId,
          policyRevision: old?.policyRevision ?? snapshot.inventionPolicy.revision,
          base: draftBase(snapshot, kind, payload, old?.base, deriveFrom?.recipeId),
          digest: '',
        };
        d.digest = fingerprint(d);
        const { preparation, validation, impact } = prepareAuthoring(
          this.service,
          snapshot,
          d,
          s.authority,
          s.timeline,
          requirements,
        );
        d.preparation = preparation;
        await this.records.put(s.id, 'revision', `${d.id}:${d.revision}`, d);
        await this.records.put(s.id, 'draft', d.id, d);
        s.selectedDraft = { id: d.id, revision: d.revision };
        s.requirements = requirements;
        let plan: ChangePlan | undefined;
        if (preparation.next === 'ready_for_review') {
          plan = {
            id: randomUUID(),
            draftId: d.id,
            revision: d.revision,
            digest: fingerprint({
              draft: d.digest,
              evidence: preparation.evidence,
              impact,
              session: s.id,
              timeline: s.timeline,
            }),
            impact,
            validation,
            preparation,
            status: 'pending',
          };
          await this.records.put(s.id, 'plan', plan.id, plan);
        }
        const freshPacket = buildAuthoringPacket(snapshot, s, randomUUID(), '', kind, d);
        await this.records.put(s.id, 'packet', freshPacket.id, freshPacket);
        s.packetRef = freshPacket.id;
        await this.records.saveSession(s);
        return result(
          preparation.next,
          plan
            ? 'Saved and awaiting human review. Explain the tradeoff and finish. Nothing is installed or crafted.'
            : 'Candidate saved with findings; no approval plan was created.',
          {
            operationId: a.operationId,
            draft: { id: d.id, revision: d.revision },
            packetRef: freshPacket.id,
            ...(plan ? { review: { id: plan.id, status: plan.status } } : {}),
            checks: preparation.checks.map(({ id, status, finding }) => ({ id, status, finding })),
            findings: preparation.graph.unresolved,
            coverage: preparation.coverage,
            installation: 'not-applied',
            instance: 'not-created',
          },
        );
      }
      case 'ol_session':
        return result(
          'ok',
          undefined,
          await this.view(s.id, a.afterDraft, a.afterPlan, s.authority),
        );
      case 'ol_draft_create': {
        if ((await this.records.count(s.id, 'draft')) >= 64)
          return result('capacity', 'This session already has 64 drafts.');
        if (a.baseRecipeId && a.kind !== 'recipe')
          return result('invalid', 'Only a recipe uses baseRecipeId.');
        const payload = decodeAuthoringPayload(a.kind, a.payloadJson);
        this.assertDraftTarget(a.kind, payload, s.authority);
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
        const requirements = await this.draftRequirements(s, d);
        d.preparation = prepareAuthoring(
          this.service,
          this.service.world,
          d,
          s.authority,
          s.timeline,
          requirements,
        ).preparation;
        await this.records.put(s.id, 'revision', `${d.id}:1`, d);
        await this.records.put(s.id, 'draft', d.id, d);
        s.selectedDraft = { id: d.id, revision: d.revision };
        await this.records.saveSession(s);
        return result('ok', 'Draft saved, not installed.', d);
      }
      case 'ol_draft_update': {
        const old = await this.draft(s, a.draftId, a.expectedRevision, true);
        if (old.revision >= 256)
          return result('capacity', 'This draft reached its retained revision limit.');
        const payload = decodeAuthoringPayload(old.kind, a.payloadJson);
        this.assertDraftTarget(old.kind, payload, s.authority);
        const d: AuthoringDraft = {
          ...old,
          revision: old.revision + 1,
          payload,
          intent: a.intent ?? old.intent,
          base: draftBase(this.service.world, old.kind, payload, old.base),
        };
        const requirements = await this.draftRequirements(s, d);
        delete d.preparation;
        d.digest = fingerprint({ ...d, digest: '' });
        d.preparation = prepareAuthoring(
          this.service,
          this.service.world,
          d,
          s.authority,
          s.timeline,
          requirements,
        ).preparation;
        await this.records.put(s.id, 'revision', `${d.id}:${d.revision}`, d);
        await this.records.put(s.id, 'draft', d.id, d);
        s.selectedDraft = { id: d.id, revision: d.revision };
        await this.records.saveSession(s);
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
          validateAuthoring(
            this.service,
            await this.draft(s, a.draftId, a.revision, true),
            s.authority,
          ),
        );
      case 'ol_change_prepare': {
        if ((await this.records.count(s.id, 'plan')) >= 512)
          return result('capacity', 'This session reached its review-plan limit.');
        const d = await this.draft(s, a.draftId, a.revision, true);
        const requirements = await this.draftRequirements(s, d);
        const { validation, impact, preparation } = prepareAuthoring(
          this.service,
          this.service.world,
          d,
          s.authority,
          s.timeline,
          requirements,
        );
        if (!validation.ok) return result('blocked', validation.message, validation);
        if (preparation.next !== 'ready_for_review')
          return result(
            preparation.next,
            'Required preparation is incomplete; no review was created.',
            preparation,
          );
        const plan: ChangePlan = {
          id: randomUUID(),
          draftId: d.id,
          revision: d.revision,
          digest: fingerprint({
            draft: d.digest,
            evidence: preparation.evidence,
            impact,
            session: s.id,
            timeline: s.timeline,
          }),
          impact,
          validation,
          preparation,
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
          await this.review(s.id, a.planId, s.authority),
        );
      case 'ol_change_apply': {
        const { plan, draft } = await this.review(s.id, a.planId, s.authority);
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
          s.authority,
          async (world) => {
            const fresh = await this.requireSession(s.id, s.authority);
            const latest = await this.records.get<ChangePlan>(s.id, 'plan', plan.id);
            await this.draft(fresh, draft.id, draft.revision, true);
            if (
              fresh.contextHash !== s.contextHash ||
              latest?.status !== 'approved' ||
              authoringImpact(world, draft).token !== plan.impact.token ||
              (plan.preparation &&
                plan.preparation.evidence.dependencies !==
                  authoringEvidenceDependencies(world, draft, s.authority))
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
            return authoringTransition(this.service, world, draft, id, s.authority);
          },
          draft.kind === 'action',
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
