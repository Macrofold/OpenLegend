import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import type { CasePlan, Mode } from './contract.js';
import {
  coreArtifacts,
  digest,
  groupRunnerCases,
  gitHash,
  identifier,
  integer,
  jsonFile,
  keys,
  list,
  modes,
  number,
  object,
  opening,
  runnerSteps,
  standardWorker,
  text,
  writeJson,
} from './contract.js';
import { gitBlob, gitChanges, gitToolFiles, readRegistry, selectProbes } from './registry.js';
import type { Probe } from './registry.js';

type Comparison = {
  id: string;
  baseline: Mode;
  measured: Mode;
  probeIds: string[];
  samplingProbability: CasePlan['samplingProbability'];
  workToleranceGameSeconds: number;
  internalWorkTolerance: Record<string, number>;
};

const reuseExecutable = (row: Comparison) =>
  row.measured === 'enabled' || row.measured === 'sampled';

function placement(row: Comparison, repetition: number, position: number, mode: Mode) {
  const pair = `${row.id}-r${repetition}`;
  const id = `${pair}-${mode}`;
  return {
    id,
    runnerCaseId: reuseExecutable(row) ? pair : id,
    sharedBuild: reuseExecutable(row)
      ? {
          peerId: `${pair}-${mode === row.baseline ? row.measured : row.baseline}`,
          role: position === 0 ? ('first' as const) : ('second' as const),
        }
      : undefined,
  };
}

export type FrozenPlan = {
  schema: 1;
  id: string;
  taskId: string;
  cloudAllocationId: string;
  gameSource: string;
  toolSource: string;
  limitUsd: number;
  authorizationRef: string;
  comparisons: Comparison[];
  registry: Probe[];
  cases: CasePlan[];
  instrumentationFiles: string[];
};

function absolute(value: unknown, label: string) {
  const path = text(value, label);
  if (!isAbsolute(path)) throw new Error(`Use an absolute ${label}.`);
  return path;
}

function mode(value: unknown) {
  const arm = modes.find((candidate) => candidate === value);
  if (!arm) throw new Error('Unknown comparison arm.');
  return arm;
}

function selectors(value: unknown) {
  return list(value, 'probe selection', 32).map((entry) =>
    text(entry, 'probe ID', /^S\d{2}(?:\.[a-zA-Z0-9_-]+)*$/),
  );
}

const related = {
  untouched: ['default', 'disabled'],
  default: ['sampling-control', 'sql'],
  disabled: ['enabled'],
  'sampling-control': ['sampled'],
} as const;

function comparison(value: unknown, selection: string[], registry: Probe[]): Comparison {
  const candidate = object(value, 'comparison');
  keys(candidate, [
    'id',
    'baseline',
    'measured',
    'probeIds',
    'samplingProbability',
    'workToleranceGameSeconds',
    'internalWorkTolerance',
  ]);
  const baseline = mode(candidate.baseline);
  const measured = mode(candidate.measured);
  const valid = Object.entries(related).some(
    ([control, arms]) => control === baseline && (arms as readonly Mode[]).includes(measured),
  );
  if (!valid) throw new Error(`Invalid isolated comparison ${baseline} → ${measured}.`);
  if (
    measured !== 'enabled' &&
    (candidate.probeIds !== undefined || candidate.samplingProbability !== undefined)
  )
    throw new Error('Only an enabled recorder selects direct probes.');
  const probeIds =
    measured === 'enabled'
      ? selectProbes(
          registry,
          candidate.probeIds === undefined ? selection : selectors(candidate.probeIds),
        )
      : [];
  if (measured === 'enabled' && !probeIds.length)
    throw new Error('Enabled case needs a positive probe selection.');
  const samplingProbability = candidate.samplingProbability ?? 1;
  if (
    samplingProbability !== 1 &&
    samplingProbability !== 0.125 &&
    samplingProbability !== 0.015625
  )
    throw new Error('Use a sampling probability of 1, 1/8 or 1/64.');
  const internalWorkTolerance = Object.fromEntries(
    Object.entries(object(candidate.internalWorkTolerance ?? {}, 'internal work tolerances')).map(
      ([key, tolerance]) => [
        text(key, 'internal work counter', identifier),
        number(tolerance, `${key} tolerance`),
      ],
    ),
  );
  return {
    id: text(candidate.id, 'comparison ID', /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,39}$/),
    baseline,
    measured,
    probeIds,
    samplingProbability,
    workToleranceGameSeconds: number(
      candidate.workToleranceGameSeconds,
      'completed game seconds tolerance',
      0,
      opening.gameSecondsPerRealSecond,
    ),
    internalWorkTolerance,
  };
}

