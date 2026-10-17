# Art-direction decisions

## Current visual requirements — October 16, 2026

**Owner clarification recorded 2026-10-16 23:12 UTC.** These requirements govern new art research, sourcing, concepts, modeling, pixel finishing and review for the bundled OpenLegend world. They supersede earlier broad permission for cartoon styling and recommendations to use visibly low-poly asset families. Earlier feedback, source credits and technical observations remain historical evidence.

- **Desired:** beautiful dimensional pixel art with believable real-world proportions. People retain natural head-to-body relationships, anatomy and varied builds; animals, vegetation, tools, armor and buildings retain convincing form, scale and construction. Stylization comes through deliberate pixels, color grouping, material interpretation, expressive motion and lighting. The result can be an illustrated or video-game interpretation of reality without becoming a cartoon world or requiring photorealistic final rendering.
- **Explicitly rejected:** the visible low-poly 3D aesthetic, flat polygon facets as the art style, blocky/Lego-like forms, cutesy or toy-like assets, chibi/small-body/big-head characters and exaggerated cartoon proportions. A pixel filter or coarse texture over those forms does not make them acceptable. Pair positive descriptions of beautiful pixel art with this exclusion in briefs, prompts and asset-selection guidance.
- **Source selection:** begin with convincing anatomy, silhouettes, organic structure and material construction. Do not choose a visibly low-poly or cute source because it is free, convenient, coherent or labeled “game-ready,” and assume pixel finishing will repair its design. Efficient polygon counts, simplified hidden geometry and lower-detail runtime meshes remain valid engineering choices when they preserve the required appearance; the rejection concerns the visible style, not a minimum polygon count.
- **Creator feedback:** Mike rejects the art styles of Bitgem, KayKit, Polytope Studio and Synty for this project. Do not recommend them again as the style direction. Quaternius is solid for its intended style, but its visibly low-poly look is also outside this target. Existing Quaternius/Kenney and other acquired studies remain available with intact provenance; keeping them does not endorse their style or select them as the future source family.
- **Reference interpretation:** retain Garbage Country's environmental qualities, The Last Night/REPLACED's fine pixel craft and lighting, and t3ssel8r's endorsed character qualities. Earlier likes for Dave the Diver, Hades, Eastward or another game apply to the stated aspects; they do not override this explicit rejection of cute or exaggerated proportions. Preserve readable faces, the mercenary's modest tallness, clothing coverage and the critical moving-camera shimmer/artifact checks.
- **Survival and emotional range — clarified 2026-10-17 00:36 UTC:** preserve the latest study's dimensional pixel-art feel, but reduce its uniformly bright, happy presentation. This is a believable living wilderness with sunshine, happiness and joy alongside darkness, brutality and desperation. Use weathered materials, deeper readable shade and purposeful firelight; neither cheerful toy-world styling nor permanent blackness is the target. This refines the earlier warmth preference without erasing it.
- **Small-subject clarity:** items and small animals may use finer fixed pixel density than people and large scenery. Judge identifying features at actual play distance as well as close range; retain real dimensions and proportions. A tiny bird needs a deliberate silhouette/value pattern, and a pixel smaller than the display cannot carry extra visible information. Do not claim that density fixes weak anatomy or guarantees stable motion.
- **Sources and preservation:** Poly Haven is an endorsed starting point for natural objects and materials. Evaluate each source in the actual pixel treatment; the current angular bear still needs a better anatomical source. Preserve every meaningful tested iteration, including rejected results, with settings, provenance and dated captures in the [study archive](studies/README.md); never overwrite earlier review evidence. Previously uncaptured views cannot be reconstructed as historical screenshots.

Mike said the latest source-based study looks much better. Record that positive feedback without treating it as blanket approval of every imported asset, source creator or unresolved moving-art defect. The [creative brief](final-board/creative-brief.md) translates these requirements; [grounded source candidates](research/3d-pixel-worlds/grounded-asset-creators.md) record new research, not purchases or adopted artwork.

## Confirmed scope — September 19, 2026

- Explore a broad collection of beautiful pixel-art games, particularly 2.5D, including Steam references, sprites, asset packs, and concept art. The current direction above explicitly excludes visibly low-poly, cutesy and exaggerated-proportion art.
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

