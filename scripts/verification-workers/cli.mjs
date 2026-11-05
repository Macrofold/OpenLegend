import { readFile, writeFile, mkdir, stat, rm, readdir } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { createServer } from 'node:net';
import { createNetworkOwner, requestText } from '@open-legend/network';
import { exec } from './process.mjs';
import {
  SSMClient,
  StartSessionCommand,
  TerminateSessionCommand,
  DescribeSessionsCommand,
} from '@aws-sdk/client-ssm';
import { clientOptions, send } from './aws.mjs';
import {
  campaign as validatePlan,
  executionPlan,
  defaults,
  secret,
  digest,
  id,
} from './contracts.mjs';
import { json, hashFile } from './files.mjs';
import { pack, packInputs, snapshot } from './source.mjs';
import { upload, download, getJson, stageArchive } from './artifacts.mjs';
import { jobRunId, campaignEstimate, campaignSummary } from './campaigns.mjs';
import { preflight } from './preflight.mjs';
import { mapBounded } from './parallel.mjs';
import { executionRequest, executionUrl, executionCapability } from './execution.mjs';
import {
  claimBrowserDevice,
  browserDeviceStatus,
  recoverBrowserDevice,
} from '../performance/browser-device.mjs';
const home =
  process.env.OPENLEGEND_VERIFICATION_HOME ??
  join(homedir(), '.codex', 'verification', 'OpenLegend', 'workers');
