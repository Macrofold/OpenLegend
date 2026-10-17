# Procedural art and animation: production workflows for OpenLegend

**Research checked:** 2026-10-17. **Status:** research recommendations, not adopted implementation policy. No asset generator, paid service, animation tool, or external skill was installed or run for this research.

The strongest production opportunity is an editable family of assets that survives repeated changes. Visual exploration can reveal a better idea before production is settled. A selected production asset then needs to work at OpenLegend's camera distance, under its lighting, through its relevant animation states, and within its delivery budget. The [developer case studies](02-developer-case-studies.md) establish the evidence and its limits; this document turns those findings into proposed working methods.

The maintained [asset and animation route](../../../docs/production-workflows/assets-and-animation.md) and [scene/material/lighting route](../../../docs/production-workflows/scenes-and-interfaces.md) organize these methods into inputs, handoffs, optional stages and revision paths. This dossier retains the research rationale and source-specific limits.

## 1. Begin with the game that exists

OpenLegend already has a PlayCanvas world, React interface, elevated spatial geometry, lighting, shadows, sprites, and arbitrary camera orbit and pitch. Its delivered mercenary pilot adds a live skinned character, idle/walk animation, and asset-specific cape simulation, sampled through the actual world camera into a low-resolution color-and-depth presentation. The general external-model generation, validation, rig, equipment, and publication pipeline remains proposed. These are different levels of completion, and the next experiment should extend the actual bottleneck. [Project: world presentation](../../../docs/world-presentation.md), [art direction](../../../docs/maintainers/art-direction.md), [asset pipeline status](../../../docs/projects/3d-pixel-art-asset-pipeline.md).

**Proposed rule:** establish a small approved visual vocabulary in the real adventure before automating its variations. Prioritize a readable enemy, weapon, reward, useful invention, and resident interaction over a large unvalidated asset catalogue. That follows the project's enjoyable adventure and invention priorities, including an independently motivated resident and remembered consequences. [Project: gameplay priorities](../../../docs/repertoires/gameplay-priorities.md).

| Asset family                         | Most promising production method                        | Useful AI contribution                                               | Acceptance question for OpenLegend                                     |
| ------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Ground, stone, wood, metal           | Editable material recipe and baked maps                 | Propose palette, masks, and bounded parameter variations             | Does the surface remain readable under the actual camera and lights?   |
| Ruins, workbenches, rigid inventions | Approved modular geometry and material families         | Fill a genuinely missing visual part; propose compatible composition | Are shape, scale, contact points, and functional parts understandable? |
| Humanoid characters                  | Approved body/rig family with reusable clips            | Draft appearance, poses, or compatible motion                        | Does the character work through actions and camera changes?            |
| Vegetation                           | Controlled scattering and reusable geometry             | Suggest distributions and variants                                   | Does density preserve navigation, sight lines, and frame time?         |
| Inventory icons and portraits        | Explicit family template and shared appearance identity | Produce constrained variations and edits                             | Is the same item or person recognizable in UI and world?               |
| Impacts, spells, interaction effects | Reusable particle, shader, or flipbook families         | Draft timing and imagery                                             | Is the action legible without obscuring threats?                       |

These are proposed methods, not claims that each intake or generator already exists.

## 2. What the graph tools in Project Tomorrow actually do

