// Cloud mutation owner; short per-worker fenced transitions permit independent callbacks.
// docs/technical/verification-workers.md#claim-and-execution-contract
import {
  SchedulerClient,
  GetScheduleCommand,
  UpdateScheduleCommand,
} from '@aws-sdk/client-scheduler';
import { CloudTrailClient, LookupEventsCommand } from '@aws-sdk/client-cloudtrail';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  EC2Client,
  RunInstancesCommand,
  DescribeInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand,
  TerminateInstancesCommand,
} from '@aws-sdk/client-ec2';
import {
  SSMClient,
  SendCommandCommand,
  GetCommandInvocationCommand,
  ListCommandsCommand,
} from '@aws-sdk/client-ssm';
import {
  S3Client,
  PutObjectCommand,
  CopyObjectCommand,
  GetObjectCommand,
  PutObjectTaggingCommand,
} from '@aws-sdk/client-s3';
import { clientOptions, send } from './aws.mjs';
import { getJson } from './artifacts.mjs';
import { executionRequest } from './execution.mjs';
import { coordination } from './coordination.mjs';
import { campaigns } from './campaigns.mjs';
import { mapBounded } from './parallel.mjs';
import { machine, launchRejected, bootReady } from './machine.mjs';
import { images } from './images.mjs';
import {
  defaults,
  digest,
  secret,
  jobPlan as validatePlan,
  authenticate,
  fence,
  id,
  integer,
  estimate,
} from './contracts.mjs';
const options = clientOptions();
const db = DynamoDBDocumentClient.from(new DynamoDBClient(options), {
  marshallOptions: { removeUndefinedValues: true },
});
const ec2 = new EC2Client(options),
  ssm = new SSMClient(options),
  s3 = new S3Client(options);
const trail = new CloudTrailClient(options),
  scheduler = new SchedulerClient(options);
const config = JSON.parse(process.env.WORKER_CONFIG ?? '{}');
config.hourlyMicroUsd = Number(config.hourlyMicroUsd);
const table = config.table;
const now = () => Date.now();
const read = async (pk) =>
  (await send(db, GetCommand, { TableName: table, Key: { pk }, ConsistentRead: true })).Item;
const { lock, transact } = coordination({ db, table, send });
const write = (item, timeoutMs) => transact([put(item)], timeoutMs);
// Derived due-work index is maintained at the shared write boundary, not by individual callers.
const put = (Item, condition, values, names) => {
  if (Item.pk.startsWith('worker:')) {
    if (Item.state !== 'image-preparing' && (Item.instanceId || Item.creationToken)) {
      const due =
        Item.state === 'leased'
          ? Math.min(Item.leaseUntil, Item.deadline)
          : Item.state === 'available'
            ? Item.lastStoppedGeneration === Item.generation
              ? Item.storageUntil
              : Math.min(Item.idleUntil ?? now() + defaults.idleMs, Item.storageUntil ?? Infinity)
            : now() + 30000;
      Item.group = 'workers';
      Item.order = `${String(due).padStart(16, '0')}:${Item.workerId}`;
    } else {
      delete Item.group;
      delete Item.order;
    }
  }
  return {
    Put: {
      TableName: table,
      Item,
      ...(condition ? { ConditionExpression: condition, ExpressionAttributeValues: values } : {}),
      ...(names ? { ExpressionAttributeNames: names } : {}),
    },
  };
};
// Sealed-run collection and lifecycle supplements update independent fields without blocking a new host lease.
const runMetadata = (run, field, value, timeoutMs) =>
  transact(
    [
      {
        Update: {
          TableName: table,
          Key: { pk: run.pk },
          UpdateExpression: 'SET #field = :value',
          ConditionExpression: 'attribute_exists(pk)',
          ExpressionAttributeNames: { '#field': field },
          ExpressionAttributeValues: { ':value': value },
        },
      },
    ],
    timeoutMs,
  );
const prefix = (run) => `workers/${run.workerId}/runs/${run.runId}`;
const object = async (Key, value, disposable = false) =>
  send(s3, PutObjectCommand, {
    Bucket: config.bucket,
    Key,
    Body: JSON.stringify(value),
    ContentType: 'application/json',
    ...(disposable ? { Tagging: 'disposable=true' } : {}),
  });
const getObject = (Key, maxBytes) => getJson(config.bucket, Key, maxBytes);

