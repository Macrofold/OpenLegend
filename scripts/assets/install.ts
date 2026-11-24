import { randomUUID } from 'node:crypto';
import type { AssetRevisionReference } from '@open-legend/assets';
import type { OperationsView } from '@open-legend/protocol';
import { toolHttp, toolSequence } from '../network.js';
import { localGameOrigin, localGameSession } from './local-game.js';

/** Local operator convenience, through the same browser-session, Origin, scope
 * and owner-admitted operation used by the game. No direct save/catalog writes. */
export async function installLocalAssetRelease(options: {
  origin: string;
  operationId: string;
  reference: AssetRevisionReference;
}): Promise<unknown> {
  const origin = localGameOrigin(options.origin);
  if (!origin) throw new Error('Local asset installation requires an exact loopback HTTP origin.');
  return toolSequence(20_000, async (operation) => {
    const session = await localGameSession(origin);
    if (!session)
      throw new Error(
        'This command requires local operator authentication. Use the authenticated game for hosted worlds.',
      );
    const tab = `assets-${randomUUID()}`;
    const state = await toolHttp(
      new URL('/api/operations', origin),
      {
        redirect: 'error',
        headers: { Cookie: session, 'X-Ol-Client': tab },
      },
      { timeoutMs: 10_000, parent: operation },
    );
    const view = await state.json<OperationsView & { message?: string }>();
    if (!state.ok)
      throw new Error(
        `World operations refused the read (HTTP ${state.status}): ${view.message ?? 'No reason was reported.'}`,
      );
    if (!view.scope || !view.checkpoint?.timeline)
      throw new Error('This account cannot select the artwork for this world.');
    const result = await toolHttp(
      new URL('/api/assets/install', origin),
      {
        method: 'POST',
        redirect: 'error',

        headers: {
          Cookie: session,
          Origin: origin.origin,
          'Content-Type': 'application/json',
          'X-Ol-Client': tab,
          'X-Ol-Scope': view.scope,
        },
        body: JSON.stringify({
          id: options.operationId,
          timeline: view.checkpoint.timeline,
          reference: options.reference,
          expectedRevision: view.presentationReleaseRevision ?? 0,
        }),
      },
      { timeoutMs: 10_000, parent: operation },
    );
    const receipt: unknown = await result.json();
    if (!result.ok)
      throw new Error('The game refused asset installation: ' + JSON.stringify(receipt));
    return receipt;
  });
}
