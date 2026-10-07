# Accounts, participation and transport: limits and constraints

[Feature contract](../projects/completed/multiplayer-authority-feature-spec.md) · [Implementation work](../maintainers/multiplayer.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [authority.ts](../../apps/server/src/authority.ts), [authentication.ts](../../apps/server/src/authentication.ts), [world-service.ts](../../apps/server/src/world-service.ts), [http.ts](../../apps/server/src/http.ts), [participation.ts](../../packages/domain/src/participation.ts).

## LA163

**Current — source inspected October 6, 2026 · Restrictiveness: Safe.**

The browser JSON decoder permits **16,384 bytes** by default, **131,072 bytes (128 KiB)** for the exact `/api/world-agent/authoring` pathname, and **1,048,576 bytes (1 MiB)** only for `/api/god/editor/` paths. Creator permission alone does not enlarge other routes. Declared and actual bytes are checked, invalid UTF-8 is rejected, and body reading has a **10-second** deadline. The browser API also counts at most **16 MiB** of retained in-flight body chunks across requests; this accounting is not a bound on parsed objects, concatenation copies or all HTTP memory. Inner action/editor schemas retain their independent limits.

**Reason / tradeoff:** Keep download/parse protection while ensuring every advertised editor operation can fit through its HTTP request limit.

[Shared decoder and route limits](../../apps/server/src/http-json.ts) · [Browser request accounting](../../apps/server/src/http.ts) · [HTTP/MCP parity](../world-agent-mcp.md#local-transport-parity).

Original recommendation: **Review**.

## LA164

**Changed · Restrictiveness: Safe.**

Default player capacity is 100; HTTP streams, service connections and scoped projection caches allow 300. `OPEN_LEGEND_PLAYER_CAPACITY` (1–10,000) scales these together at three connections/cache scopes per player.

**Reason / tradeoff:** First-release players need reconnect/tab headroom without cache thrashing. Admission is not a hosted-capacity or simulation-speed promise. [Evidence](../verification/immediate-gameplay-limits.md#immediate-gameplay-limits).

## LA165

**Current — source inspected October 6, 2026 · Restrictiveness: Safe.**

Each scoped gameplay-update channel retains at most **64** incremental update frames and at most **1 MiB** of their encoded bytes; oldest frames are removed until both limits hold. This is **per scope, not server-wide**. The number of channels is bounded by [LA164](#la164). A channel also retains its latest full permitted view, and a client outside the retained update chain receives that view as a reset. Full views, temporary diff/serialization work and socket buffers are not included in the 1-MiB update budget. Private authoring/progress streams use [their separate replaceable-snapshot owner](inventions.md#ws01--world-agent-stream-delivery), not this reconnect ring.

**Reason / tradeoff:** Bound retained incremental history while allowing recovery from an old cursor. Complete-view size and aggregate projection memory still require population/workload qualification; a per-scope ring does not establish that capacity.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Keep**.

## LA166

**Current — source inspected October 6, 2026 · Restrictiveness: Safe.**

When a gameplay or private-snapshot stream reports backpressure, a **30-second** timer destroys that connection if it remains blocked. A drain clears the timer and permits sending again; this is a continuous blocked-write limit, not a total connection lifetime. Scope revocation may close it sooner. Closing a private stream does not cancel an already admitted authoring operation.

**Reason / tradeoff:** Keep slow-client cleanup so one disconnected or stalled browser cannot retain server resources indefinitely.

[Gameplay stream](../../apps/server/src/http.ts) · [Private snapshot stream](../../apps/server/src/private-snapshot-stream.ts).

Original recommendation: **Keep**.

## LA233

**Current (October 3, 2026) · Restrictiveness: Safe.**

A verified foreground heartbeat expires after 12 seconds. A successful control return reserves the first heartbeat’s position for the same 12-second window through existing bounded message-order records; it prevents simultaneous acquisition before the stream opens without counting as foreground activity. Counters are ordered within each control generation, so a stable tab ID can reload with a fresh counter. A paused browser closes its stream and heartbeat immediately; only a current controller’s verified presence or admitted connected-background policy can keep the world running. Browser tabs always pause on blur; the saved background policy is available only to clients that deliberately retain a controlling connection.

**Reason / tradeoff:** Keep departure detection while ensuring ordinary browser timer delays do not unexpectedly pause active play.

[Presence, ordering and pause owner](../../apps/server/src/world-service.ts).

Original recommendation: **Review**.

## MP01

**Reported · Restrictiveness: Very safe.**

**One character binding per account per world**, one account per bound character, and one controlling browser connection per character.

**Reason / tradeoff:** Provide one unambiguous embodiment/control lease; multiple embodiments require a product/control model.

## MP02

**Current (September 28, 2026) · Restrictiveness: Safe.** Previously reported as five permissions with every session requiring play plus a character binding.

Six fixed permissions: play, spectate, create, inspect, save and manage access. A grant either binds **one character** (the only grant that may include play) or **no character**. A characterless operator/spectator session holds no control lease, never counts as a participating connection for exit or shared pause, and reaches only the explicit route allowlist in [operations-routes.ts](../../apps/server/src/operations-routes.ts); every character route rejects it with `characterless`. Characterless creator editing (god/editor routes) and promoting a characterless account to a character are not supported.

**Reason / tradeoff:** Operators and spectators need entry without a playable embodiment; an allowlist keeps character-assuming routes from receiving a scope with no actor. Characterless god tools need their own UI and caller audit. [Design](../projects/completed/multiplayer-entry-maintenance.md#decisions).

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

Sole-tab opening, reload and refocus enter automatically. Only switching between open game tabs requires **Resume Here**. Leaving pauses browser work and releases command control; the selected page remains discoverable while open, so focus cannot silently transfer play. Tab IDs survive reload; a copied live identity is replaced before requests. Browser discovery waits at most 200 ms per probe and runs only on identity startup or foreground entry, with no background polling. The server permits non-replacing acquisition of the same page or a body without a live controller, while current scope and expected control revision reject stale commands, releases and heartbeats. Control, entry snapshot and logout requests retain the 15-second network deadline. Timeout does not undo a committed effect.

**Reason / tradeoff:** Remove needless Resume clicks in one tab while protecting deliberate multi-tab control. Browser liveness is an advisory presentation mechanism; the server independently fences effects. A crashed page may remain protected by a verified heartbeat until its existing 12-second expiry; saved control alone never establishes another open tab. Logout ends the shared game login in all its tabs; it does not end the external provider session or separate device logins. Characterless operations and single-character assignment remain unchanged. [Design](../projects/completed/tab-resume-feature-spec.md), [MP18](../maintainers/multiplayer.md#mp18--explicit-tab-resume).

**Changed decision:** October 3 correction replaces mandatory explicit Resume on every entry/refocus and page-lifetime IDs. The earlier implementation required unnecessary clicks even in one tab; this correction reserves the dialog for switching open tabs.

## MP10

**Current — source inspected October 6, 2026 · Restrictiveness: Very safe.**

Beginning an exit records the pending phase and operational deadline; it does not itself cancel the current action. At committed departure after the grace period, the participation owner cancels active and suspended plans/actions, releases their held work/resources and deactivates action-occupying effects without undoing spent inputs or completed effects. The inactive body then stops physical participation, hazards and survival progression; detached property remains active. Return during the grace period and return after committed departure are distinct paths.

**Reason / tradeoff:** Protect absent humans after settled departure without pretending the disconnect instantly undoes ongoing activity. [Domain transition](../../packages/domain/src/participation.ts) · [Operational deadline and commit](../../apps/server/src/world-service.ts).

## MP11

**Current — source inspected October 6, 2026 · Restrictiveness: Very safe.**

Return **after committed inactivity** tries the saved return anchor (or current supported position when no anchor is stored), then **one authored fallback**. The first valid standing position is used and flight/falling state is cleared; no nearby-location search runs. If both candidates fail, the body remains inactive with an explicit failure. Returning from the still-pending exit instead restores active participation without relocation.

**Reason / tradeoff:** Use a deterministic supported return without moving a character whose departure has not committed. Nearby search or restoring airborne inactivity need separate semantics. [Implementation](../../packages/domain/src/participation.ts).

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

Invite links are **single-use** bearer links with a 256-bit token stored only as a SHA-256 hash and shown once. Expiry is **1 hour to 30 days** (default **7 days**); a world has at most **100 pending invites**, and one character can have one pending player invite. The token survives the OIDC round trip in an HttpOnly cookie for **15 minutes**. A redeemer that already holds a grant in the world leaves the invite unused. Issuers delegate only capabilities they hold; player invites bind a living person with no current or historical human owner ([MP06](#mp06)). The console lists the newest **200** invites and at most **500** grants ordered by account ID; the grant list is not a newest-grants list.

**Reason / tradeoff:** Short-lived, revocable, one-time links limit exposure of a forwarded link; bounded pending/list sizes keep the console and admission checks small. Expired or used links require a new invite. [Implementation](../../apps/server/src/invites.ts).

## MP16

**Current (September 28, 2026) · Restrictiveness: Safe.**

Creator maintenance allows **one scheduled or active window** per world. A start may be at most **366 days** ahead; the announced duration is **5 minutes to 7 days**, and an active window can be extended up to **7 days** past the current time. Messages are at most **280 characters**. Each window keeps **20** audit changes, and **20** finished or cancelled windows are retained for creators. Players see cancelled or finished notices for **30 minutes**. A scheduled start that loses the writer lane to overload retries after **1 second**; any other persistence failure pauses the world with a storage error.

**Reason / tradeoff:** One window keeps notices unambiguous; the announced end is an estimate, never an automatic resume. Recurring or overlapping schedules need a product decision. [Implementation](../../apps/server/src/maintenance.ts).

## MP17

**Current — source inspected October 6, 2026 · Restrictiveness: Safe.**

The World operations console refreshes every **5 seconds** while visible and opens no event stream. The spectator overview sends the terrain tile map and at most **2,000** world-placed bodies as generic categories with X/Z positions rounded to 0.1; further eligible bodies are counted as omitted. Retired objects and inactive humans are excluded. The selected rows are sorted by category and coordinates, but selection happens first in entity-enumeration order: sorting does not make the omitted subset independent of insertion history. The projection omits explicit names, identifiers, human/NPC distinction, inventories, speech and knowledge; public category/location patterns are not a promise of anonymity.

**Reason / tradeoff:** Polling keeps operator/spectator tabs out of presence and control accounting. The body-row limit does not bound the complete payload or preparation: terrain is sent separately and constructing a new overview enumerates all entities before caching it for the current service revision. Larger maps/populations and richer spectator presentation need explicit work/payload and disclosure qualification, not a claim that 2,000 rows bounds all costs. [Implementation](../../apps/server/src/operations-routes.ts).

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

**Current — source inspected October 6, 2026 · Restrictiveness: Safe.**

A **configured startup binding** limits its provider subject to **512 characters**. This is not a universal login-identity bound: verified OIDC callback identities require a nonempty string, and the account repository stores that verified subject without applying the startup binding schema. Provider verification, subject identity and configuration length validation have separate owners.

**Reason / tradeoff:** Bound operator-supplied startup configuration without misrepresenting it as a limit enforced on every authenticated account. Any additional identity-input rejection needs a concrete consumer/risk under the root validation policy, not a duplicate configuration check.

[Startup binding and account storage](../../apps/server/src/authority.ts) · [Verified callback](../../apps/server/src/authentication.ts).

## PB14

**Reported · Restrictiveness: Safe.**

Configured account/character IDs: **100 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../apps/server/src/authority.ts).
