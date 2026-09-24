import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { DECLARATION_CONTRACT, HOST_IMPLEMENTATIONS, canonicalJson } from '@open-legend/domain';
import type { AuthoringKind, AuthoringSessionView, ApiResult } from '@open-legend/protocol';
import type { SqlDatabase } from './store.js';
import type { WorldService } from './world-service.js';
import {
  AuthoringRecords,
  type AuthoringSession,
  type AuthoringDraft,
  type AuthoringPlan,
} from './authoring-records.js';
import {
  applyAuthoring,
  authoringDependencies,
  previewAuthoring,
  parseAuthoringCandidate,
  authoringActionSchema,
} from './authoring-kinds.js';
import { declarationSchema } from './ai-schemas.js';
import { digest } from './content-digest.js';

const MAX_DRAFTS = 32,
  MAX_PLANS = 64,
  MAX_REVISIONS = 64;
export interface WorldAgentScope {
  sessionId: string;
  contextHandle: string;
  budget: { id: string; limitUsd: number };
  connectionId: string;
}

/** Application authoring, not an independent simulation or agent runtime.
 * All durable records use existing operational storage and all effects use native owners.
 * docs/world-agent-runtime.md#implemented-authoring-sessions
 */
export class WorldAuthoring {
  readonly records: AuthoringRecords;
  private tail: Promise<unknown> = Promise.resolve();
  constructor(
    readonly service: WorldService,
    db: SqlDatabase,
  ) {
    this.records = new AuthoringRecords(service.store, db);
  }
  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.tail.then(fn, fn);
    this.tail = result.catch(() => {});
    return result;
  }
  private sessionId(conversationId: string) {
    return digest({
      world: this.service.world.id,
      timeline: this.service.timelineId,
      account: this.service.profile.id,
      conversationId,
    });
  }
  private current(session: AuthoringSession) {
    if (
      session.closed ||
      session.worldId !== this.service.world.id ||
      session.timelineId !== this.service.timelineId ||
      session.accountId !== this.service.profile.id ||
      (session.mode === 'creator' &&
        (!this.service.config.godMode ||
          !this.service.world.authorship.creatorAccountIds.includes(session.accountId)))
    )
      throw new Error('Authoring session is closed, restored, or no longer authorized.');
  }
  async open(conversationId: string): Promise<AuthoringSession> {
    if (!/^[a-zA-Z0-9_.:-]{1,120}$/.test(conversationId))
      throw new Error('Invalid conversation ID.');
    await this.service.ready;
    const id = this.sessionId(conversationId);
    return this.records.db.transaction(async () => {
      const prior = await this.records.get<AuthoringSession>('session', id);
      if (prior) {
        this.current(prior);
        return prior;
      }
      const creator =
        this.service.config.godMode &&
        this.service.world.authorship.creatorAccountIds.includes(this.service.profile.id);
      const session: AuthoringSession = {
        id,
        conversationId,
        worldId: this.service.world.id,
        timelineId: this.service.timelineId,
        accountId: this.service.profile.id,
        ...(creator ? {} : { actorId: this.service.controlledEntityId }),
        mode: creator ? 'creator' : 'player',
        limitUsd: this.service.config.inventionWorkshopUsd,
        closed: false,
        draftIds: [],
        planIds: [],
      };
      await this.records.put('session', id, session);
      return session;
    });
  }
  async session(conversationId: string) {
    const session = await this.records.get<AuthoringSession>(
      'session',
      this.sessionId(conversationId),
    );
    if (!session) throw new Error('Start this authoring session before using its tools.');
    this.current(session);
    return session;
  }
  budget(session: AuthoringSession) {
    return {
      id: `world-authoring:${session.id}`,
      limitUsd: Math.min(session.limitUsd, this.service.config.inventionWorkshopUsd),
    };
  }
  async budgetView(session: AuthoringSession) {
    this.current(session);
    const read = this.service.store.budgetExposure;
    if (!read) throw new Error('Session accounting is unavailable.');
    const exposure = await read.call(this.service.store, this.budget(session).id);
    const limitUsd = this.budget(session).limitUsd;
    return {
      ...exposure,
      limitUsd,
      availableUsd: Math.max(
        0,
        limitUsd - exposure.spentUsd - exposure.reservedUsd - exposure.uncertainUsd,
      ),
    };
  }
  /** Selector is useful only with the independently authenticated connector credential.
   * The dedicated credential hash is purpose-separated as a signing key and is not public data.
   */
  contextHandle(session: AuthoringSession): string {
    this.current(session);
    const config = this.service.config.mcpRead;
    if (!config || config.worldId !== session.worldId || config.expiresAt <= Date.now())
      throw new Error('Configure a current world-bound MCP connection.');
    const signature = createHmac('sha256', Buffer.from(config.tokenSha256, 'hex'))
      .update(`world-authoring-context:v1:${session.id}:${session.timelineId}:${session.accountId}`)
      .digest('hex');
    return `${session.id}.${signature}`;
  }
  async resolveHandle(handle: string): Promise<AuthoringSession> {
    if (!/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(handle)) throw new Error('Invalid authoring context.');
    const session = await this.records.get<AuthoringSession>('session', handle.slice(0, 64));
    if (!session || !timingSafeEqual(Buffer.from(this.contextHandle(session)), Buffer.from(handle)))
      throw new Error('Invalid authoring context.');
    this.current(session);
    return session;
  }
  async runScope(conversationId: string): Promise<WorldAgentScope> {
    const session = await this.open(conversationId);
    if (!this.service.config.mcpWrites || !this.service.config.macrofoldWorldConnectionId)
      throw new Error('Configure the OpenLegend MCP connector and enable session-bound writes.');
    return {
      sessionId: session.id,
      contextHandle: this.contextHandle(session),
      budget: this.budget(session),
      connectionId: this.service.config.macrofoldWorldConnectionId,
    };
  }
  async view(session: AuthoringSession): Promise<AuthoringSessionView> {
    this.current(session);
    const drafts = await this.records.many<AuthoringDraft>('draft', session.draftIds);
    const plans = await this.records.many<AuthoringPlan>('plan', session.planIds);
    // Lists carry concise review data; complete payloads are reached by exact draft/plan reads.
    return {
      id: session.id,
      mode: session.mode,
      closed: session.closed,
      budget: await this.budgetView(session),
      drafts: drafts
        .filter((d): d is AuthoringDraft => !!d)
        .map(({ sessionId, candidate, ...d }) => ({ ...d, candidate: null })),
      plans: plans
        .filter((p): p is AuthoringPlan => !!p)
        .map((p) => ({
          id: p.id,
          draftId: p.draftId,
          draftRevision: p.draftRevision,
          digest: p.digest,
          kind: p.kind,
          intent: p.intent,
          candidate: null,
          status: p.status,
          preview: p.preview,
          ...(p.receipt ? { receipt: p.receipt } : {}),
        })),
    };
  }
  async draft(session: AuthoringSession, id: string, revision?: number): Promise<AuthoringDraft> {
    this.current(session);
    const draft = await this.records.get<AuthoringDraft>(
      revision ? 'draft-revision' : 'draft',
      revision ? `${id}:${revision}` : id,
    );
    if (!draft || draft.sessionId !== session.id)
      throw new Error('Draft unavailable in this session.');
    return draft;
  }
  async plan(session: AuthoringSession, id: string): Promise<AuthoringPlan> {
    this.current(session);
    const plan = await this.records.get<AuthoringPlan>('plan', id);
    if (!plan || plan.sessionId !== session.id)
      throw new Error('Change plan unavailable in this session.');
    return plan;
  }
  private async fresh(session: AuthoringSession) {
    const latest = await this.records.get<AuthoringSession>('session', session.id);
    if (!latest) throw new Error('Authoring session is unavailable.');
    this.current(latest);
    return latest;
  }
  async saveDraft(
    session: AuthoringSession,
    value: {
      operationId: string;
      kind?: AuthoringKind;
      intent: string;
      candidateJson: string;
      draftId?: string;
      expectedRevision?: number;
      base?: AuthoringDraft['base'];
    },
  ) {
    return this.serialize(() =>
      this.records.write(
        session.id,
        value.operationId,
        { operation: 'draft', ...value },
        async () => {
          session = await this.fresh(session);
          const previous = value.draftId ? await this.draft(session, value.draftId) : undefined;
          if (previous && previous.revision !== value.expectedRevision)
            throw new Error('Draft changed; read the latest revision.');
          if (!previous && session.draftIds.length >= MAX_DRAFTS)
            throw new Error(
              'Session draft limit reached; retain this project and use a new session deliberately.',
            );
          const kind = previous?.kind ?? value.kind;
          if (!kind) throw new Error('Choose an implemented definition kind.');
          if (kind === 'attribute' && session.mode !== 'creator')
            throw new Error('Attribute authoring requires creator authority.');
          const revision = (previous?.revision ?? 0) + 1;
          if (revision > MAX_REVISIONS) throw new Error('Draft revision limit reached.');
          const base = previous?.base ?? value.base;
          if (base && kind !== 'recipe') throw new Error('Only recipe derivation is implemented.');
          const id =
            previous?.id ??
            digest({ session: session.id, operation: value.operationId }).slice(0, 40);
          const draft: AuthoringDraft = {
            id,
            sessionId: session.id,
            revision,
            kind,
            intent: value.intent,
            candidate: parseAuthoringCandidate(kind, value.candidateJson),
            ...(base ? { base } : {}),
          };
          await this.records.put('draft-revision', `${id}:${revision}`, draft);
          await this.records.put('draft', id, draft);
          if (!previous) {
            session.draftIds.push(id);
            await this.records.put('session', session.id, session);
          }
          return draft;
        },
      ),
    );
  }
  async prepare(
    session: AuthoringSession,
    value: { operationId: string; draftId: string; expectedRevision: number },
  ) {
    return this.serialize(() =>
      this.records.write(
        session.id,
        value.operationId,
        { operation: 'prepare', ...value },
        async () => {
          session = await this.fresh(session);
          const draft = await this.draft(session, value.draftId);
          if (draft.revision !== value.expectedRevision)
            throw new Error('Draft changed; inspect before preparing.');
          if (session.planIds.length >= MAX_PLANS)
            throw new Error('Session change-plan limit reached.');
          const preview = previewAuthoring(this.service, session, draft);
          if (!preview.ok) return { status: 'blocked' as const, preview };
          const plan: AuthoringPlan = {
            id: digest({ session: session.id, operation: value.operationId }).slice(0, 40),
            sessionId: session.id,
            draftId: draft.id,
            draftRevision: draft.revision,
            kind: draft.kind,
            intent: draft.intent,
            candidate: draft.candidate,
            ...(draft.base ? { base: draft.base } : {}),
            digest: digest(draft),
            status: 'pending',
            preview,
            timelineId: session.timelineId,
            policyRevision: this.service.world.inventionPolicy.revision,
            manifestRevision: this.service.world.moduleManifest!.revision,
            commandEpoch: this.service.commandEpoch,
            actorId: session.actorId ?? this.service.controlledEntityId,
            dependencyDigest: authoringDependencies(this.service, draft),
          };
          await this.records.put('plan', plan.id, plan);
          session.planIds.push(plan.id);
          await this.records.put('session', session.id, session);
          return { status: 'needs_approval' as const, plan };
        },
      ),
    );
  }
  /** Human-only route. No MCP descriptor may invoke this method. */
  async approve(
    session: AuthoringSession,
    id: string,
    expectedDigest: string,
    decision: 'approve' | 'reject',
  ) {
    return this.serialize(() =>
      this.records.db.transaction(async () => {
        session = await this.fresh(session);
        const plan = await this.plan(session, id);
        if (plan.digest !== expectedDigest)
          throw new Error('Approval identifies a different candidate.');
        if (plan.status === 'applied') return plan;
        if (plan.status === 'applying') throw new Error('This change is already being applied.');
        if (decision === 'approve') await this.checkPlan(session, plan);
        plan.status = decision === 'approve' ? 'approved' : 'rejected';
        plan.approvedBy = session.accountId;
        await this.records.put('plan', id, plan);
        return plan;
      }),
    );
  }
  private async checkPlan(session: AuthoringSession, plan: AuthoringPlan) {
    this.current(session);
    const draft = await this.draft(session, plan.draftId);
    if (draft.revision !== plan.draftRevision || digest(draft) !== plan.digest)
      throw new Error('The draft changed after review. Prepare a fresh change plan.');
    if (authoringDependencies(this.service, draft) !== plan.dependencyDigest)
      throw new Error('The reviewed dependencies changed. Revalidate and prepare again.');
    this.checkBoundary(session, plan);
  }
  private checkBoundary(session: AuthoringSession, plan: AuthoringPlan) {
    this.current(session);
    if (
      plan.timelineId !== this.service.timelineId ||
      plan.manifestRevision !== this.service.world.moduleManifest?.revision ||
      (plan.kind !== 'action' &&
        plan.policyRevision !== this.service.world.inventionPolicy.revision) ||
      (plan.kind === 'action' && plan.actorId !== this.service.controlledEntityId)
    )
      throw new Error('The reviewed world binding changed. Prepare the change again.');
    const draft: AuthoringDraft = {
      id: plan.draftId,
      sessionId: session.id,
      revision: plan.draftRevision,
      kind: plan.kind,
      intent: plan.intent,
      candidate: plan.candidate,
      ...(plan.base ? { base: plan.base } : {}),
    };
    if (authoringDependencies(this.service, draft) !== plan.dependencyDigest)
      throw new Error('The reviewed source definitions changed.');
  }
  async apply(session: AuthoringSession, id: string, guard: () => void = () => {}) {
    return this.serialize(async () => {
      guard();
      session = await this.fresh(session);
      const plan = await this.plan(session, id);
      if (plan.status === 'applied') return plan.receipt!;
      if (!['approved', 'applying'].includes(plan.status) || plan.approvedBy !== session.accountId)
        throw new Error('This exact change needs approval in the OpenLegend interface.');
      const recovered =
        plan.status === 'applying' ? await this.committedReceipt(session, plan) : undefined;
      if (recovered) {
        plan.status = 'applied';
        plan.receipt = recovered;
        await this.records.put('plan', id, plan);
        return recovered;
      }
      await this.checkPlan(session, plan);
      plan.status = 'applying';
      await this.records.put('plan', id, plan);
      // Do not hold the SQL metadata transaction while the native writer commits. Native request
      // identity closes the crash window between its commit and our final receipt.
      // Exceptions deliberately leave the plan applying so recovery uses the same native identity.
      const receipt = await applyAuthoring(this.service, session, plan, () => {
        guard();
        this.checkBoundary(session, plan);
      });
      plan.status = receipt.ok ? 'applied' : 'approved';
      plan.receipt = receipt;
      await this.records.put('plan', id, plan);
      return receipt;
    });
  }
  private async committedReceipt(
    session: AuthoringSession,
    plan: AuthoringPlan,
  ): Promise<ApiResult | undefined> {
    const id = `authoring-${plan.id}`;
    if (plan.kind === 'recipe') {
      const receipt = this.service.world.declarationReceipts[id];
      if (!receipt) return;
      if (
        receipt.digest !== canonicalJson(plan.candidate) ||
        receipt.attribution.inventorAccountId !== session.accountId
      )
        throw new Error('Native declaration receipt conflicts with the retained plan.');
      return {
        ok: true,
        code: 'reused',
        message:
          'The exact creator/player recipe was already installed; its receipt was recovered.',
      };
    }
    if (plan.kind === 'attribute') {
      const receipt = this.service.world.commandReceipts[id];
      if (!receipt) return;
      const request = {
        ...(plan.candidate as object),
        id,
        expectedManifestRevision: plan.manifestRevision,
      };
      if (receipt.digest !== canonicalJson(request))
        throw new Error('Native attribute receipt conflicts with the retained plan.');
      return receipt.outcome.ok ? receipt.outcome : undefined;
    }
    const receipt = await this.service.store.commands?.get(
      session.worldId,
      `gameplay:${plan.commandEpoch}:${digest(id)}`,
    );
    if (receipt && receipt.fingerprint !== digest({ actor: plan.actorId, input: plan.candidate }))
      throw new Error('Native action receipt conflicts with the retained plan.');
    return receipt?.result.ok ? receipt.result : undefined;
  }
  async close(conversationId: string) {
    return this.serialize(() =>
      this.records.db.transaction(async () => {
        const session = await this.records.get<AuthoringSession>(
          'session',
          this.sessionId(conversationId),
        );
        if (session) {
          session.closed = true;
          await this.records.put('session', session.id, session);
        }
      }),
    );
  }
  catalogue() {
    return {
      kinds: ['recipe', 'attribute', 'action'],
      recipeSchema: declarationSchema,
      recipeContract: DECLARATION_CONTRACT,
      action: authoringActionSchema(),
      attributes: {
        implementations: HOST_IMPLEMENTATIONS,
        examples: this.service.world.moduleManifest?.definitions,
        description:
          'New category-v1 or reservoir-v1 definitions; revisions change presentation only. Use ol_validate for authoritative field/range findings. Creating a definition does not attach it to bodies.',
      },
      limitations: [
        'General processes, shared-law migration, generated art and joint activities are not implemented by these tools.',
        'All consequential applies require an exact human-approved plan. Native validation is not a proof of arbitrary intent or emergent interactions.',
      ],
    };
  }
}
