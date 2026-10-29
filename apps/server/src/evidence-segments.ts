import {
  appendedRecordCount,
  appendSnapshot,
  canonicalJson,
  isImmutableData,
  immutableDataSnapshot,
  jsonText,
  temporalReceiptAliases,
  temporalReceiptIndividualIds,
  type TemporalChunk,
  type WorldState,
} from '@open-legend/domain';

/** Physical append pages belong to the existing record codec, not to character history.
 * A save seals its suffix; later appends never rewrite an earlier page. */
export interface EvidenceSegment {
  start: number;
  end: number;
  values: unknown[];
  bytes: number;
  index?: ReceiptSegmentIndex;
}
export interface ReceiptSegmentIndex extends ReturnType<typeof receiptStorageIndex> {
  subjects: string[];
  sourceIds: string[];
  individualIds: string[];
  sourceRefs: string[];
  lookupBuckets: number[];
}
interface Layout {
  segments: EvidenceSegment[];
  start: number;
  end: number;
}
type Owner = Record<string, unknown>;
type Field = 'receipts' | 'values';
const layouts = new WeakMap<object, Layout>();
const encoded = new WeakMap<object, Owner>();
const ordinal = (field: Field, value: unknown, index: number) =>
  field === 'receipts' ? Number((value as Owner)['ordinal']) : index;

/** Cold edit preparation retains only a selected immutable predecessor. Keep its
 * verified physical pages attached to the copied logical vector so a later edit
 * compares the actual stored pages instead of inventing new page boundaries. */
export function snapshotEvidenceOwner<T extends object>(value: T, field: Field): T {
  const snapshot = immutableDataSnapshot(value);
  if (snapshot === value) return snapshot;
  const held = layouts.get((value as Owner)[field] as object);
  if (!held) return snapshot;
  const values = (snapshot as Owner)[field] as unknown[];
  const receipts =
    field === 'receipts'
      ? new Map(values.map((entry, index) => [ordinal(field, entry, index), entry]))
      : undefined;
  const segments = held.segments.map((segment) =>
    immutableDataSnapshot({
      ...segment,
      values: Array.from({ length: segment.end - segment.start }, (_, index) =>
        receipts ? (receipts.get(segment.start + index) ?? null) : values[segment.start + index],
      ),
    }),
  );
  layouts.set(values, {
    ...held,
    segments: Object.freeze(segments) as unknown as EvidenceSegment[],
  });
  return snapshot;
}

export function receiptStorageIndex(receipts: TemporalChunk['receipts']) {
  const references: Record<string, number[]> = {};
  let firstMeasured = Infinity,
    lastSupported = -Infinity;
  for (const receipt of receipts)
    for (const facet of receipt.facets) {
      firstMeasured = Math.min(firstMeasured, facet.measuredFrom);
      lastSupported = Math.max(lastSupported, facet.confirmedThrough ?? facet.measuredThrough);
      const values = (references[facet.blockId] ??= []);
      if (!values.includes(facet.valueOrdinal)) values.push(facet.valueOrdinal);
    }
  for (const values of Object.values(references)) values.sort((a, b) => a - b);
  return {
    firstOrder: receipts[0]?.order,
    lastOrder: receipts.at(-1)?.order,
    firstMeasured,
    lastSupported,
    ordinals: receipts.map((receipt) => receipt.ordinal),
    references,
  };
}

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
function segmentIndex(receipts: TemporalChunk['receipts'], world: WorldState): ReceiptSegmentIndex {
  const sources = world.receivedValues?.sources ?? {};
  // The same semantic visitors own native and stored provenance. Partial source
  // closure cannot silently produce a narrower correction/reclamation index.
  for (const receipt of receipts)
    for (const facet of receipt.facets)
      if (!sources[facet.blockId]?.values[facet.valueOrdinal])
        throw new Error('Receipt page index requires complete received source support.');
  const index = {
    ...receiptStorageIndex(receipts),
    subjects: unique(
      receipts.flatMap((receipt) => [receipt.subject, ...(receipt.contextSubjects ?? [])]),
    ),
    sourceIds: unique(
      receipts.flatMap((receipt) => temporalReceiptAliases(receipt, sources, world)),
    ),
    individualIds: unique(
      receipts.flatMap((receipt) => temporalReceiptIndividualIds(receipt, sources)),
    ),
    sourceRefs: unique(receipts.flatMap((receipt) => receipt.facets.map((facet) => facet.blockId))),
  };
  return { ...index, lookupBuckets: pageLookupBuckets(index) };
}
/** Current-format restore has the complete selected source closure. Validate page
 * provenance there, not by trusting a correct parent union with misassigned pages. */
