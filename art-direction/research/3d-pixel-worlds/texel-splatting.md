# Texel splatting and perspective stability

Research reviewed October 14, 2026. This is a promising **separate rendering experiment**, not a demonstrated fix for OpenLegend's animated mercenary. It changes how scene samples are placed; it does not turn the character into a permanent volume of colored cubes.

## What the paper establishes

Dylan Ebert's [paper, project and demonstration](https://dylanebert.com/texel-splatting/) address a real weakness of camera snapping: in perspective, objects at different depths move across the image at different rates. A single camera offset cannot align them all. The method captures scene surfaces from stable positions, shades the captured samples, then draws them as small world-space quadrilaterals. These are texel splats, distinct from the Gaussian splats commonly used for reconstructed scenes.

The [March 2026 paper](https://arxiv.org/pdf/2603.14587) combines camera-centered, grid-centered and previous captures. It explicitly retains limitations around newly visible surfaces, transitions between capture positions, animated geometry and view-dependent effects. It is evidence for improving perspective stability, not a guarantee that every pixel remains unchanged under every camera or pose change. Its reported device timings are not OpenLegend measurements.

## What the public implementation contains

The following details come from direct inspection of the [MIT source](https://github.com/dylanebert/texel-splatting/tree/394d350f91842779ed4c45760bd4ea9a07ce5c4c), pinned at `394d350f91842779ed4c45760bd4ea9a07ce5c4c`. No external implementation was copied into the game.

| Source                                                                                                                       | Inspected behavior                                                                                                           | Integration implication                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Capture code](https://github.com/dylanebert/texel-splatting/blob/394d350f91842779ed4c45760bd4ea9a07ce5c4c/src/cubemap.ts)   | Captures material color, normals, radial depth and object identity; contains procedural surface materials and lighting work. | This is a scene-rendering path, not a final-image filter that can be applied to any screenshot.                                                                   |
| [Splat renderer](https://github.com/dylanebert/texel-splatting/blob/394d350f91842779ed4c45760bd4ea9a07ce5c4c/src/splat.ts)   | Arranges six directions for each of eye, grid and previous captures in 18 texture layers and reconstructs the final view.    | Multiple attachments, capture updates and splat drawing affect memory and frame cost. Layer count alone does not mean all 18 faces are fully redrawn every frame. |
| [Lighting](https://github.com/dylanebert/texel-splatting/blob/394d350f91842779ed4c45760bd4ea9a07ce5c4c/src/lighting.ts)      | Defines shared lighting/material calculations.                                                                               | Lighting and sample placement can be studied separately. A stable sample can still change color under moving light.                                               |
| [Demo entry point](https://github.com/dylanebert/texel-splatting/blob/394d350f91842779ed4c45760bd4ea9a07ce5c4c/demo/main.ts) | Requests a WebGPU adapter/device and manages the demonstration's drawing.                                                    | It is standalone TypeScript/WGSL, not an existing PlayCanvas component.                                                                                           |

A capture is a group of images looking in six directions from one location, often called a cubemap. A fixed capture origin can give scene samples a stable reference as the viewing camera moves nearby. Replacing or supplementing that capture changes which surfaces have samples. Surfaces hidden from the capture position still need a strategy when the viewing camera reveals them.

That distinction matters for the complaint about pixels moving. A stationary stone wall, a head turning on its neck and a cape folding are different workloads. Stabilizing the wall does not establish that eyes remain readable through head motion, nor that a garment covers the body. Cloth intersections remain an asset/animation problem.

## Fit with OpenLegend

The inspected client pins PlayCanvas 2.22.2. Its [scene startup](../../../apps/client/src/scene.ts) uses `pc.Application`; the installed implementation constructs a WebGL graphics device. The texel-splatting demo instead uses WebGPU compute and rendering. PlayCanvas documents [compute shaders as WebGPU-only](https://developer.playcanvas.com/user-manual/graphics/shaders/compute-shaders/). Existing Gaussian-splat support does not supply this different algorithm.

There are two plausible research paths, neither selected for production:

- Run the public demonstration separately with representative static geometry to establish the visual benefit and failure cases before touching the application.
- If that benefit survives the comparison, investigate a PlayCanvas WebGPU integration or a differently structured WebGL implementation. The latter is new engineering, not a source translation with guaranteed parity. Changing the application's graphics backend also needs qualification of existing materials, selection, depth/reveal and device support.

Ordinary toon lighting, render targets and a separate effects pass do not require this backend change. [Realtime rendering](realtime-pixel-rendering.md) therefore remains the first experiment; texel splatting answers the more specific perspective-stability question.

## A comparison that can reject the idea

Use one scene with a face, a thin railing, overlapping stone surfaces, a cape and a glossy prop. Compare equal framing and comparable apparent detail. Record what changes when only one variable changes:

| Experiment                                              | What to observe                                                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Fixed scene, camera translating within a capture region | Whether stable material marks crawl, and whether the improvement survives foreground/background depth differences. |
| Camera crossing a capture boundary                      | Fades, replacement patterns, popping and delay.                                                                    |
| Camera orbiting behind an occluder                      | Missing surfaces, eye-capture fill and visible changes in sampling.                                                |
| Character walking and turning its head                  | Deformation, silhouette changes, eye readability and whether apparently stable pixels survive skinning.            |
| Cape and transparent effects                            | Body coverage, ordering, cutout edges and compatibility with the separate effects target.                          |
| Moving light with fixed geometry/camera                 | Intentional shading changes versus sample instability; specular highlights deserve separate inspection.            |
| Zoom, resize and device changes                         | Detail policy, target allocation, backend availability and memory pressure.                                        |

Measure complete-frame CPU/GPU time and memory, not only the final splat pass. Capture cost depends on geometry, updated faces and lighting; splat cost also depends on sample count and overlap. Doubling each face's width and height quadruples samples and attachment storage. Invalidate only the affected data: geometry captures depend on geometry, pose, capture placement and permitted visibility; cached shaded results also depend on lighting. A light change need not rebuild unchanged geometry if shading is a separate stage. Camera movement alone is not a sufficient invalidation rule.

**Decision criterion:** retain the method only if its stability improvement outweighs transition artifacts, animated-character limitations, integration cost and supported-device restrictions. No numerical production limits or engine migration are adopted here. The [existing comparison task](../../../docs/maintainers/3d-pixel-art.md#v3d01--visual-comparison-and-style-decision) remains open.
