import { NpcReplyPreviews } from './npc-reply-preview.js';
import { nativeNpcReplyPreviewHost } from './native-npc-reply-preview.js';
import {
  attachNativeConsumer,
  borrowNativeProduct,
  createNativeConsumerScope,
  releaseNativeProduct,
  retainNativeProduct,
  retainNativeSources,
  withNativeConsumerScope,
} from './native-consumer.js';
import type { NativeWorldConsumer } from '@open-legend/native-simulation';
import {
  joinNativeDecisionText,
  nativeDecisionJsonSize,
  nativeDecisionJsonText,
} from './native-decision-prompt.js';
import {
  admitDecisionGraph,
  decisionArrayBytes,
  decisionObjectBytes,
  decisionJsonGraphBytes,
  decisionRecordEntries,
  decisionTextBytes,
} from './native-decision-allocation.js';
import {
  reconsiderationContextValue,
  reconsiderationResponseTask,
  RECONSIDERATION_RESPONSE_QUESTION,
} from './decision-preparation.js';
import { ContextBudgetError } from './context.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { dispatchEmbedding } from './embedding-dispatch.js';
import { nativeMemoryIndex } from './native-memory-index.js';
import type { MemoryIndex } from './memory-index.js';
import type { HttpPublication } from '@open-legend/network';
import { humanRequestId } from './human-request-id.js';
import type { RequestScope } from './authority.js';
import { randomUUID } from 'node:crypto';
import {
  activeGoalTexts,
  nativeText,
  type ActorResponse,
  type AppraisalScope,
  type SpeechVolume,
} from '@open-legend/domain';
import {
  createAiClient,
  createEmbeddingClient,
  InvalidData,
  validateJudgmentSize,
  type AiClient,
  type AiResult,
  type EmbeddingRequest,
  type GenerateRequest,
  type JudgeRequest,
  type JudgeValue,
  type JudgmentAnswer,
} from '@open-legend/ai';
import type { ApiResult } from '@open-legend/protocol';
import { ActorWork, INTAKE_LIMITS } from './actor-work.js';
import { actionResponse } from './action-response.js';
import { requestRoutes, chooseActivityRequest } from './activity-request-choice.js';
import { CognitionExecution } from './cognition-execution.js';
import {
  DecisionEscalator,
  type DecisionEscalationHost,
  type PreparedReconsideration,
} from './decision-escalator.js';
import { DecisionLedger, decisionAllowance, levelLimits } from './cognition-budget.js';
import {
  dispatchDecision,
  StopJob,
  type DecisionMeter,
  type DispatchRun,
} from './decision-dispatch.js';
import {
  decisionRoot,
  endDecision,
  DECISION_LIMITS,
  type ActorThoughtSchedule,
  type DecisionReason,
} from './decision-state.js';
import {
  decisionOrigin,
  decisionPolicyDigest,
  permitsEscalation,
  level1EscalationReason,
  decisionFailureReason,
  prepareDecisionTask,
  type DecisionTask,
} from './decision-task.js';
import { recordDecisionTiming, type DecisionPublication } from './decision-publication.js';
import { decisionQuestions, activityRouteCriterion } from './jev-questions.js';
import { decisionActionAttentionRequest } from './attention-request.js';
import {
  resolveLevel1,
  escalationLevel,
  level1Message,
  type Level1Outcome,
} from './level1-selection.js';
import { LEVEL_LIMITS } from './cognition-contracts.js';
import { resolveNpcGenerationConfig } from './generation-config.js';
import { cognitionOutputTokens } from './macrofold-model.js';
import { MacrofoldBackend } from './macrofold.js';
import { IntelligenceLog } from './intelligence-log.js';
import { digest, type JobRecord } from './store.js';
import { NativeNpcIntake, type NativeNpcInputFacts } from './native-npc-intake.js';
import { NativeNpcCapture } from './native-npc-capture.js';
import { nativeDecisionValidity } from './native-decision-validity.js';
import { nativeAppraisals } from './native-appraisal-context.js';
import {
  prepareNativeDecision,
  type NativeDecisionRouteInput,
  type NativeDecisionRouting,
} from './native-decision.js';
import type { NativeRecallRuntime } from './native-recall-service.js';
import type { NativeWorldService } from './native-world-service.js';
import type { NativePublication } from './native-operation.js';
import { nativePublicationActors } from './native-publication-actors.js';
import { isOverloadError } from './work-lane.js';
import {
  readSituationQueryResponse,
  SITUATION_QUERY_INSTRUCTIONS,
} from './decision-situation-query.js';

/** The real maintenance owner is required at composition. A decision cannot
 * quietly discard a positive reflection instruction or manufacture its success. */
export interface NativeNpcMaintenance {
  enqueue(actorId: string, origin: string, reason: string, generation: string): Promise<void>;
  tick(interactiveBusy: boolean): Promise<void>;
  cancel(): void;
  close(): Promise<void>;
}
export interface NativeNpcMaintenancePorts {
  readonly client: AiClient;
  readonly macrofold: MacrofoldBackend;
  readonly log: IntelligenceLog;
  readonly execution: CognitionExecution;
  readonly embeddings: ReturnType<typeof createEmbeddingClient>;
  readonly indexFailure: string | undefined;
  withActorName<T>(actorId: string, name: string, work: () => Promise<T>): Promise<T>;
}
type Preparation = Awaited<ReturnType<typeof prepareNativeDecision>>;
interface Run extends DispatchRun {
  actorId: string;
  generation: string;
  controller: AbortController;
  handedOff?: boolean;
  invalidated?: boolean;
  preparation?: Preparation;
  intake?: NativeNpcIntake;
  semanticCauseOrdinals: readonly number[];
  physicalLife: number;
  level1?: Level1Outcome;
  immediateTimer?: ReturnType<typeof setTimeout>;
  expiryTimer?: ReturnType<typeof setTimeout>;
  temporalSourcesCurrent?: () => boolean;
}
const bytes = (value: unknown) =>
  value === undefined
    ? 0
    : Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value));
const judgmentMeter = (request: Pick<JudgeRequest, 'state' | 'questions'>): DecisionMeter => ({
  category: 'level',
  level: 1,
  size: { instructions: 0, context: bytes(request.state), schema: bytes(request.questions) },
});

// Both complete authored rubrics cover the fixed factory's polarity branches.
// Policy-limited requests remove fields; optional activity criteria are sized
// separately from their actual installed labels and descriptions below.
const routeQuestionBytes =
  decisionJsonGraphBytes(decisionQuestions(true, 4, true, true)) +
  decisionJsonGraphBytes(decisionQuestions(false, 4, true, true));

/** Actual actor-owned NPC jobs over native reads. The shared queue, execution,
 * billing, escalation and SQL owners retain their ordinary Source semantics;
 * no TypeScript world or model-created binding map enters this composition. */
/** A fresh parsed response only stores canonical effects. Source removes
 * situation-query metadata and only writes an appraisal when one is proposed. */
function responseEffects(parsed: ActorResponse & { queries?: unknown }): ActorResponse {
  delete parsed.queries;
  for (const operation of parsed.operations)
    if (operation.appraise === null) delete operation.appraise;
  return parsed;
}

export class NativeNpcDirector {
  readonly replyPreviews: NpcReplyPreviews;
  readonly client: AiClient;
  readonly macrofold: MacrofoldBackend;
  private readonly log: IntelligenceLog;
  private readonly memoryIndex: MemoryIndex;
  private readonly execution: CognitionExecution;
  private readonly ownsExecution: boolean;
  private readonly escalator: DecisionEscalator;
  private readonly runs = new Map<string, Run>();
  private readonly pending = new Set<Promise<void>>();
  private readonly names = new Map<string, NativeNpcInputFacts>();
  private readonly dirty = new Set<string>();
  private readonly weighed = new Map<string, number>();
  private readonly discoveryRecovery = new Set<string>();
  private readonly work: ActorWork;
  private generation?: string;
  private stopped = false;
  private closing?: Promise<void>;
  private admissionTail: Promise<unknown> = Promise.resolve();
  private readonly unsubscribe: () => void;
  private readonly releaseAdmission: () => void;
  private readonly actorNameScope = new AsyncLocalStorage<{
    actorId: string;
    name: string;
    generation: string;
  }>();
  private readonly embeddings;
  private readonly maintenance: NativeNpcMaintenance;
  private readonly providerAllocation: NonNullable<GenerateRequest['allocation']>;

