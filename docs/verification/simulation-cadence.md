# Elapsed simulation implementation evidence

[Simulation time](../simulation-time.md) owns the accepted contract. This record separates implemented intervals from verified behavior and remaining acceptance. It supersedes neither the sound branch's evidence nor earlier measurements on different revisions/hosts.

## Recovered scope

Earlier completion resumed at `7824cf8c6a4e1c6b1777baa1ee2f338735c5d253`. This continuation recovered source at `a0a7745d232820c421576885f3d88e352bdb547a`, with export-only checkpoint `f955e7baaec75c9e1062246b4d97385cc523fa08`. These contain `fdcbd31fc9e4eb31daaf00d997648aba588c8577` and its agent rules. The elapsed-time implementation, base-world time policy, boundary catalogue and speech coordination survived the interrupted turns. A documentation-first recovery gate was committed in `b317245`; the status-boundary correction is `3136c27`, with phase-local binding reuse in `1b2daed`.

The later main integration is recorded below. No existing world, main or unrelated branch was reset. All branch/commit operations used the GitHub connector, without shell Git commands. Source-only exports and a temporary exact-hash text-blob helper prepared content; the merge tree, two-parent commit and fast-forward branch publication were explicit connector operations. No automated unit, integration or browser suite was authored or run by this task. Ordinary repository CI remained enabled and is not claimed green.

## Initial static and native observations

The earlier recovered source passed production TypeScript and authored status-configuration validation. These are not a passing full-repository check.

An ad-hoc script invoked the actual initialized Rapier/domain implementation on Node 22.16.0. The same seed-1086 initial world was cloned separately for each run. Each advanced 480 actual game seconds, offering either one or up to sixty game seconds per call with `maxIntervals: 1`. The latter does not force a sixty-second interval: flight, deadlines, thresholds and fidelity bounds shorten it. These are one diagnostic run per setting, in fixed order, not matched warmed statistical comparisons or whole-game speedups.

| Scene | Offered game seconds/call | Actual game seconds | Integration calls | Wall time | Event additions |
| --- | ---: | ---: | ---: | ---: | ---: |
| Starter, 14 entities | 1 | 480 | 481 | 560.10 ms | 24 |
| Starter, 14 entities | 60 | 480 | 22 | 29.08 ms | 24 |
| Mixed, 318 entities | 1 | 480 | 481 | 5725.46 ms | 4594 |
| Mixed, 318 entities | 60 | 480 | 22 | 609.15 ms | 4594 |

The mixed input added 16 memory-capable people, 48 native deer and 240 resources via the existing isolated scenario generator. Added entities were not model-controlled actors. No navigation preparation blocked these runs. A strict-threshold departure accounts for a very short extra interval; game time was not rounded into ticks. Equal event counts alone do not prove identical intermediate observations or RNG state. Setup, networking, SQL, renderer, cognition and browser frame rate are excluded.

## Predicate-boundary correction

The new condition forecast follows the existing finite condition evaluator. For a false AND, every currently false child must be able to change before the whole predicate can become true; a stable blocking child therefore suppresses unrelated numeric deadlines. OR uses the dual rule. Predictions are rebuilt at each accepted interval and after mutations, not retained as indefinite truth. Manual-only inactive effects have no automatic activation deadline. Saturated outward rates and exact-threshold movement that cannot change the comparison no longer create irrelevant deadlines.

A substantive correctness defect was reproduced with an admitted finite status-policy variant: an inactive prior rest episode retained another entity as `$source`, but a new automatic activation correctly binds the subject to itself. The previous predictor evaluated the retired source. With subject energy 67.01, expenditure 0.0005/second, a below-67 automatic threshold and a full-energy retired source, a 40-second offer activated rest at game second 40 instead of near second 20. The corrected predictor uses the same fresh bindings as activation: it ended at 20.00000000002, crossed the strict side at 20.00000100002, activated rest there, and applied recovery only after that boundary. This is an ad-hoc actual-domain observation, not an automated test or a new bundled-world rule. Reusing bindings through the recursive forecast produced the same observed transition.

