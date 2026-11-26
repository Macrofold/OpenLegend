// The CLI is an ordinary Lab controller. The Rust server owns grants, contacts,
// presence, current checkpoint, provider admission, budgets and world effects.
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { createNetworkOwner, requestText, subscribeEvents } from '@open-legend/network';

const lab = '/api/cognition-lab';

export async function openLab(address) {
  const origin = new URL(address);
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname);
  if (
    origin.href !== origin.origin + '/' ||
    (origin.protocol !== 'https:' && !(local && origin.protocol === 'http:'))
  )
    throw new Error('Choose a Lab origin using HTTPS or loopback HTTP.');
  const owner = createNetworkOwner({ role: 'cognition-lab-campaign', capacity: 4 });
  const tab = randomUUID();
  let cookie = process.env.OPEN_LEGEND_LAB_SESSION;
  const headers = () => ({
    ...(cookie && { Cookie: 'ol_session=' + cookie }),
    Origin: origin.origin,
    'X-OL-Client': tab,
  });
  const fetch = (path, init) =>
    owner.run({ timeoutMs: 30000 }, (op) =>
      requestText(op, {
        url: new URL(path, origin),
        init: { ...init, redirect: 'manual' },
        diagnostics: 'omit',
        bodyPolicy: { kind: 'complete-projection', owner: 'browser-api' },
      }),
    );
  if (!cookie && local) {
    const response = await fetch('/auth/login?returnTo=/cognition', { headers: headers() });
    cookie = response.headers
      .getSetCookie()
      .find((v) => v.startsWith('ol_session='))
      ?.split(';')[0]
      .slice('ol_session='.length);
  }
  if (!cookie || !/^[a-zA-Z0-9._~-]+$/.test(cookie))
    throw new Error('Supply this host’s signed-in ol_session value in OPEN_LEGEND_LAB_SESSION.');

  let view,
    stream,
    streamOpen,
    heartbeat,
    presenceError,
    sequence = 0,
    controlling = false;
  async function request(path, body) {
    const result = await fetch(lab + path, {
      headers: {
        ...headers(),
        ...(view?.access && {
          'X-OL-Scope': view.access.scope,
          'X-OL-Generation': view.historyEpoch.split(':')[0],
        }),
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      ...(body !== undefined && { method: 'POST', body: JSON.stringify(body) }),
    });
    let value;
    try {
      value = JSON.parse(result.text || '{}');
    } catch {
      throw new Error('The Lab returned an unreadable signed response.');
    }
    if (result.status < 200 || result.status >= 300 || value.ok === false)
      throw Object.assign(
        new Error(`Lab ${path} returned ${result.status}: ${value.code ?? 'unavailable'}`),
        { code: value.code, status: result.status },
      );
    return value;
  }
  async function state() {
    view = await request('/api/state');
    if (!view.access?.scope || !view.historyEpoch)
      throw new Error('The host did not supply a signed Lab world.');
    return view;
  }
  async function waitFor(probe, deadline) {
    while (Date.now() < deadline) {
      if (presenceError) throw presenceError;
      const result = await probe();
      if (result) return result;
      await delay(Math.min(250, Math.max(1, deadline - Date.now())));
    }
    throw new Error('The declared episode deadline elapsed.');
  }
  async function control() {
    await state();
    await request('/api/embodiment', {
      id: randomUUID(),
      operation: 'acquire',
      expectedGeneration: view.access.controlGeneration,
    });
    await state();
    if (!view.access.controlling) throw new Error('Another operator controls the Lab.');
    controlling = true;
    const connected = Promise.withResolvers();
    streamOpen = new AbortController();
    stream = subscribeEvents(
      owner,
      {
        mode: 'subscription',
        url: new URL(lab + '/api/events', origin),
        init: { headers: headers(), redirect: 'error' },
        signal: streamOpen.signal,
        connectTimeoutMs: 10000,
        heartbeatTimeoutMs: 45000,
        framePolicy: { kind: 'complete-projection', owner: 'game-events' },
      },
      () => connected.resolve(),
    );
    void stream.done.then((result) => {
      if (!streamOpen.signal.aborted) {
        presenceError = new Error('The signed Lab event stream ended: ' + result.reason);
        connected.reject(presenceError);
      }
    });
    await connected.promise;
    async function pulse() {
      await request('/api/presence', { clientId: tab, visible: true, sequence: ++sequence });
    }
    await pulse();
    // Issue a new heartbeat only after the previous one settles.
    async function tick() {
      try {
        await pulse();
        if (!streamOpen.signal.aborted) heartbeat = setTimeout(tick, 5000);
      } catch (error) {
        presenceError = error;
      }
    }
    heartbeat = setTimeout(tick, 5000);
  }
  async function close() {
    clearTimeout(heartbeat);
    streamOpen?.abort();
    stream?.close();
    if (controlling) {
      try {
        await state();
        if (view.access.controlling) {
          await request('/decisions/control', { action: 'hold' });
          await request('/api/embodiment', {
            id: randomUUID(),
            operation: 'release',
            expectedGeneration: view.access.controlGeneration,
          });
        }
      } finally {
        owner.stop('shutdown');
      }
    } else owner.stop('shutdown');
  }
  return { request, state, control, close, waitFor };
}