  constructor(
    readonly service: NativeWorldService,
    createMaintenance: (ports: NativeNpcMaintenancePorts) => NativeNpcMaintenance,
    client?: AiClient,
    private readonly now = Date.now,
    execution?: CognitionExecution,
  ) {
    const director = this,
      config = service.config;
    this.replyPreviews = new NpcReplyPreviews(nativeNpcReplyPreviewHost(service));
    const allocation: NonNullable<GenerateRequest['allocation']> = {
      reserveBytes: (bytes) => service.world.reserveConsumerBytes(bytes),
      borrow: borrowNativeProduct,
      retain: (value, reservation) => {
        attachNativeConsumer(value, reservation as NativeWorldConsumer);
        // Judgment answer maps and response/query arrays can outlive their
        // transport envelope while the real decision consumer is awaiting.
        for (const key in value) {
          const child = (value as Record<string, unknown>)[key];
          if (child !== null && typeof child === 'object') retainNativeSources(child, value);
        }
      },
    };
    this.providerAllocation = allocation;
    this.log = new IntelligenceLog(service.store);
    this.macrofold = new MacrofoldBackend(
      {
        get worldId() {
          return service.worldId;
        },
        get timelineId() {
          return service.timelineId;
        },
        config,
        store: service.store,
        actorName: (id) => {
          const active = director.actorNameScope.getStore(),
            retained = director.names.get(id);
          return active?.actorId === id && active.generation === service.generation
            ? active.name
            : retained?.worldId === service.worldId && retained.generation === service.generation
              ? retained.name
              : id;
        },
        assertScope: (scope, capability, controlling) =>
          service.assertScope(scope, capability, controlling),
        notify: () => service.notifyTelemetry(),
      },
      this.log,
      allocation,
    );
    const backend =
      client ??
      (config.macrofoldKey
        ? this.macrofold
        : createAiClient({
            jev: { apiKey: config.jevKey, model: config.jevModel, prices: config.jevPrices },
            openai: {
              apiKey: config.llmKey,
              model: config.llmModel,
              prices: config.llmPrices,
              modelPrices: config.llmModelPrices,
              reasoningEffort: 'low',
            },
            network: this.log.network,
            timeoutMs: config.aiTimeoutMs,
            maxRequestBytes: 500_000,
            maxResponseBytes: 500_000,
            maxOutputTokens: 8192,
          }));
    this.client = this.log.wrap({
      judge: (request) => backend.judge({ ...request, allocation }),
      generate: <T>(request: GenerateRequest) => backend.generate<T>({ ...request, allocation }),
    });
    const embeddings = createEmbeddingClient({
      apiKey: config.embeddingKey,
      model: config.embeddingModel,
      dimensions: config.embeddingDimensions,
      modelPrices: config.embeddingModelPrices,
      network: this.log.network,
      timeoutMs: config.aiTimeoutMs,
    });
    this.embeddings = {
      embed: (request: EmbeddingRequest) => embeddings.embed({ ...request, allocation }),
    };
    this.ownsExecution = !execution;
    this.execution = execution ?? new CognitionExecution(service.store, now);
    this.memoryIndex = nativeMemoryIndex(
      service,
      { embeddings: this.embeddings, log: this.log, execution: this.execution },
      now,
    );
    this.maintenance = createMaintenance({
      client: this.client,
      macrofold: this.macrofold,
      log: this.log,
      execution: this.execution,
      embeddings: this.embeddings,
      get indexFailure() {
        return director.memoryIndex.failure;
      },
      withActorName: (actorId, name, work) =>
        this.actorNameScope.run({ actorId, name, generation: service.generation }, work),
    });
    this.work = new ActorWork('thought', now, {
      capture: () => service.durabilityTicket(),
      current: (ticket) => service.isDurable(ticket),
    });
    const host: DecisionEscalationHost = {
      get worldId() {
        return service.worldId;
      },
      get timelineId() {
        return service.timelineId;
      },
      get generation() {
        return service.generation;
      },
      get config() {
        return service.config;
      },
      get store() {
        return service.store;
      },
      get paused() {
        return service.paused;
      },
      get simTime() {
        return service.simTime;
      },
      mutateDecision: (id, operation) =>
        service.publishRecall(() => service.store.mutateDecision(id, operation)),
      observe: (operation) => service.publishRecall(operation),
      // These checks return scalars; their complete inspection packets have
      // no later consumer and must not stay admitted until garbage collection.
      scopeCurrent: (state, authority, validity, eligibility) =>
        withNativeConsumerScope(async () => {
          const actor = service.npcActor(state.actorId);
          if (
            state.generation !== service.generation ||
            state.timelineId !== service.timelineId ||
            !actor?.alive ||
            !actor.memory ||
            actor.incapacitated ||
            actor.controller !== 'npc' ||
            actor.physicalLife !== state.physicalLife ||
            (state.usefulUntilSim !== undefined && service.simTime >= state.usefulUntilSim) ||
            (authority && !service.currentScope(authority, 'play', true))
          )
            return false;
          const read = await NativeNpcIntake.capture(service.world, state.actorId, 0);
          try {
            if (eligibility && (!read.facts.cognition || read.facts.actionsBlocked)) return false;
            if (validity) {
              const captured = await NativeNpcCapture.capture(service.world, state.actorId, []);
              try {
                if (nativeDecisionValidity(captured, service.definitions) !== validity)
                  return false;
              } finally {
                captured.release();
              }
            }
            return true;
          } finally {
            read.release();
          }
        }),
      validity: (actorId) =>
        service.publishRecall(() =>
          withNativeConsumerScope(async () => {
            const captured = await NativeNpcCapture.capture(service.world, actorId, []);
            try {
              return nativeDecisionValidity(captured, service.definitions);
            } finally {
              captured.release();
            }
          }),
        ),
      settleDiscovery: (actorId, id, generation) =>
        this.settleDiscovery(actorId, id, generation, true),
      subscribe: (listener) => service.subscribe(listener),
      notify: () => service.notifyTelemetry(),
      storageFailed: (message) => service.fail(new Error(message)),
    };
    this.escalator = new DecisionEscalator(
      host,
      this.execution,
      this.log,
      (job, signal) => this.prepareHigher(job, signal),
      client,
      now,
    );
    const releasePublication = service.onPublication((publication) => this.changed(publication));
    const releaseChange = service.subscribe(() => {
      this.replyPreviews.recheck();
      for (const run of this.runs.values()) {
        try {
          this.current(run);
        } catch {
          run.invalidated = !service.paused;
          run.controller.abort();
        }
      }
    });
    this.unsubscribe = () => {
      releasePublication();
      releaseChange();
    };
    this.releaseAdmission = service.setPlayerInteractionAdmission((id) => this.canAdmit(id));
  }

