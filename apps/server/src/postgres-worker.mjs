import { parentPort, workerData } from 'node:worker_threads';
import pg from 'pg';
const client = new pg.Client({
  connectionString: workerData.connectionString,
  connectionTimeoutMillis: 5000,
  statement_timeout: 5000,
});
let failure;
try {
  await client.connect();
  const lock = await client.query('SELECT pg_try_advisory_lock(187114, 1) AS acquired');
  if (!lock.rows[0].acquired) throw new Error('Another Open Legend writer owns this database.');
  await client.query(
    'CREATE SCHEMA IF NOT EXISTS open_legend; SET search_path TO open_legend; CREATE SCHEMA IF NOT EXISTS mind',
  );
} catch {
  failure = 'PostgreSQL unavailable or another writer owns this database.';
}
client.on('error', () => {
  failure = 'PostgreSQL connection lost; restart and reconcile pending writes.';
});
parentPort.on('message', async ({ sql, params, shared }) => {
  const header = new Int32Array(shared, 0, 2);
  const bytes = new Uint8Array(shared, 8);
  let value;
  try {
    if (failure) throw new Error(failure);
    const result = await client.query(sql, params);
    value = { rows: result.rows ?? [], changes: result.rowCount ?? 0 };
  } catch (error) {
    value = { error: error.code ? `PostgreSQL operation failed (${error.code}).` : error.message };
  }
  let output = Buffer.from(JSON.stringify(value));
  if (output.length > bytes.length)
    output = Buffer.from(
      JSON.stringify({ error: 'PostgreSQL result exceeds the bounded bridge buffer.' }),
    );
  bytes.set(output);
  Atomics.store(header, 1, output.length);
  Atomics.store(header, 0, 1);
  Atomics.notify(header, 0);
});
