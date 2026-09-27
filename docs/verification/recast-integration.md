# Recast and world-presentation integration evidence

## Scope

Completion was recovered from feature/spatial-world-3d at `f5e24e88872a4b6b03577c6a30dc2c28c1b403b5`, which already contained the initial interrupted Recast/Rapier/presentation changes. The playable pre-cutover snapshot was `11be9312`. This record distinguishes final working-tree observations from earlier research or automated fixtures. No unit/integration/browser test files were written or edited, and no automated test suites were run. No paid API calls were made in this completion; local runs used zero AI budget and no provider credentials. The $10 authorization was not needed.

Production TypeScript and Vite builds passed; the existing large client-bundle warning remains. The full repository check was not run or claimed green. Historical tests expecting synchronous lattice results or world creation before collision initialization need the explicitly recorded SR16–SR20 updates. Changes were reviewed for route/body/time authority and separately for worker lifetimes, interpolation, depth/reveal privacy and resource reuse.

## Calibration and native observations

Disposable scripts outside the repository invoked actual initialized Recast/Rapier and domain code, not fixture providers or a test runner. This is the implemented adapter, including semantic support projection and swept-body validation, not only an inner Detour microbenchmark. Initial 10 cm rasterization produced a partial route through an 80 cm passage that the physical person could fit; reducing only horizontal raster size to 8 cm restored the route. The person/hare passed, the larger body did not. A 1.25 m lintel rejected the person and admitted the hare. No body shrinking, blanket sqrt(2) radius inflation or loosened support-switch tolerance was adopted.

The final values are 8 cm horizontal / 5 cm vertical raster, 1 cm clearance skin, 20 cm maximum candidate height-reprojection window and separate 1.5 cm exact-support contact tolerance. None is mandatory position quantization. Returned routes in positive sampled cases passed every native segment predicate; that predicate is also used by execution, so this is not an independent proof for every possible collision shape.

The finite fixtures used the actual 28×24 seed-1086 map; large cases added 24 patches (27 authored supports), either stacked 2.5 m apart or at the same Y with slightly different X extents. Explicit wall fixtures tested detours and sealed regions. Cold values below are one build/query sample per fixture; warm medians/p95 are 64 sequential queries. They exclude world creation, database commits, networking, rendering and paid cognition. Do not compare these values to older reports on different hosts/configurations.

Host: Node v22.16.0, Linux; Model name: AMD EPYC 9V74 80-Core Processor.

| Workload                | Cold build + accepted query (ms) | Warm median / p95 (ms) | Outcome  |
| ----------------------- | -------------------------------: | ---------------------: | -------- |
| starter-ramp            |                            69.46 |          1.218 / 3.777 | reached  |
| starter-down            |                            41.78 |          2.268 / 3.519 | reached  |
| fractional-detour       |                            34.15 |          0.983 / 1.495 | reached  |
| narrow-person           |                            41.85 |          0.575 / 0.745 | reached  |
| narrow-hare             |                            33.24 |          0.220 / 0.422 | reached  |
| narrow-large            |                            37.10 |          0.014 / 0.048 | no-route |
| lintel-person           |                            31.59 |          0.014 / 0.046 | no-route |
| lintel-hare             |                            32.23 |          0.067 / 0.245 | reached  |
| 24-stacked-floors       |                          1708.13 |          1.491 / 2.214 | reached  |
| distinct-overlap-detour |                           199.65 |          4.806 / 5.698 | reached  |
| sealed-overlap          |                           194.12 |          0.046 / 0.076 | no-route |

## Worker and population stress

One actual worker prepared the stacked scene in 1733.6 ms (startup/build round trip 2035.4 ms), then handled 64 requests in four waves of 16. All returned reached. Queue/IPC-inclusive RTT median/p95 was 14.95/38.63 ms. The main process's 5 ms heartbeat had a maximum observed gap of 5.82 ms. This demonstrates off-thread construction, not instantaneous cancellation, unrestricted throughput or a 90% whole-game improvement. Reported process memory after loaded libraries/queries was approximately 256.6 MiB RSS; this includes more than the worker and is not standalone WASM memory or a long-session leak measurement.

With 514 total entities in the resources workload, thirty one-second native advances completed: first 95.75 ms, subsequent median/p95 6.66/8.10 ms. With 114 total entities in the birds workload, thirty one-second native advances completed: first 7.81 ms, subsequent median/p95 3.08/5.36 ms. The additions were 500 inert/resource objects or 100 native birds, not intelligent LLM agents or independent fair crowd actors. Geometry/body/route checking remains native; genuinely dense evidence fan-out is not eliminated.

A direct domain probe admitted a pending route and attempted 60 simulated seconds: time stayed at zero with `navigation-pending`. After actual preparation, the player followed physical ramp/deck support and completed within the 2 cm arrival tolerance. Visual interpolation observations on either side of the ramp foot stayed on the correct partial-height ramp rather than snapping to terrain. Shared policy/time and independent asymmetric-corner/long-session assertions remain TODOs, not automated qualification.

## Running application

The built production entrypoint ran on loopback port 3241 against fresh isolated `/mnt/data/recast-complete-live` SQLite storage. The ordinary page/state endpoints were served. Normal authenticated profile/presence/control/command requests saved nearby reveal with radius 8 and strength 0.9, moved onto the lookout deck, rejected `{x:24,y:3,z:6,surfaceId:terrain}`, then returned underneath to `{x:20,y:0,z:5}` and paused. Commands used the real server API, no direct save mutation. Early diagnostic requests used the wrong command field and an unsupported speed; they were rejected and the diagnostic was corrected, not the application validation bypassed. Presence ordering was likewise respected with a fresh client ID.

Local Chromium navigation was blocked by administrator policy, so no local browser success is claimed. Remote manual browser evidence, if obtained, is recorded separately below. Current graphics code compiled; compilation alone does not establish screenshot quality, frame rate, point-light load, soft-mask correctness or GPU resource retention. A clean application shutdown/restart retained the lower position/support and the reveal preferences, and reopened paused. Both local application processes were stopped after observation. No existing user save was touched.

## Deliberate boundaries

The current provider handles finite admitted mechanical shapes, not arbitrary mesh authoring or a universal physics sandbox. Rapier is shape-level static overlap/sweep, not full kinematic-controller sliding or dynamic crowd physics. Worker preparation currently rebuilds a whole revision, not just affected tiles. Ramps and existing bird corridors work; invented air graphs, ladders, dynamic doors/bridges and teleport itineraries remain owned extensions. Read-through redraws authorized target fragments; true per-occluder opacity manipulation and high-end normal/depth assets remain replaceable presentation improvements. EPR03 upstream acquisition privacy, D51 multi-view/viewport policy, sustained PostgreSQL/many-client/long-session and graphics-device qualification remain open in their canonical trackers.
