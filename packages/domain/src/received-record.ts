import type {
  EvidenceSource,
  ObservationFactKey,
  ObservationFrame,
  ObserverLife,
  ReceivedFacetProof,
} from './perception-evidence.js';
import type { ReceivedValueLookup, ReceivedValueReference } from './received-values.js';
import { receivedValueAt } from './received-values.js';
import type {
  TemporalFacetReference,
  TemporalReceipt,
  TemporalReceiptLocator,
  TemporalReception,
} from './temporal-evidence.js';
import {
  materializeTemporalValue,
  temporalReceiptId,
  temporalValueDependencyAliases,
  temporalValueIndividualId,
} from './temporal-evidence.js';
import type { TemporalReadSource } from './temporal-read-context.js';
import { personalFactAlias } from './experience-source.js';
import type { ReceivedBatch, ReceivedEntry } from './received-batches.js';

type WithoutObserver<T> = T extends unknown
  ? Omit<T, 'observer'> & { observer?: ObserverLife }
  : never;
export type ReceivedSource = WithoutObserver<EvidenceSource>;
export type ReceivedFact = readonly [source: number, ordinal: number];
export type ReceivedFieldClock = Pick<
  TemporalFacetReference,
  'role' | 'asOf' | 'measuredFrom' | 'measuredThrough' | 'acquiredAt' | 'confirmedThrough'
>;
export interface ReceivedProof {
  original?: ReceivedFact;
  confirmation?: number;
  from?: number;
  through?: number;
  aliases?: readonly string[];
}
export interface ReceivedField {
  memberIndex: number;
  valueRef: ReceivedValueReference;
  track?: string;
  clock?: Partial<Omit<ReceivedFieldClock, 'confirmedThrough'>> & {
    confirmedThrough?: number | null;
  };
  original?: ReceivedFact;
  receivedFrom?: number;
  support?: ReceivedProof;
  detail?: {
    proof: ReceivedProof;
    role?: TemporalFacetReference['role'];
    from?: number;
    through?: number;
    acquiredAt?: number;
  };
  poseFrame?: number;
  reception?:
    | Exclude<TemporalReception, { kind: 'location' }>
    | { kind: 'location'; frame: number };
}
type CompactOrigin =
  | Exclude<NonNullable<TemporalReceipt['origin']>, { kind: 'exposure' }>
  | (Omit<Extract<NonNullable<TemporalReceipt['origin']>, { kind: 'exposure' }>, 'source'> & {
      source?: number;
    });
/** Canonical received changes inherit ownership and chronology from their entry
 * and block. Public facet proof objects are a selected read product only.
 * docs/projects/bookkeeping-simplification-tech-design.md#recent-records-and-their-lifetime */
export type ReceivedReceipt = Omit<
  TemporalReceipt,
  | keyof TemporalReceiptLocator
  | 'id'
  | 'at'
  | 'order'
  | 'required'
  | 'facets'
  | 'receiverFrame'
  | 'origin'
> & {
  clock?: ReceivedFieldClock;
  sources: readonly ReceivedSource[];
  frames: readonly ObservationFrame[];
  frame?: number;
  origin?: CompactOrigin;
  facets: readonly ReceivedField[];
};
const clockKeys = [
  'role',
  'asOf',
  'measuredFrom',
  'measuredThrough',
  'acquiredAt',
  'confirmedThrough',
] as const;
const sameFact = (a: ReceivedFact | undefined, b: ReceivedFact | undefined) =>
  a?.[0] === b?.[0] && a?.[1] === b?.[1];
