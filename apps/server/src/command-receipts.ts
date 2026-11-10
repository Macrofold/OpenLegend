import type { ApiResult, CommandInput } from '@open-legend/protocol';
import { commandRecoveryFields, type RequestScope } from './authority.js';
import { digest } from './content-digest.js';
import type { SqlDatabase } from './store.js';
import { z } from 'zod';
import { decodeSourceJson } from './native-source-preparation.js';

export const COMMAND_TABLES = ['gameplay_receipts'] as const;
export const COMMAND_RETRY_MS = 24 * 60 * 60 * 1000;
export const COMMAND_RECEIPT_CACHE_ENTRIES = 1024;
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

/** Reconnection can recover a result within its original private authority;
 * this identity never admits execution or crosses a restored timeline. */
export function commandRecoveryFingerprint(input: CommandInput, scope: RequestScope): string {
  return digest({ input, scope: commandRecoveryFields(scope) });
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
  async get(
    worldId: string,
    id: string,
    options?: { readonly isolatedRead: true },
  ): Promise<GameplayReceipt | undefined> {
    // Protected enclosing transactions keep their own exact snapshot. Ordinary
    // request preparation shares one bounded cold lookup outside native mutation.
    // A native caller's finite transfer/parser owner cannot be shared with a
    // different caller's asynchronous batching lifetime.
    if (this.db.transactionActive || options?.isolatedRead) {
      const row = await this.db
        .prepare('SELECT payload FROM gameplay_receipts WHERE world_id=? AND id=?')
        .get(worldId, id);
      return row ? this.decode(String(row['payload'])) : undefined;
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
  private decode(payload: string): GameplayReceipt {
    // Native callers fund both the parser and Zod's validated object copy.
    // Source callers have no native preparation owner and keep this same codec.
    return decodeSourceJson(payload, () => receiptSchema.parse(JSON.parse(payload)), 2);
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
            rows.map((row) => [String(row['id']), this.decode(String(row['payload']))]),
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