export function validateReceiptPageSources(chunk: TemporalChunk, world: WorldState): void {
  const layout = layouts.get(chunk.receipts);
  if (!layout) throw new Error('Missing restored receipt page ownership.');
  for (const segment of layout.segments)
    if (
      canonicalJson(segment.index) !==
      canonicalJson(
        segmentIndex(segment.values.filter(Boolean) as TemporalChunk['receipts'], world),
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
  return {
    firstOrder: indices[0]?.firstOrder,
    lastOrder: indices.at(-1)?.lastOrder,
    firstMeasured: Math.min(...indices.map((index) => index.firstMeasured)),
    lastSupported: Math.max(...indices.map((index) => index.lastSupported)),
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

export function encodeEvidenceOwner(
  value: unknown,
  field: Field,
  previous: unknown,
  maxBytes: number,
  world?: WorldState,
): Owner {
  const owner = value as Owner;
  const reusable = isImmutableData(owner);
  const cached = reusable ? encoded.get(owner) : undefined;
  if (cached) return cached;
  const values = owner[field] as unknown[];
  let layout = isImmutableData(values) ? layouts.get(values) : undefined;
  if (!layout) {
    const prior = previous as Owner | undefined;
    const old = prior?.[field] as unknown[] | undefined;
    const heldLayout = old && isImmutableData(old) ? layouts.get(old) : undefined;
    const previousLayout =
      heldLayout &&
      (field === 'values'
        ? values.length >= heldLayout.end
        : !values.length || ordinal(field, values[0], 0) >= heldLayout.start)
        ? heldLayout
        : undefined;
    const appended = old && appendedRecordCount(old, values);
    const segments: EvidenceSegment[] = [];
    let start = 0;
    if (previousLayout && appended !== undefined) {
      segments.push(...previousLayout.segments);
      start = old!.length;
    } else if (previousLayout) {
      // A correction/prune edits only pages intersecting the changed ordinals.
      const current = new Map(values.map((entry, index) => [ordinal(field, entry, index), entry]));
      for (const segment of previousLayout.segments) {
        const next = segment.values.map(
          (entry, index) => current.get(segment.start + index) ?? null,
        );
        const same = next.every((entry, index) => entry === segment.values[index]);
        segments.push(same ? segment : { ...segment, values: next });
      }
      start = values.findIndex(
        (entry, index) => ordinal(field, entry, index) >= previousLayout.end,
      );
      if (start < 0) start = values.length;
    }
    let page: EvidenceSegment | undefined;
    let bytes = 0;
    for (let index = start; index < values.length; index++) {
      const entry = values[index],
        at = ordinal(field, entry, index);
      const size = Buffer.byteLength(
        entry && typeof entry === 'object' ? jsonText(entry) : JSON.stringify(entry),
      );
      if (!page || (page.values.length && bytes + size > maxBytes)) {
        const first = page?.end ?? previousLayout?.end ?? at;
        page = { start: first, end: first, values: [], bytes: 0 };
        segments.push(page);
        bytes = 0;
      }
      while (page.end < at) {
        page.values.push(null);
        page.end++;
      }
      page.values.push(entry);
      page.end = at + 1;
      bytes += size + 1;
    }
    for (const segment of segments) {
      if (!Object.isFrozen(segment)) {
        if (field === 'receipts') {
          if (!world) throw new Error('Receipt page preparation requires its world.');
          segment.index = segmentIndex(
            segment.values.filter(Boolean) as TemporalChunk['receipts'],
            world,
          );
        }
        sealSegment(segment);
      }
    }
    const sealed =
      previousLayout && appended !== undefined
        ? appendSnapshot(previousLayout.segments, segments.slice(previousLayout.segments.length))!
        : (Object.freeze(segments) as unknown as EvidenceSegment[]);
    layout = { segments: sealed, start: segments[0]?.start ?? 0, end: segments.at(-1)?.end ?? 0 };
    if (isImmutableData(values)) layouts.set(values, layout);
  }
  if (field === 'receipts') {
    const headers = pageHeaders(layout.segments);
    if (receiptHeaders.some((key) => canonicalJson(headers[key]) !== canonicalJson(owner[key])))
      throw new Error('Receipt page indexes disagree with their logical owner.');
  }
  const physical = { ...owner };
  if (field === 'receipts') for (const key of receiptHeaders) delete physical[key];
  const result = {
    ...physical,
    [field]: layout.segments,
    storage: {
      start: layout.start,
      end: layout.end,
      segmentBytes: layout.segments.reduce((sum, segment) => sum + segment.bytes, 0),
      metadataBytes: Buffer.byteLength(
        JSON.stringify(
          layout.segments.map(({ values, ...segment }) => ({ ...segment, length: values.length })),
        ),
      ),
      ...(field === 'receipts' ? { index: receiptBounds(layout.segments) } : {}),
    },
  };
  if (reusable) encoded.set(owner, result);
  return result;
}

export function decodeEvidenceOwner(value: unknown, field: Field): Owner {
  const owner = value as Owner;
  const storage = owner['storage'] as {
    start: number;
    end: number;
    index?: ReturnType<typeof receiptStorageIndex>;
    segmentBytes: number;
    metadataBytes: number;
  };
  const segments = owner[field] as EvidenceSegment[];
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
      if (field === 'receipts') {
        if (entry === null) continue;
        if (!entry || ordinal(field, entry, index) !== segment.start + index)
          throw new Error('Evidence receipt ordinal disagrees with its segment.');
      }
      values.push(entry);
    }
    if (field === 'receipts') {
      const index = segment.index;
      if (
        !index ||
        receiptHeaders.some(
          (key) =>
            !Array.isArray(index[key]) ||
            index[key].some((value) => typeof value !== 'string') ||
            new Set(index[key]).size !== index[key].length,
        )
      )
        throw new Error('Invalid receipt page index.');
      const { subjects, sourceIds, individualIds, sourceRefs, lookupBuckets, ...stored } = index;
      const receipts = segment.values.filter(Boolean) as TemporalChunk['receipts'];
      if (
        canonicalJson(lookupBuckets) !== canonicalJson(pageLookupBuckets(index)) ||
        canonicalJson(stored) !== canonicalJson(receiptStorageIndex(receipts)) ||
        canonicalJson(subjects) !==
          canonicalJson(
            unique(
              receipts.flatMap((receipt) => [receipt.subject, ...(receipt.contextSubjects ?? [])]),
            ),
          ) ||
        canonicalJson(sourceRefs) !==
          canonicalJson(
            unique(receipts.flatMap((receipt) => receipt.facets.map((facet) => facet.blockId))),
          )
      )
        throw new Error('Receipt page index disagrees with its receipts.');
    }
    next = segment.end;
  }
  if (
    next !== storage.end ||
    storage.segmentBytes !== segments.reduce((sum, segment) => sum + segment.bytes, 0) ||
    storage.metadataBytes !==
      Buffer.byteLength(
        JSON.stringify(
          segments.map(({ values, ...segment }) => ({ ...segment, length: values.length })),
        ),
      ) ||
    (field === 'values' && storage.start !== 0)
  )
    throw new Error('Evidence segment range disagrees with its owner.');
  if (
    field === 'receipts' &&
    (values.length !== owner['count'] ||
      canonicalJson(receiptBounds(segments)) !== canonicalJson(storage.index))
  )
    throw new Error('Evidence segment index disagrees with its receipts.');
  for (const segment of segments) {
    if (segment.index && !Object.isFrozen(segment))
      segment.index = immutableDataSnapshot(segment.index);
    Object.freeze(segment.values);
    Object.freeze(segment);
  }
  Object.freeze(segments);
  layouts.set(values, { segments, start: storage.start, end: storage.end });
  const { storage: _storage, ...result } = owner;
  if (field === 'receipts') Object.assign(result, pageHeaders(segments));
  result[field] = values;
  return result;
}

/** The scoped SQL view returns logical payload plus layout only to installing readers. */
export function restoreEvidenceLayout(value: Owner, field: Field, segments: unknown): Owner {
  if (!Array.isArray(segments)) throw new Error('Missing stored evidence segments.');
  const values = value[field] as unknown[];
  const receipts =
    field === 'receipts'
      ? new Map(values.map((entry, index) => [ordinal(field, entry, index), entry]))
      : undefined;
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
      throw new Error('Invalid evidence segment length.');
    return {
      ...segment,
      values: receipts
        ? Array.from(
            { length: segment.end - segment.start },
            (_, index) => receipts.get(segment.start + index) ?? null,
          )
        : values.slice(segment.start, segment.end),
    };
  });
  return decodeEvidenceOwner({ ...value, [field]: pages }, field);
}

