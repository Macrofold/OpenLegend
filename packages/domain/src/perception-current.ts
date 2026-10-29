import { readOnlyDraftView } from './draft.js';
import { canonicalJson } from './events.js';
import { isImmutableData, immutableDataSnapshot, jsonText } from './records.js';
import { receivedObservationFacetMetadata } from './perception-evidence.js';
import type {
  LiveFacetSupport,
  ObserverLife,
  ObservationExposure,
  PerceptionEvidenceOwner,
  ReceivedObservation,
} from './perception-evidence.js';

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

/** The one native and persisted current representation. Defaults belong to the
 * exact original facet; the current clock never supplies a missing timestamp. */
export type CurrentFacetRecord = Omit<LiveFacetSupport, keyof EnvelopeMetadata> & {
  original: string;
  originalOrdinal: number;
  exposure: string;
  modality: LiveFacetSupport['modality'];
  at?: number;
  from?: number;
  acquiredAt?: number;
  confirmedFrom?: number;
  confirmedThrough?: number;
};

const originalKeys = new WeakMap<ReceivedObservation, string>();
export function currentOriginalKey(input: ReceivedObservation): string {
  const source = readOnlyDraftView(input);
  const known = originalKeys.get(source);
  if (known) return known;
  const key = JSON.stringify([source.id, source.revision]);
  if (isImmutableData(source)) originalKeys.set(source, key);
  return key;
}

export function currentFacetObserver(owner: PerceptionEvidenceOwner): ObserverLife {
  const observer = readOnlyDraftView(owner).observer;
  if (!observer) throw new Error('A current observation has no receiving observer.');
  return readOnlyDraftView(observer);
}
export function currentOriginal(
  owner: PerceptionEvidenceOwner,
  reference: string,
): ReceivedObservation {
  const originals = readOnlyDraftView(readOnlyDraftView(owner).originals);
  if (!Object.hasOwn(originals, reference))
    throw new Error('A current observation has no exact owned original.');
  return readOnlyDraftView(originals[reference]!);
}
export function currentFacetOriginal(
  owner: PerceptionEvidenceOwner,
  record: CurrentFacetRecord,
): ReceivedObservation {
  return currentOriginal(owner, readOnlyDraftView(record).original);
}
export function currentFacetExposure(
  owner: PerceptionEvidenceOwner,
  record: CurrentFacetRecord,
): ObservationExposure {
  return { observer: currentFacetObserver(owner), episodeId: readOnlyDraftView(record).exposure };
}
export function currentFacetTimes(
  owner: PerceptionEvidenceOwner,
  input: CurrentFacetRecord,
): Pick<
  LiveFacetSupport,
  | 'valueMeasuredFrom'
  | 'valueMeasuredThrough'
  | 'valueAcquiredAt'
  | 'confirmedFrom'
  | 'confirmedThrough'
> {
  const record = readOnlyDraftView(input);
  const facet = receivedObservationFacetMetadata(
    currentFacetOriginal(owner, record),
    record.originalOrdinal,
  );
  const at = record.at ?? facet.measuredThrough;
  return {
    valueMeasuredFrom: record.from ?? at,
    valueMeasuredThrough: at,
    valueAcquiredAt: record.acquiredAt ?? at,
    confirmedFrom: record.confirmedFrom ?? facet.measuredFrom,
    confirmedThrough: record.confirmedThrough ?? at,
  };
}
export function updateCurrentFacetTimes(
  owner: PerceptionEvidenceOwner,
  input: CurrentFacetRecord,
  changes: Partial<ReturnType<typeof currentFacetTimes>>,
): CurrentFacetRecord {
  const {
    at: _at,
    from: _from,
    acquiredAt: _acquired,
    confirmedFrom: _start,
    confirmedThrough: _end,
    ...fields
  } = readOnlyDraftView(input);
  const times = { ...currentFacetTimes(owner, input), ...changes };
  return {
    ...fields,
    ...compactTimes(currentFacetOriginal(owner, input), input.originalOrdinal, times),
  };
}

function compactTimes(
  original: ReceivedObservation,
  ordinal: number,
  times: ReturnType<typeof currentFacetTimes>,
) {
  const facet = receivedObservationFacetMetadata(original, ordinal);
  const {
    valueMeasuredFrom: from,
    valueMeasuredThrough: at,
    valueAcquiredAt: acquiredAt,
    confirmedFrom,
    confirmedThrough,
  } = times;
  return {
    ...(at === facet.measuredThrough ? {} : { at }),
    ...(from === at ? {} : { from }),
    ...(acquiredAt === at ? {} : { acquiredAt }),
    ...(confirmedFrom === facet.measuredFrom ? {} : { confirmedFrom }),
    ...(confirmedThrough === at ? {} : { confirmedThrough }),
  };
}
/** Complete logical metadata only for a selected capture/consumer. Hot selectors
 * use the compact fields and individual accessors instead of expanding every row. */
