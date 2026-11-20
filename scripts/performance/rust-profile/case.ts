import { createHash } from 'node:crypto';
import { createNetworkOwner } from '@open-legend/network';
import { runRemoteProcess } from '@open-legend/network/node';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { readCaseBuild } from './case-build.js';
import { readRaw, writeCaseEvidence } from './case-evidence.js';
import { jsonFile, object, sha256, text, writeJson } from './contract.js';
import type { CasePlan } from './contract.js';
import { writeCpuEvidence } from './cpu-evidence.js';
import { stageFixture } from './fixture.js';
import { verifyCaseInputs } from './inputs.js';

async function supervisorFile(path: string) {
  const file = await lstat(path);
  if (!file.isFile() || file.uid !== 0 || file.mode & 0o222)
    throw new Error('The case needs the root-owned managed worker execution receipt.');
  return object(JSON.parse(await readFile(path, 'utf8')));
}

function environment(name: string) {
  return text(process.env[name], name);
}

/** Executes the pinned direct gameplay case inside its already claimed
 * worker and independent database. This function never allocates a machine.
 */
export async function runCase(plan: CasePlan, outputDirectory: string): Promise<void> {
  const initializedAt = new Date().toISOString();
  const sourcePath = environment('OPENLEGEND_VERIFICATION_MANIFEST');
  const inputsRoot = environment('OPENLEGEND_JOB_INPUTS');
  const source = await supervisorFile(sourcePath);
  const execution = object(source.execution);
  const hardware = object(execution.hardware);
  const machine = object(execution.machine);
  const postgres = await supervisorFile(environment('OPENLEGEND_JOB_POSTGRES_OWNERSHIP'));
  for (const key of ['runId', 'generation', 'caseId'])
    if (postgres[key] !== execution[key])
      throw new Error('PostgreSQL receipt refers to another case.');
  const database = new URL(environment('DATABASE_URL'));
  if (
    (await realpath(process.cwd())) !== (await realpath(join(dirname(sourcePath), 'source'))) ||
    source.commit !== plan.source ||
    execution.caseId !== plan.runnerCaseId ||
    hardware.instanceType !== plan.hardware.instanceType ||
    hardware.vcpus !== plan.hardware.vcpus ||
    machine.memoryMiB !== plan.hardware.memoryMiB ||
    typeof hardware.memoryMiB !== 'number' ||
    hardware.memoryMiB < 15 * 1024 ||
    postgres.exclusiveCluster !== true ||
    postgres.status !== 'verified' ||
    process.platform !== 'linux' ||
    process.arch !== 'x64' ||
    process.getuid?.() === 0 ||
    environment('AI_BUDGET_USD') !== '0' ||
    database.hostname !== '127.0.0.1' ||
    database.port !== '5432' ||
    !database.pathname.slice(1).startsWith(environment('OPENLEGEND_FIXTURE_DATABASE_PREFIX'))
  ) {
    throw new Error('Case ownership, executable source, worker or fresh database is unverified.');
  }
  await mkdir(outputDirectory, { mode: 0o700, recursive: true });
  const output = await realpath(outputDirectory);
  const home = await realpath(environment('HOME'));
  const work = await mkdtemp(join(home, 'rust-profile-'));
  const pairedBuild = join(home, `rust-build-${plan.runnerCaseId}`);
  let phase = 'verify-inputs';
  let failure: unknown;
  let executableSha256: string | null = null;
  let adaptedInputs;
  let raw: Record<string, unknown> = {};
  let cleanup = 'case-workspace-released; supervisor owns database and worker cleanup';
  const commands = createNetworkOwner({ role: 'rust-profile-case-process', capacity: 1 });
  const deadline = performance.now() + plan.hardDeadlineSeconds * 1000;
  async function run(executable: string, args: string[], env: NodeJS.ProcessEnv) {
    const remainingMs = Math.floor(deadline - performance.now());
    if (remainingMs <= 0) throw new Error('The frozen case deadline expired.');
    const result = await commands.run({ timeoutMs: remainingMs }, (operation) =>
      runRemoteProcess(operation, {
        command: executable,
        args,
        env,
        maxOutputBytes: 2 * 1024 ** 2,
      }),
    );
    await writeFile(join(output, phase + '.log'), result.stdout + result.stderr, {
      flag: 'wx',
      mode: 0o600,
    });
    if (result.exitCode !== 0 || result.signal)
      throw new Error(`Managed subprocess ended with ${result.signal ?? result.exitCode}.`);
  }
  const diagnosticModes: ('sampled' | 'sql')[] =
    plan.mode === 'sampled' || plan.mode === 'sql' ? [plan.mode] : [];
  const usesFramePointers = plan.mode === 'sampled' || plan.mode === 'sampling-control';
  const usesFeature = plan.mode === 'enabled' || plan.mode === 'disabled';
  const rustflags = usesFramePointers ? '-C force-frame-pointers=yes' : undefined;
  try {
    const inputs = await verifyCaseInputs(inputsRoot, plan.inputHashes, diagnosticModes);
    phase = 'stage-fixture';
    const fixture = await stageFixture(plan, work, inputs);
    adaptedInputs = fixture.hashes;
    phase = 'build-release';
    const built = await readCaseBuild(plan, source, output, pairedBuild, () =>
      run(process.execPath, [fixture.build, 'direct', output, plan.source], {
        ...process.env,
        RUSTFLAGS: rustflags,
        CARGO_PROFILE_RELEASE_DEBUG: usesFramePointers ? 'line-tables-only' : undefined,
        CARGO_PROFILE_RELEASE_STRIP: usesFramePointers ? 'none' : undefined,
      }),
    );
    executableSha256 = text(object(built.executable).sha256, 'release executable digest', sha256);
    phase = 'ordinary-play';
    try {
      await run(process.execPath, [fixture.launch, 'direct', output, plan.source], {
        ...process.env,
        OPEN_LEGEND_PROFILE_CASE: JSON.stringify({
          mode: plan.mode,
          probeIds: plan.probeIds,
          seed: plan.seed,
          samplingProbability: plan.samplingProbability,
          warmupSeconds: plan.warmupSeconds,
          measureSeconds: plan.measureSeconds,
          drainSeconds: plan.drainSeconds,
          workDirectory: work,
          ...(plan.mode === 'sampled'
            ? { sampler: join(inputsRoot, 'profile', 'ol-profile-sampler.so') }
            : {}),
        }),
      });
    } catch (error) {
      // Keep usable partial evidence without hiding the subprocess failure
      // if the driver did not finish writing its result.
      raw = await readRaw(output).catch(() => ({}));
      throw error;
    }
    phase = 'reduce-instrument';
    raw = await readRaw(output);
    if (plan.mode === 'enabled') object(await jsonFile(output, 'metrics.json', 128 * 1024 ** 2));
    if (plan.mode === 'sampled') {
      // The retained symbolizer uses this relative layout. The links live
      // outside evidence, and point only to this case's verified artifacts.
      await symlink(output, join(work, 'sampled'));
      await symlink(join(output, 'toolchain.json'), join(work, 'toolchain.json'));
      await run('python3', [join(inputsRoot, 'profile', 'symbolize.py'), work], process.env);
      await writeCpuEvidence(output, raw);
    }
  } catch (error) {
    failure = error;
  } finally {
    try {
      const stopped = await commands.shutdown({ timeoutMs: 4000 });
      if (stopped.unresolved !== 0)
        throw new Error('Managed commands did not close. The supervisor retains the workspace.');
      await rm(work, { force: true, recursive: true });
      if (plan.sharedBuild?.role === 'second')
        await rm(pairedBuild, { force: true, recursive: true });
    } catch (error) {
      cleanup = 'case workspace cleanup failed';
      if (!failure) {
        phase = 'cleanup-case-workspace';
        failure = error;
      }
    }
  }
  const workload = await writeCaseEvidence(output, plan, raw);
  if (!failure && !Object.values(workload.checks).every(Boolean)) {
    phase = 'qualify-workload';
    failure = new Error('The actual gameplay journey did not satisfy the frozen case assertions.');
  }
  const completedAt = new Date().toISOString();
  await writeJson(join(output, 'manifest.json'), {
    id: plan.id,
    source: plan.source,
    toolSource: plan.toolSource,
    comparisonIdentity: plan.comparisonIdentity,
    runnerCaseId: plan.runnerCaseId,
    sharedBuild: plan.sharedBuild,
    mode: plan.mode,
    probeIds: plan.probeIds,
    samplingProbability: plan.samplingProbability,
    samplingSeed: plan.seed,
    executableSha256,
    inputHashes: plan.inputHashes,
    adaptedInputs,
    sourceArchiveSha256: source.archiveSha256,
    runId: execution.runId,
    generation: execution.generation,
    instanceType: hardware.instanceType,
    instanceId: text(machine.instanceId, 'owned worker instance'),
    hardware,
    databaseIdHash: createHash('sha256').update(database.pathname).digest('hex'),
    build: {
      profile: 'release',
      features: usesFeature ? ['profile-campaign'] : [],
      framePointers: usesFramePointers,
    },
    initializedAt,
    completedAt,
  });
  await writeJson(join(output, 'completion.json'), {
    status: failure ? 'failed' : 'completed',
    ...(failure ? { reason: phase, failureCode: safeFailureCode(failure) } : {}),
    cleanup,
  });
  if (failure)
    throw new Error(
      `The Rust profile case stopped at ${phase}. Preserve the original worker artifacts.`,
      { cause: failure },
    );
}

/** Keep the operating system failure classification without saving arbitrary
 * exception text, paths, environment values or subprocess arguments.
 */
function safeFailureCode(failure: unknown) {
  if (
    failure instanceof Error &&
    'code' in failure &&
    typeof failure.code === 'string' &&
    /^(?:E[A-Z0-9_]+|ERR_[A-Z0-9_]+)$/.test(failure.code) &&
    failure.code.length <= 32
  ) {
    return failure.code;
  }
  return undefined;
}
