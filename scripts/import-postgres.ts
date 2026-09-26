import { WorldRecords } from '../apps/server/src/world-records.js';
import { SqliteDatabase } from '../apps/server/src/sqlite-database.js';
import { resolve, dirname } from 'node:path';
import {
  readOperationalBackup,
  writeOperationalBackup,
  restoreBackupSlots,
  type OperationalBackup,
  BACKUP_TABLES,
} from '../apps/server/src/operational-backup.js';
import { open, link, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { syncDirectory } from '../apps/server/src/save-files.js';
import { isDeepStrictEqual } from 'node:util';
import {
  SqliteStore,
  digest,
  applyWorldChanges,
  type SavedWorld,
  type WorldChanges,
} from '../apps/server/src/store.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { upgradeWorldState } from '../apps/server/src/upgrade-world.js';
import { migrateActors, migrateCognition } from '@open-legend/domain';

const [source, destination] = process.argv.slice(2);
if (!source || !destination || !process.env['OPEN_LEGEND_DATABASE_URL'])
  throw new Error(
    'Usage: import-postgres.ts SOURCE_SQLITE NEW_BACKUP_PATH with OPEN_LEGEND_DATABASE_URL; stop the server first.',
  );
const sqlite = new SqliteDatabase(resolve(source), true);
const auxiliary = BACKUP_TABLES;
let data: Record<string, Record<string, unknown>[]> = {};
let packageBackup: OperationalBackup | undefined;
let preserved: SavedWorld;
try {
  const canonical =
    (await sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='world_head'")
      .get()) && (await new WorldRecords(sqlite).head());
  if (canonical) {
    await writeOperationalBackup(sqlite, dirname(resolve(source)), resolve(destination));
    packageBackup = await readOperationalBackup(resolve(destination), sqlite);
    preserved = packageBackup.state;
    data = packageBackup.tables;
  } else {
    preserved = await sqlite.transaction(async () => {
      const present = new Set(
        (await sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()).map(
          (row) => String(row['name']),
        ),
      );
      for (const name of auxiliary)
        data[name] = present.has(name) ? await sqlite.prepare(`SELECT * FROM ${name}`).all() : [];
      let loaded = present.has('world_head') ? await new WorldRecords(sqlite).load() : null;
      if (!loaded) {
        const row = await sqlite.prepare('SELECT revision,payload FROM world WHERE id=1').get();
        if (!row) throw new Error('Source must contain one saved world.');
        loaded = {
          revision: Number(row['revision']),
          state: JSON.parse(String(row['payload'])) as SavedWorld,
        };
        if (present.has('world_journal'))
          for (const entry of await sqlite
            .prepare(
              'SELECT revision,payload FROM world_journal WHERE revision>? ORDER BY revision',
            )
            .all(loaded.revision)) {
            if (Number(entry['revision']) !== loaded.revision + 1)
              throw new Error('Source journal has a revision gap.');
            loaded.state = applyWorldChanges(
              loaded.state,
              JSON.parse(String(entry['payload'])) as WorldChanges,
            );
            loaded.revision = Number(entry['revision']);
          }
        const head = data['meta']?.find((row) => row['key'] === 'integration:world-journal-head');
        if (head && Number(JSON.parse(String(head['value']))) !== loaded.revision)
          throw new Error('Source journal head mismatch; import refused.');
      }
      const count = loaded.state.world.archivedEventCount ?? 0;
      if (count && data['history_events']?.length !== count + loaded.state.world.events.length)
        throw new Error('Source is missing archived history.');
      data['world'] = [{ id: 1, revision: loaded.revision, payload: JSON.stringify(loaded.state) }];
      return loaded.state;
    });
    const encoded = JSON.stringify({ version: 1, digest: digest(data), tables: data });
    if (Buffer.byteLength(encoded) > 64 * 1024 * 1024)
      throw new Error(
        'Legacy import backup exceeds 64 MiB; migrate a preserved source copy to canonical records first.',
      );
    const staging = `${resolve(destination)}.pending-${randomUUID()}`;
    const file = await open(staging, 'wx', 0o600);
    try {
      await file.writeFile(encoded);
      await file.sync();
      await file.close();
      await link(staging, resolve(destination));
      await syncDirectory(dirname(resolve(destination)));
    } finally {
      await file.close();
      await rm(staging, { force: true });
    }
  }
} finally {
  await sqlite.close();
}
const target = new SqliteStore(
  resolve(process.env['OPEN_LEGEND_DATA_DIR'] ?? '.data', 'world.sqlite'),
  new PostgresDatabase(process.env['OPEN_LEGEND_DATABASE_URL']),
);
try {
  await target.ready;
  if (await target.load()) throw new Error('Destination already has a world. Import refused.');
  for (const table of auxiliary.filter((name) => name !== 'meta'))
    if (
      Number((await target.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get())?.['count'])
    )
      throw new Error('Destination has existing accounting or profiles; import refused.');
  if (await target.db.prepare("SELECT key FROM meta WHERE key<>'schema' LIMIT 1").get())
    throw new Error('Destination has existing operational metadata; import refused.');
  if (packageBackup)
    await restoreBackupSlots(
      packageBackup,
      resolve(process.env['OPEN_LEGEND_DATA_DIR'] ?? '.data'),
    );
  const imported = structuredClone(preserved);
  upgradeWorldState(imported.world);
  migrateActors(imported.world);
  migrateCognition(imported.world);
  await target.db.transaction(async () => {
    for (const table of auxiliary) {
      // schema defaults may already exist; imported durable accounting wins only in this empty target.
      for (const row of data[table] ?? []) {
        const columns = Object.keys(row);
        if (columns.some((key) => !/^[a-z_]+$/.test(key)))
          throw new Error('Invalid source columns.');
        if (table === 'meta')
          await target.db.prepare('DELETE FROM meta WHERE key=?').run(row['key']);
        await target.db
          .prepare(
            `INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
          )
          .run(...Object.values(row));
      }
      // Check every copied column before migrations/projection deliberately change
      // any rows. PostgreSQL returns bigint as text; compare its exact decimal value.
      // Older source tables may lack additive columns whose target defaults are
      // valid migrations (for example pause_when_hidden). Verify the source columns.
      const sourceColumns = Object.keys(data[table]?.[0] ?? {}).sort();
      const fingerprint = (row: Record<string, unknown>) =>
        JSON.stringify(
          sourceColumns.map((key) => [key, row[key] === null ? null : String(row[key])]),
        );
      const expected = (data[table] ?? []).map(fingerprint).sort();
      const copied = (await target.db.prepare(`SELECT * FROM ${table}`).all())
        .map(fingerprint)
        .sort();
      if (
        table === 'meta'
          ? expected.some((row) => !copied.includes(row))
          : !isDeepStrictEqual(expected, copied)
      )
        throw new Error(`Imported ${table} row coverage/content mismatch; import rolled back.`);
    }
    await target.db.prepare('DELETE FROM meta WHERE key=?').run('integration:world-journal-head');
    await target.commit(0, imported);
    const loaded = await target.records.load();
    if (!loaded || !isDeepStrictEqual(loaded.state, JSON.parse(JSON.stringify(imported))))
      throw new Error('Imported world recovery mismatch.');
  });
  await target.recoverInterruptedWork();
  console.log(
    'Imported independent gameplay records, source history, jobs, usage and profiles. Original SQLite and exclusive backup remain unchanged.',
  );
} finally {
  await target.close();
}
