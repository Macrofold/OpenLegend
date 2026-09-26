# Visual direction — grounded pixel art in a spatial world

## Camera freedom and physical shape

The target now supports [orbit, pitch and projection](../../docs/spatial-world.md#tactical-camera-and-perspective), with optional sprite-friendly locks rather than a fixed-camera engine restriction. Preserve the painted/procedural style: simple physical terrain/ramp/deck geometry can carry painted textures, while people and creatures may remain sprites. A backdrop’s view validity must be explicit; painted art cannot expose a correct unseen backside. Existing asynchronous art/provenance rules remain unchanged.

Status: **accepted visual direction and proposed production brief**. Requirements: F25, F40–F41. OpenLegend targets beautiful browser-based pixel art, 2.5D with 3D structure, a modern feel and restrained cartoon styling. PlayCanvas is the accepted engine direction. This document owns style and artistic evaluation; [Architecture](../../docs/architecture.md) and [Verification](../../docs/verification.md) own implementation and evidence. The coordinated feature starts at [Invention foundation](../../docs/invention-foundation.md); the detailed generation/publication owner is [Runtime invention art](../../docs/invention-art-pipeline.md).

The [UI design-system handoff brief](../../docs/ui-design-brief.md) records the dark green adventure interface direction, theme boundaries and current interaction requirements for external design work. [User follow-ups V01–V04](../00-source/design-followups.md) and [D02/D24](../05-project/open-decisions.md) retain the relevant references and remaining choices.

## What the picture should communicate

The landscape should be compelling to watch while people live within it. The proposed opening is a natural clearing with usable vegetation, uneven ground, water, natural cover, possessions and people; improvised structures appear through play. Beauty is an early product requirement alongside readable survival and social behavior.

Use detailed pixel sprites and textures within a real spatial scene. Positions, terrain height, occlusion and object footprints must agree with the authoritative world. A pixelation post-effect alone does not produce authored pixel art. The simulation may remain mechanically simple while the presentation has carefully composed lighting, texture and motion. The spatial runtime owns XYZ position, supported surfaces, physical extents and camera view validity; art cannot extend its supported geometry or locomotion families.

## Proposed art constraints

| Element | Working direction | What needs proof |
| --- | --- | --- |
| People | Natural proportions, readable clothing/tools, expressive posture; avoid exaggerated heads and toy-like bodies | Identity and actions remain legible at the normal overview scale |
| Palette and surfaces | Earth, bark, moss, stone, muted water and warm firelight; material-specific pixel texture | A cohesive palette with clear silhouettes and hazard contrast |
| Terrain | Slopes, riverbanks, cliffs and structures with actual height where gameplay needs it | Feet, navigation, picking, shadows and occlusion agree across elevations |
| Atmosphere | Daylight changes, local firelight, subtle mist, smoke, rain and moving foliage | Affordable effects that preserve visibility and interaction clarity; exact techniques are not selected |
| Camera | Tactical orbit, pitch, pan, zoom and projection with optional sprite-friendly locks | Pixel stability, crowd readability, held-item alignment and truthful view validity; missing directions need a supported fallback |
| Interface | Sharp, readable captions and controls independent of scene resolution | Text and selection remain usable in darkness, rain, dense foliage and at different zoom levels |

Keep bloom, blur and depth effects restrained enough that people and resources remain readable. This is a production recommendation, not a locked shader recipe or a guarantee of desktop cinematic effects on every browser.

## Visual references and limits of the evidence

- [Songs of Conquest](https://www.songsofconquest.com/): reference for detailed environments and readable groups viewed from above. Borrow compositional lessons without copying its assets or fantasy setting.
- [Octopath Traveler II](https://www.square-enix-games.com/en_US/home/octopath-traveler-ii-ochette-castti-character-trailer): reference for the combination of pixel characters, 3D scenery and atmospheric lighting. Adapt the camera/readability for a society simulation.

These are visual references, not claims that either is a browser game or uses PlayCanvas. The PlayCanvas projects in the [engine research](../02-research/engines-art-and-audio.md) establish production use, not an existing pixel-art pipeline for Open Legend. The earlier Babylon.js search found limited matching finished-game evidence; showcase quality does not by itself establish an engine's visual ceiling.

## First visual proof, after implementation authorization

Build one small wilderness scene in PlayCanvas before broad asset production. Keep it part of P1 rather than a separate general engine project. Use one representative character with idle/walk/use/rest animations and a held tool; include terrain elevation where supported, vegetation, water, shadows and a light source. Show daylight and dusk, camera panning/zooming, and a small crowd made from the same asset family.

Review motion as well as still images. Record:

1. Creator assessment of beauty, grounded tone and modern atmosphere against the references.
2. Consistent pixel density, frame registration and palette; no distracting shimmer while the camera moves.
3. Correct feet/terrain contact, depth ordering, transparency, shadows, attachments and selection.
4. Legible movement and survival actions, with readable captions and cues under different lighting.
5. Frame-time percentiles, memory, initial download and first-interaction time on agreed reference devices/browsers; target hardware and numeric budgets remain D09/R01 decisions.
6. Time spent producing and correcting the character, animations, equipment and scenery. A single attractive generated image is not a proven repeatable asset pipeline.

R01 measures presentation and browser behavior; R02 measures repeatable art production. Start with the selected PlayCanvas direction. Compare another engine only if a concrete visual, workflow or performance blocker warrants reconsideration; do not build multiple clients in advance.

## Keep art and mechanics independently extensible

The accepted [hybrid visual-system direction](procedural-art-and-animation.md) combines reusable 2D rigs, trusted procedural shapes/materials, state-based effects and authored or generated images. That specification distinguishes cheap new combinations from unsupported visual novelty, articulated models from frame variations, and higher pixel density from genuinely added detail.

A smoke-drying invention might visually reuse fire, smoke, a rack and a use gesture while its actual food transformation and elapsed-time behavior belong to the simulation. This illustrates the [shared presentation contract](../../docs/invention-art-pipeline.md#2-the-shared-presentation-contract), rather than a second asset schema in this document.

The [asset research](../02-research/engines-art-and-audio.md#5-asset-protocol-and-generation-workflow) and [capability lifecycle](generative-capability-lifecycle.md) remain useful background. Runtime artifact requirements, validation, state binding, rights and publication are owned by the pipeline below. Broad asset generation, elaborate weather and fully free camera movement should follow evidence from a representative family.

## Art generated during play

Players should see meaningful visual consequences immediately, while missing invention, creature and transformation artwork can be produced during play and reused. `During play` does not promise a new image or animation within one rendering frame. The runtime pipeline supports an adequate native fallback, optional fast rough generation, optional refinement and additional directions/states, and policy-governed review/promotion. Exact reuse or native composition can be the final result; these are not mandatory paid stages.

The motivating example remains a rabbit showing an appropriate death pose and supported wound/stain cues after an actual successful action, with better missing artwork produced separately. Current procedural fallback behavior and unimplemented richer effects belong in [Architecture](../../docs/architecture.md); no runtime-generation or bleeding implementation is claimed here.

### State is authoritative

See [Runtime art: purpose and state authority](../../docs/invention-art-pipeline.md#1-purpose-and-non-negotiable-behavior) and [compatible publication](../../docs/invention-art-pipeline.md#7-durable-work-storage-and-publication). A request to kill is not proof of death, a stain is not automatically active blood loss, and late artwork cannot resurrect a harvested animal. These headings remain navigation for existing references; the detailed requirements have one owner.

### Generation, validation and publication

Use the [staged pipeline](../../docs/invention-art-pipeline.md#3-stages-and-selection-order), [presentation requirements](../../docs/invention-art-pipeline.md#2-the-shared-presentation-contract), and [validation contract](../../docs/invention-art-pipeline.md#6-validation-before-publication). The [invention coordinator](../../docs/invention-foundation.md#5-one-workflow-with-independent-work-branches) decides when mechanical and art work may proceed independently and what readiness permits live use.

[Confirmed god-mode conjuring](world-agent-and-workshop.md#confirmed-god-mode-conjuring) retains its own concrete preview and spending/creation confirmation. Supporting art follows that confirmation automatically where needed; it cannot supply missing mechanics or bypass confirmation through speculative generation.

### Persistence, reuse and service boundaries

Use [durable work/publication](../../docs/invention-art-pipeline.md#7-durable-work-storage-and-publication), [shared generation](../../docs/invention-art-pipeline.md#8-cancellation-supersession-and-shared-generation), [save/pack retention](../../docs/invention-art-pipeline.md#10-retention-saves-and-packs), and [provider boundaries](../../docs/invention-art-pipeline.md#11-provider-and-orchestrator-boundaries). [Production data](../07-technical-architecture/production-data-model.md#9-inventions-configuration-rules-rights-and-packs) remains the physical-record/transaction owner.

Complex conjuring tools remain under [INV-4.9](../../docs/maintainers/inventions-and-world-evolution.md#inv-4--give-the-creator-useful-scoped-world-investigation-and-workshop-tools). A bounded harness may inspect permitted assets and findings; it is not a per-entity rendering authority or a requirement to regenerate repeatedly.

### Costs, allowances and delivery

Use [art efficiency and cost](../../docs/invention-art-pipeline.md#9-cost-caching-and-runtime-efficiency), [invention budgets](../../docs/invention-budgets.md), and the existing [billing art category](../07-technical-architecture/billing-and-usage-reporting.md#art-generation-costs). Invention entitlements remain owned by billing/business policy; this visual design selects no unit count or price.

Detailed delivery and acceptance live in [INV-12](../../docs/maintainers/inventions-and-world-evolution.md#inv-12--progressive-in-game-art-and-compatible-publication) and [INV-14](../../docs/maintainers/inventions-and-world-evolution.md#inv-14--integrated-qualification-and-staged-release). The integrated gates include immediate truthful state feedback, malformed/misaligned art rejection, no duplicate generation, identity preservation, provider outage, late art after state changes, rights-safe retention/export, and no extra invention-unit debit for existing-mechanic art. Numeric/provider/visual-review tuning remains with the existing decisions/research owners rather than being inferred from a successful fixture.
