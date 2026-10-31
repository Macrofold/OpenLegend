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
import { remainingActivityText, learnedActivityCandidates } from './activity-context.js';
import {
  MemoryReadCache,
  type MemoryReadControl,
  type CognitionPreparation,
} from './memory-repository.js';
import { decisionObservation } from './decision-observation.js';
import {
  requiredOutcomeMemoryIds,
  narrationTemplate,
  renderNarration,
  acquiredActivities,
  experienceSourceKey,
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
  modelEvidenceSource,
  chronologicalModelSources,
  orderedDecisionContext,
  OBSERVER_SPATIAL_PERSPECTIVE,
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
import type { JudgeRequest, JudgeValue, TypedQuestionMap } from '@open-legend/ai';
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
import {
  COGNITION_VERSION,
  RESPONSE_INSTRUCTIONS,
  responseOperationEnabled,
  type ResponseOperationKind,
} from './cognition-contracts.js';
import { preparedResponseDecisionContext } from './prepared-response-context.js';
import {
  readableDecisionContext,
  renderDecisionContext,
  renderActionChoices,
  responseReferences,
  responseReferenceText,
  type ResponseReference,
  responseTrigger,
  responseTriggerContext,
  referenceTriggerContext,
  judgmentDecisionContext,
} from './response-context.js';
import { attentionRequest } from './attention-request.js';
import { activityRequestDirectory } from './activity-request-choice.js';
import {
  ACTION_EVIDENCE_POLICY,
  ACTIVITY_ROUTE_POLICY,
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
import {
  activityDecisionFacts,
  type ActivityDetailSelection,
} from './activity-decision-context.js';
import {
  composeDecisionRequirements,
  contextUnitKey,
  DecisionPreparationWork,
  selectDecisionContext,
  type ContextFamily,
  type ContextUnit,
  type DecisionRequirements,
  type DecisionContextManifest,
  type SelectedDecisionContext,
} from './decision-context-selection.js';

const contextFieldFamilies: Partial<Record<string, ContextFamily>> = {
  aboutMe: 'identity',
  identity: 'identity',
  body: 'body',
  feelings: 'feeling',
  admittedInterpretations: 'evidence',
  agency: 'work',
  goal: 'work',
  commitments: 'obligation',
  triggerFacts: 'evidence',
  activityRequests: 'capability',
  references: 'reference',
  contacts: 'contact',
  inventoryCoverage: 'coverage',
  optionalPreparation: 'coverage',
};

/** These conservative roots preserve installed contracts. A narrower consumer
 * may omit its interface, but stored presence alone never supplies the reason. */
function requiredFieldReason(field: string): string {
  const family = contextFieldFamilies[field];
  switch (family) {
    case 'identity':
      return 'complete accepted character identity';
    case 'body':
      return 'current bodily state and installed scale meaning';
    case 'work':
      return 'chosen purposes and current or paused work';
    case 'obligation':
      return 'unresolved actor-owned commitments';
    case 'feeling':
      return 'current permitted feelings and interpretation scales';
    case 'contact':
      return 'current acquired contact evidence';
    case 'reference':
      return 'exact bindings used by required evidence and operations';
    case 'coverage':
      return 'source-owner scope and incomplete-query meaning';
    case 'capability':
      return 'enabled capability discovery or complete invocation contract';
    case 'evidence':
      return 'initiating cause or actor-permitted interpretation support';
    default:
      if (
        [
          'now',
          'currentPosition',
          'currentSupport',
          'currentFacing',
          'spatialPerspective',
          'publicSurfaces',
          'publicSurfacesCoverage',
        ].includes(field)
      )
        return 'current observer frame and known spatial or temporal constraints';
      if (['stimulus', 'decisionRequirements'].includes(field))
        return 'actual caller question and admitted causes';
      if (
        ['notepad', 'knowledgeInstructions', 'inspectedActions', 'inspectedMethods'].includes(field)
      )
        return 'actor-owned knowledge and actually inspected detail';
      return 'enabled operation instructions and installed interpretation rules';
  }
}

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
/** Positively selected optional meaning carried across one coherent native
 * detail rebuild. Experience keeps exact proofs; current native facts refresh
 * through the same candidate owner. This grants no new scope or attention. */
export interface RetainedDecisionRecall {
  readonly worldId: string;
  readonly actorId: string;
  readonly generation: string;
  readonly candidates: readonly AttentionCandidate[];
  readonly sources: readonly ReturnType<typeof memorySourceProof>[];
  readonly optionalPriority: readonly string[];
}

export interface DecisionInputSources {
  evidenceIds: readonly string[];
  sharedExperiences: ReadonlyMap<string, SharedModelExperience>;
  entityReferences: Record<string, string>;
  knowledgeReferences: Record<string, string>;
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
  knowledgeReferences: Record<string, string> = {},
): DecisionInputSources {
  const experiences = context['experience'] as SharedModelExperience['experience'][];
  return {
    evidenceIds: [
      ...new Set([
        ...selected
          .filter((candidate) => candidate.kind === 'memory' || candidate.kind === 'conversation')
          .flatMap((candidate) => candidate.sourceIds ?? [candidate.id]),
        ...conversationIds,
        ...[...evidence.sources.values()].flatMap((source) =>
          source.occurrence ? [source.occurrence.id] : [],
        ),
      ]),
    ],
    sharedExperiences: new Map(
      [...evidence.sources].map(([key, source]) => [
        key,
        { ...source, experience: experiences[source.index]! },
      ]),
    ),
    entityReferences,
    knowledgeReferences,
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
  type ActivityFacts = ReturnType<typeof activityDecisionFacts>['facts'];
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
  return orderedDecisionContext(projected);
}

/** Required-fit checks and final dispatch use the same complete-source view. */
function decisionEvidenceContext(
  context: Record<string, unknown>,
  selected: AttentionCandidate[],
  conversation: readonly ModelEvidenceSource[],
  sourceVersions: ReadonlyMap<string, string>,
  triggerEvidenceId?: string,
  triggerAwareness?: import('@open-legend/domain').Awareness,
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
    triggerKey && triggerRevision && triggerExperience && triggerAwareness
      ? [
          {
            key: triggerKey,
            ...modelEvidenceSource(
              { source: 'awareness', value: triggerAwareness },
              triggerRevision,
              triggerExperience,
            ),
          },
        ]
      : [];
  const selectedSources = candidateModelSources(selected, sourceVersions);
  const allSources = [...conversation, ...selectedSources, ...triggerSources];
  const exchangeKeys = new Set([
    ...conversation.map((source) => source.key),
    ...selected
      .filter((candidate) => candidate.kind === 'conversation' || candidate.requiredSource)
      .flatMap((candidate) => candidate.modelSources ?? [])
      .filter(
        (source) => source.experience.source === 'awareness' && 'speech' in source.experience.value,
      )
      .map((source) => source.key),
    ...triggerSources
      .filter(
        (source) => source.experience.source === 'awareness' && 'speech' in source.experience.value,
      )
      .map((source) => source.key),
  ]);
  const exchange = chronologicalModelSources(
    allSources.filter((source) => exchangeKeys.has(source.key)),
  );
  // A derived older interval precedes literal turns. Literal speech follows the
  // same sequence/tie semantics as the source owner, including required causes
  // omitted from its optional suffix. Remaining recall keeps retrieval priority.
  const evidence = assembleModelEvidence([
    ...exchange,
    ...allSources.filter((source) => !exchangeKeys.has(source.key)),
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
          ...exchange.map((source) =>
            modelEvidenceReference(evidence.sources.get(source.key)!.index),
          ),
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
  consumer?: Pick<DecisionRequirements, 'question' | 'enabledSemantics'> & {
    capabilityDetail?: ActivityDetailSelection;
    capabilityFamily?: string;
    capabilityDescriptors?: readonly ActivityRequestDescriptor[];
  },
  readControl?: MemoryReadControl,
  preparationWork = new DecisionPreparationWork(),
  retainedRecall?: RetainedDecisionRecall,
) {
  const requested = consumer
    ? { question: consumer.question, enabledSemantics: [...consumer.enabledSemantics] }
    : undefined;
  const allows = (operation: ResponseOperationKind) =>
    responseOperationEnabled(requested?.enabledSemantics, operation);
  // A closed native choice needs its complete alternatives before optional recall.
  // Other responses retain their ordinary optional suggestions.
  const suppliedChoices = typeof requiredChoices === 'object' ? requiredChoices : undefined;
  const closedChoice = requiredChoices !== undefined;
  const actionsEnabled = closedChoice || allows('act') || allows('plan');
  const inputFormat = closedChoice ? ('closed-choices' as const) : ('response' as const);
  const projectContext = (context: Record<string, unknown>) => {
    const projected = closedChoice ? preparedResponseDecisionContext(context) : context;
    if (!requested) return projected;
    // Current work, learned facts and inspected contents remain evidence. Only
    // the unsupported execution interface is absent from this consumer.
    const { activityRequests: _unoffered, ...facts } = projected;
    return {
      ...(actionsEnabled && consumer?.capabilityDetail !== 'directory' ? projected : facts),
      decisionRequirements: requested,
    };
  };
  await service.flushMemorySources(actorId);
  const world = service.world;
  const generation = service.generation;
  if (
    retainedRecall &&
    (retainedRecall.worldId !== world.id ||
      retainedRecall.actorId !== actorId ||
      retainedRecall.generation !== generation)
  )
    throw new Error('Retained decision evidence belongs to another preparation scope.');
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
  const bodies = new MemoryReadCache(preparationWork);
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
          work: preparationWork,
          bodies,
          conversation: await service.store.memories.context(
            evidenceScope,
            evidenceIds,
            includeConversation,
            CONVERSATION_PREPARATION_BYTES,
            preparationWork,
          ),
        }
      : undefined;
  const planning =
    requiredChoices || !allows('plan') ? [] : planningCandidates(service, actorId, observed);
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
  const requiredActivityCapture = activityDecisionFacts(world, actorId, observed, {
    includeRequests: actionsEnabled && !closedChoice,
    detail: consumer?.capabilityDetail,
    selectedFamily: consumer?.capabilityFamily,
    descriptors: consumer?.capabilityDescriptors,
    charge: (demand) => preparationWork.charge(demand),
  });
  const requiredActivity = requiredActivityCapture.facts;
  const availableActions = !actionsEnabled
    ? []
    : suppliedChoices
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
        preparationWork.charge({
          candidates: availableActions.length,
          tests: availableActions.length,
        });
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
  const intentActions = (
    requiredChoices || !actionsEnabled ? [] : observed.actor.actor!.agency.attempts
  ).flatMap((attempt, index) => [
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
  ]);
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
  let candidateSourceProofs = recall.selectedSources(candidates, candidates);
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
    requiredActivityCapture.referenceIds,
  );
  const requiredExpressions = selectedExpressions(world, observed.actor);
  const requiredContext = projectContext({
    ...requiredActivity,
    ...(supplyOpportunities.length ? { supplyOpportunities } : {}),
    expressionDescriptions: requiredExpressions.map((d) => `${d.id}: ${d.description}`),
    capabilities: {
      speech: canSpeak(observed.actor),
      expressions: requiredExpressions.map((d) => d.id),
    },
    stimulus,
    notepad: generalKnowledgeContext(world, actorId),
    knowledgeInstructions: world.knowledgePolicy
      ? knowledgePolicyInstructions(world.knowledgePolicy, requested?.enabledSemantics)
      : '',
    triggerFacts: responseTriggerContext(service, actorId, triggerEvidenceId, evidence) ?? null,
    navigation: actionsEnabled
      ? navigationInstructions(world, { includeActivityRequests: false })
      : '',
    namedTimes: actionsEnabled ? namedClockTimes(world) : [],
    outputFamilies: allows('plan') ? itemOutputFamilies(world) : [],
    currentPosition: worldPosition(observed.actor),
    spatialPerspective: OBSERVER_SPATIAL_PERSPECTIVE,
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
    activityCoverage: actionsEnabled
      ? 'At most four compatible personally learned activities are offered at once. Other activities can be inspected. An available first step does not promise that later steps can finish.'
      : '',
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
    optionalPreparation: {
      coverage: 'unavailable',
      scope: 'Bounded discovered candidates; omitted sources may contain further information.',
    },
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
      evidence.find((row) => row.eventId === triggerEvidenceId),
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
            selectedKnowledgeReferences(world, actorId, selected),
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
    question: requested?.question ?? stimulus,
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
  const baselineIdentityParts = [
    ...Object.keys(requiredContext),
    ...requiredReferences.entityIds,
    ...conversation.entityIds,
    ...candidates.flatMap((candidate) => [
      candidate.id,
      ...(candidate.sourceKeys ?? []),
      ...candidate.entityIds,
    ]),
    ...conversation.modelSources.map((source) => source.key),
    ...new Set(candidates.map((candidate) => `source-section:${candidate.kind}`)),
  ];
  const keyEnvelopeBytes = Buffer.byteLength(
    canonicalJson([
      world.id,
      generation,
      actorId,
      'instruction',
      'candidate:',
      '0'.repeat(64),
      'personal',
    ]),
  );
  const baselineKeyBytes = baselineIdentityParts.reduce(
    (sum, id) => sum + keyEnvelopeBytes + Buffer.byteLength(JSON.stringify(id)),
    0,
  );
  preparationWork.reserveCompletion({
    candidates: baselineIdentityParts.length,
    // One post-wait required-set measure precedes the three final encoding passes.
    inputBytes: requiredBytes * 4 + baselineKeyBytes,
    outputBytes: requiredBytes * 4,
    retainedBytes: baselineKeyBytes,
    tests:
      baselineIdentityParts.length +
      candidates.reduce(
        (count, candidate) =>
          count + candidate.entityIds.length + (candidate.sourceKeys?.length ?? 0),
        0,
      ),
  });
  let discoveryFailure: string | undefined;
  candidates = retainedRecall
    ? [
        ...new Map(
          [...retainedRecall.candidates.map((candidate) => ({ ...candidate })), ...candidates].map(
            (candidate) => [candidate.id, candidate],
          ),
        ).values(),
      ]
    : await recall
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
          readControl,
        )
        .catch((error: unknown) => {
          signal.throwIfAborted();
          discoveryFailure = error instanceof Error ? error.message : 'Optional discovery failed.';
          return candidates;
        });
  if (!retainedRecall) candidateSourceProofs = recall.selectedSources(candidates, candidates);
  const selectedSourceProofs = (selected: readonly AttentionCandidate[]) => {
    const keys = new Set(selected.flatMap((candidate) => candidate.sourceKeys ?? [candidate.id]));
    const proofs = new Map<string, ReturnType<typeof memorySourceProof>>();
    for (const source of [...candidateSourceProofs, ...(retainedRecall?.sources ?? [])]) {
      const key = experienceSourceKey({ kind: source.sourceKind, id: source.id });
      if (!keys.has(key)) continue;
      const prior = proofs.get(key);
      if (prior && prior.revision !== source.revision)
        throw new Error('A retained source changed before capability detail preparation.');
      proofs.set(key, source);
    }
    return [...proofs.values()];
  };
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
  const selection = retainedRecall
    ? {
        selected: candidates,
        optionalPriority: [...retainedRecall.optionalPriority],
        diagnostics: {
          attentionStatus: 'Retained captured positive selection; native detail refit only',
          fallback: 'No new optional discovery or attention',
        },
      }
    : await recall
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
            decisionRequirements: { question: requested?.question ?? stimulus },
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
            work: preparationWork,
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
    ...selectedSourceProofs(selection.selected),
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
  const validationFor = (sourceProofs: typeof sources, subjects: ReadonlySet<string>) => {
    const validateEvidence = async (flush = true) => {
      if (!requiredActivityCapture.current(service.world))
        throw new Error('Available activity capabilities changed during preparation.');
      await conversation.validate(flush, sourceProofs);
      if (!requiredActivityCapture.current(service.world))
        throw new Error('Available activity capabilities changed during source validation.');
      // Attention/generation can outlive an unnamed person's observation. Historical
      // source revisions cannot authorize rebinding that old account to a new exposure.
      // docs/memory-architecture.md#personal-perspective-and-acquisition
      const currentReferences = experienceEntityReferences(service.world, actorId, subjects);
      for (const id of subjects) {
        if (
          !subjectReferenceCurrent(service.world, actorId, id, rememberedEpisodes.get(id) ?? null)
        )
          throw new Error('A remembered participant changed observation; discard stale context.');
        // Recognition may preserve identity while changing the rendered reference.
        if (currentReferences.get(id) !== rememberedReferences.get(id))
          throw new Error('A personal evidence reference changed; discard stale context.');
      }
    };
    return {
      validateEvidence,
      validateConversation: async (flush = true) => {
        await validateEvidence(flush);
        // Newly completed work is material even if selected source records survive.
        if (outcomeBinding !== JSON.stringify(requiredOutcomeMemoryIds(service.world, actorId)))
          throw new Error(
            'Action outcomes changed during the decision; reconsider with current memories.',
          );
      },
    };
  };
  await validationFor(sources, rememberedSubjects).validateConversation(false);
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
  const sameWorldSnapshot = currentWorld === world;
  const currentObserved = sameWorldSnapshot ? observed : decisionObservation(currentWorld, actorId);
  if (!currentObserved) throw new Error('Actor unavailable.');
  const actor = currentObserved.actor.actor!;
  const currentFacts = candidateSet(currentWorld, actorId, currentObserved, [], [], [], [], {
    charge: (demand) => preparationWork.complete(demand),
  });
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
  // Attention can await providers. Reuse only this exact immutable snapshot;
  // changed world state still requires fresh capability facts and target bindings.
  const currentActivityCapture = sameWorldSnapshot
    ? requiredActivityCapture
    : activityDecisionFacts(currentWorld, actorId, currentObserved, {
        includeRequests: actionsEnabled && !closedChoice,
        detail: consumer?.capabilityDetail,
        selectedFamily: consumer?.capabilityFamily,
        charge: (demand) => preparationWork.charge(demand),
      });
  const currentActivity = currentActivityCapture.facts;
  const currentExpressions = sameWorldSnapshot
    ? requiredExpressions
    : selectedExpressions(currentWorld, currentObserved.actor);
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
    expressionDescriptions: currentExpressions.map((d) => `${d.id}: ${d.description}`),
    capabilities: {
      speech: canSpeak(currentObserved.actor),
      expressions: currentExpressions.map((d) => d.id),
    },
    stimulus,
    notepad: generalKnowledgeContext(currentWorld, actorId),
    knowledgeInstructions: currentWorld.knowledgePolicy
      ? knowledgePolicyInstructions(currentWorld.knowledgePolicy, requested?.enabledSemantics)
      : '',
    triggerFacts: responseTriggerContext(service, actorId, triggerEvidenceId, evidence) ?? null,
    navigation: actionsEnabled
      ? navigationInstructions(currentWorld, { includeActivityRequests: false })
      : '',
    namedTimes: actionsEnabled ? namedClockTimes(currentWorld) : [],
    outputFamilies: allows('plan') ? itemOutputFamilies(currentWorld) : [],
    currentPosition: worldPosition(currentObserved.actor),
    spatialPerspective: OBSERVER_SPATIAL_PERSPECTIVE,
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
    optionalPreparation: requiredContext['optionalPreparation'],
    goal: currentGoal(actor),
    agency: {
      outcomeCoverage,
      goals: actor.agency.goals,
      plan: remainingActivityText(service.world, actorId),
      paused: pausedWorkText(service.world, actorId),
      choicesForCurrentWork: workTransitionContext(currentWorld, actorId),
      planRevision: actor.agency.plan?.revision ?? 0,
      attempts: actor.agency.attempts,
    },
    planOffers: [],
  });
  context['conversation'] = conversation.lines;
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
  const pileItemIds: string[] = [];
  for (const pile of currentObserved.visibleEntities) {
    if (pile.kind !== 'item-pile') continue;
    pileItemIds.push(
      ...portableItems(currentWorld, pile.id, 16 - pileItemIds.length).map((item) => item.id),
    );
    if (pileItemIds.length === 16) break;
  }
  const activityReferenceIds = currentActivityCapture.referenceIds;
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
      evidence.find((row) => row.eventId === triggerEvidenceId),
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
          selectedKnowledgeReferences(currentWorld, actorId, selected),
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
  preparationWork.complete({
    inputBytes: requiredBytes,
    outputBytes: requiredBytes,
    tests: requiredSelection.length + conversation.modelSources.length,
  });
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
  let buildingRequired = true;
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
      const demand = {
        candidates: 1,
        inputBytes: keyBytes + bytes,
        retainedBytes: keyBytes + bytes,
      };
      if (buildingRequired) preparationWork.complete(demand);
      else preparationWork.charge(demand);
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

  const requiredRoots = new Map<string, readonly string[]>();
  for (const [field, value] of Object.entries(context)) {
    if (
      ['experience', 'recall', 'conversation', 'surroundings', 'possessions', 'knowledge'].includes(
        field,
      )
    )
      continue;
    const reasons = [requiredFieldReason(field)];
    const key = putUnit(contextFieldFamilies[field] ?? 'instruction', field, digest(value), 0, 0, {
      requiredReasons: reasons,
    });
    requiredRoots.set(key, reasons);
  }
  const lineBytes = (text: string) =>
    inputFormat === 'closed-choices'
      ? Buffer.byteLength(JSON.stringify(text)) + 1
      : Buffer.byteLength(`- ${text.replace(/\n/g, '\n  ')}\n`);
  const referenceBytes = (reference: ResponseReference) =>
    inputFormat === 'closed-choices'
      ? Buffer.byteLength(JSON.stringify(reference)) + 1
      : lineBytes(responseReferenceText(reference));
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
    const reasons = ['required source meaning or current exchange interpretation'];
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
        prior === undefined
          ? referenceBytes(text)
          : Math.max(0, referenceBytes(text) - referenceBytes(prior));
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
    const sourceIds = candidate.sourceIds ?? [candidate.id];
    const reasons = mandatory
      ? [
          ...(sourceIds.some((id) => id === triggerEvidenceId) ? ['initiating source'] : []),
          ...(sourceIds.some((id) => requiredIds.includes(id))
            ? ['independently coalesced cause']
            : []),
          ...(sourceIds.some((id) => outcomeIds.includes(id))
            ? ['required personal work outcome']
            : []),
          ...(candidate.automatic ? ['current conversation interpretation'] : []),
          ...(candidate.required
            ? (candidate.requiredReasons ?? ['source-owned required personal evidence'])
            : []),
        ]
      : [];
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
  const requirements = composeDecisionRequirements(requested?.question ?? stimulus, [
    {
      requiredRoots,
      queryCues: conversation.modelSources.map((source, index) => ({
        source: source.key,
        text: conversation.lines[index] ?? '',
      })),
      enabledSemantics:
        requested?.enabledSemantics ??
        (closedChoice
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
            ]),
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
    // Final readable encoding, actual-consumer measurement and section diagnostics.
    // They are separate bounded traversals even when their text overlaps.
    inputBytes: selected.bytes * 3,
    outputBytes: selected.bytes * 3,
    tests:
      selected.units.length +
      selected.units.reduce((sum, unit) => sum + unit.dependencies.length, 0),
  });
  buildingRequired = false;
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
    if (selectedUnits.exhaustedWork) throw selectedUnits.exhaustedWork;
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
  (() => {
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
  })();
  preparationWork.reserveCompletion(completionDemand(selectedUnits));
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
      ...selectedSourceProofs(currentSelection),
      ...(retainedEvidence ?? []).map(memorySourceProof),
    ];
    rememberedSubjects = new Set(
      currentSelection
        .filter((candidate) => candidate.kind === 'memory' || candidate.kind === 'conversation')
        .flatMap((candidate) => candidate.entityIds),
    );
  }
  context = fitted.raw;
  const optionalPreparation = {
    ...(context['optionalPreparation'] as { scope: string }),
    coverage: discoveryFailure || optionalFailure ? 'unavailable' : selectedUnits.optionalCoverage,
  };
  context['optionalPreparation'] = optionalPreparation;
  fitted.projected['optionalPreparation'] = optionalPreparation;
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
        ...[...fitted.evidence.sources.values()].flatMap((source) =>
          source.occurrence ? [source.occurrence.id] : [],
        ),
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
    [...fitted.evidence.sources].map(([key, source]) => [
      key,
      { ...source, experience: projectedExperiences[source.index]! },
    ]),
  );
  const { prompt, responseSupplementOffset, actionSectionBytes, bytes, sections } =
    preparationWork.finish(() => {
      const rendered = closedChoice
        ? {
            prompt: JSON.stringify(preparedResponseDecisionContext(context)),
            responseSupplementOffset: 0,
            actionSectionBytes: 0,
          }
        : renderDecisionContext(context, offered, false);
      return {
        ...rendered,
        bytes: measureInput(
          context,
          currentWorld,
          inputMeasure ? { ...fitted.sourceView!, entityReferences } : undefined,
        ),
        sections: contextSectionBytes(context),
      };
    });
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
  const manifestFor = (
    selected: typeof selectedUnits,
    sourceKeys: Iterable<string>,
  ): DecisionContextManifest =>
    Object.freeze({
      scope: Object.freeze(scope),
      question: requirements.question,
      selectionPolicy: Object.freeze({
        version: COGNITION_VERSION,
        identity: digest(currentWorld.cognitionPolicy),
        basis: 'shared-rank' as const,
      }),
      requiredRoots: Object.freeze([...selected.requiredRoots]),
      sourceKeys: Object.freeze([...sourceKeys]),
      units: Object.freeze(
        selected.units.map((unit) =>
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
    });
  // Only this complete supplied consumer updates its native feelings between paid
  // stages. Retain the already-built required closure; do not reread the world or
  // guess every possible admission result before optional evidence is selected.
  const requiredClosure =
    suppliedChoices && inputMeasure && baseline.sourceView
      ? {
          context: baseline.projected,
          entityReferences: baseline.references.entityReferences,
          sharedExperiences: new Map(baseline.sourceView.sharedExperiences),
          evidenceIds: [...baseline.sourceView.evidenceIds],
          knowledgeReferences: selectedKnowledgeReferences(
            currentWorld,
            actorId,
            requiredSelection,
          ),
          watermark: Math.max(
            conversation.watermark,
            ...requiredSelection.map((candidate) => candidate.at),
          ),
          manifest: manifestFor(baselineUnits, baseline.evidence.sources.keys()),
          preparation: {
            units: baselineUnits.units.length,
            roots: baselineUnits.roots.length,
            optionalCoverage: 'unavailable' as const,
            work: preparationWork.used,
            sourceBindings: [...baseline.evidence.sources].map(([key, source]) => ({
              key,
              index: source.index,
              revision: source.revision,
            })),
          },
          omitted: currentSelection
            .filter((candidate) => !candidate.required && !candidate.automatic)
            .map((candidate) => candidate.id),
          validation: validationFor(
            [
              ...selectedSourceProofs(requiredSelection),
              ...(retainedEvidence ?? []).map(memorySourceProof),
            ],
            new Set(
              requiredSelection
                .filter(
                  (candidate) => candidate.kind === 'memory' || candidate.kind === 'conversation',
                )
                .flatMap((candidate) => candidate.entityIds),
            ),
          ),
        }
      : undefined;
  return {
    context,
    manifest: updatedContextManifest(
      manifestFor(selectedUnits, fitted.evidence.sources.keys()),
      context,
      ['optionalPreparation', 'planOffers'],
    ),
    requiredClosure,
    inputFormat,
    inputMeasure,
    preparationWork,
    // Hold references to the already-finalized no-suggestion view. Optional
    // action work can fail without spending again to reconstruct this baseline.
    actionBaseline: {
      prompt,
      responseSupplementOffset,
      actionSectionBytes,
      promptBytes: Buffer.byteLength(prompt),
      inputBytes: bytes,
      entityReferences,
      actions: binding.actions,
    },
    optionalActionsUnavailable: undefined as string | undefined,
    retainedRecall: {
      worldId: currentWorld.id,
      actorId,
      generation,
      candidates: currentSelection.filter(
        (candidate) => !candidate.required && !candidate.automatic,
      ),
      sources: selectedSourceProofs(
        currentSelection.filter((candidate) => !candidate.required && !candidate.automatic),
      ),
      optionalPriority: selection.optionalPriority,
    } satisfies RetainedDecisionRecall,
    prompt,
    responseSupplementOffset,
    actionSectionBytes,
    sharedExperiences,
    actionGuidance: structuredClone(currentWorld.cognitionPolicy.actionGuidance),
    discoveryDescriptors: currentActivityCapture.discoveryDescriptors,
    completeForms: currentActivityCapture.completeForms,
    // Closed physical choices omit generation-only forms from their model input,
    // but retain the same empty internal collection for downstream consumers.
    // Other responses use the observer references projected above.
    activityRequests:
      closedChoice || !actionsEnabled
        ? currentActivity.activityRequests
        : ((context['activityRequests'] as typeof currentActivity.activityRequests | undefined) ??
          currentActivity.activityRequests),
    binding,
    // Output targets come from native ownership, never projected labels. Keep
    // paused/terminal goals: an earlier accepted operation can change eligibility.
    // docs/technical/situation-aware-cognition-context.md#97-target-and-dependency-admission-refinements
    goalIds: actor.agency.goals.map((goal) => goal.id),
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
    ...validationFor(sources, rememberedSubjects),
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
      sections,
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
      knowledgeReferences: prepared.binding.knowledgeReferences ?? {},
    },
    includeActions: true,
  });
}