The supplied [Project Tomorrow video](https://www.youtube.com/watch?v=KuWTf7KrF6Y) describes three distinct authoring systems. **Substance Designer** builds texture recipes from connected operations; **Substance Painter** applies materials to an existing mesh using information baked from its geometry; **Blender Geometry Nodes** builds or distributes geometry. The user's transcript is the evidence for the creator's exact workflow. The tools' own documentation independently supports the mechanisms below.

Designer exposes parameters so a surface recipe can be varied without editing every internal operation. Painter's Smart Materials can use baked features such as curvature to place wear and other surface variation. Neither technique requires a language model. [Adobe: Designer workflow](https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/getting-started/workflow-overview), [exposing parameters](https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/substance-graphs/manage-parameters/exposing-a-parameter), [Smart Material tutorial](https://www.adobe.com/us/learn/substance-3d-painter/web/creating-a-flannel-smart-material-in-substance-painter).

For an alternative worth evaluating, **Material Maker** is an open-source procedural material authoring application built with Godot. Its graphs produce texture channels including albedo, roughness, metalness, normals, and emission. That implementation choice does not require the receiving game to use Godot. Exported textures can be evaluated in a PlayCanvas workflow. [Material Maker project](https://www.materialmaker.org/), [official introduction](https://rodzill4.github.io/material-maker/doc/intro.html).

**Recommendation for us:** choose the authoring application by the accepted result and revision cost. A skill catalogue with many Godot entries does not determine whether its texture outputs suit OpenLegend. PlayCanvas documents a conventional GLB asset path from tools such as Blender, including materials and skeletal animation; it does not require all art to be authored inside the runtime engine. The lower portion of that documentation contains an old Blender example, so version-specific export instructions should come from the current exporter. [PlayCanvas: building models](https://developer.playcanvas.com/user-manual/assets/models/building/).

## 3. Workflow A: one material family, many controlled variants

**When to use it:** repeated ground, cliffs, wood, plaster, cloth, or metal that should look related. This is a better first candidate than generating every texture independently because the desired variation is largely known. It fits OpenLegend's world-scale coherence and frequent reuse.

**Proposed working sequence:**

1. Choose one representative surface in a real gameplay scene. Record the desired palette, large forms, edge treatment, and amount of detail visible at normal zoom.
2. Approve one baseline material. A graph does not supply taste; it reproduces the choices encoded in it.
3. Separate controllable properties: base color, broad surface structure, wear, roughness, and normal detail. Keep changes such as wetness or damage distinct from the underlying material identity.
4. Expose a short set of meaningful controls, such as stone size, crack amount, hue range, and wear. Avoid an unreviewable bank of arbitrary noise parameters.
5. Export a small contact sheet of deliberate variants, including extremes. Review obvious seams, repeated landmarks, and loss of identity before multiplying the family.
6. Inspect accepted variants in the game under changing light and camera distance. Save the source graph and accepted parameter values so a style revision can propagate.

The reusable-parameter mechanism is documented by Adobe; the sequence and suggested controls above are our application of it, not a reported Adobe benchmark. [Adobe: exposed parameters](https://experienceleague.adobe.com/en/docs/substance-3d-designer/using/substance-graphs/manage-parameters/exposing-a-parameter).

**Limits to inspect:** normal maps affect surface lighting, not the object's outer silhouette. They cannot make a flat cliff edge visibly jagged. Highly detailed material output can disappear or shimmer when reduced to the project's pixel presentation. Prefer meaningful large forms before microdetail. Dead Cells' artist reports that automatic normal-map conversion did not produce the intended look, requiring art decisions beyond a converter; this is useful counterevidence to assuming that more generated maps automatically improve stylized art. [Gwenaël Massé's first-person art breakdown](https://www.gamedeveloper.com/production/art-design-deep-dive-giving-back-colors-to-cryptic-worlds-in-i-dead-cells-i-).

**AI's useful place:** produce candidate masks, suggest parameter ranges, help expose controls, or compare rendered variants against the brief. Keep the approved graph editable. Replacing it with a fresh unrelated image on each revision would discard the property that makes this workflow economical.

## 4. Workflow B: modular props and appearance-consistent invention

**When to use it:** weapons, containers, machines, furniture, and construction pieces. A rigid prop is a cleaner first test of a general asset intake than a novel creature: it isolates shape, materials, export, scale, and visual identity before introducing deformation and motion. This is a proposed extension of the existing pilot, not another test of whether live 3D can be displayed at all.

Start with the appearance owner's existing choice order: approved exact art, compatible parts and materials, fallback, then bounded optional generation where needed. Reuse one appearance identity for world presentation and its icon. Visual generation must not invent capabilities or authorize a mechanical effect. [Project: invention art pipeline](../../../docs/invention-art-pipeline.md).

**Proposed sequence:** agree on a silhouette and functional parts; assemble approved components; generate or model only the missing visual piece; normalize size, orientation, origin, and attachment locations; apply the material family; export; compare the world object and inventory icon together. For a device whose function depends on a nozzle or handle, the relevant part must remain visible from ordinary play angles. Inspect unseen sides and the underside before accepting a front-view generation.

Smart Materials reduce repetitive surface treatment after a usable mesh exists. They do not automatically repair malformed geometry or make every object share the right silhouette. A curvature-driven wear recipe also depends on the mesh and its baked maps, making bad inputs an art-production issue. [Adobe's geometry-responsive material example](https://www.adobe.com/us/learn/substance-3d-painter/web/creating-a-flannel-smart-material-in-substance-painter).

At delivery, examine the exported asset. The maintained Blender glTF exporter documents supported material channels, conversion of polygons to triangles, and possible vertex-count growth at UV or shading discontinuities. Therefore a pleasing Blender viewport and a nominal modelling polygon count are insufficient delivery evidence. Keep the exported feature set within what OpenLegend's eventual intake and renderer actually validate; GLB support alone is not a universal shader or rig guarantee. [Khronos-maintained exporter documentation](https://github.com/KhronosGroup/glTF-Blender-IO/blob/main/docs/blender_docs/scene_gltf2.rst).

The project's general intake remains proposed. This research recommends the shape of a qualification exercise; it does not silently add a new runtime contract.

## 5. Workflow C: procedural vegetation and authored placement

Geometry Nodes can instance repeated geometry at points; realizing instances converts those duplicates into separate geometry data. Blender's documentation distinguishes these operations, including the cost-sensitive recommendation to realize only where necessary. [Blender instance documentation](https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/instances.html), [Geometry Nodes performance guidance](https://docs.staging.blender.org/manual/en/latest/modeling/geometry_nodes/performance.html).

**Proposed workflow:** approve a trunk, canopy silhouette, and leaf-card family; create a parameterized distribution with a reproducible seed; generate several controlled variants; review all relevant camera angles; then decide how the delivery asset should preserve repetition. Do not flatten a large forest into duplicated geometry merely because a tutorial's export step does so. Verify the actual runtime representation and cost.

Placement rules should express both appearance and gameplay: maintain a path corridor, keep an enemy readable, avoid putting a giant plant through a doorway, and preserve authored landmarks. Guerrilla's developer describes artist-directed rules for procedural placement in Horizon Zero Dawn, including repaintable biomes, treelines, and roads. Its scale demonstrates the value of author controls; it does not justify porting the studio's GPU system into OpenLegend. [Jaap van Muijden's official presentation abstract](https://www.guerrilla-games.com/read/gpu-based-procedural-placement-in-horizon-zero-dawn).

In OpenLegend, a decorative plant and a harvestable or obstructing plant may look similar but have different world meaning. The world must own whether it blocks movement, carries resources, or changes state. The generation recipe should supply appearance within those facts. This follows the existing separation of presentation and authoritative world state. [Project: world presentation](../../../docs/world-presentation.md).

**Practical limits:** leaf-card overdraw, shadows, repeated silhouettes, and camera-facing artifacts need review in the final scene. Variation should not be measured by seed count alone. A family with several compositionally useful shapes can be more valuable than hundreds of nearly identical random trees.

## 6. Workflow D: reusable animation with deliberate finishing

First specify the visible gameplay action: anticipation, contact, recovery, direction, and relevant equipment. Then choose motion tooling. A motion that looks natural in a presentation may feel unresponsive when the player needs an immediate attack or turn; action timing must be judged with input and game state.

| Starting point                      | Evidence-backed capability                                                                                            | Production work still needed                                                                                     |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Authored animation or licensed clip | Editable motion with an established skeleton                                                                          | Retargeting, contacts, timing, equipment, export                                                                 |
| Mixamo                              | Adobe documents automatic rigging and reusable animation for bipedal humanoids; its FAQ permits royalty-free game use | Suitable mesh and pose; local source retention; quality review on the actual body                                |
| Cascadeur                           | Assisted posing/physics workflow and current GLB/GLTF export documentation                                            | Animator decisions and polishing; verify current feature and licence eligibility                                 |
| DeepMotion Animate 3D               | Video-to-motion workflow with explicit foot-locking controls                                                          | Input quality, retargeting, contact cleanup, foot sliding, action readability                                    |
| NVIDIA Kimodo                       | Documented skeletal motion generation with constraints                                                                | Skeleton compatibility and game-specific validation; research capability is not automatic pipeline qualification |

Sources: [Adobe Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html), [Cascadeur FAQ](https://cascadeur.com/help/faq), [Cascadeur GLB/GLTF export](https://cascadeur.com/help/category/283), [DeepMotion foot-locking documentation](https://www.deepmotion.com/article/foot-locking), [NVIDIA Kimodo documentation](https://research.nvidia.com/labs/sil/projects/kimodo/docs/). These are primary capability documents, not comparative quality tests or endorsements of a particular paid plan.

**Proposed sequence for OpenLegend:**

1. Select an existing compatible body and a concrete action needed by the adventure. Name its start, contact, and end states.
2. Establish a neutral pose, rig mapping, orientation, scale, and expected root travel. Save the source independently of any web service's session.
3. Obtain an editable clip from the simplest adequate source. Use video generation only as visual reference unless it actually provides usable skeletal motion.
4. Retarget and finish the clip: weapon grip, hand/foot contact, recovery time, body intersections, and readable silhouette. Examine turning and transitions as well as the isolated action.
5. Export the selected clips and inspect their names, range, and playback. Blender's exporter supports object transforms, pose bones, and shape-key animation; arbitrary authoring physics is not a portable animation contract. Bake the appropriate result where needed. [Khronos exporter animation documentation](https://github.com/KhronosGroup/glTF-Blender-IO/blob/main/docs/blender_docs/scene_gltf2.rst).
6. Review at actual pixel scale, orbit angles, pitch, and light conditions. Check depth/occlusion, equipment, and unsupported-state fallback as specified by the project's presentation owner. [Project: 3D pixel-art feature specification](../../../docs/projects/3d-pixel-art-feature-spec.md).

**Do not generalize the pilot's cape to all cloth, or a humanoid auto-rigger to every invented anatomy.** Adobe explicitly limits Mixamo auto-rigging to bipedal humanoids and lists mesh conditions that impede it. Use a compatible motion family, a simpler authored action, or the established fallback while unfamiliar body structures remain unqualified. [Adobe Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html).

For aiming and reach, the Project Tomorrow transcript suggests a practical idea: define the target and let a reusable pose system adapt the body. Treat inverse kinematics as a bounded tool for a specific contact or aim relationship. Embark's first-person account of learned physical animation describes roughly a dozen specialists and around two years of work; OpenLegend should not infer that training a custom locomotion system is a small automation shortcut. [Embark: transforming animation with machine learning](https://medium.com/embarkstudios/transforming-animation-with-machine-learning-27ac694590c).

## 7. Lighting, visual hierarchy, and feedback

The proposed review loop should preserve OpenLegend's existing lighting and depth system while improving the supplied art. Compare a candidate against approved objects in a normal play scene, not only against a neutral model viewer. Review day/night or representative light states, overlapping characters, moving shadows, and the UI sitting over the world. The current project owner already documents these rendering relationships. [Project: world presentation](../../../docs/world-presentation.md).

A useful review order is silhouette, value grouping, palette, material response, then decorative detail. The order is our recommendation. Its production precedent is Dead Cells' deliberate distinction between background, obstacles, interactive objects, and threats, with greater attention drawn to gameplay-critical elements. [Massé's art-direction account](https://www.gamedeveloper.com/production/art-design-deep-dive-giving-back-colors-to-cryptic-worlds-in-i-dead-cells-i-).

For generated albedo or material references, inspect whether fixed painted highlights conflict with the scene's light. Review detail after the game's sampling step. Ask the reviewer to identify the enemy, equipped weapon, usable reward, and interactable object without being told where to look. Record a concrete defect such as “blade merges into torso at normal zoom” so the next edit addresses an observable problem.

The lesson for agent skills is specific: a valuable art skill should assemble the right references, modify the relevant source, render the actual result, inspect it, and preserve the accepted version. Merely knowing application commands or successfully calling an image provider is not evidence of improved art. This is a proposed qualification standard, not a claim that any discovered community skill already passes it.

## 8. Where AI and procedural systems fit together

SideFX's ML Sketching example predicts parameters for an existing procedural generator from a drawing. Its bottle example is a concrete demonstration of AI choosing within a controllable shape system. It is a vendor technical example requiring setup and training data, not a shipped-game productivity study. [SideFX: ML Sketching](https://www.sidefx.com/contentlibrary/ml-sketching/).

**Our inference:** language or image input can help choose among approved parameters and parts before asking for unconstrained new geometry. For example, a request for a battered copper container could select an existing vessel shape, a copper material, and controlled wear. That only covers appearances expressible by the approved family; a genuinely new silhouette remains a separate production problem. The appeal for OpenLegend is editable variation around stable appearance identities and world facts, while preserving room for unfamiliar inventions.

Do not turn this inference into an immediate custom ML training project. Begin with ordinary parameter selection and an explicit review loop. Training only becomes attractive when a demonstrated recurring task is difficult to express through simpler controls and there is enough accepted example data.

## 9. Measure accepted production, not generated output

A future qualification exercise should compare the current manual/reuse route with one proposed assisted route on the same brief. Include a rigid prop with an icon, a material variant, and an action on a compatible rig. These are representative examples, not a new mandatory project milestone or permission to implement one during this research.

Record source preparation, unsuccessful attempts, edits, export/cleanup, in-game review, and accepted outputs. A useful accounting identity is:

**Cost per accepted asset = total attributable generation, licence, human editing, and integration cost ÷ accepted usable assets.**

Also record elapsed time to the first accepted result, time for a specified revision, consistency with existing art, and playback/rendering defects. A route with cheap candidates can lose to reuse after cleanup; a licensed tool can win if it saves repeated skilled labor. No numerical savings are asserted without this comparison.

Preserve the editable source, exact accepted settings, provider/tool version where applicable, input references and their permitted uses, output files, and the game-scene evidence used to accept the asset. Keep this with the existing art-production record rather than inventing a parallel authority. [Project: art-direction workspace and validation ownership](../../../docs/maintainers/art-direction.md).

Project Tomorrow's pooling and shared-simulation lessons belong to measured runtime bottlenecks. The supplied transcript demonstrates the developer's architectural choices, but its claims about other games' CPU use should not be adopted as general evidence. Import the habit of measuring the workload; do not infer that Unity DOTS, a new engine, or custom multithreading is required to make this browser adventure successful.

The next useful decision is which repeatable task can produce a visibly better accepted game asset with less total work. The research supports procedural material families, compatible animation reuse, selective generation, and direct scene review as strong candidates. It does not establish that a vendor, model, or engine will independently supply the game's art direction.
