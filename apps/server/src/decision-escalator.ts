import { undispatchedReceipt } from './decision-state.js';
import {
  createAiClient,
  normalizeReceiptCost,
  OpenAiRateGate,
  type AiClient,
  type AiReceipt,
} from '@open-legend/ai';
import type { ApiResult } from '@open-legend/protocol';
import { DecisionLedger, interactiveAllowance } from './cognition-budget.js';
import { type CognitionExecution, type ExecutionLease } from './cognition-execution.js';
import type { IntelligenceLog } from './intelligence-log.js';
import type { WorldService } from './world-service.js';
import { digest, type JobRecord } from './store.js';
import {
  DECISION_LIMITS,
  DECISION_MODEL,
  DECISION_EFFORT,
  endDecision,
  decisionEndMessage,
  type DecisionReason,
  type DecisionEnd,
  type DecisionState,
} from './decision-state.js';
import {
  decisionPolicyDigest,
  permitsEscalation,
  prepareDecisionTask,
  higherDecisionAllowance,
  decisionFailureReason,
  type DecisionTask,
  type DecisionAnswer,
} from './decision-task.js';
import { recordDecisionTiming, type DecisionPublication } from './decision-publication.js';
import { nativeProtectionReason } from './native-protection.js';
import { decisionValidity } from './decision-validity.js';

export interface PreparedReconsideration {
  tasks: Record<string, DecisionTask>;
  context: string;
  instructions?: string;
  bindingDigest: string;
  sourceTime: number;
  current(): Promise<boolean>;
  publish(answers: Record<string, DecisionAnswer>, claim: DecisionPublication): Promise<ApiResult>;
}
type Prepare = (job: JobRecord, signal: AbortSignal) => Promise<PreparedReconsideration>;

/** One funded reconsideration at the existing server boundary; transports still submit once. */
export class DecisionEscalator {
  private active = new Map<string, AbortController>();
  private queued = new Set<string>();
  private readonly scopes = new Map<
    string,
    {
      state: Pick<
        DecisionState,
        | 'worldId'
        | 'timelineId'
        | 'generation'
        | 'actorId'
        | 'physicalLife'
        | 'usefulUntilSim'
        | 'policyDigest'
      >;
      authority: JobRecord['authority'];
      validity?: string;
    }
  >();
  private readonly ending = new Set<string>();
  private readonly awaiting = new Map<
    string,
    { attemptId: string; timer: ReturnType<typeof setTimeout> }
  >();
  private readonly reconciling = new Set<string>();
  private stopped = false;
  private unsubscribe: () => void;
  private readonly rate = new OpenAiRateGate();
  private readonly rateKey: string;
  private readonly unsubscribeSettlement: () => void;