/** A native field update changes its required unit identity, while captured
 * personal evidence keeps the exact source revision and index already selected. */
function updatedContextManifest(
  manifest: DecisionContextManifest,
  context: Record<string, unknown>,
  fields: readonly string[],
) {
  const units = [...manifest.units];
  const replacements = new Map<string, string>();
  const addedRoots: string[] = [];
  for (const field of fields) {
    // Closed consumers deliberately omit interfaces they cannot use. An absent
    // field has no encoded contribution or semantic source to fingerprint.
    if (context[field] === undefined) continue;
    const index = units.findIndex(
      (unit) => unit.source.id === field && manifest.requiredRoots.includes(unit.key),
    );
    const prior = index >= 0 ? units[index] : undefined;
    const family = prior?.family ?? contextFieldFamilies[field] ?? 'instruction';
    const source = { id: field, revision: digest(context[field]), view: 'personal' };
    const key = contextUnitKey(manifest.scope, { family, ...source });
    const unit = Object.freeze({
      key,
      family,
      source: Object.freeze(source),
      dependencies: prior?.dependencies ?? Object.freeze([]),
      requiredReasons: prior?.requiredReasons ?? Object.freeze([requiredFieldReason(field)]),
      coverage: 'complete' as const,
    });
    if (prior) {
      replacements.set(prior.key, key);
      units[index] = unit;
    } else {
      units.push(unit);
      addedRoots.push(key);
    }
  }
  return Object.freeze({
    ...manifest,
    requiredRoots: Object.freeze([
      ...manifest.requiredRoots.map((key) => replacements.get(key) ?? key),
      ...addedRoots,
    ]),
    units: Object.freeze(
      units.map((unit) =>
        unit.dependencies.some((key) => replacements.has(key))
          ? Object.freeze({
              ...unit,
              dependencies: Object.freeze(
                unit.dependencies.map((key) => replacements.get(key) ?? key),
              ),
            })
          : unit,
      ),
    ),
  });
}

