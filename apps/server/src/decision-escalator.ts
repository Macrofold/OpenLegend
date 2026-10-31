import { stageAllowance } from './cognition-stage-budget.js';
import { entityGet } from '@open-legend/domain';
import { undispatchedReceipt } from './decision-state.js';
import {
  createAiClient,
  normalizeReceiptCost,
  OpenAiRateGate,
  type AiClient,
  type AiReceipt,
  type GenerateRequest,
} from '@open-legend/ai';
import type { ApiResult } from '@open-legend/protocol';
import { DecisionLedger, interactiveAllowance } from './cognition-budget.js';
import { type CognitionExecution, type ExecutionLease } from './cognition-execution.js';
import type { IntelligenceLog } from './intelligence-log.js';
import type { WorldService } from './world-service.js';
import { digest, type JobRecord } from './store.js';
import {
  DECISION_LIMITS,
  DECISION_EFFORT,
  endDecision,
  shiftUndispatchedDecision,
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
  type DecisionTaskContext,
  type DecisionAnswer,
} from './decision-task.js';
import { recordDecisionTiming, type DecisionPublication } from './decision-publication.js';
import { nativeProtectionReason } from './native-protection.js';
import { applyGenerationInput, type PreparedCognitionStage } from './cognition-runtime-control.js';
import { decisionValidity } from './decision-validity.js';
import {
  assertHigherDecisionModelTransport,
  resolveHigherDecisionGenerationConfig,
} from './generation-config.js';
import { MacrofoldBackend } from './macrofold.js';

