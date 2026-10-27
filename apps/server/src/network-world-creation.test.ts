import { afterEach, expect, it, vi } from 'vitest';
import { WorldCreationClient } from './world-creation-client.js';
import type { AppConfig } from './config.js';

const profile = { id: 'fixture', revision: 1, description: 'Synthetic prepared host.' };
const configuration: AppConfig['creation'] = {
  startup: 'ordinary',
  installationId: 'source',
  destination: undefined,
  targets: [
    {
      id: 'target',
      label: 'Fixture',
      intakeUrl: 'https://creation.example.test/',
      entryUrl: 'https://game.example.test/',
      intakeKey: 'synthetic-intake-key-not-a-real-credential',
      allowedCreatorAccountIds: ['creator'],
      profile,
    },
  ],
};
const reply = {
  targetId: 'target',
  targetGeneration: 1,
  targetProfileDigest: 'a'.repeat(64),
  label: 'Fixture',
  entryUrl: 'https://game.example.test/',
  profile,
  controlAccountId: 'control',
  creatorAccountIdAtDestination: 'creator',
  controlCapabilities: ['play'],
  operatingConfiguration: {},
  status: 'ready',
  message: 'Synthetic host available.',
  findings: [],
};
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('uses one exact configured creation request and validates its complete reply', async () => {
  const transport = vi.fn(async (url: string, init?: RequestInit) => {
    expect(url).toBe('https://creation.example.test/internal/world-creation/check');
    expect(init?.redirect).toBe('error');
    expect(new Headers(init?.headers).get('authorization')).toBe(
      'Bearer synthetic-intake-key-not-a-real-credential',
    );
    return new Response(JSON.stringify(reply));
  });
  vi.stubGlobal('fetch', transport);
  await expect(new WorldCreationClient(configuration).check('target', 'creator')).resolves.toEqual(
    reply,
  );
  expect(transport).toHaveBeenCalledTimes(1);
});

it('settles a creation observation when either transport or body ignores its original deadline', async () => {
  for (const headersArrived of [false, true]) {
    vi.useFakeTimers();
    const body = new ReadableStream<Uint8Array>({ cancel: () => new Promise<void>(() => {}) });
    const transport = vi.fn(() =>
      headersArrived ? Promise.resolve(new Response(body)) : new Promise<Response>(() => {}),
    );
    vi.stubGlobal('fetch', transport);
    const result = new WorldCreationClient(configuration)
      .check('target', 'creator')
      .catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(10_001);
    expect(await result).toMatchObject({ code: 'unavailable' });
    expect(transport).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  }
});

it('refuses an oversized creation reply without waiting for ignored body cancellation', async () => {
  const transport = vi.fn(
    async () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array(64_001));
          },
          cancel: () => new Promise<void>(() => {}),
        }),
      ),
  );
  vi.stubGlobal('fetch', transport);
  await expect(
    new WorldCreationClient(configuration).check('target', 'creator'),
  ).rejects.toMatchObject({ code: 'invalid' });
  expect(transport).toHaveBeenCalledTimes(1);
});
