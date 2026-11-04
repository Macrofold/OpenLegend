import {
  eligibleReceivedChargeDirectories,
  temporalPageReferences,
  type ReceivedChargeDirectory,
} from '@open-legend/domain';
import { beginTiming, endTiming, countMetric } from './performance.js';
import { sqlRowBatches } from './sql-rows.js';
import { RECORD_NODES } from './world-record-schema.js';
import type { RecordChanges, RowChange } from './world-records.js';
import type { SqlDatabase } from './store.js';
import {
  temporalBlockExpiredSql,
  temporalBlockMixedBoundarySql,
  temporalFrontierFromColumns,
} from './temporal-page-storage.js';

import { receivedCurrentOwnerTables as currentOwners } from './received-record-references.js';
interface Owner {
  kind: string;
  id: string;
  actor: string;
  refs: string[];
  additions?: readonly string[];
  removals?: readonly string[];
}

export function receivedRowOwner(table: string, row: RowChange): Owner {
  const columns = Object.keys(RECORD_NODES.get(table)!.columns!);
  const references = row.extra[columns.indexOf('value_refs')] as string[];
  return {
    kind: table,
    id: row.id,
    actor: String(row.extra[columns.indexOf('actor_id')]),
    refs: references ?? [],
    ...(row.receivedValueAdditions
      ? { additions: row.receivedValueAdditions, removals: row.receivedValueRemovals ?? [] }
      : {}),
  };
}

/** Transactional reverse references derived from canonical owners. Neither this
 * projection nor a retained value ID grants a character access to evidence. */
export class ReceivedValueOwnership {
  constructor(private readonly db: SqlDatabase) {}

  async initialize(): Promise<void> {
    await this.db.exec(`
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
    const expected = [...currentOwners, 'mind_temporal_pages']
      .map((table) => {
        const temporal = table === 'mind_temporal_pages';
        return `SELECT p.world_id,'${temporal ? 'mind_temporal_pages' : table}' AS owner_kind,p.id AS owner_id,p.actor_id,v.id AS value_id
        FROM ${table} p CROSS JOIN LATERAL unnest(p.value_refs) v(id)
        WHERE p.world_id=?`;
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

  /** Canonical writes must finish first, inside the same direct transaction. */
  async project(
    worldId: string,
    revision: number,
    changes: RecordChanges,
    restore: boolean,
  ): Promise<void> {
    if (restore) {
      await this.db.prepare('DELETE FROM received_value_uses WHERE world_id=?').run(worldId);
      const owners = [...currentOwners, 'mind_temporal_pages'];
      await this.db
        .prepare(
          `INSERT INTO received_value_uses ${owners
            .map(
              (table) =>
                `SELECT p.world_id,'${table}',p.id,p.actor_id,v.value FROM ${table} p
           CROSS JOIN LATERAL unnest(p.value_refs) v(value) WHERE p.world_id=?`,
            )
            .join(' UNION ALL ')} ON CONFLICT DO NOTHING`,
        )
        .run(...owners.map(() => worldId));
      await this.db
        .prepare('UPDATE mind_perception_values SET gc_candidate_seq=? WHERE world_id=?')
        .run(revision, worldId);
      return;
    }

    const replacements: Owner[] = [];
    for (const table of [...currentOwners, 'mind_temporal_pages']) {
      for (const row of changes.writes.get(table) ?? [])
        if (row.receivedUsesChanged !== false) replacements.push(receivedRowOwner(table, row));
      for (const id of changes.deletes.get(table) ?? [])
        replacements.push({ kind: table, id, actor: '', refs: [] });
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
      for (const table of [...currentOwners, 'mind_temporal_pages']) {
        const kind = table;
        const rows = await this.db
          .prepare(
            `SELECT DISTINCT u.owner_id FROM received_value_uses u
          WHERE u.world_id=? AND u.actor_id=ANY(?::text[]) AND u.owner_kind=?
          AND NOT EXISTS (SELECT 1 FROM ${table} p WHERE p.world_id=u.world_id
            AND p.id=u.owner_id)`,
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
          SELECT * FROM jsonb_to_recordset(?::jsonb) AS x(kind TEXT,id TEXT,actor TEXT,refs TEXT[],additions TEXT[],removals TEXT[])
        ), removed AS (
          DELETE FROM received_value_uses u USING desired d
          WHERE u.world_id=? AND u.owner_kind=d.kind AND u.owner_id=d.id
            AND ((d.removals IS NULL AND NOT(u.value_id=ANY(d.refs))) OR u.value_id=ANY(d.removals)) RETURNING u.value_id
        ), nominated AS (
          UPDATE mind_perception_values SET gc_candidate_seq=? WHERE world_id=?
            AND source_id IN(SELECT value_id FROM removed) AND gc_candidate_seq IS NULL
        ) INSERT INTO received_value_uses
          SELECT ?,d.kind,d.id,d.actor,v.id FROM desired d CROSS JOIN LATERAL unnest(COALESCE(d.additions,d.refs)) v(id)
          ON CONFLICT DO NOTHING`,
        )
        .run(JSON.stringify(batch), worldId, revision, worldId, worldId);
    }
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

