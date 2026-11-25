// One physical profile per campaign keeps admission, slot reuse and settlement on
// the same priced machine; optional controlled-limit experiments are separate.
export const hardwareProfiles = Object.freeze({
  'm7i.xlarge': { id: 'H0', vcpus: 4, memoryMiB: 16384 },
  'm7i.2xlarge': { id: 'H1', vcpus: 8, memoryMiB: 32768 },
  'r7iz.xlarge': { id: 'H2', vcpus: 4, memoryMiB: 32768 },
});
function keys(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('A machine profile must be an object.');
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) throw new Error(`Unsupported machine field: ${key}`);
}
export function validateEnvironment(environment) {
  if (environment === undefined) return;
  keys(environment, ['instanceType', 'node', 'pnpm', 'imageId', 'priceQuote', 'nodeHeapMiB']);
  if (
    !Object.hasOwn(hardwareProfiles, environment.instanceType) ||
    environment.node !== '24.13.0' ||
    environment.pnpm !== '10.33.0'
  )
    throw new Error('Requested machine or toolchain is outside the supported pinned profiles.');
  if (environment.imageId !== undefined && !/^ami-[a-f0-9]{8,17}$/.test(environment.imageId))
    throw new Error('Invalid pinned machine image.');
  const quote = environment.priceQuote;
  if (quote !== undefined) {
    keys(quote, ['instanceType', 'hourlyUsd', 'observedAt', 'source']);
    if (
      quote.instanceType !== environment.instanceType ||
      !Number.isFinite(quote.hourlyUsd) ||
      quote.hourlyUsd <= 0 ||
      quote.hourlyUsd > 1000 ||
      typeof quote.observedAt !== 'string' ||
      !Number.isFinite(Date.parse(quote.observedAt)) ||
      typeof quote.source !== 'string' ||
      !quote.source ||
      quote.source.length > 2048
    )
      throw new Error(
        'Machine priceQuote must identify this Linux On-Demand type and observation.',
      );
  }
  if (environment.instanceType !== 'm7i.xlarge' && !quote)
    throw new Error('A nonstandard machine requires its own explicit priceQuote.');
  if (
    environment.nodeHeapMiB !== undefined &&
    (!Number.isSafeInteger(environment.nodeHeapMiB) ||
      environment.nodeHeapMiB < 128 ||
      environment.nodeHeapMiB > 12288)
  )
    throw new Error('Select one explicit 128–12288 MiB Node heap allowance across the comparison.');
}
export function selectedHardware(environment, config, fresh = false) {
  validateEnvironment(environment);
  const instanceType = environment?.instanceType ?? 'm7i.xlarge';
  const profile = hardwareProfiles[instanceType];
  const quote = environment?.priceQuote;
  if (fresh && quote) {
    const age = Date.now() - Date.parse(quote.observedAt);
    if (age < 0 || age > 86400000)
      throw new Error('Machine price observation must be within the preceding 24 hours.');
  }
  if (environment?.imageId && config.imageId && environment.imageId !== config.imageId)
    throw new Error('The requested image differs from the deployed prepared image.');
  const hourlyMicroUsd = quote ? Math.ceil((quote.hourlyUsd + 0.005) * 1e6) : config.hourlyMicroUsd;
  if (!Number.isSafeInteger(hourlyMicroUsd) || hourlyMicroUsd <= 0)
    throw new Error('A finite machine-specific hourly reservation is required.');
  return {
    ...profile,
    instanceType,
    hourlyMicroUsd,
    imageId: environment?.imageId ?? config.imageId,
    ...(quote ? { priceQuote: quote } : {}),
    ...(environment?.nodeHeapMiB ? { nodeHeapMiB: environment.nodeHeapMiB } : {}),
  };
}
// Persist selected facts, not SDK response objects: EC2 attachment timestamps
// are Date instances, which the coordination store cannot marshal as records.
export function observedMachine(instance) {
  return {
    instanceType: instance.InstanceType ?? null,
    imageId: instance.ImageId ?? null,
    cpuOptions: instance.CpuOptions
      ? {
          coreCount: instance.CpuOptions.CoreCount ?? null,
          threadsPerCore: instance.CpuOptions.ThreadsPerCore ?? null,
          amdSevSnp: instance.CpuOptions.AmdSevSnp ?? null,
        }
      : null,
    availabilityZone: instance.Placement?.AvailabilityZone ?? null,
    blockDevices:
      instance.BlockDeviceMappings?.map((mapping) => {
        const attachment = mapping.Ebs;
        const at = attachment?.AttachTime;
        return {
          deviceName: mapping.DeviceName ?? null,
          volumeId: attachment?.VolumeId ?? null,
          status: attachment?.Status ?? null,
          deleteOnTermination: attachment?.DeleteOnTermination ?? null,
          attachmentTimeISO:
            at instanceof Date && Number.isFinite(at.getTime()) ? at.toISOString() : null,
        };
      }) ?? null,
  };
}
// Coordination storage does not preserve object-key order. Hash only this fixed
// field order when the immutable manifest is compared with its admitted summary.
export function canonicalEnvironment(environment) {
  validateEnvironment(environment);
  if (!environment) return null;
  const quote = environment.priceQuote;
  return {
    instanceType: environment.instanceType,
    node: environment.node,
    pnpm: environment.pnpm,
    ...(environment.imageId ? { imageId: environment.imageId } : {}),
    ...(quote
      ? {
          priceQuote: {
            instanceType: quote.instanceType,
            hourlyUsd: quote.hourlyUsd,
            observedAt: quote.observedAt,
            source: quote.source,
          },
        }
      : {}),
    ...(environment.nodeHeapMiB ? { nodeHeapMiB: environment.nodeHeapMiB } : {}),
  };
}
export function campaignHardware(plan, config, fresh = false) {
  const environment = plan.jobs[0].environment;
  const first = selectedHardware(environment, config, fresh);
  const identity = JSON.stringify(canonicalEnvironment(environment));
  for (const job of plan.jobs) {
    if (JSON.stringify(canonicalEnvironment(job.environment)) !== identity)
      throw new Error(
        'Group one exact machine environment and price observation per managed campaign.',
      );
  }
  return first;
}

/** Callers supply only currently available, unowned registered slots. Preference
 * preserves matching caches, then uses empty capacity before retiring another
 * physical profile that a later comparison may still need. */
export function isRetainedWorker(worker, warmSlots) {
  const ordinal = Number(worker.workerId.slice(5));
  return Number.isSafeInteger(ordinal) && ordinal > 0 && ordinal <= warmSlots;
}
export function selectWorkers(available, hardware, concurrency, affinity, retention = {}) {
  const eligible = retention.required
    ? available.filter((worker) => isRetainedWorker(worker, retention.warmSlots))
    : available;
  const matches = (worker) =>
    worker.instanceId &&
    worker.instanceType === hardware.instanceType &&
    worker.imageId === hardware.imageId;
  if (affinity) {
    const worker = eligible.find(
      (candidate) =>
        candidate.workerId === affinity.workerId && candidate.instanceId === affinity.instanceId,
    );
    if (concurrency !== 1 || !worker || !matches(worker))
      throw new Error(
        'The exact registered worker/instance is unavailable or differs from the requested hardware/image.',
      );
    return [worker];
  }
  return [...eligible]
    .sort(
      (a, b) =>
        Number(Boolean(matches(b))) - Number(Boolean(matches(a))) ||
        Number(!b.instanceId) - Number(!a.instanceId) ||
        Number(a.workerId.slice(5)) - Number(b.workerId.slice(5)),
    )
    .slice(0, concurrency);
}
