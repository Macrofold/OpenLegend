import { realpath } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import type { CasePlan } from './contract.js';
import {
  containedFile,
  digest,
  groupRunnerCases,
  hashFile,
  identifier,
  integer,
  isMissing,
  jsonFile,
  list,
  number,
  object,
  runnerSteps,
  sha256,
  text,
  workerResultPath,
  writeJson,
} from './contract.js';
import type { FrozenPlan } from './plan.js';

type Entry = { path: string; bytes: number; sha256: string };
type SelectionStatus =
  | 'measured'
  | 'sampled'
  | 'not-selected'
  | 'not-exercised'
  | 'disabled'
  | 'unsupported'
  | 'failed'
  | 'censored'
  | 'no-samples'
  | 'unqualified-overhead';

function files(value: unknown): Map<string, Entry> {
  const entries = list(value, 'artifact file', 512).map((raw) => {
    const entry = object(raw, 'artifact entry');
    return {
      path: text(entry.path, 'artifact path'),
      bytes: integer(entry.bytes, 'artifact size', 0, 256 * 1024 ** 2),
      sha256: text(entry.sha256, 'artifact checksum', sha256),
    };
  });
  const map = new Map(entries.map((entry) => [entry.path, entry]));
  if (map.size !== entries.length) throw new Error('Duplicate artifact path.');
  return map;
}

async function sealedRead(root: string, entries: Map<string, Entry>, path: string) {
  const expected = entries.get(path);
  if (!expected) throw new Error(`Missing sealed artifact ${path}.`);
  const file = await containedFile(root, path, expected.bytes);
  if (file.bytes !== expected.bytes || (await hashFile(file.path)) !== expected.sha256)
    throw new Error(`Artifact checksum mismatch for ${path}.`);
  return { ...file, expectedSha256: expected.sha256 };
}

/** Local case seal. Worker results also acquire the supervisor's independent artifact receipt. */
export async function sealCase(root: string, plan: CasePlan, partial = false) {
  const files: Entry[] = [];
  for (const path of plan.requiredArtifacts) {
    try {
      const member = await containedFile(root, path);
      files.push({ path, bytes: member.bytes, sha256: await hashFile(member.path) });
    } catch (error) {
      if (!partial || !isMissing(error)) throw error;
    }
  }
  await writeJson(join(root, 'integrity.json'), {
    caseId: plan.id,
    comparisonIdentity: plan.comparisonIdentity,
    files,
  });
}