async function power(worker) {
  if (!worker.instanceId) return 'empty';
  return (
    (await send(ec2, DescribeInstancesCommand, { InstanceIds: [worker.instanceId] }))
      .Reservations?.[0]?.Instances?.[0]?.State?.Name ?? 'unknown'
  );
}
async function ensureRunning(worker) {
  const state = await power(worker);
  if (state === 'running') return true;
  if (state === 'stopped') {
    // A host-local idle stop can race a new claim. Its completed power cycle clears old shutdown intent.
    await send(ec2, StartInstancesCommand, { InstanceIds: [worker.instanceId] });
    return false;
  }
  if (state === 'stopping' || state === 'pending') return false;
  worker.state = 'quarantined';
  await write(worker);
  throw new Error(`Cannot start registered instance in ${state}.`);
}
async function idlePower(worker, state, Command) {
  // Serialize idle power intent with allocation; an admitted but not yet claimed host is occupied.
  const admitted = await lock('pool', async () => {
    if ((await read('pool'))?.owners[worker.workerId]) return false;
    worker.state = state;
    if (state === 'stopping') worker.stopRequestedAt ??= now();
    await write(worker);
    return true;
  });
  if (admitted === true) await send(ec2, Command, { InstanceIds: [worker.instanceId] });
  return admitted;
}
function publicRun(run) {
  if (!run) return null;
  const { secretHash, workerSecretHash, ...safe } = run;
  return safe;
}
async function slots(initialize = true) {
  return mapBounded(
    Array.from({ length: config.capacity ?? defaults.slots }, (_, index) => `slot-${index + 1}`),
    8,
    async (workerId) => {
      let row = await read(`worker:${workerId}`);
      if (!row) {
        row = { pk: `worker:${workerId}`, workerId, generation: 0, state: 'empty' };
        if (initialize)
          try {
            await transact([put(row, 'attribute_not_exists(pk)')]);
          } catch (error) {
            if (error.name !== 'TransactionCanceledException') throw error;
            row = await read(row.pk);
          }
      }
      return row;
    },
  );
}
async function runAndWorker(event, cleanup = false, workerCall = false) {
  id(event.runId);
  const run = await read(`run:${event.runId}`);
  if (workerCall) {
    if (!run || digest(event.workerSecret ?? '') !== run.workerSecretHash)
      throw new Error('Invalid supervisor capability.');
  } else authenticate(run, event.secret);
  const worker = await read(`worker:${run.workerId}`);
  fence(worker, { runId: event.runId, generation: run.generation }, now(), cleanup);
  return { run, worker };
}
async function finishRun(run, worker, outcome) {
  // Campaign escrow is settled once by its owner, never copied into concurrent job ledgers.
  run.phase = 'finished';
  run.outcome = outcome;
  run.finishedAt = now();
  worker.state = worker.stopRequestedAt ? 'stopping' : 'available';
  delete worker.recoveryUntil;
  delete worker.recoveryStage;
  delete worker.cleanupUntil;
  worker.idleUntil = now() + defaults.idleMs;
  worker.lastUsed = now();
  worker.lastRunId = run.runId;
  run.lifecycle = {
    status: worker.stopRequestedAt ? 'stopping' : 'idle',
    releasedAt: now(),
    workerId: worker.workerId,
    instanceId: worker.instanceId,
    generation: worker.generation,
    estimateMicroUsd: run.estimateMicroUsd,
  };
  await object(`${prefix(run)}/lifecycle.json`, run.lifecycle);
  worker.runId = null;
  worker.caseId = null;
  delete worker.plan;
  await transact([put(run), put(worker)]);
}
async function rejectedCreation(run, worker, error) {
  run.phase = 'finished';
  run.outcome = 'not-started';
  run.failure = error;
  run.capacityFailure = true;
  await transact([
    put(run),
    put({
      pk: worker.pk,
      workerId: worker.workerId,
      generation: worker.generation,
      state: 'empty',
    }),
  ]);
  return publicRun(run);
}
async function scheduleState(State) {
  const value = await send(scheduler, GetScheduleCommand, { Name: `${config.pool}-recovery` });
  if (value.State === State) return;
  await send(scheduler, UpdateScheduleCommand, {
    Name: value.Name,
    GroupName: value.GroupName,
    ScheduleExpression: value.ScheduleExpression,
    ScheduleExpressionTimezone: value.ScheduleExpressionTimezone,
    FlexibleTimeWindow: value.FlexibleTimeWindow,
    Target: value.Target,
    State,
  });
}
async function claim(event) {
  const run = await read(`run:${id(event.runId)}`);
  authenticate(run, event.secret);
  if (run.workerId) return publicRun(run);
  if (run.phase !== 'staging') throw new Error('Only a staging run can acquire a worker.');
  if (!Number.isSafeInteger(run.deadline) || run.assignedWorkerId !== event.workerId)
    throw new Error('Only an assigned job can claim its selected worker.');
  if (run.deadline <= now() + defaults.cleanupMs)
    throw new Error('Run deadline leaves no work allowance.');
  const worker = await read(`worker:${id(event.workerId)}`);
  const campaign = await read(`campaign:${run.campaignId}`);
  const pool = await read('pool');
  if (
    pool?.owners[event.workerId] !== run.campaignId ||
    campaign?.phase !== 'running' ||
    campaign.cancelledAt ||
    !campaign.workerIds.includes(event.workerId)
  )
    throw new Error('The worker is not reserved and available for this campaign.');
  if (['stopping', 'retiring'].includes(worker?.state) && !worker.runId) return { busy: true };
  if (!['available', 'empty'].includes(worker?.state))
    throw new Error('The selected worker is not available.');
  await scheduleState('ENABLED');
  worker.campaignId = run.campaignId;
  delete worker.captureSignal;
  worker.generation++;
  worker.runId = run.runId;
  worker.caseId = run.plan.cases[0].id;
  worker.state = worker.instanceId ? 'leased' : 'allocating';
  if (!worker.instanceId) {
    worker.creationStartedAt = now();
    worker.creationToken = digest([config.pool, worker.workerId, worker.generation]);
  }
  worker.leaseUntil = now() + defaults.leaseMs;
  worker.deadline = run.deadline;
  worker.storageUntil = Math.max(
    worker.storageUntil ?? 0,
    campaign.storageGrants[event.workerId].until,
  );
  run.workerId = worker.workerId;
  run.generation = worker.generation;
  run.phase = 'starting';
  run.claimedAt = now();
  run.machine = {
    instanceType: config.instanceType,
    environmentRecipe: config.bootstrapKey,
    controllerSha256: process.env.BUNDLE_DIGEST,
    hourlyMicroUsd: config.hourlyMicroUsd,
    instanceId: worker.instanceId,
  };
  delete worker.plan;
  await transact([
    put(
      worker,
      '#state = :state',
      { ':state': worker.instanceId ? 'available' : 'empty' },
      { '#state': 'state' },
    ),
    put(
      run,
      '#phase = :staging AND attribute_not_exists(workerId)',
      { ':staging': 'staging' },
      { '#phase': 'phase' },
    ),
  ]);
  if (worker.lastRunId) {
    const previous = await read(`run:${worker.lastRunId}`);
    previous.lifecycle = {
      ...previous.lifecycle,
      status: 'reused',
      reusedAt: now(),
      successor: run.runId,
    };
    await object(`${prefix(previous)}/lifecycle.json`, previous.lifecycle);
    await runMetadata(previous, 'lifecycle', previous.lifecycle);
  }
  if (!worker.instanceId) {
    let result;
    try {
      result = await send(
        ec2,
        RunInstancesCommand,
        machine(
          config,
          worker,
          (await getObject(config.bootstrapKey)).script.replaceAll('__SLOT__', worker.workerId),
        ),
      );
    } catch (error) {
      run.failure = {
        name: error.name,
        message: String(error.message).split('Encoded authorization')[0],
        requestId: error.$metadata?.requestId,
      };
      if (launchRejected(error)) {
        await rejectedCreation(run, worker, run.failure);
      } else {
        worker.state = 'quarantined';
        await transact([put(run), put(worker)]);
      }
      throw error;
    }
    worker.instanceId = result.Instances[0].InstanceId;
    worker.state = 'leased';
    run.machine.instanceId = worker.instanceId;
    await transact([put(worker), put(run)]);
  } else {
    await ensureRunning(worker);
  }
  return publicRun(run);
}
async function dispatch(event) {
  const { run, worker } = await runAndWorker(event);
  const parent = await read(`campaign:${run.campaignId}`);
  if (!parent.capacityReady) return { pending: true };
  if (
    parent.cancelledAt ||
    parent.deadline <= now() ||
    (parent.lifetime === 'attached' && parent.leaseUntil <= now())
  )
    throw new Error('Campaign dispatch is closed.');
  if (run.commandId) {
    let result;
    try {
      result = await send(ssm, GetCommandInvocationCommand, {
        CommandId: run.commandId,
        InstanceId: worker.instanceId,
      });
    } catch (e) {
      if (e.name === 'InvocationDoesNotExist') return { pending: true };
      throw e;
    }
    if (result.Status === 'Failed' && result.ResponseCode === 75) {
      delete run.commandId;
      run.phase = 'starting';
      await write(run);
    } else if (['Failed', 'TimedOut', 'Cancelled'].includes(result.Status))
      throw new Error(`Supervisor launch ${result.Status}: ${result.StandardErrorContent}`);
    else return publicRun(run);
  }
  if (run.phase === 'dispatching') return publicRun(run);
  const inputs = Object.entries(run.inputs ?? {});
  const through = Math.min(inputs.length, (run.inputCursor ?? 0) + 4);
  while ((run.inputCursor ?? 0) < through) {
    const [name, bundle] = inputs[run.inputCursor ?? 0];
    for (const suffix of ['.json', '.tar.gz'])
      await send(s3, CopyObjectCommand, {
        Bucket: config.bucket,
        Key: `${prefix(run)}/inputs/${name}${suffix}`,
        CopySource: `${config.bucket}/${bundle.key}${suffix}`,
        TaggingDirective: 'REPLACE',
        Tagging: 'disposable=true',
      });
    run.inputCursor = (run.inputCursor ?? 0) + 1;
    await write(run);
  }
  if ((run.inputCursor ?? 0) < inputs.length) return { pending: true };
  if (!(await ensureRunning(worker))) return { pending: true };
  if (run.plan.paid) {
    const grant = await getObject(`campaigns/${run.campaignId}/grants/${run.jobId}.json`);
    if (!grant) throw new Error('Missing job execution grant.');
    await executionRequest(parent.executionUrl, grant.token, `/grants/${grant.id}/start`, {
      runId: run.runId,
      generation: run.generation,
      deadlineMs: run.deadline,
    });
    run.executionKey = `${prefix(run)}/execution-private.json`;
    await object(run.executionKey, {
      ...grant,
      url: parent.executionUrl,
      deadlineMs: run.deadline,
    });
    await write(run);
  }
  run.phase = 'dispatching';
  run.dispatchAt = now();
  const workerSecret = secret();
  run.workerSecretHash = digest(workerSecret);
  await transact([
    put(run),
    {
      ConditionCheck: {
        TableName: table,
        Key: { pk: parent.pk },
        ConditionExpression:
          'capacityReady = :yes AND attribute_not_exists(cancelledAt) AND deadline > :now AND (lifetime = :durable OR leaseUntil > :now)',
        ExpressionAttributeValues: { ':yes': true, ':now': now(), ':durable': 'durable' },
      },
    },
  ]);
  const key = `${prefix(run)}/command.json`;
  await object(key, {
    ...run,
    workerSecret,
    config: {
      table: config.table,
      bucket: config.bucket,
      functionName: config.functionName,
      pool: config.pool,
    },
  });
  const bootstrap = await getObject(config.bootstrapKey);
  try {
    const result = await send(ssm, SendCommandCommand, {
      InstanceIds: [worker.instanceId],
      DocumentName: 'AWS-RunShellScript',
      TimeoutSeconds: 120,
      Comment: `ol:${run.runId}:${run.generation}`,
      Parameters: {
        commands: [
          bootReady +
            `if test ! -f /var/lib/openlegend-verification/prepared.json; then if test -f /var/lib/openlegend-verification/bootstrap-failure.json || test -f /var/lib/cloud/instance/boot-finished; then tail -n 20 /var/log/openlegend-verification-bootstrap.log >&2; exit 76; fi; exit 75; fi;
` +
            `if test "$(/usr/bin/python3 -c 'import json; print(json.load(open("/var/lib/openlegend-verification/prepared.json")).get("recipe",""))')" != '${bootstrap.recipe}'; then
` +
            "bash -se <<'OL_PREPARE'\n" +
            bootstrap.script.replaceAll('__SLOT__', worker.workerId) +
            '\nOL_PREPARE\nfi\n' +
            `ol-verification-fetch ${config.bucket} ${bootstrap.supervisorKey} /opt/openlegend-verification/incoming.mjs ${bootstrap.supervisorDigest} && mv /opt/openlegend-verification/incoming.mjs /opt/openlegend-verification/supervisor.mjs && systemctl restart ol-verification-watchdog.service && OPENLEGEND_WORKER_SLOT=${worker.workerId} /usr/local/bin/node /opt/openlegend-verification/supervisor.mjs launch ${worker.workerId} ${run.runId} ${run.generation}`,
        ],
        executionTimeout: ['480'],
      },
    });
    run.commandId = result.Command.CommandId;
    run.phase = 'preparing';
    await write(run);
  } catch (error) {
    if (error.name === 'InvalidInstanceId') {
      run.phase = 'starting';
      delete run.workerSecretHash;
      await write(run);
      return { pending: true };
    }
    // SendCommand can have succeeded despite losing its response. Never resend it blindly.
    run.controlUncertain = String(error);
    await write(run);
    throw error;
  }
  return publicRun(run);
}
async function operation(event, context) {
  if (!table || !config.bucket) throw new Error('Worker controller is not configured.');
  switch (event.action) {
    case 'health': {
      const pool = event.includeSlots ? await read('pool') : undefined;
      return {
        ready: true,
        region: options.region,
        config: {
          pool: config.pool,
          bucket: config.bucket,
          table,
          functionName: config.functionName,
          hourlyMicroUsd: config.hourlyMicroUsd,
          storageMicroUsd: config.storageMicroUsd,
          capacity: config.capacity,
          imageId: config.imageId,
          subnetId: config.subnetId,
        },
        ...(event.includeSlots
          ? {
              availableSlots: (await slots(false))
                .filter(
                  (w) =>
                    !w.runId &&
                    !w.campaignId &&
                    !pool?.owners[w.workerId] &&
                    ['available', 'empty'].includes(w.state),
                )
                .map(({ workerId, instanceId, state }) => ({ workerId, instanceId, state })),
              admissionClosed: Boolean(pool?.admissionClosed),
            }
          : {}),
      };
    }
    case 'allocate': {
      const pk = `allocation:${id(event.taskId)}`;
      integer(event.microUsd, 'cloud allocation', 1, 100_000_000);
      if (!event.authorizationRef)
        throw new Error('An existing authorization reference is required.');
      const old = await read(pk);
      if (old) {
        if (old.limit === event.microUsd) return old;
        if (event.previousMicroUsd !== old.limit || event.microUsd <= old.limit)
          throw new Error(
            'A larger authorized allocation requires its exact previous amount; charges and reservations are preserved.',
          );
        (old.adjustments ??= []).push({
          previousMicroUsd: old.limit,
          microUsd: event.microUsd,
          authorizationRef: event.authorizationRef,
          at: now(),
        });
        old.limit = event.microUsd;
        await write(old);
        return old;
      }
      const row = {
        pk,
        taskId: event.taskId,
        limit: event.microUsd,
        reserved: 0,
        charged: 0,
        authorizationRef: event.authorizationRef,
        createdAt: now(),
      };
      await send(db, PutCommand, {
        TableName: table,
        Item: row,
        ConditionExpression: 'attribute_not_exists(pk)',
      });
      return row;
    }
    case 'claim':
      return claim(event);
    case 'dispatch':
      return dispatch(event);
    case 'heartbeat': {
      const { run, worker } = await runAndWorker(event);
      worker.leaseUntil = Math.min(run.deadline, now() + defaults.leaseMs);
      await write(worker);
      return publicRun(run);
    }
    case 'status':
      return {
        run: publicRun(await read(`run:${id(event.runId)}`)),
        slots: await read(`run:${id(event.runId)}`).then(async (run) =>
          run?.workerId ? [await read(`worker:${run.workerId}`)] : [],
        ),
      };
    case 'signal': {
      const { run, worker } = await runAndWorker(event);
      if (event.caseId !== worker.caseId) throw new Error('Stale capture case.');
      if (event.finished) {
        if (!worker.captureSignal) throw new Error('Capture has not started.');
        worker.captureSignal.finishedAt ??= now();
      } else if (!worker.captureSignal)
        worker.captureSignal = {
          runId: run.runId,
          caseId: worker.caseId,
          generation: worker.generation,
          sentAt: now(),
        };
      await write(worker);
      return { sentAt: worker.captureSignal.sentAt };
    }
    case 'report': {
      const completed = await read(`run:${id(event.runId)}`);
      if (completed?.phase === 'finished') {
        if (digest(event.workerSecret ?? '') !== completed.workerSecretHash)
          throw new Error('Invalid supervisor capability.');
        return publicRun(completed);
      }
      const { run, worker } = await runAndWorker(event, true, true);
      if (run.phase === 'finished') return publicRun(run);
      if (event.kind === 'failure') {
        worker.state = 'quarantined';
        run.phase = 'failed';
        run.failure = event.error;
        await transact([put(worker), put(run)]);
        return publicRun(run);
      }
      if (event.kind === 'case') {
        if (run.completedCases?.includes(event.caseId)) return publicRun(run);
        fence(
          worker,
          { runId: run.runId, generation: run.generation, caseId: event.caseId },
          now(),
        );
        const index = run.plan.cases.findIndex((c) => c.id === event.caseId);
        run.completedCases = [...new Set([...(run.completedCases ?? []), event.caseId])];
        if (event.success && run.plan.cases[index + 1])
          worker.caseId = run.plan.cases[index + 1].id;
        run.phase = event.success ? 'running' : 'cleaning';
        await transact([put(run), put(worker)]);
      } else if (event.kind === 'ready') {
        if (!event.caseId) throw new Error('Readiness requires the current case.');
        fence(worker, { runId: run.runId, generation: run.generation, caseId: event.caseId });
        run.phase = event.phase;
        run.ready = event.ready;
        await write(run);
      } else if (event.kind === 'complete') {
        const receipt = await getObject(
          `${prefix(run)}/${event.recovered ? 'recovery' : 'completion'}.json`,
        );
        if (receipt.runId !== run.runId || receipt.generation !== run.generation)
          throw new Error('Cleanup receipt is absent or invalid.');
        for (const commandId of [run.commandId, run.recoveryCommandId].filter(Boolean)) {
          const invocation = await send(ssm, GetCommandInvocationCommand, {
            CommandId: commandId,
            InstanceId: worker.instanceId,
          });
          if (!['Success', 'Failed', 'Cancelled', 'TimedOut'].includes(invocation.Status))
            return { pending: true };
        }
        run.artifacts = `${prefix(run)}/manifest.json`;
        run.completion = receipt;
        if (event.publication) run.publication = event.publication;
        if (!receipt.clean) {
          worker.state = 'quarantined';
          run.phase = 'failed';
          run.failure = receipt.failure ?? 'Cleanup incomplete';
          await transact([put(run), put(worker)]);
          return publicRun(run);
        }
        if (
          receipt.outcome === 'completed' &&
          run.plan.mode === 'browser-session' &&
          !run.browserArtifacts
        ) {
          run.phase = 'awaiting-client';
          await write(run);
          return publicRun(run);
        }
        await finishRun(run, worker, receipt.outcome);
      }
      return publicRun(run);
    }
    case 'client-complete': {
      const { run, worker } = await runAndWorker(event);
      if (run.plan.mode !== 'browser-session') throw new Error('Not a browser session.');
      const key = `${prefix(run)}/browser/manifest.json`;
      const value = await getObject(key);
      if (
        value.runId !== run.runId ||
        value.generation !== run.generation ||
        value.caseId !== worker.caseId ||
        digest(value) !== event.manifestHash
      )
        throw new Error('Browser artifacts do not match the admitted capture.');
      run.browserArtifacts = key;
      if (run.completion?.clean) await finishRun(run, worker, run.completion.outcome);
      else await write(run);
      return publicRun(run);
    }
    case 'collected': {
      const run = await read(`run:${id(event.runId)}`);
      authenticate(run, event.secret);
      const manifest = run.artifacts && (await getObject(run.artifacts));
      if (!manifest || event.manifestHash !== digest(manifest))
        throw new Error('Collected manifest mismatch.');
      const keys = manifest.files.map((entry) => entry.key);
      if (run.browserArtifacts) {
        const browser = await getObject(run.browserArtifacts);
        if (event.browserManifestHash !== digest(browser))
          throw new Error('Browser collection acknowledgement is absent or stale; collect again.');
        keys.push(...browser.files.map((entry) => entry.key), run.browserArtifacts);
      }
      keys.push(run.artifacts, `${prefix(run)}/command.json`);
      const artifactSetHash = digest([event.manifestHash, event.browserManifestHash ?? null]);
      run.collection = {
        manifestHash: event.manifestHash,
        destination: event.destination,
        at: now(),
        artifactSetHash,
        nextObject:
          run.collection?.artifactSetHash === artifactSetHash ? run.collection.nextObject : 0,
      };
      await runMetadata(run, 'collection', run.collection);
      // A comparison can export thousands of files. Yield the sole controller
      // between bounded batches so collection cannot starve another run's lease.
      const until = now() + Math.min(15000, (context?.getRemainingTimeInMillis() ?? 60000) - 12000);
      const through = Math.min(keys.length, run.collection.nextObject + 64);
      while (run.collection.nextObject < through && now() < until) {
        const batch = keys.slice(run.collection.nextObject, run.collection.nextObject + 8);
        const results = await Promise.allSettled(
          batch.map(async (Key) => {
            try {
              await send(
                s3,
                PutObjectTaggingCommand,
                {
                  Bucket: config.bucket,
                  Key,
                  Tagging: { TagSet: [{ Key: 'disposable', Value: 'true' }] },
                },
                5000,
              );
            } catch (error) {
              if (Key !== `${prefix(run)}/command.json` || error.name !== 'NoSuchKey') throw error;
            }
          }),
        );
        const failed = results.find((result) => result.status === 'rejected');
        if (failed) throw failed.reason;
        run.collection.nextObject += batch.length;
        await runMetadata(run, 'collection', run.collection, 5000);
      }
      return { ...publicRun(run), pending: run.collection.nextObject < keys.length };
    }
    case 'cancel': {
      const run = await read(`run:${id(event.runId)}`);
      if (!run) return { outcome: 'not-started', unadmitted: true };
      authenticate(run, event.secret);
      if (run.phase === 'finished') return publicRun(run);
      if (!run.workerId) {
        run.phase = 'finished';
        run.outcome = 'not-started';
        await write(run);
        return publicRun(run);
      }
      const worker = await read(`worker:${run.workerId}`);
      if (run.phase === 'awaiting-client' && run.completion?.clean && run.artifacts) {
        await finishRun(
          run,
          worker,
          run.completion.outcome === 'completed' ? 'interrupted' : run.completion.outcome,
        );
        return publicRun(run);
      }
      if (worker.state === 'quarantined') return publicRun(run);
      fence(worker, { runId: run.runId, generation: run.generation }, now(), true);
      worker.state = 'releasing';
      worker.leaseUntil = 0;
      worker.cleanupUntil = now() + defaults.cleanupMs;
      run.phase = 'cleaning';
      await transact([put(worker), put(run)]);
      return publicRun(run);
    }
    case 'retire': {
      const worker = await read(`worker:${id(event.workerId)}`);
      if (!worker || worker.runId || !['available', 'stopping'].includes(worker.state))
        throw new Error('Only an idle registered worker can be retired.');
      const admitted = await idlePower(worker, 'retiring', TerminateInstancesCommand);
      if (admitted !== true) throw new Error('Worker allocation is busy or reserved.');
      return { workerId: worker.workerId, state: worker.state };
    }
    case 'recover': {
      const worker = await read(`worker:${id(event.workerId)}`);
      if (worker.state === 'leased' && worker.leaseUntil > now())
        throw new Error('Healthy claims cannot be taken over.');
      if (!worker.runId && worker.state === 'available')
        return { recovered: true, workerId: worker.workerId };
      if (!worker.runId) throw new Error('No interrupted run to recover.');
      const run = await read(`run:${worker.runId}`);
      if (!worker.instanceId) {
        const token = worker.creationToken;
        if (!token) throw new Error('Creation token unavailable; keep slot quarantined.');
        const found = await send(ec2, DescribeInstancesCommand, {
          Filters: [{ Name: 'client-token', Values: [token] }],
        });
        const instances = found.Reservations.flatMap((r) => r.Instances);
        if (instances.length > 1) throw new Error('Ambiguous allocation: keep slot quarantined.');
        if (instances.length === 1) {
          worker.instanceId = instances[0].InstanceId;
          worker.state = 'quarantined';
          await write(worker);
          throw new Error('Allocated instance found; inspect/recover its registered slot.');
        }
        const history = await send(trail, LookupEventsCommand, {
          LookupAttributes: [{ AttributeKey: 'EventName', AttributeValue: 'RunInstances' }],
          StartTime: new Date(worker.creationStartedAt - 60000),
          EndTime: new Date(worker.creationStartedAt + 120000),
          MaxResults: 50,
        });
        const rejection = history.Events.map((e) => JSON.parse(e.CloudTrailEvent)).find(
          (e) =>
            e.requestParameters?.clientToken === token &&
            e.errorCode === 'Client.UnauthorizedOperation',
        );
        if (rejection)
          return rejectedCreation(run, worker, {
            name: 'UnauthorizedOperation',
            requestId: rejection.requestID,
            proof: 'CloudTrail confirms rejected creation; EC2 confirms no matching instance.',
          });
        throw new Error('Creation remains uncertain; slot and reservation are retained.');
      }

      worker.state = 'quarantined';
      if (!worker.recoveryUntil || worker.recoveryUntil <= now()) {
        const campaign = await read(`campaign:${run.campaignId}`);
        const funding = await lock(`allocation:${run.plan.cloudAllocationId}`, async () => {
          const extra = campaign.recoveryRemainingMicroUsd < 100000;
          const allocation = extra
            ? await read(`allocation:${run.plan.cloudAllocationId}`)
            : undefined;
          if (extra) {
            if (allocation.charged + allocation.reserved + 100000 > allocation.limit)
              throw new Error('Further recovery needs $0.10 of remaining task allocation.');
            allocation.reserved += 100000;
            campaign.reservation += 100000;
            campaign.recoveryRemainingMicroUsd += 100000;
          }
          campaign.recoveryRemainingMicroUsd -= 100000;
          run.recoveryReservations = (run.recoveryReservations ?? 0) + 1;
          worker.recoveryUntil = now() + 600000;
          await transact([
            ...(allocation ? [put(allocation)] : []),
            put(campaign),
            put(run),
            put(worker),
          ]);
        });
        if (funding?.busy) return { busy: true };
      }
      const state = await power(worker);
      if (!worker.recoveryStage) {
        worker.recoveryStage = 'stopping';
        worker.stopRequestedAt = now();
        await write(worker);
      }
      if (worker.recoveryStage === 'stopping') {
        if (state !== 'stopped') {
          if (state === 'running')
            await send(ec2, StopInstancesCommand, { InstanceIds: [worker.instanceId] });
          return { pending: true, runId: run.runId };
        }
        worker.recoveryStage = 'starting';
        delete worker.stopRequestedAt;
        await write(worker);
        await send(ec2, StartInstancesCommand, { InstanceIds: [worker.instanceId] });
        return { pending: true, runId: run.runId };
      }
      if (state === 'stopped') {
        await send(ec2, StartInstancesCommand, { InstanceIds: [worker.instanceId] });
        return { pending: true, runId: run.runId };
      }
      if (state !== 'running') return { pending: true, runId: run.runId };
      if (run.recoveryDispatch && !run.recoveryCommandId) {
        const history = await send(ssm, ListCommandsCommand, {
          InstanceId: worker.instanceId,
          MaxResults: 50,
          Filters: [
            { key: 'InvokedAfter', value: new Date(run.recoveryDispatch.at - 60000).toISOString() },
          ],
        });
        const found = history.Commands.filter(
          (command) => command.Comment === run.recoveryDispatch.comment,
        );
        if (found.length !== 1)
          throw new Error('Recovery dispatch remains uncertain; keep the slot quarantined.');
        run.recoveryCommandId = found[0].CommandId;
        await write(run);
      }
      if (run.recoveryCommandId) {
        const invocation = await send(ssm, GetCommandInvocationCommand, {
          CommandId: run.recoveryCommandId,
          InstanceId: worker.instanceId,
        });
        if (!['Success', 'Failed', 'TimedOut', 'Cancelled'].includes(invocation.Status))
          return publicRun(run);
        if (invocation.Status === 'Success' && run.phase !== 'failed') return publicRun(run);
        run.recoveryFailure = {
          commandId: run.recoveryCommandId,
          status: invocation.Status,
          error: invocation.StandardErrorContent,
        };
        delete run.recoveryCommandId;
        delete run.recoveryDispatch;
        worker.recoveryStage = 'stopping';
        worker.stopRequestedAt = now();
        await transact([put(run), put(worker)]);
        await send(ec2, StopInstancesCommand, { InstanceIds: [worker.instanceId] });
        return {
          failed: true,
          error:
            'Recovery failed. Inspect its recorded command, fix the prerequisite, then invoke recover again.',
        };
      }
      if (!run.workerSecretHash) {
        const workerSecret = secret();
        run.workerSecretHash = digest(workerSecret);
        await write(run);
        await object(`${prefix(run)}/command.json`, { ...run, workerSecret });
      }
      const bootstrap = await getObject(config.bootstrapKey);
      run.phase = 'recovering';
      run.recoveryDispatch = {
        at: now(),
        comment: `ol-repair:${run.runId}:${run.generation}:${secret().slice(0, 8)}`,
      };
      await write(run);
      let response;
      try {
        response = await send(ssm, SendCommandCommand, {
          InstanceIds: [worker.instanceId],
          DocumentName: 'AWS-RunShellScript',
          TimeoutSeconds: 60,
          Comment: run.recoveryDispatch.comment,
          Parameters: {
            commands: [
              "bash -se <<'OL_BOOTSTRAP'\n" +
                bootstrap.script.replaceAll('__SLOT__', worker.workerId) +
                '\nOL_BOOTSTRAP\n' +
                `\n systemd-run --quiet --collect --unit=ol-repair-${run.runId} --property=RuntimeMaxSec=540 --setenv=OPENLEGEND_WORKER_SLOT=${worker.workerId} /usr/local/bin/node /opt/openlegend-verification/supervisor.mjs repair ${worker.workerId} ${run.runId} ${run.generation}`,
            ],
            executionTimeout: ['480'],
          },
        });
      } catch (error) {
        if (error.name === 'InvalidInstanceId') {
          delete run.recoveryDispatch;
          await write(run);
          return { pending: true, runId: run.runId };
        }
        throw error;
      }
      run.recoveryCommandId = response.Command.CommandId;
      await write(run);
      return publicRun(run);
    }
    case 'maintain': {
      const worker = await read(`worker:${id(event.workerId)}`);
      if (!worker) return;
      if (
        worker.instanceId &&
        ['leased', 'releasing', 'allocating'].includes(worker.state) &&
        (worker.leaseUntil <= now() || worker.deadline <= now())
      ) {
        if (!worker.cleanupUntil) {
          worker.state = 'releasing';
          worker.cleanupUntil = now() + defaults.cleanupMs;
          await write(worker);
          return;
        }
        if (worker.cleanupUntil > now()) return;
        worker.state = 'quarantined';
        worker.stopRequestedAt = now();
        await write(worker);
        await send(ec2, StopInstancesCommand, { InstanceIds: [worker.instanceId] });
      } else if (
        worker.state === 'quarantined' &&
        worker.stopRequestedAt &&
        !worker.recoveryStage
      ) {
        if ((await power(worker)) === 'running')
          await send(ec2, StopInstancesCommand, { InstanceIds: [worker.instanceId] });
      } else if (worker.state === 'available' && worker.storageUntil <= now()) {
        await idlePower(worker, 'retiring', TerminateInstancesCommand);
      } else if (worker.state === 'retiring') {
        const state = await power(worker);
        if (state === 'terminated') {
          if (worker.lastRunId) {
            const previous = await read(`run:${worker.lastRunId}`);
            previous.lifecycle = {
              ...previous.lifecycle,
              status: 'retired',
              terminatedAt: now(),
            };
            await object(`${prefix(previous)}/lifecycle.json`, previous.lifecycle);
            await runMetadata(previous, 'lifecycle', previous.lifecycle);
          }
          await write({
            pk: worker.pk,
            workerId: worker.workerId,
            generation: worker.generation,
            state: 'empty',
          });
        } else if (state !== 'shutting-down') {
          // The persisted intent can outlive a failed/lost EC2 request. Retrying
          // termination of this exact registered instance cannot replay a job.
          await send(ec2, TerminateInstancesCommand, { InstanceIds: [worker.instanceId] });
        }
      } else if (['available', 'stopping'].includes(worker.state) && worker.instanceId) {
        const state = await power(worker);
        if (state === 'running' && (worker.state === 'stopping' || worker.idleUntil <= now())) {
          await idlePower(worker, 'stopping', StopInstancesCommand);
        } else if (
          state === 'stopped' &&
          (worker.state === 'stopping' || worker.lastStoppedGeneration !== worker.generation)
        ) {
          worker.lastStoppedGeneration = worker.generation;
          if (worker.lastRunId) {
            const previous = await read(`run:${worker.lastRunId}`);
            previous.lifecycle = { ...previous.lifecycle, status: 'stopped', stoppedAt: now() };
            await object(`${prefix(previous)}/lifecycle.json`, previous.lifecycle);
            await runMetadata(previous, 'lifecycle', previous.lifecycle);
          }
          worker.state = 'available';
          delete worker.stopRequestedAt;
          await write(worker);
        }
      }
      return { workerId: worker.workerId };
    }
    default:
      throw new Error('Unknown worker operation.');
  }
}

