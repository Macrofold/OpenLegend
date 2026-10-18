# Which growing records are handled repeatedly?

October 15, 2026. **The first counts identify wide entity and command-history dictionaries; their CPU shares remain unmeasured.** A refinement will distinguish first-seen containers from repeated observations. No game-data representation is changed or accepted by these counts.

When the game publishes a change, it keeps earlier snapshots intact. A flat dictionary can therefore need a full shallow copy even when one entry changes. The copied entries still point to shared records, but copying or walking thousands of dictionary keys repeatedly can become expensive.

## Actual counts

These scenarios perform different amounts of work and are **not a matched speed comparison**. The fresh test advances2,400 game seconds under fixed admission anchors; the restored-world test runs30.224 real seconds. Both contain seventeen people, forty animals and133 other roots.

| Dictionary                    | Fresh: modified-draft observations | Fresh: summed observed keys / largest width | Restored: modified-draft observations | Restored: summed observed keys / largest width |
| ----------------------------- | ---------------------------------: | ------------------------------------------: | ------------------------------------: | ---------------------------------------------: |
| Entity records                |                                381 |                               119,763 / 350 |                                   914 |                                  809,850 / 908 |
| Accepted command records      |                                126 |                                15,813 / 188 |                                   222 |                                687,605 / 3,180 |
| AI-component response records |                                 31 |                                    527 / 32 |                                    34 |                                   10,200 / 300 |

The command records preserve exact command identity, content and outcome so repeating a request cannot repeat its effects. Removing them blindly would sacrifice correctness. An indexed or partitioned representation remains an option to measure; deleting history is not the proposed shortcut.

Other top-level records are much narrower in these counts. Some contain nested collections, however: a ten-key outer record can contain thousands of action records below it. **This first observer does not attribute nested copies.** Summed widths are neither exclusive CPU nor exact library property visits.

The observer separately sees mutable plain values, rather than modified draft containers. Fresh entity/command observations are0 / 25, with0 / 3,616 summed keys; restored values are29 / 149 observations with25,705 / 461,283 keys. A mutable value can already have been produced by an earlier nested snapshot and reused. These observations are **not proof of that many distinct new copies**. The selected refinement uses weak identities to separate first-seen containers from repeats, without retaining world objects strongly.

## Behavior and run quality

The fresh observer run matches the previous complete final-world signature exactly, including events, outcomes and randomness: `16c8c8fbbf57ef85315f4292a63ff27b1f25c5eaaf3d1b8582ca68688d77b97f`. It completes80 anchors, fourteen player walks,32 plans, all sixteen actual own-food and physical-return checks, and keeps forty animals alive. Its normal owned process closes in6.231 seconds. This proves this observer did not change the demonstrated activity; its instrumented CPU time is not a speedup claim.

The restored30.224-second count run reaches **2.1212×**, still below target. All 29 commands are accepted; all seventeen people remain alive with no actor, plan, SQL/maintenance rejection or storage error. Every resident completes at least one real plan, two complete two, and all 18 produced-food/eaten-food bindings match. Live resident entities grow870→902 and accepted command records3,015→3,179. Restoration takes58.327seconds, before measurement. Whole launch closes normally in109.181 seconds. Full source/dependency/client/checkpoint guards and exact allocated database/session/directory cleanup pass. The exact allocated database is`openlegend_fixture_b08c37e4f9dd4b62a2c97e1bfccd8309`; no original save is changed.

## Diagnostic corrections, retained openly

The first small observer proof omits the required collision-runtime initialization and fails before world creation. The corrected helper uses the ordinary initializer and verifies an unchanged dictionary is skipped, a modified entity dictionary has the expected width, a mutable assigned command dictionary is identified, and removing the observer stops collection. Formatting, executable-code equivalence, TypeScript and the actual six-namespace/separate navigation worker also pass.

The first aged-count launch mistakenly uses the dedicated wait recorder, whose startup check requires wait recording and rejects native counters. It stops in1.728 seconds before directory/database allocation, without a game result. That failure is preserved. The replacement private source starts from the qualified ordinary aged profiler and adds only the proved ownership callback, loading markers and copied-width observer. The ordinary world service is byte-exact to its baseline. No recorder gate is weakened. Formatting, executable equivalence, TypeScript and a real worker at the new root pass; unchanged domain/native proof is reused.

The final ordinary count runtime has442 files, aggregate`42888f746988daa62a5ad572b3cd83f676b60d1ec18a99832c07901e6b99b69b`. Actual counts live in `/private/tmp/ol-pf132-native-counts-20261015-a.json` and `/private/tmp/ol-pf132-aged-copy-widths-20261015-c.json`; static/ownership/cleanup records retain each source and failure. Additional and cumulative provider cost remain $0. No browser, retained map rewrite or 3×acceptance follows.

## Distinct-container refinement: completed

A phase-local weak identity set now distinguishes first-seen containers from later observations of the same object. It is reset when collection starts/stops and retains no object strongly. A controlled repeated-mutable-container case, formatting/code equivalence, TypeScript, real six-namespace/worker and the exact complete fresh-world digest all pass.

| Field in the restored-world phase | Distinct modified draft containers | Keys at their first observation | Largest observed width | Additional distinct mutable containers |
| --------------------------------- | ---------------------------------: | ------------------------------: | ---------------------: | -------------------------------------: |
| Entity dictionary                 |                                925 |                         819,851 |                    907 |                                      0 |
| Command-record dictionary         |                                225 |                         697,162 |                  3,183 |                                      0 |

All 29 mutable entity observations and 153 mutable command observations repeat containers already counted. Their25,706/473,937keys must not be added as fresh copies. The fresh refinement likewise retains381 distinct entity copies/ 119,763 keys and126 command copies/ 15,813 keys, with no additional distinct mutable command container. These are widths at first observation, not allocated bytes, exact traversal counts or CPU shares. Nested collections remain outside this observer.

The aged refinement completes normally in89.044 seconds, restoring the unchanged saved world in53.395 seconds. Its instrumented phase reaches 2.149×, with 29 accepted commands and 20 matched actual produced-food/eaten-food bindings. No actor/plan/storage/SQL/maintenance rejection occurs. Complete source/assets/checkpoint guards and exact owned database/session/directory cleanup pass. The runtime aggregate is`d6b3a106cc2975f38408c7af149fc706c01d1968f4ba082f8d40e448dec378e4`; results are `/private/tmp/ol-pf132-native-counts-20261015-d.json`, `/private/tmp/ol-pf132-aged-copy-widths-20261015-e.json` and lifecycle e. The count investigation is complete without a capacity or map-specific CPU claim. Smaller command-record groups are now being assessed separately; no record is removed.
