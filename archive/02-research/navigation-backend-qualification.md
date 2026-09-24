# Navigation backend qualification archive

This is the earlier isolated executable comparison supplied in the conversation. Its benchmark configurations and conclusions are historical evidence, not current production defaults. The chosen implementation is governed by [the runtime contract](../07-technical-architecture/spatial-world-runtime.md); [current integration evidence](../../docs/verification/recast-integration.md) supersedes statements below that no backend has been installed. Raw scripts/results remain in the conversation qualification packet; they are not automated tests added to the game.

## Archived report

### Decision summary

**Recommendation: use Recast/Detour as the primary candidate for the next integration, behind a server-owned adapter and a persistent, bounded worker service. Keep navcat as the alternative, not the current default recommendation. Do not switch the playable engine in this research change.**

Measured generation throughput and the mature upstream ecosystem outweigh navcat's more convenient JavaScript extension points for the current requirements. Both candidates offer the baseline floor navigation capabilities. Neither is a drop-in replacement for the current exact support and upright-box collision contracts. Rapier remains a narrow collision capability candidate, not a demonstrated whole-engine performance upgrade.

These are actual exploratory runtime results, not documentation-only research. They are also not production acceptance or automated invariant-suite evidence. No unit/integration/browser test suite was run, no production dependency was added, no world save was touched and no model/provider call was made.

## Provenance and experimental method

- Source: `Macrofold/OpenLegend` at `11be9312dd560b8fcae5016acb1fc6ddf6216d86`, the spatial feature branch. Source at research commit `4e590c24ae539c12da466e50ece7b8b1587314a3` differs only in isolated export/CI configuration.
- Libraries installed outside the game: `recast-navigation@0.43.1`, `navcat@0.4.1`, `@dimforge/rapier3d-compat@0.20.0`. The isolated npm lockfile is included.
- Runtime: Node 22.16.0, Intel Xeon Platinum 8573C container exposing five logical CPUs and approximately 6.24 GB memory. This is not the hardware used in earlier spatial review reports.
- All final benchmark series were run sequentially. Early exploratory overlapping executions were replaced and are not the reported benchmark files.
- Source-native setup, Recast generation and navcat generation receive the same authoritative map; both navmesh engines receive the same generated triangle arrays. Geometry construction uses existing ground/water cells, slab/ramp surfaces and solid blockers, never billboard artwork.
- Common generation settings: horizontal cells 0.10 m, vertical cells 0.05 m, radius rounded upward to voxels, height rounded upward, slope from the body profile, 3-voxel climb, region thresholds zero, contour simplification 0.8 and matched detail sampling. These are qualification settings, not proposed production defaults. Settings and triangle conversion are included for reproducibility.
- Each main case has three fresh-map builds/first queries and 100 warmed queries after ten warmups on the last mesh. Two small warmup builds precede the series. Full details, sample counts, maxima, route points and flags are in JSON. Three samples do not qualify build-time percentiles.
- Build timing excludes input triangle conversion. `buildAndFirstQueryMs` includes it. Native graph preparation occurs during its first query. WASM/module initialization is separate: measured Recast initialization was about 44.5 ms; Rapier about 77.7 ms in their recorded processes.
- The starter map is the actual 28-by-24 map with its lookout and ramp. The larger cases add 24 patches, for 27 authored surfaces, plus derived native rock supports. Distinct stack layers start at y=8 and are 2.5 m apart. Overlap patches differ slightly in minimum X, share y=8, and have either a finite detour wall or a completely closing wall. These are not the same fixtures used in past reviews.
- The APIs and route representations differ: polygon routes can be shorter than cardinal lattice routes. Compare capability and total work, not identical graph expansions. Most timings are sub-millisecond and noisy. There is no GPU, network, DB, LLM, full-game FPS or overall-latency claim.

## Matched native timing results

All values are milliseconds. `partial` is not arrival and must never be accepted as reaching the requested destination.

