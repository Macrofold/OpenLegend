import { WORLD_AGENT_TABLES } from './world-agent-storage-schema.js';
import { ASSET_TABLES } from './asset-repository.js';
import { AUTHORITY_TABLES } from './authority.js';
import { CREATION_TARGET_TABLES } from './creation-target-contracts.js';
import { COMMAND_TABLES } from './command-receipts.js';
import { MEMORY_CACHE_TABLES, MEMORY_HISTORY_TABLES } from './memory-storage-schema.js';
import { HISTORY_TABLES } from './history-storage-schema.js';

export const BACKUP_FORMAT = 'openlegend-backup-records-1';
export const BACKUP_OPERATIONS_FORMAT = 'operations-1';
export const MAX_BACKUP_SLOTS = 10_000;
export const BACKUP_MANIFEST_BYTES = 1024 * 1024;

export const OPERATION_TABLES = [
  'jobs',
  'attempts',
  'intelligence_calls',
  'meta',
  'player_profiles',
  'game_saves',
  ...COMMAND_TABLES,
  'memory_index_attempts',
  ...MEMORY_CACHE_TABLES,
  'attempt_scopes',
  'attempt_budgets',
  'cognition_attempt_links',
  ...WORLD_AGENT_TABLES,
  ...AUTHORITY_TABLES,
  ...ASSET_TABLES,
  ...CREATION_TARGET_TABLES,
];
// Import/restore consume this same catalog so new external owners cannot silently
// disappear between backup publication and installation.
export const BACKUP_TABLES = [...OPERATION_TABLES, ...HISTORY_TABLES, ...MEMORY_HISTORY_TABLES];
