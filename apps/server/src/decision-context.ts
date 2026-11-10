import {
  resultEvidenceId,
  resultEvidenceMatchesReceipt,
  type ResultEvidence,
  type TemporalHistorySelection,
} from '@open-legend/domain';
import { currentBodyGrant } from '@open-legend/domain';
import {
  captureTemporalReceiptPrefix,
  contributionFactKey,
  PERSONAL_EVIDENCE_PREPARATION,
  selectedAttentionPolicy,
  currentDetailedAttention,
  selectTemporalHistory,
  selectCapturedTemporalHistory,
} from '@open-legend/domain';
import {
  captureSituation,
  completeSituationHistory,
  temporalHistoryForModel,
} from './situation-context.js';
import {
  prepareSupplyOpportunityContext,
  renderSupplyOpportunityContext,
} from './supply-opportunities.js';
import { memorySourceProof } from './memory-repository.js';
import { entityGet } from '@open-legend/domain';
import {
  bindNativeChoice,
  currentWorkIdentity,
  prospectiveWork,
  canonicalJson,
} from '@open-legend/domain';
import { outingContext } from './outing-view.js';
import { remainingActivityText, learnedActivityCandidates } from './activity-context.js';
import { formatPausedWork, formatDecisionWorkHandling } from './decision-work-context.js';
import { MemoryReadCache, type CognitionPreparation } from './memory-repository.js';
import { decisionObservation } from './decision-observation.js';
import {
  requiredOutcomeEvidence,
  narrationTemplate,
  renderNarration,
  acquiredActivities,
  experienceSourceKey,
  activityRequestChoices,
  activityRequestDescriptors,
  itemOutputFamilies,
  selectedResponseExpressions,
  portableItemIds,
  worldPosition,
  worldSupport,
} from '@open-legend/domain';
import { knowledgePolicyInstructions, namedClockTimes } from '@open-legend/domain';
import { generalKnowledgeContext, selectedKnowledgeReferences } from './knowledge-context.js';
import {
  entityLabel,
  entityReferenceMap,
  entityHandle,
  projectEntityMarkers,
  personalAttributionRevision,
  intentionEntityReferences,
  capturePersonalAttributionReader,
} from './entity-references.js';
import { digest } from './store.js';
import { contextSections, type SharedModelExperience } from './perceived-context.js';
import { type AttemptBinding } from '@open-legend/domain';
import {
  bodyContext,
  bodyPolicy,
  attributeDefinition,
  readAttribute,
  supportsManualWork,
  canSpeak,
} from '@open-legend/domain';
import { activeAppraisals } from '@open-legend/domain';

import { type CognitionBinding, mindFor } from '@open-legend/domain';
import type { JudgeRequest, JudgeValue } from '@open-legend/ai';
import {
  ContextBudgetError,
  CONTEXT_BYTE_LIMIT,
  npcCandidates,
  planningCandidates,
  candidateChoice,
  type CandidateAction,
} from './context.js';
import { domainCommand } from './domain-command.js';
import { candidateSet, gameTime, captureRecallSelection, type RecallService } from './recall.js';
import type { WorldService } from './world-service.js';
import { COGNITION_VERSION, RESPONSE_INSTRUCTIONS } from './cognition-contracts.js';
import {
  readableDecisionContext,
  measureReadableDecisionContext,
  responseReferences,
  responseTrigger,
  responseTriggerContext,
} from './response-context.js';
import { attentionRequest } from './attention-request.js';
import {
  ACTION_EVIDENCE_POLICY,
  attentionIncludes,
  JEV_ACTION_THRESHOLD,
} from './jev-questions.js';
import { ACTION_RETRIEVAL_LIMIT } from './action-retrieval.js';
import { navigationInstructions } from './navigation-contracts.js';
import {
  buildConversationContext,
  CONVERSATION_PREPARATION_BYTES,
  type ConversationGenerate,
} from './conversation-context.js';
import { captureExperienceContext } from './experience-context.js';
import { decisionFeelings } from './appraisal-context.js';
import { formatDecisionSelfContext } from './decision-self-context.js';
import { decisionActivityFactsFromRead, ACTIVITY_COVERAGE } from './decision-activity-facts.js';

import {
  captureTemporalHistoryReadContext,
  temporalHistoryWindow,
  type TemporalHistoryReadContext,
  type TemporalHistoryQuery,
} from './temporal-storage.js';
import type { MemoryScope, CurrentMemorySource, TemporalSourceFence } from './memory-repository.js';

const currentWithoutDatabase = () => true;
const releaseWithoutDatabase = () => {};

async function validateCapturedSituation(
  service: WorldService,
  generation: string,
  capturedSituation: ReturnType<typeof captureSituation>,
  evidenceScope: MemoryScope | undefined,
  sourceFence: TemporalSourceFence | undefined,
) {
  if (generation !== service.generation || !capturedSituation.valid(service.world))
    throw new Error('Received situation evidence changed during this decision.');
  if (evidenceScope && service.store.memories) {
    const selections = Object.values(capturedSituation.receiptDetails);
    if (!sourceFence) throw new Error('Personal source validation has no request owner.');
    if (
      !(await sourceFence.validate(selections, () => ({
        ...temporalHistoryWindow(service.world, evidenceScope.actorId),
        maxAgeSeconds: capturedSituation.historyMaxAgeSeconds,
      })))
    )
      throw new Error('Personal evidence was withdrawn during this decision.');
  }
  if (generation !== service.generation || !capturedSituation.valid(service.world))
    throw new Error('Personal evidence changed during context validation.');
}
async function validateCapturedDecision(
  service: WorldService,
  actorId: string,
  conversationValidate: Awaited<ReturnType<typeof buildConversationContext>>['validate'],
  sources: CurrentMemorySource[],
  rememberedSubjects: ReadonlySet<string>,
  rememberedAttribution: string,
  outcomeBinding: string,
  validateSituation: () => Promise<void>,
  flush = true,
) {
  await conversationValidate(flush, sources);
  // Historical interpretation survives contact loss; identity/source grants and
  // executable effects remain fenced by their separate existing owners.
  if (
    personalAttributionRevision(service.world, actorId, rememberedSubjects) !==
    rememberedAttribution
  )
    throw new Error('A remembered participant changed identity; discard stale context.');
  if (outcomeBinding !== JSON.stringify(requiredOutcomeEvidence(service.world, actorId)))
    throw new Error(
      'Action outcomes changed during the decision; reconsider with current memories.',
    );
  await validateSituation();
}
async function readCapturedSituationHistory(
  service: WorldService,
  evidenceScope: MemoryScope | undefined,
  context: TemporalHistoryReadContext,
  presentation: ReturnType<typeof captureExperienceContext>,
  validate: (flush?: boolean) => Promise<void>,
  query: TemporalHistoryQuery,
) {
  await validate();
  const result =
    service.store.memories && evidenceScope
      ? await service.store.memories.temporalHistory(evidenceScope, query, context)
      : selectCapturedTemporalHistory(context, query);
  await validate(false);
  const labels = captureExperienceContext(service.world, context.actorId, presentation.frame, [
    result,
  ]);
  return {
    ...result,
    hasMore: result.hasMore ?? false,
    presentation: { ...presentation, subjectLabel: labels.subjectLabel },
  };
}

/** Reuse the same permitted perception used to select actions and budget the prompt. */
function activityDecisionFacts(
  world: import('@open-legend/domain').WorldState,
  actorId: string,
  observed: NonNullable<ReturnType<typeof decisionObservation>>,
) {
  const selected = observed.inspectedContainer;
  const available = activityRequestChoices(world, actorId, observed);
  return decisionActivityFactsFromRead({
    simTime: world.simTime,
    outing: outingContext(world, actorId),
    requests: activityRequestDescriptors(world),
    available,
    ...(selected
      ? {
          inspectedContainer: {
            entityId: selected.id,
            name: selected.name,
            revision: selected.revision,
            ...(selected.load !== undefined
              ? { load: selected.load, capacity: selected.capacity }
              : {}),
            more: selected.inspection.more,
            items: selected.items.map((item) => ({
              entityId: item.id,
              definitionId: item.definitionId,
              name: world.itemDefinitions[item.definitionId]!.name,
              quantity: item.quantity,
              revision: item.revision,
            })),
          },
        }
      : {}),
  });
}
function activityDecisionReferences(facts: ReturnType<typeof activityDecisionFacts>): string[] {
  return [
    ...new Set([
      ...facts.activityRequests.choices.flatMap((choice) =>
        'entityId' in choice ? [choice.entityId] : [],
      ),
      ...(facts.inspectedContainer
        ? [
            facts.inspectedContainer.entityId,
            ...facts.inspectedContainer.items.map((item) => item.entityId),
          ]
        : []),
    ]),
  ];
}

