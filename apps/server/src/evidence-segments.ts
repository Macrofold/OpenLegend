import {
  appendedRecordCount,
  temporalReceiptChangeCount,
  temporalEntryMetadataReader,
  type TemporalEntryMetadata,
  temporalConfirmationChangeCount,
  type TemporalFrameEntry,
  type TemporalFrameOwner,
  canonicalJson,
  isImmutableData,
  immutableDataSnapshot,
  type TemporalChunk,
  type WorldState,
} from '@open-legend/domain';
import { countMetric } from './performance.js';

/** Physical append pages belong to the existing record codec, not to character history.
 * A save seals its suffix; later appends never rewrite an earlier page. */
export interface EvidenceSegment {
  start: number;
  end: number;
  values: unknown[];
  bytes: number;
  index?: ReceiptSegmentIndex;
}
export interface ReceiptSegmentIndex
  extends Omit<TemporalEntryMetadata, 'firstAt' | 'lastAt' | 'changes'> {
  lookupBuckets: number[];
}
type Owner = Record<string, unknown>;
// Pure immutable memoization only. Read validation never determines write layout.
const encoded = new WeakMap<object, Owner>();
const decodedSegments = new WeakMap<object, readonly EvidenceSegment[]>();
const ordinal = (value: unknown) => Number((value as Owner)['ordinal']);

const receiptHeaders = ['subjects', 'sourceIds', 'individualIds', 'sourceRefs'] as const;
const unique = <T>(values: Iterable<T>): T[] => [...new Set(values)];
type ReceiptLookup = (typeof receiptHeaders)[number];
/** A GIN dictionary retains empty keys. Bound its vocabulary, then always recheck
 * exact arrays: this hash is a candidate filter, never identity or authorization.
 * docs/projects/attention-and-scenes-runtime-design.md#61-segmented-physical-layout */
export function receiptLookupBucket(kind: ReceiptLookup, value: string): number {
  let hash = 2166136261;
  for (const text of [kind, '\0', value])
    for (let index = 0; index < text.length; index++)
      hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return hash & 16383;
}
export function receiptLookupBuckets(kind: ReceiptLookup, values: readonly string[]): number[] {
  return unique(values.map((value) => receiptLookupBucket(kind, value))).sort((a, b) => a - b);
}
function pageLookupBuckets(index: Pick<ReceiptSegmentIndex, ReceiptLookup>): number[] {
  return unique(
    receiptHeaders.flatMap((kind) => index[kind].map((value) => receiptLookupBucket(kind, value))),
  ).sort((a, b) => a - b);
}
function withLookupBuckets(index: TemporalEntryMetadata): ReceiptSegmentIndex {
  const { firstAt: _firstAt, lastAt: _lastAt, changes: _changes, ...stored } = index;
  return { ...stored, lookupBuckets: pageLookupBuckets(stored) };
}
/** Current-format restore has the complete selected source closure. Validate page
 * provenance there, not by trusting a correct parent union with misassigned pages. */
export function validateReceiptPageSources(chunk: TemporalChunk, world: WorldState): void {
  const segments = decodedSegments.get(chunk.entries);
  if (!segments) throw new Error('Missing restored receipt page ownership.');
  const metadata = temporalEntryMetadataReader(chunk, {
    sources: world.receivedValues?.sources ?? {},
    world,
  });
  for (const segment of segments)
    if (
      canonicalJson(segment.index) !==
      canonicalJson(
        withLookupBuckets(metadata(segment.values.filter(Boolean) as TemporalFrameEntry[])),
      )
    )
      throw new Error('Receipt page provenance disagrees with its received source support.');
}
function pageHeaders(segments: readonly EvidenceSegment[]) {
  return Object.fromEntries(
    receiptHeaders.map((key) => [key, unique(segments.flatMap((segment) => segment.index![key]))]),
  );
}
function receiptBounds(segments: readonly EvidenceSegment[]) {
  const indices = segments
    .map((segment) => segment.index!)
    .filter((index) => index.ordinals.length);
  const supported = segments
    .map((segment) => segment.index!)
    .filter((index) => index.ordinals.length || index.confirmations);
  return {
    firstOrder: indices[0]?.firstOrder,
    lastOrder: indices.at(-1)?.lastOrder,
    firstMeasured: Math.min(...supported.map((index) => index.firstMeasured)),
    lastSupported: Math.max(...supported.map((index) => index.lastSupported)),
    spatialContext: segments.some((segment) => segment.index!.spatialContext),
  };
}
function sealSegment(segment: EvidenceSegment): void {
  if (segment.index) segment.index = immutableDataSnapshot(segment.index);
  for (let pass = 0; pass < 4; pass++) {
    const size = Buffer.byteLength(JSON.stringify(segment));
    if (segment.bytes === size) break;
    segment.bytes = size;
  }
  Object.freeze(segment.values);
  Object.freeze(segment);
}