/** Admit an actual native update between closed supplied stages. Keep the chosen
 * context when it fits; otherwise use its already-owned complete required closure.
 * This changes no choices, rereads no sources and purchases no additional judgment. */
export function fitPreparedChoiceContext(
  prepared: Awaited<ReturnType<typeof prepareDecision>>,
  updates: Record<string, unknown>,
) {
  if (prepared.inputFormat !== 'closed-choices' || prepared.choiceCoverage !== 'complete-required')
    throw new Error('Only complete supplied choices retain a required context closure.');
  let selected = { ...prepared, context: { ...prepared.context, ...updates } };
  const measured = (value: typeof selected) => {
    value.preparationWork.charge({
      candidates: value.offered.length,
      inputBytes: value.diagnostics.inputBytes,
      outputBytes: value.diagnostics.inputBytes,
      tests: 1,
    });
    return (
      measuredPreparedInput(value, value.offered) ??
      decisionContextBytes(value.context, value.inputFormat)
    );
  };
  const selectedBytes = measured(selected);
  let inputBytes = selectedBytes;
  let omitted: string[] = [];
  if (inputBytes > CONTEXT_BYTE_LIMIT) {
    const required = prepared.requiredClosure;
    if (!required)
      throw decisionContextBudgetError(
        'updated-supplied-context',
        selected.context,
        selected.inputFormat,
        0,
        inputBytes,
      );
    const omittedCandidates = new Set(required.omitted);
    const retainedEntities = new Set([
      ...Object.values(required.entityReferences),
      ...Object.values(prepared.visibleEntityReferences),
    ]);
    selected = {
      ...selected,
      context: { ...required.context, ...updates },
      manifest: required.manifest,
      entityReferences: required.entityReferences,
      sharedExperiences: required.sharedExperiences,
      ...required.validation,
      binding: {
        ...prepared.binding,
        watermark: required.watermark,
        evidenceIds: required.evidenceIds,
        knowledgeReferences: required.knowledgeReferences,
        entityIds: Object.values(required.entityReferences),
        entityEpisodes: Object.fromEntries(
          Object.entries(prepared.binding.entityEpisodes ?? {}).filter(([id]) =>
            retainedEntities.has(id),
          ),
        ),
      },
      diagnostics: {
        ...prepared.diagnostics,
        preparation: { ...required.preparation, work: prepared.preparationWork.used },
        selection: {
          ...prepared.diagnostics.selection,
          ...('candidates' in prepared.diagnostics.selection
            ? {
                candidates: prepared.diagnostics.selection.candidates.map((candidate) =>
                  omittedCandidates.has(candidate.id)
                    ? {
                        ...candidate,
                        selected: false,
                        reason: 'omitted: updated required context budget',
                      }
                    : candidate,
                ),
              }
            : {}),
        },
      },
    };
    inputBytes = measured(selected);
    if (inputBytes > CONTEXT_BYTE_LIMIT)
      throw decisionContextBudgetError(
        'updated-required-supplied-context',
        selected.context,
        selected.inputFormat,
        0,
        inputBytes,
      );
    // The new artifact owns independent source validators. Retained original
    // contexts still fence every source they actually exposed.
    omitted = required.omitted;
  }
  const manifest = updatedContextManifest(
    selected.manifest,
    selected.context,
    Object.keys(updates),
  );
  return {
    ...selected,
    manifest,
    prompt: JSON.stringify(preparedResponseDecisionContext(selected.context)),
    diagnostics: {
      ...selected.diagnostics,
      preparation: {
        ...selected.diagnostics.preparation,
        work: selected.preparationWork.used,
        units: manifest.units.length,
        roots:
          selected.diagnostics.preparation.roots +
          manifest.requiredRoots.length -
          selected.manifest.requiredRoots.length,
      },
      inputBytes,
      contextTokenEstimate: contextTokenEstimate(inputBytes, !!selected.inputMeasure),
      sections: contextSectionBytes(selected.context),
      postAdmissionBudget: {
        selectedInputBytes: selectedBytes,
        inputBytes,
        requiredClosureUsed: selectedBytes > CONTEXT_BYTE_LIMIT,
        updatedFields: Object.keys(updates),
        omitted,
      },
    },
  };
}

