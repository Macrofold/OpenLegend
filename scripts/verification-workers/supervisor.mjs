// Root owns leases and cleanup; admitted code runs without its credentials.
// docs/technical/verification-workers.md#network-and-execution-boundary
import { setTimeout as delay } from 'node:timers/promises';
import {
  mkdir,
  readFile,
  writeFile,
  rm,
  chown,
  chmod,
  stat,
  statfs,
  open,
  readdir,
  link,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { clientOptions, send } from './aws.mjs';
import { defaults, id, fence, digest, integrityError } from './contracts.mjs';
import { json, files, manifest, hashFile } from './files.mjs';
import { download, upload, getJson } from './artifacts.mjs';
import { executionRequest } from './execution.mjs';
import { verifySnapshot, verifyFiles } from './source.mjs';
import { exec, directoryBytes } from './process.mjs';
import { cachedArchive } from './blobs.mjs';
const root = '/var/lib/openlegend-verification';
const config = JSON.parse(await readFile('/etc/openlegend-verification.json', 'utf8'));
const db = DynamoDBDocumentClient.from(new DynamoDBClient(clientOptions()));
const lambda = new LambdaClient(clientOptions());
const lease = async () =>
  (
    await send(db, GetCommand, {
      TableName: config.table,
      Key: { pk: `worker:${config.slot}` },
      ConsistentRead: true,
    })
  ).Item;
const unit = (runId) => `ol-verification-${id(runId)}`;
const childUnit = (runId, caseId, phase) =>
  `${unit(runId)}-${digest([id(caseId), phase]).slice(0, 32)}`;
async function lock(work) {
  const path = '/run/openlegend-verification-transition.lock';
  let handle;
  for (let i = 0; i < 100; i++) {
    try {
      handle = await open(path, 'wx', 0o600);
      await handle.writeFile(String(process.pid));
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        const pid = Number(await readFile(path, 'utf8'));
        if (Number.isSafeInteger(pid) && pid > 0) process.kill(pid, 0);
      } catch (e) {
        if (e.code === 'ESRCH') await rm(path, { force: true });
        else if (e.code !== 'ENOENT') throw e;
      }
      await delay(100);
    }
  }
  if (!handle) throw new Error('Host transition lock is busy.');
  try {
    return await work();
  } finally {
    await handle.close();
    await rm(path, { force: true });
  }
}
async function report(job, data) {
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const result = await send(
        lambda,
        InvokeCommand,
        {
          FunctionName: config.functionName,
          Payload: Buffer.from(
            JSON.stringify({
              action: 'report',
              runId: job.runId,
              generation: job.generation,
              workerSecret: job.workerSecret,
              ...data,
            }),
          ),
        },
        70000,
      );
      const value = JSON.parse(Buffer.from(result.Payload).toString());
      if (result.FunctionError)
        throw new Error(value.errorMessage ?? 'Controller rejected supervisor report.');
      if (value.pending || value.busy) {
        await delay(1200 + Math.random() * 600);
        continue;
      }
      return value;
    } catch (error) {
      if (error.name !== 'TooManyRequestsException' || attempt === 11) throw error;
      await delay(300 + Math.random() * 300);
    }
  }
  throw new Error('Supervisor report remains pending; recovery is required.');
}

