# Multiplayer entry and scheduled maintenance

Approved in chat on 2026-09-28 (Mike's go-ahead in the task message): deliver audit item E08 (characterless operator/spectator sessions and invite enrollment), then [MP03](../maintainers/multiplayer.md) scheduled creator maintenance. Base: `origin/main` `be68b1e0`. Estimated 1,700–2,300 changed logic lines across authority, HTTP, the world clock, protocol and client. Authority, privacy and clock/pause risk warrants this durable plan.

Canonical contracts reused, not restated: [multiplayer authority design](multiplayer-authority-tech-design.md), [human-private boundary](../../archive/07-technical-architecture/data-queries-and-mcp.md#human-private-content-boundary), [maintenance pause contract](../../archive/03-design-proposals/time-and-simulation-speed.md#creator-maintenance-pause), [development save policy](../../AGENTS.md#development-save-policy) and [RP05](../maintainers/revisitable-policies.md#rp05--prototype-account-and-native-work-operating-envelopes).

## Scope and owners

1. **Characterless sessions (E08).** `authority.ts` owns grants. A grant may have no character. Such a grant never includes `play`, never acquires a control lease, never counts as a participating connection and never affects shared pause aggregation. A new `spectate` capability permits a public world overview. Operators use their existing capabilities (`save`, `manage-access`, `create`, `inspect`) without a character.
2. **Invite enrollment (E08).** New `invites.ts` owns invite records. A `manage-access` holder issues a scoped, expiring, single-use, revocable link for a player (bound to a chosen, currently unowned person), spectator or operator. The invitee signs in through the existing OIDC flow; the callback redeems the invite into a grant without manual database work. Player redemption commits the character's human binding through the world writer.
3. **Scheduled maintenance (MP03).** New `maintenance.ts` owns a durable operational window, its state machine, scheduled start and notices. `world-service.ts` receives one clock hold and a boundary fence. `view.ts` publishes the notice to players; the client shows it.
4. **HTTP and client.** New `operations-routes.ts` registers overview, invite, access-list and maintenance routes from `http.ts`. New client components: operations console (characterless landing, invites, access, maintenance, overview), maintenance notice and invite sign-in messages.

Out of scope: open public sign-up (recorded as an open decision for Mike), MP02 invention permission, E01 load/capacity, hosted deployment, a 3D spectator camera (renderer files belong to the shadow branch).

## Decisions

- **Current grant representation.** Characterless grants use `auth_grants` (one grant per account per world), with an account-specific reserved actor marker decoded only inside `AuthorityRepository`. This describes the implemented representation, not a compatibility requirement. The earlier rationale incorrectly treated preserving `actor_id NOT NULL` as mandatory: the [development policy](../../AGENTS.md#development-save-policy) permits changing the current schema and explicitly rejecting incompatible development databases; it prohibits legacy conversion/support and automatic destructive replacement. Any future representation change must update all current callers together and preserve authority/uniqueness invariants.
- **Spectator overview.** The overview contains the world clock, pause/maintenance status and a physical map: map bounds and generic body/object categories with positions. It contains no names, account or character identifiers, human/NPC distinction, inventories, speech, knowledge, notes, memories or participation state. Departed (inactive) humans are absent, as they are for in-world witnesses. Richer spectator presentation is a follow-up decision.
- **Characterless route allowlist.** A characterless session may use only session/logout, overview, maintenance status, performance (with `inspect`), saves (with `save`), access and invites (with `manage-access`) and maintenance changes (with `create`). Every other route rejects it before dispatch, including god/editor routes that assume a character.
- **Invites.** 256-bit random bearer token, stored only as a SHA-256 hash and shown once. Expiry 1 hour–30 days (default 7 days). Issuers delegate only capabilities they hold. Redemption requires OIDC, a pending unexpired invite and an account without an existing grant in the world. An invite for a player binds an operator-selected living person with no current grant and no historical human owner ([MP06](../limits/multiplayer.md#mp06) remains). Revoking a pending invite disables its link; revoking an enrolled account uses the existing `/api/access` capability change.
- **Maintenance authority.** Scheduling, rescheduling, extending, cancelling, starting now and marking ready require `create` (the world creator). At most one scheduled or active window exists. Times are stored as UTC instants plus an IANA display time zone. Local wall times that do not exist or occur twice at a daylight-saving change are rejected or require an explicit earlier/later choice.
- **Maintenance pause semantics.** An active window holds the shared clock above manual, presence and unattended settings. Entering and leaving drops pending simulation debt (no catch-up) and rotates the world generation, so no job or result admitted before a boundary applies after it. Ordinary gameplay mutations are rejected for accounts without `create`; creators keep existing paused-world editing. Only an explicit Ready step resumes, and Ready is refused while storage has failed. Restart restores an active hold before simulation; a start time missed while offline activates on startup. The announced end is an estimate; late windows show as overdue until extended or marked ready.
- **Policy envelopes.** RP05 is unchanged: one active embodiment per account/world, unchanged session duration and exit grace. Invites, grants and schedules are operational records outside gameplay save/rewind.

## Implementation sequence

1. Branch from refreshed `origin/main`; write this plan.
2. Characterless grants and scopes in `authority.ts` (bootstrap bindings may omit a character), `spectate`, characterless route allowlist in `http.ts`, overview route, `/api/session` role information, client characterless landing. Commit.
3. Invites: repository, issue/list/revoke routes, `/auth/invite` landing, callback redemption (player through the world writer), access list and revocation in the console. Commit.
4. Maintenance: repository and state machine, clock hold/fence in `world-service.ts`, timer and restart handling, gameplay gate, notice in `GameView`, client notice and console controls with DST/midnight-safe display. Commit.
5. Reconcile E08, MP03, limits inventory, README setup, architecture, verification report and changelog; full review and fixes. Commit.

## Verification and completion

Static: pinned Prettier on changed files, `pnpm typecheck`, `pnpm build`. Runtime: disposable PostgreSQL through the fixture helper, local Keycloak 26.7.4 with real OIDC accounts, `AI_BUDGET_USD=0`, two independent browser contexts, network payload inspection. No new automated tests.

Done when, with two real browser sessions:

- [x] A characterless operator signs in and performs only granted operations; a spectator's overview payload contains no human-private data, names or account/character identifiers; characterless sessions are rejected on character routes.
- [x] Invite → OIDC sign-in → enrollment → play works without database edits; a revoked pending invite and a revoked enrolled account both lose access.
- [x] Maintenance: schedule → player notice → scheduled start pauses with no catch-up → restart keeps the hold → explicit Ready resumes; cancel and extend update notices; ordinary gameplay is rejected and creator editing works during maintenance; a stale pre-maintenance job does not apply (fixture AI client; live models not exercised).
- [x] Midnight and daylight-saving windows display unambiguously in the creator's zone and the viewer's zone.
- [x] E08, MP03, limits, README setup, architecture, verification and changelog updated; full review complete.

## Progress

- [x] Context, contracts and trackers read; plan written.
- [x] Characterless sessions (`e94aa3c8`).
- [x] Invite enrollment (`2106525f`).
- [x] Scheduled maintenance (`061f54db`).
- [x] Documentation reconciliation, review and verification; [evidence](../verification/multiplayer-entry-maintenance.md).

Decisions added during review and verification: operations routes own their response checks (characterless validation errors had been masked as stale scope); a scheduled start that expires in the writer queue retries after one second while real persistence failures still fail closed; the host clock never simulates real time from before the latest resume, closing a bounded catch-up path for a tick left waiting across a pause; pending invites are counted through an indexed query instead of the bounded console list.

## Maintained records

- Implementation: [MP03 and entry work](../maintainers/multiplayer.md#entry-and-maintenance-execution-notes--september-28-2026); E08 is removed from the [limits audit](../maintainers/limits-audit.md#ranking-method) as delivered.
- Limits and constraints: [Accounts, participation and transport inventory](../limits/multiplayer.md).
- Related contract/design: [Multiplayer authority technical design](multiplayer-authority-tech-design.md).
