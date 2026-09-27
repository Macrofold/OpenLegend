import { resolve } from 'node:path';
import { readConfig } from '../apps/server/src/config.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { writeOperationalBackup } from '../apps/server/src/operational-backup.js';
const destination = process.argv[2];
if (!destination)
  throw new Error(
    'Usage: backup-world.ts NEW_BACKUP_DIRECTORY. Stop the server first; existing destinations are never replaced.',
  );
const config = readConfig();
const db = new PostgresDatabase(config.databaseUrl, true);
try {
  await writeOperationalBackup(db, config.dataDirectory, resolve(destination));
  console.log(
    'Atomic backup published: gameplay, external accounting/privacy, and retained save files. Source opened read-only.',
  );
} finally {
  await db.close();
}
