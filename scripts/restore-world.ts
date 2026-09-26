import {
  MEMORY_HISTORY_TABLES,
  MEMORY_CACHE_TABLES,
} from '../apps/server/src/memory-repository.js';
import { HISTORY_TABLES } from '../apps/server/src/history.js';
import { randomUUID } from 'node:crypto';
import { COMMAND_TABLES, type CommandEpoch } from '../apps/server/src/command-receipts.js';
import { retainHotEvents } from '../apps/server/src/hot-events.js';
import type { WorldEvent } from '@open-legend/domain';
import { readFileSync } from 'node:fs';
import { readConfig } from '../apps/server/src/config.js';
import {
  SqliteStore,
  digest,
  ACCOUNTING_TABLES,
  BACKUP_FORMAT,
  type SavedWorld,
} from '../apps/server/src/store.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { migrateActors, migrateCognition, forgetExperience } from '@open-legend/domain';
import { upgradeWorldState } from '../apps/server/src/upgrade-world.js';
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
  backup.version !== BACKUP_FORMAT ||
  ACCOUNTING_TABLES.some((table) => !Array.isArray(backup.tables?.[table])) ||
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
  upgradeWorldState(state.world);
  const fenceCommands = async () => {
    const key = `command-epoch:${state.world.id}`;
    const epoch = (await store.getIntegration(key)) as CommandEpoch | undefined;
    await store.putIntegration(key, {
      generation: (epoch?.generation ?? 0) + 1,
      openedAt: Date.now(),
      token: randomUUID(),
    });
  };
  const archived = (backup.tables['history_events'] ?? []).filter(
    (row) => row['world_id'] === state.world.id,
  );
  if (
    state.world.archivedEventCount &&
    archived.length !== state.world.archivedEventCount + state.world.events.length
  )
    throw new Error('Backup is missing archived history; full restore refused.');
  if (current && state.world.id !== current.state.world.id)
    throw new Error('World identity mismatch.');
  if (!current) {
    const tables = [
      'jobs',
      ...ACCOUNTING_TABLES,
      'intelligence_calls',
      'player_profiles',
      'game_saves',
      ...COMMAND_TABLES,
      ...MEMORY_HISTORY_TABLES,
      'memory_index_attempts',
      ...MEMORY_CACHE_TABLES,
      ...HISTORY_TABLES,
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
      await store.db.prepare('DELETE FROM meta WHERE key=?').run('integration:world-journal-head');
      migrateActors(state.world);
      migrateCognition(state.world);
      state.manuallyPaused = true;
      state.world.paused = true;
      await fenceCommands();
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
    const before = {
      ...current.state.world,
      events: await store.history.allEvents(state.world.id),
    };
    const hotIds = new Set(state.world.events.map((event) => event.id));
    const after = state.world.archivedEventCount
      ? {
          ...state.world,
          events: [
            ...archived
              .map((row) => JSON.parse(String(row['payload'])) as WorldEvent)
              .filter((event) => !hotIds.has(event.id)),
            ...state.world.events,
          ].sort((a, b) => (a.order ?? a.sequence) - (b.order ?? b.sequence)),
          archivedEventCount: 0,
        }
      : state.world;
    state.world = retainHotEvents(after);
    await store.db.transaction(async () => {
      for (const row of backup.tables['memory_vector_cache'] ?? []) {
        if (row['world_id'] !== state.world.id)
          throw new Error('Backup vector cache belongs to another world.');
        await store.db
          .prepare('INSERT INTO memory_vector_cache VALUES (?,?,?,?,?,?,?) ON CONFLICT DO NOTHING')
          .run(
            ...[
              'world_id',
              'actor_id',
              'source_id',
              'source_revision',
              'model',
              'dimensions',
              'embedding',
            ].map((key) => row[key]),
          );
      }
      for (const row of backup.tables['gameplay_receipts'] ?? [])
        await store.db
          .prepare('INSERT INTO gameplay_receipts VALUES (?,?,?,?,?) ON CONFLICT DO NOTHING')
          .run(row['world_id'], row['id'], row['epoch'], row['expires_at'], row['payload']);
      await fenceCommands();
      // Use the normal restore contract so timeline and vector publication are fenced.
      const epoch = (await store.getIntegration(`command-epoch:${state.world.id}`)) as CommandEpoch;
      const payload = {
        format: 'backup',
        state,
        history: Object.fromEntries(
          HISTORY_TABLES.map((table) => [table, backup.tables[table] ?? []]),
        ) as import('../apps/server/src/game-saves.js').SavePayload['history'],
        memory: Object.fromEntries(
          MEMORY_HISTORY_TABLES.map((table) => [table, backup.tables[table] ?? []]),
        ) as NonNullable<import('../apps/server/src/game-saves.js').SavePayload['memory']>,
      };
      await store.commit(current!.revision, state, undefined, undefined, {
        before,
        after,
        restore: { id: 'backup', requestId: randomUUID(), payload, epoch, timeline: randomUUID() },
      });
    });
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