function preparedCandidateMeasure(prepared: Awaited<ReturnType<typeof prepareDecision>>) {
  return prepared.inputMeasure
    ? (candidates: readonly CandidateAction[]) => {
        const fragmentBytes = candidates.reduce(
          (sum, candidate) => sum + Buffer.byteLength(candidate.description),
          0,
        );
        prepared.preparationWork.charge({
          candidates: candidates.length,
          inputBytes: prepared.diagnostics.inputBytes + fragmentBytes,
          outputBytes: prepared.diagnostics.inputBytes + fragmentBytes,
          tests: 1,
        });
        return measuredPreparedInput(
          prepared,
          candidates.map((candidate, index) => candidateOffer(candidate, `a${index}`)),
        )!;
      }
    : undefined;
}

interface DecisionActionSelection {
  status: string;
  reason?: string;
  candidates: number;
  judged: number;
  omittedForSize: number;
  offered: number;
  answers: JudgeValue['answers'];
  requestBytes?: number;
}
type DecisionActionPreparation = Awaited<ReturnType<typeof prepareDecision>> & {
  diagnostics: Awaited<ReturnType<typeof prepareDecision>>['diagnostics'] & {
    actionSelection: DecisionActionSelection;
  };
};

/** Restore the owned no-suggestion fragments without another fit or render.
 * Fixed work/plan/confirmation choices stay bound; only optional a<N> offers go.
 * docs/technical/situation-aware-cognition-context.md#131-explicit-compiler-work-admission */
