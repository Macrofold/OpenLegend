import { currentFacetEntries, currentFacetGet } from '@open-legend/domain';
import {
  receiptLookupBuckets,
  decodeTemporalPageRow,
  temporalPageRecordId,
  temporalPageValueReferences,
  retirableTemporalPage,
} from './temporal-page-storage.js';
import {
  selectedTemporalPolicy,
  temporalOpenReservationTotals,
  temporalRecentAt,
  captureTemporalReadContext,
  currentTemporalOpenIntervals,
  temporalFacetValueReferences,
  type TemporalReadContext,
  canonicalJson,
  immutableDataSnapshot,
  appendedRecordCount,
  selectedAttentionPolicy,
  temporalFacetEligible,
  retireTemporalPages,
  temporalPageReceipts,
  temporalPageOperations,
  temporalOperationHeader,
  temporalReceiptChangeCount,
  temporalPageReferences,
  temporalPageLastReceivedAt,
  temporalOperationLastReceivedAt,
  temporalMemberKey,
  temporalPageSelection,
  selectCapturedTemporalHistory,
  retireTemporalOperations,
  temporalReceiptWithinPrefix,
  materializeTemporalValue,
  temporalReceiptForRead,
  temporalReceiptAliases,
  temporalReceiptAccountAliases,
  selectTemporalReceiptFacets,
  receivedObservationValueReferences,
  receivedFacetValueReferences,
  currentFacetGrant,
  currentFacetOriginal,
  recordMapChangesBetween,
  referencedReceivedValues,
  updateWorld,
  freezeWorld,
  preserveReceivedValuePreparation,
  type WorldState,
  type TemporalPage,
  type TemporalEvidenceState,
  type TemporalHistorySelection,
  type ReceivedValue,
  type ReceivedValueLookup,
  type ReceivedValueFragment,
  type TemporalReceiptPrefix,
  type TemporalValue,
  type ReceivedObservation,
} from '@open-legend/domain';
import type { SavedWorld, SqlDatabase } from './store.js';
import type { MemoryScope } from './memory-repository.js';
import type { SourceVersionPlan } from './source-version-retention.js';
import type { RecordChanges } from './world-records.js';
import type { RetentionMetadataView } from './retention-metadata.js';
import { countMetric } from './performance.js';

const maximumPreparation = 4 * 1024 * 1024;
export const maximumTemporalPreparationRows = 8192;
export { temporalPageRecordId } from './temporal-page-storage.js';
export { temporalPageValueReferences } from './temporal-page-storage.js';

/** This projection controls payload reclamation, so a malformed saved index
 * must refuse before it can erase a still-owned value. */
export function readTemporalPageRecord(row: Record<string, unknown>): TemporalPage {
  const chunk = decodeTemporalPageRow(row);
  validateTemporalPageValueReferences(chunk, row['value_refs']);
  return chunk;
}
export function validateTemporalPageValueReferences(
  chunk: TemporalPage,
  references: unknown,
): void {
  if (canonicalJson(references) !== canonicalJson(temporalPageValueReferences(chunk)))
    throw new MemoryRetentionError('Temporal value ownership metadata disagrees with its receipt.');
}
export function temporalPageSourceId(actorId: string, recordId: string): string | undefined {
  const path = JSON.parse(recordId) as unknown;
  if (!Array.isArray(path) || typeof path.at(-1) !== 'string') return;
  const id = path.at(-1) as string;
  return temporalPageRecordId(actorId, id) === recordId ? id : undefined;
}
export interface PreparedMemoryRetention {
  state: SavedWorld;
  rows: Map<string, string[]>;
  positions?: Map<string, Map<string, number>>;
  /** Exact SQL-loaded predecessors for editing segmented owners absent from the hot baseline. */
  previous?: Map<string, Map<string, unknown>>;
  versions?: SourceVersionPlan;
}
export interface TemporalHistoryPage extends TemporalHistorySelection {
  hasMore: boolean;
  /** Last examined receipt, including a whole omitted oversized receipt. */
  nextBefore?: NonNullable<TemporalHistoryQuery['before']>;
}
export interface TemporalHistoryQuery {
  from?: number;
  through?: number;
  before?: { epoch: string; ordinal: number; at: number; order: number };
  subjects?: readonly string[];
  includeGeometry?: boolean;
  physicalLife?: number;
  epoch?: string;
  limit?: number;
  bytes?: number;
  cut?: TemporalReceiptPrefix;
  measurements?: { from: number; through: number };
  kinds?: readonly TemporalValue['kind'][];
}

/** Captured actor-local read inputs. Blocks are copied only for this actor's
 * resident tail; the global received-value catalogue is never retained. */
