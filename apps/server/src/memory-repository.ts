import { insertRows } from './sql-rows.js';
import { createHash } from 'node:crypto';
import type {
  Awareness,
  ExperienceEntry,
  ExperienceSummary,
  MemoryRecord,
} from '@open-legend/domain';
import { EXPERIENCE_LIMITS } from '@open-legend/domain';
import { z } from 'zod';
import type { SqlDatabase } from './store.js';
import type { RecordChanges } from './world-records.js';

const sourceTables = {
  awareness: 'mind_awareness',
  memory: 'mind_memories',
  summary: 'mind_summaries',
} as const;
export type MemoryChanges = Map<string, Set<string> | null>;
type SourceKind = keyof typeof sourceTables;
const sourceRevision = (payload: string) => createHash('sha256').update(payload).digest('hex');
export const MEMORY_HISTORY_TABLES = ['mind_source_versions', 'mind_source_annotations'] as const;
// Paid derived artifacts follow operational backup, not gameplay rewind. SQLite
// can preserve them during a portable restore even though it cannot rank vectors.
export const MEMORY_CACHE_TABLES = ['memory_vector_cache'] as const;
export interface MemoryScope {
  worldId: string;
  actorId: string;
  generation: string;
}
export interface RetrievedMemory {
  memory: MemoryRecord;
  awareness?: Awareness;
  revision: string;
  score?: number;
}
export interface MemoryVector {
  id: string;
  revision: string;
  vector: number[];
}
export interface MemoryModel {
  model: string;
  dimensions: number;
}

/** SQL owns permission scope, current source eligibility and top-N selection. Text
 * interpretation remains with domain/AI owners; this repository invents no semantics.
 */
export class MemoryRepository {
  publicationRevision = 0;
  private actorRevisions = new Map<string, number>();
  actorRevision(actorId: string): number {
    return this.actorRevisions.get(actorId) ?? 0;
  }
  constructor(private readonly db: SqlDatabase) {}
  committed(changes: RecordChanges, restored = false) {
    const actors = new Set<string>();
    const mark = (id: string) => {
      const path = JSON.parse(id) as string[];
      const actor = path[path[1] === 'experience' ? 3 : 2];
      if (actor) actors.add(actor);
    };
    for (const [table, rows] of changes.writes)
      if (table.startsWith('mind_')) for (const row of rows) mark(row.id);
    for (const [table, ids] of changes.deletes)
      if (table.startsWith('mind_')) for (const id of ids) mark(id);
    if (restored) this.actorRevisions.clear();
    if (
      restored ||
      actors.size ||
      changes.writes.has('experience_state') ||
      changes.deletes.has('experience_state')
    )
      this.publicationRevision++;
    // Other actors' memories cannot invalidate this actor's asynchronous inspection.
    for (const actor of actors) this.actorRevisions.set(actor, this.publicationRevision);
  }

