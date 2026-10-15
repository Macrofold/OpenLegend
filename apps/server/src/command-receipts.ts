import type { ApiResult } from '@open-legend/protocol';
import type { SqlDatabase } from './store.js';
import { z } from 'zod';

export const COMMAND_TABLES = ['gameplay_receipts'] as const;
export const COMMAND_RETRY_MS = 24 * 60 * 60 * 1000;
export interface GameplayReceipt {
  id: string;
  epoch: number;
  fingerprint: string;
  /** Read-only command recovery uses current private authority; other operation owners use null. */
  recoveryFingerprint: string | null;
  result: ApiResult;
  expiresAt: number;
}
export interface CommandEpoch {
  generation: number;
  openedAt: number;
  token: string;
}

const receiptSchema = z
  .object({
    id: z.string().min(1),
    epoch: z.number().int().nonnegative(),
    fingerprint: z.string().min(1),
    recoveryFingerprint: z.string().min(1).nullable(),
    expiresAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    result: z
      .object({
        ok: z.boolean(),
        code: z.string(),
        message: z.string(),
        jobId: z.string().optional(),
        itemId: z.string().optional(),
        recipeId: z.string().optional(),
        goalId: z.string().optional(),
        planId: z.string().optional(),
        actionId: z.string().optional(),
      })
      .passthrough(),
  })
  .strict();

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
    // Current-format only: an older receipt cannot silently acquire recovery permission.
    return row ? receiptSchema.parse(JSON.parse(String(row['payload']))) : undefined;
  }
  async save(worldId: string, receipt: GameplayReceipt): Promise<void> {
    const current = receiptSchema.parse(receipt);
    await this.db
      .prepare('INSERT INTO gameplay_receipts VALUES (?,?,?,?,?)')
      .run(worldId, current.id, current.epoch, current.expiresAt, JSON.stringify(current));
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
