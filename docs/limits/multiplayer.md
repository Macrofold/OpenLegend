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

**Current — checked · Restrictiveness: Very safe.**

The HTTP server permits 8 simultaneous live-update streams; the service separately permits 32 connections (AU07). These are not 100-player capacity.

**Reason / tradeoff:** Conservative connection/fan-out containment; the smaller HTTP ceiling is the effective shared-play blocker.

[Implementation starting point](../../apps/server/src/http.ts).

Original finding and recommendation superseded by the merged implementation; the ID remains stable.

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

A browser presence record expires after 12 seconds without its periodic connection-status message, with connected-background-play behavior also affecting whether the world pauses.

**Reason / tradeoff:** Keep departure detection while ensuring ordinary browser timer delays do not unexpectedly pause active play.

[Implementation starting point](../../apps/server/src/ai-director.ts).

Original recommendation: **Review**.

## MP01

**Reported · Restrictiveness: Very safe.**

**One character binding per account per world**, one account per bound character, and one controlling browser connection per character.

**Reason / tradeoff:** Provide one unambiguous embodiment/control lease; multiple embodiments require a product/control model.

## MP02

**Reported · Restrictiveness: Very safe.**

Five fixed permissions: play, create, inspect, save and manage access. Every ordinary world session requires **play plus a character binding**; no independent spectator/admin session.

**Reason / tradeoff:** Use the first playable account model; spectators and characterless operators need separate sessions.

## MP03

**Reported · Restrictiveness: Medium.**

Login supports local mode or **one configured OpenID Connect provider**—an external login service—with one public origin.

**Reason / tradeoff:** Keep identity-provider and origin configuration simple for the initial deployment.

## MP05

**Reported · Restrictiveness: Very safe.**

New world access comes from operator provisioning; no self-service character enrollment. Startup bindings initialize access once; later configuration changes do not overwrite existing grants.

**Reason / tradeoff:** Keep enrollment under explicit operator grants; self-service onboarding has not been implemented.

## MP06

**Reported · Restrictiveness: Very safe.**

A character’s historical human owner **cannot transfer to another account**. Rebinding leaves the former character human-owned rather than making it an NPC; both characters depart before new control is acquired.

**Reason / tradeoff:** Protect historical private human ownership; transferring it needs consent and historical access rules.

## MP09

**Reported · Restrictiveness: Medium.**

Shared play requires explicit control acquisition/replacement. Viewing tabs do not keep a character participating without its controlling connection.

**Reason / tradeoff:** Only the controlling connection drives presence, avoiding viewing tabs silently keeping a character active.

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

**Reported · Restrictiveness: Safe.**

Stored login sessions: **4,096**.

**Reason / tradeoff:** Bound retained authentication sessions; may block growth well before 10,000 concurrent players.

## AU05

**Reported · Restrictiveness: Safe.**

Session lifetime: **8 hours default**, configurable **0.1–24 hours**, fixed expiry.

**Reason / tradeoff:** Limit credential exposure duration; operator-configurable fixed expiry omits sliding renewal.

## AU06

**Reported · Restrictiveness: Safe.**

Departure grace: **15 seconds default**, configurable **1–60 seconds**.

**Reason / tradeoff:** Balance brief disconnect tolerance against prompt removal from physical simulation.

## AU07

**Reported · Restrictiveness: Very safe.**

Service connections: **32**.

**Reason / tradeoff:** Conservative service fan-out admission; cannot support the accepted 100-player workload as set.

## AU08

**Reported · Restrictiveness: Safe.**

Presence-order tracking entries: **128**.

**Reason / tradeoff:** Bound connection-order bookkeeping; coordinate with any increase in concurrent connections.

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
