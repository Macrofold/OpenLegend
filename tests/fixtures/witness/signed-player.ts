import assert from 'node:assert/strict';
import { createNetworkOwner, requestText, type HttpRequest } from '@open-legend/network';
import type { ApiResult, GameView } from '@open-legend/protocol';

type SignedView = GameView & {
  access: NonNullable<GameView['access']>;
  historyEpoch: string;
};

function hasSignedScope(view: GameView): view is SignedView {
  return typeof view.access?.scope === 'string' && typeof view.historyEpoch === 'string';
}

/** One signed fixture tab owns its requests and retires them before the scenario drops its database. */
export function createWitnessPlayer(base: string, clientId: string, initialCookie?: string) {
  const network = createNetworkOwner({ role: 'witness-fixture-player', capacity: 2 });
  let cookie = initialCookie;
  let view: SignedView | undefined;

  const request = (path: string, init: NonNullable<HttpRequest['init']>, timeoutMs: number) =>
    network.run({ timeoutMs }, async (operation) =>
      requestText(operation, {
        url: base + path,
        init: { ...init, redirect: 'manual' },
        bodyPolicy: { kind: 'complete-projection', owner: 'browser-api' },
      }),
    );

  async function login() {
    const response = await request('/auth/login', {}, 5000);
    assert.equal(response.status, 303);
    cookie = response.headers.get('set-cookie')?.split(';')[0];
    assert(cookie, 'Local login returned no session cookie.');
    return cookie;
  }

  function get(path: string) {
    assert(cookie, 'Read the game through a signed session.');
    return request(path, { headers: { Cookie: cookie, 'X-OL-Client': clientId } }, 5000);
  }

  async function state() {
    const response = await get('/api/state');
    const result: GameView | { code: string } = JSON.parse(response.text);
    if ('code' in result && ['busy', 'stale-scope'].includes(result.code)) return undefined;
    assert.equal(response.status, 200, response.text.slice(0, 900));
    assert(!('code' in result) && hasSignedScope(result), 'The game did not return a signed view.');
    return (view = result);
  }

  async function post(path: string, body: object): Promise<ApiResult> {
    assert(cookie && view, 'Read a signed view before sending a command.');
    const response = await request(
      path,
      {
        method: 'POST',
        headers: {
          Cookie: cookie,
          Origin: base,
          'X-OL-Client': clientId,
          'X-OL-Scope': view.access.scope,
          'X-OL-Generation': view.historyEpoch.split(':')[0] ?? '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
      15000,
    );
    const result: ApiResult = JSON.parse(response.text);
    assert.equal(typeof result.ok, 'boolean', 'Expected a game command receipt.');
    return result;
  }

  return {
    login,
    get,
    state,
    post,
    async close() {
      const { unresolved } = await network.shutdown({ timeoutMs: 5000 });
      assert.equal(unresolved, 0, 'Signed player requests were still in flight after shutdown.');
    },
  };
}
