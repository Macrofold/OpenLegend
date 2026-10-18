# A fast average can hide a slow busy minute

October 16, 2026. **New measured gap and next diagnostic selected before code.** Smooth 3× remains unmet.

The latest five-minute game finishes at an average of 3.000×, but that average hides a busy minute running at 2.32×. Near minute four, **17.3 real seconds’ worth of game time is already queued**. Residents then sleep and the clock runs faster to catch up. A player experiences the slow minute even though the final average looks good.

| Period of the same five-minute game | Actual speed during that period | Queued game time at the end, expressed as real seconds at 3× | Server CPU used |
| ----------------------------------- | ------------------------------: | -----------------------------------------------------------: | --------------: |
| First minute                        |                          2.991× |                                                        0.0 s |         43.93 s |
| Second minute                       |                          2.692× |                                                       0.84 s |         40.30 s |
| Third minute                        |                          3.064× |                                                       0.69 s |         43.81 s |
| Fourth minute                       |                      **2.320×** |                                                  **17.32 s** |         36.05 s |
| Fifth minute                        |                      **3.931×** |                                                        0.0 s |         31.85 s |

The periods come from the existing completed minute observations, which are slightly longer than exact 60-second windows. Queued time does not include real time the host has not yet offered to the simulation. At the fourth observation, total unfinished requested progress is about 18.7 real seconds. CPU does not identify the cause by itself: a slow minute can do less calculation because the game is advancing less. All sixteen residents are sleeping at cutoff, each for the last 52–62 seconds. That correlation does not prove which particular calculation causes the slowdown.

