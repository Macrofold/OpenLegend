# Procedural art, 2D models and pixel density

## Mixed representation in a 3D world

The accepted procedural/painted/2D-rig vocabulary is a representation family, not a planar-world limitation. [Spatial visual bindings](../07-technical-architecture/spatial-world-runtime.md#10-playcanvas-isolation-and-hybrid-assets) place sprites, simple meshes and future models at one authoritative 3D anchor. Camera-facing single-view fallback is explicit; missing rear/pitch views do not automatically trigger generation. Visual skeletons, parts and sockets cannot grant anatomy, flight or reach. Current plain meshes and cached sprite artwork are described in [Architecture](../../docs/architecture.md#spatial-world-foundation); arbitrary rigs and model imports remain separate work.

Recorded September 19, 2026. **Accepted direction:** evolve toward a hybrid visual system using procedural composition, reusable 2D rigs, state-based effects and authored/generated artwork. The user also asks about the cost of novel-image generation and higher pixel density. The architecture and rollout below are proposals; no rig, new renderer or configurable density setting is implemented here. F25/D24 track this direction. [Visual direction](visual-direction.md) owns the style; [art generated during play](visual-direction.md#art-generated-during-play) owns asynchronous publication, state correctness and art funding.

## What the current prototype does

[art.ts](../../apps/client/src/art.ts) contains drawing instructions using Canvas rectangles, polygons, colors and seeded texture variation. The browser creates complete images in memory; [scene.ts](../../apps/client/src/scene.ts) uploads them as textures on planes. People have a small number of generated frame variations, not a hierarchy of articulated limbs. These images are sprites even though their source is code rather than a PNG sheet. Pixel generation happens during scene/entity preparation, not in a build-time image export or a live image-model call.

Procedural generation and skeletal animation are independent choices. A rig can animate painted image parts, generated image parts, procedural shapes, or a mixture. A procedural object can also be static. We can retain reusable procedural generation while replacing the prototype's monolithic drawing functions and per-entity texture handling.

## Hybrid visual representations

| Representation | Best use | Main tradeoff |
|---|---|---|
| Authored or generated sprite frames | Specific silhouettes, expressive poses and details needing direct artistic control | Additional actions, directions and outfits can multiply frame work |
| Trusted procedural shapes/materials/composition | Repeated object families, palettes, proportions, modular equipment and state variants | The visual vocabulary and its composition rules require engineering and art design |
| Rigged 2D parts or meshes | Reusable character/animal movement, equipment attachments and dynamic poses | Requires joint structure, constraints, layering and suitable deformable or replaceable parts |
| Reusable effects | Wounds, blood stains, fire, scorch, weather and material changes justified by game state | Must preserve readability and represent only supported outcomes |

Keep these behind a common versioned presentation contract so an object can improve its art without changing its mechanics. Library artwork and bespoke image generation complement the procedural vocabulary. Rich novel artwork remains available when the reusable representations cannot produce an acceptable result.

## Generating a novel appearance

Generating a new combination from existing rules can avoid a network/model call entirely: vary a rabbit's fur and proportions, assemble a supported trap from poles and bindings, or apply a supported damage overlay. The combination can be new even though its primitives are known. It needs local composition/rasterization and validation, with no image-provider charge. Actual latency still depends on complexity, resolution and hardware; no benchmark is claimed.

A freeform request may first need Jev classification or a language-model call to produce a bounded visual description. That semantic work has its own latency and cost. The procedural rasterization afterward does not make that interpretation free. It also does not justify an inference call for every already-known material variation or animation frame.

A completely unfamiliar anatomy, silhouette, ornament or style may exceed the available vocabulary. Add a reviewed primitive/family through engineering, obtain authored parts, or use the background image-generation path while showing a truthful fallback. Procedural composition does not guarantee arbitrary high-quality images from any sentence; selecting a supported primitive is different from inventing a new drawing algorithm.

Proposed selection order: exact authorized asset reuse → supported procedural composition/state effect → bounded background generation or new authored asset. The application validates the fit; model confidence alone cannot prove an object is representable. Authoring methods remain swappable and their outputs share the existing asset validation and publication path.

## Characters as articulated 2D models

Represent a supported character family with a hierarchy of torso, head and limb joints; joint constraints; part shapes or image references; attachment sockets; and explicit draw order. A pose transforms the hierarchy, carrying a hand and its held item with the arm. Animation interpolates poses and can add bounded procedural motion. These are established skeletal-animation concepts; [Spine's basic concepts](https://en.esotericsoftware.com/spine-basic-concepts) illustrate the approach without committing this project to that tool or runtime.

Inverse kinematics can place a hand at a reachable target or adjust a foot to terrain by solving joint angles. Reuse motion across compatible rigs while respecting proportion changes and joint limits. Contact cues, timing, facing, layering and special silhouette changes still need design. [Spine's IK guide](https://eu.esotericsoftware.com/spine-ik-constraints) describes target-based limb posing and its constraints.

Rotating a part within the image is different from turning a front-facing body into a side or rear view. A flat rig has no hidden surfaces to reveal. Directional artwork, part swaps, richer geometry or actual 3D models may be needed. Small pixel-art limbs can distort or shimmer under rotation/stretching; evaluate pixel snapping, quantized poses, replacement frames and low-resolution compositing against the desired style. A rig is not an automatic substitute for every animation frame.

Visual joints are presentation data, separate from the authoritative anatomy and equipment records. A new visual part cannot grant a functional limb; moving a hand cannot extend gameplay reach or authorize taking an item. Use supported state and attachment bindings to depict committed game outcomes.

## Higher pixel density: three separate changes

| Change | What it changes | What it does not supply |
|---|---|---|
| Enlarge the displayed sprite or nearest-neighbor upscale | On-screen size or duplicated output pixels | New fine detail |
| Rasterize the same geometry at higher resolution | More samples, potentially finer shape edges, and larger textures | New folds, hair, anatomy or material features absent from the description |
| Add finer geometry, textures and shading rules | Genuine additional visual detail | A fixed or universally proportional authoring cost |

The same drawing or rig description can target a larger canvas without one new instruction per pixel. Canvas transforms can scale a logical coordinate system; see [MDN's scale documentation](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/scale). Merely changing the current hard-coded canvas dimensions would leave its coordinates and detail rules unchanged. Refactor coordinates, feature sizes, pivots and texture sampling together; scaling existing block shapes alone may just make larger blocks.

At the same on-screen footprint, multiplying both source dimensions by `r` produces `r²` pixels:

| Character texture | Pixels per frame | Relative pixel count |
|---|---:|---:|
| 48 × 96 (current) | 4,608 | 1× |
| 96 × 192 | 18,432 | 4× |
| 192 × 384 | 73,728 | 16× |

For a fixed pixel format, raw texture bytes scale with that count. Per-pixel processing and upload volume can grow similarly, but actual generation time also depends on shape count, overdraw, filters and fixed overhead. Doubling source dimensions does not necessarily quadruple screen-rendering time at the same displayed size. Frame count, directions, layers and unique variants multiply storage independently. These are arithmetic relationships, not measured performance results.

Drawing a larger simple polygon can use the same number of instructions. Making it look richly detailed at that larger size may require substantially more authored rules or artwork; effort follows desired detail and complexity, not pixel count alone. Distinguish source-asset density from camera zoom, display DPI and overall scene render resolution. Increasing the scene render buffer cannot recover detail absent from its source sprites.

## Proposed contracts, caching and delivery

Use bounded, schema-versioned visual descriptions with registered primitive/rig families, dimensions, materials, part hierarchy, joint limits, attachment points, state mappings, seed and style revision. These are untrusted data consumed by trusted renderer code, never runtime-generated JavaScript or arbitrary Canvas callbacks. Limit part count, hierarchy depth, mesh size, texture area, animation channels and per-frame work. Unknown visual families use the existing fallback/generation path; new fields do not gain executable meaning automatically.

Separate the visual description, pose evaluator, raster/mesh backend and asset store. Cache static rasterizations and share compatible textures/atlases; evaluate only necessary rig transforms or dirty visual layers rather than redrawing and uploading every whole sprite each frame. Procedural generation is not inherently faster to display than PNGs once both are textures. Compare live rigs with baked frame sequences for the actual population and animation workload.

Persist reusable procedural descriptions, visual seeds, generator/rig/style versions and dependencies alongside retained image artifacts. Visual randomness must not consume the simulation RNG. Include density, relevant pose/state and generator versions in derived-cache identities. Recipes permit regeneration, but identical pixels across browsers/renderer versions are not assumed; retain approved raster bytes when exact reproduction or portable release requires them. Existing asset retention, rights and pack rules still apply.

Treat pixel density as a versioned presentation-profile parameter with bounded output sizes and consistent world-space footprints/pivots. A density/style change can rebuild derived visuals, not simulation state. It should not trigger paid generation merely because a user zooms. Exact density presets, interpolation methods, rig runtime, authoring tools and review thresholds remain open.

First separate the current drawing functions into reusable logical parts and shared visual definitions; prove one character rig with a held item and one animal family. Compare a small set of poses and 48 × 96 versus 96 × 192 output at the same camera scale. Check visual quality, limb layering, equipment alignment, pixel stability, cold/warm generation time, texture memory and animated crowd frame times. Add declarative composition and image-provider fallbacks after those contracts work. Preserve existing simulation behavior and the earlier immediate-effects/background-art rollout. No renderer change, paid generation, density experiment or performance test is performed by this documentation update.
