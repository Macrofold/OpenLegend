import { entityKeys } from '../packages/domain/src/index.js';
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
import { SaveFiles } from '../apps/server/src/save-files.js';
import { readConfig } from '../apps/server/src/config.js';
import { DATABASE_SCHEMA, SqlGameRepository } from '../apps/server/src/store.js';
import { PostgresDatabase } from '../apps/server/src/postgres.js';
import {
  reapplyExperiencePrivacy,
  beginTemporalReceiptEpoch,
  temporalPageMutation,
  updateWorld,
} from '@open-legend/domain';
import { privacyLedgerKey, readPrivacyLedger } from '../apps/server/src/privacy-ledger.js';
import { validateCurrentWorldState } from '../apps/server/src/upgrade-world.js';
import { join } from 'node:path';
import { sameAssetRevision } from '@open-legend/assets';
import { readAssetConfiguration, readAssetIndex } from '../apps/server/src/asset-configuration.js';
import { S3AssetStorage } from '../apps/server/src/asset-storage.js';
import { readCurrentAssetAuthority } from './assets/recovery.js';
import type { AssetAuthoritySnapshot } from '../apps/server/src/asset-repository.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
// Initialize native geometry before constructing or validating recovered world state.
await initializeCollisionRuntime();

const file = process.argv[2];
if (!file)
  throw new Error(
    'Usage: restore-world.ts BACKUP_DIRECTORY. Stop the server first. This restores world state while preserving current paid attempts and privacy records.',
  );
if (!statSync(file).isDirectory())
  throw new Error(
    'Current-format backup directory required; legacy JSON is unsupported. Source retained.',
  );
const config = readConfig();
const database = new PostgresDatabase(config.databaseUrl, false, config.sqlWriteGroups);
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

/** A damaged gameplay graph is not an incremental predecessor. Its allocation
 * floor must still be known independently of the checkpoint being installed. */
