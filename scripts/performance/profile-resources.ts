import { Session } from 'node:inspector/promises';
import { readFile, writeFile } from 'node:fs/promises';
import { cpus, freemem, loadavg, totalmem } from 'node:os';
import { performance } from 'node:perf_hooks';
import { posix } from 'node:path';
import { assertProfileJsonBudget } from '../../apps/server/src/performance-json.js';
import type { SqlDatabase } from '../../apps/server/src/store.js';

export type StatisticsDatabase = Pick<SqlDatabase, 'prepare'>;

export interface OwnedProcessSpec {
  pid: number;
  role: 'postgres' | 'driver';
  /** Reuse the first observation's kernel start identity on subsequent cuts. */
  startTimeTicks?: string;
}
export interface OwnedPostgresRoot {
  pid: number;
  startTimeTicks?: string;
  /** Supplied only by the existing exclusive cluster/service owner. */
  exclusiveOwnership: boolean;
}
export interface OwnedResourceOptions {
  postgresRoot?: OwnedPostgresRoot;
  ownedPids?: readonly OwnedProcessSpec[];
  clockTicksPerSecond?: number;
  requiredCgroup?: string;
  postgresRosterComplete?: boolean;
  driverRosterComplete?: boolean;
  requestedAtMs?: number;
}
function membership(value: string | null): string | null {
  return (
    value
      ?.split('\n')
      .find((line) => line.startsWith('0::'))
      ?.slice(3) ?? null
  );
}
function unescapeMount(value: string): string {
  return value.replace(/\\([0-7]{3})/g, (_, code: string) =>
    String.fromCharCode(parseInt(code, 8)),
  );
}
async function cgroupProof(raw: string | null, mountinfo: string | null) {
  const member = membership(raw);
  const line = mountinfo?.split('\n').find((value) => value.includes(' - cgroup2 '));
  if (!member || !line)
    return {
      status: 'unavailable' as const,
      reason: 'Cgroup v2 membership or mount is unavailable.',
      membership: member,
      ancestors: [],
    };
  const fields = line.split(' '),
    root = unescapeMount(fields[3] ?? ''),
    mount = unescapeMount(fields[4] ?? '');
  if (
    !member.startsWith('/') ||
    member.split('/').includes('..') ||
    !mount.startsWith('/') ||
    !root.startsWith('/')
  )
    return {
      status: 'unavailable' as const,
      reason: 'Cgroup path is not a valid absolute membership.',
      membership: member,
      ancestors: [],
    };
  const suffix =
    root === '/'
      ? member.slice(1)
      : member === root
        ? ''
        : member.startsWith(root + '/')
          ? member.slice(root.length + 1)
          : null;
  if (suffix === null)
    return {
      status: 'unavailable' as const,
      reason: 'The namespace membership cannot be mapped to the mounted cgroup root.',
      membership: member,
      ancestors: [],
    };
  let current = posix.join(mount, suffix);
  const path = current;
  const ancestors: Array<{ path: string; values: Record<string, string | null> }> = [];
  for (let depth = 0; depth < 64; depth++) {
    const entries = await Promise.all(
      [
        'cpu.max',
        'cpu.stat',
        'cpuset.cpus.effective',
        'memory.max',
        'memory.high',
        'memory.current',
        'memory.events',
        'io.stat',
      ].map(
        async (name) =>
          [name, await readFile(posix.join(current, name), 'utf8').catch(() => null)] as const,
      ),
    );
    ancestors.push({ path: current, values: Object.fromEntries(entries) });
    if (current === mount) break;
    const parent = posix.dirname(current);
    if (parent === current || !(parent === mount || parent.startsWith(mount + '/'))) break;
    current = parent;
  }
  const complete = ancestors.at(-1)?.path === mount;
  const memory = ancestors.flatMap(({ values }) => {
    const value = values['memory.max']?.trim();
    return value && /^\d+$/.test(value) ? [Number(value)] : [];
  });
  const cpu = ancestors.flatMap(({ values }) => {
    const [quota, period] = values['cpu.max']?.trim().split(/\s+/) ?? [];
    return quota && period && /^\d+$/.test(quota) && Number(period) > 0
      ? [Number(quota) / Number(period)]
      : [];
  });
  return {
    status: complete ? ('observed' as const) : ('incomplete' as const),
    reason: complete ? null : 'Ancestor proof exceeded the bounded path or mount relationship.',
    membership: member,
    mountRoot: root,
    mountPoint: mount,
    path,
    ancestors,
    ancestorVisibility:
      root === '/'
        ? 'Mounted hierarchy through its visible root; the host must also declare any namespace/external constraints.'
        : 'The mount hides ancestors above its root; outer limits require host evidence.',
    effective: {
      cpuQuotaCores: cpu.length ? Math.min(...cpu) : null,
      memoryMaxBytes: memory.length ? Math.min(...memory) : null,
      cpuLimitState: ancestors.some(({ values }) => values['cpu.max'] === null)
        ? 'incomplete'
        : cpu.length
          ? 'limited'
          : 'unlimited',
      memoryLimitState: ancestors.some(({ values }) => values['memory.max'] === null)
        ? 'incomplete'
        : memory.length
          ? 'limited'
          : 'unlimited',
    },
  };
}
function readProcessStat(text: string) {
  const closing = text.lastIndexOf(')');
  if (closing < 0) throw new Error('Invalid process stat.');
  const fields = text
    .slice(closing + 2)
    .trim()
    .split(/\s+/);
  const userTicks = Number(fields[11]),
    systemTicks = Number(fields[12]),
    waitedUserTicks = Number(fields[13]),
    waitedSystemTicks = Number(fields[14]),
    parentPid = Number(fields[1]),
    startTimeTicks = fields[19];
  if (
    ![userTicks, systemTicks, waitedUserTicks, waitedSystemTicks, parentPid].every(
      Number.isFinite,
    ) ||
    !startTimeTicks ||
    !/^\d+$/.test(startTimeTicks)
  )
    throw new Error('Invalid process CPU/start identity.');
  return { userTicks, systemTicks, waitedUserTicks, waitedSystemTicks, parentPid, startTimeTicks };
}
async function observeOwnedProcess(spec: OwnedProcessSpec) {
  if (!Number.isSafeInteger(spec.pid) || spec.pid <= 0 || spec.pid === process.pid)
    throw new Error('Owned process IDs must be distinct positive non-server PIDs.');
  try {
    const [stat, io, cgroup] = await Promise.all([
      readFile(`/proc/${spec.pid}/stat`, 'utf8'),
      readFile(`/proc/${spec.pid}/io`, 'utf8').catch(() => null),
      readFile(`/proc/${spec.pid}/cgroup`, 'utf8').catch(() => null),
    ]);
    const values = readProcessStat(stat);
    if (spec.startTimeTicks && spec.startTimeTicks !== values.startTimeTicks)
      return {
        ...spec,
        status: 'identity-changed' as const,
        cpu: null,
        io: null,
        cgroup,
        reason: 'The kernel process identity changed; no CPU delta is attributed.',
      };
    return {
      ...spec,
      status: 'observed' as const,
      cpu: values,
      io: io
        ? Object.fromEntries(
            io
              .trim()
              .split('\n')
              .map((line) => {
                const [key, value] = line.split(':');
                return [key, Number(value?.trim())];
              }),
          )
        : null,
      cgroup,
      reason: null,
    };
  } catch {
    return {
      ...spec,
      status: 'unavailable' as const,
      cpu: null,
      io: null,
      cgroup: null,
      reason: 'The explicitly owned process could not be observed.',
    };
  }
}

