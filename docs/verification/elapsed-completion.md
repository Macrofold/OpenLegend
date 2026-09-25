# Elapsed-simulation continuation

This supplements [elapsed implementation evidence](elapsed-simulation.md). [PF13](../maintainers/performance.md#pf13--elapsed-time-simulation) owns delivery and remaining acceptance. This continuation retained `feature/spatial-world-3d` rather than the older divergent cadence branch. Main `03105fed9209c126e4e69e9faeb4687f42d1e74a`, including the `fdcbd31` guidance changes, was already an ancestor of the resumed tip `476c534c`; no additional rebase was necessary. Existing automatic CI remains unchanged and is not claimed green.

## Profiling correction

The documented default offered horizon was sixty game seconds, but both the scenario parser and direct saved-world profiler still defaulted to one. The shared diagnostic default is now sixty; an explicit one-second comparison remains supported. The domain still chooses a bounded prefix, and reports count actual progressed game time, not requested calls. This affects diagnostics, not gameplay speed or integration policy.

## Native elapsed-prefix observation

Disposable diagnostics on Node 22.16.0 used the actual initialized domain/Rapier and seed-1086 world. A fresh frozen copy of the same initial world was advanced through 600 game seconds, offering either one or sixty game seconds per call with `maxIntervals: 1`. The mixed population added sixteen people, forty-eight deer and 240 resource objects. No provider, database or renderer participated in this diagnostic.

| Scene | Offered game seconds | Calls | Actual progressed game seconds | Total native milliseconds |
| --- | ---: | ---: | ---: | ---: |
| Starter, 14 entities | 1 | 605 | 600 | 740.68 |
| Starter, 14 entities | 60 | 49 | 600 | 58.84 |
| Mixed, 318 entities | 1 | 605 | 600 | 7749.66 |
| Mixed, 318 entities | 60 | 49 | 600 | 1014.10 |

This is one sequential series, including first exposure. It isolates the cost of imposing a one-second offered horizon on the same elapsed-capable code, not a paired old/new kernel benchmark or a capacity guarantee. Total event counts agreed (26 starter, 4685 mixed), but equal counts do not prove all intermediate perception/event/RNG traces agree under different sampled-discovery boundaries. Intervals were fractional where needed; sixty offered seconds did not imply sixty accepted seconds in each call.

Selected actual finite-mechanic observations also reproduced fullness depletion without backdated damage (0.003 fullness, ten elapsed seconds, final health 99.919); fire extinction at 2.25 seconds inside a ten-second request; rest completion at approximately 2.88 seconds followed by awake expenditure; and a thirty-second gather completing at time thirty inside a thirty-five-second request. These are printed runtime observations, not automated regression coverage.

## Running-server investigation in progress

A new isolated SQLite world ran the actual HTTP application, timer, navigation coordinator and zero-budget background services at 8x with 318 entities. Authenticated state/presence/preference/control requests were used. The forty-five-second diagnostic stopped producing state replies after roughly 31.5 measured seconds, and its external seventy-second execution limit terminated the process. The retained log showed progress from approximately 1028 to 16117 game seconds before the stall, with no preceding storage error. This run is **incomplete**, not an 8x pass, and no completed-run percentile or zero-debt claim is made.

The last durable world and its journal were recovered read-only into a separate diagnostic input. Two hundred actual native prefixes advanced beyond the last durable time (16230) without reproducing the HTTP stall. That narrows the investigation but does not yet establish its cause; application scheduling, projection and persistence still need diagnosis. No existing user save was touched.

Production TypeScript and Vite builds passed in this continuation. No automatic test suites or test files were written/run by the task and paid-provider spending remains zero. Cross-layer regression and longer observation requirements remain open, rather than being closed by the native timings above.
