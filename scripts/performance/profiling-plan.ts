import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import {
  PROFILING_REGISTRY,
  resolveProfilingInventory,
  OPENING_PARENT_IDS,
  OPENING_CANDIDATE_IDS,
  PROFILING_SAFETY_DEFINITIONS,
} from './profiling-registry.js';
import { workloadFor } from './profiling-workloads.js';
import type { ProfilingCase, ProfilingHardware, ProfilingPlanInput } from './profiling-types.js';
const execute = promisify(execFile);
export const digest = (value: unknown) =>
  createHash('sha256')
    .update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value))
    .digest('hex');
export const HARDWARE: readonly ProfilingHardware[] = [
  { id: 'H0', instanceType: 'm7i.xlarge', vcpus: 4, memoryMiB: 16384, price: null },
  { id: 'H1', instanceType: 'm7i.2xlarge', vcpus: 8, memoryMiB: 32768, price: null },
  { id: 'H2', instanceType: 'r7iz.xlarge', vcpus: 4, memoryMiB: 32768, price: null },
];
export const CAMPAIGN_SCHEDULING = {
  minimumBootstrapConcurrency: 3,
  maximumConcurrency: 5,
  h0ComparisonBlocks: [1, 2, 3],
  sameInstanceWithinBlock: true,
} as const;
const keys = [
  'id',
  'gameSource',
  'toolSource',
  'inventory',
  'select',
  'workloads',
  'machines',
  'modes',
  'repetitions',
  'seed',
  'limitUsd',
  'authorizationRef',
  'outputDirectory',
  'includePopulation',
];
export function parsePlan(value: unknown): ProfilingPlanInput {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Expected a plan object.');
  const raw = value as Record<string, unknown>;
  for (const key of Object.keys(raw))
    if (!keys.includes(key)) throw Error(`Unknown plan field ${key}.`);
  for (const key of [
    'id',
    'gameSource',
    'toolSource',
    'inventory',
    'authorizationRef',
    'outputDirectory',
  ])
    if (typeof raw[key] !== 'string' || !raw[key]) throw Error(`Missing ${key}.`);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,60}$/.test(String(raw.id)))
    throw Error('Invalid campaign identity.');
  for (const key of ['gameSource', 'toolSource'])
    if (!/^[0-9a-f]{40}$/.test(String(raw[key]))) throw Error(`${key} must be an exact commit.`);
  if (raw.repetitions !== 3) throw Error('Exactly three repetitions, expanded once, are required.');
  if (!Number.isSafeInteger(raw.seed) || Number(raw.seed) < 1 || Number(raw.seed) > 0x7fffffff)
    throw Error('Invalid scenario seed.');
  if (
    typeof raw.limitUsd !== 'number' ||
    !Number.isFinite(raw.limitUsd) ||
    raw.limitUsd <= 0 ||
    raw.limitUsd > 100
  )
    throw Error('The total campaign ceiling is $100.');
  if (!isAbsolute(String(raw.outputDirectory)))
    throw Error('Output must be a private absolute directory.');
  if (raw.includePopulation !== undefined && typeof raw.includePopulation !== 'boolean')
    throw Error('includePopulation must be explicit boolean.');
  // The approved finite plan has no arbitrary Cartesian expansion. A broader
  // selection requires another accepted plan rather than accidentally running it.
  const defaults = {
    select: [
      'S00',
      'S01',
      'S02',
      'S03',
      'S04',
      'S05',
      'S06',
      'S07',
      'S08',
      'S09',
      'S10',
      'S11',
      'S12',
      'S13',
      'S14',
      'S15',
      'S16',
    ],
    workloads: ['W01'],
    machines: ['H0', 'H1', 'H2'],
    modes: ['control', 'disabled', 'parents', 'cpu', 'leaf', 'sql'],
  };
  for (const [key, expected] of Object.entries(defaults))
    if (raw[key] !== undefined && JSON.stringify(raw[key]) !== JSON.stringify(expected))
      throw Error(`${key} must match the selected opening plan.`);
  return { ...defaults, ...raw } as unknown as ProfilingPlanInput;
}
interface SourceConfiguration {
  commit: string;
  archiveHash: string;
  patchHash: string;
}
export interface SourceConfigurations {
  control: SourceConfiguration;
  instrumented: SourceConfiguration;
}
export function expandCases(
  input: ProfilingPlanInput,
  configurations: SourceConfigurations,
): ProfilingCase[] {
  if (OPENING_PARENT_IDS.length > 32)
    throw Error('Opening parent group exceeds the duration-series limit.');
  const groups = [
    ['I01', 'H0', 'control'],
    ['I02', 'H0', 'disabled'],
    ['I03', 'H0', 'parents'],
    ['I04', 'H0', 'cpu'],
    ['I05', 'H0', 'leaf'],
    ['I06', 'H0', 'leaf'],
    ['I07', 'H0', 'sql'],
    ['I08', 'H1', 'control'],
    ['I09', 'H2', 'control'],
    ...(input.includePopulation ? [['I10', 'H0', 'control'] as const] : []),
  ] as const;
  const cases: ProfilingCase[] = [];
  for (const [group, machine, mode] of groups)
    for (const repetition of [1, 2, 3] as const) {
      const workload = workloadFor(group === 'I10' ? 'W05-100-movement' : 'W01-ordinary');
      const hardware = HARDWARE.find((item) => item.id === machine)!;
      const configuration = mode === 'control' ? 'control' : 'instrumented';
      const probeIds =
        group === 'I03'
          ? [...OPENING_PARENT_IDS]
          : group === 'I07'
            ? [
                'S13.01.wait',
                'S13.01.hold',
                'S13.04.submit',
                'S13.04.decode',
                'S13.04.driverDecode',
                'S13.05.transaction',
              ]
            : [];
      const selection = group === 'I05' || group === 'I06' ? 'pending' : 'resolved';
      const fixtureHash = digest(workload),
        configurationHash = digest({
          group,
          workload,
          hardware,
          mode,
          probeIds,
          selection,
          samplingProbability: 1,
        });
      const id = `${group}-${machine}-r${repetition}`;
      cases.push({
        id,
        gameSource: input.gameSource,
        toolSource: input.toolSource,
        source: configurations[configuration].commit,
        sourceConfiguration: configuration,
        sourceArchiveHash: configurations[configuration].archiveHash,
        instrumentationPatchHash: configurations.instrumented.patchHash,
        fixtureHash,
        configurationHash,
        samplingSeed: input.seed + repetition,
        samplingProbability: 1,
        probeIds,
        selection,
        mode,
        group,
        scenarioId: workload.id,
        workload,
        repetition,
        seed: input.seed,
        hardware,
        warmupSeconds: 30,
        measureSeconds: 120,
        drainSeconds: 60,
        hardDeadlineSeconds: 630,
        expectedWork: workload.expectedWork,
        requiredArtifacts: [
          'manifest.json',
          'timeline.json',
          'metrics.json',
          'workload.json',
          'resources.json',
          'completion.json',
          ...(mode === 'sql' ? ['sql.json'] : []),
          ...(mode === 'cpu' ? ['profiles/main.cpuprofile'] : []),
        ],
        outputDirectory: join(
          input.outputDirectory,
          'cases',
          `${group}-${machine}`,
          `repeat-${repetition}`,
        ),
        comparison: {
          baseline: group === 'I10' ? null : `I01-H0-r${repetition}`,
          disabled: machine === 'H0' && mode !== 'control' ? `I02-H0-r${repetition}` : null,
          hardwarePartner: machine !== 'H0' ? `I01-H0-r${repetition}` : null,
        },
        dependsOn: [],
        purpose: 'measurement',
      });
    }
  const discovery = cases.filter((item) => ['I01', 'I02', 'I03', 'I04'].includes(item.group));
  // Each repetition retains one physical H0 host across both stages. The
  // managed adapter fences that identity; independent repetitions can overlap.
  for (const repetition of [1, 2, 3]) {
    const h0 = cases
      .filter((item) => item.hardware.id === 'H0' && item.repetition === repetition)
      .sort((a, b) => a.group.localeCompare(b.group));
    for (let index = 1; index < h0.length; index++) h0[index]!.dependsOn.push(h0[index - 1]!.id);
  }
  for (const item of cases) {
    if (['I05', 'I06'].includes(item.group))
      item.dependsOn.push(...discovery.map((item) => item.id));
    if (item.hardware.id !== 'H0') item.dependsOn.push(...discovery.map((item) => item.id));
    if (item.hardware.id !== 'H0' && item.repetition > 1)
      item.dependsOn.push(`${item.group}-${item.hardware.id}-r${item.repetition - 1}`);
    item.dependsOn = [...new Set(item.dependsOn)];
  }
  return cases;
}
async function git(
  root: string,
  args: string[],
  options: { env?: NodeJS.ProcessEnv; input?: string } = {},
) {
  if (options.input !== undefined) {
    const { spawn } = await import('node:child_process');
    return await new Promise<string>((resolve, reject) => {
      const child = spawn('git', args, {
        cwd: root,
        env: options.env ?? process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const output: Buffer[] = [],
        errors: Buffer[] = [];
      child.stdout.on('data', (value: Buffer) => output.push(value));
      child.stderr.on('data', (value: Buffer) => errors.push(value));
      child.on('error', reject);
      child.on('exit', (code) =>
        code === 0
          ? resolve(Buffer.concat(output).toString())
          : reject(new Error(Buffer.concat(errors).toString())),
      );
      child.stdin.end(options.input);
    });
  }
  const result = await execute('git', args, {
    cwd: root,
    env: options.env ?? process.env,
    maxBuffer: 128 * 1024 * 1024,
    encoding: 'utf8',
  });
  return result.stdout;
}

/** Derived source commits are reproducible manifests, never checked-out branches or a second implementation. */
export async function prepareSourceConfigurations(
  root: string,
  input: ProfilingPlanInput,
  instrument: (path: string, source: string) => string,
): Promise<SourceConfigurations> {
  const current = (await git(root, ['rev-parse', 'HEAD'])).trim();
  if (current !== input.toolSource)
    throw Error('The running planner must be the exact committed toolSource.');
  const dirty = (
    await git(root, [
      'status',
      '--porcelain',
      '--',
      'scripts/performance',
      'scripts/network.ts',
      'scripts/disposable-postgres.mjs',
      'apps/server/src',
      'packages/domain',
      'packages/spatial',
      'tsconfig.json',
      'package.json',
      'pnpm-lock.yaml',
    ])
  ).trim();
  if (dirty) throw Error('Commit relevant executable sources before freezing the campaign.');
  const temporary = await mkdtemp(join(tmpdir(), 'openlegend-profile-index-'));
  const common = (
    await git(root, [
      'ls-tree',
      '-r',
      '--name-only',
      input.toolSource,
      '--',
      'scripts/performance',
      'scripts/network.ts',
      'scripts/disposable-postgres.mjs',
    ])
  )
    .trim()
    .split('\n');
  // Driver profile exporters also use this pure byte-budget guard in controls.
  common.push('apps/server/src/performance-json.ts');
  // Non-timing supplied-response replay observes exact native reference bindings.
  // These optional composition seams remain unused in every timed case.
  common.push('apps/server/src/http.ts', 'apps/server/src/ai-director.ts');
  const probeFiles = [
    'apps/server/src/performance.ts',
    'apps/server/src/performance-campaign.ts',
    'apps/server/src/performance-sql.ts',
    'apps/server/src/performance-worker.ts',
    'apps/server/src/postgres.ts',
    'apps/server/src/work-lane.ts',
    'apps/server/src/checkpoint-worker.ts',
    'apps/server/src/checkpoint-worker-client.ts',
    'apps/server/src/navigation/coordinator.ts',
    'apps/server/src/navigation/worker.ts',
    'apps/server/src/navigation/worker.mjs',
    'apps/server/src/geometry-batches.ts',
    'apps/server/src/geometry-worker.ts',
    'apps/server/src/geometry-worker.mjs',
    'packages/spatial/package.json',
    'packages/spatial/src/diagnostic-measurements.ts',
    'packages/domain/package.json',
    'packages/domain/src/diagnostic-measurements.ts',
    'packages/domain/src/index.ts',
    'tsconfig.json',
  ];
  const changed = (await git(root, ['diff', '--name-only', input.gameSource, input.toolSource]))
    .trim()
    .split('\n')
    .filter(Boolean);
  const unexpected = changed.filter(
    (path) =>
      !path.startsWith('docs/') &&
      !path.startsWith('.agents/') &&
      !common.includes(path) &&
      !probeFiles.includes(path),
  );
  if (unexpected.length)
    throw Error('Unreviewed gameplay/source difference: ' + unexpected.join(', '));
  const date = (await git(root, ['show', '-s', '--format=%aI', input.toolSource])).trim();
  const prepare = async (kind: 'control' | 'instrumented') => {
    const env = {
      ...process.env,
      GIT_INDEX_FILE: join(temporary, `${kind}.index`),
      GIT_AUTHOR_DATE: date,
      GIT_COMMITTER_DATE: date,
    };
    await git(root, ['read-tree', input.gameSource], { env });
    const paths = new Set([...common, ...(kind === 'instrumented' ? probeFiles : [])]);
    if (kind === 'instrumented')
      for (const definition of [...PROFILING_REGISTRY, ...PROFILING_SAFETY_DEFINITIONS].filter(
        (item) =>
          OPENING_PARENT_IDS.includes(item.id) ||
          OPENING_CANDIDATE_IDS.includes(item.id) ||
          item.id.startsWith('Q01.'),
      ))
        for (const binding of definition.bindings) paths.add(binding.path);
    for (const path of paths) {
      let body = await git(root, [
        'show',
        `${paths.has(path) && (common.includes(path) || probeFiles.includes(path)) ? input.toolSource : input.gameSource}:${path}`,
      ]);
      if (kind === 'instrumented') body = instrument(path, body);
      const object = (await git(root, ['hash-object', '-w', '--stdin'], { input: body })).trim();
      await git(root, ['update-index', '--add', '--cacheinfo', `100644,${object},${path}`], {
        env,
      });
    }
    const tree = (await git(root, ['write-tree'], { env })).trim();
    const commit = (
      await git(root, ['commit-tree', tree, '-p', input.gameSource], {
        env,
        input: `Derived ${kind} profiling source from ${input.gameSource} and ${input.toolSource}\n`,
      })
    ).trim();
    const patch = await git(root, ['diff', '--binary', input.gameSource, commit]);
    const archive = await execute('git', ['archive', '--format=tar', commit], {
      cwd: root,
      maxBuffer: 128 * 1024 * 1024,
      encoding: 'buffer',
    });
    await writeFile(join(input.outputDirectory, 'source', `${kind}.patch`), patch, {
      flag: 'wx',
      mode: 0o600,
    });
    return { commit, archiveHash: digest(archive.stdout), patchHash: digest(patch) };
  };
  try {
    return { control: await prepare('control'), instrumented: await prepare('instrumented') };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

/** Precedence schedule; three independent H0 repetition blocks retain their
 * own serial order, with one further serial lane for each hardware comparison. */
export function scheduleCases(
  cases: readonly Pick<ProfilingCase, 'id' | 'hardDeadlineSeconds' | 'dependsOn'>[],
  concurrency: number,
) {
  const lanes = Array.from({ length: concurrency }, () => ({
    available: 0,
    cases: [] as Array<{ id: string; start: number; end: number }>,
  }));
  const done = new Map<string, number>(),
    pending = [...cases];
  while (pending.length) {
    const ready = pending.filter((item) => item.dependsOn.every((id) => done.has(id)));
    if (!ready.length) throw Error('Campaign dependency cycle.');
    const selected = ready
      .map((item) => ({
        item,
        earliest: Math.max(0, ...item.dependsOn.map((id) => done.get(id)!)),
      }))
      .sort((a, b) => a.earliest - b.earliest || a.item.id.localeCompare(b.item.id))[0]!;
    const lane = lanes.reduce((a, b) => (a.available <= b.available ? a : b)),
      start = Math.max(lane.available, selected.earliest),
      end = start + selected.item.hardDeadlineSeconds;
    lane.cases.push({ id: selected.item.id, start, end });
    lane.available = end;
    done.set(selected.item.id, end);
    pending.splice(pending.indexOf(selected.item), 1);
  }
  return {
    concurrency,
    deadlineEnvelopeSeconds: Math.max(...lanes.map((lane) => lane.available)),
    lanes,
    qualification:
      'Scheduling envelope uses unmeasured setup/export allowances and full drain. It is not an expected completion time. Actual runner capacity and prices remain unconfirmed.',
  };
}
export async function writeResolvedPlan(
  root: string,
  input: ProfilingPlanInput,
  configurations: SourceConfigurations,
) {
  const inventory = await resolveProfilingInventory(root),
    cases = expandCases(input, configurations);
  const safetyCases = ['control', 'disabled', 'selected', 'I05', 'I06'].map(
    (configuration, index) => ({
      id: `Q-${configuration}`,
      configuration,
      source: configurations[configuration === 'control' ? 'control' : 'instrumented'].commit,
      hardDeadlineSeconds: 630,
      requiredArtifacts: ['safety.json'],
      dependsOn:
        index < 3
          ? []
          : index === 3
            ? cases
                .filter((item) => ['I01', 'I02', 'I03', 'I04'].includes(item.group))
                .map((item) => item.id)
            : ['Q-I05'],
    }),
  );
  for (const repetition of [1, 2, 3]) {
    cases
      .find((item) => item.id === `I01-H0-r${repetition}`)!
      .dependsOn.push('Q-control', 'Q-disabled', 'Q-selected');
    cases.find((item) => item.id === `I05-H0-r${repetition}`)!.dependsOn.push('Q-I06');
  }

  const counts = (key: (item: ProfilingCase) => string) =>
    Object.fromEntries(
      [...new Set(cases.map(key))]
        .sort()
        .map((value) => [value, cases.filter((item) => key(item) === value).length]),
    );
  const selected = new Set(cases.flatMap((item) => item.probeIds)),
    candidate = new Set(OPENING_CANDIDATE_IDS);
  const plan = {
    ...input,
    configurations,
    inventoryHash: digest(await readFile(resolve(root, input.inventory))),
    registryHash: digest(inventory),
    safetyRegistryHash: digest(
      JSON.parse(
        await readFile(join(input.outputDirectory, 'source', 'safety-inventory.json'), 'utf8'),
      ),
    ),
    cases,
    safetyCases,
    scheduling: CAMPAIGN_SCHEDULING,
    candidateProbeIds: [...OPENING_CANDIDATE_IDS],
    selectedParentIds: [...OPENING_PARENT_IDS],
    coverage: inventory.map((definition) => ({
      id: definition.id,
      status: selected.has(definition.id)
        ? 'selected-unrun'
        : candidate.has(definition.id)
          ? 'candidate-not-selected'
          : 'not-selected',
    })),
    counts: {
      total: cases.length,
      nonTimingSafetyCases: safetyCases.length,
      totalManaged: cases.length + safetyCases.length,
      machine: counts((item) => item.hardware.id),
      workload: counts((item) => item.workload.workload),
      mode: counts((item) => item.mode),
      group: counts((item) => item.group),
    },
    duration: {
      knownWarmupMeasurementMachineHours: (cases.length * 150) / 3600,
      maximumDrainMachineHours: (cases.length * 60) / 3600,
      setupExportAllowanceMachineHours: (cases.length * 300) / 3600,
      cleanupReservationMachineHours: (cases.length * 120) / 3600,
      summedDeadlineMachineHours: (cases.length * 630) / 3600,
      nonTimingSafetyDeadlineMachineHours: (safetyCases.length * 630) / 3600,
      allManagedDeadlineMachineHours: ((cases.length + safetyCases.length) * 630) / 3600,
      implementationHours: 'Not estimated; no execution timings available.',
    },
    schedules: [3, 5].map((concurrency) => scheduleCases([...cases, ...safetyCases], concurrency)),
    costs: {
      limitUsd: input.limitUsd,
      reserveUsd: input.limitUsd * 0.1,
      confirmedEstimateUsd: null,
      inputs: HARDWARE.map((h) => ({
        machine: h.id,
        instanceType: h.instanceType,
        currentHourlyUsd: null,
        maximumCaseHours:
          ((cases.filter((item) => item.hardware.id === h.id).length +
            (h.id === 'H0' ? safetyCases.length : 0)) *
            630) /
          3600,
      })),
      additional:
        'Confirm gp3/EBS retained volumes, transfer, staging, cleanup, capacity and current type-specific prices before admission. One shared allowance; never another $100 per batch.',
    },
    stages: {
      discovery: cases
        .filter((item) => ['I01', 'I02', 'I03', 'I04'].includes(item.group))
        .map((item) => item.id),
      details: {
        I05: 'Resolve from disjoint attribution/CPU/work evidence, at most32series.',
        I06: 'Second named unresolved expensive group; no source change.',
      },
      hardware:
        'After the collected H0 discovery batch and its default-heap proof, use the same explicit effective heap on H1/H2.',
      parallelism:
        'Three initial safety jobs run concurrently to establish three distinct H0 hosts. Three serial repetition blocks retain those exact instances across discovery and details. H1 and H2 may overlap the detailed stage within a ceiling of five exclusive workers; after bootstrap, fewer workers serialize the same cases.',
    },
    executionStatus:
      'Not executed. Offline planning starts no workloads or services and performs no cloud operations.',
  };
  const result = { ...plan, hash: digest(plan) };
  await writeFile(
    join(input.outputDirectory, 'plan.json'),
    JSON.stringify(result, null, 2) + '\n',
    { flag: 'wx', mode: 0o600 },
  );
  await writeFile(
    join(input.outputDirectory, 'inventory.json'),
    JSON.stringify(inventory, null, 2) + '\n',
    { flag: 'wx', mode: 0o600 },
  );
  for (const item of cases) {
    const path = join(input.outputDirectory, 'case-inputs', `${item.id}.json`);
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await writeFile(path, JSON.stringify(item, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  }
  return result;
}

export interface DetailedStage {
  planHash: string;
  sourceConfigurationHash: string;
  evidence: Array<{ caseId: string; completionHash: string }>;
  groups: Record<'I05' | 'I06', { probeIds: string[]; reason: string }>;
  hash: string;
}
export async function freezeDetailedStage(
  directory: string,
  selection: {
    I05: { probeIds: string[]; reason: string };
    I06: { probeIds: string[]; reason: string };
  },
) {
  const plan = JSON.parse(await readFile(join(directory, 'plan.json'), 'utf8'));
  const { hash, ...body } = plan;
  if (digest(body) !== hash) throw Error('Frozen plan changed.');
  const { createCampaignArtifactReader } = await import('./profiling-report.js');
  const readCase = await createCampaignArtifactReader(directory, hash);
  const evidence = [];
  for (const item of plan.cases.filter((item: ProfilingCase) =>
    ['I01', 'I02', 'I03', 'I04'].includes(item.group),
  )) {
    const artifacts = await readCase(item);
    evidence.push({ caseId: item.id, completionHash: artifacts.completionHash });
  }
  for (const group of ['I05', 'I06'] as const) {
    const selected = selection[group];
    if (
      !selected?.reason ||
      !selected.probeIds.length ||
      selected.probeIds.length > 32 ||
      new Set(selected.probeIds).size !== selected.probeIds.length ||
      selected.probeIds.some((id) => !plan.candidateProbeIds.includes(id))
    )
      throw Error(`${group} needs1–32 unique frozen candidate IDs and an evidence-based reason.`);
  }
  if (
    JSON.stringify([...selection.I05.probeIds].sort()) ===
    JSON.stringify([...selection.I06.probeIds].sort())
  )
    throw Error('The two detailed groups cannot be identical.');
  const bodyStage = {
    planHash: hash,
    sourceConfigurationHash: digest(plan.configurations),
    evidence,
    groups: selection,
  };
  const result = { ...bodyStage, hash: digest(bodyStage) };
  await writeFile(
    join(directory, 'ownership', 'stage-details.json'),
    JSON.stringify(result, null, 2) + '\n',
    { flag: 'wx', mode: 0o600 },
  );
  return result;
}
