import { Worker } from 'node:worker_threads';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CheckpointWorker } from './checkpoint-worker-client.js';

const request = {
  directory: '/tmp/disposable',
  id: 'checkpoint-test',
  worldId: 'world-test',
  label: 'Test',
  format: 'test',
  kind: 'manual' as const,
};

function fixtureWorker(complete: boolean) {
  const script = `import { parentPort } from 'node:worker_threads';
    import { mkdir, rename } from 'node:fs/promises';
    import { join } from 'node:path';
    parentPort.postMessage({ type: 'ready' });
    parentPort.on('message', async (request) => {
      const stage = join(request.directory, '.pending-' + process.pid + '-' + request.stageId);
      await mkdir(stage);
      parentPort.postMessage({ type: 'captured' });
      if (${complete}) parentPort.postMessage({ type: 'complete' });
      else setTimeout(async () => {
        await rename(stage, join(request.directory, request.id));
        parentPort.postMessage({ type: 'complete' });
      }, 300);
    });`;
  return new Worker(new URL(`data:text/javascript,${encodeURIComponent(script)}`));
}

describe('checkpoint worker lifetime', () => {
  it('waits for a blocked worker to exit before reporting capture failure, then refuses reuse', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ol-checkpoint-timeout-'));
    const worker = new CheckpointWorker(
      { url: 'postgresql://unused/fixture' },
      100,
      fixtureWorker(false),
    );
    try {
      let staged = false;
      await expect(
        worker.capture({ ...request, directory }, () => {
          staged = true;
        }),
      ).rejects.toThrow('time limit');
      expect(staged).toBe(true);
      expect(await readdir(directory)).toEqual([]);
      await new Promise((resolve) => setTimeout(resolve, 350));
      expect(await readdir(directory)).toEqual([]);
      await expect(worker.capture({ ...request, directory }, () => undefined)).rejects.toThrow(
        'time limit',
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('keeps a completed worker available for the next capture', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ol-checkpoint-complete-'));
    const worker = new CheckpointWorker(
      { url: 'postgresql://unused/fixture' },
      1_000,
      fixtureWorker(true),
    );
    try {
      await worker.capture({ ...request, directory }, () => undefined);
      await worker.capture({ ...request, directory, id: 'another' }, () => undefined);
      await worker.close();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
