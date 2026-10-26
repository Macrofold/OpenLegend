import {
  selectedTemporalPolicy,
  selectedAttentionPolicy,
  temporalFacetEligible,
  retireTemporalChunks,
  updateWorld,
  type WorldState,
  type TemporalChunk,
  type TemporalEvidenceState,
  type TemporalHistorySelection,
  type TemporalSourceBlock,
} from '@open-legend/domain';
import type { SavedWorld, SqlDatabase } from './store.js';
import type { MemoryScope } from './memory-repository.js';

const maximumPreparation = 4 * 1024 * 1024;
const maximumRows = 8192;
const rowId = (actorId: string, id: string) =>
  JSON.stringify(['world', 'experience', 'temporal', 'actors', actorId, 'chunks', id]);
export interface PreparedMemoryRetention {
  state: SavedWorld;
  rows: Map<string, string[]>;
  positions?: Map<string, Map<string, number>>;
}
export interface TemporalHistoryPage extends TemporalHistorySelection {
  hasMore: boolean;
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
      octet_length(payload) AS encoded_bytes FROM mind_temporal_chunks
    WHERE world_id=? AND actor_id=? AND last_at>=? AND first_at<=?
      ${subjects.length ? 'AND subjects && ?::text[]' : ''}
      ${query.physicalLife === undefined ? '' : 'AND physical_life=?'}
      ${query.epoch === undefined ? '' : 'AND receipt_epoch=?'}
      ${query.before ? 'AND (first_at<? OR (first_at=? AND (first_order<? OR (first_order=? AND (receipt_epoch<? OR (receipt_epoch=? AND first_ordinal<?))))))' : ''}
    ORDER BY last_at DESC,last_order DESC,receipt_epoch DESC,last_ordinal DESC LIMIT ?`,
    )
    .all(
      scope.worldId,
      scope.actorId,
      from,
      through,
      ...(subjects.length ? [subjects] : []),
      ...(query.physicalLife === undefined ? [] : [query.physicalLife]),
      ...(query.epoch === undefined ? [] : [query.epoch]),
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
  let preparationBytes = 0,
    count = 0,
    incomplete = metadata.length > limit,
    hasMore = metadata.length > limit;
  for (const row of metadata.slice(0, limit)) {
    const size = Number(row['encoded_bytes']);
    if (preparationBytes + size > maximumPreparation) {
      incomplete = true;
      hasMore = true;
      break;
    }
    selected.push(String(row['id']));
    preparationBytes += size;
    for (const id of row['source_refs'] as string[]) sourceIds.add(id);
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
        'SELECT payload FROM mind_temporal_chunks WHERE world_id=? AND actor_id=? AND id=ANY(?::text[])',
      )
      .all(scope.worldId, scope.actorId, selected)) {
      const chunk = JSON.parse(String(row['payload'])) as TemporalChunk;
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
      (query.epoch === undefined || chunk.epoch === query.epoch)
    ) {
      chunks.set(chunk.id, chunk);
      for (const id of chunk.sourceRefs) sourceIds.add(id);
    }
  const sources: Record<string, TemporalSourceBlock> = {};
  const missing = [...sourceIds].filter((id) => !resident?.sources[id]);
  if (missing.length) {
    const sizes = await db
      .prepare(
        'SELECT SUM(octet_length(payload)) AS bytes FROM mind_temporal_sources WHERE world_id=? AND source_id=ANY(?::text[])',
      )
      .get(scope.worldId, missing);
    preparationBytes += Number(sizes?.['bytes'] ?? 0);
    if (preparationBytes > maximumPreparation)
      throw new MemoryRetentionError('Temporal history exceeds bounded preparation.');
    for (const row of await db
      .prepare(
        'SELECT payload FROM mind_temporal_sources WHERE world_id=? AND source_id=ANY(?::text[])',
      )
      .all(scope.worldId, missing)) {
      const source = JSON.parse(String(row['payload'])) as TemporalSourceBlock;
      sources[source.id] = source;
    }
  }
  for (const id of sourceIds) if (resident?.sources[id]) sources[id] = resident.sources[id]!;
  const receipts = [...chunks.values()]
    .flatMap((chunk) => chunk.receipts)
    .filter(
      (receipt) =>
        receipt.actorId === scope.actorId &&
        receipt.at >= from &&
        receipt.at <= through &&
        (!subjects.length || subjects.includes(receipt.subject)) &&
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
  const entries: TemporalHistorySelection['entries'] = [];
  let bytes = 0;
  for (const receipt of receipts) {
    if (
      receipt.sourceIds.some(
        (id) =>
          world.experience?.forgotten[scope.actorId]?.includes(id) ||
          world.experience?.corrections?.[scope.actorId]?.[id],
      )
    ) {
      incomplete = true;
      continue;
    }
    const values = receipt.facets.map(
      (reference) => sources[reference.blockId]?.values[reference.valueOrdinal],
    );
    if (values.some((value) => !value)) {
      incomplete = true;
      continue;
    }
    const kept = receipt.facets
      .map((facet, index) => ({ facet, value: values[index] }))
      .filter(
        ({ facet, value }) => !!value && temporalFacetEligible(world, scope.actorId, facet, value),
      );
    if (!kept.length) {
      incomplete = true;
      continue;
    }
    if (kept.length !== receipt.facets.length) incomplete = true;
    const entry = {
      receipt: { ...receipt, facets: kept.map(({ facet }) => facet) },
      values: kept.map(({ value }) => value!),
    };
    const size = Buffer.byteLength(JSON.stringify(entry));
    if (entries.length >= limit || bytes + size > maxBytes) {
      incomplete = true;
      hasMore = true;
      break;
    }
    entries.push(entry);
    bytes += size;
    incomplete ||= receipt.change === 'loss' || receipt.change === 'attention-exit';
  }
  const released = resident?.actors[scope.actorId]?.releasedThrough;
  incomplete ||= released !== undefined && (query.from === undefined || query.from <= released);
  return { entries: entries.reverse(), incomplete: incomplete || entries.length === 0, hasMore };
}

/** Exact canonical row deletions join the normal ordered world transaction.
 * No independent archive, asynchronous delete race or provider consolidation. */
export async function prepareTemporalRetention(
  db: SqlDatabase,
  state: SavedWorld,
  complete = false,
): Promise<PreparedMemoryRetention> {
  const temporal = state.world.experience?.temporal;
  const rows = new Map<string, string[]>();
  if (!temporal) return { state, rows };
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
  for (const [actorId, actor] of Object.entries(temporal.actors)) {
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
        id: rowId(actorId, chunk.id),
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
  if (!retired.length) return { state, rows };
  const world = updateWorld(state.world, (draft) => {
    for (const release of retired)
      retireTemporalChunks(
        draft,
        release.actorId,
        release.ids,
        release,
        release.nextDue,
        release.through,
      );
  });
  const keep = new Set<string>();
  for (const actor of Object.values(world.experience?.temporal?.actors ?? {})) {
    for (const reference of Object.values(actor.captures)) keep.add(reference.blockId);
    for (const chunk of actor.chunks) for (const source of chunk.sourceRefs) keep.add(source);
  }
  const candidates = [...possibleSources].filter((id) => !keep.has(id));
  if (candidates.length) {
    const expired = rows.get('mind_temporal_chunks') ?? [];
    const unused = complete
      ? candidates.map((source_id) => ({
          id: JSON.stringify(['world', 'experience', 'temporal', 'sources', source_id]),
          source_id,
        }))
      : await db
          .prepare(
            `SELECT s.id,s.source_id FROM mind_temporal_sources s
      WHERE s.world_id=? AND s.source_id=ANY(?::text[]) AND NOT EXISTS (
        SELECT 1 FROM mind_temporal_chunks c WHERE c.world_id=s.world_id
          AND c.source_refs @> ARRAY[s.source_id]::text[] AND c.id<>ALL(?::text[]))`,
          )
          .all(state.world.id, candidates, expired);
    if (unused.length) {
      rows.set(
        'mind_temporal_sources',
        unused.map((row) => String(row['id'])),
      );
      return {
        state: {
          ...state,
          world: updateWorld(world, (draft) => {
            const temporal = draft.experience!.temporal!;
            for (const row of unused) delete temporal.sources[String(row['source_id'])];
            if (temporal.activeSource && !temporal.sources[temporal.activeSource]) {
              delete temporal.activeSource;
              delete temporal.activeBoundary;
            }
          }),
        },
        rows,
      };
    }
  }
  return { state: { ...state, world }, rows };
}
