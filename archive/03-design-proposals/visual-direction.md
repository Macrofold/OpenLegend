# Visual direction — grounded pixel art in a spatial world

Status: **accepted visual direction and proposed production brief**, September 18, 2026 (America/New_York). Requirements: F25, F40–F41. The user wants beautiful browser-based pixel art, 2.5D with 3D structure, a modern feel and restrained cartoon styling. PlayCanvas is the accepted engine direction. No assets, shaders or prototypes exist. [User follow-ups V01–V04](../00-source/design-followups.md), [D02/D24](../05-project/open-decisions.md)

## What the picture should communicate

The landscape should be compelling to watch while people live within it. The proposed opening is a natural clearing with usable vegetation, uneven ground, water, natural cover, possessions and people; improvised structures appear through play. Beauty is an early product requirement alongside readable survival and social behavior.

Use detailed pixel sprites and textures within a real spatial scene. Positions, terrain height, occlusion and object footprints must agree with the authoritative world. A pixelation post-effect alone does not produce authored pixel art. The simulation may remain mechanically simple while the presentation has carefully composed lighting, texture and motion.

## Proposed art constraints

| Element | Working direction | What needs proof |
|---|---|---|
| People | Natural proportions, readable clothing/tools, expressive posture; avoid exaggerated heads and toy-like bodies | Identity and actions remain legible at the normal overview scale |
| Palette and surfaces | Earth, bark, moss, stone, muted water and warm firelight; material-specific pixel texture | A cohesive palette with clear silhouettes and hazard contrast |
| Terrain | Slopes, riverbanks, cliffs and structures with actual height where gameplay needs it | Feet, navigation, picking, shadows and occlusion agree across elevations |
| Atmosphere | Daylight changes, local firelight, subtle mist, smoke, rain and moving foliage | Affordable effects that preserve visibility and interaction clarity; exact techniques are not selected |
| Camera | Begin evaluation with a fixed elevated angle plus pan and zoom | Pixel stability, readable crowds and held-item alignment; free rotation remains an open decision |
| Interface | Sharp, readable captions and controls independent of scene resolution | Text and selection remain usable in darkness, rain, dense foliage and at different zoom levels |

Keep bloom, blur and depth effects restrained enough that people and resources remain readable. This is a production recommendation, not a locked shader recipe or a guarantee of desktop cinematic effects on every browser.

## Visual references and limits of the evidence

- [Songs of Conquest](https://www.songsofconquest.com/): reference for detailed environments and readable groups viewed from above. Borrow compositional lessons without copying its assets or fantasy setting.
- [Octopath Traveler II](https://www.square-enix-games.com/en_US/home/octopath-traveler-ii-ochette-castti-character-trailer): reference for the combination of pixel characters, 3D scenery and atmospheric lighting. Adapt the camera/readability for a society simulation.

These are visual references, not claims that either is a browser game or uses PlayCanvas. The PlayCanvas projects in the [engine research](../02-research/engines-art-and-audio.md) establish production use, not an existing pixel-art pipeline for Open Legend. The earlier Babylon.js search found limited matching finished-game evidence; showcase quality does not by itself establish an engine's visual ceiling.

## First visual proof, after implementation authorization

Build one small wilderness scene in PlayCanvas before broad asset production. Keep it part of P1 rather than a separate general engine project. Use one representative character with idle/walk/use/rest animations and a held tool; include terrain elevation, vegetation, water, shadows and a light source. Show daylight and dusk, camera panning/zooming, and a small crowd made from the same asset family.

Review motion as well as still images. Record:

1. Creator assessment of beauty, grounded tone and modern atmosphere against the references.
2. Consistent pixel density, frame registration and palette; no distracting shimmer while the camera moves.
3. Correct feet/terrain contact, depth ordering, transparency, shadows, attachments and selection.
4. Legible movement and survival actions, with readable captions and cues under different lighting.
5. Frame-time percentiles, memory, initial download and first-interaction time on agreed reference devices/browsers; target hardware and numeric budgets remain D09/R01 decisions.
6. Time spent producing and correcting the character, animations, equipment and scenery. A single attractive generated image is not a proven repeatable asset pipeline.

R01 measures presentation and browser behavior; R02 measures repeatable art production. Start with the selected PlayCanvas direction. Compare another engine only if a concrete visual, workflow or performance blocker warrants reconsideration; do not build multiple clients in advance.

## Keep art and mechanics independently extensible

Mechanics refer to stable asset IDs, semantic states and presentation cues, not PlayCanvas scene objects. Existing animation/effect families should depict new compatible recipes while missing assets are produced separately. A smoke-drying invention could reuse fire, smoke, a rack and a use gesture; its food transformation and elapsed-time rules belong to the simulation.

Maintain versioned asset manifests with scale, pivots, directional frames, animation tags, attachments, provenance, technical budgets and fallbacks. Generated images still need consistency and animation review. Broad asset generation, elaborate weather and fully free camera movement should follow evidence from this first family. See the [asset protocol](../02-research/engines-art-and-audio.md#5-asset-protocol-and-generation-workflow) and [capability lifecycle](generative-capability-lifecycle.md).
