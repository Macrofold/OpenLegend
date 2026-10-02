# Full-HD shadow and rendering evidence

2026-09-27 follow-up to [shadow quality](shadow-quality.md), implementing the approved [full-HD plan](../projects/shadow-quality-tech-design.md#follow-up-full-hd-rendering-and-sustained-qualification). Refreshed base: `Macrofold/OpenLegend` `origin/main` at `c03930f70124f82f6ed8b19689abecc18f718a23`. Branch remains `codex/shadow-quality`; earlier work was preserved in a local checkpoint and reconciled before implementation. Independent documentation additions were retained, and upstream melee animation was preserved.

## Method and scope

macOS arm64, Apple M1 Pro, Chromium headless ANGLE Metal, WebGL2, PlayCanvas 2.22.2, Node 22.23.2 and PostgreSQL 14.17. Every run below verifies an actual **1920×1080 framebuffer**, with device pixel ratio capped at one. Both quality settings use full output resolution. Native fixture servers use disposable PostgreSQL and `AI_BUDGET_USD=0`; no provider requests, private saves or paid execution.

The renderer fixture uses the real `WildernessScene`, public view data and existing scenery. Its dense workload contains 132 entities including 121 deer, a person, rock, crate and eight fires; positions update at 10 Hz, the clock advances and the camera continuously orbits. Each day/night/quality case runs for 30 seconds after warmup. This deliberately stresses rendering, not native simulation of 121 autonomous animals. The separate production UI workload runs the real React application and native simulation at 1×, with 14 retained entity visuals and camera orbit, for 60 seconds per quality. Quality is changed through the actual settings control and verified afterward.

GPU values use asynchronous `EXT_disjoint_timer_query`/PlayCanvas GPU profiling. Renderer-fixture CPU values use the development engine's update/render counters. Production engine build counters are not valid CPU timings, so production UI CPU is measured independently between `frameupdate` and `frameend`. Frame intervals use animation-frame callback completion times, including other main-thread work; they are not precise screen presentation timestamps. The renderer CPU bracket measures wall time on the render callback, including blocking driver calls; it is not a thread-CPU counter. CPU/GPU timings overlap and must not be added together. Tracked graphics allocation is the engine's counter, not total process or physical GPU memory. Case metadata and measurement summaries are recorded below; generated measurements are kept outside Git. Full raw samples and browser traces remain in the local disposable output directory; they are not a committed browser profile.

## Delivered workload

This section records the intermediate four/two implementation. The [eight-fire 3× follow-up](eight-fire-three-times.md) supersedes the Detailed limit and its capacity interpretation: repeated baselines did not reproduce the earlier 27.84 ms eight-fire GPU result.

The earlier eight-shadowed-fire experiment took 27.84 ms median GPU time (41.54 ms p95) in dense daylight Detailed, with about 2,015 shadow draws. It exceeded the working 60 Hz headroom target and was rejected. Delivered Detailed selects up to four fires, Economy up to two, and every selected source casts shadows into the existing fixed-size atlas. Unselected fire art remains emissive. This replaces eight illuminating sources with only one occluded source; it trades illumination coverage for coherent obstruction and bounded work. The UI explains the choice, and [VP01](../limits/interface.md#vp01) owns the budgets.

| Dense moving workload | GPU median / p95 | Renderer CPU median / p95 | Frame interval median / p95 / max |
| --------------------- | ---------------- | ------------------------- | --------------------------------- |
| Day, Detailed         | 7.84 / 13.85 ms  | 6.4 / 10.4 ms             | 8.3 / 12.5 / 30.6 ms              |
| Day, Economy          | 4.01 / 12.89 ms  | 4.1 / 6.2 ms              | 8.3 / 10.2 / 32.8 ms              |
| Night, Detailed       | 5.15 / 12.31 ms  | 5.2 / 9.8 ms              | 8.3 / 12.6 / 62.7 ms              |
| Night, Economy        | 4.06 / 13.75 ms  | 3.8 / 7.2 ms              | 8.3 / 11.3 / 54.3 ms              |

Daytime tracked graphics allocation is 49.88 MB Detailed and 24.71 MB Economy. These cases have useful typical headroom on this Mac, but their tails do not establish uninterrupted 60 FPS. Neither CPU throttling nor this M1 Pro qualifies physical low-end GPU performance.

| Live production UI, 60 seconds each | GPU median / p95 | Renderer CPU median / p95 | Frame interval median / p95 / max |
| ----------------------------------- | ---------------- | ------------------------- | --------------------------------- |
| Detailed                            | 5.39 / 15.38 ms  | 1.3 / 2.4 ms              | 9.9 / 21.0 / 81.9 ms              |
| Economy                             | 2.56 / 9.44 ms   | 1.3 / 2.3 ms              | 8.3 / 12.9 / 445.9 ms             |

The live UI exposes remaining intermittent stalls: Economy's longest measured renderer bracket was 438.1 ms. That is a real observation, not a sustained shadow cost or a proven cause. A subsequent 60-second Economy trace had an 8.3 ms median/10.9 ms p95 frame interval and 32 ms maximum, with 1.81 ms median GPU time. It did not reproduce the large stall. The trace includes minor GC up to 4.99 ms and major GC up to 14.18 ms; that does not establish GC as the cause of the earlier 438.1 ms renderer bracket. Repeating the exact Detailed-for-60-seconds → Economy-for-60-seconds sequence under tracing reproduced a 296 ms frame/288.4 ms renderer bracket. The long render callback used only 10.535 ms of thread CPU, and its enclosed minor GC lasted 2.176 ms. A subsequent instrumented run identified a **308.3 ms synchronous `getProgramParameter` call in PlayCanvas shader finalization**, with a 325.9 ms frame maximum. This establishes first-use shader linking after a quality change as a reproduced hitch, distinct from steady GPU draw cost. The wrappers add overhead, so that diagnostic run is not a new throughput baseline. The shader preparation follow-up below addresses this attributed hitch. Broader tail-latency qualification remains open under SW18.10; the system is not certified stutter-free.

## Matched grass comparison

At identical 1080p inputs, two fires and 126 entities, four 15-second runs alternate individual cards → instanced → instanced → individual cards. The baseline keeps the preceding scene implementation except for full resolution, while sharing the same current lighting and sprite shaders, isolating grass submission/orientation work. Both use the same camera orbit and moving public inputs.

| Representation               | Median draws | Median renderer CPU | Median GPU     | Median frame interval |
| ---------------------------- | ------------ | ------------------- | -------------- | --------------------- |
| Individual cards, runs 1 / 4 | 953 / 953    | 4.2 / 4.3 ms        | 6.22 / 6.29 ms | 8.3 / 8.3 ms          |
| Instanced, runs 2 / 3        | 841 / 841    | 3.6 / 3.9 ms        | 6.07 / 6.23 ms | 8.3 / 8.3 ms          |

Instancing removes 177 scene nodes/world meshes in this world (359 → 182 with the same 174 casters), about 12% of submitted draws, and roughly 0.4–0.7 ms of typical renderer CPU time. No material GPU or display-paced FPS improvement is demonstrated. The group adds 11,564 tracked bytes for immutable instance data and its owned mesh. One conservative bound draws a few hundred inexpensive triangles even when some individual tufts would be culled; pickable/casting entity and canopy geometry remain separate. An initial prototype accidentally used PlayCanvas's default subdivided plane; delivered geometry explicitly uses two triangles, and these final comparisons use that correction.

## Correctness and resources

- Near-plane picking: 30 close perspective placements exercise 1,245 onscreen opaque samples. The prior picker returned 75 hits outside the valid camera-depth interval; the delivered picker returns zero such hits. Rays now use the camera's actual clip distances, and virtual-body depth is checked before selection or canopy obstruction.
- Secondary fire obstruction: two active lights both cast. Toggling the second light's shadow behind a solid blocker visibly changes its illumination on receiving ground, rather than leaking through the blocker. Removing its authorized source disables it immediately. Quality changes while paused select 4 → 2 → 4 lights; a 1 cm player movement retains membership, and extinguishing a selected source revokes it immediately.
- Receivers: inspected a deer at the seam of a 0.02 m thick elevated deck and ramp, with a low morning sun. Its lowest opaque pixel center remains 0.011875 m above its support (half a source pixel). A 0.02 m roof hidden by a cutaway remains in the shadow-caster list and visibly shades the deck/objects below. These are representative checks, not every possible seam or bias extreme.
- Eight alternating-quality world rebuilds retain seven relief assets, 54 casters, 62 world meshes and one grass instance buffer. At the same quality, tracked allocation is identical across resets: 49,817,060 bytes Detailed and 24,651,236 Economy. Scene disposal completes without page or console errors.
- Matching low dawn/perspective, rotated daylight, ordinary overhead and firelit-night images preserve grass placement, lighting and silhouette after instancing. At 390×844, the updated settings text wraps without horizontal overflow; keyboard type-ahead selects Economy, focus moves to the next control, and reload retains that selection.

## Selected verification

`pnpm typecheck` and production `pnpm build` pass. The existing camera and spatial browser tests pass at 1920×1080 on ANGLE Metal in 5.3 s and 9.7 s (19.9 s total), using a temporary viewport/backend override of the checked-in configuration. They exercise actual input, elevated-surface picking/movement, projection, cutaways and reload. No new automated tests or widened assertions were introduced. The prior SwiftShader evidence remains separate from this physical GPU run.

Existing shader-chunk version warnings and Vite worker-module/chunk-size warnings remain; completed ad-hoc runs have no page/console errors. An initial sandboxed build could not create tsx's local IPC socket; the authorized build passed with local-process permissions. Exploratory keyboard sequences did not change Chromium/macOS's native select; focused type-ahead followed by Tab did. Earlier exploratory UI measurements that bypassed React settings or used stripped production profiling counters are excluded; accepted runs verify the actual setting and use independent production CPU timing.

The full affected code/documentation diff was reviewed for renderer ownership, shader mapping, light selection/revocation, resource lifetime and evidence accuracy. Changed-file formatting and `git diff --check` pass. Of 798 checked relative documentation links/anchors, 797 resolve; the unchanged historical changelog link to the worldbuilding ledger's missing `main-branch-integration` anchor remains outside this rendering change. All added/changed links resolve. Temporary instrumentation, browser entries and baseline copies were archived outside the repository and removed, and the normal production output was rebuilt. Owned fixture servers, browsers and disposable database cluster were closed.

## Limits and remaining work

The actual 3D asset pilot is explicitly **TODO, waiting for Mike's model**, under [SW18.14](../maintainers/spatial-world.md#sw18--world-presentation-delivery) and [V3D01](../maintainers/3d-pixel-art.md#v3d01--visual-comparison-and-style-decision). No substitute asset or new model loader is claimed. Sprite relief remains shallow inferred geometry that follows its artwork/camera.

Physical low-end/mobile devices, WebGPU, unsupported-PCSS hardware fallback, arbitrary thin/coplanar geometry and prolonged overlapping reveal remain separately unqualified. The 1080p requirement supersedes earlier reduced-resolution performance samples; those observations remain historical. Larger framebuffers need their own capacity evidence. SW18.6/SW18.7/SW18.10 retain these concrete gaps; this pass does not claim crowd/structural physics or an entire 3D art pipeline.

## Shader preparation follow-up

The exact 60-second Detailed → 60-second Economy production UI reproduction identified the specific cold program: the **instanced grass forward shader** with Economy sun/local PCF3. Its blocking `getProgramParameter` took 283.6 ms in the fresh attribution run, consistent with the earlier 308.3 ms observation. This is shader linking, not the steady cost of drawing grass or shadows.

The delivered `ShadowMaterial` requests the opposite-quality forward variant when the current lit program is first generated. The request uses the same mesh, material and camera processing inputs; only the copied lighting options change. Directional-light clones use the supported filter setter/fallback and are immediately destroyed. Exact option property descriptors/prototype preserve the engine cache key. The existing engine program cache owns the programs; weak per-program membership deduplicates preparation. There is no pending scene callback, extra rendering, skipped object, altered public-view lifetime, or readiness wait in the quality selector. Quality setters and preparation share filter constants.

The final matching 1080p sequence runs the actual production UI at 1× with 14 retained visuals, a moving camera and zero provider spending. Temporary wrappers record all GL calls over 20 ms; none occurs in either final interval. These are diagnostic runs with wrapper overhead, not a new uninstrumented throughput benchmark.

| Sequence | Detailed frame p50 / p95 / max | Detailed render callback max | Economy frame p50 / p95 / max | Economy render callback max |
| -------- | ------------------------------ | ---------------------------- | ----------------------------- | --------------------------- |
| Before   | 8.3 / 10.4 / 19.8 ms           | 6.4 ms                       | 8.3 / 10.7 / 298.8 ms         | 292.2 ms                    |
| After    | 8.3 / 11.4 / 244.7 ms          | 9.8 ms                       | 8.3 / 11.6 / 285.9 ms         | 7.5 ms                      |

Afterward, median/p95 GPU costs are 3.45/5.19 ms Detailed and 1.93/3.46 ms Economy. The attributed forward-link/render-callback stall is removed in the matched scenario. **Long frame gaps remain outside that render callback**, so the data does not demonstrate uninterrupted 60 FPS or removal of every UI/main-thread stall. An earlier implementation run also eliminated slow GL calls, with a 55.1 ms Economy maximum frame; variance is why the final result retains the larger observed gaps.

A separate real-UI audit starts from Detailed and switches Economy → Detailed → Economy → Detailed, retaining 29 shader programs after the first switch, equal to the baseline after both qualities have been used. The prepared scene starts with 22 programs versus 17 without preparation, so five programs are requested earlier. The first prepared switch has a 52.4 ms maximum render callback including a 14.5 ms shadow-pass link; subsequent switches have maximum render callbacks of 6.6, 5.2 and 5.5 ms. No forward-link query over 5 ms occurs after readiness in this audit. Both scenes dispose without page/console errors. Inspected full-HD screenshots retain grass, sprites, fire illumination and received/cast shadows.

Initial cold loading is still synchronous: the prepared audit takes 3.08 s from first observed view to readiness, including several long forward links. Its baseline page shares the same browser/driver cache afterward, so that pair cannot establish a startup-cost difference. Preparation intentionally trades earlier program work/cache storage for faster later switches. A review prototype accidentally made the inherited `pass` getter enumerable, warming unused duplicate keys; it was corrected before the final sequence and resource audit. Shader generation for newly encountered materials, immediate switches, initial shadow-pass setup, context restoration and other hardware remain separate limits, not silently claimed passes.

The aggregate findings, slow-call observations and switch/resource results are summarized in this report; generated measurements are kept outside Git. Raw shader text and diagnostic profiles remain outside the repository. Final `pnpm typecheck` and normal production `pnpm build` pass. The two existing browser checks pass at 1920×1080 on ANGLE Metal: camera 12.4 s and spatial world 5.7 s, 28.0 s total. They exercise gestures, cancellation, elevated picking/movement, projection, cutaways and reload. No new automated tests were added. The full affected diff was reviewed; the option cache-key defect was fixed and rechecked. Changed-file formatting and relative-link checks pass apart from the same pre-existing historical anchor noted above. Temporary diagnostic entries/scripts are archived outside the repository and removed; owned fixture servers/browsers and the disposable database are closed. Existing build/chunk warnings remain.
