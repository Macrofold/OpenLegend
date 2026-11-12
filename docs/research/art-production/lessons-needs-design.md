# Art fidelity, reusable characters and visual qualification: lessons needing workflow design

| Status       | Current progress                                                                                                                                                                          | Last updated |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Needs design | Lessons and proposed safeguards are captured for incorporation into existing art workflows; this document does not adopt new tools, expand an active proof or establish asset acceptance. | 2026-11-11   |

## Purpose and authority

This is a reusable learning brief for the person or AI updating OpenLegend's art-creation documentation. It synthesizes the side conversation about concept-led characters, Meshy sources, MetaHuman conformation, body controls, clothing and visual review. It preserves the transferable reasoning, concrete failure modes and unresolved questions rather than a chronology or transcript. General lessons apply to other art; anatomical and topology requirements apply specifically to articulated characters.

The central requirement is **a convincing complete result that meets the requested purpose**. A valid file, a successful provider job, a functioning slider, a small numerical error and an attractive isolated component are different accomplishments. None establishes the others.

For workflow integration, read sections 1–3 and 13–17 first. For character authoring, sections 4–10 cover transfer, anatomy, controls, age, clothing and motion; sections 11–12 cover measurement and rendering. These routes avoid making every art request load all specialist detail.

The [current art direction](../../../art-direction/decisions.md#current-direction-at-a-glance), [art workflow](../../production-workflows/art-flows/README.md), [character authoring contract](../../projects/people-from-parts-authoring-contract.md), [asset workflow](../../asset-workflow.md) and task-specific user decisions retain authority. This brief recommends how to strengthen those owners; it is not a parallel operational workflow. [AF19](../../maintainers/art-direction.md#art-flow-follow-through) tracks the proposed incorporation. Existing character implementation and qualification remain with their current owners.

Read statements according to their evidence:

| Kind                  | Meaning and permitted conclusion                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Observed failure      | A visible discrepancy or scoped result was identified. It establishes that defect in that output, not its cause or a universal tool limitation. |
| Diagnosed cause       | Source inspection or an isolated comparison identified a mechanism. Preserve the conditions under which the diagnosis holds.                    |
| Recommended practice  | A proposed way to prevent or detect the failure. It must be reconciled into the owning workflow; it does not imply executed verification.       |
| Capability to qualify | A plausible route or documented provider feature. It remains unproven for our particular sources, controls, renderer and performance envelope.  |

Named example characters, percentage samples, age anchors and measurements below illustrate lessons. They do not silently become universal art standards, new spending authority or a mandatory asset library.

## 1. Preserve the user's actual objective through every stage

### Specify the artifact and the claim separately

An image resembling a character, a textured static mesh, a rigged character, a reusable adjustable family, a fitted garment and an integrated NPC are different deliverables. A task aimed at a reusable family cannot be completed by making one excellent fixed likeness. A feasibility proof may use provisional assets, but must still demonstrate the mechanism under investigation convincingly.

Before execution, identify the intended output, starting sources, fidelity target, required variations, downstream consumer and stopping point. State what must remain unchanged and which judgments the agent may make. Preserve this scope when fixing a defect; a narrowly framed correction does not cancel the rest of the agreed work.

For example, proving continuous clothing fit requires the same garment on changing bodies, including motion. Showing three unrelated dressed exports, or three scaled copies of one body, answers a different question. Conversely, an anatomy-only concept request does not authorize wardrobe production or game installation.

### Repair examples are not an exhaustive acceptance checklist

A user pointing out a waist, neck, shoulder or sleeve defect is supplying evidence that review failed. The agent must repair that defect and inspect the rest of the result. It must not interpret the comment as permission to ignore every other region.

Two complementary reviews are needed: a focused review of the changed feature, and a whole-result review for remaining defects and regressions. Scope the expensive technical checks to affected dependencies, but do not narrow ordinary visual attention to a tiny crop. The user should select artistic direction and resolve consequential ambiguities, not repeatedly serve as the first detector of obvious broken anatomy.

### Distinguish a proposal from approved scope

Advice in a side conversation, a copyable prompt and a future matrix are not evidence that the executing task received or implemented them. A later proposed expansion to additional ages or body bases must be explicitly named as an expansion. Do not report those dimensions as supported because they appear in a design table. Do not quietly reduce an accepted broad task to the only body that is currently convenient to generate.

“Use your judgment” permits routine artistic and implementation decisions within scope. It does not erase rejected sources, grant public publication, change the renderer budget or authorize a different product outcome. Unknown facts should be investigated before asking the user; consequential unresolved choices must remain visible.

### Replace ambiguous instructions with operational meaning

| Ambiguous instruction         | Required clarification                                                                                                                                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “Transfer the model.”         | Identify source and target revisions, geometry regions, pose/scale registration, whether broad form and relief both transfer, preserved topology/rig data, exclusions, and the comparison that establishes fidelity. |
| “Keep the muscle definition.” | Name the intended regional muscle volumes and separations, their geometric versus material representation, and the matched views/sections used to inspect them.                                                      |
| “Soften artifacts.”           | Identify the particular artifact and evidence that it is erroneous. Preserve intended anatomy outside that repair. Do not treat all strong contouring as noise.                                                      |
| “Make the body fit.”          | Say whether the body fits a reference, the rig fits the body or a garment fits the evaluated body. These require different operations.                                                                               |
| “Use the same mesh.”          | Distinguish shared connectivity and vertex correspondence from equal vertex count, identical shape, shared UVs, shared rig or shared file.                                                                           |
| “All variations.”             | List the controls, ranges, sampled combinations, continuous sweeps, poses and body bases covered; name exclusions.                                                                                                   |
| “The slider works.”           | Demonstrate geometric intent, plausible endpoints and intermediates, independent controls, repeatable recipe evaluation, clothing response and the required runtime consumer.                                        |
| “Final” or “game-ready.”      | State whether geometry, likeness, materials, rig, motion, wardrobe, performance, preservation and gameplay integration have each passed their required scope.                                                        |
| “The torso is blurry.”        | First distinguish smooth geometry, weak normals, texture filtering, lighting, depth of field, image scaling and compression. Do not assume the cause from the adjective.                                             |

Copyable instructions should include the complete requested scope and constraints. Do not refer to unnamed “sections above,” unexplained build labels or fragments the recipient cannot see. Before handing off, mentally execute the prompt as a different agent and identify every place where two plausible interpretations would produce materially different outputs.

## 2. Keep visual information intact from concept to asset

### Images remain active inputs, not a preliminary reading exercise

A prose summary discards relationships: the angle of a nose, the transition from ribs to waist, eyelid shape, beard outline, material wear and the balance of the entire silhouette. A few dimensions can constrain scale without recovering those relationships. A chest and waist circumference cannot specify a person's physique. A count of facial handles moved cannot establish likeness.

Keep approved artwork visible during construction and each comparison. Use prose to name priorities and constraints, not to replace the image. The recognition summary may mention a few signature features, but it is not an exhaustive construction specification.

Analyze the target at several levels: overall silhouette and posture; component proportions; anatomical or manufactured construction; surface relief; materials and colors; identifying accents. Preserve the relationships between them. A character can have individually plausible eyes, nose and jaw yet remain unrecognizable because their relative widths, depths and placement are wrong.

### Assign authority by property when references disagree

Concept art specifies identity and intended appearance. Construction views help resolve anatomy and unseen surfaces. A generated 3D donor supplies a useful spatial hypothesis. Previously accepted corrections preserve decisions already made. None is automatically authoritative for every property.

When a generated donor has a narrower waist than the approved sheet, accurately reproducing that donor can move the result away from the actual target. Conversely, arbitrarily widening a faithful donor to preserve an older, inaccurate template is also wrong. Identify which source controls that property and compare the competing evidence. Preserve reference-led corrections unless a deliberate decision supersedes them.

Generated front, side and back images may disagree. Decide which feature/view is authoritative, or generate a resolving reference within the authorized scope. Record the interpretation. Do not average contradictory anatomy without noticing it, and do not treat inferred hidden geometry as measured ground truth.

### Request references that resolve an actual uncertainty

More reference art is useful when it reveals hidden construction, resolves conflicting proportions or isolates a feature. It does not repair a process that ignores the references already supplied. Generate additional views for a stated question, not as an automatic substitute for careful comparison.

Useful character inputs include full-body front/profile/back views in a consistent neutral pose, close head front/profile/three-quarter views, and component studies for distinctive armor, hair or accessories. Maintain identity, camera interpretation, proportions and material intent between views. Supply clean individual panels when the chosen image-to-3D route expects separate views; a multi-person sheet can be misread as several objects.

Meshy's documented multi-image route accepts different views of the same object. That supports using consistent cropped panels, but does not guarantee accurate reconstruction or make inconsistent generated views reliable. Verify the selected model's actual requirements and options rather than assuming every wrapper exposes them. [Meshy multi-image documentation](https://docs.meshy.ai/en/api/multi-image-to-3d).

### Separate anatomy from things that obscure it

Armor and loose fabric describe an outer envelope, not the body beneath. Hair and beard can hide skull, jaw and neck shape. A clothed image-to-3D result may be an exterior shell with no usable underlying torso. Do not interpret that shell as complete anatomy.

A bald, clean-shaven reference is useful for recovering head structure; the original groomed reference remains authoritative for the final identity. Removing hair may require inferring concealed anatomy, so verify that the generated clean reference preserves the same person rather than introducing a different head. Appropriate covered body references similarly reveal proportions without pretending fabric is skin.

Generating head and body separately is a practical way to allocate detail, not a guarantee of easy assembly. Keep sufficient neck/shoulder context, common scale and compatible pose; compare skin, age and identity. Joining is a dedicated geometry, normal, rig and material task. Retain nonsexual, appropriate coverage for every age group and follow the provider's actual constraints without silently redefining the final art requirement.

## 3. Tool choice, provenance and process honesty

Choose tools for what they contribute. Image generation can retain visual richness that a loose textual reinterpretation loses. Mesh generation can supply useful form and material ideas. A canonical character framework can supply deformation conventions and reusable correspondence. None replaces visual judgment.

Do not default to constructing bespoke geometry when an existing garment, groom or generated source already captures the target better. Procedural methods are appropriate for measured fitting, repeatable transformations and explicitly specified forms. They are unreliable substitutes for an under-specified eyebrow, beard, armor shape or anatomical sculpt. Either provide detailed shape constraints and reference-driven review, or select a more suitable source/authoring method. More procedural code does not inherently mean more fidelity.

**Preferred route for concept-led bodies and faces:** start with the selected concept, prepare consistent views of the body or face, and generate a Meshy donor from those views. Inspect the donor against the concept, map its usable form onto the project's reusable body or head topology, clean up artifacts and visually iterate against the concept. The concept defines the likeness and proportions. The donor supplies spatial information. The core model supplies the vertex correspondence, rig and fitting conventions needed for reuse. Preserve identity and anatomy through transfer, including the intended broad volumes and local relief. Inspect both the neutral result and the relevant posed or expressive result before accepting it.

Use direct preset adjustment, manual sculpting, another generator or an existing mesh as a fallback when the preferred route cannot produce a suitable donor or fit. Record the specific reason and keep the same visual acceptance criteria. A stock preset can serve as a rig or fitting control. For clothing, props and other assets, consider the same concept-to-donor route where generated geometry preserves the design and the target's construction can be recovered. Choose the method per component and test the resulting form and construction before adopting it as a broader default.

For a future foundation comparison, evaluate each candidate’s own body controls and clothing tools under the [source-comparison rule](../../projects/people-from-parts-authoring-contract.md#future-source-comparisons) before choosing the production route. The selected donor studies retain their named sources and acceptance.

Keep source roles and permissions explicit: an image approved as visual reference is not automatically an approved runtime asset or an input permitted for every provider. Changing topology does not remove the need to retain and review source provenance through the existing sourcing/publication owners.

Preserve the submitted prompt, exact input image revisions, crop/edit instructions, tool/provider, exposed model identifier, meaningful settings, job identifier and returned outputs. Distinguish requested model selection from provider-confirmed execution metadata. A wrapper name, website brand, account tier, result quality or filename does not establish the underlying model. If routing is hidden, say so; a likely model is still an inference. Check available records and current documentation before claiming the model cannot be identified. Do not reconstruct an exact historical prompt from memory and present it as the original.

Provider/model versions and interface capabilities change. Inspect the installed tool and relevant official documentation before committing to a workaround. “ImageGen,” “Higgsfield,” “Meshy” and “MetaHuman” name different layers and capabilities; specifying one does not identify every model or pipeline stage. Preserve actual outputs because even an exact prompt and exposed seed may not reproduce a hosted model's result later.

## 4. What a mesh transfer does—and does not do

### Name the operation precisely

| Operation                               | What it provides                                                                           | What it does not establish                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Landmark or measurement fit             | Broad alignment, proportions and selected feature positions.                               | Full surface fidelity, muscle relief or likeness between landmarks.                            |
| Surface conformation/wrapping           | Moves a target surface toward another surface using correspondence or spatial constraints. | Correct correspondence in every region, preserved deformation quality or exact donor topology. |
| Detail displacement transfer            | Transfers a chosen residual or surface-frequency band.                                     | Transfer of broad anatomy removed by the filtering step.                                       |
| Topology-preserving sculpt/shape target | A changed shape on a stable ordered vertex layout.                                         | Correct rig pivots, anatomical semantics, interpolation or clothing fit.                       |
| Skin-weight transfer                    | Assigns bone influences to geometry using source data.                                     | Correct rest transforms, joint axes, retargeting or natural deformation.                       |
| Texture/normal bake                     | Re-expresses surface appearance in the target's mapping.                                   | Real volume, silhouette, missing anatomy or physical garment clearance.                        |
| Native character conform/rigging        | Fits the framework's representation and builds or updates selected rig data.               | Exact likeness retention or automatic portability of all controls and shader features.         |

“Full transfer” should mean the agreed usable regions' broad shape and surface form, with exclusions disclosed. It cannot mean only extracting high-frequency relief while retaining a substantially different template body. Smoothing the donor before computing a residual deliberately removes information; this is a design choice, not an inherent requirement of transfer.

Independent meshes normally have different vertices and connectivity. Their vertex coordinates cannot simply be copied by index. Exact index-wise copying requires established correspondence; equal counts alone are insufficient. A wrap must solve where target vertices belong, and its achievable fidelity depends on sampling, source quality, topology density, constraints and regularization. Report the residual and its location rather than implying zero-loss transfer.

### Why canonical correspondence supports reuse

The reusable asset includes more than a neutral mesh: ordered vertices/faces, meaningful anatomical regions, UVs, skin weights, joint hierarchy/rests, facial components and deformation behavior, shape targets, part bindings and supported operating ranges. Arbitrary generated builds do not share these automatically.

A Meshy-derived body can become a reusable family. With MetaHuman, that requires a supported conform/export route and qualification of the resulting controls and deformations. Another established character system may already supply its own compatible body structure, rig and clothing tools. Compare those capabilities before assuming equivalent custom authoring is needed; the [character-production research](../character-production/README.md) evaluates that choice. Neither route is inherently impossible; neither is “use raw generated meshes and all sliders will work.” Remove fused shorts or beard if appropriate, but recognize that their removal alone does not supply correspondence and deformation data.

The canonical representation can change shape dramatically while keeping vertex identity. That enables interpolated shape targets and shared bindings. It does not mean that every target has the same anatomy, that every skeletal joint can stay fixed, or that one set of skin weights is adequate for every age and proportion.

Establish the canonical topology and ordering before building a shape library. Independently remeshing or decimating each generated build can destroy correspondence even when the outputs have similar counts. Prepare consistent lower-detail representations from the family, and qualify their mapping and appearance instead of assuming a detailed source proves every exported LOD.

### Native capabilities must be checked for the actual version

Epic's current From Custom Mesh documentation describes fitting arbitrary input topology, including AI-generated meshes, into standard MetaHuman topology. The From Template route handles compatible topology/UV correspondence and distinguishes fitting a rig from replacing selected body data. These are different operations; investigate them before assuming a custom external reconstruction is necessary. Their existence does not prove the required visual result or exported slider behavior. [Custom Mesh](https://dev.epicgames.com/documentation/metahuman/metahuman-creator-from-custom-mesh-tool-in-unreal-engine), [From Template](https://dev.epicgames.com/documentation/metahuman/metahuman-creator-from-template-tool-in-unreal-engine).

Moving a MetaHuman surface does not automatically define how its native body parameter model should traverse that new shape. A custom offset may be preserved, attenuated, reposed or invalidated by subsequent native adjustments. Test specific edits on the conformed result. Separately test the portable game's own exported shape controls. “Works in MetaHuman” and “works with Unreal closed in our runtime” require separate evidence.

### Conform by anatomical regions without creating regional seams

Register units, axes, anatomical facing, scale and pose first. Source matrices alone do not establish the intended facing or neutral posture. Differences in arm elevation, pelvic tilt or spine pose can masquerade as body-shape errors. Retain the unmodified donor and identify any reposed comparison separately.

Inspect the donor's intended evaluated surface, including relevant subdivision or sculpt modifiers. Transferring a coarse control cage instead can discard a nose, eyelid edge or muscle form that was present in the visible source. Inspect the final exported resolution as well: a successful detailed fit can lose its defining shapes during later reduction.

Use region-aware correspondence to prevent nearby but unrelated surfaces from being matched: inner arm to ribs, thigh to opposite thigh, lip to teeth, eyelid to globe, or garment to hidden skin. Resolve broad alignment before local projection. Maintain enough target resolution for the intended forms; no fitting method can represent every donor detail with inadequate vertices.

Regularization and smooth falloffs protect mesh quality but can erase desired anatomy. Inspect both their interior effect and their boundaries. A smoothly varying mask can still create an unnatural bulge or change in slope. Measure the displacement field and final surface, not just whether the mask formula is mathematically smooth.

A blanket nearest-surface projection is not a complete solution. Neither is projecting only the front torso when the task requires the whole body's form. Transfer shoulders, arms, back, pelvis and legs to the required fidelity; explicitly reconstruct damaged or obscured regions. Do not project the shape of fused clothing into supposed anatomy.

## 5. Muscle shape, volume and surface definition

Muscular appearance spans several geometric scales. Overall breadth and segment proportions establish the frame; muscle-group volumes shape chest, shoulders and limbs; local muscle bellies and separations provide surface relief; small skin detail affects shading. Arbitrary frequency filtering does not know which scale carries the intended identity.

A target with visible abs cannot be reproduced by matching only its waist outline. Conversely, adding sharp grooves to the wrong abdomen does not reproduce the target. Fit the larger anatomical volumes and their local contours together, then choose which finer details belong in maps. Normal maps change lighting response, not the physical silhouette, section shape or clothing collision surface. Geometry required for those effects must remain geometry.

Preserve useful donor contours rather than classifying strong abs, pectorals or knees as artifacts without evidence. A generated ridge may indeed be exaggerated, but identify the precise mismatch against the concept, other views or credible anatomy. Soften only that mismatch. “More realistic” must not silently mean “less muscular than requested.”

Review regional development as a connected whole: clavicle and pectoral attachment; deltoid into upper arm; biceps/triceps into elbow and forearm; ribcage, obliques and abdomen; trapezius, scapulae and lats; pelvis and gluteal transition; quadriceps, hamstrings, knees and calves. Do not create a highly sculpted torso on smooth unrelated limbs, or sharp muscular arms on a featureless expanded trunk.

### Diagnose specific distortions rather than labeling body types

Translate comments such as “too feminine,” “flabby,” “chunky” or “not fit” into observable mismatches against the selected target. Possible causes include shoulder-to-waist ratio, excessive lower-back curvature, pelvic tilt, seat depth, rib width, pectoral contour or insufficient muscle relief. No one ratio defines all masculine or feminine anatomy; the reference and intended variant determine the correction.

For a lean muscular reference, excess seat projection and a pinched waist may be errors even when total height and chest circumference match. An enlarged ribcage is not a substitute for muscular chest and back development. A narrow waist is not inherently a defect in another character. Preserve the target, not a universal anatomy stereotype.

### Distinguish a soft surface from a blurred image

When a torso looks blurred, inspect the actual mesh sections, normals and material configuration alongside a sharply lit clay render. Compare with other body regions under the same rendering conditions. Check texture resolution/filtering, lighting, depth of field and image resampling only where relevant.

Broad smoothing or corrective fields can physically erase form, leaving a blur-like patch with crisp neighboring limbs. Raising texture resolution or contrast cannot restore missing geometry. Conversely, sculpting more relief into a correctly shaped mesh to compensate for poor lighting can overshoot when rendered properly. Identify the responsible representation before repairing it.

## 6. Head, face, neck and separate hair

### Likeness is relational and three-dimensional

Measure and compare head width/depth/length, forehead slope, brow placement, orbital depth, eye aperture/spacing, cheekbone projection, nasal root/bridge/tip/profile, jaw width/angle, chin projection and mouth placement. Use front, profile and three-quarter views. Review eyelids, nostrils, lip edges and other small identity features at an appropriate close scale, then check recognizability at game distance.

A large number of moved handles is an effort description. It says nothing about whether the nose, head width or eye shape matches. Choose handles and sculpt operations to correct observed errors, and re-render after changes. Separate expression from identity: a scowl or beard must not conceal an incorrect underlying face.

MetaHuman's facial vertices have semantic roles in expression. A fitted surface can look plausible in neutral yet fail when an eyelid-edge vertex has been moved to a different anatomical role. Epic explicitly describes these semantics and notes that fitting may smooth features that later require careful restoration. Preserve neutral likeness and expression behavior together. [Initial head DNA guidance](https://dev.epicgames.com/documentation/metahuman/obtaining-an-initial-metahuman-head-dna).

### A closed neck seam is necessary, not sufficient

Inspect neck silhouette and volume from front, side, back and quarter views, with head turns and flexion. Check skull orientation, jaw transition, neck length, front-neck/laryngeal prominence, rear-neck flow, clavicles and trapezius. A tiny numerical seam gap does not excuse a visible shelf, pinching, a massive front-neck protrusion or a mismatched head/body silhouette.

Across a split head/body boundary, inspect paired positions, normals/tangents, skin weights, rest transforms and material continuity. Neutral alignment may separate or crease under motion. Inspect both the joined boundary and the surrounding surface rather than concentrating only on matching vertices. Pushing the seam together or inflating the neck is not a valid repair if it creates another anatomical defect.

### Hair, beard and brows are distinct fitted assets

Use clean anatomy to solve the head, then restore hair and beard from their own references. Beard outline, density, cheek boundary, mustache and chin length contribute to identity; they must not be arbitrary geometry attached after a generic face fit. Eyebrows require placement, thickness, arch, direction and material treatment matched to the target.

Natural-looking premade cards can be a better bounded proof source than continued geometric hair sculpting. Cards still require actual-renderer checks: roots and hairline, scalp coverage, silhouette, crown/back gaps, highlights, transparency, shadow behavior and temporal stability from multiple angles. Strand grooms, card meshes and solid stylized locks have different export/rendering needs. Do not assume a groom becomes cards automatically, or that a good Unreal preview establishes the browser result. A specific art direction may deliberately choose solid locks; the general lesson is to choose the suitable representation and qualify it.

## 7. Continuous body controls require authored meaning

The user-facing controls should describe coherent changes, not implementation artifacts or a list of named builds. “Runner,” “lifter,” “fuller” and a named hero can be useful examples, but should remain presets of controls rather than hidden fundamental classes.

| Control                    | Intended change                                                                                      | Important interaction or downstream consequence                                                                                                                 |
| -------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Body base                  | An authored anatomical foundation; visible body form is separate from a character's social identity. | Separate bases do not imply a qualified blend between them; correspondence and compatibility need evidence.                                                     |
| Apparent age               | Whole-body and face shape, proportions and tissue distribution, plus appropriate surface detail.     | Changes age-conditioned control responses, rig placement, clothing and expression; chronology/health remain separate world facts.                               |
| Height                     | Stature measured from a defined anatomical baseline to crown.                                        | May be implemented as uniform stature scaling where appropriate; age/proportion changes are not just height. Update attachments and motion/contact assumptions. |
| Frame                      | Structural breadth/depth and proportions of shoulder girdle, ribcage and pelvis.                     | Distinct from muscle or fat; changes internal landmarks and garment structure.                                                                                  |
| Segment proportions        | Leg/torso ratio, arm length, neck length, head size and supported regional dimensions.               | Changes joints, reach, collar/sleeve/trouser fit and locomotion; define compensation when total stature stays fixed.                                            |
| Muscle mass                | Volume and development of muscle groups.                                                             | Needs believable insertions and regional transitions; does not automatically mean increased skeletal rib width.                                                 |
| Fullness                   | Fat/soft-tissue volume and regional distribution.                                                    | Must affect supported trunk, arm, leg, neck/face and pelvic regions coherently; influences visible relief and garment ease.                                     |
| Definition                 | Visibility and geometric relief of muscular forms at the selected mass/fullness/age.                 | Must remain anatomically located; high fullness may attenuate relief without erasing all form.                                                                  |
| Local anatomy              | Supported chest/breast, belly, neck or other regional adjustments.                                   | Overlaps broader controls; avoid double deformation and identify required interaction corrections.                                                              |
| Face identity/features     | An identity preset and supported shape edits.                                                        | Preserve eyes, mouth, seam, expressions and fitted facial parts.                                                                                                |
| Skin/eyes                  | Pigment, marks and supported material variation.                                                     | Do not silently change physique or abilities; maintain head/body continuity and material-region isolation.                                                      |
| Hair/beard/brows           | Authored part selection and any supported length/volume/color controls.                              | Needs scalp/face/hat fit and appropriate motion; a color control cannot prove style support.                                                                    |
| Clothing/armor/accessories | Selected separate items with defined fit and layering rules.                                         | Fit the final evaluated anatomy and rig; rigid objects use appropriate anchors and clearance rather than unrestricted stretching.                               |

This is a design inventory, not a claim that all controls are implemented or independent over unlimited ranges. Each supported control needs a neutral meaning, allowed range, authored data, evaluation rule, affected dependencies and qualified combinations.

Use reference-supported endpoints for substantially different builds. One lean source does not contain evidence for every fuller or high-mass anatomy merely because it can be expanded mathematically. A deformation method needs suitable target guidance and inspection; increasing a scalar until a shape looks extreme does not author a believable endpoint.

### Why sculpted muscles can interpolate—and why that may still look wrong

With corresponding vertices, a simple blend can place each vertex between two endpoint positions: `P(t) = (1-t) P0 + t P1`. This works on sculpted geometry, not only smooth primitives. It guarantees continuous vertex positions for continuous `t`; it does not guarantee anatomically plausible intermediate volumes, fold behavior or muscle placement.

Independent sources must first be registered so corresponding vertices describe corresponding anatomical features. Otherwise a groove can drift, double, disappear or cross another feature as the control changes. Correct endpoints alone do not establish good intermediate shapes. Inspect intermediate samples and continuous sweeps; add an intermediate target or a demonstrated combination correction where required.

Evaluate combinations from a defined canonical state rather than repeatedly modifying an already edited mesh. Control deltas need explicit reference shapes; subtracting the wrong neutral can count frame or age changes twice. Edit order, repeated changes, reset and reload should resolve to the same intended geometry. A shape correction fixes a specific interaction; it should not become an unexplained global patch.

Logical independence means users can request mass, fullness and definition separately. It does not require their visible effects to be anatomically uncoupled. A full, muscular body and a full, low-muscle body should differ; a full body need not expose the same grooves as a lean body at the same nominal definition. Explain this behavior rather than pretending three unrestricted additive offsets always suffice.

### Fullness is a distribution, not a belly expansion

Changing only an abdominal band creates a swollen trunk attached to unrelated lean limbs. Simple radial expansion may enlarge the cross-section while preserving every sharp muscular groove, yielding “larger muscular arms” rather than fuller arms. Inspect volume distribution and how tissue covers the underlying anatomy.

Check shoulders into upper arms, arms across elbows into forearms, chest into axillae, ribs into flanks/back, waist into pelvis/seat, and thighs into knees/calves. The amount and distribution are reference-dependent. Do not insist that every region must enlarge equally, or extend soft-tissue expansion into hands/feet indiscriminately.

A horizontal ledge can arise from a truncated displacement field, mismatched falloffs, overlapping corrections, a garment edge or shading. Separate these possibilities. Inspect the body with only required baseline coverage, the garment separately, and their combined rendering; inspect displacement and surface sections above/through/below the boundary. Smooth the intended transition while preserving natural creases and volume. A function with continuous weights is not proof that the resulting anatomy looks continuous.

## 8. Age changes structure, not only finish

A muscular older adult is not a younger muscular body with wrinkles, gray hair and reduced definition. Body and face shape, regional volume distribution and tissue behavior may differ while identity and fitness remain recognizable. Do not encode a universal old-age stoop, frailty or loss of muscle; references and independent controls determine those choices.

Examine changes in thoracic/abdominal profile, shoulder and upper-arm volume, chest or breast support, waist/seat distribution, thigh contours, neck tissue and facial orbital/cheek/jaw volumes. These are regions to reference and author, not a mandatory stereotyped aging deformation. Child and adolescent proportions likewise involve skull-to-body ratio, limb/trunk relationships and maturation of torso/pelvis, not merely shrinking an adult. A single generic age displacement cannot be assumed to preserve the intended variety across those changes.

Author age anchors on corresponding body/head representations, including relevant structural landmarks, joints, fit supports and surface data. Describe the response of fullness, mass and definition relative to each age anchor, rather than layering an adult response blindly onto every age. Blend neighboring bases and their corresponding response data consistently. Use targeted interaction correctives where evidence shows defects; shared data is acceptable only where its result remains appropriate.

This does not require one unique sculpt for every Cartesian combination. It also does not justify promising a tiny fixed number of sources before evaluating the combinations. Base shapes, response targets, correctives, LODs, material maps and garment-fit data are different authored costs.

The conversational estimate of roughly 16 age sculpts plus 16 adult slider shapes was a planning illustration, not a validated minimum or complete final inventory. Likewise, a proposal for 14 separately generated age/build bodies is a candidate sourcing plan, not a topology or interpolation solution. Record the actual number only after choosing supported ranges, bases, axes and correction requirements. Do not turn illustrative counts into commitments or architectural limits.

### Avoid abrupt age-band replacement

Child, teen and adult authoring bands can aid production, but separate labels do not create a smooth transition. For continuous aging or a continuous creation slider, neighboring ranges need a qualified overlap or shared representation. Verify body/head correspondence, shape continuity, rest joints, weights, facial components, material changes, coverage and clothing through the join. Matching height at the boundary is insufficient.

An illustrative teen/adult overlap such as 17–21 is not a universal biological or product boundary. Choose ranges through the design owner. If source topology or rig is incompatible, convert it offline or expose separate supported ranges honestly; do not quietly switch the base on a birthday while claiming continuity. Automatic passage-of-time aging is a separate gameplay feature from editing apparent age.

### Qualification must include the dimensions claimed

A fixed-age masculine matrix can qualify particular controls on that base. It cannot prove the same response on a feminine base, children, teenagers or older adults. An earlier feminine pilot using different anatomy/control data is not a substitute for qualifying new transferred targets on that base.

The later suggested 30/75 adult anchors, their 52.5 midpoint and contrasting physique recipes were a bounded extension proposal. They must not become a general requirement or a completed result without execution-task adoption and evidence. Preserve this distinction when incorporating this brief into workflows.

## 9. Clothing must follow the final body and the actual motion

### A fitting mechanism is reusable; a successful fit is scoped

Continuous bodies can support continuous clothing through corresponding garment targets, body-surface/cage bindings, rig adjustments and needed corrections. This is a plausible production approach, not a guarantee that any garment fits any imaginable body. Define the released body envelope and layer combinations, then qualify the garment across them.

Fit after all relevant body geometry—including definition and age interactions—has been evaluated. The assumption that definition never changes clothing is unsafe whenever it changes the physical surface. A few millimeters of additional relief can produce chest, abdomen or sleeve breakthroughs even when broad measurements barely change. If definition is purely a normal-map effect, it does not move the fitting surface; document which representation is used.

Share the source garment and its fitting method across tested bodies. Disconnected hand-fixed copies may demonstrate attractive outfits but not a reusable system. Reuse does not forbid authored size/shape corrections or variants; it requires explicit inputs, coherent selection/evaluation and truthful limits.

### Distinguish garment classes and layers

Close fabric follows anatomy with intended ease; loose fabric has its own silhouette and may bridge regions rather than cling to every body point. Rigid armor should retain recognizable plate thickness and design while changing placement, suitable sizing or supported variants. A cape needs attachment and motion treatment appropriate to its drape. Accessories need stable anchors and clearance; earrings should follow the intended ear region rather than an unrelated nearby surface.

Fit inner layers before outer layers against the actual occupied envelope. Inspect cuffs, collars, armholes, hems, waist closures, boots/trousers and armor joints. A flexible shirt proof does not establish rigid plate, cape or layered wardrobe support. A compound shirt/shorts package is one supported outfit unless independent pieces are actually produced and qualified.

### Generated clothing can be a source, not an automatic modular asset

Concept-led Meshy or other generated clothing can preserve design and texture detail better than crude reconstruction. Using it modularly may require segmentation, missing inner/back surfaces, thickness and opening repair, topology cleanup/retopology, UV/material transfer, rigging, fitting and layer rules. Preserve the design during those steps.

Splitting triangles by color or material is not enough when cloth, straps, beard, armor and body are fused. Generating isolated pieces from consistent component references can reduce reconstruction work, but may produce incompatible scale or interfaces; inspect the assembled whole. Do not commit to preserving broken donor topology when preserving its visible design on a clean garment surface is more practical.

Use a known-good premade garment as a control before blaming a new fitting system. Establish export and motion on one unchanged body, then test body variations. This isolates authoring defects from conversion, rigging and fit defects. It does not automatically choose that control garment as the final artistic wardrobe.

### Hiding the body cannot repair a garment

Complete anatomy and separate baseline coverage remain available beneath removable clothing. Do not substitute a hollow shirt for a torso, delete required anatomy or enlarge a hide mask to conceal a failing conversion. Body hiding can be legitimate source-authored optimization for an accepted garment, but unmasked diagnostic views are needed to expose actual fit defects when qualifying the fit.

Judge visible exterior breakthroughs and openings, not only nearest-point penetration counts. Some interior surface relationships do not produce visible clipping; sparse probes can also miss a visible slit. Pair geometric checks with rendered inspection. A zero-count result under one probe definition cannot override visible skin through a sleeve.

Required motion depends on the task, but a character wardrobe proof commonly needs rest, raised arms, Idle, Walk, Run, starts/stops and blends. Test both extremes and relevant intermediates. Clothing must work on every variation presented as qualified, not only a preferred hero recipe. Removal/restoration and transfer between compatible wearers are separate checks when those behaviors are claimed.

## 10. Retargeting and deformation require a complete chain diagnosis

When elbows bend backward or a gait looks wrong, compare the source animation, retargeted/native result, exported/reimported data and actual runtime playback at matching times. Locate the first divergence before changing the anatomy or garment to compensate.

Check source and target rest poses, local axes, joint hierarchy, scale, quaternion interpolation and skinning assumptions. A correctly named elbow joint or numerically preserved track does not establish anatomical hinge direction in another rig. Nearly straight limbs also require care when inferring a bend direction from tiny numerical offsets. Inspect shoulders, hands and the whole arm, not just one elbow angle.

For changed proportions, verify that internal pivots remain appropriate for the surface. Surface-only tissue changes may preserve the skeleton; changed limb/neck length or major structural changes need corresponding rig/bind treatment. Check full motion and transitions after export, not only isolated native poses.

Do not “solve” garment or body intersections by pushing arms into an obviously unnatural wide gait. Clearance is one constraint; natural motion remains another. Identify whether the fault belongs to shape, weights, garment ease, clip adaptation or supported range. A repaired elbow does not establish good shoulder deformation, foot contact, clothing motion or every transition.

## 11. Measure shape without mistaking measurements for art

### Register comparisons before measuring

Fix units, stature, anatomical axes, pose, camera projection, view direction and ground/contact convention. Use anatomical locations rather than arbitrary world-height slices when poses differ. Keep raw donor and reposed donor distinguishable. Report screen-space reference projections separately from actual 3D widths, depths and circumferences.

A perspective image cannot uniquely determine hidden depth or circumference. An arm crossing the torso can corrupt a profile silhouette. A clothed seat measurement may describe fabric rather than anatomy. Mark such values as constrained estimates or unknowns, with their reference and uncertainty. Do not manufacture decimal precision from an imprecise image.

### Measure more than one section or one statistic

| Question                             | Useful observations                                                                                                                       | Common false conclusion                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Does the torso match?                | Chest/lower-rib/waist/pelvis widths and depths at named stations; front/back silhouettes; sagittal profile; region-to-region transitions. | Equal chest circumference means equal physique.                              |
| Are muscles retained?                | Regional surface sections, peak/trough placement, local relief depth and shaded form at fixed pose/light.                                 | A matching silhouette or increased normal contrast proves a sculpt transfer. |
| Does fullness affect the whole body? | Upper-arm/forearm/thigh/calf sections, trunk/seat distribution and softened divisions at fixed mass/definition.                           | Increased waist size proves convincing fat distribution.                     |
| Is the neck correct?                 | Join positions and surrounding shape, normals/weights, head alignment and motion views.                                                   | Near-zero seam gap proves acceptable anatomy.                                |
| Is transfer accurate?                | Bidirectional regional surface error, visible residual locations and excluded-region inventory.                                           | A small global average proves every identity feature matches.                |
| Does clothing fit?                   | Exterior coverage, openings, clearance and deformation in named poses and continuous motion.                                              | One rest pose or a few successful probes qualify the garment.                |

Surface-distance statistics need spatial meaning. One-way nearest-point distances can miss omitted donor bulges; a good percentile can hide a small but crucial nose, neck or armpit defect. Inspect both directions where appropriate, distribution and worst meaningful regions. State excluded regions and separate reconstructed surfaces from measured transfer.

Use measurement records with source/target revision, region, landmark definition, pose, unit, value, uncertainty and associated view. Reuse existing records rather than inventing a new reporting service. Choose meaningful tolerances before judging a candidate; tolerances should reflect target fidelity and rendering scale, not be widened after failure.

Measurements resolve causes and enable reproduction. They are not an aesthetic scoring system. Finite coordinates, valid triangles, matching indices and exact recipe reconstruction establish technical properties; they cannot certify believable anatomy.

## 12. The renderer is part of the delivered art

### Diagnose the gap from source to final image

A polished MetaHuman presentation combines geometry, suitable LOD, skin/eye/hair assets, materials, lighting, camera and rendering. A sparse portable export may omit or approximate some of those. That does not prove an inferior product tier or that good characters are possible only in Unreal. Determine what the actual export and consumer retain before asserting the cause.

A stock-looking result may come from its selected physique, face, groom, wardrobe or finish, rather than an unavoidable framework aesthetic. Compare geometry in matched clay and finish in representative light to isolate those contributions. The approved art direction is the target; greater photographic realism or more shader effects do not automatically improve a deliberately stylized character's fidelity.

Use a stage comparison: source asset in its native tool; exported asset reimported into a controlled viewer; the actual game renderer with matched views. Inspect topology/detail reduction, normals/tangents, UVs, map assignment and color spaces, skin roughness/lighting response, eye components, hair coverage and shader capabilities. Keep geometry and finish comparisons separate so attractive texture cannot excuse the wrong body, and poor light is not mistaken for impossible geometry.

Preserve material identity when transferring the design: fabric weave and worn edges, metal versus cloth response, skin pigment variation, and the distinct structure of eyes and hair. Remove unintended baked directional lighting from color where it conflicts with the game's changing light. Check UV coverage and baking cages before increasing texture resolution. Normal maps must match the target surface/tangent conventions; copying a donor map without compatible mapping is not a valid detail transfer. Verify each effect in the consumer instead of assuming an exported texture filename means it is used correctly.

“Lightweight GLB with simpler materials” is too vague. Name actual triangle/vertex counts, LODs, joints/influences, morph data, material slots, texture sizes/formats, hair representation and shader features kept or omitted. GLB is a container, not an intrinsic quality tier. A file format's expressive capability also does not guarantee the exporter emits or the renderer consumes every feature.

Do not say the renderer's capabilities are unknown when they can be inspected. Distinguish supported features in code, features used by this asset, and quality/performance demonstrated under the target workload. For example, lack of a skin effect in one material is different from the renderer being unable to support that effect.

### Explain budgets in terms of the resource they constrain

The discussion's 16 MB target was a project delivery constraint to investigate, not a universal MetaHuman, GLB or browser limit. Before repeating such a number, locate its current owner, unit, included assets and rationale. Do not silently change it or claim it necessarily prevents good art.

Distinguish compressed download size, decoded CPU/GPU residency, texture sampling, geometry/skinning/morph work, draw calls, transparency/overdraw, loading stalls and frame time. A smaller file can still be expensive to render; compressed maps can occupy much more memory after decoding. Shared assets and instance population change the accounting.

Rendering normally consumes the player's client CPU/GPU, while simulation/server costs are separate. Client-side work still has a budget: target hardware, browser behavior, visible population, frame rate and memory matter. Measure representative clients and actual scene conditions; a powerful authoring workstation or server benchmark cannot establish player rendering performance.

When a budget threatens likeness, compare targeted reductions and preserve high-quality editable sources. Investigate UV usage, map allocation, LOD and unnecessary data before erasing defining anatomy. Do not claim a reduction is visually free without a matched comparison, including motion and normal viewing distance.

## 13. Visual inspection must be broad, comparative and active

### Inspect the complete image before focusing on the repair

Start at whole-object/whole-character scale. Ask whether the silhouette, pose, identity, materials and component relationships plausibly meet the target. Then examine critical regions close up. Finish by returning to the complete assembled result. For a scene or interface, use the same principle: inspect composition and surrounding context, not just the changed ornament.

For an articulated body, cover front, back, both sides and quarter views; add the view exposing a suspected defect. Inspect head/neck, shoulders/armpits, torso/back, pelvis, arms/hands, thighs/knees and ankles/feet. Not every view must be regenerated after every local edit, but no visibly affected region can be excused as outside the review because the user did not mention it.

Use neutral clay to expose geometry and representative materials/light to judge final appearance. Match cameras, poses and lighting for causal comparisons. Also review ordinary gameplay distance, actual game light and moving-camera behavior. Diagnostic flat/clay lighting alone cannot qualify skin, eyes, hair transparency or texture stability.

### Watch what was captured

Generating hundreds of images or recordings is not inspection. Open the captures, watch the motion, and verify that the output contains the intended action. A clip may be static, show the wrong asset, be obscured or omit the failing frame. A thumbnail grid can hide a severe local defect; use close views as well as overview sheets.

For slider sweeps, observe the intermediate path rather than jumping between endpoints. For clothing, inspect the worst visible pose and continuous transitions. Look for volume collapse, floating attachment, pinching, moving seams, sliding grooves, clipping, shimmer and popping. Record specific observed failures, not merely that playback completed.

Do not present only flattering angles or crop away failures. Label “before,” “after,” donor, registered donor, diagnosis and selected candidate unambiguously, with the same comparison conditions or an explanation of differences. A filename such as “paired retry” does not tell the user what it proves. Explain the tested change and whether the image is a failed diagnostic or an accepted result.

### Review with a hypothesis, then look for counterexamples

State what the change is meant to improve and what it could damage. Compare the repaired region, the preserved reference features and relevant downstream consumers. Then actively seek a case that contradicts the claimed success: opposite profile, rear view, high-fullness low-mass corner, midpoint, raised arm, return to neutral, clothing removal or age overlap.

This is not a requirement to inspect infinite combinations. Choose coverage from the claims and plausible interactions, retain already valid evidence, and expand when a concrete failure invalidates the assumptions. Strong visual review is sustained attention and correct comparisons, not an ever-growing ritual or a mandatory number of cosmetic passes.

## 14. Prevent regressions and preserve useful work

### Keep the target and the current selected source stable

Before an edit, identify the exact starting asset and decisions it already satisfies. Preserve the previous result and the intended correction. A new transfer must not silently restart from an older donor, drop a corrected waist, lose muscle relief or replace a selected head. A new filename or a more recent export is not evidence that it contains the union of useful improvements.

Keep source, control data, rig, garment bindings, maps and export references aligned. When work crosses branches or machines, reconcile completed contents and actual dependencies rather than assuming that replaying a subset of old changes retains everything. Do not manipulate another active task's files or source assets without coordination. Use existing preservation/version-reference machinery; do not create a second asset system.

### Rebuild the affected dependencies, not the entire project

| Change                                   | Usually reusable                                                                    | What must be reconsidered or regenerated                                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Recipe within a qualified envelope       | Canonical topology, source garments, fitting mechanisms, compatible maps and clips. | Evaluated geometry, setup/rest data where controlled, fitted parts and relevant output/pose checks.                                         |
| Pigment/material-only edit               | Geometry, rig and physical garment fit if unchanged.                                | Material outputs, lighting/temporal comparisons and performance if resources change.                                                        |
| Local sculpt on unchanged correspondence | Much of the authored source, UV layout and bindings.                                | Dependent morph deltas, detail bakes/normals, local fit/weights, LOD appearance and affected poses. Reuse is conditional, not automatic.    |
| Larger proportion or age change          | Garment design, source textures and reusable tooling.                               | Joint/rest/bind placement, skinning/retargeting, reach/contact, fit supports and range qualification.                                       |
| Topology, vertex order or UV change      | Concept/design and independent source art; some data may be transferable.           | Correspondence-dependent morphs, bindings, weights, maps, LOD relations and export consumers. This is a more expensive dependency boundary. |
| New clothing layer or rigid piece        | Qualified body and existing items.                                                  | New item's fit, clearances, layer interactions, anchors and motion. Existing fit does not qualify the combination.                          |

Not nailing the final body today does not necessarily make every garment disposable. Preserving clean sources, stable correspondence and explicit bindings limits rework. However, promising that all clothing will survive arbitrary body/topology changes is false. Stabilize the anatomical range, representation and fitting contract before investing heavily in final wardrobe breadth; refine surface finish later where its dependencies permit.

### Preserve provenance and useful failures

Archive approved references, generated source outputs, editable files, controls, exact selected exports, meaningful rejected candidates and the evidence needed to explain acceptance or failure. A failed candidate can be the necessary control for a later improvement. Preserve actual source files, not just screenshots and prompts.

A local temporary path or a successful upload command is not a durable handoff. Use existing exact references and verify retrieval/integrity under the asset workflow. Distinguish private archival from public publication. Knowing one reference sheet is archived does not prove that all companion concepts are archived; check their individual inventory. Do not regenerate missing approved art and imply it is the original.

Name revision, recipe, pose/time, camera, material/light configuration and renderer when needed to reproduce a comparison. Keep this metadata in existing records rather than duplicating it in every screenshot caption or inventing parallel manifests. Human-readable labels should explain what is being compared and its selection status.

## 15. Keep prototypes bounded without accepting broken proofs

Choose the least expensive complete experiment that answers the question. Start with one suitable body/garment/clip, establish the route, then expand the already agreed matrix. Do not invest in hair polish or custom armor while the body transfer, elbows or garment baseline are invalid. Repeatedly repairing an unsuitable bespoke garment can cost more than switching to an appropriate premade control.

A prototype can leave skin finish, a hairstyle library or exact final likeness provisional when those are outside its claim. It cannot leave obviously discontinuous anatomy or failing shirt fit while claiming convincing adjustable bodies and fitting clothes. Separate “measured failure,” “mechanism demonstrated,” “visually accepted” and “ready for wider rollout.”

Before repeating an unsuccessful approach, identify what new evidence or changed method makes another attempt useful. Preserve the failed result and report a specific source/tool/skill limitation when progress has stalled. Do not waste repeated generations or code patches on an unchanged failure; do not stop merely because the work needs careful iteration.

Track the shared cumulative budget, uncertain commitments, provider costs and manual effort through existing owners. A new conversation, source variant or retry does not reset authorization. Performance and workflow-effort comparisons should isolate the changed mechanism where practical. Claims of “100% certain,” “no extra work” or “no performance impact” require evidence unavailable from visual success alone; state tested scope and uncertainty instead.

## 16. Qualification and handoff must be honest about scope

Use distinct statements for created, technically checked, visually reviewed, owner-selected, archived, integrated and qualified for specified use. A design document, a working editor, a native render and an actual gameplay check are different evidence levels. A rendered comparison in the actual engine still does not prove authoritative equipment/save/load behavior unless those paths were exercised.

For an adjustable family, list qualified body bases, age spans, controls/ranges, combinations, garments/layers, motion and renderer conditions. A 30-recipe matrix with mass at 0/50/100%, fullness at 0/100% and definition at 0/25/50/75/100% is useful for those three controls; it leaves intermediate fullness, age, additional bases and other controls to separate sweeps/qualification. Sampling must match the promise, including interacting extremes and known problem intervals.

Report demonstrated results, visible defects, unqualified cases and actual blockers separately. Do not postpone showing existing visuals until a polishing campaign ends. Label provisional outputs clearly, and distinguish what the user can review now from what still needs work. Do not require the reader to infer meaning from a cryptic diagnostic link.

When a defect remains inside an agreed completion requirement, keep that requirement open. A technical pass cannot change the art target to excuse the result. An optional improvement outside the requirement should not create endless scope. The aim is a complete bounded deliverable, with reusable artifacts and clearly identified remaining qualification before expansion.

## 17. Where these lessons belong when adopted

Incorporate meaning into existing owners rather than copying this whole brief into every workflow. Keep general practice short at the entry point and route to specialist detail only when relevant.

| Lesson group                                                                            | Owning documentation to reconcile                                                                                                                                                                           | Required design outcome                                                                                                            |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Goal/fidelity contract, source authority, whole-result review, honest handoff           | [Art workflow](../../production-workflows/art-flows/README.md), [prompt direction](../../production-workflows/art-flows/prompting.md), [study record](../../production-workflows/art-flows/study-record.md) | Operational wording and a small reusable review loop without a second tracking system.                                             |
| Reference preparation, transfer terminology, geometry/material separation, final export | [3D models](../../production-workflows/art-flows/3d-models.md)                                                                                                                                              | Explicit method selection, source/target requirements, regional exclusions, matched inspection and export-consumer checks.         |
| Correspondence, independent controls, age, head/neck, garment fitting and rebuilding    | [People procedure](../../production-workflows/art-flows/people.md), [character authoring contract](../../projects/people-from-parts-authoring-contract.md)                                                  | Current mechanisms separated from proposed range/asset expansion; concrete qualification and dependency rules.                     |
| Retargeting, source/export/runtime comparison and whole-motion inspection               | [Animation procedure](../../production-workflows/art-flows/animation.md)                                                                                                                                    | A diagnosis path that preserves valid clips and never treats an anatomical or clothing workaround as sufficient motion acceptance. |
| Renderer capability, budgets, visual/performance tradeoffs                              | [World presentation](../../world-presentation.md), affected art/export contracts                                                                                                                            | Inspect actual support and settings, distinguish client resources, and retain measured evidence for changes.                       |
| Provenance, revisions, archive and publication                                          | [Asset workflow](../../asset-workflow.md), existing study/storage records                                                                                                                                   | Exact recoverable sources and outputs, truthful archive status and unchanged permission boundaries.                                |

Open design work is to choose the smallest enforceable additions to those owners, identify reusable existing helpers, and determine which uncertain methods need bounded qualification. Do not create a universal solver, a new asset service, an exhaustive Cartesian sculpt library or an oversized mandatory checklist merely to encode these lessons.

Before declaring the incorporation complete, check that a fresh agent could answer these questions from the appropriate owners: What is the target? Which source controls which feature? What exactly is being transferred? Which prior improvements must survive? What does each slider change? Which combinations and consumers are qualified? How will the entire result be inspected? What must be rebuilt after an edit? What evidence and artifacts must be preserved? What remains outside the current task?

## Evidence and reference entry points

These records ground the examples without making this brief a project diary. Follow their current acceptance owners for later results; do not infer current qualification from a historical success or failure.

- [Meshy/reference conform study](../../../art-direction/studies/2026-11-11-peacock-meshy-conform/README.md): source/reference and conform comparison context.
- [Anatomy correction study](../../../art-direction/studies/2026-11-11-peacock-anatomy-correction/README.md): proportion and head/neck correction context.
- [Muscle-definition study](../../../art-direction/studies/2026-11-11-peacock-muscle-definition/README.md): measured local relief, independent controls, and the failure of a fixed garment fit as definition changes.
- [Full-transfer study](../../../art-direction/studies/2026-11-11-peacock-full-transfer/README.md): broad surface transfer, preserved correspondence, regional exclusions, recipe/sweep evidence, shirt failures and unnatural wide-arm clearance tradeoff.
- [MetaHuman qualification owner](../../maintainers/art/metahuman-poc.md): selected sources, scoped acceptance and remaining implementation/visual work.
- Official Epic [From Custom Mesh](https://dev.epicgames.com/documentation/metahuman/metahuman-creator-from-custom-mesh-tool-in-unreal-engine), [From Template](https://dev.epicgames.com/documentation/metahuman/metahuman-creator-from-template-tool-in-unreal-engine) and [head DNA guidance](https://dev.epicgames.com/documentation/metahuman/obtaining-an-initial-metahuman-head-dna), and [Meshy multi-image documentation](https://docs.meshy.ai/en/api/multi-image-to-3d), consulted November 11, 2026. These substantiate the specific capability cautions above, not successful execution of a route in our game. Recheck the installed/provider version when implementing.
