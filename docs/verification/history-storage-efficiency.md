# History storage efficiency verification

These are recorded observations from the original verification log, not a new run. “Current” refers to each observation’s recorded revision. [Verification index](../verification.md) · [Current acceptance owners](../maintainers/README.md).

## History storage efficiency

2026-09-27, branch `codex/history-storage-efficiency`, refreshed `origin/main` at `0b9c51aa`. Local macOS ARM, Node 22.23.2 and PostgreSQL 14.17 via the explicit loopback disposable-database helper; all created databases were closed/dropped. `AI_BUDGET_USD=0`; no provider execution. Scope: [D1/D2 plan](../projects/history-storage-efficiency.md), PF08, MH07 and SB15.

Matched synthetic query workloads used 100,000 and 1,000,000 event, awareness and old resolved-memory rows with unchanged actor owners. The memory cutoff excluded those old rows; a separate native scenario exercised recent and unresolved records. Each latency below is a single client-observed query sample, including I/O, not a percentile or complete startup measurement. The original-query sample preceded the schema change; the revised query used the same generated cardinalities/payload patterns plus its required projections. Cache/I/O conditions were not controlled.

| Query                                    | 100k before → after | 1m before → after |
| ---------------------------------------- | ------------------- | ----------------- |
| Find actors with stored observations     | 31.9 → 1.75 ms      | 481.5 → 8.96 ms   |
| Recover next observation-list positions  | 25.9 → 1.59 ms      | 188.0 → 5.94 ms   |
| Select startup memories                  | 14.4 → 1.64 ms      | 517.0 → 5.60 ms   |
| Recover retained event count             | 317.8 → 0.44 ms     | 2,717.8 → 0.87 ms |
| Check an absent character-reply identity | 193.0 → 0.68 ms     | 2,065.2 → 3.36 ms |

Revised `EXPLAIN (ANALYZE, BUFFERS)` plans enumerate two owner rows, seek indexed per-owner tails/maxima, use separate recent/unresolved memory indexes, and use a primary-key lookup for the total and a response index for reply identity. The million-row awareness selection returned only 256 rows; the memory miss returned zero without scanning the old corpus. Warm plan execution was 0.008–0.102 ms for these metadata/miss queries, excluding client time. These figures are deliberately separate from the single cold/mixed-I/O samples above.

A second sparse-dialogue fixture placed 100 matching utterances among 100,000 actor perspectives. The previous equivalent JSON participant filter took 288.7 ms; the indexed participant query took 1.67 ms. The full `HistoryRepository.transcript` caller, including watermark and action-stream merge, returned 40 permitted utterances in 6.31 ms. Plans showed approximately 99,900 rejected nonparticipant rows for the previous filter versus 41 indexed perspective rows and 41 event-key lookups for the new page. It preserved permitted wording. This compares the participant filter on the new physical table; it is not a full old-schema benchmark.

Disk costs moved in both directions: at one million rows, awareness table plus indexes fell from 1,196,523,520 to 1,099,366,400 bytes (about 8%). Event table plus indexes rose from 545,546,240 to 750,379,008 bytes (about 38%) with reply/reference projections. These fixtures did not populate a representative witness fan-out for total before/after storage; they do not establish net world-size savings from removing the separate audience table.

One disposable 800-event native/repository scenario exercised startup, `WorldService` creator event/character edits, correction/forgetting, actor-parent deletion, dialogue, checkpoint restore and restart. It verified:

- Recent/unresolved personal memories remain resident, observation tails stay bounded and cold sources remain queryable.
- Transitive dependent summaries are selected and invalidated; unrelated cold memories/summaries and another actor’s sources survive. Terminal appraisals are loaded and scrubbed by the existing privacy owner.
- Cold event deletion checks references from other cold events; protected commitments refuse forgetting. The existing service bug that reported a rejected forgetting transition as success was fixed and exercised.
- A world change between preparation and mutation returns `stale` without applying the prepared edit.
- Current-format worker capture/install/restart preserves counts and event deletion; operational backup write/read retains combined perspectives, external tables and event totals.
- Transaction rollback restores both the deleted event and its count; deliberate count corruption fails the audit and checkpoint capture. Incompatible and missing database markers are rejected without changing stored event rows.

Existing focused checks: PostgreSQL writer/stale-revision fencing and service settings/half-speed restart passed. The existing store test “persists state and command receipts together across close/reopen” initially failed at its unchanged assumption that the initial `PLAYER_ID` inventory contains `berries`, before the changed persistence behavior; current seeded-world persistence was covered by the ad-hoc scenario instead. The [follow-up below](#persistence-test-setup-follow-up) resolves that fixture failure; broader coverage remains in [TODO](../maintainers/TODO.md#deferred-regression-coverage--persistence-and-owner-editors). TypeScript, production build, config/guidance checks and changed-file formatting passed; guidance size and Vite externalization/chunk advisories remain. No full suite, browser, live-model, hosted, crash-process or natural-aging capacity qualification is claimed. Existing CI and broader PF08/D2/SL gates remain open.

### Persistence test setup follow-up

On September 27, 2026, the owner authorized repairing this existing test without adding tests or changing game behavior. It now creates a three-berry item through `createItemLot` before the first commit and checks that item's identity after reopening and replaying the command. Full saved-state equality, duplicate-command rejection and the two-berry remainder assertions are retained.

`AI_BUDGET_USD=0 OPENLEGEND_TEST_DATABASE_URL=postgresql://localhost/postgres pnpm exec vitest run apps/server/src/store.test.ts -t 'persists state and command receipts together across close/reopen'` passed: one test passed, seven unselected tests skipped. The initial sandbox attempt was blocked at database connection (`EPERM`); the permitted rerun used the existing disposable PostgreSQL helper and completed cleanup. `pnpm typecheck` passed. No provider calls, new tests or full-suite run were made; full CI remains unverified.
