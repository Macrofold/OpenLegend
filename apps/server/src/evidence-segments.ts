import {
  temporalChunkReceipts,
  temporalFacetValueReferences,
  temporalEntryReceipts,
  temporalEntryDependencies,
  temporalReceiptChangeCount,
  temporalConfirmationChangeCount,
  temporalSpatialContextValue,
  type TemporalReceipt,
  type TemporalFrameEntry,
  type TemporalFrameOwner,
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
type Field = 'entries' | 'values';
const layouts = new WeakMap<object, Layout>();
const encoded = new WeakMap<object, Owner>();
const ordinal = (field: Field, value: unknown, index: number) =>
  field === 'entries' ? Number((value as Owner)['ordinal']) : index;

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
    field === 'entries'
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

type TemporalDependency = ReturnType<typeof temporalEntryDependencies>[number];

export function receiptStorageIndex(
  receipts: readonly TemporalReceipt[],
  dependencies: readonly TemporalDependency[] = receipts,
) {
  const references: Record<string, number[]> = {};
  let firstMeasured = Infinity,
    lastSupported = -Infinity,
    confirmations = 0;
  for (const receipt of receipts) {
    if (!receipt.facets.length) {
      firstMeasured = Math.min(firstMeasured, receipt.at);
      lastSupported = Math.max(lastSupported, receipt.at);
    }
    for (const facet of receipt.facets) {
      firstMeasured = Math.min(firstMeasured, facet.measuredFrom);
      lastSupported = Math.max(lastSupported, facet.confirmedThrough ?? facet.measuredThrough);
    }
  }
  for (const dependency of dependencies) {
    if ('confirmation' in dependency) {
      confirmations += dependency.facets.length;
      firstMeasured = Math.min(firstMeasured, dependency.from);
      lastSupported = Math.max(lastSupported, dependency.through);
    }
    for (const facet of dependency.facets)
      for (const reference of temporalFacetValueReferences(facet)) {
        const values = (references[reference.blockId] ??= []);
        if (!values.includes(reference.valueOrdinal)) values.push(reference.valueOrdinal);
      }
  }
  for (const values of Object.values(references)) values.sort((a, b) => a - b);
  return {
    firstOrder: receipts[0]?.order,
    lastOrder: receipts.at(-1)?.order,
    firstMeasured: Number.isFinite(firstMeasured) ? firstMeasured : 0,
    lastSupported: Number.isFinite(lastSupported) ? lastSupported : 0,
    confirmations,
    spatialContext: receipts.some((receipt) => receipt.spatialContext === true),
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
function segmentIndex(
  owner: TemporalFrameOwner,
  entries: readonly TemporalFrameEntry[],
  world: WorldState,
): ReceiptSegmentIndex {
  const receipts = temporalEntryReceipts(owner, entries),
    dependencies = temporalEntryDependencies(owner, entries);
  const sources = world.receivedValues?.sources ?? {};
  // The same semantic visitors own native and stored provenance. Partial source
  // closure cannot silently produce a narrower correction/reclamation index.
  for (const dependency of dependencies)
    for (const facet of dependency.facets)
      if (
        temporalFacetValueReferences(facet).some(
          (reference) => !sources[reference.blockId]?.values[reference.valueOrdinal],
        )
      )
        throw new Error('Receipt page index requires complete received source support.');
  const index = {
    ...receiptStorageIndex(receipts, dependencies),
    spatialContext: dependencies.some((dependency) =>
      dependency.facets.some((facet) =>
        temporalSpatialContextValue(sources[facet.blockId]!.values[facet.valueOrdinal]!),
      ),
    ),
    subjects: unique(
      dependencies.flatMap((dependency) => [
        dependency.subject,
        ...('contextSubjects' in dependency ? (dependency.contextSubjects ?? []) : []),
      ]),
    ),
    sourceIds: unique(
      dependencies.flatMap((dependency) => temporalReceiptAliases(dependency, sources, world)),
    ),
    individualIds: unique(
      dependencies.flatMap((dependency) => temporalReceiptIndividualIds(dependency, sources)),
    ),
    sourceRefs: unique(
      dependencies.flatMap((dependency) =>
        dependency.facets.flatMap(temporalFacetValueReferences).map((facet) => facet.blockId),
      ),
    ),
  };
  return { ...index, lookupBuckets: pageLookupBuckets(index) };
}
/** Current-format restore has the complete selected source closure. Validate page
 * provenance there, not by trusting a correct parent union with misassigned pages. */
export function validateReceiptPageSources(chunk: TemporalChunk, world: WorldState): void {
  const layout = layouts.get(chunk.entries);
  if (!layout) throw new Error('Missing restored receipt page ownership.');
  for (const segment of layout.segments)
    if (
      canonicalJson(segment.index) !==
      canonicalJson(
        segmentIndex(chunk, segment.values.filter(Boolean) as TemporalFrameEntry[], world),
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
    const appended = old && appendedRecordCount(old, values);
    const previousLayout =
      heldLayout &&
      (field === 'values'
        ? values.length >= heldLayout.end
        : // The recording owner preserves surviving storage ordinals and a saved
          // high-water mark. Even after trailing retirement, no append reuses a
          // previous physical slot; affected pages can be replaced independently.
          Number(owner['nextEntryOrdinal']) >= heldLayout.end)
        ? heldLayout
        : undefined;
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
        if (field === 'entries') {
          if (!world) throw new Error('Receipt page preparation requires its world.');
          segment.index = segmentIndex(
            owner as unknown as TemporalFrameOwner,
            segment.values.filter(Boolean) as TemporalFrameEntry[],
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
  if (field === 'entries') {
    const headers = pageHeaders(layout.segments);
    if (receiptHeaders.some((key) => canonicalJson(headers[key]) !== canonicalJson(owner[key])))
      throw new Error('Receipt page indexes disagree with their logical owner.');
  }
  const physical = { ...owner };
  if (field === 'entries') for (const key of receiptHeaders) delete physical[key];
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
      ...(field === 'entries' ? { index: receiptBounds(layout.segments) } : {}),
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
      if (field === 'entries') {
        if (entry === null) continue;
        if (!entry || ordinal(field, entry, index) !== segment.start + index)
          throw new Error('Evidence receipt ordinal disagrees with its segment.');
      }
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
  if (field === 'entries')
    for (const segment of segments) {
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
      const {
        subjects,
        sourceIds,
        individualIds,
        sourceRefs,
        lookupBuckets,
        spatialContext,
        ...stored
      } = index;
      const selected = segment.values.filter(Boolean) as TemporalFrameEntry[],
        receipts = temporalEntryReceipts(frameOwner, selected),
        dependencies = temporalEntryDependencies(frameOwner, selected);
      const { spatialContext: receiptSpatialContext, ...expected } = receiptStorageIndex(
        receipts,
        dependencies,
      );
      if (
        canonicalJson(lookupBuckets) !== canonicalJson(pageLookupBuckets(index)) ||
        typeof spatialContext !== 'boolean' ||
        (receiptSpatialContext && !spatialContext) ||
        canonicalJson(stored) !== canonicalJson(expected) ||
        canonicalJson(subjects) !==
          canonicalJson(
            unique(
              dependencies.flatMap((dependency) => [
                dependency.subject,
                ...('contextSubjects' in dependency ? (dependency.contextSubjects ?? []) : []),
              ]),
            ),
          ) ||
        canonicalJson(sourceRefs) !==
          canonicalJson(
            unique(
              dependencies.flatMap((dependency) =>
                dependency.facets
                  .flatMap(temporalFacetValueReferences)
                  .map((facet) => facet.blockId),
              ),
            ),
          )
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
      ) ||
    (field === 'values' && storage.start !== 0)
  )
    throw new Error('Evidence segment range disagrees with its owner.');
  if (
    field === 'entries' &&
    (temporalChunkReceipts(frameOwner).reduce(
      (sum, receipt) => sum + temporalReceiptChangeCount(receipt),
      0,
    ) +
      temporalConfirmationChangeCount(frameOwner.entries) !==
      owner['count'] ||
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
  if (field === 'entries') Object.assign(result, pageHeaders(segments));
  result[field] = values;
  return result;
}

/** The scoped SQL view returns logical payload plus layout only to installing readers. */
export function restoreEvidenceLayout(value: Owner, field: Field, segments: unknown): Owner {
  if (!Array.isArray(segments)) throw new Error('Missing stored evidence segments.');
  const values = value[field] as unknown[];
  const receipts =
    field === 'entries'
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
      throw new Error(
        `Invalid evidence segment length (${JSON.stringify({ start: segment.start, end: segment.end, length })}).`,
      );
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

/** Parent-only charge; reading it never hydrates a received payload vector. */
export function receivedValueEncodedBytes(value: object, maxBytes: number): number | undefined {
  // Normal save preparation seals these blocks already. Foreign mutable input
  // gets the bounded cold-header path, never a second eager command encoding.
  if (!isImmutableData(value)) return;
  const encoded = encodeEvidenceOwner(value, 'values', undefined, maxBytes);
  const storage = encoded['storage'] as { segmentBytes: number; metadataBytes: number };
  return (
    Buffer.byteLength(JSON.stringify({ ...encoded, values: [] })) +
    storage.segmentBytes +
    storage.metadataBytes
  );
}

export function evidenceEncodedBytesSql(alias: string): string {
  return `octet_length(${alias}.payload)+(${alias}.payload::jsonb#>>'{storage,segmentBytes}')::bigint+(${alias}.payload::jsonb#>>'{storage,metadataBytes}')::bigint`;
}

/** A selected personal reference authorizes exactly one shared value, not the
 * other values which happen to share its physical append page. */
export function receivedValueSql(world: string, source: string, ordinal: string): string {
  return `(SELECT s.payload::json->'values'->((${ordinal})-s.first_ordinal)::int
    FROM mind_perception_values p JOIN mind_perception_segments s
      ON s.world_id=p.world_id AND s.parent_id=p.id
      AND s.first_ordinal<=(${ordinal}) AND s.last_ordinal>=(${ordinal})
    WHERE p.world_id=${world} AND p.source_id=${source})`;
}

export function evidenceReadView(table: string, field: Field, columns: string[]): string {
  const children = field === 'entries' ? 'mind_temporal_segments' : 'mind_perception_segments';
  // JSON preserves encoded fragment member order. JSONB would reorder nested
  // values and defeat the existing exact-encoding sharing index after active load.
  const union = (column: string) => `ARRAY(SELECT item FROM (
    SELECT DISTINCT ON (v.item) v.item,s.position,v.ordinality FROM ${children} s
    CROSS JOIN LATERAL unnest(s.${column}) WITH ORDINALITY v(item,ordinality)
    WHERE s.world_id=p.world_id AND s.parent_id=p.id ORDER BY v.item,s.position,v.ordinality
    ) selected ORDER BY position,ordinality)`;
  const projected =
    field === 'entries'
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
    field === 'entries'
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
    ${evidenceEncodedBytesSql('p')} AS encoded_bytes,
    (SELECT json_object_agg(e.key,CASE WHEN e.key='${field}' THEN
      COALESCE((SELECT json_agg(v.value ORDER BY s.position,v.ordinality)
        FROM ${children} s CROSS JOIN LATERAL json_array_elements(s.payload::json->'values') WITH ORDINALITY v(value,ordinality)
        WHERE s.world_id=p.world_id AND s.parent_id=p.id ${field === 'entries' ? "AND v.value::text<>'null'" : ''}), '[]'::json)
      ELSE e.value END)::text FROM (SELECT * FROM json_each(p.payload::json) ${nativeHeaders}) e) AS payload,
    (SELECT COALESCE(jsonb_agg(((s.payload::jsonb-'values') || jsonb_build_object('length',jsonb_array_length(s.payload::jsonb->'values'))) ORDER BY s.position),'[]'::jsonb) FROM ${children} s
      WHERE s.world_id=p.world_id AND s.parent_id=p.id) AS segments${columns.length ? ',' + columns.map((column) => `p.${column}`).join(',') : ''}${Object.entries(
        projected,
      )
        .map(([column, sql]) => `,${sql} AS ${column}`)
        .join('')}
    FROM ${table} p`;
}
