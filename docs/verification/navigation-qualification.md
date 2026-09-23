# Isolated navigation and collision qualification

This is a companion evidence record to [Verification](../verification.md). [Research interpretation and adoption guards](../../archive/02-research/navigation-backend-qualification.md) own this experiment's recommendation. No production backend has been switched.

## Scope and method

The executable probes used the actual OpenLegend map/body/native geometry functions at `11be9312dd560b8fcae5016acb1fc6ddf6216d86`, with libraries installed in an isolated directory: `recast-navigation@0.43.1`, `navcat@0.4.1`, and `@dimforge/rapier3d-compat@0.20.0`. The game's package manifests and lockfile remain unchanged. Node 22.16.0 ran on an Intel Xeon Platinum 8573C container exposing five logical CPUs and approximately 6.24 GB memory. This is not the host used in previous performance reports.

The main benchmark used three fresh-map builds/first queries per case, followed by 100 warmed queries after ten warmups on the last mesh. Two small warmup builds preceded each engine's timed series. Final runs were sequential. Earlier overlapping exploratory runs were replaced and are excluded. Identical triangle input was constructed from physical ground/water cells, slabs/ramps and blockers, never sprite cards. Native graph preparation occurs inside the first query. Navmesh build timings exclude triangle conversion; an additional raw build-plus-first-query field includes it.

Common settings were 0.10 m horizontal cells, 0.05 m vertical cells, upward-rounded radius/height, body-derived slope, three-voxel climb, zero region thresholds and matched detail/contour settings. These are experimental settings, not production defaults. Recast initialization took approximately 44.5 ms in its recorded benchmark process. The actual 28-by-24 starter map was used, plus 24 extra patches for 27 authored surfaces in the large cases. Separate floors are 2.5 m apart from y=8 upward; overlapping patches share y=8 but have slightly different minimum X. A wall either requires a detour or seals the route. This is not a prior review's 31-surface/120-blocker fixture.

No automated test files were written and no unit/integration/browser suites were run. Disposable scripts invoked the real APIs and printed output, timings and selected invariant observations. No game save or paid provider was used. Full scripts, lockfile and raw JSON were supplied in the conversation's qualification packet. Three build samples do not establish percentile capacity; query medians exclude networking, persistence, GPU and paid cognition.

## Matched measurements

Milliseconds, medians. The query columns are warmed requests, not mesh generation. `partial` is not arrival. Native and polygon routes differ, so their graph expansions/path lengths are not identical work.

| Fixture | Recast build | navcat build | Recast warm query | navcat warm query | Current native first query | Current native warm query |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Actual starter ramp | 22.92 | 250.74 | 0.0250 | 0.1337 | 10.062 | 0.6170 |
| Actual underpass | 25.17 | 207.48 | 0.0213 | 0.0761 | 0.508 | 0.0442 |
| Distinct stacked floors | 1595.64 | 5514.26 | 0.0338 | 0.0438 | 8.573 | 0.5077 |
| Overlapping-floor detour | 124.11 | 416.94 | 0.0184 | 0.0147 | 480.280 | 3.8378 |
| Sealed overlapping-floor route | 135.10 | 440.82 | 0.0171 | 0.0119 | 484.803 | 0.8008 |
| Narrow passage, person | 10.38 | 36.47 | 0.0165 | 0.0733 | 0.190 | 0.0150 |
| Narrow passage, hare | 9.97 | 46.23 | 0.0251 | 0.0252 | 0.158 | 0.0148 |
| Narrow passage, large body | 8.18 | 34.73 | 0.0166 | 0.0149 | 4.717 | 0.1855 |
| Low ceiling, person | 7.94 | 34.46 | 0.0160 | 0.0094 | 3.167 | 0.0779 |
| Low ceiling, hare | 9.28 | 36.63 | 0.0214 | 0.0388 | 0.119 | 0.0103 |

Both navmesh engines reached the expected nominal destinations in positive cases and returned partial paths for sealed/size-blocked cases. This does not imply all positive routes are physically executable: corner-clearance failures below are material. Recast generation was faster in this family; warmed query performance was not universally better. Simple exact native direct routes remain competitive. The seconds-long stacked generation must not occur inside an interactive movement request.

## Floor, ramp and clearance observations

Both engines separated the ground from the deck at the same XZ. Following the ramp in increments of at most 10 cm with `moveAlongSurface` and height lookup reached the deck in 196 Recast samples and 198 navcat samples, with zero unmatched physical stance in those sampled runs. Support sequence was terrain, ramp, deck.

