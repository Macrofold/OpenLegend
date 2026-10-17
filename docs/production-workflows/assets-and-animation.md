# From an idea to a working object or animated entity

**Status:** proposed offline production procedures. The [shared workflow](README.md) owns briefs, handoffs, revision and tool-selection methods. The current mercenary is a delivered fixed-asset pilot; general imported/generated families, rig coverage and runtime appearance publication remain open in [V3D](../maintainers/3d-pixel-art.md).

The purpose is to create recognizable things and expressive people that participate in the game. A carried tool should look related to its inventory image. A body should communicate intention before contact and visibly recover afterward. Clothing and possessions should help identify a person at the camera distance where play happens. These aims follow the [creative brief](../../art-direction/final-board/creative-brief.md); no new style or character anatomy is selected here.

## Choose the representation before the tool

| Need | Useful route | Stages that can be omitted |
| --- | --- | --- |
| An existing thing already has suitable approved art | Inspect and integrate exact reuse | New concept, generation and unnecessary source reconstruction |
| A familiar object differs in supported material or parts | Compose a compatible family and finish | Whole-object generation; rigging when the result is rigid |
| A new rigid silhouette matters | Concept when useful → model → material → export → working object | Concept image when direct modeling communicates the form adequately |
| A person can use a known compatible body and rig | Identity/outfit design → fit parts → reuse or create motions → export → action bindings | New body generation and new rig creation |
| A genuinely different articulated form is needed | Body/behavior study → source geometry → family-appropriate rig → motion → qualification | Automatic assumption that a humanoid rig or clip will fit |
| A final sprite or illustrated icon fully serves the use | Editable 2D source → required directions/states → game representation | Mesh, skinning and 3D export |

Camera compatibility remains an existing requirement. A fixed-angle sprite is insufficient for views it does not describe; a model with an attractive front can still fail from the back or above. Reuse the accepted camera and appearance-family decisions in [world presentation](../world-presentation.md) and [3D appearance families](../projects/3d-pixel-art-appearance-families.md). A production convenience does not silently restrict the camera.

## Rigid objects and equipment

### 1. Define the thing and the role of its appearance

