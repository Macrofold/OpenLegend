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

## Running server: completed and incomplete observations

The actual HTTP application, timer, navigation coordinator, zero-budget background services and disk SQLite ran in isolated directories with normal authenticated state/presence/preferences/control requests. The diagnostic set `pauseWhenHidden: false`, refreshed presence and selected 8x. Sampling used monotonic real time and actual `world.simTime`, not attempted calls or excluded-time counters. The added people were native-controlled; no LLM inference was dispatched. Rendering, live speech-branch integration and PostgreSQL were absent.

An initial forty-five-second diagnostic stopped producing state replies after roughly 31.5 measured seconds, and its external seventy-second execution limit terminated the process. The retained log showed progress from approximately 1028 to 16117 game seconds, with no preceding storage error. This run is **incomplete**, not an 8x pass. The last durable world and journal were recovered read-only into separate diagnostic input. Two hundred actual native prefixes advanced beyond the last durable time (16230) without reproducing the HTTP stall. A separately copied database also reopened and advanced through that time in the real server. These observations do not identify the original cause or prove it fixed.

A fresh repeat added diagnostic liveness logging and bounded HTTP fetch waits; production code and fidelity were unchanged. It completed the full observation window and shut down normally. A separate dense-flight case also completed but failed the requested rate:

| Workload | Measured wall seconds | Actual game seconds advanced | Realized multiplier | State request median / p95 |
| --- | ---: | ---: | ---: | ---: |
| Mixed, 318 entities | 45.976 | 22037.598 | 7.9887x | 32.26 / 55.60 ms |
| Mixed plus contested flight and stacked floors, 378 entities | 15.212 | 1005.002 | 1.1011x | 55.41 / 130.37 ms |

The second workload adds forty-eight copies of the native bird (forty-nine sharing the route/perch), twelve fires and twenty-four elevated support patches, for twenty-seven authored supports. This intentionally concentrates occupancy and deadlines; no public admission limits were raised and no collision checks were disabled. The first workload retains the starter's geometry/flyer/fire. It is not a joined hearing/visual/crowd qualification.

Before the final pause, mixed debt was 25.07 game seconds, navigation waiting was zero and the runtime collector reported approximately 99% process CPU. Its 2148 native intervals include warm-up; recent interval p50/p95 was 18.76/28.17 ms and the observed maximum was 345.02 ms including startup/exposure. The selected workload nearly sustained 8x but has little CPU headroom and does not satisfy the small synchronous-slice budget. Median commit was 7.12 ms. Pause was acknowledged in 60.14 ms.

The dense-flight run retained 383.27 admitted game seconds of debt before pause and had also accumulated substantial wall time while its previous tick was still busy. Recent native interval p50/p95 was 37.90/44.14 ms; final pause took 86.55 ms. Its collector counted only 3.92 active real seconds during a much longer run because callbacks were still busy; the actual monotonic interval above is therefore the capacity denominator. Post-pause debt reset is not successful catch-up. No storage error was reported in either completed run.

These are single short observations with different workloads, not a many-world throughput or tail-latency certificate. Retained metric histories mix startup/warm-up with the measurement period and keep only the latest 256 samples. The initial unexplained timeout remains a reproduction/soak gap under SR29; the successful repeat must not erase it. The global-boundary coupling and crowded-perch limit remain PF13.9/RP03 work, not evidence that elapsed integration is still universally per-second.

## Gameplay and restart

A separate clean production-server world on loopback port 3253 used normal HTTP commands to reach exactly `{x:24,y:3,z:6}` on `lookout-deck`, reject those elevated coordinates with `terrain` support, descend to `{x:20,y:0,z:5}`, and pause. A clean shutdown/reopen preserved the latter position/support and exact game time `464.3591683200001`, reopening paused. Actual Recast preparation and elapsed native movement ran; no saved positions were edited.

The first same-process restart probe reused a closed HTTP keep-alive connection and received `UND_ERR_SOCKET` after the server had already closed normally. The disposable client was changed to close its connections, and the fresh repeat completed. This was a driver transport correction, not a gameplay/runtime change. No existing user save was touched.

## Checks and scope

Production TypeScript, generated configuration checks and Vite builds passed in this continuation. No automatic test suites or test files were written/run by the task; normal repository CI remains an independent merge gate. Paid-provider spending is zero. Application/worker processes were stopped after the observations, and temporary source/document transfer workflows were removed without modifying ordinary CI.

No new browser or physical-GPU acceptance was performed: independent frame pacing exists in the client, but native throughput does not establish 60 FPS. Cross-layer regression, nonlinear/coupled integration, richer crossing detection, long-session liveness, local-deadline isolation and joined speech acceptance remain open in their canonical trackers. The boundary catalogue is a running design inventory, not a declaration that all listed extreme-scale mechanisms are implemented.
