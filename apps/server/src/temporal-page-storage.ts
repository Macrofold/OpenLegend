import {
  appendedRecordCount,
  temporalOperationAppendOrder,
  recordAppendBase,
  temporalPageMetadata,
  temporalPageReferences,
  temporalPageMutation,
  selectTemporalPageOperations,
  type TemporalPage,
  type TemporalHistoryOperation,
  type WorldState,
} from '@open-legend/domain';

/** A native delta is held by the existing save cut; no physical encoding is done
 * while physical time advances. It is not another writable history store. */
export interface PendingTemporalPage {
  before?: TemporalPage;
  after: TemporalPage;
  /** Explicit cold corrections carry their complete exact stored predecessor. */
  replacement: boolean;
  reservedBytes: number;
}
export const TEMPORAL_PAGE_TARGET_BYTES = 64 * 1024;
/** Only an acknowledged, unedited physical page has an exact durable retirement target. */
export function retirableTemporalPage(page: TemporalPage): boolean {
  return page.appendClosed === true && temporalPageMutation(page) !== 'edit';
}
export const temporalPageRecordId = (actorId: string, id: string) =>
  JSON.stringify(['world', 'experience', 'temporal', 'actors', actorId, 'pages', id]);
export const temporalPageIntentKey = (page: TemporalPage) =>
  JSON.stringify([page.actorId, page.physicalLife, page.epoch, page.id]);

