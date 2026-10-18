import type { SqlDatabase } from './store.js';

class ProjectionMoved extends Error {}
const READ_WAIT_MS = 5000;

/** Existing repositories share one read fence; none can successfully mistake the
 * applied prefix for newly acknowledged history. Operational-only reads stay narrow.
 * docs/projects/performance-overhaul/journal-contract.md#reader-revision-and-wait-matrix */
export class JournalDatabase implements SqlDatabase {
  private readonly operationalTables: ReadonlySet<string>;
  constructor(
    private readonly raw: SqlDatabase,
    private readonly flush: () => Promise<void>,
    private readonly active: () => boolean,
    operationalTables: ReadonlySet<string>,
    private readonly writeAligned: () => boolean,
    private readonly canSkipFlush: () => boolean,
  ) {
    this.operationalTables = new Set(operationalTables);
  }
  get writeGroups() {
    return this.raw.writeGroups;
  }
  get transactionActive() {
    return this.raw.transactionActive;
  }
  get projectionRevision() {
    return this.raw.projectionRevision;
  }
  get checkpointSource() {
    return this.raw.checkpointSource;
  }
  afterCommit(callback: () => void): void {
    if (this.raw.afterCommit) this.raw.afterCommit(callback);
    else callback();
  }
  afterRollback(callback: () => void): void {
    this.raw.afterRollback?.(callback);
  }
  synchronizeProjection(): Promise<void> {
    return this.active() ? this.flush() : Promise.resolve();
  }
  private touchesCanonicalTables(sql: string): boolean {
    const names = [
      ...sql.matchAll(/\b(?:FROM|JOIN|UPDATE|INTO|TABLE)\s+([a-z_][a-z_0-9.]*)/gi),
    ].map((match) => match[1]!.toLowerCase());
    // An unknown table/expression is conservative. No general SQL parser grants
    // access; this list only identifies the finite immediate operational owners.
    return !names.length || names.some((name) => !this.operationalTables.has(name));
  }
  private async wait(deadline: number): Promise<void> {
    const remaining = deadline - performance.now();
    if (remaining <= 0) throw new Error('Saved changes are still being applied. Try again.');
    // This avoids only an idle wait allocation. New snapshots and acquired
    // writer turns still establish their own current alignment below.
    if (this.canSkipFlush()) return;
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.synchronizeProjection(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Saved changes are still being applied. Try again.')),
            remaining,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  private async aligned(): Promise<void> {
    const head = await this.raw
      .prepare('SELECT revision,applied_revision FROM world_head WHERE id=1')
      .get();
    if (head && Number(head['revision']) !== Number(head['applied_revision']))
      throw new ProjectionMoved();
  }
  async transaction<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.active() || this.raw.transactionActive) return this.raw.transaction(operation);
    const deadline = performance.now() + READ_WAIT_MS;
    for (;;) {
      await this.wait(deadline);
      try {
        return await this.raw.transaction(async () => {
          // The raw primary writer lane is now held: no new append can overtake
          // this check. An append queued after our captured flush may already
          // have committed before this transaction acquired the lane, so inspect
          // the owner's current heads here and retry the drain when they differ.
          // The independent read snapshot retains its SQL/header fence below.
          if (!this.writeAligned()) throw new ProjectionMoved();
          return operation();
        });
      } catch (error) {
        if (!(error instanceof ProjectionMoved)) throw error;
      }
    }
  }
  async readTransaction<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.active() || this.raw.transactionActive)
      return this.raw.readTransaction
        ? this.raw.readTransaction(operation)
        : this.raw.transaction(operation);
    const deadline = performance.now() + READ_WAIT_MS;
    for (;;) {
      await this.wait(deadline);
      try {
        const snapshot =
          this.raw.readTransaction?.bind(this.raw) ?? this.raw.transaction.bind(this.raw);
        return await snapshot(async () => {
          await this.aligned();
          return operation();
        });
      } catch (error) {
        if (!(error instanceof ProjectionMoved)) throw error;
      }
    }
  }
  prepare(sql: string) {
    const statement = this.raw.prepare(sql);
    let canonical: boolean | undefined;
    let readOnly: boolean | undefined;
    const perform = <T>(operation: () => Promise<T>): Promise<T> => {
      if (!this.active() || this.raw.transactionActive) return operation();
      // Most statements run only inside their owner's transaction. Classify
      // lazily so preparing them does not add work to that already fenced path.
      if (!(canonical ??= this.touchesCanonicalTables(sql))) return operation();
      readOnly ??=
        /^\s*(?:SELECT|WITH)\b/i.test(sql) &&
        !/\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|LOCK)\b/i.test(sql);
      return readOnly ? this.readTransaction(operation) : this.transaction(operation);
    };
    return {
      get: (...params: unknown[]) => perform(() => statement.get(...params)),
      all: (...params: unknown[]) => perform(() => statement.all(...params)),
      run: (...params: unknown[]) => perform(() => statement.run(...params)),
    };
  }
  async exec(sql: string): Promise<void> {
    if (!this.active() || this.raw.transactionActive || !this.touchesCanonicalTables(sql))
      return this.raw.exec(sql);
    await this.transaction(() => this.raw.exec(sql));
  }
  async close(): Promise<void> {
    try {
      await this.synchronizeProjection();
    } finally {
      await this.raw.close();
    }
  }
}
