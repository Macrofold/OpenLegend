import { EXPERIENCE_LIMITS } from '@open-legend/domain';
import { initializeMemoryDerivatives } from './memory-derivatives.js';
import type { SqlDatabase } from './sql-database.js';
import { tradeDisclosureKeyIndexSql } from './trade-disclosure-sql.js';

export const MEMORY_HISTORY_TABLES = ['mind_source_versions', 'mind_source_annotations'] as const;
export const MEMORY_CACHE_TABLES = ['memory_vector_cache'] as const;

export async function initializeMemorySchema(db: Pick<SqlDatabase, 'exec'>): Promise<void> {
  await db.exec(`
      CREATE TABLE IF NOT EXISTS recall_sources (
        world_id TEXT NOT NULL REFERENCES world_head(world_id), actor_id TEXT NOT NULL,
        id TEXT NOT NULL, source_kind TEXT NOT NULL, record_id TEXT NOT NULL, revision TEXT NOT NULL,
        event_id TEXT, memory_kind TEXT, acquisition TEXT, event_type TEXT,
        at DOUBLE PRECISION NOT NULL, importance DOUBLE PRECISION NOT NULL, required BIGINT NOT NULL,eligible BIGINT NOT NULL DEFAULT 0, sequence BIGINT NOT NULL DEFAULT 0,
        search_text TEXT NOT NULL DEFAULT '', linguistic BIGINT NOT NULL,payload_bytes BIGINT NOT NULL,retention_class TEXT NOT NULL,
        preserve_literal BIGINT NOT NULL,
        PRIMARY KEY(world_id,actor_id,id,source_kind));
      CREATE INDEX IF NOT EXISTS recall_dialogue_order ON recall_sources(world_id,actor_id,sequence DESC,id DESC)
        WHERE source_kind='awareness' AND eligible=1 AND linguistic=1;
      CREATE INDEX IF NOT EXISTS recall_actor_rank ON recall_sources(world_id,actor_id,eligible,importance DESC,at DESC,id);
      CREATE INDEX IF NOT EXISTS recall_source_validation ON recall_sources(world_id,actor_id,eligible,id);
      CREATE INDEX IF NOT EXISTS recall_context_rank ON recall_sources(world_id,actor_id,eligible,required DESC,importance DESC,at DESC,id);
      CREATE INDEX IF NOT EXISTS recall_actor_recent ON recall_sources(world_id,actor_id,eligible,at DESC,id);
      CREATE TABLE IF NOT EXISTS recall_place_capsules (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,owner_id TEXT NOT NULL,owner_kind TEXT NOT NULL,owner_revision TEXT NOT NULL,
        place_id TEXT NOT NULL,observed_at DOUBLE PRECISION NOT NULL,observed_order BIGINT NOT NULL,
        source_event_id TEXT,native_source_id TEXT NOT NULL,fact_alias TEXT NOT NULL,capsule_key TEXT NOT NULL,capsule TEXT NOT NULL,account_owner_kind TEXT,support_record_id TEXT,
        PRIMARY KEY(world_id,actor_id,owner_id,owner_kind,capsule_key),
        FOREIGN KEY(world_id,actor_id,owner_id,account_owner_kind) REFERENCES recall_sources(world_id,actor_id,id,source_kind) ON DELETE CASCADE,
        FOREIGN KEY(world_id,support_record_id) REFERENCES mind_temporal_supports(world_id,id) ON DELETE CASCADE,
        CHECK ((owner_kind='support' AND account_owner_kind IS NULL AND support_record_id IS NOT NULL) OR (owner_kind<>'support' AND account_owner_kind=owner_kind AND support_record_id IS NULL)));
      CREATE TABLE IF NOT EXISTS mind_impression_spans (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,owner_id TEXT NOT NULL,owner_kind TEXT NOT NULL CHECK(owner_kind='memory'),
        physical_life BIGINT NOT NULL,receipt_epoch TEXT NOT NULL,
        first_batch_order BIGINT NOT NULL,first_entry BIGINT NOT NULL,last_batch_order BIGINT NOT NULL,last_entry BIGINT NOT NULL,
        PRIMARY KEY(world_id,actor_id,owner_id,physical_life,receipt_epoch,first_batch_order,first_entry,last_batch_order,last_entry),
        FOREIGN KEY(world_id,actor_id,owner_id,owner_kind) REFERENCES recall_sources(world_id,actor_id,id,source_kind) ON DELETE CASCADE);
      CREATE INDEX IF NOT EXISTS impression_receipt_range ON mind_impression_spans(world_id,actor_id,physical_life,receipt_epoch,first_batch_order,first_entry,last_batch_order,last_entry);
      CREATE INDEX IF NOT EXISTS recall_place_lookup ON recall_place_capsules(world_id,actor_id,place_id,observed_at DESC,observed_order DESC,owner_id DESC,owner_kind DESC);
      CREATE INDEX IF NOT EXISTS recall_commitments ON recall_sources(world_id,actor_id,at,id) WHERE source_kind='memory' AND memory_kind='commitment' AND eligible=1;
      CREATE INDEX IF NOT EXISTS recall_world_event ON recall_sources(world_id,event_id,actor_id);
      CREATE INDEX IF NOT EXISTS recall_actor_event ON recall_sources(world_id,actor_id,event_id);
      CREATE INDEX IF NOT EXISTS recall_required ON recall_sources(world_id,actor_id,required,eligible,id);
      CREATE INDEX IF NOT EXISTS recall_record ON recall_sources(world_id,source_kind,record_id);
      CREATE TABLE IF NOT EXISTS mind_source_dependencies (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,derived_kind TEXT NOT NULL,derived_id TEXT NOT NULL,source_kind TEXT NOT NULL,source_id TEXT NOT NULL,source_revision TEXT NOT NULL,support_key TEXT NOT NULL,source_life BIGINT NOT NULL,facet_ordinal BIGINT NOT NULL,alias_id TEXT NOT NULL,
        PRIMARY KEY(world_id,actor_id,derived_kind,derived_id,source_kind,source_id,source_revision,support_key,source_life,facet_ordinal,alias_id));
      CREATE INDEX IF NOT EXISTS mind_dependency_world_source ON mind_source_dependencies(world_id,source_id,actor_id,derived_id);
      CREATE INDEX IF NOT EXISTS mind_dependency_reverse ON mind_source_dependencies(world_id,actor_id,source_kind,source_id,source_revision);
      CREATE INDEX IF NOT EXISTS mind_dependency_alias_reverse ON mind_source_dependencies(world_id,actor_id,alias_id);
      CREATE INDEX IF NOT EXISTS mind_dependency_world_alias ON mind_source_dependencies(world_id,alias_id,actor_id,derived_id);
      CREATE TABLE IF NOT EXISTS mind_source_versions (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,source_kind TEXT NOT NULL,source_id TEXT NOT NULL,
        revision TEXT NOT NULL,payload TEXT NOT NULL,retired_revision BIGINT NOT NULL,retention_class TEXT NOT NULL,logical_bytes BIGINT NOT NULL,
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
  await db.exec(`
      CREATE INDEX IF NOT EXISTS recall_maintenance ON recall_sources(world_id,actor_id,eligible,at,sequence,id);
      CREATE INDEX IF NOT EXISTS recall_maintenance_routine ON recall_sources(world_id,actor_id,at,sequence,id)
        WHERE eligible=1 AND importance<${EXPERIENCE_LIMITS.protectedImportance} AND (source_kind='awareness' OR memory_kind='episode');
      CREATE INDEX IF NOT EXISTS recall_maintenance_speech ON recall_sources(world_id,actor_id,eligible,event_type,at DESC,sequence DESC,id DESC);
    `);
  // Only participant/item keys are indexed, never descriptions or a second
  // knowledge state. Direct index updates avoid a growing pending-list scan
  // for each exact read before vacuum; ordinary observations are excluded.
  await db.exec(tradeDisclosureKeyIndexSql);
  await db.exec(`
      CREATE TABLE IF NOT EXISTS memory_vectors (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,generation TEXT NOT NULL,source_id TEXT NOT NULL,
        source_revision TEXT NOT NULL,model TEXT NOT NULL,dimensions BIGINT NOT NULL,embedding public.vector NOT NULL,
        PRIMARY KEY(world_id,actor_id,source_id,model,dimensions),
        CHECK(public.vector_dims(embedding)=dimensions));
      ALTER TABLE memory_vectors ALTER COLUMN embedding SET STORAGE PLAIN;
      CREATE INDEX IF NOT EXISTS memory_vector_scope ON memory_vectors(world_id,actor_id,generation,model,dimensions,source_id,source_revision);
    `);
  for (const table of ['mind_awareness', 'mind_memories', 'mind_summaries'])
    await db.exec(`CREATE INDEX IF NOT EXISTS ${table}_retention_candidates
        ON ${table}(world_id,actor_id,retention_class,policy_priority,at,source_id COLLATE "C")
        WHERE active_or_protected=0 AND retention_class<>'sensory';
        CREATE INDEX IF NOT EXISTS ${table}_retention_due
        ON ${table}(world_id,actor_id,next_due_at)
        WHERE active_or_protected=0 AND retention_class<>'sensory';`);
  await db.exec(`
      CREATE TABLE IF NOT EXISTS memory_lexical_documents (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,id TEXT NOT NULL,source_kind TEXT NOT NULL,
        source_revision TEXT NOT NULL,search_vector tsvector NOT NULL,
        PRIMARY KEY(world_id,actor_id,id,source_kind));
      CREATE INDEX IF NOT EXISTS memory_lexical_vector ON memory_lexical_documents USING GIN(search_vector);
      CREATE TABLE IF NOT EXISTS memory_lexical_pending (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,id TEXT NOT NULL,source_kind TEXT NOT NULL,
        source_revision TEXT NOT NULL,generation TEXT NOT NULL,world_revision BIGINT NOT NULL,
        removing BOOLEAN NOT NULL,bytes BIGINT NOT NULL,
        PRIMARY KEY(world_id,actor_id,id,source_kind));
      CREATE INDEX IF NOT EXISTS memory_lexical_due ON memory_lexical_pending(world_id,world_revision,actor_id,id,source_kind);
      CREATE TABLE IF NOT EXISTS memory_lexical_progress (
        world_id TEXT PRIMARY KEY,generation TEXT NOT NULL,covered_revision BIGINT NOT NULL,
        pending_rows BIGINT NOT NULL,pending_bytes BIGINT NOT NULL,
        incomplete_actors TEXT[] NOT NULL DEFAULT '{}');
    `);
  await initializeMemoryDerivatives(db);
}
