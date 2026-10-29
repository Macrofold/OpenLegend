import type { SqlDatabase } from './store.js';
import type { CommandReceiptWrite } from './command-receipts.js';
import {
  APPLICATION_REVISIONS,
  applyJournalRange,
  type JournalRange,
  type JournalApplied,
  type RetainedJournal,
} from './journal-application.js';
import {
  decodeJournalTransition,
  validatedJournalTransition,
  type EncodedJournalTransition,
  type JournalTransition,
} from './world-journal-data.js';

export interface JournalApplication {
  worldId: string;
  generation: string;
  revision: number;
  transition: JournalTransition;
}
export type JournalAdmission =
  | { kind: 'admitted'; receipt?: CommandReceiptWrite }
  | { kind: 'synchronous' };
export type JournalAppendResult = { kind: 'appended'; revision: number } | { kind: 'synchronous' };
const PENDING_REVISIONS = 32;
export const PERSISTENCE_DEBT_BYTES = 32 * 1024 * 1024;
const PENDING_BYTES = PERSISTENCE_DEBT_BYTES;

/** One durable ordered suffix beyond the canonical tables. Its application lane belongs
 * to the existing PostgreSQL writer, never to a second gameplay mutation owner.
 * docs/projects/performance-overhaul/journal-contract.md */
