import type { SqlDatabase } from './store.js';

const MAX_ENTRIES = 512;
const MAX_BYTES = 2 * 1024 * 1024;
type Entry = { value: Promise<string | undefined>; bytes: number };

/** Reuse committed scheduling/interest reads, never a transaction's tentative state.
 * These keys have one writer through put(); game restore explicitly clears this owner.
 * Conversation compaction has separate SQL compare-and-swap writers and is not cached.
 * docs/performance.md#committed-cognition-metadata
 */
export class IntegrationValues {
  private readonly entries = new Map<string, Entry>();
  private bytes = 0;
  constructor(private readonly db: SqlDatabase) {}

  clear(): void {
    this.entries.clear();
    this.bytes = 0;
  }

  private remove(key: string): void {
    const entry = this.entries.get(key);
    if (entry) this.bytes -= entry.bytes;
    this.entries.delete(key);
  }

  private async read(key: string): Promise<string | undefined> {
    const row = await this.db
      .prepare('SELECT value FROM meta WHERE key = ?')
      .get(`integration:${key}`);
    return row ? String(row['value']) : undefined;
  }

  async get(key: string): Promise<unknown> {
    // An older repeatable-read snapshot must not see a newer committed cached value;
    // a writer must see its own changes. Unknown adapters take the uncached path.
    const shared =
      this.db.transactionActive === false &&
      !!this.db.afterCommit &&
      !!this.db.afterRollback &&
      /^(interests|reflection-queue|semantic-schedule):/.test(key);
    let entry = shared ? this.entries.get(key) : undefined;
    if (!entry) {
      entry = { bytes: key.length * 2, value: this.read(key) };
      if (shared && entry.bytes <= MAX_BYTES) {
        const pending = entry;
        this.entries.set(key, pending);
        this.bytes += pending.bytes;
        pending.value = pending.value.then(
          (value) => {
            // A concurrent write/restore/eviction may have detached this read already.
            if (this.entries.get(key) === pending) {
              const added = (value?.length ?? 0) * 2;
              pending.bytes += added;
              this.bytes += added;
              this.trim();
            }
            return value;
          },
          (error: unknown) => {
            if (this.entries.get(key) === pending) this.remove(key);
            throw error;
          },
        );
        this.trim();
      }
    }
    const value = await entry.value;
    // Consumers may edit their result; only encoded, immutable data is shared.
    return value === undefined ? undefined : JSON.parse(value);
  }

  private trim(): void {
    while (this.entries.size > MAX_ENTRIES || this.bytes > MAX_BYTES)
      this.remove(this.entries.keys().next().value!);
  }

  async put(key: string, value: unknown): Promise<void> {
    this.remove(key);
    try {
      await this.db
        .prepare(
          'INSERT INTO meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE meta.value IS DISTINCT FROM excluded.value',
        )
        .run(`integration:${key}`, JSON.stringify(value));
    } finally {
      // A reader can finish while a write is queued or not yet committed. Invalidate
      // again at publication (or rollback) rather than caching uncommitted input.
      this.remove(key);
      this.db.afterCommit?.(() => this.remove(key));
      this.db.afterRollback?.(() => this.remove(key));
    }
  }
}