  /** A browser request names a perceived recipient; only the actual accepted
   * heard-addressed account starts its actor-owned model workflow. */
  submitInteractive(
    id: string,
    text: string,
    npcReference: string | undefined,
    scope: RequestScope,
    volume: SpeechVolume = 'normal',
  ): Promise<ApiResult> {
    return this.admission(async () => {
      this.service.assertScope(scope, 'play', true);
      const jobId = humanRequestId(scope, id),
        fingerprint = digest({
          kind: 'chat',
          volume,
          text,
          targetId: npcReference,
          worldId: this.service.worldId,
          actorId: scope.actorId,
          authority: scope,
          conversationId: undefined,
        });
      const previous = await this.service.store.getJob(jobId);
      this.service.assertScope(scope, 'play', true);
      if (previous)
        return previous.fingerprint === fingerprint
          ? {
              ok: !['failed', 'cancelled', 'stale'].includes(previous.status),
              code: previous.status,
              message: previous.message,
              jobId,
              jobStatus: previous.status,
            }
          : {
              ok: false,
              code: 'idempotency-conflict',
              message: 'That request ID was already used for different input.',
            };
      if (!npcReference)
        return {
          ok: false,
          code: 'resident-unavailable',
          message: 'Select a person for this conversation.',
        };
      if (!this.canAdmit())
        return {
          ok: false,
          code: 'busy',
          message: 'Another request is already in progress. You can keep gathering and surviving.',
        };
      this.maintenance.cancel();
      const spoken = await this.service.speakToNpc(jobId, text, npcReference, volume, scope);
      if (!spoken.ok) return spoken.outcome;
      try {
        const job: JobRecord = {
          authority: scope,
          id: jobId,
          kind: 'chat',
          fingerprint,
          status: spoken.heard ? 'queued' : 'completed',
          playerSpeechEventId: spoken.eventId,
          message: spoken.heard
            ? `${spoken.recipientName} is considering your words.`
            : 'Spoken. No conversational reply was requested.',
          request: { text, volume, npcId: spoken.actorId },
          createdAt: this.now(),
        };
        if (!spoken.heard) {
          await this.service.store.putJob(job);
          this.service.notifyTelemetry();
          return { ok: true, code: 'spoken', message: job.message, jobId };
        }
        const read = await this.service.captureNpcIntake(spoken.actorId, 0);
        let transferred = false;
        try {
          this.work.wake(spoken.actorId, { reason: 'directed-speech' });
          await this.begin(job, read);
          transferred = true;
        } finally {
          if (!transferred) read.release();
        }
        return { ok: true, code: 'queued', message: job.message, jobId };
      } finally {
        releaseNativeProduct(spoken);
      }
    });
  }
  /** A deliberate retry reuses authored speech and buys only a new reply. */
  retryInteractive(id: string, originalId: string, scope: RequestScope): Promise<ApiResult> {
    return this.admission(async () => {
      this.service.assertScope(scope, 'play', true);
      const original = await this.service.store.getJob(originalId);
      if (
        !original ||
        original.kind !== 'chat' ||
        !original.playerSpeechEventId ||
        !original.request.npcId
      )
        return {
          ok: false,
          code: 'retry-unavailable',
          message: 'The original conversation request is unavailable.',
        };
      const speech = await this.service.withActorMemoryRead(scope.actorId, () =>
        this.service.store.history.event(this.service.worldId, original.playerSpeechEventId!),
      );
      this.service.assertScope(scope, 'play', true);
      if (!speech || speech.actorId !== scope.actorId || speech.targetId !== original.request.npcId)
        return {
          ok: false,
          code: 'retry-unavailable',
          message: 'The original speech is not available to this player.',
        };
      const jobId = humanRequestId(scope, id),
        target = original.request.npcId,
        text = original.request.text,
        volume = original.request.volume ?? 'normal',
        fingerprint = digest({
          kind: 'chat',
          volume,
          text,
          targetId: target,
          worldId: this.service.worldId,
          actorId: scope.actorId,
          authority: scope,
          conversationId: undefined,
          retryOf: originalId,
        });
      const prior = await this.service.store.getJob(jobId);
      if (prior)
        return prior.fingerprint === fingerprint
          ? {
              ok: !['failed', 'cancelled', 'stale'].includes(prior.status),
              code: prior.status,
              message: prior.message,
              jobId,
              jobStatus: prior.status,
            }
          : {
              ok: false,
              code: 'idempotency-conflict',
              message: 'That request ID was already used for different input.',
            };
      if (!this.canAdmit(target))
        return {
          ok: false,
          code: 'busy',
          message: 'Another request is already in progress. You can keep gathering and surviving.',
        };
      const available = await this.service.retryNpcInteraction(target, scope);
      if (!available.ok) return available.outcome;
      this.maintenance.cancel();
      const job: JobRecord = {
        authority: scope,
        id: jobId,
        kind: 'chat',
        fingerprint,
        status: 'queued',
        playerSpeechEventId: original.playerSpeechEventId,
        retryOf: original.id,
        message: `${available.recipientName} is considering your words.`,
        request: { text, volume, npcId: target },
        createdAt: Math.max(this.now(), original.createdAt + 1),
      };
      const read = await this.service.captureNpcIntake(target, 0);
      let transferred = false;
      try {
        this.work.wake(target, { reason: 'directed-speech' });
        await this.begin(job, read);
        transferred = true;
      } finally {
        if (!transferred) read.release();
      }
      return { ok: true, code: 'queued', message: job.message, jobId };
    });
  }
  async cancel(jobId: string, scope: RequestScope): Promise<ApiResult> {
    this.service.assertScope(scope);
    const run = this.runs.get(jobId);
    if (!run || run.job.authority?.accountId !== scope.accountId)
      return { ok: false, code: 'not-running', message: 'That request is no longer running.' };
    if (!run.controller.signal.aborted) {
      run.cancelReason = 'Request cancelled.';
      this.replyPreviews.end(run.job.id);
      await this.update(run, run.job.status, 'Cancelling request…');
      run.controller.abort();
    }
    return { ok: true, code: 'cancelling', message: 'Cancellation requested.', jobId };
  }
  private admission<T>(operation: () => Promise<T>): Promise<T> {
    const work = this.admissionTail.then(operation);
    this.admissionTail = work.catch(() => undefined);
    return work;
  }
  private canAdmit(actorId?: string, urgent = false): boolean {
    return (
      !this.stopped &&
      this.runs.size < 2 &&
      (urgent || ![...this.runs.values()].some((run) => !run.urgent)) &&
      (!actorId ||
        (!this.escalator.hasActor(actorId) &&
          ![...this.runs.values()].some((run) => run.actorId === actorId)))
    );
  }
  private current(run: Run): string {
    if (run.generation !== this.service.generation)
      throw new StopJob('cancelled', 'This request was cancelled before completion.');
    if (
      this.stopped ||
      run.invalidated ||
      run.controller.signal.aborted ||
      (this.service.paused && (run.job.kind === 'thought' || !!run.job.decision))
    )
      throw new StopJob(
        run.invalidated ? 'stale' : 'cancelled',
        run.cancelReason ??
          (this.stopped
            ? 'This request was cancelled when the server closed.'
            : this.service.paused
              ? 'This request was cancelled when the game paused.'
              : 'This request was cancelled before completion.'),
      );
    const state = run.job.decision,
      actor = this.service.npcActor(run.actorId);
    if (run.temporalSourcesCurrent && !run.temporalSourcesCurrent())
      throw new StopJob('stale', 'The selected personal evidence changed or expired.');
    if (
      state &&
      (this.now() >= state.usefulUntilWall ||
        performance.now() >= state.usefulUntilMonotonic ||
        state.policyDigest !== decisionPolicyDigest(this.service.config) ||
        state.timelineId !== this.service.timelineId ||
        (state.usefulUntilSim !== undefined && this.service.simTime >= state.usefulUntilSim))
    )
      throw new StopJob(
        'stale',
        'This decision expired or its approved model settings changed.',
        'expired',
      );
    if (
      !actor?.alive ||
      actor.controller !== 'npc' ||
      actor.physicalLife !== run.physicalLife ||
      (run.job.authority && !this.service.currentScope(run.job.authority, 'play', true))
    )
      throw new StopJob('stale', 'The actor or world changed; the result was not applied.');
    if (run.job.kind === 'thought' && (actor.incapacitated || !actor.cognition))
      throw new StopJob('stale', 'Native urgent needs superseded semantic work.');
    return run.actorId;
  }
  private async awaitResume(run: Run, responseReady = false): Promise<void> {
    if (!this.service.paused || run.job.kind === 'thought') return;
    await this.update(
      run,
      run.job.status,
      responseReady
        ? 'Response ready. Resume the game to continue.'
        : 'Game paused. Resume to continue your request.',
    );
    await new Promise<void>((resolve, reject) => {
      let release = () => {};
      const cleanup = () => {
        release();
        run.controller.signal.removeEventListener('abort', cancel);
      };
      const cancel = () => {
        cleanup();
        reject(new StopJob('cancelled', 'This request was cancelled before completion.'));
      };
      const changed = () => {
        if (this.stopped || run.controller.signal.aborted) cancel();
        else if (!this.service.paused) {
          cleanup();
          resolve();
        }
      };
      release = this.service.subscribe(changed);
      run.controller.signal.addEventListener('abort', cancel, { once: true });
      changed();
    });
    this.current(run);
  }
  private call<T>(
    run: Run,
    provider: 'jev' | 'openai',
    suffix: string,
    dispatch: (id: string, publication: HttpPublication) => Promise<AiResult<T>>,
    meter?: DecisionMeter,
    publish?: HttpPublication,
  ): Promise<T> {
    const director = this,
      service = this.service;
    return dispatchDecision(
      {
        get worldId() {
          return service.worldId;
        },
        get config() {
          return service.config;
        },
        get store() {
          return service.store;
        },
        get paused() {
          return service.paused;
        },
        execution: this.execution,
        macrofold: this.macrofold,
        log: this.log,
        now: this.now,
        current: (active) => this.current(active),
        durabilityTicket: () => service.durabilityTicket(),
        whenDurable: (ticket) => service.whenDurable(ticket),
        privateReadFence: (actor, permitted) => service.privateReadFence(actor, permitted),
        awaitResume: (active, ready) => this.awaitResume(active, ready),
        update: (active, status, message) => this.update(active, status, message),
        attemptBudget: () => undefined,
        publication: (active, start) => {
          const publication = publish ?? active.preparation?.publish;
          if (!publication)
            throw new StopJob(
              'stale',
              'The model request has no retained source publication owner.',
            );
          return publication(() => {
            this.current(active);
            return start();
          });
        },
        settleDiscovery: (active, discovery) =>
          director.settleDiscovery(
            discovery.actorId,
            discovery.reservation,
            active.generation,
            true,
          ),
      },
      run,
      provider,
      suffix,
      dispatch,
      meter,
    );
  }
  private judge(
    run: Run,
    suffix: string,
    request: Omit<JudgeRequest, 'requestId' | 'signal'>,
    publish?: HttpPublication,
  ): Promise<JudgeValue> {
    return this.call(
      run,
      'jev',
      suffix,
      (id, publication) =>
        this.client.judge({
          ...request,
          publication,
          requestId: id,
          signal: run.controller.signal,
        }),
      judgmentMeter(request),
      publish ?? request.publication,
    );
  }
  private async generate(
    run: Run,
    request: Omit<GenerateRequest, 'requestId' | 'signal'>,
    suffix: string,
    level: 2 | 3 | 4 | 'preparation',
  ): Promise<unknown> {
    if (
      this.service.config.jevOnly ||
      !(this.service.config.macrofoldKey || this.service.config.llmKey)
    )
      throw new StopJob(
        'failed',
        'Generation is unavailable; Jev decisions and native actions remain available.',
        'unavailable',
      );
    return this.call(
      run,
      'openai',
      suffix,
      (id, publication) =>
        this.client.generate({
          ...request,
          publication,
          requestId: id,
          signal: run.controller.signal,
          maxOutputTokens:
            request.maxOutputTokens ??
            (this.service.config.macrofoldKey ? cognitionOutputTokens(request.execution) : 1800),
        }),
      {
        ...(level === 'preparation'
          ? { category: 'preparation' as const }
          : { category: 'level' as const, level }),
        model: request.macrofoldDeployment
          ? `deployment:${request.macrofoldDeployment.modelBinding.deployment_id}`
          : (request.model ?? this.service.config.llmModel),
        size: {
          instructions: bytes(request.instructions),
          context: bytes(request.context),
          schema: nativeDecisionJsonSize(this.service.world, request.schema),
        },
      },
      request.publication,
    );
  }
  private runtime(run: Run): NativeRecallRuntime {
    const index = this.memoryIndex;
    return {
      config: this.service.config,
      store: this.service.store,
      log: this.log,
      get indexFailure() {
        return index.failure;
      },
      publish: (operation) => this.service.publishRecall(operation),
      attemptLink: (stage) => ({
        rootJobId: run.job.id,
        category: 'preparation',
        stage,
        executionClass: 'primary',
      }),
      embed: async (request, current, publish) => {
        const lease = await this.execution.primary(run.urgent);
        if (!lease)
          return {
            outcome: 'cancelled',
            reason: 'Embedding execution capacity is occupied.',
            receipt: {
              requestId: request.requestId,
              provider: 'openai',
              requestedModel: this.service.config.embeddingModel,
              model: this.service.config.embeddingModel,
              modelVersionStatus: 'unavailable',
              contextDigest: digest(request.texts),
              startedAt: new Date(this.now()).toISOString(),
              completedAt: new Date(this.now()).toISOString(),
              latencyMs: 0,
              dispatched: false,
              completionUncertain: false,
            },
          };
        try {
          return await dispatchEmbedding({
            service: this.service,
            embeddings: this.embeddings,
            request,
            lease,
            current,
            assertCurrent: () => {
              this.current(run);
            },
            publication: publish,
            now: this.now,
          });
        } finally {
          lease.release();
        }
      },
    };
  }
  private consumer(run: Run): 'chat' | 'thought' {
    if (run.job.kind === 'chat' || run.job.kind === 'thought') return run.job.kind;
    throw new StopJob('failed', 'This NPC job kind is unavailable in this build.', 'unsupported');
  }
  private async prepare(
    run: Run,
    jobId: string,
    signal: AbortSignal,
    validity: 'decision' | 'prepared-response',
    nativeOnly: boolean,
    route = false,
  ): Promise<Preparation> {
    let attention = 0;
    const requiredAppraisals: readonly AppraisalScope[] = [];
    return prepareNativeDecision({
      service: this.service,
      runtime: this.runtime(run),
      actorId: run.actorId,
      consumer: this.consumer(run),
      jobId,
      stimulus: run.job.request.text,
      requiredIds: run.job.playerSpeechEventId
        ? [run.job.playerSpeechEventId]
        : (run.job.stimulusEvidenceIds ?? []),
      judge: (request, publishHistory) =>
        nativeOnly
          ? Promise.reject(
              new Error('Paid attention is forbidden during reconsideration preparation.'),
            )
          : this.judge(run, `attempt:0:attention:${attention++}`, request, publishHistory),
      compact: nativeOnly
        ? undefined
        : (request) => this.generate(run, request, `attempt:0:conversation`, 'preparation'),
      signal,
      budgetCeiling: this.service.config.budgetUsd,
      includeCurrentConversation: run.job.kind === 'chat',
      attempt: 0,
      triggerEvidenceId: run.job.triggerEvidenceId ?? run.job.playerSpeechEventId,
      mode: nativeOnly ? 'native-only' : 'ordinary',
      requiredAppraisals,
      semanticTrigger: run.intake?.trigger,
      semanticCauses: run.semanticCauseOrdinals,
      validity,
      routeActions: route ? (input) => this.routeDecision(run, input) : undefined,
      prepareAppraisals: (input) =>
        nativeAppraisals({
          purpose: 'decision',
          ...input,
          service: this.service,
          definitions: this.service.definitions,
          triggerEvidenceId: run.job.triggerEvidenceId ?? run.job.playerSpeechEventId,
          requiredFeelings: requiredAppraisals,
          currentTicket: input.currentTicket,
        }),
    });
  }

