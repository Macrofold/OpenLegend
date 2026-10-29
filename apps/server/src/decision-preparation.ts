import {
  entityGet,
  activityRequestDescriptors,
  canSpeak,
  commitActorResponse,
  namedClockTimes,
  supportsManualWork,
  validResponseEnvelope,
  type ActorResponse,
} from '@open-legend/domain';
import { actionResponse } from './action-response.js';
import { bindDecisionAppraisals } from './appraisal-context.js';
import {
  boundResponseSchema,
  type DecisionAppraisalProposal,
  responseSchema,
} from './cognition-contracts.js';
import { fallbackDecisionActions, prepareDecision } from './decision-context.js';
import type { PreparedReconsideration } from './decision-escalator.js';
import { decisionValidity } from './decision-validity.js';
import { resolveResponseEntities } from './entity-references.js';
import type { RecallService } from './recall.js';
import { digest, type JobRecord } from './store.js';
import { compileDecisionTask, prepareDecisionTask, type DecisionTask } from './decision-task.js';
import { DECISION_LIMITS } from './decision-state.js';
import type { WorldService } from './world-service.js';
import { situationProposalBinding, situationResponseCapabilities } from './situation-context.js';

/** The same response owner handles a supplied action on either model route. */
export function knownDecisionResponse(
  prepared: Awaited<ReturnType<typeof prepareDecision>>,
  selected: string,
): ActorResponse {
  if (!Object.hasOwn(prepared.binding.actions, selected))
    throw new Error('Unknown offered action.');
  const choice = prepared.binding.actions[selected]!;
  if (choice.invocation === null && !choice.purpose) return { operations: [] };
  return actionResponse({
    kind: 'known',
    mode: choice.transition === 'continue' ? 'enqueue' : choice.transition,
    actionId: selected,
    verb: null,
    targetEntityId: null,
    description: null,
  });
}

export interface RetainedDecisionPreparation {
  rootId: string;
  generation: string;
  validity: string;
  prepared: Awaited<ReturnType<typeof prepareDecision>>;
}

