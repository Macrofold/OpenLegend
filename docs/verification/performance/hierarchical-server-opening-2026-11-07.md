# Hierarchical opening campaign — November 7, 2026

**All 27 timed observations are collected; all five revised safety configurations pass. Overall qualification remains incomplete because overhead, selected-path coverage and worker/CPU accounting do not fully qualify.** [PC07–PC10](../../maintainers/profiling-controls.md#hierarchical-server-measurements) own remaining qualification. Dates in this record use Mike's America/New_York timezone; machine artifacts retain their explicit UTC clocks.

## Scope and provenance

The authorized [opening plan](../../performance/simulation-inventory.md#initial-run-plan) contains 27 timed cases and five separate profiler-safety cases, with no population extension, renderer or live model calls. Three matched H0 repetition blocks may overlap; each retains one exact instance across discovery and detailed passes. H1/H2 can overlap later work, within five active campaign workers and one $100 allocation.

- Gameplay source: `2a17fa7c42f777c5eefd3fba67c652ef2c5f54ec`; ongoing runtime work in other checkouts is excluded from this frozen comparison.
- Frozen executable tooling source: `363e24841a40d9b05c72e21b4e01a0aed752c09f`. Report-only correction `6ec6a145c` uses measured-window progress for hardware comparisons instead of terminal world time; no timed executable changes.
- Maintained runner source: `0d9d2419a3a1951fdd268fc4fd4048d6a6f7efec`; retained placement and bounded deployment draining are deployed, including the deployed pending-command restart repair.
- Private campaign directory: `/Users/mzw/.codex/verification/OpenLegend/comprehensive-profiling-results/2026-11-07-hierarchical-opening-3812/campaign/`.
- Permanent archive: [version-pinned manifest](comprehensive-profiling-results/2026-11-07-hierarchical-opening-3812/manifest.json), [retrieval and retention](comprehensive-profiling-results/README.md). All source/input packages and failed attempts are preserved; the archive does not close qualification gaps.

The initial priced matrix reserved an estimated $27.622907 before its separate $10 collection/storage margin. This is a reservation estimate, not an invoice or measured expenditure. Current Linux on-demand compute quotes are H0 $0.2016/hour, H1 $0.4032/hour and H2 $0.372/hour; IPv4, storage and orchestration are additional. All attempts share the same allocation, `hierarchical-opening-3812`. No paid model calls or unit-suite execution are authorized or used.

## Completed observations and limits

The dominant measured work is accessing and protecting representations of game state and personal knowledge. It is not moving the player, copying network patches or decoding database results. Attention and persistence add substantial repeated work around a small number of current records. The measurements identify those priorities; they do not establish a precise speedup from removing them.

The standard opening has seven people, twenty animals, 74 other objects and one controlled character. Each 120-second measurement completes 48 move commands and advances approximately 7,200 game seconds. Models and rendering are absent. The driver starts its next move after the preceding route completes: about 0.4 commands per second, approximately 5.3 times lighter than the older 768-command/six-minute workload. That distinction matters when comparing command latency.

### Whole-process CPU and hardware

| Measurement                         | Standard H0 controls                                           |
| ----------------------------------- | -------------------------------------------------------------- |
| Main JavaScript thread              | 92.9–99.8 CPU seconds per 120-second window, or 0.77–0.83 core |
| All Node threads, including workers | 110.6–118.0 CPU seconds, or 0.92–0.98 core                     |
| Dedicated PostgreSQL                | 3.82–4.26 CPU seconds, about 0.03 core                         |
| External workload driver            | 0.76–0.92 CPU seconds; excluded from game totals               |
| Clock progress                      | Approximately normal speed in all three repetitions            |

Node already includes its workers: their CPU must not be added again. Approximately 17.7–18.2 CPU seconds in the controls are outside the main thread. The instrumented CPU runs leave a similar, somewhat larger gap. Missing retired-worker profiles prevent assigning it confidently to navigation, runtime compilation, background collection or other helper threads. Available checkpoint-worker profiles are almost entirely idle.

| Three-repeat result                         | Standard H0   | Larger H1     | Faster-core H2 |
| ------------------------------------------- | ------------- | ------------- | -------------- |
| Median Node CPU cores occupied              | 0.950         | 0.936         | 0.917          |
| Median of individual command p95 values, ms | 75.115        | 73.764        | 76.267         |
| Individual command p95 range, ms            | 61.480–79.270 | 72.887–99.803 | 75.640–78.505  |
| Median Node CPU seconds per game hour       | 57.072        | 56.128        | 54.914         |

All machine families maintain approximately normal clock speed in this workload. Overlapping ranges and three repetitions establish neither a causal hardware speedup nor population capacity. Adding cores/RAM did not demonstrate a solution to the repeated main-thread work. Across all cases, boundary Node RSS is approximately 1.14–1.49 GiB and used heap 243–823 MiB. These snapshots neither identify a leak nor measure allocation/retained memory by subsystem.

### Ranked main-thread instruction costs

These are disjoint source-ownership groups from the two usable CPU captures. They say where sampled instructions ran, not the complete causal cost of each gameplay feature. For example, a view's calls into immutable-state machinery appear in the first row rather than the view row. Percentages are shares of non-idle main-thread samples in instrumented runs, not exact fractions of the untouched control or the whole Node process.

| Rank | Source group                              | Sample share | What the computer is doing                                                                                                                                     |
| ---- | ----------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Immutable state/draft machinery           | 32.1–32.6%   | Reading through editable-state wrappers, resolving current values, copying unknown mutable records, proving reusable data immutable, and sealing publications. |
| 2    | Current sensory evidence                  | 22.0–22.3%   | Looking up an observer's received details, their source groups and their effective freshness.                                                                  |
| 3    | Attention and received spatial relations  | 6.9–7.1%     | Checking attention deadlines, assembling candidates, comparing descriptions and maintaining supported spatial cues.                                            |
| 4    | Garbage collection                        | 5.7–5.8%     | Reclaiming temporary objects; this is a consequence of allocation, not an additional game mechanic.                                                            |
| 5    | Save preparation/storage wrappers         | 5.3%         | Discovering changed records, obtaining encoded row bodies and preparing/merging accepted changes.                                                              |
| 6    | Native interval/action orchestration      | 4.7–4.8%     | Choosing and advancing native intervals/actions; its called sensing, state and event work is in other rows.                                                    |
| 7    | Player projection/access formatting       | About 3.5%   | Constructing a permitted player account and public references.                                                                                                 |
| 8    | Status/rule integration                   | 3.4–3.6%     | Applying/checking the installed world's conditions and rules.                                                                                                  |
| 9    | Entity/object/index access                | 2.8–2.9%     | Resolving objects and maintaining/accessing their indexes.                                                                                                     |
| 10   | Movement, motion and geometry source code | 2.1–2.3%     | Physical/spatial calculations on the main thread; excludes their shared helpers and unavailable worker CPU.                                                    |
| —    | Other helpers/runtime/unattributed        | About 11%    | Sensory scheduling, event/temporal helpers, identity/recognition, Node/V8, instruments and smaller sources.                                                    |

The remaining source groups together account for about 11%; no other identified group approaches the first two. The important additional unattributed CPU is outside that thread.

## Detailed workload and SQL diagnosis

All following direct timings are per 120-second observation, with ranges over the three repetitions. Synchronous active elapsed time is not OS-measured CPU: it can include collection, host descheduling and instrumentation. Parent/child scopes nest and must not be summed. Same-capture residuals include unselected work and probe overhead, not independently measured application CPU. All direct passes remain overhead-unqualified.

### State access and publication

The engine preserves stable earlier worlds while editing the next one. This protects readers, pending cognition and saving from later mutation. The expensive implementation work is repeated access through those representations and repeated proof/copy/finalization, not hundreds of thousands of complete world copies.

- The parent pass calls the immutable-value snapshot helper 387,624–400,442 times. Many calls return an existing immutable value or a primitive immediately. Its inclusive active time is 2.05–2.55 seconds.
- The transition-finalization owner is called 3,708–3,889 times, taking 6.00–6.92 seconds inclusive. That is about 31–32 finalization calls per real second, including private intermediate native transitions; it is not the count of installed server or player-visible publications.
- The CPU captures separately show expensive draft reads, proxy property access, recursive immutable copies and immutability checks throughout callers. The snapshot helper's direct duration alone does not capture this entire 32% group.

The optimization target suggested by the evidence is fewer repeated representation visits and less changing bookkeeping, rather than making the small publication wrapper faster. Garbage collection contributes another 5.7–5.8% of sampled main-thread work, but no allocation pass identifies exactly which subsystem created each reclaimed object.

### Perception: received facts versus repeated reads

An actor needs its own acquired account of a subject: what it received, what remains current and what has gone stale. Sharing physical source content must not share private knowledge. Source-content preparation is already reused cheaply; repeatedly reading the observer's account remains costly. The captured broad/detail sight defaults are 60/30 game seconds, roughly one/half a real second at the normal 60:1 clock. The millions of detail reads therefore must not be interpreted as millions of full sight acquisitions.

| Subcomponent                     | Work per observation                             | Instrumented active time        |
| -------------------------------- | ------------------------------------------------ | ------------------------------- |
| Current-detail lookup            | 4,772,254–4,976,587 calls                        | 6.63–8.00 s                     |
| Effective current-detail times   | Approximately 447,000 calls at the median        | About 2.28 s inclusive          |
| Reconcile visual evidence        | 1,808 calls                                      | 5.32 s at the median, inclusive |
| Shared visual source preparation | 3,108–3,506 calls; only 645–680 new preparations | 0.034–0.039 s                   |

The 4.8 million calls are not 4.8 million sightings, records or database writes. Each lookup resolves one permitted detail through the current contact's received groups and original acquisition. Deadline scheduling, attention, scene geometry, confirmation and player views all call this shared reader.

In the broad parent pass, encounter processing takes 21.5–24.9 seconds inclusive; its current-reception child takes 12.4–14.6 seconds. The exact observer-opportunity probe runs 1,680 times per repetition. These are nested parts of the same machinery. They demonstrate that repeated knowledge consumption/preparation, rather than constructing shared visual values, is the important target.

### Attention, descriptions and spatial relationships

Attention does not itself require model calls here. Native code selects supported candidates, maintains freshness and checks relationships in received geometry.

| Subcomponent                      | Work per observation                                                      | Interpretation                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Next attention deadline           | 317,230–359,971 checks; 2.61–2.97 million loop visits; 2.88–3.09 s active | Repeatedly searches existing annotation/latch state to find the next due work.                                                         |
| Description comparison            | 131,450–136,470 calls; only 109–142 meaning preparations                  | More than 99.89% reuse existing meaning, but each check first gathers current facets and checks reuse eligibility; 2.50–2.84 s active. |
| Candidate construction            | About 6,862 calls and 6.60 s active at the median                         | Prepares ranking views, including called current-evidence/description work.                                                            |
| Received-attention reconciliation | About 2,708 calls and 7.06 s active at the median                         | Includes temporal reconciliation and relationship work; overlaps other rows.                                                           |
| Broad relationship evaluation     | 2,700–2,756 opportunities; 4.23–4.80 s active                             | Evaluates spatial cues from the observer's supported scene.                                                                            |

Description formatting is mostly being reused successfully. The remaining problem is the cost of repeatedly establishing that it can be reused. Deadline queries likewise are not millions of genuine attention changes. Relation-scan and latch persistence adds a separate cost below: keeping a bounded attention output does not automatically bound the work leading to it.

### Player views and delivery

Each publication can prepare the player's permitted current view, compare it with the previous view and send the difference. The single client causes 1,988–2,153 view projections per parent observation: about 17 per real second.

- Full permitted projection takes 8.68–11.29 seconds inclusive per observation. Its pooled p95 is approximately 6.54 ms; the largest invocation is 95.13 ms.
- The broader current-view wrapper, including projection-lane waiting, totals 10.52–12.69 seconds in the detailed pass, with a 186.93 ms maximum. That is latency, not CPU, and overlaps projection work.
- Comparing the finished view to produce a patch takes only 0.46–0.55 seconds, with a 0.86 ms maximum.
- The immediate SSE stream-write helper totals about 0.04 seconds per observation; its largest call is 0.10 ms. JSON preparation outside that helper, actual socket draining, client receipt and browser rendering are not included.

The expensive part is preparing permitted views and their inputs, not comparing the final patch or handing bytes to the stream. These numbers do not measure input-to-visible-motion responsiveness.

### Physical actions, events and comparatively cheap paths

Actual position advancement is not a leading measured cost in this opening:

| Path                                   | Per-observation evidence                    | Limit                                                                                                                                     |
| -------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Movement along an existing path        | 14,534–14,755 calls; 0.237–0.343 s active   | Does not include all sensing/publication triggered by moving.                                                                             |
| Airborne motion/flight continuation    | 149,919–161,187 calls; 0.620–0.690 s active | Includes cheap no-flight/no-fall checks; not that many flights. Its own source accounts for only about 0.3–0.4% of main CPU samples here. |
| General action advancement             | 142,853–153,739 calls; 2.46–2.97 s active   | Function calls include opportunities that return without an active action.                                                                |
| World event recording/reception        | 182–196 events; 1.90–2.45 s active          | Includes downstream audience/evidence work; individual announcement categories were not isolated.                                         |
| Received temporal-batch flush          | About 2,020–2,032 calls; 0.32–0.44 s active | Includes empty returns, not that many new history pages.                                                                                  |
| Shared geometry batch main-thread work | About 0.004–0.005 s active                  | Only host-side work; not proof of negligible worker geometry cost.                                                                        |

Removing physical flight or accelerating coordinate updates would not address the largest measured main-thread costs. This does not establish that animals, navigation or geometry are universally cheap: worker coverage is incomplete and exact native response/feeding entrypoints have no positive observations in this workload.

### Saving: preparation, database work and write amplification

The live-acceptance owner is called approximately 2,400–2,600 times per parent observation; pending changes coalesce into 114 durable saves. Ordinary movement need not wait for each disk commit. Preparation still runs much more often than durable application.

- Changed-record preparation: 2,365–2,519 calls, taking 3.87–4.35 seconds inclusive.
- Encoding helper: 787,242–820,755 calls, taking 2.33–2.60 seconds. Includes cached/fast returns, not that many new JSON bodies or SQL rows.
- Pending-save merging: 0.72–0.82 seconds, nested within acceptance/preparation.
- Temporal-row materialization: 0.10–0.12 seconds. Current-contact content/metadata codecs total approximately 0.06/0.13 seconds respectively; history-preparation merging is only 4.5–7.3 ms. These specific codecs/merges are not major targets.

The three I07 SQL observations count each submission once under its causal owner. Cells show completed calls / accumulated client query latency, not database CPU or a contiguous stall. Concurrent queries can overlap.

| Owner                   | Repetition 1     | Repetition 2     | Repetition 3     |
| ----------------------- | ---------------- | ---------------- | ---------------- |
| Saving and derived work | 2,688 / 11.560 s | 2,750 / 9.563 s  | 2,772 / 11.464 s |
| Command receipts        | 95 / 0.918 s     | 96 / 0.416 s     | 96 / 0.745 s     |
| Retention preparation   | 160 / 0.440 s    | 164 / 0.287 s    | 132 / 0.318 s    |
| Authority checks        | 40 / 0.134 s     | 40 / 0.318 s     | 40 / 0.312 s     |
| Total                   | 2,983 / 13.051 s | 3,050 / 10.584 s | 3,040 / 12.838 s |

Saving accounts for 88.6–90.4% of query latency. [Causal owner mapping](../../../scripts/performance/profiling-registry.ts) connects these accounts to saving, command recovery, retention and authentication/publication fences.

Grouped canonical/history writes already combine many mutations: 714–733 submissions taking 3.48–4.10 seconds through `SqlWriteBatch.flush`. Recall-source insertion and lexical-index admission add 103–112 calls/0.54–0.69 seconds; received-value ownership reconciliation adds 113–115 calls/0.30–0.48 seconds. Transaction BEGIN plus timeout setup costs 1.23–1.57 seconds and COMMIT 1.00–1.26 seconds across each entire observation. Total submitted SQL statements are 3,269/3,347/3,340: one grouped CTE can contain many writes but remains one statement.

Save-lane queue waits total 2.96–4.08 seconds across 286–300 operations; holds total 10.31–12.65 seconds. Those operations include derived work and are not the 113–115 world-head advances. Queue, transaction and query intervals overlap and must not be added. SQL result row parsing totals only 9.6–11.2 ms. PostgreSQL uses 3.31–3.75 CPU seconds in these SQL passes, versus 10.58–13.05 seconds of accumulated client query latency.

### What is being repeatedly prepared for storage

In I07, the canonical encoder prepares 46,297–48,223 row images and 78.532–81.145 MiB across 45 tables. These include repeated updates to existing records, not that many new memories or confirmed durable effects, and omit some history/derived write paths.

| Record family and purpose                                                                 | Prepared rows | Encoded MiB |
| ----------------------------------------------------------------------------------------- | ------------- | ----------- |
| Current contacts: each observer's acquired current account of subjects                    | 3,843–4,206   | 21.84–23.42 |
| Attention relationship latches: retain supported cues without repeatedly rearming them    | 4,087–4,205   | 12.40–12.83 |
| Relation-scan cursors: remember partial scan progress without inventing a negative result | 12,775–12,959 | 8.89–9.02   |
| Temporal pages: batches of personally received chronology                                 | 573–582       | 8.01–8.10   |
| Native work invocations: execution usage/reservations                                     | 5,876–5,980   | 6.31–6.42   |
| Attention state: current focus and selection progress                                     | 601–607       | 4.74–4.79   |
| Received geometry: personally supported scene evidence                                    | 601–607       | 2.55–2.58   |
| Recognition: observer-specific identity knowledge                                         | 618–777       | 2.07–2.26   |

Current contacts, relationship latches and relation scans alone contribute 54.9–55.8% of prepared bytes. This is principally current bookkeeping, not accumulated autobiography. About 150 live relation-scan rows receive roughly 12,800–13,000 prepared writes; 52 live native-work rows receive roughly 5,900–6,000 updates. Current-contact storage contains only approximately 230–238 live rows at the end. Content and confirmation metadata already have separate codec/cache paths; the figures do not establish that every contact update rewrites all acquired content.

Temporal pages do genuinely accumulate: approximately 180–185 live rows become 772–778 in the SQL observations, with 578–582 recorded inserts and 3.23–3.50 MiB of allocated table/index growth. In untouched controls, total allocated database table/index space grows 19.3–23.3 MB over two minutes. Its largest increases are temporal pages (4.3–4.7 MB), shared received values (2.9–4.1 MB), personal history perspectives (2.1–3.2 MB) and value-use references (1.9–2.5 MB).

Prepared bytes, wire bytes, WAL and allocated storage describe different boundaries; they must not be added into one amplification total. Relation space includes indexes and possible dead tuples, not just live information. Dead-row estimates do not establish exact cleanup debt or reclaimable disk.

### Background work and SQL attribution limits

Physical shared-value cleanup runs 60–65 times, taking only 2.15–2.99 ms active JavaScript but 1.31–1.51 seconds elapsed. Received-value ownership reconciliation similarly takes only 13.6–16.5 ms active JavaScript in the detailed pass, versus 0.66–1.02 seconds elapsed. Their waiting is real, but neither direct helper is a large CPU consumer. Ordinary background account/support retention does run and has the SQL counts above, but no independently timed complete breakdown. The unexercised parent retention probe belongs to the complete-retention restore path. Explicit recall/cognition and checkpoint capture are not selected; these gaps are not zero-cost results.

All SQL submissions settle with zero recorded failures, censored or unresolved calls. Fingerprint overflow preserves totals while losing identity for 38.5–38.8% of calls and 31.6–35.1% of query latency. Grouped statements additionally hide per-table query cost. Unsupported parameter encoding affects 378/379/368 calls. `pg_stat_statements` is unavailable in all cases, so backend execution/buffer/WAL cost cannot be assigned to individual queries. Returned check rows do not count affected canonical records.

## Command latency and its limits

The one-second command delay is not reproduced. The pooled 144 untouched H0 command samples have these nearest-rank quantiles:

| Command HTTP request to parsed reply | Measured latency |
| ------------------------------------ | ---------------- |
| Median                               | 44.950 ms        |
| p95                                  | 75.115 ms        |
| p99                                  | 103.376 ms       |
| Maximum                              | 111.995 ms       |

Across all 1,296 measured commands, the maximum is 154.422 ms. Including warmup does not produce a one-second command either; the maximum there is 173.836 ms. With only 48 samples per individual run, its p99 is its maximum, not a reliable rare-tail estimate. The 2.3–2.7 seconds taken to finish a movement are physical route travel, not command acknowledgment latency.

The actual ordinary movement path is:

1. The synthetic client sends a fresh command ID over loopback HTTP.
2. The server decodes the request and checks the account, active connection and control grant.
3. The receipt reader checks whether the command was already committed. Fresh IDs miss; current references/place preparation also occur.
4. The command enters the single world-writer queue, then authoritative mechanics/permission checks start the move.
5. Changed state/history/receipt data is accepted into pending saves and the HTTP response returns. The scheduled disk commit can finish later.
6. Native ticks advance the route; player-view projection and SSE delivery happen separately. The driver waits for route completion before starting another command.

Receipt-reader queue waits total only 1.03–1.31 ms across 48 operations per SQL repetition, about 0.02–0.03 ms each. Reader holds average 7.5–14.1 ms per operation, including SQL/transport/JavaScript waiting. That read lane is not exhibiting the long queue waits seen in the earlier investigation.

The selected native command-transition span has pooled median 19.55 ms, p95 24.82 ms and maximum 33.22 ms. Native ticks have p95 66.47 ms and maximum 310.89 ms; native generator active intervals reach 201.44 ms. Large indivisible operations can exceed cooperative yield targets and create responsiveness pressure on the main thread. These are separate instrumented spans, not exact uninterrupted stalls or correlated steps of the slowest command.

The campaign does **not** capture per-command world-writer queue time or a server event-loop-delay histogram. The existing optional detailed command callback is not supplied by this harness. It therefore cannot assign every millisecond of the HTTP tail to queueing, native work, preparation and acknowledgment. Subtracting aggregate percentiles would invent that attribution. Mixed SQL-lane waits reach 447.65 ms, but those include background writers; they are not established command delays.

No browser input-to-visible-motion measurement ran. The client counts stream bytes/chunks without timing the first rendered movement, and the immediate SSE helper does not time socket drain/client receipt. The short, lighter campaign neither reproduces nor invalidates the older one-second/busy-workload result.

## Source-confirmed navigation duplication

The frozen [navigation worker](../../../apps/server/src/navigation/worker.ts) handles `message.requests` in its ordinary-map branch and then handles the same array again in an unconditional block. Each block calls the route planner for every request; the second overwrites results and `queryMs`. This is definite duplicated computation and a timing-account defect, not a measured estimate of its total cost.

Its frequency and CPU impact in this opening remain unknown. Six retired navigation-worker captures are absent per instrumented observation, and the surviving worker profiles cover only the end of the window. The coordinator's 20-second timer is a failure deadline, not an idle-retirement policy; the exact causes of the six exits were not retained. The missing non-main CPU cannot all be assigned to this bug. [PF10](../../maintainers/performance.md#pf10--workers-and-movement-prediction) tracks the correction and focused verification.

## Interpretation and remaining measurement gaps

Instrumentation itself changes observed work: history-event inserts are 649/870/562 in controls versus 181/168/167 with parent probes; personal-history perspective inserts are 1,610/2,412/2,086 versus 611/616/609. Same completed player commands and clock progress do not establish the same animal/history/representation work. Lower instrumented CPU is therefore not an optimization or a clean low-overhead result. All six comparisons remain unqualified.

Ninety unique navigation captures are missing across fifteen I03–I07 observations. Eighteen additional I04 CPU-account rows repeat those omissions. Together with one rejected main profile containing a −1 microsecond Inspector interval, this produces 109 report rows, not 109 independent failures. I02-r1 also lacks the before-window PostgreSQL CPU counter. Missing quantities remain unknown rather than zero; no favorable timing reruns replace them.

Nine selected definitions have intact captures explicitly reporting zero eligible invocations: bulk current-change receipt, the current-facet time projection helper, inventory/action-catalogue projection, observed assemblies, source-version preparation and the exact parent animal-response, feeding and restore-retention entrypoints. Other individual receipt, persistence, ownership and animal paths do run. These nine positive-coverage obligations remain unmet; they are not lost raw captures or proof that entire gameplay systems cost nothing.

The evidence ranks repeated state/knowledge access first, attention/description/deadline preparation next, and persistence/view construction after that. It supports investigating work generation and caller reuse before faster scalar loops, SQL decoding, patch comparison or removal of physical movement features. The navigation duplicate is a separate confirmed defect whose benefit must be measured rather than guessed. No runtime changes or additional cloud experiments are part of this analysis.

## Initial safety qualification

The three checksum-verified `run-9/` replays (`e7e2d152-154a-4ec0-a571-fd624150efe0`) pass their individual assertions and have the identical full canonical hash `f878c46f5318b2159b25b3d584b6ed5597e4d995d500284bed22e71fcf1852f5`. Raw requests and exact native binding witnesses are retained. A separate one-worker `run-8/` diagnostic passed before the three-way retry; it does not replace a required configuration.

| H0 repetition | Registered worker | Verified instance     |
| ------------- | ----------------- | --------------------- |
| 1             | `slot-3`          | `i-01c1771a7b2f462c3` |
| 2             | `slot-5`          | `i-06ddac8d9577b80d0` |
| 3             | `slot-6`          | `i-0f43b8e59b2dc21c0` |

All 27 timed observations and five accepted safety configurations are collected and checksummed. The H0 instances above were pinned through the detailed stage. H1/H2 use the same explicit 2,048 MiB Node setting and effective 2,348,810,240-byte heap limit observed on H0.

## Detailed-stage safety

The original 26-probe I05 safety replay matches the initial canonical hash. The original 27-probe I06 passes its individual privacy, correction, cancellation and restoration assertions but fails full context equivalence: a supplied request offers 27 remembered sources instead of 25, with different actually witnessed animal observations. Native final cuts and effects match; that does not excuse changed cognition inputs.

Two separate non-timing checks isolate the selected probes. The nine state-read/snapshot probes reproduce the differing canonical hash `5af982bb2c20230f7c8b435e36c09a3931a11cc9a1f1972977e7bc4504c20b0d`; the eighteen save/view preparation probes match `f878c46f5318b2159b25b3d584b6ed5597e4d995d500284bed22e71fcf1852f5`. Their artifacts remain under `run-9/diagnostics/i06-isolation-state/` and `i06-isolation-output/`. The unsafe state probes were excluded before detailed timed dispatch. The original frozen stage and failed proof remain preserved under `ownership/stage-attempts/8a5d16fbbf0807bbd4d75794e25d169ceab1daadd9680db4842da3634cf43290/`. Replacement stage `a47cf814898c773cd334fd235f31ec58edafc53f1539493375f66deabea0e0d1` retains I05 and the eighteen safe I06 probes. Both detailed replays (`1d7fca42-9439-45e2-87a8-997e3371fe1c`) match the initial hash; the complete five-configuration proof passes all nine checks (`eb25bb267a6ca17a9a5573ba0857ff9c15a14387575f95c0949e7506005bd647`). Its nine detailed timed observations completed on the original pinned H0 instances. The precise scheduling mechanism behind the context change is not established.

## Preparation and failed attempts

These failures occurred before timed game profiling and cannot establish game speed, CPU cost or command latency.

The preceding [offline-only manifest](/Users/mzw/.codex/verification/OpenLegend/experiments/2026-11-08-hierarchical-server-opening-3812-review-2/plan.json), tooling `dd8e4a70541297f2cb6edfa1ecd2f3c62fa7f9fa`, executed no cases. Its serial-batch deadline envelopes were replaced by the parallel repack; those allowances were never measured runtimes.

| Attempt                                                                                                            | Evidence and outcome                                                                                                                                                                                                                                 | Correction                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deployment admission                                                                                               | The queue's KEYS_ONLY index omitted the campaign-ID attribute expected by the preservation guard. A later attempt met another task's deployment lease and refused.                                                                                   | Compare the projected primary key; retain atomic deployment ownership. No other task was cancelled.                                                                                                  |
| Initial safety campaign `ae5a28e4-d202-4e3c-ba6a-e4748856bb6b`, tooling `fb537f86230fc7ce9a72da9e2ef63172b5fb0b21` | Control and disabled cases failed configuration before world creation because the owned database URL had not yet been supplied. The selected case failed `unresolved-operation-is-censored` in the recorder check. All three remain failed evidence. | Create the owned database before validating configuration. Wait for the recorder's actual drain barrier; re-arm an early host timer until its monotonic deadline. Preserve the censorship assertion. |
| Initial placement                                                                                                  | A concurrent task occupied a warm slot, so bootstrap used slots 3, 4 and 5; slot 5 was a temporary host that could not survive the adaptive stage.                                                                                                   | Require retained-slot placement before admission instead of discovering unusable pins after execution.                                                                                               |

The initial safety artifacts are collected and checksummed under `run/ownership/collected/h0-safety-initial/`; the managed cache points to that same payload tree without duplicating it. The retry uses a new frozen source family under `run-2/`. Campaign `ea9a045d-1cce-410f-b00f-375f03f34297` then reached native replay on all three retained slots, but each failed because the harness acquired a different tab’s control from the implicit native fixture caller. Its checksummed artifacts remain under `run-2/ownership/collected/h0-safety-initial/`. The safety harness now acquires the fixture’s own local connection; authority, presence and gameplay rules are unchanged. In `run-3/` (`231fc455-9ea5-4a3c-b859-ef271c9df0cc`), control and selected replay then reached the correction assertion. The fixture had changed domain memory directly, omitting the server owner’s database-source fencing; it now calls the real correction/forgetting operations while retaining strict stale/no-effect assertions. The remaining older job was delayed before execution by SSM. `run-4/` (`f3ff2377-ce1a-4f49-b6ea-f02807258182`) then proved the real operation refused an unprivileged fixture (`forbidden`). The non-timing fixture now provisions creator inspection through normal startup before editing NPC memory; timed player configuration and NPC disclosure remain unchanged. All three `run-5/` replays (`ac5686bf-011c-4216-ae4d-c361e49ac06a`) pass their individual assertions. Their raw canonical hashes differ because process-local HMAC handles vary, and three exposure IDs include a publication-sequence difference despite identical received facts. The witness checks under `run-6/`–`run-8/` isolated capture errors, resolved original selected conversation entries through the scoped memory reader, and covered older temporal subjects/participants. Arbitrary identifiers and sequence fields are not discarded. These are non-timing fixture/tooling outcomes, not speed results.

Static verification also corrected typed harness/database boundaries and iterator signatures. Repository type checking now passes. A separately observed worker startup failure exposed a raw EC2 `Date` in a DynamoDB witness; the shared hardware owner now projects JSON-safe fields before persistence. That other task's startup attempt is not this campaign's performance evidence.

## Resource ownership and next boundary

The existing stopped quarantine on slot 1 is preserved with its ownership, financial uncertainty and collected reports. Live deployment proved its stopped/terminal-command state before admitting maintenance. One newer owned worker stopped while its SSM delivery remained pending. That obsolete replay was cancelled and recovered through the managed owner. The dispatch repair rechecks registered power only for the same pending delivery, preserving command ID, claim and deadline. It never resends a launch or restarts work already in progress.

Temporary cache retention was operational; game rules and the pool's capacity of 100 were unchanged. The pool is restored from eight warm slots to its prior two. This task's six extra instances (slots 3–8) are physically terminated and their registry rows are empty, after exact last-run/task ownership, clean completion and acknowledged local manifest verification. Slot 1 remains stopped with its pre-existing volume; unrelated slot 2 was untouched.

All planned observations, collection and owned cleanup are complete. The managed allocation records $16.847316 charged and $0 reserved against the single $100 ceiling; these are conservative orchestration estimates, including failed qualification attempts and funded artifact/storage allowances, not an AWS invoice. Retained local/S3 evidence and the pre-existing stopped quarantine remain; no owned profiling host is left running. Additional and cumulative Jev/provider cost is $0.

## Verification and remaining qualification

Repository type checking, changed-file formatting, whitespace and affected local-link review pass. The complete five-configuration safety proof passes. No unit suite, live model call, browser/rendering campaign or population extension ran. All earlier startup/fixture failures remain preserved separately from the 27 successful timed observations.

PC08–PC10 remain open for the nine unexercised selected definitions, retired-worker export/retirement causes, the invalid Inspector interval, missing PostgreSQL boundary counter, unsafe state probes and all six unqualified overhead comparisons. These are genuine qualification gaps, not unfinished execution of this finite matrix. There is no capacity, clean overhead or complete CPU-attribution pass. No game/runtime optimization follows from this campaign authorization.
