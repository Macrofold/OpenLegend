import { beginTiming, endTiming, countMetric } from './performance.js';
import { sqlRowBatches } from './sql-rows.js';
import { RECORD_NODES } from './world-record-schema.js';
import type { RecordChanges, RowChange } from './world-records.js';
import type { SqlDatabase } from './store.js';

import { receivedCurrentOwnerTables as currentOwners } from './received-record-references.js';
interface Owner {
  kind: string;
  id: string;
  actor: string;
  refs: string[];
}

/** Transactional reverse references derived from canonical owners. Neither this
 * projection nor a retained value ID grants a character access to evidence. */
export class ReceivedValueOwnership {
  constructor(private readonly db: SqlDatabase) {}

  async initialize(): Promise<void> {
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS retired_temporal_cleanup ON mind_temporal_chunks(world_id,retired_revision,id) WHERE retired_revision IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS received_value_identity
        ON mind_perception_values(world_id,source_id);
      CREATE TABLE IF NOT EXISTS received_value_uses (
        world_id TEXT NOT NULL, owner_kind TEXT NOT NULL, owner_id TEXT NOT NULL,
        actor_id TEXT NOT NULL, value_id TEXT NOT NULL,
        PRIMARY KEY(world_id,owner_kind,owner_id,value_id),
        FOREIGN KEY(world_id,value_id) REFERENCES mind_perception_values(world_id,source_id)
          ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS received_value_reverse
        ON received_value_uses(world_id,value_id);
      CREATE INDEX IF NOT EXISTS received_value_actor
        ON received_value_uses(world_id,actor_id,owner_kind);
      CREATE INDEX IF NOT EXISTS received_value_cleanup
        ON mind_perception_values(world_id,gc_candidate_seq,source_id)
        WHERE gc_candidate_seq IS NOT NULL;
    `);
  }

  /** Startup/checkpoint integrity only; never a movement or command admission scan. */
  async validate(worldId: string): Promise<void> {
    const expected = [...currentOwners, 'mind_temporal_segments']
      .map((table) => {
        const temporal = table === 'mind_temporal_segments';
        return `SELECT p.world_id,'${temporal ? 'mind_temporal_chunks' : table}' AS owner_kind,${temporal ? 'p.parent_id' : 'p.id'} AS owner_id,p.actor_id,v.id AS value_id
        FROM ${table} p CROSS JOIN LATERAL unnest(p.value_refs) v(id)
        WHERE p.world_id=? ${temporal ? 'AND EXISTS(SELECT 1 FROM mind_temporal_chunks c WHERE c.world_id=p.world_id AND c.id=p.parent_id AND c.retired_revision IS NULL)' : ''}`;
      })
      .join(' UNION ');
    const mismatch = await this.db
      .prepare(
        `WITH expected AS MATERIALIZED (${expected}), actual AS MATERIALIZED (
        SELECT * FROM received_value_uses WHERE world_id=?
      ) SELECT 1 AS invalid FROM ((SELECT * FROM expected EXCEPT SELECT * FROM actual)
        UNION ALL (SELECT * FROM actual EXCEPT SELECT * FROM expected)) missing LIMIT 1`,
      )
      .get(...Array(currentOwners.length + 2).fill(worldId));
    if (mismatch)
      throw new Error('Received evidence ownership disagrees with its canonical records.');
  }

  private owner(table: string, row: RowChange): Owner {
    const columns = Object.keys(RECORD_NODES.get(table)!.columns!);
    const references = row.extra[columns.indexOf('value_refs')] as string[];
    return {
      kind: table === 'mind_temporal_segments' ? 'mind_temporal_chunks' : table,
      id: table === 'mind_temporal_segments' ? row.parent : row.id,
      actor: String(row.extra[columns.indexOf('actor_id')]),
      refs: references ?? [],
    };
  }

  /** Canonical writes must finish first, inside the same direct transaction. */
  async project(
    worldId: string,
    revision: number,
    changes: RecordChanges,
    restore: boolean,
  ): Promise<void> {
    if (restore) {
      await this.db.prepare('DELETE FROM received_value_uses WHERE world_id=?').run(worldId);
      for (const table of [...currentOwners, 'mind_temporal_segments'])
        await this.db
          .prepare(
            `INSERT INTO received_value_uses
          SELECT p.world_id,?,${table === 'mind_temporal_segments' ? 'p.parent_id' : 'p.id'},p.actor_id,v.value
          FROM ${table} p CROSS JOIN LATERAL unnest(p.value_refs) v(value)
          WHERE p.world_id=? ON CONFLICT DO NOTHING`,
          )
          .run(table === 'mind_temporal_segments' ? 'mind_temporal_chunks' : table, worldId);
      await this.db
        .prepare('UPDATE mind_perception_values SET gc_candidate_seq=? WHERE world_id=?')
        .run(revision, worldId);
      return;
    }

    const replacements: Owner[] = [];
    const appendChunks = new Map<string, Omit<Owner, 'refs'> & { refs: Set<string> }>();
    const rebuildChunks = new Set<string>();
    for (const table of currentOwners) {
      for (const row of changes.writes.get(table) ?? [])
        if (row.receivedUsesChanged !== false) replacements.push(this.owner(table, row));
      for (const id of changes.deletes.get(table) ?? [])
        replacements.push({ kind: table, id, actor: '', refs: [] });
    }
    for (const row of changes.writes.get('mind_temporal_segments') ?? []) {
      if (!row.create) rebuildChunks.add(row.parent);
      const value = this.owner('mind_temporal_segments', row);
      const prior = appendChunks.get(value.id);
      if (prior) for (const id of value.refs) prior.refs.add(id);
      else appendChunks.set(value.id, { ...value, refs: new Set(value.refs) });
    }
    for (const id of changes.deletes.get('mind_temporal_chunks') ?? [])
      replacements.push({ kind: 'mind_temporal_chunks', id, actor: '', refs: [] });
    for (const id of changes.deletes.get('mind_temporal_segments') ?? []) {
      const path = JSON.parse(id) as string[];
      rebuildChunks.add(JSON.stringify(path.slice(0, -2)));
    }
    if (rebuildChunks.size) {
      const rows = await this.db
        .prepare(
          `SELECT p.parent_id,p.actor_id,
          ARRAY(SELECT DISTINCT key FROM mind_temporal_segments s
            CROSS JOIN LATERAL unnest(s.value_refs) v(key)
            WHERE s.world_id=p.world_id AND s.parent_id=p.parent_id) AS refs
        FROM mind_temporal_segments p WHERE p.world_id=? AND p.parent_id=ANY(?::text[])
        GROUP BY p.world_id,p.parent_id,p.actor_id`,
        )
        .all(worldId, [...rebuildChunks]);
      const selected = new Map(rows.map((row) => [String(row['parent_id']), row]));
      for (const id of rebuildChunks) {
        const row = selected.get(id);
        replacements.push({
          kind: 'mind_temporal_chunks',
          id,
          actor: String(row?.['actor_id'] ?? ''),
          refs: (row?.['refs'] ?? []) as string[],
        });
        appendChunks.delete(id);
      }
    }

    // Structural parent deletion is rare; scope the repair to its actual actors.
    const removedActors = new Set<string>();
    for (const [table, at] of [
      ['mind_perception_owners', 2],
      ['mind_temporal_actors', 4],
    ] as const)
      for (const id of changes.deletes.get(table) ?? [])
        removedActors.add((JSON.parse(id) as string[])[at]!);
    if (removedActors.size)
      for (const table of [...currentOwners, 'mind_temporal_segments']) {
        const kind = table === 'mind_temporal_segments' ? 'mind_temporal_chunks' : table;
        const rows = await this.db
          .prepare(
            `SELECT DISTINCT u.owner_id FROM received_value_uses u
          WHERE u.world_id=? AND u.actor_id=ANY(?::text[]) AND u.owner_kind=?
          AND NOT EXISTS (SELECT 1 FROM ${table} p WHERE p.world_id=u.world_id
            AND ${table === 'mind_temporal_segments' ? 'p.parent_id' : 'p.id'}=u.owner_id)`,
          )
          .all(worldId, [...removedActors], kind);
        for (const row of rows)
          replacements.push({ kind, id: String(row['owner_id']), actor: '', refs: [] });
      }

    for (const rows of sqlRowBatches(replacements.map((owner) => [owner]))) {
      const batch = rows.map(([owner]) => owner);
      await this.db
        .prepare(
          `WITH desired AS MATERIALIZED (
          SELECT * FROM jsonb_to_recordset(?::jsonb) AS x(kind TEXT,id TEXT,actor TEXT,refs TEXT[])
        ), removed AS (
          DELETE FROM received_value_uses u USING desired d
          WHERE u.world_id=? AND u.owner_kind=d.kind AND u.owner_id=d.id
            AND NOT(u.value_id=ANY(d.refs)) RETURNING u.value_id
        ), nominated AS (
          UPDATE mind_perception_values SET gc_candidate_seq=? WHERE world_id=?
            AND source_id IN(SELECT value_id FROM removed) AND gc_candidate_seq IS NULL
        ) INSERT INTO received_value_uses
          SELECT ?,d.kind,d.id,d.actor,v.id FROM desired d CROSS JOIN LATERAL unnest(d.refs) v(id)
          ON CONFLICT DO NOTHING`,
        )
        .run(JSON.stringify(batch), worldId, revision, worldId, worldId);
    }
    const appends = [...appendChunks.values()].map(({ refs, ...owner }) => ({
      ...owner,
      refs: [...refs],
    }));
    for (const rows of sqlRowBatches(appends.map((owner) => [owner])))
      await this.db
        .prepare(
          `INSERT INTO received_value_uses
        SELECT ?,x.kind,x.id,x.actor,v.id
        FROM jsonb_to_recordset(?::jsonb) AS x(kind TEXT,id TEXT,actor TEXT,refs TEXT[])
        CROSS JOIN LATERAL unnest(x.refs) v(id) ON CONFLICT DO NOTHING`,
        )
        .run(worldId, JSON.stringify(rows.map(([owner]) => owner)));
    const writtenValues = (changes.writes.get('mind_perception_values') ?? []).map(
      (row) => (JSON.parse(row.id) as string[]).at(-1)!,
    );
    if (writtenValues.length)
      await this.db
        .prepare(
          `UPDATE mind_perception_values p SET gc_candidate_seq=?
        WHERE p.world_id=? AND p.source_id=ANY(?::text[]) AND NOT EXISTS
          (SELECT 1 FROM received_value_uses u WHERE u.world_id=p.world_id AND u.value_id=p.source_id)`,
        )
        .run(revision, worldId, writtenValues);
  }

  async erase(worldId: string, ids: readonly string[]): Promise<void> {
    if (!ids.length) return;
    await this.db.transaction(async () => {
      for (let at = 0; at < ids.length; at += 256)
        await this.db
          .prepare(
            `DELETE FROM mind_perception_values p WHERE p.world_id=? AND p.source_id=ANY(?::text[])
          AND NOT EXISTS(SELECT 1 FROM received_value_uses u WHERE u.world_id=p.world_id AND u.value_id=p.source_id)`,
          )
          .run(worldId, ids.slice(at, at + 256));
    });
  }

  /** One bounded SQL slice handles both candidate kinds. Logical retirement has
   * already released ownership; no command waits for this physical cleanup. */
  private firstCleanupKind = 0;
  async collect(worldId: string): Promise<number> {
    const mark = beginTiming();
    const first = this.firstCleanupKind;
    this.firstCleanupKind = 1 - first;
    try {
      return await this.db.transaction(async () => {
        const row = await this.db
          .prepare(
            `WITH candidates AS MATERIALIZED (
          (SELECT id,0 AS kind,retired_revision AS sequence,
            octet_length(payload)+COALESCE((payload::json#>>'{storage,segmentBytes}')::bigint,0) AS bytes
            FROM mind_temporal_chunks WHERE world_id=? AND retired_revision IS NOT NULL
            ORDER BY retired_revision,id LIMIT 128)
          UNION ALL
          (SELECT source_id AS id,1 AS kind,gc_candidate_seq AS sequence,octet_length(payload) AS bytes
            FROM mind_perception_values WHERE world_id=? AND gc_candidate_seq IS NOT NULL
            ORDER BY gc_candidate_seq,source_id LIMIT 128)
        ), prioritized AS (
          SELECT *,CASE WHEN kind=? THEN 0 ELSE 1 END AS priority FROM candidates
        ), ranked AS (
          SELECT *,row_number() OVER(PARTITION BY kind ORDER BY sequence,id) AS turn FROM prioritized
        ), sized AS (
          SELECT *,row_number() OVER(ORDER BY turn,priority) AS n,
            sum(bytes) OVER(ORDER BY turn,priority) AS total FROM ranked
        ), chosen AS MATERIALIZED (
          SELECT * FROM sized WHERE n<=256 AND (total<=262144 OR n=1)
        ), value_candidates AS MATERIALIZED (
          SELECT c.*,EXISTS(SELECT 1 FROM received_value_uses u WHERE u.world_id=? AND u.value_id=c.id) AS owned
            FROM chosen c WHERE c.kind=1
        ), removed_chunks AS (
          DELETE FROM mind_temporal_chunks c USING chosen s
            WHERE c.world_id=? AND s.kind=0 AND c.id=s.id RETURNING s.bytes
        ), removed_values AS (
          DELETE FROM mind_perception_values p USING value_candidates v
            WHERE p.world_id=? AND p.source_id=v.id AND NOT v.owned RETURNING v.bytes
        ), held AS (
          UPDATE mind_perception_values p SET gc_candidate_seq=NULL FROM value_candidates v
            WHERE p.world_id=? AND p.source_id=v.id AND v.owned
        ) SELECT (SELECT count(*) FROM chosen) AS examined,
          (SELECT count(*) FROM value_candidates) AS examined_values,
          (SELECT count(*) FROM removed_chunks) AS chunks,
          (SELECT COALESCE(sum(bytes),0) FROM removed_chunks) AS chunk_bytes,
          (SELECT count(*) FROM removed_values) AS values_deleted,
          (SELECT COALESCE(sum(bytes),0) FROM removed_values) AS value_bytes`,
          )
          .get(worldId, worldId, first, worldId, worldId, worldId, worldId);
        countMetric('persistence.retiredChunksDeleted', Number(row?.['chunks'] ?? 0));
        countMetric('persistence.retiredChunkBytesDeleted', Number(row?.['chunk_bytes'] ?? 0));
        countMetric('persistence.receivedValuesExamined', Number(row?.['examined_values'] ?? 0));
        countMetric('persistence.receivedValuesDeleted', Number(row?.['values_deleted'] ?? 0));
        countMetric('persistence.receivedValueBytesDeleted', Number(row?.['value_bytes'] ?? 0));
        return Number(row?.['examined'] ?? 0);
      });
    } finally {
      endTiming('persistence.evidenceCleanup', mark);
    }
  }
}
