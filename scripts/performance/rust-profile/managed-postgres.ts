import { lstat, readFile, realpath } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { gitHash, object, text } from './contract.js';

async function readSupervisorReceipt(path: string) {
  const file = await lstat(path);
  if (!file.isFile() || file.uid !== 0 || file.mode & 0o222)
    throw new Error('The case needs the root-owned managed worker execution receipt.');
  return object(JSON.parse(await readFile(path, 'utf8')));
}

/** Read the supervisor's source identity once during setup. Managed source
 * archives have no Git metadata, so match the actual working directory. */
export async function readVerifiedWorkerSource(path: string) {
  const receipt = await readSupervisorReceipt(path);
  if ((await realpath(process.cwd())) !== (await realpath(join(dirname(path), 'source'))))
    throw new Error('The managed worker source receipt refers to another checkout.');
  return {
    receipt,
    commit: text(receipt.commit, 'managed worker source commit', gitHash),
    execution: object(receipt.execution),
  };
}

/** Attribute resource readings only to the exclusive PostgreSQL cluster
 * the supervisor verified for this exact execution. Read once before play. */
export async function readVerifiedWorkerPostgres(path: string, execution: Record<string, unknown>) {
  const receipt = await readSupervisorReceipt(path);
  for (const key of ['runId', 'generation', 'caseId'])
    if (execution[key] === undefined || execution[key] !== receipt[key])
      throw new Error('PostgreSQL receipt refers to another case.');
  if (receipt.exclusiveCluster !== true || receipt.status !== 'verified')
    throw new Error('The case needs a verified exclusive PostgreSQL cluster.');
  const cgroup = text(receipt.cgroup, 'managed PostgreSQL cgroup');
  if (
    !cgroup.startsWith('/') ||
    cgroup
      .slice(1)
      .split('/')
      .some((part) => !part || part === '.' || part === '..')
  )
    throw new Error('The managed PostgreSQL cgroup must be an absolute service path.');
  return { cgroup };
}

export function assertWorkerPostgresDatabase(database: URL) {
  if (database.hostname !== '127.0.0.1' || database.port !== '5432')
    throw new Error('The managed worker PostgreSQL cluster listens on 127.0.0.1:5432.');
}