Raw flat navmesh height was approximately 5 cm above the physical plane. Maximum observed ramp correction was approximately 7.5 cm for Recast and 10 cm for navcat, above the engine's 1.5 cm support tolerance. The experimental nearest-height mapping is not a complete semantic-support adapter. Production requires exact support provenance/reprojection and explicit seams, not relaxed collision tolerance or unrestricted nearest-polygon snapping. Lower voxel-climb settings fragmented the ramp for one or both generators; three voxels allowed both to route. Rasterization connectivity does not grant a new physical stepping ability.

Both allowed the person and hare through a 0.8 m gap while rejecting the 0.55 m-radius body. Both rejected the person below a 1.25 m lintel while allowing the hare.

**Failed drop-in corner qualification:** sampled every 5 cm, both engines produced four positions rejected by the native square-footprint stance rule around the overlap detour and seven around an angled obstacle. Simply increasing planning radius by sqrt(2) eliminated the sampled overlap conflicts but left two angled-corner conflicts and incorrectly closed the person-width passage. This is not an accepted fix. Body-shape agreement, contour/rasterization error and final swept movement remain gates before adoption. A raw `reached` result is not movement authority. Same-support sampled sweeps and point checks do not prove general support transitions or arbitrary continuous paths safe.

## Updates, permissions and serialization

For each library, adding a full wall and rebuilding changed an open route to partial; removing it and rebuilding restored the route. This proves a selected candidate rebuild, not affected-tile production performance.

A separate tiled exercise removed three tiles comprising an entire crossing column. The route became partial. Re-adding saved tile data restored it; old references remained invalid after both removal and re-addition. Existing corridors therefore must not survive topology changes without validation. Recast export/import and navcat JSON serialization restored the sampled route; neither was integrated with OpenLegend save/load.

A supplied bidirectional special link crossed a water gap in each engine. A per-query permission filter prevented crossing; disabling/removing the link prevented crossing; restoring it restored the route. Recast used flags and a constructed off-mesh connection; navcat used its JavaScript filter and dynamic global link API. This is one permission class, not broad custom-rule qualification. Special traversal must still be executed as its native action, never interpolated as walking across water.

## Scheduling and retention

A persistent Node worker prepared the stacked scene and served 256 requests in four waves of 64. Both returned reachable routes. The main thread's 5 ms heartbeat continued; maximum observed gaps were 11.3 ms (Recast) and 19.3 ms (navcat). Worker first builds took about 2.79 and 9.76 seconds; those workers were not prewarmed like the benchmark processes.

Including queueing and IPC, request median/p95 was approximately 3.47/10.87 ms for Recast and 6.44/29.52 ms for navcat. An epoch change discarded all 16 already-queued old-epoch replies, and a request for an unprepared epoch returned stale. The exploratory harness implements these guards; the game does not yet. Synchronous computation was not preempted. This small batch does not qualify fairness, many-client behavior or multi-world latency.

navcat's sliced API also completed a winding-maze route in 25 slices of at most four iterations, 98 iterations total; maximum observed slice was approximately 0.29 ms. Current Recast JS query bindings do not expose the C++ sliced API. The worker experiment demonstrates a practical alternative without assuming instant cancellation.

Thirty build/query/dispose cycles per engine did not show continuously growing post-GC JS heap across the recorded checkpoints. Recast WASM capacity stabilized at 64 MiB in the shared lifecycle process. This is allocator capacity, not a leak diagnosis, and both libraries were loaded, so RSS is not a standalone engine comparison. Long-session native-memory stability remains unqualified. Bound instances/workers; never create one per actor.

## Rapier observations

Rapier 0.20.0 initialization took about 77.7 ms. It detected a bird-size swept body approaching the underside and top of a slab, correctly found an occupied body volume and did not report overlap far above it at the same XZ. Updating 180 kinematic bodies and stepping had median/p95 approximately 0.175/0.412 ms over 100 samples. These are extra synchronization/pipeline costs, not a like-for-like native bird-control comparison.

For 10,000 prepared rays with one blocker, native ordered-ray median was approximately 0.00181 ms and Rapier nearest-ray 0.00189 ms. At 128 blockers, they were approximately 0.00423 and 0.00119 ms. Operations differ: native returns complete ordered crossings, whereas this Rapier query returns only the nearest hit. These numbers establish neither a universal win nor full sensory/acoustic performance.

**Failed stale-query case:** a newly created collider was absent from world ray queries before an initial step. Moving the collider onto a different Z-aligned ray left it absent there until stepping; propagating modified positions alone did not refresh broad-phase visibility. A production adapter must explicitly synchronize query structures before use. A stale result must not mean free space. Shape-level queries avoid this specific world-index dependency but need deliberate acceleration and cost measurement.

No autonomous rigid-body dynamics, crowd physics, save adapter, full acoustic transmission replacement or lighting integration was installed. Browser/GPU, production epochs/persistence, many-world fairness and long-session qualification remain open. The research branch restores normal CI configuration and removes its temporary export workflow; its final documentation commit skips test execution only for this request.
