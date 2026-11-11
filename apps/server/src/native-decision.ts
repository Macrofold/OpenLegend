import { indentedContextTextBytes } from './response-context.js';
import {
  experienceSourceKey,
  resultEvidenceId,
  resultEvidenceMatchesReceipt,
  clockDeadline,
  type AppraisalScope,
  type TemporalHistorySelection,
  type ActivityRequestDescriptor,
} from '@open-legend/domain';
import type { JudgeRequest, JudgeValue, JudgmentAnswer, TypedQuestionMap } from '@open-legend/ai';
import type {
  NativeWorldNpcResponseTicket,
  NativeWorldNpcTrigger,
  NativeWorldReflectionTicket,
} from '@open-legend/native-simulation';
import type { NativeWorldService } from './native-world-service.js';
import type { NativeNpcActionCapture, NativeNpcCapture } from './native-npc-capture.js';
import {
  MemoryReadCache,
  memorySourceProof,
  conversationCompactionKey,
  type CurrentMemorySource,
  type MemoryScope,
} from './memory-repository.js';
import { nativeTemporalHistoryContext } from './native-temporal-context.js';
import {
  admitNativeSituationHistory,
  expandNativeDecisionSituation,
} from './native-decision-query.js';
import { prepareNativeActorInvention } from './native-actor-invention.js';
import { withSituationQueries } from './decision-situation-query.js';
import { reconsiderationResponseCapabilities } from './decision-preparation.js';
import { nativeRequiredOutcomeEvidence } from './native-decision-context.js';
import { nativeDecisionFields } from './native-decision-fields.js';
import {
  nativeDecisionValidity,
  nativePreparedResponseValidity,
} from './native-decision-validity.js';
import { nativeResponseReferences, nativeTriggerContext } from './native-response-context.js';
import { nativeResponseSelection } from './native-response-bindings.js';
import { offerNativeInterpretationRecords } from './native-interpretation-context.js';
import { nativeKnowledgeCandidates } from './native-knowledge-context.js';
import {
  retrieveNativeRecall,
  selectNativeRecall,
  nativeProjectEntityMarkers,
  type NativeRecallRuntime,
} from './native-recall-service.js';
import { buildNativeConversationContext } from './native-conversation-context.js';
import {
  CONVERSATION_PREPARATION_BYTES,
  conversationCompactionCandidate,
  type ConversationGenerate,
  type ConversationSelectionValidity,
} from './conversation-context.js';
import {
  temporalHistoryForModel,
  situationResponseCapabilities,
  type SituationQuery,
} from './situation-context.js';
import { contextSections, type SharedModelExperience } from './perceived-context.js';
import { fitActionCandidates } from './decision-context.js';
import { decisionActivityFactsFromRead } from './decision-activity-facts.js';
import { ContextBudgetError, CONTEXT_BYTE_LIMIT } from './context.js';
import {
  nativeDecisionPrompt,
  nativeDecisionPromptSize,
  nativeDecisionJsonText,
  nativeDecisionJsonSize,
  joinNativeDecisionText,
  type NativeDecisionText,
} from './native-decision-prompt.js';
import {
  COGNITION_VERSION,
  RESPONSE_INSTRUCTIONS,
  boundResponseSchema,
  previewSpeechOperation,
} from './cognition-contracts.js';
import { decisionActionAttentionRequest } from './attention-request.js';
import {
  ACTION_EVIDENCE_POLICY,
  attentionIncludes,
  JEV_ACTION_THRESHOLD,
} from './jev-questions.js';
import { ACTION_RETRIEVAL_LIMIT } from './action-retrieval.js';
import { noteReference } from './knowledge-context.js';
import {
  copyNativeProduct,
  createNativeConsumerScope,
  releaseNativeProduct,
  retainNativeSources,
  withNativeConsumerScope,
  withoutNativeConsumerScope,
  withNativeJsonInput,
  reserveNativeJsonTextWorkspace,
} from './native-consumer.js';
import type { NativeFormattedNpcOffer } from './native-npc-candidates.js';
import type { NativeNpcBindingSelection } from './native-npc-sources.js';
import { nativeNpcPersonalSelection } from './native-npc-sources.js';
import { projectNativeDecisionContext } from './native-context-projection.js';
import type { z } from 'zod';
import type { DecisionAppraisalProposal } from './cognition-contracts.js';
import {
  admitDecisionGraph,
  decisionArrayBytes,
  decisionObjectBytes,
  decisionRecordEntries,
  decisionTextBytes,
  projectDecisionSchema,
} from './native-decision-allocation.js';

type Judge = (
  request: Omit<JudgeRequest, 'requestId' | 'signal'>,
  publish: <T>(start: () => T) => Promise<{ result: T }>,
) => Promise<JudgeValue>;
export interface NativeAppraisalPreparation {
  readonly context: unknown;
  readonly schema?: z.ZodType<DecisionAppraisalProposal>;
  readonly selection: NativeNpcBindingSelection['appraisals'];
  current(): Promise<boolean>;
}

export interface NativeDecisionRouting {
  readonly judged: JudgeValue;
  readonly questions: TypedQuestionMap;
  readonly families: ReadonlyMap<string, ActivityRequestDescriptor>;
  readonly actionPurpose?: 'actions' | 'choose-action';
  readonly actionAnswers?: Record<string, JudgmentAnswer>;
  readonly actionFallback?: true;
}

export interface NativeDecisionRouteInput {
  prompt: string;
  addressedSpeech: boolean;
  speechTrigger: boolean;
  activityRequests: ReturnType<typeof decisionActivityFactsFromRead>['activityRequests'];
  actionRequest(purpose: 'actions' | 'choose-action'): Omit<JudgeRequest, 'requestId' | 'signal'>;
  refreshActions(): Promise<void>;
  sourcesCurrent(): boolean;
  publish: Parameters<Judge>[1];
}

/** Complete ordinary decision preparation from native read owners and actual
 * indexed personal storage. The director supplies paid dispatch/accounting and
 * the appraisal owner; neither callback may supply world facts or permissions. */
type NativeDecisionInput = {
  service: NativeWorldService;
  runtime: NativeRecallRuntime;
  actorId: string;
  jobId: string;
  stimulus: string;
  requiredIds: string[];
  judge: Judge;
  signal: AbortSignal;
  budgetCeiling: number;
  includeCurrentConversation: boolean;
  attempt: number;
  triggerEvidenceId?: string;
  compact?: ConversationGenerate;
  mode: 'ordinary' | 'native-only' | 'reflection';
  consumer: 'chat' | 'thought' | 'reflection';
  requiredAppraisals: readonly AppraisalScope[];
  validity: NativeNpcBindingSelection['validity'];
  semanticCauses: readonly number[];
  semanticTrigger?: NativeWorldNpcTrigger;
  routeActions?(input: NativeDecisionRouteInput): Promise<NativeDecisionRouting>;
  prepareAppraisals(input: {
    original: NativeNpcCapture;
    current: NativeNpcCapture;
    scope: MemoryScope;
    evidenceIds: string[];
    subjects: Record<string, string>;
    sharedExperiences: ReadonlyMap<string, SharedModelExperience>;
    frame: ReturnType<typeof situationResponseCapabilities>['frame'];
    currentTicket(): Promise<boolean>;
  }): Promise<NativeAppraisalPreparation>;
};

export async function prepareNativeDecision(input: NativeDecisionInput) {
  const owner = createNativeConsumerScope();
  try {
    return await owner.run(() => prepareOwnedDecision(input, owner));
  } catch (error) {
    input.semanticTrigger = undefined;
    owner.dispose();
    throw error;
  }
}

