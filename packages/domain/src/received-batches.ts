import type { OrderedRecord } from './ordered-record.js';
import type { EvidenceSource, ObservationFrame } from './perception-evidence.js';
import type { TemporalFacetReference, TemporalReceipt } from './temporal-evidence.js';

/** Stable logical addresses never depend on physical packing or member deletion. */
export interface ReceivedPosition {
  batchOrder: number;
  entryIndex: number;
  memberIndex: number;
}
export interface ReceivedAddress extends ReceivedPosition {
  actorId: string;
  physicalLife: number;
  epoch: string;
}
/** Immutable descriptor of received provenance and its exact predecessor state.
 * Parts are decoding support; they are not independently counted observations. */
export interface ReceivedBinding {
  id: number;
  subject: string;
  seed: Omit<TemporalReceipt, 'facets'>;
  /** Exact predecessor clocks for independently checked typed parts. */
  predecessors?: readonly {
    partIndices: readonly number[];
    at: number;
    order: number;
    clock: Omit<ReceivedClock, 'frame'>;
    frame?: ObservationFrame;
  }[];
  /** Stable derived charge projection; masks choose its retained members. */
  charges?: ReceivedChargeProjection;
  parts: readonly {
    partIndex: number;
    logicalMember: number;
    kind: string;
    part: 'value' | 'detail' | 'pose';
    facet: TemporalFacetReference;
  }[];
}
export interface ReceivedClock {
  confirmation: EvidenceSource;
  confirmedFrom: number;
  confirmedThrough: number;
  measurement?: {
    measuredFrom: number;
    measuredThrough: number;
    acquiredAt: number;
    receivedFrom: EvidenceSource;
  };
  frame?: number;
}
export interface ReceivedCoverage {
  binding: number;
  members: readonly { memberIndex: number; partIndices: readonly number[] }[];
  clock?: ReceivedClock;
  boundary?: TemporalReceipt['change'];
}
export interface ReceivedEntry {
  entryIndex: number;
  order: number;
  receivedAt: number;
  kind: 'baseline' | 'sample' | 'boundary' | 'occurrence';
  required: boolean;
  sampleToken?: number;
  coverage: readonly ReceivedCoverage[];
  reason?: TemporalReceipt['change'];
  receipt?: TemporalReceipt;
  /** Rejected members keep their allocated coordinates and close prior coverage. */
  rejected?: readonly {
    memberIndex: number;
    binding: number;
    subject: string;
    partIndices: readonly number[];
    parts: readonly { partIndex: number; kind: string; part: 'value' | 'detail' | 'pose' }[];
    sourceIds: readonly string[];
  }[];
  charge: { bytes: number; count: number };
}
export interface ReceivedBatch {
  actorId: string;
  physicalLife: number;
  epoch: string;
  batchOrder: number;
  frames: readonly ObservationFrame[];
  bindings: readonly ReceivedBinding[];
  entries: readonly ReceivedEntry[];
}
/** Reusable exact coverage charge projection. Rich closure atoms are declared
 * once per stable binding/mask, never copied into each successful check. */
export interface ReceivedChargeProjection {
  id: string;
  binding: number;
  members: readonly {
    logicalMember: number;
    partIndices: readonly number[];
    count: number;
    /** Shared rich values and exact typed-part descriptor atoms. This is cost
     * accounting only; actual facets independently establish value ownership. */
    closures: readonly { key: string; bytes: number }[];
    individualIds: readonly string[];
    sourceIds: readonly string[];
  }[];
}
export interface ReceivedChargeUse {
  projection: string;
  /** Parallel stable entry-local coordinates; selection never renumbers holes. */
  memberIndices: readonly number[];
  /** Stable binding-local logical member IDs; omitted means the complete projection. */
  members?: readonly number[];
}
export interface ReceivedChargeEntry {
  batchOrder: number;
  entryIndex: number;
  at: number;
  order: number;
  bytes: number;
  count: number;
  indivisible?: true;
  holes?: readonly number[];
  uses: readonly ReceivedChargeUse[];
}
export interface ReceivedChargeDirectory {
  actorId: string;
  physicalLife: number;
  epoch: string;
  projections: readonly ReceivedChargeProjection[];
  entries: readonly ReceivedChargeEntry[];
}
export interface ReceivedRecentDirectory {
  blocks: OrderedRecord<ReceivedChargeDirectory>;
  projections: OrderedRecord<{
    projection: ReceivedChargeProjection;
    members?: readonly number[];
    uses: number;
  }>;
  closures: OrderedRecord<{ bytes: number; uses: number }>;
}

