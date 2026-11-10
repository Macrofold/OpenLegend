import {
  experienceSourceKey,
  resultEvidenceId,
  resultEvidenceMatchesReceipt,
  clockDeadline,
  type AppraisalScope,
  type TemporalHistorySelection,
} from '@open-legend/domain';
import type { JudgeRequest, JudgeValue } from '@open-legend/ai';
import type {
  NativeWorldNpcResponseTicket,
  NativeWorldNpcTrigger,
  NativeWorldReflectionTicket,
} from '@open-legend/native-simulation';
import type { NativeWorldService } from './native-world-service.js';
import type { NativeNpcCapture } from './native-npc-capture.js';
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
import { readableDecisionContext } from './response-context.js';
import {
  COGNITION_VERSION,
  RESPONSE_INSTRUCTIONS,
  boundResponseSchema,
} from './cognition-contracts.js';
import { attentionRequest } from './attention-request.js';
import { attentionIncludes, ACTION_EVIDENCE_POLICY } from './jev-questions.js';
import { ACTION_RETRIEVAL_LIMIT } from './action-retrieval.js';
import { noteReference } from './knowledge-context.js';
import { retainNativeSources } from './native-consumer.js';
import type { NativeFormattedNpcOffer } from './native-npc-candidates.js';
import type { NativeNpcBindingSelection } from './native-npc-sources.js';
import { nativeNpcPersonalSelection } from './native-npc-sources.js';
import type { z } from 'zod';
import type { DecisionAppraisalProposal } from './cognition-contracts.js';

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

/** Complete ordinary decision preparation from native read owners and actual
 * indexed personal storage. The director supplies paid dispatch/accounting and
 * the appraisal owner; neither callback may supply world facts or permissions. */
