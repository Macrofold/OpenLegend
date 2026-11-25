// Verify the claimed machine before any admitted case starts. This reads actual
// hardware; it does not apply experimental CPU/memory limits.
import { readFile } from 'node:fs/promises';
import { arch, release } from 'node:os';
import { exec } from './process.mjs';
import { hardwareProfiles } from './hardware.mjs';

export async function verifyMachine(job) {
  const expected = hardwareProfiles[job.machine.instanceType];
  if (!Object.hasOwn(hardwareProfiles, job.machine.instanceType) || arch() !== 'x64')
    throw new Error('Actual worker architecture/profile differs.');
  const parsed = (await exec('lscpu', ['-p=CPU,CORE,SOCKET,ONLINE'])).stdout
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(','))
    .filter((row) => row[3] === 'Y');
  const cpus = parsed.map((row) => Number(row[0]));
  const cores = new Map();
  for (const row of parsed) {
    const key = `${row[2]}:${row[1]}`;
    if (!cores.has(key)) cores.set(key, []);
    cores.get(key).push(Number(row[0]));
  }
  const memory = await readFile('/proc/meminfo', 'utf8');
  const memoryMiB = Number(/^MemTotal:\s+(\d+) kB$/m.exec(memory)?.[1]) / 1024;
  if (
    cpus.length !== expected.vcpus ||
    cpus.some((cpu) => !Number.isSafeInteger(cpu)) ||
    !Number.isFinite(memoryMiB) ||
    memoryMiB < expected.memoryMiB * 0.9 ||
    memoryMiB > expected.memoryMiB * 1.05
  )
    throw new Error('Actual online CPU/RAM differs from the admitted machine.');
  return {
    ...expected,
    instanceType: job.machine.instanceType,
    imageId: job.machine.imageId,
    architecture: arch(),
    kernel: release(),
    cpuModel: await readFile('/proc/cpuinfo', 'utf8'),
    memoryMiB,
    cpus,
    cores: [...cores.values()],
    affinity:
      (await readFile('/proc/self/status', 'utf8')).match(/^Cpus_allowed_list:\s+(.+)$/m)?.[1] ??
      null,
    observedAt: Date.now(),
  };
}
