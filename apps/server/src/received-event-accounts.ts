import { receivedValueAt } from '@open-legend/domain';
import {
  receivedEventEvidence,
  receivedEventAwareness,
  currentReceivedObservationSources,
  materializeObservation,
  temporalFacetEligible,
  materializeTemporalValue,
  appendedRecordCount,
  isImmutableData,
  type Awareness,
  type EventEvidence,
  type TemporalReceiptLocator,
  type TemporalPage,
  type TemporalReceipt,
  type WorldState,
} from '@open-legend/domain';
import { personalEventEvidence } from './personal-accounts.js';

export interface ReceivedEventAccount {
  evidence: EventEvidence;
  awareness?: Awareness;
  projected?: Awareness;
  temporal?: {
    receipt: TemporalReceiptLocator;
    receivedAt: number;
    bytes: number;
  };
}

/** One observer reader's last immutable roots provide append lineage. The weak
 * lookup stores offsets only; accepted receipts remain the sole evidence owner. */
export type ReceivedEventAccountIndex = Map<string, TemporalPage>;
type OccurrenceReceipts = Map<string, TemporalReceipt[]>;
const occurrenceIndexes = new WeakMap<object, OccurrenceReceipts>();
/** Only actual occurrences have history accounts. Movement/check entries need
 * neither proof materialization nor value hydration to answer this query. */
function occurrenceReceipts(chunk: TemporalPage, previous?: TemporalPage): OccurrenceReceipts {
  const immutable = isImmutableData(chunk.batches);
  const cached = immutable && occurrenceIndexes.get(chunk.batches);
  if (cached) return cached;
  const prior = previous && occurrenceIndexes.get(previous.batches);
  const appended = prior && previous && appendedRecordCount(previous.batches, chunk.batches);
  const receipts = appended !== undefined ? new Map(prior) : new Map<string,TemporalReceipt[]>();
  for (const batch of chunk.batches.slice(appended === undefined ? 0 : previous!.batches.length))
    for (const entry of batch.entries) {
      const receipt=entry.kind==='occurrence'?entry.receipt:undefined;
      if (receipt?.origin?.kind!=='occurrence') continue;
      const eventId=receipt.origin.eventId;
      receipts.set(eventId,[...(receipts.get(eventId)??[]),receipt]);
    }
  if (immutable) occurrenceIndexes.set(chunk.batches,receipts);
  return receipts;
}

/** Select only this actor's already received account. Current reception can feed
 * an immediate view; only an admitted receipt can authorize a durable history row. */
export function receivedEventAccounts(
  world: WorldState,
  actorId: string,
  wanted: ReadonlySet<string>,
  options: {
    current?: boolean;
    previous?: WorldState;
    append?: boolean;
    evidenceOnly?: boolean;
    index?: ReceivedEventAccountIndex;
  } = {},
): Map<string, ReceivedEventAccount> {
  const result = new Map<string, ReceivedEventAccount>();
  const forgotten = new Set(world.experience?.forgotten[actorId] ?? []);
  const awarenessEntries = world.experience?.awareness[actorId] ?? [];
  const priorAwareness = options.previous?.experience?.awareness[actorId] ?? [];
  const awarenessAppend = options.append
    ? appendedRecordCount(priorAwareness, awarenessEntries)
    : undefined;
  for (const awareness of awarenessEntries.slice(
    awarenessAppend === undefined ? 0 : priorAwareness.length,
  ))
    if (wanted.has(awareness.eventId) && !forgotten.has(awareness.eventId))
      result.set(awareness.eventId, { evidence: personalEventEvidence(awareness), awareness });
  const temporal = world.experience?.temporal;
  const actor = temporal?.actors[actorId];
  const previous = options.previous?.experience?.temporal?.actors[actorId];
  const activeChunks = new Set(actor?.pages.map((chunk) => chunk.id));
  if (options.index)
    for (const id of options.index.keys()) if (!activeChunks.has(id)) options.index.delete(id);
  for (const chunk of [...(actor?.pages ?? [])].reverse()) {
    const prior = options.append
      ? previous?.pages.find((value) => value.id === chunk.id)
      : undefined;
    if (prior === chunk) continue;
    const occurrences = occurrenceReceipts(chunk, options.index?.get(chunk.id) ?? prior);
    options.index?.set(chunk.id, chunk);
    // A physical slice can share its batch number with another slice. Only
    // certified unchanged occurrence objects belong to the append predecessor.
    const previousOccurrences = prior && appendedRecordCount(prior.batches,chunk.batches) !== undefined
      ? occurrenceReceipts(prior) : undefined;
    for (const eventId of wanted) {
      if (result.has(eventId) || forgotten.has(eventId)) continue;
      for (const receipt of occurrences.get(eventId) ?? []) {
        if (result.has(eventId) || previousOccurrences?.get(eventId)?.includes(receipt)) continue;
        const values = receipt.facets.flatMap((reference) => {
          const fragment = receivedValueAt(world.receivedValues?.sources ?? {}, reference);
          if (!fragment || (fragment.kind !== 'event' && fragment.kind !== 'sound')) return [];
          const value = materializeTemporalValue(
            reference,
            fragment,
            world.receivedValues?.sources ?? {},
          );
          return value && temporalFacetEligible(world, actorId, reference, value) ? [value] : [];
        });
        const evidence = receivedEventEvidence(actorId, values);
        if (evidence)
          result.set(eventId, {
            evidence,
            ...(options.evidenceOnly
              ? {}
              : {
                  projected: receivedEventAwareness(
                    actorId,
                    receipt.origin as Extract<
                      NonNullable<typeof receipt.origin>,
                      { kind: 'occurrence' }
                    >,
                    values,
                    {
                      actorId,
                      physicalLife: receipt.physicalLife,
                      epoch: receipt.epoch,
                      batchOrder: receipt.batchOrder,entryIndex: receipt.entryIndex,
                    },
                  ),
                  temporal: {
                    receivedAt: receipt.at,
                    bytes: Buffer.byteLength(
                      JSON.stringify({
                        receipt,
                        values: values.filter(
                          (value) => value.kind === 'event' || value.kind === 'sound',
                        ),
                      }),
                    ),
                    receipt: {
                      actorId,
                      physicalLife: receipt.physicalLife,
                      epoch: receipt.epoch,
                      batchOrder: receipt.batchOrder,entryIndex: receipt.entryIndex,
                    },
                  },
                }),
          });
      }
    }
  }
  if (options.current)
    for (const source of currentReceivedObservationSources(world, actorId).observations) {
      const eventId = source.origin.kind === 'occurrence' ? source.origin.eventId : undefined;
      if (!eventId || !wanted.has(eventId) || result.has(eventId) || forgotten.has(eventId))
        continue;
      const observation = materializeObservation(world, source);
      const values = observation.facets
        .filter((facet) => facet.value.kind === 'event' || facet.value.kind === 'sound')
        .flatMap((facet) =>
          (facet.value.kind === 'event' || facet.value.kind === 'sound') &&
          temporalFacetEligible(
            world,
            actorId,
            {
              original: {
                source: {
                  family: 'native-exposure',
                  observer: observation.observer,
                  id: observation.id,
                  revision: observation.revision,
                },
                ordinal: facet.ordinal,
              },
            },
            facet.value,
          )
            ? [facet.value]
            : [],
        );
      const evidence = receivedEventEvidence(actorId, values);
      if (evidence && observation.origin.kind === 'occurrence')
        result.set(eventId, {
          evidence,
          ...(!options.evidenceOnly
            ? { projected: receivedEventAwareness(actorId, observation.origin, values) }
            : {}),
        });
    }
  return result;
}
