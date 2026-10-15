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

**Proposed, not accepted:** complete shaped models with deliberately painted pixel textures are the leading general-purpose comparison candidate for our free camera. Compare articulated sprites and optional lower-resolution presentation under [V3D01](../docs/maintainers/3d-pixel-art.md#v3d01--visual-comparison-and-style-decision). No universal voxel requirement, production texel density, outline style, blur level, engine migration or automatic generation-quality claim follows from this research. The [creative brief](final-board/creative-brief.md#dimensional-pixel-art--october-14-direction) owns the visual interpretation; existing project records own implementation and acceptance.

## Decision entry format

Date · decision · relevant reference IDs · user rationale · open implications.

Record explicit user choices here after discussion. Keep exploratory ratings and assistant suggestions in `feedback.md` until adopted.