export interface ReceivedFrontier {
  expiredThroughTime: number | null;
  pressureThrough?: { address: ReceivedPosition; receivedAt: number; order: number };
}
export function compareReceivedPosition(a: ReceivedPosition, b: ReceivedPosition): number {
  return (
    a.batchOrder - b.batchOrder || a.entryIndex - b.entryIndex || a.memberIndex - b.memberIndex
  );
}
export function receivedPositionEligible(
  position: ReceivedPosition,
  at: number,
  frontier: ReceivedFrontier | undefined,
): boolean {
  return (
    !frontier ||
    ((frontier.expiredThroughTime === null || at > frontier.expiredThroughTime) &&
      (!frontier.pressureThrough ||
        compareReceivedPosition(position, frontier.pressureThrough.address) > 0))
  );
}
/** A carried state is selected through an eligible later carrier, independently
 * from whether its old raw observation remains in recent history. */
export function receivedStateEligible(
  carrier: ReceivedAddress,
  asOf: number,
  frontier: ReceivedFrontier | undefined,
): boolean {
  return (
    !frontier ||
    ((frontier.expiredThroughTime === null || asOf > frontier.expiredThroughTime) &&
      (!frontier.pressureThrough ||
        (compareReceivedPosition(carrier, frontier.pressureThrough.address) > 0 &&
          asOf >= frontier.pressureThrough.receivedAt)))
  );
}

/** Keep exact used typed parts without changing their logical coordinates. */
export function selectReceivedBindingParts(
  binding: ReceivedBinding,
  indices: ReadonlySet<number>,
): ReceivedBinding {
  if (binding.parts.every((part) => indices.has(part.partIndex))) return binding;
  const parts = binding.parts.filter((part) => indices.has(part.partIndex)),
    { charges: _charges, ...descriptor } = binding;
  return {
    ...descriptor,
    parts,
    ...(binding.predecessors
      ? {
          predecessors: binding.predecessors.flatMap((predecessor) => {
            const partIndices = predecessor.partIndices.filter((index) => indices.has(index));
            return partIndices.length ? [{ ...predecessor, partIndices }] : [];
          }),
        }
      : {}),
  };
}

/** Disjoint native masks may share one original binding identity. Their clocks
 * stay independent; combining physical/current slices never selects one at random. */
export function mergeReceivedBindings(
  left: ReceivedBinding,
  right: ReceivedBinding,
): ReceivedBinding {
  if (left === right) return left;
  if (left.id !== right.id || left.subject !== right.subject)
    throw new Error('Cannot combine different received bindings.');
  const added = right.parts.filter(
    (part) => !left.parts.some((held) => held.partIndex === part.partIndex),
  );
  if (!added.length) return left;
  const parts = [...left.parts, ...added].sort((a, b) => a.partIndex - b.partIndex),
    addedIndices = new Set(added.map((part) => part.partIndex));
  // A batch's first-use predecessor is frozen. A later check may add a disjoint
  // part, but cannot replace earlier captured clocks of an already used part.
  const predecessors = [
    ...(left.predecessors ?? []),
    ...(right.predecessors ?? []).flatMap((value) => {
      const partIndices = value.partIndices.filter((index) => addedIndices.has(index));
      return partIndices.length ? [{ ...value, partIndices }] : [];
    }),
  ];
  // A different exact mask has different descriptor bytes and rich references.
  // The existing sources/world owner derives it once; do not estimate from two
  // potentially overlapping projections or keep removed parts alive.
  const { charges: _charges, ...descriptor } = left;
  return {
    ...descriptor,
    parts,
    predecessors: predecessors.filter((value) => value.partIndices.length),
  };
}
