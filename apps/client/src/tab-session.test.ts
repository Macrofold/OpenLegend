import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

function storage(saved: string) {
  const setItem = vi.fn();
  vi.stubGlobal('sessionStorage', { getItem: () => saved, setItem });
  vi.stubGlobal(
    'BroadcastChannel',
    class {
      postMessage() {}
    },
  );
  return setItem;
}

it('keeps a reload identity only after its exclusive browser claim succeeds', async () => {
  const saved = crypto.randomUUID();
  const setItem = storage(saved);
  let held: Promise<unknown> | undefined;
  const request = vi.fn(
    (_name: string, options: LockOptions, callback: LockGrantedCallback<unknown>) => {
      expect(options).toEqual({ ifAvailable: true });
      held = Promise.resolve(callback({ name: _name, mode: 'exclusive' }));
      return held;
    },
  );
  vi.stubGlobal('navigator', { locks: { request } });
  const tab = await import('./tab-session.js');
  await tab.tabIdentityReady;
  expect(tab.tabClientId()).toBe(saved);
  expect(request).toHaveBeenCalledOnce();
  expect(setItem).toHaveBeenCalledWith('open-legend:tab-id', saved);
  let released = false;
  void held!.then(() => {
    released = true;
  });
  await Promise.resolve();
  expect(released).toBe(false);
});

it('splits copied storage before readiness without waiting for the original page to reply', async () => {
  const saved = crypto.randomUUID();
  const setItem = storage(saved);
  const request = vi.fn(
    (name: string, _options: LockOptions, callback: LockGrantedCallback<unknown>) =>
      Promise.resolve(callback(name.endsWith(saved) ? null : { name, mode: 'exclusive' })),
  );
  vi.stubGlobal('navigator', { locks: { request } });
  const tab = await import('./tab-session.js');
  await tab.tabIdentityReady;
  expect(tab.tabClientId()).not.toBe(saved);
  expect(request).toHaveBeenCalledTimes(2);
  expect(setItem).toHaveBeenCalledWith('open-legend:tab-id', tab.tabClientId());
});

it('uses a fresh unpersisted document identity when browser exclusion is unavailable', async () => {
  const saved = crypto.randomUUID();
  const setItem = storage(saved);
  vi.stubGlobal('navigator', {});
  const tab = await import('./tab-session.js');
  await tab.tabIdentityReady;
  expect(tab.tabClientId()).not.toBe(saved);
  expect(setItem).not.toHaveBeenCalled();
});
