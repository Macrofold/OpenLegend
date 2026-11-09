import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import type { ProfilingCase } from './profiling-types.js';
import type { ProfilingDefinition } from './profiling-registry.js';
import { digest } from './profiling-plan.js';
import {
  qualifyOverhead,
  PROFILER_SAFETY_CHECK_NAMES,
  type OverheadRun,
} from './profiling-qualification.js';
import { attributeCpuProfile } from './profile-resources.js';

type RecordValue = Record<string, unknown>;
interface Histogram {
  counts: number[];
  upperBoundsMs: number[];
  overflow: number;
}
interface Bound {
  lowerMs: number;
  upperMs: number | null;
  estimateMs: number | null;
  overflow: boolean;
}
interface Distribution {
  count: number;
  totalMs: number;
  meanMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  p50: Bound | null;
  p95: Bound | null;
  p99: Bound | null;
  histogram: Histogram;
}
interface CaseArtifacts {
  directory: string;
  completionHash: string;
  completion: RecordValue;
  manifest: RecordValue;
  metrics: RecordValue;
  resources: RecordValue;
  workload: RecordValue;
  files: Map<string, Buffer>;
  managedExecution: { runId: string; generation: number } | null;
}
interface CaptureRow {
  episode: number;
  isolate: string;
  artifact: string;
  capture: RecordValue;
  worker: RecordValue | null;
  drain: unknown;
}
const escape = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
const csv = (value: unknown) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const number = (value: unknown) => (finite(value) ? value : null);
const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const range = (values: number[]) =>
  values.length ? { minimum: Math.min(...values), maximum: Math.max(...values) } : null;
function record(value: unknown): RecordValue | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordValue)
    : null;
}
function object(value: unknown): RecordValue {
  const result = record(value);
  if (!result) throw new Error('Expected a report object.');
  return result;
}
function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function drained(value: unknown): boolean {
  const result = record(value);
  return result?.status === 'drained' && result.pendingAtEnd === 0;
}
function measurementDrained(item: ProfilingCase, artifacts: CaseArtifacts): boolean {
  if (item.mode === 'control' || item.mode === 'disabled') return true;
  const episodes = array(artifacts.metrics.episodes);
  return (
    episodes.length > 0 &&
    episodes.every((raw) => {
      const episode = record(raw);
      return (
        drained(episode?.drain) &&
        array(episode?.workers).every((rawWorker) => {
          const worker = record(rawWorker);
          return worker?.status === 'collected' && drained(record(worker.report)?.drain);
        })
      );
    })
  );
}
async function json(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8'));
}
function contained(root: string, path: string) {
  const suffix = relative(root, path);
  return suffix !== '..' && !suffix.startsWith('../') && !isAbsolute(suffix);
}
function statistics(values: number[]) {
  return { count: values.length, mean: average(values), range: range(values), individual: values };
}
function artifactJson(artifacts: CaseArtifacts, name: string): unknown {
  const raw = artifacts.files.get(name);
  if (!raw) throw new Error(`Verified artifact is unavailable: ${name}`);
  artifacts.files.delete(name);
  return JSON.parse(raw.toString('utf8'));
}
function executionEvidence(item: ProfilingCase, artifacts: CaseArtifacts) {
  const environment = record(artifacts.manifest.environment),
    source = record(environment?.workerSource),
    execution = record(source?.execution),
    machine = record(execution?.machine),
    actual = record(machine?.actual),
    hardware = record(execution?.hardware);
  return {
    environment,
    execution,
    machine,
    hardware,
    verified:
      source?.commit === item.source &&
      execution?.caseId === item.id &&
      typeof execution?.runId === 'string' &&
      Number.isSafeInteger(execution?.generation) &&
      Number(execution?.generation) > 0 &&
      (!artifacts.managedExecution ||
        (execution?.runId === artifacts.managedExecution.runId &&
          execution.generation === artifacts.managedExecution.generation)) &&
      typeof machine?.instanceId === 'string' &&
      typeof machine?.imageId === 'string' &&
      machine.instanceType === item.hardware.instanceType &&
      actual?.instanceType === item.hardware.instanceType &&
      actual.imageId === machine.imageId &&
      hardware?.instanceType === item.hardware.instanceType &&
      hardware.architecture === 'x64' &&
      hardware.vcpus === item.hardware.vcpus &&
      array(hardware.cpus).length === item.hardware.vcpus &&
      finite(hardware.memoryMiB) &&
      hardware.memoryMiB >= item.hardware.memoryMiB * 0.9 &&
      hardware.memoryMiB <= item.hardware.memoryMiB * 1.05 &&
      finite(environment?.effectiveHeapLimitBytes) &&
      Number(environment?.effectiveHeapLimitBytes) > 0 &&
      artifacts.manifest.node === 'v24.13.0',
  };
}
function bound(histogram: Histogram, fraction: number): Bound | null {
  const count = histogram.counts.reduce((sum, n) => sum + n, 0);
  if (!count) return null;
  const target = Math.ceil(count * fraction);
  let seen = 0;
  for (let i = 0; i < histogram.counts.length; i++) {
    seen += histogram.counts[i]!;
    if (seen >= target)
      return {
        lowerMs: i ? histogram.upperBoundsMs[i - 1]! : 0,
        upperMs: histogram.upperBoundsMs[i] ?? null,
        estimateMs: histogram.upperBoundsMs[i] ?? null,
        overflow: i >= histogram.upperBoundsMs.length,
      };
  }
  return null;
}
function distribution(value: unknown): Distribution | null {
  const item = record(value),
    histogram = record(item?.histogram);
  if (
    !item ||
    !histogram ||
    !finite(item.count) ||
    item.count < 0 ||
    !finite(item.totalMs) ||
    !Array.isArray(histogram.counts) ||
    !Array.isArray(histogram.upperBoundsMs)
  )
    return null;
  const counts: unknown[] = histogram.counts,
    upperBounds: unknown[] = histogram.upperBoundsMs;
  if (
    counts.length !== upperBounds.length + 1 ||
    counts.some((n) => !finite(n) || n < 0) ||
    upperBounds.some((n, i) => !finite(n) || n <= 0 || (i > 0 && n <= Number(upperBounds[i - 1])))
  )
    return null;
  const normalized = {
    counts: counts as number[],
    upperBoundsMs: upperBounds as number[],
    overflow: Number(counts.at(-1)),
  };
  if (normalized.counts.reduce((sum, count) => sum + count, 0) !== item.count) return null;
  return {
    count: item.count,
    totalMs: item.totalMs,
    meanMs: number(item.meanMs),
    minMs: number(item.minMs),
    maxMs: number(item.maxMs),
    p50: bound(normalized, 0.5),
    p95: bound(normalized, 0.95),
    p99: bound(normalized, 0.99),
    histogram: normalized,
  };
}
/** Different captures, isolates, sampling/window settings are grouped by the caller.
 * Repetition statistics and pooled quantiles are deliberately different accounts. */
