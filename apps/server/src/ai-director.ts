import { normalizeReceiptCost } from '@open-legend/ai';
import {
  decisionAllowance,
  DecisionLedger,
  levelLimits,
  type CognitionLevel,
  type LedgerCategory,
} from './cognition-budget.js';
import { namedClockTimes, clockDeadline, activityRequestDescriptors } from '@open-legend/domain';
import { requestRoutes, chooseActivityRequest } from './activity-request-choice.js';
import type { RequestScope } from './authority.js';
import {
  observerDescription,
  canSpeak,
  supportsManualWork,
  validResponseEnvelope,
} from '@open-legend/domain';
import { prepareInventionWorkshop } from './invention-workshop.js';
import { inventionAttemptBudget } from './invention-context.js';
import { resolveResponseEntities, resolveEntityMarkers } from './entity-references.js';
import { capabilityBlocked } from '@open-legend/domain';
import { groundActionAttempts } from './action-grounding.js';
import { actionReferencePermitted, commitTypedAction, typedActionForms } from './typed-actions.js';
import { actionResponse } from './action-response.js';
import { npcCandidates, planningCandidates } from './context.js';
import { domainCommand } from './cognition.js';
import type { ActorResponse, AttemptBinding, IntentSlots } from '@open-legend/domain';
import { validIntentSlots } from '@open-legend/domain';
import type { SpeechVolume } from '@open-legend/domain';
import { searchInventions } from './invention-search.js';
import type { InventionContinuation } from '@open-legend/protocol';
import {
  inventSupportedTechnique,
  InventionFailure,
  normalizeInventionProposal,
} from './invention-service.js';
import { inventionPermission, recordInventionFeedback } from '@open-legend/domain';
import { prepareActorInvention } from './actor-invention.js';
import { nativeProtectionReason } from './native-protection.js';
import { currentGoal } from '@open-legend/domain';
import { projectAttributes } from '@open-legend/domain';
import { bodyReconsiderationInputs, bodyPolicy } from '@open-legend/domain';
import { timedSync } from './performance.js';
import { Narrator } from './narrator.js';
import { ActorWork } from './actor-work.js';
import {
  decisionQuestions,
  activityRouteCriterion,
  JEV_QUESTIONS_VERSION,
  LEVEL1_POLICY,
} from './jev-questions.js';
import {
  escalationLevel,
  level1Message,
  offeredForRating,
  resolveLevel1,
  type Level1Outcome,
  type Level1Resolution,
} from './level1-selection.js';
import { retrieveActions } from './action-retrieval.js';
import {
  interestMatches,
  relevantPossessions,
  ThoughtIntakeInputs,
  type InterestSubscription,
} from './interests.js';
import { CognitionMaintenance } from './cognition-maintenance.js';
import { RecallService } from './recall.js';
import {
  fallbackDecisionActions,
  prepareDecision,
  refreshDecisionActions,
  selectDecisionActions,
} from './decision-context.js';
import { responseTrigger } from './response-context.js';
import {
  RESPONSE_INSTRUCTIONS,
  LEVEL_LIMITS,
  boundResponseSchema,
  COGNITION_VERSION,
} from './cognition-contracts.js';
import { captureActionTargets, unseenExperiences, commitActorResponse } from '@open-legend/domain';
import { IntelligenceLog } from './intelligence-log.js';
import { cognitionOutputTokens } from './macrofold-model.js';
import { z } from 'zod';
import { MacrofoldBackend } from './macrofold.js';
import { randomUUID } from 'node:crypto';
import {
  createAiClient,
  InvalidData,
  validateJudgmentSize,
  type AiClient,
  type AiResult,
  type GenerateRequest,
  type JudgeRequest,
  type JudgeValue,
  type JudgmentAnswer,
} from '@open-legend/ai';
import type { DeclarationProvenance } from '@open-legend/domain';
import type { ApiResult } from '@open-legend/protocol';
import { CONTEXT_BYTE_LIMIT, ContextBudgetError } from './context.js';
import { digest, type JobRecord } from './store.js';
import type { WorldService } from './world-service.js';

/** `outcome` keeps provider refusal, unavailability, invalid output, uncertain completion and
 * budget refusal distinct in job results and traces; the job status stays coarse. */
class StopJob extends Error {
  constructor(
    readonly status: 'failed' | 'cancelled' | 'stale',
    message: string,
    readonly outcome?: string,
  ) {
    super(message);
  }
}
const RESPONSE_INTERRUPTION = { importance: 8, urgency: 8 } as const;
interface ResponseInterruption {
  eventId: string;
  sequence: number;
  importance: number;
  urgency: number;
  triggerKind?: string;
  text: string;
}
/** What a paid request serves and its submitted sizes; see DecisionLedger. */
interface Meter {
  category: LedgerCategory;
  level?: CognitionLevel;
  model?: string;
  size: { instructions: number; context: number; schema: number };
}
const textBytes = (value: unknown) =>
  value === undefined
    ? 0
    : Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value));
/** Ledger sizes are UTF-8 bytes for every provider; Jev's own size limit is enforced by its
 * client in serialized characters. */
const judgeMeter = (
  category: LedgerCategory,
  request: { state: unknown; questions: unknown },
): Meter => ({
  category,
  ...(category === 'level' ? { level: 1 as const } : {}),
  size: {
    instructions: 0,
    context: textBytes(request.state),
    schema: textBytes(request.questions),
  },
});
interface Running {
  /** Per-decision accounting and level limits; absent for non-decision jobs. */
  ledger?: DecisionLedger;
  /** The resolved level-1 outcome, kept with any later failure of its escalation. */
  level1?: Level1Outcome;
  actorInvention?: {
    actorId: string;
    purpose: string;
    candidate: unknown;
    parentId?: string;
    policyRevision: number;
  };
  job: JobRecord;
  controller: AbortController;
  generation: string;
  generatedBy?: string;
  playerSpeechEventId?: string;
  cancelReason?: string;
  responseWatch?: { actorId: string; afterSequence: number; attempt: number };
  supersession?: { attempt: number; interruptions: ResponseInterruption[] };
}
const choice = (answer: JudgmentAnswer | undefined) =>
  answer && 'choice' in answer && answer.confidence >= 0.55 ? answer.choice : null;
interface ThoughtSchedule {
  fingerprint: string;
  at: number;
  /** Highest evidence sequence a completed decision considered (consumed, not attempted). */
  watermark?: number;
  attemptedOpportunity?: string;
  /** Last opportunity natively deferred (for example while asleep); never consumes evidence. */
  skippedOpportunity?: string;
  /** Due stimulus reviews already offered (EPR06), so only a new due review is named. */
  reviewKey?: string;
}