const fieldClock = (field: TemporalFacetReference): ReceivedFieldClock => ({
  role: field.role,
  asOf: field.asOf,
  measuredFrom: field.measuredFrom,
  measuredThrough: field.measuredThrough,
  acquiredAt: field.acquiredAt,
  ...(field.confirmedThrough === undefined ? {} : { confirmedThrough: field.confirmedThrough }),
});
export function compactReceivedReceipt(
  owner: Pick<ReceivedBatch, 'actorId' | 'physicalLife'>,
  receipt: TemporalReceipt,
): ReceivedReceipt {
  if (owner.actorId !== receipt.actorId || owner.physicalLife !== receipt.physicalLife)
    throw new Error('Foreign received record owner.');
  const sources: ReceivedSource[] = [],
    sourceIds = new Map<string, number>(),
    sourceObjects = new Map<EvidenceSource, number>(),
    frames: ObservationFrame[] = [];
  const source = (value: EvidenceSource): number => {
    const existing = sourceObjects.get(value);
    if (existing !== undefined) return existing;
    const { observer, ...body } = value,
      foreign = observer.actorId !== owner.actorId || observer.physicalLife !== owner.physicalLife;
    const compact = { ...body, ...(foreign ? { observer } : {}) };
    const key = JSON.stringify(compact);
    let at = sourceIds.get(key);
    if (at === undefined) {
      at = sources.length;
      sources.push(compact);
      sourceIds.set(key, at);
    }
    sourceObjects.set(value, at);
    return at;
  };
  const fact = (value: ObservationFactKey): ReceivedFact => [source(value.source), value.ordinal];
  const frame = (value: ObservationFrame): number => {
    const found = frames.findIndex(
      (other) =>
        other.forwardAtObservation === value.forwardAtObservation &&
        other.positionAtObservation.x === value.positionAtObservation.x &&
        other.positionAtObservation.y === value.positionAtObservation.y &&
        other.positionAtObservation.z === value.positionAtObservation.z,
    );
    if (found >= 0) return found;
    frames.push(value);
    return frames.length - 1;
  };
  const clock = receipt.facets[0] && fieldClock(receipt.facets[0]);
  const proof = (
    value: ReceivedFacetProof,
    field: TemporalFacetReference,
    original: ReceivedFact | undefined,
    receivedFrom: number | undefined,
  ): ReceivedProof => {
    const ownOriginal = fact(value.original),
      confirmation = source(value.confirmation);
    return {
      ...(!sameFact(ownOriginal, original) ? { original: ownOriginal } : {}),
      ...(confirmation !== receivedFrom ? { confirmation } : {}),
      ...(value.confirmedFrom !== field.measuredFrom ? { from: value.confirmedFrom } : {}),
      ...(value.confirmedThrough !== (field.confirmedThrough ?? field.measuredThrough)
        ? { through: value.confirmedThrough }
        : {}),
      ...(value.aliases === undefined ? {} : { aliases: value.aliases }),
    };
  };
  const facets = receipt.facets.map((field): ReceivedField => {
    const original = field.original && fact(field.original),
      receivedFrom = field.receivedFrom && source(field.receivedFrom);
    const own = fieldClock(field),
      difference: NonNullable<ReceivedField['clock']> = {};
    for (const key of clockKeys)
      if (own[key] !== clock?.[key]) Object.assign(difference, { [key]: own[key] ?? null });
    const detail = field.detailSupport;
    return {
      memberIndex: field.memberIndex,
      valueRef: field.valueRef,
      ...(field.track === undefined ? {} : { track: field.track }),
      ...(Object.keys(difference).length ? { clock: difference } : {}),
      ...(original ? { original } : {}),
      ...(receivedFrom === undefined ? {} : { receivedFrom }),
      ...(field.support ? { support: proof(field.support, field, original, receivedFrom) } : {}),
      ...(detail
        ? {
            detail: {
              proof: proof(detail.proof, field, original, receivedFrom),
              ...(detail.role !== field.role ? { role: detail.role } : {}),
              ...(detail.from !== field.measuredFrom ? { from: detail.from } : {}),
              ...(detail.through !== field.measuredThrough ? { through: detail.through } : {}),
              ...(detail.acquiredAt !== field.acquiredAt ? { acquiredAt: detail.acquiredAt } : {}),
            },
          }
        : {}),
      ...(field.poseFrame ? { poseFrame: frame(field.poseFrame) } : {}),
      ...(field.reception
        ? {
            reception:
              field.reception.kind === 'location'
                ? { kind: 'location' as const, frame: frame(field.reception.frame) }
                : field.reception,
          }
        : {}),
    };
  });
  const {
    actorId: _actor,
    physicalLife: _life,
    epoch: _epoch,
    batchOrder: _batch,
    entryIndex: _entry,
    id: _id,
    at: _at,
    order: _order,
    required: _required,
    facets: _facets,
    receiverFrame,
    origin,
    ...header
  } = receipt;
  const compactOrigin: CompactOrigin | undefined =
    origin?.kind === 'exposure'
      ? (({ source: original, ...body }) => ({
          ...body,
          ...(original ? { source: source(original) } : {}),
        }))(origin)
      : origin;
  return {
    ...header,
    ...(clock ? { clock } : {}),
    sources,
    frames,
    ...(receiverFrame ? { frame: frame(receiverFrame) } : {}),
    ...(compactOrigin ? { origin: compactOrigin } : {}),
    facets,
  };
}
export function materializeReceivedReceipt(
  owner: ReceivedBatch,
  entry: ReceivedEntry,
  members?: ReadonlySet<number>,
): TemporalReceipt {
  const record = entry.receipt,
    usedSources = new Set<number>(),
    usedFrames = new Set<number>();
  const source = (index: number): EvidenceSource => {
    if (!Number.isSafeInteger(index) || index < 0 || !record.sources[index])
      throw new Error('Missing received source.');
    usedSources.add(index);
    const value = record.sources[index]!;
    return {
      ...value,
      observer: value.observer ?? { actorId: owner.actorId, physicalLife: owner.physicalLife },
    };
  };
  const fact = (value: ReceivedFact): ObservationFactKey => ({
    source: source(value[0]),
    ordinal: value[1],
  });
  const frame = (index: number): ObservationFrame => {
    if (!Number.isSafeInteger(index) || index < 0 || !record.frames[index])
      throw new Error('Missing received frame.');
    usedFrames.add(index);
    return record.frames[index]!;
  };
  const fields = members
    ? record.facets.filter((field) => members.has(field.memberIndex))
    : record.facets;
  const facets = fields.map((field): TemporalFacetReference => {
    if (!record.clock) throw new Error('Missing received field clocks.');
    const combined = { ...record.clock, ...field.clock };
    // null explicitly omits an optional field whose block default was present.
    const confirmedThrough =
      combined.confirmedThrough === null ? undefined : combined.confirmedThrough;
    const clock: ReceivedFieldClock = {
      role: combined.role,
      asOf: combined.asOf,
      measuredFrom: combined.measuredFrom,
      measuredThrough: combined.measuredThrough,
      acquiredAt: combined.acquiredAt,
      ...(confirmedThrough === undefined ? {} : { confirmedThrough }),
    };
    const original = field.original && fact(field.original),
      receivedFrom = field.receivedFrom === undefined ? undefined : source(field.receivedFrom);
    const proof = (value: ReceivedProof): ReceivedFacetProof => {
      const proofOriginal = value.original ? fact(value.original) : original,
        confirmation = value.confirmation === undefined ? receivedFrom : source(value.confirmation);
      if (!proofOriginal || !confirmation) throw new Error('Incomplete received proof.');
      return {
        original: proofOriginal,
        confirmation,
        confirmedFrom: value.from ?? clock.measuredFrom,
        confirmedThrough: value.through ?? confirmedThrough ?? clock.measuredThrough,
        ...(value.aliases ? { aliases: [...value.aliases] } : {}),
      };
    };
    const detail = field.detail;
    return {
      ...clock,
      memberIndex: field.memberIndex,
      valueRef: field.valueRef,
      ...(field.track === undefined ? {} : { track: field.track }),
      ...(original ? { original } : {}),
      ...(receivedFrom ? { receivedFrom } : {}),
      ...(field.support ? { support: proof(field.support) } : {}),
      ...(detail
        ? {
            detailSupport: {
              proof: proof(detail.proof),
              role: detail.role ?? clock.role,
              from: detail.from ?? clock.measuredFrom,
              through: detail.through ?? clock.measuredThrough,
              acquiredAt: detail.acquiredAt ?? clock.acquiredAt,
            },
          }
        : {}),
      ...(field.poseFrame === undefined ? {} : { poseFrame: frame(field.poseFrame) }),
      ...(field.reception
        ? {
            reception:
              field.reception.kind === 'location'
                ? { kind: 'location' as const, frame: frame(field.reception.frame) }
                : field.reception,
          }
        : {}),
    };
  });
  const {
    clock: _clock,
    sources: _sources,
    frames: _frames,
    frame: receiverFrame,
    origin,
    facets: _facets,
    ...header
  } = record;
  const locator = {
    actorId: owner.actorId,
    physicalLife: owner.physicalLife,
    epoch: owner.epoch,
    batchOrder: owner.batchOrder,
    entryIndex: entry.entryIndex,
  };
  const publicOrigin: TemporalReceipt['origin'] =
    origin?.kind === 'exposure'
      ? (({ source: index, ...body }) => ({
          ...body,
          ...(index === undefined ? {} : { source: source(index) }),
        }))(origin)
      : origin;
  const result: TemporalReceipt = {
    ...header,
    ...locator,
    id: temporalReceiptId(locator),
    at: entry.receivedAt,
    order: entry.order,
    required: entry.required,
    ...(receiverFrame === undefined ? {} : { receiverFrame: frame(receiverFrame) }),
    ...(publicOrigin ? { origin: publicOrigin } : {}),
    facets,
  };
  if (
    !members &&
    (usedSources.size !== record.sources.length || usedFrames.size !== record.frames.length)
  )
    throw new Error('Unreferenced received metadata.');
  return result;
}
export function receivedRecordValueReferences(
  record: ReceivedReceipt,
  members?: ReadonlySet<number>,
): ReadonlySet<string> {
  const result = new Set<string>();
  for (const field of record.facets) {
    if (members && !members.has(field.memberIndex)) continue;
    if (typeof field.valueRef === 'string') result.add(field.valueRef);
    if (field.reception?.kind === 'body' && typeof field.reception.poseRef === 'string')
      result.add(field.reception.poseRef);
  }
  return result;
}
/** Metadata visits direct identities and values without reconstructing proof objects. */
export function receivedRecordAliases(
  owner: ReceivedBatch,
  entry: ReceivedEntry,
  sources: ReceivedValueLookup,
  world?: TemporalReadSource,
): string[] {
  const record = entry.receipt,
    id = temporalReceiptId({ ...owner, entryIndex: entry.entryIndex }),
    result = new Set([...record.sourceIds, id]);
  const source = (index: number | undefined) =>
    index === undefined ? undefined : record.sources[index];
  const fact = (value: ReceivedFact | undefined) => {
    if (!value) return;
    const original = source(value[0]);
    if (original) {
      result.add(original.id);
      result.add(personalFactAlias(original.id, value[1]));
    }
  };
  for (const field of record.facets) {
    result.add(personalFactAlias(id, field.memberIndex));
    fact(field.original);
    const inspect = (proof: ReceivedProof | undefined) => {
      if (!proof) return;
      fact(proof.original ?? field.original);
      const confirming = source(proof.confirmation ?? field.receivedFrom);
      if (confirming) result.add(confirming.id);
      for (const alias of proof.aliases ?? []) result.add(alias);
    };
    inspect(field.support);
    inspect(field.detail?.proof);
    const received = source(field.receivedFrom);
    if (received) result.add(received.id);
    const value = receivedValueAt(sources, field.valueRef);
    if (
      value &&
      (value.kind === 'association' || value.kind === 'claim' || value.kind === 'physical-boundary')
    ) {
      const concrete = materializeTemporalValue({}, value, sources);
      if (concrete)
        for (const alias of temporalValueDependencyAliases(concrete, world)) result.add(alias);
    }
  }
  return [...result];
}
export function receivedRecordIndividualIds(
  record: ReceivedReceipt,
  sources: ReceivedValueLookup,
): string[] {
  const result = new Set<string>();
  if (record.subjectIdentity?.kind === 'individual')
    result.add(record.subjectIdentity.individualId);
  for (const field of record.facets) {
    const value = receivedValueAt(sources, field.valueRef);
    if (value && (value.kind === 'association' || value.kind === 'event')) {
      const id = temporalValueIndividualId(value);
      if (id) result.add(id);
    }
  }
  return [...result];
}
