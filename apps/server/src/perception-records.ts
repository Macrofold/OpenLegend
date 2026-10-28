import {
  isImmutableData,
  jsonText,
  canonicalJson,
  type CapturedCurrentFacet,
  type CapturedLocationSample,
  type LiveFacetSupport,
  type ObservationContribution,
  type PerceptionEvidenceOwner,
  type SensoryFacet,
} from '@open-legend/domain';
import { retainMapPositions } from './history-residency.js';

type EnvelopeMetadata = Pick<
  LiveFacetSupport,
  | 'observer'
  | 'exposure'
  | 'original'
  | 'originalOrdinal'
  | 'modality'
  | 'valueMeasuredFrom'
  | 'valueMeasuredThrough'
  | 'valueAcquiredAt'
  | 'confirmedFrom'
  | 'confirmedThrough'
>;
interface StoredMetadata {
  original: string;
  originalOrdinal: number;
  exposure: string;
  modality?: LiveFacetSupport['modality'];
  at?: number;
  from?: number;
  acquiredAt?: number;
  confirmedFrom?: number;
  confirmedThrough?: number;
}
type StoredEnvelope<T extends EnvelopeMetadata> = Omit<T, keyof EnvelopeMetadata> & StoredMetadata;
type StoredSample = StoredEnvelope<CapturedLocationSample>;
type StoredCapture = Omit<StoredEnvelope<CapturedCurrentFacet>, 'value'> & {
  value: StoredFacet;
};
type StoredFacet =
  | Exclude<SensoryFacet, { kind: 'observed-motion' | 'confirmation' }>
  | (Omit<Extract<SensoryFacet, { kind: 'observed-motion' }>, 'earlier' | 'later'> & {
      earlier: StoredSample;
      later: StoredSample;
    })
  | { kind: 'confirmation'; snapshot: StoredCapture };
type StoredObservation = Omit<ObservationContribution, 'facets'> & {
  facets: Array<Omit<ObservationContribution['facets'][number], 'value'> & { value: StoredFacet }>;
};
type StoredLease = Omit<StoredEnvelope<LiveFacetSupport>, 'value'> & {
  value: StoredFacet;
};
type StoredOwner = Omit<PerceptionEvidenceOwner, 'current' | 'received'> & {
  received: string[];
  current: Record<string, StoredLease>;
  originals: Record<string, StoredObservation>;
};
type Projection<T> = { value: T; originals: ObservationContribution[] };
type Catalogue = {
  sources: Map<string, ObservationContribution>;
  originals: StoredOwner['originals'];
};
type CurrentProjection = Catalogue & { current: StoredOwner['current'] };
const projections = new WeakMap<object, StoredOwner>();
const leaseProjections = new WeakMap<object, Projection<StoredLease>>();
const sourceProjections = new WeakMap<object, Projection<StoredObservation>>();
const receivedProjections = new WeakMap<object, string[]>();
const currentProjections = new WeakMap<object, CurrentProjection>();
const originalKey = (original: Pick<ObservationContribution, 'observer' | 'id' | 'revision'>) =>
  JSON.stringify([
    original.observer.actorId,
    original.observer.physicalLife,
    original.id,
    original.revision,
  ]);
const sameObserver = (
  left: ObservationContribution['observer'],
  right: ObservationContribution['observer'],
) => left.actorId === right.actorId && left.physicalLife === right.physicalLife;

/** Defaults belong to this exact immutable original, never the current clock or
 * another envelope. Every unequal scalar remains explicit and lossless. */
function encodeMetadata<T extends EnvelopeMetadata>(
  held: T,
  originals: ObservationContribution[],
): StoredEnvelope<T> {
  const {
    observer,
    exposure,
    original,
    originalOrdinal,
    modality,
    valueMeasuredFrom: from,
    valueMeasuredThrough: at,
    valueAcquiredAt: acquiredAt,
    confirmedFrom,
    confirmedThrough,
    ...fields
  } = held;
  const facet = original.facets[originalOrdinal];
  if (
    !facet ||
    !sameObserver(observer, original.observer) ||
    !sameObserver(exposure.observer, original.observer) ||
    modality === undefined ||
    from === undefined ||
    at === undefined ||
    acquiredAt === undefined ||
    confirmedFrom === undefined ||
    confirmedThrough === undefined
  )
    throw new Error('A current observation has no exact owned original.');
  originals.push(original);
  return {
    ...fields,
    original: originalKey(original),
    originalOrdinal,
    exposure: exposure.episodeId,
    ...(modality === original.modality ? {} : { modality }),
    ...(at === facet.measuredThrough ? {} : { at }),
    ...(from === at ? {} : { from }),
    ...(acquiredAt === at ? {} : { acquiredAt }),
    ...(confirmedFrom === facet.measuredFrom ? {} : { confirmedFrom }),
    ...(confirmedThrough === at ? {} : { confirmedThrough }),
  };
}

