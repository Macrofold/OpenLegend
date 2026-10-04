# Accounts, participation and transport: limits and constraints

[Feature contract](../projects/multiplayer-authority-feature-spec.md) · [Implementation work](../maintainers/multiplayer.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [authority.ts](../../apps/server/src/authority.ts), [authentication.ts](../../apps/server/src/authentication.ts), [world-service.ts](../../apps/server/src/world-service.ts), [http.ts](../../apps/server/src/http.ts), [participation.ts](../../packages/domain/src/participation.ts).

## LA163

**Historical — needs recheck · Restrictiveness: Safe.**

An ordinary browser API request may contain 16,384 bytes of JSON, while a world-owner editor request may contain 1,048,576 bytes.

**Reason / tradeoff:** Keep download/parse protection while ensuring every advertised editor operation can fit through its HTTP request limit.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Review**.

## LA164

**Changed · Restrictiveness: Safe.**

Default player capacity is 100; HTTP streams, service connections and scoped projection caches allow 300. `OPEN_LEGEND_PLAYER_CAPACITY` (1–10,000) scales these together at three connections/cache scopes per player.

**Reason / tradeoff:** First-release players need reconnect/tab headroom without cache thrashing. Admission is not a hosted-capacity or simulation-speed promise. [Evidence](../verification/immediate-gameplay-limits.md#immediate-gameplay-limits).

## LA165

**Historical — needs recheck · Restrictiveness: Safe.**

The server retains at most 64 recent incremental browser updates or 1 MiB of those updates for reconnecting clients.

**Reason / tradeoff:** Keep the small reconnect buffer because clients can receive a complete current-state snapshot when older updates are unavailable.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Keep**.

## LA166

**Historical — needs recheck · Restrictiveness: Safe.**

A browser live-update connection that cannot accept outgoing data is closed after 30 seconds.

**Reason / tradeoff:** Keep slow-client cleanup so one disconnected or stalled browser cannot retain server resources indefinitely.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Keep**.

## LA233

**Historical — needs recheck · Restrictiveness: Safe.**

A verified foreground heartbeat expires after 12 seconds. A paused browser closes its stream and heartbeat immediately; only a current controller’s verified presence or admitted connected-background policy can keep the world running. Browser tabs always pause on blur; the saved background policy is available only to clients that deliberately retain a controlling connection.

**Reason / tradeoff:** Keep departure detection while ensuring ordinary browser timer delays do not unexpectedly pause active play.

[Implementation starting point](../../apps/server/src/ai-director.ts).

Original recommendation: **Review**.

## MP01

**Reported · Restrictiveness: Very safe.**

**One character binding per account per world**, one account per bound character, and one controlling browser connection per character.

**Reason / tradeoff:** Provide one unambiguous embodiment/control lease; multiple embodiments require a product/control model.

## MP02

**Current (September 28, 2026) · Restrictiveness: Safe.** Previously reported as five permissions with every session requiring play plus a character binding.

Six fixed permissions: play, spectate, create, inspect, save and manage access. A grant either binds **one character** (the only grant that may include play) or **no character**. A characterless operator/spectator session holds no control lease, never counts as a participating connection for exit or shared pause, and reaches only the explicit route allowlist in [operations-routes.ts](../../apps/server/src/operations-routes.ts); every character route rejects it with `characterless`. Characterless creator editing (god/editor routes) and promoting a characterless account to a character are not supported.

**Reason / tradeoff:** Operators and spectators need entry without a playable embodiment; an allowlist keeps character-assuming routes from receiving a scope with no actor. Characterless god tools need their own UI and caller audit. [Design](../projects/multiplayer-entry-maintenance.md#decisions).

## MP03

**Reported · Restrictiveness: Medium.**

Login supports local mode or **one configured OpenID Connect provider**—an external login service—with one public origin.

**Reason / tradeoff:** Keep identity-provider and origin configuration simple for the initial deployment.

## MP05

**Current (September 28, 2026) · Restrictiveness: Safe.** Previously reported as operator provisioning only.

New world access comes from startup bindings or an **operator-issued invite** ([MP15](#mp15)) redeemed through OIDC sign-in; no manual database edits are needed. There is **no open public sign-up**. Startup bindings initialize access once and may omit the character for a characterless operator; later configuration changes do not overwrite existing grants.

**Reason / tradeoff:** Invites keep every grant attributable to a manager's explicit decision. Open sign-up needs an owner decision on abuse controls and default grants ([D68](../../archive/05-project/open-decisions.md#d68--world-entry-beyond-invites)).

## MP06

**Reported · Restrictiveness: Very safe.**

A character’s historical human owner **cannot transfer to another account**. Rebinding leaves the former character human-owned rather than making it an NPC; both characters depart before new control is acquired.

**Reason / tradeoff:** Protect historical private human ownership; transferring it needs consent and historical access rules.

## MP09

**Current (October 3, 2026) · Restrictiveness: Medium.**

One explicit **Resume here** admits the assigned character to a page. Leaving the tab pauses it and releases control; refocus refreshes information only. A blocking dialog replaces the former read-only follower/Control here presentation. Page IDs last for one page lifetime; reload also requires Resume. Another current controller is described without exposing its identity or tab ID. Expected control revision and current request scope reject old commands, releases and heartbeats in local and OIDC modes. Pause/Resume control requests and Resume snapshot reads have a 15-second network deadline, preventing a stuck request from blocking deliberate retry forever. A timeout does not undo a server commit; the next explicit Resume refreshes authority and validates return.

**Reason / tradeoff:** Explicit Resume avoids surprise takeovers and presents one clear entry action. A player returning from another app must resume intentionally. Characterless operations remain separate; this does not introduce multiple character selection. [Design](../projects/completed/tab-resume-feature-spec.md), [MP18](../maintainers/multiplayer.md#mp18--explicit-tab-resume).

## MP10

**Reported · Restrictiveness: Very safe.**

Departure cancels actions/plans and action-occupying effects. After the grace period, the character stops physical participation, hazards and survival progression; detached property remains active.

**Reason / tradeoff:** Protect absent humans from unattended hazards while leaving detached world property alive.

## MP11

**Reported · Restrictiveness: Very safe.**

Return tries only **the saved supported position, then one authored fallback**. It requires a standing position, clears flight/falling state, and performs no nearby-location search.

**Reason / tradeoff:** Use a deterministic supported return; nearby search/airborne restoration need additional semantics.

## MP12

**Reported · Restrictiveness: Very safe.**

Shared-world simulation pauses when no controlling connection satisfies the presence/background-play policy.

**Reason / tradeoff:** Avoid unattended shared progression unless the accepted background-play policy admits it.

## MP13

**Reported · Restrictiveness: Very safe.**

**Player-to-player strikes are universally blocked in the kernel.** No configurable PvP policy was implemented.

**Reason / tradeoff:** Cooperative-first default; the kernel currently makes it universal instead of an authored PvP policy.

## MP14

**Reported · Restrictiveness: Very safe.**

The world-assistant discussion feature requires creator permission.

**Reason / tradeoff:** World editing discussion uses creator authority; collaborative authoring roles are not yet supported.

## MP15

**Current (September 28, 2026) · Restrictiveness: Safe.**

Invite links are **single-use** bearer links with a 256-bit token stored only as a SHA-256 hash and shown once. Expiry is **1 hour to 30 days** (default **7 days**); a world has at most **100 pending invites**, and one character can have one pending player invite. The token survives the OIDC round trip in an HttpOnly cookie for **15 minutes**. A redeemer that already holds a grant in the world leaves the invite unused. Issuers delegate only capabilities they hold; player invites bind a living person with no current or historical human owner ([MP06](#mp06)). The console lists the newest **200** invites and **500** grants.

**Reason / tradeoff:** Short-lived, revocable, one-time links limit exposure of a forwarded link; bounded pending/list sizes keep the console and admission checks small. Expired or used links require a new invite. [Implementation](../../apps/server/src/invites.ts).

## MP16

**Current (September 28, 2026) · Restrictiveness: Safe.**

Creator maintenance allows **one scheduled or active window** per world. A start may be at most **366 days** ahead; the announced duration is **5 minutes to 7 days**, and an active window can be extended up to **7 days** past the current time. Messages are at most **280 characters**. Each window keeps **20** audit changes, and **20** finished or cancelled windows are retained for creators. Players see cancelled or finished notices for **30 minutes**. A scheduled start that loses the writer lane to overload retries after **1 second**; any other persistence failure pauses the world with a storage error.

**Reason / tradeoff:** One window keeps notices unambiguous; the announced end is an estimate, never an automatic resume. Recurring or overlapping schedules need a product decision. [Implementation](../../apps/server/src/maintenance.ts).

## MP17

**Current (September 28, 2026) · Restrictiveness: Safe.**

The World operations console refreshes every **5 seconds** while visible and opens no event stream. The spectator overview contains terrain and at most **2,000** bodies as generic categories with positions rounded to 0.1, sorted to remove creation order; further bodies are counted as omitted. It contains no names, identifiers, human/NPC distinction, possessions, speech or knowledge, and departed humans are absent.

**Reason / tradeoff:** Polling keeps operator/spectator tabs out of presence and control accounting; the overview bound caps payload size in dense worlds. Richer spectator presentation (for example a 3D camera) needs renderer support and a privacy decision. [Implementation](../../apps/server/src/operations-routes.ts).

## AU01

**Reported · Restrictiveness: Safe.**

Startup account bindings: **256**.

**Reason / tradeoff:** Bound configuration payload and provisioning work; this is not a lifetime account quota.

## AU02

**Reported · Restrictiveness: Safe.**

Pending logins: **256**, expiring after **5 minutes**; lost on restart.

**Reason / tradeoff:** Bound transient authentication state and stale redirect exposure; restarts require restarting login.

## AU03

**Reported · Restrictiveness: Safe.**

Authentication network timeout: **10 seconds**.

**Reason / tradeoff:** Bound external identity-provider stalls.

## AU04

**Changed · Restrictiveness: Safe.**

Stored sessions: max(4,096, sixteen times configured player capacity); expired sessions are removed before admission.

**Reason / tradeoff:** Preserve existing default headroom and scale sessions with admitted population. Count is an operational bound, not a login-rate promise. [Configuration](../../apps/server/src/config.ts).

## AU05

**Reported · Restrictiveness: Safe.**

Session lifetime: **8 hours default**, configurable **0.1–24 hours**, fixed expiry.

**Reason / tradeoff:** Limit credential exposure duration; operator-configurable fixed expiry omits sliding renewal.

## AU06

**Reported · Restrictiveness: Safe.**

Departure grace: **15 seconds default**, configurable **1–60 seconds**.

**Reason / tradeoff:** Balance brief disconnect tolerance against prompt removal from physical simulation.

## AU07

**Changed · Restrictiveness: Safe.**

Service connection and projection-cache scopes: three times configured player capacity, default 300, matching HTTP stream admission.

**Reason / tradeoff:** Avoid accepting a stream that the authority layer cannot hold, or cyclically evicting active players' view caches. [LA164](#la164).

## AU08

**Changed · Restrictiveness: Safe.**

Presence-order entries: six times configured player capacity, default 600.

**Reason / tradeoff:** Retain reconnect/late-heartbeat ordering for the supported connections without an unlimited map. [Configuration](../../apps/server/src/config.ts).

## AU09

**Current (October 2, 2026) · Restrictiveness: Safe.** Changed by [IDP01](../projects/auth0-sign-in.md); previously plain HTTP required both addresses on this machine, so a local game could not use a hosted provider.

OIDC mode judges the game's public address and the login service separately. HTTPS is always accepted. Plain HTTP is accepted only on a loopback host (`localhost`, `127.0.0.1`, `::1`) with the explicit `OPEN_LEGEND_OIDC_LOOPBACK_HTTP=true` option, and an HTTP game address also requires a loopback bind address. Session, login and invite cookies are `Secure` whenever the public address is HTTPS. The HTTPS checks in the login library are relaxed only for a plain-HTTP provider. Configured and binding issuers are normalized, so a bare-host issuer matches with or without its trailing slash.

**Reason / tradeoff:** Keep credentials and session cookies off plain HTTP outside the local machine while allowing local development against a hosted provider such as Auth0. [Configuration](../../apps/server/src/config.ts).

## PB13

**Reported · Restrictiveness: Safe.**

Login provider subject: **512 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../apps/server/src/authentication.ts).

## PB14

**Reported · Restrictiveness: Safe.**

Configured account/character IDs: **100 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../apps/server/src/authority.ts).
