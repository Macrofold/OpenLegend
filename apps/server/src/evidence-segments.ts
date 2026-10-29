import {
  appendedRecordCount,
  appendSnapshot,
  canonicalJson,
  isImmutableData,
  jsonText,
  type TemporalChunk,
} from '@open-legend/domain';

/** Physical append pages belong to the existing record codec, not to character history.
 * A save seals its suffix; later appends never rewrite an earlier page. */
export interface EvidenceSegment {
  start: number;
  end: number;
  values: unknown[];
  bytes: number;
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

export function encodeEvidenceOwner(
  value: unknown,
  field: Field,
  previous: unknown,
  maxBytes: number,
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
        for (let pass = 0; pass < 4; pass++) {
          const size = Buffer.byteLength(JSON.stringify(segment));
          if (segment.bytes === size) break;
          segment.bytes = size;
        }
        Object.freeze(segment.values);
        Object.freeze(segment);
      }
    }
    const sealed =
      previousLayout && appended !== undefined
        ? appendSnapshot(previousLayout.segments, segments.slice(previousLayout.segments.length))!
        : (Object.freeze(segments) as unknown as EvidenceSegment[]);
    layout = { segments: sealed, start: segments[0]?.start ?? 0, end: segments.at(-1)?.end ?? 0 };
    if (isImmutableData(values)) layouts.set(values, layout);
  }
  const result = {
    ...owner,
    [field]: layout.segments,
    storage: {
      start: layout.start,
      end: layout.end,
      segmentBytes: layout.segments.reduce((sum, segment) => sum + segment.bytes, 0),
      ...(field === 'receipts'
        ? { index: receiptStorageIndex(values as TemporalChunk['receipts']) }
        : {}),
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
    next = segment.end;
  }
  if (
    next !== storage.end ||
    storage.segmentBytes !== segments.reduce((sum, segment) => sum + segment.bytes, 0) ||
    (field === 'values' && storage.start !== 0)
  )
    throw new Error('Evidence segment range disagrees with its owner.');
  if (
    field === 'receipts' &&
    (values.length !== owner['count'] ||
      canonicalJson(receiptStorageIndex(values as TemporalChunk['receipts'])) !==
        canonicalJson(storage.index))
  )
    throw new Error('Evidence segment index disagrees with its receipts.');
  for (const segment of segments) {
    Object.freeze(segment.values);
    Object.freeze(segment);
  }
  Object.freeze(segments);
  layouts.set(values, { segments, start: storage.start, end: storage.end });
  const { storage: _storage, ...result } = owner;
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
  return `CREATE OR REPLACE VIEW ${table}_read AS SELECT
    p.world_id,p.id,p.parent_id,p.slot,p.position,p.revision,
    octet_length(p.payload)+(p.payload::jsonb#>>'{storage,segmentBytes}')::bigint AS encoded_bytes,
    (SELECT json_object_agg(e.key,CASE WHEN e.key='${field}' THEN
      COALESCE((SELECT json_agg(v.value ORDER BY s.position,v.ordinality)
        FROM ${children} s CROSS JOIN LATERAL json_array_elements(s.payload::json->'values') WITH ORDINALITY v(value,ordinality)
        WHERE s.world_id=p.world_id AND s.parent_id=p.id ${field === 'receipts' ? "AND v.value::text<>'null'" : ''}), '[]'::json)
      ELSE e.value END)::text FROM json_each(p.payload::json) e) AS payload,
    (SELECT COALESCE(jsonb_agg(((s.payload::jsonb-'values') || jsonb_build_object('length',jsonb_array_length(s.payload::jsonb->'values'))) ORDER BY s.position),'[]'::jsonb) FROM ${children} s
      WHERE s.world_id=p.world_id AND s.parent_id=p.id) AS segments${columns.length ? ',' + columns.map((column) => `p.${column}`).join(',') : ''}
    FROM ${table} p`;
}