  private async routeDecision(
    run: Run,
    input: NativeDecisionRouteInput,
  ): Promise<NativeDecisionRouting> {
    // The route is already paid work while the rest of preparation is being
    // built. The existing bounded run subscription must see source withdrawal.
    run.temporalSourcesCurrent = input.sourcesCurrent;
    run.validateJudgmentSource = async () => {
      if (!input.sourcesCurrent())
        throw new StopJob('stale', 'The selected personal evidence changed before dispatch.');
    };
    const policy = this.service.definitions.facts.definitions.cognitionPolicy;
    const finish = (build: () => NativeDecisionRouting) =>
      admitDecisionGraph(this.service.world, decisionObjectBytes(5), build);
    const generationAvailable =
      !this.service.config.jevOnly &&
      !!(this.service.config.macrofoldKey || this.service.config.llmKey);
    let questionBytes = routeQuestionBytes;
    let fieldEntries = 0;
    for (const descriptor of input.activityRequests.requests) {
      fieldEntries += decisionRecordEntries(descriptor.fields);
      questionBytes +=
        decisionObjectBytes(1) +
        decisionTextBytes(256 + descriptor.label.length + descriptor.description.length);
    }
    const questions = admitDecisionGraph(this.service.world, questionBytes, () =>
      decisionQuestions(
        input.addressedSpeech,
        policy.maxImmediateLevel,
        input.speechTrigger,
        generationAvailable,
      ),
    );
    const routeQuestion = questions['route'];
    if (routeQuestion?.type !== 'choice') throw new Error('Missing route rubric.');
    const families = admitDecisionGraph(
      this.service.world,
      decisionObjectBytes(input.activityRequests.requests.length) +
        3 * decisionArrayBytes(fieldEntries) +
        fieldEntries * decisionArrayBytes(2) +
        input.activityRequests.choices.length * (decisionObjectBytes(2) + decisionArrayBytes(1)),
      () => requestRoutes(input.activityRequests.requests, input.activityRequests.choices),
    );
    for (const [key, descriptor] of families)
      routeQuestion.criteria[key] = activityRouteCriterion(descriptor);
    let judged: JudgeValue | undefined;
    let actionAnswers: Record<string, JudgmentAnswer> | undefined;
    if (!input.speechTrigger) {
      await input.refreshActions();
      const request = input.actionRequest('choose-action');
      const combined = admitDecisionGraph(
        this.service.world,
        decisionObjectBytes(
          decisionRecordEntries(request.questions) + decisionRecordEntries(questions),
        ),
        () => ({ ...request.questions, ...questions }),
      );
      let fits = true;
      try {
        validateJudgmentSize(request.state, combined);
      } catch (error) {
        if (!(error instanceof InvalidData)) throw error;
        fits = false;
      }
      if (fits && Object.keys(request.questions).length) {
        const all = await this.judge(
          run,
          'attempt:0:route',
          { state: request.state, questions: combined },
          input.publish,
        );
        const split = admitDecisionGraph(
          this.service.world,
          4 * decisionArrayBytes(decisionRecordEntries(all.answers)) +
            decisionRecordEntries(all.answers) *
              (2 * decisionArrayBytes(2) + decisionArrayBytes(1)) +
            2 * decisionObjectBytes(decisionRecordEntries(all.answers)) +
            2 * decisionObjectBytes(2),
          () => ({
            routing: Object.fromEntries(
              Object.keys(questions).flatMap((key) =>
                all.answers[key] ? [[key, all.answers[key]!]] : [],
              ),
            ),
            actions: Object.fromEntries(
              Object.entries(all.answers).filter(([key]) => !Object.hasOwn(questions, key)),
            ),
          }),
        );
        judged = { answers: split.routing };
        actionAnswers = split.actions;
      }
    }
    judged ??= await this.judge(
      run,
      'attempt:0:route',
      { state: input.prompt, questions },
      input.publish,
    );
    const routingJudgment = judged;
    const answer = judged.answers['route'];
    const probability = answer?.type === 'choice' ? (answer.probabilities[answer.choice] ?? 0) : 0;
    const selected = answer?.type === 'choice' && probability >= 0.5 ? answer.choice : null;
    const route =
      generationAvailable && input.addressedSpeech && selected === 'native'
        ? 'level2'
        : (selected ?? (generationAvailable && input.addressedSpeech ? 'level2' : null));
    const gate = judged.answers['possibleAction'];
    const actions =
      !input.speechTrigger ||
      !gate ||
      gate.type !== 'choice' ||
      gate.choice === 'yes' ||
      (gate.probabilities['no'] ?? 0) < 0.8;
    if (
      !route ||
      route === 'native' ||
      !Object.hasOwn(routeQuestion.criteria, route) ||
      families.has(route) ||
      !actions
    )
      return finish(() => ({ judged: routingJudgment, questions, families }));
    const actionPurpose = route === 'level1' ? 'choose-action' : 'actions';
    if (!actionAnswers) {
      await input.refreshActions();
      const request = input.actionRequest(actionPurpose);
      try {
        actionAnswers = Object.keys(request.questions).length
          ? (await this.judge(run, 'attempt:0:action-attention', request, input.publish)).answers
          : {};
      } catch (error) {
        if (route === 'level1' || run.controller.signal.aborted) throw error;
        this.current(run);
        await input.publish(() => undefined);
        return finish(() => ({
          judged: routingJudgment,
          questions,
          families,
          actionPurpose,
          actionFallback: true,
        }));
      }
    }
    return finish(() => ({
      judged: routingJudgment,
      questions,
      families,
      actionPurpose,
      actionAnswers,
    }));
  }

  private async decide(run: Run): Promise<void> {
    return withNativeConsumerScope(() => this.decideOwned(run));
  }

