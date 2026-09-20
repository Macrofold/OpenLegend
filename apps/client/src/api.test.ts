import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

it('sends a stable page identity and increasing presence order with Resume', async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, code: 'control', message: 'Resumed.' }),
  });
  vi.stubGlobal('fetch', fetch);
  const { setWorldPaused } = await import('./api.js');
  await setWorldPaused(false);
  await setWorldPaused(true);
  await setWorldPaused(false);
  const requests = fetch.mock.calls.map(([, init]) => JSON.parse(init.body));
  expect(requests[0]).toMatchObject({ paused: false, presenceSequence: 1 });
  expect(requests[0].clientId).toEqual(expect.any(String));
  expect(requests[1]).toEqual({ paused: true });
  expect(requests[2]).toMatchObject({
    paused: false,
    clientId: requests[0].clientId,
    presenceSequence: 2,
  });
});

it('uses the same identity and ordering for heartbeats, hiding and explicit Resume', async () => {
  const send = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  const beacons = vi.fn().mockReturnValue(true);
  const events = new Map<string, () => void>();
  const page = {
    visibilityState: 'visible',
    hasFocus: () => true,
    addEventListener: (name: string, fn: () => void) => events.set(name, fn),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('fetch', send);
  vi.stubGlobal('navigator', { sendBeacon: beacons });
  vi.stubGlobal('document', page);
  vi.stubGlobal('window', {
    setInterval: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  const { setWorldPaused, startPresence } = await import('./api.js');
  const stop = startPresence();
  page.visibilityState = 'hidden';
  events.get('visibilitychange')!();
  await setWorldPaused(false);
  const heartbeat = JSON.parse(send.mock.calls[0]![1].body);
  const hidden = JSON.parse(await (beacons.mock.calls[0]![1] as Blob).text());
  const resumed = JSON.parse(send.mock.calls[1]![1].body);
  expect(heartbeat).toMatchObject({ visible: true, sequence: 1 });
  expect(hidden).toEqual({ clientId: heartbeat.clientId, visible: false, sequence: 2 });
  expect(resumed).toEqual({ paused: false, clientId: heartbeat.clientId, presenceSequence: 3 });
  stop();
});

it('reports lost window focus immediately and does not let a visible-tab heartbeat override it', async () => {
  const send = vi.fn().mockResolvedValue({ ok: true });
  const beacons = vi.fn().mockReturnValue(true);
  const events = new Map<string, () => void>();
  const addEventListener = (name: string, callback: () => void) => events.set(name, callback);
  let heartbeat: () => void = () => undefined;
  vi.stubGlobal('fetch', send);
  vi.stubGlobal('navigator', { sendBeacon: beacons });
  vi.stubGlobal('document', {
    visibilityState: 'visible',
    hasFocus: () => true,
    addEventListener,
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('window', {
    addEventListener,
    removeEventListener: vi.fn(),
    setInterval: (callback: () => void) => {
      heartbeat = callback;
    },
  });
  const stop = (await import('./api.js')).startPresence();
  events.get('blur')!();
  expect(JSON.parse(await (beacons.mock.calls[0]![1] as Blob).text())).toMatchObject({
    visible: false,
  });
  heartbeat();
  expect(JSON.parse(send.mock.calls.at(-1)![1].body)).toMatchObject({ visible: false });
  events.get('focus')!();
  expect(JSON.parse(send.mock.calls.at(-1)![1].body)).toMatchObject({ visible: true });
  stop();
});
