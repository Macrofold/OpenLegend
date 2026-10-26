import type { SqlDatabase } from './store.js';

/** A logical charge includes the replaceable value, its exact key and a conservative
 * allowance for row/index references. Shared PostgreSQL page bytes are measured separately. */
export const DERIVED_REFERENCE_BYTES = 256;
export interface DerivedMemoryAllowance {
  worldId: string;
  policyId: string;
  policyVersion: number;
  maxBytes: number;
}
interface DerivedRow {
  kind: string;
  key: string[];
  bytes: number;
  at: number;
  priority: number;
}
const names = {
  text: 'recall_sources',
  lexical: 'memory_lexical_documents',
  pending: 'memory_lexical_pending',
  vector: 'memory_vectors',
  cache: 'memory_vector_cache',
  queue: 'memory_index_queue',
  annotation: 'mind_source_annotations',
} as const;
const scope = (table: string) => `FROM ${table} d WHERE d.world_id=? AND d.actor_id=?`;
const references = (fields: string[]) =>
  fields.map((field) => `octet_length(d.${field})`).join('+');
function candidatesSql() {
  const core = ['world_id', 'actor_id'];
  const row = (
    kind: string,
    table: string,
    keys: string[],
    value: string,
    priority: number,
    at = '0::double precision',
  ) =>
    `SELECT '${kind}' AS kind,jsonb_build_array(${keys.map((key) => `d.${key}`).join(',')})::text AS key,
    ${value}+${references([...core, ...keys.filter((key) => !['dimensions'].includes(key))])}+${DERIVED_REFERENCE_BYTES} AS bytes,
    ${at} AS at,${priority} AS priority ${scope(table)}`;
  return [
    row('text', names.text, ['id', 'source_kind'], 'octet_length(d.search_text)', 3, 'd.at') +
      " AND d.search_text<>''",
    row(
      'lexical',
      names.lexical,
      ['id', 'source_kind'],
      'octet_length(d.search_vector::text)+octet_length(d.source_revision)',
      2,
    ),
    row('pending', names.pending, ['id', 'source_kind'], 'd.bytes', 2),
    row(
      'vector',
      names.vector,
      ['source_id', 'model', 'dimensions'],
      'pg_column_size(d.embedding)+octet_length(d.source_revision)+octet_length(d.generation)',
      0,
    ),
    row(
      'cache',
      names.cache,
      ['source_id', 'source_revision', 'model', 'dimensions'],
      'octet_length(d.embedding)',
      0,
    ),
    row(
      'queue',
      names.queue,
      ['source_id', 'model', 'dimensions'],
      'octet_length(d.source_revision)',
      1,
      'd.at',
    ),
    row(
      'annotation',
      names.annotation,
      ['source_kind', 'source_id', 'source_revision', 'namespace'],
      'octet_length(d.payload)',
      1,
    ),
  ].join(' UNION ALL ');
}
export async function derivedMemoryUsage(
  db: SqlDatabase,
  worldId: string,
  actorId: string,
): Promise<number> {
  const row = await db
    .prepare(`SELECT COALESCE(SUM(bytes),0) AS bytes FROM (${candidatesSql()}) candidates`)
    .get(...Object.keys(names).flatMap(() => [worldId, actorId]));
  return Number(row?.['bytes'] ?? 0);
}

/** Optional cache eviction cannot erase native accounts or permit another paid attempt.
 * Dispatch records belong to operational spending recovery and remain independent. */
export async function trimMemoryDerivatives(
  db: SqlDatabase,
  policy: DerivedMemoryAllowance,
  actorId: string,
): Promise<number> {
  const metadata = await db
    .prepare(`SELECT * FROM (${candidatesSql()}) candidates ORDER BY priority,at,key`)
    .all(...Object.keys(names).flatMap(() => [policy.worldId, actorId]));
  let bytes = metadata.reduce((sum, row) => sum + Number(row['bytes']), 0);
  if (bytes <= policy.maxBytes) return bytes;
  const released: DerivedRow[] = [];
  for (const row of metadata) {
    if (bytes <= policy.maxBytes) break;
    const value = {
      kind: String(row['kind']),
      key: JSON.parse(String(row['key'])) as string[],
      bytes: Number(row['bytes']),
      at: Number(row['at']),
      priority: Number(row['priority']),
    };
    released.push(value);
    bytes -= value.bytes;
  }
  let pendingCount = 0,
    pendingBytes = 0;
  for (const [kind, table] of Object.entries(names)) {
    const selected = released.filter((row) => row.kind === kind);
    if (!selected.length) continue;
    const keys = selected.map((row) => row.key);
    const fields =
      kind === 'text' || kind === 'lexical' || kind === 'pending'
        ? ['id', 'source_kind']
        : kind === 'annotation'
          ? ['source_kind', 'source_id', 'source_revision', 'namespace']
          : kind === 'cache'
            ? ['source_id', 'source_revision', 'model', 'dimensions']
            : ['source_id', 'model', 'dimensions'];
    const predicate = fields
      .map(
        (field, index) => `d.${field}${field === 'dimensions' ? '::text' : ''}=q.value->>${index}`,
      )
      .join(' AND ');
    if (kind === 'text')
      await db
        .prepare(
          `UPDATE ${table} d SET search_text='' FROM jsonb_array_elements(?::jsonb) q(value) WHERE d.world_id=? AND d.actor_id=? AND ${predicate}`,
        )
        .run(JSON.stringify(keys), policy.worldId, actorId);
    else if (kind === 'pending') {
      const removed = await db
        .prepare(
          `DELETE FROM ${table} d USING jsonb_array_elements(?::jsonb) q(value) WHERE d.world_id=? AND d.actor_id=? AND ${predicate} RETURNING d.bytes`,
        )
        .all(JSON.stringify(keys), policy.worldId, actorId);
      pendingCount += removed.length;
      pendingBytes += removed.reduce((sum, row) => sum + Number(row['bytes']), 0);
    } else
      await db
        .prepare(
          `DELETE FROM ${table} d USING jsonb_array_elements(?::jsonb) q(value) WHERE d.world_id=? AND d.actor_id=? AND ${predicate}`,
        )
        .run(JSON.stringify(keys), policy.worldId, actorId);
  }
  // Abandoned lexical work counts as considered optional indexing. Exact retrieval
  // uses native sources; no later background sweep silently recreates evicted work.
  if (pendingCount)
    await db
      .prepare(
        `UPDATE memory_lexical_progress p SET
   pending_rows=GREATEST(0,pending_rows-?),pending_bytes=GREATEST(0,pending_bytes-?),
   covered_revision=COALESCE((SELECT MIN(world_revision)-1 FROM memory_lexical_pending q WHERE q.world_id=p.world_id AND q.generation=p.generation),(SELECT revision FROM world_head WHERE world_id=p.world_id))
   WHERE p.world_id=?`,
      )
      .run(pendingCount, pendingBytes, policy.worldId);
  return bytes;
}
