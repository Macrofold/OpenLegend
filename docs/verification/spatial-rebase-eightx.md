# Spatial rebase and eight-times runtime review

## Source and conflicts

Replayed the 27 commits unique to `feature/spatial-world-3d` at `133049b01a302f4ae75dd70604325727b4706fbe` onto main `c466b63f818021a6cd65d0809b94f220cce642d4`. A named backup retains the original tip. Publication uses an explicit old-tip force-with-lease and verifies main has not moved; main itself is not modified. The same conflict resolutions were replayed on GitHub and their complete Git tree matched the local reviewed tree before integration fixes.

Five historical commits required conflict resolution. Major semantic overlaps were base-world ownership/configuration, replacement of `actor.rest` with status-effect capability gates, new item/pickup/strike action contexts, observer-scoped names and perception episodes, follow-camera/status-pose presentation, and the newer in-place save policy. Current-main semantics won in those areas while Recast request/results, proxy shadows, observer-private acquisition and full-facing/depth presentation were retained. Action-context preparation now reuses reached/pending RoutePlan values rather than assuming synchronous path arrays. No ambiguous product conflict remained after applying the current owners; D51 and larger future contracts are not resolved by a rebase.

Compilation caught a retired sleep-field read, and the full configuration check caught a composition script constructing geometry before collision initialization. Both were fixed. The native profiler had the same initialization dependency and could incorrectly divide requested iterations by time when Recast blocked progress; it now reports actual advanced simulation and an explicit blocked status. No new save format, dependency version, reset, sensory range or content limit was introduced.

## Verification boundary

Production TypeScript, current configuration generation/check and Vite builds passed. No unit/integration/browser assertion suite or test file was written or run. No paid provider call was made. All application runs used a minimal explicit environment, zero AI budget, fresh isolated SQLite storage under `/mnt/data/eightx-observations`, normal server code and no existing user saves. Server/worker processes were stopped after each run. The initial disposable app wrapper needed ESM mode and a clone of the frozen fixture input; those diagnostic setup errors were corrected rather than weakening application validation.

Node 22.16.0 ran in a container exposing five logical CPUs on an AMD EPYC 9V74. There was no physical-GPU or browser qualification in this pass. Production builds do not establish image/depth correctness for every camera pose; SR24 retains status-pose/renderer integration coverage.

## The real 8x budget

The actual configuration has baseRatio 60. At speed 8 the target is 480 simulated seconds per wall second. Existing 8 ms cooperative batch limits are not a promise that each atomic native transition fits. The host already has frozen snapshots, append-aware history, bounded routine persistence and mutation yielding; those upstream improvements were not replaced.

Two actual running-server observations used authenticated presence/profile/control/state endpoints, set `pauseWhenHidden: false`, selected speed 8 and polled state once per second for about ten seconds before pausing. The mixed setup used the existing scenario generator through an isolated service transition, not a newly exposed authoring API. Both used actual Recast/Rapier, native timers and SQLite; no browser/SSE consumer or paid cognition was added. The mixed data had 16 added memory-capable people, 48 added native deer and 240 resources, for 318 entities total; this particular run did not add surfaces/fires beyond the starter map.

| Workload             | Measured wall interval | Actual sim seconds advanced | Realized sim seconds / wall second | Outcome                                           |
| -------------------- | ---------------------: | --------------------------: | ---------------------------------: | ------------------------------------------------- |
| Starter, 14 entities |               10.077 s |                       4,838 |                             480.10 | Short server observation sustained requested rate |
| Mixed, 318 entities  |               10.376 s |                       1,019 |                              98.21 | Failed requested dense 8x rate                    |

Neither run reported navigation preparation during the measurement. The mixed process was CPU-saturated and its timer recorded 195 callbacks while an earlier tick was busy. The last due-step gauge before final manual pause remained 1,848; the pause resets the pending-debt gauge, so a post-pause zero must not be misreported as having sustained the requested rate. Time not yet admitted while a long tick is active must also be counted in future latency/debt instrumentation. Realized rate above uses actual monotonic elapsed time, not only admitted-clock counters.

