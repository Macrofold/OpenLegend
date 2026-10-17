import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runBenchmark } from '../scripts/decision-benchmark/run.js';
import type { BenchmarkManifest } from '../scripts/decision-benchmark/journal.js';
import type { BenchmarkScene } from '../scripts/decision-benchmark/types.js';

const race = vi.hoisted(() => ({ beforeLock: undefined as (() => Promise<void>) | undefined }));
vi.mock('node:fs/promises', async (original) => {
  const actual = await original<typeof import('node:fs/promises')>();
  return {
    ...actual,
    open: async (...args: Parameters<typeof actual.open>) => {
      if (String(args[0]).endsWith('/RUNNING.lock') && race.beforeLock) {
        const beforeLock = race.beforeLock;
        race.beforeLock = undefined;
        await beforeLock();
      }
      return actual.open(...args);
    },
  };
});
vi.mock('node:child_process', () => ({
  execFileSync: (_command: string, args: string[]) =>
    args[0] === 'diff' || args[0] === 'ls-files' ? '' : `${'b'.repeat(40)}\n`,
}));

const scene: BenchmarkScene = {
  id: 'lock-race-scene',
  family: 'memory-correction',
  title: 'A correction heard directly',
  scope: 'hypothetical-world',
  sources: ['docs/memory-architecture.md'],
  state: { observation: 'I heard Mara correct the recipient from Vey to Neri.' },
  cases: [
    {
      id: 'lock-race-scene-q1',
      question: { type: 'noul', instructions: 'Did I hear Mara name Neri as the recipient?' },
      gold: { type: 'noul', min: 0.5, max: 1, label: true },
      rationale: 'The personally heard correction names Neri.',
      difficulty: 'clear',
      ambiguity: 'unambiguous',
      tags: ['source-evidence'],
    },
  ],
};
let directory: string | undefined;
afterEach(async () => {
  race.beforeLock = undefined;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  if (directory) await fs.rm(directory, { recursive: true, force: true });
  directory = undefined;
});

describe('paid benchmark writer snapshot', () => {
  it('rejects an admission written after its snapshot, cleans the lock, and never dispatches it again', async () => {
    directory = await fs.mkdtemp(join(tmpdir(), 'openlegend-benchmark-lock-'));
    vi.stubEnv('OPENAI_API_KEY', 'fixture-key-never-dispatched');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      throw new Error('Provider calls are forbidden in this race fixture.');
    });
    const options = new Map([
      ['live', 'true'],
      ['models', 'luna-decision'],
      ['max-new', '0'],
      ['workers', '1'],
    ]);
    await runBenchmark('run', directory, options, [scene], () => ({}));
    const manifest = JSON.parse(
      await fs.readFile(join(directory, 'manifest.json'), 'utf8'),
    ) as BenchmarkManifest;
    const journalPath = join(directory, 'journal.jsonl');
    const admission = {
      event: 'admitted',
      key: `${manifest.models[0]}:${scene.id}`,
      requestId: `olbench:${manifest.runId}:${scene.id}:0`,
      reservedUsd: 0.01,
      at: '2026-10-15T22:00:00.000Z',
    };
    // Another writer admits this task and relinquishes the lock after our read,
    // immediately before this runner succeeds in acquiring the writer lock.
    race.beforeLock = () => fs.appendFile(journalPath, JSON.stringify(admission) + '\n');
    options.set('max-new', '1');
    await expect(runBenchmark('run', directory, options, [scene], () => ({}))).rejects.toThrow(
      /Journal changed before the writer lock/,
    );
    expect(fetch).not.toHaveBeenCalled();
    await expect(fs.access(join(directory, 'RUNNING.lock'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    expect(await fs.readFile(journalPath, 'utf8')).toBe(JSON.stringify(admission) + '\n');
    // A clean resume consumes that latest admission and preserves its uncertain hold.
    await runBenchmark('run', directory, options, [scene], () => ({}));
    expect(fetch).not.toHaveBeenCalled();
    expect(await fs.readFile(journalPath, 'utf8')).toBe(JSON.stringify(admission) + '\n');
  });
});
