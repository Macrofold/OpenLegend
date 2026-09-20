import { writeFileSync } from 'node:fs';
import { readConfig } from '../apps/server/src/config.js';
import { SqliteStore, digest } from '../apps/server/src/store.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
const destination = process.argv[2];
if (!destination) throw new Error('Usage: backup-world.ts BACKUP_JSON. Stop the server first.');
const config = readConfig();
const store = new SqliteStore(
  config.databasePath,
  config.databaseUrl ? new PostgresDatabase(config.databaseUrl) : undefined,
);
try {
  store.db.exec('BEGIN IMMEDIATE');
  const tables = Object.fromEntries(
    ['world', 'jobs', 'attempts', 'intelligence_calls', 'meta', 'player_profiles'].map((name) => [
      name,
      store.db.prepare(`SELECT * FROM ${name}`).all(),
    ]),
  );
  writeFileSync(destination, JSON.stringify({ version: 1, digest: digest(tables), tables }), {
    flag: 'wx',
    mode: 0o600,
  });
  store.db.exec('COMMIT');
  console.log('Consistent world, spending, integration and forgetting backup written.');
} catch (error) {
  try {
    store.db.exec('ROLLBACK');
  } catch {}
  throw error;
} finally {
  store.close();
}
