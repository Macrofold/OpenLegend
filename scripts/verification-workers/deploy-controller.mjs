import {
  CloudFormationClient,
  CreateChangeSetCommand,
  DeleteChangeSetCommand,
  DescribeChangeSetCommand,
  DescribeStackEventsCommand,
  DescribeStacksCommand,
  ExecuteChangeSetCommand,
} from '@aws-sdk/client-cloudformation';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetCommand, QueryCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { EC2Client } from '@aws-sdk/client-ec2';
import {
  LambdaClient,
  GetFunctionConfigurationCommand,
  GetFunctionConcurrencyCommand,
  InvokeCommand,
  PutFunctionConcurrencyCommand,
} from '@aws-sdk/client-lambda';
import { SSMClient } from '@aws-sdk/client-ssm';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { isDeepStrictEqual } from 'node:util';
import { clientOptions, send } from './aws.mjs';
import { download, getJson, upload } from './artifacts.mjs';
import { defaults, id, integer, workerAffinity } from './contracts.mjs';
import { coordination } from './coordination.mjs';
import { buildWorkerBundle } from './deploy.mjs';
import { hashFile, json } from './files.mjs';
import { mapBounded } from './parallel.mjs';
import { quarantinesInPlaceEvidence } from './quarantine.mjs';

const bundleKey = (hash) => `control/controller-${hash}.mjs`;
const bundleVariables = new Map([
  ['BundleKey', 'BUNDLE_KEY'],
  ['BundleDigest', 'BUNDLE_DIGEST'],
]);
const pairs = (entries, key, value) => Object.fromEntries(entries.map((x) => [x[key], x[value]]));
const parameters = (stack) => pairs(stack.Parameters, 'ParameterKey', 'ParameterValue');
const outputs = (stack) => pairs(stack.Outputs, 'OutputKey', 'OutputValue');
const stableStack = new Set(['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE']);

export function validateControllerChangeSet(changeSet) {
  const [resource] = changeSet.Changes ?? [];
  const change = resource?.ResourceChange;
  if (
    changeSet.NextToken ||
    changeSet.Changes?.length !== 1 ||
    resource?.Type !== 'Resource' ||
    change?.LogicalResourceId !== 'Controller' ||
    change.ResourceType !== 'AWS::Lambda::Function' ||
    change.Action !== 'Modify' ||
    change.Replacement !== 'False' ||
    !isDeepStrictEqual(change.Scope, ['Properties']) ||
    !change.Details?.length ||
    change.Details.some(
      ({ Target, ChangeSource, CausingEntity, Evaluation }) =>
        Target?.Attribute !== 'Properties' ||
        Target.Name !== 'Environment' ||
        (Target.Path &&
          !/^\/Properties\/Environment(?:\/Variables(?:\/BUNDLE_(?:KEY|DIGEST))?)?$/.test(
            Target.Path,
          )) ||
        (ChangeSource === 'ParameterReference' &&
          Target.Path?.includes('/BUNDLE_') &&
          !Target.Path.endsWith(`/${bundleVariables.get(CausingEntity)}`)) ||
        !(
          (ChangeSource === 'ParameterReference' && bundleVariables.has(CausingEntity)) ||
          (ChangeSource === 'DirectModification' && Evaluation === 'Dynamic' && !CausingEntity)
        ),
    ) ||
    !change.Details.some(({ ChangeSource }) => ChangeSource === 'ParameterReference')
  )
    throw new Error('AWS did not propose a bundle-only edit of the existing controller.');
}

