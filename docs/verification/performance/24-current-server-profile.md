# Where the current running server spends CPU time

October 16, 2026. **Completed current capture; smooth 3× and required resident/input activity fail.** The earlier detailed profile predates the two retained optimizations. This run will refresh that evidence before selecting another system change.

The question is what still consumes time while seventeen people, forty animals and 133 other root objects share the older busy world. Sixteen residents follow finite travel/work/food plans while player commands and screen updates use the ordinary server and PostgreSQL. Scripted plans do not establish live AI quality.

## Registered method

Finish and inspect the preceding event-delivery comparison first. Then use its qualified ordinary source, which includes the retained command-record and safe material-read changes, and restore the exact unchanged complete older saved world. Run one separate 30-second viewer phase using the existing CPU sampling option. Preserve the original 300-second watchdog, actual command/activity/late-error observations and source/input/dependency/worker/asset guards. Only the exactly owned temporary database, sessions, folder and process may be cleaned up. No new game code, allocation sampling, external database observer, new work counters, forced collection or model calls.

A private bounded reader will check the recorded measurement and sampling start/stop brackets, node/sample references and covered time before ranking anything. The profile/report size is checked before parsing. Clip sample intervals to measured overlap and retain initial uncovered time and long sample gaps. Exclusive leaf costs count each sample once; parent operations include children and must not be added to them. Idle waiting, garbage collection and unresolved ownership remain explicit. Samples estimate where time was spent; they are not exact backend, GPU or per-function CPU stopwatches.

Read the actual hot source paths to translate them into plain descriptions of gameplay work. Preserve failed activity and cleanup/error results. This instrumented run cannot certify smooth 3×, and differences from older profiles cannot be presented as a controlled speedup. The result will update [the standalone remaining-gaps report](bottlenecks.md).