For the unchanged mixed world, both pre-fix and corrected runs advanced 600 seconds in 30 intervals with 4666 event additions and identical complete-world SHA-256 `0b6f9d7f55d6c796d00f3bf77ea64d245c02374b7b5f7ef901062e5540e122b6`. Elapsed native times were 861.23/929.35 ms respectively. This small single-run comparison does not establish a performance improvement from the correction. A longer recovered pre-fix run advanced all 4800 seconds in 282 intervals and 5559.77 ms; no generic stall after the early prefix was reproduced.

## Actual 8x running application

The corrected source passed production TypeScript (`tsc --noEmit -p tsconfig.build.json`), the status configuration check, and the Vite production build. The pre-existing large client-bundle warning remains. The guidance checker could not complete against the source-only archive because it requires repository Git metadata; its failure is not recorded as a passing check. Applicable root/package guidance and design/review/performance/documentation rules were read. Full repository checks and automated tests were not run.

The real production server ran on loopback port 3262 with Node 22.16.0, actual Recast/Rapier, SQLite, normal timers and a minimal explicit environment. Disposable storage was `/mnt/data/cadence-observations/server-mixed-data`; existing user saves and provider credentials were not used. The 318-entity scenario was installed through the normal service transition boundary. Authenticated profile/presence/control/state requests set `pauseWhenHidden: false`, selected speed 8, maintained presence and read state about once per real second. After approximately one second of warmup, fifteen samples covered the following window:

| Measurement | Observation |
| --- | ---: |
| Monotonic sample interval | 15.678661 real seconds |
| Game time at first/last sampled state | 467.331792 / 7988.613642 seconds |
| Actual sampled game-time progress | 7521.281851 seconds |
| Realized game seconds per real second | 479.7146, against a requested 480 |
| Native intervals between separate metrics reads | 620 |
| Game time covered by those metrics reads | 7516.001542 seconds |
| Final pre-pause pending game-time debt | 16.235589 seconds |
| Pause request round trip | 25.237 ms |

Metrics and state reads occur at slightly different times; their interval totals must not be presented as identical windows. The final debt is measured before pause and is about 34 ms at the requested rate, not a post-pause reset-to-zero claim. No sampled state reported a navigation wait or storage error. The bounded collector's last-window native interval duration had p50/p95 18.78/23.94 ms; its maximum, including setup/first exposure, was 344.03 ms. There were three skipped-while-busy timer callbacks. This short run approximately sustained requested game-time progression, but it does not satisfy a strict 8 ms maximum atomic-blocking budget or establish long-session/tail capacity. It executed tens of variable-duration intervals per real second, not 480 mandatory whole-world ticks.

Afterward the same server accepted ordinary movement to the lookout via its ramp, reached exactly `{x:24,y:3,z:6}`, rejected the elevated destination tagged with `terrain`, and accepted pause. Clean shutdown/restart retained the deck position and game time and reopened paused. Initial disposable requests omitted the command envelope or reused stale presence sequence numbers; they were rejected normally, then the driver was corrected. No runtime validation was loosened to make the observation pass. Server and worker processes were stopped after observation. No browser/GPU or speech-loaded application was exercised. Total paid API spending was $0.

## Failed staggered-flight scaling probe

A separate native-only probe started from the same mixed world and added 48 copies of the supported bird family with staggered perch waits (0.19 game seconds apart), for 366 entities. It used initialized native/collision code, the same 60-second offer and one accepted interval per call, with an explicit 20-second wall-time observation budget. It advanced only 435.037749 game seconds in 742 intervals before that budget ended; wall time was 20016.75 ms, or 21.73 game seconds per real second. This fails the dense-flyer 8x goal. It is not comparable to the server run's input population or an automated timeout failure.

The current earliest-deadline reduction lets independent flight waits/waypoints shorten every entity's integration interval. Removing mandatory one-second stepping therefore does not solve heterogeneous deadline density. PF13.11/RP03 now have a concrete trigger for region-local/subsystem-local scheduling and dependency-valid sensing work. The flight events were not coalesced into later timestamps, observers were not dropped, and the fidelity bound was not enlarged to hide the cost. Shared corridors/overlapping bodies in this diagnostic do not qualify crowd/landing fairness. General contact-crossing certificates and regional time advancement remain unimplemented.

