import type { SqlDatabase } from './store.js';
import { gaugeMetric, timed } from './performance.js';

type Table = 'history_events' | 'history_audiences' | 'history_perspectives';
const TABLES: readonly Table[] = ['history_events', 'history_audiences', 'history_perspectives'];
const MAX_PARAMETER_BYTES = 262144;
const MAX_PARAMETERS = 900;

/** Bound construction, not just the eventual SQL. Flush source rows before their dependent
 * rows, inside the caller's existing transaction. An oversize singleton retains prior behavior.
 * docs/performance.md#compact-transactional-persistence
 */
export class HistoryBatch {
  private rows: Record<Table, unknown[][]> = {
    history_events: [],
    history_audiences: [],
    history_perspectives: [],
  };
  private parameters: Record<Table, number> = {
    history_events: 0,
    history_audiences: 0,
    history_perspectives: 0,
  };
  private bytes = 0;
  private peakBytes = 0;
  writeMilliseconds = 0;
  constructor(private readonly db: SqlDatabase) {}

  add(table: Table, row: unknown[]): Promise<void> | undefined {
    // Count encoded parameter bytes once; do not JSON-encode already encoded JSON again.
    const size = row.reduce<number>(
      (n, value) => n + (typeof value === 'string' ? Buffer.byteLength(value) : 16),
      0,
    );
    const append = () => {
      this.rows[table].push(row);
      this.parameters[table] += row.length;
      this.bytes += size;
      this.peakBytes = Math.max(this.peakBytes, this.bytes);
    };
    if (
      this.bytes &&
      (this.bytes + size > MAX_PARAMETER_BYTES ||
        this.parameters[table] + row.length > MAX_PARAMETERS)
    )
      return this.flush().then(append);
    append();
  }

  async flush(): Promise<void> {
    if (!this.bytes) return;
    const started = performance.now();
    try {
      for (const table of TABLES) {
        const rows = this.rows[table];
        if (!rows.length) continue;
        await timed('history.write', () =>
          this.db
            .prepare(
              `INSERT INTO ${table} VALUES ${rows.map((row) => `(${row.map(() => '?').join(',')})`).join(',')}`,
            )
            .run(...rows.flat()),
        );
        this.rows[table] = [];
        this.parameters[table] = 0;
      }
      this.bytes = 0;
      gaugeMetric('history.peakParameterBytes', this.peakBytes);
    } finally {
      this.writeMilliseconds += performance.now() - started;
    }
  }
}