/** A bounded walk of an explicitly owned PostgreSQL process tree. This never
 * searches /proc or infers ownership from a process name. Kernel waited-child
 * counters retain CPU from reaped descendants; each live descendant is counted
 * separately only while it has not been reaped into its parent. */
export async function ownedPostgresRoster(root: OwnedPostgresRoot) {
  const observedBeforeMs = performance.now();
  if (
    !Number.isSafeInteger(root.pid) ||
    root.pid <= 0 ||
    root.pid === process.pid ||
    root.exclusiveOwnership !== true
  )
    return {
      status: 'unavailable' as const,
      rootPid: root.pid,
      rootStartTimeTicks: null,
      processes: [] as OwnedProcessSpec[],
      cumulativeTicks: null,
      observedBeforeMs,
      observedAfterMs: performance.now(),
      reason: 'An explicit exclusive PostgreSQL main-process owner is required.',
    };
  const processes: OwnedProcessSpec[] = [],
    queue = [{ pid: root.pid, parent: null as number | null }],
    visited = new Set<number>(),
    cuts: Array<{ pid: number; cpu: ReturnType<typeof readProcessStat>; children: string }> = [];
  let cumulativeTicks = 0,
    rootStartTimeTicks: string | null = null;
  try {
    for (let cursor = 0; cursor < queue.length; cursor++) {
      if (queue.length > 512)
        throw new Error('Owned PostgreSQL tree exceeds the 512-process observation budget.');
      const selected = queue[cursor]!;
      if (visited.has(selected.pid))
        throw new Error('Owned PostgreSQL process tree changed during observation.');
      visited.add(selected.pid);
      const [raw, children] = await Promise.all([
        readFile(`/proc/${selected.pid}/stat`, 'utf8'),
        readFile(`/proc/${selected.pid}/task/${selected.pid}/children`, 'utf8'),
      ]);
      const cpu = readProcessStat(raw);
      if (selected.parent !== null && cpu.parentPid !== selected.parent)
        throw new Error('A descendant changed kernel parent during observation.');
      if (selected.pid === root.pid) {
        if (root.startTimeTicks && root.startTimeTicks !== cpu.startTimeTicks)
          throw new Error('Owned PostgreSQL main-process identity changed.');
        rootStartTimeTicks = cpu.startTimeTicks;
      }
      processes.push({ pid: selected.pid, role: 'postgres', startTimeTicks: cpu.startTimeTicks });
      cuts.push({ pid: selected.pid, cpu, children: children.trim() });
      cumulativeTicks +=
        cpu.userTicks + cpu.systemTicks + cpu.waitedUserTicks + cpu.waitedSystemTicks;
      for (const value of children.trim().split(/\s+/).filter(Boolean)) {
        if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0)
          throw new Error('Invalid owned child process identity.');
        queue.push({ pid: Number(value), parent: selected.pid });
      }
    }
    // A child reaped between reading its parent's counters and child roster can
    // otherwise be omitted or counted twice. Retain only stable tree cuts;
    // ordinary live CPU still has the explicitly recorded observation interval.
    for (const cut of cuts) {
      const [raw, children] = await Promise.all([
        readFile(`/proc/${cut.pid}/stat`, 'utf8'),
        readFile(`/proc/${cut.pid}/task/${cut.pid}/children`, 'utf8'),
      ]);
      const after = readProcessStat(raw);
      if (
        after.startTimeTicks !== cut.cpu.startTimeTicks ||
        after.parentPid !== cut.cpu.parentPid ||
        after.waitedUserTicks !== cut.cpu.waitedUserTicks ||
        after.waitedSystemTicks !== cut.cpu.waitedSystemTicks ||
        children.trim() !== cut.children
      )
        throw new Error('Owned PostgreSQL descendants changed during observation.');
    }
    return {
      status: 'observed' as const,
      rootPid: root.pid,
      rootStartTimeTicks,
      processes,
      cumulativeTicks,
      observedBeforeMs,
      observedAfterMs: performance.now(),
      reason: null,
      limitation:
        'Coarse non-atomic tree observation. Its recorded boundary interval includes traversal races/latency; disappearing/reparented children make the observation unavailable.',
    };
  } catch {
    return {
      status: 'unavailable' as const,
      rootPid: root.pid,
      rootStartTimeTicks,
      processes,
      cumulativeTicks: null,
      observedBeforeMs,
      observedAfterMs: performance.now(),
      reason: 'The explicitly owned PostgreSQL tree could not be observed completely.',
    };
  }
}