async function prepareOwnedDecision(
  input: NativeDecisionInput,
  owner: ReturnType<typeof createNativeConsumerScope>,
) {
  const { service, actorId, jobId, signal } = input;
  const formattingOwner = createNativeConsumerScope();
  const routingOwner = createNativeConsumerScope();
  const format = <T>(build: () => T): T => formattingOwner.runSync(build);
  let contextRetired = false;
  const requireContext = () => {
    if (contextRetired) throw new Error('The native decision request context was consumed.');
  };
  const textProducts: NativeDecisionText[] = [];
  const keepText = (build: () => NativeDecisionText): string => {
    const product = format(build);
    textProducts.push(product);
    return product.text;
  };
  const promptBytes = (
    context: Record<string, unknown>,
    actions: { id: string; description: string }[],
    includeActions: boolean,
  ) => nativeDecisionPromptSize(service.world, context, actions, includeActions);

  let decisionId = jobId;
  const generation = service.generation;
  const repository = service.store.memories;
  if (!repository) throw new Error('Native decisions require indexed personal storage.');
  const start = await service.captureNpc(actorId, input.requiredAppraisals, {
    signal,
    consumer: input.consumer,
  });
  const original = start.capture;
  const conversationOwner = createNativeConsumerScope();
  let current: NativeNpcCapture | undefined;
  let conversationCurrent: NativeNpcCapture | undefined;
  let ticket: NativeWorldNpcResponseTicket | undefined;
  let reflectionTicket: NativeWorldReflectionTicket | undefined;
  let actionCapture: NativeNpcActionCapture | undefined;
  let completed = false;
  const scope: MemoryScope = {
    worldId: service.worldId,
    actorId,
    generation: start.cut.generation,
  };
  const fence = repository.captureTemporalSourceFence(scope, signal);
  const bodies = new MemoryReadCache();
  const sql = <T>(operation: () => Promise<T>) => service.withActorMemoryRead(actorId, operation);
  const assertCurrent = () => {
    signal.throwIfAborted();
    if (generation !== service.generation || !fence.current())
      throw new Error('Personal evidence changed during native decision preparation.');
  };
  const sourcesCurrent = () =>
    generation === service.generation && fence.current() && !signal.aborted;
  const historyCurrent = async () => {
    assertCurrent();
    // Issuance moves the actual reads into the ticket. Checks after that move
    // must use its owner, rather than a consumed read handle.
    if (ticket || reflectionTicket) return currentTicket();
    const { result } = await service.publishNpcHistory(original, () => true);
    assertCurrent();
    return result;
  };
  const publishHistory = <T>(start: () => T) =>
    service.publishNpcHistory(original, () => {
      assertCurrent();
      return withoutNativeConsumerScope(start);
    });
  const judge = (request: Omit<JudgeRequest, 'requestId' | 'signal'>) =>
    input.judge(request, publishHistory);
  const currentTicket = async () => {
    assertCurrent();
    if (reflectionTicket) return reflectionTicket.sourcesCurrent();
    if (!ticket) throw new Error('Native decision has no issued response ticket.');
    return service.publishRecall(async () => {
      const publication = await service.world.npcResponsePublication(ticket!);
      try {
        return (
          publication !== null && publication.isCurrent() && fence.current() && !signal.aborted
        );
      } finally {
        publication?.release();
      }
    });
  };
  try {
    const outcomeEvidence = nativeRequiredOutcomeEvidence(original.facts.self);
    const recentResults = outcomeEvidence.filter((source) => source.kind === 'recent');
    const evidenceIds = [
      ...new Set([
        ...input.requiredIds,
        ...(input.triggerEvidenceId ? [input.triggerEvidenceId] : []),
      ]),
    ];
    const recallIds = [
      ...new Set([
        ...evidenceIds,
        ...outcomeEvidence.flatMap((source) => (source.kind === 'account' ? [source.id] : [])),
      ]),
    ];
    const retainedEvidence = await sql(() => repository.evidence(scope, evidenceIds, bodies));
    const evidenceSelection = await service.prepareNpcSources(
      original,
      {
        personal: retainedEvidence.map(nativeNpcPersonalSelection),
        receipts: [],
      },
      signal,
    );
    if (evidenceSelection.unavailablePersonal.length)
      throw new Error('Initiating personal evidence changed during native preparation.');
    const evidence = evidenceSelection.personal;
    const aware = evidence.flatMap((source) =>
      source.reference.kind === 'awareness'
        ? [source.value as import('@open-legend/domain').Awareness]
        : [],
    );
    const decisionEvidence = aware.filter((entry) => evidenceIds.includes(entry.eventId));
    const addressedSpeech = decisionEvidence.some(
      (entry) => entry.triggerKind === 'addressed_speech',
    );
    const speechEvidenceIds = new Set(
      decisionEvidence.filter((entry) => !!entry.speech).map((entry) => entry.eventId),
    );
    const speechTrigger =
      decisionEvidence.some(
        (entry) => entry.eventType === 'speech' && entry.modality !== 'observed',
      ) && speechEvidenceIds.size === evidenceIds.length;
    const historySubjects = original.attention().entries.map((entry) => entry.exposure.track);
    const readHistory = (query: Parameters<typeof repository.temporalHistory>[1]) =>
      service.withActorMemoryRead(actorId, (cut) =>
        repository.temporalHistory(
          scope,
          query,
          nativeTemporalHistoryContext(original.facts, cut, service.definitions.facts),
        ),
      );
    const recentHistory = await readHistory({
      subjects: historySubjects,
      through: original.facts.self.at,
      cut: original.facts.perception.npcCurrent.receiptPrefix!,
      bytes: service.definitions.facts.settings.personalEvidencePreparation.bytes,
      limit: service.definitions.facts.nativePolicies.attention.scene.historyReceipts,
    });
    let selectedResults: TemporalHistorySelection = { entries: [], incomplete: false };
    if (recentResults.length) {
      const subjects = [...new Set(recentResults.map((source) => source.subject))];
      const result = await readHistory({
        receipts: recentResults.map((source) => source.receipt),
        subjects,
        kinds: ['action-result'],
        cut: original.facts.perception.npcCurrent.receiptPrefix!,
        through: original.facts.self.at,
        bytes: service.definitions.facts.settings.personalEvidencePreparation.bytes,
        limit: recentResults.length,
      });
      selectedResults = {
        ...result,
        entries: result.entries.filter(({ receipt }) =>
          recentResults.some((source) => resultEvidenceMatchesReceipt(source, receipt)),
        ),
      };
    }
    const observations = aware.flatMap((entry) => [
      ...(entry.observation ? [entry.observation] : []),
      ...(entry.observations ?? []),
    ]);
    const situation = await service.prepareNpcSituation(
      original,
      jobId,
      recentHistory,
      observations,
    );
    situation.bindHistory(selectedResults);
    await admitNativeSituationHistory(service, original, situation, signal);
    const recentWorkResults = selectedResults.entries.length
      ? temporalHistoryForModel(situation.presentation, actorId, selectedResults, situation.frame)
      : undefined;
    const triggerSource = evidence.find(
      (source) =>
        source.reference.kind === 'awareness' && source.reference.id === input.triggerEvidenceId,
    );
    const initialTrigger =
      triggerSource &&
      nativeTriggerContext(
        triggerSource,
        original,
        original,
        service.definitions,
        situation.presentation,
      );
    const stimulus = nativeProjectEntityMarkers(
      initialTrigger?.stimulus ?? input.stimulus,
      original,
    );
    const includeConversation =
      input.includeCurrentConversation || aware.some((entry) => !!entry.speech);
    const snapshot = await sql(() =>
      repository.context(scope, evidenceIds, includeConversation, CONVERSATION_PREPARATION_BYTES),
    );
    const validity: ConversationSelectionValidity = {
      boundSources: [],
      usedCache: undefined,
      boundEntities: [],
      expectedPerspective: '',
    };
    let compactedSources: Parameters<typeof repository.currentCompactionSources>[1] | undefined;
    const saved = includeConversation
      ? await service.store.getIntegration(conversationCompactionKey(scope.worldId, actorId))
      : undefined;
    const initialFields = nativeDecisionFields(original, service.definitions, 'initial');
    const initialActivity = decisionActivityFactsFromRead({
      simTime: original.facts.self.at,
      requests: service.definitions.requestDescriptors(),
      ...original.candidates().activity,
    });
    const baseContext = format(() =>
      admitDecisionGraph<Record<string, unknown>>(
        service.world,
        // The initial fields are already actor-scoped. This record and its six
        // initially empty lists are the new carriers owned by this preparation.
        decisionObjectBytes(
          14 + decisionRecordEntries(initialFields) + decisionRecordEntries(initialActivity),
        ) +
          6 * decisionArrayBytes(0),
        () => ({
          situationQueries: input.mode !== 'native-only',
          receivedSituation: situation.packet,
          ...(recentWorkResults ? { recentWorkResults } : {}),
          ...initialFields,
          ...initialActivity,
          stimulus,
          triggerFacts: initialTrigger?.facts ?? null,
          intentActions: [],
          planOffers: [],
          references: nativeResponseReferences(
            original,
            original,
            original.recallEntities().flatMap((candidate) => candidate.entityIds),
            evidence,
            evidenceIds,
            original.facts.referenceFacts.social.flatMap((fact) => fact.canonicalId ?? []),
          ).references,
          commitments: [],
          conversation: [],
          surroundings: [],
          possessions: [],
        }),
      ),
    );
    const recalled = await retrieveNativeRecall({
      ...input,
      mode: input.mode === 'reflection' ? 'ordinary' : input.mode,
      original,
      scope,
      requiredIds: recallIds,
      automaticIds: [],
      conversationIds: [],
      conversationSourceIds: snapshot.sources.map((source) => source.id),
      stimulus,
      requestId: `${jobId}:attempt:${input.attempt}`,
      bodies,
      current: historyCurrent,
    });
    const candidates = recalled.candidates;
    const recallPerspectives = await service.publishRecall(() =>
      original.capturePerspectives(
        service.world,
        candidates
          .filter((candidate) => candidate.kind === 'memory' || candidate.kind === 'conversation')
          .flatMap((candidate) => candidate.entityIds),
      ),
    );
    let rememberedPerspectives: NativeNpcBindingSelection['perspectives'] = [];
    // A derived conversation can retain retired exact versions. Its cache is
    // first checked by the SQL coverage owner; the native source owner then
    // admits those actual bodies and keeps their original witnesses private.
    const cachedCandidate = conversationCompactionCandidate(saved, actorId, scope.generation);
    const cachedReferences =
      cachedCandidate &&
      (await sql(() => repository.currentCompactionSources(scope, cachedCandidate.value.sources)))
        ? cachedCandidate.value.sources
        : [];
    const speechRows = await sql(() =>
      repository.evidence(
        scope,
        snapshot.sources.map((source) => source.id),
        bodies,
      ),
    );
    const speech = await service.prepareNpcSources(
      original,
      {
        personal: [
          ...new Map(
            [
              ...speechRows.map(nativeNpcPersonalSelection),
              ...cachedReferences.map((reference) => ({ reference })),
            ].map((source) => [experienceSourceKey(source.reference), source]),
          ).values(),
        ],
        receipts: [],
      },
      signal,
    );
    if (speech.unavailablePersonal.length)
      throw new Error('Selected native speech or cached source changed during preparation.');
    conversationCurrent = (
      await conversationOwner.run(() =>
        service.captureNpc(actorId, input.requiredAppraisals, {
          signal,
          consumer: input.consumer,
          choices: false,
        }),
      )
    ).capture;
    // The labels and their identity cut share one accepted service turn, like
    // Source's synchronous conversation projection after its SQL admission.
    const { presentation, conversationPerspectives } = await service.publishRecall(async () => {
      const presentation = await conversationOwner.run(() =>
        conversationCurrent!.prepareExperiencePresentation(
          service.world,
          service.definitions,
          speech.personal.map((source) => source.value),
        ),
      );
      const conversationPerspectives = await original.capturePerspectives(service.world, [
        ...(cachedReferences.length ? cachedCandidate!.value.entityIds : []),
        ...speech.personal.flatMap(
          (source) => (source.value as { entityIds: readonly string[] }).entityIds,
        ),
      ]);
      return { presentation, conversationPerspectives };
    });
    const selectedPerspectives = () => [
      ...rememberedPerspectives,
      ...conversationPerspectives.select(validity.boundEntities),
    ];
    const commitments = original
      .sources()
      .flatMap((source) => source.personal)
      .filter((source) => source.reference.kind === 'memory')
      .map((source) => source.value as import('@open-legend/domain').MemoryRecord)
      .filter(
        (memory) =>
          memory.obligation &&
          !memory.resolved &&
          ['active', 'overdue'].includes(memory.obligation.status) &&
          !(original.facts.self.npc.forgotten ?? []).includes(memory.id),
      );
    baseContext['commitments'] = commitments.map(
      (memory) =>
        `${memory.summary}${
          memory.obligation?.dueAt !== undefined
            ? ` Due in ${Math.max(0, memory.obligation.dueAt - original.facts.self.at)} game seconds.`
            : ''
        }`,
    );
    const requiredRecallBytes = () =>
      candidates
        .filter((candidate) => candidate.required)
        .reduce(
          (sum, candidate) =>
            sum +
            indentedContextTextBytes(candidate.text) +
            nativeDecisionJsonSize(service.world, candidate.experience ?? []) +
            Buffer.byteLength(candidate.id) +
            8,
          0,
        );
    const bytes = (
      context: Record<string, unknown>,
      actions: { id: string; description: string }[] = [],
    ) =>
      promptBytes(context, actions, actions.length > 0) + Buffer.byteLength(RESPONSE_INSTRUCTIONS);
    let requiredBytes = bytes(baseContext);
    if (requiredBytes + requiredRecallBytes() > CONTEXT_BYTE_LIMIT)
      throw new ContextBudgetError(
        'Complete accepted inner world and required context exceed the input budget.',
      );
    const conversationCheck = async (
      _flush = true,
      additionalSources: CurrentMemorySource[] = [],
    ) =>
      withNativeConsumerScope(async () => {
        original.guardPerspectives(selectedPerspectives());
        if (!(await historyCurrent())) throw new Error('Native decision sources changed.');
        const valid = await sql(() =>
          repository.validatePreparation(
            scope,
            { sequence: 0, sources: validity.boundSources },
            additionalSources,
          ),
        );
        const covered = compactedSources ?? validity.usedCache?.value.sources;
        const coverage =
          !covered || (await sql(() => repository.currentCompactionSources(scope, covered)));
        if (!valid || !coverage) throw new Error('Selected speech or recall sources changed.');
        if (!(await historyCurrent())) throw new Error('Native decision sources changed.');
      });
    const conversation = await conversationOwner.run(() =>
      buildNativeConversationContext({
        original,
        current: conversationCurrent!,
        definitions: service.definitions,
        repository: {
          currentCompactionSources: (...args) =>
            sql(() => repository.currentCompactionSources(...args)),
          publishConversationCompaction: (...args) =>
            repository.publishConversationCompaction(...args),
        },
        scope,
        sources: speech.personal,
        presentation,
        attribution: conversationPerspectives.attribution,
        snapshot,
        saved,
        requiredIds: recallIds,
        maxBytes: CONTEXT_BYTE_LIMIT - requiredBytes - requiredRecallBytes(),
        signal,
        attempt: input.attempt,
        model: service.config.macrofoldKey
          ? service.config.macrofoldComplexModel
          : service.config.complexModel,
        ...(input.compact
          ? {
              generate: async (...args: Parameters<ConversationGenerate>) => {
                await historyCurrent();
                return input.compact!({ ...args[0], publication: publishHistory }, args[1]);
              },
            }
          : {}),
        check: conversationCheck,
        assertCurrent,
        validity,
      }),
    );
    conversationCurrent.release();
    conversationCurrent = undefined;
    baseContext['conversation'] = conversation.lines;
    baseContext['experience'] = conversation.experience;
    const conversationKeys = new Set(conversation.sourceKeys);
    for (let index = candidates.length - 1; index >= 0; index--)
      if (
        !candidates[index]!.requiredSource &&
        candidates[index]!.sourceKeys?.some((key) => conversationKeys.has(key))
      )
        candidates.splice(index, 1);
    requiredBytes = bytes(baseContext);
    const offersAtStart = original.choiceDescriptions(service.definitions);
    const largest = [...offersAtStart]
      .sort((a, b) => Buffer.byteLength(b.description) - Buffer.byteLength(a.description))
      .slice(0, ACTION_RETRIEVAL_LIMIT)
      .map((offer, index) => ({ id: `a${index}`, description: offer.description }));
    const actionReserve = Math.min(
      50000,
      Math.max(0, bytes(baseContext, largest) - requiredBytes),
      Math.max(0, CONTEXT_BYTE_LIMIT - requiredBytes - requiredRecallBytes()),
    );
    if (requiredBytes + actionReserve + requiredRecallBytes() > CONTEXT_BYTE_LIMIT)
      throw new ContextBudgetError(
        'Complete accepted inner world and required context exceed the input budget.',
      );
    await historyCurrent();
    const selection = await selectNativeRecall({
      ...input,
      mode: input.mode === 'reflection' ? 'ordinary' : input.mode,
      original,
      stimulus,
      jobId: `${jobId}:attempt:${input.attempt}`,
      candidates,
      runtime: {
        ...input.runtime,
        retrieval: recalled.retrieval,
        noteCoverage: recalled.noteCoverage,
        current: historyCurrent,
      },
      optionalByteBudget: CONTEXT_BYTE_LIMIT - requiredBytes - actionReserve,
      immediateContext: {
        identity: baseContext['identity'],
        notepad: baseContext['notepad'],
        triggerFacts: baseContext['triggerFacts'],
        now: baseContext['now'],
        body: baseContext['body'],
        agency: baseContext['agency'],
        ...(original.facts.self.npc.contacts ? { contacts: baseContext['contacts'] } : {}),
      },
      judge: async (request) => {
        await conversationCheck();
        return judge(request);
      },
    }).catch((error: unknown) => {
      signal.throwIfAborted();
      return {
        selected: candidates.filter((candidate) => candidate.required || candidate.automatic),
        diagnostics: {
          attentionStatus: `Optional retrieval unavailable: ${error instanceof Error ? error.message : 'failed'}`,
          fallback: 'hard-query baseline',
        },
      };
    });
    const selectedProofs = [
      ...recalled.selectedSources(selection.selected),
      ...retainedEvidence.map(memorySourceProof),
    ];
    rememberedPerspectives = recallPerspectives.select(
      selection.selected
        .filter((candidate) => candidate.kind === 'memory' || candidate.kind === 'conversation')
        .flatMap((candidate) => candidate.entityIds),
    );
    await conversationCheck(false, selectedProofs);
    current = (
      await service.captureNpc(actorId, input.requiredAppraisals, {
        signal,
        consumer: input.consumer,
      })
    ).capture;
    const now = current;
    const currentFacts = [
      ...now.recallEntities(),
      ...nativeKnowledgeCandidates(
        now,
        service.definitions,
        new Set(
          now
            .candidates()
            .bodyOrdinals.map((ordinal) => now.facts.perception.bodies[ordinal]!.sourceId),
        ),
        selection.selected
          .filter((candidate) => candidate.id.startsWith('notepad:'))
          .map((candidate) => candidate.id.slice('notepad:'.length)),
      ),
    ];
    const byId = new Map(currentFacts.map((candidate) => [candidate.id, candidate]));
    const refreshed = [
      ...new Map(
        [
          ...selection.selected.flatMap((candidate) =>
            ['entity', 'possession', 'knowledge'].includes(candidate.kind)
              ? byId.has(candidate.id)
                ? [byId.get(candidate.id)!]
                : []
              : [candidate],
          ),
          ...currentFacts.filter((candidate) => candidate.required),
        ].map((candidate) => [candidate.id, candidate]),
      ).values(),
    ];
    const includedKeys = new Set([
      ...refreshed.flatMap((candidate) => candidate.sourceKeys ?? []),
      ...conversation.sourceKeys,
    ]);
    const personal = original.sources().flatMap((source) => source.personal);
    const selectedPersonal = personal.filter((source) =>
      includedKeys.has(experienceSourceKey(source.reference)),
    );
    const references = nativeResponseReferences(
      now,
      original,
      refreshed
        .filter((candidate) => candidate.kind === 'entity')
        .flatMap((candidate) => candidate.entityIds),
      evidence,
      evidenceIds,
      [
        ...refreshed
          .filter((candidate) => ['memory', 'conversation', 'knowledge'].includes(candidate.kind))
          .flatMap((candidate) => candidate.entityIds),
        ...conversation.entityIds,
        ...now.facts.referenceFacts.social.flatMap((fact) => fact.canonicalId ?? []),
      ],
      refreshed.flatMap((candidate) => candidate.subjects ?? []),
    );
    const missing = outcomeEvidence
      .map(resultEvidenceId)
      .filter(
        (id) =>
          id &&
          !new Set([
            ...selectedResults.entries.map(({ receipt }) => receipt.id),
            ...candidates.flatMap((candidate) => candidate.sourceIds ?? [candidate.id]),
          ]).has(id),
      ).length;
    const fields = nativeDecisionFields(now, service.definitions, 'current');
    const attempts = now.facts.self.agency.attempts;
    let intentBytes = decisionArrayBytes(attempts.length);
    for (let ordinal = 0; ordinal < attempts.length; ordinal++)
      intentBytes +=
        decisionObjectBytes(3) +
        decisionTextBytes(ordinal < 10 ? 2 : 2 + Math.floor(Math.log10(ordinal))) +
        decisionTextBytes(
          'Decline/withdraw pending intent: '.length + attempts[ordinal]!.description.length,
        );
    const intentActions = admitDecisionGraph(service.world, intentBytes, () =>
      attempts.map((attempt, ordinal) => ({
        id: `w${ordinal}`,
        ordinal,
        description: `Decline/withdraw pending intent: ${attempt.description}`,
      })),
    );
    const trigger =
      triggerSource &&
      nativeTriggerContext(
        triggerSource,
        now,
        original,
        service.definitions,
        situation.presentation,
      );
    let experiences = conversation.experience.length;
    for (const candidate of refreshed)
      if (candidate.kind !== 'conversation' && candidate.kind !== 'entity')
        experiences += candidate.experience?.length ?? 0;
    let selectedSections: string[] = [];
    const decisionSections = () => {
      const sections = contextSections(
        refreshed.filter(
          (candidate) => candidate.kind !== 'conversation' && candidate.kind !== 'entity',
        ),
      );
      selectedSections = Object.keys(sections);
      return sections;
    };
    let context = format(() =>
      admitDecisionGraph<Record<string, unknown>>(
        service.world,
        decisionObjectBytes(
          decisionRecordEntries(baseContext) + decisionRecordEntries(fields) + 16,
        ) +
          decisionObjectBytes(decisionRecordEntries(fields.agency) + 1) +
          decisionObjectBytes(7) +
          decisionArrayBytes(7) +
          7 * decisionArrayBytes(0) +
          2 * decisionArrayBytes(refreshed.length) +
          2 * decisionArrayBytes(experiences) +
          decisionArrayBytes(intentActions.length) +
          intentActions.length * decisionObjectBytes(2),
        () => ({
          situationQueries: input.mode !== 'native-only',
          receivedSituation: situation.packet,
          ...(recentWorkResults ? { recentWorkResults } : {}),
          ...decisionActivityFactsFromRead({
            simTime: now.facts.self.at,
            requests: service.definitions.requestDescriptors(),
            ...now.candidates().activity,
          }),
          capabilities: {
            speech: fields.capabilities.speech,
            expressions: fields.capabilities.expressions,
          },
          expressionGuidance: fields.expressionGuidance,
          stimulus,
          notepad: fields.notepad,
          knowledgeInstructions: fields.knowledgeInstructions,
          triggerFacts: trigger?.facts ?? null,
          navigation: fields.navigation,
          namedTimes: fields.namedTimes,
          outputFamilies: fields.outputFamilies,
          currentSupport: fields.currentSupport,
          publicSurfaces: fields.publicSurfaces,
          intentActions: intentActions.map(({ id, description }) => ({ id, description })),
          identity: fields.identity,
          feelings: fields.feelings,
          aboutMe: fields.aboutMe,
          now: fields.now,
          body: fields.body,
          contacts: fields.contacts,
          commitments: baseContext['commitments'],
          activityCoverage: fields.activityCoverage,
          goal: fields.goal,
          agency: {
            outcomeCoverage: missing
              ? `${missing} recent work records are unavailable under current memory permissions/retention. Base decisions only on available memories and current evidence; do not reconstruct their effects from execution status.`
              : 'Recent work results are included through the same personal memories as other experiences.',
            ...fields.agency,
          },
          planOffers: [],
          conversation: conversation.lines,
          knowledgeCoverage:
            'knowledgeRetrieval' in selection.diagnostics
              ? selection.diagnostics.knowledgeRetrieval
              : { partial: true },
          ...decisionSections(),
        }),
      ),
    );
    context['experience'] = [
      ...((context['experience'] as SharedModelExperience['experience'][]) ?? []),
      ...conversation.experience,
    ];
    if ('reconsideration' in fields) context['reconsideration'] = fields.reconsideration;
    if ('carryingConcern' in fields) context['carryingConcern'] = fields.carryingConcern;
    context['references'] = references.references;
    const knowledge = admitDecisionGraph(
      service.world,
      decisionObjectBytes(refreshed.length) +
        3 * decisionArrayBytes(refreshed.length) +
        refreshed.length * decisionArrayBytes(2),
      () =>
        Object.fromEntries(
          refreshed
            .filter((candidate) => candidate.kind === 'knowledge')
            .flatMap((candidate) => {
              const doc = now.facts.self.knowledge?.[candidate.id.slice('notepad:'.length)];
              return doc?.subjectId &&
                (doc.subjectId.kind === 'entity' || doc.subjectId.kind === 'individual')
                ? [[noteReference(actorId, doc.subjectId), doc.subjectId]]
                : [];
            }),
        ),
    );
    const sharedExperiences = admitDecisionGraph(
      service.world,
      decisionObjectBytes(experiences) + experiences * decisionObjectBytes(3),
      () => new Map<string, SharedModelExperience>(),
    );
    for (const candidate of refreshed)
      candidate.experience?.forEach((experience, index) => {
        const key = candidate.sourceKeys?.[index];
        const record = selectedPersonal.find(
          (source) => experienceSourceKey(source.reference) === key,
        );
        if (key && record)
          sharedExperiences.set(key, { index, revision: record.reference.revision, experience });
      });
    for (const [key, value] of conversation.sharedExperiences)
      sharedExperiences.set(key, {
        index: 0,
        revision: value.revision,
        experience: value.experience,
      });
    format(() =>
      projectNativeDecisionContext(service.world, context, now, references.entityReferences),
    );
    // Interpretations cite the projected complete record actually included in
    // this request, rather than another copy of its unprojected source.
    const projected = context['experience'] as SharedModelExperience['experience'][];
    const unprojected = [
      ...refreshed
        .filter((candidate) => candidate.kind !== 'conversation' && candidate.kind !== 'entity')
        .flatMap((candidate) => candidate.experience ?? []),
      ...conversation.experience,
    ];
    for (const [key, shared] of sharedExperiences) {
      const index = unprojected.indexOf(shared.experience);
      if (index < 0 || !projected[index])
        throw new Error('Shared appraisal evidence has no included native experience.');
      sharedExperiences.set(key, {
        index,
        revision: shared.revision,
        experience: projected[index]!,
      });
    }
    // The actual request now owns the independently projected conversation
    // text and experiences. Only selected proof keys and diagnostics escape.
    const retainedConversation = copyNativeProduct(service.world, {
      boundSources: validity.boundSources,
      boundEntities: validity.boundEntities,
      compactedSources: validity.usedCache?.value.sources,
      evidenceIds: conversation.evidenceIds,
      awarenessSequence: conversation.awarenessSequence,
      diagnostics: conversation.diagnostics,
    });
    validity.boundSources = retainedConversation.boundSources;
    validity.boundEntities = retainedConversation.boundEntities;
    validity.usedCache = undefined;
    compactedSources = retainedConversation.compactedSources;
    conversationOwner.dispose();
    let allOffers = fitActionCandidates(
      context,
      [...now.choiceDescriptions(service.definitions)],
      0,
      'optional',
      promptBytes,
    );
    let actionSource: 'original' | 'current' = 'current';
    let reconsidering = input.validity === 'prepared-response';
    const guidance = service.definitions.facts.definitions.cognitionPolicy.actionGuidance;
    let options = allOffers.map((offer, index) => ({ ...offer, id: `a${index}` }));
    const refreshActions = async () => {
      if (actionCapture) return;
      await conversationCheck(false, selectedProofs);
      actionCapture = await formattingOwner.run(() =>
        service.captureNpcActions(actorId, input.consumer, signal),
      );
      await conversationCheck(false, selectedProofs);
      const refreshed = actionCapture;
      allOffers = format(() =>
        admitDecisionGraph(service.world, 3 * decisionArrayBytes(refreshed.offers.length), () =>
          fitActionCandidates(context, [...refreshed.offers], 0, 'optional', promptBytes),
        ),
      );
      options = format(() =>
        admitDecisionGraph(
          service.world,
          decisionArrayBytes(allOffers.length) +
            allOffers.length * (decisionObjectBytes(5) + decisionTextBytes(20)),
          () => allOffers.map((offer, index) => ({ ...offer, id: `a${index}` })),
        ),
      );
    };
    const actionRequest = (purpose: 'actions' | 'choose-action') =>
      routingOwner.runSync(() => {
        const contextKeys = decisionRecordEntries(context);
        // The shared helper borrows context children. It creates its own maps,
        // entry pairs, per-option question/label strings and JSON size probes.
        const policyUnits = guidance.reasons.length + ACTION_EVIDENCE_POLICY.length + 192;
        const questionUnits =
          256 + (purpose === 'actions' ? guidance.consideration.length : guidance.selection.length);
        const criteriaUnits =
          'true'.length +
          guidance.criteria.true.length +
          'false'.length +
          guidance.criteria.false.length +
          16;
        let requestBytes =
          3 * decisionObjectBytes(contextKeys + options.length + 2) +
          4 * decisionArrayBytes(contextKeys) +
          6 * decisionArrayBytes(options.length) +
          decisionTextBytes(policyUnits);
        let largestProbeUnits = policyUnits;
        for (const option of options) {
          requestBytes +=
            5 * decisionObjectBytes(4) +
            decisionObjectBytes(decisionRecordEntries(guidance.criteria)) +
            4 * decisionArrayBytes(2) +
            decisionTextBytes(questionUnits + 2 * option.id.length);
          largestProbeUnits = Math.max(
            largestProbeUnits,
            questionUnits + criteriaUnits + option.id.length + option.description.length,
          );
        }
        const json = reserveNativeJsonTextWorkspace(service.world, context);
        let probes: ReturnType<typeof service.world.reserveConsumerBytes> | undefined;
        try {
          probes = service.world.reserveConsumerBytes(
            decisionTextBytes(6 * largestProbeUnits) + decisionArrayBytes(4),
          );
          return admitDecisionGraph(service.world, requestBytes, () =>
            decisionActionAttentionRequest(context, options, purpose, guidance),
          );
        } finally {
          probes?.release();
          json.release();
        }
      });
    let routeText =
      input.mode === 'reflection'
        ? undefined
        : routingOwner.runSync(() => nativeDecisionPrompt(service.world, context, [], false));
    let routePrompt = routeText?.text;
    if (input.routeActions) await conversationCheck(false, selectedProofs);
    let routing: NativeDecisionRouting | undefined;
    let routingFailure: { error: unknown } | undefined;
    try {
      routing =
        input.routeActions && routePrompt !== undefined
          ? await routingOwner.run(() =>
              input.routeActions!({
                prompt: routePrompt!,
                addressedSpeech,
                speechTrigger,
                activityRequests: context['activityRequests'] as ReturnType<
                  typeof decisionActivityFactsFromRead
                >['activityRequests'],
                actionRequest,
                refreshActions,
                sourcesCurrent,
                publish: publishHistory,
              }),
            )
          : undefined;
    } catch (error) {
      signal.throwIfAborted();
      if (input.mode !== 'native-only') throw error;
      // Source retains the completed native-only preparation before routing.
      // Preserve that same original cut when routing fails or expires; the
      // director rethrows this exact failure after taking custody of the result.
      routingFailure = admitDecisionGraph(service.world, decisionObjectBytes(1), () => ({ error }));
    }
    let actionAnswers = routing?.actionAnswers;
    let includeActions = !routing || routing.actionPurpose !== undefined;
    let offered: NativeFormattedNpcOffer[];
    if (input.mode === 'reflection') offered = [];
    else if (input.mode === 'native-only' && !routing)
      offered = allOffers.map((offer, index) => ({ ...offer, id: `a${index}` }));
    else if (routing && !routing.actionPurpose) offered = [];
    else if (routing?.actionFallback) offered = options;
    else {
      const purpose = routing?.actionPurpose ?? 'actions';
      try {
        await conversationCheck(false, selectedProofs);
        let judged: JudgeValue = { answers: actionAnswers ?? {} };
        if (!actionAnswers) {
          const request = actionRequest(purpose);
          if (Object.keys(request.questions).length)
            judged = await routingOwner.run(() => judge(request));
        }
        offered = options.filter((offer) => {
          const answer = judged.answers[offer.id];
          return purpose === 'choose-action'
            ? answer?.type === 'noul' && answer.noul >= JEV_ACTION_THRESHOLD
            : attentionIncludes(answer);
        });
      } catch (error) {
        signal.throwIfAborted();
        if (purpose === 'choose-action') throw error;
        await conversationCheck(false, selectedProofs);
        offered = options;
      }
    }
    const retireRouting = () => {
      // Selection and its log consume these requests before generation. The
      // offered captions and native catalogue have independent request owners.
      routing = undefined;
      actionAnswers = undefined;
      routePrompt = undefined;
      routeText = undefined;
      allOffers = [];
      options = [];
      routingOwner.dispose();
    };
    const hasAppraisals =
      input.mode === 'reflection' ||
      service.definitions.facts.definitions.moduleManifest.appraisals?.definitions.some(
        (definition) => definition.decision,
      );
    // Reflection adds its workspace/appraisal presentation after the ordinary
    // Source preparation allowance. Its actual JSON request has its own full
    // budget check in the shared maintenance owner.
    const reflectionPreparationPrompt =
      input.mode === 'reflection'
        ? keepText(() => nativeDecisionPrompt(service.world, context, [], false))
        : undefined;
    const invention =
      input.mode === 'reflection' ? undefined : await prepareNativeActorInvention(service, actorId);
    let instructions = invention
      ? keepText(() =>
          joinNativeDecisionText(service.world, RESPONSE_INSTRUCTIONS, ' ', invention.instructions),
        )
      : RESPONSE_INSTRUCTIONS;
    let appraisal = hasAppraisals
      ? await input.prepareAppraisals({
          original,
          current: now,
          scope,
          evidenceIds: [
            ...new Set([
              ...refreshed.flatMap((candidate) => candidate.sourceIds ?? []),
              ...retainedConversation.evidenceIds,
            ]),
          ],
          subjects: references.entityReferences,
          sharedExperiences,
          frame: situation.frame,
          currentTicket,
        })
      : undefined;
    const appraisalCurrent = appraisal?.current;
    const interpretationRecords =
      input.mode === 'reflection'
        ? await offerNativeInterpretationRecords({
            service,
            original,
            current: now,
            context,
            references,
            sharedExperiences,
            evidenceIds: new Set(
              selectedProofs.filter((source) => !source.receipt).map((source) => source.id),
            ),
          })
        : undefined;
    const reflection = interpretationRecords
      ? { ...interpretationRecords, identityHandles: Object.keys(references.identityReferences) }
      : undefined;
    if (input.mode === 'reflection' && appraisal) context['feelings'] = appraisal.context;
    let additionalContext = invention
      ? keepText(() =>
          joinNativeDecisionText(
            service.world,
            '\n',
            invention.context,
            appraisal ? '\nPermitted feeling proposals: ' : '',
            appraisal
              ? keepText(() => nativeDecisionJsonText(service.world, appraisal!.context))
              : '',
          ),
        )
      : '';
    const renderBytes = () =>
      reflectionPreparationPrompt !== undefined
        ? Buffer.byteLength(reflectionPreparationPrompt)
        : nativeDecisionPromptSize(
            service.world,
            context,
            offered,
            includeActions,
            additionalContext,
          );
    const render = () =>
      reflectionPreparationPrompt ??
      keepText(() =>
        nativeDecisionPrompt(service.world, context, offered, includeActions, additionalContext),
      );
    // Required evidence keeps its allowance. Only optional assistance loses a
    // whole suffix when the complete generation envelope needs more room.
    if (renderBytes() + Buffer.byteLength(instructions) > CONTEXT_BYTE_LIMIT) {
      const all = offered;
      let low = 0,
        high = all.length;
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        offered = all.slice(0, middle);
        if (renderBytes() + Buffer.byteLength(instructions) <= CONTEXT_BYTE_LIMIT) low = middle;
        else high = middle - 1;
      }
      offered = all.slice(0, low);
    }
    let prompt = render();
    const inputBytes = Buffer.byteLength(prompt) + Buffer.byteLength(instructions);
    if (inputBytes > CONTEXT_BYTE_LIMIT)
      throw new ContextBudgetError(
        'Complete accepted inner world and required context exceed the input budget.',
      );
    await conversationCheck(false, selectedProofs);
    const binding = nativeResponseSelection({
      original,
      current: now,
      validity: input.validity,
      purpose: input.mode === 'reflection' ? 'reflection' : 'decision',
      consumer: input.consumer,
      references,
      knowledge,
      situation,
      sources: selectedProofs,
      conversationEvidence: validity.boundSources,
      actions: offered,
      actionSource,
      prototypeSource: actionSource,
      perspectives: selectedPerspectives(),
      semanticCauses: input.semanticCauses,
      intents: intentActions,
      appraisals: appraisal?.selection ?? null,
    });
    ticket = await service.publishRecall(() =>
      original.bindResponse(
        service.world,
        now,
        jobId,
        binding,
        signal,
        input.semanticTrigger,
        actionCapture,
      ),
    );
    const schemaFor = (queries: boolean) => {
      const requests = service.definitions.requestDescriptors();
      const situationAliases =
        decisionRecordEntries(situation.attentionReferences) +
        decisionRecordEntries(situation.retentionReferences) +
        decisionRecordEntries(situation.observationReferences) +
        decisionRecordEntries(situation.currentReferences);
      const aliases =
        3 * decisionRecordEntries(references.entityReferences) +
        2 * decisionRecordEntries(references.identityReferences) +
        decisionRecordEntries(references.physicalEntityReferences) +
        decisionRecordEntries(knowledge) +
        offered.length +
        intentActions.length +
        fields.namedTimes.length +
        fields.capabilities.expressionVerbs.length +
        situationAliases;
      let requestBytes = decisionArrayBytes(requests.length);
      for (const request of requests) {
        const fields = decisionRecordEntries(request.fields);
        // Each installed field has one typed constructor and at most five
        // check/clone stages. The request object and union borrow their IDs.
        requestBytes += decisionObjectBytes(8 + fields) + fields * decisionObjectBytes(24);
      }
      const build = () =>
        boundResponseSchema(
          Object.keys(references.entityReferences),
          [...offered.map((offer) => offer.id), ...intentActions.map((offer) => offer.id)],
          reconsidering
            ? reconsiderationResponseCapabilities(fields.capabilities)
            : fields.capabilities,
          Object.keys(knowledge),
          fields.namedTimes,
          requests,
          appraisal?.schema,
          Object.keys(references.identityReferences),
          Object.keys(references.physicalEntityReferences),
          situationResponseCapabilities(situation),
        );
      // Fixed operation objects, extensions and their shared 11-field
      // variants, plus the actual enum vectors/maps and installed requests.
      const variants =
        6 +
        Number(fields.capabilities.speech) +
        Number(!!appraisal?.schema) +
        Number(decisionRecordEntries(situation.attentionReferences) > 0) +
        Number(situationAliases > decisionRecordEntries(situation.attentionReferences));
      return format(() =>
        admitDecisionGraph(
          service.world,
          decisionObjectBytes(8) * (96 + (queries ? 5 : 0)) +
            variants * decisionObjectBytes(15) +
            aliases * decisionObjectBytes(1) +
            requestBytes,
          () => {
            const schema = build();
            return queries ? withSituationQueries(schema, situation.policy.maximumQueries) : schema;
          },
        ),
      );
    };
    let schema: ReturnType<typeof schemaFor> | undefined = schemaFor(true);
    const replaceSchema = (queries: boolean) => {
      const next = schemaFor(queries);
      if (schema) releaseNativeProduct(schema);
      schema = next;
    };
    let queryUsed = false;
    let queryDisclosure:
      | Awaited<ReturnType<typeof expandNativeDecisionSituation>>['disclosed']
      | undefined;
    // Source retains the initial preparation for a higher request. A query
    // mutates the shared received situation, but its added prompt/context and
    // the direct route's refreshed action catalogue are request-local.
    let retainedContext = context;
    let retainedOffers = offersAtStart;

    const prepared = retainNativeSources(
      {
        routingFailure,
        get context() {
          requireContext();
          return context;
        },
        get selectedSections() {
          requireContext();
          return selectedSections;
        },
        get prompt() {
          requireContext();
          return prompt;
        },
        get routePrompt() {
          requireContext();
          if (routePrompt === undefined)
            throw new Error('Reflection has no immediate decision routing request.');
          return routePrompt;
        },
        get offered() {
          requireContext();
          return offered.map(({ id, description }) => ({ id, description }));
        },
        get offerCount() {
          requireContext();
          return offered.length;
        },
        get noInterventionChoices() {
          requireContext();
          return new Set(
            offered
              .filter((offer) =>
                actionSource === 'current' && actionCapture
                  ? actionCapture.noIntervention(offer.ordinal)
                  : (actionSource === 'original' ? original : now).candidates().offers[
                      offer.ordinal
                    ]?.command === null,
              )
              .map((offer) => offer.id),
          );
        },
        workTransition(id: string) {
          requireContext();
          return (
            offered.find((offer) => offer.id === id)?.transition ??
            (intentActions.some((intent) => intent.id === id) ? ('continue' as const) : undefined)
          );
        },
        get activityRequests() {
          requireContext();
          // The projection above changes reference spellings, preserving this
          // actual captured activity request shape (as in Source preparation).
          return context['activityRequests'] as ReturnType<
            typeof decisionActivityFactsFromRead
          >['activityRequests'];
        },
        simTime: now.facts.self.at,
        namedTimes: fields.namedTimes,
        namedDeadlines: fields.namedTimes.map((name) => ({
          name,
          at: clockDeadline(
            {
              simTime: now.facts.self.at,
              statusEffectPolicy: service.definitions.facts.definitions.statusEffectPolicy,
            },
            name,
          )!,
        })),
        addressedSpeech,
        speechTrigger,
        sourcesCurrent,
        get routing() {
          requireContext();
          return routing;
        },
        retireRouting,
        get schema() {
          requireContext();
          if (!schema) throw new Error('The native decision response schema was consumed.');
          return schema;
        },
        previewSpeech(value: unknown) {
          requireContext();
          if (!schema) throw new Error('The native decision response schema was consumed.');
          const operation = previewSpeechOperation(schema.shape.operations.element, value);
          if (!operation?.talk) return null;
          const addressee = operation.talk.addresseeEntityId;
          const canonical = addressee ? references.entityReferences[addressee] : undefined;
          if (!canonical) return null;
          const { appraise: _appraise, ...speech } = operation;
          return { ...speech, talk: { ...operation.talk, addresseeEntityId: canonical } };
        },
        requestSchema() {
          requireContext();
          if (!schema) throw new Error('The native decision response schema was consumed.');
          return projectDecisionSchema(service.world, schema);
        },
        get ticket() {
          if (!ticket)
            throw new Error('The native response ticket is being prepared or was released.');
          return ticket;
        },
        get queryUsed() {
          requireContext();
          return queryUsed;
        },
        get queryDisclosure() {
          requireContext();
          return queryDisclosure;
        },
        get appraisalContext() {
          requireContext();
          return appraisal?.context;
        },
        get instructions() {
          requireContext();
          return instructions;
        },
        situation,
        get sharedExperiences() {
          requireContext();
          return sharedExperiences;
        },
        ...(reflection ? { reflection } : {}),
        validity: nativeDecisionValidity(now, service.definitions),
        preparedValidity: nativePreparedResponseValidity(now),
        awarenessSequence: retainedConversation.awarenessSequence,
        async current() {
          if (!ticket && !reflectionTicket) return false;
          return owner.run(() =>
            withNativeConsumerScope(async () => {
              await conversationCheck(false, selectedProofs);
              return (!appraisalCurrent || (await appraisalCurrent())) && (await currentTicket());
            }),
          );
        },
        async publish<T>(start: () => T): Promise<{ result: T }> {
          return owner.run(async () => {
            await conversationCheck(false, selectedProofs);
            return service.publishRecall(async () => {
              if (!ticket && !reflectionTicket)
                throw new Error('Native decision has no issued response ticket.');
              const publication = reflectionTicket
                ? await service.world.reflectionPublication(reflectionTicket)
                : await service.world.npcResponsePublication(ticket!);
              try {
                requireContext();
                assertCurrent();
                if (!publication?.isCurrent())
                  throw new Error('The native response became stale before dispatch.');
                const result = withoutNativeConsumerScope(start);
                // Actual local provider consumption, rather than cancellation
                // time, closes the leases on both originating owners.
                void owner
                  .run(() =>
                    formattingOwner.run(async () => {
                      await result;
                      void textProducts.length;
                    }),
                  )
                  .catch(() => undefined);
                return { result };
              } finally {
                publication?.release();
              }
            });
          });
        },
        async expandQueries(queries: readonly SituationQuery[]) {
          return owner.run(async () => {
            requireContext();
            if (queryUsed || !ticket || !queries.length)
              throw new Error('The situation query continuation is unavailable.');
            await conversationCheck(false, selectedProofs);
            if ((appraisalCurrent && !(await appraisalCurrent())) || !(await currentTicket()))
              throw new Error('The native decision became stale before its situation query.');
            queryUsed = true;
            const expansion = await expandNativeDecisionSituation({
              service,
              original,
              current: now,
              ticket,
              jobId: decisionId,
              scope,
              situation,
              queries,
              references,
              knowledge,
              sources: selectedProofs,
              conversationEvidence: validity.boundSources,
              offered,
              includeActions,
              actionSource,
              prototypeSource: actionSource,
              perspectives: selectedPerspectives(),
              semanticCauses: input.semanticCauses,
              ...(input.semanticTrigger ? { semanticTrigger: input.semanticTrigger } : {}),
              intents: intentActions,
              appraisals: appraisal?.selection ?? null,
              validity: input.validity,
              purpose: input.mode === 'reflection' ? 'reflection' : 'decision',
              consumer: input.consumer,
              context,
              additionalContext,
              instructions,
              signal,
              format,
              check: () => conversationCheck(false, selectedProofs),
              reopened: () => {
                ticket = undefined;
              },
            });
            ticket = expansion.ticket;
            textProducts.push(...expansion.textProducts);
            prompt = expansion.prompt;
            context = expansion.context;
            offered = expansion.offered;
            queryDisclosure = expansion.disclosed;
            replaceSchema(false);
            return expansion.disclosed;
          });
        },
        async rebindDecision(childId: string): Promise<void> {
          return owner.run(async () => {
            requireContext();
            if (!ticket) throw new Error('Native decision has no issued response ticket.');
            await conversationCheck(false, selectedProofs);
            if (!(await currentTicket()))
              throw new Error('The retained native decision became stale.');
            const nextOffers = format(() =>
              admitDecisionGraph(
                service.world,
                3 * decisionArrayBytes(retainedOffers.length) +
                  retainedOffers.length * (decisionObjectBytes(7) + decisionTextBytes(20)),
                () =>
                  fitActionCandidates(
                    retainedContext,
                    [...retainedOffers],
                    0,
                    'optional',
                    promptBytes,
                  ).map((offer, index) => ({ ...offer, id: `a${index}` })),
              ),
            );
            const nextPrompt = keepText(() =>
              nativeDecisionPrompt(
                service.world,
                retainedContext,
                nextOffers,
                true,
                additionalContext,
              ),
            );
            if (
              Buffer.byteLength(nextPrompt) + Buffer.byteLength(instructions) >
              CONTEXT_BYTE_LIMIT
            )
              throw new ContextBudgetError(
                'Complete accepted inner world and required context exceed the input budget.',
              );
            await withNativeJsonInput(
              service.world,
              {
                decisionId: childId,
                actions: nextOffers.map(({ id: alias, ordinal }) => ({
                  alias,
                  ordinal,
                  source: 'original',
                })),
                prototypeSource: 'original',
              },
              (bytes) => service.world.rebindNpcResponse(ticket!, bytes),
            );
            decisionId = childId;
            reconsidering = true;
            includeActions = true;
            actionSource = 'original';
            context = retainedContext;
            offered = nextOffers;
            prompt = nextPrompt;
            queryUsed = false;
            if (queryDisclosure) releaseNativeProduct(queryDisclosure);
            queryDisclosure = undefined;
            replaceSchema(true);
          });
        },
        adoptReflectionTicket(owner: NativeWorldReflectionTicket): void {
          if (input.mode !== 'reflection' || !ticket || reflectionTicket)
            throw new Error('Reflection requires its originating prepared native request.');
          // bindReflection consumed the actual NPC ticket into this stronger
          // owner. Its source-only guards keep the same SQL/history validation
          // without imposing a decision self-signature on reflection.
          reflectionTicket = owner;
          ticket = undefined;
        },
        retireContext(): void {
          requireContext();
          retireRouting();
          contextRetired = true;
          // Native admission owns its bound reads and source metadata. The
          // decoded response has consumed the final request presentation.
          for (const key in context) if (Object.hasOwn(context, key)) delete context[key];
          for (const key in retainedContext)
            if (Object.hasOwn(retainedContext, key)) delete retainedContext[key];
          context = {};
          retainedContext = {};
          prompt = '';
          routePrompt = undefined;
          instructions = '';
          additionalContext = '';
          schema = undefined;
          offered = [];
          retainedOffers = [];
          sharedExperiences.clear();
          appraisal = undefined;
          selectedSections.length = 0;
          textProducts.length = 0;
          queryDisclosure = undefined;
          actionCapture?.release();
          actionCapture = undefined;
          formattingOwner.dispose();
        },
        dispose() {
          // This private preparation envelope borrows the intake handle only
          // through binding/query reuse. Other intake owners remain independent.
          input.semanticTrigger = undefined;
          retireRouting();
          ticket?.release();
          reflectionTicket?.release();
          ticket = undefined;
          reflectionTicket = undefined;
          fence.release();
          original.release();
          now.release();
          actionCapture?.release();
          bodies.dispose();
          formattingOwner.dispose();
          owner.dispose();
        },
        diagnostics: {
          instructionsVersion: COGNITION_VERSION,
          snapshot: now.facts.self.sequence,
          sourceTime: now.facts.self.at,
          inputBytes,
          estimatedInputTokens: Math.ceil(inputBytes / 3),
          selection: selection.diagnostics,
          conversation: retainedConversation.diagnostics,
          sections: Object.fromEntries(
            Object.entries(context).map(([key, value]) => [
              key,
              nativeDecisionJsonSize(service.world, value),
            ]),
          ),
        },
      },
      original.facts,
      now.facts,
      service.definitions.facts,
      original.sources(),
      now.sources(),
    );
    // Initial SQL hydration has finished. Returned readings own independent
    // pins, and query continuation uses its bound native read owners.
    bodies.dispose();
    completed = true;
    return prepared;
  } finally {
    conversationOwner.dispose();
    if (!completed) {
      routingOwner.dispose();
      formattingOwner.dispose();
      ticket?.release();
      reflectionTicket?.release();
      fence.release();
      conversationCurrent?.release();
      current?.release();
      original.release();
      actionCapture?.release();
      bodies.dispose();
    }
  }
}