/** Pure encoding of producer-owned whole operations. A completed acquisition closes an
 * immutable suffix batch; a later append cannot change an earlier boundary.
 * docs/projects/bookkeeping-simplification-tech-design.md#33-personal-frames-and-chunks */
export function encodeEvidenceOwner(value: unknown, previous: unknown, world?: WorldState): Owner {
  const owner = value as Owner,
    reusable = isImmutableData(owner);
  const cached = reusable ? encoded.get(owner) : undefined;
  if (cached) return cached;
  if (!world) throw new Error('Receipt batch preparation requires its world.');
  const values = owner['entries'] as TemporalFrameEntry[];
  const prior = previous ? encoded.get(previous as object) : undefined;
  const priorBatches = (prior?.['entries'] ?? []) as EvidenceSegment[];
  const appended =
    prior && appendedRecordCount((previous as Owner)['entries'] as TemporalFrameEntry[], values);
  let start = appended === undefined ? 0 : values.length - appended;
  // An append proof certifies content, not a closed acquisition. A caller that
  // extends an earlier frame must take the complete encoding/correction path.
  const oldEnd = priorBatches.at(-1)?.end ?? 0;
  for (let index = start; start && index < values.length; index++) {
    const entry = values[index]!;
    if ('frame' in entry && entry.frame < oldEnd) start = 0;
  }
  const prefix = start ? priorBatches : [];
  const priorSegments = new Map((start ? [] : priorBatches).map((batch) => [batch.start, batch]));
  // The native append owner already proves every old entry is unchanged. Do not
  // walk or copy that prefix just to discover the same physical batches again.
  countMetric('persistence.receiptBatchEntriesEncoded', values.length - start);
  countMetric('persistence.receiptBatchPrefixEntriesReused', start);
  const lastInFrame = new Map<number, number>();
  for (let index = start; index < values.length; index++) {
    const entry = values[index]!;
    if (entry.kind === 'change') lastInFrame.set(entry.frame, entry.ordinal);
  }
  const metadata = temporalEntryMetadataReader(owner as unknown as TemporalFrameOwner, {
    sources: world.receivedValues?.sources ?? {},
    world,
  });
  const segments: EvidenceSegment[] = [...prefix];
  let page: EvidenceSegment | undefined,
    end = prefix.at(-1)?.end ?? values[0]?.ordinal ?? 0;
  const seal = () => {
    if (!page) return;
    const previous = priorSegments.get(page.start);
    if (
      previous &&
      previous.end === page.end &&
      previous.values.every((entry, at) => entry === page!.values[at])
    )
      segments.push(previous);
    else {
      page.index = withLookupBuckets(metadata(page.values.filter(Boolean) as TemporalFrameEntry[]));
      sealSegment(page);
      segments.push(page);
    }
    end = page.end;
    page = undefined;
  };
  for (let index = start; index < values.length; index++) {
    const entry = values[index]!;
    page ??= { start: end, end, values: [], bytes: 0 };
    while (page.end < entry.ordinal) {
      page.values.push(null);
      page.end++;
    }
    page.values.push(entry);
    page.end = entry.ordinal + 1;
    if (entry.kind === 'change' && lastInFrame.get(entry.frame) === entry.ordinal) seal();
  }
  seal();
  const headers = pageHeaders(segments);
  if (receiptHeaders.some((key) => canonicalJson(headers[key]) !== canonicalJson(owner[key])))
    throw new Error('Receipt batch indexes disagree with their logical owner.');
  const physical = { ...owner };
  for (const key of receiptHeaders) delete physical[key];
  const result = {
    ...physical,
    entries: Object.freeze(segments),
    storage: {
      start: segments[0]?.start ?? 0,
      end: segments.at(-1)?.end ?? 0,
      segmentBytes: segments.reduce((sum, batch) => sum + batch.bytes, 0),
      metadataBytes: Buffer.byteLength(
        JSON.stringify(
          segments.map(({ values, ...batch }) => ({ ...batch, length: values.length })),
        ),
      ),
      index: receiptBounds(segments),
    },
  };
  if (reusable) encoded.set(owner, result);
  return result;
}