/** Reuse this decision's permitted evidence, or rebuild natively after a meaningful change. */
export async function prepareReconsideration(
  service: WorldService,
  recall: RecallService,
  job: JobRecord,
  signal: AbortSignal,
  retained?: RetainedDecisionPreparation,
): Promise<PreparedReconsideration> {
  const state = job.decision;
  if (!state?.higher) throw new Error('Missing admitted reconsideration.');
  const higher = state.higher;
  const actorId = state.actorId,
    generation = service.generation;
  const evidenceIds = [
    ...new Set([
      ...(job.playerSpeechEventId ? [job.playerSpeechEventId] : (job.stimulusEvidenceIds ?? [])),
      ...(job.triggerEvidenceId ? [job.triggerEvidenceId] : []),
    ]),
  ];
  // Routing has already paid for the complete actor-scoped read. Keep its exact
  // source proofs through handoff; unrelated publications do not invalidate them.
  // The existing conversation/source guards and current native admission remain
  // mandatory. This is request-owned, never restored or shared across decisions.
  const reusable =
    retained?.rootId === job.id &&
    retained.generation === generation &&
    retained.validity === decisionValidity(service.world, actorId)
      ? retained.prepared
      : undefined;
  if (reusable) await reusable.validateConversation(false);
  const base =
    reusable ??
    (await prepareDecision(
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
    ));
  const sourceTime = base.diagnostics.sourceTime;
  const prepared = fallbackDecisionActions(
    { ...base, binding: { ...base.binding, decisionId: higher.id } },
    'Native candidates for one reconsideration',
  );
  const validity = decisionValidity(service.world, actorId);
  const response = Object.values(state.groups).some(
    (group) => group.state === 'open' && group.kind === 'response',
  );
  const appraisalOnly = state.groups['q0']?.kind === 'appraisal';
  // A native choice cannot write feelings. Its existing semantic validity already
  // checks relevant feeling conditions, so unrelated appraisal source identities
  // must not veto that choice while a meter drifts or unrelated history changes.
  const appraisal =
    (response || appraisalOnly) &&
    service.world.moduleManifest.appraisals?.definitions.some((definition) => definition.decision)
      ? await bindDecisionAppraisals(
          service,
          actorId,
          state.higher.id,
          prepared.binding.evidenceIds ?? evidenceIds,
          prepared.entityReferences,
          job.triggerEvidenceId ?? job.playerSpeechEventId,
          { sharedExperiences: prepared.sharedExperiences, frame: prepared.situation.frame },
        )
      : undefined;
  if (appraisalOnly && !appraisal?.schema)
    throw new Error('No installed decision appraisal is available.');
  const responseSchemaFor = (offered: typeof prepared.offered) =>
    boundResponseSchema(
      Object.keys(prepared.entityReferences),
      Object.keys(prepared.binding.actions).filter(
        (id) => !/^a\d+$/.test(id) || offered.some((option) => option.id === id),
      ),
      {
        speech: canSpeak(entityGet(service.world.entities, actorId)),
        expressions: supportsManualWork(entityGet(service.world.entities, actorId)),
        proposals: false,
      },
      Object.keys(prepared.binding.knowledgeReferences ?? {}),
      namedClockTimes(service.world),
      activityRequestDescriptors(service.world),
      appraisal?.schema,
      Object.keys(prepared.binding.identityReferences ?? {}),
      Object.keys(prepared.binding.physicalEntityReferences ?? {}),
      situationResponseCapabilities(prepared.situation),
    );
  const current = async () => {
    if (
      signal.aborted ||
      generation !== service.generation ||
      validity !== decisionValidity(service.world, actorId)
    )
      return false;
    await prepared.validateConversation(false);
    return (
      (!appraisal || (await appraisal.current())) &&
      !signal.aborted &&
      generation === service.generation &&
      validity === decisionValidity(service.world, actorId)
    );
  };
  const inputFor = (offered: typeof prepared.offered) => ({
    tasks: {
      q0: appraisalOnly
        ? {
            kind: 'appraisal',
            question:
              'Propose one supported change to my feelings about the initiating situation, using an installed policy and permitted cause. Abstain if no change is justified.',
            valueSchema: appraisal!.schema,
          }
        : response
          ? {
              kind: 'response',
              question:
                'Propose the still-unresolved response to this initiating situation. Speech is optional unless an addressed reply is needed. Use only supplied operations and handles.',
              valueSchema: responseSchemaFor(offered),
            }
          : {
              kind: 'choice',
              question:
                'Choose the personally suitable, currently offered action or deliberate continuation. Abstain if no offered choice is suitable.',
              choices: Object.fromEntries(offered.map((option) => [option.id, option.description])),
            },
    } satisfies Record<string, DecisionTask>,
    context: JSON.stringify({
      sourceTime,
      observationPolicy:
        'Continuous meters and feeling decay are observations from sourceTime; their meaningful conditions must remain unchanged. All current execution prerequisites are checked again.',
      character: prepared.context,
      ...(response ? { choices: offered } : {}),
      appraisals: appraisal?.context,
      reconsiderationReason: higher.reason,
    }),
    instructions: JSON.stringify(prepared.actionGuidance),
  });
  const fits = (offered: typeof prepared.offered) => {
    const input = inputFor(offered);
    const compiled = compileDecisionTask(input.tasks, input.context, input.instructions);
    return (
      Buffer.byteLength(compiled.instructions) + Buffer.byteLength(compiled.context) <=
        DECISION_LIMITS.inputBytes &&
      Buffer.byteLength(JSON.stringify(compiled.schema)) <= DECISION_LIMITS.schemaBytes
    );
  };
  let offered = prepared.offered;
  // The higher-decision wrapper escapes the context and adds its own questions.
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
  const input = inputFor(offered);
  prepareDecisionTask(input.tasks, input.context, input.instructions);
  return {
    ...input,
    bindingDigest: digest({ binding: prepared.binding, validity }),
    sourceTime,
    current,
    async publish(answers, claim) {
      const answer = answers['q0'];
      if (!answer || answer.status !== 'answered' || !(await current()))
        return {
          ok: false,
          code: 'stale',
          message: 'The original unresolved decision is no longer usable.',
        };
      let reply: ActorResponse;
      if ('choice' in answer.value) reply = knownDecisionResponse(prepared, answer.value.choice);
      else if (appraisalOnly) {
        const changes = appraisal!.resolveDecision([answer.value as DecisionAppraisalProposal]);
        reply = {
          operations: [
            {
              localId: 'appraisal',
              requiresAccepted: [],
              talk: null,
              act: null,
              think: null,
              goal: null,
              plan: null,
              note: null,
              name: null,
              appraise: changes[0]!,
            },
          ],
        };
      } else {
        const wire = responseSchema.parse(answer.value);
        const changes =
          appraisal?.resolveDecision(
            wire.operations.flatMap((op) => (op.appraise ? [op.appraise] : [])),
          ) ?? [];
        let next = 0;
        const operations = wire.operations.map(({ appraise, ...operation }) => ({
          ...operation,
          ...(appraise ? { appraise: changes[next++] } : {}),
        }));
        if (!validResponseEnvelope({ operations })) throw new Error('Invalid structured response.');
        reply = resolveResponseEntities(
          { operations },
          prepared.entityReferences,
          prepared.intentionReferences,
          prepared.binding.knowledgeReferences,
          activityRequestDescriptors(service.world),
          prepared.binding.identityReferences,
          prepared.binding.physicalEntityReferences,
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
              validity !== decisionValidity(world, actorId)
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
              prepared.binding.identityReferences,
              prepared.binding.entityLeases,
              situationProposalBinding(prepared.situation, job.semanticCauses),
              service.nativeExecutionPermissions,
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