| Fixture | Recast build | navcat build | Recast warm query | navcat warm query | Current native first query | Current native warm query | Recast / navcat status |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| starter-ramp | 22.92 | 250.74 | 0.0250 | 0.1337 | 10.062 | 0.6170 | reached / reached |
| starter-underpass | 25.17 | 207.48 | 0.0213 | 0.0761 | 0.508 | 0.0442 | reached / reached |
| stacked-floors | 1595.64 | 5514.26 | 0.0338 | 0.0438 | 8.573 | 0.5077 | reached / reached |
| overlap-detour | 124.11 | 416.94 | 0.0184 | 0.0147 | 480.280 | 3.8378 | reached / reached |
| overlap-unreachable | 135.10 | 440.82 | 0.0171 | 0.0119 | 484.803 | 0.8008 | partial / partial |
| narrow-person | 10.38 | 36.47 | 0.0165 | 0.0733 | 0.190 | 0.0150 | reached / reached |
| narrow-hare | 9.97 | 46.23 | 0.0251 | 0.0252 | 0.158 | 0.0148 | reached / reached |
| narrow-large | 8.18 | 34.73 | 0.0166 | 0.0149 | 4.717 | 0.1855 | partial / partial |
| low-ceiling-person | 7.94 | 34.46 | 0.0160 | 0.0094 | 3.167 | 0.0779 | partial / partial |
| low-ceiling-hare | 9.28 | 36.63 | 0.0214 | 0.0388 | 0.119 | 0.0103 | reached / reached |

Recast generation was materially faster in this fixture family. Query speed was not a universal win: navcat slightly led the already tiny warm detour/negative query cases. The current native direct-route fast path also remains competitive. Retain an exact direct-movement fast path when safe instead of forcing every unobstructed step through a navmesh.

Neither library removes expensive preparation. Recast's single-mesh stacked generation took roughly 1.6 seconds and navcat's 5.5 seconds even though their warm queries were tiny. Geometry should be prepared once per revision/profile, and eventually rebuilt at affected tiles, not on each movement request. Dynamic actor motion must not trigger structural mesh generation.

## Executed capability checks and limits

### Floor identity and surface following

Both libraries separately routed at the same horizontal coordinates on the ground and the y=3 lookout. Following the ramp corridor in at most 10 cm increments, using `moveAlongSurface` plus surface-height lookup rather than only interpolating the straight-path corners, reached the destination in both. Recast produced 196 samples and navcat 198, with no unmatched physical stance in those sampled ramp runs. Observed support sequence was terrain, ramp, deck.

**Integration blocker: navmesh height is approximate.** The flat surfaces were approximately 5 cm above their true planes; maximum measured ramp height correction was about 7.5 cm for Recast and 10 cm for navcat, greater than OpenLegend's 1.5 cm support tolerance. Project results back to the exact intended mechanical support with bounded correction/provenance; do not globally loosen physical support checks or choose any nearby floor. The probe's nearest-height mapping is diagnostic only, not a production semantic-support binding.

The initial lower climb settings fragmented the ramp for one or both generators. Three voxels allowed both to route it. This is a rasterization qualification finding, not permission for actors to acquire a 15 cm step ability. Voxel build tolerance and physical movement rules must be reconciled explicitly.

### Body size, ceilings and corner clearance

Both engines passed a person and a hare through the 0.8 m passage and rejected a 0.55 m-radius body. The person could not traverse the 1.25 m-high lintel, while the hare could.

**Integration blocker: generated mesh clearance and our square-footprint physics differ.** Sampling projected paths every 5 cm found four unsupported/invalid physical stances in the overlap-detour case and seven in the angled-corner case for each library, despite raw route status `reached`. These are failed drop-in physical qualification cases, not valid game trajectories.

A follow-up used planning radius `physicalRadius * sqrt(2)`. It eliminated the sampled overlap-wall conflicts but still left two angled-corner conflicts, and it incorrectly removed the otherwise usable person-width passage. Blindly enlarging every radius is therefore not an accepted solution. Shape agreement, contour/voxel error bounds and final swept-body clearance must be solved together. A cylindrical/capsule movement contract may align better with conventional navigation, but changing the existing physical shape is a real behavior change. No such change was made here.

Samples do not prove clearance over entire arbitrary curves. The probes only checked selected stances and same-support short sweeps; general exact support-transition segmentation, high-speed body sweeps, interacting actors and dynamic topology remain integration work.

### Partial paths and special traversal

Both APIs returned partial paths for blocked destinations. The adapters checked final corridor/reference and status flags instead of trusting `success`. A bounded output path or exhausted node pool likewise must not be treated as arrival.