/** Only these native facet shapes embed full received originals. Other fields,
 * including similarly named authored data, keep their exact existing meaning. */
function encodeFacet(value: SensoryFacet, originals: ObservationContribution[]): StoredFacet {
  if (value.kind === 'observed-motion')
    return Object.freeze({
      ...value,
      earlier: Object.freeze(encodeMetadata(value.earlier, originals)),
      later: Object.freeze(encodeMetadata(value.later, originals)),
    });
  if (value.kind === 'confirmation')
    return Object.freeze({
      ...value,
      snapshot: Object.freeze({
        ...encodeMetadata(value.snapshot, originals),
        value: encodeFacet(value.snapshot.value, originals),
      }),
    });
  return value;
}
function encodeObservation(original: ObservationContribution): Projection<StoredObservation> {
  const cached = sourceProjections.get(original);
  if (cached) return cached;
  const originals: ObservationContribution[] = [];
  let changed = false;
  const facets = original.facets.map((facet) => {
    const value = encodeFacet(facet.value, originals);
    if (value === facet.value) return facet;
    changed = true;
    return Object.freeze({ ...facet, value });
  });
  const value = changed ? Object.freeze({ ...original, facets: Object.freeze(facets) }) : original;
  const projected = { value: value as StoredObservation, originals };
  if (isImmutableData(original)) sourceProjections.set(original, projected);
  return projected;
}
function addOriginal(catalogue: Catalogue, original: ObservationContribution): void {
  const reference = originalKey(original),
    prior = catalogue.sources.get(reference);
  if (prior) {
    if (
      prior !== original &&
      jsonText(prior) !== jsonText(original) &&
      canonicalJson(prior) !== canonicalJson(original)
    )
      throw new Error('A current observation identity has conflicting original facts.');
    return;
  }
  catalogue.sources.set(reference, original);
  const projected = encodeObservation(original);
  catalogue.originals[reference] = projected.value;
  for (const source of projected.originals) addOriginal(catalogue, source);
}

/** Storage normalization only. Native facets still share their exact immutable
 * received observation, including both received movement endpoints and confirmations.
 * docs/save-and-load.md#current-format-validation */
export function encodePerceptionOwner(value: unknown): StoredOwner {
  const owner = value as PerceptionEvidenceOwner;
  const cached = projections.get(owner);
  if (cached) return cached;
  let collection = currentProjections.get(owner.current);
  if (!collection) {
    const catalogue: Catalogue = { sources: new Map(), originals: {} };
    const current = Object.fromEntries(
      Object.entries(owner.current).map(([key, lease]) => {
        let projected = leaseProjections.get(lease);
        if (!projected) {
          const originals: ObservationContribution[] = [];
          projected = {
            value: Object.freeze({
              ...encodeMetadata(lease, originals),
              value: encodeFacet(lease.value, originals),
            }),
            originals,
          };
          if (isImmutableData(lease)) leaseProjections.set(lease, projected);
        }
        for (const source of projected.originals) addOriginal(catalogue, source);
        return [key, projected.value];
      }),
    );
    // Envelope encoding preserves this map's key order and canonical placement.
    retainMapPositions(owner.current, current);
    collection = { current, ...catalogue };
    if (isImmutableData(owner.current)) {
      Object.freeze(current);
      Object.freeze(catalogue.originals);
      currentProjections.set(owner.current, collection);
    }
  }
  let catalogue: Catalogue = collection;
  for (const original of owner.received) {
    if (!catalogue.sources.has(originalKey(original)) && catalogue === collection)
      catalogue = {
        sources: new Map(collection.sources),
        originals: { ...collection.originals },
      };
    addOriginal(catalogue, original);
  }
  let received = receivedProjections.get(owner.received);
  if (!received) {
    received = Object.freeze(owner.received.map(originalKey)) as string[];
    if (isImmutableData(owner.received)) receivedProjections.set(owner.received, received);
  }
  const projected = {
    ...owner,
    current: collection.current,
    received,
    originals: catalogue.originals,
  };
  if (isImmutableData(owner)) {
    Object.freeze(catalogue.originals);
    Object.freeze(projected);
    projections.set(owner, projected);
  }
  return projected;
}