function socialEntityIds(world: Parameters<typeof activeAppraisals>[0], actorId: string): string[] {
  return [
    ...new Set([
      ...activeAppraisals(world, actorId).flatMap((entry) =>
        entry.targetId ? [entry.targetId] : [],
      ),
    ]),
  ].filter((id) => !!entityGet(world.entities, id));
}

export function fitActionCandidates<T extends { description: string }>(
  context: Record<string, unknown>,
  candidates: T[],
  reservedBytes = 0,
  coverage: 'optional' | 'complete-required' = 'optional',
  contextBytes: (
    context: Record<string, unknown>,
    actions: { id: string; description: string }[],
    includeActions: boolean,
  ) => number = (context, actions, includeActions) =>
    measureReadableDecisionContext(context, actions, includeActions).bytes,
): T[] {
  if (coverage === 'complete-required') {
    const offered = candidates.map((candidate, index) => ({
      id: `a${index}`,
      description: candidate.description,
    }));
    const bytes =
      contextBytes(context, offered, true) +
      Buffer.byteLength(RESPONSE_INSTRUCTIONS) +
      reservedBytes;
    if (bytes > CONTEXT_BYTE_LIMIT)
      throw new ContextBudgetError('The complete required choice set exceeds the input budget.');
    return candidates;
  }
  let remaining =
    CONTEXT_BYTE_LIMIT -
    reservedBytes -
    contextBytes(context, [], true) -
    Buffer.byteLength(RESPONSE_INSTRUCTIONS);
  return candidates.filter((candidate, index) => {
    const bytes = Buffer.byteLength(`- a${index}: ${candidate.description}\n`) + 64;
    if (bytes > remaining) {
      return false;
    }
    remaining -= bytes;
    return true;
  });
}

function preparedChoiceKey(candidate: CandidateAction): string {
  // Different perceived targets may share an approach tile; keep each intent selectable.
  return canonicalJson([
    candidate.command?.type === 'move' ? candidate.id : candidate.command,
    candidate.transition,
    candidate.nativeInvocation,
    candidate.purpose,
    candidate.subjectIds,
  ]);
}
function distinctActions(candidates: CandidateAction[]): CandidateAction[] {
  return [
    ...new Map(candidates.map((candidate) => [preparedChoiceKey(candidate), candidate])).values(),
  ];
}

interface ActionInspection {
  actorId: string;
  generation: string;
  eventId: string;
  after: number;
  methodAfter: number;
  next: number | null;
  methodNext: number | null;
  methodIds: string[];
  catalogueIds: string[];
}

/** Inspection offers keep their source page while bindings and prerequisites refresh.
 * A cursor describes this actor's inspected catalogue, never another actor or timeline.
 */
function decisionActionCandidates(
  service: WorldService,
  actorId: string,
  observed: ReturnType<typeof decisionObservation>,
  inspection?: ActionInspection,
): CandidateAction[] {
  const current = service.world.actionExperience.learning[actorId]?.inspection;
  const sameInspection =
    inspection &&
    inspection.actorId === actorId &&
    inspection.generation === service.generation &&
    inspection.eventId === current?.eventId &&
    inspection.after === current.after &&
    inspection.methodAfter === (current.methodAfter ?? 0);
  const sameCatalogue =
    sameInspection &&
    JSON.stringify(inspection.catalogueIds) ===
      JSON.stringify(acquiredActivities(service.world, actorId).map((method) => method.id));
  return distinctActions([
    ...(sameInspection
      ? learnedActivityCandidates(service, actorId, observed, 0, inspection.methodIds)
      : []),
    ...(sameCatalogue && inspection.methodNext !== null
      ? [
          {
            id: 'inspect-methods-next',
            description:
              'Inspect the next page of my own learned activities and their requirements.',
            command: {
              type: 'inspect-activities' as const,
              historyAfter: inspection.after,
              methodAfter: inspection.methodNext,
            },
          },
        ]
      : []),
    ...(sameInspection && inspection.next !== null
      ? [
          {
            id: 'inspect-activities-next',
            description: 'Inspect the next page of my own recorded actions and results.',
            command: { type: 'inspect-activities' as const, historyAfter: inspection.next },
          },
        ]
      : []),
    ...(sameInspection && !sameCatalogue
      ? [
          {
            id: 'inspect-methods-changed',
            description:
              'My learned activities changed since inspection. Inspect their current requirements again.',
            command: {
              type: 'inspect-activities' as const,
              historyAfter: inspection.after,
              methodAfter: 0,
            },
          },
        ]
      : []),
    ...npcCandidates(service, actorId, observed),
    ...planningCandidates(service, actorId, observed),
  ]);
}

/** Paused work is part of the actor's own intentions: it resumes when current work ends. */
function pausedWorkText(world: import('@open-legend/domain').WorldState, actorId: string) {
  const paused = entityGet(world.entities, actorId)?.actor?.agency.suspended;
  return formatPausedWork(paused ? remainingActivityText(world, actorId, paused) : null);
}

function workTransitionContext(world: import('@open-legend/domain').WorldState, actorId: string) {
  return (['continue', 'replace', 'interrupt'] as const).map((mode) => {
    const work = prospectiveWork(world, actorId, mode);
    if ('ok' in work)
      return formatDecisionWorkHandling({ handling: mode, unavailable: work.message });
    return formatDecisionWorkHandling({
      handling: mode,
      outcome: work.outcome,
      lostWorkSeconds: work.lostWorkSeconds,
      spentInputs: work.spentInputs.map((input) => ({
        material: world.itemDefinitions[input.definitionId]?.name ?? 'Unknown material',
        quantity: input.quantity,
      })),
      pausedWork: work.pausedWork,
      recovery: work.recovery,
    });
  });
}

export interface RequiredDecisionChoices {
  candidates: CandidateAction[];
  facts: Record<string, unknown>;
  feelings: import('@open-legend/domain').AppraisalScope[];
}

