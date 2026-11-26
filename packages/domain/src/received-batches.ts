import type { OrderedRecord } from './ordered-record.js';
import type { ReceivedReceipt } from './received-record.js';

/** Personal addresses are independent of physical SQL packing. */
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
export interface ReceivedEntry {
  entryIndex: number;
  order: number;
  receivedAt: number;
  kind: 'baseline' | 'sample' | 'boundary' | 'occurrence';
  required: boolean;
  receipt: ReceivedReceipt;
  charge: { bytes: number; count: number };
}
/** The native append block contains actual changes, not confirmation carriers. */
export interface ReceivedBatch {
  actorId: string;
  physicalLife: number;
  epoch: string;
  batchOrder: number;
  entries: readonly ReceivedEntry[];
}
/** One bounded block header. No member masks or exact deduplicated closure ledger. */
export interface ReceivedChargeEntry {
  batchOrder: number;
  firstEntry: number;
  entryIndex: number;
  lastMember: number;
  at: number;
  throughAt: number;
  order: number;
  bytes: number;
  count: number;
  individualIds: readonly string[];
  sourceIds: readonly string[];
}
export interface ReceivedChargeDirectory {
  actorId: string;
  physicalLife: number;
  epoch: string;
  entries: readonly ReceivedChargeEntry[];
}
export interface ReceivedRecentDirectory {
  blocks: OrderedRecord<ReceivedChargeDirectory>;
  /** Derived once from complete eligible block metadata, never lifetime identity truth. */
  individuals: OrderedRecord<number>;
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
