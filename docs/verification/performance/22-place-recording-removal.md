# How much does repeatedly recording places cost?

October 16, 2026. **Completed diagnostic: fixed-work CPU saves only 1.76%; the four actual-server runs show no demonstrated benefit and fail activity/input qualification.** The full-game current-place index trial failed qualification despite its smaller lookup. This experiment removes a whole related category to measure its complete cost before choosing another optimization.

When a character sees a place after it was no longer visible, the game currently adds another private observation containing that place's description. This creates experience and event records and updates searchable evidence and the latest-place marker when saving. Cost can grow with characters, repeated visibility changes, places and retained history.

The private candidate changes only the place-observation call inside incremental perception: a typed empty helper receives its existing arguments. Current visibility, contact checks, recognition episodes, person/object observations and cleanup after losing perception retain their existing code. Other direct place/item inspection paths remain active. About 3–8 diagnostic logic/comment lines; no new cache, schema, limits or canonical game change.

**Deliberate loss:** this automatic path stops adding new place knowledge and records of later visits. Previously recorded knowledge remains. Fixed existing work plans do not establish that autonomous characters can make good decisions with missing observations. The full removal is not eligible for retention as a rich-game solution.

First qualify complete matched current source copies, formatting, TypeScript and all six package identities plus the actual separate route worker. Then compare ordinary/removal/removal/ordinary over the unchanged fixed older-world workload: 6,000 game seconds, 200 admission anchors, 53 plans, 37 produced-food bindings, 34 player walks and sixteen physical returns. Cross-version complete worlds/events intentionally differ; repeated worlds within each version must match. No samplers, counters, trace compression, forced collection, database, browser or providers. The existing 150-second in-loop/180-second outer limits remain.

After those activity/source/closure checks, separately select an actual older-server comparison to measure database and command effects that native-only timing cannot establish. Preserve every failed or incomplete activity and all negative results. Native and server gains cannot be added. The original saved input and its prior knowledge are never refilled or rewritten.

[Earlier category removals](11-whole-category-removals.md) · [Failed full-game index trial](21-latest-place-index.md#full-game-failed-qualification-index-held) · [Plain-language gaps](bottlenecks.md)

## Identical older-world activity: a small native saving

All four observations complete exactly 6,000 game seconds, 200 admission anchors, 53 plans, 37 produced-food bindings, 34 walks and all 16 physical returns. Every required resident and all 40 animals survive. Each version repeats its complete final world and random sequence exactly. Cross-version worlds differ intentionally; all action-type counts except encounter events match. Encounter events fall 173→109, a loss of 64 automatic place observations. Other observations remain active.

| Run | Version                    |     Total CPU | Native calculation CPU | Measured elapsed |
| --- | -------------------------- | ------------: | ---------------------: | ---------------: |
| 0   | Ordinary                   | 29,239.309 ms |          28,026.094 ms |    25,866.699 ms |
| 1   | No automatic place records | 28,305.411 ms |          27,169.429 ms |    24,317.187 ms |
| 2   | No automatic place records | 28,956.751 ms |          27,814.993 ms |    24,844.717 ms |
| 3   | Ordinary                   | 29,049.994 ms |          27,852.031 ms |    24,759.742 ms |

Mean total CPU 29,144.652→28,631.081 ms is **1.76% less**. This does not justify the loss of new place knowledge as a finished optimization. It bounds the direct calculation saving in this fixed full-checkpoint replay; the actual service retains a smaller hot-history subset and separately pays SQL costs. The separately reported actual-server comparison below tests database and input costs instead of inferring them from native CPU.

All source/input/dependency/normal-group-closure checks pass; no forced cleanup, sampling, trace, database or provider is used. Baseline final raw world remains `1417ce573b1d9a016752ded030d9394a7bc49203fb5eace6350c44803717e2ce`; removal repeats `b5bd419a6c37575fc4d6cb01f2ac56e40b1e7693b7f6e6ba0dfbef65c1de7e10`. Both end with saved random sequence 3410843410. Private evidence `/private/tmp/ol-pf140-native-timing-lifecycle-20261016-a.json` and four report/lifecycle/log companions. Additional/cumulative provider cost $0.

### Actual server comparison selected before launch changes

Separately select B/C/C/B actual older-server 30-second phases with the same qualified two source copies, normal full saved-world restoration, original policy and finite existing plans/stock. Keep original 300-second watchdog, source/worker/dependency/asset/input and exact owned database/session/directory guards, no observer/samplers/counters/forced collection/providers. Inspect/release one observation at a time; preserve activity-floor failures and skipped inputs. This tests whether follow-on saving/queue effects materially exceed the small native saving. The full record suppression remains diagnostic-only and cannot pass rich-game acceptance.

## Actual server: no benefit demonstrated

These four 30-second phases restore the same complete older saved world through the ordinary server. Each has seventeen people, forty animals and 133 other root objects, with the same finite resources and existing plans. The service performs real database writes and serves player commands and world updates. Completed work differs between runs; these are not equal-work CPU comparisons.

| Run | Version                    | Actual speed | Command confirmation, 95th percentile | New resident plans / minimum per resident | Produced-food checks | Accepted / skipped inputs |
| --- | -------------------------- | -----------: | ------------------------------------: | ----------------------------------------: | -------------------: | ------------------------: |
| 0   | Ordinary                   |       1.956× |                              1,060 ms |                                    28 / 1 |                   12 |                    28 / 2 |
| 1   | No automatic place records |       2.522× |                                755 ms |                                    39 / 2 |                   24 |                    30 / 0 |
| 2   | No automatic place records |       1.179× |                              1,415 ms |                                    21 / 1 |                    5 |                    22 / 8 |
| 3   | Ordinary                   |       2.330× |                                762 ms |                                    37 / 2 |                   21 |                    30 / 0 |

The two ordinary runs average **2.143×**; the removal runs average **1.850×**, or 13.7% less progress. Their mean per-run command percentile is also worse, **911→1,085 ms**; that mean is not a pooled percentile. One ordinary run and one removal run fail the required minimum of two newly selected plans per resident and skip player inputs. Every issued command succeeds, all people and animals survive, and every checked food binding matches. The failures remain in the comparison.

This does **not** prove that missing place records caused the regression. The two identical removal runs vary from 2.52× to 1.18×. In the slow one, a single grouped write of shared events and observer accounts waits about **5.03 seconds**, inside a **5.55-second** save. Its native calculation and garbage-collection costs also increase. The underlying reason for that variation is unresolved. It is not a reason to discard the bad result. The complete category removal has no demonstrated full-game gain and is not retained.

Restoration takes 106.3 / 152.3 / 54.4 / 53.5 seconds in run order. Those setup times are outside measured play, but show why experiment feedback is slow. No observer, CPU sampler, extra work counter, forced collection or model request is used. All four processes close normally; source/input/dependency guards pass, and each exact owned database, database session and temporary folder is absent afterward. No late SQL, maintenance, storage or command error is reported.

Private evidence: `/private/tmp/ol-pf140-aged-comparison-20261016-a.json` plus the four original reports, logs, generated-identity records and lifecycle files. The native-only saving remains 1.76%; it cannot be added to a server gain that this trial did not establish. Additional and cumulative provider cost remain **$0**.