Across a water gap, each library used a supplied bidirectional off-mesh link. Per-query exclusion of its permission flag prevented crossing; disabling/removing it prevented crossing; restoring it restored the route. Recast used flags and a link present at mesh construction. navcat used dynamic global link addition/removal and a JavaScript filter. This qualifies the sampled simple permission class, not arbitrary per-object/key predicates at scale.

Teleport execution itself does not require a walking route or a navmesh connection. It needs destination authority, occupancy and action-condition checks. Represent a teleport in route planning only when an agent should compare mixed walk/teleport itineraries. Cheap long-distance links require appropriate cost/heuristic logic in that planner; they are not a reason to make every walking query more complicated.

### Geometry replacement, tiles and restoration

For each engine, an open route became partial after adding a full structural wall and rebuilding a candidate mesh, then became reachable after the wall was removed and a new mesh built.

Each tiled probe removed the three tiles of one entire crossing column. The route became partial. Re-adding the saved tile data restored it, and references from the removed tiles were invalid both after removal and after re-addition. This verifies salt/reference invalidation in this case, not incremental production generation of newly invented topology. Tile removal/re-add is not the same as measuring an affected-tile rebuild under load.

An exported/imported Recast mesh and JSON-round-tripped navcat mesh recovered the sampled route. Those are derived-data serialization probes, not OpenLegend save integration. Semantic support IDs, world/load/geometry epochs and active action progress must remain OpenLegend-owned; raw polygon references cannot become permanent entity identities.

### Scheduling, cancellation and memory lifecycle

An isolated persistent Node worker built the stacked scene and served 256 route requests in waves of 64. Both returned reachable routes. The main thread's 5 ms heartbeat continued: its largest observed gap was about 11.3 ms with Recast and 19.3 ms with navcat. First-build worker times were about 2.79 and 9.76 seconds, respectively; the worker was not prewarmed like the main timing series, so do not merge those tables.

Median round-trip time including queue/IPC was about 3.47 ms for Recast and 6.44 ms for navcat; p95 about 10.87 and 29.52 ms. This is 256 requests on one static scene, not a production latency distribution or multi-world qualification. Queueing is a real cost even when raw search is tiny.

Changing the caller's epoch discarded all 16 already-queued old-epoch responses; a request for an unprepared epoch received `stale`. This is an implemented guard in the exploratory worker harness, not installed application logic. Synchronous WASM work was not interrupted. Bounded queues, cancellation semantics, per-world fairness and candidate publication are still required in the production adapter.

navcat also completed a winding-maze route through 25 slices of at most four iterations, 98 iterations total. Largest recorded slice was about 0.29 ms. Its sliced API works in the pinned version. The inspected Recast JavaScript query/raw binding lacks exposed sliced functions; the worker approach avoids requiring a fork merely to protect host responsiveness. It does not make native execution preemptible or reduce total CPU work.

Thirty create/query/dispose cycles per engine did not show continually increasing post-GC JS heap in the sampled checkpoints. Recast WASM capacity stabilized at 64 MiB in this process; capacity is allocator high-water memory, not evidence of a leak. Both libraries were loaded in the lifecycle process, so RSS values are not standalone engine comparisons. This short exercise does not qualify long-session/native allocation stability. Never create a WASM instance or world per actor; bound worker count and retained geometry.

## Rapier findings

Rapier 0.20.0 was exercised independently of navigation. It detected a bird-size sweep crossing a slab underside, contact while descending onto the top, an occupied body volume, and no body overlap at the same XZ but far above it. It also ran 180 kinematic updates per step; the recorded median combined update/step cost was about 0.175 ms and p95 about 0.412 ms over 100 samples. These are extra pipeline costs, not an apples-to-apples comparison with native bird control.

10,000 simple prepared ray calls showed that Rapier was not universally faster. With one blocker, median native ordered-ray time was about 0.00181 ms and Rapier nearest-ray time 0.00189 ms. With 128 blockers, native ordered-ray was about 0.00423 ms and Rapier nearest-ray 0.00119 ms. The native API returns ordered intersections, while Rapier's operation here returned only the nearest hit; these figures cannot establish full visibility or audibility speedup. Acoustic entry/exit transmission requires additional query work.

**Integration blocker: broad-phase freshness.** A newly created collider was absent from the world ray query before the first step. A collider moved to a different Z position was absent from a ray aimed at its new position until the world was stepped; propagating body positions alone did not refresh that broad-phase result. The adapter must explicitly own query synchronization at publication/update boundaries. Never let a stale query silently imply free space. Shape-level queries may be preferable for the first narrow integration because they accept explicit transforms and do not require the world-query index, but spatial acceleration and cost must then be handled deliberately.

