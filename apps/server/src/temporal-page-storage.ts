import {
  appendedRecordCount,
  receivedBatchStorageBytes,
  receivedBatchChargeDirectory,
  immutableDataSnapshot,
  recordAppendBase,
  temporalPageMetadata,
  temporalPageReferences,
  temporalPageMutation,
  type TemporalPage,
  type ReceivedBatch,
  type ReceivedAddress,
  type WorldState,
} from '@open-legend/domain';
import { CHECKPOINT_LIMITS } from './checkpoint-format.js';
import type { SqlDatabase } from './store.js';

/** Native append intent belongs to the existing immutable save cut. Physical
 * packing never runs while physical time advances. */
export interface PendingTemporalPage {
  before?: TemporalPage;
  after: TemporalPage;
  replacement: boolean;
  deleted?: true;
  reservedBytes: number;
}
export const TEMPORAL_PAGE_TARGET_BYTES = 64 * 1024;
export const temporalPageRecordId = (actorId: string, id: string) =>
  JSON.stringify(['world', 'experience', 'temporal', 'actors', actorId, 'pages', id]);
export const temporalPageIntentKey = (page: TemporalPage) =>
  JSON.stringify([page.actorId, page.physicalLife, page.epoch, page.id]);

/** Whole logical blocks use their maximum received time and final append
 * position. Received source dates need not follow append order. */
export function temporalBlockExpiredSql(block: string, actor: string): string {
  return `((${block}.last_at<=${actor}.expired_through_time OR
    (${block}.last_batch_order,${block}.last_entry,${block}.last_member)<=
      (${actor}.pressure_batch_order,${actor}.pressure_entry,${actor}.pressure_member)) IS TRUE)`;
}

export function captureTemporalPageChange(
  before: TemporalPage | undefined,
  after: TemporalPage,
  replacement = false,
): PendingTemporalPage {
  replacement ||= temporalPageMutation(after) === 'edit';
  let appended = before ? appendedRecordCount(before.batches, after.batches) : 0;
  if (before && appended === undefined && !replacement && residencyDescendsFrom(after, before)) {
    before = undefined;
    appended = 0;
  }
  if (before && appended === undefined && !replacement)
    throw new Error('Temporal append has no certified predecessor.');
  const start = replacement ? 0 : (before?.batches.length ?? 0);
  const count = after.batches.length - start;
  // Native admission already measures immutable batch bytes. Reuse that cached
  // encoding: logical memory charges omit the copied decoding seeds and cannot
  // safely reserve pending writer memory.
  let bytes = 0;
  for (let index = start; index < after.batches.length; index++)
    bytes += receivedBatchStorageBytes(after.batches[index]!);
  return { before, after, replacement, reservedBytes: 4096 + bytes * 8 + count * 2048 };
}
export function mergeTemporalPageIntent(
  previous: PendingTemporalPage | undefined,
  next: PendingTemporalPage,
): PendingTemporalPage {
  if (!previous) return next;
  if (next.deleted) return { ...next, before: previous.before ?? previous.after };
  if (previous.deleted) throw new Error('A deleted temporal block cannot be reused.');
  if (previous.after !== next.before && previous.after !== next.after) {
    if (residencyDescendsFrom(next.before ?? next.after, previous.after))
      return captureTemporalPageChange(
        undefined,
        next.after,
        previous.replacement || next.replacement,
      );
    throw new Error('Temporal save intent has discontinuous native ancestry.');
  }
  return captureTemporalPageChange(
    previous.before,
    next.after,
    previous.replacement || next.replacement,
  );
}

const unique = <T>(values: Iterable<T>) => [...new Set(values)];
export type ReceiptLookup = 'subjects' | 'sourceIds' | 'individualIds' | 'tracks';
/** Fixed vocabulary avoids a lifetime-sized index dictionary. Exact projected
 * membership remains mandatory; buckets never grant access. */