async function poll(read, wait, description) {
  for (let attempt = 0; attempt < 90; attempt++) {
    const result = await read();
    if (result) return result;
    await wait(4000);
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

export async function deployControllerOnly(configPath, overrides = {}) {
  const cloud = overrides.send ?? send;
  const wait = overrides.delay ?? delay;
  const config = await json(configPath);
  const stackName = config.stackName ?? 'openlegend-verification';
  const previousDigest = config.expectedBundleDigest;
  const expected = config.preservedQuarantines;
  if (
    !/^[a-zA-Z][a-zA-Z0-9-]{0,39}$/.test(stackName) ||
    !/^[a-f0-9]{64}$/.test(previousDigest) ||
    typeof config.authorizationRef !== 'string' ||
    !config.authorizationRef.trim() ||
    !Array.isArray(expected) ||
    expected.length > 128
  )
    throw new Error(
      'Controller deployment requires authorization, a current bundle digest and exact quarantines.',
    );
  for (const { workerId, instanceId, runId, generation, campaignId } of expected) {
    workerAffinity({ workerId, instanceId });
    id(runId);
    id(campaignId);
    integer(generation, 'quarantine generation', 1, Number.MAX_SAFE_INTEGER);
  }

  const options = clientOptions();
  const identity = await cloud(new STSClient(options), GetCallerIdentityCommand, {});
  if (identity.Account !== defaults.account) throw new Error('Refusing another AWS project.');
  const cfn = new CloudFormationClient(options);
  const lambda = new LambdaClient(options);
  const ec2 = new EC2Client(options);
  const ssm = new SSMClient(options);
  const db = DynamoDBDocumentClient.from(new DynamoDBClient(options));
  const describeStack = async () =>
    (await cloud(cfn, DescribeStacksCommand, { StackName: stackName })).Stacks[0];
  const base = await describeStack();
  const before = parameters(base);
  const stackOutputs = outputs(base);
  const { Bucket, Table } = stackOutputs;
  const FunctionName = stackOutputs.Function;
  if (
    !stableStack.has(base.StackStatus) ||
    before.BundleDigest !== previousDigest ||
    before.BundleKey !== bundleKey(previousDigest) ||
    !Bucket ||
    !Table ||
    !FunctionName
  )
    throw new Error('The live stack does not match the expected controller release.');
  const stackId = base.StackId;
  const describeFunction = () => cloud(lambda, GetFunctionConfigurationCommand, { FunctionName });
  const functionBefore = await describeFunction();
  const env = functionBefore.Environment?.Variables;
  const live = JSON.parse(env?.WORKER_CONFIG ?? '{}');
  const capacity = integer(live.capacity, 'deployed pool capacity', 1, 128);
  const timeout = integer(functionBefore.Timeout, 'deployed controller timeout', 1, 900);
  if (
    functionBefore.State !== 'Active' ||
    functionBefore.LastUpdateStatus !== 'Successful' ||
    env.BUNDLE_KEY !== before.BundleKey ||
    env.BUNDLE_DIGEST !== previousDigest ||
    env.BUCKET !== Bucket ||
    live.pool !== stackName ||
    live.bucket !== Bucket ||
    live.table !== Table ||
    live.functionName !== FunctionName ||
    expected.some(({ workerId }) => Number(workerId.slice(5)) > capacity)
  )
    throw new Error('The live Lambda does not match this worker pool and its bundle.');
  const readConcurrency = async () =>
    (await cloud(lambda, GetFunctionConcurrencyCommand, { FunctionName }))
      .ReservedConcurrentExecutions;
  const previousConcurrency = integer(
    await readConcurrency(),
    'active controller reservation',
    1,
    Number.MAX_SAFE_INTEGER,
  );

  const metadata = coordination({ db, table: Table, send: cloud });
  const read = async (pk) =>
    (await cloud(db, GetCommand, { TableName: Table, Key: { pk }, ConsistentRead: true })).Item;
  const preservedWorkers = new Set(expected.map(({ workerId }) => workerId));
  const preservedCampaigns = new Set(expected.map(({ campaignId }) => `campaign:${campaignId}`));
  const token = `controller-${randomUUID()}`;
  async function inspectPool(closure) {
    const pool = await read('pool');
    if (pool?.admissionClosed !== closure)
      throw new Error('Another operation owns the pool admission closure.');
    const queued = await cloud(db, QueryCommand, {
      TableName: Table,
      IndexName: 'group-order',
      KeyConditionExpression: '#group = :queue',
      ExpressionAttributeNames: { '#group': 'group' },
      ExpressionAttributeValues: { ':queue': 'queue' },
      ProjectionExpression: 'pk',
      Limit: preservedCampaigns.size + 1,
    });
    if (queued.LastEvaluatedKey || queued.Items?.some(({ pk }) => !preservedCampaigns.has(pk)))
      throw new Error('Another campaign is still queued.');
    await mapBounded(
      Array.from({ length: capacity }, (_, index) => `slot-${index + 1}`).filter(
        (workerId) => !preservedWorkers.has(workerId),
      ),
      8,
      async (workerId) => {
        const worker = await read(`worker:${workerId}`);
        if (
          worker &&
          (worker.runId ||
            worker.campaignId ||
            worker.imageBuildId ||
            !['available', 'empty'].includes(worker.state))
        )
          throw new Error(`${workerId} still has worker lifecycle activity.`);
      },
    );
    const quarantines = await quarantinesInPlaceEvidence({
      expected,
      pool,
      poolName: stackName,
      read,
      ec2,
      ssm,
      send: cloud,
      getJson: (key) => (overrides.getJson ?? getJson)(Bucket, key),
    });
    return { pool, quarantines };
  }

  const preflight = await inspectPool(undefined);
  const directory = await mkdtemp(join(tmpdir(), 'ol-controller-deploy-'));
  let changeSetId, closureRequested, closed, pauseRequested, executeRequested, rolledBack;
  async function release() {
    if (pauseRequested && (await readConcurrency()) !== previousConcurrency) {
      await cloud(lambda, PutFunctionConcurrencyCommand, {
        FunctionName,
        ReservedConcurrentExecutions: previousConcurrency,
      });
      if ((await readConcurrency()) !== previousConcurrency)
        throw new Error('Controller concurrency restoration is unconfirmed.');
    }
    try {
      await poll(
        async () => {
          const result = await metadata.lock('pool', async () => {
            const pool = await read('pool');
            if (pool?.admissionClosed !== token)
              throw new Error('This deployment no longer owns the pool admission closure.');
            // Keep all current pool records. This deployment owns only its admission marker.
            delete pool.admissionClosed;
            await metadata.transact([{ Put: { TableName: Table, Item: pool } }]);
            return true;
          });
          return result === true;
        },
        wait,
        'admission lock release',
      );
      closed = false;
    } catch (error) {
      // The write may have committed even when its receipt was lost.
      const owner = (await read('pool'))?.admissionClosed;
      closed = owner === token;
      if (owner) throw error;
    }
  }
  try {
    const path = await (overrides.buildWorkerBundle ?? buildWorkerBundle)('controller', directory);
    const nextDigest = await hashFile(path);
    if (nextDigest === previousDigest)
      throw new Error('This controller bundle is already deployed.');
    const next = { ...before, BundleKey: bundleKey(nextDigest), BundleDigest: nextDigest };
    const uploadBundle = overrides.upload ?? upload;
    const downloadBundle = overrides.download ?? download;
    for (const [key, hash] of [
      [before.BundleKey, previousDigest],
      [next.BundleKey, nextDigest],
    ]) {
      if (hash === nextDigest) {
        try {
          await uploadBundle(Bucket, key, path, false, true);
        } catch (error) {
          if (error.name !== 'PreconditionFailed') throw error;
        }
      }
      const copy = join(directory, hash);
      await downloadBundle(Bucket, key, copy, 32 * 1024 ** 2);
      if ((await hashFile(copy)) !== hash)
        throw new Error('Staged controller bundle checksum differs.');
    }
    const created = await cloud(cfn, CreateChangeSetCommand, {
      StackName: stackId,
      ChangeSetName: token,
      ChangeSetType: 'UPDATE',
      UsePreviousTemplate: true,
      Capabilities: base.Capabilities,
      Parameters: Object.keys(before).map((ParameterKey) =>
        bundleVariables.has(ParameterKey)
          ? { ParameterKey, ParameterValue: next[ParameterKey] }
          : { ParameterKey, UsePreviousValue: true },
      ),
      ClientToken: token,
      Description: config.authorizationRef,
    });
    changeSetId = created.Id;
    const plan = await poll(
      async () => {
        const planned = await cloud(cfn, DescribeChangeSetCommand, { ChangeSetName: changeSetId });
        if (planned.Status === 'FAILED') throw new Error(planned.StatusReason);
        return planned.Status === 'CREATE_COMPLETE' && planned;
      },
      wait,
      'the controller change set',
    );
    validateControllerChangeSet(plan);
    if (
      plan.StackId !== stackId ||
      plan.ExecutionStatus !== 'AVAILABLE' ||
      plan.Changes[0].ResourceChange.PhysicalResourceId !== FunctionName
    )
      throw new Error(
        'The controller change set targets another function or is no longer available.',
      );

    console.error(
      `Controller deployment ${token}: acquiring admission closure for ${changeSetId}.`,
    );
    const acquired = await metadata.lock('pool', async () => {
      const current = await read('pool');
      if (!isDeepStrictEqual(current, preflight.pool))
        throw new Error('Worker allocation changed during deployment preflight.');
      closureRequested = true;
      await metadata.transact([
        { Put: { TableName: Table, Item: { pk: 'pool', ...current, admissionClosed: token } } },
      ]);
      return true;
    });
    if (acquired !== true) throw new Error('Another operation holds the pool allocation lock.');
    closed = true;
    console.error(`Controller deployment ${token}: admission closed.`);
    if ((await readConcurrency()) !== previousConcurrency)
      throw new Error('Controller concurrency changed during deployment preflight.');
    pauseRequested = true;
    await cloud(lambda, PutFunctionConcurrencyCommand, {
      FunctionName,
      ReservedConcurrentExecutions: 0,
    });
    await wait((timeout + 1) * 1000);

    const frozen = await inspectPool(token);
    if (!isDeepStrictEqual(frozen.quarantines, preflight.quarantines))
      throw new Error('Quarantine evidence changed before the update.');
    const current = await describeStack();
    if (
      current.StackStatus !== base.StackStatus ||
      current.StackId !== stackId ||
      !isDeepStrictEqual(current.LastUpdatedTime, base.LastUpdatedTime) ||
      !isDeepStrictEqual(parameters(current), before) ||
      (await readConcurrency()) !== 0
    )
      throw new Error('Stack or controller settings changed during deployment preflight.');

    executeRequested = true;
    console.error(`Controller deployment ${token}: applying the verified bundle change.`);
    await cloud(cfn, ExecuteChangeSetCommand, {
      ChangeSetName: changeSetId,
      ClientRequestToken: token,
      DisableRollback: false,
    });
    const outcome = await poll(
      async () => {
        const events = await cloud(cfn, DescribeStackEventsCommand, { StackName: stackId });
        return events.StackEvents.find(
          (event) =>
            event.ClientRequestToken === token &&
            event.PhysicalResourceId === stackId &&
            ['UPDATE_COMPLETE', 'UPDATE_ROLLBACK_COMPLETE', 'UPDATE_ROLLBACK_FAILED'].includes(
              event.ResourceStatus,
            ),
        )?.ResourceStatus;
      },
      wait,
      'the execution result for this exact change set',
    );
    const deployed = await describeStack();
    const updatedFunction = await describeFunction();
    const observed = await inspectPool(token);
    const unchanged = isDeepStrictEqual(observed, frozen);
    const stopped = (await readConcurrency()) === 0;
    const bundle = outcome === 'UPDATE_COMPLETE' ? next : before;
    const verified =
      unchanged &&
      stopped &&
      deployed.StackStatus === outcome &&
      deployed.StackId === stackId &&
      isDeepStrictEqual(outputs(deployed), outputs(base)) &&
      isDeepStrictEqual(parameters(deployed), bundle) &&
      updatedFunction.State === 'Active' &&
      updatedFunction.LastUpdateStatus === 'Successful' &&
      updatedFunction.CodeSha256 === functionBefore.CodeSha256 &&
      isDeepStrictEqual(updatedFunction.Environment?.Variables, {
        ...env,
        BUNDLE_KEY: bundle.BundleKey,
        BUNDLE_DIGEST: bundle.BundleDigest,
      });
    if (!verified)
      throw new Error(
        'Stack, controller settings or preserved worker evidence differs after rollout.',
      );
    if (outcome !== 'UPDATE_COMPLETE') {
      rolledBack = outcome === 'UPDATE_ROLLBACK_COMPLETE';
      throw new Error(`Controller update ended in ${outcome}.`);
    }

    await cloud(lambda, PutFunctionConcurrencyCommand, {
      FunctionName,
      ReservedConcurrentExecutions: previousConcurrency,
    });
    if ((await readConcurrency()) !== previousConcurrency)
      throw new Error('Controller concurrency restoration is unconfirmed.');
    const health = await poll(
      async () => {
        try {
          const response = await cloud(
            lambda,
            InvokeCommand,
            {
              FunctionName,
              Payload: Buffer.from(JSON.stringify({ action: 'health', includeSlots: true })),
            },
            70_000,
          );
          if (response.FunctionError)
            throw new Error('New controller did not load its checked bundle.');
          const value = JSON.parse(Buffer.from(response.Payload).toString());
          if (
            !value.ready ||
            !value.admissionClosed ||
            value.config?.pool !== stackName ||
            value.config?.table !== Table ||
            value.config?.bucket !== Bucket ||
            value.config?.functionName !== FunctionName
          )
            throw new Error('New controller health does not match the closed worker pool.');
          return value;
        } catch (error) {
          if (error.name !== 'TooManyRequestsException') throw error;
        }
      },
      wait,
      'the updated controller health check',
    );
    await release();
    return {
      stackName,
      changeSetId,
      previousDigest,
      controllerDigest: nextDigest,
      quarantines: observed.quarantines,
      availableSlots: health.availableSlots,
    };
  } catch (error) {
    if (closureRequested && !closed) {
      try {
        closed = (await read('pool'))?.admissionClosed === token;
      } catch (readError) {
        throw new AggregateError(
          [error, readError],
          `Controller deployment ${token} could not confirm admission ownership.`,
        );
      }
    }
    if (closed && (!executeRequested || rolledBack)) {
      try {
        await release();
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          `Controller deployment ${token} could not reopen admission.`,
        );
      }
    }
    if (closed && executeRequested && !rolledBack) {
      try {
        if ((await readConcurrency()) !== 0) {
          await cloud(lambda, PutFunctionConcurrencyCommand, {
            FunctionName,
            ReservedConcurrentExecutions: 0,
          });
          if ((await readConcurrency()) !== 0) throw new Error('Controller pause is unconfirmed.');
        }
      } catch (pauseError) {
        throw new AggregateError(
          [error, pauseError],
          `Controller deployment ${token} left admission closed but could not confirm the controller pause.`,
        );
      }
    }
    if (closed)
      throw new Error(`Controller deployment ${token} left admission closed. ${error.message}`, {
        cause: error,
      });
    throw error;
  } finally {
    try {
      if (changeSetId && !executeRequested)
        await cloud(cfn, DeleteChangeSetCommand, { ChangeSetName: changeSetId });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
