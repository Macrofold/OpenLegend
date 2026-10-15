# How this style fits generative art

**Good fit as an assisted production process; unproven as fully automatic final art.** Generation can provide concepts, variations, draft geometry and texture candidates. The desired finish depends on consistent forms, scale, garment coverage, motion and a designed pixel renderer. The realtime references show that the renderer can supply the pixel shading; a generated asset does not need a hand-painted texture for every visible pixel. A generic downsampling filter alone still does not establish the quality.

This document owns the art-production implications of the research. The existing [generation/publication design](../../../docs/projects/3d-pixel-art-asset-pipeline.md) owns durable work, admission, storage, spending, failure and publication. Its general pipeline remains proposed. No provider request, tool installation, account access or quality/cost benchmark was performed for this research.

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
