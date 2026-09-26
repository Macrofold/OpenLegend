import * as oidc from 'openid-client';
import { randomBytes } from 'node:crypto';
import type { AppConfig } from './config.js';
import { AuthorityError, type VerifiedIdentity } from './authority.js';

export interface AuthenticationAdapter {
  begin(browserToken: string): Promise<URL>;
  complete(callback: URL, browserToken: string | undefined): Promise<VerifiedIdentity>;
}
/** Tokens are exchanged and verified only on the server. Pre-login state is one-use,
 * browser-bound, bounded and deliberately does not survive process restart.
 */
export class OpenIdAuthentication implements AuthenticationAdapter {
  private configuration?: Promise<oidc.Configuration>;
  private transactions = new Map<
    string,
    { browserToken: string; verifier: string; nonce: string; expiresAt: number }
  >();
  constructor(
    private readonly config: AppConfig['authentication'],
    private readonly now = Date.now,
  ) {}
  private client() {
    this.configuration ??= oidc.discovery(
      new URL(this.config.issuer),
      this.config.clientId,
      this.config.clientSecret || undefined,
      undefined,
      {
        timeout: 10,
        execute: [
          oidc.enableNonRepudiationChecks,
          ...(this.config.insecureLoopback ? [oidc.allowInsecureRequests] : []),
        ],
      },
    );
    // An outage must not permanently cache a failed discovery.
    void this.configuration.catch(() => {
      this.configuration = undefined;
    });
    return this.configuration;
  }
  async begin(browserToken: string): Promise<URL> {
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
      return oidc.buildAuthorizationUrl(await this.client(), {
        redirect_uri: `${this.config.origin}/auth/callback`,
        scope: 'openid',
        response_type: 'code',
        state,
        nonce,
        code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
        code_challenge_method: 'S256',
      });
    } catch (error) {
      this.transactions.delete(state);
      throw error;
    }
  }
  async complete(callback: URL, browserToken: string | undefined): Promise<VerifiedIdentity> {
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
    const tokens = await oidc.authorizationCodeGrant(await this.client(), callback, {
      pkceCodeVerifier: transaction.verifier,
      expectedState: state!,
      expectedNonce: transaction.nonce,
      idTokenExpected: true,
    });
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