  async initialize() {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS recall_sources (
        world_id TEXT NOT NULL REFERENCES world_head(world_id), actor_id TEXT NOT NULL,
        id TEXT NOT NULL, source_kind TEXT NOT NULL, record_id TEXT NOT NULL, revision TEXT NOT NULL,
        event_id TEXT, memory_kind TEXT, acquisition TEXT, event_type TEXT,
        at DOUBLE PRECISION NOT NULL, importance DOUBLE PRECISION NOT NULL, required BIGINT NOT NULL,eligible BIGINT NOT NULL DEFAULT 0,
        PRIMARY KEY(world_id,actor_id,id,source_kind));
      CREATE INDEX IF NOT EXISTS recall_actor_rank ON recall_sources(world_id,actor_id,eligible,importance DESC,at DESC,id);
      CREATE INDEX IF NOT EXISTS recall_actor_recent ON recall_sources(world_id,actor_id,eligible,at DESC,id);
      CREATE INDEX IF NOT EXISTS recall_commitments ON recall_sources(world_id,actor_id,at,id) WHERE source_kind='memory' AND memory_kind='commitment' AND eligible=1;
      CREATE INDEX IF NOT EXISTS recall_actor_event ON recall_sources(world_id,actor_id,event_id);
      CREATE INDEX IF NOT EXISTS recall_required ON recall_sources(world_id,actor_id,required,eligible,id);
      CREATE INDEX IF NOT EXISTS recall_record ON recall_sources(world_id,source_kind,record_id);
      CREATE TABLE IF NOT EXISTS mind_summary_sources (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,summary_id TEXT NOT NULL,source_id TEXT NOT NULL,
        PRIMARY KEY(world_id,actor_id,summary_id,source_id));
      CREATE INDEX IF NOT EXISTS mind_summary_reverse ON mind_summary_sources(world_id,actor_id,source_id);
      CREATE TABLE IF NOT EXISTS mind_source_versions (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,source_kind TEXT NOT NULL,source_id TEXT NOT NULL,
        revision TEXT NOT NULL,payload TEXT NOT NULL,retired_revision BIGINT NOT NULL,
        PRIMARY KEY(world_id,actor_id,source_kind,source_id,revision));
      CREATE TABLE IF NOT EXISTS mind_source_annotations (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,source_kind TEXT NOT NULL,source_id TEXT NOT NULL,
        source_revision TEXT NOT NULL,namespace TEXT NOT NULL,revision BIGINT NOT NULL,payload TEXT NOT NULL,
        PRIMARY KEY(world_id,actor_id,source_kind,source_id,source_revision,namespace));
      CREATE TABLE IF NOT EXISTS memory_index_models (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,model TEXT NOT NULL,dimensions BIGINT NOT NULL,
        PRIMARY KEY(world_id,actor_id,model,dimensions));
      CREATE TABLE IF NOT EXISTS memory_index_queue (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,source_id TEXT NOT NULL,source_revision TEXT NOT NULL,
        model TEXT NOT NULL,dimensions BIGINT NOT NULL,importance DOUBLE PRECISION NOT NULL,at DOUBLE PRECISION NOT NULL,
        PRIMARY KEY(world_id,actor_id,source_id,model,dimensions));
      CREATE INDEX IF NOT EXISTS memory_index_due ON memory_index_queue(world_id,actor_id,model,dimensions,importance DESC,at DESC,source_id);
      CREATE TABLE IF NOT EXISTS memory_index_attempts (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,generation TEXT NOT NULL,source_id TEXT NOT NULL,
        source_revision TEXT NOT NULL,model TEXT NOT NULL,dimensions BIGINT NOT NULL,request_id TEXT NOT NULL,
        state TEXT NOT NULL,PRIMARY KEY(world_id,actor_id,source_id,source_revision,model,dimensions));
      CREATE TABLE IF NOT EXISTS memory_vector_cache (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,source_id TEXT NOT NULL,source_revision TEXT NOT NULL,
        model TEXT NOT NULL,dimensions BIGINT NOT NULL,embedding TEXT NOT NULL,
        PRIMARY KEY(world_id,actor_id,source_id,source_revision,model,dimensions));
    `);
    if (this.db.dialect === 'postgres')
      await this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_vectors (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,generation TEXT NOT NULL,source_id TEXT NOT NULL,
        source_revision TEXT NOT NULL,model TEXT NOT NULL,dimensions BIGINT NOT NULL,embedding public.vector NOT NULL,
        PRIMARY KEY(world_id,actor_id,source_id,model,dimensions),
        CHECK(public.vector_dims(embedding)=dimensions));
      ALTER TABLE memory_vectors ALTER COLUMN embedding SET STORAGE PLAIN;
      CREATE INDEX IF NOT EXISTS memory_vector_scope ON memory_vectors(world_id,actor_id,generation,model,dimensions,source_id,source_revision);
    `);
  }
  /** Called before current rows change, inside their transaction. Retired/corrected
   * source versions preserve provenance for future consolidation policies.
   */
  async project(
    worldId: string,
    revision: number,
    changes: RecordChanges,
    archive = true,
  ): Promise<MemoryChanges> {
    const affected: MemoryChanges = new Map();
    const touch = (actor: string, id: string) => {
      if (affected.get(actor) === null) return;
      const ids = affected.get(actor) ?? new Set<string>();
      ids.add(id);
      affected.set(actor, ids);
    };
    for (const [kind, table] of Object.entries(sourceTables)) {
      const writes = changes.writes.get(table) ?? [];
      const direct = changes.deletes.get(table) ?? [];
      const parents = new Set([
        'data_world',
        'world_settings',
        `${table}_owners`,
        ...(kind === 'memory' ? [] : ['experience_state']),
      ]);
      const ancestors = [...changes.deletes]
        .filter(([name]) => parents.has(name))
        .flatMap(([, ids]) => ids);
      const ids = new Set([...direct, ...writes.filter((row) => !row.create).map((row) => row.id)]);
      // Only deletion needs ancestor matching; ordinary appends inspect their own IDs.
      for (const ancestor of ancestors) {
        const prefix = ancestor === '[]' ? '[' : ancestor.slice(0, -1) + ',';
        const rows = await this.db
          .prepare(`SELECT id FROM ${table} WHERE world_id=? AND substr(id,1,?)=?`)
          .all(worldId, [...prefix].length, prefix);
        for (const row of rows) ids.add(String(row['id']));
      }
      const next = new Map(writes.map((row) => [row.id, row.payload]));
      const sourceRows: unknown[][] = [],
        links: unknown[][] = [];
      const allIds = [...ids];
      for (let offset = 0; offset < allIds.length; offset += 800) {
        const batch = allIds.slice(offset, offset + 800);
        const placeholders = batch.map(() => '?').join(',');
        const old = await this.db
          .prepare(
            `SELECT id,actor_id,source_id,payload FROM ${table} WHERE world_id=? AND id IN (${placeholders})`,
          )
          .all(worldId, ...batch);
        for (const row of old) touch(String(row['actor_id']), String(row['source_id']));
        await insertRows(
          this.db,
          'mind_source_versions',
          (archive ? old : [])
            .filter((row) => row['payload'] !== next.get(String(row['id'])))
            .map((row) => [
              worldId,
              row['actor_id'],
              kind,
              row['source_id'],
              sourceRevision(String(row['payload'])),
              row['payload'],
              revision,
            ]),
          'ON CONFLICT DO NOTHING',
        );
        if (kind === 'summary') {
          await this.db
            .prepare(
              `DELETE FROM mind_summary_sources WHERE world_id=? AND EXISTS (SELECT 1 FROM recall_sources r WHERE r.world_id=mind_summary_sources.world_id AND r.actor_id=mind_summary_sources.actor_id AND r.id=mind_summary_sources.summary_id AND r.source_kind='summary' AND r.record_id IN (${placeholders}))`,
            )
            .run(worldId, ...batch);
        }
        await this.db
          .prepare(
            `DELETE FROM recall_sources WHERE world_id=? AND source_kind=? AND record_id IN (${placeholders})`,
          )
          .run(worldId, kind, ...batch);
      }
      for (const row of writes) {
        const path = JSON.parse(row.id) as string[];
        const actorId = kind === 'memory' ? path[2]! : path[3]!;
        const value = JSON.parse(row.payload) as Record<string, unknown>;
        const id = String(value[kind === 'awareness' ? 'eventId' : 'id']);
        sourceRows.push([
          worldId,
          actorId,
          id,
          kind,
          row.id,
          sourceRevision(row.payload),
          value['eventId'] ?? null,
          value['kind'] ?? null,
          value['source'] ?? null,
          value['eventType'] ?? null,
          value[kind === 'summary' ? 'to' : 'at'],
          value['importance'],
          value['kind'] === 'commitment' && !value['resolved'] ? 1 : 0,
          0,
        ]);
        touch(actorId, id);
        if (kind === 'summary')
          for (const sourceId of value['sourceIds'] as string[])
            links.push([worldId, actorId, id, sourceId]);
      }
      await insertRows(this.db, 'recall_sources', sourceRows);
      await insertRows(this.db, 'mind_summary_sources', links, 'ON CONFLICT DO NOTHING');
    }
    for (const table of ['mind_forgotten', 'mind_corrections']) {
      for (const row of changes.writes.get(table) ?? []) {
        const path = JSON.parse(row.id) as string[];
        affected.set(path[3]!, null);
      }
      for (const id of changes.deletes.get(table) ?? [])
        affected.set((JSON.parse(id) as string[])[3]!, null);
      for (const id of changes.deletes.get(`${table}_owners`) ?? [])
        affected.set((JSON.parse(id) as string[])[3]!, null);
    }
    if (changes.deletes.has('experience_state'))
      for (const row of await this.db
        .prepare('SELECT DISTINCT actor_id FROM recall_sources WHERE world_id=?')
        .all(worldId))
        affected.set(String(row['actor_id']), null);
    return affected;
  }
  /** Current eligibility is a transactional index, never inferred from vector presence. */
  async reconcile(worldId: string, changes: MemoryChanges) {
    const small: [string, string][] = [];
    for (const [actorId, ids] of changes) {
      if (ids && ids.size <= 1000) {
        for (const id of ids) small.push([actorId, id]);
        continue;
      }
      await this.db
        .prepare(
          `WITH
          forgotten AS MATERIALIZED (SELECT source_id FROM mind_forgotten WHERE world_id=? AND actor_id=?),
          corrected AS MATERIALIZED (SELECT source_id FROM mind_corrections WHERE world_id=? AND actor_id=?),
          aware AS MATERIALIZED (SELECT id FROM recall_sources WHERE world_id=? AND actor_id=? AND source_kind='awareness'),
          invalid_summaries AS MATERIALIZED (SELECT summary_id FROM mind_summary_sources WHERE world_id=? AND actor_id=? AND
            (source_id IN (SELECT source_id FROM forgotten) OR source_id IN (SELECT source_id FROM corrected)))
          UPDATE recall_sources AS r SET eligible=CASE WHEN
            r.id NOT IN (SELECT source_id FROM forgotten) AND (r.event_id IS NULL OR r.event_id NOT IN (SELECT source_id FROM forgotten))
            AND (r.source_kind<>'memory' OR ((r.memory_kind='commitment' OR (r.memory_kind='episode' AND r.acquisition<>'inferred'))
              AND (r.memory_kind<>'episode' OR r.event_id IS NULL OR r.event_id NOT IN (SELECT id FROM aware))))
            AND (r.source_kind<>'summary' OR r.id NOT IN (SELECT summary_id FROM invalid_summaries))
            THEN 1 ELSE 0 END WHERE r.world_id=? AND r.actor_id=?`,
        )
        .run(
          worldId,
          actorId,
          worldId,
          actorId,
          worldId,
          actorId,
          worldId,
          actorId,
          worldId,
          actorId,
        );

      if (this.db.dialect === 'postgres')
        await this.db
          .prepare(
            `DELETE FROM memory_vectors AS v WHERE v.world_id=? AND v.actor_id=? AND NOT EXISTS
          (SELECT 1 FROM recall_sources r WHERE r.world_id=v.world_id AND r.actor_id=v.actor_id AND r.id=v.source_id AND r.revision=v.source_revision AND r.eligible=1)`,
          )
          .run(worldId, actorId);
      await this.refreshQueue(worldId, actorId, null);
    }
    // An action can create observations for hundreds of actors. Batch their indexed
    // dependencies together instead of paying one database round trip per witness.
    for (let offset = 0; offset < small.length; offset += 250) {
      const pairs = small.slice(offset, offset + 250);
      const cte = `WITH changed(actor_id,id) AS (VALUES ${pairs.map(() => '(?,?)').join(',')}),
        affected AS MATERIALIZED (SELECT actor_id,id FROM changed
          UNION SELECT r.actor_id,r.id FROM changed c CROSS JOIN recall_sources r WHERE r.world_id=? AND r.actor_id=c.actor_id AND r.event_id=c.id
          UNION SELECT s.actor_id,s.summary_id FROM changed c CROSS JOIN mind_summary_sources s WHERE s.world_id=? AND s.actor_id=c.actor_id AND s.source_id=c.id)`;
      const params = [...pairs.flat(), worldId, worldId, worldId];
      const target = '(r.actor_id,r.id) IN (SELECT actor_id,id FROM affected)';
      await this.db
        .prepare(
          `${cte} UPDATE recall_sources AS r SET eligible=CASE WHEN ${this.sourceEligibility} THEN 1 ELSE 0 END WHERE r.world_id=? AND ${target}`,
        )
        .run(...params);
      if (this.db.dialect !== 'postgres') continue;
      await this.db
        .prepare(
          `${cte} DELETE FROM memory_vectors AS v WHERE v.world_id=? AND (actor_id,source_id) IN (SELECT actor_id,id FROM affected) AND NOT EXISTS
        (SELECT 1 FROM recall_sources r WHERE r.world_id=v.world_id AND r.actor_id=v.actor_id AND r.id=v.source_id AND r.revision=v.source_revision AND r.eligible=1)`,
        )
        .run(...params);
      await this.db
        .prepare(
          `${cte} DELETE FROM memory_index_queue WHERE world_id=? AND (actor_id,source_id) IN (SELECT actor_id,id FROM affected)`,
        )
        .run(...params);
      await this.db
        .prepare(
          `${cte} INSERT INTO memory_index_queue
        SELECT r.world_id,r.actor_id,r.id,r.revision,m.model,m.dimensions,r.importance,r.at
        FROM recall_sources r JOIN memory_index_models m ON m.world_id=r.world_id AND m.actor_id=r.actor_id
        WHERE r.world_id=? AND r.eligible=1 AND ${target}
        AND NOT EXISTS (SELECT 1 FROM memory_vectors v WHERE v.world_id=r.world_id AND v.actor_id=r.actor_id AND v.source_id=r.id AND v.source_revision=r.revision AND v.model=m.model AND v.dimensions=m.dimensions)
        AND NOT EXISTS (SELECT 1 FROM memory_index_attempts a WHERE a.world_id=r.world_id AND a.actor_id=r.actor_id AND a.source_id=r.id AND a.source_revision=r.revision AND a.model=m.model AND a.dimensions=m.dimensions)
        ON CONFLICT DO NOTHING`,
        )
        .run(...params);
    }
  }

  private async refreshQueue(worldId: string, actorId: string, ids: Set<string> | null) {
    if (this.db.dialect !== 'postgres') return;
    const values = ids ? [...ids] : [];
    for (let offset = 0; offset < Math.max(1, values.length); offset += 250) {
      const batch = values.slice(offset, offset + 250),
        params = batch.map(() => '?').join(',');
      const target = ids
        ? ` IN (${batch.map(() => 'SELECT ?').join(' UNION ')}
        UNION SELECT id FROM recall_sources WHERE world_id=? AND actor_id=? AND event_id IN (${params})
        UNION SELECT summary_id FROM mind_summary_sources WHERE world_id=? AND actor_id=? AND source_id IN (${params}))`
        : '';
      const args = ids ? [...batch, worldId, actorId, ...batch, worldId, actorId, ...batch] : [];
      await this.db
        .prepare(
          `DELETE FROM memory_index_queue WHERE world_id=? AND actor_id=?${ids ? ` AND source_id${target}` : ''}`,
        )
        .run(worldId, actorId, ...args);
      await this.db
        .prepare(
          `INSERT INTO memory_index_queue
        SELECT r.world_id,r.actor_id,r.id,r.revision,m.model,m.dimensions,r.importance,r.at
        FROM recall_sources r JOIN memory_index_models m ON m.world_id=r.world_id AND m.actor_id=r.actor_id
        WHERE r.world_id=? AND r.actor_id=? AND r.eligible=1${ids ? ` AND r.id${target}` : ''}
        AND NOT EXISTS (SELECT 1 FROM memory_vectors v WHERE v.world_id=r.world_id AND v.actor_id=r.actor_id AND v.source_id=r.id AND v.source_revision=r.revision AND v.model=m.model AND v.dimensions=m.dimensions)
        AND NOT EXISTS (SELECT 1 FROM memory_index_attempts a WHERE a.world_id=r.world_id AND a.actor_id=r.actor_id AND a.source_id=r.id AND a.source_revision=r.revision AND a.model=m.model AND a.dimensions=m.dimensions)
        ON CONFLICT DO NOTHING`,
        )
        .run(worldId, actorId, ...args);
      if (!ids) break;
    }
  }
  private readonly registeredModels = new Set<string>();
  private snapshot<T>(operation: () => Promise<T>): Promise<T> {
    return this.db.readTransaction
      ? this.db.readTransaction(operation)
      : this.db.transaction(operation);
  }
  private eligible = `r.world_id=? AND r.actor_id=? AND (SELECT generation FROM world_head WHERE id=1)=? AND r.eligible=1`;
  private sourceEligibility = `NOT EXISTS (SELECT 1 FROM mind_forgotten f WHERE f.world_id=r.world_id AND f.actor_id=r.actor_id AND (f.source_id=r.id OR f.source_id=r.event_id))
    AND (r.source_kind<>'memory' OR ((r.memory_kind='commitment' OR (r.memory_kind='episode' AND r.acquisition<>'inferred'))
      AND NOT (r.memory_kind='episode' AND r.event_id IS NOT NULL AND EXISTS (SELECT 1 FROM recall_sources a WHERE a.world_id=r.world_id AND a.actor_id=r.actor_id AND a.source_kind='awareness' AND a.id=r.event_id))))
    AND (r.source_kind<>'summary' OR NOT EXISTS (
      SELECT 1 FROM mind_summary_sources s WHERE s.world_id=r.world_id AND s.actor_id=r.actor_id AND s.summary_id=r.id AND
      (EXISTS (SELECT 1 FROM mind_forgotten f WHERE f.world_id=s.world_id AND f.actor_id=s.actor_id AND f.source_id=s.source_id)
       OR EXISTS (SELECT 1 FROM mind_corrections c WHERE c.world_id=s.world_id AND c.actor_id=s.actor_id AND c.source_id=s.source_id))))`;
  private params(scope: MemoryScope) {
    return [scope.worldId, scope.actorId, scope.generation];
  }
  async context(
    scope: MemoryScope,
    requiredIds: string[],
    includeConversation: boolean,
    activeConversation?: string,
  ) {
    return this.snapshot(async () => {
      const watermark = await this.db
        .prepare(
          'SELECT MAX(sequence) AS sequence FROM mind_awareness WHERE world_id=? AND actor_id=? AND (SELECT generation FROM world_head WHERE id=1)=?',
        )
        .get(...this.params(scope));
      let conversation = activeConversation;
      if (includeConversation && !conversation) {
        let order = -1;
        for (let offset = 0; offset < requiredIds.length; offset += 500) {
          const ids = requiredIds.slice(offset, offset + 500);
          const row = await this.db
            .prepare(
              `SELECT e.conversation_id,a.sequence FROM mind_awareness a JOIN history_events e ON e.world_id=a.world_id AND e.id=a.source_id
            WHERE a.world_id=? AND a.actor_id=? AND a.source_id IN (${ids.map(() => '?').join(',')}) AND a.event_id IS NOT NULL AND e.conversation_id IS NOT NULL
            AND (SELECT generation FROM world_head WHERE id=1)=? ORDER BY a.sequence DESC LIMIT 1`,
            )
            .get(scope.worldId, scope.actorId, ...ids, scope.generation);
          if (row && Number(row['sequence']) > order) {
            order = Number(row['sequence']);
            conversation = String(row['conversation_id']);
          }
        }
      }
      const rows =
        includeConversation && conversation
          ? await this.db
              .prepare(
                `SELECT a.source_id FROM history_events e
        JOIN mind_awareness a ON a.world_id=e.world_id AND a.source_id=e.id
        JOIN recall_sources r ON r.world_id=a.world_id AND r.actor_id=a.actor_id AND r.id=a.source_id AND r.source_kind='awareness'
        WHERE ${this.eligible} AND e.conversation_id=? AND ${this.db.dialect === 'postgres' ? "(e.payload::jsonb->>'type')" : "json_extract(e.payload,'$.type')"}='speech'
        ORDER BY a.sequence`,
              )
              .all(...this.params(scope), conversation)
          : [];
      const required = new Set(requiredIds);
      return {
        sequence: Number(watermark?.['sequence'] ?? 0),
        conversationIds: rows
          .map((row) => String(row['source_id']))
          .filter((id) => !required.has(id)),
      };
    });
  }
  async entry(scope: MemoryScope, key: string): Promise<ExperienceEntry | undefined> {
    const separator = key.indexOf(':');
    const kind = key.slice(0, separator);
    if (!Object.hasOwn(sourceTables, kind)) return undefined;
    const table = sourceTables[kind as SourceKind];
    const row = await this.db
      .prepare(
        `SELECT payload FROM ${table} WHERE world_id=? AND actor_id=? AND source_id=?
      AND (SELECT generation FROM world_head WHERE id=1)=?`,
      )
      .get(scope.worldId, scope.actorId, key.slice(separator + 1), scope.generation);
    return row
      ? ({ source: kind, value: JSON.parse(String(row['payload'])) } as ExperienceEntry)
      : undefined;
  }
  async page(
    scope: MemoryScope,
    before?: string,
  ): Promise<{ entries: ExperienceEntry[]; more: boolean } | undefined> {
    return this.snapshot(() => this.readPage(scope, before));
  }
  private async readPage(
    scope: MemoryScope,
    before?: string,
  ): Promise<{ entries: ExperienceEntry[]; more: boolean } | undefined> {
    const cursor = before ? await this.entry(scope, before) : undefined;
    if (before && !cursor) return undefined;
    const time = cursor
      ? cursor.source === 'summary'
        ? cursor.value.to
        : cursor.value.at
      : undefined;
    const params: unknown[] = [];
    const queries = Object.entries(sourceTables).map(([kind, table], index) => {
      params.push(scope.worldId, scope.actorId, ...(cursor ? [time, time, time, before] : []));
      return `SELECT * FROM (SELECT '${kind}' AS source,'${kind}:' || source_id AS key,at,payload FROM ${table}
        WHERE world_id=? AND actor_id=?${cursor ? ` AND at<=? AND (at<? OR (at=? AND '${kind}:' || source_id>?))` : ''}
        ORDER BY at DESC,source_id LIMIT 101) AS family${index}`;
    });
    const rows = await this.db
      .prepare(
        `SELECT * FROM (${queries.join(' UNION ALL ')}) AS sources
      WHERE (SELECT generation FROM world_head WHERE id=1)=? ORDER BY at DESC,key LIMIT 101`,
      )
      .all(...params, scope.generation);
    return {
      entries: rows.slice(0, 100).map(
        (row) =>
          ({
            source: row['source'],
            value: JSON.parse(String(row['payload'])),
          }) as ExperienceEntry,
      ),
      more: rows.length > 100,
    };
  }
  /** Optional policy-owned metadata. No classifier or importance/retention rule lives
   * here; callers supply a namespace, exact source version and expected annotation revision.
   */
  async annotate(
    scope: MemoryScope,
    source: { kind: SourceKind; id: string; revision: string },
    namespace: string,
    expectedRevision: number,
    value: unknown,
  ): Promise<number> {
    if (
      !/^[a-z][a-z0-9._-]{0,63}$/.test(namespace) ||
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 0
    )
      throw new Error('Invalid annotation identity.');
    const payload = JSON.stringify(z.json().parse(value));
    const row = await this.db
      .prepare(
        `INSERT INTO mind_source_annotations
      SELECT r.world_id,r.actor_id,r.source_kind,r.id,r.revision,?,1,? FROM recall_sources r
      WHERE r.world_id=? AND r.actor_id=? AND r.source_kind=? AND r.id=? AND r.revision=?
      AND (SELECT generation FROM world_head WHERE id=1)=?
      AND (?=0 OR EXISTS (SELECT 1 FROM mind_source_annotations a WHERE a.world_id=r.world_id AND a.actor_id=r.actor_id AND a.source_kind=r.source_kind AND a.source_id=r.id AND a.source_revision=r.revision AND a.namespace=?))
      ON CONFLICT(world_id,actor_id,source_kind,source_id,source_revision,namespace)
      DO UPDATE SET revision=mind_source_annotations.revision+1,payload=excluded.payload WHERE mind_source_annotations.revision=? RETURNING revision`,
      )
      .get(
        namespace,
        payload,
        scope.worldId,
        scope.actorId,
        source.kind,
        source.id,
        source.revision,
        scope.generation,
        expectedRevision,
        namespace,
        expectedRevision,
      );
    if (!row) throw new Error('Source or annotation changed; refresh before editing.');
    return Number(row['revision']);
  }
  async annotations(
    scope: MemoryScope,
    source: { kind: SourceKind; id: string; revision: string },
  ) {
    const rows = await this.db
      .prepare(
        `SELECT a.namespace,a.revision,a.payload FROM mind_source_annotations a
      JOIN recall_sources r ON r.world_id=a.world_id AND r.actor_id=a.actor_id AND r.source_kind=a.source_kind AND r.id=a.source_id AND r.revision=a.source_revision
      WHERE r.world_id=? AND r.actor_id=? AND r.source_kind=? AND r.id=? AND r.revision=? AND (SELECT generation FROM world_head WHERE id=1)=? ORDER BY a.namespace`,
      )
      .all(scope.worldId, scope.actorId, source.kind, source.id, source.revision, scope.generation);
    return rows.map((row) => ({
      namespace: String(row['namespace']),
      revision: Number(row['revision']),
      value: JSON.parse(String(row['payload'])) as unknown,
    }));
  }
  async commitments(scope: MemoryScope): Promise<RetrievedMemory[]> {
    return this.snapshot(async () =>
      this.hydrate(
        await this.db
          .prepare(
            `SELECT r.* FROM recall_sources r WHERE ${this.eligible} AND r.source_kind='memory' AND r.memory_kind='commitment' ORDER BY r.at,r.id`,
          )
          .all(...this.params(scope)),
      ),
    );
  }
  /** Indexed scheduling facts only; a wakeup must not reconstruct an actor's past. */
  async maintenanceStatus(scope: MemoryScope, simTime: number) {
    return this.snapshot(async () => {
      const hasMemories = !!(await this.db
        .prepare(`SELECT 1 AS present FROM recall_sources r WHERE ${this.eligible} LIMIT 1`)
        .get(...this.params(scope)));
      const cutoff = simTime - EXPERIENCE_LIMITS.rawHours * 3600;
      let rawDue = false,
        pressure = false;
      for (const table of ['mind_awareness', 'mind_memories']) {
        rawDue ||= !!(await this.db
          .prepare(
            `SELECT 1 AS present FROM ${table} WHERE world_id=? AND actor_id=? AND at<=?${table === 'mind_memories' ? " AND kind='episode'" : ''} LIMIT 1`,
          )
          .get(scope.worldId, scope.actorId, cutoff));
        pressure ||= !!(await this.db
          .prepare(
            `SELECT 1 AS present FROM ${table} WHERE world_id=? AND actor_id=? LIMIT 1 OFFSET ?`,
          )
          .get(
            scope.worldId,
            scope.actorId,
            EXPERIENCE_LIMITS.consolidationPressure + (table === 'mind_memories' ? 16 : 0) - 1,
          ));
      }
      return { hasMemories, rawDue, pressure };
    });
  }
  /** Database selection keeps cold sources available to legacy invention context and HUD. */
  async selectContext(
    scope: MemoryScope,
    query: string | null,
    limit: number,
  ): Promise<RetrievedMemory[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 300)
      throw new Error('Invalid context limit.');
    return this.snapshot(async () => {
      if (query === null)
        return this.hydrate(
          await this.db
            .prepare(
              `SELECT r.* FROM recall_sources r WHERE ${this.eligible} ORDER BY r.at DESC,r.id LIMIT ?`,
            )
            .all(...this.params(scope), limit),
        );
      const field = (alias: string, name: string) =>
        this.db.dialect === 'postgres'
          ? `${alias}.payload::jsonb ->> '${name}'`
          : `json_extract(${alias}.payload, '$.${name}')`;
      const words =
        this.db.dialect === 'postgres'
          ? 'SELECT value FROM jsonb_array_elements_text(?::jsonb)'
          : 'SELECT value FROM json_each(?)';
      const text = `LOWER(COALESCE(${field('m', 'summary')},${field('a', 'text')},${field('s', 'text')},''))`;
      const contains =
        this.db.dialect === 'postgres' ? `strpos(${text},w.value)>0` : `instr(${text},w.value)>0`;
      const rows = await this.db
        .prepare(
          `SELECT r.* FROM recall_sources r
        LEFT JOIN mind_memories m ON r.source_kind='memory' AND m.world_id=r.world_id AND m.id=r.record_id
        LEFT JOIN mind_awareness a ON r.source_kind='awareness' AND a.world_id=r.world_id AND a.id=r.record_id
        LEFT JOIN mind_summaries s ON r.source_kind='summary' AND s.world_id=r.world_id AND s.id=r.record_id
        WHERE ${this.eligible}
        ORDER BY (r.importance + CASE WHEN r.required=1 THEN 20 ELSE 0 END +
          5*(SELECT COUNT(*) FROM (${words}) w WHERE ${contains})) DESC,r.at DESC,r.id LIMIT ?`,
        )
        .all(
          ...this.params(scope),
          JSON.stringify(query.toLowerCase().split(/\W+/).filter(Boolean)),
          limit,
        );
      return this.hydrate(rows);
    });
  }
  private async hydrate(rows: Record<string, unknown>[]): Promise<RetrievedMemory[]> {
    const result: RetrievedMemory[] = [];
    for (const kind of Object.keys(sourceTables) as SourceKind[]) {
      const selected = rows.filter((row) => row['source_kind'] === kind);
      for (let offset = 0; offset < selected.length; offset += 800) {
        const batch = selected.slice(offset, offset + 800);
        const values = await this.db
          .prepare(
            `SELECT id,payload FROM ${sourceTables[kind]} WHERE world_id=? AND id IN (${batch.map(() => '?').join(',')})`,
          )
          .all(batch[0]!['world_id'], ...batch.map((row) => row['record_id']));
        const byId = new Map(values.map((row) => [row['id'], String(row['payload'])]));
        for (const row of batch) {
          const payload = byId.get(row['record_id']);
          if (!payload || sourceRevision(payload) !== row['revision']) continue;
          const actorId = String(row['actor_id']);
          let memory: MemoryRecord;
          let awareness: Awareness | undefined;
          if (kind === 'awareness') {
            awareness = JSON.parse(payload) as Awareness;
            memory = {
              id: awareness.eventId,
              eventId: awareness.eventId,
              actorId,
              at: awareness.at,
              sequence: awareness.sequence,
              kind: 'episode',
              source: awareness.modality,
              summary: awareness.text,
              entityIds: awareness.entityIds,
              importance: awareness.importance,
              eventType: awareness.eventType,
              speakerId: awareness.sourceId,
            };
          } else if (kind === 'summary') {
            const summary = JSON.parse(payload) as ExperienceSummary;
            memory = {
              id: summary.id,
              actorId,
              at: summary.to,
              kind: 'reflection',
              source: 'inferred',
              summary: `Summary of remembered experience: ${summary.text}`,
              entityIds: summary.entityIds,
              importance: summary.importance,
              sequence: summary.sequence,
            };
          } else memory = JSON.parse(payload) as MemoryRecord;
          result.push({
            memory,
            awareness,
            revision: String(row['revision']),
            ...(row['score'] !== undefined ? { score: Number(row['score']) } : {}),
          });
        }
      }
    }
    return result;
  }
  async count(scope: MemoryScope): Promise<number> {
    const row = await this.db
      .prepare(`SELECT COUNT(*) AS count FROM recall_sources r WHERE ${this.eligible}`)
      .get(...this.params(scope));
    return Number(row?.['count'] ?? 0);
  }
  async current(scope: MemoryScope, sources: { id: string; revision: string }[]): Promise<boolean> {
    return this.snapshot(async () => {
      for (let offset = 0; offset < sources.length; offset += 500) {
        const batch = sources.slice(offset, offset + 500);
        const rows = await this.db
          .prepare(
            `SELECT r.id,r.revision FROM recall_sources r WHERE ${this.eligible} AND r.id IN (${batch.map(() => '?').join(',')})`,
          )
          .all(...this.params(scope), ...batch.map((source) => source.id));
        const versions = new Map(rows.map((row) => [row['id'], row['revision']]));
        if (batch.some((source) => versions.get(source.id) !== source.revision)) return false;
      }
      return true;
    });
  }
  async coverage(scope: MemoryScope, model: MemoryModel) {
    return this.snapshot(() => this.readCoverage(scope, model));
  }
  private async readCoverage(scope: MemoryScope, model: MemoryModel) {
    const eligible = await this.count(scope);
    const row =
      this.db.dialect === 'postgres'
        ? await this.db
            .prepare(
              `SELECT COUNT(*) AS count FROM memory_vectors
      WHERE world_id=? AND actor_id=? AND generation=? AND model=? AND dimensions=? AND (SELECT generation FROM world_head WHERE id=1)=?`,
            )
            .get(
              scope.worldId,
              scope.actorId,
              scope.generation,
              model.model,
              model.dimensions,
              scope.generation,
            )
        : undefined;
    const indexed = Number(row?.['count'] ?? 0);
    return { eligible, indexed, missing: Math.max(0, eligible - indexed) };
  }
  /** Exact event-time evidence for pending work, including sources evicted from RAM. */
  async evidence(scope: MemoryScope, ids: string[]): Promise<RetrievedMemory[]> {
    return this.snapshot(async () => {
      const unique = [...new Set(ids)];
      const rows: Record<string, unknown>[] = [];
      for (let offset = 0; offset < unique.length; offset += 500) {
        const batch = unique.slice(offset, offset + 500);
        rows.push(
          ...(await this.db
            .prepare(
              `SELECT r.* FROM recall_sources r WHERE ${this.eligible} AND r.source_kind='awareness' AND r.id IN (${batch.map(() => '?').join(',')})`,
            )
            .all(...this.params(scope), ...batch)),
        );
      }
      return this.hydrate(rows);
    });
  }
  async required(scope: MemoryScope, ids: string[]): Promise<RetrievedMemory[]> {
    return this.snapshot(() => this.readRequired(scope, ids));
  }
  private async readRequired(scope: MemoryScope, ids: string[]): Promise<RetrievedMemory[]> {
    const unique = [...new Set(ids)];
    const rows = await this.db
      .prepare(
        `SELECT r.* FROM recall_sources r WHERE ${this.eligible} AND r.required=1
      UNION ALL SELECT r.* FROM recall_sources r WHERE ${this.eligible} AND r.id IN
      (SELECT source_id FROM mind_corrections WHERE world_id=? AND actor_id=? UNION SELECT correction_id FROM mind_corrections WHERE world_id=? AND actor_id=?)`,
      )
      .all(
        ...this.params(scope),
        ...this.params(scope),
        scope.worldId,
        scope.actorId,
        scope.worldId,
        scope.actorId,
      );
    for (let offset = 0; offset < unique.length; offset += 350) {
      const batch = unique.slice(offset, offset + 350),
        params = batch.map(() => '?').join(',');
      rows.push(
        ...(await this.db
          .prepare(
            `SELECT r.* FROM recall_sources r WHERE ${this.eligible} AND r.id IN (${params})
        UNION ALL SELECT r.* FROM recall_sources r WHERE ${this.eligible} AND r.event_id IN (${params})`,
          )
          .all(...this.params(scope), ...batch, ...this.params(scope), ...batch)),
      );
    }
    return this.hydrate([
      ...new Map(rows.map((row) => [`${row['source_kind']}:${row['id']}`, row])).values(),
    ]);
  }
  async select(
    scope: MemoryScope,
    limit: number,
    semantic?: MemoryModel & { query: number[] },
  ): Promise<RetrievedMemory[]> {
    return this.snapshot(() => this.readSelection(scope, limit, semantic));
  }
  private async readSelection(
    scope: MemoryScope,
    limit: number,
    semantic?: MemoryModel & { query: number[] },
  ): Promise<RetrievedMemory[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
      throw new Error('Invalid memory selection size.');
    const fallback = await this.db
      .prepare(
        `SELECT r.* FROM recall_sources r WHERE ${this.eligible} ORDER BY r.importance DESC,r.at DESC,r.id LIMIT ?`,
      )
      .all(...this.params(scope), limit);
    if (!semantic || this.db.dialect !== 'postgres') return this.hydrate(fallback);
    this.validateVector(semantic, semantic.query);
    const rows = await this.db
      .prepare(
        `WITH matches AS MATERIALIZED (
          SELECT source_id,source_revision,1-(embedding OPERATOR(public.<=>) ?::public.vector) AS score
          FROM memory_vectors WHERE world_id=? AND actor_id=? AND generation=? AND model=? AND dimensions=?
            AND (SELECT generation FROM world_head WHERE id=1)=?
          ORDER BY embedding OPERATOR(public.<=>) ?::public.vector,source_id LIMIT ?)
        SELECT r.*,m.score FROM matches m JOIN recall_sources r ON r.id=m.source_id AND r.revision=m.source_revision
        WHERE ${this.eligible} ORDER BY m.score DESC,r.id`,
      )
      .all(
        JSON.stringify(semantic.query),
        scope.worldId,
        scope.actorId,
        scope.generation,
        semantic.model,
        semantic.dimensions,
        scope.generation,
        JSON.stringify(semantic.query),
        limit,
        ...this.params(scope),
      );
    const combined = [
      ...new Map([...rows, ...fallback].map((row) => [row['id'], row])).values(),
    ].slice(0, limit);
    // Map above must prefer the semantic row when its fallback copy is also present.
    const scores = new Map(rows.map((row) => [row['id'], row['score']]));
    for (const row of combined) if (scores.has(row['id'])) row['score'] = scores.get(row['id']);
    return this.hydrate(combined);
  }
  async pending(scope: MemoryScope, model: MemoryModel, limit = 32): Promise<RetrievedMemory[]> {
    if (this.db.dialect !== 'postgres') return [];
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
      throw new Error('Invalid indexing batch size.');
    const registration = JSON.stringify([
      scope.worldId,
      scope.actorId,
      model.model,
      model.dimensions,
    ]);
    if (!this.registeredModels.has(registration)) {
      await this.db.transaction(async () => {
        const added = await this.db
          .prepare(
            'INSERT INTO memory_index_models VALUES (?,?,?,?) ON CONFLICT DO NOTHING RETURNING model',
          )
          .get(scope.worldId, scope.actorId, model.model, model.dimensions);
        if (added) await this.refreshQueue(scope.worldId, scope.actorId, null);
      });
      this.registeredModels.add(registration);
      this.db.afterRollback?.(() => this.registeredModels.delete(registration));
    }
    const rows = await this.db
      .prepare(
        `WITH pending AS MATERIALIZED (SELECT * FROM memory_index_queue
      WHERE world_id=? AND actor_id=? AND model=? AND dimensions=? ORDER BY importance DESC,at DESC,source_id LIMIT ?)
      SELECT r.* FROM pending q JOIN recall_sources r
      ON r.world_id=q.world_id AND r.actor_id=q.actor_id AND r.id=q.source_id AND r.revision=q.source_revision
      WHERE r.eligible=1 AND (SELECT generation FROM world_head WHERE id=1)=?
      ORDER BY q.importance DESC,q.at DESC,q.source_id`,
      )
      .all(scope.worldId, scope.actorId, model.model, model.dimensions, limit, scope.generation);
    return this.hydrate(rows);
  }
  async markAttempt(
    scope: MemoryScope,
    model: MemoryModel,
    sources: RetrievedMemory[],
    requestId: string,
    reserve: () => Promise<boolean>,
  ): Promise<boolean> {
    if (!sources.length || sources.length > 1000) throw new Error('Invalid indexing claim size.');
    return this.db.transaction(async () => {
      const current = await this.db
        .prepare(
          `SELECT r.id,r.revision FROM recall_sources r
        WHERE ${this.eligible} AND r.id IN (${sources.map(() => '?').join(',')})
        AND NOT EXISTS (SELECT 1 FROM memory_index_attempts a WHERE a.world_id=r.world_id AND a.actor_id=r.actor_id
          AND a.source_id=r.id AND a.source_revision=r.revision AND a.model=? AND a.dimensions=?)`,
        )
        .all(
          ...this.params(scope),
          ...sources.map((s) => s.memory.id),
          model.model,
          model.dimensions,
        );
      const revisions = new Map(current.map((row) => [row['id'], row['revision']]));
      if (sources.some((source) => revisions.get(source.memory.id) !== source.revision))
        return false;
      if (!(await reserve())) return false;
      await insertRows(
        this.db,
        'memory_index_attempts',
        sources.map((source) => [
          scope.worldId,
          scope.actorId,
          scope.generation,
          source.memory.id,
          source.revision,
          model.model,
          model.dimensions,
          requestId,
          'dispatched',
        ]),
      );
      await this.db
        .prepare(
          `DELETE FROM memory_index_queue AS q WHERE q.world_id=? AND q.actor_id=? AND EXISTS
        (SELECT 1 FROM memory_index_attempts a WHERE a.world_id=q.world_id AND a.actor_id=q.actor_id AND a.source_id=q.source_id AND a.source_revision=q.source_revision AND a.model=q.model AND a.dimensions=q.dimensions AND a.request_id=?)`,
        )
        .run(scope.worldId, scope.actorId, requestId);
      return true;
    });
  }
  async putVectors(scope: MemoryScope, model: MemoryModel, values: MemoryVector[]) {
    if (this.db.dialect !== 'postgres') return;
    return this.db.transaction(() => this.publishVectors(scope, model, values));
  }
  private async publishVectors(scope: MemoryScope, model: MemoryModel, values: MemoryVector[]) {
    for (const value of values) this.validateVector(model, value.vector);
    await this.db
      .prepare(
        `INSERT INTO memory_vector_cache
      SELECT r.world_id,r.actor_id,r.id,r.revision,?,?,s.vector::text
      FROM jsonb_to_recordset(?::jsonb) AS s(id text,revision text,vector jsonb)
      JOIN recall_sources r ON r.id=s.id AND r.revision=s.revision WHERE ${this.eligible}
      ON CONFLICT DO NOTHING`,
      )
      .run(model.model, model.dimensions, JSON.stringify(values), ...this.params(scope));
    await this.db
      .prepare(
        `INSERT INTO memory_vectors
      SELECT r.world_id,r.actor_id,?,r.id,r.revision,?,?,s.vector::text::public.vector
      FROM jsonb_to_recordset(?::jsonb) AS s(id text,revision text,vector jsonb)
      JOIN recall_sources r ON r.id=s.id AND r.revision=s.revision WHERE ${this.eligible}
      ON CONFLICT(world_id,actor_id,source_id,model,dimensions) DO UPDATE SET generation=excluded.generation,source_revision=excluded.source_revision,embedding=excluded.embedding`,
      )
      .run(
        scope.generation,
        model.model,
        model.dimensions,
        JSON.stringify(values),
        ...this.params(scope),
      );
    await this.db
      .prepare(
        `DELETE FROM memory_index_queue q USING jsonb_to_recordset(?::jsonb) AS s(id text,revision text)
      WHERE q.world_id=? AND q.actor_id=? AND q.model=? AND q.dimensions=? AND q.source_id=s.id AND q.source_revision=s.revision
        AND (SELECT generation FROM world_head WHERE id=1)=?`,
      )
      .run(
        JSON.stringify(values.map(({ id, revision }) => ({ id, revision }))),
        scope.worldId,
        scope.actorId,
        model.model,
        model.dimensions,
        scope.generation,
      );
    await this.db
      .prepare(
        "UPDATE memory_index_attempts SET state='completed' WHERE world_id=? AND actor_id=? AND generation=? AND model=? AND dimensions=? AND EXISTS (SELECT 1 FROM memory_vectors v WHERE v.world_id=memory_index_attempts.world_id AND v.actor_id=memory_index_attempts.actor_id AND v.generation=memory_index_attempts.generation AND v.source_id=memory_index_attempts.source_id AND v.source_revision=memory_index_attempts.source_revision AND v.model=memory_index_attempts.model AND v.dimensions=memory_index_attempts.dimensions)",
      )
      .run(scope.worldId, scope.actorId, scope.generation, model.model, model.dimensions);
  }
  /** A restored identical source may reuse paid derived data. Publication still checks
   * the new generation, and dispatched/uncertain attempts stay outside gameplay rewind. */
  async reuseVectors(worldId: string, changed?: MemoryChanges) {
    if (this.db.dialect !== 'postgres') return;
    const pairs = changed
      ? [...changed].flatMap(([actor, ids]) => [...(ids ?? [])].map((id) => [actor, id]))
      : [];
    for (let offset = 0; offset < Math.max(1, pairs.length); offset += 300) {
      const batch = pairs.slice(offset, offset + 300);
      if (changed && !batch.length) break;
      await this.db
        .prepare(
          `INSERT INTO memory_vectors
        SELECT c.world_id,c.actor_id,h.generation,c.source_id,c.source_revision,c.model,c.dimensions,c.embedding::public.vector
        FROM recall_sources r JOIN memory_vector_cache c ON c.world_id=r.world_id AND c.actor_id=r.actor_id AND c.source_id=r.id AND c.source_revision=r.revision
        JOIN world_head h ON h.world_id=r.world_id
        WHERE r.world_id=? AND r.eligible=1${changed ? ` AND (r.actor_id,r.id) IN (VALUES ${batch.map(() => '(?,?)').join(',')})` : ''}
        ON CONFLICT(world_id,actor_id,source_id,model,dimensions) DO UPDATE SET generation=excluded.generation,source_revision=excluded.source_revision,embedding=excluded.embedding
        WHERE (memory_vectors.generation,memory_vectors.source_revision) IS DISTINCT FROM (excluded.generation,excluded.source_revision)`,
        )
        .run(worldId, ...batch.flat());
    }
    await this.db
      .prepare(
        `DELETE FROM memory_index_queue q WHERE q.world_id=? AND EXISTS (SELECT 1 FROM memory_vectors v
      WHERE v.world_id=q.world_id AND v.actor_id=q.actor_id AND v.source_id=q.source_id AND v.source_revision=q.source_revision AND v.model=q.model AND v.dimensions=q.dimensions)`,
      )
      .run(worldId);
  }
  private validateVector(model: MemoryModel, vector: number[]) {
    if (
      vector.length !== model.dimensions ||
      !vector.every(Number.isFinite) ||
      !vector.some((value) => value !== 0)
    )
      throw new Error('Embedding must be finite, nonzero and match configured dimensions.');
  }
}
