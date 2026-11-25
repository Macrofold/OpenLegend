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
  DescribeInstanceTypeOfferingsCommand,
} from '@aws-sdk/client-ec2';
import { clientOptions, send } from './aws.mjs';
import { selectedHardware, selectWorkers } from './hardware.mjs';
export async function preflight(
  config,
  concurrency,
  availableSlots,
  deadlineSeconds = 3600,
  environment,
  affinity,
  requireRetainedWorkers = false,
) {
  const hardware = selectedHardware(environment, config, true);
  if (!Number.isSafeInteger(config.capacity))
    throw new Error('Deploy the current campaign controller before running campaigns.');
  if (concurrency > config.capacity)
    throw new Error(
      `Requested ${concurrency} workers; configured capacity is ${config.capacity}. No jobs started.`,
    );
  if (!Array.isArray(availableSlots) || availableSlots.length < concurrency)
    throw new Error('The complete requested worker count is unavailable. No jobs started.');
  const selected = selectWorkers(availableSlots, hardware, concurrency, affinity, {
    required: requireRetainedWorkers,
    warmSlots: config.warmSlots ?? 2,
  });
  if (selected.length < concurrency)
    throw new Error(
      'The complete requested retained-worker capacity is unavailable. No jobs started.',
    );
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
  if (affinity) {
    const actual = instances.find((instance) => instance.InstanceId === affinity.instanceId);
    if (actual?.InstanceType !== hardware.instanceType || actual?.ImageId !== hardware.imageId)
      throw new Error(
        'The exact affinity instance no longer matches the requested hardware/image.',
      );
  }
  const standard = instances.filter(
    (i) => i.State.Name !== 'stopped' && /^[acdhimrtz]\d/.test(i.InstanceType),
  );
  const names = [...new Set([...standard.map((i) => i.InstanceType), hardware.instanceType])],
    cpus = new Map();
  let selectedType;
  for (let offset = 0; offset < names.length; offset += 100) {
    const page = await send(ec2, DescribeInstanceTypesCommand, {
      InstanceTypes: names.slice(offset, offset + 100),
    });
    for (const item of page.InstanceTypes) {
      cpus.set(item.InstanceType, item.VCpuInfo.DefaultVCpus);
      if (item.InstanceType === hardware.instanceType) selectedType = item;
    }
  }
  if (
    selectedType?.VCpuInfo.DefaultVCpus !== hardware.vcpus ||
    selectedType?.MemoryInfo.SizeInMiB !== hardware.memoryMiB ||
    !selectedType?.ProcessorInfo.SupportedArchitectures.includes('x86_64')
  )
    throw new Error('AWS machine description differs from the selected profile; no jobs started.');
  const occupied = standard.reduce((sum, i) => sum + cpus.get(i.InstanceType), 0);
  const selectedIds = new Set(selected.map((w) => w.instanceId).filter(Boolean));
  const reusable = standard.filter(
    (instance) =>
      selectedIds.has(instance.InstanceId) &&
      instance.InstanceType === hardware.instanceType &&
      instance.ImageId === config.imageId,
  ).length;
  const required = Math.max(0, concurrency - reusable) * hardware.vcpus;
  if (occupied + required > quota.Value)
    throw new Error(
      `Requested concurrency needs ${required} additional vCPUs; ${occupied}/${quota.Value} are occupied. No jobs started.`,
    );
  const subnet = (await send(ec2, DescribeSubnetsCommand, { SubnetIds: [config.subnetId] }))
    .Subnets[0];
  const offerings = await send(ec2, DescribeInstanceTypeOfferingsCommand, {
    LocationType: 'availability-zone',
    Filters: [
      { Name: 'instance-type', Values: [hardware.instanceType] },
      { Name: 'location', Values: [subnet.AvailabilityZone] },
    ],
  });
  if (!offerings.InstanceTypeOfferings?.length)
    throw new Error('Selected machine type is not offered in the worker subnet; no jobs started.');
  const byId = new Map(instances.map((instance) => [instance.InstanceId, instance]));
  const newHosts = selected.filter((w) => {
    const actual = byId.get(w.instanceId);
    return (
      !actual || actual.InstanceType !== hardware.instanceType || actual.ImageId !== config.imageId
    );
  }).length;
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
    hardware,
  };
}
