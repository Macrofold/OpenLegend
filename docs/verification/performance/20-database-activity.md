# Is PostgreSQL busy, or is the game late handling its reply?

October 15, 2026. The latest material-reading change saves calculation work, but the running game still sometimes takes about a second to confirm a click. One save took 1.24 seconds, including 1.21 seconds awaiting database requests. That waiting time includes more than work inside PostgreSQL. This investigation separates those possibilities before changing how reliably the game saves.

## What this measurement can establish

A separate, read-only connection samples only the newly allocated test database. It records whether each game connection is executing a request, waiting for the application, waiting for a lock, or waiting for another resource. It records timestamps and connection identities, never SQL text or parameter values. It cannot inspect unrelated database activity through its query.

Each metadata query runs in its own ordinary transaction so its activity information refreshes. PostgreSQL documents that connection activity is independent of its accumulated statistics, that an active request can itself be waiting, and that `ClientRead` means waiting for the application. These states are **not exact CPU time or per-request durations**. [PostgreSQL 14 monitoring documentation](https://www.postgresql.org/docs/14/monitoring-stats.html).

Samples alternate 37/53 millisecond delays after each completed query. Their actual request, server and completion timestamps are retained: slow observations and gaps must not be filled with invented activity. The observer adds load and therefore cannot establish a game-speed improvement. The normal game report, skipped inputs, failures and shutdown remain intact.

## Controlled qualification

The actual observer passes its source review, pinned formatting and Node syntax checks. In a newly allocated database, it sees all three deliberately established conditions: an idle connection, an idle connection inside a transaction, and an active request waiting in PostgreSQL's sleep function. It then observes the closed connection disappear. All 27 observations refer only to the exact controlled connection; the observer confirms its own read-only setting and closes normally. The complete controlled process takes 1.698 seconds. Independent catalog checks find zero remaining database/session entries for its exact allocated name.

The observer has explicit limits of 16 connections per sample, 9,000 samples and 16 MiB of output. It rejects overflow rather than silently reporting complete coverage. Its 300-second deadline, bounded metadata queries and owned normal-close path keep the diagnostic finite. These are diagnostic bounds, not new limits on the game world.

Evidence remains private: `/private/tmp/ol-pf136-controlled-lifecycle-20261015-a.json` and `/private/tmp/ol-pf136-control-20261015-a.result.json`. Helper SHA `850b852dba769b893a18c3e832d18a7ccb8cbd429849c22c53db018c13d0e17e`. Additional and cumulative provider cost: **$0**.

## Selected actual-game observation

Before launch, select one 30-second older-world observation using the unchanged, qualified command-record/material-reading version. It restores the same complete saved world, original animal rules, finite resources and sixteen residents' real travel/work/food plans. All source, namespace, separate route-worker, asset, saved-input and exact owned cleanup guards remain. The original game watchdog stays at 300 seconds. The external observer runs within that owned lifecycle and closes separately; no CPU/allocation sampler, forced garbage collection or provider is enabled.

The launcher is reviewed before release. The review corrects one diagnostic issue before execution: even if observer verification fails, the parent must still independently check the game's exact allocated database, sessions, temporary directory and source guards. A failed observer cannot skip those checks. The completed observation is below; individual request categories still need timestamp matching before choosing a storage change.

[Project plan](../../projects/three-times-scene-performance.md#separate-database-work-from-delayed-application-replies) · [Plain-language gaps](bottlenecks.md)

## Actual game: data-file I/O is present during slow clicks

Both game and observer close normally; all source/input checks pass and the exact owned database/sessions/temp directory are absent. The observer records1,774samples across loading/play/closing, including589during the30.418-second measured phase. All five game connections are represented in every measured sample. Median spacing is55.3ms, maximum110.6ms; first/last measured endpoint gaps are39.1/27.5ms. No query, socket or observation error is reported. Metadata-query waits total2.789seconds during measurement, with maximum71.4ms; these are added observer waits, not its CPU. Its entire89.945-second lifecycle uses1.161CPU-seconds, including setup. This extra load means the2.663×game progress is diagnostic, not an improvement claim.

| Slow command | Snapshots during its wait | Snapshots with a PostgreSQL request active | Snapshots with an active data-file I/O wait |
| ------------ | ------------------------: | -----------------------------------------: | ------------------------------------------: |
| 1,024.0ms    |                        21 |                                         17 |                                          17 |
| 720.5ms      |                        12 |                                         10 |                                           3 |
| 583.8ms      |                        12 |                                          9 |                                           8 |

The longest click is therefore accompanied by actual PostgreSQL file reads/writes/extensions, not merely an already-finished reply awaiting application attention. Several observed requests remain in a file-read wait across multiple samples. This does not identify the particular statement or prove every delay has this cause. The second-longest click includes file-extension waits and time with no reported wait. No heavyweight-lock wait is observed. Six samples show I/O while writing PostgreSQL's durability log, and one shows its lightweight write lock; neither alone establishes a reason to weaken durable saving.

Across the complete phase,148snapshots show at least one active connection and408show all five idle;33show only one connection idle inside a transaction. Idle readers/probe connections must not be counted as proof the writer was idle. These are sampled states, not a sum of exact seconds or CPU percentages.

All29issued commands succeed, one busy offer is skipped, all sixteen residents accept at least two new plans,42plans/26produced-food checks pass and all17people/40animals survive. Command p95 remains720.5ms. No storage/SQL/maintenance error is observed through normal close. No browser or live model runs here. Raw report `/private/tmp/ol-pf136-aged-0-candidate-20261015-a.json`, observer/lifecycle companions and `/private/tmp/ol-pf136-activity-analysis-20261015-a.json` preserve the details. Additional/cumulative provider cost $0.

### Next diagnostic selected before edits

The existing slow-database-request list records category, duration and parameter count, but lacks absolute start/end timestamps. PF16.137 adds those two scalar timestamps to the existing largest30completed waits over100ms in one new private profiler copy (about5–12logic/type lines). Keep its exact threshold, ordering, category redaction and cap; do not claim a complete request timeline. Qualify formatting/TypeScript/six aliases/actual separate worker and full-source guards, then release one unchanged30-second older-world diagnostic with the already-qualified external observer and original300-second watchdog. Match backend request-start timestamps to contained application waits, retaining ambiguous/unmatched requests explicitly. No SQL body/value logging, database policy, mechanics, retry, provider or normal-game profiler change. This is to name the actual costly save categories before optimizing them.

## Timestamp matching names a specific slow operation

PF16.137's new443-file copy passes formatting/executable equivalence, TypeScript and actual six-alias/separate-worker checks. Its only change adds absolute start/end fields to existing slow-request entries; the full delta is reviewed. Both game and unchanged observer close normally with all guards and exact owned cleanup. The game remains below target at2.512×, command p95 is844ms and all29commands succeed. All sixteen residents continue,40plans/24produced-food checks pass and no storage/SQL/maintenance error is reported. This instrumented run is not a speed comparison.

The retained15completed waits over100ms can now be matched to backend request starts. Matching allows5msfor clock/dispatch alignment and keeps ambiguous or absent matches. The longest observed backend request has eight successive file-read observations and is uniquely contained by a **450.958ms** application request that clears the previous latest observation for four actor/place pairs. A second such update takes266.050ms for one pair, with five file-read observations. A245.773msread checking whether character evidence exists also has five file-read observations. Other unique matches include writing current character/action records and writing events with their private perspectives. This is a concrete category breakdown; it is not proof one category explains all waits.

The current source already limits the clearing update to rows marked latest. Its current place-list index additionally requires eligibility, while the clearing operation correctly covers latest rows regardless of eligibility. Removing that integrity requirement would change behavior. A new small index covering all latest place observations is a specific candidate; it is **not implemented or qualified yet**. Inspect the actual production query plan and rows/buffer reads before choosing it.

Raw report `/private/tmp/ol-pf136-pf137-aged-0-candidate-20261015-a.json`, normal-close/source/observer companions, `/private/tmp/ol-pf137-static-result-20261015-a.json` and `/private/tmp/ol-pf137-request-matches-20261015-a.json` retain the evidence. The raw prefix deliberately preserves the already-qualified observer's private path guard. Additional/cumulative provider cost $0.

### Latest-place query plan and index diagnostic selected

PF16.138 is selected before edits. In a new private copy, retarget the existing bounded captured-statement/rollback EXPLAIN helper to the exact latest-place clearing statement, preserving the actual statement and parameters privately. Retain the existing natural phase plan **before** manual statistics refresh, then its existing analyzed comparison; capture a third plan after creating one index over(world,actor,place)restricted only to latest=1. Existing indexes remain. Use the existing5-second rollback query limit, one separately bounded30-second index creation on the owned paused database, and original300-second game watchdog. About10–25profiler logic/type lines plus the static/owned launcher qualification already used. No canonical memory/index/SQL change, missing behavior, history loss, private disclosure or durability compromise. Query plans report actual rows/loops/buffers; cache warming and statistics changes prevent a simple before/after elapsed claim. Separately qualify any accepted index through actual game comparisons and relevant current-data memory checks.

PF16.138 source review, before any game release: a passes static/worker checks but its new index operation precedes the original report write, so a DDL failure could lose completed gameplay measurements. Preserve a unrun. Select b moving only the new index/third-plan work after the existing successful report write; its own plan sidecar and any later failure/exit remain separately visible. The natural/analyzed plans stay at their original helper boundary; no timing, index, behavior or watchdog relaxation. Reassess20–35diagnostic logic/type lines.
