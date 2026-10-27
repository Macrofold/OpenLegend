# Repeatedly listing cloth and fiber

October 15, 2026. **Investigation selected; no new speed result or retained change yet.**

Before short movement intervals, the game lists carried cloth and fiber that might become wet or dry. It then checks their actual moisture and location. A larger inventory can make that preparation expensive even when most things are dry.

## What is known

An earlier profile of the older busy world assigns about0.978sampled CPU seconds out of30.3seconds directly to selecting materials. A separate allocation profile estimates about675MBof temporary allocation within that selection. These are different measurements, overlap parent totals, and do not mean675MBis kept or leaked.

A previous attempt only avoided creating writable views while reading. It preserved the compared results, but fresh CPU barely changed and its older running-server pair was confounded by severe host pressure. That rejection remains recorded. This investigation first asks what removing the **whole category** can save in the now-available fixed older-world replay.

## Selected diagnostic and compromises

Temporarily return no wetting/drying work from the material-capture owner. Keep the actual rain interval and weather deadlines, character movement, needs, plans, food, collisions, history and randomness. Wet material no longer dries and rain no longer wets these materials. Demonstrate that loss in controlled examples. This code is a diagnostic and will not be retained as an optimization.

Run balanced unchanged/removed/removed/unchanged observations of the same6,000game-seconds,53plans,37new meals and34player walks, with all16residents returning to work and40animals alive. Record complete final-world fingerprints and any difference. No database, browser, sampler, counter, forced collection or provider runs inside timing. Earlier full-world replay/normal-reader evidence supplies the same current-format starting data, without a reset or refill.

## Possible next step, not implemented

The existing candidate-list cache requires a frozen whole world. Ordinary simulation updates use a writable world even while inventory membership and definitions may remain unchanged. Reusing only proven-unchanged immutable dependencies could remove repeated searches, while still reading moisture and positions live. Before choosing that, trace every mutation that can alter candidate membership, including definition-pin/role changes, custody, creation, retirement, replacement and mutable authoring.