export async function prepareDecision(
  service: WorldService,
  recall: RecallService,
  actorId: string,
  jobId: string,
  stimulus: string,
  requiredIds: string[],
  judge: (r: Omit<JudgeRequest, 'requestId' | 'signal'>) => Promise<JudgeValue>,
  signal: AbortSignal,
  budgetCeiling = service.config.budgetUsd,
  includeCurrentConversation = false,
  attempt = 0,
  triggerEvidenceId?: string,
  compact?: ConversationGenerate,
  mode: 'ordinary' | 'native-only' = 'ordinary',
  requiredChoices?: RequiredDecisionChoices,
) {
  let sourceFence: TemporalSourceFence | undefined;
  let prepared = false;
  try {
    await service.flushMemorySources(actorId);
    const readWorld = () => service.world;
    const generation = service.generation;
    const accessRevision = service.store.memories?.sourceAccessRevision({
      worldId: service.world.id,
      actorId,
    });
    const awaitEvidenceCut = async (through = service.durabilityTicket()) => {
      // A finalized request waits for this one accepted prefix; moving actors or
      // other players cannot turn it into a chase of the latest publication.
      await service.whenDurable(through);
      signal.throwIfAborted();
      if (
        generation !== service.generation ||
        accessRevision !==
          service.store.memories?.sourceAccessRevision({ worldId: service.world.id, actorId }) ||
        service.store.memories?.sourceEditPending({ worldId: service.world.id, actorId })
      )
        throw new Error('Personal evidence changed during context validation.');
    };

    const inspection = readWorld().actionExperience.learning[actorId]?.inspection;
    const inspected =
      inspection && inspection.eventId === triggerEvidenceId
        ? await service.activityHistoryForActor(
            actorId,
            inspection.after,
            inspection.methodAfter ?? 0,
          )
        : undefined;
    stimulus = projectEntityMarkers(stimulus, readWorld(), actorId);
    const observed = decisionObservation(readWorld(), actorId);
    const observedWorld = new WeakRef(service.world);
    if (!observed) throw new Error('Actor unavailable.');
    let includeConversation =
      includeCurrentConversation ||
      requiredIds.some((id) => service.worldEvent(id)?.type === 'speech');
    const initialWorldId = readWorld().id;
    const receiptPrefix = captureTemporalReceiptPrefix(readWorld(), actorId);
    const outcomeEvidence = requiredOutcomeEvidence(readWorld(), actorId);
    const recentResults = outcomeEvidence.filter(
      (source): source is Extract<ResultEvidence, { kind: 'recent' }> => source.kind === 'recent',
    );
    const resultSubjects = [...new Set(recentResults.map((source) => source.subject))];
    const initialResultHistory = resultSubjects.length
      ? captureTemporalHistoryReadContext(readWorld(), actorId, { subjects: resultSubjects })
      : undefined;
    const historyPolicy = selectedAttentionPolicy(readWorld()).scene;
    const historySubjects = currentDetailedAttention(readWorld(), actorId).map(
      (entry) => entry.exposure.track,
    );
    const initialHistory = captureTemporalHistoryReadContext(readWorld(), actorId, {
      subjects: historySubjects,
    });
    const capturedSituation = captureSituation(readWorld(), actorId, jobId, {
      entries: [],
      incomplete: true,
    });
    const head = await service.store.records?.head();
    // The singular trigger can sit outside the coalesced list; keep its source binding.
    const outcomeIds = outcomeEvidence.map((source) => resultEvidenceId(source)!);
    const accountOutcomeIds = outcomeEvidence.flatMap((source) =>
      source.kind === 'account' ? [source.id] : [],
    );
    const evidenceIds = [
      ...new Set([...requiredIds, ...(triggerEvidenceId ? [triggerEvidenceId] : [])]),
    ];
    const evidenceScope = head
      ? { worldId: initialWorldId, actorId, generation: head.generation }
      : undefined;
    if (evidenceScope && service.store.memories)
      sourceFence = service.store.memories.captureTemporalSourceFence(evidenceScope, signal);
    const bodies = new MemoryReadCache();
    const retainedEvidence =
      service.store.memories && evidenceScope
        ? await service.store.memories.evidence(evidenceScope, evidenceIds, bodies)
        : undefined;
    const evidence = retainedEvidence
      ? retainedEvidence.flatMap((entry) => (entry.awareness ? [entry.awareness] : []))
      : (readWorld().experience?.awareness[actorId] ?? []).filter((entry) =>
          evidenceIds.includes(entry.eventId),
        );
    const recentHistory =
      service.store.memories && evidenceScope
        ? await service.store.memories.temporalHistory(
            evidenceScope,
            {
              subjects: historySubjects,
              through: initialHistory.at,
              cut: receiptPrefix,
              bytes: PERSONAL_EVIDENCE_PREPARATION.bytes,
              limit: historyPolicy.historyReceipts,
            },
            initialHistory,
          )
        : selectCapturedTemporalHistory(initialHistory, {
            cut: receiptPrefix,
            bytes: PERSONAL_EVIDENCE_PREPARATION.bytes,
            limit: historyPolicy.historyReceipts,
          });
    let selectedResults: TemporalHistorySelection = { entries: [], incomplete: false };
    if (initialResultHistory) {
      const resultQuery = {
        receipts: recentResults.map((source) => source.receipt),
        subjects: resultSubjects,
        kinds: ['action-result'] as const,
        cut: receiptPrefix,
        through: initialResultHistory.at,
        bytes: PERSONAL_EVIDENCE_PREPARATION.bytes,
        limit: recentResults.length,
      };
      const resultHistory =
        service.store.memories && evidenceScope
          ? await service.store.memories.temporalHistory(
              evidenceScope,
              resultQuery,
              initialResultHistory,
            )
          : selectCapturedTemporalHistory(initialResultHistory, resultQuery);
      selectedResults = {
        ...resultHistory,
        entries: resultHistory.entries.filter(({ receipt }) =>
          recentResults.some((source) => resultEvidenceMatchesReceipt(source, receipt)),
        ),
      };
    }
    // Size the same received measurements that this decision will actually use,
    // before optional paid selection. Later waits cannot replace them with a new
    // scene or make older retained changes newly observed.
    const representedObservations = evidence.flatMap((entry) => [
      ...(entry.observation ? [entry.observation] : []),
      ...(entry.observations ?? []),
    ]);
    completeSituationHistory(
      capturedSituation,
      recentHistory,
      representedObservations.map((observation) => ({
        observation,
        keys: observation.facets.map((facet) => contributionFactKey(observation, facet.ordinal)),
      })),
      captureExperienceContext(readWorld(), actorId, capturedSituation.frame, [
        recentHistory,
        representedObservations,
      ]),
    );
    capturedSituation.bindHistory(selectedResults);
    const recentWorkResults = selectedResults.entries.length
      ? temporalHistoryForModel(
          captureExperienceContext(readWorld(), actorId, capturedSituation.frame, [
            selectedResults,
          ]),
          actorId,
          selectedResults,
          capturedSituation.frame,
        )
      : undefined;
    const validateSituation = validateCapturedSituation.bind(
      undefined,
      service,
      generation,
      capturedSituation,
      evidenceScope,
      sourceFence,
    );
    const knownSupplyPlaces = await prepareSupplyOpportunityContext(
      service.store.memories,
      evidenceScope,
      observed.supplyOpportunities,
    );
    const supplyOpportunities = renderSupplyOpportunityContext(
      observed.supplyOpportunities,
      knownSupplyPlaces,
    );
    if (triggerEvidenceId && evidence.some((entry) => entry.eventId === triggerEvidenceId))
      stimulus = projectEntityMarkers(
        responseTrigger(service, actorId, triggerEvidenceId, stimulus, evidence),
        readWorld(),
        actorId,
      );
    includeConversation ||= evidence.some((entry) => !!entry.speech);
    const preparation: CognitionPreparation | undefined =
      service.store.memories && evidenceScope
        ? {
            scope: evidenceScope,
            bodies,
            conversation: await service.store.memories.context(
              evidenceScope,
              evidenceIds,
              includeConversation,
              CONVERSATION_PREPARATION_BYTES,
            ),
          }
        : undefined;
    const planning = requiredChoices ? [] : planningCandidates(service, actorId, observed);
    const catalogueIds = acquiredActivities(readWorld(), actorId).map((method) => method.id);
    const actionInspection: ActionInspection | undefined =
      inspected && inspection
        ? {
            actorId,
            generation,
            eventId: inspection.eventId,
            after: inspection.after,
            methodAfter: inspection.methodAfter ?? 0,
            next: inspected.next,
            methodNext: inspected.methodNext,
            methodIds: catalogueIds.slice(
              inspection.methodAfter ?? 0,
              inspected.methodNext ?? catalogueIds.length,
            ),
            catalogueIds,
          }
        : undefined;
    const availableActions = requiredChoices
      ? distinctActions(requiredChoices.candidates)
      : decisionActionCandidates(service, actorId, observed, actionInspection);
    const requiredNative = requiredChoices
      ? (() => {
          const expected = currentWorkIdentity(readWorld(), actorId);
          const choices = availableActions.flatMap((candidate) => {
            if (candidate.command && candidate.nativeInvocation)
              throw new Error('A prepared choice cannot bind two different first invocations.');
            const choice = candidateChoice(candidate, actorId, jobId, expected);
            return choice.invocation
              ? [{ invocation: choice.invocation, transition: choice.transition }]
              : [];
          });
          const prepared = service.prepareNativeCommandChoices(choices);
          for (const choice of prepared.choices) {
            const available = 'ok' in choice ? choice : choice.outcome;
            if (!available.ok && !['combat-recovery', 'evasion-recovery'].includes(available.code))
              throw new Error(`A required choice became unavailable: ${available.message}`);
          }
          return { options: choices.length, physicalPreparations: prepared.physicalPreparations };
        })()
      : undefined;
    let planOffers = [...planning]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((candidate, index) => ({
        ...candidate,
        id: `p${index}`,
      }));
    const intentActions = (requiredChoices ? [] : observed.actor.actor!.agency.attempts).flatMap(
      (attempt, index) => [
        {
          id: `w${index}`,
          description: `Decline/withdraw pending intent: ${attempt.description}`,
          command: { type: 'withdraw-attempt' as const, id: jobId, actorId, attemptId: attempt.id },
        },
        ...(attempt.alternative
          ? [
              {
                id: `c${index}`,
                description: `Accept this revised action? ${attempt.alternative.fulfillment.executableDescription}. Not fulfilled: ${attempt.alternative.fulfillment.omitted.map((o) => o.requirement).join('; ')}. ${attempt.alternative.fulfillment.reason}`,
                command: {
                  type: 'confirm-attempt' as const,
                  id: jobId,
                  actorId,
                  attemptId: attempt.id,
                },
              },
            ]
          : []),
      ],
    );
    // Conversation preparation already guarantees these sources through its shared,
    // validated account. Do not turn the actor's latest utterance into duplicate recall.
    const conversationOutcomeIds = new Set(
      preparation?.conversation.sources.map((source) => source.id),
    );
    // Work results and current causes remain required independently of optional dialogue.
    const recallIds = [...new Set([...evidenceIds, ...accountOutcomeIds])];
    const snapshotActor = observed.actor.actor!;
    const acceptedDocuments = readWorld().minds?.[actorId]?.documents;
    const selfContext = formatDecisionSelfContext({
      label: entityLabel(readWorld(), observed.actor, actorId),
      species: snapshotActor.species,
      traits: snapshotActor.traits,
      mind: {
        accepted: !!acceptedDocuments?.length,
        documents: acceptedDocuments?.length
          ? acceptedDocuments
          : mindFor(readWorld(), actorId).documents,
      },
      goals: snapshotActor.agency.goals,
    });
    const requiredActivity = activityDecisionFacts(readWorld(), actorId, observed);
    const requiredContext: Record<string, unknown> = {
      situationQueries: mode !== 'native-only',
      receivedSituation: capturedSituation.packet,
      ...(recentWorkResults ? { recentWorkResults } : {}),
      ...requiredActivity,
      ...(supplyOpportunities.length ? { supplyOpportunities } : {}),
      capabilities: {
        speech: canSpeak(observed.actor),
        expressions: supportsManualWork(observed.actor),
      },
      expressionGuidance: selectedResponseExpressions(
        readWorld(),
        supportsManualWork(observed.actor),
      ).expressionGuidance,
      stimulus,
      notepad: generalKnowledgeContext(readWorld(), actorId),
      knowledgeInstructions: readWorld().knowledgePolicy
        ? knowledgePolicyInstructions(readWorld().knowledgePolicy!)
        : 'Knowledge is unavailable.',
      triggerFacts:
        responseTriggerContext(
          service,
          actorId,
          triggerEvidenceId,
          evidence,
          capturedSituation.frame,
        ) ?? null,
      navigation: navigationInstructions(readWorld(), true),
      namedTimes: namedClockTimes(readWorld()),
      outputFamilies: itemOutputFamilies(readWorld()),
      currentSupport: worldSupport(observed.actor),
      publicSurfaces:
        readWorld().map.spatial.disclosure === 'public'
          ? readWorld().map.spatial.surfaces.map(({ id, name }) => ({ id, name }))
          : [],
      intentActions: intentActions.map(({ id, description }) => ({ id, description })),
      planOffers: [],
      references: responseReferences(
        readWorld(),
        actorId,
        observed.visibleEntities.map((entity) => entity.id),
        requiredIds,
        socialEntityIds(readWorld(), actorId),
        evidence,
        [],
        [],
        activityDecisionReferences(requiredActivity),
        [],
        capturedSituation.frame,
      ).references,
      identity: selfContext.identity,
      feelings: decisionFeelings(readWorld(), actorId, requiredChoices?.feelings),
      ...(requiredChoices ? { requiredChoices: requiredChoices.facts } : {}),
      aboutMe: selfContext.aboutMe,
      now: gameTime(
        readWorld().simTime,
        readWorld().statusEffectPolicy.clockOffsetHours,
        readWorld().presentation?.calendar?.dayLabel,
      ),
      body: bodyContext(readWorld(), observed.actor),
      contacts: observed.contacts.map((c) => c.text),
      goal: selfContext.goal,
      commitments: (readWorld().memories[actorId] ?? [])
        .filter(
          (memory) =>
            memory.obligation &&
            !memory.resolved &&
            ['active', 'overdue'].includes(memory.obligation.status) &&
            !(readWorld().experience?.forgotten[actorId] ?? []).includes(memory.id),
        )
        .map(
          (memory) =>
            `${memory.summary}${memory.obligation?.dueAt !== undefined ? ` Due in ${Math.max(0, memory.obligation.dueAt - readWorld().simTime)} game seconds.` : ''}`,
        ),
      activityCoverage: ACTIVITY_COVERAGE,
      agency: {
        outcomeCoverage: '',
        goals: snapshotActor.agency.goals,
        plan: remainingActivityText(service.world, actorId),
        paused: pausedWorkText(service.world, actorId),
        choicesForCurrentWork: workTransitionContext(readWorld(), actorId),
        planRevision: snapshotActor.agency.plan?.revision ?? 0,
        attempts: snapshotActor.agency.attempts,
      },
      ...(inspected
        ? {
            inspectedActions: inspected.entries.map((entry) => entry.text),
            inspectedMethods: inspected.methods.map((method) => `${method.text}. ${method.status}`),
          }
        : {}),
      conversation: [],
      surroundings: [],
      possessions: [],
      ...(observed.methodCoverage.paged ? { methodCoverage: observed.methodCoverage } : {}),
      ...(observed.inventoryCoverage.paged
        ? { inventoryCoverage: observed.inventoryCoverage }
        : {}),
    };
    const carryingConcern = bodyPolicy(readWorld())?.carryingConcern;
    const carryingMeter =
      carryingConcern && attributeDefinition(readWorld(), carryingConcern.attributeId);
    if (
      carryingConcern &&
      carryingMeter &&
      readAttribute(readWorld(), observed.actor, carryingMeter) !== undefined &&
      !observed.inventoryCoverage.paged &&
      !observed.inventory.some((item) =>
        readWorld().itemDefinitions[item.definitionId]?.properties.some(
          (property) => property === carryingConcern.itemProperty,
        ),
      )
    )
      requiredContext['carryingConcern'] = renderNarration(
        readWorld(),
        narrationTemplate(carryingConcern.text, {
          subject: entityGet(readWorld().entities, actorId),
        }),
        actorId,
      );
    if (readWorld().innerWorlds?.[actorId]?.reconsiderationRequired)
      requiredContext['reconsideration'] =
        'Some remembered evidence was corrected or forgotten. Reconsider affected beliefs; old beliefs may be mistaken.';
    const allPlanActions = Object.fromEntries(
      planOffers
        .map((candidate) => [
          candidate.id,
          bindNativeChoice(
            readWorld(),
            actorId,
            domainCommand(candidate.command!, actorId, jobId),
            candidate.transition ?? 'replace',
          ),
        ])
        .concat(
          intentActions.map((candidate) => [
            candidate.id,
            bindNativeChoice(readWorld(), actorId, candidate.command, 'continue'),
          ]),
        ),
    );
    const recallSelection = captureRecallSelection(
      readWorld(),
      actorId,
      observed.visibleEntities.map((entity) => entity.id),
    );
    const preparedPrivacy = digest({
      forgotten: readWorld().experience?.forgotten[actorId] ?? [],
      corrections: readWorld().experience?.corrections?.[actorId] ?? {},
    });
    const sourceWorld = observedWorld;
    // All later optional work owns finite evidence and presentation, rather than
    // retaining the immutable simulation root across a model wait.
    const candidates = await recall.candidates(
      () => service.world,
      actorId,
      observed,
      recallIds,
      [],
      [],
      stimulus,
      `${jobId}:attempt:${attempt}`,
      signal,
      budgetCeiling,
      preparation,
      requiredChoices ? 'native-only' : mode,
    );
    const availableMemoryIds = new Set([
      ...selectedResults.entries.map(({ receipt }) => receipt.id),
      ...candidates.flatMap((candidate) => candidate.sourceIds ?? [candidate.id]),
    ]);
    const missingOutcomes = outcomeIds.filter((id) => !availableMemoryIds.has(id)).length;
    const outcomeCoverage = missingOutcomes
      ? `${missingOutcomes} recent work records are unavailable under current memory permissions/retention. Base decisions only on available memories and current evidence; do not reconstruct their effects from execution status.`
      : 'Recent work results are included through the same personal memories as other experiences.';
    const attribution = capturePersonalAttributionReader(
      service.world,
      actorId,
      candidates.flatMap((candidate) => candidate.entityIds),
    );
    (requiredContext['agency'] as Record<string, unknown>)['outcomeCoverage'] = outcomeCoverage;
    let requiredBytes =
      Buffer.byteLength(readableDecisionContext(requiredContext, [], false)) +
      Buffer.byteLength(RESPONSE_INSTRUCTIONS);
    const largestActionOffers = [...availableActions]
      .sort((a, b) => Buffer.byteLength(b.description) - Buffer.byteLength(a.description))
      .slice(0, requiredChoices ? undefined : ACTION_RETRIEVAL_LIMIT)
      .map((candidate, index) => ({ id: `a${index}`, description: candidate.description }));
    const actionPromptBytes =
      Buffer.byteLength(readableDecisionContext(requiredContext, largestActionOffers, true)) +
      Buffer.byteLength(RESPONSE_INSTRUCTIONS);
    const desiredActionBytes = Math.max(0, actionPromptBytes - requiredBytes);
    // Ordinary action shortlists are optional. Reserve mandatory busy choices,
    // then fit optional actions only after complete personal evidence/conversation.
    // docs/memory-architecture.md#4-jev-attention-before-context-inclusion
    let actionReserveBytes = requiredChoices ? desiredActionBytes : 0;
    const requiredRecallBytes = () =>
      candidates
        .filter((candidate) => candidate.required)
        .reduce(
          (sum, candidate) =>
            sum +
            Buffer.byteLength(candidate.text.replace(/\n/g, '\n  ')) +
            Buffer.byteLength(JSON.stringify(candidate.experience ?? [])) +
            Buffer.byteLength(candidate.id) +
            8,
          0,
        );
    const mandatoryRecallBytes = requiredRecallBytes();
    // Required facts may already exhaust the allowance. Do not attempt paid
    // conversation compaction with a negative budget or hide this as its failure.
    if (requiredBytes + actionReserveBytes + mandatoryRecallBytes > CONTEXT_BYTE_LIMIT) {
      throw new ContextBudgetError(
        'Complete accepted inner world and required context exceed the input budget.',
      );
    }
    const conversation = await buildConversationContext({
      service,
      actorId,
      requiredIds: recallIds,
      includeConversation,
      maxBytes: CONTEXT_BYTE_LIMIT - requiredBytes - actionReserveBytes - mandatoryRecallBytes,
      signal,
      attempt,
      ...(compact
        ? {
            generate: async (...args: Parameters<ConversationGenerate>) => {
              await awaitEvidenceCut();
              return compact(...args);
            },
          }
        : {}),
      preparation,
    });
    const awarenessSequence = conversation.awarenessSequence;
    requiredContext['conversation'] = conversation.lines;
    requiredContext['experience'] = conversation.experience;
    requiredBytes =
      Buffer.byteLength(readableDecisionContext(requiredContext, [], false)) +
      Buffer.byteLength(RESPONSE_INSTRUCTIONS);
    // Check complete kind/ID keys across grouped sources so optional recall cannot
    // duplicate admitted speech or hide an independent record sharing its native ID.
    // Recent-memory coverage can also mark a group required; only trigger,
    // commitment and correction evidence needs an independent raw-source path.
    const conversationSources = new Set(conversation.sourceKeys);
    for (let index = candidates.length - 1; index >= 0; index--)
      if (
        !candidates[index]!.requiredSource &&
        candidates[index]!.sourceKeys?.some((key) => conversationSources.has(key))
      )
        candidates.splice(index, 1);
    const remainingRequiredRecallBytes = requiredRecallBytes();
    if (!requiredChoices)
      actionReserveBytes = Math.min(
        50000,
        desiredActionBytes,
        Math.max(0, CONTEXT_BYTE_LIMIT - requiredBytes - remainingRequiredRecallBytes),
      );
    if (requiredBytes + actionReserveBytes + remainingRequiredRecallBytes > CONTEXT_BYTE_LIMIT)
      throw new ContextBudgetError(
        'Complete accepted inner world and required context exceed the input budget.',
      );
    // Plan vocabulary is optional: retain every option that fits, not an ID-count prefix.
    // docs/memory-architecture.md#4-jev-attention-before-context-inclusion
    const planningAvailable = planOffers.length;
    planOffers = fitActionCandidates(
      requiredContext,
      planOffers,
      actionReserveBytes + remainingRequiredRecallBytes,
    );
    requiredContext['planOffers'] = planOffers.map(({ id, description }) => ({ id, description }));
    requiredBytes =
      Buffer.byteLength(readableDecisionContext(requiredContext, [], false)) +
      Buffer.byteLength(RESPONSE_INSTRUCTIONS);
    const planActions = Object.fromEntries([
      ...planOffers.map((candidate) => [candidate.id, allPlanActions[candidate.id]]),
      ...intentActions.map((candidate) => [candidate.id, allPlanActions[candidate.id]]),
    ]);
    await validateSituation();
    const selection = await recall
      .select(
        recallSelection,
        actorId,
        stimulus,
        `${jobId}:attempt:${attempt}`,
        candidates,
        async (request) => {
          await awaitEvidenceCut();
          await validateSituation();
          return judge(request);
        },
        signal,
        budgetCeiling,
        CONTEXT_BYTE_LIMIT - requiredBytes - actionReserveBytes,
        {
          identity: requiredContext['identity'],
          notepad: requiredContext['notepad'],
          triggerFacts: requiredContext['triggerFacts'],
          now: requiredContext['now'],
          body: requiredContext['body'],
          agency: requiredContext['agency'],
          ...(observed.contacts.length ? { contacts: requiredContext['contacts'] } : {}),
        },
        requiredChoices ? 'native-only' : mode,
      )
      .catch((error: unknown) => {
        signal.throwIfAborted();
        return {
          selected: candidates.filter((candidate) => candidate.required || candidate.automatic),
          diagnostics: {
            attentionStatus: `Optional retrieval unavailable: ${error instanceof Error ? error.message : 'failed'}`,
            fallback: 'hard-query baseline',
          },
        };
      });
    // Attention can outlive a simulation transition. Refresh current state after
    // it returns; later actions still validate their authoritative prerequisites.
    await service.flushMemorySources(actorId, false);
    const sources = [
      ...recall.selectedSources(candidates, selection.selected),
      ...(retainedEvidence ?? []).map(memorySourceProof),
    ];
    const outcomeBinding = JSON.stringify(outcomeEvidence);
    const rememberedSubjects = new Set(
      selection.selected
        .filter((candidate) => candidate.kind === 'memory' || candidate.kind === 'conversation')
        .flatMap((candidate) => candidate.entityIds),
    );
    const rememberedAttribution = attribution(rememberedSubjects);
    const validatePrepared = validateCapturedDecision.bind(
      undefined,
      service,
      actorId,
      conversation.validate,
      sources,
      rememberedSubjects,
      rememberedAttribution,
      outcomeBinding,
      validateSituation,
    );
    await validatePrepared(false);
    const currentWorld = service.world;
    const preparedThrough = service.durabilityTicket();
    if (generation !== service.generation)
      throw new Error('World restored during attention; discard this decision.');
    // Optional failure cannot revive evidence forgotten/corrected while the provider was running.
    // docs/memory-architecture.md#metadata-stays-in-the-server-binding
    if (
      preparedPrivacy !==
      digest({
        forgotten: currentWorld.experience?.forgotten[actorId] ?? [],
        corrections: currentWorld.experience?.corrections?.[actorId] ?? {},
      })
    )
      throw new Error('Recall permissions changed during attention; discard this decision.');
    const currentObserved =
      currentWorld === sourceWorld.deref() ? observed : decisionObservation(currentWorld, actorId);
    if (!currentObserved) throw new Error('Actor unavailable.');
    const actor = currentObserved.actor.actor!;
    const currentFacts = candidateSet(
      currentWorld,
      actorId,
      currentObserved,
      [],
      [],
      [],
      [],
      selection.selected
        .filter((candidate) => candidate.id.startsWith('notepad:'))
        .map((candidate) => candidate.id.slice('notepad:'.length)),
    );
    const factsById = new Map(currentFacts.map((candidate) => [candidate.id, candidate]));
    const currentSelection = [
      ...new Map(
        [
          ...selection.selected.flatMap((candidate) =>
            ['entity', 'possession', 'knowledge'].includes(candidate.kind)
              ? factsById.has(candidate.id)
                ? [factsById.get(candidate.id)!]
                : []
              : [candidate],
          ),
          ...currentFacts.filter(
            (candidate) =>
              candidate.required && ['entity', 'possession', 'knowledge'].includes(candidate.kind),
          ),
        ].map((candidate) => [candidate.id, candidate]),
      ).values(),
    ];
    const currentActivity = activityDecisionFacts(currentWorld, actorId, currentObserved);
    const currentDocuments = currentWorld.minds?.[actorId]?.documents;
    const currentSelfContext = formatDecisionSelfContext({
      label: entityLabel(currentWorld, currentObserved.actor, actorId),
      species: actor.species,
      traits: actor.traits,
      mind: {
        accepted: !!currentDocuments?.length,
        documents: currentDocuments?.length
          ? currentDocuments
          : mindFor(currentWorld, actorId).documents,
      },
      goals: actor.agency.goals,
    });
    const currentSupplyOpportunities = renderSupplyOpportunityContext(
      currentObserved.supplyOpportunities,
      knownSupplyPlaces,
    );
    const context: Record<string, unknown> = {
      situationQueries: mode !== 'native-only',
      receivedSituation: capturedSituation.packet,
      ...(recentWorkResults ? { recentWorkResults } : {}),
      ...currentActivity,
      ...(currentSupplyOpportunities.length
        ? { supplyOpportunities: currentSupplyOpportunities }
        : {}),
      ...(inspected
        ? {
            inspectedActions: inspected.entries.map((entry) => entry.text),
            inspectedMethods: inspected.methods.map((method) => `${method.text}. ${method.status}`),
          }
        : {}),
      capabilities: {
        speech: canSpeak(currentObserved.actor),
        expressions: supportsManualWork(currentObserved.actor),
      },
      expressionGuidance: selectedResponseExpressions(
        currentWorld,
        supportsManualWork(currentObserved.actor),
      ).expressionGuidance,
      stimulus,
      notepad: generalKnowledgeContext(currentWorld, actorId),
      knowledgeInstructions: currentWorld.knowledgePolicy
        ? knowledgePolicyInstructions(currentWorld.knowledgePolicy)
        : 'Knowledge is unavailable.',
      triggerFacts:
        responseTriggerContext(
          service,
          actorId,
          triggerEvidenceId,
          evidence,
          capturedSituation.frame,
        ) ?? null,
      navigation: navigationInstructions(currentWorld, true),
      namedTimes: namedClockTimes(currentWorld),
      outputFamilies: itemOutputFamilies(currentWorld),
      currentSupport: worldSupport(currentObserved.actor),
      publicSurfaces:
        currentWorld.map.spatial.disclosure === 'public'
          ? currentWorld.map.spatial.surfaces.map(({ id, name }) => ({ id, name }))
          : [],
      intentActions: intentActions.map(({ id, description }) => ({ id, description })),
      identity: currentSelfContext.identity,
      feelings: decisionFeelings(currentWorld, actorId, requiredChoices?.feelings),
      ...(requiredChoices ? { requiredChoices: requiredChoices.facts } : {}),
      aboutMe: currentSelfContext.aboutMe,
      now: gameTime(
        currentWorld.simTime,
        currentWorld.statusEffectPolicy.clockOffsetHours,
        currentWorld.presentation?.calendar?.dayLabel,
      ),
      body: bodyContext(currentWorld, currentObserved.actor),
      contacts: currentObserved.contacts.map((contact) => contact.text),
      ...(currentObserved.methodCoverage.paged
        ? { methodCoverage: currentObserved.methodCoverage }
        : {}),
      ...(currentObserved.inventoryCoverage.paged
        ? { inventoryCoverage: currentObserved.inventoryCoverage }
        : {}),
      commitments: requiredContext['commitments'],
      activityCoverage: requiredContext['activityCoverage'],
      goal: currentSelfContext.goal,
      agency: {
        outcomeCoverage,
        goals: actor.agency.goals,
        plan: remainingActivityText(service.world, actorId),
        paused: pausedWorkText(service.world, actorId),
        planRevision: actor.agency.plan?.revision ?? 0,
        attempts: actor.agency.attempts,
      },
      planOffers: planOffers.map(({ id, description }) => ({ id, description })),
    };
    context['conversation'] = conversation.lines;
    context['knowledgeCoverage'] =
      'knowledgeRetrieval' in selection.diagnostics
        ? selection.diagnostics.knowledgeRetrieval
        : { partial: true };
    Object.assign(
      context,
      contextSections(
        currentSelection.filter(
          (candidate) => candidate.kind !== 'conversation' && candidate.kind !== 'entity',
        ),
      ),
    );
    context['experience'] = [
      ...((context['experience'] as unknown[]) ?? []),
      ...conversation.experience,
    ];
    if (currentWorld.innerWorlds?.[actorId]?.reconsiderationRequired)
      context['reconsideration'] =
        'Some remembered evidence was corrected or forgotten. Reconsider affected beliefs; old beliefs may be mistaken.';
    const currentCarryingConcern = bodyPolicy(currentWorld)?.carryingConcern;
    const currentCarryingMeter =
      currentCarryingConcern &&
      attributeDefinition(currentWorld, currentCarryingConcern.attributeId);
    if (
      currentCarryingConcern &&
      currentCarryingMeter &&
      readAttribute(currentWorld, currentObserved.actor, currentCarryingMeter) !== undefined &&
      !currentObserved.inventoryCoverage.paged &&
      !currentObserved.inventory.some((i) =>
        currentWorld.itemDefinitions[i.definitionId]?.properties.some(
          (property) => property === currentCarryingConcern.itemProperty,
        ),
      )
    )
      context['carryingConcern'] = renderNarration(
        currentWorld,
        narrationTemplate(currentCarryingConcern.text, {
          subject: entityGet(currentWorld.entities, actorId),
        }),
        actorId,
      );
    const references = responseReferences(
      currentWorld,
      actorId,
      currentSelection
        .filter((candidate) => candidate.kind === 'entity')
        .flatMap((candidate) => candidate.entityIds ?? []),
      evidenceIds,
      [
        ...currentSelection
          .filter(
            (candidate) =>
              candidate.kind === 'memory' ||
              candidate.kind === 'conversation' ||
              candidate.kind === 'knowledge',
          )
          .flatMap((candidate) => candidate.entityIds),
        ...conversation.entityIds,
        ...socialEntityIds(currentWorld, actorId),
      ],
      evidence,
      currentSelection
        .filter((candidate) => candidate.kind === 'possession')
        .map((candidate) => candidate.id.slice('item:'.length)),
      // Bounded: pile contents in view are pickup targets, not a whole-inventory dump.
      portableItemIds(
        currentWorld,
        currentObserved.visibleEntities
          .filter((entity) => entity.kind === 'item-pile')
          .map((pile) => pile.id),
        16,
      ),
      activityDecisionReferences(currentActivity),
      currentSelection.flatMap((candidate) => candidate.subjects ?? []),
      capturedSituation.frame,
    );
    context['references'] = references.references;
    const planningTargetIds = planOffers.flatMap(({ command }) =>
      command &&
      'targetId' in command &&
      command.targetId &&
      currentObserved.visibleEntities.some((entity) => entity.id === command.targetId)
        ? [command.targetId]
        : [],
    );
    const entityReferences = {
      ...references.entityReferences,
      ...entityReferenceMap(currentWorld, planningTargetIds, actorId),
    };
    const binding: CognitionBinding = {
      knowledgeReferences: selectedKnowledgeReferences(currentWorld, actorId, currentSelection),
      identityReferences: references.identityReferences,
      physicalEntityReferences: {
        ...references.physicalEntityReferences,
        ...entityReferenceMap(currentWorld, planningTargetIds, actorId),
      },
      entityLeases: {
        ...references.entityLeases,
        ...Object.fromEntries(
          planningTargetIds.flatMap((id) => {
            const received = currentBodyGrant(currentWorld, actorId, id);
            return received ? [[id, received.leaseId]] : [];
          }),
        ),
      },
      actorId,
      decisionId: jobId,
      evidenceIds: [
        ...new Set([
          ...selection.selected
            .filter((c) => c.kind === 'memory' || c.kind === 'conversation')
            .flatMap((c) => c.sourceIds ?? [c.id]),
          ...conversation.evidenceIds,
        ]),
      ],
      entityIds: Object.values(entityReferences),
      entityEpisodes: Object.fromEntries(
        [
          ...new Set([
            ...Object.values(entityReferences),
            ...currentObserved.visibleEntities.map((entity) => entity.id),
          ]),
        ].flatMap((id) => {
          const episode = currentWorld.perceptionEpisodes?.[actorId]?.[id];
          return episode ? [[id, episode]] : [];
        }),
      ),
      expectedPlan: actor.planGeneration,
      actions: planActions,
    };
    const experienceSlots = new Map(
      ((context['experience'] as SharedModelExperience['experience'][]) ?? []).map(
        (experience, index) => [experience, index],
      ),
    );
    const sourceVersions = new Map(
      sources.map((source) => [
        experienceSourceKey({ kind: source.sourceKind, id: source.id }),
        source.revision,
      ]),
    );
    const sharedSlots = new Map<string, { index: number; revision: string }>();
    for (const candidate of currentSelection) {
      if (!candidate.experience || candidate.sourceKeys?.length !== candidate.experience.length)
        continue;
      candidate.experience.forEach((experience, index) => {
        const key = candidate.sourceKeys![index]!,
          slot = experienceSlots.get(experience),
          revision = sourceVersions.get(key);
        if (slot !== undefined && revision !== undefined)
          sharedSlots.set(key, { index: slot, revision });
      });
    }
    // Conversation owns independently prepared exact sources. They already appear
    // in this same array; appraisal causes must not serialize those records again.
    for (const [key, shared] of conversation.sharedExperiences) {
      const index = experienceSlots.get(shared.experience);
      if (index !== undefined) sharedSlots.set(key, { index, revision: shared.revision });
    }
    const offered: { id: string; description: string }[] = [];
    for (const key of Object.keys(context)) {
      const value = context[key];
      if (typeof value === 'string')
        context[key] = projectEntityMarkers(value, currentWorld, actorId);
      else if (value != null)
        context[key] = JSON.parse(
          projectEntityMarkers(JSON.stringify(value), currentWorld, actorId),
          (field, entry) =>
            typeof entry === 'string' &&
            /^(entityId|actorId|targetId|sourceId|targetEntityId|addresseeEntityId)$/.test(field) &&
            Object.values(entityReferences).includes(entry)
              ? entityHandle(currentWorld, actorId, entry)
              : entry,
        );
    }
    // Projection preserves array order. Share only the record actually included,
    // after observer references and wording have been projected for this request.
    const projectedExperiences = context['experience'] as SharedModelExperience['experience'][];
    const sharedExperiences = new Map<string, SharedModelExperience>(
      [...sharedSlots].map(([key, slot]) => [
        key,
        { ...slot, experience: projectedExperiences[slot.index]! },
      ]),
    );
    // Interpretations cite the same finite, complete source objects actually supplied.
    // Historical subject handles still grant no current body/action reference.
    const allowedEvidence = new Set(binding.evidenceIds);
    binding.evidenceReferences = Object.fromEntries(
      [...sharedExperiences].flatMap(([key, shared]) => {
        const [, id] = JSON.parse(key) as [string, string];
        return allowedEvidence.has(id) ? [[shared.experience.handle, id]] : [];
      }),
    );
    const prompt = readableDecisionContext(context, offered, false);
    const bytes = Buffer.byteLength(prompt) + Buffer.byteLength(RESPONSE_INSTRUCTIONS);
    if (bytes > CONTEXT_BYTE_LIMIT)
      throw new ContextBudgetError(
        'Complete accepted inner world and required context exceed the input budget.',
      );
    if (requiredChoices) fitActionCandidates(context, availableActions, 0, 'complete-required');
    const attempts = new Map<string, AttemptBinding>();
    for (const candidate of [...availableActions, ...planOffers]) {
      const invocation = candidateChoice(
        candidate,
        actorId,
        jobId,
        currentWorkIdentity(currentWorld, actorId),
      ).invocation;
      if (!invocation) continue;
      const binding = {
        description: candidate.description,
        commands: [invocation],
      };
      attempts.set(JSON.stringify(binding), binding);
    }
    const visibleEntityReferences = entityReferenceMap(
      currentWorld,
      currentObserved.visibleEntities.map((entity) => entity.id),
      actorId,
    );
    const result = {
      temporalSourcesCurrent: sourceFence?.current ?? currentWithoutDatabase,
      dispose: sourceFence?.release ?? releaseWithoutDatabase,
      situation: capturedSituation,
      readSituationHistory: readCapturedSituationHistory.bind(
        undefined,
        service,
        evidenceScope,
        initialHistory,
        capturedSituation.presentation,
        validatePrepared,
      ),
      context,
      prompt,
      includeActions: false,
      sharedExperiences,
      actionGuidance: structuredClone(currentWorld.cognitionPolicy.actionGuidance),
      // Entity handles were projected with the rest of the permitted context above;
      // retain their known producer type for the typed activity chooser.
      activityRequests: context['activityRequests'] as typeof currentActivity.activityRequests,
      binding,
      choiceWork: currentWorkIdentity(currentWorld, actorId),
      offered,
      actionCandidates: availableActions,
      choiceCoverage: requiredChoices ? ('complete-required' as const) : ('optional' as const),
      actionInspection,
      expectedPlanRevision: actor.agency.plan?.revision ?? 0,
      replaceChosenPlan:
        actor.agency.plan?.status === 'blocked' || actor.agency.plan?.status === 'active',
      awarenessSequence,
      whenDurable: () => awaitEvidenceCut(preparedThrough),
      validateConversation: async (flush = true) => {
        if (flush) await awaitEvidenceCut(preparedThrough);
        return validatePrepared(false);
      },
      attemptBindings: [...attempts.values()],
      entityReferences,
      intentionReferences: intentionEntityReferences(currentWorld, actorId, {
        ...visibleEntityReferences,
        ...entityReferences,
      }),
      visibleEntityReferences,
      diagnostics: {
        inventoryCoverage: currentObserved.inventoryCoverage,
        conversation: conversation.diagnostics,
        instructionsVersion: COGNITION_VERSION,
        snapshot: currentWorld.sequence,
        sourceTime: currentWorld.simTime,
        triggerFacts: context['triggerFacts'],
        acceptedRevision: currentWorld.innerWorlds?.[actorId]?.revision,
        ...(requiredNative ? { nativeChoices: requiredNative } : {}),
        planningOptions: {
          available: planningAvailable,
          included: planOffers.length,
          omittedForInputSize: planningAvailable - planOffers.length,
        },
        inputBytes: bytes,
        estimatedInputTokens: Math.ceil(bytes / 3),
        sections: Object.fromEntries(
          Object.entries(context).map(([key, value]) => [
            key,
            Buffer.byteLength(JSON.stringify(value)),
          ]),
        ),
        selection: selection.diagnostics,
      },
    };
    prepared = true;
    return result;
  } finally {
    if (!prepared) sourceFence?.release();
  }
}

