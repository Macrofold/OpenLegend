// Inspect or recover a local browser claim held by the managed browser workflow.
import { readdir, rm, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { json } from '../verification-workers/files.mjs';
import { id } from '../verification-workers/contracts.mjs';
const directory = join(homedir(), '.codex', 'verification', 'OpenLegend', 'browser-device');
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