  private async decideOwned(run: Run): Promise<void> {
    this.current(run);
    if (!(await this.execution.primaryAvailable(run.urgent)))
      throw new StopJob(
        'failed',
        'The fast model is still executing an earlier request; this opportunity was deferred without preparing more model input.',
        'capacity',
      );
    if (
      !(await this.service.store.budgetAvailable(
        run.actorId,
        decisionAllowance(this.service.config, 'jev'),
        this.service.config.budgetUsd,
      ))
    )
      throw new StopJob(
        'failed',
        'Your usage allowance is used up. Existing actions and learned recipes still work.',
        'budget-exhausted',
      );
    const prepared = (run.preparation = await this.prepare(
      run,
      run.job.id,
      run.controller.signal,
      'decision',
      !!run.job.decision,
      true,
    ));
    if (prepared.routingFailure) {
      const { error } = prepared.routingFailure;
      prepared.retireRouting();
      throw error;
    }
    run.validateJudgmentSource = async () => {
      if (!(await prepared.current()))
        throw new StopJob('stale', 'The selected personal evidence changed before dispatch.');
    };
    run.temporalSourcesCurrent = prepared.sourcesCurrent;
    const policy = this.service.definitions.facts.definitions.cognitionPolicy,
      generationAvailable =
        !this.service.config.jevOnly &&
        !!(this.service.config.macrofoldKey || this.service.config.llmKey);
    let questions: NativeDecisionRouting['questions'] | undefined =
      prepared.routing?.questions ??
      decisionQuestions(
        prepared.addressedSpeech,
        policy.maxImmediateLevel,
        prepared.speechTrigger,
        generationAvailable,
      );
    let routeQuestion = questions['route'];
    if (routeQuestion?.type !== 'choice') throw new Error('Missing route rubric.');
    let families: NativeDecisionRouting['families'] | undefined =
      prepared.routing?.families ??
      requestRoutes(prepared.activityRequests.requests, prepared.activityRequests.choices);
    for (const [key, descriptor] of families)
      routeQuestion.criteria[key] = activityRouteCriterion(descriptor);
    const rating = () =>
      decisionActionAttentionRequest(
        prepared.context,
        prepared.offered,
        'choose-action',
        policy.actionGuidance,
      );
    let answers: Record<string, JudgmentAnswer> | undefined = prepared.routing?.actionAnswers;
    let judged: JudgeValue | undefined;
    if (prepared.routing) judged = prepared.routing.judged;
    else if (!prepared.speechTrigger) {
      const request = rating(),
        combined = { ...request.questions, ...questions };
      let combine = true;
      try {
        validateJudgmentSize(request.state, combined);
      } catch (error) {
        if (!(error instanceof InvalidData)) throw error;
        combine = false;
      }
      if (combine) {
        const all = await this.judge(run, 'attempt:0:route', {
          state: request.state,
          questions: combined,
        });
        judged = {
          answers: Object.fromEntries(
            Object.keys(questions).flatMap((key) =>
              all.answers[key] ? [[key, all.answers[key]!]] : [],
            ),
          ),
        };
        answers = Object.fromEntries(
          Object.keys(request.questions).flatMap((key) =>
            all.answers[key] ? [[key, all.answers[key]!]] : [],
          ),
        );
      } else
        judged = await this.judge(run, 'attempt:0:route', {
          state: prepared.routePrompt,
          questions,
        });
    } else
      judged = await this.judge(run, 'attempt:0:route', { state: prepared.routePrompt, questions });
    let answer = judged.answers['route'];
    const probability = answer?.type === 'choice' ? (answer.probabilities[answer.choice] ?? 0) : 0,
      selected = answer?.type === 'choice' && probability >= 0.5 ? answer.choice : null,
      route =
        generationAvailable && prepared.addressedSpeech && selected === 'native'
          ? 'level2'
          : (selected ?? (generationAvailable && prepared.addressedSpeech ? 'level2' : null));
    if (generationAvailable && policy.reflection) {
      const reflection = judged.answers['reflection'];
      if (reflection?.type === 'choice' && reflection.choice === 'yes')
        await this.maintenance.enqueue(
          run.actorId,
          run.job.id,
          run.job.request.text,
          run.generation,
        );
    }
    await this.log.record(
      `${run.job.id}:attempt:0:routing`,
      'Semantic decision',
      { offeredRoutes: routeQuestion.criteria },
      { selectedRoute: selected, route, ...judged },
    );
    if (!route || !Object.hasOwn(routeQuestion.criteria, route) || route === 'native') {
      if (
        route !== 'native' &&
        (await this.handoff(
          run,
          selected ? 'invalid-output' : 'abstained',
          run.job.kind === 'chat',
        ))
      )
        return;
      await this.update(
        run,
        'completed',
        route === 'native'
          ? 'Native behavior continues; no model response.'
          : 'Semantic decision deferred: uncertain route.',
        { disposition: route === 'native' ? 'native' : 'deferred' },
      );
      return;
    }
    if (route !== 'level1' && (await this.handoff(run, 'semantic-escalation', true))) return;
    const family = families.get(route);
    let response: ActorResponse | undefined;
    if (family) {
      let round = 0;
      response = await chooseActivityRequest({
        descriptor: family,
        choices: prepared.activityRequests.choices,
        simTime: prepared.simTime,
        namedDeadlines: prepared.namedDeadlines,
        state: prepared.prompt,
        judge: (request) => this.judge(run, `attempt:0:activity-parameters:${round++}`, request),
      });
      if (!response) {
        await this.update(
          run,
          'completed',
          'The optional activity was declined or its parameters remained uncertain. No activity started.',
          { disposition: 'deferred' },
        );
        return;
      }
    }
    let level: 2 | 3 | 4 = route === 'level3' ? 3 : route === 'level4' ? 4 : 2;
    if (!response && route === 'level1') {
      if (!answers)
        answers = (await this.judge(run, 'attempt:0:action-attention', rating())).answers;
      const resolved = resolveLevel1({
        offered: prepared.offered.map((offer) => ({
          handle: offer.id,
          description: offer.description,
        })),
        answers,
        isContinue: (id) => prepared.noInterventionChoices.has(id),
        escalation: generationAvailable
          ? { available: true, level: escalationLevel(answer, Object.keys(routeQuestion.criteria)) }
          : { available: false, blocked: 'generation-unavailable' },
      });
      run.level1 = resolved.outcome;
      await this.log.record(`${run.job.id}:attempt:0:level1`, 'Level-1 selection', resolved, {
        outcome: resolved.outcome,
        message: level1Message(resolved.outcome),
      });
      if (resolved.outcome.kind === 'defer') {
        const reason = level1EscalationReason(resolved.outcome);
        if (reason && (await this.handoff(run, reason, run.job.kind === 'chat'))) return;
        await this.update(run, 'completed', level1Message(resolved.outcome), {
          disposition: 'deferred',
          level1: resolved.outcome,
        });
        return;
      }
      if (resolved.outcome.kind === 'escalate') {
        const reason = level1EscalationReason(resolved.outcome);
        if (reason && (await this.handoff(run, reason, run.job.kind === 'chat'))) return;
        level = resolved.outcome.level;
      } else response = this.knownResponse(prepared, resolved.outcome.handle);
    }
    // Route and action judgments have finished selection and logging. Retain
    // the permitted offered menu, while generation owns only its actual input.
    questions = undefined;
    routeQuestion = undefined;
    families = undefined;
    judged = undefined;
    answers = undefined;
    answer = undefined;
    prepared.retireRouting();
    const previewController = run.controller;
    const previewHistoryEpoch = this.service.historyEpoch;
    const startPreview = () =>
      !run.job.decision &&
      run.job.kind === 'chat' &&
      run.job.authority &&
      run.job.playerSpeechEventId &&
      this.service.config.macrofoldKey
        ? this.replyPreviews.start({
            scope: run.job.authority,
            requestId: run.job.id,
            npcId: run.actorId,
            playerSpeechEventId: run.job.playerSpeechEventId,
            attempt: 0,
            maxBytes: Math.min(
              1_000_000,
              levelLimits(this.service.config)[level].visibleOutputBytes,
            ),
            rootKeys: [...Object.keys(prepared.schema.shape), 'queries'],
            current: () =>
              this.runs.get(run.job.id) === run &&
              run.controller === previewController &&
              !previewController.signal.aborted &&
              !run.cancelReason &&
              !run.invalidated &&
              run.generation === this.service.generation &&
              previewHistoryEpoch === this.service.historyEpoch &&
              this.service.npcActor(run.actorId)?.physicalLife === run.physicalLife,
            operation: (value) => prepared.previewSpeech(value),
          })
        : undefined;
    let preview: ReturnType<typeof startPreview>;
    if (!response) {
      preview = startPreview();
      const selectedModel = resolveNpcGenerationConfig(
        this.service.config,
        level === 2 ? 'npc_response_fast' : 'npc_response_complex',
        {
          maxOutputTokens: LEVEL_LIMITS[level].outputTokens,
          reasoningEffort: LEVEL_LIMITS[level].effort,
        },
      );
      const generate = async (suffix: string) => {
        const schema = prepared.requestSchema();
        let instructions: ReturnType<typeof joinNativeDecisionText> | undefined;
        let deployment: Omit<GenerateRequest, 'requestId' | 'signal'> | undefined;
        try {
          if (!prepared.queryUsed)
            instructions = joinNativeDecisionText(
              this.service.world,
              prepared.instructions,
              ' ',
              SITUATION_QUERY_INSTRUCTIONS,
            );
          let request: Omit<GenerateRequest, 'requestId' | 'signal'> = {
            task: 'npc_response',
            actorScope: run.actorId,
            execution: level === 2 ? 'fast' : 'complex',
            ...('macrofoldDeployment' in selectedModel
              ? { macrofoldDeployment: selectedModel.macrofoldDeployment }
              : { model: selectedModel.model, reasoningEffort: selectedModel.reasoningEffort }),
            maxOutputTokens: selectedModel.maxOutputTokens,
            instructions: instructions?.text ?? prepared.instructions,
            context: prepared.prompt,
            schema,
            ...(preview ? { onProgress: preview.progress } : {}),
          };
          if (request.macrofoldDeployment)
            request = deployment = await this.macrofold.prepareDeploymentGeneration(
              request,
              selectedModel.structuredOutput,
              run.controller.signal,
              run.validateJudgmentSource!,
            );
          return await this.generate(run, request, suffix, level);
        } finally {
          if (deployment) this.macrofold.releaseDeploymentGeneration(deployment);
          if (instructions) releaseNativeProduct(instructions);
          releaseNativeProduct(schema);
        }
      };
      let value = await generate('attempt:0:generate');
      const queries = readSituationQueryResponse(value, prepared.situation.policy.maximumQueries);
      if (queries?.queries?.length) {
        try {
          await prepared.expandQueries(queries.queries);
          preview?.finish();
        } finally {
          // This read-only answer has finished disclosing its query. Retire
          // its independent child pins before preparing the next inference.
          if (value !== null && typeof value === 'object') {
            for (const key in value) {
              if (!Object.hasOwn(value, key)) continue;
              const child = (value as Record<string, unknown>)[key];
              if (child !== null && typeof child === 'object') releaseNativeProduct(child);
            }
            releaseNativeProduct(value);
          }
        }
        preview = startPreview();
        value = await generate('attempt:0:query-final');
      }
      try {
        preview?.finish();
      } catch {
        throw new InvalidData('The response did not match the decision contract.');
      }
      if (bytes(value) > levelLimits(this.service.config)[level].visibleOutputBytes)
        throw new InvalidData('The response exceeds its visible output allowance.');
      response = admitDecisionGraph(this.service.world, decisionJsonGraphBytes(value), () =>
        responseEffects(prepared.schema.parse(value) as ActorResponse),
      );
    }
    this.current(run);
    await this.awaitResume(run, true);
    if (!(await prepared.current()))
      throw new StopJob('stale', 'The selected personal evidence changed before publication.');
    const claim = run.job.decision
      ? this.claim(run.job, response, run.job.id, run.job.id)
      : undefined;
    preview?.admitting();
    const outcome = await this.service.applyNpcResponse({
      actorId: run.actorId,
      responseId: run.job.id,
      ticket: prepared.ticket,
      response,
      generation: run.generation,
      signal: run.controller.signal,
      current: () => {
        try {
          this.current(run);
          return true;
        } catch {
          return false;
        }
      },
      claim,
    });
    try {
      await preview?.settle();
      if (claim?.deliveredAt !== undefined)
        await recordDecisionTiming(
          this.log,
          run.job,
          'final',
          claim.deliveredAt,
          claim.deliveredElapsedMs,
        );
      if (run.job.decision) run.job = (await this.service.store.getJob(run.job.id)) ?? run.job;
      else
        await this.update(run, outcome.ok ? 'completed' : 'failed', outcome.message, {
          disposition: outcome.ok ? 'resolved' : 'native-rejection',
          outcome,
        });
      if (!outcome.ok && (await this.handoff(run, 'native-rejection', true))) return;
    } finally {
      // SQL and diagnostics have consumed/copied the report; a handoff has
      // captured its own stored job. This caller returns no borrowed outcome.
      releaseNativeProduct(outcome);
    }
  }

  private knownResponse(prepared: Preparation, id: string): ActorResponse {
    if (!prepared.offered.some((offer) => offer.id === id))
      throw new Error('Unknown offered action.');
    const transition = prepared.workTransition(id);
    if (transition === undefined) throw new Error('Known action lost its actual work transition.');
    return prepared.noInterventionChoices.has(id)
      ? { operations: [] }
      : actionResponse({
          kind: 'known',
          mode: transition === 'continue' ? 'enqueue' : transition,
          actionId: id,
          verb: null,
          targetEntityId: null,
          description: null,
        });
  }
  private claim(
    job: JobRecord,
    response: ActorResponse,
    receiptId: string,
    attemptId: string,
  ): DecisionPublication {
    if (!job.decision) throw new Error('Decision publication requires its admitted root.');
    return {
      rootJobId: job.id,
      attemptId,
      expectedRevision: job.decision.revision,
      receiptId,
      groups: {
        q0: {
          operations: response.operations.map((operation) => operation.localId),
          ...(!response.operations.length ? { continued: true } : {}),
        },
      },
      final: false,
      now: this.now,
    };
  }
  private async handoff(run: Run, reason: DecisionReason, response = false): Promise<boolean> {
    if (!run.job.decision || run.controller.signal.aborted || run.receipt?.completionUncertain)
      return false;
    const { prepare, release } = this.retainRunPreparation(run);
    const accepted = await this.escalator.enqueue(run.job.id, reason, response, prepare, release);
    if (accepted) {
      run.handedOff = true;
      run.preparation = undefined;
      run.intake = undefined;
      run.job = (await this.service.store.getJob(run.job.id)) ?? run.job;
    }
    return accepted;
  }

