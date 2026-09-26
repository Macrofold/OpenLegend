import { AUTHORITY_TABLES } from './authority.js';
import { constants } from 'node:fs';
import { copyFile, mkdir, open, readFile, rename, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { GameSaves, recoveryFile } from './game-saves.js';
import { SaveFiles, syncDirectory } from './save-files.js';
import { tableRows } from './record-pages.js';
import { WorldRecords } from './world-records.js';
import { COMMAND_TABLES } from './command-receipts.js';
import { MEMORY_CACHE_TABLES, MEMORY_HISTORY_TABLES } from './memory-repository.js';
import { HISTORY_TABLES } from './history.js';
import type { SavedWorld, SqlDatabase } from './store.js';

export const OPERATION_TABLES = [
  'jobs',
  'attempts',
  'intelligence_calls',
  'meta',
  'player_profiles',
  'game_saves',
  ...COMMAND_TABLES,
  'memory_index_attempts',
  ...MEMORY_CACHE_TABLES,
  'attempt_scopes',
  ...AUTHORITY_TABLES,
];
// Import/restore consume this same catalog so new external owners cannot silently
// disappear between backup publication and installation.
export const BACKUP_TABLES = [...OPERATION_TABLES, ...HISTORY_TABLES, ...MEMORY_HISTORY_TABLES];
const manifestSchema = z
  .object({
    format: z.literal('openlegend-backup-records-1'),
    worldId: z.string().min(1),
    checkpoint: z.string().uuid(),
    operations: z.string().uuid(),
    saves: z
      .array(z.string().uuid())
      .max(10000)
      .refine((ids) => new Set(ids).size === ids.length),
  })
  .strict();
export interface OperationalBackup {
  state: SavedWorld;
  tables: Record<string, Record<string, unknown>[]>;
  sourceDirectory?: string;
  saves?: string[];
}

function validateRecoveryReferences(
  rows: Record<string, unknown>[],
  worldId: string,
  saves: string[],
) {
  for (const row of rows) {
    if (row['id'] !== 'before-load') continue;
    if (row['world_id'] !== worldId)
      throw new Error('Recovery checkpoint belongs to another world.');
    const reference = recoveryFile(JSON.parse(String(row['payload'])), row['checksum']);
    if (reference && !saves.includes(reference))
      throw new Error('Backup is missing its referenced recovery checkpoint.');
  }
}

async function copySlot(source: string, target: string, id: string) {
  const from = new SaveFiles(source),
    to = new SaveFiles(target);
  const metadata = await from.metadata(id);
  if (!metadata) throw new Error('Backup is missing a retained checkpoint.');
  await from.verify(metadata);
  const existing = await to.metadata(id);
  if (existing) {
    if (existing.checksum !== metadata.checksum || existing.worldId !== metadata.worldId)
      throw new Error('Retained save identity conflicts with target.');
    await to.confirmPublished(existing);
    return;
  }
  await mkdir(target, { recursive: true, mode: 0o700 });
  const staging = join(target, `.pending-${process.pid}-${randomUUID()}`);
  await mkdir(staging, { mode: 0o700 });
  try {
    for (const name of ['metadata.json', metadata.encoding ? 'world.jsonl' : 'world.json']) {
      await copyFile(join(source, id, name), join(staging, name), constants.COPYFILE_EXCL);
      const file = await open(join(staging, name), 'r');
      try {
        await file.sync();
      } finally {
        await file.close();
      }
    }
    await syncDirectory(staging);
    await rename(staging, join(target, id));
    await syncDirectory(target);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

/** Stop admission first. One snapshot captures gameplay and all external ledgers;
 * immutable retained slot files accompany it. Existing destinations are never replaced.
 */
export async function writeOperationalBackup(
  db: SqlDatabase,
  sourceDirectory: string,
  destination: string,
) {
  const staging = join(dirname(destination), `.backup-pending-${randomUUID()}`);
  await mkdir(staging, { mode: 0o700 });
  try {
    await (db.readTransaction?.bind(db) ?? db.transaction.bind(db))(async () => {
      const head = await new WorldRecords(db).head();
      if (!head)
        throw new Error(
          'No canonical world to back up. Preserve legacy storage and start the compatible server before retrying.',
        );
      const checkpoint = randomUUID(),
        operations = randomUUID();
      // Only the identity is used: the stream reads all state from this same snapshot.
      const state = { world: { id: head.worldId } };
      await new GameSaves(db, join(staging, 'checkpoints')).create(
        state,
        'Operational backup',
        checkpoint,
        { expectedRevision: head.revision },
      );
      await new SaveFiles(join(staging, 'checkpoints')).writeStream(
        {
          id: operations,
          worldId: head.worldId,
          label: 'External authority',
          createdAt: new Date().toISOString(),
          simTime: 0,
          format: 'operations-1',
        },
        (async function* () {
          for (const table of OPERATION_TABLES) {
            yield JSON.stringify({ table }) + '\n';
            for await (const row of tableRows(db, table))
              yield JSON.stringify({ table, row }) + '\n';
          }
        })(),
      );
      const files = new SaveFiles(join(sourceDirectory, 'saves'));
      const saved = await files.list(head.worldId);
      if (files.issueCount)
        throw new Error(
          'Retained save catalog is damaged; repair or separately preserve it before backing up.',
        );
      if (saved.length > 10000)
        throw new Error('Backup exceeds the retained-slot manifest allowance.');
      for (const save of saved)
        await copySlot(join(sourceDirectory, 'saves'), join(staging, 'saves'), save.id);
      validateRecoveryReferences(
        await db
          .prepare("SELECT id,world_id,payload,checksum FROM game_saves WHERE id='before-load'")
          .all(),
        head.worldId,
        saved.map((save) => save.id),
      );
      const manifest = manifestSchema.parse({
        format: 'openlegend-backup-records-1',
        worldId: head.worldId,
        checkpoint,
        operations,
        saves: saved.map((s) => s.id),
      });
      const file = await open(join(staging, 'manifest.json'), 'wx', 0o600);
      try {
        await file.writeFile(JSON.stringify(manifest));
        await file.sync();
      } finally {
        await file.close();
      }
    });
    await syncDirectory(staging);
    await rename(staging, destination);
    await syncDirectory(dirname(destination));
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

export async function readOperationalBackup(
  directory: string,
  db: SqlDatabase,
): Promise<OperationalBackup> {
  const path = join(directory, 'manifest.json');
  if ((await stat(path)).size > 1024 * 1024)
    throw new Error('Backup manifest exceeds its allowance.');
  const manifest = manifestSchema.parse(JSON.parse(await readFile(path, 'utf8')));
  const payload = await new GameSaves(db, join(directory, 'checkpoints')).read(
    manifest.worldId,
    manifest.checkpoint,
  );
  const files = new SaveFiles(join(directory, 'checkpoints'));
  const metadata = await files.metadata(manifest.operations);
  if (!metadata || metadata.worldId !== manifest.worldId || metadata.format !== 'operations-1')
    throw new Error('Missing backup external authority.');
  const tables: OperationalBackup['tables'] = { ...payload.history, ...payload.memory };
  let index = -1;
  for await (const line of files.lines(metadata)) {
    const { table, row } = JSON.parse(line) as { table: string; row?: Record<string, unknown> };
    if (!row) {
      if (OPERATION_TABLES[++index] !== table)
        throw new Error('Backup authority table coverage mismatch.');
      tables[table] = [];
    } else {
      if (
        OPERATION_TABLES[index] !== table ||
        !Object.keys(row).length ||
        Object.keys(row).some((column) => !/^[a-z_]+$/.test(column))
      )
        throw new Error('Invalid backup authority row.');
      tables[table]!.push(row);
    }
  }
  if (index !== OPERATION_TABLES.length - 1) {
    if (
      !payload.legacyRecordLayout ||
      index !== OPERATION_TABLES.length - AUTHORITY_TABLES.length - 1
    )
      throw new Error('Incomplete backup external authority.');
    // Before foundations, no account/control tables existed. Never infer empty
    // current authority from an incomplete package using the new record layout.
    for (const table of AUTHORITY_TABLES) tables[table] = [];
  }
  validateRecoveryReferences(tables['game_saves']!, manifest.worldId, manifest.saves);
  const retained = new SaveFiles(join(directory, 'saves'));
  for (const id of manifest.saves) {
    const slot = await retained.metadata(id);
    if (!slot || slot.worldId !== manifest.worldId)
      throw new Error('Backup retained checkpoint missing or foreign.');
    await retained.verify(slot);
  }
  return { state: payload.state, tables, sourceDirectory: directory, saves: manifest.saves };
}
export async function restoreBackupSlots(backup: OperationalBackup, directory: string) {
  if (backup.sourceDirectory)
    for (const id of backup.saves ?? [])
      await copySlot(join(backup.sourceDirectory, 'saves'), join(directory, 'saves'), id);
}