export function decodeEvidenceOwner(value: unknown): Owner {
  const owner = value as Owner;
  const storage = owner['storage'] as {
    start: number;
    end: number;
    index?: ReturnType<typeof receiptBounds>;
    segmentBytes: number;
    metadataBytes: number;
  };
  const segments = owner['entries'] as EvidenceSegment[];
  if (
    !storage ||
    !Array.isArray(segments) ||
    !Number.isSafeInteger(storage.start) ||
    storage.start < 0 ||
    !Number.isSafeInteger(storage.end) ||
    storage.end < storage.start ||
    !Number.isSafeInteger(storage.segmentBytes) ||
    storage.segmentBytes < 0
  )
    throw new Error('Missing or invalid evidence segment layout.');
  let next = storage.start;
  const values: unknown[] = [];
  for (const segment of segments) {
    if (
      !Number.isSafeInteger(segment.bytes) ||
      segment.bytes !== Buffer.byteLength(JSON.stringify(segment)) ||
      !Number.isSafeInteger(segment.start) ||
      segment.start !== next ||
      !Number.isSafeInteger(segment.end) ||
      segment.end <= segment.start ||
      !Array.isArray(segment.values) ||
      segment.values.length !== segment.end - segment.start
    )
      throw new Error('Incomplete evidence segment coverage.');
    for (let index = 0; index < segment.values.length; index++) {
      const entry = segment.values[index];
      if (entry === null) continue;
      if (!entry || ordinal(entry) !== segment.start + index)
        throw new Error('Evidence receipt ordinal disagrees with its segment.');
      values.push(entry);
    }
    next = segment.end;
  }
  const frameOwner: TemporalFrameOwner = {
    id: String(owner['id']),
    actorId: String(owner['actorId']),
    physicalLife: Number(owner['physicalLife']),
    epoch: String(owner['epoch']),
    entries: values as TemporalFrameEntry[],
  };
  const metadata = temporalEntryMetadataReader(frameOwner);
  for (const segment of segments) {
    const index = segment.index;
    if (
      !index ||
      ([...receiptHeaders, 'occurrenceSourceIds', 'occurrenceIndividualIds'] as const).some(
        (key) =>
          !Array.isArray(index[key]) ||
          index[key].some((value) => typeof value !== 'string') ||
          new Set(index[key]).size !== index[key].length,
      )
    )
      throw new Error('Invalid receipt page index.');
    const {
      occurrenceSourceIds: _occurrenceSourceIds,
      occurrenceIndividualIds: _occurrenceIndividualIds,
      sourceIds: _sourceIds,
      individualIds: _individualIds,
      lookupBuckets,
      spatialContext,
      ...stored
    } = index;
    const {
      firstAt: _firstAt,
      lastAt: _lastAt,
      changes: _changes,
      occurrenceSourceIds: _expectedOccurrenceSourceIds,
      occurrenceIndividualIds: _expectedOccurrenceIndividualIds,
      sourceIds: _expectedSourceIds,
      individualIds: _expectedIndividualIds,
      spatialContext: receiptSpatialContext,
      ...expected
    } = metadata(segment.values.filter(Boolean) as TemporalFrameEntry[]);
    if (
      canonicalJson(lookupBuckets) !== canonicalJson(pageLookupBuckets(index)) ||
      typeof spatialContext !== 'boolean' ||
      (receiptSpatialContext && !spatialContext) ||
      canonicalJson(stored) !== canonicalJson(expected)
    )
      throw new Error('Receipt page index disagrees with its receipts.');
  }
  if (
    next !== storage.end ||
    storage.segmentBytes !== segments.reduce((sum, segment) => sum + segment.bytes, 0) ||
    storage.metadataBytes !==
      Buffer.byteLength(
        JSON.stringify(
          segments.map(({ values, ...segment }) => ({ ...segment, length: values.length })),
        ),
      )
  )
    throw new Error('Evidence segment range disagrees with its owner.');
  if (
    frameOwner.entries.reduce(
      (sum, entry) => sum + (entry.kind === 'change' ? temporalReceiptChangeCount(entry) : 0),
      0,
    ) +
      temporalConfirmationChangeCount(frameOwner.entries) !==
      owner['count'] ||
    canonicalJson(receiptBounds(segments)) !== canonicalJson(storage.index)
  )
    throw new Error('Evidence segment index disagrees with its receipts.');
  for (const segment of segments) {
    if (segment.index && !Object.isFrozen(segment))
      segment.index = immutableDataSnapshot(segment.index);
    Object.freeze(segment.values);
    Object.freeze(segment);
  }
  Object.freeze(segments);
  decodedSegments.set(values, segments);
  const { storage: _storage, ...result } = owner;
  Object.assign(result, pageHeaders(segments));
  result['entries'] = values;
  return result;
}

