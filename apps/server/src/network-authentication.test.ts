import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { get, type IncomingHttpHeaders } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenIdAuthentication } from './authentication.js';
import type { VerifiedIdentity } from './authority.js';
import type { AppConfig } from './config.js';
import { createGameServer } from './http.js';
import { OperationsRoutes } from './operations-routes.js';
import { MaintenanceSchedule } from './maintenance.js';
import { readConfig, testRepository } from '../../../tests/fixtures/database.js';
import { stockedCamp } from '../../../tests/fixtures/world.js';

const accept = async (identity: VerifiedIdentity) => identity;
const issuer = 'https://identity.example.test';
const config: AppConfig['authentication'] = {
  mode: 'oidc',
  insecureLoopback: false,
  bindings: [],
  sessionMs: 300_000,
  issuer,
  clientId: 'network-test-client',
  clientSecret: 'synthetic-secret',
  origin: 'https://game.example.test',
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'fixture', use: 'sig', alg: 'RS256' };
const base64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

function fixture() {
  const nonces = new Map<string, string>();
  const challenges = new Map<string, string>();
  const calls: string[] = [];
  const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith('/.well-known/openid-configuration'))
      return json({
        issuer,
        authorization_endpoint: issuer + '/authorize',
        token_endpoint: issuer + '/token',
        jwks_uri: issuer + '/jwks',
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        token_endpoint_auth_methods_supported: ['client_secret_basic'],
      });
    if (url.endsWith('/jwks')) return json({ keys: [jwk] });
    if (url.endsWith('/token')) {
      expect(init?.redirect).toBe('manual');
      const body = new URLSearchParams(String(init?.body));
      const code = body.get('code') ?? '';
      expect(
        createHash('sha256')
          .update(body.get('code_verifier') ?? '')
          .digest('base64url'),
      ).toBe(challenges.get(code));
      const header = base64({ alg: 'RS256', kid: 'fixture' });
      const payload = base64({
        iss: issuer,
        aud: config.clientId,
        sub: code,
        nonce: nonces.get(code),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 300,
      });
      const unsigned = header + '.' + payload;
      return json({
        access_token: 'synthetic-access',
        token_type: 'Bearer',
        id_token:
          unsigned +
          '.' +
          sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url'),
      });
    }
    throw new Error('Unexpected synthetic identity request');
  });
  vi.stubGlobal('fetch', fetch);
  const authentication = new OpenIdAuthentication(config, () => Date.now());
  const callback = (begin: URL, code: string) => {
    nonces.set(code, begin.searchParams.get('nonce') ?? '');
    challenges.set(code, begin.searchParams.get('code_challenge') ?? '');
    const url = new URL(config.origin + '/auth/callback');
    url.searchParams.set('state', begin.searchParams.get('state') ?? '');
    url.searchParams.set('code', code);
    return url;
  };
  return { authentication, callback, calls, fetch };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('bounded OpenID SDK requests', () => {
  // Disposable PostgreSQL/schema and full-server initialization contend with the
  // parallel repository suite. Only these two harnesses get a larger overall
  // allowance; the actual login, discovery and cancellation budgets stay exact.
  it(
    'fences cancelled invitation admission while allowing an already-admitted atomic redemption to finish',
    { timeout: 60_000 },
    async () => {
      const { authentication, callback } = fixture();
      const appConfig = readConfig();
      const store = await testRepository(undefined, stockedCamp());
      const game = await createGameServer({
        config: appConfig,
        store,
        production: true,
        tick: false,
      });
      const routes = new OperationsRoutes(
        game.service,
        store,
        new MaintenanceSchedule(game.service, store.maintenance, () => Date.now()),
        appConfig,
        () => Date.now(),
      );
      const invitation = await game.service.authenticationMutation(() =>
        store.invites.create(
          game.service.localScope,
          {
            id: randomUUID(),
            role: 'spectator',
            label: 'Bounded sign-in fixture',
            expiresInHours: 1,
          },
          ['spectate'],
          Date.now(),
        ),
      );
      const begin = await authentication.begin('browser-a', false);
      let release = () => {};
      let queued = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const waiting = new Promise<void>((resolve) => {
        queued = resolve;
      });
      let accountId = '';
      let blocking: Promise<void> | undefined;
      let redemption: Promise<string> | undefined;
      const cancellation = new AbortController();
      let finishCommit = () => {};
      const commitGate = new Promise<void>((resolve) => {
        finishCommit = resolve;
      });
      try {
        const result = authentication
          .complete(
            callback(begin, 'person-a'),
            'browser-a',
            async (identity, context) => {
              const login = await game.service.authenticationMutation(() =>
                store.db.transaction(() =>
                  store.authority.login(identity, Date.now(), 300_000, 16),
                ),
              );
              accountId = login.session.accountId;
              let entered = () => {};
              const enteredQueue = new Promise<void>((resolve) => {
                entered = resolve;
              });
              blocking = game.service.authenticationMutation(async () => {
                entered();
                await gate;
              });
              await enteredQueue;
              redemption = routes.completeInvite(invitation.token, accountId, context);
              queued();
              return redemption;
            },
            cancellation.signal,
          )
          .catch((error: unknown) => error);
        await Promise.race([
          waiting,
          result.then(() => {
            throw new Error('Login ended before invitation queue admission.');
          }),
        ]);
        cancellation.abort();
        expect(await result).toMatchObject({ kind: 'cancelled' });
        release();
        await blocking;
        await expect(redemption).rejects.toMatchObject({ kind: 'cancelled' });
        expect(await store.authority.grant(game.service.world.id, accountId)).toBeUndefined();
        expect((await store.invites.byToken(invitation.token))?.redeemedAt).toBeUndefined();

        const originalSave = store.invites.save.bind(store.invites);
        let admitted = () => {};
        const committing = new Promise<void>((resolve) => {
          admitted = resolve;
        });
        vi.spyOn(store.invites, 'save').mockImplementationOnce(async (invite) => {
          admitted();
          await commitGate;
          await originalSave(invite);
        });
        const second = await authentication.begin('browser-b', false);
        const disconnected = new AbortController();
        const admittedResult = authentication
          .complete(
            callback(second, 'person-a'),
            'browser-b',
            async (_identity, context) => {
              redemption = routes.completeInvite(invitation.token, accountId, context);
              return redemption;
            },
            disconnected.signal,
          )
          .catch((error: unknown) => error);
        await Promise.race([
          committing,
          admittedResult.then(() => {
            throw new Error('Login ended before atomic invitation commit admission.');
          }),
        ]);
        disconnected.abort();
        expect(await admittedResult).toMatchObject({ kind: 'cancelled' });
        finishCommit();
        await expect(redemption).resolves.toContain('invite-accepted');
        expect(await store.authority.grant(game.service.world.id, accountId)).toBeDefined();
        expect((await store.invites.byToken(invitation.token))?.redeemedAt).toBeTypeOf('number');
      } finally {
        release();
        finishCommit();
        await blocking;
        await game.close();
      }
    },
  );

  it(
    'cancels a disconnected HTTP login while another browser completes the same shared discovery',
    { timeout: 60_000 },
    async () => {
      const { callback, calls, fetch } = fixture();
      const delegate = fetch.getMockImplementation()!;
      let release = () => {};
      let entered = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const discovery = new Promise<void>((resolve) => {
        entered = resolve;
      });
      fetch.mockImplementationOnce(async (input, init) => {
        const response = await delegate(input, init);
        entered();
        await gate;
        return response;
      });
      const signals: AbortSignal[] = [];
      const begin = OpenIdAuthentication.prototype.begin;
      vi.spyOn(OpenIdAuthentication.prototype, 'begin').mockImplementation(function (
        this: OpenIdAuthentication,
        browserToken,
        changeAccount,
        signal,
      ) {
        if (!signal) throw new Error('HTTP sign-in did not pass its disconnect signal.');
        signals.push(signal);
        return begin.call(this, browserToken, changeAccount, signal);
      });
      const game = await createGameServer({
        config: { ...readConfig(), authentication: config },
        store: await testRepository(undefined, stockedCamp()),
        production: true,
        tick: false,
      });
      await new Promise<void>((resolve) => game.server.listen(0, '127.0.0.1', resolve));
      const address = game.server.address();
      if (!address || typeof address === 'string')
        throw new Error('Missing HTTP fixture listener.');
      const request = (path: string, cookie?: string) => {
        let client: ReturnType<typeof get>;
        const result = new Promise<{ status: number | undefined; headers: IncomingHttpHeaders }>(
          (resolve, reject) => {
            client = get(
              {
                hostname: '127.0.0.1',
                port: address.port,
                path,
                headers: {
                  Host: new URL(config.origin).host,
                  ...(cookie ? { Cookie: cookie } : {}),
                },
              },
              (response) => {
                response.resume();
                response.once('end', () =>
                  resolve({ status: response.statusCode, headers: response.headers }),
                );
              },
            );
            client.once('error', reject);
          },
        );
        return { result, stop: () => client.destroy() };
      };
      try {
        const first = request('/auth/login');
        const disconnected = first.result.catch(() => undefined);
        await discovery;
        const second = request('/auth/login');
        await expect.poll(() => signals.length).toBe(2);
        first.stop();
        await disconnected;
        await expect.poll(() => signals[0]?.aborted).toBe(true);
        expect(signals[1]?.aborted).toBe(false);
        release();
        const redirect = await second.result;
        expect(redirect.status).toBe(303);
        const browserCookie = redirect.headers['set-cookie']?.[0]?.split(';')[0];
        expect(browserCookie).toMatch(/^ol_login=/);
        const completion = callback(new URL(redirect.headers.location!), 'person-b');
        const signedIn = await request(completion.pathname + completion.search, browserCookie)
          .result;
        expect(signedIn.status).toBe(303);
        expect(
          signedIn.headers['set-cookie']?.some((value) => value.startsWith('ol_session=')),
        ).toBe(true);
        expect(calls.filter((url) => url.includes('.well-known'))).toHaveLength(1);
      } finally {
        release();
        game.server.closeAllConnections();
        await game.close();
      }
    },
  );

  it('keeps shared discovery alive when one browser disconnects and the other completes sign-in', async () => {
    const { authentication, callback, calls, fetch } = fixture();
    const delegate = fetch.getMockImplementation()!;
    let release = () => {};
    let started = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    fetch.mockImplementationOnce(async (input, init) => {
      const response = await delegate(input, init);
      started();
      await gate;
      return response;
    });
    const disconnected = new AbortController();
    const first = authentication
      .begin('browser-a', false, disconnected.signal)
      .catch((error: unknown) => error);
    const second = authentication.begin('browser-b', false);
    await entered;
    disconnected.abort();
    expect(await first).toMatchObject({ kind: 'cancelled' });
    expect(calls.filter((url) => url.includes('.well-known'))).toHaveLength(1);
    release();
    await expect(
      authentication.complete(callback(await second, 'person-b'), 'browser-b', accept),
    ).resolves.toEqual({ issuer, subject: 'person-b' });
    expect(calls.filter((url) => url.includes('.well-known'))).toHaveLength(1);
  });

  it('replaces expired discovery without installing its late response over the replacement', async () => {
    const { authentication, callback, calls, fetch } = fixture();
    const delegate = fetch.getMockImplementation()!;
    let release = () => {};
    let started = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    fetch.mockImplementationOnce(async (input, init) => {
      const response = await delegate(input, init);
      started();
      await gate;
      return response;
    });
    vi.useFakeTimers();
    const expired = authentication.begin('browser-a', false).catch((error: unknown) => error);
    await entered;
    await vi.advanceTimersByTimeAsync(10_001);
    expect(await expired).toMatchObject({ kind: 'deadline_exceeded' });
    const second = await authentication.begin('browser-b', false);
    release();
    await vi.advanceTimersByTimeAsync(1);
    await expect(
      authentication.complete(callback(second, 'person-b'), 'browser-b', accept),
    ).resolves.toEqual({ issuer, subject: 'person-b' });
    await authentication.begin('browser-c', false);
    expect(calls.filter((url) => url.includes('.well-known'))).toHaveLength(2);
  });

  it('retries discovery after a failed identity-provider response', async () => {
    const { authentication, callback, fetch } = fixture();
    fetch.mockResolvedValueOnce(json({ error: 'unavailable' }, 503));
    await expect(authentication.begin('browser-a', false)).rejects.toThrow();
    const second = await authentication.begin('browser-b', false);
    await expect(
      authentication.complete(callback(second, 'person-b'), 'browser-b', accept),
    ).resolves.toEqual({ issuer, subject: 'person-b' });
  });

  it('uses one discovery and the current independent login for signed token and JWKS work', async () => {
    const { authentication, callback, calls } = fixture();
    const [first, second] = await Promise.all([
      authentication.begin('browser-a', false),
      authentication.begin('browser-b', true),
    ]);
    expect(second.searchParams.get('prompt')).toBe('login');
    expect(calls.filter((url) => url.includes('.well-known'))).toHaveLength(1);
    await expect(
      authentication.complete(callback(first, 'person-a'), 'browser-a', accept),
    ).resolves.toEqual({ issuer, subject: 'person-a' });
    await expect(
      authentication.complete(callback(second, 'person-b'), 'browser-b', accept),
    ).resolves.toEqual({ issuer, subject: 'person-b' });
    expect(calls.filter((url) => url.endsWith('/token'))).toHaveLength(2);
    expect(calls.some((url) => url.endsWith('/jwks'))).toBe(true);
    await expect(
      authentication.complete(callback(first, 'person-a'), 'browser-a', accept),
    ).rejects.toThrow();
  });

  it('ends an ignored token request and never accepts its late signed identity', async () => {
    const { authentication, callback, fetch } = fixture();
    const begin = await authentication.begin('browser-a', false);
    const url = callback(begin, 'person-a');
    let completeToken: ((response: Response) => void) | undefined;
    fetch.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          completeToken = resolve;
        }),
    );
    vi.useFakeTimers();
    const completion = authentication.complete(url, 'browser-a', accept);
    const rejected = expect(completion).rejects.toMatchObject({ kind: 'deadline_exceeded' });
    await vi.advanceTimersByTimeAsync(10_001);
    await rejected;
    expect(completeToken).toBeTypeOf('function');
    completeToken?.(json({ error: 'invalid_grant' }, 400));
    await vi.advanceTimersByTimeAsync(1);
    await expect(authentication.complete(url, 'browser-a', accept)).rejects.toThrow();
  });

  it('fences session admission after a verified login waits beyond its original budget', async () => {
    const { authentication, callback } = fixture();
    const begin = await authentication.begin('browser-a', false);
    let enter = () => {};
    let resume = () => {};
    const entered = new Promise<void>((resolve) => {
      enter = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      resume = resolve;
    });
    const publish = vi.fn();
    vi.useFakeTimers();
    const completion = authentication
      .complete(callback(begin, 'person-a'), 'browser-a', async (_identity, context) => {
        enter();
        await gate;
        context.throwIfStopped();
        publish();
      })
      .catch((error: unknown) => error);
    await entered;
    await vi.advanceTimersByTimeAsync(30_001);
    expect(await completion).toMatchObject({ kind: 'deadline_exceeded' });
    resume();
    await vi.advanceTimersByTimeAsync(1);
    expect(publish).not.toHaveBeenCalled();
  });

  it('does not renew the browser transaction expiry while exchanging a token', async () => {
    vi.useFakeTimers();
    const { authentication, callback, fetch } = fixture();
    const begin = await authentication.begin('browser-a', false);
    await vi.advanceTimersByTimeAsync(299_995);
    let finish: (response: Response) => void = () => {};
    fetch.mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    const publish = vi.fn(accept);
    const url = callback(begin, 'person-a');
    const result = authentication
      .complete(url, 'browser-a', publish)
      .catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(6);
    expect(await result).toMatchObject({ kind: 'deadline_exceeded' });
    finish(json({ error: 'invalid_grant' }, 400));
    await vi.advanceTimersByTimeAsync(1);
    expect(publish).not.toHaveBeenCalled();
    await expect(authentication.complete(url, 'browser-a', accept)).rejects.toThrow();
  });
});
