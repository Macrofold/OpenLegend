import type { MemoryReadControl } from './memory-repository.js';
import {
  canPrepareActivityDetail,
  claimActivityDetail,
  activityDetailPhase,
} from './activity-detail.js';
import { decisionAllowance } from './cognition-budget.js';
import { resolveHigherDecisionGenerationConfig } from './generation-config.js';
import { macrofoldGenerationInstructions } from '@open-legend/ai';
import { selectedExpressions } from '@open-legend/domain';
import {
  entityGet,
  canSpeak,
  commitActorResponse,
  namedClockTimes,
  heardAddressedSpeech,
  validResponseEnvelope,
  type ActorResponse,
} from '@open-legend/domain';
import { bindDecisionAppraisals, captureDecisionAppraisalContext } from './appraisal-context.js';
import {
  boundResponseSchema,
  responseActionReferences,
  nativeResponse,
  RESPONSE_OPERATION_GUIDE,
  responseTaskInstructions,
  responseSemantics,
  ACTIVITY_DETAIL_INSTRUCTIONS,
  withActivityDetail,
  type ModelResponseOperation,
  type DecisionAppraisalProposal,
} from './cognition-contracts.js';
import {
  fallbackDecisionActions,
  offerPreparedActions,
  prepareDecision,
  type DecisionInputMeasure,
} from './decision-context.js';
import type { PreparedReconsideration } from './decision-escalator.js';
import { decisionValidity } from './decision-validity.js';
import { resolveResponseEntities } from './entity-references.js';
import type { RecallService } from './recall.js';
import { digest, type JobRecord } from './store.js';
import { compileDecisionTask, prepareDecisionTask, type DecisionTask } from './decision-task.js';
import { DECISION_LIMITS } from './decision-state.js';
import type { WorldService } from './world-service.js';
import { compactActivityRequests, type ModelActivityRequests } from './response-context.js';
import { ContextBudgetError } from './context.js';

/** The same response owner handles a supplied action on either model route. */
export function knownDecisionResponse(
  prepared: Awaited<ReturnType<typeof prepareDecision>>,
  selected: string,
): { operations: Omit<ModelResponseOperation, 'appraise'>[] } {
  if (!Object.hasOwn(prepared.binding.actions, selected))
    throw new Error('Unknown offered action.');
  const choice = prepared.binding.actions[selected]!;
  if (choice.invocation === null && !choice.purpose) return { operations: [] };
  return {
    operations: [
      {
        localId: 'action',
        requiresAccepted: [],
        act: {
          kind: 'known',
          mode: choice.transition === 'continue' ? 'enqueue' : choice.transition,
          actionId: selected,
        },
      },
    ],
  };
}

export interface RetainedDecisionPreparation {
  rootId: string;
  generation: string;
  validity: string;
  selectedFamilyIds?: readonly string[];
  prepared: Awaited<ReturnType<typeof prepareDecision>>;
}

const RECONSIDERATION_OBSERVATION_POLICY =
  'Continuous meters and feeling decay are observations from sourceTime; their meaningful conditions must remain unchanged. All current execution prerequisites are checked again.';

/** Admission and dispatch compile exactly the same reconsideration request. */
function reconsiderationInput(
  input: Pick<
    Parameters<DecisionInputMeasure>[0],
    'context' | 'offered' | 'sourceTime' | 'actionGuidance'
  >,
  reconsiderationReason: string,
  kind: 'choice' | 'response' | 'appraisal',
  appraisals?: unknown,
  valueSchema?: DecisionTask['valueSchema'],
) {
  return {
    tasks: {
      q0:
        kind === 'choice'
          ? {
              kind: 'choice',
              question:
                'Choose the personally suitable, currently offered action or deliberate continuation. Abstain if no offered choice is suitable.',
              choices: Object.fromEntries(
                input.offered.map((option) => [option.id, option.description]),
              ),
            }
          : {
              kind,
              question:
                kind === 'appraisal'
                  ? 'Propose one supported change to my feelings about the initiating situation, using an installed policy and permitted cause. Abstain if no change is justified.'
                  : `${responseTaskInstructions((input.context['triggerFacts'] as { observerRelationship?: string } | undefined)?.observerRelationship === 'addressed_speech')} Answer with this decision's new contribution in this question's value, using only supplied operations and handles. ${RESPONSE_OPERATION_GUIDE}`,
              ...(valueSchema ? { valueSchema } : {}),
            },
    } satisfies Record<string, DecisionTask>,
    context: {
      sourceTime: input.sourceTime,
      observationPolicy: RECONSIDERATION_OBSERVATION_POLICY,
      character: input.context['activityRequests']
        ? {
            ...input.context,
            activityRequests: compactActivityRequests(
              input.context['activityRequests'] as ModelActivityRequests,
            ),
          }
        : input.context,
      ...(kind === 'response' ? { choices: input.offered } : {}),
      ...(kind !== 'choice' ? { appraisals } : {}),
      reconsiderationReason,
    },
    instructions: input.actionGuidance,
  };
}

