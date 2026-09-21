# Documentation changelog

This file records material changes to OpenLegend's documentation structure and historically important decisions that replaced earlier documented directions.

It is historical context only. Current requirements, design, architecture, tasks, status and open decisions live in their canonical owner documents.

## 2026-09-20 — Documentation consolidation

- Adopted one-canonical-owner documentation policy.
- Separated design specifications from implementation trackers.
- Moved NC00–NC13, ACT01–ACT06, INV-1–INV-8 and D0–D6 into focused maintainer trackers.
- Rebuilt the maintainer index as navigation and narrowed the general TODO to cross-cutting work.
- Recast implementation status and verification as current snapshots instead of completion diaries.
- Consolidated current runtime architecture in `docs/architecture.md` and removed the parallel technical system architecture and review/delivery plan.
- Removed the actor-model and narration source follow-ups after their current requirements were absorbed into the product baseline, canonical designs and trackers.
- Recorded the living-actor direction as accepted; only residual lifecycle/body semantics remain open.
- Retained Jev material only as provider research needed by current evaluation work; OpenLegend routing behavior belongs to the architecture and memory design.

## Living actor and history migration

Replaced current-state descriptions of split animal lifecycle and temporary pair-exchange context with schema 3 and durable conversation/history facts. Kept D56 unresolved, retained all ACT/D/NC task identities and open acceptance gates, and recorded deferred automated coverage in the maintainer TODO. Architecture remains the current-contract owner; specifications retain target behavior and focused trackers retain unfinished work.

## God revival and remaining program delivery

Resolved D56 in the canonical actor contract: full god revival reconstructs harvested bodies without removing collected inventory. Moved the accepted agent spending ceiling from D04 to the architecture; hosting costs remain unresolved. Updated current subsystem facts and preserved focused task IDs and open acceptance gates.

- Added the canonical identity/reference contract and linked the response specification to it. Updated architecture, implementation status and verification for saved control bindings and bound response IDs; deferred automated coverage is recorded in maintainer TODO.

## Runtime performance design

- 2026-09-21: Marked delivered performance implementation separately from open qualification. Added current cold-event, command-epoch, actor scheduling and index behavior to Architecture, recorded native runtime/restore/cadence observations and retained deferred coverage in TODO. Moved the accepted gameplay retry policy out of the open-decisions body to its real-time owner reference, and removed the stale seven-day command-horizon sentence. Multiplayer admission/replication, the unattended-world toggle and target-population verification remain excluded.

Added `docs/performance.md` for runtime scheduling and optimization, with ordered PF00–PF11 work and acceptance budgets in `docs/maintainers/performance.md`. The real-time specification retains protocol/prediction ownership, and production-data phases retain migration and scale rollout ownership. No runtime task was completed by this documentation change.

Moved five unchecked TODO items into the focused tracker: PostgreSQL measurement (PF00), diagnostics connection isolation (PF04), diagnostic batching/backpressure (PF06), and long-history/backlog work (PF08). Their open state and relevant conditions are preserved. The obsolete synchronous PostgreSQL worker and 16 MiB bridge-limit description was replaced with the current asynchronous single-connection architecture; this corrects implementation facts rather than declaring the measurement task complete.

Recorded the statement-count fixture and investigation limits in Verification, including the correction of an unverified remote-database explanation. Added D58/D59 for durability/storage-placement and retention/retry-policy choices. Reviewed the design for missed wakeups, privacy/recovery boundaries, unsafe multi-step batching, hidden database contention and unsupported speedup claims; the selected design preserves those boundaries and gates more complex mechanisms on measurements.

- 2026-09-20: Reconciled architecture, extension guidance, domain notes, performance guidance and implementation status for draft-proven event appends, routine milestone acceptance, actor-local Person pagination and importance-only retrieval invalidation. Recorded isolated runtime evidence and deferred regression/async-fixture work separately.
- 2026-09-21: Separated Person creation provenance from live Person editing. Documented description/personality/backstory/trait/goal ownership, how the first goal drives native planning, and which authored identity fields enter actor-private decision context.
- 2026-09-21: Added Person-editor survival-stat snapshots, explicit refresh and fill-to-100 behavior. Documented field-level save merging so untouched simulation drift is preserved and deliberate god-stat edits override the opened snapshot.
- 2026-09-21: Reconciled the cognition debugger contract around stable references, typed concise triggers, semantic stage names and root-only world-agent failure detail. Full sanitized stimuli remain restricted to owner raw inspection; automated coverage is explicitly deferred.
- 2026-09-21: Clarified trace versus stage identity, separated query-embedding diagnostics from ranked memory-context results, and restored response-linked accepted actions to durable person-scoped Talk history. Recorded the live retained-trace and owner-history observations without treating them as automated acceptance.

- 2026-09-21: Updated architecture, extension guidance and implementation status for the initial performance foundations. Preserved incomplete PF task exits, recorded native SQLite runtime observations separately from scale acceptance, and added deferred coverage to the maintainer TODO. No retention policy or multiplayer deployment claim was introduced.
- 2026-09-21: Accepted shared-world absence behavior: a world-level Continue while unattended setting permits progression with no present players; otherwise all admitted players must be disconnected or unfocused before the world pauses. Set ordinary gameplay commands to a 24-hour outcome-replay window followed by rejection through a server-issued command epoch/controller-generation watermark. Current receipts remain intact until that expiry boundary is implemented; provider, billing and administrative identities retain their separate policies.
