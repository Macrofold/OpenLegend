import { initializeCollisionRuntime } from '../packages/spatial/src/rapier.js';
import { MEMORY_HISTORY_TABLES } from '../apps/server/src/memory-repository.js';
import { HISTORY_TABLES } from '../apps/server/src/history.js';
import { randomUUID } from 'node:crypto';
import type { CommandEpoch } from '../apps/server/src/command-receipts.js';
import { retainHotEvents } from '../apps/server/src/hot-events.js';
import type { WorldEvent } from '@open-legend/domain';
import { statSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import {
  readOperationalBackup,
  restoreBackupSlots,
  BACKUP_TABLES,
} from '../apps/server/src/operational-backup.js';
import {
  beginRestoreAttempt,
  markRestoreInstalled,
  preexistingRestoreSlots,
  preflightRestoreDirectoryOwner,
  reconcileInterruptedRestores,
  reconcileRestoreAttempt,
  restoreDirectoryOwner,
  type RestoreAttempt,
} from '../apps/server/src/operational-restore-attempt.js';
import { recoveryFile, SAVE_FORMAT } from '../apps/server/src/game-saves.js';
import { GameSaves } from '../apps/server/src/game-saves.js';
import { readConfig } from '../apps/server/src/config.js';
import { DATABASE_SCHEMA, SqlGameRepository } from '../apps/server/src/store.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import { forgetExperience } from '@open-legend/domain';
import { validateCurrentWorldState } from '../apps/server/src/upgrade-world.js';
import { join } from 'node:path';
// Initialize native geometry before constructing or validating recovered world state.
await initializeCollisionRuntime();

const file = process.argv[2];
if (!file)
  throw new Error(
    'Usage: restore-world.ts BACKUP_DIRECTORY. Stop the server first. This restores world state while preserving current paid attempts and forgetting records.',
  );
if (!statSync(file).isDirectory())
  throw new Error(
    'Current-format backup directory required; legacy JSON is unsupported. Source retained.',
  );
const config = readConfig();
const database = new PostgresDatabase(config.databaseUrl);
try {
  await preflightRestoreDirectoryOwner(database, config.dataDirectory);
} catch (error) {
  await database.close();
  throw error;
}
const store = new SqlGameRepository(config.dataDirectory, database);
// Whether this attempt's database installation reached COMMIT (SB18).
// Mutated inside the transaction callback, so keep it in an object rather than a narrowed local.
const install: { state: 'not-committed' | 'uncertain' | 'committed' } = { state: 'not-committed' };
let keep = new Set<string>();
// The pre-restore recovery checkpoint this attempt published (existing-world restore only).
let recoveryId: string | undefined;
let attempt: RestoreAttempt | undefined;
try {
  await store.ready;
  const backup = await readOperationalBackup(file, store.db);
  let current = await store.load();
  const state = backup.state;
  validateCurrentWorldState(state.world);
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
  const directoryOwner = await restoreDirectoryOwner(store, config.dataDirectory, state.world.id);
  const priorAttempts = await reconcileInterruptedRestores(store, config.dataDirectory);
  for (const prior of priorAttempts)
    console.error(
      `Prior restore ${prior.id}: ${prior.committed ? 'installation committed' : `${prior.removed.length} owned slot(s) removed`}${prior.retained.length ? `; kept ${prior.retained.join(', ')} for inspection` : ''}.`,
    );
  if (!current) {
    const tables = BACKUP_TABLES.filter((table) => table !== 'meta');
    for (const table of tables)
      if (
        Number((await store.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get())?.['count'])
      )
        throw new Error('Target is not empty; full restore refused.');
    if (
      await store.db
        .prepare(
          "SELECT key FROM meta WHERE key NOT IN ('schema','integration:save-directory-owner') LIMIT 1",
        )
        .get()
    )
      throw new Error('Target has existing operational metadata; full restore refused.');
    attempt = await beginRestoreAttempt(config.dataDirectory, {
      directoryOwner,
      worldId: state.world.id,
      startingRevision: null,
      saves: backup.saves ?? [],
      preexisting: await preexistingRestoreSlots(config.dataDirectory, backup.saves ?? []),
    });
    await restoreBackupSlots(backup, config.dataDirectory, attempt.id);
    await store.db.transaction(async () => {
      for (const table of [...tables, 'meta']) {
        for (const row of backup.tables[table] ?? []) {
          const columns = Object.keys(row);
          if (!columns.length || columns.some((key) => !/^[a-z_]+$/.test(key)))
            throw new Error('Invalid backup columns.');
          if (table === 'meta' && row['key'] === 'schema') {
            // The writer owns the current database format; older backups are refused.
            if (String(row['value']) !== DATABASE_SCHEMA)
              throw new Error('Unsupported backup schema.');
            continue;
          }
          // Filesystem ownership and interrupted-restore markers belong to the target,
          // not to the source database included in the operational backup.
          if (
            table === 'meta' &&
            (row['key'] === 'integration:save-directory-owner' ||
              String(row['key']).startsWith('integration:restore-attempt:'))
          )
            continue;
          await store.db
            .prepare(
              `INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
            )
            .run(...Object.values(row));
        }
      }
      // Keep restored story identities/revisions; projection fills only missing or changed sources.
      await store.db.prepare('DELETE FROM meta WHERE key=?').run('integration:world-journal-head');
      validateCurrentWorldState(state.world);
      state.manuallyPaused = true;
      state.world.paused = true;
      await fenceCommands();
      await store.commit(0, state);
      await markRestoreInstalled(store, attempt!);
      install.state = 'uncertain';
    });
    install.state = 'committed';
    current = await store.load();
    if (!current || !isDeepStrictEqual(current.state, state))
      throw new Error('Restored world recovery digest mismatch.');
    await store.recoverInterruptedWork();
    console.log(
      'Full backup restored into an empty target; identities, jobs and accounting retained.',
    );
  } else {
    // A retained slot the target's current recovery pointer names is never removed.
    const pointer = await store.db
      .prepare("SELECT payload,checksum FROM game_saves WHERE world_id=? AND id='before-load'")
      .get(state.world.id);
    let referenced: string | undefined;
    try {
      referenced = pointer
        ? recoveryFile(JSON.parse(String(pointer['payload'])), pointer['checksum'])
        : undefined;
    } catch {
      // The restore replaces a damaged pointer; there is simply no slot to protect.
      console.error('The target recovery pointer is damaged; it will be replaced by this restore.');
    }
    if (referenced) keep = new Set([referenced]);
    recoveryId = randomUUID();
    attempt = await beginRestoreAttempt(config.dataDirectory, {
      directoryOwner,
      worldId: state.world.id,
      startingRevision: current.revision,
      saves: backup.saves ?? [],
      preexisting: await preexistingRestoreSlots(config.dataDirectory, backup.saves ?? []),
      recoveryId,
    });
    await restoreBackupSlots(backup, config.dataDirectory, attempt.id, keep);
    validateCurrentWorldState(state.world);
    await store.authority.restoreBindings(state.world);
    const ledger = (await store.getIntegration(`forget-ledger:${state.world.id}`)) as
      | Record<string, string[]>
      | undefined;
    for (const [actorId, ids] of Object.entries(ledger ?? {}))
      for (const id of ids) state.world = forgetExperience(state.world, actorId, id).world;
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
    // Preserve the world being replaced before the installation transaction, as gameplay loads
    // do (SL09-A); a failed install can then remove exactly this file (SB18).
    const recovery = new GameSaves(
      store.db,
      join(config.dataDirectory, 'saves'),
      undefined,
      attempt.id,
    );
    await recovery.create(current.state, 'Before last load', recoveryId, {
      kind: 'recovery',
      expectedRevision: current.revision,
    });
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
        // The backup's gameplay checkpoint is a current-format save package.
        format: SAVE_FORMAT,
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
        restore: {
          id: 'backup',
          requestId: randomUUID(),
          payload,
          epoch,
          timeline: randomUUID(),
          recoveryId: recoveryId!,
        },
      });
      await markRestoreInstalled(store, attempt!);
      install.state = 'uncertain';
    });
    install.state = 'committed';
    for (const actorId of Object.keys(state.world.entities)) {
      await store.putIntegration(`vectors:${state.world.id}:${actorId}`, null);
      await store.putIntegration(`interests:${state.world.id}:${actorId}`, null);
    }
    await store.recoverInterruptedWork();
    const recovered = await store.load();
    if (!recovered || !isDeepStrictEqual(recovered.state, state))
      throw new Error('Restore recovery digest mismatch.');
    console.log('World restored paused; present-day spending and forgetting retained.');
  }
  if (attempt && !(await reconcileRestoreAttempt(store, config.dataDirectory, attempt)).committed)
    throw new Error('Restore installation marker is missing after commit.');
} catch (error) {
  // The journal also identifies slots published before restoreBackupSlots could return.
  if (attempt && install.state === 'not-committed') {
    try {
      const result = await reconcileRestoreAttempt(store, config.dataDirectory, attempt);
      console.error(
        `Restore failed before its database commit; removed ${result.removed.length} attempt-owned slot(s)${result.retained.length ? `, kept ${result.retained.join(', ')} for inspection` : ''}. The source backup is unchanged.`,
      );
    } catch (cleanupError) {
      console.error(`Restore files kept for inspection: ${String(cleanupError)}`);
    }
  } else if (attempt && install.state === 'uncertain')
    console.error(
      `Restore commit outcome is uncertain; attempt ${attempt.id} and its files were kept. Retry the restore command to reconcile the database marker before installation.`,
    );
  throw error;
} finally {
  await store.close();
}
