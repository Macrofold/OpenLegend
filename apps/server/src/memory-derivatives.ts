import type { SqlDatabase } from './store.js';
import { markLexicalIncomplete } from './lexical-coverage.js';

/** A logical charge includes the replaceable value, its exact key and a conservative
 * allowance for row/index references. Shared PostgreSQL page bytes are measured separately. */
export const DERIVED_REFERENCE_BYTES = 256;
export interface DerivedMemoryAllowance {
  worldId: string;
  policyId: string;
  policyVersion: number;
  maxBytes: number;
  hardBytes: number;
  lowBytes: number;
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
type DerivedKind = keyof typeof names;
const definitions: Record<
  DerivedKind,
  { keys: string[]; value: string; priority: number; at?: string }
> = {
  text: {
    keys: ['id', 'source_kind'],
    value: 'octet_length(d.search_text)',
    priority: 3,
    at: 'd.at',
  },
  lexical: {
    keys: ['id', 'source_kind'],
    value: 'octet_length(d.search_vector::text)+octet_length(d.source_revision)',
    priority: 2,
  },
  pending: { keys: ['id', 'source_kind'], value: 'd.bytes', priority: 2 },
  vector: {
    keys: ['source_id', 'model', 'dimensions'],
    value: 'pg_column_size(d.embedding)+octet_length(d.source_revision)+octet_length(d.generation)',
    priority: 0,
  },
  cache: {
    keys: ['source_id', 'source_revision', 'model', 'dimensions'],
    value: 'octet_length(d.embedding)',
    priority: 0,
  },
  queue: {
    keys: ['source_id', 'model', 'dimensions'],
    value: 'octet_length(d.source_revision)',
    priority: 1,
    at: 'd.at',
  },
  annotation: {
    keys: ['source_kind', 'source_id', 'source_revision', 'namespace'],
    value: 'octet_length(d.payload)',
    priority: 1,
  },
};
const kinds = Object.keys(names) as DerivedKind[];
export function derivedChargeSql(kind: DerivedKind, alias = 'd'): string {
  const { keys, value } = definitions[kind];
  const reference = ['world_id', 'actor_id', ...keys.filter((key) => key !== 'dimensions')]
    .map((field) => `octet_length(d.${field})`)
    .join('+');
  const charge = `${value}+${reference}+${DERIVED_REFERENCE_BYTES}`;
  return (
    kind === 'text' ? `CASE WHEN d.search_text='' THEN 0 ELSE ${charge} END` : charge
  ).replaceAll('d.', `${alias}.`);
}
function candidatesSql() {
  return kinds
    .map((kind) => {
      const { keys, priority, at = '0::double precision' } = definitions[kind];
      return `SELECT '${kind}' AS kind,jsonb_build_array(${keys.map((key) => `d.${key}`).join(',')})::text AS key,
      ${derivedChargeSql(kind)} AS bytes,${at} AS at,${priority} AS priority
      FROM ${names[kind]} d WHERE d.world_id=? AND d.actor_id=?${kind === 'text' ? " AND d.search_text<>''" : ''}`;
    })
    .join(' UNION ALL ');
}
/** Rebuildable accounting, not a memory authority. Statement transition tables
 * aggregate actual changed rows once, including conflict-update and rollback, so
 * every existing writer shares the same charge owner without repeated SUM scans.
 * docs/projects/bookkeeping-simplification-runtime-design.md#51-search-and-derived-storage */
export async function initializeMemoryDerivatives(db: SqlDatabase): Promise<void> {
  await db.exec(`CREATE TABLE IF NOT EXISTS memory_derived_usage (
    world_id TEXT NOT NULL,actor_id TEXT NOT NULL,bytes BIGINT NOT NULL,
    PRIMARY KEY(world_id,actor_id));`);
  for (const kind of kinds) {
    const table = names[kind];
    const sum = `SELECT d.world_id,d.actor_id,sum(${derivedChargeSql(kind)})::bigint AS bytes
      FROM changed_rows d GROUP BY d.world_id,d.actor_id`;
    for (const operation of ['insert', 'delete', 'update'] as const) {
      const delta =
        operation === 'insert'
          ? sum
          : operation === 'delete'
            ? `SELECT world_id,actor_id,-bytes AS bytes FROM (${sum}) old_charge`
            : `SELECT world_id,actor_id,sum(bytes)::bigint AS bytes FROM (
          ${sum.replaceAll('changed_rows', 'new_rows')}
          UNION ALL SELECT world_id,actor_id,-bytes AS bytes FROM (${sum.replaceAll('changed_rows', 'old_rows')}) old_charge
        ) changes GROUP BY world_id,actor_id HAVING sum(bytes)<>0`;
      const name = `memory_derived_${kind}_${operation}`;
      const relations =
        operation === 'update'
          ? 'OLD TABLE AS old_rows NEW TABLE AS new_rows'
          : operation === 'insert'
            ? 'NEW TABLE AS changed_rows'
            : 'OLD TABLE AS changed_rows';
      await db.exec(`CREATE OR REPLACE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          INSERT INTO memory_derived_usage SELECT world_id,actor_id,bytes FROM (${delta}) delta
          WHERE bytes<>0 ON CONFLICT(world_id,actor_id) DO UPDATE
          SET bytes=memory_derived_usage.bytes+excluded.bytes;
          RETURN NULL;
        END $$;
        DROP TRIGGER IF EXISTS ${name} ON ${table};
        CREATE TRIGGER ${name} AFTER ${operation.toUpperCase()} ON ${table}
          REFERENCING ${relations} FOR EACH STATEMENT EXECUTE FUNCTION ${name}();`);
    }
  }
  // Initialization/restore rebuilds the projection as one aggregate, not one
  // eviction-candidate transfer per actor. Subsequent changes use only deltas.
  const all = kinds
    .map(
      (kind) =>
        `SELECT d.world_id,d.actor_id,${derivedChargeSql(kind)} AS bytes FROM ${names[kind]} d`,
    )
    .join(' UNION ALL ');
  await db.exec(`DELETE FROM memory_derived_usage;
    INSERT INTO memory_derived_usage SELECT world_id,actor_id,sum(bytes)::bigint FROM (${all}) charges GROUP BY world_id,actor_id;`);
}
export async function derivedMemoryUsage(
  db: SqlDatabase,
  worldId: string,
  actorId: string,
): Promise<number> {
  const row = await db
    .prepare('SELECT bytes FROM memory_derived_usage WHERE world_id=? AND actor_id=?')
    .get(worldId, actorId);
  return Number(row?.['bytes'] ?? 0);
}

/** Optional cache eviction cannot erase native accounts or permit another paid attempt.
 * Dispatch records belong to operational spending recovery and remain independent. */
export async function trimMemoryDerivatives(
  db: SqlDatabase,
  policy: DerivedMemoryAllowance,
  actorId: string,
): Promise<number> {
  let bytes = await derivedMemoryUsage(db, policy.worldId, actorId);
  if (bytes <= policy.maxBytes) return bytes;
  const metadata = await db
    .prepare(`SELECT * FROM (${candidatesSql()}) candidates ORDER BY priority,at,key LIMIT 128`)
    .all(...Object.keys(names).flatMap(() => [policy.worldId, actorId]));
  const released: DerivedRow[] = [];
  for (const row of metadata) {
    if (bytes <= policy.lowBytes) break;
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
  if (
    released.some((row) => row.kind === 'text' || row.kind === 'lexical' || row.kind === 'pending')
  )
    await markLexicalIncomplete(db, policy.worldId, [actorId]);
  // Retiring optional queue keys releases their pressure, but never establishes
  // complete search coverage. Exact accounts and literal browse remain available.
  if (pendingCount)
    await db
      .prepare(
        `UPDATE memory_lexical_progress p SET
   pending_rows=GREATEST(0,pending_rows-?),pending_bytes=GREATEST(0,pending_bytes-?),
   covered_revision=COALESCE((SELECT MIN(world_revision)-1 FROM memory_lexical_pending q WHERE q.world_id=p.world_id AND q.generation=p.generation),(SELECT revision FROM world_head WHERE world_id=p.world_id))
   WHERE p.world_id=?`,
      )
      .run(pendingCount, pendingBytes, policy.worldId);
  return derivedMemoryUsage(db, policy.worldId, actorId);
}