export function evidenceReadView(table: string, field: Field, columns: string[]): string {
  const children = field === 'receipts' ? 'mind_temporal_segments' : 'mind_perception_segments';
  // JSON preserves encoded fragment member order. JSONB would reorder nested
  // values and defeat the existing exact-encoding sharing index after active load.
  const union = (column: string) => `ARRAY(SELECT item FROM (
    SELECT DISTINCT ON (v.item) v.item,s.position,v.ordinality FROM ${children} s
    CROSS JOIN LATERAL unnest(s.${column}) WITH ORDINALITY v(item,ordinality)
    WHERE s.world_id=p.world_id AND s.parent_id=p.id ORDER BY v.item,s.position,v.ordinality
    ) selected ORDER BY position,ordinality)`;
  const projected =
    field === 'receipts'
      ? {
          subjects: union('subjects'),
          source_refs: union('source_refs'),
          source_ids: union('source_ids'),
          individual_ids: union('individual_ids'),
          receipt_ordinals: `ARRAY(SELECT ordinal FROM ${children} s CROSS JOIN LATERAL unnest(s.receipt_ordinals) ordinal WHERE s.world_id=p.world_id AND s.parent_id=p.id ORDER BY ordinal)`,
          value_refs: `(SELECT COALESCE(jsonb_object_agg(block,ordinals),'{}'::jsonb) FROM (
      SELECT refs.key AS block,jsonb_agg(DISTINCT ordinal ORDER BY ordinal) AS ordinals FROM ${children} s
      CROSS JOIN LATERAL jsonb_each(s.value_refs) refs CROSS JOIN LATERAL jsonb_array_elements(refs.value) ordinal
      WHERE s.world_id=p.world_id AND s.parent_id=p.id GROUP BY refs.key) refs)`,
        }
      : {};
  const nativeHeaders =
    field === 'receipts'
      ? ` UNION ALL SELECT key,to_json(value) FROM (VALUES ${receiptHeaders
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
          .join(',')}) headers(key,value)`
      : '';
  return `CREATE OR REPLACE VIEW ${table}_read AS SELECT
    p.world_id,p.id,p.parent_id,p.slot,p.position,p.revision,
    octet_length(p.payload)+(p.payload::jsonb#>>'{storage,segmentBytes}')::bigint+(p.payload::jsonb#>>'{storage,metadataBytes}')::bigint AS encoded_bytes,
    (SELECT json_object_agg(e.key,CASE WHEN e.key='${field}' THEN
      COALESCE((SELECT json_agg(v.value ORDER BY s.position,v.ordinality)
        FROM ${children} s CROSS JOIN LATERAL json_array_elements(s.payload::json->'values') WITH ORDINALITY v(value,ordinality)
        WHERE s.world_id=p.world_id AND s.parent_id=p.id ${field === 'receipts' ? "AND v.value::text<>'null'" : ''}), '[]'::json)
      ELSE e.value END)::text FROM (SELECT * FROM json_each(p.payload::json) ${nativeHeaders}) e) AS payload,
    (SELECT COALESCE(jsonb_agg(((s.payload::jsonb-'values') || jsonb_build_object('length',jsonb_array_length(s.payload::jsonb->'values'))) ORDER BY s.position),'[]'::jsonb) FROM ${children} s
      WHERE s.world_id=p.world_id AND s.parent_id=p.id) AS segments${columns.length ? ',' + columns.map((column) => `p.${column}`).join(',') : ''}${Object.entries(
        projected,
      )
        .map(([column, sql]) => `,${sql} AS ${column}`)
        .join('')}
    FROM ${table} p`;
}