The bounded collector's recent native-step p50/p95 was 0.460/0.681 ms for the starter and 11.576/15.142 ms for the mixed run. Its maximum native step, including setup/first exposure, was 21.04/357.81 ms respectively. Median world commit was 0.772/3.644 ms; the mixed largest commit was 139.42 ms. These histories include the warm-up and fixture boundary, and the collector retains only its latest 256 samples per stage; they are not independent tail distributions. The evidence points to repeated sensing/state work, not a claim that database/rendering cost is absent in other workloads.

The existing native CPU profiler separately ran 240 measured starter steps and 120 mixed steps after 30/10 warm-up steps. The corrected mixed rerun advanced all 120 actual seconds, reported 7.931/8.749 ms p50/p95 and 0.261 native headroom relative to 480 required. Its final world digest exactly matched the earlier same-scenario run (`7a02a8c23192b545c1d7a70f6d516b5b858c193a07166421be0b5835526bccaf`). CPU sampling implicated updateEncounters, immutable finalization and proxy traversal. These are instrumented native diagnostics, not application/rendering capacity evidence.

## Implemented acoustic pruning

The two-file follow-up adds `soundTransmissionAtLeast`. With admitted factors restricted to [0,1], one crossed barrier below the required threshold proves the final product insufficient. Such a query can stop the existing spatial-tree traversal immediately. All successful numeric values and full-transmission calls retain the original sorted multiplication order. The existing 0.65 intelligibility threshold, source/listener anchors and distance multiplication remain in the same perception owner. No approximate attenuation product, altered audibility policy, skipped recipient or emission-origin cache was introduced.

A disposable diagnostic compared actual native ray collection/reduction to the new implementation on the starter geometry plus 24 additional floor slabs (27 authored supports). Floor levels were 2.5 m apart with transmission 0.35. Each case had 3,000 deterministic rays, with seven alternating timing rounds after an untimed equivalence pass; all segments were within the current 10 m hearing range. Layered rays traveled eight vertical metres; clear rays were above all slabs; mixed rays had bounded random displacement. The diagnostic reports raw primitive performance, not a full hearing event or game-speed improvement.

| 3,000-ray batch                    | Previous median | Revised median | Numeric/decision differences |
| ---------------------------------- | --------------: | -------------: | ---------------------------: |
| Nearby multi-floor blocked rays    |       13.144 ms |       6.888 ms |                            0 |
| Clear rays                         |        1.572 ms |       1.620 ms |                            0 |
| Mixed nearby rays (1,796 rejected) |        7.830 ms |       5.937 ms |                            0 |

The demonstrated reduction is about 48% in the multi-floor primitive and 24% in the mixed primitive; the clear case is slightly slower in this small series. Initial exploratory long rays were replaced with the within-hearing-range workloads because normal distance rejection would otherwise avoid those acoustic calls entirely. None of these timings establishes a 90% whole-game improvement or solves the dense native-step bottleneck. The preceding server rate observations are before this small acoustic change; it is not credited with increasing their realized rate.

A final post-change starter-server run used another isolated database, advanced 4,839 simulated seconds in 10.059 wall seconds (481.04 sim-seconds/s in the short measurement window), and accepted pause in 2.42 ms. It again ran the actual timer and SQLite with no navigation wait or storage error, then closed normally. This smoke observation confirms the final acoustic code runs in the application; it is not a matched whole-game speedup comparison.

## Remaining work

PF12 specifies static/dynamic exposure reuse, dirty region/receiver indexing, status/history work, route certificates/preparation and separate pose/render rates. These are planned, not implemented by the rebase. SW17–19 keep cold whole-revision builds, profile-cache scheduling, crowd/flight fairness, graphical instancing and physical-GPU qualification. Existing EPR owners retain graded auditory contacts, richer exposure transitions and knowledge-scoped geometry. No loss of meaningful evidence, weaker collision, hidden speed reduction, or wider command durability gap is accepted to make a benchmark pass.
