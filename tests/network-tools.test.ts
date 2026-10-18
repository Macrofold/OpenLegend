import { afterEach, expect, it, vi } from 'vitest';
import { inspect } from 'node:util';
import { toolHttp, toolRemote, remoteErrorMatches } from '../scripts/network.js';
import { installLocalAssetRelease } from '../scripts/assets/install.js';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('bounds script HTTP bodies even when transport cancellation is ignored', async () => {
  let release!: (response: Response) => void;
  const send = vi.fn().mockImplementation(
    () =>
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
  );
  vi.stubGlobal('fetch', send);
  vi.useFakeTimers();
  const result = toolHttp('http://127.0.0.1:3210/health', {}, { timeoutMs: 25 }).catch(
    (error) => error,
  );
  await vi.advanceTimersByTimeAsync(25);
  expect(await result).toMatchObject({ kind: 'deadline_exceeded' });
  release(Response.json({ ok: true }));
  await vi.advanceTimersByTimeAsync(0);
  expect(send).toHaveBeenCalledOnce();
});

it('keeps asset installation identity and its two bounded opportunities within one sequence', async () => {
  const send = vi
    .fn()
    .mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 9_000));
      return Response.json(
        {
          access: { scope: 'selected-scope' },
          checkpoint: { timeline: 'selected-timeline' },
          presentationReleaseRevision: 3,
        },
        {
          headers: { 'Set-Cookie': 'ol_session=fixture; Path=/' },
        },
      );
    })
    .mockImplementationOnce(() => new Promise<Response>(() => {}));
  vi.stubGlobal('fetch', send);
  vi.useFakeTimers();
  const reference = {
    owner: { kind: 'collection' as const, id: 'owner' },
    assetId: 'release',
    revisionId: 'current',
    manifestSha256: 'a'.repeat(64),
  };
  const result = installLocalAssetRelease({
    origin: 'http://127.0.0.1:3000',
    operationId: 'original-selection',
    reference,
  }).catch((error) => error);
  await vi.advanceTimersByTimeAsync(9_000);
  expect(send).toHaveBeenCalledTimes(2);
  const request = JSON.parse(send.mock.calls[1]![1].body);
  expect(request).toMatchObject({
    id: 'original-selection',
    timeline: 'selected-timeline',
    reference,
    expectedRevision: 3,
  });
  await vi.advanceTimersByTimeAsync(10_000);
  expect(await result).toMatchObject({ kind: 'deadline_exceeded' });
  expect(send).toHaveBeenCalledTimes(2);
});

it('uses argument arrays, bounds remote children, and keeps credential-bearing output out of errors', async () => {
  const secret = 'fixture-secret-must-not-be-logged';
  const failure = await toolRemote(
    process.execPath,
    [
      '--eval',
      `process.stderr.write('${secret}: Stack with id fixture does not exist'); process.exit(2)`,
    ],
    { timeoutMs: 5_000 },
  ).catch((error) => error);
  expect(remoteErrorMatches(failure, /Stack with id fixture does not exist/)).toBe(true);
  expect(String(failure)).not.toContain(secret);
  expect(JSON.stringify(failure)).not.toContain(secret);
  expect(inspect(failure)).not.toContain(secret);
  await expect(
    toolRemote(process.execPath, ['--eval', 'setInterval(() => {},1000)'], { timeoutMs: 25 }),
  ).rejects.toMatchObject({ kind: 'deadline_exceeded' });
});