export interface TemporalHistoryWindow {
  capture(subjects: ReadonlySet<string>): TemporalHistoryReadContext;
  readonly at: number;
  readonly maxAgeSeconds: number;
  readonly retiredThrough?: { readonly pageOrder: number; readonly ordinal: number };
}
export function temporalHistoryWindow(world: WorldState, actorId: string): TemporalHistoryWindow {
  return {
    capture: (subjects) =>
      captureTemporalHistoryReadContext(world, actorId, { subjects: [...subjects] }),
    at: world.simTime,
    maxAgeSeconds: selectedTemporalPolicy(world).recent.maxAgeSeconds,
    retiredThrough: world.experience?.temporal?.actors[actorId]?.retiredThrough,
  };
}
export interface TemporalHistoryReadContext {
  readonly worldId: string;
  readonly actorId: string;
  readonly at: number;
  readonly maxAgeSeconds: number;
  readonly maximumSubjects: number;
  readonly maximumOperations: number;
  readonly maximumCandidates: number;
  readonly pages: readonly TemporalPage[];
  readonly open: ReturnType<typeof currentTemporalOpenIntervals>;
  readonly captureIncomplete: boolean;
  readonly releasedThrough?: number;
  readonly retiredThrough?: { readonly pageOrder: number; readonly ordinal: number };
  readonly recordingGap?: { readonly from: number; readonly through: number };
  readonly sources: ReceivedValueLookup;
  readonly disclosure: TemporalReadContext;
}
export function captureTemporalHistoryReadContext(
  world: WorldState,
  actorId: string,
  selection: Pick<TemporalHistoryQuery, 'subjects' | 'from' | 'through' | 'includeGeometry'> = {},
): TemporalHistoryReadContext {
  const actor = world.experience?.temporal?.actors[actorId];
  const subjectSet = selection.subjects ? new Set(selection.subjects) : undefined;
  const pages = (actor?.pages ?? [])
    .filter(
      (page) =>
        (selection.from === undefined || page.throughAt >= selection.from) &&
        (selection.through === undefined || page.fromAt <= selection.through) &&
        (!subjectSet || page.subjects.some((subject) => subjectSet.has(subject))),
    )
    .map((page) => immutableDataSnapshot(page));
  const maximum = selectedAttentionPolicy(world).scene.candidateVisits;
  const acquiredOpen = currentTemporalOpenIntervals(
    world,
    actorId,
    subjectSet,
    selection.includeGeometry,
  );
  const open = acquiredOpen.slice(0, maximum).map((receipt) => immutableDataSnapshot(receipt));
  const sources: Record<string, ReceivedValueLookup[string]> = {};
  for (const chunk of pages)
    for (const id of temporalPageReferences(chunk)) {
      const source = world.receivedValues?.sources[id];
      if (!source) continue;
      sources[id] = { value: immutableDataSnapshot(source.value) };
    }
  for (const interval of open)
    for (const field of interval.receipt.facets)
      for (const id of temporalFacetValueReferences(field)) {
        const source = world.receivedValues?.sources[id];
        if (source) sources[id] = { value: immutableDataSnapshot(source.value) };
      }
  for (const interval of open)
    for (const seed of interval.terminal) {
      const reference = seed.reception?.kind === 'body' ? seed.reception.poseRef : undefined;
      if (typeof reference === 'string') {
        const source = world.receivedValues?.sources[reference];
        if (source) sources[reference] = { value: immutableDataSnapshot(source.value) };
      }
    }
  return {
    open,
    captureIncomplete: acquiredOpen.length > open.length,
    worldId: world.id,
    actorId,
    at: world.simTime,
    maxAgeSeconds: selectedTemporalPolicy(world).recent.maxAgeSeconds,
    maximumSubjects: selectedAttentionPolicy(world).maximumCapacity,
    maximumOperations: selectedAttentionPolicy(world).scene.historyReceipts,
    maximumCandidates: selectedAttentionPolicy(world).scene.candidateVisits,
    pages,
    ...(actor?.retiredThrough ? { retiredThrough: { ...actor.retiredThrough } } : {}),
    ...(actor?.releasedThrough === undefined ? {} : { releasedThrough: actor.releasedThrough }),
    ...(actor?.recordingGap ? { recordingGap: { ...actor.recordingGap } } : {}),
    sources,
    disclosure: captureTemporalReadContext(world, actorId),
  };
}

/** Changed personal ownership selects candidate blocks before any global
 * reference union or SQL. Confirmation/header-only changes release nothing. */