export function mergeDistributions(values: readonly Distribution[]) {
  if (!values.length) return null;
  const first = values[0]!,
    bounds = first.histogram.upperBoundsMs;
  const counts = Array.from({ length: first.histogram.counts.length }, () => 0);
  for (const value of values) {
    if (
      value.histogram.upperBoundsMs.length !== bounds.length ||
      value.histogram.upperBoundsMs.some((upper, index) => upper !== bounds[index]) ||
      value.histogram.counts.length !== counts.length
    )
      throw new Error('Incompatible histogram boundaries; separate the result groups.');
    value.histogram.counts.forEach((count, index) => {
      counts[index] = counts[index]! + count;
    });
  }
  const histogram = { counts, upperBoundsMs: bounds, overflow: counts.at(-1)! };
  const count = values.reduce((sum, value) => sum + value.count, 0),
    totalMs = values.reduce((sum, value) => sum + value.totalMs, 0);
  const minimums = values.flatMap((value) => (value.minMs === null ? [] : [value.minMs])),
    maximums = values.flatMap((value) => (value.maxMs === null ? [] : [value.maxMs]));
  return {
    count,
    totalMs,
    meanMs: count ? totalMs / count : null,
    minMs: minimums.length ? Math.min(...minimums) : null,
    maxMs: maximums.length ? Math.max(...maximums) : null,
    p50: bound(histogram, 0.5),
    p95: bound(histogram, 0.95),
    p99: bound(histogram, 0.99),
    histogram,
    repetitionStatistics: {
      meanMs: statistics(values.flatMap((value) => (value.meanMs === null ? [] : [value.meanMs]))),
      medianMs: statistics(
        values.flatMap((value) =>
          value.p50?.estimateMs === null || !value.p50 ? [] : [value.p50.estimateMs],
        ),
      ),
      p95Ms: statistics(
        values.flatMap((value) =>
          value.p95?.estimateMs === null || !value.p95 ? [] : [value.p95.estimateMs],
        ),
      ),
      p99Ms: statistics(
        values.flatMap((value) =>
          value.p99?.estimateMs === null || !value.p99 ? [] : [value.p99.estimateMs],
        ),
      ),
    },
    provisionalP95: count < 100,
    provisionalP99: count < 1000,
    overlap:
      'Histogram quantiles are pooled observations. Repetition mean/range describes run estimates; these are not pooled quantiles. Inclusive durations overlap.',
  };
}

interface CollectedArtifacts {
  cases: Map<
    string,
    {
      directory: string;
      files: Map<string, RecordValue>;
      runId: string;
      generation: number;
    }
  >;
  files: Map<string, RecordValue>;
  safety: Map<string, { caseId: string; path: string }>;
}
/** Resolve existing checksum-verified collection, never list processes or start cases.
 * Completion identity, not a planned worker-local absolute path, locates a case. */
