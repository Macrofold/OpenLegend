  supportsManualWork,
  validResponseEnvelope,
} from '@open-legend/domain';
import { resolveResponseEntities } from './entity-references.js';
import { capabilityBlocked } from '@open-legend/domain';
import { groundActionAttempts, exactNavigation } from './action-grounding.js';
import { actionResponse } from './action-response.js';
import { npcCandidates, planningCandidates } from './context.js';
import { domainCommand } from './cognition.js';
import type { ActorResponse, AttemptBinding } from '@open-legend/domain';
import { searchInventions } from './invention-search.js';
import type { InventionContinuation } from '@open-legend/protocol';
import {
} from './invention-service.js';
import { inventionPermission, recordInventionFeedback } from '@open-legend/domain';
import { prepareActorInvention } from './actor-invention.js';
import { nativeProtectionReason } from './native-protection.js';
import { currentGoal } from '@open-legend/domain';
import { projectAttributes } from '@open-legend/domain';
import { timedSync } from './performance.js';
import { Narrator } from './narrator.js';
import { ActorWork } from './actor-work.js';
import { seesEntity } from '@open-legend/domain';
import { decisionQuestions, JEV_QUESTIONS_VERSION } from './jev-questions.js';
import { retrieveActions } from './action-retrieval.js';
import { interestMatches, type InterestSubscription } from './interests.js';
  boundResponseSchema,
  COGNITION_VERSION,
} from './cognition-contracts.js';
import {
  captureActionTargets,
  experiences,
  DEFAULT_COGNITION_POLICY,
  commitActorResponse,
} from '@open-legend/domain';
import { IntelligenceLog } from './intelligence-log.js';
import { cognitionOutputTokens } from './macrofold-model.js';
import { z } from 'zod';
  type GenerateRequest,
  type JudgmentAnswer,
} from '@open-legend/ai';
import type { DeclarationProvenance } from '@open-legend/domain';
import type { ApiResult } from '@open-legend/protocol';
import { CONTEXT_BYTE_LIMIT, ContextBudgetError } from './context.js';
import { digest, type JobRecord } from './store.js';
}
const choice = (answer: JudgmentAnswer | undefined) =>
  answer && 'choice' in answer && answer.confidence >= 0.55 ? answer.choice : null;
