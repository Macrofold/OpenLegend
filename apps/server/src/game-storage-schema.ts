import { AssetRepository, ASSET_TABLES } from './asset-repository.js';
import { AuthorityRepository, AUTHORITY_TABLES } from './authority.js';
import { CommandReceipts } from './command-receipts.js';
import { CreationTargetRepository } from './creation-target.js';
import { GameSaves } from './game-saves.js';
import { HistoryRepository } from './history.js';
import { InviteRepository } from './invites.js';
import { MaintenanceRepository } from './maintenance.js';
import { MemoryRepository } from './memory-repository.js';
import { ReceivedValueOwnership } from './received-value-ownership.js';
import type { SqlDatabase } from './store.js';
import { VectorStore } from './vector-store.js';
import { WorldAgentStore } from './world-agent-store.js';
import { WorldRecords } from './world-records.js';

export const DATABASE_SCHEMA = '65';
export const PERMITTED_UNMARKED_TABLES = [...ASSET_TABLES, ...AUTHORITY_TABLES] as const;

/** Refuse incompatible or unmarked gameplay storage before any table initialization. */
export async function assertGameSchema(db: Pick<SqlDatabase, 'prepare'>): Promise<void> {
  // Reject old layouts before any table/index initialization can modify them.
  // Runtime never converts or deletes incompatible data. An agent may prepare
  // replacement development state under AGENTS.md#development-save-policy.
  const existing = await db.prepare("SELECT to_regclass('open_legend.meta') AS relation").get();
  if (existing?.['relation']) {
    const version = await db.prepare('SELECT value FROM meta WHERE key=?').get('schema');
    if (version?.['value'] !== DATABASE_SCHEMA)
      throw new Error(
        `Unsupported database schema: stored ${String(version?.['value'] ?? 'missing')}, required ${DATABASE_SCHEMA}. Existing data was not changed. Follow README.md's development database recovery guidance; do not edit the stored schema marker.`,
      );
  }
  // The asset CLI owns its catalog independently of a gameplay database marker.
  // Fresh gameplay may share that current catalog; every other unversioned table
  // still refuses before initialization. docs/asset-workflow.md#publish-an-exact-revision
  if (
    !existing?.['relation'] &&
    (await db
      .prepare(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='open_legend' AND NOT (table_name = ANY(?::text[])) LIMIT 1",
      )
      // Artwork and access have independent owners and can be installed
      // before a game's first initialization. Any unmarked game/storage
      // table still refuses startup; this never admits an older world.
      .get(PERMITTED_UNMARKED_TABLES))
  )
    throw new Error('Database schema marker is missing. Existing data was not changed.');
}

interface LiveSchemaPreparation {
  verifyMemoryLayout(): Promise<void>;
  prepareCheckpointDirectory(): Promise<void>;
}

/** Apply the exact ordered current-schema SQL. The caller owns its transaction.
 * The release exporter records these statements without a connection or world writer.
 * Only a running repository supplies the existing database and checkpoint checks. */
export async function initializeGameSchema(
  db: Pick<SqlDatabase, 'exec'>,
  live?: LiveSchemaPreparation,
): Promise<void> {
  const schema = `
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, payload TEXT NOT NULL, selection JSONB NOT NULL, created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS jobs_recent ON jobs (created_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS jobs_inventor ON jobs ((selection #>> '{request,invention,worldId}'), (selection #>> '{request,invention,actorId}'), created_at, id);
      CREATE INDEX IF NOT EXISTS jobs_speech_event ON jobs ((selection #>> '{playerSpeechEventId}')) WHERE (selection #>> '{kind}') = 'chat';
      CREATE INDEX IF NOT EXISTS jobs_inventor_timeline ON jobs ((selection #>> '{request,invention,worldId}'), (selection #>> '{request,invention,actorId}'), (selection #>> '{request,invention,timelineId}'), created_at, id);
      CREATE INDEX IF NOT EXISTS jobs_unfinished ON jobs(id) WHERE (selection #>> '{status}') IN ('queued','judging','generating');
      CREATE UNIQUE INDEX IF NOT EXISTS decision_actor_active ON jobs
        ((selection #>> '{decision,worldId}'), (selection #>> '{decision,timelineId}'), (selection #>> '{decision,actorId}'))
        WHERE (selection #>> '{decision,higher,state}') IN ('queued','preparing','reserved','dispatched');
      CREATE INDEX IF NOT EXISTS decision_unfinished ON jobs(id)
        WHERE (selection #>> '{decision,phase}') IN ('immediate','waiting-primary','higher');
      CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY, provider TEXT NOT NULL, status TEXT NOT NULL,
        reserved BIGINT NOT NULL CHECK (reserved >= 0), spent BIGINT NOT NULL DEFAULT 0 CHECK (spent >= 0),
        receipt TEXT, created_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS cognition_attempt_links (
        attempt_id TEXT PRIMARY KEY REFERENCES attempts(id), root_job_id TEXT NOT NULL,
        category TEXT NOT NULL, level INTEGER, stage TEXT NOT NULL,
        execution_class TEXT NOT NULL CHECK(execution_class IN ('primary','background')),
        dispatch_intent BOOLEAN NOT NULL DEFAULT false
      );
      CREATE INDEX IF NOT EXISTS cognition_attempt_root ON cognition_attempt_links(root_job_id,attempt_id);
      CREATE INDEX IF NOT EXISTS attempts_unsettled ON attempts(id) WHERE status IN ('reserved','uncertain');
      CREATE INDEX IF NOT EXISTS attempts_created ON attempts(created_at,id);
      CREATE TABLE IF NOT EXISTS attempt_scopes (attempt_id TEXT PRIMARY KEY, actor_id TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS attempt_budgets (attempt_id TEXT PRIMARY KEY, budget_id TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS attempt_budget_scope ON attempt_budgets(budget_id, attempt_id);
      CREATE INDEX IF NOT EXISTS attempt_actor ON attempt_scopes(actor_id,attempt_id);
      CREATE TABLE IF NOT EXISTS intelligence_calls (id TEXT PRIMARY KEY, started_at TEXT NOT NULL, payload TEXT NOT NULL, selection JSONB NOT NULL, summary TEXT NOT NULL, stage TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS intelligence_calls_time ON intelligence_calls(started_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS intelligence_calls_parent_time ON intelligence_calls((selection #>> '{parentId}'), started_at DESC, id DESC);
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS player_profiles (
        id TEXT PRIMARY KEY, revision BIGINT NOT NULL,
        show_unavailable_actions BIGINT NOT NULL CHECK (show_unavailable_actions IN (0, 1)),
        pause_when_hidden BIGINT NOT NULL DEFAULT 1 CHECK (pause_when_hidden IN (0, 1))
      );
    `;
  await db.exec(schema);

  await VectorStore.initializeSchema(db);
  await WorldRecords.initializeSchema(db);
  await ReceivedValueOwnership.initializeSchema(db);
  await live?.verifyMemoryLayout();
  await MemoryRepository.initializeSchema(db);
  await WorldAgentStore.initializeSchema(db);
  await HistoryRepository.initializeSchema(db);
  await live?.prepareCheckpointDirectory();
  await GameSaves.initializeSchema(db);
  await CommandReceipts.initializeSchema(db);
  await AuthorityRepository.initializeSchema(db);
  await AssetRepository.initializeSchema(db);
  await InviteRepository.initializeSchema(db);
  await MaintenanceRepository.initializeSchema(db);
  await CreationTargetRepository.initializeSchema(db);
}
