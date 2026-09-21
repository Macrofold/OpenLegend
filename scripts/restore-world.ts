import { HISTORY_TABLES } from '../apps/server/src/history.js';
import { readFileSync } from 'node:fs';
import { readConfig } from '../apps/server/src/config.js';
import { SqliteStore, digest, type SavedWorld } from '../apps/server/src/store.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { migrateActors, migrateCognition, forgetExperience } from '@open-legend/domain';
const file = process.argv[2];
if (!file)
  throw new Error(
    'Usage: restore-world.ts BACKUP_JSON. Stop the server first. This restores world state while preserving current paid attempts and forgetting records.',
  );
const backup = JSON.parse(readFileSync(file, 'utf8')) as {
  version: number;
  digest: string;
  tables: Record<string, Record<string, unknown>[]> & { world: { payload: string }[] };
};
if (
  backup.version !== 1 ||
  digest(backup.tables) !== backup.digest ||
  backup.tables.world.length !== 1
)
  throw new Error('Invalid backup envelope or checksum.');
const config = readConfig();
const store = new SqliteStore(
  config.databasePath,
  config.databaseUrl ? new PostgresDatabase(config.databaseUrl) : undefined,
);
try {
  let current = await store.load();
  const state = JSON.parse(backup.tables.world[0]!.payload) as SavedWorld;
  if (current && state.world.id !== current.state.world.id)
    throw new Error('World identity mismatch.');
  if (!current) {
    const tables = [
      'jobs',
      'attempts',
      'intelligence_calls',
      'player_profiles',
      ...['attempt_scopes', ...HISTORY_TABLES],
    ];
    for (const table of tables)
      if (
        Number((await store.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get())?.['count'])
      )
        throw new Error('Target is not empty; full restore refused.');
    await store.db.transaction(async () => {
      for (const table of [...tables, 'meta']) {
        for (const row of backup.tables[table] ?? []) {
          const columns = Object.keys(row);
          if (!columns.length || columns.some((key) => !/^[a-z_]+$/.test(key)))
            throw new Error('Invalid backup columns.');
          await store.db
            .prepare(
              `INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')}) ON CONFLICT DO NOTHING`,
            )
            .run(...Object.values(row));
        }
      }
      // Keep restored story identities/revisions; projection fills only missing or changed sources.
      await store.db.prepare('DELETE FROM meta WHERE key=?').run('world-journal-head');
      migrateActors(state.world);
      migrateCognition(state.world);
      state.manuallyPaused = true;
      state.world.paused = true;
      await store.commit(0, state);
    });
    current = await store.load();
    if (!current || digest(current.state) !== digest(state))
      throw new Error('Restored world recovery digest mismatch.');
    await store.recoverInterruptedWork();
    console.log(
      'Full backup restored into an empty target; identities, jobs and accounting retained.',
    );
  } else {
    migrateActors(state.world);
    migrateCognition(state.world);
    const ledger = (await store.getIntegration(`forget-ledger:${state.world.id}`)) as
      | Record<string, string[]>
      | undefined;
    for (const [actorId, ids] of Object.entries(ledger ?? {}))
      for (const id of ids) state.world = forgetExperience(state.world, actorId, id).world;
    await store.putIntegration(`pre-restore:${current.revision}`, current);
    state.manuallyPaused = true;
    state.world.paused = true;
    await store.commit(current.revision, state);
    for (const actorId of Object.keys(state.world.entities)) {
      await store.putIntegration(`vectors:${state.world.id}:${actorId}`, null);
      await store.putIntegration(`interests:${state.world.id}:${actorId}`, null);
    }
    await store.recoverInterruptedWork();
    const recovered = await store.load();
    if (!recovered || digest(recovered.state) !== digest(state))
      throw new Error('Restore recovery digest mismatch.');
    console.log('World restored paused; present-day spending and forgetting retained.');
  }
} finally {
  await store.close();
}