export function receiptLookupBucket(kind: ReceiptLookup, value: string): number {
  let hash = 2166136261;
  for (const text of [kind, '\0', value])
    for (let index = 0; index < text.length; index++)
      hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return hash & 16383;
}
export const receiptLookupBuckets = (kind: ReceiptLookup, values: readonly string[]): number[] =>
  unique(values.map((value) => receiptLookupBucket(kind, value))).sort((a, b) => a - b);

export interface StoredTemporalPage {
  native: TemporalPage;
  payload: string;
  metadata: ReturnType<typeof temporalPageMetadata>;
  lookupBuckets: number[];
  replacement?: boolean;
}
const encodings = new WeakMap<object, StoredTemporalPage>();
const residentBytes = new WeakMap<object, number>();
export function encodeTemporalPage(
  page: TemporalPage,
  world: WorldState,
  prepared?: ReturnType<typeof temporalPageMetadata>,
): StoredTemporalPage {
  const existing = encodings.get(page);
  if (existing) return existing;
  const projection =
    prepared ?? temporalPageMetadata(page, { world, sources: world.receivedValues?.sources });
  const metadata = { ...projection, references: [...projection.references].sort() };
  const payload = serializeTemporalPage(page);
  const lookupBuckets = unique([
    ...receiptLookupBuckets('subjects', metadata.subjects),
    ...receiptLookupBuckets('tracks', metadata.tracks),
    ...receiptLookupBuckets('sourceIds', metadata.sourceIds),
    ...receiptLookupBuckets('individualIds', metadata.individualIds),
  ]).sort((a, b) => a - b);
  const result = { native: page, payload, metadata, lookupBuckets };
  encodings.set(page, result);
  residentBytes.set(page, Buffer.byteLength(payload));
  return result;
}
/** Physical save blocks contain complete logical batches. Whole-block expiry
 * must not retain a facet-split predecessor chain or a per-member directory. */
