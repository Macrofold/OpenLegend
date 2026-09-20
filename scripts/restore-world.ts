import { readFileSync } from 'node:fs';
import { readConfig } from '../apps/server/src/config.js';
import { SqliteStore, digest, type SavedWorld } from '../apps/server/src/store.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { migrateCognition, forgetExperience } from '@open-legend/domain';
const file = process.argv[2];
if (!file)
  throw new Error(
    'Usage: restore-world.ts BACKUP_JSON. Stop the server first. This restores world state while preserving current paid attempts and forgetting records.',
  );
const backup = JSON.parse(readFileSync(file, 'utf8')) as {
  version: number;
  digest: string;
  tables: { world: { payload: string }[] };
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
  const current = store.load();
  const state = JSON.parse(backup.tables.world[0]!.payload) as SavedWorld;
  if (!current || state.world.id !== current.state.world.id)
    throw new Error('World identity mismatch.');
  migrateCognition(state.world);
  const ledger = store.getIntegration(`forget-ledger:${state.world.id}`) as
    | Record<string, string[]>
    | undefined;
  for (const [actorId, ids] of Object.entries(ledger ?? {}))
    for (const id of ids) state.world = forgetExperience(state.world, actorId, id).world;
  store.putIntegration(`pre-restore:${current.revision}`, current);
  state.manuallyPaused = true;
  state.world.paused = true;
  store.commit(current.revision, state);
  for (const actorId of Object.keys(state.world.entities)) {
    store.putIntegration(`vectors:${state.world.id}:${actorId}`, null);
    store.putIntegration(`interests:${state.world.id}:${actorId}`, null);
  }
  store.recoverInterruptedWork();
  console.log('World restored paused; present-day spending and forgetting retained.');
} finally {
  store.close();
}