  private retainRunPreparation(run: Run) {
    const retained = run.preparation,
      intake = run.intake,
      label = this.names.get(run.actorId);
    let released = false;
    return {
      prepare: (job: JobRecord, signal: AbortSignal) => {
        retained?.retireRouting();
        return this.prepareHigher(job, signal, retained, intake, run.semanticCauseOrdinals);
      },
      release: () => {
        if (released) return;
        released = true;
        try {
          retained?.dispose();
        } finally {
          try {
            intake?.release();
          } finally {
            if (this.names.get(run.actorId) === label) this.names.delete(run.actorId);
            // This old label can outlive a replacement in the lookup map. Its
            // retained higher/uncertain owner, rather than that map, ends it.
            if (label) releaseNativeProduct(label);
          }
        }
      },
    };
  }

  private async prepareHigher(
    job: JobRecord,
    signal: AbortSignal,
    retained?: Preparation,
    intake?: NativeNpcIntake,
    semanticCauseOrdinals: readonly number[] = [],
  ): Promise<PreparedReconsideration> {
    const state = job.decision;
    if (!state?.higher) throw new Error('Missing admitted reconsideration.');
    const higher = state.higher;
    const run: Run = {
      actorId: state.actorId,
      physicalLife: state.physicalLife,
      generation: state.generation,
      job,
      urgent: state.urgency >= INTAKE_LIMITS.urgent,
      controller: new AbortController(),
      preparedResponse: true,
      intake,
      semanticCauseOrdinals,
      ledger: new DecisionLedger(state.limits),
    };
    const abort = () => run.controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    const outputOwner = createNativeConsumerScope();
    let prepared: Preparation | undefined;
    try {
      prepared =
        retained ?? (await this.prepare(run, state.higher.id, signal, 'prepared-response', true));
      if (retained) await prepared.rebindDecision(state.higher.id);
      const source = prepared;
      const response = Object.values(state.groups).some(
        (group) => group.state === 'open' && group.kind === 'response',
      );
      const tasks = (): Record<string, DecisionTask> => ({
        q0: response
          ? reconsiderationResponseTask(source.schema, source.queryUsed)
          : {
              kind: 'choice',
              question:
                'Choose the personally suitable, currently offered action or deliberate continuation. Abstain if no offered choice is suitable.',
              choices: Object.fromEntries(
                source.offered.map((offer) => [offer.id, offer.description]),
              ),
            },
      });
      const result: PreparedReconsideration = {
        allocation: {
          reserveBytes: this.providerAllocation.reserveBytes,
          retain: (value, reservation) =>
            outputOwner.runSync(() => this.providerAllocation.retain(value, reservation)),
        },
        get tasks() {
          return tasks();
        },
        get context() {
          return source.prompt;
        },
        instructions: source.instructions,
        get bindingDigest() {
          return digest({
            validity: source.validity,
            choices: source.offered,
            queryUsed: source.queryUsed,
          });
        },
        sourceTime: source.diagnostics.sourceTime,
        current: () => source.current(),
        dispatch: (start) => source.publish(start),
        prepareRequest: () => {
          const capacity = this.service.world;
          const count = source.offerCount;
          const selected = admitDecisionGraph(
            capacity,
            decisionObjectBytes(1) +
              decisionObjectBytes(4) +
              (response
                ? decisionTextBytes(
                    RECONSIDERATION_RESPONSE_QUESTION.length +
                      1 +
                      SITUATION_QUERY_INSTRUCTIONS.length,
                  )
                : decisionObjectBytes(count) +
                  2 * decisionArrayBytes(count) +
                  count * (decisionObjectBytes(2) + decisionArrayBytes(2))),
            tasks,
          );
          let input: ReturnType<typeof nativeDecisionJsonText> | undefined;
          let guidance: ReturnType<typeof nativeDecisionJsonText> | undefined;
          try {
            const character = source.context;
            const agency = character['agency'] as Record<string, unknown>;
            const projection = admitDecisionGraph(
              capacity,
              decisionObjectBytes(7) +
                decisionObjectBytes(decisionRecordEntries(character)) +
                decisionObjectBytes(decisionRecordEntries(agency)) +
                decisionObjectBytes(2) +
                decisionArrayBytes(count) +
                count * decisionObjectBytes(2),
              () =>
                reconsiderationContextValue({
                  sourceTime: source.diagnostics.sourceTime,
                  context: character,
                  selectedSections: source.selectedSections,
                  queryUsed: source.queryUsed,
                  response,
                  expansion: source.queryDisclosure,
                  offered: response ? source.offered : [],
                  appraisals: source.appraisalContext,
                  reason: higher.reason,
                }),
            );
            try {
              input = nativeDecisionJsonText(capacity, projection);
            } finally {
              releaseNativeProduct(projection);
            }
            guidance = nativeDecisionJsonText(
              capacity,
              this.service.definitions.facts.definitions.cognitionPolicy.actionGuidance,
            );
            const request = prepareDecisionTask(selected, input.text, guidance.text, capacity);
            return {
              tasks: selected,
              request,
              jsonSize: (value) => nativeDecisionJsonSize(capacity, value),
              release: () => {
                releaseNativeProduct(request);
                releaseNativeProduct(selected);
              },
            };
          } catch (error) {
            releaseNativeProduct(selected);
            throw error;
          } finally {
            if (input) releaseNativeProduct(input);
            if (guidance) releaseNativeProduct(guidance);
          }
        },
        refresh: (job, refreshSignal) =>
          this.prepareHigher(job, refreshSignal, undefined, intake, semanticCauseOrdinals),
        dispose: () => {
          signal.removeEventListener('abort', abort);
          outputOwner.dispose();
          source.dispose();
        },
        expand: async (answers) => {
          const first = answers['q0'];
          if (first?.status !== 'answered' || !response) return false;
          const queries = readSituationQueryResponse(
            first.value,
            source.situation.policy.maximumQueries,
          );
          if (!queries?.queries?.length) return false;
          await source.expandQueries(queries.queries);
          return true;
        },
        publish: async (answers, claim) => {
          const selected = answers['q0'];
          if (selected?.status !== 'answered')
            return {
              ok: false,
              code: 'abstained',
              message: 'The character could not settle on a supported answer.',
            };
          const value = response
            ? admitDecisionGraph(this.service.world, decisionJsonGraphBytes(selected.value), () =>
                responseEffects(source.schema.parse(selected.value) as ActorResponse),
              )
            : this.knownResponse(source, 'choice' in selected.value ? selected.value.choice : '');
          try {
            claim.groups = {
              q0: {
                operations: value.operations.map((operation) => operation.localId),
                ...(!value.operations.length ? { continued: true } : {}),
              },
            };
            const ticket = source.ticket;
            source.retireContext();
            return await this.service.applyNpcResponse({
              actorId: state.actorId,
              responseId: state.higher!.id,
              ticket,
              response: value,
              generation: state.generation,
              current: () =>
                !signal.aborted && !this.stopped && state.generation === this.service.generation,
              signal,
              claim,
            });
          } finally {
            releaseNativeProduct(value);
          }
        },
      };
      return result;
    } catch (error) {
      signal.removeEventListener('abort', abort);
      outputOwner.dispose();
      if (!retained) prepared?.dispose();
      throw error;
    }
  }

  private async update(
    run: Run,
    status: JobRecord['status'],
    message: string,
    result?: unknown,
  ): Promise<void> {
    const terminal = ['completed', 'failed', 'cancelled', 'stale'].includes(status),
      at = this.now();
    const updated = {
      ...run.job,
      status,
      message,
      ...(terminal ? { completedAt: at, totalLatencyMs: Math.max(0, at - run.job.createdAt) } : {}),
      ...(result !== undefined ? { result } : {}),
    };
    if (run.job.decision) {
      const saved = await this.service.store.mutateDecision(run.job.id, async (current) => {
        if (current.decision!.phase === 'closed' || run.handedOff) return;
        const disposition =
          result && typeof result === 'object' && 'disposition' in result
            ? String(result.disposition)
            : undefined;
        const end =
          status === 'cancelled'
            ? 'cancelled'
            : status === 'stale'
              ? 'stale'
              : status === 'completed'
                ? 'abstained'
                : disposition === 'capacity' ||
                    disposition === 'budget-exhausted' ||
                    disposition === 'expired' ||
                    disposition === 'uncertain' ||
                    disposition === 'context-exceeded'
                  ? disposition
                  : disposition === 'invalid'
                    ? 'invalid-output'
                    : 'provider-failed';
        const decision = terminal ? endDecision(current.decision!, end, at) : current.decision!;
        if (terminal && decision.cursor && decision.generation === this.service.generation)
          await this.service.store.consumeDecisionCursor(decision.cursor);
        return { ...current, ...updated, decision };
      });
      run.job = saved ?? (await this.service.store.getJob(run.job.id)) ?? run.job;
    } else {
      run.job = updated;
      await this.service.store.putJob(updated);
    }
    if (terminal && run.ledger?.entries.length)
      await this.log.record(
        `${run.job.id}:decision-accounting`,
        'Decision accounting',
        { limits: run.ledger.limits },
        { ...run.ledger.summary(), entries: run.ledger.entries },
      );
    const trace = this.log.get(run.job.id);
    if (trace)
      await this.log.save({
        ...trace,
        status: terminal ? (status === 'completed' ? 'completed' : 'failed') : 'running',
        disposition:
          result && typeof result === 'object' && 'disposition' in result
            ? String(result.disposition)
            : status,
        output: { message, result },
        ...(terminal ? { completedAt: new Date(at).toISOString() } : {}),
      });
    this.service.notifyTelemetry();
  }