export function receivedValueReleaseCandidates(
  before: Pick<WorldState, 'receivedValues' | 'perceptionEvidence' | 'experience'> | undefined,
  after: WorldState,
): Set<string> {
  const candidates = new Set<string>();
  const observations = new WeakSet<ReceivedObservation>();
  const addObservation = (source: ReceivedObservation) => {
    if (observations.has(source)) return;
    observations.add(source);
    for (const reference of receivedObservationValueReferences(source)) candidates.add(reference);
  };
  if (before?.perceptionEvidence !== after.perceptionEvidence)
    for (const [actorId, owner] of Object.entries(before?.perceptionEvidence ?? {})) {
      const current = after.perceptionEvidence?.[actorId];
      const frame = owner.visualConfirmation?.frameRef;
      const nextFrame = current?.visualConfirmation?.frameRef;
      if (typeof frame === 'string' && frame !== nextFrame) candidates.add(frame);
      if (owner.received !== current?.received) {
        const retained = new Set(current?.received);
        for (const source of owner.received) if (!retained.has(source)) addObservation(source);
      }
      if (owner.current !== current?.current)
        for (const [key, lease] of currentFacetEntries(owner)) {
          const next = currentFacetGet(current, key);
          const original = currentFacetGrant(owner, lease).original;
          const nextOriginal =
            next && current ? currentFacetGrant(current, next).original : undefined;
          if (original === nextOriginal && lease.value === next?.value) continue;
          const beforeRefs = receivedFacetValueReferences(lease.value),
            afterRefs = next ? receivedFacetValueReferences(next.value) : [];
          if (
            original !== nextOriginal ||
            beforeRefs.length !== afterRefs.length ||
            beforeRefs.some((reference, index) => reference !== afterRefs[index])
          ) {
            for (const reference of beforeRefs) candidates.add(reference);
            addObservation(currentFacetOriginal(owner, lease));
          }
        }
    }
  if (before?.experience?.temporal !== after.experience?.temporal)
    for (const [actorId, actor] of Object.entries(before?.experience?.temporal?.actors ?? {})) {
      const next = after.experience?.temporal?.actors[actorId];
      if (actor.pages === next?.pages) continue;
      const pages = new Map((next?.pages ?? []).map((chunk) => [chunk.id, chunk]));
      for (const chunk of actor.pages) {
        const retained = pages.get(chunk.id);
        if (
          chunk === retained ||
          (retained && appendedRecordCount(chunk.operations, retained.operations) !== undefined)
        )
          continue;
        // A surviving block ID can still lose an individual payload ordinal.
        for (const id of temporalPageReferences(chunk)) candidates.add(id);
      }
    }
  if (before?.receivedValues !== after.receivedValues) {
    const old = before?.receivedValues?.sources ?? {},
      current = after.receivedValues?.sources ?? {};
    if (old !== current)
      for (const id of recordMapChangesBetween(old, current) ??
        new Set([...Object.keys(old), ...Object.keys(current)])) {
        const source = current[id];
        const prior = old[id];
        if (
          (!source && prior) ||
          (source && !prior) ||
          (source && prior && source !== prior && prior.value !== source.value)
        )
          candidates.add(id);
      }
  }
  return candidates;
}

/** Recent history already owns exact totals/deadlines; do not query cold pages
 * merely because a current frame appended. */
export function recentRetentionDue(world: WorldState, actorId: string): boolean {
  const actor = world.experience?.temporal?.actors[actorId];
  if (!actor) return false;
  const policy = selectedTemporalPolicy(world).recent;
  return (
    actor.maintenanceDue ||
    actor.bytes > policy.maxBytes ||
    actor.count > policy.maxChanges ||
    (actor.nextDue !== null && actor.nextDue <= world.simTime)
  );
}

/** Saved counters select actors before any cold metadata is read. */
export function* retentionDueActors(world: WorldState): Generator<string> {
  const policy = selectedTemporalPolicy(world);
  for (const [id, actor] of Object.entries(world.experience?.temporal?.actors ?? {}))
    if (
      recentRetentionDue(world, id) ||
      !actor.accounts ||
      (actor.accounts.nextDue !== null && actor.accounts.nextDue <= world.simTime) ||
      (['optional', 'required', 'speech'] as const).some(
        (key) =>
          actor.accounts![key].bytes > policy[key].maxBytes ||
          actor.accounts![key].count > policy[key].maxRecords,
      )
    )
      yield id;
}
export function retentionNeedsPreparation(world: WorldState): boolean {
  return !retentionDueActors(world).next().done;
}

export interface TemporalRetentionHeader {
  position?: number;
  encodedBytes?: number;
  id: string;
  sourceId: string;
  at: number;
  through: number;
  bytes: number;
  count: number;
  sources: string[];
  order: number;
  epoch: string;
  ordinal: number;
}
export const compareTemporalRetentionHeaders = (
  a: TemporalRetentionHeader,
  b: TemporalRetentionHeader,
) => a.at - b.at || a.order - b.order || a.epoch.localeCompare(b.epoch) || a.ordinal - b.ordinal;

/** One selection rule serves cold preparation and actual retirement. A bounded
 * prefix is not the newest page: only an exhausted source may trim its last page. */
export function selectTemporalRetirement(
  world: WorldState,
  actorId: string,
  ordered: readonly TemporalRetentionHeader[],
  complete = true,
) {
  const actor = world.experience!.temporal!.actors[actorId]!;
  const policy = selectedTemporalPolicy(world).recent;
  const open = temporalOpenReservationTotals(world, actorId);
  let bytes = actor.bytes - open.bytes,
    count = actor.count - open.count;
  const retired: TemporalRetentionHeader[] = [];
  for (let index = 0; index < ordered.length; index++) {
    const chunk = ordered[index]!;
    const pressure =
      bytes + open.bytes - open.expired.bytes > policy.maxBytes ||
      count + open.count - open.expired.count > policy.maxChanges;
    if (temporalRecentAt(chunk.through, world.simTime, policy.maxAgeSeconds) && !pressure)
      return {
        retired,
        boundary: chunk,
        partial: false,
        nextDue: chunk.through + policy.maxAgeSeconds,
        needsMore: false,
      };
    if (
      temporalRecentAt(chunk.through, world.simTime, policy.maxAgeSeconds) &&
      index === ordered.length - 1
    ) {
      if (!complete) return { retired, partial: false, nextDue: null, needsMore: true };
      return {
        retired,
        boundary: chunk,
        partial: true,
        nextDue: chunk.through + policy.maxAgeSeconds,
        needsMore: false,
      };
    }
    if (retired.length >= maximumTemporalPreparationRows)
      return {
        retired,
        boundary: chunk,
        partial: false,
        nextDue: chunk.at + policy.maxAgeSeconds,
        needsMore: false,
      };
    retired.push(chunk);
    bytes -= chunk.bytes;
    count -= chunk.count;
  }
  return { retired, partial: false, nextDue: null, needsMore: !complete };
}
type ChunkMetadata = TemporalRetentionHeader;
export class MemoryRetentionError extends Error {
  override readonly name = 'MemoryRetentionError';
}