function expectedArtifacts(mode: Mode) {
  const extra =
    mode === 'enabled'
      ? ['metrics.json']
      : mode === 'sampled'
        ? ['cpu-samples.json']
        : mode === 'sql'
          ? ['sql.json']
          : [];
  return [...coreArtifacts, ...extra];
}

const pathspecs = ['scripts/performance/profile-campaign.ts', 'scripts/performance/rust-profile'];

async function freezeTool(root: string, source: string, target: string) {
  const paths = gitToolFiles(root, source);
  if (!paths.includes(pathspecs[0]!) || !paths.includes('scripts/performance/rust-profile/case.ts'))
    throw new Error('Tool commit must contain the complete campaign adapter and case.');
  for (const path of paths) {
    const relativePath = path.replace(/^scripts\/performance\//, '');
    if (
      !/^(?:profile-campaign\.ts|rust-profile\/[a-zA-Z0-9/_-]+\.(?:ts|mts|mjs|json))$/.test(
        relativePath,
      ) ||
      relativePath.split('/').includes('..')
    )
      throw new Error(`Unsupported tool bundle member ${path}.`);
    const content = gitBlob(root, source, path);
    await mkdir(dirname(join(target, relativePath)), { recursive: true, mode: 0o700 });
    await writeFile(join(target, relativePath), content, { flag: 'wx', mode: 0o600 });
  }
  // Managed inputs are mounted beside the game checkout, outside its package scope.
  await writeJson(join(target, 'package.json'), { type: 'module' });
  return [...paths.map((path) => path.replace(/^scripts\/performance\//, '')), 'package.json'];
}

/** Freezes the finite Rust case matrix and the input to the existing worker runner.
 * This operates only on local files and Git objects. */
export async function planCampaign(path: string, root: string) {
  const inputPath = resolve(path);
  const input = object(
    await jsonFile(dirname(inputPath), inputPath.split('/').at(-1)!),
    'campaign plan',
  );
  keys(input, [
    'id',
    'gameSource',
    'toolSource',
    'select',
    'repetitions',
    'seed',
    'limitUsd',
    'authorizationRef',
    'outputDirectory',
    'verificationDirectory',
    'cloudAllocationId',
    'taskId',
    'deadlineSeconds',
    'caseDeadlineSeconds',
    'comparisons',
    'workerAffinity',
  ]);
  const id = text(input.id, 'campaign ID', identifier);
  const gameSource = text(input.gameSource, 'game commit', gitHash);
  const toolSource = text(input.toolSource, 'tool commit', gitHash);
  integer(input.repetitions, 'repetitions', 3, 3);
  integer(input.seed, 'opening seed', opening.seed, opening.seed);
  const limitUsd = number(input.limitUsd, 'spending ceiling', 0.01);
  const authorizationRef = text(input.authorizationRef, 'authorization reference');
  const outputDirectory = absolute(input.outputDirectory, 'output directory');
  const verificationDirectory = absolute(input.verificationDirectory, 'verification directory');
  const cloudAllocationId = text(input.cloudAllocationId, 'cloud allocation ID', identifier);
  const taskId = text(input.taskId ?? id, 'managed task ID', identifier);
  const deadlineSeconds = integer(input.deadlineSeconds, 'campaign deadline seconds', 3600, 28800);
  const caseDeadlineSeconds = integer(
    input.caseDeadlineSeconds,
    'case deadline seconds',
    240,
    4500,
  );
  const affinity =
    input.workerAffinity === undefined
      ? undefined
      : object(input.workerAffinity, 'worker affinity');
  if (affinity) keys(affinity, ['workerId', 'instanceId']);
  const workerAffinity = affinity
    ? {
        workerId: text(affinity.workerId, 'worker ID', identifier),
        instanceId: text(affinity.instanceId, 'instance ID', /^i-[0-9a-f]+$/),
      }
    : undefined;
  const selection = selectors(input.select);

  const changes = gitChanges(root, gameSource, toolSource);
  if (
    changes.some(
      (file) =>
        !file.startsWith('native/') &&
        !file.startsWith('docs/') &&
        file !== pathspecs[0] &&
        !file.startsWith(pathspecs[1] + '/') &&
        file !== 'scripts/network-boundary-inventory.ts' &&
        file !== 'scripts/check-network-boundaries.ts',
    )
  )
    throw new Error(
      'Source difference extends outside the profiler, native sites and documentation.',
    );

  const registry = readRegistry(root, toolSource);
  const comparisons = list(input.comparisons, 'comparisons', 5).map((item) =>
    comparison(item, selection, registry),
  );
  if (
    !comparisons.length ||
    new Set(comparisons.map((item) => item.id)).size !== comparisons.length
  )
    throw new Error('Use a finite list of uniquely named comparisons.');
  if ((caseDeadlineSeconds * 6 + 120) * comparisons.length + 480 > deadlineSeconds)
    throw new Error('Campaign deadline must cover the ordered workload and runner cleanup.');

  const { resolvePinnedInputs } = await import('./inputs.js');
  const diagnostics = comparisons.flatMap(({ measured }) =>
    measured === 'sampled' || measured === 'sql' ? [measured] : [],
  );
  const bundles = await resolvePinnedInputs(verificationDirectory, diagnostics);
  const mainInputs = new Set(['tools', 'driver', 'language']);
  const cases: CasePlan[] = [];
  for (const item of comparisons) {
    const proof = digest({
      gameSource,
      toolSource,
      ...opening,
      hardware: standardWorker,
      id: item.id,
      baseline: item.baseline,
      measured: item.measured,
      probeIds: item.probeIds,
      samplingProbability: item.samplingProbability,
      workToleranceGameSeconds: item.workToleranceGameSeconds,
      internalWorkTolerance: item.internalWorkTolerance,
      // Bundles used by both arms cannot change within a paired comparison.
      inputHashes: bundles
        .filter((entry) => mainInputs.has(entry.id))
        .map((entry) => [entry.id, entry.sha256]),
    });
    for (const repetition of [1, 2, 3]) {
      const order =
        repetition === 2 ? [item.measured, item.baseline] : [item.baseline, item.measured];
      for (const [position, arm] of order.entries()) {
        const uses = new Set([
          ...mainInputs,
          ...(arm === 'sampled' ? ['profile', 'linux-tools'] : arm === 'sql' ? ['sql'] : []),
        ]);
        cases.push({
          ...placement(item, repetition, position, arm),
          source: arm === 'untouched' ? gameSource : toolSource,
          toolSource,
          mode: arm,
          probeIds: arm === 'enabled' ? item.probeIds : [],
          samplingProbability: arm === 'enabled' ? item.samplingProbability : 1,
          repetition,
          comparisonId: item.id,
          comparisonIdentity: proof,
          scenarioId: opening.scenarioId,
          seed: opening.seed,
          warmupSeconds: opening.warmupSeconds,
          measureSeconds: opening.measureSeconds,
          drainSeconds: opening.drainSeconds,
          hardDeadlineSeconds: caseDeadlineSeconds,
          expectedWork: opening.expectedWork,
          inputHashes: Object.fromEntries(
            bundles.filter((entry) => uses.has(entry.id)).map((entry) => [entry.id, entry.sha256]),
          ),
          hardware: standardWorker,
          requiredArtifacts: expectedArtifacts(arm),
        });
      }
    }
  }
  const plan: FrozenPlan = {
    schema: 1,
    id,
    taskId,
    cloudAllocationId,
    gameSource,
    toolSource,
    limitUsd,
    authorizationRef,
    comparisons,
    registry,
    cases,
    instrumentationFiles: changes,
  };
  await mkdir(outputDirectory, { mode: 0o700 });
  const campaignTool = join(outputDirectory, 'campaign-tool');
  const paths = await freezeTool(root, toolSource, campaignTool);
  await writeJson(join(outputDirectory, 'plan.json'), { plan, sha256: digest(plan) });
  await writeJson(join(outputDirectory, 'inventory.json'), registry);
  await writeJson(join(outputDirectory, 'worker-plan.json'), {
    taskId,
    cloudAllocationId,
    concurrency: 1,
    lifetime: 'durable',
    deadlineSeconds,
    ...(workerAffinity ? { workerAffinity } : {}),
    inputs: [
      ...bundles.map(({ id, root, paths }) => ({ id, root, paths })),
      { id: 'campaign', root: outputDirectory, paths: ['plan.json'] },
      { id: 'campaign-tool', root: campaignTool, paths },
    ],
    jobs: comparisons.map((row) => ({
      id: row.id,
      mode: 'batch',
      acceptance: 'measurement',
      timeoutSeconds: caseDeadlineSeconds * 6 + 120,
      outputLimitBytes: 256 * 1024 ** 2,
      diskLimitBytes: 40 * 1024 ** 3,
      environment: { instanceType: standardWorker.instanceType, node: '24.13.0', pnpm: '10.33.0' },
      cases: groupRunnerCases(cases.filter((item) => item.comparisonId === row.id)).map(
        ({ id, arms }) => {
          const first = arms[0]!;
          const inputs = new Set(arms.flatMap((item) => Object.keys(item.inputHashes)));
          return {
            id,
            source: first.source,
            inputs: [...inputs, 'campaign', 'campaign-tool'].map((id) => ({
              id,
              bundle: id,
            })),
            ...runnerSteps(arms),
            requiredArtifacts: arms.flatMap((item) =>
              [...item.requiredArtifacts, 'integrity.json'].map((file) =>
                item.sharedBuild ? `${item.id}/${file}` : file,
              ),
            ),
          };
        },
      ),
    })),
  });
  return { outputDirectory, cases: cases.length, sha256: digest(plan) };
}

export async function readPlan(path: string): Promise<FrozenPlan> {
  const file = resolve(path);
  return parsePlan(await jsonFile(dirname(file), file.split('/').at(-1)!));
}

/** Validates a plan decoded from bytes already read by the caller. */
export function parsePlan(value: unknown): FrozenPlan {
  const envelope = object(value, 'frozen plan');
  const raw = object(envelope.plan, 'plan');
  if (
    raw.schema !== 1 ||
    digest(raw) !== envelope.sha256 ||
    !Array.isArray(raw.cases) ||
    !Array.isArray(raw.comparisons) ||
    !Array.isArray(raw.registry)
  )
    throw new Error('Frozen plan checksum or shape mismatch.');
  const verified = raw as FrozenPlan;
  text(raw.taskId, 'managed task ID', identifier);
  text(raw.cloudAllocationId, 'cloud allocation ID', identifier);
  const gameSource = text(raw.gameSource, 'game source', gitHash);
  const toolSource = text(raw.toolSource, 'tool source', gitHash);
  const ids = verified.comparisons.map((row) => text(row.id, 'comparison ID', identifier));
  if (
    !ids.length ||
    ids.length > 5 ||
    new Set(ids).size !== ids.length ||
    verified.cases.length !== 6 * ids.length
  )
    throw new Error('Invalid finite comparison roster.');
  for (const row of verified.comparisons) {
    const cases = verified.cases.filter((item) => item.comparisonId === row.id);
    const expected = [1, 2, 3].flatMap((repetition) => {
      const before = mode(row.baseline);
      const after = mode(row.measured);
      return (repetition === 2 ? [after, before] : [before, after]).map(
        (arm) => [repetition, arm] as const,
      );
    });
    if (cases.length !== expected.length) throw new Error('Comparison needs three matched pairs.');
    for (const [index, item] of cases.entries()) {
      const [repetition, arm] = expected[index]!;
      const location = placement(row, repetition, index % 2, arm);
      if (
        item.id !== location.id ||
        item.runnerCaseId !== location.runnerCaseId ||
        JSON.stringify(item.sharedBuild) !== JSON.stringify(location.sharedBuild) ||
        !identifier.test(item.id) ||
        item.repetition !== repetition ||
        item.mode !== arm ||
        item.source !== (arm === 'untouched' ? gameSource : toolSource) ||
        item.toolSource !== toolSource ||
        item.scenarioId !== opening.scenarioId ||
        item.seed !== opening.seed ||
        item.warmupSeconds !== opening.warmupSeconds ||
        item.measureSeconds !== opening.measureSeconds ||
        item.drainSeconds !== opening.drainSeconds ||
        digest(item.expectedWork) !== digest(opening.expectedWork) ||
        digest(item.hardware) !== digest(standardWorker) ||
        digest(item.requiredArtifacts) !== digest(expectedArtifacts(arm)) ||
        digest(item.probeIds) !== digest(arm === 'enabled' ? row.probeIds : []) ||
        item.samplingProbability !== (arm === 'enabled' ? row.samplingProbability : 1)
      )
        throw new Error('Frozen case fields do not match the reviewed comparison.');
      integer(item.hardDeadlineSeconds, 'hard case deadline seconds', 240, 4500);
    }
  }
  return verified;
}
