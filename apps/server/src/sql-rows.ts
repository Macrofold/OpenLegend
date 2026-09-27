import type { SqlDatabase } from './store.js';

// Bound PostgreSQL parameters and bytes so a batch cannot grow without limit.
export const parameterBatchLimit = 10000;

/** Trusted repository identifiers only. Bound both bind count and encoded batch size
 * for predictable PostgreSQL transaction/network work.
 */
export async function insertRows(db: SqlDatabase, table: string, rows: unknown[][], conflict = '') {
  for (let offset = 0; offset < rows.length; ) {
    const batch: unknown[][] = [];
    let parameters = 0,
      bytes = 0;
    while (offset < rows.length) {
      const row = rows[offset]!;
      const size = Buffer.byteLength(JSON.stringify(row));
      if (batch.length && (parameters + row.length > parameterBatchLimit || bytes + size > 262144))
        break;
      batch.push(row);
      offset++;
      parameters += row.length;
      bytes += size;
    }
    await db
      .prepare(
        `INSERT INTO ${table} VALUES ${batch.map((row) => `(${row.map(() => '?').join(',')})`).join(',')} ${conflict}`,
      )
      .run(...batch.flat());
  }
}