export function packTemporalSave(
  intents: Iterable<PendingTemporalPage>,
  world: WorldState,
  acknowledgedBefore: number | undefined,
): StoredTemporalPage[] {
  const result: StoredTemporalPage[] = [];
  const owners = new Map<
    string,
    { prototype: TemporalPage; batches: Map<number, ReceivedBatch> }
  >();
  for (const intent of intents) {
    const source = intent.after;
    if (intent.deleted) continue;
    if (intent.replacement || (source.appendClosed === true && acknowledgedBefore === undefined)) {
      if (source.appendClosed !== true || !source.batches.length)
        throw new Error('A temporal replacement requires an existing physical block.');
      if (
        intent.before &&
        (intent.before.appendClosed !== true ||
          intent.before.id !== source.id ||
          intent.before.actorId !== source.actorId ||
          intent.before.physicalLife !== source.physicalLife ||
          intent.before.epoch !== source.epoch)
      )
        throw new Error('A temporal replacement has a different physical predecessor.');
      const encoded = encodeTemporalPage(source, world);
      if (temporalCheckpointBytes(encoded, world.id) > CHECKPOINT_LIMITS.rowBytes)
        throw new Error('An indivisible received history record exceeds its admission limit.');
      result.push({ ...encoded, replacement: intent.replacement });
      continue;
    }
    const frontier = world.experience?.temporal?.actors[source.actorId]?.frontier;
    const appended = source.batches.filter((batch) => {
      if (acknowledgedBefore !== undefined && batch.batchOrder < acknowledgedBefore) return false;
      const last = batch.entries.at(-1);
      if (!last) return false;
      if (!frontier) return true;
      const header = receivedBatchChargeDirectory(batch, world.receivedValues?.sources ?? {}, world)
        .entries[0];
      if (
        header &&
        frontier.expiredThroughTime !== null &&
        header.throughAt <= frontier.expiredThroughTime
      )
        return false;
      const pressure = frontier.pressureThrough?.address;
      return (
        !pressure ||
        batch.batchOrder > pressure.batchOrder ||
        (batch.batchOrder === pressure.batchOrder && last.entryIndex > pressure.entryIndex)
      );
    });
    if (source.appendClosed === true && appended.length)
      throw new Error('An acknowledged physical temporal block cannot append.');
    const key = JSON.stringify([source.actorId, source.physicalLife, source.epoch]);
    let owner = owners.get(key);
    if (!owner) owners.set(key, (owner = { prototype: source, batches: new Map() }));
    for (const batch of appended) {
      const prior = owner.batches.get(batch.batchOrder);
      if (prior && prior !== batch) throw new Error('Conflicting native received batch.');
      owner.batches.set(batch.batchOrder, batch);
    }
  }
  for (const { prototype, batches } of owners.values()) {
    const encode = (selected: readonly ReceivedBatch[]): StoredTemporalPage => {
      const page: TemporalPage = { ...prototype, batches: [...selected] };
      const metadata = temporalPageMetadata(page, { world });
      const id = JSON.stringify([
        prototype.actorId,
        prototype.physicalLife,
        prototype.epoch,
        metadata.firstBatchOrder,
        metadata.firstEntry,
        metadata.firstMember,
      ]);
      return encodeTemporalPage(
        immutableDataSnapshot({
          ...page,
          id,
          appendClosed: true as const,
          order: metadata.firstBatchOrder!,
          fromAt: metadata.firstAt!,
          throughAt: metadata.lastAt!,
          bytes: metadata.entryBytes,
          count: metadata.count,
          subjects: metadata.subjects,
          sourceIds: metadata.sourceIds,
          individualIds: metadata.individualIds,
          sourceRefs: metadata.references,
        }),
        world,
        metadata,
      );
    };
    const flush = (selected: readonly ReceivedBatch[]): void => {
      if (!selected.length) return;
      const encoded = encode(selected);
      const bytes =
        Buffer.byteLength(encoded.payload) + Buffer.byteLength(JSON.stringify(encoded.metadata));
      if (bytes > TEMPORAL_PAGE_TARGET_BYTES && selected.length > 1) {
        const middle = Math.ceil(selected.length / 2);
        flush(selected.slice(0, middle));
        flush(selected.slice(middle));
        return;
      }
      if (temporalCheckpointBytes(encoded, world.id) > CHECKPOINT_LIMITS.rowBytes)
        throw new Error('An indivisible received history record exceeds its admission limit.');
      result.push(encoded);
    };
    let pending: ReceivedBatch[] = [],
      estimated = 0;
    for (const batch of [...batches.values()].sort((a, b) => a.batchOrder - b.batchOrder)) {
      const bytes = receivedBatchStorageBytes(batch);
      if (pending.length && estimated + bytes > TEMPORAL_PAGE_TARGET_BYTES) {
        flush(pending);
        pending = [];
        estimated = 0;
      }
      pending.push(batch);
      estimated += bytes;
    }
    flush(pending);
  }
  return result;
}

export function receivedValueSql(world: string, reference: string): string {
  return `(CASE WHEN json_typeof(${reference})='string' THEN
    (SELECT p.payload::json->'value' FROM mind_perception_values p
      WHERE p.world_id=${world} AND p.source_id=(${reference}#>>'{}')) ELSE ${reference} END)`;
}

const payloadEncodings = new WeakMap<object, string>();
type EncodedBatch = Omit<ReceivedBatch, 'actorId' | 'physicalLife' | 'epoch'>;
type EncodedPage = Omit<
  TemporalPage,
  'batches' | 'subjects' | 'sourceIds' | 'individualIds' | 'sourceRefs'