  private async settleDiscovery(
    actorId: string,
    reservation: string,
    generation: string,
    dispatched: boolean,
  ): Promise<boolean> {
    try {
      const read = await this.service.captureNpcIntake(actorId, 0);
      try {
        if (
          read.facts.semantic?.discovery !== 'reserved' ||
          read.facts.semantic.reservation !== reservation
        )
          return true;
      } finally {
        read.release();
      }
      return await this.service.changeNpcIntake(actorId, generation, {
        type: 'settle-discovery',
        reservation,
        dispatched,
      });
    } catch (error) {
      if (dispatched || !isOverloadError(error)) throw error;
      // A transport's protected save barrier can temporarily defer this
      // optional cleanup. Recover the saved reservation through its existing
      // receipt-aware owner instead of turning admission pressure into a
      // permanent storage failure. This never repeats model dispatch.
      if (generation === this.service.generation) this.discoveryRecovery.add(actorId);
      return false;
    }
  }
  /** Recover only actual saved reservations. A durable dispatch intent spends
   * the permission; an unsubmitted orphan is released without a paid retry. */
  private async reconcileDiscoveryReservations(generation: string): Promise<void> {
    for (const actorId of [...this.discoveryRecovery].slice(0, INTAKE_LIMITS.readsPerPass)) {
      if (generation !== this.service.generation || this.stopped) return;
      const actor = this.service.npcActor(actorId);
      if (!actor?.alive || actor.controller !== 'npc' || !actor.memory) {
        this.discoveryRecovery.delete(actorId);
        continue;
      }
      const read = await this.service.publishRecall(() =>
        NativeNpcIntake.refresh(this.service.world, actorId, this.weighed.get(actorId)),
      );
      const reservation =
        read.facts.discovery?.state === 'reserved' ? read.facts.discovery.reservation : undefined;
      if (!reservation) {
        this.discoveryRecovery.delete(actorId);
        continue;
      }
      if ([...this.runs.values()].some((run) => run.discovery?.reservation === reservation))
        continue;
      const attempts = await this.service.store.decisionAttempts(reservation);
      const dispatched = attempts.some((attempt) =>
        attempt.receipt
          ? attempt.receipt.dispatched || attempt.receipt.completionUncertain
          : attempt.dispatchIntent,
      );
      const job = dispatched ? undefined : await this.service.store.getJob(reservation);
      if (
        job?.decision &&
        ['higher', 'waiting-primary'].includes(job.decision.phase) &&
        job.decision.generation === generation &&
        job.decision.timelineId === this.service.timelineId
      )
        continue;
      if (
        !(await this.service.changeNpcIntake(actorId, generation, {
          type: 'settle-discovery',
          reservation,
          dispatched,
        }))
      )
        continue;
      this.discoveryRecovery.delete(actorId);
      if (!dispatched) {
        const key = `semantic-schedule:${this.service.worldId}:${actorId}`;
        const schedule = (await this.service.store.getIntegration(key)) as
          | ActorThoughtSchedule
          | undefined;
        if (schedule?.attemptedJobId === reservation) {
          const {
            attemptedOpportunity: _opportunity,
            attemptedJobId: _job,
            ...remaining
          } = schedule;
          await this.writeSchedule(key, remaining, generation);
        }
      }
    }
  }

  private changed(publication: NativePublication): void {
    for (const id of nativePublicationActors(publication, this.service.npcActorIds()))
      this.dirty.add(id);
  }

