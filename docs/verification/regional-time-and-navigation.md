# Regional time and navigation performance

Evidence for the [regional time and navigation plan](../projects/regional-time-and-navigation.md): PF13.11, PF13.12, PF13.16, PF12.5, PF12.6, SW06.2a and SW17.7. Task state stays in the [PF13](../maintainers/simulation-time.md#pf13--elapsed-time-simulation), [PF12](../maintainers/performance.md#pf12--eight-times-spatial-and-sensory-execution) and [SW](../maintainers/spatial-world.md) trackers.

## Environment and method

- Baseline: a pinned copy of `origin/main` at `be68b1e0d75baac3c2c9f38948824aa4a98ed0d9` with the same lockfile. Change: branch `codex/time-nav-performance`; the timing table and longer runs below were measured on `c7f14c46`. The third review's fixes (below) change only degenerate routes, an early daily-window edge and a navigation retry; afterwards the outcome digests, equivalence scenarios and tests were re-checked on the final code.
- macOS (Darwin 24.6.0), Node v22.23.2, no provider (`AI_BUDGET_USD=0`). The host was shared with several other agents (load averages 126–290 during the final runs and up to about 770 earlier). Timings are **shared-host observations**. Baseline and change always ran back to back on identical input, and none of the timings is an acceptance claim.
- Disposable harnesses outside the repository drive the real `advanceWorldSlices` generator the way the server does: one accepted interval per call, a coherent-stop request after eight wall milliseconds, and at most 30 game seconds offered per call. Each repetition builds a fresh world, warms it to game time 60 and then measures a fixed game-time span. Outcome digests cover the following, rounded to 10⁻⁶: final positions, supports, flight/wander/flee timers, needs, attributes, status activity and saved RNG (mechanical); the emitted event sequence (events); event audiences (audience); and awareness counts.
- Fixtures: the **staggered flight** fixture is the 854-entity scene of the [plan's stage 1](../projects/regional-time-and-navigation.md#stage-1--reproduction-and-attribution): the 806-entity seed-73 mixed scene plus 48 birds with perch waits `180 + i × 0.19` s. **100 sleepers** is 100 crowded exhausted deer that fall asleep through the authored automatic activation, plus the starter world.

## Final matched comparison

Three repetitions of 300 measured game seconds each. Every run in both trees advanced the full 300 game seconds.

| Measure                      | Flight baseline | Flight change | Sleepers baseline | Sleepers change |
| ---------------------------- | --------------- | ------------- | ----------------- | --------------- |
| Wall time                    | 17.2–20.6 s     | 8.1–11.7 s    | 0.64–1.00 s       | 0.37–0.50 s     |
| CPU time                     | 14.8–15.4 s     | 6.9–7.9 s     | 0.56–0.72 s       | 0.37–0.52 s     |
| Calls / motion slices        | 204 / 204       | 73 / 73       | 27 / 27           | 18 / 26         |
| Native 3× headroom           | 0.081–0.097     | 0.143–0.206   | 1.67–2.62         | 3.35–4.51       |
| Native 8× headroom           | 0.030–0.036     | 0.054–0.077   | 0.63–0.98         | 1.26–1.69       |
| Largest single call          | 309–715 ms      | 320–1462 ms   | 44–124 ms         | 33–55 ms        |
| Longest uninterrupted resume | 117–275 ms      | 262–1209 ms   | 27–52 ms          | 11–34 ms        |

All four outcome digests are identical between the trees and across repetitions:

- **Flight:** mechanical `5559ed73584940f5`, events `9744db73f55a5463`, audience `5cf3af2236ce6091`, 9,722 awareness records.
- **Sleepers:** mechanical `22f2299c47a69e22`, events `ddc56ae129aaff3a`, audience `ec742dd4b5ba091b`, 405 awareness records.

Flight slices fell from 204 to 73 because mid-air corridor turns are now private to the flyer, and a slice that only moves bodies leaves other entities' captured rates pending. The sleeper case used fewer calls because deferred rates made slices cheap enough that one call could cover several. The change's individual calls are longer, because each covers more game time. One change run had a 1.46 s call during a host load spike (load average 229); yielding is still not a latency guarantee. Dense 8× flight is still far from met: perception sampling and publication remain whole-world work per slice (see [remaining work](#remaining-limits-and-gaps)).

Earlier matched runs of the same fixtures on `b25382e0`, before the second review, measured flight at 7.0–7.7 s CPU against main's 15.0–16.3 s, and sleepers at 3.46–4.41 of 3× against main's 1.93–3.31, with the same digests.

## Longer flight runs and random wander ties

- **900 game seconds:** main fails at game time 569.42 s with `work-contract: Native work exceeded its admitted effects envelope`. Its last calls each advanced the same 17-microsecond gap: a landing was refused, and the retry was scheduled at the remaining gap again. The change completes 900 s in 176 slices (23.4 s CPU on the shared host), with 49 events and the same event, audience and awareness digests as the 300 s run. Two alternative landing-retry rules were measured and rejected. A one-second retry needed 492 slices. Retrying at the one-metre cadence whenever arrival fell within it needed 151 slices, but it delayed free landings (see [review fixes](#review-driven-fixes)).
- **500 game seconds** (ends before main's failure): events, audience and awareness matched, but 16 of 854 entities differed. All of them were wandering deer that had exchanged random draws. Wander timers are whole seconds, so several animals often become due at the same instant. Main ordered such ties by the floating-point residue left by summing slice lengths. On main alone, 30 s calls and 10 s calls gave different results for 14 deer. After the tie fix (deadlines within 10⁻⁶ s are due together and ordered by entity ID) was also applied temporarily to a copy of main, all four runs were identical: main and change, each with 30 s and 10 s calls, mechanical `5a6b89d7bc350773`. Slices were 328/339 on main and 99/107 on the change. CPU time was about 24.5 s on main and 11.7–11.9 s on the change. The final code reproduces `5a6b89d7bc350773` with both call sizes.

## Outcome equivalence scenarios

Eleven scenarios, each run with three call patterns: 30 s server-style calls, fixed 1 s calls, and one whole call. They were compared with main at a tolerance of 10⁻⁹.

- **Identical to main:** gathering work, fire fuel depletion, manual wake, a starving player (the scenario never reached zero energy, so exhaustion damage was not exercised), a mixed 60-person/100-animal/500-object scene, the reservoir demo without its bird, and the touch demo (1 s and whole calls).
- **Intended differences:**
  - **Fleeing (every driver):** a fleeing deer's higher energy cost now stops exactly when the flee ends. Main kept charging it until the next shared boundary, so the branch's deer ends with slightly more energy.
  - **A player punches a sleeping deer:** approach, 30 s of work, the hit and the deer waking are at the same times as on main for each driver: 129.333 s with 30 s or whole calls, and 126.909 s with 1 s calls, because a strike's approach is sampled on both trees. The deer's final energy differs only through the same flee-end correction; it flees until 239.33 s.
  - **Idle hour:** a bird takes off exactly 180 s after landing and the campfire burns exactly to 169,200 s of fuel, where main was off by about 10⁻⁶. In the 1 s driver, "very hungry" fires 10⁻⁶ s later than on main; this is floating-point residue of deferred summation, within the numerical guard. Two hares that were due together now draw in ID order.
  - **Drivers now agree:** on main, the punched-deer scenario's whole-call driver disagreed with its own other drivers about one hare whose wander deadline coincided with the end of the run. With the tie fix all three drivers agree about that hare.
- **Not comparable:** the reservoir demo with its bird. Ada restarts and stops her replenishment at the start of every call in both trees. The server-style driver ends calls after eight wall milliseconds, so those event times depend on wall-clock speed, not on the simulation.

## Exact fleeting sight and contact crossings

- **Primitive:** `sightChangeFractions` solves when the existing `clearSegment` line-of-sight predicate can change as both endpoints move linearly. A brute-force check on the real starter geometry covered 8,000 random segment families and 1.35 million dense samples, with zero crossings outside the reported roots. The per-ray `clearOf` agreed with `clearSegment` on every sample.
- **Brief sighting through a gap:** a stationary NPC watches a person walk behind a wall with a narrow slit. Dense 0.02 s stepping on main shows the person visible from 32.13 s to 33.87 s. With normal 30 s offers, main records nothing. The change ends a slice inside the window and records "Ada saw a person" at 33.0 s.
- **Brief contact:** a person brushes past the touch-only resident. Dense stepping shows contact from 29.07 s to 33.67 s. Main records nothing. The change records the onset at 31.36 s, inside the contact, and the end at 36.36 s. The scheduler guarantees that a whole visibility or contact interval, or a whole gap, is not skipped. Onset and end are still sampled within the existing one-metre sensing bound; they are not dated exactly.
- **A walker passing a hovering bird:** a bird arrives at an authored hover point at 1.0 s; a walking player is within sight of it from 1.51 s to 7.59 s. Before the second review's fix, the stale path that brought the bird to the hover was reused, and no slice sampled it. Now a slice ends at 4.545 s and the player sees the bird.
- Flyers on their private path, walkers carrying out a `move` command and fleeing animals are predicted. Each way a sweep, landing or flee direction can fail is included as its own possible outcome. Falls and every other approach (to a target, resource or item) keep the sampled bound.

## Boundary matrix (PF13.16)

Boundary forecasts on stuck states that were built by hand, with the same input on both trees:

| Case                                                | Main                                   | Change                           |
| --------------------------------------------------- | -------------------------------------- | -------------------------------- |
| Overdue plan wait while actions are restricted      | repeats 10⁻⁶ s slices                  | 60 s horizon (no false deadline) |
| Nearly finished work while locomotion is restricted | repeats 10⁻⁶ s slices                  | 60 s horizon                     |
| Overdue condition review on a body without memory   | repeats 10⁻⁶ s slices                  | 60 s horizon                     |
| Conversation expiring 5×10⁻⁷ s from now             | missed; 60 s slice                     | lands exactly at the expiry      |
| Clock a floating-point residue short of 22:00 local | missed rest window; 60 s slice         | reaches the window edge          |
| Plan wait of 2.3 s whose sum rounds short of 2.3    | ends at +2.300001 s                    | ends at exactly +2.3 s           |
| Strict-side departure of a value near 10⁹ at 10⁻³/s | 10⁻⁶ s step leaves the value unchanged | 4.4×10⁻⁴ s step changes it       |

The daily-window row first failed its own claim: on day 0, a clock value two rounding steps short of 22:00 made the forecast see the edge as passed, so rest started 60 s late. The matcher and the forecast now share one local-hour formula, and approaches from 50395–50399.57 s with 30, 10 and 1 s calls all fall asleep exactly at 22:00. The plan-wait row: the kernel first landed on the rounded sum, which the wait's elapsed-time check rejected, so the wait ended up to 60 s late; it now lands on the first clock value that check accepts. Driven scenarios: automatic rest opens exactly at 22:00 (both trees). After a manual wake at 23:00, automatic rest returns exactly when the 300 s reactivation delay ends (14 calls on the change, 16 on main). The review fixes below add arrival-started work and refused landings.

## Net-flow saturation (PF13.12)

| Scenario (120 game seconds unless stated)                      | Main                                                     | Change                          |
| -------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------- |
| Feeding status (+0.01/s) against native fullness drain at 99.9 | fails at 14.75 s after 1,038 calls (work-contract error) | 120 s in 6 calls, pinned at 100 |
| Charging status (+0.005/s) against energy expenditure at 99.99 | 121 calls, energy 100                                    | 5 calls, energy 100             |
| Same charging from 90 for 1,000 s (closed form 94.5)           | 1,000 calls, 94.5                                        | 36 calls, 94.5                  |

Fixed-step comparison: charging from 99.99 advanced in 1 s, 0.1 s and 0.01 s steps gives identical energies on both trees at 1, 2, 3, 5 and 20 s (99.9945, 99.999, then pinned at 100). Net flow is defined as the continuous limit of serial clamps. It covers opposing status rates and status rates coupled with native fullness or reservoir drains. Replenishment transfers against a drain, and health regeneration against damage, keep the one-second fallback. Nonlinear laws and mutually activating cascades remain open.

## Review-driven fixes

The first adversarial review covered rate deferral, local re-prediction, flight and crossings up to `470c2775`. It produced 11 findings, each confirmed by two independent verifiers. Nine were fixed in `0f3cdf08`. The held-landing finding was narrowed there and completed in `b25382e0`, which also fixed arrival-started work:

- **Work that starts on arrival:** a knife strike on a resting NPC, advanced in frozen 0.5 s calls. Before the fix, the hit landed inside a deferred slice: the NPC lost that slice's rest energy, and it was published without its awake status. After the fix, the rest-energy gain and status sequence are identical to main.
- **Held landing:** a player stands on a bird's landing spot until 6 s and then walks off. The branch lands at the same times as main for 30, 5, 1, 0.7, 0.5 and 0.3 s calls (14.0, 14.0, 11.0, 10.2, 10.5 and 10.2 s). The previous rule gave 14.33 s and 11.0 s for the first two. On both trees, a refused landing waits where the slice began, so the retry time depends on call size.

Running `spatial-http.test.ts` found a regression that the review had not: a `move` ended wherever a slice stopped within the 2 cm arrival tolerance, 4.4 mm short of the deck destination. Main has the same flaw with small calls: it stops 0.4 mm short with 1 s calls and 1.5 cm short with 0.3 s calls. Since `482eac0f`, a move ends at its route's last point, and the player reaches (24, 3, 6) at 181.036 s with every call size.

A second review covered the remaining commits and the documentation from six angles. It produced 18 findings, all confirmed; two were duplicates. They were fixed in `9fc354d9` and `c7f14c46` and in the documentation:

- **Pending rates before endpoint work:** a player's punch kills a weakened NPC while fleeing deer create body-only slices. The NPC's native hunger for the 18 s before the hit was dropped (fullness 34.999999997). It now matches main (34.945454542). A slice whose work ends is never deferred; sleep and other status-effect work are open-ended, so they do not count as ending.
- **Call ends:** publishing right after a flyer landed dropped its pending local re-prediction, moving later interval ends. It now travels with the continuation. A perch-sharing probe gives the same landings (755.74 s, 1,323.14 s) whether calls end at every boundary, every second or seventh boundary, or not at all. Main lands that probe at 757.40 s: its held-landing retries fall at different shared boundaries.
- **Flight:** a route whose lap has zero length forced 10⁻⁶ s slices (4,096 per call); it now advances 10 s in one or two slices. A free landing within 10⁻⁶ s of arrival now lands then, instead of one 8.3 s cadence later.
- **Navigation metrics:** worker timing was re-recorded on each publication retry, and failures recorded zero query times. The queue-age gauge read 0 during a cold wait. Timing is now recorded once per genuine reply, and the gauge refreshes every 250 ms while requests wait.
- **Documentation:** exact tracks cover only `move` walkers; rate deferral is world-wide; the strict-departure guard scales with the value; wander ties round to the microsecond; perception loss/return dating is not yet exercised. PF12.6 now reports queue age.

A third review covered those fixes and the updated documentation. It confirmed 5 of 7 candidates, and all 5 were fixed:

- **Degenerate landing routes:** removing the 10⁻⁶ s term from the held-landing rule let a route listing the same perch twice stop the clock (every call failed with a work-contract error). Routes with a hover point 10⁻⁸ m or 2×10⁻⁷ m above the perch stalled too, as did one with a 0.1 mm lap, which also stalls on main. Landings on a route whose whole lap takes under one game second now wait for the sensing cadence. All five variants (0, 10⁻⁸, 2×10⁻⁷ and 10⁻⁴ m, and 2 cm) advance 30 s per call in 4–5 slices.
- **Early daily-window edges:** the forecast still rounded a residue away when the edge falls before 16:00 local on the first day (a rest window moved to 12:00 started 60 s late). It now computes the gap without first adding 24 hours; all tested approaches fall asleep on time. The bundled 22:00–06:00 window was not affected.
- **Navigation retry after a world replacement:** a publication retry overwrote the next request's 20 s watchdog, which later killed a healthy worker and failed an unrelated route. A retry is now armed only while its reply still owns the coordinator; the probe's new route is published.
- **Overclaims:** "outcomes no longer depend on where calls end" is now limited to deferred rates and pending re-predictions (see [remaining limits](#remaining-limits-and-gaps)), and PF13.11 and the changelog name `move` walkers.

## Navigation attribution (SW06.2a, PF12.6, SW17.7)

New spans split worker startup, map preparation, map builds, first-use profile builds, route query, dispatch, round trip, publication and end-to-end request latency. The oldest queued request's age is reported as a gauge.

- **Planner builds, in process, per body profile:** starter map 36–48 ms; 24 stacked floors 0.56–0.97 s; 29 stacked floors 0.9–1.2 s; a 120×120 map 0.87–1.35 s.
- **Real worker:** startup about 0.77 s. Starter map build 66 ms, then 34–41 ms for each profile's first use. With 24 stacked floors: map build 577 ms, first use 517–725 ms per profile. Warm round trip p50 1.7 ms.
- **Coordinator, 42 simultaneous requests in one world** (final code): every request waited behind one cold worker. Queue wait was p50 806 ms and p95 878 ms, and end-to-end latency p50 823 ms and p95 879 ms. That tail is worker startup (526 ms), map preparation (13 ms) and the map build (128 ms); after that, queries took p50 2.2 ms and the round trip p50 2.3 ms. **Three worlds** (126 requests): queue wait p50 1.20 s and p95 1.45 s, startup about 546 ms per world, map builds 180–340 ms, queries p50 4.4 ms and p95 40 ms. An earlier run under heavier load measured one-world latency at p50 2.0 s; worker startup (1.24 s) and first-use builds (0.34 s) made up most of that queue wait.
- **Route reuse and static segment certificates (PF12.6):** a walking workload performed 665 segment sweeps costing 120 ms in total (about 1% of the run), with only 15 exact repeats. Warm queries take a few milliseconds, and the measured queue wait is the cold startup and build. Neither form of reuse addresses that tail, so neither was implemented.
- **Relevant-tile invalidation and affected-tile updates (SW17.7):** production has no caller that edits geometry (`replaceSpatialLayout` is used only in tests). Tile updates would not change these measurements, so they were not implemented.
- **Defect fixed:** a paused world whose route request was already stale kept re-queuing it. On main this caused 5,748 dispatches in 12 s; now it causes none. The coordinator now admits only requests that still hold the simulation clock.

## Automated checks and gaps

- `pnpm typecheck`, `pnpm guidance:check`, `pnpm config:check` and `pnpm build` passed. Pinned Prettier passes on every changed file. `pnpm format:check` reports 8 files that this branch does not touch (pixel-art project docs and action-experience JSON artifacts); they are identical to `be68b1e0`, and the Prettier configuration is unchanged.
- Focused domain tests: 62 of 64 pass. The same two tests fail on unchanged main: `perception.test.ts` (distant objects across prototype obstacles) and `spatial-world.test.ts` (floor and airborne reach through slabs).
- `spatial-http.test.ts` against a disposable local PostgreSQL database: the surface-intention/route case passes (after the move-arrival fix). The save-restore case fails on both trees because it expects the older save format `development-2026-09-22-spatial1`. An earlier run under heavier load timed out and was cancelled (57014). A leftover fixture database from that run may exist, but other agents use the same name prefix, so none was identified or deleted. No PostgreSQL-backed full-server profile was run.

### Remaining limits and gaps

- Perception sampling and publication are still whole-world work on every slice. Earlier attribution put perception at 46% and publication at 18% of flight slice cost. Their per-slice floor belongs to the perception owner; the sensory-crossing scheduler mirrors perception's sight sample heights at a documented seam in `motion-boundaries.ts`.
- Falls and non-`move` approaches keep the sampled sensing bound. Crossing onset and end are sampled, not dated exactly.
- Effects ordered within one endpoint still depend on slice length, as on main: a lethal hit resolved before the victim's own rates for that slice drops that slice's hunger (a punched NPC ends at fullness 34.9999 with 30 s calls and 34.913 with 1 s calls on both trees). Sampled approaches also land at call-size-dependent times (a strike hits at 129.333 s with 30 s calls and 126.909 s with 1 s calls on both trees).
- A refused landing waits where its slice began. Retry times depend on call size on main and on where shared intervals end on both trees, so a held bird can land at a different time than on main (SW12 owns landing holding and fairness).
- PF13.16 still lacks driven scenarios for contribution, reservation and appraisal expiry, enrolled appraisal-process deadlines, and start-boundary perception loss/return.
- Cold navigation tail: worker startup and the first builds dominate queue wait. Starting the worker earlier or preparing all active profiles with the map are candidate SW06.2a steps. Neither was implemented or measured here.
