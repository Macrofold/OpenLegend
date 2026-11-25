import { DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { GetCommandInvocationCommand, ListCommandsCommand } from '@aws-sdk/client-ssm';
import { digest, id, workerAffinity } from './contracts.mjs';
import { mapBounded } from './parallel.mjs';

const terminal = new Set(['Success', 'Failed', 'Cancelled', 'TimedOut']);

function verifyClaim({
  expected,
  worker,
  run,
  campaign,
  pool,
  campaignRuns = new Set([expected?.runId]),
}) {
  if (
    !expected ||
    !Number.isSafeInteger(expected.generation) ||
    expected.generation <= 0 ||
    !worker ||
    !run ||
    worker.state !== 'quarantined' ||
    worker.workerId !== expected.workerId ||
    worker.runId !== expected.runId ||
    worker.instanceId !== expected.instanceId ||
    worker.generation !== expected.generation ||
    run.runId !== expected.runId ||
    run.workerId !== expected.workerId ||
    run.generation !== expected.generation ||
    run.machine?.instanceId !== expected.instanceId ||
    run.phase !== 'failed' ||
    worker.leaseUntil > Date.now() ||
    !run.campaignId ||
    (expected.campaignId !== undefined && run.campaignId !== expected.campaignId) ||
    pool?.owners?.[worker.workerId] !== run.campaignId ||
    (worker.campaignId && worker.campaignId !== run.campaignId)
  )
    throw new Error('Preserved quarantine does not match its stopped failed claim.');
  if (
    campaign?.campaignId !== run.campaignId ||
    (!campaign.cancelledAt && !['completed', 'cancelled'].includes(campaign.phase)) ||
    (campaign.active ?? []).some((runId) => !campaignRuns.has(runId))
  )
    throw new Error('Preserved quarantine has a campaign that can still dispatch other work.');
  if (run.recoveryDispatch && !run.recoveryCommandId)
    throw new Error('Preserved quarantine has an unresolved recovery dispatch.');
}

async function stoppedPoolInstances({ instanceIds, poolName, ec2, send }) {
  const actual =
    (await send(ec2, DescribeInstancesCommand, { InstanceIds: instanceIds })).Reservations?.flatMap(
      (reservation) => reservation.Instances ?? [],
    ) ?? [];
  const byId = new Map(actual.map((instance) => [instance.InstanceId, instance]));
  if (
    actual.length !== instanceIds.length ||
    instanceIds.some((instanceId) => {
      const instance = byId.get(instanceId);
      return (
        instance?.State?.Name !== 'stopped' ||
        !instance.Tags?.some(
          (tag) => tag.Key === 'OpenLegendVerificationPool' && tag.Value === poolName,
        )
      );
    })
  )
    throw new Error('Preserved quarantine is not its stopped registered pool instance.');
  return byId;
}

async function terminalCommands({ run, ssm, send }) {
  const commandIds = [
    ...new Set(
      [run.commandId, run.recoveryCommandId, run.recoveryFailure?.commandId].filter(Boolean),
    ),
  ];
  if (!commandIds.length) throw new Error('Preserved quarantine has no command history to verify.');
  for (const CommandId of commandIds) {
    const invocation = await send(ssm, GetCommandInvocationCommand, {
      CommandId,
      InstanceId: run.machine.instanceId,
    });
    if (!terminal.has(invocation.Status))
      throw new Error('Preserved quarantine still has a nonterminal recorded SSM command.');
  }
  return commandIds;
}

function mayReach(command, instance) {
  const targets = command.Targets ?? [];
  const explicit = command.InstanceIds ?? [];
  return (
    explicit.includes(instance.InstanceId) ||
    explicit.includes('*') ||
    (!explicit.length && !targets.length) ||
    targets.some(({ Key, Values }) => {
      if (
        !Array.isArray(Values) ||
        !Values.length ||
        Values.some((value) => typeof value !== 'string' || /[*?]/.test(value))
      )
        return true;
      if (Key === 'InstanceIds') return Values.includes(instance.InstanceId);
      if (Key?.startsWith('tag:')) {
        const tag = instance.Tags?.find((tag) => tag.Key === Key.slice(4));
        return tag?.Value !== undefined && Values.includes(tag.Value);
      }
      // An unknown selector is uncertainty, not permission to ignore it.
      return true;
    })
  );
}

async function verifyNoPendingCommands({ instances, ssm, send }) {
  // Pending commands cannot be queried with InstanceId: they may not yet have
  // reached the host. Include project-wide pending/executing selections so an
  // unrecorded or tag-targeted delivery cannot race maintenance.
  for (const filter of [
    { key: 'ExecutionStage', value: 'Executing' },
    { key: 'Status', value: 'Pending' },
  ]) {
    let next;
    for (let page = 0; ; page++) {
      if (page === 10)
        throw new Error('Active SSM command census is incomplete; maintenance remains closed.');
      const value = await send(ssm, ListCommandsCommand, {
        Filters: [filter],
        MaxResults: 50,
        NextToken: next,
      });
      for (const command of value.Commands ?? [])
        if (
          !terminal.has(command.Status) &&
          instances.some((instance) => mayReach(command, instance))
        )
          throw new Error('An active or pending SSM command may reach the preserved quarantine.');
      next = value.NextToken;
      if (!next) break;
    }
  }
}

async function readManifest(run, key, getObject) {
  const manifest = await getObject(key);
  if (
    manifest?.runId !== run.runId ||
    manifest.generation !== run.generation ||
    !Array.isArray(manifest.files)
  )
    throw new Error('Preserved quarantine artifact identity is invalid.');
  return manifest;
}

/** Maintenance may preserve one already stopped, cancelled quarantine without
 * adopting its data, releasing its claim or settling its financial uncertainty.
 * docs/projects/verification-workers-tech-design.md#claim-and-execution-contract */
export async function quarantinedDeploymentEvidence({
  expected,
  worker,
  run,
  campaign,
  pool,
  poolName,
  ec2,
  ssm,
  send,
  getObject,
}) {
  verifyClaim({ expected, worker, run, campaign, pool });
  const instances = await stoppedPoolInstances({
    instanceIds: [worker.instanceId],
    poolName,
    ec2,
    send,
  });
  const commandIds = await terminalCommands({ run, ssm, send });
  await verifyNoPendingCommands({ instances: [...instances.values()], ssm, send });

  if (!run.artifacts) throw new Error('Preserved quarantine has no sealed artifact manifest.');
  const manifest = await readManifest(run, run.artifacts, getObject);
  const manifestHash = digest(manifest);
  let browserManifestHash = null,
    objects = manifest.files.length + 2;
  if (run.browserArtifacts) {
    const browser = await readManifest(run, run.browserArtifacts, getObject);
    browserManifestHash = digest(browser);
    objects += browser.files.length + 1;
  }
  const artifactSetHash = digest([manifestHash, browserManifestHash]);
  if (
    run.collection?.manifestHash !== manifestHash ||
    run.collection.artifactSetHash !== artifactSetHash ||
    run.collection.nextObject !== objects ||
    !run.collection.destination
  )
    throw new Error('Preserved quarantine artifacts are not completely acknowledged as collected.');
  return {
    ...expected,
    campaignId: run.campaignId,
    manifestHash,
    artifactSetHash,
    commandIds,
    observedAt: Date.now(),
  };
}

// DynamoDB maps have no field order. Preserve all fields and list order, and
// fail closed if a new non-JSON type needs its own stable representation.
function recordDigest(value) {
  function ordered(item) {
    if (Array.isArray(item)) return item.map(ordered);
    if (item && typeof item === 'object') {
      if (Object.getPrototypeOf(item) !== Object.prototype)
        throw new Error('Preserved quarantine contains an unsupported record value.');
      return Object.fromEntries(
        Object.keys(item)
          .sort()
          .map((key) => [key, ordered(item[key])]),
      );
    }
    return item;
  }
  return digest(ordered(value));
}

function volumeAttachments(instance) {
  const volumes = (instance.BlockDeviceMappings ?? []).map(({ DeviceName, Ebs }) => {
    if (!DeviceName || !Ebs?.VolumeId || Ebs.Status !== 'attached')
      throw new Error('Preserved quarantine has an unverified disk attachment.');
    return {
      deviceName: DeviceName,
      volumeId: Ebs.VolumeId,
      deleteOnTermination: Ebs.DeleteOnTermination,
      root: DeviceName === instance.RootDeviceName,
    };
  });
  if (instance.RootDeviceType !== 'ebs' || !volumes.some(({ root }) => root))
    throw new Error('Preserved quarantine has no attached root disk.');
  return volumes.sort((a, b) => a.deviceName.localeCompare(b.deviceName));
}

/** Read the exact stopped machine, verify its recorded SSM commands and check
 * the bounded project SSM census for pending commands targeting it. */
export async function stoppedQuarantineProof({
  expected,
  worker,
  run,
  campaign,
  pool,
  poolName,
  ec2,
  ssm,
  send,
}) {
  verifyClaim({ expected, worker, run, campaign, pool });
  const instances = await stoppedPoolInstances({
    instanceIds: [expected.instanceId],
    poolName,
    ec2,
    send,
  });
  const commandIds = await terminalCommands({ run, ssm, send });
  await verifyNoPendingCommands({ instances: [...instances.values()], ssm, send });
  return { commandIds, volumes: volumeAttachments(instances.get(expected.instanceId)) };
}

/** Controller-code-only maintenance preserves stopped disks and their claims
 * in place, including incomplete exports and unresolved spending.
 * docs/projects/verification-workers-tech-design.md#claim-and-execution-contract */
export async function quarantinesInPlaceEvidence({
  expected,
  pool,
  poolName,
  read,
  ec2,
  ssm,
  send,
  getJson,
}) {
  const workers = new Set();
  const runs = new Set();
  const instances = new Set();
  const campaignRuns = new Map();
  for (const { workerId, instanceId, runId, campaignId } of expected) {
    workerAffinity({ workerId, instanceId });
    id(runId);
    id(campaignId);
    if (workers.has(workerId) || instances.has(instanceId) || runs.has(runId))
      throw new Error('Preserved quarantines must name different slots, instances and runs.');
    workers.add(workerId);
    instances.add(instanceId);
    runs.add(runId);
    if (!campaignRuns.has(campaignId)) campaignRuns.set(campaignId, new Set());
    campaignRuns.get(campaignId).add(runId);
  }
  const owners = pool?.owners ?? {};
  if (
    (pool?.admittedCampaigns ?? 0) !== campaignRuns.size ||
    Object.keys(owners).length !== expected.length ||
    expected.some(({ workerId, campaignId }) => owners[workerId] !== campaignId)
  )
    throw new Error('Pool owners must match exactly the declared stopped quarantines.');
  if (!expected.length) return [];

  const observedInstances = await stoppedPoolInstances({
    instanceIds: [...instances],
    poolName,
    ec2,
    send,
  });
  await verifyNoPendingCommands({ instances: [...observedInstances.values()], ssm, send });
  return mapBounded(
    [...expected].sort((a, b) => a.workerId.localeCompare(b.workerId)),
    2, // Each worker can issue three reads against the shared AWS request limit.
    async (claim) => {
      const { workerId, runId, campaignId, instanceId, generation } = claim;
      const [worker, run, campaign] = await Promise.all([
        read(`worker:${workerId}`),
        read(`run:${runId}`),
        read(`campaign:${campaignId}`),
      ]);
      verifyClaim({
        expected: claim,
        worker,
        run,
        campaign,
        pool,
        campaignRuns: campaignRuns.get(campaignId),
      });
      const allocationKey = `allocation:${id(campaign.cloudAllocationId)}`;
      const allocation = await read(allocationKey);
      if (
        allocation?.pk !== allocationKey ||
        allocation.taskId !== campaign.taskId ||
        run.plan?.cloudAllocationId !== campaign.cloudAllocationId
      )
        throw new Error('Preserved quarantine has no matching spending record.');
      return {
        workerId,
        runId,
        generation,
        instanceId,
        campaignId,
        volumeAttachments: volumeAttachments(observedInstances.get(instanceId)),
        commandIds: (await terminalCommands({ run, ssm, send })).sort(),
        manifestHash: run.artifacts
          ? recordDigest(await readManifest(run, run.artifacts, getJson))
          : null,
        browserManifestHash: run.browserArtifacts
          ? recordDigest(await readManifest(run, run.browserArtifacts, getJson))
          : null,
        rowDigests: {
          worker: recordDigest(worker),
          run: recordDigest(run),
          campaign: recordDigest(campaign),
          allocation: recordDigest(allocation),
        },
      };
    },
  );
}
