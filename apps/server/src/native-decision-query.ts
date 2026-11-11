import type {
  NativeWorldConsumer,
  NativeWorldNpcResponseTicket,
  NativeWorldNpcTrigger,
} from '@open-legend/native-simulation';
import type { ObserverSubject } from '@open-legend/domain';
import type { NativeWorldService } from './native-world-service.js';
import { NativeNpcCapture } from './native-npc-capture.js';
import type { NativeNpcBindingSelection } from './native-npc-sources.js';
import type { NativeFormattedNpcOffer } from './native-npc-candidates.js';
import type { ConversationSource, CurrentMemorySource, MemoryScope } from './memory-repository.js';
import type { nativeResponseReferences } from './native-response-context.js';
import { nativeResponseSelection } from './native-response-bindings.js';
import { nativeReceiptLocator, nativeTemporalHistoryContext } from './native-temporal-context.js';
import {
  expandSituation,
  type CapturedSituation,
  type SituationQuery,
} from './situation-context.js';
import {
  nativeDecisionPrompt,
  nativeDecisionPromptSize,
  nativeDecisionJsonText,
  nativeDecisionJsonSize,
  joinNativeDecisionText,
} from './native-decision-prompt.js';
import { CONTEXT_BYTE_LIMIT, ContextBudgetError } from './context.js';
import { attachNativeConsumer } from './native-consumer.js';
import {
  admitDecisionGraph,
  decisionArrayBytes,
  decisionJsonGraphBytes,
  decisionObjectBytes,
  decisionRecordEntries,
} from './native-decision-allocation.js';

/** Select the exact represented members, including genuine fieldless receipts.
 * A full physical receipt would grant more than the supplied context contains. */
export async function admitNativeSituationHistory(
  service: NativeWorldService,
  original: NativeNpcCapture,
  situation: CapturedSituation,
  signal: AbortSignal,
): Promise<void> {
  const history = await service.prepareNpcSources(
    original,
    {
      personal: [],
      receipts: Object.values(situation.receiptDetails).map(({ receipt }) => ({
        locator: nativeReceiptLocator(receipt),
        memberIndices: receipt.facets.map((facet) => facet.memberIndex),
      })),
    },
    signal,
  );
  if (history.unavailableReceipts.length)
    throw new Error('Selected native decision chronology became unavailable.');
}

/** One genuine read-only continuation, before any response application. It
 * reuses the old situation, body leases, receiver frame and receipt prefix. */
