# Documentation changelog

## 2026-09-25 — Production data model review

Reviewed the [production records](../archive/07-technical-architecture/production-data-model.md) against gameplay, current storage and accepted engine boundaries. Clarified one canonical owner per record, shared actor capabilities, operational goals/plans/due work, identity-preserving migration, timeline/source fencing and revision-aware recall indexes. [Queries](../archive/07-technical-architecture/data-queries-and-mcp.md) now specify database selection before bounded context preparation, with index gaps and the unmeasured 20 ms local-retrieval target explicit.

The owner selected shared-world regional priority with independent worlds supported, retention of important events/summaries with routine detail allowed to expire, and no creator access to human-private messages/notes. Updated [scale/retention](../archive/07-technical-architecture/data-delivery-and-scale.md), related product/save/knowledge/cognition documents and [D1–D6 delivery slices](maintainers/production-data.md#delivery-slices-and-exit-evidence). [Open decisions](../archive/05-project/open-decisions.md) retain exact crowd/load policy, retention windows, privacy operations, recovery/rewind terms and retrieval deadline/quality choices; no arbitrary numeric capacity was accepted. This is a design/documentation change only, with no storage migration, provider calls, runtime qualification or new test execution.

## 2026-09-24 — Database and simulation responsibility clarification

Clarified the existing [production data model](../archive/07-technical-architecture/production-data-model.md#database-simulation-and-background-responsibilities): independent operational records and database-side queries, in-memory active simulation, atomic record commits and bounded asynchronous AI/embedding work. Whole-world JSON remains a checkpoint/export format in the target; current snapshot/journal storage is still transitional. [D1/D2](maintainers/production-data.md#remaining-d1d2-implementation-and-evidence) now explicitly track missing record/query implementation separately from deferred verification. The [scale design](../archive/07-technical-architecture/data-delivery-and-scale.md#1-what-scaling-means-for-this-product) distinguishes a million-player ambition from measured concurrency and concentrated interaction workloads. No runtime migration, latency guarantee or capacity qualification is delivered by this documentation update.

## In-place development updates
Knowledge canvas mechanics now have one engine owner in `docs/knowledge.md`; bundled limits/naming/recognition live in `docs/worlds/base/knowledge.md`. This replaces the proposed naming-heavy YAML state example and the external-beliefs-in-one-inner-world-text direction. The observer-known-name decision is resolved; aggregate storage remains open.

## Limits audit implementation

Updated current implementation descriptions after removing undocumented small content-count ceilings, the named-save count and the hidden spending clamp. The architecture owns current behavior; cross-cutting deferred verification is in TODO. Original audit entry numbers remain in the external limits reports with completed removals labeled explicitly.

## Physical contact semantics

Replaced the proximity-based touch approximation with body-surface contact. The spatial-world specification owns the physical rule and migration semantics; architecture reflects the optional detector's current behavior. Earlier dense-contact measurements describe the superseded proximity implementation.


## Action invocation and partial-fulfillment implementation


Recorded DP01–DP06 scope under the existing PF owner. History preparation and bounded source buffers refine compact atomic persistence; the measured local SQLite worker is a PF10 subset, not a second database or an implemented general simulation worker. Runtime facts, performance evidence and deferred automated coverage remain in Architecture, Verification and Maintainer TODO respectively. The previous synchronous-SQLite wording is superseded for the local adapter; dense CPU/clock and broader qualification remain explicit.

## 2026-09-25 — Action/main semantic reconciliation

Replayed action and performance work against the current agent rules and main's knowledge, contact and memory-pressure contracts without rewriting the original shared feature branch. Delayed actor targets now reuse the knowledge owner's encounter lifetime rather than treating an entity ID as lasting recognition; old unpinned intents are retained but may need a fresh decision. Speech-only restrictions no longer discard unrelated nonverbal decisions. Shared Jev rubrics and the existing work/maintenance owners replace duplicate paths.

Current facts, limited runtime evidence and remaining regression/INV/scale work are kept in [Architecture](architecture.md#reviewed-action-binding-and-approval-boundaries), [Verification](verification.md#action-reconciliation-review), [AC](maintainers/action-capabilities.md#reconciliation-review) and [PF](maintainers/performance.md#reconciliation-performance-follow-up). Production measurement remains PostgreSQL-first; no SQLite-only optimization or feature save reset was added.
