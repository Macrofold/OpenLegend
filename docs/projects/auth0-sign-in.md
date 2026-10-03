# Auth0 sign-in

On October 1, 2026 Mike selected Auth0 as the world login service ([D05](../../archive/05-project/open-decisions.md)) and asked for a plan to run it locally. This plan covers only repository changes. Creating the Auth0 tenant, its dashboard settings and personal credentials stay outside the repository; credentials live only in an untracked local `.env`. It builds on [entry and maintenance](multiplayer-entry-maintenance.md) (invites and World operations). Estimated 30–60 changed logic lines plus documentation. The change is small but touches the authentication boundary, so this durable plan records its rules and checks. Implementation is not yet authorized.

## Why a code change is needed

OIDC sign-in is a series of browser redirects plus the game server's own outbound HTTPS requests to the login service. Auth0 never connects to the game, so local testing needs no tunnel, webhook or public address.

The current configuration accepts plain HTTP only when **both** the game address and the login service are on the local machine, a rule written for a disposable local Keycloak. Auth0 is always an HTTPS service on the internet. A local game at `http://localhost:<port>` with Auth0 therefore stops at startup with “OIDC requires HTTPS; explicit development HTTP is loopback-only.” Players on other machines still need an HTTPS public address, which is hosting work under D05 and out of scope here.

## Scope (IDP01)

1. **Configuration** ([config.ts](../../apps/server/src/config.ts)): judge the two addresses separately.
   - The game's public address may use HTTP only on a loopback host (`localhost`, `127.0.0.1`, `::1`). This keeps the existing explicit `OPEN_LEGEND_OIDC_LOOPBACK_HTTP=true` opt-in and a loopback bind address.
   - The login service may use HTTP only on a loopback host. An HTTPS login service is always accepted.
   - HTTP on any non-loopback host stays refused for both.
2. **Login adapter** ([authentication.ts](../../apps/server/src/authentication.ts)): relax the `openid-client` HTTPS requirement only when the login service itself uses HTTP (local Keycloak), never for an HTTPS service such as Auth0.
3. **Cookies** ([http.ts](../../apps/server/src/http.ts)): session, login and invite cookies are `Secure` whenever the public address is HTTPS. The flag is omitted only for an HTTP loopback address. Today the rule follows the opt-in setting instead of the actual address.
4. **Issuer spelling** ([config.ts](../../apps/server/src/config.ts)): store the configured issuer and every binding's issuer in normalized URL form. Auth0 signs tokens with `https://<tenant>/` (trailing slash), so both spellings in configuration must match. Issuers with a path, such as Keycloak realms, are unchanged.

No UI or protocol change is needed. Invites, World operations and account bindings work unchanged with Auth0 user IDs (for example `auth0|…` or `google-oauth2|…`).

## Decisions

- **No tunnel for local testing.** Use plain `http://localhost` with the opt-in. Sharing a running local server with other machines needs HTTPS hosting or a tunnel and belongs to D05.
- **Client type.** A server-side web application with a client secret (the existing `OPEN_LEGEND_OIDC_CLIENT_SECRET`) and authorization code with PKCE, unchanged.
- **Separate environments.** Development uses its own Auth0 tenant, application and disposable world. Production uses a separate tenant whose own login domain is fixed before real players ([IDP02](../maintainers/multiplayer.md#identity-provider--auth0)), because each OpenLegend account is keyed by login-service address plus user ID.
- **First owner.** The first owner is still configured once through `OPEN_LEGEND_ACCOUNT_BINDINGS` with the Auth0 user ID copied from the dashboard; later people join by invite. No new bootstrap feature.

## Verification

- Static: pinned Prettier on changed files, `pnpm typecheck`, `pnpm build`.
- Configuration cases checked directly without a server.
  - Accepted: an HTTP loopback game address with an HTTPS issuer and the opt-in; HTTP loopback for both with the opt-in; HTTPS for both.
  - Refused: an HTTP loopback game address without the opt-in; an HTTP non-loopback game address; an HTTP non-loopback issuer; a non-loopback bind address with an HTTP game address.
- A real Auth0 development tenant, credentials only in the local `.env`, two accounts in separate browser profiles:
  - sign in at the loopback address and take control;
  - invite the second account from World operations, redeem it and play;
  - remove that account's access.
  - Inspect cookies: no `Secure` flag on the loopback HTTP address; `HttpOnly` kept. Confirm the issuer works with and without the trailing slash.
- Re-run the local Keycloak path if Docker is available, to confirm the HTTP-issuer case is unchanged. `AI_BUDGET_USD=0`; no paid model calls.

## Completion criteria

- [ ] Local Auth0 sign-in, invite enrollment and access removal work at an HTTP loopback address against an unmodified HTTPS Auth0 tenant.
- [ ] HTTPS deployments keep `Secure` cookies and full HTTPS checks; HTTP on non-loopback hosts is still refused.
- [ ] Either issuer spelling works, including in account bindings.
- [ ] README setup section, [architecture](../architecture.md#account-authority-and-participation), [AU09](../limits/multiplayer.md#au09), the tracker and the changelog describe the delivered behavior.

## Maintained records

- Implementation: [IDP01–IDP03](../maintainers/multiplayer.md#identity-provider--auth0).
- Limits and constraints: [Accounts, participation and transport inventory](../limits/multiplayer.md#au09).
- Related contract/design: [Multiplayer authority technical design](multiplayer-authority-tech-design.md#3-authentication-adapter-and-local-development).
