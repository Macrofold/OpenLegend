import { parameterBatchLimit, SqlWriteBatch } from './sql-rows.js';
import type { SqlDatabase } from './store.js';
import { gaugeMetric, timed, beginTiming, elapsedTiming, profilingEnabled } from './performance.js';

type Table = 'mind_source_versions' | 'history_events' | 'history_perspectives';
const TABLES: readonly Table[] = ['mind_source_versions', 'history_events', 'history_perspectives'];
const MAX_PARAMETER_BYTES = 262144;

/** Bound construction, not just the eventual SQL. Flush source rows before their dependent
 * rows, inside the caller's existing transaction. An oversize singleton retains prior behavior.
 * docs/performance.md#compact-transactional-persistence
 */
export class HistoryBatch {
  private rows: Record<Table, unknown[][]> = {
    mind_source_versions: [],
    history_events: [],
    history_perspectives: [],
  };
  private parameters: Record<Table, number> = {
    mind_source_versions: 0,
    history_events: 0,
    history_perspectives: 0,
  };
  private bytes = 0;
  private peakBytes = 0;
  writeMilliseconds = 0;
  insertedEvents = 0;
  constructor(private readonly db: SqlDatabase) {}

  add(table: Table, row: unknown[]): Promise<void> | undefined {
    // Count encoded parameter bytes once; do not JSON-encode already encoded JSON again.
    const size = row.reduce<number>(
      (n, value) =>
        n +
        (typeof value === 'string'
          ? Buffer.byteLength(value)
          : Array.isArray(value)
            ? Buffer.byteLength(JSON.stringify(value))
            : 16),
      0,
    );
    const append = () => {
      this.rows[table].push(row);
      this.parameters[table] += row.length;
      this.bytes += size;
      if (profilingEnabled()) this.peakBytes = Math.max(this.peakBytes, this.bytes);
    };
    if (
      this.bytes &&
      (this.bytes + size > MAX_PARAMETER_BYTES ||
        this.parameters[table] + row.length > parameterBatchLimit)
    )
      return this.flush().then(append);
    append();
  }

  /** Supply totals only at the single final flush: its delta includes all earlier
   * intermediate inserts, whose count is cumulative for this history projection. */
  async flush(
    total?: { worldId: string; removedEvents: number },
    sharedWrites?: SqlWriteBatch,
  ): Promise<void> {
    const delta =
      this.insertedEvents + this.rows.history_events.length - (total?.removedEvents ?? 0);
    if (!this.bytes && (!total || !delta)) return;
    const started = beginTiming();
    try {
      await timed('history.write', async () => {
        const writes = sharedWrites ?? new SqlWriteBatch(this.db);
        for (const table of TABLES) {
          const rows = this.rows[table];
          if (!rows.length) continue;
          await writes.add(
            table,
            `INSERT INTO ${table} VALUES ${rows.map((row) => `(${row.map(() => '?').join(',')})`).join(',')}${table === 'mind_source_versions' ? ' ON CONFLICT DO NOTHING' : ''}`,
            rows.flat(),
          );
          if (table === 'history_events') this.insertedEvents += rows.length;
          this.rows[table] = [];
          this.parameters[table] = 0;
        }
        if (total && delta)
          await writes.add(
            'history_totals',
            'UPDATE history_totals SET event_count=event_count+? WHERE world_id=? RETURNING event_count',
            [delta, total.worldId],
            { rows: 1, message: 'Retained history count is missing; commit refused.' },
          );
        // Only the final batch can be handed to the transaction's canonical writer.
        // Its caller must flush before a dependent history consumer or source read.
        if (!sharedWrites) await writes.flush();
      });
      this.bytes = 0;
      gaugeMetric('history.peakParameterBytes', this.peakBytes);
    } finally {
      const elapsed = elapsedTiming(started);
      if (elapsed !== undefined) this.writeMilliseconds += elapsed;
    }
  }
}