const lambda = new LambdaClient(clientOptions());
const configPath = join(home, 'pool.json');
const args = process.argv.slice(2);
function preparationReferences(plan) {
  const sources = new Set(),
    inputs = new Set();
  for (const job of plan.jobs)
    for (const item of job.cases) {
      sources.add(item.source);
      for (const mount of item.inputs ?? []) inputs.add(mount.bundle);
    }
  return { sources: [...sources], inputs: [...inputs] };
}
async function configuration() {
  const value = await json(configPath);
  if (value.account !== defaults.account || value.region !== defaults.region)
    throw new Error('Unexpected verification project/Region.');
  try {
    value.execution = await json(join(home, 'execution.json'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return value;
}
export async function invoke(config, event) {
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const response = await send(
        lambda,
        InvokeCommand,
        { FunctionName: config.functionName, Payload: Buffer.from(JSON.stringify(event)) },
        70_000,
      );
      const result = JSON.parse(Buffer.from(response.Payload).toString());
      if (response.FunctionError)
        throw Object.assign(new Error(result.errorMessage ?? 'Controller failure.'), {
          name: result.errorType ?? 'Error',
        });
      if (result.busy) {
        if (attempt === 11)
          throw new Error('Controller remains busy; resume the original operation.');
        await delay(Math.min(2000, 100 * 2 ** attempt) + Math.random() * 300);
        continue;
      }
      return result;
    } catch (error) {
      if (error.name !== 'TooManyRequestsException' || attempt === 11) throw error;
      await delay(1000 + Math.random() * 500);
    }
  }
}
async function state(runId) {
  return json(join(home, 'runs', id(runId), 'private.json'));
}
async function readManifest(config, run, key) {
  const value = await getJson(config.bucket, key);
  if (
    value.runId !== run.runId ||
    value.generation !== run.generation ||
    !Array.isArray(value.files)
  )
    throw new Error('Artifact manifest belongs to another run or generation.');
  return value;
}
async function collect(config, runId, destination, deadline = Date.now() + defaults.collectionMs) {
  const assertTime = () => {
    if (Date.now() >= deadline)
      throw new Error('Collection allowance expired; preserved results can be collected again.');
  };
  assertTime();
  const privateState = await state(runId);
  const status = await invoke(config, { action: 'status', runId });
  if (!status.run?.artifacts) throw new Error('Run artifacts are not ready; inspect status.');
  const value = await readManifest(config, status.run, status.run.artifacts);
  const entries = [...value.files];
  let browserManifestHash;
  if (status.run.browserArtifacts) {
    const browser = await readManifest(config, status.run, status.run.browserArtifacts);
    browserManifestHash = digest(browser);
    entries.push(...browser.files);
    await json(join(destination, 'browser-manifest.json'), browser);
  }
  await mkdir(destination, { recursive: true, mode: 0o700 });
  const collectEntry = async (entry) => {
    if (!entry.key.startsWith(`workers/${status.run.workerId}/runs/${runId}/`))
      throw new Error('Artifact key escapes its registered run.');
    const path = resolve(destination, entry.path);
    if (!path.startsWith(resolve(destination) + '/'))
      throw new Error('Artifact path escapes destination.');
    try {
      if ((await hashFile(path)) === entry.sha256) return;
      throw new Error(`Existing artifact mismatch: ${path}`);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    assertTime();
    await download(
      config.bucket,
      entry.key,
      path,
      entry.bytes,
      Math.max(1, Math.min(180000, deadline - Date.now())),
    );
    if ((await hashFile(path)) !== entry.sha256)
      throw new Error(`Artifact checksum mismatch: ${entry.path}`);
  };
  for (let index = 0; index < entries.length; index += 3) {
    assertTime();
    const results = await Promise.allSettled(entries.slice(index, index + 3).map(collectEntry));
    const failed = results.find((result) => result.status === 'rejected');
    if (failed) throw failed.reason;
  }
  await json(join(destination, 'manifest.json'), value);
  await json(join(destination, 'controller.json'), status.run);
  if (status.run.completion?.manifestHash) {
    if (status.run.completion.manifestHash !== digest(value))
      throw new Error('Recovery receipt refers to another export.');
    await json(join(destination, 'recovery.json'), status.run.completion);
  }
  if (status.run.lifecycle) await json(join(destination, 'lifecycle.json'), status.run.lifecycle);
  let acknowledgement;
  do {
    assertTime();
    acknowledgement = await invoke(config, {
      action: 'collected',
      runId,
      secret: privateState.secret,
      manifestHash: digest(value),
      browserManifestHash,
      destination: resolve(destination),
    });
    if (acknowledgement.pending) await delay(250);
  } while (acknowledgement.pending);
  return { destination: resolve(destination), files: entries.length };
}
async function verifyCapacity(config, concurrency, deadlineSeconds = 3600) {
  const remote = await invoke(config, { action: 'health', includeSlots: true });
  if (
    remote.config.capacity !== config.capacity ||
    remote.config.imageId !== config.imageId ||
    remote.config.subnetId !== config.subnetId
  )
    throw new Error(
      'Local pool configuration differs from the deployed controller; deploy/reconcile it before admission.',
    );
  if (remote.admissionClosed) throw new Error('Pool deployment has closed new admission.');
  return preflight(config, concurrency, remote.availableSlots, deadlineSeconds);
}
async function run(config, path) {
  const plan = validatePlan(await json(path)),
    campaignId = randomUUID(),
    capability = secret(),
    dispatchSecret = secret();
  const directory = join(home, 'campaigns', campaignId),
    worktree = process.cwd();
  if (
    plan.jobs.some((job) => job.paid) &&
    (!config.execution?.url || !config.execution?.adminToken)
  )
    throw new Error(
      'Paid jobs require configured shared execution; provider keys never go to workers.',
    );
  if (plan.jobs.some((job) => job.paid)) {
    const service = await executionRequest(
      config.execution.url,
      config.execution.adminToken,
      '/configuration',
    );
    for (const job of plan.jobs)
      for (const id of job.paid?.lanes ?? [])
        if (!service.lanes.some((l) => l.id === id)) throw new Error(`Unknown paid lane ${id}.`);
    for (const lane of service.lanes) {
      const demand = Math.min(
        plan.concurrency,
        plan.jobs.filter((job) => job.paid?.lanes.includes(lane.id)).length,
      );
      if (demand > lane.concurrency)
        throw new Error(`Requested workers exceed the configured ${lane.id} lane capacity.`);
    }
    if (plan.concurrency > service.capacity)
      throw new Error('Requested workers exceed shared paid execution capacity.');
  }

  await mkdir(directory, { recursive: true, mode: 0o700 });
  const timeline = [];
  async function phase(name, work) {
    const entry = { name, startAt: Date.now() },
      started = performance.now();
    timeline.push(entry);
    try {
      const result = await work();
      entry.outcome = 'completed';
      return result;
    } catch (error) {
      entry.outcome = 'failed';
      entry.error = String(error);
      throw error;
    } finally {
      entry.elapsedMs = performance.now() - started;
      await json(join(directory, 'timeline.json'), timeline);
    }
  }
  const checks = await phase('capacity-preflight', () =>
    verifyCapacity(config, plan.concurrency, plan.deadlineSeconds),
  );
  await json(join(directory, 'preflight.json'), checks);
  const sources = new Map(),
    inputs = {},
    usedInputs = new Set(preparationReferences(plan).inputs);
  await phase('package', async () => {
    for (const job of plan.jobs)
      for (const item of job.cases) {
        let source = sources.get(item.source);
        if (!source) {
          source = await pack(worktree, item.source, join(directory, 'sources'));
          sources.set(item.source, source);
          const { archive, ...descriptor } = source;
          await json(join(directory, 'sources', `${source.archiveSha256}.json`), descriptor);
        }
        item.sourceHash = source.archiveSha256;
      }
    for (const bundle of plan.inputs ?? []) {
      if (!usedInputs.has(bundle.id)) continue;
      const packed = await packInputs(
        resolve(bundle.root),
        bundle.paths,
        join(directory, 'inputs'),
      );
      inputs[bundle.id] = { ...packed, key: `inputs/${packed.archiveSha256}` };
      const { archive, ...descriptor } = packed;
      await json(join(directory, 'inputs', `${packed.archiveSha256}.json`), descriptor);
    }
  });
  const packages = [
    ...[...sources.values()].map((s) => ({
      archive: s.archive,
      descriptorPath: join(directory, 'sources', `${s.archiveSha256}.json`),
    })),
    ...Object.values(inputs).map((s) => ({
      archive: s.archive,
      descriptorPath: join(directory, 'inputs', `${s.archiveSha256}.json`),
    })),
  ];
  const preparationBytes = (
    await mapBounded(
      packages,
      8,
      async (p) => (await stat(p.archive)).size + (await stat(p.descriptorPath)).size,
    )
  ).reduce((a, b) => a + b, 0);
  const manifest = {
    plan,
    preparationBytes,
    inputs: Object.fromEntries(
      Object.entries(inputs).map(([name, value]) => [
        name,
        {
          key: value.key,
          archiveSha256: value.archiveSha256,
          archiveBytes: value.archiveBytes,
          sha256: value.sha256,
        },
      ]),
    ),
  };
  validatePlan(plan);
  if (Buffer.byteLength(JSON.stringify(manifest)) > 16 * 1024 ** 2)
    throw new Error('Complete campaign manifest exceeds 16 MiB.');
  await json(join(directory, 'manifest.json'), manifest);
  await json(join(directory, 'private.json'), {
    campaignId,
    secret: capability,
    dispatchSecret,
    manifestHash: digest(manifest),
    plan,
    worktree,
  });
  for (let ordinal = 0; ordinal < plan.jobs.length; ordinal++) {
    const runId = jobRunId(campaignId, ordinal);
    await json(join(home, 'runs', runId, 'private.json'), {
      runId,
      secret: dispatchSecret,
      plan: executionPlan(plan, plan.jobs[ordinal]),
      worktree,
      campaignId,
    });
  }
  console.error(
    `Campaign ${campaignId}; ${plan.jobs.length} jobs; requested concurrency ${plan.concurrency}; private state/results: ${directory}`,
  );
  const device =
    plan.jobs[0].mode === 'browser-session' ? await claimBrowserDevice(campaignId) : undefined;
  let admitted = false,
    finished = false;
  try {
    await phase('admission', async () => {
      admitted = true;
      return invoke(config, {
        action: 'campaign-admit',
        campaignId,
        secret: capability,
        dispatchSecret,
        manifestHash: digest(manifest),
        summary: campaignSummary(plan, preparationBytes),
        executionUrl: config.execution?.url,
        executionControlToken: plan.jobs.some((j) => j.paid)
          ? executionCapability(config.execution.adminToken, 'campaign', campaignId)
          : undefined,
        worktree,
      });
    });
    const stopHeartbeat = campaignHeartbeat(config, campaignId, capability);
    try {
      await phase('upload', () => uploadCampaign(config, campaignId, directory));
    } finally {
      await stopHeartbeat();
    }
    await watchCampaign(config, campaignId, directory, device);
    finished = true;
  } finally {
    if (admitted && !finished && plan.lifetime === 'attached')
      await invoke(config, { action: 'campaign-cancel', campaignId, secret: capability }).catch(
        (error) => console.error(`Cancellation uncertain: ${error.message}`),
      );
    await device?.release();
  }
}
async function uploadCampaign(config, campaignId, directory) {
  const saved = await campaignState(campaignId),
    manifest = await json(join(directory, 'manifest.json'));
  if (digest(manifest) !== saved.manifestHash)
    throw new Error('Local campaign manifest changed; original submission remains immutable.');
  const freshUntil = Date.now() + saved.plan.deadlineSeconds * 1000 + 600000,
    packages = new Map(),
    timings = [];
  for (const job of saved.plan.jobs)
    for (const item of job.cases)
      packages.set(`sources/${item.source}/${item.sourceHash}`, {
        descriptorPath: join(directory, 'sources', `${item.sourceHash}.json`),
        archive: join(directory, 'sources', `${item.source}.tar.gz`),
      });
  for (const bundle of Object.values(manifest.inputs))
    packages.set(bundle.key, {
      descriptorPath: join(directory, 'inputs', `${bundle.archiveSha256}.json`),
      archive: join(directory, 'inputs', `${bundle.sha256}.tar.gz`),
    });
  for (const [prefix, { descriptorPath, archive }] of packages)
    timings.push(await stageArchive(config.bucket, prefix, descriptorPath, archive, freshUntil));
  if (saved.plan.jobs.some((job) => job.paid)) {
    const status = await invoke(config, {
      action: 'campaign-status',
      campaignId,
      secret: saved.secret,
    });
    const endpoint = config.execution;
    if (!endpoint?.url || !endpoint?.adminToken)
      throw new Error('Shared execution control is not configured.');
    await executionRequest(endpoint.url, endpoint.adminToken, `/tasks/${saved.plan.taskId}`, {
      limitUsd: status.campaign.taskLimitMicroUsd / 1e6,
    });
    const control = await executionRequest(endpoint.url, endpoint.adminToken, '/campaigns', {
      taskId: saved.plan.taskId,
      campaignId,
      deadlineMs: status.campaign.deadline,
      grants: saved.plan.jobs
        .filter((job) => job.paid)
        .map((job) => ({
          jobId: job.id,
          limitUsd: job.paid.limitMicroUsd / 1e6,
          maxCalls: job.paid.maxCalls,
          lanes: job.paid.lanes,
          cases: job.cases.map((c) => ({ id: c.id, sourceHash: c.sourceHash })),
        })),
    });
    await mapBounded(control.grants, 3, async (grant) => {
      const path = join(directory, 'grants', `${grant.id}.json`);
      await json(path, grant);
      await upload(config.bucket, `campaigns/${campaignId}/grants/${grant.jobId}.json`, path, true);
    });
  }
  const key = `campaigns/${campaignId}/manifest.json`;
  try {
    await upload(config.bucket, key, join(directory, 'manifest.json'), false, true);
  } catch (error) {
    if (error.name !== 'PreconditionFailed') throw error;
    if (digest(await getJson(config.bucket, key, 16 * 1024 ** 2)) !== saved.manifestHash)
      throw new Error('Cloud campaign manifest already belongs to another submission.');
  }
  await json(join(directory, 'source-cache.json'), timings);
}
async function resumeCampaign(config, campaignId) {
  const saved = await campaignState(campaignId),
    directory = join(home, 'campaigns', campaignId);
  let status = await invoke(config, {
    action: 'campaign-status',
    campaignId,
    secret: saved.secret,
  });
  if (
    status.campaign &&
    ['uploading', 'staging'].includes(status.campaign.phase) &&
    status.campaign.lifetime === 'attached' &&
    status.campaign.leaseUntil <= Date.now()
  ) {
    await invoke(config, { action: 'campaign-heartbeat', campaignId, secret: saved.secret });
    status = await invoke(config, { action: 'campaign-status', campaignId, secret: saved.secret });
  }
  if (['completed', 'cancelled'].includes(status.campaign?.phase) && !status.campaign.settled) {
    await invoke(config, { action: 'campaign-reconcile', campaignId, secret: saved.secret });
    status = await invoke(config, { action: 'campaign-status', campaignId, secret: saved.secret });
  }
  const device =
    saved.plan.jobs[0].mode === 'browser-session' &&
    !['completed', 'cancelled'].includes(status.campaign?.phase)
      ? await claimBrowserDevice(campaignId)
      : undefined;
  try {
    if (!status.campaign)
      await verifyCapacity(config, saved.plan.concurrency, saved.plan.deadlineSeconds);
    if (!status.campaign || status.campaign.phase === 'uploading') {
      if (saved.plan.jobs.some((job) => job.paid) && !config.execution)
        throw new Error('Original shared execution configuration is required to resume uploads.');
      // Re-admission checks the original origin and closure capability before funding any service.
      await invoke(config, {
        action: 'campaign-admit',
        campaignId,
        secret: saved.secret,
        dispatchSecret: saved.dispatchSecret,
        manifestHash: saved.manifestHash,
        executionUrl: config.execution?.url,
        executionControlToken: saved.plan.jobs.some((j) => j.paid)
          ? executionCapability(config.execution.adminToken, 'campaign', campaignId)
          : undefined,
        summary: campaignSummary(
          saved.plan,
          (await json(join(directory, 'manifest.json'))).preparationBytes,
        ),
        worktree: saved.worktree,
      });
      const stopHeartbeat = campaignHeartbeat(config, campaignId, saved.secret);
      try {
        await uploadCampaign(config, campaignId, directory);
      } finally {
        await stopHeartbeat();
      }
    }
    return await watchCampaign(config, campaignId, directory, device, true);
  } finally {
    await device?.release();
  }
}
async function campaignState(campaignId) {
  return json(join(home, 'campaigns', id(campaignId), 'private.json'));
}
function campaignHeartbeat(config, campaignId, capability) {
  let pending;
  const timer = setInterval(() => {
    if (pending) return;
    pending = invoke(config, { action: 'campaign-heartbeat', campaignId, secret: capability })
      .catch((error) => console.error(`Campaign heartbeat: ${error.message}`))
      .finally(() => {
        pending = undefined;
      });
  }, defaults.heartbeatMs);
  return async () => {
    clearInterval(timer);
    await pending;
  };
}
async function watchCampaign(
  config,
  campaignId,
  directory = join(home, 'campaigns', id(campaignId)),
  device,
  explicitCollection = false,
) {
  const local = await campaignState(campaignId),
    request = (action, extra = {}) =>
      invoke(config, { action, campaignId, secret: local.secret, ...extra });
  let browserStarted = false,
    final;
  const stopHeartbeat = campaignHeartbeat(config, campaignId, local.secret);
  try {
    for (;;) {
      const { campaign: current } = await request('campaign-status');
      await json(join(directory, 'status.json'), current);
      if (['completed', 'cancelled'].includes(current.phase)) {
        final = current;
        break;
      }
      const result = await request(
        ['uploading', 'staging'].includes(current.phase) ? 'campaign-stage' : 'campaign-advance',
      );
      if (result.blocked)
        throw new Error(`Campaign blocked: ${result.blocked}. No capacity reduction was applied.`);
      if (local.plan.jobs[0].mode === 'browser-session' && !browserStarted) {
        const runId = jobRunId(campaignId, 0),
          status = await invoke(config, { action: 'status', runId });
        if (status.run?.ready) {
          browserStarted = true;
          await browserSession(
            config,
            status.run,
            local.dispatchSecret,
            join(home, 'runs', runId),
            device,
          );
        }
      }
      if (Date.now() > current.deadline + defaults.cleanupMs)
        throw new Error('Campaign deadline elapsed; inspect and recover quarantined jobs.');
      await delay(3000);
    }
    await collectCampaign(
      config,
      campaignId,
      join(directory, 'results'),
      explicitCollection ? Date.now() + defaults.collectionMs : final.deadline,
    );
  } finally {
    await stopHeartbeat();
  }
}
async function collectCampaign(
  config,
  campaignId,
  destination,
  deadline = Date.now() + defaults.collectionMs,
) {
  const local = await campaignState(campaignId),
    results = local.plan.jobs.map((job, ordinal) => ({
      jobId: job.id,
      runId: jobRunId(campaignId, ordinal),
      source: job.cases.map((item) => item.source),
      outcome: 'unobserved',
    }));
  let cursor, pageError;
  do {
    if (Date.now() >= deadline) {
      pageError = 'Collection allowance expired; resume preserved results explicitly.';
      break;
    }
    let page;
    try {
      page = await invoke(config, {
        action: 'campaign-status',
        campaignId,
        secret: local.secret,
        cursor,
      });
    } catch (error) {
      pageError = error.message;
      break;
    }
    for (const run of page.jobs) {
      const record = results[run.ordinal];
      if (!record || record.runId !== run.runId || (run.jobId && record.jobId !== run.jobId))
        throw new Error('Collected roster identity differs from the frozen manifest.');
      record.outcome = run.outcome ?? run.phase;
      record.failure = run.failure ?? run.completion?.failure;
      if (run.artifacts) {
        try {
          record.collection = await collect(
            config,
            run.runId,
            join(destination, record.jobId),
            deadline,
          );
        } catch (error) {
          record.collectionError = error.message;
        }
      }
    }
    cursor = page.cursor;
    await json(join(destination, 'index.json'), { campaignId, jobs: results, pageError });
  } while (cursor);
  await json(join(destination, 'index.json'), { campaignId, jobs: results, pageError });
  const csv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  await mkdir(destination, { recursive: true, mode: 0o700 });
  await writeFile(
    join(destination, 'summary.csv'),
    [
      'jobId,runId,outcome,source,failure,files,collectionError',
      ...results.map((row) =>
        [
          row.jobId,
          row.runId,
          row.outcome,
          row.source.join(';'),
          typeof row.failure === 'string'
            ? row.failure
            : row.failure
              ? JSON.stringify(row.failure)
              : '',
          row.collection?.files,
          row.collectionError ?? pageError,
        ]
          .map(csv)
          .join(','),
      ),
    ].join('\n') + '\n',
    { mode: 0o600 },
  );
  const incomplete = results.filter(
    (row) => row.outcome !== 'completed' || !row.collection || row.collectionError,
  );
  console.log(
    JSON.stringify(
      { campaignId, jobs: results.length, incomplete: incomplete.length, destination },
      null,
      2,
    ),
  );
  if (incomplete.length || pageError) process.exitCode = 1;
  return results;
}
async function browserSession(config, run, capability, directory, device) {
  const status = await invoke(config, { action: 'status', runId: run.runId });
  const worker = status.slots.find((w) => w.workerId === run.workerId);
  const currentCase = run.plan.cases.find((item) => item.id === run.ready.caseId);
  if (
    !currentCase ||
    run.ready.runId !== run.runId ||
    run.ready.generation !== run.generation ||
    run.ready.sourceProvenance?.ready?.head !== currentCase.source
  )
    throw new Error('Remote readiness does not match the admitted run, case and source.');
  const server = createServer();
  // Keep the exact Host/Origin checks. A transparent TCP tunnel must use the
  // fixture's registered port locally too; do not relax game authentication.
  await new Promise((r, reject) => {
    server.once('error', reject);
    server.listen(Number(new URL(run.ready.url).port), '127.0.0.1', r);
  });
  const port = server.address().port;
  await new Promise((r) => server.close(r));
  // Session Manager plugin owns the actual private tunnel. No public HTTP listener.
  const ssm = new SSMClient(clientOptions());
  const session = await send(ssm, StartSessionCommand, {
    Target: worker.instanceId,
    DocumentName: 'AWS-StartPortForwardingSession',
    Parameters: {
      portNumber: [String(new URL(run.ready.url).port)],
      localPortNumber: [String(port)],
    },
  });
  const stopTunnel = new AbortController(),
    interruptBrowser = new AbortController();
  const tunnel = exec(
    'session-manager-plugin',
    [
      JSON.stringify(session),
      defaults.region,
      'StartSession',
      'openlegend',
      JSON.stringify({ Target: worker.instanceId }),
      `https://ssm.${defaults.region}.amazonaws.com`,
    ],
    { timeoutMs: Math.max(1, run.deadline - Date.now()), signal: stopTunnel.signal },
  );
  tunnel.then(
    () => {
      if (!stopTunnel.signal.aborted) interruptBrowser.abort();
    },
    () => {
      if (!stopTunnel.signal.aborted) interruptBrowser.abort();
    },
  );
  try {
    const readiness = createNetworkOwner({ role: 'verification-loopback-readiness', capacity: 1 });
    const deadline = Date.now() + 20000;
    for (;;) {
      try {
        await readiness.run({ timeoutMs: 1000 }, (operation) =>
          requestText(operation, {
            url: `http://127.0.0.1:${port}/`,
            bodyPolicy: { kind: 'bounded', maxBytes: 1048576 },
          }),
        );
        break;
      } catch (error) {
        if (Date.now() > deadline || interruptBrowser.signal.aborted) throw error;
        await delay(250);
      }
    }
    const ready = {
      ...run.ready,
      url: `http://127.0.0.1:${port}`,
      startMarkerPath: join(directory, 'browser-start.json'),
    };
    await json(join(directory, 'ready.json'), ready);
    await import('../performance/profile-browser.mjs').then((module) =>
      module.profileBrowser({
        readyPath: join(directory, 'ready.json'),
        device,
        outputPath: join(directory, 'browser.json'),
        seconds: run.ready.seconds,
        signal: interruptBrowser.signal,
        mode: 'representative',
        signalCaptureComplete: () =>
          invoke(config, {
            action: 'signal',
            runId: run.runId,
            secret: capability,
            caseId: run.ready.caseId,
            finished: true,
          }),
        awaitServerResult: async () => {
          const until = Math.min(run.deadline, Date.now() + 60000);
          while (Date.now() < until) {
            const status = await invoke(config, { action: 'status', runId: run.runId });
            if (status.run.artifacts) return;
            if (status.run.phase === 'failed')
              throw new Error('Server capture failed; inspect preserved evidence.');
            await delay(1000);
          }
          throw new Error('Server artifact publication timed out.');
        },
        signalCaptureStart: async () => {
          const clientSendAtUnixMs = Date.now();
          await invoke(config, {
            action: 'signal',
            runId: run.runId,
            secret: capability,
            caseId: run.ready.caseId,
          });
          const until = Date.now() + 30000;
          do {
            const status = await invoke(config, { action: 'status', runId: run.runId });
            if (status.run.ready?.captureAck)
              return {
                ...status.run.ready.captureAck,
                clientSendAtUnixMs,
                clientAckAtUnixMs: Date.now(),
              };
            await delay(1000);
          } while (Date.now() < until);
          throw new Error('Remote capture acknowledgement timed out.');
        },
      }),
    );
    const captured = [];
    const serverStatus = await invoke(config, { action: 'status', runId: run.runId });
    const serverManifest = await readManifest(config, serverStatus.run, serverStatus.run.artifacts);
    let bytes = serverManifest.files.reduce((sum, file) => sum + file.bytes, 0);
    for (const name of (await readdir(directory)).filter(
      (name) => name === 'browser.json' || name.startsWith('browser.json.'),
    )) {
      const path = join(directory, name);
      bytes += (await stat(path)).size;
      if (bytes > run.plan.outputLimitBytes)
        throw new Error('Browser artifact allowance exceeded.');
      const key = `workers/${worker.workerId}/runs/${run.runId}/browser/${name}`;
      captured.push({
        path: `browser/${name}`,
        key,
        bytes: (await stat(path)).size,
        sha256: await hashFile(path),
      });
    }
    for (const entry of captured)
      await upload(config.bucket, entry.key, join(directory, basename(entry.path)));
    const manifest = {
      runId: run.runId,
      generation: run.generation,
      caseId: run.ready.caseId,
      files: captured,
    };
    const path = join(directory, 'browser-manifest.json');
    await json(path, manifest);
    await upload(
      config.bucket,
      `workers/${worker.workerId}/runs/${run.runId}/browser/manifest.json`,
      path,
    );
    await invoke(config, {
      action: 'client-complete',
      runId: run.runId,
      secret: capability,
      manifestHash: digest(manifest),
    });
  } finally {
    stopTunnel.abort();
    await tunnel.catch((error) => {
      if (error.kind !== 'cancelled') console.error('Tunnel cleanup:', error.message);
    });
    try {
      await send(ssm, TerminateSessionCommand, { SessionId: session.SessionId });
    } catch (error) {
      if (error.name !== 'ValidationException') throw error;
      const history = await send(ssm, DescribeSessionsCommand, {
        State: 'History',
        Filters: [{ key: 'SessionId', value: session.SessionId }],
      });
      if (
        !history.Sessions?.some(
          (item) => item.SessionId === session.SessionId && item.Status === 'Terminated',
        )
      )
        throw error;
    }
  }
}
async function image(config, args) {
  const [action, first, second] = args;
  if (action === 'prepare') {
    if (!first || !second) throw new Error('image prepare TASK CLOUD_ALLOCATION');
    await verifyCapacity(config, 1, 900);
    if (!args[3] || !/^[a-f0-9]{40}$/.test(args[3]))
      throw new Error('image prepare TASK CLOUD_ALLOCATION EXACT_SOURCE_COMMIT');
    const buildId = randomUUID(),
      capability = secret(),
      startedAt = Date.now(),
      packagingStarted = performance.now();
    await json(join(home, 'images', buildId, 'private.json'), { buildId, secret: capability });
    const source = await pack(process.cwd(), args[3], join(home, 'images', buildId, 'sources'));
    const { archive, ...descriptor } = source,
      descriptorPath = join(home, 'images', buildId, 'source.json');
    await json(descriptorPath, descriptor);
    const packageMs = performance.now() - packagingStarted;
    const submission = {
      source: source.commit,
      sourceHash: source.archiveSha256,
      buildId,
      secret: capability,
      taskId: first,
      cloudAllocationId: second,
    };
    await json(join(home, 'images', buildId, 'private.json'), {
      ...submission,
      archive,
      descriptorPath,
    });
    await invoke(config, { ...submission, action: 'image-prepare' });
    const upload = await stageArchive(
      config.bucket,
      `sources/${source.commit}/${source.archiveSha256}`,
      descriptorPath,
      archive,
      Date.now() + 3600000,
    );
    await json(join(home, 'images', buildId, 'preparation.json'), {
      startedAt,
      packageMs,
      upload,
      archiveBytes: source.archiveBytes,
    });
    console.error(`Clean image build ${buildId}; $2 cloud reservation; seven-day image retention.`);
    return image(config, ['resume', buildId]);
  }
  const saved = await json(join(home, 'images', id(first), 'private.json'));
  if (action === 'resume') {
    const status = await invoke(config, { ...saved, action: 'image-status' });
    if (status.phase === 'uploading')
      await stageArchive(
        config.bucket,
        `sources/${saved.source}/${saved.sourceHash}`,
        saved.descriptorPath,
        saved.archive,
        Date.now() + 3600000,
      );
  }
  if (action === 'retire' || action === 'status')
    return console.log(await invoke(config, { ...saved, action: `image-${action}` }));
  if (action !== 'resume') throw new Error('Use image prepare, resume, status or retire.');
  const status = await invoke(config, { ...saved, action: 'image-status' });
  if (status.phase === 'unadmitted') {
    if (!saved.sourceHash)
      throw new Error('Image packaging did not finish; no image was admitted.');
    await invoke(config, { ...saved, action: 'image-prepare' });
  }
  for (;;) {
    const current = await invoke(config, { ...saved, action: 'image-advance' });
    await json(join(home, 'images', saved.buildId, 'status.json'), current);
    if (current.phase === 'completed') {
      console.log(JSON.stringify(current, null, 2));
      return;
    }
    if (['failed', 'retired'].includes(current.phase)) {
      if (current.phase === 'failed')
        throw new Error(`Image preparation failed: ${JSON.stringify(current.failure)}`);
      console.log(JSON.stringify(current, null, 2));
      return;
    }
    if (current.blocked) throw new Error(`Image preparation blocked: ${current.blocked.message}`);
    if (Date.now() > current.deadline && ['capturing', 'retiring'].includes(current.phase)) {
      console.log(
        JSON.stringify(
          {
            ...current,
            pending: true,
            observation:
              'Submitted image capture continues with its builder stopped; resume observes the original operation.',
          },
          null,
          2,
        ),
      );
      return;
    }
    if (Date.now() > current.deadline)
      throw new Error(
        'Image build deadline elapsed; its original ownership/funding remains for inspection.',
      );
    await delay(5000);
  }
}
async function main() {
  const [action, ...rest] = args;
  if (action === 'device') {
    if (rest[0] === 'status') return console.log(await browserDeviceStatus());
    if (rest[0] === 'release')
      return console.log(await recoverBrowserDevice(rest[1], rest.includes('--confirmed-closed')));
    throw new Error('Use device status or device release OWNER_ID [--confirmed-closed].');
  }
  if (action === 'deploy') {
    const { deploy } = await import('./deploy.mjs');
    return deploy(home, rest);
  }
  if (action === 'snapshot')
    return console.log(
      JSON.stringify(
        await snapshot(
          process.cwd(),
          resolve(rest[0] ?? join(home, 'snapshots', randomUUID())),
          rest.slice(1),
        ),
        null,
        2,
      ),
    );
  if (action === 'plan') {
    const value = validatePlan(await json(rest[0]));
    let config;
    try {
      config = await configuration();
    } catch {
      config = { hourlyMicroUsd: 206600, storageMicroUsd: 2000000 };
    }
    return console.log(
      JSON.stringify(
        {
          plan: value,
          preparation: preparationReferences(value),
          region: defaults.region,
          account: defaults.account,
          reservation: campaignEstimate(campaignSummary(value), config),
          configuredCapacity: config.capacity ?? defaults.slots,
          requiredCapacityChange: value.concurrency > (config.capacity ?? defaults.slots),
          vcpus: value.concurrency * 4,
          capacityVerified: false,
          reservationScope:
            'One campaign hold; captured bytes join the estimate after packaging. Usage remains estimated until shutdown/reuse is confirmed.',
        },
        null,
        2,
      ),
    );
  }
  const config = await configuration();
  if (action !== 'status') {
    const identity = await send(new STSClient(clientOptions()), GetCallerIdentityCommand, {});
    if (identity.Account !== defaults.account) throw new Error('Refusing another AWS project.');
  }
  if (action === 'allocate') {
    const amount = Number(rest[rest.indexOf('--usd') + 1]),
      ref = rest[rest.indexOf('--authorization-ref') + 1];
    if (
      !Number.isFinite(amount) ||
      !rest.includes('--usd') ||
      !rest.includes('--authorization-ref')
    )
      throw new Error('allocate TASK --usd AMOUNT --authorization-ref REF');
    return console.log(
      JSON.stringify(
        await invoke(config, {
          action,
          taskId: rest[0],
          microUsd: Math.ceil(amount * 1e6),
          ...(rest.includes('--previous-usd')
            ? {
                previousMicroUsd: Math.ceil(Number(rest[rest.indexOf('--previous-usd') + 1]) * 1e6),
              }
            : {}),
          authorizationRef: ref,
        }),
        null,
        2,
      ),
    );
  }
  if (action === 'execution') {
    if (rest[0] === 'configure') {
      const value = await json(resolve(rest[1]));
      if (
        !value.url?.startsWith('https://') ||
        typeof value.adminToken !== 'string' ||
        value.adminToken.length < 32
      )
        throw new Error('Provide HTTPS execution URL and a control credential.');
      await json(join(home, 'execution.json'), { url: value.url, adminToken: value.adminToken });
      console.log('Shared execution endpoint configured; no provider credential copied.');
      return;
    }
    if (rest[0] === 'status') {
      if (!config.execution) throw new Error('No shared executor configured.');
      console.log(
        JSON.stringify(
          await executionRequest(
            config.execution.url,
            config.execution.adminToken,
            '/configuration',
          ),
          null,
          2,
        ),
      );
      return;
    }
    throw new Error('Use execution configure PRIVATE.json or execution status.');
  }
  if (action === 'image') return image(config, rest);
  if (action === 'run') return run(config, rest[0]);
  if (action === 'resume') return resumeCampaign(config, rest[0]);
  if (action === 'collect') return collectCampaign(config, rest[0], resolve(rest[1]));
  if (action === 'status') {
    const value = await campaignState(rest[0]);
    return console.log(
      JSON.stringify(
        await invoke(config, {
          action: 'campaign-status',
          campaignId: rest[0],
          secret: value.secret,
        }),
        null,
        2,
      ),
    );
  }
  if (action === 'cancel') {
    const value = await campaignState(rest[0]);
    return console.log(
      await invoke(config, {
        action: 'campaign-cancel',
        campaignId: rest[0],
        secret: value.secret,
      }),
    );
  }
  if (action === 'retire') return console.log(await invoke(config, { action, workerId: rest[0] }));
  if (action === 'recover') {
    const until = Date.now() + 600000;
    do {
      const value = await invoke(config, { action, workerId: rest[0] });
      if (value.failed) throw new Error(value.error);
      if (value.outcome || value.recovered) {
        console.log(JSON.stringify(value, null, 2));
        return;
      }
      await delay(2000);
    } while (Date.now() < until);
    throw new Error('Recovery remains incomplete; keep the slot quarantined.');
  }
  throw new Error(
    'Use plan, deploy, allocate, snapshot, run, status, cancel, collect, resume, image, execution, device, retire or recover.',
  );
}
if (import.meta.main)
  await main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
