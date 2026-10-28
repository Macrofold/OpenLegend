import type { SqlDatabase } from './store.js';
import { countMetric, gaugeMetric } from './performance.js';
import { toUSVString } from 'node:util';

// Bound PostgreSQL parameters and bytes so a batch cannot grow without limit.
export const parameterBatchLimit = 10000;

/** A writer explicitly supplies independent, parameterized writes. PostgreSQL executes
 * sibling data-modifying CTEs against one snapshot, in unspecified order: never put
 * reads, cascaded deletes, or two writes to one table in the same group. Foreign keys
 * check the completed statement, so new parents and children may share a group.
 * Flush before dependent reads/deletes. No deferred promise escapes the caller's turn.
 * docs/performance.md#storage-execution
 */
export class SqlWriteBatch {
  private writes: string[] = [];
  private params: unknown[] = [];
  private checks: { index: number; rows: number; message: string }[] = [];
  private tables = new Set<string>();
  private bytes = 0;
  constructor(private readonly db: SqlDatabase) {}

  async add(
    table: string,
    sql: string,
    params: unknown[],
    check?: { rows: number; message: string },
  ): Promise<void> {
    const bytes =
      Buffer.byteLength(sql) +
      params.reduce<number>(
        (sum, value) =>
          sum +
          (typeof value === 'string'
            ? Buffer.byteLength(value)
            : Array.isArray(value)
              ? Buffer.byteLength(JSON.stringify(value))
              : 16),
        0,
      );
    if (
      this.writes.length &&
      (this.tables.has(table) ||
        this.writes.length >= 64 ||
        this.params.length + params.length > parameterBatchLimit ||
        this.bytes + bytes > 262144)
    )
      await this.flush();
    if (check) this.checks.push({ index: this.writes.length, ...check });
    this.writes.push(sql);
    this.params.push(...params);
    this.tables.add(table);
    this.bytes += bytes;
    if (!this.db.writeGroups) await this.flush();
  }

  async flush(): Promise<void> {
    if (!this.writes.length) return;
    countMetric('persistence.writeStatements', this.writes.length);
    countMetric('persistence.writeRoundTrips');
    gaugeMetric('persistence.writeGroupBytes', this.bytes);
    if (this.writes.length === 1) {
      const statement = this.db.prepare(this.writes[0]!);
      const check = this.checks[0];
      if (check) {
        const rows = await statement.all(...this.params);
        if (rows.length !== check.rows) throw new Error(check.message);
      } else await statement.run(...this.params);
    } else {
      // Checked writes return only the explicit count needed by their owner.
      // The count is verified before any caller can use the grouped effects.
      const projection = this.checks.length
        ? this.checks
            .map(({ index }) => `(SELECT count(*) FROM write_${index}) AS check_${index}`)
            .join(',')
        : '1';
      const sql = `WITH ${this.writes.map((write, index) => `write_${index} AS (${write})`).join(',')} SELECT ${projection}`;
      const row = await this.db.prepare(sql).get(...this.params);
      for (const check of this.checks)
        if (Number(row?.[`check_${check.index}`]) !== check.rows) throw new Error(check.message);
    }
    this.writes = [];
    this.params = [];
    this.checks = [];
    this.tables.clear();
    this.bytes = 0;
  }
}

/** Trusted repository identifiers only. Bound both bind count and encoded batch size
 * for predictable PostgreSQL transaction/network work.
 */
export function* sqlRowBatches(rows: Iterable<unknown[]>): Generator<unknown[][]> {
  let batch: unknown[][] = [],
    parameters = 0,
    bytes = 0;
  for (const row of rows) {
    const size = Buffer.byteLength(JSON.stringify(row));
    if (batch.length && (parameters + row.length > parameterBatchLimit || bytes + size > 262144)) {
      yield batch;
      batch = [];
      parameters = 0;
      bytes = 0;
    }
    batch.push(row);
    parameters += row.length;
    bytes += size;
  }
  if (batch.length) yield batch;
}

/** Table-typed JSON transport shares exact value conversion and complete encoded-byte
 * accounting across canonical records and derived source inserts. Keep the original
 * bind-count row ceiling as well, even though each encoded batch uses one parameter. */
export function* sqlRecordBatches(
  columns: readonly string[],
  rows: Iterable<unknown[]>,
): Generator<string> {
  let batch: string[] = [],
    bytes = 2;
  // Only encoded text escapes; trusted fixed-column rows reuse one transport object.
  let record: Record<string, unknown> | undefined;
  for (const row of rows) {
    record ??= Object.fromEntries(columns.map((column) => [column, null]));
    for (let index = 0; index < columns.length; index++) {
      const value = row[index];
      // Match pg's text encoding before JSON would escape an isolated surrogate.
      record[columns[index]!] = typeof value === 'string' ? toUSVString(value) : (value ?? null);
    }
    const encoded = JSON.stringify(record);
    const size = Buffer.byteLength(encoded);
    if (
      batch.length &&
      ((batch.length + 1) * columns.length > parameterBatchLimit || bytes + size + 1 > 262144)
    ) {
      yield `[${batch.join(',')}]`;
      batch = [];
      bytes = 2;
    }
    bytes += size + (batch.length ? 1 : 0);
    batch.push(encoded);
  }
  if (batch.length) yield `[${batch.join(',')}]`;
}

export async function insertRows(
  db: SqlDatabase,
  table: string,
  rows: Iterable<unknown[]>,
  conflict = '',
) {
  for (const batch of sqlRowBatches(rows)) {
    await db
      .prepare(
        `INSERT INTO ${table} VALUES ${batch.map((row) => `(${row.map(() => '?').join(',')})`).join(',')} ${conflict}`,
      )
      .run(...batch.flat());
  }
}
