# Mixed spatial and camera-facing review

## Scope and implementation

The review continues from `78f423892c9a1067b8afd4b1a6eb8ccbce5bf60d` on `feature/spatial-world-3d`. Interrupted changes were recovered at `0a34072c` and preserved. Observer-authorized story introduction was fixed in `03bae3a`; the final shared shadow geometry and immediate worker failure changes are committed in `c3dbe88c52cd611e534ac54138ca330e3d9725dd`. Documentation and cleanup commits do not change those measured runtime files. Nothing was merged to main, no dependency or save-format change was made, and no paid provider was called.

This pass reviewed geometry/navigation authority, worker/result/store lifetimes, initial-acquisition audiences and narration, and rendering/depth/resource ownership. The artwork now faces camera yaw and pitch, with upright virtual depth/lighting coordinates and matching CPU picking. Native body position/heading and shadow proxies remain world-oriented. Static supports use an indexed candidate query during corridor projection. Ground travel visits every crossed terrain cell instead of fixed-length samples. Initial acquisition is private observed evidence for its awake sole observer; appropriate own-viewer introductions remain eligible. Shadow proxies are absent from the color pass, use shared lightweight geometry, and survive world-reset/disposal ownership correctly. Decorative planks are batched by support, and material/instance updates avoid redundant work. Worker launch/dispatch failures, clean unexpected exits, publication errors and shutdown use bounded existing failure/ownership paths.