function actionEntityReferences(
  prepared: Awaited<ReturnType<typeof prepareDecision>>,
  candidates: CandidateAction[],
) {
  const targets = new Set(
    candidates.flatMap(({ command, nativeInvocation, purpose }) => [
      ...(command && 'targetId' in command && command.targetId ? [command.targetId] : []),
      ...(nativeInvocation && 'targetId' in nativeInvocation && nativeInvocation.targetId
        ? [nativeInvocation.targetId]
        : []),
      ...(nativeInvocation?.type === 'compose'
        ? [
            ...Object.values(nativeInvocation.bindings).filter(
              (value): value is string => typeof value === 'string',
            ),
            ...(nativeInvocation.subjects ?? []),
          ]
        : []),
      ...Object.values(purpose?.roles ?? {}),
    ]),
  );
  return {
    ...prepared.entityReferences,
    ...Object.fromEntries(
      Object.entries(prepared.visibleEntityReferences).filter(([, id]) => targets.has(id)),
    ),
  };
}

/** Generation adds private capabilities after recall/action selection. Fit their
 * actual envelope before sacrificing any personal evidence or raising its limit.
 * docs/memory-architecture.md#3-one-compact-model-facing-context */
export function fitDecisionEnvelope(
  prepared: Awaited<ReturnType<typeof prepareDecision>>,
  additionalBytes: number,
) {
  const includeActions = prepared.includeActions;
  const bytes = (prompt: string) =>
    Buffer.byteLength(prompt) + Buffer.byteLength(RESPONSE_INSTRUCTIONS) + additionalBytes;
  if (bytes(prepared.prompt) <= CONTEXT_BYTE_LIMIT) return prepared;

  const context = { ...prepared.context };
  const plans = (context['planOffers'] as Array<{ id: string; description: string }>).slice();
  let offered = prepared.offered;
  const removed = new Set<string>();
  const render = () => readableDecisionContext(context, offered, includeActions);
  // Optional offers keep their existing order. Whole-prefix sizing accounts for
  // headings/JSON punctuation without repeatedly serializing once per offer.
  const fitPrefix = <T>(rows: T[], install: (rows: T[]) => void): T[] => {
    let low = 0,
      high = rows.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      install(rows.slice(0, mid));
      if (bytes(render()) <= CONTEXT_BYTE_LIMIT) low = mid;
      else high = mid - 1;
    }
    const kept = rows.slice(0, low);
    install(kept);
    return kept;
  };
  const keptPlans = fitPrefix(plans, (rows) => {
    context['planOffers'] = rows;
  });
  for (const row of plans.slice(keptPlans.length)) removed.add(row.id);
  if (bytes(render()) > CONTEXT_BYTE_LIMIT && prepared.choiceCoverage === 'optional') {
    const previous = offered;
    offered = fitPrefix(previous, (rows) => {
      offered = rows;
    });
    for (const row of previous.slice(offered.length)) removed.add(row.id);
  }
  const prompt = render(),
    inputBytes = bytes(prompt);
  if (inputBytes > CONTEXT_BYTE_LIMIT)
    throw new ContextBudgetError(
      'Complete accepted inner world and required context exceed the input budget.',
    );
  return {
    ...prepared,
    context,
    prompt,
    offered,
    binding: {
      ...prepared.binding,
      actions: Object.fromEntries(
        Object.entries(prepared.binding.actions).filter(([id]) => !removed.has(id)),
      ),
    },
    diagnostics: {
      ...prepared.diagnostics,
      inputBytes: inputBytes - additionalBytes,
      estimatedInputTokens: Math.ceil((inputBytes - additionalBytes) / 3),
      planningOptions: {
        ...prepared.diagnostics.planningOptions,
        included: keptPlans.length,
        omittedForInputSize: prepared.diagnostics.planningOptions.available - keptPlans.length,
      },
      finalEnvelope: {
        inputBytes,
        additionalBytes,
        omittedPlanningOffers: plans.length - keptPlans.length,
        omittedActionOffers: prepared.offered.length - offered.length,
      },
    },
  };
}