/** Read metadata before bodies. The caller retains the same authority/privacy
 * fence across this await and the final disclosure. Shared source IDs grant nothing. */
export async function readTemporalHistory(
  db: SqlDatabase,
  scope: MemoryScope,
  context: TemporalHistoryReadContext,
  query: TemporalHistoryQuery,
): Promise<TemporalHistoryPage> {
  if (context.worldId !== scope.worldId || context.actorId !== scope.actorId)
    throw new MemoryRetentionError('Foreign temporal history scope.');
  if (query.cut?.epoch === null) return { entries: [], incomplete: true, hasMore: false };
  const head = await db
    .prepare('SELECT generation FROM world_head WHERE world_id=?')
    .get(scope.worldId);
  if (head?.['generation'] !== scope.generation)
    throw new MemoryRetentionError('Temporal history changed before selection.');
  const from = Math.max(query.from ?? 0, context.at - context.maxAgeSeconds);
  const through = Math.min(query.through ?? context.at, context.at);
  const subjects = query.subjects ?? [];
  if (subjects.length > context.maximumSubjects)
    throw new MemoryRetentionError('Temporal history selection exceeds its subject allowance.');
  const limit = Math.max(1, Math.min(128, query.limit ?? 128));
  const maxBytes = Math.max(1, Math.min(maximumPreparation, query.bytes ?? 8192));
  const metadata = await db
    .prepare(
      `SELECT id,logical_bytes,receipt_count,
      first_at,first_order,receipt_epoch,first_ordinal,
      encoded_bytes FROM mind_temporal_pages c
    WHERE world_id=? AND actor_id=? AND last_at>=? AND first_at<=? AND last_received_at+?>?
      AND c.retired_revision IS NULL
      AND (c.kind<>'span' OR EXISTS(SELECT 1 FROM mind_temporal_span_ranges r
        WHERE r.world_id=c.world_id AND r.actor_id=c.actor_id AND r.page_id=c.id
          AND numrange(r.first_at::numeric,r.last_at::numeric,'[]') && numrange(?::numeric,?::numeric,'[]')
          ${subjects.length ? `AND (r.subject_key=ANY(?::text[])${query.includeGeometry ? ' OR c.spatial_context=1' : ''})` : ''}))
      ${subjects.length ? `AND ((c.lookup_buckets && ?::smallint[] AND c.subjects && ?::text[])${query.includeGeometry ? ' OR c.spatial_context=1' : ''})` : ''}
      ${query.measurements ? 'AND last_supported_at>=? AND first_measured_at<=?' : ''}
      ${query.physicalLife === undefined ? '' : 'AND physical_life=?'}
      ${query.epoch === undefined ? '' : 'AND receipt_epoch=?'}
      ${query.cut ? 'AND first_order<=? AND (physical_life<>? OR receipt_epoch<>? OR first_ordinal<=?)' : ''}
      ${query.before ? 'AND (first_at<? OR (first_at=? AND (first_order<? OR (first_order=? AND (receipt_epoch<? OR (receipt_epoch=? AND first_ordinal<?))))))' : ''}
    ORDER BY ${query.measurements ? 'last_supported_at' : 'last_at'} DESC,last_order DESC,receipt_epoch DESC,last_ordinal DESC LIMIT ?`,
    )
    .all(
      scope.worldId,
      scope.actorId,
      from,
      through,
      context.maxAgeSeconds,
      context.at,
      from,
      through,
      ...(subjects.length ? [subjects] : []),
      ...(subjects.length ? [receiptLookupBuckets('subjects', subjects), subjects] : []),
      ...(query.measurements ? [query.measurements.from, query.measurements.through] : []),
      ...(query.physicalLife === undefined ? [] : [query.physicalLife]),
      ...(query.epoch === undefined ? [] : [query.epoch]),
      ...(query.cut
        ? [
            query.cut.throughOrder,
            query.cut.physicalLife,
            query.cut.epoch,
            query.cut.throughOrdinal,
          ]
        : []),
      ...(query.before
        ? [
            query.before.at,
            query.before.at,
            query.before.order,
            query.before.order,
            query.before.epoch,
            query.before.epoch,
            query.before.ordinal,
          ]
        : []),
      limit + 1,
    );
  const pages = new Map<string, TemporalPage>();
  const selected: string[] = [];
  const sourceIds = new Set<string>();
  const metadataCursor = (row: Record<string, unknown>) => ({
    at: Number(row['first_at']),
    order: Number(row['first_order']),
    epoch: String(row['receipt_epoch']),
    ordinal: Number(row['first_ordinal']),
  });
  let metadataBefore: TemporalHistoryPage['nextBefore'];
  let preparationBytes = 0,
    count = 0,
    incomplete = metadata.length > limit || !!context.recordingGap || context.captureIncomplete,
    hasMore = metadata.length > limit;
  for (const row of metadata.slice(0, limit)) {
    const size = Number(row['encoded_bytes']);
    if (preparationBytes + size > maximumPreparation) {
      incomplete = true;
      hasMore = true;
      if (!selected.length) metadataBefore = metadataCursor(row);
      break;
    }
    metadataBefore = metadataCursor(row);
    selected.push(String(row['id']));
    preparationBytes += size;
    count += Number(row['receipt_count']);
    if (count >= limit) {
      incomplete ||= selected.length < metadata.length;
      hasMore ||= selected.length < metadata.length;
      break;
    }
  }
  if (selected.length)
    for (const row of await db
      .prepare(
        'SELECT * FROM mind_temporal_pages WHERE world_id=? AND actor_id=? AND id=ANY(?::text[])',
      )
      .all(scope.worldId, scope.actorId, selected)) {
      const chunk = readTemporalPageRecord(row);
      if (chunk.actorId !== scope.actorId)
        throw new MemoryRetentionError('Foreign temporal chunk.');
      pages.set(chunk.id, chunk);
    }
  for (const chunk of context.pages)
    if (
      chunk.throughAt >= from &&
      chunk.fromAt <= through &&
      (!subjects.length ||
        query.includeGeometry ||
        chunk.subjects.some((subject) => subjects.includes(subject))) &&
      (query.physicalLife === undefined || chunk.physicalLife === query.physicalLife) &&
      (query.epoch === undefined || chunk.epoch === query.epoch) &&
      (!query.cut ||
        temporalPageReceipts(chunk).some((receipt) =>
          temporalReceiptWithinPrefix(receipt, query.cut!),
        ))
    ) {
      pages.set(chunk.id, chunk);
    }
  // Successful support and measurement may precede the requested range. Seek
  // exact member neighbors in SQL, rather than replaying every older check page.
  const members = new Map<
    string,
    { member: string; bucket: number; life: number; epoch: string; at: number; order: number }
  >();
  for (const receipt of [
    ...context.open.map((interval) => interval.receipt),
    ...[...pages.values()].flatMap((page) => temporalPageReceipts(page)),
  ])
    for (const field of receipt.facets) {
      if (members.size >= context.maximumOperations) {
        incomplete = true;
        break;
      }
      const member = temporalMemberKey(receipt, field.ordinal);
      members.set(member, {
        member,
        bucket: receiptLookupBuckets('members', [member])[0]!,
        life: receipt.physicalLife,
        epoch: receipt.epoch,
        at: through,
        order: query.cut?.throughOrder ?? Number.MAX_SAFE_INTEGER,
      });
    }
  if (members.size) {
    const neighbors = await db
      .prepare(
        `WITH wanted AS MATERIALIZED (
      SELECT * FROM jsonb_to_recordset(?::jsonb) q(member text,bucket smallint,life bigint,epoch text,at double precision,"order" bigint)
    ), selected AS (
      SELECT p.id,p.encoded_bytes FROM wanted q CROSS JOIN LATERAL (
        SELECT c.id,c.encoded_bytes FROM mind_temporal_pages c
        WHERE c.world_id=? AND c.actor_id=? AND c.physical_life=q.life AND c.receipt_epoch=q.epoch
          AND c.kind='check' AND c.retired_revision IS NULL
          AND c.lookup_buckets @> ARRAY[q.bucket]::smallint[] AND c.member_keys @> ARRAY[q.member]::text[]
          AND (c.first_at,c.first_order)<=(q.at,q."order")
        ORDER BY c.first_at DESC,c.first_order DESC,c.id DESC LIMIT 1
      ) p
      UNION ALL
      SELECT p.id,p.encoded_bytes FROM wanted q CROSS JOIN LATERAL (
        SELECT c.id,c.encoded_bytes FROM mind_temporal_pages c
        WHERE c.world_id=? AND c.actor_id=? AND c.physical_life=q.life AND c.receipt_epoch=q.epoch
          AND c.kind='check' AND c.retired_revision IS NULL
          AND c.lookup_buckets @> ARRAY[q.bucket]::smallint[] AND c.member_keys @> ARRAY[q.member]::text[]
          AND (c.first_at,c.first_order)>(q.at,q."order")
        ORDER BY c.first_at,c.first_order,c.id LIMIT 1
      ) p
    ) SELECT DISTINCT id,encoded_bytes FROM selected`,
      )
      .all(
        JSON.stringify([...members.values()]),
        scope.worldId,
        scope.actorId,
        scope.worldId,
        scope.actorId,
      );
    const newIds: string[] = [];
    for (const row of neighbors)
      if (!pages.has(String(row['id']))) {
        preparationBytes += Number(row['encoded_bytes']);
        if (preparationBytes > maximumPreparation) {
          incomplete = true;
          break;
        }
        newIds.push(String(row['id']));
      }
    if (newIds.length)
      for (const row of await db
        .prepare(
          'SELECT * FROM mind_temporal_pages WHERE world_id=? AND actor_id=? AND id=ANY(?::text[])',
        )
        .all(scope.worldId, scope.actorId, newIds)) {
        const page = readTemporalPageRecord(row);
        pages.set(String(row['id']), page);
      }
  }
  // Captured native operations replace the same logical durable operations before
  // limits. Physical page names differ after save packing and grant no identity.
  const nativeKeys = new Set(
    context.pages.flatMap((page) =>
      page.operations.map((op) => JSON.stringify([page.physicalLife, page.epoch, op.ordinal])),
    ),
  );
  for (const [id, page] of pages) {
    if (context.pages.includes(page)) continue;
    const kept = page.operations.filter(
      (op) => !nativeKeys.has(JSON.stringify([page.physicalLife, page.epoch, op.ordinal])),
    );
    if (!kept.length) pages.delete(id);
    else if (kept.length !== page.operations.length)
      pages.set(id, temporalPageSelection(page, kept, page.id));
  }
  // Each selected page decodes without a predecessor-page replay chain.
  for (const chunk of pages.values())
    for (const id of temporalPageReferences(chunk)) sourceIds.add(id);
  preparationBytes = [...pages.values()].reduce(
    (bytes, chunk) => bytes + Buffer.byteLength(JSON.stringify(chunk)),
    0,
  );
  const sources: Record<string, { value: ReceivedValueFragment }> = {},
    missing: string[] = [];
  for (const id of sourceIds.keys()) {
    const value = context.sources[id]?.value;
    if (value) {
      sources[id] = { value };
      preparationBytes += Buffer.byteLength(JSON.stringify(value));
    } else missing.push(id);
  }
  const unavailable = () => ({
    entries: [],
    incomplete: true,
    hasMore: !!metadataBefore,
    ...(metadataBefore ? { nextBefore: metadataBefore } : {}),
  });
  if (preparationBytes > maximumPreparation || missing.length > maximumTemporalPreparationRows)
    return unavailable();
  if (missing.length) {
    const args = [scope.worldId, missing];
    const sizes = await db
      .prepare(
        `SELECT SUM(octet_length((payload::json->'value')::text)) AS bytes
      FROM mind_perception_values WHERE world_id=? AND source_id=ANY(?::text[])`,
      )
      .get(...args);
    preparationBytes += Number(sizes?.['bytes'] ?? 0);
    if (preparationBytes > maximumPreparation) return unavailable();
    for (const row of await db
      .prepare(
        `SELECT source_id,(payload::json->'value')::text AS payload
      FROM mind_perception_values WHERE world_id=? AND source_id=ANY(?::text[])`,
      )
      .all(...args)) {
      if (typeof row['payload'] === 'string')
        sources[String(row['source_id'])] = {
          value: JSON.parse(row['payload']) as ReceivedValueFragment,
        };
    }
  }

  const selection = selectCapturedTemporalHistory(
    { ...context, pages: [...pages.values()], sources },
    { ...query, from, through, limit, bytes: maxBytes, operations: context.maximumOperations },
  );
  incomplete ||= selection.incomplete;
  hasMore ||= selection.hasMore === true;
  const nextBefore = hasMore ? (selection.examinedBefore ?? metadataBefore) : undefined;
  return { ...selection, incomplete, hasMore, ...(nextBefore ? { nextBefore } : {}) };
}

