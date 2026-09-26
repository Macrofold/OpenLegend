# Data runtime hardening

Authorized scope: retain committed review fixes; resolve all existing typecheck diagnostics without weakening checks; move inactive experience out of the simulation working set; reduce copying and dense observation amplification; exercise recovery, concurrency and migration failures. Estimated change: 1,000–2,000 logic lines plus existing fixture compatibility and documentation. No new automated suites or paid requests.

## Design and owners

- WorldRecords/SqlWorldStore own durable records and the accepted comparison baseline. Cold placement must never appear as deletion, change source identity, or reset list ordering. Full reconstruction remains explicit for backup/export and legacy migration.
- WorldService owns serialized hydration, mutation and commit. Keep recent evidence and live commitments in the working set; fetch inactive actor evidence for operations that require it, then release it after publication. SQL recall/editor reads retain access to every eligible source. Save/restore captures complete durable state.
- Cognition maintenance must fetch its source inputs from durable history and revalidate against current sources at publication. Moving data does not introduce semantic expiry or reduce protected evidence.
- Domain remains deterministic and I/O-free. Preserve perception outcomes, event order, RNG, recipient privacy and individual evidence; optimize repeated identity/perception/copy work rather than dropping observations.
- Existing test fixtures will be updated only for current types/API contracts, without adding cases or running suites. Preserve strict compiler options and assertions.

## Implementation sequence

1. Establish clean baseline, current diagnostics and matched native/storage stress scenarios; refresh main before implementation.
2. Fix existing async/renamed-contract fixture typing and verify typecheck.
3. Implement database-backed inactive history placement and explicit full/scoped materialization; integrate recall, maintenance, edits, forgetting, save/load and recovery.
4. Profile and reduce dense first-exposure and repeated array copying; preserve comparable deterministic outcomes.
5. Run disposable SQLite/PostgreSQL native drills: crash before/after commit, concurrent writers and duplicate actions, rollback, malformed/incomplete migration, cold-source editing/forgetting, save/restore and source preservation. Stress independent history growth and first-release/half-scene populations with timings and memory.
6. Review complete diff twice (or until no notable findings remain), fix issues, run typecheck/build/format checks, reconcile PF08/D1/D2, architecture, memory/save specifications and actual verification evidence.

## Completion criteria

All typecheck errors resolved; committed review protections retained; ordinary startup/ticks do not materialize inactive history; age-based eviction only affects residency and leaves retrieval/save/recovery fidelity intact; measured copying/perception improvements without evidence loss; meaningful crash/concurrency/migration runtime evidence; all changed consumers integrated and documentation truthful. Report remaining capacity limits separately from implemented scope. No claim of hosted/browser/live-AI or 10,000-player qualification from native runs.

## Progress

- Baseline clean at da02629; review fixes already committed in 8f72e94.
- Initial typecheck: 168 diagnostics, all in existing test/fixture sources; primarily unawaited async APIs and stale action/agency/provenance contracts.

- Delivered cold-history recovery/release, stable durable ordinals, SQL context/inspector consumers and complete save capture; explicit actor hydration protects semantic edits/consolidation. Scheduling uses indexed facts before materializing history.
- Reduced dense acquisition preparation and finalization; matched outcomes remain identical. Fixed all 168 diagnostics without compiler relaxation.
- Completed native SQLite/PostgreSQL history, save, restore, forgetting, consolidation, crash, writer/duplicate and migration drills; prior review reproductions rerun successfully. No automated suites or paid calls.
- Two review/fix rounds corrected sparse ordering, first-summary parent ownership, optional-read serialization, scheduling reads, cancellation after hydration and asynchronous fixture assertions; relevant drills rerun.
- [Verification](../verification.md#data-runtime-hardening) records measured growth/dense results and limits. [PF08/PF09](../maintainers/performance.md), [D1/D2](../maintainers/production-data.md) and CR retain broader capacity/failure acceptance. Dense first exposure, full-backlog maintenance and large checkpoints remain explicit performance limits; regional physical-state loading is outside this slice.

## Follow-up consumer review

Review fixes estimated at 200–300 logic lines. Scope: preserve explicit delayed-trigger attribution after residency eviction, keep additive legacy awareness migration complete, and scope inspection freshness to the inspected actor. Owners are MemoryRepository/WorldService, response context assembly, and WorldRecords startup. Reuse canonical eligibility and source-revision validation; do not change retention semantics or materialize full histories for ordinary reads.

1. Reproduce cold-trigger, legacy-cold migration and unrelated-actor inspection failures with disposable native worlds (confirmed).
2. Add exact eligible evidence reads and connect AI routing, trigger facts and reference roles; validate their source revisions after attention.
3. Include only migratable legacy awareness in startup's working set; let the existing domain migration update it before release.
4. Track actor-scoped publication freshness for private inspection while retaining restore/permission checks.
5. Re-run native history/inspection/recovery checks, typecheck/build, review the resulting diff and update PF08/D1/D2 evidence. No new suites or paid calls. Completion requires the reproductions passing, cold sources staying nonresident, and changed/forgotten sources still rejected.
