# Visual direction — grounded pixel art in a spatial world

## World presentation ownership

[World presentation](../../docs/world-presentation.md) owns the accepted continuous right-drag orbit/pitch, primary/middle pan, mixed sprite/mesh depth, default illumination, projected shadows and configurable local character-visible read-through. These are presentation settings, not extra bodily perception. Follow that owner where older fixed-camera, unlit-art or right-button-pan directions conflict; SW18 retains visual qualification and further art work.


## Camera freedom and physical shape

The target now supports [orbit, pitch and projection](../../docs/spatial-world.md#tactical-camera-and-perspective), with optional sprite-friendly locks rather than a fixed-camera engine restriction. Preserve the painted/procedural style: simple physical terrain/ramp/deck geometry can carry painted textures, while people and creatures may remain sprites. A backdrop’s view validity must be explicit; painted art cannot expose a correct unseen backside. Existing asynchronous art/provenance rules remain unchanged.

Status: **accepted visual direction and proposed production brief**, updated September 19, 2026 (America/New_York). Requirements: F25, F40–F41. The user wants beautiful browser-based pixel art, 2.5D with 3D structure, a modern feel and restrained cartoon styling. PlayCanvas is the accepted engine direction. A procedural-art prototype now exists; the richer production family and runtime AI asset generation below remain unimplemented. [User follow-ups V01–V04](../00-source/design-followups.md), [D02/D24](../05-project/open-decisions.md)

The [UI design-system handoff brief](../../docs/ui-design-brief.md) records the dark green adventure interface direction, proposed React Aria stack, theme boundaries and current interaction requirements for external design work. Technology adoption remains proposed.

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

The accepted [hybrid visual-system direction](procedural-art-and-animation.md) combines reusable 2D rigs, trusted procedural shapes/materials, state-based effects and authored or generated images. Procedural generation remains a long-term option as the prototype drawing code evolves. That specification distinguishes cheap new combinations from unsupported visual novelty, articulated models from frame variations, and higher pixel density from genuinely added detail.

Mechanics refer to stable asset IDs, semantic states and presentation cues, not PlayCanvas scene objects. Existing animation/effect families should depict new compatible recipes while missing assets are produced separately. A smoke-drying invention could reuse fire, smoke, a rack and a use gesture; its food transformation and elapsed-time rules belong to the simulation.

Maintain versioned asset manifests with scale, pivots, directional frames, animation tags, attachments, provenance, technical budgets and fallbacks. Generated images still need consistency and animation review. Broad asset generation, elaborate weather and fully free camera movement should follow evidence from this first family. See the [asset protocol](../02-research/engines-art-and-audio.md#5-asset-protocol-and-generation-workflow) and [capability lifecycle](generative-capability-lifecycle.md).

## Art generated during play

**Accepted follow-up — September 19, 2026:** players should see meaningful visual consequences immediately, while missing artwork for inventions, creatures and unusual transformations can be generated during play and reused. The user's example is “kill the rabbit,” followed by a visibly dead, bleeding rabbit. The agreed approach has two layers; “during play” does not promise a new image or animation within a rendering frame. Provider latency, repeatable visual quality and cost still need measurement.

| Layer | Behavior | Example |
|---|---|---|
| Immediate state-based presentation | Existing poses, reusable overlays, particles and material changes respond to committed state through ordinary rendering code | A rabbit falls into a death pose; supported wounds/blood appear; fire leaves scorch marks |
| Background generation for missing art | Reuse a compatible asset first; otherwise request a bounded generation job while a readable fallback remains visible | A new trap receives its own sprite; an unfamiliar creature gains a matching corpse variant |

Today, `apps/client/src/art.ts` draws procedural animal art, darkens it for death, and `scene.ts` rotates the corpse sprite. That is the current visual fallback, not an implemented bleeding system or image-generation pipeline. Richer death poses, wound/blood effects and background generated art are future work.

The [confirmed god-mode conjuring workflow](world-agent-and-workshop.md#confirmed-god-mode-conjuring) also requests missing artwork automatically for an approved named or random object. Preview the object, properties, placement and bounded art allowance before explicit confirmation; paid art dispatch follows confirmation and spending admission. Reuse compatible assets or procedural composition before generating missing art. Track definition readiness, instance creation and art publication separately: a mechanically valid conjured object can use a truthful fallback while art is pending, and art cannot supply missing mechanics. No separate user art request is needed; failed generation remains visible without automatic paid retries.

### State is authoritative

A player intention first resolves through the game rules. “Kill the rabbit” is not proof that a hit succeeded or the animal died. Render death, wounds and any ongoing bleeding only when the committed outcome and supported visual-state contract justify them. A blood decal can be presentation without detailed fluid simulation; it cannot invent blood loss, damage or other mechanics. Distinguish a lingering blood stain from active bleeding. Art containing a wound or flame never installs an injury or combustion rule.

Generation never blocks action resolution, survival, harvesting or ordinary simulation. Keep a truthful fallback for every required state. If a rabbit is harvested, removed or otherwise changes state while artwork is being generated, a late result cannot recreate it, revert its state or attach the wrong pose. The result may still be retained as a reusable library asset. Bind presentation using current entity identity, applicable definition/style versions and visual state when the client applies it; a stale presentation request is not permission to change the world.

### Generation, validation and publication

1. Resolve the desired visual from committed state or an admitted definition. Search for an authorized reusable asset, then a compatible trusted procedural composition/state variant before creating paid work. An unseen combination of supported parts can be generated locally; a missing visual vocabulary may require authored or image-generated art. Ordinary known-state routing uses code; optional Jev classification is reserved for ambiguous new visual requests, not each death, frame or menu opening.
2. Show the compatible fallback immediately. Queue only missing or explicitly requested improved artwork within art permissions, capacity and spending limits. Coalesce matching requests so many rabbit deaths cannot launch the same generation repeatedly.
3. Supply authorized base sprites/reference art, the world's style revision and a bounded asset specification: subject identity/features, desired state, palette, pixel density, camera angle, dimensions, transparent background, pivot, attachments and needed directions/frames. Preserve the same rabbit's appearance instead of generating an unrelated animal. A single attractive still is not proof of a usable animation sheet.
4. Validate decoded file type/size, dimensions, transparency, palette/style fit, silhouette, scale, pivot, frame alignment and directional/animation consistency. Check readability and that the art does not imply unsupported state or misleading geometry. Use the configured visual review/publication policy; exact automatic versus human review thresholds remain open. Invalid or failed work leaves the fallback intact without a paid retry loop.
5. Persist the approved asset and publish an immutable manifest version. Clients fetch it asynchronously and apply it only to matching current visual states. Art revisions and rollbacks remain separate from mechanic revisions; improved appearance cannot change collision, reach, damage or other gameplay outcomes.

### Persistence, reuse and service boundaries

Use the [production data model](../07-technical-architecture/production-data-model.md#9-inventions-configuration-rules-rights-and-packs): durable artifact bytes in object storage (or a local file adapter), with database records for identity, digest, provenance, rights, manifest versions and state bindings. Pin assets needed by worlds and exported invention packs independently of temporary model-run traces or workspace cleanup. Reloads reuse saved definitions and artifacts without new paid art generation; a missing local procedural cache may be rebuilt from retained, versioned visual recipes. The [hybrid contract](procedural-art-and-animation.md#proposed-contracts-caching-and-delivery) separates that local rasterization from authoring and exact-byte artifact retention.

Reuse should match the base asset/definition version, supported visual state, style revision, camera/direction and presentation contract. Sharing respects scope and rights; a matching hash is not permission to read a private world's art. A suitable dead-rabbit variant serves subsequent compatible deaths, while a distinctive invented trap can retain its own artwork. Portable packs carry the permitted art and exact dependencies alongside definitions; private prompts, conversations and NPC memories are not included automatically.

Macrofold can coordinate the bounded image-generation and validation job through replaceable execution/artifact interfaces. Open Legend owns which visual is needed, permitted references, state bindings, validation policy, publication and funding. Macrofold returns artifacts and execution receipts; it does not mutate entities or decide a rabbit died. No permanently running per-entity sandbox or image call in the simulation loop is required. This is proposed Macrofold support, not a verified existing integration.

For complex confirmed conjuring, a later harness may inspect reusable assets and definition requirements, request the approved missing art and examine validation findings before publication. This is a bounded coordination capability, not a requirement for repeated image generation. Preserve the current fallback, separate art from mechanical authority and yield while a generation job is pending. [INV-4.9](../../docs/maintainers/inventions-and-world-evolution.md#inv-4--give-the-creator-useful-scoped-world-investigation-and-workshop-tools) owns this optional extension after the basic art pipeline; failures do not authorize paid regeneration.

### Costs, allowances and delivery

Give optional image generation an explicit art spending allocation within the relevant overall spending ceiling. Attribute image generation, any Jev/LLM planning, validation compute and storage without double-counting workflow totals. Show image/art spending separately in [billing reports](../07-technical-architecture/billing-and-usage-reporting.md#art-generation-costs). Exhausted or unavailable generation leaves existing assets and immediate effects usable.

Killing a rabbit, depicting its death, reusing a sprite or generating a missing visual variant of an existing mechanic consumes no player invention unit. A newly admitted mechanic follows its [subscription invention allowance](../06-marketing/business-plan.md#player-subscription-tiers-and-invention-allowances); its supporting art does not consume a second invention unit. Neither player nor agent invention locks prevent faithful visualization of existing mechanics. Separate art permissions and funding still apply, and visual generation cannot bypass a lock by adding behavior.

Sequence implementation as immediate state/effect families, then durable asset manifests and lookup, then one bounded generation adapter with validation and asynchronous client refresh, then richer variants/animations and pack export. Measure live latency, cost and visual consistency separately from fixture contract checks. Record request/attempt IDs, reference/style versions, cache reuse, latency, receipts, validation results and the published artifact ID without putting private reference bytes or prompts in general logs; execution traces are not the sole durable copy of an asset.

Future acceptance covers immediate rabbit-death feedback; no duplicate generation for repeated deaths; identity/style consistency; rejection of malformed or misaligned art; survival continuing through provider failure; no corpse resurrection after harvesting; retained art after restart/run expiry; scope-safe reuse and export; and art spending without an invention-quota debit. Provider/model selection, numeric budgets, blood-effect presentation settings and review thresholds remain open. This documentation does not claim those checks have passed or expand the first playable milestone.
