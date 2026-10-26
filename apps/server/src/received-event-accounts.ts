import {
  receivedEventEvidence,
  receivedEventAwareness,
  temporalFacetEligible,
  appendedRecordCount,
  type Awareness,
  type EventEvidence,
  type TemporalReceiptLocator,
  type WorldState,
} from '@open-legend/domain';
import { personalEventEvidence } from './personal-accounts.js';

export interface ReceivedEventAccount {
  evidence: EventEvidence;
  awareness?: Awareness;
  projected?: Awareness;
  temporal?: { chunkId: string; receipt: TemporalReceiptLocator; bytes:number };
}

/** Select only this actor's already received account. Current reception can feed
 * an immediate view; only an admitted receipt can authorize a durable history row. */
export function receivedEventAccounts(
  world: WorldState,
  actorId: string,
  wanted: ReadonlySet<string>,
  options: { current?: boolean; previous?: WorldState; append?: boolean } = {},
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
  for (const chunk of [...(actor?.chunks ?? [])].reverse()) {
    const prior = options.append
      ? previous?.chunks.find((value) => value.id === chunk.id)
      : undefined;
    if (prior === chunk) continue;
    for (const receipt of chunk.receipts.slice(prior?.receipts.length ?? 0)) {
      const eventId = receipt.origin?.kind === 'occurrence' ? receipt.origin.eventId : undefined;
      if (!eventId || !wanted.has(eventId) || result.has(eventId) || forgotten.has(eventId))
        continue;
      const values = receipt.facets.flatMap((reference) => {
        const value = temporal!.sources[reference.blockId]?.values[reference.valueOrdinal];
        return value && temporalFacetEligible(world, actorId, reference, value) ? [value] : [];
      });
      const evidence = receivedEventEvidence(actorId, values);
      if (evidence)
        result.set(eventId, {
          evidence,
          projected: receivedEventAwareness(
            actorId,
            receipt.origin as Extract<NonNullable<typeof receipt.origin>, { kind: 'occurrence' }>,
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
            bytes:Buffer.byteLength(JSON.stringify({receipt,values:values.filter((value)=>value.kind==='event')})),
            receipt: {
              actorId,
              physicalLife: receipt.physicalLife,
              epoch: receipt.epoch,
              ordinal: receipt.ordinal,
            },
          },
        });
    }
  }
  if (options.current)
    for (const observation of world.perceptionEvidence?.[actorId]?.received ?? []) {
      const eventId =
        observation.origin.kind === 'occurrence' ? observation.origin.eventId : undefined;
      if (!eventId || !wanted.has(eventId) || result.has(eventId) || forgotten.has(eventId))
        continue;
      const values = observation.facets
        .filter((facet) => facet.value.kind === 'event')
        .flatMap((facet) =>
          facet.value.kind === 'event' &&
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
          projected: receivedEventAwareness(actorId, observation.origin, values),
        });
    }
  return result;
}