/** Resolve only typed references to this owner's exact original rows. Missing,
 * foreign, cyclic or unused sources are corrupt current-format data. */
export function decodePerceptionOwner(value: unknown): PerceptionEvidenceOwner {
  const { originals, current, received, ...owner } = value as StoredOwner;
  const used = new Set<string>(),
    resolving = new Set<string>(),
    restoredOriginals = new Map<string, ObservationContribution>();
  const first = Object.values(current)[0]?.original ?? received[0];
  const observer =
    typeof first === 'string' && Object.hasOwn(originals, first)
      ? originals[first]!.observer
      : undefined;
  if (observer && observer.physicalLife !== owner.life)
    throw new Error('A current observation has no exact owned original.');
  const resolve = (
    reference: string,
    observer: ObservationContribution['observer'],
  ): ObservationContribution => {
    const original =
      typeof reference === 'string' && Object.hasOwn(originals, reference)
        ? originals[reference]
        : undefined;
    if (
      !original ||
      originalKey(original) !== reference ||
      !sameObserver(original.observer, observer)
    )
      throw new Error('A current observation has no exact owned original.');
    used.add(reference);
    if (resolving.has(reference))
      throw new Error('A current observation original contains a cycle.');
    const cached = restoredOriginals.get(reference);
    if (cached) return cached;
    resolving.add(reference);
    const restored = observation(original);
    resolving.delete(reference);
    restoredOriginals.set(reference, restored);
    return restored;
  };
  const facet = (
    value: StoredFacet,
    observer: ObservationContribution['observer'],
  ): SensoryFacet => {
    const sample = <T extends StoredCapture | StoredSample>(held: T) => {
      return metadata(held, observer);
    };
    if (value.kind === 'observed-motion')
      return { ...value, earlier: sample(value.earlier), later: sample(value.later) };
    if (value.kind === 'confirmation')
      return {
        ...value,
        snapshot: {
          ...sample(value.snapshot),
          value: facet(value.snapshot.value, observer),
        },
      };
    return value;
  };
  const observation = (stored: StoredObservation): ObservationContribution => ({
    ...stored,
    facets: stored.facets.map((held) => ({ ...held, value: facet(held.value, stored.observer) })),
  });
  const metadata = <T extends StoredMetadata>(
    held: T,
    observer: ObservationContribution['observer'],
  ): Omit<T, keyof StoredMetadata> & EnvelopeMetadata => {
    const {
      original: reference,
      originalOrdinal,
      exposure,
      modality,
      at: storedAt,
      from,
      acquiredAt,
      confirmedFrom,
      confirmedThrough,
      ...fields
    } = held;
    const original = resolve(reference, observer),
      facet = original.facets[originalOrdinal];
    if (
      !facet ||
      typeof exposure !== 'string' ||
      ['observer', 'valueMeasuredFrom', 'valueMeasuredThrough', 'valueAcquiredAt'].some((key) =>
        Object.hasOwn(held, key),
      )
    )
      throw new Error('A current observation has no exact owned original.');
    const at = storedAt === undefined ? facet.measuredThrough : storedAt;
    return {
      ...fields,
      observer: original.observer,
      exposure: { observer: original.observer, episodeId: exposure },
      original,
      originalOrdinal,
      modality: modality === undefined ? original.modality : modality,
      valueMeasuredFrom: from === undefined ? at : from,
      valueMeasuredThrough: at,
      valueAcquiredAt: acquiredAt === undefined ? at : acquiredAt,
      confirmedFrom: confirmedFrom === undefined ? facet.measuredFrom : confirmedFrom,
      confirmedThrough: confirmedThrough === undefined ? at : confirmedThrough,
    };
  };
  const restored = Object.fromEntries(
    Object.entries(current).map(([key, lease]) => {
      if (!observer) throw new Error('A current observation has no exact owned original.');
      return [
        key,
        {
          ...metadata(lease, observer),
          value: facet(lease.value, observer),
        },
      ];
    }),
  );
  const receivedValues = received.map((reference) => {
    if (!observer) throw new Error('A current observation has no exact owned original.');
    return resolve(reference, observer);
  });
  if (used.size !== Object.keys(originals).length)
    throw new Error('An unreferenced current observation original was stored.');
  retainMapPositions(current, restored);
  return { ...owner, current: restored, received: receivedValues };
}