function optionalActionsUnavailable(
  prepared: Awaited<ReturnType<typeof prepareDecision>>,
  reason: string,
  attempted?: {
    requestBytes: number;
    judged: number;
    omittedForSize: number;
    answers: JudgeValue['answers'];
  },
): DecisionActionPreparation {
  const baseline = prepared.actionBaseline;
  const previous: typeof prepared.diagnostics & { actionSelection?: DecisionActionSelection } =
    prepared.diagnostics;
  const actionSelection: DecisionActionSelection = {
    candidates: prepared.actionCandidates.length,
    judged: 0,
    omittedForSize: 0,
    answers: {},
    ...previous.actionSelection,
    ...attempted,
    status: 'unavailable: optional action preparation capacity',
    reason,
    offered: 0,
  };
  return {
    ...prepared,
    prompt: baseline.prompt,
    responseSupplementOffset: baseline.responseSupplementOffset,
    actionSectionBytes: baseline.actionSectionBytes,
    entityReferences: baseline.entityReferences,
    offered: [] as DecisionActionOffer[],
    optionalActionsUnavailable: reason,
    binding: {
      ...prepared.binding,
      actions: baseline.actions,
      entityIds: Object.values(baseline.entityReferences),
    },
    diagnostics: {
      ...prepared.diagnostics,
      inputBytes: baseline.inputBytes,
      contextTokenEstimate: contextTokenEstimate(baseline.inputBytes, !!prepared.inputMeasure),
      preparation: { ...prepared.diagnostics.preparation, work: prepared.preparationWork.used },
      actionSelection,
    },
  };
}