async function collectionRootCases(directory: string) {
  const indexPath = join(directory, 'index.json');
  let source: string;
  try {
    source = await readFile(indexPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  const index = object(JSON.parse(source)),
    found: CollectedArtifacts['cases'] = new Map(),
    declarations = new Map<string, RecordValue>();
  for (const rawJob of array(index.jobs)) {
    const job = object(rawJob);
    if (typeof job.jobId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(job.jobId))
      throw new Error('Invalid collected job identity.');
    const root = join(directory, job.jobId);
    let manifest: RecordValue;
    try {
      manifest = object(await json(join(root, 'manifest.json')));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    if (
      manifest.runId !== job.runId ||
      !Number.isSafeInteger(manifest.generation) ||
      Number(manifest.generation) <= 0
    )
      throw new Error('Collected manifest run/generation identity mismatch.');
    const files = new Map<string, RecordValue>();
    for (const rawFile of array(manifest.files)) {
      const file = object(rawFile);
      if (
        typeof file.path !== 'string' ||
        isAbsolute(file.path) ||
        !contained(root, resolve(root, file.path))
      )
        throw new Error('Collected artifact escapes its owned directory.');
      if (files.has(file.path)) throw new Error('Collected manifest repeats an artifact path.');
      files.set(file.path, file);
      const absolute = resolve(root, file.path);
      if (declarations.has(absolute)) throw new Error('Collected jobs repeat an artifact path.');
      declarations.set(absolute, file);
    }
    for (const [path, file] of files) {
      if (!path.endsWith('/completion.json') && path !== 'completion.json') continue;
      const bytes = await readFile(join(root, path));
      if (digest(bytes) !== file.sha256 || bytes.length !== file.bytes)
        throw new Error('Collected completion checksum/size differs from its manifest.');
      const completion = object(JSON.parse(bytes.toString('utf8')));
      if (typeof completion.caseId !== 'string') continue;
      if (found.has(completion.caseId))
        throw new Error('More than one collected result claims the same frozen case.');
      const prefix = dirname(path),
        caseFiles = new Map<string, RecordValue>();
      for (const [name, item] of files) {
        const suffix = relative(prefix, name);
        if (!isAbsolute(suffix) && suffix !== '..' && !suffix.startsWith('../'))
          caseFiles.set(suffix, item);
      }
      found.set(completion.caseId, {
        directory: join(root, prefix),
        files: caseFiles,
        runId: String(manifest.runId),
        generation: Number(manifest.generation),
      });
    }
  }
  return {
    cases: found,
    files: declarations,
    safety: new Map<string, { caseId: string; path: string }>(),
  };
}
async function collectedCases(directory: string, planHash: unknown) {
  let adapter: RecordValue;
  try {
    adapter = object(await json(join(directory, 'ownership', 'worker-plans', 'index.json')));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return collectionRootCases(directory);
    throw error;
  }
  if (adapter.planHash !== planHash)
    throw new Error('Managed collection adapter differs from the frozen plan.');
  const combined: CollectedArtifacts = { cases: new Map(), files: new Map(), safety: new Map() };
  for (const raw of array(adapter.batches)) {
    const batch = object(raw);
    if (typeof batch.collectedRoot !== 'string' || isAbsolute(batch.collectedRoot))
      throw new Error('A managed batch needs its explicit relative collection root.');
    const root = resolve(directory, batch.collectedRoot);
    if (!contained(directory, root))
      throw new Error('Managed collection root escapes its campaign.');
    const collected = await collectionRootCases(root);
    if (!collected) continue;
    for (const [path, declaration] of collected.files) {
      if (combined.files.has(path)) throw new Error('Managed batches repeat an artifact path.');
      combined.files.set(path, declaration);
    }
    for (const [id, artifacts] of collected.cases) {
      if (
        !array(batch.caseIds).includes(id) &&
        !array(batch.safetyConfigurations)
          .map(object)
          .some((item) => item.caseId === id)
      )
        throw new Error('A collected case is outside its adapter batch.');
      if (combined.cases.has(id)) throw new Error('More than one batch claims the same case.');
      combined.cases.set(id, artifacts);
    }
  }
  for (const raw of array(adapter.safetyCases)) {
    const item = object(raw);
    if (
      typeof item.configuration !== 'string' ||
      typeof item.caseId !== 'string' ||
      typeof item.batchId !== 'string' ||
      typeof item.collectedRoot !== 'string' ||
      typeof item.collectedPath !== 'string' ||
      isAbsolute(item.collectedRoot) ||
      isAbsolute(item.collectedPath)
    )
      throw new Error('Managed safety artifact descriptor is incomplete.');
    const batch = array(adapter.batches)
      .map(object)
      .find((batch) => batch.id === item.batchId);
    if (
      !batch ||
      batch.collectedRoot !== item.collectedRoot ||
      !array(batch.safetyConfigurations)
        .map(object)
        .some(
          (selection) =>
            selection.caseId === item.caseId && selection.configuration === item.configuration,
        )
    )
      throw new Error('Safety artifact differs from its owning batch.');
    const root = resolve(directory, item.collectedRoot),
      path = resolve(root, item.collectedPath);
    if (
      !contained(directory, root) ||
      !contained(root, path) ||
      combined.safety.has(item.configuration)
    )
      throw new Error('Safety artifact path escapes its owner or repeats a configuration.');
    combined.safety.set(item.configuration, { caseId: item.caseId, path });
  }
  return combined;
}
async function loadCase(
  item: ProfilingCase,
  planHash: unknown,
  collected: Awaited<ReturnType<typeof collectedCases>>,
): Promise<CaseArtifacts> {
  const selected = collected?.cases.get(item.id);
  const directory = selected?.directory ?? item.outputDirectory;
  const read = async (name: string) => {
    if (isAbsolute(name) || !contained(directory, resolve(directory, name)))
      throw new Error('Required artifact escapes its case directory.');
    const value = await readFile(join(directory, name));
    const declaration = selected?.files.get(name);
    if (
      selected &&
      (!declaration || digest(value) !== declaration.sha256 || value.length !== declaration.bytes)
    )
      throw new Error(`Collected artifact checksum/size mismatch: ${name}`);
    return value;
  };
  const completionBytes = await read('completion.json');
  const completion = object(JSON.parse(completionBytes.toString('utf8')));
  if (
    completion.caseId !== item.id ||
    completion.source !== item.source ||
    completion.planHash !== planHash ||
    completion.configurationHash !== item.configurationHash
  )
    throw new Error('Completion identity differs from the frozen case.');
  const checksums = object(completion.checksums);
  if (completion.status !== 'completed') {
    let failedPhase: string | null = null;
    try {
      const raw = await read('timeline.json');
      if (checksums['timeline.json'] === digest(raw)) {
        const phases = array(JSON.parse(raw.toString('utf8')))
          .map(record)
          .filter((phase) => phase && !['failed', 'export'].includes(String(phase.phase)));
        failedPhase =
          typeof phases.at(-1)?.phase === 'string' ? String(phases.at(-1)!.phase) : null;
      }
    } catch {
      /* A missing failure artifact stays unavailable. */
    }
    throw new Error(String(completion.reason ?? 'Case did not complete.'), {
      cause: { phase: failedPhase, outcome: completion.status },
    });
  }
  const bodies = new Map<string, Buffer>();
  for (const name of item.requiredArtifacts.filter((name) => name !== 'completion.json')) {
    const value = await read(name);
    if (checksums[name] !== digest(value)) throw new Error(`Case checksum mismatch: ${name}`);
    bodies.set(name, value);
  }
  const body = (name: string) =>
    object(JSON.parse((bodies.get(name) ?? Buffer.alloc(0)).toString('utf8')));
  const manifest = body('manifest.json');
  if (
    manifest.planHash !== planHash ||
    manifest.caseId !== item.id ||
    manifest.source !== item.source ||
    manifest.configurationHash !== item.configurationHash
  )
    throw new Error('Case manifest source/configuration differs from the frozen plan.');
  return {
    directory,
    completionHash: digest(completionBytes),
    completion,
    manifest,
    metrics: body('metrics.json'),
    resources: body('resources.json'),
    workload: body('workload.json'),
    // Keep only later consumers' verified bytes, then release each at decode.
    // Retaining every already-parsed metrics/resource buffer doubles the report.
    files: new Map(
      [...bodies].filter(([name]) => name === 'sql.json' || name === 'profiles/main.cpuprofile'),
    ),
    managedExecution: selected ? { runId: selected.runId, generation: selected.generation } : null,
  };
}
/** Shared read-only locator for summarization and adaptive stage freezing.
 * One indexed collection read serves every case; no raw artifact is copied. */
export async function createCampaignArtifactReader(
  directory: string,
  planHash: unknown,
  safetyCases: unknown = [],
) {
  const collected = await collectedCases(directory, planHash);
  const readSafety = async (configuration: string) => {
    const expected = array(safetyCases)
      .map(object)
      .find((item) => item.configuration === configuration);
    if (!expected || typeof expected.id !== 'string' || typeof expected.source !== 'string')
      throw new Error('Safety configuration is absent from the frozen plan.');
    const location = collected?.safety.get(configuration);
    if (location && location.caseId !== expected.id)
      throw new Error('Safety case identity differs from its frozen plan.');
    const declaration = location ? collected?.files.get(location.path) : undefined;
    if (location && !declaration)
      throw new Error('The managed safety artifact has not been checksum-verified and collected.');
    const path = location
      ? location.path
      : join(directory, 'checks', 'raw', configuration, 'safety.json');
    if (!contained(directory, path)) throw new Error('Safety evidence path escapes its campaign.');
    const raw = await readFile(path);
    if (declaration && (digest(raw) !== declaration.sha256 || raw.length !== declaration.bytes))
      throw new Error('Managed safety artifact checksum/size mismatch.');
    const result = object(JSON.parse(raw.toString('utf8')));
    if (
      result.planHash !== planHash ||
      result.caseId !== expected.id ||
      result.configuration !== configuration ||
      result.source !== expected.source
    )
      throw new Error('Safety artifact source, configuration or plan identity differs.');
    return {
      caseId: expected.id,
      configuration,
      path: relative(directory, path),
      raw,
      sha256: digest(raw),
      result,
      origin: declaration ? 'managed-manifest' : 'local',
    };
  };
  return Object.assign((item: ProfilingCase) => loadCase(item, planHash, collected), {
    safety: readSafety,
  });
}

function campaign(value: unknown): RecordValue | null {
  const item = record(value),
    result = record(record(item?.runtime)?.campaign) ?? record(item?.campaign) ?? item;
  return result && Array.isArray(result.metrics) && typeof result.isolate === 'string'
    ? result
    : null;
}
function captures(artifacts: CaseArtifacts): CaptureRow[] {
  const result: CaptureRow[] = [];
  for (const [index, rawEpisode] of array(artifacts.metrics.episodes).entries()) {
    const episode = object(rawEpisode),
      main = campaign(episode.main);
    if (main)
      result.push({
        episode: index + 1,
        isolate: String(main.isolate),
        artifact: 'metrics.json',
        capture: main,
        worker: null,
        drain: episode.drain,
      });
    for (const rawWorker of array(episode.workers)) {
      const worker = object(rawWorker),
        report = record(worker.report),
        capture = campaign(report?.metrics);
      if (worker.status !== 'collected' || !capture) continue;
      result.push({
        episode: index + 1,
        isolate: String(capture.isolate),
        artifact: 'metrics.json',
        capture,
        worker,
        drain: report?.drain,
      });
    }
  }
  return result;
}
async function sampledCpuAccounts(
  item: ProfilingCase,
  artifacts: CaseArtifacts,
): Promise<RecordValue[]> {
  if (item.mode !== 'cpu') return [];
  const result: RecordValue[] = [];
  const summarize = (value: unknown, isolate: string, episode: number, artifact: string) => {
    try {
      const outer = object(value),
        profile = record(outer.profile) ?? outer;
      if (
        !Array.isArray(profile.nodes) ||
        !Array.isArray(profile.samples) ||
        !Array.isArray(profile.timeDeltas)
      )
        throw new Error('CPU sample coverage is unavailable.');
      const attribution = attributeCpuProfile(profile as Parameters<typeof attributeCpuProfile>[0]);
      result.push({
        caseId: item.id,
        repetition: item.repetition,
        machine: item.hardware.id,
        isolate,
        episode,
        artifact,
        status: 'sampled-unqualified-overhead',
        ...attribution,
      });
    } catch (error) {
      result.push({
        caseId: item.id,
        isolate,
        episode,
        status: 'unavailable',
        reason: String(error),
        artifact,
      });
    }
  };
  try {
    summarize(
      artifactJson(artifacts, 'profiles/main.cpuprofile'),
      'server-main',
      1,
      'profiles/main.cpuprofile',
    );
  } catch (error) {
    result.push({
      caseId: item.id,
      isolate: 'server-main',
      status: 'unavailable',
      reason: String(error),
    });
  }
  for (const [index, episode] of array(artifacts.metrics.episodes).entries())
    for (const rawWorker of array(record(episode)?.workers)) {
      const worker = object(rawWorker),
        report = record(worker.report);
      if (worker.status !== 'collected' || !report) {
        result.push({
          caseId: item.id,
          isolate: worker.isolate,
          episode: index + 1,
          status: 'unavailable',
          reason: worker.reason ?? 'Worker capture was not collected.',
        });
        continue;
      }
      summarize(report.profile, String(worker.isolate), index + 1, 'metrics.json');
    }
  return result;
}
function positiveAssertions(workload: RecordValue) {
  const checks = array(workload.checks).map(record);
  return checks.length > 0 && checks.every((check) => check?.passed === true);
}
function coreRun(item: ProfilingCase, artifacts: CaseArtifacts): OverheadRun {
  const resources = artifacts.resources,
    workload = artifacts.workload,
    execution = executionEvidence(item, artifacts);
  const checksPassed = positiveAssertions(workload);
  // Prefer the explicit useful-work unit chosen by the fixture. Do not add
  // commands, game seconds and item counts into an invented common unit.
  const workUnits = number(resources.workUnits) ?? number(workload.workUnits) ?? NaN;
  return {
    id: item.id,
    repetition: item.repetition,
    nodeCpuMs: number(resources.nodeCpuMs),
    ownedCpuMs: number(resources.ownedCpuMs),
    workUnits,
    commandP95Ms: number(resources.commandP95Ms),
    commandLatencyApplicable: resources.commandLatencyApplicable as boolean,
    stalled: resources.stalled as boolean,
    paused: resources.paused as boolean,
    failures: resources.failures as number,
    quotaCrossings: resources.quotaCrossings as number,
    canonicalHash: typeof workload.canonicalHash === 'string' ? workload.canonicalHash : undefined,
    inputHash: typeof workload.inputHash === 'string' ? workload.inputHash : undefined,
    comparisonIdentity: digest({
      gameSource: item.gameSource,
      toolSource: item.toolSource,
      fixtureHash: item.fixtureHash,
      patch: item.instrumentationPatchHash,
      scenario: item.scenarioId,
      hardware: item.hardware,
      seed: item.seed,
      warmup: item.warmupSeconds,
      measure: item.measureSeconds,
      fixedWork: item.fixedWork,
      drain: item.drainSeconds,
      purpose: item.purpose,
      actualEnvironment: {
        instanceId: execution.machine?.instanceId,
        imageId: execution.machine?.imageId,
        recipe: execution.machine?.environmentRecipe,
        architecture: execution.hardware?.architecture,
        cpuModels:
          typeof execution.hardware?.cpuModel === 'string'
            ? [
                ...new Set(
                  [...execution.hardware.cpuModel.matchAll(/^model name\s*:\s*(.+)$/gm)].map(
                    (match) => match[1],
                  ),
                ),
              ]
            : null,
        cpuOptions: record(execution.machine?.actual)?.cpuOptions,
        kernel: execution.hardware?.kernel,
        cpus: execution.hardware?.cpus,
        cores: execution.hardware?.cores,
        affinity: execution.hardware?.affinity,
        node: artifacts.manifest.node,
        nodeOptions: execution.environment?.nodeOptions,
        heapLimitBytes: execution.environment?.effectiveHeapLimitBytes,
      },
    }),
    completed: artifacts.completion.status === 'completed',
    artifactIntegrity: true,
    assertionsPassed: checksPassed && measurementDrained(item, artifacts),
    sourceVerified:
      execution.verified &&
      artifacts.manifest.source === item.source &&
      artifacts.manifest.sourceArchiveHash === item.sourceArchiveHash &&
      artifacts.manifest.instrumentationPatchHash === item.instrumentationPatchHash,
  };
}

export async function summarizeCampaign(directory: string) {
  const plan = object(await json(join(directory, 'plan.json'))),
    { hash, ...contents } = plan;
  if (hash !== digest(contents)) throw new Error('The frozen plan hash does not match.');
  const cases = plan.cases as ProfilingCase[];
  if (!Array.isArray(cases)) throw new Error('No frozen case matrix.');
  const rawInventory = await json(join(directory, 'inventory.json'));
  if (!Array.isArray(rawInventory) || digest(rawInventory) !== plan.registryHash)
    throw new Error('Frozen inventory identity differs from the plan.');
  const definitions = rawInventory as ProfilingDefinition[];
  if (
    definitions.some(
      (definition) => typeof definition.id !== 'string' || typeof definition.label !== 'string',
    )
  )
    throw new Error('Frozen inventory definitions are incomplete.');
  const readCase = await createCampaignArtifactReader(directory, hash, plan.safetyCases);
  const failures: Array<{
      caseId: string;
      status: 'missing' | 'failed';
      reason: string;
      phase: unknown;
    }> = [],
    hierarchy: RecordValue[] = [],
    artifactsByCase = new Map<string, CaseArtifacts>(),
    coreRuns = new Map<string, OverheadRun>();
  const groups = new Map<
    string,
    {
      id: string;
      configuration: string;
      scenario: string;
      machine: string;
      mode: string;
      episode: number;
      isolate: string;
      account: string;
      values: Distribution[];
      observations: RecordValue[];
      unqualifiedTail: boolean;
    }
  >();
  for (const item of cases) {
    try {
      const artifacts = await readCase(item);
      artifactsByCase.set(item.id, artifacts);
      coreRuns.set(item.id, coreRun(item, artifacts));
    } catch (error) {
      failures.push({
        caseId: item.id,
        status: (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'failed',
        reason: String(error),
        phase:
          record(error instanceof Error ? error.cause : null)?.phase ??
          'artifact-or-completion-unavailable',
      });
    }
  }
  let stage: RecordValue | null = null;
  let stageReason: string | null = null;
  try {
    stage = object(await json(join(directory, 'ownership', 'stage-details.json')));
    const { hash: stageHash, ...body } = stage;
    if (
      stageHash !== digest(body) ||
      stage.planHash !== hash ||
      stage.sourceConfigurationHash !== digest(plan.configurations)
    )
      throw new Error('Adaptive stage source or plan identity differs.');
    const discovery = cases.filter((item) => ['I01', 'I02', 'I03', 'I04'].includes(item.group));
    const evidence = array(stage.evidence).map(object);
    if (
      evidence.length !== discovery.length ||
      new Set(evidence.map((row) => row.caseId)).size !== discovery.length ||
      discovery.some(
        (item) =>
          !artifactsByCase.get(item.id) ||
          !evidence.some(
            (row) =>
              row.caseId === item.id &&
              row.completionHash === artifactsByCase.get(item.id)!.completionHash,
          ),
      )
    )
      throw new Error('Adaptive selection needs the complete unchanged discovery evidence.');
    const definitions = object(stage.groups);
    for (const group of ['I05', 'I06']) {
      const selected = object(definitions[group]),
        ids = array(selected.probeIds);
      if (
        !ids.length ||
        ids.length > 32 ||
        new Set(ids).size !== ids.length ||
        typeof selected.reason !== 'string' ||
        !selected.reason ||
        ids.some((id) => typeof id !== 'string' || !array(plan.candidateProbeIds).includes(id))
      )
        throw new Error(
          'Adaptive selection must name 1–32 unique frozen candidates with its reason.',
        );
    }
  } catch (error) {
    stage = null;
    stageReason = String(error);
  }
  const resolvedIds = (item: ProfilingCase): string[] => {
    if (!['I05', 'I06'].includes(item.group)) return item.probeIds;
    if (!stage) return [];
    const ids = array(object(object(stage.groups)[item.group]).probeIds) as string[];
    const manifest = artifactsByCase.get(item.id)?.manifest;
    if (
      manifest &&
      (manifest.stageHash !== stage.hash || digest(manifest.probeIds) !== digest(ids))
    )
      return [];
    return ids;
  };
  for (const item of cases) {
    const artifacts = artifactsByCase.get(item.id);
    const observed = artifacts ? captures(artifacts) : [];
    for (const id of resolvedIds(item)) {
      const definition = definitions.find((value) => value.id === id);
      if (!definition) throw new Error(`Frozen plan names unknown probe ${id}.`);
      const rows = observed.filter((row) =>
        array(row.capture.metrics).some(
          (raw) => record(raw)?.id === id && !array(record(raw)?.status).includes('disabled'),
        ),
      );
      if (!rows.length)
        hierarchy.push({
          id,
          parent: definition.parent,
          label: definition.label,
          unit: definition.unit,
          caseId: item.id,
          repetition: item.repetition,
          scenario: item.scenarioId,
          mode: item.mode,
          configuration: item.configurationHash,
          machine: item.hardware.id,
          episode: null,
          isolate: null,
          status: artifacts
            ? 'not-exercised-or-unavailable'
            : (failures.find((failure) => failure.caseId === item.id)?.status ?? 'missing'),
          reason: artifacts
            ? 'No selected isolate observation was collected.'
            : failures.find((failure) => failure.caseId === item.id)?.reason,
        });
      for (const row of rows) {
        const metric = object(array(row.capture.metrics).find((raw) => record(raw)?.id === id));
        const drainComplete = drained(row.drain),
          statuses = array(metric.status).map(String),
          eligible = number(metric.eligible),
          completed = number(metric.completed);
        if (!drainComplete && !statuses.includes('censored')) statuses.push('censored');
        const active = distribution(metric.active),
          latency = distribution(metric.latency),
          residual = distribution(metric.derivedExclusiveResidual);
        hierarchy.push({
          id,
          parent: definition.parent,
          label: definition.label,
          unit: definition.unit,
          kind: metric.kind,
          shared: definition.shared,
          caseId: item.id,
          repetition: item.repetition,
          scenario: item.scenarioId,
          mode: item.mode,
          configuration: item.configurationHash,
          machine: item.hardware.id,
          episode: row.episode,
          isolate: row.isolate,
          status: statuses.join(','),
          eligible,
          timed: number(metric.timed),
          completed,
          drain: row.drain ?? null,
          positiveObservation:
            drainComplete &&
            eligible !== null &&
            eligible > 0 &&
            !statuses.includes('failed') &&
            (definition.kind === 'counter' || definition.kind === 'gauge'
              ? array(metric.work).some(finite)
              : completed !== null && completed > 0 && active !== null && latency !== null),
          activeMeanMs: active?.meanMs ?? null,
          latencyMeanMs: latency?.meanMs ?? null,
          p50Ms: latency?.p50?.estimateMs ?? null,
          p95LowerMs: latency?.p95?.lowerMs ?? null,
          p95UpperMs: latency?.p95?.upperMs ?? null,
          p99UpperMs: latency?.p99?.upperMs ?? null,
          windowActivity: metric.windowActivity ?? null,
          reason: metric.reason ?? null,
          metric,
          artifact: relative(join(directory, 'summary'), join(artifacts!.directory, row.artifact)),
          qualification: 'unqualified-overhead',
          workerClockMapping: record(row.worker?.report)?.clockMapping ?? null,
        });
        for (const [account, value] of [
          ['active', active],
          ['latency', latency],
          ['derived-exclusive-residual', residual],
        ] as const) {
          if (!value?.count) continue;
          const key = JSON.stringify([
            id,
            item.configurationHash,
            row.episode,
            row.isolate,
            account,
            row.capture.samplingProbability,
          ]);
          const group = groups.get(key) ?? {
            id,
            configuration: item.configurationHash,
            scenario: item.scenarioId,
            machine: item.hardware.id,
            mode: item.mode,
            episode: row.episode,
            isolate: row.isolate,
            account,
            values: [],
            observations: [],
            unqualifiedTail: false,
          };
          group.values.push(value);
          group.observations.push({
            caseId: item.id,
            repetition: item.repetition,
            eligible,
            completed,
            samplingProbability: row.capture.samplingProbability,
            distribution: value,
            censoring: {
              censored: metric.censored,
              unfinished: metric.unfinishedAtSnapshot,
              carryIn: metric.carryIn,
              completedInDrain: metric.completedInDrain,
            },
            artifact: relative(
              join(directory, 'summary'),
              join(artifacts!.directory, row.artifact),
            ),
          });
          group.unqualifiedTail ||= !drainComplete || metric.observedTailComplete !== true;
          groups.set(key, group);
        }
      }
    }
  }
  const machines = [...new Set(cases.map((item) => item.hardware.id))];
  const coverage = machines.flatMap((machine) =>
    definitions.map((definition) => {
      const requested = cases.filter(
        (item) => item.hardware.id === machine && resolvedIds(item).includes(definition.id),
      );
      const observed = hierarchy.filter(
        (row) =>
          row.machine === machine && row.id === definition.id && row.positiveObservation === true,
      );
      const repetitions = new Set(observed.map((row) => row.repetition));
      const configurations = [...new Set(requested.map((item) => item.configurationHash))],
        complete = configurations.every(
          (configuration) =>
            new Set(
              observed
                .filter((row) => row.configuration === configuration)
                .map((row) => row.repetition),
            ).size === 3,
        );
      return {
        id: definition.id,
        parent: definition.parent,
        label: definition.label,
        machine,
        status: !requested.length
          ? 'not-selected'
          : complete
            ? 'measured-unqualified-overhead'
            : 'missing-or-incomplete',
        repetitions: [...repetitions],
        configurations,
        reason: !requested.length
          ? 'Outside this selected campaign; no implementation or measurement claim.'
          : complete
            ? 'Positive observations collected in all three repeats; source, workload and overhead qualification remain separate.'
            : 'A selected positive measurement or repetition is missing.',
      };
    }),
  );
  let semanticSafety: { passed: boolean; reason: string | null; artifact: string } = {
    passed: false,
    reason: 'No matching profiler-safety proof was supplied.',
    artifact: 'checks/profiler-safety.json',
  };
  try {
    const proof = object(await json(join(directory, semanticSafety.artifact))),
      { hash: proofHash, ...body } = proof;
    const checks = array(proof.checks).map(object);
    if (
      proofHash !== digest(body) ||
      proof.planHash !== hash ||
      proof.sourceConfigurationHash !== digest(plan.configurations) ||
      proof.status !== 'passed' ||
      new Set(checks.map((check) => check.name)).size !== checks.length ||
      checks.some((check) => check.passed !== true) ||
      PROFILER_SAFETY_CHECK_NAMES.some((name) => !checks.some((check) => check.name === name))
    )
      throw new Error('Profiler-safety proof is incomplete or does not match frozen sources.');
    const expectedSafety = array(plan.safetyCases).map(object);
    const evidence = array(proof.evidence).map(object);
    if (
      expectedSafety.length !== 5 ||
      evidence.length !== expectedSafety.length ||
      new Set(evidence.map((item) => item.configuration)).size !== expectedSafety.length
    )
      throw new Error('Profiler-safety proof lacks all frozen configurations.');
    for (const expected of expectedSafety) {
      if (typeof expected.configuration !== 'string')
        throw new Error('Frozen safety configuration is invalid.');
      const observed = await readCase.safety(expected.configuration),
        reference = evidence.find((item) => item.configuration === expected.configuration);
      if (
        !reference ||
        reference.path !== observed.path ||
        reference.sha256 !== observed.sha256 ||
        observed.result.sourceConfigurationHash !== digest(plan.configurations) ||
        observed.result.status !== 'passed' ||
        ((expected.configuration === 'I05' || expected.configuration === 'I06') &&
          (!stage || observed.result.stageHash !== stage.hash))
      )
        throw new Error(
          'Profiler-safety evidence no longer matches its frozen source/stage or manifest.',
        );
    }
    semanticSafety = { ...semanticSafety, passed: true, reason: null };
  } catch (error) {
    semanticSafety = { ...semanticSafety, reason: String(error) };
  }
  const comparisons: RecordValue[] = [];
  for (const item of cases.filter((item) => item.repetition === 1 && item.mode !== 'control')) {
    const repeats = cases.filter((other) => other.configurationHash === item.configurationHash);
    const pairs = repeats.flatMap((other) => {
      const baselineId =
        other.mode === 'disabled' ? other.comparison.baseline : other.comparison.disabled;
      const baseline = baselineId ? coreRuns.get(baselineId) : undefined,
        measured = coreRuns.get(other.id);
      return baseline &&
        measured &&
        (!['I05', 'I06'].includes(other.group) || resolvedIds(other).length)
        ? [{ baseline, measured }]
        : [];
    });
    comparisons.push({
      configuration: item.configurationHash,
      scenario: item.scenarioId,
      mode: item.mode,
      machine: item.hardware.id,
      ...qualifyOverhead(pairs, item.workload.timing !== 'realtime', semanticSafety.passed),
    });
  }
  // Detailed probes are carried by the dormant patch. A fast child pass cannot
  // qualify that patch when its own disabled-versus-untouched comparison failed.
  for (const row of comparisons) {
    if (row.mode === 'disabled') continue;
    const item = cases.find((item) => item.configurationHash === row.configuration),
      disabled = cases.find((candidate) => candidate.id === item?.comparison.disabled),
      prerequisite = comparisons.find(
        (candidate) => candidate.configuration === disabled?.configurationHash,
      );
    if (prerequisite?.status !== 'qualified') {
      row.status = 'unqualified-overhead';
      row.reasons = [
        ...array(row.reasons),
        'The matching disabled-hooks patch has not qualified against untouched source.',
      ];
    }
  }
  const qualifiedConfigurations = new Set(
    comparisons.filter((row) => row.status === 'qualified').map((row) => row.configuration),
  );
  for (const row of hierarchy) {
    const item = cases.find((item) => item.id === row.caseId);
    if (
      item &&
      qualifiedConfigurations.has(item.configurationHash) &&
      !String(row.status).includes('failed')
    ) {
      row.qualification = 'qualified-overhead';
      row.status = String(row.status).replace('unqualified-overhead', 'qualified-overhead');
    }
  }
  for (const row of coverage) {
    const qualified = hierarchy.filter(
      (value) =>
        value.id === row.id &&
        value.machine === row.machine &&
        value.qualification === 'qualified-overhead' &&
        value.positiveObservation === true,
    );
    if (
      row.configurations.length > 0 &&
      row.configurations.every(
        (configuration) =>
          new Set(
            qualified
              .filter((value) => value.configuration === configuration)
              .map((value) => value.repetition),
          ).size === 3,
      )
    ) {
      row.status = 'measured-qualified-overhead';
      row.reason =
        'Positive observations in all three repeats have matched source/workload, safety and overhead evidence; rare-tail limitations remain.';
    }
  }
  const hardwareComparisons = cases
    .filter(
      (item) =>
        item.repetition === 1 && item.comparison.hardwarePartner && item.hardware.id !== 'H0',
    )
    .map((item) => {
      const repeats = cases.filter((other) => other.configurationHash === item.configurationHash),
        reasons: string[] = [];
      const observations = repeats.map((other) => {
        const baselineCase = cases.find((value) => value.id === other.comparison.hardwarePartner),
          base = baselineCase ? coreRuns.get(baselineCase.id) : undefined,
          measured = coreRuns.get(other.id);
        const baselineArtifacts = baselineCase ? artifactsByCase.get(baselineCase.id) : undefined,
          actual = artifactsByCase.get(other.id);
        if (!baselineCase || !base || !measured || !baselineArtifacts || !actual) {
          reasons.push(`${other.id}: paired hardware artifacts are missing.`);
          return { repetition: other.repetition, status: 'missing' };
        }
        const baseExecution = executionEvidence(baselineCase, baselineArtifacts),
          measuredExecution = executionEvidence(other, actual);
        const comparable =
          baselineCase.source === other.source &&
          baselineCase.fixtureHash === other.fixtureHash &&
          digest(baselineCase.workload) === digest(other.workload) &&
          baselineCase.seed === other.seed &&
          baselineCase.samplingSeed === other.samplingSeed &&
          baselineCase.warmupSeconds === other.warmupSeconds &&
          baselineCase.measureSeconds === other.measureSeconds &&
          baselineCase.drainSeconds === other.drainSeconds &&
          baselineCase.mode === other.mode &&
          baselineCase.samplingProbability === other.samplingProbability &&
          digest(baselineCase.probeIds) === digest(other.probeIds) &&
          base.sourceVerified &&
          measured.sourceVerified &&
          baseExecution.environment?.effectiveHeapLimitBytes ===
            measuredExecution.environment?.effectiveHeapLimitBytes &&
          baseExecution.machine?.imageId === measuredExecution.machine?.imageId &&
          baseExecution.machine?.environmentRecipe ===
            measuredExecution.machine?.environmentRecipe &&
          (other.workload.timing === 'realtime' ||
            (base.workUnits === measured.workUnits &&
              Boolean(base.inputHash) &&
              base.inputHash === measured.inputHash &&
              Boolean(base.canonicalHash) &&
              base.canonicalHash === measured.canonicalHash)) &&
          base.assertionsPassed &&
          measured.assertionsPassed;
        if (!comparable)
          reasons.push(
            `${other.id}: verified source, actual machine/heap, workload, probes, phases or positive checks differ.`,
          );
        const baseSeconds = number(baselineArtifacts.resources.elapsedSeconds),
          actualSeconds = number(actual.resources.elapsedSeconds);
        const ratio = (a: number | null, b: number | null) =>
          a !== null && b !== null && a > 0 ? b / a : null;
        const baseCpu =
            base.nodeCpuMs !== null && baseSeconds ? base.nodeCpuMs / (1000 * baseSeconds) : null,
          actualCpu =
            measured.nodeCpuMs !== null && actualSeconds
              ? measured.nodeCpuMs / (1000 * actualSeconds)
              : null;
        const baseThroughput =
            baseSeconds && base.workUnits > 0 ? base.workUnits / baseSeconds : null,
          throughput =
            actualSeconds && measured.workUnits > 0 ? measured.workUnits / actualSeconds : null;
        return {
          repetition: other.repetition,
          baseline: base.id,
          measured: measured.id,
          status: comparable ? 'observed-comparison' : 'incomparable',
          nodeBusyCores: { baseline: baseCpu, measured: actualCpu },
          throughputRatio:
            item.workload.timing === 'realtime' ? null : ratio(baseThroughput, throughput),
          commandP95Ms: { baseline: base.commandP95Ms, measured: measured.commandP95Ms },
          workUnits: { baseline: base.workUnits, measured: measured.workUnits },
          actualWork: {
            // Workload totals can include warmup; compare progress from the
            // same measured window as the CPU and command-latency accounts.
            baseline: {
              ...record(baselineArtifacts.workload.work),
              advancedGameSeconds: number(baselineArtifacts.resources.advancedGameSeconds),
            },
            measured: {
              ...record(actual.workload.work),
              advancedGameSeconds: number(actual.resources.advancedGameSeconds),
            },
          },
          note:
            item.workload.timing === 'realtime'
              ? 'Normal-clock runs compare achieved game time, actual work, command latency and CPU headroom; clock pacing is not a throughput speedup.'
              : 'Equal-work completion speed is meaningful only with identical canonical inputs and effects.',
        };
      });
      return {
        configuration: item.configurationHash,
        baselineMachine: 'H0',
        machine: item.hardware.id,
        scenario: item.scenarioId,
        mode: item.mode,
        status:
          reasons.length || observations.length !== 3
            ? 'incomplete-or-incomparable'
            : 'observed-not-capacity-proof',
        reasons,
        observations,
      };
    });
  const unresolvedStages = cases
    .filter((item) => ['I05', 'I06'].includes(item.group) && !resolvedIds(item).length)
    .map((item) => ({
      caseId: item.id,
      group: item.group,
      status: 'unresolved-selection',
      reason:
        stageReason ??
        'The case manifest does not match the frozen adaptive stage; no probe was inferred or run.',
    }));
  const cpuAccounts: RecordValue[] = [],
    sqlAccounts: RecordValue[] = [];
  for (const item of cases) {
    const artifacts = artifactsByCase.get(item.id);
    if (!artifacts) continue;
    cpuAccounts.push(...(await sampledCpuAccounts(item, artifacts)));
    if (item.mode === 'sql') {
      try {
        sqlAccounts.push({
          caseId: item.id,
          machine: item.hardware.id,
          repetition: item.repetition,
          data: artifactJson(artifacts, 'sql.json'),
          overlap:
            'Query client latency, queue wait/hold, transaction duration and decode overlap; do not add them as CPU.',
        });
      } catch (error) {
        sqlAccounts.push({ caseId: item.id, status: 'unavailable', reason: String(error) });
      }
    }
  }
  const measurementGaps: RecordValue[] = cpuAccounts.filter((row) => row.status === 'unavailable');
  for (const [caseId, artifacts] of artifactsByCase)
    for (const [episode, raw] of array(artifacts.metrics.episodes).entries()) {
      const entry = object(raw),
        main = campaign(entry.main);
      const item = cases.find((candidate) => candidate.id === caseId);
      if (item && item.mode !== 'control' && item.mode !== 'disabled' && !drained(entry.drain))
        measurementGaps.push({
          caseId,
          episode: episode + 1,
          isolate: main?.isolate ?? 'server-main',
          status: 'incomplete-drain',
          drain: entry.drain ?? null,
        });
      if (main && array(main.failures).length)
        measurementGaps.push({
          caseId,
          episode: episode + 1,
          isolate: main.isolate,
          status: 'failed-capture',
          reasons: main.failures,
        });
      for (const rawWorker of array(entry.workers)) {
        const worker = object(rawWorker),
          result = record(worker.report);
        if (
          worker.status !== 'collected' ||
          !drained(result?.drain) ||
          array(result?.failures).length ||
          record(result)?.status === 'failed'
        )
          measurementGaps.push({
            caseId,
            episode: episode + 1,
            isolate: worker.isolate,
            status: 'unavailable-worker-capture',
            reason: worker.reason ?? result?.reason ?? result?.failures,
            drain: result?.drain ?? null,
          });
      }
    }
  const report = {
    planHash: hash,
    source: { game: plan.gameSource, tools: plan.toolSource },
    status:
      failures.length ||
      unresolvedStages.length ||
      measurementGaps.length ||
      coverage.some((row) => row.status === 'missing-or-incomplete')
        ? 'incomplete'
        : 'measurements-collected-not-automatically-qualified',
    runCounts: {
      requested: cases.length,
      completed: artifactsByCase.size,
      failedOrMissing: failures.length,
    },
    failures,
    unresolvedStages,
    coverage,
    comparisons,
    semanticSafety,
    hardwareComparisons,
    cpuAccounts,
    sqlAccounts,
    measurementGaps,
    resources: [...artifactsByCase].map(([caseId, value]) => ({
      caseId,
      resources: value.resources,
      workload: value.workload,
      artifact: relative(join(directory, 'summary'), join(value.directory, 'resources.json')),
    })),
    distributions: [...groups.values()].map(
      ({ values, observations, unqualifiedTail, ...group }) => {
        const pooled = mergeDistributions(values),
          overheadQualified = qualifiedConfigurations.has(group.configuration),
          threeRepeats = new Set(observations.map((row) => row.repetition)).size === 3;
        const p95Qualified =
          overheadQualified &&
          threeRepeats &&
          !unqualifiedTail &&
          pooled !== null &&
          !pooled.provisionalP95;
        const p99Qualified =
          overheadQualified &&
          threeRepeats &&
          !unqualifiedTail &&
          pooled !== null &&
          !pooled.provisionalP99;
        return {
          ...group,
          pooled,
          individual: observations,
          overheadQualified,
          p95Qualified,
          p99Qualified,
          tailQualified: p95Qualified && p99Qualified,
          qualification: unqualifiedTail
            ? 'Censoring, incomplete observations or overflow prevents full-tail qualification.'
            : overheadQualified
              ? 'Completed observations with qualified overhead; pooled provisionalP95/provisionalP99 still apply.'
              : 'Completed observations; overhead remains unqualified.',
        };
      },
    ),
    qualifications: [
      'No missing case is launched by summarize.',
      'Every isolate/episode and active/latency/residual account stays separate.',
      'Node process CPU already includes its workers; owned total adds only dedicated PostgreSQL, excluding the separately measured driver.',
      'CPU, waiting, allocations, retained bytes and write amplification have distinct units.',
      'Unqualified instrumentation is not clean operating evidence. Unknown values are not zero.',
      'Not-selected inventory rows are deferred, not failed gameplay features.',
      'Expected fault journeys can complete only when their positive acceptance assertions pass.',
    ],
  };
  const output = join(directory, 'summary');
  await mkdir(output, { recursive: true, mode: 0o700 });
  const write = (path: string, value: string) =>
    writeFile(join(output, path), value, { mode: 0o600 });
  const columns = [
    'id',
    'parent',
    'label',
    'unit',
    'caseId',
    'repetition',
    'scenario',
    'mode',
    'machine',
    'episode',
    'isolate',
    'status',
    'eligible',
    'timed',
    'completed',
    'activeMeanMs',
    'latencyMeanMs',
    'p50Ms',
    'p95LowerMs',
    'p95UpperMs',
    'p99UpperMs',
    'reason',
    'artifact',
  ];
  await write(
    'hierarchy.csv',
    [
      columns.map(csv).join(','),
      ...hierarchy.map((row) => columns.map((key) => csv(row[key])).join(',')),
    ].join('\n') + '\n',
  );
  await write(
    'coverage.csv',
    [
      'id,parent,label,machine,status,repetitions,reason',
      ...coverage.map((row) =>
        [
          row.id,
          row.parent,
          row.label,
          row.machine,
          row.status,
          row.repetitions.join(';'),
          row.reason,
        ]
          .map(csv)
          .join(','),
      ),
    ].join('\n') + '\n',
  );
  await write(
    'comparisons.csv',
    [
      'configuration,scenario,machine,mode,status,reasons',
      ...comparisons.map((row) =>
        [
          row.configuration,
          row.scenario,
          row.machine,
          row.mode,
          row.status,
          array(row.reasons).join('; '),
        ]
          .map(csv)
          .join(','),
      ),
    ].join('\n') + '\n',
  );
  await write('report.json', JSON.stringify(report, null, 2) + '\n');
  await write(
    'report.html',
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Server/world profile</title><style>body{font:15px system-ui;margin:2rem;color:#182126}table{border-collapse:collapse;width:100%}td,th{padding:.4rem;text-align:left;border-bottom:1px solid #ddd}input{padding:.5rem;max-width:100%;width:28rem}caption{text-align:left;margin:1rem 0}tr[hidden]{display:none}.scroll{overflow:auto}</style><h1>Server/world profile</h1><p>${escape(report.status)}. ${report.runCounts.completed}/${cases.length} completed cases. Inclusive times overlap; missing data is never zero.</p><label>Filter operation, scenario, machine or status <input id="filter" type="search"></label><div class="scroll"><table><caption>Direct operation measurements; each repetition, episode and isolate remains visible</caption><thead><tr><th>Operation</th><th>Case/isolate</th><th>Unit</th><th>Status</th><th>Count</th><th>Active mean ms</th><th>Latency p95 bounds ms</th></tr></thead><tbody>${hierarchy.map((row) => `<tr><td>${escape(row.label)} <small>${escape(row.id)}</small></td><td>${escape(row.scenario)} / ${escape(row.machine)} / ${escape(row.mode)} / ${escape(row.repetition)} / ${escape(row.isolate)}</td><td>${escape(row.unit)}</td><td>${escape(row.status)}</td><td>${escape(row.completed ?? 'unavailable')}</td><td>${escape(row.activeMeanMs ?? 'unavailable')}</td><td>${row.artifact ? `<a href="${escape(row.artifact)}">` : ''}${escape(row.p95LowerMs ?? 'unavailable')}–${escape(row.p95UpperMs ?? 'unavailable')}${row.artifact ? '</a>' : ''}</td></tr>`).join('')}</tbody></table></div><p><a href="report.json">Full distributions, resources, hardware and limitations</a> · <a href="coverage.csv">Coverage</a> · <a href="comparisons.csv">Comparisons</a></p><script>document.querySelector('#filter').addEventListener('input',e=>{let q=e.target.value.toLowerCase();for(let r of document.querySelectorAll('tbody tr'))r.hidden=!r.textContent.toLowerCase().includes(q)});</script></html>`,
  );
  await writeFile(
    join(directory, 'README.md'),
    `# Hierarchical server/world campaign\n\nStatus: **${report.status}**. ${report.runCounts.completed}/${cases.length} cases completed.\n\n[Local report](summary/report.html), [coverage](summary/coverage.csv), [comparisons](summary/comparisons.csv).\n\nNo absent measurement has been run or replaced. Missing artifacts, unresolved adaptive selection, failed starts and incomplete qualification remain in report.json. Raw private artifacts stay in this directory.\n`,
    { mode: 0o600 },
  );
  return report;
}