[Immer's official performance guidance](https://immerjs.github.io/immer/performance/) supports searching original data and avoiding unnecessary draft reads. Its current documentation also describes newer APIs absent from the repository's pinned10.1.1; no library upgrade or new plugin is selected. Local source confirms the existing public`current`function returns the original base when a draft is unmodified. That is source evidence, not a measured saving or sufficient invalidation proof.

**Additional/cumulative provider cost:** $0. **Results:** category removal saves11.81%CPU but loses weather behavior; safe reading saves10.01%CPU in the matched older world and is awaiting actual-service qualification.

## Source and controlled qualification

Both443-file copies pass pinned formatting/executable equivalence, TypeScript and actual new-root six-package/separate-worker checks. Only the material-capture owner differs. Three controlled cases retain dry materials at zero and show the intended drying/rain-wetting loss; the actual values are retained in `/private/tmp/ol-pf134-loss-{baseline,candidate}-20261015-a.json`. All owned processes close normally. Static result: `/private/tmp/ol-pf134-static-result-20261015-a.json`. This qualifies the diagnostic for timing, not retention or game correctness with weather. The selected fixed older-world B/C/C/B follows separately.

## Removing the category: measured result

| Run | Material preparation            |    Total CPU | Measured elapsed | Complete final world matches current game |
| --- | ------------------------------- | -----------: | ---------------: | ----------------------------------------- |
| 0   | Ordinary wetting/drying capture | 31,444.312ms |     26,309.080ms | Yes                                       |
| 1   | Removed                         | 27,356.134ms |     23,190.026ms | Yes                                       |
| 2   | Removed                         | 27,926.062ms |     23,560.871ms | Yes                                       |
| 3   | Ordinary wetting/drying capture | 31,244.324ms |     26,605.476ms | Yes                                       |

Mean total CPU31,344.318→27,641.098ms is **11.81%less** for the same6,000game-seconds,53plans,37new meals,34walks and16physical returns. Every run reaches the same complete final world and keeps17people/40animals alive. This older scenario contains no final difference from removing the category; that does not prove intermediate weather equality or make the removal safe elsewhere. Controlled examples show dry cloth stays zero, wet cloth normally dries0.4→0.38148but remains0.4when removed, and rain normally wets0.4→0.42778but remains0.4when removed.

All four own process groups close normally with full source/config/dependency/input guards. No samplers/counters/forced collection/database/browser/provider runs inside timing. The current final logical fingerprint is`013e221d658b2e5581f5d9a2dc094bc5eff7a2664e7b0e876de197da621ba7ca`in every observation. Raw lifecycle `/private/tmp/ol-pf134-native-timing-lifecycle-20261015-a.json`. No canonical material code is changed. Additional/cumulative provider cost $0.

The category has a worthwhile measured cost. Before adding a cache, separately select a fixed-age retest of the existing PF16.97 safe-reading implementation: that prior attempt was fresh-neutral and its older server pair confounded; it never received this fixed large-world CPU comparison. Reuse its exact qualified owner body and controlled42cases, then counterless B/C/C/B on the same older input/activity. Require full behavior equality before retention; this preserves wetting/drying and changes only preparation reads. Cache eligibility/invalidation changes remain unselected.

## Safe-reading retest: older-world CPU improves

The exact previously qualified PF16.97 owner, with no new cache, passes both new-root TypeScript/namespace/separate-worker checks. All42controlled mutable/shallow-frozen/draft cases match complete intervals, footprints, views, events, world and fork fingerprints. A fresh replay matches all80full unmodified worlds,754events and269outcomes with **no normalization**, including actual weather behavior. The unchanged current-model baseline is reused; its raw evidence remains untouched.

| Run | Read preparation        |    Total CPU | Measured elapsed |
| --- | ----------------------- | -----------: | ---------------: |
| 0   | Ordinary writable views | 31,926.279ms |     28,902.520ms |
| 1   | Latest read-only views  | 28,915.403ms |     24,844.185ms |
| 2   | Latest read-only views  | 28,386.468ms |     24,370.953ms |
| 3   | Ordinary writable views | 31,746.758ms |     27,349.995ms |

Mean total CPU31,836.519→28,650.936ms is **10.01%less** for the same6,000game-seconds/53plans/37meals/34walks/16physical returns. Every complete final world and random state matches; all17people/40animals survive. Mean elapsed28,126.258→24,607.569ms is12.51%lower, with host contention retained. All own groups/source/config/dependency/input guards pass. Recording/counters/samplers/forced collection/database/browser/providers are off inside timing. This measures the older case; it does not overturn the old fresh-neutral result or prove full-game3×.

Evidence: `/private/tmp/ol-pf135-static-result-20261015-a.json`, `/private/tmp/ol-pf135-material-cases-comparison-20261015-a.json`, `/private/tmp/ol-pf135-fresh-proof-comparison-20261015-a.json`, `/private/tmp/ol-pf135-native-timing-lifecycle-20261015-a.json` and raw companions. Additional/cumulative provider cost $0.

Before any actual-service launch edits, separately select B/C/C/B older-server observations through the unchanged qualified aged profiler: same preserved checkpoint/resources/residents, original policy, actual30sHTTP/SSE work and300souter, no GC flag/samplers/counters/clock recorder/provider. New source/input/worker/static/owned cleanup gates stay mandatory. Release and inspect one baseline first. This addresses the earlier confounded service pair before retaining the source change. No canonical material code changes yet.

## Actual older-world service comparison

The four running-game observations finish normally in ordinary/safe/safe/ordinary order. All source, dependency, asset, saved-input and cleanup checks pass, including zero remaining owned databases/sessions and absent temporary directories. Every issued command succeeds. All sixteen residents accept at least two new plans; all checked produced-food bindings match, no plan stops or resident error is reported, and all seventeen people/forty animals survive. These short runs do not include a new sleep/wake cycle.

| Run | Material reads | Actual speed | Whole-process CPU per game second | Command confirmation p95 | Largest delivered-update gap | New plans | Checked meals |
| --- | -------------- | -----------: | --------------------------------: | -----------------------: | ---------------------------: | --------: | ------------: |
| 0   | Ordinary       |      2.1637× |                          6.3891ms |                  532.6ms |                      663.4ms |        36 |            20 |
| 1   | Safe           |      2.2850× |                          5.7870ms |                1,009.7ms |                    1,268.3ms |        37 |            21 |
| 2   | Safe           |      2.1708× |                          5.9196ms |                  932.7ms |                    1,202.1ms |        36 |            20 |
| 3   | Ordinary       |      2.1176× |                          6.3896ms |                1,203.5ms |                    1,803.4ms |        33 |            17 |

Mean progress **2.1406→2.2279×**,4.07%higher; mean CPU per processed game second **6.3893→5.8533ms**,8.39%lower. The candidate processes different work, so this is descriptive rather than the fixed-work causal CPU proof. World-calculation elapsed per game second falls11.87%. Save elapsed totals instead rise11.093→12.727seconds; these are overlapping waits, not additive CPU. Mean per-run p95 confirmation worsens868→971ms and is not a pooled percentile. Accepted command counts30/28/29/28 and skipped offers0/2/1/2 remain recorded. There are no observed command/storage/SQL/maintenance errors through normal close. This is a partial calculation saving with **unresolved command latency and failed3×**, not proof of improved walking or frames. Host variation is retained, and delivered-update gaps are server delivery rather than browser drawing.

Read/installation restoration costs59.313/59.425/64.788/56.819seconds remain outside the measured phase. Exact values and original reports are in `/private/tmp/ol-pf135-aged-comparison-20261015-b.json`. Its initial reader retained the complete restoration object under a scalar field in the a summary; b corrects only that summary field. Original reports and a remain preserved. No game is rerun or measurement discarded. Additional/cumulative provider cost $0.

### Retention selected before canonical edits

Retain the exact one-owner safe-reading implementation because identical older-world work saves10.01%CPU, controlled weather/mutation/fork cases and complete fresh checkpoints match, and both actual candidate observations also use less CPU per processed game second. This accepts no weather/cognition/collision/retention compromise, cache, schema or dependency change. It does **not** claim the input tail is improved or qualified. First require byte identity between the canonical owner and its qualified baseline, apply the exact candidate body, run pinned formatting/full TypeScript and the existing42cases in the real canonical module-resolution context, review the complete diff and reconcile the current performance contract. Full-game sustained graphical qualification and the separately registered backend-state diagnostic remain open. About60–90owner logic lines; no other runtime owner is selected.

Canonical integration is complete: its material owner is byte-identical to the qualified candidate (SHA`0c6b550acd3af185e24a5a89146ac643b051a169ff8ff400796a812dd56f0ade`). Full TypeScript passes, and the unchanged actual-owner helper passes all six namespace identities and42complete controlled results in the real server workspace context, exactly matching the baseline. Both processes close normally; no database/provider is involved. The standard production build passes with existing PlayCanvas externalization/large-chunk notices. The complete owner diff is reviewed: it changes immediate reads, leaves actual writes/index paths and captured rain/family references intact, and adds no retained cache or stored model. Current contract is recorded in [performance guidance](../../performance/preparation.md#design-recurring-work-before-implementation). `/private/tmp/ol-pf135-canonical-checks-20261015-a.json` and `/private/tmp/ol-pf135-canonical-comparison-20261015-a.json` retain check/source/result details. Sustained graphical3×and prompt walking remain unmet.