export async function selectDecisionActions(
  prepared: Awaited<ReturnType<typeof prepareDecision>>,
  judge: (r: Omit<JudgeRequest, 'requestId' | 'signal'>) => Promise<JudgeValue>,
  purpose: 'actions' | 'choose-action' = 'actions',
) {
  if (prepared.choiceCoverage === 'complete-required')
    throw new Error(
      'Required choices use their selected deliberation strategy, not optional action relevance.',
    );
  const candidates = fitActionCandidates(prepared.context, prepared.actionCandidates);
  const allOffers = candidates.map((candidate, index) => ({
    id: `a${index}`,
    description: candidate.description,
  }));
  const candidateDescriptions = Object.fromEntries(
    allOffers.map((candidate) => [candidate.id, candidate.description]),
  );
  const request = attentionRequest(
    {
      // Jev judges relevance, not the generative response schema or formatting instructions.
      // docs/memory-architecture.md#4-jev-attention-before-context-inclusion
      decisionContext: Object.fromEntries(
        Object.entries(prepared.context).filter(
          ([key]) => !['knowledgeInstructions', 'navigation', 'planOffers'].includes(key),
        ),
      ),
      attentionPolicy: `${prepared.actionGuidance.reasons} ${ACTION_EVIDENCE_POLICY}${purpose === 'actions' ? ' Include uncertain but plausible options without choosing a final action. Listing is not endorsement; no action and unlisted attempts remain valid.' : ''}`,
    },
    Object.entries(candidateDescriptions),
    purpose,
    prepared.actionGuidance,
  );
  if (Object.keys(request.questions).length) {
    await prepared.whenDurable();
    await prepared.validateConversation(false);
  }
  const judged = Object.keys(request.questions).length ? await judge(request) : { answers: {} };
  const selected = candidates.filter((_, index) => {
    const answer = judged.answers[`a${index}`];
    return purpose === 'choose-action'
      ? answer?.type === 'noul' && answer.noul >= JEV_ACTION_THRESHOLD
      : attentionIncludes(answer);
  });
  const status = candidates.length ? 'completed after action gate' : 'no candidates';
  const actions = {
    ...prepared.binding.actions,
    ...Object.fromEntries(
      selected.map((candidate) => {
        const index = candidates.indexOf(candidate);
        return [
          `a${index}`,
          candidateChoice(
            candidate,
            prepared.binding.actorId,
            prepared.binding.decisionId,
            prepared.choiceWork,
          ),
        ];
      }),
    ),
  };
  const offered = selected.map((candidate) => allOffers[candidates.indexOf(candidate)]!);
  const entityReferences = actionEntityReferences(prepared, selected);
  const binding: CognitionBinding = {
    ...prepared.binding,
    actions,
    entityIds: Object.values(entityReferences),
    physicalEntityReferences: {
      ...prepared.binding.physicalEntityReferences,
      ...Object.fromEntries(
        Object.entries(prepared.visibleEntityReferences).filter(([, id]) =>
          Object.values(entityReferences).includes(id),
        ),
      ),
    },
  };
  const prompt = readableDecisionContext(prepared.context, offered, true);
  const inputBytes = Buffer.byteLength(prompt) + Buffer.byteLength(RESPONSE_INSTRUCTIONS);
  if (inputBytes > CONTEXT_BYTE_LIMIT)
    throw new ContextBudgetError(
      'Complete accepted inner world and required context exceed the input budget.',
    );
  return {
    ...prepared,
    binding,
    entityReferences,
    offered,
    prompt,
    includeActions: true,
    diagnostics: {
      ...prepared.diagnostics,
      inputBytes,
      estimatedInputTokens: Math.ceil(inputBytes / 3),
      actionSelection: {
        status,
        candidates: prepared.actionCandidates.length,
        judged: Object.keys(request.questions).length,
        omittedForSize: prepared.actionCandidates.length - Object.keys(request.questions).length,
        offered: offered.length,
        answers: judged.answers,
      },
    },
  };
}