/** Exact canonical row deletions join the normal ordered world transaction.
 * No independent archive, asynchronous delete race or provider consolidation. */
export async function prepareTemporalRetention(
  db: SqlDatabase,
  state: SavedWorld,
  complete = false,
  pending?: RecordChanges,
  previous?: WorldState,
  retainedMetadata?: RetentionMetadataView,
): Promise<PreparedMemoryRetention> {
  if (!retainedMetadata)
    throw new MemoryRetentionError('Complete personal retention metadata is unavailable.');

  const temporal = state.world.experience?.temporal;
  const rows = new Map<string, string[]>();
  const positions = new Map<string, Map<string, number>>();
  const coldPrevious = new Map<string, Map<string, unknown>>();
  const remember = (table: string, id: string, value: unknown) => {
    let records = coldPrevious.get(table);
    if (!records) coldPrevious.set(table, (records = new Map()));
    records.set(id, value);
  };
  let preparationBytes = 0;
  const partials: Array<{
    actorId: string;
    metadata: ChunkMetadata;
    followingAt?: number;
  }> = [];
  const policy = selectedTemporalPolicy(state.world).recent;
  const retired: Array<{
    actorId: string;
    ids: string[];
    bytes: number;
    count: number;
    nextDue: number | null;
    through: number;
  }> = [];
  const possibleSources = new Set<string>();
  const blocked = new Set(pending?.deletes.get('mind_temporal_pages') ?? []);
  if (!complete)
    for (const row of pending?.writes.get('mind_temporal_pages') ?? []) blocked.add(row.id);
  for (const intent of pending?.temporal?.values() ?? [])
    blocked.add(temporalPageRecordId(intent.after.actorId, intent.after.id));
  for (const [actorId, actor] of Object.entries(temporal?.actors ?? {})) {
    if (
      !actor.maintenanceDue &&
      actor.bytes <= policy.maxBytes &&
      actor.count <= policy.maxChanges &&
      (actor.nextDue === null || actor.nextDue > state.world.simTime)
    )
      continue;
    for (const page of actor.pages)
      if (!retirableTemporalPage(page)) blocked.add(temporalPageRecordId(actorId, page.id));
    const deferred = actor.pages.filter((page) =>
      blocked.has(temporalPageRecordId(actorId, page.id)),
    );
    const metadata = new Map<string, ChunkMetadata>();
    for (const row of complete
      ? []
      : retainedMetadata
        ? [...retainedMetadata.rows('mind_temporal_pages', actorId)].map<Record<string, unknown>>(
            (row) => ({
              ...row.columns,
              id: row.id,
              position: row.position,
              encoded_bytes: row.encodedBytes,
              value_refs: [] as string[],
            }),
          )
        : [])
      metadata.set(String(row['source_id']), {
        id: String(row['id']),
        position: Number(row['position']),
        encodedBytes: Number(row['encoded_bytes']),
        sourceId: String(row['source_id']),
        at: Number(row['last_received_at']),
        through: Number(row['last_received_at']),
        bytes: Number(row['logical_bytes']),
        count: Number(row['receipt_count']),
        sources: retainedMetadata ? [] : (row['value_refs'] as string[]),
        order: Number(row['first_order']),
        epoch: String(row['receipt_epoch']),
        ordinal: Number(row['first_ordinal']),
      });
    for (const [id, header] of metadata) if (blocked.has(header.id)) metadata.delete(id);
    for (const chunk of actor.pages)
      if (retirableTemporalPage(chunk) && !blocked.has(temporalPageRecordId(actorId, chunk.id)))
        metadata.set(chunk.id, {
          id: temporalPageRecordId(actorId, chunk.id),
          position: metadata.get(chunk.id)?.position,
          sourceId: chunk.id,
          at: temporalPageLastReceivedAt(chunk),
          through: temporalPageLastReceivedAt(chunk),
          bytes: chunk.bytes,
          count: chunk.count,
          sources: [...temporalPageReferences(chunk)],
          order: temporalOperationHeader(chunk, temporalPageOperations(chunk)[0]!).order,
          epoch: chunk.epoch,
          ordinal: chunk.fromOrdinal,
        });
    const ordered = [...metadata.values()].sort(compareTemporalRetentionHeaders);
    const deferredDue = deferred.reduce(
      (at, page) => Math.min(at, temporalPageLastReceivedAt(page) + policy.maxAgeSeconds),
      Infinity,
    );
    const selected = selectTemporalRetirement(state.world, actorId, ordered);
    const ids = selected.retired.map((chunk) => chunk.sourceId),
      recordIds = selected.retired.map((chunk) => chunk.id);
    const removedBytes = selected.retired.reduce((sum, chunk) => sum + chunk.bytes, 0),
      removedCount = selected.retired.reduce((sum, chunk) => sum + chunk.count, 0),
      bytes = actor.bytes - removedBytes,
      count = actor.count - removedCount,
      through = Math.max(0, ...selected.retired.map((chunk) => chunk.through)),
      candidateDue = Math.min(selected.nextDue ?? Infinity, deferredDue),
      nextDue =
        deferred.length && (bytes > policy.maxBytes || count > policy.maxChanges)
          ? state.world.simTime
          : Number.isFinite(candidateDue)
            ? candidateDue
            : null;
    if (selected.partial && selected.boundary)
      partials.push({ actorId, metadata: selected.boundary });
    for (const chunk of selected.retired) {
      for (const source of chunk.sources) possibleSources.add(source);
    }
    if (
      (bytes > policy.maxBytes || count > policy.maxChanges) &&
      !deferred.length &&
      !partials.some((partial) => partial.actorId === actorId)
    )
      throw new MemoryRetentionError(
        'Required native recording cannot fit the qualified recent-history envelope.',
      );
    if (ids.length || actor.maintenanceDue || actor.nextDue !== nextDue) {
      retired.push({ actorId, ids, bytes: removedBytes, count: removedCount, nextDue, through });
      if (recordIds.length)
        rows.set('mind_temporal_pages', [...(rows.get('mind_temporal_pages') ?? []), ...recordIds]);
    }
  }
  if (!retired.length && !partials.length && !possibleSources.size) return { state, rows };
  let world = retired.length
    ? updateWorld(
        state.world,
        (draft) => {
          for (const release of retired)
            retireTemporalPages(
              draft,
              release.actorId,
              release.ids,
              release,
              release.nextDue,
              release.through,
            );
        },
        { retainNativeValues: true },
      )
    : state.world;
  if (partials.length) {
    // A logical chunk can span several receptions. Expire the exact old prefix,
    // not its still-recent suffix, and hydrate only the boundary pages selected
    // above. Existing semantic retirement also revokes their old perspective rows.
    const pages = new Map<string, TemporalPage>();
    const coldIds: string[] = [];
    for (const { actorId, metadata } of partials) {
      const resident = world.experience!.temporal!.actors[actorId]!.pages.find(
        (chunk) => chunk.id === metadata.sourceId,
      );
      if (resident) pages.set(metadata.id, resident);
      else {
        if (complete || metadata.encodedBytes === undefined)
          throw new MemoryRetentionError('Recent expiry has no complete boundary chunk.');
        preparationBytes += metadata.encodedBytes;
        coldIds.push(metadata.id);
      }
    }
    if (preparationBytes > maximumPreparation)
      throw new MemoryRetentionError('Recent expiry exceeds bounded preparation.');
    if (coldIds.length)
      for (const row of await db
        .prepare('SELECT * FROM mind_temporal_pages WHERE world_id=? AND id=ANY(?::text[])')
        .all(world.id, coldIds)) {
        const chunk = immutableDataSnapshot(readTemporalPageRecord(row));
        pages.set(String(row['id']), chunk);
        remember('mind_temporal_pages', String(row['id']), chunk);
      }
    const missing = new Set<string>();
    for (const { actorId, metadata } of partials) {
      const chunk = pages.get(metadata.id);
      if (!chunk || chunk.actorId !== actorId || chunk.id !== metadata.sourceId)
        throw new MemoryRetentionError('Recent expiry boundary chunk is unavailable.');
      for (const id of temporalPageReferences(chunk)) {
        possibleSources.add(id);
        if (!world.receivedValues?.sources[id]) missing.add(id);
      }
    }
    const loaded = new Map<string, ReceivedValue>();
    if (missing.size && !complete) {
      const size = await db
        .prepare(
          'SELECT SUM(octet_length(payload)) AS bytes FROM mind_perception_values WHERE world_id=? AND source_id=ANY(?::text[])',
        )
        .get(world.id, [...missing]);
      preparationBytes += Number(size?.['bytes'] ?? 0);
      if (preparationBytes > maximumPreparation)
        throw new MemoryRetentionError('Recent expiry exceeds bounded preparation.');
      for (const row of await db
        .prepare(
          'SELECT id,payload FROM mind_perception_values WHERE world_id=? AND source_id=ANY(?::text[])',
        )
        .all(world.id, [...missing])) {
        const block = immutableDataSnapshot(JSON.parse(String(row['payload']))) as ReceivedValue;
        loaded.set(block.id, block);
        remember('mind_perception_values', String(row['id']), block);
        let held = positions.get('mind_perception_values');
        if (!held) positions.set('mind_perception_values', (held = new Map()));
        held.set(String(row['id']), 0);
      }
    }
    if ([...missing].some((id) => !loaded.has(id)))
      throw new MemoryRetentionError('Recent expiry requires an unavailable received value.');
    world = updateWorld(
      world,
      (draft) => {
        for (const [id, block] of loaded) draft.receivedValues!.sources[id] = block;
        for (const { actorId, metadata, followingAt } of partials) {
          const actor = draft.experience!.temporal!.actors[actorId]!;
          const chunk = pages.get(metadata.id)!;
          if (!actor.pages.some((current) => current.id === chunk.id)) {
            actor.pages.push({ ...chunk });
            actor.pages.sort((a, b) => a.fromAt - b.fromAt || a.fromOrdinal - b.fromOrdinal);
          }
          const actual = temporalPageOperations(chunk),
            expired = new Set<number>();
          const excessCount = Math.max(0, actor.count - policy.maxChanges),
            excessBytes = Math.max(0, actor.bytes - policy.maxBytes);
          const quotaPressure = excessBytes > 0 || excessCount > 0;
          let releasedCount = 0,
            releasedBytes = 0,
            first: (typeof actual)[number] | undefined;
          for (const operation of actual) {
            if (
              temporalRecentAt(
                temporalOperationLastReceivedAt(operation),
                world.simTime,
                policy.maxAgeSeconds,
              ) &&
              releasedCount >= excessCount &&
              releasedBytes >= excessBytes
            ) {
              first = operation;
              break;
            }
            expired.add(operation.ordinal);
            releasedCount += operation.charge.count;
            releasedBytes += operation.charge.bytes;
          }
          const followingDue =
            followingAt === undefined ? null : followingAt + policy.maxAgeSeconds;
          if (expired.size)
            retireTemporalOperations(
              draft,
              actorId,
              chunk.id,
              expired,
              first ? temporalOperationLastReceivedAt(first) + policy.maxAgeSeconds : followingDue,
            );
          else if (!quotaPressure)
            throw new MemoryRetentionError('Recent expiry metadata disagrees with its operations.');
          if (quotaPressure && !actor.pages.some((page) => page.id === chunk.id))
            actor.recordingGap = {
              from: actor.recordingGap?.from ?? temporalOperationLastReceivedAt(actual.at(-1)!),
              through: draft.simTime,
            };
          rows.set('mind_temporal_pages', [
            ...(rows.get('mind_temporal_pages') ?? []),
            metadata.id,
          ]);
          if (metadata.position !== undefined) {
            let held = positions.get('mind_temporal_pages');
            if (!held) positions.set('mind_temporal_pages', (held = new Map()));
            held.set(metadata.id, metadata.position);
          }
        }
      },
      { retainNativeValues: true },
    );
  }
  // No cold ownership discovery on this path: only the exact logical release and intent.
  return {
    state: world === state.world ? state : { ...state, world },
    rows,
    ...(positions.size ? { positions } : {}),
    ...(coldPrevious.size ? { previous: coldPrevious } : {}),
  };
}
