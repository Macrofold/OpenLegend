import * as oidc from 'openid-client';
import { randomBytes } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  createNetworkOwner,
  NetworkError,
  requestBytes,
  type NetworkOperation,
  type ConsumptionContext,
} from '@open-legend/network';
import type { AppConfig } from './config.js';
import { AuthorityError, type VerifiedIdentity } from './authority.js';

export interface AuthenticationAdapter {
  begin(browserToken: string, changeAccount: boolean, signal?: AbortSignal): Promise<URL>;
  complete<T>(
    callback: URL,
    browserToken: string | undefined,
    accept: (identity: VerifiedIdentity, context: ConsumptionContext) => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T>;
}
/** Tokens are exchanged and verified only on the server. Pre-login state is one-use,
 * browser-bound, bounded and deliberately does not survive process restart.
 */
export class OpenIdAuthentication implements AuthenticationAdapter {
  private readonly network = createNetworkOwner({ role: 'server-authentication', capacity: 16 });
  private readonly operation = new AsyncLocalStorage<NetworkOperation>();
  private configuration?: Promise<oidc.Configuration>;
  private transactions = new Map<
    string,
    { browserToken: string; verifier: string; nonce: string; expiresAt: number }
  >();
  constructor(
    private readonly config: AppConfig['authentication'],
    private readonly now = Date.now,
  ) {}
  /** The cached SDK configuration must resolve the current login's budget,
   * rather than retaining the first login's cancellation signal. */
  private readonly fetch: oidc.CustomFetch = async (input, init) => {
    const operation = this.operation.getStore();
    if (!operation) throw new Error('Identity-provider request has no admitted operation.');
    if (init.body instanceof ReadableStream)
      throw new Error('Identity-provider streaming request bodies are not supported.');
    const response = await requestBytes(operation, {
      url: input,
      init: {
        ...init,
        body: init.body instanceof Uint8Array ? new Uint8Array(init.body).buffer : init.body,
      },
      requestTimeoutMs: 10_000,
      bodyPolicy: { kind: 'bounded', maxBytes: 1_048_576 },
    });
    return new Response(
      [204, 205, 304].includes(response.status) ? null : new Uint8Array(response.bytes).buffer,
      {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      },
    );
  };
  private async sdk<T>(start: () => Promise<T>): Promise<T> {
    try {
      return await start();
    } catch (error) {
      // openid-client wraps custom-fetch failures. Preserve the shared timeout
      // classification while retaining SDK validation errors unchanged.
      let cause: unknown = error;
      const seen = new Set<Error>();
      while (cause instanceof Error && !seen.has(cause)) {
        if (cause instanceof NetworkError) throw cause;
        seen.add(cause);
        cause = cause.cause;
      }
      throw error;
    }
  }
  private client() {
    this.configuration ??= this.network.run({ timeoutMs: 10_000 }, (operation) =>
      this.operation.run(operation, () =>
        operation.wait('credentials', () =>
          this.sdk(() =>
            oidc.discovery(
              new URL(this.config.issuer),
              this.config.clientId,
              this.config.clientSecret || undefined,
              undefined,
              {
                timeout: 10,
                [oidc.customFetch]: this.fetch,
                execute: [
                  oidc.enableNonRepudiationChecks,
                  // Only a plain-HTTP provider (local Keycloak) relaxes HTTPS; never a hosted one.
                  ...(new URL(this.config.issuer).protocol === 'http:'
                    ? [oidc.allowInsecureRequests]
                    : []),
                ],
              },
            ),
          ),
        ),
      ),
    );
    // An outage must not permanently cache a failed discovery.
    const configuration = this.configuration;
    void configuration.catch(() => {
      if (this.configuration === configuration) this.configuration = undefined;
    });
    return configuration;
  }
  async begin(browserToken: string, changeAccount: boolean, signal?: AbortSignal): Promise<URL> {
    return this.network.run({ timeoutMs: 30_000, signal }, (operation) =>
      this.operation.run(operation, () => this.beginWithin(operation, browserToken, changeAccount)),
    );
  }
  private async beginWithin(
    operation: NetworkOperation,
    browserToken: string,
    changeAccount: boolean,
  ): Promise<URL> {
    for (const [id, transaction] of this.transactions)
      if (transaction.expiresAt <= this.now()) this.transactions.delete(id);
    if (this.transactions.size >= 256)
      throw new Error('Sign-in capacity reached. Try again shortly.');
    const state = oidc.randomState(),
      nonce = oidc.randomNonce(),
      verifier = oidc.randomPKCECodeVerifier();
    this.transactions.set(state, {
      browserToken,
      verifier,
      nonce,
      expiresAt: this.now() + 300_000,
    });
    try {
      const configuration = await operation.wait('credentials', () => this.client());
      const challenge = await operation.wait('credentials', () =>
        oidc.calculatePKCECodeChallenge(verifier),
      );
      operation.throwIfStopped();
      return oidc.buildAuthorizationUrl(configuration, {
        redirect_uri: `${this.config.origin}/auth/callback`,
        scope: 'openid',
        // Account switching needs the provider's login UI instead of silent SSO.
        ...(changeAccount ? { prompt: 'login' } : {}),
        response_type: 'code',
        state,
        nonce,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });
    } catch (error) {
      this.transactions.delete(state);
      throw error;
    }
  }
  async complete<T>(
    callback: URL,
    browserToken: string | undefined,
    accept: (identity: VerifiedIdentity, context: ConsumptionContext) => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    const state = callback.searchParams.get('state');
    const transaction = state ? this.transactions.get(state) : undefined;
    // The browser's one-use authorization expires during verification as well.
    // Invalid/expired state is still consumed and rejected by its authority owner
    // after admission; refusing local capacity must not consume a valid state.
    const deadlineAtMs =
      transaction && transaction.expiresAt > this.now() ? transaction.expiresAt : undefined;
    return this.network.run({ timeoutMs: 30_000, deadlineAtMs, signal }, (operation) =>
      this.operation.run(operation, async () => {
        const identity = await this.completeWithin(operation, callback, browserToken);
        operation.throwIfStopped();
        return operation.wait('callback', () => accept(identity, operation));
      }),
    );
  }
  private async completeWithin(
    operation: NetworkOperation,
    callback: URL,
    browserToken: string | undefined,
  ): Promise<VerifiedIdentity> {
    const state = callback.searchParams.get('state');
    const transaction = state ? this.transactions.get(state) : undefined;
    if (state) this.transactions.delete(state);
    if (
      !transaction ||
      !browserToken ||
      transaction.browserToken !== browserToken ||
      transaction.expiresAt <= this.now()
    )
      throw new AuthorityError('session');
    const configuration = await operation.wait('credentials', () => this.client());
    const tokens = await operation.wait('credentials', () =>
      this.sdk(() =>
        oidc.authorizationCodeGrant(configuration, callback, {
          pkceCodeVerifier: transaction.verifier,
          expectedState: state!,
          expectedNonce: transaction.nonce,
          idTokenExpected: true,
        }),
      ),
    );
    operation.throwIfStopped();
    const claims = tokens.claims();
    if (
      !claims ||
      claims.iss !== this.config.issuer ||
      typeof claims.sub !== 'string' ||
      !claims.sub
    )
      throw new AuthorityError('session');
    return { issuer: claims.iss, subject: claims.sub };
  }
}
export const browserLoginToken = () => randomBytes(32).toString('hex');