/** Coarse boundary observations only; no process-wide search or per-helper CPU.
 * Roster completeness is supplied by the existing exclusive worker/service owner. */
export async function sampleOwnedResources(options: OwnedResourceOptions = {}) {
  const before = performance.now();
  if ((options.ownedPids?.length ?? 0) > 512)
    throw new Error('Owned process roster exceeds the explicit 512-process observation budget.');
  if (
    options.clockTicksPerSecond !== undefined &&
    (!Number.isFinite(options.clockTicksPerSecond) || options.clockTicksPerSecond <= 0)
  )
    throw new Error('The process CPU clock-tick rate must be positive.');
  if (
    options.requiredCgroup !== undefined &&
    (!options.requiredCgroup.startsWith('/') || options.requiredCgroup.split('/').includes('..'))
  )
    throw new Error('The control cgroup must be an absolute membership path.');
  const threadClock = (
    process as unknown as { threadCpuUsage?: () => { user: number; system: number } }
  ).threadCpuUsage;
  const thread = threadClock ? threadClock.call(process) : null;
  const [cgroup, selfStatus, mountinfo] = await Promise.all([
    readFile('/proc/self/cgroup', 'utf8').catch(() => null),
    readFile('/proc/self/status', 'utf8').catch(() => null),
    readFile('/proc/self/mountinfo', 'utf8').catch(() => null),
  ]);
  const postgresTree = options.postgresRoot
    ? await ownedPostgresRoster(options.postgresRoot)
    : null;
  const requestedProcesses = postgresTree
    ? [
        ...(options.ownedPids ?? []).filter((value) => value.role !== 'postgres'),
        ...postgresTree.processes,
      ]
    : [...(options.ownedPids ?? [])];
  const unique = new Set(requestedProcesses.map(({ pid }) => pid));
  if (unique.size !== requestedProcesses.length)
    throw new Error('Owned process roster contains duplicate PIDs.');
  const ownedProcesses = await Promise.all(requestedProcesses.map(observeOwnedProcess));
  const group = await cgroupProof(cgroup, mountinfo);
  const required = options.requiredCgroup;
  const contained = (value: string | null) =>
    !required ||
    (value !== null && (value === required || value.startsWith(required.replace(/\/$/, '') + '/')));
  const driverInside = ownedProcesses
    .filter((value) => value.role === 'driver' && required && contained(membership(value.cgroup)))
    .map(({ pid }) => pid);
  const mismatched = ownedProcesses
    .filter((value) => value.role === 'postgres' && !contained(membership(value.cgroup)))
    .map(({ pid }) => pid);
  const missing: string[] = [];
  if (thread === null) missing.push('Main-thread CPU is unavailable on this Node build.');
  if (!options.postgresRosterComplete && postgresTree?.status !== 'observed')
    missing.push('A complete owned PostgreSQL PID roster has not been supplied.');
  if (!options.driverRosterComplete)
    missing.push('A complete separate load-generator PID roster has not been supplied.');
  if (!options.clockTicksPerSecond || !Number.isFinite(options.clockTicksPerSecond))
    missing.push('The process CPU clock-tick rate has not been supplied.');
  if (required && (!contained(membership(cgroup)) || mismatched.length))
    missing.push('The required control cgroup does not contain all declared workload processes.');
  if (driverInside.length)
    missing.push('The separate load generator shares the workload control cgroup.');
  if (group.status !== 'observed')
    missing.push('The visible cgroup ancestor limits have not been completely observed.');
  return {
    requestedAtMs: options.requestedAtMs ?? null,
    observedBeforeMs: before,
    observedAfterMs: performance.now(),
    clockOriginUnixMs: performance.timeOrigin,
    pid: process.pid,
    mainThreadCpu: thread,
    nodeProcessCpu: process.cpuUsage(),
    memory: process.memoryUsage(),
    resourceUsage: process.resourceUsage(),
    host: {
      cpu: cpus().map(({ model, speed }) => ({ model, speed })),
      totalMemory: totalmem(),
      freeMemory: freemem(),
      load: loadavg(),
    },
    cgroup,
    cgroupProof: group,
    cpuAffinity: selfStatus?.match(/^Cpus_allowed_list:\s*(.+)$/m)?.[1] ?? null,
    requiredCgroup: required ?? null,
    cgroupContainment: required
      ? {
          server: contained(membership(cgroup)),
          postgresMismatchedPids: mismatched,
          driverInsidePids: driverInside,
        }
      : null,
    ownedProcesses,
    postgresTree,
    clockTicksPerSecond: options.clockTicksPerSecond ?? null,
    rosterCompleteness: {
      postgres: postgresTree?.status === 'observed' || (options.postgresRosterComplete ?? false),
      driver: options.driverRosterComplete ?? false,
    },
    missing,
    overlap:
      'Node process CPU includes its workers. Add only separately owned PostgreSQL CPU for the workload total; keep driver CPU separate. Worker RSS is shared process RSS.',
  };
}
export function resourceDeltas(
  before: Awaited<ReturnType<typeof sampleOwnedResources>>,
  after: Awaited<ReturnType<typeof sampleOwnedResources>>,
) {
  const missing: string[] = [];
  const nodeCpuMs =
    before.pid === after.pid
      ? (after.nodeProcessCpu.user +
          after.nodeProcessCpu.system -
          before.nodeProcessCpu.user -
          before.nodeProcessCpu.system) /
        1000
      : null;
  const ticks =
    before.clockTicksPerSecond === after.clockTicksPerSecond ? before.clockTicksPerSecond : null;
  const byRole = (role: OwnedProcessSpec['role']) => {
    const initial = before.ownedProcesses.filter((entry) => entry.role === role);
    const final = after.ownedProcesses.filter((entry) => entry.role === role);
    if (
      !before.rosterCompleteness[role] ||
      !after.rosterCompleteness[role] ||
      !initial.length ||
      !ticks ||
      ticks <= 0 ||
      initial.length !== final.length
    ) {
      missing.push(`Complete ${role} CPU accounting is unavailable.`);
      return null;
    }
    let total = 0;
    for (const entry of initial) {
      const next = final.find((value) => value.pid === entry.pid);
      if (!entry.cpu || !next?.cpu || entry.cpu.startTimeTicks !== next.cpu.startTimeTicks) {
        missing.push(`${role} process identity/CPU is unavailable.`);
        return null;
      }
      const delta =
        next.cpu.userTicks + next.cpu.systemTicks - entry.cpu.userTicks - entry.cpu.systemTicks;
      if (delta < 0) {
        missing.push(`${role} CPU counters moved backwards.`);
        return null;
      }
      total += (delta * 1000) / ticks;
    }
    return total;
  };
  const treeBefore = before.postgresTree,
    treeAfter = after.postgresTree;
  const postgresCpuMs =
      treeBefore && treeAfter
        ? treeBefore.status === 'observed' &&
          treeAfter.status === 'observed' &&
          treeBefore.rootPid === treeAfter.rootPid &&
          treeBefore.rootStartTimeTicks === treeAfter.rootStartTimeTicks &&
          ticks &&
          treeBefore.cumulativeTicks !== null &&
          treeAfter.cumulativeTicks !== null &&
          treeAfter.cumulativeTicks >= treeBefore.cumulativeTicks
          ? ((treeAfter.cumulativeTicks - treeBefore.cumulativeTicks) * 1000) / ticks
          : null
        : byRole('postgres'),
    driverCpuMs = byRole('driver');
  if (postgresCpuMs === null) missing.push('Complete PostgreSQL CPU accounting is unavailable.');
  const io = after.ownedProcesses.map((entry) => {
    const prior = before.ownedProcesses.find(
      (value) => value.pid === entry.pid && value.cpu?.startTimeTicks === entry.cpu?.startTimeTicks,
    );
    return {
      pid: entry.pid,
      role: entry.role,
      delta:
        prior?.io && entry.io
          ? Object.fromEntries(
              Object.entries(entry.io).map(([key, value]) => {
                const initial = prior.io?.[key];
                return [
                  key,
                  initial !== undefined &&
                  Number.isFinite(initial) &&
                  typeof value === 'number' &&
                  Number.isFinite(value) &&
                  value >= initial
                    ? value - initial
                    : null,
                ];
              }),
            )
          : null,
    };
  });
  return {
    mainThreadCpuMs:
      before.mainThreadCpu && after.mainThreadCpu
        ? (after.mainThreadCpu.user +
            after.mainThreadCpu.system -
            before.mainThreadCpu.user -
            before.mainThreadCpu.system) /
          1000
        : null,
    nodeCpuMs: nodeCpuMs !== null && nodeCpuMs >= 0 ? nodeCpuMs : null,
    postgresCpuMs,
    driverCpuMs,
    ownedCpuMs:
      nodeCpuMs !== null && nodeCpuMs >= 0 && postgresCpuMs !== null
        ? nodeCpuMs + postgresCpuMs
        : null,
    elapsedSeconds: (after.observedAfterMs - before.observedAfterMs) / 1000,
    ownedProcessIo: io,
    missing: [...new Set(missing)],
    boundaryIntervalsMs: {
      before: [before.observedBeforeMs, before.observedAfterMs],
      after: [after.observedBeforeMs, after.observedAfterMs],
    },
    overlap:
      'The owned total includes Node process CPU once plus owned PostgreSQL CPU, and excludes the separately measured driver.',
  };
}

