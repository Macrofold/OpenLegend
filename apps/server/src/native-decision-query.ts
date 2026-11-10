import type {
  NativeWorldNpcResponseTicket,
  NativeWorldNpcTrigger,
} from '@open-legend/native-simulation';
import type { ObserverSubject } from '@open-legend/domain';
import type { NativeWorldService } from './native-world-service.js';
import { NativeNpcCapture } from './native-npc-capture.js';
import type { NativeNpcBindingSelection } from './native-npc-sources.js';
import type { NativeFormattedNpcOffer } from './native-npc-candidates.js';
import type { CurrentMemorySource, MemoryScope } from './memory-repository.js';
import type { nativeResponseReferences } from './native-response-context.js';
import { nativeResponseSelection } from './native-response-bindings.js';
import { nativeReceiptLocator, nativeTemporalHistoryContext } from './native-temporal-context.js';
import {
  expandSituation,
  type CapturedSituation,
  type SituationQuery,
} from './situation-context.js';
import { readableDecisionContext } from './response-context.js';
import { CONTEXT_BYTE_LIMIT, ContextBudgetError } from './context.js';

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
  check(): Promise<void>;
  reopened(): void;
}) {
  const { service, original, current, situation, scope, signal } = input;
  await NativeNpcCapture.reopenResponse(service.world, input.ticket, original, current);
  input.reopened();
  await input.check();
  const repository = service.store.memories;
  const expansion = await expandSituation(situation, input.queries, async (query) => {
    await input.check();
    const result = await service.withActorMemoryRead(scope.actorId, (cut) =>
      repository.temporalHistory(
        scope,
        query,
        nativeTemporalHistoryContext(original.facts, cut, service.definitions.facts),
      ),
    );
    await input.check();
    const labels = await service.prepareNpcExperiencePresentation(original, [result]);
    return {
      ...result,
      hasMore: result.hasMore ?? false,
      presentation: { ...situation.presentation, subjectLabel: labels.subjectLabel },
    };
  });
  await input.check();
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
  const context = { ...input.context, situationQueries: false };
  const extra = `${input.additionalContext}\nRequested received evidence: ${JSON.stringify(disclosed)}`;
  let offered = [...input.offered];
  const render = () => readableDecisionContext(context, offered, true) + extra;
  if (Buffer.byteLength(render()) + Buffer.byteLength(input.instructions) > CONTEXT_BYTE_LIMIT) {
    const all = offered;
    let low = 0,
      high = all.length;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      offered = all.slice(0, middle);
      if (Buffer.byteLength(render()) + Buffer.byteLength(input.instructions) <= CONTEXT_BYTE_LIMIT)
        low = middle;
      else high = middle - 1;
    }
    offered = all.slice(0, low);
  }
  const prompt = render();
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
    actions: offered,
    actionSource: input.actionSource,
    prototypeSource: input.prototypeSource,
    perspectives: input.perspectives,
    semanticCauses: input.semanticCauses,
    intents: input.intents,
    appraisals: input.appraisals,
    receivedBodies,
  });
  const ticket = await original.bindResponse(
    service.world,
    current,
    input.jobId,
    selection,
    signal,
    input.semanticTrigger,
  );
  return { disclosed, ticket, prompt, context, offered };
}
