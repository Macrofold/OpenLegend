import { tableRows } from './record-pages.js';
import { insertRows } from './sql-rows.js';
import type { ConsolidationBatch } from './memory-consolidation.js';
import { matchesSearch, scanMatches, searchWords } from './text-search.js';
// Preparation allowance, not a retained-history or searchable-corpus limit.
export const RETRIEVAL_ROWS = 8192;
export const RETRIEVAL_BYTES = 4 * 1024 * 1024;
export class MemoryPreparationError extends Error {
  override readonly name = 'MemoryPreparationError';
  constructor() {
    super(
      'Required memory context exceeds preparation capacity. Use paged history or consolidate the conversation before another full-context decision; no evidence was discarded.',
    );
  }
}
export const MAINTENANCE_SOURCES = 128;
export const MAINTENANCE_BYTES = 512 * 1024;
import { createHash } from 'node:crypto';
import type {
  Awareness,
  ExperienceEntry,
  ExperienceSummary,
  MemoryRecord,
} from '@open-legend/domain';
import { EXPERIENCE_LIMITS, validEncounterExposure } from '@open-legend/domain';
import { z } from 'zod';
import type { SqlDatabase } from './store.js';
import type { RecordChanges } from './world-records.js';

export const MEMORY_SOURCE_TABLES = {
  awareness: 'mind_awareness',
  memory: 'mind_memories',
  summary: 'mind_summaries',
} as const;
const sourceTables = MEMORY_SOURCE_TABLES;
export type MemoryChanges = Map<string, Set<string> | null> & {
  placeIds?: Map<string, Set<string>>;
};
type SourceKind = keyof typeof sourceTables;
// Payload/text bodies must not leak into metadata selection before byte admission.
const sourceColumnNames = [
  'world_id',
  'actor_id',
  'id',
  'source_kind',
  'record_id',
  'revision',
  'event_id',
  'memory_kind',
  'acquisition',
  'event_type',
  'at',
  'importance',
  'required',
  'eligible',
  'sequence',
  'place_id',
  'place_label',
];
const sourceColumns = sourceColumnNames.map((name) => `r.${name}`).join(',');
const sourceRevision = (payload: string) => createHash('sha256').update(payload).digest('hex');
// Bound parameters are parsed as full-text values, never as SQL or locale-dependent text.
const quotedLexeme = (word: string) => `'${word.replace(/['\\]/g, '\\$&')}'`;
const indexedWord = (word: string) => Buffer.byteLength(word) < 2047;
function lexicalVector(text: string): string {
  const words = new Map<string, number[]>();
  let position = 0;
  for (const word of searchWords(text)) {
    // PostgreSQL's existing parser skips oversized lexemes without consuming a
    // position. Keep its byte/position/repetition edges, not a smaller ASCII limit.
    if (!indexedWord(word)) continue;
    position = Math.min(position + 1, 16383);
    const positions = words.get(word) ?? [];
    if (positions.length < 255 && positions.at(-1) !== position) positions.push(position);
    words.set(word, positions);
  }
  return [...words]
    .map(([word, positions]) => `${quotedLexeme(word)}:${positions.join(',')}`)
    .join(' ');
}
const lexicalQuery = (words: string[]) =>
  words
    .filter(indexedWord)
    .map((word) => `${quotedLexeme(word)}:*`)
    .join(' | ');
interface VectorEpoch {
  worldId: string;
  actorId: string;
  token: number;
  references: number;
}
interface CoverageEpochs {
  actorKey: string;
  modelKey: string;
  actor: VectorEpoch;
  model: VectorEpoch;
}
const actorScopeKey = (scope: MemoryScope) =>
  JSON.stringify([scope.worldId, scope.actorId, scope.generation]);
const modelScopeKey = (scope: MemoryScope, model: MemoryModel) =>
  JSON.stringify([scope.worldId, scope.actorId, scope.generation, model.model, model.dimensions]);
export const MEMORY_HISTORY_TABLES = ['mind_source_versions', 'mind_source_annotations'] as const;
// Paid derived artifacts follow operational backup, not gameplay rewind.
export const MEMORY_CACHE_TABLES = ['memory_vector_cache'] as const;
/** Request-owned body reuse; keys include actor, generation-independent source revision
 * and storage identity. Metadata eligibility is always read in the current SQL snapshot.
 * The bounded cache can evict bodies without narrowing retrieval or transcript coverage. */
export class MemoryReadCache {
  private values = new Map<string, { value: RetrievedMemory; bytes: number }>();
  private bytes = 0;
  private key(row: Record<string, unknown>): string {
    return JSON.stringify([
      row['world_id'],
      row['actor_id'],
      row['source_kind'],
      row['record_id'],
      row['revision'],
    ]);
  }
  get(row: Record<string, unknown>) {
    return this.values.get(this.key(row));
  }
  put(row: Record<string, unknown>, value: RetrievedMemory, bytes: number) {
    const key = this.key(row);
    if (this.values.has(key)) return;
    while (
      this.values.size &&
      (this.bytes + bytes > RETRIEVAL_BYTES || this.values.size >= RETRIEVAL_ROWS)
    ) {
      const oldest = this.values.keys().next().value!;
      this.bytes -= this.values.get(oldest)!.bytes;
      this.values.delete(oldest);
    }
    if (bytes <= RETRIEVAL_BYTES) {
      this.values.set(key, { value, bytes });
      this.bytes += bytes;
    }
  }
}

export interface CognitionPreparation {
  scope: MemoryScope;
  bodies: MemoryReadCache;
  conversation: Awaited<ReturnType<MemoryRepository['context']>>;
}

export interface MemoryScope {
  worldId: string;
  actorId: string;
  generation: string;
}
export interface ConversationSource {
  id: string;
  revision: string;
  sequence: number;
  correction: string;
}
export const conversationCompactionKey = (
  worldId: string,
  actorId: string,
  conversationId: string,
) => `conversation-compaction:${JSON.stringify([worldId, actorId, conversationId])}`;
export interface RetrievedMemory {
  memory: MemoryRecord;
  awareness?: Awareness;
  revision: string;
  score?: number;
}
export interface KnownPlaceSource extends RetrievedMemory {
  correctionId?: string;
  correction?: string;
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
  private coverageCache = new Map<
    string,
    {
      revision: number;
      reset: number;
      actorToken: number;
      modelToken: number;
      epochs: CoverageEpochs;
      value: { eligible: number; indexed: number; missing: number };
    }
  >();
  private resetEpoch = 0;
  private vectorToken = 0;
  private actorVectorEpochs = new Map<string, VectorEpoch>();
  private modelVectorEpochs = new Map<string, VectorEpoch>();
  private textSelection = new Map<
    string,
    { revision: number; reset: number; rows: Record<string, unknown>[] }
  >();
  private actorRevisions = new Map<string, number>();
  actorRevision(actorId: string): number {
    return this.actorRevisions.get(actorId) ?? 0;
  }
  constructor(private readonly db: SqlDatabase) {}
  private retainCoverage(scope: MemoryScope, model: MemoryModel): CoverageEpochs {
    const actorKey = actorScopeKey(scope),
      modelKey = modelScopeKey(scope, model);
    const retain = (map: Map<string, VectorEpoch>, key: string) => {
      let epoch = map.get(key);
      if (!epoch) {
        epoch = {
          worldId: scope.worldId,
          actorId: scope.actorId,
          token: ++this.vectorToken,
          references: 0,
        };
        map.set(key, epoch);
      }
      epoch.references++;
      return epoch;
    };
    return {
      actorKey,
      modelKey,
      actor: retain(this.actorVectorEpochs, actorKey),
      model: retain(this.modelVectorEpochs, modelKey),
    };
  }
  private releaseCoverage(epochs: CoverageEpochs) {
    for (const [map, key, epoch] of [
      [this.actorVectorEpochs, epochs.actorKey, epochs.actor],
      [this.modelVectorEpochs, epochs.modelKey, epochs.model],
    ] as const)
      if (--epoch.references === 0 && map.get(key) === epoch) map.delete(key);
  }
  private evictCoverage(key: string) {
    const cached = this.coverageCache.get(key);
    if (cached) this.releaseCoverage(cached.epochs);
    this.coverageCache.delete(key);
  }
  private resetCaches() {
    this.resetEpoch++;
    for (const key of this.coverageCache.keys()) this.evictCoverage(key);
    this.textSelection.clear();
    this.actorVectorEpochs.clear();
    this.modelVectorEpochs.clear();
  }
  private vectorPublication(scope: MemoryScope, model: MemoryModel) {
    const epoch = this.modelVectorEpochs.get(modelScopeKey(scope, model));
    if (epoch) epoch.token = ++this.vectorToken;
  }
  private vectorReuse(worldId: string, changed?: MemoryChanges) {
    if (!changed) return this.resetCaches();
    for (const epoch of this.actorVectorEpochs.values())
      if (epoch.worldId === worldId && changed.has(epoch.actorId)) epoch.token = ++this.vectorToken;
  }
  committed(changes: RecordChanges, restored = false) {
    const actors = new Set<string>();
    let unknownScope = changes.deletes.has('data_world') || changes.deletes.has('world_settings');
    // Current visibility/encounter bookkeeping is not retained evidence. A bird
    // crossing the view must not invalidate memory counts or wake the indexer.
    // Actual observations still arrive through mind_awareness in this same commit.
    const affectsMemory = (table: string) =>
      table.startsWith('mind_') &&
      !/^mind_(exposure|visible_objects|visible_people|visible_places)(?:_owners)?$/.test(table);
    const mark = (id: string) => {
      const path = JSON.parse(id) as string[];
      const actor = path[path[1] === 'experience' ? 3 : 2];
      if (actor) actors.add(actor);
      else unknownScope = true;
    };
    for (const [table, rows] of changes.writes)
      if (affectsMemory(table)) for (const row of rows) mark(row.id);
    for (const [table, ids] of changes.deletes)
      if (affectsMemory(table)) for (const id of ids) mark(id);
    if (
      restored ||
      unknownScope ||
      changes.writes.has('experience_state') ||
      changes.deletes.has('experience_state')
    )
      this.resetCaches();
    if (restored) {
      this.actorRevisions.clear();
    }
    if (
      restored ||
      unknownScope ||
      actors.size ||
      changes.writes.has('experience_state') ||
      changes.deletes.has('experience_state')
    )
      this.publicationRevision++;
    // Other actors' memories cannot invalidate this actor's asynchronous inspection.
    for (const actor of actors) this.actorRevisions.set(actor, this.publicationRevision);
  }