/** Own-database observations at phase edges; unavailable extensions remain explicit. */
export async function collectDatabaseWindowStats(database: StatisticsDatabase) {
  const before = performance.now();
  const observations: Record<string, unknown> = {};
  const unavailable: Record<string, string> = {};
  const queries = {
    database:
      'SELECT datname, numbackends, xact_commit, xact_rollback, blks_read, blks_hit, tup_returned, tup_fetched, tup_inserted, tup_updated, tup_deleted, temp_files, temp_bytes, deadlocks, blk_read_time, blk_write_time FROM pg_stat_database WHERE datname = current_database()',
    backend:
      'SELECT pid, backend_type, state, wait_event_type, wait_event FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()',
    tables:
      'SELECT relname, n_live_tup, n_dead_tup, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables ORDER BY relname',
    io: 'SELECT relname, heap_blks_read, heap_blks_hit, idx_blks_read, idx_blks_hit, toast_blks_read, toast_blks_hit FROM pg_statio_user_tables ORDER BY relname',
    statements:
      'SELECT queryid::text, calls, total_exec_time, rows, shared_blks_hit, shared_blks_read, temp_blks_read, temp_blks_written, wal_records, wal_bytes FROM pg_stat_statements WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database()) ORDER BY queryid',
    wal: 'SELECT pg_current_wal_insert_lsn()::text AS insert_lsn',
  };
  for (const [family, sql] of Object.entries(queries)) {
    try {
      observations[family] = await database.prepare(sql).all();
    } catch {
      unavailable[family] =
        'Statistic unavailable or permission/extension not installed; no zero-cost inference.';
    }
  }
  return {
    observedBeforeMs: before,
    observedAfterMs: performance.now(),
    observations,
    unavailable,
    scope:
      'Database counters can lag; WAL is cluster-wide. Exclusive owned PostgreSQL is required for attribution.',
  };
}

