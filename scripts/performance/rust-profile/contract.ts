import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readFile, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

export const buildModes = ['fresh-build', 'reuse-build', 'changed-build', 'corrupt-build'] as const;
export type BuildMode = (typeof buildModes)[number];

export const modes = [
  'untouched',
  'default',
  'disabled',
  'enabled',
  'sampling-control',
  'sampled',
  'sql',
  ...buildModes,
] as const;
export type Mode = (typeof modes)[number];

export function buildMode(mode: Mode): BuildMode | undefined {
  return buildModes.find((buildMode) => buildMode === mode);
}
export const coreArtifacts = [
  'manifest.json',
  'timeline.json',
  'workload.json',
  'resources.json',
  'completion.json',
  'toolchain.json',
  'case.process.json',
  'result.json',
] as const;
export const standardWorker = {
  instanceType: 'm7i.xlarge',
  vcpus: 4,
  memoryMiB: 16_384,
} as const;
export const opening = {
  scenarioId: 'rust-heavy-opening',
  worldSeed: 73,
  seed: 1086,
  warmupSeconds: 10,
  measureSeconds: 180,
  drainSeconds: 20,
  gameSecondsPerRealSecond: 60,
  expectedWork: {
    walks: 34,
    heldSteering: 2,
    conversations: 2,
    players: 1,
    humanNpcs: 10,
    deer: 10,
    hares: 5,
    scenery: 1246,
  },
} as const;

export interface CasePlan {
  id: string;
  runnerCaseId: string;
  sharedBuild?: { peerId: string; role: 'first' | 'second' };
  source: string;
  toolSource: string;
  mode: Mode;
  probeIds: string[];
  samplingProbability: 1 | 0.125 | 0.015625;
  repetition: number;
  comparisonId: string;
  comparisonIdentity: string;
  scenarioId: string;
  seed: number;
  warmupSeconds: number;
  measureSeconds: number;
  drainSeconds: number;
  hardDeadlineSeconds: number;
  expectedWork: typeof opening.expectedWork;
  inputHashes: Record<string, string>;
  hardware: typeof standardWorker;
  requiredArtifacts: string[];
}

export function groupRunnerCases(cases: CasePlan[]) {
  const groups = new Map<string, CasePlan[]>();
  for (const item of cases) {
    const arms = groups.get(item.runnerCaseId);
    if (arms) arms.push(item);
    else groups.set(item.runnerCaseId, [item]);
  }
  return [...groups].map(([id, arms]) => ({ id, arms }));
}

export function workerResultPath(item: CasePlan) {
  return `cases/${item.runnerCaseId}/results${item.sharedBuild ? '/' + item.id : ''}`;
}

export function runnerSteps(arms: CasePlan[]) {
  const paired = Boolean(arms[0]?.sharedBuild);
  const databases = paired ? ['game_a', 'game_b'] : ['game'];
  return {
    databases,
    steps: arms.map((item, position) => ({
      id: paired ? `profile-${position + 1}` : 'profile',
      database: databases[position],
      argv: [
        'node',
        '--import',
        'tsx',
        '{inputs}/campaign-tool/profile-campaign.ts',
        'case',
        item.id,
        '{inputs}/campaign/plan.json',
        item.sharedBuild ? `{results}/${item.id}` : '{results}',
      ],
    })),
  };
}

export function object(value: unknown, label = 'object'): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`Expected ${label}.`);
  return Object.fromEntries(Object.entries(value));
}

export function keys(value: Record<string, unknown>, expected: string[]) {
  for (const key of Object.keys(value)) {
    if (!expected.includes(key)) throw new Error(`Unexpected field ${key}.`);
  }
}

export function text(value: unknown, label: string, pattern?: RegExp): string {
  if (typeof value !== 'string' || !value.length || (pattern && !pattern.test(value)))
    throw new Error(`Invalid ${label}.`);
  return value;
}

export const identifier = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
export const metricId = /^S\d{2}(?:\.[a-zA-Z0-9_-]+)+$/;
export const gitHash = /^[a-f0-9]{40}$/;
export const sha256 = /^[a-f0-9]{64}$/;
export const digest = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function number(value: unknown, label: string, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new Error(`Invalid ${label}.`);
  return value;
}

export function integer(value: unknown, label: string, min: number, max: number) {
  const parsed = number(value, label, min, max);
  if (!Number.isSafeInteger(parsed)) throw new Error(`Expected an integer ${label}.`);
  return parsed;
}

export function list(value: unknown, label: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(`Invalid ${label} list.`);
  return value;
}

export async function hashFile(path: string) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

const entriesLimit = 256 * 1024 ** 2;
function assertPath(path: string) {
  if (
    isAbsolute(path) ||
    path.includes('\\') ||
    path.includes('\0') ||
    path.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw new Error(`Unsafe artifact path: ${path}.`);
}

/** Resolves an existing bounded regular file, rejecting escapes and symlink indirection. */
export async function containedFile(root: string, path: string, byteLimit = entriesLimit) {
  assertPath(path);
  const canonicalRoot = await realpath(root);
  const target = resolve(canonicalRoot, path);
  const info = await lstat(target);
  if (
    relative(canonicalRoot, target) !== path ||
    (await realpath(target)) !== target ||
    !info.isFile() ||
    info.size > byteLimit
  )
    throw new Error(`Unsafe or oversized artifact ${path}.`);
  return { path: target, bytes: info.size };
}

export async function jsonFile(
  root: string,
  path: string,
  byteLimit = 8 * 1024 ** 2,
): Promise<unknown> {
  const file = await containedFile(root, path, byteLimit);
  return JSON.parse(await readFile(file.path, 'utf8'));
}

export async function writeJson(path: string, data: unknown, exclusive = true) {
  await writeFile(path, JSON.stringify(data, null, 2) + '\n', {
    flag: exclusive ? 'wx' : 'w',
    mode: 0o600,
  });
}

export function isMissing(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
