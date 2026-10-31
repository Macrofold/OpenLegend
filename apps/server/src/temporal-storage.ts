import { currentFacetEntries, currentFacetGet } from '@open-legend/domain';
import {
  receiptLookupBuckets,
  restoreEvidenceLayout,
  receivedValueSql,
} from './evidence-segments.js';
import {
  selectedTemporalPolicy,
  captureTemporalReadContext,
  type TemporalReadContext,
  canonicalJson,
  immutableDataSnapshot,
  appendedRecordCount,
  selectedAttentionPolicy,
  temporalFacetEligible,
  retireTemporalChunks,
  temporalChunkReceipts,
  temporalChunkOperations,
  temporalOperationHeader,
  temporalReceiptChangeCount,
  temporalChunkConfirmationOperations,
  temporalConfirmationChangeCount,
  temporalChunkReferences,
  selectCapturedTemporalHistory,
  temporalFacetValueReferences,
  retireTemporalReceipts,
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
  type TemporalChunk,
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
const maximumRows = 8192;
export const temporalChunkRecordId = (actorId: string, id: string) =>
  JSON.stringify(['world', 'experience', 'temporal', 'actors', actorId, 'chunks', id]);
/** Exact value membership is a derived column on the existing chunk, not a
 * second owner or one SQL row per received coordinate. */
export function temporalChunkValueReferences(chunk: TemporalChunk): string[] {
  return [...temporalChunkReferences(chunk)].sort();
}

/** This projection controls payload reclamation, so a malformed saved index
 * must refuse before it can erase a still-owned value. */
export function readTemporalChunkRecord(row: Record<string, unknown>): TemporalChunk {
  const parsed = JSON.parse(String(row['payload']));
  const chunk = restoreEvidenceLayout(parsed, row['segments']) as unknown as TemporalChunk;
  validateTemporalChunkValueReferences(chunk, row['value_refs']);
  return chunk;
}
export function validateTemporalChunkValueReferences(
  chunk: TemporalChunk,
  references: unknown,
): void {
  if (canonicalJson(references) !== canonicalJson(temporalChunkValueReferences(chunk)))
    throw new MemoryRetentionError('Temporal value ownership metadata disagrees with its receipt.');
}
export function temporalChunkSourceId(actorId: string, recordId: string): string | undefined {
  const path = JSON.parse(recordId) as unknown;
  if (!Array.isArray(path) || typeof path.at(-1) !== 'string') return;
  const id = path.at(-1) as string;
  return temporalChunkRecordId(actorId, id) === recordId ? id : undefined;
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
  readonly at: number;
  readonly maxAgeSeconds: number;
}
export function temporalHistoryWindow(world: WorldState): TemporalHistoryWindow {
  return { at: world.simTime, maxAgeSeconds: selectedTemporalPolicy(world).recent.maxAgeSeconds };
}
export interface TemporalHistoryReadContext {
  readonly worldId: string;
  readonly actorId: string;
  readonly at: number;
  readonly maxAgeSeconds: number;
  readonly maximumSubjects: number;
  readonly maximumOperations: number;
  readonly maximumCandidates: number;
  readonly chunks: readonly TemporalChunk[];
  readonly releasedThrough?: number;
  readonly recordingGap?: { readonly from: number; readonly through: number };
  readonly sources: ReceivedValueLookup;
  readonly disclosure: TemporalReadContext;
}
export function captureTemporalHistoryReadContext(
  world: WorldState,
  actorId: string,
): TemporalHistoryReadContext {
  const actor = world.experience?.temporal?.actors[actorId];
  const chunks = (actor?.chunks ?? []).map((chunk) => immutableDataSnapshot(chunk));
  const sources: Record<string, ReceivedValueLookup[string]> = {};
  for (const chunk of chunks)
    for (const id of temporalChunkReferences(chunk)) {
      const source = world.receivedValues?.sources[id];
      if (!source) continue;
      sources[id] = { value: immutableDataSnapshot(source.value) };
    }
  return {
    worldId: world.id,
    actorId,
    at: world.simTime,
    maxAgeSeconds: selectedTemporalPolicy(world).recent.maxAgeSeconds,
    maximumSubjects: selectedAttentionPolicy(world).maximumCapacity,
    maximumOperations: selectedAttentionPolicy(world).scene.historyReceipts,
    maximumCandidates: selectedAttentionPolicy(world).scene.candidateVisits,
    chunks,
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
      if (actor.chunks === next?.chunks) continue;
      const chunks = new Map((next?.chunks ?? []).map((chunk) => [chunk.id, chunk]));
      for (const chunk of actor.chunks) {
        const retained = chunks.get(chunk.id);
        if (
          chunk === retained ||
          (retained && appendedRecordCount(chunk.entries, retained.entries) !== undefined)
        )
          continue;
        // A surviving block ID can still lose an individual payload ordinal.
        for (const id of chunk.sourceRefs) candidates.add(id);
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

/** Saved counters select actors before any cold metadata is read. */
export function* retentionDueActors(world: WorldState): Generator<string> {
  const policy = selectedTemporalPolicy(world);
  for (const [id, actor] of Object.entries(world.experience?.temporal?.actors ?? {}))
    if (
      actor.maintenanceDue ||
      actor.bytes > policy.recent.maxBytes ||
      actor.count > policy.recent.maxChanges ||
      (actor.nextDue !== null && actor.nextDue <= world.simTime) ||
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

interface ChunkMetadata {
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
      encoded_bytes FROM mind_temporal_chunks_read c
    WHERE world_id=? AND actor_id=? AND last_at>=? AND first_at<=?
      ${subjects.length ? `AND EXISTS (SELECT 1 FROM mind_temporal_segments s WHERE s.world_id=c.world_id AND s.parent_id=c.id AND ((s.lookup_buckets && ?::smallint[] AND s.subjects && ?::text[])${query.includeGeometry ? ' OR s.spatial_context=1' : ''}))` : ''}
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
  const chunks = new Map<string, TemporalChunk>();
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
    incomplete = metadata.length > limit || !!context.recordingGap,
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
        'SELECT payload,segments,value_refs FROM mind_temporal_chunks_read WHERE world_id=? AND actor_id=? AND id=ANY(?::text[])',
      )
      .all(scope.worldId, scope.actorId, selected)) {
      const chunk = readTemporalChunkRecord(row);
      if (chunk.actorId !== scope.actorId)
        throw new MemoryRetentionError('Foreign temporal chunk.');
      chunks.set(chunk.id, chunk);
    }
  for (const chunk of context.chunks)
    if (
      chunk.throughAt >= from &&
      chunk.fromAt <= through &&
      (!subjects.length ||
        query.includeGeometry ||
        chunk.subjects.some((subject) => subjects.includes(subject))) &&
      (query.physicalLife === undefined || chunk.physicalLife === query.physicalLife) &&
      (query.epoch === undefined || chunk.epoch === query.epoch) &&
      (!query.cut ||
        temporalChunkReceipts(chunk).some((receipt) =>
          temporalReceiptWithinPrefix(receipt, query.cut!),
        ))
    ) {
      chunks.set(chunk.id, chunk);
    }
  // A bounded chunk is self-contained: its checkpoints and intervening scalar
  // assignments can support a selected suffix without another chunk chain.
  for (const chunk of chunks.values())
    for (const id of temporalChunkReferences(chunk)) sourceIds.add(id);
  preparationBytes = [...chunks.values()].reduce(
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
  if (preparationBytes > maximumPreparation || missing.length > maximumRows) return unavailable();
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
    { ...context, chunks: [...chunks.values()], sources },
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
  const cutoff = state.world.simTime - policy.maxAgeSeconds;
  const retired: Array<{
    actorId: string;
    ids: string[];
    bytes: number;
    count: number;
    nextDue: number | null;
    through: number;
  }> = [];
  const possibleSources = new Set<string>();
  for (const [actorId, actor] of Object.entries(temporal?.actors ?? {})) {
    if (
      !actor.maintenanceDue &&
      actor.bytes <= policy.maxBytes &&
      actor.count <= policy.maxChanges &&
      (actor.nextDue === null || actor.nextDue > state.world.simTime)
    )
      continue;
    const metadata = new Map<string, ChunkMetadata>();
    for (const row of complete
      ? []
      : retainedMetadata
        ? [...retainedMetadata.rows('mind_temporal_chunks', actorId)].map<Record<string, unknown>>(
            (row) => ({
              ...row.columns,
              id: row.id,
              position: row.position,
              encoded_bytes: row.encodedBytes,
              source_refs: [] as string[],
            }),
          )
        : [])
      metadata.set(String(row['source_id']), {
        id: String(row['id']),
        position: Number(row['position']),
        encodedBytes: Number(row['encoded_bytes']),
        sourceId: String(row['source_id']),
        at: Number(row['first_at']),
        through: Number(row['last_at']),
        bytes: Number(row['logical_bytes']),
        count: Number(row['receipt_count']),
        sources: retainedMetadata ? [] : (row['source_refs'] as string[]),
        order: Number(row['first_order']),
        epoch: String(row['receipt_epoch']),
        ordinal: Number(row['first_ordinal']),
      });
    for (const chunk of actor.chunks)
      metadata.set(chunk.id, {
        id: temporalChunkRecordId(actorId, chunk.id),
        position: metadata.get(chunk.id)?.position,
        sourceId: chunk.id,
        at: chunk.fromAt,
        through: chunk.throughAt,
        bytes: chunk.bytes,
        count: chunk.count,
        sources: chunk.sourceRefs,
        order: temporalOperationHeader(chunk, temporalChunkOperations(chunk)[0]!).order,
        epoch: chunk.epoch,
        ordinal: chunk.fromOrdinal,
      });
    let bytes = actor.bytes,
      count = actor.count,
      removedBytes = 0,
      removedCount = 0,
      through = 0;
    const ids: string[] = [],
      recordIds: string[] = [];
    let nextDue: number | null = null;
    const ordered = [...metadata.values()].sort(
      (a, b) =>
        a.at - b.at || a.order - b.order || a.epoch.localeCompare(b.epoch) || a.ordinal - b.ordinal,
    );
    for (let index = 0; index < ordered.length; index++) {
      const chunk = ordered[index]!;
      const excessBytes = Math.max(0, bytes - policy.maxBytes);
      const excessCount = Math.max(0, count - policy.maxChanges);
      // Retire completed oldest pages under optional pressure. A current page
      // may itself exceed an authored count/byte allowance; retain its newest
      // fitting complete operations through one exact prefix below.
      if (
        chunk.through > cutoff &&
        ((!excessBytes && !excessCount) || index === ordered.length - 1)
      ) {
        nextDue = chunk.through + policy.maxAgeSeconds;
        if (excessBytes || excessCount)
          partials.push({
            actorId,
            metadata: chunk,
            followingAt: ordered[index + 1]?.at,
          });
        break;
      }
      if (ids.length >= maximumRows) {
        nextDue = chunk.at + policy.maxAgeSeconds;
        break;
      }
      ids.push(chunk.sourceId);
      recordIds.push(chunk.id);
      bytes -= chunk.bytes;
      count -= chunk.count;
      removedBytes += chunk.bytes;
      removedCount += chunk.count;
      through = Math.max(through, chunk.through);
      for (const source of chunk.sources) possibleSources.add(source);
      if (retainedMetadata)
        for (const segment of retainedMetadata.segments(chunk.id))
          for (const source of segment.columns['source_refs'] as string[])
            possibleSources.add(source);
    }
    if (
      (bytes > policy.maxBytes || count > policy.maxChanges) &&
      !partials.some((partial) => partial.actorId === actorId)
    )
      throw new MemoryRetentionError(
        'Required native recording cannot fit the qualified recent-history envelope.',
      );
    if (ids.length || actor.maintenanceDue || actor.nextDue !== nextDue) {
      retired.push({ actorId, ids, bytes: removedBytes, count: removedCount, nextDue, through });
      if (recordIds.length)
        rows.set('mind_temporal_chunks', [
          ...(rows.get('mind_temporal_chunks') ?? []),
          ...recordIds,
        ]);
    }
  }
  if (!retired.length && !partials.length && !possibleSources.size) return { state, rows };
  let world = retired.length
    ? updateWorld(
        state.world,
        (draft) => {
          for (const release of retired)
            retireTemporalChunks(
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
    // not its still-recent suffix, and hydrate only the boundary chunks selected
    // above. Existing semantic retirement also revokes their old perspective rows.
    const chunks = new Map<string, TemporalChunk>();
    const coldIds: string[] = [];
    for (const { actorId, metadata } of partials) {
      const resident = world.experience!.temporal!.actors[actorId]!.chunks.find(
        (chunk) => chunk.id === metadata.sourceId,
      );
      if (resident) chunks.set(metadata.id, resident);
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
        .prepare(
          'SELECT id,payload,segments,value_refs FROM mind_temporal_chunks_read WHERE world_id=? AND id=ANY(?::text[])',
        )
        .all(world.id, coldIds)) {
        const chunk = immutableDataSnapshot(readTemporalChunkRecord(row));
        chunks.set(String(row['id']), chunk);
        remember('mind_temporal_chunks', String(row['id']), chunk);
      }
    const missing = new Set<string>();
    for (const { actorId, metadata } of partials) {
      const chunk = chunks.get(metadata.id);
      if (!chunk || chunk.actorId !== actorId || chunk.id !== metadata.sourceId)
        throw new MemoryRetentionError('Recent expiry boundary chunk is unavailable.');
      for (const id of chunk.sourceRefs) {
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
          const chunk = chunks.get(metadata.id)!;
          if (!actor.chunks.some((current) => current.id === chunk.id)) {
            actor.chunks.push({ ...chunk });
            actor.chunks.sort((a, b) => a.fromAt - b.fromAt || a.fromOrdinal - b.fromOrdinal);
          }
          const actual = temporalChunkReceipts(chunk),
            expired = new Set<number>(),
            confirmations = new Map<number, number>();
          for (const operation of temporalChunkConfirmationOperations(chunk))
            confirmations.set(
              operation.receipt,
              (confirmations.get(operation.receipt) ?? 0) +
                temporalConfirmationChangeCount([operation]),
            );
          const excessCount = Math.max(0, actor.count - policy.maxChanges),
            quotaPressure = actor.bytes > policy.maxBytes || excessCount > 0;
          let releasedCount = 0,
            first: (typeof actual)[number] | undefined;
          for (const receipt of actual) {
            if (receipt.at > cutoff && releasedCount >= excessCount) {
              first = receipt;
              break;
            }
            expired.add(receipt.ordinal);
            releasedCount +=
              temporalReceiptChangeCount(receipt) + (confirmations.get(receipt.ordinal) ?? 0);
          }
          const followingDue =
            followingAt === undefined ? null : followingAt + policy.maxAgeSeconds;
          if (expired.size)
            retireTemporalReceipts(
              draft,
              actorId,
              chunk.id,
              expired,
              first ? first.at + policy.maxAgeSeconds : followingDue,
            );
          else if (!quotaPressure)
            throw new MemoryRetentionError('Recent expiry metadata disagrees with its receipts.');
          // Packed charge can change when a prefix needs carried state. A byte
          // allowance smaller than a page gets one newest-operation fallback,
          // rather than repeatedly replaying and repacking each prior receipt.
          if (actor.bytes > policy.maxBytes || actor.count > policy.maxChanges) {
            const current = actor.chunks.find((value) => value.id === chunk.id),
              retained = current && temporalChunkReceipts(current),
              newest = retained?.at(-1);
            if (followingAt === undefined && current && newest && retained && retained.length > 1)
              retireTemporalReceipts(
                draft,
                actorId,
                current.id,
                new Set(retained.slice(0, -1).map((receipt) => receipt.ordinal)),
                newest.at + policy.maxAgeSeconds,
              );
            if (actor.bytes > policy.maxBytes || actor.count > policy.maxChanges) {
              const remaining = actor.chunks.find((value) => value.id === chunk.id);
              if (!remaining)
                throw new MemoryRetentionError(
                  'Required native recording cannot fit the qualified recent-history envelope.',
                );
              retireTemporalChunks(
                draft,
                actorId,
                [remaining.id],
                { bytes: remaining.bytes, count: remaining.count },
                followingDue,
                remaining.throughAt,
              );
            }
          }
          if (quotaPressure && !actor.chunks.some((current) => current.id === chunk.id)) {
            actor.recordingGap = {
              from: actor.recordingGap?.from ?? actual.at(-1)!.at,
              through: draft.simTime,
            };
            actor.capturesInvalidated = true;
          }
          rows.set('mind_temporal_chunks', [
            ...(rows.get('mind_temporal_chunks') ?? []),
            metadata.id,
          ]);
          if (metadata.position !== undefined) {
            let held = positions.get('mind_temporal_chunks');
            if (!held) positions.set('mind_temporal_chunks', (held = new Map()));
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
