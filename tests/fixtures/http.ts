import type { GameView } from '@open-legend/protocol';
import { createNetworkOwner, requestBytes } from '@open-legend/network';

const requests = createNetworkOwner({ role: 'fixture-http', capacity: 8 });
async function fixtureRequest(url: string, init: RequestInit = {}): Promise<Response> {
  const result = await requests.run(
    { timeoutMs: 15_000, signal: init.signal ?? undefined },
    (operation) =>
      requestBytes(operation, {
        url,
        init: { ...init, body: typeof init.body === 'string' ? init.body : undefined },
        bodyPolicy: { kind: 'complete-projection', owner: 'browser-api' },
      }),
  );
  // Existing fixture consumers inspect native HTTP behavior. This is an in-memory
  // response made from already-consumed bytes, with no live socket or reader.
  return new Response(
    [204, 205, 304].includes(result.status) ? null : Uint8Array.from(result.bytes),
    {
      status: result.status,
      statusText: result.statusText,
      headers: result.headers,
    },
  );
}

/** A native HTTP fixture still needs current page authority, just like the UI. */
export async function localHttpClient(base: string) {
  const initial = await fixtureRequest(`${base}/api/state`);
  const cookie = initial.headers.get('set-cookie')!.split(';')[0]!;
  let view = (await initial.json()) as GameView;
  const post = async (path: string, body: unknown, origin = base) => {
    view = (await (
      await fixtureRequest(`${base}/api/state`, { headers: { Cookie: cookie } })
    ).json()) as GameView;
    return fixtureRequest(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: cookie,
        'X-OL-Scope': view.access!.scope,
      },
      body: JSON.stringify(body),
    });
  };
  const resumed = await post('/api/embodiment', {
    id: crypto.randomUUID(),
    expectedGeneration: view.access!.controlGeneration,
    operation: 'replace',
  });
  if (!resumed.ok) throw new Error('Fixture could not resume.');
  view = (await (
    await fixtureRequest(`${base}/api/state`, { headers: { Cookie: cookie } })
  ).json()) as GameView;
  return { cookie, post, view };
}