export async function managedReader(
  root: string,
  plan: FrozenPlan,
  job: string,
  planBundleSha256: string,
) {
  const controller = object(await jsonFile(root, 'controller.json'), 'controller receipt');
  const manifest = object(await jsonFile(root, 'manifest.json'), 'worker export seal');
  const lifecycle = object(controller.lifecycle ?? {}, 'worker lifecycle');
  const completion = object(controller.completion);
  const ownedPlan = object(controller.plan, 'worker claim plan');
  const inputReceipts = object(controller.inputs, 'worker input receipts');
  if (
    controller.jobId !== job ||
    controller.runId !== manifest.runId ||
    controller.generation !== manifest.generation ||
    completion.runId !== controller.runId ||
    completion.generation !== controller.generation ||
    completion.clean !== true ||
    (completion.manifestHash !== undefined && completion.manifestHash !== digest(manifest))
  )
    throw new Error('Worker receipt does not own the exported generation.');
  if (
    ownedPlan.taskId !== plan.taskId ||
    ownedPlan.cloudAllocationId !== plan.cloudAllocationId ||
    object(inputReceipts.campaign, 'worker campaign input').sha256 !== planBundleSha256
  )
    throw new Error('Worker claim does not match the exact dispatched profiling plan.');
  const cases = list(ownedPlan.cases, 'worker case', 16).map((c) => object(c));
  const expected = plan.cases.filter((item) => item.comparisonId === job);
  const groups = groupRunnerCases(expected);
  if (
    cases.length !== groups.length ||
    cases.some((c, i) => {
      const group = groups[i];
      if (!group || c.id !== group.id || c.source !== group.arms[0]?.source) return true;
      const { databases, steps: expectedSteps } = runnerSteps(group.arms);
      const steps = list(c.steps, 'ordered worker step', 2).map((step) => object(step));
      return (
        JSON.stringify(c.databases) !== JSON.stringify(databases) ||
        steps.length !== group.arms.length ||
        steps.some((step, position) => {
          const expected = expectedSteps[position]!;
          return (
            step.id !== expected.id ||
            step.database !== expected.database ||
            JSON.stringify(step.argv) !== JSON.stringify(expected.argv)
          );
        })
      );
    })
  )
    throw new Error('Collected worker order differs from the frozen matrix.');
  for (const item of expected) {
    for (const [id, hash] of Object.entries(item.inputHashes)) {
      if (object(inputReceipts[id]).sha256 !== hash)
        throw new Error('Worker input receipt differs from the frozen case.');
    }
  }
  const entries = files(manifest.files);
  const source = async (caseId: string) => {
    const file = `cases/${caseId}/source.json`;
    await sealedRead(root, entries, file);
    const claimed = cases.find((item) => item.id === caseId);
    const actual = object(await jsonFile(root, file));
    if (
      !claimed?.sourceHash ||
      actual.archiveSha256 !== claimed.sourceHash ||
      actual.commit !== claimed.source
    )
      throw new Error('Executed case source archive does not match the owned claim.');
    return text(actual.archiveSha256, 'actual source archive', sha256);
  };
  const machine = object(controller.machine);
  if (machine.instanceType !== 'm7i.xlarge' || machine.vcpus !== 4 || machine.memoryMiB !== 16_384)
    throw new Error('Results did not run on the standard worker profile.');
  return {
    read: async (item: CasePlan, file: string) =>
      sealedRead(root, entries, `${workerResultPath(item)}/${file}`),
    source,
    instanceId: text(machine.instanceId, 'owned instance', /^i-[0-9a-f]+$/),
    runId: text(manifest.runId, 'run identity', identifier),
    generation: integer(manifest.generation, 'claim generation', 1, Number.MAX_SAFE_INTEGER),
    cleanup: {
      status: lifecycle.status ?? 'unavailable',
      clean: completion.clean,
      estimateMicroUsd: lifecycle.estimateMicroUsd ?? null,
    },
  };
}

type Metrics = Awaited<ReturnType<typeof captureMetrics>>;

function histogram(value: unknown, bounds: number[]) {
  const row = object(value);
  const count = integer(row.count, 'histogram count', 0, Number.MAX_SAFE_INTEGER);
  const sum = integer(row.sumNs, 'summed nanoseconds', 0, Number.MAX_SAFE_INTEGER);
  const bins = list(row.bins, 'histogram bins', bounds.length + 2).map((n) =>
    integer(n, 'bin count', 0, count),
  );
  if (bins.length !== bounds.length + 1 && bins.length !== bounds.length + 2)
    throw new Error('Histogram bins do not match their frozen bounds.');
  if (bins.reduce((a, b) => a + b, 0) !== count)
    throw new Error('Histogram count differs from its bins.');
  const distinctUnderflow = bins.length === bounds.length + 2;
  const quantile = (p: number) => {
    if (!count) return null;
    let cumulative = 0;
    for (let index = 0; index < bins.length; index++) {
      cumulative += bins[index]!;
      if (cumulative >= Math.ceil(count * p)) {
        const bound = index - Number(distinctUnderflow);
        return {
          lowerNs: bounds[bound - 1] ?? 0,
          upperNs: bounds[bound] ?? (bound < 0 ? (bounds[0] ?? null) : null),
        };
      }
    }
    return null;
  };
  return {
    count,
    sumNs: sum,
    meanNs: count ? sum / count : null,
    minNs: count ? number(row.minNs, 'minimum nanoseconds') : null,
    maxNs: count ? number(row.maxNs, 'maximum nanoseconds') : null,
    median: quantile(0.5),
    p95: quantile(0.95),
    p99: quantile(0.99),
    p95Provisional: count > 0 && count < 100,
    p99Provisional: count > 0 && count < 1000,
    overflow: bins.at(-1)!,
  };
}