## Current main integration

Main `03105fed9209c126e4e69e9faeb4687f42d1e74a` was integrated in two-parent commit `a6c176fd7995d0f2f114bb079936210d1d2b363c`, preserving branch parent `6939cd795ec58c34039b185afcc1e1eca0b1e29e`. The connector comparison confirms main is an ancestor, with zero commits behind. This is a history-preserving merge, not a force rebase or a merge into main. It supersedes the unfinished staging integration PR #10.

The twelve overlapping three-way blocks were reviewed, not resolved by choosing one side globally. The union retains cadence's phase-separated kernel, static-object exposure and pending-navigation fencing; main's physical-contact detector and conservative body-sized candidate discovery; removal of retired content/save-count ceilings; nonblocking memory maintenance; and in-place state evolution. Save format and unrelated identities were preserved. Architecture, TODOs and the data/privacy design additions retain their canonical owners. A stale save-policy sentence in D60 was corrected to match current AGENTS guidance; no new production retention or rewind policy was selected.

The combined source passed production TypeScript, status-configuration validation and Vite build again. A second real server used fresh `/mnt/data/cadence-observations/combined-main-data` SQLite storage and the same 318-entity setup and observation procedure. It advanced from 482.700796 to 8000.000001 game seconds across a 15.520239-second state-sampling window: 7517.299205 game seconds, or 484.3546 per wall second. The slight excess over 480 reflects discrete state sampling/read windows, not a clock-policy change; the host counters recorded 8009.090910 advanced versus 8009.181984 requested seconds at the final metrics read.

Separate metrics reads counted 613 accepted intervals covering 7509.723447 game seconds, again about forty intervals per real second, not 480. The final pre-pause pending debt was 0.091074 game seconds; 14 timer callbacks skipped while busy. Retained native duration p50/p95 was 18.561/24.183 ms; maximum including setup was 324.844 ms. Pause round trip was 30.020 ms. This reaffirms the short approximate 8x rate for this scene while still failing a strict small atomic-slice budget; the long-session/dense-flyer gates remain open.

The combined server accepted ordinary movement from the clearing to the deck, reached `{x:24,y:3,z:6}` in about 3152 ms wall time at 1x, rejected the same destination with terrain support, then accepted pause. Restart retained `{x:24,y:3,z:6}` and game time 8198.486178, reopened paused and reported saved state. A separate actual-domain contact observation rejected 0.8 m horizontal separation, accepted the 0.48 m combined-radius edge and occupied ground overlap, accepted the object's 0.7 m top, and rejected a 0.01 m air gap above it. That checks the retained cylindrical contact envelope, not a general curved-body collision theorem. An initial diagnostic used presentation-kind names instead of native entity kinds; it was corrected without changing runtime validation. All server/worker processes were stopped, no prior save was modified, and no paid calls or automated suites were run.

## Sound branch and remaining integration

The original sound inspection was `8afa972c9001b6fb2ccb8e6f0da0a2905a029f40`. This continuation reviewed the later `87d4622d862b94f532b4d10c8dddae74e0421de1` tracker and status implementation, plus the changed-file comparison. It contains main through `03105fed` and substantial receiver/exposure, status, cache-overflow and independently scheduled speech-load work. Its own current evidence still reports a failed whole-runtime 8x gate on the latest host; do not reuse a historical passing run as current capacity evidence.

No sound-branch code was merged or changed. [The handoff](../maintainers/speech-time-integration.md) identifies the required union of elapsed phases and sound-owned evidence/caches. One-second physical slices in that branch are an older implementation assumption, not a cadence requirement to restore. Its stable listener fragments, current physical contact semantics, revocation-safe publication and real-time caption clocks must survive integration.

Remaining gates include combined speech/cadence execution, exact fleeting-exposure detection, arbitrary coupled-flow semantics, region-local deadlines, sustained mixed 1x/3x/8x PostgreSQL and client load, and real-GPU interpolation/lighting performance. They remain in the focused maintainers rather than being checked off from these finite observations.
