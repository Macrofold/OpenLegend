# Standalone perspective texel-splatting experiment

## E07 — October 15, 2026

**Decision: defer application integration.** The static technique ran on physical hardware with the existing starting scene's geometry. It can keep coarse samples attached to captured surfaces, but newly revealed surfaces and capture replacement still change the sampling. Thin deck details and grazing surfaces remain poor fits for the present character-first art revision. No OpenLegend graphics backend, world initializer, gameplay state or active playtesting world was changed.

This completes the standalone investigation in [V3D01.9](../maintainers/3d-pixel-art.md#v3d019--standalone-perspective-texel-splatting-investigation), including a rejection/defer decision; it does not qualify animated characters or adopt texel splatting for production. The [research owner](../../art-direction/research/3d-pixel-worlds/texel-splatting.md) explains the method and integration boundary.

### Source, workload and reproducibility

- OpenLegend source baseline: `codex/starting-scene-pixel-art` at `1438ea137`; initial tool checkpoint `1338d8f02`. The scene export came from the current public starting-world presentation. It contained 46 existing static meshes, 1,224 vertices and 602 triangles: supported ground, existing terrain/cover blocks, lookout pillars/wall, deck, ramp and thin plank seams. Native positions and geometry were preserved. No alternate playable map or art-only initializer was created.
- Input SHA-256: `ed0b6d371064e1f476e6d03da3be3511aa86011d19dc5b317c61fc0c399f871e`. The static export and generated results remain outside Git, under `/private/tmp/openlegend-texel-e07-geometry.json` and `/private/tmp/openlegend-texel-e07-reviewed-{96,192,384}/`.
- Renderer: [Dylan Ebert's MIT source](https://github.com/dylanebert/texel-splatting/tree/394d350f91842779ed4c45760bd4ea9a07ce5c4c), pinned at `394d350f91842779ed4c45760bd4ea9a07ce5c4c`. It was fetched into temporary directories. Only the temporary cubemap sampling constant changed. The existing eye/grid/previous capture, shading, edge-mask, culling and quad reconstruction remained intact. The adapter initialization retains its [MIT notice](../../scripts/art/texel-splatting/UPSTREAM-LICENSE).
- Pinned `src/splat.ts` SHA-256 before changing its sampling constant: `6a3d5c810d2b9ccb277a7d863303c719212d483894138037d9e8c51a66703e20`. `src/lighting.ts`: `026a021650e0a539bc6e404de42a29f0675629c846aa9fd07d4670bb6a233930`. The JSON records the additional direct-renderer/license hashes.
- Reusable source: [tool and instructions](../../scripts/art/texel-splatting/README.md). It uses installed Vite/Playwright and an exported public static mesh file. The native game and its private data are not required by the standalone renderer. No paid provider call was made; additional and cumulative E07 provider cost are **$0**.

The physical machine was an Apple M1 Pro MacBook Pro with a 16-core GPU and 32 GB unified memory, macOS 15.7.3. Official Chrome 155.0.8059.40 reported WebGPU vendor `apple`, architecture `metal-3`, with `timestamp-query`. The browser viewport was 1280×760 at DPR 1; the canvas was 1280×720. Splatting drew a 640×360 image. The ordinary raster control used approximately equal central angular density at a 60° field of view: 96×54, 192×108 or 400×225 for 96-, 192- or 384-texel cubemap faces. Both enlarged with nearest sampling. Equal detail is approximate: cubemap direction, surface depth and zoom change projected texel size.

All exported meshes used the upstream renderer's common neutral stone material and the same lighting/shadow calculation in both variants. This deliberately isolates sampling; it does **not** compare the starting scene's final colors, faces, fabric or authored surface artwork. There were no animated subjects, transparent effects, foliage cards or imported mercenary geometry. One directional sun and the source's ambient sky gradient were active; no point lights were active. Shadows traced against the same 602 static triangles. The baseline scene camera was `(11, 24.6636, 33.3888)` looking at `(11, 0, 13)`; close detail views were derived from the existing deck bounds.

Each density ran seven matched paths with ordinary rasterization and splatting: movement within a capture cell, crossing a cell boundary, orbit, 70°→35° zoom, 8°→70° sun elevation, close movement across plank seams, and lateral movement that reveals the deck's underside and posts. Each path/variant recorded 60 measured frames after 36 warm-up steps. Probe time advanced monotonically in 1/60-second steps; camera motion was controlled independently of native simulation. Total: **2,520 measured frames**, plus warm-up, across the three densities. Start/middle/end PNGs and WebM recordings were retained outside the repository.

### Visual observations and limitations

| Case                                    | Observed result                                                                                                                                                                                                                                           | Consequence                                                                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Small translation within a capture cell | Broad sampled material regions remained tied to the fixed capture's surfaces; they moved in perspective with those surfaces. The samples were visibly different from the ordinary raster control's screen-aligned squares.                                | This establishes a useful static sampling difference, not a claim of zero shimmer or universally square projected pixels.                            |
| Capture-cell crossing                   | The captured surface pattern changed as the grid origin was replaced. The retained previous capture blended that transition, while eye-capture regions used another sampling pattern. The 192-texel boundary path captured 8–12 faces per measured frame. | Capture replacement is a visible tradeoff; the technique does not make every displayed pixel permanent.                                              |
| Orbit and revealed surfaces             | The deck's underside/posts remained present as the camera revealed them; eye capture supplied regions that the fixed origin could not see. Edge sample patterns changed as these regions entered view.                                                    | This is an actual static disocclusion trial, not evidence that animated surfaces or arbitrary occluders are solved.                                  |
| Thin plank seams and grazing surfaces   | The 96- and 192-texel views merged fine seam detail into broad streaks; the 384-texel view retained more detail, but grazing surface cells still became elongated. The thin path captured 6–9 faces per measured frame.                                   | Higher density improves detail at substantial sample/storage cost. This is not yet a preferred treatment for fine fabric, eyes or tools.             |
| Zoom                                    | The fixed capture resolution stayed unchanged. Captured cells grew on screen rather than acquiring additional source detail.                                                                                                                              | Fixed capture density is separate from final display resolution; it is still not a model built from permanent colored cubes.                         |
| Changed sun elevation                   | Both variants changed illumination and shadows on unchanged geometry. Surface sampling alone did not freeze the light.                                                                                                                                    | Material placement and illumination stability must be judged separately. Lighting changes can require shading without requiring new source geometry. |

The source's static rendering worked; there were **no uncaught browser exceptions or uncaptured GPU validation errors** in the final three runs. Each owned standalone browser/server closed, and each WebGPU device was explicitly destroyed. This does not establish application selection, read-through, asset replacement, context-loss recovery or an animated-character resource lifecycle.

### Complete operation and memory measurements

These are **diagnostic measurements under concurrent starting-scene browser QA on the same machine**, not isolated device/frame-budget qualification. They must not be used as a supported population, 8× simulation, lower-end device or full-game FPS claim. The scene is only 602 merged static triangles; it omits the current world's many scenery cards, people and gameplay work.

The tool records CPU preparation/encoding, the complete encode→submit→GPU-completion wait, each GPU stage's timestamp interval, and the first-to-last GPU timestamp span. Display-frame waits, screenshots and timestamp readback are excluded from the reported complete wait. GPU timestamps were quantized in observed 0.065536 ms increments. On Metal, individual render-pass intervals overlapped; summing those durations produced impossible-looking totals larger than elapsed frame time. The report therefore uses complete first-to-last spans and grouped stage spans. Stage spans can also overlap and **must not be added** as independent costs.

The following close-deck path gives p50 / p95 / maximum in milliseconds, with 60 samples in every row:

| Face density | Variant | CPU encode      | Complete wait     | Complete GPU span    |
| ------------ | ------- | --------------- | ----------------- | -------------------- |
| 96²          | Raster  | 0.1 / 0.2 / 0.2 | 3.5 / 9.6 / 12.4  | 0.39 / 6.23 / 8.52   |
| 96²          | Splat   | 0.2 / 0.3 / 0.3 | 6.0 / 11.9 / 12.6 | 3.74 / 7.27 / 10.55  |
| 192²         | Raster  | 0.1 / 0.2 / 0.3 | 2.9 / 7.4 / 9.6   | 1.77 / 6.09 / 8.32   |
| 192²         | Splat   | 0.2 / 0.3 / 0.3 | 5.1 / 13.9 / 19.8 | 3.60 / 12.26 / 18.48 |
| 384²         | Raster  | 0.1 / 0.2 / 0.2 | 4.2 / 12.7 / 23.0 | 0.52 / 8.91 / 18.94  |
| 384²         | Splat   | 0.2 / 0.3 / 0.3 | 9.4 / 21.1 / 22.9 | 8.06 / 18.87 / 21.23 |

The 192² boundary-crossing splat path measured a complete wait of **7.3 / 13.2 / 14.1 ms** and complete GPU span of **5.18 / 9.96 / 10.22 ms**. Its grouped GPU spans were capture **1.25 / 7.67 / 7.86 ms**, shade **0.52 / 0.85 / 1.05 ms**, edge mask **0.07 / 0.26 / 0.39 ms**, cull **0.07 / 0.13 / 0.13 ms**, and display drawing including nearest enlargement **1.44 / 6.42 / 6.95 ms**. This covers the complete capture/shade/cull/draw route, rather than timing only the last splat draw. The raw JSON retains all paths and all stage samples.

Resource descriptor estimates were:

| Face density | Combined resident textures + buffers | Increment added by splat resources |
| ------------ | ------------------------------------ | ---------------------------------- |
| 96²          | 7.04 MiB                             | 5.06 MiB                           |
| 192²         | 22.46 MiB                            | 20.25 MiB                          |
| 384²         | 84.27 MiB                            | 81.00 MiB                          |

Both alternatives and shared geometry remained resident during comparison. The incremental column subtracts the pre-splat allocation snapshot. Counts include capture attachments, depth, visibility/indirect/edge buffers, source geometry/acceleration buffers, render targets and timing readback buffers. They use four nominal bytes per texel, including `depth24plus`; they exclude browser/driver overhead, pipeline binaries, swapchain storage and JavaScript heap. This is allocated-descriptor accounting, **not a measured VRAM high-water mark**. Doubling face dimensions approximately quadrupled the splat allocation in these runs.

Preparation before the first scene draw took approximately 1,627 / 92 / 1,570 ms at 96 / 192 / 384. Pipeline/cache state and concurrent machine work were uncontrolled, so this is neither a density-scaling result nor time to first rendered image. It includes geometry upload, acceleration-tree construction and pipeline creation, while excluding download/browser startup and first-draw completion.

### Resulting decision

Retain the repeatable tool and **defer production integration** for this scene revision. The static experiment demonstrates an interesting stability mechanism, but its capture transitions, newly revealed sample changes and grazing/thin-detail tradeoffs remain visible. The public implementation uses WebGPU while the application still uses its qualified WebGL path. Porting/migrating that path would also need to preserve permitted visibility, depth, selection, read-through and resource cleanup. None of those costs is justified by a static neutral-material result alone.

Animated heads, faces, skinning, cloth deformation/body coverage, transparent effects and view-dependent specular behavior remain unqualified. This experiment cannot solve or close the mercenary's face/clothing acceptance. If the technique is reconsidered, the existing V3D01.9 owner requires a scoped integration decision and those relevant failures to be addressed; the current ordinary-renderer art work continues independently.

The tool's entire affected source was reviewed. Node syntax checks, targeted Prettier and 12 local documentation references passed. An empty static export was rejected with the declared vertex-range error before browser/GPU startup. Final hardware runs verified the tool end to end. Broader application TypeScript/build/interaction checks belong to the integrated starting-scene implementation and are not claimed by this standalone report.
