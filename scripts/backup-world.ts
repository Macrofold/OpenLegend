import { HISTORY_TABLES } from '../apps/server/src/history.js';
import { COMMAND_TABLES } from '../apps/server/src/command-receipts.js';
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
  await store.ready;
  await store.db.exec('BEGIN IMMEDIATE');
  const tables = Object.fromEntries(
    await Promise.all(
      [
        'world',
        'jobs',
        'attempts',
        'intelligence_calls',
        'meta',
        'player_profiles',
        'game_saves',
        ...COMMAND_TABLES,
        ...['attempt_scopes', ...HISTORY_TABLES],
      ].map(async (name) => [name, await store.db.prepare(`SELECT * FROM ${name}`).all()] as const),
    ),
  );
  const latest = await store.load();
  if (latest)
    tables['world'] = [{ id: 1, revision: latest.revision, payload: JSON.stringify(latest.state) }];
  writeFileSync(destination, JSON.stringify({ version: 1, digest: digest(tables), tables }), {
    flag: 'wx',
    mode: 0o600,
  });
  await store.db.exec('COMMIT');
  console.log('Consistent world, spending, integration and forgetting backup written.');
} catch (error) {
  try {
    await store.db.exec('ROLLBACK');
  } catch {}
  throw error;
} finally {
  await store.close();
}
