# Multiplayer principal, control and private projections — technical design

**Status:** approved and implemented for this project’s scope; [verification](../verification.md#foundation-priorities-15--implementation-evidence) records evidence and limits. [Feature specification](multiplayer-authority-feature-spec.md) defines the experience. [MP01/MP04 delivery slices](../maintainers/multiplayer.md#priority-2-implementation-slices) contain executable work; MP02/MP03, BW13/BW14, SL and D5/D6 retain their separate scope.

The source audit and staged sequence below retain the design baseline. Current behavior is in the linked canonical owners; focused trackers record completed delivery and separate parent work.

## 1. Baseline and implementation boundary

Research base is main `c70f4c1e932fb9bf0fdcc61efe30ccd1bdb64041`. [WorldService](../../apps/server/src/world-service.ts) initializes `getProfile('local-player')`, exposes one `controlledEntityId`, holds service-level connection/presence collections and serializes mutations. Its current command epoch and timeline records are useful fences. [view.ts](../../apps/server/src/view.ts) memoizes by service and adds that one controlled actor to dependencies; optional asynchronous sections are also service-scoped. These assumptions must be removed from shared request paths, not switched globally before each request.

Preserve the existing writer, domain draft boundary, command receipts, current canonical records and provider cancellation/accounting. The design adds scoped principals/control and projection ownership within one application/database. No second world service per human and no distributed lease protocol is needed for two users.

The accepted [authority boundary](../../archive/07-technical-architecture/data-delivery-and-scale.md#first-shared-world-authority-boundary), [data identities](../../archive/07-technical-architecture/production-data-model.md#4-accounts-worlds-and-simulation-ownership), [knowledge privacy](../knowledge.md#privacy-and-correction) and [base lifecycle](../worlds/base/lifecycle-and-protection.md) take precedence over older single-player convenience APIs.

## 2. Identity and records

| Identity / record          | Meaning and ownership                                                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Account                    | Stable application identity mapped uniquely to a trusted issuer/subject; not an actor name or email address.                                 |
| Authentication session     | Server-owned login state, token hash, account, validity/revocation revision and expiry; outside gameplay rewind.                             |
| Connection                 | One live HTTP/SSE/browser transport instance associated with an authenticated session; no independent game rights.                           |
| World membership/grant     | Current scoped permissions, issuer and monotonic revision, held outside gameplay rewind.                                                     |
| Actor binding              | Which account may request control of which world-local actor; not automatically granted to every member or creator.                          |
| Control lease              | Current controlling connection/session, account/actor, generation and status; replace atomically, never restore an old generation.           |
| Participation state        | Actor's active/exiting/inactive lifecycle and saved return anchor, owned by the world; distinct from authentication and viewport visibility. |
| Operation/command identity | World, principal, epoch, request ID and canonical body digest with result/commit references; independent of a transport connection.          |

Use the production model's existing account/control conventions and consumed repositories. Add only the records needed by this slice. Session secrets, current grants and control counters must be excluded from gameplay checkpoint replacement even if their physical table is colocated with simulation records. Current controller authority is not historical character content.

Constraints include unique trusted `(issuer, subject)`, world-local actor references, one current control generation per actor, and the v1 one-controlled-actor-per-account/world policy. Keep issuer/subject private. Existing `local-player` data is associated with a verified account only through an explicit operator mapping; never award the existing world to the first account that signs in or joins by matching an email/display name.

## 3. Authentication adapter and local development

Introduce a narrow server `AuthenticationAdapter` that returns a verified account identity. The proposed hosted adapter is OpenID Connect authorization-code flow with PKCE through a maintained library, not custom token cryptography or a new identity provider. Configure an allowlisted issuer, client and exact callback URI. Validate state, nonce, issuer, audience, signature and token lifetime; exchange codes server-side. Use a bounded, one-use pre-login transaction and sanitize return destinations. Pin and review the chosen library during MP01.1; the vendor is deployment configuration.

Keep provider tokens out of browser storage, game saves, model context and logs. The browser receives an opaque server session cookie with Secure in hosted mode, HttpOnly, appropriate SameSite and limited path/domain scope. Rotate session identity on login/security changes. Mutations require CSRF/origin protection in addition to authentication. SSE uses the same authenticated origin and does not put bearer credentials in URLs. Authentication/session failures do not fall back to the local creator.

The existing local mode remains explicit, loopback-only and single-principal. It must refuse non-loopback shared deployment. The two-human proof uses two real accounts through the configured authentication adapter, not a client-selected `actorId` header or a fixture switch that bypasses verification. A disposable local identity provider can supply those accounts without choosing a commercial provider.

Application access revocation is authoritative immediately at the application boundary. External identity-provider logout/revocation has the provider's configured notification/session-expiry semantics; do not claim instantaneous detection without implementing that integration. D5 reviews the chosen deployment's session duration, provider outage behavior and abuse controls.

## 4. Request scope and command admission

Pass an immutable scope explicitly into shared entrypoints; do not assign `service.profile` or `service.controlledEntityId` for the duration of a request.

```ts
interface RequestScope {
  accountId: string;
  sessionId: string;
  connectionId?: string;
  worldId: string;
  timelineId: string;
  grantRevision: number;
  actorId?: string;
  controlGeneration?: number;
  audience: 'embodied' | 'authorized-inspection';
}
```

The server constructs this object. A client may send its expected actor/timeline/control generation to detect stale UI, but those fields cannot establish authority. Keep the operation's grant type closed and validated; creator inspection, ordinary actor action, invention, notes and save/load are not interchangeable capabilities.

Proposed route semantics, adapted into the existing HTTP router rather than a second API service:

| Operation                          | Admission contract                                                                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Session/profile/world list         | Authenticated account; return only authorized profile and memberships.                                                             |
| Acquire/replace/release control    | Membership + actor binding + expected control generation + request identity; replacement is explicit.                              |
| Gameplay command/cancel            | Current controlling connection, actor, timeline and grants; native mechanical validation still follows.                            |
| World snapshot/stream/history      | Current permitted audience, knowledge/disclosure state and scoped cursor; control is not required for an authorized follower view. |
| Actor knowledge/edit/creator tools | Operation-specific current grant and owner/participant restrictions; no elevation from an actor ID.                                |
| Receipt lookup                     | Same principal/scope authorization as the stored result; never a public request-ID oracle.                                         |

Admission sequence: authenticate and bound input → resolve current scope → validate expected timeline/control → enter the existing mutation queue → recheck current session/grants/binding → inspect duplicate receipt → perform native proposal/claims → verify current authority and affected revisions in the transaction → commit state/required evidence/receipt → produce scoped response.

Every await before consequential publication requires a freshness check. Long provider work runs outside the writer/SQL transaction and carries original principal, actor, timeline, grants, intent and candidate pins. Completion can be persisted as a private result/uncertain accounting record even when its authority to activate has expired. It never acquires the currently controlling user's powers.

Gameplay duplicate keys include world, principal, command epoch and request ID; the body digest covers normalized action and its intended authority context. Identical current-scope retries return the original receipt; changed bodies conflict. Expired epochs or old timelines reject without execution. Checking a receipt does not bypass current access authorization. Historical result inspection, when permitted, is separate from replaying a gameplay command.

## 5. Control replacement

A control mutation compares the expected generation and increments a durable monotonic counter. It records the controlling connection and returns the new scope. Competing acquisitions serialize; one succeeds, the other receives control-changed feedback and the current permitted state. A new tab must explicitly request takeover rather than winning by packet arrival order.

After replacement, old queued human intentions and stale actor-dependent asynchronous proposals are fenced. Already committed native work remains actor-owned; the new controller sees it and can cancel under the existing action contract. Do not spawn a new actor, restart the action or refund earlier effects. No two sessions can maintain independently writable copies of the same actor inventory.

Connection identity alone is not a durable capability. Reconnect authenticates the account and presents expected state, then renews/replaces control through the same operation. An expired or revoked session cannot keep control by refreshing a heartbeat. Account-to-actor transfers require the separate authorized binding mutation and its audit; a creator role does not implicitly grant impersonation.

## 6. Per-principal projection and streaming

Change `projectView(service, scope)` and dependent catalogue/history/editor/context APIs to consume explicit audience scope. Keep one world snapshot but derive separate permitted views. Replace service-only cache keys with world/timeline, principal or proven equivalent disclosure scope, actor, audience, grant/control/knowledge revisions and relevant source revisions. Never reuse a cached human-private section merely because two clients see the same physical scene.

Split reusable public geometry from actor-specific identity/knowledge/private sections. Sharing an immutable geometry result is allowed only under the same disclosed geometry contract. Rendered entity names, notes, future actions, inventories and perception may differ by observer. Current body-sense versus foreground-view policy remains with EPR/D51; do not treat camera position or the existence of a stream as a new disclosure grant.

Each stream maintains its own base revision and scope generation. A patch carries world/timeline/scope and view revisions, explicit removals, and replacement semantics for private sections. Scope changes clear private client state before installing a new snapshot. A Last-Event-ID or cursor from another actor, principal, grant generation or timeline is rejected/resynchronized, not replayed against a different audience. No unconditional catch-up from an unfiltered event log.

Asynchronous optional sections bind the scope token at launch and recheck it immediately before publication. Revocation invalidates caches, cancels pending section publication and closes or resets affected streams. Egress uses the current in-process authority revision after the revocation commit; no new private message may be enqueued under the old grant. Bytes legitimately sent before revocation cannot be recalled from the network or a user's device—this is prospective access control, not a promise to erase previous observation.

Limit pending per-connection bytes and age. Coalesce replaceable snapshots, not distinct committed speech or effects. A slow client receives a scoped resync requirement or disconnect rather than an unbounded queue. Authorization failures must not reveal hidden result counts, names or even revisions through diagnostics. Creator-safe NPC inspection and human-private owner/participant access remain separate paths through the same scope validator.

## 7. Presence, exit and return

Use server transport/session facts to propose lifecycle operations; browser visibility is an input to the existing view/pause policy, not authentication or logout. Track participating connections separately from stale followers. A noncontrolling follower may request control explicitly but does not indefinitely keep an abandoned embodiment active.

The world participation state machine is `active → exiting → inactive → active`. A return may be prepared outside the writer, but publication is one validated transition. The saved actor record carries phase/revision, last safe anchor and interruption/continuation references. Operational session expiry and exit-attempt identity/deadline are outside gameplay rewind. They describe current connectivity, not another writable copy of the body.

When the last participating controlling connection is lost, enqueue one exit attempt. Its generation and deadline cannot be extended by duplicate disconnects or stale heartbeats. Numerical grace periods remain D03 tuning. Define the maximum exit bound in real elapsed operational time so a paused world cannot trap a logged-out human forever; the adapter supplies deadline-elapsed facts to the pure domain. Native action progression still uses simulation time, and no offline catch-up is introduced.

Each supported action family exposes safe-exit handling: finish already committed work, stop future work at an allowed boundary, release only unused holds and preserve completed costs/results. Long actions cannot veto departure indefinitely. Already applied damage is not undone. Unsupported delayed/indirect harmful mechanics require BW14's explicit policy before shared-world enablement; do not silently invent damage settlement, early impacts or immunity exceptions.

At final exit, in one world commit: settle supported current work, mark the actor inactive, retain belongings/return state, end relevant participation and emit one audience-scoped departure event. Native hazards, survival and target eligibility check participation through the body/action owner. Do not leave an invisible active target in spatial candidate results. The renderer performs the fade from the committed event/removal, not from a client-side account timeout. EPR delivers the event only to actual witnesses.

Reconnect during exit cancels/reconciles that same attempt under its expected revision and current authority; a committed departure is not undone by replaying an old reconnect. Return after inactivity validates saved geometry and support. The first fallback is the world's explicitly configured safe-return anchor; if neither saved nor fallback placement is admissible, remain inactive and report a safe-return blocker. Do not select a hidden random destination or delete possessions.

Nested belongings later introduced by P3 follow the inactive actor's containment root without independent active hazards; detached buildings/world property do not inherit that protection. World-wide pause aggregation and personal absence stay distinct. Startup and restore reconcile current sessions with saved participation before reopening admission; invalid historical controls are never reinstated.

## 8. Persistence and migration

Extend the existing control/profile repository and scoped canonical data queries. Include current grant/control revisions in database publication checks, not only an in-memory cache. The single world writer provides ordering, while transaction constraints guard stale processes and restart. Lock in stable scope/actor order and keep transactions short.

Migrate the existing local profile, selected actor, preferences and milestones in place. Preserve opaque IDs, creator attribution and saves; require explicit verified-account linkage. Move global player-specific milestones/preferences to their current actor/account owner without fabricating progress for other accounts. Authentication secrets never enter that migration's gameplay payload.

Restore keeps current sessions/grants/control counters and external accounting, rotates timeline/application context, reinstalls gameplay atomically and rebuilds scoped view/subscription caches. Reconcile saved active/exiting humans with current control before resuming; a save cannot resurrect a revoked account or repeat departure/return receipts. SL owns the restore transaction, not a new multiplayer save implementation.

Integrate INV requests, drafts, approvals and receipts from the actual continuation branch via DF02. Every new session shares existing world/account spend limits; creating tabs or control generations does not create inference allowances. Do not mechanically translate a creator operation into an actor operation because both currently used `local-player`.

## 9. Delivery, failures and evidence

[MP01.1–MP01.6 and MP04.1–MP04.4](../maintainers/multiplayer.md#priority-2-implementation-slices) sequence authentication/bindings, control, scoped mutations, projections, recovery, two-human proof and absence. The first authority proof uses P1/current finite resources; full P3 containment is a later integration, not a circular prerequisite.

Audit every entrypoint: command/control, catalogue/preview, notes/person editor, memory/history, conversation membership/transcripts, world-agent tools, invention, save/load, jobs/usage sections and SSE reconnect. A single unscoped legacy wrapper blocks the relevant release surface. Keep local-only wrappers at the composition root with an explicit guard; never a fallback inside a shared endpoint.

Failure checks include invalid session, forbidden world/actor, stale generation/timeline/grants, same-ID altered command, revoked result read, concurrent takeover, lost response, storage failure and slow stream. Use stable sanitized result codes; distinguish authentication, authorized conflict and service unavailability without exposing hidden resources.

Run manual/native scenarios using two genuine authentication sessions, both databases and ordinary clients when implemented. Inspect network payloads, not only visible UI. Exercise rollback and process death around control/command/publication, old cursors, revocation during optional reads, disconnect during a long action, paused-world exit, return to changed geometry and restart during exit. No paid calls are required for authority proof; native fixtures do not qualify live AI behavior. Keep deferred automated checks and existing CI intact.

Measure per-scope cache retention, connections, queue age/bytes, command/commit/project tails and churn. A two-human success does not close the first-release mixed workload or D5 security/operations gate. Planning envelope: approximately 2,500–5,000 production logic lines across existing HTTP, control, repository, projection and client scope seams; update with the entrypoint audit before implementation.

## 10. Decisions and primary references

Rejected alternatives: mutable global current player; one WorldService/world copy per player; authentication-only endpoint wrappers; browser-authored account grants; implicit tab takeover; restoring saved controller generations; raw shared event replay; and distributed control services before a measured need.

Proposed defaults are standards-based external identity with server sessions, explicit control replacement, current-grant checks at admission/commit/egress, audience-keyed caches and a single bounded participation lifecycle. Provider choice and numeric durations are configuration. PvP lethal/indirect-hazard and property rules remain BW14/D07; no unresolved choice blocks the cooperative foundation.

Primary mechanism references consulted September 26, 2026: [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html) for issuer/subject authentication and token validation; [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html) for authorization-flow security; OWASP [authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), [session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) and [CSRF prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) for request/session boundaries. OpenLegend's game permissions and lifecycle remain repository-owned policy, not conclusions supplied by those standards.

## Maintained records

- Implementation: [Feature tasks](../maintainers/multiplayer.md).
- Limits and constraints: [Accounts, participation and transport inventory](../limits/multiplayer.md).