[Project plan](../../projects/three-times-scene-performance.md#current-whole-server-cpu-attribution) · [Experiment register](../../maintainers/performance.md)

The reader reuses the existing clipped-profile calculation, adding input-size/node/stack bounds and a separate account of sample intervals longer than five milliseconds. It will show both all clipped spans and the subset with short intervals, rather than assigning a long interruption confidently to one endpoint. The five-millisecond split is an analysis aid, not a gameplay limit. Timestamp units and the first-delta relationship follow the [official V8 profiling protocol](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#type-Profile); the existing start/stop sequence follows [Node 22's inspector documentation](https://nodejs.org/download/release/v22.18.0/docs/api/inspector.html#cpu-profiler). The actual monotonic brackets still have to agree in this run.

## Reader qualification before current capture

The bounded reader successfully analyzes the preserved earlier 3.0 MB profile before the new run: all 23,961 sample/node references and actual monotonic brackets are valid. It clips 30,425.614 ms to that earlier measurement, reports 0.835 ms initially uncovered and separately identifies 264.666 ms in intervals longer than five milliseconds. Exclusive ownership and leaf totals each reconcile to covered time. This checks the reader on real captured data; these are **older results**, not the current profile.

A read-only inspection of the existing PostgreSQL service reports version 14.17, 128 MB shared buffers, 4 MB per-operation work memory, 4 GB estimated cache, a 1 GB write-ahead-log threshold and five-minute checkpoints; per-I/O timing is disabled. No setting is changed. A possible later diagnostic is an exactly owned separate database service with a different cache allocation, preserving normal durable writes and validation. Actual database working-set size and a controlled benefit are not established, so cache/cluster contention remains an untested hypothesis, not the explanation for the slow game or a recommendation to change the shared service.

## First launch rejected before database creation

The first launch selects 45 seconds, but source inspection after rejection confirms this private older-world diagnostic has an existing maximum of 30 seconds. It exits normally with an error after metadata reading, before directory/database creation; no profile or game-speed result exists. The generated-database sidecar is absent and the source proves creation is below the rejected guard. The owned process group is absent and source/input guards remain intact. This is a configuration mistake, not a demonstrated restoration or capacity failure.

Preserve the original log/lifecycle/source records at `/private/tmp/ol-pf143-aged-0-baseline-20261016-a.json.*`. Before the next release, select a fresh 30-second plan/output under the unchanged source and original 300-second outer bound. Do not weaken the existing duration guard. If the shorter profile fails the resident activity floor, retain that limitation rather than extending the diagnostic to obtain a pass.

## Current result and quality

The fresh 30-second capture completes a **30.753-second** measured phase at **1.943×**, with **1,204 ms** command-confirmation p95. It accepts 28 inputs and skips two. Residents select 28 new plans, with a minimum of one per resident, and twelve produced-food checks match. All seventeen people and forty animals survive. No command, storage, SQL, maintenance or observation error is reported through normal close. It fails the required activity/input/capacity targets; instrumentation prevents treating this as a clean capacity comparison.

The 2.40 MB profile has valid references and monotonic brackets, no negative intervals, and **30,749.492 ms** of clipped coverage; only **3.472 ms** at the beginning is uncovered. Of covered time, **930.585 ms** belongs to sample intervals longer than five milliseconds. This includes **562.583 ms** starting the profiler itself; it is reported separately. The shorter-interval view retains the same 13,675 ms world-calculation group, so that large observed cost does not depend on assigning a long gap to one sample. Process CPU is **24.035 seconds**, across Node's threads; profile idle applies only to its main JavaScript thread.

### Where sampled time goes

Each row below is an exclusive partition chosen by the named operation in the actual sampled stack. A sample is counted once; broader operations and library totals presented elsewhere overlap these rows. “Other” is retained rather than inventing a more precise explanation.

| Work                                               | Clipped sampled time | Meaning                                                                                          |
| -------------------------------------------------- | -------------------: | ------------------------------------------------------------------------------------------------ |
| Main JavaScript thread idle                        |             11.974 s | Waiting/scheduling outside executing JavaScript; not proof the whole process or database is idle |
| Other world calculations                           |              3.484 s | Remaining motion, native control and related calculation paths not yet fully assigned            |
| Finish coherent world snapshots                    |              2.994 s | Resolve temporary edits into the world consumed by saving and views                              |
| Other server/runtime work                          |              2.993 s | Remaining server, runtime and dependency paths                                                   |
| Apply elapsed needs, conditions and work progress  |              1.797 s | Advance people/animals and their active work over the accepted interval                          |
| Update current sightings, contacts and recognition |              1.638 s | Reconcile what characters currently perceive                                                     |
| Recheck ongoing conditions and effects             |              1.034 s | Match current conditions and reconcile active effects                                            |
| Prepare player views                               |              0.864 s | Build permitted information for the player's screen                                              |
| Garbage collection                                 |              0.824 s | Reclaim JavaScript allocations; this alone is not evidence of a leak                             |
| Predict the next simulation boundary               |              0.743 s | Find when the next consequential change must be processed                                        |
| Start/control the profiler                         |              0.563 s | Measurement overhead, not a game feature                                                         |
| Admit/execute commands outside earlier rows        |              0.546 s | Process actual commands through native rules                                                     |
| Prepare material exposure                          |              0.510 s | Remaining material/weather preparation after the retained safe-read change                       |
| Check unfinished navigation                        |              0.502 s | Decide whether time must wait for a required route                                               |
| Unresolved runtime program samples                 |              0.285 s | Samples without a more specific usable call stack                                                |

An alternative package view attributes **13.675 s to world calculations** and **0.560 s to spatial code**; these are not extra time to add to the table. A separate leaf-only count finds **6.300 s inside the immutable-edit library**. Its largest nearest application caller is snapshot finishing (**2.659 s**), followed by an unnamed world callback (**0.586 s**) and resolving read-only draft views (**0.358 s**). These library figures overlap the gameplay rows. They identify a shared bookkeeping cost across features, not a measured saving from replacing the library.

### Saving remains a separate large delay

Recorded elapsed spans show **14.474 s of native world work**, **13.102 s of saves**, **15.457 s awaiting database statements**, and **18.671 s awaiting the ordered world-change queue**. These overlap, and their totals must not be added. The longest save is **1.470 s**. The slowest retained statements include a **595 ms** searchable-evidence insert and a **532 ms** grouped physical/activity write. Preparing changed records before SQL takes **0.615 s** total; preparing historical event lookup inputs takes only **0.005 s**. This distinguishes large waiting costs from those smaller JavaScript preparation costs; statement-await time still includes connection, transport, backend and callback delays.

All source/input/runtime/dependency/worker/asset guards pass, and the owned process closes normally. Its exact generated database and sessions are absent and its temporary folder is removed. Restoration takes **54.618 s**, outside measured play. Evidence: `/private/tmp/ol-pf143-aged-0-baseline-20261016-b.json`, its profile/source/lifecycle/log companions, `/private/tmp/ol-pf143-current-attribution-20261016-a.json` and `/private/tmp/ol-pf143-current-callers-20261016-a.json`. Additional and cumulative provider cost remain $0.

## What this selects next

The shared world/snapshot work remains large. The already tested sixty-game-second idle territorial review saved 19.4% native CPU by reducing repeated shared updates, but still needs current-source and active-intruder qualification. Complete those checks before accepting that small gameplay compromise. The large saving waits remain an independent investigation; no database durability or privacy check is weakened.

Other untested design ideas remain hypotheses: a different native layout for the wide entity dictionary, reducing avoidable writable preparation of shared definitions, and an exactly owned separate PostgreSQL service to separate cache/cluster effects. Earlier counts show wide entity dictionaries, but do not establish that a representation rewrite would save most snapshot time. Earlier route-read and production-library trials failed to improve timing, so visible library/allocation costs do not justify blindly repeating them. No further design is accepted from counts or this one profile alone.