> & {
  batches: EncodedBatch[];
};
export function serializeTemporalPage(value: unknown): string {
  const page = value as TemporalPage,
    existing = payloadEncodings.get(page);
  if (existing) return existing;
  const {
    subjects: _subjects,
    sourceIds: _sourceIds,
    individualIds: _individualIds,
    sourceRefs: _sourceRefs,
    batches: _batches,
    ...body
  } = page;
  const payload = JSON.stringify({
    ...body,
    batches: page.batches.map(({ actorId, physicalLife, epoch, ...batch }) => {
      if (actorId !== page.actorId || physicalLife !== page.physicalLife || epoch !== page.epoch)
        throw new Error('A temporal batch cannot inherit another owner.');
      return batch;
    }),
  });
  payloadEncodings.set(page, payload);
  return payload;
}
/** Pending source fences and SQL restoration use the same current-format
 * decoder. No caller may cast the compact saved body to a native page. */
export function decodeTemporalPagePayload(payload: string): TemporalPage {
  const stored = JSON.parse(payload) as EncodedPage;
  const { batches, ...page } = stored;
  if (!Array.isArray(batches)) throw new Error('Missing received batches.');
  const body = {
    ...page,
    subjects: [],
    sourceIds: [],
    individualIds: [],
    sourceRefs: [],
    batches: batches.map((batch) => {
      if (
        !batch ||
        Object.hasOwn(batch, 'actorId') ||
        Object.hasOwn(batch, 'physicalLife') ||
        Object.hasOwn(batch, 'epoch') ||
        !Array.isArray(batch.entries)
      )
        throw new Error('Invalid temporal batch encoding.');
      return {
        ...batch,
        actorId: page.actorId,
        physicalLife: page.physicalLife,
        epoch: page.epoch,
      };
    }),
  };
  return body;
}
const restoredProjections = new WeakMap<TemporalPage, Record<string, unknown>>();
export function decodeTemporalPageRow(row: Record<string, unknown>): TemporalPage {
  const body = decodeTemporalPagePayload(String(row['payload']));
  if (
    body.appendClosed !== true ||
    !Array.isArray(body.batches) ||
    !body.batches.length ||
    body.batches.some(
      (batch) =>
        batch.actorId !== body.actorId ||
        batch.physicalLife !== body.physicalLife ||
        batch.epoch !== body.epoch ||
        !Array.isArray(batch.entries) ||
        !batch.entries.length ||
        batch.entries.some(
          (entry) =>
            !entry.charge ||
            !Number.isSafeInteger(entry.charge.bytes) ||
            entry.charge.bytes < 0 ||
            !Number.isSafeInteger(entry.charge.count) ||
            entry.charge.count < 0,
        ),
    )
  )
    throw new Error('Invalid current temporal block.');
  const page: TemporalPage = {
    ...body,
    subjects: row['subject_keys'] as string[],
    sourceIds: row['source_ids'] as string[],
    individualIds: row['individual_ids'] as string[],
    sourceRefs: row['value_refs'] as string[],
  };
  restoredProjections.set(page, row);
  residentBytes.set(page, Number(row['encoded_bytes']));
  return page;
}
export function validateTemporalPageSources(page: TemporalPage, world: WorldState): void {
  const row = restoredProjections.get(page);
  if (!row) throw new Error('Missing restored temporal block projection.');
  const encoded = encodeTemporalPage(page, world);
  if (
    page.bytes !== encoded.metadata.entryBytes ||
    page.count !== encoded.metadata.count ||
    page.fromAt !== encoded.metadata.firstAt ||
    page.throughAt !== encoded.metadata.lastAt
  )
    throw new Error('Temporal block bounds or scalar charges disagree with its entries.');
  const projection = temporalPageColumns(encoded);
  for (const [column, expected] of Object.entries(projection)) {
    const actual = typeof expected === 'number' ? Number(row[column]) : row[column];
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error(`Temporal block ${column} projection disagrees with its payload.`);
  }
}
/** One owned column projection feeds saving, import integrity and the actual
 * checkpoint-row admission calculation. */