export class WorldJournal<Preparation> {
  private committed = 0;
  private applied = 0;
  private pendingBytes = 0;
  private worldId?: string;
  private generation?: string;
  private failure?: unknown;
  private worker?: Promise<void>;
  private wake?: NodeJS.Immediate;
  private readonly online = new Map<number, RetainedJournal<Preparation>>();
  constructor(
    private readonly db: SqlDatabase,
    private readonly apply: (entry: JournalApplication, preparation?: Preparation) => Promise<void>,
    private readonly applyBatch?: (
      range: JournalRange,
      entries: ReadonlyMap<number, RetainedJournal<Preparation>>,
    ) => Promise<JournalApplied | undefined>,
  ) {}
  async initialize(): Promise<void> {
    await this.db.exec(`CREATE TABLE IF NOT EXISTS world_change_journal (
      world_id TEXT NOT NULL REFERENCES world_head(world_id),generation TEXT NOT NULL,
      revision BIGINT NOT NULL CHECK (revision>0),predecessor BIGINT NOT NULL CHECK (predecessor>=0),
      bytes BIGINT NOT NULL CHECK (bytes>0 AND bytes<=${PENDING_BYTES}),checksum TEXT NOT NULL,payload TEXT NOT NULL,
      PRIMARY KEY(world_id,generation,revision),CHECK (revision=predecessor+1),CHECK (octet_length(payload)=bytes)
    )`);
    const head = await this.db
      .prepare(
        `SELECT h.world_id,h.generation,h.revision,h.applied_revision,
      coalesce(sum(j.bytes),0) AS bytes,count(j.revision) AS entries,
      count(j.revision) FILTER (WHERE j.generation<>h.generation) AS foreign_entries
      FROM world_head h LEFT JOIN world_change_journal j ON j.world_id=h.world_id
      GROUP BY h.world_id,h.revision,h.applied_revision,h.generation`,
      )
      .get();
    if (!head) return;
    this.worldId = String(head['world_id']);
    this.generation = String(head['generation']);
    this.committed = Number(head['revision']);
    this.applied = Number(head['applied_revision']);
    this.pendingBytes = Number(head['bytes']);
    if (
      !Number.isSafeInteger(this.committed) ||
      !Number.isSafeInteger(this.applied) ||
      this.applied > this.committed ||
      Number(head['foreign_entries']) !== 0 ||
      Number(head['entries']) !== this.committed - this.applied ||
      this.committed - this.applied > PENDING_REVISIONS ||
      this.pendingBytes > PENDING_BYTES
    )
      throw new Error('Invalid durable world journal coverage.');
  }
  /** Existing atomic families call this only after both heads commit together. */
  synchronized(worldId: string, revision: number): void {
    if (this.failure) throw this.failure;
    if (this.worker || this.applied !== this.committed)
      throw new Error('Drain the world journal before synchronous saving.');
    this.worldId = worldId;
    this.generation = undefined;
    this.applied = this.committed = revision;
    this.pendingBytes = 0;
    this.online.clear();
  }
  /** Exact only inside the raw primary writer transaction, after captured work
   * has drained. Append publication runs before that lane admits its successor;
   * the secondary application lane can only close the remaining difference.
   * Independent reader snapshots still require their own SQL/header fence.
   * docs/projects/performance-overhaul/saved-native-calculations.md#selected-steps-and-scope
   */
  writeAligned(): boolean {
    if (this.failure) throw this.failure;
    if (!this.db.transactionActive || this.db.projectionRevision !== undefined)
      throw new Error('Journal write alignment requires the owned primary transaction.');
    return this.applied === this.committed;
  }
  /** An instantaneous absence of work, never authority for a later SQL read. */
  canSkipFlush(): boolean {
    if (this.failure) throw this.failure;
    return this.applied === this.committed && !this.worker && !this.wake;
  }
  get unappliedBytes(): number {
    return this.pendingBytes;
  }
  async append(
    worldId: string,
    expected: number,
    encoded: EncodedJournalTransition,
    preparation: Preparation,
    admit: () => Promise<JournalAdmission>,
    unreclaimedBytes = 0,
  ): Promise<JournalAppendResult> {
    if (this.failure) throw this.failure;
    const transition = validatedJournalTransition(encoded);
    if (
      !Number.isSafeInteger(expected) ||
      expected < 1 ||
      expected === Number.MAX_SAFE_INTEGER ||
      expected !== this.committed
    )
      throw new Error('Save conflict: the journal expected a different exact revision.');
    if (
      !this.db.materializationTransaction ||
      this.db.transactionActive ||
      worldId !== this.worldId
    )
      throw new Error('Deferred saving requires the initialized owned application lane.');
    if (
      this.committed - this.applied >= PENDING_REVISIONS ||
      this.pendingBytes + unreclaimedBytes + encoded.bytes > PENDING_BYTES
    )
      await this.flush();
    if (unreclaimedBytes + encoded.bytes > PENDING_BYTES) return { kind: 'synchronous' };
    return this.db.transaction(async (): Promise<JournalAppendResult> => {
      const admission = await admit();
      if (admission.kind === 'synchronous') return admission;
      const receipt = admission.receipt;
      // Read-only preflight sees the committed membership by overlaying its exact
      // pending suffix. A competing successor still fails this final atomic head.
      const head = await this.db
        .prepare(
          `WITH advanced AS (
        UPDATE world_head SET revision=revision+1 WHERE id=1 AND world_id=? AND revision=?
        RETURNING world_id,generation,revision
      ), journaled AS (
        INSERT INTO world_change_journal(world_id,generation,revision,predecessor,bytes,checksum,payload)
        SELECT world_id,generation,revision,revision-1,?,?,? FROM advanced RETURNING revision,generation
      ) ${receipt ? ',receipt AS (' + receipt.sql + ')' : ''}
      SELECT revision,generation FROM journaled`,
        )
        .get(
          worldId,
          expected,
          encoded.bytes,
          encoded.checksum,
          encoded.payload,
          ...(receipt?.params ?? []),
        );
      if (!head) throw new Error('Save conflict: another writer changed this world.');
      const revision = Number(head['revision']);
      const publish = () => {
        this.committed = revision;
        this.generation = String(head['generation']);
        this.pendingBytes += encoded.bytes;
        this.online.set(revision, {
          checksum: encoded.checksum,
          bytes: encoded.bytes,
          preparation,
          transition,
        });
      };
      this.db.afterCommit?.(publish);
      if (!this.db.afterCommit) publish();
      return { kind: 'appended', revision };
    });
  }
  schedule(): void {
    if (this.wake || this.worker || this.applied === this.committed || this.failure) return;
    this.wake = setImmediate(() => {
      this.wake = undefined;
      void this.flush().catch(() => {
        // Accepted recovery data remains durable. Callers of flush/append receive the
        // original failure; do not retry a failed application behind their backs.
      });
    });
  }
  async flush(): Promise<void> {
    if (this.failure) throw this.failure;
    if (this.wake) {
      clearImmediate(this.wake);
      this.wake = undefined;
    }
    const through = this.committed;
    while (this.applied < through) {
      if (!this.worker) {
        const running = this.drain(through).catch((error) => {
          this.failure = error;
          throw error;
        });
        this.worker = running;
        void running
          .finally(() => {
            if (this.worker === running) this.worker = undefined;
          })
          .catch(() => undefined);
      }
      await this.worker;
    }
    this.schedule();
  }
  private async drain(through: number): Promise<void> {
    while (this.applied < through) {
      const revision = this.applied + 1;
      if (!this.db.materializationTransaction) throw new Error('Missing owned application lane.');
      // Share transaction/header waits only for exact retained preparations. Recovery
      // retains its one-entry reconstruction boundary; no intermediate effect is lost.
      let throughBatch = revision;
      while (
        throughBatch < through &&
        throughBatch - revision + 1 < APPLICATION_REVISIONS &&
        this.online.has(throughBatch) &&
        this.online.has(throughBatch + 1)
      )
        throughBatch++;
      if (!this.generation) throw new Error('Journal application has no exact generation.');
      const range: JournalRange = {
        worldId: this.worldId!,
        generation: this.generation,
        first: revision,
        through: throughBatch,
      };
      const entries = new Map(
        [...this.online].filter(([id]) => id >= revision && id <= throughBatch),
      );
      const result =
        (await this.applyBatch?.(range, entries)) ??
        (await applyJournalRange(this.db, range, entries, this.apply));
      if (
        result.worldId !== range.worldId ||
        result.generation !== range.generation ||
        result.first !== revision ||
        result.through !== throughBatch
      )
        throw new Error('Journal completion has a different owner.');
      // Both application paths resolve only after the real SQL COMMIT.
      this.applied = throughBatch;
      this.pendingBytes -= result.bytes;
      for (let id = revision; id <= throughBatch; id++) this.online.delete(id);
    }
  }
  /** Exact pending changes supplement indexed constraint reads from the applied prefix. */
  async pending(): Promise<JournalTransition[]> {
    if (this.online.size === this.committed - this.applied)
      return [...this.online.values()].map((entry) => entry.transition);
    const rows = await this.db
      .prepare(
        `SELECT j.payload,j.checksum FROM world_change_journal j
      JOIN world_head h ON h.world_id=j.world_id AND h.generation=j.generation
      WHERE j.revision>h.applied_revision ORDER BY j.revision`,
      )
      .all();
    return rows.map((row) =>
      decodeJournalTransition(String(row['payload']), String(row['checksum'])),
    );
  }
}
