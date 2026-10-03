# Multiplayer authority and operations foundation

Accepted contracts: [first shared-world authority](../../archive/07-technical-architecture/data-delivery-and-scale.md#first-shared-world-authority-boundary), [data identities/grants](../../archive/07-technical-architecture/production-data-model.md#4-accounts-worlds-and-simulation-ownership), [base-world lifecycle](../worlds/base/lifecycle-and-protection.md). MP01/MP04, MP03 and the E08 entry work are implemented and locally qualified below; MP02 remains a target. See the [remaining-foundations index](remaining-foundational-work.md) for priority and branch coverage. Reuse the current writer, projection, receipt and repository owners.

- [x] **MP01 — Two-human authority and private projections.** Implement authenticated account → actor control with explicit control generation, current world/timeline and scoped grants at command admission and commit. Prove two independent clients, differing knowledge, competing last-resource actions, control replacement, reconnect, revoked access and restart. Exit: no cross-player private state, stale-controller mutation, duplicate control or duplicated inventory. Do this before public multiplayer; distributed region workers are not prerequisites.
- [ ] **MP02 — Typed special player permissions.** Consume [full invention freedom](../../archive/03-design-proposals/invention-governance-and-ownership.md#special-player-invention-permission) with server-owned typed scoped grants, profile presentation, issuer/revocation audit and current revision checks. Add real storage through the data owner; share invention admission with INV-1/INV-5. Exit: a granted non-creator can make reviewed shared-law changes while ordinary players cannot; ordinary invention locks, grant revocation mid-job, restore and world isolation work; no human-private, save/load, administrative or spending powers leak into the grant. Do not implement hypothetical permission kinds.
- [x] **MP03 — Scheduled creator maintenance.** Delivered September 28, 2026 ([entry and maintenance notes](#entry-and-maintenance-execution-notes--september-28-2026)). Implement the [maintenance pause contract](../../archive/03-design-proposals/time-and-simulation-speed.md#creator-maintenance-pause) through the existing clock/writer. Durable operational schedule, explicit timezone/date, notices and updates, safe start, authorized editing, restart and explicit ready-to-resume behavior. Exit: no simulation/time catch-up during maintenance, no stale job applies after a law change, no automatic resume into failed migration; cancellation/extension and midnight/DST display remain unambiguous. The schedule does not authorize migration or paid work.
- [x] **Entry — Characterless sessions and invite enrollment (audit item [E08](limits-audit.md#ranking-method)).** Delivered September 28, 2026 ([notes](#entry-and-maintenance-execution-notes--september-28-2026)). An operator or spectator signs in without a character and performs only granted operations; a manager issues a scoped, expiring, revocable invite that an invitee redeems through OIDC with no database edits. Exit: no character route accepts a characterless session, a spectator sees no human-private data, invite enrollment and revocation work in real browsers. Open public sign-up and richer spectating remain owner decisions ([D68](../../archive/05-project/open-decisions.md#d68--world-entry-beyond-invites)).
- [x] **MP04 — Session absence integration.** Supply BW13/BW14 with authoritative disconnect/exit/return and opt-in participation state, separate from hidden-tab sensing and world-wide pause aggregation. Exit: network loss, explicit logout, long action, reconnect during exit, multiple tabs and service restart preserve one coherent lifecycle; personal pause and shared unattended settings continue to work. Numerical grace periods remain D03 tuning; no offline building protection is implied.

Later regional authority/transfer is D6, not another MP implementation here. Operations, hostile-client and full-load evidence remain required before hosted release; research plans and local two-user success do not close those gates.

## Execution notes — September 26, 2026

Implementation is authorized by the [foundation execution plan](../projects/foundations-1-5.md#approved-implementation-plan).
MP01/MP04 and their ten foundation slices are **implemented and locally qualified**. Required CI, hostile-client/hosted qualification and MP02 remain open; MP03 was subsequently delivered in the September 28 entry/maintenance slice below.

- `authority.ts` adds consumed account/session/grant/control/exit records outside gameplay
  capture, exact issuer/subject operator mapping, immutable scope and publication fences.
  `authentication.ts` uses pinned `openid-client@6.8.8` authorization code + PKCE,
  browser-bound one-use state, nonce and signature verification; local mode rejects
  non-loopback binding. Provider tokens never enter the game/browser payload.
- HTTP, world commands, private views/history/catalogues, editors, model jobs and diagnostics
  use explicit scope. Current-grant/control checks fence callbacks and
  SQL world publication; caches, stream cursors and private client state are partitioned.
  A discovered inherited mutation-context flag now expires when its owner returns.
- Actor-owned milestones preserve the old local actor's flags. Operator bindings preserve
  existing character/account IDs; login alone supplies no actor or creator privilege.
- Domain participation has active/exiting/inactive phases. Operational attempts retain one
  real-time deadline across paused simulation/restart; control + return share the world
  commit. Native interruption retains consumed inputs. Return uses the saved support or
  the bundled world's explicit camp anchor and otherwise remains unavailable.
- Two actual Keycloak 26.7.4 accounts now complete OIDC login in independent browser
  contexts. Bob can edit his private pad without creator capabilities; Alice's creator
  inspection and both cross-owner private routes reject it. Explicit second-tab takeover
  clears the first tab's editor and rejects its old-scope write. Closing the controller
  commits inactivity after the configured grace while the world is paused and a follower
  remains open. Reconnect retains the actor, inventory and history. Revoked access rejects
  subsequent reads and clears the browser world view; current sessions survive restart.
- `/api/access/binding` is a separately authorized, revisioned, audited mutation. Both
  SQL adapters passed rollback, stale-scope, exact replay/changed-body conflict, historical
  owner protection, pre-binding-save restore and restart with obsolete bootstrap config.
  Those repository sessions qualify transaction mechanics; the browser evidence above
  supplies genuine authentication. Historical human privacy ownership is retained outside
  rewind, separately from the account's current embodiment. Play revocation releases the
  control generation; restoring a grant does not restore its old lease.
- The ordinary composer and action catalogue now support native player-to-player speech.
  Conversation and journal reads carry the tab's current scope and reject late results.
  Native action menus disable commands for a noncontrolling tab with an explicit control
  reason; a real HTTP/browser check verified availability after Control here.
  Combined actual movement, two-way speech, last-resource contention, private payloads, takeover, revocation and restart passed with genuine OIDC sessions on both adapters.
- Both SQL adapters passed real action/control failure before commit and after SQL commit but before acknowledgement, followed by restart and exact receipt recovery. Delayed private HTTP/SSE projections discard revoked scope; an initial stream rejects before writing event-stream headers. Private browser panels reject delayed old-scope bodies.
- Final Chromium checks covered explicit control, failed transport feedback, logout from Settings and paused witnessed departure. Screenshots show the transient fade and removed body. Measured card docking avoids toolbar/clock overlap at 900 and 480 pixels; no browser page errors occurred. Account hidden-tab preference changes immediately update canonical pause on both adapters.
- [Verification](../verification/foundations-1-5.md#foundation-priorities-15--implementation-evidence) records the full lifecycle, nested belongings, safe-return rejection, 30-second blocked-reader disconnect and bounded connection churn. The complete caller review and parent reconciliation are complete. Numerical settings and hosted capacity remain qualified limits, not universal world laws.

Chosen prototype settings are configurable: eight-hour server sessions and a fifteen-second
real-time exit grace (one to sixty seconds). They are D03 deployment tuning, not world laws.
OIDC mechanism references: [official openid-client API](https://github.com/panva/openid-client/blob/main/docs/README.md),
[Keycloak container/import guide](https://www.keycloak.org/server/containers). These do not
qualify hosted operations, hostile-client security, live model quality or PF capacity.

## MP18 — Explicit tab resume

- [x] Correct the [tab entry experience](../projects/completed/tab-resume-feature-spec.md) through its [technical design](../projects/completed/tab-resume-tech-design.md): sole-tab entry/reload/refocus are automatic; only switching between open tabs shows Game Paused / OpenLegend is open in another tab. / Resume Here / Log Out. Preserve departure, current authority, manual pause and safe return. Logout revokes the shared game login and clears every browser tab; local explicit sign-in must recover.
- [x] Finish focused native/static review before final browser acceptance; qualify single-tab entry/return/reload, duplicate identity, two-tab transfers, stale command rejection, logout in the blocked tab, both signed-out screens, login recovery and narrow modal layout. Broader Auth0 two-account acceptance stays in IDP01.

Completed October 3, 2026 after correcting mandatory Resume and passing the [updated native/browser acceptance](../verification/multiplayer-entry-maintenance.md#sole-tab-entry-and-shared-logout--october-3-2026). [Original acceptance](../verification/multiplayer-entry-maintenance.md#explicit-tab-resume--october-3-2026) remains historical.

## Identity provider — Auth0

Mike selected Auth0 as the world login service on October 1, 2026 ([D05](../../archive/05-project/open-decisions.md)). Account setup and dashboard configuration are operator work outside the repository; these tasks cover repository changes and the production configuration they depend on.

- [ ] **IDP01 — Local sign-in with Auth0.** [Plan](../projects/auth0-sign-in.md). Code delivered October 2, 2026 ([AU09](../limits/multiplayer.md#au09)); all accepted/refused configuration cases checked directly. The welcome screen now presents sign-in as normal entry, with distinct access and connection recovery and Change account to reopen the provider login form; [focused client evidence](../verification/multiplayer-entry-maintenance.md#login-entry-screen--october-2-2026) uses simulated API outcomes. A real single-account Auth0 sign-in/control and scoped local AI integration now pass in the [October 3 evidence](../verification/macrofold-worker.md#scoped-local-authoring-completion--october-3-2026). Remaining: the complete live two-account Auth0 invite/access-removal run in the plan. Accept an HTTP loopback game address with an HTTPS login service, base `Secure` cookies on the actual public address, and normalize issuer spelling. Exit: the plan's completion criteria, including two real Auth0 accounts through invite enrollment at a loopback address.
- [ ] **IDP02 — Production login service.** Before real players: a separate production Auth0 tenant whose own login domain (Auth0 custom domain) is the permanent issuer, a production application with the hosted HTTPS callback, the chosen social connections (Google, GitHub; Discord through the Auth0 marketplace connection or Discord's standard OIDC configuration) and the owner binding for the production world. Depends on hosting (D05). Exit: hosted sign-in and invite enrollment work through the custom domain, and the issuer is never changed after real accounts exist.
- [ ] **IDP03 — Sign out of the login service too.** Sign out currently ends only the game session; Auth0 keeps its own session, so signing in again on a shared computer silently returns to the same account. The refused-access screen’s Change account requests a fresh login form but does not end the provider session. End the provider session through its OIDC logout endpoint with an allowed post-logout address. Exit: after Sign out, the next sign-in asks for credentials. Before hosted release.

## Entry and maintenance execution notes — September 28, 2026

Authorized by the [entry and maintenance plan](../projects/multiplayer-entry-maintenance.md); [verification](../verification/multiplayer-entry-maintenance.md) records the evidence.

- `authority.ts` grants may omit a character (stored without changing the existing grant table). Such grants never include play, never acquire a control lease and never count toward exit or shared pause. A new `spectate` capability permits a public overview. `operations-routes.ts` owns an explicit characterless route allowlist; every character route rejects those sessions before dispatch.
- `invites.ts` issues hashed, single-use, expiring, revocable invites; issuers delegate only capabilities they hold. The OIDC callback redeems a remembered invite after verified sign-in. A player invite binds an unowned living person in the same world commit as the invite and grant; the body departs until the invitee explicitly takes control. Removing an enrolled account uses the existing audited capability change.
- `maintenance.ts` stores one durable scheduled/active window with UTC instants and an IANA display zone. Scheduled start uses the writer lane; entering and leaving hold the clock above every other pause setting, drop pending simulation debt, rotate the world generation and reset the host clock's resume instant, so no pre-boundary work or real time applies afterward. Ordinary gameplay mutations and pause controls are refused; creators keep paused-world editing. Only Ready resumes, never while storage has failed. Restart restores an active hold; a start missed offline activates at startup.
- Players receive scheduled, rescheduled, active, extended, overdue, cancelled and finished notices through `GameView.maintenance`, with full dates, zone names/offsets and their own local time. World operations (`/?view=operations`) is the characterless landing and the creator/manager console.
- Evidence: two real Keycloak 26.7.4 accounts per scenario in isolated Chrome contexts against PostgreSQL, `AI_BUDGET_USD=0`; a fixture AI client (no network) held an invention result across maintenance and it became stale. Not qualified: hosted security/abuse review, live-model jobs straddling maintenance, load while maintenance changes, and a forced slow tick exactly at resume (the resume-instant fence is reasoned, not reproduced).
- Remaining owner decisions: open public sign-up, new-character invites, characterless-to-player promotion, characterless creator tools and richer spectator presentation ([D68](../../archive/05-project/open-decisions.md#d68--world-entry-beyond-invites)). Recurring or overlapping maintenance schedules are not supported ([MP16](../limits/multiplayer.md#mp16)).

## Priority 2 implementation slices

The approved [feature specification](../projects/multiplayer-authority-feature-spec.md) and [technical design](../projects/multiplayer-authority-tech-design.md) govern these MP01/MP04 child slices. The foundation plan is implemented; the evidence above satisfies MP01/MP04. Other MP gates retain their separate scope.

### MP01.1 — Authenticated accounts and current scope

- [x] Audit all single-principal assumptions, including `local-player`, `controlledEntityId`, preferences, milestones, tool scopes and projection caches. Record exact current bases and affected callers.
- [x] Implement the external authentication adapter and server-owned session lifecycle with explicit local-only mode; bind trusted issuer/subject to account and current world/actor grants. Use maintained authentication code, not custom cryptography.
- [x] Bind current world/profile identities only through explicit operator linkage; reject first-login/email-name takeover and local-creator fallback. Historical migration wording is superseded by the [development compatibility policy](../../AGENTS.md#development-save-policy); it does not authorize preserving prior code or storage formats.

**Dependencies:** current data/control repositories. **Exit:** two distinct verified accounts receive only their authorized world/actor choices; invalid/revoked sessions and malformed scope cannot enter shared routes.

### MP01.2 — Explicit control generation and replacement

- [x] Persist monotonic actor control generation outside rewind, with current connection/session binding and expected-revision acquisition/release/replacement.
- [x] Add visible explicit takeover and follower mode; reject old-tab commands/heartbeats. Preserve actor-owned native work and permit current control to inspect/cancel normally.
- [x] Apply the proposed one-active-embodiment-per-account/world v1 policy without making it a kernel ontology; separately authorize account-to-actor rebinding.

**Dependencies:** MP01.1. **Exit:** competing acquisition and reconnect produce one controller/actor/inventory and no automatic implicit tab takeover.

### MP01.3 — Every mutation and receipt is scoped

- [x] Thread immutable scope through HTTP, WorldService commands/cancel, notes/editors, conversations, invention, world-agent tools, save operations and asynchronous publication. Remove shared-path mutable-global principal switching.
- [x] Recheck session, current grant/control/timeline and affected revisions after waits and in the publication transaction. Retain original provider attempt and spending identity on stale completion.
- [x] Scope deduplication and receipt reads; identical retry returns one authorized outcome, changed body conflicts, old epoch/timeline rejects without execution.

**Dependencies:** MP01.1–MP01.2; existing receipt owner; P1/current finite-resource adapter. **Exit:** actual last-resource contention and stale/forged/revoked commands preserve state and do not leak another principal's results.

### MP01.4 — Projection, context and streaming isolation

- [x] Change views/catalogues/history/context/editor readers to explicit scope; partition caches and asynchronous optional results by the necessary principal/audience/timeline/grant/knowledge revisions.
- [x] Add stream scope generation, explicit removals/private replacement and scoped cursor validation. Clear private client state on logout/revocation/takeover/restore; reject late optional payloads.
- [x] Bound per-connection queues and define scoped resync/disconnect; coalesce replaceable snapshots only. Keep public geometry sharing separate from observer identity and private content.

**Dependencies:** MP01.1–MP01.3; EPR/D51 retain sensing policy. **Exit:** two clients with different knowledge and human-private notes remain isolated in actual network payloads, cache hits, old cursors, creator queries, counts and delayed responses.

### MP01.5 — Restart, restore and grant revocation

- [x] Integrate current authority records with initialization and recovery; exclude current grants/session/control counters from gameplay rewind. Current-format identity and recovery integrity remain required without legacy migration support.
- [x] Fence commands, provider proposals, cursors and views on restore/control change; reconcile membership/session revocation and rebuild only current scoped caches.
- [x] Exercise failure before/after control and action commits, lost acknowledgements and restart with pending private work. Do not replay paid work or create new allowance per tab.

**Dependencies:** MP01.2–MP01.4; SL00/DF02. **Exit:** repeated world/entity IDs never make old authority current, and recovery preserves committed receipts, human privacy and accounting.

### MP01.6 — Two-human end-to-end authority evidence

- [x] Run two real authenticated ordinary browser sessions through movement, speech, differing knowledge, final-resource contention, takeover, revoked access and restart, with native/no-cost execution.
- [x] Inspect response/SSE/history/editor/tool payloads and failures, not only UI visibility. Exercise both database adapters where supported.
- [x] Record Verification evidence and current Architecture, per-connection latency/backlog/memory measurements, remaining hostile-client/CI/hosted gaps and exact workload. Leave first-release PF/D5 capacity unclaimed.

**Dependencies:** MP01.1–MP01.5 plus MP04 integration for the combined milestone. **Exit:** the parent's real two-human acceptance is evidenced; no fixture-only authentication bypass qualifies it.

### MP04.1 — Participation and bounded exit contract

- [x] Separate controlling/participating connections, followers, authentication expiry, viewport visibility and global pause. Persist one actor participation state and distinct operational exit identity/deadline.
- [x] Implement idempotent last-participant-loss and reconnect transitions; bound exit even while simulation is paused, without domain wall-clock I/O or offline catch-up.
- [x] Audit current actions for supported finish/interruption at exit; retain spent effects and unused-hold release. Unsupported future delayed/indirect harm remains BW14 work, not guessed settlement.

**Dependencies:** MP01.2–MP01.3; BW13; existing action owners. **Exit:** repeated disconnects/heartbeats cannot duplicate or indefinitely postpone exit; long work cannot trap the actor.

### MP04.2 — Inactive body and scoped departure

- [x] Commit safe action interruption, inactive participation and one departure event together; project fade/removal only to witnesses through normal EPR evidence.
- [x] Remove inactive humans from bodily hazard/depletion/action/spatial participation without deleting identity, history or possessions. Preserve detached world-property behavior.
- [x] Keep human-targeted harmful admission cooperative/denied unless actual BW14 opt-in semantics are implemented; a modal or role name is insufficient.

**Dependencies:** MP04.1; BW13 and relevant body/spatial owners. **Exit:** onlookers can notice departure, non-witnesses receive no account or location leak, and protected inactivity does not pause the whole shared world or protect buildings.

### MP04.3 — Reconnect, safe return and restore reconciliation

- [x] Reconcile return during an exit versus after committed departure using expected lifecycle/control generations. Reuse the same actor and inventory.
- [x] Validate saved return geometry and configured safe anchor; retain inactivity on unavailable placement rather than inventing a destination or losing possessions.
- [x] Reconcile current operational sessions with restored participation before resuming; integrate P3 containment roots when delivered without activating every carried child independently.

**Dependencies:** MP04.1–MP04.2; MP01.5; SL00. **Exit:** races, repeated returns, changed geometry and restart/restore during exit create one continuous embodiment with no stale authority.

### MP04.4 — Lifecycle qualification and tuning handoff

- [x] Exercise explicit logout, network loss, paused-world exit, hidden connected play, stale follower, long action, reconnect before/after departure, return-placement failure and restart.
- [x] Record the configured real/session/simulation clock roles and chosen numerical durations under D03; do not present prototype tuning as a universal law.
- [x] Record combined MP01.6/BW13 evidence, remaining BW14/D07 and D5 gates and deferred regression work without weakening CI or authoring/running automated suites under the default workflow.

**Dependencies:** MP04.1–MP04.3. **Exit:** deterministic native outcomes, truthful visible lifecycle and bounded operations are evidenced; unresolved combat/property choices stay with their existing owners.

## Release admission follow-through

The [immediate limits implementation](../projects/immediate-gameplay-limits.md) coordinates release admission and projection cache capacity from `OPEN_LEGEND_PLAYER_CAPACITY` (default 100), retaining per-scope authority and slow-client handling. [Verification](../verification/immediate-gameplay-limits.md#immediate-gameplay-limits) includes 100 separate synthetic accounts with actual SSE/control/commands; session setup bypassed OIDC. MP01 authority remains required. PF11/D5 and [E01](limits-audit.md#e01) remain open for sustained mixed gameplay, hosted operation and 10,000-player growth; the 100-player burst latency is not acceptable release evidence.