const columnProjections = new WeakMap<StoredTemporalPage, Record<string, unknown>>();
export function temporalPageColumns(encoded: StoredTemporalPage): Record<string, unknown> {
  const cached = columnProjections.get(encoded);
  if (cached) return cached;
  const columns = {
    actor_id: encoded.native.actorId,
    physical_life: encoded.native.physicalLife,
    receipt_epoch: encoded.native.epoch,
    first_batch_order: encoded.metadata.firstBatchOrder,
    first_entry: encoded.metadata.firstEntry,
    first_member: encoded.metadata.firstMember,
    last_batch_order: encoded.metadata.lastBatchOrder,
    last_entry: encoded.metadata.lastEntry,
    last_member: encoded.metadata.lastMember,
    first_at: encoded.metadata.firstAt,
    last_at: encoded.metadata.lastAt,
    entry_bytes: encoded.metadata.entryBytes,
    receipt_count: encoded.metadata.count,
    spatial_context: Number(encoded.metadata.spatialContext),
    subject_keys: encoded.metadata.subjects,
    track_keys: encoded.metadata.tracks,
    source_ids: encoded.metadata.sourceIds,
    individual_ids: encoded.metadata.individualIds,
    value_refs: encoded.metadata.references,
    occurrence_keys: encoded.metadata.occurrenceKeys,
    lookup_buckets: encoded.lookupBuckets,
    charge_directory: JSON.stringify(encoded.metadata.chargeDirectory),
    encoded_bytes: Buffer.byteLength(encoded.payload),
  };
  columnProjections.set(encoded, columns);
  return columns;
}
function temporalCheckpointBytes(encoded: StoredTemporalPage, worldId: string): number {
  const page = encoded.native;
  const row: Record<string, unknown> = {
    world_id: worldId,
    id: temporalPageRecordId(page.actorId, page.id),
    parent_id: JSON.stringify(['world', 'experience', 'temporal', 'actors', page.actorId]),
    slot: page.id,
    position: String(temporalPagePosition(page)),
    revision: String(Number.MAX_SAFE_INTEGER),
    payload: encoded.payload,
    ...temporalPageColumns(encoded),
  };
  // BIGINT values may be returned as strings by the SQL adapter. Their quoted
  // form is the larger current-format representation; the line also owns LF.
  for (const key of [
    'physical_life',
    'first_batch_order',
    'first_entry',
    'first_member',
    'last_batch_order',
    'last_entry',
    'last_member',
    'entry_bytes',
    'receipt_count',
    'encoded_bytes',
    'spatial_context',
  ])
    row[key] = String(row[key]);
  return Buffer.byteLength(JSON.stringify({ table: 'mind_temporal_pages', row })) + 1;
}
export function evidenceEncodedBytesSql(alias: string): string {
  return `octet_length(${alias}.payload)`;
}

/** Direct receipt membership needs one bounded predecessor seek, not a saved
 * key per checked facet. Rejection stays outside LIMIT so holes never scan old history. */