async function assertExclusive() {
  try {
    const active = await exec('ps', ['-u', 'olverify', '-o', 'pid=,args=']);
    if (active.stdout.trim())
      throw new Error('Foreign worker-user processes exist; quarantine for inspection.');
  } catch (error) {
    if (error.code !== 1) throw error;
  }
}
async function assertCleanDatabases() {
  const result = await exec('runuser', [
    '-u',
    'postgres',
    '--',
    'psql',
    '-Atc',
    "SELECT datname FROM pg_database WHERE datname NOT IN ('postgres','template0','template1')",
  ]);
  if (result.stdout.trim())
    throw integrityError('Unowned databases remain; retain the host for inspection.');
}
async function cleanupDatabase(runId) {
  const prefix = `ol_vw_${runId.replaceAll('-', '')}_`;
  const { stdout } = await exec('runuser', [
    '-u',
    'postgres',
    '--',
    'psql',
    '-Atc',
    `SELECT datname FROM pg_database WHERE starts_with(datname, '${prefix}')`,
  ]);
  for (const name of stdout.trim().split('\n').filter(Boolean)) {
    if (!new RegExp(`^${prefix}[a-f0-9]{16}$`).test(name))
      throw new Error('Refusing an unrelated database.');
    await exec('runuser', [
      '-u',
      'postgres',
      '--',
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${name}';`,
    ]);
    await exec('runuser', ['-u', 'postgres', '--', 'dropdb', name]);
  }
}
async function phase(job, events, name, work) {
  const entry = { name, startAt: Date.now(), startMonoMs: performance.now() };
  events.push(entry);
  try {
    const value = await work();
    entry.outcome = 'completed';
    return value;
  } catch (error) {
    entry.outcome = 'failed';
    entry.error = String(error);
    throw error;
  } finally {
    entry.endAt = Date.now();
    entry.elapsedMs = performance.now() - entry.startMonoMs;
  }
}
async function command(job, item, phaseName, argv, cwd, results, env) {
  if (job.stopError) throw new Error(job.stopError);
  await assertExclusive();
  fence(await lease(), { runId: job.runId, generation: job.generation, caseId: item.id });
  const seconds = Math.floor((job.deadline - Date.now() - defaults.cleanupMs) / 1000);
  if (seconds <= 0) throw new Error('No command allowance remains.');
  const log = await open(join(results, `${phaseName}.log`), 'a', 0o600);
  const name = childUnit(job.runId, item.id, phaseName);
  const databaseUrl = 'postgres://olverify@127.0.0.1:5432/postgres';
  const environment = {
    PATH: '/usr/local/bin:/usr/bin:/bin',
    HOME: join(cwd, '..', 'home'),
    LANG: 'C.UTF-8',
    COREPACK_HOME: join(root, 'cache', 'corepack'),
    // Comparison sources cannot silently select another pnpm instead of the admitted toolchain.
    COREPACK_ENABLE_PROJECT_SPEC: '0',
    AI_BUDGET_USD: '0',
    ...(job.plan.paid
      ? { OPENLEGEND_JOB_EXECUTION: join(cwd, '..', 'execution-private.json') }
      : {}),
    OPEN_LEGEND_PROFILE_POSTGRES_URL: databaseUrl,
    OPENLEGEND_STRESS_DATABASE_URL: databaseUrl,
    OPENLEGEND_FIXTURE_DATABASE_PREFIX: `ol_vw_${job.runId.replaceAll('-', '')}_`,
    OPENLEGEND_VERIFICATION_MANIFEST: join(cwd, '..', 'source.json'),
    OPENLEGEND_PROFILE_SOURCE_SHA: item.source,
    OPENLEGEND_JOB_INPUTS: join(cwd, '..', 'inputs'),
    OPENLEGEND_JOB_DATABASES: join(cwd, '..', 'databases.json'),
    ...env,
  };
  try {
    const result = await unprivileged(
      argv.map((value) =>
        value
          .replaceAll('{results}', results)
          .replaceAll('{source}', cwd)
          .replaceAll('{inputs}', join(cwd, '..', 'inputs')),
      ),
      {
        name,
        cwd,
        seconds,
        environment,
        maxBuffer: Math.min(job.plan.outputLimitBytes, 8 * 1024 ** 2),
      },
    );
    await log.writeFile(result.stdout + result.stderr);
  } catch (error) {
    await log.writeFile(`${error}\n${error.stdout ?? ''}${error.stderr ?? ''}`);
    throw error;
  } finally {
    await log.close();
  }
}
async function unprivileged(argv, { name, cwd, seconds, environment, maxBuffer = 8 * 1024 ** 2 }) {
  return exec(
    'systemd-run',
    [
      '--quiet',
      '--wait',
      '--pipe',
      '--collect',
      `--unit=${name}`,
      '--uid=olverify',
      `--working-directory=${cwd}`,
      '--property=KillMode=control-group',
      '--property=TimeoutStopSec=10',
      `--property=RuntimeMaxSec=${seconds}`,
      '--property=MemoryMax=12G',
      '--slice=ol-verification-untrusted.slice',
      ...Object.entries(environment).map(([key, value]) => `--setenv=${key}=${value}`),
      '--',
      ...argv,
    ],
    { timeoutMs: (seconds + 30) * 1000, maxBuffer },
  );
}
async function stopChildren(job) {
  for (const item of job.plan.cases)
    for (const name of ['install', 'bindings', ...item.steps.map((step) => `step-${step.id}`)]) {
      await exec('systemctl', ['stop', childUnit(job.runId, item.id, name)]).catch((error) => {
        if (!String(error.stderr).includes('not loaded')) throw error;
      });
    }
}
let nextDiskCheck = 0;
async function pressureGuard(job) {
  const disk = await statfs(root);
  const directory = join(root, 'runs', job.runId);
  let bytes = 0;
  for (const item of job.plan.cases) {
    try {
      for (const file of await files(join(directory, 'cases', item.id, 'results'), '', 512))
        bytes += (await stat(join(directory, 'cases', item.id, 'results', file))).size;
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  let runBytes = 0;
  if (Date.now() >= nextDiskCheck) {
    nextDiskCheck = Date.now() + 30000;
    const usage = await directoryBytes(directory);
    const database = await exec('runuser', [
      '-u',
      'postgres',
      '--',
      'psql',
      '-Atc',
      `SELECT coalesce(sum(pg_database_size(oid)),0) FROM pg_database WHERE starts_with(datname,'ol_vw_${job.runId.replaceAll('-', '')}_')`,
    ]);
    runBytes = usage + Number(database.stdout.trim());
  }
  if (
    disk.bavail * disk.bsize < 10 * 1024 ** 3 ||
    bytes > job.plan.outputLimitBytes ||
    runBytes > job.plan.diskLimitBytes
  ) {
    await stopChildren(job);
    throw new Error('Run output/free-space allowance exceeded.');
  }
}
async function prepareInputs(job, item, directory) {
  const inputs = join(directory, 'inputs');
  await mkdir(inputs, { recursive: true, mode: 0o755 });
  for (const mount of item.inputs ?? []) {
    const prefix = `workers/${config.slot}/runs/${job.runId}/inputs/${mount.bundle}`;
    const descriptor = await getJson(config.bucket, `${prefix}.json`);
    if (
      descriptor.archiveSha256 !== job.inputs[mount.bundle].archiveSha256 ||
      descriptor.sha256 !== job.inputs[mount.bundle].sha256 ||
      !Number.isSafeInteger(descriptor.archiveBytes) ||
      descriptor.archiveBytes > 512 * 1024 ** 2 ||
      Object.values(descriptor.files).reduce((sum, file) => sum + file.bytes, 0) > 512 * 1024 ** 2
    )
      throw integrityError('Input descriptor exceeds or differs from admission.');
    const archive = join(directory, `input-${mount.id}.tar.gz`),
      target = join(inputs, mount.id);
    const blob = await cachedArchive({
      bucket: config.bucket,
      key: `${prefix}.tar.gz`,
      sha256: descriptor.archiveSha256,
      bytes: descriptor.archiveBytes,
      cache: join(root, 'blobs'),
      temporary: archive,
    });
    (job.archiveCache ??= []).push({
      caseId: item.id,
      input: mount.id,
      sha256: descriptor.archiveSha256,
      hit: blob.hit,
      bytes: blob.bytes,
      elapsedMs: blob.elapsedMs,
    });
    await mkdir(target, { mode: 0o755 });
    await exec('tar', [
      '-xzf',
      blob.path,
      '--no-same-owner',
      '--no-same-permissions',
      '-C',
      target,
    ]);
    await verifyFiles(target, descriptor);
    await exec('chmod', ['-R', 'a-w,a+rX', target]);
    if (!blob.cached) await rm(archive);
  }
}
async function execute(job) {
  for (const item of job.plan.cases) {
    Object.freeze(item.env);
    for (const step of item.steps) {
      Object.freeze(step.argv);
      Object.freeze(step);
    }
    Object.freeze(item.steps);
    Object.freeze(item.inputs);
    Object.freeze(item.databases);
    Object.freeze(item);
  }
  Object.freeze(job.plan.cases);
  Object.freeze(job.plan);
  const directory = join(root, 'runs', job.runId);
  const events = [];
  let outcome = 'completed',
    failure;
  const captured = [];
  let guardError, guardPending;
  const guard = setInterval(() => {
    if (guardPending) return;
    guardPending = pressureGuard(job)
      .catch(async (error) => {
        guardError = error;
        job.stopError = String(error);
        await stopChildren(job);
      })
      .finally(() => {
        guardPending = undefined;
      });
    guardPending.catch((error) => {
      guardError = error;
    });
  }, 5000);
  try {
    await assertCleanDatabases();
    await assertExclusive();
    const previous = (await lease()).lastRunId;
    if (previous && previous !== job.runId) {
      const path = join(root, 'runs', id(previous));
      let sealed;
      try {
        sealed = await json(join(path, 'manifest.json'));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      if (sealed) {
        const exported = await getJson(
          config.bucket,
          `workers/${config.slot}/runs/${previous}/manifest.json`,
        );
        if (digest(sealed) !== digest(exported))
          throw new Error('Previous export differs; retain its local evidence.');
        await rm(path, { recursive: true, force: true });
      }
    }
    for (const item of job.plan.cases) {
      const current = await lease();
      fence(current, { runId: job.runId, generation: job.generation, caseId: item.id });
      const path = join(directory, 'cases', item.id);
      const source = join(path, 'source'),
        results = join(path, 'results');
      await mkdir(results, { recursive: true });
      await mkdir(source);
      await mkdir(join(path, 'home'));
      const descriptor = await getJson(
        config.bucket,
        `sources/${item.source}/${item.sourceHash}.json`,
      );
      if (descriptor.commit !== item.source || descriptor.archiveSha256 !== item.sourceHash)
        throw integrityError('Source descriptor differs from the admitted snapshot.');
      if (
        !Number.isSafeInteger(descriptor.archiveBytes) ||
        descriptor.archiveBytes <= 0 ||
        descriptor.archiveBytes > job.plan.diskLimitBytes ||
        Object.values(descriptor.files).reduce((sum, file) => sum + file.bytes, 0) >
          job.plan.diskLimitBytes
      )
        throw new Error('Source exceeds the admitted disk allowance.');
      await json(join(path, 'source.json'), descriptor);
      await phase(job, events, `${item.id}:source`, async () => {
        const localArchive = join(path, 'source.tar.gz');
        const blob = await cachedArchive({
          bucket: config.bucket,
          key: `sources/${item.source}/${item.sourceHash}.tar.gz`,
          sha256: item.sourceHash,
          bytes: descriptor.archiveBytes,
          cache: join(root, 'blobs'),
          temporary: localArchive,
        });
        (job.archiveCache ??= []).push({
          caseId: item.id,
          source: item.source,
          sha256: item.sourceHash,
          hit: blob.hit,
          bytes: blob.bytes,
          elapsedMs: blob.elapsedMs,
        });
        if (descriptor.dirty && blob.path !== localArchive) await link(blob.path, localArchive);
        const archive = blob.path;
        const listing = await exec('tar', ['-tzf', archive], { maxBuffer: 8 * 1024 ** 2 });
        if (
          listing.stdout.split('\n').some((p) => p.startsWith('/') || p.split('/').includes('..'))
        )
          throw integrityError('Archive escapes its source directory.');
        await exec('tar', [
          '-xzf',
          archive,
          '--no-same-owner',
          '--no-same-permissions',
          '-C',
          source,
        ]);
        await verifySnapshot(source, descriptor);
        for (const writable of [source, results, join(path, 'home')])
          await exec('chown', ['-R', 'olverify:olverify', writable]);
        await chmod(join(path, 'source.json'), 0o444);
      });
      const cache = await directoryBytes(join(root, 'cache'));
      if (cache > 10 * 1024 ** 3)
        await command(
          job,
          item,
          'install',
          ['pnpm', 'store', 'prune', '--store-dir', join(root, 'cache', 'pnpm')],
          source,
          results,
          {},
        );
      await report(job, { kind: 'ready', phase: 'preparing', caseId: item.id });
      await phase(job, events, `${item.id}:dependencies`, () =>
        command(
          job,
          item,
          'install',
          [
            'pnpm',
            'install',
            '--frozen-lockfile',
            '--prefer-offline',
            '--store-dir',
            join(root, 'cache', 'pnpm'),
          ],
          source,
          results,
          {},
        ),
      );
      await phase(job, events, `${item.id}:workspace-bindings`, () =>
        command(
          job,
          item,
          'bindings',
          ['node', '--import', 'tsx', '/opt/openlegend-verification/workspace-check.mjs'],
          source,
          results,
          {},
        ),
      );
      await verifySnapshot(source, descriptor);
      let readyPoll, readyPending;
      let runtimeEnv = item.env;
      if (job.plan.paid) {
        const grant = await getJson(config.bucket, job.executionKey);
        const path = join(root, 'runs', job.runId, 'cases', item.id, 'execution-private.json');
        await json(path, {
          ...grant,
          caseId: item.id,
          sourceHash: item.sourceHash,
          deadlineMs: Math.min(grant.deadlineMs, job.deadline),
        });
        await exec('chmod', ['444', path]);
      }
      const browserState = {};
      try {
        if (job.plan.mode === 'browser-session') {
          runtimeEnv = {
            ...item.env,
            OPENLEGEND_PROFILE_BROWSER: '1',
            OPENLEGEND_PROFILE_READY_PATH: join(results, 'ready.json'),
            OPENLEGEND_PROFILE_BROWSER_START_PATH: join(results, 'capture-start.json'),
          };
          readyPoll = setInterval(() => {
            if (readyPending || browserState.captureComplete) return;
            readyPending = browserReady(job, item, results, browserState)
              .catch((e) => {
                guardError = e;
              })
              .finally(() => {
                readyPending = undefined;
              });
          }, 1000);
        }
        await report(job, { kind: 'ready', phase: 'running', caseId: item.id });
        let databases;
        await phase(job, events, `${item.id}:fixtures`, async () => {
          await prepareInputs(job, item, path);
          databases = {};
          for (const alias of item.databases ?? []) {
            const name = `ol_vw_${job.runId.replaceAll('-', '')}_${digest([item.id, alias]).slice(0, 16)}`;
            await exec('runuser', ['-u', 'postgres', '--', 'createdb', '--owner=olverify', name]);
            databases[alias] = `postgres://olverify@127.0.0.1:5432/${name}`;
          }
          await json(join(path, 'databases.json'), databases);
          await chmod(join(path, 'databases.json'), 0o444);
        });
        for (const step of item.steps) {
          await phase(job, events, `${item.id}:${step.id}`, () =>
            command(job, item, `step-${step.id}`, step.argv, source, results, {
              ...runtimeEnv,
              ...(step.database
                ? {
                    PGHOST: '127.0.0.1',
                    PGPORT: '5432',
                    PGUSER: 'olverify',
                    PGDATABASE: new URL(databases[step.database]).pathname.slice(1),
                    DATABASE_URL: databases[step.database],
                  }
                : {}),
            }),
          );
          await phase(job, events, `${item.id}:${step.id}:source-check`, () =>
            verifySnapshot(source, descriptor),
          );
        }
        for (const artifact of item.requiredArtifacts ?? []) await stat(join(results, artifact));
        fence(await lease(), { runId: job.runId, generation: job.generation, caseId: item.id });
        if (guardError) throw guardError;
      } finally {
        clearInterval(readyPoll);
        await readyPending;
      }
      await phase(job, events, `${item.id}:case-cleanup`, async () => {
        await cleanupDatabase(job.runId);
        await assertCleanDatabases();
        captured.push(item.id);
        await report(job, { kind: 'case', caseId: item.id, success: true });
        await rm(source, { recursive: true, force: true });
        await rm(join(path, 'home'), { recursive: true, force: true });
        await rm(join(path, 'inputs'), { recursive: true, force: true });
        await rm(join(path, 'databases.json'), { force: true });
        if (!descriptor.dirty) await rm(join(path, 'source.tar.gz'), { force: true });
      });
    }
  } catch (error) {
    outcome = 'failed';
    const current = await lease().catch(() => undefined);
    if (
      current?.runId === job.runId &&
      (current.state !== 'leased' ||
        current.leaseUntil <= Date.now() ||
        current.deadline <= Date.now())
    )
      outcome = 'interrupted';
    failure = String(error);
    if (error.code === 'VERIFICATION_INTEGRITY') job.failureKind = 'integrity';
    console.error(failure);
  } finally {
    clearInterval(guard);
    await guardPending;
    await finalize(job, events, outcome, failure, captured);
  }
}
async function finalize(job, events, outcome, failure, captured = []) {
  const directory = join(root, 'runs', job.runId);
  if (job.plan.paid) {
    try {
      const grant = await getJson(config.bucket, job.executionKey);
      job.paidClosure = await executionRequest(
        grant.url,
        grant.token,
        `/grants/${grant.id}/close`,
        {},
      );
    } catch {
      job.paidClosure = { uncertain: true };
    }
  }
  let clean = false;
  try {
    await phase(job, events, 'cleanup', async () => {
      await stopChildren(job);
      await cleanupDatabase(job.runId);
      await assertExclusive();
      await assertCleanDatabases();
    });
    clean = true;
  } catch (error) {
    outcome = 'failed';
    failure = `${failure ?? ''}\nCleanup: ${error}`;
  }
  let sealed;
  try {
    sealed = await json(join(directory, 'manifest.json'));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  if (sealed) {
    for (const entry of sealed.files) {
      const path = join(directory, entry.path);
      if ((await hashFile(path)) !== entry.sha256)
        throw new Error('Sealed recovery artifact changed.');
      await upload(config.bucket, entry.key, path);
    }
    await upload(
      config.bucket,
      `workers/${config.slot}/runs/${job.runId}/manifest.json`,
      join(directory, 'manifest.json'),
    );
    await json(join(directory, 'recovery.json'), {
      runId: job.runId,
      generation: job.generation,
      clean,
      outcome: 'interrupted',
      failure,
      manifestHash: digest(sealed),
      at: Date.now(),
    });
    await upload(
      config.bucket,
      `workers/${config.slot}/runs/${job.runId}/recovery.json`,
      join(directory, 'recovery.json'),
    );
    const completed = await report(job, { kind: 'complete', recovered: true });
    if (clean && completed.phase === 'finished')
      await rm(directory, { recursive: true, force: true });
    return;
  }
  await json(
    join(directory, 'source.json'),
    job.plan.cases.map((item) => ({
      caseId: item.id,
      commit: item.source,
      archiveSha256: item.sourceHash,
    })),
  );
  const cpu = await readFile('/proc/cpuinfo', 'utf8');
  await json(join(directory, 'environment.json'), {
    ...(await json(join(root, 'prepared.json'))),
    worker: await lease().then(({ workerId, generation, instanceId }) => ({
      workerId,
      generation,
      instanceId,
    })),
    monitoring: { outputPollMs: 5000, diskAndDatabasePollMs: 30000 },
    supervisorSha256: await hashFile('/opt/openlegend-verification/supervisor.mjs'),
    disk: await exec('df', ['-B1', root]).then((r) => r.stdout),
    memory: await readFile('/proc/meminfo', 'utf8'),
    cpu,
    platform: process.platform,
    planHash: job.planHash,
    commands: job.plan.cases,
    inputs: job.inputs,
    archiveCache: job.archiveCache,
  });
  await json(join(directory, 'result.json'), {
    runId: job.runId,
    outcome,
    failure,
    failureKind: job.failureKind,
    completedCases: captured,
    acceptance:
      outcome !== 'completed'
        ? 'failed'
        : job.plan.acceptance === 'measurement'
          ? 'measurement-only'
          : 'unassessed',
  });
  await json(join(directory, 'timeline.json'), events);
  const receipt = {
    runId: job.runId,
    generation: job.generation,
    clean,
    outcome,
    failure,
    failureKind: job.failureKind,
    finishedAt: Date.now(),
    stop: 'pending',
    ...(job.paidClosure ? { paidClosure: job.paidClosure } : {}),
  };
  await json(join(directory, 'completion.json'), receipt);
  const entries = [];
  const selected = [
    'result.json',
    'timeline.json',
    'completion.json',
    'source.json',
    'environment.json',
  ];
  const preservedSources = new Set();
  for (const item of job.plan.cases) {
    try {
      for (const file of await files(join(directory, 'cases', item.id, 'results'), '', 512))
        selected.push(join('cases', item.id, 'results', file));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    try {
      await stat(join(directory, 'cases', item.id, 'source.json'));
      selected.push(join('cases', item.id, 'source.json'));
      const descriptor = await json(join(directory, 'cases', item.id, 'source.json'));
      if (descriptor.dirty && !preservedSources.has(descriptor.archiveSha256)) {
        selected.push(join('cases', item.id, 'source.tar.gz'));
        preservedSources.add(descriptor.archiveSha256);
      }
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  const missing = job.plan.requiredArtifacts.filter((file) => !selected.includes(file));
  if (outcome === 'completed' && missing.length) {
    outcome = 'failed';
    failure = `Required artifacts absent: ${missing.join(', ')}`;
    await json(join(directory, 'result.json'), {
      runId: job.runId,
      outcome,
      failure,
      acceptance: 'failed',
    });
    await json(join(directory, 'completion.json'), {
      runId: job.runId,
      generation: job.generation,
      clean,
      outcome,
      failure,
      stop: 'pending',
    });
  }
  let totalBytes = 0;
  const publicationStartedAt = Date.now();
  for (const file of selected) {
    const path = join(directory, file);
    const bytes = (await stat(path)).size;
    if (totalBytes + bytes > job.plan.outputLimitBytes)
      throw new Error('Captured artifact budget exceeded; results retained on EBS.');
    totalBytes += bytes;
    const key = `workers/${config.slot}/runs/${job.runId}/${file}`;
    await upload(config.bucket, key, path);
    entries.push({ path: file, key, bytes, sha256: await hashFile(path) });
  }
  const value = { runId: job.runId, generation: job.generation, files: entries };
  await json(join(directory, 'manifest.json'), value);
  await upload(
    config.bucket,
    `workers/${config.slot}/runs/${job.runId}/manifest.json`,
    join(directory, 'manifest.json'),
  );
  if (clean)
    for (const item of job.plan.cases)
      for (const name of ['source', 'home', 'source.tar.gz'])
        await rm(join(directory, 'cases', item.id, name), { recursive: true, force: true });
  const completed = await report(job, {
    kind: 'complete',
    publication: {
      startedAt: publicationStartedAt,
      finishedAt: Date.now(),
      bytes: totalBytes,
      files: entries.length,
    },
  });
  if (clean && completed.phase === 'finished')
    await rm(directory, { recursive: true, force: true });
}
async function browserReady(job, item, results, state) {
  let ready;
  try {
    ready = await json(join(results, 'ready.json'));
  } catch (e) {
    if (e.code === 'ENOENT') return;
    throw e;
  }
  const marker = join(results, 'capture-start.json');
  const current = await lease();
  try {
    const signal = current.captureSignal;
    if (signal) {
      fence(current, {
        runId: signal.runId,
        generation: signal.generation,
        caseId: signal.caseId,
      });
      await writeFile(marker, JSON.stringify({ startedAtUnixMs: Date.now() }), {
        flag: 'wx',
        mode: 0o644,
      });
    }
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
  }
  if (current.captureSignal?.finishedAt) {
    fence(current, { runId: job.runId, generation: job.generation, caseId: item.id });
    try {
      await writeFile(
        marker + '.complete',
        JSON.stringify({ finishedAt: current.captureSignal.finishedAt }),
        { flag: 'wx', mode: 0o644 },
      );
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
  let captureAck;
  try {
    captureAck = await json(marker + '.ack');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const detail = {
    ...ready,
    captureAck,
    caseId: item.id,
    runId: job.runId,
    generation: job.generation,
  };
  if (state.readyHash !== digest(detail)) {
    await report(job, { kind: 'ready', phase: 'running', caseId: item.id, ready: detail });
    state.readyHash = digest(detail);
  }
  if (current.captureSignal?.finishedAt) state.captureComplete = true;
}
async function watchdog(worker) {
  if (
    worker.runId &&
    (worker.leaseUntil <= Date.now() || worker.deadline <= Date.now() || worker.state !== 'leased')
  ) {
    const path = join(root, 'runs', worker.runId, 'job.json');
    try {
      const job = await json(path);
      await stopChildren(job);
    } catch (e) {
      console.error(String(e));
    }
    if ((worker.recoveryUntil ?? worker.deadline) <= Date.now())
      await exec('shutdown', ['-h', 'now']);
  } else if (worker.state === 'available' && worker.idleUntil <= Date.now()) {
    await lock(async () => {
      let current;
      try {
        current = await lease();
      } catch {
        current = await json(join(root, 'active.json')).catch(() => worker);
      }
      if (current.generation !== worker.generation) return;
      if (current.state === 'available' && current.generation === worker.generation) {
        await writeFile('/run/openlegend-verification-shutdown', 'closed');
        await exec('shutdown', ['-h', 'now']);
      }
    });
  }
}
async function seedImage(buildId, source, sourceHash) {
  const worker = await lease();
  if (worker.state !== 'image-preparing' || worker.imageBuildId !== buildId || worker.runId)
    throw new Error('Wrong image preparation authority.');
  const descriptor = await getJson(config.bucket, `sources/${source}/${sourceHash}.json`);
  const directory = join(root, 'image-source');
  await mkdir(directory, { recursive: true, mode: 0o755 });
  const archive = join(directory, 'source.tar.gz');
  // Never run the source: only its lockfile/configuration feed pnpm's script-free package fetch.
  if (descriptor.archiveBytes > 512 * 1024 ** 2)
    throw new Error('Image seed source exceeds allowance.');
  await download(
    config.bucket,
    `sources/${source}/${sourceHash}.tar.gz`,
    archive,
    descriptor.archiveBytes,
  );
  if ((await hashFile(archive)) !== sourceHash)
    throw new Error('Image seed source checksum mismatch.');
  const selected = ['pnpm-lock.yaml', 'pnpm-workspace.yaml'];
  await exec('tar', ['-xzf', archive, '-C', directory, ...selected]);
  for (const path of selected)
    if ((await hashFile(join(directory, path))) !== descriptor.files[path]?.sha256)
      throw new Error('Image package input mismatch.');
  await exec('chown', ['-R', 'olverify:olverify', directory]);
  const started = performance.now(),
    seconds = Math.floor((worker.deadline - Date.now() - 30000) / 1000);
  if (seconds <= 0) throw new Error('Image preparation deadline elapsed.');
  await unprivileged(
    [
      'pnpm',
      'fetch',
      '--frozen-lockfile',
      '--ignore-scripts',
      '--store-dir',
      join(root, 'cache', 'pnpm'),
    ],
    {
      name: `ol-image-seed-${id(buildId)}`,
      cwd: directory,
      seconds,
      environment: {
        PATH: '/usr/local/bin:/usr/bin:/bin',
        HOME: directory,
        COREPACK_HOME: join(root, 'cache', 'corepack'),
        COREPACK_ENABLE_PROJECT_SPEC: '0',
        AI_BUDGET_USD: '0',
      },
    },
  );
  const prepared = await json(join(root, 'prepared.json'));
  prepared.packageSeed = {
    source,
    archiveSha256: sourceHash,
    lockfileSha256: descriptor.files['pnpm-lock.yaml'].sha256,
    elapsedMs: performance.now() - started,
    storeBytes: await directoryBytes(join(root, 'cache', 'pnpm')),
  };
  await json(join(root, 'prepared.json'), prepared);
  await rm(directory, { recursive: true, force: true });
}
async function sanitizeImage(buildId, recipe) {
  id(buildId);
  const worker = await lease();
  if (worker.state !== 'image-preparing' || worker.imageBuildId !== buildId || worker.runId)
    throw new Error('Only a fresh image-preparation slot can be sanitized.');
  await assertExclusive();
  const prepared = await json(join(root, 'prepared.json'));
  if (prepared.recipe !== recipe) throw new Error('Image recipe changed.');
  await assertCleanDatabases();
  await exec('systemctl', ['disable', '--now', 'ol-verification-watchdog.service']);
  const units = await exec('systemctl', ['list-units', '--all', '--plain', '--no-legend']);
  for (const line of units.stdout.split('\n')) {
    const name = line.trim().split(/\s/)[0];
    if (/^[a-zA-Z0-9_.@-]*amazon-ssm-agent[a-zA-Z0-9_.@-]*\.service$/.test(name))
      await exec('systemctl', ['stop', name]);
  }
  for (const path of [
    join(root, 'runs'),
    join(root, 'image-source'),
    join(root, 'blobs'),
    join(root, 'active.json'),
    join(root, 'bootstrap-failure.json'),
    '/etc/openlegend-verification.json',
    '/etc/systemd/system/ol-verification-watchdog.service',
    '/var/lib/amazon/ssm',
    '/var/lib/snap/amazon-ssm-agent',
    '/var/log/amazon/ssm',
    '/var/log/openlegend-verification-bootstrap.log',
    '/root/.aws',
    '/root/.cache/node/corepack',
    '/home/olverify',
  ])
    await rm(path, { recursive: true, force: true });
  for (const name of await readdir('/etc/ssh'))
    if (/^ssh_host_.*_key(?:\.pub)?$/.test(name)) await rm(join('/etc/ssh', name));
  await rm('/var/lib/systemd/random-seed', { force: true });
  await writeFile('/etc/hostname', 'localhost\n');
  await writeFile('/etc/hosts', '127.0.0.1 localhost\n::1 localhost ip6-localhost ip6-loopback\n');
  await exec('cloud-init', ['clean', '--logs', '--machine-id']);
  const receipt = '/run/openlegend-image-sanitized.json';
  await json(receipt, { buildId, recipe, clean: true, prepared, at: Date.now() });
  await upload(config.bucket, `workers/${config.slot}/images/${buildId}/sanitized.json`, receipt);
  await rm(receipt);
  await exec('shutdown', ['-c']);
  await exec('shutdown', ['-h', 'now']);
}
async function main() {
  const [action, slot, runId, generation] = process.argv.slice(2);
  if (action === 'image-seed') return seedImage(slot, runId, generation);
  if (action === 'image-sanitize') return sanitizeImage(slot, runId);
  if (action === 'watchdog') {
    let known = await json(join(root, 'active.json')).catch(() => undefined);
    for (;;) {
      try {
        known = await lease();
      } catch (error) {
        console.error('Lease observation unavailable:', error.message);
      }
      const active = await json(join(root, 'active.json')).catch(() => undefined);
      if (active && (!known || active.generation > known.generation)) known = active;
      if (known) await watchdog(known);
      await delay(30000);
    }
  }
  id(slot);
  id(runId);
  if (slot !== config.slot) throw new Error('Wrong slot.');
  const directory = join(root, 'runs', runId);
  const admitted =
    action === 'launch'
      ? await getJson(config.bucket, `workers/${slot}/runs/${runId}/command.json`)
      : undefined;
  if (action === 'launch')
    return lock(async () => {
      const active = await lease();
      fence(active, { runId, generation: Number(generation) });
      await json(join(root, 'active.json'), active);
      try {
        await stat('/run/openlegend-verification-shutdown');
        throw new Error('Shutdown is in progress.');
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
      await mkdir(directory, { recursive: true, mode: 0o755 });
      const marker = join(directory, 'launched');
      try {
        const file = await open(marker, 'wx', 0o600);
        await file.close();
      } catch (e) {
        if (e.code === 'EEXIST') return;
        throw e;
      }
      const job = admitted;
      await json(join(directory, 'job.json'), job);
      await exec('systemd-run', [
        '--quiet',
        `--unit=${unit(runId)}`,
        `--property=RuntimeMaxSec=${Math.max(1, Math.ceil((job.deadline - Date.now()) / 1000))}`,
        '--property=TimeoutStopSec=10',
        `--setenv=OPENLEGEND_WORKER_SLOT=${slot}`,
        '--setenv=AWS_REGION=us-east-2',
        '/usr/local/bin/node',
        '/opt/openlegend-verification/supervisor.mjs',
        'execute',
        slot,
        runId,
        generation,
      ]);
    });
  if (action === 'execute' || action === 'repair') {
    let job;
    try {
      job = await json(join(directory, 'job.json'));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
      job = await getJson(config.bucket, `workers/${slot}/runs/${runId}/command.json`);
      await mkdir(directory, { recursive: true });
    }
    try {
      return action === 'execute'
        ? await execute(job)
        : await finalize(job, [], 'interrupted', 'Recovered after owner or transport loss.');
    } catch (error) {
      await report(job, { kind: 'failure', error: String(error) }).catch(console.error);
      throw error;
    }
  }
  throw new Error('Unknown supervisor operation.');
}
await main();
