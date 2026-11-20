import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { containedFile, jsonFile, object, writeJson } from './contract.js';

const frameCount = 32;
const recordBytes = 16 + frameCount * 8;
const sampleLimit = 120_000;

function add(counts: Map<string, number>, key: string) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}
function ranked(counts: Map<string, number>, total: number) {
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([site, samples]) => ({
      site,
      samples,
      shareOfSteadySamples: total ? samples / total : null,
    }));
}

/** Reduces the retained bounded address-only Linux sampler format. Uses
 * one leaf bucket per sample and deduplicates inclusive sites per stack.
 */
export async function writeCpuEvidence(directory: string, raw: Record<string, unknown>) {
  const profile = object(await jsonFile(directory, 'symbols.json', 64 * 1024 ** 2));
  const symbols = object(profile.symbols);
  const file = await containedFile(directory, 'stacks.bin', recordBytes * sampleLimit);
  const data = await readFile(file.path);
  if (data.length % recordBytes || data.length / recordBytes !== profile.sampleCount)
    throw new Error('Truncated or mismatched CPU evidence.');
  const steady = object(raw.steady);
  const from = object(steady.start).boundaryAt;
  const until = object(steady.end).boundaryAt;
  if (typeof from !== 'number' || typeof until !== 'number' || !(until > from))
    throw new Error('The CPU sampler needs both measured steady boundaries.');
  const footer = await readFile(
    (await containedFile(directory, 'server.log', 1024 ** 2)).path,
    'utf8',
  );
  const matches = [
    ...footer.matchAll(
      /^OL_CPU_PROFILE threads=(\d+) timerErrors=(\d+) count=(\d+) dropped=(\d+) overruns=(\d+)$/gm,
    ),
  ];
  if (matches.length !== 1) throw new Error('Missing unique CPU sampler shutdown receipt.');
  const [, threads, timerErrors, attempted, dropped, overruns] = matches[0]!.map(Number);
  const leaf = new Map<string, number>();
  const inclusive = new Map<string, number>();
  const tids = new Set<number>();
  let steadySamples = 0;
  let unresolved = 0;
  let truncated = 0;
  for (let offset = 0; offset < data.length; offset += recordBytes) {
    const realtimeMs = Number(data.readBigUInt64LE(offset) / 1000n) / 1000;
    if (realtimeMs < from || realtimeMs >= until) continue;
    steadySamples++;
    tids.add(data.readUInt32LE(offset + 8));
    const depth = data.readUInt32LE(offset + 12);
    if (depth < 1 || depth > frameCount) throw new Error('Invalid address-only CPU stack depth.');
    if (depth === frameCount) truncated++;
    const frames = new Set<string>();
    for (let index = 0; index < depth; index++) {
      const pc = data.readBigUInt64LE(offset + 16 + index * 8).toString();
      const entry = symbols[pc];
      const sites =
        Array.isArray(entry) && Array.isArray(entry[2])
          ? entry[2].filter((name: unknown): name is string => typeof name === 'string')
          : [];
      const resolved: string[] = [];
      for (let at = 0; at + 1 < sites.length; at += 2) {
        if (sites[at] !== '??') resolved.push(sites[at] + ' @ ' + sites[at + 1]);
      }
      const library =
        Array.isArray(entry) && typeof entry[0] === 'string' && entry[0] !== profile.executable
          ? basename(entry[0])
          : null;
      const bucket = resolved[0] ?? (library ? '[library] ' + library : '[unresolved]');
      if (index === 0) {
        add(leaf, bucket);
        if (bucket === '[unresolved]') unresolved++;
      }
      for (const site of resolved.length ? resolved : [bucket]) frames.add(site);
    }
    for (const site of frames) add(inclusive, site);
  }
  const coverage = {
    observedThreads: threads,
    threadsWithSteadySamples: tids.size,
    timerErrors,
    attempted,
    dropped,
    overruns,
    capLost: Math.max(0, attempted! - sampleLimit),
    unresolved,
    truncated,
    steadySamples,
  };
  const complete =
    steadySamples > 0 &&
    timerErrors === 0 &&
    dropped === 0 &&
    overruns === 0 &&
    coverage.capLost === 0;
  await writeJson(join(directory, 'cpu-samples.json'), {
    status: complete ? 'sampled' : 'incomplete',
    source: 'Process-only address stacks; classify steady samples using the worker RTC.',
    limitations:
      'Thread CPU timer samples user instruction locations. Kernel time is in process counters only. Frame-pointer build and sampling have separate overhead comparisons.',
    executableSha256: object(object(raw.build).executable).sha256,
    intervalMs: 10,
    window: { startAt: from, endAt: until },
    coverage,
    leaf: ranked(leaf, steadySamples),
    inclusive: ranked(inclusive, steadySamples),
  });
}
