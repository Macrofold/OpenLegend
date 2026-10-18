# Retest saving the recent character-result list without rewriting unchanged entries

October 16, 2026. **Completed current-code diagnostic; still private.**

The game keeps the latest 300 character decision/action results in order. When a new result replaces the oldest one, the current database representation moves the remaining entries' position numbers. Their actual contents are unchanged, but they are written again. This is separate from the permanent records used to recognize repeated player commands.

The latest complete database measurement identifies these writes as its largest standalone family: **175 requests and 10,917 written rows**, taking **634 ms execution plus 22 ms planning** and producing **21.64 MB** of database recovery-log data during about 30 seconds of play. Some other writes share grouped requests and cannot be attributed to this list alone.

An earlier private implementation already proved that keeping surviving entries' position numbers can avoid 299 unchanged writes per rollover while preserving the complete ordered 300 results. However, its older one-pair running-game test was slower: **1.876→1.681×**. That failure is retained. This is a current-code retest justified by new measured cost, using four alternating observations rather than treating reduced writes as a speed result.

| Version    | What is saved                                                                                        | What the player should see                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Before     | Unchanged entries receive new position numbers after the oldest is removed.                          | Complete ordered latest 300 results.                                        |
| Diagnostic | Surviving entries keep their position numbers; real reorders still receive an appropriate new range. | Exactly the same complete ordered results. No intended gameplay compromise. |

The experiment reuses the existing storage owner and its earlier reviewed implementation, adapted to current code. It must preserve the newer permanent command-history representation and avoid adding preparation to unrelated collections. No result is deleted early, no history is hidden, and no authority or durable acknowledgement changes.

Before timing, verify all nine existing actual storage groups, including append, order, reordering, numeric/separator IDs, discard/competing preparation, rollback, reopening, checkpoint and ordinary current restoration. Verify complete ordinary Save/Load and private observations/corrections/forgetting, current types and the real route worker. Every test database is recorded before connection and independently verified gone after normal cleanup.

Only then run four older-world 30 second server phases in before/after/after/before order, retaining 17 people,40 animals, real walking/work/food, finite resources, ordinary saving and all input/activity/error gates. No CPU sampler, extra counters, paid provider or forced collection is added. A lower write count alone does not establish smoother play or 3×.

[Standalone bottleneck report](bottlenecks.md) · [Prior negative trial](03-saving-and-render-preparation.md#keeping-recent-result-order-without-rewriting-survivors) · [Current database evidence](37-database-execution-times.md) · [Plan](../../projects/three-times-scene-performance.md#current-recent-result-storage-retest)

## Current qualification before timing

Both copies pass formatting, equivalent formatted execution, TypeScript, complete443file/package/dependency checks and real separate navigation workers through all six namespaces. Source review preserves the indexed permanent-command path and prepares the extra entry list only for collections explicitly requesting stable storage positions. A common private fixture records each generated database synchronously before connection; it is not installed in canonical test code.

The unchanged earlier nine-group helper passes on the current candidate. The301st result leaves299survivor SQL revisions unchanged, with one inserted result and one oldest deletion. Full/active paged reopening, value edits, true reorder, numeric/separator IDs, competing/discarded preparation, empty maps, actual SQL rollback, checkpoint/normal restore and an independent cloned-value repository all pass. Both exact journaled test databases/sessions count0/0 after normal close; both directories are absent. A further complete current-world/private-place/correction/forgetting/reopening proof also passes with exact owned cleanup.

All domain, spatial, language, protocol, AI, current-world validation and native routine sources plus the private library binding are byte-identical to their qualified parent. Complete fresh and older native proofs are reused on that explicit basis; this storage change is separately checked through actual SQL. None of these checks establishes a speed improvement. Four original older-world30second observations remain next.

Source index `/private/tmp/ol-pf158-source-preparation-20261016-a.json`; static `/private/tmp/ol-pf158-static-result-20261016-a.json`; nine groups `/private/tmp/ol-pf158-result-proof-candidate-20261016-a.json`; full world `/private/tmp/ol-pf158-postgres-0-candidate-20261016-a.json`; native reuse `/private/tmp/ol-pf158-native-reuse-20261016-a.json`. Additional/cumulative provider cost is **$0**.

## Four current running games: progress improves, input still fails

| Run | Version          | Actual speed | Command-delay p95 | Accepted / skipped inputs | New plans / checked meals |
| --- | ---------------- | -----------: | ----------------: | ------------------------: | ------------------------: |
| 1   | Ordinary storage |       2.413× |            977 ms |                    28 / 2 |                   37 / 21 |
| 2   | Stable positions |       2.490× |          1,328 ms |                    26 / 4 |                   37 / 21 |
| 3   | Stable positions |       2.609× |          1,111 ms |                    28 / 2 |                   41 / 25 |
| 4   | Ordinary storage |       2.212× |          1,301 ms |                    27 / 3 |                   36 / 21 |

| Comparison                           | Before → after      | Meaning                                                                          |
| ------------------------------------ | ------------------- | -------------------------------------------------------------------------------- |
| Mean actual progress                 | **2.312→2.550×**    | **10.26% higher** in this sequence. Both changed runs exceed both ordinary runs. |
| Mean of each run's command-delay p95 | **1,139→1,219 ms**  | **7.04% worse**. This is not a pooled percentile or a responsiveness pass.       |
| CPU per completed game second        | **5.739→5.432 ms**  | 5.36% lower descriptively; phases complete different work.                       |
| Summed completed saves               | **12.139→11.484 s** | 5.40% lower; overlaps other work.                                                |
| Summed SQL awaits                    | **14.304→13.564 s** | 5.18% lower; includes scheduling and callbacks.                                  |
| Summed ordered-change waits          | **17.011→15.716 s** | 7.61% lower; overlapping waits are not exclusive wall time.                      |

Every run preserves all17people and40animals, all16residents select at least two new plans, and every checked food output matches. Source/package/worker/startup/ready/error and normal exact database/session/directory cleanup all pass. All four runs still fail3×, skip scheduled inputs and exceed200mscommand p95. The second changed run's longest save is1.233seconds; the first's is2.011seconds.

**Decision:** keep the implementation private while testing the combined system and remaining latency. It is a measured current throughput improvement with complete selected correctness checks, not a smooth-game fix or a reversal of the earlier negative pair. Canonical runtime is unchanged. The top30SQL report cannot establish complete per-family request counts; the exact299avoided survivor writes come from the real controlled database proof, not inference from missing SQL rows.

Reports `/private/tmp/ol-pf158-aged-{0-baseline,1-candidate,2-candidate,3-baseline}-20261016-a.json`; complete comparison `/private/tmp/ol-pf158-aged-comparison-20261016-a.json` (SHA256a10cf31d…59e7de). All failures and source/lifecycle records remain. Additional/cumulative provider cost: **$0**.
