import { getHeapStatistics } from 'node:v8';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

/** Non-timing startup calibration. The effective heap includes young space;
 * copying its byte value straight into --max-old-space-size would change it.
 * Two bounded, provider-free Node children establish and verify the setting.
 * This is called only by an authorized execution case, never the offline plan. */
export async function observeDefaultHeap() {
  const defaultNodeOptions = process.env.NODE_OPTIONS ?? null;
  const defaultHeapLimitBytes = getHeapStatistics().heap_size_limit;
  if (
    defaultNodeOptions !== null ||
    process.execArgv.some((value) => /max[-_]old[-_]space[-_]size/.test(value))
  )
    return {
      defaultNodeOptions,
      defaultHeapLimitBytes,
      nodeHeapMiB: null,
      explicitHeapLimitBytes: null,
      status: 'blocked',
      reason: 'H0 must record its unmodified default heap first.',
    };
  const execute = promisify(execFile);
  const probe = async (nodeHeapMiB: number) => {
    const result = await execute(
      process.execPath,
      [
        `--max-old-space-size=${nodeHeapMiB}`,
        '--input-type=module',
        '-e',
        "import{getHeapStatistics}from'node:v8';process.stdout.write(String(getHeapStatistics().heap_size_limit));",
      ],
      { timeout: 10000, maxBuffer: 1024, env: { ...process.env, NODE_OPTIONS: '' } },
    );
    const bytes = Number(result.stdout);
    if (!Number.isSafeInteger(bytes) || bytes <= 0)
      throw Error('Heap calibration returned no usable byte count.');
    return bytes;
  };
  try {
    const small = await probe(64),
      nodeHeapMiB = (defaultHeapLimitBytes - small) / 1048576 + 64;
    if (!Number.isSafeInteger(nodeHeapMiB) || nodeHeapMiB < 64 || nodeHeapMiB > 65536)
      throw Error('No exact bounded explicit heap setting.');
    const explicitHeapLimitBytes = await probe(nodeHeapMiB);
    return {
      defaultNodeOptions,
      defaultHeapLimitBytes,
      nodeHeapMiB,
      explicitHeapLimitBytes,
      status: explicitHeapLimitBytes === defaultHeapLimitBytes ? 'observed' : 'blocked',
      reason:
        explicitHeapLimitBytes === defaultHeapLimitBytes
          ? null
          : 'Explicit effective heap differs; hardware comparison remains blocked.',
    };
  } catch {
    return {
      defaultNodeOptions,
      defaultHeapLimitBytes,
      nodeHeapMiB: null,
      explicitHeapLimitBytes: null,
      status: 'blocked',
      reason: 'Exact default-to-explicit heap calibration was unavailable.',
    };
  }
}
