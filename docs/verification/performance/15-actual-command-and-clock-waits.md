# What actually delays walking and the game clock

October 15, 2026. This is a complete timing recording from a restored busy world: seventeen people, forty animals, 133 other roots, ordinary database saves, recurring screen updates and actual HTTP commands. The instrumented game reaches **2.176×** over30.034seconds. It fails the3×target. Added recording work means this is attribution evidence, not a clean capacity comparison.

## The practical finding

Two separate costs matter: calculating what happens in the world, and waiting while another accepted world change saves. Making calculations faster leaves substantial waiting. Making saving faster leaves substantial calculation. The same waiting can delay both the game clock and a player's click, so their totals cannot be added together.

| Time inside recorded clock calls                | Measured coverage | What it means                                                                              |
| ----------------------------------------------- | ----------------: | ------------------------------------------------------------------------------------------ |
| Recorded world calculations lasting at least1ms |           13.192s | Actual synchronous calculation spans; shorter calls are absent from this detailed view.    |
| Waiting for another world change to finish      |           10.199s | The clock has work ready but cannot enter the single ordered world-change owner.           |
| Recorded cooperative yielding                   |            0.837s | Waiting deliberately to let other work run.                                                |
| Mixed overlapping labels                        |            0.028s | Retained separately, not counted twice.                                                    |
| Time without one of those direct-owner labels   |            5.515s | Includes unrecorded shorter operations and other work; it is not an invented CPU category. |

These rows partition29.774seconds inside actual clock calls. Gaps between calls are separate. The normal stage counters measure16.249seconds across all216,826native iterator calls, including short ones; that different overlapping view must not be added to the table. Clock calls increase from small fractions of a second to **7.942seconds** as more elapsed game time must be processed in each call.

## Who blocks the clock?

| Running world-change owner during the clock's wait | Holder overlap | Of that, overlap with its database-call waits |
| -------------------------------------------------- | -------------: | --------------------------------------------: |
| Residents accepting plans                          |         6.195s |                                        5.315s |
| Player HTTP commands                               |         3.838s |                                        2.913s |
| Other recorded changes                             |         0.137s |                                        0.123s |

Small transition gaps account for the remaining0.029seconds. “Database-call wait” includes admission, transport, backend execution and callback delivery. It is not measured database CPU or proof of a particular lock, disk operation or slow query plan. Each overlap is clipped to the actual running holder; nested player-command work retains its exact HTTP request identity.

## What happens to a player's click?

All28commands are accepted, with no HTTP5xx, SQL/maintenance rejection or storage error through normal closure. Across those requests, summed server request duration is **7.181seconds**: **3.570seconds** waiting for their own database calls, **2.193seconds** waiting behind other world changes, and **1.418seconds** without those labels. This is a sum across28requests, not seven seconds of extra whole-game time.

The slowest request takes **1.111seconds**. It spends **953ms** waiting for its turn: about **896ms** behind a resident's accepted plan and **57ms** behind clock work. The resident's holder overlaps **886ms** of its database calls. The player request then spends about **106ms** in its own database awaits and **52ms** in other/uncovered work. This is direct evidence of a save-related walking delay; it does not prove the database backend itself consumed all that time as CPU.

A different slow request takes **578ms**, with **472ms** in its own database awaits and only **29ms** in the ordered queue. A single fix to the queue cannot explain or remove every slow confirmation. Client-observed confirmation p95 is700ms in the main report; server-listener intervals above have different start/end points.

## Cutoff and correctness limits

At actual cutoff the clock owes1,366.205game seconds, or **7.590real seconds** at3×. Another **0.657real seconds** have not been offered; together that is **8.247seconds behind**. The game normally advances60game seconds per real second at1×, and180at3×.

There are twelve recorded clock calls: eleven overlap measurement, including one still running at cutoff; one occurs only during reporting. That last call has zero measured coverage. All three saved phase-edge copies retain their original values, and the still-active call is not given a fabricated cutoff completion. Asynchronous descendants after an HTTP response finishes are excluded from that request's duration; a related descendant is not automatically its caller's critical path.

The first reader fails by expecting all twelve calls inside measurement. The corrected b reader passes arithmetic but understates query coverage when nested player-command work has a different owner label from its HTTP holder. The c reader uses the exact retained request identity and otherwise the same clock/owner identity; four clipping/overlap and two ownership cases pass. Original a/b sources, observations and raw data remain unchanged. No game rerun is used to repair a parser error.

The raw recording has9,318events/28requests, zero omissions/observation failures, zero active operations at close and successful resource/directory closure. Full runtime/source/client/checkpoint and exact owned database cleanup already pass in [the original run](13-restoration-and-clock-recording.md#actual-stage-journal-observation). Additional and cumulative provider cost remain$0. No refused command occurs, so the earlier refused-command creation origin remains unknown.

Private read-only result: `/private/tmp/ol-pf131-wait-analysis-20261015-c.json`, source `.py`, preserved a failure `/private/tmp/ol-pf131-readback-failure-20261015-a.json` and b results. Both input hashes are pinned before/after analysis. No source map representation, gameplay, timer, database query, sampler or paid call changes in this analysis.