export async function selectDecisionActions(
  prepared: Awaited<ReturnType<typeof prepareDecision>>,
  judge: (r: Omit<JudgeRequest, 'requestId' | 'signal'>) => Promise<JudgeValue>,
  purpose: 'actions' | 'choose-action' = 'actions',
  fixedQuestions: TypedQuestionMap = {},
): Promise<DecisionActionPreparation> {
  if (prepared.choiceCoverage === 'complete-required')
    throw new Error(
      'Required choices use their selected deliberation strategy, not optional action relevance.',
    );
  if (prepared.optionalActionsUnavailable)
    return optionalActionsUnavailable(prepared, prepared.optionalActionsUnavailable);

  // A generative consumer can own full forms, but action judgment only needs
  // supported discovery, native alternatives and personal evidence.
  let request: ReturnType<typeof attentionRequest>;
  let requestBytes: number;
  const candidates = prepared.actionCandidates;
  let allOffers: DecisionActionOffer[];
  try {
    const descriptionBytes = candidates.reduce(
      (sum, candidate) => sum + Buffer.byteLength(candidate.description),
      0,
    );
    prepared.preparationWork.charge({
      candidates: candidates.length,
      inputBytes: prepared.actionBaseline.promptBytes + descriptionBytes,
      tests: candidates.length,
    });
    const {
      activityRequests: _forms,
      activityDirectory: _directory,
      activityRoutePolicy: _routePolicy,
      decisionRequirements: _responseTask,
      ...rawFacts
    } = prepared.context;
    const directory = activityRequestDirectory(prepared.discoveryDescriptors);
    const facts = judgmentDecisionContext({
      ...rawFacts,
      ...(directory.length
        ? { activityDirectory: directory, activityRoutePolicy: ACTIVITY_ROUTE_POLICY }
        : {}),
    });
    allOffers = candidates.map((candidate, index) => candidateOffer(candidate, `a${index}`));
    request = attentionRequest(
      {
        decisionContext: facts,
        attentionPolicy: `${prepared.actionGuidance.reasons} ${ACTION_EVIDENCE_POLICY}${purpose === 'actions' ? ' Include uncertain but plausible options without choosing a final action. Listing is not endorsement; no action and unlisted attempts remain valid.' : ''}`,
      },
      allOffers.map((offer) => [offer.id, offer.description]),
      purpose,
      prepared.actionGuidance,
      fixedQuestions,
    );
    // Measure the exact state/question object dispatched below. The earlier
    // routing measurer cannot account for these different questions/candidates.
    requestBytes = Buffer.byteLength(JSON.stringify(request));
    prepared.preparationWork.charge({
      inputBytes: requestBytes,
      outputBytes: requestBytes,
      tests: Object.keys(request.questions).length,
    });
  } catch (error) {
    if (!(error instanceof WorkBudgetError)) throw error;
    return optionalActionsUnavailable(prepared, error.message);
  }
  // Provider failures keep their original outcome; only local optional work
  // exhaustion restores a baseline. A failed selection never buys a repair call.
  const judged = Object.keys(request.questions).length ? await judge(request) : { answers: {} };
  const judgedCount = Object.keys(request.questions).filter(
    (key) => !Object.hasOwn(fixedQuestions, key),
  ).length;
  try {
    const selected = candidates.flatMap((candidate, index) => {
      const handle = `a${index}`;
      if (!Object.hasOwn(request.questions, handle)) return [];
      const answer = judged.answers[handle];
      const include =
        purpose === 'choose-action'
          ? answer?.type === 'noul' && answer.noul >= JEV_ACTION_THRESHOLD
          : attentionIncludes(answer);
      return include ? [{ candidate, offer: allOffers[index]! }] : [];
    });
    const selectedBytes =
      prepared.actionBaseline.promptBytes +
      selected.reduce((sum, row) => sum + Buffer.byteLength(row.offer.description), 0);
    prepared.preparationWork.charge({
      candidates: selected.length,
      inputBytes: selectedBytes,
      outputBytes: selectedBytes,
      tests: 1,
    });
    const actions = {
      ...prepared.actionBaseline.actions,
      ...Object.fromEntries(
        selected.map(({ candidate, offer }) => [
          offer.id,
          candidateChoice(
            candidate,
            prepared.binding.actorId,
            prepared.binding.decisionId,
            prepared.choiceWork,
          ),
        ]),
      ),
    };
    const offered = selected.map(({ offer }) => offer);
    const entityReferences = actionEntityReferences(
      prepared,
      selected.map(({ candidate }) => candidate),
    );
    const { prompt, responseSupplementOffset, actionSectionBytes } = renderDecisionContext(
      prepared.context,
      offered,
      true,
    );
    return {
      ...prepared,
      binding: { ...prepared.binding, actions, entityIds: Object.values(entityReferences) },
      entityReferences,
      offered,
      prompt,
      responseSupplementOffset,
      actionSectionBytes,
      diagnostics: {
        ...prepared.diagnostics,
        preparation: { ...prepared.diagnostics.preparation, work: prepared.preparationWork.used },
        inputBytes: requestBytes,
        contextTokenEstimate: contextTokenEstimate(requestBytes, true),
        actionSelection: {
          status: candidates.length ? 'completed after action gate' : 'no candidates',
          candidates: candidates.length,
          judged: judgedCount,
          omittedForSize: candidates.length - judgedCount,
          offered: offered.length,
          answers: judged.answers,
          requestBytes,
        },
      },
    };
  } catch (error) {
    if (!(error instanceof WorkBudgetError)) throw error;
    return optionalActionsUnavailable(prepared, error.message, {
      requestBytes,
      judged: judgedCount,
      omittedForSize: candidates.length - judgedCount,
      answers: judged.answers,
    });
  }
}

