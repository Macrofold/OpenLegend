// One representative browser capture per physical developer device, across worktrees.
import { mkdir, mkdtemp, rename, readdir, rm, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { json } from '../verification-workers/files.mjs';
import { id } from '../verification-workers/contracts.mjs';
const parent = join(homedir(), '.codex', 'verification', 'OpenLegend'),
  directory = join(parent, 'browser-device');
export async function browserDeviceStatus() {
  let files;
  try {
    files = await readdir(directory);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  if (!files.length) return null;
  if (files.length !== 1 || !/^[a-f0-9-]+\.json$/.test(files[0]))
    throw new Error('Browser device ownership needs inspection.');
  const record = await json(join(directory, files[0]));
  id(record.ownerId);
  if (
    `${record.nonce}.json` !== files[0] ||
    !Number.isSafeInteger(record.pid) ||
    record.pid <= 0 ||
    typeof record.closed !== 'boolean'
  )
    throw new Error('Invalid current browser device ownership record.');
  return { ...record, directory };
}
async function remove(record) {
  // Unique filenames prevent a delayed release from removing a newly published owner.
  await rm(join(directory, `${record.nonce}.json`), { force: true });
  try {
    await rmdir(directory);
  } catch (error) {
    if (!['ENOENT', 'ENOTEMPTY'].includes(error.code)) throw error;
  }
}
export async function claimBrowserDevice(ownerId) {
  id(ownerId);
  await mkdir(parent, { recursive: true, mode: 0o700 });
  const staging = await mkdtemp(join(parent, '.browser-device-'));
  const record = {
    ownerId,
    pid: process.pid,
    nonce: randomUUID(),
    closed: true,
    createdAt: Date.now(),
  };
  try {
    await json(join(staging, `${record.nonce}.json`), record);
    try {
      await rename(staging, directory);
    } catch (error) {
      if (!['ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error;
      const owner = await browserDeviceStatus();
      throw new Error(
        `Browser device is claimed by ${owner?.ownerId ?? 'an unresolved owner'}; inspect device status before recovery.`,
      );
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return {
    async begin() {
      if (!record.closed)
        throw new Error('This browser reservation already has an active capture.');
      record.closed = false;
      await json(join(directory, `${record.nonce}.json`), record);
    },
    async closed() {
      record.closed = true;
      await json(join(directory, `${record.nonce}.json`), record);
    },
    async release() {
      if (!record.closed) {
        console.error(`Browser cleanup is unconfirmed; device claim preserved at ${directory}.`);
        return;
      }
      await remove(record);
    },
  };
}
export async function recoverBrowserDevice(ownerId, confirmedClosed) {
  const record = await browserDeviceStatus();
  if (!record) return { released: true };
  if (record.ownerId !== ownerId) throw new Error('Browser claim belongs to another capture.');
  try {
    process.kill(record.pid, 0);
    throw new Error('The browser owner is still running; let it close its capture.');
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
  if (!record.closed && !confirmedClosed)
    throw new Error(
      'Verify and close the original owned browser before --confirmed-closed recovery.',
    );
  await remove(record);
  return { released: true, ownerId };
}
