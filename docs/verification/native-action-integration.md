# Native action integration evidence

September 26–27, 2026. Source `review/action-main-reconciled` at `580476bcfbfe8993b1c709acfacc7d4775b00941` was rebased onto refreshed `origin/main` at `f551e3d8fddbc548717332508d9abd31c433d3b8`, in local branch `codex/native-action-integration`. This report describes that branch plus its integration fixes; earlier reports in this directory retain their own historical baselines. [Plan](../projects/native-action-integration.md), [AR tasks](../maintainers/action-reconciliation.md#integration-tasks), [sanitized observations](native-action-integration.json).

**Integration code and documentation are reconciled; merge qualification remains incomplete.** PostgreSQL measurement is blocked by disk exhaustion, browser action interaction is unverified, and automated CI was not run under the repository's default verification policy. No live-provider work ran; all runtime work used zero AI budget. Injected revisions/classifications exercise native plumbing, not model quality.

## Reconciliation and corrected defects

- Retained main's account/control/generation authority, canonical owner records, cold-history queries, transactional commit hooks, checkpoint worker, resource claims, placement, shared navigation and dependency-aware scheduling, with incomplete spatial queries filtered before the ready-batch cap. Removed the obsolete branch fixed-step owner and unused raw-awareness cursor/invariant rather than maintaining parallel implementations.
- Scoped player action jobs to account/world/request identity and captured actor authority. Rechecked authority and timeline at publication. Keyed action controls and drafts by their access/actor/world/timeline scope, with draft cleanup on logout, owner change and restore.
- Bound revisions to operation, manifest and target perception episodes; retained native plan ownership and resource release. Preserved main's complete permitted action handles and 100,000-byte context refusal, removing the older branch's catalogue-order truncation. Optional entity detail reports coverage. Exact authored descriptions retain their free path; per-response pending-slot admission accounts for earlier interpretations.
- Adapted follow to current placement and navigation, preserved active hold versus completion, and allowed invalid follow to cancel without waiting on a stale navigation barrier. Follow reads only a currently perceived target and uses base-world tuning.
- Fixed contact updates that were mutating a read-only phase snapshot instead of the live draft. Preserved main's regional exposure cache, used scalar feature captures and immutable feature reuse, and consolidated owned evidence sealing into main's finalization owner.
- Merged bounded history construction and SQLite worker isolation with main's WAL read snapshots, queue deadlines and success-only publication hooks. Added failed server-factory cleanup in reverse resource order, preserved borrowed-store ownership, and handled early checkpoint readiness rejection without an unhandled promise.
- Reconciled canonical Architecture, agency/status, AC/BW/PF/EPR/AR trackers, limits inventories, regression IDs, historical links and decision history. The 384 repertoire entries remain design examples, not delivered commands.

## Static and production checks

Pinned dependency manifests and lockfile match main exactly. Two ordinary/offline installs failed with `ENOSPC`. Verification used ignored local links to main's already installed pinned packages, with workspace packages resolved to this integration checkout. No dependency/lockfile updates or unrelated checkout edits were made.

Pinned Prettier on the affected files, TypeScript (`tsc --noEmit`), generated-configuration validation, production build and `git diff --check` passed. The affected Markdown/source-comment link audit found no missing local targets or anchors. Production build warnings about PlayCanvas `worker_threads` externalization and the large client chunk are retained rather than suppressed. Full automated suites (`pnpm test`, `pnpm check`, browser suites) were not run; required CI remains a merge gate.

## Manual native runtime

Disposable seed-73 worlds used the real server factory, WorldService, SQLite worker and public HTTP action route. Temporary data and processes were cleaned up. Node 22.23.2 was used for the final exercises.

| Exercise                             | Observed result                                                                                                                                                                    | Limit                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Exact move through director and HTTP | Queued, completed native movement from X=11 to X=11.5 at Z=13; duplicate request reused the same job; cancellation succeeded                                                       | HTTP session had control; this is not a revoked-authority experiment             |
| Grounding choice retention           | Injected classification selected `candidate-59` from 64 offered choices, beyond the obsolete first-48 cap                                                                          | Native binding exercise, not semantic quality                                    |
| Revised action                       | Injected “walk quietly” revision disclosed absent stealth, persisted pending across close/reopen, then explicit approval queued work and removed the card from authoritative state | Fixture bypassed model inference; UI rendering/interaction not verified          |
| Visual follow                        | Held at desired proximity, approached a moved target, stopped after loss of sight                                                                                                  | Broader death/capability/height/occlusion/queued-target matrix remains AR02/AR03 |
| Physical contact                     | Installed pinned touch detector, exact overlap produced private contact, detector removal cleared contacts without a false end event; world validation passed                      | Does not qualify every sense/body/lifecycle combination                          |
| SQLite transaction and snapshot      | Failed transaction rolled back with rollback hook only; successful commit ran commit hook; concurrent WAL snapshot retained its original value; snapshot write was refused         | No crash-durability or concurrency soak claim                                    |
| Failed server startup                | Invalid SQLite path and refused PostgreSQL connection returned the original failures and exited; caller-supplied store remained queryable after intentional initialization failure | Missing extension, writer-lock and interrupted-startup matrix remain AR07.2      |

The IAB walkthrough remained at “Sign in to enter your world” for the disposable instance. Chrome automation could not attach. No user cookie store or authentication policy was changed to bypass this. The action controls still need browser interaction and accessibility qualification.

## Native performance comparison

Same Apple M1 Pro host, Node 22.23.2, mixed scenario with 376 entities, 180 calls to `advanceWorld(world, 1, { maxIntervals: 1 })` followed by `freezeWorld`. Each produced 179.000001 simulated seconds, 3,254 events and 3,474 awareness entries. Three unprofiled runs per source used its own checkout resolution. The main checkout had unrelated HTTP/docs edits, neither imported by this domain-only workload. These are short shared-host observations, not a controlled capacity benchmark.

| Measure                              | Main               | Integrated         |
| ------------------------------------ | ------------------ | ------------------ |
| Median total native time             | 1,435.8 ms         | 1,411.6 ms         |
| Total range                          | 1,355.9–2,009.3 ms | 1,376.4–1,545.0 ms |
| Per-run p50 range                    | 6.34–6.90 ms       | 6.66–7.20 ms       |
| Per-run p95 range                    | 7.31–29.20 ms      | 8.17–11.41 ms      |
| Worst step per run                   | 189.7–262.7 ms     | 143.6–153.7 ms     |
| End-of-run heap, not peak or post-GC | 69.3–69.4 MB       | 79.8–80.4 MB       |

Initial profiled runs exposed branch overhead in feature-proxy reads and duplicate evidence sealing; those were corrected. The final unprofiled sample has comparable total time and lower worst-step time, with somewhat higher warm median and heap observations. It does **not** prove output equivalence beyond counts, no performance regressions, memory stability, sustained 3× throughput or full-server capacity. Event perspectives intentionally changed. Investigate repeatable warm/heap differences in the matched PostgreSQL qualification rather than treating host noise or one heap sample as a diagnosis.

## PostgreSQL and environment blockers

PostgreSQL 14.17 and vector 0.8.6 were available locally. The explicit loopback disposable profiler invocation used the mixed scenario, five real seconds, rates 1 and 3, and 500 ms sampling. Fixture database creation failed with SQLSTATE `53100` (disk full), before any phase completed. A later native CPU-profile write also failed for lack of space and is not reported as successful evidence. Free disk remained below 1 GiB.

Free at least 5 GB, then rerun the documented [primary performance workflow](../maintainers/performance-profiling.md#primary-performance-baseline) against matched main and integrated sources. Preserve failed dense/accelerated targets from the historical reports until current measurements supersede them. Native-only timing and SQLite isolation cannot substitute for this gate. [AR02/AR03/AR04.3/AR07.2](../maintainers/action-reconciliation.md#integration-tasks) and [recovered regression requirements](../maintainers/action-regressions.md) retain the remaining qualification work.
