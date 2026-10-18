# How often an idle territorial animal checks for intruders

October15,2026. **The60-game-second option saves19.392%of isolated simulation CPU**, with the same required human work and original bird flight. It is a private trial; full-game performance and behavior qualification remain open. [Plain-language bottlenecks](bottlenecks.md), [plan](../../projects/three-times-scene-performance.md#idle-review-frequency-isolation).

## Reader-facing comparison

At3×, the original15-game-second review checks roughly every0.083real seconds.60game seconds checks every0.333real seconds, adding at most about a quarter-second to initial detection. Once an intruder is detected, pursuit/attacks retain the original15g timing. A brief visit can be missed; normal1× has a larger absolute delay (up to1secondbetween checks). These are explicit timing compromises, not a claim of unchanged perception.

| Idle interval   | Mean total CPU for the same40game minutes | Reduction from15g | Native publications | Maximum gap between idle checks at3× |
| --------------- | ----------------------------------------: | ----------------: | ------------------: | -----------------------------------: |
| 15game seconds  |                               7,736.620ms |            0.000% |                 223 |                    0.083real seconds |
| 60game seconds  |                               6,236.346ms |           19.392% |                 150 |                    0.333real seconds |
| 240game seconds |                               6,612.403ms |           14.531% |                 167 |                    1.333real seconds |
| 600game seconds |                               6,579.388ms |           14.958% |                 169 |                    3.333real seconds |

60g is the best measured choice in this fixed script and has the smallest new detection delay. Longer waits240/600do not improve CPU further and produce167/169publications instead of150. Do not extrapolate a smooth monotonic relationship or assume less frequent checking always saves more. Different slicing/command timing can change these effects; arbitrary high-activity input still needs actual-server/browser qualification.

## Controlled scope and complete observations

PF16.129 reuses the qualified PF16.106 shared-policy441-file runtime, aggregate`6f34fffa077d5bce07e454a4aad3279272c3c4af0f930fa2b3b06bb62e5bce07`. Its current normally constructed fresh15g opening is unchanged. Three new current-format diagnostic presets change only the existing required idleReviewSeconds field to60/240/600; exact recursive input comparison restores that one value and matches every other field. No incompatible save conversion, new policy reader or runtime product rewrite occurs. All values pass existing current-model validation in the actual driver.

The helper differs only in declared expected policy and diagnostic wording; active review15g, refresh15g, bird speed0.12/climb0.06,1m fidelity, native maxIntervals1, needs and tenfold work remain fixed. Pinned formatting/Node syntax pass. Original six dependency targets and the existing dangling language link remain exact; no absent dependency is invented.441source/input/metadata/runtime-sidecar/dependency before/after guards pass every time.

| Run | Idle game seconds | Total CPU ms | Native CPU ms |   Wall ms | Publications |
| --- | ----------------: | -----------: | ------------: | --------: | -----------: |
| 0   |                15 |    7,643.375 |     7,385.187 | 5,164.016 |          223 |
| 1   |                60 |    6,126.766 |     5,899.098 | 4,110.925 |          150 |
| 2   |               240 |    6,687.232 |     6,422.086 | 4,711.130 |          167 |
| 3   |               600 |    6,537.330 |     6,271.223 | 4,299.537 |          169 |
| 4   |               600 |    6,621.446 |     6,365.336 | 4,680.131 |          169 |
| 5   |               240 |    6,537.574 |     6,277.504 | 4,277.755 |          167 |
| 6   |                60 |    6,345.926 |     6,106.088 | 4,824.164 |          150 |
| 7   |                15 |    7,829.865 |     7,568.012 | 5,666.015 |          223 |

All eight runs complete2,400actual game seconds/80common admission anchors/fourteen player walks/32finite plans, with all16actual own-food and physical-return gates and40animals alive. All eight groups close normally within60sactivity/90souter bounds, with no forced cleanup, provider, database, inspector, counter collection or trace compression. Each preset repeats exactly in complete final-world signature, actions, RNG, bindings and returns;15g also matches its earlier complete native proof. All policies end with RNG1199634359 and required human counts.15/60record507encounters;240/600record508. Cross-policy worlds deliberately differ and exact equivalence is not claimed.

Repeated world hashes:15g`c248f121c729aca12b457ff3e103889689258ed623f8f948ff47f393fd77d469`;60g`ac35da3661f372a6afc71b2f2092c559fbe55fcd2beeed22cbd9967f75316296`;240g`5a79947fabd9f160e97fbd1b8c2de9ccb23423a5e9893465fe779e061185eedb`;600g`6071ec48fd22af4414a12f96f1e02a28d62a621875b8a227af05b9ad31243deb`.

Raw `/private/tmp/ol-pf129-idle-sweep-20261015-a.json` links all eight reports, logs and process records; `/private/tmp/ol-pf129-source-preparation-20261015-a.json` pins every preset and unchanged source/metadata/dependency state. Formatted helper SHA`dd0999b259a3eda56e521dfcc5b8b4410f73238f046708735ca076658043e742`. This is fixed native work, not renderer/SQL/input-latency/long-run acceptance. No live model calls; additional/cumulative provider cost$0.

## Fresh running-server comparison

Select an ordinary PostgreSQL-backed fresh-world viewer comparison before any retention. Prepare matched private source copies of the qualified shared15g runtime, candidate changing only the world-owned default to60g. Common qualification changes adopt the already proved generated-database helper/declaration, its pre-connection identity sidecar and the current CRe asset link. Source/TypeScript/six-identity/actual-worker guards precede one30sbaseline for inspection, then separately reviewed candidate/reverse observations. Preserve every refused/late command, pause, incomplete activity, timer debt, source mismatch and cleanup failure. Actual elapsed time and work determine results; a short server gain cannot qualify frames or sustained3×.

That selected comparison is now complete in baseline/candidate/candidate/baseline order. All four runs use an actual database, HTTP commands and recurring screen updates, with seventeen people, forty animals, 133 other roots and sixteen residents travelling between finite work and food patches. Every resident completes two plans and eats the actual food that plan produced: 32 checked bindings per run, all matched. All seventeen people remain alive; no stopped plan, actor error, refused command, SQL/maintenance rejection or storage error is reported through normal closure. No sleep/wake occurs in these short runs. Endpoint animal counts are not proof of continuous movement.

| Run         | Idle checks in game seconds | Actual speed | World-calculation elapsed time | Whole-process CPU | Command confirmation p95 | Largest screen-update gap |
| ----------- | --------------------------: | -----------: | -----------------------------: | ----------------: | -----------------------: | ------------------------: |
| Baseline 0  |                          15 |      2.9632× |                       16.918 s |          24.998 s |                 360.0 ms |                1,066.5 ms |
| Candidate 1 |                          60 |      2.9837× |                       14.256 s |          26.927 s |                 360.6 ms |                  309.4 ms |
| Candidate 2 |                          60 |      2.9808× |                       14.616 s |          24.191 s |                 452.5 ms |                  482.6 ms |
| Baseline 3  |                          15 |      2.9662× |                       16.948 s |          29.022 s |                 483.0 ms |                  829.9 ms |

The means are **2.9647→2.9822×**, only **0.59% more actual progress**. World-calculation elapsed time falls **16.933→14.436 seconds, 14.75%**; whole-process CPU falls **27.010→25.559 seconds, 5.37%**, with substantial run variance. Save elapsed totals fall **8.304→7.110 seconds** and ordered-world-change waiting totals **10.197→7.584 seconds**. These spans overlap and are not additive or exclusive CPU shares. Different real input and scheduling timelines process slightly different amounts of work; the native fixed-work result remains the cleaner causal CPU comparison.

The two candidate runs confirm 29 commands each, with no skipped offers; baselines confirm 29/28 and skip one offer each while busy. Mean per-run p95 confirmation is **421.5→406.5 ms**, not a pooled percentile and not an adequate responsiveness result. Ending unprocessed game time is **9.780/17.784/28.864/51.582 game seconds** respectively. Actual elapsed time minus simulated progress corresponds to **0.373/0.163/0.192/0.338 real seconds behind**. The candidate has not proved zero backlog or sustained 3×. Screen-update gaps are server delivery observations, not browser frames or physical display measurements. No browser runs here.

Both new private roots pass pinned formatting, TypeScript and actual six-namespace/separate-route-worker checks before play. Their 441-file sources differ only in the world-owned idle default; common qualification adopts the already proved generated-identity helper and caller plus the current client asset link. All source/dependency/runtime-sidecar/17-asset guards pass before and after every observation. All four process groups exit normally without termination; exact newly allocated databases, sessions and temporary directories are absent afterward. Original 300-second outer and 30-second administration bounds remain unchanged. Optional pre/post garbage collection is inherited; no sampler, counter collection or provider is enabled.

Decision: **retain as a private promising partial saving, not an accepted gameplay change or a solution to slow walking**. Active-intruder behavior, actual browser smoothness and long-session growth still need qualification before integration. Further slowing to 240/600 seconds is not selected because it cost more CPU in the native sweep while adding detection delay.

Private records: `/private/tmp/ol-pf129-full-game-source-20261015-a.json`, `/private/tmp/ol-pf129-full-game-static-20261015-a.json`, `/private/tmp/ol-pf129-viewer-comparison-20261015-a.json`, all four individual reports/logs/lifecycle/generated-identity records. Additional and cumulative provider cost remain $0.

## Current-code qualification selected

October16 continuation, selected before edits. The earlier19.4% native CPU saving is a stronger measured lead than removing automatic place memories (1.76%) or all nonverbal bystander delivery (7.75%). The new current server profile still shows large repeated world and snapshot costs. Those observations do not prove the old candidate will retain its percentage on current code.

Prepare original/current15/current60fresh sources and full expanded openings using the current initializer and the exact existing fixture constructor, retaining command-record and material-read optimizations. Reuse the qualified required idle policy field and final-mode scheduling; preserve15g active review/refresh and all physical/needs/sight rules. Construct current worlds normally, not by adding fields to incompatible old saves. Compare complete original/current15native behavior with only that new field projected out for analysis. Before fixed-work timing, qualify full sources/types/imports/actual worker, active-intruder/return behavior and current SQL saving/reloading with strict required-field validation. The bounded fresh timing and later real-server/browser/sustained comparisons remain separate gates.

This deliberately permits a waiting territorial animal to notice a visitor up to60game seconds later: one real second at1× or one-third at3×. A visitor who leaves before the next check can be missed. Pursuit and attack timing must keep the existing fifteen-game-second cadence. No candidate is retained yet; no shared world or save is reset. [Current plan](../../projects/three-times-scene-performance.md#current-idle-review-qualification).

### Current source/opening qualification and first controlled failure

All three current444-file sources pass formatting/executable-equivalence, TypeScript, six imports and the actual separate navigation worker. Independently constructed full fresh openings contain17people/40animals/133other roots; their complete serialized values differ only in the introduced idle-policy field. Fixture metadata is byte-identical. No saved world is adapted.

The first active probe stops on the original source before either changed source is released. Submitting a territorial animal's move directly against a frozen world reaches a pending-route preparation path that tries to change its detour counter on the frozen record. This is an existing-path exception, not a demonstrated idle-policy regression. The original process closes normally; no database or provider is used. Preserve its log/lifecycle and keep that direct frozen-command preparation issue visible.

The next probe will exercise pursuit through the actual native world-update caller, including the real separate route worker and current-result admission, rather than treating the alternate direct-command path as equivalent. Expand the qualification helper to cover this actual path (roughly40reused worker lines plus bounded pursuit integration). It must retain the positive actual strike, unchanged active timing, return-to-idle and deliberately missed brief-visitor cases. No game-source exception or validation check is bypassed.

### Current active behavior passes; SQL comparison refinement remains

The actual-native probe passes original/current15/current60. All three perform the same antler hit at120g, health100→82, with identical complete emitted-event digest. Actual pursuit moves1.2357m over75g and completes one real pending route through the separate worker; active review remains15g. Quiet/returned-home review is15/15/60g. The brief visitor is noticed at15g in the two controls and missed by the60g version before leaving. Both new sources reject a missing required idle field. All owned groups close normally, without provider/database use. Evidence `/private/tmp/ol-pf144-active-lifecycle-20261016-b.json` and three report/log/lifecycle files; the earlier direct-command failure stays preserved.

The first current15 SQL probe commits the fresh world and new events, then fails its exact native-tree-shape comparison. Current SQL stores command results as indexed logical records and rebuilds a balanced tree on read; a newly constructed tree can have different internal branches while holding the same exact IDs/bodies. The earlier input happened already to have the reconstructed shape. No changed-source candidate is released; exact owned database/session/folder cleanup passes. Preserve this failure. Before a fresh sequence, reuse PF16.133's established semantic command-record projection for comparison, preserving every command key/value and every other stored field. This changes neither storage nor validation and introduces no older-format support. Both policy versions must still pass actual commit/load/reopen before timing.

### Current saving passes; replay fixture mismatch preserved

Fresh SQL b passes both15g and60g sources through initial/new-event commits, complete logical command-key/value and other serialized-field comparison, load, reopen and required-policy validation. Audience/personal-account agreement remains intact. Each owned process closes normally and exact database/session/folder cleanup and source/input/helper guards pass. The failed internal-tree comparison remains preserved.

The first complete-work replay then rejects the original source before its first time step: the inherited tool requires four units per patch from its older three-second-stock opening, while these declared current openings use the ordinary30-second constructor and have ten. All three current worlds already match except the idle setting, with identical metadata; no resource is replenished or rewritten. Preserve the rejected run and empty proof artifact. Before a fresh sequence, validate the exact declared current5400g stock calibration/five possible cycles/ten units and its metadata instead. Activity remains2400g/80anchors/32plans/16food checks/14walks/16returns, with original60sinner/90souter bounds. This is a new current-fixture comparison, not reuse of the older19.4% estimate or an increased run limit.

## Current code: complete behavior proof and 20.0% native saving

The original and new15-second control match **all80complete checkpoints,567emitted events and269outcomes**, including private audiences, exact quantities, command records and randomness. Only the newly introduced idle-policy field is projected out for comparison. Each independently constructed input remains unchanged. This verifies that adding the separate setting at its former value preserves the demonstrated whole workload. Both new policies also pass current SQL commit/load/reopen and strict field validation.

The new counterless15/60/60/15comparison uses those qualified current sources and the declared current30-second-stock opening. Each run completes exactly2400game seconds,80admission anchors,32plans,16own-produced-food checks,14player walks and16physical returns, with all17people and40animals alive. Each policy repeats its complete final world and saved random sequence. No sampler, counters, proof compression, forced collection, database, browser or model is used during timing.

| Run |   Idle interval | Process CPU | Measured elapsed | Completed native world updates |
| --- | --------------: | ----------: | ---------------: | -----------------------------: |
| 0   | 15 game seconds |    8,223 ms |         7,353 ms |                            223 |
| 1   | 60 game seconds |    6,461 ms |         4,779 ms |                            150 |
| 2   | 60 game seconds |    6,437 ms |         5,428 ms |                            150 |
| 3   | 15 game seconds |    7,905 ms |         5,508 ms |                            223 |

Mean CPU **8,064→6,449ms**, or **20.03% less**; world updates **223→150**. This is a new matched current-fixture result, not the older19.4% trial. It does not establish running-server, input or frame capacity. Native references `/private/tmp/ol-pf144-native-comparison-20261016-a.json`, `/private/tmp/ol-pf144-native-timing-lifecycle-20261016-a.json` and their full reports/traces/logs/normal-close records. All source/input/worker/dependency guards pass; no forced stop or shared-data reset.

### Current running-server comparison selected before release

Separately select new15/current60/current60/new15ordinary30-second fresh server phases through these qualified roots. Use the ordinary current initializer and the same expanded/travel/finite-stock30-second fixture constructor, original animal flight, sensing and needs; actual PostgreSQL, one-hertz player inputs and recurring views remain. Preserve the existing300-second outer bound, source/runtime/worker/asset/dependency/generated-identity and exact owned database/session/folder checks. No observer/sampler/counters/forced collection/providers. Inspect each run before releasing the next; preserve skipped/refused inputs, incomplete activity and late errors. This can qualify a useful integration candidate but cannot pass sustained smooth3× or the remaining browser gates by itself. No canonical idle-policy change has been made.

### Current first server pair: no progress gain yet

The current15-second control reaches2.06495×, confirmation p951,257ms,27accepted/3skipped inputs,41new plans (minimum2per resident) and25matched produced-food checks. The first60-second run reaches2.06372×, p951,275ms,25accepted/4skipped inputs,39plans (minimum2) and23matched food checks. All tracked seventeen people are alive; every issued command succeeds, with no late storage/SQL/maintenance/observation error. Both sources and exact owned cleanup qualify. The first pair does not establish a running-game benefit; reverse observations remain selected.

A coverage gap is explicit: this ordinary fresh profiler reports forty endpoint animals but lacks the aged profiler's alive/dead animal metric. The metric reader first fails on that absent field; no game failure or animal survival claim follows. Fixed native trials do verify all forty alive. Keep the server comparison's missing endpoint-life evidence open for final qualification instead of treating population count as survival.

### Current four-run server result: partial gain, failed smoothness

The reverse observations are complete. The same current game runs with seventeen people, forty animals, 133 other roots, real saving, player commands and sixteen travelling residents gathering and eating finite food.

| Run         | Idle check interval | Actual speed | Command confirmation p95 | Accepted / skipped inputs | Plans / matched food checks |
| ----------- | ------------------: | -----------: | -----------------------: | ------------------------: | --------------------------: |
| Control 0   |     15 game seconds |       2.065× |                 1,257 ms |                    27 / 3 |                     41 / 25 |
| Candidate 1 |     60 game seconds |       2.064× |                 1,275 ms |                    25 / 4 |                     39 / 23 |
| Candidate 2 |     60 game seconds |       2.866× |                   613 ms |                    28 / 1 |                     48 / 32 |
| Control 3   |     15 game seconds |       2.511× |                   759 ms |                    29 / 0 |                     48 / 32 |

Mean progress is **2.288→2.465×, 7.73% more**. Mean per-run confirmation p95 is **1,008→944 ms**, not a pooled percentile. All four runs remain below 3× and all confirmation tails fail the responsiveness goal. The large variation matters: the first pair is neutral. This is a modest running-server benefit, separate from the stronger 20.03% equal-work CPU saving. Different completed work makes CPU per game second (4.838→4.382 ms) descriptive, not an identical-work causal comparison. Native and saving elapsed totals overlap and must not be added.

Every issued command succeeds; all seventeen tracked people remain alive, food checks match their actual produced items, and no stopped plan or late storage, SQL, maintenance or observation error is reported. Each source, worker, dependency and asset guard passes. All four owned process groups close normally, with exact generated database/session counts 0/0 and temporary folders absent. Animal presence is forty in each report; endpoint animal life is still unmeasured in this fresh profiler. The separate fixed native proofs establish life only for their own workload.

Keep this candidate private while browser, sustained-play and endpoint-animal-life qualification remain open. It permits missed brief visits to an idle territorial animal, as demonstrated above; active pursuit and attacks retain their original timing. Evidence: `/private/tmp/ol-pf144-fresh-comparison-20261016-a.json` and all four individual reports, logs, source and lifecycle records. Additional and cumulative provider cost: $0.
