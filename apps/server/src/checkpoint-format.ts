import type { SqlDatabase } from './store.js';

// Encoding limits are work bounds, not history retention. Larger individual owners
// must split growing collections in the canonical codec before raising these limits.
export const CHECKPOINT_LIMITS = {
  rowBytes: 1024 * 1024,
  bytes: 256 * 1024 * 1024,
  rows: 2_000_000,
  page: 64,
};
export const CHECKPOINT_ENCODING = 'records-jsonl-2';

export const SAVE_FORMAT = 'development-2026-11-07-personal-result-evidence';

/** Operator policy, outside gameplay rewind (docs/limits/persistence.md#sv01). */
export const AUTOSAVE_DEFAULTS = { enabled: true, intervalMinutes: 5, retain: 3 } as const;
export const AUTOSAVE_LIMITS = {
  intervalMinutes: { min: 1, max: 1440 },
  retain: { min: 1, max: 20 },
} as const;

export async function initializeCheckpointSchema(db: Pick<SqlDatabase, 'exec'>): Promise<void> {
  // Preserve the exact SQL shared by the current release artifact.
  await db.exec(`CREATE TABLE IF NOT EXISTS game_saves (
      id TEXT PRIMARY KEY, world_id TEXT NOT NULL, label TEXT NOT NULL,
      created_at TEXT NOT NULL, sim_time REAL NOT NULL, format TEXT NOT NULL,
      checksum TEXT NOT NULL, payload TEXT NOT NULL
    )`);
}