The following earlier questions remain useful, but the October 14 references and October 16 requirements above now narrow the visual target. They do not settle a renderer or character representation.

1. How much individual identity is visible at the normal camera scale while preserving the now-required believable proportions.
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
- **Kingdom, Mark Knight, Holland and the supplied renderer demonstrations contribute specific lessons.** BitGem's dungeon remains historical construction-technique evidence only; Mike explicitly rejected its art style on October 16. None of these examples establishes a shared construction method or permission to copy a whole style.

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

**Historical first candidate, subsequently rejected by Mike for its ordinary-3D environment.** Its technical observations remain valid for their recorded source. The current revision is described below; the original pending-review wording does not imply acceptance.

Mike subsequently requested implementation of V3D01.1–V3D01.12 on the finalized mercenary baseline. The [combined experiment record](../docs/verification/starting-scene-pixel-art.md) now documents actual material/light/sampling/outline/motion/vegetation/effects trials, standalone texel splatting, the authored/generated pair, representative native play and physical-device measurements. The original starting-world content and active playtesting progress are preserved.

The provisional candidate uses the original shaped character with conforming facial details, modest tallness, fixed 96-row character pixels, restrained material regions, softened lighting, held walking poses and continuous cloth. Grouped vegetation, quiet ground, smooth optional wind and an attributed generated chest share the scene treatment. Whole-scene downsampling, permanent internal outlines, a separate effects image and texel-splatting integration were rejected or deferred for the recorded visual/cost reasons. These are implementation choices offered for review, **not new explicit art choices or approval by Mike**. Camera sampling can still change pixel clusters; this does not claim permanent 3D cells. Water remains at the existing treatment; strong bokeh, complex reflections and specialized many-light rendering were not justified for this scene.

Mike’s final moving-scene review remains open. Only his actual feedback can accept this candidate or change the adopted art direction. General arbitrary-asset publication, imported-character production rights, broader rig/equipment families and wider population/device qualification remain with their existing owners. No paid provider request was made: additional and cumulative cost $0, reserved or uncertain commitments $0.

## Pixel-surface revision offered for review — October 15, 2026

Mike authorized further trials after rejecting the environment's normal low-poly appearance and made shimmer/unusual artifacts critical failures. Different object treatments and another texel-splatting investigation are permitted. The [revision report](../docs/verification/starting-scene-pixel-stability.md) records the actual alternatives; the [plan](../docs/projects/3d-pixel-art-first-scene-plan.md#authorized-pixel-finish-and-stability-revision--october-15-2026) retains the agreed scope.

The next implementation candidate keeps the original 96-row mercenary and full scene resolution. Deliberate fixed-scale leaf/bark/stone/ground clusters, four-sample antialiasing, narrow painted-cell boundary filtering, mipmapped character textures and fixed soft-shadow sampling replace the first environment's plain colored facets. Common coarse grids, full-detail character capture and separately preserved fine subjects remain explicit comparisons. The default uses the ordinary shared scene target because coarse environment reduction softened useful detail and the extra subject-mask format has no purpose when reduction is disabled. This recommendation preserves simpler sprite people/animals and existing gameplay; it does not establish a newly approved character or environment art style.

The shorter leaf repeat is visibly stronger than the rejected weak tile, but round crown lobes, conifer tiers, repeating plates, yellow-green noon color and sampled character detail remain limitations for review. Identical still captures and immutable surface data do not prove stable moving edges. Current-profile frame/resource measurements and the critical moving-art/shimmer gate must be judged from the new evidence, separately from the first candidate's historical timings. Fixed captures/splats remain rejected or deferred for the recorded disocclusion, coverage, thin-surface, animation and cost limits. Mike has given no creator acceptance of this revision. Additional/cumulative provider and Jev cost remains $0, with $0 reserved or uncertain commitments.

## Asset variants and free-library starting points — October 15, 2026