/** The scoped SQL view returns logical payload plus layout only to installing readers. */
export function restoreEvidenceLayout(value: Owner, segments: unknown): Owner {
  if (!Array.isArray(segments)) throw new Error('Missing stored evidence segments.');
  const values = value['entries'] as unknown[];
  const receipts = new Map(values.map((entry) => [ordinal(entry), entry]));
  const pages = segments.map((stored) => {
    const { length, ...segment } = stored as EvidenceSegment & { length: number };
    if (
      !Number.isSafeInteger(segment.start) ||
      !Number.isSafeInteger(segment.end) ||
      segment.start < 0 ||
      segment.end <= segment.start ||
      !Number.isSafeInteger(length) ||
      length !== segment.end - segment.start
    )
      throw new Error(
        `Invalid evidence segment length (${JSON.stringify({ start: segment.start, end: segment.end, length })}).`,
      );
    return {
      ...segment,
      values: Array.from(
        { length: segment.end - segment.start },
        (_, index) => receipts.get(segment.start + index) ?? null,
      ),
    };
  });
  return decodeEvidenceOwner({ ...value, entries: pages });
}

/** Reserve resident physical bytes without preparing or changing its page layout. */

export function evidenceEncodedBytesSql(alias: string): string {
  return `octet_length(${alias}.payload)+(${alias}.payload::jsonb#>>'{storage,segmentBytes}')::bigint+(${alias}.payload::jsonb#>>'{storage,metadataBytes}')::bigint`;
}

/** Read a single immutable value only after selecting its permitted owner. */
export function receivedValueSql(world: string, reference: string): string {
  return `(CASE WHEN json_typeof(${reference})='string' THEN
    (SELECT p.payload::json->'value' FROM mind_perception_values p
      WHERE p.world_id=${world} AND p.source_id=(${reference}#>>'{}')) ELSE ${reference} END)`;
}

export function evidenceReadView(table: string, columns: string[]): string {
  const children = 'mind_temporal_segments';
  // JSON preserves encoded fragment member order. JSONB would reorder nested
  // values and defeat the existing exact-encoding sharing index after active load.
  const union = (column: string) => `ARRAY(SELECT item FROM (
    SELECT DISTINCT ON (v.item) v.item,s.position,v.ordinality FROM ${children} s
    CROSS JOIN LATERAL unnest(s.${column}) WITH ORDINALITY v(item,ordinality)
    WHERE s.world_id=p.world_id AND s.parent_id=p.id ORDER BY v.item,s.position,v.ordinality
    ) selected ORDER BY position,ordinality)`;
  const projected = {
    subjects: union('subjects'),
    source_refs: union('source_refs'),
    source_ids: union('source_ids'),
    individual_ids: union('individual_ids'),
    receipt_ordinals: `ARRAY(SELECT ordinal FROM ${children} s CROSS JOIN LATERAL unnest(s.receipt_ordinals) ordinal WHERE s.world_id=p.world_id AND s.parent_id=p.id ORDER BY ordinal)`,
    value_refs: `ARRAY(SELECT DISTINCT v.id FROM ${children} s CROSS JOIN LATERAL unnest(s.value_refs) v(id) WHERE s.world_id=p.world_id AND s.parent_id=p.id ORDER BY v.id)`,
  };
  const nativeHeaders = ` UNION ALL SELECT key,to_json(value) FROM (VALUES ${receiptHeaders
    .map((key) => {
      const column = (
        {
          subjects: 'subjects',
          sourceIds: 'source_ids',
          individualIds: 'individual_ids',
          sourceRefs: 'source_refs',
        } as const
      )[key];
      return `('${key}',${projected[column]})`;
    })
    .join(',')}) headers(key,value)`;
  return `CREATE OR REPLACE VIEW ${table}_read AS SELECT
    p.world_id,p.id,p.parent_id,p.slot,p.position,p.revision,
    ${evidenceEncodedBytesSql('p')} AS encoded_bytes,
    (SELECT json_object_agg(e.key,CASE WHEN e.key='entries' THEN
      COALESCE((SELECT json_agg(v.value ORDER BY s.position,v.ordinality)
        FROM ${children} s CROSS JOIN LATERAL json_array_elements(s.payload::json->'values') WITH ORDINALITY v(value,ordinality)
        WHERE s.world_id=p.world_id AND s.parent_id=p.id AND v.value::text<>'null'), '[]'::json)
      ELSE e.value END)::text FROM (SELECT * FROM json_each(p.payload::json) ${nativeHeaders}) e) AS payload,
    (SELECT COALESCE(jsonb_agg(((s.payload::jsonb-'values') || jsonb_build_object('length',jsonb_array_length(s.payload::jsonb->'values'))) ORDER BY s.position),'[]'::jsonb) FROM ${children} s
      WHERE s.world_id=p.world_id AND s.parent_id=p.id) AS segments${columns.length ? ',' + columns.map((column) => `p.${column}`).join(',') : ''}${Object.entries(
        projected,
      )
        .map(([column, sql]) => `,${sql} AS ${column}`)
        .join('')}
    FROM ${table} p WHERE p.retired_revision IS NULL`;
}
