import { selectedExpressions } from '@open-legend/domain';
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
  captureActorFrame,
  WorkBudgetError,
} from '@open-legend/domain';
import { outingContext } from './outing-view.js';
import { remainingActivityText, learnedActivityCandidates } from './activity-context.js';
import { MemoryReadCache, type CognitionPreparation } from './memory-repository.js';
import { decisionObservation } from './decision-observation.js';
import {
  requiredOutcomeMemoryIds,
  narrationTemplate,
  renderNarration,
  acquiredActivities,
  experienceSourceKey,
  activityRequestChoices,
  activityRequestDescriptors,
  type ActivityRequestDescriptor,
  itemOutputFamilies,
  portableItems,
  worldPosition,
  worldSupport,
} from '@open-legend/domain';
import { knowledgePolicyInstructions, namedClockTimes } from '@open-legend/domain';
import { generalKnowledgeContext, selectedKnowledgeReferences } from './knowledge-context.js';
import {
  entityLabel,
  entityReferenceMap,
  entityHandles,
  experienceEntityReferences,
  projectEntityMarkers,
} from './entity-references.js';
import { digest } from './store.js';
import {
  assembleModelEvidence,
  candidateModelSources,
  contextSections,
  modelEvidenceReference,
  type ModelEvidenceSource,
  type SharedModelExperience,
} from './perceived-context.js';
import { dreamStatus } from '@open-legend/domain';
import { type AttemptBinding, currentGoal } from '@open-legend/domain';
import {
  bodyContext,
  bodyPolicy,
  bodyEligibilityRevision,
  subjectReferenceCurrent,
  attributeDefinition,
  readAttribute,
  canSpeak,
} from '@open-legend/domain';
import { activeAppraisals } from '@open-legend/domain';

import { compileInterests } from './interests.js';
import { type CognitionBinding, MIND_POLICY, mindFor } from '@open-legend/domain';
import type { JudgeRequest, JudgeValue } from '@open-legend/ai';
import {
  ContextBudgetError,
  CONTEXT_BYTE_LIMIT,
  npcCandidates,
  planningCandidates,
  candidateChoice,
  candidateOffer,
  candidateWorkTransition,
  type DecisionActionOffer,
  type CandidateAction,
} from './context.js';
import { domainCommand } from './cognition.js';
import { candidateSet, gameTime, type AttentionCandidate, type RecallService } from './recall.js';
import type { WorldService } from './world-service.js';
import { COGNITION_VERSION, RESPONSE_INSTRUCTIONS } from './cognition-contracts.js';
import { preparedResponseDecisionContext } from './prepared-response-context.js';
import {
  readableDecisionContext,
  renderDecisionContext,
  renderActionChoices,
  responseReferences,
  responseTrigger,
  responseTriggerContext,
  referenceTriggerContext,
  judgmentDecisionContext,
} from './response-context.js';
import { attentionRequest } from './attention-request.js';
import {
  ACTION_EVIDENCE_POLICY,
  attentionIncludes,
  JEV_ACTION_THRESHOLD,
} from './jev-questions.js';
import {
  ACTION_RETRIEVAL_LIMIT,
  diverseActionCandidates,
  interleaveActionFamilies,
} from './action-retrieval.js';
import { navigationInstructions } from './navigation-contracts.js';
import {
  buildConversationContext,
  CONVERSATION_PREPARATION_BYTES,
  type ConversationGenerate,
} from './conversation-context.js';
import { decisionFeelings } from './appraisal-context.js';
import { visionRadius } from '@open-legend/domain';
import { headingFrame } from '@open-legend/domain';
import { surfaceById, surfacesInBounds } from '@open-legend/spatial';
import { projectActivityRequestRequirements } from './activity-request-choice.js';
import {
  composeDecisionRequirements,
  contextUnitKey,
  DecisionPreparationWork,
  selectDecisionContext,
  type ContextFamily,
  type ContextUnit,
  type SelectedDecisionContext,
} from './decision-context-selection.js';

const sourceSectionFields = {
  memory: 'recall',
  conversation: 'conversation',
  entity: 'surroundings',
  possession: 'possessions',
  knowledge: 'knowledge',
  action: 'actions',
} as const;
const sourceSectionOverheads = new Map<string, number>();
const PUBLIC_SURFACE_COVERAGE =
  'Nearby public supports and perceived targets; other supports may exist. This does not establish reachability.';
function sourceSectionOverhead(
  kind: AttentionCandidate['kind'],
  inputFormat: 'closed-choices' | 'response',
): number {
  const key = canonicalJson([kind, inputFormat]);
  let bytes = sourceSectionOverheads.get(key);
  if (bytes === undefined) {
    // Measure the renderer's actual optional wrapper once, without copying an
    // actor's full prompt or maintaining a second set of headings/instructions.
    bytes = Math.max(
      0,
      decisionContextBytes({ [sourceSectionFields[kind]]: [''] }, inputFormat) -
        decisionContextBytes({}, inputFormat) +
        (inputFormat === 'closed-choices' ? 1 : 0),
    );
    sourceSectionOverheads.set(key, bytes);
  }
  return bytes;
}

/** Reuse the same permitted perception used to select actions and budget the prompt. */
function activityDecisionFacts(
  world: import('@open-legend/domain').WorldState,
  actorId: string,
  observed: NonNullable<ReturnType<typeof decisionObservation>>,
  includeRequests = true,
) {
  const selected = observed.inspectedContainer;
  const available = includeRequests ? activityRequestChoices(world, actorId, observed) : undefined;
  const requests = available ? activityRequestDescriptors(world, actorId) : [];
  const handles = entityHandles(world, actorId);
  let missingChoice = false;
  const choices = (available?.choices ?? []).flatMap(({ id, kind, ...choice }) => {
    const requires = projectActivityRequestRequirements(requests, choice, (id) => handles.get(id));
    if (!requires) {
      missingChoice = true;
      return [];
    }
    return [
      {
        ...choice,
        kind,
        ...(choice.requires ? { requires } : {}),
        ...(kind === 'entity'
          ? { entityId: id }
          : kind === 'choice'
            ? { value: id }
            : { definitionId: id }),
      },
    ];
  });
  return {
    simTime: world.simTime,
    outing: outingContext(world, actorId),
    activityRequests: {
      requests,
      choices,
      warnings: [
        ...(available?.warnings ?? []),
        ...(missingChoice
          ? [
              'Some activity choices lack current permitted parent references; their preparation is incomplete.',
            ]
          : []),
      ],
    },
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
  };
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

/** Public geometry is permitted knowledge, but a local decision does not need
 * every distant support name. Native navigation still checks exact placement. */
function decisionPublicSurfaces(
  world: WorldService['world'],
  observed: NonNullable<ReturnType<typeof decisionObservation>>,
) {
  const map = world.map;
  if (map.spatial.disclosure !== 'public') return [];
  const position = worldPosition(observed.actor);
  const radius = visionRadius(world, observed.actor);
  const selected = new Set([
    worldSupport(observed.actor),
    ...observed.visibleEntities.map((entity) => worldSupport(entity)),
    ...surfacesInBounds(map, {
      min: { x: position.x - radius, y: position.y - radius, z: position.z - radius },
      max: { x: position.x + radius, y: position.y + radius, z: position.z + radius },
    }).map((surface) => surface.id),
  ]);
  return [...selected].flatMap((id) => {
    const surface = id ? surfaceById(map, id) : undefined;
    return surface ? [{ id: surface.id, name: surface.name }] : [];
  });
}

function continuationCandidates(candidates: readonly CandidateAction[]): CandidateAction[] {
  return candidates.filter((candidate) => !candidate.command && !candidate.nativeInvocation);
}

function fitActionCandidates(
  context: Record<string, unknown>,
  candidates: CandidateAction[],
  reservedBytes = 0,
  coverage: 'optional' | 'complete-required' = 'optional',
  measure?: (candidates: readonly CandidateAction[]) => number,
): CandidateAction[] {
  if (coverage === 'complete-required') {
    const offered = candidates.map((candidate, index) => candidateOffer(candidate, `a${index}`));
    const bytes =
      (measure
        ? measure(candidates)
        : Buffer.byteLength(readableDecisionContext(context, offered, true)) +
          Buffer.byteLength(RESPONSE_INSTRUCTIONS)) + reservedBytes;
    if (bytes > CONTEXT_BYTE_LIMIT)
      throw new ContextBudgetError('The complete required choice set exceeds the input budget.');
    return candidates;
  }
  // Keep the exact no-intervention choice selectable before optional examples.
  // Its actual interface was reserved before optional personal evidence was fitted.
  const continuing = continuationCandidates(candidates);
  let remaining =
    CONTEXT_BYTE_LIMIT -
    reservedBytes -
    (measure
      ? measure(continuing)
      : Buffer.byteLength(
          readableDecisionContext(
            context,
            continuing.map((candidate, index) => candidateOffer(candidate, `a${index}`)),
            true,
          ),
        ) + Buffer.byteLength(RESPONSE_INSTRUCTIONS));
  if (remaining < 0) {
    if (continuing.length) throw new ContextBudgetError();
    return []; // Optional planning examples need not fit their own action interface.
  }
  const optional = diverseActionCandidates(
    candidates.filter((candidate) => !!candidate.command || !!candidate.nativeInvocation),
  ).filter((candidate, index) => {
    const offer = candidateOffer(candidate, `a${index + continuing.length}`);
    const bytes =
      Buffer.byteLength(`- ${offer.id} (mode=${offer.mode}): ${offer.description}\n`) + 64;
    if (bytes > remaining) {
      return false;
    }
    remaining -= bytes;
    return true;
  });
  const selected = [...continuing, ...optional];
  if (!measure || measure(selected) + reservedBytes <= CONTEXT_BYTE_LIMIT) return selected;
  let low = continuing.length,
    high = selected.length;
  while (low < high) {
    const count = Math.ceil((low + high) / 2);
    if (measure(selected.slice(0, count)) + reservedBytes <= CONTEXT_BYTE_LIMIT) low = count;
    else high = count - 1;
  }
  return selected.slice(0, low);
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
  requests: readonly ActivityRequestDescriptor[] = [],
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
    ...npcCandidates(service, actorId, observed, 'suggestions', requests),
    ...planningCandidates(service, actorId, observed),
  ]);
}

