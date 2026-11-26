import type { SqlDatabase } from './sql-database.js';

export const HISTORY_TABLES = [
  'story_banners',
  'story_delivery',
  'history_perspectives',
  'story_jobs',
  'story_context_sources',
  'story_milestones',
  'history_events',
  'story_narrations',
  'story_event_sources',
  'history_totals',
] as const;

/** Install the current retained history format for both live and stopped producers. */
export async function initializeHistorySchema(db: Pick<SqlDatabase, 'exec'>): Promise<void> {
  await db.exec(`
      CREATE TABLE IF NOT EXISTS history_totals (
        world_id TEXT PRIMARY KEY, event_count BIGINT NOT NULL CHECK(event_count>=0));
      CREATE TABLE IF NOT EXISTS story_banners (
        world_id TEXT NOT NULL, owner_id TEXT NOT NULL, id TEXT NOT NULL, position BIGINT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY(world_id,owner_id,id));
      CREATE INDEX IF NOT EXISTS story_banner_order ON story_banners(world_id,owner_id,position,id);
      CREATE TABLE IF NOT EXISTS story_delivery (
        world_id TEXT NOT NULL, owner_id TEXT NOT NULL, game_time DOUBLE PRECISION NOT NULL,
        PRIMARY KEY(world_id,owner_id));
      CREATE TABLE IF NOT EXISTS history_perspectives (
        world_id TEXT NOT NULL,event_id TEXT NOT NULL,actor_id TEXT NOT NULL,payload TEXT NOT NULL,
        position BIGINT NOT NULL,event_type TEXT NOT NULL,source_id TEXT,target_id TEXT,
        speech_peer_id TEXT,response_action BOOLEAN NOT NULL,
        temporal_life BIGINT,temporal_epoch TEXT,temporal_batch_order BIGINT,temporal_entry_index BIGINT,
        PRIMARY KEY(world_id,event_id,actor_id));
      CREATE INDEX IF NOT EXISTS history_perspective_temporal ON history_perspectives
        (world_id,actor_id,temporal_life,temporal_epoch,temporal_batch_order,temporal_entry_index) WHERE temporal_batch_order IS NOT NULL;
      CREATE TABLE IF NOT EXISTS story_context_sources (
        world_id TEXT NOT NULL,narration_id TEXT NOT NULL,owner_id TEXT NOT NULL,event_id TEXT NOT NULL,
        PRIMARY KEY(world_id,narration_id,owner_id,event_id));
      CREATE INDEX IF NOT EXISTS story_context_reverse ON story_context_sources(world_id,event_id);
      CREATE TABLE IF NOT EXISTS story_jobs (
        world_id TEXT NOT NULL,id TEXT NOT NULL,owner_id TEXT NOT NULL,state TEXT NOT NULL,
        created_at BIGINT NOT NULL,payload TEXT NOT NULL,actor_id TEXT NOT NULL,
        PRIMARY KEY(world_id,id,owner_id));
      CREATE INDEX IF NOT EXISTS story_queue ON story_jobs(world_id,state,created_at,id);
      CREATE INDEX IF NOT EXISTS story_owner_queue ON story_jobs(world_id,owner_id,state);
      CREATE TABLE IF NOT EXISTS story_milestones (
        world_id TEXT NOT NULL,owner_id TEXT NOT NULL,milestone TEXT NOT NULL,event_id TEXT NOT NULL,
        PRIMARY KEY(world_id,owner_id,milestone));
      CREATE TABLE IF NOT EXISTS history_events (
        world_id TEXT NOT NULL, id TEXT NOT NULL, position BIGINT NOT NULL,
        payload TEXT NOT NULL,response_id TEXT,data_references TEXT[] NOT NULL,utterance_id TEXT,
        PRIMARY KEY(world_id,id));
      CREATE INDEX IF NOT EXISTS history_events_response ON history_events(world_id,response_id) WHERE response_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS history_events_utterance ON history_events(world_id,utterance_id) WHERE utterance_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS history_events_references ON history_events USING GIN(data_references);
      CREATE INDEX IF NOT EXISTS history_events_order ON history_events(world_id,position,id);
      CREATE TABLE IF NOT EXISTS story_narrations (
        world_id TEXT NOT NULL, id TEXT NOT NULL, owner_id TEXT NOT NULL,
        position BIGINT NOT NULL, revision BIGINT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY(world_id,id,owner_id));
      CREATE INDEX IF NOT EXISTS story_owner_order ON story_narrations(world_id,owner_id,position,id);
      CREATE TABLE IF NOT EXISTS story_event_sources (
        world_id TEXT NOT NULL, narration_id TEXT NOT NULL, owner_id TEXT NOT NULL, event_id TEXT NOT NULL,
        PRIMARY KEY(world_id,narration_id,owner_id,event_id));
      CREATE INDEX IF NOT EXISTS story_event_reverse ON story_event_sources(world_id,event_id);
    `);
  await db.exec(`
    CREATE INDEX IF NOT EXISTS history_perspective_order ON history_perspectives(world_id,actor_id,position,event_id);
    CREATE INDEX IF NOT EXISTS history_perspective_type_order ON history_perspectives(world_id,actor_id,event_type,position,event_id);
    CREATE INDEX IF NOT EXISTS history_perspective_time ON history_perspectives(world_id,actor_id,((payload::jsonb->>'time')::double precision),position,event_id);
    CREATE INDEX IF NOT EXISTS history_perspective_speech_source ON history_perspectives(world_id,actor_id,source_id,position,event_id) WHERE event_type='speech' AND source_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS history_perspective_speech_target ON history_perspectives(world_id,actor_id,target_id,position,event_id) WHERE event_type='speech' AND target_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS history_perspective_response_order ON history_perspectives(world_id,actor_id,position,event_id) WHERE response_action;
    CREATE INDEX IF NOT EXISTS history_perspective_source_response_order ON history_perspectives(world_id,actor_id,source_id,position,event_id) WHERE response_action;
  `);
}
