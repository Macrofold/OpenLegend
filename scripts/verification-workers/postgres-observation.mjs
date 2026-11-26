// The maintained bootstrap owns this exact dedicated cluster. A PID supplied by
// a case is never authority for attributing another PostgreSQL process tree.
import { readFile, realpath, stat } from 'node:fs/promises';
import { exec } from './process.mjs';
const unit = 'postgresql@16-main.service';
const dataDirectory = '/var/lib/postgresql/16/main';
const executable = '/usr/lib/postgresql/16/bin/postgres';
async function service() {
  const { stdout } = await exec('systemctl', [
    'show',
    unit,
    '--property=MainPID',
    '--property=ActiveState',
    '--property=SubState',
    '--property=ControlGroup',
  ]);
  return Object.fromEntries(
    stdout
      .trim()
      .split('\n')
      .map((line) => {
        const split = line.indexOf('=');
        return [line.slice(0, split), line.slice(split + 1)];
      }),
  );
}
function startTime(text) {
  const closing = text.lastIndexOf(')');
  const value =
    closing >= 0
      ? text
          .slice(closing + 2)
          .trim()
          .split(/\s+/)[19]
      : undefined;
  if (!value || !/^\d+$/.test(value)) throw new Error('PostgreSQL process identity unavailable.');
  return value;
}
export async function observePostgresOwnership(job, item, assertCurrentExclusive) {
  // Authorization failures stop dispatch; observation failures produce unknown
  // CPU ownership, never a false shared-cluster attribution or invented zero.
  await assertCurrentExclusive();
  const identity = { runId: job.runId, generation: job.generation, caseId: item.id, unit };
  let result;
  try {
    if (!Number.isFinite(job.postgresCleanCatalogAt))
      throw new Error('No clean exclusive catalog baseline.');
    const current = await service(),
      pid = Number(current.MainPID);
    if (
      !Number.isSafeInteger(pid) ||
      pid <= 1 ||
      current.ActiveState !== 'active' ||
      current.SubState !== 'running' ||
      !current.ControlGroup?.split('/').includes('ol-verification-untrusted.slice')
    )
      throw new Error(
        'The dedicated bootstrap PostgreSQL service is not running in its owned boundary.',
      );
    const [pidFile, command, processStat, actualExecutable, actualStat, expectedStat, cgroup] =
      await Promise.all([
        readFile(`${dataDirectory}/postmaster.pid`, 'utf8'),
        readFile(`/proc/${pid}/cmdline`, 'utf8'),
        readFile(`/proc/${pid}/stat`, 'utf8'),
        realpath(`/proc/${pid}/exe`),
        stat(`/proc/${pid}/exe`),
        stat(executable),
        readFile(`/proc/${pid}/cgroup`, 'utf8'),
      ]);
    const lines = pidFile.trim().split('\n'),
      argv = command.split('\0'),
      dataFlag = argv.indexOf('-D');
    const member = cgroup
      .split('\n')
      .find((line) => line.startsWith('0::'))
      ?.slice(3);
    if (
      Number(lines[0]) !== pid ||
      lines[1] !== dataDirectory ||
      lines[3] !== '5432' ||
      actualExecutable !== executable ||
      actualStat.dev !== expectedStat.dev ||
      actualStat.ino !== expectedStat.ino ||
      expectedStat.uid !== 0 ||
      (expectedStat.mode & 0o022) !== 0 ||
      dataFlag < 0 ||
      argv[dataFlag + 1] !== dataDirectory ||
      member !== current.ControlGroup
    )
      throw new Error('PostgreSQL unit, data directory, executable or cgroup identity differs.');
    const postgresStartTimeTicks = startTime(processStat);
    const [after, afterStat, afterPidFile] = await Promise.all([
      service(),
      readFile(`/proc/${pid}/stat`, 'utf8'),
      readFile(`${dataDirectory}/postmaster.pid`, 'utf8'),
    ]);
    if (
      after.MainPID !== current.MainPID ||
      after.ActiveState !== 'active' ||
      after.SubState !== 'running' ||
      after.ControlGroup !== current.ControlGroup ||
      startTime(afterStat) !== postgresStartTimeTicks ||
      afterPidFile.trim().split('\n').slice(0, 4).join('\n') !== lines.slice(0, 4).join('\n')
    )
      throw new Error('The dedicated PostgreSQL process changed during observation.');
    result = {
      ...identity,
      status: 'verified',
      exclusiveCluster: true,
      postgresMainPid: pid,
      postgresStartTimeTicks,
      executable,
      dataDirectory,
      cgroup: member,
      cleanCatalogAt: job.postgresCleanCatalogAt,
      verifiedAt: Date.now(),
    };
  } catch {
    result = {
      ...identity,
      status: 'unavailable',
      exclusiveCluster: false,
      reason:
        'The current dedicated PostgreSQL unit/process identity could not be completely proved; PostgreSQL CPU remains unattributed.',
      verifiedAt: Date.now(),
    };
  }
  await assertCurrentExclusive();
  return result;
}
