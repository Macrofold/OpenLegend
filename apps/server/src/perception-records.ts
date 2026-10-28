import {
  isImmutableData,
  jsonText,
  canonicalJson,
  type LiveFacetSupport,
  type ReceivedObservation,
  type PerceptionEvidenceOwner,
  receivedObservationFacetMetadata,
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
  modality: LiveFacetSupport['modality'];
  at?: number;
  from?: number;
  acquiredAt?: number;
  confirmedFrom?: number;
  confirmedThrough?: number;
}
type StoredEnvelope<T extends EnvelopeMetadata> = Omit<T, keyof EnvelopeMetadata> & StoredMetadata;
type StoredLease = StoredEnvelope<LiveFacetSupport>;
type StoredOwner = Omit<PerceptionEvidenceOwner, 'current' | 'received'> & {
  observer?: LiveFacetSupport['observer'];
  received: string[];
  current: Record<string, StoredLease>;
  originals: Record<string, ReceivedObservation>;
};
type Projection<T> = { value: T; originals: ReceivedObservation[] };
type Catalogue = {
  sources: Map<string, ReceivedObservation>;
  originals: StoredOwner['originals'];
};
type CurrentProjection = Catalogue & {
  current: StoredOwner['current'];
  observer?: LiveFacetSupport['observer'];
};
const projections = new WeakMap<object, StoredOwner>();
const leaseProjections = new WeakMap<object, Projection<StoredLease>>();
const receivedProjections = new WeakMap<object, string[]>();
const currentProjections = new WeakMap<object, CurrentProjection>();
// This catalogue is already scoped by its owning actor and physical life. The
// domain binds each descriptor's pooled header to that owner at admission.
const originalKey = (original: Pick<ReceivedObservation, 'id' | 'revision'>) =>
  JSON.stringify([original.id, original.revision]);
const sameObserver = (left: LiveFacetSupport['observer'], right: LiveFacetSupport['observer']) =>
  left.actorId === right.actorId && left.physicalLife === right.physicalLife;

/** Defaults belong to this exact immutable original, never the current clock or
 * another envelope. Every unequal scalar remains explicit and lossless. */
function encodeMetadata<T extends EnvelopeMetadata>(
  held: T,
  originals: ReceivedObservation[],
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
  const facet = original.facets[originalOrdinal]
    ? receivedObservationFacetMetadata(original, originalOrdinal)
    : undefined;
  if (
    !facet ||
    !sameObserver(observer, exposure.observer) ||
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
    modality,
    ...(at === facet.measuredThrough ? {} : { at }),
    ...(from === at ? {} : { from }),
    ...(acquiredAt === at ? {} : { acquiredAt }),
    ...(confirmedFrom === facet.measuredFrom ? {} : { confirmedFrom }),
    ...(confirmedThrough === at ? {} : { confirmedThrough }),
  };
}

function addOriginal(catalogue: Catalogue, original: ReceivedObservation): void {
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
  catalogue.originals[reference] = original;
}

/** Storage normalization only. Current facets retain one exact receiver-owned
 * descriptor; its typed references resolve through the world's sole value pool.
 * docs/save-and-load.md#current-format-validation */
export function encodePerceptionOwner(value: unknown): StoredOwner {
  const owner = value as PerceptionEvidenceOwner;
  const cached = projections.get(owner);
  if (cached) return cached;
  let collection = currentProjections.get(owner.current);
  if (!collection) {
    const catalogue: Catalogue = { sources: new Map(), originals: {} };
    let observer: LiveFacetSupport['observer'] | undefined;
    const current = Object.fromEntries(
      Object.entries(owner.current).map(([key, lease]) => {
        if (
          lease.observer.physicalLife !== owner.life ||
          (observer && !sameObserver(observer, lease.observer))
        )
          throw new Error('A current observation has no exact owned original.');
        observer ??= lease.observer;
        let projected = leaseProjections.get(lease);
        if (!projected) {
          const originals: ReceivedObservation[] = [];
          projected = {
            value: Object.freeze(encodeMetadata(lease, originals)),
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
    collection = { current, ...catalogue, ...(observer ? { observer } : {}) };
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
    ...(collection.observer ? { observer: collection.observer } : {}),
  };
  if (isImmutableData(owner)) {
    Object.freeze(catalogue.originals);
    Object.freeze(projected);
    projections.set(owner, projected);
  }
  return projected;
}

/** Resolve only typed references to this owner's exact original rows. Missing,
 * foreign or unused sources are corrupt current-format data. */
export function decodePerceptionOwner(value: unknown): PerceptionEvidenceOwner {
  const { originals, current, received, observer, ...owner } = value as StoredOwner;
  const used = new Set<string>();
  if (
    Object.keys(current).length > 0 !== (observer !== undefined) ||
    (observer &&
      (typeof observer.actorId !== 'string' ||
        !observer.actorId ||
        observer.physicalLife !== owner.life))
  )
    throw new Error('A current observation has no exact owned original.');
  const resolve = (reference: string): ReceivedObservation => {
    const original =
      typeof reference === 'string' && Object.hasOwn(originals, reference)
        ? originals[reference]
        : undefined;
    if (!original || originalKey(original) !== reference)
      throw new Error('A current observation has no exact owned original.');
    used.add(reference);
    return original;
  };
  const metadata = <T extends StoredMetadata>(
    held: T,
    observer: LiveFacetSupport['observer'],
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
    const original = resolve(reference),
      facet = original.facets[originalOrdinal]
        ? receivedObservationFacetMetadata(original, originalOrdinal)
        : undefined;
    if (
      !facet ||
      typeof exposure !== 'string' ||
      modality === undefined ||
      ['observer', 'valueMeasuredFrom', 'valueMeasuredThrough', 'valueAcquiredAt'].some((key) =>
        Object.hasOwn(held, key),
      )
    )
      throw new Error('A current observation has no exact owned original.');
    const at = storedAt === undefined ? facet.measuredThrough : storedAt;
    return {
      ...fields,
      observer,
      exposure: { observer, episodeId: exposure },
      original,
      originalOrdinal,
      modality,
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
      return [key, metadata(lease, observer)];
    }),
  );
  const receivedValues = received.map(resolve);
  if (used.size !== Object.keys(originals).length)
    throw new Error('An unreferenced current observation original was stored.');
  retainMapPositions(current, restored);
  return { ...owner, current: restored, received: receivedValues };
}