Mike authorized continued implementation with a **$25 total task budget**, replacing the earlier $10 ceiling. When revising a specific asset, prepare a few actual alternatives and show them for feedback while continuing independent work; silence does not establish a preferred version. Search and download solid free asset-library sources, including environment and hare/animal art, as starting points for a coherent demo in the existing world. Evaluate every result against the agreed [creative brief](final-board/creative-brief.md) and [renderer/art research](research/3d-pixel-worlds/realtime-pixel-rendering.md). Library geometry is a starting asset, not a reversal to an ordinary low-poly finish. Preserve original artwork and clear license/provenance for retained downloads. [Implementation plan](../docs/projects/3d-pixel-art-first-scene-plan.md#library-assets-and-authored-variants--authorized-october-15-2026), [V3D01.14](../docs/maintainers/3d-pixel-art.md#v3d0114--licensed-library-sources-and-multiple-authored-choices).

## Autonomous representative Blender study — October 15, 2026

Mike explicitly asked Codex to choose the strongest working versions while he is away, preserve every alternative and continue building a representative 3D pixel-art set in Blender. Rocks, trees, berry bushes, chests, people, armor and swords/weapons should support later feedback about common art principles. Working selections may proceed without waiting for preference replies; this supersedes the previous requirement to leave every provisional choice unanswered. It does not imply Mike has seen or accepted a particular result. Keep the agreed references, clear faces, authored fixed pixel detail and critical stability concerns. [Plan](../docs/projects/3d-pixel-art-first-scene-plan.md#representative-blender-asset-study--authorized-october-15-2026), [V3D01.15](../docs/maintainers/3d-pixel-art.md#v3d0115--representative-blender-pixel-art-study).

## Representative Blender study — selected direction

**Rejected by Mike on October 16, 2026.** Earlier assistant recommendations selected natural rock/broadleaf/berry bush, open conifer, crafted chest/sword/Mara/Tavin and quiet round shield/armor. Their claimed readable faces, organic forms and pixel-art finish did not withstand creator review. [Actual comparisons, revisions and technical limits](../docs/verification/representative-art-study.md) remain historical evidence, not successful art qualification. All alternatives and older models remain preserved.

## Corrected study requirements — October 16, 2026

Mike rejected the new people, primitive foliage and ordinary-3D props. He identified coarse paint wrapping around smooth surfaces as a failed pixel-art result and noted that the chest, sword and shield do not visibly read as pixel art at all. Technical texture/export correctness did not establish artistic success.

The mercenary was the only supplied real 3D character: Mike's concept art converted through Meshy. It must be central to the new study; its earlier pixel rendering is a stronger starting benchmark. Preserve the original design, model and earlier alternatives. Use real free-library models as source material for other subjects, with Blender for deliberate adaptation and refinement. The rejected procedural people do not substitute for that character work.

Mike requests a comprehensive beautiful 3D pixel-art study following all established references. He subsequently asked for a critique of the short replacement outline and a complete new strategy grounded in the art direction, research and original requirements. The [revised strategy](../docs/projects/3d-pixel-art-first-scene-plan.md#proposed-replacement-study--october-16-2026) maps the actual starting-world families, establishes scale/framing first, separates asset, rendering and lighting comparisons, and expands a finished camp proof into the surrounding locations. It retains multiple meaningful options and autonomous working choices. That strategy was subsequently authorized for full implementation. The source-based collection, closer camera, natural 10% tall-person scale and one final pixel resolve are now working implementation decisions, not creator-approved artwork; the current evidence is linked below.

## Authorized replacement implementation — October 16, 2026

Mike explicitly authorized the comprehensive plan in full, retaining autonomous working selections and all earlier options. The [source-based study](../docs/verification/source-based-starting-study.md) records the implemented collection and comparison evidence. The working choice restores his original mercenary identity, chooses source-based anatomy and practical objects, separates body dimensions from a closer camera, and compares one final pixel resolve against separate-family/full-display controls. Settled cloth, still foliage and 12 held poses reduce distracting secondary movement. Economy becomes the new-device default from the measured comparison. These replace the earlier assistant-selected graphic/96-row/full-display profile. No creator acceptance is inferred; the earlier rejections and remaining visual/performance limitations remain recorded. External spending and commitments remain $0 of the authorized $25.

## Decision entry format

Date · decision · relevant reference IDs · user rationale · open implications.

Record explicit user choices here after discussion. Keep exploratory ratings and assistant suggestions in `feedback.md` until adopted.
