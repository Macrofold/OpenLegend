import {
  receiptLookupBuckets,
  restoreEvidenceLayout,
  snapshotEvidenceOwner,
  receivedValueEncodedBytes,
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
  currentOriginal,
  currentFacetOriginal,
  recordMapChangesBetween,
  referencedReceivedValues,
  nominateReceivedValueRetirement,
  updateWorld,
  freezeWorld,
  preserveReceivedValuePreparation,
  type WorldState,
  type TemporalChunk,
  type TemporalEvidenceState,
  type TemporalHistorySelection,
  type ReceivedValueBlock,
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
import { countMetric } from './performance.js';

const maximumPreparation = 4 * 1024 * 1024;
const maximumRows = 8192;
export const temporalChunkRecordId = (actorId: string, id: string) =>
  JSON.stringify(['world', 'experience', 'temporal', 'actors', actorId, 'chunks', id]);
/** Exact value membership is a derived column on the existing chunk, not a
 * second owner or one SQL row per received coordinate. */
export function temporalChunkValueReferences(chunk: TemporalChunk): Record<string, number[]> {
  return Object.fromEntries(
    [...temporalChunkReferences(chunk)].map(([id, ordinals]) => [
      id,
      [...ordinals].sort((a, b) => a - b),
    ]),
  );
}
/** This projection controls payload reclamation, so a malformed saved index
 * must refuse before it can erase a still-owned value. */
export function readTemporalChunkRecord(row: Record<string, unknown>): TemporalChunk {
  const parsed = JSON.parse(String(row['payload']));
  const chunk = restoreEvidenceLayout(
    parsed,
    'entries',
    row['segments'],
  ) as unknown as TemporalChunk;
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
    for (const [id, ordinals] of temporalChunkReferences(chunk)) {
      const source = world.receivedValues?.sources[id];
      if (!source) continue;
      const values = sources[id]?.values.slice() ?? [];
      for (const ordinal of ordinals) {
        const value = source.values[ordinal];
        if (value) values[ordinal] = immutableDataSnapshot(value);
      }
      sources[id] = { values };
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
    for (const reference of receivedObservationValueReferences(source))
      candidates.add(reference.blockId);
  };
  if (before?.perceptionEvidence !== after.perceptionEvidence)
    for (const [actorId, owner] of Object.entries(before?.perceptionEvidence ?? {})) {
      const current = after.perceptionEvidence?.[actorId];
      const frame = owner.visualConfirmation?.frameRef;
      const nextFrame = current?.visualConfirmation?.frameRef;
      if (frame && (!nextFrame || frame[0] !== nextFrame[0] || frame[1] !== nextFrame[1]))
        candidates.add(frame[0]);
      if (owner.originals !== current?.originals) {
        const changed =
          current?.originals && recordMapChangesBetween(owner.originals, current.originals);
        for (const key of changed ?? Object.keys(owner.originals)) {
          const original = owner.originals[key];
          if (original && original !== current?.originals[key]) addObservation(original);
        }
      }
      if (owner.received !== current?.received) {
        const retained = new Set(current?.received);
        for (const source of owner.received)
          if (!retained.has(source)) addObservation(currentOriginal(owner, source));
      }
      if (owner.current !== current?.current)
        for (const [key, lease] of Object.entries(owner.current)) {
          const next = current?.current[key];
          if (lease.original === next?.original && lease.value === next?.value) continue;
          const beforeRefs = receivedFacetValueReferences(lease.value),
            afterRefs = next ? receivedFacetValueReferences(next.value) : [];
          if (
            lease.original !== next?.original ||
            beforeRefs.length !== afterRefs.length ||
            beforeRefs.some(
              (reference, index) =>
                reference.blockId !== afterRefs[index]?.blockId ||
                reference.valueOrdinal !== afterRefs[index]?.valueOrdinal,
            )
          ) {
            for (const reference of beforeRefs) candidates.add(reference.blockId);
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
          (source && !prior && id !== after.receivedValues?.activeSource) ||
          (source &&
            prior &&
            source !== prior &&
            appendedRecordCount(prior.values, source.values) === undefined &&
            prior.values.some((value, ordinal) => value && !source.values[ordinal]))
        )
          candidates.add(id);
      }
    const append = before?.receivedValues?.activeSource;
    if (append && append !== after.receivedValues?.activeSource) candidates.add(append);
  }
  return candidates;
}

/** The command path only records release intent; it performs no ownership SQL. */
export function nominateReleasedReceivedValues(
  before: Pick<WorldState, 'receivedValues' | 'perceptionEvidence' | 'experience'> | undefined,
  world: WorldState,
  candidates: ReadonlySet<string> = receivedValueReleaseCandidates(before, world),
): WorldState {
  const nominations = new Map<string, number | null>();
  let resident: ReturnType<typeof referencedReceivedValues> | undefined;
  for (const id of candidates) {
    const candidate = world.receivedValues?.retirement?.pending[id];
    const prior = before?.receivedValues?.retirement?.pending[id];
    // Closure preparation can revisit this same transition. Its already changed
    // candidate, including a cleanup proposal, must not be nominated twice.
    if (
      candidate &&
      (!prior ||
        candidate.generation !== prior.generation ||
        candidate.stage !== prior.stage ||
        candidate.applicationRevision !== prior.applicationRevision)
    )
      continue;
    const current = world.receivedValues?.sources[id];
    if (current) {
      resident ??= referencedReceivedValues(world, { captures: false });
      const owned = resident.get(id);
      // A closed shared block is not garbage merely because its append phase
      // ended. Every live slot already has a complete resident ownership proof;
      // its actual last-owner release will nominate it again when needed.
      if (owned && current.values.every((value, ordinal) => !value || owned.has(ordinal))) {
        countMetric('persistence.receivedRetirementFullyOwned');
        continue;
      }
    }
    const block = current ?? before?.receivedValues?.sources[id];
    nominations.set(id, block ? (receivedValueEncodedBytes(block) ?? null) : null);
  }
  if (nominations.size) countMetric('persistence.receivedRetirementNominations', nominations.size);
  if (!nominations.size) return world;
  const next = updateWorld(
    world,
    (draft) => {
      nominateReceivedValueRetirement(draft, nominations);
      if (world.nativeInterval) draft.nativeInterval = { ...world.nativeInterval };
    },
    { retainNativeValues: true },
  );
  // This bookkeeping owner has finished its edit. Publish the derived physical
  // indexes now; a later generic freeze cannot certify this exact write set.
  return Object.isFrozen(world)
    ? preserveReceivedValuePreparation(world, freezeWorld(next, { completedTransition: true }))
    : next;
}

export function retentionNeedsPreparation(world: WorldState): boolean {
  const policy = selectedTemporalPolicy(world);
  return Object.values(world.experience?.temporal?.actors ?? {}).some(
    (actor) =>
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
      ),
  );
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
  const sourceIds = new Map<string, Set<number>>();
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
    for (const [id, ordinals] of temporalChunkReferences(chunk)) {
      let selected = sourceIds.get(id);
      if (!selected) sourceIds.set(id, (selected = new Set()));
      for (const ordinal of ordinals) selected.add(ordinal);
    }
  preparationBytes = [...chunks.values()].reduce(
    (bytes, chunk) => bytes + Buffer.byteLength(JSON.stringify(chunk)),
    0,
  );
  const sources: Record<string, { values: Array<ReceivedValueFragment | null | undefined> }> = {},
    missing: Array<{ block: string; ordinal: number }> = [];
  for (const [id, ordinals] of sourceIds) {
    const values: Array<ReceivedValueFragment | null | undefined> = [];
    for (const ordinal of ordinals) {
      const value = context.sources[id]?.values[ordinal];
      if (value) {
        values[ordinal] = value;
        preparationBytes += Buffer.byteLength(JSON.stringify(value));
      } else missing.push({ block: id, ordinal });
    }
    sources[id] = { values };
  }
  const unavailable = () => ({
    entries: [],
    incomplete: true,
    hasMore: !!metadataBefore,
    ...(metadataBefore ? { nextBefore: metadataBefore } : {}),
  });
  if (preparationBytes > maximumPreparation || missing.length > maximumRows) return unavailable();
  if (missing.length) {
    const slot = receivedValueSql('?', 'q.block', 'q.ordinal');
    const sizes = await db
      .prepare(
        `SELECT SUM(octet_length((${slot})::text)) AS bytes
      FROM jsonb_to_recordset(?::jsonb)q(block text,ordinal bigint)`,
      )
      .get(scope.worldId, JSON.stringify(missing));
    preparationBytes += Number(sizes?.['bytes'] ?? 0);
    if (preparationBytes > maximumPreparation) return unavailable();
    for (const row of await db
      .prepare(
        `SELECT q.block,q.ordinal,(${slot})::text AS payload
      FROM jsonb_to_recordset(?::jsonb)q(block text,ordinal bigint)`,
      )
      .all(scope.worldId, JSON.stringify(missing))) {
      if (typeof row['payload'] !== 'string') continue;
      sources[String(row['block'])]!.values[Number(row['ordinal'])] = JSON.parse(
        row['payload'],
      ) as ReceivedValueFragment;
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
): Promise<PreparedMemoryRetention> {
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
    count: number;
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
      : await db
          .prepare(
            `SELECT id,position,encoded_bytes,source_id,first_at,last_at,first_order,receipt_epoch,first_ordinal,logical_bytes,receipt_count,source_refs
      FROM mind_temporal_chunks_read WHERE world_id=? AND actor_id=? ORDER BY first_at,first_order,receipt_epoch,first_ordinal LIMIT ?`,
          )
          .all(state.world.id, actorId, maximumRows + 1))
      metadata.set(String(row['source_id']), {
        id: String(row['id']),
        position: Number(row['position']),
        encodedBytes: Number(row['encoded_bytes']),
        sourceId: String(row['source_id']),
        at: Number(row['first_at']),
        through: Number(row['last_at']),
        bytes: Number(row['logical_bytes']),
        count: Number(row['receipt_count']),
        sources: row['source_refs'] as string[],
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
        order: temporalChunkReceipts(chunk)[0]!.order,
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
      if (chunk.through > cutoff && excessBytes < chunk.bytes && excessCount < chunk.count) {
        nextDue = chunk.at + policy.maxAgeSeconds;
        if (chunk.at <= cutoff || excessBytes || excessCount)
          partials.push({
            actorId,
            metadata: chunk,
            count: excessCount,
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
  for (const id of receivedValueReleaseCandidates(previous, state.world)) possibleSources.add(id);
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
        const chunk = snapshotEvidenceOwner(readTemporalChunkRecord(row), 'entries');
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
    const loaded = new Map<string, ReceivedValueBlock>();
    if (missing.size && !complete) {
      const size = await db
        .prepare(
          'SELECT SUM(encoded_bytes) AS bytes FROM mind_perception_values_read WHERE world_id=? AND source_id=ANY(?::text[])',
        )
        .get(world.id, [...missing]);
      preparationBytes += Number(size?.['bytes'] ?? 0);
      if (preparationBytes > maximumPreparation)
        throw new MemoryRetentionError('Recent expiry exceeds bounded preparation.');
      for (const row of await db
        .prepare(
          'SELECT id,payload,segments FROM mind_perception_values_read WHERE world_id=? AND source_id=ANY(?::text[])',
        )
        .all(world.id, [...missing])) {
        const block = snapshotEvidenceOwner(
          restoreEvidenceLayout(JSON.parse(String(row['payload'])), 'values', row['segments']),
          'values',
        ) as unknown as ReceivedValueBlock;
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
        for (const { actorId, metadata } of partials) {
          const actor = draft.experience!.temporal!.actors[actorId]!;
          const chunk = chunks.get(metadata.id)!;
          if (!actor.chunks.some((current) => current.id === chunk.id)) {
            actor.chunks.push({ ...chunk, entries: [...chunk.entries] });
            actor.chunks.sort((a, b) => a.fromAt - b.fromAt || a.fromOrdinal - b.fromOrdinal);
          }
          const pressure = partials.find((partial) => partial.metadata === metadata)!;
          const expired = new Set<number>();
          const confirmationCounts = new Map<number, number>();
          for (const operation of temporalChunkConfirmationOperations(chunk))
            confirmationCounts.set(
              operation.receipt,
              (confirmationCounts.get(operation.receipt) ?? 0) +
                temporalConfirmationChangeCount([operation]),
            );
          let releasedCount = 0;
          for (const receipt of temporalChunkReceipts(chunk)) {
            if (receipt.at > cutoff && expired.size > 0 && releasedCount >= pressure.count) break;
            expired.add(receipt.ordinal);
            releasedCount +=
              temporalReceiptChangeCount(receipt) + (confirmationCounts.get(receipt.ordinal) ?? 0);
          }
          if (!expired.size)
            throw new MemoryRetentionError('Recent expiry metadata disagrees with its receipts.');
          const first = temporalChunkReceipts(chunk).find(
            (receipt) => !expired.has(receipt.ordinal),
          );
          retireTemporalReceipts(
            draft,
            actorId,
            chunk.id,
            expired,
            first
              ? first.at + policy.maxAgeSeconds
              : pressure.followingAt === undefined
                ? null
                : pressure.followingAt + policy.maxAgeSeconds,
          );
          // Packed dictionaries, checkpoints and shared values make expanded DTO
          // bytes an incorrect quota estimate. Only the native retirement owner can
          // recalculate the retained charge; release whole operations until it fits.
          while (actor.bytes > policy.maxBytes || actor.count > policy.maxChanges) {
            const current = actor.chunks.find((value) => value.id === chunk.id);
            const receipt = current && temporalChunkReceipts(current)[0];
            if (!receipt)
              throw new MemoryRetentionError(
                'Required native recording cannot fit the qualified recent-history envelope.',
              );
            const at = temporalChunkReceipts(current!)[1]?.at ?? pressure.followingAt;
            retireTemporalReceipts(
              draft,
              actorId,
              chunk.id,
              new Set([receipt.ordinal]),
              at === undefined ? null : at + policy.maxAgeSeconds,
            );
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
  world = nominateReleasedReceivedValues(previous, world, possibleSources);
  return {
    state: world === state.world ? state : { ...state, world },
    rows,
    ...(positions.size ? { positions } : {}),
    ...(coldPrevious.size ? { previous: coldPrevious } : {}),
  };
}
