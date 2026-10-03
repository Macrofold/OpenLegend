# Auth0 sign-in

| Status      | Current progress                                                                                                                                | Last updated |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Real local sign-in, player control and Macrofold operation work; the broader two-account invite and access-removal checks remain open in IDP01. | 2026-10-03   |

On October 1, 2026 Mike selected Auth0 as the world login service ([D05](../../archive/05-project/open-decisions.md)) and asked for a plan to run it locally. This plan covers only repository changes. Creating the Auth0 tenant, its dashboard settings and personal credentials stay outside the repository; credentials live only in an untracked local `.env`. It builds on [entry and maintenance](multiplayer-entry-maintenance.md) (invites and World operations). Estimated 30–60 changed logic lines plus documentation. The change is small but touches the authentication boundary, so this durable plan records its rules and checks. Mike subsequently authorized implementation and the local integration continuation below.

## Why a code change is needed

OIDC sign-in is a series of browser redirects plus the game server's own outbound HTTPS requests to the login service. Auth0 never connects to the game, so local testing needs no tunnel, webhook or public address.

The original configuration accepted plain HTTP only when **both** the game address and the login service are on the local machine, a rule written for a disposable local Keycloak. Auth0 is always an HTTPS service on the internet. A local game at `http://localhost:<port>` with Auth0 therefore stopped at startup with “OIDC requires HTTPS; explicit development HTTP is loopback-only.” Players on other machines still need an HTTPS public address, which is hosting work under D05 and out of scope here.

## Scope (IDP01)

1. **Configuration** ([config.ts](../../apps/server/src/config.ts)): judge the two addresses separately.
   - The game's public address may use HTTP only on a loopback host (`localhost`, `127.0.0.1`, `::1`). This keeps the existing explicit `OPEN_LEGEND_OIDC_LOOPBACK_HTTP=true` opt-in and a loopback bind address.
   - The login service may use HTTP only on a loopback host. An HTTPS login service is always accepted.
   - HTTP on any non-loopback host stays refused for both.
2. **Login adapter** ([authentication.ts](../../apps/server/src/authentication.ts)): relax the `openid-client` HTTPS requirement only when the login service itself uses HTTP (local Keycloak), never for an HTTPS service such as Auth0.
3. **Cookies** ([http.ts](../../apps/server/src/http.ts)): session, login and invite cookies are `Secure` whenever the public address is HTTPS. The flag is omitted only for an HTTP loopback address. This actual-address rule is implemented; the original opt-in-based rule was the pre-change defect.
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
- [x] Configuration/code checks establish that HTTPS origins retain `Secure` cookies and HTTPS enforcement, while non-loopback HTTP is refused. Hosted deployment remains IDP02, not evidence from these local checks.
- [x] Both issuer spellings normalize consistently, including account bindings, in the recorded configuration checks.
- [x] README setup, [architecture](../architecture.md#account-authority-and-participation), [AU09](../limits/multiplayer.md#au09), the tracker and changelog describe the delivered configuration and partial live acceptance.

## Maintained records

- Implementation: [IDP01–IDP03](../maintainers/multiplayer.md#identity-provider--auth0).
- Limits and constraints: [Accounts, participation and transport inventory](../limits/multiplayer.md#au09).
- Related contract/design: [Multiplayer authority technical design](multiplayer-authority-tech-design.md#3-authentication-adapter-and-local-development).

## Authorized local integration continuation — October 3, 2026

Mike authorized making the current worktree work with real Auth0 and Macrofold, including correcting local configuration and bounded live verification. The remaining setup uses existing implementations; no new authentication, provider protocol or authoring contract is proposed.

- Keep Macrofold on its existing port and the game on the Auth0-approved game origin. Preserve the current world and unrelated Macrofold work.
- Use the dedicated Jev route, existing encrypted provider credentials, selected isolated Worker and asynchronous inference admission. Verify decisions, structured replies and native memory through real downstream callers within the shared $10 task ceiling. Unknown costs retain their reservations.
- Replace the obsolete development tool connection with an exact game endpoint, a new random bearer secret stored encrypted by Macrofold, its hash and seven-day expiry in ignored game configuration, and the exact current world. Existing authenticated authoring sessions and human approval continue to control writes. Limit approved tools to the implemented OpenLegend catalogue and select the connection explicitly.
- Add only the exact game origin to Macrofold's supported local-MCP network allowlist. Reload the existing API and dispatcher through their operator-owned lifecycle; never stop unrelated previews or weaken hosted network checks.
- Exercise real Auth0 sign-in, player control, NPC dialogue and a bounded World agent read/conversation. Check connector denial without the credential and session-bound authoring. Reconcile the verification report and relevant trackers; configuration readiness alone does not meet completion.

The authorized local continuation is complete: real Auth0 player control, NPC dialogue and native World Agent read-only execution were observed, and exact prepared changes still require human approval. Scoped workspace grants use the existing conditional access API before paid admission. [Initial local evidence](../verification/macrofold-worker.md#local-auth0-and-worker-setup--october-3-2026) and [completed authoring setup](../verification/macrofold-worker.md#scoped-local-authoring-completion--october-3-2026) retain spending and qualification limits. This does not close the broader two-account invite/access-removal checks in IDP01 or hosted IDP02/IDP03.
