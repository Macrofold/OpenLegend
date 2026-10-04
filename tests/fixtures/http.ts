import type { GameView } from '@open-legend/protocol';

/** A native HTTP fixture still needs current page authority, just like the UI. */
export async function localHttpClient(base: string) {
  const initial = await fetch(`${base}/api/state`);
  const cookie = initial.headers.get('set-cookie')!.split(';')[0]!;
  let view = (await initial.json()) as GameView;
  const post = async (path: string, body: unknown, origin = base) => {
    view = (await (
      await fetch(`${base}/api/state`, { headers: { Cookie: cookie } })
    ).json()) as GameView;
    return fetch(`${base}${path}`, {
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
    await fetch(`${base}/api/state`, { headers: { Cookie: cookie } })
  ).json()) as GameView;
  return { cookie, post, view };
}
