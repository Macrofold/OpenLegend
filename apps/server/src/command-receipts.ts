import type { ApiResult } from '@open-legend/protocol';
import type { SqlDatabase } from './store.js';

export const COMMAND_TABLES = ['gameplay_receipts'] as const;
export const COMMAND_RETRY_MS = 24 * 60 * 60 * 1000;
export interface GameplayReceipt {
  id: string;
  epoch: number;
  fingerprint: string;
  result: ApiResult;
  expiresAt: number;
}
export interface CommandEpoch {
  generation: number;
  openedAt: number;
  token: string;
}

/** Gameplay-only retention; see docs/architecture.md#performance-critical-path for recovery boundaries. */
export class CommandReceipts {
  constructor(private db: SqlDatabase) {}
  async initialize() {
    await this.db.exec(`CREATE TABLE IF NOT EXISTS gameplay_receipts (
      world_id TEXT NOT NULL, id TEXT NOT NULL, epoch BIGINT NOT NULL,
      expires_at BIGINT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(world_id,id));
      CREATE INDEX IF NOT EXISTS gameplay_expiry ON gameplay_receipts(world_id,epoch,expires_at);`);
  }
  async get(worldId: string, id: string): Promise<GameplayReceipt | undefined> {
    const row = await this.db
      .prepare('SELECT payload FROM gameplay_receipts WHERE world_id=? AND id=?')
      .get(worldId, id);
    return row ? (JSON.parse(String(row['payload'])) as GameplayReceipt) : undefined;
  }
  async save(worldId: string, receipt: GameplayReceipt): Promise<void> {
    await this.db
      .prepare('INSERT INTO gameplay_receipts VALUES (?,?,?,?,?)')
      .run(worldId, receipt.id, receipt.epoch, receipt.expiresAt, JSON.stringify(receipt));
  }
  async prune(worldId: string, epoch: number, now: number): Promise<void> {
    // The new epoch must be durable first. Retired IDs are rejected before domain admission.
    await this.db
      .prepare(
        'DELETE FROM gameplay_receipts WHERE world_id=? AND epoch>0 AND epoch<? AND expires_at<=?',
      )
      .run(worldId, epoch - 1, now);
  }
}