  constructor(
    private readonly service: WorldService,
    private readonly execution: CognitionExecution,
    private readonly log: IntelligenceLog,
    private readonly prepare: Prepare,
    private readonly fixtureClient?: AiClient,
    private readonly now = Date.now,
  ) {
    this.rateKey =
      'decision-resource:' +
      digest({ account: digest(service.config.llmKey), model: DECISION_MODEL });
    this.unsubscribeSettlement = service.store.onSettlement(() => {
      for (const id of this.awaiting.keys())
        void this.reconcilePrimary(id).catch(() => {
          service.storageError = 'A reconciled decision could not be saved.';
        });
    });
    this.unsubscribe = service.subscribe(() => {
      const policy = this.scopes.size ? decisionPolicyDigest(service.config) : undefined;
      for (const [id, scope] of this.scopes) {
        const actor = service.world.entities[scope.state.actorId]?.actor;
        if (
          service.paused ||
          scope.state.policyDigest !== policy ||
          service.generation !== scope.state.generation ||
          service.timelineId !== scope.state.timelineId ||
          !actor?.alive ||
          actor.incapacitated ||
          actor.controller !== 'npc' ||
          (actor.physicalLife ?? 0) !== scope.state.physicalLife ||
          (scope.validity &&
            scope.validity !== decisionValidity(service.world, scope.state.actorId)) ||
          (scope.state.usefulUntilSim !== undefined &&
            service.world.simTime >= scope.state.usefulUntilSim) ||
          (scope.authority && !service.currentScope(scope.authority, 'play', true))
        ) {
          this.active.get(id)?.abort();
          void this.end(id, service.paused ? 'paused' : 'stale').catch(() => {
            service.storageError = 'A cancelled decision could not be saved.';
          });
        }
      }
    });
  }
  private eligible(job: JobRecord, state: DecisionState): boolean {
    const actor = this.service.world.entities[state.actorId]?.actor;
    return (
      !this.stopped &&
      !this.service.paused &&
      state.phase !== 'closed' &&
      state.worldId === this.service.world.id &&
      state.timelineId === this.service.timelineId &&
      state.generation === this.service.generation &&
      !!actor?.alive &&
      !actor.incapacitated &&
      actor.controller === 'npc' &&
      (actor.physicalLife ?? 0) === state.physicalLife &&
      actor.capabilities?.cognition !== false &&
      !nativeProtectionReason(this.service.world, state.actorId) &&
      this.now() < state.usefulUntilWall &&
      performance.now() < state.usefulUntilMonotonic &&
      (state.usefulUntilSim === undefined || this.service.world.simTime < state.usefulUntilSim) &&
      (!job.authority || this.service.currentScope(job.authority, 'play', true)) &&
      state.policyDigest === decisionPolicyDigest(this.service.config)
    );
  }
  hasActor(actorId: string): boolean {
    return [...this.scopes.values()].some((scope) => scope.state.actorId === actorId);
  }
  /** Observe the original receipt only. There is no redispatch, paid poll or renewed deadline. */
  async awaitPrimary(rootId: string, attemptId: string, validity?: string): Promise<boolean> {
    let immediateChanged = false;
    const written = await this.service.store.mutateDecision(rootId, async (job) => {
      const state = job.decision!;
      if (!this.eligible(job, state) || state.higherEntitlement !== 'available') return undefined;
      immediateChanged = state.immediate.kind === 'pending';
      if (state.cursor) await this.service.store.consumeDecisionCursor(state.cursor);
      return {
        ...job,
        decision: {
          ...state,
          phase: 'waiting-primary',
          primaryAwait: { attemptId },
          immediate:
            state.immediate.kind === 'pending'
              ? { kind: 'deferred', at: this.now() }
              : state.immediate,
        },
        result: { disposition: 'uncertain' },
        message: 'The original model may still be executing. No second request was submitted.',
      };
    });
    if (!written?.decision) return false;
    if (immediateChanged) await recordDecisionTiming(this.log, written, 'immediate', this.now());
    const state = written.decision;
    this.scopes.set(rootId, {
      state: {
        worldId: state.worldId,
        timelineId: state.timelineId,
        generation: state.generation,
        actorId: state.actorId,
        physicalLife: state.physicalLife,
        policyDigest: state.policyDigest,
        ...(state.usefulUntilSim === undefined ? {} : { usefulUntilSim: state.usefulUntilSim }),
      },
      authority: written.authority,
      ...(validity ? { validity } : {}),
    });
    const timer = setTimeout(
      () => {
        void this.end(rootId, 'expired').catch(() => {
          this.service.storageError = 'An expired uncertain decision could not be saved.';
        });
      },
      Math.max(
        1,
        Math.min(
          state.usefulUntilWall - this.now(),
          state.usefulUntilMonotonic - performance.now(),
        ),
      ),
    );
    timer.unref();
    this.awaiting.set(rootId, { attemptId, timer });
    await this.reconcilePrimary(rootId);
    this.service.notify();
    return true;
  }
  private async reconcilePrimary(rootId: string): Promise<void> {
    const waiting = this.awaiting.get(rootId);
    if (!waiting || this.reconciling.has(rootId)) return;
    this.reconciling.add(rootId);
    try {
      const receipt = await this.service.store.attemptReceipt(waiting.attemptId);
      if (!receipt || receipt.completionUncertain) return;
      clearTimeout(waiting.timer);
      this.awaiting.delete(rootId);
      const job = await this.service.store.getJob(rootId);
      if (!job?.decision || !this.eligible(job, job.decision)) {
        await this.end(rootId, 'stale');
        return;
      }
      const reason = decisionFailureReason('invalid', 'completed_without_usable_answer', receipt);
      if (!reason || !(await this.enqueue(rootId, reason, job.kind === 'chat')))
        await this.end(rootId, 'provider-failed');
    } finally {
      this.reconciling.delete(rootId);
    }
  }
  async enqueue(rootId: string, reason: DecisionReason, response = false): Promise<boolean> {
    if (!permitsEscalation(this.service.config, reason)) return false;
    let queued: JobRecord | undefined;
    let immediateChanged = false;
    queued = await this.service.store.mutateDecision(rootId, async (job) => {
      const state = job.decision!;
      if (
        !this.eligible(job, state) ||
        state.higherEntitlement !== 'available' ||
        (await this.service.store.decisionAttempts(rootId)).some(
          (attempt) =>
            attempt.executionClass === 'primary' &&
            (!attempt.receipt || attempt.receipt.completionUncertain),
        ) ||
        !Object.values(state.groups).some((group) => group.state === 'open') ||
        (await this.service.store.activeDecision(
          state.worldId,
          state.timelineId,
          state.actorId,
          rootId,
        ))
      )
        return undefined;
      immediateChanged = state.immediate.kind === 'pending';
      const at = this.now();
      const id = 'decision-higher-' + digest([state.worldId, state.timelineId, rootId, 'higher']);
      const next: DecisionState = {
        ...state,
        phase: 'higher',
        higherEntitlement: 'claimed-child',
        immediate: state.immediate.kind === 'pending' ? { kind: 'deferred', at } : state.immediate,
        groups: Object.fromEntries(
          Object.entries(state.groups).map(([key, group]) => [
            key,
            group.state === 'open'
              ? {
                  ...group,
                  attemptId: id,
                  ...(key === 'q0' && response ? { kind: 'response' as const } : {}),
                }
              : group,
          ]),
        ),
        higher: {
          id,
          reason,
          eligibleAt: at,
          dispatchBy: Math.min(at + DECISION_LIMITS.queueMs, state.usefulUntilWall),
          publishBy: Math.min(at + DECISION_LIMITS.lifetimeMs, state.usefulUntilWall),
          dispatchByMonotonic: Math.min(
            performance.now() + DECISION_LIMITS.queueMs,
            state.usefulUntilMonotonic,
          ),
          publishByMonotonic: Math.min(
            performance.now() + DECISION_LIMITS.lifetimeMs,
            state.usefulUntilMonotonic,
          ),
          policyDigest: state.policyDigest,
          state: 'queued',
        },
      };
      if (state.cursor && state.generation === this.service.generation)
        await this.service.store.consumeDecisionCursor(state.cursor);
      return {
        ...job,
        status: 'generating',
        decision: next,
        message: 'The character is reconsidering an unresolved decision.',
      };
    });
    if (!queued?.decision?.higher) return false;
    if (immediateChanged) await recordDecisionTiming(this.log, queued, 'immediate', this.now());
    const state = queued.decision,
      child = state.higher!;
    this.scopes.set(rootId, {
      state: {
        worldId: state.worldId,
        timelineId: state.timelineId,
        generation: state.generation,
        actorId: state.actorId,
        physicalLife: state.physicalLife,
        policyDigest: state.policyDigest,
        ...(state.usefulUntilSim === undefined ? {} : { usefulUntilSim: state.usefulUntilSim }),
      },
      authority: queued.authority,
      validity: decisionValidity(this.service.world, state.actorId),
    });
    this.queued.add(rootId);
    const descriptor = {
      id: rootId,
      actorId: state.actorId,
      eligibleAt: child.eligibleAt,
      dispatchBy: child.dispatchBy,
      dispatchByMonotonic: child.dispatchByMonotonic,
      reason,
    };
    const accepted = this.execution.enqueue({
      ...descriptor,
      kind: 'decision',
      urgency: state.urgency,
      metadataBytes: Buffer.byteLength(JSON.stringify(descriptor)),
      start: (lease) => this.log.withTrigger(rootId, () => this.run(rootId, lease)),
      declined: (reason) => this.end(rootId, reason),
    });
    if (!accepted) await this.end(rootId, 'capacity');
    this.service.notify();
    return true; // Ownership was handed off even when capacity ends it without a paid call.
  }
  async end(rootId: string, reason: DecisionEnd): Promise<void> {
    if (this.ending.has(rootId)) return;
    this.ending.add(rootId);
    try {
      this.queued.delete(rootId);
      const waiting = this.awaiting.get(rootId);
      if (waiting) clearTimeout(waiting.timer);
      this.awaiting.delete(rootId);
      this.scopes.delete(rootId);
      await this.execution.cancel(new Set([rootId]));
      this.active.get(rootId)?.abort();
      let immediateChanged = false;
      const written = await this.service.store.mutateDecision(rootId, async (job) => {
        const state = job.decision!;
        if (state.phase === 'closed') return undefined;
        immediateChanged = state.immediate.kind === 'pending';
        if (
          state.cursor &&
          state.generation === this.service.generation &&
          state.timelineId === this.service.timelineId
        )
          await this.service.store.consumeDecisionCursor(state.cursor);
        return {
          ...job,
          decision: endDecision(state, reason, this.now()),
          status:
            reason === 'stale' || reason === 'restart'
              ? 'stale'
              : reason === 'cancelled' || reason === 'paused'
                ? 'cancelled'
                : 'failed',
          message: decisionEndMessage(reason),
          completedAt: this.now(),
          totalLatencyMs: Math.max(0, this.now() - job.createdAt),
          result: {
            ...(job.result && typeof job.result === 'object' ? job.result : {}),
            disposition: reason,
          },
        };
      });
      if (written) {
        const at = this.now();
        if (immediateChanged) await recordDecisionTiming(this.log, written, 'immediate', at);
        await recordDecisionTiming(this.log, written, 'final', at);
        await this.record(written, { disposition: reason });
      }
      this.service.notify();
    } finally {
      this.ending.delete(rootId);
    }
  }
  private async record(job: JobRecord, output: unknown) {
    await this.log.record(
      job.id + ':higher-outcome',
      'Decision reconsideration',
      { higher: job.decision?.higher, immediate: job.decision?.immediate },
      output,
    );
    const trace = this.log.get(job.id);
    if (trace)
      await this.log.save({
        ...trace,
        status:
          job.decision?.phase === 'closed'
            ? job.status === 'completed'
              ? 'completed'
              : 'failed'
            : 'running',
        disposition: job.decision?.end ?? job.status,
        output,
        ...(job.completedAt ? { completedAt: new Date(job.completedAt).toISOString() } : {}),
      });
  }
  private async run(rootId: string, lease: ExecutionLease): Promise<void> {
    this.queued.delete(rootId);
    const controller = new AbortController();
    this.active.set(rootId, controller);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failure: DecisionEnd = 'preparation-failed';
    let reservedId: string | undefined,
      dispatchIntent = false,
      completed = false;
    try {
      // A previous director can settle its last request after replacement. Read
      // the persisted account/model observation after acquiring shared execution,
      // so a newer worker cannot miss that known funding or capacity stop.
      const observation = await this.service.store.getIntegration(this.rateKey);
      if (observation !== undefined) this.rate.restore(observation);
      const resource = this.rate.status(this.now());
      if (resource.blockedReason || resource.waitMs) {
        await this.end(rootId, 'resource-unavailable');
        return;
      }
      let job = await this.service.store.mutateDecision(rootId, async (current) => {
        const state = current.decision!;
        if (
          !this.eligible(current, state) ||
          state.higher?.state !== 'queued' ||
          this.now() >= state.higher.dispatchBy ||
          performance.now() >= state.higher.dispatchByMonotonic
        )
          return undefined;
        return {
          ...current,
          decision: {
            ...state,
            higher: { ...state.higher, state: 'preparing', startedAt: this.now() },
          },
        };
      });
      if (!job?.decision?.higher) {
        await this.end(rootId, 'expired');
        return;
      }
      const state = job.decision,
        child = state.higher!;
      if (
        !(await this.service.store.budgetAvailable(
          state.actorId,
          Math.max(0.25, this.service.config.llmReserveUsd),
          Math.max(0, this.service.config.budgetUsd - interactiveAllowance(this.service.config)),
        ))
      ) {
        await this.end(rootId, 'budget-exhausted');
        return;
      }
      timer = setTimeout(
        () => controller.abort(),
        Math.max(
          1,
          Math.min(child.publishBy - this.now(), child.publishByMonotonic - performance.now()),
        ),
      );
      timer.unref();
      let prepared = await this.prepare(job, controller.signal);
      if (!controller.signal.aborted && !(await prepared.current())) {
        const refreshed = await this.service.store.mutateDecision(rootId, async (current) => {
          const live = current.decision!;
          if (
            !this.eligible(current, live) ||
            live.refreshUsed ||
            live.higher?.state !== 'preparing' ||
            this.now() >= live.higher.dispatchBy ||
            performance.now() >= live.higher.dispatchByMonotonic
          )
            return undefined;
          return { ...current, decision: { ...live, refreshUsed: true } };
        });
        if (refreshed) prepared = await this.prepare(refreshed, controller.signal);
      }
      if (controller.signal.aborted || !(await prepared.current())) {
        await this.end(rootId, 'stale');
        return;
      }
      const request = prepareDecisionTask(prepared.tasks, prepared.context, prepared.instructions);
      const unresolved = Object.entries(state.groups)
        .filter(([, group]) => group.state === 'open')
        .map(([id]) => id)
        .sort();
      if (
        JSON.stringify(unresolved) !== JSON.stringify(Object.keys(prepared.tasks).sort()) ||
        unresolved.some((id) => prepared.tasks[id]?.kind !== state.groups[id]?.kind)
      ) {
        await this.end(rootId, 'unsupported');
        return;
      }
      failure = 'missing-pricing';
      const allowance = higherDecisionAllowance(this.service.config, request);
      failure = 'preparation-failed';
      const ledger = new DecisionLedger(state.limits);
      for (const entry of await this.service.store.decisionAttempts(rootId)) {
        ledger.record({
          requestId: entry.attemptId,
          stage: entry.stage,
          category: entry.category,
          ...(entry.level === undefined ? {} : { level: entry.level }),
          provider: entry.provider === 'jev' ? 'jev' : 'openai',
          size: { instructions: 0, context: 0, schema: 0 },
          reservedUsd: entry.reservedUsd,
        });
        if (entry.receipt) ledger.settle(entry.attemptId, entry.receipt);
      }
      if (!ledger.admit('level', 4, allowance).ok) {
        await this.end(rootId, 'budget-exhausted');
        return;
      }
      job = await this.service.store.mutateDecision(rootId, async (current) => {
        const live = current.decision!;
        if (
          !this.eligible(current, live) ||
          live.higher?.state !== 'preparing' ||
          this.now() >= live.higher.dispatchBy ||
          performance.now() >= live.higher.dispatchByMonotonic ||
          controller.signal.aborted
        )
          return undefined;
        if (
          !(await this.service.store.reserve(
            child.id,
            'openai',
            allowance,
            Math.max(0, this.service.config.budgetUsd - interactiveAllowance(this.service.config)),
            live.actorId,
            undefined,
            undefined,
            {
              rootJobId: rootId,
              category: 'level',
              level: 4,
              stage: 'decision-escalation',
              executionClass: 'background',
            },
          ))
        )
          return undefined;
        return {
          ...current,
          decision: {
            ...live,
            higher: {
              ...live.higher,
              state: 'reserved',
              attemptId: child.id,
              reservedAt: this.now(),
              prepared: {
                inputDigest: request.inputDigest,
                schemaDigest: request.schemaDigest,
                bindingDigest: prepared.bindingDigest,
                sourceTime: prepared.sourceTime,
              },
            },
          },
        };
      });
      if (!job?.decision?.higher) {
        await this.end(rootId, 'budget-exhausted');
        return;
      }
      reservedId = child.id;
      const rateAdmission = this.rate.beforeNext(
        Buffer.byteLength(JSON.stringify(request)) + 4096 + DECISION_LIMITS.outputTokens,
        this.now(),
        child.id,
      );
      if (rateAdmission.blockedReason || rateAdmission.waitMs) {
        await this.end(rootId, 'resource-unavailable');
        return;
      }
      const dispatched = await this.service.store.mutateDecision(rootId, async (current) => {
        const live = current.decision!;
        if (
          !this.eligible(current, live) ||
          live.higher?.state !== 'reserved' ||
          this.now() >= live.higher.dispatchBy ||
          performance.now() >= live.higher.dispatchByMonotonic ||
          controller.signal.aborted
        )
          return undefined;
        // An acknowledgement can be lost after the transaction committed. From this
        // boundary onward, missing evidence is never recorded as a free unsent call.
        dispatchIntent = true;
        if (!(await this.service.store.markDecisionDispatch(child.id))) return undefined;
        return {
          ...current,
          decision: {
            ...live,
            higher: { ...live.higher, state: 'dispatched', dispatchedAt: this.now() },
          },
        };
      });
      if (!dispatched) {
        await this.end(rootId, 'expired');
        return;
      }
      dispatchIntent = true;
      failure = 'provider-failed';
      const c = this.service.config;
      const client =
        this.fixtureClient ??
        createAiClient({
          openai: {
            apiKey: c.llmKey,
            model: DECISION_MODEL,
            modelPrices: c.llmModelPrices,
            reasoningEffort: DECISION_EFFORT,
          },
          fetch: this.log.fetch,
          timeoutMs: Math.max(1, child.publishBy - this.now()),
          maxRequestBytes: 500_000,
          maxResponseBytes: 500_000,
          maxOutputTokens: DECISION_LIMITS.outputTokens,
        });
      let receipt: AiReceipt | undefined;
      try {
        const result = await this.log.run(
          'Higher-model decision',
          {
            requestId: child.id,
            requestedModel: DECISION_MODEL,
            effort: DECISION_EFFORT,
            instructions: request.instructions,
            context: request.context,
            schema: request.schema,
          },
          () =>
            client.generate<unknown>({
              requestId: child.id,
              model: DECISION_MODEL,
              reasoningEffort: DECISION_EFFORT,
              task: 'decision-escalation',
              instructions: request.instructions,
              context: request.context,
              schema: request.schema,
              schemaName: 'DecisionEscalation',
              maxOutputTokens: DECISION_LIMITS.outputTokens,
              signal: controller.signal,
              actorScope: state.actorId,
            }),
        );
        receipt = normalizeReceiptCost(result.receipt);
        const returnedAt = this.now();
        await this.service.store.settle(child.id, receipt);
        completed = true;
        await this.service.store.mutateDecision(rootId, async (current) =>
          current.decision?.higher
            ? {
                ...current,
                decision: {
                  ...current.decision,
                  higher: { ...current.decision.higher, returnedAt, accountedAt: this.now() },
                },
              }
            : undefined,
        );
        this.rate.observe(receipt, this.now());
        await this.service.store.putIntegration(this.rateKey, this.rate.snapshot());
        if (receipt.completionUncertain) lease.uncertain();
        if (receipt.completionUncertain) {
          await this.end(rootId, 'uncertain');
          return;
        }
        if (result.outcome !== 'value') {
          await this.end(
            rootId,
            result.outcome === 'invalid' ? 'invalid-output' : 'provider-failed',
          );
          return;
        }
        failure = 'invalid-output';
        const answers = request.decode(result.value);
        if (
          controller.signal.aborted ||
          this.now() >= child.publishBy ||
          performance.now() >= child.publishByMonotonic ||
          !this.eligible(dispatched, dispatched.decision!) ||
          !(await prepared.current())
        ) {
          await this.end(rootId, 'stale');
          return;
        }
        if (c.decisionEscalation.mode === 'observe') {
          await this.service.store.mutateDecision(rootId, async (current) => ({
            ...current,
            result: { disposition: 'diagnostic-only', answers, receipt },
          }));
          await this.end(rootId, 'diagnostic-only');
          return;
        }
        if (!Object.values(answers).some((answer) => answer.status === 'answered')) {
          await this.end(rootId, 'abstained');
          return;
        }
        const current = await this.service.store.getJob(rootId);
        if (!current?.decision || !this.eligible(current, current.decision)) {
          await this.end(rootId, 'stale');
          return;
        }
        const ready = await this.service.store.mutateDecision(rootId, async (latest) =>
          latest.decision?.phase === 'higher' && latest.decision.higher
            ? {
                ...latest,
                decision: {
                  ...latest.decision,
                  higher: { ...latest.decision.higher, usableAt: this.now() },
                },
              }
            : undefined,
        );
        if (!ready?.decision) {
          await this.end(rootId, 'stale');
          return;
        }
        const claim: DecisionPublication = {
          rootJobId: rootId,
          attemptId: child.id,
          expectedRevision: ready.decision.revision,
          receiptId: child.id,
          groups: {},
          final: true,
          now: this.now,
        };
        const outcome = await prepared.publish(answers, claim);
        if (claim.deliveredAt !== undefined && claim.closed)
          await recordDecisionTiming(
            this.log,
            ready,
            'final',
            claim.deliveredAt,
            claim.deliveredElapsedMs,
          );
        const published = await this.service.store.getJob(rootId);
        if (published) await this.record(published, { answers, outcome, receipt });
        if (published?.decision?.phase !== 'closed')
          await this.end(
            rootId,
            outcome.code === 'stale' || outcome.code === 'stale-publication'
              ? 'stale'
              : 'native-rejection',
          );
      } finally {
        if (!receipt) lease.uncertain(); // Crossing durable dispatch intent makes missing completion uncertain.
      }
    } catch (error) {
      await this.end(
        rootId,
        controller.signal.aborted
          ? 'expired'
          : error instanceof Error && error.message.includes('byte allowance')
            ? 'context-exceeded'
            : error instanceof Error && error.message.includes('No meaningful offered choice')
              ? 'unsupported'
              : failure,
      );
    } finally {
      if (reservedId && !dispatchIntent)
        await this.service.store.settle(
          reservedId,
          undispatchedReceipt(reservedId, 'openai', this.now()),
        );
      if (dispatchIntent && !completed) lease.uncertain();
      if (reservedId) this.rate.release(reservedId);
      if (timer) clearTimeout(timer);
      this.active.delete(rootId);
      this.scopes.delete(rootId);
      lease.release();
      this.service.notify();
    }
  }
  async close(): Promise<void> {
    this.stopped = true;
    this.unsubscribe();
    this.unsubscribeSettlement();
    for (const controller of this.active.values()) controller.abort();
    for (const id of [...this.queued, ...this.active.keys(), ...this.awaiting.keys()])
      await this.end(id, 'cancelled');
    this.queued.clear();
  }
}