export interface PreparedReconsideration {
  tasks: Record<string, DecisionTask>;
  context: DecisionTaskContext;
  instructions?: string;
  bindingDigest: string;
  sourceTime: number;
  current(): Promise<boolean>;
  publish(answers: Record<string, DecisionAnswer>, claim: DecisionPublication): Promise<ApiResult>;
}
type Prepare = (job: JobRecord, signal: AbortSignal) => Promise<PreparedReconsideration>;
interface DecisionLifetime {
  signal?: AbortSignal;
  labEpoch?: number;
}

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
      operatorAuthored?: true;
      labEpoch?: number;
      signal?: AbortSignal;
      releaseCancellation?: () => void;
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
  private readonly rates = new Map<string, OpenAiRateGate>();
  private readonly unsubscribeSettlement: () => void;

  constructor(
    private readonly service: WorldService,
    private readonly execution: CognitionExecution,
    private readonly log: IntelligenceLog,
    private readonly prepare: Prepare,
    private readonly fixtureClient?: AiClient,
    private readonly now = Date.now,
    private readonly modelBackend?: MacrofoldBackend,
  ) {
    this.unsubscribeSettlement = service.store.onSettlement(() => {
      for (const id of this.awaiting.keys())
        void this.reconcilePrimary(id).catch(() => {
          service.storageError = 'A reconciled decision could not be saved.';
        });
    });
    this.unsubscribe = service.subscribe(() => {
      const policy = this.scopes.size ? decisionPolicyDigest(service.config) : undefined;
      for (const [id, scope] of this.scopes) {
        const actor = entityGet(service.world.entities, scope.state.actorId)?.actor;
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
          (scope.authority &&
            !service.currentScope(
              scope.authority,
              scope.operatorAuthored ? 'create' : 'play',
              !scope.operatorAuthored,
            )) ||
          (scope.labEpoch !== undefined && service.cognitionControl?.epoch !== scope.labEpoch)
        ) {
          this.active.get(id)?.abort();
          void this.end(id, service.paused ? 'paused' : 'stale').catch(() => {
            service.storageError = 'A cancelled decision could not be saved.';
          });
        }
      }
    });
  }
  private ratePool(model: string) {
    const key =
      'decision-resource:' + digest({ account: digest(this.service.config.llmKey), model });
    let gate = this.rates.get(key);
    if (!gate) this.rates.set(key, (gate = new OpenAiRateGate()));
    return { key, gate };
  }
  private lifetime(rootId: string, source?: DecisionLifetime): DecisionLifetime {
    const previous = this.scopes.get(rootId);
    return {
      signal: source?.signal ?? previous?.signal,
      labEpoch: source?.labEpoch ?? previous?.labEpoch ?? this.service.cognitionControl?.epoch,
    };
  }
  private lifetimeCurrent(lifetime?: DecisionLifetime): boolean {
    if (this.stopped || lifetime?.signal?.aborted) return false;
    try {
      this.service.cognitionControl?.assertCurrent(lifetime?.labEpoch);
      return true;
    } catch {
      return false;
    }
  }
  private controlCurrent(job: JobRecord): boolean {
    return this.lifetimeCurrent(this.scopes.get(job.id));
  }
  private releaseScope(rootId: string): void {
    this.scopes.get(rootId)?.releaseCancellation?.();
    this.scopes.delete(rootId);
  }
  private retainScope(job: JobRecord, lifetime: DecisionLifetime, validity?: string): void {
    this.releaseScope(job.id);
    const state = job.decision!,
      rootId = job.id;
    const cancel = () => {
      this.active.get(rootId)?.abort();
      void this.end(rootId, 'cancelled').catch(() => {
        this.service.storageError = 'A cancelled decision could not be saved.';
      });
    };
    lifetime.signal?.addEventListener('abort', cancel, { once: true });
    this.scopes.set(job.id, {
      state: {
        worldId: state.worldId,
        timelineId: state.timelineId,
        generation: state.generation,
        actorId: state.actorId,
        physicalLife: state.physicalLife,
        policyDigest: state.policyDigest,
        ...(state.usefulUntilSim === undefined ? {} : { usefulUntilSim: state.usefulUntilSim }),
      },
      authority: job.authority,
      ...(job.operatorAuthored ? { operatorAuthored: true } : {}),
      ...lifetime,
      releaseCancellation: () => lifetime.signal?.removeEventListener('abort', cancel),
      ...(validity ? { validity } : {}),
    });
  }
  private eligible(job: JobRecord, state: DecisionState): boolean {
    const actor = entityGet(this.service.world.entities, state.actorId)?.actor;
    return (
      !this.stopped &&
      this.controlCurrent(job) &&
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
      (!job.authority ||
        this.service.currentScope(
          job.authority,
          job.operatorAuthored ? 'create' : 'play',
          !job.operatorAuthored,
        )) &&
      state.policyDigest === decisionPolicyDigest(this.service.config)
    );
  }
  hasActor(actorId: string): boolean {
    return [...this.scopes.values()].some((scope) => scope.state.actorId === actorId);
  }
  /** Observe the original receipt only. There is no redispatch, paid poll or renewed deadline. */
  async awaitPrimary(
    rootId: string,
    attemptId: string,
    validity?: string,
    source?: DecisionLifetime,
  ): Promise<boolean> {
    const lifetime = this.lifetime(rootId, source);
    let immediateChanged = false;
    const written = await this.service.store.mutateDecision(rootId, async (job) => {
      const state = job.decision!;
      if (
        !this.lifetimeCurrent(lifetime) ||
        !this.eligible(job, state) ||
        state.higherEntitlement !== 'available'
      )
        return undefined;
      immediateChanged = state.immediate.kind === 'pending';
      if (state.cursor) await this.service.store.consumeDecisionCursor(state.cursor);
      if (!this.lifetimeCurrent(lifetime)) return undefined;
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
    if (!this.lifetimeCurrent(lifetime)) {
      await this.end(rootId, lifetime.signal?.aborted ? 'cancelled' : 'stale');
      return true;
    }
    this.retainScope(written, lifetime, validity);
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
  async enqueue(
    rootId: string,
    reason: DecisionReason,
    response = false,
    initialPreparation: Prepare = this.prepare,
    source?: DecisionLifetime,
  ): Promise<boolean> {
    const lifetime = this.lifetime(rootId, source);
    if (!this.lifetimeCurrent(lifetime) || !permitsEscalation(this.service.config, reason))
      return false;
    let queued: JobRecord | undefined;
    let immediateChanged = false;
    queued = await this.service.store.mutateDecision(rootId, async (job) => {
      const state = job.decision!;
      if (
        !this.lifetimeCurrent(lifetime) ||
        !this.eligible(job, state) ||
        state.higherEntitlement !== 'available' ||
        (await this.service.store.decisionAttempts(rootId)).some(
          (attempt) => !attempt.receipt || attempt.receipt.completionUncertain,
        ) ||
        !Object.values(state.groups).some((group) => group.state === 'open') ||
        (await this.service.store.activeDecision(
          state.worldId,
          state.timelineId,
          state.actorId,
          rootId,
        )) ||
        !this.lifetimeCurrent(lifetime)
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
      if (!this.lifetimeCurrent(lifetime)) return undefined;
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
    // A handoff keeps the primary's lifetime across every awaited write. Capturing
    // the current epoch here would turn a stopped experiment into fresh work.
    if (!this.lifetimeCurrent(lifetime)) {
      await this.end(rootId, lifetime.signal?.aborted ? 'cancelled' : 'stale');
      return true;
    }
    this.retainScope(queued, lifetime, decisionValidity(this.service.world, state.actorId));
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
      start: (lease) =>
        this.log.withTrigger(rootId, () => this.run(rootId, lease, initialPreparation)),
      declined: (reason) => this.end(rootId, reason),
      resumeTiming: async (wall, monotonic) => {
        await this.service.store.mutateDecision(rootId, async (current) =>
          current.decision?.higher?.state === 'queued'
            ? { ...current, decision: shiftUndispatchedDecision(current.decision, wall, monotonic) }
            : undefined,
        );
      },
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
      this.releaseScope(rootId);
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
        await this.record(written, { disposition: reason }, written.id);
      }
      this.service.notify();
    } finally {
      this.ending.delete(rootId);
    }
  }
  private async record(job: JobRecord, output: unknown, receiptId: string) {
    // Higher publication owns a child receipt; the root job remains the source.
    const publication = this.service.world.responseReceipts?.[receiptId];
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
    if (job.decision?.phase === 'closed')
      await this.service.cognitionControl?.emit({
        kind: 'job',
        jobId: job.id,
        actorId: job.decision.actorId,
        status: job.status,
        result: job.result,
        primaryStageId: job.decision.higher?.attemptId,
        publication,
      });
  }
  private async run(
    rootId: string,
    lease: ExecutionLease,
    initialPreparation: Prepare,
  ): Promise<void> {
    this.queued.delete(rootId);
    const releaseNative = this.service.cognitionControl?.registerNative(rootId);
    const controller = new AbortController();
    this.active.set(rootId, controller);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failure: DecisionEnd = 'preparation-failed';
    let reservedId: string | undefined,
      dispatchIntent = false,
      completed = false,
      providerStarted = false;
    let preparedStage: PreparedCognitionStage | undefined;
    let ratePool: ReturnType<DecisionEscalator['ratePool']> | undefined;
    try {
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
      const target = resolveHigherDecisionGenerationConfig(this.service.config, {
        maxOutputTokens: DECISION_LIMITS.outputTokens,
        reasoningEffort: DECISION_EFFORT,
      });
      if (
        !(await this.service.store.budgetAvailable(
          state.actorId,
          target.macrofoldDeployment
            ? 0
            : target.transport === 'macrofold'
              ? this.service.config.macrofoldRunUsd
              : Math.max(0.25, this.service.config.llmReserveUsd),
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
      let prepared = await initialPreparation(job, controller.signal);
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
      let generationRequest: Omit<GenerateRequest, 'requestId' | 'signal'> = {
        task: 'decision-escalation',
        instructions: request.instructions,
        context: request.context,
        schema: request.schema,
        schemaName: 'DecisionEscalation',
        maxOutputTokens: target.maxOutputTokens,
        ...(target.transport === 'macrofold' ? { execution: 'complex' as const } : {}),
        ...(target.macrofoldDeployment
          ? { macrofoldDeployment: target.macrofoldDeployment }
          : { model: target.model, reasoningEffort: target.reasoningEffort }),
      };
      const control = this.service.cognitionControl;
      if (control) lease.release();
      const gate = control
        ? await control.prepare(
            {
              id: child.id,
              rootId,
              actorId: state.actorId,
              purpose: 'decision-escalation',
              modelPurpose: 'higherDecision',
              generation: state.generation,
              responseBoundBytes: target.macrofoldDeployment ? 1_000_000 : 500_000,
              wireBoundBytes: 1_000_000,
              ...(target.macrofoldDeployment
                ? {
                    protectedModel: `deployment:${target.macrofoldDeployment.modelBinding.deployment_id}`,
                  }
                : {}),
              signal: controller.signal,
              current: async () => {
                controller.signal.throwIfAborted();
                if (!(await prepared.current()))
                  throw new Error('Decision source changed before dispatch.');
              },
              holdTiming: () => {
                const wall = this.now(),
                  monotonic = performance.now();
                if (timer) clearTimeout(timer);
                return async () => {
                  if (controller.signal.aborted || providerStarted) return;
                  const holdWall = this.now() - wall,
                    holdMonotonic = performance.now() - monotonic;
                  // Each unpaid hold shifts the native clocks once, including a
                  // later hold after funding but before actual provider entry.
                  const shifted = await this.service.store.mutateDecision(
                    rootId,
                    async (current) =>
                      !controller.signal.aborted &&
                      this.controlCurrent(current) &&
                      current.decision?.phase !== 'closed' &&
                      current.decision?.higher &&
                      ['preparing', 'reserved'].includes(current.decision.higher.state)
                        ? {
                            ...current,
                            decision: shiftUndispatchedDecision(
                              current.decision,
                              holdWall,
                              holdMonotonic,
                            ),
                          }
                        : undefined,
                  );
                  if (!shifted?.decision?.higher) throw new Error('The held decision changed.');
                  Object.assign(state, shifted.decision);
                  Object.assign(child, shifted.decision.higher);
                  timer = setTimeout(
                    () => controller.abort(),
                    Math.max(
                      1,
                      Math.min(
                        child.publishBy - this.now(),
                        child.publishByMonotonic - performance.now(),
                      ),
                    ),
                  );
                  timer.unref();
                };
              },
            },
            {
              kind: 'generate',
              request: generationRequest,
            },
          )
        : undefined;
      preparedStage = gate?.stage;
      if (control) {
        const resumedLease = await this.execution.acquirePrepared(gate!.stage, 'background');
        if (!resumedLease) throw new Error('Background execution capacity is occupied.');
        lease = resumedLease;
      }
      const selected = gate?.input.request;
      if (selected) {
        request.instructions = selected.instructions;
        request.context = selected.context as string;
        generationRequest = applyGenerationInput(generationRequest, selected);
        if (!target.macrofoldDeployment && generationRequest.model)
          assertHigherDecisionModelTransport(target.model, generationRequest.model);
      }
      const backend =
        target.transport === 'macrofold'
          ? (this.modelBackend ?? new MacrofoldBackend(this.service, this.log))
          : undefined;
      const validateSource = async () => {
        controller.signal.throwIfAborted();
        const sourceCurrent = await prepared.current();
        controller.signal.throwIfAborted();
        if (this.now() >= child.dispatchBy || performance.now() >= child.dispatchByMonotonic) {
          failure = 'expired';
          throw new Error('The original decision dispatch deadline passed.');
        }
        if (!this.eligible(job!, state) || !sourceCurrent) {
          failure = 'stale';
          throw new Error('The decision source changed before dispatch.');
        }
      };
      if (backend) {
        generationRequest = await backend.prepareDeploymentGeneration(
          {
            ...generationRequest,
            deadlineMs:
              Date.now() +
              Math.max(
                0,
                Math.min(
                  child.publishBy - this.now(),
                  child.publishByMonotonic - performance.now(),
                ),
              ),
          },
          target.structuredOutput,
          controller.signal,
          validateSource,
        );
        await validateSource();
      }
      // Prepared overrides share the actual account/model capacity pool. A previous
      // director may settle after replacement, so reload its durable observation
      // only after the final model is known and shared execution is acquired.
      if (!backend) {
        ratePool = this.ratePool(
          generationRequest.model ?? this.service.config.higherDecisionModel,
        );
        const observation = await this.service.store.getIntegration(ratePool.key);
        if (observation !== undefined) ratePool.gate.restore(observation);
        const resource = ratePool.gate.status(this.now());
        if (resource.blockedReason || resource.waitMs) {
          await this.end(rootId, 'resource-unavailable');
          return;
        }
      }
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
      const allowance =
        gate || generationRequest.macrofoldDeployment
          ? stageAllowance(
              this.service.config,
              { kind: 'generate', request: generationRequest },
              this.service.config.higherDecisionModel,
              target.transport,
            )
          : higherDecisionAllowance(this.service.config, request);
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
      const rateAdmission = ratePool?.gate.beforeNext(
        Buffer.byteLength(JSON.stringify(request)) + 4096 + DECISION_LIMITS.outputTokens,
        this.now(),
        child.id,
      );
      if (rateAdmission?.blockedReason || rateAdmission?.waitMs) {
        await this.end(rootId, 'resource-unavailable');
        return;
      }
      let dispatched: JobRecord | undefined;
      const c = this.service.config;
      const client =
        this.fixtureClient ??
        backend ??
        createAiClient({
          openai: {
            apiKey: c.llmKey,
            model: c.higherDecisionModel,
            modelPrices: c.llmModelPrices,
            reasoningEffort: DECISION_EFFORT,
          },
          network: this.log.network,
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
            requestedModel: generationRequest.macrofoldDeployment
              ? `deployment:${generationRequest.macrofoldDeployment.modelBinding.deployment_id}`
              : generationRequest.model,
            effort: generationRequest.reasoningEffort,
            instructions: generationRequest.instructions,
            context: generationRequest.context,
            schema: generationRequest.schema,
          },
          () => {
            const dispatch = async () => {
              await validateSource();
              // Funding may precede an operator hold. Claim dispatch only at the
              // shared provider-entry boundary, never while waiting to continue.
              dispatched = await this.service.store.mutateDecision(rootId, async (current) => {
                const live = current.decision!;
                if (
                  !this.eligible(current, live) ||
                  live.higher?.state !== 'reserved' ||
                  this.now() >= live.higher.dispatchBy ||
                  performance.now() >= live.higher.dispatchByMonotonic ||
                  controller.signal.aborted
                )
                  return undefined;
                // A lost acknowledgement still leaves a durable dispatch claim
                // for conservative recovery; this callback is never retried.
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
                failure = 'expired';
                throw new Error('The original decision dispatch deadline passed.');
              }
              await validateSource();
              failure = 'provider-failed';
              providerStarted = true;
              return client.generate<unknown>({
                ...generationRequest,
                deadlineMs:
                  Date.now() +
                  Math.max(
                    0,
                    Math.min(
                      child.publishBy - this.now(),
                      child.publishByMonotonic - performance.now(),
                    ),
                  ),
                requestId: child.id,
                signal: controller.signal,
                actorScope: state.actorId,
              });
            };
            const execute = () =>
              gate && control ? control.dispatch(gate.stage, dispatch, lease) : dispatch();
            return backend ? backend.withSourceValidation(validateSource, execute) : execute();
          },
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
        if (ratePool) {
          ratePool.gate.observe(receipt, this.now());
          await this.service.store.putIntegration(ratePool.key, ratePool.gate.snapshot());
        }
        if (receipt.completionUncertain) lease.uncertain(child.id);
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
          !dispatched?.decision ||
          !this.eligible(dispatched, dispatched.decision) ||
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
        if (published) await this.record(published, { answers, outcome, receipt }, claim.receiptId);
        if (published?.decision?.phase !== 'closed')
          await this.end(
            rootId,
            outcome.code === 'stale' || outcome.code === 'stale-publication'
              ? 'stale'
              : 'native-rejection',
          );
      } finally {
        if (!receipt && providerStarted) lease.uncertain(child.id);
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
      try {
        try {
          if (preparedStage && preparedStage.status !== 'consumed')
            await this.service.cognitionControl?.decline(
              preparedStage,
              'The native reconsideration ended before provider dispatch.',
            );
        } finally {
          // A declined gate proves no adapter entry, but that proof still needs a durable
          // settlement. Keep failed settlement occupied while releasing local bookkeeping.
          if (reservedId && (!dispatchIntent || !providerStarted)) {
            await this.service.store.settle(
              reservedId,
              undispatchedReceipt(reservedId, 'openai', this.now()),
            );
            completed = true;
          }
        }
      } finally {
        if (dispatchIntent && !completed && reservedId) lease.uncertain(reservedId);
        if (reservedId) ratePool?.gate.release(reservedId);
        if (timer) clearTimeout(timer);
        releaseNative?.();
        this.active.delete(rootId);
        this.releaseScope(rootId);
        lease.release();
        this.service.notify();
      }
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