/** Paused work is part of the actor's own intentions: it resumes when current work ends. */
function pausedWorkText(world: import('@open-legend/domain').WorldState, actorId: string) {
  const paused = entityGet(world.entities, actorId)?.actor?.agency.suspended;
  if (!paused) return null;
  return `Earlier work is paused. ${remainingActivityText(world, actorId, paused)} It resumes, after rechecking its targets, when my current work ends. An explicitly offered return checks its remaining first action before ending the intervention and retains its original limits. Ordinary stopping or replacement discards paused work.`;
}

function workTransitionContext(world: import('@open-legend/domain').WorldState, actorId: string) {
  return (['continue', 'replace', 'interrupt'] as const).map((mode) => {
    const work = prospectiveWork(world, actorId, mode);
    if ('ok' in work) return { handling: mode, available: false, reason: work.message };
    return {
      handling: mode,
      available: work.outcome.ok,
      explanation: work.outcome.message,
      lostGameSecondsOfWork: work.lostWorkSeconds,
      spentMaterialsNotRefunded: work.spentInputs.map((input) => ({
        material: world.itemDefinitions[input.definitionId]?.name ?? 'Unknown material',
        quantity: input.quantity,
      })),
      pausedWork:
        work.pausedWork === 'discarded'
          ? 'Earlier paused work is discarded.'
          : work.pausedWork === 'restart-current-step'
            ? 'Current unfinished step restarts when resumed.'
            : 'Earlier paused work is unchanged.',
      combatRecoveryUntilGameTime: work.recovery.combatUntil,
      evasionRecoveryUntilGameTime: work.recovery.evadeUntil,
    };
  });
}

export interface RequiredDecisionChoices {
  candidates: CandidateAction[];
  facts: Record<string, unknown>;
  feelings: import('@open-legend/domain').AppraisalScope[];
}

/** The route owns its complete compiler envelope. This pure projection must not
 * retain a mutable world or perform reads while optional evidence is fitted. */
export interface DecisionInputSources {
  evidenceIds: readonly string[];
  sharedExperiences: ReadonlyMap<string, SharedModelExperience>;
  entityReferences: Record<string, string>;
}
export type DecisionInputMeasure = (input: {
  context: Record<string, unknown>;
  offered: readonly DecisionActionOffer[];
  sourceTime: number;
  actionGuidance: WorldService['world']['cognitionPolicy']['actionGuidance'];
  sources: DecisionInputSources;
  includeActions: boolean;
}) => number;

function decisionInputSources(
  selected: readonly AttentionCandidate[],
  evidence: ReturnType<typeof assembleModelEvidence>,
  context: Record<string, unknown>,
  entityReferences: Record<string, string>,
  conversationIds: readonly string[] = [],
): DecisionInputSources {
  const experiences = context['experience'] as SharedModelExperience['experience'][];
  return {
    evidenceIds: [
      ...new Set([
        ...selected
          .filter((candidate) => candidate.kind === 'memory' || candidate.kind === 'conversation')
          .flatMap((candidate) => candidate.sourceIds ?? [candidate.id]),
        ...conversationIds,
      ]),
    ],
    sharedExperiences: new Map(
      [...evidence.sources].map(([key, source]) => [
        key,
        { ...source, experience: experiences[source.index]! },
      ]),
    ),
    entityReferences,
  };
}

/** Admission measures the representation consumed by the selected strategy. */
function decisionContextBytes(
  context: Record<string, unknown>,
  inputFormat: 'closed-choices' | 'response',
) {
  return inputFormat === 'closed-choices'
    ? Buffer.byteLength(JSON.stringify(preparedResponseDecisionContext(context)))
    : Buffer.byteLength(readableDecisionContext(context, [], false)) +
        Buffer.byteLength(RESPONSE_INSTRUCTIONS);
}

function contextSectionBytes(context: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, Buffer.byteLength(JSON.stringify(value))]),
  );
}

function contextTokenEstimate(bytes: number, completeInput = false) {
  return {
    value: Math.ceil(bytes / 3),
    basis: completeInput ? 'input-utf8-divided-by-three' : 'context-utf8-divided-by-three',
    exact: false,
    excludes: ['response schema', 'adapter wrapper'],
  };
}

function decisionContextBudgetError(
  guard: string,
  context: Record<string, unknown>,
  inputFormat: 'closed-choices' | 'response',
  reservedBytes = 0,
  measuredInputBytes?: number,
) {
  return new ContextBudgetError(
    'Complete accepted inner world and required context exceed the input budget.',
    {
      guard,
      inputBytes: measuredInputBytes ?? decisionContextBytes(context, inputFormat) + reservedBytes,
      limitBytes: CONTEXT_BYTE_LIMIT,
      sections: contextSectionBytes(context),
      ...(reservedBytes ? { reservedBytes } : {}),
    },
  );
}

/** Project only native context contracts. Personal evidence, reference rows and
 * perceived labels already belong to their model-facing owners; reinterpreting
 * them can change literal quotations or bind a handle as a different native ID. */
function projectObserverContext(
  context: Record<string, unknown>,
  world: WorldService['world'],
  actorId: string,
) {
  const handles = entityHandles(world, actorId);
  const annotation = (text: string) => projectEntityMarkers(text, world, actorId);
  const nativeEntities = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value), (field, entry) =>
      typeof entry === 'string' &&
      /^(entityId|actorId|targetId|sourceId|targetEntityId|addresseeEntityId)$/.test(field)
        ? (handles.get(entry) ?? entry)
        : entry,
    ) as T;
  const projected = { ...context };
  type ActivityFacts = ReturnType<typeof activityDecisionFacts>;
  const activity = context['activityRequests'] as ActivityFacts['activityRequests'] | undefined;
  if (activity)
    projected['activityRequests'] = {
      ...activity,
      choices: activity.choices.map((choice) => ({
        ...choice,
        ...('entityId' in choice
          ? { entityId: handles.get(choice.entityId) ?? choice.entityId }
          : {}),
      })),
      // Parent-choice conditions already use the descriptor owner's model namespace.
    };
  const inspected = context['inspectedContainer'] as ActivityFacts['inspectedContainer'];
  if (inspected)
    projected['inspectedContainer'] = {
      ...inspected,
      entityId: handles.get(inspected.entityId) ?? inspected.entityId,
      items: inspected.items.map((item) => ({
        ...item,
        entityId: handles.get(item.entityId) ?? item.entityId,
      })),
    };
  for (const key of ['aboutMe', 'goal'] as const)
    if (typeof context[key] === 'string') projected[key] = annotation(context[key]);
  if (context['commitments'])
    projected['commitments'] = (context['commitments'] as string[]).map(annotation);
  if (context['intentActions'])
    projected['intentActions'] = (context['intentActions'] as DecisionActionOffer[]).map(
      (offer) => ({ ...offer, description: annotation(offer.description) }),
    );
  const agency = context['agency'] as
    | {
        goals: import('@open-legend/domain').ActorAgency['goals'];
        attempts: import('@open-legend/domain').ActorAgency['attempts'];
      }
    | undefined;
  if (agency)
    projected['agency'] = {
      ...agency,
      goals: agency.goals.map((goal) => ({ ...goal, objective: annotation(goal.objective) })),
      attempts: nativeEntities(agency.attempts).map((attempt) => ({
        ...attempt,
        description: annotation(attempt.description),
      })),
      // plan/paused are already rendered by the native activity-view owner.
    };
  return projected;
}

