import { HISTORY_TABLES } from '../apps/server/src/history.js';
import { COMMAND_TABLES } from '../apps/server/src/command-receipts.js';
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import {
  SqliteStore,
  digest,
  applyWorldChanges,
  type SavedWorld,
  type WorldChanges,
} from '../apps/server/src/store.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { migrateActors, migrateCognition } from '@open-legend/domain';
const [source, destination] = process.argv.slice(2);
if (!source || !destination || !process.env['OPEN_LEGEND_DATABASE_URL'])
  throw new Error(
    'Usage: import-postgres.ts SOURCE_SQLITE BACKUP_JSON with OPEN_LEGEND_DATABASE_URL; stop the server first.',
  );
const sqlite = new DatabaseSync(resolve(source), { readOnly: true });
sqlite.exec('BEGIN');
const tables = [
  'world',
  'jobs',
  'attempts',
  'intelligence_calls',
  'meta',
  'player_profiles',
  'game_saves',
  ...['attempt_scopes', ...HISTORY_TABLES, ...COMMAND_TABLES].filter((name) =>
    sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name),
  ),
] as const;
const data = Object.fromEntries(
  tables.map((name) => [name, sqlite.prepare(`SELECT * FROM ${name}`).all()]),
);
if (data.world?.length !== 1) throw new Error('Source must contain exactly one saved world.');
// Export a compact snapshot of the latest durable revision, including the journal.
if (
  sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'world_journal'")
    .get()
) {
  const row = data.world[0]!;
  let state = JSON.parse(String(row['payload'])) as SavedWorld;
  let revision = Number(row['revision']);
  for (const entry of sqlite
    .prepare('SELECT * FROM world_journal WHERE revision > ? ORDER BY revision')
    .all(revision)) {
    if (Number(entry['revision']) !== revision + 1)
      throw new Error('Source journal has a revision gap.');
    state = applyWorldChanges(state, JSON.parse(String(entry['payload'])) as WorldChanges);
    revision = Number(entry['revision']);
  }
  row['payload'] = JSON.stringify(state);
  row['revision'] = revision;
}
const savedHead = data.meta?.find((row) => row['key'] === 'world-journal-head');
if (
  savedHead &&
  Number(JSON.parse(String(savedHead['value']))) !== Number(data.world[0]!['revision'])
)
  throw new Error('Source journal head mismatch; import refused.');
writeFileSync(
  resolve(destination),
  JSON.stringify({ version: 1, digest: digest(data), tables: data }),
  { flag: 'wx', mode: 0o600 },
);
sqlite.exec('COMMIT');
sqlite.close();
const db = new PostgresDatabase(process.env['OPEN_LEGEND_DATABASE_URL']);
const target = new SqliteStore(':memory:', db);
try {
  await target.ready;
  if (await target.load()) throw new Error('Destination already has a world. Import refused.');
  for (const table of [
    'jobs',
    'attempts',
    'intelligence_calls',
    'player_profiles',
    'game_saves',
    ...['attempt_scopes', ...HISTORY_TABLES, ...COMMAND_TABLES],
  ])
    if (Number((await db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get())?.['count']))
      throw new Error('Destination has existing accounting or profiles; import refused.');
  await db.exec('BEGIN');
  for (const table of tables) {
    await db.exec(`DELETE FROM ${table}`);
    for (const row of data[table]!) {
      const columns = Object.keys(row);
      await db
        .prepare(
          `INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
        )
        .run(...Object.values(row));
    }
    const total = await db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get();
    if (Number(total?.['count']) !== data[table]!.length) throw new Error('Import count mismatch.');
  }
  for (const table of tables.filter((name) => name !== 'world')) {
    const rows = await db.prepare(`SELECT * FROM ${table}`).all();
    const normalized = (values: Record<string, unknown>[]) =>
      values
        .map((row) =>
          JSON.stringify(
            Object.fromEntries(
              Object.entries(row)
                .map(
                  ([key, value]) =>
                    [
                      key,
                      [
                        'revision',
                        'created_at',
                        'reserved',
                        'spent',
                        'position',
                        'show_unavailable_actions',
                        'pause_when_hidden',
                        'epoch',
                        'expires_at',
                      ].includes(key)
                        ? Number(value)
                        : value,
                    ] as const,
                )
                .sort(([a], [b]) => a.localeCompare(b)),
            ),
          ),
        )
        .sort();
    if (digest(normalized(rows)) !== digest(normalized(data[table]!)))
      throw new Error(`Imported ${table} digest mismatch.`);
  }
  const preserved = JSON.parse(String(data.world![0]!['payload'])) as SavedWorld;
  const imported = structuredClone(preserved);
  migrateActors(imported.world);
  migrateCognition(imported.world);
  const revision = Number(data.world![0]!['revision']);
  if (!(await target.getIntegration(`legacy-backup:${imported.world.id}`)))
    await target.putIntegration(`legacy-backup:${imported.world.id}`, {
      revision,
      state: preserved,
    });
  await db
    .prepare('UPDATE world SET revision = ?, payload = ? WHERE id = 1')
    .run(revision + 1, JSON.stringify(imported));
  for (const [actorId, inner] of Object.entries(imported.world.innerWorlds ?? {}))
    await db
      .prepare('INSERT INTO mind.inner_world VALUES (?, ?, ?, ?, ?, ?)')
      .run(
        imported.world.id,
        actorId,
        inner.revision,
        inner.text,
        inner.sourceSnapshot,
        inner.publicationJobId,
      );
  await target.putIntegration('world-journal-head', revision + 1);
  const loaded = (await target.load())!;
  if (digest(loaded.state) !== digest(imported)) throw new Error('Imported world digest mismatch.');
  await target.recoverInterruptedWork();
  await db.exec('COMMIT');
  console.log(
    'Imported preserved snapshot, jobs, usage, profiles and integration records. Original SQLite and exclusive backup remain unchanged.',
  );
} catch (error) {
  try {
    await db.exec('ROLLBACK');
  } catch {}
  throw error;
} finally {
  await target.close();
}
