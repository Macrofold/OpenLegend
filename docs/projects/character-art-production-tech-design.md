# Character-art production — technical design and execution guide

| Status | Current progress | Last updated |
| --- | --- | --- |
| Not started | The production procedure, handoffs and acceptance cases are specified; no new asset, tool trial or runtime integration has been executed. | 2026-10-31 |

## Read this first

Use the [feature specification](character-art-production-feature-spec.md) for outcomes, scope and decisions. This guide supplies the concrete offline steps. Follow only the stages the selected source and requested finish actually need. A compatible existing character does not need to be regenerated, re-unwrapped or re-rigged to comply with the guide.

The current repository base inspected for this design is GitHub `Macrofold/OpenLegend`, `main` at `7e95b415f18cc58828eacbddc88da8a86693c3d0`. The client pins PlayCanvas `2.22.2` in [package.json](../../apps/client/package.json). Recheck the executing checkout's package, importer and selected asset contract before producing exports for a changed consumer. Documentation of a general engine feature does not establish support in OpenLegend's narrower path.

**No runtime logic changes are designed here.** Existing semantic owners remain in the [3D technical design](3d-pixel-art-tech-design.md#2-semantic-owners): native body/object/action facts, server-scoped presentation, client representation resources and immutable asset publication. Existing family, lifecycle, private-information and spending contracts are consumed, not duplicated. A newly discovered missing runtime capability is a separately scoped V3D or gameplay task; an artist must not simulate its existence in metadata or animation.

## 1. Working arrangement and handoff

One coordinator owns the complete requested result. The character designer owns the selected visible identity; the modeling/material artist owns editable geometry and surfaces; the rigging/animation contributor owns deformation and motion; the integration contributor owns the actual consumer and native-state mapping. One person can fill all roles. Give one writer responsibility for each source file. Independent concept alternatives or material samples may run in parallel; final skinning and fitted clothes must not silently consume different body revisions.

Use the existing [study record](../production-workflows/art-flows/study-record.md), not a new production database. Keep task progress, references and review observations there. The following information is a compact working checklist, **not a new runtime schema**:

| Information | Record once in the existing brief/package |
| --- | --- |
| Intended result | Selected character/object, wanted player experience, study/production/integrate finish and the actual consumer. |
| Identity and freedoms | Exact approved reference/source revision; features that must remain; routine artistic choices still open; material identity changes requiring owner input. |
| Required coverage | Needed camera scale/views, actions and states, body/outfit/item combinations and the one useful revision being proved. |
| Source and rights | Exact source files, creator/provider, permitted reference/input use, production/export/distribution use and known restrictions. Unknown is not approved. |
| Construction | Units, facing, rest pose, body/rig family, part roles, pivots, grips, garment fit/coverage and supported material convention. |
| Production recipe | Actual tool/exporter versions, meaningful generator settings and input revisions, source-to-export relationship, necessary manual work. |
| Evidence and gaps | Actual inspected files and conditions, failures and repair owner, unperformed tests, artistic selection, current publication status. |

Keep artist-working notes short and current. Do not copy the complete feature spec, every tool manual or every rejected intermediate idea into each study. Preserve meaningful alternatives requested by Mike, especially previously selected or rejected review results, using exact external references.

## 2. Before touching the source

1. **Confirm the requested finish.** Study produces reviewable art; production produces usable exports; integration includes the running game. Read the matching [art-flow route](../production-workflows/art-flows/README.md). Standard and Higgsfield share this consumer contract; neither route is presumed connected or capable of exporting a usable rig.
2. **Select a concrete use.** Name what the player should recognize and what the character must actually do. Start with an existing selected resident/source when suitable. Do not invent a new cast, biome, combat style or mechanic to justify a model.
3. **Inspect existing inputs.** Retrieve the exact approved source and its actual game/inspection control. A plain GLB viewer may not reproduce the current pixel renderer. Confirm what source files, textures, rig and clips actually exist before promising an edit.
4. **Check rights before external upload or production use.** Reference viewing, uploading to an AI service, private editing, game distribution and public source publication are different uses. Resolve the particular missing permission; do not assume an asset-store license or a free provider plan grants all of them. Preserve the applicable evidence under the existing asset record.
5. **Create an independent external workspace.** Follow [asset operations](../asset-workflow.md#edit-or-generate-art). Copy exact inputs; do not edit the shared cache or write asset payloads into Git. Use a deliberately named directory and preserve the original source separately from the working revision.
6. **Read the current consumer.** The developer identifies the actual importer, representation/family, attachment convention, supported material/animation features and fallback. The artist records those requirements rather than guessing from a vendor export menu. Existing general pipeline proposals do not count as installed support.
7. **Establish a visible control.** Keep the current adequate character/source beside the candidate at matched scale and camera. Separate ordinary gameplay, overview and close inspection views. A changed camera, light or body size must not silently make one candidate appear better.

**Stop before dependent production** when the intended identity, permitted use or required consumer capability is genuinely unresolved. Continue independent research or preparation, report the exact question and its consequence, and use the existing owner-decision rule. Do not stop for routine reversible choices already delegated by the brief.

## 3. Define the brief and coverage sheet

Write a short description of the person as the player should encounter them. Include body proportions, head/face structure, hair, clothing construction, important colors/material groups, meaningful asymmetry and any actually carried item needed by the task. Mark which details are identity anchors and which may vary. An illustrative worker might have a recognizable profile and practical sleeves; this does not prescribe their personality, employment or current equipment in the game.

Prepare construction references only when needed: isolated full subject, restrained perspective, readable extremities and material boundaries, broad neutral light, and the chosen rest pose. Resolve disagreements among front, side and back views before generating dependent geometry. Check head shape, limb length, garment hem, closures, strap routing and equipment side. Fewer consistent views are preferable to more contradictory ones. A painting can remain a mood reference without becoming a literal geometric blueprint.

Use a small coverage table such as the following, populated with the actual task's cases. Blank or unsupported cases are explicit; this example is not a mandatory animation library.

| Case | Required body/outfit/item | What must remain readable | Evidence required for the requested finish |
| --- | --- | --- | --- |
| Standing and turning | Selected base identity and outfit | Proportion, face/hair/clothing groups, front/back consistency, feet on support | Source and final-export views; actual game camera for integration. |
| Travel and stop | Selected locomotion and current gear | Foot contact, weight, turning, grip/pack stability and settling | Complete moving cycle and entry/exit, not one posed frame. |
| One useful action | Actual supported action and compatible tool, or empty hands | Preparation, contact when appropriate, outcome/recovery and interruption | Exported clip on exported rig; native-state behavior only when integrated. |
| Required rest or lifecycle state | Whatever the selected game scope actually supports | No living walk pose for a dead actor; truthful eligible fallback when necessary | State-specific artifact/consumer check. |
| One meaningful variation | A needed compatible outfit, body or equipment change | Same identity where intended; fit and action remain coherent | Actual revised source/export and recorded correction effort. |

Do not add every repertoire action. Choose the smallest coverage that proves the selected use and its real risks. A generic locomotion proof does not establish a two-handed grip, sitting with a pack or unusual anatomy.

## 4. Select the source and model route

Inspect the source without flattering textures first. Rotate it; check front, profile, back, underside and important gaps. Compare dimensions against a known body/object reference. Look at hands, feet, underarms, neck, crotch, garment interiors, openings and contact regions. Do not rely on the provider thumbnail.

| Finding | Route | Why / what to verify |
| --- | --- | --- |
| Existing approved body/rig meets the identity and use | Reuse it; fit or author only the missing parts. | Avoid replacing solved anatomy and motion for no visible benefit. |
| Overall shape is right and required bends/materials are usable | Refine the direct mesh. | No mandatory sculpt, reconstruction or high-detail bake. Verify actual movement and export. |
| A local important region fails | Repair/model that region or generate a controlled replacement. | Preserve successful identity elsewhere; check its seam, deformation and dependent textures. |
| Form is fundamentally wrong across views | Correct the reference or select another source; regenerate only when that route is justified. | Local polishing cannot rescue wrong anatomy or construction economically. |
| Shape is right but joint structure or editing is impractical | Rebuild the needed topology, locally or across the body according to the defect. | Good edge flow must be demonstrated by deformation, not by all-quad labeling. |
| Detailed sculpted form has visible value not supplied economically by the direct mesh | Use a high-detail source and appropriate lower-detail/baked derivative. | Preserve the silhouette separately; surface maps cannot recover missing external shape. |
| A suitable sprite or other existing representation fully serves the use | Use that representation under its existing camera/state contract. | 3D is not compulsory; a fixed-angle sprite cannot claim views it lacks. |

Choose a provider comparison only for an unresolved decision. Keep the same identity, viewing conditions, required coverage and accepted-quality target. Compare useful output and full finishing/revision effort, not generation latency alone. A three-way contest is optional, not a prerequisite for every production task.

When generating, retain the exact input references, actual model/version, operation type, meaningful settings, request/result identifiers in their appropriate private records and downloaded outputs. Inspect geometry before paying for unnecessary texture variants. Do not repeatedly regenerate the entire person because one local region fails. Failed, cancelled or uncertain calls still count under the shared spending policy; no automatic paid retry is introduced.

## 5. Plan parts before generating or cutting them

For each proposed part, answer the questions below in ordinary language. A simple character may need only a few rows.

| Part question | Required answer |
| --- | --- |
| Why is it separate? | Independent source control, different deformation/attachment, actual removable equipment, or a combination. |
| How does it fit? | The selected body's dimensions/rest pose, contact boundary, intended overlap or joined seam and relevant clearance. |
| What remains in the final export? | Joined deforming surface, separate skinned garment, rigid visual attachment, or separately represented real object. |
| What is behind it? | Retained body, outfit-specific hidden region, completed surface or intentional opening. |
| What invalidates it? | Body/rig change, altered joint, different garment layer, different grip or other concrete dependency. |

A separately generated head should match the chosen neck, skull scale and orientation. A glove must fit the actual hand and its required grip. A backpack needs believable support/straps; a floating pack cannot be repaired merely by naming a back socket. A strap crossing a moving joint may need deformation even when the bag itself is rigid.

Distinguish **generation**, **segmentation** and **surface completion**. Generation makes a candidate; segmentation divides existing geometry; completion invents or reconstructs missing surfaces. None proves that the pieces fit. Inspect completed surfaces for lost identity and incorrect caps. A neck joint, sleeve, hem or hollow opening may be intentional and must not be sealed automatically.

Do not preserve dozens of pieces just because the service segmented them. Do not split to match the video's illustrative polygon-per-part range. Conversely, do not join a removable weapon into the body or collapse a moving garment solely to obtain one mesh. Final technical consolidation must preserve required parts, material regions, skinning, selection and native item mapping.

## 6. Assemble and repair geometry

1. **Work on a copy and establish scale/facing.** Compare against the chosen consumer's known reference. Blender and glTF use different axis conventions; let the selected exporter/conversion handle the declared transform once. Do not add an unexplained second rotation or rescale the game body to fit the artwork.
2. **Align the major forms.** Match body/head proportions, neck connection, limb placement, garment thickness and gear contact in the chosen rest pose. Compare the silhouette to the approved reference before smoothing or adding detail.
3. **Remove accidental duplicates and intersections.** Inspect hidden overlapping shells, embedded hands/weapons, fused straps and stray internal faces. Keep purposeful layered surfaces and required interiors.
4. **Repair actual defects.** Correct holes that should be closed, face direction, inappropriate self-intersections, degenerate geometry and visibly broken contours. Do not use double-sided shading to hide invalid outward surfaces. Thin cloth can legitimately be open, but its intended two-sided appearance must be supported and inspected.
5. **Choose seam handling.** Join continuous skin where required by the selected deformation; retain separate garments and rigid objects where appropriate. Match position, normal/shading and material boundaries. Do not weld across an intentional gap or smooth away identity-defining form.
6. **Prepare deformation regions.** Check shoulders, elbows, wrists, hips, knees, neck and any other joint that the selected action actually bends. Remove structures that collapse or stretch badly; add/rebuild only the needed geometry. An even grid of faces is not the goal.
7. **Handle hidden body safely.** Preserve the complete editable body when needed for changing outfits. Use the selected outfit's reviewed mask or derivative, not permanent deletion of body regions shared by other garments. Check removal and alternate layers. A fixed-costume asset may omit genuinely unused hidden geometry, with that limit recorded.
8. **Save the fitted source revision.** Record which parts are intended to remain separate and which materials/UVs/rig/attachments now depend on this geometry.

Do not blindly apply transforms or alter rest pose on an already skinned imported rig. Preserve its known working binding; make the change in a controlled source copy and verify every affected skin/clip. Transform cleanup before a new bind is different from changing a bound hierarchy afterward.

**Pass:** neutral shape and construction are coherent from required views, intentional openings remain correct, and the source is ready for a rough deformation proof. **Repair:** return to form/part choice when the silhouette is wrong; do not spend final texture work on an unstable body.

## 7. Establish the rough rig and movement proof

Use the reviewed compatible rig when available. Confirm dimensions, joint placement, parent hierarchy, rest/bind pose and actual attachment convention. Matching joint names is not enough. A newly generated humanoid is not compatible merely because an autorigger recognizes it; a nonhuman form needs its own declared family.

For a new automatic bind, follow the actual selected tool/edition's current instructions. Place guides at the real anatomical joints, inspect fingers and limb separation, bind only the intended deforming meshes and retain other components deliberately. The video's AccuRIG use is a candidate route, not a required tool or a promise about every free/paid edition.

Use these checks before final UV/material or extensive animation work:

- Bend the joints needed by the scoped activity: raised/forward arms, elbow/wrist grip, torso turn, hip/knee bend and foot placement as relevant. Compare both sides and inspect the silhouette, not only wireframe.
- Inspect weights for unintended influence across the body, collapsed shoulders/hips, detached vertices, collapsing fingers and garment stretching. Transferred or automatic weights are a starting point. Fix the owning geometry, weights or joint placement rather than hiding the defect.
- Keep truly rigid accessories rigid under their chosen attachment. Do not give a flexible sleeve, strap or scarf a one-bone treatment merely because it was generated as an accessory.
- Fit the actual item grip in the actual hand. For a two-contact object, record the primary attachment and the supported secondary contact method. Do not promise runtime inverse kinematics when the current consumer does not supply it.
- Check garment coverage at the required extremes and from the moving camera. Inspect shoulders, underarms, waist, seated/kneeling contact and pack/cape clearance only where those poses are in scope.
- Play a rough travel/turn/stop and the chosen useful action on this body. Inspect foot sliding, root drift, equipment jitter and unwanted body stretching.

A simple authoring preview can expose geometry and weight errors. An actual game preview is necessary to qualify the game-scale pixel result and native action integration. Label staged source previews and game evidence separately. If a required runtime pose/attachment capability is absent, record it with V3D and retain an honest limited package rather than implementing a hidden workaround in the asset.

**Pass:** the rough body, clothing and required contacts work well enough that final polish will not immediately be invalidated. Do not claim general family qualification from this single proof.

## 8. Prepare UVs, materials and facial identity

Keep usable existing UVs. Re-unwrap when the layout prevents the actual edit, wastes important visible detail, creates unacceptable seams/distortion or makes the selected material workflow impractical. Do not re-unwrap merely because the mesh was generated.

1. Mark seams where they make construction and painting manageable. Give the face, hands and identity-defining marks enough space for their actual visible role; do not allocate equal detail everywhere by habit.
2. Inspect distortion with a simple check pattern on the model. Inspect seams on the actual surface, including the back and inside of garments. Keep intentional mirrored regions separate from asymmetric marks, handed equipment and text-like motifs.
3. Pack for the selected resolution and filtering. Allow sufficient island padding for the actual mip/compression path. Do not prescribe an arbitrary universal atlas size or padding value. Recheck the final smallest intended view.
4. Retain or rebake the useful source color into the changed layout. Check projection errors and seams. A low-detail mesh can supply some bake inputs itself; a separate high-detail sculpt is not a prerequisite for every material map.
5. Define clear skin, hair, cloth, leather, metal and other relevant material regions. These are visual regions, not new gameplay material properties. Prefer reusable controlled material treatments where they preserve the desired appearance.
6. Repair unwanted baked highlights and shadows in surface color when they fight the game's lighting. Use physically based material channels only where supported and visually useful. Do not relabel a color image as a normal or roughness map.
7. Check export conventions with the selected consumer. For ordinary glTF metallic/roughness materials, base color is color data; normal and roughness/metallic data need the corresponding non-color treatment, and channel packing must match the exporter/importer. Do not assume an arbitrary Blender shader graph will survive export.
8. Give eyes, brows, mouth and distinctive marks deliberate attention at ordinary game scale. Separate eye geometry is useful only when it solves the chosen shape/motion problem. Do not add gaze, blinking, eyelid controls or a face rig that the deliverable does not need. Keep eye placement coherent across views and avoid highlights that imply a conflicting light.
9. Compare neutral light, the selected ordinary daylight/shade and relevant local firelight using matched conditions. Review stills and motion through the real pixel treatment when available. Do not silently change camera framing, sample density or body proportions to make the texture pass.

Retain full useful source detail and let the chosen renderer's intended sampling do its job. Do not repeatedly downsample intermediate artwork simply because the final world is pixel art. Conversely, a large source image cannot make a subpixel feature readable or repair bad anatomy. Group detail and revise the source when material noise or shimmering undermines the intended finish.

**Pass:** surfaces separate meaningfully, identity features survive the selected views, and materials respond coherently to the tested lights. Final file-channel and in-game checks remain separate below.

## 9. Refine animation as a complete action

Start from licensed compatible motion or author a rough sequence on the selected rig. Generated video may inform timing or pose; it is not a skeletal animation export. Retargeting maps movement but does not automatically correct contacts, proportions or costume interference.

For each required clip, keep a compact record:

| Field | Meaning |
| --- | --- |
| Source and target | Exact source motion and body/rig revisions; rights and retarget/bake settings. |
| Use | The existing action/state it depicts, or an explicitly staged artist preview. |
| Timing | Duration and time units, loop seam, entry/exit poses and the selected in-place/root-motion convention. |
| Contacts | Required foot support, hand grip, tool/contact target and outfit constraints. |
| Transitions | Relevant start, turn, stop, interruption, recovery and changed-item cases. |
| Limits and fallback | Unsupported poses, body fits or missing native projection; eligible representation when unavailable. |

Block the whole relevant action with clear poses before polishing small movements. Make preparation, weight transfer, contact where applicable, follow-through and recovery legible. Review at normal speed, then scrub the critical contact and transition frames. Quiet holds and restrained action can express as much as constant motion. Do not assign every inhabitant the same exaggerated personality loop.

For travel, fit stride and support contact to the actual movement convention. Compare body travel, foot motion and turns together. Do not fix sliding by moving the authoritative body from an animation callback. For supported in-place clips, avoid unintended translation baked into the root; for any allowed traveling visual, the existing movement owner remains authoritative.

For interactive actions, use the native preparation/commitment/outcome/cancellation facts supplied by the existing consumer. An animation must not add a new cooldown, conceal a completed result until a cinematic ends, inflict damage at its own contact marker or force an NPC to continue. Retiming or blending must preserve meaningful contact and phase relationships; when the current projection cannot support the required depiction, report that missing contract rather than infer hidden intentions.

Check entry from and exit to the actual neighboring states, not only a looping clip in isolation. Include the selected interruption and the resulting state after cancellation. A refusal can be visually quiet; do not animate a successful handoff or strike for an action that failed admission. Do not interpret private fear, hostility or a biography sentence as permission to select a target, gesture or threat response.

Optional style variants can change the expression of a supported action within compatible geometry and timing. They must not introduce mechanical advantages, reveal secret traits or require a bespoke animation library for every resident. A new body outside the tested range needs renewed fit/contact checks, not just renamed clips.

**Pass:** exported motion later reproduces the intended action, remains responsive under the existing game rules and preserves identity/contact through the promised transitions. Artistic acting quality and autonomous behavior remain different evidence questions.

## 10. Choose secondary motion and visual simplification

Use this order as a decision aid, not a mandatory escalation ladder:

| Method | Good use | Required check |
| --- | --- | --- |
| Static or settled form | Small detail, stable silhouette, low-motion clothing or distant presentation. | Does the result still look intentional during the required action? |
| Authored joint motion | A limited tail, braid, strap or garment movement that can share the rig's clips. | Correct weighting, contact, clip transitions and final export. |
| Baked authoring simulation | A specific repeatable movement whose evaluated result can be exported in supported channels. | The bake survives export and does not pretend to adapt to new contacts. |
| Existing runtime simulation | A selected visible benefit that the actual consumer already supports or a separately authorized extension delivers. | Contact, pause/reset, interruption, cost, reduced-motion/device behavior and failure fallback in the actual game. |

Do not require a full cloth solver for one moving hem, or retain physics because it looked impressive in Unreal. Small motion can become distracting pixel noise. Keep the existing settled/held-pose controls for comparison; do not change global cadence or physics defaults as an asset-local repair.

Optimize only against a concrete consumer need. A lower-detail export, shared material or consolidated rigid part may help, but must preserve required silhouette, grips, state coverage and identity. Do not merge away separately handled equipment, expose hidden private marks through a shared atlas or create a new model for every transient state. Levels of detail and crowd policies remain with the existing family/resource owners.

## 11. Export a package the consumer can actually use

The default target is the existing selected OpenLegend interchange/profile, not whatever format a tool markets as game-ready. The current pipeline design uses a narrow glTF/GLB 2.0 path; actual installed support and the selected trusted-asset route control the export. Keep the editable source separately when quads, constraints, paint layers or authoring rigs are needed for revision.

Before export:

1. Save the stabilized source. Verify the intended body/outfit/rig revision, materials, attachments and clip set are the same ones reviewed.
2. Remove unintended cameras, lights, helper/control meshes, test objects and unused exports from the selected output set. Retain any required hierarchy and actual attachment roles.
3. Verify unit scale, facing, root/support anchor, pivots and grip transforms against a known working consumer reference. Do not fix disagreement with arbitrary runtime offsets.
4. Bake only authoring constraints/modifiers/motion whose evaluated result the consumer needs and supports. Do not assume authoring cloth, drivers or custom shader code become executable game behavior.
5. Export supported materials, texture dependencies, skin and animation channels. Check the selected extension/feature allowlist. A generic engine's ability to load a feature does not qualify it in OpenLegend.
6. Record the actual exporter/version and meaningful settings. Use descriptive stable working names and existing asset IDs; a filename is not an immutable revision identity.

Then inspect **the exported files**, not only the source:

- Reopen/import the final artifact in a clean compatible scene and load its real dependencies. Confirm the expected body, hierarchy, materials, joints, clips and attachments exist. Move non-root joints and inspect actual deformation.
- Check neutral pose and each promised action/state. Look for missing textures, changed alpha, wrong normal direction, altered roughness, lost animation channels, root drift, collapsed weights, flipped faces, wrong scale and shifted pivots.
- Count final triangles/vertices, primitives/materials, texture dimensions and decoded sizes, joints/influences and animation data against the current consumer's actual limits. Export triangulation and UV/normal splits can increase complexity; authoring face counts are not the result.
- Ensure source-only/private references and unsupported scripts, lights, cameras or physics metadata are not promoted to runtime authority. Resolve required texture/buffer dependencies through the existing publication path rather than relying on expiring provider URLs.
- Check the exact file identity after the last edit. A source re-save or late texture correction invalidates the previous export/evidence when its dependencies changed.

**Production-package pass:** final files reopen correctly for the declared compatible consumer and cover the promised scope, with exact sources and gaps retained. A generic viewer pass is not an OpenLegend integration pass.

## 12. Inspect the integrated character when integration is authorized

The integration contributor reuses the existing scene, appearance/resource, equipment and action owners. This design does not require a new scene graph, importer platform or asset service. A fixed trusted asset can use its supported route without claiming generalized live intake.

Use the current game and the selected native scenario. Where a needed state is deliberately supplied as a fixture or posed manually, label it; staged behavior cannot establish NPC independence. Keep paid AI disabled for purely native visual checks unless the task separately authorizes a bounded live scenario.

| Check | What to exercise | Failure to reject or record |
| --- | --- | --- |
| Ordinary recognition | Normal play scale, required camera orbit/pitch/zoom, neighboring people/objects and relevant lights. | Face/outfit identity disappears, proportions change, thin important parts vanish or visual noise defeats the intended finish. |
| Motion and contact | Travel, turn, stop, chosen action, relevant interruption and supported rest/lifecycle state. | Sliding, broken grip, clipping, root-driven world motion, false success or inappropriate live pose. |
| Equipment and variation | The actual supported equip/remove/drop/contained cases needed by the task; current body fit. | Duplicated item, missing gear, wrong side, stale outfit mask, invented custody or incompatible fallback. |
| Pixel/depth integration | Moving camera and moving subject separately, light changes, occlusion, selected outlines/shadows where affected. | Attractive still but unstable motion, silhouette/depth disagreement, double shadow or broken selection. |
| Replacement and lifetime, when changed | Load failure, delayed/superseded asset, actor removal, state change while loading and scene disposal/recreation. | A late asset restores a removed actor/item, repeats an action or retains invalid resources. Reuse unchanged valid lifecycle evidence. |
| Resource suitability | The selected representative scene/device and changed asset workload. | Unacceptable preparation/frame/memory cost or a claim of broader scale without measurement. |

Do not run unrelated stress campaigns for a local art repair. Conversely, one character cannot qualify the planned population or a new device class. Record exact game commit, asset revisions, scene/camera/light/settings, actual observations and limitations using the current evidence owner. Do not invent screenshots or recreate missing old views as historical evidence.

A visual defect is not fixed by weakening the accepted art direction, restricting the camera without approval, hiding the bad pose or declaring a source thumbnail sufficient. Return to the responsible source or explicitly identify the missing consumer capability.

## 13. Prove the useful revision

Choose a change that somebody actually needs: a compatible outfit, the same item in another supported grip, a material correction, another body within the claimed range or a better head that preserves an accepted body. State beforehand what should remain unchanged and which dependencies will need rechecking.

Make the change from the retained source. Do not regenerate the whole person unless the source-selection decision genuinely calls for it. Record the work needed to fit, paint, bind, export and inspect the revision. Compare both results under the same relevant conditions and preserve the useful earlier version.

If the revision is almost as expensive as a new asset, record that honestly. It may show that the chosen family boundary is wrong, the source needs one targeted improvement or a one-off asset is more economical. Do not build a universal parameter system merely to make reuse sound successful. A second human outfit qualifies only that useful variation, not animals or arbitrary morphology.

## 14. Repair and dependency map

| Observed failure | First source to inspect | Recheck after the correction | Usually unchanged |
| --- | --- | --- | --- |
| Wrong face or silhouette across views | Approved reference, geometry and proportions. | Affected UV/material, rig fit, attached parts, alternate depictions and actual camera. | Unrelated characters and world rules. |
| One poor eye/mark or material patch | Local geometry/paint, UV placement and material setup. | Affected texture/export, lighting and identity views. | Body rig and all clips when geometry/binding is unchanged. |
| Bad shoulder/knee bend | Geometry, weights, joint placement and rest pose. | Required extreme poses, garment fit, affected clips and export. | Unrelated rigid props and scene lighting. |
| Garment clipping or missing body after removal | Outfit fit, weights, layer/mask and retained body derivative. | Required poses, removal/alternate outfit and final export. | Native equipment permission/custody. |
| Feet slide or a hand misses the tool | Retargeting, clip, root convention, grip and native timing integration. | Travel/turn/stop, contact, relevant transition and changed body/item fit. | Unrelated texture artwork. |
| Source looks correct but export fails | Export selection, supported material/channels, axes/scale and dependencies. | Actual final bytes in clean reimport and the real consumer. | Accepted concept unless the exported representation cannot express it. |
| Good still but unstable pixels | Isolate camera, light, material detail, animation and sampling under the existing renderer. | Affected moving comparisons and actual game scale. | Physical body size and accepted identity. |
| Too many material submissions or excessive data | Actual exported primitives, maps, skin/clip data and current resource owner. | Consolidated/exported result, required separation, identity and measured consumer cost. | No automatic need for a new renderer or whole-scene optimization. |
| Provider failure or repeated wrong construction | Current input, selected operation, meaningful settings and route choice. | Only the new authorized operation or alternative source, including cost. | Successful retained parts and unrelated accepted work. |
| Missing required native fact or capability | Existing gameplay/projection/family owner. | Its separately scoped delivery and affected integration when available. | Art must not invent that fact to pass. |

A source change invalidates only its actual dependents, but final evidence must identify the exact revised artifacts. Use the [existing dependency contract](3d-pixel-art-tech-design.md#4-dependency-and-invalidation-graph); this table adds no cache, schema or second versioning system.

## 15. Preserve and hand off

Follow the [production-package completion](../production-workflows/art-flows/production.md) and [asset publication](../asset-workflow.md#publish-an-exact-revision) procedures. Use the installed `pnpm assets help` and current manifests; this guide does not invent bucket names, flags or public URLs.

Deliver the actual requested source and exports, dependent textures/clips, exact revision references, permitted-use evidence, part/rig/attachment mapping, meaningful export settings, scoped review results and remaining defects. Preserve public study previews only with the relevant permission; editable originals and private provider receipts do not automatically belong in public runtime downloads.

Verify retrieval and hashes/bytes through the existing storage process before claiming durable preservation. Until publication succeeds, retain the safe external workspace and label that stage blocked. Do not erase the only source because a provider URL or upload success message exists. Keep unrelated assets and all requested meaningful alternatives intact.

The handoff must let another contributor answer: What is selected? Which source do I edit? What consumer and body/rig does it fit? Which cases actually passed? What must be checked after this change? What remains unperformed? Do not substitute a prompt, screenshot or generic “game-ready” claim for those answers.

## 16. Execution plan, verification and open decisions

The [art-direction follow-through](../maintainers/art-direction.md#character-production-follow-through) owns the offline production proof. Its dependency order is brief/rights/consumer → rough form/fit/motion → finished export → meaningful revision → authorized integrated evidence. A missing general runtime family blocks its dependent integration, not all independent art preparation. Existing V3D01.6, V3D05 and V3D06 own their technical implementation and scope-specific acceptance; no duplicate tracker is introduced.

For this documentation assignment, verify content, ownership, links, scenario coverage and the actual diff. No new automated tests, game startup, GitHub Actions, paid model calls or asset generation are required to establish that the design is written. A future production task follows the current verification policy for its actual changes.

**Required production passes** are the declared artifact, identity, fit, movement, state and preservation checks. **Measurements** are actual effort/cost/resource observations, not invented thresholds. **Human judgment** addresses artistic selection and player appeal through existing review/playtest owners. A narrower pass cannot close broader family or game qualification.

No unresolved owner decision blocks this design. Before production, select the needed subject/variation and confirm exact input rights, tools and supported consumer; these are concrete execution inputs. Changes to visual direction, identity, required mechanics, public release or spending beyond authorization require the established owner decision. Routine finishing within settled constraints does not need repeated confirmation.

The design deliberately leaves provider superiority, asset-specific finishing time, maximum practical roster, full clothing interchange, arbitrary anatomy and device/crowd performance unclaimed. Reconsider the route when actual repair/revision effort outweighs reuse, motion or camera tests fail, players cannot recognize the person/use, or a new selected capability exceeds the tested family. Do not turn those future evidence questions into an additional architecture project before a real need exists.

## Maintained records

[Feature specification](character-art-production-feature-spec.md) · [Research and source limits](../research/character-art-production/README.md) · [Repertoire application](../research/character-art-production/repertoire-review.md) · [Production entry](../production-workflows/assets-and-animation.md) · [Art work](../maintainers/art-direction.md#character-production-follow-through) · [V3D implementation](../maintainers/3d-pixel-art.md) · [Existing asset limits](../limits/3d-pixel-art.md) · [Storage limits](../limits/game-asset-storage.md)