export async function prepareNativeDecision(input: {
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
}) {
  const { service, actorId, jobId, signal } = input;
  let decisionId = jobId;
  const generation = service.generation;
  const repository = service.store.memories;
  if (!repository) throw new Error('Native decisions require indexed personal storage.');
  const start = await service.captureNpc(actorId, input.requiredAppraisals, {
    signal,
    consumer: input.consumer,
  });
  const original = start.capture;
  let current: NativeNpcCapture | undefined;
  let conversationCurrent: NativeNpcCapture | undefined;
  let ticket: NativeWorldNpcResponseTicket | undefined;
  let reflectionTicket: NativeWorldReflectionTicket | undefined;
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
      return start();
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
    const saved = includeConversation
      ? await service.store.getIntegration(conversationCompactionKey(scope.worldId, actorId))
      : undefined;
    const baseContext: Record<string, unknown> = {
      situationQueries: input.mode !== 'native-only',
      receivedSituation: situation.packet,
      ...(recentWorkResults ? { recentWorkResults } : {}),
      ...nativeDecisionFields(original, service.definitions, 'initial'),
      ...decisionActivityFactsFromRead({
        simTime: original.facts.self.at,
        requests: service.definitions.requestDescriptors(),
        ...original.candidates().activity,
      }),
      stimulus,
      triggerFacts: initialTrigger?.facts ?? null,
      intentActions: [],
      planOffers: [],
      references: nativeResponseReferences(
        original,
        original,
        evidence,
        evidenceIds,
        original.facts.referenceFacts.social.flatMap((fact) => fact.canonicalId ?? []),
      ).references,
      commitments: [],
      conversation: [],
      surroundings: [],
      possessions: [],
    };
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
      await service.captureNpc(actorId, input.requiredAppraisals, {
        signal,
        consumer: input.consumer,
      })
    ).capture;
    // The labels and their identity cut share one accepted service turn, like
    // Source's synchronous conversation projection after its SQL admission.
    const { presentation, conversationPerspectives } = await service.publishRecall(async () => {
      const presentation = await conversationCurrent!.prepareExperiencePresentation(
        service.world,
        service.definitions,
        speech.personal.map((source) => source.value),
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
            Buffer.byteLength(candidate.text.replace(/\n/g, '\n  ')) +
            Buffer.byteLength(JSON.stringify(candidate.experience ?? [])) +
            Buffer.byteLength(candidate.id) +
            8,
          0,
        );
    const bytes = (
      context: Record<string, unknown>,
      actions: { id: string; description: string }[] = [],
    ) =>
      Buffer.byteLength(readableDecisionContext(context, actions, actions.length > 0)) +
      Buffer.byteLength(RESPONSE_INSTRUCTIONS);
    let requiredBytes = bytes(baseContext);
    if (requiredBytes + requiredRecallBytes() > CONTEXT_BYTE_LIMIT)
      throw new ContextBudgetError(
        'Complete accepted inner world and required context exceed the input budget.',
      );
    const conversationCheck = async (
      _flush = true,
      additionalSources: CurrentMemorySource[] = [],
    ) => {
      original.guardPerspectives(selectedPerspectives());
      await historyCurrent();
      const valid = await sql(() =>
        repository.validatePreparation(
          scope,
          { sequence: 0, sources: validity.boundSources },
          additionalSources,
        ),
      );
      const coverage =
        !validity.usedCache ||
        (await sql(() =>
          repository.currentCompactionSources(scope, validity.usedCache!.value.sources),
        ));
      if (!valid || !coverage) throw new Error('Selected speech or recall sources changed.');
      await historyCurrent();
    };
    const conversation = await buildNativeConversationContext({
      original,
      current: conversationCurrent,
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
    });
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
    const intentActions = now.facts.self.agency.attempts.map((attempt, ordinal) => ({
      id: `w${ordinal}`,
      ordinal,
      description: `Decline/withdraw pending intent: ${attempt.description}`,
    }));
    const trigger =
      triggerSource &&
      nativeTriggerContext(
        triggerSource,
        now,
        original,
        service.definitions,
        situation.presentation,
      );
    let context: Record<string, unknown> = {
      ...baseContext,
      ...fields,
      ...decisionActivityFactsFromRead({
        simTime: now.facts.self.at,
        requests: service.definitions.requestDescriptors(),
        ...now.candidates().activity,
      }),
      triggerFacts: trigger?.facts ?? null,
      intentActions: intentActions.map(({ id, description }) => ({ id, description })),
      references: references.references,
      agency: {
        ...fields.agency,
        outcomeCoverage: missing
          ? `${missing} recent work records are unavailable under current memory permissions/retention. Base decisions only on available memories and current evidence; do not reconstruct their effects from execution status.`
          : 'Recent work results are included through the same personal memories as other experiences.',
      },
      knowledgeCoverage:
        'knowledgeRetrieval' in selection.diagnostics
          ? selection.diagnostics.knowledgeRetrieval
          : { partial: true },
      ...contextSections(
        refreshed.filter(
          (candidate) => candidate.kind !== 'conversation' && candidate.kind !== 'entity',
        ),
      ),
    };
    context['experience'] = [
      ...((context['experience'] as SharedModelExperience['experience'][]) ?? []),
      ...conversation.experience,
    ];
    const knowledge = Object.fromEntries(
      refreshed
        .filter((candidate) => candidate.kind === 'knowledge')
        .flatMap((candidate) => {
          const doc = now.facts.self.knowledge?.[candidate.id.slice('notepad:'.length)];
          return doc?.subjectId &&
            (doc.subjectId.kind === 'entity' || doc.subjectId.kind === 'individual')
            ? [[noteReference(actorId, doc.subjectId), doc.subjectId]]
            : [];
        }),
    );
    const sharedExperiences = new Map<string, SharedModelExperience>();
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
    for (const key of Object.keys(context)) {
      const value = context[key];
      if (typeof value === 'string') context[key] = nativeProjectEntityMarkers(value, now);
      else if (value != null)
        context[key] = JSON.parse(
          nativeProjectEntityMarkers(JSON.stringify(value), now),
          (field, entry) =>
            typeof entry === 'string' &&
            /^(entityId|actorId|targetId|sourceId|targetEntityId|addresseeEntityId)$/.test(field)
              ? (Object.entries(references.entityReferences).find(([, id]) => id === entry)?.[0] ??
                entry)
              : entry,
        );
    }
    const allOffers = fitActionCandidates(context, [
      ...now.choiceDescriptions(service.definitions),
    ]);
    let actionSource: 'original' | 'current' = 'current';
    let offered: NativeFormattedNpcOffer[];
    if (input.mode === 'reflection') offered = [];
    else if (input.mode === 'native-only')
      offered = allOffers.map((offer, index) => ({ ...offer, id: `a${index}` }));
    else {
      const guidance = service.definitions.facts.definitions.cognitionPolicy.actionGuidance;
      const options = allOffers.map((offer, index) => ({ ...offer, id: `a${index}` }));
      const request = attentionRequest(
        {
          decisionContext: Object.fromEntries(
            Object.entries(context).filter(
              ([key]) => !['knowledgeInstructions', 'navigation', 'planOffers'].includes(key),
            ),
          ),
          attentionPolicy: `${guidance.reasons} ${ACTION_EVIDENCE_POLICY} Include uncertain but plausible options without choosing a final action. Listing is not endorsement; no action and unlisted attempts remain valid.`,
        },
        options.map((offer) => [offer.id, offer.description]),
        'actions',
        guidance,
      );
      try {
        await conversationCheck(false, selectedProofs);
        const judged = Object.keys(request.questions).length
          ? await judge(request)
          : { answers: {} };
        offered = options.filter((offer) => attentionIncludes(judged.answers[offer.id]));
      } catch (error) {
        signal.throwIfAborted();
        await conversationCheck(false, selectedProofs);
        offered = options;
      }
    }
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
    const hasAppraisals =
      input.mode === 'reflection' ||
      service.definitions.facts.definitions.moduleManifest.appraisals?.definitions.some(
        (definition) => definition.decision,
      );
    // Reflection adds its workspace/appraisal presentation after the ordinary
    // Source preparation allowance. Its actual JSON request has its own full
    // budget check in the shared maintenance owner.
    const reflectionPreparationPrompt =
      input.mode === 'reflection' ? readableDecisionContext(context, [], false) : undefined;
    const invention =
      input.mode === 'reflection' ? undefined : await prepareNativeActorInvention(service, actorId);
    const instructions = invention
      ? `${RESPONSE_INSTRUCTIONS} ${invention.instructions}`
      : RESPONSE_INSTRUCTIONS;
    const appraisal = hasAppraisals
      ? await input.prepareAppraisals({
          original,
          current: now,
          scope,
          evidenceIds: [
            ...new Set([
              ...refreshed.flatMap((candidate) => candidate.sourceIds ?? []),
              ...conversation.evidenceIds,
            ]),
          ],
          subjects: references.entityReferences,
          sharedExperiences,
          frame: situation.frame,
          currentTicket,
        })
      : undefined;
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
    const additionalContext = invention
      ? `\n${invention.context}${appraisal ? '\nPermitted feeling proposals: ' + JSON.stringify(appraisal.context) : ''}`
      : '';
    const render = () =>
      reflectionPreparationPrompt ??
      readableDecisionContext(context, offered, true) + additionalContext;
    // Required evidence keeps its allowance. Only optional assistance loses a
    // whole suffix when the complete generation envelope needs more room.
    if (Buffer.byteLength(render()) + Buffer.byteLength(instructions) > CONTEXT_BYTE_LIMIT) {
      const all = offered;
      let low = 0,
        high = all.length;
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        offered = all.slice(0, middle);
        if (Buffer.byteLength(render()) + Buffer.byteLength(instructions) <= CONTEXT_BYTE_LIMIT)
          low = middle;
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
      actions: offered,
      actionSource,
      prototypeSource: actionSource,
      perspectives: selectedPerspectives(),
      semanticCauses: input.semanticCauses,
      intents: intentActions,
      appraisals: appraisal?.selection ?? null,
    });
    ticket = await original.bindResponse(
      service.world,
      now,
      jobId,
      binding,
      signal,
      input.semanticTrigger,
    );
    const schemaFor = () =>
      boundResponseSchema(
        Object.keys(references.entityReferences),
        [...offered.map((offer) => offer.id), ...intentActions.map((offer) => offer.id)],
        { ...fields.capabilities, proposals: false },
        Object.keys(knowledge),
        fields.namedTimes,
        service.definitions.requestDescriptors(),
        appraisal?.schema,
        Object.keys(references.identityReferences),
        Object.keys(references.physicalEntityReferences),
        situationResponseCapabilities(situation),
      );
    let schema:
      | ReturnType<typeof schemaFor>
      | ReturnType<typeof withSituationQueries<ReturnType<typeof schemaFor>['shape']>> =
      withSituationQueries(schemaFor(), situation.policy.maximumQueries);
    let queryUsed = false;
    // Source retains the initial preparation for a higher request. A query
    // mutates the shared received situation, but its added prompt/context and
    // the direct route's refreshed action catalogue are request-local.
    const retainedContext = context;
    const retainedOffers = offersAtStart;

    const prepared = retainNativeSources(
      {
        get context() {
          return context;
        },
        get prompt() {
          return prompt;
        },
        get offered() {
          return offered.map(({ id, description }) => ({ id, description }));
        },
        get noInterventionChoices() {
          return new Set(
            offered
              .filter(
                (offer) =>
                  (actionSource === 'original' ? original : now).candidates().offers[offer.ordinal]
                    ?.command === null,
              )
              .map((offer) => offer.id),
          );
        },
        workTransition(id: string) {
          return (
            offered.find((offer) => offer.id === id)?.transition ??
            (intentActions.some((intent) => intent.id === id) ? ('continue' as const) : undefined)
          );
        },
        get activityRequests() {
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
        get schema() {
          return schema;
        },
        get ticket() {
          if (!ticket)
            throw new Error('The native response ticket is being prepared or was released.');
          return ticket;
        },
        get queryUsed() {
          return queryUsed;
        },
        instructions,
        situation,
        sharedExperiences,
        ...(reflection ? { reflection } : {}),
        validity: nativeDecisionValidity(now, service.definitions),
        preparedValidity: nativePreparedResponseValidity(now),
        awarenessSequence: conversation.awarenessSequence,
        async current() {
          if (!ticket && !reflectionTicket) return false;
          await conversationCheck(false, selectedProofs);
          return (!appraisal || (await appraisal.current())) && (await currentTicket());
        },
        async publish<T>(start: () => T): Promise<{ result: T }> {
          await conversationCheck(false, selectedProofs);
          return service.publishRecall(async () => {
            if (!ticket && !reflectionTicket)
              throw new Error('Native decision has no issued response ticket.');
            const publication = reflectionTicket
              ? await service.world.reflectionPublication(reflectionTicket)
              : await service.world.npcResponsePublication(ticket!);
            try {
              assertCurrent();
              if (!publication?.isCurrent())
                throw new Error('The native response became stale before dispatch.');
              return { result: start() };
            } finally {
              publication?.release();
            }
          });
        },
        async expandQueries(queries: readonly SituationQuery[]) {
          if (queryUsed || !ticket || !queries.length)
            throw new Error('The situation query continuation is unavailable.');
          await conversationCheck(false, selectedProofs);
          if ((appraisal && !(await appraisal.current())) || !(await currentTicket()))
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
            offered,
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
            check: () => conversationCheck(false, selectedProofs),
            reopened: () => {
              ticket = undefined;
            },
          });
          ticket = expansion.ticket;
          prompt = expansion.prompt;
          context = expansion.context;
          offered = expansion.offered;
          schema = schemaFor();
          return expansion.disclosed;
        },
        async rebindDecision(childId: string): Promise<void> {
          if (!ticket) throw new Error('Native decision has no issued response ticket.');
          await conversationCheck(false, selectedProofs);
          if (!(await currentTicket()))
            throw new Error('The retained native decision became stale.');
          const nextOffers = fitActionCandidates(retainedContext, [...retainedOffers]).map(
            (offer, index) => ({ ...offer, id: `a${index}` }),
          );
          const nextPrompt =
            readableDecisionContext(retainedContext, nextOffers, true) + additionalContext;
          if (Buffer.byteLength(nextPrompt) + Buffer.byteLength(instructions) > CONTEXT_BYTE_LIMIT)
            throw new ContextBudgetError(
              'Complete accepted inner world and required context exceed the input budget.',
            );
          await service.world.rebindNpcResponse(
            ticket,
            Buffer.from(
              JSON.stringify({
                decisionId: childId,
                actions: nextOffers.map(({ id: alias, ordinal }) => ({
                  alias,
                  ordinal,
                  source: 'original',
                })),
                prototypeSource: 'original',
              }),
            ),
          );
          decisionId = childId;
          actionSource = 'original';
          context = retainedContext;
          offered = nextOffers;
          prompt = nextPrompt;
          queryUsed = false;
          schema = withSituationQueries(schemaFor(), situation.policy.maximumQueries);
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
        dispose() {
          ticket?.release();
          reflectionTicket?.release();
          ticket = undefined;
          reflectionTicket = undefined;
          fence.release();
          original.release();
          now.release();
        },
        diagnostics: {
          instructionsVersion: COGNITION_VERSION,
          snapshot: now.facts.self.sequence,
          sourceTime: now.facts.self.at,
          inputBytes,
          estimatedInputTokens: Math.ceil(inputBytes / 3),
          selection: selection.diagnostics,
          conversation: conversation.diagnostics,
          sections: Object.fromEntries(
            Object.entries(context).map(([key, value]) => [
              key,
              Buffer.byteLength(JSON.stringify(value)),
            ]),
          ),
        },
      },
      original.facts,
      now.facts,
      service.definitions.facts,
    );
    completed = true;
    return prepared;
  } finally {
    if (!completed) {
      ticket?.release();
      reflectionTicket?.release();
      fence.release();
      conversationCurrent?.release();
      current?.release();
      original.release();
    }
  }
}