  /** Finite pending writer inputs already retain these owner references. Build
   * one membership set per collection opportunity, never one scan per candidate. */
  private readonly pendingReferenceIndexes = new WeakMap<RecordChanges, ReadonlySet<string>>();
  pendingReferences(changes: RecordChanges): ReadonlySet<string> {
    const cached = this.pendingReferenceIndexes.get(changes);
    if (cached) return cached;
    const retained = new Set<string>();
    for (const table of [...currentOwners, 'mind_temporal_pages'])
      for (const row of changes.writes.get(table) ?? [])
        for (const id of receivedRowOwner(table, row).refs) retained.add(id);
    for (const intent of changes.temporal?.values() ?? [])
      for (const id of temporalPageReferences(intent.after)) retained.add(id);
    for (const row of changes.writes.get('mind_perception_values') ?? [])
      retained.add((JSON.parse(row.id) as string[]).at(-1)!);
    this.pendingReferenceIndexes.set(changes, retained);
    return retained;
  }

  /** Collection uses committed actor frontiers and bounded owner heads. Expiry
   * never updates each block; old payloads keep their value ownership until this
   * atomic physical deletion. A pending save independently protects its values. */
  private firstCleanupKind = 0;
  private valueCursor?: { worldId: string; sequence: number; id: string };
  private actorCursor?: { worldId: string; id: string };
  async collect(
    worldId: string,
    captureProtection?: () => (id: string) => boolean,
  ): Promise<number> {
    const mark = beginTiming();
    try {
      const completed = await (
        this.db.maintenanceTransaction?.bind(this.db) ?? this.db.transaction.bind(this.db)
      )(async () => {
        const protects = captureProtection?.() ?? (() => false);
        const valueCursor = this.valueCursor?.worldId === worldId ? this.valueCursor : undefined;
        const actorCursor = this.actorCursor?.worldId === worldId ? this.actorCursor : undefined;
        // Select the oldest block before testing expiry. An actor with no expired
        // history costs one indexed seek, never a walk through its retained life.
        const candidates = await this.db
          .prepare(
            `WITH actors AS MATERIALIZED (
          SELECT actor_id,expired_through_time,pressure_batch_order,pressure_entry,pressure_member,pressure_at,pressure_order,
            row_number() OVER(ORDER BY actor_id) AS cursor_order
          FROM mind_temporal_actors WHERE world_id=? ${actorCursor ? 'AND actor_id>?' : ''}
          ORDER BY actor_id LIMIT 128
        ), values AS MATERIALIZED (
          SELECT source_id,gc_candidate_seq,octet_length(payload) AS bytes,
            row_number() OVER(ORDER BY gc_candidate_seq,source_id) AS cursor_order
          FROM mind_perception_values WHERE world_id=? AND gc_candidate_seq IS NOT NULL
            ${valueCursor ? 'AND (gc_candidate_seq,source_id)>(?,?)' : ''}
          ORDER BY gc_candidate_seq,source_id LIMIT 128
        ) SELECT 1 AS kind,source_id AS id,NULL::text AS actor_id,gc_candidate_seq AS sequence,bytes,true AS eligible,cursor_order,
            NULL::text AS boundary_directory,NULL::double precision AS expired_through_time,NULL::bigint AS pressure_batch_order,
            NULL::bigint AS pressure_entry,NULL::bigint AS pressure_member,NULL::double precision AS pressure_at,NULL::bigint AS pressure_order
          FROM values
        UNION ALL
        SELECT 0 AS kind,p.id,a.actor_id,p.first_batch_order AS sequence,p.encoded_bytes AS bytes,
          ${temporalBlockExpiredSql('p', 'a')} AS eligible,a.cursor_order,
          CASE WHEN ${temporalBlockMixedBoundarySql('p', 'a')} THEN p.charge_directory END AS boundary_directory,
          a.expired_through_time,a.pressure_batch_order,a.pressure_entry,a.pressure_member,a.pressure_at,a.pressure_order
        FROM actors a LEFT JOIN LATERAL (
          SELECT id,first_batch_order,first_entry,first_member,last_batch_order,last_entry,last_member,
            first_at,last_at,encoded_bytes,charge_directory
          FROM mind_temporal_pages WHERE world_id=? AND actor_id=a.actor_id
          ORDER BY first_batch_order,first_entry,first_member,id LIMIT 1
        ) p ON TRUE`,
          )
          .all(
            worldId,
            ...(actorCursor ? [actorCursor.id] : []),
            worldId,
            ...(valueCursor ? [valueCursor.sequence, valueCursor.id] : []),
            worldId,
          );
        const values = candidates
          .filter((row) => Number(row['kind']) === 1)
          .sort((a, b) => Number(a['cursor_order']) - Number(b['cursor_order']));
        const actors = candidates
          .filter((row) => Number(row['kind']) === 0)
          .sort((a, b) => Number(a['cursor_order']) - Number(b['cursor_order']));
        // Time and pressure can jointly exhaust a boundary even when neither
        // scalar envelope proves it alone. Inspect its grouped metadata, never
        // its evidence bodies, through the same native eligibility owner.
        for (const actor of actors) {
          if (typeof actor['boundary_directory'] !== 'string') continue;
          const directory = JSON.parse(actor['boundary_directory']) as ReceivedChargeDirectory;
          actor['eligible'] =
            eligibleReceivedChargeDirectories([directory], temporalFrontierFromColumns(actor))
              .length === 0;
        }
        const lastValue = values.at(-1),
          lastActor = actors.at(-1);
        let nextValueCursor =
          values.length === 128 && lastValue
            ? { worldId, sequence: Number(lastValue['sequence']), id: String(lastValue['id']) }
            : undefined;
        let nextActorCursor =
          actors.length === 128 && lastActor
            ? { worldId, id: String(lastActor['actor_id']) }
            : undefined;
        const groups = [
          actors.filter((row) => row['id'] !== null && row['eligible'] === true),
          values.filter((row) => !protects(String(row['id']))),
        ];
        const chosen: Array<{ kind: number; id: string; bytes: number }> = [];
        let bytes = 0;
        const blocked = [false, false],
          lastTaken: Array<Record<string, unknown> | undefined> = [];
        for (let turn = 0; turn < 128; turn++) {
          for (const kind of [this.firstCleanupKind, 1 - this.firstCleanupKind]) {
            if (blocked[kind]) continue;
            const row = groups[kind]![turn];
            if (!row) continue;
            const size = Number(row['bytes']);
            if (chosen.length && bytes + size > 262144) {
              blocked[kind] = true;
              continue;
            }
            chosen.push({ kind, id: String(row['id']), bytes: size });
            bytes += size;
            lastTaken[kind] = row;
          }
        }
        // Byte admission must not restart at the same few busy actors forever.
        // Resume after the last serviced head; an oversized head gets its turn
        // under the existing one-record exception on a following slice.
        if (blocked[0])
          nextActorCursor = lastTaken[0]
            ? { worldId, id: String(lastTaken[0]['actor_id']) }
            : actorCursor;
        if (blocked[1])
          nextValueCursor = lastTaken[1]
            ? {
                worldId,
                sequence: Number(lastTaken[1]['sequence']),
                id: String(lastTaken[1]['id']),
              }
            : valueCursor;
        if (!chosen.length) return { row: undefined, nextValueCursor, nextActorCursor };
        const row = await this.db
          .prepare(
            `WITH chosen AS MATERIALIZED (
          SELECT * FROM jsonb_to_recordset(?::jsonb) c(kind integer,id text,bytes bigint)
        ), removed_uses AS (
          DELETE FROM received_value_uses u USING chosen c
          WHERE u.world_id=? AND c.kind=0 AND u.owner_kind='mind_temporal_pages' AND u.owner_id=c.id
          RETURNING u.value_id
        ), nominated AS (
          UPDATE mind_perception_values p SET gc_candidate_seq=(SELECT revision FROM world_head WHERE world_id=?)
          WHERE p.world_id=? AND p.source_id IN(SELECT value_id FROM removed_uses)
            AND p.gc_candidate_seq IS NULL RETURNING 1
        ), removed_perspectives AS (
          DELETE FROM history_perspectives h USING chosen c,mind_temporal_pages p
          WHERE c.kind=0 AND p.world_id=? AND p.id=c.id AND h.world_id=p.world_id
            AND h.actor_id=p.actor_id AND h.temporal_life=p.physical_life AND h.temporal_epoch=p.receipt_epoch
            AND (h.temporal_batch_order,h.temporal_entry_index,0)>=(p.first_batch_order,p.first_entry,p.first_member)
            AND (h.temporal_batch_order,h.temporal_entry_index,0)<=(p.last_batch_order,p.last_entry,p.last_member)
          RETURNING 1
        ), removed_chunks AS (
          DELETE FROM mind_temporal_pages p USING chosen c
          WHERE p.world_id=? AND c.kind=0 AND p.id=c.id RETURNING c.bytes
        ), value_candidates AS MATERIALIZED (
          SELECT c.*,EXISTS(SELECT 1 FROM received_value_uses u WHERE u.world_id=? AND u.value_id=c.id) AS owned
          FROM chosen c WHERE c.kind=1
        ), removed_values AS (
          DELETE FROM mind_perception_values p USING value_candidates c
          WHERE p.world_id=? AND p.source_id=c.id AND NOT c.owned RETURNING c.bytes
        ), held AS (
          UPDATE mind_perception_values p SET gc_candidate_seq=NULL FROM value_candidates c
          WHERE p.world_id=? AND p.source_id=c.id AND c.owned RETURNING 1
        ) SELECT (SELECT count(*) FROM value_candidates) AS examined_values,
          (SELECT count(*) FROM removed_chunks) AS pages,
          (SELECT COALESCE(sum(bytes),0) FROM removed_chunks) AS chunk_bytes,
          (SELECT count(*) FROM removed_values) AS values_deleted,
          (SELECT count(*) FROM held) AS values_held,
          (SELECT COALESCE(sum(bytes),0) FROM removed_values) AS value_bytes`,
          )
          .get(
            JSON.stringify(chosen),
            worldId,
            worldId,
            worldId,
            worldId,
            worldId,
            worldId,
            worldId,
            worldId,
          );
        return { row, nextValueCursor, nextActorCursor };
      });
      const { row, nextValueCursor, nextActorCursor } = completed;
      this.firstCleanupKind = 1 - this.firstCleanupKind;
      this.valueCursor = nextValueCursor;
      this.actorCursor = nextActorCursor;
      countMetric('persistence.retiredChunksDeleted', Number(row?.['pages'] ?? 0));
      countMetric('persistence.retiredChunkBytesDeleted', Number(row?.['chunk_bytes'] ?? 0));
      countMetric('persistence.receivedValuesExamined', Number(row?.['examined_values'] ?? 0));
      countMetric('persistence.receivedValuesDeleted', Number(row?.['values_deleted'] ?? 0));
      countMetric('persistence.receivedValueBytesDeleted', Number(row?.['value_bytes'] ?? 0));
      return (
        Number(row?.['pages'] ?? 0) +
        Number(row?.['values_deleted'] ?? 0) +
        Number(row?.['values_held'] ?? 0) +
        Number(!!nextValueCursor || !!nextActorCursor)
      );
    } finally {
      endTiming('persistence.evidenceCleanup', mark);
    }
  }
}
