# Art-direction decisions

## Confirmed scope — September 19, 2026

- Explore a broad collection of beautiful pixel-art games, particularly 2.5D, including Steam references, sprites, asset packs, and concept art.
- Inspiration is not limited to PlayCanvas, Three.js, browser games, or a particular rendering implementation.
- Keep references, future art decisions, and assets together in this folder.

## Existing project context

The earlier `archive/03-design-proposals/visual-direction.md` describes a grounded, detailed pixel-art direction with natural proportions and an earth/moss/fire palette. This is inherited context. The current request opens a broad comparison; it does not, by itself, approve or reject a replacement style.

The primitive wilderness setting is useful context when discussing references. The collection also includes cities, established settlements, exaggerated characters, and non-pixel painting to explore individual visual qualities.

## Preferences established by round-one feedback — September 19, 2026

Evidence: [saved feedback](feedback.json), [verbatim record](round-01-feedback-record.md), and [analysis with examples](round-01-analysis.md). These preferences guide further research; they do not finalize the renderer, assets, camera, or sprite dimensions.

- **Fine pixel density and definition:** avoid conspicuously chunky or simplistic forms. REPLACED (G30) and Tails Noir (G32) are the strongest overall benchmarks.
- **Recognizable individuals:** clothing, equipment, body shapes, skin tones, and faces should read on world characters. Eastward (G12) illustrates an environment the user likes with characters that remain too simple.
- **Cinematic lighting and material response:** atmospheric depth, reflective water, and deliberate illumination are positives. REPLACED, Tails Noir, Octopath II (G01), and Ferrari (C03) supply different examples.
- **Rich, organic environments:** deliberate props, foliage, surfaces, and depth; avoid an obviously repeated grid. Core Keeper (G20) supplies the latter objection despite liked lighting.
- **Expressive but controlled color:** Owlboy (G22), Eastward, and Children of Morta (G11) supply appealing richness. Excessive saturation and cartoon-like proportions are recurring negatives.
- **Life and warmth alongside atmosphere:** cinematic does not mean permanently gloomy. Holstin (G05) and Rain World (G24) show detail worth studying but an unwanted depressing mood.

Open: the minimum world-sprite detail, character screen size, overhead versus side-view translation, blur, exact palette, and compatibility with a primitive wilderness setting. A Like applies to the described qualities, not automatically the entire game's style.

The [second board](round-02/index.html) explores these remaining questions. It keeps 17 new references and three benchmarks separate from the original board and feedback.

## Concept art with Midjourney — September 27, 2026

- 2026-09-27 · Generate painted **concept art** of Threewater March characters with Midjourney, not pixel art · no reference IDs · Mike: "I'm looking for concept art, by the way, not pixelated art. Even though that's the eventual art style, I want to generate concept art." · Prompts follow the [Midjourney guide](midjourney/README.md); the in-game pixel look is still produced separately. Faces and bodies in prompts are invented until Mike picks a look for each character.

## Choices to resolve from feedback

The following earlier questions remain useful, but the October 14 preferences below now narrow the visual target. They do not settle a renderer or character representation.

1. Character proportions and how much individual identity is visible at the normal camera scale.
2. Pixel density and fine texture versus broad, readable shapes.
3. Natural, pastel, or deliberately heightened color palettes.
4. Flat illustration, diorama depth, or another spatial presentation.
5. Light: crisp and restrained, atmospheric, or strongly cinematic.
6. Foliage density, terrain texture, and amount of visual clutter.
7. Gesture, everyday work, rest, animal behavior, and ambient animation.
8. Which qualities must remain consistent across purchased, commissioned, or original assets.

## Dimensional pixel-art references — October 14, 2026

Evidence: Mike's supplied game/artist links, two attached transcripts and the resulting [research collection](research/3d-pixel-worlds/README.md).

- **Garbage Country is a leading environment reference.** Mike especially likes its appearance; study shaped forms, pixel texture craft, foliage, water and atmospheric distance.
- **The Last Night is a leading overall finish reference.** Mike strongly endorses its pixel art, lighting, bokeh and dimensional presentation, and wants as much of that visual quality as is feasible for OpenLegend. This endorses qualities, not the city setting or a restricted side-view camera.
- **EthrA's environments are endorsed; its character detail is not the target.** Mike explicitly wants higher-fidelity pixels on characters. Research supports articulated sprite parts for EthrA's characters; that is an option to compare, not an adopted implementation.
- **REPLACED remains a strong pixel-art benchmark.** Its fine detail, animation and cinematic composition reinforce the existing preference for recognizable people and deliberate lighting.
- **Kingdom, BitGem's dungeon, Mark Knight, Holland and the supplied renderer demonstrations contribute specific lessons.** Their visual qualities do not imply that all are built with the same technology or should be copied wholesale.

