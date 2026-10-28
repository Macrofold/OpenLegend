import {
  selectedTemporalPolicy,
  canonicalJson,
  appendedRecordCount,
  selectedAttentionPolicy,
  temporalFacetEligible,
  retireTemporalChunks,
  temporalReceiptWithinPrefix,
  materializeTemporalValue,
  temporalReceiptForRead,
  temporalReceiptAliases,
  temporalReceiptAccountAliases,
  selectTemporalReceiptFacets,
  receivedObservationValueReferences,
  receivedFacetValueReferences,
  referencedReceivedValues,
  pruneReceivedValueBlock,
  updateWorld,
  type WorldState,
  type TemporalChunk,
  type TemporalEvidenceState,
  type TemporalHistorySelection,
  type ReceivedValueBlock,
  type TemporalReceiptPrefix,
  type TemporalValue,
  type ReceivedObservation,
} from '@open-legend/domain';
import type { SavedWorld, SqlDatabase } from './store.js';
import type { MemoryScope } from './memory-repository.js';
import type { SourceVersionPlan } from './source-version-retention.js';
import type { RecordChanges } from './world-records.js';

const maximumPreparation = 4 * 1024 * 1024;
const maximumRows = 8192;
export const temporalChunkRecordId = (actorId: string, id: string) =>
  JSON.stringify(['world', 'experience', 'temporal', 'actors', actorId, 'chunks', id]);
/** Exact value membership is a derived column on the existing chunk, not a
 * second owner or one SQL row per received coordinate. */
export function temporalChunkValueReferences(chunk: TemporalChunk): Record<string, number[]> {
  const references = new Map<string, Set<number>>();
  for (const receipt of chunk.receipts)
    for (const reference of receipt.facets) {
      let ordinals = references.get(reference.blockId);
      if (!ordinals) references.set(reference.blockId, (ordinals = new Set()));
      ordinals.add(reference.valueOrdinal);
    }
  return Object.fromEntries(
    [...references].map(([id, ordinals]) => [id, [...ordinals].sort((a, b) => a - b)]),
  );
}
/** This projection controls payload reclamation, so a malformed saved index
 * must refuse before it can erase a still-owned value. */
