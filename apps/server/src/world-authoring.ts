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
  WorldAgentQuestionStatus,
  WorldAgentQuestionAnswer,
  WorldAgentProgressSnapshot,
  WorldAgentWorkResult,
  WorldAgentDraftRevisionView,
  WorldAgentExactDraftView,
  WorldAgentDraftHistoryView,
  WorldAgentDraftComparisonView,
  WorldAgentDraftPreviewView,
  WorldAgentValidation,
  WorldAgentPlanView,
} from '@open-legend/protocol';
import {
  WorldAgentStore,
  publicProgress,
  type AgentSession,
  type AgentTurnRecord,
} from './world-agent-store.js';
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
import {
  normalizeQuestion,
  validateQuestionAnswer,
  questionAnswerSources,
  questionDigest,
  type NativeQuestionEvent,
} from './world-agent-questions.js';
import { readDefinition } from './world-graph.js';
import { normalizeInventionProposal } from './invention-service.js';
import { projectRecipeEditor } from './invention-tools.js';
import type { WorldToolService, WorldToolResult } from './world-tools.js';

export interface WorldAgentTurn {
  turnId: string;
  /** Application stage identity, separate from provider/accounting request keys. */
  applicationRequestId?: string;
  /** In-process cancellation only; never serialized into prompts or durable records. */
  signal?: AbortSignal;
  onQuestion?: (event: NativeQuestionEvent) => Promise<void>;
  beginRun?: (run: WorldAgentRunProgress) => Promise<void>;
  onProgress?: (progress: WorldAgentOutputProgress) => Promise<void>;
  streamStage?: 'investigating' | 'replying';
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
export interface WorldAgentRunProgress {
  runId: string;
  requestId: string;
  applicationRequestId?: string;
  stage: 'investigating' | 'replying';
}
export interface WorldAgentOutputProgress {
  runId: string;
  sequence: string;
  stage: 'investigating' | 'replying';
  text: string;
  incomplete: boolean;
  omittedBytes?: number;
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
const workResult = <T>(
  status: AuthoringResult['status'],
  message?: string,
  data?: T,
): WorldAgentWorkResult<T> => ({
  ok: ['ok', 'needs_approval', 'ready_for_review'].includes(status),
  status,
  cost: 'no-paid-work',
  ...(message ? { message } : {}),
  ...(data !== undefined ? { data } : {}),
});
const draftSummary = (d: AuthoringDraft): WorldAgentDraftRevisionView => {
  const payload = d.payload && typeof d.payload === 'object' ? d.payload : {};
  const name = 'name' in payload && typeof payload.name === 'string' ? payload.name : undefined;
  return {
    id: d.id,
    revision: d.revision,
    kind: d.kind,
    intent: d.intent,
    digest: d.digest,
    title: name ?? d.intent,
    summary: d.preparation?.presentation.description ?? 'Saved candidate; no live change implied.',
    ...(d.preparation ? { state: d.preparation.next } : {}),
  };
};

/** Coordinates operational drafts and approvals, never a second world writer or wallet.
 * Short per-session queues serialize edits/close/Apply; model work runs outside these queues.
 * docs/world-agent-runtime.md#durable-write-sessions
 */
export class WorldAuthoringService {
  private tails = new Map<string, Promise<unknown>>();
  private progressListeners = new Map<string, Set<() => void>>();
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
    return work
      .then((result) => {
        for (const notify of this.progressListeners.get(id) ?? []) notify();
        return result;
      })
      .finally(() => {
        this.queued--;
        if (this.tails.get(id) === work) this.tails.delete(id);
      });
  }
  /** Notifications contain no payload: subscribers must reauthorize the retained snapshot. */
  watchProgress(id: string, notify: () => void) {
    let listeners = this.progressListeners.get(id);
    if (!listeners) this.progressListeners.set(id, (listeners = new Set()));
    listeners.add(notify);
    return () => {
      listeners.delete(notify);
      if (!listeners.size) this.progressListeners.delete(id);
    };
  }
  async progressSnapshot(id: string, scope: RequestScope): Promise<WorldAgentProgressSnapshot> {
    // A tool can update its allowance before committing a draft. Read after the
    // current owner operation so a status refresh observes the saved work too.
    await this.tails.get(id)?.catch(() => {});
    const session = await this.ownedSession(id, scope);
    const [page, workRevision, exposure] = await Promise.all([
      this.records.turns(id, undefined, (q) => this.questionView(session, q), 1),
      this.records.workRevision(id),
      this.records.exposure(sessionBudgetId(session)),
    ]);
    // Authority can change while the database read is waiting. No delayed private payload
    // escapes merely because the subscription was authorized when it opened.
    await this.ownedSession(id, scope);
    return {
      sessionId: id,
      workRevision,
      statusRevision: fingerprint({
        activeTurn: session.activeTurn,
        questionTurn: session.questionTurn,
        recoveryTurn: session.recoveryTurn,
        toolCalls: session.toolCalls,
        profile: session.profile,
        selectedDraft: session.selectedDraft,
        pendingProfile: session.pendingProfile?.kind,
        workRevision,
        exposure,
      }),
      turn: page.turns[0] ?? null,
      activeTurn: session.activeTurn ?? null,
      questionTurn: session.questionTurn ?? null,
      recovering: !!session.recoveryTurn,
      available: this.permitted(session, scope),
    };
  }
  private progressCallbacks(id: string, turnId: string, handle: string, scope: RequestScope) {
    return {
      beginRun: (run: WorldAgentRunProgress) => this.beginProgress(id, turnId, handle, scope, run),
      onProgress: (progress: WorldAgentOutputProgress) =>
        this.retainProgress(id, turnId, scope, progress),
    };
  }
  private async beginProgress(
    id: string,
    turnId: string,
    handle: string,
    scope: RequestScope,
    run: WorldAgentRunProgress,
    recovering = false,
  ) {
    await this.serial(id, () =>
      this.records.db.transaction(async () => {
        const session = await this.requireSession(id, scope);
        const turn = await this.records.get<AgentTurnRecord>(id, 'turn', turnId);
        if (
          !turn ||
          (recovering
            ? session.recoveryTurn !== turnId
            : turn.response ||
              turn.cancelRequested ||
              session.activeTurn !== turnId ||
              session.contextHash !== contextHash(handle))
        )
          throw new AuthoringRequestError('Reply delivery belongs to an inactive turn.');
        await this.assertOperationalWritable(session);
        const admittedNext =
          turn.nextRunRequestId !== undefined && turn.nextRunRequestId === run.applicationRequestId;
        if (admittedNext) delete turn.nextRunRequestId;
        if (turn.progress?.runId === run.runId) {
          if (admittedNext) await this.records.put(id, 'turn', turnId, turn);
          return;
        }
        turn.progress = {
          ...run,
          sequence: '0',
          revision: (turn.progress?.revision ?? 0) + 1,
          text: turn.progress?.text ?? '',
          prefixLength: turn.progress?.text.length ?? 0,
          prefixOmittedBytes: turn.progress?.omittedBytes ?? 0,
          providerOmittedBytes: turn.progress?.omittedBytes ?? 0,
          projectionOmittedBytes: 0,
          omittedBytes: turn.progress?.omittedBytes ?? 0,
          completeness: turn.progress?.completeness === 'incomplete' ? 'incomplete' : 'live',
        };
        await this.records.put(id, 'turn', turnId, turn);
      }),
    );
  }
  private async retainProgress(
    id: string,
    turnId: string,
    scope: RequestScope,
    progress: WorldAgentOutputProgress,
  ) {
    if (
      !/^(0|[1-9][0-9]{0,19})$/.test(progress.sequence) ||
      Buffer.byteLength(progress.text) > 64 * 1024
    )
      throw new AuthoringRequestError('Reply delivery exceeds its supported envelope.');
    await this.serial(id, () =>
      this.records.db.transaction(async () => {
        const session = await this.ownedSession(id, scope);
        const turn = await this.records.get<AgentTurnRecord>(id, 'turn', turnId);
        const previous = turn?.progress;
        const recovering = session.recoveryTurn === turnId;
        if (
          !turn ||
          !previous ||
          previous.runId !== progress.runId ||
          previous.stage !== progress.stage ||
          (!recovering &&
            (session.activeTurn !== turnId || turn.response || turn.cancelRequested)) ||
          !this.permitted(session, scope)
        )
          throw new AuthoringRequestError('Reply delivery belongs to an obsolete run.');
        if (BigInt(progress.sequence) < BigInt(previous.sequence)) return;
        if (progress.sequence === previous.sequence) {
          // Terminal EOF may conservatively suppress a held protected prefix without
          // another provider event. It can mark delivery incomplete, never rewrite text.
          if (
            !progress.incomplete ||
            (previous.completeness === 'incomplete' &&
              (previous.prefixOmittedBytes ?? 0) + (progress.omittedBytes ?? 0) <=
                (previous.providerOmittedBytes ?? 0))
          )
            return;
          const providerOmittedBytes = Math.max(
            previous.providerOmittedBytes ?? 0,
            (previous.prefixOmittedBytes ?? 0) + (progress.omittedBytes ?? 0),
          );
          turn.progress = {
            ...previous,
            revision: previous.revision + 1,
            completeness: 'incomplete',
            providerOmittedBytes,
            omittedBytes: providerOmittedBytes + (previous.projectionOmittedBytes ?? 0),
          };
          await this.records.put(id, 'turn', turnId, turn);
          return;
        }
        turn.progress = {
          ...previous,
          sequence: progress.sequence,
          revision: previous.revision + 1,
          text:
            progress.stage === 'replying'
              ? previous.text.slice(0, previous.prefixLength ?? 0) + progress.text
              : previous.text,
          completeness:
            progress.incomplete || previous.completeness === 'incomplete'
              ? 'incomplete'
              : recovering
                ? 'partial'
                : 'live',
          // Each callback carries cumulative Run text. Recompute this Run's losses;
          // adding the previous projection loss again would inflate omission counts.
          providerOmittedBytes: (previous.prefixOmittedBytes ?? 0) + (progress.omittedBytes ?? 0),
          projectionOmittedBytes: 0,
          omittedBytes: (previous.prefixOmittedBytes ?? 0) + (progress.omittedBytes ?? 0),
        };
        await this.records.put(id, 'turn', turnId, turn);
      }),
    );
  }
  private credential() {
    return this.service.config.mcpRead?.tokenSha256 ?? 'local-owner';
  }
  private policy() {
    const c = this.service.config;
    return `owner-review-v2:${fingerprint([c.macrofoldUrl, c.macrofoldHarness, c.macrofoldModel, c.macrofoldWorldConnectionId, Object.keys(WORLD_AUTHORING_TOOLS), Object.keys(WORLD_READ_TOOLS)])}`;
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
    // Conversation titles remain private when authority changes during the storage read.
    this.service.assertScope(scope, 'create');
    this.service.assertScope(scope, 'inspect');
    if (!this.service.config.godMode)
      throw new AuthoringRequestError('World-owner authoring is unavailable.');
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
  async open(
    id: string,
    worldId: string,
    budgetUsd?: number,
    scope = this.service.localScope,
    purpose?: AgentSession['initialPurpose'],
  ) {
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
          if (purpose !== undefined && purpose !== s.initialPurpose)
            throw new AuthoringRequestError('Reopening does not change the original purpose.');
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
            initialPurpose: purpose ?? 'conversation',
            profile: purpose === 'invention' ? 'recipe' : 'discovery',
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
      throw new AuthoringRequestError('Session unavailable.', 'forbidden');
    return s;
  }
  async turns(id: string, before?: WorldAgentTurnCursor, scope = this.service.localScope) {
    const session = await this.ownedSession(id, scope);
    const page = await this.records.turns(id, before, (question) =>
      this.questionView(session, question),
    );
    await this.ownedSession(id, scope);
    return page;
  }
  async turn(id: string, requestId: string, scope = this.service.localScope) {
    const session = await this.ownedSession(id, scope);
    const turn = await this.records.get<AgentTurnRecord>(id, 'turn', requestId);
    await this.ownedSession(id, scope);
    return turn
      ? {
          id: requestId,
          revision: turn.revision ?? 0,
          sequence: turn.sequence ?? 0,
          text: turn.text ?? null,
          createdAt: turn.createdAt ?? null,
          cancelRequested: !!turn.cancelRequested,
          response: turn.response ?? null,
          ...(turn.progress ? { progress: publicProgress(turn.progress) } : {}),
          ...(turn.question ? { question: this.questionView(session, turn.question) } : {}),
        }
      : null;
  }
  async cancelTurn(id: string, requestId: string, scope = this.service.localScope) {
    return this.serial(id, () =>
      this.records.db.transaction(async () => {
        const s = await this.ownedSession(id, scope);
        const turn = await this.records.get<AgentTurnRecord>(id, 'turn', requestId);
        if (!turn) throw new AuthoringRequestError('Turn unavailable.');
        if (s.questionTurn === requestId && turn.question) {
          turn.question.view.state = 'abandoned';
          delete s.questionTurn;
          await this.records.put(id, 'turn', requestId, turn);
          await this.records.saveSession(s);
        }
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
    const [drafts, plans, exposure, workRevision] = await Promise.all([
      this.records.list<AuthoringDraft>(id, 'draft', afterDraft, 21),
      this.records.list<ChangePlan>(id, 'plan', afterPlan, 21),
      this.records.exposure(sessionBudgetId(s)),
      this.records.workRevision(id),
    ]);
    const shownPlans = plans.slice(0, 20);
    const planReferences = new Map(shownPlans.map((p) => [`${p.draftId}:${p.revision}`, p]));
    const planDrafts = await Promise.all(
      [...planReferences.values()].map((p) => this.draft(s, p.draftId, p.revision)),
    );
    const question = s.questionTurn ? await this.questionStatus(s, scope, exposure) : undefined;
    const current = await this.ownedSession(id, scope);
    // Collections contain private intent/findings too; no await may follow these target checks.
    for (const d of [...drafts, ...planDrafts]) this.assertDraftTarget(d.kind, d.payload, scope);
    return {
      sessionId: id,
      workRevision,
      available: this.permitted(current, scope),
      closed: current.closed,
      activeTurn: current.activeTurn ?? null,
      workspaceMutationReason: this.permitted(current, scope)
        ? this.humanMutationReason(current)
        : 'This session is closed, expired, or belongs to an earlier world or grant. Its history remains readable.',
      ...(question ? { question } : {}),
      budget: {
        limitUsd: this.budget(s).limitUsd,
        ...exposure,
        availableUsd: Math.max(
          0,
          this.budget(s).limitUsd - exposure.spentUsd - exposure.reservedUsd,
        ),
        note: 'Uncertain cost is included in spent, not an additional charge. Image generation is not implemented yet.',
      },
      drafts: drafts.slice(0, 20).map(draftSummary),
      plans: shownPlans.map(({ preparation: _preparation, ...plan }) => plan),
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
              ...(turn.progress
                ? {
                    progress: {
                      ...turn.progress,
                      revision: turn.progress.revision + 1,
                      completeness:
                        turn.progress.completeness === 'incomplete'
                          ? ('incomplete' as const)
                          : ('partial' as const),
                    },
                  }
                : {}),
              response: {
                ok: false,
                code: 'uncertain',
                jobId: s.activeTurn,
                message:
                  'Server restarted during this turn. Inspect saved drafts and the original remote run; it was not redispatched.',
              },
            });
          s.recoveryTurn = s.activeTurn;
          delete s.activeTurn;
          s.contextHash = contextHash(randomBytes(32).toString('hex'));
          await this.records.saveSession(s);
          // Retain the bounded last packet to bind an event recovered from this exact Run.
        });
    }
  }
  private async questionStatus(
    s: AgentSession,
    scope: RequestScope,
    exposure?: Awaited<ReturnType<WorldAgentStore['exposure']>>,
  ): Promise<WorldAgentQuestionStatus | undefined> {
    if (!s.questionTurn) return;
    const turn = await this.records.get<AgentTurnRecord>(s.id, 'turn', s.questionTurn);
    const question = turn?.question;
    if (!question) throw new Error('Missing retained question.');
    const fresh = this.questionCurrent(s, question);
    const allowed =
      this.permitted(s, scope) && fresh && ['open', 'answered'].includes(question.view.state);
    const usage = exposure ?? (await this.records.exposure(sessionBudgetId(s)));
    const stopped =
      !s.activeTurn && !s.recoveryTurn && turn.response?.code === 'waiting-for-answer';
    const funded = this.budget(s).limitUsd - usage.spentUsd - usage.reservedUsd >= 0.000001;
    const accounted = usage.uncertainUsd === 0 && usage.reservedUsd === 0;
    const controlling = this.service.currentScope(scope, 'play', true);
    return {
      question: { ...question.view, ...(!fresh ? { state: 'invalidated' as const } : {}) },
      canAnswer: allowed,
      canContinue:
        allowed &&
        !question.view.answer?.continuationId &&
        stopped &&
        accounted &&
        funded &&
        controlling,
      reason: !allowed
        ? 'This question is no longer current. Start a request with current world context.'
        : !controlling
          ? 'Your answer can be saved. Choose Control here before continuing.'
          : !stopped || !accounted
            ? `${question.view.answer ? 'Answer saved; f' : 'F'}inishing or checking previous work.`
            : !funded
              ? 'More usage is needed to continue.'
              : question.view.answer
                ? 'Your answer is saved. Continue when ready.'
                : 'Ready for your answer.',
    };
  }
  // Historical cards must reflect current dependency validity too. Keep the saved
  // answer immutable; only the public card becomes non-actionable.
  private questionView(s: AgentSession, question: NonNullable<AgentTurnRecord['question']>) {
    return this.questionCurrent(s, question)
      ? question.view
      : { ...question.view, state: 'invalidated' as const };
  }
  private questionCurrent(s: AgentSession, question: NonNullable<AgentTurnRecord['question']>) {
    const binding = question.binding;
    return (
      binding.generation === this.service.timelineId &&
      binding.membership === contextMembership(this.service.world) &&
      fingerprint(binding.selected ?? null) === fingerprint(s.selectedDraft ?? null) &&
      binding.pins.every(
        (pin) =>
          readDefinition(this.service.world, pin.kind, pin.id)?.node.ref.version === pin.version,
      )
    );
  }
  async captureQuestion(
    id: string,
    requestId: string,
    handle: string,
    scope: RequestScope,
    event: NativeQuestionEvent,
    recovering = false,
  ) {
    const questions = normalizeQuestion(event.questions);
    const digest = questionDigest(event.runId, event.requestId, questions);
    return this.serial(id, () =>
      this.records.db.transaction(async () => {
        const s = await this.requireSession(id, scope);
        const turn = await this.records.get<AgentTurnRecord>(id, 'turn', requestId);
        if (!turn) throw new AuthoringRequestError('Question has no admitted turn.');
        if (turn.question) {
          if (turn.question.view.digest !== digest)
            throw new AuthoringRequestError('Question identity conflicts with retained content.');
          return;
        }
        if (
          (recovering
            ? s.recoveryTurn !== requestId
            : s.activeTurn !== requestId || s.contextHash !== contextHash(handle)) ||
          turn.cancelRequested ||
          (!recovering && turn.response)
        )
          throw new AuthoringRequestError('The question belongs to an inactive turn.');
        const packet = s.packetRef
          ? await this.records.get<AuthoringPacket>(id, 'packet', s.packetRef)
          : undefined;
        if (!packet) throw new AuthoringRequestError('Question context is unavailable.');
        const text = JSON.stringify(questions);
        // Recovery retains only the hash. Overlapping windows catch a handle even
        // when model text joins it directly to another identifier.
        if (
          handle
            ? text.includes(handle)
            : [...text.matchAll(/(?=([a-zA-Z0-9_-]{43}))/g)].some(
                ([, token]) => contextHash(token!) === packet.contextHash,
              )
        )
          throw new AuthoringRequestError(
            'The agent included private execution context in its question.',
          );
        turn.question = {
          view: {
            id: `question-${requestId}`,
            turnId: requestId,
            digest,
            questions,
            state: 'open',
          },
          source: { runId: event.runId, requestId: event.requestId, sequence: event.sequence },
          binding: {
            generation: packet.generation,
            membership: packet.membership,
            pins: packet.pins,
            ...(s.selectedDraft ? { selected: s.selectedDraft } : {}),
          },
        };
        if (Buffer.byteLength(JSON.stringify(turn.question.view)) > 16 * 1024)
          throw new AuthoringRequestError('The question bundle exceeds the supported size.');
        s.questionTurn = requestId;
        // Persist the exact question and fence writes together, before remote cancellation.
        s.contextHash = contextHash(randomBytes(32).toString('hex'));
        delete s.pendingProfile;
        await this.records.put(id, 'turn', requestId, turn);
        await this.records.saveSession(s);
      }),
    );
  }
  async answerQuestion(
    id: string,
    questionTurnId: string,
    digest: string,
    answerId: string,
    answers: unknown,
    scope: RequestScope,
    supersedes?: string,
    continueIfReady = false,
  ): Promise<{ answer: WorldAgentQuestionAnswer; created: boolean; cancelTurnId?: string }> {
    return this.serial(id, () =>
      this.records.db.transaction(async () => {
        const s = await this.requireSession(id, scope);
        const source = await this.records.get<AgentTurnRecord>(id, 'turn', questionTurnId);
        const question = source?.question;
        if (!question || question.view.digest !== digest)
          throw new AuthoringRequestError('Question unavailable or changed.');
        const value: WorldAgentQuestionAnswer = {
          id: answerId,
          answers: validateQuestionAnswer(question.view, answers),
          ...(supersedes ? { supersedes } : {}),
        };
        if (Buffer.byteLength(JSON.stringify(value)) > 8 * 1024)
          throw new AuthoringRequestError('The complete answer exceeds the supported size.');
        const hash = fingerprint({ questionTurnId, digest, value, continueIfReady });
        const prior = await this.records.get<AgentTurnRecord>(id, 'turn', answerId);
        if (prior) {
          if (prior.fingerprint !== hash || !prior.answer)
            throw new AuthoringRequestError('Answer identity conflicts with retained content.');
          return { answer: prior.answer.value, created: false };
        }
        if (
          !this.questionCurrent(s, question) ||
          !['open', 'answered'].includes(question.view.state)
        )
          throw new AuthoringRequestError(
            'This question is no longer current. Start a request with current context.',
          );
        const previous = question.view.answer;
        if (previous && supersedes !== previous.id)
          throw new AuthoringRequestError(
            'This question already has an answer. Review it before making a correction.',
          );
        if (!previous && supersedes)
          throw new AuthoringRequestError('The answer to correct is unavailable.');
        if (s.questionTurn && s.questionTurn !== questionTurnId)
          throw new AuthoringRequestError(
            'Resolve the newer question before changing an earlier answer.',
          );
        if (
          s.activeTurn &&
          s.activeTurn !== questionTurnId &&
          s.activeTurn !== previous?.continuationId
        )
          throw new AuthoringRequestError(
            'A newer turn is running. Stop it before changing an earlier answer.',
          );
        if ((await this.records.count(id, 'turn')) >= 256)
          throw new AuthoringRequestError('Session retained-turn limit reached.');
        let cancelTurnId: string | undefined;
        if (s.activeTurn && s.activeTurn === previous?.continuationId) {
          const running = await this.records.get<AgentTurnRecord>(id, 'turn', s.activeTurn);
          if (!running) throw new Error('Missing admitted continuation.');
          running.cancelRequested = true;
          s.contextHash = contextHash(randomBytes(32).toString('hex'));
          await this.records.put(id, 'turn', s.activeTurn, running);
          cancelTurnId = s.activeTurn;
        }
        s.turnSequence = (s.turnSequence ?? 0) + 1;
        s.questionTurn = questionTurnId;
        question.view.answer = value;
        question.view.state = 'answered';
        const text = questionAnswerSources(question.view, value)
          .map((q) => q.text)
          .join('\n\n');
        await this.records.put(id, 'turn', answerId, {
          fingerprint: hash,
          text,
          sequence: s.turnSequence,
          createdAt: Date.now(),
          answer: { questionTurnId, digest, value, principal: scope.accountId },
          response: {
            ok: true,
            code: 'answer-saved',
            message: 'Your answer is saved. Continue when ready.',
          },
        } satisfies AgentTurnRecord);
        await this.records.put(id, 'turn', questionTurnId, source);
        await this.records.saveSession(s);
        return { answer: value, created: true, ...(cancelTurnId ? { cancelTurnId } : {}) };
      }),
    );
  }
  async beginTurn(
    sessionId: string,
    requestId: string,
    text: string,
    scope: RequestScope,
    continuation?: { questionTurnId: string; answerId: string },
  ) {
    return this.serial(
      sessionId,
      async (): Promise<{ turn?: WorldAgentTurn; response?: AgentReply }> => {
        const s = await this.requireSession(sessionId, scope),
          config = this.service.config;
        const hash = fingerprint({ text, sessionId, ...(continuation ? { continuation } : {}) });
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
        // Match provider admission before recording an accepted turn. Saving an
        // answer and reading history remain available in a non-controlling tab.
        if (!this.service.currentScope(scope, 'play', true))
          throw new AuthoringRequestError('Choose Control here before starting agent work.');
        if (s.activeTurn || s.recoveryTurn)
          throw new AuthoringRequestError(
            'This session has earlier work still running or awaiting confirmation.',
          );
        let answered: AgentTurnRecord['question'];
        if (continuation) {
          const source = await this.records.get<AgentTurnRecord>(
            s.id,
            'turn',
            continuation.questionTurnId,
          );
          answered = source?.question;
          const status = await this.questionStatus(s, scope);
          if (
            !answered ||
            s.questionTurn !== continuation.questionTurnId ||
            answered.view.answer?.id !== continuation.answerId ||
            !status?.canContinue
          )
            throw new AuthoringRequestError(status?.reason ?? 'This answer cannot continue.');
          if (
            answered.view.answer.continuationId &&
            answered.view.answer.continuationId !== requestId
          )
            throw new AuthoringRequestError('This answer already has a continuation.');
        } else if (s.questionTurn) {
          throw new AuthoringRequestError(
            'Answer or stop the pending question before sending another request.',
          );
        }
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
        if (answered?.view.answer) {
          const answer = answered.view.answer;
          s.requirements = (s.requirements ?? []).map((r) =>
            r.source.questionTurnId === continuation?.questionTurnId && r.source.answerId
              ? {
                  ...r,
                  status: 'superseded' as const,
                  supersededBy: `answer-${answer.id}-${r.source.questionId}`,
                }
              : r,
          );
          for (const source of questionAnswerSources(answered.view, answer))
            s.requirements.push({
              id: `answer-${answer.id}-${source.questionId}`,
              source: {
                turnId: requestId,
                answerId: answer.id,
                questionTurnId: continuation!.questionTurnId,
                ...source,
              },
              strength: 'request',
              status: 'human-review',
              finding:
                'Explicit human answer; native mechanics and exact approval remain separate.',
            });
        }
        const packet = buildAuthoringPacket(
          this.service.world,
          s,
          randomUUID(),
          text,
          profile,
          selected,
        );
        const prompt = renderAuthoringPacket(
          packet,
          contextHandle,
          this.service.config.macrofoldHarness === 'opencode',
        );
        s.packetRef = packet.id;
        s.requirements = packet.requirements;
        // Commit both identity and handle before any external dispatch.
        await this.records.db.transaction(async () => {
          await this.records.put(sessionId, 'turn', requestId, {
            fingerprint: hash,
            text,
            sequence: s.turnSequence,
            createdAt: Date.now(),
            ...(continuation ? { continuationOf: continuation } : {}),
          });
          if (answered?.view.answer && continuation) {
            const source = await this.records.get<AgentTurnRecord>(
              s.id,
              'turn',
              continuation.questionTurnId,
            );
            if (!source) throw new Error('Missing source question.');
            answered.view.answer.continuationId = requestId;
            await this.records.put(s.id, 'turn', continuation.questionTurnId, {
              ...source,
              question: answered,
            });
            delete s.questionTurn;
          }
          await this.records.saveSession(s);
          await this.records.clearPackets(s.id);
          await this.records.put(s.id, 'packet', packet.id, packet);
        });
        return {
          turn: {
            applicationRequestId: requestId,
            ...this.progressCallbacks(sessionId, requestId, contextHandle, scope),
            authority: scope,
            turnId: requestId,
            onQuestion:
              config.macrofoldHarness === 'opencode'
                ? (event) => this.captureQuestion(sessionId, requestId, contextHandle, scope, event)
                : undefined,
            sessionId,
            contextHandle,
            connectionId: config.macrofoldWorldConnectionId,
            toolNames: profileTools(profile),
            prompt,
            profile,
            // Discovery can answer an ordinary conversation directly. Its answer-only
            // deltas are readable prose; capability/tool data and reasoning stay private.
            // An explicit internal-only stage must instead declare investigating.
            streamStage: 'replying',
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
        await this.records.put(sessionId, 'turn', requestId, {
          ...record,
          response,
          ...(record.progress
            ? {
                progress: {
                  ...record.progress,
                  revision: record.progress.revision + 1,
                  ...(response.code === 'completed' ? { text: '' } : {}),
                  completeness:
                    response.code === 'completed'
                      ? 'complete'
                      : record.progress.completeness === 'incomplete'
                        ? 'incomplete'
                        : 'partial',
                },
              }
            : {}),
        });
        if (s.activeTurn === requestId) {
          delete s.activeTurn;
          if (
            response.code === 'uncertain' ||
            (record.question && response.code !== 'waiting-for-answer')
          )
            s.recoveryTurn = requestId;
          // Terminal or failed runs cannot keep writing through a copied handle.
          s.contextHash = contextHash(randomBytes(32).toString('hex'));
          await this.records.saveSession(s);
          if (!s.recoveryTurn) await this.records.clearPackets(s.id);
        }
      });
    });
  }
  async reconcileQuestion(
    id: string,
    scope: RequestScope,
    reconcile: (
      turnId: string,
      capture: NonNullable<WorldAgentTurn['onQuestion']>,
      progress: NonNullable<WorldAgentTurn['onProgress']>,
      beginRun: NonNullable<WorldAgentTurn['beginRun']>,
    ) => Promise<AgentReply | undefined>,
  ) {
    const session = await this.ownedSession(id, scope);
    const turnId = session.recoveryTurn;
    if (!turnId || session.activeTurn || !this.permitted(session, scope)) return;
    // Network work is outside the session transaction. The final write rechecks identity.
    const response = await reconcile(
      turnId,
      (event) => this.captureQuestion(id, turnId, '', scope, event, true),
      (progress) => this.retainProgress(id, turnId, scope, progress),
      (run) => this.beginProgress(id, turnId, '', scope, run, true),
    );
    if (!response) return;
    await this.serial(id, () =>
      this.records.db.transaction(async () => {
        const current = await this.ownedSession(id, scope);
        if (current.recoveryTurn !== turnId || current.activeTurn) return;
        const turn = await this.records.get<AgentTurnRecord>(id, 'turn', turnId);
        if (!turn) throw new Error('Missing interrupted turn.');
        const missingNextRun =
          turn.nextRunRequestId !== undefined ||
          (current.pendingProfile?.kind === 'recipe' && current.pendingProfile.turnId === turnId);
        const outcome =
          turn.cancelRequested || turn.question?.view.state === 'abandoned'
            ? {
                ok: false,
                code: 'cancelled',
                message:
                  'This request was stopped. Saved work and recorded usage remain available.',
              }
            : response.code === 'completed' && missingNextRun
              ? {
                  ok: false,
                  code: 'interrupted',
                  message:
                    'Investigation finished, but the planned recipe stage was interrupted before it could finish. Saved work remains available; continue explicitly.',
                }
              : response;
        if (outcome.code === 'failed' && turn.question) {
          turn.question.view.state = 'invalidated';
          if (current.questionTurn === turnId) delete current.questionTurn;
        }
        await this.records.put(id, 'turn', turnId, {
          ...turn,
          response: outcome,
          ...(turn.progress
            ? {
                progress: {
                  ...turn.progress,
                  revision: turn.progress.revision + 1,
                  ...(outcome.code === 'completed' ? { text: '' } : {}),
                  completeness:
                    outcome.code === 'completed'
                      ? 'complete'
                      : turn.progress.completeness === 'incomplete'
                        ? 'incomplete'
                        : 'partial',
                },
              }
            : {}),
        });
        delete current.recoveryTurn;
        await this.records.saveSession(current);
        await this.records.clearPackets(id);
      }),
    );
  }
  async nextRecipeStage(
    sessionId: string,
    requestId: string,
    handle: string,
    scope: RequestScope,
    nextRequestId: string,
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
      const prompt = renderAuthoringPacket(
        packet,
        contextHandle,
        this.service.config.macrofoldHarness === 'opencode',
      );
      s.packetRef = packet.id;
      await this.records.db.transaction(async () => {
        await this.records.put(s.id, 'turn', requestId, {
          ...turn,
          nextRunRequestId: nextRequestId,
        });
        await this.records.put(s.id, 'packet', packet.id, packet);
        await this.records.saveSession(s);
      });
      return {
        ...this.progressCallbacks(sessionId, requestId, contextHandle, scope),
        applicationRequestId: nextRequestId,
        authority: scope,
        turnId: requestId,
        onQuestion:
          this.service.config.macrofoldHarness === 'opencode'
            ? (event) => this.captureQuestion(sessionId, requestId, contextHandle, scope, event)
            : undefined,
        sessionId,
        contextHandle,
        connectionId: this.service.config.macrofoldWorldConnectionId,
        toolNames: profileTools('recipe'),
        profile: 'recipe',
        streamStage: 'replying',
        prompt,
        budget: this.budget(s),
        runUsd: Math.min(this.service.config.macrofoldWorldRunUsd, remaining),
        timeoutSeconds: this.service.config.macrofoldWorldTimeoutSeconds,
      };
    });
  }
  private humanMutationReason(s: AgentSession): string | null {
    if (s.activeTurn || s.recoveryTurn)
      return 'Wait for the agent request to finish or reconcile before changing saved work.';
    if (s.questionTurn) return 'Answer or stop the pending question before changing saved work.';
    return null;
  }
  private assertHumanWritable(s: AgentSession) {
    const reason = this.humanMutationReason(s);
    if (reason) throw new AuthoringRequestError(reason);
  }
  private async assertOperationalWritable(s: AgentSession, human = false) {
    const current = await this.requireSession(s.id, s.authority);
    if (current.contextHash !== s.contextHash)
      throw new AuthoringRequestError('Session context changed before the saved operation.');
    if (human) this.assertHumanWritable(current);
  }
  private async retainedOperation(s: AgentSession, name: string, args: unknown) {
    const operationId =
      args && typeof args === 'object' && 'operationId' in args ? args.operationId : undefined;
    if (typeof operationId !== 'string') return undefined;
    const prior = await this.records.get<{ fingerprint: string; response: AuthoringResult }>(
      s.id,
      'operation',
      operationId,
    );
    return prior
      ? prior.fingerprint === fingerprint({ name, args })
        ? prior.response
        : result('invalid', 'Operation ID already has different content.')
      : undefined;
  }
  private async operation(
    s: AgentSession,
    name: string,
    args: { operationId: string },
    execute: () => Promise<AuthoringResult>,
  ) {
    return this.records.db.transaction(async () => {
      const prior = await this.retainedOperation(s, name, args);
      if (prior) return prior;
      if ((await this.records.count(s.id, 'operation')) >= 2048)
        return result('capacity', 'This session reached its retained edit limit.');
      const response = await execute();
      await this.records.put(s.id, 'operation', args.operationId, {
        fingerprint: fingerprint({ name, args }),
        response,
      });
      return response;
    });
  }
  private async localWork<T>(
    id: string,
    scope: RequestScope,
    execute: (s: AgentSession) => Promise<WorldAgentWorkResult<T>>,
    finalizeDisclosure: (data: T | undefined) => T | void = () => {},
  ): Promise<WorldAgentWorkResult<T>> {
    try {
      const s = await this.ownedSession(id, scope);
      const response = await execute({ ...s, authority: scope });
      // History is readable after closure/expiry, but never after current access is revoked.
      await this.ownedSession(id, scope);
      const finalized = finalizeDisclosure(response.data);
      if (finalized !== undefined) response.data = finalized;
      this.assertWorkspaceDisclosure(response.data, scope);
      return response;
    } catch (error) {
      return workResult(
        error instanceof AuthoringRequestError ? error.code : 'unavailable',
        error instanceof AuthoringRequestError
          ? error.message
          : 'Saved work could not be confirmed. Retained receipts remain available.',
      );
    }
  }
  private assertWorkspaceDisclosure(data: unknown, scope: RequestScope) {
    if (!data || typeof data !== 'object') return;
    if (
      'kind' in data &&
      'payload' in data &&
      (data.kind === 'attribute-bindings' || data.kind === 'attribute-values')
    )
      this.assertDraftTarget(data.kind, data.payload, scope);
    if ('kind' in data && data.kind === 'recipe' && 'payload' in data) {
      // Choices are current inventor knowledge, not retained receipt authority. Project
      // after the last access wait, including when returning an older edit receipt.
      const editor = projectRecipeEditor(this.service, scope.actorId, data.payload);
      if (editor) Object.assign(data, { recipeEditor: editor });
      else if ('recipeEditor' in data) delete data.recipeEditor;
    }
    if ('before' in data) this.assertWorkspaceDisclosure(data.before, scope);
    if ('after' in data) this.assertWorkspaceDisclosure(data.after, scope);
  }
  private async exactDraft(
    s: AgentSession,
    id: string,
    revision: number,
    scope: RequestScope,
    afterPlan = '',
  ) {
    const d = await this.draft(s, id, revision);
    this.assertDraftTarget(d.kind, d.payload, scope);
    const [latest, plans] = await Promise.all([
      this.records.get<AuthoringDraft>(s.id, 'draft', id),
      this.records.plansForDraft<ChangePlan>(s.id, id, revision, afterPlan),
    ]);
    await this.ownedSession(s.id, scope);
    this.assertDraftTarget(d.kind, d.payload, scope);
    const view: WorldAgentExactDraftView = {
      ...draftSummary(d),
      payload: d.payload,
      latestRevision: latest?.revision ?? d.revision,
      validation: validateAuthoring(this.service, d, scope),
      ...(d.preparation ? { preparation: d.preparation } : {}),
      plans: plans.slice(0, 20),
      nextPlan: plans.length > 20 ? (plans[19]?.id ?? null) : null,
    };
    return view;
  }
  localDraftRead(
    sessionId: string,
    args: { draftId: string; revision: number; afterPlan?: string },
    scope = this.service.localScope,
  ) {
    return this.localWork(sessionId, scope, async (s) =>
      workResult(
        'ok',
        undefined,
        await this.exactDraft(s, args.draftId, args.revision, scope, args.afterPlan),
      ),
    );
  }
  localDraftHistory(
    sessionId: string,
    args: { draftId: string; before?: number },
    scope = this.service.localScope,
  ) {
    let targets: AuthoringDraft[] = [];
    return this.localWork<WorldAgentDraftHistoryView>(
      sessionId,
      scope,
      async (s) => {
        const latest = await this.records.get<AuthoringDraft>(s.id, 'draft', args.draftId);
        if (!latest) throw new AuthoringRequestError('Draft is unavailable.', 'unavailable');
        this.assertDraftTarget(latest.kind, latest.payload, scope);
        const rows = await this.records.revisions<AuthoringDraft>(s.id, args.draftId, args.before);
        targets = [latest, ...rows];
        await this.ownedSession(s.id, scope);
        for (const d of rows) this.assertDraftTarget(d.kind, d.payload, scope);
        const revisions = rows.slice(0, 20).map(draftSummary);
        return workResult('ok', undefined, {
          draftId: args.draftId,
          latestRevision: latest.revision,
          revisions,
          next: rows.length > 20 ? (revisions.at(-1)?.revision ?? null) : null,
        });
      },
      () => {
        for (const d of targets) this.assertDraftTarget(d.kind, d.payload, scope);
      },
    );
  }
  localDraftCompare(
    sessionId: string,
    args: { draftId: string; fromRevision: number; toRevision: number },
    scope = this.service.localScope,
  ) {
    return this.localWork<WorldAgentDraftComparisonView>(sessionId, scope, async (s) => {
      const [before, after] = await Promise.all([
        this.exactDraft(s, args.draftId, args.fromRevision, scope),
        this.exactDraft(s, args.draftId, args.toRevision, scope),
      ]);
      const object = (value: unknown): Record<string, unknown> =>
        value && typeof value === 'object' && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const a = object(before.payload),
        b = object(after.payload);
      const changed: WorldAgentDraftComparisonView['changed'] = [];
      const compare = (
        path: string[],
        left: unknown,
        right: unknown,
        leftPresent: boolean,
        rightPresent: boolean,
      ) => {
        if (leftPresent === rightPresent && fingerprint([left]) === fingerprint([right])) return;
        if (
          before.kind === 'recipe' &&
          leftPresent &&
          rightPresent &&
          left &&
          right &&
          typeof left === 'object' &&
          typeof right === 'object' &&
          Array.isArray(left) === Array.isArray(right)
        ) {
          const leftFields = left as Record<string, unknown>,
            rightFields = right as Record<string, unknown>;
          const keys = [...new Set([...Object.keys(leftFields), ...Object.keys(rightFields)])];
          if (keys.length) {
            for (const key of keys)
              compare(
                [...path, key],
                leftFields[key],
                rightFields[key],
                Object.hasOwn(leftFields, key),
                Object.hasOwn(rightFields, key),
              );
            return;
          }
        }
        changed.push({
          field: path.join('.'),
          path,
          beforePresent: leftPresent,
          afterPresent: rightPresent,
          ...(leftPresent ? { before: left } : {}),
          ...(rightPresent ? { after: right } : {}),
        });
      };
      for (const field of new Set([...Object.keys(a), ...Object.keys(b)]))
        compare([field], a[field], b[field], Object.hasOwn(a, field), Object.hasOwn(b, field));
      if (before.intent !== after.intent)
        changed.push({
          field: 'intent',
          beforePresent: true,
          afterPresent: true,
          before: before.intent,
          after: after.intent,
        });
      return workResult('ok', undefined, { before, after, changed, coverage: 'structural-only' });
    });
  }
  localDraftPreview(
    sessionId: string,
    args: { draftId: string; expectedRevision: number; candidate: unknown },
    scope = this.service.localScope,
  ) {
    let project: (() => WorldAgentDraftPreviewView) | undefined;
    return this.localWork<WorldAgentDraftPreviewView>(
      sessionId,
      scope,
      async (s) => {
        const old = await this.draft(s, args.draftId, args.expectedRevision, true);
        if (old.kind !== 'recipe')
          throw new AuthoringRequestError('Direct preview is available for recipes only.');
        const payload = decodeAuthoringPayload(old.kind, JSON.stringify(args.candidate));
        const candidate: AuthoringDraft = {
          ...old,
          payload,
          base: draftBase(this.service.world, old.kind, payload, old.base),
        };
        delete candidate.preparation;
        candidate.digest = fingerprint({ ...candidate, digest: '' });
        const requirements = await this.draftRequirements(s, old);
        // Native findings and family facts use one final synchronous world/scope read;
        // a database wait cannot leave stale material choices beside fresh findings.
        project = () => {
          const { validation, preparation } = prepareAuthoring(
            this.service,
            this.service.world,
            candidate,
            scope,
            s.timeline,
            requirements,
          );
          return {
            revision: old.revision,
            candidateDigest: fingerprint(payload),
            validation,
            preparation,
            facts: projectRecipeEditor(this.service, scope.actorId, payload)?.facts ?? [],
          };
        };
        return workResult('ok');
      },
      () => project?.(),
    );
  }
  localDraftSave(
    sessionId: string,
    args: {
      draftId: string;
      expectedRevision: number;
      operationId: string;
      candidate: unknown;
      intent?: string;
    },
    scope = this.service.localScope,
  ) {
    return this.localMutation<WorldAgentExactDraftView>(
      sessionId,
      'human-draft-save',
      args,
      scope,
      async (s) => {
        const old = await this.draft(s, args.draftId, args.expectedRevision, true);
        if (old.kind !== 'recipe')
          throw new AuthoringRequestError(
            'Direct editing is available for recipes only; revise other kinds in the conversation.',
          );
        const response = await this.dispatch(
          {
            name: 'ol_draft_update',
            arguments: {
              draftId: args.draftId,
              expectedRevision: args.expectedRevision,
              operationId: args.operationId,
              payloadJson: JSON.stringify(args.candidate),
              ...(args.intent !== undefined ? { intent: args.intent } : {}),
            },
          },
          s,
          true,
        );
        return response.status === 'ok'
          ? result(
              'ok',
              response.message,
              await this.exactDraft(s, args.draftId, args.expectedRevision + 1, scope),
            )
          : response;
      },
    );
  }
  localDraftCheck(
    sessionId: string,
    args: { draftId: string; revision: number },
    scope = this.service.localScope,
  ) {
    let target: AuthoringDraft | undefined;
    return this.localWork<WorldAgentValidation>(
      sessionId,
      scope,
      async (s) => {
        const d = await this.draft(s, args.draftId, args.revision);
        target = d;
        this.assertDraftTarget(d.kind, d.payload, scope);
        return workResult('ok');
      },
      () => {
        if (!target) return;
        this.assertDraftTarget(target.kind, target.payload, scope);
        // Check uses the same final synchronous world read as Preview. A storage
        // wait must not return passed findings for a value that changed meanwhile.
        return validateAuthoring(this.service, target, scope);
      },
    );
  }
  localDraftPrepare(
    sessionId: string,
    args: { draftId: string; revision: number; operationId: string },
    scope = this.service.localScope,
  ) {
    return this.localMutation<WorldAgentPlanView>(
      sessionId,
      'human-draft-prepare',
      args,
      scope,
      async (s) => this.dispatch({ name: 'ol_change_prepare', arguments: args }, s, true),
    );
  }
  private localMutation<T>(
    sessionId: string,
    name: string,
    args: { operationId: string },
    scope: RequestScope,
    execute: (s: AgentSession) => Promise<AuthoringResult>,
  ) {
    let target: AuthoringDraft | undefined;
    return this.localWork<T>(
      sessionId,
      scope,
      async (s) =>
        this.serial(sessionId, async () => {
          const prior = await this.retainedOperation(s, name, args);
          let response = prior;
          if (!response) {
            const current = await this.requireSession(sessionId, scope);
            this.assertHumanWritable(current);
            response = await this.operation(s, name, args, async () => {
              const fresh = await this.requireSession(sessionId, scope);
              this.assertHumanWritable(fresh);
              const result = await execute(fresh);
              // All new operational writes share this transaction. Expiry during a
              // later repository wait must roll back the edit, not leave a revision
              // or selected-draft change without an admitted operation receipt.
              await this.assertOperationalWritable(fresh, true);
              return result;
            });
          }
          const data = response.data;
          if (
            data &&
            typeof data === 'object' &&
            'draftId' in data &&
            'revision' in data &&
            typeof data.draftId === 'string' &&
            typeof data.revision === 'number'
          )
            target = await this.draft(s, data.draftId, data.revision);
          // Only application-owned handlers above construct this retained typed result.
          return workResult(
            response.status,
            response.message,
            ['ok', 'needs_approval'].includes(response.status)
              ? (response.data as T | undefined)
              : undefined,
          );
        }),
      () => {
        if (target) this.assertDraftTarget(target.kind, target.payload, scope);
      },
    );
  }
  async applyLocal(sessionId: string, planId: string, scope = this.service.localScope) {
    return this.serial(sessionId, async () => {
      // Closure/expiry deny new effects in the world writer's callback, but cannot
      // hide an already committed receipt from its currently authorized owner.
      const s = { ...(await this.ownedSession(sessionId, scope)), authority: scope };
      const response = await this.dispatch(
        { name: 'ol_change_apply', arguments: { planId } },
        s,
        true,
      );
      await this.review(sessionId, planId, scope);
      return response;
    });
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
    const d = await this.draft(s, p.draftId, p.revision);
    await this.ownedSession(sessionId, scope);
    this.assertDraftTarget(d.kind, d.payload, scope);
    return { plan: p, draft: d };
  }
  async decide(
    sessionId: string,
    planId: string,
    digest: string,
    decision: 'approve' | 'reject',
    scope = this.service.localScope,
  ) {
    return this.serial(sessionId, () =>
      this.records.db.transaction(async () => {
        const { plan, draft } = await this.review(sessionId, planId, scope);
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
        const current = await this.requireSession(sessionId, scope);
        this.assertHumanWritable(current);
        await this.draft(current, draft.id, draft.revision, true);
        await this.assertOperationalWritable(current, true);
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
        // Existing decisions above remain readable. A new decision must roll back if
        // expiry or authority changes while its repository write is waiting.
        await this.assertOperationalWritable(current, true);
        this.assertDraftTarget(draft.kind, draft.payload, scope);
        return plan;
      }),
    );
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
        const prior = await this.retainedOperation(current, name, args);
        if (prior) return prior;
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
        return this.operation(current, name, { ...args, operationId }, execute);
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
  private async dispatch(
    call: WorldAuthoringCall,
    s: AgentSession,
    human = false,
  ): Promise<AuthoringResult> {
    const { name, arguments: a } = call;
    switch (name) {
      case 'ol_authoring_guide':
        return result(
          'ok',
          undefined,
          authoringGuide(this.service.world, a.kind, false, a.familyId),
        );
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
            : 'This kind is selected for the next human turn. Stop all tool calls now. Explain its scope and ask the person to continue; no broader-scope run is automatically started.',
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
        await this.assertOperationalWritable(s, human);
        // Capture after repository waits. The synchronous native pass uses this exact snapshot.
        const snapshot = this.service.world;
        if (!packetCurrent(packet, snapshot, s))
          return result('stale', 'Context changed while preparing the submission.');
        const payload =
          name === 'ol_recipe_submit'
            ? normalizeInventionProposal(a.candidate)
            : typeof a.proposal.candidate === 'string'
              ? JSON.parse(a.proposal.candidate)
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
          // Repairs can repeat an unchanged finding. Keep its original identity;
          // changed meaning or a new human source remains a separate record.
          if (
            !requirement.supersedes &&
            requirements.some(
              (r) =>
                r.source.turnId === requirement.sourceTurnId &&
                r.source.text === requirement.quote &&
                r.strength === requirement.strength &&
                r.status === requirement.status &&
                r.finding === requirement.finding,
            )
          )
            continue;
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
            source: { ...source.source, text: requirement.quote },
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
          intent: [
            ...new Set(
              packet.requirements
                .filter((r) => r.status !== 'superseded')
                .map((r) => r.source.text),
            ),
          ].join('\n'),
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
        await this.assertOperationalWritable(s, human);
        this.assertDraftTarget(d.kind, d.payload, s.authority);
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
        await this.assertOperationalWritable(s, human);
        this.assertDraftTarget(d.kind, d.payload, s.authority);
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
        await this.assertOperationalWritable(s, human);
        this.assertDraftTarget(d.kind, d.payload, s.authority);
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
            // The world writer reconciles its permanent receipt before this new-effect gate.
            if (human) this.assertHumanWritable(fresh);
            const latest = await this.records.get<ChangePlan>(s.id, 'plan', plan.id);
            await this.draft(fresh, draft.id, draft.revision, true);
            await this.assertOperationalWritable(fresh, human);
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