export async function collectStorageCensus(database: StatisticsDatabase) {
  const before = performance.now();
  const tables = await database
    .prepare(
      'SELECT relname, pg_table_size(relid)::text AS table_bytes, pg_indexes_size(relid)::text AS index_bytes, pg_total_relation_size(relid)::text AS total_bytes, n_live_tup, n_dead_tup FROM pg_stat_user_tables ORDER BY relname',
    )
    .all();
  return {
    observedBeforeMs: before,
    observedAfterMs: performance.now(),
    tables,
    limitation:
      'Dead tuples and relation bytes are not logical cleanup debt or necessarily reclaimable bytes.',
  };
}

/** Inspector modes are independent of application timing and remain separate passes. */
export async function startAllocationCapture(output: string) {
  const session = new Session();
  let running = false;
  try {
    session.connect();
    await session.post('HeapProfiler.enable');
    await session.post('HeapProfiler.startSampling', {
      samplingInterval: 32768,
      includeObjectsCollectedByMajorGC: true,
      includeObjectsCollectedByMinorGC: true,
    });
    running = true;
  } catch (error) {
    session.disconnect();
    throw error;
  }
  return {
    async stop() {
      if (!running) return;
      running = false;
      try {
        const result = await session.post('HeapProfiler.stopSampling');
        const payload = { isolate: 'server-main', ...result };
        assertProfileJsonBudget(payload);
        await writeFile(output, JSON.stringify(payload), {
          flag: 'wx',
          mode: 0o600,
        });
      } finally {
        session.disconnect();
      }
    },
  };
}