function captureMetrics(value: unknown, planned: CasePlan, timeline: Record<string, unknown>) {
  const data = object(value, 'recorder output');
  const bounds = list(data.boundsNs, 'histogram bounds', 4096).map((n) =>
    integer(n, 'upper nanoseconds', 1, 3_600_000_000_000),
  );
  if (data.schema !== 1 || !bounds.length || bounds.some((n, i) => i > 0 && n <= bounds[i - 1]!))
    throw new Error('Unrecognized recorder histogram schema.');
  const lost = integer(data.lost, 'omitted observations', 0, Number.MAX_SAFE_INTEGER);
  const traceLost = integer(data.traceLost, 'omitted trace records', 0, Number.MAX_SAFE_INTEGER);
  const window = object(data.window, 'recorder window');
  const startNs = integer(window.startNs, 'steady window start', 0, Number.MAX_SAFE_INTEGER);
  const endNs = integer(window.endNs, 'steady window end', startNs + 1, Number.MAX_SAFE_INTEGER);
  const drainNs = integer(
    window.drainNs,
    'recorder drain deadline',
    endNs,
    Number.MAX_SAFE_INTEGER,
  );
  const stopNs = integer(window.stopNs, 'recorder stop', 0, drainNs);
  const arm = object(timeline.captureWindow ?? {}, 'recorder arm receipt');
  const stop = object(timeline.captured ?? {}, 'recorder stop receipt');
  const steady = object(timeline.steady ?? {}, 'driver steady window');
  const generation = integer(data.generation, 'recorder generation', 1, Number.MAX_SAFE_INTEGER);
  const windowMatched =
    arm.generation === generation &&
    stop.generation === generation &&
    arm.startAt === steady.startAt &&
    arm.endAt === steady.endAt &&
    arm.startNs === startNs &&
    arm.endNs === endNs &&
    arm.drainNs === drainNs;
  const complete =
    windowMatched && stop.complete === true && window.complete === true && stopNs >= endNs;
  const sampling = object(data.sampling);
  if (sampling.every !== 1 / planned.samplingProbability || sampling.seed !== planned.seed)
    throw new Error('Capture sampling does not match the frozen selection.');
  const metrics = list(data.metrics, 'metrics', 32).map((item) => {
    const raw = object(item);
    const id = text(raw.id, 'metric ID');
    if (!planned.probeIds.includes(id)) throw new Error('Capture contains an unplanned metric.');
    const eligible = integer(raw.eligible, 'eligible calls', 0, Number.MAX_SAFE_INTEGER);
    const censored = integer(raw.censored, 'censored invocations', 0, Number.MAX_SAFE_INTEGER);
    const countCalls = integer(raw.countCalls ?? 0, 'counter calls', 0, Number.MAX_SAFE_INTEGER);
    const carryIn = integer(raw.carryIn, 'carry-in calls', 0, Number.MAX_SAFE_INTEGER);
    const carryInCensored = integer(raw.carryInCensored ?? 0, 'censored carry-in', 0, carryIn);
    const sampled = integer(raw.sampled, 'sampled calls', 0, eligible);
    const status: SelectionStatus =
      lost || !complete
        ? 'failed'
        : !eligible && !countCalls && !carryIn
          ? 'not-exercised'
          : censored || carryInCensored || (!eligible && !countCalls && carryIn)
            ? 'censored'
            : !sampled && !countCalls
              ? 'no-samples'
              : sampling.every === 1 || countCalls > 0
                ? 'measured'
                : 'sampled';
    return {
      id,
      unit: text(raw.unit, 'metric unit'),
      status,
      eligible,
      censored,
      countCalls,
      sampled,
      completed: integer(raw.completed, 'completed calls', 0, eligible),
      refused: integer(raw.refused, 'refused calls', 0, eligible),
      cancelled: integer(raw.cancelled, 'cancelled calls', 0, eligible),
      failed: integer(raw.failed, 'failed calls', 0, eligible),
      carryIn,
      carryInCensored,
      unfinishedAtCutoff: integer(
        raw.unfinishedAtCutoff ?? 0,
        'unfinished at cutoff',
        0,
        Number.MAX_SAFE_INTEGER,
      ),
      work: integer(raw.work, 'work units', 0, Number.MAX_SAFE_INTEGER),
      windowActiveNs: integer(
        raw.windowActiveNs,
        'window active nanoseconds',
        0,
        Number.MAX_SAFE_INTEGER,
      ),
      windowSelfNs: integer(
        raw.windowSelfNs,
        'window self nanoseconds',
        0,
        Number.MAX_SAFE_INTEGER,
      ),
      active: histogram(raw.active, bounds),
      selfTime: histogram(raw.selfTime, bounds),
      latency: histogram(raw.latency, bounds),
    };
  });
  if (
    metrics.length !== planned.probeIds.length ||
    new Set(metrics.map((m) => m.id)).size !== metrics.length
  )
    throw new Error('One or more selected metric summaries are absent.');
  const trace = traceWitness(data.trace, planned.probeIds, startNs, endNs, stopNs);
  return {
    complete,
    windowMatched,
    lost,
    traceLost,
    metrics,
    trace,
    window: { startNs, endNs, drainNs, stopNs },
  };
}

