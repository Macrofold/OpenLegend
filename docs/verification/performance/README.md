# Performance evidence

[Optional profiling implementation and evidence](profiling-controls.md) records disabled work, process/worker/browser cleanup, tool modes and measured-overhead qualification separately from the smooth3× goal.

Start with [Why OpenLegend is still slow](bottlenecks.md). It gives the actual outcome, ranked costs, gameplay trade-offs and missing evidence without requiring code knowledge.

For implementation and candidate dispositions, read [Performance Overhaul Ideas](../../projects/performance-overhaul-feature-spec.md). The October 16 project treats old measurements as directional evidence, identifies caveats in the [evidence audit](../../projects/performance-overhaul/evaluation.md), and records status in [PF17](../../maintainers/performance.md#pf17--performance-overhaul-ideas). The [ordinary implementation results](overhaul-implementation.md), [compromise trials](overhaul-compromises.md) and [changed-document index](overhaul-documents.md) describe what was actually built, checked, rejected and left open. Smooth 3× remains unmet.

The [plain-language experiment history](../smooth-game-experiments.md) explains attempted changes and before/after results. The [original evidence index](../three-times-scene-performance.md) retains the investigation overview and links to the detailed files below. These files preserve earlier evidence and its original limits; they are not all measurements of the same version or scenario.

| Detailed record                                                          | Contents                                                                     |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| [Interactions and early server work](01-interaction-and-early-server.md) | Menus, views, early whole-server costs                                       |
| [Simulation, drawing and routes](02-native-render-and-route-trials.md)   | Initial owner experiments and route timing                                   |
| [Saving and render preparation](03-saving-and-render-preparation.md)     | SQL waits, cloth storage, shadow publication                                 |
| [Earlier long runs and cognition](04-earlier-long-runs-and-cognition.md) | Long failures, plans, personal evidence                                      |
| [September history](05-september-history.md)                             | Original versions, reviews and integration limits                            |
| [Sustained game and browser diagnosis](06-sustained-game-and-browser.md) | Ten-minute mixed travel/rest, drawing warnings, browser recording limits     |
| [Cape and shadow experiments](07-cape-and-shadow-experiments.md)         | Exact-contact rejection, quality/cost trials                                 |
| [Native CPU and allocation](08-native-cpu-and-allocation.md)             | Restored-world attribution, growing records, rejected read shortcuts         |
| [Animals and simulation cadence](09-animal-and-cadence-experiments.md)   | Animal trade-offs, repeated intervals, work durations, snapshot costs        |
| [Saving and world snapshots](10-saving-and-world-snapshots.md)           | Command waits, current saving checks and snapshot handoff                    |
| [Whole-category removals](11-whole-category-removals.md)                 | Current controlled removal experiments and snapshot-handoff timing rejection |

[Project plan](../../projects/three-times-scene-performance.md) · [Experiment register](../../maintainers/performance.md)

[Repeated work counts and the rejected quiet-wandering trial](12-work-counts-and-quiet-wandering.md) explain the current native follow-through.

[Restoration and command-wait recording](13-restoration-and-clock-recording.md) preserves the qualified recorder, failed five-minute launch and exact owned cleanup.

[Idle territorial review frequency](14-idle-territorial-reviews.md) records the isolated15/60/240/600comparison and selected full-server follow-through.

- [Actual command and clock waits](15-actual-command-and-clock-waits.md): complete recorded queue holders, database awaits, cutoff debt and remaining unknowns.

- [Growing dictionary copies](16-growing-dictionary-copies.md): actual fresh/restored copy widths, distinct-container counts and their limits.

- [Cloth quality and cost](17-cloth-quality-and-cost.md): four-vs-eight numerical quality, eight CPU observations, four graphical runs and remaining appearance/sustained checks.

- [Recording commands without copying previous commands](18-command-record-layout.md): current tree-layout trial, behavior/save proofs, neutral fresh timing and older-world comparisons.

- [Repeated material preparation](19-material-preparation.md): category removal, retained safe reads, fixed-work CPU savings and unresolved running-game command latency.

- [Database activity during slow commands](20-database-activity.md): externally distinguish backend activity from application waits; controlled qualification and actual-game diagnosis.

- [Current place observation index](21-latest-place-index.md): actual query plans, avoided old-record/page visits, index tradeoffs and failed full-game qualification.

- [Automatic place-recording removal](22-place-recording-removal.md): diagnostic loss of new automatic place observations, preserving current visibility/contact work, to separate complete recording cost.

- [Repeated witness-record removal](23-witness-record-removal.md): measure the cost of giving each nearby person another account of routine work, with the deliberately lost memories made explicit.

- [Current server CPU attribution](24-current-server-profile.md): refresh the ranking after retained changes, with sampling coverage and overlapping costs made explicit.

- [Database service isolation](25-database-service-isolation.md): test a separately owned service and its cache while preserving the same game and durable writes.

- [Private database cache](26-private-database-cache.md): compare128/512MBon only the owned service, preserving durability and measuring the test database after play.

- [Meter-definition lookup](27-meter-definition-lookup.md): a measured repeated shared-rule read, preserving every condition and mutable authoring edit.

- [Automatic thought scheduling](28-background-thought-scheduling.md): pause one full category to measure background preparation and database bookkeeping before proposing cognition compromises.

- [Ordinary animal activity](29-ordinary-animal-activity.md): separate standing-still animals from removing their physical bodies and energy/health calculations.

- [Ordinary animals in the actual server](30-ordinary-animal-server.md): test whether the24.3%native saving becomes a useful running-game improvement.

- [Newest place-observation flags](31-place-flag-update.md): choose once and change only necessary marks while preserving all remembered information.

- [Completing world edits](32-immutable-edit-library.md): audit a newer finalization design against measured repeated traversal, preserving every game result before timing.

- [Server costs with the newer edit library](33-newer-library-server-profile.md): refresh actual remaining costs after the measured package-level CPU improvement.

- [Unnamed profile callers](34-unnamed-profile-callers.md): identify actual source calculations behind anonymous compiled callbacks, with unmapped evidence preserved.

- [Memory-catalog write counts](35-memory-catalog-write-counts.md): count identical observation bodies before proposing a change to catalog maintenance.

- [Passive animal energy](36-animal-passive-energy.md): retain animal movement and reactions while testing whether continuously changing energy causes expensive repeated work.

- [Actual database execution](37-database-execution-times.md): separate the database’s measured work from application-side waiting during older-world saves.

- [Current recent-result storage retest](38-recent-result-storage-retest.md): revisit the largest measured standalone database write family while preserving the earlier negative game comparison.

- [Combined current system and idle checks](39-combined-idle-reviews.md): measure the latest storage/library work together with explicitly slower idle territorial noticing.

- [Quiet territorial wake-up assessment](40-quiet-threat-wakeups.md): investigate avoiding proved-unnecessary idle reviews while retaining timely reactions.

- [Combined ten-minute growth](41-combined-growth.md): observe later work, rest, storage rollover and input delays on the current qualified combination.

The previous reader report is preserved as [earlier reader-report detail](reader-report-history-2026-10-16.md); the maintained standalone report above replaces its mixed-version ranking.

- [Combined graphical survival](42-combined-graphical-survival.md): keep the player alive through ordinary public eating/sleeping while measuring actual drawing and walking delays.

- [Disjoint record-write groups](43-disjoint-record-write-groups.md): test combining proven independent new/updated records without weakening transaction checks or record identity.

- [Current long-browser gap](44-long-browser-freeze.md): correlate the actual large frame gap with existing measured brackets before assigning a cause.

- [Late browser trace](45-late-browser-trace.md): qualify the recorder before tracing the unexplained pause during actual play.

[Resident decisions sharing a save](46-resident-decision-save-groups.md) records the selected bounded diagnostic of fewer complete saves, individual admission/failure checks and its future actual comparison. No result is yet available.

- [Capture the browser when a freeze happens](47-catch-a-freeze.md): selected bounded rolling-recording investigation; no result yet.

- [A fast average can hide a slow busy minute](48-busy-minutes.md): a 2.32× working minute despite a 3.000× average; completed phase-cost and full-play recording.

- [Decision completion bookkeeping](49-decision-completion-cost.md): roughly half the selected writes removed, no dependable game/input gain; private diagnostic closed.

- [Current walking-delay attribution](50-current-click-waits.md): refresh where current clicks wait before choosing a larger scheduling or saving experiment.

- [Current database execution versus waiting](51-current-database-time.md): measure PostgreSQL’s own work before choosing a larger saving change.

- [Compact world-record batches](52-compact-world-record-writes.md): one-owner encoding trial with complete correctness proof; the original timing series is interrupted and performance remains unproved.

- [Independent profiling presence](53-independent-player-presence.md): correct the command-coupled presence driver that interrupts a timing series; keep the actual player lease unchanged.

- [Actual record-batch sizes](54-record-batch-shapes.md): completed one-row versus larger compact-write diagnosis; small-only requests do not establish a leading cost.

- [Searchable-experience write plans](55-memory-write-plans.md): inspect the measured insertion and eligibility costs before choosing another rewrite.

- [Memory-index write cost](56-recall-index-write-cost.md): broad private removal to measure extra lookup maintenance versus slower searches; preregistered before edits.

- [No-game database and timer delays](57-empty-host-latency.md): completed minimal read-only test does not reproduce the severe ordinary-game stall.

- [Game CPU and database stalls together](58-game-cpu-and-database-stalls.md): record both sides of slow saves before choosing another change.

- [Fixed observation-burst index cost](59-fixed-memory-index-burst.md): compare exactly matched new information before attributing variable game speeds to indexes.

- [Narrow current-world lookup keys](60-narrow-current-world-indexes.md): completed fixed comparison: 10.3% fewer recovery-log bytes, but extra whole-world index work in a scoped read; candidate not retained.

- [Branch review and lessons](61-branch-review-and-lessons.md): check correctness, measurement integrity, guidance and implemented-versus-private status.

- [Compact transport through the current game](62-compact-writes-current-game.md): complete the actual-game comparison after fixing the independent presence driver.

- [Compact batches in four current games](62-compact-writes-current-game.md): complete independent-presence comparison; better walking/saving, unmet speed/activity and no demonstrated CPU gain.
- [CPU clock alignment](63-cpu-clock-alignment.md): qualify known CPU/idle markers before placing calculation samples on the measured game timeline.

- [Ordered database-write transport](64-ordered-database-write-pipeline.md): preregistered bounded protocol proof before any game-storage change.