/** Required-fit checks and final dispatch use the same complete-source view. */
function decisionEvidenceContext(
  context: Record<string, unknown>,
  selected: AttentionCandidate[],
  conversation: readonly ModelEvidenceSource[],
  sourceVersions: ReadonlyMap<string, string>,
  triggerEvidenceId?: string,
) {
  const triggerKey = triggerEvidenceId
    ? experienceSourceKey({ kind: 'awareness', id: triggerEvidenceId })
    : undefined;
  const triggerFacts = context['triggerFacts'] as Record<string, unknown> | null;
  const triggerExperience = triggerFacts?.['experience'] as
    | SharedModelExperience['experience']
    | undefined;
  const triggerRevision = triggerKey ? sourceVersions.get(triggerKey) : undefined;
  const triggerSources: ModelEvidenceSource[] =
    triggerKey && triggerRevision && triggerExperience && typeof triggerExperience === 'object'
      ? [{ key: triggerKey, revision: triggerRevision, experience: triggerExperience }]
      : [];
  const evidence = assembleModelEvidence([
    ...candidateModelSources(selected, sourceVersions),
    ...conversation,
    ...triggerSources,
  ]);
  const sections = contextSections(selected, evidence.sources);
  const trigger = triggerKey ? evidence.sources.get(triggerKey) : undefined;
  return {
    evidence,
    context: {
      ...context,
      ...sections,
      experience: evidence.experience,
      conversation: [
        ...new Set([
          ...conversation.map((source) =>
            modelEvidenceReference(evidence.sources.get(source.key)!.index),
          ),
          ...((sections['conversation'] ?? []) as string[]),
        ]),
      ],
      ...(trigger ? referenceTriggerContext(triggerFacts!, trigger.index) : {}),
    },
  };
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
  requiredChoices?: RequiredDecisionChoices | 'available-native',
  inputMeasure?: DecisionInputMeasure,
) {
  const preparationWork = new DecisionPreparationWork();
  // A closed native choice needs its complete alternatives before optional recall.
  // Other responses retain their ordinary optional suggestions.
  const suppliedChoices = typeof requiredChoices === 'object' ? requiredChoices : undefined;
  const closedChoice = requiredChoices !== undefined;
  const inputFormat = closedChoice ? ('closed-choices' as const) : ('response' as const);
  const projectContext = closedChoice
    ? preparedResponseDecisionContext
    : (context: Record<string, unknown>) => context;
  await service.flushMemorySources(actorId);
  const world = service.world;
  const generation = service.generation;
  const inspection = world.actionExperience.learning[actorId]?.inspection;
  const inspected =
    inspection && inspection.eventId === triggerEvidenceId
      ? await service.activityHistoryForActor(
          actorId,
          inspection.after,
          inspection.methodAfter ?? 0,
        )
      : undefined;
  stimulus = projectEntityMarkers(stimulus, world, actorId);
  const observed = decisionObservation(world, actorId);
  if (!observed) throw new Error('Actor unavailable.');
  let includeConversation =
    includeCurrentConversation ||
    requiredIds.some((id) => service.worldEvent(id)?.type === 'speech');
  const head = await service.store.records?.head();
  // The singular trigger can sit outside the coalesced list; keep its source binding.
  const outcomeIds = requiredOutcomeMemoryIds(world, actorId);
  const evidenceIds = [
    ...new Set([...requiredIds, ...(triggerEvidenceId ? [triggerEvidenceId] : [])]),
  ];
  const evidenceScope = head
    ? { worldId: world.id, actorId, generation: head.generation }
    : undefined;
  const knownSupplyPlaces = await prepareSupplyOpportunityContext(
    service.store.memories,
    evidenceScope,
    observed.supplyOpportunities,
  );
  const supplyOpportunities = renderSupplyOpportunityContext(
    observed.supplyOpportunities,
    knownSupplyPlaces,
  );
  const bodies = new MemoryReadCache();
  const retainedEvidence =
    service.store.memories && evidenceScope
      ? await service.store.memories.evidence(evidenceScope, evidenceIds, bodies)
      : undefined;
  const evidence = retainedEvidence
    ? retainedEvidence.flatMap((entry) => (entry.awareness ? [entry.awareness] : []))
    : (world.experience?.awareness[actorId] ?? []).filter((entry) =>
        evidenceIds.includes(entry.eventId),
      );
  if (triggerEvidenceId && evidence.some((entry) => entry.eventId === triggerEvidenceId))
    stimulus = responseTrigger(service, actorId, triggerEvidenceId, stimulus, evidence);
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
  const catalogueIds = acquiredActivities(world, actorId).map((method) => method.id);
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
  const requiredActivity = activityDecisionFacts(world, actorId, observed, !closedChoice);
  const availableActions = suppliedChoices
    ? distinctActions(suppliedChoices.candidates)
    : decisionActionCandidates(
        service,
        actorId,
        observed,
        actionInspection,
        requiredActivity.activityRequests.requests,
      );
  const measuredOffers =
    inputMeasure && closedChoice
      ? availableActions.map((candidate, index) => candidateOffer(candidate, `a${index}`))
      : [];
  const measureInput = (
    context: Record<string, unknown>,
    capturedWorld: WorldService['world'],
    sources?: DecisionInputSources,
    includeActions = false,
    offered = measuredOffers,
  ) =>
    inputMeasure
      ? inputMeasure({
          context,
          offered,
          sourceTime: capturedWorld.simTime,
          actionGuidance: capturedWorld.cognitionPolicy.actionGuidance,
          sources: sources!,
          includeActions,
        })
      : decisionContextBytes(context, inputFormat);
  const requiredNative = suppliedChoices
    ? (() => {
        const expected = currentWorkIdentity(world, actorId);
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
  // Work results and current causes remain required independently of optional dialogue.
  const recallIds = [...new Set([...evidenceIds, ...outcomeIds])];
  let candidates = await recall.requiredCandidates(
    world,
    actorId,
    observed,
    recallIds,
    [],
    [],
    preparation,
  );
  const availableMemoryIds = new Set([
    ...candidates.flatMap((candidate) => candidate.sourceIds ?? [candidate.id]),
  ]);
  const missingOutcomes = outcomeIds.filter((id) => !availableMemoryIds.has(id)).length;
  const outcomeCoverage = missingOutcomes
    ? `${missingOutcomes} recent work records are unavailable under current memory permissions/retention. Base decisions only on available memories and current evidence; do not reconstruct their effects from execution status.`
    : 'Recent work results are included through the same personal memories as other experiences.';
  const snapshotActor = observed.actor.actor!;
  const requiredReferences = responseReferences(
    world,
    actorId,
    candidates
      .filter((candidate) => candidate.kind === 'entity' && candidate.required)
      .flatMap((candidate) => candidate.entityIds ?? []),
    requiredIds,
    [
      ...socialEntityIds(world, actorId),
      ...candidates
        .filter((candidate) => ['memory', 'conversation', 'knowledge'].includes(candidate.kind))
        .flatMap((candidate) => candidate.entityIds),
    ],
    evidence,
    candidates
      .filter((candidate) => candidate.kind === 'possession')
      .map((candidate) => candidate.id.slice('item:'.length)),
    [],
    activityDecisionReferences(requiredActivity),
  );
  const requiredContext = projectContext({
    ...requiredActivity,
    ...(supplyOpportunities.length ? { supplyOpportunities } : {}),
    expressionDescriptions: selectedExpressions(world, observed.actor).map(
      (d) => `${d.id}: ${d.description}`,
    ),
    capabilities: {
      speech: canSpeak(observed.actor),
      expressions: selectedExpressions(world, observed.actor).map((d) => d.id),
    },
    stimulus,
    notepad: generalKnowledgeContext(world, actorId),
    knowledgeInstructions: world.knowledgePolicy
      ? knowledgePolicyInstructions(world.knowledgePolicy)
      : 'Knowledge is unavailable.',
    triggerFacts: responseTriggerContext(service, actorId, triggerEvidenceId, evidence) ?? null,
    navigation: navigationInstructions(world, { includeActivityRequests: false }),
    namedTimes: namedClockTimes(world),
    outputFamilies: itemOutputFamilies(world),
    currentPosition: worldPosition(observed.actor),
    currentSupport: worldSupport(observed.actor),
    currentFacing: headingFrame(observed.actor.spatial.heading),
    publicSurfaces: decisionPublicSurfaces(world, observed),
    ...(world.map.spatial.disclosure === 'public'
      ? { publicSurfacesCoverage: PUBLIC_SURFACE_COVERAGE }
      : {}),
    intentActions: intentActions.map((candidate) => candidateOffer(candidate)),
    planOffers: [],
    references: requiredReferences.references,
    identity: `I am ${entityLabel(world, observed.actor, actorId)}. Species: ${snapshotActor.species ?? 'unknown'}.${snapshotActor.traits?.length ? ` My traits: ${snapshotActor.traits.map((trait) => `${trait.name}: ${trait.description}`).join('; ')}.` : ''}`,
    feelings: decisionFeelings(world, actorId, suppliedChoices?.feelings),
    ...(suppliedChoices ? { requiredChoices: suppliedChoices.facts } : {}),
    aboutMe:
      world.innerWorlds?.[actorId]?.text ??
      mindFor(world, actorId)
        .documents.map((document) => `${document.title}\n${document.text}`)
        .join('\n'),
    now: gameTime(
      world.simTime,
      world.statusEffectPolicy.clockOffsetHours,
      world.presentation?.calendar?.dayLabel,
    ),
    body: bodyContext(world, observed.actor),
    contacts: observed.contacts.map((c) => c.text),
    goal: currentGoal(snapshotActor),
    commitments: (world.memories[actorId] ?? [])
      .filter(
        (memory) =>
          memory.obligation &&
          !memory.resolved &&
          ['active', 'overdue'].includes(memory.obligation.status) &&
          !(world.experience?.forgotten[actorId] ?? []).includes(memory.id),
      )
      .map(
        (memory) =>
          `${memory.summary}${memory.obligation?.dueAt !== undefined ? ` Due in ${Math.max(0, memory.obligation.dueAt - world.simTime)} game seconds.` : ''}`,
      ),
    activityCoverage:
      'At most four compatible personally learned activities are offered at once. Other activities can be inspected. An available first step does not promise that later steps can finish.',
    agency: {
      outcomeCoverage,
      goals: snapshotActor.agency.goals,
      plan: remainingActivityText(service.world, actorId),
      paused: pausedWorkText(service.world, actorId),
      choicesForCurrentWork: workTransitionContext(world, actorId),
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
    ...(observed.inventoryCoverage.paged ? { inventoryCoverage: observed.inventoryCoverage } : {}),
  });
  const carryingConcern = bodyPolicy(world)?.carryingConcern;
  const carryingMeter = carryingConcern && attributeDefinition(world, carryingConcern.attributeId);
  if (
    carryingConcern &&
    carryingMeter &&
    readAttribute(world, observed.actor, carryingMeter) !== undefined &&
    !observed.inventoryCoverage.paged &&
    !observed.inventory.some((item) =>
      world.itemDefinitions[item.definitionId]?.properties.some(
        (property) => property === carryingConcern.itemProperty,
      ),
    )
  )
    requiredContext['carryingConcern'] = renderNarration(
      world,
      narrationTemplate(carryingConcern.text, { subject: entityGet(world.entities, actorId) }),
      actorId,
    );
  if (world.innerWorlds?.[actorId]?.reconsiderationRequired)
    requiredContext['reconsideration'] =
      'Some remembered evidence was corrected or forgotten. Reconsider affected beliefs; old beliefs may be mistaken.';
  const requiredSourceVersions = new Map(
    [
      ...recall.selectedSources(candidates, candidates),
      ...(retainedEvidence ?? []).map(memorySourceProof),
    ].map((source) => [
      experienceSourceKey({ kind: source.sourceKind, id: source.id }),
      source.revision,
    ]),
  );
  const requiredView = (
    conversation: readonly ModelEvidenceSource[] = [],
    conversationIds: readonly string[] = [],
  ) => {
    const selected = candidates.filter((candidate) => candidate.required || candidate.automatic);
    const prepared = decisionEvidenceContext(
      requiredContext,
      selected,
      conversation,
      requiredSourceVersions,
      triggerEvidenceId,
    );
    const context = projectObserverContext(prepared.context, world, actorId);
    return {
      context,
      sources: inputMeasure
        ? decisionInputSources(
            selected,
            prepared.evidence,
            context,
            requiredReferences.entityReferences,
            conversationIds,
          )
        : undefined,
    };
  };
  let required = requiredView();
  let requiredBytes = measureInput(required.context, world, required.sources);
  const largestActionOffers = (suppliedChoices || inputMeasure ? [] : availableActions)
    .map((candidate) => ({ candidate, bytes: Buffer.byteLength(candidate.description) }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, requiredChoices ? undefined : ACTION_RETRIEVAL_LIMIT)
    .map(({ candidate }, index) => candidateOffer(candidate, `a${index}`));
  const actionPromptBytes =
    suppliedChoices || inputMeasure
      ? requiredBytes
      : closedChoice
        ? // Native reconsideration sends complete named alternatives in its task,
          // not another generation manual. Reserve the same description map before
          // optional evidence; its actual compiler still admits the final wrapper.
          requiredBytes +
          Buffer.byteLength(
            JSON.stringify(
              Object.fromEntries(largestActionOffers.map((offer) => [offer.id, offer.description])),
            ),
          )
        : Buffer.byteLength(readableDecisionContext(requiredContext, largestActionOffers, true)) +
          Buffer.byteLength(RESPONSE_INSTRUCTIONS);
  const desiredActionBytes = Math.max(0, actionPromptBytes - requiredBytes);
  const continuingOffers = continuationCandidates(availableActions).map((candidate, index) =>
    candidateOffer(candidate, `a${index}`),
  );
  // Ordinary action shortlists are optional. Reserve mandatory busy choices,
  // then fit optional actions only after complete personal evidence/conversation.
  // docs/memory-architecture.md#4-jev-attention-before-context-inclusion
  // Closed physical options live in the native question set and shared tables,
  // not another rendered generation shortlist. The complete maps are preflighted
  // and packed before either semantic stage dispatches.
  const actionReserveBytes = inputMeasure
    ? closedChoice
      ? 0
      : Math.max(
          0,
          measureInput(required.context, world, required.sources, true, continuingOffers) -
            requiredBytes,
        )
    : requiredChoices && !suppliedChoices
      ? desiredActionBytes
      : closedChoice
        ? 0
        : Math.max(
            0,
            Buffer.byteLength(readableDecisionContext(required.context, continuingOffers, true)) +
              Buffer.byteLength(RESPONSE_INSTRUCTIONS) -
              requiredBytes,
          );
  const requiredRecallBytes = () =>
    candidates
      .filter((candidate) => candidate.required)
      .reduce(
        (sum, candidate) =>
          sum +
          (candidate.experience?.length
            ? Buffer.byteLength(JSON.stringify(candidate.experience))
            : Buffer.byteLength(candidate.text.replace(/\n/g, '\n  '))) +
          Buffer.byteLength(candidate.id) +
          8,
        0,
      );
  // The shared evidence view already contains required records once.
  // Required facts may already exhaust the allowance. Do not attempt paid
  // conversation compaction with a negative budget or hide this as its failure.
  if (requiredBytes + actionReserveBytes > CONTEXT_BYTE_LIMIT) {
    throw decisionContextBudgetError(
      'required-preparation-reservation',
      requiredContext,
      inputFormat,
      actionReserveBytes,
      requiredBytes + actionReserveBytes,
    );
  }
  preparationWork.charge({ candidates: candidates.length + availableActions.length });
  preparationWork.reserveCompletion({
    inputBytes: requiredBytes,
    outputBytes: CONTEXT_BYTE_LIMIT,
    tests: candidates.length + evidenceIds.length + Object.keys(requiredContext).length,
  });
  const conversation = await buildConversationContext({
    service,
    actorId,
    requiredIds: recallIds,
    includeConversation,
    maxBytes: CONTEXT_BYTE_LIMIT - requiredBytes - actionReserveBytes,
    signal,
    attempt,
    ...(compact ? { generate: compact } : {}),
    preparation,
  });
  const awarenessSequence = conversation.awarenessSequence;
  requiredContext['conversation'] = conversation.lines;
  requiredContext['experience'] = conversation.experience;
  required = requiredView(conversation.modelSources, conversation.evidenceIds);
  requiredBytes = measureInput(required.context, world, required.sources);
  // Optional query embeddings and corpus reads begin only after the required
  // account and current exchange have passed their existing fit guards.
  const discovery = {
    lines: conversation.lines,
    partial: conversation.diagnostics.more,
  };
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
  if (requiredBytes + actionReserveBytes > CONTEXT_BYTE_LIMIT)
    throw decisionContextBudgetError(
      'required-conversation-reservation',
      requiredContext,
      inputFormat,
      actionReserveBytes,
      requiredBytes + actionReserveBytes,
    );
  preparationWork.reserveCompletion({
    inputBytes: requiredBytes,
    outputBytes: CONTEXT_BYTE_LIMIT,
    tests:
      candidates.length + conversation.modelSources.length + Object.keys(requiredContext).length,
  });
  let discoveryFailure: string | undefined;
  candidates = await recall
    .candidates(
      world,
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
      discovery,
    )
    .catch((error: unknown) => {
      signal.throwIfAborted();
      discoveryFailure = error instanceof Error ? error.message : 'Optional discovery failed.';
      return candidates;
    });
  for (let index = candidates.length - 1; index >= 0; index--)
    if (
      !candidates[index]!.requiredSource &&
      candidates[index]!.sourceKeys?.some((key) => conversationSources.has(key))
    )
      candidates.splice(index, 1);
  // Optional suggestions cannot consume the evidence budget before attention.
  // Only a required complete choice set reserves space at this stage; ordinary
  // actions/plans fit after selected evidence through their existing owners.
  // docs/memory-architecture.md#4-jev-attention-before-context-inclusion
  const planningAvailable = planOffers.length;
  const selection = await recall
    .select(
      world,
      actorId,
      stimulus,
      `${jobId}:attempt:${attempt}`,
      candidates,
      judge,
      signal,
      budgetCeiling,
      CONTEXT_BYTE_LIMIT - requiredBytes - actionReserveBytes + requiredRecallBytes(),
      {
        identity: requiredContext['identity'],
        aboutMe: requiredContext['aboutMe'],
        notepad: requiredContext['notepad'],
        triggerFacts: requiredContext['triggerFacts'],
        // Recall candidates exclude this already-prepared exchange. Attention
        // still needs its referents before it can judge optional memories.
        conversation: conversation.lines,
        now: requiredContext['now'],
        body: requiredContext['body'],
        feelings: requiredContext['feelings'],
        agency: requiredContext['agency'],
        ...(observed.contacts.length ? { contacts: requiredContext['contacts'] } : {}),
      },
      requiredChoices ? 'native-only' : mode,
      {
        discovery,
        sources: conversation.modelSources,
        ...(triggerEvidenceId
          ? { triggerKey: experienceSourceKey({ kind: 'awareness', id: triggerEvidenceId }) }
          : {}),
      },
    )
    .catch((error: unknown) => {
      signal.throwIfAborted();
      return {
        selected: candidates.filter((candidate) => candidate.required || candidate.automatic),
        optionalPriority: [],
        diagnostics: {
          attentionStatus: `Optional retrieval unavailable: ${error instanceof Error ? error.message : 'failed'}`,
          fallback: 'hard-query baseline',
        },
      };
    });
  // Attention can outlive a simulation transition. Refresh current state after
  // it returns; later actions still validate their authoritative prerequisites.
  await service.flushMemorySources(actorId, false);
  let sources = [
    ...recall.selectedSources(candidates, selection.selected),
    ...(retainedEvidence ?? []).map(memorySourceProof),
  ];
  const outcomeBinding = JSON.stringify(outcomeIds);
  let rememberedSubjects = new Set(
    selection.selected
      .filter((candidate) => candidate.kind === 'memory' || candidate.kind === 'conversation')
      .flatMap((candidate) => candidate.entityIds),
  );
  const rememberedEpisodes = new Map(
    [...rememberedSubjects].map((id) => [id, world.perceptionEpisodes?.[actorId]?.[id] ?? null]),
  );
  const rememberedReferences = experienceEntityReferences(world, actorId, rememberedSubjects);
  const validateEvidence = async (flush = true) => {
    await conversation.validate(flush, sources);
    // Attention/generation can outlive an unnamed person's observation. Historical
    // source revisions cannot authorize rebinding that old account to a new exposure.
    // docs/memory-architecture.md#personal-perspective-and-acquisition
    const currentReferences = experienceEntityReferences(
      service.world,
      actorId,
      rememberedSubjects,
    );
    for (const id of rememberedSubjects) {
      if (!subjectReferenceCurrent(service.world, actorId, id, rememberedEpisodes.get(id) ?? null))
        throw new Error('A remembered participant changed observation; discard stale context.');
      // Recognition can keep the same person valid while changing their model
      // reference. Already rendered evidence must not bind to a different table.
      if (currentReferences.get(id) !== rememberedReferences.get(id))
        throw new Error('A personal evidence reference changed; discard stale context.');
    }
  };
  const validatePrepared = async (flush = true) => {
    await validateEvidence(flush);
    // The same fence runs after generation: a newly completed action is material
    // evidence even when none of the previously selected memory records changed.
    if (outcomeBinding !== JSON.stringify(requiredOutcomeMemoryIds(service.world, actorId)))
      throw new Error(
        'Action outcomes changed during the decision; reconsider with current memories.',
      );
  };
  await validatePrepared(false);
  const currentWorld = service.world;
  if (generation !== service.generation)
    throw new Error('World restored during attention; discard this decision.');
  // Optional failure cannot revive evidence forgotten/corrected while the provider was running.
  // docs/memory-architecture.md#metadata-stays-in-the-server-binding
  const privacyRevision = (snapshot: typeof world) =>
    digest({
      forgotten: snapshot.experience?.forgotten[actorId] ?? [],
      corrections: snapshot.experience?.corrections?.[actorId] ?? {},
    });
  if (privacyRevision(world) !== privacyRevision(currentWorld))
    throw new Error('Recall permissions changed during attention; discard this decision.');
  const currentObserved =
    currentWorld === world ? observed : decisionObservation(currentWorld, actorId);
  if (!currentObserved) throw new Error('Actor unavailable.');
  const actor = currentObserved.actor.actor!;
  const currentFacts = candidateSet(currentWorld, actorId, currentObserved, [], [], [], []);
  const factsById = new Map(currentFacts.map((candidate) => [candidate.id, candidate]));
  let currentSelection = [
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
  const currentActivity = activityDecisionFacts(
    currentWorld,
    actorId,
    currentObserved,
    !closedChoice,
  );
  const currentSupplyOpportunities = renderSupplyOpportunityContext(
    currentObserved.supplyOpportunities,
    knownSupplyPlaces,
  );
  let context = projectContext({
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
    expressionDescriptions: selectedExpressions(currentWorld, currentObserved.actor).map(
      (d) => `${d.id}: ${d.description}`,
    ),
    capabilities: {
      speech: canSpeak(currentObserved.actor),
      expressions: selectedExpressions(currentWorld, currentObserved.actor).map((d) => d.id),
    },
    stimulus,
    notepad: generalKnowledgeContext(currentWorld, actorId),
    knowledgeInstructions: currentWorld.knowledgePolicy
      ? knowledgePolicyInstructions(currentWorld.knowledgePolicy)
      : 'Knowledge is unavailable.',
    triggerFacts: responseTriggerContext(service, actorId, triggerEvidenceId, evidence) ?? null,
    navigation: navigationInstructions(currentWorld, { includeActivityRequests: false }),
    namedTimes: namedClockTimes(currentWorld),
    outputFamilies: itemOutputFamilies(currentWorld),
    currentPosition: worldPosition(currentObserved.actor),
    currentSupport: worldSupport(currentObserved.actor),
    currentFacing: headingFrame(currentObserved.actor.spatial.heading),
    publicSurfaces: decisionPublicSurfaces(currentWorld, currentObserved),
    ...(currentWorld.map.spatial.disclosure === 'public'
      ? { publicSurfacesCoverage: PUBLIC_SURFACE_COVERAGE }
      : {}),
    intentActions: intentActions.map((candidate) => candidateOffer(candidate)),
    identity: `I am ${entityLabel(currentWorld, currentObserved.actor, actorId)}. Species: ${actor.species ?? 'unknown'}.${actor.traits?.length ? ` My traits: ${actor.traits.map((trait) => `${trait.name}: ${trait.description}`).join('; ')}.` : ''}`,
    feelings: decisionFeelings(currentWorld, actorId, suppliedChoices?.feelings),
    ...(suppliedChoices ? { requiredChoices: suppliedChoices.facts } : {}),
    aboutMe:
      currentWorld.innerWorlds?.[actorId]?.text ??
      mindFor(currentWorld, actorId)
        .documents.map((d) => `${d.title}\n${d.text}`)
        .join('\n'),
    now: gameTime(
      currentWorld.simTime,
      currentWorld.statusEffectPolicy.clockOffsetHours,
      currentWorld.presentation?.calendar?.dayLabel,
    ),
    body: bodyContext(currentWorld, currentObserved.actor),
    contacts: currentObserved.contacts.map((contact) => contact.text),
    ...(currentObserved.inventoryCoverage.paged
      ? { inventoryCoverage: currentObserved.inventoryCoverage }
      : {}),
    commitments: requiredContext['commitments'],
    activityCoverage: requiredContext['activityCoverage'],
    goal: currentGoal(actor),
    agency: {
      outcomeCoverage,
      goals: actor.agency.goals,
      plan: remainingActivityText(service.world, actorId),
      paused: pausedWorkText(service.world, actorId),
      planRevision: actor.agency.plan?.revision ?? 0,
      attempts: actor.agency.attempts,
    },
    planOffers: [],
  });
  context['conversation'] = conversation.lines;
  if (currentWorld.innerWorlds?.[actorId]?.reconsiderationRequired)
    context['reconsideration'] =
      'Some remembered evidence was corrected or forgotten. Reconsider affected beliefs; old beliefs may be mistaken.';
  const currentCarryingConcern = bodyPolicy(currentWorld)?.carryingConcern;
  const currentCarryingMeter =
    currentCarryingConcern && attributeDefinition(currentWorld, currentCarryingConcern.attributeId);
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
  const fixedRememberedIds = [...conversation.entityIds, ...socialEntityIds(currentWorld, actorId)];
  // Bounded: pile contents in view are pickup targets, not a whole-inventory dump.
  const pileItemIds = currentObserved.visibleEntities
    .filter((entity) => entity.kind === 'item-pile')
    .flatMap((pile) => portableItems(currentWorld, pile.id).map((item) => item.id))
    .slice(0, 16);
  const activityReferenceIds = activityDecisionReferences(currentActivity);
  const sourceVersions = new Map(
    sources.map((source) => [
      experienceSourceKey({ kind: source.sourceKind, id: source.id }),
      source.revision,
    ]),
  );
  const selectedContext = (selected: AttentionCandidate[]) => {
    const references = responseReferences(
      currentWorld,
      actorId,
      selected
        .filter((candidate) => candidate.kind === 'entity')
        .flatMap((candidate) => candidate.entityIds),
      evidenceIds,
      [
        ...selected
          .filter(
            (candidate) =>
              candidate.kind === 'memory' ||
              candidate.kind === 'conversation' ||
              candidate.kind === 'knowledge',
          )
          .flatMap((candidate) => candidate.entityIds),
        ...fixedRememberedIds,
      ],
      evidence,
      selected
        .filter((candidate) => candidate.kind === 'possession')
        .map((candidate) => candidate.id.slice('item:'.length)),
      pileItemIds,
      activityReferenceIds,
    );
    const preparedEvidence = decisionEvidenceContext(
      context,
      selected,
      conversation.modelSources,
      sourceVersions,
      triggerEvidenceId,
    );
    const raw = {
      ...preparedEvidence.context,
      references: references.references,
    };
    const projected = projectObserverContext(raw, currentWorld, actorId);
    const sourceView = inputMeasure
      ? decisionInputSources(
          selected,
          preparedEvidence.evidence,
          projected,
          references.entityReferences,
          conversation.evidenceIds,
        )
      : undefined;
    return {
      raw,
      projected,
      references,
      evidence: preparedEvidence.evidence,
      sourceView,
      bytes: measureInput(projected, currentWorld, sourceView),
    };
  };
  const requiredSelection = currentSelection.filter(
    (candidate) => candidate.required || candidate.automatic,
  );
  const baseline = selectedContext(requiredSelection);
  if (baseline.bytes + actionReserveBytes > CONTEXT_BYTE_LIMIT)
    throw decisionContextBudgetError(
      'projected-required-context',
      baseline.projected,
      inputFormat,
      actionReserveBytes,
      baseline.bytes + actionReserveBytes,
    );
  const scope = {
    worldId: currentWorld.id,
    actorId,
    generation,
    decisionId: jobId,
    sourceTime: currentWorld.simTime,
  };
  let units = new Map<string, ContextUnit<AttentionCandidate | null>>();
  const putUnit = (
    family: ContextFamily,
    id: string,
    revision: string,
    bytes: number,
    minimumBytes = bytes,
    extra: Partial<ContextUnit<AttentionCandidate | null>> = {},
  ) => {
    const key = contextUnitKey(scope, { family, id, revision });
    if (!units.has(key)) {
      const keyBytes = Buffer.byteLength(key);
      preparationWork.charge({
        candidates: 1,
        inputBytes: keyBytes + bytes,
        retainedBytes: keyBytes + bytes,
      });
      units.set(key, {
        key,
        family,
        source: { id, revision, view: 'personal' },
        dependencies: [],
        requiredReasons: [],
        coverage: 'complete',
        bytes,
        minimumBytes,
        value: null,
        ...extra,
      });
    }
    return key;
  };
  // These fields already occupy the measured baseline. Record their source
  // requirements without charging that same encoding a second time.
  const fieldFamilies: Partial<Record<string, ContextFamily>> = {
    aboutMe: 'identity',
    identity: 'identity',
    body: 'body',
    feelings: 'feeling',
    agency: 'work',
    goal: 'work',
    commitments: 'obligation',
    triggerFacts: 'evidence',
    activityRequests: 'capability',
    references: 'reference',
    contacts: 'contact',
    inventoryCoverage: 'coverage',
  };
  const requiredRoots = new Map<string, readonly string[]>();
  for (const [field, value] of Object.entries(context)) {
    if (
      ['experience', 'recall', 'conversation', 'surroundings', 'possessions', 'knowledge'].includes(
        field,
      )
    )
      continue;
    const reasons = ['current caller/native source'];
    const key = putUnit(fieldFamilies[field] ?? 'instruction', field, digest(value), 0, 0, {
      requiredReasons: reasons,
    });
    requiredRoots.set(key, reasons);
  }
  const lineBytes = (text: string) =>
    inputFormat === 'closed-choices'
      ? Buffer.byteLength(JSON.stringify(text)) + 1
      : Buffer.byteLength(`- ${text.replace(/\n/g, '\n  ')}\n`);
  const priority = new Map(selection.optionalPriority.map((id, index) => [id, index]));
  const sourceFragments = new Map<string, string>();
  const baselineReferences = new Map(
    baseline.references.entityIds.map((id, index) => [id, baseline.references.references[index]!]),
  );
  for (const [id, text] of baselineReferences) {
    const reasons = ['required reference closure'];
    const key = putUnit('reference', id, digest(text), 0, 0, { requiredReasons: reasons });
    requiredRoots.set(key, reasons);
  }
  let referenceFragments = new Map(baselineReferences);
  const maxIndex =
    conversation.modelSources.length +
    currentSelection.reduce((count, candidate) => count + (candidate.experience?.length ?? 0), 0);
  // Conversation summaries and exact turns can be required without another
  // recall candidate. They retain their own identities, never aliases of a
  // summary's covered original events.
  for (const [id, source] of baseline.evidence.sources) {
    const reasons = ['required personal evidence/current exchange'];
    const key = putUnit('evidence', id, source.revision, 0, 0, { requiredReasons: reasons });
    sourceFragments.set(id, key);
    requiredRoots.set(key, reasons);
  }
  const addCandidate = (candidate: AttentionCandidate, index: number) => {
    const mandatory = candidate.required || candidate.automatic;
    const dependencies: string[] = [];
    for (const source of candidateModelSources([candidate], sourceVersions)) {
      let key = sourceFragments.get(source.key);
      if (!key) {
        const projected = projectObserverContext(
          { experience: source.experience },
          currentWorld,
          actorId,
        )['experience'];
        const minimumBytes = Buffer.byteLength(JSON.stringify(projected));
        key = putUnit('evidence', source.key, source.revision, minimumBytes + 1, minimumBytes);
        sourceFragments.set(source.key, key);
      }
      dependencies.push(key);
    }
    const referenceIds =
      candidate.kind === 'possession'
        ? [...candidate.entityIds, candidate.id.slice('item:'.length)]
        : candidate.entityIds;
    for (const id of referenceIds) {
      const text = referenceFragments.get(id);
      if (text === undefined) continue;
      const prior = baselineReferences.get(id);
      // A newly selected visible view may add position/label details to a
      // reference already present through memory; reserve that added meaning.
      const bytes =
        prior === undefined ? lineBytes(text) : Math.max(0, lineBytes(text) - lineBytes(prior));
      dependencies.push(
        putUnit(
          'reference',
          id,
          digest(text),
          bytes,
          prior === undefined ? Math.max(0, bytes - 1) : 0,
        ),
      );
    }
    const field = sourceSectionFields[candidate.kind];
    const baselineRows = baseline.projected[field];
    dependencies.push(
      putUnit(
        'instruction',
        `source-section:${candidate.kind}`,
        COGNITION_VERSION,
        Array.isArray(baselineRows) && baselineRows.length
          ? 0
          : sourceSectionOverhead(candidate.kind, inputFormat),
        0,
      ),
    );
    const referencesCount = candidate.experience?.length ?? 0;
    const bytes = mandatory
      ? 0
      : referencesCount
        ? referencesCount * lineBytes(modelEvidenceReference(maxIndex))
        : lineBytes(candidate.text);
    const reasons = mandatory ? ['required/automatic source'] : [];
    const key = putUnit(
      candidate.kind === 'possession'
        ? 'possession'
        : candidate.kind === 'action'
          ? 'capability'
          : 'evidence',
      `candidate:${candidate.id}`,
      candidate.revision,
      bytes,
      mandatory
        ? 0
        : referencesCount
          ? referencesCount * Math.max(0, lineBytes(modelEvidenceReference(0)) - 1)
          : Math.max(0, bytes - 1),
      {
        value: candidate,
        dependencies,
        requiredReasons: reasons,
        ...(mandatory
          ? {}
          : {
              relevance: {
                source: candidate.kind,
                order: index,
                rank: -(priority.get(candidate.id) ?? index),
              },
            }),
      },
    );
    if (mandatory) requiredRoots.set(key, reasons);
  };
  for (const [index, candidate] of requiredSelection.entries()) addCandidate(candidate, index);
  const requirements = composeDecisionRequirements(stimulus, [
    {
      requiredRoots,
      queryCues: conversation.modelSources.map((source, index) => ({
        source: source.key,
        text: conversation.lines[index] ?? '',
      })),
      enabledSemantics: closedChoice
        ? ['native-choice']
        : [
            ...(canSpeak(currentObserved.actor) ? ['talk'] : []),
            'act',
            'think',
            'goal',
            'plan',
            'note',
            'name',
            ...(currentWorld.moduleManifest.appraisals?.definitions.some(
              (definition) => definition.decision,
            )
              ? ['appraise']
              : []),
          ],
    },
  ]);
  // The required builder creates every dependency before its root. This is the
  // already measured complete baseline, not another speculative selection pass.
  const baselineUnits: SelectedDecisionContext<AttentionCandidate | null> = {
    units: [...units.values()],
    roots: [...requiredRoots.keys()],
    requiredRoots: [...requiredRoots.keys()],
    bytes: baseline.bytes,
    omitted: new Map(),
    work: preparationWork.used,
    optionalCoverage: 'complete',
  };
  const completionDemand = (selected: typeof baselineUnits) => ({
    inputBytes: selected.bytes,
    outputBytes: selected.bytes,
    tests:
      selected.units.length +
      selected.units.reduce((sum, unit) => sum + unit.dependencies.length, 0),
  });
  const baselineCompletion = completionDemand(baselineUnits);
  preparationWork.reserveCompletion(baselineCompletion);
  const baselineGraph = new Map(units);
  let selectedUnits = baselineUnits;
  let fitted = baseline;
  let optionalFailure = false;
  try {
    const allReferences = responseReferences(
      currentWorld,
      actorId,
      currentSelection
        .filter((candidate) => candidate.kind === 'entity')
        .flatMap((candidate) => candidate.entityIds),
      evidenceIds,
      [...fixedRememberedIds, ...currentSelection.flatMap((candidate) => candidate.entityIds)],
      evidence,
      currentSelection
        .filter((candidate) => candidate.kind === 'possession')
        .map((candidate) => candidate.id.slice('item:'.length)),
      pileItemIds,
      activityReferenceIds,
    );
    referenceFragments = new Map(
      allReferences.entityIds.map((id, index) => [id, allReferences.references[index]!]),
    );
    for (const [index, candidate] of currentSelection.entries())
      if (!candidate.required && !candidate.automatic) addCandidate(candidate, index);
    selectedUnits = selectDecisionContext({
      units: [...units.values()],
      requiredRoots: requirements.requiredRoots,
      fixedBytes: baseline.bytes,
      maxBytes: CONTEXT_BYTE_LIMIT - actionReserveBytes,
      basis: 'shared-rank',
      work: preparationWork,
    });
    // A failed enlargement leaves the baseline reservation intact. All optional
    // charges above also retained that original finalization credit.
    preparationWork.reserveCompletion(completionDemand(selectedUnits));
  } catch (error) {
    if (!(error instanceof WorkBudgetError)) throw error;
    optionalFailure = true;
    units = baselineGraph;
    selectedUnits = {
      ...baselineUnits,
      optionalCoverage: 'unavailable',
      work: preparationWork.used,
    };
    preparationWork.reserveCompletion(baselineCompletion);
  }
  const acceptedCandidates = new Set(
    selectedUnits.units.flatMap((unit) => (unit.value ? [unit.value] : [])),
  );
  const consideredSelection = currentSelection;
  currentSelection = currentSelection.filter((candidate) => acceptedCandidates.has(candidate));
  const initialProjectedBytes = selectedUnits.bytes;
  preparationWork.finish(() => {
    if (
      optionalFailure ||
      currentSelection.every((candidate) => candidate.required || candidate.automatic)
    )
      return;
    // Admit final encoding before materializing it. The measured baseline is
    // retained if an owner fails to honor its representation bound.
    const measureSelection = (selected: typeof selectedUnits) => {
      preparationWork.charge(completionDemand(selected));
      const accepted = new Set(selected.units.flatMap((unit) => (unit.value ? [unit.value] : [])));
      const candidates = currentSelection.filter((candidate) => accepted.has(candidate));
      const result = selectedContext(candidates);
      // A route's source-dependent appendix can exceed the provisional additive
      // estimate. Account for its actual encoding before another fit trial.
      const additional = Math.max(0, result.bytes - selected.bytes);
      if (additional) preparationWork.charge({ inputBytes: additional, outputBytes: additional });
      return { selected, candidates, result };
    };
    const accept = (value: ReturnType<typeof measureSelection>) => {
      currentSelection = value.candidates;
      selectedUnits = { ...value.selected, bytes: value.result.bytes };
      fitted = value.result;
    };
    let measured: ReturnType<typeof measureSelection>;
    try {
      measured = measureSelection(selectedUnits);
      if (inputMeasure && measured.result.bytes + actionReserveBytes > CONTEXT_BYTE_LIMIT) {
        // Only an actual overfit needs further encodings. Refit the same owned
        // graph in priority order, never reread evidence or ask another model.
        // Required roots and every shared dependency survive each trial.
        const required = new Set(selectedUnits.requiredRoots);
        const optionalRoots = selectedUnits.roots.filter((key) => !required.has(key));
        const ownedUnits = selectedUnits.units;
        let low = 0,
          high = optionalRoots.length;
        let best: ReturnType<typeof measureSelection> | undefined;
        while (low < high) {
          const count = Math.ceil((low + high) / 2);
          const included = new Set(optionalRoots.slice(0, count));
          const selected = selectDecisionContext({
            units: ownedUnits.map((unit) =>
              unit.relevance && !included.has(unit.key) ? { ...unit, relevance: undefined } : unit,
            ),
            requiredRoots: requirements.requiredRoots,
            fixedBytes: baseline.bytes,
            maxBytes: CONTEXT_BYTE_LIMIT - actionReserveBytes,
            basis: 'shared-rank',
            work: preparationWork,
          });
          const trial = measureSelection(selected);
          if (trial.result.bytes + actionReserveBytes <= CONTEXT_BYTE_LIMIT) {
            low = count;
            best = trial;
          } else high = count - 1;
        }
        if (best) {
          accept(best);
          return;
        }
      } else if (
        measured.result.bytes <= selectedUnits.bytes ||
        (inputMeasure && measured.result.bytes + actionReserveBytes <= CONTEXT_BYTE_LIMIT)
      ) {
        accept(measured);
        return;
      }
    } catch (error) {
      if (!(error instanceof WorkBudgetError)) throw error;
    }
    currentSelection = requiredSelection;
    selectedUnits = {
      ...baselineUnits,
      optionalCoverage: 'unavailable',
      work: preparationWork.used,
    };
    units = baselineGraph;
  });
  const accepted = new Set(currentSelection);
  const omittedForProjection = consideredSelection
    .filter((candidate) => !accepted.has(candidate))
    .map((candidate) => candidate.id);
  if (omittedForProjection.length) {
    const omittedIds = new Set(omittedForProjection);
    for (const candidate of candidates)
      if (omittedIds.has(candidate.id)) {
        candidate.selected = false;
        candidate.reason = 'omitted: complete dependency/context preparation budget';
      }
    sources = [
      ...recall.selectedSources(candidates, currentSelection),
      ...(retainedEvidence ?? []).map(memorySourceProof),
    ];
    rememberedSubjects = new Set(
      currentSelection
        .filter((candidate) => candidate.kind === 'memory' || candidate.kind === 'conversation')
        .flatMap((candidate) => candidate.entityIds),
    );
  }
  context = fitted.raw;
  const references = fitted.references;
  await service.store.putIntegration(
    `interests:${currentWorld.id}:${actorId}`,
    compileInterests(currentWorld, actorId, currentSelection),
  );
  // Preserve the existing actions-versus-plan-suggestions allowance, now against
  // actual attended context. Mandatory choices retain their complete-set guard.
  const selectedContextBytes = fitted.bytes;
  const suggestionReserveBytes =
    requiredChoices || inputMeasure
      ? actionReserveBytes
      : Math.min(50000, desiredActionBytes, Math.max(0, CONTEXT_BYTE_LIMIT - selectedContextBytes));
  if (!closedChoice)
    planOffers = fitActionCandidates(
      fitted.projected,
      planOffers,
      suggestionReserveBytes,
      'optional',
      inputMeasure
        ? (candidates) =>
            measureInput(
              {
                ...fitted.projected,
                planOffers: candidates.map((candidate) => candidateOffer(candidate)),
              },
              currentWorld,
              fitted.sourceView,
            )
        : undefined,
    );
  if (!closedChoice)
    context['planOffers'] = planOffers.map((candidate) => candidateOffer(candidate));
  const planActions = Object.fromEntries(
    planOffers
      .map((candidate) => [
        candidate.id,
        bindNativeChoice(
          world,
          actorId,
          domainCommand(candidate.command!, actorId, jobId),
          candidateWorkTransition(candidate),
        ),
      ])
      .concat(
        intentActions.map((candidate) => [
          candidate.id,
          bindNativeChoice(world, actorId, candidate.command, 'continue'),
        ]),
      ),
  );
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
    capturedActorFrame: captureActorFrame(currentWorld, actorId),
    bodyEligibility: bodyEligibilityRevision(
      currentWorld,
      entityGet(currentWorld.entities, actorId)!,
    ),
    knowledgeReferences: selectedKnowledgeReferences(currentWorld, actorId, currentSelection),
    actorId,
    decisionId: jobId,
    policy: MIND_POLICY,
    tier: 'fast',
    purpose: 'thought',
    watermark: Math.max(conversation.watermark, ...currentSelection.map((c) => c.at)),
    evidenceIds: [
      ...new Set([
        ...currentSelection
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
    restEpisode:
      dreamStatus(currentWorld, entityGet(currentWorld.entities, actorId))?.episode ?? null,
    actions: planActions,
  };
  const sharedSlots = new Map<string, { index: number; revision: string }>();
  for (const candidate of currentSelection) {
    if (!candidate.experience || candidate.sourceKeys?.length !== candidate.experience.length)
      continue;
    candidate.experience.forEach((experience, index) => {
      const key = candidate.sourceKeys![index]!,
        slot = fitted.evidence.sources.get(key)?.index,
        revision = sourceVersions.get(key);
      if (slot !== undefined && revision !== undefined)
        sharedSlots.set(key, { index: slot, revision });
    });
  }
  for (const [key, shared] of conversation.sharedExperiences)
    sharedSlots.set(key, {
      index: fitted.evidence.sources.get(key)!.index,
      revision: shared.revision,
    });
  const offered: DecisionActionOffer[] = [];
  if (!closedChoice)
    Object.assign(
      fitted.projected,
      projectObserverContext({ planOffers: context['planOffers'] }, currentWorld, actorId),
    );
  context = fitted.projected;
  // Projection preserves array order. Share only the record actually included,
  // after observer references and wording have been projected for this request.
  const projectedExperiences = context['experience'] as SharedModelExperience['experience'][];
  const sharedExperiences = new Map<string, SharedModelExperience>(
    [...sharedSlots].map(([key, slot]) => [
      key,
      { ...slot, experience: projectedExperiences[slot.index]! },
    ]),
  );
  const { prompt, responseSupplementOffset, actionSectionBytes } = closedChoice
    ? {
        prompt: JSON.stringify(preparedResponseDecisionContext(context)),
        responseSupplementOffset: 0,
        actionSectionBytes: 0,
      }
    : renderDecisionContext(context, offered, false);
  const bytes = measureInput(
    context,
    currentWorld,
    inputMeasure ? { ...fitted.sourceView!, entityReferences } : undefined,
  );
  if (bytes > CONTEXT_BYTE_LIMIT)
    throw decisionContextBudgetError('projected-final-context', context, inputFormat, 0, bytes);
  if (closedChoice && bytes + actionReserveBytes > CONTEXT_BYTE_LIMIT)
    throw decisionContextBudgetError(
      'projected-final-choice-context',
      context,
      inputFormat,
      actionReserveBytes,
      bytes + actionReserveBytes,
    );
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
  return {
    context,
    manifest: Object.freeze({
      scope: Object.freeze(scope),
      question: requirements.question,
      selectionPolicy: Object.freeze({
        version: COGNITION_VERSION,
        identity: digest(currentWorld.cognitionPolicy),
        basis: 'shared-rank' as const,
      }),
      requiredRoots: Object.freeze([...selectedUnits.requiredRoots]),
      sourceKeys: Object.freeze([...fitted.evidence.sources.keys()]),
      units: Object.freeze(
        selectedUnits.units.map((unit) =>
          Object.freeze({
            key: unit.key,
            family: unit.family,
            source: Object.freeze({ ...unit.source }),
            dependencies: Object.freeze([...unit.dependencies]),
            requiredReasons: Object.freeze([...unit.requiredReasons]),
            coverage: unit.coverage,
          }),
        ),
      ),
    }),
    inputFormat,
    inputMeasure,
    prompt,
    responseSupplementOffset,
    actionSectionBytes,
    sharedExperiences,
    actionGuidance: structuredClone(currentWorld.cognitionPolicy.actionGuidance),
    // Closed physical choices omit generation-only forms from their model input,
    // but retain the same empty internal collection for downstream consumers.
    // Other responses use the observer references projected above.
    activityRequests: closedChoice
      ? currentActivity.activityRequests
      : (context['activityRequests'] as typeof currentActivity.activityRequests),
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
    // Effect-free utterances can refer to this still-valid captured experience
    // while already admitted work finishes. Consumers must separately enforce
    // current life, speaking authority and recipient bindings; action decisions
    // retain the stricter current-outcome fence below.
    validateEvidence,
    validateConversation: validatePrepared,
    attemptBindings: [...attempts.values()],
    entityReferences,
    visibleEntityReferences: entityReferenceMap(
      currentWorld,
      currentObserved.visibleEntities.map((entity) => entity.id),
      actorId,
    ),
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
      contextTokenEstimate: contextTokenEstimate(bytes, !!inputMeasure),
      sections: contextSectionBytes(context),
      ...(omittedForProjection.length
        ? {
            projectedBudget: {
              ...(inputMeasure
                ? { provisionalSelectionBytes: initialProjectedBytes }
                : { selectionUpperBytes: initialProjectedBytes }),
              inputBytes: bytes,
              omitted: omittedForProjection,
            },
          }
        : {}),
      selection: selection.diagnostics,
      preparation: {
        units: selectedUnits.units.length,
        roots: selectedUnits.roots.length,
        optionalCoverage: selectedUnits.optionalCoverage,
        work: preparationWork.used,
        sourceBindings: [...fitted.evidence.sources].map(([key, source]) => ({
          key,
          index: source.index,
          revision: source.revision,
        })),
      },
      ...(discoveryFailure
        ? { discovery: { coverage: 'unavailable', reason: discoveryFailure } }
        : {}),
    },
  };
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

function measuredPreparedInput(
  prepared: Awaited<ReturnType<typeof prepareDecision>>,
  offered: readonly DecisionActionOffer[],
) {
  return prepared.inputMeasure?.({
    context: prepared.context,
    offered,
    sourceTime: prepared.diagnostics.sourceTime,
    actionGuidance: prepared.actionGuidance,
    sources: {
      evidenceIds: prepared.binding.evidenceIds ?? [],
      sharedExperiences: prepared.sharedExperiences,
      entityReferences: prepared.entityReferences,
    },
    includeActions: true,
  });
}

function preparedCandidateMeasure(prepared: Awaited<ReturnType<typeof prepareDecision>>) {
  return prepared.inputMeasure
    ? (candidates: readonly CandidateAction[]) =>
        measuredPreparedInput(
          prepared,
          candidates.map((candidate, index) => candidateOffer(candidate, `a${index}`)),
        )!
    : undefined;
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
  const candidates = fitActionCandidates(
    prepared.context,
    prepared.actionCandidates,
    0,
    'optional',
    preparedCandidateMeasure(prepared),
  );
  const allOffers = candidates.map((candidate, index) => candidateOffer(candidate, `a${index}`));
  const candidateDescriptions = Object.fromEntries(
    allOffers.map((candidate) => [candidate.id, candidate.description]),
  );
  const request = attentionRequest(
    {
      // Jev judges relevance, not the generative response schema or formatting instructions.
      // docs/memory-architecture.md#4-jev-attention-before-context-inclusion
      decisionContext: judgmentDecisionContext(prepared.context),
      attentionPolicy: `${prepared.actionGuidance.reasons} ${ACTION_EVIDENCE_POLICY}${purpose === 'actions' ? ' Include uncertain but plausible options without choosing a final action. Listing is not endorsement; no action and unlisted attempts remain valid.' : ''}`,
    },
    Object.entries(candidateDescriptions),
    purpose,
    prepared.actionGuidance,
  );
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
  const binding = { ...prepared.binding, actions, entityIds: Object.values(entityReferences) };
  const { prompt, responseSupplementOffset, actionSectionBytes } = renderDecisionContext(
    prepared.context,
    offered,
    true,
  );
  const inputBytes =
    measuredPreparedInput(prepared, offered) ??
    Buffer.byteLength(prompt) + Buffer.byteLength(RESPONSE_INSTRUCTIONS);
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
    responseSupplementOffset,
    actionSectionBytes,
    diagnostics: {
      ...prepared.diagnostics,
      inputBytes,
      contextTokenEstimate: contextTokenEstimate(inputBytes, !!prepared.inputMeasure),
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
  return {
    ...prepared,
    choiceWork: currentWorkIdentity(service.world, prepared.binding.actorId),
    actionCandidates: decisionActionCandidates(
      service,
      prepared.binding.actorId,
      observed,
      prepared.actionInspection,
      prepared.activityRequests.requests,
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

/** Fit optional offers against the complete response consumer, including private
 * proposal appendices. Preserve already judged handles and every required fact;
 * a supplementary feature cannot silently buy a larger model input. */
export function fitDecisionResponse(
  prepared: Awaited<ReturnType<typeof prepareDecision>>,
  reservedBytes: number,
  requiredOfferId?: string,
) {
  if (
    Buffer.byteLength(prepared.prompt) + Buffer.byteLength(RESPONSE_INSTRUCTIONS) + reservedBytes <=
    CONTEXT_BYTE_LIMIT
  )
    return prepared;
  if (prepared.choiceCoverage === 'complete-required') throw new ContextBudgetError();
  // Relevance may remove earlier representatives of a family. Restore coverage
  // before this final optional fit without changing any judged handle/binding.
  const ordered = interleaveActionFamilies(
    prepared.offered,
    (offer) => prepared.binding.actions[offer.id]?.invocation?.type ?? null,
  );
  const offersFor = (count: number) =>
    ordered.filter((offer, index) => index < count || offer.id === requiredOfferId);
  const fixedBytes =
    Buffer.byteLength(prepared.prompt) -
    prepared.actionSectionBytes +
    (prepared.actionSectionBytes ? 0 : 2) +
    Buffer.byteLength(RESPONSE_INSTRUCTIONS) +
    reservedBytes;
  const bytesFor = (offers: typeof prepared.offered) =>
    fixedBytes + Buffer.byteLength(renderActionChoices(offers));
  if (bytesFor(offersFor(0)) > CONTEXT_BYTE_LIMIT) throw new ContextBudgetError();
  let low = 0,
    high = prepared.offered.length;
  while (low < high) {
    const count = Math.ceil((low + high) / 2);
    if (bytesFor(offersFor(count)) <= CONTEXT_BYTE_LIMIT) low = count;
    else high = count - 1;
  }
  const offered = offersFor(low),
    included = new Set(offered.map((offer) => offer.id));
  const actions = Object.fromEntries(
    Object.entries(prepared.binding.actions).filter(
      ([id]) => !/^a\d+$/.test(id) || included.has(id),
    ),
  );
  const { prompt, responseSupplementOffset, actionSectionBytes } = renderDecisionContext(
    prepared.context,
    offered,
    true,
  );
  return {
    ...prepared,
    offered,
    prompt,
    responseSupplementOffset,
    actionSectionBytes,
    binding: { ...prepared.binding, actions },
    diagnostics: {
      ...prepared.diagnostics,
      responseBudget: {
        available: prepared.offered.length,
        included: offered.length,
        reservedBytes,
        inputBytes:
          Buffer.byteLength(prompt) + Buffer.byteLength(RESPONSE_INSTRUCTIONS) + reservedBytes,
      },
    },
  };
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
  if (prepared.inputFormat !== 'closed-choices')
    candidates = fitActionCandidates(
      prepared.context,
      candidates,
      0,
      prepared.choiceCoverage,
      preparedCandidateMeasure(prepared),
    );
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
  const offered = candidates.map((candidate, index) => candidateOffer(candidate, `a${index}`));
  const { prompt, responseSupplementOffset, actionSectionBytes } =
    prepared.inputFormat === 'closed-choices'
      ? {
          prompt: JSON.stringify(preparedResponseDecisionContext(prepared.context)),
          responseSupplementOffset: 0,
          actionSectionBytes: 0,
        }
      : renderDecisionContext(prepared.context, offered, true);
  const inputBytes =
    measuredPreparedInput(prepared, offered) ??
    (prepared.inputFormat === 'closed-choices'
      ? decisionContextBytes(prepared.context, prepared.inputFormat)
      : Buffer.byteLength(prompt) + Buffer.byteLength(RESPONSE_INSTRUCTIONS));
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
    responseSupplementOffset,
    actionSectionBytes,
    diagnostics: {
      ...prepared.diagnostics,
      inputBytes,
      contextTokenEstimate: contextTokenEstimate(inputBytes, !!prepared.inputMeasure),
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
