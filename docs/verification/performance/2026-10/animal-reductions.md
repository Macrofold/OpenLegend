# Animal calculation reductions — October 23, 2026

This campaign implements the eighteen authorized optimization ideas; it does not
complete the parent first-playable acceptance. One AI continues on
`codex/implement-complete-first-playable` in the existing checkout. Source starts
at `4e58e6e4f`; `e002781b5` supplies the first combined batch and `5f257b419` the
second. No branch switch, merge or main-checkout edit occurred.

## Implementation of all eighteen ideas

The earlier twenty-animal attribution identified future sensory predictions
(25.35% of native CPU samples), current noticing (17.91%), advancing actions
(15.14%) and snapshot finalization (8.29%). These are overlapping sampled
categories, not independent full-operation timings. Mike reopened the incomplete
idea dispositions: performance takes priority over code size. The continuation
implements the remaining mechanisms in the existing owners rather than claiming
that pre-existing partial coverage completes them.

| Idea                                                 | Implemented behavior                                                                                                                                                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Sample routine sight                              | Installed cadence bounds routine noticing and removes its future visibility/danger-clearance predictions; exact contact, chosen watch/reach, event-time checks and unsampled senses remain.                                                             |
| 2. Batch local animal calculations                   | Native sources share profile selection and candidate preparation; single-route admission avoids redundant previews.                                                                                                                                     |
| 3. Recalculate changed pairs                         | Stationary observers retain unchanged people; non-occluding object changes no longer trigger human-pair recalculation. Moving observers reuse exact pairs and geometry proofs where valid.                                                              |
| 4. Share movement facts                              | Body sweeps share preparation across waypoints; unchanged status/attribute/forecast definitions reuse existing reads.                                                                                                                                   |
| 5. Reduce snapshots and allocations                  | Pure native movement uses ordinary admission inside its owned draft; unrelated forecasts survive local moves, while coupled/unknown effects keep conservative rebuilding.                                                                               |
| 6. Reuse deadlines and status preparation            | Existing supported local changes retain prepared interval/status inputs and their original deadlines; current ordered effects and renewal remain authoritative.                                                                                         |
| 7. Update body indexes for physical changes          | Meter/behavior edits refresh the current record without removing/reinserting unchanged physical bounds.                                                                                                                                                 |
| 8. Separate static route and moving-body checks      | Validated static corridors prove exact collinear subsegments. Terrain and current occupancy still undergo their required checks.                                                                                                                        |
| 9. Reuse visibility across open regions              | Endpoint cells share a conservative empty-region proof; uncertain rays use exact geometry.                                                                                                                                                              |
| 10. Reject outside a vision cone                     | Installed senses can specify an angle. Native sensing, future crossings and the public guide share facing and cone checks. Main remains 360°; its benchmark gains no angular pruning.                                                                   |
| 11. Skip distant cells until range entry is possible | Fixed spatial cells retain conservative observer-speed deadlines; target membership stays live, so a target entering another cell is considered there. No all-world entity-pair scan or table.                                                          |
| 12. Reuse blockers and occluded regions              | Pair readers try their previous blocker first. A convex solid can certify complete occlusion between endpoint cells. Geometry changes invalidate both.                                                                                                  |
| 13. Share repeated SQL reads                         | Recent-job and actor/month/ceiling usage requests share unchanged reads. Write/transaction fences invalidate them; real spending admission reads current durable accounting.                                                                            |
| 14. Reuse views across revisions                     | Geometric visible-identity membership survives unrelated record changes, then resolves current records and disclosure within the existing scoped view cache.                                                                                            |
| 15. Expand navigation preparation                    | Up to six real grounded profiles warm one at a time behind queued work. Compatible mixed-body requests share the existing bounded dispatch and exact result fences.                                                                                     |
| 16. Batch/offload geometry                           | Only unresolved sight rays leave the existing spatial owner. Two bounded workers share immutable map preparation; exact local fallback handles small batches, failure and synchronous callers.                                                          |
| 17. Use a coarse escape fallback                     | Failed full legs probe six descending useful prefixes and stop on success; physical feasibility and the agreed escape thresholds remain strict.                                                                                                         |
| 18. Bound work fairly                                | Private sight preparation rotates through eight candidates per observer, yields after 128 visits and batches at most 128 unresolved rays. Ordered evidence application waits for all required answers; no recipient cap or deferred game-time evidence. |