**Earlier proposal, superseded by the follow-up below:** painted shaped models led the first free-camera comparison recommendation because the initial Noio/BitGem evidence showed stable authored surface detail. The new realtime examples demonstrate a broader route, so mandatory painted finishing is not the current recommendation. The [creative brief](final-board/creative-brief.md#dimensional-pixel-art--october-14-direction) owns visual interpretation; project records own implementation and acceptance.

## Realtime pixel rendering and animation — October 14, 2026

Evidence: Mike’s ten additional video links, five attached transcripts, inline scene transcript, texel-splatting paper/source and resulting [follow-up research](research/3d-pixel-worlds/realtime-pixel-rendering.md).

- **t3ssel8r’s animated character is a leading character-quality reference.** Mike called the character in [Making an Animation for my 3D Pixel Art Game](https://www.youtube.com/watch?v=1FrIBkuq0ZI) “perfect.” Study shape, clear features, lighting, motion and effects together; the animation transcript does not publish its exact pixel shader.
- **Realtime generation of pixel shading is explicitly desired for investigation.** A deliberate renderer can produce final pixel clusters from ordinary modeled geometry and controlled materials. Preserve earlier environmental and cinematic preferences.
- **Perspective shimmer is a concrete research concern.** The texel-splatting paper addresses that concern, but its animated-geometry limitations and our graphics-backend integration remain unproven. Stable pixels do not require a cube-built body or cape.

**Research-stage proposal, followed by the agreed direction below:** test the renderer-driven animated scene first, retain painted-material and articulated-sprite controls, and investigate static texel splatting separately under [V3D01](../docs/maintainers/3d-pixel-art.md#v3d01--visual-comparison-and-style-decision). No production sampling density, outline style, animation cadence, engine migration, paid tool purchase or generation-quality guarantee is selected. [Animation guidance](research/3d-pixel-worlds/animation-tools-and-techniques.md) and [license notes](research/3d-pixel-worlds/tool-and-license-notes.md) inform later choices without authorizing implementation.

## Existing starting-scene art revision — agreed direction and scope

Mike agreed to the proposed artistic direction and requested revisions plus tracked tasks, including tests of different techniques. The [first-scene plan](../docs/projects/3d-pixel-art-first-scene-plan.md) now makes renderer-driven shaped characters the leading route, with Garbage Country's environmental clarity and The Last Night/REPLACED's purposeful lighting and fine detail. Continuous cloth and targeted face artwork are appropriate; painted-material, sprite and 2D-rig alternatives remain available. This promotes the follow-up's artistic recommendation to an agreed direction, not a chosen shader or backend.

The sequence is character baseline → art comparisons in the existing starting scene → controlled pixel/light/edge comparisons → motion/vegetation/effects → authored/generated coherence and measured application review → creator acceptance. Static texel splatting is a separate investigation that cannot block the ordinary renderer candidate. [V3D01.1–V3D01.12](../docs/maintainers/3d-pixel-art.md#first-scene-delivery-and-experiment-tasks) record deliverables and decisions. Mike clarified that the already-existing starting scene is the baseline for all of this work: preserve its broader playtesting content and initialization, and add only needed art-demonstration subjects. A new playable scene from scratch is outside scope. Technique rejection is a useful result, and water/strong bokeh/complex reflections remain conditional. That earlier request delivered documents and tasks; the document edits themselves did not authorize implementation. Mike’s subsequent explicit implementation request authorized the tracked experiments and integrated candidate below.

## Implemented candidate awaiting creator review — October 15, 2026

Mike subsequently requested implementation of V3D01.1–V3D01.12 on the finalized mercenary baseline. The [combined experiment record](../docs/verification/starting-scene-pixel-art.md) now documents actual material/light/sampling/outline/motion/vegetation/effects trials, standalone texel splatting, the authored/generated pair, representative native play and physical-device measurements. The original starting-world content and active playtesting progress are preserved.

The provisional candidate uses the original shaped character with conforming facial details, modest tallness, fixed 96-row character pixels, restrained material regions, softened lighting, held walking poses and continuous cloth. Grouped vegetation, quiet ground, smooth optional wind and an attributed generated chest share the scene treatment. Whole-scene downsampling, permanent internal outlines, a separate effects image and texel-splatting integration were rejected or deferred for the recorded visual/cost reasons. These are implementation choices offered for review, **not new explicit art choices or approval by Mike**. Camera sampling can still change pixel clusters; this does not claim permanent 3D cells. Water remains at the existing treatment; strong bokeh, complex reflections and specialized many-light rendering were not justified for this scene.

Mike’s final moving-scene review remains open. Only his actual feedback can accept this candidate or change the adopted art direction. General arbitrary-asset publication, imported-character production rights, broader rig/equipment families and wider population/device qualification remain with their existing owners. No paid provider request was made: additional and cumulative cost $0, reserved or uncertain commitments $0.

## Decision entry format

Date · decision · relevant reference IDs · user rationale · open implications.

Record explicit user choices here after discussion. Keep exploratory ratings and assistant suggestions in `feedback.md` until adopted.