/** Refresh cheap native feasibility after provider latency without rebuilding recall. */
export function refreshDecisionActions(
  service: WorldService,
  prepared: Awaited<ReturnType<typeof prepareDecision>>,
) {
  // Required purposes were judged with their exact work binding. A latency refresh
  // cannot silently replace that binding or discover unjudged subjects/actions.
  if (prepared.choiceCoverage === 'complete-required') return prepared;
  const actor = entityGet(service.world.entities, prepared.binding.actorId)?.actor;
  if (!actor) throw new Error('Actor unavailable.');
  const observed = decisionObservation(service.world, prepared.binding.actorId);
  const through = service.durabilityTicket();
  const whenDurable = async () => {
    await service.whenDurable(through);
    await prepared.whenDurable();
  };
  return {
    ...prepared,
    whenDurable,
    validateConversation: async (flush = true) => {
      if (flush) await whenDurable();
      return prepared.validateConversation(false);
    },
    choiceWork: currentWorkIdentity(service.world, prepared.binding.actorId),
    actionCandidates: decisionActionCandidates(
      service,
      prepared.binding.actorId,
      observed,
      prepared.actionInspection,
    ),
    expectedPlanRevision: actor.agency.plan?.revision ?? 0,
    replaceChosenPlan:
      actor.agency.plan?.status === 'blocked' || actor.agency.plan?.status === 'active',
    binding: { ...prepared.binding, expectedPlan: actor.planGeneration },
  };
}

