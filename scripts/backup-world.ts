import { resolve, dirname } from 'node:path';
import { readConfig } from '../apps/server/src/config.js';
import { SqliteDatabase } from '../apps/server/src/sqlite-database.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { writeOperationalBackup } from '../apps/server/src/operational-backup.js';
const destination = process.argv[2];
if (!destination)
  throw new Error(
    'Usage: backup-world.ts NEW_BACKUP_DIRECTORY. Stop the server first; existing destinations are never replaced.',
  );
const config = readConfig();
const db = config.databaseUrl
  ? new PostgresDatabase(config.databaseUrl, true)
  : new SqliteDatabase(config.databasePath, true);
try {
  await writeOperationalBackup(db, dirname(config.databasePath), resolve(destination));
  console.log(
    'Atomic backup published: gameplay, external accounting/privacy, and retained save files. Source opened read-only.',
  );
} finally {
  await db.close();
}