const imageOwner = images({
  object,
  config,
  db,
  table,
  send,
  read,
  write,
  transact,
  put,
  lock,
  getObject,
  slots,
});
const campaignOwner = campaigns({
  config,
  db,
  table,
  send,
  read,
  write,
  transact,
  put,
  lock,
  object,
  getObject,
  slots,
  scheduleState,
  operation: (event, context) => handler(event, context),
});
export async function handler(event, context) {
  if (['campaign-admit', 'image-prepare'].includes(event.action)) await scheduleState('ENABLED');
  if (event.action.startsWith('image-')) return imageOwner(event);
  if (event.action.startsWith('campaign-')) return campaignOwner(event, context);
  if (event.action === 'tick') return campaignOwner({ ...event, action: 'campaign-tick' }, context);
  if (event.action === 'status' || event.action === 'health') return operation(event, context);
  if (event.action === 'allocate')
    return lock(`allocation:${id(event.taskId)}`, () => operation(event, context));
  const run = event.runId && (await read(`run:${id(event.runId)}`));
  if (event.action === 'collected' && run?.phase === 'finished')
    return lock(`collection:${id(event.runId)}`, () => operation(event, context));
  const workerId = event.workerId ?? run?.workerId;
  const key = workerId
    ? `worker:${id(workerId)}`
    : event.runId
      ? `run:${id(event.runId)}`
      : undefined;
  const work = () => (key ? lock(key, () => operation(event, context)) : operation(event, context));
  const recoveryRun =
    event.action === 'recover' && workerId
      ? await read(`worker:${workerId}`).then((worker) =>
          worker?.runId ? read(`run:${worker.runId}`) : undefined,
        )
      : undefined;
  const result = await (recoveryRun?.campaignId
    ? lock(`campaign:${recoveryRun.campaignId}`, work)
    : work());
  if (result?.phase === 'finished' && result.campaignId)
    await campaignOwner({ action: 'campaign-notify', campaignId: result.campaignId });
  return result;
}