export function currentFacetSupport(
  owner: PerceptionEvidenceOwner,
  input: CurrentFacetRecord,
): LiveFacetSupport {
  const {
    original: _original,
    exposure: _exposure,
    at: _at,
    from: _from,
    acquiredAt: _acquiredAt,
    confirmedFrom: _confirmedFrom,
    confirmedThrough: _confirmedThrough,
    ...fields
  } = readOnlyDraftView(input);
  return {
    ...fields,
    observer: currentFacetObserver(owner),
    exposure: currentFacetExposure(owner, input),
    original: currentFacetOriginal(owner, input),
    ...currentFacetTimes(owner, input),
  };
}
export function receivedPerceptionObservations(
  owner: PerceptionEvidenceOwner,
): ReceivedObservation[] {
  return readOnlyDraftView(readOnlyDraftView(owner).received).map((reference) =>
    currentOriginal(owner, reference),
  );
}

function writableOriginals(owner: PerceptionEvidenceOwner) {
  // Assignment gives a working owner its own map; unchanged immutable originals
  // remain shared. This also supports explicitly editable fixture builders.
  const originals = owner.originals;
  if (Object.isFrozen(originals)) owner.originals = { ...originals };
  return owner.originals;
}
export function retainPerceptionOriginal(
  owner: PerceptionEvidenceOwner,
  input: ReceivedObservation,
): string {
  const source = readOnlyDraftView(input),
    reference = currentOriginalKey(source),
    originals = readOnlyDraftView(readOnlyDraftView(owner).originals);
  const prior = Object.hasOwn(originals, reference)
    ? readOnlyDraftView(originals[reference]!)
    : undefined;
  if (prior) {
    if (
      prior !== source &&
      jsonText(prior) !== jsonText(source) &&
      canonicalJson(prior) !== canonicalJson(source)
    )
      throw new Error('A current observation identity has conflicting original facts.');
    return reference;
  }
  writableOriginals(owner)[reference] = immutableDataSnapshot(source, readOnlyDraftView);
  return reference;
}
/** Finish the routing context before the acquisition's atomic boundary exposes
 * this original. Existing captured values remain independently owned. */
export function completePerceptionOriginal(
  owner: PerceptionEvidenceOwner,
  source: ReceivedObservation,
): void {
  const reference = currentOriginalKey(source);
  currentOriginal(owner, reference);
  writableOriginals(owner)[reference] = immutableDataSnapshot(source, readOnlyDraftView);
}

/** Receipts and live leases own catalogue membership. Only candidates released
 * by this mutation are checked; ordinary pose replacement has no candidates. */
export function prunePerceptionOriginals(
  owner: PerceptionEvidenceOwner,
  candidates: Set<string>,
): void {
  if (!candidates.size) return;
  for (const reference of readOnlyDraftView(owner.received)) candidates.delete(reference);
  if (!candidates.size) return;
  for (const record of Object.values(readOnlyDraftView(owner.current)))
    candidates.delete(readOnlyDraftView(record).original);
  if (!candidates.size) return;
  const originals = writableOriginals(owner);
  for (const reference of candidates) delete originals[reference];
}

export function compactCurrentFacet(
  owner: PerceptionEvidenceOwner,
  input: LiveFacetSupport,
): CurrentFacetRecord {
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
  } = input;
  if (
    observer.physicalLife !== owner.life ||
    observer.actorId !== exposure.observer.actorId ||
    observer.physicalLife !== exposure.observer.physicalLife ||
    (owner.observer &&
      (owner.observer.actorId !== observer.actorId ||
        owner.observer.physicalLife !== observer.physicalLife))
  )
    throw new Error('A current observation has no exact receiving owner.');
  owner.observer ??= immutableDataSnapshot(observer, readOnlyDraftView);
  return {
    ...fields,
    original: retainPerceptionOriginal(owner, original),
    originalOrdinal,
    exposure: exposure.episodeId,
    modality,
    ...compactTimes(original, originalOrdinal, {
      valueMeasuredFrom: from,
      valueMeasuredThrough: at,
      valueAcquiredAt: acquiredAt,
      confirmedFrom,
      confirmedThrough,
    }),
  };
}