/** Reuse this decision's permitted evidence, or rebuild natively after a meaningful change. */
export async function prepareReconsideration(
  service: WorldService,
  recall: RecallService,
  job: JobRecord,
  signal: AbortSignal,
  retained?: RetainedDecisionPreparation,
  readControl?: MemoryReadControl,
  selectedFamilyIds?: readonly string[],
): Promise<PreparedReconsideration> {
  const state = job.decision;
  if (!state?.higher) throw new Error('Missing admitted reconsideration.');
  const higher = state.higher;
  const actorId = state.actorId,
    generation = service.generation;
  const response = Object.values(state.groups).some(
    (group) => group.state === 'open' && group.kind === 'response',
  );
  const appraisalOnly = state.groups['q0']?.kind === 'appraisal';
  const closedChoice = !response && !appraisalOnly;
  const reconsiderationReason = higher.reason;
  const kind = closedChoice ? 'choice' : appraisalOnly ? 'appraisal' : 'response';
  const detailTarget = resolveHigherDecisionGenerationConfig(service.config, {
    maxOutputTokens: DECISION_LIMITS.outputTokens,
    reasoningEffort: 'low',
  });
  const detailModel = detailTarget.macrofoldDeployment
    ? `deployment:${detailTarget.macrofoldDeployment.modelBinding.deployment_id}`
    : detailTarget.model;
  const allowDetail =
    response &&
    Object.keys(state.groups).filter((key) => state.groups[key]?.state === 'open').length === 1 &&
    (await canPrepareActivityDetail(
      service,
      job,
      4,
      decisionAllowance(service.config, 'openai', detailModel),
    ));
  const triggerEvidenceId = job.triggerEvidenceId ?? job.playerSpeechEventId;
  const appraisalView =
    !closedChoice &&
    service.world.moduleManifest.appraisals?.definitions.some((definition) => definition.decision)
      ? captureDecisionAppraisalContext(service.world, actorId)
      : undefined;
  const inputMeasure: DecisionInputMeasure = (input) => {
    const request = reconsiderationInput(
      input,
      reconsiderationReason,
      kind,
      appraisalView?.project({ ...input.sources, triggerEvidenceId }),
    );
    if (allowDetail && request.tasks.q0.kind === 'response')
      request.tasks.q0.question += ` ${ACTIVITY_DETAIL_INSTRUCTIONS}`;
    const compiled = compileDecisionTask(request.tasks, request.context, request.instructions);
    return (
      Buffer.byteLength(
        macrofoldGenerationInstructions(
          compiled.instructions,
          compiled.schema,
          detailTarget.structuredOutput === 'auto' ? undefined : detailTarget.structuredOutput,
        ),
      ) + Buffer.byteLength(compiled.context)
    );
  };
  const evidenceIds = [
    ...new Set([
      ...(job.playerSpeechEventId ? [job.playerSpeechEventId] : (job.stimulusEvidenceIds ?? [])),
      ...(job.triggerEvidenceId ? [job.triggerEvidenceId] : []),
    ]),
  ];
  const initialFamilies =
    selectedFamilyIds ??
    retained?.selectedFamilyIds ??
    retained?.prepared.completeForms.map((form) => form.id) ??
    [];
  const responseFamilies =
    service.cognitionControl?.initialResponseActivityFamilies(actorId, initialFamilies, {
      detailAvailable: allowDetail,
      requiredChoices: closedChoice || retained?.prepared.choiceCoverage === 'complete-required',
      detailRequested: selectedFamilyIds !== undefined,
    }) ?? initialFamilies;
  const changedFamilies =
    responseFamilies.length === initialFamilies.length ? undefined : new Set(responseFamilies);
  const retainedFormsMatch =
    !changedFamilies ||
    !retained ||
    retained.prepared.completeForms.every((form) => changedFamilies.has(form.id));
  // Routing has already paid for the complete actor-scoped read. Keep its exact
  // source proofs through handoff; unrelated publications do not invalidate them.
  // The existing conversation/source guards and current native admission remain
  // mandatory. A snapshot budgeted for optional suggestions cannot promise the
  // complete alternative set and compiler envelope of a closed choice: rebuild
  // through the same native owner under that requirement. No additional paid
  // preparation is permitted.
  // This is request-owned, never restored or shared across decisions.
  const retainedCandidate =
    retained?.rootId === job.id &&
    retained.generation === generation &&
    retained.validity === decisionValidity(service.world, actorId) &&
    !selectedFamilyIds &&
    retainedFormsMatch &&
    (!response ||
      allowDetail ||
      retained.prepared.discoveryDescriptors.every((descriptor) =>
        retained.prepared.completeForms.some((form) => form.id === descriptor.id),
      )) &&
    !closedChoice
      ? retained.prepared
      : undefined;
  const prepareNative = () =>
    prepareDecision(
      service,
      recall,
      actorId,
      higher.id,
      job.request.text,
      evidenceIds,
      async () => {
        throw new Error('Paid attention is forbidden during reconsideration preparation.');
      },
      signal,
      0,
      job.kind === 'chat',
      0,
      job.triggerEvidenceId ?? job.playerSpeechEventId,
      undefined,
      'native-only',
      closedChoice ? 'available-native' : undefined,
      inputMeasure,
      {
        question: `${
          reconsiderationInput(
            {
              context: {},
              offered: [],
              sourceTime: service.world.simTime,
              actionGuidance: service.world.cognitionPolicy.actionGuidance,
            },
            reconsiderationReason,
            kind,
          ).tasks.q0.question
        } Reason: ${reconsiderationReason}`,
        enabledSemantics: response
          ? responseSemantics(!!appraisalView)
          : appraisalOnly
            ? ['appraise']
            : ['act'],
        capabilityDetail: response
          ? allowDetail || selectedFamilyIds
            ? 'selected'
            : 'complete'
          : 'directory',
        ...(retained ? { capabilityDescriptors: retained.prepared.discoveryDescriptors } : {}),
        ...(allowDetail || selectedFamilyIds
          ? {
              selectedFamilyIds: responseFamilies,
            }
          : {}),
      },
      readControl,
      retained?.prepared.preparationWork,
      retained?.prepared.retainedRecall,
    );
  const prepareActions = (base: Awaited<ReturnType<typeof prepareDecision>>) => {
    const rebound = { ...base, binding: { ...base.binding, decisionId: higher.id } };
    return base.choiceCoverage === 'complete-required'
      ? offerPreparedActions(
          rebound,
          base.actionCandidates,
          'Complete native reconsideration choices',
        )
      : fallbackDecisionActions(rebound, 'Native candidates for one reconsideration');
  };
  // Reuse must fit the real consumer, including its mandatory continuation.
  // Measuring with no offers can spend that space on optional history first.
  // The existing native fitter reserves that interface before optional sources.
  // docs/technical/situation-aware-cognition-context.md#61-preparation-sequence
  const prepared = await (async () => {
    if (retainedCandidate) {
      await retainedCandidate.validateConversation(false);
      try {
        return prepareActions({ ...retainedCandidate, inputMeasure });
      } catch (error) {
        if (!(error instanceof ContextBudgetError)) throw error;
      }
    }
    return prepareActions(await prepareNative());
  })();
  const sourceTime = prepared.diagnostics.sourceTime;
  const validity = decisionValidity(service.world, actorId);
  // A closed choice cannot propose feeling changes. Current feeling values and
  // their freshness remain in the shared character context/decision validity;
  // only usable response/appraisal routes bind mutation capabilities.
  const appraisal =
    !closedChoice &&
    service.world.moduleManifest.appraisals?.definitions.some((definition) => definition.decision)
      ? await bindDecisionAppraisals(
          service,
          actorId,
          higher.id,
          prepared.binding.evidenceIds ?? evidenceIds,
          prepared.entityReferences,
          job.triggerEvidenceId ?? job.playerSpeechEventId,
          { sharedExperiences: prepared.sharedExperiences, contextSnapshot: appraisalView },
        )
      : undefined;
  if (appraisalOnly && !appraisal?.schema)
    throw new Error('No installed decision appraisal is available.');
  const responseSchemaFor = (offered: typeof prepared.offered) =>
    boundResponseSchema(
      Object.keys(prepared.entityReferences),
      responseActionReferences(
        prepared.binding.actions,
        Object.keys(prepared.binding.actions).filter(
          (id) => !/^a\d+$/.test(id) || offered.some((option) => option.id === id),
        ),
      ),
      {
        speech: canSpeak(entityGet(service.world.entities, actorId)),
        expressions: selectedExpressions(service.world, entityGet(service.world.entities, actorId)),
        proposals: false,
      },
      Object.keys(prepared.binding.knowledgeReferences ?? {}),
      namedClockTimes(service.world),
      prepared.completeForms,
      appraisal?.schema,
      prepared.goalIds,
    );
  const detailFamilies = allowDetail
    ? prepared.discoveryDescriptors
        .filter((descriptor) => !prepared.completeForms.some((form) => form.id === descriptor.id))
        .map((descriptor) => descriptor.id)
    : [];
  // Selected history can append without becoming stale. A newly received turn
  // addressed to this person separately supersedes their older paid decision.
  const addressedAfterCapture = (world = service.world) => {
    const awareness = world.experience?.awareness[actorId] ?? [];
    for (let index = awareness.length - 1; index >= 0; index--) {
      const entry = awareness[index]!;
      if (entry.sequence <= prepared.awarenessSequence) break;
      if (heardAddressedSpeech(entry)) return true;
    }
    return false;
  };
  const current = async () => {
    if (
      signal.aborted ||
      generation !== service.generation ||
      validity !== decisionValidity(service.world, actorId) ||
      addressedAfterCapture()
    )
      return false;
    // A smaller later projection does not erase sources already used to buy
    // the routing judgment. Keep that original guard after a native refit.
    if (
      retainedCandidate &&
      retainedCandidate.validateConversation !== prepared.validateConversation
    )
      await retainedCandidate.validateConversation(false);
    await prepared.validateConversation(false);
    return (
      (!appraisal || (await appraisal.current())) &&
      (!appraisalView || appraisalView.current(service.world)) &&
      !signal.aborted &&
      generation === service.generation &&
      validity === decisionValidity(service.world, actorId) &&
      !addressedAfterCapture()
    );
  };
  const inputFor = (offered: typeof prepared.offered) => {
    const input = reconsiderationInput(
      {
        context: prepared.context,
        offered,
        sourceTime,
        actionGuidance: prepared.actionGuidance,
      },
      reconsiderationReason,
      kind,
      appraisal?.context,
      appraisalOnly
        ? appraisal!.schema
        : response
          ? withActivityDetail(responseSchemaFor(offered), detailFamilies)
          : undefined,
    );
    if (detailFamilies.length && input.tasks.q0.kind === 'response')
      input.tasks.q0.question += ` ${ACTIVITY_DETAIL_INSTRUCTIONS}`;
    return input;
  };
  const fits = (offered: typeof prepared.offered) => {
    const input = inputFor(offered);
    const compiled = compileDecisionTask(input.tasks, input.context, input.instructions);
    return (
      Buffer.byteLength(
        macrofoldGenerationInstructions(
          compiled.instructions,
          compiled.schema,
          detailTarget.structuredOutput === 'auto' ? undefined : detailTarget.structuredOutput,
        ),
      ) +
        Buffer.byteLength(compiled.context) <=
        DECISION_LIMITS.inputBytes &&
      Buffer.byteLength(JSON.stringify(compiled.schema)) <= DECISION_LIMITS.schemaBytes
    );
  };
  let offered = prepared.offered;
  // The compiler serializes this structured context once with its own questions.
  // Fit optional actions against that complete consumer, preserving all personal
  // evidence and mandatory busy choices rather than lifting either byte limit.
  // docs/memory-architecture.md#4-jev-attention-before-context-inclusion
  if (prepared.choiceCoverage === 'optional' && !fits(offered)) {
    let low = 0,
      high = offered.length;
    while (low < high) {
      const count = Math.ceil((low + high) / 2);
      if (fits(prepared.offered.slice(0, count))) low = count;
      else high = count - 1;
    }
    offered = prepared.offered.slice(0, low);
  }
  const responseContract = response ? responseSchemaFor(offered) : undefined;
  const input = inputFor(offered);
  prepareDecisionTask(input.tasks, input.context, input.instructions);
  return {
    ...input,
    // Eligibility checks await after preparation. Keep the observations captured
    // at sourceTime detached from retained preparation and appraisal source objects.
    context: structuredClone(input.context),
    bindingDigest: digest({
      binding: prepared.binding,
      goalIds: prepared.goalIds,
      sourceManifest: prepared.manifest,
      appraisals: appraisal?.bindings,
      validity,
    }),
    sourceTime,
    current,
    ...(detailFamilies.length
      ? {
          activityDetail: {
            families: detailFamilies,
            async prepare(family: string, initialAttemptId: string) {
              if (!detailFamilies.includes(family) || !(await current()))
                throw new Error('Activity detail source changed.');
              const claimed = await claimActivityDetail(
                service,
                job,
                family,
                prepared.discoveryDescriptors,
                initialAttemptId,
              );
              const next = await prepareReconsideration(
                service,
                recall,
                claimed,
                signal,
                {
                  rootId: job.id,
                  generation,
                  validity,
                  prepared,
                },
                readControl,
                [...new Set([...prepared.completeForms.map((form) => form.id), family])],
              );
              await activityDetailPhase(service, job.id, 'final-ready');
              return next;
            },
          },
        }
      : {}),
    async publish(answers, claim) {
      const answer = answers['q0'];
      if (!answer || answer.status !== 'answered' || !(await current()))
        return {
          ok: false,
          code: 'stale',
          message: 'The original unresolved decision is no longer usable.',
        };
      let reply: ActorResponse;
      if ('choice' in answer.value)
        reply = nativeResponse(knownDecisionResponse(prepared, answer.value.choice));
      else if (appraisalOnly) {
        const changes = appraisal!.resolveDecision([answer.value as DecisionAppraisalProposal]);
        reply = {
          operations: [
            {
              localId: 'appraisal',
              requiresAccepted: [],
              appraise: changes[0]!,
            },
          ],
        };
      } else {
        if (!responseContract) throw new Error('The decision did not bind a response contract.');
        const wire = responseContract.parse(answer.value);
        const changes =
          appraisal?.resolveDecision(
            wire.operations.flatMap((op) => (op.appraise ? [op.appraise] : [])),
          ) ?? [];
        let next = 0;
        const operations = wire.operations.map(({ appraise, ...operation }) => ({
          ...operation,
          ...(appraise ? { appraise: changes[next++] } : {}),
        }));
        const native = nativeResponse({ operations });
        if (!validResponseEnvelope(native)) throw new Error('Invalid structured response.');
        reply = resolveResponseEntities(
          native,
          prepared.entityReferences,
          prepared.binding.knowledgeReferences,
          prepared.completeForms,
        );
      }
      if (!(await current()))
        return { ok: false, code: 'stale', message: 'Decision evidence changed.' };
      claim.groups = {
        q0: {
          operations: reply.operations.map((op) => op.localId),
          continued: !reply.operations.length,
        },
      };
      const commit = () =>
        service.transition(
          (world) => {
            if (
              signal.aborted ||
              generation !== service.generation ||
              validity !== decisionValidity(world, actorId) ||
              addressedAfterCapture(world)
            )
              return {
                world,
                events: [],
                outcome: {
                  ok: false,
                  code: 'stale',
                  message: 'The character’s situation changed.',
                },
              };
            return commitActorResponse(
              world,
              claim.receiptId,
              actorId,
              reply,
              prepared.binding.actions,
              prepared.binding.entityIds,
              prepared.binding.expectedPlan,
              [],
              prepared.binding.entityEpisodes,
              prepared.binding.evidenceIds,
              prepared.binding.knowledgeReferences,
              appraisal?.bindings,
              service.nativeExecutionPermissions,
              prepared.binding.capturedActorFrame,
            );
          },
          undefined,
          undefined,
          current,
          undefined,
          claim,
        );
      return job.authority ? service.authorized(job.authority, 'play', true, commit) : commit();
    },
  };
}
