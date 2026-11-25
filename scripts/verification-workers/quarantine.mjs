import { DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { GetCommandInvocationCommand, ListCommandsCommand } from '@aws-sdk/client-ssm';
import { digest } from './contracts.mjs';

const terminal = new Set(['Success', 'Failed', 'Cancelled', 'TimedOut']);

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
    pool?.owners?.[worker.workerId] !== run.campaignId ||
    (worker.campaignId && worker.campaignId !== run.campaignId)
  )
    throw new Error('Preserved quarantine does not match its stopped failed claim.');
  if (
    campaign?.campaignId !== run.campaignId ||
    (!campaign.cancelledAt && !['completed', 'cancelled'].includes(campaign.phase)) ||
    (campaign.active ?? []).some((runId) => runId !== run.runId)
  )
    throw new Error('Preserved quarantine has a campaign that can still dispatch other work.');
  if (run.recoveryDispatch && !run.recoveryCommandId)
    throw new Error('Preserved quarantine has an unresolved recovery dispatch.');

  const actual =
    (
      await send(ec2, DescribeInstancesCommand, { InstanceIds: [worker.instanceId] })
    ).Reservations?.flatMap((reservation) => reservation.Instances ?? []) ?? [];
  const instance = actual[0];
  if (
    actual.length !== 1 ||
    instance?.InstanceId !== expected.instanceId ||
    instance.State?.Name !== 'stopped' ||
    !instance.Tags?.some(
      (tag) => tag.Key === 'OpenLegendVerificationPool' && tag.Value === poolName,
    )
  )
    throw new Error('Preserved quarantine is not its stopped registered pool instance.');
  const commandIds = [
    ...new Set(
      [run.commandId, run.recoveryCommandId, run.recoveryFailure?.commandId].filter(Boolean),
    ),
  ];
  if (!commandIds.length) throw new Error('Preserved quarantine has no command history to verify.');
  for (const CommandId of commandIds) {
    const invocation = await send(ssm, GetCommandInvocationCommand, {
      CommandId,
      InstanceId: worker.instanceId,
    });
    if (!terminal.has(invocation.Status))
      throw new Error('Preserved quarantine still has a nonterminal recorded SSM command.');
  }
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
      for (const command of value.Commands ?? []) {
        if (terminal.has(command.Status)) continue;
        const targets = command.Targets ?? [];
        const explicit = command.InstanceIds ?? [];
        const matches = (target) => {
          if (!Array.isArray(target.Values) || !target.Values.length) return true;
          if (target.Values.includes('*')) return true;
          if (target.Key === 'InstanceIds') return target.Values?.includes(worker.instanceId);
          if (target.Key === 'AWS::EC2::Instance') return true;
          if (target.Key?.startsWith('tag:')) {
            const value = instance.Tags?.find((tag) => tag.Key === target.Key.slice(4))?.Value;
            return value !== undefined && target.Values?.includes(value);
          }
          // An unknown selector is uncertainty, not permission to ignore it.
          return true;
        };
        if (
          explicit.includes(worker.instanceId) ||
          explicit.includes('*') ||
          (!explicit.length && !targets.length) ||
          targets.some(matches)
        )
          throw new Error('An active or pending SSM command may reach the preserved quarantine.');
      }
      next = value.NextToken;
      if (!next) break;
    }
  }

  if (!run.artifacts) throw new Error('Preserved quarantine has no sealed artifact manifest.');
  const manifest = await getObject(run.artifacts);
  if (
    manifest.runId !== run.runId ||
    manifest.generation !== run.generation ||
    !Array.isArray(manifest.files)
  )
    throw new Error('Preserved quarantine artifact identity is invalid.');
  const manifestHash = digest(manifest);
  let browserManifestHash = null,
    objects = manifest.files.length + 2;
  if (run.browserArtifacts) {
    const browser = await getObject(run.browserArtifacts);
    if (
      browser.runId !== run.runId ||
      browser.generation !== run.generation ||
      !Array.isArray(browser.files)
    )
      throw new Error('Preserved quarantine browser artifact identity is invalid.');
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