  async considerThought(): Promise<void> {
    const config = this.service.config;
    if (this.stopped || config.budgetUsd <= 0 || !(config.macrofoldKey || config.jevKey)) return;
    return this.admission(async () => {
      void this.maintenance.tick(this.runs.size > 0).catch((error: unknown) => {
        // Protected gameplay work can defer optional maintenance admission;
        // only an actual preparation/storage failure stops the world writer.
        if (!isOverloadError(error)) this.service.fail(error);
      });
      if (this.generation !== this.service.generation) {
        this.work.clear();
        this.dirty.clear();
        this.weighed.clear();
        this.names.clear();
        this.discoveryRecovery.clear();
        this.generation = this.service.generation;
        for (const id of this.service.npcActorIds()) {
          this.dirty.add(id);
          this.discoveryRecovery.add(id);
        }
      }
      const generation = this.service.generation;
      await this.reconcileDiscoveryReservations(generation);
      if (this.stopped || this.service.paused || this.runs.size >= 2) return;
      for (const id of [...this.dirty].slice(0, INTAKE_LIMITS.readsPerPass)) {
        this.dirty.delete(id);
        const actor = this.service.npcActor(id);
        if (!actor?.alive || actor.controller !== 'npc' || !actor.memory) {
          this.work.retire(id);
          continue;
        }
        const read = await this.service.publishRecall(() =>
          NativeNpcIntake.refresh(this.service.world, id, this.weighed.get(id)),
        );
        if (!read.facts.enrolled) {
          this.work.retire(id);
          this.weighed.delete(id);
          continue;
        }
        this.work.refreshCaptured(
          this.service.worldId,
          generation,
          [{ id, input: read.input }],
          false,
        );
        this.weighed.set(id, read.facts.awarenessThrough);
      }
      const ready = this.work.ready(
        this.now(),
        this.service.simTime,
        (id) =>
          !this.escalator.hasActor(id) &&
          ![...this.runs.values()].some((run) => run.actorId === id) &&
          this.service.npcActor(id)?.controller === 'npc' &&
          !this.service.npcActor(id)?.incapacitated,
      );
      for (const actorId of ready) {
        const key = `semantic-schedule:${this.service.worldId}:${actorId}`;
        const previous = (await this.service.store.getIntegration(key)) as
          | ActorThoughtSchedule
          | undefined;
        const last =
          previous?.watermark === undefined
            ? previous
            : {
                ...previous,
                watermark: Math.min(previous.watermark, this.service.durableIdentityThrough),
              };
        const captured = this.work.captureRead(actorId),
          read = await this.service.captureNpcIntake(
            actorId,
            last?.watermark ?? 0,
            this.weighed.get(actorId),
          );
        let transferred = false;
        try {
          if (
            generation !== this.service.generation ||
            !read.facts.enrolled ||
            !read.facts.eligible
          )
            continue;
          const input = read.inputs();
          if (
            !captured ||
            captured.inputs.length !== input.values.length ||
            captured.inputs.some((value, index) => value !== input.values[index])
          ) {
            this.work.refreshCaptured(
              this.service.worldId,
              generation,
              [{ id: actorId, input: (await read.queueInputs()).input }],
              false,
            );
            continue;
          }
          const jobs = await this.service.store.getSpeechJobs(
            read
              .records()
              .filter((record) => record.eventType === 'speech')
              .map((record) => record.eventId ?? record.id),
          );
          const handled = new Set(
            [...jobs].flatMap(([id, job]) => (job.request.npcId === actorId ? [id] : [])),
          );
          const thought = read.thought(this.service.definitions, last, handled),
            urgent =
              (this.work.pending(actorId)?.urgency ?? 0) >= INTAKE_LIMITS.urgent ||
              thought.preparedResult ||
              thought.interruptions.length > 0 ||
              thought.nativeCauses.some((cause) => cause.severity >= INTAKE_LIMITS.urgent);
          if (!this.canAdmit(actorId, urgent) || !(await this.execution.primaryAvailable(urgent)))
            continue;
          const inspected = await this.service.inspectNpcIntake(read, (current) =>
            this.work.inspectedRead(actorId, thought.review.nextAt, captured, generation, current),
          );
          if (!inspected?.result) continue;
          if (
            (!thought.latest.length &&
              !thought.nativeCauses.length &&
              !thought.meaningfulChange &&
              !thought.newReview &&
              thought.discovery === undefined) ||
            last?.attemptedOpportunity === thought.opportunity
          ) {
            this.work.recordOutcome('unchanged', thought.all.length);
            if (last?.semanticRevision !== thought.semanticRevision)
              await this.writeSchedule(
                key,
                {
                  ...last,
                  fingerprint: thought.fingerprint,
                  semanticRevision: thought.semanticRevision,
                  at: this.now(),
                },
                generation,
              );
            continue;
          }
          const sentence = [
            ...thought.latest.map((memory) => memory.summary),
            `My current goal is ${activeGoalTexts(read.facts.own.agency.goals).join('; ')}.`,
            ...read.facts.own.attributes.flatMap((value) => (value.concern ? [value.concern] : [])),
            ...read.facts.own.attributes.flatMap((value) =>
              value.condition ? [`${value.name}: ${value.condition}.`] : [],
            ),
          ].join(' ');
          const trigger =
            thought.nativeProtection ??
            thought.diagnosticTrigger ??
            (thought.nativeCauses.length
              ? 'I notice a newly supported change in nearby physical relations.'
              : thought.newReview
                ? `I am still aware of ${thought.reviewDescription}.`
                : thought.discovery !== undefined
                  ? 'I have a free moment to consider my surroundings.'
                  : read.facts.own.agency.plan?.status === 'blocked'
                    ? 'My chosen work is blocked.'
                    : 'A personally acquired goal, capability or bodily condition changed.');
          if (thought.nativeProtection) {
            this.work.recordOutcome('deferred', thought.all.length);
            if (last?.skippedOpportunity !== thought.opportunity)
              await this.writeSchedule(
                key,
                {
                  ...last,
                  fingerprint: thought.fingerprint,
                  semanticRevision: thought.semanticRevision,
                  at: this.now(),
                  skippedOpportunity: thought.opportunity,
                  ...(thought.review.key ? { reviewKey: thought.review.key } : {}),
                },
                generation,
              );
            continue;
          }
          this.work.recordOutcome('admitted', thought.all.length);
          const id = `thought-${randomUUID()}`;
          if (
            thought.discovery !== undefined &&
            !(await this.service.changeNpcIntake(actorId, generation, {
              type: 'reserve-discovery',
              interval: thought.discovery,
              reservation: id,
            }))
          )
            continue;
          const attempted = {
            fingerprint: thought.fingerprint,
            semanticRevision: thought.semanticRevision,
            at: this.now(),
            ...(last?.watermark !== undefined ? { watermark: last.watermark } : {}),
            attemptedOpportunity: thought.opportunity,
            attemptedJobId: id,
            ...(thought.review.key ? { reviewKey: thought.review.key } : {}),
          };
          if (!(await this.writeSchedule(key, attempted, generation))) {
            if (thought.discovery !== undefined)
              await this.settleDiscovery(actorId, id, generation, false);
            continue;
          }
          const watermark = Math.min(
            Math.max(last?.watermark ?? 0, thought.maxSequence),
            this.service.durableIdentityThrough,
          );
          await this.begin(
            {
              id,
              kind: 'thought',
              fingerprint: thought.fingerprint,
              status: 'queued',
              message: 'Considering a semantic event.',
              diagnosticTrigger: trigger,
              triggerEvidenceId: thought.latest[0]?.eventId ?? thought.latest[0]?.id,
              stimulusEvidenceIds: thought.latest.map((memory) => memory.eventId ?? memory.id),
              ...(thought.nativeCauses.length ? { semanticCauses: thought.nativeCauses } : {}),
              request: { text: trigger, npcId: actorId },
              createdAt: this.now(),
            },
            read,
            { key, value: { ...attempted, watermark } },
            urgent,
            thought.discovery !== undefined ? { actorId, reservation: id } : undefined,
            thought.nativeCauses.map((_, index) => index),
          );
          transferred = true;
          if (
            thought.latest.some((memory) =>
              this.service.definitions.facts.definitions.cognitionPolicy.significantEventTypes.includes(
                memory.eventType ?? '',
              ),
            )
          )
            await this.maintenance.enqueue(actorId, id, sentence, generation);
          return;
        } finally {
          if (!transferred) read.release();
        }
      }
    });
  }
  private writeSchedule(
    key: string,
    value: ActorThoughtSchedule,
    generation: string,
  ): Promise<boolean> {
    return this.service.publishRecall(async () => {
      if (this.stopped || generation !== this.service.generation) return false;
      await this.service.store.putIntegration(key, value);
      return true;
    });
  }
  private async deferImmediate(run: Run): Promise<void> {
    const saved = await this.service.store.mutateDecision(run.job.id, async (job) => {
      const state = job.decision!;
      if (state.phase === 'closed' || state.immediate.kind !== 'pending') return;
      if (state.cursor && state.generation === this.service.generation)
        await this.service.store.consumeDecisionCursor(state.cursor);
      return {
        ...job,
        decision: {
          ...state,
          phase: 'waiting-primary',
          immediate: { kind: 'deferred', at: this.now() },
        },
        message:
          'The immediate choice was deferred; any later answer must still pass current game checks.',
      };
    });
    if (saved) {
      run.job = saved;
      await recordDecisionTiming(this.log, saved, 'immediate', this.now());
    }
    this.service.notifyTelemetry();
  }
  private async begin(
    job: JobRecord,
    read: NativeNpcIntake,
    cursor?: NonNullable<JobRecord['decision']>['cursor'],
    urgent = false,
    discovery?: { actorId: string; reservation: string },
    semanticCauseOrdinals: readonly number[] = [],
  ): Promise<void> {
    const facts = read.facts,
      actorId = facts.actorId,
      at = this.now();
    job = { ...job, startedAt: at, queueLatencyMs: Math.max(0, at - job.createdAt) };
    if (permitsEscalation(this.service.config))
      job.decision = decisionRoot({
        jobId: job.id,
        worldId: this.service.worldId,
        timelineId: this.service.timelineId,
        generation: this.service.generation,
        actorId,
        physicalLife: facts.physicalLife ?? 0,
        cause:
          job.triggerEvidenceId || job.playerSpeechEventId
            ? { kind: 'event', id: (job.triggerEvidenceId ?? job.playerSpeechEventId)! }
            : { kind: 'intent', id: job.id },
        originalWatermark:
          cursor && typeof cursor.value === 'object' && cursor.value && 'watermark' in cursor.value
            ? Number(cursor.value.watermark)
            : 0,
        urgency: facts.urgency,
        ...(cursor ? { cursor } : {}),
        acceptedAt: at,
        groups: { q0: job.kind === 'chat' ? 'response' : 'choice' },
        origin: decisionOrigin(this.service.config),
        policyDigest: decisionPolicyDigest(this.service.config),
        limits: levelLimits(this.service.config),
      });
    const run: Run = {
      job,
      actorId,
      physicalLife: facts.physicalLife ?? 0,
      generation: this.service.generation,
      urgent,
      intake: read,
      semanticCauseOrdinals,
      controller: new AbortController(),
      ledger: new DecisionLedger(levelLimits(this.service.config)),
      ...(discovery ? { discovery: { ...discovery, spent: false } } : {}),
    };
    const queued = await read.queueInputs();
    const labels = retainNativeProduct(queued.facts);
    // This caller consumes only labels; the scheduling vector and envelope
    // have independent pins and no later consumer in this run.
    releaseNativeProduct(queued.input.values);
    releaseNativeProduct(queued);
    this.runs.set(job.id, run);
    this.names.set(actorId, labels);
    try {
      await this.service.store.putJob(job);
      if (job.decision) {
        const state = job.decision;
        run.immediateTimer = setTimeout(
          () => void this.deferImmediate(run).catch((error) => this.service.fail(error)),
          Math.max(
            1,
            Math.min(
              state.fastPublishBy - this.now(),
              state.fastPublishByMonotonic - performance.now(),
            ),
          ),
        );
        run.expiryTimer = setTimeout(
          () => {
            run.controller.abort();
            void this.escalator.end(job.id, 'expired').catch((error) => this.service.fail(error));
          },
          Math.max(
            1,
            Math.min(
              state.usefulUntilWall - this.now(),
              state.usefulUntilMonotonic - performance.now(),
            ),
          ),
        );
        run.immediateTimer.unref();
        run.expiryTimer.unref();
      }
      await this.log.save({
        id: job.id,
        kind: 'Semantic trigger',
        ownerAccountId: job.authority?.accountId,
        worldId: this.service.worldId,
        actorId,
        actorName: facts.name,
        trigger: job.diagnosticTrigger ?? job.request.text,
        triggerType:
          job.diagnosticTriggerType ??
          (job.kind === 'chat' ? 'Player speech' : 'Autonomous cognition'),
        gameTime: this.service.simTime,
        startedAt: new Date(at).toISOString(),
        status: 'running',
        disposition: 'queued',
        input: { offeredRoutes: [0, 1, 2, 3, 4, 5], stimulus: job.request.text },
        exchanges: [],
      });
    } catch (error) {
      if (run.immediateTimer) clearTimeout(run.immediateTimer);
      if (run.expiryTimer) clearTimeout(run.expiryTimer);
      this.runs.delete(job.id);
      this.names.delete(actorId);
      releaseNativeProduct(labels);
      if (discovery)
        await this.settleDiscovery(actorId, discovery.reservation, run.generation, false);
      throw error;
    }
    const task = this.log.withTrigger(job.id, async () => {
      try {
        await this.decide(run);
        if (!run.job.decision && run.job.status === 'completed' && cursor) {
          const current = (await this.service.store.getIntegration(cursor.key)) as
            | ActorThoughtSchedule
            | undefined;
          const value = cursor.value as ActorThoughtSchedule;
          await this.writeSchedule(
            cursor.key,
            {
              ...value,
              at: this.now(),
              watermark: Math.min(
                Math.max(current?.watermark ?? 0, value.watermark ?? 0),
                this.service.durableIdentityThrough,
              ),
            },
            run.generation,
          );
        }
      } catch (error) {
        let handoff = false;
        if (run.job.decision && !run.controller.signal.aborted) {
          if (run.receipt?.completionUncertain) {
            const retained = this.retainRunPreparation(run);
            handoff = await this.escalator.awaitPrimary(
              run.job.id,
              run.receipt.requestId,
              run.preparation?.validity,
              retained.prepare,
              retained.release,
            );
            if (handoff) {
              run.preparation = undefined;
              run.intake = undefined;
            }
          } else {
            const reason =
              error instanceof StopJob && error.outcome === 'expired'
                ? 'semantic-escalation'
                : decisionFailureReason(
                    error instanceof StopJob
                      ? (error.outcome ?? '')
                      : error instanceof InvalidData
                        ? 'invalid'
                        : '',
                    run.failure?.reason ?? (error instanceof Error ? error.message : ''),
                    run.receipt,
                  );
            if (reason)
              handoff = await this.handoff(run, reason, job.kind === 'chat' || !!discovery);
          }
        }
        if (handoff) {
          run.handedOff = true;
          return;
        }
        const cancelled = run.controller.signal.aborted;
        await this.log.record(`${run.job.id}:failure`, 'Workflow failure', {
          reason: error instanceof Error ? error.message : 'Unknown failure',
        });
        await this.update(
          run,
          error instanceof StopJob ? error.status : cancelled ? 'cancelled' : 'failed',
          error instanceof StopJob || error instanceof ContextBudgetError
            ? error.message
            : cancelled
              ? (run.cancelReason ?? 'The request was cancelled before completion.')
              : 'The workflow failed safely. No automatic paid retry was sent.',
          {
            disposition:
              error instanceof StopJob
                ? (error.outcome ?? error.status)
                : error instanceof ContextBudgetError
                  ? 'context-exceeded'
                  : error instanceof InvalidData
                    ? 'invalid'
                    : cancelled
                      ? 'cancelled'
                      : 'failed',
          },
        );
      } finally {
        this.replyPreviews.end(run.job.id);
        run.preparation?.dispose();
        run.preparation = undefined;
        run.intake?.release();
        run.intake = undefined;
        if (run.immediateTimer) clearTimeout(run.immediateTimer);
        if (run.expiryTimer) clearTimeout(run.expiryTimer);
        try {
          if (!run.handedOff && discovery && !run.discovery?.spent)
            await this.settleDiscovery(actorId, discovery.reservation, run.generation, false);
        } finally {
          // A failed operational reservation cleanup must not leave the actor
          // permanently busy. A handed-off label stays with its real retained
          // intake until the higher/uncertain owner releases that preparation.
          if (this.runs.get(job.id) === run) this.runs.delete(job.id);
          if (!run.handedOff) {
            if (this.names.get(actorId) === labels) this.names.delete(actorId);
            releaseNativeProduct(labels);
          }
          this.service.notifyTelemetry();
        }
      }
    });
    this.pending.add(task);
    void task.finally(() => this.pending.delete(task)).catch((error) => this.service.fail(error));
  }
  async idle(): Promise<void> {
    while (this.pending.size) await Promise.allSettled([...this.pending]);
    await this.execution.idle();
  }
  close(): Promise<void> {
    return (this.closing ??= (async () => {
      this.stopped = true;
      const previews = this.replyPreviews.close();
      this.releaseAdmission();
      this.unsubscribe();
      for (const run of this.runs.values()) run.controller.abort();
      // Stop the real background index's admission immediately, while other
      // execution/source owners drain. Its failure is still awaited below.
      const indexing = this.memoryIndex.close();
      void indexing.catch(() => undefined);
      await Promise.all([previews, this.escalator.close()]);
      await this.admissionTail;
      await Promise.allSettled([...this.pending]);
      this.work.clear();
      this.dirty.clear();
      this.discoveryRecovery.clear();
      this.names.clear();
      await this.maintenance.close();
      await indexing;
      await this.log.close();
      if (this.ownsExecution) this.execution.close();
    })());
  }
}