export async function expandNativeDecisionSituation(input: {
  service: NativeWorldService;
  original: NativeNpcCapture;
  current: NativeNpcCapture;
  ticket: NativeWorldNpcResponseTicket;
  jobId: string;
  scope: MemoryScope;
  situation: CapturedSituation;
  queries: readonly SituationQuery[];
  references: ReturnType<typeof nativeResponseReferences>;
  knowledge: Readonly<Record<string, ObserverSubject>>;
  sources: readonly CurrentMemorySource[];
  conversationEvidence: readonly Pick<ConversationSource, 'id' | 'revision'>[];
  offered: readonly NativeFormattedNpcOffer[];
  actionSource: 'original' | 'current';
  prototypeSource: 'original' | 'current';
  perspectives: NativeNpcBindingSelection['perspectives'];
  semanticCauses: readonly number[];
  semanticTrigger?: NativeWorldNpcTrigger;
  intents: readonly { id: string; ordinal: number }[];
  appraisals: NativeNpcBindingSelection['appraisals'];
  validity: NativeNpcBindingSelection['validity'];
  purpose: 'decision' | 'reflection';
  consumer: 'chat' | 'thought' | 'reflection';
  context: Record<string, unknown>;
  additionalContext: string;
  instructions: string;
  signal: AbortSignal;
  format<T>(build: () => T): T;
  check(): Promise<void>;
  reopened(): void;
}) {
  const { service, original, current, situation, scope, signal } = input;
  let subjects = situation.subjectReferences.size;
  for (const { receipt } of situation.history.entries)
    subjects += 1 + (receipt.contextSubjects?.length ?? 0);
  // Query indexing retains two handle spellings per current subject. The
  // expansion visit ceiling counts pre-trim measurements, and the actual
  // received arrays below fund their selected historical/boundary bodies.
  let bytes =
    decisionObjectBytes(2 * subjects) +
    decisionArrayBytes(input.queries.length) +
    decisionArrayBytes(situation.frames.length) +
    decisionObjectBytes(
      decisionRecordEntries(situation.retentionReferences) +
        decisionRecordEntries(situation.observationReferences),
    );
  let possibleVisits = 0;
  let largestVisitedRow = 0;
  for (const query of input.queries) {
    if (query.kind === 'history') continue;
    if (query.kind === 'boundaries') {
      bytes += decisionArrayBytes(situation.geometry.observations.length);
      for (const observation of situation.geometry.observations)
        if (observation.facets.some((facet) => facet.value.kind === 'physical-boundary'))
          bytes += decisionJsonGraphBytes(observation) + decisionObjectBytes(12);
    } else if (query.kind === 'historical-spatial') {
      // A visited measurement can emit a sample, its measurement/support
      // records and matching frame references before the packet is trimmed.
      possibleVisits += situation.policy.queryVisits;
      largestVisitedRow = Math.max(
        largestVisitedRow,
        3 * decisionObjectBytes(12) + decisionArrayBytes(2),
      );
    } else if (query.kind === 'separation') {
      bytes += 2 * (2 * decisionObjectBytes(10) + decisionArrayBytes(2));
    } else {
      possibleVisits += situation.scene.bodies.size;
      largestVisitedRow = Math.max(
        largestVisitedRow,
        2 * decisionObjectBytes(10) + decisionArrayBytes(2),
      );
    }
  }
  // The real expansion decrements one visit counter across the entire batch.
  bytes += Math.min(possibleVisits, situation.policy.queryVisits) * largestVisitedRow;
  bytes += 3 * decisionArrayBytes(input.offered.length);
  const expansionFrames: NativeWorldConsumer[] = [];
  expansionFrames.push(service.world.reserveConsumerBytes(bytes));
  try {
    await NativeNpcCapture.reopenResponse(service.world, input.ticket, original, current);
    input.reopened();
    await input.check();
    const repository = service.store.memories;
    const expansion = await expandSituation(
      situation,
      input.queries,
      async (query) => {
        await input.check();
        const result = await service.withActorMemoryRead(scope.actorId, (cut) =>
          repository.temporalHistory(
            scope,
            query,
            nativeTemporalHistoryContext(original.facts, cut, service.definitions.facts),
          ),
        );
        await input.check();
        let historyBytes = decisionArrayBytes(result.entries.length);
        for (const entry of result.entries)
          historyBytes +=
            decisionJsonGraphBytes(entry) + entry.receipt.facets.length * decisionObjectBytes(8);
        expansionFrames.push(service.world.reserveConsumerBytes(historyBytes));
        const labels = await service.prepareNpcExperiencePresentation(original, [result]);
        return {
          ...result,
          hasMore: result.hasMore ?? false,
          presentation: { ...situation.presentation, subjectLabel: labels.subjectLabel },
        };
      },
      (value) => nativeDecisionJsonSize(service.world, value),
    );
    await input.check();
    const additions =
      decisionArrayBytes(situation.cut.current.length) +
      decisionJsonGraphBytes(expansion.frames.values) +
      decisionObjectBytes(4 * expansion.expandedIds.size);
    attachNativeConsumer(situation, service.world.reserveConsumerBytes(additions));
    const receivedBodies = new Set<string>();
    for (const id of expansion.expandedIds) {
      const body = situation.bodyBindings.get(id);
      if (!body) continue;
      input.references.entityReferences[body.handle] = id;
      input.references.physicalEntityReferences[body.handle] = id;
      input.references.entityLeases[id] = body.leaseId;
      if (body.subject) input.references.identityReferences[body.handle] = body.subject;
      receivedBodies.add(body.handle);
    }
    await admitNativeSituationHistory(service, original, situation, signal);
    const { expandedIds: _expandedIds, ...disclosed } = expansion;
    input.format(() =>
      attachNativeConsumer(
        disclosed,
        service.world.reserveConsumerBytes(decisionJsonGraphBytes(disclosed)),
      ),
    );
    const context = input.format(() =>
      admitDecisionGraph(
        service.world,
        decisionObjectBytes(decisionRecordEntries(input.context)),
        () => ({ ...input.context, situationQueries: false }),
      ),
    );
    const disclosedText = input.format(() => nativeDecisionJsonText(service.world, disclosed));
    const extraText = input.format(() =>
      joinNativeDecisionText(
        service.world,
        input.additionalContext,
        '\nRequested received evidence: ',
        disclosedText.text,
      ),
    );
    const extra = extraText.text;
    let offered = [...input.offered];
    const renderBytes = () =>
      nativeDecisionPromptSize(service.world, context, offered, true, extra);
    if (renderBytes() + Buffer.byteLength(input.instructions) > CONTEXT_BYTE_LIMIT) {
      const all = offered;
      let low = 0,
        high = all.length;
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        offered = all.slice(0, middle);
        if (renderBytes() + Buffer.byteLength(input.instructions) <= CONTEXT_BYTE_LIMIT)
          low = middle;
        else high = middle - 1;
      }
      offered = all.slice(0, low);
    }
    const promptText = input.format(() =>
      nativeDecisionPrompt(service.world, context, offered, true, extra),
    );
    const prompt = promptText.text;
    if (Buffer.byteLength(prompt) + Buffer.byteLength(input.instructions) > CONTEXT_BYTE_LIMIT)
      throw new ContextBudgetError(
        'Complete accepted inner world and required context exceed the input budget.',
      );
    await input.check();
    const selection = nativeResponseSelection({
      original,
      current,
      validity: input.validity,
      purpose: input.purpose,
      consumer: input.consumer,
      references: input.references,
      knowledge: input.knowledge,
      situation,
      sources: input.sources,
      conversationEvidence: input.conversationEvidence,
      actions: offered,
      actionSource: input.actionSource,
      prototypeSource: input.prototypeSource,
      perspectives: input.perspectives,
      semanticCauses: input.semanticCauses,
      intents: input.intents,
      appraisals: input.appraisals,
      receivedBodies,
    });
    const ticket = await service.publishRecall(() =>
      original.bindResponse(
        service.world,
        current,
        input.jobId,
        selection,
        signal,
        input.semanticTrigger,
      ),
    );
    return {
      disclosed,
      ticket,
      prompt,
      context,
      offered,
      textProducts: [disclosedText, extraText, promptText],
    };
  } finally {
    for (const reservation of expansionFrames) reservation.release();
  }
}
