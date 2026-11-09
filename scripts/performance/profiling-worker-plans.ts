/** Offline adapter to the maintained worker owner. No dispatch, allocation, AWS
 * client or new runner lives here. docs/performance/hierarchical-profiling.md#7-hardware-comparisons */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, rm, rename } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { CAMPAIGN_SCHEDULING, digest, HARDWARE } from './profiling-plan.js';
import type { DetailedStage } from './profiling-plan.js';
import type { HardwareId, ProfilingCase } from './profiling-types.js';

const execute = promisify(execFile);
type Json = Record<string, unknown>;
const safetyConfigurations = ['control', 'disabled', 'selected', 'I05', 'I06'] as const;
type SafetyConfiguration = (typeof safetyConfigurations)[number];
interface SafetyCase {
  id: string;
  configuration: SafetyConfiguration;
  source: string;
  hardDeadlineSeconds: number;
  requiredArtifacts: string[];
}
export interface WorkerPriceQuote {
  instanceType: string;
  hourlyUsd: number;
  observedAt: string;
  source: string;
}
export interface H0HeapProof {
  caseDirectory: string;
  completionHash: string;
  nodeHeapMiB: number;
  defaultHeapLimitBytes: number;
  explicitHeapLimitBytes: number;
}
export interface H0Worker {
  repetition: 1 | 2 | 3;
  workerId: string;
  instanceId: string;
}
export interface WorkerPlanningInput {
  taskId: string;
  cloudAllocationId: string;
  runnerCheckout: string;
  runnerCommit: string;
  priceQuotes?: Partial<Record<HardwareId, WorkerPriceQuote>>;
  /** Values copied from the existing deployed runner's local pool configuration.
   * Retained-volume cost is not silently guessed from the compute quotation. */
  runnerCostConfig?: {
    hourlyMicroUsd: number;
    storageMicroUsd: number;
    imageId?: string;
    warmSlots?: number;
  };
  h0HeapProof?: H0HeapProof;
  /** The same three registered instances serve each repetition's controls and
   * later selected probes. A changed instance requires a new comparison block. */
  h0Workers?: H0Worker[];
}
interface WorkerBatchDefinition {
  id: string;
  kind: 'safety' | 'measurement';
  configurations: readonly SafetyConfiguration[];
  groups: readonly string[];
  repetitions: readonly (1 | 2 | 3)[];
  machine: HardwareId;
  h0Repetition?: 1 | 2 | 3;
  dependencies: readonly string[];
}
interface WorkerBatch {
  id: string;
  kind: WorkerBatchDefinition['kind'];
  machine: HardwareId;
  h0Repetition: 1 | 2 | 3 | null;
  workerAffinity: Pick<H0Worker, 'workerId' | 'instanceId'> | null;
  caseIds: string[];
  safetyConfigurations: { configuration: SafetyConfiguration; caseId: string }[];
  dependsOnBatches: string[];
  serial: boolean;
  concurrency: number;
  jobs: { id: string; caseIds: string[] }[];
  status: 'blocked' | 'offline-plan-valid';
  blockers: string[];
  timeoutSeconds: number;
  deadlineSeconds: number;
  reservationEstimate: ReturnType<MaintainedCosts['campaignEstimate']> | null;
  runnerPlan: string | null;
  blockedTemplate: string | null;
  collectedRoot: string;
  collectedCasePattern: string;
}
interface FrozenPlan extends Json {
  id: string;
  hash: string;
  outputDirectory: string;
  limitUsd: number;
  authorizationRef: string;
  configurations: unknown;
  cases: ProfilingCase[];
  safetyCases: SafetyCase[];
  candidateProbeIds: string[];
  includePopulation?: boolean;
}
interface MaintainedContracts {
  campaign(value: unknown): unknown;
  id(value: unknown): string;
  defaults: { outputLimitBytes: number; diskLimitBytes: number; cleanupMs: number };
}
interface MaintainedCosts {
  campaignSummary(value: unknown): unknown;
  campaignEstimate(
    summary: unknown,
    config: unknown,
    workers?: readonly {
      workerId: string;
      instanceId: string;
      instanceType: string;
      imageId?: string;
    }[],
    at?: number,
  ): { totalMicroUsd: number; [key: string]: number };
}
const record = (value: unknown): Json => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Expected a profiling admission object.');
  return value as Json;
};
const checksum = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const complete = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
async function json(path: string): Promise<Json> {
  return record(JSON.parse(await readFile(path, 'utf8')));
}
async function optionalJson(path: string) {
  try {
    return await json(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}
async function publish(path: string, value: unknown) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  try {
    await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}
function frozen(value: Json): FrozenPlan {
  const { hash, ...body } = value;
  if (
    !checksum(hash) ||
    digest(body) !== hash ||
    !Array.isArray(value.cases) ||
    !Array.isArray(value.candidateProbeIds)
  )
    throw new Error('The frozen campaign plan changed or is incomplete.');
  const plan = value as FrozenPlan;
  if (!plan.scheduling || digest(plan.scheduling) !== digest(CAMPAIGN_SCHEDULING))
    throw new Error(
      'Freeze the campaign with three exact-instance H0 repetition blocks before admission.',
    );
  if (
    plan.cases.length !== (plan.includePopulation ? 30 : 27) ||
    !Number.isFinite(plan.limitUsd) ||
    plan.limitUsd <= 0 ||
    plan.limitUsd > 100
  )
    throw new Error(
      'Only the accepted 27-run plan and explicit three-run population extension are supported.',
    );
  const ids = new Set<string>();
  for (const item of plan.cases) {
    if (ids.has(item.id) || !complete(item.source) || item.hardDeadlineSeconds !== 630)
      throw new Error('Duplicate, unpinned or differently bounded frozen case.');
    ids.add(item.id);
  }
  if (!Array.isArray(plan.safetyCases) || plan.safetyCases.length !== safetyConfigurations.length)
    throw new Error('The frozen plan must retain its five separate non-timing safety cases.');
  const configurations = record(plan.configurations);
  for (const configuration of safetyConfigurations) {
    const item = plan.safetyCases.find((candidate) => candidate.configuration === configuration),
      source = record(configurations[configuration === 'control' ? 'control' : 'instrumented']);
    if (
      !item ||
      item.id !== `Q-${configuration}` ||
      ids.has(item.id) ||
      item.source !== source.commit ||
      !complete(item.source) ||
      item.hardDeadlineSeconds !== 630 ||
      JSON.stringify(item.requiredArtifacts) !== JSON.stringify(['safety.json'])
    )
      throw new Error('Safety cases must match the exact frozen source, artifacts and deadline.');
    ids.add(item.id);
  }
  return plan;
}
function stageFor(plan: FrozenPlan, value: Json | null): DetailedStage | null {
  if (!value) return null;
  const { hash, ...body } = value;
  if (
    digest(body) !== hash ||
    value.planHash !== plan.hash ||
    value.sourceConfigurationHash !== digest(plan.configurations)
  )
    throw new Error('Detailed stage does not belong to this exact frozen plan and source.');
  const stage = value as unknown as DetailedStage;
  const discovery = plan.cases.filter((item) => ['I01', 'I02', 'I03', 'I04'].includes(item.group));
  if (
    !Array.isArray(stage.evidence) ||
    stage.evidence.length !== discovery.length ||
    new Set(stage.evidence.map((entry) => entry.caseId)).size !== discovery.length ||
    discovery.some(
      (item) =>
        !stage.evidence.some((entry) => entry.caseId === item.id && checksum(entry.completionHash)),
    )
  )
    throw new Error('Detailed stage requires all twelve completed discovery witnesses.');
  for (const group of ['I05', 'I06'] as const) {
    const choice = stage.groups?.[group];
    if (
      !choice ||
      !choice.reason ||
      !Array.isArray(choice.probeIds) ||
      !choice.probeIds.length ||
      choice.probeIds.length > 32 ||
      new Set(choice.probeIds).size !== choice.probeIds.length ||
      choice.probeIds.some((id) => !plan.candidateProbeIds.includes(id))
    )
      throw new Error(`${group} is not an exact bounded frozen probe selection.`);
  }
  if (JSON.stringify(stage.groups.I05.probeIds) === JSON.stringify(stage.groups.I06.probeIds))
    throw new Error('The detailed probe groups must address different measured work.');
  return stage;
}
async function heapFor(plan: FrozenPlan, proof: H0HeapProof | undefined) {
  if (!proof) return null;
  if (
    !isAbsolute(proof.caseDirectory) ||
    !checksum(proof.completionHash) ||
    !Number.isSafeInteger(proof.nodeHeapMiB) ||
    proof.nodeHeapMiB < 128 ||
    proof.nodeHeapMiB > 12288 ||
    !Number.isSafeInteger(proof.defaultHeapLimitBytes) ||
    proof.defaultHeapLimitBytes <= 0 ||
    proof.explicitHeapLimitBytes !== proof.defaultHeapLimitBytes
  )
    throw new Error(
      'H0 heap proof must map an explicit old-space setting to the actual unchanged default heap.',
    );
  const completionBytes = await readFile(join(proof.caseDirectory, 'completion.json'));
  if (digest(completionBytes) !== proof.completionHash)
    throw new Error('H0 completion differs from the supplied heap witness.');
  const completion = record(JSON.parse(completionBytes.toString('utf8')));
  const item = plan.cases.find(
    (item) => item.id === completion.caseId && item.group === 'I01' && item.hardware.id === 'H0',
  );
  if (
    !item ||
    completion.status !== 'completed' ||
    completion.source !== item.source ||
    completion.planHash !== plan.hash ||
    completion.configurationHash !== item.configurationHash
  )
    throw new Error('The heap witness must be a completed untouched H0 opening case.');
  const manifestBytes = await readFile(join(proof.caseDirectory, 'manifest.json'));
  if (record(completion.checksums)['manifest.json'] !== digest(manifestBytes))
    throw new Error('H0 manifest checksum differs from its completed case.');
  const manifest = record(JSON.parse(manifestBytes.toString('utf8'))),
    environment = record(manifest.environment),
    observed = record(environment.heapProof);
  if (
    manifest.planHash !== plan.hash ||
    manifest.caseId !== item.id ||
    manifest.source !== item.source ||
    manifest.sourceArchiveHash !== item.sourceArchiveHash ||
    manifest.configurationHash !== item.configurationHash ||
    observed.defaultNodeOptions !== null ||
    observed.nodeHeapMiB !== proof.nodeHeapMiB ||
    observed.defaultHeapLimitBytes !== proof.defaultHeapLimitBytes ||
    observed.explicitHeapLimitBytes !== proof.explicitHeapLimitBytes
  )
    throw new Error('H0 default/equivalent explicit heap evidence is missing or does not match.');
  return {
    planHash: plan.hash,
    caseId: item.id,
    completionHash: proof.completionHash,
    manifestHash: digest(manifestBytes),
    nodeHeapMiB: proof.nodeHeapMiB,
    defaultHeapLimitBytes: proof.defaultHeapLimitBytes,
    explicitHeapLimitBytes: proof.explicitHeapLimitBytes,
  };
}
function validQuote(
  quote: WorkerPriceQuote | undefined,
  instanceType: string,
  now: number,
): string | null {
  if (!quote) return 'A current type-specific Linux On-Demand price observation is required.';
  if (
    quote.instanceType !== instanceType ||
    !Number.isFinite(quote.hourlyUsd) ||
    quote.hourlyUsd <= 0 ||
    !quote.source ||
    !Number.isFinite(Date.parse(quote.observedAt))
  )
    throw new Error('Malformed or mismatched machine price observation.');
  const age = now - Date.parse(quote.observedAt);
  return age < 0 || age > 86400000
    ? 'The machine price observation must come from the preceding 24-hour admission window.'
    : null;
}

function scheduleWorkerBatches(
  batches: readonly {
    id: string;
    deadlineSeconds: number;
    dependsOnBatches: readonly string[];
    concurrency: number;
  }[],
  concurrency: number,
) {
  const byId = new Map(batches.map((batch) => [batch.id, batch])),
    critical = new Map<string, number>(),
    visiting = new Set<string>();
  const remainingChain = (id: string): number => {
    const known = critical.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) throw new Error('Worker batch dependency cycle.');
    const batch = byId.get(id);
    if (!batch) throw new Error('Worker batch dependency is missing.');
    visiting.add(id);
    const duration =
      batch.deadlineSeconds +
      Math.max(
        0,
        ...batches
          .filter((candidate) => candidate.dependsOnBatches.includes(id))
          .map((candidate) => remainingChain(candidate.id)),
      );
    visiting.delete(id);
    critical.set(id, duration);
    return duration;
  };
  for (const batch of batches) {
    if (batch.concurrency > concurrency)
      throw new Error('The initial safety bootstrap requires three concurrent workers.');
    for (const dependency of batch.dependsOnBatches)
      if (!byId.has(dependency)) throw new Error('Worker batch dependency is missing.');
    remainingChain(batch.id);
  }
  const lanes = Array.from({ length: concurrency }, () => ({
      available: 0,
      batches: [] as Array<{ id: string; startSeconds: number; endSeconds: number }>,
    })),
    pending = [...batches],
    done = new Map<string, number>();
  while (pending.length) {
    const ready = pending
      .filter((batch) => batch.dependsOnBatches.every((id) => done.has(id)))
      .map((batch) => {
        const assigned = [...lanes]
          .sort((a, b) => a.available - b.available)
          .slice(0, batch.concurrency);
        return {
          batch,
          assigned,
          start: Math.max(
            ...assigned.map((lane) => lane.available),
            ...batch.dependsOnBatches.map((id) => done.get(id)!),
          ),
        };
      })
      .sort(
        (a, b) =>
          a.start - b.start ||
          critical.get(b.batch.id)! - critical.get(a.batch.id)! ||
          a.batch.id.localeCompare(b.batch.id),
      );
    const next = ready[0];
    if (!next) throw new Error('Worker batch dependencies cannot be scheduled.');
    const end = next.start + next.batch.deadlineSeconds;
    for (const lane of next.assigned) {
      lane.batches.push({ id: next.batch.id, startSeconds: next.start, endSeconds: end });
      lane.available = end;
    }
    done.set(next.batch.id, end);
    pending.splice(pending.indexOf(next.batch), 1);
  }
  return {
    concurrency,
    deadlineEnvelopeSeconds: Math.max(...lanes.map((lane) => lane.available)),
    lanes,
    assumptions:
      'The initial safety batch holds three workers concurrently; later batches each hold one exclusive worker for their serial cases. Every batch includes its 600-second staging/assignment allowance. Dependency-ready jobs prioritize the longest remaining chain. Actual setup, capacity and manual selection/collection delays are unmeasured; this is an offline deadline envelope, not a runtime forecast or dispatch authorization.',
  };
}

/** Generate bounded, reviewable plans only. The maintained runner still owns live
 * admission, allocation, current prices/capacity, claims, artifacts and cleanup. */
export async function writeWorkerPlans(planDirectory: string, input: WorkerPlanningInput) {
  if (
    !isAbsolute(planDirectory) ||
    !isAbsolute(input.runnerCheckout) ||
    !complete(input.runnerCommit)
  )
    throw new Error(
      'Absolute campaign/runner paths and an exact maintained-runner commit are required.',
    );
  const directory = resolve(planDirectory),
    plan = frozen(await json(join(directory, 'plan.json')));
  if (resolve(plan.outputDirectory) !== directory)
    throw new Error('Use the frozen campaign output directory, not a relocated or partial plan.');
  for (const [path, expectedHash] of [
    ['inventory.json', plan.registryHash],
    ['source/safety-inventory.json', plan.safetyRegistryHash],
  ] as const) {
    const inventory: unknown = JSON.parse(await readFile(join(directory, path), 'utf8'));
    if (!Array.isArray(inventory) || digest(inventory) !== expectedHash)
      throw new Error(`Frozen campaign inventory changed: ${path}.`);
  }
  const runner = resolve(input.runnerCheckout);
  const head = (await execute('git', ['rev-parse', 'HEAD'], { cwd: runner })).stdout.trim();
  if (head !== input.runnerCommit)
    throw new Error('The maintained runner checkout differs from the selected commit.');
  const dirty = (
    await execute('git', ['status', '--porcelain', '--', 'scripts/verification-workers'], {
      cwd: runner,
    })
  ).stdout;
  if (dirty.trim())
    throw new Error('Pin committed maintained-runner source before generating its plans.');
  const contracts = (await import(
    pathToFileURL(join(runner, 'scripts/verification-workers/contracts.mjs')).href
  )) as MaintainedContracts;
  const costs = (await import(
    pathToFileURL(join(runner, 'scripts/verification-workers/campaigns.mjs')).href
  )) as MaintainedCosts;
  contracts.id(input.taskId);
  contracts.id(input.cloudAllocationId);
  const h0Workers = new Map<number, H0Worker>();
  if (input.h0Workers !== undefined) {
    if (
      !Array.isArray(input.h0Workers) ||
      input.h0Workers.length !== 3 ||
      new Set(input.h0Workers.map((worker) => worker.repetition)).size !== 3 ||
      new Set(input.h0Workers.map((worker) => worker.workerId)).size !== 3 ||
      new Set(input.h0Workers.map((worker) => worker.instanceId)).size !== 3 ||
      input.h0Workers.some(
        (worker) =>
          ![1, 2, 3].includes(worker.repetition) ||
          !/^slot-[1-9]\d*$/.test(worker.workerId) ||
          !/^i-(?:[0-9a-f]{8}|[0-9a-f]{17})$/.test(worker.instanceId),
      )
    )
      throw new Error(
        'H0 repetition blocks require three distinct registered workers and instances.',
      );
    for (const worker of input.h0Workers)
      h0Workers.set(worker.repetition, {
        repetition: worker.repetition,
        workerId: worker.workerId,
        instanceId: worker.instanceId,
      });
  }
  const pinnedWorkers = [...h0Workers.values()].sort((a, b) => a.repetition - b.repetition);
  const previousAdapter = await optionalJson(join(directory, 'ownership/worker-plans/index.json'));
  if (
    previousAdapter &&
    (previousAdapter.planHash !== plan.hash ||
      (Array.isArray(previousAdapter.h0Workers) &&
        previousAdapter.h0Workers.length > 0 &&
        digest(previousAdapter.h0Workers) !== digest(pinnedWorkers)))
  )
    throw new Error('The frozen campaign cannot change its pinned H0 comparison hosts.');
  const stage = stageFor(plan, await optionalJson(join(directory, 'ownership/stage-details.json')));
  const heap = await heapFor(plan, input.h0HeapProof);
  if (heap) await publish(join(directory, 'ownership/h0-heap-proof.json'), heap);
  const costConfig = input.runnerCostConfig;
  if (
    costConfig &&
    (!Number.isSafeInteger(costConfig.hourlyMicroUsd) ||
      costConfig.hourlyMicroUsd <= 0 ||
      !Number.isSafeInteger(costConfig.storageMicroUsd) ||
      costConfig.storageMicroUsd <= 0 ||
      (costConfig.warmSlots !== undefined &&
        (!Number.isSafeInteger(costConfig.warmSlots) || costConfig.warmSlots < 0)))
  )
    throw new Error(
      'Supply exact positive integer compute/retained-storage configuration from the maintained runner.',
    );
  const warmSlots = costConfig?.warmSlots;
  const retainedH0 =
    warmSlots !== undefined &&
    pinnedWorkers.length === 3 &&
    pinnedWorkers.every((worker) => Number(worker.workerId.slice(5)) <= warmSlots);
  const repetitions = [1, 2, 3] as const,
    discoveryBatches = repetitions.map((repetition) => `h0-discovery-r${repetition}`);
  const definitions: WorkerBatchDefinition[] = [
    {
      id: 'h0-safety-initial',
      kind: 'safety',
      configurations: ['control', 'disabled', 'selected'],
      groups: [],
      repetitions: [],
      machine: 'H0',
      dependencies: [],
    },
    ...repetitions.map(
      (repetition): WorkerBatchDefinition => ({
        id: `h0-discovery-r${repetition}`,
        kind: 'measurement',
        configurations: [],
        groups: ['I01', 'I02', 'I03', 'I04'],
        repetitions: [repetition],
        machine: 'H0',
        h0Repetition: repetition,
        dependencies: ['h0-safety-initial'],
      }),
    ),
    {
      id: 'h0-safety-details',
      kind: 'safety',
      configurations: ['I05', 'I06'],
      groups: [],
      repetitions: [],
      machine: 'H0',
      h0Repetition: 1,
      dependencies: discoveryBatches,
    },
    ...repetitions.map(
      (repetition): WorkerBatchDefinition => ({
        id: `h0-details-r${repetition}`,
        kind: 'measurement',
        configurations: [],
        groups: ['I05', 'I06', 'I07'],
        repetitions: [repetition],
        machine: 'H0',
        h0Repetition: repetition,
        dependencies: [...discoveryBatches, 'h0-safety-details'],
      }),
    ),
    {
      id: 'h1-control',
      kind: 'measurement',
      configurations: [],
      groups: ['I08'],
      repetitions,
      machine: 'H1',
      dependencies: discoveryBatches,
    },
    {
      id: 'h2-control',
      kind: 'measurement',
      configurations: [],
      groups: ['I09'],
      repetitions,
      machine: 'H2',
      dependencies: discoveryBatches,
    },
    ...(plan.includePopulation
      ? [
          {
            id: 'h0-population',
            kind: 'measurement' as const,
            configurations: [],
            groups: ['I10'],
            repetitions,
            machine: 'H0' as const,
            h0Repetition: 1 as const,
            dependencies: repetitions.map((repetition) => `h0-details-r${repetition}`),
          },
        ]
      : []),
  ];
  const generatedAt = Date.now(),
    prepared = [];
  for (const definition of definitions) {
    const bootstrap = definition.id === 'h0-safety-initial';
    const groups = new Set<string>(definition.groups);
    const selectedRepetitions = new Set<number>(definition.repetitions);
    const timedCases = plan.cases
      .filter((item) => groups.has(item.group) && selectedRepetitions.has(item.repetition))
      .sort((a, b) => a.repetition - b.repetition || a.group.localeCompare(b.group));
    const selectedSafety = new Set<string>(definition.configurations);
    const safetyCases = plan.safetyCases.filter((item) => selectedSafety.has(item.configuration));
    if (
      timedCases.length !== definition.groups.length * definition.repetitions.length ||
      safetyCases.length !== definition.configurations.length
    )
      throw new Error(
        'Each batch must contain exactly its declared frozen repetitions and checks.',
      );
    for (const group of definition.groups)
      for (const repetition of definition.repetitions) {
        const item = timedCases.find(
          (candidate) => candidate.group === group && candidate.repetition === repetition,
        );
        if (!item || item.id !== `${group}-${definition.machine}-r${repetition}`)
          throw new Error(
            'The managed adapter cannot alter the selected matrix or its repetition identities.',
          );
        contracts.id(item.id);
      }
    const machine = HARDWARE.find((candidate) => candidate.id === definition.machine)!,
      workerAffinity =
        definition.h0Repetition === undefined ? undefined : h0Workers.get(definition.h0Repetition),
      quote = input.priceQuotes?.[machine.id],
      blockers: string[] = [];
    if (machine.id === 'H0' && !bootstrap && !workerAffinity)
      blockers.push(
        'Pin all three H0 repetition blocks to distinct registered worker/instance identities.',
      );
    if (machine.id === 'H0' && (bootstrap ? warmSlots === undefined || warmSlots < 3 : !retainedH0))
      blockers.push('Confirm warm-slot retention covers the pinned H0 host across both stages.');
    for (const item of timedCases)
      if (
        item.hardware.id !== machine.id ||
        item.hardware.instanceType !== machine.instanceType ||
        item.hardware.vcpus !== machine.vcpus ||
        item.hardware.memoryMiB !== machine.memoryMiB ||
        item.hardware.limits !== undefined
      )
        throw new Error('Frozen hardware differs from the selected uncontrolled machine profile.');
    const quoteProblem = validQuote(quote, machine.instanceType, generatedAt);
    if (quoteProblem) blockers.push(quoteProblem);
    if (!costConfig)
      blockers.push('The maintained runner retained-storage configuration is unconfirmed.');
    const needsStage =
      definition.id.startsWith('h0-details-r') || definition.id === 'h0-safety-details';
    if (needsStage && !stage)
      blockers.push('Resolve and freeze I05/I06 from the completed twelve-run H0 discovery stage.');
    if (machine.id !== 'H0' && !heap)
      blockers.push(
        'Record and checksum-verify H0 default/equivalent explicit V8 heap evidence first.',
      );
    for (const item of timedCases) {
      const file = await json(join(directory, 'case-inputs', `${item.id}.json`));
      if (digest(file) !== digest(item)) throw new Error(`Frozen case input changed: ${item.id}.`);
    }
    const cases = [
      ...timedCases.map((item) => ({
        id: item.id,
        source: item.source,
        hardDeadlineSeconds: item.hardDeadlineSeconds,
        requiredArtifacts: item.requiredArtifacts,
        arguments: ['case', '--input', item.id],
      })),
      ...safetyCases.map((item) => ({
        id: item.id,
        source: item.source,
        hardDeadlineSeconds: item.hardDeadlineSeconds,
        requiredArtifacts: item.requiredArtifacts,
        arguments: ['safety', '--input', item.configuration],
      })),
    ];
    if (!cases.length || cases.length > 16)
      throw new Error('A managed profiling job needs 1–16 serial cases on one physical profile.');
    const serialJobs = bootstrap ? cases.map((item) => [item]) : [cases];
    const timeoutSeconds = Math.max(
        ...serialJobs.map((serial) =>
          serial.reduce((sum, item) => sum + item.hardDeadlineSeconds, 0),
        ),
      ),
      deadlineSeconds = timeoutSeconds + 600;
    if (deadlineSeconds >= 28800 || timeoutSeconds <= contracts.defaults.cleanupMs / 1000)
      throw new Error(
        'Worker deadline must include assignment/cleanup and stay below eight hours.',
      );
    const paths = [
      'plan.json',
      'inventory.json',
      ...(safetyCases.length ? ['source/safety-inventory.json'] : []),
      ...timedCases.map((item) => `case-inputs/${item.id}.json`),
      ...(stage && needsStage ? ['ownership/stage-details.json'] : []),
      ...(heap && machine.id !== 'H0' ? ['ownership/h0-heap-proof.json'] : []),
    ];
    const campaign = {
      taskId: input.taskId,
      cloudAllocationId: input.cloudAllocationId,
      concurrency: serialJobs.length,
      ...(machine.id === 'H0' ? { requireRetainedWorkers: true } : {}),
      ...(workerAffinity
        ? {
            workerAffinity: {
              workerId: workerAffinity.workerId,
              instanceId: workerAffinity.instanceId,
            },
          }
        : {}),
      deadlineSeconds,
      lifetime: 'attached',
      inputs: [{ id: 'frozen-campaign', root: directory, paths }],
      jobs: serialJobs.map((serial, index) => ({
        id: bootstrap ? `${definition.id}-${safetyCases[index]!.configuration}` : definition.id,
        mode: 'batch',
        timeoutSeconds,
        acceptance: definition.kind === 'safety' ? 'check' : 'measurement',
        outputLimitBytes: contracts.defaults.outputLimitBytes,
        diskLimitBytes: contracts.defaults.diskLimitBytes,
        environment: {
          instanceType: machine.instanceType,
          node: '24.13.0',
          pnpm: '10.33.0',
          ...(costConfig?.imageId ? { imageId: costConfig.imageId } : {}),
          ...(quote ? { priceQuote: quote } : {}),
          ...(machine.id !== 'H0' && heap ? { nodeHeapMiB: heap.nodeHeapMiB } : {}),
        },
        cases: serial.map((item) => ({
          id: item.id,
          source: item.source,
          inputs: [{ id: 'campaign', bundle: 'frozen-campaign' }],
          requiredArtifacts: item.requiredArtifacts.map((path) => `profiling/${path}`),
          steps: [
            {
              id: definition.kind === 'safety' ? 'qualify' : 'measure',
              argv: [
                'node',
                '--import',
                'tsx',
                'scripts/performance/profile-campaign.ts',
                ...item.arguments,
                '{results}/profiling',
              ],
            },
          ],
        })),
      })),
    };
    let estimate: ReturnType<MaintainedCosts['campaignEstimate']> | null = null;
    if (quote && costConfig) {
      // Existing validator/estimator owns schema and reservation categories. The
      // runner will package each pinned source and supply its own gzip checksum;
      // the campaign's raw git-tar hash is a different artifact representation.
      contracts.campaign(campaign);
      estimate = costs.campaignEstimate(
        costs.campaignSummary(campaign),
        costConfig,
        workerAffinity
          ? [
              {
                workerId: workerAffinity.workerId,
                instanceId: workerAffinity.instanceId,
                instanceType: machine.instanceType,
                ...(costConfig.imageId ? { imageId: costConfig.imageId } : {}),
              },
            ]
          : undefined,
        generatedAt,
      );
      if (!Number.isSafeInteger(estimate.totalMicroUsd) || estimate.totalMicroUsd < 0)
        throw new Error('Maintained runner returned an invalid reservation estimate.');
    }
    prepared.push({
      definition,
      cases,
      safetyCases,
      timedCases,
      campaign,
      blockers,
      estimate,
      timeoutSeconds,
      deadlineSeconds,
    });
  }
  if (
    prepared.reduce((sum, batch) => sum + batch.timedCases.length, 0) !== plan.cases.length ||
    prepared.reduce((sum, batch) => sum + batch.safetyCases.length, 0) !== plan.safetyCases.length
  )
    throw new Error('The adapter cannot omit a frozen case or execute an unsupported group.');
  const totalEstimateMicroUsd = prepared.every((batch) => batch.estimate)
    ? prepared.reduce((sum, batch) => sum + batch.estimate!.totalMicroUsd, 0)
    : null;
  const allocationCeilingMicroUsd = Math.floor(plan.limitUsd * 1e6),
    reserveMicroUsd = Math.ceil(allocationCeilingMicroUsd * 0.1);
  const budgetProblem =
    totalEstimateMicroUsd === null
      ? 'The full selected matrix is not yet priced; no per-batch estimate establishes whole-task affordability.'
      : totalEstimateMicroUsd > allocationCeilingMicroUsd - reserveMicroUsd
        ? 'The selected matrix exceeds the shared task ceiling after its 10% collection/storage reserve.'
        : null;
  const output = join(directory, 'ownership/worker-plans');
  const batches: WorkerBatch[] = [];
  for (const batch of prepared) {
    const blockers = [...batch.blockers, ...(budgetProblem ? [budgetProblem] : [])],
      folder = join(output, batch.definition.id);
    await mkdir(folder, { recursive: true, mode: 0o700 });
    const planPath = join(folder, 'runner-plan.json'),
      templatePath = join(folder, 'blocked-template.json');
    const status = blockers.length ? 'blocked' : 'offline-plan-valid';
    if (blockers.length) {
      await rm(planPath, { force: true });
      await publish(templatePath, { status, blockers, proposedCampaign: batch.campaign });
    } else {
      await rm(templatePath, { force: true });
      await publish(planPath, batch.campaign);
    }
    batches.push({
      id: batch.definition.id,
      kind: batch.definition.kind,
      machine: batch.definition.machine,
      h0Repetition: batch.definition.h0Repetition ?? null,
      workerAffinity: batch.campaign.workerAffinity ?? null,
      caseIds: batch.cases.map((item) => item.id),
      safetyConfigurations: batch.safetyCases.map((item) => ({
        configuration: item.configuration,
        caseId: item.id,
      })),
      dependsOnBatches: [...batch.definition.dependencies],
      serial: batch.campaign.concurrency === 1,
      concurrency: batch.campaign.concurrency,
      jobs: batch.campaign.jobs.map((job) => ({
        id: job.id,
        caseIds: job.cases.map((item) => item.id),
      })),
      status,
      blockers,
      timeoutSeconds: batch.timeoutSeconds,
      deadlineSeconds: batch.deadlineSeconds,
      reservationEstimate: batch.estimate,
      runnerPlan: blockers.length ? null : relative(directory, planPath),
      blockedTemplate: blockers.length ? relative(directory, templatePath) : null,
      collectedRoot: `ownership/collected/${batch.definition.id}`,
      collectedCasePattern: `ownership/collected/${batch.definition.id}/<jobId>/cases/<caseId>/results/profiling`,
    });
  }
  const result = {
    planHash: plan.hash,
    runner: { checkout: runner, commit: head, capability: 'selected-hardware' },
    generatedAt: new Date(generatedAt).toISOString(),
    taskId: input.taskId,
    cloudAllocationId: input.cloudAllocationId,
    authorizationRef: plan.authorizationRef,
    spendingAuthorization:
      'Offline plans dispatch nothing. Execution is limited to the frozen authorization reference, shared allocation ceiling and maintained live admission.',
    budget: {
      ceilingMicroUsd: allocationCeilingMicroUsd,
      collectionReserveMicroUsd: reserveMicroUsd,
      selectedMatrixReservationMicroUsd: totalEstimateMicroUsd,
      nonTimingSafetyReservationMicroUsd:
        totalEstimateMicroUsd === null
          ? null
          : prepared
              .filter((batch) => batch.definition.kind === 'safety')
              .reduce((sum, batch) => sum + batch.estimate!.totalMicroUsd, 0),
      status: budgetProblem ? 'unconfirmed-or-over-ceiling' : 'offline-estimate-within-ceiling',
      liveRemainingAllocation:
        'Unobserved; the maintained runner must reconcile existing committed/reserved amounts before each admission. Reuse this same allocation for every batch; never allocate another allowance per batch.',
    },
    stageHash: stage?.hash ?? null,
    heapProof: heap,
    h0Workers: pinnedWorkers,
    counts: {
      timedCases: plan.cases.length,
      nonTimingSafetyCases: plan.safetyCases.length,
      totalManagedCases: plan.cases.length + plan.safetyCases.length,
      managedJobs: prepared.reduce((sum, batch) => sum + batch.campaign.jobs.length, 0),
      batches: prepared.length,
    },
    summedSafetyCaseDeadlineSeconds: plan.safetyCases.reduce(
      (sum, item) => sum + item.hardDeadlineSeconds,
      0,
    ),
    safetyCases: prepared.flatMap((batch) =>
      batch.safetyCases.map((item) => {
        const job = batch.campaign.jobs.find((job) =>
          job.cases.some((candidate) => candidate.id === item.id),
        );
        if (!job) throw new Error('Safety case is missing its managed job.');
        return {
          caseId: item.id,
          configuration: item.configuration,
          batchId: batch.definition.id,
          collectedRoot: `ownership/collected/${batch.definition.id}`,
          collectedPath: `${job.id}/cases/${item.id}/results/profiling/safety.json`,
        };
      }),
    ),
    batches,
    batchSchedules: [3, 5].map((concurrency) => scheduleWorkerBatches(batches, concurrency)),
    scheduling:
      'Three initial safety jobs run concurrently without affinity; after all pass, bind their three distinct actual registered hosts to repetitions 1–3. Later batches each hold one exclusive host for serial cases. All twelve H0 discovery cases precede the frozen selection and two detailed safety cases. Three H0 detail blocks reuse their exact discovery instances. H1/H2 may overlap this stage after the H0 heap proof, with at most five active workers overall. Keep those H0 instances retained until details finish; hardware comparisons use other available slots. The five checks add no timed repetitions. After bootstrap, fewer slots serialize these same cases. Optional population follows details.',
    limits: {
      casesPerJob: 16,
      campaignSecondsExclusive: 28800,
      caseOutputLimitBytes: null,
      jobOutputLimitBytes: contracts.defaults.outputLimitBytes,
      jobDiskLimitBytes: contracts.defaults.diskLimitBytes,
      output:
        'The existing supervisor enforces total job output/disk limits and reports failure; it does not silently discard required artifacts.',
    },
  };
  await publish(join(output, 'index.json'), result);
  return result;
}
