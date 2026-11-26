import type { SqlDatabase } from './sql-database.js';

export const WORLD_AGENT_TABLES = ['world_agent_sessions', 'world_agent_records'] as const;

export async function initializeWorldAgentSchema(db: Pick<SqlDatabase, 'exec'>): Promise<void> {
  await db.exec(`CREATE TABLE IF NOT EXISTS world_agent_sessions (
      id TEXT PRIMARY KEY, world_id TEXT NOT NULL, context_hash TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE UNIQUE INDEX IF NOT EXISTS world_agent_context ON world_agent_sessions(context_hash);
      CREATE INDEX IF NOT EXISTS world_agent_world ON world_agent_sessions(world_id,id);
      CREATE INDEX IF NOT EXISTS world_agent_active ON world_agent_sessions(world_id,id)
        WHERE (payload::jsonb #>> '{activeTurn}') IS NOT NULL;
      CREATE INDEX IF NOT EXISTS world_agent_owner_order_numeric
        ON world_agent_sessions(world_id,(payload::jsonb #>> '{principal}'),CAST((payload::jsonb #>> '{createdAt}') AS BIGINT),id);
      CREATE TABLE IF NOT EXISTS world_agent_records (
        session_id TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY(session_id,kind,id));
      CREATE INDEX IF NOT EXISTS world_agent_turn_order_numeric
        ON world_agent_records(session_id, COALESCE(CAST((payload::jsonb #>> '{sequence}') AS BIGINT),0),id)
        WHERE kind='turn';
      CREATE INDEX IF NOT EXISTS world_agent_revision_order_numeric
        ON world_agent_records(session_id,(payload::jsonb #>> '{id}'),CAST((payload::jsonb #>> '{revision}') AS BIGINT))
        WHERE kind='revision';
      CREATE INDEX IF NOT EXISTS world_agent_plan_draft_order
        ON world_agent_records(session_id,(payload::jsonb #>> '{draftId}'),CAST((payload::jsonb #>> '{revision}') AS BIGINT),id)
        WHERE kind='plan';
      CREATE INDEX IF NOT EXISTS world_agent_creation_pending
        ON world_agent_records(session_id,id)
        WHERE kind='creation-operation' AND (payload::jsonb #>> '{view,status}')
          IN ('dispatching','uncertain','created','host-unavailable');
      CREATE INDEX IF NOT EXISTS world_agent_creation_world_active
        ON world_agent_records(session_id,(payload::jsonb #>> '{request,candidate,worldId}'),id)
        WHERE kind='creation-operation' AND (payload::jsonb #>> '{view,status}')
          IN ('dispatching','uncertain','created','host-unavailable','ready');
`);
}