export async function startCpuCapture(output: string) {
  const session = new Session();
  session.connect();
  let running = false;
  try {
    await session.post('Profiler.enable');
    await session.post('Profiler.start');
    running = true;
  } catch (error) {
    session.disconnect();
    throw error;
  }
  return {
    async stop() {
      if (!running) return;
      running = false;
      try {
        const result = await session.post('Profiler.stop');
        assertProfileJsonBudget(result.profile);
        await writeFile(output, JSON.stringify(result.profile), { flag: 'wx', mode: 0o600 });
      } finally {
        session.disconnect();
      }
    },
  };
}

/** Distinct node IDs remain distinct even when transpiled functions have equal names. */
export function attributeCpuProfile(profile: {
  nodes: Array<{ id: number; callFrame: unknown; children?: number[] }>;
  samples?: number[];
  timeDeltas?: number[];
}) {
  const parent = new Map<number, number>(),
    ids = new Set(profile.nodes.map((node) => node.id));
  if (ids.size !== profile.nodes.length || [...ids].some((id) => !Number.isSafeInteger(id)))
    throw new Error('CPU node identities are invalid or duplicated.');
  for (const node of profile.nodes)
    for (const child of node.children ?? []) {
      if (!ids.has(child) || parent.has(child))
        throw new Error('CPU node parent coverage is invalid.');
      parent.set(child, node.id);
    }
  const self = new Map<number, number>(),
    inclusive = new Map<number, number>();
  const samples = profile.samples ?? [],
    deltas = profile.timeDeltas ?? [];
  if (samples.length !== deltas.length) throw new Error('CPU sample/delta coverage is incomplete.');
  let totalUs = 0;
  for (let i = 0; i < samples.length; i++) {
    const id = samples[i]!,
      elapsed = deltas[i]!;
    if (!ids.has(id)) throw new Error('CPU sample references an unavailable node.');
    if (!Number.isFinite(elapsed) || elapsed < 0) throw new Error('Invalid CPU clock delta.');
    totalUs += elapsed;
    self.set(id, (self.get(id) ?? 0) + elapsed);
    let cursor: number | undefined = id;
    const seen = new Set<number>();
    while (cursor !== undefined) {
      if (seen.has(cursor)) throw new Error('CPU node parents contain a cycle.');
      seen.add(cursor);
      inclusive.set(cursor, (inclusive.get(cursor) ?? 0) + elapsed);
      cursor = parent.get(cursor);
    }
  }
  return {
    totalUs,
    sampleCount: samples.length,
    nodes: profile.nodes.map((node) => ({
      id: node.id,
      frame: node.callFrame,
      selfUs: self.get(node.id) ?? 0,
      inclusiveUs: inclusive.get(node.id) ?? 0,
    })),
    overlap:
      'Inclusive rows overlap; do not sum them. Samples are attribution, not direct invocation percentiles.',
  };
}
