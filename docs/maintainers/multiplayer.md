# Multiplayer authority and operations foundation

Accepted contracts: [first shared-world authority](../../archive/07-technical-architecture/data-delivery-and-scale.md#first-shared-world-authority-boundary), [data identities/grants](../../archive/07-technical-architecture/production-data-model.md#4-accounts-worlds-and-simulation-ownership), [base-world lifecycle](../worlds/base/lifecycle-and-protection.md). MP01/MP04 are implemented and locally qualified below; the broader operations and permission tracks remain targets. See the [remaining-foundations index](remaining-foundational-work.md) for priority and branch coverage. Reuse the current writer, projection, receipt and repository owners.

- [x] **MP01 — Two-human authority and private projections.** Implement authenticated account → actor control with explicit control generation, current world/timeline and scoped grants at command admission and commit. Prove two independent clients, differing knowledge, competing last-resource actions, control replacement, reconnect, revoked access and restart. Exit: no cross-player private state, stale-controller mutation, duplicate control or duplicated inventory. Do this before public multiplayer; distributed region workers are not prerequisites.
- [ ] **MP02 — Typed special player permissions.** Consume [full invention freedom](../../archive/03-design-proposals/invention-governance-and-ownership.md#special-player-invention-permission) with server-owned typed scoped grants, profile presentation, issuer/revocation audit and current revision checks. Add real storage through the data owner; share invention admission with INV-1/INV-5. Exit: a granted non-creator can make reviewed shared-law changes while ordinary players cannot; ordinary invention locks, grant revocation mid-job, restore and world isolation work; no human-private, save/load, administrative or spending powers leak into the grant. Do not implement hypothetical permission kinds.
- [ ] **MP03 — Scheduled creator maintenance.** Implement the [maintenance pause contract](../../archive/03-design-proposals/time-and-simulation-speed.md#creator-maintenance-pause) through the existing clock/writer. Durable operational schedule, explicit timezone/date, notices and updates, safe start, authorized editing, restart and explicit ready-to-resume behavior. Exit: no simulation/time catch-up during maintenance, no stale job applies after a law change, no automatic resume into failed migration; cancellation/extension and midnight/DST display remain unambiguous. The schedule does not authorize migration or paid work.
- [x] **MP04 — Session absence integration.** Supply BW13/BW14 with authoritative disconnect/exit/return and opt-in participation state, separate from hidden-tab sensing and world-wide pause aggregation. Exit: network loss, explicit logout, long action, reconnect during exit, multiple tabs and service restart preserve one coherent lifecycle; personal pause and shared unattended settings continue to work. Numerical grace periods remain D03 tuning; no offline building protection is implied.

Later regional authority/transfer is D6, not another MP implementation here. Operations, hostile-client and full-load evidence remain required before hosted release; research plans and local two-user success do not close those gates.

## Execution notes — September 26, 2026

Implementation is authorized by the [foundation execution plan](../projects/foundations-1-5.md#approved-implementation-plan).
MP01/MP04 and their ten foundation slices are **implemented and locally qualified**. Required CI, hostile-client/hosted qualification and broader MP02/MP03 remain open.

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
- [Verification](../verification.md#foundation-priorities-15--implementation-evidence) records the full lifecycle, nested belongings, safe-return rejection, 30-second blocked-reader disconnect and bounded connection churn. The complete caller review and parent reconciliation are complete. Numerical settings and hosted capacity remain qualified limits, not universal world laws.

Chosen prototype settings are configurable: eight-hour server sessions and a fifteen-second
real-time exit grace (one to sixty seconds). They are D03 deployment tuning, not world laws.
OIDC mechanism references: [official openid-client API](https://github.com/panva/openid-client/blob/main/docs/README.md),
[Keycloak container/import guide](https://www.keycloak.org/server/containers). These do not
qualify hosted operations, hostile-client security, live model quality or PF capacity.

## Priority 2 implementation slices

The approved [feature specification](../projects/multiplayer-authority-feature-spec.md) and [technical design](../projects/multiplayer-authority-tech-design.md) govern these MP01/MP04 child slices. The foundation plan is implemented; the evidence above satisfies MP01/MP04. Other MP gates retain their separate scope.

### MP01.1 — Authenticated accounts and current scope

- [x] Audit all single-principal assumptions, including `local-player`, `controlledEntityId`, preferences, milestones, tool scopes and projection caches. Record exact current bases and affected callers.
- [x] Implement the external authentication adapter and server-owned session lifecycle with explicit local-only mode; bind trusted issuer/subject to account and current world/actor grants. Use maintained authentication code, not custom cryptography.
- [x] Preserve existing world/profile identities through explicit operator linkage and in-place migration; reject first-login/email-name takeover and local-creator fallback.

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

- [x] Integrate consumed records with existing migrations and recovery; exclude current grants/session/control counters from gameplay rewind.
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