export async function findTemporalReceiptPages(
  db: SqlDatabase,
  worldId: string,
  actorId: string,
  addresses: readonly ReceivedAddress[],
  maximumBytes = 4 * 1024 * 1024,
): Promise<{ rows: Record<string, unknown>[]; incomplete: boolean }> {
  if (!addresses.length) return { rows: [], incomplete: false };
  if (
    !Number.isSafeInteger(maximumBytes) ||
    maximumBytes < 1 ||
    maximumBytes > 4 * 1024 * 1024 ||
    addresses.length > 8192 ||
    addresses.some((address) => address.actorId !== actorId)
  )
    throw new Error('Invalid direct received history scope.');
  const candidates = await db
    .prepare(
      `WITH wanted AS MATERIALIZED (
      SELECT * FROM jsonb_to_recordset(?::jsonb) q("physicalLife" bigint,epoch text,"batchOrder" bigint,"entryIndex" bigint,"memberIndex" bigint)
    ), candidates AS (
      SELECT p.* FROM wanted q CROSS JOIN LATERAL (
        SELECT id,physical_life,receipt_epoch,first_batch_order,first_entry,first_member,
          last_batch_order,last_entry,last_member,encoded_bytes
        FROM mind_temporal_pages WHERE world_id=? AND actor_id=?
          AND (first_batch_order,first_entry,first_member)<=(q."batchOrder",q."entryIndex",q."memberIndex")
        ORDER BY first_batch_order DESC,first_entry DESC,first_member DESC,id DESC LIMIT 1
      ) p WHERE p.physical_life=q."physicalLife" AND p.receipt_epoch=q.epoch
        AND (p.last_batch_order,p.last_entry,p.last_member)>=(q."batchOrder",q."entryIndex",q."memberIndex")
    ) SELECT DISTINCT id,encoded_bytes FROM candidates ORDER BY id`,
    )
    .all(JSON.stringify(addresses), worldId, actorId);
  const ids: string[] = [];
  let bytes = 0,
    incomplete = false;
  for (const row of candidates) {
    bytes += Number(row['encoded_bytes']);
    if (bytes > maximumBytes) {
      incomplete = true;
      break;
    }
    ids.push(String(row['id']));
  }
  return {
    rows: ids.length
      ? await db
          .prepare(
            'SELECT * FROM mind_temporal_pages WHERE world_id=? AND actor_id=? AND id=ANY(?::text[])',
          )
          .all(worldId, actorId, ids)
      : [],
    incomplete,
  };
}

const residencyPredecessors = new WeakMap<object, TemporalPage>();
export function noteTemporalResidency(page: TemporalPage, previous: TemporalPage): void {
  residencyPredecessors.set(page.batches, previous);
}
function residencyDescendsFrom(page: TemporalPage, previous: TemporalPage): boolean {
  if (
    page.actorId !== previous.actorId ||
    page.physicalLife !== previous.physicalLife ||
    page.epoch !== previous.epoch ||
    page.id !== previous.id
  )
    return false;
  let at: TemporalPage | undefined = page;
  for (let depth = 0; at && depth < 8; depth++) {
    if (at === previous || at.batches === previous.batches) return true;
    if (depth > 0 && appendedRecordCount(previous.batches, at.batches) !== undefined) return true;
    at =
      residencyPredecessors.get(at.batches) ??
      residencyPredecessors.get(recordAppendBase(at.batches) ?? at.batches);
  }
  return false;
}
export function temporalPagePosition(page: TemporalPage): number {
  const first = page.batches[0];
  if (!first) throw new Error('Empty history block has no physical position.');
  return first.batchOrder;
}
export function temporalPageValueReferences(page: TemporalPage): string[] {
  return [...temporalPageReferences(page)].sort();
}

/** Residency is bounded by actual encoded body bytes, not the smaller logical
 * memory allowance. Native unsaved buffers are protected by save admission. */
export function temporalPageResidentBytes(page: TemporalPage): number {
  const cached = residentBytes.get(page);
  if (cached !== undefined) return cached;
  const bytes = page.appendClosed ? Buffer.byteLength(serializeTemporalPage(page)) : page.bytes;
  residentBytes.set(page, bytes);
  return bytes;
}
export function compareTemporalPageOrder(a: TemporalPage, b: TemporalPage): number {
  const first = (page: TemporalPage) => {
    const batch = page.batches[0],
      entry = batch?.entries[0];
    return {
      batch: batch?.batchOrder ?? page.order,
      entry: entry?.entryIndex ?? 0,
      member: 0,
    };
  };
  const left = first(a),
    right = first(b);
  return (
    left.batch - right.batch ||
    left.entry - right.entry ||
    left.member - right.member ||
    a.id.localeCompare(b.id)
  );
}