async function currentAllocationFloor(head: {
  worldId: string;
  revision: number;
}): Promise<number> {
  const row = await store.db
    .prepare('SELECT payload FROM world_settings WHERE world_id=? AND id=?')
    .get(head.worldId, '["world"]');
  if (row) {
    try {
      const header = JSON.parse(String(row['payload'])) as { id?: unknown; nextId?: unknown };
      if (
        header.id === head.worldId &&
        Number.isSafeInteger(header.nextId) &&
        Number(header.nextId) > 0
      )
        return Number(header.nextId);
    } catch {
      // A malformed gameplay header can use an exact validated target artifact.
    }
  }
  const timeline = await store.getIntegration(`world-timeline:${head.worldId}`);
  if (typeof timeline === 'string' && timeline) {
    const files = new SaveFiles(join(config.dataDirectory, 'saves'));
    for (const metadata of await files.list(head.worldId, { limit: 101 })) {
      if (metadata.revision !== head.revision) continue;
      try {
        const canonical = await store.saves.readCanonical(head.worldId, metadata.id);
        if (canonical.captured.revision !== head.revision) continue;
        const payload = await store.saves.read(head.worldId, metadata.id);
        // Revision alone cannot identify an imported slot from another timeline.
        if (payload.state.world.experience?.temporal?.namespace === timeline)
          return payload.state.world.nextId;
      } catch {
        // Damaged/unavailable candidates establish no allocation guarantee.
      }
    }
  }
  throw new Error(
    'Current identity floor is unavailable; restore refused. Keep the target and provide an intact current-revision checkpoint from its current timeline.',
  );
}
try {
  await store.ready;
  const backup = await readOperationalBackup(file, store.db);
  const head = await store.records.head();
  if (
    head &&
    (!head.worldId || !Number.isSafeInteger(head.revision) || head.revision < 0 || !head.generation)
  )
    throw new Error('The target operational world head is unusable; restore refused.');
  let current: Awaited<ReturnType<SqlGameRepository['load']>> = null;
  if (head) {
    try {
      current = await store.load();
      if (!current) throw new Error('Current gameplay root is missing.');
    } catch (error) {
      console.error(
        `Current gameplay cannot be loaded; privileged checkpoint replacement will retain its operational authority and privacy: ${String(error)}`,
      );
    }
  }
  // Keep the validated checkpoint separate from the restored candidate: current
  // privacy and new receipt epochs deliberately change the installed state,
  // while its original history must still validate against the captured state.
  let state = structuredClone(backup.state);
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
  if (head && state.world.id !== head.worldId) throw new Error('World identity mismatch.');
  let assetPrincipal: { accountId: string } | undefined;
  const assetRestoreKey = `full-restore-asset-authority:${backup.identity}`;
  const assetRestore = (await store.getIntegration(assetRestoreKey)) as
    | { status: 'pending' | 'complete'; worldId: string; attemptId: string }
    | undefined;
  const resumeAssets =
    !!head && assetRestore?.status === 'pending' && assetRestore.worldId === state.world.id;
  const finishAssetAuthority = async () => {
    const assets = new S3AssetStorage(await readAssetConfiguration(), 'recovery-restore');
    const directory = await mkdtemp(join(tmpdir(), 'openlegend-full-restore-authority-'));
    let snapshot: AssetAuthoritySnapshot;
    try {
      const principal = { accountId: await assets.principal() };
      if (assetPrincipal && principal.accountId !== assetPrincipal.accountId)
        throw new Error('The admitted restore operator changed before asset activation.');
      assetPrincipal = principal;
      snapshot = await readCurrentAssetAuthority(assets, {
        domain: 'openlegend-assets',
        directory,
      });
    } finally {
      assets.close();
      await rm(directory, { recursive: true, force: true });
    }
    await store.db.transaction(async () => {
      const phase = (await store.getIntegration(assetRestoreKey)) as typeof assetRestore;
      if (!phase || phase.status !== 'pending' || phase.worldId !== state.world.id)
        throw new Error('The exact interrupted full restore is unavailable.');
      await store.assets.reconcileAuthority(snapshot, snapshot.generation);
      await store.assets.assertRecoveryOperator(assetPrincipal!);
      await store.assets.worldReleaseStatus(state.world.id, state.presentationRelease!);
      await store.putIntegration(assetRestoreKey, { ...phase, status: 'complete' });
    });
  };
  if (state.presentationRelease) {
    const installed = (await readAssetIndex()).release;
    if (!sameAssetRevision(state.presentationRelease, installed))
      throw new Error(
        'The backup requires another exact asset release. Materialize and build it before restore; the target was kept.',
      );
    const assets = new S3AssetStorage(
      await readAssetConfiguration(),
      head && !resumeAssets ? 'authoring' : 'recovery-restore',
    );
    let authorityDirectory: string | undefined;
    try {
      assetPrincipal = { accountId: await assets.principal() };
      if (!head) {
        // Read independent current restrictions before the installation transaction;
        // cloud I/O must never hold the SQL/world mutation lock.
        authorityDirectory = await mkdtemp(join(tmpdir(), 'openlegend-full-restore-authority-'));
        await readCurrentAssetAuthority(assets, {
          domain: 'openlegend-assets',
          directory: authorityDirectory,
        });
      }
    } finally {
      assets.close();
      if (authorityDirectory) await rm(authorityDirectory, { recursive: true, force: true });
    }
    if (head && !resumeAssets) {
      const release = await store.assets.revision(state.presentationRelease, assetPrincipal);
      await store.assets.assertPermission(assetPrincipal, release.destination, 'manage');
    }
  }
  const directoryOwner = await restoreDirectoryOwner(store, config.dataDirectory, state.world.id);
  const priorAttempts = await reconcileInterruptedRestores(store, config.dataDirectory);
  for (const prior of priorAttempts)
    console.error(
      `Prior restore ${prior.id}: ${prior.committed ? 'installation committed' : `${prior.removed.length} owned slot(s) removed`}${prior.retained.length ? `; kept ${prior.retained.join(', ')} for inspection` : ''}.`,
    );
  if (resumeAssets) {
    const expected = structuredClone(state);
    expected.manuallyPaused = true;
    expected.world.paused = true;
    const installed = (await store.getIntegration(`restore-attempt:${assetRestore!.attemptId}`)) as
      | { worldId: string }
      | undefined;
    if (
      !current ||
      installed?.worldId !== state.world.id ||
      !isDeepStrictEqual(current.state, expected)
    )
      throw new Error('The target changed after its interrupted full restore; source retained.');
    await finishAssetAuthority();
    await store.recoverInterruptedWork();
    console.log(
      'Interrupted full restore completed; independently current asset permissions verified.',
    );
  } else if (!head) {
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
          if (!columns.length || columns.some((key) => !/^[a-z_][a-z0-9_]*$/.test(key)))
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
      // A content checkpoint cannot establish today's grants/withdrawals. Keep
      // restored asset delivery closed until independently current recovery authority
      // is reconciled; ordinary gameplay restore retains the live operational tables.
      await store.assets.quarantineAuthority();
      // Keep restored story identities/revisions; projection fills only missing or changed sources.
      validateCurrentWorldState(state.world);
      state.manuallyPaused = true;
      state.world.paused = true;
      await fenceCommands();
      await store.commit(0, state);
      await markRestoreInstalled(store, attempt!);
      if (state.presentationRelease)
        await store.putIntegration(assetRestoreKey, {
          status: 'pending',
          worldId: state.world.id,
          attemptId: attempt!.id,
        });
      install.state = 'uncertain';
    });
    install.state = 'committed';
    current = await store.load();
    if (!current || !isDeepStrictEqual(current.state, state))
      throw new Error('Restored world recovery digest mismatch.');
    // Slow file/SQL restoration remains quarantined. Refresh independent authority
    // only now, then activate in a short transaction; a crash before it stays closed.
    if (state.presentationRelease) await finishAssetAuthority();
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
      // A damaged pointer cannot identify an intact slot to protect.
      console.error('The target recovery pointer is damaged; it grants no protected slot.');
    }
    if (referenced) keep = new Set([referenced]);
    // Healthy targets retain the normal pre-load checkpoint promise. A corrupt
    // gameplay target cannot honestly be published as a valid game checkpoint;
    // SQL rollback and the unchanged source backup protect failed replacement.
    if (current) recoveryId = randomUUID();
    const identityFloor = current?.state.world.nextId ?? (await currentAllocationFloor(head));
    const entityIds = (
      await store.db
        .prepare('SELECT entity_id FROM sim_entities WHERE world_id=?')
        .all(head.worldId)
    ).map((row) => String(row['entity_id']));
    const ledger = readPrivacyLedger(await store.getIntegration(privacyLedgerKey(head.worldId)));
    if (!current && !ledger)
      throw new Error('Current operational privacy ledger is unavailable; restore refused.');
    attempt = await beginRestoreAttempt(config.dataDirectory, {
      directoryOwner,
      worldId: state.world.id,
      startingRevision: head.revision,
      saves: backup.saves ?? [],
      preexisting: await preexistingRestoreSlots(config.dataDirectory, backup.saves ?? []),
      recoveryId,
    });
    await restoreBackupSlots(backup, config.dataDirectory, attempt.id, keep);
    validateCurrentWorldState(state.world);
    state.world.nextId = Math.max(state.world.nextId, identityFloor);
    await store.authority.restoreBindings(state.world);
    state.world = reapplyExperiencePrivacy(state.world, ledger);
    state.manuallyPaused = true;
    const timeline = randomUUID();
    state.world = updateWorld(state.world, (world) => {
      world.paused = true;
      beginTemporalReceiptEpoch(world, timeline);
    });
    const retention = await store.prepareRetainedSourceClosure(
      state,
      true,
      backup.tables['mind_source_versions'] ?? [],
    );
    state = retention.state;
    state.world = updateWorld(state.world, (world) => {
      // These markers normally survive until their exact DELETE commits.
      // Full root replacement already deletes every predecessor block; a
      // zero-charge empty edited marker is no retained gameplay/history.
      for (const actor of Object.values(world.experience?.temporal?.actors ?? {}))
        actor.pages = actor.pages.filter(
          (page) =>
            page.batches.length !== 0 ||
            page.bytes !== 0 ||
            page.count !== 0 ||
            page.appendClosed !== true ||
            temporalPageMutation(page) !== 'edit',
        );
    });
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
    validateCurrentWorldState(state.world);
    // Removing only terminal tombstones and changing physical residency does
    // not alter the completed source closure. Carry its actual writer inputs.
    store.memories.stageSourceVersions(state.world, retention.versions);
    store.records.stageRetirements(state, retention.rows, retention.positions, retention.previous);
    // A readable target keeps the normal pre-load checkpoint promise (SL09-A);
    // a failed install can then remove exactly this attempt-owned file (SB18).
    if (current && recoveryId) {
      const recovery = new GameSaves(
        store.db,
        join(config.dataDirectory, 'saves'),
        undefined,
        attempt.id,
      );
      await recovery.create(head.worldId, 'Before last load', recoveryId, {
        kind: 'recovery',
        expectedRevision: head.revision,
      });
    }
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
        state: backup.state,
        history: Object.fromEntries(
          HISTORY_TABLES.map((table) => [table, backup.tables[table] ?? []]),
        ) as import('../apps/server/src/game-saves.js').SavePayload['history'],
        memory: Object.fromEntries(
          MEMORY_HISTORY_TABLES.map((table) => [table, backup.tables[table] ?? []]),
        ) as NonNullable<import('../apps/server/src/game-saves.js').SavePayload['memory']>,
      };
      await store.restoreAdministrative(
        head.revision,
        state,
        after,
        {
          worldId: head.worldId,
          identityFloor,
          simTime: current?.state.world.simTime ?? 0,
          entityIds,
        },
        {
          id: 'backup',
          requestId: randomUUID(),
          payload,
          epoch,
          timeline,
          recoveryId,
          assetPrincipal,
        },
      );
      await markRestoreInstalled(store, attempt!);
      install.state = 'uncertain';
    });
    install.state = 'committed';
    for (const actorId of entityKeys(state.world.entities)) {
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
