import { build } from 'esbuild';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';
import {
  CloudFormationClient,
  CreateStackCommand,
  UpdateStackCommand,
  DescribeStacksCommand,
  ValidateTemplateCommand,
} from '@aws-sdk/client-cloudformation';
import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { SSMClient } from '@aws-sdk/client-ssm';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  LambdaClient,
  InvokeCommand,
  GetFunctionConcurrencyCommand,
  PutFunctionConcurrencyCommand,
} from '@aws-sdk/client-lambda';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { clientOptions, send } from './aws.mjs';
import { defaults, digest, integer, id, workerAffinity } from './contracts.mjs';
import { json, hashFile } from './files.mjs';
import { upload, getJson } from './artifacts.mjs';
import { template } from './infrastructure.mjs';
import { coordination as controlCoordination } from './coordination.mjs';
import { quarantinedDeploymentEvidence } from './quarantine.mjs';

export async function buildWorkerBundle(name, directory) {
  const outfile = join(directory, `${name}.mjs`);
  await build({
    entryPoints: [`scripts/verification-workers/${name}.mjs`],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node24',
    banner: {
      js: "import{createRequire as __createRequire}from'node:module';const require=__createRequire(import.meta.url);",
    },
  });
  return outfile;
}

export function deploymentPoolQuiescent(pool, preserved) {
  const owners = Object.entries(pool?.owners ?? {});
  return (
    (!pool?.admittedCampaigns && !owners.length) ||
    Boolean(
      preserved &&
        pool.admittedCampaigns === 1 &&
        owners.length === 1 &&
        owners[0][0] === preserved.workerId &&
        owners[0][1] === preserved.campaignId,
    )
  );
}
export async function deploy(home, args) {
  const identity = await send(new STSClient(clientOptions()), GetCallerIdentityCommand, {});
  if (identity.Account !== defaults.account) throw new Error('Refusing another AWS project.');
  const config = args[0] ? await json(args[0]) : null;
  if (!config?.vpcId || !config.subnetId || !config.imageId || !config.authorizationRef)
    throw new Error('deploy requires JSON with vpcId, subnetId, imageId and authorizationRef.');
  const waitForIdleSeconds = integer(
    config.waitForIdleSeconds ?? 0,
    'deployment drain seconds',
    0,
    3600,
  );
  const preserved = config.preservedQuarantine;
  if (preserved !== undefined) {
    workerAffinity({ workerId: preserved.workerId, instanceId: preserved.instanceId });
    id(preserved.runId);
    integer(preserved.generation, 'preserved quarantine generation', 1, Number.MAX_SAFE_INTEGER);
  }
  const quote = config.priceQuote;
  if (
    !quote ||
    quote.instanceType !== 'm7i.xlarge' ||
    !quote.source ||
    !Number.isFinite(quote.hourlyUsd) ||
    quote.hourlyUsd <= 0 ||
    !Number.isFinite(Date.parse(quote.observedAt)) ||
    Date.parse(quote.observedAt) > Date.now() ||
    Date.now() - Date.parse(quote.observedAt) > 86400000
  )
    throw new Error(
      'Deployment requires a current (24-hour) m7i.xlarge Linux on-demand priceQuote.',
    );
  const hourlyMicroUsd = Math.ceil((quote.hourlyUsd + 0.005) * 1e6);
  const directory = await mkdtemp(join(tmpdir(), 'ol-worker-deploy-'));
  const stackName = config.stackName ?? 'openlegend-verification';
  if (!/^[a-zA-Z][a-zA-Z0-9-]{0,39}$/.test(stackName))
    throw new Error('Pool stack names must be 1–40 simple characters.');
  const cfn = new CloudFormationClient(clientOptions());
  const capacity = integer(config.capacity ?? defaults.slots, 'pool capacity', 1, 128);
  if (preserved && Number(preserved.workerId.slice(5)) > capacity)
    throw new Error(
      'Configured capacity must retain the preserved quarantine slot and its scoped role.',
    );
  const warmSlots = integer(
    config.warmSlots ?? Math.min(2, capacity),
    'warm-cache slots',
    0,
    capacity,
  );
  const generated = template(capacity, warmSlots);
  const body = JSON.stringify(generated);
  if (Object.keys(generated.Resources).length > 500 || Buffer.byteLength(body) > 1024 * 1024)
    throw new Error('Generated infrastructure exceeds CloudFormation limits.');
  await writeFile(join(directory, 'template.json'), body);
  let stack;
  try {
    stack = (await send(cfn, DescribeStacksCommand, { StackName: stackName })).Stacks[0];
  } catch (e) {
    if (!String(e.message).includes('does not exist')) throw e;
  }
  const expires = String(Date.now() + defaults.retentionMs);
  const base = [
    ['VpcId', config.vpcId],
    ['SubnetId', config.subnetId],
    ['ImageId', config.imageId],
    ['ExpiresAt', expires],
    ['HourlyMicroUsd', String(hourlyMicroUsd)],
  ];
  async function wait() {
    for (let i = 0; i < 120; i++) {
      const current = (await send(cfn, DescribeStacksCommand, { StackName: stackName })).Stacks[0];
      if (['CREATE_COMPLETE', 'UPDATE_COMPLETE'].includes(current.StackStatus)) return current;
      if (!current.StackStatus.endsWith('_IN_PROGRESS'))
        throw new Error(`Stack ${current.StackStatus}: inspect its events.`);
      await delay(3000);
    }
    throw new Error('Stack operation timed out; inspect status before retrying.');
  }
  if (!stack) {
    await send(cfn, CreateStackCommand, {
      StackName: stackName,
      TemplateBody: JSON.stringify(template(2)),
      Parameters: base.map(([ParameterKey, ParameterValue]) => ({ ParameterKey, ParameterValue })),
      Capabilities: ['CAPABILITY_NAMED_IAM'],
      Tags: [{ Key: 'OpenLegendVerification', Value: 'managed' }],
    });
    stack = await wait();
  }
  const outputs = Object.fromEntries(stack.Outputs.map((x) => [x.OutputKey, x.OutputValue]));
  const [controllerPath, supervisorPath] = await Promise.all([
    buildWorkerBundle('controller', directory),
    buildWorkerBundle('supervisor', directory),
  ]);
  const controllerDigest = await hashFile(controllerPath),
    supervisorDigest = await hashFile(supervisorPath);
  const controllerKey = `control/controller-${controllerDigest}.mjs`,
    supervisorKey = `control/supervisor-${supervisorDigest}.mjs`;
  await upload(outputs.Bucket, controllerKey, controllerPath);
  await upload(outputs.Bucket, supervisorKey, supervisorPath);
  let script = await readFile('scripts/verification-workers/bootstrap.sh', 'utf8');
  script = script.replace(
    '__WORKSPACE_CHECK__',
    await readFile('scripts/verification-workers/workspace-check.mjs', 'utf8'),
  );
  script = script.replace(
    '__FETCH_SOURCE__',
    await readFile('scripts/verification-workers/bootstrap-fetch.py', 'utf8'),
  );
  script = script.replaceAll(
    '__TOOLS_RECIPE__',
    digest(script.slice(0, script.indexOf('cat > /usr/local/bin/ol-verification-fetch'))),
  );
  const recipe = digest(script);
  for (const [key, value] of Object.entries({
    RECIPE: recipe,
    BUCKET: outputs.Bucket,
    TABLE: outputs.Table,
    FUNCTION: outputs.Function,
    SUPERVISOR_KEY: supervisorKey,
    SUPERVISOR_DIGEST: supervisorDigest,
  }))
    script = script.replaceAll(`__${key}__`, value);
  const bootstrapPath = join(directory, 'bootstrap.json');
  await json(bootstrapPath, { script, recipe, supervisorKey, supervisorDigest });
  const bootstrapKey = `control/bootstrap-${await hashFile(bootstrapPath)}.json`;
  await upload(outputs.Bucket, bootstrapKey, bootstrapPath);
  const templateKey = `control/template-${digest(body)}.json`;
  await upload(outputs.Bucket, templateKey, join(directory, 'template.json'));
  const templateUrl = `https://${outputs.Bucket}.s3.${defaults.region}.amazonaws.com/${templateKey}`;
  await send(cfn, ValidateTemplateCommand, { TemplateURL: templateUrl });
  const parameters = [
    ...base,
    ['BundleKey', controllerKey],
    ['BundleDigest', controllerDigest],
    ['BootstrapKey', bootstrapKey],
    ['RecoveryState', 'ENABLED'],
  ];
  // The current-format cutover replaces named profiles. Never update live claims or discard exports.
  const coordination = DynamoDBDocumentClient.from(new DynamoDBClient(clientOptions()));
  const control = new LambdaClient(clientOptions());
  async function oldOperation(event) {
    const result = await send(
      control,
      InvokeCommand,
      { FunctionName: outputs.Function, Payload: Buffer.from(JSON.stringify(event)) },
      70000,
    );
    const value = JSON.parse(Buffer.from(result.Payload).toString());
    if (result.FunctionError)
      throw new Error(value.errorMessage ?? 'Current controller refused cutover.');
    return value;
  }
  const previousConfig = await json(join(home, 'pool.json')).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  const read = async (pk) =>
    (
      await send(coordination, GetCommand, {
        TableName: outputs.Table,
        Key: { pk },
        ConsistentRead: true,
      })
    ).Item;
  const preservationEvidence = async () => {
    if (!preserved) return null;
    const [worker, run, pool] = await Promise.all([
      read(`worker:${preserved.workerId}`),
      read(`run:${preserved.runId}`),
      read('pool'),
    ]);
    const campaign = run?.campaignId ? await read(`campaign:${run.campaignId}`) : undefined;
    return quarantinedDeploymentEvidence({
      expected: preserved,
      worker,
      run,
      campaign,
      pool,
      poolName: stackName,
      ec2: new EC2Client(clientOptions()),
      ssm: new SSMClient(clientOptions()),
      send,
      getObject: (key) => getJson(outputs.Bucket, key),
    });
  };
  const preservedEvidence = await preservationEvidence();
  if (preservedEvidence)
    await json(join(directory, 'preserved-quarantine.json'), preservedEvidence);
  const schema = await send(new DynamoDBClient(clientOptions()), DescribeTableCommand, {
    TableName: outputs.Table,
  });
  const hasQueue = schema.Table.GlobalSecondaryIndexes?.some(
    (index) => index.IndexName === 'group-order',
  );
  const queueHasWork = async () => {
    if (!hasQueue) return false;
    const queued = await send(coordination, QueryCommand, {
      TableName: outputs.Table,
      IndexName: 'group-order',
      KeyConditionExpression: '#group = :queue',
      ExpressionAttributeNames: { '#group': 'group' },
      ExpressionAttributeValues: { ':queue': 'queue' },
      Limit: 2,
    });
    return Boolean(
      queued.LastEvaluatedKey ||
        (queued.Items ?? []).some(
          (row) => !preservedEvidence || row.pk !== `campaign:${preservedEvidence.campaignId}`,
        ),
    );
  };
  if (!waitForIdleSeconds && (await queueHasWork()))
    throw new Error(
      'Deployment blocked by an admitted campaign; finish or cancel it through its current owner.',
    );
  const metadata = controlCoordination({ db: coordination, table: outputs.Table, send });
  const maintenanceToken = digest([
    controllerDigest,
    supervisorDigest,
    bootstrapKey,
    body,
    config.vpcId,
    config.subnetId,
    config.imageId,
    hourlyMicroUsd,
    warmSlots,
    waitForIdleSeconds,
    preserved ?? null,
    config.authorizationRef,
  ]);
  console.error(`Deployment operation ${maintenanceToken}`);
  const gate = await metadata.lock('pool', async () => {
    const pool = (
      await send(coordination, GetCommand, {
        TableName: outputs.Table,
        Key: { pk: 'pool' },
        ConsistentRead: true,
      })
    ).Item ?? { pk: 'pool', owners: {}, admittedCampaigns: 0 };
    if (!waitForIdleSeconds && !deploymentPoolQuiescent(pool, preservedEvidence))
      throw new Error('Pool has admitted campaigns or image work; deployment is closed.');
    if (
      pool.admissionClosed &&
      pool.admissionClosed !== maintenanceToken &&
      (waitForIdleSeconds || config.resumeDeployment !== pool.admissionClosed)
    )
      throw new Error(
        'Another deployment holds admission closed. Inspect its stack outcome before explicitly resuming that exact operation.',
      );
    const createdClosure = !pool.admissionClosed;
    pool.admissionClosed = maintenanceToken;
    await metadata.transact([{ Put: { TableName: outputs.Table, Item: pool } }]);
    return { createdClosure };
  });
  if (gate.busy) throw new Error('Pool allocation is busy; deploy after that transition finishes.');
  const reopenOwned = () =>
    metadata.lock('pool', async () => {
      const pool = await read('pool');
      if (pool?.admissionClosed !== maintenanceToken) return { reopened: false };
      delete pool.admissionClosed;
      await metadata.transact([{ Put: { TableName: outputs.Table, Item: pool } }]);
      return { reopened: true };
    });
  if (waitForIdleSeconds) {
    const until = performance.now() + waitForIdleSeconds * 1000;
    const checkDrainDeadline = () => {
      if (performance.now() >= until)
        throw new Error('Deployment drain timed out; existing jobs remain untouched.');
    };
    console.error(
      `New admission closed; allowing existing owners up to ${waitForIdleSeconds} seconds to finish.`,
    );
    try {
      for (;;) {
        checkDrainDeadline();
        const [pool, queued] = await Promise.all([read('pool'), queueHasWork()]);
        if (pool?.admissionClosed !== maintenanceToken)
          throw new Error('Deployment drain no longer owns the admission closure.');
        checkDrainDeadline();
        if (deploymentPoolQuiescent(pool, preservedEvidence) && !queued) break;
        await delay(Math.min(5000, Math.max(1, until - performance.now())));
      }
    } catch (error) {
      // A pre-existing same-token closure may belong to an uncertain earlier
      // cutover. Only this attempt's newly acquired drain closure is disposable.
      if (gate.createdClosure) {
        try {
          for (let attempt = 0; ; attempt++) {
            const opened = await reopenOwned();
            if (!opened?.busy) break;
            if (attempt === 5)
              throw new Error(
                'Owned drain closure release remains pending; inspect this maintenance token.',
              );
            await delay(1000);
          }
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            'Deployment drain failed and closure release is unconfirmed.',
          );
        }
      }
      throw error;
    }
  }
  const retired = [];
  for (let n = 1; n <= Math.max(capacity, previousConfig?.capacity ?? 2); n++) {
    const workerId = `slot-${n}`;
    const row = (
      await send(coordination, GetCommand, {
        TableName: outputs.Table,
        Key: { pk: `worker:${workerId}` },
        ConsistentRead: true,
      })
    ).Item;
    if (!row) continue;
    if (preserved && row.workerId === preserved.workerId) {
      if (
        row.runId !== preserved.runId ||
        row.generation !== preserved.generation ||
        row.instanceId !== preserved.instanceId ||
        row.state !== 'quarantined'
      )
        throw new Error('Preserved quarantine changed during deployment admission.');
      continue;
    }
    if (
      row.runId ||
      row.campaignId ||
      !['available', 'empty', 'stopping', 'retiring'].includes(row.state)
    )
      throw new Error(
        `Cutover blocked by ${workerId}: ${row.state}. Preserve and finish/recover its existing owner first.`,
      );
    if (row.instanceId) {
      const instance = (
        await send(new EC2Client(clientOptions()), DescribeInstancesCommand, {
          InstanceIds: [row.instanceId],
        })
      ).Reservations[0].Instances[0];
      if (!instance.IamInstanceProfile?.Arn.endsWith(`/${stackName}-${workerId}`) || n > capacity) {
        if (row.state !== 'retiring') await oldOperation({ action: 'retire', workerId });
        retired.push(workerId);
      }
    }
  }
  if (retired.length) {
    for (let attempt = 0; attempt < 40; attempt++) {
      await oldOperation({ action: 'tick' });
      const states = await Promise.all(
        retired.map((workerId) =>
          send(coordination, GetCommand, {
            TableName: outputs.Table,
            Key: { pk: `worker:${workerId}` },
            ConsistentRead: true,
          }),
        ),
      );
      if (states.every((result) => result.Item.state === 'empty')) break;
      if (attempt === 39)
        throw new Error('Existing hosts have not finished retirement; cutover remains closed.');
      await delay(3000);
    }
  }
  const previousConcurrency = await send(control, GetFunctionConcurrencyCommand, {
    FunctionName: outputs.Function,
  });
  await send(control, PutFunctionConcurrencyCommand, {
    FunctionName: outputs.Function,
    ReservedConcurrentExecutions: 0,
  });
  console.error(
    'Worker admission paused; allowing prior control invocations to settle before cutover.',
  );
  for (let n = 0; n < 6; n++) await delay(10000);
  try {
    // Recheck actual stopped power, terminal commands and sealed collection after
    // prior controller invocations have ended; preserve every old owner record.
    await preservationEvidence();
    for (let n = 1; n <= Math.max(capacity, previousConfig?.capacity ?? 2); n++) {
      const row = (
        await send(coordination, GetCommand, {
          TableName: outputs.Table,
          Key: { pk: `worker:slot-${n}` },
          ConsistentRead: true,
        })
      ).Item;
      if (preserved && row?.workerId === preserved.workerId) continue;
      if (
        row &&
        (row.runId ||
          row.campaignId ||
          row.imageBuildId ||
          !['empty', 'available', 'stopping'].includes(row.state))
      ) {
        throw new Error(
          'A prior control operation acquired work during cutover; preserve its current owner and retry after cleanup.',
        );
      }
    }
  } catch (error) {
    await send(control, PutFunctionConcurrencyCommand, {
      FunctionName: outputs.Function,
      ReservedConcurrentExecutions: previousConcurrency.ReservedConcurrentExecutions ?? 1,
    });
    throw error;
  }
  try {
    await send(cfn, UpdateStackCommand, {
      StackName: stackName,
      TemplateURL: templateUrl,
      Parameters: parameters.map(([ParameterKey, ParameterValue]) => ({
        ParameterKey,
        ParameterValue,
      })),
      Capabilities: ['CAPABILITY_NAMED_IAM'],
    });
    await wait();
  } catch (e) {
    if (!String(e.message).includes('No updates are to be performed')) throw e;
  }
  const opened = await reopenOwned();
  if (opened?.busy)
    throw new Error(
      'Deployment finished but admission reopening is pending; resume this same deployment.',
    );
  if (!opened.reopened) throw new Error('Deployment maintenance ownership changed.');
  await send(control, PutFunctionConcurrencyCommand, {
    FunctionName: outputs.Function,
    ReservedConcurrentExecutions: 16,
  });
  const result = {
    account: defaults.account,
    region: defaults.region,
    pool: stackName,
    functionName: outputs.Function,
    bucket: outputs.Bucket,
    table: outputs.Table,
    hourlyMicroUsd,
    priceQuote: quote,
    storageMicroUsd: 2000000,
    capacity,
    warmSlots,
    subnetId: config.subnetId,
    imageId: config.imageId,
    expiresAt: Number(expires),
    authorizationRef: config.authorizationRef,
    ...(preservedEvidence ? { preservedQuarantine: preservedEvidence } : {}),
  };
  await mkdir(home, { recursive: true, mode: 0o700 });
  await json(join(home, 'pool.json'), result);
  console.log(JSON.stringify({ pool: result, buildDirectory: directory }, null, 2));
}