`905425190`, `8282cc9ae`, `d43159a12` and the reviewed corrections extend the
initial `e002781b5` / `5f257b419` work. Geometry workers own calculation only:
no world snapshot, actor knowledge, movement/decision authority, saved cache
schema or second mutation queue. Worker lifecycle and cache bounds are in
[NW18](../../../limits/native-work.md#nw18--derived-spatial-and-read-reuse).
No idea remains excluded merely for presumed complexity or small benefit.

The optional cadence belongs to installed senses; absent cadence retains exact
crossing behavior. The bundled sampling tradeoff is owned by
[base-world time](../../../worlds/base/time.md#spatial-fidelity).

## Short complete-server measurements

Fresh ordinary Main/wilderness worlds, world seed 1086, diagnostic seed 73,
scattered added deer, every added deer initially frightened by controlled actual
contact. The ordinary opening also contains twenty native animals; table counts
are **added animals**, not total population. Same 30-real-second window at normal
1× only, commands every 500 ms, actual HTTP/SSE and disposable PostgreSQL. No
sequential faster-speed period, CPU sampler or optional application counters.
Earlier records remain valid comparisons with their original source and host
limits; these are evolving worlds, not matched fixed-state microbenchmarks.

| Source          | Added animals | Game seconds advanced | Real seconds | Fraction of normal speed |   Command p95 / maximum (ms) | Still escaping/settling at end |
| --------------- | ------------: | --------------------: | -----------: | -----------------------: | ---------------------------: | -----------------------------: |
| Before campaign |            10 |               1796.17 |       30.029 |                    99.7% | See retained original report |                              0 |
| Before campaign |            20 |                340.59 |       30.033 |                    18.9% | See retained original report |                             20 |
| Before campaign |            50 |                 69.88 |       30.029 |                     3.9% | See retained original report |                             50 |
| Batch 1         |            10 |               1799.99 |       30.032 |                    99.9% |                113.8 / 240.8 |                              0 |
| Batch 1         |            20 |                865.23 |       30.039 |                    48.0% |                 95.6 / 183.2 |                              0 |
| Batch 1         |            50 |                147.00 |       30.032 |                     8.2% |                183.2 / 667.6 |                             50 |
| Batch 2         |            10 |               1798.71 |       30.042 |                    99.8% |                132.9 / 220.1 |                              0 |
| Batch 2         |            20 |                744.00 |       30.097 |                    41.2% |                111.7 / 562.1 |                              0 |
| Batch 2         |            50 |                152.35 |       30.029 |                     8.5% |                159.9 / 400.1 |                             50 |

Every run retained all added animals alive, completed sixty successful commands,
and reported zero client or storage errors. Batch 2’s post-collection main-isolate
heap is 105.6–110.1 MiB; process RSS, including workers, is 587.9–687.1 MiB.
These are end samples, not peak or long-session memory guarantees. Total measured
server-process CPU was 35.1–36.8 seconds per thirty-second wall window, including
its workers. Node 22.23.2, Apple M1 Pro, ten logical CPUs, PostgreSQL 14.17,
loopback storage with fsync and synchronous commits enabled. The ten-CPU host
was heavily contended: final load averages were about 40–47, versus about 25–32
in batch 1. Neither the twenty-animal variation nor the small second-batch change
isolates that batch’s CPU benefit. Its implementation remains small and removes
known redundant copies; there is no justified zero-impact/bloat reversion.

Fifty animals remain far below normal speed. Per Mike’s instruction, **100/200/500
were not run**. This does not establish population capacity or the parent’s
native-speed/whole-game performance gates. No new gameplay duration, speed,
accuracy, danger distance, health rule or hearing recipient limit was selected
to improve the result. Routine sight’s explicit sampling tradeoff is separate.

## Completion measurements and limitations

The full implementation was measured on fresh worlds with the same settings.
Successful runs on `abd09819e` (plus safe failure-location reporting) give:

| Added animals | Game seconds advanced | Real seconds | Fraction of normal speed | Command p95 / maximum (ms) | Still escaping/settling at end |
| ------------- | --------------------: | -----------: | -----------------------: | -------------------------: | -----------------------------: |
| 10            |               1797.87 |       30.036 |                    99.8% |              168.2 / 563.2 |                              0 |
| 20            |                813.00 |       30.026 |                    45.1% |              111.5 / 563.6 |                              0 |
| 50            |                147.00 |       30.036 |                     8.2% |              150.4 / 287.6 |                             50 |

All three retained their added animals alive and completed sixty successful
commands with no client, storage or geometry-worker failures. Exact report files
are `qualified-final-10-server.json`, `qualified-final-20-server.json` and
`exception-50-server.json` (the last was a diagnostic rerun after an earlier
exception). Post-collection main-isolate heaps were 116.8/111.2/113.3 MiB; process
RSS was 584.4/791.7/616.1 MiB, respectively. Exact RSS remains in raw
reports. CPU was 35.7/37.4/35.6 seconds per thirty-second wall window, including
workers. End load averages were approximately 38/40/44 on ten logical CPUs.
These noisy evolving-world runs do not isolate the benefit of individual changes.
Ten added animals finish their escape and normal timekeeping catches up; fifty
remain in their active work at the end. Neither is a capacity promise.

The first complete pass (`8282cc9ae`) reached 99.9%/44.2%/7.7% for 10/20/50.
Review then removed redundant worker dispatch that ignored existing pair proofs:
50-animal offloaded rays fell from 33,756 to 18,609 in successful runs. This is
measured work reduction, not an isolated speedup. No low-impact/complexity
reversion was selected from noisy wall-time comparisons alone.

Failures are retained. Under much heavier contention (load about 81), `final-20`
paused with a generic persistence message; no safe cause was captured then.
`qualified-final-50` also paused, and new health reporting identified a
**simulation-tick TypeError**, not a demonstrated disk/database failure. Safe
bounded file/line capture and separate operation labels now preserve future
causes without private error messages. Its immediate repeat completed successfully. A separate bounded 50-animal
interleaving diagnostic with commands every 100 ms also completed without the
exception (279 successful commands); it is not an equal-load capacity comparison.
Requested review then reproduced a simulation TypeError at game second 42 through
the actual native/navigation consumer: an animal stopping its old escape to wait
for another route left the old action in a reused movement forecast. Every native
decision outcome now reconciles its changes before returning, including waiting
and no-action outcomes. Action completion also records its behavior change even
when it emits no outward event. The identical failing scenario subsequently
completed 180 updates and 252 game seconds without an exception. Failed paused
runs remain retained and are not capacity measurements. The separate `qualified-20` rerun completed
at 24.6%, showing substantial variance. Disk had roughly 64 GiB free; no disk-full
or PostgreSQL error was established. No unrelated process was stopped.

After requested review, source `4aa46e807` completed one final matched short
10/20/50 batch (`review-{count}-server.json`):

| Added animals | Game seconds advanced | Real seconds | Fraction of normal speed | Command p95 / maximum (ms) |
| ------------- | --------------------: | -----------: | -----------------------: | -------------------------: |
| 10            |               1799.90 |       30.035 |                    99.9% |               95.5 / 310.3 |
| 20            |                890.87 |       30.037 |                    49.4% |               95.3 / 226.9 |
| 50            |                142.26 |       30.028 |                     7.9% |              157.1 / 240.7 |

Each completed sixty successful commands, with all added animals alive and no
client, storage, simulation or worker failures. Ten and twenty finished their
escape; all fifty remained alarmed. CPU was 37.4/37.9/36.2 seconds; final host load
was 32.4/35.6/36.9 on ten logical CPUs. Worker batches/rays were 0/0, 25/881 and
451/17,570. End RSS was 587.5/755.1/701.0 MiB. These runs omitted `--expose-gc`, so
their 447.1/471.6/359.9 MiB end heaps are **uncollected**, not retained-memory
measurements. The earlier post-collection evidence above remains separate. These
noisy evolving-world comparisons do not isolate a speedup from the review fixes.

Fifty remains slow, so the instructed final condition for **100/200/500 was not
met**. Larger runs were not repeated. Sampling is the only selected fidelity
change; no weapon, danger distance, health, hearing recipient or action-duration
rule was changed for performance.

## Current 20-added-animal diagnosis — October 23, 19:14 EDT

Runtime source is `39c71a733`; this diagnosis adds only opt-in CPU capture to the
existing driver and guarded diagnostic counters, not a gameplay correction.
All three fresh runs use the same seed, 20 added frightened deer (**40 total
animals**), ordinary opening, real PostgreSQL/HTTP/SSE, 30 seconds, 1× and
500 ms command offers. Each completes sixty successful commands without client,
storage, simulation or worker errors; the added deer finish their escape.

| Capture                            | Game seconds | Fraction of normal speed | Command p95 / maximum (ms) |
| ---------------------------------- | -----------: | -----------------------: | -------------------------: |
| CPU samples + application counters |       750.00 |                    41.6% |              104.1 / 132.4 |
| No optional instrumentation        |       866.37 |                    48.1% |              109.3 / 351.1 |
| Boundary counters, no CPU samples  |       900.00 |                    49.9% |               90.0 / 120.8 |

The CPU capture excludes world bootstrap, retained-heap collection and teardown;
it includes load-client startup and the measured loop. Percentages below use
23,392 non-idle main-isolate samples and exclusive categories. They exclude worker
CPU. Host scheduling and sampling overhead limit exact CPU-time inference.

| Operation                                                   | Non-idle sampling share |
| ----------------------------------------------------------- | ----------------------: |
| Recording what characters notice                            |                   18.2% |
| Other native-loop work, including pending-navigation checks |                   17.2% |
| Moving and advancing actions                                |                   11.1% |
| Bodily condition checks and rate integration                |                   11.1% |
| Complete timing/rate forecasts                              |                    8.2% |
| Finalizing world snapshots                                  |                    7.5% |
| Animal decisions and route preparation                      |                    2.4% |
| Player views                                                |                    5.6% |
| Garbage collection                                          |                    4.4% |
| Other server work                                           |                   14.3% |

Together, native simulation is 75.7%. A separate cross-cutting view finds **25.6%**
in the editable-state library itself; that overlaps the operations above and must
not be added to them. In the sampled loop, 1,040 motion slices cause 917 complete
forecasts and 947 publications. Counters record 670,276 status-rule checks,
2.32 million spatial candidates and 233,631 generator resumptions. Most work is
repeated population bookkeeping, rather than one expensive escape search.

The targeted repeat distinguishes boundary reasons in priority order: an expired
forecast first, then movement consequences, other events and state changes.
**886/925 (95.8%)** have an elapsed forecast deadline; the remaining first matches
are 24 movement consequences, two events and thirteen state changes. It rebuilds
998 forecasts for 1,149 motion slices, with only eight local refinements. This
classifies shared interval endings, not which particular animal/status deadline
selected the earliest time; that finer split remains unmeasured. The result
identifies broad forecast expiry as the first correction to pursue: retain
unaffected participants' timing/status results after a local deadline, while
refreshing actual changed dependencies and preserving exact effects and saves.
Reduce editable-record reads and unnecessary publications alongside that work.
The server currently offers only one shared interval per editable transition;
batching compatible private intervals before publication is a concrete candidate
for reducing the remaining snapshot work, subject to existing command/yield bounds.
Those runtime corrections remain open under PF09; no gameplay rule was relaxed.

Timed server spans support the CPU ranking: native work occupies 26.15 seconds
of the sampled 30.04-second window. Route-worker queries total 0.142 seconds and
sight-batch preparation 0.287 seconds; warm-up mesh work is outside this window.
Navigation publication totals 4.48 seconds including admission/waiting, so that
is not route-search CPU. SQL statement spans total 4.08 seconds and overlap other
work; they cannot be added to native time. Main-isolate retained heaps after two
requested collections are 122.8/116.5/110.5 MiB; RSS is 744.8/722.4/662.1 MiB.
End host loads are 30.2/26.2/39.7 on ten logical CPUs; there was about 59 GiB free
disk space. These are contended-host diagnostics, not quiet-host capacity or a
leak/memory-pressure diagnosis. No larger population was run.

Raw files are `reprofile-20-{sampled,unsampled,boundaries}-server.json`, the sampled
report's `.cpuprofile`, and `reprofile-20-cpu-analysis.json` in the private campaign
directory below. The driver reuses the existing inspector mechanism and retains
clock brackets; disabled capture does no CPU-profile preparation. Current static
checks cover the small diagnostic change; prior runtime correctness evidence is
reused because gameplay execution is unchanged.

## Correctness, review and remaining evidence

- Current TypeScript and the existing focused spatial/perception/kernel/storage/
  HTTP checks passed after their connected implementation batches: 41 tests in
  five files, then 31 affected native tests after sight-preparation reuse.
- 2,400 current-map sight rays agreed with uncached geometry. Static corridor
  subsets agreed with an independent map preparation; an actual wall revision
  invalidated both route and sight proofs. Existing earlier 1,200-ray and opaque/
  transparent/removal checks remain valid for unchanged predicates.
- A real two-worker 128-ray batch matched exact local evaluation with no worker
  failures. Closing both pending workers preserved all 128 exact answers through
  local fallback; repeated closure and subsequent closed-pool calls also passed.
  Spatial-cell entry/movement/teleport checks retained conservative
  candidates. Narrow/wide cone crossings and facing matched 1,600 current sight
  checks after correcting the heading convention. The first disposable cone
  setup omitted collision-runtime initialization; correcting setup, without a
  product edit, exercised it. No new maintained tests were added.
- Five frightened animals advanced three game seconds, then both warm and
  JSON/current-format-restored worlds advanced six more through real navigation.
  Complete canonical worlds and events matched exactly. The new cone mechanism
  does not alter the default 360° run.
- The consolidated `pnpm check` passed guidance/assets/configuration, repository
  formatting, TypeScript, all **834 tests in 58 files** (557.01 seconds), and the
  production build. Final cache corrections also passed the eight existing store
  tests and current TypeScript. Existing guidance-size advisories, PlayCanvas
  browser-external warnings and the client bundle-size warning remain nonfatal.
- Actual PostgreSQL reads proved one shared concurrent recent-job query, detached
  returned objects, transaction-local reads and job/accounting rollback invalidation.
  The first disposable scenario tried an independent writer while retaining the
  repository's read barrier and hit its existing admission deadline; the corrected
  scenario checks snapshot-local reads without that fixture deadlock.
- The existing elevated-world browser journey passed in installed Chrome
  (**46.8 seconds**): real movement/navigation, raised support, surface picking,
  camera controls and screenshots, with no page errors or paid requests. The
  screenshot was visually inspected with the player correctly on the raised deck.
  Initial browser attempts lacked the pinned Chromium executable and then physics
  initialization before fixture construction. Reusing installed Chrome and fixing
  the shared world-fixture initialization resolved those setup failures. No new
  maintained tests or assertion weakening. Narrow cones have native/math evidence;
  this browser journey uses the unchanged 360° opening.
- Review covered mutation/commit order, current geometry/body result fences,
  disclosure, cache ownership/invalidation, worker closure/fallback and current-
  format continuation. Corrections include exact facing, future cone crossings,
  bounded cached-candidate checkpoints, unused region-reference retention and
  rollback invalidation. Requested review additionally fixed the reproduced stale
  movement forecast, bounded regional preparation before collecting a whole
  neighborhood, and deduplicated identical rays. A dense 100-obstacle scene gave
  128 exact ray/probe/worker answers from 256 submitted rays, with no worker
  failure; removing the obstacles invalidated the previous blocker correctly.
  The existing four focused native/spatial files pass all 38 tests. Broader
  first-playable acceptance remains separate.
- Final reviewed source passes `pnpm check`: 834 tests in 58 files (543.37 seconds),
  TypeScript, repository checks and production build. The 50-animal checkpoint at
  game second 42 also validates as current-format data and continues to second 48
  with exactly matching complete worlds and 15 emitted events, warm versus restored.
  Unchanged SQL isolation/rollback and installed-Chrome evidence above is reused.

No paid model/provider calls were made in this campaign: additional Jev cost $0.
Earlier task estimates remain $0.557258 Jev plus $0.2464543 other providers,
with $6.418352 uncertain commitments; conservative exposure $7.2220643 against
the newly authorized $50 task ceiling. These estimates are not settled charges.
The task-owned PostgreSQL server was stopped after verification; its retained
data and all failed reports were preserved. No borrowed runtime was stopped.
Raw scenarios, reports and logs are outside Git under
`/Users/mzw/.codex/visualizations/2026/10/18/01a14d83-1897-7b01-82f1-8dd103f505c2/first-playable-verification/optimization-20261023`.

[FPV](../../../maintainers/first-playable-validation.md),
[CTR](../../../maintainers/combat-and-threat-responses.md) and
[PF09](../../../maintainers/performance.md#pf09--population-work-follows-relevance)
retain whole-game performance, combined qualification, independent
character/invention and real-participant evidence. Ada's unchanged 0/12
counterattack gate remains explicitly open; no personality or prompt experiment
was repeated. These outstanding acceptance obligations are not relabeled as
future enhancements.