The same game has walking confirmation of 575 ms at the 95th percentile, visible walking starts of 859 ms, and a 254 ms drawing gap at second 274. The bounded recorder watches only seconds 181–235 and misses that gap. Source, assets, finite food and work, 351 matched meals, life, zero errors and exact owned cleanup pass. [Complete prior measurement](47-catch-a-freeze.md#completed-natural-game-the-long-gap-occurs-after-the-recorder-stops).

## What must be measured next

We need to separate actual calculation, saving and waiting **during each busy minute**, rather than rely on a final sum. We also need to watch for a frame freeze throughout the game, rather than move the recording window to another guessed time.

**Selected scope, before edits:**20–40logic lines in the existing profiler, plus three private recording-setting lines. Add only bounded, read-only counters to its existing start/minute/end observations: cumulative elapsed totals and counts for native calculation, complete saves, database requests, waiting for a world-change turn, and public-view preparation; cumulative accepted resident plans/meals and number of sleeping residents. Reuse the already collected stage totals and existing16person list; no new timer, SQL query, per-operation log, game rule, model, cache or mutation. Differences between samples assign a finished operation to the period in which it completes. They are overlapping elapsed spans, not additive CPU or exact clipping of cross-minute saves. Count sampling time as before.

Apply that same reporting change to the canonical profiler and a fresh private copy of the qualified combined game. Inspect the full delta, format and typecheck canonical/private sources, verify the complete443-file identity (only the profiler may differ), preserve all package/source/worker/finite-world qualification, and reuse unchanged native/storage proofs by identity. The added counters need nonzero, monotonic actual samples and agreement with final measured totals; sleeping/admission counts must match actual routine outcomes. No new gameplay implementation is released.

For this **new full-play recording method**, keep the fixed **8MiB configured rolling buffer,64MiB trace file,500,000events and15s completion acknowledgment**, but arm from the start of measured play, with the same one-second warmup. Stop750ms after the first>200mscomplete callback gap, or at ordinary five-minute completion. Change the explicit maximum recorded duration from60s to**305s**, because the new rolling method discards older data and keeps memory/output bounded; the prior55-second observation already verifies a wrapped31.3MBoutput. This is a newly selected coverage experiment, not a retroactive pass for an old truncated trace or permission to raise its file/event/memory limits. More total tracing may add CPU overhead and alter the workload; report it as diagnostic, never as an uninstrumented performance gain. Preserve the rawloss flag and positive-target/500msmargin/two-clock-anchor/complete-stream interpretation limits.

The actual phase remains one300-second browser/305-second server game, original900souter/64MiBbrowser/4MiBserver, ordinary survival/travel/actions/saves, no provider or artificial stall. It uses the corrected, five-case-qualified readiness reader and owned generated-database cleanup. Prior positive ordinary/wrapped/actual recorder qualification remains applicable because only arming and the duration ceiling change; the marker, trigger, rolling buffer and stream bodies are unchanged. One newly selected game follows static/source checks; no automatically repeated long run is selected. No hit, insufficient retained context, invalid counters, errors or timeout remain explicit failed/negative results.

Raw prior game: `/private/tmp/ol-pf168-graphical-natural-20261016-e-server.json`; negative target review SHA-256`49da8874ad461a430ea442faacd7133fda803cf7277cdd2c7d2f899e898c938c`. The next trial isPF16.169; nothing in this plan claims a fix.

## First phase-cost game completes

The selected game closes normally with all source/assets/worker, finite-work/life, no-game/storage/HTTP/console-error and exact owned cleanup gates passing. Added readings are nonzero and monotonic and exactly match final counts/totals. No artificial stall is injected. Detailed readback now passes, including actual frame coverage, all phase counters and their final totals. The values below come from those completed reports.

| Period end | Speed during period | World calculation elapsed | Complete-save elapsed | Database-request elapsed | Saves | Average elapsed per save | Sleeping residents at period end |
| ---------- | ------------------: | ------------------------: | --------------------: | -----------------------: | ----: | -----------------------: | -------------------------------: |
| 60.19 s    |              2.993× |                   29.70 s |               16.72 s |                  22.09 s |   155 |                107.85 ms |                                0 |
| 120.36 s   |              3.006× |                   32.41 s |               16.78 s |                  21.12 s |   156 |                107.58 ms |                                0 |
| 180.43 s   |              2.971× |                   33.20 s |               18.26 s |                  22.17 s |   155 |                117.79 ms |                                0 |
| 240.43 s   |          **2.757×** |                   32.41 s |           **20.52 s** |              **26.47 s** |   151 |            **135.87 ms** |                               16 |
| 300.47 s   |          **3.274×** |                   20.27 s |                8.39 s |                  13.63 s |    66 |                127.07 ms |                               16 |

These are overlapping elapsed measurements, not columns to add to CPU. The fourth period makes fewer saves than the third but spends more time in saving and database awaits; increasing save count alone does not explain this slowdown. The readings do not yet separate database execution, file waits and delayed application callbacks. The last period has no new resident plans or meals while all sixteen residents sleep, so catch-up cannot qualify busy-game speed.

The final mean is3.000646× over305.014seconds, with200.457server CPU seconds. Walking confirmation remains **534ms p95 /1,009ms p99 /1,853ms maximum**; visible starts from idle **612ms p95 /1,141ms maximum** across99starts. The longest complete save is **1,454ms**, longest recorded database await **938ms**, and longest world-calculation interval **319ms**. Those peaks need source and time attribution before a new optimization is selected.

Full-play recording runs299.930seconds, retaining a31.627MBrecent window with the rawloss flagtrue and complete EOF/stream close. No>200ms callback gap occurs anywhere in this measured game: maximum62.2ms. Draw submissions average89.94/second, with81.9ms maximum gap. One56ms browser long task is recorded. This is a negative natural-freeze observation, not proof the recorder fixes freezes or explains the earlier1.89second/254ms gaps. The browser measurement lasts301.555seconds, including final diagnostic recording completion; it is not a capacity comparison.

Raw `/private/tmp/ol-pf169-graphical-whole-20261016-a-{server,client}.json`. Server SHA-256`5cb6bf2d3573be58dc1cbada1d43308cdfe86ecf669af32338a64019e1304b41`; client `066c848af1a10a6dac51373fae3c4d6ed3efab614fcc2915a3c0c5a6ad85d214`. Original source, frame-gap and busy-minute failures remain unchanged.

Completed readback `/private/tmp/ol-pf169-whole-phase-review-20261016-a.json`, SHA-256 `310ac7743b510ae09fa9f38523bd0368916e8020905df27499f08e243921954f`. The signed difference from nominal requested time is slightly negative at cutoff (about66ms) because clock/sample boundaries differ; it is not negative queued debt or extra capacity. ClosePF16.169as a completed measurement, with input, busy-minute speed and rare-freeze cause still unresolved.

## Later reporting review — October 16, 2026, 19:06 EDT

The old growth-summary sleep count checked whether a Sleep record existed, including inactive records after waking. PF16.184 fixes that reporting bug. These two games retain independent minute logs that correctly check active sleep, and every resident starts rest once with no wake before cutoff. Their counts agree with the table above, so the reported busy-minute slowdown and end-of-run sleep correlation stand. Neither the old nor corrected count proves why the game slowed. [Audit and correction](61-branch-review-and-lessons.md#current-sleep-correction-and-historical-audit--1906-edt).
