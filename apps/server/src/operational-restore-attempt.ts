import { randomUUID } from 'node:crypto';
import { mkdir, open, opendir, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { recoveryFile } from './game-saves.js';
import { SaveFiles, syncDirectory } from './save-files.js';
import type { SqlDatabase, SqlGameRepository } from './store.js';
import { WorldRecords } from './world-records.js';

const ownerFile = '.directory-owner.json';
const attemptsDirectory = '.restore-attempts';
const attemptSchema = z
  .object({
    format: z.literal('operational-restore-attempt-1'),
    id: z.string().uuid(),
    directoryOwner: z.string().uuid(),
    worldId: z.string().min(1),
    startingRevision: z.number().int().nonnegative().nullable(),
    saves: z
      .array(z.string().uuid())
      .max(10000)
      .refine((ids) => new Set(ids).size === ids.length),
    preexisting: z.array(z.string().uuid()).max(10000),
    recoveryId: z.string().uuid().optional(),
  })
  .strict();
export type RestoreAttempt = z.infer<typeof attemptSchema>;

async function readSmallJson(path: string, maxBytes = 1024 * 1024): Promise<unknown | undefined> {
  try {
    if ((await stat(path)).size > maxBytes) throw new Error('Restore marker is oversized.');
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

async function writeDurable(path: string, value: unknown, parent: string) {
  const file = await open(path, 'wx', 0o600);
  try {
    await file.writeFile(JSON.stringify(value));
    await file.sync();
  } finally {
    await file.close();
  }
  await syncDirectory(parent);
}

/** Refuse a known shared directory before repository startup can clean anyone's
 * interrupted save stages. The later full owner check also covers adoption. */
export async function preflightRestoreDirectoryOwner(db: SqlDatabase, directory: string) {
  const saves = join(directory, 'saves');
  const owned = await readSmallJson(join(saves, ownerFile), 1024);
  const table = await db.prepare("SELECT to_regclass('open_legend.meta') AS name").get();
  const row = table?.['name']
    ? await db.prepare("SELECT value FROM meta WHERE key='integration:save-directory-owner'").get()
    : undefined;
  const databaseOwner = row ? JSON.parse(String(row['value'])) : undefined;
  if (owned === undefined) {
    if (!databaseOwner) return;
    // A missing file may be recreated only after a crash between storing the DB key
    // and writing the owner file. Do not start stage cleanup while files are present.
    try {
      for await (const _entry of await opendir(saves))
        throw new Error('The target database lost its owned save directory. Restore refused.');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    return;
  }
  const fileOwner = z.object({ id: z.string().uuid() }).parse(owned).id;
  if (fileOwner !== databaseOwner)
    throw new Error('The save directory belongs to a different target database. Restore refused.');
}

/** One target database owns the save directory used by operational restore. Another
 * database must use a separate directory, since it cannot expose its references here. */
export async function restoreDirectoryOwner(
  store: SqlGameRepository,
  directory: string,
  worldId: string,
): Promise<string> {
  const saves = join(directory, 'saves');
  await mkdir(saves, { recursive: true, mode: 0o700 });
  const owned = await readSmallJson(join(saves, ownerFile), 1024);
  const databaseOwner = await store.getIntegration('save-directory-owner');
  if (databaseOwner !== undefined && !z.string().uuid().safeParse(databaseOwner).success)
    throw new Error('Target database has an invalid save-directory owner. Restore refused.');
  if (owned !== undefined) {
    const fileOwner = z.object({ id: z.string().uuid() }).parse(owned).id;
    if (fileOwner !== databaseOwner)
      throw new Error(
        'The save directory belongs to a different target database. Restore refused.',
      );
    return fileOwner;
  }
  if (databaseOwner) {
    // The database key is written first. Death before its directory file leaves no
    // copied slot; recreate the file only if the directory is still empty.
    for await (const _entry of await opendir(saves))
      throw new Error('The target database lost its owned save directory. Restore refused.');
    await writeDurable(join(saves, ownerFile), { id: databaseOwner }, saves);
    return databaseOwner as string;
  }
  // Before adopting an existing directory, reject a mixed-world collection. Missing or
  // damaged metadata is also ambiguous; operational cleanup must never guess ownership.
  for await (const entry of await opendir(saves)) {
    if (!entry.isDirectory() || !z.string().uuid().safeParse(entry.name).success) continue;
    const metadata = await new SaveFiles(saves).metadata(entry.name);
    if (!metadata || metadata.worldId !== worldId)
      throw new Error('The save directory contains another or damaged world. Restore refused.');
  }
  const id = randomUUID();
  await store.putIntegration('save-directory-owner', id);
  await writeDurable(join(saves, ownerFile), { id }, saves);
  return id;
}

export async function beginRestoreAttempt(
  directory: string,
  input: Omit<RestoreAttempt, 'format' | 'id'>,
): Promise<RestoreAttempt> {
  const attempt = attemptSchema.parse({
    ...input,
    format: 'operational-restore-attempt-1',
    id: randomUUID(),
  });
  const path = join(directory, 'saves', attemptsDirectory);
  await mkdir(path, { recursive: true, mode: 0o700 });
  await writeDurable(join(path, `${attempt.id}.json`), attempt, path);
  return attempt;
}

/** Capture identities already present before publication, including damaged slots.
 * A later missing/changed ownership marker on a new slot must not be mistaken for
 * a pre-existing one and silently discarded from the journal. */
export async function preexistingRestoreSlots(directory: string, ids: readonly string[]) {
  const present: string[] = [];
  for (const id of ids) {
    try {
      await stat(join(directory, 'saves', z.string().uuid().parse(id)));
      present.push(id);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  return present;
}

export async function markRestoreInstalled(store: SqlGameRepository, attempt: RestoreAttempt) {
  await store.putIntegration(`restore-attempt:${attempt.id}`, { worldId: attempt.worldId });
}

async function removeJournal(directory: string, attempt: RestoreAttempt) {
  const path = join(directory, 'saves', attemptsDirectory);
  await rm(join(path, `${attempt.id}.json`));
  await syncDirectory(path);
}

/** A new writer can only enter after the prior writer's PostgreSQL advisory lock is gone.
 * The DB marker resolves a crash at COMMIT; absent it, unchanged head and exact slot
 * ownership are required before deleting any file. Anything ambiguous is retained. */
export async function reconcileRestoreAttempt(
  store: SqlGameRepository,
  directory: string,
  attempt: RestoreAttempt,
): Promise<{ removed: string[]; retained: string[]; committed: boolean }> {
  const currentOwner = await store.getIntegration('save-directory-owner');
  const fileOwner = await readSmallJson(join(directory, 'saves', ownerFile), 1024);
  if (
    currentOwner !== attempt.directoryOwner ||
    z.object({ id: z.string().uuid() }).safeParse(fileOwner).data?.id !== attempt.directoryOwner
  )
    throw new Error('Save-directory ownership changed; restore files kept for inspection.');
  const installed = await store.getIntegration(`restore-attempt:${attempt.id}`);
  if (installed) {
    if (z.object({ worldId: z.string() }).safeParse(installed).data?.worldId !== attempt.worldId)
      throw new Error('Restore commit marker conflicts with its attempt. Files kept.');
    await removeJournal(directory, attempt);
    return { removed: [], retained: [], committed: true };
  }
  const head = await new WorldRecords(store.db).head();
  if ((head?.revision ?? null) !== attempt.startingRevision)
    throw new Error(
      'Target world changed since the interrupted restore; files kept for inspection.',
    );
  const saves = new SaveFiles(join(directory, 'saves'));
  for await (const entry of await opendir(join(directory, 'saves'))) {
    if (!entry.isDirectory() || !z.string().uuid().safeParse(entry.name).success) continue;
    const metadata = await saves.metadata(entry.name);
    if (!metadata || metadata.worldId !== attempt.worldId)
      throw new Error(
        'The save directory is shared or damaged; restore files kept for inspection.',
      );
  }
  const row = await store.db
    .prepare("SELECT payload,checksum FROM game_saves WHERE world_id=? AND id='before-load'")
    .get(attempt.worldId);
  let protectedId: string | undefined;
  if (row) protectedId = recoveryFile(JSON.parse(String(row['payload'])), row['checksum']);
  const removed: string[] = [],
    retained: string[] = [];
  const preexisting = new Set(attempt.preexisting);
  for (const id of [...attempt.saves, ...(attempt.recoveryId ? [attempt.recoveryId] : [])]) {
    try {
      if (preexisting.has(id)) continue;
      const [owner, metadata] = await Promise.all([saves.restoreOwner(id), saves.metadata(id)]);
      if (!owner || owner.attemptId !== attempt.id) {
        try {
          await stat(join(directory, 'saves', id));
          retained.push(id);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
        continue;
      }
      if (
        protectedId === id ||
        owner.worldId !== attempt.worldId ||
        metadata?.worldId !== owner.worldId ||
        metadata.checksum !== owner.checksum
      ) {
        retained.push(id);
        continue;
      }
      await saves.verify(metadata);
      await saves.delete(id);
      removed.push(id);
    } catch {
      retained.push(id);
    }
  }
  if (!retained.length) await removeJournal(directory, attempt);
  return { removed, retained, committed: false };
}

export async function reconcileInterruptedRestores(store: SqlGameRepository, directory: string) {
  const path = join(directory, 'saves', attemptsDirectory);
  await mkdir(path, { recursive: true, mode: 0o700 });
  const reports: { id: string; removed: string[]; retained: string[]; committed: boolean }[] = [];
  for await (const entry of await opendir(path)) {
    if (!entry.isFile() || !/^[a-f0-9-]{36}\.json$/.test(entry.name)) continue;
    const attempt = attemptSchema.parse(await readSmallJson(join(path, entry.name)));
    if (`${attempt.id}.json` !== entry.name) throw new Error('Restore journal identity mismatch.');
    reports.push({ id: attempt.id, ...(await reconcileRestoreAttempt(store, directory, attempt)) });
  }
  return reports;
}
