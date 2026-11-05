// Admission facts, not capacity assumptions. Read-only and rerun before a new campaign.
import {
  ServiceQuotasClient,
  GetServiceQuotaCommand,
  ListServiceQuotasCommand,
} from '@aws-sdk/client-service-quotas';
import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeInstanceTypesCommand,
  DescribeSubnetsCommand,
  DescribeImagesCommand,
  DescribeVolumesCommand,
} from '@aws-sdk/client-ec2';
import { clientOptions, send } from './aws.mjs';
export async function preflight(config, concurrency, availableSlots, deadlineSeconds = 3600) {
  if (!Number.isSafeInteger(config.capacity))
    throw new Error('Deploy the current campaign controller before running campaigns.');
  if (concurrency > config.capacity)
    throw new Error(
      `Requested ${concurrency} workers; configured capacity is ${config.capacity}. No jobs started.`,
    );
  if (!Array.isArray(availableSlots) || availableSlots.length < concurrency)
    throw new Error('The complete requested worker count is unavailable. No jobs started.');
  const selected = [...availableSlots]
    .sort((a, b) => Number(Boolean(b.instanceId)) - Number(Boolean(a.instanceId)))
    .slice(0, concurrency);
  const options = clientOptions(),
    ec2 = new EC2Client(options);
  const image = (await send(ec2, DescribeImagesCommand, { ImageIds: [config.imageId] })).Images[0];
  if (
    !image ||
    image.State !== 'available' ||
    image.Architecture !== 'x86_64' ||
    image.RootDeviceType !== 'ebs'
  )
    throw new Error('Selected worker image is unavailable; no jobs started.');
  const imageExpiry = Number(
    image.Tags?.find((tag) => tag.Key === 'OpenLegendImageExpiresAt')?.Value,
  );
  if (imageExpiry && imageExpiry < Date.now() + deadlineSeconds * 1000)
    throw new Error('Selected image expires before this campaign ends; no jobs started.');
  const quota = (
    await send(new ServiceQuotasClient(options), GetServiceQuotaCommand, {
      ServiceCode: 'ec2',
      QuotaCode: 'L-1216C47A',
    })
  ).Quota;
  let instances = [],
    next;
  do {
    const page = await send(ec2, DescribeInstancesCommand, {
      Filters: [
        { Name: 'instance-state-name', Values: ['pending', 'running', 'stopping', 'stopped'] },
      ],
      NextToken: next,
    });
    instances.push(...(page.Reservations ?? []).flatMap((r) => r.Instances ?? []));
    next = page.NextToken;
  } while (next);
  const standard = instances.filter(
    (i) => i.State.Name !== 'stopped' && /^[acdhimrtz]\d/.test(i.InstanceType),
  );
  const names = [...new Set(standard.map((i) => i.InstanceType))],
    cpus = new Map();
  for (let offset = 0; offset < names.length; offset += 100) {
    const page = await send(ec2, DescribeInstanceTypesCommand, {
      InstanceTypes: names.slice(offset, offset + 100),
    });
    for (const item of page.InstanceTypes) cpus.set(item.InstanceType, item.VCpuInfo.DefaultVCpus);
  }
  const occupied = standard.reduce((sum, i) => sum + cpus.get(i.InstanceType), 0);
  const selectedIds = new Set(selected.map((w) => w.instanceId).filter(Boolean));
  const reusable = standard.filter((instance) => selectedIds.has(instance.InstanceId)).length;
  const required = Math.max(0, concurrency - reusable) * 4;
  if (occupied + required > quota.Value)
    throw new Error(
      `Requested concurrency needs ${required} additional vCPUs; ${occupied}/${quota.Value} are occupied. No jobs started.`,
    );
  const subnet = (await send(ec2, DescribeSubnetsCommand, { SubnetIds: [config.subnetId] }))
    .Subnets[0];
  const newHosts = selected.filter((w) => !w.instanceId).length;
  if (subnet.AvailableIpAddressCount < newHosts)
    throw new Error('Subnet cannot fit the requested workers. No jobs started.');
  const quotas = new ServiceQuotasClient(options);
  let gp3, nextQuota;
  do {
    const page = await send(quotas, ListServiceQuotasCommand, {
      ServiceCode: 'ebs',
      NextToken: nextQuota,
    });
    gp3 = page.Quotas.find((q) => /Storage.*General Purpose SSD.*gp3/i.test(q.QuotaName));
    nextQuota = page.NextToken;
  } while (!gp3 && nextQuota);
  if (!gp3 || !Number.isFinite(gp3.Value))
    throw new Error('The applied gp3 storage quota is unavailable; no jobs started.');
  let usedGiB = 0,
    volumeToken;
  do {
    const page = await send(ec2, DescribeVolumesCommand, {
      Filters: [{ Name: 'volume-type', Values: ['gp3'] }],
      NextToken: volumeToken,
      MaxResults: 100,
    });
    usedGiB += page.Volumes.reduce((sum, volume) => sum + volume.Size, 0);
    volumeToken = page.NextToken;
  } while (volumeToken);
  if (usedGiB + newHosts * 64 > gp3.Value * 1024)
    throw new Error(
      'The gp3 storage quota cannot cover the complete requested fleet; no jobs started.',
    );
  return {
    at: new Date().toISOString(),
    requestedConcurrency: concurrency,
    vcpuQuota: quota.Value,
    occupiedVcpus: occupied,
    additionalVcpus: required,
    gp3QuotaTiB: gp3.Value,
    gp3OccupiedGiB: usedGiB,
    newHosts,
    availableSubnetIps: subnet.AvailableIpAddressCount,
  };
}