/** Refresh cheap native feasibility after provider latency without rebuilding recall. */
/** Recover only the concrete alternatives actually offered, using the captured
 * native invocation/purpose/work binding rather than display text or shifted IDs. */
export function selectedDecisionActionCandidates(
  prepared: Awaited<ReturnType<typeof prepareDecision>>,
): CandidateAction[] {
  const candidates = new Map<string, CandidateAction[]>();
  for (const candidate of prepared.actionCandidates) {
    const key = canonicalJson(
      candidateChoice(
        candidate,
        prepared.binding.actorId,
        prepared.binding.decisionId,
        prepared.choiceWork,
      ),
    );
    const entries = candidates.get(key) ?? [];
    entries.push(candidate);
    candidates.set(key, entries);
  }
  return prepared.offered.map((offer) => {
    const binding = prepared.binding.actions[offer.id];
    const candidate = binding && candidates.get(canonicalJson(binding))?.shift();
    if (!candidate) throw new Error('An offered action lost its captured native binding.');
    return candidate;
  });
}

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
  if (prepared.optionalActionsUnavailable) {
    if (requiredOfferId)
      throw new ContextBudgetError('The selected physical action context is unavailable.');
    if (
      prepared.actionBaseline.promptBytes +
        Buffer.byteLength(RESPONSE_INSTRUCTIONS) +
        reservedBytes >
      CONTEXT_BYTE_LIMIT
    )
      throw new ContextBudgetError();
    return optionalActionsUnavailable(prepared, prepared.optionalActionsUnavailable);
  }
  try {
    if (
      Buffer.byteLength(prepared.prompt) +
        Buffer.byteLength(RESPONSE_INSTRUCTIONS) +
        reservedBytes <=
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
    const bytesFor = (offers: typeof prepared.offered) => {
      prepared.preparationWork.charge({
        candidates: offers.length,
        inputBytes:
          fixedBytes + offers.reduce((sum, offer) => sum + Buffer.byteLength(offer.description), 0),
        outputBytes:
          fixedBytes + offers.reduce((sum, offer) => sum + Buffer.byteLength(offer.description), 0),
        tests: 1,
      });
      return fixedBytes + Buffer.byteLength(renderActionChoices(offers));
    };
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
        preparation: { ...prepared.diagnostics.preparation, work: prepared.preparationWork.used },
        responseBudget: {
          available: prepared.offered.length,
          included: offered.length,
          reservedBytes,
          inputBytes:
            Buffer.byteLength(prompt) + Buffer.byteLength(RESPONSE_INSTRUCTIONS) + reservedBytes,
        },
      },
    };
  } catch (error) {
    if (
      !(error instanceof WorkBudgetError) ||
      prepared.choiceCoverage === 'complete-required' ||
      requiredOfferId
    )
      throw error;
    if (
      prepared.actionBaseline.promptBytes +
        Buffer.byteLength(RESPONSE_INSTRUCTIONS) +
        reservedBytes >
      CONTEXT_BYTE_LIMIT
    )
      throw new ContextBudgetError();
    return optionalActionsUnavailable(prepared, error.message);
  }
}

/** Bind/render supplied options without another relevance call. Required sets are
 * all-or-refused; ordinary fallback remains explicitly optional. */
export function offerPreparedActions(
  prepared: Awaited<ReturnType<typeof prepareDecision>>,
  candidates: CandidateAction[],
  reason: string,
): DecisionActionPreparation {
  if (prepared.optionalActionsUnavailable && prepared.choiceCoverage !== 'complete-required')
    return optionalActionsUnavailable(prepared, prepared.optionalActionsUnavailable);
  try {
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
    const entityReferences = actionEntityReferences(prepared, candidates);
    return {
      ...prepared,
      binding: {
        ...prepared.binding,
        actions,
        entityIds: Object.values(entityReferences),
      },
      entityReferences,
      offered,
      prompt,
      responseSupplementOffset,
      actionSectionBytes,
      diagnostics: {
        ...prepared.diagnostics,
        preparation: { ...prepared.diagnostics.preparation, work: prepared.preparationWork.used },
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
  } catch (error) {
    if (!(error instanceof WorkBudgetError) || prepared.choiceCoverage === 'complete-required')
      throw error;
    return optionalActionsUnavailable(prepared, error.message);
  }
}
