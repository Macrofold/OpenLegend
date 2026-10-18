import type { AssetRevisionReference } from '@open-legend/assets';

/** Local operator convenience, through the same browser-session, Origin, scope
 * and owner-admitted operation used by the game. No direct save/catalog writes. */
export async function installLocalAssetRelease(options: {
  origin: string;
  operationId: string;
  reference: AssetRevisionReference;
}): Promise<unknown> {
  const origin = new URL(options.origin);
  if (
    origin.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  )
    throw new Error('Local asset installation requires an exact loopback HTTP origin.');
  const state = await fetch(new URL('/api/state', origin), {
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  });
  if (!state.ok) throw new Error('Open the local game before selecting its asset release.');
  const session = state.headers
    .getSetCookie()
    .find((value) => value.startsWith('ol_session='))
    ?.split(';')[0];
  const view = (await state.json()) as {
    access?: { scope?: string };
    checkpoint?: { timeline: string };
    presentationRelease?: AssetRevisionReference;
    presentationReleaseRevision?: number;
  };
  if (!session || !view.access?.scope || !view.checkpoint?.timeline)
    throw new Error(
      'This command requires local operator authentication. Use the authenticated game for hosted worlds.',
    );
  const result = await fetch(new URL('/api/assets/install', origin), {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
    headers: {
      Cookie: session,
      Origin: origin.origin,
      'Content-Type': 'application/json',
      'X-Ol-Scope': view.access.scope,
    },
    body: JSON.stringify({
      id: options.operationId,
      timeline: view.checkpoint.timeline,
      reference: options.reference,
      expectedRevision: view.presentationReleaseRevision ?? 0,
    }),
  });
  const receipt: unknown = await result.json();
  if (!result.ok)
    throw new Error('The game refused asset installation: ' + JSON.stringify(receipt));
  return receipt;
}
