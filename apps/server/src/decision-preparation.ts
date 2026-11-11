import {
  entityGet,
  activityRequestDescriptors,
  canSpeak,
  commitActorResponse,
  namedClockTimes,
  supportsManualWork,
  selectedResponseExpressions,
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
import type { DecisionReason } from './decision-state.js';
import type { WorldService } from './world-service.js';
import {
  expandDecisionSituation,
  readSituationQueryResponse,
  SITUATION_QUERY_INSTRUCTIONS,
  withSituationQueries,
} from './decision-situation-query.js';
import { situationProposalBinding, situationResponseCapabilities } from './situation-context.js';

export function reconsiderationResponseCapabilities(
  capabilities: Parameters<typeof boundResponseSchema>[2],
) {
  return { ...capabilities, proposals: false };
}

export function reconsiderationResponseTask(
  valueSchema: NonNullable<DecisionTask['valueSchema']>,
  queryUsed: boolean,
): DecisionTask {
  return {
    kind: 'response',
    question:
      RECONSIDERATION_RESPONSE_QUESTION + (!queryUsed ? ` ${SITUATION_QUERY_INSTRUCTIONS}` : ''),
    valueSchema,
  };
}

export const RECONSIDERATION_RESPONSE_QUESTION =
  'Propose the still-unresolved response to this initiating situation. Speech is optional unless an addressed reply is needed. Use only supplied operations and handles.';

// The response envelope exposes the current character fields in the same
// order as prepareDecision. Optional sections keep their selected encounter
// order; the ordinary readable view may also contain empty display headings.
const currentCharacterFields = [
  'situationQueries',
  'receivedSituation',
  'recentWorkResults',
  'simTime',
  'outing',
  'activityRequests',
  'inspectedContainer',
  'supplyOpportunities',
  'inspectedActions',
  'inspectedMethods',
  'capabilities',
  'expressionGuidance',
  'stimulus',
  'notepad',
  'knowledgeInstructions',
  'triggerFacts',
  'navigation',
  'namedTimes',
  'outputFamilies',
  'currentSupport',
  'publicSurfaces',
  'intentActions',
  'identity',
  'feelings',
  'requiredChoices',
  'aboutMe',
  'now',
  'body',
  'contacts',
  'methodCoverage',
  'inventoryCoverage',
  'commitments',
  'activityCoverage',
  'goal',
  'agency',
  'planOffers',
  'conversation',
  'knowledgeCoverage',
] as const;
const endingCharacterFields = ['reconsideration', 'carryingConcern', 'references'] as const;

function reconsiderationCharacter(
  context: Record<string, unknown>,
  queryAvailable: boolean,
  selectedSections?: readonly string[],
) {
  if (!selectedSections) return { ...context, situationQueries: queryAvailable };
  const character: Record<string, unknown> = {};
  for (const key of currentCharacterFields)
    if (Object.hasOwn(context, key)) character[key] = context[key];
  character['situationQueries'] = queryAvailable;
  const capability = context['capabilities'] as
    | { speech: boolean; expressions: boolean }
    | undefined;
  if (capability)
    character['capabilities'] = { speech: capability.speech, expressions: capability.expressions };
  const agency = context['agency'] as Record<string, unknown> | undefined;
  if (agency) character['agency'] = { outcomeCoverage: agency['outcomeCoverage'], ...agency };
  for (const key of selectedSections)
    if (!Object.hasOwn(character, key) && !endingCharacterFields.some((ending) => ending === key))
      character[key] = context[key];
  if (Object.hasOwn(context, 'experience')) character['experience'] = context['experience'];
  for (const key of endingCharacterFields)
    if (Object.hasOwn(context, key)) character[key] = context[key];
  return character;
}

export function reconsiderationContextValue(input: {
  sourceTime: number;
  context: Record<string, unknown>;
  selectedSections?: readonly string[];
  queryUsed: boolean;
  response: boolean;
  expansion?: object;
  offered: readonly { id: string; description: string }[];
  appraisals: unknown;
  reason: DecisionReason;
}) {
  return {
    sourceTime: input.sourceTime,
    observationPolicy:
      'Continuous meters and feeling decay are observations from sourceTime; their meaningful conditions must remain unchanged. All current execution prerequisites are checked again.',
    character: reconsiderationCharacter(
      input.context,
      input.response && !input.queryUsed,
      input.selectedSections,
    ),
    ...(input.expansion ? { requestedReceivedEvidence: input.expansion } : {}),
    ...(input.response ? { choices: input.offered } : {}),
    appraisals: input.appraisals,
    reconsiderationReason: input.reason,
  };
}

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
  try {
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
    let queryUsed = false;
    let expansion: Awaited<ReturnType<typeof expandDecisionSituation>> | undefined;
    const responseSchemaFor = (offered: typeof prepared.offered) => {
      const schema = boundResponseSchema(
        Object.keys(prepared.entityReferences),
        Object.keys(prepared.binding.actions).filter(
          (id) => !/^a\d+$/.test(id) || offered.some((option) => option.id === id),
        ),
        reconsiderationResponseCapabilities({
          speech: canSpeak(entityGet(service.world.entities, actorId)),
          expressions: supportsManualWork(entityGet(service.world.entities, actorId)),
          expressionVerbs: selectedResponseExpressions(
            service.world,
            supportsManualWork(entityGet(service.world.entities, actorId)),
          ).expressionVerbs,
        }),
        Object.keys(prepared.binding.knowledgeReferences ?? {}),
        namedClockTimes(service.world),
        activityRequestDescriptors(service.world),
        appraisal?.schema,
        Object.keys(prepared.binding.identityReferences ?? {}),
        Object.keys(prepared.binding.physicalEntityReferences ?? {}),
        situationResponseCapabilities(prepared.situation),
      );
      return queryUsed
        ? schema
        : withSituationQueries(schema, prepared.situation.policy.maximumQueries);
    };
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
            ? reconsiderationResponseTask(responseSchemaFor(offered), queryUsed)
            : {
                kind: 'choice',
                question:
                  'Choose the personally suitable, currently offered action or deliberate continuation. Abstain if no offered choice is suitable.',
                choices: Object.fromEntries(
                  offered.map((option) => [option.id, option.description]),
                ),
              },
      } satisfies Record<string, DecisionTask>,
      context: JSON.stringify(
        reconsiderationContextValue({
          sourceTime,
          context: prepared.context,
          queryUsed,
          response,
          expansion,
          offered,
          appraisals: appraisal?.context,
          reason: higher.reason,
        }),
      ),
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
    const fitInput = () => {
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
      return input;
    };
    const input = fitInput();
    const result: PreparedReconsideration = {
      ...input,
      dispose: base.dispose,
      bindingDigest: digest({ binding: prepared.binding, validity }),
      sourceTime,
      current,
      dispatch: (start) =>
        service.publishRecall(async () => {
          if (!(await current())) throw new Error('Decision evidence changed before transport.');
          return { result: start() };
        }),
      async expand(answers) {
        const answer = answers['q0'];
        if (!response || queryUsed || !answer || answer.status !== 'answered') return false;
        const value = readSituationQueryResponse(
          answer.value,
          prepared.situation.policy.maximumQueries,
        );
        if (!value.queries?.length) return false;
        expansion = await expandDecisionSituation(prepared, value.queries);
        queryUsed = true;
        Object.assign(result, fitInput(), {
          bindingDigest: digest({ binding: prepared.binding, validity }),
        });
        return true;
      },
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
          const { queries: _queries, ...value } = answer.value as Record<string, unknown>;
          const wire = responseSchema.parse(value);
          const changes =
            appraisal?.resolveDecision(
              wire.operations.flatMap((op) => (op.appraise ? [op.appraise] : [])),
            ) ?? [];
          let next = 0;
          const operations = wire.operations.map(({ appraise, ...operation }) => ({
            ...operation,
            ...(appraise ? { appraise: changes[next++] } : {}),
          }));
          if (!validResponseEnvelope({ operations }))
            throw new Error('Invalid structured response.');
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
    return result;
  } catch (error) {
    base.dispose();
    throw error;
  }
}