  async initialize() {
    const existing = await this.db
      .prepare("SELECT to_regclass('open_legend.recall_sources') AS relation")
      .get();
    if (existing?.['relation']) {
      const columns = await this.db
        .prepare(
          `SELECT a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,
            a.attgenerated AS generated,a.attnotnull AS required,
            pg_get_expr(d.adbin,d.adrelid) AS default_value
          FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
          WHERE a.attrelid=to_regclass('open_legend.recall_sources') AND NOT a.attisdropped
            AND a.attname IN ('search_text','search_vector')`,
        )
        .all();
      // A shared storage marker can predate this derived-column contract. Reject
      // that layout before CREATE IF NOT EXISTS hides it; never convert development
      // databases or replace their indexes/rows (AGENTS.md#development-save-policy).
      if (
        columns.length !== 2 ||
        !columns.every(
          (column) =>
            column['generated'] === '' &&
            column['required'] === true &&
            column['type'] === (column['name'] === 'search_text' ? 'text' : 'tsvector') &&
            column['default_value'] ===
              (column['name'] === 'search_text' ? "''::text" : "''::tsvector"),
        )
      )
        throw new Error(
          'Unsupported memory search projection. Existing data was not converted or deleted.',
        );
    }
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS recall_sources (
        world_id TEXT NOT NULL REFERENCES world_head(world_id), actor_id TEXT NOT NULL,
        id TEXT NOT NULL, source_kind TEXT NOT NULL, record_id TEXT NOT NULL, revision TEXT NOT NULL,
        event_id TEXT, memory_kind TEXT, acquisition TEXT, event_type TEXT,
        at DOUBLE PRECISION NOT NULL, importance DOUBLE PRECISION NOT NULL, required BIGINT NOT NULL,eligible BIGINT NOT NULL DEFAULT 0, sequence BIGINT NOT NULL DEFAULT 0,
        place_id TEXT, place_label TEXT, place_latest BIGINT NOT NULL DEFAULT 0,
        search_text TEXT NOT NULL DEFAULT '',
        search_vector tsvector NOT NULL DEFAULT ''::tsvector,
        PRIMARY KEY(world_id,actor_id,id,source_kind));
      CREATE INDEX IF NOT EXISTS recall_actor_rank ON recall_sources(world_id,actor_id,eligible,importance DESC,at DESC,id);
      CREATE INDEX IF NOT EXISTS recall_source_validation ON recall_sources(world_id,actor_id,eligible,id);
      CREATE INDEX IF NOT EXISTS recall_context_rank ON recall_sources(world_id,actor_id,eligible,required DESC,importance DESC,at DESC,id);
      CREATE INDEX IF NOT EXISTS recall_actor_recent ON recall_sources(world_id,actor_id,eligible,at DESC,id);
      CREATE INDEX IF NOT EXISTS recall_place_evidence ON recall_sources(world_id,actor_id,place_id,eligible,at DESC,sequence DESC,id DESC) WHERE place_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS recall_places ON recall_sources(world_id,actor_id,place_id) INCLUDE(id) WHERE place_latest=1 AND eligible=1;
      CREATE INDEX IF NOT EXISTS recall_commitments ON recall_sources(world_id,actor_id,at,id) WHERE source_kind='memory' AND memory_kind='commitment' AND eligible=1;
      CREATE INDEX IF NOT EXISTS recall_world_event ON recall_sources(world_id,event_id,actor_id);
      CREATE INDEX IF NOT EXISTS recall_actor_event ON recall_sources(world_id,actor_id,event_id);
      CREATE INDEX IF NOT EXISTS recall_required ON recall_sources(world_id,actor_id,required,eligible,id);
      CREATE INDEX IF NOT EXISTS recall_record ON recall_sources(world_id,source_kind,record_id);
      CREATE TABLE IF NOT EXISTS mind_summary_sources (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,summary_id TEXT NOT NULL,source_id TEXT NOT NULL,
        PRIMARY KEY(world_id,actor_id,summary_id,source_id));
      CREATE INDEX IF NOT EXISTS mind_summary_world_source ON mind_summary_sources(world_id,source_id,actor_id,summary_id);
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
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS recall_text_vector ON recall_sources USING GIN(search_vector);
      CREATE INDEX IF NOT EXISTS recall_maintenance ON recall_sources(world_id,actor_id,eligible,at,sequence,id);
      CREATE INDEX IF NOT EXISTS recall_maintenance_speech ON recall_sources(world_id,actor_id,eligible,event_type,at DESC,sequence DESC,id DESC);
    `);
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
    const placeIds = (affected.placeIds = new Map());
    const touchPlace = (actorId: string, value: Record<string, unknown>) => {
      const exposure = value['exposure'] as Awareness['exposure'];
      if (exposure?.kind !== 'place') return;
      const ids = placeIds.get(actorId) ?? new Set<string>();
      ids.add(exposure.id);
      placeIds.set(actorId, ids);
    };
    const invalidateConversations = new Set<string>();
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
        // Deleting an actor-owned list has an exact structural parent. Root/world/
        // experience deletion intentionally affects every source in that world.
        const path = JSON.parse(ancestor) as string[];
        const actorOwner = path.length === (kind === 'memory' ? 3 : 4);
        const rows = await this.db
          .prepare(
            `SELECT id FROM ${table} WHERE world_id=?${actorOwner ? ' AND parent_id=?' : ''}`,
          )
          .all(worldId, ...(actorOwner ? [ancestor] : []));
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
        for (const row of old) {
          touch(String(row['actor_id']), String(row['source_id']));
          if (kind === 'awareness')
            touchPlace(
              String(row['actor_id']),
              JSON.parse(String(row['payload'])) as Record<string, unknown>,
            );
          if (kind === 'awareness') invalidateConversations.add(String(row['actor_id']));
        }
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
        const exposure = value['exposure'] as Awareness['exposure'];
        if (kind === 'awareness') touchPlace(actorId, value);
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
          value['sequence'] ?? 0,
          kind === 'awareness' && exposure?.kind === 'place' ? exposure.id : null,
          kind === 'awareness' && exposure?.kind === 'place' ? exposure.label : null,
          value[kind === 'memory' ? 'summary' : 'text'] ?? '',
          lexicalVector(String(value[kind === 'memory' ? 'summary' : 'text'] ?? '')),
        ]);
        touch(actorId, id);
        if (kind === 'summary')
          for (const sourceId of value['sourceIds'] as string[])
            links.push([worldId, actorId, id, sourceId]);
      }
      await insertRows(
        this.db,
        `recall_sources(${[...sourceColumnNames, 'search_text', 'search_vector'].join(',')})`,
        sourceRows,
      );
      await insertRows(this.db, 'mind_summary_sources', links, 'ON CONFLICT DO NOTHING');
    }
    for (const table of ['mind_forgotten', 'mind_corrections']) {
      for (const row of changes.writes.get(table) ?? []) {
        const path = JSON.parse(row.id) as string[];
        affected.set(path[3]!, null);
        invalidateConversations.add(path[3]!);
      }
      for (const id of changes.deletes.get(table) ?? []) {
        affected.set((JSON.parse(id) as string[])[3]!, null);
        invalidateConversations.add((JSON.parse(id) as string[])[3]!);
      }
      for (const id of changes.deletes.get(`${table}_owners`) ?? []) {
        affected.set((JSON.parse(id) as string[])[3]!, null);
        invalidateConversations.add((JSON.parse(id) as string[])[3]!);
      }
    }
    for (const actorId of invalidateConversations)
      await this.invalidateConversationCompactions(worldId, actorId);
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
      // Restore/extraction can replace a large actor history. Keep each SQL
      // statement bounded inside the one atomic transaction instead of timing out
      // a world-sized UPDATE; no intermediate eligibility becomes visible.
      let afterId: string | undefined;
      for (;;) {
        const page = await this.db
          .prepare(
            `SELECT id FROM recall_sources WHERE world_id=? AND actor_id=?${afterId === undefined ? '' : ' AND id>?'} ORDER BY id LIMIT 1000`,
          )
          .all(worldId, actorId, ...(afterId === undefined ? [] : [afterId]));
        if (!page.length) break;
        const firstId = String(page[0]!['id']),
          lastId = String(page.at(-1)!['id']);
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
            THEN 1 ELSE 0 END WHERE r.world_id=? AND r.actor_id=? AND r.id>=? AND r.id<=?`,
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
            firstId,
            lastId,
          );
        afterId = lastId;
        if (page.length < 1000) break;
      }

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

      // One snapshot computes eligibility and the wanted queue for this affected set.
      // DML CTEs cannot read one another's table updates: all consumers use `desired`,
      // including removed sources. Queue delete/upsert sets are deliberately disjoint.
      // docs/architecture.md#performance-critical-path
      await this.db
        .prepare(
          `${cte}, desired AS MATERIALIZED (
          SELECT r.world_id,r.actor_id,r.id,r.source_kind,r.revision,r.importance,r.at,
            CASE WHEN ${this.sourceEligibility} THEN 1 ELSE 0 END AS next_eligible
          FROM recall_sources r WHERE r.world_id=? AND ${target}
        ), updated AS (
          UPDATE recall_sources r SET eligible=d.next_eligible FROM desired d
          WHERE r.world_id=d.world_id AND r.actor_id=d.actor_id AND r.id=d.id AND r.source_kind=d.source_kind
          AND r.eligible<>d.next_eligible
        ), discarded_vectors AS (
          DELETE FROM memory_vectors v WHERE v.world_id=? AND (v.actor_id,v.source_id) IN (SELECT actor_id,id FROM affected)
          AND NOT EXISTS (SELECT 1 FROM desired d WHERE d.actor_id=v.actor_id AND d.id=v.source_id AND d.revision=v.source_revision AND d.next_eligible=1)
        ), wanted AS MATERIALIZED (
          SELECT r.world_id,r.actor_id,r.id AS source_id,r.revision AS source_revision,m.model,m.dimensions,r.importance,r.at
          FROM desired r JOIN memory_index_models m ON m.world_id=r.world_id AND m.actor_id=r.actor_id
          WHERE r.next_eligible=1
          AND NOT EXISTS (SELECT 1 FROM memory_vectors v WHERE v.world_id=r.world_id AND v.actor_id=r.actor_id AND v.source_id=r.id AND v.source_revision=r.revision AND v.model=m.model AND v.dimensions=m.dimensions)
          AND NOT EXISTS (SELECT 1 FROM memory_index_attempts a WHERE a.world_id=r.world_id AND a.actor_id=r.actor_id AND a.source_id=r.id AND a.source_revision=r.revision AND a.model=m.model AND a.dimensions=m.dimensions)
        ), discarded_queue AS (
          DELETE FROM memory_index_queue q WHERE q.world_id=? AND (q.actor_id,q.source_id) IN (SELECT actor_id,id FROM affected)
          AND NOT EXISTS (SELECT 1 FROM wanted w WHERE w.actor_id=q.actor_id AND w.source_id=q.source_id AND w.model=q.model AND w.dimensions=q.dimensions)
        ) INSERT INTO memory_index_queue SELECT * FROM wanted
        ON CONFLICT (world_id,actor_id,source_id,model,dimensions) DO UPDATE
        SET source_revision=excluded.source_revision,importance=excluded.importance,at=excluded.at
        WHERE (memory_index_queue.source_revision,memory_index_queue.importance,memory_index_queue.at)
          IS DISTINCT FROM (excluded.source_revision,excluded.importance,excluded.at)`,
        )
        .run(...params, worldId, worldId);
    }
    await this.reconcilePlaces(worldId, changes);
  }

  /** Keep the latest retained observation in the existing recall projection. Batch
   * observers together: a shared arrival must not add two SQL round trips per witness. */
  private async reconcilePlaces(worldId: string, changes: MemoryChanges) {
    const pairs: [string, string][] = [];
    const flush = async () => {
      if (!pairs.length) return;
      const changed = `WITH changed(actor_id,place_id) AS (VALUES ${pairs.map(() => '(?,?)').join(',')})`;
      await this.db
        .prepare(
          `${changed} UPDATE recall_sources r SET place_latest=0
          FROM changed c WHERE r.world_id=? AND r.actor_id=c.actor_id AND r.place_id=c.place_id AND r.place_latest=1`,
        )
        .run(...pairs.flat(), worldId);
      await this.db
        .prepare(
          `${changed}, latest AS MATERIALIZED (
          SELECT c.actor_id,source.id,source.source_kind FROM changed c CROSS JOIN LATERAL (
            SELECT id,source_kind FROM recall_sources WHERE world_id=? AND actor_id=c.actor_id
            AND eligible=1 AND place_id=c.place_id ORDER BY at DESC,sequence DESC,id DESC LIMIT 1
          ) source)
          UPDATE recall_sources r SET place_latest=1 FROM latest l
          WHERE r.world_id=? AND r.actor_id=l.actor_id AND r.id=l.id AND r.source_kind=l.source_kind`,
        )
        .run(...pairs.flat(), worldId, worldId);
      pairs.length = 0;
    };
    // Ordinary visits touch only their places. Explicit history-wide edits and
    // restoration enumerate metadata in pages; no historical bodies are hydrated.
    for (const [actorId, ids] of changes) {
      const places = changes.placeIds?.get(actorId);
      if (ids !== null && !places?.size) continue;
      let after = '';
      do {
        const page: string[] =
          ids === null
            ? (
                await this.db
                  .prepare(
                    `SELECT DISTINCT place_id FROM recall_sources WHERE world_id=? AND actor_id=? AND place_id>? ORDER BY place_id LIMIT 250`,
                  )
                  .all(worldId, actorId, after)
              ).map((row) => String(row['place_id']))
            : [...places!];
        if (!page.length) break;
        for (const placeId of page) {
          pairs.push([actorId, placeId]);
          if (pairs.length === 250) await flush();
        }
        after = page.at(-1)!;
        if (ids !== null || page.length < 250) break;
      } while (true);
    }
    await flush();
  }

  /** One current retained observation per place. Filter a bounded metadata window before
   * hydration; continuation reaches every known place regardless of total history. */
  async knownPlaces(
    scope: MemoryScope,
    options: { after?: string; terms?: string[]; placeId?: string; limit: number; scan: number },
  ) {
    type PlaceRow = Record<string, unknown> & {
      correction_id?: string;
      correction_source?: Record<string, unknown>;
    };
    // Keep table-estimate errors from multiplying whole-actor joins. Read the
    // bounded page, then batch its correction metadata in the same snapshot.
    // Selected correction metadata is reused for body hydration.
    // docs/limits/spatial.md#sp08--static-named-places-and-private-known-places
    const rowsAfter = async (after: string | undefined, count: number): Promise<PlaceRow[]> => {
      const rows = await this.db
        .prepare(
          `SELECT ${sourceColumns},r.search_text FROM recall_sources r
        WHERE ${this.eligible} AND r.source_kind='awareness' AND r.place_id IS NOT NULL AND r.place_latest=1${after ? ' AND r.place_id>?' : ''}${options.placeId ? ' AND r.place_id=?' : ''}
        ORDER BY r.place_id LIMIT ?`,
        )
        .all(
          ...this.params(scope),
          ...(after ? [after] : []),
          ...(options.placeId ? [options.placeId] : []),
          count,
        );
      if (!rows.length) return rows;
      const corrections = await this.db
        .prepare(
          `SELECT source_id,correction_id FROM mind_corrections
        WHERE world_id=? AND actor_id=? AND source_id IN (${rows.map(() => '?').join(',')})`,
        )
        .all(scope.worldId, scope.actorId, ...rows.map((row) => row['id']));
      if (!corrections.length) return rows;
      const correctionIds = [...new Set(corrections.map((row) => String(row['correction_id'])))];
      const correctionSources = await this.db
        .prepare(
          `SELECT ${sourceColumns},r.search_text FROM recall_sources r
        WHERE ${this.eligible} AND r.source_kind='awareness' AND r.id IN (${correctionIds.map(() => '?').join(',')})`,
        )
        .all(...this.params(scope), ...correctionIds);
      const byId = new Map(correctionSources.map((row) => [String(row['id']), row])),
        bySource = new Map(
          corrections.map((row) => [String(row['source_id']), String(row['correction_id'])]),
        );
      return rows.map((row) => {
        const id = bySource.get(String(row['id']));
        if (!id) return row;
        const correction = byId.get(id);
        return {
          ...row,
          correction_id: id,
          correction_source: correction,
          search_text: `${row['place_label']} Corrected observation ${
            correction?.['search_text'] ??
            'This observation was corrected. Its original description is no longer established information.'
          }`,
        };
      });
    };
    return this.snapshot(async () => {
      const result = options.terms
        ? await scanMatches<PlaceRow>(
            (row, count) => rowsAfter(row ? String(row['place_id']) : options.after, count),
            (row) => matchesSearch(options.terms!, String(row['search_text'])),
            options.limit,
            options.scan,
          )
        : {
            matched: await rowsAfter(options.after, options.limit + 1),
            last: undefined,
            scanLimited: false,
          };
      const page = result.matched.slice(0, options.limit);
      const hydrated = await this.hydrate(page);
      const correctionRows = new Map<string, Record<string, unknown>>(),
        correctionBySource = new Map<string, string>();
      for (const row of page) {
        if (row.correction_id) correctionBySource.set(String(row['id']), row.correction_id);
        if (row.correction_source)
          correctionRows.set(String(row.correction_source['id']), row.correction_source);
      }
      const correctionBodies = await this.hydrate([...correctionRows.values()]);
      const entries: KnownPlaceSource[] = hydrated.map((entry) => {
        const id = correctionBySource.get(entry.memory.id),
          correction = correctionBodies.find((body) => body.memory.id === id);
        return {
          ...entry,
          ...(id
            ? { correctionId: id, ...(correction ? { correction: correction.memory.summary } : {}) }
            : {}),
        };
      });
      const after =
        result.matched.length > options.limit
          ? String(page.at(-1)!['place_id'])
          : result.scanLimited && result.last
            ? String(result.last['place_id'])
            : undefined;
      return { entries, after, scanLimited: result.scanLimited };
    });
  }

  private async refreshQueue(worldId: string, actorId: string, ids: Set<string> | null) {
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
  /** SQL counterpart of hasLinguisticSpeech: no-word cues remain recallable evidence,
   * but cannot crowd the automatic dialogue or protected verbatim pool. */
  private get linguisticSpeech(): string {
    return "a.payload::jsonb->'speech'->>'intelligibility' IN ('partial','clear') AND a.payload::jsonb->'speech'->>'perception'<>'seen'";
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
      const sources =
        includeConversation && conversation
          ? await this.conversationSources(scope, conversation)
          : [];
      const required = new Set(requiredIds);
      return {
        sequence: Number(watermark?.['sequence'] ?? 0),
        conversationId: includeConversation ? conversation : undefined,
        sources,
        conversationIds: sources.map((source) => source.id).filter((id) => !required.has(id)),
      };
    });
  }
  /** One SQL snapshot of eligible metadata; validation needs no transcript bodies
   * or fresh awareness watermark. Callers separately fence the world generation. */
  async conversationSources(
    scope: MemoryScope,
    conversationId: string,
  ): Promise<ConversationSource[]> {
    // Restrict history by conversation, then check actor-scoped sources by key.
    // A multiway join multiplied scans with cold PostgreSQL statistics; starting
    // at recall instead scanned unrelated personal history. The scalar awareness
    // probe keeps cold-statistics plans from rescanning/parsing the actor's entire
    // speech history once per turn (rather than using the exact source key).
    // docs/verification/postgresql-cognition-preparation.md#postgresql-only-storage-and-shared-preparation
    const permittedSource =
      "r.world_id=e.world_id AND r.actor_id=? AND r.id=e.id AND r.eligible=1 AND r.source_kind='awareness'";
    const rows = await this.db
      .prepare(
        `SELECT e.id AS source_id,
        (SELECT r.revision FROM recall_sources r WHERE ${permittedSource}) AS revision,
        (SELECT r.sequence FROM recall_sources r WHERE ${permittedSource}) AS sequence,
        (SELECT c.payload FROM mind_corrections c WHERE c.world_id=e.world_id AND c.actor_id=? AND c.source_id=e.id) AS correction
        FROM history_events e WHERE e.world_id=? AND e.conversation_id=?
        AND (SELECT generation FROM world_head WHERE id=1)=?
        AND (e.payload::jsonb->>'type')='speech'
        AND (SELECT 1 FROM mind_awareness a WHERE a.world_id=e.world_id AND a.actor_id=? AND a.source_id=e.id AND ${this.linguisticSpeech} LIMIT 1)=1
        AND (SELECT 1 FROM recall_sources r WHERE ${permittedSource})=1
        ORDER BY sequence LIMIT ${RETRIEVAL_ROWS + 1}`,
      )
      .all(
        scope.actorId,
        scope.actorId,
        scope.actorId,
        scope.worldId,
        conversationId,
        scope.generation,
        scope.actorId,
        scope.actorId,
      );
    if (rows.length > RETRIEVAL_ROWS) throw new MemoryPreparationError();
    return rows.map(
      (row): ConversationSource => ({
        id: String(row['source_id']),
        revision: String(row['revision']),
        sequence: Number(row['sequence']),
        correction: String(row['correction'] ?? ''),
      }),
    );
  }
  /** Compare the entire permitted snapshot, including removals, before replacing
   * derived context. Ordinary later speech may append without invalidating it.
   */
  async publishConversationCompaction(
    scope: MemoryScope,
    conversationId: string,
    sequence: number,
    sources: ConversationSource[],
    expected: unknown,
    value: unknown,
    assertCurrent: () => void,
  ): Promise<void> {
    const key = conversationCompactionKey(scope.worldId, scope.actorId, conversationId);
    await this.db.transaction(async () => {
      // Serialize with gameplay commits, including restore, with the PostgreSQL writer.
      const head = await this.db
        .prepare(
          'UPDATE world_head SET generation=generation WHERE id=1 AND world_id=? AND generation=? RETURNING generation',
        )
        .get(scope.worldId, scope.generation);
      if (!head) throw new Error('Conversation compaction generation changed.');
      assertCurrent();
      const current = await this.conversationSources(scope, conversationId);
      if (
        JSON.stringify(current.filter((source) => source.sequence <= sequence)) !==
        JSON.stringify(sources)
      )
        throw new Error('Conversation compaction sources changed.');
      const stored = await this.db
        .prepare('SELECT value FROM meta WHERE key=?')
        .get(`integration:${key}`);
      if (stored?.['value'] !== (expected === undefined ? undefined : JSON.stringify(expected)))
        throw new Error('Conversation compaction was superseded.');
      await this.db
        .prepare(
          'INSERT INTO meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        )
        .run(`integration:${key}`, JSON.stringify(value));
      // Abort or disclosure changes while waiting for SQL must roll this write back.
      assertCurrent();
    });
  }
  async invalidateConversationCompactions(worldId: string, actorId?: string): Promise<void> {
    const prefix = `integration:conversation-compaction:${JSON.stringify(actorId ? [worldId, actorId] : [worldId]).slice(0, -1)},`;
    await this.db
      .prepare('DELETE FROM meta WHERE substr(key,1,?)=?')
      .run([...prefix].length, prefix);
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
    selection?: { source: SourceKind; limit: number },
  ): Promise<{ entries: ExperienceEntry[]; more: boolean } | undefined> {
    return this.snapshot(() => this.readPage(scope, before, selection));
  }
  private async readPage(
    scope: MemoryScope,
    before?: string,
    selection?: { source: SourceKind; limit: number },
  ): Promise<{ entries: ExperienceEntry[]; more: boolean } | undefined> {
    const limit = selection?.limit ?? 100;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new Error('Invalid memory page size.');
    const cursor = before ? await this.entry(scope, before) : undefined;
    if (before && (!cursor || (selection && cursor.source !== selection.source))) return undefined;
    const time = cursor
      ? cursor.source === 'summary'
        ? cursor.value.to
        : cursor.value.at
      : undefined;
    const params: unknown[] = [];
    const queries = Object.entries(sourceTables)
      .filter(([kind]) => !selection || kind === selection.source)
      .map(([kind, table], index) => {
        params.push(scope.worldId, scope.actorId, ...(cursor ? [time, time, time, before] : []));
        return `SELECT * FROM (SELECT '${kind}' AS source,'${kind}:' || source_id AS key,at,payload FROM ${table}
        WHERE world_id=? AND actor_id=?${cursor ? ` AND at<=? AND (at<? OR (at=? AND '${kind}:' || source_id>?))` : ''}
        ORDER BY at DESC,source_id LIMIT ${limit + 1}) AS family${index}`;
      });
    const rows = await this.db
      .prepare(
        `SELECT * FROM (${queries.join(' UNION ALL ')}) AS sources
      WHERE (SELECT generation FROM world_head WHERE id=1)=? ORDER BY at DESC,key LIMIT ${limit + 1}`,
      )
      .all(...params, scope.generation);
    return {
      entries: rows.slice(0, limit).map(
        (row) =>
          ({
            source: row['source'],
            value: JSON.parse(String(row['payload'])),
          }) as ExperienceEntry,
      ),
      more: rows.length > limit,
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
            `SELECT ${sourceColumns} FROM recall_sources r WHERE ${this.eligible} AND r.source_kind='memory' AND r.memory_kind='commitment' ORDER BY r.at,r.id LIMIT ${RETRIEVAL_ROWS + 1}`,
          )
          .all(...this.params(scope)),
      ),
    );
  }
  /** Resolved (kept or cancelled) eligible commitments, newest spoken first, for the owner's
   * promise list. Reads the partial commitment index; open obligations stay resident.
   * docs/projects/readable-promises-tech-design.md#3-algorithm-appsserversrccommitment-viewts */
  async resolvedCommitments(
    scope: MemoryScope,
    before: { at: number; id: string } | undefined,
    limit: number,
  ): Promise<{ entries: RetrievedMemory[]; next?: { at: number; id: string } }> {
    return this.snapshot(async () => {
      const rows = await this.db
        .prepare(
          `SELECT ${sourceColumns} FROM recall_sources r WHERE ${this.eligible}
          AND r.source_kind='memory' AND r.memory_kind='commitment' AND r.required=0
          ${before ? 'AND (r.at,r.id)<(?,?)' : ''} ORDER BY r.at DESC,r.id DESC LIMIT ?`,
        )
        .all(...this.params(scope), ...(before ? [before.at, before.id] : []), limit + 1);
      const page = rows.slice(0, limit);
      const entries = (await this.hydrate(page)).sort(
        (a, b) => b.memory.at - a.memory.at || (a.memory.id < b.memory.id ? 1 : -1),
      );
      const last = page.at(-1);
      return rows.length > limit && last
        ? { entries, next: { at: Number(last['at']), id: String(last['id']) } }
        : { entries };
    });
  }
  /** Read-only owner/inspector browse, newest first by (time, id, source kind). A search or
   * the private-thoughts filter examines at most `scan` eligible rows and matches only
   * `search_text`, the text the viewer is shown; `resume` then continues after the last row
   * examined. docs/limits/memory.md#mh08 */
  async browse(
    scope: MemoryScope,
    options: {
      before?: { at: number; id: string; kind: string };
      terms?: string[];
      thoughts?: boolean;
      limit: number;
      scan: number;
    },
  ): Promise<{
    entries: RetrievedMemory[];
    resume?: { at: number; id: string; kind: string };
    scanLimited: boolean;
  }> {
    type Row = Record<string, unknown>;
    const { terms, thoughts, limit } = options;
    const position = (row: Row) => ({
      at: Number(row['at']),
      id: String(row['id']),
      kind: String(row['source_kind']),
    });
    const rowsBefore = (
      before: { at: number; id: string; kind: string } | undefined,
      count: number,
    ) =>
      this.db
        .prepare(
          `SELECT ${sourceColumns}${terms ? ',r.search_text' : ''} FROM recall_sources r
          WHERE ${this.eligible}${before ? ' AND (r.at,r.id,r.source_kind)<(?,?,?)' : ''}
          ORDER BY r.at DESC,r.id DESC,r.source_kind DESC LIMIT ?`,
        )
        .all(...this.params(scope), ...(before ? [before.at, before.id, before.kind] : []), count);
    return this.snapshot(async () => {
      // Plain browsing reads one page; filters scan a bounded window instead of walking an
      // unindexed condition through the whole history.
      const { matched, last, scanLimited } =
        terms || thoughts
          ? await scanMatches<Row>(
              (after, count) => rowsBefore(after ? position(after) : options.before, count),
              (row) =>
                (!thoughts ||
                  (row['source_kind'] === 'memory' && row['acquisition'] === 'self_thought')) &&
                (!terms || matchesSearch(terms, String(row['search_text'] ?? ''))),
              limit,
              options.scan,
            )
          : {
              matched: await rowsBefore(options.before, limit + 1),
              last: undefined,
              scanLimited: false,
            };
      const page = matched.slice(0, limit);
      const entries = (await this.hydrate(page)).sort(
        (a, b) => b.memory.at - a.memory.at || (a.memory.id < b.memory.id ? 1 : -1),
      );
      if (matched.length > limit)
        return { entries, resume: position(page.at(-1)!), scanLimited: false };
      if (scanLimited && last) return { entries, resume: position(last), scanLimited: true };
      return { entries, scanLimited: false };
    });
  }
  /** Indexed scheduling facts only; a wakeup must not reconstruct an actor's past. */
  async maintenanceStatus(scope: Pick<MemoryScope, 'worldId' | 'actorId'>, simTime: number) {
    const cutoff = simTime - EXPERIENCE_LIMITS.rawHours * 3600;
    // One statement supplies one coherent snapshot and avoids five round trips per mind.
    const row = await this.db
      .prepare(
        `SELECT
      CASE WHEN EXISTS (SELECT 1 FROM recall_sources r WHERE r.world_id=? AND r.actor_id=? AND r.eligible=1) THEN 1 ELSE 0 END AS memories,
      CASE WHEN EXISTS (SELECT 1 FROM mind_awareness WHERE world_id=? AND actor_id=? AND at<=?)
        OR EXISTS (SELECT 1 FROM mind_memories WHERE world_id=? AND actor_id=? AND at<=? AND kind='episode') THEN 1 ELSE 0 END AS due,
      CASE WHEN EXISTS (SELECT 1 FROM mind_awareness WHERE world_id=? AND actor_id=? LIMIT 1 OFFSET ?)
        OR EXISTS (SELECT 1 FROM mind_memories WHERE world_id=? AND actor_id=? LIMIT 1 OFFSET ?) THEN 1 ELSE 0 END AS pressure`,
      )
      .get(
        scope.worldId,
        scope.actorId,
        scope.worldId,
        scope.actorId,
        cutoff,
        scope.worldId,
        scope.actorId,
        cutoff,
        scope.worldId,
        scope.actorId,
        EXPERIENCE_LIMITS.consolidationPressure - 1,
        scope.worldId,
        scope.actorId,
        EXPERIENCE_LIMITS.consolidationPressure + 15,
      );
    return {
      hasMemories: Number(row?.['memories']) === 1,
      rawDue: Number(row?.['due']) === 1,
      pressure: Number(row?.['pressure']) === 1,
    };
  }
  /** A bounded chronological prefix, never a truncated claim about the whole backlog.
   * Daily cursors exclude summaries written by earlier partitions of this review.
   * docs/memory-architecture.md#6-hourly-consolidation-and-six-hour-raw-recall
   */
  async maintenanceBatch(
    scope: MemoryScope,
    simTime: number,
    mode: ConsolidationBatch['mode'],
    review?: {
      day: number;
      throughRevision?: number;
      after?: { at: number; sequence: number; id: string };
    },
  ): Promise<ConsolidationBatch | null> {
    return this.snapshot(async () => {
      const head = await this.db
        .prepare('SELECT revision,generation FROM world_head WHERE id=1')
        .get();
      if (head?.['generation'] !== scope.generation) return null;
      const throughRevision = review?.throughRevision ?? Number(head['revision']);
      const from = mode === 'daily' ? (review?.day ?? -1) * 86400 : -Number.MAX_VALUE;
      const to = mode === 'daily' ? from + 86400 : simTime - EXPERIENCE_LIMITS.rawHours * 3600;
      const after = review?.after ?? { at: -Number.MAX_VALUE, sequence: 0, id: '' };
      const payloadBytes = 'octet_length(payload)';
      const rows = await this.db
        .prepare(
          `SELECT ${sourceColumns}, CASE r.source_kind ${Object.entries(sourceTables)
            .map(
              ([kind, table]) =>
                `WHEN '${kind}' THEN (SELECT ${payloadBytes} FROM ${table} t WHERE t.world_id=r.world_id AND t.id=r.record_id)`,
            )
            .join(' ')} END AS payload_bytes FROM recall_sources r
        WHERE ${this.eligible} AND r.at>=? AND r.at${mode === 'daily' ? '<' : '<='}?
        AND (r.at,r.sequence,r.id) > (?,?,?)
        AND (r.source_kind='awareness' OR r.memory_kind='episode'${mode === 'daily' ? " OR r.source_kind='summary'" : ''})
        AND r.id NOT IN (SELECT s.id FROM recall_sources s JOIN mind_awareness a ON a.world_id=s.world_id AND a.id=s.record_id WHERE s.world_id=? AND s.actor_id=? AND s.eligible=1 AND s.source_kind='awareness' AND s.event_type='speech' AND ${this.linguisticSpeech} ORDER BY s.at DESC,s.sequence DESC,s.id DESC LIMIT ${EXPERIENCE_LIMITS.conversationSpeech})
        ${
          mode === 'daily'
            ? `AND EXISTS (SELECT 1 FROM ${'mind_memories'} m WHERE r.source_kind='memory' AND m.world_id=r.world_id AND m.id=r.record_id AND m.revision<=?
          UNION ALL SELECT 1 FROM mind_awareness a WHERE r.source_kind='awareness' AND a.world_id=r.world_id AND a.id=r.record_id AND a.revision<=?
          UNION ALL SELECT 1 FROM mind_summaries s WHERE r.source_kind='summary' AND s.world_id=r.world_id AND s.id=r.record_id AND s.revision<=?)`
            : ''
        }
        ORDER BY r.at,r.sequence,r.id LIMIT ?`,
        )
        .all(
          ...this.params(scope),
          from,
          to,
          after.at,
          after.sequence,
          after.id,
          scope.worldId,
          scope.actorId,
          ...(mode === 'daily' ? [throughRevision, throughRevision, throughRevision] : []),
          MAINTENANCE_SOURCES + 1,
        );
      // Count encoded source bytes in SQL before any text crosses into JS. The
      // output allowance alone would still hydrate 129 potentially large bodies.
      const bounded: typeof rows = [];
      let sourceBytes = 0;
      for (const row of rows) {
        if (bounded.length === MAINTENANCE_SOURCES) break;
        const size = Number(row['payload_bytes']);
        if (!Number.isSafeInteger(size) || size <= 0)
          throw new Error('Maintenance source is missing; evidence retained.');
        if (sourceBytes + size > MAINTENANCE_BYTES) {
          if (!bounded.length)
            throw new Error(
              'One maintenance source exceeds the preparation allowance; evidence retained.',
            );
          break;
        }
        bounded.push(row);
        sourceBytes += size;
      }
      const hydrated = await this.hydrate(bounded);
      const byId = new Map(hydrated.map((entry) => [entry.memory.id, entry]));
      const ordered = bounded
        .map((row) => byId.get(String(row['id'])))
        .filter((entry): entry is RetrievedMemory => !!entry);
      const selected: RetrievedMemory[] = [];
      let bytes = 0;
      const first = ordered[0]?.memory;
      if (!first) return null;
      const end = Math.min(first.at + 21600, (Math.floor(first.at / 86400) + 1) * 86400);
      for (const entry of ordered) {
        if (
          mode === 'hourly' &&
          (entry.memory.at > end ||
            Math.floor(entry.memory.at / 86400) !== Math.floor(first.at / 86400))
        )
          break;
        const size = Buffer.byteLength(JSON.stringify(entry.memory));
        if (size > MAINTENANCE_BYTES)
          throw new Error(
            'One maintenance source exceeds the preparation allowance; evidence retained.',
          );
        if (selected.length === MAINTENANCE_SOURCES || bytes + size > MAINTENANCE_BYTES) break;
        bytes += size;
        selected.push(entry);
      }
      const sources = selected.map((entry) => entry.memory);
      const last = sources.at(-1)!;
      return {
        mode,
        sources,
        protected: sources.filter((s) => s.importance >= EXPERIENCE_LIMITS.protectedImportance),
        routine: sources.filter((s) => s.importance < EXPERIENCE_LIMITS.protectedImportance),
        selection: {
          scope,
          throughRevision,
          after: { at: last.at, sequence: last.sequence ?? 0, id: last.id },
          complete: rows.length === selected.length,
          revisions: selected.map((entry) => ({ id: entry.memory.id, revision: entry.revision })),
        },
      };
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
    // Read this before entering our snapshot: an explicit caller transaction can
    // contain tentative writes or an older view and must never populate shared reuse.
    const cacheable = this.db.transactionActive === false;
    const terms = query === null ? [] : [...new Set(searchWords(query))];
    return this.snapshot(async () => {
      if (query === null)
        return this.hydrate(
          await this.db
            .prepare(
              `SELECT ${sourceColumns} FROM recall_sources r WHERE ${this.eligible} ORDER BY r.at DESC,r.id LIMIT ?`,
            )
            .all(...this.params(scope), limit),
        );
      const cacheKey = JSON.stringify([actorScopeKey(scope), terms, limit]);
      const cached = cacheable ? this.textSelection.get(cacheKey) : undefined;
      const revision = this.actorRevision(scope.actorId),
        reset = this.resetEpoch;
      // Bind cached metadata to this database snapshot before hydrating. Publication
      // can race entry into a read transaction; a JS revision check alone is insufficient.
      if (
        cached?.revision === revision &&
        cached.reset === reset &&
        (await this.current(
          scope,
          cached.rows.map((row) => ({ id: String(row['id']), revision: String(row['revision']) })),
        )) &&
        revision === this.actorRevision(scope.actorId) &&
        reset === this.resetEpoch
      )
        return this.hydrate(cached.rows);
      // Token-prefix search uses the database's inverted index. Substring matching
      // required reparsing every retained JSON body; docs/memory-architecture.md#retrieval-preparation-admission.
      let matched: Record<string, unknown>[] = [];
      const expression = lexicalQuery(terms);
      if (expression) {
        matched = await this.db
          .prepare(
            `SELECT ${sourceColumns},
            ts_rank(r.search_vector,?::tsquery) AS score
            FROM recall_sources r WHERE ${this.eligible}
            AND r.search_vector @@ ?::tsquery
            ORDER BY score DESC,r.importance DESC,r.at DESC,r.id LIMIT ?`,
          )
          .all(expression, ...this.params(scope), expression, limit);
      }
      const fallback = await this.db
        .prepare(
          `SELECT ${sourceColumns} FROM recall_sources r
        WHERE ${this.eligible} ORDER BY r.required DESC,r.importance DESC,r.at DESC,r.id LIMIT ?`,
        )
        .all(...this.params(scope), limit);
      const matchIds = new Set(matched.map((row) => `${row['source_kind']}:${row['id']}`));
      const candidates = [
        ...matched,
        ...fallback.filter((row) => !matchIds.has(`${row['source_kind']}:${row['id']}`)),
      ];
      const rows = [
        ...new Map(
          [
            ...candidates.filter((row) => Number(row['required']) === 1),
            ...candidates.filter((row) => Number(row['required']) !== 1),
          ].map((row) => [`${row['source_kind']}:${row['id']}`, row]),
        ).values(),
      ].slice(0, limit);
      const result = await this.hydrate(rows);
      if (
        cacheable &&
        revision === this.actorRevision(scope.actorId) &&
        reset === this.resetEpoch
      ) {
        if (this.textSelection.size >= 64)
          this.textSelection.delete(this.textSelection.keys().next().value!);
        this.textSelection.set(cacheKey, { revision, reset, rows });
      }
      return result;
    });
  }
  private async hydrate(
    rows: Record<string, unknown>[],
    cache?: MemoryReadCache,
  ): Promise<RetrievedMemory[]> {
    if (rows.length > RETRIEVAL_ROWS) throw new MemoryPreparationError();
    // Check serialized source bytes in SQL before bringing bodies into the host. One
    // read snapshot binds the check and hydration to the same versions.
    const reused = rows.flatMap((row) => {
      const cached = cache?.get(row);
      return cached ? [{ row, ...cached }] : [];
    });
    let bytes = reused.reduce((sum, entry) => sum + entry.bytes, 0);
    if (bytes > RETRIEVAL_BYTES) throw new MemoryPreparationError();
    const missing = rows.filter((row) => !cache?.get(row));
    for (const kind of Object.keys(sourceTables) as SourceKind[]) {
      const selected = missing.filter((row) => row['source_kind'] === kind);
      for (let offset = 0; offset < selected.length; offset += 350) {
        const batch = selected.slice(offset, offset + 350);
        const size = await this.db
          .prepare(
            `SELECT SUM(octet_length(payload)) AS bytes
          FROM ${sourceTables[kind]} WHERE world_id=? AND id IN (${batch.map(() => '?').join(',')})`,
          )
          .get(batch[0]!['world_id'], ...batch.map((row) => row['record_id']));
        bytes += Number(size?.['bytes'] ?? 0);
        if (bytes > RETRIEVAL_BYTES) throw new MemoryPreparationError();
      }
    }
    const result: RetrievedMemory[] = reused.map(({ row, value }) => ({
      ...value,
      ...(row['score'] !== undefined ? { score: Number(row['score']) } : {}),
    }));
    for (const kind of Object.keys(sourceTables) as SourceKind[]) {
      const selected = missing.filter((row) => row['source_kind'] === kind);
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
            if (awareness.exposure !== undefined && !validEncounterExposure(awareness.exposure))
              throw new Error('Invalid stored encounter evidence. Existing data was not replaced.');
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
          const value: RetrievedMemory = {
            memory,
            awareness,
            revision: String(row['revision']),
          };
          cache?.put(row, value, Buffer.byteLength(payload));
          result.push({
            ...value,
            ...(row['score'] !== undefined ? { score: Number(row['score']) } : {}),
          });
        }
      }
    }
    // Reuse must not change the previous kind/selection order or duplicate grouping.
    const order = new Map(
      Object.keys(sourceTables)
        .flatMap((kind) =>
          rows.filter((row) => row['source_kind'] === kind).map((row) => String(row['id'])),
        )
        .map((id, index) => [id, index]),
    );
    return result.sort((a, b) => order.get(a.memory.id)! - order.get(b.memory.id)!);
  }
  async count(scope: MemoryScope): Promise<number> {
    const row = await this.db
      .prepare(`SELECT COUNT(*) AS count FROM recall_sources r WHERE ${this.eligible}`)
      .get(...this.params(scope));
    return Number(row?.['count'] ?? 0);
  }
  async current(scope: MemoryScope, sources: { id: string; revision: string }[]): Promise<boolean> {
    const read = async () => {
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
    };
    return sources.length > 500 ? this.snapshot(read) : read();
  }
  /** One fresh SQL snapshot validates conversation membership/corrections and all
   * other selected evidence. Covered sources need no duplicate revision query. */
  async validatePreparation(
    scope: MemoryScope,
    conversation: { id: string; sequence: number; sources: ConversationSource[] } | undefined,
    sources: { id: string; revision: string }[],
  ): Promise<boolean> {
    const covered = new Map(conversation?.sources.map((source) => [source.id, source.revision]));
    const remaining = new Map<string, { id: string; revision: string }>();
    for (const source of sources) {
      const previous = covered.get(source.id) ?? remaining.get(source.id)?.revision;
      if (previous && previous !== source.revision) return false;
      if (!previous) remaining.set(source.id, source);
    }
    const read = async () => {
      if (conversation) {
        const current = (await this.conversationSources(scope, conversation.id)).filter(
          (source) => source.sequence <= conversation.sequence,
        );
        if (JSON.stringify(current) !== JSON.stringify(conversation.sources)) return false;
      }
      return this.current(scope, [...remaining.values()]);
    };
    // A lone SELECT already has a coherent snapshot; only combined reads need
    // explicit BEGIN/COMMIT. Never skip fresh membership/revision checks after awaits.
    return conversation && remaining.size ? this.snapshot(read) : read();
  }

  async coverage(scope: MemoryScope, model: MemoryModel) {
    // A cached committed count needs no BEGIN/COMMIT. Explicit transactions instead
    // use their own snapshot, which may predate the cache or include tentative writes.
    if (this.db.transactionActive !== false)
      return this.snapshot(() => this.readCoverage(scope, model));
    const key = modelScopeKey(scope, model);
    const revision = this.actorRevision(scope.actorId),
      reset = this.resetEpoch;
    const epochs = this.retainCoverage(scope, model);
    const actorToken = epochs.actor.token,
      modelToken = epochs.model.token;
    try {
      const cached = this.coverageCache.get(key);
      if (
        cached?.revision === revision &&
        cached.reset === reset &&
        cached.actorToken === actorToken &&
        cached.modelToken === modelToken
      )
        return { ...cached.value };
      const value = await this.snapshot(() => this.readCoverage(scope, model));
      if (
        revision === this.actorRevision(scope.actorId) &&
        reset === this.resetEpoch &&
        actorToken === epochs.actor.token &&
        modelToken === epochs.model.token
      ) {
        this.evictCoverage(key);
        if (this.coverageCache.size >= 512)
          this.evictCoverage(this.coverageCache.keys().next().value!);
        // Cache ownership keeps epochs alive; active readers retain their own
        // references, so eviction cannot reuse a token under an outstanding read.
        epochs.actor.references++;
        epochs.model.references++;
        this.coverageCache.set(key, { revision, reset, actorToken, modelToken, epochs, value });
      }
      return { ...value };
    } finally {
      this.releaseCoverage(epochs);
    }
  }
  private async readCoverage(scope: MemoryScope, model: MemoryModel) {
    const eligible = await this.count(scope);
    const row = await this.db
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
      );
    const indexed = Number(row?.['count'] ?? 0);
    return { eligible, indexed, missing: Math.max(0, eligible - indexed) };
  }
  /** Exact event-time evidence for pending work, including sources evicted from RAM. */
  async evidence(
    scope: MemoryScope,
    ids: string[],
    cache?: MemoryReadCache,
  ): Promise<RetrievedMemory[]> {
    return this.snapshot(async () => {
      const unique = [...new Set(ids)];
      if (unique.length > RETRIEVAL_ROWS) throw new MemoryPreparationError();
      const rows: Record<string, unknown>[] = [];
      for (let offset = 0; offset < unique.length; offset += 500) {
        const batch = unique.slice(offset, offset + 500);
        rows.push(
          ...(await this.db
            .prepare(
              `SELECT ${sourceColumns} FROM recall_sources r WHERE ${this.eligible} AND r.source_kind='awareness' AND r.id IN (${batch.map(() => '?').join(',')})`,
            )
            .all(...this.params(scope), ...batch)),
        );
      }
      return this.hydrate(rows, cache);
    });
  }
  /** Exact, bounded sources already selected into one appraisal/reflection context.
   * No required-history union or whole actor hydration is needed for this binding. */
  async appraisalSources(scope: MemoryScope, ids: string[]): Promise<RetrievedMemory[]> {
    const unique = [...new Set(ids)];
    if (unique.length > 48) throw new Error('Too many appraisal source bindings.');
    if (!unique.length) return [];
    return this.snapshot(async () =>
      this.hydrate(
        await this.db
          .prepare(
            `SELECT ${sourceColumns} FROM recall_sources r WHERE ${this.eligible} AND r.id IN (${unique.map(() => '?').join(',')}) ORDER BY r.id`,
          )
          .all(...this.params(scope), ...unique),
      ),
    );
  }
  async required(
    scope: MemoryScope,
    ids: string[],
    cache?: MemoryReadCache,
  ): Promise<RetrievedMemory[]> {
    return this.snapshot(() => this.readRequired(scope, ids, cache));
  }
  private async readRequired(
    scope: MemoryScope,
    ids: string[],
    cache?: MemoryReadCache,
  ): Promise<RetrievedMemory[]> {
    const unique = [...new Set(ids)];
    if (unique.length > RETRIEVAL_ROWS) throw new MemoryPreparationError();
    const rows = await this.db
      .prepare(
        `SELECT ${sourceColumns} FROM recall_sources r WHERE ${this.eligible} AND r.required=1
      UNION SELECT ${sourceColumns} FROM recall_sources r WHERE ${this.eligible} AND r.id IN
      (SELECT source_id FROM mind_corrections WHERE world_id=? AND actor_id=? UNION SELECT correction_id FROM mind_corrections WHERE world_id=? AND actor_id=?) LIMIT ${RETRIEVAL_ROWS + 1}`,
      )
      .all(
        ...this.params(scope),
        ...this.params(scope),
        scope.worldId,
        scope.actorId,
        scope.worldId,
        scope.actorId,
      );
    if (rows.length > RETRIEVAL_ROWS) throw new MemoryPreparationError();
    const selected = new Map(rows.map((row) => [`${row['source_kind']}:${row['id']}`, row]));
    for (let offset = 0; offset < unique.length; offset += 350) {
      const batch = unique.slice(offset, offset + 350),
        params = batch.map(() => '?').join(',');
      const matches = await this.db
        .prepare(
          `SELECT ${sourceColumns} FROM recall_sources r WHERE ${this.eligible} AND (r.id IN (${params}) OR r.event_id IN (${params})) LIMIT ${RETRIEVAL_ROWS + 1}`,
        )
        .all(...this.params(scope), ...batch, ...batch);
      for (const row of matches) selected.set(`${row['source_kind']}:${row['id']}`, row);
      if (selected.size > RETRIEVAL_ROWS) throw new MemoryPreparationError();
    }
    return this.hydrate([...selected.values()], cache);
  }

  async select(
    scope: MemoryScope,
    limit: number,
    semantic?: MemoryModel & { query: number[] },
    excludedIds: string[] = [],
    cache?: MemoryReadCache,
  ): Promise<RetrievedMemory[]> {
    return this.snapshot(() => this.readSelection(scope, limit, semantic, excludedIds, cache));
  }
  private async readSelection(
    scope: MemoryScope,
    limit: number,
    semantic?: MemoryModel & { query: number[] },
    excludedIds: string[] = [],
    cache?: MemoryReadCache,
  ): Promise<RetrievedMemory[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
      throw new Error('Invalid memory selection size.');
    if (excludedIds.length > RETRIEVAL_ROWS) throw new MemoryPreparationError();
    // Apply before LIMIT and body hydration; grouping cannot reintroduce covered turns.
    const optional = `NOT (r.id = ANY(?::text[]) OR COALESCE(r.event_id,'') = ANY(?::text[]))`;
    const fallback = await this.db
      .prepare(
        `SELECT ${sourceColumns} FROM recall_sources r WHERE ${this.eligible} AND ${optional} ORDER BY r.importance DESC,r.at DESC,r.id LIMIT ?`,
      )
      .all(...this.params(scope), excludedIds, excludedIds, limit);
    if (!semantic) return this.hydrate(fallback, cache);
    this.validateVector(semantic, semantic.query);
    const rows = await this.db
      .prepare(
        `WITH matches AS MATERIALIZED (
          SELECT source_id,source_revision,1-(embedding OPERATOR(public.<=>) ?::public.vector) AS score
          FROM memory_vectors WHERE world_id=? AND actor_id=? AND generation=? AND model=? AND dimensions=?
            AND (SELECT generation FROM world_head WHERE id=1)=? AND source_id <> ALL(?::text[])
          ORDER BY embedding OPERATOR(public.<=>) ?::public.vector,source_id LIMIT ?)
        SELECT ${sourceColumns},m.score FROM matches m JOIN recall_sources r ON r.id=m.source_id AND r.revision=m.source_revision
        WHERE ${this.eligible} AND ${optional} ORDER BY m.score DESC,r.id`,
      )
      .all(
        JSON.stringify(semantic.query),
        scope.worldId,
        scope.actorId,
        scope.generation,
        semantic.model,
        semantic.dimensions,
        scope.generation,
        excludedIds,
        JSON.stringify(semantic.query),
        limit,
        ...this.params(scope),
        excludedIds,
        excludedIds,
      );
    const combined = [
      ...new Map([...rows, ...fallback].map((row) => [row['id'], row])).values(),
    ].slice(0, limit);
    // Map above must prefer the semantic row when its fallback copy is also present.
    const scores = new Map(rows.map((row) => [row['id'], row['score']]));
    for (const row of combined) if (scores.has(row['id'])) row['score'] = scores.get(row['id']);
    return this.hydrate(combined, cache);
  }
  async pending(scope: MemoryScope, model: MemoryModel, limit = 32): Promise<RetrievedMemory[]> {
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
      SELECT ${sourceColumns} FROM pending q JOIN recall_sources r
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
    return this.db.transaction(() => this.publishVectors(scope, model, values));
  }
  private async publishVectors(scope: MemoryScope, model: MemoryModel, values: MemoryVector[]) {
    this.vectorPublication(scope, model);
    this.db.afterCommit?.(() => this.vectorPublication(scope, model));
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
    this.vectorReuse(worldId, changed);
    this.db.afterCommit?.(() => this.vectorReuse(worldId, changed));
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