/** Optional action relevance must not turn an otherwise valid reply into a failure. */
export function fallbackDecisionActions(
  prepared: Awaited<ReturnType<typeof prepareDecision>>,
  reason: string,
) {
  if (prepared.choiceCoverage === 'complete-required')
    throw new Error('A failed required judgment cannot fall back to ordinary optional choices.');
  return offerPreparedActions(prepared, prepared.actionCandidates, reason);
}

/** Bind/render supplied options without another relevance call. Required sets are
 * all-or-refused; ordinary fallback remains explicitly optional. */
export function offerPreparedActions(
  prepared: Awaited<ReturnType<typeof prepareDecision>>,
  candidates: CandidateAction[],
  reason: string,
) {
  if (prepared.choiceCoverage === 'complete-required') {
    const supplied = new Set(prepared.actionCandidates.map(preparedChoiceKey));
    if (candidates.some((candidate) => !supplied.has(preparedChoiceKey(candidate))))
      throw new Error('A required purpose cannot acquire a new binding after consideration.');
  }
  candidates = fitActionCandidates(prepared.context, candidates, 0, prepared.choiceCoverage);
  const actions = {
    ...Object.fromEntries(
      // Optional relevance failure cannot retract explicit accept/withdraw choices.
      // Acceptance still revalidates the stored revision through native admission.
      // docs/architecture.md#actor-agency-foundation
      Object.entries(prepared.binding.actions).filter(
        ([id]) => id.startsWith('p') || id.startsWith('w') || id.startsWith('c'),
      ),
    ),
    ...Object.fromEntries(
      candidates.map((candidate, index) => [
        `a${index}`,
        candidateChoice(
          candidate,
          prepared.binding.actorId,
          prepared.binding.decisionId,
          prepared.choiceWork,
        ),
      ]),
    ),
  };
  const offered = candidates.map((candidate, index) => ({
    id: `a${index}`,
    description: candidate.description,
  }));
  const prompt = readableDecisionContext(prepared.context, offered, true);
  const inputBytes = Buffer.byteLength(prompt) + Buffer.byteLength(RESPONSE_INSTRUCTIONS);
  if (inputBytes > CONTEXT_BYTE_LIMIT)
    throw new ContextBudgetError(
      'Complete accepted inner world and required context exceed the input budget.',
    );
  return {
    ...prepared,
    binding: {
      ...prepared.binding,
      actions,
      entityIds: Object.values(actionEntityReferences(prepared, candidates)),
    },
    entityReferences: actionEntityReferences(prepared, candidates),
    offered,
    prompt,
    includeActions: true,
    diagnostics: {
      ...prepared.diagnostics,
      inputBytes,
      estimatedInputTokens: Math.ceil(inputBytes / 3),
      actionSelection: {
        status:
          prepared.choiceCoverage === 'complete-required'
            ? 'complete required set'
            : 'fallback: action relevance unavailable',
        reason,
        candidates: prepared.actionCandidates.length,
        judged: 0,
        omittedForSize: prepared.actionCandidates.length - candidates.length,
        offered: offered.length,
        answers: {},
      },
    },
  };
}
