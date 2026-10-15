# Building a dimensional pixel-art world

Research completed October 14, 2026. This collection answers Mike's supplied references and records a proposed technical route for OpenLegend. It updates the art brief; it does **not** select a production renderer, approve the mercenary's appearance, or implement the broader art pipeline.

## The direction

**Use Garbage Country for environmental form and pixel texture craft; The Last Night and REPLACED for lighting, composition, animation and fine detail; EthrA for dimensional environments and an alternative character technique.** Mike explicitly wants more detailed characters than EthrA's small world figures. Kingdom's water and silhouettes, BitGem's construction kit, and Mark Knight's illustrations contribute narrower lessons. Earlier favorites remain in the [creative brief](../../final-board/creative-brief.md).

**The follow-up changes the leading candidate to renderer-driven 3D pixel art:** shaped, animated models with controlled material colors, designed realtime lighting, deliberate sampling and selective outlines/effects. Mike called t3ssel8r's character in [this animation video](https://www.youtube.com/watch?v=1FrIBkuq0ZI) perfect. Painted textures remain useful for faces and distinctive markings, but every lit pixel need not be pre-painted. [Rendering guidance](realtime-pixel-rendering.md) explains the revised approach.

That recommendation is a proposal for comparison, not a claim that every reference uses the same pipeline. Keep painted-material and articulated-sprite alternatives as controls. Evaluate [texel splatting](texel-splatting.md) separately for perspective shimmer; its public WebGPU implementation is not a drop-in repair for our current WebGL scene or a proven animated-character solution. The existing [3D appearance project](../../../docs/projects/3d-pixel-art-feature-spec.md) retains production selection and implementation scope.

## Read in this order

The follow-up adds [realtime rendering and lighting](realtime-pixel-rendering.md), [texel splatting](texel-splatting.md), [animation tools and techniques](animation-tools-and-techniques.md), [tool and license notes](tool-and-license-notes.md), and a [complete video/source index](video-library.md).

| Document                                                  | What it answers                                                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [Screenshot gallery](gallery.md)                          | What qualities are we trying to achieve? Includes 34 locally saved reference images.                  |
| [Reference research](reference-techniques.md)             | What each creator actually disclosed, what we can infer, and what remains unknown.                    |
| [Rendering and asset techniques](rendering-techniques.md) | Surface pixels, camera stability, faces, cloth, lighting, foliage, water and bokeh.                   |
| [OpenLegend adaptation](openlegend-adaptation.md)         | What is feasible with the existing engine and camera, and how to compare it before adoption.          |
| [Generative art workflow](generative-pipeline.md)         | Which production steps generation can help with and which still need deliberate art correction.       |
| [Image provenance](image-manifest.json)                   | Original media URLs, creators, dimensions, hashes and transformations for every saved image.          |
| [Transcript provenance](transcripts/README.md)            | All seven supplied attachments, the saved scene transcript and the earlier inline camera explanation. |

## Answers to the central questions

- **Are these specially designed textures on 3D models?** Some are. Noio's pixel UV tool and BitGem's textured polygon assets directly demonstrate this route. Other examples combine sprites and 3D scenery or deliberately render ordinary models at low resolution. [Evidence](reference-techniques.md#garbage-country-and-noios-blender-tools).
- **How are EthrA's characters done?** A developer describes separate sprites for body parts, oriented and animated as a 3D character. Its world uses 3D geometry with pixel-art textures. The exact part layout, directional artwork count and shaders are unpublished. [Evidence](reference-techniques.md#ethra).
- **Does The Last Night prove all of this works with free orbit?** Its layered, hand-authored art and realtime lighting are well documented; unrestricted inspection around every character is not. Adopt its visual principles while supplying the missing sides and backs required by our camera. [Evidence](reference-techniques.md#the-last-night).
- **Is a pixel character necessarily a voxel character?** No. Voxels describe volume; pixel textures describe surface color; a low-resolution render describes the final image. These are independent choices. [Explanation](rendering-techniques.md#three-different-grids).
- **Can a shader generate this quality from any model?** A designed renderer can create attractive pixel shading, edges and effects from ordinary geometry; the new references demonstrate that direction. It still needs intentional proportions, distinguishable face features and a correctly fitted cape. Realtime rendering and asset authorship work together.
- **Can generation help?** Yes, especially with concept variants, rigid props and bounded texture candidates. Consistent multi-view faces, UV placement, clothing fit and animation still require review and correction. No production quality, cost or latency was measured in this research. [Workflow](generative-pipeline.md).

## Evidence and limits

The realtime follow-up reviewed five additional attachments, the inline scene transcript, public creator descriptions, tool documentation and pinned texel-splatting/grass source. All ten newly supplied video links are indexed. The outline attachment was identified as Robin Seibold’s tutorial, distinct from Eduardo Schildt’s showcase. The follow-up inspected the current client and installed engine at repository commit `631835866`; the existing application creation path uses WebGL, and the pinned engine supports glTF held-key interpolation. Neither finding establishes an integrated pixel renderer or animation pipeline. No video playback, paid package inspection or runtime benchmark is claimed.

### Original reference-library delivery

The sources were reviewed on October 14, 2026. Direct creator explanations, official media and supplied transcripts are distinguished from visual observations and our proposals. The local code inspection used checkout `/Users/mzw/.codex/worktrees/415f/OpenLegend`, branch `codex/mercenary-voxel-art`, commit `26f622ec70bd96506e2b1e396691156e7cf41f2a`; this identifies the inspected snapshot, not a new integration base. No checkout or branch was changed.

The library contains published screenshots, product previews, two frames extracted from official animated images, two tool illustrations and two artist illustrations. It does not pretend all 34 files are captures from running games. All were decoded and visually inspected; original image bytes are preserved except the explicitly recorded GIF-to-PNG frame extraction. Gallery captions are visual analysis, not evidence of hidden shader internals.

Delivery checks verified all 34 image hashes/file sizes, decoded image formats, unique image IDs, both transcripts against the supplied attachments, and all newly added local links and heading references. Changed project documents and the new research documents passed the pinned formatter; the affected diff passed whitespace review. A broader link scan also found one pre-existing obsolete anchor in the historical documentation changelog, outside the changed entry. No game tests or rendering benchmarks were run for this documentation-only change.

Some requested sites limited access: Kickstarter and Sketchfab did not expose useful technical content, several Reddit media downloads returned 403, and an additional browser capture was rejected by automatic approval. Creator statements and official media supplied the alternatives. No unavailable video is claimed to have been watched. The original source links remain in the research ledger, including references with text-only coverage.

**Rights:** reference/research use only. Creators retain their artwork rights. These files are not licensed OpenLegend game assets and do not inherit the repository's software license. Their presence does not authorize tracing, redistribution as an asset pack, model training, or upload to a generation service. Keep production inputs separate and verify their rights.

## Scope and completion

This documentation task affected zero executable logic lines. Its plan was to verify the references and transcripts, preserve a credited image library, explain the techniques, connect them to the existing art/pipeline design, and validate the resulting documents and files. Those research deliverables are complete. Runtime experiments, paid generation and an engine change were outside this task; proposed experiments remain under [V3D01](../../../docs/maintainers/3d-pixel-art.md#v3d01--visual-comparison-and-style-decision).