export function readTemporalChunkRecord(row: Record<string, unknown>): TemporalChunk {
  const chunk = JSON.parse(String(row['payload'])) as TemporalChunk;
  if (canonicalJson(row['value_refs']) !== canonicalJson(temporalChunkValueReferences(chunk)))
    throw new MemoryRetentionError('Temporal value ownership metadata disagrees with its receipt.');
  return chunk;
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
  physicalLife?: number;
  epoch?: string;
  limit?: number;
  bytes?: number;
  cut?: TemporalReceiptPrefix;
  measurements?: { from: number; through: number };
  kinds?: readonly TemporalValue['kind'][];
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
      if (owner.received !== current?.received) {
        const retained = new Set(current?.received);
        for (const source of owner.received) if (!retained.has(source)) addObservation(source);
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
            addObservation(lease.original);
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
          (retained && appendedRecordCount(chunk.receipts, retained.receipts) !== undefined)
        )
          continue;
        // A surviving block ID can still lose an individual payload ordinal.
        for (const id of chunk.sourceRefs) candidates.add(id);
      }
    }
  if (before?.receivedValues !== after.receivedValues) {
    const old = before?.receivedValues?.sources ?? {},
      current = after.receivedValues?.sources ?? {};
    for (const [id, source] of Object.entries(current))
      if (source !== old[id] && (old[id] || id !== after.receivedValues?.activeSource || !before))
        candidates.add(id);
    const append = before?.receivedValues?.activeSource;
    if (append && append !== after.receivedValues?.activeSource) candidates.add(append);
    for (const id of Object.keys(old)) if (!current[id]) candidates.add(id);
  }
  return candidates;
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
  world: WorldState,
  query: TemporalHistoryQuery,
): Promise<TemporalHistoryPage> {
  if (world.id !== scope.worldId) throw new MemoryRetentionError('Foreign temporal history scope.');
  if (query.cut?.epoch === null) return { entries: [], incomplete: true, hasMore: false };
  const head = await db
    .prepare('SELECT generation FROM world_head WHERE world_id=?')
    .get(scope.worldId);
  if (head?.['generation'] !== scope.generation)
    throw new MemoryRetentionError('Temporal history changed before selection.');
  const policy = selectedTemporalPolicy(world).recent;
  const from = Math.max(query.from ?? 0, world.simTime - policy.maxAgeSeconds);
  const through = Math.min(query.through ?? world.simTime, world.simTime);
  const subjects = query.subjects ?? [];
  if (subjects.length > selectedAttentionPolicy(world).maximumCapacity)
    throw new MemoryRetentionError('Temporal history selection exceeds its subject allowance.');
  const limit = Math.max(1, Math.min(128, query.limit ?? 128));
  const maxBytes = Math.max(1, Math.min(maximumPreparation, query.bytes ?? 8192));
  const metadata = await db
    .prepare(
      `SELECT id,source_refs,logical_bytes,receipt_count,
      first_at,first_order,receipt_epoch,first_ordinal,
      octet_length(payload) AS encoded_bytes FROM mind_temporal_chunks
    WHERE world_id=? AND actor_id=? AND last_at>=? AND first_at<=?
      ${subjects.length ? 'AND subjects && ?::text[]' : ''}
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
      ...(subjects.length ? [subjects] : []),
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
    incomplete = metadata.length > limit,
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
        'SELECT payload,value_refs FROM mind_temporal_chunks WHERE world_id=? AND actor_id=? AND id=ANY(?::text[])',
      )
      .all(scope.worldId, scope.actorId, selected)) {
      const chunk = readTemporalChunkRecord(row);
      if (chunk.actorId !== scope.actorId)
        throw new MemoryRetentionError('Foreign temporal chunk.');
      chunks.set(chunk.id, chunk);
    }
  const resident = world.experience?.temporal;
  for (const chunk of resident?.actors[scope.actorId]?.chunks ?? [])
    if (
      chunk.throughAt >= from &&
      chunk.fromAt <= through &&
      (!subjects.length || chunk.subjects.some((subject) => subjects.includes(subject))) &&
      (query.physicalLife === undefined || chunk.physicalLife === query.physicalLife) &&
      (query.epoch === undefined || chunk.epoch === query.epoch) &&
      (!query.cut ||
        chunk.receipts.some((receipt) => temporalReceiptWithinPrefix(receipt, query.cut!)))
    ) {
      chunks.set(chunk.id, chunk);
    }
  const receipts = [...chunks.values()]
    .flatMap((chunk) => chunk.receipts)
    .filter(
      (receipt) =>
        receipt.actorId === scope.actorId &&
        (!query.cut || temporalReceiptWithinPrefix(receipt, query.cut)) &&
        (!query.measurements ||
          receipt.facets.some(
            (facet) =>
              facet.measuredFrom <= query.measurements!.through &&
              (facet.confirmedThrough ?? facet.measuredThrough) >= query.measurements!.from,
          )) &&
        receipt.at >= from &&
        receipt.at <= through &&
        (!subjects.length ||
          subjects.includes(receipt.subject) ||
          receipt.contextSubjects?.some((subject) => subjects.includes(subject))) &&
        (!query.before ||
          receipt.at < query.before.at ||
          (receipt.at === query.before.at &&
            (receipt.order < query.before.order ||
              (receipt.order === query.before.order &&
                (receipt.epoch < query.before.epoch ||
                  (receipt.epoch === query.before.epoch &&
                    receipt.ordinal < query.before.ordinal)))))),
    )
    .sort(
      (a, b) =>
        b.at - a.at || b.order - a.order || b.epoch.localeCompare(a.epoch) || b.ordinal - a.ordinal,
    );
  for (const receipt of receipts)
    for (const reference of receipt.facets)
      if (
        !query.measurements ||
        (reference.measuredFrom <= query.measurements.through &&
          (reference.confirmedThrough ?? reference.measuredThrough) >= query.measurements.from)
      )
        sourceIds.add(reference.blockId);
  const sources: Record<string, ReceivedValueBlock> = {};
  const missing = [...sourceIds].filter((id) => !world.receivedValues?.sources[id]);
  if (missing.length) {
    const sizes = await db
      .prepare(
        'SELECT SUM(octet_length(payload)) AS bytes FROM mind_perception_values WHERE world_id=? AND source_id=ANY(?::text[])',
      )
      .get(scope.worldId, missing);
    preparationBytes += Number(sizes?.['bytes'] ?? 0);
    if (preparationBytes > maximumPreparation)
      return {
        entries: [],
        incomplete: true,
        hasMore: !!metadataBefore,
        ...(metadataBefore ? { nextBefore: metadataBefore } : {}),
      };
    for (const row of await db
      .prepare(
        'SELECT payload FROM mind_perception_values WHERE world_id=? AND source_id=ANY(?::text[])',
      )
      .all(scope.worldId, missing)) {
      const source = JSON.parse(String(row['payload'])) as ReceivedValueBlock;
      sources[source.id] = source;
    }
  }
  for (const id of sourceIds)
    if (world.receivedValues?.sources[id]) sources[id] = world.receivedValues.sources[id]!;
  const entries: TemporalHistorySelection['entries'] = [];
  const forgotten = new Set(world.experience?.forgotten[scope.actorId] ?? []);
  const corrections = world.experience?.corrections?.[scope.actorId] ?? {};
  const hasRevocations = forgotten.size > 0 || Object.keys(corrections).length > 0;
  const revoked = (id: string) => forgotten.has(id) || Object.hasOwn(corrections, id);
  let bytes = 0;
  let examined: TemporalHistoryPage['nextBefore'];
  for (const receipt of receipts) {
    if (entries.length >= limit) {
      incomplete = true;
      hasMore = true;
      break;
    }
    const before = {
      at: receipt.at,
      order: receipt.order,
      epoch: receipt.epoch,
      ordinal: receipt.ordinal,
    };
    if (
      hasRevocations &&
      (revoked(receipt.id) ||
        (receipt.sourceIds.some(revoked) &&
          temporalReceiptAccountAliases(receipt, sources, world).some(revoked)))
    ) {
      incomplete = true;
      examined = before;
      continue;
    }
    const references = receipt.facets.filter(
      (facet) =>
        !query.measurements ||
        (facet.measuredFrom <= query.measurements.through &&
          (facet.confirmedThrough ?? facet.measuredThrough) >= query.measurements.from),
    );
    const values = references.map((reference) => {
      const fragment = sources[reference.blockId]?.values[reference.valueOrdinal];
      return fragment ? materializeTemporalValue(reference, fragment) : undefined;
    });
    if (values.some((value) => !value)) {
      incomplete = true;
      examined = before;
      continue;
    }
    const kept = references
      .map((facet, index) => ({ facet, value: values[index] }))
      .filter(
        ({ facet, value }) =>
          !!value &&
          (!query.kinds || query.kinds.includes(value.kind)) &&
          (!query.measurements ||
            (facet.measuredFrom <= query.measurements.through &&
              (facet.confirmedThrough ?? facet.measuredThrough) >= query.measurements.from)) &&
          (!hasRevocations ||
            !temporalReceiptAliases(
              { ...receipt, sourceIds: [], facets: [facet] },
              sources,
              world,
            ).some(revoked)) &&
          temporalFacetEligible(world, scope.actorId, facet, value),
      );
    if (!kept.length) {
      incomplete = true;
      examined = before;
      continue;
    }
    if (
      kept.length !==
      references.filter((_, index) => !query.kinds || query.kinds.includes(values[index]!.kind))
        .length
    )
      incomplete = true;
    const entry = {
      receipt: temporalReceiptForRead(
        selectTemporalReceiptFacets(
          receipt,
          kept.map(({ facet }) => facet),
          sources,
          world,
        ),
      ),
      values: kept.map(({ value }) => value!),
    };
    const size = Buffer.byteLength(JSON.stringify(entry));
    if (size > maxBytes) {
      // Omit the whole receipt, never a fragment of heard words. Its exact address
      // still advances browsing so a large observation cannot hide older receipts.
      incomplete = true;
      examined = before;
      continue;
    }
    if (bytes + size > maxBytes) {
      incomplete = true;
      hasMore = true;
      break;
    }
    examined = before;
    entries.push(entry);
    bytes += size;
    incomplete ||= receipt.change === 'loss' || receipt.change === 'attention-exit';
  }
  const released = resident?.actors[scope.actorId]?.releasedThrough;
  incomplete ||= released !== undefined && (query.from === undefined || query.from <= released);
  const nextBefore = hasMore ? (examined ?? metadataBefore) : undefined;
  return {
    entries: entries.reverse(),
    incomplete: incomplete || entries.length === 0,
    hasMore,
    ...(nextBefore ? { nextBefore } : {}),
  };
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
            `SELECT id,source_id,first_at,last_at,first_order,receipt_epoch,first_ordinal,logical_bytes,receipt_count,source_refs
      FROM mind_temporal_chunks WHERE world_id=? AND actor_id=? ORDER BY first_at,first_order,receipt_epoch,first_ordinal LIMIT ?`,
          )
          .all(state.world.id, actorId, maximumRows + 1))
      metadata.set(String(row['source_id']), {
        id: String(row['id']),
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
        sourceId: chunk.id,
        at: chunk.fromAt,
        through: chunk.throughAt,
        bytes: chunk.bytes,
        count: chunk.count,
        sources: chunk.sourceRefs,
        order: chunk.receipts[0]!.order,
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
    for (const chunk of [...metadata.values()].sort(
      (a, b) =>
        a.at - b.at || a.order - b.order || a.epoch.localeCompare(b.epoch) || a.ordinal - b.ordinal,
    )) {
      if (chunk.through > cutoff && bytes <= policy.maxBytes && count <= policy.maxChanges) {
        nextDue = chunk.at + policy.maxAgeSeconds;
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
    if (bytes > policy.maxBytes || count > policy.maxChanges)
      throw new MemoryRetentionError(
        'Required native recording cannot fit the qualified recent-history envelope.',
      );
    if (ids.length) {
      retired.push({ actorId, ids, bytes: removedBytes, count: removedCount, nextDue, through });
      rows.set('mind_temporal_chunks', [...(rows.get('mind_temporal_chunks') ?? []), ...recordIds]);
    }
  }
  for (const id of receivedValueReleaseCandidates(previous, state.world)) possibleSources.add(id);
  const beforeSources = previous?.receivedValues?.sources ?? {};
  if (!retired.length && !possibleSources.size) return { state, rows };
  let world = retired.length
    ? updateWorld(state.world, (draft) => {
        for (const release of retired)
          retireTemporalChunks(
            draft,
            release.actorId,
            release.ids,
            release,
            release.nextDue,
            release.through,
          );
      })
    : state.world;
  // Capture marks locate prior recording; they cannot keep an expired value
  // alive by themselves. Current receipt/original and real chunk owners can.
  const keep = referencedReceivedValues(world, { captures: false });
  const sources = world.receivedValues?.sources ?? {};
  const needsPruning = (id: string) => {
    const block = sources[id] ?? beforeSources[id];
    const ordinals = keep.get(id);
    return !block || block.values.some((value, ordinal) => value && !ordinals?.has(ordinal));
  };
  const candidates = [...possibleSources].filter(needsPruning);
  if (!candidates.length)
    return { state: world === state.world ? state : { ...state, world }, rows };
  const replaced = [
    ...(rows.get('mind_temporal_chunks') ?? []),
    ...(pending?.deletes.get('mind_temporal_chunks') ?? []),
    ...(pending?.writes.get('mind_temporal_chunks') ?? []).map((row) => row.id),
  ];
  let preparationBytes = 0;
  if (!complete) {
    const cold = await db
      .prepare(
        `SELECT value_refs,octet_length(value_refs::text) AS bytes FROM mind_temporal_chunks
         WHERE world_id=? AND source_refs && ?::text[] AND id<>ALL(?::text[]) LIMIT ?`,
      )
      .all(world.id, candidates, replaced, maximumRows + 1);
    preparationBytes = cold.reduce((sum, row) => sum + Number(row['bytes']), 0);
    if (cold.length > maximumRows || preparationBytes > maximumPreparation)
      throw new MemoryRetentionError(
        'Complete received-value ownership exceeds bounded preparation.',
      );
    for (const row of cold)
      for (const [id, ordinals] of Object.entries(row['value_refs'] as Record<string, number[]>)) {
        if (!possibleSources.has(id)) continue;
        const owned = keep.get(id) ?? new Set<number>();
        for (const ordinal of ordinals) owned.add(ordinal);
        keep.set(id, owned);
      }
  }
  const available = new Map(
    candidates.flatMap((id) => {
      const block = sources[id] ?? beforeSources[id];
      return block ? [[id, block] as const] : [];
    }),
  );
  const missing = candidates.filter((id) => !available.has(id));
  const positions = new Map<string, Map<string, number>>();
  if (missing.length && !complete) {
    const sizes = await db
      .prepare(
        'SELECT SUM(octet_length(payload)) AS bytes FROM mind_perception_values WHERE world_id=? AND source_id=ANY(?::text[])',
      )
      .get(world.id, missing);
    preparationBytes += Number(sizes?.['bytes'] ?? 0);
    if (preparationBytes > maximumPreparation)
      throw new MemoryRetentionError(
        'Complete received-value ownership exceeds bounded preparation.',
      );
    for (const row of await db
      .prepare(
        'SELECT id,payload FROM mind_perception_values WHERE world_id=? AND source_id=ANY(?::text[])',
      )
      .all(world.id, missing)) {
      const block = JSON.parse(String(row['payload'])) as ReceivedValueBlock;
      available.set(block.id, block);
      let placement = positions.get('mind_perception_values');
      if (!placement) positions.set('mind_perception_values', (placement = new Map()));
      placement.set(String(row['id']), 0);
    }
  }
  if (missing.some((id) => !available.has(id) && keep.get(id)?.size))
    throw new MemoryRetentionError('A retained received-value source is unavailable.');
  const changes = new Map<string, ReceivedValueBlock | undefined>();
  for (const [id, block] of available) {
    const next = pruneReceivedValueBlock(block, keep.get(id) ?? new Set());
    if (next !== block) changes.set(id, next);
  }
  if (!changes.size) return { state: world === state.world ? state : { ...state, world }, rows };
  const deleted = [...changes]
    .filter(([, value]) => !value)
    .map(([id]) => JSON.stringify(['world', 'receivedValues', 'sources', id]));
  // Empty retirements still carry existing-row placement for a cold block update.
  rows.set('mind_perception_values', deleted);
  world = updateWorld(world, (draft) => {
    const received = draft.receivedValues;
    if (!received) throw new MemoryRetentionError('Received-value owner is unavailable.');
    for (const [id, value] of changes) {
      if (value) received.sources[id] = value;
      else delete received.sources[id];
    }
    if (
      received.activeSource &&
      changes.has(received.activeSource) &&
      !changes.get(received.activeSource)
    ) {
      delete received.activeSource;
    }
    if (received.activeSources) {
      const group = received.activeSources.filter((id) => !!received.sources[id]);
      if (group.length !== received.activeSources.length) {
        if (group.length) received.activeSources = group;
        else {
          delete received.activeSources;
          delete received.activeAt;
        }
      }
    }
    for (const actor of Object.values(draft.experience?.temporal?.actors ?? {}))
      for (const [key, reference] of Object.entries(actor.captures)) {
        if (!changes.has(reference.blockId)) continue;
        const block = changes.get(reference.blockId);
        if (!block?.values[reference.valueOrdinal]) {
          delete actor.captures[key];
          actor.capturesInvalidated = true;
        }
      }
  });
  return {
    state: world === state.world ? state : { ...state, world },
    rows,
    ...(positions.size ? { positions } : {}),
  };
}
