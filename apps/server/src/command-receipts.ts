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

/** Optional current-epoch absence proof. False positives use exact SQL; a clear
 * bit can only describe an ID never admitted by the service's receipt owner.
 * Reset exclusively with a newly durable epoch, never with hot-cache eviction.
 * docs/projects/bookkeeping-simplification-runtime-design.md#conditional-current-epoch-absence-proof
 */
export class CommandReceiptAbsence {
  private readonly bits = new Uint32Array(262144);
  constructor(private readonly epoch: string) {}

  private digest(id: string): string | undefined {
    const offset = id.length - 64;
    if (
      offset < 0 ||
      !id.startsWith('gameplay:') ||
      !id.slice(0, offset).endsWith(`:${this.epoch}:`)
    )
      return undefined;
    const digest = id.slice(offset);
    return /^[0-9a-f]{64}$/.test(digest) ? digest : undefined;
  }

  mayContain(id: string): boolean {
    const digest = this.digest(id);
    if (!digest) return true;
    for (let offset = 0; offset < 32; offset += 8) {
      const bit = Number.parseInt(digest.slice(offset, offset + 8), 16) & 8388607;
      if (!(this.bits[bit >>> 5]! & (1 << (bit & 31)))) return false;
    }
    return true;
  }

  accepted(id: string): void {
    const digest = this.digest(id);
    if (!digest) return;
    for (let offset = 0; offset < 32; offset += 8) {
      const bit = Number.parseInt(digest.slice(offset, offset + 8), 16) & 8388607;
      // The mask bounds every word index to this fixed array.
      this.bits[bit >>> 5] = this.bits[bit >>> 5]! | (1 << (bit & 31));
    }
  }
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
  private readonly reads = new Map<
    string,
    Map<
      string,
      Array<{ resolve(value: GameplayReceipt | undefined): void; reject(error: unknown): void }>
    >
  >();
  private readScheduled = false;
  async get(worldId: string, id: string): Promise<GameplayReceipt | undefined> {
    // Protected enclosing transactions keep their own exact snapshot. Ordinary
    // request preparation shares one bounded cold lookup outside native mutation.
    if (this.db.transactionActive) {
      const row = await this.db
        .prepare('SELECT payload FROM gameplay_receipts WHERE world_id=? AND id=?')
        .get(worldId, id);
      return row ? receiptSchema.parse(JSON.parse(String(row['payload']))) : undefined;
    }
    const result = new Promise<GameplayReceipt | undefined>((resolve, reject) => {
      let world = this.reads.get(worldId);
      if (!world) this.reads.set(worldId, (world = new Map()));
      const listeners = world.get(id) ?? [];
      listeners.push({ resolve, reject });
      world.set(id, listeners);
    });
    if (!this.readScheduled) {
      this.readScheduled = true;
      queueMicrotask(() => {
        void this.readBatch();
      });
    }
    return result;
  }
  private async readBatch(): Promise<void> {
    this.readScheduled = false;
    const pending = [...this.reads];
    this.reads.clear();
    for (const [worldId, entries] of pending) {
      const ids = [...entries.keys()];
      for (let start = 0; start < ids.length; start += 128) {
        const selected = ids.slice(start, start + 128);
        try {
          const rows = await this.db
            .prepare(
              'SELECT id,payload FROM gameplay_receipts WHERE world_id=? AND id=ANY(?::text[])',
            )
            .all(worldId, selected);
          const values = new Map(
            rows.map((row) => [
              String(row['id']),
              receiptSchema.parse(JSON.parse(String(row['payload']))),
            ]),
          );
          for (const id of selected)
            for (const waiter of entries.get(id)!) waiter.resolve(values.get(id));
        } catch (error) {
          for (const id of selected) for (const waiter of entries.get(id)!) waiter.reject(error);
        }
      }
    }
  }
  async save(worldId: string, receipt: GameplayReceipt): Promise<void> {
    const current = receiptSchema.parse(receipt);
    await this.db
      .prepare(
        'INSERT INTO gameplay_receipts(world_id,id,epoch,expires_at,payload) VALUES (?,?,?,?,?)',
      )
      .run(worldId, current.id, current.epoch, current.expiresAt, JSON.stringify(current));
  }
  async saveBatch(worldId: string, receipts: readonly GameplayReceipt[]): Promise<void> {
    // Outcomes share the world's transaction. Bounded chunks preserve exact retry
    // identity while removing the old one-query-per-command persistence path.
    for (let start = 0; start < receipts.length; start += 128) {
      const rows = receipts.slice(start, start + 128).map((value) => {
        const receipt = receiptSchema.parse(value);
        return {
          world_id: worldId,
          id: receipt.id,
          epoch: receipt.epoch,
          expires_at: receipt.expiresAt,
          payload: JSON.stringify(receipt),
        };
      });
      await this.db
        .prepare(
          `INSERT INTO gameplay_receipts
        SELECT * FROM jsonb_populate_recordset(NULL::gameplay_receipts,?::jsonb)`,
        )
        .run(JSON.stringify(rows));
    }
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