**Consume:** the current object/definition, actual supported use, [presentation requirements](../invention-art-pipeline.md#2-the-shared-presentation-contract), creative direction, and a reproducible game scene.

**Produce:** a short object brief describing meaningful parts, scale, silhouette, material regions, contact surfaces, grip or pivot, required openings, and world/inventory/equipped representations that the current task needs. Record which features are identity-defining and which are cosmetic freedom.

The gameplay owner supplies facts; the art contributor translates them into visible cues. For a hypothetical container study, an opening and movable lid matter only if the selected task needs them, but a depicted opening should not misleadingly conceal an unusable solid surface. Do not add capacity, storage, protection or interaction merely because those are conventional for similarly named objects.

**Useful result:** a reviewer can explain what the player should recognize and what the appearance must preserve. If the item's benefit or identity is unclear, repair the brief before expensive finishing.

### 2. Explore the form and establish the usable blockout

**Consume:** the brief, existing approved assets and compatible parts, reference rights, and the physical dimensions or attachment requirements owned by the game.

**Produce:** the smallest useful visual comparison and a rough in-game or authoring blockout. Select exact reuse, composition, direct modeling, procedural geometry, or a generated candidate according to what is missing.

An art contributor or image model can explore form and material. A native integration contributor can prepare the existing supported interaction with a simple representation in parallel. Both use the same scale and functional facts. Neutral construction views can guide a mesh generator; a richly lit illustration can instead serve as an aesthetic reference. Label those purposes so painted lighting and imagined hidden geometry are not mistaken for construction data.

Inspect silhouette at gameplay size before surface detail. Include another object or person as a scale reference. Prefer deliberate alternatives that settle shape or identity over repeated random sampling of almost the same design.

**Useful result:** a chosen form that reads clearly in context and has an ordinary interaction path where that scope exists. If the form conflicts with actual use, revise the form or explicitly return the capability question to its owner. A model prompt cannot resolve a missing mechanic.

### 3. Produce an editable model and material source

**Consume:** the selected form, stable dimensions and parts, compatible material recipes and the runtime representation requirements.

**Produce:** an editable source containing correctly separated important parts, usable geometry, explicit pivots/anchors, UVs or other supported material mapping, and the required exported texture channels. Preserve the selected reference and source-to-output relationship.

Blender or another already selected authoring tool can construct and repair the source. Procedural tools are useful for repeated forms, proportion controls or material families. Specialist generators such as the inspected Tripo/Meshy routes supply candidates when they remove work. The [asset-model dossier](../../archive/02-research/ai-game-development/07-image-3d-and-audio-models.md) records dated capabilities; generated output still needs full-object inspection and finishing.

Check backs, undersides, handles, holes and contact surfaces. Remove accidental fused parts and surface features that imply a different function. Check whether texture highlights are baked into base color and whether they conflict with the game's lighting. Keep source geometry simple enough for the intended use, but preserve meaningful silhouette and openings rather than optimizing an arbitrary polygon number.

**Useful result:** the next contributor can make a specified change in the source without reconstructing the object. If the generator repeatedly produces the wrong topology or merged pieces, retain the useful concept and switch the production step to ordinary modeling or composition.

### 4. Export and inspect what the game will actually receive

**Consume:** the editable source and the current supported export/import profile.

**Produce:** the exact runtime artifact and dependent textures, with source revision and meaningful export settings recorded. Request or export only formats that the next stage consumes.

Normalize scale, orientation, root and pivots in the correct source owner. Check the resulting bounds, hierarchy, material interpretation, texture color space and supported features. Inspect the actual GLB or other selected artifact; a correct Blender viewport does not prove the exporter preserved everything. The [PlayCanvas skill audit](../../archive/02-research/ai-game-development/04-skills-and-tooling.md) includes useful inspection and calibration candidates and identifies version requirements.

The proposed general intake requirements remain in the [3D pipeline design](../projects/3d-pixel-art-asset-pipeline.md#6-quarantine-conversion-and-validation). A manually prepared trusted pilot can use its selected delivery path without claiming that arbitrary external intake is implemented. Reuse its actual scope and evidence.

**Useful result:** the exported artifact preserves the parts and appearance needed by the consumer. If a material or transform changes during export, repair the export/source convention instead of accumulating unexplained runtime offsets.

### 5. Produce coherent world, inventory and equipment views

**Consume:** the accepted object identity and each representation's actual display role.

**Produce:** only the needed alternate depictions. A render from the accepted model can provide a consistent icon; a separately finished icon can exaggerate small details for readability while retaining identity. A held version uses the compatible attachment and actual equipped object, rather than another unrelated decorative copy.

Review representations together at their real sizes. Keep orientation, silhouette, distinctive materials and markings coherent. An inventory image may need stronger separation than a world model, while live text, stack quantities and control states belong to the UI. Do not bake them into the artwork.

**Useful result:** the player can recognize the same thing across its views. If a beautiful icon suggests a different weapon or material, revise the icon or reconcile an intentional identity change before expanding the family.

### 6. Integrate and play the complete object

**Consume:** the prepared artifact, actual object identity and supported interaction, current state, and existing rendering/attachment contracts.

**Produce:** a working game representation, the relevant interaction evidence, and the source/export references needed to revise it.

Use the current renderer and native object owners. Art does not alter collision, reach, capacity, custody or permissions. Inspect the object in representative light and camera views, then use its real supported action. Where the task includes equipping or dropping, confirm that appearance follows the actual result and remains coherent during movement. A refused or pending action must not look completed.

Inspect changed loading, replacement and teardown behavior when those are part of the task. A delayed image or model must not restore a removed object or overwrite a later state. The [runtime appearance owner](../invention-art-pipeline.md#7-durable-work-storage-and-publication) owns those semantics; an isolated source-art study does not need an unrelated runtime test project.

**Useful result:** the item reads clearly, feels at home in the world and participates in the intended task. Record remaining artistic or device qualification honestly in the existing study and implementation records.

### 7. Establish the family when reuse is valuable

**Consume:** the accepted source and one meaningful requested change.

**Produce:** a second useful variation or revision using the preserved source, with the correction effort recorded.

A second material, length, ornament or compatible attachment is useful evidence only if the result is actually needed and the changed attribute is allowed by the underlying object. Do not change mechanics merely to demonstrate variety. Keep a one-off handcrafted object when that is the economical choice; a parameterized family earns its setup cost through recurring use.

## Articulated people and creatures

### 1. Connect visible identity to character purpose

**Consume:** the selected character/body direction, permitted authored facts, actual supported behavior, equipment needs and the [creative brief](../../art-direction/final-board/creative-brief.md).

**Produce:** a visual identity brief with silhouette, posture, body shape, clothing, hair, skin/material identity, carried possessions and the actions that matter first. Define what distinguishes this person at gameplay distance and what a portrait or close view adds.

The character author and visual contributor work together. Clothing and habitual pose can suggest a person's concerns without requiring a generated biography to become public knowledge. Connect deeper authoring to [characters and play](characters-and-play.md); the art route does not invent personality, remembered events or authoritative anatomy.

Use the current mercenary source and [study record](../maintainers/art/mercenary.md) where compatible. Its existence means the next useful question can be motion quality, outfit fit, production effort or another expressive case, rather than another isolated proof that a 3D person can render.

**Useful result:** the character has a recognizable visual promise and a short list of actions needed by the selected play. More cosmetic detail is valuable when it supports that promise at the actual viewing scale.

### 2. Choose a body and rig family before detailed production

**Consume:** the identity brief, existing source bodies and rigs, attachment conventions, and action/pose requirements.

**Produce:** a chosen body/rig route and explicit compatibility assumptions. Use an existing fitted body where it serves the character. Generate or author a different body when its distinctive form matters. Treat a new anatomy as a separate production capability.

A skeleton with familiar joint names is not enough to prove compatible scale, proportions, bind pose or animation. Likewise, a provider's “automatic rigging” label does not establish nonhuman anatomy, garments or usable equipment contacts. The [appearance-family design](../projects/3d-pixel-art-appearance-families.md) and [V3D05–V3D06](../maintainers/3d-pixel-art.md#v3d05--rigged-character-and-equipment-family) own family coverage.

**Useful result:** the team knows which geometry can share a rig and clips, which pieces are rigid attachments, and which shapes need deliberate deformation. If the intended costume depends on an unavailable fit or cloth solver, simplify that production choice or scope its missing capability explicitly.

### 3. Build, fit and skin the editable source

**Consume:** the accepted form, body/rig convention, materials, clothing and equipment boundaries.

**Produce:** editable mesh, skeleton, skin weights and fitted parts, with meaningful pivots and attachments. Keep body, garments, hair and rigid equipment separate where their use requires it.

Use conventional modeling, generated candidates and manual repair as appropriate. Inspect deformation at representative joint extremes before creating a long animation set. Check shoulders, elbows, hips, knees, hands and other relevant joints for this anatomy. Test garment contact and silhouette under movement. Do not assume an authoring-tool cloth simulation survives the runtime export; determine which animation or simulation data the selected game path actually consumes.

This work can run alongside rough action timing on the agreed rig, but changes to the body or skeleton must be communicated before dependent skinning or final clips are treated as complete.

**Useful result:** the source deforms adequately for the supported actions while preserving identity. Repair a bad bend in geometry, weights or rig constraints rather than hiding it with a single camera angle.

### 4. Produce motion that serves an action

**Consume:** a compatible rig, the actual action's start, interruption and outcome meanings, equipment, contact targets and the intended emotional reading.

**Produce:** editable selected clips and transition requirements. Start with compatible existing motion where useful; otherwise author, capture, retarget or use a constrained skeletal-motion route. The [motion assessment](../../archive/02-research/ai-game-development/07-image-3d-and-audio-models.md) distinguishes motion tools from image-to-video references.

Shape anticipation, weight transfer, contact and recovery so the player can read intention. Avoid treating every action as an arbitrary loop. Check feet, hands, held items, root displacement, turns and relevant interruption points. A clip that looks impressive in isolation may delay response, imply contact before a native outcome, or slide through the ground when attached to real movement.

A video can inspire timing or pose, but it is not a usable skeletal clip unless the selected tool exports the required motion data. Retargeting maps motion; it does not automatically fix contacts or adapt one anatomy's behavior to another.

**Useful result:** actual joints move correctly, the action reads at game scale, and motion can be reconciled with native timing. The wider sound/effect coordination belongs in [audio and feedback](audio-and-feedback.md).

### 5. Prepare the runtime body and motion together

**Consume:** the mesh, materials, skeleton, selected clips and declared attachment convention.

**Produce:** the supported runtime artifacts and enough source information to reproduce them. Inspect the exported skeleton and channels, actual non-root joint motion, required clips, hierarchy, bounds and texture/material behavior.

Keep the intended root-motion policy consistent with [world presentation](../world-presentation.md) and the current animation consumer. Animation callbacks cannot inflict damage, transfer an item or move the authoritative body through a separate path. If a visual clip travels, its integration must honor the native movement and support owners rather than allowing two position authorities.

**Useful result:** the actual exported animation deforms the intended body and retains compatible attachments. A running timer, successful import or moving root alone does not pass this stage.

### 6. Integrate actions, transitions and equipment in play

**Consume:** native action/state results, supported movement, current body/equipment projections and the prepared visual family.

**Produce:** an integrated character whose movement, action cues, attachments and supported condition changes follow the current game. Test the needed transitions in a real scene, including relevant turns, interruptions, equipped changes and unavailable poses.

Inspect gameplay scale, camera orbit and pitch, lighting, depth, shadows and contact. Look for sliding, grip changes, interpenetration, disappearing limbs, unreadable silhouettes and visual success after a failed action. Distinguish an art problem from input delay, native timing, interpolation, support geometry or the animation selection logic.

Preserve adequate existing poses and representations when optional polish is unavailable. Do not add an unimplemented death, injury or body state merely because an asset contains a matching clip. Conversely, a supported important state must not be silently represented by an incompatible living/idle pose. Its adequacy requirement remains with the existing family contract.

**Useful result:** the person feels present, recognizable and responsive while their action remains understandable. The evidence applies to the actual body, clips, equipment and device checked; a single character does not qualify crowds or arbitrary rigs.

### 7. Test a useful variation, then preserve the working recipe

When family reuse is the intended benefit, repeat the process on a second compatible outfit, body or equipment case. Record the real adjustments required. A second humanoid does not prove a quadruped route; a motion that fits a bare body may fail with a cape, pack or held tool.

Preserve the source body, rig, material family, clips, export settings and accepted game context. Add the smallest reusable instruction or preparation tool that removes an observed repeated failure. Keep valuable manual decisions visible rather than claiming a fully automatic pipeline because one candidate happened to work.

## Repair map and downstream effects

| Finding | Repair owner | Dependent work to revisit |
| --- | --- | --- |
| Weak identity at normal camera distance | Silhouette, proportions, outfit/material contrast | World representation, portrait/icon agreement and poses that hide key features |
| Wrong scale or attachment location | Source transforms and canonical grip/pivot | Ground contact, held view, selected body/equipment fits and export |
| Fused parts or unusable openings | Source geometry or candidate supplier | Materials/UVs, articulation and any depiction of use |
| Bad deformation | Geometry, skin weights or rig | Affected clips, garment fits and runtime bounds |
| Sliding or mistimed contact | Motion, retargeting or its native-timing integration | Transition, effect/audio timing and relevant actions |
| Correct source but broken runtime view | Export and renderer consumption | Final artifacts, actual game poses and loading/replacement behavior |
| Repeated variants lose identity | Shared brief, references or family controls | Variant generation and cross-representation review |

## Maintained records

- **Art and sources:** [art-direction progress](../maintainers/art-direction.md), [mercenary study](../maintainers/art/mercenary.md), [creative brief](../../art-direction/final-board/creative-brief.md).
- **Implementation and qualification:** [V3D](../maintainers/3d-pixel-art.md), relevant [persistent-object work](../maintainers/persistent-objects.md), [spatial presentation](../maintainers/spatial-world.md), and the affected gameplay owner. Art study acceptance does not close their broader work.
- **Limits and constraints:** [3D art inventory](../limits/3d-pixel-art.md), [spatial inventory](../limits/spatial.md), and the relevant object/action limits. This procedure introduces no new asset counts, geometry caps, animation cadence or hardware guarantees.
- **Research:** [procedural art and animation](../../archive/02-research/ai-game-development/03-procedural-art-and-animation.md), [inspected tooling](../../archive/02-research/ai-game-development/04-skills-and-tooling.md), [specialist models](../../archive/02-research/ai-game-development/07-image-3d-and-audio-models.md).