type TraceSpan = {
  id: string;
  token: number;
  parent: number | null;
  startNs: number;
  endNs?: number;
  outcome?: string;
  work?: number;
};

function traceWitness(
  value: unknown,
  selected: string[],
  startNs: number,
  endNs: number,
  stopNs: number,
) {
  const inWindow = (span: TraceSpan) => span.startNs >= startNs && span.startNs < endNs;
  const spans = new Map<number, TraceSpan>();
  for (const entry of list(value ?? [], 'trace records', 1_048_576)) {
    const row = object(entry);
    if (row.kind !== 'begin' && row.kind !== 'end') continue;
    const token = integer(row.token, 'trace token', 1, Number.MAX_SAFE_INTEGER);
    const at = integer(row.atNs, 'trace clock', 0, Number.MAX_SAFE_INTEGER);
    if (row.kind === 'begin') {
      if (spans.has(token)) throw new Error('Duplicate trace token.');
      spans.set(token, {
        token,
        id: text(row.site, 'trace site'),
        parent:
          row.parent === null
            ? null
            : integer(row.parent, 'parent token', 1, Number.MAX_SAFE_INTEGER),
        startNs: at,
      });
    } else {
      const span = spans.get(token);
      if (!span || span.endNs !== undefined || at < span.startNs || at > stopNs)
        throw new Error('Trace finish has no matching start.');
      span.endNs = at;
      span.outcome = text(row.outcome, 'trace outcome');
      if (row.work !== undefined)
        span.work = integer(row.work, 'observed work units', 0, Number.MAX_SAFE_INTEGER);
    }
  }
  const needed = new Set([
    'S02.wait.turn',
    'S02.exec.dispatch',
    'S02.entry.native',
    'S02.wait.question',
    'S02.10',
  ]);
  const byClock = new Map<number, Map<string, TraceSpan>>();
  const holders = [...spans.values()]
    .filter((span) => span.endNs !== undefined && /\.hold\.(?:turn|other)$/.test(span.id))
    .sort((a, b) => a.startNs - b.startNs);
  const waits = [...spans.values()]
    .filter((span) => span.id === 'S02.wait.turn' && span.endNs !== undefined && inWindow(span))
    .sort((a, b) => b.endNs! - b.startNs - (a.endNs! - a.startNs))
    .slice(0, 20);
  const overlap = waits.map((span) => {
    // Report actual intersections. They can differ from the measured wait because the waiter still has to resume.
    const observedHolders = holders.flatMap((holder) => {
      const startNs = Math.max(span.startNs, holder.startNs);
      const endNs = Math.min(span.endNs!, holder.endNs!);
      return endNs > startNs ? [{ holder: holder.id, startNs, endNs }] : [];
    });
    let explainedNs = 0;
    let until = span.startNs;
    for (const item of observedHolders) {
      explainedNs += Math.max(0, item.endNs - Math.max(until, item.startNs));
      until = Math.max(until, item.endNs);
    }
    return {
      ...span,
      settledDuringDrain: span.endNs! >= endNs,
      observedHolders,
      uncoveredNs: span.endNs! - span.startNs - explainedNs,
    };
  });
  for (const span of spans.values()) {
    if (span.endNs === undefined || span.outcome !== 'completed' || !needed.has(span.id)) continue;
    if (span.id === 'S02.10' && !span.work) continue;
    let owner = span.parent === null ? undefined : spans.get(span.parent);
    while (owner && owner.id !== 'S02.entry.tick' && owner.parent !== null) {
      // Parent tokens are created before their children.
      if (owner.parent >= owner.token) throw new Error('Cyclic trace parent.');
      owner = spans.get(owner.parent);
    }
    if (
      owner?.id !== 'S02.entry.tick' ||
      !inWindow(owner) ||
      owner.endNs === undefined ||
      owner.outcome !== 'completed' ||
      span.startNs < owner.startNs ||
      span.endNs > owner.endNs
    )
      continue;
    let joined = byClock.get(owner.token);
    if (!joined) {
      joined = new Map();
      byClock.set(owner.token, joined);
    }
    if (!joined.has(span.id)) joined.set(span.id, span);
  }
  const witness = [...byClock.entries()].find(([, joined]) => joined.size === needed.size);
  const clock = witness && spans.get(witness[0]);
  const acceptedGameMicroseconds = witness?.[1].get('S02.10')?.work;
  return {
    clockJoinSelected:
      selected.includes('S02.entry.tick') && [...needed].every((id) => selected.includes(id)),
    clockTurn:
      witness && clock && acceptedGameMicroseconds
        ? {
            clock,
            linked: [...witness[1].values()],
            acceptedGameMicroseconds,
            settledDuringDrain: clock.endNs! >= endNs,
          }
        : null,
    longestTurnWaits: overlap,
  };
}

