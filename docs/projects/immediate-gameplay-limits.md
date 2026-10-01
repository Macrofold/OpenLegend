# Immediate gameplay limits implementation

Approved in chat on 2026-09-26: implement C18, C17, E01, E04, R03 and C19 from the [limits audit](../maintainers/limits-audit.md). Estimated 1,500–3,000 changed logic lines; cross-layer authority, performance and persistence risk warrants this durable plan. Existing unrelated guidance and inventory edits are preserved.

## Scope and owners

- C18: kernel perception/native phases and server history residency; PF03/PF09 and EPR owners. Preserve deterministic ordering, RNG, event audiences and complete atomic publication. Optimize unchanged work before adding slicing.
- C17: MemoryRepository, AttentionService and context assembly; PF08/CR owners. Maintain exact eligible recall, protect required evidence, select/check bytes before hydration, cache revision-scoped counts, provide explicit oversized-input outcomes and retained-history continuation. Do not delete history or introduce approximate recall without quality evidence.
- E01: HTTP streams, WorldService presence/control and authority sessions; MP owner. One deployment capacity configuration supports 100 players plus reconnect/tab headroom. Existing slow-client disconnection and authority fencing remain.
- E04/R03: domain object owner, action admission, scoped inventory projection and client panel; PO owner. Reachable world containers shared by default; explicit access restrictions, own carried bags, giving to reachable actors without reading their possessions. Recursive own ingredient/tool lookup. Preserve reservations, capacity, cycles, current placement/access and action dependencies.
- C19: current serialized world/database lanes and HTTP admission; PF01/PF07. Bound pending depth/age and request bytes, surface overload, never abort an already executing transaction or replay uncertain mutations.

## Implementation sequence

1. Refresh verified origin/main after inspection; retain the dirty documentation work. Record source baseline and matched no-cost native stress evidence.
2. Implement common queue admission and coordinated connection settings, preserving nested transaction ownership and shutdown draining.
3. Implement shared/access-controlled containers and dependency-aware inventory operations through existing commands, projection and UI; preserve save/load and resource ownership.
4. Reduce dense unchanged perception and active-evidence overhead using correctly invalidated derived state; qualify crowd and movement scenarios with unchanged deterministic outcomes where semantics are unchanged.
5. Add a rebuildable native database text index after the 100,000-source lexical measurement exposed a two-second cold query. Use SQLite FTS5 and PostgreSQL built-in text search, scoped to eligible actor records; keyword tokens/prefixes replace arbitrary substring matching in this optional legacy search. Migrate the derived projection atomically, preserve canonical bodies and required-source admission, and verify old-source selection plus changed/removed sources. Optimize retrieval/counts and pre-hydration admission, bound candidate preparation, preserve required-input failure and continuation. Qualify growing history and correction/generation fencing.
6. Reconcile canonical contracts, feature inventories and existing focused trackers; remove audit candidates only when delivered and verified. Perform full review, fix issues and rerun affected verification.

## Decisions

Shared world-container access does not imply access to another human's private notes or carried contents. Giving allows depositing into a reachable recipient's root inventory, not arbitrary access to their bags (superseded 2026-09-28: giving is now an offer the recipient accepts; [camp fire and sharing decision 6](camp-fire-and-sharing.md#decisions)). Container restriction state must be explicit, validated and durable. Unrelated inventory moves do not cancel work; dependency-changing moves reject with a useful explanation. Exact vector search stays the initial baseline; output count is not advertised as a corpus-work bound. Numerical admission settings are operational defaults, documented with rationale and measured limits.

## Verification and completion

Use disposable data and AI_BUDGET_USD=0. No authored or executed automated unit/integration/browser suites. Run static TypeScript/build/config checks and formatting; exercise actual domain/service/HTTP/database callers with small one-off scenarios and meaningful failures. Use real browser interaction for changed inventory UI. Run matched dense native stress and growing-history retrieval measurements; exercise 100 connected gameplay clients and overload/reconnect cleanup. Verify SQLite and PostgreSQL where available. Preserve unchanged outcomes, no stale authority, no partial writes, no lost required evidence, bounded pending work, and truthful client feedback. Record measured host/workload/limits in Verification; 10,000-player hosted capacity is outside this release gate.

## Progress

- [x] Initial source/context and dirty-work inspection; plan and approved scope captured.
- [x] Base refresh and representative baseline.
- [x] C19 and E01 implementation and local 100-account admission/command verification; sustained capacity remains PF11/D5.
- [x] E04 and R03 implementation and SQLite/PostgreSQL HTTP plus real browser verification.
- [x] C18 selected change-fed/checkpoint/residency work and deterministic/native dense qualification; measured remaining costs stay PF03/PF08/PF09.
- [x] C17 indexed selection, snapshot-fenced caching and preparation admission; both adapters and growing corpora measured. Exact cold-work and natural-quality gates remain open.
- [x] Documentation reconciliation, full review with fixes, runtime follow-through and final static/link/format checks.
