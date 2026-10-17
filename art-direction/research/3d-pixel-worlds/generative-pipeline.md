# How this style fits generative art

**Current art direction:** the [current visual requirements](../../decisions.md#current-visual-requirements--october-16-2026) pair beautiful dimensional pixel art with believable proportions and explicitly reject visibly low-poly, blocky, cutesy and big-head/small-body styles. Technique evidence below remains useful; Bitgem is a rejected style reference, not a recommended source family.

**Good fit as an assisted production process; unproven as fully automatic final art.** Generation can provide concepts, variations, draft geometry and texture candidates. The desired finish depends on consistent forms, scale, garment coverage, motion and a designed pixel renderer. The realtime references show that the renderer can supply the pixel shading; a generated asset does not need a hand-painted texture for every visible pixel. A generic downsampling filter alone still does not establish the quality.

This document owns the art-production implications of the research. The existing [generation/publication design](../../../docs/projects/3d-pixel-art-asset-pipeline.md) owns durable work, admission, storage, spending, failure and publication. Its general pipeline remains proposed. No provider request, tool installation, account access or quality/cost benchmark was performed for this research.

## Concept-first assets for Open Legend — October 17, 2026

**Recommendation: make approved original concepts followed by Meshy or Tripo a primary candidate route for distinctive people, clothing designs and setting-specific objects.** This is particularly useful where the [stock-source survey](asset-source-survey-2026-10-17.md) cannot supply the identity or culture we want. The extra artistic control comes from selecting and correcting the design before reconstruction, then retaining an editable master model. Exact geometry, reliable deformation and consistent equipment still require deliberate finishing. This recommendation does not select a provider or establish an accepted output.

The mercenary is relevant project evidence. The [source-study record](../../assets/source-study/README.md#earlier-sources-and-preparation-retained) credits Mike's concept and Meshy's anatomy/rig, together with OpenLegend's cape, body-contact work, clips and later face/material treatment. The [art-progress record](../../../docs/maintainers/art/mercenary.md) retains the original identity and its variants; the [verification history](../../../docs/verification/mercenary-default.md) records further coverage, appearance and rendering corrections. The result supports taking this route seriously. It does not establish the production effort for a population, interchangeable clothing, arbitrary creatures or every source image. This research did not recover or re-run the original private generation ledger.

### Allocate generation by the control we need

The following division is a production judgment under the current brief, not a measured provider success rate.

| Asset family | Recommended starting route | Why it fits the intended worlds |
| --- | --- | --- |
| Distinctive named people and original cultures | Original concept, image-to-3D candidates, then an edited body/face/garment master | Preserve natural proportions and specific identity. Fantasy residents and future Teral/Nemei designs need their own visual language. Nonhuman rig suitability remains untested. |
| Ordinary medieval and fantasy clothing populations | Design outfit families in concept art; build compatible garments around reviewed body/rig families | Coifs, aprons, wool/linen layers, boots and workwear need consistent fit. A separate generated whole person for every outfit would make reuse and equipment compatibility harder. |
| Unique props, carved objects and sci-fi utility equipment | Concept-first generation for the visible design, with separate functional parts | A distinctive travel pack, craft-town kettle or ship tool can carry original cultural identity. Handles, openings, moving lids and attachment points must remain actual usable structure. |
| Temperate vegetation, rocks and ordinary wildlife | Start with the strongest specialist, scanned, procedural or animated sources from the survey | Species structure, canopy gaps, biome variation and credible gaits matter more than inventing an ordinary oak or deer. Generate unusual fantasy specimens selectively. |
| Enterable buildings and repeated structural modules | Use concepts to design architecture; model or adapt a compatible modular system | Door sizes, interiors, wall thickness, working stairs, joints and repeated scale need precise control. Generated pieces can supply selected accents. |
| Repeated machines, modular equipment and interchangeable parts | Establish an authored dimensional system and use generation for bounded details | Common Measure's fittings and Hinge Port's infrastructure need parts that agree. A convincing image alone does not establish that agreement. |

This gives generation a substantial design role while keeping the concrete source survey useful. Stock sources can supply anatomical or structural foundations; their licenses must separately permit any proposed upload to an AI service. See [the current generator rights notes](tool-and-license-notes.md#generator-rights-and-plan-snapshot--october-17-2026).

### Current tool controls and limits

Checked against official documentation on October 17, 2026. Features listed here are published capabilities; no new generated model was inspected.

| Tool | Useful controls for this brief | Relevant limit |
| --- | --- | --- |
| Midjourney V8.2 | The [Edit Model](https://docs.midjourney.com/hc/en-us/articles/48495453462797-Edit-Model) accepts up to four references, targeted edits and front/back perspective instructions. [Style Reference](https://docs.midjourney.com/hc/en-us/articles/32180011136653-Style-Reference) guides color, medium, texture and lighting. Raw reduces extra creative styling. | Edit references supersede the older Omni/Character Reference workflow in V8.1/8.2. Style alone does not preserve exact anatomy or objects, and separately generated views still need consistency review. The [project prompting guide](../../midjourney/README.md) remains the prompt owner. |
| Meshy | Current standard [Meshy 7.1](https://docs.meshy.ai/en/api/changelog) supports [one to four object views and separate geometry/texture reference lists](https://docs.meshy.ai/en/api/multi-image-to-3d). [Image-to-3D](https://docs.meshy.ai/en/api/image-to-3d) offers geometry-only output, A/T pose and control over image enhancement. | The separate T2.5 Smart Topology route produces triangle meshes and does not support Multi-Image to 3D. Its existence is not a reason to accept faceted art. Meshy's current image API accepts but ignores the lighting-removal flag for 7.1; inspect the actual base color. |
| Tripo | [Smart Mesh P2.0](https://www.tripo3d.ai/blog/workflow-game-scene) offers target triangle or quad-dominant geometry, up to four matching views and segmentation. [Texturing](https://www.tripo3d.ai/features/ai-texturing) includes local Magic Brush edits, style transfer and a lighting-removal control. | Quad-dominant does not guarantee useful joint loops or all-quad construction. Tripo itself warns that inconsistent multiview subject, pose or proportions cause drift. Segmented parts still need correct hidden surfaces and fitting. |

Meshy's [web rigging documentation](https://docs.meshy.ai/en/webapp/guides/3d-model/rigging) covers humanoids and quadrupeds, while its [API rigging page](https://docs.meshy.ai/en/api/rigging) is narrower and recommends clearly limbed textured humanoids. Its web guide leaves complex facial and tail rigs to Blender/Maya. Tripo's [rigging FAQ](https://www.tripo3d.ai/features/ai-auto-rigging) confirms skeleton-bearing FBX/GLB export. Neither establishes acceptable OpenLegend walking, crouching, gathering, combat, cloth or facial expression.

**Meshy is the continuity candidate because of the mercenary; Tripo is a serious comparison candidate because of its editing/segmentation controls and the paid-user terms in the [generator rights notes](tool-and-license-notes.md#generator-rights-and-plan-snapshot--october-17-2026).** There is no measured winner. Compare the same approved design and the total effort needed to finish it; a provider's own comparison gallery cannot decide that for this project.

### Turn a selected illustration into a reconstruction reference

The [September 27 decision](../../decisions.md#concept-art-with-midjourney--september-27-2026) already distinguishes painted concept art from the eventual pixel finish. Keep that separation: natural anatomy and readable construction first, with the existing renderer interpreting them into deliberate pixel/color groups.

Prepare a neutral reference from the approved design: one isolated full subject, restrained perspective, broad diffuse light, visible extremities, simple background and clear material boundaries. A dramatic sunset, deep painted shadow or tiny embroidered noise may look attractive in a concept but obscure the geometry and lighting we need. For people, expose enough limb separation for reconstruction and rigging; choose the pose around the garment's construction.

Additional side/back images must describe the same object. Review face profile, skull, hem length, belt continuity, strap routing, garment closure and equipment placement before supplying them. Crop each intended view separately. A newly imagined rear view is an authored design proposal, not recovered evidence of an unseen surface. Fewer consistent views can be more useful than a contradictory sheet.

After choosing a mesh, preserve that model and rig through further poses. Meshy's [consistency guidance](https://help.meshy.ai/en/articles/16102614-how-to-keep-characters-consistent-in-meshy) says separate generations do not remember character identity. Create costume and color variations around the edited master; generate a removable backpack or weapon as a separate asset when the game needs to handle it separately. Use the existing stages below for geometry, materials, deformation and moving-camera review.

### A focused comparison before committing to volume

Use three new, explicitly hypothetical designs: an ordinary covered medieval worker, a distinctive travel pack or handled craft object, and one original sci-fi utility device. Retain the existing mercenary as the character-quality control. These examples test design preservation and functional boundaries without silently approving a new character or world canon.

Feed the same approved references to Meshy and Tripo. Preserve every meaningful candidate and judge untextured shape, material/face fidelity and final pixel appearance at the same world scale. Record selection/rejection, actual charges, authoring and cleanup time, export sizes, garment coverage and movement results. The useful cost is the total effort per accepted asset, including discarded generations.

A good result would preserve identity and construction with manageable correction, fit the shared renderer without a special exception, and remain readable during rotation, zoom and the needed actions. A beautiful still with a fused pack, drifting face or unusable cloth should not count as success. This research proposes that comparison; it does not run paid calls, change the renderer or close the existing [live-generation qualification](../../../docs/projects/3d-pixel-art-validation.md#6-live-generation-qualification).

## Where generation is likely to help

These are reasoned production assessments, not measured success rates or claims about a named provider's current capabilities.

| Work                                                       | Expected fit                          | Required review                                                                                         |
| ---------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Mood, palette and composition alternatives                 | Strong candidate                      | Distill the selected qualities into an original brief; a beautiful image is not a runtime asset.        |
| Single rigid props with familiar structure                 | Promising first production experiment | Correct scale, usable silhouette, complete hidden surfaces, clean geometry and material consistency.    |
| Recoloring or bounded variation of approved materials      | Promising with strict inputs          | Pixel grid, seams, tiling, palette and detail density remain consistent.                                |
| Character concept and costume variants                     | Useful for exploration                | Maintain identity, anatomy, garment logic and intended equipment across views.                          |
| Automatic UV-ready pixel textures                          | Unproven                              | Features must land on the right surfaces, join at seams and remain readable after mip reduction.        |
| Multiple matching views or animation frames                | Difficult                             | Faces, clothing marks and proportions must not drift between views or frames.                           |
| Finished skinned people and interacting garments           | Difficult                             | Topology, rig, weights, motion, face quality, attachment points and coverage all need inspection.       |
| A universal shader that makes every generated object match | Poor assumption                       | Rendering cannot correct bad anatomy, missing surfaces, excessive baked shading or inconsistent design. |

Rigid scenery is the simpler first integration path, but the character art experiment should happen early: it determines whether the intended style can deliver the people Mike actually wants.

## Proposed production stages

### 1. Write a concrete appearance brief

Use permitted character/object information and the selected world's art direction. Describe materials, silhouette, identity, scale, required views, working poses and important attachments. Keep gameplay facts distinct from artistic choices. If a container must open, the visible structure should support that known function; generating its image cannot grant the function.

For example, a **hypothetical character brief** might request a natural adult silhouette, recognizable dark brows and eyes, a moss-colored wool cape with broad folds, leather belt and one visible tool. It should also specify whether the garment is closed or removable and which poses need coverage. These are example authoring requirements, not new established facts about the mercenary or bundled world.

Use the liked references to describe qualities—grouped foliage, restrained surface noise, warm focal light—rather than asking to reproduce a particular screenshot. The downloaded reference library is not automatically permitted input to an external generator.

### 2. Establish the asset before pixel finishing

Choose the appropriate route from the existing pipeline: reuse a permitted library asset, compose approved parts, author directly, generate a concept first, or generate a model directly. Do not force every object through an image-to-3D service.

For a model, inspect its neutral untextured shape, full turntable and usable scale before celebrating its rendered appearance. Check the back, underarms, hands, garment interior, openings and contact with the ground. Correct shape while it is still inexpensive to change. A polished frontal preview can conceal unusable hidden geometry.

For sprite parts, establish the rig, joints and directional coverage before creating many detailed frames. The production cost grows with the number of distinct parts, views, poses and costume alternatives. Mirroring is useful only where it preserves intentional asymmetry such as equipment placement.

### 3. Prepare deliberate materials and pixel rendering

For the leading renderer-driven candidate, provide clear material regions, sensible surface normals and restrained base colors. Use vertex colors, procedural materials or textures according to the selected asset. Generate geometry and material candidates, then use the shared renderer to produce consistent lighting bands, edges and effects. Semantic material masks can help keep skin, hair, metal and cloth distinct; they require inspection and do not grant gameplay meaning.

Reserve targeted authored detail for identity and places the renderer cannot infer, especially eyes, brows and distinctive garment marks. When using painted textures, create a usable UV layout and allocate detail by visible importance. A high-resolution generated image can guide this work; automatic shrinking and palette reduction are preparation steps, not proof of final quality.

Noio's [Pixel Unwrapper](https://github.com/noio/Pixel-Unwrapper) is a concrete tool to investigate for controlled UV layout. It has not been installed or qualified here. Aseprite or another pixel editor can support exact pixel edits; Blender can supply geometry, UV inspection and pose tests. The output matters more than mandating a particular editor.

For generated texture candidates, supply only rights-cleared references and a clear layout when the selected service supports it. Validate placement on the actual mesh. Do not ask an image generator to invent a correct UV layout from a prose description and assume its pretty flat result will wrap correctly.

### 4. Normalize and review deterministically

Normalize axes, scale, material slots and texture sampling through trusted import tooling. Use controlled palette/density checks as diagnostics rather than a substitute for art review. Preserve source files and source-to-export relationships so a bad face can be corrected without regenerating the whole asset.

The art review should inspect the same fixed views, lighting cases and movement sequence used for accepted assets. Check geometry/material inputs and their rendered result, including any authored textures. A face that passes in a portrait-sized render may still fail in ordinary play; a technically valid mesh may still look wrong.

### 5. Publish a reviewed, durable result

The game's appearance should refer to stored, reviewed files, not an expiring provider URL. Keep provenance, rights, source revision and runtime exports together under the existing pipeline contract. The same accepted asset should be reused across loads and views; changing the camera must never request a new face or texture.

Earlier useful art remains available for comparison where the user requested preservation. Candidate preservation is not a requirement to keep incompatible runtime contracts or legacy readers. Publication and replacement still use the project's single current-format path.

If generation fails or is delayed, retain an appropriate existing representation under the pipeline's failure rules. A background provider completion must not overwrite a newer user correction. These are existing [pipeline responsibilities](../../../docs/projects/3d-pixel-art-asset-pipeline.md), not new parallel job infrastructure.

## Keep generation out of the per-frame renderer

The renderer should receive a chosen asset and render it consistently. It should not ask a model to redraw pixels during rotation, synthesize each animation frame on demand, or repair a cape every time it intersects. Such a design would introduce appearance drift, latency and uncontrolled work at exactly the moments when the player expects stable motion.

For animation, retarget candidate clips to a reviewed rig and test held poses, contacts, attachment motion and interruptions through the [animation workflow](animation-tools-and-techniques.md).

Prefer reusable authored structure: body families, compatible garments, approved material families and actual equipment attachment rules. Variation can alter bounded visual choices without regenerating the complete person. This remains a proposed production strategy; the existing mercenary pilot is one fixed outfit, not proof that interchangeable generated clothing already works.

## A useful first generation experiment

After the visual comparison selects a target, use one rigid object whose function and shape can be judged easily. A hypothetical storage chest or simple tool is more informative than a highly ornate character with many independent failure modes. Keep the same approved brief and evaluation scene across candidates.

Record the complete production effort: provider time and actual authorized cost, rejected candidates, manual modeling/painting time, conversion time, final file sizes and appearance in motion. Count failures and corrections. A selected attractive screenshot alone cannot establish reliable generation quality.

The experiment should answer whether the output can join existing art without special renderer exceptions, whether its visible form matches its permitted gameplay meaning, and whether it can be stored/reloaded unchanged. Then evaluate a character or articulated assembly under its separate acceptance criteria. No automatic paid retry or new provider budget is approved here.

## Meshy, Blender and access

**No new access is needed to use this research.** A later authored prototype can use existing permitted modeling/painting tools and assets. Meshy or a similar service would be useful only if a chosen experiment actually needs model generation; it is not required for either renderer-driven pixel art or painted polygon surfaces.

Before selecting a service, check its then-current input/output capabilities, license terms, rig/texture exports, costs and account authorization. This document does not assume those facts or request credentials. Blender access alone also does not produce the art direction automatically; the key work is shape, rigging, controlled materials, selected surface detail, pixel rendering and visual correction.

## What remains unproven

The references establish plausible techniques and visual targets. They do not establish our provider's consistency, the effort per finished character, the reliability of automatically painted faces, or the cost of matching many generated objects. Those questions belong to the existing [live-generation qualification](../../../docs/projects/3d-pixel-art-validation.md#6-live-generation-qualification), after style selection. No production claim should be made until that evidence exists.

