# Eight shadowed fires at 3×

September 27–28, 2026. Follow-up to the [approved optimization plan](../projects/shadow-quality-tech-design.md#follow-up-eight-shadowed-fires-at-3), tracked by [SW18.15](../maintainers/spatial-world.md#sw18--world-presentation-delivery). Reconciled base: `Macrofold/OpenLegend` `origin/main` at `c5455cf8fc9e4d4fe03034a7f069d6d6581bb8f2`; branch remains `codex/shadow-quality`. Previous rendering work and upstream hunting/context changes were preserved.

## Method

Apple M1 Pro, macOS arm64, Node 22.23.2, PostgreSQL 14.17, PlayCanvas 2.22.2 and Chromium headless ANGLE Metal/WebGL2. Actual framebuffer 1920×1080 throughout, including Economy. Local disposable databases only, `AI_BUDGET_USD=0`, no provider calls or spending.

The graphics comparison reuses the 132-entity moving public-view fixture: 121 deer, a person, rock, crate and eight fires, 10 Hz position updates, clock progression and continuous camera orbit. It measures renderer capacity, not autonomous simulation. The native production-UI fixture starts with 142 world roots: player, 20 NPCs, 21 animals and 100 other objects including eight banked fires. Actors move naturally; initial observation/population does not imply every animal remains visible. It uses the real server clock, PostgreSQL, SSE, React UI and renderer. Requested 3× means **180 simulated seconds per wall second**. Native speed is sampled at both boundaries on the server, before transferring the frame report out of the browser.

GPU timings use asynchronous timer queries. Production renderer CPU is a wall-time bracket from `frameupdate` to `frameend`; stripped production engine CPU/shadow-draw counters are not measurements. Frame intervals are animation callback completion times, not precise display-presentation timestamps. CPU and GPU overlap. Engine graphics allocation is not total physical GPU memory. Host load varied substantially; retain tails and failed runs rather than selecting only favorable samples.

Raw profiles, temporary harnesses, images and full samples are private under `/tmp/openlegend-eightfires/`. The comparison summaries are recorded below; raw measurements, private saves and browser profiles are kept outside Git.

## Experiments and rejected candidates

- Repeated eight-fire graphics baselines measured **7.99/8.42 ms median GPU**, **7.5/7.3 ms median renderer CPU**, and about **2,260 total / 2,023 shadow draws**. The earlier 27.84 ms result in [full-HD evidence](shadow-1080p.md) did not reproduce and is not a reliable inherent eight-fire limit. This corrects the capacity interpretation without erasing the earlier observation.
- Local PCF3, local PCF1 and sun PCF3 measured 6.52, 6.42 and 5.93 ms median GPU respectively. The unshadowed diagnostic measured 5.28 ms. Reduced filtering and missing occlusion are not retained as the solution. Detailed keeps PCSS sunlight and PCF5 local filtering.
- A production 60-second baseline retained eight shadowed fires and 141–142 rendered entities. It produced 3,376 frames (about **56.2 FPS**), median/p95 renderer CPU **15.4/20.6 ms**, GPU **9.09/13.01 ms**, and frame interval **17.3/22.1 ms**; maximum interval 160.6 ms. A separate 20-second CPU profile identifies matrix/vector uniform uploads and shadow draw submission as the dominant browser work.
- The first batching prototype omitted its batch instances from the caster list because standalone mesh instances default to non-casting. Both of its timing runs are **invalid capacity evidence**. The corrected implementation explicitly enables casting; subsequent checks verify actual batch membership and compare images, rather than merely counting enabled lights.
- Corrected four-metre shadow batches and artwork-input sharing measured **4.0/5.9 ms median/p95 renderer CPU** and **7.21/11.24 ms GPU** in the real 60-second run. Actual progress was **3.000×**, with 4,285 frames (about **71.4 FPS**), eight shadowed fires throughout, and median/p95 frame interval **13.5/19.9 ms**. The 99.8 ms maximum and one early 77 ms long task prevent a stall-free claim.
- Drawing only the front plane while preserving full relief casting demonstrated no useful gain in the 30-second native experiment (7.89 ms median GPU). Host load increased and native throughput reached only 2.43×, so this is a failed combined-capacity sample, not proof that front-only drawing worsens performance. The extra representation/lifecycle machinery is not retained.

The matched moving cell-size comparison retains the same 132 entities and all eight shadowed lights:

| Cell size   | Median draws | CPU median / p95 | GPU median / p95 | Frame median / p95 |
| ----------- | -----------: | ---------------: | ---------------: | -----------------: |
| 4 m, first  |        1,045 |    5.9 / 14.7 ms |  7.47 / 10.72 ms |      8.3 / 16.9 ms |
| 8 m         |          785 |    5.1 / 10.4 ms |  7.24 / 12.03 ms |      8.1 / 13.8 ms |
| 16 m        |          683 |     4.1 / 6.6 ms |  7.10 / 10.34 ms |      8.3 / 11.0 ms |
| 4 m, repeat |        1,039 |    5.4 / 14.2 ms |  6.76 / 11.27 ms |      8.2 / 17.0 ms |

Sixteen metres is retained. The reliable improvement is fewer submissions and lower CPU cost; GPU variance does not establish a monotonic GPU speedup. Group bounds still enclose only actual members; the cell is not a clipping boundary or population cap.

## Correctness observations

With real batch instances in the caster list, four paired 1080p images cover morning, noon/low camera pitch, firelit night and late afternoon/high pitch; the later pass includes a horizontal pose. The first comparison differs in only 1–31 pixels per image, with 0–11 pixels differing by more than two channel levels. These sparse rasterization differences are not missing objects or shadow shapes. The original contact geometry, source alpha, receiver mapping and filters are unchanged.

The ad-hoc lifecycle scenario exercises batched → individual casting, revocation, re-observation as a single caster, Detailed/Economy source counts (8/2), removal of all fire sources, eight timeline/world rebuilds and disposal. The final sixteen-metre pass also moves a fire and repeats the four paired images (1/27/31/8 changed pixels; 0/3/11/2 differing by more than two channel levels). Every rebuild retains the same 24 grouping entries, seven relief assets, 41 submitted casters and 49,829,780 tracked graphics bytes in that fixed scene. Batch ownership is empty after disposal. These are representative checks, not every generated artwork/model or physical low-end GPU.

## Full-day failure and shader follow-up

The first eight-minute native run averaged 83.7 FPS with eight shadowed fires in every sampled frame, but it **failed combined acceptance**: actual progress was 2.960×, two HTTP requests returned 503, one walking request returned busy, and an unfed player eventually could not act (55 later walking requests returned `not-alive`). Its largest renderer bracket was 2,601 ms. Population counts alone did not establish a healthy, continuously playable workload.

A system sample near the slow portion recorded load 214.63 on this ten-core host, 1.78% idle CPU and about 14 GB compressed memory. Simulation caught up in later intervals, but this does not excuse the failed sample or attribute every stall to the host. No unrelated processes were stopped.

A separate day/night WebGL trace reproduced sunset `getProgramParameter` waits of **285.4, 518.5 and 209.3 ms** (plus 10.2 ms). The original quality-only warmup did not prepare the sun-absent programs. The material now prepares the finite quality × sun-state combinations using the actual sun description, preserved through material copies. Daytime-start and nighttime-start sweeps across sunset/sunrise, followed by Economy/Detailed switches, subsequently recorded **no instrumented shader-link wait over 10 ms**. The 2.6-second sunrise-region soak frame was not separately attributed by that trace; the new native run also records blocking program-finalization calls.

The corrected native fixture starts characters healthy, supplies ordinary carried food through the existing creator transition, and submits normal native meal actions while needs continue running. Player walking/eating uses the authenticated HTTP path; scripted NPC meals use the existing server command owner and normal commits. No AI provider or physiology shortcut is introduced. It checks actor survival at the endpoints as well as sources, population and actual elapsed progress.

The corrected eight-minute run retained all 142 world roots and all 42 living actors, with eight shadowed sources in every sample. All 89 walking commands, six player meals and 120 scripted NPC meals succeeded; no browser/HTTP error or shader-link wait over 10 ms was recorded. It averaged **83.0 FPS**, with **74.5–95.3 FPS in each 30-second interval**. Median/p95/p99 frame intervals were **11.5/17.4/23.1 ms**, maximum **199.7 ms**; renderer CPU **3.4/4.8/6.9 ms**, GPU **5.80/9.64/13.07 ms**. Seven browser long tasks remained (54–132 ms). This is not a locked-60 or stall-free result.

Actual full-wall progress was **2.9798×**, so the remaining native throughput gap was investigated separately. Runtime instrumentation counted 2.316 seconds excluded by the existing suspension rule, with zero pending simulation discarded; native step, projection and SQL waits all had long tails. Host load increased from 59.7 to 131.3. The run's assertion initially expected every successful command to return `accepted`; meals correctly return `ate`. That harness assertion was corrected without changing gameplay or the recorded success data.

A diagnostic 60-second native CPU profile on the same fixture reached **3.0094×**, **82.1 FPS**, no browser long tasks or shader-link waits and 11 successful walking requests. It sampled about 20.6 seconds idle, 15.2 seconds inside native advancement, 11.0 seconds public projection (including 6.6 seconds previewing commands), and 2.4 seconds GC. Inclusive spans overlap and cannot be added. This demonstrates native headroom in that interval and identifies projection previews/immutable-state copying as residual work; it does not explain away the failed long-run clock result. No simulation, command-admission or suspension rule was changed. PF03/PF05 retain those already-tracked follow-ups.

## Final sustained result

The second eight-minute confirmation retained 142 world roots, all 42 living actors and eight shadowed fires in every frame at actual **1920×1080**. Over 480.015 server-measured wall seconds it advanced 86,402.417 game seconds: **2.999992×**, including the full day/night cycle. No suspension interval was excluded in this run. Native semantics, clock ratio, selected population, relief geometry and filtering were unchanged.

| Measurement                                        | Final eight-minute confirmation |
| -------------------------------------------------- | ------------------------------: |
| Frames / average throughput                        |           41,417 / **86.3 FPS** |
| Throughput in every 30-second interval             |              **76.1–105.5 FPS** |
| Frame interval median / p95 / p99 / max            |   11.2 / 17.0 / 21.7 / 159.4 ms |
| Renderer CPU median / p95 / p99 / max              |       3.3 / 4.7 / 7.0 / 89.3 ms |
| GPU median / p95 / p99 / max                       | 5.63 / 9.34 / 12.45 / 148.16 ms |
| Successful player commands                         |              89 walks + 6 meals |
| Successful scripted NPC meals                      |                             120 |
| Browser/HTTP errors / shader-link waits over 10 ms |                           0 / 0 |
| Browser long tasks                                 |             3: 76, 62 and 90 ms |

The player actually moves between X=11 and X=12 while the camera continuously orbits. The fixed graphics fixture separately checks facing, pose, receiver geometry and source movement. Command latencies and failed earlier samples remain in the aggregate evidence; this is a **sustained-throughput pass on this workload/hardware**, not uninterrupted 16.7-ms frames, universal GPU capacity, funded cognition or PF00's broader command-latency acceptance. The 60-second unbatched native baseline averaged 56.2 FPS; the matched four-metre candidate reached 71.4 FPS before the final cell/shader changes. Do not attribute the entire day/night average difference to one optimization.

## Acceptance

The requested native 3×/eight-fire/full-HD throughput target is met on the named M1 Pro. TypeScript checking and the normal production build pass (the build retains its existing large-chunk warning). Both existing browser checks pass at 1920×1080/ANGLE Metal: `tests/browser/camera.spec.ts` and `tests/browser/spatial-world.spec.ts`. Actual settings keyboard type-ahead switches Detailed → Economy → Detailed, immediately selecting 8/2/8 sources, and reload preserves Detailed. Two earlier harness arrow/menu sequences did not select Economy in headless macOS Chromium; no runtime setting was changed to make the check pass.

Final review corrected the artwork cache key to encode its generator inputs as an unambiguous tuple; paired images and eight repeated rebuilds retain the same results afterward. The renderer benchmark's grouping and artwork are unchanged by this collision fix. The complete affected diff, changed-file formatting and relative documentation links are reviewed; the unchanged historical changelog link to the missing worldbuilding `main-branch-integration` anchor remains outside this change. Temporary instrumentation/browser entries are archived outside the repository, the normal production output is rebuilt, and owned fixture processes are stopped. Cold loading, remaining frame-time tails and physical low-end hardware stay separately tracked under SW18.10/SW18.13. The actual 3D model pilot remains TODO awaiting Mike’s asset.
