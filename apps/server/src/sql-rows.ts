import type { SqlDatabase } from './store.js';

// PostgreSQL can accept larger binds than the portable SQLite floor. Keep the
// byte bound as well, so batching never creates an unbounded network payload.
export const parameterBatchLimit = (db: SqlDatabase) => (db.dialect === 'postgres' ? 10000 : 900);

/** Trusted repository identifiers only. Bound both bind count and encoded batch size
 * for SQLite portability and predictable PostgreSQL transaction/network work.
 */
export async function insertRows(db: SqlDatabase, table: string, rows: unknown[][], conflict = '') {
  for (let offset = 0; offset < rows.length; ) {
    const batch: unknown[][] = [];
    let parameters = 0,
      bytes = 0;
    while (offset < rows.length) {
      const row = rows[offset]!;
      const size = Buffer.byteLength(JSON.stringify(row));
      if (
        batch.length &&
        (parameters + row.length > parameterBatchLimit(db) || bytes + size > 262144)
      )
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