interface ThoughtSchedule {
  fingerprint: string;
  at: number;
/** One bounded actor workflow at a time; provider completions never bypass authoritative rules. */
export class AiDirector {
  private running: Running | null = null;
  private pendingWork = new Set<Promise<void>>();
  private admissionTail: Promise<unknown> = Promise.resolve();
  private admission<T>(operation: () => Promise<T>): Promise<T> {
      // Abort the provider stage promptly; the attempt wrapper rebuilds context once.
      run.controller.abort();
    });
  }

  async submitAction(
    id: string,
    text: string,
    mode: 'enqueue' | 'replace',
    targetId?: string,
  ): Promise<ApiResult> {
    return this.admission(async () => {
      const actorId = this.service.controlledEntityId;
      const actor = this.service.world.entities[actorId]?.actor;
      if (!text.trim() || text.length > 500 || !['enqueue', 'replace'].includes(mode))
        return {
          ok: false,
          code: 'invalid-action',
          message: 'Supply an action of 1–500 characters.',
        };
      const fingerprint = digest({
        kind: 'action',
        world: this.service.world.id,
        timeline: this.service.timelineId,
        actorId,
        text,
        mode,
        targetId,
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
        return { ok: false, code: 'actor-unavailable', message: 'Your character cannot act now.' };
      if (
        targetId &&
        !this.service.observe(actorId)?.visibleEntities.some((e) => e.id === targetId)
      )
        return {
          ok: false,
          code: 'target',
          message: 'The selected target is no longer perceived.',
        };
      if (this.running || this.stopped)
        return {
          ok: false,
          code: 'busy',
          message: 'Another intelligence request is in progress; try again after it finishes.',
        };
      const config = this.service.config;
      if (
        !exactNavigation(text, this.service.world, actorId, targetId) &&
        (!config.budgetUsd || (!config.macrofoldKey && (!config.jevKey || !config.llmKey)))
      )
        return {
          ok: false,
          code: 'ai-unavailable',
          message:
            'This wording needs configured Jev and language-model access with an allowance. Exact coordinate movement and unqualified visible-target following need no AI.',
        };
      this.maintenance.cancel();
      const job: JobRecord = {
        id,
        kind: 'action',
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
    });
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
        this.call(run, 'jev', `${operation}:classify:${serial++}`, (requestId) =>
          this.client.judge({ ...request, requestId, signal: run.controller.signal }),
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
    const refs = [actorId, ...(observed?.visibleEntities.map((e) => e.id) ?? [])];
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
    let result = await commit();
    while (!result.ok && result.code === 'paused') {
      await this.awaitResume(run, true);
      this.current(run);
      result = await commit();
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
  }

  private async process(run: Running): Promise<void> {
    if (run.job.kind === 'action') return await this.playerAction(run);
    if (run.job.kind === 'invention') return await this.invent(run);
    if (run.job.kind === 'thought') return await this.think(run);
    return await this.decide(run, true);
    );
    // Authoring metadata must not invalidate the strict native response envelope.
    // docs/architecture.md#shared-invention-workflow
    // Grounding consumes canonical references, not the provider's opaque presentation handles.
    // docs/architecture.md#reviewed-action-binding-and-approval-boundaries
    const nativeReply = resolveResponseEntities(
      { operations: reply.operations },
      prepared.entityReferences,
      prepared.binding.knowledgeReferences,
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
          prepared.attemptBindings,
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
      result = await commit();
    }
    const receipt = this.service.world.responseReceipts?.[run.job.id];
    const awaitingConfirmation = Object.values(receipt?.components ?? {}).some(
      (part) => part.code === 'needs-confirmation',
    );
    await this.log.record(
      `${run.job.id}:commit`,
      'Response admission',
    );
    await this.update(
      run,
      result.ok || awaitingConfirmation
        ? 'completed'
        : result.code === 'actor-unavailable'
          ? 'cancelled'
          : 'failed',
      result.message,
      {
        disposition: awaitingConfirmation ? 'awaiting-confirmation' : result.code,
        components: receipt?.components,
        trigger: semanticTrigger,
      },
      if (this.running || this.stopped || this.service.paused) return;
      const world = this.service.world;
      const policy = world.cognitionPolicy ?? DEFAULT_COGNITION_POLICY;
      timedSync('cognition.thoughtRefresh', () =>
        this.thoughtWork.refresh(world, (id) => {
          const entity = world.entities[id]!,
            actor = entity.actor!;
          return [
            actor.controller,
            actor.incapacitated,
            currentGoal(actor),
            actor.agency.plan?.revision,
            actor.action?.id,
            actor.action?.type,
            actor.agency.revision,
            actor.capabilities,
            world.items,
            world.knowledge[id],
            world.moduleManifest,
            nativeNeedBelow(actor, 'fullness', 20),
            nativeNeedBelow(actor, 'energy', 15),
            nativeNeedBelow(actor, 'energy', 10),
              .filter((v) => v.concern && Object.hasOwn(actor.attributes ?? {}, v.id))
              .map((v) => v.id)
              .join('|'),
            world.visiblePeople?.[id],
            world.visibleObjects?.[id],
            world.memories[id],
            world.experience?.awareness[id],
            world.experience?.summaries[id],
            world.innerWorlds?.[id],
            world.cognitionPolicy,
          ];
        }),
      );
      const actors = this.thoughtWork
        .ready(
          this.now(),
          world.simTime,
          (id) =>
            world.entities[id]?.actor?.controller === 'npc' &&
            !world.entities[id]?.actor?.incapacitated,
        )
        .map((id) => world.entities[id]!)
        .filter((entity) => entity.actor?.controller === 'npc');
      const workVersions = new Map(actors.map((e) => [e.id, this.thoughtWork.version(e.id)]));
      const scheduled = new Map(
        await Promise.all(
          actors.map(
          subscription && subscription.expiresAt > world.simTime
            ? subscription.expiresAt
            : Infinity,
          workVersions.get(entity.id),
        );
        const matches = interestMatches(
          world,
          entity.id,
          subscription,
          [
            ...(world.visiblePeople?.[entity.id] ?? []),
            ...(world.visibleObjects?.[entity.id] ?? []),
          ].filter((id) => !!world.entities[id] && seesEntity(world, entity, world.entities[id]!)),
        );
        const nativeProtection = nativeProtectionReason(world, entity.id);
        const fingerprint = digest({
          matches,
          nativeProtection,
          // Relevant intent/knowledge changes create an ordinary opportunity, not mandatory generation.
          // docs/architecture.md#change-driven-exposure-and-reaction-intake
          goal: currentGoal(actor),
          techniques: (world.knowledge[entity.id] ?? []).map((record) => record.recipeId),
          need: nativeNeedBelow(actor, 'fullness', 20)
            ? 'hungry'
            : nativeNeedBelow(actor, 'energy', 15)
          watermark: snapshotWatermark,
          attemptedOpportunity: opportunity,
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
