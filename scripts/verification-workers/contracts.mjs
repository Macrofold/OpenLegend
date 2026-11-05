// Plan and spending boundary: docs/technical/verification-workers.md#runner-input-and-output
import { createHash, randomBytes } from 'node:crypto';

export const defaults = Object.freeze({
  region: 'us-east-2',
  account: '027677879749',
  slots: 2,
  leaseMs: 180_000,
  heartbeatMs: 30_000,
  idleMs: 300_000,
  retentionMs: 604_800_000,
  cleanupMs: 120_000,
  collectionMs: 600_000,
  blobCacheBytes: 4 * 1024 ** 3,
  blobCacheEntries: 256,
  outputLimitBytes: 256 * 1024 ** 2,
  diskLimitBytes: 16 * 1024 ** 3,
});
export const digest = (value) =>
  createHash('sha256')
    .update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value))
    .digest('hex');
export const secret = () => randomBytes(32).toString('hex');
export const integrityError = (message) =>
  Object.assign(new Error(message), { code: 'VERIFICATION_INTEGRITY' });
export function id(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/.test(value))
    throw new Error('Expected a short opaque identifier.');
  return value;
}
export function integer(value, name, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new Error(`Invalid ${name}.`);
  return value;
}
const supported = (value, names) => {
  for (const key of Object.keys(value))
    if (!names.includes(key)) throw new Error(`Unsupported plan field: ${key}`);
};
export function jobPlan(input) {
  supported(input, [
    'taskId',
    'cloudAllocationId',
    'mode',
    'environment',
    'deadlineSeconds',
    'outputLimitBytes',
    'diskLimitBytes',
    'requiredArtifacts',
    'acceptance',
    'cases',
    'paid',
  ]);
  id(input.taskId);
  id(input.cloudAllocationId);
  if (input.paid) {
    supported(input.paid, ['limitMicroUsd', 'maxCalls', 'lanes']);
    integer(input.paid.limitMicroUsd, 'paid allowance', 1, 100_000_000);
    integer(input.paid.maxCalls, 'paid calls', 1, 10000);
    if (
      !Array.isArray(input.paid.lanes) ||
      !input.paid.lanes.length ||
      input.paid.lanes.length > 32 ||
      new Set(input.paid.lanes).size !== input.paid.lanes.length
    )
      throw new Error('Explicit unique paid lanes required.');
    input.paid.lanes.forEach(id);
  }

  if (!['batch', 'browser-session'].includes(input.mode))
    throw new Error('mode must be batch or browser-session.');
  if (!Array.isArray(input.cases) || !input.cases.length || input.cases.length > 16)
    throw new Error('One to sixteen ordered cases are supported.');
  if (
    input.environment &&
    (input.environment.instanceType !== 'm7i.xlarge' ||
      input.environment.node !== '24.13.0' ||
      input.environment.pnpm !== '10.33.0')
  )
    throw new Error('Requested environment differs from the supported pinned preparation.');
  if (input.acceptance && !['measurement', 'check'].includes(input.acceptance))
    throw new Error('acceptance must be measurement or check.');
  const names = new Set(),
    bundleNames = new Set();
  for (const item of input.cases) {
    supported(item, [
      'id',
      'source',
      'sourceHash',
      'steps',
      'env',
      'inputs',
      'databases',
      'requiredArtifacts',
    ]);
    id(item.id);
    if (names.has(item.id)) throw new Error('Duplicate case ID.');
    names.add(item.id);
    if (typeof item.source !== 'string' || !/^[a-f0-9]{40}$/.test(item.source))
      throw new Error(
        'Cases require an exact Git commit. Use snapshot to freeze dirty work first.',
      );
    if (item.sourceHash !== undefined && !/^[a-f0-9]{64}$/.test(item.sourceHash))
      throw new Error('Invalid source archive hash.');
    if (!Array.isArray(item.steps) || !item.steps.length || item.steps.length > 32)
      throw new Error('Cases require one to thirty-two ordered steps.');
    const steps = new Set();
    for (const step of item.steps) {
      supported(step, ['id', 'argv', 'database']);
      id(step.id);
      if (steps.has(step.id) || ['install', 'bindings'].includes(step.id))
        throw new Error('Duplicate or reserved step ID.');
      steps.add(step.id);
      const argv = step.argv;
      if (
        !Array.isArray(argv) ||
        !['node', 'pnpm', 'python3', 'psql'].includes(argv[0]) ||
        argv.some((a) => typeof a !== 'string' || a.includes('\0')) ||
        JSON.stringify(argv).length > 32768
      )
        throw new Error('Commands require bounded supported-tool argv, without a shell.');
    }
    const databases = new Set();
    if (item.databases && (!Array.isArray(item.databases) || item.databases.length > 8))
      throw new Error('A case supports up to eight database aliases.');
    for (const alias of item.databases ?? []) {
      id(alias);
      if (databases.has(alias)) throw new Error('Duplicate database alias.');
      databases.add(alias);
    }
    for (const step of item.steps)
      if (step.database !== undefined && !databases.has(step.database))
        throw new Error('Step database must name an owned case alias.');
    const inputs = new Set();
    if (item.inputs && (!Array.isArray(item.inputs) || item.inputs.length > 32))
      throw new Error('A case supports up to thirty-two input bundles.');
    for (const input of item.inputs ?? []) {
      supported(input, ['id', 'bundle']);
      id(input.id);
      id(input.bundle);
      if (inputs.has(input.id)) throw new Error('Duplicate input mount.');
      inputs.add(input.id);
      bundleNames.add(input.bundle);
      if (bundleNames.size > 32)
        throw new Error('A job supports up to thirty-two distinct input bundles.');
    }
    for (const path of item.requiredArtifacts ?? []) relativePath(path);
    for (const key of Object.keys(item.env ?? {})) {
      if (
        !/^[A-Z][A-Z0-9_]*$/.test(key) ||
        /(?:SECRET|TOKEN|PASSWORD|CREDENTIAL|API_?KEY|PRIVATE_?KEY|ACCESS_?KEY|AUTHORIZATION|AWS_|COREPACK_|DATABASE_URL|NODE_OPTIONS|AI_BUDGET)/.test(
          key,
        ) ||
        [
          'PATH',
          'HOME',
          'OPEN_LEGEND_PROFILE_POSTGRES_URL',
          'OPENLEGEND_STRESS_DATABASE_URL',
          'PGHOST',
          'PGPORT',
          'PGDATABASE',
          'PGUSER',
          'PGSERVICE',
          'OPENLEGEND_FIXTURE_DATABASE_PREFIX',
          'OPENLEGEND_JOB_EXECUTION',
          'OPENLEGEND_JOB_DATABASES',
          'OPENLEGEND_JOB_INPUTS',
          'OPENLEGEND_VERIFICATION_MANIFEST',
          'OPENLEGEND_PROFILE_SOURCE_SHA',
          'OPENLEGEND_PROFILE_BROWSER',
          'OPENLEGEND_PROFILE_READY_PATH',
          'OPENLEGEND_PROFILE_BROWSER_START_PATH',
        ].includes(key)
      )
        throw new Error(`Protected environment setting: ${key}`);
      if (typeof item.env[key] !== 'string')
        throw new Error('Environment settings must be strings.');
    }
  }
  if (Buffer.byteLength(JSON.stringify(input)) > 65536)
    throw new Error('Run plan exceeds 64 KiB coordination allowance.');
  const result = {
    ...input,
    deadlineSeconds: input.deadlineSeconds ?? 3600,
    outputLimitBytes: input.outputLimitBytes ?? defaults.outputLimitBytes,
    diskLimitBytes: input.diskLimitBytes ?? defaults.diskLimitBytes,
    requiredArtifacts: input.requiredArtifacts ?? [
      'result.json',
      'timeline.json',
      'source.json',
      'environment.json',
      'completion.json',
    ],
  };
  if (
    !Array.isArray(result.requiredArtifacts) ||
    result.requiredArtifacts.length > 512 ||
    result.requiredArtifacts.some(
      (p) =>
        typeof p !== 'string' ||
        !p ||
        p.startsWith('/') ||
        p.split('/').includes('..') ||
        p.includes('\0'),
    )
  )
    throw new Error('Required artifacts must be bounded relative file paths.');
  integer(result.deadlineSeconds, 'deadline', 180, 28800);
  integer(result.outputLimitBytes, 'output limit', 1024, 8 * 1024 ** 3);
  integer(result.diskLimitBytes, 'disk limit', 1024 ** 2, 48 * 1024 ** 3);
  if (result.mode === 'browser-session' && result.cases.length !== 1)
    throw new Error('Browser sessions use one case.');
  return result;
}
// A campaign is the sole public plan; a physical job plan is its immutable execution record.
export function relativePath(value) {
  if (
    typeof value !== 'string' ||
    !value ||
    value.startsWith('/') ||
    value.includes('\\') ||
    value.includes('\0') ||
    value.split('/').some((p) => !p || p === '.' || p === '..')
  )
    throw new Error('Expected a nonescaping relative path.');
  return value;
}
export function campaign(input) {
  supported(input, [
    'taskId',
    'cloudAllocationId',
    'concurrency',
    'deadlineSeconds',
    'lifetime',
    'inputs',
    'jobs',
  ]);
  id(input.taskId);
  id(input.cloudAllocationId);
  integer(input.concurrency, 'concurrency', 1, 128);
  const result = {
    ...input,
    lifetime: input.lifetime ?? 'attached',
    deadlineSeconds: input.deadlineSeconds ?? 3600,
  };
  if (!['attached', 'durable'].includes(result.lifetime))
    throw new Error('Invalid campaign lifetime.');
  integer(result.deadlineSeconds, 'campaign deadline', 180, 28800);
  if (
    !Array.isArray(input.jobs) ||
    !input.jobs.length ||
    input.jobs.length > 4096 ||
    input.concurrency > input.jobs.length
  )
    throw new Error(
      'Campaign needs one to 4096 jobs and enough jobs to fill its requested concurrency.',
    );
  const names = new Set(),
    bundles = new Set();
  if (input.inputs && (!Array.isArray(input.inputs) || input.inputs.length > 4096))
    throw new Error('Too many input bundles.');
  for (const bundle of input.inputs ?? []) {
    supported(bundle, ['id', 'root', 'paths']);
    id(bundle.id);
    if (
      bundles.has(bundle.id) ||
      typeof bundle.root !== 'string' ||
      !bundle.root ||
      !Array.isArray(bundle.paths) ||
      !bundle.paths.length
    )
      throw new Error('Input bundles require unique IDs, a local root and explicit paths.');
    bundle.paths.forEach(relativePath);
    bundles.add(bundle.id);
  }
  for (const job of input.jobs) {
    supported(job, [
      'id',
      'mode',
      'timeoutSeconds',
      'cases',
      'environment',
      'outputLimitBytes',
      'diskLimitBytes',
      'requiredArtifacts',
      'acceptance',
      'paid',
    ]);
    id(job.id);
    if (names.has(job.id)) throw new Error('Duplicate job ID.');
    names.add(job.id);
    integer(job.timeoutSeconds, 'job timeout', 180, result.deadlineSeconds);
    if (job.timeoutSeconds === result.deadlineSeconds)
      throw new Error('Job timeout must leave time for campaign staging and assignment.');
    const { id: unused, timeoutSeconds, ...spec } = job;
    jobPlan({
      ...spec,
      taskId: input.taskId,
      cloudAllocationId: input.cloudAllocationId,
      deadlineSeconds: timeoutSeconds,
    });
    for (const item of job.cases)
      for (const mount of item.inputs ?? [])
        if (!bundles.has(mount.bundle)) throw new Error('Input mount has no admitted bundle.');
  }
  if (
    input.jobs.some((job) => job.mode === 'browser-session') &&
    (input.jobs.length !== 1 || input.concurrency !== 1 || result.lifetime !== 'attached')
  )
    throw new Error('An attached browser campaign owns one exclusive local device and one job.');
  if (Buffer.byteLength(JSON.stringify(result)) > 16 * 1024 ** 2)
    throw new Error('Campaign exceeds 16 MiB.');
  return result;
}
export function executionPlan(campaign, job) {
  const { id: unused, timeoutSeconds, ...spec } = job;
  return jobPlan({
    ...spec,
    taskId: campaign.taskId,
    cloudAllocationId: campaign.cloudAllocationId,
    deadlineSeconds: timeoutSeconds,
  });
}
export function authenticate(run, capability) {
  if (!run || typeof capability !== 'string' || digest(capability) !== run.secretHash)
    throw new Error('Claim capability does not match.');
}
export function fence(worker, event, now = Date.now(), cleanup = false) {
  if (
    !worker ||
    worker.runId !== event.runId ||
    worker.generation !== event.generation ||
    (event.caseId && worker.caseId !== event.caseId)
  )
    throw new Error('Stale worker/run/case generation.');
  if (!cleanup && (worker.state !== 'leased' || worker.leaseUntil <= now || worker.deadline <= now))
    throw new Error('Lease expired or dispatch closed.');
}
export const estimate = (plan, config) =>
  Math.ceil(((plan.deadlineSeconds + 480) / 3600) * config.hourlyMicroUsd) +
  config.storageMicroUsd +
  Math.ceil((plan.outputLimitBytes / 1024 ** 3) * 200000);
