# Character production: from a chosen design to a usable performance

This is the detailed character recipe for [assets and animation](assets-and-animation.md#articulated-people-and-creatures) and [production art packages](art-flows/production.md#3d-characters-and-creatures). It applies after the requested subject and stopping point are known. It is not a new generation service, renderer, character editor or source of world rules. Reuse the existing [3D feature specification](../projects/3d-pixel-art-feature-spec.md), [technical design](../projects/3d-pixel-art-tech-design.md), [appearance families](../projects/3d-pixel-art-appearance-families.md), [asset workflow](../asset-workflow.md) and [art direction](../../art-direction/decisions.md#current-visual-requirements--october-16-2026).

The purpose is a person the player recognizes, whose actions and possessions are understandable, and whose distinctive appearance can be revised without rebuilding everything. An attractive turnaround is useful intermediate work, not proof of animation, equipment compatibility, performance or enjoyment. This recipe specifies the work; it does not assert that the general production family has been qualified.

## Read and execute only the requested route

| Requested finish | Deliver and inspect | Do not silently add |
| --- | --- | --- |
| Study | The requested visual alternatives, consistent identity/construction references, assessment and preserved sources | A production rig, purchased toolchain or game integration |
| Production | The named model/material/rig/clip package, a fresh import of its actual exports, a coverage record and editable sources needed for the promised revision | New gameplay, a new importer, production rights inferred from a thumbnail, or a claim that the running game was tested |
| Integrate | The production work actually needed, plus the supported character and equipment working in the real game and the relevant downstream checks | Unrequested mechanics, an engine migration or a second authority for movement and outcomes |

Standard and Higgsfield are ways to obtain and revise inputs, not different compatibility contracts. A Higgsfield image or movie is reference unless it actually contains the required exported geometry or motion data. Use the [shared flow](art-flows/README.md) for tools, authority, spending, coordination and preservation. Skip a step whose output is already valid at the exact source revision; repeat only checks invalidated by a change.

## 1. Define the playable purpose and the delivery contract

**Inputs:** the request, selected art direction, the actual character/object facts, current supported actions, existing sources and the relevant consumer.

1. Write one sentence describing what the player should recognize or understand. Prefer a concrete moment: recognize a returning resident, follow a tool being handed over, read a person's preparation to act, or understand an invented object's use. A quiet person absorbed in something enjoyable is as legitimate as a combatant.
2. Choose the actual subject. Preserve an existing person's accepted face, anatomy, proportions, asymmetry, clothing and possessions unless the task authorizes changing them. The existing mercenary is a useful control where its rights and required coverage permit; it is not a mandatory source for every person.
3. Identify the required views, ordinary gameplay camera, overview and close inspection, lighting cases, supported actions, equipment changes and interactions. Read the current [world presentation](../world-presentation.md), rather than copying an old study's dimensions or shader settings as universal requirements.
4. Separate facts into authored visual identity, permitted current world facts, and unresolved design choices. Clothing can suggest use or culture; appearance must not reveal a secret biography, declare a moral alignment, fabricate an injury or prove what the character believes. A scuffed tool can be an authored visual choice without claiming a particular unrecorded historical event.
5. Record the consumer contract using the existing [package fields](art-flows/production.md#1-define-the-package-before-finishing): source/export formats, tool and importer revisions, units, orientation, support anchor, rig/bind convention, attachments, clips, material features, resource limits, rights and required evidence. Link settled values instead of copying a second policy table.
6. List the smallest complete requested coverage. Mark each item as already satisfied, to produce, or blocked with a reason. An optional portrait, facial rig, cloth solver or animal family is not a prerequisite to every humanoid.

**Output:** one brief in the existing study record, including the selected finish and concrete completion conditions. **Proceed when:** another contributor can tell what must be delivered, which facts cannot change, and which unsupported capability must not be promised.

## 2. Choose the source and establish a visual control

Inspect the actual available files before choosing a tool. Prefer suitable approved reuse or fitted composition when it preserves the intended identity. Use original concept work, generation, direct modeling or a combination when the needed form is missing. A cheap stock asset is not a good substitute for a distinctive person if it violates the brief.

Record the original source revision and permitted uses. Confirm separately the rights to use a reference, upload it to a provider, retain/edit its output and distribute the final asset. Account access, a free download, a paid subscription and permission to publish are different facts. Unknown production rights block production promotion of that source, not independent study with a permitted alternative. Do not upload private character memories, world saves or unrelated account information as visual reference.

Place the existing accepted representation and the candidate beside a known adult or object at the same support height and comparable depth. Record camera, viewport, pixel treatment and light. Keep an unchanged control through the comparison. Do not enlarge a character's anatomy, change the camera only for the candidate, or add extra light to conceal a readability failure.

**Output:** a source/rights record and comparable baseline. **Proceed when:** the source is usable for the authorized stage, identity is clear, and the comparison will answer a real quality or production question.

## 3. Resolve the design before expensive finishing

1. Establish the large silhouette, natural proportions, posture, garment construction and a small number of distinctive features. Test the figure at ordinary play size before filling it with ornament. Selective contrast, purposeful folds and recognizable equipment matter more than uniform surface detail.
2. Review the face and hairstyle at both ordinary and close scales. Do not require every facial detail to survive an overview; do not use a beautiful portrait to excuse an unreadable ordinary-play figure.
3. Prepare neutral construction references when reconstructing geometry: full subject, restrained perspective, diffuse lighting, visible extremities and clear material boundaries. A dramatic concept remains the artistic reference, but its painted shadows need not become the model's base color.
4. Reconcile additional views against the same design. Check skull/profile, head-to-body relationship, garment closures, hem, belt/strap routing, handedness, distinctive marks and equipment positions. An invented back view is a proposed design decision, not evidence recovered from the front image.
5. Preserve coherent cultural and material choices without making every person a uniform. Similar clothing may have different fit, repair, use and personal selection. Shape, clothing, skin tone, age or disability must not function as automatic good/evil labels.
6. Choose one coherent direction before detailed dependent production. Compare alternatives only where the task requests them or a meaningful choice remains; do not generate near-identical batches merely to satisfy a count.

**Output:** an accepted or explicitly provisional construction reference and preserved identity features. **Repair:** a contradictory view goes back to design, not to the rigger to guess.

## 4. Decide which parts need independent control

Production separation and runtime separation solve different problems. Record each significant part's purpose before generating or cutting it.

| Part/use | Production choice | Final consequence |
| --- | --- | --- |
| Head whose design needs local improvement | Generate, sculpt or repair separately while retaining the successful body | Fit and join or deliberately retain a seam; this does not create a detachable-head mechanic |
| Continuous deforming body/joint | Preserve or rebuild a coherent surface around the moving region | The joint must bend without a visible gap or shading discontinuity; separate generation is not an advantage by itself |
| Removable weapon, tool, pack or equipment piece | Separate source with its own usable shape, scale and attachment | Keep it independently representable where the actual equipment system needs it; preserve the real item's identity |
| Garment that bends with the body | Fit to the reviewed body and bind convention | Skin it appropriately; separate source files do not prove interchangeable wardrobe fit |
| Buckle, ornament or other rigid detail | Retain separately only for a real editing, material, attachment or reuse need | It may join compatible final geometry; do not make every ornament a separately drawn object |
| Tail, hair section, scarf or loose garment | Choose the necessary movement representation explicitly | Extra bones, authored motion or simulation require actual export/consumer support; rigidity can be a deliberate first choice |

For a separately produced piece, carry the same design revision, units, pose, dimensions, material identity and connection landmarks. Inspect the unseen mating surfaces; segmentation does not necessarily provide finished interiors. Remove duplicate shells only after identifying which surface the final view and movement require. Join continuous boundaries deliberately and inspect normals; do not run a large automatic merge distance across the whole character and hope it produces a sound body.

**Output:** a small part plan within the brief, not a new runtime schema. **Proceed when:** every split has a benefit and a known assembly/fit check. No fixed number of parts or per-part polygon count is prescribed.

## 5. Choose the shortest adequate geometry route

| Observed need | Route | Evidence that justifies it |
| --- | --- | --- |
| The source already preserves shape, usable materials and required deformation | Direct refinement of that mesh | Neutral shape, joint poses, exported complexity and target presentation pass |
| One region has bad anatomy, holes, poor joint flow or a weak silhouette | Local modeling or local topology repair | The repaired region passes without unnecessarily replacing the rest of the identity |
| Important sculpted detail is missing but need not change the silhouette | Optional detailed source and baking onto a suitable runtime surface | The detail remains useful at the intended scale, and the actual exported maps are consumed correctly |
| The whole source is unsuitable for editing, deformation or delivery | Rebuild the needed topology or use a better source | Total accepted-asset effort and quality justify replacing the source rather than repeated patches |

Do not require a high-poly sculpt, retopology or normal-map bake for every character. Conversely, a provider's low-poly or quad label is not permission to skip deformation and delivery checks. Quads can be useful for authoring; final glTF geometry is triangulated. Inspect the exported triangles and vertices, including splits at UV seams or normal boundaries, rather than treating the editor's face count as the runtime cost.

Check neutral untextured form from front, sides, back and oblique views. Inspect underarms, hands, feet, garment interiors and covered surfaces that can become visible. Correct the structure before relying on texture to disguise it. Surface detail cannot repair a bad silhouette or supply missing volume.

**Output:** an editable geometry source and an explicit reason for any expensive conversion. **Proceed when:** the shape meets the brief and a provisional rig or representative deformation test gives no reason to discard the approach.

## 6. Assemble and prove movement before final polish

Fit the pieces in the chosen rest/bind pose. Align the head and neck, shoulder and hip regions, support contact and equipment scale. Preserve an unmodified source and work on a named revision. Avoid applying scale or changing rest transforms blindly after binding: inspect the actual rig/export consequence.

Use an existing compatible rig when possible. An automatic rigger is a starting tool, not a finished compatibility proof. Confirm joint placement, orientation, hierarchy and proportions; inspect elbows, knees, shoulder motion, wrist/forearm twist and hand placement. Preserve the relationship between the authoring controls and the deforming skeleton. Exported joint names alone do not establish compatibility.

Bind flexible surfaces to the intended bones. Inspect for unweighted vertices and accidental influence from nearby unrelated bones. A rigid pack or buckle should not melt when the torso bends; a long sleeve should not be treated as a rigid object. Transfer weights only between genuinely corresponding surfaces, then correct the result. Retain useful uncovered body source; hide or omit covered runtime geometry only for the actual approved outfit/coverage arrangement, not globally for every future outfit.

Exercise the required neutral, walking, turning, arm-reach, hand-grip, bend and seated/resting poses as applicable. Add the most demanding supported action for this subject. Source stress poses may diagnose fit without claiming the game supports that action. Check at normal speed and at problematic frames. Fix collapsing volume, seam gaps, foot support, twisting equipment and garment penetration before creating a long clip library.

A production request proves movement in a compatible preview and fresh import. An integration request also brings this rough export into the actual game early. Do not start or modify a game merely because a study requested concept art.

**Output:** a body/rig revision with named tested poses, known limitations and valid attachments. **Repair:** diagnose shape, weights, rest pose or motion separately; hiding the failure behind one camera angle is not a fix.

## 7. Author UVs, materials and identity detail deliberately

A UV layout maps the surface onto a flat texture. Check it with a diagnostic pattern on the actual mesh: visible stretching, inconsistent allocation, seams crossing important facial features, overlaps that accidentally mirror asymmetry and insufficient padding between islands. Preserve intentional overlaps only when they do not contradict identity or lighting. Allocate useful detail to the face, hands and distinguishing marks according to their screen footprint, not uniform maximum resolution.

Establish clear material regions such as skin, hair, cloth, leather and metal using the source method and channels that the actual renderer supports. Review restrained base color without accidental directional shadows or highlights, then roughness/metal response under neutral light and the game's relevant daylight/shade/firelight. Do not copy a color image into normal or roughness channels and claim those maps are authored. Avoid physical-sounding material labels whose actual behavior is untested.

Baking can serve two different purposes: transfer detail from a higher-detail mesh, or derive geometric maps used by material tools. Skipping the first does not forbid the second. When baking, inspect projection/cage overlap, seams and the resulting maps on the exported low-detail mesh. Recheck affected maps when geometry or UVs change. Keep authoring materials editable; export only the supported channels, color spaces, normal orientation, packing and alpha handling.

Finish eyes, brows and other identity features locally. A separate eye surface is an option when its shape, pose or close-view quality warrants it, not a mandatory step for every small figure. Verify both eyes' placement, direction and appearance after export. Do not replace the whole character to fix a small facial defect. Keep garment pattern and surface variation grouped; extra microdetail is a defect when it becomes crawling noise in the pixel treatment.

**Output:** inspected material assignments and consumed maps, plus the editable source needed for later correction. **Proceed when:** materials retain identity and readable form under the required views and lights, not merely in the material editor.

## 8. Make motion communicate an actual action

For each required clip or motion family, record its compatible rig, intended action/state, entry pose, preparation, repeating/held portion if any, meaningful contact, exit/recovery, interruption behavior, loop boundary and root-motion convention. Reuse the existing action and presentation owners; a clip's filename is not a new gameplay rule.

Block the main poses and timing before polishing curves. Study appropriate real movement or permitted reference; use compatible captured or existing motion when useful. Retargeting maps movement between skeletons, but proportions, grips and feet still need correction. A generated movie is not an animation clip unless actual supported rig data is exported.

Inspect weight transfer, balance, arcs, facing and the relationship between the body and carried objects. Keep preparation readable without adding input delay to make an animation look impressive. Do not time a successful strike, completed handoff or item creation solely from a visual marker. Native action results, custody and movement remain authoritative. A failed or interrupted action must not play an unqualified success ending.

Test the transitions required by play, not just isolated loops: idle to move, stop, turn, move to use, use interrupted, equip/drop or handoff when supported, and supported rest/death recovery boundaries. Inspect feet for sliding at the actual native speed and hands for grip changes. In-place clips are the starting route under the existing family contract; any traveling clip must be reconciled through the current movement owner, not a second position writer.

Use posture, tempo and restrained gesture to distinguish individuals without requiring bespoke motion for every biography trait. Do not map private cognition directly to visible acting unless the existing permitted presentation supplies that expression. Refusal, hesitation, pleasure, attentiveness and solitude need not become compulsory animations or scripts. Facial acting and optional voice remain scoped capabilities; body auto-rigging does not establish a facial rig or lip sync.

**Output:** a small useful motion set and transition coverage, with actual exported joint motion. **Proceed when:** the action reads, remains responsive and depicts only the supported outcome.

## 9. Add secondary motion only where it earns its cost

Start with a stable silhouette and settled clothing. Compare the actual benefit of authored bone motion, a suitable baked clip or the existing qualified simulation before adding a new solver. These are alternatives, not mandatory successive implementation stages.

For any moving cloth, hair, tail or dangling object, specify the attachment, movement extent, contact expectations, pause behavior and reset after loading, teleporting or a long presentation gap. Distinguish exported movement from live simulation. Baked cloth for one clip is not arbitrary interactive cloth; an Unreal physics setup does not transfer automatically into PlayCanvas.

Review subtle motion in ordinary play, at rest, while turning and during interruption. Reject distracting perpetual flutter, penetration, runaway motion and pixel shimmer. Optional motion may simplify on an applicable quality tier, but it must not change the person's identity, body state or actual equipment. Technical implementation and device qualification remain with the existing presentation/family owners.

**Output:** a justified selected treatment and its actual supported fallback. **Proceed when:** the additional motion improves presence or readability without breaking the base representation. No cloth-physics requirement is added to ordinary character production.

## 10. Export what the consumer actually supports

1. Pin the final body, rig, material and clip revisions. Export from a deliberate collection/selection so hidden experiments, unused cameras/lights, duplicate bodies and unnecessary helpers do not enter the package.
2. Use the project's supported glTF/GLB profile for runtime delivery. An FBX useful between authoring tools is not a promise that the standalone PlayCanvas runtime loads FBX. Do not assume Editor conversion features exist in this code-based integration.
3. Choose the actual export action/track mode for the installed authoring-tool version. Confirm required clips are included, independently named where needed, have correct ranges/loop assumptions and are not accidentally concatenated. Bake evaluated controls/constraints into supported channels when required; do not expect an editor rig, arbitrary material graph or physics solver to execute in the game.
4. Inspect units, axes, hierarchy, bind transforms, joint weights, outward faces, bounds, support anchor and intended grips. Check triangulated geometry, vertex count, material/draw divisions, image dimensions and decoded memory where measured. A smaller file alone does not prove less render work.
5. Check all texture and binary dependencies, channels, color spaces, alpha, filtering and the selected extension support. Unknown required features do not become accepted because a generic viewer loads them. Do not import generated scripts, executable callbacks or physics metadata as authority.
6. Reopen the actual export in a clean scene or process, without the source scene quietly supplying missing data. Play every required clip on the exported body. Confirm non-root joint motion, materials, feet, attachments and rest pose; inspect the same views used for the source.
7. Record exact files/hashes and source-to-export relations through the existing asset workflow. Preserve the source, not only an expiring generator URL or remembered prompt.

**Output:** a technically inspected export package with an honest coverage record. **Repair:** if source and export disagree, diagnose the export/material/clip conversion before regenerating the artwork.

## 11. Review the integrated person, not a showcase still

For authorized integration, use the current game renderer, actual supported entity and existing action/equipment consumers. Retain the previous adequate representation until the replacement is both usable and intentionally selected. Source preview, generic viewer import and runtime qualification are separate results.

Run a small connected episode with the required behaviors. For example, an existing resident walks, turns, uses a supported tool, stops or is interrupted, changes a supported equipment item and returns to an ordinary activity. Choose a scene that expresses OpenLegend's independent people, practical use or meaningful possession rather than merely reproducing a parkour showcase. A hypothetical future scene must be labeled as such and must not be staged as proof of unimplemented mechanics.

Review ordinary play first, then overview and close inspection. Include rotation, pitch/zoom changes relevant to the current camera, daylight/shade/local firelight, occlusion, contact and supported state changes. For shimmer, separate a stationary subject/camera, camera-only movement, subject-only movement and lighting-only changes before deciding whether geometry, paint, sampling or secondary motion is responsible. Do not lower the requirement, add blur, change anatomy or hide a weak view to obtain an apparent pass.

Follow real custody and visibility: a dropped item leaves the attachment and appears as that item, not a new cosmetic copy; a transferred object does not remain in both hands; a hidden or removed person must not remain live through a pending load or optional effect. Use the existing technical owners for these behaviors, not artist-authored callbacks. Missing visual coverage for an important supported state needs an adequate declared fallback; optional polish may wait, but an inappropriate living pose cannot silently represent a corpse.

Measure the exact candidate against the unchanged control on the same workload and device conditions. Separate load/decode, texture memory, draws/materials, skeleton updates and secondary motion where available. A single-character measurement does not qualify a crowd. Use existing device and resource acceptance requirements rather than inventing new universal budgets here.

**Output:** observed gameplay, rendering and resource results, plus explicit failures and human-review status. **Proceed when:** required technical passes hold and the promised artistic selection has actually occurred. A documentation review cannot supply that selection.

## 12. Prove useful revision before declaring a reusable family

Where reuse is the purpose, make one meaningful requested variation from the approved master: for example, repair the face without changing the body, replace a compatible pack, or fit a second outfit. Record what remained reusable and what needed adjustment. A recolor alone does not prove garment fit; an outfit does not prove another anatomy. Review the changed source and affected exports, clips, attachments and derived identity views.

Do not promise every body/outfit combination. The [appearance-family contract](../projects/3d-pixel-art-appearance-families.md) owns compatibility and supported combinations. Test the combinations actually being admitted, including the relevant difficult fit. Do not generate a separate whole person for every outfit merely because generation is available. Do not create a universal garment solver before a concrete supported family needs it.

When a pipeline decision remains unresolved, compare the candidate route with the actual existing/manual baseline on the same brief and needed coverage. A Tripo-versus-Meshy comparison is optional evidence for a real provider decision, not a permanent requirement to run three pipelines for every asset. Separate controlled model comparison from an optimized end-to-end workflow comparison. Count rejected outputs, assembly, fitting, rig repair, texturing, export, integration and revision effort; distinguish operator time, wall time, credits, subscriptions and settled or uncertain charges. The video's reported duration is not an OpenLegend schedule or cost estimate.

**Output:** a reproducible useful revision and scoped reuse claim. **Proceed when:** the evidence supports precisely the family/revision claim being made, not a population or nonhuman claim inferred from one successful person.

## 13. Preserve the handoff in the existing study record

Use [the study record](art-flows/study-record.md), the [production package](art-flows/production.md#5-package-preserve-and-hand-off) and the [asset workflow](../asset-workflow.md). No parallel database or new mandatory asset-ID scheme is introduced.

A junior contributor should be able to find, without private chat history:

- The brief, selected finish, protected identity and actual consumer/revisions.
- Exact approved reference/source/export locations, hashes, rights, attribution and visibility.
- Which parts were independently produced, how they fit, and which remain independent at runtime.
- The editable geometry, UV/material sources, rig, clips and the actual export method/settings needed for the promised revision; unavailable upstream editing capabilities are explicit.
- Compatible body/rig/outfit/attachment revisions, supported actions and states, meaningful failures and adequate fallbacks.
- Comparable review conditions, actual technical/artistic evidence, unresolved defects and the next responsible owner.
- Actual costs and outstanding operations where generation was used, without exposing private receipts or credentials.

Keep large payloads and meaningful iterations in the existing external library/study collections. Git stores concise instructions, provenance, catalogs and verified exact references. Do not overwrite earlier requested alternatives, invent a public URL, or mark preservation complete before retrieval and dependency checks. A new thread should resume the named stage from these sources rather than rerun all generation.

## Repair map

| Failure | First owner to inspect | Recheck after repair |
| --- | --- | --- |
| Unrecognizable person at play scale | Shape, identity features and contrast at the actual camera | Required views, nearby cast and pixel presentation |
| Separate head looks pasted on | Scale/neck connection, normals, skin/material agreement and weights | Turns, neck/shoulder poses, lighting and exported seam |
| Good neutral mesh collapses in motion | Joint topology, weights, bind pose and motion | Stress poses and required clips, not just the repaired frame |
| Clothing disappears or reveals missing skin after a swap | Outfit-specific coverage and real compatible fit | Each admitted affected outfit and state |
| Tool bends, floats, changes hands or duplicates | Rigid/skin treatment, grip transform and actual equipment projection | Use, turn, interruption, equip/drop/transfer |
| Texture looks lit from two directions | Baked-light contamination and consumed material channels | Neutral, daylight, shade and local light |
| Eyes or garment details crawl | Actual screen footprint, UV allocation, contrast and sampling | Stationary, camera-only and subject-only motion separately |
| Good source loses clips or materials in game | Export settings, actual bytes and importer support | Fresh import of the package and affected real consumer |
| Beautiful motion feels slow or claims a false result | Action timing, transition and presentation binding | Start/stop, interruption, failure and native outcome |
| Optional cloth makes the whole result unstable | Attachment/reset/contact and chosen secondary-motion method | Stable no-motion control, pause/load and representative movement |

Fix the responsible source and only its affected dependents. A defect in one small region is not an automatic full regeneration, tool migration or redesign of the character system.

## Completion and maintained records

Production completion means the requested actual package and coverage are present, the source-to-export checks pass, preservation is verified and remaining integration requirements are explicit. Integration completion additionally needs the actual runtime checks required by its scope. Human aesthetic or enjoyment acceptance remains external evidence, not a model's self-score. No defect-free guarantee, population scale, production speed or provider winner is established by writing this procedure.

- Product and technical contracts: [3D feature specification](../projects/3d-pixel-art-feature-spec.md), [technical design](../projects/3d-pixel-art-tech-design.md) and [appearance families](../projects/3d-pixel-art-appearance-families.md).
- Work and actual qualification: [art direction](../maintainers/art-direction.md#art-flow-follow-through) and [V3D](../maintainers/3d-pixel-art.md), especially humanoid/equipment and separate nonhuman family acceptance.
- Constraints: existing [3D appearance limits](../limits/3d-pixel-art.md), selected consumer requirements and shared art-flow spending/storage rules. This guidance adds no gameplay cap or universal polygon, texture, bone, cloth or frame-rate budget.
- Research: the [character-production evidence](../../art-direction/research/3d-pixel-worlds/character-production-workflows.md) separates the supplied tutorial, professional practice, vendor documentation and OpenLegend-specific design judgment.