/** One bounded actor workflow at a time; provider completions never bypass authoritative rules. */
export class AiDirector {
  private running: Running | null = null;
  private pendingWork = new Set<Promise<void>>();
  private admissionTail: Promise<unknown> = Promise.resolve();
  private admission<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.admissionTail.then(operation);
    this.admissionTail = next.catch(() => undefined);
    return next;
  }

  private readonly schedules = new Map<string, ThoughtSchedule | undefined>();
  private readonly thoughtWork = new ActorWork('thought', () => this.now());
  private readonly thoughtInputs = new ThoughtIntakeInputs();
  private readonly unsubscribe: () => void;
  private stopped = false;
  readonly client: AiClient;
  private log: IntelligenceLog;
  private recall: RecallService;
  private maintenance: CognitionMaintenance;
  readonly narrator: Narrator;
  readonly macrofold: MacrofoldBackend;

  constructor(
    readonly service: WorldService,
    client?: AiClient,
    private readonly now = Date.now,
    readonly executionSource: Exclude<DeclarationProvenance['source'], 'supplied-proposal'> = client
      ? 'test-fixture'
      : 'live-model',
  ) {
    const config = service.config;
    const log = (this.log = new IntelligenceLog(service.store));
    this.macrofold = new MacrofoldBackend(service, log);
    this.client = log.wrap(
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
              fetch: log.fetch,
              timeoutMs: config.aiTimeoutMs,
              maxRequestBytes: 500_000,
              maxResponseBytes: 500_000,
              maxOutputTokens: 8192,
            })),
    );
    this.narrator = new Narrator(service, this.client, log);
    this.recall = new RecallService(service, log);
    this.maintenance = new CognitionMaintenance(
      service,
      this.client,
      this.macrofold,
      log,
      this.recall,
      now,
    );
    this.unsubscribe = service.subscribe(() => {
      const run = this.running;
      if (run?.job.authority && !service.currentScope(run.job.authority, 'play', true)) {
        run.cancelReason = 'Control or access changed.';
        run.controller.abort();
        return;
      }
      if (run?.job.kind === 'invention' && run.job.request.invention) {
        const permission = inventionPermission(service.world, run.job.request.invention.authority);
        if (!permission.ok) {
          run.cancelReason = permission.message;
          run.controller.abort();
          return;
        }
      }
      if (service.paused && run?.job.kind === 'thought') {
        run.controller.abort();
        return;
      }
      // A reply may itself activate a restricting state: its already-committed receipt is not pending work.
      // docs/status-effects.md#capabilities-and-presentation
      if (run && run.job.kind !== 'invention' && !service.world.responseReceipts?.[run.job.id]) {
        const entity =
          service.world.entities[run.job.request.npcId ?? service.defaultResidentEntityId];
        if (
          entity?.actor &&
          (capabilityBlocked(
            this.service.world,
            entity,
            run.job.kind === 'action' ? 'actions' : 'speech',
          ) ||
            entity.actor.incapacitated ||
            !entity.actor.alive)
        ) {
          run.cancelReason = `${entity.name} became unavailable; the pending reply was cancelled.`;
          run.controller.abort();
          return;
        }
      }
      const watch = run?.responseWatch;
      if (!run || !watch || watch.attempt > 0 || run.supersession || run.cancelReason) return;
      const interruptions = this.responseInterruptions(watch.actorId, watch.afterSequence);
      if (!interruptions.length) return;
      run.supersession = { attempt: watch.attempt, interruptions };
      // Abort the provider stage promptly; the attempt wrapper rebuilds context once.
      run.controller.abort();
    });
  }

  async submitAction(
    id: string,
    text: string,
    mode: 'enqueue' | 'replace' | 'interrupt',
    targetId?: string,
    authority = this.service.localScope,
    slots: IntentSlots | null = null,
  ): Promise<ApiResult> {
    return this.admission(() =>
      this.service.authorized(authority, 'play', true, async () => {
        this.service.assertScope(authority, 'play', true);
        id = `human:${digest({ account: authority.accountId, world: authority.worldId, id })}`;
        const actorId = authority.actorId;
        const actor = this.service.world.entities[actorId]?.actor;
        if (
          !text.trim() ||
          text.length > 500 ||
          !['enqueue', 'replace', 'interrupt'].includes(mode)
        )
          return {
            ok: false,
            code: 'invalid-action',
            message: 'Supply an action of 1–500 characters.',
          };
        if (slots !== null && !validIntentSlots(this.service.world, slots))
          return {
            ok: false,
            code: 'invalid-action',
            message:
              'A chosen detail is not valid here, such as a stopping time this world does not name.',
          };
        const fingerprint = digest({
          kind: 'action',
          world: this.service.world.id,
          timeline: this.service.timelineId,
          actorId,
          text,
          mode,
          targetId,
          slots,
        });
        const previous = await this.service.store.getJob(id);
        if (previous)
          return previous.kind === 'action' && previous.fingerprint === fingerprint
            ? { ok: true, code: 'duplicate', message: previous.message, jobId: id }
            : {
                ok: false,
                code: 'idempotency-conflict',
                message: 'This request identity was already used.',
              };
        if (this.service.paused)
          return { ok: false, code: 'paused', message: 'Resume before attempting an action.' };
        if (
          !actor?.alive ||
          actor.incapacitated ||
          capabilityBlocked(this.service.world, this.service.world.entities[actorId], 'actions')
        )
          return {
            ok: false,
            code: 'actor-unavailable',
            message: 'Your character cannot act now.',
          };
        if (
          targetId &&
          !this.service.observe(actorId)?.visibleEntities.some((e) => e.id === targetId)
        )
          return {
            ok: false,
            code: 'target',
            message: 'The selected target is no longer perceived.',
          };
        // Recognized typed forms bind natively now, even while another request runs.
        const typed = await commitTypedAction(
          this.service,
          { id, authority, fingerprint },
          actorId,
          { text, targetId: targetId ?? null, slots },
          mode,
        );
        if (typed) return typed;
        if (this.running || this.stopped)
          return {
            ok: false,
            code: 'busy',
            message: 'Another intelligence request is in progress; try again after it finishes.',
          };
        const config = this.service.config;
        if (!config.budgetUsd || (!config.macrofoldKey && !config.jevKey))
          return {
            ok: false,
            code: 'ai-unavailable',
            message: `This wording needs configured Jev and language-model access with an allowance. ${typedActionForms(this.service.world)}`,
          };
        this.maintenance.cancel();
        const job: JobRecord = {
          id,
          kind: 'action',
          authority,
          fingerprint,
          status: 'queued',
          message: 'Resolving your action.',
          createdAt: this.now(),
          diagnosticTriggerType: 'Player action request',
          request: {
            text,
            npcId: actorId,
            action: {
              mode,
              targetId,
              ...(slots ? { slots } : {}),
              expectedPlan: actor.planGeneration,
              targetEpisodes: captureActionTargets(this.service.world, actorId, [
                { actorId, targetId },
              ]),
              timelineId: this.service.timelineId,
            },
          },
        };
        await this.begin(job);
        return { ok: true, code: 'queued', message: job.message, jobId: id };
      }),
    );
  }

  private async groundAttempts(
    run: Running,
    actorId: string,
    response: ActorResponse,
    bindings: AttemptBinding[],
    operation: string,
  ): Promise<AttemptBinding[]> {
    const world = this.service.world;
    const manifest = world.moduleManifest.revision;
    let serial = 0;
    const resolved = await groundActionAttempts(world, actorId, response, bindings, {
      signal: run.controller.signal,
      retryUnresolved: run.job.kind === 'action',
      judge: (request) =>
        this.call(
          run,
          'jev',
          `${operation}:classify:${serial++}`,
          (requestId) =>
            this.client.judge({ ...request, requestId, signal: run.controller.signal }),
          judgeMeter('grounding', request),
        ),
      generate: (request) =>
        this.generate<unknown>(
          run,
          {
            ...request,
            task: 'native_attempt_interpretation',
            actorScope: actorId,
            execution: 'fast',
            model: this.service.config.macrofoldKey
              ? this.service.config.macrofoldMiniModel
              : this.service.config.miniModel,
            reasoningEffort: 'low',
            maxOutputTokens: 2200,
          },
          `${operation}:interpret:${serial++}`,
        ),
      record: (kind, input, output) =>
        this.log.record(`${run.job.id}:${operation}:report:${serial++}`, kind, input, output),
    });
    this.current(run);
    if (this.service.world.moduleManifest.revision !== manifest)
      throw new Error('Mechanics changed during action interpretation; submit a fresh action.');
    return resolved;
  }

  /** Durable readiness is separate from provider stage; a Jev-only/exact response can commit too.
   * docs/architecture.md#actor-agency-foundation
   */
  private async prepareResponseAdmission(run: Running): Promise<void> {
    this.current(run);
    run.job = { ...run.job, responseReady: true };
    await this.service.store.putJob(run.job);
  }

  private async playerAction(run: Running): Promise<void> {
    const actorId = run.job.request.npcId!;
    const request = run.job.request.action!;
    if (request.timelineId !== this.service.timelineId)
      throw new StopJob('stale', 'The action belongs to an earlier timeline.');
    const response = actionResponse({
      kind: 'proposal',
      description: run.job.request.text,
      actionId: null,
      verb: null,
      targetEntityId: request.targetId ?? null,
      mode: request.mode,
      slots: request.slots ?? null,
    });
    const choices = [
      ...npcCandidates(this.service, actorId),
      ...planningCandidates(this.service, actorId),
    ].flatMap((c) =>
      c.command
        ? [
            {
              description: c.description,
              commands: [domainCommand(c.command, actorId, run.job.id)],
            },
          ]
        : [],
    );
    const unique = [...new Map(choices.map((c) => [JSON.stringify(c), c])).values()];
    const bindings = (
      await this.groundAttempts(run, actorId, response, unique, 'player-action')
    ).map((binding) => ({
      ...binding,
      targetEpisodes: { ...binding.targetEpisodes, ...request.targetEpisodes },
    }));
    await this.prepareResponseAdmission(run);
    await this.awaitResume(run, true);
    this.current(run);
    const observed = this.service.observe(actorId);
    const visibleIds = [actorId, ...(observed?.visibleEntities.map((e) => e.id) ?? [])];
    const slotIds = [
      request.slots?.itemId,
      request.slots?.instrumentId,
      request.slots?.recipientId,
    ];
    const refs = [
      ...visibleIds,
      ...slotIds.filter(
        (ref): ref is string =>
          !!ref && actionReferencePermitted(this.service.world, actorId, visibleIds, ref),
      ),
    ];
    const commit = () =>
      this.service.transition(
        (world) => {
          this.current(run);
          return commitActorResponse(
            world,
            run.job.id,
            actorId,
            response,
            {},
            refs,
            request.expectedPlan,
            bindings,
          );
        },
        undefined,
        run.job.id,
      );
    const authorizedCommit = () =>
      run.job.authority
        ? this.service.authorized(run.job.authority, 'play', true, commit)
        : Promise.reject(new StopJob('stale', 'The action has no controlling authority.'));
    let result = await authorizedCommit();
    while (!result.ok && result.code === 'paused') {
      await this.awaitResume(run, true);
      this.current(run);
      result = await authorizedCommit();
    }
    const component = this.service.world.responseReceipts?.[run.job.id]?.components['action'];
    const fulfillment = bindings.find((b) => b.description === run.job.request.text)?.fulfillment;
    const message =
      component?.code === 'needs-confirmation'
        ? component.message
        : fulfillment?.verdict === 'partial'
          ? `${component?.message ?? result.message} Not fulfilled: ${fulfillment.omitted.map((o) => o.requirement).join('; ')}.`
          : (component?.message ?? result.message);
    await this.update(run, 'completed', message, { outcome: component ?? result, fulfillment });
  }

  async submitInteractive(
    kind: 'chat' | 'invention',
    id: string,
    text: string,
    npcId?: string,
    conversationId?: string,
    continuation?: InventionContinuation,
    candidate?: unknown,
    authority = this.service.localScope,
    volume: SpeechVolume = 'normal',
    mode?: 'workshop',
  ): Promise<ApiResult> {
    // Independent inference does not wait for remote reflection cancellation/cleanup.
    this.maintenance.cancel();
    if (this.running?.job.kind === 'thought') {
      await this.cancel(this.running.job.id);
      this.running = null;
    }
    return await this.submit(
      kind,
      id,
      text,
      npcId,
      undefined,
      conversationId,
      continuation,
      candidate,
      undefined,
      undefined,
      authority,
      volume,
      mode,
    );
  }

  async cancel(jobId: string, authority?: RequestScope): Promise<ApiResult> {
    if (authority) this.service.assertScope(authority);
    const run = this.running;
    if (
      !run ||
      run.job.id !== jobId ||
      (authority && run.job.authority?.accountId !== authority.accountId)
    )
      return { ok: false, code: 'not-running', message: 'That request is no longer running.' };
    if (!run.controller.signal.aborted) {
      run.cancelReason = 'Request cancelled.';
      await this.update(run, run.job.status, 'Cancelling request…');
      run.controller.abort();
    }
    return { ok: true, code: 'cancelling', message: 'Cancellation requested.', jobId };
  }

  async submit(
    kind: 'chat' | 'invention',
    id: string,
    text: string,
    npcId?: string,
    retryOf?: string,
    conversationId?: string,
    continuation?: InventionContinuation,
    candidate?: unknown,
    initiatingActor?: string,
    initiatingPolicyRevision?: number,
    authority?: RequestScope,
    volume: SpeechVolume = 'normal',
    mode?: 'workshop',
  ): Promise<ApiResult> {
    authority ??= initiatingActor ? undefined : this.service.localScope;
    const admit = async () => {
      if (authority) {
        id = `human:${digest({ account: authority.accountId, world: authority.worldId, id })}`;
        // Parent and retry IDs are opaque IDs already returned by the server.
      }
      if (mode && (kind !== 'invention' || initiatingActor))
        return {
          ok: false,
          code: 'invalid',
          message: 'Workshop mode is a player authoring surface.',
        };
      candidate = normalizeInventionProposal(candidate);
      if (authority) this.service.assertScope(authority, 'play', true);
      const inventorId = initiatingActor ?? authority!.actorId;
      if (
        initiatingActor &&
        (kind !== 'invention' ||
          this.service.world.entities[initiatingActor]?.actor?.controller !== 'npc')
      )
        return {
          ok: false,
          code: 'actor',
          message: 'Only a server-bound NPC may initiate private invention.',
        };
      if (
        candidate !== undefined &&
        (kind !== 'invention' ||
          JSON.stringify(candidate).length > 12000 ||
          (continuation && ['reuse', 'search'].includes(continuation.action)))
      )
        return {
          ok: false,
          code: 'invalid-declaration',
          message:
            'Supply a proposal of at most 12,000 characters for authoring, separately from reuse or search.',
        };
      let original: JobRecord | undefined;
      let spokenEventId: string | undefined;
      let targetHeard = true;
      if (retryOf) {
        original = await this.service.store.getJob(retryOf);
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
        const speech =
          this.service.worldEvent(original.playerSpeechEventId) ??
          (await this.service.store.history?.event(
            this.service.world.id,
            original.playerSpeechEventId,
          ));
        if (!speech || speech.actorId !== inventorId || speech.targetId !== original.request.npcId)
          return {
            ok: false,
            code: 'retry-unavailable',
            message: 'The original speech is not available to this player.',
          };
        kind = 'chat';
        text = original.request.text;
        volume = original.request.volume ?? 'normal';
        npcId = original.request.npcId;
      }
      const targetId =
        kind === 'chat' ? (npcId ?? this.service.defaultResidentEntityId) : undefined;
      const fingerprint = digest({
        kind,
        ...(kind === 'chat' ? { volume } : {}),
        text,
        targetId,
        worldId: this.service.world.id,
        actorId: inventorId,
        authority,
        conversationId,
        ...(retryOf ? { retryOf } : {}),
        ...(continuation ? { continuation } : {}),
        ...(candidate !== undefined ? { candidate } : {}),
        ...(mode ? { mode } : {}),
      });
      const previous = await this.service.store.getJob(id);
      if (previous)
        return previous.fingerprint === fingerprint
          ? {
              ok: !['failed', 'cancelled', 'stale'].includes(previous.status),
              code: previous.status,
              message: previous.message,
              jobId: id,
            }
          : {
              ok: false,
              code: 'idempotency-conflict',
              message: 'That request ID was already used for different input.',
            };
      let parent: JobRecord | undefined;
      if (continuation) {
        parent = await this.service.store.getJob(continuation.parentId);
        const scope = parent?.request.invention;
        if (
          kind !== 'invention' ||
          !scope ||
          !parent?.invention ||
          scope.actorId !== inventorId ||
          scope.worldId !== this.service.world.id ||
          scope.timelineId !== this.service.timelineId ||
          scope.conversationId !== conversationId ||
          !scope.rootId ||
          !Number.isInteger(scope.depth) ||
          ['queued', 'judging', 'generating'].includes(parent.status)
        )
          return {
            ok: false,
            code: 'stale',
            message:
              'This invention is unavailable or belongs to another character, conversation or save timeline.',
          };
        if (parent.invention.continuedBy)
          return {
            ok: false,
            code: 'already-continued',
            message: 'This request already has a follow-up. Refresh saved results.',
            jobId: parent.invention.continuedBy,
          };
        // Applying an already-funded ready draft adds no authoring turn or provider call.
        if (scope.depth >= 8 && continuation.action !== 'apply')
          return {
            ok: false,
            code: 'continuation-limit',
            message:
              'This invention has reached eight follow-ups. Start a new explicit request if you want to continue.',
          };
        const permission = inventionPermission(this.service.world, scope.authority);
        if (!permission.ok) return permission;
        if (continuation.action === 'apply') {
          if (
            mode ||
            candidate !== undefined ||
            parent.invention.code !== 'draft-ready' ||
            !parent.invention.candidate ||
            !continuation.candidateDigest ||
            continuation.candidateDigest !== parent.invention.candidateDigest ||
            text !== parent.request.text
          )
            return {
              ok: false,
              code: 'invalid',
              message: 'Apply the exact saved ready proposal, or revise it first.',
            };
          // The approved bytes and original authority come from storage, never the browser/model.
          // docs/architecture.md#invention-workshop-tools
          candidate = parent.invention.candidate;
        } else if (continuation.candidateDigest)
          return { ok: false, code: 'invalid', message: 'Only Apply accepts a candidate digest.' };
        if (['reuse', 'modify'].includes(continuation.action)) {
          const match = parent.invention.search?.matches.find(
            (entry) => entry.recipeId === continuation.recipeId,
          );
          const recipe = match && this.service.world.recipes[match.recipeId];
          if (
            !match ||
            !recipe ||
            digest(recipe.digest) !== match.digest ||
            recipe.version !== match.version ||
            !this.service.world.knowledge[scope.actorId]?.some(
              (entry) => entry.recipeId === recipe.id,
            )
          )
            return {
              ok: false,
              code: 'stale',
              message: 'The selected recipe is no longer available at that version. Search again.',
            };
        } else if (continuation.recipeId)
          return {
            ok: false,
            code: 'invalid',
            message: 'Only reuse or modification may select a recipe.',
          };
        if (
          ['reuse', 'modify', 'new', 'search'].includes(continuation.action) &&
          !['needs-choice', 'search-unavailable'].includes(parent.invention.code)
        )
          return {
            ok: false,
            code: 'invalid',
            message: 'This request is not waiting for a search choice.',
          };
        if (continuation.action === 'clarify' && parent.invention.code !== 'needs-clarification')
          return {
            ok: false,
            code: 'invalid',
            message: 'This request is not waiting for clarification.',
          };
      }
      // Capture origin before any paid routing; worker/model identity cannot change it.
      const priorCandidate = parent?.invention?.candidate ?? parent?.request.invention?.candidate;
      const invention: JobRecord['request']['invention'] =
        kind === 'invention'
          ? {
              rootId: parent?.request.invention?.rootId ?? id,
              ...(mode ? { mode } : {}),
              ...(parent?.request.invention?.episodeBudgetUsd !== undefined || mode
                ? {
                    episodeBudgetUsd:
                      parent?.request.invention?.episodeBudgetUsd ??
                      this.service.config.inventionWorkshopUsd,
                  }
                : {}),
              ...(candidate !== undefined ? { candidate } : {}),
              depth: parent ? parent.request.invention!.depth + 1 : 0,
              ...(continuation ? { continuation } : {}),
              ...(parent
                ? {
                    previous:
                      parent.invention?.search && parent.request.invention?.previous
                        ? parent.request.invention.previous
                        : {
                            intent: parent.request.text,
                            feedback: parent.message,
                            ...(priorCandidate !== undefined ? { candidate: priorCandidate } : {}),
                          },
                  }
                : {}),
              ...(continuation?.recipeId
                ? {
                    base: {
                      recipeId: continuation.recipeId,
                      version: this.service.world.recipes[continuation.recipeId]!.version,
                      digest: this.service.world.recipes[continuation.recipeId]!.digest,
                    },
                  }
                : continuation?.action !== 'new' && parent?.request.invention?.base
                  ? { base: parent.request.invention.base }
                  : {}),
              actorId: inventorId,
              worldId: parent?.request.invention?.worldId ?? this.service.world.id,
              timelineId: parent?.request.invention?.timelineId ?? this.service.timelineId,
              ...(conversationId ? { conversationId } : {}),
              authority: parent?.request.invention?.authority ?? {
                origin: initiatingActor ? ('agent' as const) : ('player' as const),
                policyRevision:
                  initiatingPolicyRevision ?? this.service.world.inventionPolicy.revision,
              },
            }
          : undefined;
      if (invention) {
        const permission = inventionPermission(this.service.world, invention.authority);
        if (!permission.ok) return permission;
      }
      if (original) {
        const latest = await this.service.store.getSpeechJob(original.playerSpeechEventId!);
        const receipt = this.service.world.responseReceipts?.[original.id];
        const applied =
          Object.values(receipt?.components ?? {}).some((component) => component.ok) ||
          this.service.world.events.some((event) => event.data?.['responseId'] === original!.id) ||
          (await this.service.store.history?.hasResponse(this.service.world.id, original.id));
        if (original.status !== 'failed' || latest?.id !== original.id || applied)
          return {
            ok: false,
            code: 'retry-unavailable',
            message: 'Only the latest failed response with no accepted effects can be retried.',
          };
        // A terminal workflow cannot commit late effects. Uncertain billing stays
        // reserved, but must not block a new, explicitly requested attempt.
      }
      if (this.service.paused && mode !== 'workshop')
        return {
          ok: false,
          code: 'paused',
          message: 'Resume the world before talking or inventing.',
        };
      if (
        !this.service.world.entities[inventorId]?.actor?.alive ||
        this.service.world.entities[inventorId]?.actor?.incapacitated
      )
        return {
          ok: false,
          code: 'actor',
          message:
            bodyPolicy(this.service.world)?.recovery?.refusalText ??
            'This body cannot act in its current condition.',
        };
      if (
        continuation?.action !== 'reuse' &&
        invention?.candidate === undefined &&
        !this.service.config.macrofoldKey &&
        (mode === 'workshop' ? !this.service.config.llmKey : !this.service.config.jevKey)
      )
        return {
          ok: false,
          code: 'unconfigured',
          message:
            kind === 'invention'
              ? 'Invention assistance is unavailable. The world owner can enable it; saved techniques and supplied proposals remain usable.'
              : 'Conversation assistance is unavailable. The world owner can enable it.',
        };
      if (this.running || this.stopped)
        return {
          ok: false,
          code: 'busy',
          message: 'Another request is already in progress. You can keep gathering and surviving.',
        };
      if (kind === 'chat') {
        const target = this.service.world.entities[targetId!];
        if (!target?.actor || target.actor.controller !== 'npc')
          return { ok: false, code: 'target', message: 'Choose a person to talk with.' };
        if (
          original &&
          (!target.actor.alive ||
            target.actor.incapacitated ||
            capabilityBlocked(this.service.world, target, 'speech'))
        )
          return {
            ok: false,
            code: 'actor-unavailable',
            message: `${target.name} cannot respond right now. Retry when they are awake and able to respond.`,
          };
        if (!original) {
          const spoken = await this.service.say(`${id}:player`, inventorId, text, targetId, volume);
          if (!spoken.ok) return spoken;
          for (let i = this.service.world.events.length - 1; i >= 0; i--) {
            const event = this.service.world.events[i]!;
            if (event.actorId === inventorId && event.data?.['utteranceId'] === `${id}:player`) {
              spokenEventId = event.id;
              break;
            }
          }
          targetHeard =
            !!spokenEventId &&
            !!this.service.world.experience?.awareness[targetId!]?.some(
              (entry) =>
                entry.eventId === spokenEventId &&
                entry.speech?.perception === 'heard' &&
                entry.speech.intelligibility !== 'none',
            );
        }
      }
      const job: JobRecord = {
        authority,
        id,
        kind,
        ...(invention ? { invention: { code: 'queued' } } : {}),
        fingerprint,
        status: targetHeard ? 'queued' : 'completed',
        ...(spokenEventId ? { playerSpeechEventId: spokenEventId } : {}),
        message:
          kind === 'chat'
            ? `${this.service.world.entities[targetId!]?.name ?? 'The person'} is considering your words.`
            : 'Checking known techniques and supported mechanisms.',
        request: {
          text,
          ...(kind === 'chat' ? { volume } : {}),
          ...(targetId ? { npcId: targetId } : {}),
          ...(invention ? { invention } : {}),
        },
        ...(original
          ? { retryOf: original.id, playerSpeechEventId: original.playerSpeechEventId }
          : {}),
        createdAt: Math.max(this.now(), (original?.createdAt ?? 0) + 1),
      };
      if (!targetHeard) {
        // The utterance committed normally; no paid interactive response gets nonexistent evidence.
        job.message = 'Spoken. No conversational reply was requested.';
        await this.service.store.putJob(job);
        this.service.notify();
        return { ok: true, code: 'spoken', message: job.message, jobId: id };
      }
      // Record the directed-speech cause in the shared intake for accounting. The autonomous path
      // skips this speech because it finds this turn's saved chat job, not because of this wake.
      if (kind === 'chat' && spokenEventId)
        this.thoughtWork.wake(targetId!, { reason: 'directed-speech' });
      if (parent && !(await this.service.store.claimInventionContinuation(job, parent.id)))
        return {
          ok: false,
          code: 'already-continued',
          message: 'This request already has a follow-up. Refresh saved results.',
        };
      await this.begin(job);
      return { ok: true, code: 'queued', message: job.message, jobId: id };
    };
    return this.admission(() =>
      authority ? this.service.authorized(authority, 'play', true, admit) : admit(),
    );
  }

  private async update(
    run: Running,
    status: JobRecord['status'],
    message: string,
    result?: unknown,
  ): Promise<void> {
    const terminal = ['completed', 'failed', 'cancelled', 'stale'].includes(status);
    run.job = {
      ...run.job,
      status,
      message,
      ...(terminal
        ? { completedAt: this.now(), totalLatencyMs: Math.max(0, this.now() - run.job.createdAt) }
        : {}),
      ...(result !== undefined ? { result } : {}),
    };
    await this.service.store.putJob(run.job);
    const scope = run.job.request.invention;
    if (
      terminal &&
      status === 'failed' &&
      scope?.authority.origin === 'agent' &&
      scope.worldId === this.service.world.id &&
      scope.timelineId === this.service.timelineId
    ) {
      await this.service.transition((world) =>
        scope.worldId === world.id && scope.timelineId === this.service.timelineId
          ? recordInventionFeedback(world, scope.actorId, run.job.id, message)
          : {
              world,
              events: [],
              outcome: {
                ok: false,
                code: 'stale',
                message: 'Feedback belongs to an earlier timeline.',
              },
            },
      );
    }
    if (terminal && run.ledger?.entries.length) {
      const used = new Set(run.ledger.entries.flatMap((entry) => entry.level ?? []));
      await this.log.record(
        `${run.job.id}:decision-accounting`,
        'Decision accounting',
        {
          limits: Object.fromEntries(
            [...used].map((level) => [`level${level}`, run.ledger!.limits[level]]),
          ),
        },
        { ...run.ledger.summary(), entries: run.ledger.entries },
      );
    }
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
        ...(terminal ? { completedAt: new Date().toISOString() } : {}),
      });
    this.service.notify();
  }

  private current(run: Running): void {
    if (
      this.stopped ||
      run.controller.signal.aborted ||
      (this.service.paused && run.job.kind === 'thought')
    )
      throw new StopJob(
        'cancelled',
        run.cancelReason ??
          (this.stopped
            ? 'This request was cancelled when the server closed.'
            : this.service.paused
              ? 'This request was cancelled when the game paused.'
              : 'This request was cancelled before completion.'),
      );
    if (run.job.authority && !this.service.currentScope(run.job.authority, 'play', true))
      throw new StopJob('stale', 'Control or access changed; no new effects were applied.');
    if (run.job.kind === 'invention') {
      const scope = run.job.request.invention!;
      if (
        scope.worldId !== this.service.world.id ||
        scope.timelineId !== this.service.timelineId ||
        (scope.authority.origin === 'player' &&
          (!run.job.authority || !this.service.currentScope(run.job.authority, 'play', true)))
      )
        throw new StopJob(
          'stale',
          'The invention belongs to an earlier world, character or save timeline.',
        );
      const permission = inventionPermission(
        this.service.world,
        run.job.request.invention?.authority,
      );
      if (!permission.ok) throw new StopJob('stale', permission.message);
    }
    const actorId =
      run.job.kind === 'invention'
        ? run.job.request.invention!.actorId
        : (run.job.request.npcId ?? this.service.defaultResidentEntityId);
    const actor = this.service.world.entities[actorId];
    if (run.generation !== this.service.generation || !actor?.actor?.alive)
      throw new StopJob('stale', 'The actor or world changed; the result was not applied.');
    if (
      run.job.kind === 'action' &&
      (actor.actor.incapacitated ||
        capabilityBlocked(this.service.world, actor, 'actions') ||
        run.job.request.action?.timelineId !== this.service.timelineId)
    )
      throw new StopJob('stale', 'The actor or action timeline changed.');
    const resident =
      this.service.world.entities[run.job.request.npcId ?? this.service.defaultResidentEntityId]
        ?.actor;
    if (
      run.job.kind === 'thought' &&
      resident &&
      (resident.incapacitated ||
        resident.capabilities?.cognition === false ||
        nativeProtectionReason(this.service.world, actorId))
    )
      throw new StopJob('stale', 'Native urgent needs superseded semantic work.');
    if (run.job.kind === 'invention' && this.service.world.entities[actorId]?.actor?.incapacitated)
      throw new StopJob('stale', 'The inventor became incapacitated; this result was not applied.');
  }

  private async begin(job: JobRecord, onCompleted?: () => Promise<void>): Promise<void> {
    job = {
      ...job,
      startedAt: this.now(),
      queueLatencyMs: Math.max(0, this.now() - job.createdAt),
    };
    const run: Running = {
      job,
      controller: new AbortController(),
      generation: this.service.generation,
      ...(job.kind === 'chat' || job.kind === 'thought'
        ? { ledger: new DecisionLedger(levelLimits(this.service.config)) }
        : {}),
    };
    if (job.kind === 'chat') run.playerSpeechEventId = job.playerSpeechEventId;
    if (run.playerSpeechEventId) job.playerSpeechEventId = run.playerSpeechEventId;
    this.running = run;
    await this.service.store.putJob(job);
    this.service.notify();
    await this.log.save({
      id: job.id,
      kind: 'Semantic trigger',
      ownerAccountId: job.authority?.accountId,
      worldId: this.service.world.id,
      actorId:
        job.kind === 'invention'
          ? job.request.invention!.actorId
          : (job.request.npcId ?? this.service.defaultResidentEntityId),
      actorName:
        this.service.world.entities[job.request.npcId ?? this.service.defaultResidentEntityId]
          ?.name,
      trigger: job.diagnosticTrigger ?? job.request.text,
      triggerType:
        job.diagnosticTriggerType ??
        (job.kind === 'chat'
          ? 'Player speech'
          : job.kind === 'invention'
            ? 'Player invention request'
            : 'Autonomous cognition'),
      gameTime: this.service.world.simTime,
      startedAt: new Date().toISOString(),
      status: 'running',
      disposition: 'queued',
      // The readable trigger stays concise; raw inspection retains the exact stimulus.
      input: {
        policy: COGNITION_VERSION,
        offeredRoutes: [0, 1, 2, 3, 4, 5],
        stimulus: job.request.text,
      },
      exchanges: [],
    });
    const pending = this.log
      .withTrigger(job.id, async () => await this.process(run))
      .then(async () => {
        if (run.job.status !== 'completed' || !onCompleted) return;
        try {
          await onCompleted();
        } catch (error) {
          this.service.storageError =
            'A completed cognition result could not advance its durable trigger cursor; simulation is paused to prevent duplicate behavior.';
          await this.log.record(`${run.job.id}:cursor`, 'Trigger cursor failure', {
            reason: error instanceof Error ? error.message : 'Unknown persistence failure',
          });
        }
      })
      .catch((error) =>
        this.log.withTrigger(job.id, async () => {
          const known = error instanceof StopJob;
          const cancelled = run.controller.signal.aborted;
          if (run.job.request.invention)
            run.job.invention = {
              ...run.job.invention,
              code:
                error instanceof InventionFailure
                  ? error.code
                  : run.job.invention?.code &&
                      !['queued', 'candidate'].includes(run.job.invention.code)
                    ? run.job.invention.code
                    : known
                      ? error.status
                      : cancelled
                        ? 'cancelled'
                        : 'failed',
            };
          await this.log.record(`${run.job.id}:failure`, 'Workflow failure', {
            reason: error instanceof Error ? error.message : 'Unknown failure',
          });
          await this.update(
            run,
            known ? error.status : cancelled ? 'cancelled' : 'failed',
            known || error instanceof InventionFailure || error instanceof ContextBudgetError
              ? error.message
              : cancelled
                ? (run.cancelReason ?? 'The request was cancelled before completion.')
                : 'The workflow failed safely. No automatic paid retry was sent.',
            // Invention results keep their own code; decisions record the distinct outcome.
            run.job.kind === 'invention'
              ? undefined
              : known && error.outcome
                ? { disposition: error.outcome, ...(run.level1 ? { level1: run.level1 } : {}) }
                : error instanceof ContextBudgetError
                  ? {
                      disposition: 'context-exceeded',
                      ...(run.level1 ? { level1: run.level1 } : {}),
                    }
                  : undefined,
          );
        }),
      )
      .finally(async () => {
        try {
          if (this.running === run) {
            this.running = null;
          }

          this.service.notify();
          // A fresh explicit actor choice may submit once; recovery never replays this dispatch.
          // docs/architecture.md#shared-invention-workflow
          const proposal = run.actorInvention;
          if (
            proposal &&
            !this.stopped &&
            !run.controller.signal.aborted &&
            run.generation === this.service.generation
          ) {
            await this.submitActorInvention(
              proposal.actorId,
              `${run.job.id}:invention`,
              proposal.purpose,
              proposal.candidate,
              proposal.parentId,
              proposal.policyRevision,
            );
          }
        } catch {
          this.service.storageError =
            'An actor invention dispatch could not be recorded; simulation is paused to prevent uncertain work from being repeated.';
        } finally {
          // Keep dispatch tracked until its child is registered; idle/close must not race it.
          this.pendingWork.delete(pending);
        }
      });
    this.pendingWork.add(pending);
  }

  /** Explicit player requests survive a simulation pause. Never start another paid
   * stage or commit effects until resumed; shutdown still cancels the wait. */
  private async awaitResume(run: Running, responseReady = false): Promise<void> {
    if (!this.service.paused || run.job.kind === 'thought') return;
    if (this.stopped || run.controller.signal.aborted) this.current(run);
    await this.update(
      run,
      run.job.status,
      responseReady
        ? 'Response ready. Resume the game to continue.'
        : 'Game paused. Resume to continue your request.',
    );
    await new Promise<void>((resolve, reject) => {
      const signal = run.controller.signal;
      let unsubscribe = () => {};
      const cleanup = () => {
        unsubscribe();
        signal.removeEventListener('abort', cancelled);
      };
      const cancelled = () => {
        cleanup();
        reject(
          new StopJob(
            'cancelled',
            run.cancelReason ?? 'The server closed before this request could finish.',
          ),
        );
      };
      const changed = () => {
        if (this.stopped || signal.aborted) {
          cancelled();
          return;
        }
        if (!this.service.paused) {
          cleanup();
          resolve();
        }
      };
      unsubscribe = this.service.subscribe(changed);
      signal.addEventListener('abort', cancelled, { once: true });
      changed();
    });
    this.current(run);
  }

  private async call<T>(
    run: Running,
    provider: 'jev' | 'openai',
    suffix: string,
    dispatch: (requestId: string) => Promise<AiResult<T>>,
    meter?: Meter,
  ): Promise<T> {
    if (this.service.paused && run.job.request.invention?.mode !== 'workshop')
      await this.awaitResume(run);
    this.current(run);
    const id = `${run.job.id}:${suffix}`;
    const config = this.service.config;
    // Conservative bounds use request UTF-8 bytes as an upper token proxy, plus output ceiling.
    // Exact provider invoices remain external; custom prices must match the selected model.
    const reserve = decisionAllowance(config, provider, meter?.model);
    // A decision's own level work stays within that level's per-decision limits.
    // docs/limits/cognition.md#cg08
    const category =
      meter?.category ?? (/classify|interpret/.test(suffix) ? 'grounding' : 'preparation');
    const admitted = run.ledger?.admit(category, meter?.level, reserve);
    if (admitted && !admitted.ok)
      throw new StopJob(
        'failed',
        `${admitted.reason} No further paid request was sent.`,
        'budget-exhausted',
      );
    if (
      !(await this.service.store.reserve(
        id,
        provider,
        reserve,
        config.budgetUsd,
        run.job.kind === 'invention'
          ? run.job.request.invention!.actorId
          : (run.job.request.npcId ?? this.service.defaultResidentEntityId),
        undefined,
        inventionAttemptBudget(this.service, run.job.request.invention),
      ))
    )
      throw new StopJob(
        'failed',
        'Your usage allowance is used up. Existing actions and learned recipes still work.',
        'budget-exhausted',
      );
    run.ledger?.record({
      requestId: id,
      stage: suffix,
      category,
      ...(meter?.level ? { level: meter.level } : {}),
      provider,
      size: meter?.size ?? { instructions: 0, context: 0, schema: 0 },
      reservedUsd: reserve,
    });
    await this.update(
      run,
      provider === 'jev' ? 'judging' : 'generating',
      provider === 'jev'
        ? 'Jev is checking the bounded route.'
        : run.job.kind === 'invention'
          ? 'Generating a new material-and-mechanism definition.'
          : 'Ada is thinking. Detailed responses may take about a minute.',
    );
    const result = await dispatch(id);
    const accountingStartedAt = new Date().toISOString();
    result.receipt = normalizeReceiptCost(result.receipt);
    await this.service.store.settle(id, result.receipt);
    run.ledger?.settle(id, result.receipt, result.outcome);
    await this.log.record(
      `${id}:accounting`,
      'Accounting',
      { provider, requestId: result.receipt.requestId },
      { settled: true, receipt: result.receipt },
      accountingStartedAt,
    );
    if (result.outcome !== 'value' && run.job.request.invention)
      run.job.invention = {
        ...run.job.invention,
        code: result.receipt.completionUncertain ? 'uncertain' : result.outcome,
      };
    if (
      result.outcome === 'value' &&
      this.service.paused &&
      run.job.request.invention?.mode !== 'workshop'
    )
      await this.awaitResume(run, true);
    if (run.cancelReason) throw new StopJob('cancelled', run.cancelReason);
    // Surface actual provider failures even when an explicit request is paused.
    if (result.outcome === 'value' || !this.service.paused || run.job.kind === 'thought')
      this.current(run);
    if (result.outcome !== 'value')
      throw new StopJob(
        result.outcome === 'cancelled' ? 'cancelled' : 'failed',
        `${provider === 'jev' ? 'Jev' : 'Language model'} returned ${result.outcome}: ${result.reason}. No world effect or automatic retry followed.`,
        // An adapter may report a dispatched, unknown completion as failed; the receipt decides.
        result.outcome !== 'cancelled' && result.receipt.completionUncertain
          ? 'uncertain'
          : result.outcome,
      );
    if (provider === 'openai') run.generatedBy = result.receipt.model;
    return result.value;
  }

  /** Translate the one binding chosen by `resolveLevel1` into an ordinary response for the
   * shared admission path; selection itself grants no authority. */
  private selectKnownAction(
    prepared: Awaited<ReturnType<typeof prepareDecision>>,
    selected: string,
  ): ActorResponse {
    if (prepared.binding.actions[selected] === null) return { operations: [] };
    const steps = prepared.knownPlans[selected];
    // Choosing a new alternative interrupts the chosen plan. The separately
    // offered continue option leaves its remaining work untouched.
    const mode = prepared.replaceChosenPlan ? 'replace' : 'enqueue';
    if (steps)
      return {
        operations: [
          {
            note: null,
            name: null,
            localId: 'sequence',
            requiresAccepted: [],
            talk: null,
            think: null,
            goal: null,
            act: null,
            plan: {
              mode,
              expectedRevision: prepared.expectedPlanRevision,
              goalId: null,
              steps: steps.map((actionId) => ({ actionId, itemFromStep: null, useItemAs: null })),
            },
          },
        ],
      };
    return actionResponse({
      kind: 'known',
      mode,
      actionId: selected,
      verb: null,
      targetEntityId: null,
      description: null,
    });
  }

  private async generate<T>(
    run: Running,
    request: Omit<GenerateRequest, 'requestId' | 'signal'>,
    operation = 'generate',
    meter: Omit<Meter, 'size'> = {
      category: /interpret/.test(operation) ? 'grounding' : 'preparation',
    },
  ): Promise<T> {
    if (
      this.service.config.jevOnly ||
      (this.executionSource === 'live-model' &&
        !this.service.config.macrofoldKey &&
        !this.service.config.llmKey)
    )
      throw new StopJob(
        'failed',
        'Generation is unavailable; Jev decisions and native actions remain available.',
        'unavailable',
      );
    if (
      request.execution === 'full' &&
      this.executionSource === 'live-model' &&
      !this.service.config.macrofoldKey
    )
      throw new StopJob(
        'failed',
        'Full deliberation requires the configured Macrofold harness.',
        'unavailable',
      );
    return await this.call(
      run,
      'openai',
      operation,
      async (id) =>
        await this.client.generate<T>({
          ...request,
          requestId: id,
          signal: run.controller.signal,
          maxOutputTokens:
            request.maxOutputTokens ??
            (this.service.config.macrofoldKey ? cognitionOutputTokens(request.execution) : 1800),
        }),
      {
        ...meter,
        model: request.model ?? this.service.config.llmModel,
        size: {
          instructions: textBytes(request.instructions),
          context: textBytes(request.context),
          schema: textBytes(request.schema),
        },
      },
    );
  }

  private async process(run: Running): Promise<void> {
    if (run.job.kind === 'action') return await this.playerAction(run);
    if (run.job.kind === 'invention') return await this.invent(run);
    if (run.job.kind === 'thought') return await this.think(run);
    return await this.decide(run, true);
  }

  private responseInterruptions(actorId: string, afterSequence: number): ResponseInterruption[] {
    const awareness = this.service.world.experience?.awareness[actorId] ?? [];
    const interruptions: ResponseInterruption[] = [];
    for (let index = awareness.length - 1; index >= 0; index--) {
      const entry = awareness[index]!;
      if (entry.sequence <= afterSequence) break;
      if (
        entry.importance < RESPONSE_INTERRUPTION.importance ||
        (entry.urgency ?? 0) < RESPONSE_INTERRUPTION.urgency
      )
        continue;
      interruptions.push({
        eventId: entry.eventId,
        sequence: entry.sequence,
        importance: entry.importance,
        urgency: entry.urgency ?? 0,
        triggerKind: entry.triggerKind,
        text: entry.text,
      });
    }
    return interruptions.reverse();
  }

  private async retrySupersededResponse(
    run: Running,
    speech: boolean,
    attempt: number,
    previousEvidenceIds: string[],
    interruptions: ResponseInterruption[],
  ): Promise<void> {
    const watch = run.responseWatch;
    const completeInterruptions = [
      ...new Map(
        [
          ...interruptions,
          ...(watch ? this.responseInterruptions(watch.actorId, watch.afterSequence) : []),
        ].map((entry) => [entry.eventId, entry]),
      ).values(),
    ].sort((a, b) => a.sequence - b.sequence);
    await this.log.record(`${run.job.id}:attempt:${attempt}:superseded`, 'Generation superseded', {
      threshold: RESPONSE_INTERRUPTION,
      interruptions: completeInterruptions,
      decision: 'retry once with the interrupting triggers included',
    });
    run.responseWatch = undefined;
    run.supersession = undefined;
    if (run.controller.signal.aborted) run.controller = new AbortController();
    await this.decide(run, speech, attempt + 1, [
      ...new Set([...previousEvidenceIds, ...completeInterruptions.map((entry) => entry.eventId)]),
    ]);
  }

  private async decide(
    run: Running,
    speech: boolean,
    attempt = 0,
    interruptionEvidenceIds: string[] = [],
  ): Promise<void> {
    try {
      await this.decideAttempt(run, speech, attempt, interruptionEvidenceIds);
    } catch (error) {
      const supersession = run.supersession;
      if (
        attempt === 0 &&
        supersession?.attempt === attempt &&
        !run.cancelReason &&
        !this.stopped &&
        !(this.service.paused && run.job.kind === 'thought')
      ) {
        await this.retrySupersededResponse(
          run,
          speech,
          attempt,
          interruptionEvidenceIds,
          supersession.interruptions,
        );
        return;
      }
      throw error;
    } finally {
      if (run.responseWatch?.attempt === attempt) run.responseWatch = undefined;
    }
  }

  private async decideAttempt(
    run: Running,
    speech: boolean,
    attempt: number,
    interruptionEvidenceIds: string[],
  ): Promise<void> {
    const actorId = run.job.request.npcId ?? this.service.defaultResidentEntityId;
    // An urgent refresh decides again; an earlier attempt's level-1 outcome no longer applies.
    run.level1 = undefined;
    // A known spending shortfall cannot produce a decision. Skip retrieval and its
    // source flushes; the paid call still performs the authoritative reservation.
    // Display totals are invalidated by accounting writes and month rollover.
    const { budget } = await this.service.store.usage(this.service.config.budgetUsd);
    const account = budget.accounts?.[actorId];
    if (
      (account?.spentUsd ?? 0) +
        (account?.reservedUsd ?? 0) +
        decisionAllowance(this.service.config, 'jev') >
      budget.limitUsd
    )
      throw new StopJob(
        'failed',
        'Your usage allowance is used up. Existing actions and learned recipes still work.',
        'budget-exhausted',
      );

    run.responseWatch = {
      actorId,
      afterSequence: (this.service.world.experience?.awareness[actorId] ?? []).reduce(
        (maximum, entry) => Math.max(maximum, entry.sequence),
        0,
      ),
      attempt,
    };
    const evidenceIds = [
      ...(run.playerSpeechEventId
        ? [run.playerSpeechEventId]
        : (run.job.stimulusEvidenceIds ?? [])),
      ...interruptionEvidenceIds,
    ];
    // A single cause explains why this decision runs; coalesced evidence stays in context.
    // docs/memory-architecture.md#every-semantic-decision-uses-an-event-or-intent-sentence
    const triggerEvidenceId =
      interruptionEvidenceIds.at(-1) ?? run.playerSpeechEventId ?? run.job.triggerEvidenceId;
    const evidence = await this.service.awarenessEvidence(actorId, [
      ...evidenceIds,
      ...(triggerEvidenceId ? [triggerEvidenceId] : []),
    ]);
    this.current(run);
    if (
      run.job.kind === 'chat' &&
      !evidence.some(
        (entry) =>
          entry.eventId === run.playerSpeechEventId &&
          entry.speech?.perception === 'heard' &&
          entry.speech.intelligibility !== 'none',
      )
    )
      throw new StopJob(
        'stale',
        'The original intelligible speech evidence is no longer available.',
      );
    const stimulus = responseTrigger(
      this.service,
      actorId,
      triggerEvidenceId,
      run.job.kind === 'chat' ? 'Speech evidence unavailable.' : run.job.request.text,
      evidence,
    );
    const addressedSpeech = evidenceIds.some((id) =>
      evidence.some((entry) => entry.eventId === id && entry.triggerKind === 'addressed_speech'),
    );
    const speechTrigger = evidenceIds.some((id) =>
      evidence.some(
        (entry) =>
          entry.eventId === id && entry.eventType === 'speech' && entry.modality !== 'observed',
      ),
    );
    let attentionCall = 0;
    const contextStartedAt = new Date().toISOString();
    let prepared = await prepareDecision(
      this.service,
      this.recall,
      actorId,
      run.job.id,
      stimulus,
      evidenceIds,
      async (request) =>
        await this.call(
          run,
          'jev',
          `attempt:${attempt}:attention:${attentionCall++}`,
          async (id) =>
            await this.client.judge({ ...request, requestId: id, signal: run.controller.signal }),
          judgeMeter('level', request),
        ),
      run.controller.signal,
      this.service.config.budgetUsd,
      speech,
      attempt,
      triggerEvidenceId,
      this.service.config.jevOnly
        ? undefined
        : (request, operation) => this.generate<unknown>(run, request, operation),
    );
    this.current(run);
    await this.log.record(
      `${run.job.id}:attempt:${attempt}:context`,
      'Context and retrieval',
      prepared.diagnostics,
      prepared.prompt,
      contextStartedAt,
    );
    const retryForUrgentAwareness = async () => {
      if (attempt > 0) return false;
      const interruptions =
        run.supersession?.attempt === attempt
          ? run.supersession.interruptions
          : this.responseInterruptions(actorId, prepared.awarenessSequence);
      if (!interruptions.length) return false;
      await this.retrySupersededResponse(
        run,
        speech,
        attempt,
        interruptionEvidenceIds,
        interruptions,
      );
      return true;
    };
    if (await retryForUrgentAwareness()) return;
    const policy = this.service.world.cognitionPolicy;
    const generationAvailable =
      !this.service.config.jevOnly &&
      !!(this.service.config.macrofoldKey || this.service.config.llmKey);
    const questions = decisionQuestions(
      addressedSpeech,
      policy.maxImmediateLevel,
      speechTrigger,
      generationAvailable,
    );
    const routeQuestion = questions['route'];
    if (!routeQuestion || routeQuestion.type !== 'choice') throw new Error('Missing route rubric.');
    const criteria = routeQuestion.criteria;
    const requestFamilies = requestRoutes(
      prepared.activityRequests.requests,
      prepared.activityRequests.choices,
    );
    for (const [key, descriptor] of requestFamilies)
      criteria[key] = activityRouteCriterion(descriptor);
    const offeredRoutes = Object.keys(criteria);
    const judge =
      (suffix: string) =>
      async (request: Omit<JudgeRequest, 'requestId' | 'signal'>): Promise<JudgeValue> =>
        await this.call(
          run,
          'jev',
          `attempt:${attempt}:${suffix}`,
          async (id) =>
            await this.client.judge({ ...request, requestId: id, signal: run.controller.signal }),
          judgeMeter('level', request),
        );
    // Refresh cheap feasibility after earlier provider latency, then bound candidates.
    const prepareActionBindings = async () => {
      const refreshed = refreshDecisionActions(this.service, prepared);
      const retrieval = await retrieveActions(
        this.service,
        this.log,
        actorId,
        `${run.job.id}:attempt:${attempt}`,
        `${currentGoal(this.service.world.entities[actorId]!.actor!)}\n${stimulus}`,
        refreshed.actionCandidates,
        run.controller.signal,
        async () => {
          await this.awaitResume(run);
          this.current(run);
        },
      );
      this.current(run);
      return { prepared: { ...refreshed, actionCandidates: retrieval.candidates }, retrieval };
    };
    // Generation after rated candidates reuses those ratings at the relevance line rather
    // than buying a second relevance judgment; no request is dispatched here.
    const offerRated = async (base: typeof prepared, answers: Record<string, JudgmentAnswer>) =>
      await selectDecisionActions(base, async () => ({ answers }), 'actions');
    // Level-1 bindings must exist before the question that selects them. Non-speech triggers
    // always consider actions, so their bindings are prepared first and rated in the routing
    // request. Route, reflection and per-action ratings are independent questions; a request
    // over Jev's size limits falls back to the dependent second request before any dispatch.
    // archive/07-technical-architecture/agent-agency-runtime.md#24-level-1-selection-without-generative-escalation
    let combined:
      | {
          routing: JudgeValue;
          base: typeof prepared;
          selected: Awaited<ReturnType<typeof selectDecisionActions>>;
          offered: ReturnType<typeof offeredForRating>;
          retrieval: Awaited<ReturnType<typeof retrieveActions>>;
          startedAt: string;
        }
      | undefined;
    const routingStartedAt = new Date().toISOString();
    let earlyBindings: Awaited<ReturnType<typeof prepareActionBindings>> | undefined;
    if (!speechTrigger) {
      const bindings = (earlyBindings = await prepareActionBindings());
      // Written by the rating callback; a holder avoids stale control-flow narrowing.
      const captured: { routing?: JudgeValue; offered: ReturnType<typeof offeredForRating> } = {
        offered: [],
      };
      try {
        const selected = await selectDecisionActions(
          bindings.prepared,
          async (request) => {
            captured.offered = offeredForRating(request);
            const all = { ...request.questions, ...questions };
            validateJudgmentSize(request.state, all);
            const answers = (await judge('route')({ state: request.state, questions: all }))
              .answers;
            captured.routing = {
              answers: Object.fromEntries(
                Object.keys(questions).flatMap((key) => {
                  const answer = answers[key];
                  return answer ? [[key, answer]] : [];
                }),
              ),
            };
            return {
              answers: Object.fromEntries(
                Object.entries(answers).filter(([key]) => !Object.hasOwn(questions, key)),
              ),
            };
          },
          'choose-action',
        );
        if (captured.routing)
          combined = {
            routing: captured.routing,
            base: bindings.prepared,
            selected,
            offered: captured.offered,
            retrieval: bindings.retrieval,
            startedAt: routingStartedAt,
          };
      } catch (error) {
        // Only the pre-dispatch size check falls back; provider outcomes stop the job.
        if (!(error instanceof InvalidData) || captured.routing) throw error;
      }
    }
    const judged =
      combined?.routing ?? (await judge('route')({ state: prepared.prompt, questions }));
    if (await retryForUrgentAwareness()) return;
    const routeAnswer = judged.answers['route'];
    // Routing spends a bounded allowance; it does not authorize a world effect.
    // Use the winning probability, not the provider's separate confidence score.
    const routeProbability =
      routeAnswer && 'choice' in routeAnswer
        ? (routeAnswer.probabilities[routeAnswer.choice] ?? 0)
        : 0;
    const selectedRoute =
      routeAnswer && 'choice' in routeAnswer && routeProbability >= 0.5 ? routeAnswer.choice : null;
    // Uncertain escalation must not silence an addressed ordinary reply.
    const route =
      generationAvailable && addressedSpeech && selectedRoute === 'native'
        ? 'level2'
        : (selectedRoute ?? (generationAvailable && addressedSpeech ? 'level2' : null));
    const routeReason = !selectedRoute
      ? route
        ? 'Uncertain route; addressed speech defaults to level 2.'
        : 'Uncertain route; the decision is deferred.'
      : route !== selectedRoute
        ? 'Addressed speech overrides a native route with an ordinary reply.'
        : `Jev chose ${selectedRoute === 'native' ? 'native behavior' : selectedRoute.replace(/^level(\d)$/, 'level $1')} with probability ${routeProbability.toFixed(2)}.`;
    const actionGate = judged.answers['possibleAction'];
    const shouldOfferActions =
      !speechTrigger ||
      !actionGate ||
      !('choice' in actionGate) ||
      actionGate.choice === 'yes' ||
      (actionGate.probabilities['no'] ?? 0) < 0.8;
    // This trigger property opens optional action selection; it is not an action decision.
    const semanticTrigger = speechTrigger
      ? {
          kind: 'speech' as const,
          checkActionSelection: shouldOfferActions,
          gateAnswer: actionGate,
          conservativeNoThreshold: 0.8,
        }
      : {
          kind: 'event' as const,
          checkActionSelection: true,
          reason: 'non-speech semantic decision',
        };
    const selectionMode = combined ? 'combined' : 'dependent';
    if (generationAvailable && policy.reflection && choice(judged.answers['reflection']) === 'yes')
      await this.maintenance.enqueue(actorId, run.job.id, stimulus);
    await this.log.record(
      `${run.job.id}:attempt:${attempt}:routing`,
      'Semantic decision',
      {
        offeredRoutes: criteria,
        fallback: !selectedRoute && addressedSpeech ? 'level2: uncertain escalation' : null,
        policyRevision: policy.revision,
        questionVersion: JEV_QUESTIONS_VERSION,
        trigger: semanticTrigger,
        selectionRequest: selectionMode,
        // Policy results that shaped the offered routes; not model explanations.
        nativeGates: {
          generationAvailable,
          jevOnly: this.service.config.jevOnly,
          maxImmediateLevel: policy.maxImmediateLevel,
          reflectionPolicy: policy.reflection,
          addressedSpeech,
          speechTrigger,
          actionSelection: semanticTrigger.checkActionSelection,
        },
      },
      { ...judged, selectedRoute, route: route ?? null, reason: routeReason },
      routingStartedAt,
    );
    const trace = this.log.get(run.job.id);
    if (trace)
      await this.log.save({
        ...trace,
        route: route ?? 'deferred',
        input: {
          ...(trace.input && typeof trace.input === 'object' ? trace.input : {}),
          offeredRoutes,
        },
      });
    if (await retryForUrgentAwareness()) return;
    if (!route || !Object.hasOwn(criteria, route) || route === 'native') {
      run.responseWatch = undefined;
      await this.update(
        run,
        'completed',
        route === 'native'
          ? 'Native behavior continues; no model response.'
          : 'Semantic decision deferred: uncertain route.',
        {
          disposition: route === 'native' ? 'native' : 'deferred',
          trigger: semanticTrigger,
        },
      );
      return;
    }
    let requestedActivity: ActorResponse | undefined;
    const chosenFamily = requestFamilies.get(route);
    if (chosenFamily) {
      await prepared.validateConversation();
      const selectedWorld = this.service.world;
      let parameterRound = 0;
      requestedActivity = await chooseActivityRequest({
        descriptor: chosenFamily,
        choices: prepared.activityRequests.choices,
        simTime: selectedWorld.simTime,
        namedDeadlines: namedClockTimes(selectedWorld).map((name) => ({
          name,
          at: clockDeadline(selectedWorld, name)!,
        })),
        state: prepared.prompt,
        judge: (request) => judge(`activity-parameters:${parameterRound++}`)(request),
      });
      this.current(run);
      if (!requestedActivity) {
        run.responseWatch = undefined;
        await this.update(
          run,
          'completed',
          'The optional activity was declined or its parameters remained uncertain. No activity started.',
          {
            disposition: 'deferred',
            trigger: semanticTrigger,
          },
        );
        return;
      }
      await this.log.record(
        `${run.job.id}:attempt:${attempt}:activity-parameters`,
        'Chosen activity parameters',
        { family: chosenFamily.id },
        requestedActivity,
      );
    }
    let actionAnswers: Record<string, JudgmentAnswer> = {};
    let offeredForSelection: ReturnType<typeof offeredForRating> = [];
    // Candidates before the level-1 threshold filter, for offering rated actions to generation.
    let ratedBase: typeof prepared | undefined;
    if (!requestedActivity && semanticTrigger.checkActionSelection) {
      const actionsStartedAt = combined?.startedAt ?? new Date().toISOString();
      let withActions: Awaited<ReturnType<typeof selectDecisionActions>>;
      let retrieval: Awaited<ReturnType<typeof retrieveActions>>;
      if (combined) {
        retrieval = combined.retrieval;
        ratedBase = combined.base;
        offeredForSelection = combined.offered;
        actionAnswers = combined.selected.diagnostics.actionSelection.answers;
        withActions =
          route === 'level1' ? combined.selected : await offerRated(combined.base, actionAnswers);
      } else {
        // An oversized combined request already prepared bindings; admission rechecks them.
        const bindings = earlyBindings ?? (await prepareActionBindings());
        retrieval = bindings.retrieval;
        ratedBase = bindings.prepared;
        try {
          withActions = await selectDecisionActions(
            bindings.prepared,
            async (request) => {
              offeredForSelection = offeredForRating(request);
              return await judge('action-attention')(request);
            },
            route === 'level1' ? 'choose-action' : 'actions',
          );
          actionAnswers = withActions.diagnostics.actionSelection.answers;
        } catch (error) {
          // Level-1 ratings are the decision itself: a provider failure is reported with its
          // outcome, never converted into a deferral or an escalation.
          if (
            route === 'level1' ||
            run.controller.signal.aborted ||
            run.cancelReason ||
            run.supersession
          )
            throw error;
          withActions = fallbackDecisionActions(
            bindings.prepared,
            error instanceof Error ? error.message : 'Action relevance unavailable',
          );
        }
      }
      prepared = withActions;
      await this.log.record(
        `${run.job.id}:attempt:${attempt}:action-context`,
        'Action context',
        {
          actionSelection: withActions.diagnostics.actionSelection,
          retrieval: {
            status: retrieval.status,
            eligible: retrieval.eligible,
            returned: retrieval.candidates.length,
          },
          trigger: semanticTrigger,
          selectionRequest: selectionMode,
        },
        prepared.offered,
        actionsStartedAt,
      );
      if (await retryForUrgentAwareness()) return;
    }
    let executedRoute: string = route;
    let level1: Level1Resolution | undefined;
    if (route === 'level1') {
      const startedAt = new Date().toISOString();
      const chosenPrepared = prepared;
      level1 = resolveLevel1({
        offered: offeredForSelection,
        answers: actionAnswers,
        isContinue: (handle) => chosenPrepared.binding.actions[handle] === null,
        escalation: generationAvailable
          ? { available: true, level: escalationLevel(routeAnswer, offeredRoutes) }
          : { available: false, blocked: 'generation-unavailable' },
      });
      run.level1 = level1.outcome;
      await this.log.record(
        `${run.job.id}:attempt:${attempt}:level1`,
        'Level-1 selection',
        {
          policy: LEVEL1_POLICY,
          selectionRequest: selectionMode,
          ratings: level1.ratings,
          ignoredAnswers: level1.ignored,
        },
        { outcome: level1.outcome, message: level1Message(level1.outcome) },
        startedAt,
      );
      if (level1.outcome.kind === 'defer') {
        run.responseWatch = undefined;
        await this.update(run, 'completed', level1Message(level1.outcome), {
          disposition: 'deferred',
          reason: level1.outcome.reason,
          level1: level1.outcome,
          trigger: semanticTrigger,
        });
        return;
      }
      if (level1.outcome.kind === 'escalate') {
        executedRoute = `level${level1.outcome.level}`;
        if (ratedBase) {
          const offered = await offerRated(ratedBase, actionAnswers);
          prepared = offered;
          // The actions generation actually receives, for inspection and response summaries.
          await this.log.record(
            `${run.job.id}:attempt:${attempt}:action-context:escalated`,
            'Action context',
            {
              actionSelection: offered.diagnostics.actionSelection,
              escalation: { level: level1.outcome.level, relevanceLine: 0.5 },
              selectionRequest: selectionMode,
            },
            offered.offered,
          );
        }
        const escalated = this.log.get(run.job.id);
        if (escalated) await this.log.save({ ...escalated, route: `level1→${executedRoute}` });
      }
    }
    const level = executedRoute === 'level4' ? 4 : executedRoute === 'level3' ? 3 : 2;
    const limits = LEVEL_LIMITS[level];
    const c = this.service.config;
    const actorInvention =
      executedRoute === 'level1' || requestedActivity
        ? { enabled: false, policyRevision: 0, schema: z.null(), instructions: '', context: '' }
        : await prepareActorInvention(this.service, actorId);
    const baseSchema = boundResponseSchema(
      Object.keys(prepared.entityReferences),
      Object.keys(prepared.binding.actions),
      {
        speech: canSpeak(this.service.world.entities[actorId]),
        expressions: supportsManualWork(this.service.world.entities[actorId]),
      },
      Object.keys(prepared.binding.knowledgeReferences ?? {}),
      namedClockTimes(this.service.world),
      activityRequestDescriptors(this.service.world),
    );
    const schema = actorInvention.enabled
      ? baseSchema.extend({ invention: actorInvention.schema })
      : baseSchema;
    const instructions = `${RESPONSE_INSTRUCTIONS} ${actorInvention.instructions}`;
    const context = `${prepared.prompt}\n${actorInvention.context}`;
    // Private proposal context shares the existing total bound; it does not buy a larger prompt.
    if (Buffer.byteLength(instructions) + Buffer.byteLength(context) > CONTEXT_BYTE_LIMIT)
      throw new ContextBudgetError();
    await prepared.validateConversation();
    const selectedHandle =
      level1?.outcome.kind === 'act' || level1?.outcome.kind === 'continue'
        ? level1.outcome.handle
        : undefined;
    const levelLimit = levelLimits(c)[level];
    const responseSchema = z.toJSONSchema(schema, { target: 'draft-7' });
    let value: unknown;
    if (requestedActivity) value = requestedActivity;
    else if (executedRoute === 'level1') {
      if (selectedHandle === undefined) throw new Error('Level 1 reached admission unselected.');
      value = this.selectKnownAction(prepared, selectedHandle);
    } else
      try {
        // Schemas count toward the level input allowance, separately from context.
        if (textBytes(responseSchema) > levelLimit.schemaBytes)
          throw new ContextBudgetError(
            `The level ${level} response schema exceeds its ${levelLimit.schemaBytes}-byte allowance; this request was not sent.`,
          );
        value = await this.generate<unknown>(
          run,
          {
            task: 'npc_response',
            actorScope: actorId,
            execution: level === 2 ? 'fast' : 'complex',
            model: c.macrofoldKey
              ? level === 2
                ? c.macrofoldMiniModel
                : c.macrofoldComplexModel
              : level === 2
                ? c.miniModel
                : c.complexModel,
            reasoningEffort: limits.effort,
            maxOutputTokens: actorInvention.enabled
              ? Math.max(1800, limits.outputTokens)
              : limits.outputTokens,
            instructions,
            context,
            schema: responseSchema,
          },
          `attempt:${attempt}:generate`,
          { category: 'level', level },
        );
        // Oversized output is rejected rather than repaired with another paid call. Measure the
        // operations exactly as the domain envelope does; the invention field has its own caps.
        if (
          textBytes(
            value && typeof value === 'object' && 'operations' in value
              ? { operations: (value as { operations: unknown }).operations }
              : value,
          ) > levelLimit.visibleOutputBytes
        )
          throw new StopJob(
            'failed',
            `The level ${level} response exceeded its ${levelLimit.visibleOutputBytes}-byte visible-output allowance. No paid repair was attempted.`,
            'invalid',
          );
      } catch (error) {
        // Escalation needs the normal spending allowance; if it cannot be reserved, defer.
        if (
          level1?.outcome.kind === 'escalate' &&
          error instanceof StopJob &&
          error.outcome === 'budget-exhausted'
        ) {
          const deferred: Level1Outcome = {
            kind: 'defer',
            reason: level1.outcome.reason,
            ...(level1.outcome.best ? { best: level1.outcome.best } : {}),
            escalationBlocked: 'budget-exhausted',
          };
          run.level1 = deferred;
          // No generative request ran: record the blocked escalation and restore the route.
          await this.log.record(
            `${run.job.id}:attempt:${attempt}:level1:blocked`,
            'Level-1 selection',
            { policy: LEVEL1_POLICY, selectionRequest: selectionMode, escalationRefused: true },
            { outcome: deferred, message: level1Message(deferred) },
          );
          const blocked = this.log.get(run.job.id);
          if (blocked) await this.log.save({ ...blocked, route: 'level1' });
          run.responseWatch = undefined;
          await this.update(run, 'completed', level1Message(deferred), {
            disposition: 'deferred',
            reason: deferred.reason,
            level1: deferred,
            trigger: semanticTrigger,
          });
          return;
        }
        throw error;
      }
    this.current(run);
    if (await retryForUrgentAwareness()) return;
    const reply = await this.log
      .run(
        'Response parsing',
        { schema: 'actor-response', value },
        async () => {
          const parsed = schema.parse(value);
          // Provider schemas describe fields; cross-field admission rules still need validation.
          // docs/architecture.md#actor-agency-foundation
          if (!validResponseEnvelope({ operations: parsed.operations }))
            throw new Error(
              'Invalid decision envelope: use exactly one non-null operation kind per entry, unique localIds and dependencies on earlier entries only.',
            );
          return parsed;
        },
        { id: `${run.job.id}:attempt:${attempt}:parse` },
      )
      .catch(() => {
        // Output that fails validation is invalid data, distinct from provider failure; it is
        // rejected without a paid repair request. The parsing stage keeps the exact error.
        throw new StopJob(
          'failed',
          'The response did not match the decision contract. No paid repair was attempted.',
          'invalid',
        );
      });
    // Authoring metadata must not invalidate the strict native response envelope.
    // docs/architecture.md#shared-invention-workflow
    // Grounding consumes canonical references, not the provider's opaque presentation handles.
    // docs/architecture.md#reviewed-action-binding-and-approval-boundaries
    const nativeReply = resolveResponseEntities(
      { operations: reply.operations },
      prepared.entityReferences,
      prepared.binding.knowledgeReferences,
      activityRequestDescriptors(this.service.world),
    );
    const proposedInvention =
      actorInvention.enabled && 'invention' in reply
        ? actorInvention.schema.parse(reply.invention)
        : null;
    let attemptBindings: AttemptBinding[] = [];
    if (nativeReply.operations.some((op) => op.act?.kind === 'proposal')) {
      try {
        attemptBindings = await this.groundAttempts(
          run,
          actorId,
          nativeReply,
          prepared.attemptBindings.map((binding) => ({
            ...binding,
            description: resolveEntityMarkers(binding.description, {
              ...prepared.visibleEntityReferences,
              ...prepared.entityReferences,
            }),
          })),
          `attempt:${attempt}`,
        );
      } catch (error) {
        if (run.controller.signal.aborted || run.cancelReason || run.supersession) throw error;
        await this.log.record(
          `${run.job.id}:attempt:${attempt}:interpretation-deferred`,
          'Action interpretation deferred',
          {},
          { reason: error instanceof Error ? error.message : 'Unavailable' },
        );
      }
      this.current(run);
      if (await retryForUrgentAwareness()) return;
    }
    run.responseWatch = undefined;
    await this.prepareResponseAdmission(run);
    const commitStartedAt = new Date().toISOString();
    const commit = () =>
      this.service.transition(
        (world) => {
          this.current(run);
          return commitActorResponse(
            world,
            run.job.id,
            actorId,
            nativeReply,
            prepared.binding.actions,
            prepared.binding.entityIds,
            prepared.binding.expectedPlan,
            attemptBindings,
            prepared.binding.entityEpisodes,
            prepared.binding.evidenceIds,
            prepared.binding.knowledgeReferences,
          );
        },
        undefined,
        run.job.id,
        async () => {
          await prepared.validateConversation(false);
          return true;
        },
      );
    const authorizedCommit = () =>
      run.job.authority
        ? this.service.authorized(run.job.authority, 'play', true, commit)
        : commit();
    let result = await authorizedCommit();
    while (!result.ok && result.code === 'paused') {
      await this.awaitResume(run, true);
      if (await retryForUrgentAwareness()) return;
      result = await authorizedCommit();
    }
    const receipt = this.service.world.responseReceipts?.[run.job.id];
    const awaitingConfirmation = Object.values(receipt?.components ?? {}).some(
      (part) => part.code === 'needs-confirmation',
    );
    await this.log.record(
      `${run.job.id}:commit`,
      'Response admission',
      { proposed: reply },
      { ...result, components: receipt?.components },
      commitStartedAt,
    );
    // Deliberate continuation is an admitted level-1 choice, not a generic empty reply.
    const continued = result.ok && level1?.outcome.kind === 'continue';
    await this.update(
      run,
      result.ok || awaitingConfirmation
        ? 'completed'
        : result.code === 'actor-unavailable'
          ? 'cancelled'
          : 'failed',
      continued && level1 ? level1Message(level1.outcome) : result.message,
      {
        disposition: awaitingConfirmation
          ? 'awaiting-confirmation'
          : continued
            ? 'continued'
            : result.code,
        components: receipt?.components,
        trigger: semanticTrigger,
        ...(level1 ? { level1: level1.outcome } : {}),
      },
    );
    if (result.ok && proposedInvention) {
      let candidate: unknown;
      try {
        candidate = JSON.parse(proposedInvention.candidateJson);
      } catch {
        candidate = null;
      }
      run.actorInvention = {
        actorId,
        purpose: proposedInvention.purpose,
        candidate,
        policyRevision: actorInvention.policyRevision,
        ...(proposedInvention.parentId ? { parentId: proposedInvention.parentId } : {}),
      };
    }
  }

  /** Server-only actor gateway. No HTTP actor identity or origin is accepted. */
  async submitActorInvention(
    actorId: string,
    id: string,
    purpose: string,
    candidate: unknown,
    parentId?: string,
    policyRevision = this.service.world.inventionPolicy.revision,
  ): Promise<ApiResult> {
    const permission = inventionPermission(this.service.world, { origin: 'agent', policyRevision });
    if (!permission.ok) return permission;
    if (candidate === undefined)
      return {
        ok: false,
        code: 'invalid-declaration',
        message: 'Supply an explicit actor proposal.',
      };
    candidate = normalizeInventionProposal(candidate);
    const candidateDigest = digest(candidate);
    const prior = (
      await this.service.store.inventionJobs(this.service.world.id, actorId, undefined, {
        timelineId: this.service.timelineId,
      })
    ).find(
      (job) =>
        job.request.invention?.candidate !== undefined &&
        digest(job.request.invention.candidate) === candidateDigest,
    );
    if (prior)
      return {
        ok: true,
        code: 'already-proposed',
        message: 'This unchanged method already has a saved result.',
        jobId: prior.id,
      };
    return this.submit(
      'invention',
      id,
      purpose,
      undefined,
      undefined,
      `actor-invention:${actorId}`,
      parentId ? { parentId, action: 'revise' } : undefined,
      candidate,
      actorId,
      policyRevision,
    );
  }

  private async invent(run: Running): Promise<void> {
    let generation = 0;
    const port: import('./invention-service.js').InventionExecution = {
      current: () => this.current(run),
      source: this.executionSource,
      model: () => run.generatedBy ?? this.service.config.llmModel,
      judge: (request) =>
        this.call(run, 'jev', 'route', (id) =>
          this.client.judge({ ...request, requestId: id, signal: run.controller.signal }),
        ),
      generate: (request) =>
        this.generate(
          run,
          request,
          run.job.request.invention?.mode === 'workshop' ? `workshop:${++generation}` : 'generate',
        ),
      tool: (name, input, output) =>
        this.log.record(`${run.job.id}:tool:${name}`, 'Invention tool', input, output),
      search: () =>
        searchInventions(
          this.service,
          this.log,
          run.job.id,
          run.job.request.invention!.actorId,
          run.job.request.text,
          run.controller.signal,
          () => this.current(run),
          async () => {
            if (this.service.paused && run.job.request.invention?.mode !== 'workshop')
              await this.awaitResume(run);
            this.current(run);
          },
          inventionAttemptBudget(this.service, run.job.request.invention),
        ),
      checkpoint: async (candidate, options) => {
        if (options?.base) run.job.request.invention!.base = options.base;
        run.job.invention = {
          ...run.job.invention,
          ...(options?.validation ? { validation: options.validation } : {}),
          code: 'candidate',
          candidate,
          candidateDigest: digest(candidate),
        };
        await this.service.store.putJob(run.job);
      },
      finish: async (status, message, result) => {
        run.job.invention = { ...run.job.invention, ...result };
        await this.update(run, status, message, result);
      },
    };
    if (
      run.job.request.invention?.mode === 'workshop' &&
      run.job.request.invention.continuation?.action !== 'reuse'
    )
      await prepareInventionWorkshop(this.service, run.job.request, port);
    else await inventSupportedTechnique(this.service, run.job.id, run.job.request, port);
  }

  /** Meaningful changes are coalesced; native steps never purchase inference. */
  async considerThought(): Promise<void> {
    return this.admission(async () => {
      if (!this.service.config.macrofoldKey && !this.service.config.jevKey) return;
      if (this.service.config.macrofoldKey || this.service.config.jevKey)
        void this.maintenance.tick(!!this.running).catch(() => {
          this.service.storageError =
            'Cognition maintenance scheduling failed; simulation paused. Restart and reconcile storage.';
          this.service.notify();
        });
      if (this.running || this.stopped || this.service.paused) return;
      const world = this.service.world;
      const policy = world.cognitionPolicy;
      // One change-fed intake: cheap per-character tokens; visibility reruns only for a
      // character whose own exposure or position changed (EPR05).
      this.thoughtInputs.reset(this.service.generation);
      timedSync('cognition.thoughtRefresh', () =>
        this.thoughtWork.refresh(
          world,
          (id, world, verify) => this.thoughtInputs.read(world, id, verify),
          this.service.generation,
        ),
      );
      const actors = this.thoughtWork
        .ready(
          this.now(),
          world.simTime,
          (id) =>
            world.entities[id]?.actor?.controller === 'npc' &&
            !world.entities[id]?.actor?.incapacitated &&
            this.thoughtInputs.visible(id) !== undefined,
        )
        .map((id) => world.entities[id]!);
      const generations = new Map(
        actors.map((entity) => [entity.id, this.thoughtWork.capture(world, entity.id)]),
      );
      const scheduled = new Map(
        await Promise.all(
          actors.map(
            async (e) =>
              [e.id, await this.readSchedule(`semantic-schedule:${world.id}:${e.id}`)] as const,
          ),
        ),
      );
      // `ready` already ordered characters fairly: urgent or long-waiting work, then the
      // longest-waiting; every returned character is inspected until one is admitted.
      for (const entity of actors) {
        const actor = entity.actor!;
        if (!actor.alive || actor.incapacitated) continue;
        const key = `semantic-schedule:${world.id}:${entity.id}`;
        const last = scheduled.get(entity.id);
        // Only records newer than the considered-evidence watermark, not all retained history.
        const { records: all, maxSequence } = unseenExperiences(
          world,
          entity.id,
          last?.watermark ?? 0,
          undefined,
          // Keep everything the trigger filter below could select, plus speech for ownership.
          (memory) =>
            memory.importance >= 6 ||
            memory.eventType === 'speech' ||
            policy.significantEventTypes.includes(memory.eventType ?? ''),
        );
        // A directed turn owns exactly its own speech event, whatever its outcome: the
        // autonomous path never answers it again (no automatic paid retry), while other
        // intervening awareness stays available. Durable jobs keep this across restart.
        // docs/memory-architecture.md#every-semantic-decision-uses-an-event-or-intent-sentence
        const speechJobs = await this.service.store.getSpeechJobs(
          all
            .filter(
              (memory) =>
                memory.eventType === 'speech' && (memory.sequence ?? 0) > (last?.watermark ?? 0),
            )
            .map((memory) => memory.eventId ?? memory.id),
        );
        const unseen = all
          .filter((memory) => {
            const event = this.service.worldEvent(memory.eventId ?? '');
            const speechJob = speechJobs.get(memory.eventId ?? memory.id);
            const handledByChat =
              !!speechJob &&
              (speechJob.request.npcId ?? this.service.defaultResidentEntityId) === entity.id;
            // Retain history but retract an obsolete bodily urgency before buying cognition.
            const attributeId = event?.type === 'body-condition' && event.data?.['attributeId'];
            // A notice from a replaced condition policy is superseded by its own 'initial'.
            if (
              typeof attributeId === 'string' &&
              ((typeof event?.data?.['severity'] === 'number' &&
                (actor.conditions?.[attributeId]?.severity ?? 0) < event.data['severity']) ||
                (typeof event?.data?.['definitionVersion'] === 'number' &&
                  actor.conditions?.[attributeId]?.version !== event.data['definitionVersion']))
            )
              return false;
            const ownResponse =
              event?.actorId === entity.id && typeof event.data?.['responseId'] === 'string';
            return (
              !ownResponse &&
              !handledByChat &&
              (memory.importance >= 6 ||
                policy.significantEventTypes.includes(event?.type ?? '')) &&
              (memory.sequence ?? 0) > (last?.watermark ?? 0)
            );
          })
          .sort((a, b) => (b.sequence ?? 0) - (a.sequence ?? 0));
        const latest = unseen.slice(0, 8);
        // This is a wakeup snapshot, not a queue of memories owed future model calls.
        // docs/memory-architecture.md#every-semantic-decision-uses-an-event-or-intent-sentence
        const snapshotWatermark = Math.max(last?.watermark ?? 0, maxSequence);
        const subscription = (await this.service.store.getIntegration(
          `interests:${world.id}:${entity.id}`,
        )) as InterestSubscription | undefined;
        const review = this.thoughtInputs.stimulusReview(world, entity.id);
        if (
          !this.thoughtWork.inspected(
            entity.id,
            Math.min(
              subscription && subscription.expiresAt > world.simTime
                ? subscription.expiresAt
                : Infinity,
              review.nextAt,
            ),
            generations.get(entity.id),
            this.service.world,
            this.service.generation,
          )
        )
          continue;
        const matches = interestMatches(
          world,
          entity.id,
          subscription,
          this.thoughtInputs.visible(entity.id) ?? [],
        );
        const nativeProtection = nativeProtectionReason(world, entity.id);
        const fingerprint = digest({
          matches,
          nativeProtection,
          // Relevant intent/knowledge changes create an ordinary opportunity, not mandatory generation.
          // docs/architecture.md#change-driven-exposure-and-reaction-intake
          goal: currentGoal(actor),
          techniques: (world.knowledge[entity.id] ?? []).map((record) => record.recipeId),
          possessions: relevantPossessions(world, entity.id, subscription),
          bodyInputs: bodyReconsiderationInputs(world, entity, 'director'),
          bodyPolicyPin: world.moduleManifest.bodyPolicyPin,
          concerns: projectAttributes(world, entity, 'owner')
            .filter(
              (v) =>
                v.concern &&
                world.moduleManifest.definitions.find((d) => d.id === v.id)?.concern?.reconsider,
            )
            .map((v) => [v.id, v.concern]),
          mind: world.innerWorlds?.[entity.id]?.revision,
          knowledge: world.knowledgeRevisions?.[entity.id] ?? 0,
          policy: policy.revision,
          // A due review of an ongoing salient stimulus is a fresh opportunity (EPR06).
          reviews: review.key,
        });
        const opportunity = digest({ fingerprint, evidence: latest.map((memory) => memory.id) });

        if (
          (last?.fingerprint === fingerprint && !unseen.length) ||
          last?.attemptedOpportunity === opportunity
        ) {
          this.thoughtWork.recordOutcome('unchanged', all.length);
          continue;
        }
        const sentence = [
          ...latest.map((m) => m.summary),
          ...matches.map(
            (id) =>
              `I notice ${observerDescription(world, entity.id, id)}, relevant to my current interest.`,
          ),
          `My current goal is ${currentGoal(actor)}.`,
          ...projectAttributes(world, entity, 'owner').flatMap((v) =>
            v.concern ? [v.concern] : [],
          ),
          ...projectAttributes(world, entity, 'owner').flatMap((v) =>
            v.condition ? [`${v.name}: ${v.condition}.`] : [],
          ),
        ].join(' ');
        const urgentNeed = nativeProtection;
        const newReview = !!review.key && review.key !== last?.reviewKey && !!review.due.length;
        const diagnosticTrigger = urgentNeed
          ? urgentNeed
          : latest.length
            ? responseTrigger(
                this.service,
                entity.id,
                latest[0]!.eventId ?? latest[0]!.id,
                latest[0]!.summary,
              )
            : matches.length
              ? `A nearby interest became relevant: ${observerDescription(world, entity.id, matches[0]!)}.`
              : newReview
                ? `I am still aware of ${observerDescription(world, entity.id, review.due[0]!)}.`
                : 'A goal, surrounding, or internal state changed.';
        const diagnosticTriggerType = urgentNeed
          ? `Cognition skipped · ${urgentNeed}`
          : latest.length
            ? 'Autonomous cognition · New experience'
            : matches.length
              ? 'Autonomous cognition · Interest cue'
              : newReview
                ? 'Autonomous cognition · Review'
                : 'Autonomous cognition · State change';
        const id = `thought-${randomUUID()}`;
        if (urgentNeed) {
          this.thoughtWork.recordOutcome('deferred', all.length);
          if (last?.skippedOpportunity === opportunity) continue;
          await this.log.save({
            id,
            kind: 'Semantic trigger',
            worldId: world.id,
            actorId: entity.id,
            actorName: entity.name,
            trigger: diagnosticTrigger,
            triggerType: diagnosticTriggerType,
            startedAt: new Date().toISOString(),
            status: 'completed',
            disposition: 'skipped',
            route: 'level0',
            gameTime: world.simTime,
            input: {
              reason: urgentNeed,
              stimulus: diagnosticTrigger,
              coalescedContext: sentence,
            },
            exchanges: [],
          });
          // Deferred, not consumed: evidence gathered before or during sleep stays unread
          // for the next capable opportunity. Native handling queues no paid catch-up.
          await this.writeSchedule(key, {
            fingerprint,
            at: this.now(),
            ...(last?.watermark !== undefined ? { watermark: last.watermark } : {}),
            ...(last?.attemptedOpportunity
              ? { attemptedOpportunity: last.attemptedOpportunity }
              : {}),
            skippedOpportunity: opportunity,
            ...(review.key ? { reviewKey: review.key } : {}),
          });
          continue;
        }
        this.thoughtWork.recordOutcome('admitted', all.length);
        // Attempted, not consumed: the cursor advances only when the decision completes. A
        // failed decision is not a debt to replay; the same opportunity is not retried and
        // new changes create fresh opportunities that still include unread evidence.
        await this.writeSchedule(key, {
          fingerprint,
          at: this.now(),
          ...(last?.watermark !== undefined ? { watermark: last.watermark } : {}),
          attemptedOpportunity: opportunity,
          ...(review.key ? { reviewKey: review.key } : {}),
        });
        const significant = latest.some(
          (m) =>
            m.id === m.eventId &&
            policy.significantEventTypes.includes(
              m.eventType ?? this.service.worldEvent(m.id)?.type ?? '',
            ),
        );
        if (significant) await this.maintenance.enqueue(entity.id, id, sentence);
        await this.begin(
          {
            id,
            kind: 'thought',
            fingerprint,
            status: 'queued',
            message: 'Considering a semantic event.',
            diagnosticTrigger,
            diagnosticTriggerType,
            triggerEvidenceId: latest[0]?.eventId ?? latest[0]?.id,
            stimulusEvidenceIds: latest.map((m) => m.eventId ?? m.id),
            request: { text: diagnosticTrigger, npcId: entity.id },
            createdAt: this.now(),
          },
          async () => {
            const current = await this.readSchedule(key);
            await this.writeSchedule(key, {
              fingerprint,
              at: this.now(),
              watermark: Math.max(current?.watermark ?? 0, snapshotWatermark),
              attemptedOpportunity: opportunity,
              ...(review.key ? { reviewKey: review.key } : {}),
            });
          },
        );
        const trace = this.log.get(id);
        if (trace)
          await this.log.save({
            ...trace,
            input: {
              policy: policy.revision,
              scheduling: {
                reason:
                  'Current significant evidence or changed interests/state; shared execution slot available; no actor cooldown.',
                priorActorOpportunityAt: last?.at,
                admittedAt: this.now(),
                triggerGameTime: latest[0]?.at,
                triggerAgeGameSeconds: latest[0]
                  ? Math.max(0, world.simTime - latest[0].at)
                  : undefined,
              },
              stimulus: diagnosticTrigger,
              coalescedContext: sentence,
              coalescedSources: latest.map((m) => m.id),
              observedSinceLastOpportunity: unseen.length,
              coalescedCount: unseen.length - latest.length,
              offeredRoutes: [0, 1, 2, 3, 4, 5],
            },
          });
        return;
      }
    });
  }
  private async readSchedule(key: string): Promise<ThoughtSchedule | undefined> {
    if (!this.schedules.has(key))
      this.schedules.set(
        key,
        (await this.service.store.getIntegration(key)) as ThoughtSchedule | undefined,
      );
    return this.schedules.get(key);
  }
  private async writeSchedule(key: string, value: ThoughtSchedule): Promise<void> {
    // This director is the sole schedule writer. Failed writes never update its cache.
    await this.service.store.putIntegration(key, value);
    this.schedules.set(key, value);
  }
  private async think(run: Running): Promise<void> {
    return await this.decide(run, false);
  }

  async idle(): Promise<void> {
    while (this.pendingWork.size) await Promise.all([...this.pendingWork]);
  }
  async close(): Promise<void> {
    this.stopped = true;
    this.running?.controller.abort();
    this.unsubscribe();
    await this.admissionTail;
    await Promise.allSettled([...this.pendingWork]);
    await this.recall.close();
    await this.maintenance.close();
    await this.narrator.close();
    await this.log.close();
  }
}
