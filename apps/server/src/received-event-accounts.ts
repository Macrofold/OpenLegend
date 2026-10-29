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
  type TemporalChunk,
  type TemporalReceipt,
  type WorldState,
} from '@open-legend/domain';
import { personalEventEvidence } from './personal-accounts.js';

export interface ReceivedEventAccount {
  evidence: EventEvidence;
  awareness?: Awareness;
  projected?: Awareness;
  temporal?: { chunkId: string; receipt: TemporalReceiptLocator; bytes: number };
}

/** One observer reader's last immutable roots provide append lineage. The weak
 * lookup stores offsets only; accepted receipts remain the sole evidence owner. */
export type ReceivedEventAccountIndex = Map<string, TemporalChunk>;
type OccurrenceOffsets = Map<string, number[]>;
const occurrenceIndexes = new WeakMap<TemporalReceipt[], OccurrenceOffsets>();
function occurrenceOffsets(chunk: TemporalChunk, previous?: TemporalChunk): OccurrenceOffsets {
  const receipts = chunk.receipts;
  const immutable = isImmutableData(receipts);
  const cached = immutable && occurrenceIndexes.get(receipts);
  if (cached) return cached;
  const prior = previous && occurrenceIndexes.get(previous.receipts);
  const appended = prior && previous && appendedRecordCount(previous.receipts, receipts);
  const offsets = appended !== undefined ? new Map(prior) : new Map<string, number[]>();
  const start = appended === undefined ? 0 : receipts.length - appended;
  for (let index = start; index < receipts.length; index++) {
    const origin = receipts[index]!.origin;
    if (origin?.kind !== 'occurrence') continue;
    const known = offsets.get(origin.eventId);
    offsets.set(origin.eventId, known ? [...known, index] : [index]);
  }
  // Keep immutable cuts independent. Only the sparse event-key map is copied on
  // append; motion receipts are neither rescanned nor hydrated. Unknown/forked/
  // replaced vectors rebuild instead of trusting a matching chunk ID.
  if (immutable) occurrenceIndexes.set(receipts, offsets);
  return offsets;
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
  const activeChunks = new Set(actor?.chunks.map((chunk) => chunk.id));
  if (options.index)
    for (const id of options.index.keys()) if (!activeChunks.has(id)) options.index.delete(id);
  for (const chunk of [...(actor?.chunks ?? [])].reverse()) {
    const prior = options.append
      ? previous?.chunks.find((value) => value.id === chunk.id)
      : undefined;
    if (prior === chunk) continue;
    const offsets = occurrenceOffsets(chunk, options.index?.get(chunk.id) ?? prior);
    options.index?.set(chunk.id, chunk);
    const lower =
      prior && appendedRecordCount(prior.receipts, chunk.receipts) !== undefined
        ? prior.receipts.length
        : 0;
    for (const eventId of wanted) {
      if (result.has(eventId) || forgotten.has(eventId)) continue;
      for (const offset of offsets.get(eventId) ?? []) {
        if (offset < lower || offset >= chunk.receipts.length || result.has(eventId)) continue;
        const receipt = chunk.receipts[offset]!;
        const values = receipt.facets.flatMap((reference) => {
          const fragment =
            world.receivedValues?.sources[reference.blockId]?.values[reference.valueOrdinal];
          if (!fragment || (fragment.kind !== 'event' && fragment.kind !== 'sound')) return [];
          const value = materializeTemporalValue(reference, fragment);
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
                      ordinal: receipt.ordinal,
                    },
                  ),
                  temporal: {
                    chunkId: chunk.id,
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
                      ordinal: receipt.ordinal,
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
              blockId: '',
              valueOrdinal: facet.ordinal,
              ordinal: facet.ordinal,
              role: facet.role,
              asOf: facet.asOf,
              measuredFrom: facet.measuredFrom,
              measuredThrough: facet.measuredThrough,
              acquiredAt: observation.acquiredAt,
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