export type CaseResult = {
  plan: CasePlan;
  status: 'completed' | 'missing' | 'failed' | 'unsupported';
  reason?: string;
  instanceId?: string;
  database?: string;
  executable?: string;
  sourceArchive?: string;
  cleanup?: { status: unknown; clean: unknown; estimateMicroUsd: unknown };
  workload?: Record<string, unknown>;
  resources?: Record<string, unknown>;
  metrics?: Metrics;
  diagnostic?: { file: string; data: Record<string, unknown> };
  timeline?: Record<string, unknown>;
  relativePath?: string;
};

export async function readCase(
  campaign: string,
  collection: string,
  plan: CasePlan,
  reader: Awaited<ReturnType<typeof managedReader>> | undefined,
): Promise<CaseResult> {
  const managed = Boolean(reader);
  const path = managed
    ? join(collection, plan.comparisonId, workerResultPath(plan))
    : join(campaign, 'cases', plan.id, `repeat-${plan.repetition}`);
  try {
    if ((await realpath(path)) !== resolve(path))
      throw new Error('Case artifacts traverse a symlink.');
    const local = object(await jsonFile(path, 'integrity.json'), 'case seal');
    if (local.caseId !== plan.id || local.comparisonIdentity !== plan.comparisonIdentity)
      throw new Error('Case seal does not match the frozen plan.');
    const entries = files(local.files);
    if (reader) await reader.read(plan, 'integrity.json');
    const verify = async (file: string) => {
      // Verify the managed seal when present as well as the case-owned seal.
      if (reader) {
        const exported = await reader.read(plan, file);
        const row = entries.get(file);
        if (!row || row.bytes !== exported.bytes || row.sha256 !== exported.expectedSha256)
          throw new Error(`Managed and case checksums differ for ${file}.`);
      } else await sealedRead(path, entries, file);
    };
    await verify('completion.json');
    const completion = object(await jsonFile(path, 'completion.json'), 'case completion');
    const status = completion.status;
    if (status !== 'completed' && status !== 'failed' && status !== 'unsupported')
      throw new Error('Unrecognized case completion.');
    for (const file of plan.requiredArtifacts) {
      if (file !== 'completion.json' && (status === 'completed' || entries.has(file)))
        await verify(file);
    }
    const identity = object(await jsonFile(path, 'manifest.json'), 'case manifest');
    const hashes = object(identity.inputHashes);
    if (
      identity.id !== plan.id ||
      identity.runnerCaseId !== plan.runnerCaseId ||
      JSON.stringify(identity.sharedBuild) !== JSON.stringify(plan.sharedBuild) ||
      identity.source !== plan.source ||
      identity.toolSource !== plan.toolSource ||
      identity.mode !== plan.mode ||
      identity.comparisonIdentity !== plan.comparisonIdentity ||
      Object.keys(hashes).length !== Object.keys(plan.inputHashes).length ||
      Object.entries(plan.inputHashes).some(([id, hash]) => hashes[id] !== hash)
    )
      throw new Error('Case provenance does not match the frozen plan.');
    const workload = object(await jsonFile(path, 'workload.json'), 'workload evidence');
    const resources = object(await jsonFile(path, 'resources.json'), 'resource evidence');
    const timeline = object(await jsonFile(path, 'timeline.json'), 'event windows');
    const executable =
      status === 'completed'
        ? text(identity.executableSha256, 'actual executable checksum', sha256)
        : undefined;
    const database =
      typeof identity.databaseIdHash === 'string' && sha256.test(identity.databaseIdHash)
        ? identity.databaseIdHash
        : undefined;
    const sourceArchive = reader && (await reader.source(plan.runnerCaseId));
    if (
      reader &&
      (identity.sourceArchiveSha256 !== sourceArchive ||
        identity.runId !== reader.runId ||
        identity.generation !== reader.generation ||
        identity.instanceId !== reader.instanceId)
    )
      throw new Error('Case manifest refers to another worker execution.');
    if (executable) {
      const build = object(await jsonFile(path, 'toolchain.json'));
      if (build.source !== plan.source || object(build.executable).sha256 !== executable)
        throw new Error('Case executable differs from the source-bound build receipt.');
    }
    const diagnosticFile =
      plan.mode === 'sampled' ? 'cpu-samples.json' : plan.mode === 'sql' ? 'sql.json' : undefined;
    const diagnostic =
      diagnosticFile && entries.has(diagnosticFile)
        ? {
            file: diagnosticFile,
            data: object(await jsonFile(path, diagnosticFile, 64 * 1024 ** 2)),
          }
        : undefined;
    return {
      plan,
      status,
      executable,
      database,
      sourceArchive,
      workload,
      resources,
      timeline,
      instanceId: reader?.instanceId,
      cleanup: reader?.cleanup,
      reason: typeof completion.reason === 'string' ? completion.reason : undefined,
      metrics:
        plan.mode === 'enabled' && entries.has('metrics.json')
          ? captureMetrics(await jsonFile(path, 'metrics.json', 96 * 1024 ** 2), plan, timeline)
          : undefined,
      diagnostic,
      relativePath: relative(join(campaign, 'summary'), path),
    };
  } catch (error) {
    return { plan, status: isMissing(error) ? 'missing' : 'failed', reason: String(error) };
  }
}