export function captureTemporalPageChange(
  before: TemporalPage | undefined,
  after: TemporalPage,
  replacement = false,
): PendingTemporalPage {
  replacement ||= temporalPageMutation(after) === 'edit';
  let appended = before ? appendedRecordCount(before.operations, after.operations) : 0;
  // A successful save can remove the acknowledged prefix while later operations
  // remain in the same native container. Its certified placement lineage means
  // every remaining operation is an unsaved suffix, not an edit of a SQL page.
  if (before && appended === undefined && !replacement && residencyDescendsFrom(after, before)) {
    before = undefined;
    appended = 0;
  }
  if (before && appended === undefined && !replacement)
    throw new Error('Temporal append has no certified predecessor.');
  const start = replacement ? 0 : (before?.operations.length ?? 0);
  const count = after.operations.length - start;
  // Native operation charges include direct payload/closure bytes. Reserve the
  // SQL projections, seeds, JSON escapes and both native/encoded ownership too.
  // This is a conservative work reservation, not a fictional memory charge.
  const logical = replacement ? after.bytes : Math.max(0, after.bytes - (before?.bytes ?? 0));
  return { before, after, replacement, reservedBytes: 4096 + logical * 8 + count * 2048 };
}
export function mergeTemporalPageIntent(
  previous: PendingTemporalPage | undefined,
  next: PendingTemporalPage,
): PendingTemporalPage {
  if (!previous) return next;
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
export type ReceiptLookup = 'subjects' | 'sourceIds' | 'individualIds' | 'members';
/** The vocabulary stays fixed after history deletion; exact postchecks retain
 * identity and privacy even when two different keys share a bucket. */
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
/** The detached save owns this encoding and reuses it on a failed attempt. */
export function encodeTemporalPage(page: TemporalPage, world: WorldState): StoredTemporalPage {
  const existing = encodings.get(page);
  if (existing) return existing;
  const metadata = {
    ...temporalPageMetadata(page, { world, sources: world.receivedValues?.sources }),
    references: temporalPageValueReferences(page),
  };
  const payload = serializeTemporalPage(page);
  const lookupBuckets = unique([
    ...receiptLookupBuckets('subjects', metadata.subjects),
    ...receiptLookupBuckets('members', metadata.members),
    ...receiptLookupBuckets('sourceIds', metadata.sourceIds),
    ...receiptLookupBuckets('individualIds', metadata.individualIds),
  ]).sort((a, b) => a - b);
  const result = { native: page, payload, metadata, lookupBuckets };
  encodings.set(page, result);
  return result;
}
/** Physical page names derive from the new suffix, never its native container.
 * Therefore a save ending in a partial page cannot rewrite that saved prefix. */
export function packTemporalSave(
  intents: Iterable<PendingTemporalPage>,
  world: WorldState,
  acknowledgedBefore: number | undefined,
): StoredTemporalPage[] {
  const result: StoredTemporalPage[] = [];
  for (const intent of intents) {
    const source = intent.after;
    // The committed allocation cut is authoritative even when residency has
    // changed native containers or an intent no longer has its old local prefix.
    // Every new append has fresh causal order; opening a span is not its append.
    const operations =
      intent.replacement || acknowledgedBefore === undefined
        ? source.operations
        : source.operations.filter(
            (operation) => temporalOperationAppendOrder(operation) >= acknowledgedBefore,
          );
    if (intent.replacement || (source.appendClosed === true && acknowledgedBefore === undefined)) {
      const kind = operations[0]?.kind;
      if (
        source.appendClosed !== true ||
        !kind ||
        operations.some((operation) => operation.kind !== kind)
      )
        throw new Error('A temporal replacement requires one existing homogeneous physical page.');
      if (
        intent.before &&
        (intent.before.appendClosed !== true ||
          intent.before.id !== source.id ||
          intent.before.actorId !== source.actorId ||
          intent.before.physicalLife !== source.physicalLife ||
          intent.before.epoch !== source.epoch)
      )
        throw new Error('A temporal replacement has a different physical predecessor.');
      // A correction replaces exactly one canonical row. Repartitioning it would
      // reuse its ID for several rows and duplicate already saved operations.
      const page = {
        ...selectTemporalPageOperations(source, operations, source.id, world),
        appendClosed: true as const,
      };
      result.push({ ...encodeTemporalPage(page, world), replacement: intent.replacement });
      continue;
    }
    if (source.appendClosed === true && operations.length)
      throw new Error('An acknowledged physical temporal page cannot append operations.');
    const byKind = new Map<TemporalHistoryOperation['kind'], TemporalHistoryOperation[]>();
    for (const operation of operations) {
      let values = byKind.get(operation.kind);
      if (!values) byKind.set(operation.kind, (values = []));
      values.push(operation);
    }
    for (const [kind, values] of byKind) {
      let selected: TemporalHistoryOperation[] = [];
      const flush = () => {
        if (!selected.length) return;
        const first = selected[0]!;
        const id = JSON.stringify([source.physicalLife, source.epoch, kind, first.ordinal]);
        const page = {
          ...selectTemporalPageOperations(source, selected, id, world),
          appendClosed: true as const,
        };
        result.push({ ...encodeTemporalPage(page, world), replacement: intent.replacement });
        selected = [];
      };
      let estimated = 0;
      for (const operation of values) {
        const bytes = Math.max(256, operation.charge.bytes);
        if (selected.length && estimated + bytes > TEMPORAL_PAGE_TARGET_BYTES) {
          flush();
          estimated = 0;
        }
        selected.push(operation);
        estimated += bytes;
      }
      flush();
    }
  }
  return result;
}

export function receivedValueSql(world: string, reference: string): string {
  return `(CASE WHEN json_typeof(${reference})='string' THEN
    (SELECT p.payload::json->'value' FROM mind_perception_values p
      WHERE p.world_id=${world} AND p.source_id=(${reference}#>>'{}')) ELSE ${reference} END)`;
}

const payloadEncodings = new WeakMap<object, string>();
/** Body encoding has no dependency lookup; projection preparation owns that. */
export function serializeTemporalPage(value: unknown): string {
  const page = value as TemporalPage,
    existing = payloadEncodings.get(page);
  if (existing) return existing;
  const {
    subjects: _subjects,
    sourceIds: _sourceIds,
    individualIds: _individualIds,
    sourceRefs: _sourceRefs,
    ...body
  } = page;
  const payload = JSON.stringify(body);
  payloadEncodings.set(page, payload);
  return payload;
}
const restoredProjections = new WeakMap<TemporalPage, Record<string, unknown>>();
export function decodeTemporalPageRow(row: Record<string, unknown>): TemporalPage {
  const body = JSON.parse(String(row['payload'])) as TemporalPage;
  if (
    body.appendClosed !== true ||
    !Array.isArray(body.operations) ||
    !body.operations.length ||
    !Array.isArray(body.declarations) ||
    body.operations.some(
      (op) =>
        !op.charge ||
        !Number.isSafeInteger(op.charge.bytes) ||
        op.charge.bytes < 0 ||
        !Number.isSafeInteger(op.charge.count) ||
        op.charge.count < 0,
    ) ||
    body.bytes !== body.operations.reduce((sum, op) => sum + op.charge.bytes, 0) ||
    body.count !== body.operations.reduce((sum, op) => sum + op.charge.count, 0)
  )
    throw new Error('Invalid current temporal page.');
  const page: TemporalPage = {
    ...body,
    subjects: row['subjects'] as string[],
    sourceIds: row['source_ids'] as string[],
    individualIds: row['individual_ids'] as string[],
    sourceRefs: row['value_refs'] as string[],
  };
  restoredProjections.set(page, row);
  return page;
}
/** Import has the selected direct closure, unlike ordinary trusted reads. */
export function validateTemporalPageSources(page: TemporalPage, world: WorldState): void {
  const row = restoredProjections.get(page);
  if (!row) throw new Error('Missing restored temporal page projection.');
  const encoded = encodeTemporalPage(page, world);
  for (const [column, key] of [
    ['subjects', 'subjects'],
    ['member_keys', 'members'],
    ['source_ids', 'sourceIds'],
    ['individual_ids', 'individualIds'],
    ['value_refs', 'references'],
  ] as const) {
    if (JSON.stringify(row[column]) !== JSON.stringify(encoded.metadata[key]))
      throw new Error('Temporal page projection disagrees with its payload.');
  }
  const scalar: Record<string, unknown> = {
    actor_id: page.actorId,
    source_id: page.id,
    physical_life: page.physicalLife,
    receipt_epoch: page.epoch,
    page_order: page.order,
    kind: page.operations[0]!.kind,
    first_ordinal: page.fromOrdinal,
    last_ordinal: page.throughOrdinal,
    logical_bytes: page.bytes,
    receipt_count: page.count,
    first_at: encoded.metadata.firstAt,
    last_at: encoded.metadata.lastAt,
    last_received_at: encoded.metadata.lastReceivedAt,
    first_order: encoded.metadata.firstOrder,
    last_order: encoded.metadata.lastOrder,
    first_measured_at: encoded.metadata.firstMeasured ?? null,
    last_supported_at: encoded.metadata.lastSupported ?? null,
    lookup_buckets: encoded.lookupBuckets,
  };
  for (const [column, expected] of Object.entries(scalar)) {
    const actual = typeof expected === 'number' ? Number(row[column]) : row[column];
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error(`Temporal page ${column} projection disagrees with its payload.`);
  }
  if (Number(row['encoded_bytes']) !== Buffer.byteLength(encoded.payload))
    throw new Error('Temporal page encoded size disagrees with its payload.');
}
export function evidenceEncodedBytesSql(alias: string): string {
  return `octet_length(${alias}.payload)`;
}

// Residency can remove an acknowledged prefix without turning the next native
// append into an unknown edit. This is placement lineage, never saved authority.
const residencyPredecessors = new WeakMap<object, TemporalPage>();
export function noteTemporalResidency(page: TemporalPage, previous: TemporalPage): void {
  residencyPredecessors.set(page.operations, previous);
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
    if (at === previous || at.operations === previous.operations) return true;
    // Only an actual acknowledged-prefix relocation admits an earlier append
    // ancestor. A plain append cannot reset its unsaved prefix to a new page.
    if (depth > 0 && appendedRecordCount(previous.operations, at.operations) !== undefined)
      return true;
    at =
      residencyPredecessors.get(at.operations) ??
      residencyPredecessors.get(recordAppendBase(at.operations) ?? at.operations);
  }
  return false;
}

export function temporalPagePosition(page: TemporalPage): number {
  const first = page.operations[0];
  if (!first) throw new Error('Empty history page has no physical position.');
  return temporalOperationAppendOrder(first);
}

/** Canonical ownership arrays are sets with a stable encoded order. */
export function temporalPageValueReferences(page: TemporalPage): string[] {
  return [...temporalPageReferences(page)].sort();
}