No rigid-body dynamics integration, native save adapter, crowd physics or lighting behavior was installed. Rapier does not compute lighting or provide the walking navmesh.

## Required production guards before adoption

1. One authoritative OpenLegend geometry/motion owner. Render meshes, collider handles and polygon refs remain derived data. No model output can define executable callbacks.
2. Agreement among body shape, clearance, slope, step behavior, navmesh sampling error and final swept movement. Reject unsafe candidate segments; do not emit false arrival or spin indefinitely on an unusable corridor.
3. Exact support provenance at endpoints, ramp transitions and stacked floors. Do not permit navmesh box tops to become usable supports merely because generated triangles are horizontal.
4. Cache navigation by geometry revision and bounded body profiles. Prepare structural changes off the request path; update affected tiles where qualified. Ordinary actor movement, camera movement and cosmetic art changes do not rebuild static navigation.
5. Bounded persistent workers, queues and retained candidates. Fence work by world/load/geometry/profile/policy epoch; distinguish rejected stale work from proven unreachable destinations. Do not publish partial or node/output-limited paths as success.
6. Synchronize collision query structures before use. Candidate edits cannot mutate the committed collision scene; apply/rebuild safely and dispose replaced native objects on owner-controlled lifecycles.
7. Keep senses and acoustics on physical geometry, not navmesh rays. Keep player reveal settings presentation-only and restricted to already-authorized observations.
8. Preserve a validated exact direct-move fast path. Navmesh guidance does not replace special action execution, teleport validation, landing checks or higher-level prerequisite planning.

## What is and is not decided

The measurements justify selecting **Recast/Detour as the lead integration candidate**. They do not justify claiming it is already production-ready, increasing current world limits, or declaring navcat unsupported. navcat retains real advantages for arbitrary JavaScript query predicates, sliced searches and dynamically edited special links. If those become dominant, revisit it with the same qualification criteria rather than vendor preference.

The outstanding practical integration gates are physical shape/support reconciliation, qualified affected-tile generation, long-session native-resource behavior, application save/load and candidate publication, dynamic crowds/landing, and full rendering/perception/persistence workloads. Library generation and sampling parameters need deliberate tuning before shipping. No new feature or performance claim is marked implemented in the playable branch by this report.

## Lighting conclusion (source assessment, not a GPU qualification)

PlayCanvas supports the relevant dynamic light, shadow, normal-map and post-processing building blocks. The screenshot's warm local illumination, bright leaf-facing patches, grounded shadows and dark atmosphere are feasible effects, not grounds for replacing the renderer. Matching commercial-game polish is an art/material/performance target, not an automatic engine capability guarantee.

Ordinary world sprites should have a lit fallback. The current scene explicitly makes many cards unlit/emissive, so they bypass those lights. A plain image can receive brightness/color falloff immediately, but the renderer only knows its plane normal; it cannot infer the tree's leaf/trunk volume or hidden back. Backface lighting is not the same as translucent backlighting or a volumetric object. Use a shared stylized sprite shader with conservative virtual shape normals and optional leaf transmission, then real normal/depth maps or low-poly geometry where quality matters. Keep shadow proxies and normals independent of camera orbit; they are presentation geometry, not new collision bodies. Lighting and reveal visual acceptance still requires a browser/GPU art pass and was not benchmarked here.

Primary sources: [Recast upstream](https://github.com/recastnavigation/recastnavigation), [Recast JavaScript](https://github.com/isaac-mason/recast-navigation-js), [navcat](https://github.com/isaac-mason/navcat), [Rapier scene queries](https://rapier.rs/docs/user_guides/javascript/scene_queries/), [PlayCanvas physical materials](https://developer.playcanvas.com/user-manual/graphics/physical-rendering/physical-materials/), [PlayCanvas StandardMaterial](https://api.playcanvas.com/engine/classes/StandardMaterial.html), [Octopath developer interview](https://www.unrealengine.com/spotlights/octopath-traveler-s-hd-2d-art-style-and-story-make-for-a-jrpg-dream-come-true). Package-specific runtime findings above are measured from the pinned installed code, not inferred from these links.
