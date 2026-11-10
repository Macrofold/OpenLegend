import type { NativeWorld } from '@open-legend/native-simulation';
import { jsonByteLength, type TemporalPage } from '@open-legend/domain';
import type { RecordChanges } from './world-records.js';
import {
  captureTemporalPageChange,
  temporalPageRecordId,
  type PendingTemporalPage,
} from './temporal-page-storage.js';
import { attachNativeConsumer, nativeJsonEncodingWorkspace } from './native-consumer.js';

/** Actual journal images accompany the same private prefix used by SQL. These
 * are revocation inputs, never a second page packer or a cold-read fallback. */
export interface NativeTemporalPredecessor {
  readonly id: string;
  readonly before: TemporalPage;
  readonly after: TemporalPage | null;
  readonly afterPayload: string | null;
}
export function nativeTemporalPageEdits(
  budget: Pick<NativeWorld, 'reserveConsumerBytes'>,
  changes: RecordChanges,
  predecessors: readonly NativeTemporalPredecessor[],
  origin: object,
): readonly PendingTemporalPage[] {
  if (!Array.isArray(predecessors))
    throw new Error('Native temporal edits have no actual journal predecessors.');
  const writes = changes.writes.get('mind_temporal_pages') ?? [];
  const deletes = changes.deletes.get('mind_temporal_pages') ?? [];
  // Preflight only walks the closed received-record shape. Its key arrays have
  // bounded nesting; no encoded page or receipt is constructed here.
  const preflight = budget.reserveConsumerBytes(16 * 512);
  let storage;
  try {
    let bytes = 6 * 256 + (predecessors.length + writes.length + deletes.length) * 12 * 512;
    for (const image of predecessors)
      for (const page of [image.before, image.after]) {
        if (!page) continue;
        for (const batch of page.batches)
          for (const entry of batch.entries) {
            if (entry.kind !== 'occurrence') continue;
            // SQL's existing revocation owner retains canonical receipt strings
            // and address-map entries while comparing the two actual pages.
            // Four UTF-16 carriers cover canonical assembly + its retained map;
            // the shared traversal bound covers entry/sort/map array metadata.
            bytes +=
              8 * jsonByteLength(entry.receipt) +
              nativeJsonEncodingWorkspace(entry.receipt) +
              8 * (batch.epoch.length + 128) +
              512;
          }
      }
    storage = budget.reserveConsumerBytes(bytes);
  } finally {
    preflight.release();
  }
  const result: PendingTemporalPage[] = [];
  try {
    const after = new Map(writes.map((row) => [row.id, row]));
    const deleted = new Set(deletes);
    const selected = new Set<string>();
    for (const image of predecessors) {
      if (
        selected.has(image.id) ||
        temporalPageRecordId(image.before.actorId, image.before.id) !== image.id
      )
        throw new Error('Native temporal predecessor has a different or repeated page identity.');
      selected.add(image.id);
      if (image.after === null) {
        if (image.afterPayload !== null || !deleted.has(image.id) || after.has(image.id))
          throw new Error('Native temporal deletion disagrees with its sealed prefix.');
        result.push({
          ...captureTemporalPageChange(image.before, image.before, true),
          deleted: true,
        });
      } else {
        const row = after.get(image.id);
        if (
          !row ||
          image.afterPayload !== row.payload ||
          temporalPageRecordId(image.after.actorId, image.after.id) !== image.id ||
          image.before.physicalLife !== image.after.physicalLife ||
          image.before.epoch !== image.after.epoch
        )
          throw new Error('Native temporal replacement disagrees with its sealed prefix.');
        result.push(captureTemporalPageChange(image.before, image.after, true));
      }
    }
    if (
      deletes.some((id) => !selected.has(id)) ||
      writes.some((row) => row.logicalRemoval === true && !selected.has(row.id))
    )
      throw new Error('Native temporal revocation omitted its exact predecessor.');
  } catch (error) {
    storage.release();
    throw error;
  }
  return attachNativeConsumer(result, storage, origin);
}