No unit, integration or browser assertion suites were added or run. Temporary diagnostic scripts exercised the real APIs and printed observations. Required automated coverage is [SR10/SR21–SR23 and the earlier still-valid cases](../maintainers/TODO.md#spatial-review-regression-todos). Production TypeScript and Vite builds passed; the existing large client bundle warning remains. No full repository check is claimed green. Temporary review workflows/probes are removed after completion and original CI definitions restored, not permanently bypassed.

## Combined workload and method

GitHub Actions runs [35960523683](https://github.com/Macrofold/OpenLegend/actions/runs/35960523683) and [35961447916](https://github.com/Macrofold/OpenLegend/actions/runs/35961447916) ran sequential variants on each job's Ubuntu runner, Node 22.23.2 and Chromium 145 using SwiftShader software rendering. Viewport was 800×600 with the renderer's normal resolution policy. There was no physical GPU. These are short single-job observations, not portable hardware percentiles or a sustained capacity certificate.

The seed-1086 world had **329 entities**, including 16 added memory-capable NPC people (17 memory observers including the player), 240 extra resource objects, 48 extra native birds and 12 extra fires. Twenty extra elevated support patches yielded **23 authored surfaces**, deliberately overlapping XZ from Y=8 upward. Existing admission limits were unchanged. The server used actual Recast/Rapier, WorldService transitions, normal clocks, SQLite commits and public projection. Every real second the probe attempted to command two idle NPCs to new positions. These are native commanded agents, not concurrent LLM calls or a crowd-avoidance qualification.

A small temporary page instantiated the actual WildernessScene without the React HUD. It polled authorized state, ran continuous camera orbit, rendered up to eight eligible lights and nearby read-through, and recorded update/setView/frame durations plus engine draw counts. A normal EventSource connection and the ordinary background-running preference prevented browser-heartbeat expiry from pausing only the slower variant. It retained duplicate polling/SSE overhead consistently rather than imitating the production transport perfectly. The measurement window was 20 real seconds after a four-second warm-up; frames can exceed that duration under software rendering. The server also recorded setup/first-exposure and later work through the existing bounded performance collector. Metrics called p50/p95 below are that collector's retained samples, not independent statistical confidence bounds.

## Before the review versus the revised mixed scene

Run 35960523683 compared baseline `78f4238` to `57755b4` (before the final lower-detail proxy). Identical setup and scheduling rules did not produce identical trajectories: faster variants completed more simulation and commands. The acquisition audience correction also intentionally removes invalid third-party records; its improvement is not claimed as behavior-identical optimization.

| Observation                                        |            Baseline |           Revised |
| -------------------------------------------------- | ------------------: | ----------------: |
| Native one-second step p50 / p95                   |  132.40 / 244.22 ms | 57.65 / 101.78 ms |
| Largest native step in the run                     |          4321.27 ms |         601.85 ms |
| Commit p50 / largest commit                        | 83.63 / 10840.99 ms | 11.57 / 424.38 ms |
| Client state-poll p50 / p95                        |     65.9 / 361.0 ms |   46.2 / 109.2 ms |
| Representative total draw calls                    |                2083 |              1197 |
| World color mesh instances                         |                1275 |               540 |
| Shadow-only proxies incorrectly in color pass      |                 295 |                 0 |
| Final simulated seconds / issued movement commands |             47 / 10 |          334 / 26 |

No storage error or captured browser error occurred. Resource counts after three synthetic view/world resets did not grow. These resets exercise renderer disposal, not database save/load. The large first-exposure and commit spikes are reduced, not eliminated. The mixed scene remained extremely slow under SwiftShader: only 21/22 measured frames, with median frame gaps around **867/850 ms**. This is not acceptable interactive performance on that environment. It does not estimate a real GPU's FPS, and fewer draws did not translate into a demonstrated proportional frame-time reduction.

An earlier run (35957259494) timed out during a screenshot and let baseline presence expire during heavy work; it is not a valid paired performance result. The probes were corrected to preserve measurements before optional screenshots and keep normal presence alive. Initial aspect measurements using a fixed 200 ms delay also read stale projection matrices on these slow frames; the final run waits for a rendered frame instead.

## Final camera, shadow and normal-world observations

Run 35961447916 first built and committed the last two source fixes, then compared `57755b4` and `c3dbe88`, followed by the ordinary starter server with no added load. Proxy geometry changed from a default 512-triangle sphere to one shared 192-triangle mesh; this reduces geometry work, not the number of shadow passes. Mesh references remain explicitly owned across last-instance removal and renderer teardown.

Across both orthographic/perspective projection and pitch **0.45, 0.88 and 1.15 radians**, each measured after frameend, the player's projected width/height ratio stayed **0.500000**, matching its artwork. Yaw was 1 radian for those samples, and the stress phase orbited continuously. This establishes the sampled image proportion requirement; it is not a complete proof of near-plane, partially intersecting crate, reveal or all-camera picking correctness. Screenshots include the actual starter world at the high-pitch perspective view. All three variants captured no page/console errors.

The final mixed scene retained 487 cards, 539 world color mesh instances and 347 shadow casters; zero shadow-only proxies entered the color pass. It used eight local lights and 69 active reveal bindings at the recorded sample. Those are diagnostic snapshots, not newly imposed entity limits. Textures/materials stayed at 235/241 across three reset observations. Twenty-four movement commands were issued with no printed command failure, 293 simulated seconds completed, and storageError stayed null.

The last before/final comparison had only 17 measured frames each: median frame gaps **1050/1017 ms**, representative total draws **1173/1137**, and median client update **1.4/1.7 ms**. Variants had different current targets/visibility, so the draw difference is not attributed to sharing a mesh. No material end-to-end improvement is established for the last proxy refinement. Final native step p50/p95/max was **66.68/108.88/1008.13 ms**; commit p50/max **8.11/284.86 ms**. First/burst work still violates a small synchronous latency budget. Existing timing debt was not discarded, and no safety or sensory cadence was weakened to improve figures.

The ordinary starter server rendered 114 measured frames, median gap **216.7 ms**, and a **5583.2 ms maximum**; it likewise is not evidence for good hardware-GPU FPS. Median actual scene-update time was 0.2 ms and state-poll 6.0 ms, distinct from total rendering work. It used one local light, 247 world color mesh instances, 65 shadow casters and zero shadow proxies in color at the sample. This isolates remaining raster/shadow/draw-submission/post-processing work from the small custom update time; it does not identify the sole bottleneck. Its screenshot rendered successfully and retained the expected sprite aspect at all six sampled poses.

## Targeted native correctness observations

An additional disposable script on Node 22.16.0 in the working container invoked initialized collision/domain code. It printed 24 initial acquisition events with zero non-observer audiences, no acquisition for invisible targets, and observed rather than internal modality. The owner's marked acquisition yielded the configured designated introduction; another viewer, a private thought, and disabled story selection yielded silence. This is a selected integration observation, not universal source-scope qualification.

A short diagonal whose endpoints were on ground but whose interior crossed a water-cell corner was rejected in both directions. The adjacent clear path and same-position query remained valid. This catches the old sampling gap without making movement tile-snapped. Exact swept body/shore-edge support and future terrain families retain their own requirements.

A separate CPU profile ran fixed native advances with the mixed population and located remaining immutable finalization, garbage collection and exact geometry work. Profiler-instrumented timings are excluded from the tables. Shutdowns terminated server/worker processes; all runs used disposable storage, zero AI budget and no provider credentials. No existing save was modified. This review does not add a new save format or claim another save/load matrix; prior same-version acceptance and new worker lifecycle fault cases remain in their owners.

## Remaining gates

[SW17–SW19](../maintainers/spatial-world.md) and [PF](../maintainers/performance.md) retain the action list. In particular, qualify real GPUs and reduced-quality modes; shared/instanced foliage/resource and proxy drawing; alpha/depth/reveal correctness at close perspective and overlapping occluders; retained GPU/WASM resources across long sessions; mature-history finalization/commit bursts; and concurrency/fairness under slow or failed workers. No aggressive unseen-object rendering, target-count truncation, fixed-step coalescing or event loss is an acceptable substitute. The current first-acquisition privacy correction is implemented; richer exposure deltas/hysteresis, general crowd/flight conflict resolution, arbitrary structural updates and D51's broader viewport policy remain separate unfinished work. No 90% whole-game latency reduction or large-population capacity follows from these measurements.
